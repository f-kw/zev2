import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  canonicalJson,
} from './presentation_caption_contract_v002.mjs';
import {
  buildPresentationCueEndProjectionBindingV001,
  buildPresentationCueEndProjectionV001,
  buildPresentationSemanticLineEndProjectionBindingV001,
  buildPresentationSemanticLineEndProjectionV001,
  serializePresentationCueEndProjectionV001,
  serializePresentationSemanticLineEndProjectionV001,
} from './presentation_cue_end_projection_v001.mjs';
import {
  buildPresentationCaptionInstructionArtifactV002,
  buildPresentationInstructionArtifactBindingV002,
  serializePresentationInstructionArtifactV002,
} from './presentation_instruction_artifact_v002.mjs';
import {
  serializePresentationInstructionRendererJobV002,
  validatePresentationInstructionRendererJobV002,
} from './presentation_renderer_admission_receipt_v002.mjs';
import {
  validatePresentationOutputCaptionCueSourcePackageV001,
} from './presentation_output_caption_cue_source_package_v001.mjs';
import {
  runPresentationInstructionRendererJobFileV002,
} from './run_presentation_instruction_renderer_job_v002.ts';

export const DISTANT_CONNECTION_PRESENTATION_EXECUTION_JOB_SCHEMA_V001 =
  'distant-connection-presentation-execution-job-v001';
export const DISTANT_CONNECTION_PRESENTATION_EXECUTION_RESULT_SCHEMA_V001 =
  'distant-connection-presentation-execution-result-v001';

type JsonObject = Record<string, any>;
type ByteBinding = {path: string; fileSha256: string};
type FormalBinding = ByteBinding & {schemaVersion: string; canonicalSha256: string};

export type DistantConnectionPresentationExecutionJobV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_PRESENTATION_EXECUTION_JOB_SCHEMA_V001;
  jobId: string;
  sourceVideoId: string;
  candidateId: string;
  inputs: {
    renderAdapterJob: FormalBinding;
    presentationMeaningInput: FormalBinding;
    sourceVideo: ByteBinding;
    baseMedia: {
      media: ByteBinding;
      timeline: FormalBinding;
      generationManifest: FormalBinding;
      validationReceipt: FormalBinding;
    };
    approvedSelection: {
      sourcePackage: FormalBinding;
      selection: FormalBinding;
    };
    rendererJobTemplate: FormalBinding;
  };
  executionPolicy: {
    selectionHandling: 'preserve-response-and-rebind-source-package-v001';
    renderingHandling: 'reuse-renderer-v002-settings-v001';
    styleProfileId: string;
    externalAiExecution: 'forbidden';
  };
  implementationBinding: ByteBinding & {role: 'distant-connection-presentation-execution-v001'};
  publication: {
    root: string;
    sourcePackagePath: string;
    selectionPath: string;
    cueEndProjectionPath: string;
    lineEndProjectionPath: string;
    instructionPath: string;
    rendererJobPath: string;
    admissionReceiptPath: string;
    lineLayoutPath: string;
    renderOutputRoot: string;
    rendererExecutionResultPath: string;
    executionResultPath: string;
  };
  responsibilityPrinciple: string;
};

export type DistantConnectionPresentationExecutionResultV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_PRESENTATION_EXECUTION_RESULT_SCHEMA_V001;
  resultId: string;
  status: 'completed';
  sourceVideoId: string;
  candidateId: string;
  executionJobBinding: FormalBinding;
  subtitleDecision: {
    approvedSelectionSource: FormalBinding;
    adaptedSelection: FormalBinding;
    cueEndProjection: FormalBinding;
    lineEndProjection: FormalBinding;
  };
  renderInput: {
    sourcePackage: FormalBinding;
    instruction: FormalBinding;
    rendererJob: FormalBinding;
  };
  execution: {
    rendererExecutionResult: FormalBinding;
    admissionReceipt: FormalBinding;
    lineLayout: FormalBinding;
    outputVideo: ByteBinding;
    qcStatus: 'passed';
  };
  responsibilityPrinciple: string;
};

