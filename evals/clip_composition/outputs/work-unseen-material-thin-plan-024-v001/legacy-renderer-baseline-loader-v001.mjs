// Test-only baseline: supply the captured pre-change renderer at its original URL.
// Never loaded by the production renderer or by the new counterfactual tests.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const originalUrl = new URL('../../render_presentation_v002.mjs', import.meta.url).href;
const diagnosisUrl = new URL('./render-qc-scaling-diagnosis-v001.json', import.meta.url);
export async function load(url, context, nextLoad) {
  if (url !== originalUrl) return nextLoad(url, context);
  const diagnosis = JSON.parse(await readFile(diagnosisUrl, 'utf8'));
  const row = diagnosis.files.find(item => item.path === 'evals/clip_composition/render_presentation_v002.mjs');
  if (createHash('sha256').update(row.content).digest('hex') !== row.fileSha256) {
    throw new Error('captured baseline renderer changed');
  }
  return {format: 'module', source: row.content, shortCircuit: true};
}
