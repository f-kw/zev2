/** Saved normal inputs plus an independently qualified, one-job manufacturing grant. */
import assert from 'node:assert/strict';
import {readFile, lstat, realpath} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readPreparedDigestCaptionJudgmentInputsV001} from './digest-caption-input-preparation-v001.js';
import {assertQualifiedDigestApprovedJobV001} from './digest-approved-job-v001.js';
import {resolveDigestTypographySettingsV001} from './digest-formal-handoff-v001.js';
import {assertDigestCaptionDisplayAdjustmentV001} from './digest-caption-display-adjustment-v001.js';

type Json = Record<string, any>;
export type ApprovedDigestQualifiedJobV001 = {
  job: Json; authorization: Json; jobBinding: Json; authorizationBinding: Json; workspaceRoot: string;
  readBinding: (binding: any) => Promise<Json>; assertCurrent: () => Promise<void>;
};
export type ApprovedDigestInputsV001 = Json;
type InputRecord = {qualified: ApprovedDigestQualifiedJobV001; bodySha256: string; bindings: Json[]};
type SourceRecord = {inputs: Json; qualified: ApprovedDigestQualifiedJobV001; context: Json; bodySha256: string};
const qualifiedInputs = new WeakMap<object, InputRecord>();
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
  await qualified.assertCurrent();
}

/** Every source owner comes from the saved normal preparation, never a caller's handoff summary. */
export async function readApprovedDigestInputsV001(qualified: ApprovedDigestQualifiedJobV001): Promise<ApprovedDigestInputsV001> {
  await assertQualifiedDigestApprovedJobV001(qualified);
  const root = await realpath(qualified.workspaceRoot), job = qualified.job, specs = object(job.inputs);
  const observed = new Map<string, Json>();
  const read = async (binding: Json) => {const value = await qualified.readBinding(binding);
    observed.set(JSON.stringify(binding), clone(binding)); return value;};
  const params = clone(object(specs.preparationParameters));
  assert.equal(await realpath(params.workspaceRoot), root, 'APPROVED_DIGEST_PREPARATION_ROOT_CHANGED');
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
    return {...binding, path: safe(found.physicalPath), bytesVerified: found.bytesVerified};
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
  assert(['digest-approved-caption-bundle-v001', 'digest-caption-216px-reflow-candidate-bundle-v001', 'digest-caption-144px-reflow-candidate-bundle-v001', 'digest-caption-display-adjustment-candidate-bundle-v001'].includes(manifest.schemaVersion), 'APPROVED_DIGEST_CANDIDATE_SCHEMA_UNSUPPORTED');
  const originalMeaning = await read(object(manifest.meaningBinding)); same(originalMeaning, prepared.meaning);
  let meaning = originalMeaning, displayAdjustment: Json | undefined;
  const meaningOutput = preparation.outputs.find((binding: Json) => binding.fileName === 'meaning-input.json'); assert(meaningOutput);
  assert.equal(manifest.meaningBinding.path, meaningOutput.path); assert.equal(manifest.meaningBinding.fileSha256, meaningOutput.fileSha256);
  const map = await read(object(manifest.mapBinding));
  same(map.originalClockBinding, normalExecution.clockResolutionBinding); same(map.originalMappings, clock.mappings);
  same(manifest.originalClockBinding ?? map.originalClockBinding, normalExecution.clockResolutionBinding);
  assert.equal(inspection.media.source.video.frameRate, map.sourceFrameClock.inputFrameRate);
  assert.equal(inspection.media.decodedFrameCount, map.sourceFrameClock.decodedFrameCount);
  assert.equal(inspection.media.source.video.presentationOffsetMs, map.sourceFrameClock.videoPresentationOffsetMs);
  // An adjusted display clock is an explicit, byte-bound input. Original normal/STT inputs remain exact.
  if (manifest.schemaVersion === 'digest-caption-display-adjustment-candidate-bundle-v001') {
    const helperPath = 'runner/src/digest-caption-display-adjustment-v001.ts';
    const helperBindings = list(job.implementation.bindings).filter(binding => binding.path === helperPath);
    assert.equal(helperBindings.length, 1, 'APPROVED_DIGEST_DISPLAY_HELPER_BINDING_REQUIRED');
    const helperBytes = await readFile(path.join(root, helperPath));
    assert.equal(sha(helperBytes), helperBindings[0].fileSha256, 'APPROVED_DIGEST_DISPLAY_HELPER_SHA_CHANGED');
    const originalCandidateManifestBinding = object(manifest.originalCandidateManifestBinding);
    const originalManifest = await read(originalCandidateManifestBinding);
    assert(['digest-approved-caption-bundle-v001', 'digest-caption-216px-reflow-candidate-bundle-v001',
      'digest-caption-144px-reflow-candidate-bundle-v001'].includes(originalManifest.schemaVersion), 'APPROVED_DIGEST_DISPLAY_ORIGINAL_SCHEMA_REQUIRED');
    same(originalManifest.meaningBinding, manifest.meaningBinding);
    same(originalManifest.preparationManifestBinding, specs.preparationManifestBinding);
    const originalCorrespondence = await read(object(originalManifest.correspondenceBinding));
    const originalMap = await read(object(originalManifest.mapBinding));
    same(originalMap.originalMappings, mappings); same(originalMap.sourceFrameClock, map.sourceFrameClock);
    same(originalMap.originalClockBinding, normalExecution.clockResolutionBinding);
    displayAdjustment = await read(object(manifest.displayAdjustmentBinding));
    const bindings = {originalMeaningBinding: manifest.meaningBinding, originalCandidateManifestBinding,
      originalCorrespondenceBinding: originalManifest.correspondenceBinding, originalClockBinding: normalExecution.clockResolutionBinding};
    same(displayAdjustment.bindings, bindings);
    meaning = await read(object(manifest.displayMeaningBinding));
    const candidateCorrespondence = await read(object(manifest.correspondenceBinding));
    await assertDigestCaptionDisplayAdjustmentV001({originalMeaning, originalRows: list(originalCorrespondence.rows), mappings,
      sourceFrameClock: map.sourceFrameClock, declaredChanges: displayAdjustment.declaredChanges, bindings,
      derivedMeaning: meaning, candidateRows: list(candidateCorrespondence.rows), adoption: displayAdjustment});
  } else {
    for (const field of ['originalCandidateManifestBinding', 'displayMeaningBinding', 'displayAdjustmentBinding'])
      assert.equal(manifest[field], undefined, 'APPROVED_DIGEST_UNDECLARED_DISPLAY_ADJUSTMENT');
  }
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
  const value = {workspaceRoot: root, manifestBinding: clone(specs.candidateManifestBinding), manifest, preparation,
    preparationManifestBinding: clone(specs.preparationManifestBinding), meaning, requests, responses, results, traces, correspondence,
    ...(displayAdjustment === undefined ? {} : {originalMeaning, displayAdjustment}),
    normalState, normalPlan, normalExecution, normalPreparation, adoption, edit, manufacturing, inspection, clock, styleTemplate, rendererTemplate,
    sourcePhysicalPath: sourcePhysicalBinding.path, sourcePhysicalBinding, sourceLogicalBinding: normalPlan.sourceVideoBinding,
    normalOwners, normalReferenceMap: clone(preparation.logicalToPhysical), sourceDeclaration, aggregateView, candidateRules: rules,
    typographySettings: typography.settings, typographyValues, typographySettingsBinding: clone(specs.typographySettingsBinding),
    authorizationBinding: clone(qualified.authorizationBinding), jobBinding: clone(qualified.jobBinding)};
  await qualified.assertCurrent(); freeze(value); qualifiedInputs.set(value, {qualified, bodySha256: sha(wire.formal(value)), bindings: [...observed.values()]}); return value;
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
      ...(inputs.displayAdjustment === undefined ? [] : [inputs.manifest.originalCandidateManifestBinding,
        inputs.manifest.displayMeaningBinding, inputs.manifest.displayAdjustmentBinding])]};
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

