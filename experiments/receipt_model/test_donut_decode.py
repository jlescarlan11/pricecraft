"""Inference regressions; fake only costly model generation, use real token parsing."""
import json
import re
import string
from argparse import Namespace
from types import SimpleNamespace

import pytest
import torch

import donut_run


@pytest.fixture(scope='module')
def processor():
    # A small character vocabulary keeps grammar tests portable: no private
    # dataset, model download or ignored checkpoint is needed for unit tests.
    tags = ['<s_cord-v2>', '<s_menu>', '</s_menu>', '<s_nm>', '</s_nm>',
            '<s_cnt>', '</s_cnt>', '<s_price>', '</s_price>', '<sep/>',
            '</s>', '<pad>', '<unk>']
    pieces = tags + list(string.printable+'₱') + ['▁', '0.00', '5.00', '▁PHP']
    class Tokenizer:
        def __init__(self):
            self.vocab = {piece: i for i,piece in enumerate(pieces)}
            self.eos_token_id = self.vocab['</s>']
            self.pad_token_id = self.vocab['<pad>']
            self.unk_token_id = self.vocab['<unk>']
            self.all_special_ids = list(range(len(tags)))
        def __len__(self):
            return len(pieces)
        def convert_tokens_to_ids(self, token):
            return self.vocab.get(token, self.unk_token_id)
        def convert_ids_to_tokens(self, ids):
            return [pieces[i] for i in ids]
        def decode(self, ids, **kwargs):
            return ''.join(pieces[i] for i in ids).replace('▁', ' ').lstrip()
        def __call__(self, text, **kwargs):
            tokens = re.findall(r'<[^>]+>|[^<]', text)
            ids = [self.vocab[token] for token in tokens]
            return SimpleNamespace(input_ids=torch.tensor([ids]) if kwargs.get('return_tensors') else ids)
    return SimpleNamespace(tokenizer=Tokenizer())


def run_saved_generation(tmp_path, monkeypatch, processor, text, cap=False):
    ids = processor.tokenizer(text, add_special_tokens=False).input_ids
    if cap:
        ids = ids[:-1] + [processor.tokenizer.convert_tokens_to_ids('▁the')] * (767-len(ids)+1) + [processor.tokenizer.eos_token_id]
        assert len(ids) == 768
    class SavedModel:
        def eval(self):
            return self
        def generate(self, *args, **kwargs):
            return torch.tensor([ids])
    monkeypatch.setattr(donut_run, 'load_model', lambda adapter: (processor, SavedModel(), 'cpu'))
    monkeypatch.setattr(donut_run, 'pixels', lambda *args: torch.zeros(1))
    monkeypatch.setattr(donut_run, 'ROOT', tmp_path)
    (tmp_path/'validation.jsonl').write_text(json.dumps({'id':'fixture','image':'unused'})+'\n')
    donut_run.infer(Namespace(adapter=None, split='validation', limit=1, name='fixture', decoding_profile='legacy'))
    return json.loads((tmp_path/'predictions/fixture-validation.jsonl').read_text())


def test_forced_eos_at_cap_is_failed_even_when_eos_is_present(tmp_path, monkeypatch, processor):
    r = run_saved_generation(tmp_path, monkeypatch, processor,
        '<s_cord-v2><s_menu><s_nm>Tea</s_nm><s_price>10</s_price></s_menu></s>', cap=True)
    assert r.get('error'), 'A capped generation is incomplete, even if forced EOS is present'
    assert r['items'] == []
    assert r['truncated'] is True


@pytest.mark.parametrize('body', [
    '<s_menu><s_nm>Tea</s_nm><s_price>10</s_price>',
    '<s_menu><s_nm>Tea</s_cnt><s_price>10</s_price></s_menu>',
    '<s_menu><s_nm>Tea</s_nm><s_price>NaN</s_price></s_menu>',
    '<s_menu><s_nm>Tea</s_nm><s_price>10</s_price></s_menu>garbage',
])
def test_broken_stream_is_failed_not_silently_salvaged(tmp_path, monkeypatch, processor, body):
    r = run_saved_generation(tmp_path, monkeypatch, processor, '<s_cord-v2>'+body+'</s>')
    assert r.get('error'), 'Malformed streams must be observable failures'
    assert r['items'] == []


