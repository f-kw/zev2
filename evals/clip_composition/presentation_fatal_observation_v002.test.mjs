import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, mkdtemp, readFile, realpath, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {
  PRESENTATION_FATAL_ALLOWED_STAGES_BY_INNER_CODE_V002,
  PRESENTATION_FATAL_INNER_CODES_V002,
  PRESENTATION_FATAL_INNER_STAGES_V002,
  PRESENTATION_FATAL_OBSERVATION_SCHEMA_VERSION_V002,
  PRESENTATION_FATAL_TARGET_BOUNDARY_IDS_V002,
  PRESENTATION_FATAL_TARGET_SOURCE_FIELDS_BY_BOUNDARY_V002,
  buildPresentationFatalObservationV002,
  classifyPresentationFatalInnerCodeV002,
  selectPresentationFatalTargetFileV002,
  serializePresentationFatalObservationV002,
  validatePresentationFatalObservationV002,
} from './presentation_fatal_observation_v002.mjs';
import {
  runPresentationCaptionSemanticOutputCheckV002,
} from './run_presentation_caption_semantic_output_check_v002.mjs';
import {
  inspectPresentationMeaningBoundarySelectionInputsBeforePublicationV001,
} from './presentation_meaning_boundary_selection_v001.mjs';
import {
  publishPresentationTimelineCompositionDecisionV001,
} from './presentation_timeline_composition_decision_v001.mjs';
import {
  publishPresentationMeaningInformationFailureReportFileV002,
  publishPresentationMeaningInformationFailureV002,
} from './run_presentation_meaning_information_package_job_v001.mjs';
import {
  inspectPresentationOutputRendererCoreBootstrapV002,
  inspectPresentationOutputRendererCoreExportsV001,
  inspectPresentationOutputRequestFatalObservationV002,
  observePresentationOutputRawRequestBindingV001,
} from './run_presentation_output_job_v001.ts';
import {
  runPresentationRendererChildProcessV001,
} from './render_presentation_v002.mjs';
import * as presentationRendererCoreV002 from './render_presentation_v002.mjs';

const FILE_SHA_1 = '1'.repeat(64);
const FILE_SHA_2 = '2'.repeat(64);
const TARGET_PATH = 'evals/clip_composition/outputs/presentation/input.json';
const SOURCE_FIELD = 'job.requestBinding';
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

const withTemporaryWorkspace = async (callback) => {
  const logicalRoot = await mkdtemp(join(tmpdir(), 'presentation-fatal-v002-'));
  const workspaceRoot = await realpath(logicalRoot);
  try {
    return await callback(workspaceRoot);
  } finally {
    await rm(logicalRoot, {recursive: true, force: true});
  }
};

const makeMeaningFailurePublicationInput = ({workspaceRoot, pathJobId}) => {
  const jobBytes = Buffer.from('{"fixture":"fatal-observation"}\n', 'utf8');
  return {
    workspaceRoot,
    pathJobId,
    jobPath: `evals/clip_composition/outputs/presentation/meaning-information-jobs/${pathJobId}.json`,
    jobBytes,
    jobValue: null,
    status: 'fatal',
    stage: 'input-read',
    fatalObservation: buildPresentationFatalObservationV002({
      innerStage: 'unknown',
      targetFile: null,
      innerCode: 'UNCLASSIFIED',
    }),
    violations: [],
    executedAt: '2026-08-07T00:00:00Z',
  };
};

const makeTargetSelectionInput = (overrides = {}) => ({
  boundaryId: 'output-runner',
  sourceField: SOURCE_FIELD,
  path: TARGET_PATH,
  fileSha256: FILE_SHA_1,
  verifiedTargetSources: [{
    sourceField: SOURCE_FIELD,
    path: TARGET_PATH,
    fileSha256: FILE_SHA_1,
  }],
  sourceRecordVerified: true,
  ...overrides,
});

const selectTarget = (overrides = {}) => (
  selectPresentationFatalTargetFileV002(makeTargetSelectionInput(overrides))
);

const makeObservation = (overrides = {}) => ({
  schemaVersion: PRESENTATION_FATAL_OBSERVATION_SCHEMA_VERSION_V002,
  innerStage: 'input-read',
  targetFile: null,
  innerCode: 'BINDING_REFERENCE_MISMATCH',
  ...overrides,
});

const EXPECTED_STAGES = [
  'runner-bootstrap',
  'job-read',
  'source-media-read',
  'input-read',
  'semantic-rebuild',
  'formal-serialization',
  'crop-frame-inspection',
  'layout-preflight',
  'overlay-render',
  'post-render-qc',
  'publication',
  'failure-report-publication',
  'unknown',
];

const EXPECTED_CODES = [
  'ERR_FS_FILE_TOO_LARGE',
  'FILE_CHANGED_DURING_READ',
  'NUMERIC_TOKEN_INVALID',
  'FORMAL_JSON_VALUE_INVALID',
  'BINDING_REFERENCE_MISMATCH',
  'REQUIRED_EXPORT_MISSING',
  'OS_PERMISSION_DENIED',
  'CHILD_PROCESS_SPAWN_FAILED',
  'CHILD_PROCESS_EXIT_NONZERO',
  'CHILD_PROCESS_SIGNALLED',
  'PUBLICATION_FAILED',
  'REPORT_TARGET_INVALID',
  'REPORT_PUBLICATION_FAILED',
  'UNCLASSIFIED',
];

