import {createHash} from 'node:crypto';
import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  rmdir,
  unlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

import {
  canonicalizePresentationCaptionB1JsonV001,
  decodePresentationCaptionB1StrictJsonV001,
  serializePresentationCaptionB1FormalJsonV001,
  sha256PresentationCaptionB1BytesV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  validatePresentationRetainedSourceAtomsPublishedArtifactsV001,
} from './presentation_retained_source_atoms_v001.mjs';

export const PRESENTATION_TIMELINE_COMPOSITION_DECISION_SCHEMA_V001 =
  'zev-timeline-composition-decision-v001';
export const PRESENTATION_TIMELINE_COMPOSITION_DECISION_JOB_SCHEMA_V001 =
  'zev-timeline-composition-decision-job-v001';

export const PRESENTATION_TIMELINE_COMPOSITION_DECISION_VIOLATION_CODES_V001 =
  Object.freeze([
    'MEANING_JOB_INVALID',
    'MEANING_JOB_BINDING_MISMATCH',
    'TIMELINE_DECISION_INVALID',
    'SOURCE_IDENTITY_INVALID',
    'SOURCE_MEDIA_BINDING_MISMATCH',
    'TIMELINE_SEGMENT_SOURCE_UNRESOLVED',
    'TIMELINE_SELECTION_SET_MISMATCH',
    'MEANING_PUBLICATION_TARGET_INVALID',
    'MEANING_PUBLICATION_FAILED',
  ]);

const ROOT = 'evals/clip_composition/outputs/presentation';
const JOB_ROOT = `${ROOT}/meaning-timeline-decision-jobs`;
const OUTPUT_ROOT = `${ROOT}/meaning-timeline-decisions`;
const SELF_PATH = 'evals/clip_composition/presentation_timeline_composition_decision_v001.mjs';
const STRICT_JSON_PATH =
  'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs';
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const SHA = /^[0-9a-f]{64}$/u;
const SOURCE_REF = /^youtube:[A-Za-z0-9_-]{11}$/u;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u;
const WORKSPACE_PATH = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\0).+$/u;
const CONTRACT_BINDINGS = Object.freeze([
  Object.freeze({
    path: 'evals/clip_composition/reports/presentation/presentation-meaning-information-package-contract-design-20260803-v001.md',
    fileSha256: 'a38ef995c5c838f742c1de6c18acd5a7fd166ea57fb7537e51cf9a89abd4c0de',
    role: 'meaning-package-contract',
  }),
  Object.freeze({
    path: 'evals/clip_composition/reports/presentation/presentation-output-side-acceptance-contract-design-20260803-v001.md',
    fileSha256: 'c349d544e9cc954d2f5b9e5e05334801e6a11cdce383f57829c04ae301b678de',
    role: 'output-side-contract',
  }),
]);

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const dense = value => Array.isArray(value)
  && Object.keys(value).every((key, index) => key === String(index));
const positive = value => Number.isSafeInteger(value) && value > 0;
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const violation = (code, pointer) => Object.freeze({code, path: pointer, relatedIds: Object.freeze([])});

const validMediaBinding = value => exactKeys(value, ['path', 'fileSha256'])
  && WORKSPACE_PATH.test(value.path) && SHA.test(value.fileSha256);
const validJsonBinding = value => exactKeys(value, [
  'schemaVersion', 'path', 'fileSha256', 'canonicalSha256',
]) && typeof value.schemaVersion === 'string' && value.schemaVersion.length > 0
  && WORKSPACE_PATH.test(value.path) && SHA.test(value.fileSha256)
  && SHA.test(value.canonicalSha256);
const validImplementationBinding = value => exactKeys(value, ['path', 'fileSha256', 'role'])
  && WORKSPACE_PATH.test(value.path) && SHA.test(value.fileSha256)
  && typeof value.role === 'string' && value.role.length > 0;

const validateStt = value => exactKeys(value, ['manifest', 'transcript', 'wordTimestamps'])
  && validMediaBinding(value.manifest)
  && validMediaBinding(value.transcript)
  && validMediaBinding(value.wordTimestamps);

export function validatePresentationSourceIdentityV001(value) {
  if (!isObject(value)) return false;
  if (value.schemaVersion === 'presentation-real-data-source-identity-v001') {
    if (!exactKeys(value, [
      'schemaVersion', 'sourceIdentityId', 'videoId', 'sourceUrl',
      'sourceProvenance', 'sourceRef', 'executionMedia', 'mediaEquivalence', 'stt',
    ]) || !FORMAL_ID.test(value.sourceIdentityId)
      || !validMediaBinding(value.executionMedia)
      || !validMediaBinding(value.mediaEquivalence)
      || !validateStt(value.stt)) return false;
  } else if (value.schemaVersion === 'presentation-material-source-identity-v001') {
    if (!exactKeys(value, [
      'schemaVersion', 'identityId', 'videoId', 'sourceUrl', 'sourceRef',
      'sourceProvenance', 'executionMedia', 'stt', 'sourceMediaBinding',
    ]) || !FORMAL_ID.test(value.identityId)
      || !validMediaBinding(value.executionMedia)
      || !validMediaBinding(value.sourceMediaBinding)
      || !validateStt(value.stt)) return false;
  } else return false;
  return /^[A-Za-z0-9_-]{11}$/u.test(value.videoId)
    && value.sourceRef === `youtube:${value.videoId}`
    && value.sourceUrl === `https://www.youtube.com/watch?v=${value.videoId}`
    && typeof value.sourceProvenance === 'string'
    && value.sourceProvenance.length > 0;
}

