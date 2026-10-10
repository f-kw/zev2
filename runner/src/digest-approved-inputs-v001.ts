/** Saved normal inputs plus an independently qualified, one-job manufacturing grant. */
import assert from 'node:assert/strict';
import {readFile, lstat, realpath} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readPreparedDigestCaptionJudgmentInputsV001} from './digest-caption-input-preparation-v001.js';
import {assertQualifiedDigestApprovedJobV001} from './digest-approved-job-v001.js';
import {resolveDigestTypographySettingsV001} from './digest-formal-handoff-v001.js';
import {assertDigestCaptionRegistrationMigrationV001} from './digest-caption-registration-migration-v001.js';
import {digestApprovedJobInputRootV001} from './digest-approved-job-v001.js';

type Json = Record<string, any>;
export type ApprovedDigestQualifiedJobV001 = {
  job: Json; authorization: Json; jobBinding: Json; authorizationBinding: Json; workspaceRoot: string;
  readBinding: (binding: any) => Promise<Json>; assertCurrent: () => Promise<void>;
};
export type ApprovedDigestInputsV001 = Json;
type InputRecord = {qualified: ApprovedDigestQualifiedJobV001; bodySha256: string; bindings: Json[]; absoluteBindings: {binding:Json; originalAnswerBinding?:Json}[]};
type SourceRecord = {inputs: Json; qualified: ApprovedDigestQualifiedJobV001; context: Json; bodySha256: string};
const qualifiedInputs = new WeakMap<object, InputRecord>();
const j16Closures = new WeakMap<object, {assertCurrent:()=>Promise<void>}>();
const qualifiedSources = new WeakMap<object, SourceRecord>();
const publishedBodies = new WeakMap<object, SourceRecord>();
const sha = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const clone = <T>(value: T): T => structuredClone(value);
const same = (left: unknown, right: unknown) => assert.deepEqual(left, right);
const object = (value: any): Json => {assert(value && typeof value === 'object' && !Array.isArray(value), 'APPROVED_DIGEST_OBJECT_REQUIRED'); return value;};
const list = (value: any): Json[] => {assert(Array.isArray(value) && value.every(item => item && typeof item === 'object' && !Array.isArray(item)), 'APPROVED_DIGEST_ARRAY_REQUIRED'); return value;};
const safe = (value: string) => {assert(typeof value === 'string' && value.length && !path.isAbsolute(value) && !value.includes('\\')
  && !value.includes('\0') && !value.split('/').some(part => !part || part === '.' || part === '..'), 'APPROVED_DIGEST_PATH_INVALID'); return value;};
const load = async (root: string, file: string) => {const ns = await import(pathToFileURL(path.join(root, file)).href); return ns.default ?? ns;};
const freeze = (value: any) => {if (value && typeof value === 'object' && !Object.isFrozen(value)) {Object.values(value).forEach(freeze); Object.freeze(value);} return value;};
const TIMING = ['sourceStartMs', 'sourceEndMs', 'sourceStartFrame30', 'sourceEndFrame30', 'startFrame', 'endFrameExclusive', 'displayFrameCount'];
const timing = (value: Json) => Object.fromEntries(TIMING.map(key => [key, value[key]]));

function declaredLocalPath(uri: unknown): string | null {
  assert(typeof uri === 'string' && uri.length && !uri.includes('\0') && !uri.includes('\\'), 'APPROVED_DIGEST_SOURCE_URI_INVALID');
  const value = uri.startsWith('file:') ? fileURLToPath(uri) : path.isAbsolute(uri) ? uri : null;
  if (value !== null) assert(path.isAbsolute(value) && path.normalize(value) === value && !value.includes('\0'), 'APPROVED_DIGEST_SOURCE_PATH_INVALID');
  return value;
}
const sameSourceUri = (left: unknown, right: unknown) => {
  const a = declaredLocalPath(left), b = declaredLocalPath(right);
  assert(a !== null || b === null, 'APPROVED_DIGEST_SOURCE_URI_CHANGED');
  assert.equal(a ?? left, b ?? right, 'APPROVED_DIGEST_SOURCE_URI_CHANGED');
};

/** Pure metadata projection. Its return value is not a source or storage capability. */
export function deriveApprovedDigestSourceDeclarationV001(value: Json): Json {
  const {workspaceRoot, storage, normalState, normalPlan, normalPreparation, manufacturing,
    inspection, sourcePhysicalBinding, sourceLogicalBinding, normalOwners, transcript, registration} = value;
  const identity = object(normalPreparation.identity), origin = object(identity.sourceOrigin);
  const drafts = list(normalState.requestDrafts).filter(d => d.id === normalOwners.requestDraftId);
  assert.equal(drafts.length, 1, 'APPROVED_DIGEST_SOURCE_DRAFT_UNRESOLVED'); const draft = drafts[0];
  assert.equal(identity.requestDraftId, draft.id, 'APPROVED_DIGEST_SOURCE_OWNER_CHANGED');
  assert.equal(identity.requestId, normalOwners.planRequestId, 'APPROVED_DIGEST_SOURCE_OWNER_CHANGED');
  same(identity.sourceVideo, sourceLogicalBinding); same(normalPlan.sourceVideoBinding, sourceLogicalBinding);
  same(identity.sourceRegistration, origin.registration);
  assert.equal(identity.dependencyReferences.video.sha256, origin.registration.fileSha256, 'APPROVED_DIGEST_SOURCE_REGISTRATION_CHANGED');
  assert.equal(origin.fileSha256, sourceLogicalBinding.fileSha256, 'APPROVED_DIGEST_SOURCE_SHA_CHANGED');
  assert(/^[0-9a-f]{64}$/u.test(origin.fileSha256));
  assert(Number.isSafeInteger(origin.byteSize) && origin.byteSize > 0, 'APPROVED_DIGEST_SOURCE_SIZE_REQUIRED');
  sameSourceUri(origin.declaredSourceUri, draft.source.uri); sameSourceUri(origin.declaredSourceUri, identity.sourceUri);
  sameSourceUri(origin.declaredSourceUri, transcript.sourceUri);
  const requests = list(normalState.agentRequests).filter(r => r.requestDraftId === draft.id);
  assert(requests.length >= 4, 'APPROVED_DIGEST_SOURCE_REQUESTS_MISSING');
  for (const request of requests) sameSourceUri(origin.declaredSourceUri, object(request.target).sourceUri);
  for (const id of [normalOwners.planRequestId, normalOwners.executionRequestId])
    assert.equal(requests.filter(r => r.id === id).length, 1, 'APPROVED_DIGEST_SOURCE_OWNER_CHANGED');
  const artifact = object(manufacturing.sourceArtifact);
  same(Object.keys(artifact).sort(), ['sourceProvenance', 'sourceRef', 'sourceUri', 'path', 'fileSha256'].sort());
  assert.equal(artifact.path, sourceLogicalBinding.path, 'APPROVED_DIGEST_SOURCE_LOGICAL_PATH_CHANGED');
  assert.equal(artifact.fileSha256, origin.fileSha256, 'APPROVED_DIGEST_SOURCE_SHA_CHANGED');
  assert.equal(artifact.sourceRef, identity.dependencyReferences.video.id, 'APPROVED_DIGEST_SOURCE_OWNER_CHANGED');
  sameSourceUri(artifact.sourceUri, origin.declaredSourceUri);
  assert.equal(inspection.sourceVideoBinding.fileSha256, origin.fileSha256, 'APPROVED_DIGEST_SOURCE_INSPECTION_CHANGED');
  assert.equal(sourcePhysicalBinding.fileSha256, origin.fileSha256, 'APPROVED_DIGEST_SOURCE_SHA_CHANGED');
  assert.equal(sourcePhysicalBinding.bytesVerified, false, 'APPROVED_DIGEST_SOURCE_MEDIA_REFERENCE_CHANGED');
  const guest = origin.placement !== undefined || sourcePhysicalBinding.placement !== undefined;
  let physicalPath: string;
  if (guest) {
    assert.equal(origin.placement, 'normal-declared-guest-source-v001', 'APPROVED_DIGEST_SOURCE_PLACEMENT_CHANGED');
    assert.equal(sourcePhysicalBinding.placement, origin.placement, 'APPROVED_DIGEST_SOURCE_PLACEMENT_CHANGED');
    assert.equal(origin.mode, 'json-reference', 'APPROVED_DIGEST_SOURCE_ORIGIN_MODE_CHANGED');
    const declared = declaredLocalPath(origin.declaredSourceUri); assert(declared, 'APPROVED_DIGEST_SOURCE_LOCAL_URI_REQUIRED');
    assert(declared.startsWith(storage.guestRoot + '/'), 'APPROVED_DIGEST_SOURCE_GUEST_PREFIX_REQUIRED');
    assert.equal(sourcePhysicalBinding.path, declared, 'APPROVED_DIGEST_SOURCE_DECLARED_PATH_CHANGED');
    assert.equal(sourcePhysicalBinding.sizeBytes, origin.byteSize, 'APPROVED_DIGEST_SOURCE_SIZE_CHANGED');
    assert(registration && registration.kind === 'source_video', 'APPROVED_DIGEST_SOURCE_REGISTRATION_REQUIRED');
    sameSourceUri(registration.sourceUri, origin.declaredSourceUri);
    assert.equal(registration.purpose, draft.purpose, 'APPROVED_DIGEST_SOURCE_REGISTRATION_CHANGED');
    if (registration.localPath !== undefined) sameSourceUri(registration.localPath, declared);
    physicalPath = declared;
  } else {
    physicalPath = path.join(workspaceRoot, safe(sourcePhysicalBinding.path));
  }
  return freeze({placement: guest ? origin.placement : 'repository-source-v001', physicalPath,
    sizeBytes: origin.byteSize, fileSha256: origin.fileSha256, logicalBinding: clone(sourceLogicalBinding),
    sourceArtifact: clone(artifact), normalOwners: clone(normalOwners)});
}

