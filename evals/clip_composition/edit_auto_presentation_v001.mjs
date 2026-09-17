import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {loadAutoPresentationV001, saveAutoPresentationOverridesV001} from './presentation_auto_effects_io_v001.mjs';
import {createAutoPresentationOverridesV001, editAutoPresentationOverrideV001,
  resolveAutoPresentationV001} from './presentation_auto_effects_v001.mjs';
import {resolvePresentationPulseTimingV001} from './presentation_pulse_v001.mjs';

const fail = message => { throw new TypeError(message); };
const own = (value, key) => Object.hasOwn(value, key);
const colorSelection = {role: 'Focus', presentation: 'provisional-focus', scope: 'whole-caption'};
const scaleSelection = {role: 'Vocal accent', presentation: 'provisional-vocal', scope: 'whole-caption'};
const panelSelection = {role: 'Panel accent', presentation: 'provisional-panel', scope: 'whole-caption'};
const bounceSelection = {role: 'Bounce accent', presentation: 'provisional-bounce', scope: 'whole-caption'};
const shakeSelection = {role: 'Shake accent', presentation: 'provisional-shake', scope: 'whole-caption'};

export const AUTO_PRESENTATION_EDIT_HELP = `字幕一件の演出を確認・修正します。
node evals/clip_composition/edit_auto_presentation_v001.mjs <操作> \\
  --baseline <固定通常計画> --decision-input <判断入力> \\
  [--auto <固定自動案>] [--overrides <現在の人修正>] \\
  [--caption-id <表示字幕ID> | --time <秒 または HH:MM:SS.mmm> | --text <本文の完全一致部分>]

操作:
  show     候補と現在状態を表示（検索なしなら全字幕）
  normal   Normal固定
  color    全文Color Accent
  scale    全文Scale Accent
  panel    全文Panel Accent（仮称）
  bounce   全文Bounce Accent（仮称）: 字幕出現時に弾み、通常表示へ戻る
  shake    全文Shake Accent（仮称）: 字幕出現時に短く左右へ揺れ、通常位置へ戻る
  pulse    全文Pulse Accent（仮称）: --peak <既存の音響ピークID>
  partial  部分Color Accent: --target <原文どおりの連続文字列> [--occurrence <1からの出現番号>]
  reset    この一件のoverrideを削除し、保存済み自動案へ戻す

修正には検索条件と --output <新しい人修正ファイル> が必要です。
複数候補では候補一覧を表示して停止します。表示されたIDで再指定してください。
既存ファイルは上書きしません。保存後は --overrides に新しいファイルを渡してください。
--text / --target は文字の正規化・近似一致を行いません。時刻の終了端は対象外です。
pulse の --peak が未指定・不適格なら、使えるIDを表示して保存せず停止します。
--time は字幕検索専用です。Pulseの時刻・倍率・長さは指定できません。`;

