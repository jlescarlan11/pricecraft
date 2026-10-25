// Execute frozen, deployed service code. No private receipts or credentials are saved.
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { build } from 'esbuild';
import { loadEnv } from 'vite';

const split = process.argv[2] || 'validation';
const limit = Number(process.argv[3] || 100);
if (!['validation', 'test'].includes(split)) throw Error('Benchmark uses validation or test only');
const root = process.env.RECEIPT_ML_ROOT || '.receipt-ml';
const frozen = path.join(root, 'frozen-production');
await fs.mkdir(frozen, { recursive: true });
const marker = path.join(frozen, 'provenance.json');
try { await fs.access(marker); } catch {
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const hashes = {};
  for (const name of ['groqService.ts', 'receiptParser.ts', 'ocrSpaceService.ts']) {
    const code = execFileSync('git', ['show', `${commit}:src/services/${name}`], { encoding: 'utf8' });
    await fs.writeFile(path.join(frozen, name), code);
    hashes[name] = createHash('sha256').update(code).digest('hex');
  }
  await fs.writeFile(marker, JSON.stringify({ commit, hashes, description: 'Git HEAD production baseline; pending local quantity fixes excluded' }, null, 2));
}
const env = loadEnv('development', process.cwd(), 'VITE_');
for (const key of ['VITE_OCR_SPACE_API_KEY', 'VITE_GROQ_API_KEY']) {
  if (!env[key]) throw Error(`${key} is required`);
  process.env[key] = env[key];
}
async function service(file) {
  const bundled = await build({ entryPoints: [path.join(frozen, file)], bundle: true,
    write: false, format: 'esm', platform: 'node', define: { 'import.meta.env': 'process.env' }, logLevel: 'silent' });
  return import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
}
const { recognizeWithOcrSpace } = await service('ocrSpaceService.ts');
const { extractItemsWithGroq, GROQ_MODEL } = await service('groqService.ts');
const realFetch = globalThis.fetch;
let nextGroqRequest = 0;
let pacingSeconds = 0;
globalThis.fetch = async (url, options = {}) => {
  const isGroq = String(url).includes('api.groq.com');
  for (let attempt = 0; ; attempt++) {
    if (isGroq) {
      const waitStart = performance.now();
      await delay(Math.max(0, nextGroqRequest - Date.now()));
      pacingSeconds += (performance.now() - waitStart) / 1000;
    }
    const response = await realFetch(url, { ...options, signal: AbortSignal.timeout(90000) });
    if (isGroq) nextGroqRequest = Date.now() + 25000;
    if (!isGroq || response.status !== 429 || attempt >= 3) return response;
    const message = await response.clone().text();
    if (/per day|daily|quota|TPD/i.test(message)) return response;
    const retry = Number(response.headers.get('retry-after')) || 60;
    console.log(JSON.stringify({ event: 'rate_limit_retry', attempt: attempt + 1, wait_seconds: retry }));
    await response.body?.cancel();
    nextGroqRequest = Date.now() + Math.max(30000, retry * 1000);
  }
};
const records = (await fs.readFile(path.join(root, `${split}.jsonl`), 'utf8')).trim().split('\n').map(JSON.parse).slice(0, limit);
const output = path.join(root, 'predictions', `groq-${split}.jsonl`);
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.mkdir(path.join(root, 'ocr'), { recursive: true });
let existing = [];
try { existing = (await fs.readFile(output, 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse); } catch {}
// Retry transient failures on an explicit resumed run; preserve all attempts on disk.
const done = new Set(existing.filter(r => !r.error).map(r => r.id));
for (const r of records) {
  if (done.has(r.id)) continue;
  const start = performance.now();
  let result;
  try {
    const cache = path.join(root, 'ocr', `${r.id}.json`);
    let ocr;
    try { ocr = JSON.parse(await fs.readFile(cache, 'utf8')); } catch {
      const bytes = await fs.readFile(r.ocr_image);
      if (bytes.length > 1024 * 1024) throw Error('Prepared image exceeds OCR service limit');
      const t = performance.now();
      const recognized = await recognizeWithOcrSpace(new Blob([bytes], { type: 'image/jpeg' }));
      ocr = { text: recognized.text, raw: recognized.raw, seconds: (performance.now() - t) / 1000 };
      await fs.writeFile(cache, JSON.stringify(ocr));
    }
    const t = performance.now();
    const priorPacing = pacingSeconds;
    const extracted = await extractItemsWithGroq(ocr.text);
    result = { id: r.id, model: GROQ_MODEL,
      seconds: ocr.seconds + (performance.now() - t) / 1000 - (pacingSeconds - priorPacing),
      pacing_seconds: pacingSeconds - priorPacing,
      items: extracted.map(x => ({ name: x.itemName, price: x.price,
        count: !x.unit || ['pc', 'pcs'].includes(x.unit) ? x.quantity ?? null : null })), extracted };
  } catch (error) {
    const message = String(error.message || error).slice(0, 500);
    result = { id: r.id, error: message, items: [], seconds: (performance.now() - start) / 1000 };
    await fs.appendFile(output, JSON.stringify(result) + '\n');
    console.log(JSON.stringify({ id: r.id, error: message }));
    // Stop on exhausted quota/auth; preserve failures and resume deliberately.
    if (/429|rate.limit|401|403|limit reached|daily/i.test(message)) break;
    continue;
  }
  await fs.appendFile(output, JSON.stringify(result) + '\n');
  console.log(JSON.stringify({ id: r.id, items: result.items.length, seconds: result.seconds }));
  await delay(2100);
}
