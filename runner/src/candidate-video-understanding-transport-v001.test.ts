import assert from 'node:assert/strict';
import {readFile, mkdtemp, rm, rmdir, realpath} from 'node:fs/promises';
import {resolve, basename} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
import {
  CandidateVideoTransport, HTTP_OPERATIONS, assertJournal, assertProviderRequestAllowlist,
  buildExactRequest, byteSha, estimateUsageCost, loadPreparationJobs, parseInference,
  PREPARATION_ROOT, verifyBoundBytes, type HttpPort, type HttpRequest, type HttpResponse,
  type JournalEvent
} from './candidate-video-understanding-transport-v001.js';
import {executeStage1, STAGE1_TIMEOUTS, Stage1Timeout, wallClockDeadline, validateStage1Journal,
  assertCredentialStopResumeHistory, assertSha256FixResumeHistory, assertSha256DiagnosticHistory,
  executeItem0001Stage1, executeItem0001Attempt,
  executeRemainingStage1, executeRemainingStage1Attempt, deriveFiveItemStage1Measurement,
  executeItem0001Inference, validateItem0001InferenceRecord, ITEM0001_INFERENCE_RECORD,
  type Item0001InferenceApproval, type Item0001InferenceEvent,
  executeRemainingInference, validateRemainingInferenceRecord, REMAINING_INFERENCE_RECORD,
  type RemainingInferenceApproval,
  executeRemainingThreeInference, validateRemainingThreeInferenceRecord, REMAINING_THREE_INFERENCE_RECORD,
  type RemainingThreeInferenceApproval,
  executeItem0005Inference, validateItem0005InferenceRecord, ITEM0005_INFERENCE_RECORD,
  type Item0005InferenceApproval,
  buildCandidateVideoIdMockPlanV003, executeCandidateVideoIdMockV003,
  type CandidateVideoIdMockPlanV003,
  createCandidateVideoIdMemoryStoreMockV004, createCandidateVideoIdTemporaryStoreMockV004,
  executeCandidateVideoIdPreparationMockV004, executeCandidateVideoIdInferenceMockV004,
  inspectCandidateVideoIdExecutionRecordV004, saveCandidateVideoIdComparisonMockV004,
  deriveCandidateVideoIdPreparationBillingV004, assertCandidateVideoIdPreparationSendBillingV004,
  executeCandidateVideoIdCacheReassessmentMockV004, buildCandidateVideoIdCacheReassessmentApprovalV004,
  executeCandidateVideoIdScalarReassessmentMockV004, buildCandidateVideoIdScalarReassessmentApprovalV004,
  deriveCandidateVideoIdRemainingInferenceApprovalV004,
  type CandidateVideoIdMockStoreV004, type CandidateVideoIdEventV004, type CandidateVideoIdPairedComparisonV004,
  type Stage1Event} from './candidate-video-understanding-transport-v001.js';
import {
  buildCandidateVideoRequestTemplateV002, canonicalJsonBytesV001, candidateVideoDigestV002,
  CANDIDATE_VIDEO_ROLE_VALUES_V001, buildCandidateVideoSeparatedComparisonWindowsV002,
  extractCandidateVideoSpeechBoundariesFromSemanticArtifactV001,
  loadCandidateVideoIdInputsV003, buildCandidateVideoIdRequestV003,
  CANDIDATE_VIDEO_ID_ROLES_V003, resolveCandidateVideoIdEvidenceV003,
  type CandidateVideoIdInputV003, type CandidateVideoIdConditionV003,
  type CandidateVideoIdProviderOutputV003,
  CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004, CANDIDATE_VIDEO_ID_TIMEOUTS_V004,
  CANDIDATE_VIDEO_ID_LIMITS_V004, CANDIDATE_VIDEO_ID_FIXED_TARGETS_V004,
  CANDIDATE_VIDEO_ID_INFERENCE_POLICY_V004, assertCandidateVideoIdInferenceCostContinuationV004,
  createCandidateVideoIdCacheBillingReviewV004, deriveCandidateVideoIdCacheUsageV004,
  createCandidateVideoIdUsageScalarReviewV004, deriveCandidateVideoIdScalarUsageV004,
  buildCandidateVideoIdInputTableV004, buildCandidateVideoIdFixedRequestsV004,
  verifyCandidateVideoIdInputTableV004,
  type CandidateVideoIdExecutionPlanV004, type CandidateVideoIdPrepareApprovalV004,
  type CandidateVideoIdPrepareCostConditionsV004,
  type CandidateVideoIdInferenceApprovalV004, type CandidateVideoIdComparisonApprovalV004,
  type CandidateVideoJobV002, type CandidateVideoOutputV002
} from './candidate-video-understanding-v001.js';
import {createCandidateVideoIdMemoryRecordV005, buildCandidateVideoIdPreparationApprovalV005,
  executeCandidateVideoIdPreparationMockV005, inspectCandidateVideoIdPreparationRecordV005,
  readCandidateVideoIdLiveSourcesV005, type CandidateVideoIdSourcesV005, type CandidateVideoIdEventV005,
  type CandidateVideoIdRecordStoreV005, buildCandidateVideoIdInferenceApprovalV005,
  executeCandidateVideoIdInferenceMockV005, inspectCandidateVideoIdExecutionRecordV005,
  type CandidateVideoIdInferenceApprovalV005
} from './candidate-video-understanding-transport-v001.js';
import {CANDIDATE_VIDEO_ID_PROFILE_V005, buildCandidateVideoIdFixedRequestsV005,
  buildCandidateVideoIdPriceReviewV005} from './candidate-video-understanding-v001.js';

const workspace = resolve(import.meta.dirname, '../..');
const bytes = canonicalJsonBytesV001;
const idV4Now = '2026-09-06T00:00:00.000Z';
if (process.argv.includes('--task035-source-read-worker')) {
  const source = await readCandidateVideoIdLiveSourcesV005(workspace,
    {approvedBy: 'kawafmm', approvalReference: 'task-035-authorized-fresh-process-read-only-check'});
  const table = JSON.parse(source.inputTable.toString('utf8')), plan = JSON.parse(source.executionPlan.toString('utf8'));
  const previous = inspectCandidateVideoIdExecutionRecordV004(source.previousRecord, table, plan);
  process.stdout.write(JSON.stringify({status: 'passed', oldRecordSha256: byteSha(source.previousRecord),
    oldEventCount: previous.events.length, oldInferenceCount: previous.counts.inference,
    oldInputLimit: previous.requests.map(target => target.request.body.generationConfig.maxOutputTokens),
    newInputLimit: buildCandidateVideoIdFixedRequestsV005(table, plan).map(target => target.request.body.generationConfig.maxOutputTokens),
    actualApiCalls: 0, writes: 0}) + '\n');
  process.exit(0);
}
function idTask029BillingFixture(experimentId = 'mock-task-029-billing-only', approvalReference = 'mock-task-029-prepare') {
  const standardPrice = {inputNanoUsdPerToken: 750, outputIncludingThinkingNanoUsdPerToken: 3750,
    validThrough: '2026-12-31'} as const;
  const price = bytes({schemaVersion: 'candidate-video-understanding-provider-spec-price-snapshot-v001',
    model: 'gemini-3.8-flash', checkedOn: '2026-09-05', origin: 'mock', standardPrice});
  const summary = (url: string, text: string) => ({url, summary: text, summaryUtf8Sha256: byteSha(Buffer.from(text, 'utf8'))});
  const costConditions: CandidateVideoIdPrepareCostConditionsV004 = {
    maximumNanoUsd: '100000000', priceReference: {path: 'mock-memory/price.json', fileSha256: byteSha(price)},
    inputNanoUsdPerToken: standardPrice.inputNanoUsdPerToken,
    outputIncludingThinkingNanoUsdPerToken: standardPrice.outputIncludingThinkingNanoUsdPerToken,
    priceValidThrough: standardPrice.validThrough, acceptEstimateNotGuaranteedCap: true,
    preparationBillingReview: {
      schemaVersion: 'candidate-video-understanding-task-029-preparation-billing-review-v001',
      workOrderId: 'task-029', origin: 'mock', experimentId, approvalReference, checkedAt: idV4Now,
      evidenceType: 'japanese-verification-summary-not-source-quotation-or-full-page',
      sources: [
        summary('https://ai.google.dev/gemini-api/docs/billing', '合成確認要約。入力・出力・キャッシュの課金説明を参照した想定。'),
        summary('https://ai.google.dev/api/tokens', '合成確認要約。トークン計測要求はトークナイザーで数えると説明した想定。'),
        summary('https://ai.google.dev/gemini-api/docs/pricing', '合成確認要約。指定モデルの入力と出力単価を確認し、今回二操作の独立料金項目は見当たらない想定。')],
      model: 'gemini-3.8-flash', standardPrice: {...standardPrice}, operations: ['metadata-get','count-tokens'],
      independentPricing: 'not-found-in-reviewed-current-official-pricing', estimatedPreparationNanoUsd: '0',
      permanentFreeGuarantee: false, otherOperationsCovered: false}
  };
  return {price, approval: {phase: 'prepare' as const, origin: 'mock' as const, approvedBy: 'mock' as const,
    experimentId, approvalReference, costConditions}};
}

function task029BillingOnlySuite() {
  const checks: string[] = []; const fixture = idTask029BillingFixture();
  const serialized: Buffer[] = [];
  let simulatedSends = 0;
  const counts = {metadataGet: 0, countTokens: 0};
  const operations = [...Array.from({length: 5}, () => 'metadata-get' as const),
    ...Array.from({length: 10}, () => 'count-tokens' as const)];
  for (const operation of operations) {
    if (operation === 'metadata-get') counts.metadataGet++; else counts.countTokens++;
    const consumed = {...counts};
    const assessment = assertCandidateVideoIdPreparationSendBillingV004(fixture.approval, fixture.price, operation, consumed, idV4Now);
    serialized.push(bytes({operation, consumed, assessment}));
    // Both checks use one frozen intent count; neither check spends/reserves it.
    assert.deepEqual(assertCandidateVideoIdPreparationSendBillingV004(fixture.approval, fixture.price, operation, consumed, idV4Now), assessment);
    assert.equal(consumed.metadataGet + consumed.countTokens, simulatedSends + 1); simulatedSends++;
    assert.equal(assessment.operationEstimatedNanoUsd, '0'); assert.equal(assessment.cumulativeEstimatedNanoUsd, '0');
    assert.equal(assessment.maximumNanoUsd, '100000000'); assert.equal(assessment.origin, 'mock');
    assert.equal(assessment.actualInvoiceNanoUsd, null); assert.equal(assessment.permanentFreeGuarantee, false);
    checks.push(`${operation} ${simulatedSends}: same pre-send/replay billing boundary, one consumed count and explicit reviewed estimate`);
  }
  assert.equal(simulatedSends, 15);
  for (const line of serialized) {
    const saved = JSON.parse(line.toString('utf8'));
    assert.deepEqual(saved.assessment, deriveCandidateVideoIdPreparationBillingV004(fixture.approval,
      saved.operation, saved.consumed, idV4Now));
  }
  const complete = deriveCandidateVideoIdPreparationBillingV004(fixture.approval, null, counts, idV4Now);
  assert.deepEqual(complete.consumedCalls, {metadataGet: 5, countTokens: 10});
  assert.equal(complete.cumulativeEstimatedNanoUsd, '0');
  checks.push('fifteen memory receipts and complete totals replay through the exact helper used by production record replay');
  const rejectBeforeCallback = (label: string, mutate: (value: ReturnType<typeof idTask029BillingFixture>) => void) => {
    const changed = structuredClone(fixture); changed.price = Buffer.from(changed.price); mutate(changed);
    let sent = 0;
    assert.throws(() => {
      assertCandidateVideoIdPreparationSendBillingV004(changed.approval, changed.price, 'metadata-get',
        {metadataGet: 1, countTokens: 0}, idV4Now); sent++;
    });
    assert.equal(sent, 0); checks.push(label + ': rejected before simulated send');
  };
  rejectBeforeCallback('missing review is not unknown-to-zero fallback', value => { delete (value.approval.costConditions as any).preparationBillingReview; });
  rejectBeforeCallback('historical unknown-preparation acceptance is not retained', value => {
    (value.approval.costConditions as any).acceptUnverifiedPreparationBilling = true;
  });
  rejectBeforeCallback('unknown independent pricing', value => {
    (value.approval.costConditions.preparationBillingReview as any).independentPricing = 'unknown';
  });
  rejectBeforeCallback('changed nonzero preparation price', value => {
    value.approval.costConditions.preparationBillingReview.estimatedPreparationNanoUsd = '1' as '0';
  });
  rejectBeforeCallback('calculation unavailable', value => {
    delete (value.approval.costConditions.preparationBillingReview as any).estimatedPreparationNanoUsd;
  });
  rejectBeforeCallback('reviewed summary changed without SHA update', value => {
    value.approval.costConditions.preparationBillingReview.sources[0].summary += '改変';
  });
  rejectBeforeCallback('mock evidence cannot authorize a live operation', value => { value.approval.origin = 'live' as 'mock'; });
  rejectBeforeCallback('review approval binding changed', value => { value.approval.approvalReference += '-changed'; });
  rejectBeforeCallback('future verification time', value => {
    value.approval.costConditions.preparationBillingReview.checkedAt = '2026-09-07T00:00:00.000Z';
  });
  rejectBeforeCallback('saved price bytes changed immediately before send', value => { value.price = Buffer.concat([value.price, Buffer.from(' ')]); });
  rejectBeforeCallback('wrong saved price SHA', value => { value.approval.costConditions.priceReference.fileSha256 = '0'.repeat(64); });
  rejectBeforeCallback('unapproved preparation frame', value => { value.approval.costConditions.maximumNanoUsd = '100000001'; });
  rejectBeforeCallback('permanent-free claim forbidden', value => {
    value.approval.costConditions.preparationBillingReview.permanentFreeGuarantee = true as false;
  });
  rejectBeforeCallback('other operations cannot inherit this decision', value => {
    value.approval.costConditions.preparationBillingReview.otherOperationsCovered = true as false;
  });
  for (const operation of ['inference','upload-start','upload-finalize','other-api'] as const) {
    assert.throws(() => deriveCandidateVideoIdPreparationBillingV004(fixture.approval,
      operation as 'metadata-get', {metadataGet: 1, countTokens: 0}, idV4Now));
    checks.push(`${operation}: cannot use preparation zero estimate`);
  }
  for (const invalid of [{metadataGet: 6, countTokens: 0}, {metadataGet: 5, countTokens: 11},
    {metadataGet: 4, countTokens: 1}]) {
    assert.throws(() => deriveCandidateVideoIdPreparationBillingV004(fixture.approval,
      invalid.countTokens ? 'count-tokens' : 'metadata-get', invalid, idV4Now));
    checks.push('counter/order outside approved five GET and ten measurements rejected');
  }
  assert.throws(() => assertCandidateVideoIdPreparationSendBillingV004(fixture.approval, fixture.price,
    'metadata-get', {metadataGet: 1, countTokens: 0}, '2027-01-01T00:00:00.000Z'));
  checks.push('expired price period rejected without an invented freshness TTL');
  process.stdout.write(JSON.stringify({suite: 'task-029-preparation-billing-only', status: 'passed', checks: checks.length,
    proof: checks, simulatedBoundarySends: simulatedSends, fullTransportRuns: 0,
    formalInputReads: 0, humanEvaluationReads: 0, actualApiCalls: 0, actualApiCostUsd: 0,
    temporaryPathsCreated: 0, artifactWrites: 0}) + '\n');
}

// This branch precedes every loader, prior-artifact read, subprocess and temp
// directory. The current scoped check is purely synthetic in-memory arithmetic.
if (process.argv.includes('--task029-billing-only')) { task029BillingOnlySuite(); process.exit(0); }

function idV4Fixture(inputs: CandidateVideoIdInputV003[]) {
  const table = buildCandidateVideoIdInputTableV004('mock-task-028-independent-experiment', 'mock', inputs);
  const files = inputs.map(input => ({itemId: input.itemId, name: `files/mock-task028-${input.itemId}`,
    uri: `https://generativelanguage.googleapis.com/v1beta/files/mock-task028-${input.itemId}`,
    expirationTime: '2026-09-07T00:00:00.000Z', mimeType: 'video/mp4' as const,
    byteLength: input.mediaByteLength, mediaSha256: input.bindings.explorationVideo.fileSha256}));
  const filesSource = bytes({origin: 'mock', files});
  const plan: CandidateVideoIdExecutionPlanV004 = {schemaVersion: 'candidate-video-understanding-id-execution-plan-v004',
    experimentId: table.experimentId, origin: 'mock', inputTableSha256: candidateVideoDigestV002(table),
    targets: structuredClone([...CANDIDATE_VIDEO_ID_FIXED_TARGETS_V004]), files,
    filesSourceBinding: {path: 'mock-memory/files-source.json', fileSha256: byteSha(filesSource)},
    timeouts: {...CANDIDATE_VIDEO_ID_TIMEOUTS_V004}, limits: {...CANDIDATE_VIDEO_ID_LIMITS_V004}, retry: 0, repair: 0, reupload: 0, extraPoll: 0};
  const billing = idTask029BillingFixture(table.experimentId, 'mock-prepare-only'); const price = billing.price;
  const approval: CandidateVideoIdPrepareApprovalV004 = {schemaVersion: 'candidate-video-understanding-id-approval-v004',
    experimentId: table.experimentId, origin: 'mock', approvedBy: 'mock', approvalReference: 'mock-prepare-only',
    phase: 'prepare', planSha256: candidateVideoDigestV002(plan), inputTableSha256: candidateVideoDigestV002(table),
    timeouts: {...plan.timeouts}, targets: structuredClone(plan.targets),
    limits: {metadataGet: 5, countTokens: 10, inference: 0, perConditionInference: 0, total: 15},
    costConditions: billing.approval.costConditions};
  return {table, plan, filesSource, price, approval, requests: buildCandidateVideoIdFixedRequestsV004(table, plan)};
}
function idV4Envelope(input: CandidateVideoIdInputV003) {
  const output: CandidateVideoIdProviderOutputV003 = {schemaVersion: 'candidate-video-understanding-id-provider-output-v003',
    itemId: input.itemId, observations: input.segments.flatMap(segment => CANDIDATE_VIDEO_ID_ROLES_V003.map(role => ({
      role, segmentId: segment.segmentId, status: 'notObserved' as const, description: '合成応答。観測できない。',
      evidenceUtteranceRanges: [], evidenceKinds: [], reactionKind: role === 'reaction' ? 'unknown' as const : 'notApplicable' as const,
      idLocation: 'segmentOnlyEventUnresolved' as const, unconfirmedPoints: ['合成試験'], causalScope: 'notClaimed' as const, causalEvidence: []})))};
  return {modelVersion: 'gemini-3.8-flash', candidates: [{finishReason: 'STOP', content: {role: 'model', parts: [{text: JSON.stringify(output)}]}}],
    usageMetadata: {promptTokenCount: 100, candidatesTokenCount: 20, thoughtsTokenCount: 30, totalTokenCount: 150}};
}
function idV4Dependencies(inputs: CandidateVideoIdInputV003[], fixture: ReturnType<typeof idV4Fixture>,
  store: CandidateVideoIdMockStoreV004, fault?: (request: HttpRequest, response: HttpResponse, ordinal: number) => HttpResponse) {
  const calls: HttpRequest[] = [];
  const port: HttpPort = {mode: 'mock', async exchange(request) {
    const record = (await store.read('executionRecord'))!;
    const event: CandidateVideoIdEventV004 = JSON.parse(record.toString('utf8').trimEnd().split('\n').at(-1)!);
    assert.equal(event.phase, 'intent');
    assert.equal(byteSha(request.body), event.detail.bodySha256);
    assert.equal(request.url, event.detail.exactRequest.url);
    assert.equal(request.method, event.detail.exactRequest.method);
    inspectCandidateVideoIdExecutionRecordV004(record, fixture.table, fixture.plan);
    calls.push(request);
    let body: Buffer;
    if (request.method === 'GET') {
      const file = fixture.plan.files.find(file => file.uri === request.url)!;
      body = bytes({name: file.name, uri: file.uri, expirationTime: file.expirationTime, mimeType: file.mimeType,
        sizeBytes: String(file.byteLength), sha256Hash: Buffer.from(file.mediaSha256, 'hex').toString('base64'), state: 'ACTIVE'});
    } else if (request.url.endsWith(':countTokens')) {
      const fixed = fixture.requests.find(target => target.exactRequestSha256 === event.detail.completeInferenceRequestSha256)!;
      assert.deepEqual(JSON.parse(request.body.toString('utf8')),
        {generateContentRequest: {model: 'models/gemini-3.8-flash', ...fixed.request.body}});
      // One value deliberately equals an old numeric-request count. Its validity
      // comes solely from this new request/response binding, never inequality.
      body = bytes({totalTokens: 32350 + fixture.requests.indexOf(fixed)});
    } else body = bytes(idV4Envelope(inputs.find(input => input.itemId === event.itemId)!));
    const response: HttpResponse = {status: 200, headers: {'provider-header': 'must-never-be-saved'}, body};
    return fault ? fault(request, response, calls.length) : response;
  }};
  return {calls, deps: {store, port, clock: () => idV4Now, filesSource: fixture.filesSource, price: fixture.price,
    containsSecret: (raw: Buffer) => raw.includes(Buffer.from('synthetic-private-key'))}};
}
async function idV4InferenceApproval(fixture: ReturnType<typeof idV4Fixture>, store: CandidateVideoIdMockStoreV004,
  indexes = fixture.requests.map((_, index) => index), reference = 'mock-inference-new-approval'): Promise<CandidateVideoIdInferenceApprovalV004> {
  const {preparationBillingReview: _review, ...priceConditions} = structuredClone(fixture.approval.costConditions);
  return {...structuredClone(fixture.approval), phase: 'inference', approvalReference: reference,
    costConditions: {...priceConditions, maximumNanoUsd: '1000000000'},
    executionPolicy: {...CANDIDATE_VIDEO_ID_INFERENCE_POLICY_V004},
    expectedRecordSha256: byteSha((await store.read('executionRecord'))!),
    targets: indexes.map(index => ({itemId: fixture.requests[index].itemId, condition: fixture.requests[index].condition,
      exactRequestSha256: fixture.requests[index].exactRequestSha256})),
    limits: {metadataGet: 0, countTokens: 0, inference: indexes.length, perConditionInference: 1, total: indexes.length}};
}

const task032UsageA = {promptTokenCount: 30215, candidatesTokenCount: 150, thoughtsTokenCount: 3932, totalTokenCount: 34297,
  serviceTier: 'standard', promptTokensDetails: [{modality: 'TEXT', tokenCount: 30215}]};
const task032UsageB = {promptTokenCount: 60838, candidatesTokenCount: 954, thoughtsTokenCount: 3127,
  cachedContentTokenCount: 27542, totalTokenCount: 64919, serviceTier: 'standard',
  promptTokensDetails: [{modality: 'VIDEO', tokenCount: 30623}, {modality: 'TEXT', tokenCount: 30215}],
  cacheTokensDetails: [{modality: 'TEXT', tokenCount: 13679}, {modality: 'VIDEO', tokenCount: 13863}]};
function task032Rechain(events: CandidateVideoIdEventV004[]) {
  let previous: string | null = null;
  for (const [index, event] of events.entries()) {
    event.sequence = index + 1; event.previousSha256 = previous;
    const {sha256: _sha, ...content} = event;
    event.sha256 = candidateVideoDigestV002(content); previous = event.sha256;
  }
  return Buffer.concat(events.map(bytes));
}

/** Explicit synthetic history manufacture, never a selectable old execution
 * mode. First use the current fee rules to execute two mock responses; project
 * those saved bytes into the documented, pre-cache-support audit contract. */
async function task032HistoricalFixture(inputs: CandidateVideoIdInputV003[], acceptedB = false) {
  const fixture = idV4Fixture(inputs);
  let preventThirdSend = false;
  const currentStore = createCandidateVideoIdMemoryStoreMockV004({async beforeAppend(event) {
    if (preventThirdSend && event.stage === 'inference' && event.phase === 'intent' && event.detail.operationOrdinal === 18)
      throw new Error('synthetic-history-fixture-ends-after-two-current-rule-responses');
  }});
  const preparation = idV4Dependencies(inputs, fixture, currentStore);
  const prepared = await executeCandidateVideoIdPreparationMockV004(inputs, fixture.table, fixture.plan, fixture.approval, preparation.deps);
  assert.equal(prepared.status, 'completed-phase'); assert.equal(preparation.calls.length, 15);
  const inference = idV4Dependencies(inputs, fixture, currentStore, (_request, response, ordinal) => {
    assert.ok(ordinal <= 2);
    const envelope = JSON.parse(response.body.toString('utf8'));
    envelope.usageMetadata = structuredClone(ordinal === 1 ? task032UsageA : task032UsageB);
    envelope.candidates[0].finishReason = ordinal === 2 && acceptedB ? 'STOP' : 'MAX_TOKENS';
    return {...response, body: bytes(envelope)};
  });
  preventThirdSend = true;
  const originalApproval = await idV4InferenceApproval(fixture, currentStore, undefined, 'mock-task030-original-ten-approval');
  const currentRun = await executeCandidateVideoIdInferenceMockV004(inputs, originalApproval, inference.deps);
  assert.equal(inference.calls.length, 2);
  assert.equal(currentRun.proof.targets[0].acceptance, 'rejected');
  assert.equal(currentRun.proof.targets[1].acceptance, acceptedB ? 'accepted' : 'rejected');
  const currentEvents: CandidateVideoIdEventV004[] = (await currentStore.read('executionRecord'))!.toString('utf8')
    .trimEnd().split('\n').map(line => JSON.parse(line));
  assert.equal(currentEvents.length, 57);
  const events = structuredClone(currentEvents);
  const boundary = events[48]; assert.equal(boundary.phase, 'boundary'); assert.ok(boundary.detail.cacheBillingReview);
  boundary.detail = {approval: originalApproval};
  for (const [index, target] of fixture.requests.slice(0, 2).entries()) {
    const responseEvent = events[50 + index * 4], usageEvent = events[51 + index * 4];
    assert.equal(responseEvent.phase, 'response'); assert.equal(usageEvent.phase, 'usage');
    const providerUsage = JSON.parse(Buffer.from(responseEvent.detail.rawResponseBase64, 'base64').toString('utf8')).usageMetadata;
    const oldComplete = index === 0;
    const oldUsage = {origin: 'mock', providerUsage, complete: oldComplete,
      estimatedNanoUsd: oldComplete ? (BigInt(providerUsage.promptTokenCount) * BigInt(originalApproval.costConditions.inputNanoUsdPerToken)
        + BigInt(providerUsage.candidatesTokenCount + providerUsage.thoughtsTokenCount)
          * BigInt(originalApproval.costConditions.outputIncludingThinkingNanoUsdPerToken)).toString() : null,
      actualCharge: 'mock-no-charge', priceReference: originalApproval.costConditions.priceReference, estimateIsGuaranteedCap: false};
    usageEvent.detail = {usage: oldUsage};
    if (index === 0) {
      assert.equal(oldUsage.estimatedNanoUsd, '37968750');
      events[52].detail.usage = oldUsage; events[52].detail.cumulativeEstimatedNanoUsd = oldUsage.estimatedNanoUsd;
    } else {
      events[56].phase = 'failure'; events[56].detail = {reason: 'response-rejected-no-repair', acceptance: 'not-evaluated',
        delivery: 'response-received', recordPolicy: 'terminal-no-resume'};
    }
    assert.equal(usageEvent.itemId, target.itemId); assert.equal(usageEvent.condition, target.condition);
  }
  const record = task032Rechain(events);
  const historicalProof = inspectCandidateVideoIdExecutionRecordV004(record, fixture.table, fixture.plan);
  assert.equal(historicalProof.abnormal, true); assert.equal(historicalProof.normalPause, false);
  assert.equal(historicalProof.targets[0].acceptance, 'rejected'); assert.equal(historicalProof.targets[1].acceptance, 'not-evaluated');
  assert.equal(historicalProof.targets[1].feeStatus, 'unknown'); assert.equal(historicalProof.targets[1].usage?.estimatedNanoUsd, null);
  assert.equal(historicalProof.estimatedNanoUsd, '37968750');
  const inputTableBytes = (await currentStore.read('inputTable'))!, executionPlanBytes = (await currentStore.read('executionPlan'))!;
  async function cloneStore(hooks: Parameters<typeof createCandidateVideoIdMemoryStoreMockV004>[0] = {}, recordBytes: Buffer = record) {
    const store = createCandidateVideoIdMemoryStoreMockV004(hooks);
    await store.create('inputTable', inputTableBytes); await store.create('executionPlan', executionPlanBytes);
    await store.create('executionRecord', recordBytes); return store;
  }
  const localDeps = (store: CandidateVideoIdMockStoreV004) => ({store, clock: (): string => idV4Now,
    filesSource: fixture.filesSource, price: fixture.price,
    containsSecret: (raw: Buffer) => raw.includes(Buffer.from('synthetic-private-key'))});
  return {fixture, record, events, originalApproval, inputTableBytes, executionPlanBytes, historicalProof, cloneStore, localDeps};
}

const task033Usage = {promptTokenCount: 51784, thoughtsTokenCount: 3565, totalTokenCount: 55349,
  serviceTier: 'standard', promptTokensDetails: [{modality: 'TEXT', tokenCount: 51784}]};

/** Manufacture only a synthetic audit prefix. The first 62 lines retain the
 * task-030 stop and task-032 local recovery; only the subsequent three current
 * mock responses are projected into the old, explicitly selected audit shape. */
async function task033HistoricalFixture(inputs: CandidateVideoIdInputV003[]) {
  const history = await task032HistoricalFixture(inputs), {fixture} = history;
  const recoveredStore = await history.cloneStore();
  const recoveryApproval = buildCandidateVideoIdCacheReassessmentApprovalV004(history.record, fixture.table, fixture.plan,
    {approvedBy: 'mock', approvalReference: 'mock-task032-recovery-before-scalar-stop', checkedAt: idV4Now});
  const recovered = await executeCandidateVideoIdCacheReassessmentMockV004(inputs, recoveryApproval, history.localDeps(recoveredStore));
  assert.equal(recovered.status, 'completed-phase'); assert.equal(recovered.proof.events.length, 62);
  const recoveredRecord = (await recoveredStore.read('executionRecord'))!;
  const currentStore = await history.cloneStore({async beforeAppend(event) {
    if (event.stage === 'inference' && event.phase === 'intent'
      && event.detail.operationOrdinal === recovered.proof.counts.total + 4)
      throw new Error('synthetic-scalar-history-ends-after-three-current-rule-responses');
  }}, recoveredRecord);
  const resumedApproval = deriveCandidateVideoIdRemainingInferenceApprovalV004(recoveredRecord, fixture.table, fixture.plan,
    {approvedBy: 'mock', approvalReference: 'mock-task032-eight-before-scalar-support'});
  const memory = idV4Dependencies(inputs, fixture, currentStore, (_request, response, ordinal) => {
    assert.ok(ordinal <= 3);
    const envelope = JSON.parse(response.body.toString('utf8'));
    envelope.usageMetadata = ordinal === 3 ? structuredClone(task033Usage)
      : {promptTokenCount: 100, candidatesTokenCount: 20, thoughtsTokenCount: 30, totalTokenCount: 150,
        ...(ordinal === 2 ? {cachedContentTokenCount: 40} : {}), serviceTier: 'standard'};
    envelope.candidates[0].finishReason = 'MAX_TOKENS';
    if (ordinal === 3) envelope.candidates[0].content.parts = [];
    return {...response, body: bytes(envelope)};
  });
  const current = await executeCandidateVideoIdInferenceMockV004(inputs, resumedApproval, memory.deps);
  assert.equal(memory.calls.length, 3); assert.equal(current.proof.counts.inference, 5);
  assert.equal(current.proof.targets[4].acceptance, 'rejected');
  const events: CandidateVideoIdEventV004[] = (await currentStore.read('executionRecord'))!.toString('utf8')
    .trimEnd().split('\n').map(line => JSON.parse(line));
  assert.equal(events.length, 75); assert.equal(events[62].phase, 'boundary');
  const cacheReview = events[62].detail.cacheBillingReview;
  assert.ok(cacheReview); assert.ok(events[62].detail.usageScalarReview);
  events[62].detail = {approval: resumedApproval, cacheBillingReview: cacheReview};
  let knownCumulative = BigInt(recovered.proof.estimatedNanoUsd);
  for (let index = 0; index < 3; index++) {
    const response = events[64 + index * 4], usageEvent = events[65 + index * 4], terminal = events[66 + index * 4];
    assert.equal(response.phase, 'response'); assert.equal(usageEvent.phase, 'usage'); assert.equal(terminal.phase, 'rejected');
    const envelope = JSON.parse(Buffer.from(response.detail.rawResponseBase64, 'base64').toString('utf8'));
    const target = fixture.requests.find(target => target.itemId === response.itemId && target.condition === response.condition)!;
    const oldCalculated = index < 2 ? deriveCandidateVideoIdCacheUsageV004(envelope, cacheReview, target.request.body) : null;
    if (index === 2) assert.throws(() => deriveCandidateVideoIdCacheUsageV004(envelope, cacheReview, target.request.body));
    const oldUsage = {origin: 'mock', providerUsage: envelope.usageMetadata, complete: oldCalculated !== null,
      estimatedNanoUsd: oldCalculated?.estimatedNanoUsd ?? null, actualCharge: 'mock-no-charge',
      priceReference: resumedApproval.costConditions.priceReference, estimateIsGuaranteedCap: false,
      billingReviewSha256: candidateVideoDigestV002(cacheReview), billingBreakdown: oldCalculated?.billingBreakdown ?? null,
      feeFailure: oldCalculated === null ? 'unsupported-or-invalid-usage' : null};
    usageEvent.detail = {usage: oldUsage};
    if (oldCalculated) {
      knownCumulative += BigInt(oldCalculated.estimatedNanoUsd);
      terminal.detail.usage = oldUsage; terminal.detail.cumulativeEstimatedNanoUsd = knownCumulative.toString();
    } else {
      terminal.phase = 'failure'; terminal.detail = {reason: 'response-rejected-no-repair', acceptance: 'not-evaluated',
        delivery: 'response-received', recordPolicy: 'terminal-no-resume'};
    }
  }
  const record = task032Rechain(events);
  assert.deepEqual(record.subarray(0, recoveredRecord.length), recoveredRecord);
  const historicalProof = inspectCandidateVideoIdExecutionRecordV004(record, fixture.table, fixture.plan);
  assert.equal(historicalProof.abnormal, true); assert.equal(historicalProof.normalPause, false);
  assert.equal(historicalProof.counts.inference, 5); assert.equal(historicalProof.counts.total, 20);
  assert.equal(historicalProof.targets.slice(0, 4).every(target => target.acceptance === 'rejected'), true);
  assert.equal(historicalProof.targets[4].acceptance, 'not-evaluated'); assert.equal(historicalProof.targets[4].feeStatus, 'unknown');
  assert.equal(historicalProof.targets[4].usage?.estimatedNanoUsd, null);
  assert.equal(historicalProof.estimatedNanoUsd, knownCumulative.toString());
  assert.equal(historicalProof.usageScalarReview, null);
  const cloneStore = (hooks: Parameters<typeof createCandidateVideoIdMemoryStoreMockV004>[0] = {}, recordBytes: Buffer = record) =>
    history.cloneStore(hooks, recordBytes);
  return {...history, record, events, historicalProof, recoveredRecord, resumedApproval, cloneStore};
}
type IdV4WorkerConfig = {directory: string; action: 'prepare' | 'inference'; approval?: CandidateVideoIdInferenceApprovalV004; barrier?: boolean};
async function idV4Worker() {
  const config = await new Promise<IdV4WorkerConfig>(okay => process.once('message', value => okay(value as IdV4WorkerConfig)));
  const inputs = await loadCandidateVideoIdInputsV003(workspace); const fixture = idV4Fixture(inputs);
  const store = await createCandidateVideoIdTemporaryStoreMockV004(config.directory, {async beforeAppend(event) {
    if (config.barrier && event.stage === 'inference' && event.phase === 'boundary') {
      process.send?.({kind: 'ready'});
      await new Promise<void>(okay => process.once('message', value => { assert.equal(value, 'release'); okay(); }));
    }
  }});
  if (config.action === 'inference') {
    const saved = JSON.parse((await store.read('inputTable'))!.toString('utf8'));
    await verifyCandidateVideoIdInputTableV004(workspace, saved, 'mock');
  }
  const memory = idV4Dependencies(inputs, fixture, store);
  let result;
  try {
    result = config.action === 'prepare'
      ? await executeCandidateVideoIdPreparationMockV004(inputs, fixture.table, fixture.plan, fixture.approval, memory.deps)
      : await executeCandidateVideoIdInferenceMockV004(inputs, config.approval!, memory.deps);
    process.send?.({kind: 'result', status: result.status, calls: memory.calls.length, actualApiCalls: result.actualApiCalls,
      origin: result.origin, completed: result.proof.targets.filter(target => target.acceptance === 'accepted').length,
      persistenceFailed: result.persistenceFailed});
  } catch (error) {
    const name = error instanceof Error ? error.name : 'NonError';
    const message = error instanceof Error ? error.message : 'non-error-thrown';
    const safe = !/synthetic-private-key|AIza[\w-]{20,}|authorization|x-goog-api-key|upload_id=|upload-session/iu.test(name + message);
    process.send?.({kind: 'result', status: 'rejected', calls: memory.calls.length, actualApiCalls: 0, origin: 'mock',
      failure: safe ? {name, message} : {name: 'OmittedUnsafeDiagnostic', message: 'secret-like-diagnostic-omitted'}});
  }
  process.disconnect?.();
}
if (process.argv.includes('--id-v004-worker')) { await idV4Worker(); process.exit(0); }

// TASK-030 subprocess input crosses IPC only. Strict original-input admission
// remains the same as the disk worker; no fixture, config or artifact is written.
if (process.argv.includes('--task030-memory-worker')) {
  const saved = await new Promise<Record<string, string>>(okay => process.once('message', value => okay(value as Record<string, string>)));
  const inputs = await loadCandidateVideoIdInputsV003(workspace), fixture = idV4Fixture(inputs);
  const store = createCandidateVideoIdMemoryStoreMockV004();
  for (const kind of ['inputTable','executionPlan','executionRecord'] as const) await store.create(kind, Buffer.from(saved[kind], 'base64'));
  const proof = inspectCandidateVideoIdExecutionRecordV004((await store.read('executionRecord'))!, fixture.table, fixture.plan);
  const memory = idV4Dependencies(inputs, fixture, store);
  await assert.rejects(async () => executeCandidateVideoIdInferenceMockV004(inputs,
    await idV4InferenceApproval(fixture, store, [1], 'mock-rejected-condition-cannot-resend-in-new-process'), memory.deps));
  process.send?.({status: 'verified', normalPause: proof.normalPause, counts: proof.counts,
    accepted: proof.targets.filter(target => target.acceptance === 'accepted').length,
    rejected: proof.targets.filter(target => target.acceptance === 'rejected').length,
    recordSha256: proof.recordSha256, additionalCalls: memory.calls.length, temporaryUniquePaths: 0});
  process.disconnect?.(); process.exit(0);
}

async function idV4Suite(memoryOnly = false) {
  const checks: string[] = [];
  const inputs = await loadCandidateVideoIdInputsV003(workspace); const fixture = idV4Fixture(inputs);
  const formalBefore = await Promise.all(Object.entries(CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004)
    .filter(([kind]) => !memoryOnly || kind !== 'pairedComparison').map(async ([, path]) => {
      if (!memoryOnly) { await assert.rejects(() => readFile(resolve(workspace, path)), {code: 'ENOENT'}); return {path, sha256: null}; }
      return {path, sha256: byteSha(await readFile(resolve(workspace, path)))};
    }));
  const protectedPaths = ['docs/CURRENT_GOAL.md', 'docs/GOAL_DEFINITION.md', 'DECISIONS.md',
    `${PREPARATION_ROOT}/stage1-communication-record-v001.jsonl`, `${PREPARATION_ROOT}/provider-spec-and-price-snapshot-v001.json`];
  const protectedSha = await Promise.all(protectedPaths.map(async path => byteSha(await readFile(resolve(workspace, path)))));
  const baselineStore = createCandidateVideoIdMemoryStoreMockV004();
  const baseline = idV4Dependencies(inputs, fixture, baselineStore);
  const prepared = await executeCandidateVideoIdPreparationMockV004(inputs, fixture.table, fixture.plan, fixture.approval, baseline.deps);
  assert.equal(prepared.status, 'completed-phase'); assert.equal(baseline.calls.length, 15);
  assert.deepEqual(prepared.proof.counts, {metadataGet: 5, countTokens: 10, inference: 0, total: 15});
  assert.equal(prepared.liveReady, false); assert.equal(prepared.actualApiCalls, 0); assert.equal(prepared.simulatedApiCalls, 15);
  assert.equal(prepared.proof.measurements.length, 10); assert.equal(prepared.proof.measurements[0].totalTokens, 32350);
  assert.deepEqual(prepared.proof.preparationBillingAssessment?.consumedCalls, {metadataGet: 5, countTokens: 10});
  assert.equal(prepared.proof.preparationBillingAssessment?.cumulativeEstimatedNanoUsd, '0');
  assert.equal(prepared.proof.preparationBillingAssessment?.maximumNanoUsd, '100000000');
  assert.equal(prepared.proof.preparationBillingAssessment?.permanentFreeGuarantee, false);
  for (const intent of prepared.proof.events.filter(event => event.phase === 'intent')) {
    assert.equal(intent.detail.preparationBilling.operationEstimatedNanoUsd, '0');
    assert.equal(intent.detail.preparationBilling.cumulativeEstimatedNanoUsd, '0');
    assert.equal(intent.detail.preparationBilling.reviewSha256,
      candidateVideoDigestV002(fixture.approval.costConditions.preparationBillingReview));
  }
  checks.push('approved TASK-029 preparation estimate is separately saved as zero under its 0.10 frame with reviewed evidence in the boundary');
  for (const [index, measurement] of prepared.proof.measurements.entries()) {
    const cost = measurement.referenceCost;
    assert.equal(cost.origin, 'mock'); assert.equal(cost.kind, 'simulated-reference-estimate');
    assert.deepEqual(cost.priceReference, fixture.approval.costConditions.priceReference);
    assert.equal(cost.inputNanoUsd, (BigInt(measurement.totalTokens) * BigInt(fixture.approval.costConditions.inputNanoUsdPerToken)).toString());
    assert.equal(cost.configuredResponseTokenAllowance, fixture.requests[index].request.body.generationConfig.maxOutputTokens);
    assert.equal(cost.configuredResponseAllowanceNanoUsd, (BigInt(cost.configuredResponseTokenAllowance)
      * BigInt(fixture.approval.costConditions.outputIncludingThinkingNanoUsdPerToken)).toString());
    assert.equal(cost.inputPlusConfiguredResponseAllowanceNanoUsd,
      (BigInt(cost.inputNanoUsd) + BigInt(cost.configuredResponseAllowanceNanoUsd)).toString());
    assert.equal(cost.thinkingTokenCount, null); assert.equal(cost.preparationChargeNanoUsd, null);
    assert.equal(cost.guaranteedTotalCap, false); assert.equal(cost.isInvoice, false);
  }
  assert.equal(prepared.proof.preparationReferenceCost?.inputPlusConfiguredResponseAllowanceNanoUsd,
    prepared.proof.measurements.reduce((sum, measurement) => sum + BigInt(measurement.referenceCost.inputPlusConfiguredResponseAllowanceNanoUsd), 0n).toString());
  assert.equal(prepared.proof.preparationReferenceCost?.inputPlusConfiguredResponseAllowanceNanoUsd, '396258750');
  assert.deepEqual(prepared.proof.events.at(-1)!.detail.referenceCost, prepared.proof.preparationReferenceCost);
  checks.push('new measurements persist price-bound per-request and all-ten reference costs; mock figures are neither invoices nor thinking-inclusive guaranteed caps');
  const fixedEvent = prepared.proof.events.find(event => event.phase === 'requests-fixed')!;
  assert.equal(prepared.proof.events.filter(event => event.phase === 'metadata').every(event => event.sequence < fixedEvent.sequence), true);
  assert.equal(prepared.proof.events.filter(event => event.operation === 'count-tokens').every(event => event.sequence > fixedEvent.sequence), true);
  assert.equal(prepared.proof.targets.every(target => target.delivery === 'not-sent'), true);
  checks.push('prepare saves all ten exact requests after five ACTIVE checks and before ten new count calls; pauses without inference');
  const baselineRecord = (await baselineStore.read('executionRecord'))!;
  async function clonePrepared(hooks: Parameters<typeof createCandidateVideoIdMemoryStoreMockV004>[0] = {}) {
    const store = createCandidateVideoIdMemoryStoreMockV004(hooks);
    for (const kind of ['inputTable','executionPlan','executionRecord'] as const) await store.create(kind, (await baselineStore.read(kind))!);
    return store;
  }
  function rewriteChain(events: CandidateVideoIdEventV004[]) {
    let previous: string | null = null;
    for (const [index, event] of events.entries()) {
      event.sequence = index + 1; event.previousSha256 = previous;
      const {sha256: _sha, ...content} = event;
      event.sha256 = candidateVideoDigestV002(content); previous = event.sha256;
    }
    return Buffer.concat(events.map(bytes));
  }
  const answerFaults: Array<[string, (envelope: any, input: CandidateVideoIdInputV003) => void]> = [
    ['structured JSON', envelope => { envelope.candidates[0].content.parts[0].text = '{'; }],
    ['required field', envelope => { const output = JSON.parse(envelope.candidates[0].content.parts[0].text);
      delete output.observations[0].description; envelope.candidates[0].content.parts[0].text = JSON.stringify(output); }],
    ['unknown segment ID', envelope => { const output = JSON.parse(envelope.candidates[0].content.parts[0].text);
      output.observations[0].segmentId = 'invented-segment'; envelope.candidates[0].content.parts[0].text = JSON.stringify(output); }],
    ['another segment evidence ID', (envelope, input) => {
      const output = JSON.parse(envelope.candidates[0].content.parts[0].text);
      const otherSegment = input.segments[1] ?? inputs.find(value => value.itemId !== input.itemId)!.segments[0];
      const otherId = otherSegment.targetUtteranceIds[0];
      Object.assign(output.observations[0], {status: 'observed', evidenceKinds: ['transcript'],
        evidenceUtteranceRanges: [{fromUtteranceId: otherId, throughUtteranceId: otherId}], idLocation: 'evidenceUtterancesOnly'});
      envelope.candidates[0].content.parts[0].text = JSON.stringify(output);
    }],
    ['unknown evidence ID', envelope => { const output = JSON.parse(envelope.candidates[0].content.parts[0].text);
      Object.assign(output.observations[0], {status: 'observed', evidenceKinds: ['transcript'],
        evidenceUtteranceRanges: [{fromUtteranceId: 'semantic-utterance-999999', throughUtteranceId: 'semantic-utterance-999999'}],
        idLocation: 'evidenceUtterancesOnly'});
      envelope.candidates[0].content.parts[0].text = JSON.stringify(output); }],
    ['unfinished answer', envelope => { envelope.candidates[0].finishReason = 'MAX_TOKENS'; }],
    ['missing answer', envelope => { envelope.candidates = []; }],
    ['empty answer', envelope => { envelope.candidates[0].content.parts[0].text = ''; }]
  ];
  let mixedStore: CandidateVideoIdMockStoreV004;
  for (const [label, mutate] of answerFaults) {
    // The first input has multiple admitted segments, so this also isolates
    // same-item/other-segment IDs from invented and other-item references.
    assert.ok(inputs[0].segments.length > 1);
    const store = await clonePrepared(), memory = idV4Dependencies(inputs, fixture, store, (_request, response, ordinal) => {
      if (ordinal !== 1) return response;
      const envelope = JSON.parse(response.body.toString('utf8')); mutate(envelope, inputs[0]);
      return {...response, body: bytes(envelope)};
    });
    const result = await executeCandidateVideoIdInferenceMockV004(inputs, await idV4InferenceApproval(fixture, store, [0,1]), memory.deps);
    assert.equal(result.status, 'completed-phase'); assert.equal(memory.calls.length, 2);
    assert.equal(result.proof.targets[0].acceptance, 'rejected'); assert.equal(result.proof.targets[0].result, null);
    assert.equal(result.proof.targets[0].usage?.complete, true); assert.equal(result.proof.targets[0].feeStatus, 'estimated');
    assert.equal(result.proof.targets[1].acceptance, 'accepted');
    checks.push(label + ' is a recorded condition terminal followed by the unchanged next approved condition');
  }
  {
    mixedStore = await clonePrepared();
    const returned = new Map<number, HttpResponse>();
    const memory = idV4Dependencies(inputs, fixture, mixedStore, (_request, response, ordinal) => {
      if (ordinal > 1 && ordinal < 10) {
        const envelope = JSON.parse(response.body.toString('utf8'));
        answerFaults[ordinal - 2][1](envelope, inputs.find(input => input.itemId === fixture.requests[ordinal - 1].itemId)!);
        response = {...response, body: bytes(envelope)};
      }
      returned.set(ordinal, response); return response;
    });
    const result = await executeCandidateVideoIdInferenceMockV004(inputs, await idV4InferenceApproval(fixture, mixedStore), memory.deps);
    assert.equal(result.status, 'completed-phase'); assert.equal(result.persistenceFailed, false);
    assert.equal(result.proof.abnormal, false); assert.equal(result.savedRecordVerifiable, true);
    assert.equal(memory.calls.length, 10); assert.equal(result.actualApiCalls, 0);
    assert.equal(result.proof.targets.filter(target => target.acceptance === 'accepted').length, 2);
    assert.equal(result.proof.targets.filter(target => target.acceptance === 'rejected').length, 8);
    assert.equal(result.proof.counts.inference, 10); assert.equal(result.proof.counts.total, 25);
    assert.equal(result.retry, 0); assert.equal(result.repair, 0);
    const record = (await mixedStore.read('executionRecord'))!;
    assert.deepEqual(record.subarray(0, baselineRecord.length), baselineRecord);
    assert.deepEqual(await mixedStore.read('inputTable'), await baselineStore.read('inputTable'));
    assert.deepEqual(await mixedStore.read('executionPlan'), await baselineStore.read('executionPlan'));
    assert.equal(result.proof.estimatedNanoUsd, (10n * (100n * 750n + 50n * 3750n)).toString());
    for (const [index, state] of result.proof.targets.entries()) {
      assert.equal(state.delivery, 'response-received'); assert.equal(state.usage?.complete, true);
      assert.equal(state.feeStatus, 'estimated');
      const response = result.proof.events.find(event => event.stage === 'inference' && event.phase === 'response'
        && event.itemId === state.itemId && event.condition === state.condition)!;
      assert.deepEqual(Buffer.from(response.detail.rawResponseBase64, 'base64'), returned.get(index + 1)!.body);
      const sent = memory.calls[index], fixed = fixture.requests[index];
      assert.equal(sent.method, fixed.request.method); assert.equal(sent.url, fixed.request.url);
      assert.deepEqual(sent.body, bytes(fixed.request.body));
      assert.equal(candidateVideoDigestV002({method: sent.method, url: sent.url, body: JSON.parse(sent.body.toString('utf8'))}),
        fixed.exactRequestSha256);
      const terminal = result.proof.events.find(event => event.stage === 'inference' && ['accepted','rejected'].includes(event.phase)
        && event.itemId === state.itemId && event.condition === state.condition)!;
      const usageEvent = result.proof.events.find(event => event.stage === 'inference' && event.phase === 'usage'
        && event.itemId === state.itemId && event.condition === state.condition)!;
      assert.ok(response.sequence < usageEvent.sequence && usageEvent.sequence < terminal.sequence);
      const nextIntent = result.proof.events.find(event => event.stage === 'inference' && event.phase === 'intent'
        && event.detail.completeInferenceRequestSha256 === fixture.requests[index + 1]?.exactRequestSha256);
      if (nextIntent) assert.ok(terminal.sequence < nextIntent.sequence);
      if (state.acceptance === 'rejected') {
        assert.equal(state.result, null); assert.equal(state.rejection?.observation, null);
        assert.equal(state.rejection?.evidenceResolution, null); assert.equal(state.rejection?.finalSelectionProduced, false);
        assert.deepEqual(state.rejection?.usage, state.usage); assert.ok(state.rejection?.rejection.reason);
        assert.deepEqual(state.rejection?.answer.candidates, JSON.parse(returned.get(index + 1)!.body.toString('utf8')).candidates ?? null);
        assert.equal(result.proof.events.some(event => event.phase === 'accepted' && event.itemId === state.itemId
          && event.condition === state.condition), false);
      } else { assert.ok(state.result); assert.equal(state.rejection, null); }
    }
    assert.equal(new Set(memory.calls.map(call => byteSha(call.body))).size, 10);
    for (const condition of ['A','B']) assert.deepEqual(result.proof.targets.filter(target => target.condition === condition)
      .reduce((count, target) => ({accepted: count.accepted + Number(target.acceptance === 'accepted'),
        rejected: count.rejected + Number(target.acceptance === 'rejected')}), {accepted: 0, rejected: 0}), {accepted: 1, rejected: 4});
    for (const indexes of [[0], [1], [0,1,2,3,4,5,6,7,8,9]]) await assert.rejects(async () =>
      executeCandidateVideoIdInferenceMockV004(inputs, await idV4InferenceApproval(fixture, mixedStore, indexes, 'mock-no-eleventh-send'), memory.deps));
    assert.equal(memory.calls.length, 10); assert.deepEqual(await mixedStore.read('executionRecord'), record);
    checks.push('TASK-030 mixed ten conditions: two accepted and eight answer-contract terminals; all raw answers, usage and costs durable, rejected observations absent, A/B isolated and exact next requests unchanged');
    const events: CandidateVideoIdEventV004[] = record.toString('utf8').trimEnd().split('\n').map(line => JSON.parse(line));
    for (const [label, mutate] of [
      ['reason', (event: CandidateVideoIdEventV004) => { event.detail.rejection.reason = 'invented-safe-reason'; }],
      ['answer', (event: CandidateVideoIdEventV004) => { event.detail.answer.candidates = []; }],
      ['usage', (event: CandidateVideoIdEventV004) => { event.detail.usage.estimatedNanoUsd = '0'; }],
      ['cumulative fee', (event: CandidateVideoIdEventV004) => { event.detail.cumulativeEstimatedNanoUsd = '0'; }],
      ['fabricated observation', (event: CandidateVideoIdEventV004) => { event.detail.observation = {}; }],
      ['accepted relabel', (event: CandidateVideoIdEventV004) => { event.phase = 'accepted'; }]
    ] as const) {
      const changed = structuredClone(events); mutate(changed.find(event => event.phase === 'rejected')!);
      assert.throws(() => inspectCandidateVideoIdExecutionRecordV004(rewriteChain(changed), fixture.table, fixture.plan));
      checks.push('rejected ' + label + ' cannot be falsified by rewriting the hash chain');
    }
    const removed = structuredClone(events); removed.splice(removed.findIndex(event => event.phase === 'rejected'), 1);
    assert.throws(() => inspectCandidateVideoIdExecutionRecordV004(rewriteChain(removed), fixture.table, fixture.plan));
    checks.push('a missing rejected-condition terminal prevents the next intent even when all later hashes are recomputed');
  }
  for (const phase of ['response','usage','rejected'] as const) {
    const store = await clonePrepared({async beforeAppend(event) {
      if (event.stage === 'inference' && event.phase === phase) throw new Error('synthetic-rejected-evidence-save-failure');
    }});
    const memory = idV4Dependencies(inputs, fixture, store, (_request, response) => {
      const envelope = JSON.parse(response.body.toString('utf8')); answerFaults[0][1](envelope, inputs[0]);
      return {...response, body: bytes(envelope)};
    });
    const result = await executeCandidateVideoIdInferenceMockV004(inputs, await idV4InferenceApproval(fixture, store), memory.deps);
    assert.equal(result.status, 'stopped'); assert.equal(result.persistenceFailed, true); assert.equal(memory.calls.length, 1);
    assert.equal(result.proof.targets.slice(1).every(target => target.delivery === 'not-sent'), true);
    assert.equal(result.proof.targets[0].result, null);
    await assert.rejects(async () => executeCandidateVideoIdInferenceMockV004(inputs, await idV4InferenceApproval(fixture, store, [1]), memory.deps));
    assert.equal(memory.calls.length, 1); checks.push('rejected answer ' + phase + ' save failure prevents all later sends');
  }
  for (const [label, fault] of [
    ['authentication', (_request: HttpRequest, response: HttpResponse) => ({...response, status: 401})],
    ['unknown delivery', () => { throw new Error('synthetic-connection-lost'); }],
    ['timeout', () => { throw new Stage1Timeout(); }],
    ['model mismatch', (_request: HttpRequest, response: HttpResponse) => {
      const envelope = JSON.parse(response.body.toString('utf8')); envelope.modelVersion = 'wrong-model';
      return {...response, body: bytes(envelope)};
    }],
    ['unknown fee', (_request: HttpRequest, response: HttpResponse) => {
      const envelope = JSON.parse(response.body.toString('utf8')); delete envelope.usageMetadata.thoughtsTokenCount;
      answerFaults[0][1](envelope, inputs[0]); return {...response, body: bytes(envelope)};
    }],
    ['over one dollar', (_request: HttpRequest, response: HttpResponse) => {
      const envelope = JSON.parse(response.body.toString('utf8'));
      envelope.usageMetadata.thoughtsTokenCount = 300000; envelope.usageMetadata.totalTokenCount = 300120;
      answerFaults[0][1](envelope, inputs[0]); return {...response, body: bytes(envelope)};
    }]
  ] as const) {
    const store = await clonePrepared(), memory = idV4Dependencies(inputs, fixture, store, fault);
    const result = await executeCandidateVideoIdInferenceMockV004(inputs, await idV4InferenceApproval(fixture, store), memory.deps);
    assert.equal(result.status, 'stopped'); assert.equal(memory.calls.length, 1);
    assert.equal(result.proof.targets[0].acceptance, 'not-evaluated'); assert.equal(result.proof.targets[0].result, null);
    assert.equal(result.proof.targets.slice(1).every(target => target.delivery === 'not-sent'), true);
    assert.equal(result.proof.events.some(event => event.phase === 'rejected'), false);
    if (label === 'over one dollar') assert.ok(BigInt(result.proof.estimatedNanoUsd) > 1000000000n);
    if (label === 'timeout' || label === 'unknown delivery') {
      assert.equal(result.proof.targets[0].delivery, 'unknown'); assert.equal(result.proof.targets[0].feeStatus, 'unknown');
    }
    checks.push(label + ' remains terminal infrastructure failure even with an invalid answer');
  }
  {
    const cost = (await idV4InferenceApproval(fixture, baselineStore)).costConditions;
    // Exact equality cannot arise from the fixed 750/3750 integer-token units.
    // Exercise the very predicate used after usage and by replay, without
    // changing prices, approved limits, requests or inventing provider usage.
    assert.doesNotThrow(() => assertCandidateVideoIdInferenceCostContinuationV004(cost, '999999999'));
    for (const value of [null, '1000000000', '1000000001'])
      assert.throws(() => assertCandidateVideoIdInferenceCostContinuationV004(cost, value));
    checks.push('the shared actual-send/replay cost gate rejects unknown, exact one-dollar equality and over-limit values');
  }
  await assert.rejects(() => executeCandidateVideoIdPreparationMockV004(inputs, fixture.table, fixture.plan, fixture.approval, baseline.deps));
  await assert.rejects(() => executeCandidateVideoIdInferenceMockV004(inputs, fixture.approval as any, baseline.deps));
  assert.equal(baseline.calls.length, 15); checks.push('preparation proof is single-use and preparation approval cannot start inference');
  const normalStore = await clonePrepared(), normal = idV4Dependencies(inputs, fixture, normalStore);
  for (const [indexes, reference] of [[[0], 'one'], [[1,2,3,4,5,6], 'six'], [[7,8,9], 'three']] as const) {
    const approval = await idV4InferenceApproval(fixture, normalStore, [...indexes], `mock-subset-${reference}`);
    const result = await executeCandidateVideoIdInferenceMockV004(inputs, approval, normal.deps);
    assert.equal(result.status, 'completed-phase'); assert.equal(result.actualApiCalls, 0);
    await assert.rejects(() => executeCandidateVideoIdInferenceMockV004(inputs, approval, normal.deps));
  }
  const normalProof = inspectCandidateVideoIdExecutionRecordV004((await normalStore.read('executionRecord'))!, fixture.table, fixture.plan);
  assert.equal(normal.calls.length, 10); assert.equal(normalProof.targets.every(target => target.acceptance === 'accepted'), true);
  assert.equal(normalProof.counts.total, 25); assert.equal(normalProof.measurements.every(m => m.origin === 'mock'), true);
  checks.push('one/six/three approved subsets share one engine and no target repeats; all ten notObserved outputs are admissible');
  for (const condition of ['A','B'] as const) for (const request of fixture.requests.filter(r => r.condition === condition)) {
    const media = request.request.body.contents[0].parts.filter(part => 'fileData' in part);
    assert.equal(media.length, condition === 'A' ? 0 : 1);
    if (condition === 'B') assert.equal((media[0] as any).fileData.fileUri, fixture.plan.files.find(f => f.itemId === request.itemId)!.uri);
  }
  checks.push('A has no media; B uses its own unchanged saved Files URI; full V003 body remains bound');
  for (const [label, change] of [
    ['no approval', (_v: any) => undefined], ['wrong origin', (v: any) => ({...v, origin: 'live'})],
    ['missing task030 policy', (v: any) => { delete v.executionPolicy; return v; }],
    ['wrong task030 policy', (v: any) => ({...v, executionPolicy: {...v.executionPolicy, infrastructureFailure: 'continue'}})],
    ['old unknown preparation fee permission', (v: any) => ({...v,
      costConditions: {...v.costConditions, acceptUnverifiedPreparationBilling: true}})],
    ['wrong bound prefix', (v: any) => ({...v, expectedRecordSha256: '0'.repeat(64)})],
    ['wrong exact request', (v: any) => ({...v, targets: [{...v.targets[0], exactRequestSha256: '0'.repeat(64)}]})],
    ['repeated condition', (v: any) => ({...v, targets: [v.targets[0], v.targets[0]]})],
    ['missing targets', (v: any) => ({...v, targets: []})],
    ['wrong timeout', (v: any) => ({...v, timeouts: {...v.timeouts, inferenceMs: 1}})],
    ['missing price reference', (v: any) => ({...v, costConditions: {...v.costConditions, priceReference: undefined}})],
    ['zero frame', (v: any) => ({...v, costConditions: {...v.costConditions, maximumNanoUsd: '0'}})],
    ['insufficient frame', (v: any) => ({...v, costConditions: {...v.costConditions, maximumNanoUsd: '1'}})]
  ] as const) {
    const store = await clonePrepared(), memory = idV4Dependencies(inputs, fixture, store);
    const approval = change(await idV4InferenceApproval(fixture, store, [0]));
    await assert.rejects(() => executeCandidateVideoIdInferenceMockV004(inputs, approval, memory.deps));
    assert.equal(memory.calls.length, 0); assert.deepEqual(await store.read('executionRecord'), baselineRecord); checks.push(label + ' rejected before send or append');
  }
  for (const [label, mutate] of [
    ['inactive', (v: any) => { v.state = 'PROCESSING'; }], ['MIME', (v: any) => { v.mimeType = 'application/json'; }],
    ['size', (v: any) => { v.sizeBytes = '1'; }], ['SHA', (v: any) => { v.sha256Hash = Buffer.alloc(32).toString('base64'); }],
    ['URI', (v: any) => { v.uri += '-wrong'; }], ['expiry', (v: any) => { v.expirationTime = idV4Now; }]
  ] as const) {
    const store = createCandidateVideoIdMemoryStoreMockV004();
    const memory = idV4Dependencies(inputs, fixture, store, (_request, response) => {
      const value = JSON.parse(response.body.toString('utf8')); mutate(value); return {...response, body: bytes(value)};
    });
    const result = await executeCandidateVideoIdPreparationMockV004(inputs, fixture.table, fixture.plan, fixture.approval, memory.deps);
    assert.equal(result.status, 'stopped'); assert.equal(memory.calls.length, 1); assert.equal(result.proof.measurements.length, 0);
    checks.push(label + ' metadata failure stops without count, poll or reupload');
  }
  for (const [label, fault, acceptance, usage] of [
    ['HTTP error', (_r: HttpRequest, r: HttpResponse) => ({...r, status: 503}), 'not-evaluated', true],
    ['invalid JSON', (_r: HttpRequest, r: HttpResponse) => ({...r, body: Buffer.from('{')}), 'not-evaluated', false],
    ['secret response', (_r: HttpRequest, r: HttpResponse) => ({...r, body: bytes({echo: 'synthetic-private-key'})}), 'not-evaluated', false]
  ] as const) {
    const store = await clonePrepared(), memory = idV4Dependencies(inputs, fixture, store, fault);
    const result = await executeCandidateVideoIdInferenceMockV004(inputs, await idV4InferenceApproval(fixture, store), memory.deps);
    assert.equal(result.status, 'stopped'); assert.equal(memory.calls.length, 1);
    assert.equal(result.proof.targets[0].delivery, 'response-received'); assert.equal(result.proof.targets[0].acceptance, acceptance);
    assert.equal(result.proof.targets[0].usage !== null, usage); assert.equal(result.proof.targets.slice(1).every(t => t.delivery === 'not-sent'), true);
    assert.equal(JSON.stringify(result).includes('synthetic-private-key'), false);
    await assert.rejects(async () => executeCandidateVideoIdInferenceMockV004(inputs, await idV4InferenceApproval(fixture, store, [1]), memory.deps));
    checks.push(label + ' retains independent receipt/acceptance/fee and forbids subsequent send');
  }
  for (const phase of ['boundary','intent','response','usage','accepted','complete'] as const) {
    let fail = false;
    const store = await clonePrepared({async beforeAppend(event) { if (fail && event.phase === phase) throw new Error('synthetic-storage-failure'); }});
    fail = true;
    const memory = idV4Dependencies(inputs, fixture, store);
    const result = await executeCandidateVideoIdInferenceMockV004(inputs, await idV4InferenceApproval(fixture, store, [0]), memory.deps);
    assert.equal(result.status, 'stopped'); assert.equal(result.persistenceFailed, true);
    assert.equal(memory.calls.length, ['boundary','intent'].includes(phase) ? 0 : 1);
    if (phase === 'response') {
      assert.equal(result.lastResponse?.rawPersistence, 'not-persisted');
      assert.ok(result.lastResponse?.rawResponseBase64); assert.equal(result.lastResponse?.usage?.complete, true);
      const pending = inspectCandidateVideoIdExecutionRecordV004((await store.read('executionRecord'))!, fixture.table, fixture.plan);
      assert.equal(pending.targets[0].delivery, 'unknown'); assert.equal(pending.targets[0].feeStatus, 'unknown');
      await assert.rejects(async () => executeCandidateVideoIdInferenceMockV004(inputs,
        await idV4InferenceApproval(fixture, store, [1], 'mock-new-approval-cannot-resume-orphan'), memory.deps));
    }
    checks.push(phase + ' persistence failure stops and does not claim unsaved raw bytes durable');
  }
  for (const kind of ['inputTable','executionPlan','executionRecord'] as const) {
    const store = createCandidateVideoIdMemoryStoreMockV004({async beforeCreate(actual) { if (actual === kind) throw new Error('synthetic-create-failure'); }});
    const memory = idV4Dependencies(inputs, fixture, store);
    const result = await executeCandidateVideoIdPreparationMockV004(inputs, fixture.table, fixture.plan, fixture.approval, memory.deps);
    assert.equal(result.status, 'stopped'); assert.equal(memory.calls.length, 0); checks.push(kind + ' exclusive save failure stops without HTTP');
  }
  {
    const store = await clonePrepared(), memory = idV4Dependencies(inputs, fixture, store, () => { throw new Stage1Timeout(); });
    const result = await executeCandidateVideoIdInferenceMockV004(inputs, await idV4InferenceApproval(fixture, store, [0]), memory.deps);
    assert.equal(result.status, 'stopped'); assert.equal(memory.calls.length, 1);
    assert.equal(result.proof.targets[0].delivery, 'unknown'); assert.equal(result.proof.targets[0].feeStatus, 'unknown');
    checks.push('unknown send outcome consumes its condition and retains unknown fee with no retry');
  }
  for (const field of ['measurement','requests-fixed','response','intent'] as const) {
    const original = baselineRecord.toString('utf8').trimEnd().split('\n').map(line => JSON.parse(line));
    const event = original.find((e: CandidateVideoIdEventV004) => e.phase === field)!;
    if (field === 'measurement') event.detail.totalTokens++;
    else if (field === 'requests-fixed') event.detail.requests[0].exactRequestSha256 = '0'.repeat(64);
    else if (field === 'response') event.detail.rawResponseSha256 = '0'.repeat(64);
    else event.detail.bodySha256 = '0'.repeat(64);
    let previous: string | null = null;
    for (const [index, event] of original.entries()) {
      event.sequence = index + 1; event.previousSha256 = previous; const {sha256: _sha, ...content} = event;
      event.sha256 = candidateVideoDigestV002(content); previous = event.sha256;
    }
    assert.throws(() => inspectCandidateVideoIdExecutionRecordV004(Buffer.concat(original.map(bytes)), fixture.table, fixture.plan));
    checks.push(field + ' tampering rejected even after attacker recomputes the outer hash chain');
  }
  {
    const store = await clonePrepared(); let callbacks = 0;
    const memory = idV4Dependencies(inputs, fixture, store);
    await assert.rejects(async () => executeCandidateVideoIdInferenceMockV004(inputs, await idV4InferenceApproval(fixture, store),
      {...memory.deps, port: {mode: 'live', async exchange() { callbacks++; throw new Error('forbidden'); }}}));
    await assert.rejects(async () => executeCandidateVideoIdInferenceMockV004(inputs, await idV4InferenceApproval(fixture, store),
      {...memory.deps, store: {...store}}));
    assert.equal(callbacks, 0); checks.push('mock rejects live port and arbitrary injected artifact writer before callbacks');
  }
  {
    const store = await clonePrepared(), memory = idV4Dependencies(inputs, fixture, store, (_request, response, ordinal) => {
      if (ordinal !== 1) return response;
      const value = JSON.parse(response.body.toString('utf8'));
      value.usageMetadata.thoughtsTokenCount = 256100; value.usageMetadata.totalTokenCount = 256220;
      return {...response, body: bytes(value)};
    });
    const approval = await idV4InferenceApproval(fixture, store, [0,1]);
    assert.equal(fixture.approval.costConditions.maximumNanoUsd, '100000000');
    const result = await executeCandidateVideoIdInferenceMockV004(inputs, approval, memory.deps);
    assert.equal(result.status, 'stopped'); assert.equal(memory.calls.length, 1);
    assert.equal(result.proof.targets[0].acceptance, 'accepted'); assert.equal(result.proof.targets[1].delivery, 'not-sent');
    assert.equal(result.proof.targets[1].acceptance, 'not-evaluated');
    assert.equal(result.persistenceFailed, false); assert.equal(result.savedRecordVerifiable, true);
    assert.equal(result.proof.events.at(-1)!.phase, 'failure'); assert.equal(result.proof.events.at(-1)!.condition, 'B');
    assert.equal(result.proof.events.at(-1)!.detail.delivery, 'not-sent');
    checks.push('updated actual usage estimate plus next measured input and configured response allowance stops before next request exceeds explicit frame');
  }
  {
    const mutableInputs = structuredClone(inputs);
    const store = await clonePrepared({async beforeAppend(event) {
      if (event.stage === 'inference' && event.phase === 'intent') mutableInputs[0].candidateId = 'changed-after-intent';
    }});
    const memory = idV4Dependencies(inputs, fixture, store);
    const result = await executeCandidateVideoIdInferenceMockV004(mutableInputs, await idV4InferenceApproval(fixture, store, [0]), memory.deps);
    assert.equal(result.status, 'stopped'); assert.equal(memory.calls.length, 0);
    assert.equal(result.proof.targets[0].delivery, 'not-sent'); assert.equal(result.proof.targets[0].feeStatus, 'not-sent');
    assert.equal(result.proof.counts.inference, 1); assert.equal(result.proof.abnormal, true);
    assert.equal(result.persistenceFailed, false); assert.equal(result.savedRecordVerifiable, true);
    assert.equal(result.proof.events.at(-1)!.phase, 'failure');
    assert.equal(result.proof.events.at(-1)!.detail.delivery, 'not-sent');
    checks.push('local input substitution between durable intent and exchange is detected; explicit pre-send failure remains not-sent but phase cannot resume');
  }
  {
    const store = await clonePrepared(), memory = idV4Dependencies(inputs, fixture, store, () => { throw new Stage1Timeout(); });
    await executeCandidateVideoIdInferenceMockV004(inputs, await idV4InferenceApproval(fixture, store, [0]), memory.deps);
    const events: CandidateVideoIdEventV004[] = (await store.read('executionRecord'))!.toString('utf8').trimEnd().split('\n').map(line => JSON.parse(line));
    events.at(-1)!.condition = 'B'; events.at(-1)!.detail.acceptance = 'rejected';
    let previous: string | null = null;
    for (const event of events) { event.previousSha256 = previous; const {sha256: _sha, ...content} = event;
      event.sha256 = candidateVideoDigestV002(content); previous = event.sha256; }
    assert.throws(() => inspectCandidateVideoIdExecutionRecordV004(Buffer.concat(events.map(bytes)), fixture.table, fixture.plan));
    checks.push('failure cannot be moved from sent A to unrun B or relabeled invalid answer by recomputing hashes');
  }
  {
    const original: CandidateVideoIdEventV004[] = baselineRecord.toString('utf8').trimEnd().split('\n').map(line => JSON.parse(line));
    for (const phase of ['measurement','complete'] as const) {
      const events = structuredClone(original); const event = events.find(value => value.phase === phase)!;
      event.detail.referenceCost.inputPlusConfiguredResponseAllowanceNanoUsd = '1';
      let previous: string | null = null;
      for (const value of events) { value.previousSha256 = previous; const {sha256: _sha, ...content} = value;
        value.sha256 = candidateVideoDigestV002(content); previous = value.sha256; }
      assert.throws(() => inspectCandidateVideoIdExecutionRecordV004(Buffer.concat(events.map(bytes)), fixture.table, fixture.plan));
    }
    checks.push('per-request and complete-phase reference cost tampering fails replay even with recomputed outer hashes');
  }
  {
    const original: CandidateVideoIdEventV004[] = baselineRecord.toString('utf8').trimEnd().split('\n').map(line => JSON.parse(line));
    for (const phase of ['intent','complete'] as const) {
      const events = structuredClone(original); events.find(event => event.phase === phase)!.detail.preparationBilling.cumulativeEstimatedNanoUsd = '1';
      let previous: string | null = null;
      for (const event of events) { event.previousSha256 = previous; const {sha256: _sha, ...content} = event;
        event.sha256 = candidateVideoDigestV002(content); previous = event.sha256; }
      assert.throws(() => inspectCandidateVideoIdExecutionRecordV004(Buffer.concat(events.map(bytes)), fixture.table, fixture.plan));
    }
    checks.push('TASK-029 intent and final preparation fees are rederived from approved evidence, not trusted after hash-chain rewriting');
  }
  {
    const store = await clonePrepared(), memory = idV4Dependencies(inputs, fixture, store, (_request, response) => {
      const value = JSON.parse(response.body.toString('utf8'));
      delete value.usageMetadata;
      const output = JSON.parse(value.candidates[0].content.parts[0].text);
      output.observations[0].segmentId = 'invented-segment';
      value.candidates[0].content.parts[0].text = JSON.stringify(output);
      return {...response, body: bytes(value)};
    });
    const result = await executeCandidateVideoIdInferenceMockV004(inputs, await idV4InferenceApproval(fixture, store, [0]), memory.deps);
    assert.equal(result.status, 'stopped'); assert.equal(result.proof.targets[0].delivery, 'response-received');
    assert.equal(result.proof.targets[0].acceptance, 'not-evaluated');
    assert.equal(result.proof.targets[0].usage?.complete, false);
    const original = (await store.read('executionRecord'))!.toString('utf8').trimEnd().split('\n').map(line => JSON.parse(line));
    for (const [field, value] of [['reason', 'send-outcome-unknown'], ['acceptance', 'rejected']] as const) {
      const events: CandidateVideoIdEventV004[] = structuredClone(original); events.at(-1)!.detail[field] = value;
      let previous: string | null = null;
      for (const event of events) { event.previousSha256 = previous; const {sha256: _sha, ...content} = event;
        event.sha256 = candidateVideoDigestV002(content); previous = event.sha256; }
      assert.throws(() => inspectCandidateVideoIdExecutionRecordV004(Buffer.concat(events.map(bytes)), fixture.table, fixture.plan));
    }
    checks.push('received response cannot become unknown send; incomplete usage halts before ID admission even when the body is also invalid');
  }
  const comparisonPayload = async (store: CandidateVideoIdMockStoreV004): Promise<CandidateVideoIdPairedComparisonV004> => {
    const record = (await store.read('executionRecord'))!;
    const proof = inspectCandidateVideoIdExecutionRecordV004(record, fixture.table, fixture.plan);
    return {schemaVersion: 'candidate-video-understanding-id-paired-comparison-v004', experimentId: fixture.table.experimentId,
      origin: 'mock', executionRecordSha256: byteSha(record), pairs: inputs.map(input => ({itemId: input.itemId,
        A: {delivery: proof.targets.find(t => t.itemId === input.itemId && t.condition === 'A')!.delivery,
          acceptance: proof.targets.find(t => t.itemId === input.itemId && t.condition === 'A')!.acceptance},
        B: {delivery: proof.targets.find(t => t.itemId === input.itemId && t.condition === 'B')!.delivery,
          acceptance: proof.targets.find(t => t.itemId === input.itemId && t.condition === 'B')!.acceptance},
        assessment: {explicitSyntheticText: 'No human assessment read or calculated.'}}))};
  };
  const comparisonApproval = (payload: CandidateVideoIdPairedComparisonV004): CandidateVideoIdComparisonApprovalV004 => ({
    schemaVersion: 'candidate-video-understanding-id-comparison-approval-v004', experimentId: fixture.table.experimentId,
    origin: 'mock', approvedBy: 'mock', approvalReference: 'mock-explicit-comparison-payload',
    planSha256: candidateVideoDigestV002(fixture.plan), inputTableSha256: candidateVideoDigestV002(fixture.table),
    expectedRecordSha256: payload.executionRecordSha256, comparisonSha256: candidateVideoDigestV002(payload)});
  {
    const preparedPayload = await comparisonPayload(baselineStore);
    await assert.rejects(() => saveCandidateVideoIdComparisonMockV004(inputs,
      comparisonApproval(preparedPayload), preparedPayload, baselineStore));
    const payload = await comparisonPayload(normalStore), approval = comparisonApproval(payload);
    await assert.rejects(() => saveCandidateVideoIdComparisonMockV004(inputs, {...approval, comparisonSha256: '0'.repeat(64)}, payload, normalStore));
    await saveCandidateVideoIdComparisonMockV004(inputs, approval, payload, normalStore);
    assert.deepEqual(await normalStore.read('pairedComparison'), bytes(payload));
    await assert.rejects(() => saveCandidateVideoIdComparisonMockV004(inputs, approval, payload, normalStore));
    checks.push('comparison requires separate approval bound to full five-pair payload and frozen record; exclusive save only, no semantic calculation');
  }
  {
    const store = await clonePrepared(), memory = idV4Dependencies(inputs, fixture, store);
    await executeCandidateVideoIdInferenceMockV004(inputs, await idV4InferenceApproval(fixture, store, [0]), memory.deps);
    const payload = await comparisonPayload(store);
    await saveCandidateVideoIdComparisonMockV004(inputs, comparisonApproval(payload), payload, store);
    await assert.rejects(async () => executeCandidateVideoIdInferenceMockV004(inputs,
      await idV4InferenceApproval(fixture, store, [1], 'mock-after-comparison-forbidden'), memory.deps));
    assert.equal(memory.calls.length, 1); checks.push('a five-pair comparison can represent an approved partial inference, but its save freezes further inference');
  }
  let workerSimulatedCalls = 0;
  if (memoryOnly) {
    const saved: Record<string, string> = {};
    for (const kind of ['inputTable','executionPlan','executionRecord'] as const)
      saved[kind] = (await mixedStore.read(kind))!.toString('base64');
    const workerResult = await new Promise<any>((okay, reject) => {
      const child = spawn(process.execPath, [...process.execArgv, import.meta.filename, '--task030-memory-worker'], {
        env: {PATH: process.env.PATH, TSX_DISABLE_CACHE: '1'}, stdio: ['ignore','ignore','ignore','ipc']});
      let answer: any;
      child.on('message', value => { answer = value; }); child.on('error', reject);
      child.on('exit', code => code === 0 && answer ? okay(answer) : reject(new Error('task030-memory-worker-failed')));
      child.send(saved);
    });
    assert.equal(workerResult.status, 'verified'); assert.equal(workerResult.normalPause, true);
    assert.deepEqual(workerResult.counts, {metadataGet: 5, countTokens: 10, inference: 10, total: 25});
    assert.equal(workerResult.accepted, 2); assert.equal(workerResult.rejected, 8);
    assert.equal(workerResult.recordSha256, byteSha((await mixedStore.read('executionRecord'))!));
    assert.equal(workerResult.additionalCalls, 0); assert.equal(workerResult.temporaryUniquePaths, 0);
    checks.push('an independent process re-admits original inputs and replays IPC-only accepted/rejected evidence; a previously rejected condition cannot be resent');
  } else {
  // The existing ordinary regression retains its real-filesystem worker tests.
  // TASK-030's dedicated flag never enters this five-temporary-path branch.
  const temporary = await mkdtemp(resolve(await realpath(tmpdir()), 'zev2-id-v004-'));
  try {
    const diskStore = await createCandidateVideoIdTemporaryStoreMockV004(temporary);
    const worker = (config: IdV4WorkerConfig) => {
      const child = spawn(process.execPath, [...process.execArgv, import.meta.filename, '--id-v004-worker'], {
        env: {PATH: process.env.PATH, TMPDIR: tmpdir(), TSX_DISABLE_CACHE: '1'}, stdio: ['ignore','pipe','pipe','ipc']});
      let stderr = ''; child.stderr!.on('data', chunk => { stderr += String(chunk); });
      let readyResolve!: () => void, readyReject!: (error: Error) => void;
      const ready = new Promise<void>((okay, reject) => { readyResolve = okay; readyReject = reject; });
      if (!config.barrier) readyResolve();
      const result = new Promise<any>((okay, reject) => {
        let answer: any;
        child.on('message', value => { const message = value as any; if (message.kind === 'ready') readyResolve(); else if (message.kind === 'result') answer = message; });
        child.on('error', error => { readyReject(error); reject(error); }); child.on('exit', code => {
          const error = new Error(`mock-worker-exit-${code}: ${stderr}`);
          if (code === 0 && answer) okay(answer); else { readyReject(error); reject(error); }
        });
      });
      child.send(config); return {ready, result, release: () => child.send('release')};
    };
    const first = await worker({directory: temporary, action: 'prepare'}).result;
    assert.equal(first.status, 'completed-phase'); assert.equal(first.calls, 15); workerSimulatedCalls += first.calls;
    const approval = await idV4InferenceApproval(fixture, diskStore);
    const second = await worker({directory: temporary, action: 'inference', approval}).result;
    assert.equal(second.status, 'completed-phase', JSON.stringify(second.failure ?? null));
    assert.equal(second.calls, 10); assert.equal(second.completed, 10); workerSimulatedCalls += second.calls;
    const payload = await comparisonPayload(diskStore);
    await saveCandidateVideoIdComparisonMockV004(inputs, comparisonApproval(payload), payload, diskStore);
    assert.deepEqual(await diskStore.read('pairedComparison'), bytes(payload));
    checks.push('separate processes prepare and infer from re-admitted original inputs plus saved JSON/JSONL; four temporary artifacts round-trip');
    for (const path of Object.values(CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004)) await rm(resolve(temporary, basename(path)));
    for (const kind of ['inputTable','executionPlan','executionRecord'] as const) await diskStore.create(kind, (await baselineStore.read(kind))!);
    const competingApproval = await idV4InferenceApproval(fixture, diskStore, [0], 'mock-competing-independent-processes');
    const left = worker({directory: temporary, action: 'inference', approval: competingApproval, barrier: true});
    const right = worker({directory: temporary, action: 'inference', approval: competingApproval, barrier: true});
    await Promise.all([left.ready, right.ready]); left.release(); right.release();
    const competing = await Promise.all([left.result, right.result]);
    assert.ok(competing.reduce((sum, result) => sum + result.calls, 0) <= 1);
    assert.ok(competing.some(result => result.status === 'stopped' || result.status === 'rejected'));
    assert.ok(competing.every(result => result.actualApiCalls === 0));
    workerSimulatedCalls += competing.reduce((sum, result) => sum + result.calls, 0);
    checks.push('two independent stale-prefix writers synchronized at append cannot both send; loser never rebases or retries');
  } finally {
    for (const path of Object.values(CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004)) await rm(resolve(temporary, basename(path)), {force: true});
    await rmdir(temporary);
  }
  }
  for (const {path, sha256} of formalBefore) {
    if (sha256 === null) await assert.rejects(() => readFile(resolve(workspace, path)), {code: 'ENOENT'});
    else assert.equal(byteSha(await readFile(resolve(workspace, path))), sha256);
  }
  for (const [index, path] of protectedPaths.entries()) assert.equal(byteSha(await readFile(resolve(workspace, path))), protectedSha[index]);
  checks.push('existing fixed evidence and the three preparation artifacts remain byte-for-byte unchanged');
  process.stdout.write(JSON.stringify({suite: memoryOnly ? 'task030-memory-and-related-v004-regression' : 'id-approved-phase-transport-v004',
    status: 'passed', checks: checks.length,
    proof: checks, normalPreparationSimulatedCalls: 15, normalInferenceSimulatedCalls: 10, workerSimulatedCalls,
    actualApiCalls: 0, actualApiCostUsd: 0, credentialReads: 0, officialArtifactWrites: 0,
    temporaryUniquePaths: memoryOnly ? 0 : 5, temporaryRemainingPaths: 0,
    regressionScope: memoryOnly ? 'all-v004-memory-regressions-plus-task030-and-ipc-replay; unchanged disk-store regressions excluded by no-new-path approval'
      : 'memory-and-disk-v004-regressions'}) + '\n');
}
async function task032Suite() {
  const checks: string[] = [];
  const inputs = await loadCandidateVideoIdInputsV003(workspace);
  const formalKinds = ['inputTable','executionPlan','executionRecord'] as const;
  const formalBefore = await Promise.all(formalKinds.map(async kind =>
    byteSha(await readFile(resolve(workspace, CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004[kind])))));
  const history = await task032HistoricalFixture(inputs);
  const {fixture} = history;
  const review = createCandidateVideoIdCacheBillingReviewV004({origin: 'mock', experimentId: fixture.table.experimentId,
    approvalReference: 'mock-task032-fee-specification', checkedAt: idV4Now});
  const envelopeA = {...idV4Envelope(inputs[0]), usageMetadata: structuredClone(task032UsageA)};
  const envelopeB = {...idV4Envelope(inputs[0]), usageMetadata: structuredClone(task032UsageB)};
  const feeA = deriveCandidateVideoIdCacheUsageV004(envelopeA, review, fixture.requests[0].request.body);
  const feeB = deriveCandidateVideoIdCacheUsageV004(envelopeB, review, fixture.requests[1].request.body);
  assert.equal(feeA.estimatedNanoUsd, '37968750'); assert.equal(feeB.estimatedNanoUsd, '42341400');
  assert.equal(feeA.billingBreakdown.cachedInputTokens, 0);
  assert.equal(feeB.billingBreakdown.uncachedInputTokens, 33296); assert.equal(feeB.billingBreakdown.cachedInputTokens, 27542);
  assert.equal(feeB.billingBreakdown.uncachedInputTokens + feeB.billingBreakdown.cachedInputTokens, task032UsageB.promptTokenCount);
  assert.equal(feeB.billingBreakdown.uncachedInputNanoUsd, (33296n * 750n).toString());
  assert.equal(feeB.billingBreakdown.cachedInputNanoUsd, (27542n * 75n).toString());
  assert.equal(feeB.billingBreakdown.outputNanoUsd, (954n * 3750n).toString());
  assert.equal(feeB.billingBreakdown.thinkingNanoUsd, (3127n * 3750n).toString());
  assert.equal(feeB.billingBreakdown.explicitCacheStorageNanoUsd, '0');
  assert.equal(feeB.billingBreakdown.explicitCacheStorageBasis, 'no-explicit-cache-request');
  assert.equal(BigInt(feeA.estimatedNanoUsd) + BigInt(feeB.estimatedNanoUsd), 80310150n);
  assert.equal(deriveCandidateVideoIdCacheUsageV004({...envelopeA,
    usageMetadata: {...task032UsageA, cachedContentTokenCount: 0}}, review, fixture.requests[0].request.body).estimatedNanoUsd, feeA.estimatedNanoUsd);
  checks.push('independent A/B arithmetic: cached input is inside prompt, four separately priced token classes yield 37968750 and 42341400 nanoUSD without storage speculation or double counting');
  const invalidUsage: Array<[string, (usage: any) => void]> = [
    ['cache larger than prompt', usage => { usage.cachedContentTokenCount = usage.promptTokenCount + 1; }],
    ['unknown billable field', usage => { usage.futureBillableTokenCount = 7; }],
    ['unsupported service tier', usage => { usage.serviceTier = 'priority'; }],
    ['missing main usage', usage => { delete usage.promptTokenCount; }],
    ['negative tokens', usage => { usage.thoughtsTokenCount = -1; }],
    ['fractional tokens', usage => { usage.candidatesTokenCount = 1.5; }],
    ['unpriced tool usage', usage => { usage.toolUsePromptTokenCount = 1; }]
  ];
  for (const [label, mutate] of invalidUsage) {
    const envelope = structuredClone(envelopeB); mutate(envelope.usageMetadata);
    assert.throws(() => deriveCandidateVideoIdCacheUsageV004(envelope, review, fixture.requests[1].request.body));
    checks.push(label + ' is not silently billed at zero');
  }
  assert.throws(() => deriveCandidateVideoIdCacheUsageV004(envelopeB, review,
    {...fixture.requests[1].request.body, cachedContent: 'cachedContents/synthetic-unapproved-explicit-cache'}));
  checks.push('an explicit cache reference cannot borrow the no-explicit-storage billing basis');

  const makeLocalApproval = (record: Buffer, reference = 'mock-task032-approved-local-reassessment') =>
    buildCandidateVideoIdCacheReassessmentApprovalV004(record, fixture.table, fixture.plan,
      {approvedBy: 'mock', approvalReference: reference, checkedAt: idV4Now});
  const deriveRemaining = (record: Buffer, reference = 'mock-task032-resume-original-unconsumed') =>
    deriveCandidateVideoIdRemainingInferenceApprovalV004(record, fixture.table, fixture.plan,
      {approvedBy: 'mock', approvalReference: reference});
  const oldResponseBytes = history.events.filter(event => event.stage === 'inference' && event.phase === 'response')
    .map(event => Buffer.from(event.detail.rawResponseBase64, 'base64'));
  async function assertOldPrefix(store: CandidateVideoIdMockStoreV004) {
    const record = (await store.read('executionRecord'))!;
    assert.deepEqual(record.subarray(0, history.record.length), history.record);
    assert.deepEqual(await store.read('inputTable'), history.inputTableBytes);
    assert.deepEqual(await store.read('executionPlan'), history.executionPlanBytes);
    const oldEvents: CandidateVideoIdEventV004[] = record.subarray(0, history.record.length).toString('utf8')
      .trimEnd().split('\n').map(line => JSON.parse(line));
    assert.equal(oldEvents.length, 57); assert.equal(oldEvents[52].phase, 'rejected'); assert.equal(oldEvents[56].phase, 'failure');
    assert.equal(oldEvents[55].detail.usage.complete, false); assert.equal(oldEvents[55].detail.usage.estimatedNanoUsd, null);
    assert.deepEqual(oldEvents.filter(event => event.stage === 'inference' && event.phase === 'response')
      .map(event => Buffer.from(event.detail.rawResponseBase64, 'base64')), oldResponseBytes);
  }
  assert.throws(() => deriveRemaining(history.record));
  for (const [label, mutate] of invalidUsage) {
    const events = structuredClone(history.events), response = events[54];
    const envelope = JSON.parse(Buffer.from(response.detail.rawResponseBase64, 'base64').toString('utf8'));
    mutate(envelope.usageMetadata);
    const raw = bytes(envelope);
    response.detail.rawResponseBase64 = raw.toString('base64'); response.detail.rawResponseSha256 = byteSha(raw);
    response.detail.rawResponseByteLength = raw.length; events[55].detail.usage.providerUsage = envelope.usageMetadata;
    const variant = task032Rechain(events);
    assert.throws(() => makeLocalApproval(variant, 'mock-unresolved-historical-' + label));
    checks.push('historical B with ' + label + ' is not eligible for the narrow cached-fee stop resolution');
  }
  for (const [label, mutate] of [
    ['HTTP error', (events: CandidateVideoIdEventV004[]) => { events[54].detail.httpStatus = 503; }],
    ['missing raw', (events: CandidateVideoIdEventV004[]) => {
      events[54].detail.rawResponseBase64 = null; events[54].detail.rawOmissionReason = 'secret-like-response-rejected';
    }],
    ['sent-state relabel', (events: CandidateVideoIdEventV004[]) => { events[56].detail.delivery = 'unknown'; }]
  ] as const) {
    const changed = structuredClone(history.events); mutate(changed);
    assert.throws(() => makeLocalApproval(task032Rechain(changed), 'mock-ineligible-' + label));
    checks.push(label + ' historical foundation failure is not lifted by cache support');
  }
  {
    const store = await history.cloneStore(), normal = idV4Dependencies(inputs, fixture, store);
    await assert.rejects(async () => executeCandidateVideoIdInferenceMockV004(inputs,
      await idV4InferenceApproval(fixture, store, undefined, 'mock-cannot-bypass-fee-reassessment'), normal.deps));
    assert.equal(normal.calls.length, 0); await assertOldPrefix(store);
    checks.push('ordinary inference cannot bypass the historical unknown-fee stop, even with a fresh approval');
  }

  const localStore = await history.cloneStore(), localApproval = makeLocalApproval(history.record);
  const local = await executeCandidateVideoIdCacheReassessmentMockV004(inputs, localApproval, history.localDeps(localStore));
  assert.equal(local.status, 'completed-phase'); assert.equal(local.actualApiCalls, 0); assert.equal(local.simulatedApiCalls, 0);
  assert.equal(local.retry, 0); assert.equal(local.repair, 0); assert.equal(local.persistenceFailed, false);
  assert.equal(local.savedRecordVerifiable, true); assert.equal(local.proof.normalPause, true);
  assert.deepEqual(local.proof.counts, {metadataGet: 5, countTokens: 10, inference: 2, total: 17});
  assert.equal(local.proof.targets[0].acceptance, 'rejected'); assert.equal(local.proof.targets[1].acceptance, 'rejected');
  assert.equal(local.proof.targets[0].result, null); assert.equal(local.proof.targets[1].result, null);
  assert.equal(local.proof.targets[0].usage?.estimatedNanoUsd, '37968750'); assert.equal(local.proof.targets[1].usage?.estimatedNanoUsd, '42341400');
  assert.equal(local.proof.estimatedNanoUsd, '80310150');
  assert.equal(local.proof.reassessment?.completed, true);
  assert.equal(local.proof.events[56].phase, 'failure'); assert.equal(local.proof.events[55].detail.usage.complete, false);
  await assertOldPrefix(localStore);
  const localRecord = (await localStore.read('executionRecord'))!;
  const suffix = local.proof.events.slice(57);
  assert.ok(suffix.length > 0); assert.equal(suffix.some(event => event.phase === 'intent'), false);
  assert.equal(suffix.filter(event => event.phase === 'fee-reassessment').length, 2);
  assert.equal(suffix.filter(event => event.phase === 'answer-reassessment').length, 1);
  const feeEvents = suffix.filter(event => event.phase === 'fee-reassessment');
  assert.equal(feeEvents[0].detail.unknownConsumedFeeCount, 1); assert.equal(feeEvents[0].detail.allConsumedFeesKnown, false);
  assert.equal(feeEvents[1].detail.unknownConsumedFeeCount, 0); assert.equal(feeEvents[1].detail.allConsumedFeesKnown, true);
  assert.equal(feeEvents.every(event => event.detail.additionalInferenceCount === 0), true);
  assert.deepEqual(inspectCandidateVideoIdExecutionRecordV004(localRecord, fixture.table, fixture.plan).counts, local.proof.counts);
  await assert.rejects(() => executeCandidateVideoIdCacheReassessmentMockV004(inputs, localApproval, history.localDeps(localStore)));
  assert.deepEqual(await localStore.read('executionRecord'), localRecord);
  assert.throws(() => makeLocalApproval(localRecord, 'mock-repeated-local-reassessment'));
  checks.push('local B reevaluation writes only new events, performs zero HTTP, preserves all 57 historical lines, resolves fees once per sent A/B and retains rejected answers without observations');

  for (const [label, change] of [
    ['wrong stopped prefix', (approval: typeof localApproval) => { approval.expectedRecordSha256 = '0'.repeat(64); }],
    ['wrong stopped length', (approval: typeof localApproval) => { approval.expectedRecordByteLength++; }],
    ['wrong original approval', (approval: typeof localApproval) => { approval.originalInferenceApprovalSha256 = '0'.repeat(64); }],
    ['wrong failure event', (approval: typeof localApproval) => { approval.failureEventSha256 = '0'.repeat(64); }],
    ['wrong stored raw', (approval: typeof localApproval) => { approval.targets[1].rawResponseSha256 = '0'.repeat(64); }],
    ['wrong stored usage', (approval: typeof localApproval) => { approval.targets[1].usageEventSha256 = '0'.repeat(64); }],
    ['wrong request', (approval: typeof localApproval) => { approval.targets[1].exactRequestSha256 = '0'.repeat(64); }],
    ['repeated fee target', (approval: typeof localApproval) => { approval.targets[1] = structuredClone(approval.targets[0]); }],
    ['changed prior A amount', (approval: typeof localApproval) => { approval.targets[0].priorEstimatedNanoUsd = '1'; }],
    ['wrong answer target', (approval: typeof localApproval) => { approval.answerTarget.condition = 'A'; }],
    ['unauthorized local caller', (approval: typeof localApproval) => { approval.approvedBy = 'kawafmm'; }],
    ['wrong billing scope', (approval: typeof localApproval) => { approval.cacheBillingReview.approvalReference = 'wrong-approval'; }]
  ] as const) {
    const store = await history.cloneStore(), approval = structuredClone(localApproval); change(approval);
    await assert.rejects(() => executeCandidateVideoIdCacheReassessmentMockV004(inputs, approval, history.localDeps(store)));
    assert.deepEqual(await store.read('executionRecord'), history.record);
    checks.push(label + ' cannot authorize a local resolution or append');
  }
  {
    const store = await history.cloneStore(); let callbacks = 0;
    await assert.rejects(() => executeCandidateVideoIdCacheReassessmentMockV004(inputs, localApproval,
      {...history.localDeps(store), port: {mode: 'live', async exchange() { callbacks++; throw new Error('forbidden'); }}} as any));
    assert.equal(callbacks, 0); assert.deepEqual(await store.read('executionRecord'), history.record);
    checks.push('local reassessment rejects an injected HTTP dependency before any callback');
  }
  for (const [label, change] of [
    ['wrong saved price', (deps: ReturnType<typeof history.localDeps>) => { deps.price = bytes({invalid: true}); }],
    ['wrong Files source', (deps: ReturnType<typeof history.localDeps>) => { deps.filesSource = bytes({invalid: true}); }],
    ['expired Files evidence', (deps: ReturnType<typeof history.localDeps>) => { deps.clock = () => '2026-09-07T00:00:00.000Z'; }],
    ['secret evidence', (deps: ReturnType<typeof history.localDeps>) => { deps.containsSecret = () => true; }]
  ] as const) {
    const store = await history.cloneStore(), deps = history.localDeps(store); change(deps);
    await assert.rejects(() => executeCandidateVideoIdCacheReassessmentMockV004(inputs, localApproval, deps));
    assert.deepEqual(await store.read('executionRecord'), history.record);
    checks.push(label + ' prevents local reassessment before its first append');
  }
  for (const event of suffix) {
    const store = await history.cloneStore({async beforeAppend(next) {
      if (next.sequence === event.sequence) throw new Error('synthetic-local-reassessment-save-failure');
    }});
    let stopped = false;
    let result: Awaited<ReturnType<typeof executeCandidateVideoIdCacheReassessmentMockV004>> | undefined;
    try {
      result = await executeCandidateVideoIdCacheReassessmentMockV004(inputs, localApproval, history.localDeps(store));
    } catch { stopped = true; }
    if (result) {
      stopped = result.status === 'stopped';
      assert.equal(result.actualApiCalls, 0); assert.equal(result.simulatedApiCalls, 0);
    }
    assert.equal(stopped, true); await assertOldPrefix(store);
    const saved = (await store.read('executionRecord'))!;
    assert.throws(() => deriveRemaining(saved, 'mock-incomplete-local-resolution-cannot-send'));
    checks.push(event.phase + ' local evidence save failure leaves subsequent inference forbidden');
  }
  for (const [label, mutate] of [
    ['fee amount', (event: CandidateVideoIdEventV004) => { event.detail.syntheticExtraFee = '1'; }],
    ['local approval', (event: CandidateVideoIdEventV004) => { event.approvalReference = 'unrelated-local-approval'; }],
    ['target binding', (event: CandidateVideoIdEventV004) => { event.itemId = 'item-0002'; }]
  ] as const) {
    const changed = structuredClone(local.proof.events); mutate(changed.find(event => event.phase === 'fee-reassessment')!);
    assert.throws(() => inspectCandidateVideoIdExecutionRecordV004(task032Rechain(changed), fixture.table, fixture.plan));
    checks.push('rehashed ' + label + ' cannot falsify saved fee resolution');
  }
  {
    const changed = structuredClone(local.proof.events);
    changed.splice(changed.findIndex(event => event.phase === 'answer-reassessment'), 1);
    assert.throws(() => inspectCandidateVideoIdExecutionRecordV004(task032Rechain(changed), fixture.table, fixture.plan));
    checks.push('local completion cannot bypass B answer admission even after rewriting the outer hash chain');
  }
  {
    const acceptedHistory = await task032HistoricalFixture(inputs, true), store = await acceptedHistory.cloneStore();
    const approval = buildCandidateVideoIdCacheReassessmentApprovalV004(acceptedHistory.record,
      acceptedHistory.fixture.table, acceptedHistory.fixture.plan,
      {approvedBy: 'mock', approvalReference: 'mock-local-valid-B-answer', checkedAt: idV4Now});
    const result = await executeCandidateVideoIdCacheReassessmentMockV004(inputs, approval, acceptedHistory.localDeps(store));
    assert.equal(result.status, 'completed-phase'); assert.equal(result.actualApiCalls, 0); assert.equal(result.simulatedApiCalls, 0);
    assert.equal(result.proof.targets[0].acceptance, 'rejected'); assert.equal(result.proof.targets[1].acceptance, 'accepted');
    assert.ok(result.proof.targets[1].result); assert.equal(result.proof.targets[1].rejection, null);
    assert.equal(result.proof.estimatedNanoUsd, '80310150');
    assert.deepEqual((await store.read('executionRecord'))!.subarray(0, acceptedHistory.record.length), acceptedHistory.record);
    checks.push('a valid stored B answer can be admitted locally with identical fee accounting and without resending either A or B');
  }

  const remaining = deriveRemaining(localRecord);
  const consumed = new Set(history.events.filter(event => event.stage === 'inference' && event.phase === 'intent')
    .map(event => `${event.itemId}/${event.condition}`));
  const expectedRemaining = history.originalApproval.targets.filter(target => !consumed.has(`${target.itemId}/${target.condition}`));
  assert.deepEqual(remaining.targets, expectedRemaining); assert.equal(remaining.targets.length, 8);
  assert.equal(remaining.limits.inference, 8); assert.equal(remaining.limits.total, 8);
  assert.equal(remaining.costConditions.maximumNanoUsd, '1000000000');
  assert.equal(remaining.timeouts.inferenceMs, 600000);
  assert.equal(remaining.targets.some(target => target.itemId === 'item-0001'), false);
  {
    const store = await history.cloneStore({}, localRecord), memory = idV4Dependencies(inputs, fixture, store);
    const one = deriveRemaining(localRecord, 'mock-consume-one-of-derived-remaining');
    one.targets = one.targets.slice(0, 1); one.limits.inference = 1; one.limits.total = 1;
    const result = await executeCandidateVideoIdInferenceMockV004(inputs, one, memory.deps);
    assert.equal(result.status, 'completed-phase'); assert.equal(memory.calls.length, 1);
    const nowRemaining = deriveRemaining((await store.read('executionRecord'))!, 'mock-derive-again-after-one-condition');
    assert.deepEqual(nowRemaining.targets, expectedRemaining.slice(1)); assert.equal(nowRemaining.targets.length, 7);
    assert.equal(nowRemaining.targets.some(target => target.itemId === one.targets[0].itemId && target.condition === one.targets[0].condition), false);
    checks.push('the same remaining-set derivation yields seven after one more consumed condition, rather than returning a hard-coded eight-condition workflow');
  }
  for (const [label, fault] of [
    ...invalidUsage.map(([label, mutate]) => [label, (_request: HttpRequest, response: HttpResponse) => {
      const envelope = JSON.parse(response.body.toString('utf8')); mutate(envelope.usageMetadata);
      envelope.candidates[0].finishReason = 'MAX_TOKENS'; return {...response, body: bytes(envelope)};
    }] as const),
    ['HTTP authentication', (_request: HttpRequest, response: HttpResponse) => ({...response, status: 401})] as const,
    ['HTTP failure', (_request: HttpRequest, response: HttpResponse) => ({...response, status: 503})] as const,
    ['timeout', () => { throw new Stage1Timeout(); }] as const,
    ['unknown delivery', () => { throw new Error('synthetic-connection-lost-after-send'); }] as const,
    ['secret handling', (_request: HttpRequest, response: HttpResponse) => ({...response, body: bytes({echo: 'synthetic-private-key'})})] as const,
    ['fee over one dollar', (_request: HttpRequest, response: HttpResponse) => {
      const envelope = JSON.parse(response.body.toString('utf8'));
      envelope.usageMetadata.thoughtsTokenCount = 300000; envelope.usageMetadata.totalTokenCount = 300120;
      return {...response, body: bytes(envelope)};
    }] as const
  ]) {
    const store = await history.cloneStore({}, localRecord), memory = idV4Dependencies(inputs, fixture, store, fault);
    const result = await executeCandidateVideoIdInferenceMockV004(inputs, deriveRemaining(localRecord, 'mock-resume-stop-' + label), memory.deps);
    assert.equal(result.status, 'stopped'); assert.equal(memory.calls.length, 1);
    assert.equal(result.proof.targets[2].acceptance, 'not-evaluated');
    assert.equal(result.proof.targets.slice(3).every(target => target.delivery === 'not-sent'), true);
    assert.equal(result.proof.targets[0].usage?.estimatedNanoUsd, '37968750');
    assert.equal(result.proof.targets[1].usage?.estimatedNanoUsd, '42341400');
    const stoppedRecord = (await store.read('executionRecord'))!;
    assert.throws(() => deriveRemaining(stoppedRecord, 'mock-new-approval-cannot-lift-new-foundation-stop'));
    assert.throws(() => makeLocalApproval(stoppedRecord, 'mock-no-general-stop-override'));
    assert.equal(JSON.stringify(result).includes('synthetic-private-key'), false);
    await assertOldPrefix(store); checks.push(label + ' after approved recovery stops globally; no later condition is sent');
  }
  for (const phase of ['boundary','intent','response','usage','accepted','complete'] as const) {
    const store = await history.cloneStore({async beforeAppend(event) {
      if (event.sequence > local.proof.events.length && event.phase === phase) throw new Error('synthetic-resumed-save-failure');
    }}, localRecord);
    const memory = idV4Dependencies(inputs, fixture, store);
    const approval = deriveRemaining(localRecord, 'mock-resumed-storage-' + phase);
    let result;
    try { result = await executeCandidateVideoIdInferenceMockV004(inputs, approval, memory.deps); }
    catch { /* A refused boundary is also a stopped execution with zero sends. */ }
    if (result) { assert.equal(result.status, 'stopped'); assert.equal(result.persistenceFailed, true); }
    assert.equal(memory.calls.length, phase === 'complete' ? 8 : ['boundary','intent'].includes(phase) ? 0 : 1);
    await assertOldPrefix(store);
    if (phase !== 'boundary') {
      const incompleteRecord = (await store.read('executionRecord'))!;
      assert.throws(() => deriveRemaining(incompleteRecord, 'mock-save-failed-proof-cannot-resume'));
    }
    checks.push('resumed ' + phase + ' save failure cannot authorize subsequent or repeated sends');
  }
  const continued = idV4Dependencies(inputs, fixture, localStore, (_request, response, ordinal) => {
    const envelope = JSON.parse(response.body.toString('utf8'));
    envelope.usageMetadata = {promptTokenCount: 100, candidatesTokenCount: 20, thoughtsTokenCount: 30,
      cachedContentTokenCount: ordinal % 2 ? 40 : 0, totalTokenCount: 150, serviceTier: 'standard'};
    if (ordinal === 1) envelope.candidates[0].finishReason = 'MAX_TOKENS';
    return {...response, body: bytes(envelope)};
  });
  const resumed = await executeCandidateVideoIdInferenceMockV004(inputs, remaining, continued.deps);
  assert.equal(resumed.status, 'completed-phase'); assert.equal(continued.calls.length, expectedRemaining.length);
  assert.equal(resumed.actualApiCalls, 0); assert.equal(resumed.proof.counts.inference, 10); assert.equal(resumed.proof.counts.total, 25);
  assert.equal(resumed.proof.targets[0].acceptance, 'rejected'); assert.equal(resumed.proof.targets[1].acceptance, 'rejected');
  assert.equal(resumed.proof.targets[2].acceptance, 'rejected'); assert.equal(resumed.proof.targets[3].acceptance, 'accepted');
  const newExpectedCost = expectedRemaining.reduce((sum, _target, index) => {
    const cached = (index + 1) % 2 ? 40n : 0n;
    return sum + (100n - cached) * 750n + cached * 75n + 20n * 3750n + 30n * 3750n;
  }, 80310150n);
  assert.equal(resumed.proof.estimatedNanoUsd, newExpectedCost.toString());
  assert.equal(BigInt(resumed.proof.estimatedNanoUsd) < 1000000000n, true);
  for (const [index, request] of continued.calls.entries()) {
    const expected = fixture.requests.find(target => target.itemId === expectedRemaining[index].itemId
      && target.condition === expectedRemaining[index].condition)!;
    assert.equal(request.method, expected.request.method); assert.equal(request.url, expected.request.url);
    assert.deepEqual(request.body, bytes(expected.request.body));
    assert.equal(candidateVideoDigestV002({method: request.method, url: request.url, body: JSON.parse(request.body.toString('utf8'))}),
      expected.exactRequestSha256);
  }
  await assertOldPrefix(localStore);
  const completedRecord = (await localStore.read('executionRecord'))!;
  assert.throws(() => deriveRemaining(completedRecord, 'mock-no-unconsumed-conditions'));
  for (const indexes of [[0], [1], [2]]) await assert.rejects(async () => executeCandidateVideoIdInferenceMockV004(inputs,
    await idV4InferenceApproval(fixture, localStore, indexes, 'mock-consumed-condition-cannot-reappear'), continued.deps));
  assert.equal(continued.calls.length, 8); assert.deepEqual(await localStore.read('executionRecord'), completedRecord);
  checks.push('common consumed-set subtraction resumes only original unconsumed requests, keeps all sent A/B permanently consumed, records new cache usage once and never mixes prior answers into later exact bytes');

  for (const [index, kind] of formalKinds.entries())
    assert.equal(byteSha(await readFile(resolve(workspace, CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004[kind]))), formalBefore[index]);
  checks.push('the actual input table, execution plan and stopped execution record remain unchanged during synthetic memory tests');
  process.stdout.write(JSON.stringify({suite: 'task032-cache-reassessment-and-resume-memory', status: 'passed', checks: checks.length,
    proof: checks, actualApiCalls: 0, credentialReads: 0, officialArtifactWrites: 0, temporaryUniquePaths: 0,
    actualApiCostUsd: 0, formalComparisonWrites: 0}) + '\n');
}
async function task033Suite() {
  const checks: string[] = [];
  const inputs = await loadCandidateVideoIdInputsV003(workspace);
  const formalKinds = ['inputTable','executionPlan','executionRecord'] as const;
  const formalBefore = await Promise.all(formalKinds.map(async kind =>
    byteSha(await readFile(resolve(workspace, CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004[kind])))));
  const history = await task033HistoricalFixture(inputs), {fixture} = history;
  const context = {origin: 'mock' as const, experimentId: fixture.table.experimentId,
    approvalReference: 'mock-task033-scalar-normalization-basis', checkedAt: idV4Now};
  const cacheReview = createCandidateVideoIdCacheBillingReviewV004(context);
  const scalarReview = createCandidateVideoIdUsageScalarReviewV004(context, cacheReview);
  const savedResponse = history.events[72];
  assert.equal(savedResponse.phase, 'response'); assert.equal(savedResponse.itemId, 'item-0003');
  assert.equal(savedResponse.condition, 'A');
  const savedRaw = Buffer.from(savedResponse.detail.rawResponseBase64, 'base64');
  const savedEnvelope = JSON.parse(savedRaw.toString('utf8'));
  const unknownTarget = fixture.requests.find(target => target.itemId === savedResponse.itemId && target.condition === savedResponse.condition)!;
  const calculate = (envelope: unknown) => deriveCandidateVideoIdScalarUsageV004(envelope, cacheReview, scalarReview, unknownTarget.request.body);
  const calculated = calculate(savedEnvelope);
  assert.equal(Object.hasOwn(savedEnvelope.usageMetadata, 'candidatesTokenCount'), false);
  assert.equal(savedEnvelope.usageMetadata.promptTokenCount + savedEnvelope.usageMetadata.thoughtsTokenCount,
    savedEnvelope.usageMetadata.totalTokenCount);
  assert.equal(calculated.normalizedProviderUsage.candidatesTokenCount, 0);
  assert.equal(calculated.normalizedProviderUsage.cachedContentTokenCount, 0);
  assert.deepEqual(calculated.providerUsage, savedEnvelope.usageMetadata);
  assert.equal(calculated.usageNormalization.rawUsageCanonicalSha256, candidateVideoDigestV002(savedEnvelope.usageMetadata));
  assert.equal(calculated.usageNormalization.normalizedUsageCanonicalSha256, candidateVideoDigestV002(calculated.normalizedProviderUsage));
  assert.equal(calculated.usageNormalization.normalizationReviewSha256, candidateVideoDigestV002(scalarReview));
  assert.ok(calculated.usageNormalization.omittedZeroFields.includes('candidatesTokenCount'));
  assert.equal(calculated.estimatedNanoUsd,
    (BigInt(savedEnvelope.usageMetadata.promptTokenCount) * 750n + BigInt(savedEnvelope.usageMetadata.thoughtsTokenCount) * 3750n).toString());
  assert.equal(calculated.estimatedNanoUsd, '52206750');
  assert.equal(calculated.billingBreakdown.outputNanoUsd, '0');
  assert.equal(calculated.billingBreakdown.explicitCacheStorageNanoUsd, '0');
  const explicit = structuredClone(savedEnvelope);
  explicit.usageMetadata.candidatesTokenCount = 0; explicit.usageMetadata.cachedContentTokenCount = 0;
  assert.equal(calculate(explicit).estimatedNanoUsd, calculated.estimatedNanoUsd);
  assert.equal(Object.hasOwn(savedEnvelope.usageMetadata, 'candidatesTokenCount'), false);
  checks.push('saved raw scalar omissions are normalized with their new proof, total remains consistent, explicit zero has the same independently derived 52206750 nanoUSD fee, and original usage is unchanged');
  const zeroInputRequest = {contents: [], generationConfig: structuredClone(unknownTarget.request.body.generationConfig)};
  for (const field of ['promptTokenCount','cachedContentTokenCount','candidatesTokenCount','thoughtsTokenCount',
    'totalTokenCount','toolUsePromptTokenCount'] as const) {
    const zeroUsage: Record<string, number> = {promptTokenCount: 0, cachedContentTokenCount: 0, candidatesTokenCount: 0,
      thoughtsTokenCount: 0, totalTokenCount: 0, toolUsePromptTokenCount: 0};
    // Zero input/total can only be meaningful with no supplied input or output.
    // The real fixed request below is separately checked to reject this case.
    const allExplicit = deriveCandidateVideoIdScalarUsageV004({usageMetadata: zeroUsage}, cacheReview, scalarReview, zeroInputRequest);
    delete zeroUsage[field];
    const omitted = deriveCandidateVideoIdScalarUsageV004({usageMetadata: zeroUsage}, cacheReview, scalarReview, zeroInputRequest);
    assert.equal(omitted.estimatedNanoUsd, allExplicit.estimatedNanoUsd);
    assert.equal(omitted.normalizedProviderUsage[field], 0);
    assert.deepEqual(omitted.usageNormalization.omittedZeroFields, [field]);
    checks.push('only schema-verified scalar ' + field + ' may default to zero after full total consistency checks');
  }
  {
    const output = structuredClone(savedEnvelope); output.usageMetadata.candidatesTokenCount = 25;
    output.usageMetadata.totalTokenCount += 25;
    assert.equal(calculate(output).estimatedNanoUsd, (BigInt(calculated.estimatedNanoUsd) + 25n * 3750n).toString());
    const cached = {...idV4Envelope(inputs[0]), usageMetadata: structuredClone(task032UsageB)};
    assert.equal(deriveCandidateVideoIdScalarUsageV004(cached, cacheReview, scalarReview, fixture.requests[1].request.body).estimatedNanoUsd,
      deriveCandidateVideoIdCacheUsageV004(cached, cacheReview, fixture.requests[1].request.body).estimatedNanoUsd);
    checks.push('existing positive output and cached-input pricing remain unchanged, without adding cached tokens to the total');
  }
  const invalidUsage: Array<[string, (usage: any) => void]> = [
    ['total contradiction', usage => { usage.totalTokenCount++; }],
    ['unknown zero field', usage => { usage.futureBillableTokenCount = 0; }],
    ['unsupported tier', usage => { usage.serviceTier = 'priority'; }],
    ['tier is not a numeric scalar', usage => { usage.serviceTier = 0; }],
    ['null output is not omission', usage => { usage.candidatesTokenCount = null; }],
    ['negative tokens', usage => { usage.thoughtsTokenCount = -1; }],
    ['unsafe integer', usage => { usage.promptTokenCount = Number.MAX_SAFE_INTEGER + 1; }],
    ['fractional tokens', usage => { usage.promptTokenCount = 1.5; }],
    ['cached larger than prompt', usage => { usage.cachedContentTokenCount = usage.promptTokenCount + 1; }],
    ['unpriced tool usage', usage => { usage.toolUsePromptTokenCount = 1; usage.totalTokenCount++; }],
    ['repeated field is not a scalar', usage => { usage.promptTokensDetails = 0; }]
  ];
  for (const [label, mutate] of invalidUsage) {
    const envelope = structuredClone(savedEnvelope); mutate(envelope.usageMetadata);
    assert.throws(() => calculate(envelope)); checks.push(label + ' remains fail-closed after normalization');
  }
  {
    const envelope = structuredClone(savedEnvelope); envelope.usageMetadata.candidatesTokenCount = undefined;
    assert.throws(() => calculate(envelope));
    for (const usageMetadata of [undefined, null, 0, []]) assert.throws(() => calculate({usageMetadata}));
    assert.throws(() => calculate({}));
    assert.throws(() => calculate({usageMetadata: {}}));
    const nonemptyAnswer = structuredClone(savedEnvelope);
    nonemptyAnswer.candidates = [{content: {parts: [{text: '合成回答の非空本文'}]}}];
    assert.throws(() => calculate(nonemptyAnswer));
    checks.push('an own undefined scalar and a missing or non-object usage message are never rescued as omitted numeric fields');
    checks.push('zero input contradicts the nonempty fixed request, and zero candidate output contradicts a nonempty visible answer');
  }
  const makeLocalApproval = (record: Buffer, reference = 'mock-task033-approved-scalar-reassessment') =>
    buildCandidateVideoIdScalarReassessmentApprovalV004(record, fixture.table, fixture.plan,
      {approvedBy: 'mock', approvalReference: reference, checkedAt: idV4Now});
  const deriveRemaining = (record: Buffer, reference = 'mock-task033-approved-original-unconsumed') =>
    deriveCandidateVideoIdRemainingInferenceApprovalV004(record, fixture.table, fixture.plan,
      {approvedBy: 'mock', approvalReference: reference});
  async function assertOldPrefix(store: CandidateVideoIdMockStoreV004) {
    const record = (await store.read('executionRecord'))!;
    assert.deepEqual(record.subarray(0, history.record.length), history.record);
    assert.deepEqual(await store.read('inputTable'), history.inputTableBytes);
    assert.deepEqual(await store.read('executionPlan'), history.executionPlanBytes);
    const prefixEvents: CandidateVideoIdEventV004[] = record.subarray(0, history.record.length).toString('utf8')
      .trimEnd().split('\n').map(line => JSON.parse(line));
    assert.equal(prefixEvents.length, 75); assert.equal(prefixEvents[74].phase, 'failure');
    assert.equal(prefixEvents[74].detail.acceptance, 'not-evaluated');
    assert.equal(prefixEvents[73].detail.usage.complete, false);
    assert.equal(prefixEvents[73].detail.usage.estimatedNanoUsd, null);
    assert.equal(Object.hasOwn(prefixEvents[73].detail.usage.providerUsage, 'candidatesTokenCount'), false);
    assert.deepEqual(Buffer.from(prefixEvents[72].detail.rawResponseBase64, 'base64'), savedRaw);
  }
  assert.throws(() => deriveRemaining(history.record));
  assert.throws(() => buildCandidateVideoIdCacheReassessmentApprovalV004(history.record, fixture.table, fixture.plan,
    {approvedBy: 'mock', approvalReference: 'mock-old-reassessment-cannot-lift-new-stop', checkedAt: idV4Now}));
  {
    const store = await history.cloneStore(), memory = idV4Dependencies(inputs, fixture, store);
    await assert.rejects(async () => executeCandidateVideoIdInferenceMockV004(inputs,
      await idV4InferenceApproval(fixture, store, [5,6,7,8,9], 'mock-no-bypass-of-scalar-stop'), memory.deps));
    assert.equal(memory.calls.length, 0); await assertOldPrefix(store);
    checks.push('neither ordinary inference nor the historical cache-only recovery can bypass the unresolved scalar stop');
  }
  for (const [label, mutate] of invalidUsage) {
    const changed = structuredClone(history.events), envelope = structuredClone(savedEnvelope);
    mutate(envelope.usageMetadata); const raw = bytes(envelope);
    changed[72].detail.rawResponseBase64 = raw.toString('base64'); changed[72].detail.rawResponseSha256 = byteSha(raw);
    changed[72].detail.rawResponseByteLength = raw.length; changed[73].detail.usage.providerUsage = envelope.usageMetadata;
    assert.throws(() => makeLocalApproval(task032Rechain(changed), 'mock-unresolved-scalar-' + label));
    checks.push('historical ' + label + ' cannot be lifted by the narrow scalar-omission recovery');
  }
  const localApproval = makeLocalApproval(history.record), localStore = await history.cloneStore();
  assert.equal(localApproval.workOrderId, 'task-033'); assert.equal(localApproval.expectedEventCount, 75);
  assert.equal(localApproval.targets.length, 1); assert.deepEqual(localApproval.answerTarget, {itemId: 'item-0003', condition: 'A'});
  assert.equal(localApproval.limits.maximumNanoUsd, '1000000000'); assert.ok(localApproval.usageScalarReview);
  const local = await executeCandidateVideoIdScalarReassessmentMockV004(inputs, localApproval, history.localDeps(localStore));
  assert.equal(local.status, 'completed-phase'); assert.equal(local.persistenceFailed, false); assert.equal(local.savedRecordVerifiable, true);
  assert.equal(local.actualApiCalls, 0); assert.equal(local.simulatedApiCalls, 0); assert.equal(local.retry, 0); assert.equal(local.repair, 0);
  assert.deepEqual(local.proof.counts, history.historicalProof.counts);
  assert.equal(local.proof.targets[4].acceptance, 'rejected'); assert.equal(local.proof.targets[4].feeStatus, 'estimated');
  assert.equal(local.proof.targets[4].result, null); assert.ok(local.proof.targets[4].rejection);
  assert.equal(local.proof.targets[4].usage?.estimatedNanoUsd, calculated.estimatedNanoUsd);
  const expectedCumulative = BigInt(history.historicalProof.estimatedNanoUsd) + BigInt(calculated.estimatedNanoUsd);
  assert.equal(local.proof.estimatedNanoUsd, expectedCumulative.toString());
  assert.equal(local.proof.targets.reduce((sum, target) => sum + BigInt(target.usage?.estimatedNanoUsd ?? '0'), 0n), expectedCumulative);
  for (let index = 0; index < 4; index++) {
    assert.deepEqual(local.proof.targets[index].usage, history.historicalProof.targets[index].usage);
    assert.deepEqual(local.proof.targets[index].rejection, history.historicalProof.targets[index].rejection);
  }
  const localRecord = (await localStore.read('executionRecord'))!, suffix = local.proof.events.slice(75);
  assert.equal(suffix.length, 4); assert.equal(local.proof.events.length, 79);
  assert.equal(suffix.some(event => event.operation === 'inference' || event.phase === 'intent'), false);
  assert.equal(suffix.filter(event => event.phase === 'fee-reassessment').length, 1);
  assert.equal(suffix.filter(event => event.phase === 'answer-reassessment').length, 1);
  const feeEvent = suffix.find(event => event.phase === 'fee-reassessment')!;
  assert.deepEqual(feeEvent.detail.usage.providerUsage, savedEnvelope.usageMetadata);
  assert.deepEqual(feeEvent.detail.usage.normalizedProviderUsage, calculated.normalizedProviderUsage);
  assert.equal(feeEvent.detail.usage.usageNormalization.normalizationReviewSha256, candidateVideoDigestV002(localApproval.usageScalarReview));
  assert.equal(feeEvent.detail.additionalInferenceCount, 0); assert.equal(feeEvent.detail.allConsumedFeesKnown, true);
  assert.equal(feeEvent.detail.unknownConsumedFeeCount, 0);
  await assertOldPrefix(localStore);
  assert.deepEqual(inspectCandidateVideoIdExecutionRecordV004(localRecord, fixture.table, fixture.plan).counts, history.historicalProof.counts);
  await assert.rejects(() => executeCandidateVideoIdScalarReassessmentMockV004(inputs, localApproval, history.localDeps(localStore)));
  assert.deepEqual(await localStore.read('executionRecord'), localRecord);
  assert.throws(() => makeLocalApproval(localRecord, 'mock-local-reassessment-cannot-repeat'));
  checks.push('local item-0003 A reassessment sends nothing, appends exactly four new proof events, preserves all 75 prior lines, and adds only its one previously unknown fee');

  for (const [label, mutate] of [
    ['prefix SHA', (approval: typeof localApproval) => { approval.expectedRecordSha256 = '0'.repeat(64); }],
    ['prefix byte length', (approval: typeof localApproval) => { approval.expectedRecordByteLength++; }],
    ['source raw', (approval: typeof localApproval) => { approval.targets[0].rawResponseSha256 = '0'.repeat(64); }],
    ['source usage', (approval: typeof localApproval) => { approval.targets[0].usageEventSha256 = '0'.repeat(64); }],
    ['fixed request', (approval: typeof localApproval) => { approval.targets[0].exactRequestSha256 = '0'.repeat(64); }],
    ['repeated target', (approval: typeof localApproval) => { approval.targets.push(structuredClone(approval.targets[0])); }],
    ['wrong caller', (approval: typeof localApproval) => { approval.approvedBy = 'kawafmm'; }],
    ['scalar proof binding', (approval: typeof localApproval) => { approval.usageScalarReview.approvalReference += '-changed'; }]
  ] as const) {
    const store = await history.cloneStore(), approval = structuredClone(localApproval); mutate(approval);
    await assert.rejects(() => executeCandidateVideoIdScalarReassessmentMockV004(inputs, approval, history.localDeps(store)));
    assert.deepEqual(await store.read('executionRecord'), history.record);
    checks.push(label + ' mismatch cannot authorize a reassessment append');
  }
  {
    const store = await history.cloneStore(); let calls = 0;
    await assert.rejects(() => executeCandidateVideoIdScalarReassessmentMockV004(inputs, localApproval,
      {...history.localDeps(store), port: {mode: 'live', async exchange() { calls++; throw new Error('forbidden-http'); }}} as any));
    assert.equal(calls, 0); await assertOldPrefix(store);
    checks.push('the local-only entry rejects a supplied HTTP dependency before any callback');
  }
  for (const event of suffix) {
    const store = await history.cloneStore({async beforeAppend(next) {
      if (next.sequence === event.sequence) throw new Error('synthetic-scalar-reassessment-save-failure');
    }});
    let stopped = false;
    let result: Awaited<ReturnType<typeof executeCandidateVideoIdScalarReassessmentMockV004>> | undefined;
    try { result = await executeCandidateVideoIdScalarReassessmentMockV004(inputs, localApproval, history.localDeps(store)); }
    catch { stopped = true; }
    if (result) {
      stopped = result.status === 'stopped'; assert.equal(result.actualApiCalls, 0); assert.equal(result.simulatedApiCalls, 0);
    }
    assert.equal(stopped, true); await assertOldPrefix(store);
    const incompleteRecord = (await store.read('executionRecord'))!;
    assert.throws(() => deriveRemaining(incompleteRecord, 'mock-scalar-local-save-stop-no-resume'));
    checks.push(event.phase + ' persistence failure leaves all subsequent inference forbidden');
  }
  for (const [label, mutate] of [
    ['normalization result', (event: CandidateVideoIdEventV004) => { event.detail.usage.normalizedProviderUsage.candidatesTokenCount = 1; }],
    ['normalization proof', (event: CandidateVideoIdEventV004) => { event.detail.usage.usageNormalization.omittedZeroFields = []; }],
    ['fee amount', (event: CandidateVideoIdEventV004) => { event.detail.usage.estimatedNanoUsd = '1'; }],
    ['source target', (event: CandidateVideoIdEventV004) => { event.itemId = 'item-0004'; }]
  ] as const) {
    const changed = structuredClone(local.proof.events); mutate(changed.find(event => event.sequence > 75 && event.phase === 'fee-reassessment')!);
    assert.throws(() => inspectCandidateVideoIdExecutionRecordV004(task032Rechain(changed), fixture.table, fixture.plan));
    checks.push('rehashed ' + label + ' tampering is rejected by raw-derived replay');
  }
  {
    const changed = structuredClone(local.proof.events);
    changed.splice(changed.findIndex(event => event.sequence > 75 && event.phase === 'answer-reassessment'), 1);
    assert.throws(() => inspectCandidateVideoIdExecutionRecordV004(task032Rechain(changed), fixture.table, fixture.plan));
    checks.push('a fee resolution cannot skip the stored answer verdict before declaring the phase resumable');
  }
  const remaining = deriveRemaining(localRecord);
  const consumed = new Set(history.events.filter(event => event.operation === 'inference' && event.phase === 'intent')
    .map(event => `${event.itemId}/${event.condition}`));
  const expectedRemaining = history.originalApproval.targets.filter(target => !consumed.has(`${target.itemId}/${target.condition}`));
  assert.equal(consumed.size, 5); assert.deepEqual(remaining.targets, expectedRemaining); assert.equal(remaining.targets.length, 5);
  assert.equal(remaining.limits.inference, 5); assert.equal(remaining.limits.total, 5);
  assert.equal(remaining.timeouts.inferenceMs, 600000); assert.equal(remaining.costConditions.maximumNanoUsd, '1000000000');
  {
    const store = await history.cloneStore({}, localRecord), memory = idV4Dependencies(inputs, fixture, store);
    for (let index = 0; index < 5; index++) await assert.rejects(async () => executeCandidateVideoIdInferenceMockV004(inputs,
      await idV4InferenceApproval(fixture, store, [index], 'mock-scalar-all-consumed-remain-forbidden-' + index), memory.deps));
    assert.equal(memory.calls.length, 0); assert.deepEqual(await store.read('executionRecord'), localRecord);
    const one = deriveRemaining(localRecord, 'mock-scalar-consume-one-more');
    one.targets = one.targets.slice(0, 1); one.limits.inference = 1; one.limits.total = 1;
    const result = await executeCandidateVideoIdInferenceMockV004(inputs, one, memory.deps);
    assert.equal(result.status, 'completed-phase'); assert.equal(memory.calls.length, 1);
    const four = deriveRemaining((await store.read('executionRecord'))!, 'mock-scalar-remaining-derived-again');
    assert.deepEqual(four.targets, expectedRemaining.slice(1)); assert.equal(four.targets.length, 4);
    checks.push('all five prior intents remain permanently consumed, while the same approved-set subtraction yields five and then four unconsumed requests');
  }
  const resumedFaults: Array<[string, (request: HttpRequest, response: HttpResponse) => HttpResponse]> = [
    ['omission with inconsistent total', (_request, response) => {
      const envelope = JSON.parse(response.body.toString('utf8')); delete envelope.usageMetadata.candidatesTokenCount;
      envelope.candidates[0].finishReason = 'MAX_TOKENS'; return {...response, body: bytes(envelope)};
    }],
    ['unknown zero field', (_request, response) => {
      const envelope = JSON.parse(response.body.toString('utf8')); envelope.usageMetadata.futureBillingCount = 0;
      return {...response, body: bytes(envelope)};
    }],
    ['unsupported service tier', (_request, response) => {
      const envelope = JSON.parse(response.body.toString('utf8')); envelope.usageMetadata.serviceTier = 'priority';
      return {...response, body: bytes(envelope)};
    }],
    ['authentication', (_request, response) => ({...response, status: 401})],
    ['HTTP failure', (_request, response) => ({...response, status: 503})],
    ['timeout', () => { throw new Stage1Timeout(); }],
    ['unknown delivery', () => { throw new Error('synthetic-connection-lost-after-send'); }],
    ['secret handling', (_request, response) => ({...response, body: bytes({echo: 'synthetic-private-key'})})],
    ['fee over cap', (_request, response) => {
      const envelope = JSON.parse(response.body.toString('utf8'));
      envelope.usageMetadata.thoughtsTokenCount = 300000; envelope.usageMetadata.totalTokenCount = 300120;
      return {...response, body: bytes(envelope)};
    }]
  ];
  for (const [label, fault] of resumedFaults) {
    const store = await history.cloneStore({}, localRecord), memory = idV4Dependencies(inputs, fixture, store, fault);
    const result = await executeCandidateVideoIdInferenceMockV004(inputs, deriveRemaining(localRecord, 'mock-scalar-resumed-stop-' + label), memory.deps);
    assert.equal(result.status, 'stopped'); assert.equal(memory.calls.length, 1);
    assert.equal(result.proof.targets[5].acceptance, 'not-evaluated');
    assert.equal(result.proof.targets.slice(6).every(target => target.delivery === 'not-sent'), true);
    assert.equal(result.proof.targets[4].usage?.estimatedNanoUsd, calculated.estimatedNanoUsd);
    const stoppedRecord = (await store.read('executionRecord'))!;
    assert.throws(() => deriveRemaining(stoppedRecord, 'mock-scalar-new-stop-remains-terminal'));
    assert.throws(() => makeLocalApproval(stoppedRecord, 'mock-scalar-no-general-stop-override'));
    assert.equal(JSON.stringify(result).includes('synthetic-private-key'), false);
    await assertOldPrefix(store); checks.push(label + ' remains a global stop with no subsequent or repeated send');
  }
  for (const phase of ['boundary','intent','response','usage','rejected','complete'] as const) {
    const store = await history.cloneStore({async beforeAppend(event) {
      if (event.sequence > local.proof.events.length && event.phase === phase) throw new Error('synthetic-scalar-resumed-save-failure');
    }}, localRecord);
    const memory = idV4Dependencies(inputs, fixture, store, (_request, response) => {
      const envelope = JSON.parse(response.body.toString('utf8')); envelope.candidates[0].finishReason = 'MAX_TOKENS';
      return {...response, body: bytes(envelope)};
    });
    let result: Awaited<ReturnType<typeof executeCandidateVideoIdInferenceMockV004>> | undefined;
    let threw = false;
    try { result = await executeCandidateVideoIdInferenceMockV004(inputs, deriveRemaining(localRecord, 'mock-scalar-save-stop-' + phase), memory.deps); }
    catch { threw = true; }
    assert.ok(threw || result);
    if (result) { assert.equal(result.status, 'stopped'); assert.equal(result.persistenceFailed, true); }
    assert.equal(memory.calls.length, phase === 'complete' ? 5 : ['boundary','intent'].includes(phase) ? 0 : 1);
    await assertOldPrefix(store);
    if (phase !== 'boundary') {
      const stoppedRecord = (await store.read('executionRecord'))!;
      assert.throws(() => deriveRemaining(stoppedRecord, 'mock-scalar-save-failure-cannot-resume'));
    }
    checks.push('resumed ' + phase + ' persistence failure stops the common engine without restoring send permission');
  }
  const continued = idV4Dependencies(inputs, fixture, localStore, (_request, response, ordinal) => {
    const envelope = JSON.parse(response.body.toString('utf8'));
    if (ordinal === 1) {
      delete envelope.usageMetadata.candidatesTokenCount; envelope.usageMetadata.totalTokenCount = 130;
      envelope.candidates[0].finishReason = 'MAX_TOKENS'; envelope.candidates[0].content.parts = [];
    } else if (ordinal === 2) envelope.usageMetadata.cachedContentTokenCount = 40;
    return {...response, body: bytes(envelope)};
  });
  const resumed = await executeCandidateVideoIdInferenceMockV004(inputs, remaining, continued.deps);
  assert.equal(resumed.status, 'completed-phase'); assert.equal(continued.calls.length, 5);
  assert.equal(resumed.actualApiCalls, 0); assert.equal(resumed.proof.counts.inference, 10); assert.equal(resumed.proof.counts.total, 25);
  assert.equal(resumed.proof.targets[5].acceptance, 'rejected'); assert.equal(resumed.proof.targets[6].acceptance, 'accepted');
  assert.equal(resumed.proof.targets.slice(0, 5).every(target => target.acceptance === 'rejected'), true);
  const resumedCost = expectedCumulative + 100n * 750n + 30n * 3750n
    + 60n * 750n + 40n * 75n + 50n * 3750n + 3n * (100n * 750n + 50n * 3750n);
  assert.equal(resumed.proof.estimatedNanoUsd, resumedCost.toString());
  assert.equal(BigInt(resumed.proof.estimatedNanoUsd) < 1000000000n, true);
  for (const value of ['1000000000', '1000000001']) assert.throws(() =>
    assertCandidateVideoIdInferenceCostContinuationV004(remaining.costConditions, value));
  for (const [index, request] of continued.calls.entries()) {
    const expected = fixture.requests.find(target => target.itemId === expectedRemaining[index].itemId && target.condition === expectedRemaining[index].condition)!;
    assert.equal(request.method, expected.request.method); assert.equal(request.url, expected.request.url);
    assert.deepEqual(request.body, bytes(expected.request.body));
    assert.equal(candidateVideoDigestV002({method: request.method, url: request.url, body: JSON.parse(request.body.toString('utf8'))}),
      expected.exactRequestSha256);
  }
  await assertOldPrefix(localStore);
  const completedRecord = (await localStore.read('executionRecord'))!;
  assert.throws(() => deriveRemaining(completedRecord, 'mock-scalar-no-unused-targets-remain'));
  checks.push('the unchanged common engine continues after an omitted-output answer rejection, sends only the five original unconsumed requests, preserves exact request SHA, and enforces the unchanged one-dollar cumulative cap');
  for (const [index, kind] of formalKinds.entries())
    assert.equal(byteSha(await readFile(resolve(workspace, CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004[kind]))), formalBefore[index]);
  checks.push('synthetic scalar tests leave the three actual formal artifacts unchanged and never read human comparison data');
  process.stdout.write(JSON.stringify({suite: 'task033-scalar-omission-reassessment-and-resume-memory', status: 'passed', checks: checks.length,
    proof: checks, actualApiCalls: 0, credentialReads: 0, officialArtifactWrites: 0, temporaryUniquePaths: 0,
    actualApiCostUsd: 0, formalComparisonWrites: 0}) + '\n');
}
async function task035PreparationSuite() {
  const checks: string[] = [];
  const protectedPaths = [CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004.inputTable,
    CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004.executionPlan, CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004.executionRecord,
    'docs/CURRENT_GOAL.md', 'docs/GOAL_DEFINITION.md', 'DECISIONS.md'];
  const original = await Promise.all(protectedPaths.map(async path => byteSha(await readFile(resolve(workspace, path)))));
  let newFormalBefore: string | null = null;
  try { newFormalBefore = byteSha(await readFile(resolve(workspace, CANDIDATE_VIDEO_ID_PROFILE_V005.executionRecordPath))); }
  catch (error) { assert.equal((error as NodeJS.ErrnoException).code, 'ENOENT'); }
  const childResult = await new Promise<any>((okay, reject) => {
    const child = spawn(process.execPath, [...process.execArgv, import.meta.filename, '--task035-source-read-worker'],
      {cwd: resolve(workspace, 'runner'), stdio: ['ignore','pipe','pipe']});
    const output: Buffer[] = [], errors: Buffer[] = [];
    child.stdout.on('data', chunk => output.push(Buffer.from(chunk))); child.stderr.on('data', chunk => errors.push(Buffer.from(chunk)));
    child.on('error', reject); child.on('close', code => {
      try { assert.equal(code, 0, Buffer.concat(errors).toString('utf8')); okay(JSON.parse(Buffer.concat(output).toString('utf8'))); }
      catch (error) { reject(error); }
    });
  });
  assert.equal(childResult.oldRecordSha256, '115b4c4398cb2a967d13608e16c1f4e3dec89500cfff3762715cc9096ee24ca8');
  assert.equal(childResult.oldEventCount, 101); assert.equal(childResult.oldInferenceCount, 10);
  assert.deepEqual(childResult.oldInputLimit, Array(10).fill(4096)); assert.deepEqual(childResult.newInputLimit, Array(10).fill(8192));
  assert.equal(childResult.actualApiCalls, 0); assert.equal(childResult.writes, 0);
  checks.push('fresh process admits original sources before replay; old 101 events and ten 4096 requests survive, new requests are 8192');

  const inputs = await loadCandidateVideoIdInputsV003(workspace), fixture = idV4Fixture(inputs);
  const previousStore = createCandidateVideoIdMemoryStoreMockV004();
  const oldPreparation = idV4Dependencies(inputs, fixture, previousStore);
  const oldPrepared = await executeCandidateVideoIdPreparationMockV004(inputs, fixture.table, fixture.plan, fixture.approval, oldPreparation.deps);
  assert.equal(oldPrepared.status, 'completed-phase');
  const oldInference = idV4Dependencies(inputs, fixture, previousStore);
  const oldCompleted = await executeCandidateVideoIdInferenceMockV004(inputs, await idV4InferenceApproval(fixture, previousStore), oldInference.deps);
  assert.equal(oldCompleted.status, 'completed-phase'); assert.equal(oldInference.calls.length, 10);
  const sources: CandidateVideoIdSourcesV005 = {inputTable: (await previousStore.read('inputTable'))!,
    executionPlan: (await previousStore.read('executionPlan'))!, previousRecord: (await previousStore.read('executionRecord'))!};
  const oldSourceHashes = Object.values(sources).map(byteSha);
  const review = buildCandidateVideoIdPriceReviewV005({origin: 'mock', experimentId: 'task-035',
    approvalReference: 'mock-task035-preparation-only', checkedAt: idV4Now});
  const approval = buildCandidateVideoIdPreparationApprovalV005(sources,
    {approvedBy: 'mock', approvalReference: review.approvalReference}, review);
  const requests = buildCandidateVideoIdFixedRequestsV005(fixture.table, fixture.plan);
  type Fault = (request: HttpRequest, response: HttpResponse, ordinal: number) => HttpResponse;
  function dependencies(store: CandidateVideoIdRecordStoreV005, fault?: Fault) {
    const calls: HttpRequest[] = [];
    const port: HttpPort = {mode: 'mock', async exchange(request) {
      const record = (await store.read())!, event: CandidateVideoIdEventV005 = JSON.parse(record.toString('utf8').trimEnd().split('\n').at(-1)!);
      assert.equal(event.phase, 'intent'); assert.deepEqual(JSON.parse(bytes(event.detail.exactRequest).toString('utf8')),
        {method: request.method, url: request.url, body: request.body.length ? JSON.parse(request.body.toString('utf8')) : null});
      assert.equal(byteSha(request.body), event.detail.bodySha256);
      const proof = inspectCandidateVideoIdPreparationRecordV005(record, sources);
      assert.equal(proof.counts.total, calls.length + 1); assert.equal(proof.counts.inference, 0);
      calls.push(request);
      let body: Buffer;
      if (request.method === 'GET') {
        const file = fixture.plan.files.find(file => file.uri === request.url)!;
        assert.ok(file); body = bytes({name: file.name, uri: file.uri, expirationTime: file.expirationTime,
          mimeType: file.mimeType, sizeBytes: String(file.byteLength),
          sha256Hash: Buffer.from(file.mediaSha256, 'hex').toString('base64'), state: 'ACTIVE'});
      } else {
        assert.equal(request.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:countTokens');
        const target = requests.find(target => target.exactRequestSha256 === event.detail.completeInferenceRequestSha256)!;
        assert.ok(target); assert.deepEqual(JSON.parse(request.body.toString('utf8')),
          {generateContentRequest: {model: 'models/gemini-3.8-flash', ...target.request.body}});
        body = bytes({totalTokens: 1000 + calls.length});
      }
      const response: HttpResponse = {status: 200, headers: {'x-goog-api-key': 'synthetic-private-key'}, body};
      return fault ? fault(request, response, calls.length) : response;
    }};
    return {calls, deps: {store, port, clock: () => idV4Now,
      containsSecret: (raw: Buffer) => raw.includes(Buffer.from('synthetic-private-key'))}};
  }
  const store = createCandidateVideoIdMemoryRecordV005(), memory = dependencies(store);
  const prepared = await executeCandidateVideoIdPreparationMockV005(sources, approval, memory.deps);
  assert.equal(prepared.status, 'prepared'); assert.equal(prepared.savedRecordVerifiable, true); assert.equal(prepared.persistenceFailed, false);
  assert.equal(prepared.actualApiCalls, 0); assert.equal(prepared.simulatedApiCalls, 15); assert.equal(prepared.inferenceAuthorized, false);
  assert.deepEqual(prepared.proof.counts, {metadataGet: 5, countTokens: 10, inference: 0, total: 15});
  assert.equal(prepared.proof.events.length, 48); assert.equal(prepared.proof.measurements.length, 10);
  assert.equal(prepared.proof.requests.length, 10); assert.equal(prepared.proof.referenceCost?.configuredGenerationTokens, 81920);
  assert.equal(prepared.proof.referenceCost?.inputTokens, 10105); assert.equal(prepared.proof.referenceCost?.inputNanoUsd, '7578750');
  assert.equal(prepared.proof.referenceCost?.configuredGenerationNanoUsd, '307200000');
  assert.equal(prepared.proof.referenceCost?.referenceTotalNanoUsd, '314778750');
  assert.equal(prepared.proof.referenceCost?.historicalExperimentExpenseIncluded, false);
  assert.equal(prepared.proof.referenceCost?.inferenceExpenseBudget, 'not-approved');
  assert.equal(prepared.proof.referenceCost?.guaranteedTotalCap, false);
  assert.equal(prepared.proof.referenceCost?.futureCacheDiscountAssumed, false);
  assert.equal(prepared.lastResponse?.rawPersistence, 'persisted');
  const completedRecord = (await store.read())!;
  assert.equal(completedRecord.includes(Buffer.from('synthetic-private-key')), false);
  assert.equal(completedRecord.includes(Buffer.from('x-goog-api-key')), false);
  assert.equal(completedRecord.includes(Buffer.from('usageMetadata')), false);
  assert.equal(completedRecord.includes(Buffer.from('rawResponseBase64')), true);
  assert.deepEqual(prepared.proof.events.map(event => event.experimentId), Array(48).fill('task-035'));
  assert.equal(prepared.proof.approval?.sources.previousRecord.fileSha256, byteSha(sources.previousRecord));
  assert.equal(prepared.proof.events.some(event => event.operation === 'inference'), false);
  checks.push('a separate 8192 calibration durably completes GET5/count10, saves only new evidence, leaves inference and its expense budget unapproved');
  for (let index = 0; index < 10; index++) {
    const measurement = prepared.proof.measurements[index], target = requests[index];
    assert.equal(measurement.exactRequestSha256, target.exactRequestSha256);
    assert.notEqual(measurement.exactRequestSha256, fixture.requests[index].exactRequestSha256);
    assert.equal(measurement.totalTokens, 1006 + index);
    assert.equal(measurement.measurementKind, 'simulated-new-8192-request');
    const intent = prepared.proof.events.find(event => event.phase === 'intent' && event.operation === 'count-tokens'
      && event.itemId === target.itemId && event.condition === target.condition)!;
    assert.equal(intent.detail.timeoutMs, 180000);
    assert.equal(intent.detail.exactRequest.body.generateContentRequest.generationConfig.maxOutputTokens, 8192);
    const oldBody = structuredClone(fixture.requests[index].request.body);
    oldBody.generationConfig.maxOutputTokens = 8192;
    assert.deepEqual(target.request.body, oldBody);
    checks.push(target.itemId + '/' + target.condition + ': new full-request measurement is bound only to its new SHA and unchanged content');
  }
  for (const intent of prepared.proof.events.filter(event => event.phase === 'intent' && event.operation === 'metadata-get')) {
    assert.equal(intent.detail.timeoutMs, 30000); assert.equal(intent.detail.completeInferenceRequestSha256, null);
    checks.push(intent.itemId + ': one metadata GET keeps the 30-second timeout and the original URI');
  }
  for (const phase of ['boundary','intent','response','metadata','requests-fixed','measurement','complete']) {
    const failedStore = createCandidateVideoIdMemoryRecordV005({async beforeAppend(event) {
      if (event.phase === phase) throw new Error('synthetic-storage-failure');
    }}), failed = dependencies(failedStore);
    const result = await executeCandidateVideoIdPreparationMockV005(sources, approval, failed.deps);
    assert.equal(result.status, 'stopped'); assert.equal(result.persistenceFailed, true); assert.equal(result.actualApiCalls, 0);
    assert.equal(result.inferenceCount, 0); assert.ok(failed.calls.length <= 15);
    if (phase === 'response') assert.equal(result.lastResponse?.rawPersistence, 'not-persisted');
    const count = failed.calls.length;
    await assert.rejects(() => executeCandidateVideoIdPreparationMockV005(sources, approval, failed.deps));
    assert.equal(failed.calls.length, count);
    checks.push(phase + ': durable write failure stops all work, reports unsaved evidence and cannot restart');
  }
  const invalidApprovals: Array<[string, (value: any) => void]> = [
    ['old maximum', value => { value.profile.maxOutputTokens = 4096; }],
    ['LOW thinking', value => { value.profile.thinkingLevel = 'LOW'; }],
    ['different model', value => { value.profile.model = 'different-model'; }],
    ['inference permission', value => { value.profile.limits.inference = 10; }],
    ['extra metadata poll', value => { value.profile.extraPoll = 1; }],
    ['upload permission', value => { value.profile.reupload = 1; }],
    ['different timeout', value => { value.profile.timeouts.countTokensMs = 30000; }],
    ['old request SHA', value => { value.requests[0].exactRequestSha256 = fixture.requests[0].exactRequestSha256; }],
    ['duplicated condition', value => { value.requests[1] = value.requests[0]; }],
    ['wrong source record', value => { value.sources.previousRecord.fileSha256 = '0'.repeat(64); }],
    ['old experiment identity', value => { value.experimentId = fixture.table.experimentId; }],
    ['invented expense frame', value => { value.maximumNanoUsd = '1000000000'; }],
    ['old fee copied into new approval', value => { value.historicalExpense = '465977400'; }],
    ['price mismatch', value => { value.priceReview.standardPrice.inputNanoUsdPerToken++; }],
    ['future price review', value => { value.priceReview.checkedAt = '2026-09-07T00:00:00.000Z'; }],
    ['mixed live approval', value => { value.origin = 'live'; value.approvedBy = 'kawafmm'; }]
  ];
  for (const [label, mutate] of invalidApprovals) {
    const changed = structuredClone(approval); mutate(changed);
    const invalidStore = createCandidateVideoIdMemoryRecordV005(), invalid = dependencies(invalidStore);
    await assert.rejects(() => executeCandidateVideoIdPreparationMockV005(sources, changed, invalid.deps));
    assert.equal(invalid.calls.length, 0); assert.equal(await invalidStore.read(), null);
    checks.push(label + ': rejected before record creation or HTTP');
  }
  const faults: Array<[string, number, (response: HttpResponse) => HttpResponse]> = [
    ['non-ACTIVE file', 1, response => ({...response, body: bytes({...JSON.parse(response.body.toString()), state: 'PROCESSING'})})],
    ['file URI mismatch', 1, response => ({...response, body: bytes({...JSON.parse(response.body.toString()), uri: 'https://generativelanguage.googleapis.com/v1beta/files/other'})})],
    ['file SHA mismatch', 1, response => ({...response, body: bytes({...JSON.parse(response.body.toString()), sha256Hash: Buffer.alloc(32).toString('base64')})})],
    ['file expiration mismatch', 5, response => ({...response, body: bytes({...JSON.parse(response.body.toString()), expirationTime: '2026-09-05T00:00:00.000Z'})})],
    ['file byte mismatch', 1, response => ({...response, body: bytes({...JSON.parse(response.body.toString()), sizeBytes: '1'})})],
    ['zero input count', 6, response => ({...response, body: bytes({totalTokens: 0})})],
    ['negative input count', 6, response => ({...response, body: bytes({totalTokens: -1})})],
    ['string input count', 6, response => ({...response, body: bytes({totalTokens: '123'})})],
    ['missing input count', 15, response => ({...response, body: bytes({})})],
    ['provider HTTP error', 6, response => ({...response, status: 503})],
    ['malformed response', 6, response => ({...response, body: Buffer.from('{')})],
    ['secret-like response', 6, response => ({...response, body: bytes({totalTokens: 1, text: 'synthetic-private-key'})})],
    ['escaped secret response', 1, response => ({...response, body: Buffer.from('{"text":"synthetic-private-\\u006bey"}')})]
  ];
  for (const [label, ordinal, fault] of faults) {
    const failedStore = createCandidateVideoIdMemoryRecordV005();
    const failed = dependencies(failedStore, (_request, response, index) => index === ordinal ? fault(response) : response);
    const result = await executeCandidateVideoIdPreparationMockV005(sources, approval, failed.deps);
    assert.equal(result.status, 'stopped'); assert.equal(result.persistenceFailed, false); assert.equal(result.savedRecordVerifiable, true);
    assert.equal(result.proof.abnormal, true); assert.equal(failed.calls.length, ordinal);
    assert.equal(result.proof.events.at(-1)?.phase, 'failure'); assert.equal(result.inferenceCount, 0);
    assert.equal(result.actualApiCalls, 0); assert.equal((await failedStore.read())!.includes(Buffer.from('synthetic-private-key')), false);
    if (label.includes('secret')) assert.equal(result.lastResponse?.rawPersistence, 'omitted-secret');
    await assert.rejects(() => executeCandidateVideoIdPreparationMockV005(sources, approval, failed.deps));
    assert.equal(failed.calls.length, ordinal);
    checks.push(label + ': raw or explicit secret omission is preserved, all remaining operations stop, no retry or reupload');
  }
  for (const [label, ordinal] of [['metadata timeout', 1], ['count timeout', 6]] as const) {
    const failedStore = createCandidateVideoIdMemoryRecordV005();
    const failed = dependencies(failedStore, (_request, response, index) => { if (index === ordinal) throw new Stage1Timeout(); return response; });
    const result = await executeCandidateVideoIdPreparationMockV005(sources, approval, failed.deps);
    assert.equal(result.status, 'stopped'); assert.equal(failed.calls.length, ordinal);
    assert.equal(result.proof.events.at(-1)?.detail.delivery, 'unknown');
    assert.equal(result.proof.events.at(-1)?.detail.reason, 'send-outcome-unknown');
    checks.push(label + ': uncertain delivery is terminal and never triggers resend');
  }
  const replay = (events: CandidateVideoIdEventV005[]) => {
    let previous: string | null = null;
    events.forEach((event, index) => { event.sequence = index + 1; event.previousSha256 = previous;
      const {sha256: _sha, ...content} = event; event.sha256 = candidateVideoDigestV002(content); previous = event.sha256; });
    return Buffer.concat(events.map(bytes));
  };
  const corruptions: Array<[string, (events: CandidateVideoIdEventV005[]) => void]> = [
    ['experiment swapped', events => { events[0].experimentId = fixture.table.experimentId; }],
    ['request cap swapped', events => { events.find(event => event.phase === 'requests-fixed')!.detail.requests[0].request.body.generationConfig.maxOutputTokens = 4096; }],
    ['old SHA measured', events => { events.find(event => event.phase === 'measurement')!.detail.exactRequestSha256 = fixture.requests[0].exactRequestSha256; }],
    ['count changed', events => { events.find(event => event.phase === 'measurement')!.detail.totalTokens++; }],
    ['raw byte mismatch', events => { events.find(event => event.phase === 'response')!.detail.rawResponseByteLength++; }],
    ['total estimate changed', events => { events.at(-1)!.detail.referenceCost.referenceTotalNanoUsd = '1'; }],
    ['completion authorizes inference', events => { events.at(-1)!.detail.inferenceAuthorized = true; }],
    ['extra complete event', events => { events.push(structuredClone(events.at(-1)!)); }],
    ['copy old raw into boundary', events => { events[0].detail.previousRawResponse = 'forbidden-old-data'; }],
    ['count duplicated', events => { const index = events.findIndex(event => event.phase === 'intent' && event.operation === 'count-tokens'); events.splice(index + 3, 0, ...structuredClone(events.slice(index, index + 3))); }]
  ];
  for (const [label, mutate] of corruptions) {
    const events = structuredClone(prepared.proof.events); mutate(events);
    assert.throws(() => inspectCandidateVideoIdPreparationRecordV005(replay(events), sources));
    checks.push(label + ': rejected even after recomputing the entire new hash chain');
  }
  const failureStore = createCandidateVideoIdMemoryRecordV005();
  const failureMemory = dependencies(failureStore, () => { throw new Stage1Timeout(); });
  const failed = await executeCandidateVideoIdPreparationMockV005(sources, approval, failureMemory.deps);
  for (const [label, mutate] of [
    ['failure claims inference', (events: CandidateVideoIdEventV005[]) => { events.at(-1)!.operation = 'inference'; }],
    ['failure names wrong item', (events: CandidateVideoIdEventV005[]) => { events.at(-1)!.itemId = 'item-0002'; }],
    ['received without response', (events: CandidateVideoIdEventV005[]) => { events.at(-1)!.detail.delivery = 'response-received'; events.at(-1)!.detail.reason = 'response-rejected'; }],
    ['unknown without intent', (events: CandidateVideoIdEventV005[]) => { events.splice(1, 1); }]
  ] as const) {
    const events = structuredClone(failed.proof.events); mutate(events);
    assert.throws(() => inspectCandidateVideoIdPreparationRecordV005(replay(events), sources));
    checks.push(label + ': failure provenance is checked against the actual pending operation');
  }
  const changedSource = {inputTable: Buffer.from(sources.inputTable), executionPlan: Buffer.from(sources.executionPlan),
    previousRecord: Buffer.from(sources.previousRecord)};
  const changedStore = createCandidateVideoIdMemoryRecordV005({async beforeAppend(event) {
    if (event.phase === 'intent') changedSource.previousRecord = Buffer.concat([changedSource.previousRecord, Buffer.from('\n')]);
  }}), changed = dependencies(changedStore);
  const sourceStopped = await executeCandidateVideoIdPreparationMockV005(sources, approval,
    {...changed.deps, verifySources: async () => changedSource});
  assert.equal(sourceStopped.status, 'stopped'); assert.equal(changed.calls.length, 0);
  assert.equal(sourceStopped.proof.counts.metadataGet, 1);
  assert.equal(sourceStopped.proof.events.at(-1)?.detail.delivery, 'not-sent');
  checks.push('source change between durable intent and send consumes no HTTP and stops without rebasing or retry');
  const expiredStore = createCandidateVideoIdMemoryRecordV005(), expired = dependencies(expiredStore);
  await assert.rejects(() => executeCandidateVideoIdPreparationMockV005(sources, approval,
    {...expired.deps, clock: () => '2026-09-07T00:00:00.000Z'}));
  assert.equal(expired.calls.length, 0); assert.equal(await expiredStore.read(), null);
  checks.push('expired Files are rejected before record creation without upload or polling');
  const mixedStore = createCandidateVideoIdMemoryRecordV005(), mixed = dependencies(mixedStore);
  await assert.rejects(() => executeCandidateVideoIdPreparationMockV005(sources, approval,
    {...mixed.deps, port: {...mixed.deps.port, mode: 'live'}}));
  await assert.rejects(() => executeCandidateVideoIdPreparationMockV005(sources, approval,
    {...mixed.deps, store: {read: async () => null, create: async () => { throw new Error('must-not-create'); }, append: async () => { throw new Error('must-not-append'); }}}));
  assert.equal(mixed.calls.length, 0); assert.equal(await mixedStore.read(), null);
  checks.push('mock entry rejects live ports and arbitrary record sinks before any effect');
  await assert.rejects(() => executeCandidateVideoIdPreparationMockV005(sources, approval, memory.deps));
  assert.equal(memory.calls.length, 15); assert.deepEqual(await store.read(), completedRecord);
  checks.push('completed preparation is not reusable as a new preparation or an inference approval');
  const competing = createCandidateVideoIdMemoryRecordV005(), first = dependencies(competing), second = dependencies(competing);
  const outcomes = await Promise.allSettled([executeCandidateVideoIdPreparationMockV005(sources, approval, first.deps),
    executeCandidateVideoIdPreparationMockV005(sources, approval, second.deps)]);
  assert.equal(first.calls.length + second.calls.length, 15);
  assert.equal(outcomes.filter(result => result.status === 'fulfilled' && result.value.status === 'prepared').length, 1);
  assert.equal(inspectCandidateVideoIdPreparationRecordV005((await competing.read())!, sources).prepared, true);
  checks.push('competing starts share one exclusive record creation; only one GET5/count10 sequence can be sent');
  assert.deepEqual(Object.values(sources).map(byteSha), oldSourceHashes);
  assert.deepEqual(await Promise.all(protectedPaths.map(async path => byteSha(await readFile(resolve(workspace, path))))), original);
  let newFormalAfter: string | null = null;
  try { newFormalAfter = byteSha(await readFile(resolve(workspace, CANDIDATE_VIDEO_ID_PROFILE_V005.executionRecordPath))); }
  catch (error) { assert.equal((error as NodeJS.ErrnoException).code, 'ENOENT'); }
  assert.equal(newFormalAfter, newFormalBefore);
  checks.push('all mock records remain in memory, original 4096 bytes and any formal 8192 record stay unchanged');
  process.stdout.write(JSON.stringify({suite: 'task035-8192-preparation-memory', status: 'passed', checks: checks.length,
    proof: checks, actualApiCalls: 0, credentialReads: 0, officialArtifactWrites: 0, temporaryUniquePaths: 0,
    newExperiment: 'task-035', inferenceCalls: 0}) + '\n');
  return {sources, fixture, requests, store, prepared, inputs};
}
async function task035InferenceSuite(context: Awaited<ReturnType<typeof task035PreparationSuite>>) {
  const {sources, fixture, requests, inputs} = context, checks: string[] = [];
  const preparedRecord = (await context.store.read())!, preparedSha = byteSha(preparedRecord);
  const originalSources = Object.values(sources).map(byteSha);
  const protectedPaths = [CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004.inputTable,
    CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004.executionPlan, CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004.executionRecord];
  const protectedBefore = await Promise.all(protectedPaths.map(async path => byteSha(await readFile(resolve(workspace, path)))));
  const reviewContext = {origin: 'mock' as const, experimentId: 'task-035',
    approvalReference: 'mock-only-separate-8192-inference-approval-not-a-live-grant', checkedAt: idV4Now};
  const cacheBillingReview = createCandidateVideoIdCacheBillingReviewV004(reviewContext);
  const usageScalarReview = createCandidateVideoIdUsageScalarReviewV004(reviewContext, cacheBillingReview);
  // Caller-supplied synthetic frame derives from this synthetic preparation;
  // neither the factory nor the live preparation installs a monetary limit.
  const approval = buildCandidateVideoIdInferenceApprovalV005(sources, preparedRecord,
    {approvedBy: 'mock', approvalReference: reviewContext.approvalReference, expectedRecordSha256: preparedSha,
      maximumNanoUsd: context.prepared.proof.referenceCost!.referenceTotalNanoUsd},
    {cacheBillingReview, usageScalarReview});
  type Fault = (value: ReturnType<typeof idV4Envelope>, ordinal: number) => HttpResponse;
  async function memory(options: {fault?: Fault; beforeAppend?: (event: CandidateVideoIdEventV005) => Promise<void>} = {}) {
    const store = createCandidateVideoIdMemoryRecordV005({beforeAppend: options.beforeAppend});
    await store.create(Buffer.from(preparedRecord)); const calls: HttpRequest[] = [];
    const port: HttpPort = {mode: 'mock', async exchange(request) {
      const saved = (await store.read())!, event: CandidateVideoIdEventV005 = JSON.parse(saved.toString('utf8').trimEnd().split('\n').at(-1)!);
      assert.equal(event.stage, 'inference'); assert.equal(event.phase, 'intent');
      const target = requests[calls.length]; assert.ok(target);
      assert.equal(request.method, target.request.method); assert.equal(request.url, target.request.url);
      assert.deepEqual(request.body, bytes(target.request.body));
      assert.equal(candidateVideoDigestV002({method: request.method, url: request.url,
        body: JSON.parse(request.body.toString('utf8'))}), target.exactRequestSha256);
      assert.notEqual(target.exactRequestSha256, fixture.requests[calls.length].exactRequestSha256);
      assert.ok(saved.subarray(0, preparedRecord.length).equals(preparedRecord)); calls.push(request);
      const envelope = idV4Envelope(inputs.find(input => input.itemId === target.itemId)!);
      return options.fault ? options.fault(envelope, calls.length) : {status: 200, headers: {}, body: bytes(envelope)};
    }};
    const deps = {store, port, clock: () => idV4Now,
      containsSecret: (raw: Buffer) => raw.includes(Buffer.from('synthetic-private-key'))};
    return {store, calls, deps, run: (approved = approval) => executeCandidateVideoIdInferenceMockV005(sources, approved, deps)};
  }
  const successful = await memory(), complete = await successful.run();
  assert.equal(complete.status, 'completed'); assert.equal(complete.savedRecordVerifiable, true);
  assert.equal(complete.persistenceFailed, false); assert.equal(complete.actualApiCalls, 0);
  assert.equal(complete.simulatedApiCalls, 10); assert.equal(complete.proof.events.length, 90);
  assert.deepEqual(complete.proof.counts, {metadataGet: 5, countTokens: 10, inference: 10, total: 25});
  assert.equal(complete.proof.targets.every(target => target.consumed && target.acceptance === 'accepted'), true);
  assert.equal(complete.proof.estimatedNanoUsd, '2625000');
  assert.equal(complete.proof.preparationRecordSha256, preparedSha);
  assert.deepEqual(Object.values(sources).map(byteSha), originalSources);
  checks.push('new experiment sends ten unchanged 8192 requests once, independently of ten consumed old requests, retaining the prepared byte prefix and only new fees');
  const completedRecord = (await successful.store.read())!;
  await assert.rejects(() => successful.run()); assert.equal(successful.calls.length, 10);
  assert.deepEqual(await successful.store.read(), completedRecord);
  checks.push('completed new experiment cannot restart or resend any condition');
  const rejected = await memory({fault: (envelope, ordinal) => {
    if (ordinal % 2) { envelope.candidates[0].finishReason = 'MAX_TOKENS';
      delete (envelope.usageMetadata as any).candidatesTokenCount; envelope.usageMetadata.totalTokenCount = 130;
      envelope.candidates[0].content.parts = []; }
    else envelope.candidates[0].content.parts[0].text = '{';
    return {status: 200, headers: {}, body: bytes(envelope)};
  }}), rejectedResult = await rejected.run();
  assert.equal(rejectedResult.status, 'completed'); assert.equal(rejected.calls.length, 10);
  assert.equal(rejectedResult.proof.targets.every(target => target.acceptance === 'rejected' && target.rejection !== null && target.result === null), true);
  assert.equal(rejectedResult.proof.events.filter(event => event.phase === 'response').length, 25);
  assert.equal(rejectedResult.proof.events.filter(event => event.phase === 'usage').length, 10);
  assert.equal(rejectedResult.proof.events.filter(event => event.phase === 'rejected').length, 10);
  assert.equal(rejectedResult.proof.estimatedNanoUsd, '2250000');
  checks.push('ten MAX_TOKENS or invalid-JSON answers persist raw, scalar-normalized usage, fee and rejected outcome then continue without repair or resend');
  const changes: Array<[string, (value: CandidateVideoIdInferenceApprovalV005) => void]> = [
    ['missing fee frame', value => { delete (value as any).maximumNanoUsd; }],
    ['zero fee frame', value => { value.maximumNanoUsd = '0'; }],
    ['old record SHA', value => { value.expectedRecordSha256 = byteSha(sources.previousRecord); }],
    ['old request SHA', value => { value.requests[0].exactRequestSha256 = fixture.requests[0].exactRequestSha256; }],
    ['duplicate condition', value => { value.requests[1] = structuredClone(value.requests[0]); }],
    ['missing condition', value => { value.requests.pop(); }],
    ['same preparation approval', value => { value.approvalReference = context.prepared.proof.approval!.approvalReference; }],
    ['retry requested', value => { (value.executionPolicy as any).retry = 1; }],
    ['repair requested', value => { (value.executionPolicy as any).repair = 1; }],
    ['metadata requested', value => { (value.limits as any).metadataGet = 1; }],
    ['repeated condition allowed', value => { (value.limits as any).perConditionInference = 2; }],
    ['old experiment', value => { (value as any).experimentId = fixture.table.experimentId; }],
    ['source replaced', value => { (value.sources as any).previousRecord.fileSha256 = '0'.repeat(64); }],
    ['different price review context', value => { value.cacheBillingReview.approvalReference = 'other-approval'; }],
    ['live approval with mock source', value => { value.approvedBy = 'kawafmm'; value.origin = 'live'; }]
  ];
  for (const [label, change] of changes) {
    const rejectedApproval = structuredClone(approval); change(rejectedApproval); const run = await memory();
    await assert.rejects(() => run.run(rejectedApproval)); assert.equal(run.calls.length, 0);
    assert.deepEqual(await run.store.read(), preparedRecord); checks.push(`${label}: no simulated send or boundary write`);
  }
  for (const [label, fault] of [
    ['missing usage', (value: any) => { delete value.usageMetadata; return {status: 200, headers: {}, body: bytes(value)}; }],
    ['inconsistent usage total', (value: any) => { value.usageMetadata.totalTokenCount++; return {status: 200, headers: {}, body: bytes(value)}; }],
    ['wrong provider model', (value: any) => { value.modelVersion = 'unapproved-model'; return {status: 200, headers: {}, body: bytes(value)}; }],
    ['HTTP failure', (value: any) => ({status: 503, headers: {}, body: bytes(value)})],
    ['malformed raw', (_value: any) => ({status: 200, headers: {}, body: Buffer.from('{')})],
    ['secret-bearing raw', (_value: any) => ({status: 200, headers: {}, body: Buffer.from('synthetic-private-key')})],
    ['unknown delivery timeout', (_value: any) => { throw new Stage1Timeout(); }]
  ] as const) {
    const run = await memory({fault}), result = await run.run();
    assert.equal(result.status, 'stopped'); assert.equal(run.calls.length, 1);
    assert.equal(result.proof.abnormal, true); assert.equal(result.proof.targets[0].acceptance, 'not-evaluated');
    assert.equal(result.proof.targets.slice(1).every(target => !target.consumed && target.delivery === 'not-sent'), true);
    const saved = (await run.store.read())!; assert.ok(saved.subarray(0, preparedRecord.length).equals(preparedRecord));
    assert.equal(saved.includes(Buffer.from('synthetic-private-key')), false);
    await assert.rejects(() => run.run()); assert.equal(run.calls.length, 1);
    checks.push(`${label}: infrastructure failure stops the experiment permanently after one simulated exchange`);
  }
  for (const phase of ['intent','response','usage','accepted','rejected','complete'] as const) {
    let failed = false;
    const run = await memory({beforeAppend: async event => {
      if (!failed && event.stage === 'inference' && event.phase === phase) { failed = true; throw new Error('synthetic-store-failure'); }
    }, fault: envelope => { if (phase === 'rejected') envelope.candidates[0].finishReason = 'MAX_TOKENS';
      return {status: 200, headers: {}, body: bytes(envelope)}; }});
    const result = await run.run(); assert.equal(result.status, 'stopped'); assert.equal(result.persistenceFailed, true);
    assert.equal(run.calls.length, phase === 'intent' ? 0 : phase === 'complete' ? 10 : 1);
    const saved = (await run.store.read())!; assert.ok(saved.subarray(0, preparedRecord.length).equals(preparedRecord));
    await assert.rejects(() => run.run()); checks.push(`${phase} persistence failure: no later send and no restart`);
  }
  const exceeded = await memory({fault: envelope => {
    envelope.usageMetadata = {promptTokenCount: 100, candidatesTokenCount: 20, thoughtsTokenCount: 100000,
      totalTokenCount: 100120}; return {status: 200, headers: {}, body: bytes(envelope)};
  }}), exceededResult = await exceeded.run();
  assert.equal(exceededResult.status, 'stopped'); assert.equal(exceeded.calls.length, 1);
  assert.ok(BigInt(exceededResult.proof.estimatedNanoUsd) > BigInt(approval.maximumNanoUsd));
  checks.push('observed cost above caller-supplied synthetic frame is saved and prohibits the next condition');
  const sourceChanged = await memory(); let sourceChecks = 0;
  const sourceChangedResult = await executeCandidateVideoIdInferenceMockV005(sources, approval,
    {...sourceChanged.deps, verifySources: async () => {
      sourceChecks++; if (sourceChecks > 1) return {...sources, previousRecord: Buffer.from('{}\n')}; return sources;
    }});
  assert.equal(sourceChangedResult.status, 'stopped'); assert.equal(sourceChanged.calls.length, 0);
  checks.push('source rebind before send stops without transmitting any new inference');
  const mixed = await memory();
  await assert.rejects(() => executeCandidateVideoIdInferenceMockV005(sources, approval,
    {...mixed.deps, port: {...mixed.deps.port, mode: 'live'}}));
  await assert.rejects(() => executeCandidateVideoIdInferenceMockV005(sources, approval,
    {...mixed.deps, store: {...mixed.store}})); assert.equal(mixed.calls.length, 0);
  checks.push('live ports and unbranded memory record sinks rejected before all callbacks');
  const corruptions: Array<[string, (events: CandidateVideoIdEventV005[]) => void]> = [
    ['old wire cap', events => { events[49].detail.exactRequest.body.generationConfig.maxOutputTokens = 4096; }],
    ['duplicate consumed intent', events => { events.splice(53, 0, structuredClone(events[49])); }],
    ['unapproved continuation boundary', events => { events.splice(53, 0, structuredClone(events[48])); }],
    ['fee removed', events => { events[51].detail.usage.estimatedNanoUsd = null; }],
    ['premature completion', events => { events.splice(53, events.length - 54); }],
    ['unknown trailing event', events => { events.push({...structuredClone(events.at(-1)!), phase: 'unexpected'} as any); }]
  ];
  const rechain = (events: CandidateVideoIdEventV005[]) => {
    let previous: string | null = null;
    for (const [index, event] of events.entries()) { event.sequence = index + 1; event.previousSha256 = previous;
      const {sha256: _sha, ...content} = event; event.sha256 = candidateVideoDigestV002(content); previous = event.sha256; }
    return Buffer.concat(events.map(bytes));
  };
  for (const [label, change] of corruptions) {
    const events: CandidateVideoIdEventV005[] = completedRecord.toString('utf8').trimEnd().split('\n').map(line => JSON.parse(line));
    change(events); assert.throws(() => inspectCandidateVideoIdExecutionRecordV005(rechain(events), sources));
    checks.push(`${label}: rehashed forged history rejected`);
  }
  assert.deepEqual(Object.values(sources).map(byteSha), originalSources);
  assert.deepEqual(await Promise.all(protectedPaths.map(async path => byteSha(await readFile(resolve(workspace, path))))), protectedBefore);
  checks.push('all new inference fixtures stay in memory and old source/record bytes remain unchanged');
  process.stdout.write(JSON.stringify({suite: 'task035-8192-future-inference-memory', status: 'passed', checks: checks.length,
    proof: checks, actualApiCalls: 0, credentialReads: 0, officialArtifactWrites: 0, temporaryUniquePaths: 0,
    liveInferenceApproved: false, liveInferenceExpenseFrameCreated: false}) + '\n');
}
if (process.argv.includes('--task035-inference-memory-only')) {
  await task035InferenceSuite(await task035PreparationSuite()); process.exit(0);
}
if (process.argv.includes('--task035-memory-only')) { await task035PreparationSuite(); process.exit(0); }
if (process.argv.includes('--task033-memory-only')) { await task033Suite(); process.exit(0); }
if (process.argv.includes('--task032-memory-only')) { await task032Suite(); process.exit(0); }
if (process.argv.includes('--task030-memory-only')) { task029BillingOnlySuite(); await idV4Suite(true); process.exit(0); }
if (!process.argv.includes('--artifact-draft') && !process.argv.includes('--verify-artifacts')) await idV4Suite();
if (process.argv.includes('--id-v004-only')) process.exit(0);
const jobs = await loadPreparationJobs(workspace);
const FIXED_MEDIA_SHAS = [
  'd863d7c2c6983e2b9122b22cc961b1717f7b0a85c4e3cde38bb1b5c5333d6d83',
  '39b90cab250782907653fc09501fb3a5b329b345f2957fa0e38d34e07b02fb63',
  '9a10f19a55824177c85b94477ab6c3d01f2af7a3ab498834c22c5b607e915e56',
  'a42fef7ecfe12bba207f47aed83582c459ebb70084830a070450fed2db31480d',
  '0b6b4134fb242fd70eb682f0c6bc9b6fe1af01851053818c79838d543904e5e0'];
const FIXED_MAP_SHAS = [
  '529a167addd6f5b5eb5fe61e882d3195605f9809cd7aaeaa97d6680c5c65f1a8',
  '14dcb2bf73c7ac1d13b7d03ac1862ee3363d1ed94eb2bf601e9bf4b567a5ec43',
  '54f57cba6c43cd64c591e66f5c33e1cf33d62b557c56503790da917399b78044',
  'adad741947841f43397987368389c81c7f86a1e9c1709a2b6fc00b30cbfdb809',
  '1e132d4127f6ec496ae47d8e4f8e01e50cc5f74f0ec5a1848c0522a1767673d5'];
const proof: string[] = [];
function pass(name: string, fn: () => void) { fn(); proof.push(name); }
function output(job: CandidateVideoJobV002): CandidateVideoOutputV002 {
  return {schemaVersion: 'candidate-video-understanding-provider-output-v002', itemId: job.itemId,
    status: 'answered', summary: 'Synthetic observations, never a human evaluation.',
    roleObservations: CANDIDATE_VIDEO_ROLE_VALUES_V001.map((role, i) => ({role, status: 'observed',
      intervals: [{observationId: `observation-${String(i + 1).padStart(3, '0')}`,
        startTimeMs: 1000 + i * 500, endTimeMs: 1800 + i * 500,
        factualDescription: 'Synthetic visible event.', evidenceModalities: ['video', 'audio']}],
      factualDescription: 'Synthetic role observation.'})),
    visualCautions: [], insufficientEvidence: {present: false, missingEvidence: [], factualDescription: 'Synthetic sufficient evidence.'}};
}
function envelope(job: CandidateVideoJobV002) {
  return {modelVersion: 'gemini-3.8-flash', candidates: [{finishReason: 'STOP',
    content: {role: 'model', parts: [{text: JSON.stringify(output(job))}]}}],
    usageMetadata: {promptTokenCount: 100, candidatesTokenCount: 20, thoughtsTokenCount: 30, totalTokenCount: 150}};
}
const mockBytes = Buffer.from('synthetic video byte fixture, not an actual movie');
const mockJobs = jobs.map(job => {
  const clone = structuredClone(job);
  clone.bindings.explorationVideo.fileSha256 = byteSha(mockBytes);
  return clone;
});
type Fault = (request: HttpRequest, ordinal: number, response: HttpResponse) => HttpResponse;
function mockPort(fault?: Fault) {
  const calls: HttpRequest[] = [];
  let currentItem = '';
  const port: HttpPort = {mode: 'mock', async exchange(req) {
    calls.push(structuredClone(req));
    let response: HttpResponse = {status: 200, headers: {}, body: bytes({})};
    if (req.url.endsWith('/upload/v1beta/files')) {
      currentItem = JSON.parse(req.body.toString()).file.display_name;
      assert.match(currentItem, /^item-000[1-5]$/u);
      assert.equal(JSON.stringify(req.headers).includes('File-Name'), false);
      response.headers['x-goog-upload-url'] = `https://generativelanguage.googleapis.com/upload/mock-${currentItem}?upload_id=synthetic-memory-only`;
    } else if (req.headers['X-Goog-Upload-Offset'] === '0') {
      assert.deepEqual(req.body, mockBytes);
      response.body = bytes({file: {name: `files/${currentItem}`,
        sha256Hash: Buffer.from(byteSha(mockBytes), 'hex').toString('base64')}});
    } else if (req.method === 'GET') {
      response.body = bytes({name: `files/${currentItem}`, uri: `https://generativelanguage.googleapis.com/v1beta/files/${currentItem}`,
        displayName: currentItem, state: 'ACTIVE', mimeType: 'video/mp4', sizeBytes: String(mockBytes.length),
        sha256Hash: Buffer.from(byteSha(mockBytes), 'hex').toString('base64')});
    } else if (req.url.endsWith(':countTokens')) {
      response.body = bytes({totalTokens: 100});
    } else {
      const parsed = JSON.parse(req.body.toString());
      const item = parsed.generationConfig.responseJsonSchema.properties.itemId.enum[0];
      response.body = bytes(envelope(mockJobs.find(j => j.itemId === item)!));
    }
    return fault ? fault(req, calls.length, response) : response;
  }};
  return {port, calls};
}
async function prepareFive(transport: CandidateVideoTransport) {
  const measured = [];
  for (const job of mockJobs) measured.push(await transport.prepare(job, mockBytes));
  return measured;
}
const journal: JournalEvent[] = [];
const normal = mockPort();
const transport = new CandidateVideoTransport(normal.port, async event => { journal.push(structuredClone(event)); }, () => '2026-09-05T00:00:00.000Z');
const measured = await prepareFive(transport);
pass('upload-count-phase-exactly-20-no-inference', () => {
  assert.equal(normal.calls.length, 20);
  assert.equal(transport.snapshot.counts.inference, 0);
  measured.forEach(m => { assert.equal(m.status, 'mock-only-not-ready'); assert.equal(m.exactRequestSha256, null); });
});
const results = await transport.inferAll({approvedBy: 'mock', exactRequestSha256s: measured.map(m => m.mockExactRequestSha256!)});
pass('normal-25-ordered-communications-and-budget', () => {
  assert.equal(normal.calls.length, 25);
  for (const op of HTTP_OPERATIONS) assert.equal(transport.snapshot.counts[op], 5);
  const operations = journal.filter(e => e.phase === 'intent').map(e => e.operation);
  assert.deepEqual(operations, [...Array.from({length: 5}, () => HTTP_OPERATIONS.slice(0, 4)).flat(), ...Array(5).fill('inference')]);
  assert.equal(results.length, 5);
  assert.equal(transport.snapshot.formallyReady, false);
});
pass('exact-count-inference-body-equivalence', () => {
  for (let i = 0; i < 5; i++) {
    const c = JSON.parse(Buffer.from(normal.calls[i * 4 + 3].body).toString()).generateContentRequest;
    const inference = JSON.parse(Buffer.from(normal.calls[20 + i].body).toString());
    assert.equal(c.model, 'models/gemini-3.8-flash');
    delete c.model;
    assert.deepEqual(c, inference);
  }
});
pass('journal-chain-secret-exclusion-and-tampering', () => {
  assertJournal(journal);
  assert.equal(JSON.stringify(journal).includes('upload_id'), false);
  for (const event of journal) {
    const detail = event.detail as any;
    for (const key of ['bodyBase64', 'rawResponseBase64']) if (detail[key]) {
      assert.equal(Buffer.from(detail[key], 'base64').toString().includes('synthetic-memory-only'), false);
    }
  }
  const altered = structuredClone(journal); altered[0].itemId = 'item-0005';
  assert.throws(() => assertJournal(altered));
  const rehashed = structuredClone(journal);
  (rehashed[0].detail as any).bodySha256 = '0'.repeat(64);
  rehashed.forEach((e, i) => {
    e.previousSha256 = i === 0 ? null : rehashed[i - 1].sha256;
    const {sha256: _old, ...content} = e; e.sha256 = candidateVideoDigestV002(content);
  });
  assert.throws(() => assertJournal(rehashed), /journal-request-bytes-mismatch/u);
});
await assert.rejects(() => transport.inferAll({approvedBy: 'mock', exactRequestSha256s: measured.map(m => m.mockExactRequestSha256!)}));
await assert.rejects(() => transport.prepare(mockJobs[0], mockBytes));
pass('budget-overflow-and-reexecution-never-send', () => assert.equal(normal.calls.length, 25));

const faults: Array<[string, number, Fault]> = [
  ['metadata-not-ACTIVE', 3, (_r, n, r) => n === 3 ? {...r, body: bytes({...JSON.parse(r.body.toString()), state: 'PROCESSING'})} : r],
  ['redirect', 1, (_r, n, r) => n === 1 ? {...r, status: 307, headers: {location: 'https://example.invalid'}} : r],
  ['timeout', 2, (_r, n, r) => { if (n === 2) throw new Error('timeout'); return r; }],
  ['send-outcome-unknown', 2, (_r, n, r) => { if (n === 2) throw new Error('send-outcome-unknown'); return r; }],
  ['URI-item-mismatch', 3, (_r, n, r) => n === 3 ? {...r, body: bytes({...JSON.parse(r.body.toString()), uri: 'https://generativelanguage.googleapis.com/v1beta/files/wrong'})} : r],
  ['provider-SHA-mismatch', 3, (_r, n, r) => n === 3 ? {...r, body: bytes({...JSON.parse(r.body.toString()), sha256Hash: 'wrong'})} : r],
  ['credential-like-response', 2, (_r, n, r) => n === 2 ? {...r, body: bytes({authorization: 'synthetic-secret'})} : r],
  ['count-failure-no-settings-downgrade', 4, (_r, n, r) => n === 4 ? {...r, status: 400} : r],
  ['untrusted-session-host', 1, (_r, n, r) => n === 1 ? {...r, headers: {'x-goog-upload-url': 'https://example.invalid/upload/private'}} : r],
  ['non-HTTPS-session', 1, (_r, n, r) => n === 1 ? {...r, headers: {'x-goog-upload-url': 'http://generativelanguage.googleapis.com/upload/private'}} : r],
  ['session-echo-in-body', 1, (_r, n, r) => n === 1 ? {...r, body: bytes({echo: r.headers['x-goog-upload-url']})} : r],
  ['metadata-extra-poll-forbidden', 3, (_r, n, r) => n === 3 ? {...r, body: bytes({...JSON.parse(r.body.toString()), state: 'FAILED'})} : r]
];
for (const [name, count, fault] of faults) {
  const m = mockPort(fault);
  const t = new CandidateVideoTransport(m.port, async () => {}, () => '2026-09-05T00:00:00.000Z');
  await assert.rejects(() => t.prepare(mockJobs[0], mockBytes));
  await assert.rejects(() => t.prepare(mockJobs[0], mockBytes));
  pass(name + '-terminal-no-retry', () => {
    assert.equal(m.calls.length, count);
    assert.equal(t.snapshot.stopped, true);
    assert.equal(t.snapshot.events.at(-1)?.phase, 'failure');
    assertJournal(t.snapshot.events);
    assert.equal(JSON.stringify(t.snapshot).includes('synthetic-secret'), false);
  });
}
{
  const m = mockPort();
  const t = new CandidateVideoTransport(m.port, async () => {}, () => '2026-09-05T00:00:00.000Z');
  await assert.rejects(() => t.prepare(mockJobs[0], Buffer.from('wrong-byte')));
  pass('local-media-SHA-mismatch-zero-send', () => assert.equal(m.calls.length, 0));
}
{
  const m = mockPort();
  const t = new CandidateVideoTransport(m.port, async () => { throw new Error('synthetic disk failure'); }, () => '2026-09-05T00:00:00.000Z');
  await assert.rejects(() => t.prepare(mockJobs[0], mockBytes));
  pass('durable-intent-failure-zero-send', () => assert.equal(m.calls.length, 0));
}
for (const key of ['humanReviewPath', 'humanReviewSha256', 'humanDisposition', 'humanReason', 'truthInterval',
  'candidateId', 'filename', 'baselineResult', 'lunaResult', 'sourceTime', 'transcript']) {
  pass('provider-allowlist-rejects-' + key, () => {
    const template = buildCandidateVideoRequestTemplateV002(jobs[0]);
    assert.throws(() => assertProviderRequestAllowlist(jobs[0], {...template.body, [key]: 'synthetic-only'}, null));
    const nested = structuredClone(template.body) as any;
    nested.contents[0].parts[0][key] = 'synthetic-only';
    assert.throws(() => assertProviderRequestAllowlist(jobs[0], nested, null));
  });
}
pass('descriptive-item-or-prompt-mutation-rejected', () => {
  const body = buildCandidateVideoRequestTemplateV002(jobs[0]).body;
  body.contents[0].parts[1].text += '\nHuman accepted: synthetic.';
  assert.throws(() => assertProviderRequestAllowlist(jobs[0], body, null));
  const bad = {...jobs[0], itemId: 'item-good-video'};
  assert.throws(() => buildCandidateVideoRequestTemplateV002(bad));
});
pass('unsafe-file-URI-rejected', () => {
  for (const uri of ['https://example.invalid/v1beta/files/x', 'http://generativelanguage.googleapis.com/v1beta/files/x',
    'https://generativelanguage.googleapis.com/v1beta/files/x?secret=x']) assert.throws(() => buildExactRequest(jobs[0], uri));
});
const outputFaults: Array<[string, (e: any) => void]> = [
  ['status-contradiction', e => { e.status = 'partial'; }],
  ['role-order', e => { e.roleObservations.reverse(); }],
  ['reversed-time', e => { e.roleObservations[0].intervals[0].endTimeMs = 0; }],
  ['out-of-video', e => { e.roleObservations[0].intervals[0].endTimeMs = 999999; }],
  ['extra-field', e => { e.finalDecision = true; }],
  ['notObserved-with-interval', e => { e.roleObservations[0].status = 'notObserved'; }]
];
for (const [name, mutate] of outputFaults) {
  const m = mockPort((_request, n, r) => {
    if (n !== 21) return r;
    const e = envelope(mockJobs[0]); const p = output(mockJobs[0]); mutate(p);
    e.candidates[0].content.parts[0].text = JSON.stringify(p);
    return {...r, body: bytes(e)};
  });
  const t = new CandidateVideoTransport(m.port, async () => {}, () => '2026-09-05T00:00:00.000Z');
  const measured = await prepareFive(t);
  const approval = {approvedBy: 'mock' as const, exactRequestSha256s: measured.map(m => m.mockExactRequestSha256!)};
  await assert.rejects(() => t.inferAll(approval));
  await assert.rejects(() => t.inferAll(approval));
  pass('inference-transport-stops-' + name, () => {
    assert.equal(m.calls.length, 21);
    assert.equal((t.snapshot.events.at(-1)?.detail as any).category, 'local-validation-failure');
    assertJournal(t.snapshot.events);
  });
}
for (const [name, mutate] of outputFaults) pass('strict-output-' + name, () => {
  const e = envelope(jobs[0]);
  const p = output(jobs[0]); mutate(p);
  e.candidates[0].content.parts[0].text = JSON.stringify(p);
  assert.throws(() => parseInference(bytes(e), jobs[0], 'a'.repeat(64)));
});
pass('provider-JSON-malformed', () => {
  assert.throws(() => parseInference(Buffer.from('{'), jobs[0], 'a'.repeat(64)));
  const e = envelope(jobs[0]); e.candidates[0].content.parts[0].text = '{';
  assert.throws(() => parseInference(bytes(e), jobs[0], 'a'.repeat(64)));
  const missingUsage = envelope(jobs[0]) as any; delete missingUsage.usageMetadata;
  assert.throws(() => parseInference(bytes(missingUsage), jobs[0], 'a'.repeat(64)), /provider-schema-failure/u);
});
pass('thinking-charged-in-estimate-and-provider-ID-not-invented', () => {
  const r = parseInference(bytes(envelope(jobs[0])), jobs[0], 'a'.repeat(64));
  assert.equal(r.providerResponseId, null);
  assert.equal(r.cost.totalNanoUsd, '262500');
  assert.deepEqual(r.usage, {input: 100, output: 20, thinking: 30});
  assert.equal(estimateUsageCost({input: 0, output: 0, thinking: 100}).totalNanoUsd, '375000');
});
pass('fixed-five-media-and-map-bindings', () => {
  assert.deepEqual(jobs.map(j => j.bindings.explorationVideo.fileSha256), FIXED_MEDIA_SHAS);
  assert.deepEqual(jobs.map(j => j.bindings.mapping.fileSha256), FIXED_MAP_SHAS);
});
const semanticBinding = {
  path: 'evals/clip_composition/outputs/work-distant-connection-semantic-utterance-ymUsGrT6EaA-v001/semantic-utterance-artifact-v001.json',
  schemaVersion: 'semantic-utterance-artifact-v001', fileSha256: 'e4eb9657994df2814c398a47e751e91d973db28c9ce674dc16f6eaea71f7ffd2'};
const semantic = await readFile(resolve(workspace, semanticBinding.path));
const boundaries = extractCandidateVideoSpeechBoundariesFromSemanticArtifactV001(semantic, semanticBinding);
const points = [[664354,1412798],[1680130,4398688],[1731997,5698719],[249378,1984756],[249378,6134433]];
pass('baseline-and-exploration-recomputed-from-points-and-STT-only', () => {
  jobs.forEach((job, n) => {
    const windows = buildCandidateVideoSeparatedComparisonWindowsV002(points[n].map((sourceTimeMs, i) => ({locusId: `locus-${i + 1}`, sourceTimeMs})), boundaries);
    const intervals = (w: Array<{startTimeMs: number; endTimeMs: number}>) => w.map(({startTimeMs, endTimeMs}) => ({startTimeMs, endTimeMs}));
    assert.deepEqual(intervals(windows.freeHumanBaselineWindows), job.freeBaselineWindow.sourceIntervals);
    assert.deepEqual(intervals(windows.geminiExplorationWindows), job.geminiExplorationWindow.sourceIntervals);
  });
});
const fileVerification = await verifyBoundBytes(workspace, jobs);
proof.push('all-source-media-map-build-byte-SHAs-verified-read-only');

// Stage 1 uses only in-memory synthetic fixtures here; formal paths remain unused until live execution.
const stage1Proof: string[] = [];
async function stage1Mock(fault?: Fault, persistenceFailureAt?: number, scope?: 'item-0001-finalize-diagnostic' | 'item-0001-upload-and-count' | 'remaining-four-upload-and-count') {
  const m = mockPort(fault); const persisted: Stage1Event[] = []; const waits: number[] = [];
  let appends = 0;
  const target = scope === 'remaining-four-upload-and-count' ? mockJobs.slice(1) : scope === 'item-0001-upload-and-count' ? [mockJobs[0]] : mockJobs;
  const result = await executeStage1(target, {mode: 'mock', manifestSha256: 'a'.repeat(64), scope,
    clock: () => '2026-09-05T00:00:00.000Z', media: async () => mockBytes,
    append: async e => { if (++appends === persistenceFailureAt) throw new Error('Authorization: synthetic-persistence-secret'); persisted.push(structuredClone(e)); },
    wait: async ms => { waits.push(ms); }, exchange: async (request, operation) => {
      const intent = persisted.at(-1)!;
      assert.equal(intent.phase, 'intent'); assert.equal(intent.operation, operation);
      assert.equal(intent.detail.counter, m.calls.length + 1);
      assert.equal(intent.detail.timeoutMs, STAGE1_TIMEOUTS[operation]);
      assert.equal(request.url.includes(':generateContent'), false);
      if (operation === 'metadata-get') assert.equal(waits.length, Math.floor(m.calls.length / 4) + 1);
      return m.port.exchange(request);
    }});
  validateStage1Journal(persisted);
  return {result, persisted, calls: m.calls, waits};
}
{
  const s = await stage1Mock();
  assert.equal(s.result.failure, null); assert.equal(s.result.actualStartedHttp, 20);
  assert.equal(s.result.allFiveInputTokens, 500); assert.equal(s.result.fiveInferenceInputCostNanoUsd, '375000');
  assert.equal(s.result.inference, 0); assert.deepEqual(s.waits, [60000,60000,60000,60000,60000]);
  assert.equal(JSON.stringify(s.persisted).includes('upload_id'), false);
  assert.equal(JSON.stringify(s.persisted).includes('headers'), false);
  s.result.items.forEach(i => { assert.ok(i.exactInference); assert.ok(i.countTokensRequestSha256); });
  stage1Proof.push('20 sends after persisted intent; five fixed waits; exact requests; token/cost measurement; inference zero');
}
const sha256Proof: string[] = [];
for (const [operation, ordinal] of [['upload-finalize', 2], ['metadata-get', 3]] as const) {
  const normal = await stage1Mock();
  const responseEvents = normal.persisted.filter(e => e.phase === 'response' && e.operation === operation);
  assert.equal(responseEvents.length, 5);
  for (const event of responseEvents) {
    assert.deepEqual(event.detail.sha256Validation, {status: 'passed', reason: null});
    assert.equal(Object.hasOwn(event.detail.fields, 'sha256Hash'), false);
    assert.equal(event.detail.sha256Diagnostics.digestMatchResult, 'matched');
    assert.equal(event.detail.sha256Diagnostics.encodedLengthChars, 44);
    assert.equal(event.detail.sha256Diagnostics.firstDecodedLengthBytes, 32);
    assert.equal(event.detail.sha256Diagnostics.expectedShapeMatched, true);
  }
  assert.equal(normal.result.failure, null);
  sha256Proof.push(operation + ': normal, byte equality verified without retaining SHA for all five items');

  const canonical = Buffer.from(byteSha(mockBytes), 'hex').toString('base64');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const nonzeroPadBits = canonical.slice(0, -2) + alphabet[alphabet.indexOf(canonical.at(-2)!) + 1] + '=';
  const cases: Array<[string, string, (file: Record<string, unknown>) => void]> = [
    ['missing', 'sha256-missing', f => { delete f.sha256Hash; }],
    ['invalid-character', 'sha256-invalid-base64', f => { f.sha256Hash = '!'.repeat(43) + '='; }],
    ['null', 'sha256-invalid-base64', f => { f.sha256Hash = null; }],
    ['non-string', 'sha256-invalid-base64', f => { f.sha256Hash = 123; }],
    ['whitespace', 'sha256-invalid-base64', f => { f.sha256Hash = canonical + '\n'; }],
    ['missing-padding', 'sha256-invalid-base64', f => { f.sha256Hash = canonical.slice(0, -1); }],
    ['extra-padding', 'sha256-invalid-base64', f => { f.sha256Hash = canonical + '='; }],
    ['nonzero-pad-bits', 'sha256-invalid-base64', f => { f.sha256Hash = nonzeroPadBits; }],
    ['length-zero', 'sha256-invalid-length', f => { f.sha256Hash = ''; }],
    ['length-31', 'sha256-invalid-length', f => { f.sha256Hash = Buffer.alloc(31).toString('base64'); }],
    ['length-33', 'sha256-invalid-length', f => { f.sha256Hash = Buffer.alloc(33).toString('base64'); }],
    ['byte-mismatch', 'sha256-mismatch', f => { f.sha256Hash = Buffer.alloc(32).toString('base64'); }],
    ['secret-in-field', 'sha256-invalid-base64', f => { f.sha256Hash = 'Authorization: synthetic-sha-secret'; }]
  ];
  for (const [name, reason, mutate] of cases) {
    let responseBody!: Buffer;
    const fault: Fault = (_request, n, r) => {
      if (n !== ordinal) return r;
      const body = JSON.parse(r.body.toString('utf8'));
      mutate(operation === 'upload-finalize' ? body.file : body);
      responseBody = bytes(body);
      return {...r, body: responseBody};
    };
    const s = await stage1Mock(fault);
    assert.equal(s.result.failure?.reason, reason);
    assert.equal(s.result.failure?.category, operation === 'upload-finalize' ? 'upload-finalize-failure' : 'metadata-integrity-mismatch');
    assert.equal(s.result.failure?.operation, operation);
    assert.equal(s.result.failure?.deliveryState, 'response-received');
    assert.equal(s.result.failure?.timeout, false);
    const response = s.persisted.find(e => e.phase === 'response' && e.operation === operation)!;
    assert.deepEqual(response.detail.sha256Validation, {status: 'failed', reason});
    assert.equal(Object.hasOwn(response.detail.fields, 'sha256Hash'), false);
    assert.equal(response.detail.responsePayloadSha256, byteSha(responseBody));
    assert.equal(response.detail.byteCount, responseBody.length);
    assert.equal(response.detail.httpStatus, 200);
    assert.equal(s.persisted.at(-1)?.phase, 'failure');
    assert.deepEqual(s.persisted.at(-1)?.detail, s.result.failure);
    assert.equal(s.calls.length, ordinal);
    assert.equal(s.result.actualStartedHttp, ordinal);
    assert.equal(s.result.reservedHttp, ordinal);
    assert.equal(s.result.items[0].operations.at(-1)?.failed, 1);
    assert.equal(s.result.items[0].operations.at(-1)?.completed, 0);
    assert.ok(s.result.items.slice(1).every(i => i.status === 'not-attempted'));
    assert.ok(s.result.items.every(i => i.inputTokens === null));
    assert.equal(s.result.allFiveInputTokens, null);
    assert.deepEqual(s.waits, operation === 'upload-finalize' ? [] : [60000]);
    assert.equal(s.result.inference + s.result.retry + s.result.repair + s.result.extraPoll, 0);
    assert.equal(JSON.stringify(s.result).includes('synthetic-sha-secret'), false);
    assert.equal(JSON.stringify(s.persisted).includes('synthetic-sha-secret'), false);
    sha256Proof.push(operation + ': ' + name + ' -> ' + reason + ', persisted before terminal stop');
  }
  // Even on a bad digest, a failed response append remains a persistence failure;
  // the validator must not mask it or send the next request.
  const p = await stage1Mock((_req, n, r) => {
    if (n !== ordinal) return r;
    const body = JSON.parse(r.body.toString());
    delete (operation === 'upload-finalize' ? body.file : body).sha256Hash;
    return {...r, body: bytes(body)};
  }, operation === 'upload-finalize' ? 5 : 8);
  assert.equal(p.result.failure?.category, 'local-persistence-failure');
  assert.equal(p.result.failure?.reason, 'classified-without-exception-text');
  assert.equal(p.calls.length, ordinal);
  assert.equal(p.persisted.at(-1)?.phase, 'intent');
  sha256Proof.push(operation + ': response persistence failure stops without masking or retry');
}
process.stdout.write(JSON.stringify({suite:'stage1-sha256-before-save',status:'passed',checks:sha256Proof.length,proof:sha256Proof,liveHttp:0})+'\n');
const diagnosticProof: string[] = [];
const diagnosticKeys = ['expectedJsonPath','selectedJsonPath','selectedFileObject','expectedShapeMatched',
  'fieldPresent','fieldType','encodedLengthChars','firstDecodedLengthBytes','finalDigestLengthBytes','sha256Representation','canonicalSha256Base64Length',
  'decodedSha256Length','base64ValidationResult','digestMatchResult','hasPadding','looksHexOnly','decodedLooksHexOnly'].sort();
for (const [operation, ordinal, path] of [['upload-finalize',2,'$.file.sha256Hash'],['metadata-get',3,'$.sha256Hash']] as const) {
  const cases: Array<[string, unknown, number | null, number | null, string, string, string | null]> = [
    ['normal',Buffer.from(byteSha(mockBytes),'hex').toString('base64'),44,32,'passed','matched',null],
    ['base64-64-chars','G+/Z'.repeat(16),64,48,'passed','not-checked','sha256-invalid-length'],
    ['hex-only-64-chars','a'.repeat(64),64,48,'passed','not-checked','sha256-invalid-length'],
    ['base64-of-hex',Buffer.from('a'.repeat(64)).toString('base64'),88,64,'passed','mismatched','sha256-mismatch'],
    ['missing',undefined,null,null,'not-checked','not-checked','sha256-missing'],
    ['non-string',{secret:'synthetic-diagnostic-secret'},null,null,'failed','not-checked','sha256-invalid-base64'],
    ['invalid-base64','Authorization: synthetic-diagnostic-secret',42,null,'failed','not-checked','sha256-invalid-base64'],
    ['wrong-length',Buffer.alloc(31).toString('base64'),44,31,'passed','not-checked','sha256-invalid-length'],
    ['mismatch',Buffer.alloc(32).toString('base64'),44,32,'passed','mismatched','sha256-mismatch']
  ];
  for (const [name,value,encoded,decoded,base64Result,match,reason] of cases) {
    const s = await stage1Mock((_req,n,r) => {
      if (n !== ordinal) return r;
      const root = JSON.parse(r.body.toString()); const file = operation === 'upload-finalize' ? root.file : root;
      if (value === undefined) delete file.sha256Hash; else file.sha256Hash = value;
      return {...r, body:bytes(root)};
    });
    const e = s.persisted.find(e => e.phase === 'response' && e.operation === operation)!;
    const d = e.detail.sha256Diagnostics;
    assert.deepEqual(Object.keys(d).sort(), diagnosticKeys);
    assert.equal(d.expectedJsonPath,path); assert.equal(d.selectedJsonPath,value === undefined ? 'missing' : path);
    assert.equal(d.expectedShapeMatched,true); assert.equal(d.fieldPresent,value !== undefined);
    assert.equal(d.fieldType,value === undefined ? 'missing' : typeof value === 'string' ? 'string' : 'non-string');
    assert.equal(d.encodedLengthChars,encoded); assert.equal(d.firstDecodedLengthBytes,decoded);
    assert.equal(d.canonicalSha256Base64Length,encoded === 44); assert.equal(d.decodedSha256Length,decoded === 32);
    assert.equal(d.base64ValidationResult,base64Result); assert.equal(d.digestMatchResult,match);
    assert.equal(d.looksHexOnly,typeof value === 'string' ? /^[a-fA-F0-9]+$/u.test(value) : null);
    if (name === 'base64-of-hex') assert.equal(d.decodedLooksHexOnly,true);
    assert.equal(s.result.failure?.reason ?? null,reason);
    assert.equal(JSON.stringify(s.persisted).includes('synthetic-diagnostic-secret'),false);
    assert.equal(Object.hasOwn(e.detail.fields,'sha256Hash'),false);
    if (typeof value === 'string') {
      assert.equal(JSON.stringify(d).includes(value),false);
      assert.equal(JSON.stringify(d).includes(byteSha(Buffer.from(value))),false);
    }
    diagnosticProof.push(operation+': '+name+' diagnostic fields and approved representation reason');
  }
  const alternate = await stage1Mock((_req,n,r) => {
    if (n !== ordinal) return r;
    const root = JSON.parse(r.body.toString());
    return {...r,body:bytes(operation === 'upload-finalize' ? root.file : {file:root})};
  });
  const d = alternate.persisted.find(e=>e.phase==='response'&&e.operation===operation)!.detail.sha256Diagnostics;
  assert.equal(d.expectedShapeMatched,false);
  assert.equal(d.selectedJsonPath,operation === 'upload-finalize' ? '$.sha256Hash' : '$.file.sha256Hash');
  assert.equal(alternate.result.failure,null);
  diagnosticProof.push(operation+': unexpected shape diagnosed without changing acceptance semantics');
}
{
  const diagnostics = [];
  for (const value of ['G+/Z'.repeat(16),'H+/Z'.repeat(16)]) {
    const s = await stage1Mock((_req,n,r) => n === 2 ? {...r,body:bytes({file:{...JSON.parse(r.body.toString()).file,sha256Hash:value}})} : r);
    diagnostics.push(s.persisted.find(e=>e.phase==='response'&&e.operation==='upload-finalize')!.detail.sha256Diagnostics);
  }
  assert.deepEqual(diagnostics[0],diagnostics[1]);
  diagnosticProof.push('distinct synthetic SHA values yield identical diagnostics: values cannot be uniquely recovered');
}
for (const kind of ['normal','missing','timeout-start','timeout-finalize','http-failure'] as const) {
  const s = await stage1Mock((_req,n,r) => {
    if ((kind === 'timeout-start' && n === 1) || (kind === 'timeout-finalize' && n === 2)) throw new Stage1Timeout();
    if (n !== 2) return r;
    if (kind === 'http-failure') return {...r,status:500};
    if (kind === 'missing') return {...r,body:bytes({file:{name:'files/item-0001'}})};
    return r;
  }, undefined, 'item-0001-finalize-diagnostic');
  assert.equal(s.calls.length,kind === 'timeout-start' ? 1 : 2);
  assert.deepEqual(s.waits,[]); assert.equal(s.result.allFiveInputTokens,null);
  assert.ok(s.result.items.slice(1).every(i=>i.status==='not-attempted'));
  assert.ok(s.result.items.every(i=>i.exactInference === null && i.inputTokens === null));
  assert.equal(s.persisted[0].detail.maximumHttp,2);
  assert.equal(s.result.retry+s.result.repair+s.result.inference+s.result.extraPoll,0);
  if (kind === 'normal') { assert.equal(s.result.failure,null); assert.equal(s.result.status,'diagnostic-complete-no-metadata-or-inference'); }
  else assert.ok(s.result.failure);
  diagnosticProof.push('two-request diagnostic scope: '+kind+' stops before wait/metadata/other items');
}
process.stdout.write(JSON.stringify({suite:'sha256-diagnostics',status:'passed',checks:diagnosticProof.length,proof:diagnosticProof,liveHttp:0})+'\n');
const representationProof: string[] = [];
const localHex = byteSha(mockBytes);
const encodeText = (text: string) => Buffer.from(text,'utf8').toString('base64');
const highBitHex = Buffer.alloc(64,0xb1); // ASCII conversion alone would incorrectly mask these bytes to '1'.
const representationCases: Array<[string,string,string,string|null,number|null,number|null]> = [
  ['raw-digest',Buffer.from(localHex,'hex').toString('base64'),'raw-digest-base64',null,32,32],
  ['lowercase-hex',encodeText(localHex),'hex-text-base64',null,64,32],
  ['uppercase-hex',encodeText(localHex.toUpperCase()),'hex-text-base64',null,64,32],
  ['nonhex-64',encodeText('g'.repeat(64)),'unsupported','sha256-invalid-hex',64,null],
  ['hex-63',encodeText(localHex.slice(0,63)),'unsupported','sha256-invalid-length',63,null],
  ['hex-65',encodeText(localHex+'a'),'unsupported','sha256-invalid-length',65,null],
  ['0x-prefix',encodeText('0x'+localHex),'unsupported','sha256-invalid-length',66,null],
  ['0x-prefix-within-64',encodeText('0x'+localHex.slice(2)),'unsupported','sha256-invalid-hex',64,null],
  ['leading-whitespace',encodeText(' '+localHex),'unsupported','sha256-invalid-length',65,null],
  ['whitespace-within-64',encodeText(' '+localHex.slice(1)),'unsupported','sha256-invalid-hex',64,null],
  ['trailing-newline',encodeText(localHex+'\n'),'unsupported','sha256-invalid-length',65,null],
  ['unicode-within-64-bytes',encodeText('é'+'a'.repeat(62)),'unsupported','sha256-invalid-hex',64,null],
  ['high-bit-ascii-lookalike',highBitHex.toString('base64'),'unsupported','sha256-invalid-hex',64,null],
  ['invalid-base64','!not-base64!','unsupported','sha256-invalid-base64',null,null],
  ['raw-mismatch',Buffer.alloc(32).toString('base64'),'raw-digest-base64','sha256-mismatch',32,32],
  ['hex-mismatch',encodeText('0'.repeat(64)),'hex-text-base64','sha256-mismatch',64,32],
  ['bare-hex-not-base64-wrapped',localHex,'unsupported','sha256-invalid-length',48,null],
  ['double-base64',encodeText(encodeText(localHex)),'unsupported','sha256-invalid-length',88,null]
];
for (const [operation,ordinal] of [['upload-finalize',2],['metadata-get',3]] as const) {
  for (const [name,value,representation,reason,firstLength,finalLength] of representationCases) {
    const s = await stage1Mock((_req,n,r) => {
      if (n !== ordinal) return r;
      const root = JSON.parse(r.body.toString());
      (operation === 'upload-finalize' ? root.file : root).sha256Hash = value;
      return {...r,body:bytes(root)};
    });
    const response = s.persisted.find(e=>e.phase==='response'&&e.operation===operation)!;
    const d = response.detail.sha256Diagnostics;
    assert.equal(d.sha256Representation,representation);
    assert.equal(d.encodedLengthChars,value.length);
    assert.equal(d.firstDecodedLengthBytes,firstLength); assert.equal(d.finalDigestLengthBytes,finalLength);
    assert.equal(d.digestMatchResult,reason === null ? 'matched' : reason === 'sha256-mismatch' ? 'mismatched' : 'not-checked');
    assert.equal(s.result.failure?.reason ?? null,reason);
    assert.equal(s.calls.length,reason === null ? 20 : ordinal);
    assert.equal(Object.hasOwn(response.detail.fields,'sha256Hash'),false);
    assert.deepEqual(Object.keys(d).sort(),diagnosticKeys);
    // Inspect provider-response persistence, not the request's independently bound
    // local video SHA (the bare-hex negative intentionally equals that local SHA).
    assert.equal(JSON.stringify(response.detail).includes(value),false);
    assert.equal(JSON.stringify(d).includes(byteSha(Buffer.from(value))),false);
    if (representation === 'hex-text-base64') assert.equal(JSON.stringify(d).includes(Buffer.from(value,'base64').toString('ascii')),false);
    if (reason !== null) assert.ok(s.result.items.slice(1).every(i=>i.status==='not-attempted'));
    representationProof.push(operation+': '+name);
  }
  // Diagnostic fields deliberately collapse distinct digests to identical metadata,
  // separately for each supported representation. No value or value-derived hash.
  for (const representation of ['raw-digest-base64','hex-text-base64'] as const) {
    const diagnostics = [];
    for (const hex of ['ac'.repeat(32),'bc'.repeat(32)]) {
      const value = representation === 'raw-digest-base64' ? Buffer.from(hex,'hex').toString('base64') : encodeText(hex);
      const s = await stage1Mock((_req,n,r)=>{
        if(n!==ordinal) return r;
        const root=JSON.parse(r.body.toString()); (operation==='upload-finalize'?root.file:root).sha256Hash=value;
        return {...r,body:bytes(root)};
      });
      diagnostics.push(s.persisted.find(e=>e.phase==='response'&&e.operation===operation)!.detail.sha256Diagnostics);
    }
    assert.deepEqual(diagnostics[0],diagnostics[1]);
    representationProof.push(operation+': '+representation+' diagnostics do not uniquely identify digest');
  }
}
process.stdout.write(JSON.stringify({suite:'sha256-two-representations',status:'passed',checks:representationProof.length,proof:representationProof,liveHttp:0})+'\n');
for (const [op, ms] of Object.entries(STAGE1_TIMEOUTS)) {
  let fire!: () => void; let aborted = false; let cancelled = false;
  const pending = wallClockDeadline(ms, async signal => new Promise<never>(() => { signal.addEventListener('abort', () => { aborted = true; }); }),
    (fn, observedMs) => { assert.equal(observedMs, ms); fire = fn; return () => { cancelled = true; }; });
  fire(); await assert.rejects(pending, Stage1Timeout); assert.ok(aborted && cancelled);
  const ordinal = Object.keys(STAGE1_TIMEOUTS).indexOf(op) + 1;
  const s = await stage1Mock((_r, n, r) => { if (n === ordinal) throw new Stage1Timeout(); return r; });
  assert.equal(s.calls.length, ordinal); assert.equal(s.result.failure?.timeout, true);
  assert.equal(s.result.failure?.deliveryState, 'unknown'); assert.equal(s.result.inference, 0);
  assert.equal(s.result.items[0].operations.at(-1)?.unknown, 1);
  stage1Proof.push(op + ' wall-clock deadline; delivery unknown; terminal no retry');
}
const stage1Failures: Array<[string, number, Fault]> = [
  ['upload-start-failure', 1, (_r,n,r) => n === 1 ? {...r,status:500} : r],
  ['upload-finalize-failure', 2, (_r,n,r) => n === 2 ? {...r,status:500} : r],
  ['metadata-request-failure', 3, (_r,n,r) => n === 3 ? {...r,status:500} : r],
  ['metadata-not-active', 3, (_r,n,r) => n === 3 ? {...r,body:bytes({...JSON.parse(r.body.toString()),state:'PROCESSING'})} : r],
  ['counttokens-failure', 4, (_r,n,r) => n === 4 ? {...r,status:400} : r],
  ...['uri','mimeType','sizeBytes','sha256Hash'].map(key => ['metadata-integrity-mismatch',3,
    ((_r: HttpRequest,n: number,r: HttpResponse) => n === 3 ? {...r,body:bytes({...JSON.parse(r.body.toString()),[key]:'synthetic-wrong'})} : r)] as [string,number,Fault])
];
for (const [category, ordinal, fault] of stage1Failures) {
  const s = await stage1Mock(fault);
  assert.equal(s.result.failure?.category, category); assert.equal(s.calls.length, ordinal);
  assert.equal(s.result.allFiveInputTokens, null); assert.equal(s.result.items[1].status, 'not-attempted');
  stage1Proof.push(category + ' separated, partial record and global stop');
}
{
  const s = await stage1Mock((_r,n,r) => { if (n === 2) throw new Error('Authorization: synthetic-network-secret'); return r; });
  assert.equal(s.result.failure?.deliveryState, 'unknown'); assert.equal(s.calls.length, 2);
  assert.equal(JSON.stringify(s.result).includes('synthetic-network-secret'), false);
  const p = await stage1Mock(undefined, 2);
  assert.equal(p.result.failure?.category, 'local-persistence-failure'); assert.equal(p.calls.length, 0);
  assert.equal(p.result.reservedHttp, 1); assert.equal(p.result.items[0].operations[0].notSent, 1);
  assert.equal(JSON.stringify(p.result).includes('synthetic-persistence-secret'), false);
  stage1Proof.push('unknown delivery and persistence failure preserve counters without leaking exception text');
}
{
  const s = await stage1Mock((_r,n,r) => n === 4 ? {...r,body:bytes({totalTokens:100,apiKey:'synthetic-secret',
    nested:{session:'https://generativelanguage.googleapis.com/upload/private?upload_id=secret'}})} : r);
  assert.equal(s.result.allFiveInputTokens, 500);
  assert.equal(JSON.stringify(s.result).includes('synthetic-secret'), false);
  assert.equal(JSON.stringify(s.persisted).includes('upload_id'), false);
  stage1Proof.push('response allowlist excludes arbitrary secret fields and session URLs');
}
process.stdout.write(JSON.stringify({suite:'stage1', status:'passed', checks:stage1Proof.length, proof:stage1Proof, liveHttp:0})+'\n');
{
  const stopped = await executeStage1(mockJobs, {mode:'mock', manifestSha256:'a'.repeat(64),
    clock: () => '2026-09-05T00:00:00.000Z', media: async () => { throw new Error('credential-not-configured'); },
    append: async () => {}, wait: async () => { assert.fail('unexpected wait'); },
    exchange: async () => { assert.fail('credential failure must never send'); }});
  assert.equal(stopped.failure?.reason, 'credential-not-configured');
  assert.equal(stopped.actualStartedHttp, 0); assert.equal(stopped.reservedHttp, 0);
  assert.equal(stopped.allFiveInputTokens, null); assert.equal(stopped.items.length, 5);
  process.stdout.write(JSON.stringify({suite:'stage1-credential-preflight',status:'passed',checks:5,liveHttp:0})+'\n');
}

{
  const oldJournal = await readFile(resolve(workspace, PREPARATION_ROOT, 'stage1-communication-record-v001.jsonl'));
  const oldMeasurement = await readFile(resolve(workspace, PREPARATION_ROOT, 'stage1-measurement-v001.json'));
  // The original immutable prefix may be followed by a later approved attempt.
  const lines = oldJournal.toString('utf8').split('\n');
  const prefix = Buffer.from(lines.slice(0,2).join('\n')+'\n');
  assert.equal(assertCredentialStopResumeHistory(prefix,oldMeasurement).length,2);
  assert.throws(()=>assertCredentialStopResumeHistory(Buffer.concat([prefix,bytes({anotherAttempt:true})]),oldMeasurement));
  assert.throws(()=>assertCredentialStopResumeHistory(prefix,Buffer.from('{}\n')));
  assert.throws(()=>assertCredentialStopResumeHistory(Buffer.from(prefix.toString().replace('credential-not-configured','changed')),oldMeasurement));
  process.stdout.write(JSON.stringify({suite:'credential-stop-forward-resume',status:'passed',checks:4,liveHttp:0})+'\n');
  // Preserve the exact attempt-0002 prefix, even after attempt-0003 is appended.
  const boundaryIndex = lines.findIndex(line => line && JSON.parse(line).detail?.attemptId === 'attempt-0003');
  const previousLines = boundaryIndex < 0 ? lines.filter(Boolean) : lines.slice(0, boundaryIndex);
  const previousJournal = Buffer.from(previousLines.join('\n') + '\n');
  assert.ok(assertSha256FixResumeHistory(previousJournal, oldMeasurement).length > 2);
  assert.throws(() => assertSha256FixResumeHistory(Buffer.concat([previousJournal, bytes({anotherAttempt:true})]), oldMeasurement));
  assert.throws(() => assertSha256FixResumeHistory(previousJournal, Buffer.from('{}\n')));
  assert.throws(() => assertSha256FixResumeHistory(Buffer.from(previousJournal.toString().replace('metadata-integrity-mismatch', 'changed')), oldMeasurement));
  process.stdout.write(JSON.stringify({suite:'sha256-fix-forward-new-attempt',status:'passed',checks:4,liveHttp:0})+'\n');
  const diagnosticBoundary = lines.findIndex(line=>line&&JSON.parse(line).detail?.attemptId === 'attempt-0004');
  const diagnosticPrefix = Buffer.from((diagnosticBoundary < 0 ? lines.filter(Boolean) : lines.slice(0,diagnosticBoundary)).join('\n')+'\n');
  assert.ok(assertSha256DiagnosticHistory(diagnosticPrefix,oldMeasurement).length>2);
  assert.throws(()=>assertSha256DiagnosticHistory(Buffer.concat([diagnosticPrefix,bytes({anotherAttempt:true})]),oldMeasurement));
  assert.throws(()=>assertSha256DiagnosticHistory(diagnosticPrefix,Buffer.from('{}\n')));
  assert.throws(()=>assertSha256DiagnosticHistory(Buffer.from(diagnosticPrefix.toString().replace('sha256-invalid-length','changed')),oldMeasurement));
  process.stdout.write(JSON.stringify({suite:'sha256-diagnostic-history',status:'passed',checks:4,liveHttp:0})+'\n');
}
const oneItemProof: string[] = [];
{
  const normal = await stage1Mock(undefined,undefined,'item-0001-upload-and-count');
  assert.equal(normal.result.items.length,1); assert.equal(normal.result.items[0].itemId,'item-0001');
  assert.equal(normal.result.items[0].inputTokens,100); assert.ok(normal.result.items[0].countTokensRequestSha256);
  assert.equal(normal.result.status,'item-0001-measured-awaiting-separate-approval');
  assert.equal(normal.result.actualStartedHttp,4); assert.equal(normal.result.reservedHttp,4);
  assert.deepEqual(normal.waits,[60000]); assert.equal(normal.result.allFiveInputTokens,null);
  assert.equal(normal.result.retry+normal.result.repair+normal.result.inference+normal.result.extraPoll,0);
  assert.deepEqual(normal.persisted[0].detail.targetItems,['item-0001']);
  assert.equal(normal.persisted[0].detail.maximumHttp,4);
  assert.deepEqual(normal.persisted.filter(e=>e.phase==='intent').map(e=>e.operation),Object.keys(STAGE1_TIMEOUTS));
  oneItemProof.push('singleton target, four sends, fixed wait, exact count request, measured completion without inference');
  const rehash = (events: Stage1Event[]) => events.map((e,i) => {
    e.sequence=i+1; e.previousSha256=i?events[i-1].sha256:null;
    const {sha256:_old,...content}=e; e.sha256=candidateVideoDigestV002(content); return e;
  });
  const extra=structuredClone(normal.persisted);
  const intent=structuredClone(extra.find(e=>e.phase==='intent')!); intent.item='item-0002'; intent.detail.counter=5; extra.push(intent);
  assert.throws(()=>validateStage1Journal(rehash(extra)));
  const wrongTarget=structuredClone(normal.persisted); wrongTarget.find(e=>e.phase==='intent')!.item='item-0002';
  assert.throws(()=>validateStage1Journal(rehash(wrongTarget)));
  const inference=structuredClone(normal.persisted); (inference.find(e=>e.phase==='intent') as any).operation='inference';
  assert.throws(()=>validateStage1Journal(rehash(inference)));
  oneItemProof.push('rehashed fifth send, another item and inference intent rejected');
}
for (const [category,ordinal,fault] of stage1Failures) {
  const s=await stage1Mock(fault,undefined,'item-0001-upload-and-count');
  assert.equal(s.result.failure?.category,category); assert.equal(s.calls.length,ordinal);
  assert.equal(s.result.items.length,1); assert.equal(s.result.items[0].inputTokens,null);
  assert.equal(s.result.retry+s.result.repair+s.result.inference+s.result.extraPoll,0);
  oneItemProof.push('one-item terminal stop: '+category);
}
for (const ordinal of [1,2,3,4]) {
  const s=await stage1Mock((_r,n,r)=>{if(n===ordinal)throw new Stage1Timeout();return r;},undefined,'item-0001-upload-and-count');
  assert.equal(s.calls.length,ordinal); assert.equal(s.result.failure?.deliveryState,'unknown');
  assert.equal(s.result.failure?.timeout,true);
  oneItemProof.push('one-item timeout '+ordinal+' no resend');
}
{
  let actions=0;
  const deps={mode:'mock' as const,manifestSha256:'a'.repeat(64),clock:()=> '2026-09-05T00:00:00.000Z',
    media:async()=>{actions++;return mockBytes;}, exchange:async()=>{actions++;return {status:200,headers:{},body:bytes({})};},
    wait:async()=>{actions++;},append:async()=>{actions++;}};
  for(const invalid of [[],mockJobs,[mockJobs[1]],[mockJobs[0],mockJobs[0]]]) await assert.rejects(()=>executeItem0001Stage1(invalid,deps));
  assert.equal(actions,0);
  oneItemProof.push('zero/multiple/wrong/duplicate targets rejected before records, media or HTTP');
}
const journalAtTestStart=await readFile(resolve(workspace,PREPARATION_ROOT,'stage1-communication-record-v001.jsonl'));
const historyLines=journalAtTestStart.toString().trimEnd().split('\n');
const fourthEnd=historyLines.findIndex(line=>{const e=JSON.parse(line);return e.phase==='attempt-measurement'&&e.detail.attemptId==='attempt-0004';});
assert.ok(fourthEnd>=0);
const historicalJournal=Buffer.from(historyLines.slice(0,fourthEnd+1).join('\n')+'\n');
const historicalMeasurement=await readFile(resolve(workspace,PREPARATION_ROOT,'stage1-measurement-v001.json'));
assert.equal(byteSha(historicalJournal),'0896a3fc96d2e0313542eb6da4c5cf9815b35eff42d43ce2676136e371aed4d5');
const attemptBinding={attemptId:'attempt-0005',expectedPriorJournalSha256:byteSha(historicalJournal),
  manifestSha256:'a'.repeat(64),implementationSha256:'b'.repeat(64)};
function memoryAttempt(fault?: Fault, failAppend?: number, corruptReadback=false, remainingOnly=false) {
  let journal=Buffer.from(historicalJournal); let measurement=Buffer.from(historicalMeasurement);
  let writes=0; const m=mockPort(fault); const waits:number[]=[];
  const deps={mode:'mock' as const,clock:()=> '2026-09-05T00:00:00.000Z',
    records:{readJournal:async()=>Buffer.from(journal),readMeasurement:async()=>Buffer.from(measurement),
      appendJournal:async(line:Buffer)=>{writes++; if(writes===failAppend)throw new Error('synthetic append failure');
        journal=Buffer.concat([journal,line]); if(corruptReadback)journal=Buffer.concat([journal,Buffer.from(' ')]);}},
    media:async(job:CandidateVideoJobV002)=>{
      if(remainingOnly) assert.ok(['item-0002','item-0003','item-0004','item-0005'].includes(job.itemId));
      else assert.equal(job.itemId,'item-0001'); return mockBytes;
    },
    wait:async(ms:number)=>{assert.equal(ms,60000);waits.push(ms);},
    exchange:async(req:HttpRequest,operation:string)=>{
      const global=JSON.parse(journal.toString().trimEnd().split('\n').at(-1)!);
      assert.equal(global.phase,'attempt-event'); assert.equal(global.detail.payload.phase,'intent');
      assert.equal(global.detail.payload.operation,operation); assert.equal(global.detail.payload.detail.counter,m.calls.length+1);
      assert.ok(m.calls.length<(remainingOnly?16:4)); assert.equal(req.url.includes(':generateContent'),false);
      return m.port.exchange(req);
    }};
  return {deps,m,waits,journal:()=>journal,writes:()=>writes,
    replaceJournal:(value:Buffer)=>{journal=Buffer.from(value);},replaceMeasurement:(value:Buffer)=>{measurement=Buffer.from(value);}};
}
for (const faultAt of [0,2,3,4]) {
  const m=memoryAttempt((_r,n,r)=>n===faultAt?{...r,status:500}:r);
  const result=await executeItem0001Attempt([mockJobs[0]],attemptBinding,m.deps);
  assert.equal(m.m.calls.length,faultAt||4);
  assert.ok(m.journal().subarray(0,historicalJournal.length).equals(historicalJournal));
  assert.ok((await m.deps.records.readMeasurement()).equals(historicalMeasurement));
  const all=m.journal().toString().trimEnd().split('\n').map(line=>JSON.parse(line) as Stage1Event);
  validateStage1Journal(all);
  const appended=m.journal().subarray(historicalJournal.length).toString().trimEnd().split('\n').map(line=>JSON.parse(line) as Stage1Event);
  assert.equal(appended[0].phase,'attempt-boundary'); assert.ok(appended.every(e=>e.detail.attemptId==='attempt-0005'));
  assert.equal(appended.at(-1)!.phase,'attempt-measurement');
  assert.deepEqual(appended.at(-1)!.detail.payload,result);
  assert.equal(Boolean(result.failure),faultAt!==0);
  if(faultAt)assert.equal(appended.at(-2)!.detail.payload.phase,'failure');
  else assert.equal(result.items[0].inputTokens,100);
  const unchanged=Buffer.from(m.journal()); const writes=m.writes();
  await assert.rejects(()=>executeItem0001Attempt([mockJobs[0]],{...attemptBinding,expectedPriorJournalSha256:byteSha(unchanged)},m.deps),/attempt-id-already-used/);
  assert.equal(m.writes(),writes); assert.ok(m.journal().equals(unchanged));
  oneItemProof.push('append-only attempt '+(faultAt?'failure at '+faultAt:'success')+': immutable history, ordered intent, completion, duplicate rejected');
}
for(const id of ['attempt-0001','attempt-0002','attempt-0003','attempt-0004']){
  const m=memoryAttempt(); await assert.rejects(()=>executeItem0001Attempt([mockJobs[0]],{...attemptBinding,attemptId:id},m.deps),/attempt-id-already-used/);
  assert.equal(m.writes(),0); assert.equal(m.m.calls.length,0);
  oneItemProof.push('historical ID '+id+' rejected without writes/sends');
}
for(const kind of ['old-byte-change','sequence-change','measurement-change','append-failure','readback-failure'] as const){
  const m=memoryAttempt(undefined,kind==='append-failure'?3:undefined,kind==='readback-failure');
  if(kind==='old-byte-change')m.replaceJournal(Buffer.from(historicalJournal.toString().replace('credential-not-configured','changed')));
  if(kind==='sequence-change'){
    const lines=historicalJournal.toString().trimEnd().split('\n'); const e=JSON.parse(lines.at(-1)!);e.sequence++;
    lines[lines.length-1]=JSON.stringify(e);m.replaceJournal(Buffer.from(lines.join('\n')+'\n'));
  }
  if(kind==='measurement-change')m.replaceMeasurement(Buffer.from('{}\n'));
  await assert.rejects(()=>executeItem0001Attempt([mockJobs[0]],{...attemptBinding,expectedPriorJournalSha256:byteSha(m.journal())},m.deps));
  assert.equal(m.m.calls.length,0);
  if(kind==='append-failure'){
    assert.equal(m.writes(),3); // boundary + initialization succeed; failed intent is never retried.
    assert.ok(m.journal().subarray(0,historicalJournal.length).equals(historicalJournal));
  }
  oneItemProof.push(kind+' prevents send and never retries persistence');
}
{
  const first=memoryAttempt(); await executeItem0001Attempt([mockJobs[0]],attemptBinding,first.deps);
  const second=memoryAttempt(); const prefix=Buffer.from(first.journal()); second.replaceJournal(prefix);
  const result=await executeItem0001Attempt([mockJobs[0]],{...attemptBinding,attemptId:'attempt-0006',expectedPriorJournalSha256:byteSha(prefix)},second.deps);
  assert.equal(result.attemptId,'attempt-0006'); assert.equal(second.m.calls.length,4);
  assert.ok(second.journal().subarray(0,prefix.length).equals(prefix));
  oneItemProof.push('another explicitly named unused attempt appends without rewriting any earlier attempt');
}
assert.ok((await readFile(resolve(workspace,PREPARATION_ROOT,'stage1-communication-record-v001.jsonl'))).equals(journalAtTestStart));
assert.ok((await readFile(resolve(workspace,PREPARATION_ROOT,'stage1-measurement-v001.json'))).equals(historicalMeasurement));
process.stdout.write(JSON.stringify({suite:'item-0001-bounded-attempt',status:'passed',checks:oneItemProof.length,proof:oneItemProof,liveHttp:0})+'\n');

const remainingProof: string[]=[];
const remainingIds=['item-0002','item-0003','item-0004','item-0005'];
const fifthEnd=historyLines.findIndex(line=>{const e=JSON.parse(line);return e.phase==='attempt-measurement'&&e.detail.attemptId==='attempt-0005';});
assert.ok(fifthEnd>=0);
const fiveAttemptHistory=Buffer.from(historyLines.slice(0,fifthEnd+1).join('\n')+'\n');
assert.equal(byteSha(fiveAttemptHistory),'9d9cb41f800d074881528869804f1d5a81e882684bdb05e649003fd2e95f5b69');
const remainingBinding={...attemptBinding,attemptId:'attempt-0006',expectedPriorJournalSha256:byteSha(fiveAttemptHistory)};
const makeRemainingMemory=(fault?:Fault,failAppend?:number)=>{
  const m=memoryAttempt(fault,failAppend,false,true);m.replaceJournal(fiveAttemptHistory);return m;
};
{
  const s=await stage1Mock(undefined,undefined,'remaining-four-upload-and-count');
  assert.equal(s.result.failure,null);assert.equal(s.result.actualStartedHttp,16);assert.equal(s.result.reservedHttp,16);
  assert.deepEqual(s.result.items.map(i=>i.itemId),remainingIds);
  assert.deepEqual(s.waits,[60000,60000,60000,60000]);assert.equal(s.result.inference+s.result.retry+s.result.repair+s.result.extraPoll,0);
  assert.deepEqual(s.persisted.filter(e=>e.phase==='intent').map(e=>[e.item,e.operation]),remainingIds.flatMap(id=>Object.keys(STAGE1_TIMEOUTS).map(op=>[id,op])));
  const a=deriveFiveItemStage1Measurement(fiveAttemptHistory,s.result,'attempt-0006');
  assert.equal(a.items[0].inputTokens,32350);assert.equal(a.totalInputTokens,32750);assert.equal(a.averageInputTokens,6550);
  assert.equal(a.measurementKind,'mock-new-items-with-preserved-live-item-0001');
  assert.equal(a.items[0].countTokensRequestSha256,'a93048180dbd5248fcdaf16c12f70a21a22a36e29826e826b6881f32e6d0f9c6');
  assert.ok(a.items.every(i=>i.countTokensRequestSha256&&/^[a-f0-9]{64}$/u.test(i.countTokensRequestSha256)));
  const altered=structuredClone(s.result);assert.notEqual(altered.items[0].inputTokens,null);
  altered.items[0].inputTokens=altered.items[0].inputTokens!+1;
  assert.throws(()=>deriveFiveItemStage1Measurement(fiveAttemptHistory,altered,'attempt-0006'));
  remainingProof.push('four ordered targets, sixteen requests, exact token/SHA aggregation; mock label and evidence mismatch rejection');
  for(const kind of ['item-0001','seventeenth','inference'] as const){
    const forged=structuredClone(s.persisted);
    if(kind==='seventeenth'){
      const e=structuredClone(forged.find(e=>e.phase==='intent')!);e.item='item-0001';e.detail.counter=17;forged.push(e);
    }else if(kind==='item-0001')forged.find(e=>e.phase==='intent')!.item='item-0001';
    else (forged.find(e=>e.phase==='intent') as any).operation='inference';
    forged.forEach((e,i)=>{e.sequence=i+1;e.previousSha256=i?forged[i-1].sha256:null;const {sha256:_old,...content}=e;e.sha256=candidateVideoDigestV002(content);});
    assert.throws(()=>validateStage1Journal(forged));remainingProof.push('journal rejects '+kind+' even after rehash');
  }
}
for(let index=0;index<4;index++)for(const [category,ordinal,fault] of stage1Failures){
  const s=await stage1Mock((req,n,r)=>fault(req,n-index*4,r),undefined,'remaining-four-upload-and-count');
  assert.equal(s.calls.length,index*4+ordinal);assert.equal(s.result.failure?.category,category);
  assert.ok(s.result.items.slice(index+1).every(i=>i.status==='not-attempted'));
  assert.ok(s.result.items.slice(0,index).every(i=>i.status==='measured'&&i.inputTokens===100));
  assert.equal(s.result.retry+s.result.repair+s.result.inference+s.result.extraPoll,0);
  const a=deriveFiveItemStage1Measurement(fiveAttemptHistory,s.result,'attempt-0006');
  assert.equal(a.status,'partial');assert.equal(a.totalInputTokens,null);assert.equal(a.averageInputTokens,null);
  assert.equal(a.items[0].inputTokens,32350);
  remainingProof.push(remainingIds[index]+': '+category+' preserves earlier measurements and stops later items');
}
{
  let actions=0;const deps={mode:'mock' as const,manifestSha256:'a'.repeat(64),clock:()=> '2026-09-05T00:00:00.000Z',
    media:async()=>{actions++;return mockBytes;},exchange:async()=>{actions++;return {status:200,headers:{},body:bytes({})};},
    wait:async()=>{actions++;},append:async()=>{actions++;}};
  for(const invalid of [mockJobs,[],mockJobs.slice(0,4),mockJobs.slice(1).reverse(),[mockJobs[1],mockJobs[1],mockJobs[3],mockJobs[4]]])
    await assert.rejects(()=>executeRemainingStage1(invalid,deps));
  assert.equal(actions,0);remainingProof.push('item-0001, missing, duplicate and reordered targets rejected before any side effect');
}
for(const failureAt of [0,2,7,12,14]){
  const m=makeRemainingMemory((_r,n,r)=>n===failureAt?{...r,status:500}:r);
  const r=await executeRemainingStage1Attempt(mockJobs.slice(1),remainingBinding,m.deps);
  assert.equal(m.m.calls.length,failureAt||16);assert.ok(m.journal().subarray(0,fiveAttemptHistory.length).equals(fiveAttemptHistory));
  assert.ok((await m.deps.records.readMeasurement()).equals(historicalMeasurement));
  const all=m.journal().toString().trimEnd().split('\n').map(line=>JSON.parse(line) as Stage1Event);validateStage1Journal(all);
  const fresh=m.journal().subarray(fiveAttemptHistory.length).toString().trimEnd().split('\n').map(line=>JSON.parse(line) as Stage1Event);
  assert.ok(fresh.every(e=>e.detail.attemptId==='attempt-0006'));assert.equal(fresh[0].phase,'attempt-boundary');
  assert.equal(fresh.at(-1)!.phase,'attempt-measurement');assert.deepEqual(fresh.at(-1)!.detail.payload,r);
  const events=fresh.filter(e=>e.phase==='attempt-event').map(e=>e.detail.payload);
  validateStage1Journal(events);
  assert.deepEqual(deriveFiveItemStage1Measurement(fiveAttemptHistory,{...r,events},'attempt-0006'),r.fiveItemMeasurement);
  assert.equal(r.fiveItemMeasurement?.items[0].inputTokens,32350);
  assert.equal(r.fiveItemMeasurement?.totalInputTokens,failureAt?null:32750);
  const before=Buffer.from(m.journal());const writes=m.writes();
  await assert.rejects(()=>executeRemainingStage1Attempt(mockJobs.slice(1),{...remainingBinding,expectedPriorJournalSha256:byteSha(before)},m.deps),/attempt-id-already-used/);
  assert.ok(m.journal().equals(before));assert.equal(m.writes(),writes);
  remainingProof.push('new attempt '+(failureAt?'partial at '+failureAt:'complete')+': prefix immutable, intents durable, aggregate rederived, duplicate refused');
}
{
  const m=makeRemainingMemory();await assert.rejects(()=>executeRemainingStage1Attempt(mockJobs.slice(1),{...remainingBinding,attemptId:'attempt-0005'},m.deps),/attempt-id-already-used/);
  assert.equal(m.m.calls.length,0);assert.equal(m.writes(),0);
  const bad=makeRemainingMemory();bad.replaceJournal(Buffer.from(fiveAttemptHistory.toString().replace('32350','32351')));
  await assert.rejects(()=>executeRemainingStage1Attempt(mockJobs.slice(1),{...remainingBinding,expectedPriorJournalSha256:byteSha(bad.journal())},bad.deps));
  assert.equal(bad.m.calls.length,0);assert.equal(bad.writes(),0);
  remainingProof.push('attempt-0005 ID reuse and modified preserved item-one result rejected before writes/sends');
}
assert.ok((await readFile(resolve(workspace,PREPARATION_ROOT,'stage1-communication-record-v001.jsonl'))).equals(journalAtTestStart));
assert.ok((await readFile(resolve(workspace,PREPARATION_ROOT,'stage1-measurement-v001.json'))).equals(historicalMeasurement));
process.stdout.write(JSON.stringify({suite:'remaining-four-bounded-attempt',status:'passed',checks:remainingProof.length,proof:remainingProof,liveHttp:0})+'\n');

// task-013: pinned live preparation evidence, synthetic inference only. No disk sink,
// credential lookup, upload, GET, countTokens, or live inference is used in this suite.
const singleInferenceProof: string[] = [];
const inferenceJob = jobs[0];
const inferenceEvidence = {
  stage1: await readFile(resolve(workspace, PREPARATION_ROOT, 'stage1-communication-record-v001.jsonl')),
  measurement: await readFile(resolve(workspace, PREPARATION_ROOT, 'stage1-measurement-v001.json')),
  manifest: await readFile(resolve(workspace, PREPARATION_ROOT, 'job-manifest-v001.json')),
  price: await readFile(resolve(workspace, PREPARATION_ROOT, 'provider-spec-and-price-snapshot-v001.json')),
  media: await readFile(resolve(workspace, inferenceJob.bindings.explorationVideo.path)),
  mapping: await readFile(resolve(workspace, inferenceJob.bindings.mapping.path)),
  build: await readFile(resolve(workspace, inferenceJob.bindings.buildVerification.path)),
  implementationSha256: byteSha(await readFile(resolve(workspace, 'runner/src/candidate-video-understanding-transport-v001.ts')))
};
const inferenceHistory = inferenceEvidence.stage1.toString().trimEnd().split('\n').map(line=>JSON.parse(line) as Stage1Event);
const preparedOne = inferenceHistory.find(e=>e.phase==='attempt-measurement'&&e.detail.attemptId==='attempt-0005')!.detail.payload.items[0];
const inferenceApproval: Item0001InferenceApproval = {approvedBy:'mock', attemptId:'inference-attempt-0001',
  expectedStage1Sha256:byteSha(inferenceEvidence.stage1), exactRequestSha256:preparedOne.exactInference.sha256,
  maximumHttp:1, retry:0, repair:0, timeoutMs:1000}; // mock-only timeout; not a live default
function inferenceMemory(options: {response?:HttpResponse; throws?:boolean; diskFail?:string;
  now?:string; evidence?:()=>Promise<typeof inferenceEvidence>} = {}) {
  let record=Buffer.alloc(0); const calls:HttpRequest[]=[];
  const deps={port:{mode:'mock' as const,async exchange(request:HttpRequest){
    assert.equal(calls.length,0); assert.equal(request.method,'POST');
    assert.equal(request.url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
    const logged=record.toString().trimEnd().split('\n').map(line=>JSON.parse(line));
    assert.equal(logged.at(-1).phase,'intent');
    assert.deepEqual(JSON.parse(request.body.toString()),preparedOne.exactInference.exact.body);
    calls.push(request); if(options.throws)throw new Stage1Timeout();
    return options.response??{status:200,headers:{authorization:'synthetic-header-secret'},body:bytes(envelope(inferenceJob))};
  }},clock:()=>options.now??'2026-09-05T08:00:00.000Z',
  evidence:options.evidence??(async()=>inferenceEvidence),
  containsSecret:(raw:Buffer)=>raw.includes(Buffer.from('synthetic-private-key')),
  records:{read:async()=>Buffer.from(record),append:async(line:Buffer)=>{
    if(JSON.parse(line.toString()).phase===options.diskFail)throw new Error('synthetic-private-key disk failure');
    record=Buffer.concat([record,line]);
  }}};
  return {deps,calls,record:()=>Buffer.from(record)};
}
function inferenceResponse(value:any):HttpResponse {return {status:200,headers:{},body:bytes(value)};}
async function inferenceCase(name:string, options:Parameters<typeof inferenceMemory>[0], stage:string|null,
  expectedCalls=1, job=inferenceJob, approval=inferenceApproval) {
  const m=inferenceMemory(options); const r=await executeItem0001Inference(job,approval,m.deps);
  assert.equal(m.calls.length,expectedCalls);assert.equal(r.actualHttp,expectedCalls);
  assert.equal(r.failure?.stage??null,stage);assert.equal(r.status,stage?'stopped':'completed');
  assert.equal(r.origin,'mock');assert.equal(r.retry,0);assert.equal(r.repair,0);
  validateItem0001InferenceRecord(m.record(),inferenceJob);
  const before=m.record();await assert.rejects(()=>executeItem0001Inference(inferenceJob,inferenceApproval,m.deps),/record-already-used/);
  assert.deepEqual(m.record(),before);assert.equal(m.calls.length,expectedCalls);
  assert.equal(m.record().includes(Buffer.from('synthetic-private-key')),false);
  singleInferenceProof.push(name);return {m,r};
}
const oneInference = await inferenceCase('only item-one: one inference, durable intent, no preparation HTTP, terminal and no retry',{},null);
assert.equal((oneInference.r.result as any).review.status,'established');
assert.deepEqual((oneInference.r.result as any).review.candidatePresentationDurationMs,{numerator:1800,denominator:1});
assert.equal((oneInference.r.usage as any).input,100);
assert.equal((oneInference.r.usage as any).thinking,30);
assert.equal((oneInference.r.usage as any).cost.totalNanoUsd,'262500');
assert.equal(oneInference.m.record().includes(Buffer.from('synthetic-header-secret')),false);
assert.equal((oneInference.r.result as any).adoptionDecisionPermitted,false);
singleInferenceProof.push('canonical result, PTS, union duration and observed usage/cost rederived; mock origin explicit');
for(const field of ['maximumHttp','retry','repair','timeoutMs'] as const){
  const m=inferenceMemory();const bad={...inferenceApproval,[field]:field==='maximumHttp'?2:field==='timeoutMs'?0:1};
  await assert.rejects(()=>executeItem0001Inference(inferenceJob,bad as Item0001InferenceApproval,m.deps));
  assert.equal(m.calls.length,0);assert.equal(m.record().length,0);
  singleInferenceProof.push('unapproved '+field+' rejected before record/send');
}
{
  const m=inferenceMemory();await assert.rejects(()=>executeItem0001Inference(inferenceJob,{...inferenceApproval,approvedBy:'kawafmm'},m.deps));
  assert.equal(m.calls.length,0);singleInferenceProof.push('mock/live approval mixing rejected');
}
for(const job of [jobs[1], {...inferenceJob,itemId:'item-good-video'}, {...inferenceJob,humanReason:'synthetic'}] as CandidateVideoJobV002[])
  await inferenceCase('wrong item or human-bearing job rejected',{},'pre-send-validation',0,job);
await inferenceCase('request approval mismatch',{},'pre-send-validation',0,inferenceJob,{...inferenceApproval,exactRequestSha256:'0'.repeat(64)});
for(const field of ['stage1','measurement','manifest','price','media','mapping','build'] as const){
  await inferenceCase('modified '+field+' rejected without send',{evidence:async()=>({...inferenceEvidence,[field]:Buffer.from('changed')})},'pre-send-validation',0);
}
await inferenceCase('expired ACTIVE file does not trigger metadata or reupload',{now:'2026-09-08T00:00:00.000Z'},'pre-send-validation',0);
{
  let reads=0; await inferenceCase('input mutation after durable intent still prevents send',{
    evidence:async()=>++reads===1?inferenceEvidence:{...inferenceEvidence,implementationSha256:'f'.repeat(64)}},'pre-send-validation',0);
}
for(const status of [400,500,307]) await inferenceCase('HTTP '+status+' stops without fallback',{
  response:{status,headers:{location:'https://example.invalid'},body:bytes({error:'synthetic'})}},'inference-http');
const unknownInference=await inferenceCase('timeout is delivery unknown with no resend',{throws:true},'inference-http');
assert.equal(unknownInference.r.failure!.delivery,'unknown');
await inferenceCase('invalid provider JSON preserved then rejected',{response:{status:200,headers:{},body:Buffer.from('{')}},'provider-response');
for(const [name,mutate] of [
  ['wrong model',(e:any)=>{e.modelVersion='other';}], ['truncated output',(e:any)=>{e.candidates[0].finishReason='MAX_TOKENS';}],
  ['missing candidate',(e:any)=>{e.candidates=[];}], ['unexpected part',(e:any)=>{e.candidates[0].content.parts=[{functionCall:{}}];}]
] as Array<[string,(e:any)=>void]>){const e=envelope(inferenceJob);mutate(e);await inferenceCase(name,{response:inferenceResponse(e)},'provider-response');}
{
  const e=envelope(inferenceJob);e.candidates[0].content.parts[0].text='```json\n{}\n```';
  await inferenceCase('no fence stripping or repair',{response:inferenceResponse(e)},'structured-output');
}
for(const [name,mutate] of [...outputFaults,
  ['missing-role',(o:any)=>{o.roleObservations.pop();}],
  ['duplicate-role',(o:any)=>{o.roleObservations[1].role=o.roleObservations[0].role;}],
  ['source-time-field',(o:any)=>{o.roleObservations[0].intervals[0].sourceStartTimeMs=123;}]
] as Array<[string,(o:any)=>void]>){const e=envelope(inferenceJob);const o=output(inferenceJob);mutate(o);
  e.candidates[0].content.parts[0].text=JSON.stringify(o);await inferenceCase('strict '+name,{response:inferenceResponse(e)},'local-strict-validation');}
for(const all of [false,true]){
  const e=envelope(inferenceJob);const o=output(inferenceJob);
  for(const role of all?o.roleObservations:[o.roleObservations[0]]){role.status='notObserved';role.intervals=[];}
  o.status=all?'abstain':'partial';o.insufficientEvidence={present:true,missingEvidence:all?[...CANDIDATE_VIDEO_ROLE_VALUES_V001]:['coreEvent'],factualDescription:'Synthetic missing evidence.'};
  // The remaining observed IDs retain strict contiguous numbering.
  o.roleObservations.flatMap(r=>r.intervals).forEach((v,i)=>{v.observationId=`observation-${String(i+1).padStart(3,'0')}`;});
  e.candidates[0].content.parts[0].text=JSON.stringify(o);
  const r=await inferenceCase(all?'abstain is not zero-second success':'missing required role is not zero-second success',
    {response:inferenceResponse(e)},'human-review-interval-derivation');
  assert.equal(r.r.result,null);assert.notEqual(r.r.usage,null);
}
{
  const e=envelope(inferenceJob);const o=output(inferenceJob);
  for(const [i,times] of [[0,[55000,55400]],[1,[56000,56100]],[2,[57000,57100]]] as const){
    o.roleObservations[i].intervals[0].startTimeMs=times[0];o.roleObservations[i].intervals[0].endTimeMs=times[1];}
  e.candidates[0].content.parts[0].text=JSON.stringify(o);
  const r=await inferenceCase('concat crossing splits source intervals; gaps between review intervals remain', {response:inferenceResponse(e)},null);
  const result=r.r.result as any;assert.equal(result.projections[0].projection.sourceIntervals.length,2);
  assert.equal(result.review.humanInitialReviewIntervals.length,3);
  assert.deepEqual(result.review.candidatePresentationDurationMs,{numerator:600,denominator:1});
}
for(const raw of [bytes({echo:'synthetic-private-key'}),Buffer.from('{"echo":"synthetic-private-\\u006bey"}'),bytes({Authorization:'synthetic'})]){
  const r=await inferenceCase('secret echo omitted including JSON escapes',{response:{status:200,headers:{},body:raw}},'provider-response');
  const response=JSON.parse(r.m.record().toString().trimEnd().split('\n').find(line=>JSON.parse(line).phase==='response')!);
  assert.equal(response.detail.rawResponseBase64,null);
}
{
  const e=envelope(inferenceJob) as any;delete e.usageMetadata.thoughtsTokenCount;
  const r=await inferenceCase('missing usage is not fabricated',{response:inferenceResponse(e)},'provider-response');
  assert.equal(r.r.usage!.thinking,null);assert.equal(r.r.usage!.cost,null);
}
for(const phase of ['boundary','intent','response','complete']){
  const m=inferenceMemory({diskFail:phase});const r=await executeItem0001Inference(inferenceJob,inferenceApproval,m.deps);
  assert.equal(r.status,'stopped');assert.equal(r.failure!.reason,'record-persistence-failure');
  assert.equal(m.calls.length,['boundary','intent'].includes(phase)?0:1);
  assert.equal(m.record().includes(Buffer.from('synthetic-private-key')),false);
  singleInferenceProof.push('disk failure at '+phase+' preserves prefix, never resends');
}
{
  const source:Item0001InferenceEvent[]=oneInference.m.record().toString().trimEnd().split('\n').map(line=>JSON.parse(line));
  for(const change of [
    (es:Item0001InferenceEvent[])=>{es[1].detail.counter=2;},
    (es:Item0001InferenceEvent[])=>{es[1].itemId='item-0002' as any;},
    (es:Item0001InferenceEvent[])=>{es[1].detail.exactRequest.body.humanReason='synthetic';},
    (es:Item0001InferenceEvent[])=>{es.splice(2,0,structuredClone(es[1]));},
    (es:Item0001InferenceEvent[])=>{es.at(-1)!.detail.result.review.candidatePresentationDurationMs.numerator=0;},
    (es:Item0001InferenceEvent[])=>{es.find(e=>e.phase==='usage')!.detail.thinking=0;},
    (es:Item0001InferenceEvent[])=>{es[2].detail.rawResponseSha256='0'.repeat(64);}
  ]){const es=structuredClone(source);change(es);es.forEach((e,i)=>{e.sequence=i+1;e.previousSha256=i?es[i-1].sha256:null;
    const {sha256,...content}=e;e.sha256=candidateVideoDigestV002(content);});
    assert.throws(()=>validateItem0001InferenceRecord(Buffer.concat(es.map(bytes)),inferenceJob));
    singleInferenceProof.push('rehashed record manipulation rejected');}
}
assert.deepEqual(await readFile(resolve(workspace,PREPARATION_ROOT,'stage1-communication-record-v001.jsonl')),inferenceEvidence.stage1);
assert.deepEqual(await readFile(resolve(workspace,PREPARATION_ROOT,'stage1-measurement-v001.json')),inferenceEvidence.measurement);
// A pre-existing live inference record is read neither as a fixture nor as authority.
assert.equal(ITEM0001_INFERENCE_RECORD,`${PREPARATION_ROOT}/item-0001-inference-record-v001.jsonl`);
process.stdout.write(JSON.stringify({suite:'item-0001-single-inference',status:'passed',checks:singleInferenceProof.length,
  proof:singleInferenceProof,liveHttp:0,credentialReads:0,liveRecordWrites:0})+'\n');

// task-016: all four outputs are synthetic and all journal writes remain in memory.
const fourProof: string[] = [];
const fourJobs = jobs.slice(1);
const preparedFour = inferenceHistory.find(e => e.phase === 'attempt-measurement'
  && e.detail.attemptId === 'attempt-0006')!.detail.payload.items;
const fourEvidence = await Promise.all(fourJobs.map(async job => ({...inferenceEvidence,
  media: await readFile(resolve(workspace, job.bindings.explorationVideo.path)),
  mapping: await readFile(resolve(workspace, job.bindings.mapping.path)),
  build: await readFile(resolve(workspace, job.bindings.buildVerification.path))})));
const fourApproval: RemainingInferenceApproval = {...inferenceApproval, maximumHttp: 4,
  exactRequests: preparedFour.map((item: any) => ({itemId: item.itemId, sha256: item.exactInference.sha256}))};
const preservedInferencePaths = [ITEM0001_INFERENCE_RECORD,
  `${PREPARATION_ROOT}/item-0001-local-revalidation-v001.json`];
const preservedInferenceBytes = await Promise.all(preservedInferencePaths.map(path => readFile(resolve(workspace, path))));
// task-017 has since produced a stopped record. It is preservation evidence only,
// never a mock response fixture or an input to a later item's request.
const stoppedFourRecord = await readFile(resolve(workspace, REMAINING_INFERENCE_RECORD));
assert.equal(byteSha(stoppedFourRecord), 'efa00a9a655017871c06091ff8a54415066953a891ef497f8fa1fb4fd5f6a476');
// task-020's stopped record is preserved, never used as a response fixture or provider input.
const stoppedThreeRecord = await readFile(resolve(workspace, REMAINING_THREE_INFERENCE_RECORD));
assert.equal(byteSha(stoppedThreeRecord), 'e89329987673c40d84cf1ce54e0236d25c7bf9cbbfa6df3d52446468b7ee787e');
// task-023 has since completed this record. Preserve its bytes; it is never a
// synthetic response fixture and never enters a request to the mock provider.
const preservedFiveRecord = await readFile(resolve(workspace, ITEM0005_INFERENCE_RECORD));
assert.equal(byteSha(preservedFiveRecord), 'c071e1686df77f2c973493e4187ba6bdfe704533a3f9f63f3c3c18296b21da9b');
function fourEnvelope(index: number) {
  const value = envelope(fourJobs[index]); const observation = output(fourJobs[index]);
  observation.summary = `Synthetic independent result ${index + 2}`;
  observation.insufficientEvidence.factualDescription = '';
  value.candidates[0].content.parts[0].text = JSON.stringify(observation);
  value.usageMetadata = {promptTokenCount: 100 + index, candidatesTokenCount: 20 + index,
    thoughtsTokenCount: 30 + index, totalTokenCount: 150 + 3 * index};
  return value;
}
function boundedInferenceMemory(options: {faultAt?: number; response?: HttpResponse; timeout?: boolean;
  diskPhase?: string; diskItem?: string; corruptReadback?: boolean;
  evidence?: (index: number, read: number) => Promise<typeof inferenceEvidence>} = {},
  scope = {jobs: fourJobs, prepared: preparedFour, evidence: fourEvidence, response: fourEnvelope,
    validate: validateRemainingInferenceRecord}) {
  let record = Buffer.alloc(0); const calls: HttpRequest[] = []; const reads = scope.jobs.map(() => 0);
  const deps = {clock: () => '2026-09-05T08:00:00.000Z', containsSecret: (raw: Buffer) => raw.includes(Buffer.from('synthetic-private-key')),
    evidence: async (job: CandidateVideoJobV002) => {
      const index = scope.jobs.findIndex(j => j.itemId === job.itemId); reads[index]++;
      return options.evidence ? options.evidence(index, reads[index]) : scope.evidence[index];
    },
    records: {read: async () => Buffer.from(record), append: async (line: Buffer) => {
      const event = JSON.parse(line.toString()); const inner = event.detail.event;
      if ((inner?.phase ?? event.phase) === options.diskPhase && (!options.diskItem || inner?.itemId === options.diskItem)) {
        if (options.corruptReadback) {record = Buffer.concat([record, Buffer.from('incomplete')]); return;}
        throw new Error('synthetic-private-key disk failure');
      }
      record = Buffer.concat([record, line]);
    }},
    port: {mode: 'mock' as const, exchange: async (request: HttpRequest) => {
      const index = calls.length;
      assert.ok(index < scope.jobs.length); assert.equal(request.method, 'POST');
      assert.equal(request.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
      assert.deepEqual(request.body, bytes(scope.prepared[index].exactInference.exact.body));
      const outer = record.toString().trimEnd().split('\n').map(line => JSON.parse(line));
      assert.equal(outer.at(-1).detail.event.phase, 'intent');
      assert.equal(outer.at(-1).detail.communicationCounter, index + 1);
      assert.equal(outer.at(-1).detail.event.detail.preSendValidation.countTokensRequestSha256,
        scope.prepared[index].countTokensRequestSha256);
      scope.validate(record, scope.jobs);
      calls.push(structuredClone(request));
      if (index === options.faultAt && options.timeout) throw new Stage1Timeout();
      return index === options.faultAt && options.response ? options.response : inferenceResponse(scope.response(index));
    }}
  };
  return {deps, calls, reads, record: () => Buffer.from(record)};
}
const fourMemory = (options: Parameters<typeof boundedInferenceMemory>[0] = {}) => boundedInferenceMemory(options);
async function fourCase(name: string, options: Parameters<typeof fourMemory>[0] = {},
  failureStage: string | null = null, expectedCalls = 4) {
  const m = fourMemory(options); const result = await executeRemainingInference(fourJobs, fourApproval, m.deps);
  assert.equal(result.status, failureStage ? 'stopped' : 'completed', name);
  assert.equal(result.actualHttp, expectedCalls, name); assert.equal(m.calls.length, expectedCalls, name);
  assert.equal(result.retry, 0); assert.equal(result.repair, 0);
  if (failureStage) {
    assert.equal(result.items.at(-1)!.outcome.failure!.stage, failureStage, name);
    assert.equal(result.failedItem, fourJobs[options.faultAt!].itemId);
    assert.equal(result.items.length, options.faultAt! + 1);
    assert.ok(m.reads.slice(options.faultAt! + 1).every(n => n === 0));
    assert.ok(result.items.slice(0,-1).every(i => i.outcome.status === 'completed'));
  }
  assert.equal(validateRemainingInferenceRecord(m.record(), fourJobs).terminal, true);
  const before = m.record();
  await assert.rejects(() => executeRemainingInference(fourJobs, fourApproval, m.deps), /record-already-used/);
  assert.deepEqual(m.record(), before); assert.equal(m.calls.length, expectedCalls);
  assert.equal(m.record().includes(Buffer.from('synthetic-private-key')), false);
  fourProof.push(name); return {m, result};
}
const fourSuccess = await fourCase('exact ordered four; each one POST; durable intent; no replay or fifth send');
for (const [index, item] of fourSuccess.result.items.entries()) {
  const r = item.outcome.result as any;
  assert.equal(r.observation.itemId, fourJobs[index].itemId);
  assert.equal(r.observation.summary, `Synthetic independent result ${index + 2}`);
  assert.equal(r.observation.insufficientEvidence.factualDescription, '');
  assert.equal(r.review.status, 'established');
  assert.deepEqual(r.review.candidatePresentationDurationMs, {numerator:1800, denominator:1});
  assert.equal((item.outcome.usage as any).input, 100 + index);
  assert.equal((item.outcome.usage as any).cost.totalNanoUsd,
    estimateUsageCost({input:100 + index, output:20 + index, thinking:30 + index}).totalNanoUsd);
  assert.equal(fourSuccess.m.calls[index].body.includes(Buffer.from('Synthetic independent result')), false);
  fourProof.push(`${item.itemId}: unchanged empty-explanation contract, independent request/output/usage/cost/review`);
}
for (const targets of [jobs, jobs.slice(0,4), fourJobs.slice(0,3), [...fourJobs, fourJobs[0]],
  [fourJobs[0], fourJobs[0], fourJobs[2], fourJobs[3]], [...fourJobs].reverse(),
  [{...fourJobs[0], itemId:'item-0006'}, ...fourJobs.slice(1)]]) {
  const m = fourMemory(); await assert.rejects(() => executeRemainingInference(targets, fourApproval, m.deps));
  assert.equal(m.record().length, 0); assert.equal(m.calls.length, 0);
  fourProof.push('wrong target/order/count/duplicate rejected before effects');
}
for (const change of [{maximumHttp:5}, {retry:1}, {repair:1}, {approvedBy:'kawafmm'}]) {
  const m = fourMemory(); await assert.rejects(() => executeRemainingInference(fourJobs,
    {...fourApproval, ...change} as RemainingInferenceApproval, m.deps));
  assert.equal(m.record().length, 0); assert.equal(m.calls.length, 0);
  fourProof.push('unapproved boundary rejected before effects');
}
for (const change of [{timeoutMs:0}, {exactRequests:fourApproval.exactRequests.slice(1)},
  {exactRequests:[...fourApproval.exactRequests].reverse()}, {expectedStage1Sha256:'0'.repeat(64)}]) {
  const m = fourMemory(); const r = await executeRemainingInference(fourJobs, {...fourApproval, ...change}, m.deps);
  assert.equal(r.status,'stopped'); assert.equal(m.record().length,0); assert.equal(m.calls.length,0);
  fourProof.push('invalid exact approval rejected before effects');
}
for (let index = 0; index < 4; index++) {
  for (const fault of ['exact-request', 'job-identity', 'file-expiry'] as const) {
    const m=fourMemory(); const targets=structuredClone(fourJobs); const approval=structuredClone(fourApproval);
    if (fault==='exact-request') approval.exactRequests[index].sha256='0'.repeat(64);
    if (fault==='job-identity') (targets[index] as any).humanReason='synthetic forbidden input';
    if (fault==='file-expiry') m.deps.clock=()=>m.reads[index]>0?'2026-09-08T00:00:00.000Z':'2026-09-05T08:00:00.000Z';
    // task-016 setup correction v001: exact target admission already validates all
    // four job shapes, so a human-bearing job is rejected before any batch work.
    if (fault==='job-identity') {
      await assert.rejects(()=>executeRemainingInference(targets,approval,m.deps));
      assert.equal(m.calls.length,0);assert.equal(m.record().length,0);assert.deepEqual(m.reads,[0,0,0,0]);
      fourProof.push(`${fourJobs[index].itemId}: forbidden human input rejected before batch effects`);
      continue;
    }
    const r=await executeRemainingInference(targets,approval,m.deps);
    assert.equal(r.status,'stopped');assert.equal(r.actualHttp,index);assert.equal(m.calls.length,index);
    assert.equal(r.failedItem,fourJobs[index].itemId);
    assert.equal(r.items.at(-1)!.outcome.failure!.stage,'pre-send-validation');
    assert.ok(m.reads.slice(index+1).every(n=>n===0));
    fourProof.push(`${fourJobs[index].itemId}: ${fault} stops before send, no evidence renewal`);
  }
  for (const field of ['stage1','measurement','manifest','price','media','mapping','build'] as const) {
    await fourCase(`${fourJobs[index].itemId}: ${field} mismatch fail-fast before send`, {faultAt:index,
      evidence: async i => i === index ? {...fourEvidence[i], [field]:Buffer.from('changed')} : fourEvidence[i]},
      'pre-send-validation',index);
  }
  await fourCase(`${fourJobs[index].itemId}: evidence changes after intent prevent send`, {faultAt:index,
    evidence:async(i, read) => i === index && read === 2 ? {...fourEvidence[i], implementationSha256:'f'.repeat(64)} : fourEvidence[i]},
    'pre-send-validation',index);
  for (const [label, response, stage] of [
    ['HTTP failure', {status:500,headers:{},body:bytes({error:'synthetic'})}, 'inference-http'],
    ['provider JSON', {status:200,headers:{},body:Buffer.from('{')}, 'provider-response'],
    ['strict wrong item', inferenceResponse(fourEnvelope((index + 1) % 4)), 'local-strict-validation']
  ] as Array<[string,HttpResponse,string]>) await fourCase(`${fourJobs[index].itemId}: ${label} stops remaining`,
    {faultAt:index,response},stage,index + 1);
  await fourCase(`${fourJobs[index].itemId}: timeout unknown, no resend`,{faultAt:index,timeout:true},'inference-http',index + 1);
  const partial = output(fourJobs[index]); partial.status='partial';
  partial.roleObservations[0].status='notObserved'; partial.roleObservations[0].intervals=[];
  partial.roleObservations.flatMap(r=>r.intervals).forEach((v,i)=>v.observationId=`observation-${String(i + 1).padStart(3,'0')}`);
  partial.insufficientEvidence={present:true,missingEvidence:['coreEvent'],factualDescription:'Synthetic absent core.'};
  const value=fourEnvelope(index);value.candidates[0].content.parts[0].text=JSON.stringify(partial);
  await fourCase(`${fourJobs[index].itemId}: missing required observation is not zero-second success`,
    {faultAt:index,response:inferenceResponse(value)},'human-review-interval-derivation',index + 1);
  partial.insufficientEvidence.factualDescription=''; value.candidates[0].content.parts[0].text=JSON.stringify(partial);
  await fourCase(`${fourJobs[index].itemId}: partial empty explanation rejected`,
    {faultAt:index,response:inferenceResponse(value)},'local-strict-validation',index + 1);
  partial.status='abstain'; partial.roleObservations.forEach(r=>{r.status='notObserved';r.intervals=[];});
  partial.insufficientEvidence.missingEvidence=[...CANDIDATE_VIDEO_ROLE_VALUES_V001];
  value.candidates[0].content.parts[0].text=JSON.stringify(partial);
  await fourCase(`${fourJobs[index].itemId}: abstain empty explanation rejected`,
    {faultAt:index,response:inferenceResponse(value)},'local-strict-validation',index + 1);
}
for (const [index, job] of fourJobs.entries()) {
  for (const gap of job.sourceMapping.unmappedCandidatePts) {
    const start=Math.ceil(gap.startPts * 1000 / 15360), end=Math.floor(gap.endPtsExclusive * 1000 / 15360);
    assert.ok(end > start);
    for (const crossing of [false,true]) {
      const o=output(job);o.roleObservations[0].intervals[0].startTimeMs=crossing?start-100:start;
      o.roleObservations[0].intervals[0].endTimeMs=crossing?end+100:end;
      const e=fourEnvelope(index);e.candidates[0].content.parts[0].text=JSON.stringify(o);
      const {m}=await fourCase(`${job.itemId}: ${crossing?'gap crossing retained':'gap only stops without invented source'}`,
        {faultAt:index,response:inferenceResponse(e)},crossing?null:'human-review-interval-derivation',crossing?4:index+1);
      const projected=m.record().toString().trimEnd().split('\n').map(line=>JSON.parse(line).detail.event)
        .find(e=>e?.itemId===job.itemId && e.phase==='projected').detail.projections[0].projection;
      assert.equal(projected.sourceIntervals.length,crossing?2:0);assert.equal(projected.unmappedCandidateIntervals.length,1);
    }
  }
  const point=job.sourceMapping.segments[0].candidateEndPtsExclusive * 1000 / 15360;
  const o=output(job);o.roleObservations[0].intervals[0].startTimeMs=Math.floor(point)-100;
  o.roleObservations[0].intervals[0].endTimeMs=Math.ceil(point)+100;
  const e=fourEnvelope(index);e.candidates[0].content.parts[0].text=JSON.stringify(o);
  const {result}=await fourCase(`${job.itemId}: concatenation crossing splits, review gaps not filled`,
    {faultAt:index,response:inferenceResponse(e)});
  const r=result.items[index].outcome.result as any;
  assert.equal(r.projections[0].projection.sourceIntervals.length,2);
  assert.equal(r.review.humanInitialReviewIntervals.length,2);
}
for (const phase of ['batch-boundary','boundary','intent','response','usage','validated','projected','complete','batch-complete']) {
  for (const corruptReadback of [false,true]) {
    const m=fourMemory({diskPhase:phase,diskItem:phase.startsWith('batch-')?undefined:'item-0003',corruptReadback});
    const r=await executeRemainingInference(fourJobs,fourApproval,m.deps);
    assert.equal(r.status,'stopped');
    assert.equal(m.calls.length,phase==='batch-boundary'?0:phase==='batch-complete'?4:['boundary','intent'].includes(phase)?1:2);
    assert.equal(r.actualHttp,m.calls.length);
    assert.equal(m.record().includes(Buffer.from('synthetic-private-key')),false);
    fourProof.push(`${phase}: ${corruptReadback?'readback mismatch':'write failure'} stops without later sends`);
  }
}
{
  const m=fourMemory(); const read=m.deps.records.read;
  m.deps.records.read=async()=>m.reads[0]===2?Buffer.from('external change after intent'):read();
  const r=await executeRemainingInference(fourJobs,fourApproval,m.deps);
  assert.equal(r.status,'stopped');assert.equal(r.actualHttp,0);assert.equal(m.calls.length,0);
  assert.ok(m.reads.slice(1).every(n=>n===0));
  fourProof.push('external record mutation immediately before transport rejected with zero sends');
}
for (const raw of [bytes({echo:'synthetic-private-key'}),Buffer.from('{"echo":"synthetic-private-\\u006bey"}'),bytes({Authorization:'synthetic'})]) {
  const {m}=await fourCase('secret response including JSON escapes omitted from shared record',
    {faultAt:1,response:{status:200,headers:{},body:raw}},'provider-response',2);
  const responses=m.record().toString().trimEnd().split('\n').map(line=>JSON.parse(line).detail.event).filter(e=>e?.phase==='response');
  assert.equal(responses[1].detail.rawResponseBase64,null);
}
for (const split of [false,true]) {
  const e=fourEnvelope(1); const o=output(fourJobs[1]); o.summary='synthetic-private-key';
  const encoded=JSON.stringify(o).replace('synthetic-private-key','synthetic-private-\\u006bey');
  const cut=encoded.indexOf('private-') + 'private-'.length;
  e.candidates[0].content.parts=split?[{text:encoded.slice(0,cut)},{text:encoded.slice(cut)}]:[{text:encoded}];
  const {m}=await fourCase(`nested structured JSON secret ${split?'split across parts':'double escaped'} omitted`,
    {faultAt:1,response:inferenceResponse(e)},'provider-response',2);
  const response=m.record().toString().trimEnd().split('\n').map(line=>JSON.parse(line).detail.event)
    .find(e=>e?.itemId==='item-0003' && e.phase==='response');
  assert.equal(response.detail.rawResponseBase64,null);
}
{
  const original=fourSuccess.m.record().toString().trimEnd().split('\n').map(line=>JSON.parse(line));
  for (const change of [
    (es:any[])=>{es.splice(-1,0,...structuredClone(es.filter(e=>e.detail.event?.itemId==='item-0002')));},
    (es:any[])=>{es.find(e=>e.detail.event?.phase==='intent').detail.communicationCounter=5;},
    (es:any[])=>{es.find(e=>e.detail.event?.phase==='boundary').detail.event.itemId='item-0001';},
    (es:any[])=>{es.find(e=>e.detail.event?.phase==='intent').detail.event.detail.exactRequest.body.humanReason='synthetic';},
    (es:any[])=>{es.at(-1).detail.actualHttp=3;},
    (es:any[])=>{es.at(-1).detail.completed.pop();},
    (es:any[])=>{es.push(structuredClone(es[1]));}
  ]) {
    const es=structuredClone(original);change(es);
    es.forEach((e,i)=>{e.sequence=i+1;e.previousSha256=i?es[i-1].sha256:null;
      const {sha256,...content}=e;e.sha256=candidateVideoDigestV002(content);});
    assert.throws(()=>validateRemainingInferenceRecord(Buffer.concat(es.map(bytes)),fourJobs));
    fourProof.push('rehashed duplicate/fifth/wrong item/request/terminal tampering rejected');
  }
}
assert.deepEqual(await readFile(resolve(workspace,PREPARATION_ROOT,'stage1-communication-record-v001.jsonl')),inferenceEvidence.stage1);
assert.deepEqual(await readFile(resolve(workspace,PREPARATION_ROOT,'stage1-measurement-v001.json')),inferenceEvidence.measurement);
for (const [index,path] of preservedInferencePaths.entries()) assert.deepEqual(await readFile(resolve(workspace,path)),preservedInferenceBytes[index]);
assert.deepEqual(await readFile(resolve(workspace,REMAINING_INFERENCE_RECORD)),stoppedFourRecord);
fourProof.push('stage1, item-one original/revalidation and stopped four-item record remain byte-identical');
process.stdout.write(JSON.stringify({suite:'remaining-four-single-inference',status:'passed',checks:fourProof.length,
  proof:fourProof,liveHttp:0,credentialReads:0,liveRecordWrites:0})+'\n');

// task-019: only three future targets, using the shared mock sink and per-item evidence.
const threeProof: string[] = [];
const threeJobs = jobs.slice(2), threeEvidence = fourEvidence.slice(1), preparedThree = preparedFour.slice(1);
const threeApproval: RemainingThreeInferenceApproval = {...fourApproval, maximumHttp:3, timeoutMs:600000,
  exactRequests:fourApproval.exactRequests.slice(1)};
const threeEnvelope = (index: number) => fourEnvelope(index + 1);
const threeMemory = (options: Parameters<typeof boundedInferenceMemory>[0] = {}) => boundedInferenceMemory(options,
  {jobs:threeJobs, prepared:preparedThree, evidence:threeEvidence, response:threeEnvelope, validate:validateRemainingThreeInferenceRecord});
async function threeCase(name: string, options: Parameters<typeof threeMemory>[0] = {},
  failureStage: string | null = null, expectedCalls = 3) {
  const m=threeMemory(options), r=await executeRemainingThreeInference(threeJobs,threeApproval,m.deps);
  assert.equal(r.status,failureStage?'stopped':'completed',name);
  assert.equal(r.actualHttp,expectedCalls,name);assert.equal(m.calls.length,expectedCalls,name);
  assert.equal(r.retry,0);assert.equal(r.repair,0);
  if(failureStage){
    assert.equal(r.failedItem,threeJobs[options.faultAt!].itemId);
    assert.equal(r.items.at(-1)!.outcome.failure!.stage,failureStage);
    assert.equal(r.items.at(-1)!.outcome.result,null);
    assert.equal(r.items.length,options.faultAt!+1);
    assert.ok(r.items.slice(0,-1).every(i=>i.outcome.status==='completed'));
    assert.ok(m.reads.slice(options.faultAt!+1).every(n=>n===0));
  }
  assert.equal(validateRemainingThreeInferenceRecord(m.record(),threeJobs).terminal,true);
  const before=m.record();
  await assert.rejects(()=>executeRemainingThreeInference(threeJobs,threeApproval,m.deps),/record-already-used/);
  assert.deepEqual(m.record(),before);assert.equal(m.calls.length,expectedCalls);
  assert.equal(m.record().includes(Buffer.from('synthetic-private-key')),false);
  threeProof.push(name);return {m,r};
}
const threeSuccess=await threeCase('only 3,4,5 in order; one POST each; 600-second timeout; durable exact intent; no preparation or replay');
for(const [index,item] of threeSuccess.r.items.entries()){
  const result=item.outcome.result as any;
  assert.equal(result.observation.itemId,threeJobs[index].itemId);
  assert.equal(result.observation.summary,`Synthetic independent result ${index+3}`);
  assert.equal(result.observation.insufficientEvidence.factualDescription,'');
  assert.equal(result.review.status,'established');assert.equal(result.projections.length,6);
  assert.deepEqual(result.review.candidatePresentationDurationMs,{numerator:1800,denominator:1});
  assert.deepEqual(item.outcome.usage,(fourSuccess.result.items[index+1].outcome.usage));
  assert.equal(threeSuccess.m.calls[index].body.includes(Buffer.from('Synthetic independent result')),false);
  const boundary=JSON.parse(threeSuccess.m.record().toString().split('\n')[0]);
  assert.equal(boundary.detail.timeoutMs,600000);assert.equal(boundary.detail.maximumHttp,3);
  threeProof.push(`${item.itemId}: unchanged contract and independent validation/PTS/review/usage/cost`);
}
for(const targets of [[jobs[0],...threeJobs.slice(1)],[jobs[1],...threeJobs.slice(1)],fourJobs,
  threeJobs.slice(0,2),[...threeJobs,threeJobs[0]],[threeJobs[0],threeJobs[0],threeJobs[2]],
  [...threeJobs].reverse(),[{...threeJobs[0],itemId:'item-0006'},...threeJobs.slice(1)]]){
  const m=threeMemory();await assert.rejects(()=>executeRemainingThreeInference(targets,threeApproval,m.deps));
  assert.equal(m.calls.length,0);assert.equal(m.record().length,0);assert.deepEqual(m.reads,[0,0,0]);
  threeProof.push('forbidden item/count/order/duplicate rejected before all effects');
}
for(const change of [{maximumHttp:4},{maximumHttp:2},{timeoutMs:599999},{timeoutMs:600001},{retry:1},{repair:1},{approvedBy:'kawafmm'}]){
  const m=threeMemory();await assert.rejects(()=>executeRemainingThreeInference(threeJobs,
    {...threeApproval,...change} as RemainingThreeInferenceApproval,m.deps));
  assert.equal(m.calls.length,0);assert.equal(m.record().length,0);
  threeProof.push('unapproved maximum/timeout/retry/repair/origin rejected before effects');
}
for(const change of [{exactRequests:threeApproval.exactRequests.slice(1)},
  {exactRequests:[...threeApproval.exactRequests].reverse()},{expectedStage1Sha256:'0'.repeat(64)}]){
  const m=threeMemory();const r=await executeRemainingThreeInference(threeJobs,{...threeApproval,...change},m.deps);
  assert.equal(r.status,'stopped');assert.equal(m.calls.length,0);assert.equal(m.record().length,0);
  threeProof.push('missing/reordered request approvals or wrong preparation history rejected without effects');
}
for(let index=0;index<3;index++){
  for(const field of ['stage1','measurement','manifest','price','media','mapping','build'] as const){
    await threeCase(`${threeJobs[index].itemId}: changed or absent ${field} prevents send`,{faultAt:index,
      evidence:async i=>i===index?{...threeEvidence[i],[field]:Buffer.alloc(0)}:threeEvidence[i]},'pre-send-validation',index);
  }
  await threeCase(`${threeJobs[index].itemId}: evidence mutation after durable intent prevents send`,{faultAt:index,
    evidence:async(i,read)=>i===index&&read===2?{...threeEvidence[i],implementationSha256:'f'.repeat(64)}:threeEvidence[i]},
    'pre-send-validation',index);
  {
    const m=threeMemory();m.deps.clock=()=>m.reads[index]>0?'2026-09-08T00:00:00.000Z':'2026-09-05T08:00:00.000Z';
    const r=await executeRemainingThreeInference(threeJobs,threeApproval,m.deps);
    assert.equal(r.status,'stopped');assert.equal(r.actualHttp,index);assert.equal(m.calls.length,index);
    assert.equal(r.items.at(-1)!.outcome.failure!.stage,'pre-send-validation');
    assert.ok(m.reads.slice(index+1).every(n=>n===0));
    threeProof.push(`${threeJobs[index].itemId}: expired saved ACTIVE proof is not current availability or renewed`);
  }
  for(const [kind,response,stage] of [
    ['HTTP failure',{status:500,headers:{},body:bytes({error:'synthetic'})},'inference-http'],
    ['invalid JSON',{status:200,headers:{},body:Buffer.from('{')},'provider-response']
  ] as Array<[string,HttpResponse,string]>){await threeCase(`${threeJobs[index].itemId}: ${kind} fail-fast`,
    {faultAt:index,response},stage,index+1);}
  await threeCase(`${threeJobs[index].itemId}: timeout is unknown delivery without resend`,{faultAt:index,timeout:true},'inference-http',index+1);
  {
    const e=threeEnvelope(index),o=output(threeJobs[index]),v=threeJobs[index].video;
    const end=Math.ceil((v.lastFramePts+v.lastFrameDurationPts)*v.timeBaseNumerator*1000/v.timeBaseDenominator);
    o.roleObservations[0].intervals[0].startTimeMs=end+1000;o.roleObservations[0].intervals[0].endTimeMs=end+2000;
    e.candidates[0].content.parts[0].text=JSON.stringify(o);
    const {m,r}=await threeCase(`${threeJobs[index].itemId}: out-of-range output retained and rejected without clamp/zero-second success`,
      {faultAt:index,response:inferenceResponse(e)},'local-strict-validation',index+1);
    const es=m.record().toString().trimEnd().split('\n').map(line=>JSON.parse(line).detail.event).filter(e=>e?.itemId===threeJobs[index].itemId);
    assert.ok(!es.some(e=>['validated','projected','complete'].includes(e.phase)));
    assert.deepEqual(Buffer.from(es.find(e=>e.phase==='response').detail.rawResponseBase64,'base64'),bytes(e));
    assert.notEqual(r.items.at(-1)!.outcome.usage,null);
  }
  {
    const e=threeEnvelope(index),o=output(threeJobs[index]);o.status='abstain';
    o.roleObservations.forEach(r=>{r.status='notObserved';r.intervals=[];});
    o.insufficientEvidence={present:true,missingEvidence:[...CANDIDATE_VIDEO_ROLE_VALUES_V001],factualDescription:'Synthetic missing evidence.'};
    e.candidates[0].content.parts[0].text=JSON.stringify(o);
    await threeCase(`${threeJobs[index].itemId}: missing review is not zero-second success`,
      {faultAt:index,response:inferenceResponse(e)},'human-review-interval-derivation',index+1);
  }
}
for(const phase of ['batch-boundary','boundary','intent','response','complete','batch-complete']){
  for(const corruptReadback of [false,true]){
    const m=threeMemory({diskPhase:phase,diskItem:phase.startsWith('batch-')?undefined:'item-0004',corruptReadback});
    const r=await executeRemainingThreeInference(threeJobs,threeApproval,m.deps);
    assert.equal(r.status,'stopped');assert.equal(r.actualHttp,m.calls.length);
    assert.equal(m.calls.length,phase==='batch-boundary'?0:phase==='batch-complete'?3:['boundary','intent'].includes(phase)?1:2);
    threeProof.push(`${phase}: persistence ${corruptReadback?'readback':'write'} failure prevents subsequent sends`);
  }
}
{
  const {m}=await threeCase('secret-like response remains omitted in the three-item record',
    {faultAt:1,response:{status:200,headers:{},body:bytes({echo:'synthetic-private-key'})}},'provider-response',2);
  const response=m.record().toString().trimEnd().split('\n').map(line=>JSON.parse(line).detail.event)
    .find(e=>e?.itemId==='item-0004'&&e.phase==='response');assert.equal(response.detail.rawResponseBase64,null);
}
{
  const source=threeSuccess.m.record().toString().trimEnd().split('\n').map(line=>JSON.parse(line));
  for(const change of [
    (es:any[])=>{es.splice(-1,0,...structuredClone(es.filter(e=>e.detail.event?.itemId==='item-0003')));},
    (es:any[])=>{es[0].detail.maximumHttp=4;},
    (es:any[])=>{es[0].detail.timeoutMs=1000;},
    (es:any[])=>{es.find(e=>e.detail.event?.phase==='boundary').detail.event.itemId='item-0002';},
    (es:any[])=>{es.at(-1).detail.completed.pop();},
    (es:any[])=>{es.push(structuredClone(es[1]));}
  ]){const es=structuredClone(source);change(es);es.forEach((e,i)=>{e.sequence=i+1;e.previousSha256=i?es[i-1].sha256:null;
    const {sha256,...content}=e;e.sha256=candidateVideoDigestV002(content);});
    assert.throws(()=>validateRemainingThreeInferenceRecord(Buffer.concat(es.map(bytes)),threeJobs));
    threeProof.push('rehashed fourth send, item-two, timeout or terminal tampering rejected');
  }
}
// Old entry points retain their scopes; their records cannot be relabeled as the new run.
{
  const m=threeMemory();await assert.rejects(()=>executeRemainingInference(threeJobs,fourApproval,m.deps));
  const one=inferenceMemory();const r=await executeItem0001Inference(threeJobs[0],inferenceApproval,one.deps);
  assert.equal(r.status,'stopped');assert.equal(one.calls.length,0);
  assert.throws(()=>validateRemainingInferenceRecord(threeSuccess.m.record(),threeJobs));
  assert.throws(()=>validateRemainingThreeInferenceRecord(stoppedFourRecord,threeJobs));
  assert.equal(validateRemainingInferenceRecord(stoppedFourRecord,fourJobs).terminal,true);
  threeProof.push('one/four-item scopes remain closed; stopped historical record remains a failure, not a resumed run');
}
assert.deepEqual(await readFile(resolve(workspace,REMAINING_INFERENCE_RECORD)),stoppedFourRecord);
for(const [index,path] of preservedInferencePaths.entries())assert.deepEqual(await readFile(resolve(workspace,path)),preservedInferenceBytes[index]);
assert.deepEqual(await readFile(resolve(workspace,PREPARATION_ROOT,'stage1-communication-record-v001.jsonl')),inferenceEvidence.stage1);
assert.deepEqual(await readFile(resolve(workspace,PREPARATION_ROOT,'stage1-measurement-v001.json')),inferenceEvidence.measurement);
assert.deepEqual(await readFile(resolve(workspace,REMAINING_THREE_INFERENCE_RECORD)),stoppedThreeRecord);
threeProof.push('all prior records, including stopped three-item record, byte-identical; no mock disk writes');
process.stdout.write(JSON.stringify({suite:'remaining-three-single-inference',status:'passed',checks:threeProof.length,
  proof:threeProof,liveHttp:0,credentialReads:0,liveRecordWrites:0})+'\n');

// task-022: the singleton uses the same in-memory bounded sink; no live response fixtures.
const fiveProof: string[] = [];
const fiveJobs=[jobs[4]], fiveEvidence=fourEvidence.slice(3), preparedFive=preparedFour.slice(3);
const fiveApproval: Item0005InferenceApproval={...threeApproval,maximumHttp:1,
  exactRequests:fourApproval.exactRequests.slice(3)};
const fiveEnvelope=()=>fourEnvelope(3);
const fiveMemory=(options:Parameters<typeof boundedInferenceMemory>[0]={})=>boundedInferenceMemory(options,
  {jobs:fiveJobs,prepared:preparedFive,evidence:fiveEvidence,response:fiveEnvelope,validate:validateItem0005InferenceRecord});
const fiveEvents=(record:Buffer)=>record.toString().trimEnd().split('\n').map(line=>JSON.parse(line).detail.event).filter(Boolean);
async function fiveCase(name:string,options:Parameters<typeof fiveMemory>[0]={},stage:string|null=null,expectedCalls=1){
  const m=fiveMemory({faultAt:0,...options}),r=await executeItem0005Inference(fiveJobs,fiveApproval,m.deps);
  assert.equal(r.status,stage?'stopped':'completed',name);assert.equal(r.actualHttp,expectedCalls,name);
  assert.equal(m.calls.length,expectedCalls,name);assert.equal(r.origin,'mock');assert.equal(r.retry,0);assert.equal(r.repair,0);
  assert.equal(r.items.length,1);assert.equal(r.items[0].itemId,'item-0005');
  assert.equal(r.items[0].outcome.failure?.stage??null,stage);
  if(stage)assert.equal(r.items[0].outcome.result,null);
  assert.equal(validateItem0005InferenceRecord(m.record(),fiveJobs).terminal,true);
  const before=m.record();
  await assert.rejects(()=>executeItem0005Inference(fiveJobs,fiveApproval,m.deps),/record-already-used/);
  assert.deepEqual(m.record(),before);assert.equal(m.calls.length,expectedCalls);
  assert.equal(m.record().includes(Buffer.from('synthetic-private-key')),false);
  fiveProof.push(name);return {m,r};
}
const fiveSuccess=await fiveCase('only item-five, one exact POST, durable intent, no preparation HTTP or second execution');
{
  const events=fiveEvents(fiveSuccess.m.record()),intent=events.find(e=>e.phase==='intent').detail;
  const boundary=JSON.parse(fiveSuccess.m.record().toString().split('\n')[0]).detail;
  assert.equal(boundary.maximumHttp,1);assert.equal(boundary.timeoutMs,600000);
  assert.deepEqual(boundary.targetItems,['item-0005']);
  for(const operation of ['upload','metadataGet','countTokens'])assert.equal(boundary[operation],0);
  assert.deepEqual(intent.preSendValidation,{status:'passed',itemId:'item-0005',
    providerFileUri:preparedFive[0].exactInference.exact.body.contents[0].parts[0].fileData.fileUri,
    active:true,uploadIntegrity:'passed',metadataIntegrity:'passed',countTokens:'passed',
    countTokensRequestSha256:'3b508cd4a669b05d93b0706f1bdaf3f16be94ae32a3ddd3e60d2512357ff2270',measuredInputTokens:32049});
  assert.equal(intent.exactRequestSha256,'31c53b930bc83dc8d002a1e85a5d84f0a20f4148623baba34d8df57809906448');
  assert.equal(intent.mediaSha256,FIXED_MEDIA_SHAS[4]);assert.equal(intent.mappingBinding.fileSha256,FIXED_MAP_SHAS[4]);
  assert.equal(intent.fileExpirationTime,'2026-09-07T04:14:06.584102393Z');
  const outcome=fiveSuccess.r.items[0].outcome,result=outcome.result as any;
  assert.equal(result.observation.insufficientEvidence.factualDescription,'');
  assert.equal(result.observation.summary,'Synthetic independent result 5');assert.equal(result.projections.length,6);
  assert.equal(result.review.status,'established');
  assert.deepEqual(result.review.candidatePresentationDurationMs,{numerator:1800,denominator:1});
  assert.deepEqual(outcome.usage,fourSuccess.result.items[3].outcome.usage);
  assert.equal(result.adoptionDecisionPermitted,false);
  // task-022 setup correction v001: structuredClone captures Buffer as Uint8Array.
  // First run compared equal 4865-byte contents with different container types;
  // compare bytes explicitly, retaining the unchanged transport and exact fixture.
  const capturedBody=Buffer.from(fiveSuccess.m.calls[0].body);
  assert.deepEqual(capturedBody,bytes(preparedFive[0].exactInference.exact.body));
  assert.equal(capturedBody.includes(Buffer.from('Synthetic independent result')),false);
  fiveProof.push('saved identity/media/mapping/URI/integrity/ACTIVE/32049 tokens/count SHA/expiry and unchanged exact request verified');
  fiveProof.push('same empty-explanation rule, independent output, strict validation, PTS, review union and observed usage/cost');
}
for(const targets of [...jobs.slice(0,4).map(job=>[job]),[{...jobs[4],itemId:'item-0006'}],[],
  [jobs[4],jobs[4]],[jobs[3],jobs[4]],jobs]){
  const m=fiveMemory();await assert.rejects(()=>executeItem0005Inference(targets,fiveApproval,m.deps));
  assert.equal(m.record().length,0);assert.equal(m.calls.length,0);assert.deepEqual(m.reads,[0]);
  fiveProof.push('item-one through four, other item, empty, duplicate or multiple targets rejected before effects');
}
for(const change of [{maximumHttp:0},{maximumHttp:2},{timeoutMs:599999},{timeoutMs:600001},{retry:1},{repair:1},{approvedBy:'kawafmm'}]){
  const m=fiveMemory();await assert.rejects(()=>executeItem0005Inference(fiveJobs,
    {...fiveApproval,...change} as Item0005InferenceApproval,m.deps));
  assert.equal(m.record().length,0);assert.equal(m.calls.length,0);
  fiveProof.push('one-send/600-second/no-retry/no-repair/mock-origin boundary enforced');
}
for(const change of [{exactRequests:[]},{exactRequests:[fiveApproval.exactRequests[0],fiveApproval.exactRequests[0]]},
  {exactRequests:[{...fiveApproval.exactRequests[0],itemId:'item-0004'}]},{expectedStage1Sha256:'0'.repeat(64)}]){
  const m=fiveMemory(),r=await executeItem0005Inference(fiveJobs,{...fiveApproval,...change},m.deps);
  assert.equal(r.status,'stopped');assert.equal(m.record().length,0);assert.equal(m.calls.length,0);
  fiveProof.push('missing/duplicate/wrong-item approval or changed preparation authority rejected');
}
{
  const m=fiveMemory(),r=await executeItem0005Inference(fiveJobs,{...fiveApproval,
    exactRequests:[{itemId:'item-0005',sha256:'0'.repeat(64)}]},m.deps);
  assert.equal(r.items[0].outcome.failure!.stage,'pre-send-validation');assert.equal(m.calls.length,0);
  fiveProof.push('unapproved exact request stops before send');
}
for(const field of ['stage1','measurement','manifest','price','media','mapping','build'] as const){
  for(const changed of [Buffer.alloc(0),Buffer.from('changed')])await fiveCase(`missing/changed ${field} prevents send`,
    {evidence:async()=>({...fiveEvidence[0],[field]:changed})},'pre-send-validation',0);
}
await fiveCase('code mutation after durable intent prevents send',
  {evidence:async(_i,read)=>read===2?{...fiveEvidence[0],implementationSha256:'f'.repeat(64)}:fiveEvidence[0]},'pre-send-validation',0);
for(const when of ['2026-09-07T04:14:06.585Z','2026-09-08T00:00:00.000Z']){
  const m=fiveMemory();m.deps.clock=()=>when;
  const r=await executeItem0005Inference(fiveJobs,fiveApproval,m.deps);
  assert.equal(r.items[0].outcome.failure!.stage,'pre-send-validation');assert.equal(m.calls.length,0);
  assert.ok(!fiveEvents(m.record()).some(e=>e.phase==='intent'));
  fiveProof.push('expired saved file stops before intent, no upload/metadata/count fallback');
}
{
  const m=fiveMemory();m.deps.clock=()=>m.reads[0]>=2?'2026-09-08T00:00:00.000Z':'2026-09-05T08:00:00.000Z';
  const r=await executeItem0005Inference(fiveJobs,fiveApproval,m.deps);
  assert.equal(r.items[0].outcome.failure!.stage,'pre-send-validation');assert.equal(m.calls.length,0);
  assert.ok(fiveEvents(m.record()).some(e=>e.phase==='intent'));
  fiveProof.push('expiry between durable intent and exchange still stops without communication');
}
for(const [kind,response,stage] of [
  ['HTTP error',{status:500,headers:{},body:bytes({error:'synthetic'})},'inference-http'],
  ['redirect',{status:307,headers:{location:'https://example.invalid'},body:bytes({})},'inference-http'],
  ['malformed JSON',{status:200,headers:{},body:Buffer.from('{')},'provider-response']
] as Array<[string,HttpResponse,string]>)await fiveCase(`${kind}: no retry/repair/resend`,{response},stage);
const fiveTimeout=await fiveCase('timeout delivery unknown and never resent',{timeout:true},'inference-http');
assert.equal(fiveTimeout.r.items[0].outcome.failure!.delivery,'unknown');
for(const overflow of [1,100]){
  const o=output(jobs[4]),v=jobs[4].video;
  const duration=(v.lastFramePts+v.lastFrameDurationPts)*v.timeBaseNumerator*1000/v.timeBaseDenominator;
  const end=Math.floor(duration),interval=o.roleObservations[0].intervals[0];
  interval.startTimeMs=end-1000;interval.endTimeMs=end+overflow;
  const e=fiveEnvelope();e.candidates[0].content.parts[0].text=JSON.stringify(o);
  const {m,r}=await fiveCase(`${overflow}ms end overflow rejected without tolerance/clamp/snap`,
    {response:inferenceResponse(e)},'local-strict-validation');
  const es=fiveEvents(m.record());assert.ok(!es.some(e=>['validated','projected','complete'].includes(e.phase)));
  assert.deepEqual(Buffer.from(es.find(e=>e.phase==='response').detail.rawResponseBase64,'base64'),bytes(e));
  assert.notEqual(r.items[0].outcome.usage,null);
}
for(const all of [false,true]){
  const o=output(jobs[4]);o.status=all?'abstain':'partial';
  for(const role of all?o.roleObservations:[o.roleObservations[0]]){role.status='notObserved';role.intervals=[];}
  o.roleObservations.flatMap(r=>r.intervals).forEach((v,i)=>{v.observationId=`observation-${String(i+1).padStart(3,'0')}`;});
  o.insufficientEvidence={present:true,missingEvidence:all?[...CANDIDATE_VIDEO_ROLE_VALUES_V001]:['coreEvent'],factualDescription:'Synthetic missing evidence.'};
  const e=fiveEnvelope();e.candidates[0].content.parts[0].text=JSON.stringify(o);
  await fiveCase(`${all?'abstain':'partial'} cannot become zero-second success`,{response:inferenceResponse(e)},'human-review-interval-derivation');
  o.insufficientEvidence.factualDescription='';e.candidates[0].content.parts[0].text=JSON.stringify(o);
  await fiveCase(`${all?'abstain':'partial'} cannot use answered-only empty explanation exception`,{response:inferenceResponse(e)},'local-strict-validation');
}
assert.ok(jobs[4].sourceMapping.unmappedCandidatePts.length>0);
for(const gap of jobs[4].sourceMapping.unmappedCandidatePts){
  const v=jobs[4].video,start=Math.ceil(gap.startPts*v.timeBaseNumerator*1000/v.timeBaseDenominator),
    end=Math.floor(gap.endPtsExclusive*v.timeBaseNumerator*1000/v.timeBaseDenominator);
  assert.ok(end>start);
  for(const crossing of [false,true]){
    const o=output(jobs[4]);o.roleObservations[0].intervals[0].startTimeMs=crossing?start-100:start;
    o.roleObservations[0].intervals[0].endTimeMs=crossing?end+100:end;
    const e=fiveEnvelope();e.candidates[0].content.parts[0].text=JSON.stringify(o);
    const {m}=await fiveCase(crossing?'concat/gap crossing splits source and preserves unmapped interval':'unmapped-only role has no invented source or zero-second success',
      {response:inferenceResponse(e)},crossing?null:'human-review-interval-derivation');
    const projected=fiveEvents(m.record()).find(e=>e.phase==='projected').detail.projections[0].projection;
    assert.equal(projected.sourceIntervals.length,crossing?2:0);assert.equal(projected.unmappedCandidateIntervals.length,1);
  }
}
{
  const o=output(jobs[4]);
  for(const [i,times] of [[0,[1000,2000]],[1,[1500,2500]],[2,[4000,4500]],[3,[100,500]],[4,[5000,6000]]] as const){
    Object.assign(o.roleObservations[i].intervals[0],{startTimeMs:times[0],endTimeMs:times[1]});}
  const e=fiveEnvelope();e.candidates[0].content.parts[0].text=JSON.stringify(o);
  const {r}=await fiveCase('review uses core/reaction/ending union only; no gap fill or cause/context inclusion',{response:inferenceResponse(e)});
  const review=(r.items[0].outcome.result as any).review;
  assert.equal(review.humanInitialReviewIntervals.length,2);
  assert.deepEqual(review.candidatePresentationDurationMs,{numerator:2000,denominator:1});
}
for(const phase of ['batch-boundary','boundary','intent','response','usage','validated','projected','complete','batch-complete']){
  for(const corruptReadback of [false,true]){
    const m=fiveMemory({diskPhase:phase,corruptReadback}),r=await executeItem0005Inference(fiveJobs,fiveApproval,m.deps);
    assert.equal(r.status,'stopped');assert.equal(r.actualHttp,m.calls.length);
    assert.equal(m.calls.length,['batch-boundary','boundary','intent'].includes(phase)?0:1);
    assert.equal(m.record().includes(Buffer.from('synthetic-private-key')),false);
    fiveProof.push(`${phase}: ${corruptReadback?'readback':'write'} failure stops; pre-send failure has zero HTTP`);
  }
}
for(const raw of [bytes({echo:'synthetic-private-key'}),Buffer.from('{"echo":"synthetic-private-\\u006bey"}'),bytes({nested:{Authorization:'synthetic'}})]){
  const {m}=await fiveCase('secret echo or nested credential field omitted',{response:{status:200,headers:{},body:raw}},'provider-response');
  assert.equal(fiveEvents(m.record()).find(e=>e.phase==='response').detail.rawResponseBase64,null);
}
{
  const source=fiveSuccess.m.record().toString().trimEnd().split('\n').map(line=>JSON.parse(line));
  for(const change of [
    (es:any[])=>{es.splice(-1,0,...structuredClone(es.filter(e=>e.phase==='item-event')));},
    (es:any[])=>{es[0].detail.maximumHttp=2;},
    (es:any[])=>{es[0].detail.targetItems=['item-0004'];},
    (es:any[])=>{es[0].detail.timeoutMs=600100;},
    (es:any[])=>{es.find(e=>e.detail.event?.phase==='intent').detail.communicationCounter=2;},
    (es:any[])=>{es.at(-1).detail.completed=[];},
    (es:any[])=>{es.push(structuredClone(es[1]));}
  ]){const es=structuredClone(source);change(es);es.forEach((e,i)=>{e.sequence=i+1;e.previousSha256=i?es[i-1].sha256:null;
    const {sha256,...content}=e;e.sha256=candidateVideoDigestV002(content);});
    assert.throws(()=>validateItem0005InferenceRecord(Buffer.concat(es.map(bytes)),fiveJobs));
    fiveProof.push('rehashed second send, wrong target, timeout, counter or terminal tampering rejected');
  }
}
{
  const m=fiveMemory();await assert.rejects(()=>executeRemainingInference(fiveJobs,fourApproval,m.deps));
  await assert.rejects(()=>executeRemainingThreeInference(fiveJobs,threeApproval,m.deps));
  const old=inferenceMemory(),r=await executeItem0001Inference(jobs[4],inferenceApproval,old.deps);
  assert.equal(r.status,'stopped');assert.equal(old.calls.length,0);assert.equal(m.calls.length,0);
  assert.throws(()=>validateItem0005InferenceRecord(stoppedFourRecord,fiveJobs));
  assert.throws(()=>validateItem0005InferenceRecord(stoppedThreeRecord,fiveJobs));
  assert.equal(validateRemainingThreeInferenceRecord(stoppedThreeRecord,threeJobs).terminal,true);
  fiveProof.push('old one/four/three scopes unchanged; stopped records cannot become the singleton record');
}
for(const [index,path] of preservedInferencePaths.entries())assert.deepEqual(await readFile(resolve(workspace,path)),preservedInferenceBytes[index]);
assert.deepEqual(await readFile(resolve(workspace,REMAINING_INFERENCE_RECORD)),stoppedFourRecord);
assert.deepEqual(await readFile(resolve(workspace,REMAINING_THREE_INFERENCE_RECORD)),stoppedThreeRecord);
assert.deepEqual(await readFile(resolve(workspace,PREPARATION_ROOT,'stage1-communication-record-v001.jsonl')),inferenceEvidence.stage1);
assert.deepEqual(await readFile(resolve(workspace,PREPARATION_ROOT,'stage1-measurement-v001.json')),inferenceEvidence.measurement);
assert.equal(ITEM0005_INFERENCE_RECORD,`${PREPARATION_ROOT}/item-0005-inference-record-v001.jsonl`);
assert.deepEqual(await readFile(resolve(workspace,ITEM0005_INFERENCE_RECORD)),preservedFiveRecord);
fiveProof.push('all historical bytes including the completed singleton record preserved; mock evidence never written to disk');
process.stdout.write(JSON.stringify({suite:'item-0005-single-inference',status:'passed',checks:fiveProof.length,
  proof:fiveProof,liveHttp:0,credentialReads:0,liveRecordWrites:0})+'\n');

// task-027: a separate proof collection, never placed in the historical draft
// generator below. No ID input/plan/execution/comparison artifact is written.
if (!process.argv.includes('--artifact-draft') && !process.argv.includes('--verify-artifacts')) {
  const idMockProof: string[] = [];
  const idInputs = await loadCandidateVideoIdInputsV003(workspace);
  const mockFiles = idInputs.map(input => ({itemId: input.itemId,
    fileUri: `https://generativelanguage.googleapis.com/v1beta/files/mock-id-${input.itemId}`}));
  const futureRoot = 'evals/clip_composition/outputs/work-candidate-video-understanding-recalibration-v001';
  const futurePaths = ['input-id-table-v001.json', 'execution-plan-v001.json', 'execution-record-v001.jsonl',
    'paired-comparison-v001.json'].map(name => `${futureRoot}/${name}`);
  for (const path of futurePaths) await assert.rejects(() => readFile(resolve(workspace, path)), {code: 'ENOENT'});
  const preservedPaths = ['docs/CURRENT_GOAL.md', 'docs/GOAL_DEFINITION.md',
    'docs/ZEV_候補動画理解_ID参照再較正計画_v001.md',
    'docs/reports/candidate-video-understanding-numeric-time-calibration-summary-v001.md',
    ...preservedInferencePaths, REMAINING_INFERENCE_RECORD, REMAINING_THREE_INFERENCE_RECORD, ITEM0005_INFERENCE_RECORD,
    `${PREPARATION_ROOT}/stage1-communication-record-v001.jsonl`, `${PREPARATION_ROOT}/stage1-measurement-v001.json`,
    `${PREPARATION_ROOT}/job-manifest-v001.json`, `${PREPARATION_ROOT}/provider-spec-and-price-snapshot-v001.json`];
  const preservedBefore = await Promise.all(preservedPaths.map(path => readFile(resolve(workspace, path))));
  function idOutput(input: CandidateVideoIdInputV003): CandidateVideoIdProviderOutputV003 {
    return {schemaVersion: 'candidate-video-understanding-id-provider-output-v003', itemId: input.itemId,
      observations: input.segments.flatMap(segment => CANDIDATE_VIDEO_ID_ROLES_V003.map(role => ({
        role, segmentId: segment.segmentId, status: 'notObserved' as const,
        description: 'この入力からは確認できない。', evidenceUtteranceRanges: [], evidenceKinds: [],
        reactionKind: role === 'reaction' ? 'unknown' as const : 'notApplicable' as const,
        idLocation: 'segmentOnlyEventUnresolved' as const, unconfirmedPoints: ['判断材料不足'],
        causalScope: 'notClaimed' as const, causalEvidence: []}))) };
  }
  function idEnvelope(index: number) {
    const observed = idOutput(idInputs[Math.floor(index / 2)]);
    // Deliberately different answers. None may enter any of the ten requests.
    observed.observations[0].description += ` synthetic-answer-${String.fromCharCode(97 + index)}`;
    return {modelVersion: 'gemini-3.8-flash', candidates: [{finishReason: 'STOP',
      content: {role: 'model', parts: [{text: JSON.stringify(observed)}]}}],
      usageMetadata: {promptTokenCount: 100, candidatesTokenCount: 20, thoughtsTokenCount: 30, totalTokenCount: 150}};
  }
  type IdEnvelope = ReturnType<typeof idEnvelope>;
  function idMemory(options: {faultAt?: number; alter?(value: IdEnvelope): void;
    response?(value: IdEnvelope): HttpResponse; throwAt?: number} = {}) {
    const calls: HttpRequest[] = [];
    const plan = buildCandidateVideoIdMockPlanV003(idInputs, mockFiles);
    const port: HttpPort = {mode: 'mock', async exchange(request) {
      const index = calls.length;
      assert.equal(index < 10, true);
      calls.push({...request, headers: {...request.headers}, body: Buffer.from(request.body)});
      assert.equal(request.method, 'POST');
      assert.equal(request.url, plan.targets[index].request.url);
      assert.deepEqual(request.body, bytes(plan.targets[index].request.body));
      assert.deepEqual(request.headers, {'Content-Type': 'application/json'});
      if (options.throwAt === index) throw new Stage1Timeout();
      const value = idEnvelope(index);
      if (index === (options.faultAt ?? 0)) {
        options.alter?.(value);
        if (options.response) return options.response(value);
      }
      return {status: 200, headers: {}, body: bytes(value)};
    }};
    const deps = {port, clock: () => '2026-09-05T12:00:00.000Z',
      containsSecret: (raw: Buffer) => raw.includes(Buffer.from('synthetic-private-key'))};
    return {plan, calls, deps, run: () => executeCandidateVideoIdMockV003(idInputs, plan, deps)};
  }
  function changeIdOutput(envelopeValue: IdEnvelope, change: (value: CandidateVideoIdProviderOutputV003) => void) {
    const value = JSON.parse(envelopeValue.candidates[0].content.parts[0].text) as CandidateVideoIdProviderOutputV003;
    change(value); envelopeValue.candidates[0].content.parts[0].text = JSON.stringify(value);
  }
  function observedFirst(value: CandidateVideoIdProviderOutputV003, utteranceId: string) {
    Object.assign(value.observations[0], {status: 'observed', description: '入力発話の内容を確認した。',
      evidenceUtteranceRanges: [{fromUtteranceId: utteranceId, throughUtteranceId: utteranceId}],
      evidenceKinds: ['transcript'], idLocation: 'evidenceUtterancesOnly', unconfirmedPoints: []});
  }
  async function rejectedIdOutput(label: string, change: (value: CandidateVideoIdProviderOutputV003) => void,
    faultAt = 0) {
    const memory = idMemory({faultAt, alter: value => changeIdOutput(value, change)});
    const result = await memory.run();
    assert.equal(result.status, 'stopped'); assert.equal(memory.calls.length, faultAt + 1);
    assert.equal(result.mockExchanges, faultAt + 1); assert.equal(result.targets.length, 10);
    assert.equal(result.targets[faultAt].delivery, 'response-received');
    assert.equal(result.targets[faultAt].acceptance, 'rejected');
    assert.equal(result.targets[faultAt].fee.simulatedUsageStatus, 'available');
    assert.equal(result.targets[faultAt].fee.actualCharge, 'mock-no-charge');
    assert.equal(result.targets[faultAt].result, null);
    for (const target of result.targets.slice(faultAt + 1)) {
      assert.equal(target.delivery, 'not-sent'); assert.equal(target.acceptance, 'not-evaluated');
      assert.equal(target.notSentReason, 'global-stop'); assert.equal(target.usage, null);
    }
    const phases = result.events.filter(event => event.itemId === result.targets[faultAt].itemId
      && event.condition === result.targets[faultAt].condition).map(event => event.phase);
    assert.deepEqual(phases, ['intent', 'response', 'usage', 'failure']);
    assert.equal(result.retry, 0); assert.equal(result.repair, 0); assert.equal(result.actualApiCalls, 0);
    idMockProof.push(label); return {memory, result};
  }
  const idNormal = idMemory(); const normalIdResult = await idNormal.run();
  assert.equal(normalIdResult.status, 'completed'); assert.equal(normalIdResult.globalStop, null);
  assert.equal(idNormal.calls.length, 10); assert.equal(normalIdResult.mockExchanges, 10);
  assert.deepEqual(normalIdResult.targets.map(target => `${target.itemId}/${target.condition}`),
    idInputs.flatMap(input => [`${input.itemId}/A`, `${input.itemId}/B`]));
  assert.equal(normalIdResult.targets.every(target => target.delivery === 'response-received'
    && target.acceptance === 'accepted' && target.result !== null), true);
  for (const field of ['actualApiCalls', 'paidInference', 'upload', 'metadataGet', 'countTokens',
    'actualApiCostUsd', 'officialArtifactWrites', 'retry', 'repair'] as const) assert.equal(normalIdResult[field], 0);
  idMockProof.push('five fixed items, A then B once each, ten independent mocks; all actual activity and retry/repair zero');
  for (const [index, input] of idInputs.entries()) {
    const a = JSON.parse(idNormal.calls[index * 2].body.toString());
    const b = JSON.parse(idNormal.calls[index * 2 + 1].body.toString());
    const media = b.contents[0].parts.filter((part: any) => part.fileData);
    assert.equal(media.length, 1);
    assert.equal(media[0].fileData.fileUri, mockFiles[index].fileUri);
    b.contents[0].parts = b.contents[0].parts.filter((part: any) => !part.fileData);
    assert.deepEqual(b, a);
    assert.equal(a.contents.length, 1); assert.equal(a.contents[0].role, 'user');
    assert.deepEqual(a, buildCandidateVideoIdRequestV003(input, 'A').body);
    assert.equal(JSON.stringify(a).includes('synthetic-answer-'), false);
    assert.equal(JSON.stringify(b).includes('synthetic-answer-'), false);
    for (const segment of input.segments) for (const id of segment.targetUtteranceIds)
      assert.equal(JSON.stringify(a).includes(id), true);
    idMockProof.push(`${input.itemId}: exact common payload, schema and candidate IDs; only media added and no answer shared`);
  }
  await assert.rejects(() => idNormal.run(), /already-used-no-retry/u);
  assert.equal(idNormal.calls.length, 10);
  idMockProof.push('the same mock plan cannot be sent a second time');
  {
    let callbacks = 0; const livePlan = buildCandidateVideoIdMockPlanV003(idInputs, mockFiles);
    await assert.rejects(() => executeCandidateVideoIdMockV003(idInputs, livePlan, {
      port: {mode: 'live', async exchange() { callbacks++; throw new Error('must-not-be-called'); }},
      clock: () => { callbacks++; return ''; }, containsSecret: () => { callbacks++; return false; }}), /live-port-forbidden/u);
    assert.equal(callbacks, 0);
    const mock = idMemory();
    await assert.rejects(() => executeCandidateVideoIdMockV003(idInputs, mock.plan,
      {...mock.deps, records: {append: () => { callbacks++; }}} as any), /no-artifact-sink/u);
    assert.equal(mock.calls.length, 0); assert.equal(callbacks, 0);
    idMockProof.push('live ports and artifact sinks rejected before every callback');
  }
  {
    const memory = idMemory();
    memory.deps.clock = () => { memory.deps.port.mode = 'live'; return '2026-09-05T12:00:00.000Z'; };
    const result = await memory.run();
    assert.equal(result.status, 'stopped'); assert.equal(memory.calls.length, 0);
    assert.equal(result.targets[0].delivery, 'not-sent'); assert.equal(result.actualApiCalls, 0);
    idMockProof.push('a port switched away from mock after planning is rejected immediately before exchange');
  }
  const mutations: Array<[string, (plan: CandidateVideoIdMockPlanV003) => void]> = [
    ['duplicate target', plan => { plan.targets[1] = structuredClone(plan.targets[0]); }],
    ['missing target', plan => { plan.targets.pop(); }],
    ['wrong order', plan => { [plan.targets[0], plan.targets[2]] = [plan.targets[2], plan.targets[0]]; }],
    ['unapproved count', plan => { (plan as any).maximumMockExchanges = 11; }],
    ['retry requested', plan => { (plan as any).retry = 1; }],
    ['repair requested', plan => { (plan as any).repair = 1; }],
    ['old token measurement inserted', plan => { (plan as any).measuredInputTokens = 32350; }],
    ['input digest changed', plan => { plan.targets[0].inputSha256 = '0'.repeat(64); }],
    ['exact request changed', plan => { (plan.targets[0].request.body as any).previousAnswer = 'synthetic forbidden answer'; }],
    ['condition binding changed', plan => { plan.targets[0].condition = 'B'; }]
  ];
  for (const [label, change] of mutations) {
    const memory = idMemory(); change(memory.plan);
    await assert.rejects(() => memory.run()); assert.equal(memory.calls.length, 0);
    idMockProof.push(`${label}: no mock exchange`);
  }
  const firstId = idInputs[0].segments[0].targetUtteranceIds[0];
  await rejectedIdOutput('unknown utterance ID rejected without repair; raw and usage preserved', value => {
    observedFirst(value, 'semantic-utterance-999999'); });
  await rejectedIdOutput('a valid ID belonging only to another item is rejected', value => {
    observedFirst(value, idInputs[1].segments[0].targetUtteranceIds[0]); });
  await rejectedIdOutput('another segment ID cannot be smuggled through an evidence range', value => {
    observedFirst(value, idInputs[0].segments[1].targetUtteranceIds[0]); });
  await rejectedIdOutput('an unknown segment is rejected', value => { value.observations[0].segmentId = 'segment-9999'; });
  await rejectedIdOutput('wrong root item is rejected', value => { value.itemId = 'item-0002'; });
  await rejectedIdOutput('numeric time field is rejected, never treated as an ID observation', value => {
    (value.observations[0] as any).startTimeMs = 0; });
  await rejectedIdOutput('numeric position in prose is rejected, not extracted', value => {
    value.observations[0].description = '映像の 12.5 秒で出来事が起きた。'; });
  await rejectedIdOutput('cross-segment direct causality rejected even when both IDs are real', value => {
    const reaction = value.observations.find(observation => observation.role === 'reaction')!;
    const other = idInputs[0].segments[1];
    Object.assign(reaction, {status: 'observed', description: '連結先の場面が直接引き起こした反応。',
      reactionKind: 'direct', evidenceKinds: ['transcript'],
      evidenceUtteranceRanges: [{fromUtteranceId: firstId, throughUtteranceId: firstId}],
      idLocation: 'evidenceUtterancesOnly', causalScope: 'withinSegment',
      causalEvidence: [{segmentId: other.segmentId, fromUtteranceId: other.targetUtteranceIds[0],
        throughUtteranceId: other.targetUtteranceIds[0]}]}); });
  await rejectedIdOutput('A may not claim unavailable video evidence', value => {
    observedFirst(value, firstId); value.observations[0].evidenceKinds = ['video']; });
  await rejectedIdOutput('unconfirmed visual evidence is not an event-absent declaration', value => {
    (value.observations[0] as any).status = 'eventAbsent'; });
  await rejectedIdOutput('one rejected B stops before the next item; remaining eight are not sent', value => {
    observedFirst(value, 'semantic-utterance-999999'); }, 1);
  {
    const memory = idMemory({faultAt: 1, alter: envelopeValue => changeIdOutput(envelopeValue, value => {
      const reaction = value.observations.find(observation => observation.role === 'reaction')!;
      Object.assign(reaction, {status: 'observed', description: '映像で無言の反応を確認した。',
        evidenceKinds: ['video'], reactionKind: 'silent', unconfirmedPoints: ['発話で正確な位置を決められない。']});
    })});
    const result = await memory.run();
    assert.equal(result.status, 'completed'); assert.equal(result.targets[1].acceptance, 'accepted');
    const raw = Buffer.from(result.events.find(event => event.condition === 'B' && event.phase === 'response')!
      .detail.rawResponseBase64 as string, 'base64');
    const observation = JSON.parse(JSON.parse(raw.toString()).candidates[0].content.parts[0].text);
    const silent = observation.observations.find((value: any) => value.reactionKind === 'silent');
    assert.deepEqual(silent.evidenceUtteranceRanges, []); assert.equal(silent.idLocation, 'segmentOnlyEventUnresolved');
    assert.deepEqual(result.targets[1].result, resolveCandidateVideoIdEvidenceV003(idInputs[0], 'B', observation));
    idMockProof.push('B silent event accepted with segment only and deterministic unresolved result, no proxy utterance');
  }
  await rejectedIdOutput('B silent reaction cannot borrow a nearby real utterance as its event position', value => {
    const reaction = value.observations.find(observation => observation.role === 'reaction')!;
    Object.assign(reaction, {status: 'observed', description: '映像で無言の反応を確認した。',
      evidenceKinds: ['video'], reactionKind: 'silent', idLocation: 'evidenceUtterancesOnly',
      evidenceUtteranceRanges: [{fromUtteranceId: firstId, throughUtteranceId: firstId}]});
  }, 1);
  for (const kind of ['direct', 'retrospective'] as const) {
    const memory = idMemory({alter: envelopeValue => changeIdOutput(envelopeValue, value => {
      const segment = idInputs[0].segments[0];
      const reaction = value.observations.find(observation => observation.role === 'reaction')!;
      const range = {fromUtteranceId: firstId, throughUtteranceId: segment.targetUtteranceIds[1]};
      Object.assign(reaction, {status: 'observed', description: kind === 'direct' ? '同じ場面の出来事への直接反応。' : '後からの感想。',
        evidenceKinds: ['transcript'], reactionKind: kind, idLocation: 'evidenceUtterancesOnly',
        evidenceUtteranceRanges: [range], unconfirmedPoints: [], causalScope: kind === 'direct' ? 'withinSegment' : 'notClaimed',
        causalEvidence: kind === 'direct' ? [{segmentId: segment.segmentId,
          fromUtteranceId: firstId, throughUtteranceId: firstId}] : []});
    })});
    const result = await memory.run(); assert.equal(result.status, 'completed');
    const reaction = result.targets[0].result!.observations.find(observation => observation.observation.role === 'reaction')!;
    assert.equal(reaction.observation.reactionKind, kind);
    assert.equal(reaction.eventPosition, 'unresolved');
    idMockProof.push(`${kind}: distinct reaction kind preserved without final event or cut boundary`);
  }
  {
    const memory = idMemory({alter: envelopeValue => changeIdOutput(envelopeValue, value => observedFirst(value, firstId))});
    const result = await memory.run(); assert.equal(result.status, 'completed');
    const observed = idOutput(idInputs[0]); observedFirst(observed, firstId);
    assert.deepEqual(result.targets[0].result, resolveCandidateVideoIdEvidenceV003(idInputs[0], 'A', observed));
    assert.deepEqual(result.targets[0].result, resolveCandidateVideoIdEvidenceV003(idInputs[0], 'A', observed));
    idMockProof.push('accepted ID evidence resolves deterministically through the local formal-time resolver');
  }
  {
    const memory = idMemory({throwAt: 1}); const result = await memory.run();
    assert.equal(result.status, 'stopped'); assert.equal(memory.calls.length, 2);
    assert.equal(result.targets[1].delivery, 'unknown'); assert.equal(result.targets[1].acceptance, 'not-evaluated');
    assert.equal(result.targets[1].fee.simulatedUsageStatus, 'unavailable');
    assert.equal(result.targets[1].fee.simulatedEstimate, null); assert.equal(result.targets[1].result, null);
    assert.equal(result.targets.slice(2).every(target => target.delivery === 'not-sent'), true);
    assert.equal(result.globalStop?.reason, 'timeout-no-resend');
    idMockProof.push('send outcome unknown remains unknown; no inferred free charge, retry or later target');
  }
  for (const [label, response, acceptance, usageStatus] of [
    ['HTTP failure with known usage', (value: IdEnvelope) => ({status: 503, headers: {}, body: bytes(value)}), 'not-evaluated', 'available'],
    ['missing usage', (value: IdEnvelope) => { delete (value as any).usageMetadata;
      return {status: 200, headers: {}, body: bytes(value)}; }, 'not-evaluated', 'incomplete'],
    ['invalid usage total', (value: IdEnvelope) => { value.usageMetadata.totalTokenCount = 151;
      return {status: 200, headers: {}, body: bytes(value)}; }, 'not-evaluated', 'incomplete'],
    ['invalid provider envelope', (value: IdEnvelope) => { value.modelVersion = 'unapproved-model';
      return {status: 200, headers: {}, body: bytes(value)}; }, 'not-evaluated', 'available'],
    ['invalid structured JSON', (value: IdEnvelope) => { value.candidates[0].content.parts[0].text = '{';
      return {status: 200, headers: {}, body: bytes(value)}; }, 'rejected', 'available'],
    ['unparseable response', (_value: IdEnvelope) => ({status: 200, headers: {}, body: Buffer.from('{')}), 'not-evaluated', 'unavailable']
  ] as const) {
    const memory = idMemory({response}); const result = await memory.run();
    assert.equal(result.status, 'stopped'); assert.equal(memory.calls.length, 1);
    assert.equal(result.targets[0].delivery, 'response-received');
    assert.equal(result.targets[0].acceptance, acceptance);
    assert.equal(result.targets[0].fee.simulatedUsageStatus, usageStatus);
    assert.equal(result.events.some(event => event.phase === 'response' && event.detail.rawResponseBase64 !== null), true);
    assert.equal(result.targets.slice(1).every(target => target.delivery === 'not-sent'), true);
    idMockProof.push(`${label}: receipt, acceptance, usage and global stop kept separate`);
  }
  {
    const memory = idMemory({response: value => {
      value.candidates[0].content.parts[0].text = JSON.stringify({echo: 'synthetic-private-key'});
      return {status: 200, headers: {'authorization': 'never-saved'}, body: bytes(value)};
    }}); const result = await memory.run();
    assert.equal(result.status, 'stopped'); assert.equal(result.targets[0].delivery, 'response-received');
    assert.equal(result.events.find(event => event.phase === 'response')!.detail.rawResponseBase64, null);
    assert.equal(JSON.stringify(result).includes('synthetic-private-key'), false);
    assert.equal(JSON.stringify(result).includes('never-saved'), false);
    idMockProof.push('secret-bearing response retained only as digest and omission reason, no secret or provider header');
  }
  for (const [index, event] of normalIdResult.events.entries()) {
    const {sha256, ...content} = event;
    assert.equal(event.sequence, index + 1);
    assert.equal(event.previousSha256, index === 0 ? null : normalIdResult.events[index - 1].sha256);
    assert.equal(candidateVideoDigestV002(content), sha256);
  }
  idMockProof.push('memory-only intent, raw, usage and accepted observations form a reproducible ordered evidence chain');
  for (const [index, path] of preservedPaths.entries())
    assert.deepEqual(await readFile(resolve(workspace, path)), preservedBefore[index]);
  for (const path of futurePaths) await assert.rejects(() => readFile(resolve(workspace, path)), {code: 'ENOENT'});
  idMockProof.push('goal, prior calibration and communication bytes unchanged; all four future artifacts remain absent');
  process.stdout.write(JSON.stringify({suite: 'id-reference-ab-mock-v003', status: 'passed', checks: idMockProof.length,
    proof: idMockProof, mockExchanges: normalIdResult.mockExchanges, realApiCalls: 0, paidInference: 0,
    countTokens: 0, upload: 0, retry: 0, repair: 0, officialArtifactWrites: 0}) + '\n');
}

// Historical draft generator remains read-only; never republish the already approved three artifacts.
const links = {
  model: 'https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash',
  video: 'https://ai.google.dev/gemini-api/docs/generate-content/video-understanding',
  resolution: 'https://ai.google.dev/gemini-api/docs/generate-content/media-resolution',
  thinking: 'https://ai.google.dev/gemini-api/docs/generate-content/thinking',
  structured: 'https://ai.google.dev/gemini-api/docs/generate-content/structured-output',
  files: 'https://ai.google.dev/gemini-api/docs/files', filesReference: 'https://ai.google.dev/api/files',
  tokens: 'https://ai.google.dev/api/tokens', generation: 'https://ai.google.dev/api/generate-content',
  pricing: 'https://ai.google.dev/gemini-api/docs/pricing'
};
const snapshot = {
  schemaVersion: 'candidate-video-understanding-provider-spec-price-snapshot-v001', checkedOn: '2026-09-05',
  verificationMethod: 'Read public official Google documentation; no API endpoint, key, or SDK calls.', sources: links,
  model: 'gemini-3.8-flash', transport: 'direct-REST-v1beta',
  settings: {mediaProcessing: 'STATIC', fps: 1, mediaResolution: 'MEDIA_RESOLUTION_HIGH', thinkingLevel: 'MEDIUM',
    responseMimeType: 'application/json', responseJsonSchema: 'supported-subset-plus-local-strict-validation', maxOutputTokens: 4096},
  claims: [
    {source: links.model, statement: 'Stable model accepts video and audio and supports structured output and medium thinking.'},
    {source: links.video, statement: 'Static video understanding supports fixed FPS sampling and Files API media input. Explicit STATIC and 1 FPS are retained.'},
    {source: links.resolution, statement: 'Per-part media resolution is available in v1beta and marked experimental. Gemini 3 high-resolution video table lists 280 tokens per frame.'},
    {source: links.video, statement: 'Generic video guide estimates about 300 tokens per second at default sampling, with an audio component of about 32 tokens per second. This is not exact countTokens evidence.'},
    {source: links.thinking, statement: 'Medium is relative reasoning effort, not a pre-fixed thinking token count.'},
    {source: links.structured, statement: 'Provider supports a JSON Schema subset. Local semantic, timing, role and extra-field validation remain mandatory.'},
    {source: links.filesReference, statement: 'File metadata includes name, URI, MIME type, byte size, base64 SHA-256 and processing state. Only ACTIVE proceeds; at most one GET.'},
    {source: links.files, statement: 'Files API storage is free and files expire after 48 hours. Upload session URL remains in memory only.'},
    {source: links.tokens, statement: 'countTokens accepts generateContentRequest including generationConfig; full inference body is nested with model. No fallback request is sent on failure.'},
    {source: links.generation, statement: 'maxOutputTokens is the configured response-candidate limit. A separate guaranteed 4096 visible tokens plus fixed thinking allocation is not asserted.'},
    {source: links.pricing, statement: 'Standard introductory price through 2026-12-31: input USD 0.75 per million; output including thinking USD 3.75 per million. Not an invoice or total spending cap.'}
  ],
  standardPrice: {inputNanoUsdPerToken: 750, outputIncludingThinkingNanoUsdPerToken: 3750, validThrough: '2026-12-31'},
  implementationNotes: {sdkInstalledUnchanged: '@google/genai 1.52.0', sdkUploadRetriesAndFilenameAvoided: true,
    sdkCountTokensGenerationConfigRejectionAvoidedByDirectREST: true,
    liveProviderAcceptanceNotTested: true, currentApiCalls: 0}
};
const implementationPaths = ['runner/src/candidate-video-understanding-v001.ts',
  'runner/src/candidate-video-understanding-transport-v001.ts'];
const testPaths = ['runner/src/candidate-video-understanding-v001.test.ts',
  'runner/src/candidate-video-understanding-transport-v001.test.ts'];
const bindCode = async (paths: string[]) => Promise.all(paths.map(async path => ({path, fileSha256: byteSha(await readFile(resolve(workspace, path)))})));
const implementations = await bindCode(implementationPaths);
const tests = await bindCode(testPaths);
const templates = jobs.map(job => {
  const template = buildCandidateVideoRequestTemplateV002(job);
  return {itemId: job.itemId, template, templateSha256: candidateVideoDigestV002(template),
    exactRequestSha256: null, inputTokenCount: null};
});
const manifest = {
  schemaVersion: 'candidate-video-understanding-job-manifest-v001', classification: 'calibration',
  status: 'local-preparation-only-not-live-ready', providerSpecPriceSnapshot: {path: `${PREPARATION_ROOT}/provider-spec-and-price-snapshot-v001.json`, fileSha256: byteSha(bytes(snapshot))},
  implementations, jobs, templates,
  baselineDerivation: {candidatePointsMs: points, semanticBinding, beforeMs: 16000, afterMs: 16000,
    source: 'Previously approved comparison-plan-v002 candidate points, rechecked against bound semantic utterance boundaries.', totalPresentationMs: 413837},
  exploration: {selectedSourceDurationMs: 543592, actualFrameTimelineDurationMs: 543750,
    windowBeforeMs: 34880, windowAfterMs: 15378, humanTruthUsedInWindowDesign: true,
    independentValidation: false, adoptionDecisionPermitted: false},
  futureCommunicationLimits: {total: 25, uploadStart: 5, uploadFinalize: 5, metadataGet: 5, countTokens: 5, inference: 5,
    retry: 0, repair: 0, automaticRedirect: 0, extraPoll: 0},
  futureApprovalPhases: [{phase: 'upload-and-count', maximumHttp: 20, authorized: false},
    {phase: 'inference', maximumHttp: 5, authorized: false, requiresExactRequestAndMeasuredTokenApproval: true}],
  futureJournal: {organization: 'one-ordered-hash-chained-append-record-per-experiment-filterable-by-item',
    intentBeforeSend: true, immutableFailureHistory: true, secretHeadersAndSessionUrlPersisted: false,
    durableSinkRequiredBeforeLive: true, noLiveArtifactRootCreated: true},
  mockResultsCanAuthorizeLive: false
};
const report = {
  schemaVersion: 'candidate-video-understanding-local-preflight-v001', classification: 'calibration',
  status: 'local-mock-passed-not-authorized-for-live', manifest: {path: `${PREPARATION_ROOT}/job-manifest-v001.json`, fileSha256: byteSha(bytes(manifest))},
  implementations, tests, checks: proof, checkCount: proof.length, fileVerification,
  separatelyExecutedValidation: {legacyFixtureAssertions: 341, addedRealMappingRoleAndReviewChecks: 71,
    legacyAndNewFixtureExitCode: 0, runnerTypecheckExitCode: 0,
    commands: ['corepack pnpm --dir runner exec tsx src/candidate-video-understanding-v001.test.ts',
      'corepack pnpm --dir runner exec tsc -p tsconfig.json --noEmit']},
  mockRun: {mode: 'mock-only', exactRequestSha256sAreNotLive: true, measured, results, orderedCommunicationRecord: journal,
    syntheticUploadByteSha256: byteSha(mockBytes),
    syntheticJobTransformation: 'Clone real local job, replace exploration video SHA with synthetic byte SHA; never promote these mock jobs or results.',
    httpCounts: transport.snapshot.counts, retry: 0, repair: 0},
  liveActivity: {gemini: 0, files: 0, countTokens: 0, apiKeyReads: 0, actualApiCostUsd: 0,
    videosGenerated: 0, humanReviewArtifactReads: 0, mappingsChanged: 0, workflowConnected: false},
  estimate: {kind: 'nonbinding-estimate-not-cap-or-invoice', actualFrameTimelineDurationMs: 543750,
    genericGuide300TokensPerSecond: {mediaTokensApproximate: 163125, inputUsdApproximate: 0.12234375},
    modelSpecificHigh280VideoPlus32AudioPerSecond: {videoTokensApproximate: 152250, audioTokensApproximate: 17400,
      mediaTokensApproximate: 169650, inputUsdApproximate: 0.1272375},
    promptAndSchemaTokens: null, promptAndSchemaReason: 'unmeasured-no-countTokens-communication',
    configuredMaxOutputTokensPerInference: 4096, fiveConfiguredResponseTokenAllowances: 20480,
    configuredResponseAllowanceUsd: 0.0768, thinkingTokens: null,
    genericMediaPlusResponseAllowanceUsd: 0.19914375, modelSpecificMediaPlusResponseAllowanceUsd: 0.2040375,
    exclusions: ['prompt/schema', 'timestamp or other media overhead', 'unknown thinking'], totalExactUsd: null},
  remainingDecisions: ['Separate approval for 20 upload/count HTTP requests and timeout policy.',
    'A durable append-only journal sink and future artifact paths must be authorized before live use.',
    'Present real file references, exact requests, actual countTokens and cost estimates; obtain separate approval for five inferences.',
    'Verify price period and expired Files API references before live execution; no automatic reupload.',
    'Five examples are calibration only; unused validation required before adoption.'],
  earlierLocalTestEvidence: [
    {kind: 'environment', outcome: 'TSX local IPC denied inside sandbox; approved same local fixture command rerun outside sandbox; zero API calls.'},
    {kind: 'test-harness', outcome: 'Legacy 341 assertions passed; new regression used segmentId instead of mappingSegmentId and failed. Test access corrected; no mapping artifact modified.'}
  ]
};
if (process.argv.includes('--artifact-draft')) {
  process.stdout.write(JSON.stringify({files: {
    [`${PREPARATION_ROOT}/job-manifest-v001.json`]: bytes(manifest).toString(),
    [`${PREPARATION_ROOT}/provider-spec-and-price-snapshot-v001.json`]: bytes(snapshot).toString(),
    [`${PREPARATION_ROOT}/local-preflight-report-v001.json`]: bytes(report).toString()
  }}) + '\n');
} else if (process.argv.includes('--verify-artifacts')) {
  for (const [name, value] of [['job-manifest-v001.json', manifest], ['provider-spec-and-price-snapshot-v001.json', snapshot], ['local-preflight-report-v001.json', report]] as const) {
    assert.deepEqual(await readFile(resolve(workspace, PREPARATION_ROOT, name)), bytes(value));
  }
  process.stdout.write(JSON.stringify({status: 'passed', checkCount: proof.length, canonicalArtifactsVerified: 3, actualApiCalls: 0}) + '\n');
} else process.stdout.write(JSON.stringify({status: 'passed', checkCount: proof.length, proof, fileVerification, actualApiCalls: 0}) + '\n');
