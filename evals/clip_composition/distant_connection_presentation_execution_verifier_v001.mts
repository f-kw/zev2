import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {
  assertDistantConnectionPresentationExecutionResultV001,
  decodeDistantConnectionPresentationExecutionJobV001,
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

type Binding = {path: string; fileSha256: string; schemaVersion?: string; canonicalSha256?: string};
type JsonObject = Record<string, any>;

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
const fail = (message: string): never => {
  throw new Error(`DISTANT_CONNECTION_PRESENTATION_EXECUTION_VERIFY_V001: ${message}`);
};
const readJson = async (workspaceRoot: string, binding: Binding, label: string) => {
  const bytes = await readFile(path.join(workspaceRoot, binding.path));
  if (sha(bytes) !== binding.fileSha256) fail(`${label} SHA mismatch`);
  const value = JSON.parse(bytes.toString('utf8')) as JsonObject;
  if (binding.schemaVersion !== undefined && value.schemaVersion !== binding.schemaVersion) {
    fail(`${label} schema mismatch`);
  }
  if (binding.canonicalSha256 !== undefined
    && canonicalSha(value) !== binding.canonicalSha256) fail(`${label} canonical mismatch`);
  if (!formal(value).equals(bytes)) fail(`${label} is not formal byte`);
  return value;
};

export async function verifyDistantConnectionPresentationExecutionResultV001(
  workspaceRoot: string,
  resultPath: string,
) {
  const resultBytes = await readFile(path.join(workspaceRoot, resultPath));
  const result = JSON.parse(resultBytes.toString('utf8'));
  assertDistantConnectionPresentationExecutionResultV001(result);
  if (!formal(result).equals(resultBytes)) fail('result is not formal byte');
  const jobBytes = await readFile(path.join(workspaceRoot, result.executionJobBinding.path));
  if (sha(jobBytes) !== result.executionJobBinding.fileSha256) fail('execution job SHA mismatch');
  const job = decodeDistantConnectionPresentationExecutionJobV001(jobBytes);
  if (result.sourceVideoId !== job.sourceVideoId || result.candidateId !== job.candidateId) {
    fail('result target mismatch');
  }
  const expectedPaths = {
    adaptedSelection: job.publication.selectionPath,
    cueEndProjection: job.publication.cueEndProjectionPath,
    lineEndProjection: job.publication.lineEndProjectionPath,
    sourcePackage: job.publication.sourcePackagePath,
    instruction: job.publication.instructionPath,
    rendererJob: job.publication.rendererJobPath,
    rendererExecutionResult: job.publication.rendererExecutionResultPath,
    admissionReceipt: job.publication.admissionReceiptPath,
    lineLayout: job.publication.lineLayoutPath,
    outputVideo: `${job.publication.renderOutputRoot}/presentation-rendered-v002.mp4`,
  };
  if (result.subtitleDecision.approvedSelectionSource.path
      !== job.inputs.approvedSelection.selection.path
    || result.subtitleDecision.approvedSelectionSource.fileSha256
      !== job.inputs.approvedSelection.selection.fileSha256) fail('approved selection source mismatch');
  for (const [key, expected] of Object.entries(expectedPaths)) {
    const area = key in result.subtitleDecision ? result.subtitleDecision
      : key in result.renderInput ? result.renderInput : result.execution;
    if (area[key].path !== expected) fail(`${key} path mismatch`);
  }
  const [approvedSelection, sourcePackage, adaptedSelection, cue, line, meaning, timeline,
    instruction, rendererJob, rendererRecord, admission, lineLayout] = await Promise.all([
    readJson(workspaceRoot, result.subtitleDecision.approvedSelectionSource, 'approved selection'),
    readJson(workspaceRoot, result.renderInput.sourcePackage, 'source package'),
    readJson(workspaceRoot, result.subtitleDecision.adaptedSelection, 'adapted selection'),
    readJson(workspaceRoot, result.subtitleDecision.cueEndProjection, 'cue projection'),
    readJson(workspaceRoot, result.subtitleDecision.lineEndProjection, 'line projection'),
    readJson(workspaceRoot, job.inputs.presentationMeaningInput, 'meaning input'),
    readJson(workspaceRoot, job.inputs.baseMedia.timeline, 'timeline'),
    readJson(workspaceRoot, result.renderInput.instruction, 'instruction'),
    readJson(workspaceRoot, result.renderInput.rendererJob, 'renderer job'),
    readJson(workspaceRoot, result.execution.rendererExecutionResult, 'renderer execution'),
    readJson(workspaceRoot, result.execution.admissionReceipt, 'admission receipt'),
    readJson(workspaceRoot, result.execution.lineLayout, 'line layout'),
  ]);
  if (validatePresentationOutputCaptionCueSourcePackageV001(sourcePackage).status !== 'passed'
    || validatePresentationCueEndProjectionV001(cue, {
      sourcePackage, selection: adaptedSelection,
    }).status !== 'passed'
    || validatePresentationSemanticLineEndProjectionV001(line, {
      sourcePackage, selection: adaptedSelection, cueEndProjection: cue,
    }).status !== 'passed'
    || validatePresentationInstructionArtifactV002(instruction, {
      meaningPackage: meaning, timeline, cueEndProjection: cue,
    }).status !== 'passed'
    || validatePresentationInstructionRendererJobV002(rendererJob).status !== 'passed') {
    fail('existing contract validation failed');
  }
  if (formal(adaptedSelection.response).compare(formal(approvedSelection.response)) !== 0) {
    fail('approved selection response changed');
  }
  if (sourcePackage.provenance.sourcePackageJobBinding.path
      !== result.executionJobBinding.path
    || cue.provenance.producerJobBinding.path !== result.executionJobBinding.path
    || line.provenance.producerJobBinding.path !== result.executionJobBinding.path
    || instruction.provenance.producerJobBinding.path !== result.executionJobBinding.path) {
    fail('producer provenance is not the real execution job');
  }
  if (rendererRecord.status !== 'completed' || rendererRecord.exitCode !== 0
    || rendererRecord.rendererResult?.qc?.status !== 'passed'
    || admission.status !== 'accepted'
    || lineLayout.schemaVersion !== 'presentation-renderer-line-layout-v002'
    || await shaFile(path.join(workspaceRoot, result.execution.outputVideo.path))
      !== result.execution.outputVideo.fileSha256) fail('render/QC evidence mismatch');
  return {
    status: 'passed',
    candidateId: result.candidateId,
    sourceVideoId: result.sourceVideoId,
    outputVideo: result.execution.outputVideo,
    qcStatus: result.execution.qcStatus,
  } as const;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void verifyDistantConnectionPresentationExecutionResultV001(
    process.cwd(),
    process.argv[2] ?? '',
  ).then(value => process.stdout.write(`${JSON.stringify(value)}\n`)).catch(error => {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exitCode = 1;
  });
}
