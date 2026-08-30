import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

import {canonicalJson} from './presentation_caption_contract_v002.mjs';
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
} from './presentation_renderer_admission_receipt_v002.mjs';
import {
  validatePresentationOutputCaptionCueSourcePackageV001,
} from './presentation_output_caption_cue_source_package_v001.mjs';
import {
  PRESENTATION_INSTRUCTION_RENDERER_CONTRACT_ROLE_PATHS_V002,
  PRESENTATION_INSTRUCTION_RENDERER_IMPLEMENTATION_ROLE_PATHS_V002,
} from './run_presentation_instruction_renderer_job_v002.ts';

const TASK_DESCRIPTION =
  '各captionの境界片を記載順に一度ずつ全量使用してください。cueは、直前から続く発話がそれだけで意味を読める短いまとまりになり、その末尾で発話の意味が一区切りつくように、cue終端を提示されたboundaryIdから選んでください。cue終端を意味の基準で先に決め、そのcueが一行に収まらない場合だけ行末を提示されたboundaryIdから選んでください。cue終端と行末は、語、固有名詞、反復語、読みとして一続きの文節の途中に置かないでください。必要な行末候補が複数ある場合は、二行の幅が大きく偏らない候補を選んでください。各cueはstyleLimits.maxLinesPerCue以下とし、一行に収まるcueを改行しないでください。最後のcueはcaption最後のboundaryIdで終えてください。本文、境界片、ID、順序を変更しないでください。';
const WIDTH_RULE = 'U+0000..U+00FF=1; other Unicode code point=2';
const CASE_ID = 'candidate-horror-claim-to-speed-up';
const ROOT = `evals/clip_composition/outputs/presentation/distant-connection-formal-render/${CASE_ID}-v002`;
const REPAIRED_CHROMIUM_ROOT =
  `evals/clip_composition/outputs/presentation/distant-connection-formal-render/${CASE_ID}-v003`;
const REPAIRED_CHROMIUM_SHA256 =
  'b469d05c698ccf9f4ae3dc43fb194fbdcf56f9da1fc46dcc19f2bf9fe2aa20b8';
const BASE_ROOT = 'evals/clip_composition/outputs/presentation/base-media/'
  + 'distant-connection-candidate-horror-claim-to-speed-up-audio-grid-v003';
const MEANING_PATH = 'evals/clip_composition/outputs/'
  + 'work-distant-connection-presentation-meaning-input-ymUsGrT6EaA-v001/'
  + `${CASE_ID}/meaning-input-v001.json`;
const STYLE_FIXTURE_PATH = 'evals/clip_composition/reports/presentation/test-runs/'
  + '20260814-zevo-caption-quality-v002-f-gate-attempt-0011/fixtures/source-package-v001.json';
const STYLE_REGISTRY_PATH = 'evals/clip_composition/registries/presentation/'
  + 'normal-landscape-preset-registry-v001/preset-registry.json';
const MATERIAL_REGISTRY_PATH = 'evals/clip_composition/registries/presentation/'
  + 'normal-landscape-preset-registry-v001/material-validation-index.json';
const TRUST_PATH = 'evals/clip_composition/registries/presentation/'
  + 'presentation-renderer-trust-v002/trust.json';
const RUNTIME_PATHS = Object.freeze({
  ffmpeg: '/opt/homebrew/bin/ffmpeg',
  ffprobe: '/opt/homebrew/bin/ffprobe',
  imageMagick: '/opt/homebrew/bin/magick',
  remotion: '/Users/kawafmm/workspace/zev2/runner/node_modules/@remotion/cli/remotion-cli.js',
  tsx: '/Users/kawafmm/workspace/zev2/runner/node_modules/tsx/dist/cli.mjs',
  chromium: '/Users/kawafmm/workspace/zev2/runner/node_modules/.remotion/'
    + 'chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/'
    + 'chrome-headless-shell',
});

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const formalBytes = (value: unknown) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const canonicalSha = (value: unknown) => sha256(Buffer.from(canonicalJson(value), 'utf8'));
const formalBinding = (schemaVersion: string, filePath: string, value: unknown) => ({
  schemaVersion,
  path: filePath,
  fileSha256: sha256(formalBytes(value)),
  canonicalSha256: canonicalSha(value),
});
const byteBinding = (filePath: string, bytes: Uint8Array) => ({
  path: filePath,
  fileSha256: sha256(bytes),
});
const parse = (bytes: Uint8Array) => JSON.parse(Buffer.from(bytes).toString('utf8'));

