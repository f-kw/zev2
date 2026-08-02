import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import {
  buildPresentationCaptionDisplayPairV004,
  validatePresentationCaptionDisplayPairGenerationJobV002,
  validatePresentationCaptionDisplayPlanV002,
  validatePresentationCaptionPublishedReviewInputV004,
  validatePresentationCaptionReviewRenderRequestV004,
} from './presentation_caption_display_pair_v004.mjs';
import {
  validatePresentationInstructionContractV004,
} from './presentation_instruction_contract_v004.mjs';
import {
  runPresentationCaptionDisplayPairCliV002,
  runPresentationCaptionDisplayPairJobV002,
} from './run_presentation_caption_display_pair_job_v002.mjs';
import {
  canonicalizePresentationCaptionB1JsonV001,
  serializePresentationCaptionB1FormalJsonV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  normalizeSourceAtomSpeakerForPackage,
} from './presentation_source_speaker_policy_v001.mjs';

const HASH = '0'.repeat(64);
const JOB_PATH =
  'evals/clip_composition/outputs/presentation/caption-display-pair-generation-jobs/'
  + 'vertical-display-pair-v002.json';
const CANDIDATE_59_VERTICAL_JOB_PATH =
  'evals/clip_composition/outputs/presentation/caption-display-pair-generation-jobs/'
  + 'qdczJpv8RCc-candidate-59-vertical-caption-b6-v002.json';
