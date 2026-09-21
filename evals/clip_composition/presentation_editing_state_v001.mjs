/** Durable one-item edits. Fixed automatic records are never rewritten. */
import {createHash, randomUUID} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat, mkdir, open, readFile, readdir, rename, rmdir, stat, unlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {createOrchestrationContextV001, resolveOrchestrationDrawingViewV001,
  editOrchestrationOverrideV001, exportOrchestrationDrawingViewEvidenceV001} from './presentation_orchestration_v001.mjs';
import {resolvePresentationPulseTimingV001} from './presentation_pulse_v001.mjs';
import {PRESENTATION_PANEL_PALETTES_V003} from './presentation_panel_presets_v002.mjs';
import {projectOriginalFrameV001, projectAudioPeakV001} from './presentation_orchestration_projection_v001.mjs';
import {inspectEditingCaptionApplicabilityV001, assertEditingCaptionApplicabilityCurrentV001, assertEditingApplicabilityRulesCurrentV001}
  from './presentation_editing_applicability_v001.mjs';

const fixedNames = ['source-bindings.json', 'fresh-input.json', 'raw-ai-response-v001.json',
  'captionAuto.json', 'connectionAuto.json', 'selectionRecord.json'];
const stateNames = ['captionAuto', 'captionOverrides', 'connectionAuto', 'connectionOverrides', 'selectionRecord'];
const sha = value => createHash('sha256').update(value).digest('hex');
export const hashEditingValueV001 = value => sha(canonicalJson(value));
const bytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const parse = async file => JSON.parse(await readFile(file, 'utf8'));
const demand = (condition, message, code = 'EDITING_INVALID') => {
  if (!condition) {const error = new TypeError(message); error.code = code; throw error;}
};
const same = (a, b) => canonicalJson(a) === canonicalJson(b);
const clone = value => structuredClone(value);
const exact = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const rolePreset = {'Normal': 'normal', 'Focus': 'color', 'Vocal accent': 'scale', 'Panel accent': 'panel',
  'Pulse accent': 'pulse', 'Bounce accent': 'bounce', 'Shake accent': 'shake'};
export const EDITING_PRESET_LABELS_V001 = Object.freeze({normal: 'Normal（通常表示）', color: 'Color',
  scale: 'Scale', panel: 'Panel（無地）', 'panel-graph-paper': 'Panel（方眼紙）',
  'panel-comic-frame': 'Panel（コミック枠）', pulse: 'Pulse', bounce: 'Bounce', shake: 'Shake',
  'normal-cut': 'Normal Cut', 'black-separator': 'Black Separator', 'soft-separator': 'Soft Separator'});