async function readInputs(workspaceRoot: string) {
  const read = (relative: string) => readFile(path.join(workspaceRoot, relative));
  const [meaningBytes, timelineBytes, manifestBytes, reportBytes, mediaBytes, fixtureBytes,
    styleBytes, materialBytes, trustBytes] = await Promise.all([
    read(MEANING_PATH), read(`${BASE_ROOT}/timeline.json`),
    read(`${BASE_ROOT}/generation-manifest.json`), read(`${BASE_ROOT}/validation-report.json`),
    read(`${BASE_ROOT}/base-media.mp4`), read(STYLE_FIXTURE_PATH), read(STYLE_REGISTRY_PATH),
    read(MATERIAL_REGISTRY_PATH), read(TRUST_PATH),
  ]);
  return {
    meaningBytes, meaning: parse(meaningBytes), timelineBytes, timeline: parse(timelineBytes),
    manifestBytes, manifest: parse(manifestBytes), reportBytes, report: parse(reportBytes),
    mediaBytes, fixture: parse(fixtureBytes), styleBytes, style: parse(styleBytes),
    materialBytes, material: parse(materialBytes), trustBytes, trust: parse(trustBytes),
  };
}

function assertMeaningInput(meaning: any) {
  if (meaning?.schemaVersion !== 'distant-connection-presentation-meaning-input-v001'
    || meaning.candidateId !== CASE_ID
    || meaning.sourceVideoId !== 'ymUsGrT6EaA'
    || meaning.orderedParts?.length !== 2
    || meaning.orderedParts[0].part !== 'first'
    || meaning.orderedParts[1].part !== 'second'
    || meaning.atomOccurrences?.length !== 38
    || meaning.captions?.length !== 1) throw new Error('formal meaning input mismatch');
}