def test_valid_duplicate_products_and_zero_price_survive(tmp_path, monkeypatch, processor):
    r = run_saved_generation(tmp_path, monkeypatch, processor,
        '<s_cord-v2><s_menu><s_nm>Tea</s_nm><s_cnt>1</s_cnt><s_price>10</s_price>'
        '<sep/><s_nm>Tea</s_nm><s_cnt>1</s_cnt><s_price>10</s_price>'
        '<sep/><s_nm>Bag</s_nm><s_price>0.00</s_price></s_menu></s>')
    assert not r.get('error')
    assert [(x['name'],x['price']) for x in r['items']] == [('Tea','10'),('Tea','10'),('Bag','0.00')]
    assert r.get('decoded'), 'Keep raw generation for error audits'


def logits_after(processor, text):
    from donut_decode import ReceiptLogitsProcessor
    grammar = ReceiptLogitsProcessor(processor.tokenizer)
    ids = processor.tokenizer(text, add_special_tokens=False).input_ids
    scores = torch.zeros((1, len(processor.tokenizer)))
    return grammar(torch.tensor([ids]), scores)[0]


def test_grammar_requires_wrapper_and_blocks_premature_eos(processor):
    scores = logits_after(processor, '<s_cord-v2>')
    assert torch.isfinite(scores[processor.tokenizer.convert_tokens_to_ids('<s_menu>')])
    assert not torch.isfinite(scores[processor.tokenizer.eos_token_id])
    assert not torch.isfinite(scores[processor.tokenizer.convert_tokens_to_ids('<s_nm>')])


def test_grammar_closes_only_current_field_and_requires_price(processor):
    scores = logits_after(processor, '<s_cord-v2><s_menu><s_nm>Tea')
    assert torch.isfinite(scores[processor.tokenizer.convert_tokens_to_ids('</s_nm>')])
    assert not torch.isfinite(scores[processor.tokenizer.convert_tokens_to_ids('</s_cnt>')])
    assert not torch.isfinite(scores[processor.tokenizer.convert_tokens_to_ids('<sep/>')])
    scores = logits_after(processor, '<s_cord-v2><s_menu><s_nm>Tea</s_nm>')
    assert torch.isfinite(scores[processor.tokenizer.convert_tokens_to_ids('<s_cnt>')])
    assert torch.isfinite(scores[processor.tokenizer.convert_tokens_to_ids('<s_price>')])
    assert not torch.isfinite(scores[processor.tokenizer.convert_tokens_to_ids('</s_menu>')])


def test_grammar_masks_non_numeric_prices_and_incomplete_decimal_close(processor):
    prefix = '<s_cord-v2><s_menu><s_nm>Tea</s_nm><s_price>'
    scores = logits_after(processor, prefix)
    bad = processor.tokenizer('NaN', add_special_tokens=False).input_ids[0]
    good = processor.tokenizer('10', add_special_tokens=False).input_ids[0]
    assert not torch.isfinite(scores[bad])
    assert torch.isfinite(scores[good])
    close = processor.tokenizer.convert_tokens_to_ids('</s_price>')
    assert not torch.isfinite(logits_after(processor, prefix+'10.')[close])
    assert torch.isfinite(logits_after(processor, prefix+'P10.50')[close])


def test_repetition_guard_is_within_name_not_across_duplicate_items(processor):
    from donut_decode import ReceiptLogitsProcessor
    tokenizer = processor.tokenizer
    grammar = ReceiptLogitsProcessor(tokenizer)
    prompt = tokenizer('<s_cord-v2><s_menu><s_nm>', add_special_tokens=False).input_ids
    word = tokenizer('Tea', add_special_tokens=False).input_ids[0]
    scores = grammar(torch.tensor([prompt+[word]*4]), torch.zeros(1,len(tokenizer)))[0]
    assert not torch.isfinite(scores[word])
    assert torch.isfinite(scores[tokenizer.convert_tokens_to_ids('</s_nm>')])
    prefix = ('<s_cord-v2><s_menu><s_nm>Tea</s_nm><s_cnt>1</s_cnt><s_price>10</s_price>'
              '<sep/><s_nm>')
    assert torch.isfinite(logits_after(processor, prefix)[word])
    completed = prefix+'Tea</s_nm><s_cnt>1</s_cnt><s_price>10</s_price></s_menu>'
    assert torch.isfinite(logits_after(processor, completed)[tokenizer.eos_token_id])


