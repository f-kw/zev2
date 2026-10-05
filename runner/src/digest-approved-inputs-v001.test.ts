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
  prepareApprovedDigestCaptionCoreV001, buildApprovedDigestCaptionVisibilitySelectionV001,
  readApprovedDigestCaptionVisibilitySelectionV001} from './digest-approved-inputs-v001.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const validator = await import(pathToFileURL(path.join(root, 'evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs')).href);
const fake: any = {workspaceRoot: root, job: {planId: 'unapproved-plan', outputRoot: 'runtime/artifacts/unapproved/attempt-001'},
  readBinding: () => {throw Error('FAKE_READER_MUST_NOT_RUN');}, assertCurrent: () => {throw Error('FAKE_CURRENT_MUST_NOT_RUN');}};
const opaqueRequired = /QUALIFIED_APPROVED_DIGEST_JOB_REQUIRED/;
const exec = promisify(execFile), hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const implementationPaths = ['runner/src/digest-approved-job-v001.ts', 'runner/src/digest-approved-job-runner-v001.ts',
  'runner/src/digest-approved-inputs-v001.ts', 'runner/src/digest-formal-handoff-v001.ts',
  'runner/src/digest-caption-registration-migration-v001.ts',
  'evals/clip_composition/adopted_media_manufacturing_v001.mts', 'evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs',
  'evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts', 'evals/clip_composition/render_presentation_v002.mjs',
  'tools/digest-quality/original-resolution-low-memory-composite.mjs', 'tools/digest-quality/original-resolution-full-supervisor-v002.py','evals/clip_composition/digest_representative_completion_v001.mjs','runner/src/digest-approved-record-finalize-v001.ts'];

const inputPrefix = 'runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/current-inputs-v001';
const originalCandidatePath = inputPrefix + '/caption-registration/manifest.json';
const withdrawnCandidatePath = inputPrefix + '/caption-display-adjustment-v001/manifest.json';

