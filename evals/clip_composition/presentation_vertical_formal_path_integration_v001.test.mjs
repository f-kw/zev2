import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {
  closeSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {
  buildPresentationCaptionDisplayContainersFormatNeutralV003,
} from './presentation_caption_display_pair_v003.mjs';
import {
  buildPresentationCaptionSemanticCompilerInputV001,
} from './presentation_caption_semantic_output_v001.mjs';
import {
  canonicalizePresentationCaptionB1JsonV001,
  serializePresentationCaptionB1FormalJsonV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  evaluatePresentationRendererQcWithProfileV001,
  evaluatePresentationReviewRendererQcV003,
} from './presentation_renderer_qc_v002.mjs';
import {
  PRESENTATION_CAPTION_PACKAGE_FILES_V001,
} from './verify_presentation_caption_semantic_source_package_v002_transition_v001.mjs';

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, '../..');
const OUTPUT_ROOT = 'evals/clip_composition/outputs/presentation';
const CANDIDATE_13_COMMIT = 'cfa7811c917892fccd39edf9c85aa6e3af2dde97';
const CANDIDATE_59_COMMIT = '09ce3c980e9607b6265b1062e05f3ef171f3c72c';
const CANDIDATE_13_ID = 'DmWu0jVQfTE-candidate-13';
const CANDIDATE_59_ID = 'qdczJpv8RCc-candidate-59';
const CANDIDATE_13_HORIZONTAL_FORMAL_FAMILIES = Object.freeze([
  'base-media',
  'caption-display-pair-generation-jobs',
  'caption-display-pair-static-preflight-jobs',
  'caption-display-pairs',
  'caption-gate-b5',
  'caption-gate-b6',
  'caption-semantic-output-check-jobs',
  'caption-semantic-raw-outputs',
  'caption-semantic-source-package-jobs',
  'caption-semantic-source-package-preflight-jobs',
  'retained-source-atoms',
  'review-render-jobs',
  'review-renders',
  'segmenter-boundary-evidence',
  'segmenter-boundary-preflight-jobs',
]);
const CANDIDATE_59_HORIZONTAL_FORMAL_FAMILIES = Object.freeze([
  'base-media',
  'base-media-build-jobs',
  'caption-display-pair-generation-jobs',
  'caption-display-pair-static-preflight-jobs',
  'caption-display-pairs',
  'caption-gate-b5',
  'caption-gate-b6',
  'caption-gate-b6-jobs',
  'caption-local-reselections',
  'caption-semantic-output-check-jobs',
  'caption-semantic-raw-outputs',
  'caption-semantic-source-package-jobs',
  'caption-semantic-source-package-preflight-jobs',
  'diagnostics',
  'retained-source-atoms',
  'review-render-jobs',
  'review-renders',
  'segmenter-boundary-evidence',
  'segmenter-boundary-preflight-jobs',
  'source-assembly-formalization-jobs',
  'source-assembly-formalizations',
  'source-assembly-human-results',
  'source-finalization-jobs',
  'source-review-preparation-jobs',
  'source-review-preparations',
]);

const B3_ROOT =
  `${OUTPUT_ROOT}/segmenter-boundary-evidence/DmWu0jVQfTE-candidate-13-v001`;
const B6_ROOT =
  `${OUTPUT_ROOT}/caption-gate-b6/DmWu0jVQfTE-candidate-13-v004`;
const RAW_SEMANTIC_OUTPUT =
  `${OUTPUT_ROOT}/caption-semantic-raw-outputs/`
  + 'DmWu0jVQfTE-candidate-13-caption-b6-v004.json';
const RETAINED_SOURCE_ATOMS =
  `${OUTPUT_ROOT}/retained-source-atoms/`
  + 'DmWu0jVQfTE-candidate-13-v001/source-atoms.json';
const PAIR_ROOT =
  `${OUTPUT_ROOT}/caption-display-pairs/`
  + 'DmWu0jVQfTE-candidate-13-caption-b6-v004';
const RENDER_ROOT =
  `${OUTPUT_ROOT}/review-renders/`
  + 'DmWu0jVQfTE-candidate-13-caption-b6-v004-v002';
const RENDER_PLAN =
  `${RENDER_ROOT}/presentation-review-render-plan-v003.json`;
const RENDER_APPLICATION_RESULTS =
  `${RENDER_ROOT}/presentation-review-render-application-results-v003.json`;
const RENDER_QC =
  `${RENDER_ROOT}/presentation-review-render-qc-v003.json`;
const B1_JOB =
  `${OUTPUT_ROOT}/caption-semantic-output-check-jobs/`
  + 'DmWu0jVQfTE-candidate-13-caption-b6-v004.json';
