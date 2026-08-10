import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdir, mkdtemp, readFile, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  PRESENTATION_A_MEANING_INFORMATION_IMPLEMENTATION_ROLES_V002,
  PRESENTATION_A_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V002,
  buildPresentationAMeaningInformationPackageV002,
  inspectPresentationAMeaningInformationPackageV002,
  serializePresentationAFormalJsonV002,
  validatePresentationAMeaningInformationPackageFormalBytesV002,
  validatePresentationAMeaningInformationPackageJobV002,
  validatePresentationAMeaningInformationPackageV002,
} from './presentation_a_meaning_information_package_v002.mjs';
import {
  PRESENTATION_A_HUMAN_APPROVAL_SCHEMA_V002,
  PRESENTATION_A_LEGACY_HUMAN_RESULT_SCHEMA_V002,
  PRESENTATION_A_PARENT_SEMANTIC_INPUT_SCHEMA_V002,
  PRESENTATION_A_PROPOSAL_SCHEMA_V002,
  PRESENTATION_A_SOURCE_ATOM_TRANSCRIPT_SCHEMA_V002,
  PRESENTATION_A_SOURCE_SEQUENCE_IMPLEMENTATION_ROLES_V002,
  PRESENTATION_A_SOURCE_SEQUENCE_JOB_SCHEMA_V002,
  buildPresentationANormalizedHumanApprovalV002,
  buildPresentationASourceSequenceV002,
  canonicalSha256PresentationAJsonV002,
  decodePresentationAStrictJsonV002,
  sha256PresentationABytesV002,
} from './presentation_a_source_sequence_v002.mjs';
import {runPresentationAMeaningInformationPackageJobV002} from './run_presentation_a_meaning_information_package_job_v002.mjs';

const H = character => character.repeat(64);
const clone = value => structuredClone(value);
const binding = (schemaVersion, bindingPath, character = 'a') => ({
  schemaVersion,
  path: bindingPath,
  fileSha256: H(character),
  canonicalSha256: H(character),
});
const impl = roles => roles.map((entry, index) => ({
  path: entry.path,
  fileSha256: H((index + 1).toString(16)),
  role: entry.role,
}));