def test_field_budget_fails_instead_of_inventing_closure(processor):
    from donut_decode import ReceiptLogitsProcessor, ReceiptDecodeError
    t=processor.tokenizer
    prefix=t('<s_cord-v2><s_menu><s_nm>',add_special_tokens=False).input_ids
    word=t('Tea',add_special_tokens=False).input_ids[0]
    with pytest.raises(ReceiptDecodeError, match='budget'):
        ReceiptLogitsProcessor(t)(torch.tensor([prefix+[word]*65]),torch.zeros(1,len(t)))


@pytest.mark.parametrize('value', ['NaN', 'Infinity', '-1', 'true', '1..2', '', '1,2,3', '1.2.3'])
def test_invalid_numeric_fields_cannot_be_accepted(value):
    from donut_decode import parse_menu_stream, ReceiptDecodeError
    with pytest.raises(ReceiptDecodeError):
        parse_menu_stream(f'<s_menu><s_nm>Tea</s_nm><s_price>{value}</s_price></s_menu>')


def test_terminal_padding_does_not_misclassify_early_eos_as_cap(processor):
    from donut_decode import decode_generation
    t=processor.tokenizer
    ids=t('<s_cord-v2><s_menu><s_nm>Tea</s_nm><s_price>0</s_price></s_menu></s>',add_special_tokens=False).input_ids
    ids += [t.pad_token_id] * (768-len(ids))
    r=decode_generation(t,ids)
    assert r['schema_valid'] is True
    assert r['truncated'] is False


def test_no_finite_legal_continuation_fails_instead_of_sampling_nan(processor):
    from donut_decode import ReceiptLogitsProcessor, ReceiptDecodeError
    t=processor.tokenizer
    ids=t('<s_cord-v2>',add_special_tokens=False).input_ids
    with pytest.raises(ReceiptDecodeError,match='No legal'):
        ReceiptLogitsProcessor(t)(torch.tensor([ids]),torch.full((1,len(t)),-float('inf')))


@pytest.mark.parametrize('prefix', ['P', 'PHP ', '₱', 'Rp ', 'IDR '])
def test_accepted_currency_prices_extract_to_finite_amount(tmp_path,monkeypatch,processor,prefix):
    r=run_saved_generation(tmp_path,monkeypatch,processor,
        f'<s_cord-v2><s_menu><s_nm>Tea</s_nm><s_price>{prefix}10.50</s_price></s_menu></s>')
    assert r['schema_valid'] is True
    assert r['items'][0]['price']=='10.50'
    assert r['parsed']['menu'][0]['price']==prefix+'10.50'


def test_sentencepiece_number_boundaries_are_allowed(processor):
    from donut_decode import ReceiptLogitsProcessor
    t=processor.tokenizer
    price=t('<s_cord-v2><s_menu><s_nm>Tea</s_nm><s_price>',add_special_tokens=False).input_ids
    grammar=ReceiptLogitsProcessor(t)
    boundary=t.convert_tokens_to_ids('▁')
    php=t.convert_tokens_to_ids('▁PHP')
    zero=t.convert_tokens_to_ids('0.00')
    close=t.convert_tokens_to_ids('</s_price>')
    for prefix in [price,price+[php]]:
        scores=grammar(torch.tensor([prefix]),torch.zeros(1,len(t)))[0]
        assert torch.isfinite(scores[boundary])
        scores=grammar(torch.tensor([prefix+[boundary]]),torch.zeros(1,len(t)))[0]
        assert torch.isfinite(scores[zero])
        assert not torch.isfinite(scores[boundary]), 'Repeated whitespace must not form another loop'
        scores=grammar(torch.tensor([prefix+[boundary,zero]]),torch.zeros(1,len(t)))[0]
        assert torch.isfinite(scores[close])


@pytest.mark.parametrize('invalid', ['1..','1.2.3','1,234,56.0','1,2.0'])
def test_numeric_prefix_must_still_have_a_valid_completion(invalid):
    from donut_decode import numeric_partial
    assert numeric_partial(invalid,'price') is False


@pytest.mark.parametrize('value', ['0.00','PHP 1,234.50','₱10','Rp 1.25','IDR 0'])
def test_precise_numeric_grammar_preserves_zero_and_grouped_prices(value):
    from donut_decode import numeric_complete, numeric_partial
    assert numeric_complete(value,'price') is True
    assert numeric_partial(value,'price') is True