const EXPECTED_ALLOWED_STAGES = {
  ERR_FS_FILE_TOO_LARGE: ['job-read', 'source-media-read', 'input-read'],
  FILE_CHANGED_DURING_READ: ['job-read', 'source-media-read', 'input-read'],
  NUMERIC_TOKEN_INVALID: ['input-read', 'semantic-rebuild', 'layout-preflight'],
  FORMAL_JSON_VALUE_INVALID: [
    'input-read',
    'semantic-rebuild',
    'formal-serialization',
    'crop-frame-inspection',
    'layout-preflight',
  ],
  BINDING_REFERENCE_MISMATCH: [
    'job-read',
    'source-media-read',
    'input-read',
    'semantic-rebuild',
    'layout-preflight',
  ],
  REQUIRED_EXPORT_MISSING: ['runner-bootstrap', 'crop-frame-inspection'],
  OS_PERMISSION_DENIED: [
    'runner-bootstrap',
    'job-read',
    'source-media-read',
    'input-read',
    'overlay-render',
    'publication',
  ],
  CHILD_PROCESS_SPAWN_FAILED: [
    'runner-bootstrap',
    'semantic-rebuild',
    'crop-frame-inspection',
    'layout-preflight',
    'overlay-render',
    'post-render-qc',
  ],
  CHILD_PROCESS_EXIT_NONZERO: [
    'runner-bootstrap',
    'semantic-rebuild',
    'crop-frame-inspection',
    'layout-preflight',
    'overlay-render',
    'post-render-qc',
  ],
  CHILD_PROCESS_SIGNALLED: [
    'runner-bootstrap',
    'semantic-rebuild',
    'crop-frame-inspection',
    'layout-preflight',
    'overlay-render',
    'post-render-qc',
  ],
  PUBLICATION_FAILED: ['publication'],
  REPORT_TARGET_INVALID: ['failure-report-publication'],
  REPORT_PUBLICATION_FAILED: ['failure-report-publication'],
  UNCLASSIFIED: ['unknown'],
};

const EXPECTED_TARGET_SOURCE_FIELDS_BY_BOUNDARY = {
  'timeline-composition': [
    'job',
    'job.implementationBindings[*]',
    'job.approvedContractBindings[*]',
    'job.sourceMedia[*].sourceIdentityBinding',
    'job.sourceMedia[*].mediaBinding',
    'job.sourceMedia[*].retainedSourceAtomsBinding.sourceAtoms',
    'job.sourceMedia[*].retainedSourceAtomsBinding.generationManifest',
    'job.sourceMedia[*].retainedSourceAtomsBinding.validationReport',
  ],
  'legacy-caption-b1': [
    'job',
    'job.implementationBinding.files[*]',
    'job.implementationBinding.dependencyFiles[*]',
    'job.sourcePackageBinding.manifest',
    'job.sourcePackageBinding.validationReport',
    'job.semanticOutputBinding',
  ],
  'meaning-boundary-selection': [
    'job',
    'job.implementationBindings[*]',
    'job.approvedContractBindings[*]',
    'job.sourcePackageBinding',
    'job.b6ManifestBinding',
    'job.providerEnvelopeBinding',
    'b6Manifest.b5ManifestBinding',
    'b6Manifest.b6JobBinding',
    'b6Manifest.rawResponseBinding',
    'b6Manifest.generateRequestBinding',
    'providerEnvelope.rawResponseBinding',
    'b5Manifest.generateRequestBinding',
  ],
  'meaning-information-package': [
    'job',
    'job.implementationBindings[*]',
    'job.approvedContractBindings[*]',
    'job.timelineCompositionDecisionBinding',
    'job.semanticSelectionValidationBinding',
    'job.semanticSelectionBinding',
    'timelineDecision.sourceMedia[*].sourceIdentityBinding',
    'timelineDecision.sourceMedia[*].mediaBinding',
    'timelineDecision.sourceMedia[*].retainedSourceAtomsBinding.sourceAtoms',
    'timelineDecision.sourceMedia[*].retainedSourceAtomsBinding.generationManifest',
    'timelineDecision.sourceMedia[*].retainedSourceAtomsBinding.validationReport',
  ],
  'output-runner': [
    'job',
    'job.requestBinding',
    'job.implementationBindings[*]',
    'job.approvedContractBindings[*]',
    'request.meaningInformationPackage',
    'request.baseMediaInput.baseMedia',
    'request.baseMediaInput.timeline',
    'request.baseMediaInput.generationManifest',
    'request.baseMediaInput.validationReceipt',
    'request.styleInput.presetBinding.trustedRegistryBindings[*]',
    'request.styleInput.presetBinding.presetRegistry',
    'request.styleInput.presetBinding.presetValidationIndex',
    'request.styleInput.presetBinding.materialValidationIndex',
    'request.styleInput.presetBinding.rendererTrust',
    'request.styleInput.cropPolicy.application',
  ],
};