export async function bindEditingFileV001(file) {
  const info = await lstat(file);
  demand(info.isFile() && !info.isSymbolicLink(), '登録ファイルが通常ファイルではありません');
  const digest = createHash('sha256'); let size = 0;
  for await (const chunk of createReadStream(file)) {size += chunk.length; digest.update(chunk);}
  return {path: path.resolve(file), bytes: size, fileSha256: digest.digest('hex')};
}
export async function assertEditingFileV001(ref) {
  const actual = await bindEditingFileV001(ref.path);
  demand(actual.fileSha256 === ref.fileSha256 && (ref.bytes === undefined || actual.bytes === ref.bytes),
    '登録ファイルの内容が変わっています', 'EDITING_BINDING_CHANGED');
  return actual;
}
async function ordinary(file, directory = false) {
  const info = await lstat(file);
  demand(!info.isSymbolicLink() && (directory ? info.isDirectory() : info.isFile()), '保存先の種類が変わっています');
  return info;
}
async function readUnlocked(directory, drawingRulesRef) {
  demand(drawingRulesRef && /^[a-f0-9]{64}$/.test(drawingRulesRef.canonicalSha256), '描画規則の識別が必要です');
  await ordinary(directory, true);
  const manifest = await parse(path.join(directory, 'document.json'));
  demand(manifest.schemaVersion === 'presentation-editing-document-v001', '編集状態の版が異なります');
  for (const ref of manifest.fixedFiles) {
    demand(fixedNames.includes(ref.name) || ref.name === 'original-drawing-evidence.json', '固定入力名が不正です');
    const file = path.join(directory, ref.name); await ordinary(file);
    demand(sha(await readFile(file)) === ref.fileSha256, '固定自動案または元入力が変わっています', 'EDITING_FIXED_CHANGED');
  }
  const state = {};
  for (const name of stateNames) {await ordinary(path.join(directory, name + '.json')); state[name] = await parse(path.join(directory, name + '.json'));}
  const source = await parse(path.join(directory, 'source-bindings.json'));
  demand(same(await parse(path.join(directory, 'fresh-input.json')), state.selectionRecord.input)
    && await readFile(path.join(directory, 'raw-ai-response-v001.json'), 'utf8') === state.selectionRecord.replyBytes,
  '固定判断の根拠が変わっています');
  const context = createOrchestrationContextV001(source);
  const view = resolveOrchestrationDrawingViewV001({context, state});
  const revision = hashEditingValueV001({viewSha256: view.viewSha256, drawingRulesRef});
  const times = await Promise.all(['captionOverrides', 'connectionOverrides'].map(name => stat(path.join(directory, name + '.json'))));
  const savedStateToken = hashEditingValueV001(times.map(row =>
    ['dev', 'ino', 'size', 'mtimeMs', 'ctimeMs'].map(key => row[key])));
  return {directory, manifest, source, context, state, view, drawingRulesRef: clone(drawingRulesRef), revision, savedStateToken,
    savedAt: new Date(Math.max(...times.map(row => row.mtimeMs))).toISOString()};
}
const queues = new Map();
async function acquireLock(directory, name = '.write-lock') {
  const lock = path.join(directory, name), pending = path.join(directory, name + '-pending-' + randomUUID());
  const owner = `owner-${process.pid}-${randomUUID()}.json`;
  await mkdir(pending);
  await writeFile(path.join(pending, owner), bytes({pid: process.pid}), {flag: 'wx', mode: 0o600});
  const publish = () => rename(pending, lock);
  try {
    try {await publish();} catch (error) {
      if (!['EEXIST', 'ENOTEMPTY'].includes(error.code)) throw error;
      await ordinary(lock, true);
      const names = await readdir(lock), match = names.length === 1 && /^owner-(\d+)-[a-f0-9-]+\.json$/.exec(names[0]);
      demand(match, '別の保存処理が使用中です。保存状態は変更していません。', 'EDITING_BUSY');
      await ordinary(path.join(lock, names[0]));
      const pid = Number(match[1]); let dead = false;
      try {process.kill(pid, 0);} catch (probe) {dead = probe.code === 'ESRCH';}
      demand(dead, '別の保存処理が使用中です。保存状態は変更していません。', 'EDITING_BUSY');
      // Only the process which removes this exact dead owner's unique file may
      // remove the empty directory. It can never unlink a replacement owner.
      await unlink(path.join(lock, names[0]));
      try {await rmdir(lock);} catch (cleanup) {if (!['ENOENT', 'ENOTEMPTY'].includes(cleanup.code)) throw cleanup;}
      await publish();
    }
  } catch (error) {
    await unlink(path.join(pending, owner)); await rmdir(pending);
    if (['EEXIST', 'ENOTEMPTY', 'ENOENT'].includes(error.code)) demand(false, '保存処理が競合しました。再読込みしてください。', 'EDITING_BUSY');
    throw error;
  }
  return async () => {
    await unlink(path.join(lock, owner));
    try {await rmdir(lock);} catch (error) {if (!['ENOTEMPTY', 'ENOENT'].includes(error.code)) throw error;}
  };
}
export const acquireEditingServiceLockV001 = directory => acquireLock(directory, '.service-lock');
/** Local requests queue; a nonempty directory lock also serializes processes.
 * Recovery requires positive evidence that its exact owning process exited. */