const B4_JOB =
  `${OUTPUT_ROOT}/caption-display-pair-generation-jobs/`
  + 'DmWu0jVQfTE-candidate-13-caption-b6-v004.json';
const REVIEW_JOB =
  `${OUTPUT_ROOT}/review-render-jobs/`
  + 'DmWu0jVQfTE-candidate-13-caption-b6-v004-v001.json';
const RENDERER_TRUST =
  'evals/clip_composition/registries/presentation/'
  + 'presentation-renderer-trust-v001/trust.json';

const CURRENT_IMPLEMENTATION_SHA256 = Object.freeze({
  'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs':
    'ac3dcbbc671af6f56dcceeea6a41c8ae9cbf9fc4ba28a8a00bbc5d6faff45bcd',
  'evals/clip_composition/presentation_caption_semantic_output_v001.mjs':
    '9b9bb011dcd198e02cb075b70e79d3090ddfe17694198f56b83726f004e78c6d',
  'evals/clip_composition/run_presentation_caption_gate_b6_v001.mjs':
    '636a733d1036158e7269022ca3ae6105c51ae595907874c6a6b1d53e8f3cff1d',
  'evals/clip_composition/presentation_instruction_contract_v003.mjs':
    'c0a3c791c74a8c303e97e1fe0c81b8017c5dee35bd93e57668d8e11fa24925e7',
  'evals/clip_composition/presentation_caption_display_pair_v003.mjs':
    'a22aa6ad44a7cd07c75ba1ebde4d40601efe29915ca6cfe915f4e1a3d8808a04',
  'evals/clip_composition/run_presentation_caption_display_pair_job_v001.mjs':
    '567757847273ba52dd82ea7c497531f5767a28ed8082072331d38e15605d8204',
  'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs':
    'e83157cfe72197940193c9bd07a4f8c9be4b1716617dc55bf90e1e8c4f33812e',
  'evals/clip_composition/render_presentation_v002.mjs':
    'd02d603f3fc04f9ab58ce889644f5e63bf17d7ec5cb19019e09110c6167a720b',
  'evals/clip_composition/presentation_renderer_qc_v002.mjs':
    '73ede4f3556f80afac98b8e0e3c4b81019f718b4644d2b3f8cb1ac037989f0d3',
  'runner/src/remotion/Root.tsx':
    'a08c4c888a0fcd356dc0911732aeb51badd3420305056b1d02ac109b39d0fd23',
  'runner/src/remotion/renderer/TelopRenderer.tsx':
    '7fe1296f6884c90acadb61dcd2e45c81d24e2fddac14cf78b120897f05ca289b',
  'runner/src/telop-remotion.ts':
    '4d641312585a41f0a0f539738f27c3df09c8b289952c6bb36d8e9f33dcc53812',
  'runner/src/telop-style.ts':
    '22d4fea92a0cb96f83cbf0dc85a80cc320950cc9052e357056218d24fc100847',
});

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const git = (args, options = {}) => execFileSync('git', args, {
  cwd: WORKSPACE_ROOT,
  encoding: null,
  maxBuffer: 256 * 1024 * 1024,
  ...options,
});
const statProjection = (stat) => ({
  device: stat.dev.toString(),
  inode: stat.ino.toString(),
  mode: stat.mode.toString(),
  size: stat.size.toString(),
  modifiedNanoseconds: stat.mtimeNs.toString(),
  changedNanoseconds: stat.ctimeNs.toString(),
});

const readStable = (repositoryPath) => {
  const absolutePath = path.resolve(WORKSPACE_ROOT, repositoryPath);
  const before = lstatSync(absolutePath, {bigint: true});
  assert.equal(before.isFile(), true, repositoryPath);
  assert.equal(before.isSymbolicLink(), false, repositoryPath);
  const descriptor = openSync(absolutePath, 'r');
  let openedBefore;
  let bytes;
  let openedAfter;
  try {
    openedBefore = fstatSync(descriptor, {bigint: true});
    bytes = readFileSync(descriptor);
    openedAfter = fstatSync(descriptor, {bigint: true});
  } finally {
    closeSync(descriptor);
  }
  const after = lstatSync(absolutePath, {bigint: true});
  assert.deepEqual(statProjection(openedBefore), statProjection(before), repositoryPath);
  assert.deepEqual(statProjection(openedAfter), statProjection(before), repositoryPath);
  assert.deepEqual(statProjection(after), statProjection(before), repositoryPath);
  return bytes;
};

const readJsonStable = (repositoryPath) =>
  JSON.parse(readStable(repositoryPath).toString('utf8'));

const assertTagArtifactsUnchanged = (repositoryPaths, commit = CANDIDATE_13_COMMIT) => {
  const observations = repositoryPaths.map((repositoryPath) => {
    const baseline = git(['show', `${commit}:${repositoryPath}`]);
    const current = readStable(repositoryPath);
    assert.deepEqual(current, baseline, repositoryPath);
    return {path: repositoryPath, byteSha256: sha256(current)};
  });
  return observations;
};