export async function prepareApprovedDigestCaptionCoreV001(inputs: Json, qualified: ApprovedDigestQualifiedJobV001,
  c: Json, base: Json, style: Json, context: Json) {
  const sourcePackage = await buildApprovedDigestSourcePackageV001(inputs, qualified, c, base, style, context);
  const core = await load(qualified.workspaceRoot, 'evals/clip_composition/adopted_media_manufacturing_v001.mts');
  const adoption = {schemaVersion: 'digest-approved-caption-adoption-v001', artifactId: qualified.job.planId + '-caption-adoption',
    acceptedManifestBinding: inputs.manifestBinding, originalMeaningBinding: inputs.manifest.meaningBinding,
    authorizationBinding: qualified.authorizationBinding, approvedJobBinding: qualified.jobBinding,
    originalRequests: inputs.manifest.responses, traces: inputs.traces, aggregateViewOnly: true, judgmentCount: 0,
    humanQuality: 'not-evaluated', outlineChoice: null,
    ...(inputs.displayAdjustment === undefined ? {} : {displayMeaningBinding: inputs.manifest.displayMeaningBinding,
      displayAdjustmentBinding: inputs.manifest.displayAdjustmentBinding, timingInterpretation: inputs.displayAdjustment.timingInterpretation})};
  return core.assembleAdoptedCaptionCoreV001(c, {meaning: inputs.meaning, sourcePackage}, base, adoption, inputs.traces, context);
}
