import assert from 'node:assert/strict';
import {mkdir, mkdtemp, readFile, rm, symlink, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildPresentationBaseMediaAudioV001,
  buildPresentationBaseMediaVideoV001,
  inspectPresentationBaseMediaOutputV001,
  inspectPresentationBaseMediaSourceV001,
  inspectPresentationBaseMediaToolBinaryDiagnosticsV001,
  muxPresentationBaseMediaV001,
  validatePresentationBaseMediaSegmentPlanV001,
} from './presentation_base_media_build_v001.mjs';
import {
  executeValidatedPresentationDrawAndQcV001,
} from './render_presentation_v002.mjs';
import {
  inspectRenderedMediaWithToolsV001,
} from './presentation_renderer_qc_v002.mjs';
import {
  hashAbsoluteStableStreaming,
} from './presentation_timeline_composition_decision_v001.mjs';

import {
  PRESENTATION_A_V002_LAYER1_V3_HUMAN_APPROVAL_SCHEMA_V001,
  PRESENTATION_A_V002_LAYER1_V3_LEGACY_HUMAN_RESULT_SCHEMA_V001,
  PRESENTATION_A_V002_LAYER1_V3_PROOF_INPUT_SCHEMA_V001,
  PRESENTATION_A_V002_LAYER1_V3_PROPOSAL_SCHEMA_V001,
  buildPresentationAV002Layer1V3FixturesV001,
  canonicalSha256PresentationAV002Layer1V3JsonV001,
  sha256PresentationAV002Layer1V3BytesV001,
} from './presentation_a_v002_layer1_v3_fixture_v001.mjs';
import {
  serializePresentationAFormalJsonV002,
} from './presentation_a_source_sequence_v002.mjs';
import {
  PRESENTATION_A_V002_LAYER1_V3_PROOF_JOB_SCHEMA_V001,
  PRESENTATION_A_V002_LAYER1_V3_PROOF_IMPLEMENTATION_ROLES_V001,
  PRESENTATION_A_V002_LAYER1_V3_PROOF_OBSERVATION_SCHEMA_V002,
  PRESENTATION_A_V002_LAYER1_V3_PROOF_OUTPUT_ROOT_V001,
  PRESENTATION_A_V002_PLANNER_RESOURCE_CHECKPOINT_SCHEMA_V001,
  createPresentationAV002Layer1V3PlannerResourceObserverV001,
  createPresentationAV002Layer1V3ProofDefaultDependenciesV001,
  executePresentationAV002Layer1V3ProofJobV001,
  hashPresentationAV002ResolvedStableFileV001,
  loadPresentationAV002Layer1V3ProofExistingCoreExportsV001,
  rereadPresentationAV002Layer1V3ProofArtifactsV001,
  runPresentationAV002Layer1V3ProofCliV001,
  validatePresentationAV002Layer1V3ProofJobV001,
  validatePresentationAV002Layer1V3ProofObservationV002,
} from './run_presentation_a_v002_layer1_v3_proof_job_v001.ts';

const SHA_A = 'a'.repeat(64);
const SHA_B = 'b'.repeat(64);
const SHA_C = 'c'.repeat(64);
const SHA_D = 'd'.repeat(64);

const jsonBinding = (schemaVersion, suffix, sha = SHA_A) => ({
  schemaVersion,
  path: `evals/clip_composition/outputs/presentation/a-v002/test/${suffix}.json`,
  fileSha256: sha,
  canonicalSha256: sha,
});

const job = () => ({
  schemaVersion: PRESENTATION_A_V002_LAYER1_V3_PROOF_JOB_SCHEMA_V001,
  jobId: 'a-v002-layer1-v3-proof-test-v001',
  createdAt: '2026-08-09T00:00:00Z',
  sourceMedia: {
    path: 'evals/clip_composition/source/qdczJpv8RCc/source.mp4',
    fileSha256: SHA_A,
  },
  inputBindings: {
    legacyPackage: jsonBinding(PRESENTATION_A_V002_LAYER1_V3_PROPOSAL_SCHEMA_V001, 'proposal'),
    humanResult: jsonBinding(
      PRESENTATION_A_V002_LAYER1_V3_LEGACY_HUMAN_RESULT_SCHEMA_V001,
      'human-result',
      SHA_B,
    ),
    sourceIdentity: jsonBinding('presentation-material-source-identity-v001', 'identity', SHA_C),
    sourceTranscriptByte: {
      path: 'evals/clip_composition/fixtures/test/transcript.json',
      fileSha256: SHA_D,
    },
  },
  styleBindings: {
    horizontalPresetRegistry: jsonBinding('presentation-preset-registry-v002', 'horizontal'),
    verticalPresetRegistry: jsonBinding('presentation-preset-registry-v002', 'vertical', SHA_B),
  },
  outputDirectory:
    `${PRESENTATION_A_V002_LAYER1_V3_PROOF_OUTPUT_ROOT_V001}/a-v002-layer1-v3-proof-test-v001`,
  implementationBindings: PRESENTATION_A_V002_LAYER1_V3_PROOF_IMPLEMENTATION_ROLES_V001.map(
    entry => ({path: entry.path, fileSha256: SHA_A, role: entry.role}),
  ),
});

