import assert from 'node:assert/strict';
import { lstat, realpath, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { digestArtifactPathFromUriV001, type RuntimeConfig, type Zev2State } from '@zev2/shared';
import { workspaceRoot } from '../config/runtime-config.js';
import { readDigestUiRevisionSources, readDigestUiRetentionCallerAnswer } from './digest-ui-composition-data.js';

type Obj = Record<string, any>;
type Binding = { path: string; fileSha256: string };
type Answer = { candidateId: string; requestId: string; binding: Binding; validation: Obj };
const SHA = /^[0-9a-f]{64}$/u;
const SCHEMA = 'ui-digest-human-revision-preparation-v001';
const IMPLEMENTATIONS = ['backend/src/domain/digest-ui-revision-preparation.ts',
  'backend/src/domain/digest-ui-composition-data.ts', 'backend/src/domain/digest-ui-review.ts',
  'evals/clip_composition/candidate_internal_retention_validation_v001.mts',
  'runner/src/skills/candidate-internal-retention-v001.ts',
  'evals/clip_composition/presentation_base_media_build_v003.mjs',
  'evals/clip_composition/adopted_caption_judgment_inputs_v001.mts',
  'runner/src/skills/caption-display-boundaries-v001.ts',
  'evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts',
  'evals/clip_composition/presentation_timeline_composition_decision_v001.mjs'];
const ADMISSION = { retentionIntegration: 'verified', intervalClock: 'passed', captionInputs: 'prepared',
  captionDisplayAnswers: 'unanswered', uiApplication: 'not-connected', executionPermission: 'not-approved', humanQuality: 'pending' };
function exact(value: unknown, fields: string[]): Obj {
  assert(value && typeof value === 'object' && !Array.isArray(value), '新版準備の入力が不足しています');
  assert.deepEqual(Object.keys(value).sort(), [...fields].sort(), '新版準備の入力項目が一致しません');return value as Obj;
}
function byteBinding(value: unknown): Binding {
  const b = exact(value, ['path', 'fileSha256']);
  assert(typeof b.path === 'string' && b.path && typeof b.fileSha256 === 'string' && SHA.test(b.fileSha256), '新版準備のbindingが不正です');
  return { path: b.path, fileSha256: b.fileSha256 };
}
function input(value: unknown) {
  const b = exact(value, ['draftIdentity', 'fingerprint', 'preparationHash', 'answers', 'output']);
  assert(typeof b.draftIdentity === 'string' && typeof b.fingerprint === 'string' && typeof b.preparationHash === 'string' && SHA.test(b.preparationHash), '新版準備の現在版が不正です');
  assert(Array.isArray(b.answers) && b.answers.length, '追加保持の保存回答が不足しています');
  const answers = b.answers.map((v: unknown) => { const a = exact(v, ['requestId', 'answerHash']);
    assert(typeof a.requestId === 'string' && a.requestId && typeof a.answerHash === 'string' && SHA.test(a.answerHash), '保存回答の指定が不正です');
    return { requestId: a.requestId as string, answerHash: a.answerHash as string }; });
  const o = exact(b.output, ['outputRoot', 'preparationId', 'scopeBinding']);
  assert(typeof o.outputRoot === 'string' && path.isAbsolute(o.outputRoot) && path.resolve(o.outputRoot) === o.outputRoot,
    '新版準備には明示された正規出力rootが必要です');
  assert(typeof o.preparationId === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(o.preparationId)
    && path.basename(o.outputRoot) === o.preparationId, '新版準備の出力identityが不一致です');
  return { draftIdentity: b.draftIdentity as string, fingerprint: b.fingerprint as string, preparationHash: b.preparationHash as string,
    answers, output: { outputRoot: o.outputRoot as string, preparationId: o.preparationId as string, scopeBinding: byteBinding(o.scopeBinding) } };
}
const within = (parent: string, child: string) => child === parent || child.startsWith(parent + path.sep);
const overlaps = (a: string, b: string) => within(a, b) || within(b, a);

/** A dedicated join of already qualified scenes. Original IDs/cuts survive; new IDs cannot conceal source collisions. */
export function integrateDigestUiRevisionRetentionScenes(composition: Obj, original: Obj, originalBindings: Obj, answers: Answer[]) {
  assert(original.status === 'resolved', '元保持は未解決です');
  const originalScenes = composition.scenes.filter((s: Obj) => s.inclusion.kind === 'original-ai-adoption');
  assert.deepEqual(originalScenes.map((s: Obj) => s.candidateId), original.candidates.map((c: Obj) => c.candidateId), '元採用sceneの集合・順が変更されています');
  assert.deepEqual(answers.map(a => a.candidateId), composition.scenes.filter((s: Obj) => s.inclusion.kind === 'human-addition').map((s: Obj) => s.candidateId),
    '追加保持sceneの集合・順が一致しません');
  const scenes = composition.scenes.map((scene: Obj) => {
    const added = answers.find(a => a.candidateId === scene.candidateId);
    const resolved = scene.inclusion.kind === 'original-ai-adoption' ? original : added?.validation;
    assert(resolved?.status === 'resolved', '全体保持に未解決sceneがあります');
    const candidate = resolved.candidates.find((c: Obj) => c.candidateId === scene.candidateId);
    assert(candidate, '保持本文のscene所属がありません');
    const segments = resolved.segments.filter((s: Obj) => s.candidateId === scene.candidateId);
    const blocks = candidate.blocks as Obj[];
    assert.deepEqual(blocks.flatMap(b => b.sourceSegmentIds), scene.candidateContext.sourceSegmentIds, '保持/削除の全文所属が変わっています');
    assert.deepEqual(segments.flatMap((s: Obj) => s.sourceSegmentIds), blocks.filter(b => b.action === 'keep').flatMap(b => b.sourceSegmentIds), 'keep区間と保持本文が一致しません');
    assert.deepEqual(segments.map((s: Obj) => s.blockOrdinal), blocks.filter(b => b.action === 'keep').map(b => b.blockOrdinal), '元保持blockの対応が一致しません');
    assert(segments.length, '採用sceneのkeepがありません');
    const retentionSource = added ? { kind: 'additional-supplied-answer', requestId: added.requestId, binding: added.binding }
      : { kind: 'original-retention', bindings: originalBindings };
    return { ...structuredClone(scene), retentionSource: structuredClone(retentionSource),
      meaningPreserved: candidate.meaningPreserved, blocks: structuredClone(blocks), segments: structuredClone(segments) };
  });
  const allIds = scenes.flatMap((s: Obj) => s.blocks.flatMap((b: Obj) => b.sourceSegmentIds)) as number[];
  assert.equal(new Set(allIds).size, allIds.length, '全体構成の元字幕断片が重複しています。新IDへの変更では解決できません');
  const retainedSourceSegmentIds = scenes.flatMap((s: Obj) => s.blocks.filter((b: Obj) => b.action === 'keep').flatMap((b: Obj) => b.sourceSegmentIds)) as number[];
  const droppedSourceSegmentIds = scenes.flatMap((s: Obj) => s.blocks.filter((b: Obj) => b.action === 'drop').flatMap((b: Obj) => b.sourceSegmentIds)) as number[];
  assert(retainedSourceSegmentIds.every(id => !droppedSourceSegmentIds.includes(id)), '全体保持と削除の断片が衝突しています');
  const sourceParts = scenes.flatMap((s: Obj) => s.segments.map((part: Obj) => ({ scene: s, part }))) as Array<{ scene: Obj; part: Obj }>;
  for (let i = 0; i < sourceParts.length; i++) {
    const s = sourceParts[i]!.part, previous = sourceParts[i - 1]?.part;
    assert(Number.isSafeInteger(s.sourceStartMs) && Number.isSafeInteger(s.sourceEndMs) && s.sourceStartMs >= 0
      && s.sourceStartMs < s.sourceEndMs, '全体保持の元端点が不正です');
    assert(!previous || previous.sourceEndMs <= s.sourceStartMs, '全体保持の元区間が逆順または重複しています');
  }
  const segments = sourceParts.map(({ scene, part }, i) => ({ ...structuredClone(part),
    segmentId: `segment-${String(i + 1).padStart(4, '0')}`, outputOrdinal: i + 1,
    origin: { candidateId: part.candidateId, originalSegmentId: part.segmentId, blockOrdinal: part.blockOrdinal,
      retentionSource: structuredClone(scene.retentionSource) } }));
  assert.deepEqual(segments.flatMap(s => s.sourceSegmentIds), retainedSourceSegmentIds, '全体keepの所属・順が一致しません');
  return { scenes, segments, retainedSourceSegmentIds, droppedSourceSegmentIds };
}

async function reconstruct(state: Zev2State, draftId: string, config: RuntimeConfig, requestHash: string, supplied: unknown) {
  const b = input(supplied), p = await readDigestUiRevisionSources(state, draftId, config, requestHash), q = p.r.q;
  assert.equal(b.draftIdentity, p.value.draftIdentity, '新版準備の依頼が変更されています');
  assert.equal(b.fingerprint, p.r.m.fingerprint, '新版準備の構成・要求版が変更されています');
  assert.equal(b.preparationHash, p.binding.fileSha256, '新版準備の未回答bundleが一致しません');
  assert.equal(q.audioPreservation, 'preserve-source-only', '元音声保持の指定が不足しています');
  assert.equal(q.sourceAudioReference, 'registered', '元音声/時計の登録が不足しています');
  assert.deepEqual(b.answers.map(a => a.requestId), p.value.requests.map(r => r.request.requestId), '保存回答の集合・順・一意性が一致しません');
  const root = await realpath(workspaceRoot()), normal = q.baseline.parameters, inputRoot = await realpath(normal.inputRoot);
  assert.equal(inputRoot, normal.inputRoot, '登録SSD入力rootが変更されています');
  const rootIdentity = await lstat(inputRoot, { bigint: true }), outputRoot = b.output.outputRoot;
  const prefixRoot = path.join(inputRoot, normal.inputPrefix);
  assert(outputRoot.startsWith(prefixRoot + path.sep) && !overlaps(outputRoot, normal.sourceRuntimeRoot)
    && !overlaps(outputRoot, normal.outputRoot), '新版準備の出力先は登録SSD内の独立directoryに限定します');
  assert.equal(await realpath(path.dirname(outputRoot)), path.dirname(outputRoot), '新版準備の出力親が不正です');
  const assertRootCurrent = async () => {
    const now = await lstat(inputRoot, { bigint: true });
    assert(now.isDirectory() && !now.isSymbolicLink() && now.dev === rootIdentity.dev && now.ino === rootIdentity.ino
      && await realpath(inputRoot) === inputRoot, '新版準備のSSD rootが変更されています');
  };
  const stable = await import(pathToFileURL(path.join(root, 'evals/clip_composition/presentation_timeline_composition_decision_v001.mjs')).href);
  const wire = await import(pathToFileURL(path.join(root, 'evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts')).href);
  const clockModule = await import(pathToFileURL(path.join(root, 'evals/clip_composition/presentation_base_media_build_v003.mjs')).href);
  const builder = await import(pathToFileURL(path.join(root, 'evals/clip_composition/adopted_caption_judgment_inputs_v001.mts')).href);
  const read = async (base: string, binding: Binding): Promise<Buffer> => {
    await assertRootCurrent();const raw: Buffer = await stable.readPresentationMeaningWorkspaceFileStableV001({ workspaceRoot: base, relativePath: binding.path });
    assert.equal(wire.sha(raw), binding.fileSha256, '新版準備の保存bytesが変更されています');await assertRootCurrent();return raw;
  };
  await read(root, b.output.scopeBinding);
  const additions: Answer[] = [];
  for (const [i, a] of b.answers.entries()) {
    const saved = await readDigestUiRetentionCallerAnswer(state, draftId, config, requestHash, a.answerHash);
    assert.equal(saved.record.requestId, a.requestId, '保存回答の追加要求が不一致です');
    const item = p.value.requests[i]!;
    additions.push({ candidateId: item.request.candidateId, requestId: a.requestId, binding: saved.binding, validation: saved.record.validation });
  }
  const joined = integrateDigestUiRevisionRetentionScenes(p.r.composition, q.retention.documents.validation, p.value.originalRetentionBindings, additions);
  const file = (name: string) => path.relative(inputRoot, path.join(outputRoot, name)).split(path.sep).join('/');
  const retention = { schemaVersion: 'ui-digest-human-retention-integration-v001', status: 'human-revision-data-only',
    requestDraftId: draftId, draftIdentity: b.draftIdentity, requestHash,
    snapshotBinding: p.value.snapshotBinding, compositionBinding: p.value.compositionBinding, retentionInputsBinding: p.binding,
    representedEditRequestIds: p.value.representedEditRequestIds, originalAiSelectionBinding: p.r.composition.originalAiSelectionBinding,
    sourceBindings: p.value.sourceBindings, originalRetentionBindings: p.value.originalRetentionBindings,
    additionalAnswers: additions.map(({ candidateId, requestId, binding }) => ({ candidateId, requestId, binding })), ...joined };
  const retentionBinding = wire.bind(file('revision-retention.json'), retention);
  const edit = { schemaVersion: 'ui-digest-human-revision-edit-plan-v001', retentionIntegrationBinding: retentionBinding,
    sourceVideoBinding: p.value.sourceBindings.sourceVideo,
    segments: joined.segments.map(s => ({ candidateId: s.candidateId, segmentId: s.segmentId, sourceSegmentIds: s.sourceSegmentIds,
      sourceStartMs: s.sourceStartMs, sourceEndMs: s.sourceEndMs })), unresolvedEdits: [], humanQuality: 'pending' };
  const media = q.inspection.media;
  const clock = clockModule.validatePresentationBaseMediaSegmentPlanV002(
    edit.segments.map(({ sourceStartMs, sourceEndMs }) => ({ sourceStartMs, sourceEndMs })),
    { fps: media.fps, decodedFrameCount: media.decodedFrameCount, logicalFrameCount: media.logicalFrameCount,
      presentationOffsetMs: media.videoClock.presentationOffsetMs }, media.audioClock);
  assert.equal(clock.status, 'passed', '変更後のframe/sample時計を表現できません');
  assert.equal(clock.mappings.length, edit.segments.length, '変更後時計の区間数が一致しません');
  clock.mappings.forEach((m: Obj, i: number) => { const s = edit.segments[i]!;
    assert.equal(m.segmentId, s.segmentId);assert.equal(m.sourceStartMs, s.sourceStartMs);assert.equal(m.sourceEndMs, s.sourceEndMs);
    assert(m.audioSamples, '変更後の元音声sample対応がありません'); });
  const clockOutput = { schemaVersion: 'ui-digest-human-revision-clock-v001', retentionIntegrationBinding: retentionBinding,
    sourceInspectionBinding: q.inspectionBinding, resolution: clock };
  const prompt = q.style.promptInput;
  const built = builder.buildAdoptedCaptionJudgmentInputsV001({ preparationId: b.output.preparationId, meaningPath: file('meaning-input.json'),
    planBinding: { path: digestArtifactPathFromUriV001(q.planFile.uri, draftId, normal.expected.planRequestId), fileSha256: q.planFile.sha256 }, machineAdoptionBinding: retentionBinding,
    transcriptBinding: p.value.sourceBindings.transcript, utteranceBinding: p.value.sourceBindings.utterances,
    sourceVideoBinding: p.value.sourceBindings.sourceVideo,
    parts: edit.segments.map(s => ({ candidateId: s.candidateId, timelineSegmentId: s.segmentId, sourceSegmentIds: s.sourceSegmentIds,
      sourceInterval: { sourceStartMs: s.sourceStartMs, sourceEndMs: s.sourceEndMs } })),
    retainedSourceSegmentIds: joined.retainedSourceSegmentIds, droppedSourceSegmentIds: joined.droppedSourceSegmentIds,
    transcript: q.transcript, utterances: q.utterances, taskDescription: prompt.taskDescription, styleLimits: prompt.styleLimits });
  const outputs: Array<{ name: string; value: Obj }> = [{ name: 'revision-retention.json', value: retention },
    { name: 'revision-edit-plan.json', value: edit }, { name: 'revision-clock-resolution.json', value: clockOutput },
    { name: 'meaning-input.json', value: built.meaning }, ...built.requests.map((value: Obj, i: number) => ({ name: `display-request-${String(i + 1).padStart(4, '0')}.json`, value }))];
  const implementations = [];
  for (const name of IMPLEMENTATIONS) {
    const raw: Buffer = await stable.readPresentationMeaningWorkspaceFileStableV001({ workspaceRoot: root, relativePath: name });
    implementations.push({ path: name, fileSha256: wire.sha(raw) });
  }
  const manifest = { schemaVersion: SCHEMA, status: 'human-revision-inputs-prepared', preparationId: b.output.preparationId,
    requestDraftId: draftId, draftIdentity: b.draftIdentity, requestHash, input: b,
    inputRoot, inputPrefix: normal.inputPrefix, uiRuntimeRoot: p.r.runtime, originalPurpose: state.requestDrafts.find(d => d.id === draftId)!.purpose,
    baseline: q.baseline, sourceInspectionBinding: q.inspectionBinding, styleTemplateBinding: q.styleTemplateBinding,
    originalAiSelectionBinding: retention.originalAiSelectionBinding, originalRetentionBindings: p.value.originalRetentionBindings,
    snapshotBinding: p.value.snapshotBinding, compositionBinding: p.value.compositionBinding, retentionInputsBinding: p.binding,
    representedEditRequestIds: p.value.representedEditRequestIds, additionalAnswers: retention.additionalAnswers, implementations,
    outputs: outputs.map(o => ({ fileName: o.name, ...wire.bind(file(o.name), o.value) })),
    admission: ADMISSION, renderExecuted: false, backendCompletionRegistered: false };
  const manifestBinding: Binding = { path: file('revision-preparation-manifest.json'), fileSha256: wire.sha(wire.formal(manifest)) };
  const all = [...outputs, { name: 'revision-preparation-manifest.json', value: manifest }];
  const assertDirectory = async () => { await assertRootCurrent();const st = await lstat(outputRoot);
    assert(st.isDirectory() && !st.isSymbolicLink() && await realpath(outputRoot) === outputRoot, '新版準備の出力directoryが不正です'); };
  return { inputRoot, outputRoot, all, manifest, manifestBinding, read, wire, assertDirectory, assertRootCurrent };
}
function summary(r: Awaited<ReturnType<typeof reconstruct>>) {
  return { status: 'human-revision-inputs-prepared', requestDraftId: r.manifest.requestDraftId, requestHash: r.manifest.requestHash,
    preparationHash: r.manifestBinding.fileSha256, manifestBinding: r.manifestBinding, admission: r.manifest.admission };
}

/** Agent-authenticated JSON preparation only. All pure checks finish before any output writes; manifest is last. */
export async function prepareDigestUiRevision(state: Zev2State, draftId: string, config: RuntimeConfig, requestHash: string, supplied: unknown) {
  const r = await reconstruct(state, draftId, config, requestHash, supplied), missing: Array<{ name: string; data: Buffer }> = [];
  let directoryExists = true;
  try { await r.assertDirectory(); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;directoryExists = false; }
  for (const o of r.all) {
    const file = path.join(r.outputRoot, o.name), data: Buffer = r.wire.formal(o.value);
    let info;try { info = await lstat(file); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
    if (info) assert.deepEqual(await r.read(r.inputRoot, { path: path.relative(r.inputRoot, file).split(path.sep).join('/'), fileSha256: r.wire.sha(data) }), data,
      '既存新版準備のbytesが不一致です。上書きしません');
    else missing.push({ name: o.name, data });
  }
  await r.assertRootCurrent();
  if (!directoryExists) await mkdir(r.outputRoot);
  await r.assertDirectory();
  for (const o of missing) { await r.assertDirectory();await writeFile(path.join(r.outputRoot, o.name), o.data, { flag: 'wx' }); }
  for (const o of r.all) assert.deepEqual(await r.read(r.inputRoot,
    { path: path.relative(r.inputRoot, path.join(r.outputRoot, o.name)).split(path.sep).join('/'), fileSha256: r.wire.sha(r.wire.formal(o.value)) }), r.wire.formal(o.value));
  await r.assertDirectory();return summary(r);
}

/** Rebuild every output from the current qualified original and supplied-answer records. No writer/provider/queue dispatch. */
export async function readDigestUiRevision(state: Zev2State, draftId: string, config: RuntimeConfig, requestHash: string,
  outputRoot: string, preparationHash: string) {
  assert(typeof outputRoot === 'string' && path.isAbsolute(outputRoot) && path.resolve(outputRoot) === outputRoot && SHA.test(preparationHash), '新版準備の読取指定が不正です');
  const p = await readDigestUiRevisionSources(state, draftId, config, requestHash), normal = p.r.q.baseline.parameters;
  assert(outputRoot.startsWith(path.join(normal.inputRoot, normal.inputPrefix) + path.sep)
    && !overlaps(outputRoot, normal.sourceRuntimeRoot) && !overlaps(outputRoot, normal.outputRoot), '新版準備の読取rootが不正です');
  const stable = await import(pathToFileURL(path.join(workspaceRoot(), 'evals/clip_composition/presentation_timeline_composition_decision_v001.mjs')).href);
  const wire = await import(pathToFileURL(path.join(workspaceRoot(), 'evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts')).href);
  const raw: Buffer = await stable.readPresentationMeaningWorkspaceFileStableV001({ workspaceRoot: normal.inputRoot,
    relativePath: path.relative(normal.inputRoot, path.join(outputRoot, 'revision-preparation-manifest.json')).split(path.sep).join('/') });
  assert.equal(wire.sha(raw), preparationHash, '新版準備manifestのbytesが変更されています');
  const saved = JSON.parse(raw.toString());assert.equal(saved.schemaVersion, SCHEMA, '通常AI資料を人間新版として流用できません');
  assert.equal(saved.input?.output?.outputRoot, outputRoot, '新版準備の出力先が不一致です');
  const r = await reconstruct(state, draftId, config, requestHash, saved.input);
  assert.equal(r.manifestBinding.fileSha256, preparationHash, '新版準備の現在入力・実装が変更されています');
  await r.assertDirectory();
  for (const o of r.all) assert.deepEqual(await r.read(r.inputRoot,
    { path: path.relative(r.inputRoot, path.join(r.outputRoot, o.name)).split(path.sep).join('/'), fileSha256: r.wire.sha(r.wire.formal(o.value)) }), r.wire.formal(o.value));
  return { ...summary(r), manifest: r.manifest, outputs: Object.fromEntries(r.all.filter(o => o.name !== 'revision-preparation-manifest.json').map(o => [o.name, o.value])) };
}
