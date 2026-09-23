/** Prepare the four authorized R1-B cases from saved observations. No media analysis. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, writeFile, mkdir, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createR1CaptionSourceV001, resolveR1CaptionRepairsV001, restoreR1CaptionRepairsV001,
  cancelR1CaptionRepairV001, projectR1CaptionRangeV001, loadR1CaptionRepairsV001} from './r1-caption-plan.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const historical = '/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001';
const stages = path.join(repo, 'evals/clip_composition/outputs/presentation/stage4-editing-20260918-v001');
const policyPath = '/Users/kawafmm/.codex/attachments/9b62db12-c544-4482-95ee-beb5793afc28/pasted-text.txt';
const captionId = n => 'digest-v1-phase2-20260913-v001-bridge-caption-' + String(n).padStart(6, '0');
const range = (startFrame, endFrameExclusive) => ({startFrame, endFrameExclusive});
const read = async file => JSON.parse(await readFile(file));
async function bind(file) {const bytes = await readFile(file); return {path: file, bytes: bytes.length,
  fileSha256: createHash('sha256').update(bytes).digest('hex')};}
async function save(file, value) {await writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'}); return bind(file);}
function child(parent, startCodePoint, endCodePointExclusive, frames, boundaryBasis, lines) {
  const result = {startCodePoint, endCodePointExclusive, range: frames, boundaryBasis};
  if (lines) result.lines = lines;
  assert(endCodePointExclusive <= [...parent.text].length); return result;
}
function baseRepair(parent, repairId, reason, observations, inference) {
  return {repairId, parentCaptionId: parent.instructionId, parentText: parent.text,
    parentRange: range(parent.startFrame, parent.endFrameExclusive), reason, observations, inference};
}

export async function prepareR1CaptionCasesV001({outputDirectory}) {
  assert(path.isAbsolute(outputDirectory));
  assert(outputDirectory.startsWith(stages + path.sep), 'R1 working artifacts belong to the managed presentation outputs');
  await assert.rejects(stat(outputDirectory), {code: 'ENOENT'});
  const policyRef = await bind(policyPath);
  const planPath = path.join(historical, 'style-94-v001/common-plan.json');
  const timelinePath = path.join(historical, 'base-media/timeline.json');
  const bridgePath = path.join(historical, 'caption-bridge-v001.json');
  const atomsPath = path.join(historical, 'caption-text-input.json');
  const preflightPath = path.join(historical, 'acoustics/acoustic-preflight-v001.json');
  const asrPath = path.join(stages, 'quality-q4-20260920-v001/c-all-input-v001/raw-inputs/legacy-asr.json');
  const q51Path = path.join(stages, 'quality-q5-1-20260921-v002/edit-plan-v002.json');
  const q52Path = path.join(stages, 'quality-q5-2-20260921-v001/edit-plan-v001.json');
  const q52ComparisonPath = path.join(stages, 'quality-q5-2-20260921-v001/comparison-v001.json');
  const plan = await read(planPath), timeline = await read(timelinePath), asr = await read(asrPath);
  const q51 = await read(q51Path), q52 = await read(q52Path), q52Comparison = await read(q52ComparisonPath);
  assert.equal(plan.elements.length, 325); assert.equal(timeline.baseMedia.expectedFrameCount, 44408);
  assert.deepEqual(q51.mediaOmission, range(12153, 12212)); assert.equal(q51.removedFrameCount, 59);
  assert.deepEqual(q51.hiddenCaptionIds, [captionId(121)]); assert.equal(q52.addedFrameCount, 345);
  assert.deepEqual(q52.addition.sourceVideoRange, range(227963, 228308));
  const preflight = await read(preflightPath), acoustic = new Map();
  const commonRefs = await Promise.all([planPath, timelinePath, bridgePath, atomsPath, preflightPath, asrPath].map(bind));
  for (const n of [67, 68, 69, 141, 142, 253]) {
    const file = path.join(historical, 'acoustics/acoustic-observation-chunk-' + String(n).padStart(4, '0') + '-v001.json');
    const observation = await read(file), ref = await bind(file), chunk = preflight.chunks.find(row => row.index === n);
    assert.equal(observation.preflightBinding.fileSha256, commonRefs[4].fileSha256);
    acoustic.set(n, {observation, ref, chunk}); commonRefs.push(ref);
  }
  const asrRef = commonRefs[5], findAsr = n => asr.segments.find(row => row.id === 'asr-segment-' + String(n).padStart(6, '0'));
  const obs = (sourceRef, locator, meaning, values) => ({sourceRef, locator, meaning, ...values});
  const fixed = (n, first, last) => {
    const {observation, ref, chunk} = acoustic.get(n), words = observation.words.slice(first, last + 1);
    return obs(ref, '/words/' + first + '..' + last, '保存済み原文固定アラインメント。開始側の無音を含むことがあり、完全な発話境界とは扱わない。',
      {clockId: 'original-source-milliseconds', text: words.map(word => word.word).join(''),
        startMs: chunk.startMs + Math.round(words[0].start * 1000),
        endMs: chunk.startMs + Math.round(words.at(-1).end * 1000), chunkIndex: n, firstWordIndex: first, lastWordIndex: last});
  };
  const savedAsr = n => {const segment = findAsr(n); return obs(asrRef, '/segments/' + asr.segments.indexOf(segment),
    '既存Digest全体に対する保存済みASR。語時刻を字幕表示候補の根拠とし、原字幕本文の訂正には用いない。',
    {clockId: 'original-digest-milliseconds', text: segment.text, startMs: Math.round(segment.startSec * 1000),
      endMs: Math.round(segment.endSec * 1000), words: segment.words.map(word => ({text: word.text,
        startMs: Math.round(word.startSec * 1000), endMs: Math.round(word.endSec * 1000)}))});};
  const original = n => plan.elements.find(row => row.instructionId === captionId(n));
  const sourceToDigest = sourceMs => Math.round(sourceMs * 30 / 1000) - 58537;
  assert.equal(timeline.segments[1].sourceStartFrame30 - timeline.segments[1].outputStartFrame, 58537);
  const p6 = original(42), a6 = fixed(67, 105, 110), b6 = fixed(68, 0, 7), c6 = fixed(68, 8, 16);
  assert.equal(a6.text + b6.text + c6.text, p6.text);
  const repairs67 = [{...baseRepair(p6, 'point-06-semantic-split',
    '約13秒の説明を三つの意味のまとまりへ分け、語順・全原文を保持して順番に表示する。',
    [a6, b6, c6, savedAsr(28), savedAsr(30), savedAsr(31), savedAsr(32), savedAsr(33)],
    '元の全体終端と時計変換は保存観測に一致。原文固定観測の句境界を使う表示案であり、名前の認識差は訂正しない。'),
    action: 'replace', children: [child(p6, 0, 9, range(sourceToDigest(a6.startMs), sourceToDigest(a6.endMs)), '原文固定観測67の105〜110語。'),
      child(p6, 9, 19, range(sourceToDigest(b6.startMs), sourceToDigest(b6.endMs)), '原文固定観測68の0〜7語。'),
      child(p6, 19, 33, range(sourceToDigest(c6.startMs), sourceToDigest(c6.endMs)), '原文固定観測68の8〜16語。')]}];
  const p7before = original(50), p7 = original(51), speech7 = savedAsr(46);
  const selectedWords7 = speech7.words.slice(0, 5); assert.equal(selectedWords7.map(row => row.text).join(''), p7.text);
  repairs67.push({...baseRepair(p7before, 'point-07-previous-outside-short',
    '直前字幕の対応発話が提示開始より前にあり、今回の短尺派生版では非表示にする。',
    [savedAsr(45), fixed(69, 41, 52)],
    '元字幕が短尺内へ遅れて表示されていた。範囲外の別字幕まで移動しないため、この派生版では明示許可された局所非表示を使う。'),
    action: 'hide', children: [], reviewRange: range(4436, 4564), correspondingSpeechRange: range(4367, 4434)});
  repairs67.push({...baseRepair(p7, 'point-07-companion-speech',
    '6frameに圧縮されていた表示を対応発話へ戻す。提示前の2frameだけは提示区間境界で切る。',
    [speech7, fixed(69, 53, 57)],
    '保存ASR内の原文に対応する5語は147.80〜148.76秒。原文にない語尾は追加せず、表示開始を短尺開始4436へ合わせる。'),
    action: 'replace', children: [child(p7, 0, [...p7.text].length,
      range(4436, Math.round(selectedWords7.at(-1).endMs * 30 / 1000)), '保存ASRの対応5語、開始は元の短尺提示境界に制限。')]});

  const q51Ref = await bind(q51Path), q52Ref = await bind(q52Path);
  const repairs9 = [];
  for (const [n, segments, fixedRows] of [[117, [128], [[141, 32, 43]]], [118, [129, 130], [[141, 44, 47]]],
    [119, [131], [[141, 48, 54]]], [120, [132], [[142, 0, 9]]], [122, [134, 135], [[142, 21, 25]]]]) {
    const parent = q51.normalPlan.elements.find(row => row.instructionId === captionId(n));
    const observations = segments.map(savedAsr); assert.equal(observations.map(row => row.text).join(''), parent.text);
    const first = observations[0].startMs, last = observations.at(-1).endMs;
    const originalFrames = range(Math.round(first * 30 / 1000), Math.round(last * 30 / 1000));
    const shift = originalFrames.startFrame >= 12212 ? 59 : 0;
    assert(originalFrames.endFrameExclusive <= 12153 || originalFrames.startFrame >= 12212);
    repairs9.push({...baseRepair(parent, 'point-09-caption-' + n,
      '省略後の時計投影は維持し、提示After内の対応発話に字幕の開始・終了を合わせる。',
      [...observations, ...fixedRows.map(args => fixed(...args)), obs(q51Ref, '/mediaOmission',
        '既存の59frame省略、対象字幕の非表示、前後保持を変更しない。', {originalRange: q51.mediaOmission})],
      n === 122 ? '原文固定観測が「ということで」の前の無音を含むため、保存ASRの当該2発話の外側境界を使用。任意の一括offsetは加えない。'
        : '原文と保存ASRを完全一致で対応付け、各字幕固有の観測値を使用。元の原文固定観測との差も併記。'),
      action: 'replace', children: [child(parent, 0, [...parent.text].length,
        range(originalFrames.startFrame - shift, originalFrames.endFrameExclusive - shift),
        '保存ASRの完全一致発話境界を30fps最近傍へ丸め、その後に既存の59frame省略を一度だけ投影。')]});
  }
  const p10 = q52.normalPlan.elements.find(row => row.instructionId === 'q5-2-added-caption-000003');
  const a10 = fixed(253, 17, 23), b10 = fixed(253, 24, 28);
  assert.equal(a10.text + b10.text, p10.text);
  const splitFrame10 = Math.round(a10.endMs * 30 / 1000) - 227963 + 18578;
  assert.equal(splitFrame10, 18793);
  const repairs10 = [{...baseRepair(p10, 'point-10-two-phrases',
    '追加導入の後半を「全然まで使ったのに」と「撃てないかー」の二枚に分ける。',
    [a10, b10, obs(q52Ref, '/addition', '元の345frame導入と映像・音声・接続を保持。', {addition: q52.addition})],
    '本人コメントを原文の訂正へ使わず、保存済み原文固定観測の二句境界を投影する。「全然まで」等の認識誤り可能性は未訂正のまま残す。'),
    action: 'replace', children: [child(p10, 0, 9, range(p10.startFrame, splitFrame10), '保存原文固定観測253の17〜23語。'),
      child(p10, 9, 15, range(splitFrame10, p10.endFrameExclusive), '保存原文固定観測253の24〜28語。')]}];
  await mkdir(outputDirectory, {recursive: true});
  const groups = [
    {key: 'points-06-07', normalPlan: plan, frameCount: 44408, clockId: 'q5-original-c-all-frame-v001', repairs: repairs67,
      extraRefs: [], samples: [{point: 6, range: range(2511, 3197)}, {point: 7, range: range(4436, 4564)}]},
    {key: 'point-09', normalPlan: q51.normalPlan, frameCount: q51.frameCount, clockId: q51.clock, repairs: repairs9,
      extraRefs: [q51Ref], samples: [{point: 9, range: range(11683, 12446)}]},
    {key: 'point-10', normalPlan: q52.normalPlan, frameCount: q52.frameCount, clockId: q52.clock, repairs: repairs10,
      extraRefs: [q52Ref, await bind(q52ComparisonPath)], samples: [{point: 10, range: q52Comparison.afterGlobalRange}]},
  ];
  const manifest = {schemaVersion: 'r1-caption-cases-v001', policyRef, groups: [], mediaChanged: false,
    limitations: ['発話一致は保存済み観測を使った表示候補であり、修正後の見心地は未評価。',
      '7番の直前字幕は提示範囲からの局所非表示。範囲外字幕の時刻不良は今回変更しない。',
      '元の語・語順を保持し、認識誤りの可能性は本文訂正と分離。']};
  for (const group of groups) {
    const dir = path.join(outputDirectory, group.key); await mkdir(dir);
    const normalPlanRef = await save(path.join(dir, 'source-normal-plan.json'), group.normalPlan);
    const evidence = {schemaVersion: 'r1-caption-boundary-evidence-v001', normalPlanRef, policyRef,
      clockId: group.clockId, frameCount: group.frameCount, sourceRefs: [...commonRefs, ...group.extraRefs],
      repairs: group.repairs, observationStatus: 'saved-observations-only; no new transcription or media upload'};
    const evidenceRef = await save(path.join(dir, 'boundary-evidence.json'), evidence);
    const source = createR1CaptionSourceV001({normalPlanRef, normalPlanBytes: await readFile(normalPlanRef.path),
      evidenceRef, evidenceBytes: await readFile(evidenceRef.path), policyRef, policyBytes: await readFile(policyPath)});
    const resolved = resolveR1CaptionRepairsV001({source, activeRepairIds: group.repairs.map(repair => repair.repairId)});
    const savedRef = await save(path.join(dir, 'saved-repairs.json'), resolved);
    assert.deepEqual(restoreR1CaptionRepairsV001({source, saved: await read(savedRef.path)}), resolved);
    assert.deepEqual(await loadR1CaptionRepairsV001({savedPath: savedRef.path}), resolved);
    const derivedNormalPlanRef = await save(path.join(dir, 'derived-normal-plan.json'), resolved.normalPlan);
    const samples = [];
    for (const sample of group.samples) {
      const projected = projectR1CaptionRangeV001({resolved, range: sample.range, targetClockId: 'r1-point-' + sample.point + '-short-frame-v001'});
      samples.push({point: sample.point, range: sample.range, projectionRef: await save(path.join(dir, 'point-' + sample.point + '-projection.json'), projected),
        normalPlanRef: await save(path.join(dir, 'point-' + sample.point + '-normal-plan.json'), projected.normalPlan), frameCount: projected.frameCount});
    }
    const cancelled = resolveR1CaptionRepairsV001({source, activeRepairIds: []});
    assert.deepEqual(cancelled.normalPlan, group.normalPlan);
    const allCancelledRef = await save(path.join(dir, 'all-cancelled-repairs.json'), cancelled);
    const firstId = group.repairs[0].repairId;
    const singleCancelled = cancelR1CaptionRepairV001({source, saved: resolved, repairId: firstId});
    const singleCancelledRef = await save(path.join(dir, 'one-cancelled-repair.json'), singleCancelled);
    manifest.groups.push({key: group.key, savedRef, evidenceRef, sourceNormalPlanRef: normalPlanRef,
      derivedNormalPlanRef, clockId: group.clockId, frameCount: group.frameCount, repairVersion: resolved.repairVersion,
      parentChildMappings: resolved.captionMappings, allCancelledRef, singleCancelledRef, samples});
  }
  const manifestRef = await save(path.join(outputDirectory, 'cases.json'), manifest);
  return {manifestRef, groups: manifest.groups.map(({key, savedRef, samples}) => ({key, savedRef, samples}))};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [outputDirectory, ...extra] = process.argv.slice(2); assert(outputDirectory && extra.length === 0);
  process.stdout.write(JSON.stringify(await prepareR1CaptionCasesV001({outputDirectory}), null, 2) + '\n');
}