const validRetainedBinding = value => exactKeys(value, [
  'sourceAtoms', 'generationManifest', 'validationReport',
]) && validJsonBinding(value.sourceAtoms)
  && value.sourceAtoms.schemaVersion === 'presentation-retained-source-atoms-v001'
  && validJsonBinding(value.generationManifest)
  && value.generationManifest.schemaVersion
    === 'presentation-retained-source-atoms-generation-manifest-v001'
  && validJsonBinding(value.validationReport)
  && value.validationReport.schemaVersion
    === 'presentation-retained-source-atoms-validation-report-v001';

const validateSourceMedia = (value, index) => exactKeys(value, [
  'sourceMediaId', 'ordinal', 'sourceRef', 'mediaBinding',
  'sourceIdentityBinding', 'retainedSourceAtomsBinding',
]) && value.sourceMediaId === `source-media-${String(index + 1).padStart(6, '0')}`
  && value.ordinal === index + 1
  && SOURCE_REF.test(value.sourceRef)
  && validMediaBinding(value.mediaBinding)
  && validJsonBinding(value.sourceIdentityBinding)
  && ['presentation-real-data-source-identity-v001',
    'presentation-material-source-identity-v001'].includes(
    value.sourceIdentityBinding.schemaVersion,
  )
  && validRetainedBinding(value.retainedSourceAtomsBinding);

const validateSegment = (value, index, sourceIds) => exactKeys(value, [
  'segmentId', 'ordinal', 'sourceMediaId', 'sourceStartMs', 'sourceEndMs',
]) && value.segmentId === `segment-${String(index + 1).padStart(4, '0')}`
  && value.ordinal === index + 1
  && sourceIds.has(value.sourceMediaId)
  && nonnegative(value.sourceStartMs)
  && positive(value.sourceEndMs)
  && value.sourceStartMs < value.sourceEndMs;

const sourceOrderMatchesSegments = (sourceMedia, segments) => {
  const firstSeen = [];
  const seen = new Set();
  for (const segment of segments) {
    if (!seen.has(segment.sourceMediaId)) {
      seen.add(segment.sourceMediaId);
      firstSeen.push(segment.sourceMediaId);
    }
  }
  return same(firstSeen, sourceMedia.map(item => item.sourceMediaId));
};

export function validatePresentationTimelineCompositionDecisionJobV001(job) {
  if (!exactKeys(job, [
    'schemaVersion', 'jobId', 'decisionId', 'sourceMedia', 'segments',
    'recordedBy', 'recordedAt', 'outputPath', 'implementationBindings',
    'approvedContractBindings',
  ]) || job.schemaVersion !== PRESENTATION_TIMELINE_COMPOSITION_DECISION_JOB_SCHEMA_V001
    || !FORMAL_ID.test(job.jobId) || !FORMAL_ID.test(job.decisionId)
    || !dense(job.sourceMedia) || job.sourceMedia.length < 1
    || job.sourceMedia.length > 999999
    || !job.sourceMedia.every(validateSourceMedia)
    || new Set(job.sourceMedia.map(item => item.sourceMediaId)).size !== job.sourceMedia.length
    || new Set(job.sourceMedia.map(item => item.sourceRef)).size !== job.sourceMedia.length
    || !dense(job.segments) || job.segments.length < 1 || job.segments.length > 9999
    || !['human', 'approved-machine-record'].includes(job.recordedBy)
    || typeof job.recordedAt !== 'string' || !UTC.test(job.recordedAt)
    || job.outputPath !== `${OUTPUT_ROOT}/${job.jobId}/timeline-composition-decision.json`
    || !dense(job.implementationBindings) || job.implementationBindings.length !== 2
    || !job.implementationBindings.every(validImplementationBinding)
    || job.implementationBindings[0].role !== 'timeline-decision'
    || job.implementationBindings[0].path !== SELF_PATH
    || job.implementationBindings[1].role !== 'strict-json'
    || job.implementationBindings[1].path !== STRICT_JSON_PATH
    || !dense(job.approvedContractBindings)
    || !same(job.approvedContractBindings, CONTRACT_BINDINGS)) return false;
  const sourceIds = new Set(job.sourceMedia.map(item => item.sourceMediaId));
  return job.segments.every((segment, index) => validateSegment(segment, index, sourceIds))
    && sourceOrderMatchesSegments(job.sourceMedia, job.segments);
}