const parseMetric = (output, name) => {
  const match = output.match(new RegExp(`^\\s*# ${name} (\\d+)\\s*$`, 'mu'));
  assert.notEqual(match, null, `${name} metric is absent`);
  return Number(match[1]);
};

const runNodeTests = (repositoryPath, pattern = null) => {
  const args = ['--test', '--test-reporter=tap'];
  if (pattern !== null) args.push(`--test-name-pattern=${pattern}`);
  args.push(repositoryPath);
  const childEnvironment = {...process.env};
  delete childEnvironment.NODE_TEST_CONTEXT;
  const run = spawnSync(process.execPath, args, {
    cwd: WORKSPACE_ROOT,
    env: childEnvironment,
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 64 * 1024 * 1024,
  });
  assert.equal(run.error, undefined);
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
  return {
    tests: parseMetric(run.stdout, 'tests'),
    pass: parseMetric(run.stdout, 'pass'),
    fail: parseMetric(run.stdout, 'fail'),
    skipped: parseMetric(run.stdout, 'skipped'),
  };
};

const implementationPaths = (...values) => [...new Set(values.flat())].sort();
const bindingPaths = (binding) => [
  ...(binding?.files ?? []),
  ...(binding?.dependencyFiles ?? []),
].map(({path: repositoryPath}) => repositoryPath);

const assertApprovedCurrentImplementations = (relevantPaths, approvedPaths) => {
  const approved = new Set(approvedPaths);
  const changed = [];
  const observations = [];
  for (const repositoryPath of implementationPaths(relevantPaths, approvedPaths)) {
    const current = readStable(repositoryPath);
    const baseline = git(['show', `HEAD:${repositoryPath}`]);
    const currentSha256 = sha256(current);
    if (!current.equals(baseline)) {
      assert.equal(approved.has(repositoryPath), true, repositoryPath);
      changed.push(repositoryPath);
    }
    if (approved.has(repositoryPath)) {
      assert.equal(
        currentSha256,
        CURRENT_IMPLEMENTATION_SHA256[repositoryPath],
        repositoryPath,
      );
    }
    observations.push({path: repositoryPath, currentSha256});
  }
  assert.deepEqual(changed.sort(), [...approved].sort());
  return observations.filter(({path: repositoryPath}) => approved.has(repositoryPath));
};

const isCandidateArtifactName = (artifactName, candidateId) =>
  artifactName === candidateId || artifactName.startsWith(`${candidateId}-`);

const parseTree = (commit, candidateId) => git([
  'ls-tree',
  '-r',
  '-z',
  commit,
  '--',
  OUTPUT_ROOT,
]).toString('utf8').split('\0').filter(Boolean).map((entry) => {
  const match = entry.match(/^(\d+) (blob) ([0-9a-f]+)\t(.+)$/u);
  assert.notEqual(match, null, entry);
  return {mode: match[1], oid: match[3], path: match[4]};
}).filter(({path: repositoryPath}) => isCandidateArtifactName(
  formalArtifactIdentity(repositoryPath).artifactName,
  candidateId,
))
  .sort((left, right) => left.path.localeCompare(right.path, 'en'));

const parseIndex = () => git([
  'ls-files',
  '--stage',
  '-z',
  '--',
  OUTPUT_ROOT,
]).toString('utf8').split('\0').filter(Boolean).map((entry) => {
  const match = entry.match(/^(\d+) ([0-9a-f]+) (\d+)\t(.+)$/u);
  assert.notEqual(match, null, entry);
  return {mode: match[1], oid: match[2], stage: Number(match[3]), path: match[4]};
}).sort((left, right) => left.path.localeCompare(right.path, 'en'));

const treeDigest = (entries) => {
  const hash = createHash('sha256');
  for (const entry of entries) {
    hash.update(entry.path);
    hash.update('\0');
    hash.update(entry.oid);
    hash.update('\n');
  }
  return hash.digest('hex');
};

const formalFamily = (repositoryPath) =>
  repositoryPath.slice(`${OUTPUT_ROOT}/`.length).split('/')[0];