const captureRendererChildFailure = async ({command, args, innerStage}) => {
  try {
    await runPresentationRendererChildProcessV001(command, args, {
      fatalInnerStage: innerStage,
    });
  } catch (error) {
    return error;
  }
  assert.fail('renderer child process must fail');
};

const assertClosedRendererChildFailure = (error, {innerStage, innerCode, rawMarkers = []}) => {
  assert.equal(error?.presentationFatalProcessEvidence?.innerStage, innerStage);
  assert.equal(error?.presentationFatalProcessEvidence?.innerCode, innerCode);
  assert.equal(Object.prototype.propertyIsEnumerable.call(
    error,
    'presentationFatalProcessEvidence',
  ), false);
  for (const forbiddenKey of ['processResult', 'stdout', 'stderr', 'cause']) {
    assert.equal(Object.hasOwn(error, forbiddenKey), false);
  }
  const retainedText = `${String(error)}\n${JSON.stringify(error)}`;
  for (const marker of rawMarkers) assert.equal(retainedText.includes(marker), false);
};

test('FOVC001 targetFile=nullのfatalObservationを構築する', () => {
  const observation = buildPresentationFatalObservationV002({
    innerStage: 'input-read',
    targetFile: null,
    innerCode: 'FORMAL_JSON_VALUE_INVALID',
  });
  assert.deepEqual(observation, makeObservation({
    innerCode: 'FORMAL_JSON_VALUE_INVALID',
  }));
  assert.equal(Object.isFrozen(observation), true);
});

test('FOVC002 検証済みbindingだけからtargetFile付きfatalObservationを構築する', () => {
  const targetFile = selectTarget();
  const observation = buildPresentationFatalObservationV002({
    innerStage: 'input-read',
    targetFile,
    innerCode: 'BINDING_REFERENCE_MISMATCH',
  });
  assert.deepEqual(observation.targetFile, {
    path: TARGET_PATH,
    fileSha256: FILE_SHA_1,
  });
  assert.equal(Object.isFrozen(observation.targetFile), true);
});

test('FOVC003 validatorはnullとfile targetの両shapeだけを受理する', () => {
  assert.equal(validatePresentationFatalObservationV002(makeObservation()), true);
  assert.equal(validatePresentationFatalObservationV002(makeObservation({
    targetFile: {path: TARGET_PATH, fileSha256: FILE_SHA_1},
  })), true);
  assert.equal(validatePresentationFatalObservationV002(makeObservation({targetFile: []})), false);
});

test('FOVC004 fatalObservationのkey順をexactに固定する', () => {
  const observation = buildPresentationFatalObservationV002({
    innerCode: 'FORMAL_JSON_VALUE_INVALID',
    targetFile: null,
    innerStage: 'input-read',
  });
  assert.deepEqual(Object.keys(observation), [
    'schemaVersion',
    'innerStage',
    'targetFile',
    'innerCode',
  ]);
  const reordered = {
    innerStage: observation.innerStage,
    schemaVersion: observation.schemaVersion,
    targetFile: observation.targetFile,
    innerCode: observation.innerCode,
  };
  assert.equal(validatePresentationFatalObservationV002(reordered), false);
});

test('FOVC005 targetFileのkey順をexactに固定する', () => {
  const targetFile = selectTarget();
  assert.deepEqual(Object.keys(targetFile), ['path', 'fileSha256']);
  assert.equal(validatePresentationFatalObservationV002(makeObservation({
    targetFile: {fileSha256: FILE_SHA_1, path: TARGET_PATH},
  })), false);
});

test('FOVC006 serializerは2-spaceと末尾LFを固定する', () => {
  const bytes = serializePresentationFatalObservationV002(makeObservation());
  assert.equal(bytes.toString('utf8'), `${JSON.stringify(makeObservation(), null, 2)}\n`);
  assert.equal(bytes.at(-1), 0x0a);
});

test('FOVC007 serializerは同一入力からbyte同一結果を返す', () => {
  const observation = makeObservation({
    targetFile: {path: TARGET_PATH, fileSha256: FILE_SHA_1},
  });
  assert.deepEqual(
    serializePresentationFatalObservationV002(observation),
    serializePresentationFatalObservationV002(observation),
  );
});

test('FOVC008 innerStageの13値をexact exportする', () => {
  assert.deepEqual(PRESENTATION_FATAL_INNER_STAGES_V002, EXPECTED_STAGES);
  assert.equal(Object.isFrozen(PRESENTATION_FATAL_INNER_STAGES_V002), true);
});

