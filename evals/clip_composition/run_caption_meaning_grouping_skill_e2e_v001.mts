import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline';
import {
  CAPTION_MEANING_GROUPING_SKILL_V001, assertCaptionMeaningGroupingInputV001,
  assertCaptionMeaningGroupingResultV001, runCaptionMeaningGroupingV001,
  type CaptionMeaningGroupingInputV001,
} from '../../runner/src/skills/caption-meaning-grouping-v001.js';
import {
  assertCaptionDisplayInputV001, assertCaptionDisplayResultV001, runCaptionDisplayBoundariesV001,
} from '../../runner/src/skills/caption-display-boundaries-v001.js';
import {buildDistantConnectionPresentationMeaningInputFromFilesV001 as rebuildMeaning}
  from '../../runner/src/distant-connection-presentation-meaning-input-v001.js';
import {loadCaptionDisplayContextV001, bind} from './run_caption_display_skill_e2e_v001.mts';
import {PRESENTATION_MEANING_BOUNDARY_TASK_DESCRIPTION_V001 as meaningQuestion}
  from './presentation_meaning_boundary_source_package_v001.mjs';
import {decodePresentationCaptionB1StrictJsonV001 as decodeTransportJson}
  from './presentation_caption_semantic_source_package_v001.mjs';
import {
  decodePresentationMeaningBoundaryResponseV001 as decodeMeaningAnswer,
  inspectPresentationMeaningBoundaryCandidateCoverageV001 as inspectCoverage,
  assertPresentationMeaningBoundaryAtomPostconditionV001 as assertAtomPreservation,
} from './presentation_meaning_boundary_selection_v001.mjs';
import {
  decodePresentationOutputFiniteJsonV001 as decode,
  serializePresentationOutputCropApplicationFormalJsonV001 as formal,
  canonicalSha256PresentationOutputFiniteJsonV001 as canonicalSha,
  sha256PresentationOutputCropApplicationBytesV001 as sha,
} from './presentation_output_crop_application_v001.mjs';
import {readPresentationMeaningWorkspaceFileStableV001 as stableRead}
  from './presentation_timeline_composition_decision_v001.mjs';
import {verifyPresentationFirstRealDataFileReferenceV001 as verifyFile}
  from './presentation_first_real_data_gate_v001.mjs';
import {validatePresentationOutputCaptionCueSourcePackageV001 as validateSource}
  from './presentation_output_caption_cue_source_package_v001.mjs';
import {
  buildPresentationCueEndProjectionV001 as cueProjection,
  buildPresentationCueEndProjectionBindingV001 as cueBinding,
  buildPresentationSemanticLineEndProjectionV001 as lineProjection,
  buildPresentationSemanticLineEndProjectionBindingV001 as lineBinding,
} from './presentation_cue_end_projection_v001.mjs';
import {
  buildPresentationCaptionInstructionArtifactV002 as instructionArtifact,
  buildPresentationInstructionArtifactBindingV002 as instructionBinding,
} from './presentation_instruction_artifact_v002.mjs';
import {buildPresentationRendererLineLayoutV002 as lineLayout}
  from './presentation_renderer_line_layout_rule_v002.mjs';
import {codePointWeightV001} from './presentation_renderer_text_layout_v001.mjs';
import {validatePresentationInstructionRendererJobV002 as validateRendererJob}
  from './presentation_renderer_admission_receipt_v002.mjs';
import {fileSha256V002 as fileSha} from './presentation_renderer_qc_v002.mjs';
import {
  runPresentationInstructionRendererJobFileV002 as render,
  resolvePresentationRendererAppearanceV001 as appearance,
} from './run_presentation_instruction_renderer_job_v002.ts';

type Json = Record<string, any>;
type Binding = {schemaVersion: string; path: string; fileSha256: string; canonicalSha256: string};
const SKILL_PATH = 'runner/src/skills/caption-meaning-grouping-v001.ts';
const EXECUTOR_PATH = 'evals/clip_composition/run_caption_meaning_grouping_skill_e2e_v001.mts';
const PATH = /^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*\\)(?!.*\/\/)[A-Za-z0-9._\-/]+$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const SHA = /^[0-9a-f]{64}$/u;
const clone = <T>(v: T): T => structuredClone(v);
const same = (a: unknown, b: unknown) => canonicalSha(a) === canonicalSha(b);
const object = (v: unknown): v is Json => v !== null && typeof v === 'object' && !Array.isArray(v);
const keys = (v: unknown, expected: string[]): v is Json => object(v)
  && Object.keys(v).length === expected.length && expected.every(k => Object.hasOwn(v, k));
const dense = (v: unknown): v is any[] => Array.isArray(v) && v.length > 0
  && Object.keys(v).length === v.length && Array.from({length: v.length}, (_, i) => Object.hasOwn(v, i)).every(Boolean);