const fixture = (removals = [{start: 1050, end: 1070}]) => {
  const transcriptBinding = binding(
    PRESENTATION_A_SOURCE_ATOM_TRANSCRIPT_SCHEMA_V002,
    'fixtures/a-v002/source-atoms.json',
    'b',
  );
  const humanApprovalBinding = binding(
    PRESENTATION_A_HUMAN_APPROVAL_SCHEMA_V002,
    'fixtures/a-v002/human-approval.json',
    'c',
  );
  const parent = {
    schemaVersion: PRESENTATION_A_PARENT_SEMANTIC_INPUT_SCHEMA_V002,
    proofInputId: 'layer1-v3-fixture-candidate-001',
    sourceMedia: {
      sourceMediaId: 'source-media-000001',
      ordinal: 1,
      sourceRef: 'youtube:qdczJpv8RCc',
      mediaBinding: {path: 'fixtures/a-v002/source.mp4', fileSha256: H('d')},
      sourceIdentityBinding: binding(
        'presentation-material-source-identity-v001',
        'fixtures/a-v002/source-identity.json',
        'e',
      ),
      sourceAtomTranscriptBinding: transcriptBinding,
    },
    outerRange: {sourceMediaId: 'source-media-000001', sourceStartMs: 1000, sourceEndMs: 1400},
    caption: {
      captionId: 'proof-caption-001',
      ordinal: 1,
      text: 'あいう',
      sourceAtomIds: ['source-atom-000001', 'source-atom-000002', 'source-atom-000003'],
    },
    sourceAtoms: [
      {sourceAtomId: 'source-atom-000001', ordinal: 1, text: 'あ', sourceStartMs: 1000, sourceEndMs: 1120},
      {sourceAtomId: 'source-atom-000002', ordinal: 2, text: 'い', sourceStartMs: 1120, sourceEndMs: 1280},
      {sourceAtomId: 'source-atom-000003', ordinal: 3, text: 'う', sourceStartMs: 1280, sourceEndMs: 1400},
    ],
    humanApprovalBinding,
  };
  const parentBinding = binding(
    PRESENTATION_A_PARENT_SEMANTIC_INPUT_SCHEMA_V002,
    'fixtures/a-v002/proof-input.json',
    'f',
  );
  const sourceJob = {
    schemaVersion: PRESENTATION_A_SOURCE_SEQUENCE_JOB_SCHEMA_V002,
    jobId: 'a-v002-source-sequence-job-001',
    sequenceId: 'a-v002-source-sequence-001',
    parentSemanticInputBinding: parentBinding,
    sourceMedia: {
      sourceMediaId: parent.sourceMedia.sourceMediaId,
      sourceRef: parent.sourceMedia.sourceRef,
      mediaBinding: parent.sourceMedia.mediaBinding,
      sourceAtomBinding: transcriptBinding,
    },
    outerRange: parent.outerRange,
    removalDecisions: removals.map((range, index) => ({
      decisionId: `layer1-v3-fixture-candidate-001-removal-${String(index + 1).padStart(6, '0')}`,
      verdict: 'remove',
      evidenceBinding: humanApprovalBinding,
      sourceMediaId: parent.sourceMedia.sourceMediaId,
      sourceStartMs: range.start,
      sourceEndMs: range.end,
    })),
    outputDirectory: 'evals/clip_composition/outputs/presentation/a-v002/source-sequences/a-v002-source-sequence-001',
    implementationBindings: impl(PRESENTATION_A_SOURCE_SEQUENCE_IMPLEMENTATION_ROLES_V002),
  };
  const sourceJobBinding = binding(
    PRESENTATION_A_SOURCE_SEQUENCE_JOB_SCHEMA_V002,
    'fixtures/a-v002/source-job.json',
    '7',
  );
  const humanApproval = {
    schemaVersion: PRESENTATION_A_HUMAN_APPROVAL_SCHEMA_V002,
    approvalId: 'layer1-v3-qdczJpv8RCc-human-approval-v001',
    reviewedBy: 'kawafmm',
    sourceProposalBinding: binding(
      PRESENTATION_A_PROPOSAL_SCHEMA_V002,
      'fixtures/a-v002/legacy-proposal.json',
      'a',
    ),
    sourceHumanResultBinding: binding(
      PRESENTATION_A_LEGACY_HUMAN_RESULT_SCHEMA_V002,
      'fixtures/a-v002/legacy-human-result.json',
      '1',
    ),
    decisions: [
      {
        decisionId: 'layer1-v3-fixture-candidate-001-removal-000001',
        candidateId: 'fixture-candidate-001',
        verdict: 'remove',
        seamIssueReported: false,
        sourceMediaId: 'source-media-000001',
        sourceStartMs: removals[0]?.start ?? 1050,
        sourceEndMs: removals[0]?.end ?? 1070,
      },
      {
        decisionId: 'layer1-v3-fixture-candidate-002-removal-000001',
        candidateId: 'fixture-candidate-002',
        verdict: 'remove',
        seamIssueReported: false,
        sourceMediaId: 'source-media-000001',
        sourceStartMs: 2000,
        sourceEndMs: 2100,
      },
      {
        decisionId: 'layer1-v3-fixture-candidate-003-removal-000001',
        candidateId: 'fixture-candidate-003',
        verdict: 'remove',
        seamIssueReported: false,
        sourceMediaId: 'source-media-000001',
        sourceStartMs: 3000,
        sourceEndMs: 3100,
      },
    ],
  };
  const sourceBuild = buildPresentationASourceSequenceV002({
    job: sourceJob,
    jobBinding: sourceJobBinding,
    parentSemanticInput: parent,
    humanApproval,
  });
  const sequence = sourceBuild.status === 'passed' ? sourceBuild.sequence : {
    schemaVersion: 'presentation-adopted-source-sequence-v002',
    sequenceId: sourceJob.sequenceId,
    parentSemanticInputBinding: structuredClone(parentBinding),
    segments: (() => {
      const ranges = [];
      let cursor = parent.outerRange.sourceStartMs;
      for (const removal of removals) {
        if (cursor < removal.start) ranges.push([cursor, removal.start]);
        cursor = removal.end;
      }
      if (cursor < parent.outerRange.sourceEndMs) {
        ranges.push([cursor, parent.outerRange.sourceEndMs]);
      }
      return ranges.map(([sourceStartMs, sourceEndMs], index) => ({
        segmentId: `segment-${String(index + 1).padStart(4, '0')}`,
        storyOrdinal: index + 1,
        sourceTimeOrdinal: index + 1,
        sourceMediaId: parent.sourceMedia.sourceMediaId,
        sourceStartMs,
        sourceEndMs,
      }));
    })(),
    removalDecisionBindings: structuredClone(sourceJob.removalDecisions),
    provenance: {formalJobBinding: structuredClone(sourceJobBinding)},
  };
  const sequenceBinding = binding(
    'presentation-adopted-source-sequence-v002',
    'fixtures/a-v002/sequence.json',
    '8',
  );
  const job = {
    schemaVersion: PRESENTATION_A_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V002,
    jobId: 'a-v002-meaning-job-001',
    packageId: 'a-v002-meaning-package-001',
    parentSemanticInputBinding: parentBinding,
    adoptedSourceSequenceBinding: sequenceBinding,
    title: {text: '', inputMode: 'none'},
    outputDirectory: 'evals/clip_composition/outputs/presentation/a-v002/meaning-information-packages/a-v002-meaning-package-001',
    implementationBindings: impl(PRESENTATION_A_MEANING_INFORMATION_IMPLEMENTATION_ROLES_V002),
  };
  const jobBinding = binding(
    PRESENTATION_A_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V002,
    'fixtures/a-v002/meaning-job.json',
    '9',
  );
  return {
    parent,
    sequence,
    parentSemanticInput: parent,
    adoptedSourceSequence: sequence,
    job,
    jobBinding,
  };
};