test('FOVC009 innerCodeの14値をexact exportし閉じたevidenceだけを分類する', () => {
  assert.deepEqual(PRESENTATION_FATAL_INNER_CODES_V002, EXPECTED_CODES);
  assert.equal(Object.isFrozen(PRESENTATION_FATAL_INNER_CODES_V002), true);
  const evidenceByCode = [
    [{kind: 'node-error', code: 'ERR_FS_FILE_TOO_LARGE'}, 'ERR_FS_FILE_TOO_LARGE'],
    [{kind: 'file-changed-during-read'}, 'FILE_CHANGED_DURING_READ'],
    [{kind: 'strict-json-decode', reason: 'number-invalid'}, 'NUMERIC_TOKEN_INVALID'],
    [{kind: 'formal-json-value-invalid'}, 'FORMAL_JSON_VALUE_INVALID'],
    [{kind: 'binding-reference-mismatch'}, 'BINDING_REFERENCE_MISMATCH'],
    [{kind: 'required-export-missing'}, 'REQUIRED_EXPORT_MISSING'],
    [{kind: 'node-error', code: 'EPERM'}, 'OS_PERMISSION_DENIED'],
    [{kind: 'child-process', event: 'spawn-failed'}, 'CHILD_PROCESS_SPAWN_FAILED'],
    [{kind: 'child-process', event: 'exit-nonzero'}, 'CHILD_PROCESS_EXIT_NONZERO'],
    [{kind: 'child-process', event: 'signalled'}, 'CHILD_PROCESS_SIGNALLED'],
    [{kind: 'publication-failed'}, 'PUBLICATION_FAILED'],
    [{kind: 'report-target-invalid'}, 'REPORT_TARGET_INVALID'],
    [{kind: 'report-publication-failed'}, 'REPORT_PUBLICATION_FAILED'],
    [{kind: 'unclassified'}, 'UNCLASSIFIED'],
  ];
  for (const [evidence, expectedCode] of evidenceByCode) {
    assert.equal(classifyPresentationFatalInnerCodeV002(evidence), expectedCode);
  }
});

test('FOVC010 stage/code所有matrixをexact exportする', () => {
  assert.deepEqual(PRESENTATION_FATAL_ALLOWED_STAGES_BY_INNER_CODE_V002, EXPECTED_ALLOWED_STAGES);
  assert.equal(Object.isFrozen(PRESENTATION_FATAL_ALLOWED_STAGES_BY_INNER_CODE_V002), true);
  for (const stages of Object.values(PRESENTATION_FATAL_ALLOWED_STAGES_BY_INNER_CODE_V002)) {
    assert.equal(Object.isFrozen(stages), true);
  }
});

test('FOVC011 未分類はunknown/null/UNCLASSIFIEDの三つ組だけを受理する', () => {
  const valid = {
    schemaVersion: PRESENTATION_FATAL_OBSERVATION_SCHEMA_VERSION_V002,
    innerStage: 'unknown',
    targetFile: null,
    innerCode: 'UNCLASSIFIED',
  };
  assert.equal(validatePresentationFatalObservationV002(valid), true);
  assert.equal(validatePresentationFatalObservationV002({...valid, targetFile: {
    path: TARGET_PATH,
    fileSha256: FILE_SHA_1,
  }}), false);
  assert.equal(validatePresentationFatalObservationV002({...valid, innerStage: 'input-read'}), false);
});

test('FOVC012 未登録のinnerStageを拒否する', () => {
  assert.equal(validatePresentationFatalObservationV002(makeObservation({
    innerStage: 'new-stage',
  })), false);
});

test('FOVC013 未登録のinnerCodeを拒否する', () => {
  assert.equal(validatePresentationFatalObservationV002(makeObservation({
    innerCode: 'NEW_CODE',
  })), false);
});

test('FOVC014 matrix外のstage/code組合せを拒否する', () => {
  assert.equal(validatePresentationFatalObservationV002(makeObservation({
    innerStage: 'publication',
    innerCode: 'NUMERIC_TOKEN_INVALID',
  })), false);
});

test('FOVC015 fatalObservationの余分なkeyを拒否する', () => {
  assert.equal(validatePresentationFatalObservationV002({
    ...makeObservation(),
    rawMessage: 'not retained',
  }), false);
});

test('FOVC016 targetFileの余分なkeyを拒否する', () => {
  assert.equal(validatePresentationFatalObservationV002(makeObservation({
    targetFile: {path: TARGET_PATH, fileSha256: FILE_SHA_1, role: 'input'},
  })), false);
});

test('FOVC017 targetFile.path欠落を拒否する', () => {
  assert.equal(validatePresentationFatalObservationV002(makeObservation({
    targetFile: {fileSha256: FILE_SHA_1},
  })), false);
});

test('FOVC018 targetFile.fileSha256欠落を拒否する', () => {
  assert.equal(validatePresentationFatalObservationV002(makeObservation({
    targetFile: {path: TARGET_PATH},
  })), false);
});

test('FOVC019 targetFileの絶対pathを拒否する', () => {
  assert.equal(validatePresentationFatalObservationV002(makeObservation({
    targetFile: {path: '/private/tmp/input.json', fileSha256: FILE_SHA_1},
  })), false);
});

test('FOVC020 targetFileのworkspace外escapeを拒否する', () => {
  for (const unsafePath of ['../input.json', 'a/../../input.json', 'a//input.json', 'a\\input.json']) {
    assert.equal(validatePresentationFatalObservationV002(makeObservation({
      targetFile: {path: unsafePath, fileSha256: FILE_SHA_1},
    })), false);
  }
});