function fail(code: string): never { throw new Error(`MEANING_SKILL_E2E: ${code}`); }
const pass = (v: Json, code: string) => {
  if (!['passed', 'built', 'resolved'].includes(v?.status)) fail(`${code}: ${JSON.stringify(v)}`);
  return v;
};
const MODE = 'current-codex-stdin-v001';
const policies = {meaning: 'validated-meaning-groups-for-review-v001', display: 'validated-display-groups-for-review-v001'};
const skillSequence = [
  {id: 'caption-meaning-grouping', version: 'v001', judgmentMode: MODE, apiCommunication: 'forbidden'},
  {id: 'caption-display-boundaries', version: 'v001', judgmentMode: MODE, apiCommunication: 'forbidden'},
];
function assertByteBinding(v: unknown): asserts v is {path: string; fileSha256: string} {
  if (!keys(v, ['path', 'fileSha256']) || !PATH.test(v.path) || !SHA.test(v.fileSha256)) fail('BINDING_INVALID');
}
function assertBinding(v: unknown): asserts v is Binding {
  if (!keys(v, ['schemaVersion', 'path', 'fileSha256', 'canonicalSha256']) || !ID.test(v.schemaVersion)
    || !PATH.test(v.path) || !SHA.test(v.fileSha256) || !SHA.test(v.canonicalSha256)) fail('BINDING_INVALID');
}
export function assertCaptionMeaningPlanV001(v: unknown): asserts v is Json {
  if (!keys(v, ['schemaVersion', 'planId', 'sourcePlanBinding', 'skills', 'adoptionPolicies',
    'displayOnlyVideo', 'implementationBindings', 'outputRoot'])
    || v.schemaVersion !== 'caption-meaning-grouping-skill-fixed-plan-v001'
    || !ID.test(v.planId) || !same(v.skills, skillSequence) || !same(v.adoptionPolicies, policies)
    || !PATH.test(v.outputRoot)
    || !v.outputRoot.startsWith('evals/clip_composition/outputs/presentation/work-caption-meaning-grouping-skill-')
    || !dense(v.implementationBindings) || v.implementationBindings.length !== 2) fail('PLAN_INVALID');
  assertBinding(v.sourcePlanBinding); assertByteBinding(v.displayOnlyVideo);
  for (const [i, expected] of [SKILL_PATH, EXECUTOR_PATH].entries()) {
    assertByteBinding(v.implementationBindings[i]);
    if (v.implementationBindings[i].path !== expected) fail('IMPLEMENTATION_PATH_INVALID');
  }
}
async function readJson(root: string, relative: string) {
  if (!PATH.test(relative)) fail('PATH_INVALID');
  const bytes = await stableRead({workspaceRoot: root, relativePath: relative});
  const decoded = decode(bytes);
  if (decoded.status !== 'decoded') fail('JSON_INVALID');
  return decoded.value as Json;
}
async function readBound(root: string, binding: Binding) {
  assertBinding(binding);
  const bytes = await stableRead({workspaceRoot: root, relativePath: binding.path});
  const value = decode(bytes);
  if (value.status !== 'decoded' || sha(bytes) !== binding.fileSha256
    || !same(bind(binding.path, value.value), binding)) fail('PROVENANCE_MISMATCH');
  return value.value as Json;
}