export function parseAutoPresentationEditArgsV001(argv) {
  if (argv.length === 1 && ['--help', '-h'].includes(argv[0])) return {help: true};
  const [action, ...args] = argv;
  if (!['show', 'normal', 'color', 'scale', 'panel', 'pulse', 'bounce', 'shake', 'partial', 'reset'].includes(action)) fail('操作は show / normal / color / scale / panel / pulse / bounce / shake / partial / reset から指定してください。');
  const names = new Map([
    ['--baseline', 'baselinePath'], ['--decision-input', 'decisionInputPath'],
    ['--auto', 'autoProposalPath'], ['--overrides', 'overridesPath'], ['--output', 'outputPath'],
    ['--caption-id', 'captionId'], ['--time', 'time'], ['--text', 'text'],
    ['--target', 'targetText'], ['--occurrence', 'occurrence'],
    ['--peak', 'anchorPeakId'],
  ]);
  const parsed = {action};
  for (let index = 0; index < args.length; index += 2) {
    const key = names.get(args[index]);
    if (!key || own(parsed, key)) fail(`未知または重複した引数: ${args[index]}`);
    const value = args[index + 1];
    if (value === undefined || value.length === 0) fail(`${args[index]} に値が必要です。`);
    parsed[key] = value;
  }
  if (!parsed.baselinePath || !parsed.decisionInputPath) fail('--baseline と --decision-input が必要です。');
  const queryKeys = ['captionId', 'time', 'text'].filter(key => own(parsed, key));
  if (queryKeys.length > 1) fail('検索方法は表示字幕ID、時刻、本文のいずれか一つを指定してください。');
  if (action !== 'show' && (queryKeys.length !== 1 || !parsed.outputPath)) fail('修正には検索条件一つと --output が必要です。');
  if (action === 'show' && parsed.outputPath) fail('show は保存しません。--output を外してください。');
  if (action === 'partial' && !own(parsed, 'targetText')) fail('部分Color Accentには --target が必要です。');
  if (action !== 'partial' && (own(parsed, 'targetText') || own(parsed, 'occurrence'))) fail('--target と --occurrence は partial 専用です。');
  if (action !== 'pulse' && own(parsed, 'anchorPeakId')) fail('--peak は pulse 専用です。');
  if (own(parsed, 'occurrence')) {
    if (!/^[1-9][0-9]*$/.test(parsed.occurrence) || !Number.isSafeInteger(Number(parsed.occurrence))) fail('出現番号は1以上の整数を指定してください。');
    parsed.occurrence = Number(parsed.occurrence);
  }
  if (own(parsed, 'time')) {
    let seconds;
    if (/^[0-9]+(?:\.[0-9]+)?$/.test(parsed.time)) seconds = Number(parsed.time);
    else {
      const match = /^([0-9]+):([0-5][0-9]):([0-5][0-9](?:\.[0-9]+)?)$/.exec(parsed.time);
      if (!match) fail('時刻は0以上の秒、または HH:MM:SS.mmm で指定してください。');
      seconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
    }
    if (!Number.isFinite(seconds)) fail('時刻が範囲外です。');
    parsed.timeSeconds = seconds;
    delete parsed.time;
  }
  return parsed;
}

const selectionDescription = selection => selection?.role === 'Vocal accent'
  ? {role: 'Vocal accent', scope: 'whole-caption'}
  : ['Panel accent', 'Bounce accent', 'Shake accent'].includes(selection?.role)
  ? {role: selection.role, scope: 'whole-caption'}
  : selection?.role === 'Pulse accent'
  ? {role: 'Pulse accent', scope: 'whole-caption', anchorPeakId: selection.anchorPeakId}
  : selection?.role === 'Focus'
  ? {role: 'Focus', scope: selection.scope,
    ...(selection.scope === 'partial-caption' ? {targetText: selection.targetText,
      ...(selection.occurrence === undefined ? {} : {occurrence: selection.occurrence})} : {})}
  : {role: 'Normal', scope: 'none'};