const build = value => buildPresentationAMeaningInformationPackageV002({
  job: value.job,
  jobBinding: value.jobBinding,
  parentSemanticInput: value.parent,
  adoptedSourceSequence: value.sequence,
});

const prepareMeaningRunnerWorkspace = async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'a-v002-meaning-runner-'));
  const put = async (relativePath, bytes, {replace = false} = {}) => {
    const absolute = path.join(root, relativePath);
    await mkdir(path.dirname(absolute), {recursive: true});
    await writeFile(absolute, bytes, replace ? {} : {flag: 'wx'});
  };
  const putFormal = async (relativePath, value, schemaVersion = value.schemaVersion) => {
    const bytes = serializePresentationAFormalJsonV002(value);
    await put(relativePath, bytes);
    return {
      schemaVersion,
      path: relativePath,
      fileSha256: sha256PresentationABytesV002(bytes),
      canonicalSha256: canonicalSha256PresentationAJsonV002(value),
    };
  };
  const rawProposal = {
    kind: 'layer1_v003_conservative_long_gap_pair_review_input',
    version: 'layer1-v003-long-gap-pair-review-v001',
    humanReview: {
      itemCount: 3,
      selections: [
        ['fixture-candidate-001', 1000, 1400, 1050, 1070],
        ['fixture-candidate-002', 2000, 2400, 2100, 2150],
        ['fixture-candidate-003', 3000, 3400, 3100, 3150],
      ].map(([candidateId, outerStart, outerEnd, cutStart, cutEnd]) => ({
        candidateId,
        sourcePath: 'fixtures/a-v002/source.mp4',
        outerRange: {sourceVideoId: 'qdczJpv8RCc', startMs: outerStart, endMs: outerEnd},
        cutDirectives: [{startMs: cutStart, endMs: cutEnd}],
      })),
    },
  };
  const rawHumanResult = {
    kind: 'layer1_v003_conservative_long_gap_pair_review_result',
    version: 'layer1-v003-long-gap-pair-review-result-v001',
    reviewedBy: 'kawafmm',
    results: ['fixture-candidate-001', 'fixture-candidate-002', 'fixture-candidate-003']
      .map(candidateId => ({candidateId, decision: '差はない', seamIssueReported: false})),
    summary: {same: 3, seamIssuesReported: 0},
  };
  const proposalBinding = await putFormal(
    'fixtures/a-v002/legacy-proposal.json', rawProposal, PRESENTATION_A_PROPOSAL_SCHEMA_V002,
  );
  const humanResultBinding = await putFormal(
    'fixtures/a-v002/legacy-human-result.json',
    rawHumanResult,
    PRESENTATION_A_LEGACY_HUMAN_RESULT_SCHEMA_V002,
  );
  const approval = buildPresentationANormalizedHumanApprovalV002({
    legacyProposal: rawProposal,
    legacyHumanResult: rawHumanResult,
    sourceProposalBinding: proposalBinding,
    sourceHumanResultBinding: humanResultBinding,
  });
  const approvalBinding = await putFormal(
    'fixtures/a-v002/normalized-human-approval.json', approval,
  );
  const rawTranscriptBytes = Buffer.from('{"segments":[]}\n', 'utf8');
  const mediaBytes = Buffer.from('media', 'utf8');
  await put('fixtures/a-v002/raw-transcript.json', rawTranscriptBytes);
  await put('fixtures/a-v002/source.mp4', mediaBytes);
  const transcriptBinding = await putFormal('fixtures/a-v002/source-atoms.json', {
    schemaVersion: PRESENTATION_A_SOURCE_ATOM_TRANSCRIPT_SCHEMA_V002,
    transcriptId: 'normalized-transcript-001',
    sourceRef: 'youtube:qdczJpv8RCc',
    sourceTranscriptByteBinding: {
      path: 'fixtures/a-v002/raw-transcript.json',
      fileSha256: sha256PresentationABytesV002(rawTranscriptBytes),
    },
    atoms: [
      {sourceAtomId: 'source-atom-000001', ordinal: 1, text: 'あ', sourceStartMs: 1000, sourceEndMs: 1120},
      {sourceAtomId: 'source-atom-000002', ordinal: 2, text: 'い', sourceStartMs: 1120, sourceEndMs: 1280},
      {sourceAtomId: 'source-atom-000003', ordinal: 3, text: 'う', sourceStartMs: 1280, sourceEndMs: 1400},
    ],
  });
  const sourceIdentityBinding = await putFormal('fixtures/a-v002/source-identity.json', {
    schemaVersion: 'presentation-material-source-identity-v001',
  });
  const parent = {
    schemaVersion: PRESENTATION_A_PARENT_SEMANTIC_INPUT_SCHEMA_V002,
    proofInputId: 'layer1-v3-fixture-candidate-001',
    sourceMedia: {
      sourceMediaId: 'source-media-000001', ordinal: 1,
      sourceRef: 'youtube:qdczJpv8RCc',
      mediaBinding: {
        path: 'fixtures/a-v002/source.mp4',
        fileSha256: sha256PresentationABytesV002(mediaBytes),
      },
      sourceIdentityBinding,
      sourceAtomTranscriptBinding: transcriptBinding,
    },
    outerRange: {sourceMediaId: 'source-media-000001', sourceStartMs: 1000, sourceEndMs: 1400},
    caption: {
      captionId: 'caption-001', ordinal: 1, text: 'あいう',
      sourceAtomIds: ['source-atom-000001', 'source-atom-000002', 'source-atom-000003'],
    },
    sourceAtoms: [
      {sourceAtomId: 'source-atom-000001', ordinal: 1, text: 'あ', sourceStartMs: 1000, sourceEndMs: 1120},
      {sourceAtomId: 'source-atom-000002', ordinal: 2, text: 'い', sourceStartMs: 1120, sourceEndMs: 1280},
      {sourceAtomId: 'source-atom-000003', ordinal: 3, text: 'う', sourceStartMs: 1280, sourceEndMs: 1400},
    ],
    humanApprovalBinding: approvalBinding,
  };
  const parentBinding = await putFormal('fixtures/a-v002/proof-input.json', parent);
  const sourceJobBinding = binding(
    PRESENTATION_A_SOURCE_SEQUENCE_JOB_SCHEMA_V002,
    'fixtures/a-v002/source-job.json',
    '7',
  );
  const sourceJob = {
    schemaVersion: PRESENTATION_A_SOURCE_SEQUENCE_JOB_SCHEMA_V002,
    jobId: 'source-job-001', sequenceId: 'source-sequence-001',
    parentSemanticInputBinding: parentBinding,
    sourceMedia: {
      sourceMediaId: parent.sourceMedia.sourceMediaId,
      sourceRef: parent.sourceMedia.sourceRef,
      mediaBinding: parent.sourceMedia.mediaBinding,
      sourceAtomBinding: transcriptBinding,
    },
    outerRange: parent.outerRange,
    removalDecisions: [{
      decisionId: approval.decisions[0].decisionId,
      verdict: 'remove', evidenceBinding: approvalBinding,
      sourceMediaId: approval.decisions[0].sourceMediaId,
      sourceStartMs: approval.decisions[0].sourceStartMs,
      sourceEndMs: approval.decisions[0].sourceEndMs,
    }],
    outputDirectory: 'evals/clip_composition/outputs/presentation/a-v002/source-sequences/source-sequence-001',
    implementationBindings: impl(PRESENTATION_A_SOURCE_SEQUENCE_IMPLEMENTATION_ROLES_V002),
  };
  const sourceBuild = buildPresentationASourceSequenceV002({
    job: sourceJob, jobBinding: sourceJobBinding, parentSemanticInput: parent,
    humanApproval: approval,
  });
  assert.equal(sourceBuild.status, 'passed');
  const sequencePath = 'fixtures/a-v002/source-sequence.json';
  const sequenceBytes = serializePresentationAFormalJsonV002(sourceBuild.sequence);
  await put(sequencePath, sequenceBytes);
  const sequenceBinding = {
    schemaVersion: sourceBuild.sequence.schemaVersion,
    path: sequencePath,
    fileSha256: sha256PresentationABytesV002(sequenceBytes),
    canonicalSha256: canonicalSha256PresentationAJsonV002(sourceBuild.sequence),
  };
  const implementationBindings = [];
  for (const role of PRESENTATION_A_MEANING_INFORMATION_IMPLEMENTATION_ROLES_V002) {
    const bytes = await readFile(path.join(process.cwd(), role.path));
    await put(role.path, bytes);
    implementationBindings.push({
      path: role.path,
      fileSha256: sha256PresentationABytesV002(bytes),
      role: role.role,
    });
  }
  const job = {
    schemaVersion: PRESENTATION_A_MEANING_INFORMATION_PACKAGE_JOB_SCHEMA_V002,
    jobId: 'meaning-job-001', packageId: 'meaning-package-001',
    parentSemanticInputBinding: parentBinding,
    adoptedSourceSequenceBinding: sequenceBinding,
    title: {text: '', inputMode: 'none'},
    outputDirectory:
      'evals/clip_composition/outputs/presentation/a-v002/meaning-information-packages/meaning-package-001',
    implementationBindings,
  };
  const jobPath = 'fixtures/a-v002/meaning-job.json';
  await put(jobPath, serializePresentationAFormalJsonV002(job));
  return {root, put, job, jobPath, sequencePath, sequenceBytes};
};