const JOB_KEYS = [
  'schemaVersion', 'jobId', 'sourceVideoId', 'candidateId', 'inputs', 'executionPolicy',
  'implementationBinding', 'publication', 'responsibilityPrinciple',
];
const RESULT_KEYS = [
  'schemaVersion', 'resultId', 'status', 'sourceVideoId', 'candidateId',
  'executionJobBinding', 'subtitleDecision', 'renderInput', 'execution',
  'responsibilityPrinciple',
];
const SHA256 = /^[0-9a-f]{64}$/u;
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._\-/]+$/u;
const JOB_RESPONSIBILITY =
  '本jobは既存の正式selection判断を変更せず実在するjobへ再束縛し、既存renderer v002へ決定的に渡す。候補探索、再selection、字幕意味判断、区間判断、候補採否、外部AI実行を行わない。';
const RESULT_RESPONSIBILITY =
  '本resultは正式selectionから字幕projection、instruction、renderer job、描画、技術QCまでの実在成果物を束縛する。候補品質や人間採否を所有しない。';

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const sha256File = (filePath: string) => new Promise<string>((resolve, reject) => {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath);
  stream.on('data', chunk => hash.update(chunk));
  stream.on('error', reject);
  stream.on('end', () => resolve(hash.digest('hex')));
});
const formalBytes = (value: unknown) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const canonicalSha256 = (value: unknown) => sha256(Buffer.from(canonicalJson(value), 'utf8'));
const clone = <T>(value: T): T => structuredClone(value);
const isObject = (value: unknown): value is JsonObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value: JsonObject, keys: string[]) => {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
};
const fail = (message: string): never => {
  throw new Error(`DISTANT_CONNECTION_PRESENTATION_EXECUTION_V001: ${message}`);
};
const parseJson = (bytes: Uint8Array, label: string): JsonObject => {
  try {
    const value = JSON.parse(Buffer.from(bytes).toString('utf8'));
    if (!isObject(value)) fail(`${label}のrootがobjectではありません`);
    return value;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('DISTANT_CONNECTION_')) throw error;
    return fail(`${label}がJSONとして読めません`);
  }
};
const assertWorkspacePath = (value: unknown, label: string): asserts value is string => {
  if (typeof value !== 'string' || !WORKSPACE_PATH.test(value)) fail(`${label} pathが不正です`);
};
const assertByteBinding = (value: unknown, label: string): asserts value is ByteBinding => {
  if (!isObject(value) || !exactKeys(value, ['path', 'fileSha256'])) fail(`${label} bindingが不正です`);
  assertWorkspacePath(value.path, label);
  if (typeof value.fileSha256 !== 'string' || !SHA256.test(value.fileSha256)) {
    fail(`${label} SHAが不正です`);
  }
};
const assertFormalBinding = (value: unknown, label: string): asserts value is FormalBinding => {
  if (!isObject(value)
    || !exactKeys(value, ['schemaVersion', 'path', 'fileSha256', 'canonicalSha256'])
    || typeof value.schemaVersion !== 'string'
    || !FORMAL_ID.test(value.schemaVersion)) fail(`${label} formal bindingが不正です`);
  assertWorkspacePath(value.path, label);
  if (typeof value.fileSha256 !== 'string' || !SHA256.test(value.fileSha256)
    || typeof value.canonicalSha256 !== 'string' || !SHA256.test(value.canonicalSha256)) {
    fail(`${label} digestが不正です`);
  }
};
const byteBinding = (filePath: string, bytes: Uint8Array): ByteBinding => ({
  path: filePath,
  fileSha256: sha256(bytes),
});
const formalBinding = (filePath: string, value: JsonObject): FormalBinding => ({
  schemaVersion: value.schemaVersion,
  path: filePath,
  fileSha256: sha256(formalBytes(value)),
  canonicalSha256: canonicalSha256(value),
});
const readBoundBytes = async (workspaceRoot: string, binding: ByteBinding, label: string) => {
  const bytes = await readFile(path.join(workspaceRoot, binding.path));
  if (sha256(bytes) !== binding.fileSha256) fail(`${label} SHAが一致しません`);
  return bytes;
};
const readBoundJson = async (workspaceRoot: string, binding: FormalBinding, label: string) => {
  const bytes = await readBoundBytes(workspaceRoot, binding, label);
  const value = parseJson(bytes, label);
  if (value.schemaVersion !== binding.schemaVersion
    || canonicalSha256(value) !== binding.canonicalSha256
    || !formalBytes(value).equals(bytes)) fail(`${label} formal bindingが一致しません`);
  return value;
};