export function buildPresentationTimelineCompositionDecisionV001({job, jobBinding}) {
  if (!validatePresentationTimelineCompositionDecisionJobV001(job)
    || !validJsonBinding(jobBinding)
    || jobBinding.schemaVersion !== PRESENTATION_TIMELINE_COMPOSITION_DECISION_JOB_SCHEMA_V001) {
    throw new TypeError('timeline composition decision input is invalid');
  }
  return {
    schemaVersion: PRESENTATION_TIMELINE_COMPOSITION_DECISION_SCHEMA_V001,
    decisionId: job.decisionId,
    sourceMedia: job.sourceMedia,
    segments: job.segments,
    decisionProvenance: {
      inputDecisionBinding: jobBinding,
      recordedBy: job.recordedBy,
      recordedAt: job.recordedAt,
    },
  };
}

export function validatePresentationTimelineCompositionDecisionV001(value) {
  if (!exactKeys(value, [
    'schemaVersion', 'decisionId', 'sourceMedia', 'segments', 'decisionProvenance',
  ]) || value.schemaVersion !== PRESENTATION_TIMELINE_COMPOSITION_DECISION_SCHEMA_V001
    || !FORMAL_ID.test(value.decisionId)
    || !dense(value.sourceMedia) || value.sourceMedia.length < 1
    || value.sourceMedia.length > 999999
    || !value.sourceMedia.every(validateSourceMedia)
    || new Set(value.sourceMedia.map(item => item.sourceMediaId)).size
      !== value.sourceMedia.length
    || new Set(value.sourceMedia.map(item => item.sourceRef)).size
      !== value.sourceMedia.length
    || !dense(value.segments) || value.segments.length < 1
    || value.segments.length > 9999
    || !exactKeys(value.decisionProvenance, ['inputDecisionBinding', 'recordedBy', 'recordedAt'])
    || !validJsonBinding(value.decisionProvenance.inputDecisionBinding)
    || value.decisionProvenance.inputDecisionBinding.schemaVersion
      !== PRESENTATION_TIMELINE_COMPOSITION_DECISION_JOB_SCHEMA_V001
    || !['human', 'approved-machine-record'].includes(value.decisionProvenance.recordedBy)
    || !UTC.test(value.decisionProvenance.recordedAt)) return false;
  const sourceIds = new Set(value.sourceMedia.map(item => item.sourceMediaId));
  return value.segments.every((segment, index) => validateSegment(segment, index, sourceIds))
    && sourceOrderMatchesSegments(value.sourceMedia, value.segments);
}

const canonicalSha = value => {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  if (result.status !== 'canonicalized') throw new TypeError('canonicalization failed');
  return hash(result.bytes);
};
const formalBytes = value => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  if (result.status !== 'serialized') throw new TypeError('serialization failed');
  return result.bytes;
};

const sameStableFileIdentity = (left, right) => left.dev === right.dev
  && left.ino === right.ino
  && left.size === right.size
  && left.mtimeNs === right.mtimeNs
  && left.ctimeNs === right.ctimeNs
  && left.nlink === right.nlink;

const singleLinkRegularFile = value => value.isFile() && value.nlink === 1n;

export async function readPresentationMeaningWorkspaceFileStableV001({
  workspaceRoot,
  relativePath,
  allowHardlink = false,
}) {
  if (typeof workspaceRoot !== 'string' || !WORKSPACE_PATH.test(relativePath)) {
    throw new Error('unsafe-path');
  }
  const rootReal = await realpath(workspaceRoot);
  const absolute = path.resolve(rootReal, relativePath);
  if (!absolute.startsWith(`${rootReal}${path.sep}`)) throw new Error('unsafe-path');
  const beforePath = await lstat(absolute, {bigint: true});
  const validLinkCount = allowHardlink ? beforePath.nlink >= 1n : beforePath.nlink === 1n;
  if (!beforePath.isFile() || beforePath.isSymbolicLink() || !validLinkCount) {
    throw new Error('unsafe-file');
  }
  const resolvedBefore = await realpath(absolute);
  if (resolvedBefore !== absolute || !resolvedBefore.startsWith(`${rootReal}${path.sep}`)) {
    throw new Error('unsafe-file');
  }
  const handle = await open(absolute, 'r');
  let bytes;
  let afterHandle;
  try {
    const beforeHandle = await handle.stat({bigint: true});
    const handleLinkCount = allowHardlink ? beforeHandle.nlink >= 1n : beforeHandle.nlink === 1n;
    if (!beforeHandle.isFile() || !handleLinkCount
      || !sameStableFileIdentity(beforePath, beforeHandle)) throw new Error('unstable-file');
    bytes = await handle.readFile();
    afterHandle = await handle.stat({bigint: true});
    if (!afterHandle.isFile()
      || !(allowHardlink ? afterHandle.nlink >= 1n : singleLinkRegularFile(afterHandle))
      || !sameStableFileIdentity(beforeHandle, afterHandle)) throw new Error('unstable-file');
  } finally {
    await handle.close();
  }
  const afterPath = await lstat(absolute, {bigint: true});
  if (!afterPath.isFile() || afterPath.isSymbolicLink()
    || !(allowHardlink ? afterPath.nlink >= 1n : singleLinkRegularFile(afterPath))
    || !sameStableFileIdentity(afterHandle, afterPath)
    || await realpath(absolute) !== absolute) throw new Error('unstable-file');
  return bytes;
}