export async function assertApprovedDigestInputsV001(inputs: unknown, qualified: ApprovedDigestQualifiedJobV001): Promise<void> {
  await assertQualifiedDigestApprovedJobV001(qualified);
  assert(inputs !== null && typeof inputs === 'object', 'QUALIFIED_APPROVED_DIGEST_INPUTS_REQUIRED');
  const record = qualifiedInputs.get(inputs);
  assert(record && record.qualified === qualified, 'QUALIFIED_APPROVED_DIGEST_INPUTS_REQUIRED');
  const wire = await load(qualified.workspaceRoot, 'evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
  assert.equal(sha(wire.formal(inputs)), record.bodySha256, 'APPROVED_DIGEST_INPUTS_MUTATED');
  for (const binding of record.bindings) await qualified.readBinding(binding);
  await j16Closures.get(inputs)?.assertCurrent();
  for (const entry of record.absoluteBindings) await readAbsoluteMigrationBytes(entry.binding, qualified, entry.originalAnswerBinding);
  await qualified.assertCurrent();
}

async function readAbsoluteMigrationBytes(binding: Json, qualified: ApprovedDigestQualifiedJobV001, originalAnswerBinding?: Json): Promise<Buffer> {
  const file=binding.path;
  assert(path.isAbsolute(file) && path.normalize(file)===file, 'APPROVED_DIGEST_MIGRATION_ABSOLUTE_PATH');
  if(originalAnswerBinding !== undefined) same(binding,originalAnswerBinding);
  else assert(file.startsWith(qualified.job.inputs.inputRoot+'/'+qualified.job.inputs.inputPrefix+'/'), 'APPROVED_DIGEST_CURRENT_ANSWER_SSD_PREFIX');
  assert.equal(await realpath(file),file,'APPROVED_DIGEST_MIGRATION_SYMLINK');
  const before=await lstat(file,{bigint:true});assert(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1n);
  if(originalAnswerBinding===undefined) assert.equal(before.dev,BigInt(qualified.job.storage.guestDevice),'APPROVED_DIGEST_CURRENT_ANSWER_DEVICE');
  const first=await readFile(file),second=await readFile(file),after=await lstat(file,{bigint:true});
  assert(first.equals(second),'APPROVED_DIGEST_MIGRATION_UNSTABLE_BYTES');
  for(const key of ['ino','dev','size','mtimeNs','ctimeNs'] as const) assert.equal(after[key],before[key],'APPROVED_DIGEST_MIGRATION_UNSTABLE_IDENTITY');
  assert.equal(sha(first),binding.fileSha256);if(binding.sizeBytes!==undefined)assert.equal(first.length,binding.sizeBytes);
  return first;
}

/** Every source owner comes from the saved normal preparation, never a caller's handoff summary. */
export async function readApprovedDigestInputsV001(qualified: ApprovedDigestQualifiedJobV001): Promise<ApprovedDigestInputsV001> {
  await assertQualifiedDigestApprovedJobV001(qualified);
  const root = await realpath(qualified.workspaceRoot), job = qualified.job, specs = object(job.inputs);
  if(specs.kind==='j16-staged-static-v001') return readApprovedJ16StaticInputsV001(qualified);
  const observed = new Map<string, Json>();
  const readOrigin = async (binding: Json) => {const value = await qualified.readBinding(binding);
    observed.set(JSON.stringify(binding), clone(binding)); return value;};
  const read = async (binding: Json) => {assert(binding.path.startsWith(specs.inputPrefix+'/'), 'APPROVED_DIGEST_CURRENT_JSON_SSD_PREFIX'); return readOrigin(binding);};
  const params = clone(object(specs.preparationParameters));
  assert.equal(await realpath(params.workspaceRoot), root, 'APPROVED_DIGEST_PREPARATION_ROOT_CHANGED');
  assert.equal(params.inputRoot, specs.inputRoot, 'APPROVED_DIGEST_INPUT_ROOT_CHANGED');
  assert.equal(params.inputPrefix, specs.inputPrefix, 'APPROVED_DIGEST_INPUT_PREFIX_CHANGED');
  const inputPath = (p: string) => {safe(p); assert(p.startsWith(specs.inputPrefix + '/'), 'APPROVED_DIGEST_INPUT_PREFIX_REQUIRED'); return p;};
  for (const p of [params.sourceRuntimeRoot, params.outputRoot]) {assert(path.isAbsolute(p)); inputPath(path.relative(specs.inputRoot,p));}
  inputPath(params.stateBinding.path); inputPath(params.styleTemplateBinding.path);
  const absoluteObserved = new Map<string, {binding:Json; originalAnswerBinding?:Json}>();
  const [wire, core, frameClock, indexer, entry, inspector] = await Promise.all([
    load(root, 'evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts'),
    load(root, 'evals/clip_composition/adopted_media_manufacturing_v001.mts'),
    load(root, 'evals/clip_composition/presentation_base_media_timeline_v004.mjs'),
    load(root, 'evals/clip_composition/presentation_renderer_text_layout_v001.mjs'),
    load(root, 'evals/clip_composition/presentation_renderer_entry_v001.tsx'),
    load(root, 'evals/clip_composition/inspect_presentation_render_layout_v001.ts'),
  ]);
  const prepared: Json = await readPreparedDigestCaptionJudgmentInputsV001(params as any, specs.preparationManifestBinding);
  const preparation = await read(specs.preparationManifestBinding); same(preparation, prepared.manifest);
  same(preparation.expected, params.expected); same(preparation.stateBinding, params.stateBinding);
  const bySha = (hash: string) => {const matches = list(preparation.inputReferences).filter(binding => binding.fileSha256 === hash);
    assert.equal(matches.length, 1, 'APPROVED_DIGEST_NORMAL_REFERENCE_UNRESOLVED'); return matches[0];};
  const physical = (binding: Json) => {
    const matches = list(preparation.logicalToPhysical).filter(item => item.path === binding.path);
    assert.equal(matches.length, 1, 'APPROVED_DIGEST_PHYSICAL_REFERENCE_UNRESOLVED'); const found = matches[0];
    assert.equal(found.fileSha256, binding.fileSha256, 'APPROVED_DIGEST_PHYSICAL_SHA_CHANGED');
    if (binding.path === normalPlan.sourceVideoBinding.path && found.placement !== undefined) {
      assert.equal(found.placement, 'normal-declared-guest-source-v001', 'APPROVED_DIGEST_SOURCE_PLACEMENT_CHANGED');
      return {...binding, path: found.physicalPath, bytesVerified: found.bytesVerified, placement: found.placement, sizeBytes: found.sizeBytes};
    }
    return {...binding, path: inputPath(found.physicalPath), bytesVerified: found.bytesVerified};
  };
  const readLogical = (binding: Json) => {const found = physical(object(binding));
    assert.equal(found.bytesVerified, true, 'APPROVED_DIGEST_JSON_REFERENCE_UNVERIFIED');
    const {bytesVerified: _, ...plain} = found; return read(plain);};
  const normalState = await read(preparation.stateBinding);
  const normalPlan = await read(bySha(params.expected.planSha256)), normalExecution = await read(bySha(params.expected.executionSha256));
  const normalPreparation = await readLogical(normalPlan.preparationBinding), transcript = await readLogical(normalPlan.transcriptBinding);
  const consumption = await readLogical(normalExecution.consumptionBinding);
  const adoption = await readLogical(consumption.outputs['machine-adoption.json']), edit = await readLogical(normalExecution.editPlanBinding);
  const manufacturing = await readLogical(normalExecution.manufacturingInputBinding), clock = await readLogical(normalExecution.clockResolutionBinding);
  const inspection = await readLogical(normalExecution.sourceInspectionBinding), styleTemplate = await read(preparation.styleTemplateBinding);
  const rendererTemplate = await read(specs.rendererTemplateBinding);
  wire.pass((await load(root, 'evals/clip_composition/presentation_renderer_admission_receipt_v002.mjs')).validatePresentationInstructionRendererJobV002(rendererTemplate), 'APPROVED_DIGEST_RENDERER_TEMPLATE_INVALID');
  const sourcePhysicalBinding = physical(normalPlan.sourceVideoBinding);
  assert.equal(sourcePhysicalBinding.bytesVerified, false); // Media bytes are inspected at the formal large-copy boundary.
  assert.equal(clock.status, 'passed');
  same(core.projectAdoptedMediaRangesV001(edit, inspection.media).mappings, clock.mappings);
  const expected = object(job.expected), mappings = list(clock.mappings), groups = list(prepared.meaning.orderedCandidates), originalAtoms = list(prepared.meaning.atomOccurrences);
  for (const name of ['frames', 'audioSamples', 'groups', 'atoms', 'cues']) assert(Number.isSafeInteger(expected[name]) && expected[name] > 0, 'APPROVED_DIGEST_EXPECTED_COUNT_REQUIRED ' + name);
  assert.equal(groups.length, expected.groups); assert.equal(originalAtoms.length, expected.atoms); assert.equal(mappings.length, groups.length);
  assert.equal(mappings.at(-1)!.outputEndFrame, expected.frames); assert.equal(mappings.at(-1)!.audioSamples.outputEnd, expected.audioSamples);
  assert.equal(prepared.requests.length, groups.length);
  same(groups.flatMap(group => group.atomOccurrenceIds), originalAtoms.map(atom => atom.atomOccurrenceId));
  assert.equal(prepared.meaning.captions.length, 1);
  const manifest = await read(specs.candidateManifestBinding);
  assert(['digest-caption-current-registration-candidate-bundle-v001', 'digest-caption-current-visibility-candidate-bundle-v001'].includes(manifest.schemaVersion), 'APPROVED_DIGEST_CURRENT_CANDIDATE_REQUIRED');
  for (const field of ['originalCandidateManifestBinding', 'displayMeaningBinding', 'displayAdjustmentBinding'])
    assert.equal(manifest[field], undefined, 'APPROVED_DIGEST_UNDECLARED_DISPLAY_ADJUSTMENT');
  let visibilityAdoption: Json | null = null, migrated = manifest;
  if (manifest.schemaVersion === 'digest-caption-current-visibility-candidate-bundle-v001') {
    assert.equal(job.verificationPolicy?.mode, 'representative-plus-rules-v001', 'APPROVED_DIGEST_VISIBILITY_REPRESENTATIVE_POLICY_REQUIRED');
    assert.equal(job.recoveryBinding, undefined, 'APPROVED_DIGEST_VISIBILITY_RECOVERY_FORBIDDEN');
    for (const binding of [specs.candidateManifestBinding, object(manifest.visibilityAdoptionBinding)])
      assert(Number.isSafeInteger(binding.sizeBytes) && binding.sizeBytes > 0, 'APPROVED_DIGEST_VISIBILITY_BINDING_SIZE_REQUIRED');
    visibilityAdoption = await read(object(manifest.visibilityAdoptionBinding));
    visibilityExact(visibilityAdoption, ['schemaVersion', 'mode', 'bindings', 'decisions', 'counts'], 'APPROVED_DIGEST_VISIBILITY_FIELDS');
    assert.equal(visibilityAdoption.schemaVersion, 'digest-caption-visibility-adoption-v001');
    assert.equal(visibilityAdoption.mode, 'explicit-cue-adoption-v001', 'APPROVED_DIGEST_EXPLICIT_VISIBILITY_REQUIRED');
    visibilityExact(visibilityAdoption.bindings, ['originalCandidateManifestBinding', 'meaningBinding', 'correspondenceBinding', 'originalClockBinding', 'mapBinding'], 'APPROVED_DIGEST_VISIBILITY_BINDINGS');
    migrated = await read(object(visibilityAdoption.bindings.originalCandidateManifestBinding));
    assert.equal(migrated.schemaVersion, 'digest-caption-current-registration-candidate-bundle-v001', 'APPROVED_DIGEST_VISIBILITY_ORIGINAL_REQUIRED');
    const {visibilityAdoptionBinding: _, ...unchanged} = manifest;
    unchanged.schemaVersion = migrated.schemaVersion;
    same(unchanged, migrated);
    for (const name of ['meaningBinding', 'correspondenceBinding', 'originalClockBinding', 'mapBinding'])
      same(visibilityAdoption.bindings[name], migrated[name]);
  } else assert.equal(manifest.visibilityAdoptionBinding, undefined, 'APPROVED_DIGEST_UNDECLARED_VISIBILITY');
  const meaning = await read(object(manifest.meaningBinding)); same(meaning, prepared.meaning);
  same(migrated.preparationManifestBinding, specs.preparationManifestBinding); same(migrated.meaningBinding, manifest.meaningBinding);
  same(manifest.registrationMigrationBinding, migrated.registrationMigrationBinding);
  const migrationProof = await read(object(migrated.registrationMigrationBinding));
  same(migrationProof.bindings.approvalEvidenceBinding, specs.migrationApprovalEvidenceBinding);
  const migrationApproval=await read(specs.migrationApprovalEvidenceBinding);
  same(migrationApproval.originalCandidateManifestBinding,migrationProof.bindings.originalCandidateManifestBinding);
  const originManifest=await readOrigin(object(migrationApproval.originalCandidateManifestBinding));
  const originReceipts=list(originManifest.responses);assert.equal(originReceipts.length,31);
  const migrationBound = async (binding: Json, originalAnswerBinding?:Json, originEvidence=false) => {
    let bytes: Buffer;
    if (path.isAbsolute(binding.path)) {
      bytes = await readAbsoluteMigrationBytes(binding, qualified, originalAnswerBinding); absoluteObserved.set(JSON.stringify(binding),{binding:clone(binding),...(originalAnswerBinding===undefined?{}:{originalAnswerBinding:clone(originalAnswerBinding)})});
    } else {
      const value = await (originEvidence?readOrigin:read)(binding);
      const stable = await load(root, 'evals/clip_composition/presentation_timeline_composition_decision_v001.mjs');
      bytes = await stable.readPresentationMeaningWorkspaceFileStableV001({workspaceRoot:digestApprovedJobInputRootV001(job,binding.path,root),relativePath:binding.path});
      assert.equal(sha(bytes),binding.fileSha256); same(JSON.parse(bytes.toString()),value);
    }
    return {binding,bytes};
  };
  const proofInputs: Json = {planId:job.planId, expectedApprovalEvidenceBinding:specs.migrationApprovalEvidenceBinding};
  for (const [name, field] of Object.entries({approvalEvidence:'approvalEvidenceBinding',originalCandidate:'originalCandidateManifestBinding',
    originalPreparation:'oldPreparationManifestBinding',preparation:'newPreparationManifestBinding',originalMeaning:'oldMeaningBinding',meaning:'newMeaningBinding',
    originalExecution:'originalExecutionBinding',execution:'currentExecutionBinding',originalMachineAdoption:'originalMachineAdoptionBinding',machineAdoption:'currentMachineAdoptionBinding',
    originalClock:'originalClockBinding',clock:'currentClockBinding'})) proofInputs[name]=await migrationBound(object(migrationProof.bindings[field]),undefined,name.startsWith('original'));
  same(proofInputs.preparation.binding,specs.preparationManifestBinding); same(proofInputs.meaning.binding,manifest.meaningBinding);
  same(JSON.parse(proofInputs.execution.bytes.toString()),normalExecution); same(JSON.parse(proofInputs.clock.bytes.toString()),clock);
  const migratedReceipts=list(migrated.responses);
  proofInputs.registrations=[];
  for (const [i,row] of list(migrationProof.registrations).entries()) {
    const registration: Json={ordinal:row.ordinal,original:{},current:{}};
    for (const side of ['original','current']) for (const name of ['request','response','result','trace','actualAnswerSource']) {
      const binding=object(row[side][name+'Binding']);
      if(side==='current') same(binding,migratedReceipts[i][name+'Binding']);
      registration[side][name]=await migrationBound(binding,side==='original'&&name==='actualAnswerSource'?object(originReceipts[i].actualAnswerSourceBinding):undefined,side==='original');
    }
    proofInputs.registrations.push(registration);
  }
  await assertDigestCaptionRegistrationMigrationV001({...proofInputs,proof:migrationProof} as any);
  const meaningOutput = preparation.outputs.find((binding: Json) => binding.fileName === 'meaning-input.json'); assert(meaningOutput);
  assert.equal(manifest.meaningBinding.path, meaningOutput.path); assert.equal(manifest.meaningBinding.fileSha256, meaningOutput.fileSha256);
  const map = await read(object(manifest.mapBinding));
  same(map.originalClockBinding, normalExecution.clockResolutionBinding); same(map.originalMappings, clock.mappings);
  same(manifest.originalClockBinding ?? map.originalClockBinding, normalExecution.clockResolutionBinding);
  assert.equal(inspection.media.source.video.frameRate, map.sourceFrameClock.inputFrameRate);
  assert.equal(inspection.media.decodedFrameCount, map.sourceFrameClock.decodedFrameCount);
  assert.equal(inspection.media.source.video.presentationOffsetMs, map.sourceFrameClock.videoPresentationOffsetMs);
  const atoms = list(meaning.atomOccurrences), atomById = new Map(atoms.map(atom => [atom.atomOccurrenceId, atom]));
  assert.equal(atomById.size, originalAtoms.length);
  const candidate = object(manifest.technicalCandidate), propsRecord = await read(object(candidate.source));
  assert.equal(candidate.field, 'props'); const props = object(propsRecord.props); same(candidate.props, props);
  const typography = await read(specs.typographySettingsBinding);
  assert.equal(typography.schemaVersion, 'digest-caption-typography-settings-v001');
  const typographyValues = resolveDigestTypographySettingsV001(typography.settings, {canvasWidthPx: props.canvas.width,
    borderWidthPx: props.visualState.textStyle.borderWidthPx, glowWidthPx: props.visualState.textStyle.glowWidthPx,
    textSafePaddingRatio: props.layoutRules.textSafePaddingRatio});
  same(typography.derived, typographyValues); same(manifest.derivedTypographyValues, typographyValues);
  same(manifest.typographySettingsBinding, specs.typographySettingsBinding);
  assert.equal(props.visualState.textStyle.fontSizePx, typographyValues.fontSizePx);
  assert.equal(props.canvas.safeAreaPx.left, typographyValues.horizontalMarginPx); assert.equal(props.canvas.safeAreaPx.right, typographyValues.horizontalMarginPx);
  assert.equal(props.layoutRules.horizontalSafeMarginRatio, typographyValues.horizontalSafeMarginRatio);
  assert.equal(props.visualState.layout.maxLines, typographyValues.maxLinesPerCue);
  if (typography.sourceUserConfigurationBinding !== undefined) same((await read(typography.sourceUserConfigurationBinding)).settings, typography.settings);
  const rules = await read(object(manifest.candidateRulesBinding));
  assert(typeof rules.newTaskDescription === 'string' && rules.newTaskDescription.length, 'APPROVED_DIGEST_TASK_RULE_REQUIRED');
  if (rules.rules !== undefined) {assert.equal(rules.rules.maxLogicalWidthPerLine, typographyValues.maxLogicalWidthPerLine); assert.equal(rules.rules.maxLinesPerCue, typographyValues.maxLinesPerCue);}
  if (typography.candidateRulesBinding !== undefined) same(typography.candidateRulesBinding, manifest.candidateRulesBinding);
  if (typography.candidatePropsBinding !== undefined) same(typography.candidatePropsBinding, candidate.source);
  const requests: Json[] = [], responses: Json[] = [], results: Json[] = [], tokens: object[] = [], rows: Json[] = [];
  const receipts = list(manifest.responses); assert.equal(receipts.length, groups.length);
  const expectedLimits = {...clone(prepared.requests[0].input.styleLimits),
    maxLogicalWidthPerLine: typographyValues.maxLogicalWidthPerLine, maxLinesPerCue: typographyValues.maxLinesPerCue};
  const perGroupChanges: Json[] = [];
  for (const [i, receipt] of receipts.entries()) {
    assert.equal(receipt.ordinal, i + 1);
    const request = await read(object(receipt.requestBinding)), response = await read(object(receipt.responseBinding)), result = await read(object(receipt.resultBinding));
    assert.equal(request.inputCanonicalSha256, wire.canonicalSha(request.input));
    assert.equal(request.input.taskDescription, rules.newTaskDescription);
    same(request.input.styleLimits, expectedLimits);
    const restored = clone(request), original = prepared.requests[i];
    restored.requestId = original.requestId; restored.input.taskDescription = original.input.taskDescription;
    restored.input.styleLimits = clone(original.input.styleLimits); restored.inputCanonicalSha256 = original.inputCanonicalSha256;
    same(restored, original);
    if (receipt.actualAnswerSourceBinding !== undefined) {
      const source = object(receipt.actualAnswerSourceBinding); assert(path.isAbsolute(source.path));
      const info = await lstat(source.path); assert(info.isFile() && !info.isSymbolicLink() && await realpath(source.path) === source.path);
      const bytes = await readFile(source.path); assert.equal(sha(bytes), source.fileSha256); assert.equal(bytes.length, source.sizeBytes);
      same(JSON.parse(bytes.toString()), response);
    }
    const token = core.validateDisplayForAdoptionV001(request, response, result, 'digest-caption-judgment-display-response-v001');
    const traces = core.readValidatedDisplayTracesV001([request], [token]);
    const savedTrace = await read(object(receipt.traceBinding)); same(savedTrace.traces, traces);
    const correspondence = await read(object(receipt.correspondenceBinding)), groupRows = list(correspondence.rows);
    const group = groups[i], mapping = mappings[i], cap = request.input.captions[0], boundaries = list(cap.boundaryCandidates);
    assert.equal(mapping.segmentId, group.timelineSegmentId); assert.equal(boundaries.length, group.atomOccurrenceIds.length);
    const indices = new Map(boundaries.map((boundary, index) => [boundary.boundaryId, index])); assert.equal(indices.size, boundaries.length);
    assert.equal(groupRows.length, traces[0].cues.length); assert.equal(groupRows.length, receipt.cueCount);
    assert.equal(groupRows.reduce((n, row) => n + row.lines.length, 0), receipt.lineCount);
    assert.equal(groupRows.reduce((n, row) => n + row.atomOccurrenceIds.length, 0), receipt.atomCount);
    let previousEnd = -1, previousFrameEnd = mapping.outputStartFrame;
    for (const [j, row] of groupRows.entries()) {
      const cue = traces[0].cues[j], end = indices.get(cue.cueEndBoundaryId); assert(end !== undefined && end > previousEnd);
      const ids = group.atomOccurrenceIds.slice(previousEnd + 1, end + 1), rowAtoms = ids.map((id: string) => {const atom = atomById.get(id); assert(atom); return atom;});
      assert.equal(row.groupOrdinal, i + 1); assert.equal(row.cueOrdinal, j + 1); assert.equal(row.candidateId, group.candidateId);
      assert.equal(row.timelineSegmentId, group.timelineSegmentId); assert.equal(row.captionId, cap.captionId);
      assert.equal(row.cueEndBoundaryId, cue.cueEndBoundaryId); same(row.lineEndBoundaryIds, cue.lineEndBoundaryIds); same(row.atomOccurrenceIds, ids);
      same(row.sourceSegmentIds, rowAtoms.map((atom: Json) => atom.sourceSegmentId));
      same(row.semanticUtteranceIds, [...new Set(rowAtoms.map((atom: Json) => atom.semanticUtteranceId))]);
      let previousLine = previousEnd;
      const lines = cue.lineEndBoundaryIds.map((id: string) => {const lineEnd = indices.get(id); assert(lineEnd !== undefined && lineEnd > previousLine && lineEnd <= end);
        const lineIds = group.atomOccurrenceIds.slice(previousLine + 1, lineEnd + 1), line = {lineEndBoundaryId: id,
          text: boundaries.slice(previousLine + 1, lineEnd + 1).map(boundary => boundary.text).join(''), atomOccurrenceIds: lineIds,
          sourceSegmentIds: lineIds.map((aid: string) => atomById.get(aid)!.sourceSegmentId)}; previousLine = lineEnd; return line;});
      same(row.lines, lines); assert.equal(previousLine, end);
      const spans = rowAtoms.map((atom: Json) => {assert.equal(atom.retainedSpans.length, 1); const span = atom.retainedSpans[0];
        assert.equal(span.timelineSegmentId, group.timelineSegmentId); assert(span.sourceStartMs < span.sourceEndMs); return span;});
      assert(spans.every((span: Json, k: number) => !k || (span.sourceStartMs >= spans[k - 1].sourceStartMs && span.sourceEndMs >= spans[k - 1].sourceEndMs)));
      const sourceStartMs = spans[0].sourceStartMs, sourceEndMs = spans.at(-1).sourceEndMs;
      assert(sourceStartMs >= mapping.sourceStartMs && sourceEndMs <= mapping.sourceEndMs);
      const sourceStartFrame30 = frameClock.frameBoundaryWithVideoOffsetV001(sourceStartMs, map.sourceFrameClock.videoPresentationOffsetMs);
      const sourceEndFrame30 = frameClock.sourceEndFrameBoundaryWithVideoOffsetV001(sourceEndMs, map.sourceFrameClock);
      const startFrame = mapping.outputStartFrame + sourceStartFrame30 - mapping.sourceStartFrame30;
      const endFrameExclusive = mapping.outputStartFrame + sourceEndFrame30 - mapping.sourceStartFrame30;
      same(timing(row), {sourceStartMs, sourceEndMs, sourceStartFrame30, sourceEndFrame30, startFrame, endFrameExclusive, displayFrameCount: endFrameExclusive - startFrame});
      assert(Number.isSafeInteger(startFrame) && Number.isSafeInteger(endFrameExclusive) && startFrame >= previousFrameEnd
        && endFrameExclusive > startFrame && endFrameExclusive <= mapping.outputEndFrame, 'APPROVED_DIGEST_CUE_CLOCK_INVALID');
      const indexed = indexer.indexExplicitLinesV001(lines.map((line: Json) => line.text)); assert.equal(indexed.status, 'passed');
      assert.equal(indexed.sourceText, rowAtoms.map((atom: Json) => atom.text).join(''));
      const geometry = object(row.geometry); assert(typeof geometry.items?.[0]?.instructionId === 'string');
      const overlay: Json = {...clone(props), instructionId: geometry.items[0].instructionId, text: indexed.sourceText, indexedLines: indexed.indexedLines};
      same(row.exactTextModel, entry.buildExactTextModel(overlay));
      const inspected = inspector.inspectPresentationRenderLayoutV001({canvas: overlay.canvas, overlays: [overlay]});
      assert.equal(inspected.status, 'passed'); same(inspected.violations, []); same(geometry, inspected);
      previousEnd = end; previousFrameEnd = endFrameExclusive;
    }
    assert.equal(previousEnd, boundaries.length - 1); same(groupRows.flatMap(row => row.atomOccurrenceIds), group.atomOccurrenceIds);
    requests.push(request); responses.push(response); results.push(result); tokens.push(token); rows.push(...groupRows);
    if (correspondence.changes !== undefined) perGroupChanges.push(...list(correspondence.changes));
  }
  const traces = core.readValidatedDisplayTracesV001(requests, tokens), savedTraces = await read(object(manifest.tracesBinding)); same(savedTraces.traces, traces);
  const correspondence = await read(object(manifest.correspondenceBinding)); same(correspondence.rows, rows);
  if (correspondence.changes !== undefined) same(correspondence.changes, perGroupChanges);
  assert.equal(rows.length, expected.cues); same(rows.flatMap(row => row.atomOccurrenceIds), atoms.map(atom => atom.atomOccurrenceId));
  if (visibilityAdoption !== null) assertExplicitCaptionVisibilityAdoptionV001(visibilityAdoption, rows);
  const summary = object(manifest.summary); assert.equal(summary.groups, expected.groups); assert.equal(summary.atoms, expected.atoms); assert.equal(summary.newCues, expected.cues);
  assert.equal(summary.newLines, rows.reduce((n, row) => n + row.lines.length, 0));
  same(manifest.newStyleLimits, requests[0].input.styleLimits);
  if (typography.requestBindings !== undefined) same(typography.requestBindings, receipts.map(receipt => receipt.requestBinding));
  const draft = normalState.requestDrafts.find((value: Json) => value.id === params.expected.requestDraftId); assert(draft);
  const normalOwners = {requestDraftId: draft.id, planRequestId: params.expected.planRequestId, executionRequestId: params.expected.executionRequestId};
  const origin = object(normalPreparation.identity.sourceOrigin);
  const registration = origin.placement === undefined ? undefined : await readLogical(origin.registration);
  if (origin.provenanceBinding !== undefined || registration?.normalSourceProvenanceBinding !== undefined) {
    same(origin.provenanceBinding, registration?.normalSourceProvenanceBinding);
    const provenance = await readLogical(object(origin.provenanceBinding));
    const originalTranscript = await readLogical(object(provenance.originalTranscriptBinding));
    const rawGpu = await readLogical(object(provenance.rawGpuBinding));
    same(provenance.normalTranscriptBinding, normalPlan.transcriptBinding);
    const savedNormalTranscript = await readLogical(object(provenance.normalTranscriptBinding)); same(savedNormalTranscript, transcript);
    const planRequest = normalState.agentRequests.find((r:Json) => r.id === normalOwners.planRequestId);
    const sttRequest = normalState.agentRequests.find((r:Json) => r.id === planRequest?.dependsOnAgentRequestId);
    const sourceRequest = normalState.agentRequests.find((r:Json) => r.id === sttRequest?.dependsOnAgentRequestId);
    assert(sttRequest?.type === 'run_stt' && sourceRequest?.type === 'prepare_video', 'APPROVED_DIGEST_SOURCE_OWNER_CHANGED');
    const normal = await load(root, 'runner/src/digest-plan-preparation-v001.ts');
    normal.assertNormalDigestSourceProvenanceV001(provenance, {draftId: normalOwners.requestDraftId,
      sourceRequestId: sourceRequest.id, sttRequestId: sttRequest.id, sourceOrigin: origin,
      transcriptBinding: normalPlan.transcriptBinding, transcript, originalTranscript, rawGpu});
  }
  const sourceDeclaration = deriveApprovedDigestSourceDeclarationV001({workspaceRoot: root, storage: job.storage, normalState,
    normalPlan, normalPreparation, manufacturing, inspection, sourcePhysicalBinding, sourceLogicalBinding: normalPlan.sourceVideoBinding,
    normalOwners, transcript, registration});
  const aggregateView = {caseId: job.planId, inputCaptionId: preparation.preparationId + '-input-caption',
    semanticCaptionId: meaning.captions[0].captionId, boundaryCandidates: requests.flatMap(request => request.input.captions[0].boundaryCandidates),
    atomOccurrenceIds: atoms.map(atom => atom.atomOccurrenceId), styleLimits: clone(requests[0].input.styleLimits), taskDescription: rules.newTaskDescription};
  const value = {workspaceRoot: root, inputRoot:specs.inputRoot,inputPrefix:specs.inputPrefix,registrationMigration:migrationProof, manifestBinding: clone(specs.candidateManifestBinding), manifest, preparation,
    preparationManifestBinding: clone(specs.preparationManifestBinding), meaning, requests, responses, results, traces, correspondence,
    visibilityAdoption,
    normalState, normalPlan, normalExecution, normalPreparation, adoption, edit, manufacturing, inspection, clock, styleTemplate, rendererTemplate,
    sourcePhysicalPath: sourcePhysicalBinding.path, sourcePhysicalBinding, sourceLogicalBinding: normalPlan.sourceVideoBinding,
    normalOwners, normalReferenceMap: clone(preparation.logicalToPhysical), sourceDeclaration, aggregateView, candidateRules: rules,
    typographySettings: typography.settings, typographyValues, typographySettingsBinding: clone(specs.typographySettingsBinding),
    authorizationBinding: clone(qualified.authorizationBinding), jobBinding: clone(qualified.jobBinding)};
  await qualified.assertCurrent(); freeze(value); qualifiedInputs.set(value, {qualified, bodySha256: sha(wire.formal(value)), bindings: [...observed.values()],absoluteBindings:[...absoluteObserved.values()]}); return value;
}

async function assertContext(qualified: ApprovedDigestQualifiedJobV001, context: Json) {
  const adapter = await load(qualified.workspaceRoot, 'runner/src/digest-formal-handoff-v001.ts');
  await adapter.assertQualifiedDigestStorageContextV001(context);
  assert.equal(context.approvedJob, qualified, 'APPROVED_DIGEST_CONTEXT_JOB_CHANGED');
  assert.equal(context.outputRoot, qualified.job.outputRoot, 'APPROVED_DIGEST_CONTEXT_ROOT_CHANGED');
  await context.assertCurrent();
}

/** Called only by the existing source validator's opaque qualification bridge. */
export async function assertQualifiedApprovedDigestSourcePackageTaskV001(value: Json, inputs: Json) {
  const record = qualifiedSources.get(value); assert(record && record.inputs === inputs, 'QUALIFIED_APPROVED_DIGEST_SOURCE_REQUIRED');
  await assertApprovedDigestInputsV001(inputs, record.qualified); await assertContext(record.qualified, record.context);
  const wire = await load(record.qualified.workspaceRoot, 'evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
  assert.equal(sha(wire.formal(value)), record.bodySha256, 'APPROVED_DIGEST_SOURCE_MUTATED');
  assert.equal(value.packageId, record.qualified.job.planId + '-source-package');
  assert.equal(value.promptInput.taskDescription, inputs.candidateRules.newTaskDescription);
  return Object.freeze({taskDescription: value.promptInput.taskDescription, bodySha256: record.bodySha256,
    jobBinding: record.qualified.jobBinding, authorizationBinding: record.qualified.authorizationBinding});
}

/** Restores only the exact body privately built for this same qualified job and owned context. */
export async function qualifyApprovedDigestSourcePackageReadbackV001(value: Json, inputs: Json,
  qualified: ApprovedDigestQualifiedJobV001, context: Json, binding: Json, bytes: Buffer) {
  await assertApprovedDigestInputsV001(inputs, qualified); await assertContext(qualified, context);
  const record = publishedBodies.get(context);
  assert(record && record.inputs === inputs && record.qualified === qualified && record.context === context, 'APPROVED_DIGEST_SOURCE_READBACK_OWNER_REQUIRED');
  assert.equal(binding.path, qualified.job.outputRoot + '/source-package.json'); assert(Buffer.isBuffer(bytes));
  const stable = await load(qualified.workspaceRoot, 'evals/clip_composition/presentation_timeline_composition_decision_v001.mjs');
  const actual: Buffer = await stable.readPresentationMeaningWorkspaceFileStableV001({workspaceRoot: context.storageRoot, relativePath: binding.path});
  assert(actual.equals(bytes), 'APPROVED_DIGEST_SOURCE_READBACK_PHYSICAL_BYTES_CHANGED');
  assert.equal(sha(bytes), binding.fileSha256); if (binding.sizeBytes !== undefined) assert.equal(bytes.length, binding.sizeBytes);
  assert.equal(sha(bytes), record.bodySha256, 'APPROVED_DIGEST_SOURCE_READBACK_BYTES_CHANGED'); same(JSON.parse(bytes.toString()), value);
  const wire = await load(qualified.workspaceRoot, 'evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
  assert.equal(sha(wire.formal(value)), record.bodySha256);
  if (binding.canonicalSha256 !== undefined) assert.equal(wire.canonicalSha(value), binding.canonicalSha256);
  if (binding.schemaVersion !== undefined) assert.equal(value.schemaVersion, binding.schemaVersion);
  assert(!qualifiedSources.has(value), 'APPROVED_DIGEST_SOURCE_ALREADY_REGISTERED'); qualifiedSources.set(value, record);
  const validator = await load(qualified.workspaceRoot, 'evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs');
  await validator.qualifyApprovedDigestSourcePackageTaskV001(value, inputs); return value;
}

/** Deterministic metadata construction only. This function never creates a storage or task capability. */
export async function buildApprovedDigestSourcePackageValueV001(inputs: Json, qualified: ApprovedDigestQualifiedJobV001,
  c: Json, base: Json, style: Json) {
  const wire = await load(qualified.workspaceRoot, 'evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
  const inputsPrefix = qualified.job.outputRoot + '/', value = clone(inputs.styleTemplate);
  const atoms = inputs.meaning.atomOccurrences, boundaries = inputs.aggregateView.boundaryCandidates;
  const control = (binding: Json) => ({...clone(binding), path: safe(path.isAbsolute(binding.path)
    ? path.relative(qualified.workspaceRoot, binding.path).split(path.sep).join('/') : binding.path)});
  const captionId = inputs.aggregateView.inputCaptionId, meaningBinding = wire.bind(inputsPrefix + 'meaning-input.json', inputs.meaning);
  value.packageId = qualified.job.planId + '-source-package';
  value.promptInput = {...clone(inputs.requests[0].input), captions: [{captionId, boundaryCandidates: clone(boundaries)}]};
  const cc = clone(value.reconstructionMap.caseContexts[0]); cc.caseId = qualified.job.planId; cc.inputCaptionId = captionId;
  cc.meaningPackageBinding = meaningBinding; cc.baseMediaInput = clone(base); cc.styleBindings = clone(style.bindings);
  cc.horizontalStyleInput.presetBinding = {...clone(style.bindings), presetId: cc.resolvedStyle.presetId};
  for (const field of ['horizontalStyleInput', 'resolvedStyle']) {
    const policy = field === 'horizontalStyleInput' ? cc[field].captionLayoutPolicy : cc[field];
    policy.maxLogicalWidthPerLine = inputs.typographyValues.maxLogicalWidthPerLine; policy.maxLinesPerDisplayPage = inputs.typographyValues.maxLinesPerCue;
  }
  assert.equal(cc.resolvedStyle.cropMode, 'identity'); assert.equal(cc.resolvedStyle.sceneTransitionMode, 'straight-cut-only'); assert.equal(cc.resolvedStyle.audioMode, 'preserve-source-only');
  value.reconstructionMap = {meaningPackageBindings: [meaningBinding], captions: [{captionId, meaningPackageOrdinal: 1,
    semanticCaptionId: inputs.meaning.captions[0].captionId, atomOccurrenceIds: atoms.map((atom: Json) => atom.atomOccurrenceId),
    boundaries: boundaries.map((boundary: Json, i: number) => {assert.equal(boundary.text, atoms[i].text);
      return {boundaryId: boundary.boundaryId, ordinal: i + 1, afterAtomOccurrenceId: atoms[i].atomOccurrenceId};})}], caseContexts: [cc]};
  value.provenance = {sourcePackageJobBinding: c.planBinding,
    implementationBindings: qualified.job.implementation.bindings.map((binding: Json, i: number) => ({role: 'approved-digest-' + (i + 1), path: binding.path, fileSha256: binding.fileSha256})),
    approvedContractBindings: [control(qualified.jobBinding), control(qualified.authorizationBinding), control(c.plan.authorization), inputs.manifestBinding,
      inputs.preparationManifestBinding, inputs.manifest.candidateRulesBinding, inputs.typographySettingsBinding,
      ...(inputs.visibilityAdoption === null ? [] : [inputs.manifest.visibilityAdoptionBinding,
        inputs.visibilityAdoption.bindings.originalCandidateManifestBinding])]};
  return value;
}

export async function buildApprovedDigestSourcePackageV001(inputs: Json, qualified: ApprovedDigestQualifiedJobV001,
  c: Json, base: Json, style: Json, context: Json) {
  await assertApprovedDigestInputsV001(inputs, qualified); await assertContext(qualified, context);
  const wire = await load(qualified.workspaceRoot, 'evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
  assert.equal(c.plan.planId, qualified.job.planId); assert.equal(c.plan.outputRoot, qualified.job.outputRoot);
  same(c.plan.acceptedManifestBinding, inputs.manifestBinding); same(await context.readBound(c.planBinding), c.plan);
  same(await context.readBound(c.plan.authorization), qualified.authorization);
  const inputsPrefix = qualified.job.outputRoot + '/';
  same(Object.keys(base).sort(), ['baseMedia', 'generationManifest', 'timeline', 'validationReceipt']);
  const currentBaseRoot = Object.values(base).every((b: Json) => b.path.startsWith(inputsPrefix));
  if (!currentBaseRoot) {
    const recovery = await load(qualified.workspaceRoot, 'runner/src/digest-approved-job-runner-v001.ts');
    await recovery.assertQualifiedApprovedDigestRecoveryBaseV001(context, base);
  }
  assert(base.baseMedia && /^[0-9a-f]{64}$/u.test(base.baseMedia.fileSha256), 'APPROVED_DIGEST_BASE_ROOT_CHANGED');
  for (const binding of [base.timeline, base.generationManifest, base.validationReceipt]) {
    wire.assertBinding(binding); await context.readBound(binding);
  }
  const receipt = await context.readBound(base.validationReceipt); assert.equal(receipt.status, 'passed');
  same(receipt.outputs.baseMedia, base.baseMedia); same(receipt.outputs.timeline, base.timeline); same(receipt.outputs.generationManifest, base.generationManifest);
  for (const binding of Object.values(style.bindings) as Json[]) {wire.assertBinding(binding); await context.readBound(binding);}
  const value = clone(inputs.styleTemplate), atoms = inputs.meaning.atomOccurrences, boundaries = inputs.aggregateView.boundaryCandidates;
  const preset = await context.readBound(style.bindings.presetRegistry), trust = await context.readBound(style.bindings.rendererTrust);
  const props = inputs.manifest.technicalCandidate.props;
  const profile = preset.presets.find((candidate: Json) => candidate.presetId === value.reconstructionMap.caseContexts[0].resolvedStyle.presetId);
  assert(profile, 'APPROVED_DIGEST_STYLE_PROFILE_MISSING');
  assert.equal(profile.maxLogicalWidth, inputs.typographyValues.maxLogicalWidthPerLine); assert.equal(profile.maxLines, inputs.typographyValues.maxLinesPerCue);
  same(preset.canvas, props.canvas); same(profile.visualStates.find((state: Json) => state.stateId === props.visualState.stateId), props.visualState);
  same(trust.layoutRules, props.layoutRules);
  same(c.rendererTemplate.registryBindings.styleProfileRegistry, style.bindings.presetRegistry);
  same(c.rendererTemplate.registryBindings.rendererTrust, style.bindings.rendererTrust);
  assert.equal(c.rendererTemplate.executionInputs.visualStateId, props.visualState.stateId);
  const sourcePackage = await buildApprovedDigestSourcePackageValueV001(inputs, qualified, c, base, style);
  assert(!publishedBodies.has(context), 'APPROVED_DIGEST_SOURCE_ALREADY_BUILT');
  const record = {inputs, qualified, context, bodySha256: sha(wire.formal(sourcePackage))}; qualifiedSources.set(sourcePackage, record); publishedBodies.set(context, record);
  const validator = await load(qualified.workspaceRoot, 'evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs');
  await validator.qualifyApprovedDigestSourcePackageTaskV001(sourcePackage, inputs);
  wire.pass(validator.validatePresentationOutputCaptionCueSourcePackageV001(sourcePackage), 'APPROVED_DIGEST_SOURCE_PACKAGE_INVALID'); return sourcePackage;
}

const VISIBILITY_CUE_FIELDS = ['groupOrdinal', 'cueOrdinal', 'candidateId', 'timelineSegmentId', 'captionId',
  'cueEndBoundaryId', 'lineEndBoundaryIds', 'atomOccurrenceIds', 'sourceSegmentIds', 'semanticUtteranceIds', 'lines', ...TIMING];
const visibilityCue = (row: Json) => Object.fromEntries(VISIBILITY_CUE_FIELDS.map(name => [name, clone(row[name])]));
function visibilityExact(value: unknown, keys: string[], label: string): void {
  assert(value && typeof value === 'object' && !Array.isArray(value), label);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), label);
}
function assertExplicitCaptionVisibilityAdoptionV001(adoption: Json, rows: Json[]): void {
  const decisions = list(adoption.decisions);
  assert.equal(decisions.length, rows.length, 'APPROVED_DIGEST_VISIBILITY_CUE_COVERAGE');
  for (const [index, entry] of decisions.entries()) {
    visibilityExact(entry, ['cue', 'decision', 'reason'], 'APPROVED_DIGEST_VISIBILITY_DECISION_FIELDS');
    same(entry.cue, visibilityCue(rows[index]));
    assert(['show', 'suppress'].includes(entry.decision), 'APPROVED_DIGEST_VISIBILITY_DECISION_REQUIRED');
    assert(typeof entry.reason === 'string' && entry.reason.trim().length > 0, 'APPROVED_DIGEST_VISIBILITY_REASON_REQUIRED');
  }
  visibilityExact(adoption.counts, ['totalCues', 'visibleCues', 'suppressedCues'], 'APPROVED_DIGEST_VISIBILITY_COUNTS_FIELDS');
  const shown = decisions.filter(entry => entry.decision === 'show').length;
  same(adoption.counts, {totalCues: rows.length, visibleCues: shown, suppressedCues: rows.length - shown});
}

/** Derive display decisions only from opaque, byte-qualified original inputs; never from caller options. */
export async function buildApprovedDigestCaptionVisibilitySelectionV001(inputs: Json, qualified: ApprovedDigestQualifiedJobV001, plan: Json): Promise<Json | null> {
  await assertApprovedDigestInputsV001(inputs, qualified);
  if(inputs.kind==='j16-staged-static-v001') {
    same(plan,inputs.j16View.resolvedPlan);
    return freeze({...clone(inputs.visibilitySelection),adoptionBinding:clone(qualified.job.inputs.visibilityAdoptionBinding),
      manifestBinding:clone(qualified.job.inputs.candidateManifestBinding)});
  }
  const rows = list(inputs.correspondence.rows), elements = list(plan.elements);
  assert.equal(elements.length, rows.length, 'APPROVED_DIGEST_VISIBILITY_PLAN_COVERAGE');
  const ids = new Set<string>();
  for (const [index, element] of elements.entries()) {
    const row = rows[index];
    assert(typeof element.instructionId === 'string' && element.instructionId.length > 0 && !ids.has(element.instructionId), 'APPROVED_DIGEST_VISIBILITY_INSTRUCTION_ID');
    ids.add(element.instructionId);
    for (const name of ['startFrame', 'endFrameExclusive', 'displayFrameCount']) same(element[name], row[name]);
    same(element.text, row.lines.map((line: Json) => line.text).join(''));
    same(element.targetProvenance?.sourceAtomIds, row.atomOccurrenceIds);
    same(list(element.indexedLines).map(line => ({text: line.text, ids: line.sourceUnitIds})),
      row.lines.map((line: Json) => ({text: line.text, ids: line.atomOccurrenceIds})));
  }
  if (inputs.visibilityAdoption === null) return null;
  assertExplicitCaptionVisibilityAdoptionV001(inputs.visibilityAdoption, rows);
  const wire = await load(qualified.workspaceRoot, 'evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
  const entries = elements.map((element, index) => ({instructionId: element.instructionId,
    decision: inputs.visibilityAdoption.decisions[index].decision}));
  const shown = entries.filter(entry => entry.decision === 'show').length;
  return freeze({schemaVersion: 'digest-caption-visibility-selection-v001', mode: 'explicit-cue-adoption-v001',
    adoptionBinding: clone(inputs.manifest.visibilityAdoptionBinding), manifestBinding: clone(inputs.manifestBinding),
    rendererPlanCanonicalSha256: wire.canonicalSha(plan), entries,
    counts: {totalInstructions: rows.length, shownInstructions: shown, suppressedInstructions: rows.length - shown}});
}
/** get/finalize re-read the same current manifest and complete original input closure. */
export async function readApprovedDigestCaptionVisibilitySelectionV001(qualified: ApprovedDigestQualifiedJobV001, plan: Json): Promise<Json | null> {
  return buildApprovedDigestCaptionVisibilitySelectionV001(await readApprovedDigestInputsV001(qualified), qualified, plan);
}

export async function prepareApprovedDigestCaptionCoreV001(inputs: Json, qualified: ApprovedDigestQualifiedJobV001,
  c: Json, base: Json, style: Json, context: Json) {
  const sourcePackage = await buildApprovedDigestSourcePackageV001(inputs, qualified, c, base, style, context);
  const core = await load(qualified.workspaceRoot, 'evals/clip_composition/adopted_media_manufacturing_v001.mts');
  const adoption = {schemaVersion: 'digest-approved-caption-adoption-v001', artifactId: qualified.job.planId + '-caption-adoption',
    acceptedManifestBinding: inputs.manifestBinding, originalMeaningBinding: inputs.manifest.meaningBinding,
    authorizationBinding: qualified.authorizationBinding, approvedJobBinding: qualified.jobBinding,
    originalRequests: inputs.manifest.responses, traces: inputs.traces, aggregateViewOnly: true, judgmentCount: 0,
    humanQuality: 'not-evaluated', outlineChoice: null};
  return core.assembleAdoptedCaptionCoreV001(c, {meaning: inputs.meaning, sourcePackage}, base, adoption, inputs.traces, context);
}


/** Pure feature/adoption validation for arbitrary IDs and lengths. No trust is
 * granted here; the opaque job reader below re-reads every bound source. */
export async function validateApprovedJ16StaticInputV001(value: Json) {
  const {view,source,selection,adoption,manifestBinding,adoptionBinding,expected}=value;
  const stage=await import('../../evals/clip_composition/presentation_j16_staged_boundary_v001.mjs');
  stage.assertJ16StaticManufacturingViewV001(view);
  const {assertOrchestrationDrawingViewV001}=await import('../../evals/clip_composition/presentation_orchestration_v001.mjs');
  assertOrchestrationDrawingViewV001(view);
  const {validateDigestCaptionVisibilitySelectionV001}=await import('../../evals/clip_composition/presentation_renderer_qc_v002.mjs');
  assert.equal(validateDigestCaptionVisibilitySelectionV001({plan:view.resolvedPlan,selection,
    manifestBinding:selection.manifestBinding}).status,'passed','APPROVED_J16_VISIBILITY_INVALID');
  const bytesBinding=(b:Json)=>({path:b.path,fileSha256:b.fileSha256,sizeBytes:b.sizeBytes});
  same(bytesBinding(selection.manifestBinding),bytesBinding(manifestBinding));
  assert.equal(selection.adoptionBinding.fileSha256,adoptionBinding.fileSha256,'APPROVED_J16_ADOPTION_BYTES_CHANGED');
  assert.equal(selection.adoptionBinding.sizeBytes,adoptionBinding.sizeBytes,'APPROVED_J16_ADOPTION_SIZE_CHANGED');
  assert.equal(adoption.mode,'explicit-cue-adoption-v001');
  same(bytesBinding(adoption.sourceCandidateManifestBinding),bytesBinding(manifestBinding));
  assert.equal(adoption.sourceSelectionRecordSha256,view.selectionRecordSha256,'APPROVED_J16_ORIGINAL_SELECTION_CHANGED');
  assert.equal(adoption.sourceClockSha256,view.projection.sourceClockSha256,'APPROVED_J16_CLOCK_CHANGED');
  assert(adoption.approval&&typeof adoption.approval.userMessageId==='string'&&adoption.approval.userMessageId.trim()
    &&typeof adoption.approval.userText==='string'&&adoption.approval.userText.trim()
    &&typeof adoption.approval.sourceThreadId==='string'&&adoption.approval.sourceThreadId.trim(),
    'APPROVED_J16_EXPLICIT_ADOPTION_EVIDENCE_REQUIRED');
  const decisions=list(adoption.decisions);assert.equal(decisions.length,view.resolvedPlan.elements.length);
  for(const [index,row] of decisions.entries()) {
    visibilityExact(row,['instructionId','decision','reason'],'APPROVED_J16_DECISION_FIELDS');
    same({instructionId:row.instructionId,decision:row.decision},selection.entries[index]);
    assert(typeof row.reason==='string'&&row.reason.trim(),'APPROVED_J16_DECISION_REASON_REQUIRED');
  }
  same(adoption.counts,{totalCues:selection.counts.totalInstructions,visibleCues:selection.counts.shownInstructions,
    suppressedCues:selection.counts.suppressedInstructions});
  const normal=JSON.parse(source.planBytes),timeline=JSON.parse(source.timelineBytes);
  assert.equal(normal.elements.length,view.resolvedPlan.elements.length);
  assert.equal(expected.frames,view.projection.displayFrameCount,'APPROVED_J16_FULL_FRAME_CLOCK_CHANGED');
  assert.equal(expected.audioSamples,view.projection.displayPlaybackSampleCount,'APPROVED_J16_FULL_SAMPLE_CLOCK_CHANGED');
  assert.equal(expected.cues,normal.elements.length,'APPROVED_J16_ALL_LOGICAL_CUES_REQUIRED');
  assert.equal(expected.groups,timeline.segments.length,'APPROVED_J16_SOURCE_GROUPS_CHANGED');
  const atoms=normal.elements.flatMap((row:Json)=>row.targetProvenance?.sourceAtomIds??[]);
  assert(atoms.length>0&&new Set(atoms).size===atoms.length,'APPROVED_J16_SOURCE_ATOMS_REQUIRED');
  assert.equal(expected.atoms,atoms.length,'APPROVED_J16_ALL_LOGICAL_ATOMS_REQUIRED');
  return {status:'validated',logicalCueCount:normal.elements.length,visibilityCounts:clone(selection.counts)};
}

async function readApprovedJ16StaticInputsV001(qualified:ApprovedDigestQualifiedJobV001):Promise<ApprovedDigestInputsV001> {
  const {job,workspaceRoot:root}=qualified,specs=job.inputs,bindings=new Map<string,Json>();
  const read=async(b:Json)=>{const plain={path:b.path,fileSha256:b.fileSha256,
    ...(b.sizeBytes===undefined?{}:{sizeBytes:b.sizeBytes}),...(b.canonicalSha256===undefined?{}:{canonicalSha256:b.canonicalSha256})};
    const value=await qualified.readBinding(plain);bindings.set(JSON.stringify(plain),clone(plain));return value;};
  const manifest=await read(specs.candidateManifestBinding);
  const stage=await import('../../evals/clip_composition/presentation_j16_staged_boundary_v001.mjs');
  const closure=await stage.readJ16LiveCandidateClosureV001(path.dirname(path.join(root,specs.candidateManifestBinding.path)));
  same(manifest,closure.manifest);
  assert.equal(closure.manifestRef.sha256,specs.candidateManifestBinding.fileSha256);
  assert.equal(closure.manifestRef.bytes,specs.candidateManifestBinding.sizeBytes);
  const source=closure.source,view=closure.view;
  // References used for actual rendering must be the original repository files.
  for(const ref of [source.planRef,source.timelineRef,source.captionContext.decisionInputRef,
    source.captionContext.pulseTimingEvidence.candidatesRef,source.captionContext.pulseTimingEvidence.peaksRef]) {
    assert(ref.path.startsWith(root+'/'),'APPROVED_J16_ORIGINAL_SOURCE_ROOT_REQUIRED');
    const value=await read({path:safe(path.relative(root,ref.path)),fileSha256:ref.fileSha256});
    if(ref===source.planRef)same(value,JSON.parse(source.planBytes));
    if(ref===source.timelineRef)same(value,JSON.parse(source.timelineBytes));
  }
  const visibilitySelection=await read(specs.visibilitySelectionBinding),visibilityAdoption=await read(specs.visibilityAdoptionBinding);
  // The saved selection's original adoption is still read, even when the new
  // job binds a byte-identical current-input copy of that record.
  same(await read(visibilitySelection.adoptionBinding),visibilityAdoption);
  await validateApprovedJ16StaticInputV001({view,source,selection:visibilitySelection,adoption:visibilityAdoption,
    manifestBinding:specs.candidateManifestBinding,adoptionBinding:specs.visibilityAdoptionBinding,expected:job.expected});
  const typography=await read(specs.typographySettingsBinding),typographyValues=resolveDigestTypographySettingsV001(typography.settings??typography);
  const normalPlan=JSON.parse(source.planBytes);
  assert(normalPlan.elements.every((row:Json)=>row.visualState.textStyle.fontSizePx===typographyValues.fontSizePx),
    'APPROVED_J16_TYPOGRAPHY_CHANGED');
  const rendererTemplate=await read(specs.rendererTemplateBinding);
  const renderer=await load(root,'evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts');
  const admission=await load(root,'evals/clip_composition/presentation_renderer_admission_receipt_v002.mjs');
  assert.equal(admission.validatePresentationInstructionRendererJobV002(rendererTemplate).status,'passed','APPROVED_J16_RENDERER_TEMPLATE_INVALID');
  // Preserve the saved typed Core artifacts; no registration or clock-map is
  // invented to make this new input kind resemble the earlier Normal input.
  const coreValues=new Map<string,Json>();
  const walk=async(value:any):Promise<void>=>{
    if(!value||typeof value!=='object')return;
    if(typeof value.path==='string'&&value.path.endsWith('.json')&&/^[a-f0-9]{64}$/u.test(value.fileSha256??'')) {
      assert(!path.isAbsolute(value.path),'APPROVED_J16_CORE_RELATIVE_REFERENCE_REQUIRED');
      if(!coreValues.has(value.path)){const body=await read(value);coreValues.set(value.path,body);await walk(body);}return;
    }
    for(const item of Object.values(value))await walk(item);
  };
  await walk(rendererTemplate);
  const instruction=coreValues.get(rendererTemplate.instructionArtifactBinding.path);assert(instruction);
  const meaning=coreValues.get(instruction.sourceBindings.meaningInformationPackage.path);assert(meaning);
  assert.equal(instruction.instructions.length,normalPlan.elements.length);
  for(const [index,row] of list(instruction.instructions).entries()) {
    const element=normalPlan.elements[index];assert.equal(row.instructionId,element.instructionId);
    assert.equal(row.content.text,element.text);assert.equal(row.outputTime.startFrame,element.startFrame);
    assert.equal(row.outputTime.endFrameExclusive,element.endFrameExclusive);
    same(row.targetProvenance.atomOccurrenceIds,element.targetProvenance.sourceAtomIds);
  }
  await renderer.observePresentationRendererRuntimeBindingsV001(rendererTemplate.runtimeBindings);
  const wire=await load(root,'evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
  const value={kind:specs.kind,workspaceRoot:root,inputRoot:specs.inputRoot,inputPrefix:specs.inputPrefix,
    manifest,manifestBinding:clone(specs.candidateManifestBinding),j16Source:source,j16State:closure.state,j16View:view,
    normalPlan,rendererTemplate,visibilitySelection,visibilityAdoption,meaning,
    typographySettings:typography.settings??typography,typographyValues,typographySettingsBinding:clone(specs.typographySettingsBinding),
    authorizationBinding:clone(qualified.authorizationBinding),jobBinding:clone(qualified.jobBinding)};
  await closure.assertCurrent();await qualified.assertCurrent();freeze(value);
  qualifiedInputs.set(value,{qualified,bodySha256:sha(wire.formal(value)),bindings:[...bindings.values()],absoluteBindings:[]});
  j16Closures.set(value,closure);return value;
}