const formalArtifactIdentity = (repositoryPath) => {
  assert.equal(repositoryPath.startsWith(`${OUTPUT_ROOT}/`), true, repositoryPath);
  const [family, nestedArtifactName, ...children] = repositoryPath
    .slice(`${OUTPUT_ROOT}/`.length)
    .split('/');
  assert.equal(typeof family, 'string', repositoryPath);
  assert.equal(family.length > 0, true, repositoryPath);
  if (nestedArtifactName === undefined) {
    return {
      key: family,
      family,
      artifactName: family,
      rootPath: `${OUTPUT_ROOT}/${family}`,
      kind: 'file',
    };
  }
  const artifactName = nestedArtifactName;
  assert.equal(typeof artifactName, 'string', repositoryPath);
  assert.equal(artifactName.length > 0, true, repositoryPath);
  return {
    key: `${family}/${artifactName}`,
    family,
    artifactName,
    rootPath: `${OUTPUT_ROOT}/${family}/${artifactName}`,
    kind: children.length === 0 ? 'file' : 'directory',
  };
};

const formalProjection = (entries) => entries.map(({mode, oid, path: repositoryPath}) => ({
  mode,
  oid,
  path: repositoryPath,
}));

const assertFormalProjectionEqual = (actual, expected, label) => {
  assert.deepEqual(formalProjection(actual), formalProjection(expected), label);
};

const buildFormalArtifactIdentityMap = (repositoryPaths) => {
  const identities = new Map();
  for (const repositoryPath of repositoryPaths) {
    const identity = formalArtifactIdentity(repositoryPath);
    const existing = identities.get(identity.key);
    if (existing !== undefined) {
      assert.equal(existing.kind, identity.kind, identity.key);
      continue;
    }
    identities.set(identity.key, identity);
  }
  return identities;
};

const classifyCandidateFormalPaths = ({
  repositoryPaths,
  candidateId,
  formalFamilies,
  baselineIdentities,
}) => {
  const formalFamilySet = new Set(formalFamilies);
  const protectedPaths = [];
  const verticalSiblingPaths = [];
  const unexpectedSiblingPaths = [];
  for (const repositoryPath of repositoryPaths) {
    const identity = formalArtifactIdentity(repositoryPath);
    if (
      !isCandidateArtifactName(identity.artifactName, candidateId)
      || !formalFamilySet.has(identity.family)
    ) {
      continue;
    }
    const baselineIdentity = baselineIdentities.get(identity.key);
    if (baselineIdentity !== undefined && baselineIdentity.kind === identity.kind) {
      protectedPaths.push(repositoryPath);
      continue;
    }
    if (identity.artifactName.startsWith(`${candidateId}-vertical-`)) {
      verticalSiblingPaths.push(repositoryPath);
      continue;
    }
    unexpectedSiblingPaths.push(repositoryPath);
  }
  const comparePath = (left, right) => left.localeCompare(right, 'en');
  return {
    protectedPaths: protectedPaths.sort(comparePath),
    verticalSiblingPaths: verticalSiblingPaths.sort(comparePath),
    unexpectedSiblingPaths: unexpectedSiblingPaths.sort(comparePath),
  };
};

const assertFormalTreeUnchanged = (commit, candidateId, formalFamilies) => {
  const baseline = parseTree(commit, candidateId);
  assert.equal(baseline.length > 0, true);
  assert.equal(baseline.every(({mode}) => mode === '100644'), true);
  assert.deepEqual(
    [...new Set(baseline.map(({path: repositoryPath}) => formalFamily(repositoryPath)))]
      .sort((left, right) => left.localeCompare(right, 'en')),
    [...formalFamilies].sort((left, right) => left.localeCompare(right, 'en')),
  );
  const baselinePaths = baseline.map(({path: repositoryPath}) => repositoryPath);
  const baselineIdentities = buildFormalArtifactIdentityMap(baselinePaths);
  const indexEntries = parseIndex();
  const indexByPath = new Map(indexEntries.map((entry) => [entry.path, entry]));
  assert.equal(indexByPath.size, indexEntries.length);
  const classification = classifyCandidateFormalPaths({
    repositoryPaths: indexEntries.map(({path: repositoryPath}) => repositoryPath),
    candidateId,
    formalFamilies,
    baselineIdentities,
  });
  assert.deepEqual(classification.unexpectedSiblingPaths, []);
  assert.deepEqual(classification.protectedPaths, baselinePaths);
  const currentPaths = classification.protectedPaths;
  const currentIndex = currentPaths.map((repositoryPath) => {
    const entry = indexByPath.get(repositoryPath);
    assert.notEqual(entry, undefined, repositoryPath);
    assert.equal(entry.stage, 0, repositoryPath);
    return entry;
  });
  assertFormalProjectionEqual(currentIndex, baseline, `${candidateId}: index`);

  const beforeStats = currentPaths.map((repositoryPath) =>
    statProjection(lstatSync(path.resolve(WORKSPACE_ROOT, repositoryPath), {bigint: true})));
  assert.equal(currentPaths.every((repositoryPath) => !repositoryPath.includes('\n')), true);
  const currentOids = git(
    ['hash-object', '--no-filters', '--stdin-paths'],
    {input: `${currentPaths.join('\n')}\n`},
  ).toString('utf8').trim().split('\n');
  const afterStats = currentPaths.map((repositoryPath) =>
    statProjection(lstatSync(path.resolve(WORKSPACE_ROOT, repositoryPath), {bigint: true})));
  assert.deepEqual(afterStats, beforeStats);
  assert.equal(currentOids.length, baseline.length);
  const current = baseline.map((entry, index) => ({
    ...entry,
    oid: currentOids[index],
  }));
  assertFormalProjectionEqual(current, baseline, `${candidateId}: worktree`);
  assert.equal(treeDigest(current), treeDigest(baseline));
  return {
    candidateId,
    pathCount: baseline.length,
    excludedVerticalSiblingPathCount: classification.verticalSiblingPaths.length,
    treeSha256: treeDigest(current),
  };
};