/** Synthetic test controls qualify JSON only; no grant, owner, storage activation or media operation. */
async function fixture(action: (options: any) => Promise<void>, variant?: {
  candidatePath?: string; editManifest?: (manifest: any) => void;
  visibility?: {decide: (row: any, index: number) => 'show' | 'suppress'; edit?: (adoption: any) => void};
}) {
  const id = 'test-approved-inputs-' + randomUUID(), relative = 'runtime/artifacts/' + id;
  await exec('git', ['check-ignore', '-q', relative + '/job.json'], {cwd: root});
  const directory = path.join(root, relative); await mkdir(directory, {recursive: false});
  // Preserve the current input/migration contract. This saved control is data, never production authority.
  const job = JSON.parse(await readFile(path.join(root,
    'runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/inputs-v001/approved-display-job-v001/job.json'), 'utf8'));
  const temporaryInput = path.join(job.inputs.inputRoot, inputPrefix, id);
  const byteBinding = async (relativePath: string, base = root) => {
    const bytes = await readFile(path.join(base, relativePath));
    return {path: relativePath, fileSha256: hash(bytes), sizeBytes: bytes.length};
  };
  const save = async (name: string, value: any) => {
    const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n'), absolute = path.join(directory, name);
    await writeFile(absolute, bytes, {flag: 'wx'});
    return {path: absolute, fileSha256: hash(bytes), sizeBytes: bytes.length};
  };
  let ownsTemporaryInput = false;
  try {
    const candidatePath = variant?.candidatePath ?? originalCandidatePath;
    const candidate = JSON.parse(await readFile(path.join(job.inputs.inputRoot, candidatePath), 'utf8'));
    if (variant?.editManifest || variant?.visibility) {
      await mkdir(temporaryInput, {recursive: false}); ownsTemporaryInput = true;
      if (variant.visibility) {
        const correspondence = JSON.parse(await readFile(path.join(job.inputs.inputRoot, candidate.correspondenceBinding.path), 'utf8'));
        const cueFields = ['groupOrdinal', 'cueOrdinal', 'candidateId', 'timelineSegmentId', 'captionId',
          'cueEndBoundaryId', 'lineEndBoundaryIds', 'atomOccurrenceIds', 'sourceSegmentIds', 'semanticUtteranceIds', 'lines',
          'sourceStartMs', 'sourceEndMs', 'sourceStartFrame30', 'sourceEndFrame30', 'startFrame', 'endFrameExclusive', 'displayFrameCount'];
        const decisions = correspondence.rows.map((row: any, index: number) => ({
          cue: Object.fromEntries(cueFields.map(name => [name, structuredClone(row[name])])),
          decision: variant.visibility!.decide(row, index), reason: 'Explicit synthetic test selection only; no production adoption.'}));
        const shown = decisions.filter((entry: any) => entry.decision === 'show').length;
        const adoption = {schemaVersion: 'digest-caption-visibility-adoption-v001', mode: 'explicit-cue-adoption-v001',
          bindings: {originalCandidateManifestBinding: await byteBinding(candidatePath, job.inputs.inputRoot),
            meaningBinding: candidate.meaningBinding, correspondenceBinding: candidate.correspondenceBinding,
            originalClockBinding: candidate.originalClockBinding, mapBinding: candidate.mapBinding},
          decisions, counts: {totalCues: decisions.length, visibleCues: shown, suppressedCues: decisions.length - shown}};
        variant.visibility.edit?.(adoption);
        const adoptionFile = path.join(temporaryInput, 'visibility-adoption.json');
        await writeFile(adoptionFile, JSON.stringify(adoption, null, 2) + '\n', {flag: 'wx'});
        candidate.schemaVersion = 'digest-caption-current-visibility-candidate-bundle-v001';
        candidate.visibilityAdoptionBinding = await byteBinding(path.relative(job.inputs.inputRoot, adoptionFile), job.inputs.inputRoot);
      }
      variant?.editManifest?.(candidate);
      const candidateFile = path.join(temporaryInput, 'candidate-manifest.json');
      await writeFile(candidateFile, JSON.stringify(candidate, null, 2) + '\n', {flag: 'wx'});
      job.inputs.candidateManifestBinding = await byteBinding(path.relative(job.inputs.inputRoot, candidateFile), job.inputs.inputRoot);
    } else job.inputs.candidateManifestBinding = await byteBinding(candidatePath, job.inputs.inputRoot);
    job.outputRoot = relative + '/attempt-001';
    // Verification/recovery records belong to the saved manufacture, never this qualification-only fixture.
    delete job.verificationPolicy; delete job.recoveryBinding;
    if (variant?.visibility) job.verificationPolicy = {schemaVersion: 'digest-representative-verification-policy-v001',
      mode: 'representative-plus-rules-v001', representativeInstructionIds: ['synthetic-visibility-instruction-1'],
      permittedMethods: ['still-frame'], confirmationRecordPath: job.outputRoot + '/test-only-confirmation.json'};
    job.expected = {frames: candidate.summary.originalPlanEndFrame, audioSamples: candidate.summary.originalPlanEndSample,
      groups: candidate.summary.groups, atoms: candidate.summary.atoms, cues: candidate.summary.newCues};
    const nodePath = await realpath(process.execPath), nodeBytes = await readFile(nodePath);
    job.implementation = {sha: (await exec('git', ['rev-parse', 'HEAD'], {cwd: root})).stdout.trim(),
      bindings: await Promise.all(implementationPaths.map(p => byteBinding(p))),
      nodeBinding: {path: nodePath, fileSha256: hash(nodeBytes), sizeBytes: nodeBytes.length}};
    assert.deepEqual(job.guard, DIGEST_APPROVED_JOB_GUARD_V001);
    const jobBinding = await save('job.json', job);
    const authorization = {schemaVersion: 'digest-approved-job-authorization-v002', recordId: id + '-synthetic-not-human-approved',
      userApproval: {at: new Date().toISOString(), messageId: 'TEST-SYNTHETIC-NOT-A-USER-MESSAGE', sourceThreadId: 'TEST-ONLY-NO-HUMAN-APPROVAL',
        text: 'SYNTHETIC TEST FIXTURE ONLY. This is not a human manufacturing grant. JSON qualification only; no owner, supervisor, environment activation or media.'},
      actions: ['manufacture-one-approved-plan'], jobBinding, planId: job.planId, manifestBinding: job.inputs.candidateManifestBinding,
      typographySettingsBinding: job.inputs.typographySettingsBinding, migrationApprovalEvidenceBinding: job.inputs.migrationApprovalEvidenceBinding,
      outputRoot: job.outputRoot, storage: job.storage, guard: job.guard, implementation: job.implementation, normalCandidates: 1,
      ...(job.verificationPolicy === undefined ? {} : {verificationPolicy: job.verificationPolicy})};
    const authorizationBinding = await save('synthetic-test-authorization.json', authorization);
    await action({workspaceRoot: root, jobBinding, authorizationBinding,
      trustedJobSha256: jobBinding.fileSha256, trustedAuthorizationSha256: authorizationBinding.fileSha256});
  } finally {
    if (ownsTemporaryInput) await rm(temporaryInput, {recursive: true});
    await rm(directory, {recursive: true});
  }
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

// Original saved current inputs; synthetic test anchors only. No production permission is created.
test('withdrawn correction: original clocks and independent question/oh remain exact', async () => fixture(async options => {
  const qualified = await readQualifiedDigestApprovedJobV001(options), inputs = await readApprovedDigestInputsV001(qualified);
  assert.equal(inputs.correspondence.rows.length, 651);
  assert.equal(inputs.meaning.atomOccurrences.length, 5450);
  assert.equal(inputs.displayAdjustment, undefined); assert.equal(inputs.originalMeaning, undefined);
  const originalMeaning = JSON.parse(await readFile(path.join(qualified.job.inputs.inputRoot, inputs.manifest.meaningBinding.path), 'utf8'));
  assert.deepEqual(inputs.meaning, originalMeaning);
  const worldAndFollowing = inputs.correspondence.rows.filter((r: any) => r.startFrame >= 24988 && r.startFrame < 25015);
  assert.deepEqual(worldAndFollowing.map((r: any) => [r.startFrame, r.endFrameExclusive, r.lines.map((l: any) => l.text).join('')]), [
    [24988, 24991, '世界が終わる'], [24991, 24993, 'なんか'],
    [24993, 25004, 'いい雰囲気にしないで!'], [25004, 25015, 'いい雰囲気に!']]);
  const question = inputs.correspondence.rows.find((r: any) => r.startFrame === 32545);
  const oh = inputs.correspondence.rows.find((r: any) => r.startFrame === 32576);
  assert.equal(question.lines[0].text, '何人いるの?'); assert.equal(question.endFrameExclusive, 32576);
  assert.equal(oh.lines[0].text, 'お!'); assert.equal(oh.endFrameExclusive, 32577);
  await assertApprovedDigestInputsV001(inputs, qualified);
}));
test('withdrawn correction: saved adjusted candidate is rejected', async () => fixture(async options => {
  const qualified = await readQualifiedDigestApprovedJobV001(options);
  await assert.rejects(readApprovedDigestInputsV001(qualified), /APPROVED_DIGEST_CURRENT_CANDIDATE_REQUIRED/);
}, {candidatePath: withdrawnCandidatePath}));
test('withdrawn correction: original schema rejects hidden display overrides', async () => {
  for (const field of ['originalCandidateManifestBinding', 'displayMeaningBinding', 'displayAdjustmentBinding']) {
    await fixture(async options => {
      const qualified = await readQualifiedDigestApprovedJobV001(options);
      await assert.rejects(readApprovedDigestInputsV001(qualified), /APPROVED_DIGEST_UNDECLARED_DISPLAY_ADJUSTMENT/);
    }, {editManifest: manifest => {manifest[field] = manifest.meaningBinding;}});
  }
});

function originalPlan(inputs: any) {
  return {canvas: {width: 1920, height: 1080, fps: 30}, elements: inputs.correspondence.rows.map((row: any, index: number) => ({
    instructionId: 'synthetic-visibility-instruction-' + (index + 1), startFrame: row.startFrame, endFrameExclusive: row.endFrameExclusive,
    displayFrameCount: row.displayFrameCount, text: row.lines.map((line: any) => line.text).join(''),
    targetProvenance: {sourceAtomIds: row.atomOccurrenceIds},
    indexedLines: row.lines.map((line: any) => ({text: line.text, sourceUnitIds: line.atomOccurrenceIds}))}))};
}
test('explicit visibility: all-show retains every original cue, atom and clock', async () => fixture(async options => {
  const q = await readQualifiedDigestApprovedJobV001(options), inputs = await readApprovedDigestInputsV001(q), plan = originalPlan(inputs);
  const original = JSON.parse(await readFile(path.join(q.job.inputs.inputRoot, inputs.manifest.meaningBinding.path), 'utf8'));
  assert.deepEqual(inputs.meaning, original); assert.equal(inputs.correspondence.rows.length, 651);
  const sourceContext = inputs.styleTemplate.reconstructionMap.caseContexts[0];
  const wire = await import(pathToFileURL(path.join(root, 'evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts')).href);
  const corePlan = {schemaVersion: 'digest-approved-candidate-core-plan-v001', planId: q.job.planId,
    outputRoot: q.job.outputRoot, authorization: q.authorizationBinding, acceptedManifestBinding: inputs.manifestBinding};
  const planFile = path.join(path.dirname(q.jobBinding.path), 'visibility-structural-core-plan.json');
  await writeFile(planFile, wire.formal(corePlan), {flag: 'wx'});
  const source = await buildApprovedDigestSourcePackageValueV001(inputs, q,
    {planBinding: wire.bind(path.relative(root, planFile), corePlan), plan: corePlan}, sourceContext.baseMediaInput, {bindings: sourceContext.styleBindings});
  const structural = structuredClone(source); structural.promptInput.taskDescription = inputs.styleTemplate.promptInput.taskDescription;
  const inspected = validator.validatePresentationOutputCaptionCueSourcePackageV001(structural);
  assert.equal(inspected.status, 'passed', JSON.stringify(inspected));
  assert(source.provenance.approvedContractBindings.some((b: any) => b.fileSha256 === inputs.manifest.visibilityAdoptionBinding.fileSha256));
  await assert.rejects(validator.qualifyApprovedDigestSourcePackageTaskV001(source, inputs), /QUALIFIED_APPROVED_DIGEST_SOURCE_REQUIRED/);
  const selection = await buildApprovedDigestCaptionVisibilitySelectionV001(inputs, q, plan);
  assert.deepEqual(selection!.counts, {totalInstructions: 651, shownInstructions: 651, suppressedInstructions: 0});
  assert(selection!.entries.every((entry: any) => entry.decision === 'show')); assert(Object.isFrozen(selection));
  assert.deepEqual(await readApprovedDigestCaptionVisibilitySelectionV001(q, plan), selection);
  const changed = structuredClone(plan); changed.elements[0].startFrame++;
  await assert.rejects(buildApprovedDigestCaptionVisibilitySelectionV001(inputs, q, changed));
  changed.elements[0] = structuredClone(plan.elements[0]); changed.elements[0].text += 'changed';
  await assert.rejects(buildApprovedDigestCaptionVisibilitySelectionV001(inputs, q, changed));
  await assert.rejects(buildApprovedDigestCaptionVisibilitySelectionV001(structuredClone(inputs), q, plan), /QUALIFIED_APPROVED_DIGEST_INPUTS_REQUIRED/);
}, {visibility: {decide: () => 'show'}}));
test('explicit visibility: selected captions suppress independently without changing question or original inputs', async () => fixture(async options => {
  const q = await readQualifiedDigestApprovedJobV001(options), inputs = await readApprovedDigestInputsV001(q), plan = originalPlan(inputs);
  const selection = await buildApprovedDigestCaptionVisibilitySelectionV001(inputs, q, plan);
  assert.deepEqual(selection!.counts, {totalInstructions: 651, shownInstructions: 649, suppressedInstructions: 2});
  const rows = inputs.correspondence.rows;
  for (const text of ['世界が終わる', 'お!']) {
    const index = rows.findIndex((row: any) => row.lines.map((line: any) => line.text).join('') === text);
    assert.equal(selection!.entries[index].decision, 'suppress');
    assert.equal(plan.elements[index].text, text); assert.equal(rows[index].startFrame, plan.elements[index].startFrame);
  }
  const question = rows.findIndex((row: any) => row.lines[0].text === '何人いるの?');
  assert.equal(selection!.entries[question].decision, 'show'); assert.equal(plan.elements[question].displayFrameCount, 31);
  const binding = inputs.manifest.visibilityAdoptionBinding, file = path.join(q.job.inputs.inputRoot, binding.path), bytes = await readFile(file);
  try {
    await writeFile(file, Buffer.concat([bytes, Buffer.from(' ')]));
    await assert.rejects(readApprovedDigestCaptionVisibilitySelectionV001(q, plan), /APPROVED_JOB_ACTUAL_HASH_CHANGED/);
  } finally {await writeFile(file, bytes);}
}, {visibility: {decide: row => ['世界が終わる', 'お!'].includes(row.lines.map((line: any) => line.text).join('')) ? 'suppress' : 'show'}}));
test('explicit visibility: all suppressed retains full logical coverage and original plan', async () => fixture(async options => {
  const q = await readQualifiedDigestApprovedJobV001(options), inputs = await readApprovedDigestInputsV001(q), plan = originalPlan(inputs);
  const selection = await buildApprovedDigestCaptionVisibilitySelectionV001(inputs, q, plan);
  assert.deepEqual(selection!.counts, {totalInstructions: 651, shownInstructions: 0, suppressedInstructions: 651});
  assert.equal(plan.elements.length, 651); assert.equal(inputs.meaning.atomOccurrences.length, 5450);
  assert(selection!.entries.every((entry: any) => entry.decision === 'suppress'));
}, {visibility: {decide: () => 'suppress'}}));
test('explicit visibility: original schema rejects undeclared visibility', async () => fixture(async options => {
  const q = await readQualifiedDigestApprovedJobV001(options);
  await assert.rejects(readApprovedDigestInputsV001(q), /APPROVED_DIGEST_UNDECLARED_VISIBILITY/);
}, {editManifest: manifest => {manifest.visibilityAdoptionBinding = manifest.meaningBinding;}}));
test('explicit visibility: incomplete/duplicate/altered decisions and automatic criteria are rejected', async () => {
  const changes = [
    (a: any) => {a.decisions.pop();},
    (a: any) => {a.decisions[1] = structuredClone(a.decisions[0]);},
    (a: any) => {a.decisions[0].cue.startFrame++;},
    (a: any) => {a.decisions[0].cue.lines[0].text += 'changed';},
    (a: any) => {a.decisions[0].decision = 'auto';},
    (a: any) => {a.decisions[0].reason = '';},
    (a: any) => {a.counts.visibleCues--;},
    (a: any) => {a.criteriaBinding = a.bindings.meaningBinding;},
    (a: any) => {a.bindings.originalClockBinding = a.bindings.meaningBinding;},
  ];
  for (const edit of changes) await fixture(async options => {
    const q = await readQualifiedDigestApprovedJobV001(options);
    await assert.rejects(readApprovedDigestInputsV001(q));
  }, {visibility: {decide: () => 'show', edit}});
});