/** Search only confirmed text and display time. Several matches remain several candidates. */
export function inspectAutoPresentationCaptionsV001({baselinePlan, autoPresentation, query = {}}) {
  const queryKeys = Object.keys(query);
  if (queryKeys.length > 1 || queryKeys.some(key => !['captionId', 'timeSeconds', 'text'].includes(key))) fail('検索条件はID・時刻・本文のうち一つです。');
  for (const key of ['captionId', 'text']) if (own(query, key) && (typeof query[key] !== 'string' || query[key].length === 0)) fail('検索文字列を空にはできません。');
  if (own(query, 'timeSeconds') && (typeof query.timeSeconds !== 'number' || !Number.isFinite(query.timeSeconds) || query.timeSeconds < 0)) fail('時刻は0以上の秒で指定してください。');
  const fps = baselinePlan.canvas?.fps;
  if (!Number.isFinite(fps) || fps <= 0) fail('固定通常計画に有効なフレームレートが必要です。');
  const resolved = resolveAutoPresentationV001({baselinePlan, ...autoPresentation});
  const auto = new Map((autoPresentation.autoProposal?.proposal.effects ?? []).map(row => [row.captionId, row]));
  const human = new Map((autoPresentation.overrides?.entries ?? []).map(row => [row.captionId, row]));
  const exceptions = new Map(resolved.resolution.exceptions.map(row => [row.captionId, row]));
  const states = new Map(resolved.resolution.captions.map(row => [row.captionId, row]));
  return baselinePlan.elements.filter(element => element.kind === 'speech-caption').filter(element => {
    if (own(query, 'captionId')) return element.instructionId === query.captionId;
    if (own(query, 'text')) return element.text.includes(query.text);
    if (own(query, 'timeSeconds')) return query.timeSeconds >= element.startFrame / fps
      && query.timeSeconds < element.endFrameExclusive / fps;
    return true;
  }).map(element => {
    const id = element.instructionId, state = states.get(id), override = human.get(id);
    const automatic = auto.get(id);
    const origin = override ? override.role === 'Normal' ? 'Normal fixed' : 'human override'
      : ['unresolved', 'unrepresentable'].includes(state.automaticStatus) ? 'unresolved'
      : state.automaticStatus === 'not-processed' ? 'unprocessed' : 'auto';
    return {captionId: id, startSeconds: element.startFrame / fps,
      endSecondsExclusive: element.endFrameExclusive / fps, text: element.text,
      automatic: {status: state.automaticStatus, ...selectionDescription(automatic),
        ...(exceptions.has(id) ? {reason: exceptions.get(id).reason} : {})},
      effective: selectionDescription(override ?? automatic), origin,
      hasOverride: human.has(id), canReset: human.has(id)};
  });
}

const describe = selection => selection.role === 'Normal' ? 'Normal'
  : selection.role === 'Vocal accent' ? 'Scale Accent / whole（全文）'
  : selection.role === 'Panel accent' ? 'Panel Accent（仮称） / whole（全文）'
  : selection.role === 'Bounce accent' ? 'Bounce Accent（仮称） / whole（全文） / 字幕出現時'
  : selection.role === 'Shake accent' ? 'Shake Accent（仮称） / whole（全文） / 字幕出現時'
  : selection.role === 'Pulse accent' ? `Pulse Accent（仮称） / whole（全文） / 根拠ピーク: ${selection.anchorPeakId}`
  : selection.scope === 'whole-caption' ? 'Color Accent / whole（全文）'
  : `Color Accent / partial（部分）${JSON.stringify(selection.targetText)} / occurrence=${selection.occurrence ?? '一意一致'}`;

export function formatAutoPresentationCaptionRowsV001(rows) {
  if (rows.length === 0) return '一致する表示字幕はありません。';
  return rows.map(row => [
    `ID: ${row.captionId}`,
    `時刻: ${row.startSeconds}秒以上 ～ ${row.endSecondsExclusive}秒未満`,
    `本文: ${row.text}`,
    `固定自動案: ${row.automatic.status} / ${describe(row.automatic)}${row.automatic.reason ? ` / ${row.automatic.reason}` : ''}`,
    `現在: ${describe(row.effective)} / 由来: ${row.origin}`,
    `override: ${row.hasOverride ? 'あり' : 'なし'} / Reset: ${row.canReset ? '可能' : '不要（overrideなし）'}`,
  ].join('\n')).join('\n\n');
}

/** Only already-bound measured peaks can be chosen; never infer one from text or a query time. */
function eligiblePulsePeaks({baselinePlan, autoPresentation, captionId}) {
  const evidence = autoPresentation.context.pulseTimingEvidence;
  if (evidence === null) return [];
  const element = baselinePlan.elements.find(row => row.instructionId === captionId);
  return evidence.peaks.flatMap(peak => {
    const candidateIds = evidence.candidates.filter(candidate => candidate.peakIds.includes(peak.peakId))
      .map(candidate => candidate.candidateId);
    if (candidateIds.length === 0) return [];
    try {
      resolvePresentationPulseTimingV001({element, canvas: baselinePlan.canvas,
        peakSample: peak.peakSample, sampleRate: evidence.sampleRate});
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      return [];
    }
    return [{peakId: peak.peakId, seconds: peak.peakSample / evidence.sampleRate, candidateIds}];
  });
}