const fixtureItems = () => [1, 2, 3].map(index => ({
  candidateId: `candidate-${index}`,
  proofInput: {
    schemaVersion: PRESENTATION_A_V002_LAYER1_V3_PROOF_INPUT_SCHEMA_V001,
    proofInputId: `proof-${index}`,
    sourceMedia: {},
    outerRange: {
      sourceMediaId: 'source-media-000001',
      sourceStartMs: index * 10000,
      sourceEndMs: index * 10000 + 9000,
    },
    caption: {},
    sourceAtoms: [{
      sourceAtomId: `atom-${index}`,
      ordinal: 1,
      text: `字${index}`,
      sourceStartMs: index * 10000 + 4000,
      sourceEndMs: index * 10000 + 6000,
    }],
  },
  removalDecision: {
    sourceStartMs: index * 10000 + 4500,
    sourceEndMs: index * 10000 + 5500,
  },
}));

const executionResult = ({item, variant}) => ({
  status: 'passed',
  proofItemId: item.proofInput.proofInputId,
  candidateId: item.candidateId,
  variant,
  baseMedia: {
    mediaBinding: {
      path: `evals/clip_composition/outputs/presentation/a-v002/test/${item.candidateId}-base.mp4`,
      fileSha256: SHA_A,
    },
    durationMs: 8000,
    frameCount: 240,
    audioSampleCount: 384000,
    segmentCount: 2,
  },
  renderedMedia: {
    label: variant,
    mediaBinding: {
      path: `evals/clip_composition/outputs/presentation/a-v002/test/${item.candidateId}-${variant}.mp4`,
      fileSha256: variant === 'horizontal-formal' ? SHA_B : SHA_C,
    },
    durationMs: 8000,
    frameCount: 240,
  },
  qc: {
    status: 'passed',
    binding: {
      path: `evals/clip_composition/outputs/presentation/a-v002/test/${item.candidateId}-${variant}-qc.json`,
      fileSha256: SHA_D,
    },
  },
  commonCoreIdentity: 'executeValidatedPresentationDrawAndQcV001',
});

const dependencies = (overrides = {}) => {
  const calls = [];
  const value = {
    calls,
    captureInputs: async (_job, phase) => {
      calls.push(['capture', phase.phase]);
      return {bindings: {stable: SHA_A}};
    },
    buildFixtures: async () => ({status: 'built', fixtures: fixtureItems()}),
    executeVariant: async input => {
      calls.push(['execute', input.item.candidateId, input.variant]);
      return executionResult(input);
    },
    publishRun: async ({job: formalJob}) => {
      calls.push(['publish', formalJob.outputDirectory]);
      return {status: 'published', outputDirectory: formalJob.outputDirectory};
    },
    ...overrides,
  };
  return value;
};

const runFormalCliFixture = async dependencyFactory => {
  const root = await mkdtemp(path.join(tmpdir(), 'zev2-a-v002-proof-cli-'));
  const jobPath = 'proof-job-v001.json';
  try {
    await writeFile(
      path.join(root, jobPath),
      serializePresentationAFormalJsonV002(job()),
      {flag: 'wx'},
    );
    return await runPresentationAV002Layer1V3ProofCliV001({
      argv: [jobPath],
      workspaceRoot: root,
      dependencyFactory,
    });
  } finally {
    await rm(root, {recursive: true, force: true});
  }
};

const runMalformedCliFixture = async bytes => {
  const root = await mkdtemp(path.join(tmpdir(), 'zev2-a-v002-proof-malformed-cli-'));
  const jobPath = 'proof-job-malformed.json';
  try {
    await writeFile(path.join(root, jobPath), bytes, {flag: 'wx'});
    return await runPresentationAV002Layer1V3ProofCliV001({
      argv: [jobPath],
      workspaceRoot: root,
    });
  } finally {
    await rm(root, {recursive: true, force: true});
  }
};