async function locked(directory, task) {
  const previous = queues.get(directory) ?? Promise.resolve();
  const pending = previous.catch(() => {}).then(async () => {
    const release = await acquireLock(directory);
    try {return await task();} finally {await release();}
  });
  queues.set(directory, pending);
  try {return await pending;} finally {if (queues.get(directory) === pending) queues.delete(directory);}
}
export async function initializeEditingWorkspaceV001({directory, savedInputDirectory, title, originalMedia,
  originalDrawingRulesRef, backgroundProofPath, drawingRulesRef}) {
  demand(path.isAbsolute(directory) && path.isAbsolute(savedInputDirectory) && typeof title === 'string' && title.length > 0,
    '登録済みの編集対象が必要です');
  await assertEditingFileV001(originalMedia);
  const source = await parse(path.join(savedInputDirectory, 'source-bindings.json')), state = {};
  for (const name of stateNames) state[name] = await parse(path.join(savedInputDirectory, name + '.json'));
  const context = createOrchestrationContextV001(source), view = resolveOrchestrationDrawingViewV001({context, state});
  demand(state.captionOverrides.entries.length === 0 && state.connectionOverrides.entries.length === 0,
    '新しい編集作業は保存済みの無修正自動案から開始します');
  await mkdir(directory);
  const fixedFiles = [];
  for (const name of fixedNames) {
    const content = await readFile(path.join(savedInputDirectory, name));
    await writeFile(path.join(directory, name), content, {flag: 'wx', mode: 0o600});
    fixedFiles.push({name, fileSha256: sha(content)});
  }
  for (const name of ['captionOverrides', 'connectionOverrides'])
    await writeFile(path.join(directory, name + '.json'), bytes(state[name]), {flag: 'wx', mode: 0o600});
  const originalEvidence = bytes(exportOrchestrationDrawingViewEvidenceV001(view));
  await writeFile(path.join(directory, 'original-drawing-evidence.json'), originalEvidence, {flag: 'wx', mode: 0o600});
  fixedFiles.push({name: 'original-drawing-evidence.json', fileSha256: sha(originalEvidence)});
  const manifest = {schemaVersion: 'presentation-editing-document-v001', title, createdAt: new Date().toISOString(),
    fixedFiles, originalMedia: {...originalMedia, id: 'original', kind: 'full',
      range: {startFrame: 0, endFrameExclusive: view.projection.displayFrameCount},
      viewSha256: view.viewSha256, revision: hashEditingValueV001({viewSha256: view.viewSha256, drawingRulesRef: originalDrawingRulesRef}),
      drawingRulesRef: originalDrawingRulesRef}, backgroundProofPath,
    retention: 'User overrides are durable editing records. They are not disposable preview cache.'};
  await mkdir(path.join(directory, 'jobs')); await mkdir(path.join(directory, 'media'));
  await writeFile(path.join(directory, 'document.json'), bytes(manifest), {flag: 'wx', mode: 0o600});
  return readEditingWorkspaceV001({directory, drawingRulesRef});
}
export const readEditingWorkspaceV001 = ({directory, drawingRulesRef}) => locked(directory, () => readUnlocked(directory, drawingRulesRef));

/** Browser selection offsets refer to the exact displayed source string. */
export function editingColorChoiceV001(text, selection) {
  demand(exact(selection, ['preset', 'scope', 'startUtf16', 'endUtf16', 'selectedText'])
    && selection.preset === 'color' && selection.scope === 'partial-caption', 'Colorの範囲指定が不正です');
  const {startUtf16: start, endUtf16: end, selectedText} = selection;
  demand(Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && end > start && end <= text.length,
    '文字列上で一つの連続範囲を選んでください');
  demand(text.slice(start, end) === selectedText && /[^\r\n]/u.test(selectedText), '選択文字列が元の字幕と一致しません');
  const boundaries = new Set([text.length, ...Array.from(new Intl.Segmenter('ja', {granularity: 'grapheme'}).segment(text), row => row.index)]);
  demand(boundaries.has(start) && boundaries.has(end), '結合文字や絵文字の途中を指定できません');
  const positions = [];
  for (let offset = 0; offset <= text.length;) {
    const found = text.indexOf(selectedText, offset); if (found < 0) break;
    positions.push(found); offset = found + 1;
  }
  const occurrence = positions.indexOf(start) + 1;
  demand(occurrence > 0, '選択した文字の出現位置が一致しません');
  return {preset: 'color', scope: 'partial-caption', targetText: selectedText, occurrence};
}
function normalizedSelection(snapshot, kind, itemId, selection) {
  if (kind === 'caption' && exact(selection, ['preset']) && selection.preset === 'normal') return 'Normal';
  if (kind === 'caption' && selection?.preset === 'color' && selection.scope === 'partial-caption') {
    const element = JSON.parse(snapshot.source.planBytes).elements.find(row => row.instructionId === itemId);
    demand(element, '字幕が見つかりません');
    return editingColorChoiceV001(element.text, selection);
  }
  return selection;
}
async function replaceOne(directory, name, content) {
  const temporary = path.join(directory, '.' + name + '.' + randomUUID() + '.pending');
  const file = await open(temporary, 'wx', 0o600);
  try {await file.writeFile(content); await file.sync();} finally {await file.close();}
  // Both files are on the same directory/filesystem. A crash leaves the old or
  // new complete file; a pending file is never treated as saved state.
  await rename(temporary, path.join(directory, name));
  const parent = await open(directory, 'r'); try {await parent.sync();} finally {await parent.close();}
}
const applicabilityReason = result => {
  const codes = new Set(result.violations.map(row => row.code));
  if (codes.has('LAYOUT_SAFE_AREA_VIOLATION')) return 'この表現では字幕の表示領域が安全域からはみ出します';
  if (codes.has('LAYOUT_LINE_POSITIVE_INTERSECTION')) return 'この表現では字幕の行どうしが重なります';
  if (codes.has('INSTRUCTION_TEMPORAL_SPATIAL_COLLISION')) return 'この表現では同時に表示する字幕と重なります';
  if (codes.has('LAYOUT_LINE_COUNT_EXCEEDED')) return 'この表現では表示できる行数を超えます';
  if (codes.has('CAPTION_MOTION_NATIVE_STATE_MISMATCH')) return 'この配置では字幕の移動または拡大を指定どおりに表示できません';
  if (codes.has('PULSE_NATIVE_STATE_MISMATCH')) return 'この配置では拍に合わせた字幕の拡大を指定どおりに表示できません';
  return 'この表現の実際の書体・表示領域を確認できませんでした';
};
const physicallyInapplicable = new Set(['LAYOUT_SAFE_AREA_VIOLATION', 'LAYOUT_LINE_POSITIVE_INTERSECTION',
  'INSTRUCTION_TEMPORAL_SPATIAL_COLLISION', 'LAYOUT_LINE_COUNT_EXCEEDED']);
