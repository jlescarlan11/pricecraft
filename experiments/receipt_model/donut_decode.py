"""Receipt-only Donut decoding. Validation never repairs missing source values."""
import re
from decimal import Decimal

import torch
from transformers import LogitsProcessor


class ReceiptDecodeError(ValueError):
    """Generation cannot be represented as a complete receipt menu."""


def numeric_complete(text, field):
    prefix = r'(?:PHP|P|₱|Rp|IDR)?\s*' if field == 'price' else ''
    number = r'\d+(?:,\d{3})*(?:\.\d+)?' if field == 'price' else r'\d+(?:\.\d+)?'
    return bool(re.fullmatch(prefix + number, text.strip()))


def numeric_amount(text, field):
    """PH decimal points and optional comma thousands; never guess separators."""
    if not numeric_complete(text, field):
        raise ReceiptDecodeError('Invalid numeric receipt field')
    value = text.strip()
    if field == 'price':
        value = re.sub(r'^(?:PHP|P|₱|Rp|IDR)\s*', '', value)
    return Decimal(value.replace(',', ''))


def parse_menu_stream(content):
    """Require a closed menu and complete rows; do not salvage partial tags."""
    outer = re.fullmatch(r'\s*<s_menu>\s*(.*?)\s*</s_menu>\s*', content, re.S)
    if not outer:
        raise ReceiptDecodeError('Missing complete menu wrapper or unexpected trailing content')
    pattern = (r'\s*<s_nm>\s*([^<>]+?)\s*</s_nm>\s*'
               r'(?:<s_cnt>\s*([^<>]+?)\s*</s_cnt>\s*)?'
               r'<s_price>\s*([^<>]+?)\s*</s_price>\s*')
    menu = []
    for part in outer.group(1).split('<sep/>'):
        match = re.fullmatch(pattern, part, re.S)
        if not match:
            raise ReceiptDecodeError('Incomplete, mismatched or unexpected item fields')
        name, count, price = (x.strip() if x is not None else None for x in match.groups())
        if not name or not numeric_complete(price, 'price'):
            raise ReceiptDecodeError('Missing item name or invalid numeric price')
        item = {'nm': name}
        if count is not None:
            if not numeric_complete(count, 'cnt'):
                raise ReceiptDecodeError('Invalid numeric count')
            item['cnt'] = count
        item['price'] = price
        menu.append(item)
    return {'menu': menu}


def decode_generation(tokenizer, token_ids, max_length=768):
    """Keep raw evidence and fail closed at the cap, including forced EOS."""
    ids = list(token_ids)
    decoded = tokenizer.decode(ids, skip_special_tokens=False)
    effective = list(ids)
    while effective and effective[-1] == tokenizer.pad_token_id:
        effective.pop()
    capped = len(effective) >= max_length
    result = dict(decoded=decoded, token_ids=ids, generated_tokens=len(ids),
                  effective_tokens=len(effective), truncated=capped,
                  schema_valid=False, items=[])
    try:
        if capped:
            raise ReceiptDecodeError('Generation reached token cap; forced EOS is not proof of completeness')
        prompt = tokenizer.convert_tokens_to_ids('<s_cord-v2>')
        if not effective or effective[0] != prompt:
            raise ReceiptDecodeError('Missing receipt task prompt')
        if effective[-1] != tokenizer.eos_token_id or tokenizer.eos_token_id in effective[1:-1]:
            result['truncated'] = True
            raise ReceiptDecodeError('Missing terminal EOS or content after EOS')
        content = tokenizer.decode(effective[1:-1], skip_special_tokens=False)
        result['parsed'] = parse_menu_stream(content)
        result['items'] = [dict(name=item['nm'], price=numeric_amount(item['price'], 'price'),
                               count=numeric_amount(item['cnt'], 'cnt') if 'cnt' in item else None)
                           for item in result['parsed']['menu']]
        result['schema_valid'] = True
    except ReceiptDecodeError as exc:
        result['error'] = str(exc)
    return result


def numeric_partial(text, field):
    value = text.strip()
    if field == 'price':
        currencies = ('PHP', 'P', '₱', 'Rp', 'IDR')
        if any(currency.startswith(value) for currency in currencies):
            return True
        for currency in currencies:
            if value.startswith(currency):
                value = value[len(currency):].lstrip()
                break
    if not value:
        return True
    if field == 'price':
        # A comma group may still be incomplete, but never after a decimal dot.
        pattern = r'(?:\d+(?:,\d{3})*(?:\.\d*)?|\d+(?:,\d{3})*,\d{0,2})'
    else:
        pattern = r'\d+(?:\.\d*)?'
    return bool(re.fullmatch(pattern, value))


