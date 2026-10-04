import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {
  projectPresentationInstructionRendererCompletionV002 as projectDraw,
  qualifyPresentationInstructionRendererCompletionV002 as qualifyDraw,
  readDigestRepresentativeCompletionModuleV001,
} from './run_presentation_instruction_renderer_job_v002.ts';
import {
  projectAdoptedRendererCompletionV001 as projectCore,
  qualifyAdoptedRendererCompletionV001 as qualifyCore,
} from './adopted_media_manufacturing_v001.mts';
import {
  assertQualifiedDigestRepresentativeCompletionV001,
  rebindPublishedDigestRepresentativeCompletionV001,
  persistApprovedDigestRepresentativePendingEvidenceV001,
  evaluateDigestRepresentativeCompletionV001,
} from './digest_representative_completion_v001.mjs';

test('Node20 tsx caller reads the native renderer qualification module instance', async () => {
  const native = await import(new URL('./digest_representative_completion_v001.mjs', import.meta.url).href);
  const caller = await readDigestRepresentativeCompletionModuleV001();
  for (const name of [
    'resolveApprovedDigestVerificationPolicyV001',
    'assertQualifiedDigestRepresentativeCompletionV001',
    'rebindPublishedDigestRepresentativeCompletionV001',
    'persistApprovedDigestRepresentativePendingEvidenceV001',
  ]) assert.equal(caller[name], native[name], name + ' must share native module/private authority');
  await assert.rejects(caller.assertQualifiedDigestRepresentativeCompletionV001(
    Object.freeze({status: 'confirmation-pending'}), undefined, '/tmp/no-media-authority'),
  /QUALIFIED_REPRESENTATIVE_COMPLETION_REQUIRED/);
});

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


// Execute the actual publication/control functions with explicit dependency
// spies. These structural tests never mint a production capability or record.
const publicationCallerSource = await readFile(process.env.ZEV_PENDING_CALLER_TEST_SOURCE
  ?? new URL('./run_presentation_instruction_renderer_job_v002.ts', import.meta.url), 'utf8');
const publicationCoreSource = await readFile(process.env.ZEV_PENDING_CORE_TEST_SOURCE
  ?? new URL('./adopted_media_manufacturing_v001.mts', import.meta.url), 'utf8');
const shapeSha = (value: any) => createHash('sha256').update(canonicalJson(value)).digest('hex');
const compile = (text: string, dependencies: Record<string, any>) =>
  Function(...Object.keys(dependencies), 'return (' + text + ');')(...Object.values(dependencies));
function runActualPublication(value: any, published: any, observations: any, overrides: any = {}) {
  const start = publicationCallerSource.indexOf('  const completion = await qualifyPresentationInstructionRendererCompletionV002(draw, storageContext);');
  const end = publicationCallerSource.indexOf('\nexport async function runPresentationInstructionRendererJobFileV002(', start);
  assert(start >= 0 && end > start);
  const root = 'runtime/artifacts/test-only-representative';
  const media = {path: root + '/render/presentation-rendered-v002.mp4', fileSha256: published.bindings.completedMedia.fileSha256,
    sizeBytes: published.bindings.completedMedia.sizeBytes};
  const technical = {path: root + '/representative-technical-evidence-v001.json', fileSha256: 'e'.repeat(64), sizeBytes: 7};
  const dependencies = {
    draw: value, storageContext: {outputRoot: root, testOnly: true}, capabilities: {},
    job: {publication: {renderOutputRoot: root + '/render'}}, path, canonicalSha256: shapeSha, clone: structuredClone,
    rendererJobBinding: {testOnly: true}, receiptBuilt: {receipt: {testOnly: true}}, receiptPublication: {testOnly: true},
    layoutBuilt: {layout: {testOnly: true}}, lineLayoutPublication: {testOnly: true}, common: {plan: {testOnly: true}},
    autoPresentation: undefined,
    qualifyPresentationInstructionRendererCompletionV002: async () => projectDraw(value),
    commitValidatedPresentationArtifactsV002: async () => {observations.commit++;return {status: 'published', outputDirectory: value.outputDirectory};},
    assertQualifiedDigestRepresentativeCompletionV001: async (verification: any, _context: any, file: string) => {
      observations.oldAssert++;assert.equal(verification, value.verification);assert.equal(file, value.outputDirectory + '/presentation-rendered-v002.mp4');
    },
    rebindPublishedDigestRepresentativeCompletionV001: async (verification: any, _context: any, file: string) => {
      observations.rebind++;assert.equal(verification, value.verification);assert.equal(file, published.bindings.completedMedia.path);return published;
    },
    persistApprovedDigestRepresentativePendingEvidenceV001: async (args: any) => {
      observations.persist++;assert.equal(args.draw, value);assert.equal(args.verification, published);
      assert.equal(args.publishedMediaPath, published.bindings.completedMedia.path);return {technicalEvidenceBinding: technical, publishedMediaBinding: media};
    }, ...overrides,
  };
  const representativeOperations = {
    assertQualifiedDigestRepresentativeCompletionV001: dependencies.assertQualifiedDigestRepresentativeCompletionV001,
    rebindPublishedDigestRepresentativeCompletionV001: dependencies.rebindPublishedDigestRepresentativeCompletionV001,
    persistApprovedDigestRepresentativePendingEvidenceV001: dependencies.persistApprovedDigestRepresentativePendingEvidenceV001,
  };
  return {run: compile('async function() {\n' + publicationCallerSource.slice(start, end).trim(), {
    ...dependencies, readDigestRepresentativeCompletionModuleV001: async () => representativeOperations,
  }), media, technical};
}
function runActualCore(result: any, context: any, observations: any) {
  const start = publicationCoreSource.indexOf('export async function qualifyAdoptedRendererCompletionV001(');
  const end = publicationCoreSource.indexOf('\nexport async function renderAdoptedVideoV001(', start);
  assert(start >= 0 && end > start);
  const text = publicationCoreSource.slice(start, end).trim()
    .replace('export async function', 'async function')
    .replace('result: Json', 'result').replace('storageContext?: Json', 'storageContext').replace('completedMediaPath?: string', 'completedMediaPath');
  return compile(text, {
    projectAdoptedRendererCompletionV001: projectCore,
    resolveApprovedDigestVerificationPolicyV001: async () => ({testOnly: true}),
    assertQualifiedDigestRepresentativeCompletionV001: async () => {observations.privateAssert++;},
    path, same: (a: any, b: any) => shapeSha(a) === shapeSha(b),
    keys: (value: any, expected: string[]) => value && typeof value === 'object'
      && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort()),
    fail: (code: string) => {throw Error(code);},
  })(result, context, result.result.publication.video.path);
}