export function assertDistantConnectionPresentationExecutionJobV001(
  value: unknown,
): asserts value is DistantConnectionPresentationExecutionJobV001 {
  if (!isObject(value) || !exactKeys(value, JOB_KEYS)
    || value.schemaVersion !== DISTANT_CONNECTION_PRESENTATION_EXECUTION_JOB_SCHEMA_V001
    || typeof value.jobId !== 'string' || !FORMAL_ID.test(value.jobId)
    || typeof value.sourceVideoId !== 'string' || !FORMAL_ID.test(value.sourceVideoId)
    || typeof value.candidateId !== 'string' || !FORMAL_ID.test(value.candidateId)
    || value.responsibilityPrinciple !== JOB_RESPONSIBILITY) fail('job rootが不正です');
  if (!isObject(value.inputs) || !exactKeys(value.inputs, [
    'renderAdapterJob', 'presentationMeaningInput', 'sourceVideo', 'baseMedia',
    'approvedSelection', 'rendererJobTemplate',
  ])) fail('job inputsが不正です');
  assertFormalBinding(value.inputs.renderAdapterJob, 'render adapter job');
  assertFormalBinding(value.inputs.presentationMeaningInput, 'presentation meaning input');
  assertByteBinding(value.inputs.sourceVideo, 'source video');
  if (!isObject(value.inputs.baseMedia) || !exactKeys(value.inputs.baseMedia, [
    'media', 'timeline', 'generationManifest', 'validationReceipt',
  ])) fail('base media inputsが不正です');
  assertByteBinding(value.inputs.baseMedia.media, 'base media');
  assertFormalBinding(value.inputs.baseMedia.timeline, 'timeline');
  assertFormalBinding(value.inputs.baseMedia.generationManifest, 'generation manifest');
  assertFormalBinding(value.inputs.baseMedia.validationReceipt, 'validation receipt');
  if (!isObject(value.inputs.approvedSelection)
    || !exactKeys(value.inputs.approvedSelection, ['sourcePackage', 'selection'])) {
    fail('approved selection inputsが不正です');
  }
  assertFormalBinding(value.inputs.approvedSelection.sourcePackage, 'selection source package');
  assertFormalBinding(value.inputs.approvedSelection.selection, 'approved selection');
  assertFormalBinding(value.inputs.rendererJobTemplate, 'renderer job template');
  if (!isObject(value.executionPolicy) || !exactKeys(value.executionPolicy, [
    'selectionHandling', 'renderingHandling', 'styleProfileId', 'externalAiExecution',
  ])
    || value.executionPolicy.selectionHandling !== 'preserve-response-and-rebind-source-package-v001'
    || value.executionPolicy.renderingHandling !== 'reuse-renderer-v002-settings-v001'
    || typeof value.executionPolicy.styleProfileId !== 'string'
    || !FORMAL_ID.test(value.executionPolicy.styleProfileId)
    || value.executionPolicy.externalAiExecution !== 'forbidden') fail('execution policyが不正です');
  if (!isObject(value.implementationBinding)
    || !exactKeys(value.implementationBinding, ['role', 'path', 'fileSha256'])
    || value.implementationBinding.role !== 'distant-connection-presentation-execution-v001') {
    fail('implementation bindingが不正です');
  }
  assertWorkspacePath(value.implementationBinding.path, 'implementation');
  if (typeof value.implementationBinding.fileSha256 !== 'string'
    || !SHA256.test(value.implementationBinding.fileSha256)) fail('implementation SHAが不正です');
  const publicationKeys = [
    'root', 'sourcePackagePath', 'selectionPath', 'cueEndProjectionPath',
    'lineEndProjectionPath', 'instructionPath', 'rendererJobPath', 'admissionReceiptPath',
    'lineLayoutPath', 'renderOutputRoot', 'rendererExecutionResultPath', 'executionResultPath',
  ];
  if (!isObject(value.publication) || !exactKeys(value.publication, publicationKeys)) {
    fail('publicationが不正です');
  }
  for (const key of publicationKeys) assertWorkspacePath(value.publication[key], `publication.${key}`);
  const values = publicationKeys.slice(1).map(key => value.publication[key]);
  if (new Set(values).size !== values.length
    || values.some(filePath => !filePath.startsWith(`${value.publication.root}/`))) {
    fail('publication pathがroot配下で一意ではありません');
  }
}

export function serializeDistantConnectionPresentationExecutionJobV001(
  value: DistantConnectionPresentationExecutionJobV001,
) {
  assertDistantConnectionPresentationExecutionJobV001(value);
  return formalBytes(value);
}

export function decodeDistantConnectionPresentationExecutionJobV001(bytes: Uint8Array) {
  const value = parseJson(bytes, 'execution job');
  assertDistantConnectionPresentationExecutionJobV001(value);
  if (!formalBytes(value).equals(Buffer.from(bytes))) fail('execution jobがformal byteではありません');
  return value;
}

