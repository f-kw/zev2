import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp, mkdir, readFile, writeFile, stat} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {initializeEditingWorkspaceV001, readEditingWorkspaceV001, saveEditingOverrideV001,
  bindEditingFileV001, editingColorChoiceV001, editingTargetListV001, editingTargetDetailsV001,
  hashEditingValueV001, writeEditingSnapshotV001} from './presentation_editing_state_v001.mjs';
import {createOrchestrationContextV001, resolveOrchestrationDrawingViewV001,
  editOrchestrationOverrideV001, restoreOrchestrationDrawingViewEvidenceV001} from './presentation_orchestration_v001.mjs';
import {getEditingPlaybackTargetsV001, getEditingPlaybackSeekV001, deriveEditingPreviewRangeV001}
  from './presentation_editing_navigation_v001.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const saved = path.join(repo, 'docs/reports/digest-presentation-orchestration-stage3-inputs-20260918');
const rules = {canonicalSha256: hashEditingValueV001({test: 'fixed finite drawing rules'}), files: []};
const read = async file => JSON.parse(await readFile(file, 'utf8'));
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zev-stage4-state-test-'));
  const original = path.join(root, 'original-fixture.mp4'); await writeFile(original, 'synthetic storage-only fixture');
  const directory = path.join(root, 'editing');
  const snapshot = await initializeEditingWorkspaceV001({directory, savedInputDirectory: saved,
    title: '保存と時計の試験用コピー', originalMedia: await bindEditingFileV001(original),
    originalDrawingRulesRef: rules, drawingRulesRef: rules, backgroundProofPath: null});
  return {root, directory, snapshot};
}
async function fileState(directory) {
  const names = ['source-bindings', 'captionAuto', 'connectionAuto', 'selectionRecord', 'captionOverrides', 'connectionOverrides'];
  return Object.fromEntries(await Promise.all(names.map(async name => {
    const file = path.join(directory, name + '.json'); return [name, {bytes: await readFile(file, 'utf8'), mtimeMs: (await stat(file)).mtimeMs}];
  })));
}
function save(snapshot, kind, itemId, selection) {
  return saveEditingOverrideV001({directory: snapshot.directory, drawingRulesRef: rules,
    expectedRevision: snapshot.revision, kind, itemId, selection});
}
test('一件追加・明示Normal・Resetは独立して保存され別processから再読できる', async () => {
  const {directory, snapshot: initial} = await fixture();
  const before = await fileState(directory);
  const id = editingTargetListV001(initial).captions.find(row => row.status === 'normal').id;
  const changed = await save(initial, 'caption', id, {preset: 'panel'});
  assert.equal(editingTargetListV001(changed).captions.find(row => row.id === id).preset, 'panel');
  const after = await fileState(directory);
  for (const name of Object.keys(before).filter(name => name !== 'captionOverrides')) assert.deepEqual(after[name], before[name]);
  const source = `import {readEditingWorkspaceV001} from ${JSON.stringify(new URL('./presentation_editing_state_v001.mjs', import.meta.url).href)};
    const result=await readEditingWorkspaceV001(${JSON.stringify({directory, drawingRulesRef: rules})});
    process.stdout.write(result.revision);`;
  const result = await promisify(execFile)(process.execPath, ['--input-type=module', '-e', source]);
  assert.equal(result.stdout, changed.revision); assert.equal(result.stderr, '');
  const normal = await save(changed, 'caption', id, 'Normal');
  assert.equal(normal.state.captionOverrides.entries.find(row => row.captionId === id).role, 'Normal');
  const reset = await save(normal, 'caption', id, 'Reset');
  assert.equal(reset.revision, initial.revision);
  assert.equal((await fileState(directory)).captionOverrides.bytes, before.captionOverrides.bytes);
  const resetAgain = await save(reset, 'caption', id, 'Reset');
  assert.equal(resetAgain.savedAt, reset.savedAt);
});
test('字幕と接続を両順序で保存・Resetしても他方の指定を変えない', async () => {
  for (const reversed of [false, true]) {
    const {snapshot: original} = await fixture();
    const id = editingTargetListV001(original).captions.find(row => row.status === 'normal').id;
    const operations = [['caption', id, {preset: 'color', scope: 'whole-caption'}], ['connection', 'connection-01', 'black-separator']];
    if (reversed) operations.reverse();
    let value = original;
    for (const [kind, itemId, selection] of operations) value = await save(value, kind, itemId, selection);
    const both = value;
    for (const [kind, itemId] of operations) {
      const other = kind === 'caption' ? 'connectionOverrides' : 'captionOverrides';
      const oldOther = structuredClone(value.state[other]);
      value = await save(value, kind, itemId, 'Reset'); assert.deepEqual(value.state[other], oldOther);
    }
    assert.equal(value.revision, original.revision);
    assert.equal(both.view.resolvedPlan.elements.find(row => row.instructionId === id).startFrame,
      original.view.resolvedPlan.elements.find(row => row.instructionId === id).startFrame + 12);
  }
});
test('古い保存版と同時保存を拒否して先行保存を保持する', async () => {
  const {snapshot} = await fixture();
  const id = editingTargetListV001(snapshot).captions.find(row => row.status === 'normal').id;
  const results = await Promise.allSettled([save(snapshot, 'caption', id, {preset: 'panel'}),
    save(snapshot, 'connection', 'connection-01', 'black-separator')]);
  assert.equal(results.filter(row => row.status === 'fulfilled').length, 1);
  assert.equal(results.find(row => row.status === 'rejected').reason.code, 'EDITING_CONFLICT');
  const reloaded = await readEditingWorkspaceV001({directory: snapshot.directory, drawingRulesRef: rules});
  assert.equal(reloaded.state.captionOverrides.entries.length, 1);
  assert.equal(reloaded.state.connectionOverrides.entries.length, 0);
});
test('不正文字範囲・未知ピーク・短過ぎる字幕は保存を変更しない', async () => {
  const {snapshot} = await fixture();
  const before = await fileState(snapshot.directory), id = snapshot.context.captionIds[0];
  for (const selection of [{preset: 'pulse', anchorPeakId: 'invented-peak'}, {preset: 'bounce'},
    {preset: 'color', scope: 'partial-caption', startUtf16: 0, endUtf16: 2, selectedText: '別本文'}]) {
    await assert.rejects(save(snapshot, 'caption', id, selection));
    assert.deepEqual(await fileState(snapshot.directory), before);
  }
  await mkdir(path.join(snapshot.directory, '.write-lock'));
  await writeFile(path.join(snapshot.directory, '.write-lock', `owner-${process.pid}-00000000-0000-0000-0000-000000000000.json`), '{}');
  await assert.rejects(save(snapshot, 'caption', id, 'Normal'), {code: 'EDITING_BUSY'});
  assert.deepEqual(await fileState(snapshot.directory), before);
});
test('同語反復・改行・結合文字・絵文字の選択を正確な出現位置へ変換する', () => {
  const text = '同じ同じ\nか\u3099👩‍💻';
  const select = (startUtf16, endUtf16) => editingColorChoiceV001(text, {preset: 'color', scope: 'partial-caption',
    startUtf16, endUtf16, selectedText: text.slice(startUtf16, endUtf16)});
  assert.deepEqual(select(2, 4), {preset: 'color', scope: 'partial-caption', targetText: '同じ', occurrence: 2});
  assert.equal(select(2, 7).targetText, '同じ\nか\u3099');
  assert.equal(select(7, text.length).targetText, '👩‍💻');
  assert.throws(() => select(5, 6), /途中/);
  assert.throws(() => select(7, 9), /途中/);
});
test('Pulse候補は実在する適格ピークだけを時刻で表示し通常字幕へ追加できる', async () => {
  const {snapshot} = await fixture();
  const id = editingTargetListV001(snapshot).captions.find(row => row.status === 'normal').id;
  const details = editingTargetDetailsV001(snapshot, 'caption', id);
  assert(details.peakOptions.length > 0);
  for (const peak of details.peakOptions) {
    assert(snapshot.source.captionContext.pulseTimingEvidence.peaks.some(row => row.peakId === peak.id));
    assert(peak.label.includes(peak.displaySeconds.toFixed(3)));
  }
  const savedPulse = await save(snapshot, 'caption', id, {preset: 'pulse', anchorPeakId: details.peakOptions[0].id});
  assert.equal(editingTargetListV001(savedPulse).captions.find(row => row.id === id).preset, 'pulse');
});
test('描画用snapshotはその後の保存から独立し、固定自動案の改変を再読で拒否する', async () => {
  const {root, snapshot} = await fixture();
  const ref = await writeEditingSnapshotV001({snapshot, outputDirectory: path.join(root, 'job-input')});
  const oldBytes = await readFile(ref.path), id = snapshot.context.captionIds[1];
  const changed = await save(snapshot, 'caption', id, 'Normal');
  assert.notEqual(changed.revision, snapshot.revision);
  assert.deepEqual(await readFile(ref.path), oldBytes);
  assert.equal(restoreOrchestrationDrawingViewEvidenceV001(JSON.parse(oldBytes)).viewSha256, snapshot.view.viewSha256);
  await writeFile(path.join(snapshot.directory, 'captionAuto.json'), '{}\n');
  await assert.rejects(readEditingWorkspaceV001({directory: snapshot.directory, drawingRulesRef: rules}), {code: 'EDITING_FIXED_CHANGED'});
});
test('旧全編・旧previewの時計で対象を引き、接続挿入後も安定IDを維持する', async () => {
  const {snapshot} = await fixture();
  const changed = await save(snapshot, 'connection', 'connection-01', 'black-separator');
  const id = snapshot.context.captionIds[9], playing = snapshot.view.resolvedPlan.elements.find(row => row.instructionId === id);
  const full = {startFrame: 0, endFrameExclusive: snapshot.view.projection.displayFrameCount};
  const found = getEditingPlaybackTargetsV001({playingView: snapshot.view, currentView: changed.view, range: full,
    seconds: playing.startFrame / 30});
  assert.deepEqual(found.captionIds, [id]);
  assert.equal(changed.view.resolvedPlan.elements.find(row => row.instructionId === id).startFrame, playing.startFrame + 12);
  const range = {startFrame: playing.startFrame - 30, endFrameExclusive: playing.endFrameExclusive + 30};
  assert.deepEqual(getEditingPlaybackTargetsV001({playingView: snapshot.view, currentView: changed.view, range, seconds: 1}).captionIds, [id]);
  assert.equal(getEditingPlaybackSeekV001({playingView: snapshot.view, range, kind: 'caption', itemId: id}).seconds, 1);
  assert.equal(getEditingPlaybackSeekV001({playingView: snapshot.view, range, kind: 'caption', itemId: snapshot.context.captionIds[31]}).seconds, null);
});
test('挿入黒は接続に所有させ、字幕の空白を近い字幕の選択にしない', async () => {
  const {snapshot} = await fixture();
  const black = snapshot.view.projection.insertedSpans[0], range = {startFrame: 0, endFrameExclusive: snapshot.view.projection.displayFrameCount};
  const found = getEditingPlaybackTargetsV001({playingView: snapshot.view, currentView: snapshot.view, range,
    seconds: (black.displayStartFrame + 1) / 30});
  assert.deepEqual(found.captionIds, []); assert.deepEqual(found.connectionIds, [black.connectionId]);
  let gap = 0;
  while (snapshot.view.resolvedPlan.elements.some(row => row.startFrame <= gap && gap < row.endFrameExclusive)
    || snapshot.view.projection.insertedSpans.some(row => row.displayStartFrame <= gap && gap < row.displayEndFrameExclusive)) gap++;
  const empty = getEditingPlaybackTargetsV001({playingView: snapshot.view, currentView: snapshot.view, range, seconds: gap / 30});
  assert.deepEqual(empty.captionIds, []);
});
test('同尺BlackからSoftへの変更でも版は変わり、確認範囲は全動作と接続前後を含む', async () => {
  const {snapshot} = await fixture();
  const changed = await save(snapshot, 'connection', 'connection-04', 'soft-separator');
  assert.equal(changed.view.projection.displayFrameCount, snapshot.view.projection.displayFrameCount);
  assert.notEqual(changed.revision, snapshot.revision);
  const id = snapshot.context.captionIds[1], element = snapshot.view.resolvedPlan.elements[1];
  const range = deriveEditingPreviewRangeV001({view: snapshot.view, kind: 'caption', itemId: id});
  assert(range.startFrame <= element.startFrame && range.endFrameExclusive >= element.endFrameExclusive);
  const connectionRange = deriveEditingPreviewRangeV001({view: changed.view, kind: 'connection', itemId: 'connection-04'});
  const inserted = changed.view.projection.insertedSpans.find(row => row.connectionId === 'connection-04');
  assert(connectionRange.startFrame < inserted.displayStartFrame - 6);
  assert(connectionRange.endFrameExclusive > inserted.displayEndFrameExclusive + 6);
});
test('全32字幕・全接続の一覧seekと動画位置逆引きがframe境界でも一致する', async () => {
  const {snapshot} = await fixture(), view = snapshot.view;
  const range = {startFrame: 0, endFrameExclusive: view.projection.displayFrameCount};
  for (const row of view.resolvedPlan.elements) {
    const {seconds} = getEditingPlaybackSeekV001({playingView: view, range, kind: 'caption', itemId: row.instructionId});
    const found = getEditingPlaybackTargetsV001({playingView: view, currentView: view, range, seconds});
    assert.deepEqual(found.captionIds, [row.instructionId], `frame ${row.startFrame}`);
  }
  for (const row of view.projection.connections) {
    const {seconds} = getEditingPlaybackSeekV001({playingView: view, range, kind: 'connection', itemId: row.connectionId});
    assert(getEditingPlaybackTargetsV001({playingView: view, currentView: view, range, seconds}).connectionIds.includes(row.connectionId));
  }
});
