import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {buildCacheAndFrameHashArgumentsV001} from './run_unseen_material_qc_only_v001.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const WORK = path.join(ROOT, 'evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
test('capturing encoder input beside lossless encoding preserves the original graph pixels', async () => {
  const original = path.join(WORK, 'qc-lossless-fixture-v001-nIMDZT');
  const directory = await mkdtemp(path.join(WORK, 'qc-cache-capture-fixture-v001-'));
  const input = JSON.parse(await readFile(path.join(original, 'regular-input.json'), 'utf8')).input;
  const cachePath = path.join(directory, 'cache.nut'), hashPath = path.join(directory, 'encoder-input.framehash.txt');
  const args = buildCacheAndFrameHashArgumentsV001(input, cachePath, hashPath);
  const executions = [];
  const run = args => new Promise((resolve, reject) => {
    const started = Date.now(), child = spawn('/opt/homebrew/bin/ffmpeg', args, {stdio: ['ignore', 'pipe', 'pipe']});
    const out = [], err = []; child.stdout.on('data', b => out.push(b)); child.stderr.on('data', b => err.push(b)); child.on('error', reject);
    child.on('close', (code, signal) => {
      const stdout = Buffer.concat(out), stderr = Buffer.concat(err).toString(); executions.push({args, code, signal, stderr, elapsedMs: Date.now() - started});
      if (code === 0 && signal === null) resolve(stdout); else reject(new Error(stderr));
    });
  });
  await run(args);
  const decoded = await run(['-hide_banner', '-loglevel', 'error', '-i', cachePath,
    '-map', '0:v:0', '-pix_fmt', 'yuv420p', '-f', 'framehash', '-hash', 'sha256', '-']);
  const legacy = await readFile(path.join(original, 'regular-baseline-before-cache.framehash.txt'));
  assert.deepEqual(await readFile(hashPath), legacy, 'split output changes the original encoder input');
  const rows = data => data.toString().split('\n').filter(s => s && !s.startsWith('#')).map(s => s.split(',').at(-1).trim());
  assert.equal(rows(decoded).length, 900); assert.deepEqual(rows(decoded), rows(legacy));
  await writeFile(path.join(directory, 'decoded.framehash.txt'), decoded, {flag: 'wx'});
  const bind = async p => {const bytes = await readFile(p); return {path: path.relative(ROOT, p), fileSha256: hash(bytes), bytes: bytes.length};};
  const result = {status: 'passed', all900PreEncodeAndDecodedPixelsIdentical: true, executions,
    implementation: await bind(path.join(ROOT, 'evals/clip_composition/run_unseen_material_qc_only_v001.mjs')),
    helperSource: buildCacheAndFrameHashArgumentsV001.toString(),
    cache: await bind(cachePath), encoderInputFrameHash: await bind(hashPath),
    originalFrameHash: await bind(path.join(original, 'regular-baseline-before-cache.framehash.txt'))};
  await writeFile(path.join(directory, 'result.json'), JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
  process.stdout.write('# evidence: ' + directory + '\n');
});