test('AMP001 an untouched atom has one exact retained span', () => {
  const value = fixture();
  const result = build(value);
  assert.equal(result.status, 'passed');
  assert.deepEqual(result.package.atomOccurrences[2].retainedSpans, [{
    timelineSegmentId: 'segment-0002',
    sourceStartMs: 1280,
    sourceEndMs: 1400,
  }]);
});

test('AMP002 one logical atom remains once with two retained spans', () => {
  const value = fixture();
  const result = build(value);
  assert.equal(result.package.atomOccurrences[0].text, 'あ');
  assert.deepEqual(result.package.atomOccurrences[0].retainedSpans, [
    {timelineSegmentId: 'segment-0001', sourceStartMs: 1000, sourceEndMs: 1050},
    {timelineSegmentId: 'segment-0002', sourceStartMs: 1070, sourceEndMs: 1120},
  ]);
  assert.equal(result.package.atomOccurrences.filter(item => item.sourceAtomId
    === 'source-atom-000001').length, 1);
});

test('AMP003 two cuts in one atom produce a three-span array', () => {
  const value = fixture([{start: 1150, end: 1170}, {start: 1200, end: 1220}]);
  const result = build(value);
  assert.equal(result.status, 'passed');
  assert.deepEqual(result.package.atomOccurrences[1].retainedSpans, [
    {timelineSegmentId: 'segment-0001', sourceStartMs: 1120, sourceEndMs: 1150},
    {timelineSegmentId: 'segment-0002', sourceStartMs: 1170, sourceEndMs: 1200},
    {timelineSegmentId: 'segment-0003', sourceStartMs: 1220, sourceEndMs: 1280},
  ]);
});

