// 2026-09-14 kawafmm指示に対する保存データ照合。描画・合成・API・音響解析は呼ばない。
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validatePhase2Display} from './digest_v1_phase2_captions.mts';
import {codePointWeightV001} from './presentation_renderer_text_layout_v001.mjs';
import {mapPresentationSourceIntervalV002} from './presentation_base_media_timeline_v004.mjs';

const w = 'evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001';
const out = `${w}/human-review-candidate-v001`;
const json = async (p: string) => JSON.parse(await readFile(p, 'utf8'));
const binding = async (p: string) => ({path: p, fileSha256: createHash('sha256').update(await readFile(p)).digest('hex')});
const save = async (name: string, value: unknown) => writeFile(`${out}/${name}`, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
const checkedRead = async (b: any) => {assert.equal((await binding(b.path)).fileSha256, b.fileSha256); return json(b.path);};
const request = await json(`${w}/display-all-request-v002.json`);
const textInput = await checkedRead(request.textInputBinding);
const requests = await Promise.all(Array.from({length: textInput.orderedSegments.length}, (_, i) => json(`${w}/display-${i + 1}-request-v002.json`)));
const response = await json(`${w}/display-all-response-v002.json`), result = await json(`${w}/display-all-result-v002.json`);
const traces = validatePhase2Display({request, requests}, response, result);
const bridge = await json(`${w}/caption-bridge-v001.json`);
const timing = await checkedRead(bridge.semanticProvenance.captionTiming);
const adoption = await checkedRead(bridge.semanticProvenance.machineAdoption);
const timeline = await checkedRead(bridge.semanticProvenance.baseMedia.timeline);
await checkedRead(bridge.semanticProvenance.textInput);
await checkedRead(bridge.semanticProvenance.actualRequest);
await checkedRead(bridge.semanticProvenance.response);
await checkedRead(bridge.semanticProvenance.result);
const rasterPath = `${w}/style-94-v001/continuation-v003/raster-qc.json`;
const raster = await json(rasterPath), plan = await checkedRead(raster.planBinding);
await checkedRead(raster.styleBinding);
const instructions = bridge.instructionArtifact.instructions, atoms = textInput.atomOccurrences;
assert.equal(instructions.length, 325); assert.equal(timing.cues.length, 325); assert.equal(plan.elements.length, 325);
assert.equal(atoms.length, 4437); assert.equal(new Set(atoms.map((a: any) => a.atomOccurrenceId)).size, atoms.length);
const limits = request.input.styleLimits, allIds: string[] = [], rows: any[] = [];
let atomOffset = 0, ordinal = 0;
for (const [rangeIndex, trace] of traces.entries()) {
  const boundaries = trace.request.input.captions[0].boundaryCandidates;
  const rangeAtoms = atoms.slice(atomOffset, atomOffset + boundaries.length);
  assert.deepEqual(boundaries.map((b: any) => b.text), rangeAtoms.map((a: any) => a.text));
  assert.deepEqual(textInput.orderedSegments[rangeIndex].atomOccurrenceIds, rangeAtoms.map((a: any) => a.atomOccurrenceId));
  const indices = new Map(boundaries.map((b: any, i: number) => [b.boundaryId, i]));
  assert.equal(indices.size, boundaries.length);
  let start = 0;
  for (const cue of trace.cues) {
    const instruction = instructions[ordinal], time = timing.cues[ordinal], lines = bridge.lineLayout.entries[ordinal];
    const end = indices.get(cue.cueEndBoundaryId) as number;
    assert(Number.isInteger(end) && end >= start);
    const selected = rangeAtoms.slice(start, end + 1), ids = selected.map((a: any) => a.atomOccurrenceId);
    const expectedText = selected.map((a: any) => a.text).join('');
    assert.equal(instruction.instructionId, `digest-v1-phase2-20260913-v001-bridge-caption-${String(ordinal + 1).padStart(6, '0')}`);
    assert.equal(lines.instructionId, instruction.instructionId);
    assert.equal(instruction.content.text, expectedText); assert.equal(time.text, expectedText);
    assert.deepEqual(instruction.targetProvenance.atomOccurrenceIds, ids); assert.deepEqual(time.atomOccurrenceIds, ids);
    assert(lines.lines.length > 0 && lines.lines.length <= limits.maxLinesPerCue);
    assert.equal(lines.lines.length, cue.lineEndBoundaryIds.length);
    let lineStart = start;
    for (const [lineIndex, line] of lines.lines.entries()) {
      const lineEnd = indices.get(cue.lineEndBoundaryIds[lineIndex]) as number;
      assert(Number.isInteger(lineEnd) && lineEnd >= lineStart && lineEnd <= end);
      const lineAtoms = rangeAtoms.slice(lineStart, lineEnd + 1);
      assert.equal(line.lineIndex, lineIndex); assert.equal(line.text, lineAtoms.map((a: any) => a.text).join(''));
      assert.deepEqual(line.sourceUnitIds, lineAtoms.map((a: any) => a.atomOccurrenceId));
      const width = [...line.text].reduce((n, ch) => n + codePointWeightV001(ch, limits.characterWidthRule), 0);
      assert.equal(line.logicalWidth, width); assert(width <= limits.maxLogicalWidthPerLine);
      lineStart = lineEnd + 1;
    }
    assert.equal(lineStart, end + 1); assert.equal(cue.lineEndBoundaryIds.at(-1), cue.cueEndBoundaryId);
    assert.equal(lines.lines.map((l: any) => l.text).join(''), expectedText);
    const segment = adoption.segments[rangeIndex]; assert.equal(time.timelineSegmentId, segment.segmentId);
    assert(time.resolution.sourceStartMs < time.resolution.sourceEndMs);
    assert(time.resolution.sourceStartMs >= segment.sourceStartMs && time.resolution.sourceEndMs <= segment.sourceEndMs);
    const mapped = mapPresentationSourceIntervalV002(timeline, time.resolution.sourceStartMs, time.resolution.sourceEndMs);
    assert.equal(mapped.status, 'passed'); assert.equal(mapped.mapping.timelineSegmentId, segment.segmentId);
    assert.deepEqual(instruction.outputTime, {startFrame: mapped.mapping.startFrame, endFrameExclusive: mapped.mapping.endFrameExclusive});
    const element = plan.elements[ordinal]; assert.equal(element.instructionId, instruction.instructionId);
    assert.equal(element.text, expectedText); assert.equal(element.startFrame, instruction.outputTime.startFrame);
    assert.equal(element.endFrameExclusive, instruction.outputTime.endFrameExclusive);
    assert.deepEqual(element.indexedLines.map((l: any) => l.text), lines.lines.map((l: any) => l.text));
    assert.deepEqual(element.targetProvenance.sourceAtomIds, ids);
    const projected = bridge.boundaryProjection[ordinal];
    assert.deepEqual(projected.lineEndBoundaryIds, cue.lineEndBoundaryIds); assert.equal(projected.cueEndBoundaryId, cue.cueEndBoundaryId);
    assert.equal(projected.instructionId, instruction.instructionId); assert.equal(projected.timelineSegmentId, time.timelineSegmentId);
    if (ordinal) assert(instructions[ordinal - 1].outputTime.startFrame <= instruction.outputTime.startFrame);
    const startResolved = time.resolution.startResolution.status === 'resolved', endResolved = time.resolution.endResolution.status === 'resolved';
    rows.push({captionNumber: ordinal + 1, instructionId: instruction.instructionId, text: expectedText,
      ...instruction.outputTime, timelineSegmentId: time.timelineSegmentId, candidateIds: segment.candidateIds,
      acousticStartResolved: startResolved, acousticEndResolved: endResolved,
      fallbackSides: [!startResolved && 'start', !endResolved && 'end'].filter(Boolean),
      startEvidence: time.resolution.startResolution, endEvidence: time.resolution.endResolution});
    allIds.push(...ids); ordinal++; start = end + 1;
  }
  assert.equal(start, boundaries.length); atomOffset += boundaries.length;
}
assert.equal(ordinal, 325); assert.equal(atomOffset, atoms.length);
assert.deepEqual(allIds, atoms.map((a: any) => a.atomOccurrenceId));
const sourceSummary = {schemaVersion: 'digest-v1-phase2-source-qc-summary-v001', status: 'passed',
  captionCount: 325, sourceAtomCount: atoms.length, missingAtoms: 0, duplicateAtoms: 0, orderAnomalies: 0,
  exactTextAndFormalIds: 'passed', cueAndLineBoundaries: 'passed', newlinesAndLineCount: 'passed',
  retainedRanges: adoption.segments.length, outsideRetainedRangeCount: 0, startBeforeEnd: 'passed',
  finalRenderPlanTextLinesAndFrames: 'passed', limits, maximumObservedLogicalWidth: Math.max(...bridge.lineLayout.entries.flatMap((e: any) => e.lines.map((l: any) => l.logicalWidth))),
  maximumObservedLines: Math.max(...bridge.lineLayout.entries.map((e: any) => e.lines.length)),
  sourceBindings: await Promise.all(['caption-text-input.json','display-all-request-v002.json','display-all-response-v002.json','display-all-result-v002.json','caption-bridge-v001.json','caption-timing-resolution-v002.json','machine-adoption.json','base-media/timeline.json','style-94-v001/common-plan.json'].map(n => binding(`${w}/${n}`))),
  implementationBinding: await binding('evals/clip_composition/digest_v1_phase2_human_review_data_check.mts'),
  newMeaningJudgments: 0, newAcousticAnalyses: 0, renderingExecutions: 0, encodingExecutions: 0};
await save('source-caption-qc.json', sourceSummary);
const completionPath = `${w}/style-94-v001/continuation-v003/raster-completion-v001.json`;
const completion = await json(completionPath), retainedPath = `${w}/style-94-v001/continuation-v003/owner-stop-v001/retained-raster-and-qc-evidence.json`;
const retained = await json(retainedPath);
assert.equal((await binding(rasterPath)).fileSha256, completion.rasterQcBinding.fileSha256);
assert.equal(raster.status, 'passed'); assert.equal(raster.qc.status, 'passed'); assert.equal(raster.qc.instructionCount, 325);
assert.equal(raster.qc.instructionEvidence.length, 325); assert.deepEqual(raster.qc.violations, []);
assert.deepEqual(raster.qc.instructionEvidence.map((e: any) => e.instructionId), instructions.map((i: any) => i.instructionId));
assert.equal(retained.all1022ImageHashesMatchPriorRasterProof, true);
assert.equal(completion.counts.allThirdVsSecondImageBytesIdentical, true);
assert(completion.renderedImageBindings.every((i: any) => i.imageBinding.fileSha256 === i.repeatBinding.fileSha256));
const target = raster.qc.instructionEvidence[281], safeRight = plan.canvas.width - plan.canvas.safeAreaPx.right;
assert.equal(target.alphaBounds.right, 1834); assert.equal(safeRight, 1840);
await save('reused-raster-qc.json', {schemaVersion: 'digest-v1-phase2-reused-raster-qc-v001', status: 'passed', instructionCount: 325,
  passed: 325, violations: 0, fontSizePx: plan.elements[281].visualState.textStyle.fontSizePx, representativeCaption: 282,
  targetAlphaBounds: target.alphaBounds, safeRight, deterministicRedraw: 'passed',
  evidenceMeaning: '各字幕が実際のfont/styleで画面内へ正常描画可能。最終MP4全字幕のE2E証明ではない。',
  rasterQcBinding: await binding(rasterPath), rasterCompletionBinding: await binding(completionPath),
  postStopImageReadbackBinding: await binding(retainedPath), redrawExecutions: 0});
const fallback = rows.filter(r => !r.acousticStartResolved || !r.acousticEndResolved);
const junctions = timeline.segments.slice(1).map((segment: any, i: number) => {
  const left = adoption.segments[i], right = adoption.segments[i + 1];
  return {frame: segment.outputStartFrame, candidateChanged: JSON.stringify(left.candidateIds) !== JSON.stringify(right.candidateIds),
    before: rows.filter(r => r.timelineSegmentId === left.segmentId).at(-1), after: rows.find(r => r.timelineSegmentId === right.segmentId)};
});
const watchlist = {schemaVersion: 'digest-v1-phase2-human-sync-watchlist-v001',
  timingBinding: await binding(`${w}/caption-timing-resolution-v002.json`), timelineBinding: await binding(`${w}/base-media/timeline.json`),
  criteria: '保存済み音響境界の片側以上が未解決の全字幕。接続位置は各保持区間の最後と次区間の最初の字幕を列挙。近傍秒数や新規係数は使用しない。',
  twoSidedAcousticCaptionCount: rows.length - fallback.length, oneSidedAcousticCaptionCount: fallback.filter(r => r.fallbackSides.length === 1).length,
  bothSidesFallbackCaptionCount: fallback.filter(r => r.fallbackSides.length === 2).length, fallbackCaptionCount: fallback.length,
  fallbackCaptions: fallback, prospectJunctions: junctions.filter(j => j.candidateChanged), intraProspectJunctions: junctions.filter(j => !j.candidateChanged),
  humanSync: 'not-evaluated', newAcousticAnalyses: 0};
await save('human-sync-watchlist.json', watchlist);
const clock = (frame: number) => {const ms = Math.round(frame / 30 * 1000); return `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;};
const escape = (s: string) => s.replaceAll('|', '\\|').replaceAll('\n', ' ');
const md = ['# 完成動画の字幕同期・重点確認箇所', '', '時刻は完成MP4の先頭基準。字幕番号は正式325件の順序。開始・終了frameから換算した表示値であり時刻補正ではない。', '',
  `音響上の両端取得済み ${watchlist.twoSidedAcousticCaptionCount}件。片側fallback ${watchlist.oneSidedAcousticCaptionCount}件、両側fallback ${watchlist.bothSidesFallbackCaptionCount}件。以下の${fallback.length}件は保存済み情報による注意対象であり、同期不良を断定するものではない。全体の読みやすさ・場面接続・文脈・テンポも実動画で確認する。`, '',
  '## 音響境界が片側以上未解決の字幕', '', '| 字幕 | 完成動画の表示区間 | fallback側 | 本文 |', '| --- | --- | --- | --- |',
  ...fallback.map(r => `| ${r.captionNumber} | ${clock(r.startFrame)}–${clock(r.endFrameExclusive)} | ${r.fallbackSides.map((s: string) => s === 'start' ? '開始' : '終了').join('・')} | ${escape(r.text)} |`), '',
  '## Prospect間の接続', '', '接続に隣接する前後の字幕を示す。任意の「近傍秒数」による抽出はしていない。', '', '| 接続時刻 | 前→後のProspect | 前後の字幕 |', '| --- | --- | --- |',
  ...watchlist.prospectJunctions.map(j => `| ${clock(j.frame)} | ${j.before.candidateIds.join(', ')} → ${j.after.candidateIds.join(', ')} | ${j.before.captionNumber} → ${j.after.captionNumber} |`), '',
  '## 同じProspect内の保持区間接続', '', '| 接続時刻 | Prospect | 前後の字幕 |', '| --- | --- | --- |',
  ...watchlist.intraProspectJunctions.map(j => `| ${clock(j.frame)} | ${j.after.candidateIds.join(', ')} | ${j.before.captionNumber} → ${j.after.captionNumber} |`), '',
  '字幕を除外した動画との差分検査は同期確認を代替しない。新しい音響解析・意味判断・字幕変更は行っていない。', ''].join('\n');
await writeFile(`${out}/human-sync-watchlist.md`, md, {flag: 'wx'});
console.log(JSON.stringify({source: sourceSummary.status, captions: 325, atoms: atoms.length, raster: '325/325 passed', fallback: fallback.length,
  twoSided: watchlist.twoSidedAcousticCaptionCount, oneSided: watchlist.oneSidedAcousticCaptionCount, neither: watchlist.bothSidesFallbackCaptionCount,
  prospectJunctions: watchlist.prospectJunctions.length, intraProspectJunctions: watchlist.intraProspectJunctions.length}));
