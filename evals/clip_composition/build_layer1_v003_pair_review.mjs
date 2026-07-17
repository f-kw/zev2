import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { buildLayer1PairReview } from './build_layer1_pair_review.mjs';
import { loadChunkedSttWords } from './layer1_internal_trim.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const PREFLIGHT_PATH = path.join(import.meta.dirname, 'outputs/internal-edit/20260717-layer1-v003-long-gap-preflight-v001/result.json');
const OUTPUT_ROOT = path.join(import.meta.dirname, 'outputs/internal-edit/20260717-layer1-v003-long-gap-pair-review-v001');
const SOURCE_PATH = 'evals/clip_composition/research/downloads/nE_bNeBNp4E/sources/qdczJpv8RCc/qdczJpv8RCc.mp4';
const STT_ROOT = path.join(import.meta.dirname, 'stt/nE_bNeBNp4E_qdczJpv8RCc_local30_v001/source');
const THRESHOLD_MS = 2000;
const EDGE_PADDING_MS = 120;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function findUtteranceRange(words, candidate) {
  const previousId = candidate.previous?.utteranceId;
  const nextId = candidate.next?.utteranceId;
  if (!previousId || previousId !== nextId) {
    throw new Error(`${candidate.candidateId}: 同一発話まとまりではありません`);
  }
  const utteranceWords = words.filter((word) => word.utteranceId === previousId);
  if (utteranceWords.length === 0) throw new Error(`${candidate.candidateId}: 発話まとまりを復元できません`);
  const startMs = utteranceWords[0].startMs;
  const endMs = utteranceWords.at(-1).endMs;
  if (!(startMs < candidate.startMs && candidate.endMs < endMs)) {
    throw new Error(`${candidate.candidateId}: 候補が発話まとまり内に収まりません`);
  }
  return {
    utteranceId: previousId,
    startMs,
    endMs,
    text: utteranceWords.map((word) => word.text).join('')
  };
}

function mediaDurationMs(filePath) {
  const result = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`媒体時間を確認できません: ${filePath}\n${result.stderr}`);
  return Math.round(Number(result.stdout.trim()) * 1000);
}