const stableSnapshot = (repositoryPath) => {
  const bytes = readStable(repositoryPath);
  return {
    path: repositoryPath,
    fileSha256: sha256(bytes),
    bytes,
  };
};

const candidate13LiveCompilerInput = () => {
  const context = {
    sourcePackageSnapshots: PRESENTATION_CAPTION_PACKAGE_FILES_V001.map(
      (fileName) => stableSnapshot(`${B3_ROOT}/${fileName}`),
    ),
    rawSemanticOutputSnapshot: stableSnapshot(RAW_SEMANTIC_OUTPUT),
  };
  const value = buildPresentationCaptionSemanticCompilerInputV001(context);
  const formal = serializePresentationCaptionB1FormalJsonV001(value);
  const canonical = canonicalizePresentationCaptionB1JsonV001(value);
  assert.equal(formal.status, 'serialized');
  assert.equal(canonical.status, 'canonicalized');
  return {
    value,
    formalBytes: formal.bytes,
    canonicalBytes: canonical.bytes,
  };
};

const compilerProjection = (compilerInput) => {
  const groups = compilerInput.containers.flatMap((container) => container.meaningGroups);
  const lines = groups.flatMap((group) => group.lines);
  return {
    containerCount: compilerInput.containers.length,
    meaningGroupCount: groups.length,
    lineCount: lines.length,
    boundaryCandidateCount: lines.reduce(
      (sum, line) => sum + line.boundaryCandidateIds.length,
      0,
    ),
    sourceAtomCount: lines.reduce(
      (sum, line) => sum + line.sourceAtomIds.length,
      0,
    ),
    maximumObservedLineLogicalWidth: Math.max(
      ...lines.map((line) => line.logicalWidth),
    ),
  };
};

const qcInputFromSavedFormalArtifacts = (plan, applicationReport, savedQc) => ({
  plan,
  applicationResults: applicationReport.results,
  overlayInspections: savedQc.instructionEvidence.map((evidence) => ({
    instructionId: evidence.instructionId,
    alphaMax: evidence.alphaMax,
    alphaBounds: structuredClone(evidence.alphaBounds),
    lineCount: evidence.lineCount,
    lineAlphaBounds: structuredClone(evidence.lineAlphaBounds),
    visibilityComparisonBasis: evidence.visibilityComparisonBasis,
    representativeFrame: evidence.representativeFrame,
    changedPixelsAgainstInstructionOmittedFrame:
      evidence.changedPixelsAgainstInstructionOmittedFrame,
    appliedOverlayPropsCanonicalSha256:
      evidence.appliedOverlayPropsCanonicalSha256,
    overlayFile: evidence.inspectedOverlayFile,
    overlaySha256: evidence.overlaySha256,
  })),
  mediaInspection: structuredClone(savedQc.mediaEvidence.observed),
  expectedAudio: structuredClone(savedQc.mediaEvidence.expectedAudio),
  expectedFrameCount: savedQc.mediaEvidence.expectedFrameCount,
  canvas: structuredClone(plan.canvas),
});