/** 既存5正本からの再構築まで検査する。Skillへは正式時刻を渡さない。 */
export async function loadCaptionMeaningContextV001(root: string, planPath: string) {
  if (path.resolve(root) !== path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')) fail('WORKSPACE_MISMATCH');
  const plan = await readJson(root, planPath); assertCaptionMeaningPlanV001(plan);
  const originalPlan = await readBound(root, plan.sourcePlanBinding);
  const origin = await loadCaptionDisplayContextV001(root, plan.sourcePlanBinding.path);
  if (!same(origin.plan, originalPlan)) fail('SOURCE_PLAN_CHANGED');
  await Promise.all([...plan.implementationBindings, plan.displayOnlyVideo].map(v => verifyFile(v)));
  const b = origin.meaning.sourceBindings;
  const rebuilt = await rebuildMeaning({workspaceRoot: root,
    artifactId: origin.meaning.artifactId, candidateId: origin.meaning.candidateId,
    candidateResponsePath: b.candidateResponse.path, expectedCandidateResponseSha256: b.candidateResponse.fileSha256,
    semanticUtterancePath: b.semanticUtterance.path, expectedSemanticUtteranceSha256: b.semanticUtterance.fileSha256,
    intervalizationPlanPath: b.intervalizationPlan.path, expectedIntervalizationPlanSha256: b.intervalizationPlan.fileSha256,
    editPlanProjectionPath: b.editPlanProjection.path, expectedEditPlanProjectionSha256: b.editPlanProjection.fileSha256,
    assemblyDecisionPath: b.assemblyDecision.path, expectedAssemblyDecisionSha256: b.assemblyDecision.fileSha256,
  });
  if (!same(rebuilt, origin.meaning)) fail('ORIGINAL_UTTERANCE_CLOSURE_MISMATCH');
  const context = {root, plan, planBinding: bind(planPath, plan), origin};
  assertCaptionMeaningGroupingInputV001(buildMeaningInput(context));
  return context;
}
export type CaptionMeaningContextV001 = Awaited<ReturnType<typeof loadCaptionMeaningContextV001>>;
type Context = CaptionMeaningContextV001;
const target = (c: Context, name: string) => `${c.plan.outputRoot}/${name}`;
const displayTraceName = (i: number) => `display-judgment-${String(i + 1).padStart(6, '0')}.json`;

function sourceRows(c: Context) {
  return c.origin.meaning.atomOccurrences.map((atom: Json, i: number) => ({
    atom, boundary: c.origin.sourcePackage.promptInput.captions[0].boundaryCandidates[i],
  }));
}
function buildMeaningInput(c: Context): CaptionMeaningGroupingInputV001 {
  const rows = sourceRows(c);
  return {schemaVersion: 'caption-meaning-grouping-skill-input-v001', taskDescription: meaningQuestion,
    containers: c.origin.meaning.orderedParts.map((part: Json) => {
      const members = part.atomOccurrenceIds.map((id: string) => rows.find((r: Json) => r.atom.atomOccurrenceId === id));
      if (members.some((r: Json) => !r)) fail('INPUT_ID_MISSING');
      return {containerId: members[0].atom.retainedSpans[0].timelineSegmentId,
        boundaryCandidates: members.map((r: Json) => ({boundaryCandidateId: r.boundary.boundaryId,
          utteranceIds: [r.atom.semanticUtteranceId], text: r.atom.text}))};
    })};
}
export function buildCaptionMeaningRequestV001(c: Context) {
  const input = buildMeaningInput(c); assertCaptionMeaningGroupingInputV001(input);
  return {schemaVersion: 'caption-meaning-grouping-judgment-request-v001', requestId: `${c.plan.planId}-meaning`,
    planBinding: clone(c.planBinding), mode: MODE, input, inputCanonicalSha256: canonicalSha(input)};
}
function assertResponse(request: Json, response: Json, result: Json) {
  if (!keys(response, ['schemaVersion', 'requestSha256', 'answer', 'judgmentNote'])
    || response.schemaVersion !== 'caption-meaning-e2e-local-response-v001'
    || response.requestSha256 !== sha(formal(request)) || typeof response.judgmentNote !== 'string'
    || !response.judgmentNote.length || !same(response.answer, result.answer)) fail('JUDGMENT_PROVENANCE_MISMATCH');
}
const meaningValidated = new WeakMap<object, {c: Context; adoption: Json; artifact: Json}>();
export type ValidatedMeaningV001 = Readonly<{status: 'meaning-validated-for-review'}>;
function ownedMeaning(c: Context, token: ValidatedMeaningV001) {
  const v = meaningValidated.get(token);
  if (!v || !same(v.c.planBinding, c.planBinding)) fail('VALIDATED_MEANING_REQUIRED');
  return v;
}

/** 生回答から正式値を取り出さず、検査済みの内部snapshotだけを昇格可能にする。 */
export function validateAndAdoptCaptionMeaningV001(c: Context, request: Json, response: Json,
  result: unknown): ValidatedMeaningV001 {
  assertCaptionMeaningPlanV001(c.plan); assertCaptionMeaningGroupingResultV001(result);
  if (!same(request, buildCaptionMeaningRequestV001(c))) fail('MEANING_INPUT_PROVENANCE_MISMATCH');
  assertResponse(request, response, result);
  const decoded = decodeMeaningAnswer(Buffer.from(JSON.stringify(result.answer), 'utf8'));
  if (decoded.status !== 'complete') fail('MEANING_ANSWER_REJECTED');
  const answer = decoded.response;
  const containers = request.input.containers;
  if (!same(answer.containers.map((v: Json) => v.containerId), containers.map((v: Json) => v.containerId))) {
    fail('MEANING_CONTAINER_MEMBERSHIP_ORDER');
  }
  const allRows = sourceRows(c);
  const groups: Json[] = [];
  for (const [ci, container] of containers.entries()) {
    let previous = -1;
    const ranges = [];
    for (const selected of answer.containers[ci].meaningGroups) {
      const end = container.boundaryCandidates.findIndex((v: Json) =>
        v.boundaryCandidateId === selected.meaningGroupEndBoundaryCandidateId);
      if (end < 0) fail('MEANING_BOUNDARY_MEMBERSHIP');
      if (end <= previous) fail('MEANING_BOUNDARY_ORDER');
      const candidates = container.boundaryCandidates.slice(previous + 1, end + 1);
      const rows = candidates.map((candidate: Json) => allRows.find((v: Json) => v.boundary.boundaryId === candidate.boundaryCandidateId));
      ranges.push({startOrdinal: previous + 1, endOrdinal: end});
      groups.push({groupId: `${c.plan.planId}-meaning-${String(groups.length + 1).padStart(6, '0')}`,
        ordinal: groups.length + 1, containerId: container.containerId,
        boundaryCandidateIds: candidates.map((v: Json) => v.boundaryCandidateId),
        utteranceIds: candidates.flatMap((v: Json) => v.utteranceIds),
        atomOccurrenceIds: rows.map((v: Json) => v.atom.atomOccurrenceId),
        text: candidates.map((v: Json) => v.text).join('')});
      previous = end;
    }
    pass(inspectCoverage({candidateCount: container.boundaryCandidates.length,
      selectedOrdinalRanges: ranges, containerIndex: ci}), 'MEANING_COVERAGE');
  }
  assertAtomPreservation(allRows.map((v: Json) => v.atom.atomOccurrenceId), groups.flatMap(v => v.atomOccurrenceIds));
  if (groups.map(v => v.text).join('') !== c.origin.meaning.captions[0].text) fail('MEANING_TEXT_CHANGED');
  const trace = {schemaVersion: 'caption-meaning-e2e-judgment-trace-v001', response: clone(response), result: clone(result)};
  const adoption = {schemaVersion: 'caption-meaning-grouping-adoption-v001', planBinding: clone(c.planBinding),
    requestBinding: bind(target(c, 'meaning-request.json'), request),
    judgmentBinding: bind(target(c, 'meaning-judgment.json'), trace),
    validation: {input: 'passed', output: 'passed', membership: 'passed', order: 'passed',
      fullCoverage: 'passed', originalText: 'passed', provenance: 'passed'},
    adoption: {policy: policies.meaning, purpose: 'human-review', humanQuality: 'not-evaluated'}};
  const artifact = {schemaVersion: 'caption-meaning-groups-adopted-v001', artifactId: `${c.plan.planId}-meaning-groups`,
    sourceMeaningBinding: clone(c.origin.plan.request.meaningInput),
    adoptionBinding: bind(target(c, 'meaning-adoption.json'), adoption), groups};
  const token = Object.freeze({status: 'meaning-validated-for-review' as const});
  meaningValidated.set(token, {c: clone(c), adoption: clone(adoption), artifact: clone(artifact)});
  return token;
}
export function promoteCaptionMeaningV001(token: ValidatedMeaningV001) {
  const v = meaningValidated.get(token); if (!v) fail('VALIDATED_MEANING_REQUIRED');
  return clone({adoption: v.adoption, artifact: v.artifact});
}

/** 第1 Skillのコードと入力schemaを無変更で使用する。各意味まとまりを独立して渡す。 */
export function buildGroupedDisplayRequestsV001(c: Context, token: ValidatedMeaningV001) {
  const {artifact} = ownedMeaning(c, token); const rows = sourceRows(c);
  return {schemaVersion: 'caption-meaning-e2e-display-requests-v001',
    meaningGroupsBinding: bind(target(c, 'meaning-groups.json'), artifact),
    requests: artifact.groups.map((group: Json) => {
      const input = clone(c.origin.sourcePackage.promptInput);
      input.captions = [{captionId: group.groupId, boundaryCandidates: group.boundaryCandidateIds.map((id: string) =>
        clone(rows.find((r: Json) => r.boundary.boundaryId === id)!.boundary))}];
      assertCaptionDisplayInputV001(input);
      return {schemaVersion: 'caption-meaning-e2e-display-judgment-request-v001',
        requestId: `${group.groupId}-display`, planBinding: clone(c.planBinding), mode: MODE,
        meaningGroupsBinding: bind(target(c, 'meaning-groups.json'), artifact), groupId: group.groupId,
        input, inputCanonicalSha256: canonicalSha(input)};
    })};
}
const displayValidated = new WeakMap<object, {c: Context; meaning: ValidatedMeaningV001; index: number; adoption: Json}>();
export type ValidatedGroupedDisplayV001 = Readonly<{status: 'display-group-validated-for-review'}>;
export function validateAndAdoptGroupedDisplayV001(c: Context, meaning: ValidatedMeaningV001,
  index: number, request: Json, response: Json, result: unknown): ValidatedGroupedDisplayV001 {
  const m = ownedMeaning(c, meaning); const requests = buildGroupedDisplayRequestsV001(c, meaning);
  if (!Number.isSafeInteger(index) || index < 0 || index >= requests.requests.length
    || !same(request, requests.requests[index])) fail('DISPLAY_INPUT_PROVENANCE_MISMATCH');
  assertCaptionDisplayResultV001(result); assertResponse(request, response, result);
  const answer = result.answer as Json;
  if (answer.status !== 'complete') fail('DISPLAY_ABSTAINED');
  if (answer.captions.length !== 1 || answer.captions[0].captionId !== request.groupId) fail('DISPLAY_GROUP_MEMBERSHIP');
  const candidates = request.input.captions[0].boundaryCandidates;
  const limits = request.input.styleLimits;
  let previous = -1;
  const ranges = [];
  for (const cue of answer.captions[0].cues) {
    const end = candidates.findIndex((v: Json) => v.boundaryId === cue.cueEndBoundaryId);
    if (end < 0) fail('DISPLAY_BOUNDARY_MEMBERSHIP');
    if (end <= previous) fail('DISPLAY_BOUNDARY_ORDER');
    if (cue.lineEndBoundaryIds.length > limits.maxLinesPerCue) fail('DISPLAY_LINE_COUNT');
    let lineStart = previous + 1;
    for (const boundary of cue.lineEndBoundaryIds) {
      const lineEnd = candidates.findIndex((v: Json) => v.boundaryId === boundary);
      if (lineEnd < lineStart || lineEnd > end) fail('DISPLAY_LINE_MEMBERSHIP_ORDER');
      const text = candidates.slice(lineStart, lineEnd + 1).map((v: Json) => v.text).join('');
      const width = [...text].reduce((sum, char) => sum + codePointWeightV001(char, limits.characterWidthRule), 0);
      if (width > limits.maxLogicalWidthPerLine) fail('DISPLAY_LINE_WIDTH');
      lineStart = lineEnd + 1;
    }
    if (lineStart !== end + 1) fail('DISPLAY_LINE_COVERAGE');
    const text = candidates.slice(previous + 1, end + 1).map((v: Json) => v.text).join('');
    const width = [...text].reduce((sum, char) => sum + codePointWeightV001(char, limits.characterWidthRule), 0);
    if (width <= limits.maxLogicalWidthPerLine && cue.lineEndBoundaryIds.length !== 1) fail('UNNECESSARY_LINE_BREAK');
    ranges.push({startOrdinal: previous + 1, endOrdinal: end}); previous = end;
  }
  pass(inspectCoverage({candidateCount: candidates.length, selectedOrdinalRanges: ranges, containerIndex: index}), 'DISPLAY_COVERAGE');
  const trace = {schemaVersion: 'caption-meaning-e2e-judgment-trace-v001', response: clone(response), result: clone(result)};
  const adoption = {schemaVersion: 'caption-meaning-e2e-display-group-adoption-v001', groupId: request.groupId,
    meaningGroupsBinding: bind(target(c, 'meaning-groups.json'), m.artifact),
    requestCollectionBinding: bind(target(c, 'display-requests.json'), requests), requestIndex: index,
    judgmentBinding: bind(target(c, displayTraceName(index)), trace),
    validation: {input: 'passed', output: 'passed', membership: 'passed', order: 'passed', fullCoverage: 'passed',
      logicalLayout: 'passed', provenance: 'passed'},
    adoption: {policy: policies.display, purpose: 'human-review', humanQuality: 'not-evaluated'},
    selection: clone(answer.captions[0])};
  const token = Object.freeze({status: 'display-group-validated-for-review' as const});
  displayValidated.set(token, {c: clone(c), meaning, index, adoption: clone(adoption)});
  return token;
}
export function promoteGroupedDisplayV001(token: ValidatedGroupedDisplayV001) {
  const v = displayValidated.get(token); if (!v) fail('VALIDATED_DISPLAY_REQUIRED');
  return clone(v.adoption);
}

/** 監査済み接続：意味境界・本文・表示を編集せず、検査済み列を元順に連結するだけ。 */
export function flattenValidatedCaptionDisplaysV001(c: Context, meaning: ValidatedMeaningV001,
  displays: ValidatedGroupedDisplayV001[]) {
  const m = ownedMeaning(c, meaning);
  if (!dense(displays) || displays.length !== m.artifact.groups.length) fail('DISPLAY_GROUP_COVERAGE');
  const entries = displays.map((token, index) => {
    const v = displayValidated.get(token);
    if (!v || v.meaning !== meaning || v.index !== index || !same(v.c.planBinding, c.planBinding)) {
      fail('VALIDATED_DISPLAY_ORDER_REQUIRED');
    }
    return clone(v.adoption);
  });
  const cues = entries.flatMap(v => clone(v.selection.cues));
  const rows = sourceRows(c); const mappings: Json[] = []; let previous = -1;
  entries.forEach((entry, gi) => entry.selection.cues.forEach((cue: Json, ci: number) => {
    const end = rows.findIndex((v: Json) => v.boundary.boundaryId === cue.cueEndBoundaryId);
    const selected = rows.slice(previous + 1, end + 1);
    const group = m.artifact.groups[gi];
    if (end <= previous || selected.some((v: Json) => !group.atomOccurrenceIds.includes(v.atom.atomOccurrenceId))) {
      fail('FLATTEN_GROUP_MEMBERSHIP');
    }
    mappings.push({displayOrdinal: mappings.length + 1, groupId: group.groupId, groupDisplayOrdinal: ci + 1,
      cueEndBoundaryId: cue.cueEndBoundaryId, lineEndBoundaryIds: clone(cue.lineEndBoundaryIds),
      atomOccurrenceIds: selected.map((v: Json) => v.atom.atomOccurrenceId)});
    previous = end;
  }));
  assertAtomPreservation(rows.map((v: Json) => v.atom.atomOccurrenceId), mappings.flatMap(v => v.atomOccurrenceIds));
  return {displayAdoptions: {schemaVersion: 'caption-meaning-e2e-display-adoptions-v001',
    meaningGroupsBinding: bind(target(c, 'meaning-groups.json'), m.artifact), entries},
    captions: [{captionId: c.origin.sourcePackage.promptInput.captions[0].captionId, cues}], mappings};
}

/** 意味/表示の両採用tokenが必要。時刻・幅・注文書・描画設定は既存Coreの関数で解決する。 */
export function promoteCaptionMeaningCoreV001(c: Context, meaning: ValidatedMeaningV001,
  displays: ValidatedGroupedDisplayV001[]) {
  const m = ownedMeaning(c, meaning); const f = flattenValidatedCaptionDisplaysV001(c, meaning, displays);
  const original = c.origin; const request = original.plan.request;
  const adoption = {schemaVersion: 'caption-meaning-e2e-core-adoption-v001', planBinding: clone(c.planBinding),
    meaningGroupsBinding: bind(target(c, 'meaning-groups.json'), m.artifact),
    displayAdoptionsBinding: bind(target(c, 'display-adoptions.json'), f.displayAdoptions),
    flattenPolicy: 'preserve-validated-display-order-without-editing-v001',
    validation: {groupMembership: 'passed', fullCoverage: 'passed', originalOrder: 'passed',
      unmodifiedDisplays: 'passed', originalText: 'passed'}, mappings: f.mappings};
  const producer = bind(target(c, 'core-adoption.json'), adoption);
  const sourcePackage = clone(original.sourcePackage);
  sourcePackage.packageId = `${c.plan.planId}-source-package`;
  sourcePackage.provenance = {sourcePackageJobBinding: clone(c.planBinding),
    implementationBindings: [
      ...original.plan.implementationBindings.map((v: Json, i: number) => ({
        role: i === 0 ? 'caption-display-skill-v001' : 'fixed-source-context-v001', ...v})),
      ...c.plan.implementationBindings.map((v: Json, i: number) => ({
        role: i === 0 ? 'caption-meaning-grouping-skill-v001' : 'caption-meaning-e2e-executor-v001', ...v})),
    ], approvedContractBindings: [clone(request.meaningInput)]};
  pass(validateSource(sourcePackage), 'CORE_SOURCE_INVALID');
  const sb = bind(target(c, 'source-package.json'), sourcePackage);
  const selection = {schemaVersion: 'presentation-output-caption-cue-selection-v001',
    selectionId: `${c.plan.planId}-selection`, sourcePackageBinding: sb, response: {captions: f.captions}};
  const selected = bind(target(c, 'selection.json'), selection);
  const digest = {schemaVersion: selection.schemaVersion, artifactId: selection.selectionId,
    fileSha256: selected.fileSha256, canonicalSha256: selected.canonicalSha256};
  const cue = pass(cueProjection({projectionId: `${c.plan.planId}-cue-end`, sourcePackageBinding: sb,
    sourceSelectionDigest: digest, producerJobBinding: producer, sourcePackage, selection}), 'CORE_CUE_INVALID').projection;
  const cb = cueBinding({path: target(c, 'cue-end-projection.json'), projection: cue});
  const line = pass(lineProjection({projectionId: `${c.plan.planId}-line-end`, sourcePackageBinding: sb,
    cueEndProjectionBinding: cb, sourceSelectionDigest: digest, producerJobBinding: producer,
    sourcePackage, selection, cueEndProjection: cue}), 'CORE_LINE_INVALID').projection;
  const lb = lineBinding({path: target(c, 'line-end-projection.json'), projection: line});
  const instruction = pass(instructionArtifact({artifactId: `${c.plan.planId}-instruction`,
    sourceCaseId: request.caseId, meaningInformationPackageBinding: request.meaningInput,
    timelineBinding: request.baseMedia.timeline, cueEndProjectionBinding: cb, producerJobBinding: producer,
    styleProfileId: sourcePackage.reconstructionMap.caseContexts[0].resolvedStyle.presetId,
    meaningPackage: original.meaning, timeline: original.timeline, cueEndProjection: cue}), 'CORE_INSTRUCTION_INVALID').artifact;
  const ib = instructionBinding({path: target(c, 'instruction.json'), artifact: instruction});
  const resolved = pass(appearance({instructionArtifact: instruction, styleProfileRegistry: original.style,
    visualStateId: original.rendererTemplate.executionInputs.visualStateId}), 'CORE_STYLE_INVALID');
  const width = resolved.profile.maxLogicalWidth ?? resolved.visualState.layout?.maxCharsPerLine;
  const maxLines = resolved.profile.maxLines ?? resolved.visualState.layout?.maxLines;
  const limits = sourcePackage.promptInput.styleLimits;
  if (limits.maxLogicalWidthPerLine !== width || limits.maxLinesPerCue !== maxLines
    || limits.characterWidthRule !== original.trust.layoutRules.characterWidthRule) fail('CORE_STYLE_MISMATCH');
  pass(lineLayout({layoutId: `${c.plan.planId}-validation-layout`, instructionArtifactBinding: ib,
    instructionArtifact: instruction, meaningPackage: original.meaning, lineEndProjection: line,
    lineEndSourcePackage: sourcePackage, maxLogicalWidth: width, maxLines,
    characterWidthRule: limits.characterWidthRule,
    lineLayoutRules: original.rendererTemplate.executionInputs.lineLayoutRules}), 'CORE_LAYOUT_INVALID');
  // Coreの正式命令と意味まとまりの所属も同じatom列で閉じる。
  assertAtomPreservation(f.mappings.map(v => v.atomOccurrenceIds),
    instruction.instructions.map((v: Json) => v.targetProvenance.atomOccurrenceIds));
  const rendererJob = clone(original.rendererTemplate);
  rendererJob.jobId = `${c.plan.planId}-renderer`; rendererJob.attemptId = c.plan.planId;
  rendererJob.instructionArtifactBinding = ib; rendererJob.lineEndProjectionBinding = lb;
  rendererJob.cropAppliedBaseMedia = {baseMedia: request.baseMedia.media, timeline: request.baseMedia.timeline,
    generationManifest: request.baseMedia.generationManifest, validationReceipt: request.baseMedia.validationReceipt};
  rendererJob.publication = {admissionReceiptPath: target(c, 'admission-receipt.json'),
    lineLayoutPath: target(c, 'line-layout.json'), renderOutputRoot: target(c, 'render')};
  pass(validateRendererJob(rendererJob), 'CORE_RENDERER_JOB_INVALID');
  return {adoption, displayAdoptions: f.displayAdoptions, sourcePackage, selection,
    cueEndProjection: cue, lineEndProjection: line, instruction, rendererJob};
}

const CORE_FILES = {sourcePackage: 'source-package.json', selection: 'selection.json',
  cueEndProjection: 'cue-end-projection.json', lineEndProjection: 'line-end-projection.json',
  instruction: 'instruction.json', rendererJob: 'renderer-job.json'};
async function publish(root: string, relative: string, value: Json) {
  const bytes = formal(value); await writeFile(path.join(root, relative), bytes, {flag: 'wx'});
  const saved = await stableRead({workspaceRoot: root, relativePath: relative});
  if (!bytes.equals(saved)) fail('PUBLICATION_MISMATCH');
  return bind(relative, value);
}
export function decodeCaptionMeaningTransportResponseV001(line: string): Json {
  // 標準入力は1行JSON。正式保存byteの検査はpublish/readBoundで別に行う。
  const decoded = decodeTransportJson(Buffer.from(line, 'utf8'));
  if (decoded.status !== 'decoded' || !object(decoded.value)) fail('JUDGMENT_ENVELOPE_INVALID');
  // Strict parserのnull prototypeを既存の正式serializerが受け取る通常のJSON objectへ写す。
  return clone(decoded.value);
}
async function judgeThroughStdin(request: Json): Promise<Json> {
  process.stdout.write(`${JSON.stringify({event: 'caption-meaning-e2e-judgment-required',
    requestSha256: sha(formal(request)), request})}\n`);
  const lines = createInterface({input: process.stdin, crlfDelay: Infinity, terminal: false});
  try {
    for await (const line of lines) {
      return decodeCaptionMeaningTransportResponseV001(line);
    }
    return fail('JUDGMENT_INPUT_CLOSED');
  } finally { lines.close(); }
}

export async function executeCaptionMeaningE2EV001(root: string, planPath: string) {
  const c = await loadCaptionMeaningContextV001(root, planPath);
  await mkdir(path.join(root, c.plan.outputRoot));
  let stage = 'meaning';
  try {
    await publish(root, target(c, 'plan-snapshot.json'), c.plan);
    const request = buildCaptionMeaningRequestV001(c);
    const requestBinding = await publish(root, target(c, 'meaning-request.json'), request);
    let response: Json | undefined;
    const result = await runCaptionMeaningGroupingV001(request.input, async input => {
      if (!same(input, request.input)) fail('SKILL_INPUT_CHANGED');
      response = await judgeThroughStdin(request); return response.answer;
    });
    const judgment = await publish(root, target(c, 'meaning-judgment.json'), {
      schemaVersion: 'caption-meaning-e2e-judgment-trace-v001', response, result});
    const token = validateAndAdoptCaptionMeaningV001(c, request, response!, result);
    const promoted = promoteCaptionMeaningV001(token);
    const ma = await publish(root, target(c, 'meaning-adoption.json'), promoted.adoption);
    const mg = await publish(root, target(c, 'meaning-groups.json'), promoted.artifact);
    const requests = buildGroupedDisplayRequestsV001(c, token);
    const requestsBinding = await publish(root, target(c, 'display-requests.json'), requests);
    const displays: ValidatedGroupedDisplayV001[] = []; const judgments: Binding[] = [];
    for (const [i, displayRequest] of requests.requests.entries()) {
      stage = `display-${i + 1}`;
      let displayResponse: Json | undefined;
      const displayResult = await runCaptionDisplayBoundariesV001(displayRequest.input, async input => {
        if (!same(input, displayRequest.input)) fail('SKILL_INPUT_CHANGED');
        displayResponse = await judgeThroughStdin(displayRequest); return displayResponse.answer;
      });
      judgments.push(await publish(root, target(c, displayTraceName(i)), {
        schemaVersion: 'caption-meaning-e2e-judgment-trace-v001', response: displayResponse, result: displayResult}));
      displays.push(validateAndAdoptGroupedDisplayV001(c, token, i, displayRequest, displayResponse!, displayResult));
    }
    stage = 'core';
    const current = await loadCaptionMeaningContextV001(root, planPath);
    if (!same(c.planBinding, current.planBinding)) fail('PLAN_CHANGED_DURING_JUDGMENT');
    const core = promoteCaptionMeaningCoreV001(current, token, displays);
    const da = await publish(root, target(c, 'display-adoptions.json'), core.displayAdoptions);
    const ca = await publish(root, target(c, 'core-adoption.json'), core.adoption);
    const artifacts: Json = {};
    for (const [name, filename] of Object.entries(CORE_FILES)) {
      artifacts[name] = await publish(root, target(c, filename), core[name as keyof typeof core]);
    }
    stage = 'renderer';
    const outcome = await render(artifacts.rendererJob.path, {workspaceRoot: root});
    const execution = await publish(root, target(c, 'renderer-result.json'), {
      schemaVersion: 'caption-meaning-e2e-renderer-execution-v001', rendererJobBinding: artifacts.rendererJob,
      exitCode: outcome.exitCode, result: outcome.result});
    if (outcome.exitCode !== 0 || outcome.result?.status !== 'completed' || outcome.result?.qc?.status !== 'passed') fail('RENDER_OR_QC_FAILED');
    const videoPath = target(c, 'render/presentation-rendered-v002.mp4');
    const manifest = {schemaVersion: 'caption-meaning-grouping-skill-e2e-manifest-v001', status: 'review-ready',
      planBinding: c.planBinding,
      meaning: {request: requestBinding, judgment, adoption: ma, groups: mg},
      display: {requests: requestsBinding, judgments, adoptions: da, reusedSkillBinding: c.origin.plan.implementationBindings[0]},
      core: {adoption: ca, ...artifacts},
      renderer: {execution, admission: bind(target(c, 'admission-receipt.json'), await readJson(root, target(c, 'admission-receipt.json'))),
        lineLayout: bind(target(c, 'line-layout.json'), await readJson(root, target(c, 'line-layout.json'))),
        qc: 'passed', video: {path: videoPath, fileSha256: await fileSha(path.join(root, videoPath))}},
      comparison: {beforeSkills: c.origin.plan.request.baselineVideo, displayOnly: c.plan.displayOnlyVideo,
        original: c.origin.plan.request.sourceVideo, sourceIntervals: c.origin.meaning.orderedParts.map((v: Json) => v.sourceInterval),
        humanDecision: 'pending'},
      limits: {meaningJudgments: 1, displayJudgments: displays.length, apiCommunication: 'none', newMaterial: 'none', humanQuality: 'not-evaluated'}};
    await publish(root, target(c, 'manifest.json'), manifest); return manifest;
  } catch (error) {
    await publish(root, target(c, 'failure.json'), {schemaVersion: 'caption-meaning-e2e-failure-v001',
      stage, message: error instanceof Error ? error.message : String(error)});
    throw error;
  }
}

/** 実呼出は増やさず、保存済みの同一採用回答から全正式byteを再構築する。 */
export async function verifyCaptionMeaningE2EV001(root: string, manifestPath: string) {
  const m = await readJson(root, manifestPath);
  if (m.schemaVersion !== 'caption-meaning-grouping-skill-e2e-manifest-v001' || m.status !== 'review-ready') fail('MANIFEST_INVALID');
  await readBound(root, m.planBinding);
  const c = await loadCaptionMeaningContextV001(root, m.planBinding.path);
  if (!same(m.planBinding, c.planBinding)) fail('MANIFEST_PLAN_MISMATCH');
  const request = await readBound(root, m.meaning.request);
  const judgment = await readBound(root, m.meaning.judgment);
  const token = validateAndAdoptCaptionMeaningV001(c, request, judgment.response, judgment.result);
  const promoted = promoteCaptionMeaningV001(token);
  if (!same(promoted.adoption, await readBound(root, m.meaning.adoption))
    || !same(promoted.artifact, await readBound(root, m.meaning.groups))) fail('MEANING_PROMOTION_MISMATCH');
  const requests = buildGroupedDisplayRequestsV001(c, token);
  if (!same(requests, await readBound(root, m.display.requests)) || !dense(m.display.judgments)
    || m.display.judgments.length !== requests.requests.length
    || !same(m.display.reusedSkillBinding, c.origin.plan.implementationBindings[0])) fail('DISPLAY_REQUESTS_MISMATCH');
  const displays: ValidatedGroupedDisplayV001[] = [];
  for (const [i, r] of requests.requests.entries()) {
    const trace = await readBound(root, m.display.judgments[i]);
    displays.push(validateAndAdoptGroupedDisplayV001(c, token, i, r, trace.response, trace.result));
  }
  const core = promoteCaptionMeaningCoreV001(c, token, displays);
  if (!same(core.displayAdoptions, await readBound(root, m.display.adoptions))
    || !same(core.adoption, await readBound(root, m.core.adoption))) fail('CORE_ADOPTION_MISMATCH');
  for (const name of Object.keys(CORE_FILES)) {
    if (!same(core[name as keyof typeof core], await readBound(root, m.core[name]))) fail('CORE_PROMOTION_MISMATCH');
  }
  const execution = await readBound(root, m.renderer.execution);
  if (execution.exitCode !== 0 || execution.result?.status !== 'completed' || execution.result?.qc?.status !== 'passed'
    || !same(execution.rendererJobBinding, m.core.rendererJob) || m.renderer.qc !== 'passed'
    || m.renderer.video.path !== target(c, 'render/presentation-rendered-v002.mp4')) fail('QC_MISMATCH');
  await readBound(root, m.renderer.admission); await readBound(root, m.renderer.lineLayout);
  const comparison = {beforeSkills: c.origin.plan.request.baselineVideo, displayOnly: c.plan.displayOnlyVideo,
    original: c.origin.plan.request.sourceVideo, sourceIntervals: c.origin.meaning.orderedParts.map((v: Json) => v.sourceInterval),
    humanDecision: 'pending'};
  if (!same(m.comparison, comparison) || !same(m.limits, {meaningJudgments: 1, displayJudgments: displays.length,
    apiCommunication: 'none', newMaterial: 'none', humanQuality: 'not-evaluated'})) fail('COMPARISON_MISMATCH');
  await verifyFile(m.renderer.video);
  return {status: 'passed', deterministicPromotion: 'exact', meaningGroups: displays.length,
    displayCount: core.instruction.instructions.length, video: m.renderer.video, humanQuality: 'pending'};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, file] = process.argv.slice(2);
  const task = action === 'run' ? executeCaptionMeaningE2EV001(process.cwd(), file)
    : action === 'verify' ? verifyCaptionMeaningE2EV001(process.cwd(), file)
      : action === 'preflight' ? loadCaptionMeaningContextV001(process.cwd(), file).then(c => ({
        status: 'passed', plan: c.planBinding, inputCanonicalSha256: canonicalSha(buildMeaningInput(c)),
      })) : Promise.reject(new Error('action: preflight | run | verify'));
  task.then(result => process.stdout.write(`${JSON.stringify(result)}\n`)).catch(error => {
    process.stderr.write(`${error.stack ?? error}\n`); process.exitCode = 1;
  });
}
