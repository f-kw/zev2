import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {
  assertDistantConnectionPresentationExecutionJobV001,
  assertDistantConnectionPresentationExecutionResultV001,
  buildDistantConnectionPresentationExecutionArtifactsV001,
  decodeDistantConnectionPresentationExecutionJobV001,
  serializeDistantConnectionPresentationExecutionJobV001,
} from './distant_connection_presentation_execution_v001.mts';
import {validatePresentationCueEndProjectionV001,
  validatePresentationSemanticLineEndProjectionV001}
  from './presentation_cue_end_projection_v001.mjs';
import {validatePresentationInstructionArtifactV002}
  from './presentation_instruction_artifact_v002.mjs';
import {validatePresentationInstructionRendererJobV002}
  from './presentation_renderer_admission_receipt_v002.mjs';
import {validatePresentationOutputCaptionCueSourcePackageV001}
  from './presentation_output_caption_cue_source_package_v001.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const JOB_PATH = 'evals/clip_composition/outputs/presentation/'
  + 'distant-connection-presentation-execution/candidate-horror-claim-to-speed-up-v002/'
  + 'execution-job-v001.json';
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const shaFile = (filePath: string) => new Promise<string>((resolve, reject) => {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath);
  stream.on('data', chunk => hash.update(chunk));
  stream.on('error', reject);
  stream.on('end', () => resolve(hash.digest('hex')));
});
const canonicalSha = (value: unknown) => sha(Buffer.from(canonicalJson(value), 'utf8'));
const formal = (value: unknown) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');

test('正式jobは候補・selection・base-media・renderer templateを実在SHAで束縛する', async () => {
  const job = decodeDistantConnectionPresentationExecutionJobV001(
    await readFile(path.join(ROOT, JOB_PATH)),
  );
  assert.equal(job.candidateId, 'candidate-horror-claim-to-speed-up');
  assert.equal(job.executionPolicy.externalAiExecution, 'forbidden');
  for (const binding of [
    job.inputs.renderAdapterJob,
    job.inputs.presentationMeaningInput,
    job.inputs.sourceVideo,
    job.inputs.baseMedia.media,
    job.inputs.baseMedia.timeline,
    job.inputs.baseMedia.generationManifest,
    job.inputs.baseMedia.validationReceipt,
    job.inputs.approvedSelection.sourcePackage,
    job.inputs.approvedSelection.selection,
    job.inputs.rendererJobTemplate,
    job.implementationBinding,
  ]) {
    assert.equal(await shaFile(path.join(ROOT, binding.path)), binding.fileSha256);
  }
});

test('既存selection responseをbyte不変で新しい実在jobへ再束縛する', async () => {
  const built = await buildDistantConnectionPresentationExecutionArtifactsV001(ROOT, JOB_PATH);
  const original = JSON.parse(await readFile(
    path.join(ROOT, built.job.inputs.approvedSelection.selection.path), 'utf8',
  ));
  assert.deepEqual(built.selection.response, original.response);
  assert.notDeepEqual(built.selection.sourcePackageBinding, original.sourcePackageBinding);
  assert.equal(built.sourcePackage.provenance.sourcePackageJobBinding.path, JOB_PATH);
  assert.equal(built.cueEndProjection.provenance.producerJobBinding.path, JOB_PATH);
  assert.equal(built.lineEndProjection.provenance.producerJobBinding.path, JOB_PATH);
  assert.equal(built.instruction.provenance.producerJobBinding.path, JOB_PATH);
  for (const binding of [
    built.sourcePackage.provenance.sourcePackageJobBinding,
    ...built.sourcePackage.provenance.implementationBindings,
    ...built.sourcePackage.provenance.approvedContractBindings,
  ]) assert.equal((await readFile(path.join(ROOT, binding.path))).length > 0, true);
});

test('selectionからprojection・instruction・既存renderer jobまで全contractを通す', async () => {
  const built = await buildDistantConnectionPresentationExecutionArtifactsV001(ROOT, JOB_PATH);
  assert.equal(validatePresentationOutputCaptionCueSourcePackageV001(built.sourcePackage).status,
    'passed');
  assert.equal(validatePresentationCueEndProjectionV001(built.cueEndProjection, {
    sourcePackage: built.sourcePackage,
    selection: built.selection,
  }).status, 'passed');
  assert.equal(validatePresentationSemanticLineEndProjectionV001(built.lineEndProjection, {
    sourcePackage: built.sourcePackage,
    selection: built.selection,
    cueEndProjection: built.cueEndProjection,
  }).status, 'passed');
  assert.equal(validatePresentationInstructionArtifactV002(built.instruction, {
    meaningPackage: built.inputMeaning,
    timeline: built.inputTimeline,
    cueEndProjection: built.cueEndProjection,
  }).status, 'passed');
  assert.equal(validatePresentationInstructionRendererJobV002(built.rendererJob).status, 'passed');
});