export async function ensurePresentationMeaningSafePublicationParentV001({
  workspaceRoot,
  absoluteParent,
}) {
  const rootReal = await realpath(workspaceRoot);
  const relative = path.relative(rootReal, absoluteParent);
  if (path.isAbsolute(relative) || relative === '..' || relative.startsWith(`..${path.sep}`)) {
    throw new Error('unsafe-publication-path');
  }
  let current = rootReal;
  for (const part of relative === '' ? [] : relative.split(path.sep)) {
    current = path.join(current, part);
    let stat;
    try {
      stat = await lstat(current, {bigint: true});
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await mkdir(current, {recursive: false});
      stat = await lstat(current, {bigint: true});
    }
    if (!stat.isDirectory() || stat.isSymbolicLink() || await realpath(current) !== current) {
      throw new Error('unsafe-publication-parent');
    }
  }
  return rootReal;
}

export async function inspectPresentationMeaningOwnedStagingRootV001({
  workspaceRoot,
  relativeRoot,
  expectedRelativeFiles,
  allowHardlink = false,
}) {
  if (!WORKSPACE_PATH.test(relativeRoot) || !Array.isArray(expectedRelativeFiles)
    || expectedRelativeFiles.length < 1
    || expectedRelativeFiles.some(file => !WORKSPACE_PATH.test(file))) {
    throw new Error('unsafe-staging-specification');
  }
  const rootReal = await realpath(workspaceRoot);
  const absoluteRoot = path.resolve(rootReal, relativeRoot);
  if (!absoluteRoot.startsWith(`${rootReal}${path.sep}`)
    || await realpath(absoluteRoot) !== absoluteRoot) throw new Error('unsafe-staging-root');
  const rootStat = await lstat(absoluteRoot, {bigint: true});
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('unsafe-staging-root');
  const observed = [];
  const walk = async (absoluteDirectory, relativeDirectory = '') => {
    for (const name of (await readdir(absoluteDirectory)).sort()) {
      const relativeFile = relativeDirectory === '' ? name : `${relativeDirectory}/${name}`;
      const absolute = path.join(absoluteDirectory, name);
      const stat = await lstat(absolute, {bigint: true});
      if (stat.isSymbolicLink()) throw new Error('unsafe-staging-entry');
      if (stat.isDirectory()) {
        if (await realpath(absolute) !== absolute) throw new Error('unsafe-staging-entry');
        await walk(absolute, relativeFile);
      } else if (singleLinkRegularFile(stat)) {
        observed.push(relativeFile);
        await readPresentationMeaningWorkspaceFileStableV001({
          workspaceRoot: rootReal,
          relativePath: `${relativeRoot}/${relativeFile}`,
          allowHardlink,
        });
      } else {
        throw new Error('unsafe-staging-entry');
      }
    }
  };
  await walk(absoluteRoot);
  const expected = [...expectedRelativeFiles].sort();
  if (new Set(expected).size !== expected.length
    || JSON.stringify(observed.sort()) !== JSON.stringify(expected)) {
    throw new Error('staging-set-invalid');
  }
  return Object.freeze({rootReal, absoluteRoot, relativeFiles: Object.freeze(expected)});
}

const sameDirectoryIdentity = (left, right) => left.dev === right.dev
  && left.ino === right.ino;

const relativeWorkspacePath = (rootReal, absolute) =>
  path.relative(rootReal, absolute).split(path.sep).join('/');

const publicationRoot = async (rootReal, relativeRoot) => {
  if (!WORKSPACE_PATH.test(relativeRoot)) throw new Error('unsafe-publication-path');
  const absolute = path.resolve(rootReal, relativeRoot);
  if (!absolute.startsWith(`${rootReal}${path.sep}`)) throw new Error('unsafe-publication-path');
  return absolute;
};

/**
 * Creates the fixed sibling staging directory and captures its filesystem identity.
 * A concurrent publisher cannot acquire the same staging root or the formal target.
 */