async function main() {
  const preflight = readJson(PREFLIGHT_PATH);
  const threshold = preflight.thresholds.find((item) => item.thresholdMs === THRESHOLD_MS);
  if (!threshold) throw new Error('2秒閾値の診断結果がありません');
  const candidates = threshold.candidates.filter((item) => item.guardAllowed && item.protectedIds.length === 0);
  if (candidates.length !== 3) throw new Error(`2秒の安全候補が3件ではありません: ${candidates.length}`);

  const words = loadChunkedSttWords(STT_ROOT).words;
  const selections = candidates.map((candidate) => {
    const outerRange = findUtteranceRange(words, candidate);
    const cutStartMs = candidate.startMs + EDGE_PADDING_MS;
    const cutEndMs = candidate.endMs - EDGE_PADDING_MS;
    if (cutStartMs >= cutEndMs) throw new Error(`${candidate.candidateId}: 保護余白で候補が消えます`);
    return {
      fixtureId: candidate.fixtureId,
      expectedIndex: candidate.expectedIndex,
      candidateId: candidate.candidateId,
      sourcePath: SOURCE_PATH,
      outerRange: { sourceVideoId: 'qdczJpv8RCc', startMs: outerRange.startMs, endMs: outerRange.endMs },
      context: outerRange,
      cutDirectives: [{
        cutId: `${candidate.candidateId}:cut-001`,
        startMs: cutStartMs,
        endMs: cutEndMs,
        durationMs: cutEndMs - cutStartMs,
        beforeText: candidate.previous.text,
        afterText: candidate.next.text,
        acousticAbsence: { startMs: candidate.startMs, endMs: candidate.endMs, durationMs: candidate.durationMs },
        edgePaddingMs: EDGE_PADDING_MS
      }],
      remainingSourceRanges: [
        { sourceVideoId: 'qdczJpv8RCc', startMs: outerRange.startMs, endMs: cutStartMs },
        { sourceVideoId: 'qdczJpv8RCc', startMs: cutEndMs, endMs: outerRange.endMs }
      ]
    };
  });

  const packageInput = {
    kind: 'layer1_v003_conservative_long_gap_pair_review_input',
    version: 'layer1-v003-long-gap-pair-review-v001',
    generationLineage: 'layer1-v003-pair-review@deterministic-rule+webrtcvad-2.0.14',
    sourcePreflight: path.relative(ROOT, PREFLIGHT_PATH),
    thresholdMs: THRESHOLD_MS,
    edgePaddingMs: EDGE_PADDING_MS,
    implementationScope: '人間ペア比較パッケージ専用。標準処理・本体接続ではない。',
    humanReview: {
      itemCount: selections.length,
      sessionCount: 1,
      timerRequired: false,
      resultContract: ['詰め後が良い', '差はない', '詰め前が良い'],
      seamNaturalnessOptionalNote: true,
      selections
    }
  };

  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  const inputPath = path.join(OUTPUT_ROOT, 'package-input.json');
  fs.writeFileSync(inputPath, `${JSON.stringify(packageInput, null, 2)}\n`);
  const reviewRoot = path.join(OUTPUT_ROOT, 'human-pair-review');
  const review = await buildLayer1PairReview(inputPath, reviewRoot);
  const mediaVerification = selections.map((selection, index) => {
    const stem = `item-${String(index + 1).padStart(2, '0')}`;
    const beforePath = path.join(reviewRoot, 'media', `${stem}-before.mp4`);
    const afterPath = path.join(reviewRoot, 'media', `${stem}-after.mp4`);
    const beforeDurationMs = mediaDurationMs(beforePath);
    const afterDurationMs = mediaDurationMs(afterPath);
    if (!(fs.statSync(beforePath).size > 0 && fs.statSync(afterPath).size > 0 && beforeDurationMs > afterDurationMs)) {
      throw new Error(`${selection.candidateId}: 詰め前後の媒体検査に失敗しました`);
    }
    return {
      candidateId: selection.candidateId,
      beforeDurationMs,
      afterDurationMs,
      observedReductionMs: beforeDurationMs - afterDurationMs,
      plannedReductionMs: selection.cutDirectives[0].durationMs
    };
  });
  const html = fs.readFileSync(review.reviewPath, 'utf8');
  const embeddedScript = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
  if (!embeddedScript) throw new Error('比較画面のスクリプトがありません');
  new vm.Script(embeddedScript);
  const htmlContract = {
    cardCount: (html.match(/class="card" data-item=/g) ?? []).length,
    decisionInputCount: (html.match(/type="radio"/g) ?? []).length,
    seamNoteCount: (html.match(/data-seam-note="\d+"/g) ?? []).length,
    hasTimer: /timer|elapsed|performance\.now|Date\.now/.test(html),
    hasAutomaticStorage: /localStorage|sessionStorage|fetch\(/.test(html),
    hasResultCopy: html.includes('結果をコピー'),
    scriptSyntaxPassed: true
  };
  if (htmlContract.cardCount !== 3 || htmlContract.decisionInputCount !== 9 || htmlContract.seamNoteCount !== 3 || htmlContract.hasTimer || htmlContract.hasAutomaticStorage || !htmlContract.hasResultCopy) {
    throw new Error(`比較画面の契約検査に失敗しました: ${JSON.stringify(htmlContract)}`);
  }
  fs.writeFileSync(path.join(OUTPUT_ROOT, 'manifest.json'), `${JSON.stringify({
    kind: 'layer1_v003_conservative_long_gap_pair_review_package',
    version: 'layer1-v003-long-gap-pair-review-v001',
    createdAt: '2026-07-17',
    sourcePreflight: packageInput.sourcePreflight,
    thresholdMs: THRESHOLD_MS,
    edgePaddingMs: EDGE_PADDING_MS,
    itemCount: review.itemCount,
    reviewPath: path.relative(ROOT, review.reviewPath),
    mediaVerification,
    htmlContract,
    humanWork: { independentJudgments: 3, sessions: 1, estimatedMinutes: '3〜6', timerRequired: false },
    layer1FreezeAfterReview: true
  }, null, 2)}\n`);
  console.log(JSON.stringify({ outputRoot: path.relative(ROOT, OUTPUT_ROOT), ...review }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