export async function buildDistantConnectionPresentationFormalRenderV001(
  workspaceRoot = process.cwd(),
) {
  const input = await readInputs(workspaceRoot);
  assertMeaningInput(input.meaning);
  const captionId = `${CASE_ID}-input-caption`;
  const semanticCaption = input.meaning.captions[0];
  const atoms = input.meaning.atomOccurrences;
  const boundaries = atoms.map((atom: any, index: number) => ({
    boundaryId: `${captionId}-boundary-${String(index + 1).padStart(6, '0')}`,
    ordinal: index + 1,
    afterAtomOccurrenceId: atom.atomOccurrenceId,
  }));
  const meaningBinding = formalBinding(input.meaning.schemaVersion, MEANING_PATH, input.meaning);
  const baseMediaInput = {
    baseMedia: byteBinding(`${BASE_ROOT}/base-media.mp4`, input.mediaBytes),
    timeline: formalBinding(input.timeline.schemaVersion, `${BASE_ROOT}/timeline.json`, input.timeline),
    generationManifest: formalBinding(
      input.manifest.schemaVersion, `${BASE_ROOT}/generation-manifest.json`, input.manifest,
    ),
    validationReceipt: formalBinding(
      input.report.schemaVersion, `${BASE_ROOT}/validation-report.json`, input.report,
    ),
  };
  const styleContext = structuredClone(input.fixture.reconstructionMap.caseContexts[0]);
  const sourcePackage = {
    schemaVersion: 'presentation-output-caption-cue-source-package-v001',
    packageId: `${CASE_ID}-caption-cue-source-v001`,
    promptInput: {
      schemaVersion: 'presentation-zevo-caption-selection-input-v001',
      taskDescription: TASK_DESCRIPTION,
      captions: [{
        captionId,
        boundaryCandidates: atoms.map((atom: any, index: number) => ({
          boundaryId: boundaries[index].boundaryId,
          text: atom.text,
        })),
      }],
      styleLimits: {
        maxLogicalWidthPerLine: 36,
        maxLinesPerCue: 2,
        characterWidthRule: WIDTH_RULE,
      },
    },
    reconstructionMap: {
      meaningPackageBindings: [meaningBinding],
      captions: [{
        captionId,
        meaningPackageOrdinal: 1,
        semanticCaptionId: semanticCaption.captionId,
        atomOccurrenceIds: [...semanticCaption.atomOccurrenceIds],
        boundaries,
      }],
      caseContexts: [{
        caseId: CASE_ID,
        inputCaptionId: captionId,
        meaningPackageBinding: meaningBinding,
        baseMediaInput,
        horizontalStyleInput: styleContext.horizontalStyleInput,
        styleBindings: styleContext.styleBindings,
        resolvedStyle: styleContext.resolvedStyle,
      }],
    },
    provenance: {
      sourcePackageJobBinding: formalBinding(
        'distant-connection-presentation-formal-render-job-v001',
        `${ROOT}/formal-render-materialization-job-v001.json`,
        {schemaVersion: 'distant-connection-presentation-formal-render-job-v001', caseId: CASE_ID},
      ),
      implementationBindings: [{
        role: 'distant-connection-presentation-formal-render-v001',
        path: 'evals/clip_composition/distant_connection_presentation_formal_render_v001.mts',
        fileSha256: sha256(await readFile(path.join(
          workspaceRoot, 'evals/clip_composition/distant_connection_presentation_formal_render_v001.mts',
        ))),
      }],
      approvedContractBindings: [{
        role: 'distant-connection-presentation-meaning-input-v001',
        path: 'runner/src/distant-connection-presentation-meaning-input-v001.ts',
        fileSha256: sha256(await readFile(path.join(
          workspaceRoot, 'runner/src/distant-connection-presentation-meaning-input-v001.ts',
        ))),
      }],
    },
  };
  const sourceValidation = validatePresentationOutputCaptionCueSourcePackageV001(sourcePackage);
  if (sourceValidation.status !== 'passed') throw new Error(JSON.stringify(sourceValidation));
  const sourcePath = `${ROOT}/source-package-v001.json`;
  const sourceBinding = formalBinding(sourcePackage.schemaVersion, sourcePath, sourcePackage);
  const firstEnd = input.meaning.orderedParts[0].atomOccurrenceIds.length;
  const firstBangIndex = atoms.findIndex(
    (atom: any, index: number) => index >= firstEnd && atom.text === '!',
  );
  if (firstBangIndex < firstEnd || firstBangIndex >= atoms.length - 1) {
    throw new Error('expected punctuation line boundary is missing');
  }
  const selection = {
    schemaVersion: 'presentation-output-caption-cue-selection-v001',
    selectionId: `${CASE_ID}-deterministic-caption-selection-v001`,
    sourcePackageBinding: sourceBinding,
    response: {captions: [{captionId, cues: [
      {
        cueEndBoundaryId: boundaries[firstEnd - 1].boundaryId,
        lineEndBoundaryIds: [boundaries[firstEnd - 1].boundaryId],
      },
      {
        cueEndBoundaryId: boundaries.at(-1)!.boundaryId,
        lineEndBoundaryIds: [boundaries[firstBangIndex].boundaryId, boundaries.at(-1)!.boundaryId],
      },
    ]}]},
  };
  const selectionPath = `${ROOT}/cue-selection-v001.json`;
  const selectionDigest = {
    schemaVersion: selection.schemaVersion,
    artifactId: selection.selectionId,
    fileSha256: sha256(formalBytes(selection)),
    canonicalSha256: canonicalSha(selection),
  };
  const producerJobBinding = sourcePackage.provenance.sourcePackageJobBinding;
  const projectionBuilt = buildPresentationCueEndProjectionV001({
    projectionId: `${CASE_ID}-cue-end-projection-v001`, sourcePackageBinding: sourceBinding,
    sourceSelectionDigest: selectionDigest, producerJobBinding, sourcePackage, selection,
  });
  if (projectionBuilt.status !== 'built') throw new Error(JSON.stringify(projectionBuilt));
  const projection = projectionBuilt.projection;
  const projectionPath = `${ROOT}/cue-end-projection-v001.json`;
  const projectionBinding = buildPresentationCueEndProjectionBindingV001({
    path: projectionPath, projection,
  });
  const lineBuilt = buildPresentationSemanticLineEndProjectionV001({
    projectionId: `${CASE_ID}-semantic-line-end-projection-v001`,
    sourcePackageBinding: sourceBinding, cueEndProjectionBinding: projectionBinding,
    sourceSelectionDigest: selectionDigest, producerJobBinding, sourcePackage, selection,
    cueEndProjection: projection,
  });
  if (lineBuilt.status !== 'built') throw new Error(JSON.stringify(lineBuilt));
  const lineProjection = lineBuilt.projection;
  const linePath = `${ROOT}/semantic-line-end-projection-v001.json`;
  const lineBinding = buildPresentationSemanticLineEndProjectionBindingV001({
    path: linePath, projection: lineProjection,
  });
  const instructionBuilt = buildPresentationCaptionInstructionArtifactV002({
    artifactId: `${CASE_ID}-presentation-instruction-v002`, sourceCaseId: CASE_ID,
    meaningInformationPackageBinding: meaningBinding,
    timelineBinding: baseMediaInput.timeline, cueEndProjectionBinding: projectionBinding,
    producerJobBinding, styleProfileId: 'normal-landscape-readable-pop-v001',
    meaningPackage: input.meaning, timeline: input.timeline, cueEndProjection: projection,
  });
  if (instructionBuilt.status !== 'built') throw new Error(JSON.stringify(instructionBuilt));
  const instruction = instructionBuilt.artifact;
  const instructionPath = `${ROOT}/presentation-instruction-v002.json`;
  const instructionBinding = buildPresentationInstructionArtifactBindingV002({
    path: instructionPath, artifact: instruction,
  });
  const runtimeBindings = Object.fromEntries(await Promise.all(Object.entries(RUNTIME_PATHS).map(
    async ([role, runtimePath]) => [role, byteBinding(runtimePath, await readFile(runtimePath))],
  )));
  const implementationBindings = await Promise.all(
    PRESENTATION_INSTRUCTION_RENDERER_IMPLEMENTATION_ROLE_PATHS_V002.map(
      async ([role, filePath]) => ({
        role, path: filePath, fileSha256: sha256(await readFile(path.join(workspaceRoot, filePath))),
      }),
    ),
  );
  const approvedContractBindings = await Promise.all(
    PRESENTATION_INSTRUCTION_RENDERER_CONTRACT_ROLE_PATHS_V002.map(
      async ([role, filePath]) => ({
        role, path: filePath, fileSha256: sha256(await readFile(path.join(workspaceRoot, filePath))),
      }),
    ),
  );
  const styleBinding = formalBinding(input.style.schemaVersion, STYLE_REGISTRY_PATH, input.style);
  const materialBinding = formalBinding(
    input.material.registryVersion, MATERIAL_REGISTRY_PATH, input.material,
  );
  const trustBinding = formalBinding(input.trust.schemaVersion, TRUST_PATH, input.trust);
  const job = {
    schemaVersion: 'presentation-instruction-renderer-job-v002',
    jobId: `${CASE_ID}-formal-render-v001`, attemptId: 'attempt-0001',
    instructionArtifactBinding: instructionBinding,
    lineEndProjectionBinding: lineBinding,
    cropAppliedBaseMedia: baseMediaInput,
    executionInputs: {
      format: 'normal-landscape', canvas: {width: 1920, height: 1080, fps: 30},
      screenLayoutId: null, visualStateId: 'caption-core-v001',
      cropPolicy: {mode: 'already-applied'}, sceneTransitionPolicy: {mode: 'straight-cut'},
      audioPolicy: {mode: 'preserve-source'}, lineLayoutRules: {
        'speech-caption': 'semantic-line-end-projection-v001', title: 'greedy-code-point-v001',
      },
    },
    registryBindings: {
      styleProfileRegistry: styleBinding, materialRegistry: materialBinding,
      fontLedger: {...trustBinding, jsonPointer: '/fontAssets',
        valueCanonicalSha256: canonicalSha(input.trust.fontAssets)},
      rendererTrust: trustBinding,
    },
    runtimeBindings, rendererImplementationBindings: implementationBindings,
    approvedContractBindings,
    publication: {
      admissionReceiptPath: `${ROOT}/admission-receipt-v002.json`,
      lineLayoutPath: `${ROOT}/line-layout-v002.json`,
      renderOutputRoot: `${ROOT}/render-output-v001`,
    },
  };
  serializePresentationInstructionRendererJobV002(job);
  return {root: ROOT, input, sourcePackage, sourcePath, selection, selectionPath, projection,
    projectionPath, lineProjection, linePath, instruction, instructionPath, job,
    jobPath: `${ROOT}/renderer-job-v002.json`};
}

