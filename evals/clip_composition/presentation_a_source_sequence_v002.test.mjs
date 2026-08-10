import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdir, mkdtemp, readFile, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

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
  serializePresentationAFormalJsonV002,
  sha256PresentationABytesV002,
  validatePresentationAParentSemanticInputV002,
  validatePresentationASourceSequenceFormalBytesV002,
  validatePresentationASourceSequenceJobV002,
  validatePresentationASourceSequenceV002,
} from './presentation_a_source_sequence_v002.mjs';
import {runPresentationASourceSequenceJobV002} from './run_presentation_a_source_sequence_job_v002.mjs';

const H = character => character.repeat(64);
const clone = value => structuredClone(value);
const binding = (schemaVersion, bindingPath, character = 'a') => ({
  schemaVersion,
  path: bindingPath,
  fileSha256: H(character),
  canonicalSha256: H(character),
});
const implementationBindings = PRESENTATION_A_SOURCE_SEQUENCE_IMPLEMENTATION_ROLES_V002
  .map((entry, index) => ({
    path: entry.path,
    fileSha256: H(String(index + 1)),
    role: entry.role,
  }));

const makeFixture = () => {
  const sourceAtomTranscriptBinding = binding(
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
      sourceAtomTranscriptBinding,
    },
    outerRange: {
      sourceMediaId: 'source-media-000001',
      sourceStartMs: 1000,
      sourceEndMs: 1400,
    },
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
  const job = {
    schemaVersion: PRESENTATION_A_SOURCE_SEQUENCE_JOB_SCHEMA_V002,
    jobId: 'a-v002-source-sequence-job-001',
    sequenceId: 'a-v002-source-sequence-001',
    parentSemanticInputBinding: parentBinding,
    sourceMedia: {
      sourceMediaId: parent.sourceMedia.sourceMediaId,
      sourceRef: parent.sourceMedia.sourceRef,
      mediaBinding: parent.sourceMedia.mediaBinding,
      sourceAtomBinding: sourceAtomTranscriptBinding,
    },
    outerRange: parent.outerRange,
    removalDecisions: [{
      decisionId: 'layer1-v3-fixture-candidate-001-removal-000001',
      verdict: 'remove',
      evidenceBinding: humanApprovalBinding,
      sourceMediaId: parent.sourceMedia.sourceMediaId,
      sourceStartMs: 1100,
      sourceEndMs: 1150,
    }],
    outputDirectory: 'evals/clip_composition/outputs/presentation/a-v002/source-sequences/a-v002-source-sequence-001',
    implementationBindings,
  };
  const jobBinding = binding(
    PRESENTATION_A_SOURCE_SEQUENCE_JOB_SCHEMA_V002,
    'fixtures/a-v002/source-sequence-job.json',
    '9',
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
        sourceStartMs: 1100,
        sourceEndMs: 1150,
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
  return {parent, job, jobBinding, humanApproval};
};
const build = value => buildPresentationASourceSequenceV002({
  job: value.job,
  jobBinding: value.jobBinding,
  parentSemanticInput: value.parent,
  humanApproval: value.humanApproval,
});

const prepareSourceRunnerWorkspace = async ({
  proposalVideoId = 'qdczJpv8RCc',
  proposalSourcePath = 'fixtures/a-v002/source.mp4',
} = {}) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'a-v002-source-runner-'));
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
        ['fixture-candidate-001', 1000, 1400, 1100, 1150],
        ['fixture-candidate-002', 2000, 2400, 2100, 2150],
        ['fixture-candidate-003', 3000, 3400, 3100, 3150],
      ].map(([candidateId, outerStart, outerEnd, cutStart, cutEnd]) => ({
        candidateId,
        sourcePath: proposalSourcePath,
        outerRange: {sourceVideoId: proposalVideoId, startMs: outerStart, endMs: outerEnd},
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
    'fixtures/a-v002/legacy-proposal.json',
    rawProposal,
    PRESENTATION_A_PROPOSAL_SCHEMA_V002,
  );
  const humanResultPath = 'fixtures/a-v002/legacy-human-result.json';
  const humanResultBytes = serializePresentationAFormalJsonV002(rawHumanResult);
  await put(humanResultPath, humanResultBytes);
  const humanResultBinding = {
    schemaVersion: PRESENTATION_A_LEGACY_HUMAN_RESULT_SCHEMA_V002,
    path: humanResultPath,
    fileSha256: sha256PresentationABytesV002(humanResultBytes),
    canonicalSha256: canonicalSha256PresentationAJsonV002(rawHumanResult),
  };
  const normalizedApproval = buildPresentationANormalizedHumanApprovalV002({
    legacyProposal: rawProposal,
    legacyHumanResult: rawHumanResult,
    sourceProposalBinding: proposalBinding,
    sourceHumanResultBinding: humanResultBinding,
  });
  const approvalBinding = await putFormal(
    'fixtures/a-v002/normalized-human-approval.json',
    normalizedApproval,
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
      sourceMediaId: 'source-media-000001',
      ordinal: 1,
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
  const implementationBindings = [];
  for (const role of PRESENTATION_A_SOURCE_SEQUENCE_IMPLEMENTATION_ROLES_V002) {
    const bytes = await readFile(path.join(process.cwd(), role.path));
    await put(role.path, bytes);
    implementationBindings.push({
      path: role.path,
      fileSha256: sha256PresentationABytesV002(bytes),
      role: role.role,
    });
  }
  const job = {
    schemaVersion: PRESENTATION_A_SOURCE_SEQUENCE_JOB_SCHEMA_V002,
    jobId: 'source-job-001',
    sequenceId: 'source-sequence-001',
    parentSemanticInputBinding: parentBinding,
    sourceMedia: {
      sourceMediaId: parent.sourceMedia.sourceMediaId,
      sourceRef: parent.sourceMedia.sourceRef,
      mediaBinding: parent.sourceMedia.mediaBinding,
      sourceAtomBinding: transcriptBinding,
    },
    outerRange: parent.outerRange,
    removalDecisions: [{
      decisionId: normalizedApproval.decisions[0].decisionId,
      verdict: 'remove',
      evidenceBinding: approvalBinding,
      sourceMediaId: normalizedApproval.decisions[0].sourceMediaId,
      sourceStartMs: normalizedApproval.decisions[0].sourceStartMs,
      sourceEndMs: normalizedApproval.decisions[0].sourceEndMs,
    }],
    outputDirectory:
      'evals/clip_composition/outputs/presentation/a-v002/source-sequences/source-sequence-001',
    implementationBindings,
  };
  const jobPath = 'fixtures/a-v002/source-job.json';
  await put(jobPath, serializePresentationAFormalJsonV002(job));
  return {root, put, job, jobPath, humanResultPath, humanResultBytes};
};

test('ASQ001 strict job and approved removal build the exact complement', () => {
  const fixture = makeFixture();
  assert.equal(validatePresentationASourceSequenceJobV002(fixture.job), true);
  const result = build(fixture);
  assert.equal(result.status, 'passed');
  assert.deepEqual(result.sequence.segments.map(({sourceStartMs, sourceEndMs}) => [
    sourceStartMs,
    sourceEndMs,
  ]), [[1000, 1100], [1150, 1400]]);
});

test('ASQ002 no removal is a deterministic one-segment no-op', () => {
  const fixture = makeFixture();
  fixture.job.removalDecisions = [];
  const result = build(fixture);
  assert.equal(result.status, 'passed');
  assert.deepEqual(result.sequence.segments, [{
    segmentId: 'segment-0001',
    storyOrdinal: 1,
    sourceTimeOrdinal: 1,
    sourceMediaId: 'source-media-000001',
    sourceStartMs: 1000,
    sourceEndMs: 1400,
  }]);
});

test('ASQ003 unknown job fields are rejected', () => {
  const fixture = makeFixture();
  fixture.job.extra = true;
  assert.equal(validatePresentationASourceSequenceJobV002(fixture.job), false);
  assert.equal(build(fixture).violations[0].code,
    'A_SOURCE_SEQUENCE_JOB_INVALID');

  const invalidParent = makeFixture();
  invalidParent.parent.caption.sourceAtomIds.pop();
  assert.equal(build(invalidParent).violations[0].code,
    'A_PARENT_SEMANTIC_INPUT_INVALID');
});

test('ASQ004 a VAD observation cannot approve removal', () => {
  const fixture = makeFixture();
  fixture.job.removalDecisions[0].evidenceBinding = binding(
    'presentation-a-vad-observation-v001',
    'fixtures/a-v002/vad.json',
    '8',
  );
  assert.equal(build(fixture).violations[0].code,
    'A_REMOVAL_DECISION_NOT_APPROVED');
  const changedApproval = makeFixture();
  changedApproval.humanApproval.decisions[0].sourceEndMs += 1;
  assert.equal(build(changedApproval).violations[0].code,
    'A_REMOVAL_DECISION_NOT_APPROVED');

  const differentSource = makeFixture();
  differentSource.parent.sourceMedia.sourceRef = 'youtube:abcdefghijk';
  differentSource.parent.sourceMedia.mediaBinding.path = 'fixtures/a-v002/other-source.mp4';
  differentSource.job.sourceMedia.sourceRef = differentSource.parent.sourceMedia.sourceRef;
  differentSource.job.sourceMedia.mediaBinding = differentSource.parent.sourceMedia.mediaBinding;
  assert.equal(build(differentSource).violations[0].code,
    'A_REMOVAL_DECISION_NOT_APPROVED');
});

test('ASQ005 keep and defer are not executable removal verdicts', () => {
  for (const verdict of ['keep', 'defer']) {
    const fixture = makeFixture();
    fixture.job.removalDecisions[0].verdict = verdict;
    assert.equal(build(fixture).violations[0].code,
      'A_REMOVAL_DECISION_NOT_APPROVED');
  }
});

test('ASQ006 removal outside the approved outer range is rejected', () => {
  const fixture = makeFixture();
  fixture.job.removalDecisions[0].sourceStartMs = 999;
  assert.equal(build(fixture).violations[0].code,
    'A_REMOVAL_DECISION_OUTSIDE_RANGE');
});

test('ASQ007 overlapping removals are rejected', () => {
  const fixture = makeFixture();
  fixture.job.removalDecisions.push({
    ...fixture.job.removalDecisions[0],
    decisionId: 'human-remove-002',
    sourceStartMs: 1140,
    sourceEndMs: 1200,
  });
  assert.equal(build(fixture).violations[0].code,
    'A_REMOVAL_DECISION_OVERLAP');
});

test('ASQ008 removal order must already be source-time order', () => {
  const fixture = makeFixture();
  fixture.job.removalDecisions = [
    {...fixture.job.removalDecisions[0], decisionId: 'human-remove-002', sourceStartMs: 1250, sourceEndMs: 1300},
    fixture.job.removalDecisions[0],
  ];
  assert.equal(build(fixture).violations[0].code,
    'A_ADOPTED_SEQUENCE_INVALID');
});

test('ASQ009 removal of the complete outer range is rejected', () => {
  const fixture = makeFixture();
  fixture.job.removalDecisions[0].sourceStartMs = 1000;
  fixture.job.removalDecisions[0].sourceEndMs = 1400;
  assert.equal(build(fixture).violations[0].code,
    'A_ADOPTED_SEQUENCE_EMPTY');
});

test('ASQ010 output ordinals and four-digit segment ids are exact', () => {
  const fixture = makeFixture();
  const sequence = build(fixture).sequence;
  assert.deepEqual(sequence.segments.map(segment => [
    segment.segmentId,
    segment.storyOrdinal,
    segment.sourceTimeOrdinal,
  ]), [['segment-0001', 1, 1], ['segment-0002', 2, 2]]);
  assert.equal(validatePresentationASourceSequenceV002(sequence, {
    job: fixture.job,
    jobBinding: fixture.jobBinding,
    parentSemanticInput: fixture.parent,
  }), true);
  const crafted = clone(sequence);
  crafted.segments[0].sourceEndMs -= 1;
  assert.equal(validatePresentationASourceSequenceV002(crafted, {
    job: fixture.job,
    jobBinding: fixture.jobBinding,
    parentSemanticInput: fixture.parent,
  }), false);
});

test('ASQ011 v001 is not accepted as v002 formal bytes', () => {
  const value = {schemaVersion: 'zev-timeline-composition-decision-v001'};
  assert.equal(validatePresentationASourceSequenceFormalBytesV002(
    serializePresentationAFormalJsonV002(value),
  ).status, 'rejected');
});

test('ASQ012 fractional source times are rejected rather than rounded', () => {
  const fixture = makeFixture();
  fixture.job.removalDecisions[0].sourceStartMs = 1100.5;
  assert.equal(validatePresentationASourceSequenceJobV002(fixture.job), false);
});

test('ASQ013 duplicate decision ids are rejected', () => {
  const fixture = makeFixture();
  fixture.job.removalDecisions.push({
    ...fixture.job.removalDecisions[0],
    sourceStartMs: 1200,
    sourceEndMs: 1220,
  });
  assert.equal(build(fixture).violations[0].code,
    'A_REMOVAL_DECISION_INVALID');
});

test('ASQ014 formal bytes and the runner real path preserve reread and no-replace', async () => {
  const fixture = makeFixture();
  const sequence = build(fixture).sequence;
  const bytes = serializePresentationAFormalJsonV002(sequence);
  const context = {
    job: fixture.job,
    jobBinding: fixture.jobBinding,
    parentSemanticInput: fixture.parent,
  };
  assert.equal(validatePresentationASourceSequenceFormalBytesV002(bytes, context).status, 'passed');
  assert.equal(validatePresentationASourceSequenceFormalBytesV002(
    Buffer.from(bytes.toString('utf8').trimEnd(), 'utf8'),
    context,
  ).status, 'rejected');
  assert.equal(canonicalSha256PresentationAJsonV002(sequence).length, 64);
  assert.equal(validatePresentationAParentSemanticInputV002(clone(fixture.parent)), true);

  const formal = await prepareSourceRunnerWorkspace();
  const changed = await runPresentationASourceSequenceJobV002({
    workspaceRoot: formal.root,
    jobPath: formal.jobPath,
    beforePrepublicationObservation: async () => {
      await formal.put(
        formal.humanResultPath,
        Buffer.from('{"changed":true}\n', 'utf8'),
        {replace: true},
      );
    },
  });
  assert.equal(changed.exitCode, 1);
  assert.equal(changed.result.violations[0].code, 'A_SOURCE_SEQUENCE_BINDING_MISMATCH');
  await formal.put(formal.humanResultPath, formal.humanResultBytes, {replace: true});

  const successful = await runPresentationASourceSequenceJobV002({
    workspaceRoot: formal.root,
    jobPath: formal.jobPath,
  });
  assert.equal(successful.exitCode, 0);
  assert.equal(successful.result.status, 'passed');

  const noReplace = await runPresentationASourceSequenceJobV002({
    workspaceRoot: formal.root,
    jobPath: formal.jobPath,
  });
  assert.equal(noReplace.exitCode, 1);
  assert.equal(noReplace.result.violations[0].code, 'A_SOURCE_SEQUENCE_PUBLICATION_FAILED');

  const fatalResult = await runPresentationASourceSequenceJobV002({
    workspaceRoot: formal.root,
    jobPath: 'fixtures/a-v002/missing-job.json',
  });
  assert.equal(fatalResult.exitCode, 2);
  assert.equal(fatalResult.result.fatalObservation.innerCode, 'UNCLASSIFIED');

  const invalidPath = 'fixtures/a-v002/source-job-invalid.json';
  await formal.put(invalidPath, serializePresentationAFormalJsonV002({
    ...formal.job,
    unexpected: true,
  }));
  const invalid = await runPresentationASourceSequenceJobV002({
    workspaceRoot: formal.root,
    jobPath: invalidPath,
  });
  assert.equal(invalid.exitCode, 1);
  assert.equal(invalid.result.violations[0].code, 'A_SOURCE_SEQUENCE_JOB_INVALID');

  const bindingMismatchPath = 'fixtures/a-v002/source-job-binding-mismatch.json';
  const bindingMismatchJob = clone(formal.job);
  bindingMismatchJob.implementationBindings[0].fileSha256 = H('0');
  await formal.put(
    bindingMismatchPath,
    serializePresentationAFormalJsonV002(bindingMismatchJob),
  );
  const bindingMismatch = await runPresentationASourceSequenceJobV002({
    workspaceRoot: formal.root,
    jobPath: bindingMismatchPath,
  });
  assert.equal(bindingMismatch.exitCode, 1);
  assert.equal(bindingMismatch.result.violations[0].code,
    'A_SOURCE_SEQUENCE_BINDING_MISMATCH');

  const wrongProposalVideo = await prepareSourceRunnerWorkspace({
    proposalVideoId: 'abcdefghijk',
  });
  const wrongProposalVideoResult = await runPresentationASourceSequenceJobV002({
    workspaceRoot: wrongProposalVideo.root,
    jobPath: wrongProposalVideo.jobPath,
  });
  assert.equal(wrongProposalVideoResult.exitCode, 1);
  assert.equal(wrongProposalVideoResult.result.violations[0].code,
    'A_SOURCE_SEQUENCE_BINDING_MISMATCH');

  const wrongProposalPath = await prepareSourceRunnerWorkspace({
    proposalSourcePath: 'fixtures/a-v002/other-source.mp4',
  });
  const wrongProposalPathResult = await runPresentationASourceSequenceJobV002({
    workspaceRoot: wrongProposalPath.root,
    jobPath: wrongProposalPath.jobPath,
  });
  assert.equal(wrongProposalPathResult.exitCode, 1);
  assert.equal(wrongProposalPathResult.result.violations[0].code,
    'A_SOURCE_SEQUENCE_BINDING_MISMATCH');

  const cli = spawnSync(process.execPath, [
    path.join(process.cwd(), 'evals/clip_composition/run_presentation_a_source_sequence_job_v002.mjs'),
    invalidPath,
  ], {cwd: formal.root});
  assert.equal(cli.status, 1);
  assert.equal(cli.stderr.length, 0);
  assert.equal(decodePresentationAStrictJsonV002(cli.stdout).value.status, 'rejected');
  const wrongArity = spawnSync(process.execPath, [
    path.join(process.cwd(), 'evals/clip_composition/run_presentation_a_source_sequence_job_v002.mjs'),
  ], {cwd: formal.root});
  assert.equal(wrongArity.status, 2);
  assert.equal(decodePresentationAStrictJsonV002(wrongArity.stdout).value.status, 'fatal');
});