const isPhysicalRejection = violation => physicallyInapplicable.has(violation.code)
  || violation.code === 'CAPTION_MOTION_NATIVE_STATE_MISMATCH'
    && violation.details?.reason === 'Caption motion: a native state was clamped or its fixed centre/bottom displacement changed'
  || violation.code === 'PULSE_NATIVE_STATE_MISMATCH'
    && violation.details?.reason === 'Pulse Accent: a pulse state would move the existing horizontal centre or bottom anchor';
const timeFailureReasons = new Map([
  ['Pulse Accent: the measured peak itself is outside the caption', 'この実測ピークは字幕の表示時間に含まれません'],
  ['Pulse Accent: the complete pulse and visible normal return do not fit this peak', 'この実測ピークでは拡大と通常表示への復帰が字幕の表示時間に収まりません'],
  ['Caption motion: the complete entrance, eight fully visible stable frames and common exit fade do not fit', 'この字幕の表示時間では動きと通常表示への復帰を完了できません'],
]);
function prepareSelection(snapshot, kind, itemId, selection) {
  demand(['caption', 'connection'].includes(kind) && typeof itemId === 'string', '変更対象が不正です');
  const next = editOrchestrationOverrideV001({context: snapshot.context, state: snapshot.state, kind, itemId,
    selection: normalizedSelection(snapshot, kind, itemId, selection)});
  const view = resolveOrchestrationDrawingViewV001({context: snapshot.context, state: next});
  return {next, view};
}
async function inspectSelection(snapshot, kind, itemId, selection, applicabilityOptions) {
  let prepared;
  try {prepared = prepareSelection(snapshot, kind, itemId, selection);}
  catch (error) {
    const reason = timeFailureReasons.get(error.message);
    if (reason) return {status: 'inapplicable', reason};
    throw error;
  }
  if (kind === 'connection') return {...prepared, status: 'applicable'};
  try {
    const result = await inspectEditingCaptionApplicabilityV001({plan: prepared.view.resolvedPlan, targetId: itemId,
      drawingRulesRef: snapshot.drawingRulesRef, options: applicabilityOptions});
    const status = result.status === 'passed' ? 'applicable'
      : result.violations.length && result.violations.every(isPhysicalRejection) ? 'inapplicable' : 'failed';
    return {...prepared, status, result, ...(status === 'applicable' ? {} : {reason: applicabilityReason(result)})};
  } catch (error) {
    return {...prepared, status: error.code === 'EDITING_APPLICABILITY_STALE' ? 'stale' : 'failed',
      reason: error.code === 'EDITING_APPLICABILITY_STALE' ? error.message
        : 'この表現の実際の書体・表示領域を確認できませんでした'};
  }
}
export const editingSelectionCheckKeyV001 = ({revision, kind, itemId, selection}) =>
  hashEditingValueV001({revision, kind, itemId, selection});
