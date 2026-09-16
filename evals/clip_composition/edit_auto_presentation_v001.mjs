import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {loadAutoPresentationV001, saveAutoPresentationOverridesV001} from './presentation_auto_effects_io_v001.mjs';
import {createAutoPresentationOverridesV001, editAutoPresentationOverrideV001,
  resolveAutoPresentationV001} from './presentation_auto_effects_v001.mjs';

const fail = message => { throw new TypeError(message); };
const own = (value, key) => Object.hasOwn(value, key);
const focus = {role: 'Focus', presentation: 'provisional-focus', scope: 'whole-caption'};

export const AUTO_PRESENTATION_EDIT_HELP = `字幕一件の演出を確認・修正します。
node evals/clip_composition/edit_auto_presentation_v001.mjs <操作> \\
  --baseline <固定通常計画> --decision-input <判断入力> \\
  [--auto <固定自動案>] [--overrides <現在の人修正>] \\
  [--caption-id <表示字幕ID> | --time <秒 または HH:MM:SS.mmm> | --text <本文の完全一致部分>]

操作:
  show     候補と現在状態を表示（検索なしなら全字幕）
  normal   Normal固定
  focus    全文Focus
  partial  部分Focus: --target <原文どおりの連続文字列> [--occurrence <1からの出現番号>]
  reset    この一件のoverrideを削除し、保存済み自動案へ戻す

修正には検索条件と --output <新しい人修正ファイル> が必要です。
複数候補では候補一覧を表示して停止します。表示されたIDで再指定してください。
既存ファイルは上書きしません。保存後は --overrides に新しいファイルを渡してください。
--text / --target は文字の正規化・近似一致を行いません。時刻の終了端は対象外です。`;

export function parseAutoPresentationEditArgsV001(argv) {
  if (argv.length === 1 && ['--help', '-h'].includes(argv[0])) return {help: true};
  const [action, ...args] = argv;
  if (!['show', 'normal', 'focus', 'partial', 'reset'].includes(action)) fail('操作は show / normal / focus / partial / reset から指定してください。');
  const names = new Map([
    ['--baseline', 'baselinePath'], ['--decision-input', 'decisionInputPath'],
    ['--auto', 'autoProposalPath'], ['--overrides', 'overridesPath'], ['--output', 'outputPath'],
    ['--caption-id', 'captionId'], ['--time', 'time'], ['--text', 'text'],
    ['--target', 'targetText'], ['--occurrence', 'occurrence'],
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
  if (action === 'partial' && !own(parsed, 'targetText')) fail('部分Focusには --target が必要です。');
  if (action !== 'partial' && (own(parsed, 'targetText') || own(parsed, 'occurrence'))) fail('--target と --occurrence は partial 専用です。');
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

const selectionDescription = selection => selection?.role === 'Focus'
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
  : selection.scope === 'whole-caption' ? 'Focus / whole（全文）'
  : `Focus / partial（部分）${JSON.stringify(selection.targetText)} / occurrence=${selection.occurrence ?? '一意一致'}`;

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
  const previous = autoPresentation.overrides ?? createAutoPresentationOverridesV001({baselinePlan, ...autoPresentation});
  const selection = parsed.action === 'normal' ? 'Normal' : parsed.action === 'reset' ? 'Reset'
    : parsed.action === 'focus' ? focus : {...focus, scope: 'partial-caption', targetText: parsed.targetText,
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