export async function createPresentationMeaningOwnedStagingRootV001({
  workspaceRoot,
  relativeOutputRoot,
  mode = 0o700,
}) {
  const rootReal = await realpath(workspaceRoot);
  const outputAbsolute = await publicationRoot(rootReal, relativeOutputRoot);
  const stagingRelative = `${relativeOutputRoot}.staging`;
  const stagingAbsolute = await publicationRoot(rootReal, stagingRelative);
  if (path.dirname(outputAbsolute) !== path.dirname(stagingAbsolute)) {
    throw new Error('publication-roots-not-siblings');
  }
  await ensurePresentationMeaningSafePublicationParentV001({
    workspaceRoot: rootReal,
    absoluteParent: path.dirname(outputAbsolute),
  });
  try {
    await lstat(outputAbsolute);
    throw new Error('publication-target-exists');
  } catch (error) {
    if (error.message === 'publication-target-exists' || error.code !== 'ENOENT') throw error;
  }
  try {
    await mkdir(stagingAbsolute, {recursive: false, mode});
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error('publication-staging-exists');
    throw error;
  }
  const stagingIdentity = await lstat(stagingAbsolute, {bigint: true});
  if (!stagingIdentity.isDirectory() || stagingIdentity.isSymbolicLink()
    || await realpath(stagingAbsolute) !== stagingAbsolute) {
    throw new Error('unsafe-staging-root');
  }
  return Object.freeze({
    rootReal,
    relativeOutputRoot,
    outputAbsolute,
    stagingRelative,
    stagingAbsolute,
    stagingIdentity,
  });
}

const inspectPublicationSourceTree = async ({claim, expectedRelativeFiles}) => {
  const expected = [...expectedRelativeFiles].sort();
  if (expected.length < 1 || new Set(expected).size !== expected.length
    || expected.some(file => !WORKSPACE_PATH.test(file))) {
    throw new Error('unsafe-publication-file-set');
  }
  const currentRoot = await lstat(claim.stagingAbsolute, {bigint: true});
  if (!currentRoot.isDirectory() || currentRoot.isSymbolicLink()
    || !sameDirectoryIdentity(currentRoot, claim.stagingIdentity)
    || await realpath(claim.stagingAbsolute) !== claim.stagingAbsolute) {
    throw new Error('staging-ownership-lost');
  }
  const observed = [];
  const directories = new Map([['', currentRoot]]);
  const files = new Map();
  const walk = async (absoluteDirectory, relativeDirectory = '') => {
    for (const name of (await readdir(absoluteDirectory)).sort()) {
      const relativeEntry = relativeDirectory === '' ? name : `${relativeDirectory}/${name}`;
      const absoluteEntry = path.join(absoluteDirectory, name);
      const stat = await lstat(absoluteEntry, {bigint: true});
      if (stat.isSymbolicLink()) throw new Error('unsafe-staging-entry');
      if (stat.isDirectory()) {
        if (await realpath(absoluteEntry) !== absoluteEntry) {
          throw new Error('unsafe-staging-entry');
        }
        directories.set(relativeEntry, stat);
        await walk(absoluteEntry, relativeEntry);
      } else if (singleLinkRegularFile(stat)) {
        const bytes = await readPresentationMeaningWorkspaceFileStableV001({
          workspaceRoot: claim.rootReal,
          relativePath: relativeWorkspacePath(claim.rootReal, absoluteEntry),
        });
        observed.push(relativeEntry);
        files.set(relativeEntry, {stat, bytes});
      } else {
        throw new Error('unsafe-staging-entry');
      }
    }
  };
  await walk(claim.stagingAbsolute);
  if (JSON.stringify(observed.sort()) !== JSON.stringify(expected)) {
    throw new Error('staging-set-invalid');
  }
  return {expected, directories, files};
};

const safelyRemoveOwnedPublicationRoot = async ({
  rootAbsolute,
  targetIdentity,
  targetFiles,
}) => {
  if (!targetIdentity) return;
  try {
    const currentRoot = await lstat(rootAbsolute, {bigint: true});
    if (!currentRoot.isDirectory() || currentRoot.isSymbolicLink()
      || !sameDirectoryIdentity(currentRoot, targetIdentity)
      || await realpath(rootAbsolute) !== rootAbsolute) return;
    const removeDirectory = async (absoluteDirectory, relativeDirectory = '') => {
      for (const name of await readdir(absoluteDirectory)) {
        const relativeEntry = relativeDirectory === '' ? name : `${relativeDirectory}/${name}`;
        const absoluteEntry = path.join(absoluteDirectory, name);
        const stat = await lstat(absoluteEntry, {bigint: true});
        if (stat.isDirectory() && !stat.isSymbolicLink()) {
          await removeDirectory(absoluteEntry, relativeEntry);
          if ((await readdir(absoluteEntry)).length === 0) await rmdir(absoluteEntry);
        } else {
          const owned = targetFiles.get(relativeEntry);
          if (!owned || !stat.isFile() || stat.isSymbolicLink()
            || stat.dev !== owned.dev || stat.ino !== owned.ino) return;
          await unlink(absoluteEntry);
        }
      }
    };
    await removeDirectory(rootAbsolute);
    if ((await readdir(rootAbsolute)).length === 0) await rmdir(rootAbsolute);
  } catch {}
};

