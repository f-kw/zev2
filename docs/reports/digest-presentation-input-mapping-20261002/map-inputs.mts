// 設営18: 小JSONだけを読む一回の対応記録。製品consumer・判断・媒体は呼ばない。
// repo rootで: node --input-type=module < docs/reports/digest-presentation-input-mapping-20261002/map-inputs.mts
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root = process.cwd();
const {digestArtifactFileNameV001, digestArtifactPathFromUriV001, digestProducerRequestIdsV001} =
  await import(pathToFileURL(path.join(root, 'packages/shared/dist/index.js')).href);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const formal = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const prior = 'runtime/artifacts/request-intent-real-judgment-20261002-v001/attempt-001';
const report = 'docs/reports/digest-presentation-input-mapping-20261002/mapping.json';
const diagnosticRoot = 'runtime/artifacts/digest-presentation-input-mapping-20261002-v001/attempt-001';
const startedAt = new Date().toISOString();
const stateBytes = await readFile(path.join(root, prior, 'state.json'));
assert.equal(sha(stateBytes), 'c62e3b38d00c8222f0918b52704e579f87a14346217fada6c9cd754fc6fccf3c');
const state = JSON.parse(stateBytes.toString());
const request = state.agentRequests.find(r => r.id === 'agent_wGiuVx5QiJvjGUxEW8Qxa');
assert.equal(request.status, 'succeeded');
const producers = digestProducerRequestIdsV001(state, request);
const physical = logical => path.join(prior, 'artifacts', request.requestDraftId,
  digestArtifactFileNameV001(logical, request.requestDraftId, producers));
const refs = [];
const readJson = async (filePath, expectedSha256, logicalPath = null) => {
  assert.equal(path.extname(filePath), '.json', 'Only JSON inputs may be opened');
  const bytes = await readFile(path.join(root, filePath));
  const digest = sha(bytes);
  if (expectedSha256) assert.equal(digest, expectedSha256, filePath);
  const value = JSON.parse(bytes.toString());
  const reference = {path: filePath, fileSha256: digest, byteSize: bytes.length,
    logicalPath, schemaVersion: value.schemaVersion ?? null};
  refs.push(reference);
  return {value, reference};
};
const fileRef = state.fileRefs.find(f => f.id === request.result.fileRefId);
const logical = digestArtifactPathFromUriV001(fileRef.uri, request.requestDraftId, request.id);
const {value: execution, reference: executionRef} = await readJson(physical(logical), fileRef.sha256, logical);
assert.equal(executionRef.fileSha256, '735d6763afe6fcfabeb4c103871ee3a65368b96c9fa9df1a01f37717ace08f37');
const readBinding = binding => readJson(physical(binding.path), binding.fileSha256, binding.path);
const byName = name => {
  const found = execution.dataBindings.filter(b => path.basename(b.path) === name);
  assert.equal(found.length, 1, name);
  return found[0];
};
const loaded = {};
for (const name of ['digest-plan.json', 'retention-validation.json', 'machine-adoption.json', 'edit-plan.json',
  'clock-resolution.json', 'transcript.json', 'utterances.json', 'selection-plan.json', 'binding-input.json',
  'production-intent.json', 'source-inspection.json', 'consumption-binding.json', 'manufacturing-values.json']) {
  loaded[name] = (await readBinding(byName(name))).value;
}
assert.equal(byName('digest-plan.json').fileSha256,
  'cd69dd7fccfab6b4d0f266e6dddf56d5eae4c670283cd7caf467b9fde2925ee3');