test('FOVC021 targetFileの不正SHAを拒否する', () => {
  for (const invalidSha of ['A'.repeat(64), 'a'.repeat(63), 'g'.repeat(64)]) {
    assert.equal(validatePresentationFatalObservationV002(makeObservation({
      targetFile: {path: TARGET_PATH, fileSha256: invalidSha},
    })), false);
  }
});

test('FOVC022 5境界の固定source field表をexact exportし呼出側の自己許可を拒否する', () => {
  assert.deepEqual(PRESENTATION_FATAL_TARGET_BOUNDARY_IDS_V002, [
    'timeline-composition',
    'legacy-caption-b1',
    'meaning-boundary-selection',
    'meaning-information-package',
    'output-runner',
  ]);
  assert.deepEqual(
    PRESENTATION_FATAL_TARGET_SOURCE_FIELDS_BY_BOUNDARY_V002,
    EXPECTED_TARGET_SOURCE_FIELDS_BY_BOUNDARY,
  );
  assert.equal(Object.isFrozen(PRESENTATION_FATAL_TARGET_BOUNDARY_IDS_V002), true);
  assert.equal(Object.isFrozen(PRESENTATION_FATAL_TARGET_SOURCE_FIELDS_BY_BOUNDARY_V002), true);
  for (const sourceFields of Object.values(
    PRESENTATION_FATAL_TARGET_SOURCE_FIELDS_BY_BOUNDARY_V002,
  )) {
    assert.equal(Object.isFrozen(sourceFields), true);
  }
  assert.equal(selectTarget({
    sourceField: 'tracked-input',
    verifiedTargetSources: [{
      sourceField: 'tracked-input',
      path: TARGET_PATH,
      fileSha256: FILE_SHA_1,
    }],
    allowedSourceFields: ['tracked-input'],
  }), null);
});

test('FOVC023 bindingとpathが一致しない場合はtargetFileをnullにする', () => {
  assert.equal(selectTarget({
    path: 'evals/clip_composition/outputs/presentation/other.json',
  }), null);
});

test('FOVC024 bindingとSHAが一致しない場合はtargetFileをnullにする', () => {
  assert.equal(selectTarget({fileSha256: FILE_SHA_2}), null);
});

test('FOVC025 binding一致が複数ある場合はtargetFileをnullにする', () => {
  const binding = {
    sourceField: SOURCE_FIELD,
    path: TARGET_PATH,
    fileSha256: FILE_SHA_1,
  };
  assert.equal(selectTarget({verifiedTargetSources: [binding, {...binding}]}), null);
});

test('FOVC026 binding sourceが読めない場合はtargetFileをnullにする', () => {
  assert.equal(selectTarget({sourceRecordVerified: false}), null);
});

test('FOVC027 生message・stack・stderr・字幕・secretを観測値へ混入できない', () => {
  const rawKeys = ['message', 'stack', 'stderr', 'captionText', 'apiKey'];
  for (const key of rawKeys) {
    assert.equal(validatePresentationFatalObservationV002({
      ...makeObservation(),
      [key]: 'raw-value',
    }), false);
  }
  assert.throws(() => buildPresentationFatalObservationV002({
    innerStage: 'input-read',
    targetFile: null,
    innerCode: 'FORMAL_JSON_VALUE_INVALID',
    message: 'raw-value',
  }), TypeError);
  assert.equal(classifyPresentationFatalInnerCodeV002({
    kind: 'node-error',
    code: 'EPERM',
    message: 'raw-value',
  }), 'UNCLASSIFIED');
});

// FOVOは共通classifierを直接呼ぶだけでは「production枝での実発火」を証明しない。
// 所有boundaryが公開する正式な注入口へ置換してから完了扱いにする。
test('FOVO001 productionの大容量file読取枝がERR_FS_FILE_TOO_LARGEを発火する', async () => {
  const error = Object.assign(new Error('not retained'), {code: 'ERR_FS_FILE_TOO_LARGE'});
  const result = await runPresentationCaptionSemanticOutputCheckV002(
    'evals/clip_composition/outputs/presentation/caption-semantic-output-check-jobs/fovo001.json',
    {readFile: async () => { throw error; }},
  );
  assert.equal(result.exitCode, 2);
  assert.deepEqual(result.value.fatalObservation, {
    schemaVersion: PRESENTATION_FATAL_OBSERVATION_SCHEMA_VERSION_V002,
    innerStage: 'job-read',
    targetFile: null,
    innerCode: 'ERR_FS_FILE_TOO_LARGE',
  });
});