export async function buildDistantConnectionPresentationExecutionJobFromFilesV001(input: {
  workspaceRoot: string;
  jobId: string;
  sourceVideoId: string;
  candidateId: string;
  renderAdapterJobPath: string;
  presentationMeaningInputPath: string;
  baseMediaRoot: string;
  approvedSelectionSourcePackagePath: string;
  approvedSelectionPath: string;
  rendererJobTemplatePath: string;
  styleProfileId: string;
  publicationRoot: string;
}): Promise<DistantConnectionPresentationExecutionJobV001> {
  const readJsonBinding = async (filePath: string) => {
    const bytes = await readFile(path.join(input.workspaceRoot, filePath));
    const value = parseJson(bytes, filePath);
    if (!formalBytes(value).equals(bytes)) fail(`${filePath}がformal byteではありません`);
    return formalBinding(filePath, value);
  };
  const renderAdapterJob = await readJsonBinding(input.renderAdapterJobPath);
  const renderAdapterValue = await readBoundJson(input.workspaceRoot, renderAdapterJob, 'render adapter job');
  const candidate = renderAdapterValue.candidates?.find?.((row: any) => row.candidateId === input.candidateId);
  if (renderAdapterValue.sourceVideoId !== input.sourceVideoId || candidate === undefined) {
    fail('render adapterに対象candidateがありません');
  }
  const meaning = await readJsonBinding(input.presentationMeaningInputPath);
  const meaningValue = await readBoundJson(input.workspaceRoot, meaning, 'presentation meaning input');
  if (meaningValue.sourceVideoId !== input.sourceVideoId || meaningValue.candidateId !== input.candidateId) {
    fail('presentation meaning inputの対象が一致しません');
  }
  const sourcePath = renderAdapterValue.sourceBindings?.sourceVideo?.path;
  if (typeof sourcePath !== 'string') fail('render adapterのsource video bindingが不正です');
  const sourceVideo = {
    path: sourcePath,
    fileSha256: await sha256File(path.join(input.workspaceRoot, sourcePath)),
  };
  if (sourceVideo.fileSha256 !== renderAdapterValue.sourceBindings.sourceVideo.fileSha256) {
    fail('source video SHAがrender adapterと一致しません');
  }
  const base = async (name: string, formal: boolean) => {
    const filePath = `${input.baseMediaRoot}/${name}`;
    const bytes = await readFile(path.join(input.workspaceRoot, filePath));
    return formal ? formalBinding(filePath, parseJson(bytes, filePath)) : byteBinding(filePath, bytes);
  };
  const baseMedia = {
    media: await base('base-media.mp4', false) as ByteBinding,
    timeline: await base('timeline.json', true) as FormalBinding,
    generationManifest: await base('generation-manifest.json', true) as FormalBinding,
    validationReceipt: await base('validation-report.json', true) as FormalBinding,
  };
  const sourcePackage = await readJsonBinding(input.approvedSelectionSourcePackagePath);
  const selection = await readJsonBinding(input.approvedSelectionPath);
  const selectionValue = await readBoundJson(input.workspaceRoot, selection, 'approved selection');
  if (selectionValue.sourcePackageBinding?.path !== sourcePackage.path
    || selectionValue.sourcePackageBinding?.fileSha256 !== sourcePackage.fileSha256
    || selectionValue.sourcePackageBinding?.canonicalSha256 !== sourcePackage.canonicalSha256) {
    fail('approved selectionが指定source packageを束縛していません');
  }
  const sourcePackageValue = await readBoundJson(input.workspaceRoot, sourcePackage, 'selection source package');
  if (validatePresentationOutputCaptionCueSourcePackageV001(sourcePackageValue).status !== 'passed') {
    fail('selection source packageが既存contractを通りません');
  }
  const context = sourcePackageValue.reconstructionMap?.caseContexts?.find?.(
    (row: any) => row.caseId === input.candidateId,
  );
  if (context === undefined
    || context.meaningPackageBinding?.fileSha256 !== meaning.fileSha256
    || context.baseMediaInput?.baseMedia?.fileSha256 !== baseMedia.media.fileSha256
    || context.baseMediaInput?.timeline?.fileSha256 !== baseMedia.timeline.fileSha256) {
    fail('selection source packageが対象meaning/base mediaと一致しません');
  }
  const rendererTemplate = await readJsonBinding(input.rendererJobTemplatePath);
  const rendererTemplateValue = await readBoundJson(
    input.workspaceRoot, rendererTemplate, 'renderer job template',
  );
  if (validatePresentationInstructionRendererJobV002(rendererTemplateValue).status !== 'passed'
    || rendererTemplateValue.cropAppliedBaseMedia?.baseMedia?.fileSha256 !== baseMedia.media.fileSha256
    || rendererTemplateValue.cropAppliedBaseMedia?.timeline?.fileSha256 !== baseMedia.timeline.fileSha256) {
    fail('renderer job templateが対象base mediaと一致しません');
  }
  const implementationPath = path.relative(
    input.workspaceRoot, fileURLToPath(import.meta.url),
  ).split(path.sep).join('/');
  const implementationBytes = await readFile(path.join(input.workspaceRoot, implementationPath));
  const root = input.publicationRoot;
  const job: DistantConnectionPresentationExecutionJobV001 = {
    schemaVersion: DISTANT_CONNECTION_PRESENTATION_EXECUTION_JOB_SCHEMA_V001,
    jobId: input.jobId,
    sourceVideoId: input.sourceVideoId,
    candidateId: input.candidateId,
    inputs: {
      renderAdapterJob,
      presentationMeaningInput: meaning,
      sourceVideo,
      baseMedia,
      approvedSelection: {sourcePackage, selection},
      rendererJobTemplate: rendererTemplate,
    },
    executionPolicy: {
      selectionHandling: 'preserve-response-and-rebind-source-package-v001',
      renderingHandling: 'reuse-renderer-v002-settings-v001',
      styleProfileId: input.styleProfileId,
      externalAiExecution: 'forbidden',
    },
    implementationBinding: {
      role: 'distant-connection-presentation-execution-v001',
      path: implementationPath,
      fileSha256: sha256(implementationBytes),
    },
    publication: {
      root,
      sourcePackagePath: `${root}/source-package-v001.json`,
      selectionPath: `${root}/approved-selection-adapter-v001.json`,
      cueEndProjectionPath: `${root}/cue-end-projection-v001.json`,
      lineEndProjectionPath: `${root}/semantic-line-end-projection-v001.json`,
      instructionPath: `${root}/presentation-instruction-v002.json`,
      rendererJobPath: `${root}/renderer-job-v002.json`,
      admissionReceiptPath: `${root}/admission-receipt-v002.json`,
      lineLayoutPath: `${root}/line-layout-v002.json`,
      renderOutputRoot: `${root}/render-output-v001`,
      rendererExecutionResultPath: `${root}/renderer-execution-result-v002.json`,
      executionResultPath: `${root}/execution-result-v001.json`,
    },
    responsibilityPrinciple: JOB_RESPONSIBILITY,
  };
  assertDistantConnectionPresentationExecutionJobV001(job);
  return job;
}