test('同一jobから同一byteの全描画入力を再構築する', async () => {
  const first = await buildDistantConnectionPresentationExecutionArtifactsV001(ROOT, JOB_PATH);
  const second = await buildDistantConnectionPresentationExecutionArtifactsV001(ROOT, JOB_PATH);
  for (const key of [
    'sourcePackage', 'selection', 'cueEndProjection', 'lineEndProjection', 'instruction', 'rendererJob',
  ] as const) assert.deepEqual(formal(first[key]), formal(second[key]));
});

test('正式経路の実装に特定candidate ID・特定動画ID・句読点heuristicを持たない', async () => {
  const source = await readFile(
    path.join(ROOT, 'evals/clip_composition/distant_connection_presentation_execution_v001.mts'),
    'utf8',
  );
  assert.equal(source.includes('candidate-horror-claim-to-speed-up'), false);
  assert.equal(source.includes('ymUsGrT6EaA'), false);
  assert.equal(source.includes("atom.text === '!'"), false);
  assert.equal(source.includes('findIndex'), false);
});

test('余分fieldを持つjobをfail-closedにする', async () => {
  const job = JSON.parse(await readFile(path.join(ROOT, JOB_PATH), 'utf8'));
  job.extra = true;
  assert.throws(() => assertDistantConnectionPresentationExecutionJobV001(job), /job root/);
});

test('selection SHA差を実行前にfail-closedにする', async () => {
  const job = JSON.parse(await readFile(path.join(ROOT, JOB_PATH), 'utf8'));
  job.inputs.approvedSelection.selection.fileSha256 = '0'.repeat(64);
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zev-execution-job-'));
  const relative = path.relative(ROOT, path.join(directory, 'job.json'));
  await writeFile(path.join(directory, 'job.json'), formal(job));
  await assert.rejects(
    buildDistantConnectionPresentationExecutionArtifactsV001(ROOT, relative),
    /approved selection SHA/,
  );
});

test('resultは字幕判断・描画入力・出力・QCを独立bindingで保持する', async () => {
  const jobBytes = await readFile(path.join(ROOT, JOB_PATH));
  const job = JSON.parse(jobBytes.toString('utf8'));
  const binding = {
    schemaVersion: job.schemaVersion,
    path: JOB_PATH,
    fileSha256: sha(jobBytes),
    canonicalSha256: canonicalSha(job),
  };
  const mediaBinding = {path: job.inputs.baseMedia.media.path, fileSha256: job.inputs.baseMedia.media.fileSha256};
  const result = {
    schemaVersion: 'distant-connection-presentation-execution-result-v001',
    resultId: 'fixture-result-v001',
    status: 'completed',
    sourceVideoId: job.sourceVideoId,
    candidateId: job.candidateId,
    executionJobBinding: binding,
    subtitleDecision: {
      approvedSelectionSource: job.inputs.approvedSelection.selection,
      adaptedSelection: binding,
      cueEndProjection: binding,
      lineEndProjection: binding,
    },
    renderInput: {sourcePackage: binding, instruction: binding, rendererJob: binding},
    execution: {
      rendererExecutionResult: binding,
      admissionReceipt: binding,
      lineLayout: binding,
      outputVideo: mediaBinding,
      qcStatus: 'passed',
    },
    responsibilityPrinciple:
      '本resultは正式selectionから字幕projection、instruction、renderer job、描画、技術QCまでの実在成果物を束縛する。候補品質や人間採否を所有しない。',
  };
  assert.doesNotThrow(() => assertDistantConnectionPresentationExecutionResultV001(result));
  const changed = structuredClone(result);
  changed.execution.qcStatus = 'failed';
  assert.throws(() => assertDistantConnectionPresentationExecutionResultV001(changed), /execution/);
});

test('job serializerはformal byteを固定する', async () => {
  const job = decodeDistantConnectionPresentationExecutionJobV001(
    await readFile(path.join(ROOT, JOB_PATH)),
  );
  assert.deepEqual(
    serializeDistantConnectionPresentationExecutionJobV001(job),
    await readFile(path.join(ROOT, JOB_PATH)),
  );
});
