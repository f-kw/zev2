import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile, writeFile, mkdir, rm, realpath} from 'node:fs/promises';
import {createHash, randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {readQualifiedDigestApprovedJobV001, DIGEST_APPROVED_JOB_GUARD_V001} from './digest-approved-job-v001.js';
import {readApprovedDigestInputsV001, assertApprovedDigestInputsV001,
  assertQualifiedApprovedDigestSourcePackageTaskV001, qualifyApprovedDigestSourcePackageReadbackV001,
  buildApprovedDigestSourcePackageV001, buildApprovedDigestSourcePackageValueV001,
  prepareApprovedDigestCaptionCoreV001} from './digest-approved-inputs-v001.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const validator = await import(pathToFileURL(path.join(root, 'evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs')).href);
const fake: any = {workspaceRoot: root, job: {planId: 'unapproved-plan', outputRoot: 'runtime/artifacts/unapproved/attempt-001'},
  readBinding: () => {throw Error('FAKE_READER_MUST_NOT_RUN');}, assertCurrent: () => {throw Error('FAKE_CURRENT_MUST_NOT_RUN');}};
const opaqueRequired = /QUALIFIED_APPROVED_DIGEST_JOB_REQUIRED/;
const exec = promisify(execFile), hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const implementationPaths = ['runner/src/digest-approved-job-v001.ts', 'runner/src/digest-approved-job-runner-v001.ts',
  'runner/src/digest-approved-inputs-v001.ts', 'runner/src/digest-formal-handoff-v001.ts',
  'evals/clip_composition/adopted_media_manufacturing_v001.mts', 'evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs',
  'evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts', 'evals/clip_composition/render_presentation_v002.mjs',
  'tools/digest-quality/original-resolution-low-memory-composite.mjs', 'tools/digest-quality/original-resolution-full-supervisor-v002.py','evals/clip_composition/digest_representative_completion_v001.mjs','runner/src/digest-approved-record-finalize-v001.ts'];

/** Synthetic anchors exist only in this test. No user grant, owner, supervisor, or media operation is created. */
async function fixture(action: (options: any) => Promise<void>) {
  const id = 'test-approved-inputs-' + randomUUID(), relative = 'runtime/artifacts/' + id;
  await exec('git', ['check-ignore', '-q', relative + '/job.json'], {cwd: root});
  const directory = path.join(root, relative); await mkdir(directory, {recursive: false});
  const byteBinding = async (relativePath: string) => {const bytes = await readFile(path.join(root, relativePath)); return {path: relativePath, fileSha256: hash(bytes)};};
  const save = async (name: string, value: any) => {const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n'), absolute = path.join(directory, name);
    await writeFile(absolute, bytes, {flag: 'wx'}); return {path: absolute, fileSha256: hash(bytes), sizeBytes: bytes.length};};
  try {
    const prepPath = 'runtime/artifacts/digest-caption-input-preparation-20261003-v001/attempt-002/bundle/manifest.json';
    const candidatePath = 'runtime/artifacts/digest-caption-216px-reflow-20261003-v001/attempt-002/manifest.json';
    const preparation = JSON.parse(await readFile(path.join(root, prepPath), 'utf8')), candidate = JSON.parse(await readFile(path.join(root, candidatePath), 'utf8'));
    const job: any = {schemaVersion: 'digest-approved-job-v001', planId: id, outputRoot: relative + '/attempt-001',
      inputs: {preparationParameters: {workspaceRoot: root, sourceRuntimeRoot: path.dirname(path.join(root, preparation.stateBinding.path)),
        outputRoot: path.dirname(path.join(root, prepPath)), preparationId: preparation.preparationId,
        stateBinding: preparation.stateBinding, scopeBinding: preparation.scopeBinding, styleTemplateBinding: preparation.styleTemplateBinding, expected: preparation.expected},
        preparationManifestBinding: await byteBinding(prepPath), candidateManifestBinding: await byteBinding(candidatePath),
        typographySettingsBinding: candidate.typographySettingsBinding,
        rendererTemplateBinding: await byteBinding('evals/clip_composition/outputs/presentation/distant-connection-existing-caption-selection/candidate-doctor-disappearance-to-ogre-mother-v001/renderer-template-v002.json')},
      // Deliberately synthetic device metadata; no storage context can be minted by this test.
      storage: {guestRoot: '/Volumes/TEST-NOT-A-MOUNT', hostRoot: '/Volumes/TEST-NOT-A-HOST', imagePath: '/Volumes/TEST-NOT-A-HOST/test-only.sparsebundle',
        guestVolumeUuid: '11111111-1111-1111-1111-111111111111', hostVolumeUuid: '22222222-2222-2222-2222-222222222222',
        guestDevice: 1, hostDevice: 2, imageMaximumBytes: 100000000000, hostMetadataReserveBytes: 6254231552, internalRoot: root},
      expected: {frames: candidate.summary.originalClockSummary.originalPlanEndFrame, audioSamples: candidate.summary.originalClockSummary.originalPlanEndSample,
        groups: candidate.summary.groups, atoms: candidate.summary.atoms, cues: candidate.summary.newCues},
      implementation: {sha: (await exec('git', ['rev-parse', 'HEAD'], {cwd: root})).stdout.trim(), bindings: await Promise.all(implementationPaths.map(byteBinding))},
      guard: {...DIGEST_APPROVED_JOB_GUARD_V001}, allocationBudget: {baseBuildBytes: 22800000000, rendererPreparationBytes: 22900000000}};
    const commonCode = await readFile(path.join(root, implementationPaths[0]), 'utf8');
    if (commonCode.includes("'nodeBinding'")) {
      const nodePath = await realpath(process.execPath), bytes = await readFile(nodePath);
      job.implementation.nodeBinding = {path: nodePath, fileSha256: hash(bytes), sizeBytes: bytes.length};
    }
    const jobBinding = await save('job.json', job);
    const authorization = {schemaVersion: 'digest-approved-job-authorization-v001', recordId: id + '-synthetic-not-human-approved',
      userApproval: {at: new Date().toISOString(), messageId: 'TEST-SYNTHETIC-NOT-A-USER-MESSAGE', sourceThreadId: 'TEST-ONLY-NO-HUMAN-APPROVAL',
        text: 'SYNTHETIC TEST FIXTURE ONLY. This is not a human manufacturing grant. JSON input qualification test only; no owner, supervisor, environment activation or media.'},
      actions: ['manufacture-one-approved-plan'], jobBinding, planId: job.planId, manifestBinding: job.inputs.candidateManifestBinding,
      typographySettingsBinding: job.inputs.typographySettingsBinding, outputRoot: job.outputRoot, storage: job.storage, guard: job.guard,
      implementation: job.implementation, normalCandidates: 1};
    const authorizationBinding = await save('synthetic-test-authorization.json', authorization);
    await action({workspaceRoot: root, jobBinding, authorizationBinding, trustedJobSha256: jobBinding.fileSha256, trustedAuthorizationSha256: authorizationBinding.fileSha256});
  } finally {await rm(directory, {recursive: true});}
}

test('plain JSON or a caller resolver never qualifies normal inputs', async () => {
  await assert.rejects(readApprovedDigestInputsV001(fake), opaqueRequired);
  await assert.rejects(readApprovedDigestInputsV001({...fake}), opaqueRequired);
});
test('inputs cannot be cloned or manufactured from their fields', async () => {
  await assert.rejects(assertApprovedDigestInputsV001({}, fake), opaqueRequired);
});
test('source package cannot qualify through forged input fields', async () => {
  await assert.rejects(assertQualifiedApprovedDigestSourcePackageTaskV001({}, {}), /QUALIFIED_APPROVED_DIGEST_SOURCE_REQUIRED/);
  await assert.rejects(validator.qualifyApprovedDigestSourcePackageTaskV001({}, {}), /QUALIFIED_APPROVED_DIGEST_SOURCE_REQUIRED/);
});
test('bytes and fake storage callbacks cannot reconstruct a source capability', async () => {
  await assert.rejects(qualifyApprovedDigestSourcePackageReadbackV001({}, {}, fake, {}, {path: 'source-package.json'}, Buffer.from('{}')), opaqueRequired);
});
test('unqualified job cannot build a source or enter Core', async () => {
  await assert.rejects(buildApprovedDigestSourcePackageV001({}, fake, {}, {}, {}, {}), opaqueRequired);
  await assert.rejects(prepareApprovedDigestCaptionCoreV001({}, fake, {}, {}, {}, {}), opaqueRequired);
});
test('the existing source default remains valid and arbitrary task text remains rejected', async () => {
  const preparation = JSON.parse(await readFile(path.join(root, 'runtime/artifacts/digest-caption-input-preparation-20261003-v001/attempt-002/bundle/manifest.json'), 'utf8'));
  const baseline = JSON.parse(await readFile(path.join(root, preparation.styleTemplateBinding.path), 'utf8'));
  assert.equal(validator.validatePresentationOutputCaptionCueSourcePackageV001(baseline).status, 'passed');
  const changed = structuredClone(baseline); changed.promptInput.taskDescription = 'Unapproved task';
  assert.equal(validator.validatePresentationOutputCaptionCueSourcePackageV001(changed).status, 'rejected');
});

test('actual saved normal/candidate inputs qualify with synthetic test anchors and reject clones', async () => fixture(async options => {
  const qualified = await readQualifiedDigestApprovedJobV001(options), inputs = await readApprovedDigestInputsV001(qualified);
  await assertApprovedDigestInputsV001(inputs, qualified);
  assert.equal(inputs.correspondence.rows.length, qualified.job.expected.cues);
  assert.equal(inputs.clock.mappings.at(-1).outputEndFrame, qualified.job.expected.frames);
  assert.equal(inputs.meaning.atomOccurrences.length, qualified.job.expected.atoms);
  await assert.rejects(assertApprovedDigestInputsV001(structuredClone(inputs), qualified), /QUALIFIED_APPROVED_DIGEST_INPUTS_REQUIRED/);
  await assert.rejects(assertApprovedDigestInputsV001(inputs, {...qualified}), opaqueRequired);
  await assert.rejects(readApprovedDigestInputsV001({...qualified}), opaqueRequired);
  const wire = await import(pathToFileURL(path.join(root, 'evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts')).href);
  const original = inputs.styleTemplate.reconstructionMap.caseContexts[0];
  const plan = {schemaVersion: 'digest-approved-candidate-core-plan-v001', planId: qualified.job.planId,
    outputRoot: qualified.job.outputRoot, authorization: qualified.authorizationBinding, acceptedManifestBinding: inputs.manifestBinding};
  const planPath = path.join(path.dirname(options.jobBinding.path), 'structural-test-core-plan.json');
  await writeFile(planPath, wire.formal(plan), {flag: 'wx'});
  const source = await buildApprovedDigestSourcePackageValueV001(inputs, qualified,
    {plan, planBinding: wire.bind(path.relative(root, planPath), plan)}, original.baseMediaInput, {bindings: original.styleBindings});
  assert.equal(source.promptInput.captions[0].boundaryCandidates.length, qualified.job.expected.atoms);
  assert.equal(source.reconstructionMap.captions[0].atomOccurrenceIds.length, qualified.job.expected.atoms);
  for (const binding of source.provenance.approvedContractBindings) assert(!path.isAbsolute(binding.path));
  assert.equal(source.provenance.approvedContractBindings[0].fileSha256, qualified.jobBinding.fileSha256);
  assert.equal(source.provenance.approvedContractBindings[1].fileSha256, qualified.authorizationBinding.fileSha256);
  // Structure and task authority are independent: normalizing a fixture does not register a capability.
  const structural = structuredClone(source); structural.promptInput.taskDescription = inputs.styleTemplate.promptInput.taskDescription;
  assert.equal(validator.validatePresentationOutputCaptionCueSourcePackageV001(structural).status, 'passed');
  await assert.rejects(validator.qualifyApprovedDigestSourcePackageTaskV001(source, inputs), /QUALIFIED_APPROVED_DIGEST_SOURCE_REQUIRED/);
  await assert.rejects(validator.qualifyApprovedDigestSourcePackageTaskV001(structural, inputs), /QUALIFIED_APPROVED_DIGEST_SOURCE_REQUIRED/);
  const fakeContext = {approvedJob: qualified, outputRoot: qualified.job.outputRoot, assertCurrent: () => {throw Error('FAKE_CONTEXT_MUST_NOT_RUN');}};
  await assert.rejects(buildApprovedDigestSourcePackageV001(inputs, qualified, {}, {}, {}, fakeContext), /QUALIFIED_(?:APPROVED_)?DIGEST_STORAGE_REQUIRED/);
  for (const role of ['presetValidationIndex', 'materialValidationIndex']) {
    const binding = original.styleBindings[role], value = JSON.parse(await readFile(path.join(root, binding.path), 'utf8'));
    assert.equal(value.schemaVersion, undefined); assert.equal(value.registryVersion, binding.schemaVersion);
    const observed = wire.bind(binding.path, value);
    assert.equal(observed.fileSha256, binding.fileSha256); assert.equal(observed.canonicalSha256, binding.canonicalSha256);
    assert.equal(observed.schemaVersion, undefined);
  }
  const originalJobPath = qualified.jobBinding.path, originalAuthorizationPath = qualified.authorizationBinding.path;
  const originalJobBytes = await readFile(originalJobPath), alternateBytes = await readFile(planPath);
  for (const binding of [options.jobBinding, options.authorizationBinding]) {
    binding.path = planPath; binding.fileSha256 = hash(alternateBytes); binding.sizeBytes = alternateBytes.length;
  }
  assert.equal(qualified.jobBinding.path, originalJobPath); assert.equal(qualified.authorizationBinding.path, originalAuthorizationPath);
  await qualified.assertCurrent(); // External options now point elsewhere; the original two controls are still valid.
  try {
    await writeFile(originalJobPath, Buffer.concat([originalJobBytes, Buffer.from(' ')]));
    await assert.rejects(qualified.assertCurrent(), /APPROVED_JOB_ACTUAL_HASH_CHANGED/);
  } finally {await writeFile(originalJobPath, originalJobBytes);}
}));