test('FOVO002 productionの読取中実体変化枝がFILE_CHANGED_DURING_READを発火する', async () => {
  await withTemporaryWorkspace(async (workspaceRoot) => {
    const jobPath = 'job.json';
    const initialBytes = Buffer.from('{"state":"initial"}\n', 'utf8');
    await writeFile(join(workspaceRoot, jobPath), Buffer.from('{"state":"changed"}\n', 'utf8'));
    const result = await inspectPresentationMeaningBoundarySelectionInputsBeforePublicationV001({
      workspaceRoot,
      jobPath,
      jobBytes: initialBytes,
      jobBindings: [],
      inputObservations: [],
      graphSnapshots: [],
    });
    assert.equal(result.status, 'fatal');
    assert.deepEqual(result.fatalObservation, {
      schemaVersion: PRESENTATION_FATAL_OBSERVATION_SCHEMA_VERSION_V002,
      innerStage: 'input-read',
      targetFile: null,
      innerCode: 'FILE_CHANGED_DURING_READ',
    });
  });
  await withTemporaryWorkspace(async (workspaceRoot) => {
    const jobPath = 'job.json';
    const verifiedJobBytes = await readFile(new URL(
      './outputs/presentation/meaning-boundary-validation-jobs/'
        + 'qdczJpv8RCc-candidate-59-meaning-output-first-run-b1-v002.json',
      import.meta.url,
    ));
    await writeFile(join(workspaceRoot, jobPath), Buffer.from('{}\n', 'utf8'));
    const result = await inspectPresentationMeaningBoundarySelectionInputsBeforePublicationV001({
      workspaceRoot,
      jobPath,
      jobBytes: verifiedJobBytes,
      jobBindings: [],
      inputObservations: [],
      graphSnapshots: [],
    });
    assert.equal(result.status, 'fatal');
    assert.deepEqual(result.fatalObservation, {
      schemaVersion: PRESENTATION_FATAL_OBSERVATION_SCHEMA_VERSION_V002,
      innerStage: 'input-read',
      targetFile: null,
      innerCode: 'FILE_CHANGED_DURING_READ',
    });
  });
});

test('FOVO003 productionのstrict JSON数値token枝がNUMERIC_TOKEN_INVALIDを発火する', async () => {
  await withTemporaryWorkspace(async (workspaceRoot) => {
    const path = 'numeric-token.json';
    const bytes = Buffer.from('{"value":1e0}\n', 'utf8');
    await writeFile(join(workspaceRoot, path), bytes);
    const observed = await observePresentationOutputRawRequestBindingV001(
      workspaceRoot,
      {path, fileSha256: sha256(bytes), canonicalSha256: FILE_SHA_1},
      [],
    );
    const fatalObservation = inspectPresentationOutputRequestFatalObservationV002({
      job: {},
      requestObservation: observed,
    });
    assert.equal(observed.status, 'invalid');
    assert.equal(observed.reason, 'number-invalid');
    assert.deepEqual(fatalObservation, {
      schemaVersion: PRESENTATION_FATAL_OBSERVATION_SCHEMA_VERSION_V002,
      innerStage: 'input-read',
      targetFile: null,
      innerCode: 'NUMERIC_TOKEN_INVALID',
    });
  });
});

test('FOVO004 productionの正式JSON値不正枝がFORMAL_JSON_VALUE_INVALIDを発火する', async () => {
  await withTemporaryWorkspace(async (workspaceRoot) => {
    const path = 'formal-json-invalid.json';
    const bytes = Buffer.from('{"value":}\n', 'utf8');
    await writeFile(join(workspaceRoot, path), bytes);
    const observed = await observePresentationOutputRawRequestBindingV001(
      workspaceRoot,
      {path, fileSha256: sha256(bytes), canonicalSha256: FILE_SHA_1},
      [],
    );
    const fatalObservation = inspectPresentationOutputRequestFatalObservationV002({
      job: {},
      requestObservation: observed,
    });
    assert.equal(observed.status, 'invalid');
    assert.notEqual(observed.reason, 'number-invalid');
    assert.deepEqual(fatalObservation, {
      schemaVersion: PRESENTATION_FATAL_OBSERVATION_SCHEMA_VERSION_V002,
      innerStage: 'input-read',
      targetFile: null,
      innerCode: 'FORMAL_JSON_VALUE_INVALID',
    });
  });
  await withTemporaryWorkspace(async (workspaceRoot) => {
    const result = await publishPresentationMeaningInformationFailureV002({
      ...makeMeaningFailurePublicationInput({workspaceRoot, pathJobId: 'fovo004'}),
      status: 'invalid-status',
    });
    assert.equal(result.exitCode, 2);
    assert.deepEqual(JSON.parse(result.bytes.toString('utf8')).fatalObservation, {
      schemaVersion: PRESENTATION_FATAL_OBSERVATION_SCHEMA_VERSION_V002,
      innerStage: 'formal-serialization',
      targetFile: null,
      innerCode: 'FORMAL_JSON_VALUE_INVALID',
    });
  });
});