for (const status of ['passed-representative', 'confirmation-pending']) {
  test('published ' + status + ' replaces stage references and persists evidence only when pending', async () => {
    const pure = representative(status), stage = '/tmp/test-only-no-output/publish/presentation-rendered-v002.mp4';
    const original = {...pure, bindings: {...pure.bindings, completedMedia: {...pure.bindings.completedMedia, path: stage}}};
    const value = {...draw(original), workVideo: stage, stagingDirectory: '/tmp/test-only-no-output/publish', outputDirectory: '/tmp/test-only-no-output/render', reservation: {testOnly: true}};
    const published = {...original, bindings: {...original.bindings, completedMedia: {...original.bindings.completedMedia,
      path: value.outputDirectory + '/presentation-rendered-v002.mp4'}}};
    const observed = {commit: 0, rebind: 0, oldAssert: 0, persist: 0};
    const actual = runActualPublication(value, published, observed);
    const output = await actual.run();
    assert.equal(output.exitCode, 0);assert.equal(output.result.qc, published);assert.equal(output.result.verification, published);
    assert.equal(output.result.status, status === 'confirmation-pending' ? 'confirmation-pending' : 'completed');
    assert.deepEqual(output.result.publishedMediaBinding, actual.media);assert(!output.result.publishedMediaBinding.path.startsWith('/'));
    assert.equal(output.result.verification.bindings.completedMedia.path, value.outputDirectory + '/presentation-rendered-v002.mp4');
    assert.equal(observed.commit, 1);assert.equal(observed.oldAssert, 1);assert.equal(observed.rebind, 1);
    assert.equal(observed.persist, status === 'confirmation-pending' ? 1 : 0);
    assert.equal(output.result.technicalEvidenceBinding, status === 'confirmation-pending' ? actual.technical : undefined);
    assert.notEqual(output.result.verification.bindings.completedMedia.path, stage);
    if (status === 'confirmation-pending') {
      const coreObserved = {privateAssert: 0, read: 0};
      const context = {outputRoot: 'runtime/artifacts/test-only-representative', readBound: async (binding: any) => {
        coreObserved.read++;assert.deepEqual(binding, actual.technical);return {testOnly: true};
      }};
      assert.equal((await runActualCore(output, context, coreObserved)).status, 'confirmation-pending');
      assert.equal(coreObserved.privateAssert, 1);assert.equal(coreObserved.read, 1);
      for (const change of [
        {publishedMediaBinding: {...actual.media, path: 'runtime/artifacts/other/render/video.mp4'}},
        {publishedMediaBinding: {...actual.media, sizeBytes: actual.media.sizeBytes + 1}},
        {technicalEvidenceBinding: undefined},
        {technicalEvidenceBinding: {...actual.technical, path: 'runtime/artifacts/other/evidence.json'}},
      ]) await assert.rejects(runActualCore({...output, result: {...output.result, ...change}}, context, {privateAssert: 0}));
      await assert.rejects(runActualCore(output, {...context, readBound: async () => {throw Error('TEST_ONLY_RAW_SHA_CHANGED');}}, {privateAssert: 0}), /TEST_ONLY_RAW_SHA_CHANGED/);
    }
  });
}

test('publication rejects status upgrades and mismatched pending media returned by the persistence factory', async () => {
  const original = representative('confirmation-pending'), value = {...draw(original), outputDirectory: '/tmp/test-only-no-output/render'};
  const published = {...original, bindings: {...original.bindings, completedMedia: {...original.bindings.completedMedia,
    path: value.outputDirectory + '/presentation-rendered-v002.mp4'}}};
  const observed = () => ({commit: 0, rebind: 0, oldAssert: 0, persist: 0});
  await assert.rejects(runActualPublication(value, {...published, status: 'passed-representative', complete: true}, observed()).run(), /changed its confirmation status/);
  await assert.rejects(runActualPublication(value, published, observed(), {
    persistApprovedDigestRepresentativePendingEvidenceV001: async () => ({publishedMediaBinding: {path: 'runtime/artifacts/other.mp4'}}),
  }).run(), /changed its published media binding/);
});

test('rebind and pending persistence reject pure JSON results and fake contexts before record writes', async () => {
  const verification = representative('confirmation-pending'), fakeContext: any = {outputRoot: 'runtime/artifacts/test-only', approvedJob: {testOnly: true}};
  await assert.rejects(rebindPublishedDigestRepresentativeCompletionV001(verification, fakeContext, '/tmp/test-only-no-media.mp4'));
  await assert.rejects(persistApprovedDigestRepresentativePendingEvidenceV001({draw: draw(verification), verification,
    storageContext: fakeContext, publishedMediaPath: '/tmp/test-only-no-media.mp4'}));
});
