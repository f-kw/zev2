import assert from 'node:assert/strict';
import test from 'node:test';
import {
  projectPresentationInstructionRendererCompletionV002 as projectDraw,
  qualifyPresentationInstructionRendererCompletionV002 as qualifyDraw,
} from './run_presentation_instruction_renderer_job_v002.ts';
import {
  projectAdoptedRendererCompletionV001 as projectCore,
  qualifyAdoptedRendererCompletionV001 as qualifyCore,
} from './adopted_media_manufacturing_v001.mts';
import {
  assertQualifiedDigestRepresentativeCompletionV001,
  evaluateDigestRepresentativeCompletionV001,
} from './digest_representative_completion_v001.mjs';

// Small synthetic result shapes exercise the production projections only.
// They carry no private authority, grant, owner/device, media, or publication.
const representative = (status = 'passed-representative') => {
  const outputRoot = 'runtime/artifacts/test-only-representative',
    smallBinding = (name: string) => ({path: `${outputRoot}/${name}.json`, fileSha256: 'a'.repeat(64), sizeBytes: 1});
  const policy = {schemaVersion: 'digest-representative-verification-policy-v001',
    mode: 'representative-plus-rules-v001', representativeInstructionIds: ['second-instruction'],
    permittedMethods: ['text-clock-context'], confirmationRecordPath: `${outputRoot}/confirmation.json`};
  const bindings = {outputRoot, planId: 'test-only-plan', approvedJobBinding: smallBinding('job'),
    authorizationBinding: smallBinding('authorization'), manifestBinding: smallBinding('manifest'),
    typographySettingsBinding: smallBinding('typography'), rendererPlanCanonicalSha256: 'b'.repeat(64),
    completedMedia: {path: '/tmp/test-only-no-media.mp4', fileSha256: 'c'.repeat(64), sizeBytes: 1}};
  const plan = {elements: [{instructionId: 'first-instruction', startFrame: 0, endFrameExclusive: 30},
    {instructionId: 'second-instruction', startFrame: 30, endFrameExclusive: 61}]};
  const ruleQc = {status: 'passed', instructionCount: 2, violations: [], checks: {
    instructionApplication: {status: 'passed'}, layoutAndVisibility: {status: 'passed'}, media: {status: 'passed'}},
    mediaEvidence: {expectedAudio: {present: true, codecName: 'aac', packetPayloadSha256: 'd'.repeat(64)},
      observed: {audio: {codecName: 'aac', packetPayloadSha256: 'd'.repeat(64)}}}};
  const record = {schemaVersion: 'digest-representative-verification-record-v001', planId: bindings.planId,
    approvedJobBinding: bindings.approvedJobBinding, authorizationBinding: bindings.authorizationBinding,
    manifestBinding: bindings.manifestBinding, typographySettingsBinding: bindings.typographySettingsBinding,
    rendererPlanCanonicalSha256: bindings.rendererPlanCanonicalSha256,
    completedMedia: {fileSha256: bindings.completedMedia.fileSha256, sizeBytes: bindings.completedMedia.sizeBytes},
    confirmedAt: '2026-10-04T03:00:00Z', representatives: [{instructionId: 'second-instruction',
      startFrame: 30, endFrameExclusive: 61, observedAtFrame: 45, method: 'text-clock-context',
      result: 'accepted', evidenceBinding: smallBinding('evidence'), note: 'Synthetic structural observation only'}],
    observations: {wholeVideoPlayback: 'not-evaluated', audioListening: 'not-evaluated', humanQualityAdoption: 'not-evaluated'}};
  return evaluateDigestRepresentativeCompletionV001({policy, bindings, plan, ruleQc,
    representativeRecord: status === 'confirmation-pending' ? null : record,
    representativeRecordBinding: status === 'confirmation-pending' ? null : smallBinding('confirmation')});
};
const draw = (verification: any) => ({exitCode: 0, finalQc: verification, verification,
  verificationMode: 'representative-plus-rules-v001', counterfactualQcExecuted: false,
  workVideo: '/tmp/test-only-no-media.mp4'});
const rendered = (value: any) => ({exitCode: value.exitCode, result: {
  status: value.verification?.complete ? 'completed' : 'confirmation-pending',
  qc: value.finalQc, verification: value.verification,
  verificationMode: value.verificationMode, counterfactualQcExecuted: value.counterfactualQcExecuted,
  publication: {status: 'published', outputDirectory: '/tmp/test-only-no-output',
    video: value.verification?.bindings.completedMedia},
}});