test('FOVO005 productionのbinding参照不一致枝がBINDING_REFERENCE_MISMATCHを発火する', async () => {
  await withTemporaryWorkspace(async (workspaceRoot) => {
    const path = 'binding-mismatch.json';
    const bytes = Buffer.from('{}\n', 'utf8');
    await writeFile(join(workspaceRoot, path), bytes);
    const observed = await observePresentationOutputRawRequestBindingV001(
      workspaceRoot,
      {path, fileSha256: FILE_SHA_2, canonicalSha256: FILE_SHA_1},
      [],
    );
    const fatalObservation = inspectPresentationOutputRequestFatalObservationV002({
      job: {},
      requestObservation: observed,
    });
    assert.equal(observed.status, 'binding-mismatch');
    assert.deepEqual(fatalObservation, {
      schemaVersion: PRESENTATION_FATAL_OBSERVATION_SCHEMA_VERSION_V002,
      innerStage: 'input-read',
      targetFile: null,
      innerCode: 'BINDING_REFERENCE_MISMATCH',
    });
  });
});

test('FOVO006 productionの実読取export guardがREQUIRED_EXPORT_MISSINGを発火する', async () => {
  await withTemporaryWorkspace(async (workspaceRoot) => {
    const commonRendererPath = 'evals/clip_composition/render_presentation_v002.mjs';
    const commonRendererBytes = await readFile(
      new URL('./render_presentation_v002.mjs', import.meta.url),
    );
    const commonRendererBinding = {
      path: commonRendererPath,
      fileSha256: sha256(commonRendererBytes),
      role: 'common-renderer',
    };
    await mkdir(join(workspaceRoot, 'evals/clip_composition'), {recursive: true});
    await writeFile(join(workspaceRoot, commonRendererPath), commonRendererBytes);
    const job = {implementationBindings: [commonRendererBinding]};
    assert.deepEqual(
      await inspectPresentationOutputRendererCoreBootstrapV002({
        workspaceRoot,
        moduleNamespace: presentationRendererCoreV002,
        job,
      }),
      {status: 'passed'},
    );
    const missingRequiredExport = {
      ...presentationRendererCoreV002,
      inspectFrameCountWithToolV001: undefined,
    };
    const result = await inspectPresentationOutputRendererCoreBootstrapV002({
      workspaceRoot,
      moduleNamespace: missingRequiredExport,
      job,
    });
    assert.equal(result.status, 'fatal');
    assert.equal(result.exitCode, 2);
    assert.equal(result.stderr.diagnosticCode, 'OUTPUT_RENDER_CORE_PROCESS_FAILED');
    assert.deepEqual(result.stderr.fatalObservation, {
      schemaVersion: PRESENTATION_FATAL_OBSERVATION_SCHEMA_VERSION_V002,
      innerStage: 'runner-bootstrap',
      targetFile: null,
      innerCode: 'REQUIRED_EXPORT_MISSING',
    });
    const forged = await inspectPresentationOutputRendererCoreBootstrapV002({
      workspaceRoot,
      moduleNamespace: missingRequiredExport,
      job: {
        implementationBindings: [{...commonRendererBinding, fileSha256: FILE_SHA_1}],
      },
    });
    assert.equal(forged.status, 'fatal');
    assert.equal(forged.stderr.fatalObservation.targetFile, null);
    assert.deepEqual(
      inspectPresentationOutputRendererCoreExportsV001(missingRequiredExport),
      {status: 'failed'},
    );
  });
});
test('FOVO007 productionのOS権限拒否枝がOS_PERMISSION_DENIEDを発火する', async () => {
  const error = Object.assign(new Error('not retained'), {code: 'EACCES'});
  const result = await runPresentationCaptionSemanticOutputCheckV002(
    'evals/clip_composition/outputs/presentation/caption-semantic-output-check-jobs/fovo007.json',
    {readFile: async () => { throw error; }},
  );
  assert.equal(result.exitCode, 2);
  assert.deepEqual(result.value.fatalObservation, {
    schemaVersion: PRESENTATION_FATAL_OBSERVATION_SCHEMA_VERSION_V002,
    innerStage: 'job-read',
    targetFile: null,
    innerCode: 'OS_PERMISSION_DENIED',
  });
});

test('FOVO008 productionの子process起動失敗枝がCHILD_PROCESS_SPAWN_FAILEDを発火する', async () => {
  const marker = `FOVO008_RAW_${process.pid}`;
  const error = await captureRendererChildFailure({
    command: `/fovo-command-does-not-exist-${process.pid}-${marker}`,
    args: [],
    innerStage: 'overlay-render',
  });
  assertClosedRendererChildFailure(error, {
    innerStage: 'overlay-render',
    innerCode: 'CHILD_PROCESS_SPAWN_FAILED',
    rawMarkers: [marker],
  });
});

test('FOVO009 productionの子process非0終了枝がCHILD_PROCESS_EXIT_NONZEROを発火する', async () => {
  const stdoutMarker = `FOVO009_STDOUT_${process.pid}`;
  const stderrMarker = `FOVO009_STDERR_${process.pid}`;
  const error = await captureRendererChildFailure({
    command: process.execPath,
    args: ['-e', `process.stdout.write('${stdoutMarker}');`
      + `process.stderr.write('${stderrMarker}');process.exit(1);`],
    innerStage: 'overlay-render',
  });
  assertClosedRendererChildFailure(error, {
    innerStage: 'overlay-render',
    innerCode: 'CHILD_PROCESS_EXIT_NONZERO',
    rawMarkers: [stdoutMarker, stderrMarker],
  });
});