test('H01: candidate 13/59の保存済み正式成果物treeは認定tagから不変', (t) => {
  const candidate59Baseline = parseTree(CANDIDATE_59_COMMIT, CANDIDATE_59_ID);
  const candidate59BaselinePaths = candidate59Baseline
    .map(({path: repositoryPath}) => repositoryPath);
  const candidate59BaselineIdentities = buildFormalArtifactIdentityMap(
    candidate59BaselinePaths,
  );

  assert.throws(
    () => assertFormalProjectionEqual(
      candidate59Baseline.slice(1),
      candidate59Baseline,
      'missing horizontal path',
    ),
    assert.AssertionError,
  );
  const byteChanged = candidate59Baseline.map((entry, index) => index === 0
    ? {...entry, oid: '0'.repeat(entry.oid.length)}
    : entry);
  assert.throws(
    () => assertFormalProjectionEqual(
      byteChanged,
      candidate59Baseline,
      'changed horizontal byte',
    ),
    assert.AssertionError,
  );

  const directoryIdentity = [...candidate59BaselineIdentities.values()]
    .find(({kind}) => kind === 'directory');
  assert.notEqual(directoryIdentity, undefined);
  const horizontalRootSidecar = `${directoryIdentity.rootPath}/h01-sidecar-fixture.json`;
  const sidecarClassification = classifyCandidateFormalPaths({
    repositoryPaths: [...candidate59BaselinePaths, horizontalRootSidecar],
    candidateId: CANDIDATE_59_ID,
    formalFamilies: CANDIDATE_59_HORIZONTAL_FORMAL_FAMILIES,
    baselineIdentities: candidate59BaselineIdentities,
  });
  assert.equal(sidecarClassification.protectedPaths.includes(horizontalRootSidecar), true);
  assert.deepEqual(sidecarClassification.verticalSiblingPaths, []);
  assert.deepEqual(sidecarClassification.unexpectedSiblingPaths, []);
  assert.throws(
    () => assertFormalProjectionEqual(
      [
        ...candidate59Baseline,
        {
          mode: '100644',
          oid: '0'.repeat(candidate59Baseline[0].oid.length),
          path: horizontalRootSidecar,
        },
      ].sort((left, right) => left.path.localeCompare(right.path, 'en')),
      candidate59Baseline,
      'horizontal root sidecar',
    ),
    assert.AssertionError,
  );

  const verticalSibling = `${OUTPUT_ROOT}/caption-gate-b6/`
    + `${CANDIDATE_59_ID}-vertical-h01-fixture-v001/result.json`;
  const verticalClassification = classifyCandidateFormalPaths({
    repositoryPaths: [...candidate59BaselinePaths, verticalSibling],
    candidateId: CANDIDATE_59_ID,
    formalFamilies: CANDIDATE_59_HORIZONTAL_FORMAL_FAMILIES,
    baselineIdentities: candidate59BaselineIdentities,
  });
  assert.deepEqual(verticalClassification.protectedPaths, candidate59BaselinePaths);
  assert.deepEqual(verticalClassification.verticalSiblingPaths, [verticalSibling]);
  assert.deepEqual(verticalClassification.unexpectedSiblingPaths, []);

  const unregisteredHorizontalSibling = `${OUTPUT_ROOT}/caption-gate-b6/`
    + `${CANDIDATE_59_ID}-h01-unregistered-v001/result.json`;
  const unexpectedClassification = classifyCandidateFormalPaths({
    repositoryPaths: [...candidate59BaselinePaths, unregisteredHorizontalSibling],
    candidateId: CANDIDATE_59_ID,
    formalFamilies: CANDIDATE_59_HORIZONTAL_FORMAL_FAMILIES,
    baselineIdentities: candidate59BaselineIdentities,
  });
  assert.deepEqual(unexpectedClassification.protectedPaths, candidate59BaselinePaths);
  assert.deepEqual(unexpectedClassification.verticalSiblingPaths, []);
  assert.deepEqual(
    unexpectedClassification.unexpectedSiblingPaths,
    [unregisteredHorizontalSibling],
  );
  assert.throws(
    () => assert.deepEqual(unexpectedClassification.unexpectedSiblingPaths, []),
    assert.AssertionError,
  );

  const unrelatedChildMention = `${OUTPUT_ROOT}/caption-gate-b6/`
    + `unrelated-artifact-v001/${CANDIDATE_59_ID}-child.json`;
  const unrelatedClassification = classifyCandidateFormalPaths({
    repositoryPaths: [...candidate59BaselinePaths, unrelatedChildMention],
    candidateId: CANDIDATE_59_ID,
    formalFamilies: CANDIDATE_59_HORIZONTAL_FORMAL_FAMILIES,
    baselineIdentities: candidate59BaselineIdentities,
  });
  assert.deepEqual(unrelatedClassification.protectedPaths, candidate59BaselinePaths);
  assert.deepEqual(unrelatedClassification.verticalSiblingPaths, []);
  assert.deepEqual(unrelatedClassification.unexpectedSiblingPaths, []);

  const observations = [
    assertFormalTreeUnchanged(
      CANDIDATE_13_COMMIT,
      CANDIDATE_13_ID,
      CANDIDATE_13_HORIZONTAL_FORMAL_FAMILIES,
    ),
    assertFormalTreeUnchanged(
      CANDIDATE_59_COMMIT,
      CANDIDATE_59_ID,
      CANDIDATE_59_HORIZONTAL_FORMAL_FAMILIES,
    ),
  ];
  t.diagnostic(JSON.stringify({
    observations,
    scopeRegression: {
      horizontalRootSidecarRemainsProtected: true,
      missingHorizontalPathRejected: true,
      changedHorizontalByteRejected: true,
      separateVersionedVerticalRootExcluded: true,
      unregisteredHorizontalSiblingRejected: true,
      candidateIdMentionOutsideArtifactIdentityIgnored: true,
    },
  }));
});