test('AMP004 intersections preserve integer half-open boundaries without rounding', () => {
  const value = fixture([{start: 1111, end: 1121}]);
  const result = build(value);
  assert.deepEqual(result.package.atomOccurrences[0].retainedSpans, [{
    timelineSegmentId: 'segment-0001', sourceStartMs: 1000, sourceEndMs: 1111,
  }]);
  assert.deepEqual(result.package.atomOccurrences[1].retainedSpans[0], {
    timelineSegmentId: 'segment-0002', sourceStartMs: 1121, sourceEndMs: 1280,
  });

  const mismatched = fixture();
  const mismatchedPackage = build(mismatched).package;
  mismatchedPackage.atomOccurrences[0].retainedSpans[0].sourceEndMs -= 1;
  assert.equal(inspectPresentationAMeaningInformationPackageV002(
    mismatchedPackage,
    mismatched,
  ).violations[0].code, 'A_SOURCE_ATOM_SPAN_MISMATCH');
});

test('AMP005 every source atom creates exactly one occurrence and one caption reference', () => {
  const result = build(fixture()).package;
  assert.equal(result.atomOccurrences.length, 3);
  assert.deepEqual(result.captions[0].atomOccurrenceIds,
    result.atomOccurrences.map(item => item.atomOccurrenceId));
});