test('FOVO010 productionの子process signal終了枝がCHILD_PROCESS_SIGNALLEDを発火する', async () => {
  const stdoutMarker = `FOVO010_STDOUT_${process.pid}`;
  const stderrMarker = `FOVO010_STDERR_${process.pid}`;
  const error = await captureRendererChildFailure({
    command: process.execPath,
    args: ['-e', `process.stdout.write('${stdoutMarker}');`
      + `process.stderr.write('${stderrMarker}');`
      + "setImmediate(() => process.kill(process.pid, 'SIGTERM'));"],
    innerStage: 'overlay-render',
  });
  assertClosedRendererChildFailure(error, {
    innerStage: 'overlay-render',
    innerCode: 'CHILD_PROCESS_SIGNALLED',
    rawMarkers: [stdoutMarker, stderrMarker],
  });
});

test('FOVO011 productionの成果物公開失敗枝がPUBLICATION_FAILEDを発火する', async () => {
  await withTemporaryWorkspace(async (workspaceRoot) => {
    const relativeOutputRoot = 'outputs/timeline-decision';
    await mkdir(join(workspaceRoot, `${relativeOutputRoot}.staging`), {recursive: true});
    const result = await publishPresentationTimelineCompositionDecisionV001({
      workspaceRoot,
      relativeOutputRoot,
      fileName: 'timeline-decision.json',
      bytes: Buffer.from('{}\n', 'utf8'),
    });
    assert.equal(result.status, 'fatal');
    assert.deepEqual(result.fatalObservation, {
      schemaVersion: PRESENTATION_FATAL_OBSERVATION_SCHEMA_VERSION_V002,
      innerStage: 'publication',
      targetFile: null,
      innerCode: 'PUBLICATION_FAILED',
    });
  });
});

test('FOVO012 productionのfailure report保存先拒否枝がREPORT_TARGET_INVALIDを発火する', async () => {
  await withTemporaryWorkspace(async (workspaceRoot) => {
    const input = makeMeaningFailurePublicationInput({workspaceRoot, pathJobId: 'fovo012'});
    const first = await publishPresentationMeaningInformationFailureV002(input);
    assert.notEqual(first.failureReport, null);
    const second = await publishPresentationMeaningInformationFailureV002(input);
    assert.equal(second.status, 'fatal');
    assert.equal(second.exitCode, 2);
    assert.equal(second.failureReport, null);
    assert.deepEqual(JSON.parse(second.bytes.toString('utf8')).fatalObservation, {
      schemaVersion: PRESENTATION_FATAL_OBSERVATION_SCHEMA_VERSION_V002,
      innerStage: 'failure-report-publication',
      targetFile: null,
      innerCode: 'REPORT_TARGET_INVALID',
    });
  });
});

test('FOVO013 productionのfailure report公開失敗枝がREPORT_PUBLICATION_FAILEDを発火する', async () => {
  await withTemporaryWorkspace(async (workspaceRoot) => {
    const writeFailure = await publishPresentationMeaningInformationFailureReportFileV002({
      workspaceRoot,
      directoryPath: 'outputs/fovo013',
      fileName: 'missing/failure-report.json',
      bytes: Buffer.from('{}\n', 'utf8'),
    });
    assert.equal(writeFailure.status, 'fatal');
    assert.deepEqual(writeFailure.fatalObservation, {
      schemaVersion: PRESENTATION_FATAL_OBSERVATION_SCHEMA_VERSION_V002,
      innerStage: 'failure-report-publication',
      targetFile: null,
      innerCode: 'REPORT_PUBLICATION_FAILED',
    });
    await writeFile(join(workspaceRoot, 'outputs', 'fovo013-claim-parent'), 'not-a-directory');
    const claimFailure = await publishPresentationMeaningInformationFailureReportFileV002({
      workspaceRoot,
      directoryPath: 'outputs/fovo013-claim-parent/child',
      fileName: 'failure-report.json',
      bytes: Buffer.from('{}\n', 'utf8'),
    });
    assert.equal(claimFailure.status, 'fatal');
    assert.deepEqual(claimFailure.fatalObservation, {
      schemaVersion: PRESENTATION_FATAL_OBSERVATION_SCHEMA_VERSION_V002,
      innerStage: 'failure-report-publication',
      targetFile: null,
      innerCode: 'REPORT_TARGET_INVALID',
    });
  });
});
test('FOVO014 productionの未分類fallback枝がunknown/null/UNCLASSIFIEDを発火する', async () => {
  const result = await runPresentationCaptionSemanticOutputCheckV002(
    'evals/clip_composition/outputs/presentation/caption-semantic-output-check-jobs/fovo014.json',
    {readFile: async () => { throw new Error('not retained'); }},
  );
  assert.equal(result.exitCode, 2);
  assert.deepEqual(result.value.fatalObservation, {
    schemaVersion: PRESENTATION_FATAL_OBSERVATION_SCHEMA_VERSION_V002,
    innerStage: 'unknown',
    targetFile: null,
    innerCode: 'UNCLASSIFIED',
  });
});