export async function materializeDistantConnectionPresentationFormalRenderV001(
  workspaceRoot = process.cwd(),
) {
  const built = await buildDistantConnectionPresentationFormalRenderV001(workspaceRoot);
  const outputRoot = path.join(workspaceRoot, built.root);
  await mkdir(path.dirname(outputRoot), {recursive: true});
  await mkdir(outputRoot, {recursive: false});
  const entries: [string, Uint8Array][] = [
    [built.sourcePath, formalBytes(built.sourcePackage)],
    [built.selectionPath, formalBytes(built.selection)],
    [built.projectionPath, serializePresentationCueEndProjectionV001(built.projection)],
    [built.linePath, serializePresentationSemanticLineEndProjectionV001(built.lineProjection)],
    [built.instructionPath, serializePresentationInstructionArtifactV002(built.instruction)],
    [built.jobPath, serializePresentationInstructionRendererJobV002(built.job)],
  ];
  for (const [relative, bytes] of entries) {
    await writeFile(path.join(workspaceRoot, relative), bytes, {flag: 'wx'});
  }
  return {status: 'materialized', root: built.root, files: entries.map(([filePath, bytes]) => ({
    path: filePath, fileSha256: sha256(bytes),
  }))};
}

export async function materializeDistantConnectionPresentationRendererRetryV001(
  workspaceRoot = process.cwd(),
) {
  const originalJobPath = `${ROOT}/renderer-job-v002.json`;
  const job = parse(await readFile(path.join(workspaceRoot, originalJobPath)));
  job.attemptId = 'attempt-0002';
  job.publication = {
    admissionReceiptPath: `${ROOT}/admission-receipt-v002-attempt-0002.json`,
    lineLayoutPath: `${ROOT}/line-layout-v002-attempt-0002.json`,
    renderOutputRoot: `${ROOT}/render-output-v001-attempt-0002`,
  };
  const bytes = serializePresentationInstructionRendererJobV002(job);
  const jobPath = `${ROOT}/renderer-job-v002-attempt-0002.json`;
  await writeFile(path.join(workspaceRoot, jobPath), bytes, {flag: 'wx'});
  return {status: 'materialized', path: jobPath, fileSha256: sha256(bytes)};
}

