#!/usr/bin/env node

import {createReadStream} from 'node:fs';
import {open, readFile} from 'node:fs/promises';
import {dirname, resolve, sep} from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

import {
  calculateGeminiAgenticPleasantCostV001,
  formalJsonBytesV001,
  inspectAgenticEvidenceV001,
  sha256BytesV001,
} from './gemini_agentic_pleasant_candidate_v001.mjs';
import {
  buildProviderIdContractReviewV002,
  buildSavedRawCandidateResultV002,
  buildSavedRawOverlapDiagnosticV002,
  extractSavedInteractionOutputV002,
  validateProviderIdContractReviewV002,
} from './gemini_agentic_pleasant_candidate_v002.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUTPUT_ROOT =
  'evals/clip_composition/outputs/'
    + 'gemini-agentic-pleasant-candidates-o8rZAhARXAc-v001/attempt-0001';
const PATHS = Object.freeze({
  job:
    'evals/clip_composition/jobs/gemini-agentic-pleasant-candidates/'
      + 'o8rZAhARXAc-v001.json',
  exactRequest: `${OUTPUT_ROOT}/exact-request-v001.json`,
  preflight: `${OUTPUT_ROOT}/preflight-v001.json`,
  rawResponse: `${OUTPUT_ROOT}/raw-response-v001.json`,
  executionRecord: `${OUTPUT_ROOT}/execution-record-v001.json`,
  failureEvidence: `${OUTPUT_ROOT}/failure-evidence-v001.json`,
  commentArtifact:
    'evals/clip_composition/outputs/'
      + 'work-distant-connection-comparison-input-o8rZAhARXAc-v001/'
      + 'comment-velocity-minute-series-v001.json',
  idContractReview: `${OUTPUT_ROOT}/provider-id-contract-review-v002.json`,
  candidateResult: `${OUTPUT_ROOT}/candidate-result-v002.json`,
  overlapDiagnostic: `${OUTPUT_ROOT}/comment-overlap-diagnostic-v002.json`,
  usageAndCost: `${OUTPUT_ROOT}/usage-and-cost-v002.json`,
  verification: `${OUTPUT_ROOT}/saved-raw-verification-v002.json`,
});
const ORIGINAL_HASHES = Object.freeze({
  job: 'b9f86fdb0f4d89ba351d65d27a258932876739958e80dff816d1c9c31b8b901b',
  exactRequest:
    '035101cb6eb05c2545bd121506aea79abbe92e96306c8d3619ca38086c5a6075',
  preflight:
    '51054a37cb05f2079d158f5fe5e8621d6923e0d04a481e6bf85da33ec480efd5',
  rawResponse:
    'b2f3fda40a8fb2a836904091abf41c3cce2cea3187f82fd0f043904ea4208269',
  executionRecord:
    '21dd6056f3823738c7e760364b708cf78e66fffc5a62cbd72ec89d6e8f7f7b10',
  failureEvidence:
    '7a2d02c8dfd954b4c17e51a9eb9ec9c1a91a81e76a87ae4761ec09ed16f10916',
  commentArtifact:
    'd3792d8e83729b95d0a417a956f63f40cb45512410b6484a1d3701b5646c28f9',
});

class Stop extends Error {
  constructor(code, path = '$', facts = {}) {
    super(code);
    this.code = code;
    this.path = path;
    this.facts = facts;
  }
}

const absolute = (path) => {
  const result = resolve(ROOT, path);
  if (result !== `${ROOT}${sep}${path}`) {
    throw new Stop('PATH_OUTSIDE_WORKSPACE', path);
  }
  return result;
};

const hashFile = async (path) => {
  const {createHash} = await import('node:crypto');
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(absolute(path))) hash.update(chunk);
  return hash.digest('hex');
};