export async function buildDistantConnectionPresentationExecutionArtifactsV001(
  workspaceRoot: string,
  jobPath: string,
) {
  const jobBytes = await readFile(path.join(workspaceRoot, jobPath));
  const job = decodeDistantConnectionPresentationExecutionJobV001(jobBytes);
  if (sha256(await readFile(path.join(workspaceRoot, job.implementationBinding.path)))
    !== job.implementationBinding.fileSha256) fail('execution implementation SHAが一致しません');
  const [renderAdapter, meaning, sourcePackageInput, selectionInput, rendererTemplate] =
    await Promise.all([
      readBoundJson(workspaceRoot, job.inputs.renderAdapterJob, 'render adapter job'),
      readBoundJson(workspaceRoot, job.inputs.presentationMeaningInput, 'presentation meaning input'),
      readBoundJson(workspaceRoot, job.inputs.approvedSelection.sourcePackage, 'selection source package'),
      readBoundJson(workspaceRoot, job.inputs.approvedSelection.selection, 'approved selection'),
      readBoundJson(workspaceRoot, job.inputs.rendererJobTemplate, 'renderer job template'),
    ]);
  await Promise.all([
    sha256File(path.join(workspaceRoot, job.inputs.sourceVideo.path)).then(observed => {
      if (observed !== job.inputs.sourceVideo.fileSha256) fail('source video SHAが一致しません');
    }),
    readBoundBytes(workspaceRoot, job.inputs.baseMedia.media, 'base media'),
    readBoundJson(workspaceRoot, job.inputs.baseMedia.timeline, 'timeline'),
    readBoundJson(workspaceRoot, job.inputs.baseMedia.generationManifest, 'generation manifest'),
    readBoundJson(workspaceRoot, job.inputs.baseMedia.validationReceipt, 'validation receipt'),
  ]);
  if (!renderAdapter.candidates?.some?.((row: any) => row.candidateId === job.candidateId)
    || meaning.candidateId !== job.candidateId || meaning.sourceVideoId !== job.sourceVideoId) {
    fail('jobのcandidate/sourceVideo bindingが一致しません');
  }
  const executionJobBinding = formalBinding(jobPath, job);
  const sourcePackage = clone(sourcePackageInput);
  sourcePackage.packageId = `${job.jobId}-source-package-v001`;
  sourcePackage.provenance = {
    sourcePackageJobBinding: executionJobBinding,
    implementationBindings: [clone(job.implementationBinding)],
    approvedContractBindings: [clone(job.inputs.presentationMeaningInput)],
  };
  const sourceValidation = validatePresentationOutputCaptionCueSourcePackageV001(sourcePackage);
  if (sourceValidation.status !== 'passed') fail('再束縛source packageがcontractを通りません');
  const sourcePackageBinding = formalBinding(job.publication.sourcePackagePath, sourcePackage);
  const selection = clone(selectionInput);
  selection.selectionId = `${job.jobId}-approved-selection-adapter-v001`;
  selection.sourcePackageBinding = sourcePackageBinding;
  const originalResponseBytes = formalBytes(selectionInput.response);
  if (!formalBytes(selection.response).equals(originalResponseBytes)) fail('selection responseが変化しました');
  const selectionDigest = {
    schemaVersion: selection.schemaVersion,
    artifactId: selection.selectionId,
    fileSha256: sha256(formalBytes(selection)),
    canonicalSha256: canonicalSha256(selection),
  };
  const cueBuilt = buildPresentationCueEndProjectionV001({
    projectionId: `${job.jobId}-cue-end-projection-v001`,
    sourcePackageBinding,
    sourceSelectionDigest: selectionDigest,
    producerJobBinding: executionJobBinding,
    sourcePackage,
    selection,
  });
  if (cueBuilt.status !== 'built') fail('cue end projectionを構築できません');
  const cueEndProjection = cueBuilt.projection;
  const cueEndProjectionBinding = buildPresentationCueEndProjectionBindingV001({
    path: job.publication.cueEndProjectionPath,
    projection: cueEndProjection,
  });
  const lineBuilt = buildPresentationSemanticLineEndProjectionV001({
    projectionId: `${job.jobId}-semantic-line-end-projection-v001`,
    sourcePackageBinding,
    cueEndProjectionBinding,
    sourceSelectionDigest: selectionDigest,
    producerJobBinding: executionJobBinding,
    sourcePackage,
    selection,
    cueEndProjection,
  });
  if (lineBuilt.status !== 'built') fail('line end projectionを構築できません');
  const lineEndProjection = lineBuilt.projection;
  const lineEndProjectionBinding = buildPresentationSemanticLineEndProjectionBindingV001({
    path: job.publication.lineEndProjectionPath,
    projection: lineEndProjection,
  });
  const instructionBuilt = buildPresentationCaptionInstructionArtifactV002({
    artifactId: `${job.jobId}-presentation-instruction-v002`,
    sourceCaseId: job.candidateId,
    meaningInformationPackageBinding: job.inputs.presentationMeaningInput,
    timelineBinding: job.inputs.baseMedia.timeline,
    cueEndProjectionBinding,
    producerJobBinding: executionJobBinding,
    styleProfileId: job.executionPolicy.styleProfileId,
    meaningPackage: meaning,
    timeline: await readBoundJson(workspaceRoot, job.inputs.baseMedia.timeline, 'timeline'),
    cueEndProjection,
  });
  if (instructionBuilt.status !== 'built') fail('presentation instructionを構築できません');
  const instruction = instructionBuilt.artifact;
  const instructionBinding = buildPresentationInstructionArtifactBindingV002({
    path: job.publication.instructionPath,
    artifact: instruction,
  });
  const rendererJob = clone(rendererTemplate);
  rendererJob.jobId = `${job.jobId}-renderer-v002`;
  rendererJob.attemptId = 'attempt-0001';
  rendererJob.instructionArtifactBinding = instructionBinding;
  rendererJob.lineEndProjectionBinding = lineEndProjectionBinding;
  rendererJob.cropAppliedBaseMedia = {
    baseMedia: clone(job.inputs.baseMedia.media),
    timeline: clone(job.inputs.baseMedia.timeline),
    generationManifest: clone(job.inputs.baseMedia.generationManifest),
    validationReceipt: clone(job.inputs.baseMedia.validationReceipt),
  };
  rendererJob.publication = {
    admissionReceiptPath: job.publication.admissionReceiptPath,
    lineLayoutPath: job.publication.lineLayoutPath,
    renderOutputRoot: job.publication.renderOutputRoot,
  };
  if (validatePresentationInstructionRendererJobV002(rendererJob).status !== 'passed') {
    fail('renderer jobが既存contractを通りません');
  }
  return {
    job,
    jobBytes,
    executionJobBinding,
    sourcePackage,
    selection,
    cueEndProjection,
    lineEndProjection,
    instruction,
    rendererJob,
    inputMeaning: meaning,
    inputTimeline: await readBoundJson(workspaceRoot, job.inputs.baseMedia.timeline, 'timeline'),
  };
}