test('the caller and Core keep the existing full-QC acceptance and reject full-QC failures', async () => {
  const finalQc = {schemaVersion: 'presentation-render-qc-v002', status: 'passed'};
  const full = {exitCode: 0, finalQc};
  const completion = await qualifyDraw(full);
  assert.equal(completion?.representative, false);
  assert.equal(completion?.status, 'completed');
  assert.equal(completion?.qc, finalQc);
  const result = {exitCode: 0, result: {status: 'completed', qc: finalQc}};
  const core = await qualifyCore(result);
  assert.equal(core.representative, false);
  assert.equal(core.qc, finalQc);
  assert.equal(projectDraw({...full, exitCode: 1}), null);
  assert.equal(projectDraw({exitCode: 0, finalQc: {status: 'failed'}}), null);
  assert.equal(projectCore({exitCode: 0, result: {status: 'completed', qc: {status: 'failed'}}}), null);
  await assert.rejects(qualifyCore({exitCode: 0, result: {status: 'completed', qc: {status: 'failed'}}}));
});

test('representative projection preserves the same verification object and explicit completion status', () => {
  const verification = representative(), value = draw(verification);
  const completion = projectDraw(value), core = projectCore(rendered(value));
  assert.equal(completion?.representative, true);
  assert.equal(completion?.status, 'completed');
  assert.equal(completion?.complete, true);
  assert.equal(completion?.qc.status, 'passed-representative');
  assert.equal(completion?.verification, verification);
  assert.equal(core?.verification, verification);
  assert.equal(core?.qc, verification);
  assert.equal(core?.complete, true);
});

test('confirmation-pending projection keeps the media result pending and never converts it to full passed', () => {
  const verification = representative('confirmation-pending'), value = draw(verification);
  const completion = projectDraw(value), core = projectCore(rendered(value));
  assert.equal(completion?.status, 'confirmation-pending');
  assert.equal(completion?.complete, false);
  assert.equal(completion?.qc.status, 'confirmation-pending');
  assert.equal(completion?.verification, verification);
  assert.equal(core?.status, 'confirmation-pending');
  assert.equal(core?.complete, false);
  assert.equal(core?.verification, verification);
  assert.equal(projectCore({...rendered(value), result: {...rendered(value).result, status: 'completed'}}), null);
});

test('caller projection refuses cloned finalQc, failed results and contradictory verification flags', () => {
  const value = draw(representative());
  assert.equal(projectDraw({...value, finalQc: structuredClone(value.verification)}), null);
  assert.equal(projectDraw({...value, finalQc: {status: 'passed'}}), null);
  assert.equal(projectDraw({...value, counterfactualQcExecuted: true}), null);
  assert.equal(projectDraw({...value, verificationMode: 'full'}), null);
  assert.equal(projectDraw({...value, exitCode: 2}), null);
  for (const change of [
    {status: 'failed', complete: false}, {status: 'passed', complete: true},
    {schemaVersion: 'other-schema'}, {complete: false},
  ]) assert.equal(projectDraw(draw({...representative(), ...change})), null);
});

test('a valid representative projection without approved policy cannot pass either publication gate', async () => {
  for (const status of ['passed-representative', 'confirmation-pending']) {
    const value = draw(representative(status));
    assert.equal(projectDraw(value)?.representative, true);
    assert.equal(await qualifyDraw(value), null);
    await assert.rejects(qualifyCore(rendered(value), undefined, '/tmp/test-only-no-media.mp4'));
    await assert.rejects(assertQualifiedDigestRepresentativeCompletionV001(
      value.verification, undefined, value.workVideo,
    ));
  }
});

test('a caller-created policy/context and a cloned result cannot mint representative authority', async () => {
  const value = draw(representative());
  const fakeContext: any = {approvedJob: {job: {verificationPolicy: {
    schemaVersion: 'digest-representative-verification-policy-v001',
    mode: 'representative-plus-rules-v001', representativeInstructionIds: ['test-only'],
    permittedMethods: ['test-only'], confirmationRecordPath: 'runtime/artifacts/test-only/confirmation.json',
  }}}, outputRoot: 'runtime/artifacts/test-only', storageRoot: '/tmp',
    generatedRoot: '/tmp/test-only', tempDirectory: '/tmp/test-only/temp',
    resolve: () => value.workVideo, assertCurrent: async () => {}, composeMedia: async () => {}};
  await assert.rejects(qualifyDraw(value, fakeContext));
  await assert.rejects(qualifyCore(rendered(value), fakeContext, value.workVideo));
  for (const verification of [value.verification, structuredClone(value.verification)]) {
    await assert.rejects(assertQualifiedDigestRepresentativeCompletionV001(
      verification, fakeContext, value.workVideo,
    ));
  }
});

test('Core refuses successful-looking renderer status when the retained verification disagrees', () => {
  const value = draw(representative());
  assert.equal(projectCore({...rendered(value), result: {...rendered(value).result, status: 'failed'}}), null);
  assert.equal(projectCore({...rendered(value), result: {...rendered(value).result,
    qc: structuredClone(value.verification)}}), null);
  assert.equal(projectCore({...rendered(value), result: {...rendered(value).result,
    counterfactualQcExecuted: true}}), null);
});