const writeExclusive = async (path, bytes) => {
  const handle = await open(absolute(path), 'wx', 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  const reread = await readFile(absolute(path));
  if (!reread.equals(bytes)) throw new Stop('WRITE_REREAD_MISMATCH', path);
};

const assertOriginalHashes = async () => {
  const observed = {};
  for (const [name, expected] of Object.entries(ORIGINAL_HASHES)) {
    observed[name] = await hashFile(PATHS[name]);
    if (observed[name] !== expected) {
      throw new Stop('ORIGINAL_EVIDENCE_HASH_MISMATCH', PATHS[name], {
        name,
        expected,
        observed: observed[name],
      });
    }
  }
  return observed;
};

const assertOutputPathsUnused = async () => {
  for (const name of [
    'idContractReview',
    'candidateResult',
    'overlapDiagnostic',
    'usageAndCost',
    'verification',
  ]) {
    try {
      await readFile(absolute(PATHS[name]));
      throw new Stop('RECOVERY_OUTPUT_ALREADY_EXISTS', PATHS[name]);
    } catch (error) {
      if (error instanceof Stop) throw error;
      if (error?.code !== 'ENOENT') throw error;
    }
  }
};

const main = async () => {
  if (process.argv.length !== 2) throw new Stop('USAGE_INVALID');
  await assertOutputPathsUnused();
  const originalHashesBefore = await assertOriginalHashes();
  const [
    exactRequestBytes,
    rawResponseBytes,
    executionRecordBytes,
    failureEvidenceBytes,
    commentArtifactBytes,
  ] = await Promise.all([
    readFile(absolute(PATHS.exactRequest)),
    readFile(absolute(PATHS.rawResponse)),
    readFile(absolute(PATHS.executionRecord)),
    readFile(absolute(PATHS.failureEvidence)),
    readFile(absolute(PATHS.commentArtifact)),
  ]);
  const exactRequest = JSON.parse(exactRequestBytes);
  const envelope = JSON.parse(rawResponseBytes);
  const executionRecord = JSON.parse(executionRecordBytes);
  const failureEvidence = JSON.parse(failureEvidenceBytes);
  const commentArtifact = JSON.parse(commentArtifactBytes);

  if (exactRequest.model !== 'gemini-3.5-flash-lite'
    || exactRequest.input?.[0]?.type !== 'video'
    || exactRequest.input[0].uri
      !== 'https://www.youtube.com/watch?v=o8rZAhARXAc'
    || exactRequest.input[0].processing !== 'agentic'
    || exactRequest.store !== false) {
    throw new Stop('EXACT_REQUEST_BINDING_INVALID', '$');
  }
  if (failureEvidence.code !== 'PROVIDER_RESPONSE_ID_MISSING'
    || failureEvidence.apiRetryPerformed !== false) {
    throw new Stop('ORIGINAL_FAILURE_EVIDENCE_INVALID', '$');
  }

  const extracted = extractSavedInteractionOutputV002(envelope);
  if (extracted.status !== 'extracted') {
    throw new Stop(extracted.code, extracted.path, extracted.facts);
  }
  const agenticEvidence = inspectAgenticEvidenceV001(envelope);
  if (!agenticEvidence.agenticProcessingObserved
    || agenticEvidence.processingCallCount !== 1
    || agenticEvidence.processingResultCount !== 1
    || agenticEvidence.pairedProcessingCallCount !== 1) {
    throw new Stop('AGENTIC_EXECUTION_EVIDENCE_INVALID', '$.steps');
  }
  const cost = calculateGeminiAgenticPleasantCostV001(envelope.usage);
  if (cost.status !== 'calculated') {
    throw new Stop(cost.code, cost.path, cost.facts);
  }

  const idContractReview = buildProviderIdContractReviewV002({
    rawResponseSha256: originalHashesBefore.rawResponse,
  });
  const idContractValidation = validateProviderIdContractReviewV002(
    idContractReview,
  );
  if (idContractValidation.status !== 'passed') {
    throw new Stop(idContractValidation.code, idContractValidation.path);
  }
  const candidateBuild = buildSavedRawCandidateResultV002({
    exactRequestBytes,
    rawResponseBytes,
    envelope,
    executionRecord,
    candidateValue: extracted.value,
    attemptId: 'attempt-0001',
  });
  if (candidateBuild.status !== 'built') {
    throw new Stop(candidateBuild.code, candidateBuild.path, candidateBuild.facts);
  }
  const candidateResultBytes = formalJsonBytesV001(candidateBuild.value);
  const overlapBuild = buildSavedRawOverlapDiagnosticV002({
    candidateResult: candidateBuild.value,
    candidateResultBytes,
    commentArtifact,
    commentArtifactBytes,
  });
  if (overlapBuild.status !== 'built') {
    throw new Stop(overlapBuild.code, overlapBuild.path, overlapBuild.facts);
  }
  const overlapBytes = formalJsonBytesV001(overlapBuild.value);
  const usageAndCost = {
    schemaVersion: 'gemini-agentic-pleasant-usage-and-cost-v002',
    recoveryMode: 'saved-raw-only-no-api-communication',
    rawResponseSha256: originalHashesBefore.rawResponse,
    savedUsage: envelope.usage,
    estimatedCost: cost.value,
    estimateMeaning:
      '保存usageと保存済みStandard価格情報からの推定であり実請求額ではない',
    originalApiCommunicationCount: 1,
    originalAutomaticRetryCount: 0,
    additionalApiCommunicationCount: 0,
    additionalApiCostUsd: 0,
  };
  const idContractReviewBytes = formalJsonBytesV001(idContractReview);
  const usageAndCostBytes = formalJsonBytesV001(usageAndCost);

  await writeExclusive(PATHS.idContractReview, idContractReviewBytes);
  await writeExclusive(PATHS.candidateResult, candidateResultBytes);
  await writeExclusive(PATHS.overlapDiagnostic, overlapBytes);
  await writeExclusive(PATHS.usageAndCost, usageAndCostBytes);

  const originalHashesAfter = await assertOriginalHashes();
  if (JSON.stringify(originalHashesAfter) !== JSON.stringify(originalHashesBefore)) {
    throw new Stop('ORIGINAL_EVIDENCE_CHANGED_DURING_RECOVERY', '$');
  }
  const verification = {
    schemaVersion: 'gemini-agentic-pleasant-saved-raw-verification-v002',
    status: 'passed',
    recoveryMode: 'saved-raw-only-no-api-communication',
    contractDecision: {
      originalStopWasProviderFailure: false,
      originalStopWasLocalSavingContractOverconstraint: true,
      providerResponseIdRequired: false,
      providerResponseIdFabricated: false,
    },
    checks: {
      originalEvidenceHashesExactBeforeRecovery: true,
      originalEvidenceHashesExactAfterRecovery: true,
      originalFailureEvidencePreserved: true,
      exactRequestAndRawResponseBound: true,
      sourceVideoIdAndYoutubeUrlBound: true,
      modelAttemptTimeHttpAndCompletionBound: true,
      structuredOutputPresent: true,
      schemaAndExtraFieldsStrict: true,
      candidateTimesWithinSource: true,
      endStrictlyAfterStart: true,
      exactDuplicatesAbsent: true,
      chronologicalOrderDeterministic: true,
      candidateIdsDeterministicFromSavedRawAndOrder: true,
      commentIntervalsExactly98: true,
      commentOverlapUsesTimeOnly: true,
      agenticProcessingCallAndResultPaired: true,
      exploredMediaIntervalsNotExposed: true,
      additionalApiCommunicationZero: true,
      candidateTimesManuallyChanged: false,
    },
    originalEvidenceSha256: originalHashesAfter,
    derivedArtifacts: {
      providerIdContractReviewSha256: sha256BytesV001(idContractReviewBytes),
      candidateResultSha256: sha256BytesV001(candidateResultBytes),
      overlapDiagnosticSha256: sha256BytesV001(overlapBytes),
      usageAndCostSha256: sha256BytesV001(usageAndCostBytes),
    },
    agenticEvaluation: {
      confirmed:
        '長尺動画を対象にAgentic動画探索が正常完了した',
      notConfirmed:
        '3時間18分の動画全体を漏れなく確認したこと',
      unavailableEvidence:
        'APIが探索した全時刻範囲',
      ...agenticEvidence,
    },
    humanReviewWorkload: {
      mechanicallyFeasible:
        candidateBuild.value.workload.candidatesAtLeastOneMinute === 0,
      candidateCount: candidateBuild.value.workload.candidateCount,
      purePlaybackTimeMs: candidateBuild.value.workload.purePlaybackTimeMs,
      longestCandidateMs: candidateBuild.value.workload.longestCandidateMs,
      qualityJudgmentPerformed: false,
    },
  };
  const verificationBytes = formalJsonBytesV001(verification);
  await writeExclusive(PATHS.verification, verificationBytes);

  const derivedRereads = await Promise.all([
    readFile(absolute(PATHS.idContractReview)),
    readFile(absolute(PATHS.candidateResult)),
    readFile(absolute(PATHS.overlapDiagnostic)),
    readFile(absolute(PATHS.usageAndCost)),
    readFile(absolute(PATHS.verification)),
  ]);
  for (const bytes of derivedRereads) JSON.parse(bytes);

  process.stdout.write(`${JSON.stringify({
    status: 'passed',
    additionalApiCommunicationCount: 0,
    candidateCount: candidateBuild.value.workload.candidateCount,
    candidateDurationTotalMs:
      candidateBuild.value.workload.candidateDurationTotalMs,
    purePlaybackTimeMs: candidateBuild.value.workload.purePlaybackTimeMs,
    longestCandidateMs: candidateBuild.value.workload.longestCandidateMs,
    medianCandidateMs: candidateBuild.value.workload.medianCandidateMs,
    overlappingGeminiCandidateCount:
      overlapBuild.value.counts.overlappingGeminiCandidateCount,
    geminiOnlyCandidateCount:
      overlapBuild.value.counts.geminiOnlyCandidateCount,
    commentOnlyIntervalCount:
      overlapBuild.value.counts.commentOnlyIntervalCount,
    estimatedCostUsd: cost.value.calculatedUsd,
  })}\n`);
};

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    status: 'stopped',
    code: error?.code ?? error?.name ?? 'UNKNOWN_FAILURE',
    path: error?.path ?? '$',
    message: error?.message ?? String(error),
  })}\n`);
  process.exitCode = 1;
});