const fileBindings = [
  ['displayPairCore', 'evals/clip_composition/presentation_caption_display_pair_v004.mjs'],
  ['displayPairRunner', 'evals/clip_composition/run_presentation_caption_display_pair_job_v002.mjs'],
];
const dependencyBindings = [
  ['displayPairCoreV003', 'evals/clip_composition/presentation_caption_display_pair_v003.mjs'],
  ['semanticCore', 'evals/clip_composition/presentation_caption_semantic_output_v001.mjs'],
  ['semanticRunner', 'evals/clip_composition/run_presentation_caption_semantic_output_check_v002.mjs'],
  ['textLayoutImplementation', 'evals/clip_composition/presentation_renderer_text_layout_v001.mjs'],
  ['captionCoreV003', 'evals/clip_composition/presentation_caption_contract_v003.mjs'],
  ['instructionCoreV004', 'evals/clip_composition/presentation_instruction_contract_v004.mjs'],
  ['instructionCoreV003', 'evals/clip_composition/presentation_instruction_contract_v003.mjs'],
  ['sourceSpeakerPolicy', 'evals/clip_composition/presentation_source_speaker_policy_v001.mjs'],
  ['sourceSpeakerRegistry', 'evals/clip_composition/registries/presentation/presentation-source-speaker-non-identity-registry-v001/registry.json'],
  ['timelineV002', 'evals/clip_composition/presentation_base_media_timeline_v002.mjs'],
  ['layoutPreflightCore', 'evals/clip_composition/inspect_presentation_preset_layout.ts'],
  ['rendererLayoutCore', 'runner/src/telop/telop-render-model.ts'],
  ['presetRegistry', 'evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/preset-registry.json'],
  ['presetValidationIndex', 'evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/preset-validation-index.json'],
  ['materialValidationIndex', 'evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/material-validation-index.json'],
  ['trustedRegistryBindings', 'evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/trusted-registry-bindings.json'],
  ['rendererTrust', 'evals/clip_composition/registries/presentation/presentation-vertical-renderer-trust-v001/trust.json'],
  ['sharedJsonContractCore', 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs'],
  ['gateACore', 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs'],
  ['gateARetainedSourceAtomsCore', 'evals/clip_composition/presentation_retained_source_atoms_v001.mjs'],
  ['gateARunner', 'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs'],
];
const clone = (value) => structuredClone(value);
const hash = (value) => createHash('sha256').update(value).digest('hex');
const bytes = (value) => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  assert.equal(result.status, 'serialized');
  return result.bytes;
};
const canonicalSha = (value) => {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  assert.equal(result.status, 'canonicalized');
  return hash(result.bytes);
};
const binding = (path, value = {}) => ({
  path,
  fileSha256: hash(bytes(value)),
  canonicalSha256: canonicalSha(value),
});

const makeJob = () => ({
  schemaVersion: 'presentation-caption-display-pair-generation-job-v002',
  jobId: 'vertical-display-pair-v002',
  artifactId: 'vertical-artifact-v002',
  mode: 'formal-generation',
  implementationBinding: {
    gitCommit: '1'.repeat(40),
    files: fileBindings.map(([role, path]) => ({role, path, fileSha256: HASH})),
    dependencyFiles: dependencyBindings.map(
      ([role, path]) => ({role, path, fileSha256: HASH}),
    ),
  },
  sourcePackageBinding: {
    rootPath: 'synthetic/package',
    manifest: binding('synthetic/package/package-manifest.json'),
    validationReport: binding('synthetic/package/package-validation-report.json'),
  },
  semanticCheckBinding: {
    job: binding('synthetic/semantic-job.json'),
    rawSemanticOutput: binding('synthetic/semantic-output.json'),
    validationReport: binding('synthetic/semantic-report.json'),
    expectedCompilerInputObservedByteSha256: HASH,
    expectedCompilerInputCanonicalSha256: HASH,
  },
  retainedSourceBinding: {
    rootPath: 'synthetic/retained',
    generationManifest: binding('synthetic/retained/generation-manifest.json'),
    sourceAtoms: binding('synthetic/retained/source-atoms.json'),
    validationReport: binding('synthetic/retained/validation-report.json'),
  },
  baseMediaBinding: {
    rootPath: 'synthetic/base',
    generationManifest: binding('synthetic/base/generation-manifest.json'),
    timeline: binding('synthetic/base/timeline.json'),
    validationReport: binding('synthetic/base/validation-report.json'),
    baseMedia: {path: 'synthetic/base/base-media.mp4', fileSha256: HASH},
  },
  registryBinding: {
    rootPath: 'synthetic/registry',
    trustedRegistryBindings: binding('synthetic/registry/trusted.json'),
    presetRegistry: binding('synthetic/registry/preset.json'),
    presetValidationIndex: binding('synthetic/registry/preset-index.json'),
    materialValidationIndex: binding('synthetic/registry/material-index.json'),
  },
  cropDecisionBinding: {
    path: 'synthetic/crop/crop-decision-v006.json',
    fileSha256: HASH,
  },
  expectedRuntime: {},
  expectedProjection: {},
  publication: {
    pairId: 'vertical-display-pair-v002',
    formalOutputPath:
      'evals/clip_composition/outputs/presentation/caption-display-pairs/'
      + 'vertical-display-pair-v002',
    lockPath:
      'evals/clip_composition/outputs/presentation/caption-display-pairs/'
      + 'vertical-display-pair-v002.lock',
    workPath:
      'evals/clip_composition/outputs/presentation/caption-display-pairs/'
      + 'vertical-display-pair-v002.work',
  },
  readOnlyGuard: {},
});

const makeDisplayFixture = () => {
  const retained = {
    sourceProvenance: 'synthetic-source-v001',
    atomGranularity: 'character-timestamp',
    atomProvenance: {},
    rawSourceAtomsCanonicalSha256: HASH,
    rawSourceAtoms: [{
      atomId: 'atom-1',
      speechId: 1,
      speaker: 'SPEAKER_A',
      text: 'あいうえおかき',
      startMs: 100,
      endMs: 200,
    }],
  };
  const displayPlan = {
    schemaVersion: 'presentation-caption-display-plan-v002',
    displayPlanId: 'vertical-pair-display-plan',
    artifactId: 'vertical-artifact-v002',
    formatSelection: {
      format: 'vertical-short-1080x1920',
      screenLayoutId: 'speaker_only',
      presetId: 'vertical-short-speaker-only-readable-pop-v001',
      visualStateId: 'caption-core-vertical-speaker-only-v001',
    },
    displayConstraints: {
      maxLogicalWidthPerLine: 14,
      maxLinesPerMeaningGroup: 2,
      characterWidthRule: 'U+0000..U+00FF=1; other Unicode code point=2',
    },
    sourceProvenance: retained.sourceProvenance,
    atomGranularity: retained.atomGranularity,
    semanticCompilerInputBinding: {},
    sourceAtomBinding: {},
    timelineBinding: {},
    presetBinding: {},
    containers: [{
      containerId: 'segmenter-container-000001',
      timelineSegmentId: 'segment-0001',
      speechId: 1,
      cues: [{
        cueId: 'caption-cue-000001',
        targetRefId: 'caption-target-000001',
        instructionId: 'caption-instruction-000001',
        globalCueOrdinal: 1,
        meaningGroupOrdinal: 1,
        lines: [{
          lineOrdinal: 1,
          sourceAtomIds: ['atom-1'],
          text: 'あいうえおかき',
          startAnchor: {atomId: 'atom-1', edge: 'start'},
          endAnchor: {atomId: 'atom-1', edge: 'end'},
          logicalWidth: 14,
        }],
        startAnchor: {atomId: 'atom-1', edge: 'start'},
        endAnchor: {atomId: 'atom-1', edge: 'end'},
        sourceStartMs: 100,
        sourceEndMs: 200,
      }],
    }],
  };
  const normalized = retained.rawSourceAtoms.map((atom) => {
    const value = normalizeSourceAtomSpeakerForPackage(atom).atom;
    return {
      atomId: value.atomId,
      speechId: value.speechId,
      speaker: value.speaker,
      text: value.text,
      startMs: value.startMs,
      endMs: value.endMs,
    };
  });
  const resolutionPackage = {
    schemaVersion: 'presentation-resolution-package-v003',
    resolutionPackageId: 'vertical-pair-resolution-package',
    sourceProvenance: retained.sourceProvenance,
    atomGranularity: retained.atomGranularity,
    sourceSpeakerNormalization: {},
    sourceAtomsSha256: canonicalSha(normalized),
    sourceAtoms: normalized,
    targets: [{
      targetRefId: 'caption-target-000001',
      targetType: 'caption-target',
      captionContractRefId: 'caption-contract-v003',
      cueId: 'caption-cue-000001',
    }],
    captionContracts: [{
      captionContractRefId: 'caption-contract-v003',
      captionSchemaVersion: 'presentation-caption-check-v003',
      sourceDisplayPlanBinding: {
        displayPlanId: displayPlan.displayPlanId,
        fileSha256: hash(bytes(displayPlan)),
        canonicalSha256: canonicalSha(displayPlan),
      },
      captionTargets: [{
        targetId: 'caption-target-000001',
        requiredAtomIds: ['atom-1'],
        allowedOmissionAtomIds: [],
      }],
      allowedSimultaneousGroups: [],
      captionPlan: {
        cues: [{
          cueId: 'caption-cue-000001',
          targetId: 'caption-target-000001',
          lines: [{atomIds: ['atom-1'], renderedText: 'あいうえおかき'}],
          startAnchor: {atomId: 'atom-1', edge: 'start'},
          endAnchor: {atomId: 'atom-1', edge: 'end'},
          startMs: 100,
          endMs: 200,
        }],
      },
    }],
  };
  const sourceManifest = {
    schemaVersion: 'presentation-caption-semantic-source-package-manifest-v002',
    formatSelection: clone(displayPlan.formatSelection),
    displayConstraintInput: clone(displayPlan.displayConstraints),
  };
  const instructionBundle = {
    schemaVersion: 'presentation-instruction-bundle-v004',
    pairId: 'vertical-pair',
    displayPlanBinding: {
      path: 'display-plan.json',
      fileSha256: hash(bytes(displayPlan)),
      canonicalSha256: canonicalSha(displayPlan),
      displayPlanId: displayPlan.displayPlanId,
    },
    instructionSet: {
      schemaVersion: 'zev-presentation-instruction-v004',
      instructionSetId: 'vertical-pair-instruction-set',
      resolutionPackageId: resolutionPackage.resolutionPackageId,
      resolutionPackageCanonicalSha256: canonicalSha(resolutionPackage),
      sourceProvenance: retained.sourceProvenance,
      format: 'vertical-short-1080x1920',
      screenLayoutId: 'speaker_only',
      rendererContractVersion: 'zev-renderer-boundary-v004-review',
      presetRegistryBinding: {
        registryVersion: 'vertical-short-preset-registry-v001',
        presetValidationIndexSha256: HASH,
      },
      materialRegistryBinding: {
        registryVersion: 'presentation-material-registry-empty-v001',
        materialValidationIndexSha256: HASH,
      },
      displayConstraintBinding: {
        maxLogicalWidthPerLine: 14,
        maxLinesPerMeaningGroup: 2,
        characterWidthRule: 'U+0000..U+00FF=1; other Unicode code point=2',
        sourceManifestCanonicalSha256: canonicalSha(sourceManifest),
      },
      instructions: [{
        instructionId: 'caption-instruction-000001',
        trigger: {startAtomId: 'atom-1'},
        kind: 'speech-caption',
        target: {
          targetType: 'caption-target',
          targetRefIds: ['caption-target-000001'],
        },
        presetId: 'vertical-short-speaker-only-readable-pop-v001',
        materialRefs: [],
      }],
    },
    resolutionPackage,
  };
  const trusted = {
    presetRegistryVersion: 'vertical-short-preset-registry-v001',
    presetValidationIndexSha256: HASH,
    materialRegistryVersion: 'presentation-material-registry-empty-v001',
    materialValidationIndexSha256: HASH,
  };
  const registry = {
    schemaVersion: 'presentation-preset-registry-v002',
    registryVersion: 'vertical-short-preset-registry-v001',
    presets: [],
  };
  const presetIndex = {
    registryVersion: 'vertical-short-preset-registry-v001',
    presets: [],
  };
  const materialIndex = {
    registryVersion: 'presentation-material-registry-empty-v001',
    materials: [],
  };
  return {
    retained,
    displayPlan,
    resolutionPackage,
    instructionBundle,
    sourceManifest,
    trusted,
    registry,
    presetIndex,
    materialIndex,
  };
};

const instructionInput = (fixture) => ({
  instructionBundle: fixture.instructionBundle,
  displayPlan: fixture.displayPlan,
  retainedSourceAtoms: fixture.retained,
  trustedRegistryBindings: fixture.trusted,
  presetRegistry: fixture.registry,
  presetValidationIndex: fixture.presetIndex,
  materialValidationIndex: fixture.materialIndex,
  sourcePackageManifest: fixture.sourceManifest,
});

const makeReviewFixture = () => {
  const fixture = makeDisplayFixture();
  const caption = {schemaVersion: 'presentation-caption-check-report-v004'};
  const layout = {schemaVersion: 'presentation-caption-layout-preflight-v002'};
  const review = {
    schemaVersion: 'presentation-caption-review-render-request-v004',
    requestId: 'vertical-pair-review',
    purpose: 'caption-readability-alignment-completeness-review',
    reviewOnly: true,
    publicationAllowed: false,
    displayPlanBinding: binding('display-plan.json', fixture.displayPlan),
    instructionBundleBinding:
      binding('instruction-bundle.json', fixture.instructionBundle),
    captionCheckBinding: binding('caption-check-report.json', caption),
    layoutPreflightBinding: binding('layout-preflight.json', layout),
    baseMediaBinding: {},
    registryBindings: {
      trustedRegistryBindings: binding('registry/trusted.json'),
      presetRegistry: binding('registry/preset.json'),
      presetValidationIndex: binding('registry/preset-index.json'),
      materialValidationIndex: binding('registry/material-index.json'),
      rendererTrust: binding('registry/renderer-trust.json'),
    },
    cropDecisionBinding: binding('crop/crop-decision.json'),
    requiredInputState: 'presentation_caption_display_pair_passed',
    rendererEntry: 'presentation-vertical-review-renderer-v001',
    expectedOutput: {
      state: 'awaiting_human_visual_review',
      publicationAllowed: false,
      requiredQc: [
        'preset_applied',
        'no_text_overlap',
        'inside_safe_area',
        'no_missing_caption',
        'base_frame_count_preserved',
        'base_audio_preserved',
      ],
    },
  };
  return {...fixture, caption, layout, review};
};

const makeEarlyBuildContext = () => {
  const fixture = makeDisplayFixture();
  const job = makeJob();
  const manifest = {
    schemaVersion: 'presentation-caption-semantic-source-package-manifest-v002',
    formatSelection: clone(fixture.displayPlan.formatSelection),
    displayConstraintInput: clone(fixture.displayPlan.displayConstraints),
  };
  return {
    job,
    jobBinding: binding(JOB_PATH, job),
    sourcePackage: {
      manifest,
      sourceInput: {
        displayConstraints: {
          maxLogicalWidthPerLine: 14,
          maxLinesPerMeaningGroup: 2,
        },
      },
      expansionMap: {
        widthPolicyBinding: {
          presetId: manifest.formatSelection.presetId,
          visualStateId: manifest.formatSelection.visualStateId,
          maxLogicalWidthPerLine: 14,
          maxLinesPerMeaningGroup: 2,
          characterWidthRule:
            'U+0000..U+00FF=1; other Unicode code point=2',
        },
      },
      snapshots: [],
    },
    semantic: {report: {status: 'passed'}},
    retainedSource: {value: fixture.retained, binding: {}},
    baseMedia: {},
    registry: {
      trustedRegistryBindings: {binding: binding('registry/trusted.json'), value: fixture.trusted},
      presetRegistry: {
        binding: binding('registry/preset.json'),
        value: {
          registryVersion: 'vertical-short-preset-registry-v001',
          presets: [{
            presetId: 'vertical-short-speaker-only-readable-pop-v001',
            format: 'vertical-short-1080x1920',
            screenLayoutId: 'speaker_only',
            visualStates: [{
              stateId: 'caption-core-vertical-speaker-only-v001',
              layout: {
                maxSupportedLogicalWidthPerLine: 14,
                maxLines: 2,
                characterWidthRule:
                  'U+0000..U+00FF=1; other Unicode code point=2',
              },
            }],
          }],
        },
      },
      presetValidationIndex: {binding: binding('registry/preset-index.json'), value: fixture.presetIndex},
      materialValidationIndex: {binding: binding('registry/material-index.json'), value: fixture.materialIndex},
      rendererTrust: {binding: binding('registry/renderer-trust.json'), value: {}},
    },
    crop: {
      binding: binding('crop/crop-decision.json'),
      decision: {selectedPlan: {screenLayoutId: 'speaker_only'}},
      selectionPackageManifestBinding: binding('crop/selection.json'),
      selectionPackage: {
        sourceMedia: {
          path: job.baseMediaBinding.baseMedia.path,
          fileSha256: job.baseMediaBinding.baseMedia.fileSha256,
        },
      },
    },
    runtimeBinding: {},
  };
};

test('D01: v004正常外形・固定23 implementation binding・表示計画とreview入口を受理する', () => {
  assert.equal(
    validatePresentationCaptionDisplayPairGenerationJobV002(makeJob()).status,
    'passed',
  );
  assert.equal(
    validatePresentationCaptionDisplayPlanV002(makeDisplayFixture().displayPlan).status,
    'passed',
  );
  const fixture = makeReviewFixture();
  assert.equal(validatePresentationCaptionReviewRenderRequestV004(fixture.review).status, 'passed');
  assert.equal(
    validatePresentationCaptionPublishedReviewInputV004({
      reviewRenderRequest: fixture.review,
      displayPlan: fixture.displayPlan,
      instructionBundle: fixture.instructionBundle,
      captionCheckReport: fixture.caption,
      layoutPreflight: fixture.layout,
    }).status,
    'passed',
  );
});

test('D02: format不一致を拒否する', () => {
  const plan = makeDisplayFixture().displayPlan;
  plan.formatSelection.format = 'normal-landscape';
  assert.equal(validatePresentationCaptionDisplayPlanV002(plan).status, 'rejected');
});

test('D03: packageとcropの画面型不一致を拒否する', () => {
  const context = makeEarlyBuildContext();
  context.crop.decision.selectedPlan.screenLayoutId = 'screen_speaker';
  const result = buildPresentationCaptionDisplayPairV004(context);
  assert.equal(result.status, 'rejected');
  assert.equal(result.violations[0].code, 'DISPLAY_SCREEN_LAYOUT_BINDING_MISMATCH');
});

test('D04: crop provenanceのsource mediaと基礎映像由来不一致を拒否する', () => {
  const context = makeEarlyBuildContext();
  context.crop.selectionPackage.sourceMedia.path = 'synthetic/other.mp4';
  const result = buildPresentationCaptionDisplayPairV004(context);
  assert.equal(result.status, 'rejected');
  assert.equal(result.violations[0].code, 'SOURCE_PACKAGE_BINDING_MISMATCH');
});

test('D05: packageとinstructionのpreset不一致を拒否する', () => {
  const fixture = makeDisplayFixture();
  fixture.instructionBundle.instructionSet.instructions[0].presetId = 'wrong-preset';
  assert.equal(
    validatePresentationInstructionContractV004(instructionInput(fixture)).status,
    'rejected',
  );
});

test('D06: packageとinstructionのstate不一致を拒否する', () => {
  const fixture = makeDisplayFixture();
  fixture.displayPlan.formatSelection.visualStateId = 'wrong-state';
  assert.equal(
    validatePresentationInstructionContractV004(instructionInput(fixture)).status,
    'rejected',
  );
});

test('D07: package・意味入力・展開写像・表示計画の幅不一致を拒否する', () => {
  const context = makeEarlyBuildContext();
  context.sourcePackage.sourceInput.displayConstraints.maxLogicalWidthPerLine = 13;
  assert.equal(buildPresentationCaptionDisplayPairV004(context).status, 'rejected');
  const fixture = makeDisplayFixture();
  fixture.sourceManifest.displayConstraintInput.maxLogicalWidthPerLine = 13;
  assert.equal(
    validatePresentationInstructionContractV004(instructionInput(fixture)).status,
    'rejected',
  );
});

test('D08: 最大行数または文字幅規則の不一致を拒否する', () => {
  for (const mutate of [
    (plan) => { plan.displayConstraints.maxLinesPerMeaningGroup = 0; },
    (plan) => { plan.displayConstraints.characterWidthRule = 'unknown'; },
  ]) {
    const plan = makeDisplayFixture().displayPlan;
    mutate(plan);
    assert.equal(validatePresentationCaptionDisplayPlanV002(plan).status, 'rejected');
  }
});

test('D09: B4 runnerはcrop decision実体のfile SHA差し替えを照合する', () => {
  const source = readFileSync(
    new URL('./run_presentation_caption_display_pair_job_v002.mjs', import.meta.url),
    'utf8',
  );
  assert.match(source, /hash\(cropBytes\) !== job\.cropDecisionBinding\.fileSha256/u);
});

test('D10: v004入口は旧package v001と旧review request v003を拒否する', () => {
  const fixture = makeReviewFixture();
  fixture.review.schemaVersion = 'presentation-caption-review-render-request-v003';
  assert.equal(validatePresentationCaptionReviewRenderRequestV004(fixture.review).status, 'rejected');
  const context = makeEarlyBuildContext();
  context.sourcePackage.manifest.schemaVersion =
    'presentation-caption-semantic-source-package-manifest-v001';
  assert.equal(buildPresentationCaptionDisplayPairV004(context).status, 'rejected');
});

test('D11: 同一入力の6成果物+report byte一致とrunner exit 0・1・2を固定する', async () => {
  const implementationBytes = new Map(
    [...fileBindings, ...dependencyBindings].map(([, path]) => [path, Buffer.from(path)]),
  );
  const job = makeJob();
  for (const entries of [
    job.implementationBinding.files,
    job.implementationBinding.dependencyFiles,
  ]) {
    entries.forEach((entry) => {
      entry.fileSha256 = hash(implementationBytes.get(entry.path));
    });
  }
  const report = {
    schemaVersion: 'presentation-caption-display-pair-validation-report-v003',
    status: 'passed_pending_human_review',
  };
  const artifacts = [
    'display-plan.json',
    'layout-preflight.json',
    'caption-check-report.json',
    'instruction-bundle.json',
    'review-render-request.json',
    'pair-generation-manifest.json',
    'pair-validation-report.json',
  ].map((fileName, index) => {
    const value = index === 6 ? report : {schemaVersion: `synthetic-${index}`};
    return {fileName, value, bytes: bytes(value)};
  });
  const reader = async (absolute) => {
    for (const [path, value] of implementationBytes) {
      if (absolute.endsWith(path)) return Buffer.from(value);
    }
    throw new Error(`unexpected read ${absolute}`);
  };
  const passed = await runPresentationCaptionDisplayPairJobV002(JOB_PATH, {
    jobBytes: bytes(job),
    readFile: reader,
    context: {},
    build: async () => ({
      status: 'built',
      artifacts: artifacts.map((entry) => ({...entry, bytes: Buffer.from(entry.bytes)})),
      report,
      violations: [],
    }),
    publish: false,
  });
  assert.equal(passed.exitCode, 0);
  const invalid = clone(job);
  invalid.schemaVersion = 'unknown';
  const rejected = await runPresentationCaptionDisplayPairJobV002(JOB_PATH, {
    jobBytes: bytes(invalid),
    readFile: reader,
    publish: false,
  });
  assert.equal(rejected.exitCode, 1);
  const writes = [];
  const usage = await runPresentationCaptionDisplayPairCliV002(
    [],
    {stdout: {write: (value) => writes.push(Buffer.from(value))}},
  );
  assert.equal(usage, 2);
  assert.equal(writes.length, 1);
  assert.equal(JSON.parse(writes[0]).status, 'fatal');
});

test('D12: cue幅はjob入力値で判定し14を受理・15を拒否する', () => {
  const passed = makeDisplayFixture().displayPlan;
  assert.equal(validatePresentationCaptionDisplayPlanV002(passed).status, 'passed');
  const rejected = makeDisplayFixture().displayPlan;
  rejected.containers[0].cues[0].lines[0].text = 'あいうえおかきa';
  rejected.containers[0].cues[0].lines[0].logicalWidth = 15;
  assert.equal(validatePresentationCaptionDisplayPlanV002(rejected).status, 'rejected');
  assert.equal(
    validatePresentationCaptionDisplayPlanV002(rejected).violations[0].code,
    'CUE_LINE_WIDTH_EXCEEDED',
  );
});

test('D13: 保存済み入力を実runnerで読み、byte型を保った決定的複製からB4成果物を構築する', async () => {
  const job = JSON.parse(readFileSync(CANDIDATE_59_VERTICAL_JOB_PATH, 'utf8'));
  for (const entries of [
    job.implementationBinding.files,
    job.implementationBinding.dependencyFiles,
  ]) {
    for (const entry of entries) {
      entry.fileSha256 = hash(readFileSync(entry.path));
    }
  }
  const observedBuilds = [];
  const result = await runPresentationCaptionDisplayPairJobV002(
    CANDIDATE_59_VERTICAL_JOB_PATH,
    {
      jobBytes: bytes(job),
      publish: false,
      build: async (context) => {
        const binaryInputs = [
          ...context.sourcePackage.snapshots.map((snapshot) => snapshot.bytes),
          context.semantic.rawSemanticOutputSnapshot.bytes,
        ];
        assert.equal(binaryInputs.length, 8);
        assert.ok(binaryInputs.every((entry) => Buffer.isBuffer(entry)));
        const built = buildPresentationCaptionDisplayPairV004(context);
        assert.equal(built.status, 'built');
        assert.equal(built.artifacts.length, 7);
        const displayPlan = built.artifacts.find(
          (entry) => entry.fileName === 'display-plan.json',
        )?.value;
        assert.equal(
          displayPlan.semanticCompilerInputBinding.compilerInputObservedByteSha256,
          job.semanticCheckBinding.expectedCompilerInputObservedByteSha256,
        );
        assert.equal(
          displayPlan.semanticCompilerInputBinding.compilerInputCanonicalSha256,
          job.semanticCheckBinding.expectedCompilerInputCanonicalSha256,
        );
        assert.deepEqual(
          displayPlan.semanticCompilerInputBinding.validationReport,
          {
            path: job.semanticCheckBinding.validationReport.path,
            fileSha256: job.semanticCheckBinding.validationReport.fileSha256,
            canonicalSha256:
              job.semanticCheckBinding.validationReport.canonicalSha256,
          },
        );
        assert.deepEqual(
          Object.keys(displayPlan.semanticCompilerInputBinding.validationReport),
          ['path', 'fileSha256', 'canonicalSha256'],
        );
        observedBuilds.push(binaryInputs);
        return built;
      },
    },
  );
  assert.equal(observedBuilds.length, 2);
  for (let index = 0; index < observedBuilds[0].length; index += 1) {
    assert.notStrictEqual(observedBuilds[0][index], observedBuilds[1][index]);
  }
  assert.equal(result.exitCode, 0);
  assert.equal(result.value.status, 'passed_pending_human_review');
  assert.equal(result.outputRoot, job.publication.formalOutputPath);
});