test('AMP006 a fully removed source atom is rejected', () => {
  const value = fixture([{start: 1120, end: 1280}]);
  assert.equal(build(value).violations[0].code, 'A_SOURCE_ATOM_FULLY_REMOVED');
});

test('AMP007 malformed atom fields are owned as source atom invalid', () => {
  const value = fixture();
  value.parent.sourceAtoms[1].sourceEndMs = value.parent.sourceAtoms[1].sourceStartMs;
  assert.equal(build(value).violations[0].code, 'A_SOURCE_ATOM_INVALID');

  const invalidParent = fixture();
  invalidParent.parent.outerRange.sourceMediaId = 'source-media-000002';
  assert.equal(build(invalidParent).violations[0].code, 'A_MEANING_PARENT_INVALID');
});

test('AMP008 source atom order is rejected rather than sorted', () => {
  const value = fixture();
  value.parent.sourceAtoms[1].sourceStartMs = 999;
  value.parent.sourceAtoms[1].sourceEndMs = 1100;
  assert.equal(build(value).violations[0].code, 'A_SOURCE_ATOM_ORDER_INVALID');
});

test('AMP009 source caption text must equal the source atom byte concatenation', () => {
  const value = fixture();
  value.parent.caption.text = '別の本文';
  assert.equal(build(value).violations[0].code, 'A_SOURCE_ATOM_TEXT_MISMATCH');
});

test('AMP010 caption coverage rejects a missing occurrence id', () => {
  const value = fixture();
  const packageValue = build(value).package;
  packageValue.captions[0].atomOccurrenceIds.pop();
  assert.equal(inspectPresentationAMeaningInformationPackageV002(packageValue, value)
    .violations[0].code, 'A_CAPTION_COVERAGE_MISMATCH');
});

test('AMP011 caption text rejects byte differences', () => {
  const value = fixture();
  const packageValue = build(value).package;
  packageValue.captions[0].text = 'あい違';
  assert.equal(inspectPresentationAMeaningInformationPackageV002(packageValue, value)
    .violations[0].code, 'A_CAPTION_TEXT_MISMATCH');
});

test('AMP012 provenance binding mismatches are rejected', () => {
  const value = fixture();
  const packageValue = build(value).package;
  packageValue.provenance.parentSemanticInputBinding.fileSha256 = H('0');
  assert.equal(inspectPresentationAMeaningInformationPackageV002(packageValue, value)
    .violations[0].code, 'A_MEANING_BINDING_MISMATCH');
});

test('AMP013 v001 meaning packages are not accepted', () => {
  assert.equal(validatePresentationAMeaningInformationPackageFormalBytesV002(
    serializePresentationAFormalJsonV002({schemaVersion: 'zev-meaning-information-package-v001'}),
  ).status, 'rejected');
});

test('AMP014 formal bytes require the exact serializer output', () => {
  const value = fixture();
  const packageValue = build(value).package;
  const bytes = serializePresentationAFormalJsonV002(packageValue);
  assert.equal(validatePresentationAMeaningInformationPackageFormalBytesV002(bytes, value).status,
    'passed');
  const malformed = validatePresentationAMeaningInformationPackageFormalBytesV002(
    Buffer.from(bytes.toString('utf8').trimEnd(), 'utf8'),
    value,
  );
  assert.equal(malformed.status, 'rejected');
  assert.equal(malformed.violations[0].code, 'A_MEANING_PACKAGE_BYTE_INVALID');
});

test('AMP015 timeline values must match the adopted source sequence exactly', () => {
  const value = fixture();
  const packageValue = build(value).package;
  packageValue.timelineComposition.segments[1].sourceEndMs += 1;
  assert.equal(inspectPresentationAMeaningInformationPackageV002(packageValue, value)
    .violations[0].code, 'A_MEANING_SEQUENCE_INVALID');
});

