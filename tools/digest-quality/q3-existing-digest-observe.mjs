// Q3-2 の固定済み別Digestを読む一回の観測。動画・旧検査・人間回答は変更しない。
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, stat} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {canonical, validateReview} from '../point-review/core.mjs';
import {verifyReviewMedia} from '../point-review/build.mjs';
import {summarizeQ3SavedDigestTimingV001} from './q3-saved-digest-timing.mjs';

const run = promisify(execFile);
const originalRoot = '/Users/kawafmm/workspace/zev2';
const originalData = 'evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001';
const mediaPath = resolve(originalRoot, 'evals/clip_composition/outputs/presentation/work-unseen-material-thin-plan-024-v001/.render-v008.presentation-renderer-v002-work-J6DQda/publish/presentation-rendered-v002.mp4');
const mediaSha = '58744717f3d03a19f004fdca76a7199674a6b97a3f2f26e60d1b86b0ee8bf1cd';
const sha = value => createHash('sha256').update(value).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';

export async function observeQ3ExistingDigest(outputDirectory) {
  const output = resolve(outputDirectory);
  // 既存の記録を上書きせず、一回分の未使用出力先にだけ書く。
  await mkdir(output);
  const references = [];
  const worktree = fileURLToPath(new URL('../../', import.meta.url));
  const protectedInputs = [];
  for (const relative of [
    'docs/reports/review-reflection-r1-r3-20260921-v002/review-v002.json',
    'docs/reports/human-review-batch-10-20260921-v001/answers-received-v003/session-answers.json'
  ]) {
    const path = resolve(worktree, relative);
    protectedInputs.push({path, fileSha256: sha(await readFile(path))});
  }
  async function readOriginal(relative, expectedSha) {
    const path = resolve(originalRoot, relative);
    assert(path.startsWith(originalRoot + '/evals/clip_composition/outputs/'));
    const bytes = await readFile(path);
    const fileSha256 = sha(bytes);
    if (expectedSha) assert.equal(fileSha256, expectedSha, `保存元の版が違います: ${relative}`);
    references.push({path, fileSha256, bytes: bytes.length});
    return JSON.parse(bytes);
  }
  async function save(name, value) { await writeFile(resolve(output, name), json(value), {flag: 'wx'}); }
  const owner = await readOriginal(`${originalData}/owner-stop-recovery-v001.json`);
  assert.equal(owner.video.fileSha256, mediaSha);
  const main = await readOriginal(owner.mainVideoEvidence.path, owner.mainVideoEvidence.fileSha256);
  assert.equal(main.video.fileSha256, mediaSha);
  const job = await readOriginal(main.sourceRendererJobBinding.path, main.sourceRendererJobBinding.fileSha256);
  const instruction = await readOriginal(job.instructionArtifactBinding.path, job.instructionArtifactBinding.fileSha256);
  const timeline = await readOriginal(job.cropAppliedBaseMedia.timeline.path, job.cropAppliedBaseMedia.timeline.fileSha256);
  const authorization = await readOriginal(`${originalData}/source-acquisition-authorization-v001.json`);
  assert.equal(authorization.sourceId, timeline.sourceRef);
  const observationStatus = await readOriginal(`${originalData}/editorial-review-v001/review-preparation-status.json`);
  const observationDecision = await readOriginal(`${originalData}/editorial-review-v001/advisor-procedure-decision-v001.json`);
  assert.equal(observationStatus.sourceVideo.fileSha256, mediaSha);
  assert.deepEqual(observationStatus.completedVideoReviewIntervals, []);
  assert.deepEqual(observationStatus.pendingFullVideoRange, {startFrame: 0, endFrameExclusive: 65363, fps: 30});
  assert.equal(job.executionInputs.visualStateId, 'caption-core-v001');
  assert.equal(job.executionInputs.sceneTransitionPolicy.mode, 'straight-cut');
  const timing = summarizeQ3SavedDigestTimingV001({instruction, timeline, expectedFrameCount: 65363, fps: 30});
  const ordered = instruction.instructions;
  assert.equal(ordered.length, 343);
  const minimum = Math.min(...ordered.map(item => item.outputTime.endFrameExclusive - item.outputTime.startFrame));
  const shortest = ordered.filter(item => item.outputTime.endFrameExclusive - item.outputTime.startFrame === minimum);
  // 保存計画の実測で選んだ今回一件。普遍的な長さの閾値・品質判定にはしない。
  assert.equal(minimum, 6); assert.equal(shortest.length, 1);
  const target = shortest[0], index = ordered.indexOf(target);
  assert.equal(index, 286);
  const range = target.outputTime;
  const reviewRange = {startFrame: ordered[index - 1].outputTime.startFrame, endFrameExclusive: ordered[index + 1].outputTime.endFrameExclusive};
  const sampleRange = {startFrame: range.startFrame - 1, endFrameExclusive: range.endFrameExclusive + 1};
  const candidateId = `Q32-${sha(canonical({mediaSha, id: target.instructionId, range})).slice(0, 20)}`;
  const review = validateReview({
    schema_version: 'zev-point-review-v001', batch_id: 'Q3-2-ONIMUSHA-20260921', revision: 'v001',
    title: '別Digestの短い字幕表示を確認',
    intro: '保存表示時計で最短だった一箇所です。映像の意味・音声の自然さ・読みやすさは未判定です。',
    media: [{media_id: 'Q32-ONIMUSHA', label: '保存済み鬼武者Digest', path: mediaPath, sha256: mediaSha,
      fps_num: 30, fps_den: 1, total_frames: 65363, timeline_id: `completed-${mediaSha}`, timeline_start_frame: 0}],
    points: [{point_id: candidateId, review_id: `HR-${candidateId}-v001`, related_review_ids: [],
      title: '「次回予告」の0.2秒の表示',
      question: '前後の字幕と続けて見たとき、「次回予告」の表示時間は読み取れる長さですか。短く感じる場合は、その点だけ教えてください。',
      target_function: 'この字幕の表示時間を確認する処理',
      change_summary: '既存の完成動画を確認します。修正版は作成していません。',
      why_human_review: '保存表示時計では6フレーム（0.2秒）です。技術的な時計と局所decodeを確認し、実際の読みやすさは人間確認へ残しています。',
      scope: {level: 'point', applies_to: ['この動画版の「次回予告」だけの表示時間（51347〜51353フレーム）'],
        does_not_apply_to: ['字幕本文の認識正解', '前後字幕の品質', '全編の品質', '他の短い字幕への一般化', '未提示の修正案の採用', '修正後R1〜R3の7ポイント']},
      views: [{view_id: `${candidateId}-current`, label: '直前・対象・直後の字幕', role: 'candidate', media_id: 'Q32-ONIMUSHA',
        start_frame: reviewRange.startFrame, end_frame: reviewRange.endFrameExclusive,
        context_start_frame: reviewRange.startFrame, context_end_frame: reviewRange.endFrameExclusive}]}]
  });
  const probeArgs = ['-v', 'error', '-show_entries', 'format=duration,start_time:stream=index,codec_name,codec_type,width,height,r_frame_rate,avg_frame_rate,time_base,start_pts,duration_ts,nb_frames,sample_rate,channels', '-of', 'json', mediaPath];
  const probeResult = await run('/opt/homebrew/bin/ffprobe', probeArgs, {maxBuffer: 1024 * 1024});
  const probe = JSON.parse(probeResult.stdout), videoStream = probe.streams.find(s => s.codec_type === 'video');
  assert.equal(videoStream.avg_frame_rate, '30/1'); assert.equal(videoStream.nb_frames, '65363');
  assert.equal(videoStream.width, 1920); assert.equal(videoStream.height, 1080); assert.equal(videoStream.start_pts, 0);
  const mediaStat = await stat(mediaPath);
  const checked = await verifyReviewMedia(review, resolve(output, 'review-data-v001.json'), {probe: async path => {
    assert.equal(path, mediaPath);
    return {fps_num: 30, fps_den: 1, total_frames: Number(videoStream.nb_frames)};
  }});
  await save('media-observation-v001.json', {command: ['/opt/homebrew/bin/ffprobe', ...probeArgs], ...probe, checked: checked.checked});
  const oldHashPath = resolve(originalRoot, originalData, 'formal-v004/qc-only-v002/source-encoded-rgba.framehash.txt');
  const oldBytes = await readFile(oldHashPath), oldText = oldBytes.toString('utf8');
  const savedPixelProof = await readOriginal(owner.completedChecks.wholeFrameComparisonRecord.path,
    owner.completedChecks.wholeFrameComparisonRecord.fileSha256);
  assert.equal(savedPixelProof.status, 'passed');
  assert.deepEqual(savedPixelProof.sourceMain, owner.mainVideoEvidence);
  const rgbaProof = savedPixelProof.encodedVideoComparisons.find(item => item.pixelFormat === 'rgba');
  const savedRgbaBinding = rgbaProof.artifacts.find(item => resolve(originalRoot, item.path) === oldHashPath);
  assert(savedRgbaBinding, '保存済みRGBA観測への束縛がありません');
  assert.equal(oldBytes.length, savedRgbaBinding.bytes);
  assert.equal(sha(oldBytes), savedRgbaBinding.fileSha256);
  assert(oldText.includes('#hash: SHA256') && oldText.includes('#tb 0: 1/30') && oldText.includes('#dimensions 0: 1920x1080'));
  function rows(text) { return text.split('\n').filter(line => line.trim() && !line.startsWith('#')).map(line => {
    const parts = line.split(',').map(v => v.trim());
    return {pts: Number(parts[2]), bytes: Number(parts[4]), hash: parts[5]};
  }); }
  const oldRows = rows(oldText);
  const expected = oldRows.filter(row => row.pts >= sampleRange.startFrame && row.pts < sampleRange.endFrameExclusive);
  const decodeArgs = ['-hide_banner', '-loglevel', 'error', '-ss', (sampleRange.startFrame / 30).toFixed(9), '-i', mediaPath,
    '-map', '0:v:0', '-an', '-frames:v', String(sampleRange.endFrameExclusive - sampleRange.startFrame), '-pix_fmt', 'rgba', '-f', 'framehash', '-hash', 'sha256', 'pipe:1'];
  const decoded = await run('/opt/homebrew/bin/ffmpeg', decodeArgs, {maxBuffer: 1024 * 1024});
  await writeFile(resolve(output, 'local-decode-v001.framehash.txt'), decoded.stdout, {flag: 'wx'});
  const actual = rows(decoded.stdout);
  assert.equal(actual.length, expected.length); assert.equal(actual.length, 8);
  for (let i = 0; i < actual.length; i++) {
    assert.equal(expected[i].pts, sampleRange.startFrame + i);
    assert.equal(actual[i].pts, i);
    assert.equal(actual[i].bytes, expected[i].bytes);
    assert.equal(actual[i].hash, expected[i].hash, '局所decodeと保存済み完成動画画素が一致しません');
  }
  const afterStat = await stat(mediaPath);
  assert.equal(afterStat.size, mediaStat.size); assert.equal(afterStat.mtimeMs, mediaStat.mtimeMs);
  const decode = {status: 'passed', command: ['/opt/homebrew/bin/ffmpeg', ...decodeArgs], range: sampleRange,
    decodedFrames: actual.length, pixelFormat: 'rgba', matchedSavedFrameHashes: true,
    savedEvidence: {path: oldHashPath, fileSha256: sha(oldBytes), provenance: owner.completedChecks.wholeFrameComparisonRecord}, frames: expected,
    limitation: '局所8frameの画素同一性とdecode成立の確認。字幕を読んだ・見心地を確認した証拠ではない。旧024の未完了可視性QCは再開しない。'};
  await save('local-decode-verification-v001.json', decode);
  await save('timing-observation-v001.json', timing);
  const candidate = {candidateId, digest: checked.checked[0], range, relatedCaptionIds: [target.instructionId],
    sourceParts: timing.captions[index].sourceParts,
    classification: '表示', evidenceClass: 'technical-output-only', knownCategory: '既知カテゴリ（字幕の表示時間）の別素材における確認候補',
    technicalObservation: `保存された343字幕のうち、この字幕は最短の6frame。完成媒体の当該箇所と前後1frameずつは局所decodeで保存済み画素hashへ一致。`,
    savedSemanticObservation: null, hypothesis: '表示が短く、前後の字幕と続けて読む際に読み取りにくい可能性がある。',
    missingEvidence: ['実際の読みやすさ', '完成動画の意味・見心地観測', '字幕本文の音声との一致'],
    humanQuestion: review.points[0].question, reflectionTarget: '回答が得られた場合に、この字幕の表示時間・分割の局所修正を検討する。今回修正しない。',
    reviewRange, reviewId: review.points[0].review_id, automaticallyRepaired: false,
    evidence: ['timing-observation-v001.json', 'media-observation-v001.json', 'local-decode-verification-v001.json'],
    claimBoundary: '6frameは保存された表示時計の事実。短いことを欠陥や読めないことへ確定しない。現在の実動画から字幕表示期間を再認識したものではない。'};
  await save('candidate-record-v001.json', {status: 'prepared', candidates: [candidate], qualityApproved: false, automaticChanges: 0});
  await save('review-data-v001.json', review);
  const coverage = {savedTiming: {range: {startFrame: 0, endFrameExclusive: 65363}, captions: 343, cuts: timeline.segments.length - 1,
    normal: '全343字幕は既存caption-core-v001。演出付き別状態は保存jobにない。', observation: '保存計画の全範囲を読取。完成映像全編の視聴ではない。'},
    technicalOutput: {container: {startFrame: 0, endFrameExclusive: 65363}, actualDecodedRanges: [sampleRange], actualDecodedFrames: 8,
      audio: '今回の音声decode・聴取なし。旧AAC一致記録だけでは自然さを観測済みにしない。'},
    semanticPerceptual: {status: 'unavailable', ranges: [], savedCompletedDigestGeminiReused: false,
      reason: '対象024の保存済み準備状態では同一SHAの完成動画の観測済み区間0。照合した準備状態・相談記録から再利用可能な完成動画観測は得られなかった。新規外部送信と別モデル意味解析は行わない。'},
    candidateNotPresented: '他区間は今回候補化しなかった。問題なし・全編品質合格を意味しない。'};
  await save('coverage-v001.json', coverage);
  const report = {status: 'technical-first-completion', media: checked.checked[0], references,
    timing: {captions: 343, frameCount: 65363, minimumDisplayFrames: minimum, minimumCaption: target.instructionId},
    technicalOutput: decode, coverage, candidates: [candidate], review: {path: resolve(output, 'review-data-v001.json'),
      sha256: sha(canonical(review)), status: 'data-ready-not-presented', htmlCreated: false, blankAnswersCreated: false},
    savedObservationSearch: {preparationKeys: Object.keys(observationStatus), decisionKeys: Object.keys(observationDecision),
      sameCompletedDigestObservationFound: false, searchScope: '対象024の保存済みeditorial-review準備状態と相談記録。元素材の観測を完成動画の観測へ読み替えない。'},
    invariants: {newExternalMediaSends: 0, newPaidApiCalls: 0, additionalCostUsd: 0, localSemanticModelsUsed: 0,
      newVideoGeneration: 0, oldQcResumed: false, oldMediaOverwritten: false, originalTenAnswersChanged: false,
      existingSevenPointReviewChanged: false, original024QcUnfinishedCaptions: 131, humanQualityConfirmed: false},
    verification: {reviewSchema: 'passed', mediaIdentity: 'passed', captionAndSourceClockMapping: 'passed',
      localDecodeAndSavedPixels: 'passed', readbackRecord: 'readback-verification-v001.json'}};
  await save('observation-run-v001.json', report);
  const reread = JSON.parse(await readFile(resolve(output, 'candidate-record-v001.json'), 'utf8'));
  assert.equal(reread.candidates[0].candidateId, candidateId);
  assert.deepEqual(reread.candidates[0].range, range);
  validateReview(JSON.parse(await readFile(resolve(output, 'review-data-v001.json'), 'utf8')));
  const repeatedTiming = summarizeQ3SavedDigestTimingV001({instruction: JSON.parse(JSON.stringify(instruction)),
    timeline: JSON.parse(JSON.stringify(timeline)), expectedFrameCount: 65363, fps: 30});
  assert.deepEqual(repeatedTiming, timing);
  const repeatedTarget = repeatedTiming.shortestCaptions[0];
  assert.equal(`Q32-${sha(canonical({mediaSha, id: repeatedTarget.instructionId, range: repeatedTarget.outputRange})).slice(0, 20)}`, candidateId);
  for (const ref of [...references, ...protectedInputs, {path: oldHashPath, fileSha256: sha(oldBytes)}]) {
    assert.equal(sha(await readFile(ref.path)), ref.fileSha256, `入力が変更されました: ${ref.path}`);
  }
  await save('readback-verification-v001.json', {status: 'passed', candidateId, range, reviewSha256: sha(canonical(review)),
    candidateCount: 1, boundedByAdviserMaximum: 3, deterministicTimingAndCandidateId: true,
    inputFilesUnchanged: true, protectedInputs});
  return {output, candidateId, range, reviewRange, locallyDecodedFrames: actual.length, qualityApproved: false};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 3, 'Usage: node q3-existing-digest-observe.mjs <unused-output-directory>');
  observeQ3ExistingDigest(process.argv[2]).then(result => console.log(json(result))).catch(error => { console.error(error); process.exitCode = 1; });
}