test('APJ001: proof jobはexact fieldと出力rootだけを受理する', () => {
  assert.equal(validatePresentationAV002Layer1V3ProofJobV001(job()), true);
  const extra = {...job(), apiEndpoint: 'https://example.invalid'};
  assert.equal(validatePresentationAV002Layer1V3ProofJobV001(extra), false);
  const wrongRoot = {...job(), outputDirectory: 'evals/clip_composition/outputs/elsewhere'};
  assert.equal(validatePresentationAV002Layer1V3ProofJobV001(wrongRoot), false);
  const reordered = job();
  [reordered.implementationBindings[0], reordered.implementationBindings[1]] = [
    reordered.implementationBindings[1], reordered.implementationBindings[0],
  ];
  assert.equal(validatePresentationAV002Layer1V3ProofJobV001(reordered), false);

  const observation = {
    schemaVersion: PRESENTATION_A_V002_LAYER1_V3_PROOF_OBSERVATION_SCHEMA_V002,
    checkpoints: [
      'dependency-initialization-entered',
      'dependency-initialization-completed',
      'start-input-reread-entered',
    ],
    failure: {
      callerStage: 'start-input-reread',
      step: 'runtime-binary',
      exceptionType: 'file-read',
      targetFile: {path: 'runtime/node', fileSha256: SHA_A},
      toolExitCode: null,
    },
  };
  assert.equal(validatePresentationAV002Layer1V3ProofObservationV002(observation), true);
  assert.equal(validatePresentationAV002Layer1V3ProofObservationV002({
    ...observation,
    rawMessage: 'must not be accepted',
  }), false);
  assert.equal(validatePresentationAV002Layer1V3ProofObservationV002({
    ...observation,
    checkpoints: ['start-input-reread-entered'],
  }), false);
  assert.equal(validatePresentationAV002Layer1V3ProofObservationV002({
    ...observation,
    failure: {...observation.failure, callerStage: 'dependency-initialization'},
  }), false);

  const plannedStageFatal = {
    schemaVersion: PRESENTATION_A_V002_LAYER1_V3_PROOF_OBSERVATION_SCHEMA_V002,
    checkpoints: [
      'dependency-initialization-entered',
      'dependency-initialization-completed',
      'start-input-reread-entered',
      'start-input-reread-completed',
      'horizontal-style-resolution-entered',
      'horizontal-style-resolution-completed',
      'page-line-plan-entered',
    ],
    failure: {
      callerStage: 'page-line-plan',
      step: null,
      exceptionType: 'unknown',
      targetFile: null,
      toolExitCode: null,
    },
  };
  assert.equal(validatePresentationAV002Layer1V3ProofObservationV002(plannedStageFatal), true);
  assert.equal(validatePresentationAV002Layer1V3ProofObservationV002({
    ...plannedStageFatal,
    checkpoints: [...plannedStageFatal.checkpoints, 'page-line-plan-completed'],
  }), false);
  assert.equal(validatePresentationAV002Layer1V3ProofObservationV002({
    ...plannedStageFatal,
    checkpoints: [...plannedStageFatal.checkpoints.slice(0, -1), 'unknown-stage-entered'],
  }), false);
  const completedVariantStages = [
    'horizontal-style-resolution',
    'page-line-plan',
    'render-plan',
    'common-render-plan',
    'media-inspection',
    'renderer-work-acquisition',
    'rendering',
    'qc',
  ].flatMap(stage => [`${stage}-entered`, `${stage}-completed`]);
  assert.equal(validatePresentationAV002Layer1V3ProofObservationV002({
    schemaVersion: PRESENTATION_A_V002_LAYER1_V3_PROOF_OBSERVATION_SCHEMA_V002,
    checkpoints: [
      'dependency-initialization-entered',
      'dependency-initialization-completed',
      'start-input-reread-entered',
      'start-input-reread-completed',
      'base-media-inspection-entered',
      'base-media-inspection-completed',
      ...completedVariantStages,
    ],
    failure: null,
  }), true);
  assert.equal(validatePresentationAV002Layer1V3ProofObservationV002({
    schemaVersion: PRESENTATION_A_V002_LAYER1_V3_PROOF_OBSERVATION_SCHEMA_V002,
    checkpoints: [
      'dependency-initialization-entered',
      'dependency-initialization-completed',
      'start-input-reread-entered',
      'start-input-reread-completed',
      'base-media-inspection-entered',
    ],
    failure: {
      callerStage: 'base-media-inspection',
      step: null,
      exceptionType: 'tool-inspection',
      targetFile: null,
      toolExitCode: null,
    },
  }), true);
});

test('APJ002: 三fixtureを入力順の横型・縦型診断の計六本へ一度ずつ写す', async () => {
  const deps = dependencies();
  const result = await executePresentationAV002Layer1V3ProofJobV001({job: job(), dependencies: deps});
  assert.equal(result.status, 'passed');
  assert.equal(result.executionCount, 6);
  assert.deepEqual(deps.calls.filter(call => call[0] === 'execute'), [
    ['execute', 'candidate-1', 'horizontal-formal'],
    ['execute', 'candidate-1', 'vertical-caption-diagnostic'],
    ['execute', 'candidate-2', 'horizontal-formal'],
    ['execute', 'candidate-2', 'vertical-caption-diagnostic'],
    ['execute', 'candidate-3', 'horizontal-formal'],
    ['execute', 'candidate-3', 'vertical-caption-diagnostic'],
  ]);
  assert.deepEqual(result.reviewInput.items.map(entry => entry.retainedSpans), [
    [{sourceStartMs: 14000, sourceEndMs: 14500}, {sourceStartMs: 15500, sourceEndMs: 16000}],
    [{sourceStartMs: 24000, sourceEndMs: 24500}, {sourceStartMs: 25500, sourceEndMs: 26000}],
    [{sourceStartMs: 34000, sourceEndMs: 34500}, {sourceStartMs: 35500, sourceEndMs: 36000}],
  ]);
});