test('H02: 横型B3の処理結果projectionはbyte不変', (t) => {
  const artifacts = assertTagArtifactsUnchanged(
    PRESENTATION_CAPTION_PACKAGE_FILES_V001.slice(0, 5)
      .map((fileName) => `${B3_ROOT}/${fileName}`),
  );
  const sharedCalculation = runNodeTests(
    'evals/clip_composition/test_presentation_caption_semantic_output_v001.mjs',
    '^H02:',
  );
  assert.equal(sharedCalculation.pass, 1);
  assert.equal(sharedCalculation.fail, 0);
  t.diagnostic(JSON.stringify({artifacts, sharedCalculation}));
});

test('H03: candidate 13 B6は処理結果と現在実装来歴を二層で照合する', (t) => {
  const b1Job = readJsonStable(B1_JOB);
  const b4Job = readJsonStable(B4_JOB);
  const savedValidationReport = readJsonStable(
    `${B6_ROOT}/semantic-output-validation-report.json`,
  );
  const resultProjection = assertTagArtifactsUnchanged([
    `${B6_ROOT}/b6-manifest.json`,
    `${B6_ROOT}/semantic-output-validation-report.json`,
    `${B6_ROOT}/b4-runner-output.raw.json`,
    `${PAIR_ROOT}/display-plan.json`,
    B1_JOB,
    B4_JOB,
  ]);
  const liveCompilerInput = candidate13LiveCompilerInput();
  assert.equal(
    sha256(liveCompilerInput.formalBytes),
    savedValidationReport.compilerInput.observedByteSha256,
  );
  assert.equal(
    sha256(liveCompilerInput.canonicalBytes),
    savedValidationReport.compilerInput.canonicalSha256,
  );
  assert.deepEqual(
    compilerProjection(liveCompilerInput.value),
    savedValidationReport.observedProjection,
  );
  const approvedPaths = [
    'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
    'evals/clip_composition/presentation_caption_semantic_output_v001.mjs',
    'evals/clip_composition/run_presentation_caption_gate_b6_v001.mjs',
    'evals/clip_composition/presentation_instruction_contract_v003.mjs',
    'evals/clip_composition/presentation_caption_display_pair_v003.mjs',
    'evals/clip_composition/run_presentation_caption_display_pair_job_v001.mjs',
    'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs',
  ];
  const currentImplementation = assertApprovedCurrentImplementations(
    implementationPaths(
      bindingPaths(b1Job.implementationBinding),
      bindingPaths(b4Job.implementationBinding),
      'evals/clip_composition/run_presentation_caption_gate_b6_v001.mjs',
    ),
    approvedPaths,
  );
  const sharedTransport = runNodeTests(
    'evals/clip_composition/test_presentation_caption_gate_b6_v001.mjs',
    '^v002共有送信入口はraw保存後だけ解析しusageを4値へ固定する$',
  );
  assert.equal(sharedTransport.pass, 1);
  assert.equal(sharedTransport.fail, 0);
  t.diagnostic(JSON.stringify({
    resultProjection,
    liveResultProjection: {
      compilerInputObservedByteSha256: sha256(liveCompilerInput.formalBytes),
      compilerInputCanonicalSha256: sha256(liveCompilerInput.canonicalBytes),
      observedProjection: compilerProjection(liveCompilerInput.value),
    },
    currentImplementation,
    sharedTransport,
  }));
});