test('AMP016 exact v002 schema and runner real path preserve reread and no-replace', async () => {
  const value = fixture();
  assert.equal(validatePresentationAMeaningInformationPackageJobV002(value.job), true);
  const packageValue = build(value).package;
  assert.deepEqual(Object.keys(packageValue.sourceMedia[0]), [
    'sourceMediaId', 'ordinal', 'sourceRef', 'mediaBinding',
    'sourceIdentityBinding', 'sourceAtomTranscriptBinding',
  ]);
  assert.equal(validatePresentationAMeaningInformationPackageV002(packageValue, value), true);
  const v1Shape = clone(packageValue);
  v1Shape.sourceMedia[0].retainedSourceAtomsBinding = {};
  assert.equal(validatePresentationAMeaningInformationPackageV002(v1Shape, value), false);

  const formal = await prepareMeaningRunnerWorkspace();
  const changed = await runPresentationAMeaningInformationPackageJobV002({
    workspaceRoot: formal.root,
    jobPath: formal.jobPath,
    beforePrepublicationObservation: async () => {
      await formal.put(
        formal.sequencePath,
        Buffer.from('{"changed":true}\n', 'utf8'),
        {replace: true},
      );
    },
  });
  assert.equal(changed.exitCode, 1);
  assert.equal(changed.result.violations[0].code, 'A_MEANING_BINDING_MISMATCH');
  await formal.put(formal.sequencePath, formal.sequenceBytes, {replace: true});

  const successful = await runPresentationAMeaningInformationPackageJobV002({
    workspaceRoot: formal.root,
    jobPath: formal.jobPath,
  });
  assert.equal(successful.exitCode, 0);
  assert.equal(successful.result.status, 'passed');

  const noReplace = await runPresentationAMeaningInformationPackageJobV002({
    workspaceRoot: formal.root,
    jobPath: formal.jobPath,
  });
  assert.equal(noReplace.exitCode, 1);
  assert.equal(noReplace.result.violations[0].code, 'A_MEANING_PUBLICATION_FAILED');

  const fatalResult = await runPresentationAMeaningInformationPackageJobV002({
    workspaceRoot: formal.root,
    jobPath: 'fixtures/a-v002/missing-job.json',
  });
  assert.equal(fatalResult.exitCode, 2);
  assert.equal(fatalResult.result.fatalObservation.innerCode, 'UNCLASSIFIED');

  const invalidPath = 'fixtures/a-v002/meaning-job-invalid.json';
  await formal.put(invalidPath, serializePresentationAFormalJsonV002({
    ...formal.job,
    unexpected: true,
  }));
  const invalid = await runPresentationAMeaningInformationPackageJobV002({
    workspaceRoot: formal.root,
    jobPath: invalidPath,
  });
  assert.equal(invalid.exitCode, 1);
  assert.equal(invalid.result.violations[0].code, 'A_MEANING_JOB_INVALID');

  const bindingMismatchPath = 'fixtures/a-v002/meaning-job-binding-mismatch.json';
  const bindingMismatchJob = clone(formal.job);
  bindingMismatchJob.implementationBindings[0].fileSha256 = H('0');
  await formal.put(
    bindingMismatchPath,
    serializePresentationAFormalJsonV002(bindingMismatchJob),
  );
  const bindingMismatch = await runPresentationAMeaningInformationPackageJobV002({
    workspaceRoot: formal.root,
    jobPath: bindingMismatchPath,
  });
  assert.equal(bindingMismatch.exitCode, 1);
  assert.equal(bindingMismatch.result.violations[0].code, 'A_MEANING_BINDING_MISMATCH');

  const cli = spawnSync(process.execPath, [
    path.join(
      process.cwd(),
      'evals/clip_composition/run_presentation_a_meaning_information_package_job_v002.mjs',
    ),
    invalidPath,
  ], {cwd: formal.root});
  assert.equal(cli.status, 1);
  assert.equal(cli.stderr.length, 0);
  assert.equal(decodePresentationAStrictJsonV002(cli.stdout).value.status, 'rejected');
  const wrongArity = spawnSync(process.execPath, [
    path.join(
      process.cwd(),
      'evals/clip_composition/run_presentation_a_meaning_information_package_job_v002.mjs',
    ),
  ], {cwd: formal.root});
  assert.equal(wrongArity.status, 2);
  assert.equal(decodePresentationAStrictJsonV002(wrongArity.stdout).value.status, 'fatal');
});