test('APJ003: trim/concat・描画QCは既存の実exportだけを正本として保持する', async () => {
  const actual = await loadPresentationAV002Layer1V3ProofExistingCoreExportsV001();
  assert.equal(actual.inspectSourceMedia, inspectPresentationBaseMediaSourceV001);
  assert.equal(actual.inspectToolBinaries, inspectPresentationBaseMediaToolBinaryDiagnosticsV001);
  assert.equal(actual.validateSegmentPlan, validatePresentationBaseMediaSegmentPlanV001);
  assert.equal(actual.buildVideo, buildPresentationBaseMediaVideoV001);
  assert.equal(actual.buildAudio, buildPresentationBaseMediaAudioV001);
  assert.equal(actual.muxAudioVideo, muxPresentationBaseMediaV001);
  assert.equal(actual.inspectBaseMediaOutput, inspectPresentationBaseMediaOutputV001);
  assert.equal(actual.drawAndQc, executeValidatedPresentationDrawAndQcV001);
  assert.equal(typeof inspectRenderedMediaWithToolsV001, 'function');
  const formal = await createPresentationAV002Layer1V3ProofDefaultDependenciesV001({
    job: job(),
    jobPath: 'evals/clip_composition/outputs/presentation/a-v002/test/proof-job.json',
  });
  assert.deepEqual(Object.keys(formal), [
    'captureInputs', 'buildFixtures', 'executeVariant', 'publishRun',
  ]);

  const root = await mkdtemp(path.join(tmpdir(), 'zev2-a-v002-runtime-symlink-'));
  try {
    const firstStore = path.join(root, 'store-a');
    const secondStore = path.join(root, 'store-b');
    const logicalParent = path.join(root, 'runtime');
    for (const store of [firstStore, secondStore]) {
      await mkdir(path.join(store, 'tsx', 'dist'), {recursive: true});
      await writeFile(
        path.join(store, 'tsx', 'dist', 'cli.mjs'),
        Buffer.from('export const runtime = true;\n', 'utf8'),
        {flag: 'wx'},
      );
    }
    await symlink(firstStore, logicalParent);
    const logicalRuntimePath = path.join(logicalParent, 'tsx', 'dist', 'cli.mjs');
    const expectedSha = sha256PresentationAV002Layer1V3BytesV001(
      await readFile(logicalRuntimePath),
    );
    assert.equal(
      await hashPresentationAV002ResolvedStableFileV001({
        logicalPath: logicalRuntimePath,
        hashResolvedPath: hashAbsoluteStableStreaming,
      }),
      expectedSha,
    );
    await assert.rejects(
      hashAbsoluteStableStreaming(logicalRuntimePath),
      /unsafe-file/u,
    );
    await assert.rejects(
      hashPresentationAV002ResolvedStableFileV001({
        logicalPath: logicalRuntimePath,
        hashResolvedPath: async resolvedPath => {
          const digest = await hashAbsoluteStableStreaming(resolvedPath);
          await rm(logicalParent);
          await symlink(secondStore, logicalParent);
          return digest;
        },
      }),
      /resolved stable file target changed during read/u,
    );
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('APJ004: 六経路は二採用区間のtrim/concat結果だけを受理する', async () => {
  const deps = dependencies({
    executeVariant: async input => ({...executionResult(input), baseMedia: {
      ...executionResult(input).baseMedia,
      segmentCount: input.item.candidateId === 'candidate-2' ? 1 : 2,
    }}),
  });
  const result = await executePresentationAV002Layer1V3ProofJobV001({job: job(), dependencies: deps});
  assert.equal(result.status, 'rejected');
  assert.equal(result.violations[0].code, 'OUTPUT_V002_RENDER_PROJECTION_MISMATCH');
});

test('APJ005: 開始時と公開直前に全入力bindingを再読する', async () => {
  const deps = dependencies();
  const result = await executePresentationAV002Layer1V3ProofJobV001({job: job(), dependencies: deps});
  assert.equal(result.status, 'passed');
  assert.deepEqual(deps.calls.filter(call => call[0] === 'capture'), [
    ['capture', 'start'], ['capture', 'prepublication'],
  ]);

  const cliResult = await runFormalCliFixture(async () => dependencies());
  assert.equal(cliResult.status, 'passed');
  assert.equal('proofObservation' in cliResult, false);
});

test('APJ006: 公開直前のbinding差を拒否して公開しない', async () => {
  let captureCount = 0;
  const deps = dependencies({
    captureInputs: async () => ({bindings: {stable: captureCount++ === 0 ? SHA_A : SHA_B}}),
  });
  const result = await executePresentationAV002Layer1V3ProofJobV001({job: job(), dependencies: deps});
  assert.equal(result.status, 'rejected');
  assert.equal(result.violations[0].code, 'OUTPUT_V002_RENDER_PROJECTION_MISMATCH');
  assert.equal(deps.calls.some(call => call[0] === 'publish'), false);

  for (const changedChild of ['source-sequence', 'meaning-package']) {
    const root = await mkdtemp(path.join(tmpdir(), `zev2-a-v002-${changedChild}-`));
    try {
      const childPaths = new Map([
        ['source-sequence', path.join(root, 'source-sequence-v002.json')],
        ['meaning-package', path.join(root, 'meaning-information-package-v002.json')],
      ]);
      const registered = new Map();
      for (const [role, childPath] of childPaths) {
        await writeFile(childPath, Buffer.from(`${JSON.stringify({
          schemaVersion: `presentation-a-${role}-v002`,
          role,
          value: 'strictly-verified',
        }, null, 2)}\n`, 'utf8'), {flag: 'wx'});
      }
      let registeredAndChanged = false;
      const filesystemDeps = dependencies({
        captureInputs: async (_formalJob, {phase}) => {
          if (phase === 'prepublication') {
            await rereadPresentationAV002Layer1V3ProofArtifactsV001(registered);
          }
          return {bindings: {stable: SHA_A}};
        },
        executeVariant: async input => {
          if (!registeredAndChanged) {
            for (const childPath of childPaths.values()) {
              const bytes = await readFile(childPath);
              const parsed = JSON.parse(bytes.toString('utf8'));
              assert.deepEqual(
                bytes,
                Buffer.from(`${JSON.stringify(parsed, null, 2)}\n`, 'utf8'),
              );
              registered.set(
                childPath,
                sha256PresentationAV002Layer1V3BytesV001(bytes),
              );
            }
            await writeFile(childPaths.get(changedChild), Buffer.from(`${JSON.stringify({
              schemaVersion: `presentation-a-${changedChild}-v002`,
              role: changedChild,
              value: 'changed-after-registration',
            }, null, 2)}\n`, 'utf8'));
            registeredAndChanged = true;
          }
          return executionResult(input);
        },
      });
      const changedResult = await executePresentationAV002Layer1V3ProofJobV001({
        job: job(),
        dependencies: filesystemDeps,
      });
      assert.equal(changedResult.status, 'rejected');
      assert.equal(
        changedResult.violations[0].code,
        'OUTPUT_V002_RENDER_PROJECTION_MISMATCH',
      );
      assert.equal(filesystemDeps.calls.some(call => call[0] === 'publish'), false);
    } finally {
      await rm(root, {recursive: true, force: true});
    }
  }

  const resourceRoot = await mkdtemp(path.join(tmpdir(), 'zev2-a-v002-planner-resource-'));
  try {
    const registered = new Map();
    const observeResource = createPresentationAV002Layer1V3PlannerResourceObserverV001({
      outputRoot: resourceRoot,
      candidateOrdinal: 1,
      variant: 'horizontal-formal',
      proofArtifacts: registered,
    });
    const physicalEvent = {
      schemaVersion: 'presentation-output-planner-resource-event-v001',
      stage: 'physical-graph',
      processedAtomCount: 4,
      generatedPhysicalEdgeCount: 9,
      acceptedPhysicalEdgeCount: 7,
      processedTimelineEdgeCount: null,
      mappedTimelineEdgeCount: null,
      rejectedTimelineEdgeCount: null,
      generatedStateCount: null,
      insertedStateCount: null,
      replacedEquivalentStateCount: null,
      prunedDominatedStateCount: null,
      retainedStateCount: null,
      maximumRetainedStateCount: null,
      elapsedMs: null,
    };
    const partial = observeResource(physicalEvent);
    assert.equal(registered.size, 1);
    assert.deepEqual(JSON.parse((await readFile(partial.absolutePath)).toString('utf8')), {
      schemaVersion: PRESENTATION_A_V002_PLANNER_RESOURCE_CHECKPOINT_SCHEMA_V001,
      candidateOrdinal: 1,
      variant: 'horizontal-formal',
      sequence: 1,
      plannerEvent: physicalEvent,
    });
    await rereadPresentationAV002Layer1V3ProofArtifactsV001(registered);
    assert.throws(
      () => observeResource({...physicalEvent, captionText: '保存禁止'}),
      /invalid planner resource event/u,
    );
    assert.equal(registered.size, 1);

    const completedEvent = {
      schemaVersion: 'presentation-output-planner-resource-event-v001',
      stage: 'planner-completed',
      processedAtomCount: 101,
      generatedPhysicalEdgeCount: null,
      acceptedPhysicalEdgeCount: null,
      processedTimelineEdgeCount: null,
      mappedTimelineEdgeCount: null,
      rejectedTimelineEdgeCount: null,
      generatedStateCount: 3000,
      insertedStateCount: null,
      replacedEquivalentStateCount: null,
      prunedDominatedStateCount: null,
      retainedStateCount: null,
      maximumRetainedStateCount: 28,
      elapsedMs: 37,
    };
    const completed = observeResource(completedEvent);
    const completedValue = JSON.parse((await readFile(completed.absolutePath)).toString('utf8'));
    assert.equal(registered.size, 2);
    assert.equal(completedValue.sequence, 2);
    assert.equal(completedValue.plannerEvent.maximumRetainedStateCount, 28);
    assert.equal(completedValue.plannerEvent.elapsedMs, 37);
    for (const forbidden of ['captionText', 'rawMessage', 'stack', 'stderr', 'secret']) {
      assert.equal(JSON.stringify([partial.artifact, completedValue]).includes(forbidden), false);
    }
    const duplicateObserver = createPresentationAV002Layer1V3PlannerResourceObserverV001({
      outputRoot: resourceRoot,
      candidateOrdinal: 1,
      variant: 'horizontal-formal',
      proofArtifacts: new Map(),
    });
    assert.throws(() => duplicateObserver(physicalEvent), error => error?.code === 'EEXIST');
    await writeFile(partial.absolutePath, Buffer.from('{}\n', 'utf8'));
    await assert.rejects(
      rereadPresentationAV002Layer1V3ProofArtifactsV001(registered),
      error => error?.proofRejected === true
        && error?.code === 'OUTPUT_V002_RENDER_PROJECTION_MISMATCH',
    );
  } finally {
    await rm(resourceRoot, {recursive: true, force: true});
  }

  const runnerSource = await readFile(
    'evals/clip_composition/run_presentation_a_v002_layer1_v3_proof_job_v001.ts',
    'utf8',
  );
  assert.match(
    runnerSource,
    /const sequenceArtifact = await verifyFormalJsonBinding[\s\S]*registerVerifiedFormalChildArtifact\(sequenceBinding, sequenceArtifact\)/u,
  );
  assert.match(
    runnerSource,
    /const meaningArtifact = await verifyFormalJsonBinding[\s\S]*registerVerifiedFormalChildArtifact\(meaningBinding, meaningArtifact\)/u,
  );
  assert.equal(
    runnerSource.match(/await rereadPresentationAV002Layer1V3ProofArtifactsV001\(state\.proofArtifacts\)/gu)?.length,
    2,
  );
  assert.match(
    runnerSource,
    /resourceObserver: createPresentationAV002Layer1V3PlannerResourceObserverV001\(\{[\s\S]*proofArtifacts: state\.proofArtifacts/u,
  );

  const failedRead = await executePresentationAV002Layer1V3ProofJobV001({
    job: job(),
    dependencies: dependencies({captureInputs: async () => {
      throw Object.assign(new Error('permission denied'), {code: 'EACCES'});
    }}),
  });
  assert.equal(failedRead.status, 'fatal');
  assert.equal(failedRead.exitCode, 2);
  assert.equal(failedRead.violations.length, 0);
  assert.deepEqual(failedRead.fatalObservation, {
    schemaVersion: 'presentation-fatal-observation-v002',
    innerStage: 'input-read',
    targetFile: null,
    innerCode: 'OS_PERMISSION_DENIED',
  });

  const dependencyFatal = await runFormalCliFixture(async input => (
    createPresentationAV002Layer1V3ProofDefaultDependenciesV001({
      ...input,
      moduleLoader: async ({role, href}) => {
        if (role === 'base-media-builder') {
          throw new Error('dependency secret diagnostic sentinel');
        }
        return import(href);
      },
    })
  ));
  assert.equal(dependencyFatal.status, 'fatal');
  assert.equal(dependencyFatal.exitCode, 2);
  assert.deepEqual(dependencyFatal.violations, []);
  assert.deepEqual(dependencyFatal.fatalObservation, {
    schemaVersion: 'presentation-fatal-observation-v002',
    innerStage: 'unknown',
    targetFile: null,
    innerCode: 'UNCLASSIFIED',
  });
  assert.deepEqual(dependencyFatal.proofObservation.checkpoints, [
    'dependency-initialization-entered',
  ]);
  assert.deepEqual(dependencyFatal.proofObservation.failure, {
    callerStage: 'dependency-initialization',
    step: null,
    exceptionType: 'module-load',
    targetFile: {
      path: 'evals/clip_composition/presentation_base_media_build_v001.mjs',
      fileSha256: SHA_A,
    },
    toolExitCode: null,
  });

  const rereadFatal = await runFormalCliFixture(async () => dependencies({
    captureInputs: async () => {
      throw new Error('input secret diagnostic sentinel');
    },
  }));
  assert.equal(rereadFatal.status, 'fatal');
  assert.deepEqual(rereadFatal.proofObservation.checkpoints, [
    'dependency-initialization-entered',
    'dependency-initialization-completed',
    'start-input-reread-entered',
  ]);
  assert.deepEqual(rereadFatal.proofObservation.failure, {
    callerStage: 'start-input-reread',
    step: null,
    exceptionType: 'file-read',
    targetFile: null,
    toolExitCode: null,
  });

  const fixtureFatal = await runFormalCliFixture(async () => dependencies({
    buildFixtures: async () => {
      throw new Error('fixture secret diagnostic sentinel');
    },
  }));
  assert.equal(fixtureFatal.status, 'fatal');
  assert.deepEqual(fixtureFatal.proofObservation.checkpoints, [
    'dependency-initialization-entered',
    'dependency-initialization-completed',
    'start-input-reread-entered',
    'start-input-reread-completed',
  ]);
  assert.deepEqual(fixtureFatal.proofObservation.failure, {
    callerStage: 'fixture-build',
    step: null,
    exceptionType: 'fixture-build',
    targetFile: null,
    toolExitCode: null,
  });

  const malformedBytes = Buffer.from('{"broken":', 'utf8');
  const malformedFatal = await runMalformedCliFixture(malformedBytes);
  assert.equal(malformedFatal.status, 'fatal');
  assert.deepEqual(malformedFatal.proofObservation, {
    schemaVersion: PRESENTATION_A_V002_LAYER1_V3_PROOF_OBSERVATION_SCHEMA_V002,
    checkpoints: [],
    failure: {
      callerStage: 'job-read',
      step: 'job',
      exceptionType: 'json-decode',
      targetFile: {
        path: 'proof-job-malformed.json',
        fileSha256: sha256PresentationAV002Layer1V3BytesV001(malformedBytes),
      },
      toolExitCode: null,
    },
  });

  const invalidDependencies = await runFormalCliFixture(async () => ({}));
  assert.equal(invalidDependencies.status, 'fatal');
  assert.deepEqual(invalidDependencies.proofObservation.checkpoints, [
    'dependency-initialization-entered',
  ]);
  assert.equal(
    invalidDependencies.proofObservation.failure.callerStage,
    'dependency-initialization',
  );

  const rejectedCli = await runFormalCliFixture(async () => dependencies({
    buildFixtures: async () => ({status: 'built', fixtures: []}),
  }));
  assert.equal(rejectedCli.status, 'rejected');
  assert.equal(rejectedCli.exitCode, 1);
  assert.deepEqual(rejectedCli.violations, [{
    code: 'OUTPUT_V002_PLANNER_INPUT_INVALID',
    path: '/fixtures',
    relatedIds: [],
  }]);
  assert.equal('proofObservation' in rejectedCli, false);
  const fatalBytes = JSON.stringify({
    dependencyFatal, rereadFatal, fixtureFatal, malformedFatal, invalidDependencies,
  });
  for (const forbidden of [
    'diagnostic sentinel', 'rawMessage', 'stack', 'stderr', 'captionText', 'secret',
  ]) {
    assert.equal(fatalBytes.includes(forbidden), false);
  }
});

test('APJ007: QC不合格をOUTPUT_V002_QC_FAILEDが所有する', async () => {
  const deps = dependencies({
    executeVariant: async input => input.item.candidateId === 'candidate-1'
      ? {status: 'qc-failed'}
      : executionResult(input),
  });
  const result = await executePresentationAV002Layer1V3ProofJobV001({job: job(), dependencies: deps});
  assert.equal(result.status, 'rejected');
  assert.equal(result.violations[0].code, 'OUTPUT_V002_QC_FAILED');
});

test('APJ008: no-replace公開競合をOUTPUT_V002_PUBLICATION_FAILEDが所有する', async () => {
  const deps = dependencies({publishRun: async () => {
    throw Object.assign(new Error('exists'), {code: 'EEXIST'});
  }});
  const result = await executePresentationAV002Layer1V3ProofJobV001({job: job(), dependencies: deps});
  assert.equal(result.status, 'rejected');
  assert.equal(result.violations[0].code, 'OUTPUT_V002_PUBLICATION_FAILED');
});

test('APJ009: formal jobはAPI通信・費用・再試行の入口を一つも持たない', () => {
  const formalJob = job();
  const serialized = JSON.stringify(formalJob);
  for (const forbidden of ['api', 'endpoint', 'retry', 'cost', 'token']) {
    assert.equal(serialized.toLowerCase().includes(forbidden), false);
  }
  const safeObservation = {
    schemaVersion: PRESENTATION_A_V002_LAYER1_V3_PROOF_OBSERVATION_SCHEMA_V002,
    checkpoints: [],
    failure: {
      callerStage: 'top-level',
      step: null,
      exceptionType: 'unknown',
      targetFile: null,
      toolExitCode: null,
    },
  };
  const serializedObservation = JSON.stringify(safeObservation);
  for (const forbidden of ['message', 'stack', 'stderr', 'caption', 'secret']) {
    assert.equal(serializedObservation.toLowerCase().includes(forbidden), false);
  }
});

test('APJ010: 保存済み旧v3実fixture一経路を正式化しproof runner入力へ渡せる', async () => {
  const paths = {
    legacyPackage:
      'evals/clip_composition/outputs/internal-edit/20260717-layer1-v003-long-gap-pair-review-v001/package-input.json',
    humanResult:
      'evals/clip_composition/outputs/internal-edit/20260717-layer1-v003-long-gap-pair-review-v001/human-result.json',
    sourceIdentity:
      'evals/clip_composition/outputs/presentation/source-review-preparations/qdczJpv8RCc-candidate-59-v001/source-identity.json',
    sourceTranscript:
      'evals/clip_composition/fixtures/nE_bNeBNp4E_multiblock_material_v001/transcript.json',
  };
  const artifacts = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, value]) => {
    const bytes = await readFile(value);
    return [key, {bytes, value: JSON.parse(bytes.toString('utf8'))}];
  })));
  const bindJson = (schemaVersion, path, artifact) => ({
    schemaVersion,
    path,
    fileSha256: sha256PresentationAV002Layer1V3BytesV001(artifact.bytes),
    canonicalSha256: canonicalSha256PresentationAV002Layer1V3JsonV001(artifact.value),
  });
  const built = buildPresentationAV002Layer1V3FixturesV001({
    legacyPackage: artifacts.legacyPackage.value,
    humanResult: artifacts.humanResult.value,
    sourceIdentity: artifacts.sourceIdentity.value,
    sourceAtomTranscript: artifacts.sourceTranscript.value,
    sourceAtomTranscriptBytes: artifacts.sourceTranscript.bytes,
    normalizedTranscriptPath:
      'evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-test-v001/source-atom-transcript-v001.json',
    normalizedHumanApprovalPath:
      'evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-test-v001/human-approval-v001.json',
    bindings: {
      legacyPackage: bindJson(
        PRESENTATION_A_V002_LAYER1_V3_PROPOSAL_SCHEMA_V001,
        paths.legacyPackage,
        artifacts.legacyPackage,
      ),
      humanResult: bindJson(
        PRESENTATION_A_V002_LAYER1_V3_LEGACY_HUMAN_RESULT_SCHEMA_V001,
        paths.humanResult,
        artifacts.humanResult,
      ),
      sourceIdentity: bindJson(
        artifacts.sourceIdentity.value.schemaVersion,
        paths.sourceIdentity,
        artifacts.sourceIdentity,
      ),
      sourceTranscriptByteBinding: {
        path: paths.sourceTranscript,
        fileSha256: sha256PresentationAV002Layer1V3BytesV001(artifacts.sourceTranscript.bytes),
      },
    },
  });
  assert.equal(built.status, 'built');
  assert.deepEqual(built.fixtures.map(item => item.proofInput.sourceAtoms.length), [101, 72, 80]);
  const deps = dependencies({buildFixtures: async () => built});
  const result = await executePresentationAV002Layer1V3ProofJobV001({job: job(), dependencies: deps});
  assert.equal(result.status, 'passed');
  assert.equal(result.reviewInput.items.length, 3);
  assert.equal(built.normalizedHumanApproval.schemaVersion,
    PRESENTATION_A_V002_LAYER1_V3_HUMAN_APPROVAL_SCHEMA_V001);

  const runnerSource = await readFile(
    'evals/clip_composition/run_presentation_a_v002_layer1_v3_proof_job_v001.ts',
    'utf8',
  );
  assert.match(runnerSource, /runPresentationASourceSequenceJobV002/u);
  assert.match(runnerSource, /runPresentationAMeaningInformationPackageJobV002/u);
  assert.match(runnerSource, /classifyPresentationOutputDownstreamResultV002/u);
  assert.match(runnerSource, /await mkdir\(finalRoot\)/u);
  assert.match(runnerSource, /writeFile\(absolutePath, bytes, \{flag: 'wx'\}\)/u);
  assert.doesNotMatch(runnerSource, /rename\(state\./u);
  assert.doesNotMatch(runnerSource, /media\.video\.frameCount\s*=/u);
  assert.doesNotMatch(runnerSource, /ffmpegPath:\s*['"]ffmpeg['"]/u);
  assert.doesNotMatch(runnerSource, /ffprobePath:\s*['"]ffprobe['"]/u);
  assert.match(
    runnerSource,
    /baseMedia:\s*\{[\s\S]*?artifactId:[\s\S]*?path: 'base-media\.mp4',[\s\S]*?fileSha256:/u,
  );
  assert.doesNotMatch(runnerSource, /proofRejectedError\(pageLinePlan\.code/u);
  assert.match(
    runnerSource,
    /if \(pageLinePlan\.status !== 'planned'\) \{\s*throw proofRejectedError\('OUTPUT_V002_LAYOUT_UNRESOLVED', '\/pageLinePlan'\);/u,
  );
  for (const token of [
    'dependency-initialization-entered',
    'dependency-initialization-completed',
    'start-input-reread-entered',
    'start-input-reread-completed',
    "'job'",
    "'upstream-json'",
    "'source-media'",
    "'implementation-file'",
    "'runtime-binary'",
    "'tool-inspection'",
    "'base-media-inspection'",
    "'horizontal-style-resolution'",
    "'vertical-style-resolution'",
    "'page-line-plan'",
    "'render-plan'",
    "'common-render-plan'",
    "'media-inspection'",
    "'renderer-work-acquisition'",
    "'rendering'",
    "'qc'",
  ]) assert.equal(runnerSource.includes(token), true);
  assert.equal(runnerSource.includes('proofFatalEvidenceByErrorV001 = new WeakMap()'), true);
  assert.equal(runnerSource.includes("proofCallerStage: 'variant-execution'"), false);
  assert.equal(runnerSource.includes("proofExceptionType: 'child-process'"), false);
  assert.equal(runnerSource.includes("role: 'renderer-qc'"), true);
  assert.equal(
    runnerSource.includes('rendererQcModule.inspectRenderedMediaWithToolsV001'),
    true,
  );
  assert.equal(
    runnerSource.includes('rendererModule.inspectRenderedMediaWithToolsV001'),
    false,
  );
  assert.match(
    runnerSource,
    /verticalRenderer\.inspectPresentationVerticalTextLayoutV001\(\{\s*plan: core\.plan,\s*presetRegistry: styleResolution\.layoutContext\.presetRegistry,\s*\}\)/u,
  );
  assert.match(
    runnerSource,
    /if \(vertical && validatedLayoutInspection\.status !== 'passed'\) \{\s*throw proofRejectedError\('OUTPUT_V002_LAYOUT_UNRESOLVED', '\/verticalLayoutInspection'\);/u,
  );
  assert.match(
    runnerSource,
    /\.\.\.\(vertical \? \{overlayAdapter, evaluateQc, validatedLayoutInspection\} : \{\}\)/u,
  );
  assert.doesNotMatch(
    runnerSource,
    /diagnostic-contain[\s\S]*inspect_presentation_render_layout_v001/u,
  );

  const noArgument = await runPresentationAV002Layer1V3ProofCliV001({argv: []});
  const twoArguments = await runPresentationAV002Layer1V3ProofCliV001({
    argv: ['a.json', 'b.json'],
  });
  assert.equal(noArgument.exitCode, 2);
  assert.equal(twoArguments.exitCode, 2);
});