const retention = loaded['retention-validation.json'];
const adoption = loaded['machine-adoption.json'];
const edit = loaded['edit-plan.json'];
const clock = loaded['clock-resolution.json'];
const transcript = loaded['transcript.json'];
const utterances = loaded['utterances.json'];
const authorization = loaded['binding-input.json'];
const selection = loaded['selection-plan.json'];
const intent = loaded['production-intent.json'];
assert.equal(intent.productionIntent, authorization.identity.approvedDraft.purpose);
assert.equal(selection.request.purpose, intent.productionIntent);
const draft = state.requestDrafts.find(d => d.id === request.requestDraftId);
assert.equal(draft.purpose, intent.productionIntent);
assert.equal(clock.status, 'passed');
assert.equal(edit.segments.length, 9);
assert.equal(clock.mappings.length, 9);
assert.equal(adoption.selectedCandidates.length, 9);
assert.equal(retention.segments.length, 9);
const raw = new Map(transcript.segments.map(s => [s.id, s]));
assert.equal(raw.size, transcript.segments.length);
const utteranceFor = new Map();
for (const u of utterances.utterances) for (const id of u.sourceSegmentIds) {
  assert(!utteranceFor.has(id)); utteranceFor.set(id, u.utteranceId);
}
const partition = retention.candidates.flatMap(c => c.blocks.flatMap(b => b.sourceSegmentIds.map(id => ({id, action: b.action}))));
assert.equal(partition.length, 7073);
assert.equal(new Set(partition.map(p => p.id)).size, partition.length);
const keep = partition.filter(p => p.action === 'keep').map(p => p.id);
const drop = partition.filter(p => p.action === 'drop').map(p => p.id);
assert.equal(keep.length, 3613); assert.equal(drop.length, 3460);
const keepSet = new Set(keep), dropSet = new Set(drop), seen = new Set();
const segments = edit.segments.map((s, i) => {
  assert(!seen.has(s.segmentId)); seen.add(s.segmentId);
  const a = adoption.selectedCandidates[i], r = retention.segments[i], m = clock.mappings[i];
  for (const peer of [a, r]) {
    assert.equal(peer.segmentId, s.segmentId); assert.equal(peer.candidateId, s.candidateId);
    assert.deepEqual(peer.sourceSegmentIds, s.sourceSegmentIds);
  }
  assert.equal(a.outputOrdinal, i + 1);
  assert.equal(m.segmentId, s.segmentId);
  assert.equal(m.sourceStartMs, s.sourceStartMs); assert.equal(m.sourceEndMs, s.sourceEndMs);
  assert.equal(m.outputStartFrame, i ? clock.mappings[i - 1].outputEndFrame : 0);
  assert.equal(m.audioSamples.outputStart, i ? clock.mappings[i - 1].audioSamples.outputEnd : 0);
  const atoms = s.sourceSegmentIds.map(id => {
    assert(keepSet.has(id) && !dropSet.has(id));
    const atom = raw.get(id); assert(atom); assert(utteranceFor.has(id));
    assert(atom.startMs >= s.sourceStartMs && atom.endMs <= s.sourceEndMs);
    return {sourceSegmentId: id, text: atom.text, sourceStartMs: atom.startMs, sourceEndMs: atom.endMs,
      semanticUtteranceId: utteranceFor.get(id), retainedSegmentId: s.segmentId};
  });
  const textBytes = Buffer.from(atoms.map(a => a.text).join(''));
  return {candidateId: s.candidateId, segmentId: s.segmentId, outputOrdinal: i + 1,
    blockOrdinal: a.blockOrdinal, sourceSegmentIds: s.sourceSegmentIds, clock: m,
    reason: r.reason, meaningRoles: r.meaningRoles, cutBoundaryEvidence: r.cutBoundaryEvidence,
    textFileSha256: sha(textBytes), textCodePoints: [...textBytes.toString()].length, atoms};
});
const mappedIds = segments.flatMap(s => s.sourceSegmentIds);
assert.equal(new Set(mappedIds).size, 3613);
assert.deepEqual([...mappedIds].sort((a, b) => a - b), [...keep].sort((a, b) => a - b));
assert.equal(segments.filter(s => s.candidateId === 'candidate-0006').length, 3);
assert.equal(clock.mappings.at(-1).outputEndFrame, 27691);
assert.equal(clock.mappings.at(-1).audioSamples.outputEnd, 40705770);
// 旧小JSONだけを照合。readerを呼ぶと媒体へ進むものはここでは呼ばない。
const oldStructure = await readJson('runtime/artifacts/digest-structure-20260929-v001/structure-state.json');
assert.equal(oldStructure.value.overrides.entries.length, 0);
const oldIncluded = new Set(oldStructure.value.autoPlan.defaultSelection.filter(s => s.include).map(s => s.segmentId));
const oldSelected = oldStructure.value.autoPlan.segments.filter(s => oldIncluded.has(s.segmentId));
const oldIds = new Set(oldSelected.flatMap(s => s.sourceSegmentIds));
const old7A = await readJson('runtime/artifacts/caption-readability-full-20260929-v001/candidate-drawing-evidence.json');
const oldAtoms = old7A.value.candidateInput.meaning.atomOccurrences;
const old7AIds = new Set(oldAtoms.map(a => a.sourceSegmentId));
const sourceMatches = oldAtoms.filter(a => keepSet.has(a.sourceSegmentId)
  && a.text === raw.get(a.sourceSegmentId).text
  && a.retainedSpans.length === 1
  && a.retainedSpans[0].sourceStartMs === raw.get(a.sourceSegmentId).startMs
  && a.retainedSpans[0].sourceEndMs === raw.get(a.sourceSegmentId).endMs);
