import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {verifyDistantConnectionPresentationExecutionResultV001}
  from './distant_connection_presentation_execution_verifier_v001.mts';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const RESULT_PATH = 'evals/clip_composition/outputs/presentation/'
  + 'distant-connection-presentation-execution/candidate-horror-claim-to-speed-up-v002/'
  + 'execution-result-v001.json';

test('正式selectionからrender/QCまでの全provenanceを実在SHAで検証する', async () => {
  const verified = await verifyDistantConnectionPresentationExecutionResultV001(
    ROOT, RESULT_PATH,
  );
  assert.equal(verified.status, 'passed');
  assert.equal(verified.qcStatus, 'passed');
});

test('正式resultのoutput SHA差をfail-closedにする', async () => {
  const result = JSON.parse(await readFile(path.join(ROOT, RESULT_PATH), 'utf8'));
  result.execution.outputVideo.fileSha256 = '0'.repeat(64);
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zev-execution-result-'));
  const resultPath = path.join(directory, 'result.json');
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`);
  await assert.rejects(
    verifyDistantConnectionPresentationExecutionResultV001(
      ROOT, path.relative(ROOT, resultPath),
    ),
    /render\/QC evidence mismatch/,
  );
});
