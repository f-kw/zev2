/** Durable one-item edits. Fixed automatic records are never rewritten. */
import {createHash, randomUUID} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat, mkdir, open, readFile, readdir, rename, rmdir, stat, unlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {createOrchestrationContextV001, resolveOrchestrationDrawingViewV001,
  editOrchestrationOverrideV001, exportOrchestrationDrawingViewEvidenceV001,
  orchestrationCaptionChoiceToSelectionV001} from './presentation_orchestration_v001.mjs';
import {materializeFiniteAutoPresentationCaptionV001} from './presentation_auto_effects_v001.mjs';
import {projectOriginalFrameV001, projectAudioPeakV001} from './presentation_orchestration_projection_v001.mjs';

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
  scale: 'Scale', panel: 'Panel', pulse: 'Pulse', bounce: 'Bounce', shake: 'Shake',
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
  return {directory, manifest, source, context, state, view, drawingRulesRef: clone(drawingRulesRef), revision,
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
export async function saveEditingOverrideV001({directory, drawingRulesRef, expectedRevision, kind, itemId, selection}) {
  return locked(directory, async () => {
    const snapshot = await readUnlocked(directory, drawingRulesRef);
    demand(snapshot.revision === expectedRevision, '別の保存が先に完了しました。読み直してから変更してください。', 'EDITING_CONFLICT');
    demand(['caption', 'connection'].includes(kind) && typeof itemId === 'string', '変更対象が不正です');
    const next = editOrchestrationOverrideV001({context: snapshot.context, state: snapshot.state, kind, itemId,
      selection: normalizedSelection(snapshot, kind, itemId, selection)});
    resolveOrchestrationDrawingViewV001({context: snapshot.context, state: next});
    const changedName = kind === 'caption' ? 'captionOverrides' : 'connectionOverrides';
    for (const name of stateNames.filter(name => name !== changedName)) demand(same(next[name], snapshot.state[name]), '一件の保存が別の系統を変更しました');
    if (!same(next[changedName], snapshot.state[changedName])) await replaceOne(directory, changedName + '.json', bytes(next[changedName]));
    return readUnlocked(directory, drawingRulesRef);
  });
}
function choiceFromSelection(selection) {
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
    const preset = rolePreset[selected.effectiveSelection.role];
    return {id: row.instructionId, text: row.text, startFrame: row.startFrame, endFrameExclusive: row.endFrameExclusive,
      preset, presetLabel: labels[preset], hasOverride: selected.hasOverride, status,
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
export function editingTargetDetailsV001(snapshot, kind, itemId) {
  const lists = editingTargetListV001(snapshot), labels = EDITING_PRESET_LABELS_V001;
  demand(['caption', 'connection'].includes(kind), '対象種別が不正です');
  const target = lists[kind === 'caption' ? 'captions' : 'connections'].find(row => row.id === itemId);
  demand(target, '対象が見つかりません');
  if (kind === 'connection') return {...target, kind, revision: snapshot.revision, selection: target.preset,
    peakOptions: [], options: ['normal-cut', 'black-separator', 'soft-separator'].map(value => {
      try {editOrchestrationOverrideV001({context: snapshot.context, state: snapshot.state, kind, itemId, selection: value});
        return {value, label: labels[value], enabled: true};}
      catch (error) {return {value, label: labels[value], enabled: false, reason: String(error.message)};}
    })};
  const element = JSON.parse(snapshot.source.planBytes).elements.find(row => row.instructionId === itemId);
  const current = snapshot.view.resolution.caption.captions.find(row => row.captionId === itemId);
  const check = choice => {
    const selection = orchestrationCaptionChoiceToSelectionV001(choice);
    const peak = snapshot.source.captionContext.pulseTimingEvidence?.peaks.find(row => row.peakId === choice.anchorPeakId);
    materializeFiniteAutoPresentationCaptionV001({element, canvas: snapshot.view.projectedNormalPlan.canvas, selection,
      ...(choice.preset === 'pulse' ? {measuredPeak: peak ? {peakId: peak.peakId, peakSample: peak.peakSample,
        sampleRate: snapshot.source.observationSampleRate} : null} : {})});
  };
  const peakOptions = (snapshot.source.captionContext.pulseTimingEvidence?.peaks ?? []).flatMap(peak => {
    try {check({preset: 'pulse', anchorPeakId: peak.peakId});} catch {return [];}
    const projected = projectAudioPeakV001({projection: snapshot.view.projection, peak: {clock: 'digest-original',
      sourceClockSha256: snapshot.view.projection.sourceClockSha256, peakId: peak.peakId,
      sample: peak.peakSample, sampleRate: snapshot.source.observationSampleRate}});
    const displaySeconds = projected.displaySample / projected.sampleRate;
    return [{id: peak.peakId, displaySeconds, label: `音声のピーク ${displaySeconds.toFixed(3)}秒`}];
  });
  const options = ['normal', 'color', 'scale', 'panel', 'pulse', 'bounce', 'shake'].map(value => {
    const choice = value === 'color' ? {preset: value, scope: 'whole-caption'} : value === 'pulse'
      ? {preset: value, anchorPeakId: peakOptions[0]?.id} : {preset: value};
    try {check(choice); return {value, label: labels[value], enabled: true};}
    catch (error) {return {value, label: labels[value], enabled: false,
      reason: value === 'pulse' && peakOptions.length === 0 ? 'この字幕の表示中に使える実測ピークがありません' : String(error.message)};}
  });
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
    options, peakOptions, ...(colorRange ? {colorRange} : {})};
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