const local = await readJson('runtime/artifacts/selection-structure-improvement-20260930-v001/local-input-v006.json');
const oldPalette = await readJson('runtime/artifacts/caption-palette-20260929-v001/palette-state.json');
const oldStructureEvidence = await readJson('runtime/artifacts/digest-structure-20260929-v001/drawing-evidence.json');
const oldPaletteEvidence = await readJson('runtime/artifacts/caption-palette-20260929-v001/drawing-evidence.json');
const oldIntegration = await readJson('runtime/artifacts/integration-preparation-20260930-v001/attempt-002/draft.json');
assert.equal(oldIntegration.value.outlineChoice, null);
const templateRoot = 'evals/clip_composition/outputs/presentation/distant-connection-existing-caption-selection/candidate-doctor-disappearance-to-ogre-mother-v001';
const sourceTemplate = await readJson(templateRoot + '/source-package-v001.json');
const rendererTemplate = await readJson(templateRoot + '/renderer-template-v002.json');
const styleContext = sourceTemplate.value.reconstructionMap.caseContexts[0];
const styleReferences = [];
for (const [role, binding] of Object.entries(styleContext.styleBindings)) {
  const {reference} = await readJson(binding.path, binding.fileSha256);
  styleReferences.push({role, ...reference});
}
const implementations = [];
const implementationPaths = [
  'packages/shared/src/digest-plan-artifacts-v001.ts', 'runner/src/digest-plan-consumption-v001.ts',
  'runner/src/skills/caption-display-boundaries-v001.ts',
  'evals/clip_composition/run_new_material_digest_20260926.mts',
  'evals/clip_composition/adopted_media_manufacturing_v001.mts',
  'evals/clip_composition/candidate_digest_core_adapter_v001.mts',
  'evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs',
  'evals/clip_composition/presentation_renderer_admission_receipt_v002.mjs',
  'evals/clip_composition/presentation_orchestration_v001.mjs',
  'evals/clip_composition/presentation_auto_effects_palette_v001.mjs',
  'tools/digest-quality/caption-readability-source.mjs',
  'tools/digest-quality/digest-structure-evidence.mjs',
  'tools/digest-quality/caption-palette-view.mjs',
  'tools/digest-quality/integration-preparation.mjs',
];
for (const p of new Set([...implementationPaths, ...loaded['consumption-binding.json'].implementations.map(x => x.path)])) {
  assert(['.ts', '.mts', '.mjs'].includes(path.extname(p)));
  const bytes = await readFile(path.join(root, p));
  const digest = sha(bytes);
  const priorBinding = loaded['consumption-binding.json'].implementations.find(x => x.path === p);
  if (priorBinding) assert.equal(digest, priorBinding.fileSha256);
  implementations.push({path: p, fileSha256: digest, consumptionLiveBinding: Boolean(priorBinding)});
}
const diagnostic = {schemaVersion: 'digest-presentation-input-mapping-diagnostic-v001',
  status: 'static-input-mapping', sourceExecutionBinding: executionRef, sourceReferences: refs,
  segments, dropSourceSegmentIds: drop, oldReuseObservation: {
    old7BSelectedSourceCount: oldIds.size, currentKeptIntersection: [...oldIds].filter(id => keepSet.has(id)).length,
    old7BNotKeptNow: [...oldIds].filter(id => !keepSet.has(id)).length,
    currentNotIn7B: keep.filter(id => !oldIds.has(id)).length,
    old7ASourceCount: old7AIds.size, currentKeptIntersection7A: [...old7AIds].filter(id => keepSet.has(id)).length,
    textAndRawMsMatches7A: sourceMatches.length,
    semanticUtteranceIdentityMatches7A: sourceMatches.filter(a => a.semanticUtteranceId === utteranceFor.get(a.sourceSegmentId)).length,
    old7ATranscriptShaMatches: old7A.value.candidateInput.meaning.transcriptBinding.fileSha256 === byName('transcript.json').fileSha256,
    old7AUtteranceBytesSame: old7A.value.candidateInput.meaning.utteranceBinding.fileSha256 === byName('utterances.json').fileSha256,
    localSemanticDecisionRanges: local.value.semanticDecisions.map(d => d.sourceFragmentRange),
    appliedOldCaptions: 0, appliedOldAnswers: 0, appliedColorRanges: 0, appliedMotionRanges: 0,
  }, captionStyleCandidate: {sourceTemplate: sourceTemplate.reference, rendererTemplate: rendererTemplate.reference,
    styleLimits: sourceTemplate.value.promptInput.styleLimits, horizontalStyleInput: styleContext.horizontalStyleInput,
    resolvedStyle: styleContext.resolvedStyle, styleReferences}, implementations,
  forbiddenOperations: {mediaRead: 0, mediaHash: 0, mediaCopy: 0, mediaPut: 0, runner: 0, backend: 0,
    consumer: 0, rendering: 0, newJudgment: 0, inferenceApi: 0}, startedAt};