export async function materializeDistantConnectionPresentationExecutionArtifactsV001(
  workspaceRoot: string,
  jobPath: string,
) {
  const built = await buildDistantConnectionPresentationExecutionArtifactsV001(workspaceRoot, jobPath);
  const entries: Array<[string, Uint8Array]> = [
    [built.job.publication.sourcePackagePath, formalBytes(built.sourcePackage)],
    [built.job.publication.selectionPath, formalBytes(built.selection)],
    [built.job.publication.cueEndProjectionPath,
      serializePresentationCueEndProjectionV001(built.cueEndProjection)],
    [built.job.publication.lineEndProjectionPath,
      serializePresentationSemanticLineEndProjectionV001(built.lineEndProjection)],
    [built.job.publication.instructionPath,
      serializePresentationInstructionArtifactV002(built.instruction)],
    [built.job.publication.rendererJobPath,
      serializePresentationInstructionRendererJobV002(built.rendererJob)],
  ];
  for (const [filePath, bytes] of entries) {
    await writeFile(path.join(workspaceRoot, filePath), bytes, {flag: 'wx'});
  }
  return {status: 'materialized', files: entries.map(([filePath, bytes]) => ({
    path: filePath,
    fileSha256: sha256(bytes),
  }))};
}

export function assertDistantConnectionPresentationExecutionResultV001(
  value: unknown,
): asserts value is DistantConnectionPresentationExecutionResultV001 {
  if (!isObject(value) || !exactKeys(value, RESULT_KEYS)
    || value.schemaVersion !== DISTANT_CONNECTION_PRESENTATION_EXECUTION_RESULT_SCHEMA_V001
    || typeof value.resultId !== 'string' || !FORMAL_ID.test(value.resultId)
    || value.status !== 'completed'
    || typeof value.sourceVideoId !== 'string' || !FORMAL_ID.test(value.sourceVideoId)
    || typeof value.candidateId !== 'string' || !FORMAL_ID.test(value.candidateId)
    || value.responsibilityPrinciple !== RESULT_RESPONSIBILITY) fail('result rootが不正です');
  assertFormalBinding(value.executionJobBinding, 'result execution job');
  if (!isObject(value.subtitleDecision) || !exactKeys(value.subtitleDecision, [
    'approvedSelectionSource', 'adaptedSelection', 'cueEndProjection', 'lineEndProjection',
  ])) fail('result subtitleDecisionが不正です');
  Object.entries(value.subtitleDecision).forEach(([key, binding]) =>
    assertFormalBinding(binding, `subtitleDecision.${key}`));
  if (!isObject(value.renderInput) || !exactKeys(value.renderInput, [
    'sourcePackage', 'instruction', 'rendererJob',
  ])) fail('result renderInputが不正です');
  Object.entries(value.renderInput).forEach(([key, binding]) =>
    assertFormalBinding(binding, `renderInput.${key}`));
  if (!isObject(value.execution) || !exactKeys(value.execution, [
    'rendererExecutionResult', 'admissionReceipt', 'lineLayout', 'outputVideo', 'qcStatus',
  ]) || value.execution.qcStatus !== 'passed') fail('result executionが不正です');
  assertFormalBinding(value.execution.rendererExecutionResult, 'renderer execution result');
  assertFormalBinding(value.execution.admissionReceipt, 'admission receipt');
  assertFormalBinding(value.execution.lineLayout, 'line layout');
  assertByteBinding(value.execution.outputVideo, 'output video');
}