test('H04: 横型B4とrendererは処理結果と現在実装来歴を二層で照合する', (t) => {
  const b4Job = readJsonStable(B4_JOB);
  const reviewJob = readJsonStable(REVIEW_JOB);
  const trust = readJsonStable(RENDERER_TRUST);
  const resultProjection = assertTagArtifactsUnchanged([
    `${PAIR_ROOT}/caption-check-report.json`,
    `${PAIR_ROOT}/display-plan.json`,
    `${PAIR_ROOT}/instruction-bundle.json`,
    `${PAIR_ROOT}/layout-preflight.json`,
    `${PAIR_ROOT}/review-render-request.json`,
    `${RENDER_ROOT}/presentation-review-render-plan-v003.json`,
    `${RENDER_ROOT}/presentation-review-render-application-results-v003.json`,
    `${RENDER_ROOT}/presentation-review-render-qc-v003.json`,
    B4_JOB,
    REVIEW_JOB,
    RENDERER_TRUST,
  ]);
  const savedDisplayPlan = readJsonStable(`${PAIR_ROOT}/display-plan.json`);
  const liveCompilerInput = candidate13LiveCompilerInput();
  const liveContainers = buildPresentationCaptionDisplayContainersFormatNeutralV003({
    compilerInput: liveCompilerInput.value,
    retainedSourceAtoms: readJsonStable(RETAINED_SOURCE_ATOMS),
  });
  const liveContainerBytes = Buffer.from(canonicalJson(liveContainers), 'utf8');
  const savedContainerBytes = Buffer.from(
    canonicalJson(savedDisplayPlan.containers),
    'utf8',
  );
  assert.deepEqual(liveContainerBytes, savedContainerBytes);
  const approvedPaths = [
    'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
    'evals/clip_composition/presentation_caption_semantic_output_v001.mjs',
    'evals/clip_composition/presentation_instruction_contract_v003.mjs',
    'evals/clip_composition/presentation_caption_display_pair_v003.mjs',
    'evals/clip_composition/run_presentation_caption_display_pair_job_v001.mjs',
    'evals/clip_composition/render_presentation_v002.mjs',
    'evals/clip_composition/presentation_renderer_qc_v002.mjs',
    'runner/src/remotion/Root.tsx',
    'runner/src/remotion/renderer/TelopRenderer.tsx',
    'runner/src/telop-remotion.ts',
    'runner/src/telop-style.ts',
  ];
  const currentImplementation = assertApprovedCurrentImplementations(
    implementationPaths(
      bindingPaths(b4Job.implementationBinding),
      reviewJob.implementationBindings.map(({path: repositoryPath}) => repositoryPath),
      trust.approvedPreview.componentProvenance.map(
        ({path: repositoryPath}) => repositoryPath,
      ),
      trust.rendererDependencies.map(({path: repositoryPath}) => repositoryPath),
      'runner/src/telop-remotion.ts',
      'runner/src/telop-style.ts',
    ),
    approvedPaths,
  );
  const sharedCalculation = runNodeTests(
    'evals/clip_composition/test_presentation_caption_display_pair_v003.mjs',
    '^H04:',
  );
  assert.equal(sharedCalculation.pass, 1);
  assert.equal(sharedCalculation.fail, 0);
  t.diagnostic(JSON.stringify({
    resultProjection,
    liveResultProjection: {
      containerCount: liveContainers.length,
      cueCount: liveContainers.reduce(
        (sum, container) => sum + container.cues.length,
        0,
      ),
      canonicalSha256: sha256(liveContainerBytes),
    },
    currentImplementation,
    sharedCalculation,
  }));
});

test('H05: v002字幕回帰は24/24を維持する', (t) => {
  const regression = runNodeTests(
    'evals/clip_composition/presentation_caption_contract_v002.regression.mjs',
  );
  assert.deepEqual(regression, {tests: 24, pass: 24, fail: 0, skipped: 0});
  t.diagnostic(JSON.stringify(regression));
});

test('H06: 横型QC v003 wrapperは共通計算とbyte一致し現在実装来歴だけを照合する', (t) => {
  const resultProjection = assertTagArtifactsUnchanged([RENDER_QC]);
  const plan = readJsonStable(RENDER_PLAN);
  const applicationReport = readJsonStable(RENDER_APPLICATION_RESULTS);
  const savedQc = readJsonStable(RENDER_QC);
  const input = qcInputFromSavedFormalArtifacts(plan, applicationReport, savedQc);
  const wrapper = evaluatePresentationReviewRendererQcV003(input);
  const shared = evaluatePresentationRendererQcWithProfileV001(input, {
    schemaVersion: 'presentation-review-render-qc-v003',
    planFile: 'presentation-review-render-plan-v003.json',
  });
  assert.equal(wrapper.status, 'passed');
  assert.deepEqual(
    Buffer.from(canonicalJson(wrapper)),
    Buffer.from(canonicalJson(shared)),
  );
  assert.deepEqual(
    Buffer.from(canonicalJson(wrapper)),
    Buffer.from(canonicalJson(savedQc)),
  );
  const liveFormalBytes = Buffer.from(`${JSON.stringify(wrapper, null, 2)}\n`, 'utf8');
  assert.deepEqual(liveFormalBytes, readStable(RENDER_QC));
  const currentImplementation = assertApprovedCurrentImplementations(
    ['evals/clip_composition/presentation_renderer_qc_v002.mjs'],
    ['evals/clip_composition/presentation_renderer_qc_v002.mjs'],
  );
  t.diagnostic(JSON.stringify({
    resultProjection,
    liveResultProjection: {
      instructionCount: wrapper.instructionCount,
      canonicalSha256: sha256(Buffer.from(canonicalJson(wrapper))),
      formalByteSha256: sha256(liveFormalBytes),
    },
    currentImplementation,
  }));
});