const safelyQuarantineOwnedPublicationTarget = async ({
  claim,
  targetIdentity,
  targetFiles,
}) => {
  const quarantineAbsolute = `${claim.stagingAbsolute}.failed-`
    + `${targetIdentity.dev.toString()}-${targetIdentity.ino.toString()}`;
  try {
    const currentRoot = await lstat(claim.outputAbsolute, {bigint: true});
    if (!currentRoot.isDirectory() || currentRoot.isSymbolicLink()
      || !sameDirectoryIdentity(currentRoot, targetIdentity)
      || await realpath(claim.outputAbsolute) !== claim.outputAbsolute) return;
    try {
      await lstat(quarantineAbsolute);
      return;
    } catch (error) {
      if (error.code !== 'ENOENT') return;
    }
    await rename(claim.outputAbsolute, quarantineAbsolute);
    const quarantined = await lstat(quarantineAbsolute, {bigint: true});
    if (!sameDirectoryIdentity(quarantined, targetIdentity)
      || await realpath(quarantineAbsolute) !== quarantineAbsolute) return;
    await safelyRemoveOwnedPublicationRoot({
      rootAbsolute: quarantineAbsolute,
      targetIdentity,
      targetFiles,
    });
  } catch {}
};

/**
 * Publishes an already complete owned staging tree without replacing an existing target.
 * The complete sibling staging directory becomes visible at the formal path through one
 * directory rename; the formal path is therefore absent or exposes the complete set.
 */
