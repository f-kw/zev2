import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePhase2Display, buildPhase2Composition, buildPhase2DisplayInput} from './digest_v1_phase2_captions.mts';
import {sha, formal, canonicalSha, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';

function fixture() {
  const c: Json = {plan: {planId: 'fixture', outputRoot: 'evals/clip_composition/outputs/presentation/work-digest-v1-fixture',
    authorization: {}, request: {sourceVideo: {}, transcript: {}, utterances: {}}}, planBinding: {}, candidateSetBinding: {},
    retentionBinding: {}, candidateSet: {candidates: [{candidateId: 'second'}, {candidateId: 'first'}]},
    retention: {segments: [{candidateId: 'second', segmentId: 'b', blockOrdinal: 1, sourceStartMs: 20, sourceEndMs: 40, sourceSegmentIds: [2, 3]},
      {candidateId: 'first', segmentId: 'a', blockOrdinal: 1, sourceStartMs: 10, sourceEndMs: 30, sourceSegmentIds: [1, 2]}]},
    transcript: {segments: [1, 2, 3].map(id => ({id, text: ['私', 'は', '猫'][id - 1]}))},
    utterances: {utterances: [{utteranceId: 'utterance', sourceSegmentIds: [1, 2, 3]}]},
    captionStyleTemplate: {promptInput: {schemaVersion: 'presentation-zevo-caption-selection-input-v001', taskDescription: '日本語の表示区切り',
      styleLimits: {maxLogicalWidthPerLine: 35, maxLinesPerCue: 2, characterWidthRule: 'U+0000..U+00FF=1; other Unicode code point=2'},
      captions: [{captionId: 'unused', boundaryCandidates: [{boundaryId: 'unused', text: '元'}]}]}}};
  const composition = buildPhase2Composition(c), text = buildPhase2DisplayInput(c, composition.adoption);
  const cap = text.request.input.captions[0], last = cap.boundaryCandidates.at(-1).boundaryId;
  const answer = {status: 'complete', captions: [{captionId: cap.captionId, cues: [{cueEndBoundaryId: last, lineEndBoundaryIds: [last]}]}]};
  const response = {schemaVersion: 'digest-v1-phase2-display-response-v001', requestFileSha256: sha(formal(text.request)),
    answer, judgmentNote: '一文を一行として表示する。'};
  const result = {schemaVersion: 'caption-display-skill-result-v001', skillId: 'caption-display-boundaries', skillVersion: 'v001', answer};
  return {c, composition, text, response, result};
}

test('unionした本文全量と全候補の来歴を一回の回答から既存検査へ渡す', () => {
  const {composition, text, response, result} = fixture();
  assert.equal(composition.adoption.segments.length, 1);
  assert.deepEqual(text.textInput.orderedSegments[0].candidateIds, ['first', 'second']);
  assert.equal(text.textInput.captions[0].text, '私は猫');
  assert.equal(validatePhase2Display(text, response, result).length, 1);
});

test('全体回答の欠落・重複・別字幕を投影前に拒否する', () => {
  for (const mutation of ['extra', 'wrong']) {
    const f = fixture();
    if (mutation === 'extra') f.result.answer.captions.push(structuredClone(f.result.answer.captions[0]));
    else f.result.answer.captions[0].captionId = 'unknown';
    assert.throws(() => validatePhase2Display(f.text, f.response, f.result), /CAPTION_MEMBERSHIP_CHANGED/);
  }
});

test('本文欠落と幅超過を既存validatorで拒否する', () => {
  const f = fixture(), caption = f.text.request.input.captions[0];
  const short = caption.boundaryCandidates[0].boundaryId;
  f.result.answer.captions[0].cues = [{cueEndBoundaryId: short, lineEndBoundaryIds: [short]}];
  assert.throws(() => validatePhase2Display(f.text, f.response, f.result), /FULL_COVERAGE_REQUIRED/);
  const g = fixture();
  g.text.request.input.styleLimits.maxLogicalWidthPerLine = 1;
  g.text.request.inputCanonicalSha256 = canonicalSha(g.text.request.input);
  g.text.requests[0].input.styleLimits.maxLogicalWidthPerLine = 1;
  g.text.requests[0].inputCanonicalSha256 = canonicalSha(g.text.requests[0].input);
  g.response.requestFileSha256 = sha(formal(g.text.request));
  assert.throws(() => validatePhase2Display(g.text, g.response, g.result), /LINE_TOO_WIDE/);
});

test('保存前の全体回答binding改変を拒否する', () => {
  const f = fixture(); f.response.requestFileSha256 = '0'.repeat(64);
  assert.throws(() => validatePhase2Display(f.text, f.response, f.result), /PROVENANCE_CHANGED/);
});