class ReceiptLogitsProcessor(LogitsProcessor):
    """Constrain the menu structure without constraining to any receipt truth.

    Repeated four-token sequences are blocked only within the current name.
    This permits duplicate purchased items and recurring schema delimiters.
    A field budget aborts inference rather than fabricating a closing tag.
    """
    def __init__(self, tokenizer, field_budget=64):
        self.tokenizer = tokenizer
        self.field_budget = field_budget
        self.last_ids = []
        tags = ('<s_menu>', '</s_menu>', '<s_nm>', '</s_nm>', '<s_cnt>',
                '</s_cnt>', '<s_price>', '</s_price>', '<sep/>', '<s_cord-v2>')
        self.tags = {tag: tokenizer.convert_tokens_to_ids(tag) for tag in tags}
        if len(set(self.tags.values())) != len(tags) or tokenizer.unk_token_id in self.tags.values():
            raise ValueError('Receipt grammar requires the CORD receipt vocabulary')
        pieces = tokenizer.convert_ids_to_tokens(list(range(len(tokenizer))))
        specials = set(tokenizer.all_special_ids)
        self.text_ids = {i for i, piece in enumerate(pieces)
                         if i not in specials and '<' not in piece and '>' not in piece}
        # Donut's XLM-R tokenizer uses SentencePiece word-boundary markers.
        self.surfaces = {i: pieces[i].replace('▁', ' ') for i in self.text_ids}
        self.numeric_ids = [i for i, surface in self.surfaces.items()
                            if surface and re.fullmatch(r'[0-9.,PHP₱RpIDR\s]+', surface)]
        self._text_masks = {}

    def _state(self, ids):
        if not ids or ids[0] != self.tags['<s_cord-v2>']:
            raise ReceiptDecodeError('Invalid receipt generation prompt')
        state, field_ids = 'menu_start', []
        transitions = {
            'menu_start': {'<s_menu>': 'item_start'},
            'item_start': {'<s_nm>': 'nm'},
            'after_nm': {'<s_cnt>': 'cnt', '<s_price>': 'price'},
            'after_cnt': {'<s_price>': 'price'},
            'after_price': {'<sep/>': 'item_start', '</s_menu>': 'closed'},
        }
        for token in ids[1:]:
            if state in ('nm', 'cnt', 'price'):
                if token == self.tags[f'</s_{state}>']:
                    value = self.tokenizer.decode(field_ids, skip_special_tokens=False).strip()
                    if not value or (state != 'nm' and not numeric_complete(value, state)):
                        raise ReceiptDecodeError('Cannot close an empty or invalid receipt field')
                    state, field_ids = f'after_{state}', []
                elif token in self.text_ids:
                    field_ids.append(token)
                else:
                    raise ReceiptDecodeError('Unexpected structural token within a receipt field')
            elif state == 'closed' and token == self.tokenizer.eos_token_id:
                state = 'done'
            elif state == 'done' and token == self.tokenizer.pad_token_id:
                continue
            else:
                match = next((dest for tag, dest in transitions.get(state, {}).items()
                              if token == self.tags[tag]), None)
                if match is None:
                    raise ReceiptDecodeError('Invalid receipt schema transition')
                state = match
        return state, field_ids, transitions

    def __call__(self, input_ids, scores):
        masked = torch.full_like(scores, -float('inf'))
        for batch, ids in enumerate(input_ids.tolist()):
            self.last_ids = ids
            state, field_ids, transitions = self._state(ids)
            if state in ('nm', 'cnt', 'price'):
                if len(field_ids) > self.field_budget:
                    raise ReceiptDecodeError('Receipt field token budget exceeded')
                value = self.tokenizer.decode(field_ids, skip_special_tokens=False)
                if state == 'nm':
                    key = (scores.device, scores.shape[-1])
                    if key not in self._text_masks:
                        mask = torch.zeros(scores.shape[-1], dtype=torch.bool, device=scores.device)
                        mask[list(self.text_ids)] = True
                        self._text_masks[key] = mask
                    mask = self._text_masks[key]
                    masked[batch, mask] = scores[batch, mask]
                    if len(field_ids) >= 4:
                        suffix = field_ids[-3:]
                        banned = {field_ids[i+3] for i in range(len(field_ids)-3)
                                  if field_ids[i:i+3] == suffix}
                        if banned:
                            masked[batch, list(banned)] = -float('inf')
                else:
                    allowed = [i for i in self.numeric_ids
                               if numeric_partial(value + self.surfaces[i], state)
                               and not (self.surfaces[i].isspace() and field_ids
                                        and self.surfaces[field_ids[-1]].isspace())]
                    masked[batch, allowed] = scores[batch, allowed]
                if value.strip() and (state == 'nm' or numeric_complete(value, state)):
                    close = self.tags[f'</s_{state}>']
                    masked[batch, close] = scores[batch, close]
            else:
                if state == 'closed':
                    allowed = [self.tokenizer.eos_token_id]
                elif state == 'done':
                    allowed = [self.tokenizer.pad_token_id]
                else:
                    allowed = [self.tags[tag] for tag in transitions[state]]
                masked[batch, allowed] = scores[batch, allowed]
            if not torch.isfinite(masked[batch]).any():
                raise ReceiptDecodeError('No legal receipt continuation remains')
        return masked