export async function publishPresentationMeaningOwnedStagingRootNoReplaceV001({
  claim,
  expectedRelativeFiles,
}) {
  if (!claim || typeof claim.rootReal !== 'string'
    || await realpath(claim.rootReal) !== claim.rootReal) {
    throw new Error('invalid-publication-claim');
  }
  const source = await inspectPublicationSourceTree({claim, expectedRelativeFiles});
  await ensurePresentationMeaningSafePublicationParentV001({
    workspaceRoot: claim.rootReal,
    absoluteParent: path.dirname(claim.outputAbsolute),
  });
  const targetIdentity = claim.stagingIdentity;
  const targetFiles = new Map(
    [...source.files].map(([relativeFile, captured]) => [relativeFile, captured.stat]),
  );
  let renamed = false;
  try {
    try {
      await lstat(claim.outputAbsolute);
      return Object.freeze({status: 'target-exists'});
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const stagingFinal = await lstat(claim.stagingAbsolute, {bigint: true});
    if (!sameDirectoryIdentity(stagingFinal, claim.stagingIdentity)
      || await realpath(claim.stagingAbsolute) !== claim.stagingAbsolute) {
      throw new Error('staging-ownership-lost');
    }
    await rename(claim.stagingAbsolute, claim.outputAbsolute);
    renamed = true;
    const targetFinal = await lstat(claim.outputAbsolute, {bigint: true});
    if (!sameDirectoryIdentity(targetFinal, targetIdentity)
      || await realpath(claim.outputAbsolute) !== claim.outputAbsolute) {
      throw new Error('publication-target-changed');
    }
    await inspectPresentationMeaningOwnedStagingRootV001({
      workspaceRoot: claim.rootReal,
      relativeRoot: claim.relativeOutputRoot,
      expectedRelativeFiles: source.expected,
    });
    for (const [relativeDirectory, captured] of source.directories) {
      const absoluteDirectory = relativeDirectory === ''
        ? claim.outputAbsolute
        : path.join(claim.outputAbsolute, relativeDirectory);
      const current = await lstat(absoluteDirectory, {bigint: true});
      if (!current.isDirectory() || current.isSymbolicLink()
        || !sameDirectoryIdentity(current, captured)
        || await realpath(absoluteDirectory) !== absoluteDirectory) {
        throw new Error('publication-directory-changed');
      }
    }
    for (const relativeFile of source.expected) {
      const absoluteFile = path.join(claim.outputAbsolute, relativeFile);
      const captured = source.files.get(relativeFile);
      const current = await lstat(absoluteFile, {bigint: true});
      const bytes = await readPresentationMeaningWorkspaceFileStableV001({
        workspaceRoot: claim.rootReal,
        relativePath: relativeWorkspacePath(claim.rootReal, absoluteFile),
      });
      if (!captured || !sameStableFileIdentity(current, captured.stat)
        || !bytes.equals(captured.bytes)) {
        throw new Error('publication-file-changed');
      }
    }
    return Object.freeze({status: 'published'});
  } catch (error) {
    if (renamed) {
      await safelyQuarantineOwnedPublicationTarget({claim, targetIdentity, targetFiles});
    }
    if (!renamed && ['EEXIST', 'ENOTEMPTY'].includes(error?.code)) {
      return Object.freeze({status: 'target-exists'});
    }
    throw error;
  }
}

const readStable = (workspaceRoot, relativePath) =>
  readPresentationMeaningWorkspaceFileStableV001({workspaceRoot, relativePath});

const decode = bytes => {
  const result = decodePresentationCaptionB1StrictJsonV001(bytes);
  if (result.status !== 'decoded') throw new Error('invalid-json');
  return result.value;
};

const observeJsonBinding = async (workspaceRoot, binding) => {
  const bytes = await readStable(workspaceRoot, binding.path);
  if (hash(bytes) !== binding.fileSha256) throw new Error('binding-file-sha');
  const value = decode(bytes);
  if (canonicalSha(value) !== binding.canonicalSha256
    || value.schemaVersion !== binding.schemaVersion) throw new Error('binding-canonical-sha');
  return {bytes, value};
};

const observeMediaBinding = async (workspaceRoot, binding) => {
  const bytes = await readStable(workspaceRoot, binding.path);
  if (hash(bytes) !== binding.fileSha256) throw new Error('media-binding-sha');
  return bytes;
};

const trackTimelineInput = (tracked, binding, code, pointer) => {
  tracked.push({
    path: binding.path,
    fileSha256: binding.fileSha256,
    code,
    pointer,
  });
};

export async function inspectPresentationTimelineInputsBeforePublicationV001({
  workspaceRoot,
  tracked,
}) {
  const deduplicated = new Map();
  for (const item of tracked) {
    if (!deduplicated.has(item.path)) deduplicated.set(item.path, item);
  }
  try {
    for (const item of deduplicated.values()) {
      const bytes = await readStable(workspaceRoot, item.path);
      if (hash(bytes) !== item.fileSha256) {
        return Object.freeze({status: 'rejected', changed: item});
      }
    }
  } catch {
    return Object.freeze({status: 'fatal'});
  }
  return Object.freeze({status: 'passed'});
}

const validateSourceIdentityFiles = async (workspaceRoot, sourceMedia, tracked) => {
  for (const source of sourceMedia) {
    const observed = await observeJsonBinding(workspaceRoot, source.sourceIdentityBinding);
    trackTimelineInput(
      tracked,
      source.sourceIdentityBinding,
      'SOURCE_IDENTITY_INVALID',
      '/timelineDecision/sourceMedia',
    );
    if (!validatePresentationSourceIdentityV001(observed.value)
      || observed.value.sourceRef !== source.sourceRef) throw new Error('source-identity');
    if (!same(observed.value.executionMedia, source.mediaBinding)) throw new Error('source-media-binding');
    await observeMediaBinding(workspaceRoot, source.mediaBinding);
    trackTimelineInput(
      tracked,
      source.mediaBinding,
      'SOURCE_MEDIA_BINDING_MISMATCH',
      '/timelineDecision/sourceMedia',
    );
    const mediaBindings = [
      ...(observed.value.mediaEquivalence ? [observed.value.mediaEquivalence] : []),
      ...(observed.value.sourceMediaBinding ? [observed.value.sourceMediaBinding] : []),
      observed.value.stt.manifest,
      observed.value.stt.transcript,
      observed.value.stt.wordTimestamps,
    ];
    for (const binding of mediaBindings) {
      await observeMediaBinding(workspaceRoot, binding);
      trackTimelineInput(
        tracked,
        binding,
        'SOURCE_MEDIA_BINDING_MISMATCH',
        '/timelineDecision/sourceMedia',
      );
    }
    const retained = {};
    for (const [name, binding] of Object.entries(source.retainedSourceAtomsBinding)) {
      const observed = await observeJsonBinding(workspaceRoot, binding);
      trackTimelineInput(
        tracked,
        binding,
        'SOURCE_IDENTITY_INVALID',
        '/timelineDecision/sourceMedia',
      );
      retained[`${name}Bytes`] = observed.bytes;
      if (name === 'sourceAtoms' && observed.value.sourceRef !== source.sourceRef) {
        throw new Error('retained-source-ref');
      }
    }
    const retainedValidation =
      validatePresentationRetainedSourceAtomsPublishedArtifactsV001(retained);
    if (retainedValidation.status !== 'passed') throw new Error('retained-atoms');
  }
};

export async function runPresentationTimelineCompositionDecisionV001({
  workspaceRoot,
  jobPath,
}) {
  if (typeof workspaceRoot !== 'string' || typeof jobPath !== 'string') {
    throw new TypeError('timeline runner input is invalid');
  }
  const expectedPrefix = `${JOB_ROOT}/`;
  if (!jobPath.startsWith(expectedPrefix) || !jobPath.endsWith('.json')
    || jobPath.slice(expectedPrefix.length, -5).includes('/')) {
    return {status: 'rejected', violations: [violation('MEANING_JOB_INVALID', '/job')]};
  }
  const pathJobId = jobPath.slice(expectedPrefix.length, -5);
  if (!FORMAL_ID.test(pathJobId)) {
    return {status: 'rejected', violations: [violation('MEANING_JOB_INVALID', '/job')]};
  }
  let jobBytes;
  try { jobBytes = await readStable(workspaceRoot, jobPath); } catch { throw new Error('job-read-failed'); }
  const decoded = decodePresentationCaptionB1StrictJsonV001(jobBytes);
  if (decoded.status !== 'decoded' || !validatePresentationTimelineCompositionDecisionJobV001(decoded.value)
    || decoded.value.jobId !== pathJobId) {
    return {status: 'rejected', violations: [violation('MEANING_JOB_INVALID', '/job')]};
  }
  const job = decoded.value;
  const tracked = [{
    path: jobPath,
    fileSha256: hash(jobBytes),
    code: 'MEANING_JOB_BINDING_MISMATCH',
    pointer: '/job',
  }];
  for (const binding of [...job.implementationBindings, ...job.approvedContractBindings]) {
    const bytes = await readStable(workspaceRoot, binding.path);
    trackTimelineInput(tracked, binding, 'MEANING_JOB_BINDING_MISMATCH', '/job');
    if (hash(bytes) !== binding.fileSha256) {
      return {status: 'rejected', violations: [violation('MEANING_JOB_BINDING_MISMATCH', '/job')]};
    }
  }
  try { await validateSourceIdentityFiles(workspaceRoot, job.sourceMedia, tracked); } catch (error) {
    const code = error.message === 'source-media-binding' || error.message === 'media-binding-sha'
      ? 'SOURCE_MEDIA_BINDING_MISMATCH' : 'SOURCE_IDENTITY_INVALID';
    return {status: 'rejected', violations: [violation(code, '/timelineDecision/sourceMedia')]};
  }
  const jobBinding = {
    schemaVersion: job.schemaVersion,
    path: jobPath,
    fileSha256: hash(jobBytes),
    canonicalSha256: canonicalSha(job),
  };
  const decision = buildPresentationTimelineCompositionDecisionV001({job, jobBinding});
  const bytes = formalBytes(decision);
  const relativeOutputRoot = path.dirname(job.outputPath).split(path.sep).join('/');
  const reread = await inspectPresentationTimelineInputsBeforePublicationV001({
    workspaceRoot,
    tracked,
  });
  if (reread.status === 'fatal') return {status: 'fatal', violations: []};
  if (reread.status === 'rejected') {
    return {
      status: 'rejected',
      violations: [violation(reread.changed.code, reread.changed.pointer)],
    };
  }
  let publicationClaim;
  try {
    publicationClaim = await createPresentationMeaningOwnedStagingRootV001({
      workspaceRoot,
      relativeOutputRoot,
    });
  } catch (error) {
    if (error.message === 'publication-target-exists') {
      return {status: 'rejected', violations: [violation(
        'MEANING_PUBLICATION_TARGET_INVALID', '/job/outputPath',
      )]};
    }
    return {status: 'fatal', violations: [violation(
      'MEANING_PUBLICATION_FAILED', '/job/outputPath',
    )]};
  }
  try {
    const fileName = path.basename(job.outputPath);
    await writeFile(path.join(publicationClaim.stagingAbsolute, fileName), bytes, {flag: 'wx'});
    const published = await publishPresentationMeaningOwnedStagingRootNoReplaceV001({
      claim: publicationClaim,
      expectedRelativeFiles: [fileName],
    });
    if (published.status !== 'published') throw new Error('publication-target-exists');
  } catch {
    return {status: 'fatal', violations: [violation('MEANING_PUBLICATION_FAILED', '/job/outputPath')]};
  }
  return {status: 'passed', decision, bytes};
}

export async function runPresentationTimelineCompositionDecisionCliV001(argv = process.argv.slice(2)) {
  if (!Array.isArray(argv) || argv.length !== 1) {
    process.stdout.write(`${JSON.stringify({status: 'fatal', violations: []})}\n`);
    return 2;
  }
  try {
    const result = await runPresentationTimelineCompositionDecisionV001({
      workspaceRoot: process.cwd(),
      jobPath: argv[0],
    });
    process.stdout.write(formalBytes(result.status === 'passed' ? result.decision : {
      status: result.status,
      violations: result.violations,
    }));
    return result.status === 'passed' ? 0 : result.status === 'rejected' ? 1 : 2;
  } catch {
    process.stdout.write(`${JSON.stringify({status: 'fatal', violations: []})}\n`);
    return 2;
  }
}

const isDirect = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirect) {
  void runPresentationTimelineCompositionDecisionCliV001().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