const completedCheckConditions = new WeakMap();
export async function revalidateEditingSelectionCheckV001({snapshot, check}) {
  if (check.revision !== snapshot.revision) return {...check, status: 'stale', reason: '保存状態が変わったため、もう一度確認してください'};
  const condition = completedCheckConditions.get(check);
  try {
    demand(condition && condition.savedStateToken === snapshot.savedStateToken, '検査後に保存状態が変わりました');
    if (check.kind === 'caption') {
      if (condition.result) await assertEditingCaptionApplicabilityCurrentV001({plan: condition.view.resolvedPlan, targetId: check.itemId,
        drawingRulesRef: snapshot.drawingRulesRef, result: condition.result, requirePassed: check.status === 'applicable'});
      else await assertEditingApplicabilityRulesCurrentV001(snapshot.drawingRulesRef);
    }
    return check;
  } catch {return {...check, status: 'stale', reason: '検査後に入力・描画規則・観測が変わったため、もう一度確認してください'};}
}
/** Inspect only the exact selected expression; its caller receives no implicit
 * substitute expression and no unchecked physical success. */
export async function checkEditingSelectionV001({directory, drawingRulesRef, expectedRevision, kind, itemId, selection,
  applicabilityOptions}) {
  const snapshot = await readEditingWorkspaceV001({directory, drawingRulesRef});
  demand(snapshot.revision === expectedRevision, '保存状態が変わりました。読み直してから確認してください。', 'EDITING_CONFLICT');
  const checked = await inspectSelection(snapshot, kind, itemId, selection, applicabilityOptions);
  const current = await readEditingWorkspaceV001({directory, drawingRulesRef});
  demand(current.revision === snapshot.revision && current.savedStateToken === snapshot.savedStateToken,
    '確認中に保存状態が変わりました。読み直してから確認してください。', 'EDITING_CONFLICT');
  const answer = {revision: snapshot.revision, kind, itemId, selection: clone(selection),
    checkKey: editingSelectionCheckKeyV001({revision: snapshot.revision, kind, itemId, selection}),
    status: checked.status, ...(checked.reason ? {reason: checked.reason} : {}),
    ...(checked.result ? {physicalCheck: {status: checked.result.status, reused: checked.result.reused,
      nativeStateCount: checked.result.nativeStateCount, elapsedMilliseconds: checked.result.elapsedMilliseconds}} : {})};
  completedCheckConditions.set(answer, {savedStateToken: snapshot.savedStateToken, view: checked.view, result: checked.result});
  return answer;
}
export async function saveEditingOverrideV001({directory, drawingRulesRef, expectedRevision, kind, itemId, selection,
  applicabilityOptions}) {
  const snapshot = await readEditingWorkspaceV001({directory, drawingRulesRef});
  demand(snapshot.revision === expectedRevision, '別の保存が先に完了しました。読み直してから変更してください。', 'EDITING_CONFLICT');
  const checked = await inspectSelection(snapshot, kind, itemId, selection, applicabilityOptions);
  demand(checked.status === 'applicable', checked.reason, checked.status === 'inapplicable' ? 'EDITING_NOT_APPLICABLE'
    : checked.status === 'stale' ? 'EDITING_APPLICABILITY_STALE' : 'EDITING_APPLICABILITY_UNVERIFIED');
  return locked(directory, async () => {
    const current = await readUnlocked(directory, drawingRulesRef);
    demand(current.revision === snapshot.revision && current.savedStateToken === snapshot.savedStateToken,
      '検査中に別の保存が先に完了しました。読み直してから変更してください。', 'EDITING_CONFLICT');
    const {next, view} = prepareSelection(current, kind, itemId, selection);
    demand(same(next, checked.next) && view.viewSha256 === checked.view.viewSha256,
      '検査中に編集条件が変わりました。保存状態は変更していません。', 'EDITING_CONFLICT');
    if (kind === 'caption') {
      try {await assertEditingCaptionApplicabilityCurrentV001({plan: view.resolvedPlan, targetId: itemId,
        drawingRulesRef, result: checked.result});}
      catch (error) {throw Object.assign(new Error('検査後に描画規則または観測が変わりました。保存状態は変更していません。', {cause: error}),
        {code: 'EDITING_CONFLICT'});}
    }
    const changedName = kind === 'caption' ? 'captionOverrides' : 'connectionOverrides';
    for (const name of stateNames.filter(name => name !== changedName)) demand(same(next[name], snapshot.state[name]), '一件の保存が別の系統を変更しました');
    if (!same(next[changedName], snapshot.state[changedName])) await replaceOne(directory, changedName + '.json', bytes(next[changedName]));
    return readUnlocked(directory, drawingRulesRef);
  });
}
function choiceFromSelection(selection) {
  if (selection.role === 'Panel accent') {
    const preset = {'provisional-panel': 'panel', 'provisional-panel-graph-paper': 'panel-graph-paper',
      'provisional-panel-comic-frame': 'panel-comic-frame'}[selection.presentation];
    demand(preset, 'Panel背景の種類を表示できません');
    return {preset, ...(selection.paletteId === undefined ? {} : {paletteId: selection.paletteId})};
  }
  const preset = rolePreset[selection.role]; demand(preset, '表現の種類を表示できません');
  if (preset === 'color') return {preset, scope: selection.scope, ...(selection.scope === 'partial-caption'
    ? {targetText: selection.targetText, occurrence: selection.occurrence} : {})};
  if (preset === 'pulse') return {preset, anchorPeakId: selection.anchorPeakId};
  return {preset};
}
export function editingTargetListV001(snapshot) {
  const {view, state} = snapshot, labels = EDITING_PRESET_LABELS_V001;
  const captions = view.resolvedPlan.elements.map(row => {
    const selected = view.resolution.caption.captions.find(entry => entry.captionId === row.instructionId);
    const status = selected.hasOverride ? 'edited' : selected.automaticStatus;
    const choice = choiceFromSelection(selected.effectiveSelection), preset = choice.preset;
    return {id: row.instructionId, text: row.text, startFrame: row.startFrame, endFrameExclusive: row.endFrameExclusive,
      preset, presetLabel: labels[preset] + (choice.paletteId ? ` / ${PRESENTATION_PANEL_PALETTES_V003[choice.paletteId].label}` : ''),
      hasOverride: selected.hasOverride, status,
      statusLabel: selected.hasOverride ? '変更あり' : status === 'unresolved' ? '未解決' : status === 'unrepresentable' ? '自動案は適用不能' : '自動案'};
  });
  const connections = view.projection.connections.map(row => {
    const input = state.selectionRecord.input.connections.find(entry => entry.connectionId === row.connectionId);
    const inserted = view.projection.insertedSpans.find(entry => entry.connectionId === row.connectionId);
    const boundaryFrame = inserted?.displayStartFrame ?? projectOriginalFrameV001({projection: view.projection,
      point: {clock: 'digest-original', sourceClockSha256: view.projection.sourceClockSha256, frame: row.boundaryFrame}}).displayFrame;
    const hasOverride = state.connectionOverrides.entries.some(entry => entry.connectionId === row.connectionId);
    const fixed = state.selectionRecord.connections.find(entry => entry.connectionId === row.connectionId);
    return {id: row.connectionId, beforeText: captions.find(entry => entry.id === input.beforeCaptionId)?.text ?? '',
      afterText: captions.find(entry => entry.id === input.afterCaptionId)?.text ?? '', boundaryFrame,
      preset: row.preset, presetLabel: labels[row.preset], hasOverride, status: hasOverride ? 'edited' : fixed.status,
      statusLabel: hasOverride ? '変更あり' : fixed.status === 'unresolved' ? '未解決' : fixed.status === 'unrepresentable' ? '自動案は適用不能' : '自動案'};
  });
  return {captions, connections};
}
export async function editingTargetDetailsV001(snapshot, kind, itemId) {
  const lists = editingTargetListV001(snapshot), labels = EDITING_PRESET_LABELS_V001;
  demand(['caption', 'connection'].includes(kind), '対象種別が不正です');
  const target = lists[kind === 'caption' ? 'captions' : 'connections'].find(row => row.id === itemId);
  demand(target, '対象が見つかりません');
  if (kind === 'connection') return {...target, kind, revision: snapshot.revision, selection: target.preset,
    peakOptions: [], options: ['normal-cut', 'black-separator', 'soft-separator'].map(value => {
      try {editOrchestrationOverrideV001({context: snapshot.context, state: snapshot.state, kind, itemId, selection: value});
        return {value, label: labels[value], status: 'applicable'};}
      catch {return {value, label: labels[value], status: 'failed', reason: 'この接続表現の適用条件を確認できませんでした'};}
    })};
  const element = JSON.parse(snapshot.source.planBytes).elements.find(row => row.instructionId === itemId);
  const current = snapshot.view.resolution.caption.captions.find(row => row.captionId === itemId);
  const peakOptions = [];
  for (const peak of snapshot.source.captionContext.pulseTimingEvidence?.peaks ?? []) {
    let status = 'unchecked', reason;
    try {resolvePresentationPulseTimingV001({element, canvas: snapshot.view.projectedNormalPlan.canvas,
      peakSample: peak.peakSample, sampleRate: snapshot.source.observationSampleRate});}
    catch (error) {
      // Only a known timing rejection excludes a measured peak. A broken
      // inspection cannot become evidence that no measured peak exists.
      if (timeFailureReasons.has(error.message)) continue;
      status = 'failed'; reason = 'この実測ピークの表示時刻条件を確認できませんでした';
    }
    const projected = projectAudioPeakV001({projection: snapshot.view.projection, peak: {clock: 'digest-original',
      sourceClockSha256: snapshot.view.projection.sourceClockSha256, peakId: peak.peakId,
      sample: peak.peakSample, sampleRate: snapshot.source.observationSampleRate}});
    const displaySeconds = projected.displaySample / projected.sampleRate;
    peakOptions.push({id: peak.peakId, displaySeconds, label: `音声のピーク ${displaySeconds.toFixed(3)}秒`,
      status, ...(reason ? {reason} : {})});
  }
  const options = ['normal', 'color', 'scale', 'panel', 'panel-graph-paper', 'pulse', 'bounce', 'shake'].map(value =>
    ({value, label: labels[value], status: value === 'pulse' && peakOptions.length === 0 ? 'inapplicable' : 'unchecked',
      ...(value === 'pulse' && peakOptions.length === 0 ? {reason: 'この字幕の表示時刻条件を満たす実測ピークがありません'} : {})}));
  let colorRange;
  if (current.canonicalRange) {
    const points = Array.from(element.text);
    colorRange = {startUtf16: points.slice(0, current.canonicalRange.startCodePoint).join('').length,
      endUtf16: points.slice(0, current.canonicalRange.endCodePointExclusive).join('').length};
  }
  const selection = choiceFromSelection(current.effectiveSelection);
  const publicSelection = selection.preset === 'color' && selection.scope === 'partial-caption'
    ? {preset: 'color', scope: 'partial-caption', ...colorRange,
      selectedText: element.text.slice(colorRange.startUtf16, colorRange.endUtf16)} : selection;
  return {...target, kind, revision: snapshot.revision, selection: publicSelection,
    options, peakOptions,
    paletteOptions: snapshot.source.captionContext.renderingRulesRef.version === 'auto-presentation-rules-v009'
      ? Object.values(PRESENTATION_PANEL_PALETTES_V003).map(row => ({id: row.id, label: row.label,
        backgroundColor: row.backgroundColor, fontColor: row.fontColor})) : [],
    ...(colorRange ? {colorRange} : {})};
}
export async function writeEditingSnapshotV001({snapshot, outputDirectory}) {
  await mkdir(outputDirectory);
  const evidencePath = path.join(outputDirectory, 'drawing-evidence.json');
  await writeFile(evidencePath, bytes(exportOrchestrationDrawingViewEvidenceV001(snapshot.view)), {flag: 'wx', mode: 0o600});
  for (const name of stateNames) await writeFile(path.join(outputDirectory, name + '.json'), bytes(snapshot.state[name]), {flag: 'wx', mode: 0o600});
  await writeFile(path.join(outputDirectory, 'binding.json'), bytes({revision: snapshot.revision, drawingRulesRef: snapshot.drawingRulesRef,
    viewSha256: snapshot.view.viewSha256, projectionSha256: snapshot.view.projection.projectionSha256,
    fourSavedSha256: snapshot.view.fourSavedSha256}), {flag: 'wx', mode: 0o600});
  return bindEditingFileV001(evidencePath);
}