/** Existing validated IO owns binding checks and exclusive, immutable output creation. */
export async function runAutoPresentationEditV001(argv, write = text => process.stdout.write(`${text}\n`)) {
  const parsed = parseAutoPresentationEditArgsV001(argv);
  if (parsed.help) { write(AUTO_PRESENTATION_EDIT_HELP); return {status: 'help'}; }
  const files = {baselinePath: parsed.baselinePath, decisionInputPath: parsed.decisionInputPath,
    ...(parsed.autoProposalPath ? {autoProposalPath: parsed.autoProposalPath} : {}),
    ...(parsed.overridesPath ? {overridesPath: parsed.overridesPath} : {})};
  const loaded = await loadAutoPresentationV001(files);
  const query = Object.fromEntries(['captionId', 'timeSeconds', 'text'].filter(key => own(parsed, key)).map(key => [key, parsed[key]]));
  const rows = inspectAutoPresentationCaptionsV001({...loaded, query});
  write(formatAutoPresentationCaptionRowsV001(rows));
  if (parsed.action === 'show') return {status: 'shown', rows};
  if (rows.length !== 1) fail(rows.length === 0 ? '対象がありません。修正を保存しませんでした。'
    : '候補が複数あります。表示字幕IDを指定してください。修正を保存しませんでした。');
  const {baselinePlan, autoPresentation} = loaded;
  if (parsed.action === 'pulse') {
    const peaks = eligiblePulsePeaks({...loaded, captionId: rows[0].captionId});
    write(`\nこの字幕でPulse Accent（仮称）に使える音響ピーク:\n${peaks.length === 0 ? '適格なピークはありません。'
      : peaks.map(peak => `ID: ${peak.peakId} / 時刻: ${peak.seconds}秒 / 音声候補: ${peak.candidateIds.join(', ')}`).join('\n')}`);
    if (!own(parsed, 'anchorPeakId')) fail('表示した適格IDを --peak で指定してください。自動選択せず、修正を保存しませんでした。');
    if (!peaks.some(peak => peak.peakId === parsed.anchorPeakId)) fail('指定された --peak はこの字幕で使用できません。表示した適格IDを指定してください。修正を保存しませんでした。');
  }
  const previous = autoPresentation.overrides ?? createAutoPresentationOverridesV001({baselinePlan, ...autoPresentation});
  const selection = parsed.action === 'normal' ? 'Normal' : parsed.action === 'reset' ? 'Reset'
    : parsed.action === 'scale' ? scaleSelection : parsed.action === 'panel' ? panelSelection
    : parsed.action === 'bounce' ? bounceSelection : parsed.action === 'shake' ? shakeSelection
    : parsed.action === 'pulse' ? {role: 'Pulse accent', presentation: 'provisional-pulse',
      scope: 'whole-caption', anchorPeakId: parsed.anchorPeakId}
    : parsed.action === 'color' ? colorSelection : {...colorSelection, scope: 'partial-caption', targetText: parsed.targetText,
      ...(parsed.occurrence === undefined ? {} : {occurrence: parsed.occurrence})};
  const overrides = editAutoPresentationOverrideV001({baselinePlan, ...autoPresentation,
    overrides: previous, captionId: rows[0].captionId, selection});
  await saveAutoPresentationOverridesV001({...files, overrides, outputPath: parsed.outputPath});
  const after = inspectAutoPresentationCaptionsV001({baselinePlan, autoPresentation: {...autoPresentation, overrides},
    query: {captionId: rows[0].captionId}});
  write(`\n保存後:\n${formatAutoPresentationCaptionRowsV001(after)}\n保存先: ${resolve(parsed.outputPath)}`);
  return {status: 'saved', before: rows[0], after: after[0], outputPath: resolve(parsed.outputPath)};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runAutoPresentationEditV001(process.argv.slice(2)).catch(error => {
    process.stderr.write(`修正できませんでした: ${error.message}\n`);
    process.exitCode = 1;
  });
}
