// Local Apple Vision + existing heuristic parser. These are suggestions, never gold labels.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';

const root = '.receipt-ml/philippines';
const parserPath = 'src/services/receiptParser.ts';
const bundled = await build({ entryPoints: [parserPath], bundle: true, write: false,
  format: 'esm', platform: 'node', logLevel: 'silent' });
const { parseReceipt } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const parserHash = createHash('sha256').update(await fs.readFile(parserPath)).digest('hex');
const rows = (await fs.readFile(path.join(root, 'manifest.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
const drafts = [];
for (const row of rows) {
  const ocr = JSON.parse(await fs.readFile(path.join(root, 'ocr', row.id + '.json'), 'utf8'));
  // Vision boxes use a bottom-left origin. Group adjacent columns by vertical centre.
  const lines = [];
  for (const word of [...ocr.lines].sort((a, b) => (b.box[1] + b.box[3] / 2) - (a.box[1] + a.box[3] / 2))) {
    const y = word.box[1] + word.box[3] / 2;
    const last = lines.at(-1);
    if (last && Math.abs(last.y - y) < Math.min(last.height, word.box[3]) * 0.5) last.words.push(word);
    else lines.push({ y, height: word.box[3], words: [word] });
  }
  const rawText = lines.map(line => line.words.sort((a, b) => a.box[0] - b.box[0]).map(w => w.text).join('    ')).join('\n');
  drafts.push({ ...row, status: 'draft', rawText, items: parseReceipt(rawText).lines,
    annotation_source: { engine: 'Apple Vision local OCR + PriceCraft heuristic parser',
      vision_revision: ocr.revision, os: ocr.os, parser_sha256: parserHash },
    review: { status: 'draft', complete: false }, error: ocr.error ?? null });
}
await fs.writeFile(path.join(root, 'draft-labels.jsonl'), drafts.map(r => JSON.stringify(r)).join('\n') + '\n');
console.log(JSON.stringify({ receipts: drafts.length, with_candidates: drafts.filter(r => r.items.length).length,
  candidate_items: drafts.reduce((n, r) => n + r.items.length, 0), ocr_errors: drafts.filter(r => r.error).length }));