await mkdir(path.join(root, path.dirname(diagnosticRoot)), {recursive: true});
await mkdir(path.join(root, diagnosticRoot), {recursive: false});
const diagnosticPath = diagnosticRoot + '/input-correspondence.json';
const diagnosticBytes = formal(diagnostic);
await writeFile(path.join(root, diagnosticPath), diagnosticBytes, {flag: 'wx'});
const rereadBytes = await readFile(path.join(root, diagnosticPath));
assert.deepEqual(rereadBytes, diagnosticBytes);
const reread = JSON.parse(rereadBytes.toString());
assert.deepEqual(reread.segments.map(s => s.sourceSegmentIds), segments.map(s => s.sourceSegmentIds));
assert.equal(reread.segments.flatMap(s => s.atoms).length, 3613);
assert.equal(new Set(reread.sourceReferences.map(r => r.path)).size, reread.sourceReferences.length);
assert.deepEqual(await readFile(path.join(root, prior, 'state.json')), stateBytes);
const result = JSON.parse(await readFile(path.join(root, report), 'utf8'));
result.status = 'static-mapping-complete';
result.history = {productFixes: 5, setupFixes: 18, setup18Applied: true,
  setup18Meaning: '個別承認の小JSON読取・既存resolver・ID/時計対応記録、一回の保存再読。製品変更なし'};
result.executedAt = startedAt; result.finishedAt = new Date().toISOString();
result.sourceReferences = refs;
result.implementations = implementations;
result.diagnostic = {path: diagnosticPath, fileSha256: sha(diagnosticBytes), byteSize: diagnosticBytes.length,
  savedJsonReadbackCount: 1, byteEqual: true, priorStateUnchanged: true};
result.coverage = {parent: 7073, keep: 3613, drop: 3460, mapped: 3613, uniqueSegmentIds: 9,
  candidate0006Segments: 3, droppedIdsRestored: 0, gapsRestored: 0, finalFrame: 27691, finalSample: 40705770,
  perAtomOutputClock: 'not-generated; raw ms is related to its saved segment clock only'};
result.segments = segments.map(({atoms, sourceSegmentIds, ...s}) => ({...s,
  firstSourceSegmentId: sourceSegmentIds[0], lastSourceSegmentId: sourceSegmentIds.at(-1),
  sourceSegmentCount: sourceSegmentIds.length, detailField: `segments[${s.outputOrdinal - 1}]`}));
result.reuseObservations = diagnostic.oldReuseObservation;
result.styleCandidate = diagnostic.captionStyleCandidate;
result.forbiddenOperations = diagnostic.forbiddenOperations;
await writeFile(path.join(root, report), formal(result));
console.log(JSON.stringify({status: result.status, coverage: result.coverage,
  diagnostic: result.diagnostic, reuse: result.reuseObservations, setupCumulative: 18}));