export async function buildDistantConnectionPresentationRendererRepairedChromiumV001(
  workspaceRoot = process.cwd(),
) {
  const sourceJobPath = `${ROOT}/renderer-job-v002-attempt-0002.json`;
  const sourceJob = parse(await readFile(path.join(workspaceRoot, sourceJobPath)));
  const observedChromiumSha256 = sha256(await readFile(RUNTIME_PATHS.chromium));
  if (observedChromiumSha256 !== REPAIRED_CHROMIUM_SHA256) {
    throw new Error('repaired Chromium SHA mismatch');
  }
  const job = structuredClone(sourceJob);
  job.jobId = `${CASE_ID}-formal-render-repaired-chromium-v001`;
  job.attemptId = 'attempt-0001';
  job.runtimeBindings.chromium.fileSha256 = observedChromiumSha256;
  job.publication = {
    admissionReceiptPath: `${REPAIRED_CHROMIUM_ROOT}/admission-receipt-v002.json`,
    lineLayoutPath: `${REPAIRED_CHROMIUM_ROOT}/line-layout-v002.json`,
    renderOutputRoot: `${REPAIRED_CHROMIUM_ROOT}/render-output-v001`,
  };
  const expected = structuredClone(sourceJob);
  expected.jobId = job.jobId;
  expected.attemptId = job.attemptId;
  expected.runtimeBindings.chromium.fileSha256 = observedChromiumSha256;
  expected.publication = structuredClone(job.publication);
  if (JSON.stringify(job) !== JSON.stringify(expected)) {
    throw new Error('formal render job changed outside the approved runtime binding and paths');
  }
  const bytes = serializePresentationInstructionRendererJobV002(job);
  return {
    root: REPAIRED_CHROMIUM_ROOT,
    sourceJobPath,
    sourceJob,
    job,
    jobPath: `${REPAIRED_CHROMIUM_ROOT}/renderer-job-v002.json`,
    bytes,
  };
}

export async function materializeDistantConnectionPresentationRendererRepairedChromiumV001(
  workspaceRoot = process.cwd(),
) {
  const built = await buildDistantConnectionPresentationRendererRepairedChromiumV001(
    workspaceRoot,
  );
  await mkdir(path.join(workspaceRoot, built.root), {recursive: false});
  await writeFile(path.join(workspaceRoot, built.jobPath), built.bytes, {flag: 'wx'});
  return {
    status: 'materialized',
    path: built.jobPath,
    fileSha256: sha256(built.bytes),
    chromiumSha256: built.job.runtimeBindings.chromium.fileSha256,
  };
}

if (process.argv[1]?.endsWith('distant_connection_presentation_formal_render_v001.mts')) {
  const action = process.argv[2] === 'retry-2'
    ? materializeDistantConnectionPresentationRendererRetryV001
    : process.argv[2] === 'rebind-repaired-chromium'
      ? materializeDistantConnectionPresentationRendererRepairedChromiumV001
      : materializeDistantConnectionPresentationFormalRenderV001;
  action().then(result => {
    process.stdout.write(`${JSON.stringify(result)}\n`);
  }).catch(error => {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exitCode = 1;
  });
}