export function serializeDistantConnectionPresentationExecutionResultV001(
  value: DistantConnectionPresentationExecutionResultV001,
) {
  assertDistantConnectionPresentationExecutionResultV001(value);
  return formalBytes(value);
}

export async function executeDistantConnectionPresentationExecutionV001(
  workspaceRoot: string,
  jobPath: string,
) {
  const job = decodeDistantConnectionPresentationExecutionJobV001(
    await readFile(path.join(workspaceRoot, jobPath)),
  );
  const run = await runPresentationInstructionRendererJobFileV002(
    job.publication.rendererJobPath,
    {workspaceRoot},
  );
  const rendererJobBytes = await readFile(path.join(workspaceRoot, job.publication.rendererJobPath));
  const rendererJobValue = parseJson(rendererJobBytes, 'renderer job');
  const rendererExecutionRecord = {
    schemaVersion: 'distant-connection-presentation-renderer-execution-record-v001',
    executionJobBinding: formalBinding(jobPath, job),
    rendererJobBinding: formalBinding(job.publication.rendererJobPath, rendererJobValue),
    exitCode: run.exitCode,
    status: run.exitCode === 0 && run.result?.status === 'completed'
      ? 'completed'
      : 'failed',
    rendererResult: run.result,
  };
  const rendererExecutionBytes = formalBytes(rendererExecutionRecord);
  await writeFile(
    path.join(workspaceRoot, job.publication.rendererExecutionResultPath),
    rendererExecutionBytes,
    {flag: 'wx'},
  );
  if (run.exitCode !== 0 || run.result?.status !== 'completed'
    || run.result?.qc?.status !== 'passed') return run;
  const bindJson = async (filePath: string) => {
    const bytes = await readFile(path.join(workspaceRoot, filePath));
    return formalBinding(filePath, parseJson(bytes, filePath));
  };
  const outputVideoPath = `${job.publication.renderOutputRoot}/presentation-rendered-v002.mp4`;
  const outputVideoBytes = await readFile(path.join(workspaceRoot, outputVideoPath));
  const result: DistantConnectionPresentationExecutionResultV001 = {
    schemaVersion: DISTANT_CONNECTION_PRESENTATION_EXECUTION_RESULT_SCHEMA_V001,
    resultId: `${job.jobId}-result-v001`,
    status: 'completed',
    sourceVideoId: job.sourceVideoId,
    candidateId: job.candidateId,
    executionJobBinding: formalBinding(jobPath, job),
    subtitleDecision: {
      approvedSelectionSource: clone(job.inputs.approvedSelection.selection),
      adaptedSelection: await bindJson(job.publication.selectionPath),
      cueEndProjection: await bindJson(job.publication.cueEndProjectionPath),
      lineEndProjection: await bindJson(job.publication.lineEndProjectionPath),
    },
    renderInput: {
      sourcePackage: await bindJson(job.publication.sourcePackagePath),
      instruction: await bindJson(job.publication.instructionPath),
      rendererJob: await bindJson(job.publication.rendererJobPath),
    },
    execution: {
      rendererExecutionResult: formalBinding(
        job.publication.rendererExecutionResultPath,
        rendererExecutionRecord,
      ),
      admissionReceipt: await bindJson(job.publication.admissionReceiptPath),
      lineLayout: await bindJson(job.publication.lineLayoutPath),
      outputVideo: byteBinding(outputVideoPath, outputVideoBytes),
      qcStatus: 'passed',
    },
    responsibilityPrinciple: RESULT_RESPONSIBILITY,
  };
  assertDistantConnectionPresentationExecutionResultV001(result);
  await writeFile(
    path.join(workspaceRoot, job.publication.executionResultPath),
    serializeDistantConnectionPresentationExecutionResultV001(result),
    {flag: 'wx'},
  );
  return {exitCode: 0, result, rendererResult: run.result};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const action = process.argv[2];
  const workspaceRoot = process.cwd();
  const jobPath = process.argv[3] ?? '';
  const task = action === 'materialize'
    ? materializeDistantConnectionPresentationExecutionArtifactsV001(workspaceRoot, jobPath)
    : action === 'execute'
      ? executeDistantConnectionPresentationExecutionV001(workspaceRoot, jobPath)
      : Promise.reject(new Error('action must be materialize or execute'));
  void task.then(value => process.stdout.write(`${JSON.stringify(value)}\n`)).catch(error => {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exitCode = 1;
  });
}
