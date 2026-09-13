import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';

import {
  CANDIDATE_VIDEO_ID_ROLES_V003,
  CANDIDATE_VIDEO_ID_PROMPT_V003,
  CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004,
  CANDIDATE_VIDEO_ID_FIXED_TARGETS_V004,
  CANDIDATE_VIDEO_ID_LIMITS_V004,
  CANDIDATE_VIDEO_ID_TIMEOUTS_V004,
  CANDIDATE_VIDEO_ID_INFERENCE_POLICY_V004,
  CANDIDATE_VIDEO_ID_PROFILE_V005,
  assertCandidateVideoIdProfileV005,
  buildCandidateVideoIdFixedRequestsV005,
  assertCandidateVideoIdFixedRequestsV005,
  assertCandidateVideoIdRequestDeltaV005,
  buildCandidateVideoIdPriceReviewV005,
  assertCandidateVideoIdPriceReviewV005,
  type CandidateVideoIdFixedRequestV005,
  assertCandidateVideoIdInputTableV004,
  buildCandidateVideoIdInputTableV004,
  verifyCandidateVideoIdInputTableV004,
  assertCandidateVideoIdExecutionPlanV004,
  buildCandidateVideoIdFixedRequestsV004,
  assertCandidateVideoIdFixedRequestsV004,
  assertCandidateVideoIdCostConditionsV004,
  assertCandidateVideoIdPrepareCostConditionsV004,
  assertCandidateVideoIdPriceSnapshotV004,
  assertCandidateVideoIdPreparePriceSnapshotV004,
  assertCandidateVideoIdPrepareApprovalV004,
  assertCandidateVideoIdInferenceApprovalV004,
  assertCandidateVideoIdInferencePolicyV004,
  assertCandidateVideoIdInferenceCostContinuationV004,
  createCandidateVideoIdCacheBillingReviewV004,
  assertCandidateVideoIdCacheBillingReviewV004,
  deriveCandidateVideoIdCacheUsageV004,
  createCandidateVideoIdUsageScalarReviewV004,
  assertCandidateVideoIdUsageScalarReviewV004,
  deriveCandidateVideoIdScalarUsageV004,
  assertCandidateVideoIdComparisonApprovalV004,
  type CandidateVideoIdExecutionPlanV004,
  type CandidateVideoIdCostConditionsV004,
  type CandidateVideoIdPrepareCostConditionsV004,
  type CandidateVideoIdPreparationBillingReviewV004,
  type CandidateVideoIdPrepareApprovalV004,
  type CandidateVideoIdInferenceApprovalV004,
  type CandidateVideoIdComparisonApprovalV004,
  assertCandidateVideoIdInputV003,
  assertCandidateVideoIdOutputV003,
  buildCandidateVideoIdRequestV003,
  candidateVideoIdSchemaV003,
  loadCandidateVideoIdInputsV003,
  resolveCandidateVideoIdEvidenceV003,
  type CandidateVideoIdInputV003,
  type CandidateVideoIdProviderOutputV003,
  type CandidateVideoIdObservationV003,
  assertCandidateVideoJobV002, assertCandidateVideoOutputV002,
  CANDIDATE_VIDEO_COMPARISON_EXPERIMENT_PLAN_SCHEMA_V002,
  CANDIDATE_VIDEO_SOURCE_MAPPING_SCHEMA_V001,
  CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
  CANDIDATE_VIDEO_ROLE_VALUES_V001,
  CANDIDATE_VIDEO_UNDERSTANDING_JOB_SCHEMA_V001,
  CANDIDATE_VIDEO_UNDERSTANDING_PROMPT_V001,
  CANDIDATE_VIDEO_UNDERSTANDING_PROVIDER_OUTPUT_SCHEMA_V001,
  CANDIDATE_VIDEO_UNDERSTANDING_PURPOSE_V001,
  CANDIDATE_VIDEO_UNDERSTANDING_RESPONSE_JSON_SCHEMA_V001,
  CANDIDATE_VIDEO_UNDERSTANDING_RESULT_SCHEMA_V001,
  assertCandidateVideoCommunicationPlanApprovedV001,
  assertCandidateVideoCommunicationPlanV001,
  assertCandidateVideoComparisonExperimentPlanV002,
  assertCandidateVideoComparisonMeasurementV001,
  assertCandidateVideoComparisonWindowPlanV001,
  assertCandidateVideoHumanAnswersOffCenterV001,
  assertCandidateVideoProviderBlindnessV001,
  assertCandidateVideoProviderInputV001,
  assertCandidateVideoProviderSchemaSupportedSubsetV001,
  assertCandidateVideoStaticGenerateContentWireRequestV001,
  assertCandidateVideoUnderstandingExperimentJobsV001,
  assertCandidateVideoUnderstandingJobV001,
  assertCandidateVideoUnderstandingPreflightMarkedReadyV001,
  assertCandidateVideoUnderstandingProviderOutputV001,
  assertCandidateVideoUnderstandingResultV001,
  buildCandidateVideoComparisonWindowsV001,
  buildCandidateVideoComparisonExperimentPlanV002,
  buildCandidateVideoSeparatedComparisonWindowsV002,
  buildCandidateVideoLocalUploadPlanV001,
  buildCandidateVideoProviderInputV001,
  buildCandidateVideoStaticGenerateContentSdkParametersV001,
  buildCandidateVideoStaticGenerateContentWireRequestV001,
  buildCandidateVideoUnderstandingJobV001,
  canonicalJsonBytesV001,
  createCandidateVideoCommunicationGuardV001,
  decodeCandidateVideoUnderstandingJobV001,
  decodeCandidateVideoUnderstandingResultV001,
  decodeCandidateVideoComparisonExperimentPlanV002,
  deriveCandidateVideoFixedWindowSettingsV001,
  deriveCandidateVideoFirstHumanReviewV001,
  exerciseCandidateVideoUnderstandingWithMockTransportV001,
  extractCandidateVideoCandidatePointsV001,
  extractCandidateVideoSpeechBoundariesFromSemanticArtifactV001,
  projectCandidateIntervalToSourceV001,
  serializeCandidateVideoUnderstandingJobV001,
  serializeCandidateVideoUnderstandingResultV001,
  serializeCandidateVideoComparisonExperimentPlanV002,
  serializeCandidateVideoStaticGenerateContentWireRequestV001,
  verifyCandidateVideoUnderstandingJobFilesV001,
  verifyCandidateVideoHumanComparisonReferenceEvidenceV001,
  verifyClosedSourceMappingProvenanceV001,
  type CandidateVideoCommunicationPlanV001,
  type CandidateVideoComparisonExperimentPlanV002,
  type CandidateVideoComparisonWindowPlanV001,
  type CandidateVideoFixedWindowV001,
  type CandidateVideoFixedWindowSettingsV001,
  type CandidateVideoComparisonWindowsV001,
  type CandidateVideoCandidatePointV001,
  type CandidateVideoUnderstandingJobV001,
  type CandidateVideoUnderstandingProviderOutputV001,
  type CandidateVideoUnderstandingResultV001
} from './candidate-video-understanding-v001.js';

// These entry points exit before all historical temporary-fixture and human
// evaluation loaders. The request branch reads unchanged source artifacts only.
if (process.argv.includes('--task035-profile-only') || process.argv.includes('--task035-request-only')) {
  let checks = 0;
  const check = (fn: () => void) => {fn(); checks += 1;};
  const digest = (value: unknown) => createHash('sha256').update(canonicalJsonBytesV001(value)).digest('hex');
  const profile = CANDIDATE_VIDEO_ID_PROFILE_V005;
  const context = {origin: 'mock' as const, experimentId: 'task-035',
    approvalReference: 'synthetic-task-035-preparation-only', checkedAt: '2026-09-06T03:31:07.000Z'};
  const review = buildCandidateVideoIdPriceReviewV005(context);
  const original = canonicalJsonBytesV001({profile, review});
  check(() => assertCandidateVideoIdProfileV005(profile));
  check(() => assert.deepEqual(profile, {
    schemaVersion: 'candidate-video-understanding-id-profile-v005', workOrderId: 'task-035', experimentId: 'task-035',
    model: 'gemini-3.8-flash', maxOutputTokens: 8192, thinkingLevel: 'MEDIUM',
    executionRecordPath: 'evals/clip_composition/outputs/work-candidate-video-understanding-recalibration-v001/execution-record-v002.jsonl',
    timeouts: {metadataGetMs: 30000, countTokensMs: 180000}, limits: {metadataGet: 5, countTokens: 10, inference: 0, total: 15},
    retry: 0, repair: 0, resend: 0, reupload: 0, extraPoll: 0,
    futureInference: {approvalStatus: 'requires-separate-kawafmm-approval', perConditionInference: 1,
      modelAnswerContractFailure: 'persist-rejected-condition-and-continue', infrastructureFailure: 'stop-all', expenseBudget: 'not-approved'}
  }));
  for (const frozen of [profile, profile.timeouts, profile.limits, profile.futureInference]) {
    check(() => assert.equal(Object.isFrozen(frozen), true));
  }
  for (const key of Object.keys(profile)) {
    const missing: Record<string, unknown> = structuredClone(profile); delete missing[key];
    check(() => assert.throws(() => assertCandidateVideoIdProfileV005(missing)));
  }
  for (const changed of [null, {}, {...profile, experimentId: 'task-029'}, {...profile, workOrderId: 'task-030'},
    {...profile, schemaVersion: 'candidate-video-understanding-id-profile-v004'}, {...profile, model: 'gemini-3.6-flash'},
    {...profile, thinkingLevel: 'LOW'}, {...profile, maxOutputTokens: 4096}, {...profile, maxOutputTokens: 8193},
    {...profile, executionRecordPath: CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004.executionRecord},
    ...['retry', 'repair', 'resend', 'reupload', 'extraPoll'].map(key => ({...profile, [key]: 1})),
    {...profile, timeouts: {...profile.timeouts, metadataGetMs: 30001}},
    {...profile, timeouts: {...profile.timeouts, countTokensMs: 180001}},
    {...profile, limits: {...profile.limits, inference: 1}}, {...profile, limits: {...profile.limits, metadataGet: 6}},
    {...profile, limits: {...profile.limits, countTokens: 11}}, {...profile, limits: {...profile.limits, total: 16}},
    {...profile, futureInference: {...profile.futureInference, perConditionInference: 2}},
    {...profile, futureInference: {...profile.futureInference, approvalStatus: 'approved'}},
    {...profile, futureInference: {...profile.futureInference, expenseBudget: '1000000000'}},
    {...profile, futureInference: {...profile.futureInference, modelAnswerContractFailure: 'stop-all'}},
    {...profile, futureInference: {...profile.futureInference, infrastructureFailure: 'continue'}},
    {...profile, maximumNanoUsd: '0'}, {...profile, maximumNanoUsd: '1000000000'}, {...profile, fallbackOutputTokens: 4096}]) {
    check(() => assert.throws(() => assertCandidateVideoIdProfileV005(changed)));
  }
  check(() => assertCandidateVideoIdPriceReviewV005(review));
  check(() => assert.equal(review.origin, 'mock'));
  check(() => assert.equal(review.experimentId, 'task-035'));
  check(() => assert.deepEqual(review.standardPrice,
    {inputNanoUsdPerToken: 750, outputIncludingThinkingNanoUsdPerToken: 3750, validThrough: '2026-12-31'}));
  check(() => assert.equal(review.preparationBilling.filesApi, 'documented-free'));
  check(() => assert.equal(review.preparationBilling.countTokens, 'independent-pricing-not-found-not-an-explicit-free-guarantee'));
  check(() => assert.equal(review.preparationBilling.invoiceAmount, 'not-established'));
  check(() => assert.equal(review.referenceEstimateOnly, true));
  check(() => assert.equal(review.generationAllowanceIsGuaranteedBillableCap, false));
  check(() => assert.equal(review.futureInferenceBudget, 'not-approved'));
  check(() => assert.equal(Object.hasOwn(review, 'maximumNanoUsd'), false));
  for (const source of review.sources) {
    check(() => assert.equal(source.summaryUtf8Sha256, createHash('sha256').update(source.summary, 'utf8').digest('hex')));
    check(() => assert.equal(new URL(source.url).origin, 'https://ai.google.dev'));
  }
  for (const key of Object.keys(review)) {
    const missing: Record<string, unknown> = structuredClone(review); delete missing[key];
    check(() => assert.throws(() => assertCandidateVideoIdPriceReviewV005(missing)));
  }
  for (const changed of [null, {}, {...review, workOrderId: 'task-032'}, {...review, experimentId: 'task-029'},
    {...review, origin: 'unknown'}, {...review, approvalReference: ' '}, {...review, checkedAt: 'not-a-time'},
    {...review, checkedAt: '2027-01-01T00:00:00Z'}, {...review, serviceTier: 'flex'}, {...review, model: 'gemini-3.6-flash'},
    {...review, standardPrice: {...review.standardPrice, inputNanoUsdPerToken: 75}},
    {...review, standardPrice: {...review.standardPrice, outputIncludingThinkingNanoUsdPerToken: 0}},
    {...review, standardPrice: {...review.standardPrice, validThrough: '2027-12-31'}},
    {...review, preparationBilling: {...review.preparationBilling, countTokens: 'free'}},
    {...review, preparationBilling: {...review.preparationBilling, invoiceAmount: '0'}},
    {...review, referenceEstimateOnly: false}, {...review, cacheDiscountAssumed: true}, {...review, thinkingTokensFixed: true},
    {...review, generationAllowanceIsGuaranteedBillableCap: true}, {...review, futureInferenceBudget: '1000000000'},
    {...review, maximumNanoUsd: '0'}, {...review, maximumNanoUsd: '1000000000'}, {...review, sources: review.sources.slice(1)},
    {...review, unrelatedEvidence: undefined}]) {
    check(() => assert.throws(() => assertCandidateVideoIdPriceReviewV005(changed)));
  }
  const changedSource = structuredClone(review); changedSource.sources[0].summary += ' altered';
  changedSource.sources[0].summaryUtf8Sha256 = createHash('sha256').update(changedSource.sources[0].summary).digest('hex');
  check(() => assert.throws(() => assertCandidateVideoIdPriceReviewV005(changedSource)));
  const execution = {...context, now: '2026-09-06T03:31:08.000Z'};
  check(() => assertCandidateVideoIdPriceReviewV005(review, execution));
  for (const changed of [{origin: 'live'}, {experimentId: 'task-029'}, {approvalReference: 'another-approval'},
    {now: '2026-09-06T03:31:06.999Z'}, {now: '2027-01-01T00:00:00.000Z'}]) {
    check(() => assert.throws(() => assertCandidateVideoIdPriceReviewV005(review, {...execution, ...changed} as typeof execution)));
  }
  check(() => assert.throws(() => buildCandidateVideoIdPriceReviewV005({...context, experimentId: 'task-029'})));
  const liveReview = buildCandidateVideoIdPriceReviewV005({...context, origin: 'live'});
  check(() => assertCandidateVideoIdPriceReviewV005(liveReview, {...execution, origin: 'live'}));
  check(() => assert.ok(original.equals(canonicalJsonBytesV001({profile, review}))));
  const profileChecks = checks;
  let requestSummary: Record<string, unknown> | null = null;
  if (process.argv.includes('--task035-request-only')) {
    const workspaceRoot = new URL('../..', import.meta.url).pathname.replace(/\/$/u, '');
    const tableBytes = await readFile(join(workspaceRoot, CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004.inputTable));
    const planBytes = await readFile(join(workspaceRoot, CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004.executionPlan));
    const table: unknown = JSON.parse(tableBytes.toString('utf8'));
    await verifyCandidateVideoIdInputTableV004(workspaceRoot, table, 'live');
    assertCandidateVideoIdInputTableV004(table, 'live');
    const plan: unknown = JSON.parse(planBytes.toString('utf8'));
    assertCandidateVideoIdExecutionPlanV004(plan, table);
    const previous = buildCandidateVideoIdFixedRequestsV004(table, plan);
    const sourceBefore = canonicalJsonBytesV001({table, plan, previous});
    const requests = buildCandidateVideoIdFixedRequestsV005(table, plan);
    // Independent fixed expectations observed before task-035 edits. Do not
    // regenerate these literals from whichever builder is currently installed.
    const oldExpected = [
      'adc192463042028430a8b8f00b71db0b51bba4b90fd715254016528c3a18a1fd',
      '764670ecc37663720fabf0d3d570217451a529278f4196643b7ab357d03328a5',
      'c26e2bcda45931961dd19944ac08547c35b88b16293bbeab49296a28e57eb296',
      '60fd24e16e627e5d694dd24a91c83acf64d23d10df828a6287b66a3525d47181',
      '27809c3289499f2d4458e890fa2553216567158f22ce1c2f93fdd113bf11c5dd',
      'f0365123baa5be7544b02ad81c56f5451a01d91b06493d09734606ab4d104868',
      '5d5ec754fd4760c56fb74b7c6748067054d762f5d79e1d8c4b0ceba142f4f575',
      '3062e7f83b7335d7ffc24fa48618e9c367773fced96524a3ce6effe38bfa5081',
      'b7239f74b4e561df48742fe6a8ab5423312f78863510de08f060ca03de9ad210',
      '6f62ec4cc6d2059514b8418f64da3c56b54ef6e227d8cf6a560afae14fa54fa3'
    ];
    const wire = (request: typeof previous[number]['request'] | CandidateVideoIdFixedRequestV005['request']) =>
      ({method: request.method, url: request.url, body: request.body});
    const deltaPaths = (left: unknown, right: unknown, path = ''): string[] => {
      if (Object.is(left, right)) return [];
      if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object'
        || Array.isArray(left) !== Array.isArray(right)) return [path];
      const a = left as Record<string, unknown>; const b = right as Record<string, unknown>;
      return [...new Set([...Object.keys(a), ...Object.keys(b)])].sort().flatMap(key =>
        Object.hasOwn(a, key) !== Object.hasOwn(b, key) ? [path + '/' + key] : deltaPaths(a[key], b[key], path + '/' + key));
    };
    check(() => assert.equal(previous.length, 10));
    check(() => assert.equal(requests.length, 10));
    check(() => assert.equal(new Set(requests.map(fixed => fixed.exactRequestSha256)).size, 10));
    check(() => assertCandidateVideoIdFixedRequestsV004(previous, table, plan));
    check(() => assertCandidateVideoIdFixedRequestsV005(requests, table, plan));
    requests.forEach((fixed, index) => {
      const old = previous[index]; const before = old.request; const after = fixed.request;
      check(() => assert.equal(before.body.generationConfig.maxOutputTokens, 4096));
      check(() => assert.equal(old.exactRequestSha256, oldExpected[index]));
      check(() => assert.equal(digest(wire(before)), oldExpected[index]));
      check(() => assert.equal(after.schemaVersion, 'candidate-video-understanding-id-request-v005'));
      check(() => assert.equal(after.body.generationConfig.maxOutputTokens, 8192));
      check(() => assert.deepEqual(deltaPaths(wire(before), wire(after)), ['/body/generationConfig/maxOutputTokens']));
      check(() => assert.equal(fixed.exactRequestSha256, digest(wire(after))));
      check(() => assert.notEqual(fixed.exactRequestSha256, oldExpected[index]));
      check(() => assert.equal(fixed.previousExactRequestSha256, oldExpected[index]));
      check(() => assert.equal(after.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent'));
      check(() => assert.equal(after.body.generationConfig.thinkingConfig.thinkingLevel, 'MEDIUM'));
      check(() => assert.ok(canonicalJsonBytesV001(before.body.contents).equals(canonicalJsonBytesV001(after.body.contents))));
      check(() => assert.ok(canonicalJsonBytesV001(before.body.generationConfig.responseJsonSchema)
        .equals(canonicalJsonBytesV001(after.body.generationConfig.responseJsonSchema))));
      check(() => assert.deepEqual(Object.keys(after.body).sort(), ['contents', 'generationConfig']));
      check(() => assert.deepEqual(Object.keys(after.body.generationConfig).sort(),
        ['maxOutputTokens', 'responseJsonSchema', 'responseMimeType', 'thinkingConfig']));
      check(() => assert.equal(after.body.contents[0].parts.length, fixed.condition === 'A' ? 1 : 2));
      check(() => assert.equal(after.mediaSha256, before.mediaSha256));
      check(() => assertCandidateVideoIdRequestDeltaV005(before, after));
      if (fixed.condition === 'B') {
        const media = after.body.contents[0].parts[1] as {fileData: {fileUri: string}};
        check(() => assert.equal(media.fileData.fileUri, plan.files.find(file => file.itemId === fixed.itemId)!.uri));
        check(() => assert.ok(canonicalJsonBytesV001(before.body.contents[0].parts[0])
          .equals(canonicalJsonBytesV001(requests[index - 1].request.body.contents[0].parts[0]))));
      }
    });
    const rejectChanged = (mutate: (changed: CandidateVideoIdFixedRequestV005[]) => void, rehash = true) => {
      const changed = structuredClone(requests); mutate(changed);
      if (rehash) for (const fixed of changed) fixed.exactRequestSha256 = digest(wire(fixed.request));
      check(() => assert.throws(() => assertCandidateVideoIdFixedRequestsV005(changed, table, plan)));
    };
    for (const maxOutputTokens of [4096, 8191, 8193, '8192', null, undefined]) {
      rejectChanged(changed => {
        const generation = changed[0].request.body.generationConfig as Record<string, unknown>;
        if (maxOutputTokens === undefined) delete generation.maxOutputTokens; else generation.maxOutputTokens = maxOutputTokens;
      });
    }
    rejectChanged(changed => {changed[0].request.url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';});
    rejectChanged(changed => {changed[0].request.body.generationConfig.thinkingConfig.thinkingLevel = 'LOW';});
    rejectChanged(changed => {(changed[0].request.body.contents[0].parts[0] as {text: string}).text += ' changed';});
    rejectChanged(changed => {changed[0].request.body.generationConfig.responseJsonSchema.properties.itemId.enum = ['item-9999'];});
    rejectChanged(changed => {changed[0].request.body.contents[0].parts.push(structuredClone(changed[1].request.body.contents[0].parts[1]));});
    rejectChanged(changed => {(changed[1].request.body.contents[0].parts[1] as {fileData: {fileUri: string}}).fileData.fileUri =
      'https://generativelanguage.googleapis.com/v1beta/files/replaced';});
    rejectChanged(changed => {Object.assign(changed[0].request.body, {humanEvaluation: 'not-provider-input'});});
    rejectChanged(changed => {Object.assign(changed[0].request, {schemaVersion: previous[0].request.schemaVersion});});
    rejectChanged(changed => {changed[0].request.body = structuredClone(previous[0].request.body);});
    rejectChanged(changed => {changed.pop();});
    rejectChanged(changed => {changed[1] = structuredClone(changed[0]);});
    rejectChanged(changed => {changed.reverse();});
    rejectChanged(changed => {changed[0].itemId = 'item-9999';});
    rejectChanged(changed => {Object.assign(changed[0], {condition: 'C'});});
    rejectChanged(changed => {changed[0].previousExactRequestSha256 = requests[0].exactRequestSha256;});
    rejectChanged(changed => {changed[0].exactRequestSha256 = previous[0].exactRequestSha256;}, false);
    rejectChanged(changed => {changed[0].exactRequestSha256 = '0'.repeat(64);}, false);
    check(() => assert.throws(() => assertCandidateVideoIdFixedRequestsV005(previous, table, plan)));
    check(() => assert.throws(() => assertCandidateVideoIdFixedRequestsV004(requests, table, plan)));
    check(() => assert.throws(() => assertCandidateVideoIdRequestDeltaV005(previous[0].request, previous[0].request)));
    check(() => assert.throws(() => assertCandidateVideoIdRequestDeltaV005(
      {...previous[0].request, body: {...previous[0].request.body, generationConfig: {...previous[0].request.body.generationConfig, maxOutputTokens: 8192}}},
      requests[0].request)));
    check(() => assert.ok(sourceBefore.equals(canonicalJsonBytesV001({table, plan, previous}))));
    check(() => assert.deepEqual(buildCandidateVideoIdFixedRequestsV004(table, plan).map(fixed => fixed.exactRequestSha256), oldExpected));
    check(() => assert.notEqual(table.experimentId, profile.experimentId));
    const tableAfter = await readFile(join(workspaceRoot, CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004.inputTable));
    const planAfter = await readFile(join(workspaceRoot, CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004.executionPlan));
    check(() => assert.ok(tableBytes.equals(tableAfter)));
    check(() => assert.ok(planBytes.equals(planAfter)));
    requestSummary = {fixedRequests: requests.length, old4096WireShasUnchanged: true, singleProviderFieldChange: true,
      requestChecks: checks - profileChecks, newRequestShas: requests.map(({itemId, condition, exactRequestSha256}) =>
        ({itemId, condition, exactRequestSha256}))};
  }
  process.stdout.write(JSON.stringify({suite: 'task-035-explicit-8192-core', status: 'passed', checks, profileChecks,
    sourceVerification: requestSummary === null ? 'not-requested' : 'unchanged-formal-sources-read-only', requestSummary,
    evaluationReads: 0, newFixturePaths: 0, apiCommunications: 0, formalArtifactsWritten: 0}) + '\n');
  process.exit(0);
}

if (process.argv.includes('--task033-scalar-usage-only')) {
  let checks = 0;
  const check = (fn: () => void) => {fn(); checks += 1;};
  const context = {origin: 'mock' as const, experimentId: 'synthetic-task-033-scalar-usage',
    approvalReference: 'synthetic-task-033-approval', checkedAt: '2026-09-06T01:00:00.000Z'};
  const cacheReview = createCandidateVideoIdCacheBillingReviewV004(context);
  const scalarReview = createCandidateVideoIdUsageScalarReviewV004(context, cacheReview);
  const request = {contents: [{role: 'user', parts: [{text: 'synthetic fixed nonempty input'}]}], generationConfig: {}};
  const emptyRequest = {contents: [], generationConfig: {}};
  const raw3A = {promptTokenCount: 51784, thoughtsTokenCount: 3565, totalTokenCount: 55349,
    serviceTier: 'standard', promptTokensDetails: [{modality: 'TEXT', tokenCount: 51784}]};
  const envelope = (usage: unknown) => ({modelVersion: 'gemini-3.8-flash', usageMetadata: usage});
  const derive = (usage: unknown, body: unknown = request) =>
    deriveCandidateVideoIdScalarUsageV004(envelope(usage), cacheReview, scalarReview, body);
  const original = canonicalJsonBytesV001({raw3A, request, cacheReview, scalarReview});
  const reassessed = derive(raw3A);
  const independent = BigInt(raw3A.promptTokenCount) * 750n + BigInt(raw3A.thoughtsTokenCount) * 3750n;
  check(() => assert.equal(raw3A.promptTokenCount + raw3A.thoughtsTokenCount, raw3A.totalTokenCount));
  check(() => assert.equal(reassessed.estimatedNanoUsd, independent.toString()));
  check(() => assert.equal(reassessed.estimatedNanoUsd, '52206750'));
  check(() => assert.equal(reassessed.normalizedProviderUsage.candidatesTokenCount, 0));
  check(() => assert.equal(reassessed.billingBreakdown.outputNanoUsd, '0'));
  check(() => assert.deepEqual(reassessed.providerUsage, raw3A));
  check(() => assert.equal(Object.hasOwn(reassessed.providerUsage, 'candidatesTokenCount'), false));
  check(() => assert.deepEqual(reassessed.usageNormalization.omittedZeroFields,
    ['cachedContentTokenCount', 'candidatesTokenCount', 'toolUsePromptTokenCount']));
  check(() => assert.equal(reassessed.usageNormalization.schemaVersion, 'candidate-video-understanding-task-033-usage-normalization-v001'));
  const digest = (value: unknown) => createHash('sha256').update(canonicalJsonBytesV001(value)).digest('hex');
  check(() => assert.equal(reassessed.usageNormalization.normalizationReviewSha256, digest(scalarReview)));
  check(() => assert.equal(reassessed.usageNormalization.rawUsageCanonicalSha256, digest(raw3A)));
  check(() => assert.equal(reassessed.usageNormalization.normalizedUsageCanonicalSha256, digest(reassessed.normalizedProviderUsage)));
  check(() => assertCandidateVideoIdUsageScalarReviewV004(scalarReview, cacheReview));
  // The original evaluator still rejects the actual omitted scalar. Historical
  // records have not been made to appear successful under the new rule.
  check(() => assert.throws(() => deriveCandidateVideoIdCacheUsageV004(envelope(raw3A), cacheReview, request)));
  check(() => assert.equal(derive({...raw3A, candidatesTokenCount: 0}).estimatedNanoUsd, reassessed.estimatedNanoUsd));
  const zeroBase: Record<string, unknown> = {promptTokenCount: 0, cachedContentTokenCount: 0, candidatesTokenCount: 0,
    thoughtsTokenCount: 0, totalTokenCount: 0, toolUsePromptTokenCount: 0, serviceTier: 'standard'};
  const normalBase: Record<string, unknown> = {...zeroBase, promptTokenCount: 10, candidatesTokenCount: 2,
    thoughtsTokenCount: 3, totalTokenCount: 15};
  const omissions: Array<{field: string; usage: Record<string, unknown>; body: unknown}> = [
    {field: 'promptTokenCount', usage: {...zeroBase, candidatesTokenCount: 2, totalTokenCount: 2}, body: emptyRequest},
    {field: 'cachedContentTokenCount', usage: normalBase, body: request},
    {field: 'candidatesTokenCount', usage: {...normalBase, candidatesTokenCount: 0, totalTokenCount: 13}, body: request},
    {field: 'thoughtsTokenCount', usage: {...normalBase, thoughtsTokenCount: 0, totalTokenCount: 12}, body: request},
    {field: 'totalTokenCount', usage: zeroBase, body: emptyRequest},
    {field: 'toolUsePromptTokenCount', usage: normalBase, body: request}
  ];
  for (const {field, usage, body} of omissions) {
    const omitted = {...usage}; delete omitted[field];
    const explicit = derive(usage, body); const absent = derive(omitted, body);
    check(() => assert.equal(absent.estimatedNanoUsd, explicit.estimatedNanoUsd));
    check(() => assert.deepEqual(absent.normalizedProviderUsage, explicit.normalizedProviderUsage));
    check(() => assert.deepEqual(absent.usageNormalization.omittedZeroFields, [field]));
    check(() => assert.equal(Object.hasOwn(absent.providerUsage, field), false));
  }
  const oldA = {promptTokenCount: 30215, candidatesTokenCount: 150, thoughtsTokenCount: 3932,
    totalTokenCount: 34297, serviceTier: 'standard'};
  const oldB = {promptTokenCount: 60838, candidatesTokenCount: 954, thoughtsTokenCount: 3127,
    totalTokenCount: 64919, cachedContentTokenCount: 27542, serviceTier: 'standard'};
  for (const [usage, expected] of [[oldA, '37968750'], [oldB, '42341400']] as const) {
    const previous = deriveCandidateVideoIdCacheUsageV004(envelope(usage), cacheReview, request);
    const current = derive(usage);
    check(() => assert.equal(current.estimatedNanoUsd, expected));
    check(() => assert.equal(current.estimatedNanoUsd, previous.estimatedNanoUsd));
    check(() => assert.deepEqual(current.billingBreakdown, previous.billingBreakdown));
  }
  for (const field of scalarReview.rules.fields) {
    for (const invalid of [undefined, null, -1, 0.5, '0', false, {}, [], NaN, Infinity, 2147483648, Number.MAX_SAFE_INTEGER + 1]) {
      check(() => assert.throws(() => derive({...normalBase, [field]: invalid})));
    }
  }
  for (const usage of [null, undefined, [], 0, {}, {...normalBase, totalTokenCount: 14},
    {...raw3A, totalTokenCount: 55350}, {...normalBase, candidatesTokenCount: undefined},
    {...normalBase, cachedContentTokenCount: 11}, {...normalBase, cachedContentTokenCount: 1, totalTokenCount: 16},
    {...normalBase, toolUsePromptTokenCount: 1}, {...normalBase, toolUsePromptTokenCount: 1, totalTokenCount: 16},
    {...normalBase, futureBillableTokenCount: 0}, {...normalBase, futureBillableTokenCount: undefined},
    {...normalBase, billableUsage: {}}, {...normalBase, serviceTier: 0}, {...normalBase, serviceTier: undefined},
    {...normalBase, serviceTier: null}, {...normalBase, serviceTier: 'flex'}, {...normalBase, serviceTier: 'priority'},
    {...normalBase, promptTokensDetails: 0}, {...normalBase, promptTokensDetails: undefined},
    {...normalBase, promptTokensDetails: null}, {...normalBase, cacheTokensDetails: [{modality: 'TEXT', tokenCount: 1}]},
    {...raw3A, candidatesTokensDetails: [{modality: 'TEXT', tokenCount: 1}]},
    {...normalBase, toolUsePromptTokensDetails: [{modality: 'TEXT', tokenCount: 1}]},
    {...normalBase, candidatesTokensDetails: [{modality: 'TEXT'}]},
    {...normalBase, candidatesTokensDetails: [{modality: 'TEXT', tokenCount: 2, billableTokenCount: 0}]}]) {
    check(() => assert.throws(() => derive(usage)));
  }
  for (const field of ['promptTokenCount', 'candidatesTokenCount', 'thoughtsTokenCount', 'totalTokenCount']) {
    const contradictory = {...normalBase}; delete contradictory[field];
    check(() => assert.throws(() => derive(contradictory)));
  }
  check(() => assert.throws(() => derive(zeroBase)));
  check(() => assert.throws(() => derive(Object.create(raw3A))));
  check(() => assert.throws(() => deriveCandidateVideoIdScalarUsageV004({}, cacheReview, scalarReview, request)));
  check(() => assert.throws(() => deriveCandidateVideoIdScalarUsageV004(envelope(raw3A), cacheReview, undefined, request)));
  check(() => assert.throws(() => deriveCandidateVideoIdScalarUsageV004({...envelope(raw3A), unknownBilling: 0}, cacheReview, scalarReview, request)));
  const visibleOutput = {...envelope(raw3A), candidates: [{content: {parts: [{text: 'visible response'}]}}]};
  check(() => assert.throws(() => deriveCandidateVideoIdScalarUsageV004(visibleOutput, cacheReview, scalarReview, request)));
  check(() => assert.throws(() => deriveCandidateVideoIdScalarUsageV004({...visibleOutput,
    usageMetadata: {...raw3A, candidatesTokenCount: 0}}, cacheReview, scalarReview, request)));
  check(() => assert.equal(deriveCandidateVideoIdScalarUsageV004({...envelope(raw3A),
    candidates: [{content: {parts: [{thought: true, text: 'thought-only content'}]}}]}, cacheReview, scalarReview, request)
    .estimatedNanoUsd, reassessed.estimatedNanoUsd));
  check(() => assert.throws(() => derive(raw3A, {...request, cachedContent: 'cachedContents/unapproved'})));
  check(() => assert.throws(() => derive(raw3A, {...request, tools: []})));
  const omittedTier = {...normalBase}; delete omittedTier.serviceTier;
  const tierResult = derive(omittedTier);
  check(() => assert.equal(Object.hasOwn(tierResult.normalizedProviderUsage, 'serviceTier'), false));
  check(() => assert.deepEqual(tierResult.usageNormalization.omittedZeroFields, []));
  check(() => assert.equal(Object.hasOwn(reassessed.normalizedProviderUsage, 'cacheTokensDetails'), false));
  check(() => assert.equal(Object.hasOwn(reassessed.normalizedProviderUsage, 'candidatesTokensDetails'), false));
  for (const key of Object.keys(scalarReview)) {
    const missing: Record<string, unknown> = structuredClone(scalarReview); delete missing[key];
    check(() => assert.throws(() => assertCandidateVideoIdUsageScalarReviewV004(missing, cacheReview)));
  }
  for (const altered of [{...scalarReview, workOrderId: 'task-032'}, {...scalarReview, cacheBillingReviewSha256: '0'.repeat(64)},
    {...scalarReview, checkedAt: '2026-09-05T00:00:00.000Z'}, {...scalarReview, checkedAt: '2027-01-01T00:00:00.000Z'},
    {...scalarReview, rules: {...scalarReview.rules, fields: [...scalarReview.rules.fields, 'serviceTier']}},
    {...scalarReview, rules: {...scalarReview.rules, omittedDefault: 1}},
    {...scalarReview, rules: {...scalarReview.rules, missingUsageMessage: 'zero'}},
    {...scalarReview, rules: {...scalarReview.rules, nonzeroToolUsage: 'zero'}},
    {...scalarReview, rules: {...scalarReview.rules, totalComposition: [...scalarReview.rules.totalComposition, 'cachedContentTokenCount']}},
    {...scalarReview, rules: {...scalarReview.rules, semanticZeroConsistency: 'unchecked'}},
    {...scalarReview, sources: scalarReview.sources.slice(1)}, {...scalarReview, unknownProof: undefined}]) {
    check(() => assert.throws(() => assertCandidateVideoIdUsageScalarReviewV004(altered, cacheReview)));
  }
  const changedSource = structuredClone(scalarReview); changedSource.sources[0].summary += ' altered';
  changedSource.sources[0].summaryUtf8Sha256 = createHash('sha256').update(changedSource.sources[0].summary).digest('hex');
  check(() => assert.throws(() => assertCandidateVideoIdUsageScalarReviewV004(changedSource, cacheReview)));
  const execution = {...context, now: '2026-09-06T01:00:01.000Z'};
  check(() => assertCandidateVideoIdUsageScalarReviewV004(scalarReview, cacheReview, undefined, execution));
  for (const changed of [{origin: 'live'}, {experimentId: 'another-experiment'}, {approvalReference: 'another-approval'},
    {now: '2026-09-06T00:59:59.999Z'}, {now: '2027-01-01T00:00:00.000Z'}]) {
    check(() => assert.throws(() => assertCandidateVideoIdUsageScalarReviewV004(scalarReview, cacheReview, undefined,
      {...execution, ...changed} as typeof execution)));
  }
  check(() => assert.ok(original.equals(canonicalJsonBytesV001({raw3A, request, cacheReview, scalarReview}))));
  process.stdout.write(JSON.stringify({suite: 'task-033-known-scalar-usage-core-mock-only', status: 'passed', checks,
    syntheticOnly: true, item0003ADerivedNanoUsd: reassessed.estimatedNanoUsd, materialOrEvaluationReads: 0,
    newFixturePaths: 0, apiCommunications: 0, formalArtifactsWritten: 0}) + '\n');
  process.exit(0);
}

// Fee calculations are memory-only and never enter the historical fixture
// loaders. Expected A/B amounts are independent assertions, not fee inputs.
if (process.argv.includes('--task032-cache-billing-only')) {
  let checks = 0;
  const check = (fn: () => void) => {fn(); checks += 1;};
  const context = {origin: 'mock' as const, experimentId: 'synthetic-task-032-cache-billing',
    approvalReference: 'synthetic-task-032-approval', checkedAt: '2026-09-06T00:00:00.000Z'};
  const review = createCandidateVideoIdCacheBillingReviewV004(context);
  const request = {contents: [{role: 'user', parts: [{text: 'synthetic fixed request without human evaluation'}]}],
    generationConfig: {responseMimeType: 'application/json'}};
  const usageA = {promptTokenCount: 30215, candidatesTokenCount: 150, thoughtsTokenCount: 3932,
    totalTokenCount: 34297, serviceTier: 'standard', promptTokensDetails: [{modality: 'TEXT', tokenCount: 30215}]};
  const usageB = {promptTokenCount: 60838, candidatesTokenCount: 954, thoughtsTokenCount: 3127,
    totalTokenCount: 64919, cachedContentTokenCount: 27542, serviceTier: 'standard',
    promptTokensDetails: [{modality: 'TEXT', tokenCount: 30215}, {modality: 'VIDEO', tokenCount: 30623}],
    cacheTokensDetails: [{modality: 'TEXT', tokenCount: 13679}, {modality: 'VIDEO', tokenCount: 13863}]};
  const envelope = (usage: unknown) => ({usageMetadata: usage, modelVersion: 'gemini-3.8-flash',
    candidates: [{finishReason: 'MAX_TOKENS', content: {role: 'model', parts: [{text: '{"incomplete":'}]}}]});
  const derive = (usage: unknown, body: unknown = request) => deriveCandidateVideoIdCacheUsageV004(envelope(usage), review, body);
  const savedBefore = canonicalJsonBytesV001({review, request, usageA, usageB});
  const a = derive(usageA); const b = derive(usageB);
  check(() => assertCandidateVideoIdCacheBillingReviewV004(review));
  check(() => assert.equal(a.estimatedNanoUsd, (30215n * 750n + (150n + 3932n) * 3750n).toString()));
  check(() => assert.equal(a.estimatedNanoUsd, '37968750'));
  check(() => assert.equal(b.estimatedNanoUsd, ((60838n - 27542n) * 750n + 27542n * 75n + 954n * 3750n + 3127n * 3750n).toString()));
  check(() => assert.equal(b.estimatedNanoUsd, '42341400'));
  check(() => assert.equal(BigInt(a.estimatedNanoUsd) + BigInt(b.estimatedNanoUsd), 80310150n));
  check(() => assert.equal(a.complete, true));
  check(() => assert.equal(a.billingBreakdown.cachedInputTokens, 0));
  check(() => assert.equal(derive({...usageA, cachedContentTokenCount: 0}).estimatedNanoUsd, a.estimatedNanoUsd));
  check(() => assert.equal(derive({...usageA, toolUsePromptTokenCount: 0}).estimatedNanoUsd, a.estimatedNanoUsd));
  check(() => assert.deepEqual(b.billingBreakdown, {uncachedInputTokens: 33296, cachedInputTokens: 27542,
    outputTokens: 954, thinkingTokens: 3127, uncachedInputNanoUsd: '24972000', cachedInputNanoUsd: '2065650',
    outputNanoUsd: '3577500', thinkingNanoUsd: '11726250', explicitCacheStorageNanoUsd: '0',
    explicitCacheStorageBasis: 'no-explicit-cache-request'}));
  check(() => assert.equal(b.billingBreakdown.uncachedInputTokens + b.billingBreakdown.cachedInputTokens, usageB.promptTokenCount));
  check(() => assert.notEqual(b.estimatedNanoUsd, (60838n * 750n + 27542n * 75n + (954n + 3127n) * 3750n).toString()));
  check(() => assert.equal(derive({promptTokenCount: 100, cachedContentTokenCount: 100, candidatesTokenCount: 0,
    thoughtsTokenCount: 0, totalTokenCount: 100, serviceTier: 'standard'}).estimatedNanoUsd, '7500'));
  check(() => assert.equal(derive({promptTokenCount: 0, candidatesTokenCount: 0, thoughtsTokenCount: 0,
    totalTokenCount: 0, serviceTier: 'standard'}).estimatedNanoUsd, '0'));
  const withoutTier: Record<string, unknown> = {...usageA}; delete withoutTier.serviceTier;
  check(() => assert.equal(derive(withoutTier).estimatedNanoUsd, a.estimatedNanoUsd));
  for (const key of ['promptTokenCount', 'candidatesTokenCount', 'thoughtsTokenCount', 'totalTokenCount']) {
    const missing: Record<string, unknown> = {...usageA}; delete missing[key];
    check(() => assert.throws(() => derive(missing)));
  }
  for (const key of ['promptTokenCount', 'candidatesTokenCount', 'thoughtsTokenCount', 'totalTokenCount',
    'cachedContentTokenCount', 'toolUsePromptTokenCount']) {
    for (const invalid of [undefined, null, -1, 0.5, '0', NaN, Infinity, 2147483648, Number.MAX_SAFE_INTEGER + 1]) {
      check(() => assert.throws(() => derive({...usageA, [key]: invalid})));
    }
  }
  for (const usage of [null, undefined, {}, [], {...usageB, cachedContentTokenCount: 60839},
    {...usageB, totalTokenCount: 64919 + 27542}, {...usageA, toolUsePromptTokenCount: 1},
    {...usageA, unknownBillableTokenCount: 0}, {...usageA, unknownBillableTokenCount: 1},
    {...usageA, trafficType: 'ON_DEMAND'}, {...usageA, explicitCacheStorageHours: 0},
    {...usageA, billableUsage: {charge: 0}}, {...usageA, promptTokensDetails: null},
    {...usageA, promptTokensDetails: [{modality: 'TEXT', tokenCount: 30214}]},
    {...usageB, cacheTokensDetails: [{modality: 'TEXT', tokenCount: 27541}]},
    {...usageB, cachedContentTokenCount: 30624, cacheTokensDetails: [{modality: 'VIDEO', tokenCount: 30624}]},
    {...usageA, cachedContentTokenCount: 1, cacheTokensDetails: [{modality: 'VIDEO', tokenCount: 1}]},
    {...usageA, candidatesTokensDetails: [{modality: 'TEXT', tokenCount: 149}]},
    {...usageA, toolUsePromptTokensDetails: [{modality: 'TEXT', tokenCount: 1}]},
    {...usageA, promptTokensDetails: [{modality: 'TEXT', tokenCount: 30215, billableTokenCount: 0}]},
    {...usageA, promptTokensDetails: [{modality: 'TEXT', tokenCount: 30215}, {modality: 'TEXT', tokenCount: 0}]},
    {...usageA, promptTokensDetails: [{modality: 'UNKNOWN', tokenCount: 30215}]},
    {...usageA, promptTokensDetails: [{modality: 'TEXT'}]}]) {
    check(() => assert.throws(() => derive(usage)));
  }
  check(() => assert.throws(() => derive(Object.create(usageA))));
  for (const serviceTier of ['flex', 'priority', 'unspecified', 'STANDARD', '', 0, null, undefined]) {
    check(() => assert.throws(() => derive({...usageA, serviceTier})));
  }
  for (const body of [null, {}, {...request, cachedContent: 'cachedContents/synthetic-cache'},
    {...request, cachedContent: undefined}, {...request, cached_content: 'cachedContents/synthetic-cache'},
    {...request, ttl: '3600s'}, {...request, tools: []}, {...request, serviceTier: 'flex'}]) {
    check(() => assert.throws(() => derive(usageB, body)));
  }
  check(() => assert.throws(() => deriveCandidateVideoIdCacheUsageV004(envelope(usageA), review, undefined)));
  check(() => assert.throws(() => deriveCandidateVideoIdCacheUsageV004({...envelope(usageA), unknownBilling: 0}, review, request)));
  check(() => assert.throws(() => deriveCandidateVideoIdCacheUsageV004({...envelope(usageA), modelVersion: 'another-model'}, review, request)));
  check(() => assert.equal(derive({...usageA, candidatesTokensDetails: [{modality: 'TEXT', tokenCount: 150}],
    toolUsePromptTokensDetails: [], cacheTokensDetails: []}).estimatedNanoUsd, a.estimatedNanoUsd));
  for (const key of Object.keys(review)) {
    const missing: Record<string, unknown> = structuredClone(review); delete missing[key];
    check(() => assert.throws(() => assertCandidateVideoIdCacheBillingReviewV004(missing)));
  }
  for (const changed of [{...review, serviceTier: 'flex'}, {...review, workOrderId: 'task-030'},
    {...review, checkedAt: '2027-01-01T00:00:00Z'}, {...review, checkedAt: '2026-02-30T00:00:00Z'},
    {...review, standardPrice: {...review.standardPrice, cachedInputNanoUsdPerToken: 0}},
    {...review, standardPrice: {...review.standardPrice, unknownRate: undefined}},
    {...review, rules: {...review.rules, omittedZeroIntegerFields: ['cachedContentTokenCount', 'thoughtsTokenCount']}},
    {...review, rules: {...review.rules, unknownRule: undefined}},
    {...review, rules: {...review.rules, futureCacheDiscountAssumed: true}},
    {...review, sources: review.sources.slice(1)}, {...review, sourcePageSha256: 'a'.repeat(64)}]) {
    check(() => assert.throws(() => assertCandidateVideoIdCacheBillingReviewV004(changed)));
  }
  const changedSource = structuredClone(review); changedSource.sources[0].summary += 'altered';
  changedSource.sources[0].summaryUtf8Sha256 = createHash('sha256').update(changedSource.sources[0].summary).digest('hex');
  check(() => assert.throws(() => assertCandidateVideoIdCacheBillingReviewV004(changedSource)));
  const {cost: preparationCost} = syntheticTask029PreparationPrice(context.experimentId, 'synthetic-preparation');
  const cost: CandidateVideoIdCostConditionsV004 = {maximumNanoUsd: '1000000000', priceReference: preparationCost.priceReference,
    inputNanoUsdPerToken: 750, outputIncludingThinkingNanoUsdPerToken: 3750, priceValidThrough: '2026-12-31',
    acceptEstimateNotGuaranteedCap: true};
  const execution = {origin: context.origin, experimentId: context.experimentId, approvalReference: context.approvalReference,
    now: '2026-09-06T00:00:01.000Z'};
  check(() => assertCandidateVideoIdCacheBillingReviewV004(review, cost, execution));
  for (const changes of [{maximumNanoUsd: '1000000001'}, {inputNanoUsdPerToken: 751},
    {outputIncludingThinkingNanoUsdPerToken: 3751}, {priceValidThrough: '2027-01-01'}]) {
    check(() => assert.throws(() => assertCandidateVideoIdCacheBillingReviewV004(review, {...cost, ...changes}, execution)));
  }
  for (const changes of [{origin: 'live'}, {experimentId: 'another-experiment'}, {approvalReference: 'another-approval'},
    {now: '2026-09-05T23:59:59.999Z'}, {now: '2027-01-01T00:00:00.000Z'}]) {
    check(() => assert.throws(() => assertCandidateVideoIdCacheBillingReviewV004(review, cost, {...execution, ...changes} as typeof execution)));
  }
  check(() => assertCandidateVideoIdInferenceCostContinuationV004(cost, (BigInt(a.estimatedNanoUsd) + BigInt(b.estimatedNanoUsd)).toString()));
  for (const stopped of ['1000000000', '1000000001', null]) {
    check(() => assert.throws(() => assertCandidateVideoIdInferenceCostContinuationV004(cost, stopped)));
  }
  check(() => assert.ok(savedBefore.equals(canonicalJsonBytesV001({review, request, usageA, usageB}))));
  process.stdout.write(JSON.stringify({suite: 'task-032-cache-billing-core-mock-only', status: 'passed', checks,
    syntheticOnly: true, aDerivedNanoUsd: a.estimatedNanoUsd, bDerivedNanoUsd: b.estimatedNanoUsd,
    materialOrEvaluationReads: 0, newFixturePaths: 0, apiCommunications: 0, formalArtifactsWritten: 0}) + '\n');
  process.exit(0);
}

function syntheticTask029PreparationPrice(experimentId: string, approvalReference: string) {
  const summaries = [
    '合成検査専用。課金対象のinput token、output token、cached token、cached token storageを確認したという要旨。',
    '合成検査専用。countTokensがtokenizerを実行してtoken数を返すAPIという要旨。',
    '合成検査専用。準備2操作の独立料金項目を確認できず、現行Standard単価を確認したという要旨。永久無料の保証ではない。'
  ];
  const review: CandidateVideoIdPreparationBillingReviewV004 = {
    schemaVersion: 'candidate-video-understanding-task-029-preparation-billing-review-v001',
    workOrderId: 'task-029', origin: 'mock', experimentId, approvalReference,
    checkedAt: '2026-09-06T00:00:00.000Z', evidenceType: 'japanese-verification-summary-not-source-quotation-or-full-page',
    sources: ['https://ai.google.dev/gemini-api/docs/billing', 'https://ai.google.dev/api/tokens',
      'https://ai.google.dev/gemini-api/docs/pricing'].map((url, index) => ({url, summary: summaries[index],
        summaryUtf8Sha256: createHash('sha256').update(summaries[index], 'utf8').digest('hex')})),
    model: 'gemini-3.8-flash', standardPrice: {inputNanoUsdPerToken: 750, outputIncludingThinkingNanoUsdPerToken: 3750,
      validThrough: '2026-12-31'}, operations: ['metadata-get', 'count-tokens'],
    independentPricing: 'not-found-in-reviewed-current-official-pricing', estimatedPreparationNanoUsd: '0',
    permanentFreeGuarantee: false, otherOperationsCovered: false
  };
  const priceBytes = canonicalJsonBytesV001({schemaVersion: 'candidate-video-understanding-provider-spec-price-snapshot-v001',
    origin: 'mock', model: review.model, checkedOn: '2026-09-05', standardPrice: review.standardPrice});
  const cost: CandidateVideoIdPrepareCostConditionsV004 = {maximumNanoUsd: '100000000',
    priceReference: {path: 'synthetic-task-029/price-not-a-real-file.json',
      fileSha256: createHash('sha256').update(priceBytes).digest('hex')},
    inputNanoUsdPerToken: 750, outputIncludingThinkingNanoUsdPerToken: 3750, priceValidThrough: '2026-12-31',
    acceptEstimateNotGuaranteedCap: true, preparationBillingReview: review};
  return {cost, priceBytes};
}

// task-030 contract regression runs before all historical fixture/source reads.
// The exact cost boundary is tested directly because token prices need not
// produce an invoice estimate of exactly US$1.00 for any integer token count.
if (process.argv.includes('--task030-contract-only')) {
  let checks = 0;
  const check = (fn: () => void) => {fn(); checks += 1;};
  const {cost: preparationCost, priceBytes} = syntheticTask029PreparationPrice(
    'synthetic-task-029-existing-experiment', 'synthetic-task-029-preparation-approval');
  const preparedBefore = canonicalJsonBytesV001(preparationCost);
  const cost: CandidateVideoIdCostConditionsV004 = {
    maximumNanoUsd: '1000000000', priceReference: {...preparationCost.priceReference},
    inputNanoUsdPerToken: preparationCost.inputNanoUsdPerToken,
    outputIncludingThinkingNanoUsdPerToken: preparationCost.outputIncludingThinkingNanoUsdPerToken,
    priceValidThrough: preparationCost.priceValidThrough, acceptEstimateNotGuaranteedCap: true
  };
  const policy = {...CANDIDATE_VIDEO_ID_INFERENCE_POLICY_V004};
  check(() => assert.deepEqual(policy, {
    schemaVersion: 'candidate-video-understanding-task-030-inference-policy-v001', workOrderId: 'task-030',
    modelAnswerContractFailure: 'persist-rejected-condition-and-continue',
    continuationRequires: 'http-success-and-durable-raw-answer-usage-cost-and-rejection',
    infrastructureFailure: 'stop-all', unknownUsageOrCost: 'stop-all', costAtOrAboveLimit: 'stop-all',
    maximumNanoUsd: '1000000000', rejectedAnswerCreatesObservation: false, crossConditionFeedback: false,
    retry: 0, repair: 0, resend: 0
  }));
  check(() => assert.ok(Object.isFrozen(CANDIDATE_VIDEO_ID_INFERENCE_POLICY_V004)));
  check(() => assertCandidateVideoIdInferencePolicyV004(policy, cost));
  check(() => assertCandidateVideoIdPriceSnapshotV004(priceBytes, cost));
  check(() => assertCandidateVideoIdPrepareCostConditionsV004(preparationCost));
  check(() => assertCandidateVideoIdPreparePriceSnapshotV004(priceBytes, preparationCost, '2026-09-06T00:00:01.000Z'));
  check(() => assert.ok(preparedBefore.equals(canonicalJsonBytesV001(preparationCost))));
  check(() => assert.throws(() => assertCandidateVideoIdInferencePolicyV004(undefined, cost)));
  check(() => assert.throws(() => assertCandidateVideoIdInferencePolicyV004(null, cost)));
  check(() => assert.throws(() => assertCandidateVideoIdInferencePolicyV004({}, cost)));
  check(() => assert.throws(() => assertCandidateVideoIdInferencePolicyV004({...policy, requestPatch: 'rejected-answer'}, cost)));
  for (const [key, value] of Object.entries(policy)) {
    const missing: Record<string, unknown> = {...policy}; delete missing[key];
    check(() => assert.throws(() => assertCandidateVideoIdInferencePolicyV004(missing, cost)));
    const altered = {...policy, [key]: typeof value === 'string' ? value + '-altered'
      : typeof value === 'boolean' ? !value : value + 1};
    check(() => assert.throws(() => assertCandidateVideoIdInferencePolicyV004(altered, cost)));
  }
  for (const maximumNanoUsd of ['0', '100000000', '999999999', '1000000001', '', '-1', '1.00', '1e9']) {
    check(() => assert.throws(() => assertCandidateVideoIdInferencePolicyV004(policy, {...cost, maximumNanoUsd})));
    check(() => assert.throws(() => assertCandidateVideoIdInferenceCostContinuationV004({...cost, maximumNanoUsd}, '0')));
  }
  for (const legacyFlag of [true, false, undefined]) {
    const legacy = {...cost, acceptUnverifiedPreparationBilling: legacyFlag};
    check(() => assert.throws(() => assertCandidateVideoIdCostConditionsV004(legacy)));
    check(() => assert.throws(() => assertCandidateVideoIdInferencePolicyV004(policy, legacy)));
  }
  check(() => assert.throws(() => assertCandidateVideoIdInferencePolicyV004(policy, preparationCost)));
  check(() => assert.throws(() => assertCandidateVideoIdPrepareCostConditionsV004(cost)));
  check(() => assert.throws(() => assertCandidateVideoIdInferencePolicyV004(policy, {...cost, priceReference: undefined})));
  check(() => assert.throws(() => assertCandidateVideoIdInferencePolicyV004(policy, {...cost, acceptEstimateNotGuaranteedCap: false})));
  for (const knownUnderLimit of ['0', '1', '999999999']) {
    check(() => assertCandidateVideoIdInferenceCostContinuationV004(cost, knownUnderLimit));
  }
  for (const unknownOrStopped of [null, undefined, false, 0, 1, '', '-1', '01', '1.5', '1e9', ' 1',
    '1000000000', '1000000001', '1000000000000000000000']) {
    check(() => assert.throws(() => assertCandidateVideoIdInferenceCostContinuationV004(cost, unknownOrStopped)));
  }
  check(() => assert.throws(() => assertCandidateVideoIdInferenceCostContinuationV004(undefined, '0')));
  check(() => assert.throws(() => assertCandidateVideoIdInferenceCostContinuationV004(preparationCost, '0')));
  check(() => assert.ok(preparedBefore.equals(canonicalJsonBytesV001(preparationCost))));
  process.stdout.write(JSON.stringify({suite: 'task-030-inference-disposition-core-mock-only', status: 'passed', checks,
    syntheticOnly: true, unknownCostAccepted: false, preparedApprovalUnchanged: true,
    materialOrEvaluationReads: 0, newFixturePaths: 0, apiCommunications: 0, formalArtifactsWritten: 0}) + '\n');
  process.exit(0);
}

// task-029 deliberately never enters the historical fixture-producing suites.
// Every source, price, clock and approval below is synthetic and memory-only.
if (process.argv.includes('--task029-billing-only')) {
  let checks = 0;
  const check = (fn: () => void) => {fn(); checks += 1;};
  const {cost, priceBytes} = syntheticTask029PreparationPrice('synthetic-task-029-billing', 'synthetic-task-029-approval');
  const now = '2026-09-06T00:00:01.000Z';
  const modified = <T>(value: T, mutation: (copy: T) => void) => {
    const copy = structuredClone(value); mutation(copy); return copy;
  };
  const inferenceCost: CandidateVideoIdCostConditionsV004 = {
    maximumNanoUsd: cost.maximumNanoUsd, priceReference: {...cost.priceReference},
    inputNanoUsdPerToken: cost.inputNanoUsdPerToken,
    outputIncludingThinkingNanoUsdPerToken: cost.outputIncludingThinkingNanoUsdPerToken,
    priceValidThrough: cost.priceValidThrough, acceptEstimateNotGuaranteedCap: true
  };
  check(() => assertCandidateVideoIdPrepareCostConditionsV004(cost));
  check(() => assertCandidateVideoIdPreparePriceSnapshotV004(priceBytes, cost, now));
  check(() => assertCandidateVideoIdCostConditionsV004(inferenceCost));
  check(() => assertCandidateVideoIdPriceSnapshotV004(priceBytes, inferenceCost));
  check(() => assert.throws(() => assertCandidateVideoIdCostConditionsV004(cost)));
  check(() => assert.throws(() => assertCandidateVideoIdPrepareCostConditionsV004(inferenceCost)));
  check(() => assert.throws(() => assertCandidateVideoIdPrepareCostConditionsV004({...cost, acceptUnverifiedPreparationBilling: true})));
  check(() => assert.throws(() => assertCandidateVideoIdCostConditionsV004({...inferenceCost, acceptUnverifiedPreparationBilling: false})));
  check(() => assert.throws(() => assertCandidateVideoIdCostConditionsV004({...inferenceCost, acceptUnverifiedPreparationBilling: undefined})));
  check(() => assert.throws(() => assertCandidateVideoIdCostConditionsV004({...inferenceCost, priceReference: undefined})));
  check(() => assert.throws(() => assertCandidateVideoIdCostConditionsV004({...inferenceCost, maximumNanoUsd: undefined})));
  check(() => assert.throws(() => assertCandidateVideoIdCostConditionsV004({...inferenceCost, acceptEstimateNotGuaranteedCap: false})));
  check(() => assert.throws(() => assertCandidateVideoIdPrepareCostConditionsV004({...cost, preparationBillingReview: undefined})));
  check(() => assert.throws(() => assertCandidateVideoIdPrepareCostConditionsV004({...cost, acceptEstimateNotGuaranteedCap: false})));
  for (const budget of ['', '0', '1', '99999999', '100000001', '1000000000', '-1', '01', '0.10', '1e8']) {
    check(() => assert.throws(() => assertCandidateVideoIdPrepareCostConditionsV004({...cost, maximumNanoUsd: budget})));
  }
  const reviewMutations: Array<(review: CandidateVideoIdPreparationBillingReviewV004) => void> = [
    review => {Object.assign(review, {schemaVersion: 'unrecognized'});},
    review => {Object.assign(review, {workOrderId: 'task-030'});},
    review => {Object.assign(review, {origin: 'unknown'});},
    review => {review.experimentId = '';}, review => {review.approvalReference = ' ';},
    review => {review.checkedAt = '2026-02-30T00:00:00Z';},
    review => {review.checkedAt = '2026-09-06';},
    review => {Object.assign(review, {evidenceType: 'official-page-byte-sha'});},
    review => {review.sources.pop();}, review => {review.sources.reverse();},
    review => {review.sources[1].url = review.sources[0].url;},
    review => {review.sources[0].url = 'https://example.invalid/billing';},
    review => {review.sources[0].summary += '差し替え';},
    review => {review.sources[0].summaryUtf8Sha256 = 'a'.repeat(64);},
    review => {review.sources[0].summary = '';},
    review => {Object.assign(review.sources[0], {wholePageSha256: 'b'.repeat(64)});},
    review => {Object.assign(review, {model: 'another-model'});},
    review => {Object.assign(review.standardPrice, {inputNanoUsdPerToken: 0});},
    review => {Object.assign(review.standardPrice, {outputIncludingThinkingNanoUsdPerToken: 0});},
    review => {Object.assign(review.standardPrice, {validThrough: '2027-12-31'});},
    review => {Object.assign(review, {operations: ['metadata-get', 'count-tokens', 'inference']});},
    review => {Object.assign(review, {operations: ['metadata-get', 'count-tokens', 'upload']});},
    review => {Object.assign(review, {operations: ['metadata-get']});},
    review => {Object.assign(review, {independentPricing: 'unknown-is-zero'});},
    review => {Object.assign(review, {estimatedPreparationNanoUsd: '1'});},
    review => {Object.assign(review, {permanentFreeGuarantee: true});},
    review => {Object.assign(review, {otherOperationsCovered: true});}
  ];
  for (const mutation of reviewMutations) {
    check(() => assert.throws(() => assertCandidateVideoIdPrepareCostConditionsV004(modified(cost,
      candidate => mutation(candidate.preparationBillingReview)))));
  }
  check(() => assert.throws(() => assertCandidateVideoIdPrepareCostConditionsV004({...cost, inputNanoUsdPerToken: 751})));
  check(() => assert.throws(() => assertCandidateVideoIdPrepareCostConditionsV004({...cost, outputIncludingThinkingNanoUsdPerToken: 3751})));
  check(() => assert.throws(() => assertCandidateVideoIdPrepareCostConditionsV004({...cost, priceValidThrough: '2027-01-01'})));
  check(() => assert.throws(() => assertCandidateVideoIdPreparePriceSnapshotV004(Buffer.from('{}'), cost, now)));
  check(() => assert.throws(() => assertCandidateVideoIdPriceSnapshotV004(Buffer.from('{}'), inferenceCost)));
  check(() => assert.throws(() => assertCandidateVideoIdPreparePriceSnapshotV004(priceBytes, modified(cost, candidate => {
    candidate.preparationBillingReview.checkedAt = '2026-09-07T00:00:00.000Z';
  }), now)));
  check(() => assert.throws(() => assertCandidateVideoIdPreparePriceSnapshotV004(priceBytes, modified(cost, candidate => {
    candidate.preparationBillingReview.checkedAt = '2026-09-04T00:00:00.000Z';
  }), now)));
  check(() => assert.throws(() => assertCandidateVideoIdPreparePriceSnapshotV004(priceBytes, cost, '2027-01-01T00:00:00.000Z')));
  check(() => assert.throws(() => assertCandidateVideoIdPreparePriceSnapshotV004(priceBytes, cost, 'not-a-clock')));
  for (const replacement of [{model: 'another-model'}, {checkedOn: '2026-02-30'},
    {standardPrice: {inputNanoUsdPerToken: 0, outputIncludingThinkingNanoUsdPerToken: 0, validThrough: '2026-12-31'}}]) {
    const invalidPrice = canonicalJsonBytesV001({...JSON.parse(priceBytes.toString('utf8')), ...replacement});
    const binding = {...cost.priceReference, fileSha256: createHash('sha256').update(invalidPrice).digest('hex')};
    check(() => assert.throws(() => assertCandidateVideoIdPreparePriceSnapshotV004(invalidPrice, {...cost, priceReference: binding}, now)));
    check(() => assert.throws(() => assertCandidateVideoIdPriceSnapshotV004(invalidPrice, {...inferenceCost, priceReference: binding})));
  }
  check(() => assert.equal(cost.preparationBillingReview.estimatedPreparationNanoUsd, '0'));
  check(() => assert.equal(cost.preparationBillingReview.permanentFreeGuarantee, false));
  process.stdout.write(JSON.stringify({suite: 'task-029-preparation-billing-core-mock-only', status: 'passed', checks,
    syntheticOnly: true, unknownInferenceCostPolicyChanged: false, materialOrEvaluationReads: 0,
    newFixturePaths: 0, apiCommunications: 0, formalArtifactsWritten: 0}) + '\n');
  process.exit(0);
}

const WORKSPACE_ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/u, '');
const SOURCE_VIDEO_PATH =
  'evals/clip_composition/outputs/work-distant-connection-real-input-preparation-ymUsGrT6EaA-v001/source/ymUsGrT6EaA.mp4';
const SOURCE_VIDEO_SHA = '79e9cf231000c18448d52541449f65ceecd6068ae800e18736c2a0c358c90537';
const SEMANTIC_PATH =
  'evals/clip_composition/outputs/work-distant-connection-semantic-utterance-ymUsGrT6EaA-v001/semantic-utterance-artifact-v001.json';
const SEMANTIC_SHA = 'e4eb9657994df2814c398a47e751e91d973db28c9ce674dc16f6eaea71f7ffd2';
const MOCK_FILES_URI = 'https://generativelanguage.googleapis.com/v1beta/files/opaque0001';

type ClosedFixture = {
  ordinal: number;
  localCandidateId: string;
  candidatePath: string;
  candidateSha: string;
  candidateVideoPath: string;
  candidateVideoSha: string;
  provenancePath: string;
  provenanceSha: string;
  containerDurationSeconds: {numerator: number; denominator: number};
  frameRate: number;
  frameCount: number;
  segments: Array<{
    segmentId: string;
    candidateStartTick: number;
    candidateEndTickExclusive: number;
    sourceStartMs: number;
    sourceEndMs: number;
  }>;
};

const CLOSED_FIXTURES: ClosedFixture[] = [
  {
    ordinal: 1,
    localCandidateId: 'camera-fear-escalation',
    candidatePath:
      'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-quality-increment-ymUsGrT6EaA-v001/candidate-response-v001.json',
    candidateSha: '8c8f1aa5bf69eb38076ce9ccdffab2f94cb2e8c2348695da2f3b45b9ad3b114d',
    candidateVideoPath:
      'evals/clip_composition/outputs/presentation/distant-connection-video-intervalization-improvement-ymUsGrT6EaA-v001/candidates/camera-fear-escalation/render/presentation-rendered-v002.mp4',
    candidateVideoSha: '4a878fee763a148ad2f0169decb34aee6b450921ea7a65eeeba4d3f5c5c609ee',
    provenancePath:
      'evals/clip_composition/outputs/presentation/distant-connection-video-intervalization-improvement-ymUsGrT6EaA-v001/candidates/camera-fear-escalation/render/video-intervalization-improvement-candidate-v001.json',
    provenanceSha: '210f75c45efff779b9d79ab84a412428763bf0d6c4c300996ba82bbd5a7bef92',
    containerDurationSeconds: {numerator: 557, denominator: 10},
    frameRate: 30,
    frameCount: 1671,
    segments: [
      {
        segmentId: 'segment-0001',
        candidateStartTick: 0,
        candidateEndTickExclusive: 209,
        sourceStartMs: 664354,
        sourceEndMs: 671316
      },
      {
        segmentId: 'segment-0002',
        candidateStartTick: 209,
        candidateEndTickExclusive: 1671,
        sourceStartMs: 1377918,
        sourceEndMs: 1426649
      }
    ]
  },
  {
    ordinal: 2,
    localCandidateId: 'medicine-effect-payoff',
    candidatePath:
      'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-quality-increment-ymUsGrT6EaA-v001/candidate-response-v001.json',
    candidateSha: '8c8f1aa5bf69eb38076ce9ccdffab2f94cb2e8c2348695da2f3b45b9ad3b114d',
    candidateVideoPath:
      'evals/clip_composition/outputs/presentation/distant-connection-video-intervalization-improvement-ymUsGrT6EaA-v001/candidates/medicine-effect-payoff/render/presentation-rendered-v002.mp4',
    candidateVideoSha: '455839bab76056af72e5ce57ca67672a475517c8fac6664d9520b9f11094ff32',
    provenancePath:
      'evals/clip_composition/outputs/presentation/distant-connection-video-intervalization-improvement-ymUsGrT6EaA-v001/candidates/medicine-effect-payoff/render/video-intervalization-improvement-candidate-v001.json',
    provenanceSha: '376a9a70fec87939917bc0fe68ce54b1dca8f8ab356c3e79599e263c227d557c',
    containerDurationSeconds: {numerator: 29, denominator: 1},
    frameRate: 30,
    frameCount: 870,
    segments: [
      {
        segmentId: 'segment-0001',
        candidateStartTick: 0,
        candidateEndTickExclusive: 183,
        sourceStartMs: 1680130,
        sourceEndMs: 1686233
      },
      {
        segmentId: 'segment-0002',
        candidateStartTick: 183,
        candidateEndTickExclusive: 870,
        sourceStartMs: 4389098,
        sourceEndMs: 4412003
      }
    ]
  },
  {
    ordinal: 3,
    localCandidateId: 'candidate-doctor-disappearance-to-ogre-mother',
    candidatePath:
      'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-concrete-payoff-ymUsGrT6EaA-v001/candidate-response-v001.json',
    candidateSha: '4239b6b51d3dd3dd548a9083ac0434860182d497321a89cf07c8f53eb66586b8',
    candidateVideoPath:
      'evals/clip_composition/outputs/presentation/distant-connection-video-prototype-concrete-payoff-ymUsGrT6EaA-v001/candidates/candidate-doctor-disappearance-to-ogre-mother/render/presentation-rendered-v002.mp4',
    candidateVideoSha: '8b29f9bbe6025e31c909a080ebad5578c9ec0f363b8522bd678131d8d480cb3a',
    provenancePath:
      'evals/clip_composition/outputs/presentation/distant-connection-video-prototype-concrete-payoff-ymUsGrT6EaA-v001/candidates/candidate-doctor-disappearance-to-ogre-mother/render/video-intervalization-improvement-candidate-v001.json',
    provenanceSha: '34c2d6ed84d27d61e5336ecc549dd66ed6709b19a6f7df4f4dcd00889a853018',
    containerDurationSeconds: {numerator: 2233313, denominator: 62500},
    frameRate: 30,
    frameCount: 1072,
    segments: [
      {
        segmentId: 'segment-0001',
        candidateStartTick: 0,
        candidateEndTickExclusive: 451,
        sourceStartMs: 1724755,
        sourceEndMs: 1739800
      },
      {
        segmentId: 'segment-0002',
        candidateStartTick: 451,
        candidateEndTickExclusive: 1072,
        sourceStartMs: 5693397,
        sourceEndMs: 5714097
      }
    ]
  },
  {
    ordinal: 4,
    localCandidateId: 'candidate-horror-claim-to-speed-up',
    candidatePath:
      'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-concrete-payoff-ymUsGrT6EaA-v001/candidate-response-v001.json',
    candidateSha: '4239b6b51d3dd3dd548a9083ac0434860182d497321a89cf07c8f53eb66586b8',
    candidateVideoPath:
      'evals/clip_composition/outputs/presentation/distant-connection-video-prototype-concrete-payoff-ymUsGrT6EaA-v001/candidates/candidate-horror-claim-to-speed-up/render/presentation-rendered-v002.mp4',
    candidateVideoSha: 'f86ca4550ad198a5153564c8ba7dd3368084105e3686ebd3ab8de5686e5a27b7',
    provenancePath:
      'evals/clip_composition/outputs/presentation/distant-connection-video-prototype-concrete-payoff-ymUsGrT6EaA-v001/candidates/candidate-horror-claim-to-speed-up/render/video-intervalization-improvement-candidate-v001.json',
    provenanceSha: 'a51c8d461ae3b2e4dd25ed0ba4d749019e56f9301302d8d1ad7238467e8529a1',
    containerDurationSeconds: {numerator: 25333333, denominator: 1000000},
    frameRate: 30,
    frameCount: 760,
    segments: [
      {
        segmentId: 'segment-0001',
        candidateStartTick: 0,
        candidateEndTickExclusive: 280,
        sourceStartMs: 246000,
        sourceEndMs: 255324
      },
      {
        segmentId: 'segment-0002',
        candidateStartTick: 280,
        candidateEndTickExclusive: 760,
        sourceStartMs: 1980000,
        sourceEndMs: 1996000
      }
    ]
  }
];

const UNRESOLVED_FIXTURE = {
  ordinal: 5,
  localCandidateId: 'candidate-horror-game-to-screams-001',
  candidatePath:
    'evals/clip_composition/outputs/work-distant-connection-luna-b6-new-candidates-ymUsGrT6EaA-v001/candidate-response-v001.json',
  candidateSha: 'cd21549ffa65b749e76c44710ccc6a92bdcf3ca99d07df4e281f5becf3277216',
  candidateVideoPath:
    'evals/clip_composition/outputs/work-distant-connection-candidate-review-v001/candidate-horror-game-to-screams-001/candidate-review-v001.mp4',
  candidateVideoSha: 'd2f6d8c3eceae5178703a01f3b8947ef3571219ab7d329af37c8a5569d875af0',
  provenancePath:
    'evals/clip_composition/outputs/work-distant-connection-candidate-review-v001/candidate-horror-game-to-screams-001/candidate-review-job-v001.json',
  provenanceSha: 'ee643a24f24e7deb6b2bf312a428aa93fa51a45372bc660652744051864b4812',
  containerDurationSeconds: {numerator: 13183333, denominator: 1000000},
  frameRate: 60,
  frameCount: 790,
  firstFramePts: 0,
  lastFramePts: 202240,
  lastFrameDurationPts: 256
} as const;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function orderedContractBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function reduced(numerator: number, denominator: number) {
  let left = Math.abs(numerator);
  let right = Math.abs(denominator);
  while (right !== 0) [left, right] = [right, left % right];
  return {numerator: numerator / left, denominator: denominator / left};
}

function compareRational(
  left: {numerator: number; denominator: number},
  right: {numerator: number; denominator: number}
): number {
  return Math.sign(left.numerator * right.denominator - right.numerator * left.denominator);
}

function legacySourceProjection(
  fixture: ClosedFixture,
  interval: {startTimeMs: number; endTimeMs: number}
) {
  const startFrame = reduced(interval.startTimeMs * fixture.frameRate, 1000);
  const endFrame = reduced(interval.endTimeMs * fixture.frameRate, 1000);
  return fixture.segments.flatMap((segment) => {
    const segmentStart = {numerator: segment.candidateStartTick, denominator: 1};
    const segmentEnd = {numerator: segment.candidateEndTickExclusive, denominator: 1};
    const intersectionStart = compareRational(startFrame, segmentStart) > 0
      ? startFrame : segmentStart;
    const intersectionEnd = compareRational(endFrame, segmentEnd) < 0 ? endFrame : segmentEnd;
    if (compareRational(intersectionStart, intersectionEnd) >= 0) return [];
    const segmentFrameCount = segment.candidateEndTickExclusive - segment.candidateStartTick;
    const sourceDurationMs = segment.sourceEndMs - segment.sourceStartMs;
    const project = (point: {numerator: number; denominator: number}) => reduced(
      segment.sourceStartMs * point.denominator * segmentFrameCount
        + (point.numerator - segment.candidateStartTick * point.denominator) * sourceDurationMs,
      point.denominator * segmentFrameCount
    );
    return [{
      mappingSegmentId: segment.segmentId,
      candidateStartTimeMs: reduced(
        intersectionStart.numerator * 1000,
        intersectionStart.denominator * fixture.frameRate
      ),
      candidateEndTimeMs: reduced(
        intersectionEnd.numerator * 1000,
        intersectionEnd.denominator * fixture.frameRate
      ),
      sourceStartTimeMs: project(intersectionStart),
      sourceEndTimeMs: project(intersectionEnd)
    }];
  });
}

function sharedJobFields(fixture: {
  ordinal: number;
  localCandidateId: string;
  candidatePath: string;
  candidateSha: string;
  candidateVideoPath: string;
  candidateVideoSha: string;
  containerDurationSeconds: {numerator: number; denominator: number};
  frameRate: number;
  frameCount: number;
  firstFramePts?: number;
  lastFramePts?: number;
  lastFrameDurationPts?: number;
}): Omit<
  CandidateVideoUnderstandingJobV001,
  'sourceMapping' | 'providerInput' | 'providerInputCanonicalSha256'
> {
  const nominalFrameDurationPts = 15360 / fixture.frameRate;
  return {
    schemaVersion: CANDIDATE_VIDEO_UNDERSTANDING_JOB_SCHEMA_V001,
    jobId: `candidate-video-understanding-job-${String(fixture.ordinal).padStart(4, '0')}`,
    experimentItem: {
      ordinal: fixture.ordinal,
      opaqueItemId: `item-${String(fixture.ordinal).padStart(4, '0')}`
    },
    evaluationScope: 'contract-output-and-mapping-fixture',
    comparisonInput: {status: 'not-applicable-contract-fixture'},
    purpose: CANDIDATE_VIDEO_UNDERSTANDING_PURPOSE_V001,
    localCandidateId: fixture.localCandidateId,
    localBindings: {
      candidate: {
        path: fixture.candidatePath,
        schemaVersion: 'distant-connection-luna-response-v001',
        fileSha256: fixture.candidateSha
      },
      semanticUtterance: {
        path: SEMANTIC_PATH,
        schemaVersion: 'semantic-utterance-artifact-v001',
        fileSha256: SEMANTIC_SHA
      },
      sourceVideo: {
        path: SOURCE_VIDEO_PATH,
        schemaVersion: 'media-file-v001',
        fileSha256: SOURCE_VIDEO_SHA
      },
      candidateVideo: {
        path: fixture.candidateVideoPath,
        schemaVersion: 'media-file-v001',
        fileSha256: fixture.candidateVideoSha
      }
    },
    sourceVideoId: 'ymUsGrT6EaA',
    candidateMedia: {
      mimeType: 'video/mp4' as const,
      containerDurationSeconds: fixture.containerDurationSeconds,
      video: {
        codecName: 'h264',
        width: 1920,
        height: 1080,
        frameRateNumerator: fixture.frameRate,
        frameRateDenominator: 1,
        frameCount: fixture.frameCount,
        timeBaseNumerator: 1,
        timeBaseDenominator: 15360,
        firstFramePts: fixture.firstFramePts ?? 0,
        lastFramePts: fixture.lastFramePts ?? (fixture.frameCount - 1) * nominalFrameDurationPts,
        lastFrameDurationPts: fixture.lastFrameDurationPts ?? nominalFrameDurationPts
      },
      audio: {codecName: 'aac', sampleRateHz: 44100, channels: 2}
    },
    referenceContext: {status: 'absent'},
    preflight: {
      status: 'pending-exact-request-and-token-count' as const,
      exactRequest: null,
      inputTokenCount: null,
      estimatedInputCostUsd: null,
      priceSnapshot: null,
      visibleOutputTokenLimit: 4096 as const,
      maximumExperimentInferenceCount: 5 as const,
      filesApiAncillaryCommunicationRequired: true as const,
      thinkingTokensBeforeExecution: 'not-exactly-fixable' as const,
      totalCostBeforeExecution: 'not-exact' as const
    },
    inferencePolicy: {
      inferencesForThisJob: 1 as const,
      automaticRetryCount: 0 as const,
      repairCallCount: 0 as const
    }
  };
}

function closedJob(fixture: ClosedFixture): CandidateVideoUnderstandingJobV001 {
  const frameDurationPts = 15360 / fixture.frameRate;
  return buildCandidateVideoUnderstandingJobV001({
    ...sharedJobFields(fixture),
    sourceMapping: {
      schemaVersion: CANDIDATE_VIDEO_SOURCE_MAPPING_SCHEMA_V001,
      status: 'closed',
      method: 'formal-frame-pts-piecewise-linear-v001',
      provenance: {
        path: fixture.provenancePath,
        schemaVersion: 'distant-connection-video-intervalization-improvement-candidate-v001',
        fileSha256: fixture.provenanceSha
      },
      candidateTimeBase: {numerator: 1, denominator: 15360},
      sourceTimeBase: {numerator: 1, denominator: 90000},
      candidateTimelineStartPts: 0,
      candidateTimelineEndPtsExclusive: fixture.frameCount * frameDurationPts,
      segments: fixture.segments.map((segment) => ({
        segmentId: segment.segmentId,
        candidateFrameStartIndex: segment.candidateStartTick,
        candidateFrameEndIndexExclusive: segment.candidateEndTickExclusive,
        candidateStartPts: segment.candidateStartTick * frameDurationPts,
        candidateEndPtsExclusive: segment.candidateEndTickExclusive * frameDurationPts,
        sourceFrameStartIndex: null,
        sourceFrameEndIndexExclusive: null,
        sourceStartPts: segment.sourceStartMs * 90,
        sourceEndPtsExclusive: segment.sourceEndMs * 90,
        sourceSelectionStartMs: segment.sourceStartMs,
        sourceSelectionEndMs: segment.sourceEndMs
      })),
      unmappedCandidatePts: []
    }
  });
}

function fifthJob(): CandidateVideoUnderstandingJobV001 {
  return buildCandidateVideoUnderstandingJobV001({
    ...sharedJobFields(UNRESOLVED_FIXTURE),
    sourceMapping: {
      schemaVersion: CANDIDATE_VIDEO_SOURCE_MAPPING_SCHEMA_V001,
      status: 'closed',
      method: 'formal-frame-pts-piecewise-linear-v001',
      provenance: {
        path:
          'evals/clip_composition/outputs/work-candidate-video-understanding-horror-game-to-screams-source-mapping-v001/candidate-video-source-pts-mapping-v001.json',
        schemaVersion: CANDIDATE_VIDEO_SOURCE_MAPPING_SCHEMA_V001,
        fileSha256: 'a6579f46bdb71723e5bbfd1e155da36f0d6e7a3373ab264800e56ec2076d4520'
      },
      candidateTimeBase: {numerator: 1, denominator: 15360},
      sourceTimeBase: {numerator: 1, denominator: 90000},
      candidateTimelineStartPts: 0,
      candidateTimelineEndPtsExclusive: 202496,
      segments: [
        {
          segmentId: 'segment-0001',
          candidateFrameStartIndex: 0,
          candidateFrameEndIndexExclusive: 357,
          candidateStartPts: 0,
          candidateEndPtsExclusive: 91392,
          sourceFrameStartIndex: 14962,
          sourceFrameEndIndexExclusive: 15319,
          sourceStartPts: 22444440,
          sourceEndPtsExclusive: 22979940,
          sourceSelectionStartMs: 249378,
          sourceSelectionEndMs: 255324
        },
        {
          segmentId: 'segment-0002',
          candidateFrameStartIndex: 357,
          candidateFrameEndIndexExclusive: 790,
          candidateStartPts: 91648,
          candidateEndPtsExclusive: 202496,
          sourceFrameStartIndex: 368066,
          sourceFrameEndIndexExclusive: 368499,
          sourceStartPts: 552100440,
          sourceEndPtsExclusive: 552749940,
          sourceSelectionStartMs: 6134433,
          sourceSelectionEndMs: 6141636
        }
      ],
      unmappedCandidatePts: [
        {startPts: 91392, endPtsExclusive: 91648, reason: 'no-candidate-frame'}
      ]
    }
  });
}

const JOBS = [...CLOSED_FIXTURES.map(closedJob), fifthJob()];

/** The existing PTS regression assertions are shared with the no-file task-032
 * entry point. No original media, teacher answers or evaluation file is read. */
function runCandidateVideoPtsRegressionV001(): number {
  let assertions = 0;
  const crossing = projectCandidateIntervalToSourceV001(JOBS[0], {startTimeMs: 6900, endTimeMs: 7100});
  assert.equal(crossing.sourceIntervals.length, 2);
  assert.deepEqual(crossing.sourceIntervals[0].sourceEndTimeMs, {numerator: 671316, denominator: 1});
  assert.deepEqual(crossing.sourceIntervals[1].sourceStartTimeMs, {numerator: 1377918, denominator: 1});
  assert.equal(crossing.unmappedCandidateIntervals.length, 0);
  assertions += 4;
  CLOSED_FIXTURES.forEach((fixture, index) => {
    const interval = {startTimeMs: 100, endTimeMs: Math.floor(fixture.frameCount * 1000 / fixture.frameRate) - 100};
    const ptsProjection = projectCandidateIntervalToSourceV001(JOBS[index], interval);
    assert.equal(ptsProjection.unmappedCandidateIntervals.length, 0);
    assert.deepEqual(
      ptsProjection.sourceIntervals.map(({overlappingSemanticUtteranceIds: _ignored, ...rest}) => rest),
      legacySourceProjection(fixture, interval), `${fixture.localCandidateId}のPTS-based投影が従来投影と一致しない`
    );
    assertions += 2;
  });
  const gapOnly = projectCandidateIntervalToSourceV001(JOBS[4], {startTimeMs: 5951, endTimeMs: 5966});
  assert.equal(gapOnly.sourceIntervals.length, 0);
  assert.equal(gapOnly.unmappedCandidateIntervals.length, 1);
  assert.deepEqual(gapOnly.unmappedCandidateIntervals[0], {
    candidateStartTimeMs: {numerator: 5951, denominator: 1}, candidateEndTimeMs: {numerator: 5966, denominator: 1},
    reason: 'no-candidate-frame'
  });
  const crossingGap = projectCandidateIntervalToSourceV001(JOBS[4], {startTimeMs: 5940, endTimeMs: 5980});
  assert.equal(crossingGap.sourceIntervals.length, 2);
  assert.equal(crossingGap.unmappedCandidateIntervals.length, 1);
  assert.deepEqual(crossingGap.sourceIntervals[0].candidateEndTimeMs, {numerator: 5950, denominator: 1});
  assert.deepEqual(crossingGap.unmappedCandidateIntervals[0], {
    candidateStartTimeMs: {numerator: 5950, denominator: 1}, candidateEndTimeMs: {numerator: 17900, denominator: 3},
    reason: 'no-candidate-frame'
  });
  assert.deepEqual(crossingGap.sourceIntervals[1].candidateStartTimeMs, {numerator: 17900, denominator: 3});
  assertions += 8;
  return assertions;
}

if (process.argv.includes('--task032-pts-only')) {
  const checks = runCandidateVideoPtsRegressionV001();
  process.stdout.write(JSON.stringify({suite: 'task-032-existing-pts-regression-memory-only', status: 'passed', checks,
    materialOrEvaluationReads: 0, newFixturePaths: 0, apiCommunications: 0, formalArtifactsWritten: 0}) + '\n');
  process.exit(0);
}

function readyResultContractJobFixture(): CandidateVideoUnderstandingJobV001 {
  const job = clone(JOBS[0]);
  const exactRequest = buildCandidateVideoStaticGenerateContentWireRequestV001(
    job,
    MOCK_FILES_URI
  );
  job.preflight = {
    status: 'ready',
    exactRequest: {
      path: 'fixtures/exact-request-v001.json',
      schemaVersion: 'candidate-video-understanding-exact-provider-request-v001',
      fileSha256: sha256(
        serializeCandidateVideoStaticGenerateContentWireRequestV001(exactRequest, job)
      )
    },
    inputTokenCount: 16710,
    estimatedInputCostUsd: '0.0125325',
    priceSnapshot: {
      path: 'fixtures/price-snapshot-v001.json',
      schemaVersion: 'gemini-price-snapshot-v001',
      fileSha256: '5'.repeat(64)
    },
    visibleOutputTokenLimit: 4096,
    maximumExperimentInferenceCount: 5,
    filesApiAncillaryCommunicationRequired: true,
    thinkingTokensBeforeExecution: 'not-exactly-fixable',
    totalCostBeforeExecution: 'not-exact'
  };
  assertCandidateVideoUnderstandingPreflightMarkedReadyV001(job);
  return job;
}

const COMPARISON_WINDOW_FIXTURES = [
  {
    id: 'camera',
    localCandidateId: 'camera-fear-escalation',
    points: [
      {locusId: 'camera-fear-escalation-first', sourceTimeMs: 664354},
      {locusId: 'camera-fear-escalation-second', sourceTimeMs: 1412798}
    ],
    human: [
      {locusId: 'camera-fear-escalation-first', startTimeMs: 664354, endTimeMs: 671316},
      {locusId: 'camera-fear-escalation-second', startTimeMs: 1377918, endTimeMs: 1426649}
    ],
    expectedFreeBaseline: [[646264, 683238], [1377898, 1428811]],
    expected: [[628078, 683238], [1377898, 1428251]]
  },
  {
    id: 'medicine',
    localCandidateId: 'medicine-effect-payoff',
    points: [
      {locusId: 'medicine-effect-payoff-first', sourceTimeMs: 1680130},
      {locusId: 'medicine-effect-payoff-second', sourceTimeMs: 4398688}
    ],
    human: [
      {locusId: 'medicine-effect-payoff-first', startTimeMs: 1680130, endTimeMs: 1686233},
      {locusId: 'medicine-effect-payoff-second', startTimeMs: 4389098, endTimeMs: 4412003}
    ],
    expectedFreeBaseline: [[1661474, 1700141], [4379070, 4414765]],
    expected: [[1644392, 1700141], [4363406, 4414164]]
  },
  {
    id: 'horror-claim',
    localCandidateId: 'candidate-horror-claim-to-speed-up',
    points: [
      {locusId: 'candidate-horror-claim-to-speed-up-first', sourceTimeMs: 249378},
      {locusId: 'candidate-horror-claim-to-speed-up-second', sourceTimeMs: 1984756}
    ],
    human: [
      {locusId: 'candidate-horror-claim-to-speed-up-first', startTimeMs: 246000, endTimeMs: 255324},
      {locusId: 'candidate-horror-claim-to-speed-up-second', startTimeMs: 1980000, endTimeMs: 1996000}
    ],
    expectedFreeBaseline: [[216538, 265495], [1967689, 2015211]],
    expected: [[214410, 264995], [1945338, 2015211]]
  },
  {
    id: 'doctor',
    localCandidateId: 'candidate-doctor-disappearance-to-ogre-mother',
    points: [
      {locusId: 'candidate-doctor-disappearance-to-ogre-mother-first', sourceTimeMs: 1731997},
      {locusId: 'candidate-doctor-disappearance-to-ogre-mother-second', sourceTimeMs: 5698719}
    ],
    human: [
      {locusId: 'candidate-doctor-disappearance-to-ogre-mother-first', startTimeMs: 1724755, endTimeMs: 1739800},
      {locusId: 'candidate-doctor-disappearance-to-ogre-mother-second', startTimeMs: 5693397, endTimeMs: 5714097}
    ],
    expectedFreeBaseline: [[1715972, 1750321], [5682312, 5715037]],
    expected: [[1695299, 1750321], [5662938, 5714097]]
  },
  {
    id: 'screams',
    localCandidateId: 'candidate-horror-game-to-screams-001',
    points: [
      {locusId: 'candidate-horror-game-to-screams-001-first', sourceTimeMs: 249378},
      {locusId: 'candidate-horror-game-to-screams-001-second', sourceTimeMs: 6134433}
    ],
    human: null,
    expectedFreeBaseline: [[216538, 265495], [6114357, 6153435]],
    expected: [[214410, 264995], [6099087, 6153435]]
  }
] as const;

function buildComparisonContractFixture(
  baseJob: CandidateVideoUnderstandingJobV001,
  points: readonly CandidateVideoCandidatePointV001[],
  comparison: CandidateVideoComparisonWindowsV001,
  fixedWindowSettings: CandidateVideoFixedWindowSettingsV001
): {
  job: CandidateVideoUnderstandingJobV001;
  plan: CandidateVideoComparisonWindowPlanV001;
} {
  const fixtureId = baseJob.experimentItem.opaqueItemId;
  const explorationVideo = {
    path: `fixtures/${fixtureId}-wider-exploration-video-v001.mp4`,
    schemaVersion: 'candidate-video-exploration-media-v001',
    fileSha256: sha256(Buffer.from(`${fixtureId}-wider-exploration-video-v001`, 'utf8'))
  };
  const sourceMappingProvenance = {
    path: `fixtures/${fixtureId}-wider-exploration-source-pts-mapping-v001.json`,
    schemaVersion: CANDIDATE_VIDEO_SOURCE_MAPPING_SCHEMA_V001,
    fileSha256: sha256(Buffer.from(`${fixtureId}-source-pts-mapping-v001`, 'utf8'))
  };
  const plan: CandidateVideoComparisonWindowPlanV001 = {
    schemaVersion: 'candidate-video-comparison-window-plan-v001',
    candidateId: baseJob.localCandidateId,
    sourceVideoId: baseJob.sourceVideoId,
    bindings: {
      candidateResponse: clone(baseJob.localBindings.candidate),
      semanticUtterance: clone(baseJob.localBindings.semanticUtterance),
      sourceVideo: clone(baseJob.localBindings.sourceVideo),
      explorationVideo,
      sourceMappingProvenance
    },
    fixedWindowSettingsApproval: {
      status: 'proposal-pending-kawafmm-approval',
      humanEvaluationArtifactsExcludedFromExecution: true
    },
    fixedWindowSettings: clone(fixedWindowSettings),
    candidatePoints: points.map((point) => ({...point})),
    freeFixedWindows: comparison.freeFixedWindow.map((window) => ({...window})),
    geminiExplorationWindows: comparison.geminiExplorationWindow.map((window) => ({...window})),
    sameSourceIntervals: true
  };
  const planBinding = {
    path: `fixtures/${fixtureId}-comparison-window-plan-v001.json`,
    schemaVersion: 'candidate-video-comparison-window-plan-v001',
    fileSha256: sha256(canonicalJsonBytesV001(plan))
  };
  let candidateStartPts = 0;
  const segments = comparison.freeFixedWindow.map((window, index) => {
    const durationMs = window.endTimeMs - window.startTimeMs;
    const candidateEndPtsExclusive = candidateStartPts + durationMs;
    const segment = {
      segmentId: `segment-${String(index + 1).padStart(4, '0')}`,
      candidateFrameStartIndex: candidateStartPts,
      candidateFrameEndIndexExclusive: candidateEndPtsExclusive,
      candidateStartPts,
      candidateEndPtsExclusive,
      sourceFrameStartIndex: null,
      sourceFrameEndIndexExclusive: null,
      sourceStartPts: window.startTimeMs * 90,
      sourceEndPtsExclusive: window.endTimeMs * 90,
      sourceSelectionStartMs: window.startTimeMs,
      sourceSelectionEndMs: window.endTimeMs
    };
    candidateStartPts = candidateEndPtsExclusive;
    return segment;
  });
  const totalDurationMs = candidateStartPts;
  const {
    providerInput: _providerInput,
    providerInputCanonicalSha256: _providerInputCanonicalSha256,
    ...baseFields
  } = clone(baseJob);
  const job = buildCandidateVideoUnderstandingJobV001({
    ...baseFields,
    evaluationScope: 'intervalization-replacement-comparison',
    comparisonInput: {
      status: 'resolved',
      mediaRole: 'wider-candidate-surrounding-region',
      sharedFreeAndGeminiWindowPlan: planBinding
    },
    localBindings: {...baseFields.localBindings, candidateVideo: explorationVideo},
    candidateMedia: {
      ...baseFields.candidateMedia,
      containerDurationSeconds: reduced(totalDurationMs, 1000),
      video: {
        ...baseFields.candidateMedia.video,
        frameRateNumerator: 1000,
        frameRateDenominator: 1,
        frameCount: totalDurationMs,
        timeBaseNumerator: 1,
        timeBaseDenominator: 1000,
        firstFramePts: 0,
        lastFramePts: totalDurationMs - 1,
        lastFrameDurationPts: 1
      }
    },
    sourceMapping: {
      schemaVersion: CANDIDATE_VIDEO_SOURCE_MAPPING_SCHEMA_V001,
      status: 'closed',
      method: 'formal-frame-pts-piecewise-linear-v001',
      provenance: sourceMappingProvenance,
      candidateTimeBase: {numerator: 1, denominator: 1000},
      sourceTimeBase: {numerator: 1, denominator: 90000},
      candidateTimelineStartPts: 0,
      candidateTimelineEndPtsExclusive: totalDurationMs,
      segments,
      unmappedCandidatePts: []
    }
  });
  return {job, plan};
}

async function writeTemporaryFixtureFile(
  workspaceRoot: string,
  relativePath: string,
  bytes: Uint8Array
): Promise<void> {
  const absolutePath = join(workspaceRoot, relativePath);
  await mkdir(dirname(absolutePath), {recursive: true});
  await writeFile(absolutePath, bytes);
}

async function materializeReadyComparisonMockFixture(
  fixture: {
    job: CandidateVideoUnderstandingJobV001;
    plan: CandidateVideoComparisonWindowPlanV001;
    candidateBytes: Buffer;
  },
  semanticBytes: Buffer
): Promise<{
  workspaceRoot: string;
  job: CandidateVideoUnderstandingJobV001;
  plan: CandidateVideoComparisonWindowPlanV001;
  mappingArtifact: Record<string, unknown>;
  exactRequest: ReturnType<typeof buildCandidateVideoStaticGenerateContentWireRequestV001>;
  cleanup(): Promise<void>;
}> {
  const workspaceRoot = await mkdtemp(join(tmpdir(), 'zev2-candidate-video-understanding-'));
  try {
    const job = clone(fixture.job);
    const plan = clone(fixture.plan);
    if (job.comparisonInput.status !== 'resolved' || job.sourceMapping.status !== 'closed') {
      throw new Error('materialized mock fixture requires resolved comparison and closed mapping');
    }
    const paths = {
      candidate: 'fixtures/candidate-response-v001.json',
      semantic: 'fixtures/semantic-utterance-v001.json',
      sourceVideo: 'fixtures/source-media.fixture-bytes',
      explorationVideo: 'fixtures/exploration-media.fixture-bytes',
      mapping: 'fixtures/source-pts-mapping-v001.json',
      plan: 'fixtures/comparison-window-plan-v001.json',
      exactRequest: 'fixtures/exact-request-v001.json',
      priceSnapshot: 'fixtures/price-snapshot-v001.json'
    };
    const sourceVideoBytes = Buffer.from('source-media-fixture-bytes', 'utf8');
    const explorationVideoBytes = Buffer.from('exploration-media-fixture-bytes', 'utf8');
    job.localBindings = {
      candidate: {
        path: paths.candidate,
        schemaVersion: fixture.job.localBindings.candidate.schemaVersion,
        fileSha256: sha256(fixture.candidateBytes)
      },
      semanticUtterance: {
        path: paths.semantic,
        schemaVersion: fixture.job.localBindings.semanticUtterance.schemaVersion,
        fileSha256: sha256(semanticBytes)
      },
      sourceVideo: {
        path: paths.sourceVideo,
        schemaVersion: 'media-file-v001',
        fileSha256: sha256(sourceVideoBytes)
      },
      candidateVideo: {
        path: paths.explorationVideo,
        schemaVersion: 'candidate-video-exploration-media-v001',
        fileSha256: sha256(explorationVideoBytes)
      }
    };
    const mapping = {
      candidateTimeBase: clone(job.sourceMapping.candidateTimeBase),
      sourceTimeBase: clone(job.sourceMapping.sourceTimeBase),
      candidateTimelineStartPts: job.sourceMapping.candidateTimelineStartPts,
      candidateTimelineEndPtsExclusive: job.sourceMapping.candidateTimelineEndPtsExclusive,
      segments: clone(job.sourceMapping.segments),
      unmappedCandidatePts: clone(job.sourceMapping.unmappedCandidatePts)
    };
    const mappingArtifact: Record<string, unknown> = {
      schemaVersion: CANDIDATE_VIDEO_SOURCE_MAPPING_SCHEMA_V001,
      artifactId: 'comparison-mock-source-pts-mapping-v001',
      candidateId: job.localCandidateId,
      sourceVideoId: job.sourceVideoId,
      evidenceBindings: {
        candidateVideo: clone(job.localBindings.candidateVideo),
        sourceVideo: clone(job.localBindings.sourceVideo)
      },
      mapping
    };
    const mappingBytes = canonicalJsonBytesV001(mappingArtifact);
    const mappingBinding = {
      path: paths.mapping,
      schemaVersion: CANDIDATE_VIDEO_SOURCE_MAPPING_SCHEMA_V001,
      fileSha256: sha256(mappingBytes)
    };
    job.sourceMapping.provenance = mappingBinding;
    plan.bindings = {
      candidateResponse: clone(job.localBindings.candidate),
      semanticUtterance: clone(job.localBindings.semanticUtterance),
      sourceVideo: clone(job.localBindings.sourceVideo),
      explorationVideo: clone(job.localBindings.candidateVideo),
      sourceMappingProvenance: clone(mappingBinding)
    };
    plan.fixedWindowSettingsApproval = {
      status: 'approved',
      humanEvaluationArtifactsExcludedFromExecution: true
    };
    const planBytes = canonicalJsonBytesV001(plan);
    job.comparisonInput.sharedFreeAndGeminiWindowPlan = {
      path: paths.plan,
      schemaVersion: 'candidate-video-comparison-window-plan-v001',
      fileSha256: sha256(planBytes)
    };
    const exactRequest = buildCandidateVideoStaticGenerateContentWireRequestV001(
      job,
      MOCK_FILES_URI
    );
    const exactRequestBytes = serializeCandidateVideoStaticGenerateContentWireRequestV001(
      exactRequest,
      job
    );
    const priceSnapshotBytes = canonicalJsonBytesV001({
      schemaVersion: 'gemini-price-snapshot-v001',
      classification: 'fixture-without-network'
    });
    job.preflight = {
      status: 'ready',
      exactRequest: {
        path: paths.exactRequest,
        schemaVersion: 'candidate-video-understanding-exact-provider-request-v001',
        fileSha256: sha256(exactRequestBytes)
      },
      inputTokenCount: 16710,
      estimatedInputCostUsd: '0.0125325',
      priceSnapshot: {
        path: paths.priceSnapshot,
        schemaVersion: 'gemini-price-snapshot-v001',
        fileSha256: sha256(priceSnapshotBytes)
      },
      visibleOutputTokenLimit: 4096,
      maximumExperimentInferenceCount: 5,
      filesApiAncillaryCommunicationRequired: true,
      thinkingTokensBeforeExecution: 'not-exactly-fixable',
      totalCostBeforeExecution: 'not-exact'
    };
    assertCandidateVideoUnderstandingPreflightMarkedReadyV001(job);
    await Promise.all([
      writeTemporaryFixtureFile(workspaceRoot, paths.candidate, fixture.candidateBytes),
      writeTemporaryFixtureFile(workspaceRoot, paths.semantic, semanticBytes),
      writeTemporaryFixtureFile(workspaceRoot, paths.sourceVideo, sourceVideoBytes),
      writeTemporaryFixtureFile(workspaceRoot, paths.explorationVideo, explorationVideoBytes),
      writeTemporaryFixtureFile(workspaceRoot, paths.mapping, mappingBytes),
      writeTemporaryFixtureFile(workspaceRoot, paths.plan, planBytes),
      writeTemporaryFixtureFile(workspaceRoot, paths.exactRequest, exactRequestBytes),
      writeTemporaryFixtureFile(workspaceRoot, paths.priceSnapshot, priceSnapshotBytes)
    ]);
    return {
      workspaceRoot,
      job,
      plan,
      mappingArtifact,
      exactRequest,
      async cleanup() {
        await rm(workspaceRoot, {recursive: true, force: true});
      }
    };
  } catch (error) {
    await rm(workspaceRoot, {recursive: true, force: true});
    throw error;
  }
}

async function materializeAvailableHumanComparisonReferenceFixture(
  fixture: Awaited<ReturnType<typeof materializeReadyComparisonMockFixture>>,
  humanApprovedRequiredIntervals: readonly [
    {locusId: string; startTimeMs: number; endTimeMs: number},
    {locusId: string; startTimeMs: number; endTimeMs: number}
  ],
  reviewKind: 'selection-v002-accepted' | 'quality-v001-rejected'
): Promise<{
  binding: {path: string; schemaVersion: string; fileSha256: string};
  verification: Awaited<ReturnType<
    typeof verifyCandidateVideoHumanComparisonReferenceEvidenceV001
  >>;
  reference: Record<string, unknown>;
  humanReview: Record<string, unknown>;
  paths: {intervalProvenance: string; humanReview: string; reference: string};
}> {
  if (fixture.job.comparisonInput.status !== 'resolved') {
    throw new Error('human comparison fixture requires resolved comparison input');
  }
  const paths = {
    intervalProvenance: 'fixtures/human-intervalization-result-v001.json',
    humanReview: 'fixtures/human-review-result.json',
    reference: 'fixtures/human-comparison-reference-v001.json'
  };
  const intervalProvenance = {
    schemaVersion: 'distant-connection-video-intervalization-improvement-result-v001',
    sourceVideoId: fixture.job.sourceVideoId,
    sourceBindings: {
      sourceVideo: {
        path: fixture.job.localBindings.sourceVideo.path,
        fileSha256: fixture.job.localBindings.sourceVideo.fileSha256
      },
      candidateResponse: {
        path: fixture.job.localBindings.candidate.path,
        fileSha256: fixture.job.localBindings.candidate.fileSha256
      }
    },
    candidates: [
      ...(reviewKind === 'quality-v001-rejected'
        ? [{
            candidateId: 'different-candidate-not-selected-by-array-position',
            firstPart: {sourceStartMs: 1, sourceEndMs: 2},
            secondPart: {sourceStartMs: 3, sourceEndMs: 4}
          }]
        : []),
      {
      candidateId: fixture.job.localCandidateId,
      firstPart: {
        sourceStartMs: humanApprovedRequiredIntervals[0].startTimeMs,
        sourceEndMs: humanApprovedRequiredIntervals[0].endTimeMs
      },
      secondPart: {
        sourceStartMs: humanApprovedRequiredIntervals[1].startTimeMs,
        sourceEndMs: humanApprovedRequiredIntervals[1].endTimeMs
      }
    }]
  };
  const intervalProvenanceBytes = canonicalJsonBytesV001(intervalProvenance);
  const intervalProvenanceBinding = {
    path: paths.intervalProvenance,
    schemaVersion: 'distant-connection-video-intervalization-improvement-result-v001',
    fileSha256: sha256(intervalProvenanceBytes)
  };
  const humanReview = reviewKind === 'selection-v002-accepted'
    ? {
        schemaVersion: 'distant-connection-human-review-result-v002',
        sourceVideoId: fixture.job.sourceVideoId,
        reviewedAt: '2026-08-25',
        reviewer: 'kawafmm',
        sourceBindings: {
          candidateResponse: clone(fixture.job.localBindings.candidate),
          originalVideoPrototypeResult: {
            path: 'fixtures/original-video-prototype-result-v001.json',
            schemaVersion: 'distant-connection-video-prototype-result-v001',
            fileSha256: '1'.repeat(64)
          },
          intervalizationImprovementResult: intervalProvenanceBinding
        },
        candidateCount: 2,
        candidateReviews: [
          {
            candidateId: 'camera-fear-escalation',
            candidateSelection: 'pass',
            originalIntervalization: 'fail',
            improvedIntervalization: 'pass',
            shortFormViability: 'pass',
            classification: 'accepted-distant-connection-example',
            reason: '旧版では発話の原因となる重要な恐怖映像を落としていた。区間化改善によって必要な映像を含めた結果、前半との接続が理解でき、遠方接続として成立した。',
            shortFormAssessment: '必要な恐怖映像と反応を短尺として自然な長さに含められる。'
          },
          {
            candidateId: 'medicine-effect-payoff',
            candidateSelection: 'fail',
            originalIntervalization: 'fail',
            improvedIntervalization: 'pass',
            shortFormViability: 'fail',
            classification: 'rejected-short-form-candidate',
            reason: '区間化不良の診断と改善は正しかった。しかし改善後でも接続理解に必要な前提情報が多すぎ、説明と文脈をさらに長くすると動画のテンポを損なうため、遠方接続候補として不採用とする。',
            shortFormAssessment: '接続を理解するための前提情報が短尺として自然な長さに収まらない。これ以上の区間拡張は行わない。'
          }
        ],
        selectionPrinciple: '前半と後半の意味関係を理解するために必要な前提情報が、短尺動画として自然な長さに収まること。前提情報が複雑で長い説明区間を必要とする候補は、意味的接続が存在していても除外する。'
      }
    : {
        schemaVersion: 'distant-connection-human-quality-review-result-v001',
        sourceVideoId: fixture.job.sourceVideoId,
        reviewedAt: '2026-08-29',
        reviewer: 'kawafmm',
        sourceBindings: {
          candidateResponse: clone(fixture.job.localBindings.candidate),
          videoPrototypeResult: intervalProvenanceBinding
        },
        candidateCount: 2,
        candidateReviews: [
          {
            candidateId: 'different-candidate-not-selected-by-array-position',
            connectionValidity: 'pass',
            payoffStrength: 'fail',
            visualSuitability: 'not-primary-cause',
            intervalizationEvaluation: 'fail',
            finalDecision: 'pass',
            humanReason: '対象外候補を配列位置では選ばないことを検査するfixture。'
          },
          {
            candidateId: fixture.job.localCandidateId,
            connectionValidity: 'pass',
            payoffStrength: 'story-level-pass',
            visualSuitability: 'fail',
            intervalizationEvaluation: 'pass',
            finalDecision: 'fail',
            humanReason: '区間化は成立したが映像適性を理由に不採用としたfixture。'
          }
        ],
        responsibilityPrinciple: 'Lunaは意味上の接続と文章上の回収候補を提示する。区間化は候補を実動画区間へ変換し、動画QCは技術成立を検査する。実動画を確認した人間が接続成立・回収強度・映像適性・区間化評価・最終採否を独立して正式所有する。'
      };
  const humanReviewBytes = orderedContractBytes(humanReview);
  const humanReviewBinding = {
    path: paths.humanReview,
    schemaVersion: humanReview.schemaVersion,
    fileSha256: sha256(humanReviewBytes)
  };
  const reference = {
    schemaVersion: CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
    candidateId: fixture.job.localCandidateId,
    sourceVideoId: fixture.job.sourceVideoId,
    referenceKind: 'human-required-intervals-available',
    evidenceBindings: {
      humanReview: humanReviewBinding,
      intervalProvenance: intervalProvenanceBinding,
      comparisonWindowPlan:
        clone(fixture.job.comparisonInput.sharedFreeAndGeminiWindowPlan)
    },
    humanDisposition: reviewKind === 'selection-v002-accepted' ? 'accepted' : 'rejected',
    humanApprovedRequiredIntervals: humanApprovedRequiredIntervals.map((interval) => ({
      ...interval
    }))
  };
  const referenceBytes = canonicalJsonBytesV001(reference);
  const binding = {
    path: paths.reference,
    schemaVersion: CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
    fileSha256: sha256(referenceBytes)
  };
  await Promise.all([
    writeTemporaryFixtureFile(
      fixture.workspaceRoot,
      paths.intervalProvenance,
      intervalProvenanceBytes
    ),
    writeTemporaryFixtureFile(fixture.workspaceRoot, paths.humanReview, humanReviewBytes),
    writeTemporaryFixtureFile(fixture.workspaceRoot, paths.reference, referenceBytes)
  ]);
  const verification = await verifyCandidateVideoHumanComparisonReferenceEvidenceV001(
    binding,
    fixture.job,
    fixture.workspaceRoot
  );
  return {binding, verification, reference, humanReview, paths};
}

async function materializeNegativeHumanComparisonReferenceFixture(
  fixture: Awaited<ReturnType<typeof materializeReadyComparisonMockFixture>>,
  evaluatedIntervals: readonly [
    {startTimeMs: number; endTimeMs: number},
    {startTimeMs: number; endTimeMs: number}
  ]
): Promise<{
  binding: {path: string; schemaVersion: string; fileSha256: string};
  verification: Awaited<ReturnType<
    typeof verifyCandidateVideoHumanComparisonReferenceEvidenceV001
  >>;
  reference: Record<string, unknown>;
  humanReview: Record<string, unknown>;
  candidateReview: Record<string, unknown>;
  paths: {candidateReview: string; humanReview: string; reference: string};
}> {
  if (fixture.job.comparisonInput.status !== 'resolved') {
    throw new Error('negative human comparison fixture requires resolved comparison input');
  }
  const paths = {
    candidateReview: 'fixtures/candidate-review-result-v001.json',
    humanReview: 'fixtures/candidate-human-review-result-v001.json',
    reference: 'fixtures/negative-human-comparison-reference-v001.json'
  };
  const candidateReview = {
    schemaVersion: 'distant-connection-candidate-review-result-v001',
    resultId: `${fixture.job.localCandidateId}-review-result-v001`,
    artifactClassification: 'candidate-review-artifact',
    sourceVideoId: fixture.job.sourceVideoId,
    candidateId: fixture.job.localCandidateId,
    generatedAt: '2026-08-30T11:36:39.000Z',
    reviewJobBinding: {
      path: 'fixtures/candidate-review-job-v001.json',
      schemaVersion: 'distant-connection-candidate-review-job-v001',
      fileSha256: '2'.repeat(64)
    },
    candidateResponseBinding: clone(fixture.job.localBindings.candidate),
    reviewVideo: {
      path: 'fixtures/candidate-review-v001.mp4',
      fileSha256: '3'.repeat(64)
    },
    mediaInspection: {
      durationMs: evaluatedIntervals.reduce(
        (sum, interval) => sum + interval.endTimeMs - interval.startTimeMs,
        0
      ),
      videoPresent: true,
      audioPresent: true
    },
    evaluatedParts: [
      {
        part: 'first',
        selectedSemanticUtteranceIds: ['semantic-utterance-fixture-first'],
        enclosedSemanticUtteranceIds: ['semantic-utterance-fixture-first'],
        firstOrdinal: 1,
        lastOrdinal: 1,
        sourceInterval: {
          sourceStartMs: evaluatedIntervals[0].startTimeMs,
          sourceEndMs: evaluatedIntervals[0].endTimeMs
        }
      },
      {
        part: 'second',
        selectedSemanticUtteranceIds: ['semantic-utterance-fixture-second'],
        enclosedSemanticUtteranceIds: ['semantic-utterance-fixture-second'],
        firstOrdinal: 2,
        lastOrdinal: 2,
        sourceInterval: {
          sourceStartMs: evaluatedIntervals[1].startTimeMs,
          sourceEndMs: evaluatedIntervals[1].endTimeMs
        }
      }
    ],
    generationStatus: 'succeeded',
    statusFlags: {
      formalSelection: false,
      formalRenderer: false,
      completedShort: false,
      technicalQcCompleted: false
    },
    responsibilityPrinciple: '本成果物は正式selection前の候補を人間が直接確認するため、前半・後半それぞれを最初の選択発話開始から最後の選択発話終了までの元映像・元音声区間へ決定的に投影する。候補採否、正式区間承認、正式renderer出力、完成short、技術QCを所有しない。'
  };
  const candidateReviewBytes = orderedContractBytes(candidateReview);
  const candidateReviewBinding = {
    path: paths.candidateReview,
    schemaVersion: 'distant-connection-candidate-review-result-v001',
    fileSha256: sha256(candidateReviewBytes)
  };
  const humanReview = {
    schemaVersion: 'distant-connection-candidate-human-review-result-v001',
    reviewId: `${fixture.job.localCandidateId}-human-review-v001`,
    sourceVideoId: fixture.job.sourceVideoId,
    candidateId: fixture.job.localCandidateId,
    reviewedAt: '2026-08-30T11:36:39.000Z',
    reviewer: {kind: 'human', id: 'kawafmm'},
    sourceBindings: {
      candidateResponse: clone(fixture.job.localBindings.candidate),
      candidateReviewResult: candidateReviewBinding
    },
    evaluatedIntervals: {
      firstPartSourceInterval: {
        sourceStartMs: evaluatedIntervals[0].startTimeMs,
        sourceEndMs: evaluatedIntervals[0].endTimeMs
      },
      secondPartSourceInterval: {
        sourceStartMs: evaluatedIntervals[1].startTimeMs,
        sourceEndMs: evaluatedIntervals[1].endTimeMs
      }
    },
    verdict: 'rejected',
    primaryCause: 'candidate-selection',
    reason: '候補発見段階で人間が不採用としたfixture。',
    selectionStatus: 'not-selected',
    responsibilityPrinciple: '本成果物はcandidate review artifactを見た人間の候補評価を保存する。正式selectionや正式区間を生成・承認せず、不採用候補をnot-selectedのまま保持する。'
  };
  const humanReviewBytes = orderedContractBytes(humanReview);
  const humanReviewBinding = {
    path: paths.humanReview,
    schemaVersion: 'distant-connection-candidate-human-review-result-v001',
    fileSha256: sha256(humanReviewBytes)
  };
  const reference = {
    schemaVersion: CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
    candidateId: fixture.job.localCandidateId,
    sourceVideoId: fixture.job.sourceVideoId,
    referenceKind: 'candidate-discovery-negative-without-approved-required-intervals',
    evidenceBindings: {
      humanReview: humanReviewBinding,
      intervalProvenance: null,
      comparisonWindowPlan:
        clone(fixture.job.comparisonInput.sharedFreeAndGeminiWindowPlan)
    },
    humanDisposition: 'rejected',
    humanApprovedRequiredIntervals: []
  };
  const referenceBytes = canonicalJsonBytesV001(reference);
  const binding = {
    path: paths.reference,
    schemaVersion: CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
    fileSha256: sha256(referenceBytes)
  };
  await Promise.all([
    writeTemporaryFixtureFile(fixture.workspaceRoot, paths.candidateReview, candidateReviewBytes),
    writeTemporaryFixtureFile(fixture.workspaceRoot, paths.humanReview, humanReviewBytes),
    writeTemporaryFixtureFile(fixture.workspaceRoot, paths.reference, referenceBytes)
  ]);
  const verification = await verifyCandidateVideoHumanComparisonReferenceEvidenceV001(
    binding,
    fixture.job,
    fixture.workspaceRoot
  );
  return {binding, verification, reference, humanReview, candidateReview, paths};
}

function validProviderOutput(): CandidateVideoUnderstandingProviderOutputV001 {
  return {
    schemaVersion: CANDIDATE_VIDEO_UNDERSTANDING_PROVIDER_OUTPUT_SCHEMA_V001,
    summary: '候補動画内で確認できる内容だけを記録した。',
    roleObservations: [
      {
        role: 'coreEvent',
        status: 'observed',
        intervals: [{
          observationId: 'observation-001',
          startTimeMs: 6900,
          endTimeMs: 7100,
          factualDescription: '連結点をまたいで主要な出来事が続く。',
          evidenceModalities: ['video', 'audio']
        }],
        factualDescription: '主要な出来事を確認した。'
      },
      {
        role: 'reaction',
        status: 'observed',
        intervals: [{
          observationId: 'observation-002',
          startTimeMs: 7100,
          endTimeMs: 9000,
          factualDescription: '発話と音声による反応がある。',
          evidenceModalities: ['audio', 'speech']
        }],
        factualDescription: '反応を確認した。'
      },
      {
        role: 'naturalEnding',
        status: 'observed',
        intervals: [{
          observationId: 'observation-003',
          startTimeMs: 9000,
          endTimeMs: 10000,
          factualDescription: '反応が収束する。',
          evidenceModalities: ['video', 'audio', 'speech']
        }],
        factualDescription: '自然な収束を確認した。'
      },
      {
        role: 'causeOrTrigger',
        status: 'observed',
        intervals: [{
          observationId: 'observation-004',
          startTimeMs: 1000,
          endTimeMs: 2000,
          factualDescription: '映像上のきっかけが確認できる。',
          evidenceModalities: ['video']
        }],
        factualDescription: 'きっかけを確認した。'
      },
      {
        role: 'minimumContext',
        status: 'notObserved',
        intervals: [],
        factualDescription: 'この動画内では追加の最小文脈を確認できない。'
      },
      {
        role: 'removableContext',
        status: 'observed',
        intervals: [{
          observationId: 'observation-005',
          startTimeMs: 10000,
          endTimeMs: 11000,
          factualDescription: '主要な出来事と反応の後である。',
          evidenceModalities: ['video', 'audio']
        }],
        factualDescription: '外してよい後続部を確認した。'
      }
    ],
    visualCautions: [
      {
        kind: 'audioDependent',
        startTimeMs: 7100,
        endTimeMs: 9000,
        factualDescription: '反応の理解は音声にも依存する。'
      }
    ],
    insufficientEvidence: {
      present: true,
      missingEvidence: ['minimumContext'],
      factualDescription: '候補より前の前提は確認できない。'
    }
  };
}

function projectedList(
  job: CandidateVideoUnderstandingJobV001,
  inputs: Array<{id: string; startTimeMs: number; endTimeMs: number}>
) {
  return inputs.map((input) => ({
    observationId: input.id,
    ...projectCandidateIntervalToSourceV001(job, input)
  }));
}

function validResult(job: CandidateVideoUnderstandingJobV001): CandidateVideoUnderstandingResultV001 {
  if (job.preflight.status !== 'ready') throw new Error('result fixture requires ready preflight');
  const output = validProviderOutput();
  const jobBytes = serializeCandidateVideoUnderstandingJobV001(job);
  return {
    schemaVersion: CANDIDATE_VIDEO_UNDERSTANDING_RESULT_SCHEMA_V001,
    resultId: 'candidate-video-understanding-result-0001',
    jobBinding: {
      path: 'fixtures/job-v001.json',
      schemaVersion: CANDIDATE_VIDEO_UNDERSTANDING_JOB_SCHEMA_V001,
      fileSha256: sha256(jobBytes)
    },
    execution: {
      attemptId: 'attempt-0001',
      executedAt: '2026-09-03T00:00:00.000Z',
      httpStatus: 200,
      completionStatus: 'completed',
      actualModel: 'gemini-3.8-flash',
      providerExecutionId: null,
      automaticRetryCount: 0,
      repairCallCount: 0,
      exactRequest: clone(job.preflight.exactRequest),
      rawResponse: {
        path: 'fixtures/raw-response-v001.json',
        schemaVersion: 'provider-raw-response-v001',
        fileSha256: '2'.repeat(64)
      }
    },
    structuredValidation: {status: 'passed', violations: []},
    providerOutput: output,
    projectedRoleIntervals: projectedList(job, output.roleObservations.flatMap((role) =>
      role.intervals.map((item) => ({
        id: item.observationId,
        startTimeMs: item.startTimeMs,
        endTimeMs: item.endTimeMs
      })))),
    projectedVisualCautions: projectedList(job, output.visualCautions.map((item, index) => ({
      id: `visual-caution-${String(index + 1).padStart(3, '0')}`,
      startTimeMs: item.startTimeMs,
      endTimeMs: item.endTimeMs
    }))),
    usage: {inputTokens: job.preflight.inputTokenCount, outputTokens: 300, thinkingTokens: 700},
    cost: {
      priceSnapshot: clone(job.preflight.priceSnapshot),
      estimatedTotalUsd: '0.012345',
      classification: 'estimate-from-provider-usage-not-invoice'
    }
  };
}

function expectContractFailure(action: () => unknown, message: string): void {
  assert.throws(action, {name: 'CandidateVideoUnderstandingContractErrorV001'}, message);
}

async function main(): Promise<void> {
  let assertions = 0;

  assertCandidateVideoUnderstandingExperimentJobsV001(JOBS);
  assertions += 1;

  assertCandidateVideoProviderSchemaSupportedSubsetV001(
    CANDIDATE_VIDEO_UNDERSTANDING_RESPONSE_JSON_SCHEMA_V001
  );
  const providerSchemaText = JSON.stringify(CANDIDATE_VIDEO_UNDERSTANDING_RESPONSE_JSON_SCHEMA_V001);
  assert.equal(providerSchemaText.includes('"const"'), false);
  assert.equal(providerSchemaText.includes('"uniqueItems"'), false);
  assert.deepEqual(buildCandidateVideoProviderInputV001(1), JOBS[0].providerInput);
  assert.deepEqual(CANDIDATE_VIDEO_ROLE_VALUES_V001, [
    'coreEvent',
    'reaction',
    'naturalEnding',
    'causeOrTrigger',
    'minimumContext',
    'removableContext'
  ]);
  assertions += 5;

  for (const job of JOBS) {
    assertCandidateVideoUnderstandingJobV001(job);
    assertCandidateVideoProviderInputV001(job.providerInput);
    const bytes = serializeCandidateVideoUnderstandingJobV001(job);
    assert.deepEqual(decodeCandidateVideoUnderstandingJobV001(bytes), job);
    assert.equal(bytes.at(-1), 10);
    await verifyCandidateVideoUnderstandingJobFilesV001(job, WORKSPACE_ROOT);
    assertions += 5;
  }

  for (const job of JOBS) {
    await verifyClosedSourceMappingProvenanceV001(job, WORKSPACE_ROOT);
    assertions += 1;
  }

  const semanticBytes = await readFile(`${WORKSPACE_ROOT}/${SEMANTIC_PATH}`);
  const speechBoundaries = extractCandidateVideoSpeechBoundariesFromSemanticArtifactV001(
    semanticBytes,
    JOBS[0].localBindings.semanticUtterance
  );
  const resolvedComparisonFixtures = await Promise.all(
    COMPARISON_WINDOW_FIXTURES.map(async (fixture) => {
      const job = JOBS.find((item) => item.localCandidateId === fixture.localCandidateId);
      if (!job) throw new Error(`${fixture.localCandidateId} job missing`);
      const candidateBytes = await readFile(`${WORKSPACE_ROOT}/${job.localBindings.candidate.path}`);
      const extractedPoints = extractCandidateVideoCandidatePointsV001(
        candidateBytes,
        job.localBindings.candidate,
        job.localCandidateId,
        speechBoundaries
      );
      assert.deepEqual(
        extractedPoints.map((point) => point.sourceTimeMs),
        fixture.points.map((point) => point.sourceTimeMs),
        `${fixture.id}の候補地点が正式候補responseの先頭意味発話と一致しない`
      );
      return {
        ...fixture,
        points: fixture.points.map((point, index) => ({
          ...point,
          sourceTimeMs: extractedPoints[index].sourceTimeMs
        }))
      };
    })
  );
  const candidateResponseBytesByOpaqueItemId = Object.fromEntries(
    await Promise.all(JOBS.map(async (job) => [
      job.experimentItem.opaqueItemId,
      await readFile(`${WORKSPACE_ROOT}/${job.localBindings.candidate.path}`)
    ]))
  );
  const jobBytesBeforeComparisonExperimentPlanV002 = JOBS.map((job) =>
    serializeCandidateVideoUnderstandingJobV001(job));
  const comparisonExperimentPlanV002 = buildCandidateVideoComparisonExperimentPlanV002(
    JOBS,
    candidateResponseBytesByOpaqueItemId,
    semanticBytes
  );
  assert.deepEqual(
    JOBS.map((job) => serializeCandidateVideoUnderstandingJobV001(job)),
    jobBytesBeforeComparisonExperimentPlanV002
  );
  assertCandidateVideoComparisonExperimentPlanV002(
    comparisonExperimentPlanV002,
    JOBS,
    candidateResponseBytesByOpaqueItemId,
    semanticBytes
  );
  assert.equal(
    comparisonExperimentPlanV002.schemaVersion,
    CANDIDATE_VIDEO_COMPARISON_EXPERIMENT_PLAN_SCHEMA_V002
  );
  assert.equal(comparisonExperimentPlanV002.status, 'calibration-plan-only-not-execution-ready');
  assert.equal(comparisonExperimentPlanV002.providerVisibility, 'local-only-never-provider-input');
  assert.equal(comparisonExperimentPlanV002.cohortPolicy.formalPerformanceEvidence, false);
  assert.equal(comparisonExperimentPlanV002.cohortPolicy.adoptionDecisionPermitted, false);
  assert.deepEqual(
    comparisonExperimentPlanV002.items.map((item) => item.localCandidateId),
    [
      'camera-fear-escalation',
      'medicine-effect-payoff',
      'candidate-doctor-disappearance-to-ogre-mother',
      'candidate-horror-claim-to-speed-up',
      'candidate-horror-game-to-screams-001'
    ]
  );
  assert.deepEqual(comparisonExperimentPlanV002.totals, {
    durationBasis: 'sum-of-selected-source-intervals-before-media-generation',
    calibrationItems: 5,
    truthEligibleItems: 4,
    truthExcludedItems: 1,
    truthEligibleLoci: 8,
    freeHumanBaselineRawDurationMs: 320000,
    freeHumanBaselineSnappedDurationMs: 413837,
    geminiExplorationRawDurationMs: 502580,
    geminiExplorationSnappedDurationMs: 543592
  });
  assert.deepEqual(comparisonExperimentPlanV002.humanFirstReviewPolicy.initialRoles, [
    'coreEvent', 'reaction', 'naturalEnding'
  ]);
  assert.deepEqual(
    comparisonExperimentPlanV002.humanFirstReviewPolicy
      .initiallyHeldBackRoles,
    ['causeOrTrigger', 'minimumContext']
  );
  assert.deepEqual(comparisonExperimentPlanV002.futureValidation.frozenBeforeFirstProviderExecution, [
    'free-human-baseline-window',
    'gemini-exploration-window',
    'prompt',
    'response-schema',
    'model',
    'processing',
    'thinking-level',
    'frames-per-second',
    'media-resolution',
    'response-mime-type',
    'visible-output-token-limit',
    'video-transport',
    'comparison-metrics'
  ]);
  assert.deepEqual(comparisonExperimentPlanV002.providerConfigurationToFreeze, {
    promptSha256: JOBS[0].providerInput.prompt.sha256,
    responseSchemaCanonicalSha256: JOBS[0].providerInput.responseSchema.canonicalSha256,
    model: 'gemini-3.8-flash',
    processing: 'static',
    thinkingLevel: 'medium',
    framesPerSecond: 1,
    mediaResolution: 'high',
    responseMimeType: 'application/json',
    maxVisibleOutputTokens: 4096,
    videoTransport: 'files-api'
  });
  assert.deepEqual(comparisonExperimentPlanV002.calibrationChecks, [
    'role-output-corresponds-to-media',
    'compact-core-reaction-and-natural-ending',
    'required-moments-retained-for-truth-eligible-items',
    'human-review-duration-reduction-against-free-baseline',
    'visual-cautions-observed',
    'insufficient-evidence-used-appropriately',
    'safe-pts-source-projection'
  ]);
  assert.deepEqual(comparisonExperimentPlanV002.items[4].operationalScope, {
    includedInFreeBaselineDuration: true,
    includedInGeminiOperation: true,
    includedInBehaviorObservation: true
  });
  assert.deepEqual(comparisonExperimentPlanV002.comparisonMetricDefinitions, {
    roleObservationCorrespondence: 'compare-with-observed-media',
    requiredMomentContainment: 'truth-eligible-items-only',
    initialHumanReviewDuration:
      'exact-source-interval-union-compared-with-free-human-baseline',
    visualCautions: 'compare-with-observed-media',
    insufficientEvidence: 'compare-with-observed-media-and-missing-material',
    sourceProjection: 'mapped-pts-only-with-unmapped-pts-reported-without-invention',
    boundaryDifferences:
      'record-first-four-start-and-end-differences-only-never-success-criterion'
  });
  assert.equal(
    comparisonExperimentPlanV002.humanFirstReviewPolicy
      .additionalPresentationAfterHumanReportsInsufficientContext,
    'future-candidate-not-implemented'
  );
  assert.equal(
    comparisonExperimentPlanV002.futureValidation.unusedCandidateDefinition,
    'not-used-for-calibration-protocol-design-or-prior-provider-observation'
  );
  assert.equal(
    comparisonExperimentPlanV002.futureValidation.humanTruthAccess,
    'only-after-all-cohort-raw-provider-response-shas-and-canonical-result-shas-are-fixed'
  );
  assertions += 19;

  let truthEligibleCandidatesCoveredByBothWindows = 0;
  let truthEligibleLociCoveredByBothWindows = 0;
  for (const item of comparisonExperimentPlanV002.items) {
    const fixture = resolvedComparisonFixtures.find((candidate) =>
      candidate.localCandidateId === item.localCandidateId);
    if (!fixture) throw new Error(`${item.localCandidateId} v002 fixture missing`);
    assert.deepEqual(
      item.freeHumanBaselineWindows.map((window) => [window.startTimeMs, window.endTimeMs]),
      fixture.expectedFreeBaseline,
      `${fixture.id}の無料±16秒外向きsnapが一致しない`
    );
    assert.deepEqual(
      item.geminiExplorationWindows.map((window) => [window.startTimeMs, window.endTimeMs]),
      fixture.expected,
      `${fixture.id}のGemini較正探索窓が一致しない`
    );
    assert.equal(
      item.durations.freeHumanBaselineMs,
      item.freeHumanBaselineWindows.reduce(
        (sum, window) => sum + window.endTimeMs - window.startTimeMs,
        0
      )
    );
    assert.equal(
      item.durations.geminiExplorationMs,
      item.geminiExplorationWindows.reduce(
        (sum, window) => sum + window.endTimeMs - window.startTimeMs,
        0
      )
    );
    assertions += 4;
    if (fixture.human === null) {
      assert.equal(
        item.truthRequiredMetrics.eligibility,
        'excluded-human-approved-required-intervals-unavailable'
      );
      assert.equal(item.truthRequiredMetrics.requiredMomentCandidateDenominatorContribution, 0);
      assert.equal(item.truthRequiredMetrics.requiredMomentLocusDenominatorContribution, 0);
      assert.equal(
        item.truthRequiredMetrics.boundaryDifferenceRecordEligibility,
        'excluded-no-human-approved-truth'
      );
      assertions += 4;
      continue;
    }
    assert.equal(
      item.truthRequiredMetrics.eligibility,
      'eligible-human-approved-required-intervals-exist'
    );
    assert.equal(
      item.truthRequiredMetrics.boundaryDifferenceRecordEligibility,
      'eligible-record-only-not-success-criterion'
    );
    let candidateCovered = true;
    for (const [index, humanInterval] of fixture.human.entries()) {
      const freeWindow = item.freeHumanBaselineWindows[index];
      const geminiWindow = item.geminiExplorationWindows[index];
      const freeCovered = freeWindow.startTimeMs <= humanInterval.startTimeMs
        && freeWindow.endTimeMs >= humanInterval.endTimeMs;
      const geminiCovered = geminiWindow.startTimeMs <= humanInterval.startTimeMs
        && geminiWindow.endTimeMs >= humanInterval.endTimeMs;
      assert.equal(freeCovered, true, `${fixture.id}の無料窓が既知必須地点を包含しない`);
      assert.equal(geminiCovered, true, `${fixture.id}のGemini窓が既知必須地点を包含しない`);
      candidateCovered = candidateCovered && freeCovered && geminiCovered;
      truthEligibleLociCoveredByBothWindows += Number(freeCovered && geminiCovered);
      assertions += 2;
    }
    truthEligibleCandidatesCoveredByBothWindows += Number(candidateCovered);
    assertions += 2;
  }
  assert.equal(truthEligibleCandidatesCoveredByBothWindows, 4);
  assert.equal(truthEligibleLociCoveredByBothWindows, 8);
  assert.equal(
    comparisonExperimentPlanV002.items.some((item) =>
      JSON.stringify(item.freeHumanBaselineWindows)
        !== JSON.stringify(item.geminiExplorationWindows)),
    true
  );
  assert.equal(
    comparisonExperimentPlanV002.items.flatMap((item) =>
      item.freeHumanBaselineWindows.map((window, index) =>
        window.endTimeMs > item.geminiExplorationWindows[index].endTimeMs))
      .filter(Boolean).length,
    5
  );
  assert.equal(
    comparisonExperimentPlanV002.comparisonObjective.approvedMinimumReductionThreshold,
    'not-defined-do-not-invent'
  );
  assert.deepEqual(
    [
      comparisonExperimentPlanV002.futureArtifactLayoutCandidate.successPathCount,
      comparisonExperimentPlanV002.futureArtifactLayoutCandidate.worstCasePathCount
    ],
    [37, 43]
  );
  assert.deepEqual(
    comparisonExperimentPlanV002.futureArtifactLayoutCandidate
      .independentlyVerifiableTransportFacts,
    [
      'exact-sent-payload-or-binding',
      'exact-returned-payload-or-binding',
      'communication-order',
      'communication-count',
      'http-status',
      'payload-sha256',
      'video-sha256',
      'failure-location'
    ]
  );
  assertions += 7;

  const comparisonExperimentPlanV002Bytes = serializeCandidateVideoComparisonExperimentPlanV002(
    comparisonExperimentPlanV002,
    JOBS,
    candidateResponseBytesByOpaqueItemId,
    semanticBytes
  );
  const decodedComparisonExperimentPlanV002 = decodeCandidateVideoComparisonExperimentPlanV002(
    comparisonExperimentPlanV002Bytes,
    JOBS,
    candidateResponseBytesByOpaqueItemId,
    semanticBytes
  );
  assert.deepEqual(decodedComparisonExperimentPlanV002, comparisonExperimentPlanV002);
  assert.deepEqual(
    serializeCandidateVideoComparisonExperimentPlanV002(
      decodedComparisonExperimentPlanV002,
      JOBS,
      candidateResponseBytesByOpaqueItemId,
      semanticBytes
    ),
    comparisonExperimentPlanV002Bytes
  );
  assert.equal(comparisonExperimentPlanV002Bytes.at(-1), 10);
  const serializedComparisonExperimentPlanV002 = comparisonExperimentPlanV002Bytes.toString('utf8');
  assert.equal(
    /humanReviewPath|humanReviewSha256|humanDisposition|humanReason|humanApprovedRequiredIntervals/u
      .test(serializedComparisonExperimentPlanV002),
    false
  );
  assert.equal(
    comparisonExperimentPlanV002.futureArtifactLayoutCandidate.uploadSessionUrlsStored,
    false
  );
  assert.equal(serializedComparisonExperimentPlanV002.includes('"explorationVideo"'), false);
  assert.equal(serializedComparisonExperimentPlanV002.includes('"sourceMappingProvenance"'), false);
  assertions += 7;

  const rejectComparisonExperimentPlanV002Mutation = (
    label: string,
    mutate: (value: CandidateVideoComparisonExperimentPlanV002) => void
  ): void => {
    const invalid = clone(comparisonExperimentPlanV002);
    mutate(invalid);
    expectContractFailure(
      () => assertCandidateVideoComparisonExperimentPlanV002(
        invalid,
        JOBS,
        candidateResponseBytesByOpaqueItemId,
        semanticBytes
      ),
      label
    );
    assertions += 1;
  };
  rejectComparisonExperimentPlanV002Mutation('v002 planをvalidation集合と偽装', (value) => {
    (value.cohortPolicy as unknown as {classification: string}).classification = 'validation';
  });
  rejectComparisonExperimentPlanV002Mutation('v002 planを正式性能証拠と偽装', (value) => {
    (value.cohortPolicy as unknown as {formalPerformanceEvidence: boolean})
      .formalPerformanceEvidence = true;
  });
  rejectComparisonExperimentPlanV002Mutation('v002 planで導入判断を許可', (value) => {
    (value.cohortPolicy as unknown as {adoptionDecisionPermitted: boolean})
      .adoptionDecisionPermitted = true;
  });
  rejectComparisonExperimentPlanV002Mutation('無料baselineを15秒へ変更', (value) => {
    (value.windowPolicies.freeHumanBaseline as unknown as {beforeCandidatePointMs: number})
      .beforeCandidatePointMs = 15000;
  });
  rejectComparisonExperimentPlanV002Mutation('無料baselineを17秒へ変更', (value) => {
    (value.windowPolicies.freeHumanBaseline as unknown as {afterCandidatePointMs: number})
      .afterCandidatePointMs = 17000;
  });
  rejectComparisonExperimentPlanV002Mutation('無料baselineの自動拡張を許可', (value) => {
    (value.windowPolicies.freeHumanBaseline as unknown as {automaticExpansionPermitted: boolean})
      .automaticExpansionPermitted = true;
  });
  rejectComparisonExperimentPlanV002Mutation('Gemini探索前方を1ms変更', (value) => {
    (value.windowPolicies.geminiExploration as unknown as {beforeCandidatePointMs: number})
      .beforeCandidatePointMs += 1;
  });
  rejectComparisonExperimentPlanV002Mutation('Gemini探索後方を1ms変更', (value) => {
    (value.windowPolicies.geminiExploration as unknown as {afterCandidatePointMs: number})
      .afterCandidatePointMs -= 1;
  });
  rejectComparisonExperimentPlanV002Mutation('Gemini探索窓の自動拡張を許可', (value) => {
    (value.windowPolicies.geminiExploration as unknown as {automaticExpansionPermitted: boolean})
      .automaticExpansionPermitted = true;
  });
  rejectComparisonExperimentPlanV002Mutation('結果後の救済拡張を許可', (value) => {
    (value.windowPolicies.geminiExploration as unknown as {
      resultBasedRescueExpansionPermitted: boolean;
    }).resultBasedRescueExpansionPermitted = true;
  });
  rejectComparisonExperimentPlanV002Mutation('窓外不足をGemini失敗へ変更', (value) => {
    (value.windowPolicies.geminiExploration as unknown as {
      outsideWindowFailureAttribution: string;
    }).outsideWindowFailureAttribution = 'video-understanding-failure';
  });
  rejectComparisonExperimentPlanV002Mutation('初回提示へ原因を自動追加', (value) => {
    (value.humanFirstReviewPolicy.initialRoles as string[]).push('causeOrTrigger');
  });
  rejectComparisonExperimentPlanV002Mutation('初回提示から自然な終端を削除', (value) => {
    value.humanFirstReviewPolicy.initialRoles.pop();
  });
  rejectComparisonExperimentPlanV002Mutation('初回提示へpaddingを追加', (value) => {
    (value.humanFirstReviewPolicy as unknown as {intervalCombination: string})
      .intervalCombination = 'union-with-padding';
  });
  rejectComparisonExperimentPlanV002Mutation('人間確認の自動context拡張を許可', (value) => {
    (value.humanFirstReviewPolicy as unknown as {automaticContextExpansionPermitted: boolean})
      .automaticContextExpansionPermitted = true;
  });
  rejectComparisonExperimentPlanV002Mutation('5本目を人間正解必須指標へ混入', (value) => {
    (value.items[4].truthRequiredMetrics as unknown as {eligibility: string}).eligibility =
      'eligible-human-approved-required-intervals-exist';
  });
  rejectComparisonExperimentPlanV002Mutation('4本目と5本目の正解適格性を入れ替え', (value) => {
    const fourth = value.items[3].truthRequiredMetrics as unknown as {eligibility: string};
    const fifth = value.items[4].truthRequiredMetrics as unknown as {eligibility: string};
    fourth.eligibility = 'excluded-human-approved-required-intervals-unavailable';
    fifth.eligibility = 'eligible-human-approved-required-intervals-exist';
  });
  rejectComparisonExperimentPlanV002Mutation('validation凍結項目を欠落', (value) => {
    value.futureValidation.frozenBeforeFirstProviderExecution.pop();
  });
  rejectComparisonExperimentPlanV002Mutation('人間正解を結果SHA固定前に開封', (value) => {
    (value.futureValidation as unknown as {humanTruthAccess: string}).humanTruthAccess =
      'before-provider-execution';
  });
  rejectComparisonExperimentPlanV002Mutation('未使用候補の定義を緩和', (value) => {
    (value.futureValidation as unknown as {unusedCandidateDefinition: string})
      .unusedCandidateDefinition = 'not-used-in-current-five-only';
  });
  rejectComparisonExperimentPlanV002Mutation('結果後のprotocol変更でもvalidationを維持', (value) => {
    (value.futureValidation as unknown as {
      anyPostResultProtocolChange: string;
    }).anyPostResultProtocolChange = 'keep-validation-classification';
  });
  rejectComparisonExperimentPlanV002Mutation('境界差を合否指標へ変更', (value) => {
    (value.comparisonMetricDefinitions as unknown as {boundaryDifferences: string})
      .boundaryDifferences = 'performance-pass-fail-threshold';
  });
  rejectComparisonExperimentPlanV002Mutation('無料提示合計を1ms変更', (value) => {
    (value.totals as unknown as {freeHumanBaselineSnappedDurationMs: number})
      .freeHumanBaselineSnappedDurationMs += 1;
  });
  rejectComparisonExperimentPlanV002Mutation('候補地点を1ms変更', (value) => {
    value.items[0].candidatePoints[0].sourceTimeMs += 1;
  });
  rejectComparisonExperimentPlanV002Mutation('候補response束縛SHAを変更', (value) => {
    value.items[0].candidateResponse.fileSha256 = '0'.repeat(64);
  });
  rejectComparisonExperimentPlanV002Mutation('元動画束縛SHAを変更', (value) => {
    value.sourceEvidence.sourceVideo.fileSha256 = '0'.repeat(64);
  });
  rejectComparisonExperimentPlanV002Mutation('意味発話束縛pathを変更', (value) => {
    value.sourceEvidence.semanticUtterance.path = 'fixtures/semantic-invented.json';
  });
  rejectComparisonExperimentPlanV002Mutation('無料snap時刻を1ms変更', (value) => {
    value.items[0].freeHumanBaselineWindows[0].startTimeMs += 1;
  });
  rejectComparisonExperimentPlanV002Mutation('発話境界IDだけを変更', (value) => {
    value.items[0].freeHumanBaselineWindows[0].startBoundaryUtteranceId = 'utterance-invented';
  });
  rejectComparisonExperimentPlanV002Mutation('無料窓をGemini窓と同一化', (value) => {
    value.items[0].freeHumanBaselineWindows = clone(value.items[0].geminiExplorationWindows);
  });
  rejectComparisonExperimentPlanV002Mutation('item順序を交換', (value) => {
    [value.items[2], value.items[3]] = [value.items[3], value.items[2]];
  });
  rejectComparisonExperimentPlanV002Mutation('itemを欠落', (value) => {
    value.items.pop();
  });
  rejectComparisonExperimentPlanV002Mutation('providerへ見せられるplanと偽装', (value) => {
    (value as unknown as {providerVisibility: string}).providerVisibility = 'provider-visible';
  });
  rejectComparisonExperimentPlanV002Mutation('人間正解区間fieldを混入', (value) => {
    (value.items[4] as unknown as Record<string, unknown>).humanApprovedRequiredIntervals = [];
  });
  rejectComparisonExperimentPlanV002Mutation('余分なroot fieldを混入', (value) => {
    (value as unknown as Record<string, unknown>).formalResult = null;
  });

  const selfConsistentSeventeenSecondBaseline = clone(
    comparisonExperimentPlanV002
  ) as unknown as {
    windowPolicies: {freeHumanBaseline: {
      beforeCandidatePointMs: number;
      afterCandidatePointMs: number;
    }};
    totals: {
      freeHumanBaselineRawDurationMs: number;
      freeHumanBaselineSnappedDurationMs: number;
    };
    items: Array<{
      localCandidateId: string;
      freeHumanBaselineWindows: CandidateVideoFixedWindowV001[];
      durations: {freeHumanBaselineMs: number};
    }>;
  };
  selfConsistentSeventeenSecondBaseline.windowPolicies.freeHumanBaseline
    .beforeCandidatePointMs = 17000;
  selfConsistentSeventeenSecondBaseline.windowPolicies.freeHumanBaseline
    .afterCandidatePointMs = 17000;
  let selfConsistentSeventeenSecondTotalMs = 0;
  for (const item of selfConsistentSeventeenSecondBaseline.items) {
    const fixture = resolvedComparisonFixtures.find((candidate) =>
      candidate.localCandidateId === item.localCandidateId);
    if (!fixture) throw new Error(`${item.localCandidateId} 17秒fixture missing`);
    item.freeHumanBaselineWindows = buildCandidateVideoComparisonWindowsV001(
      fixture.points,
      speechBoundaries,
      {
        beforeCandidatePointMs: 17000,
        afterCandidatePointMs: 17000,
        startBoundarySelection: 'utterance-start-at-or-before',
        endBoundarySelection: 'utterance-end-at-or-after',
        derivation: 'empirical-maxima-from-human-required-intervals'
      }
    ).freeFixedWindow;
    item.durations.freeHumanBaselineMs = item.freeHumanBaselineWindows.reduce(
      (sum, window) => sum + window.endTimeMs - window.startTimeMs,
      0
    );
    selfConsistentSeventeenSecondTotalMs += item.durations.freeHumanBaselineMs;
  }
  selfConsistentSeventeenSecondBaseline.totals.freeHumanBaselineRawDurationMs = 340000;
  selfConsistentSeventeenSecondBaseline.totals.freeHumanBaselineSnappedDurationMs =
    selfConsistentSeventeenSecondTotalMs;
  expectContractFailure(
    () => assertCandidateVideoComparisonExperimentPlanV002(
      selfConsistentSeventeenSecondBaseline,
      JOBS,
      candidateResponseBytesByOpaqueItemId,
      semanticBytes
    ),
    '設定・窓・合計が自己整合しても未承認の17秒baselineを拒否'
  );
  assertions += 1;

  const v001BytesPresentedAsV002 = canonicalJsonBytesV001({
    schemaVersion: 'candidate-video-comparison-window-plan-v001'
  });
  expectContractFailure(
    () => decodeCandidateVideoComparisonExperimentPlanV002(
      v001BytesPresentedAsV002,
      JOBS,
      candidateResponseBytesByOpaqueItemId,
      semanticBytes
    ),
    'v001 comparison planをv002へfallbackしない'
  );
  expectContractFailure(
    () => decodeCandidateVideoComparisonExperimentPlanV002(
      Buffer.from(JSON.stringify(comparisonExperimentPlanV002), 'utf8'),
      JOBS,
      candidateResponseBytesByOpaqueItemId,
      semanticBytes
    ),
    '非canonical v002 byteを拒否'
  );
  const tamperedCandidateResponseBytes = {...candidateResponseBytesByOpaqueItemId};
  tamperedCandidateResponseBytes['item-0001'] = Buffer.from('tampered-candidate-response', 'utf8');
  expectContractFailure(
    () => buildCandidateVideoComparisonExperimentPlanV002(
      JOBS,
      tamperedCandidateResponseBytes,
      semanticBytes
    ),
    '候補response実体SHA不一致を拒否'
  );
  expectContractFailure(
    () => buildCandidateVideoComparisonExperimentPlanV002(
      JOBS,
      candidateResponseBytesByOpaqueItemId,
      Buffer.from('tampered-semantic-artifact', 'utf8')
    ),
    '意味発話artifact実体SHA不一致を拒否'
  );
  const providerInputWithLocalPlan = clone(JOBS[0].providerInput) as unknown as
    Record<string, unknown>;
  providerInputWithLocalPlan.comparisonExperimentPlan = comparisonExperimentPlanV002;
  expectContractFailure(
    () => assertCandidateVideoProviderInputV001(providerInputWithLocalPlan),
    'local-only v002 planをprovider inputへ混入'
  );
  assertions += 5;

  const calibrationFixtures = resolvedComparisonFixtures.filter((fixture) =>
    fixture.human !== null);
  const empiricalWindowSettings = deriveCandidateVideoFixedWindowSettingsV001(
    calibrationFixtures.flatMap((fixture) => [...fixture.points]),
    calibrationFixtures.flatMap((fixture) => fixture.human === null ? [] : [...fixture.human])
  );
  assert.deepEqual(empiricalWindowSettings, {
    beforeCandidatePointMs: 34880,
    afterCandidatePointMs: 15378,
    startBoundarySelection: 'utterance-start-at-or-before',
    endBoundarySelection: 'utterance-end-at-or-after',
    derivation: 'empirical-maxima-from-human-required-intervals'
  });
  assertions += 2;

  let snappedComparisonDurationMs = 0;
  const comparisonContractFixtures: Array<{
    job: CandidateVideoUnderstandingJobV001;
    plan: CandidateVideoComparisonWindowPlanV001;
    candidateBytes: Buffer;
  }> = [];
  for (const fixture of resolvedComparisonFixtures) {
    const comparison = buildCandidateVideoComparisonWindowsV001(
      fixture.points,
      speechBoundaries,
      empiricalWindowSettings
    );
    assert.deepEqual(
      comparison.freeFixedWindow.map((window) => [window.startTimeMs, window.endTimeMs]),
      fixture.expected,
      `${fixture.id}の外向き発話境界snapが実測fixtureと一致しない`
    );
    assert.deepEqual(comparison.geminiExplorationWindow, comparison.freeFixedWindow);
    assert.equal(comparison.answerPlacement.randomSeed, null);
    if (fixture.human !== null) {
      assertCandidateVideoHumanAnswersOffCenterV001(comparison, fixture.human);
      assertions += 1;
    }
    snappedComparisonDurationMs += comparison.freeFixedWindow.reduce(
      (total, window) => total + window.endTimeMs - window.startTimeMs,
      0
    );
    const baseJob = JOBS.find((item) => item.localCandidateId === fixture.localCandidateId);
    if (!baseJob) throw new Error(`${fixture.localCandidateId} base job missing`);
    const candidateBytes = await readFile(`${WORKSPACE_ROOT}/${baseJob.localBindings.candidate.path}`);
    const comparisonContract = buildComparisonContractFixture(
      baseJob,
      fixture.points,
      comparison,
      empiricalWindowSettings
    );
    assertCandidateVideoComparisonWindowPlanV001(
      comparisonContract.plan,
      comparisonContract.job,
      candidateBytes,
      semanticBytes
    );
    const executionArtifacts = JSON.stringify(comparisonContract);
    assert.equal(/answerReference|humanRequiredIntervals|humanReviewPath|humanReviewSha256/u
      .test(executionArtifacts), false);
    comparisonContractFixtures.push({...comparisonContract, candidateBytes});
    assertions += 5;
  }
  assert.equal(
    empiricalWindowSettings.beforeCandidatePointMs
      + empiricalWindowSettings.afterCandidatePointMs,
    50258
  );
  assert.equal(snappedComparisonDurationMs, 543592);
  assert.equal(comparisonContractFixtures.length, 5);
  assertions += 3;

  const firstComparisonContract = comparisonContractFixtures[0];
  const firstPlanWrongSha = clone(firstComparisonContract.plan);
  firstPlanWrongSha.fixedWindowSettings.beforeCandidatePointMs += 1;
  expectContractFailure(
    () => assertCandidateVideoComparisonWindowPlanV001(
      firstPlanWrongSha,
      firstComparisonContract.job,
      firstComparisonContract.candidateBytes,
      semanticBytes
    ),
    'window plan byteをjob SHAから変更'
  );
  const firstPlanWrongPoint = clone(firstComparisonContract.plan);
  firstPlanWrongPoint.candidatePoints[0].sourceTimeMs += 1;
  const firstJobBoundToWrongPoint = clone(firstComparisonContract.job);
  if (firstJobBoundToWrongPoint.comparisonInput.status !== 'resolved') {
    throw new Error('comparison fixture must be resolved');
  }
  firstJobBoundToWrongPoint.comparisonInput.sharedFreeAndGeminiWindowPlan.fileSha256 =
    sha256(canonicalJsonBytesV001(firstPlanWrongPoint));
  expectContractFailure(
    () => assertCandidateVideoComparisonWindowPlanV001(
      firstPlanWrongPoint,
      firstJobBoundToWrongPoint,
      firstComparisonContract.candidateBytes,
      semanticBytes
    ),
    'window plan候補地点を正式候補responseから変更'
  );
  const firstPlanWrongWindow = clone(firstComparisonContract.plan);
  firstPlanWrongWindow.freeFixedWindows[0].startTimeMs += 1;
  const firstJobBoundToWrongWindow = clone(firstComparisonContract.job);
  if (firstJobBoundToWrongWindow.comparisonInput.status !== 'resolved') {
    throw new Error('comparison fixture must be resolved');
  }
  firstJobBoundToWrongWindow.comparisonInput.sharedFreeAndGeminiWindowPlan.fileSha256 =
    sha256(canonicalJsonBytesV001(firstPlanWrongWindow));
  expectContractFailure(
    () => assertCandidateVideoComparisonWindowPlanV001(
      firstPlanWrongWindow,
      firstJobBoundToWrongWindow,
      firstComparisonContract.candidateBytes,
      semanticBytes
    ),
    '無料固定窓だけをGemini窓から変更'
  );
  const firstJobWrongMappingSelection = clone(firstComparisonContract.job);
  if (firstJobWrongMappingSelection.sourceMapping.status !== 'closed') {
    throw new Error('comparison fixture mapping must be closed');
  }
  firstJobWrongMappingSelection.sourceMapping.segments[0].sourceSelectionStartMs += 1;
  expectContractFailure(
    () => assertCandidateVideoComparisonWindowPlanV001(
      firstComparisonContract.plan,
      firstJobWrongMappingSelection,
      firstComparisonContract.candidateBytes,
      semanticBytes
    ),
    '正式mappingの選択区間を共通窓から変更'
  );
  const firstPlanWithHumanReference = clone(firstComparisonContract.plan) as unknown as
    Record<string, unknown>;
  firstPlanWithHumanReference.answerReference = {
    status: 'human-required-intervals-available-and-off-center',
    humanRequiredIntervals: [{startTimeMs: 1, endTimeMs: 2}]
  };
  const firstJobBoundToHumanReference = clone(firstComparisonContract.job);
  if (firstJobBoundToHumanReference.comparisonInput.status !== 'resolved') {
    throw new Error('comparison fixture must be resolved');
  }
  firstJobBoundToHumanReference.comparisonInput.sharedFreeAndGeminiWindowPlan.fileSha256 =
    sha256(canonicalJsonBytesV001(firstPlanWithHumanReference));
  expectContractFailure(
    () => assertCandidateVideoComparisonWindowPlanV001(
      firstPlanWithHumanReference,
      firstJobBoundToHumanReference,
      firstComparisonContract.candidateBytes,
      semanticBytes
    ),
    '実行window planへ人間正解を混入'
  );
  const firstPlanWithHumanBinding = clone(firstComparisonContract.plan);
  firstPlanWithHumanBinding.bindings.candidateResponse = {
    path: 'fixtures/human-review-result-v002.json',
    schemaVersion: 'human-review-result-v002',
    fileSha256: 'f'.repeat(64)
  };
  const firstJobBoundToHumanBinding = clone(firstComparisonContract.job);
  if (firstJobBoundToHumanBinding.comparisonInput.status !== 'resolved') {
    throw new Error('comparison fixture must be resolved');
  }
  firstJobBoundToHumanBinding.comparisonInput.sharedFreeAndGeminiWindowPlan.fileSha256 =
    sha256(canonicalJsonBytesV001(firstPlanWithHumanBinding));
  expectContractFailure(
    () => assertCandidateVideoComparisonWindowPlanV001(
      firstPlanWithHumanBinding,
      firstJobBoundToHumanBinding,
      firstComparisonContract.candidateBytes,
      semanticBytes
    ),
    '実行window plan bindingへ人間評価artifactを混入'
  );
  const fifthComparisonContract = comparisonContractFixtures[4];
  const fifthPlanWithInventedTruth = clone(fifthComparisonContract.plan) as unknown as
    Record<string, unknown>;
  fifthPlanWithInventedTruth.humanRequiredIntervals = [];
  const fifthJobBoundToInventedTruth = clone(fifthComparisonContract.job);
  if (fifthJobBoundToInventedTruth.comparisonInput.status !== 'resolved') {
    throw new Error('fifth comparison fixture must be resolved');
  }
  fifthJobBoundToInventedTruth.comparisonInput.sharedFreeAndGeminiWindowPlan.fileSha256 =
    sha256(canonicalJsonBytesV001(fifthPlanWithInventedTruth));
  expectContractFailure(
    () => assertCandidateVideoComparisonWindowPlanV001(
      fifthPlanWithInventedTruth,
      fifthJobBoundToInventedTruth,
      fifthComparisonContract.candidateBytes,
      semanticBytes
    ),
    '5本目の存在しない正解区間を実行planへ捏造'
  );
  assertions += 7;

  for (const job of JOBS) {
    expectContractFailure(
      () => assertCandidateVideoUnderstandingPreflightMarkedReadyV001(job),
      'preflight未完了jobは実行不能'
    );
    assertions += 1;
  }

  assertions += runCandidateVideoPtsRegressionV001();

  const gapAssignedToFirst = clone(JOBS[4]);
  if (gapAssignedToFirst.sourceMapping.status !== 'closed') throw new Error('fixture must be closed');
  gapAssignedToFirst.sourceMapping.segments[0].candidateEndPtsExclusive = 91648;
  gapAssignedToFirst.sourceMapping.unmappedCandidatePts = [];
  await assert.rejects(
    verifyClosedSourceMappingProvenanceV001(gapAssignedToFirst, WORKSPACE_ROOT),
    {name: 'CandidateVideoUnderstandingContractErrorV001'}
  );
  assertions += 1;

  const output = validProviderOutput();
  assertCandidateVideoUnderstandingProviderOutputV001(output, JOBS[0]);
  const firstReview = deriveCandidateVideoFirstHumanReviewV001(output, JOBS[0]);
  assert.equal(firstReview.status, 'ready');
  if (firstReview.status !== 'ready') throw new Error('first review fixture must be ready');
  assert.deepEqual(firstReview.candidateIntervals.map((interval) => [
    interval.startTimeMs,
    interval.endTimeMs
  ]), [[6900, 10000]]);
  assert.equal(firstReview.totalDurationMs, 3100);
  assert.deepEqual(firstReview.heldBackContextRoles, ['causeOrTrigger', 'minimumContext']);
  assertions += 4;

  const everyRoleAbsent = clone(output);
  everyRoleAbsent.roleObservations.forEach((role) => {
    role.status = 'notObserved';
    role.intervals = [];
    role.factualDescription = `${role.role}は候補動画内で確認できない。`;
  });
  everyRoleAbsent.insufficientEvidence = {
    present: true,
    missingEvidence: [...CANDIDATE_VIDEO_ROLE_VALUES_V001],
    factualDescription: '6役割すべての観測材料が不足している。'
  };
  assertCandidateVideoUnderstandingProviderOutputV001(everyRoleAbsent, JOBS[0]);
  const absentFirstReview = deriveCandidateVideoFirstHumanReviewV001(everyRoleAbsent, JOBS[0]);
  assert.deepEqual(absentFirstReview, {
    status: 'required-role-not-observed',
    missingRoles: ['coreEvent', 'reaction', 'naturalEnding'],
    candidateIntervals: [],
    totalDurationMs: 0
  });
  assertions += 2;

  const resultReadyJob = readyResultContractJobFixture();
  const result = validResult(resultReadyJob);
  assertCandidateVideoUnderstandingResultV001(result, resultReadyJob);
  const resultBytes = serializeCandidateVideoUnderstandingResultV001(result, resultReadyJob);
  assert.deepEqual(
    decodeCandidateVideoUnderstandingResultV001(resultBytes, resultReadyJob),
    result
  );
  assertions += 3;

  const failedResult = clone(result) as unknown as Record<string, unknown>;
  (failedResult.execution as Record<string, unknown>).httpStatus = 503;
  (failedResult.execution as Record<string, unknown>).completionStatus = 'failed';
  (failedResult.structuredValidation as Record<string, unknown>).status = 'failed';
  (failedResult.structuredValidation as Record<string, unknown>).violations = ['provider request failed'];
  failedResult.providerOutput = null;
  failedResult.projectedRoleIntervals = [];
  failedResult.projectedVisualCautions = [];
  assertCandidateVideoUnderstandingResultV001(failedResult);
  const completedButInvalid = clone(failedResult) as Record<string, unknown>;
  (completedButInvalid.execution as Record<string, unknown>).httpStatus = 200;
  (completedButInvalid.execution as Record<string, unknown>).completionStatus = 'completed';
  (completedButInvalid.structuredValidation as Record<string, unknown>).violations = [
    'structured output schema violation'
  ];
  assertCandidateVideoUnderstandingResultV001(completedButInvalid);
  assertions += 2;

  const forbiddenProviderInputs: Array<[string, (value: Record<string, unknown>) => void]> = [
    ['human review path', (value) => { value.humanReviewPath = 'reviews/human-review.json'; }],
    ['human review SHA', (value) => { value.humanReviewSha256 = 'a'.repeat(64); }],
    ['verdict', (value) => { value.verdict = 'approved'; }],
    ['human reason', (value) => { value.humanReason = '人間が良いと判断した'; }],
    ['correct interval', (value) => { value.correctInterval = {startTimeMs: 1, endTimeMs: 2}; }],
    ['descriptive candidate ID', (value) => { value.itemId = 'camera-fear-escalation'; }],
    ['descriptive filename', (value) => {
      (value.file as Record<string, unknown>).displayName = 'camera-fear-escalation.mp4';
    }]
  ];
  for (const [label, mutate] of forbiddenProviderInputs) {
    const contaminated = clone(JOBS[0].providerInput) as unknown as Record<string, unknown>;
    mutate(contaminated);
    expectContractFailure(() => assertCandidateVideoProviderInputV001(contaminated), label);
    assertions += 1;
  }
  const contaminatedPrompt = clone(JOBS[0].providerInput) as unknown as Record<string, unknown>;
  (contaminatedPrompt.prompt as Record<string, unknown>).utf8 = '人間はこの候補を不採用にした。';
  expectContractFailure(() => assertCandidateVideoProviderInputV001(contaminatedPrompt), '人間理由をpromptへ混入');
  assertions += 1;

  const uploadedFileUri = 'https://generativelanguage.googleapis.com/v1beta/files/opaque0001';
  const sdkParameters = buildCandidateVideoStaticGenerateContentSdkParametersV001(
    JOBS[0],
    uploadedFileUri
  );
  const exactRequest = buildCandidateVideoStaticGenerateContentWireRequestV001(
    JOBS[0],
    uploadedFileUri
  );
  assertCandidateVideoStaticGenerateContentWireRequestV001(exactRequest, JOBS[0]);
  const staticContents = sdkParameters.contents as Array<Record<string, unknown>>;
  const staticParts = staticContents[0].parts as Array<Record<string, unknown>>;
  const staticConfig = sdkParameters.config as unknown as Record<string, unknown>;
  assert.deepEqual(staticParts[0].videoMetadata, {fps: 1});
  assert.deepEqual(staticParts[0].mediaResolution, {level: 'MEDIA_RESOLUTION_HIGH'});
  assert.deepEqual(staticConfig.thinkingConfig, {thinkingLevel: 'MEDIUM'});
  assert.equal('httpOptions' in staticConfig, false);
  assert.equal('tools' in staticConfig, false);
  assert.deepEqual(exactRequest.body.contents, sdkParameters.contents);
  assert.deepEqual(exactRequest.body.generationConfig, staticConfig);
  const uploadPlan = buildCandidateVideoLocalUploadPlanV001(JOBS[0]);
  assert.equal(uploadPlan.providerMetadata.displayName, 'item-0001.mp4');
  assert.equal(uploadPlan.providerMetadata.uploadFileNameHeader, 'item-0001.mp4');
  assert.notEqual(
    uploadPlan.localByteSourcePath.split('/').at(-1),
    uploadPlan.providerMetadata.uploadFileNameHeader
  );
  const humanReference = {
    jobCanonicalSha256: sha256(serializeCandidateVideoUnderstandingJobV001(JOBS[0])),
    localCandidateId: JOBS[0].localCandidateId,
    humanReviewPath:
      'evals/clip_composition/outputs/work-distant-connection-human-review-result-ymUsGrT6EaA-v002/human-review-result-v002.json',
    humanReviewSha256: 'fac03dc688f28e64831a7b8241cec560313cf7da3aacc585b30bf8efab270a92',
    humanDisposition: 'human-accepted',
    humanReason: '恐怖映像と反応を含めて成立すると人間が判断した。',
    correctIntervals: [
      {startTimeMs: 664354, endTimeMs: 671316},
      {startTimeMs: 1377918, endTimeMs: 1426649}
    ],
    candidatePointsMs: [664354, 1412798],
    descriptiveCandidateIds: ['camera-fear-escalation'],
    descriptiveFilenames: ['presentation-rendered-v002.mp4']
  };
  assertCandidateVideoProviderBlindnessV001(
    JOBS[0],
    exactRequest,
    uploadPlan,
    humanReference
  );
  assertions += 10;

  const fifthHumanReference = {
    jobCanonicalSha256: sha256(serializeCandidateVideoUnderstandingJobV001(JOBS[4])),
    localCandidateId: JOBS[4].localCandidateId,
    humanReviewPath:
      'evals/clip_composition/outputs/work-distant-connection-candidate-review-v001/candidate-horror-game-to-screams-001/candidate-human-review-result-v001.json',
    humanReviewSha256: '24ec180fcba4d88cc17afd20a2fcb189da104c99e80e1388595e2a5ae0d4780e',
    humanDisposition: 'human-rejected-candidate-discovery-failure',
    humanReason: '候補自体が必要区間として承認されていない。',
    correctIntervals: [],
    candidatePointsMs: [249378, 6134433],
    descriptiveCandidateIds: ['candidate-horror-game-to-screams-001'],
    descriptiveFilenames: ['candidate-review-v001.mp4']
  };
  assertCandidateVideoProviderBlindnessV001(
    JOBS[4],
    buildCandidateVideoStaticGenerateContentWireRequestV001(JOBS[4], uploadedFileUri),
    buildCandidateVideoLocalUploadPlanV001(JOBS[4]),
    fifthHumanReference
  );
  const descriptiveUriRequest = buildCandidateVideoStaticGenerateContentWireRequestV001(
    JOBS[0],
    'https://generativelanguage.googleapis.com/v1beta/files/camera-fear-escalation'
  );
  expectContractFailure(
    () => assertCandidateVideoProviderBlindnessV001(
      JOBS[0],
      descriptiveUriRequest,
      uploadPlan,
      humanReference
    ),
    'Files API URIの説明的resource nameをprovider入力へ混入'
  );
  assertions += 2;

  const requestWithCandidatePoint = clone(exactRequest) as unknown as Record<string, unknown>;
  const requestBody = requestWithCandidatePoint.body as Record<string, unknown>;
  const requestContents = requestBody.contents as Array<Record<string, unknown>>;
  (requestContents[0].parts as Array<Record<string, unknown>>).push({text: 'candidate point 664354'});
  expectContractFailure(
    () => assertCandidateVideoProviderBlindnessV001(
      JOBS[0],
      requestWithCandidatePoint as never,
      uploadPlan,
      humanReference
    ),
    '候補地点をprovider requestへ混入'
  );
  assertions += 1;

  const {providerInput: _providerInput, providerInputCanonicalSha256: _providerSha, ...jobWithoutProvider} = JOBS[0];
  const nestedSensitiveValues = [
    humanReference.humanReviewPath,
    humanReference.humanReviewSha256,
    humanReference.humanDisposition,
    humanReference.humanReason,
    String(humanReference.correctIntervals[0].startTimeMs),
    String(humanReference.correctIntervals[0].endTimeMs),
    String(humanReference.candidatePointsMs[0]),
    humanReference.descriptiveCandidateIds[0],
    humanReference.descriptiveFilenames[0]
  ];
  for (const [index, factualObservation] of nestedSensitiveValues.entries()) {
    const contextJob = buildCandidateVideoUnderstandingJobV001({
      ...jobWithoutProvider,
      referenceContext: {
        status: 'present',
        source: 'validated-candidate-video-understanding-result',
        sourceResult: {
          path: 'fixtures/prior-result-v001.json',
          schemaVersion: CANDIDATE_VIDEO_UNDERSTANDING_RESULT_SCHEMA_V001,
          fileSha256: '4'.repeat(64)
        },
        role: 'coreEvent',
        opaqueReferenceId: 'reference-0001',
        factualObservation,
        factualObservationSha256: createHash('sha256')
          .update(factualObservation)
          .digest('hex')
      }
    });
    const contextRequest = buildCandidateVideoStaticGenerateContentWireRequestV001(
      contextJob,
      uploadedFileUri
    );
    expectContractFailure(
      () => assertCandidateVideoProviderBlindnessV001(
        contextJob,
        contextRequest,
        buildCandidateVideoLocalUploadPlanV001(contextJob),
        {
          ...humanReference,
          jobCanonicalSha256: sha256(serializeCandidateVideoUnderstandingJobV001(contextJob)),
          localCandidateId: contextJob.localCandidateId
        }
      ),
      `referenceContext経由の人間情報混入 ${index}`
    );
    assertions += 1;
  }

  expectContractFailure(
    () => buildCandidateVideoUnderstandingJobV001({
      ...jobWithoutProvider,
      referenceContext: {
        status: 'present',
        source: 'validated-candidate-video-understanding-result',
        sourceResult: {
          path: humanReference.humanReviewPath,
          schemaVersion: CANDIDATE_VIDEO_UNDERSTANDING_RESULT_SCHEMA_V001,
          fileSha256: humanReference.humanReviewSha256
        },
        role: 'coreEvent',
        opaqueReferenceId: 'reference-0001',
        factualObservation: '映像上で出来事を確認した。',
        factualObservationSha256: createHash('sha256')
          .update('映像上で出来事を確認した。')
          .digest('hex')
      }
    }),
    '実行jobのreferenceContextへ人間評価artifactを偽装して混入'
  );
  const {
    providerInput: _comparisonProviderInput,
    providerInputCanonicalSha256: _comparisonProviderSha,
    ...comparisonJobWithoutProvider
  } = firstComparisonContract.job;
  expectContractFailure(
    () => buildCandidateVideoUnderstandingJobV001({
      ...comparisonJobWithoutProvider,
      referenceContext: {
        status: 'present',
        source: 'validated-candidate-video-understanding-result',
        sourceResult: {
          path: 'fixtures/neutral-prior-result-v001.json',
          schemaVersion: CANDIDATE_VIDEO_UNDERSTANDING_RESULT_SCHEMA_V001,
          fileSha256: '4'.repeat(64)
        },
        role: 'coreEvent',
        opaqueReferenceId: 'reference-0001',
        factualObservation: '将来用の観測文。',
        factualObservationSha256: sha256(Buffer.from('将来用の観測文。', 'utf8'))
      }
    }),
    '初回区間化比較へ将来用referenceContextを実接続'
  );
  assertions += 2;

  const communicationProposal: CandidateVideoCommunicationPlanV001 = {
    status: 'proposal-pending-kawafmm-approval',
    distinctVideoCount: 5,
    maximumLogicalFilesApiUploadCalls: 5,
    maximumFilesApiUploadHttpRequests: 10,
    maximumFilesApiMetadataGetCalls: 5,
    maximumCountTokensCalls: 5,
    maximumInferenceCalls: 5,
    maximumMetadataGetsPerFile: 1,
    automaticRetryCount: 0,
    metadataPolicy: 'one-get-after-upload-then-fail-closed-if-not-active',
    reproducibilityMeasurement: {
      status: 'not-adopted-for-initial-comparison',
      reason: 'single-repeat-does-not-measure-experiment-wide-nondeterminism'
    },
    filesUploadTransport: 'direct-rest-resumable-one-shot-proposal',
    filesUploadHttpAttemptControl: 'unresolved-before-api-execution',
    inferenceTransport: 'direct-rest-one-shot-proposal',
    inferenceHttpAttemptControl: 'unresolved-before-api-execution'
  };
  assertCandidateVideoCommunicationPlanV001(communicationProposal);
  expectContractFailure(
    () => assertCandidateVideoCommunicationPlanApprovedV001(communicationProposal),
    '未承認・upload retry未解決の通信計画は実行不能'
  );
  const approvedMockPlan: CandidateVideoCommunicationPlanV001 = {
    ...communicationProposal,
    status: 'approved',
    filesUploadHttpAttemptControl: 'two-http-requests-per-file-no-retry',
    inferenceHttpAttemptControl: 'one-http-request-per-inference-no-retry'
  };
  assertCandidateVideoCommunicationPlanApprovedV001(approvedMockPlan);
  const invalidRepeatPlan = clone(communicationProposal) as unknown as Record<string, unknown>;
  invalidRepeatPlan.maximumInferenceCalls = 6;
  expectContractFailure(
    () => assertCandidateVideoCommunicationPlanV001(invalidRepeatPlan),
    '初回比較へ6回目の再現性推論を混入'
  );
  const communicationGuard = createCandidateVideoCommunicationGuardV001(approvedMockPlan);
  for (const job of JOBS) {
    communicationGuard.record('files-upload-logical', job.experimentItem.opaqueItemId);
    communicationGuard.record('files-upload-http', job.experimentItem.opaqueItemId);
    communicationGuard.record('files-upload-http', job.experimentItem.opaqueItemId);
    communicationGuard.record('files-metadata-get', job.experimentItem.opaqueItemId);
    communicationGuard.record('count-tokens', job.experimentItem.opaqueItemId);
  }
  expectContractFailure(
    () => communicationGuard.record('files-upload-http', JOBS[0].experimentItem.opaqueItemId),
    '1 file 2 HTTP uploadを超える送信を事前拒否'
  );
  assertions += 4;

  let mockRequestCaptures = 0;
  const mockFixture = await materializeReadyComparisonMockFixture(
    firstComparisonContract,
    semanticBytes
  );
  try {
    const mockHumanReference = {
      ...humanReference,
      jobCanonicalSha256: sha256(serializeCandidateVideoUnderstandingJobV001(mockFixture.job))
    };
    const mockCapture = await exerciseCandidateVideoUnderstandingWithMockTransportV001(
      mockFixture.job,
      mockFixture.workspaceRoot,
      uploadedFileUri,
      mockHumanReference,
      {kind: 'in-memory-capture-only'}
    );
    assert.equal(mockCapture.kind, 'captured-without-network-or-callback');
    assert.deepEqual(mockCapture.request, mockFixture.exactRequest);
    assert.deepEqual(
      mockCapture.requestArtifactBytes,
      serializeCandidateVideoStaticGenerateContentWireRequestV001(
        mockFixture.exactRequest,
        mockFixture.job
      )
    );
    assert.deepEqual(
      JSON.parse(Buffer.from(mockCapture.bodyBytes).toString('utf8')),
      mockFixture.exactRequest.body
    );
    mockRequestCaptures += 1;

    const pendingComparisonJob = clone(mockFixture.job);
    pendingComparisonJob.preflight = clone(firstComparisonContract.job.preflight);
    await assert.rejects(
      exerciseCandidateVideoUnderstandingWithMockTransportV001(
        pendingComparisonJob,
        mockFixture.workspaceRoot,
        uploadedFileUri,
        {
          ...humanReference,
          jobCanonicalSha256: sha256(
            serializeCandidateVideoUnderstandingJobV001(pendingComparisonJob)
          )
        },
        {kind: 'in-memory-capture-only'}
      ),
      {name: 'CandidateVideoUnderstandingContractErrorV001'}
    );

    await assert.rejects(
      exerciseCandidateVideoUnderstandingWithMockTransportV001(
        mockFixture.job,
        mockFixture.workspaceRoot,
        uploadedFileUri,
        mockHumanReference,
        {
          kind: 'in-memory-capture-only',
          captureExactHttpRequest: () => fetch('https://example.invalid')
        } as never
      ),
      {name: 'CandidateVideoUnderstandingContractErrorV001'}
    );

    const proposalPlan = clone(mockFixture.plan);
    proposalPlan.fixedWindowSettingsApproval.status = 'proposal-pending-kawafmm-approval';
    const proposalPlanBytes = canonicalJsonBytesV001(proposalPlan);
    await writeTemporaryFixtureFile(
      mockFixture.workspaceRoot,
      mockFixture.job.comparisonInput.status === 'resolved'
        ? mockFixture.job.comparisonInput.sharedFreeAndGeminiWindowPlan.path
        : 'unreachable',
      proposalPlanBytes
    );
    const proposalJob = clone(mockFixture.job);
    if (proposalJob.comparisonInput.status !== 'resolved') {
      throw new Error('proposal mock fixture must be resolved');
    }
    proposalJob.comparisonInput.sharedFreeAndGeminiWindowPlan.fileSha256 = sha256(proposalPlanBytes);
    await assert.rejects(
      exerciseCandidateVideoUnderstandingWithMockTransportV001(
        proposalJob,
        mockFixture.workspaceRoot,
        uploadedFileUri,
        {
          ...humanReference,
          jobCanonicalSha256: sha256(serializeCandidateVideoUnderstandingJobV001(proposalJob))
        },
        {kind: 'in-memory-capture-only'}
      ),
      {name: 'CandidateVideoUnderstandingContractErrorV001'}
    );

    const mismatchedMappingArtifact = clone(mockFixture.mappingArtifact);
    const mismatchedMapping = mismatchedMappingArtifact.mapping as Record<string, unknown>;
    const mismatchedSegments = mismatchedMapping.segments as Array<Record<string, unknown>>;
    mismatchedSegments[0].sourceStartPts = (mismatchedSegments[0].sourceStartPts as number) + 1;
    const mismatchedMappingBytes = canonicalJsonBytesV001(mismatchedMappingArtifact);
    const mappingPath = mockFixture.job.sourceMapping.provenance.path;
    await writeTemporaryFixtureFile(
      mockFixture.workspaceRoot,
      mappingPath,
      mismatchedMappingBytes
    );
    const mismatchedMappingJob = clone(mockFixture.job);
    if (mismatchedMappingJob.comparisonInput.status !== 'resolved') {
      throw new Error('mapping mismatch fixture must be resolved');
    }
    mismatchedMappingJob.sourceMapping.provenance.fileSha256 = sha256(mismatchedMappingBytes);
    const mismatchedMappingPlan = clone(mockFixture.plan);
    mismatchedMappingPlan.bindings.sourceMappingProvenance.fileSha256 =
      sha256(mismatchedMappingBytes);
    const mismatchedMappingPlanBytes = canonicalJsonBytesV001(mismatchedMappingPlan);
    await writeTemporaryFixtureFile(
      mockFixture.workspaceRoot,
      mismatchedMappingJob.comparisonInput.sharedFreeAndGeminiWindowPlan.path,
      mismatchedMappingPlanBytes
    );
    mismatchedMappingJob.comparisonInput.sharedFreeAndGeminiWindowPlan.fileSha256 =
      sha256(mismatchedMappingPlanBytes);
    await assert.rejects(
      verifyCandidateVideoUnderstandingJobFilesV001(
        mismatchedMappingJob,
        mockFixture.workspaceRoot
      ),
      {name: 'CandidateVideoUnderstandingContractErrorV001'}
    );
    assertions += 8;
  } finally {
    await mockFixture.cleanup();
  }
  assert.equal(mockRequestCaptures, 1);
  for (const job of JOBS) {
    communicationGuard.record('inference', job.experimentItem.opaqueItemId);
  }
  assert.deepEqual(communicationGuard.snapshot(), {
    'files-upload-logical': 5,
    'files-upload-http': 10,
    'files-metadata-get': 5,
    'count-tokens': 5,
    inference: 5
  });
  expectContractFailure(
    () => communicationGuard.record('inference', JOBS[1].experimentItem.opaqueItemId),
    '6回目推論を送信前に拒否'
  );
  assertions += 5;

  const readyResultContractJob = readyResultContractJobFixture();
  assertCandidateVideoUnderstandingPreflightMarkedReadyV001(readyResultContractJob);
  assertions += 1;

  const cameraHumanIntervals = COMPARISON_WINDOW_FIXTURES[0].human;
  if (cameraHumanIntervals === null) throw new Error('camera human intervals missing');
  const comparisonMeasurementFixture = await materializeReadyComparisonMockFixture(
    firstComparisonContract,
    semanticBytes
  );
  try {
    const humanComparison = await materializeAvailableHumanComparisonReferenceFixture(
      comparisonMeasurementFixture,
      cameraHumanIntervals,
      'selection-v002-accepted'
    );
    const comparisonContractJob = comparisonMeasurementFixture.job;
    if (comparisonContractJob.comparisonInput.status !== 'resolved') {
      throw new Error('comparison contract fixture must be resolved');
    }
    const comparisonWindowPlanBinding =
      comparisonContractJob.comparisonInput.sharedFreeAndGeminiWindowPlan;
    const comparisonJobBinding = {
      path: 'fixtures/comparison-job-v001.json',
      schemaVersion: CANDIDATE_VIDEO_UNDERSTANDING_JOB_SCHEMA_V001,
      fileSha256: sha256(serializeCandidateVideoUnderstandingJobV001(comparisonContractJob))
    };
    const comparisonMeasurement = {
      evaluationScope: 'intervalization-replacement-comparison',
      jobBinding: comparisonJobBinding,
      resultBinding: {
        path: 'fixtures/comparison-result-v001.json',
        schemaVersion: CANDIDATE_VIDEO_UNDERSTANDING_RESULT_SCHEMA_V001,
        fileSha256: '6'.repeat(64)
      },
      baselineBinding: comparisonWindowPlanBinding,
      humanComparisonReferenceBinding: humanComparison.binding,
      requiredMomentsContained: true,
      coreStartErrorMs: -120,
      reactionEndErrorMs: 80,
      geminiFirstReviewDurationMs: 3100,
      humanRequiredIntervalDurationMs: 55693,
      freeFixedWindowDurationMs: 105513,
      minimumContextNeeded: false,
      matchingVisualCautions: ['audioDependent'],
      nonMatchingVisualCautions: [],
      insufficientEvidenceReported: false,
      sourceProjectionSucceeded: true,
      unmappedCandidatePtsIntervalCount: 0,
      estimatedApiCostUsd: '0.012345',
      apiLatencyMs: 4321,
      pureHumanWatchTimeMs: 3100,
      geminiBeatsFreeBaseline: true,
      outcome: {
        providerExecutionStatus: 'succeeded',
        failureAttribution: null,
        humanDisposition: 'accepted',
        factualDescription: '技術成立後の人間採用であり、処理成功と人間採否を分離する。'
      }
    } as const;
    const preExecutionComparisonMeasurement = {
      ...comparisonMeasurement,
      resultBinding: null,
      requiredMomentsContained: null,
      coreStartErrorMs: null,
      reactionEndErrorMs: null,
      geminiFirstReviewDurationMs: null,
      minimumContextNeeded: null,
      matchingVisualCautions: null,
      nonMatchingVisualCautions: null,
      insufficientEvidenceReported: null,
      sourceProjectionSucceeded: null,
      unmappedCandidatePtsIntervalCount: null,
      estimatedApiCostUsd: null,
      apiLatencyMs: null,
      pureHumanWatchTimeMs: 105513,
      geminiBeatsFreeBaseline: null,
      outcome: {
        providerExecutionStatus: 'not-run',
        failureAttribution: null,
        humanDisposition: 'accepted',
        factualDescription: 'API前には無料窓と既存人間事実だけを保持する。'
      }
    } as const;
    assertCandidateVideoComparisonMeasurementV001(
      preExecutionComparisonMeasurement,
      comparisonContractJob,
      humanComparison.verification
    );
    expectContractFailure(
      () => assertCandidateVideoComparisonMeasurementV001(
        comparisonMeasurement,
        comparisonContractJob,
        humanComparison.verification
      ),
      '暫定cross-bindingだけの人間参照でAPI後の正式比較を確定'
    );
    expectContractFailure(
      () => assertCandidateVideoComparisonMeasurementV001({
        ...comparisonMeasurement,
        resultBinding: null,
        estimatedApiCostUsd: null,
        apiLatencyMs: null,
        outcome: {
          ...comparisonMeasurement.outcome,
          providerExecutionStatus: 'not-run'
        }
      }, comparisonContractJob, humanComparison.verification),
      'API未実行のままGemini結果由来値と無料baseline勝越を確定'
    );
    expectContractFailure(
      () => assertCandidateVideoComparisonMeasurementV001({
        ...preExecutionComparisonMeasurement,
        freeFixedWindowDurationMs: comparisonMeasurement.freeFixedWindowDurationMs - 1
      }, comparisonContractJob, humanComparison.verification),
      '無料固定窓尺を正式source選択区間合計から変更'
    );
    expectContractFailure(
      () => assertCandidateVideoComparisonMeasurementV001(
        preExecutionComparisonMeasurement,
        comparisonContractJob,
        clone(humanComparison.verification)
      ),
      'private検証履歴のないhuman evidence receiptを偽造'
    );
    const wrongLocusReference = clone(humanComparison.reference);
    const wrongLocusIntervals = wrongLocusReference.humanApprovedRequiredIntervals as Array<
      Record<string, unknown>
    >;
    wrongLocusIntervals[1].startTimeMs = cameraHumanIntervals[0].startTimeMs;
    wrongLocusIntervals[1].endTimeMs = cameraHumanIntervals[0].endTimeMs;
    const wrongLocusReferenceBytes = canonicalJsonBytesV001(wrongLocusReference);
    const wrongLocusBinding = {
      path: 'fixtures/wrong-locus-human-comparison-reference-v001.json',
      schemaVersion: CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
      fileSha256: sha256(wrongLocusReferenceBytes)
    };
    await writeTemporaryFixtureFile(
      comparisonMeasurementFixture.workspaceRoot,
      wrongLocusBinding.path,
      wrongLocusReferenceBytes
    );
    await assert.rejects(
      verifyCandidateVideoHumanComparisonReferenceEvidenceV001(
        wrongLocusBinding,
        comparisonContractJob,
        comparisonMeasurementFixture.workspaceRoot
      ),
      {name: 'CandidateVideoUnderstandingContractErrorV001'},
      '別locus内の区間を同じ位置へ差し替える攻撃を拒否'
    );
    const candidatePointExcludedReference = clone(humanComparison.reference);
    const candidatePointExcludedIntervals =
      candidatePointExcludedReference.humanApprovedRequiredIntervals as Array<
        Record<string, unknown>
      >;
    candidatePointExcludedIntervals[0].startTimeMs =
      cameraHumanIntervals[0].startTimeMs + 1;
    const candidatePointExcludedReferenceBytes = canonicalJsonBytesV001(
      candidatePointExcludedReference
    );
    const candidatePointExcludedBinding = {
      path: 'fixtures/candidate-point-excluded-human-comparison-reference-v001.json',
      schemaVersion: CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
      fileSha256: sha256(candidatePointExcludedReferenceBytes)
    };
    await writeTemporaryFixtureFile(
      comparisonMeasurementFixture.workspaceRoot,
      candidatePointExcludedBinding.path,
      candidatePointExcludedReferenceBytes
    );
    await assert.rejects(
      verifyCandidateVideoHumanComparisonReferenceEvidenceV001(
        candidatePointExcludedBinding,
        comparisonContractJob,
        comparisonMeasurementFixture.workspaceRoot
      ),
      {name: 'CandidateVideoUnderstandingContractErrorV001'},
      '同一窓内でも候補地点を含まない区間への人間正解差し替えを拒否'
    );
    const nonHumanSelectionReview = clone(humanComparison.humanReview);
    nonHumanSelectionReview.reviewer = 'not-kawafmm';
    const nonHumanSelectionReviewBytes = orderedContractBytes(nonHumanSelectionReview);
    const nonHumanSelectionReviewBinding = {
      path: 'fixtures/non-human-selection-review-result-v002.json',
      schemaVersion: 'distant-connection-human-review-result-v002',
      fileSha256: sha256(nonHumanSelectionReviewBytes)
    };
    const nonHumanSelectionReference = clone(humanComparison.reference);
    (nonHumanSelectionReference.evidenceBindings as Record<string, unknown>).humanReview =
      nonHumanSelectionReviewBinding;
    const nonHumanSelectionReferenceBytes = canonicalJsonBytesV001(
      nonHumanSelectionReference
    );
    const nonHumanSelectionReferenceBinding = {
      path: 'fixtures/non-human-selection-comparison-reference-v001.json',
      schemaVersion: CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
      fileSha256: sha256(nonHumanSelectionReferenceBytes)
    };
    await Promise.all([
      writeTemporaryFixtureFile(
        comparisonMeasurementFixture.workspaceRoot,
        nonHumanSelectionReviewBinding.path,
        nonHumanSelectionReviewBytes
      ),
      writeTemporaryFixtureFile(
        comparisonMeasurementFixture.workspaceRoot,
        nonHumanSelectionReferenceBinding.path,
        nonHumanSelectionReferenceBytes
      )
    ]);
    await assert.rejects(
      verifyCandidateVideoHumanComparisonReferenceEvidenceV001(
        nonHumanSelectionReferenceBinding,
        comparisonContractJob,
        comparisonMeasurementFixture.workspaceRoot
      ),
      {name: 'CandidateVideoUnderstandingContractErrorV001'},
      'human reviewとreferenceのSHAを同時更新したreviewer差し替えを拒否'
    );
    const measurementWithCompositeScore = {
      evaluationScope: 'intervalization-replacement-comparison',
      jobBinding: comparisonJobBinding,
      resultBinding: null,
      baselineBinding: comparisonWindowPlanBinding,
      humanComparisonReferenceBinding: null,
      requiredMomentsContained: true,
      coreStartErrorMs: null,
      reactionEndErrorMs: null,
      geminiFirstReviewDurationMs: 0,
      humanRequiredIntervalDurationMs: 0,
      freeFixedWindowDurationMs: 0,
      minimumContextNeeded: null,
      matchingVisualCautions: [],
      nonMatchingVisualCautions: [],
      insufficientEvidenceReported: true,
      sourceProjectionSucceeded: false,
      unmappedCandidatePtsIntervalCount: 1,
      estimatedApiCostUsd: '0',
      apiLatencyMs: 0,
      pureHumanWatchTimeMs: 0,
      geminiBeatsFreeBaseline: false,
      outcome: {
        providerExecutionStatus: 'not-run',
        failureAttribution: 'projection-or-manufacturing-failure',
        humanDisposition: 'not-reviewed',
        factualDescription: '正式投影を閉じられない。'
      },
      compositeScore: 0.8
    };
    expectContractFailure(
      () => assertCandidateVideoComparisonMeasurementV001(
        measurementWithCompositeScore,
        comparisonContractJob
      ),
      '合成点を比較結果へ混入'
    );
    assertions += 9;
  } finally {
    await comparisonMeasurementFixture.cleanup();
  }

  const doctorHumanIntervals = COMPARISON_WINDOW_FIXTURES[3].human;
  if (doctorHumanIntervals === null) throw new Error('doctor human intervals missing');
  const qualityReviewFixture = await materializeReadyComparisonMockFixture(
    comparisonContractFixtures[3],
    semanticBytes
  );
  try {
    const qualityHumanComparison = await materializeAvailableHumanComparisonReferenceFixture(
      qualityReviewFixture,
      doctorHumanIntervals,
      'quality-v001-rejected'
    );
    if (qualityReviewFixture.job.comparisonInput.status !== 'resolved') {
      throw new Error('quality review comparison fixture must be resolved');
    }
    assert.equal(qualityHumanComparison.verification.reference.humanDisposition, 'rejected');
    assertCandidateVideoComparisonMeasurementV001({
      evaluationScope: 'intervalization-replacement-comparison',
      jobBinding: {
        path: 'fixtures/doctor-comparison-job-v001.json',
        schemaVersion: CANDIDATE_VIDEO_UNDERSTANDING_JOB_SCHEMA_V001,
        fileSha256: sha256(serializeCandidateVideoUnderstandingJobV001(qualityReviewFixture.job))
      },
      resultBinding: null,
      baselineBinding:
        qualityReviewFixture.job.comparisonInput.sharedFreeAndGeminiWindowPlan,
      humanComparisonReferenceBinding: qualityHumanComparison.binding,
      requiredMomentsContained: null,
      coreStartErrorMs: null,
      reactionEndErrorMs: null,
      geminiFirstReviewDurationMs: null,
      humanRequiredIntervalDurationMs: 35745,
      freeFixedWindowDurationMs: 106181,
      minimumContextNeeded: null,
      matchingVisualCautions: null,
      nonMatchingVisualCautions: null,
      insufficientEvidenceReported: null,
      sourceProjectionSucceeded: null,
      unmappedCandidatePtsIntervalCount: null,
      estimatedApiCostUsd: null,
      apiLatencyMs: null,
      pureHumanWatchTimeMs: 106181,
      geminiBeatsFreeBaseline: null,
      outcome: {
        providerExecutionStatus: 'not-run',
        failureAttribution: null,
        humanDisposition: 'rejected',
        factualDescription: '人間が区間化を承認し、映像品質を理由に不採用とした例を分離する。'
      }
    }, qualityReviewFixture.job, qualityHumanComparison.verification);
    const changedQualityReview = clone(qualityHumanComparison.humanReview);
    const changedCandidateReviews = changedQualityReview.candidateReviews as Array<
      Record<string, unknown>
    >;
    const doctorReview = changedCandidateReviews.find((review) =>
      review.candidateId === qualityReviewFixture.job.localCandidateId);
    if (!doctorReview) throw new Error('doctor quality review missing');
    doctorReview.intervalizationEvaluation = 'fail';
    const changedQualityReviewBytes = canonicalJsonBytesV001(changedQualityReview);
    const changedQualityReviewBinding = {
      path: 'fixtures/changed-human-quality-review-result-v001.json',
      schemaVersion: 'distant-connection-human-quality-review-result-v001',
      fileSha256: sha256(changedQualityReviewBytes)
    };
    const changedQualityReference = clone(qualityHumanComparison.reference);
    (changedQualityReference.evidenceBindings as Record<string, unknown>).humanReview =
      changedQualityReviewBinding;
    const changedQualityReferenceBytes = canonicalJsonBytesV001(changedQualityReference);
    const changedQualityReferenceBinding = {
      path: 'fixtures/changed-quality-human-comparison-reference-v001.json',
      schemaVersion: CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
      fileSha256: sha256(changedQualityReferenceBytes)
    };
    await Promise.all([
      writeTemporaryFixtureFile(
        qualityReviewFixture.workspaceRoot,
        changedQualityReviewBinding.path,
        changedQualityReviewBytes
      ),
      writeTemporaryFixtureFile(
        qualityReviewFixture.workspaceRoot,
        changedQualityReferenceBinding.path,
        changedQualityReferenceBytes
      )
    ]);
    await assert.rejects(
      verifyCandidateVideoHumanComparisonReferenceEvidenceV001(
        changedQualityReferenceBinding,
        qualityReviewFixture.job,
        qualityReviewFixture.workspaceRoot
      ),
      {name: 'CandidateVideoUnderstandingContractErrorV001'},
      '区間化確認をpassからfailへ変更した人間評価を拒否'
    );
    const changedQualityReviewer = clone(qualityHumanComparison.humanReview);
    changedQualityReviewer.reviewer = 'not-kawafmm';
    const changedQualityReviewerBytes = orderedContractBytes(changedQualityReviewer);
    const changedQualityReviewerBinding = {
      path: 'fixtures/changed-human-quality-reviewer-result-v001.json',
      schemaVersion: 'distant-connection-human-quality-review-result-v001',
      fileSha256: sha256(changedQualityReviewerBytes)
    };
    const changedQualityReviewerReference = clone(qualityHumanComparison.reference);
    (changedQualityReviewerReference.evidenceBindings as Record<string, unknown>).humanReview =
      changedQualityReviewerBinding;
    const changedQualityReviewerReferenceBytes = canonicalJsonBytesV001(
      changedQualityReviewerReference
    );
    const changedQualityReviewerReferenceBinding = {
      path: 'fixtures/changed-quality-reviewer-comparison-reference-v001.json',
      schemaVersion: CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
      fileSha256: sha256(changedQualityReviewerReferenceBytes)
    };
    await Promise.all([
      writeTemporaryFixtureFile(
        qualityReviewFixture.workspaceRoot,
        changedQualityReviewerBinding.path,
        changedQualityReviewerBytes
      ),
      writeTemporaryFixtureFile(
        qualityReviewFixture.workspaceRoot,
        changedQualityReviewerReferenceBinding.path,
        changedQualityReviewerReferenceBytes
      )
    ]);
    await assert.rejects(
      verifyCandidateVideoHumanComparisonReferenceEvidenceV001(
        changedQualityReviewerReferenceBinding,
        qualityReviewFixture.job,
        qualityReviewFixture.workspaceRoot
      ),
      {name: 'CandidateVideoUnderstandingContractErrorV001'},
      'quality reviewとreferenceのSHAを同時更新したreviewer差し替えを拒否'
    );
    assertions += 4;
  } finally {
    await qualityReviewFixture.cleanup();
  }

  const fifthMeasurementFixture = await materializeReadyComparisonMockFixture(
    fifthComparisonContract,
    semanticBytes
  );
  try {
    const fifthHumanComparison = await materializeNegativeHumanComparisonReferenceFixture(
      fifthMeasurementFixture,
      [
        {startTimeMs: 249378, endTimeMs: 255324},
        {startTimeMs: 6134433, endTimeMs: 6141636}
      ]
    );
    const fifthComparisonJob = fifthMeasurementFixture.job;
    if (fifthComparisonJob.comparisonInput.status !== 'resolved') {
      throw new Error('fifth comparison contract fixture must be resolved');
    }
    const fifthWindowPlanBinding =
      fifthComparisonJob.comparisonInput.sharedFreeAndGeminiWindowPlan;
    const fifthMeasurement = {
      evaluationScope: 'intervalization-replacement-comparison',
      jobBinding: {
        path: 'fixtures/fifth-comparison-job-v001.json',
        schemaVersion: CANDIDATE_VIDEO_UNDERSTANDING_JOB_SCHEMA_V001,
        fileSha256: sha256(serializeCandidateVideoUnderstandingJobV001(fifthComparisonJob))
      },
      resultBinding: null,
      baselineBinding: fifthWindowPlanBinding,
      humanComparisonReferenceBinding: fifthHumanComparison.binding,
      requiredMomentsContained: null,
      coreStartErrorMs: null,
      reactionEndErrorMs: null,
      geminiFirstReviewDurationMs: null,
      humanRequiredIntervalDurationMs: null,
      freeFixedWindowDurationMs: 104933,
      minimumContextNeeded: null,
      matchingVisualCautions: null,
      nonMatchingVisualCautions: null,
      insufficientEvidenceReported: null,
      sourceProjectionSucceeded: null,
      unmappedCandidatePtsIntervalCount: null,
      estimatedApiCostUsd: null,
      apiLatencyMs: null,
      pureHumanWatchTimeMs: 104933,
      geminiBeatsFreeBaseline: null,
      outcome: {
        providerExecutionStatus: 'not-run',
        failureAttribution: 'candidate-discovery-failure',
        humanDisposition: 'rejected',
        factualDescription: '人間承認済み必要区間がない候補発見失敗として分離する。'
      }
    } as const;
    assertCandidateVideoComparisonMeasurementV001(
      fifthMeasurement,
      fifthComparisonJob,
      fifthHumanComparison.verification
    );
    expectContractFailure(
      () => assertCandidateVideoComparisonMeasurementV001({
        ...fifthMeasurement,
        requiredMomentsContained: true,
        coreStartErrorMs: 0,
        reactionEndErrorMs: 0,
        humanRequiredIntervalDurationMs: 13149,
        matchingVisualCautions: []
      }, fifthComparisonJob, fifthHumanComparison.verification),
      '5本目へ存在しない人間承認済み必要区間由来の比較値を混入'
    );
    const changedFifthReference = clone(fifthHumanComparison.reference);
    changedFifthReference.referenceKind = 'human-required-intervals-available';
    const changedEvidenceBindings = changedFifthReference.evidenceBindings as Record<
      string,
      unknown
    >;
    changedEvidenceBindings.intervalProvenance = clone(fifthComparisonJob.sourceMapping.provenance);
    changedFifthReference.humanApprovedRequiredIntervals = [
      {
        locusId: 'candidate-horror-game-to-screams-001-first',
        startTimeMs: 249378,
        endTimeMs: 255324
      },
      {
        locusId: 'candidate-horror-game-to-screams-001-second',
        startTimeMs: 6134433,
        endTimeMs: 6141636
      }
    ];
    const changedFifthReferenceBytes = canonicalJsonBytesV001(changedFifthReference);
    const changedFifthReferenceBinding = {
      path: 'fixtures/changed-fifth-human-comparison-reference-v001.json',
      schemaVersion: CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
      fileSha256: sha256(changedFifthReferenceBytes)
    };
    await writeTemporaryFixtureFile(
      fifthMeasurementFixture.workspaceRoot,
      changedFifthReferenceBinding.path,
      changedFifthReferenceBytes
    );
    await assert.rejects(
      verifyCandidateVideoHumanComparisonReferenceEvidenceV001(
        changedFifthReferenceBinding,
        fifthComparisonJob,
        fifthMeasurementFixture.workspaceRoot
      ),
      {name: 'CandidateVideoUnderstandingContractErrorV001'},
      'reference SHAも更新して5本目の評価対象区間を承認済み正解へ昇格する攻撃を拒否'
    );
    let receiptReferenceGetterReadCount = 0;
    Object.defineProperty(fifthHumanComparison.verification, 'reference', {
      configurable: true,
      get() {
        receiptReferenceGetterReadCount += 1;
        return receiptReferenceGetterReadCount === 1
          ? fifthHumanComparison.reference
          : changedFifthReference;
      }
    });
    expectContractFailure(
      () => assertCandidateVideoComparisonMeasurementV001({
        ...fifthMeasurement,
        requiredMomentsContained: true,
        coreStartErrorMs: 0,
        reactionEndErrorMs: 0,
        humanRequiredIntervalDurationMs: 13149,
        matchingVisualCautions: []
      }, fifthComparisonJob, fifthHumanComparison.verification),
      '検証receiptの公開reference getterによるTOCTOU差し替え'
    );
    assert.equal(receiptReferenceGetterReadCount, 0);
    const changedHumanReview = clone(fifthHumanComparison.humanReview);
    changedHumanReview.primaryCause = 'video-understanding';
    const changedHumanReviewBytes = canonicalJsonBytesV001(changedHumanReview);
    const changedHumanReviewBinding = {
      path: 'fixtures/changed-candidate-human-review-result-v001.json',
      schemaVersion: 'distant-connection-candidate-human-review-result-v001',
      fileSha256: sha256(changedHumanReviewBytes)
    };
    const changedEvidenceReference = clone(fifthHumanComparison.reference);
    (changedEvidenceReference.evidenceBindings as Record<string, unknown>).humanReview =
      changedHumanReviewBinding;
    const changedEvidenceReferenceBytes = canonicalJsonBytesV001(changedEvidenceReference);
    const changedEvidenceReferenceBinding = {
      path: 'fixtures/changed-evidence-human-comparison-reference-v001.json',
      schemaVersion: CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
      fileSha256: sha256(changedEvidenceReferenceBytes)
    };
    await Promise.all([
      writeTemporaryFixtureFile(
        fifthMeasurementFixture.workspaceRoot,
        changedHumanReviewBinding.path,
        changedHumanReviewBytes
      ),
      writeTemporaryFixtureFile(
        fifthMeasurementFixture.workspaceRoot,
        changedEvidenceReferenceBinding.path,
        changedEvidenceReferenceBytes
      )
    ]);
    await assert.rejects(
      verifyCandidateVideoHumanComparisonReferenceEvidenceV001(
        changedEvidenceReferenceBinding,
        fifthComparisonJob,
        fifthMeasurementFixture.workspaceRoot
      ),
      {name: 'CandidateVideoUnderstandingContractErrorV001'},
      'human reviewとreferenceのSHAを同時更新して候補発見原因を変更する攻撃を拒否'
    );
    const malformedCandidateReview = clone(fifthHumanComparison.candidateReview);
    (malformedCandidateReview.mediaInspection as Record<string, unknown>).videoPresent = false;
    const malformedCandidateReviewBytes = orderedContractBytes(malformedCandidateReview);
    const malformedCandidateReviewBinding = {
      path: 'fixtures/malformed-candidate-review-result-v001.json',
      schemaVersion: 'distant-connection-candidate-review-result-v001',
      fileSha256: sha256(malformedCandidateReviewBytes)
    };
    const malformedCandidateHumanReview = clone(fifthHumanComparison.humanReview);
    (malformedCandidateHumanReview.sourceBindings as Record<string, unknown>)
      .candidateReviewResult = malformedCandidateReviewBinding;
    const malformedCandidateHumanReviewBytes = orderedContractBytes(
      malformedCandidateHumanReview
    );
    const malformedCandidateHumanReviewBinding = {
      path: 'fixtures/malformed-candidate-human-review-result-v001.json',
      schemaVersion: 'distant-connection-candidate-human-review-result-v001',
      fileSha256: sha256(malformedCandidateHumanReviewBytes)
    };
    const malformedCandidateReference = clone(fifthHumanComparison.reference);
    (malformedCandidateReference.evidenceBindings as Record<string, unknown>).humanReview =
      malformedCandidateHumanReviewBinding;
    const malformedCandidateReferenceBytes = canonicalJsonBytesV001(
      malformedCandidateReference
    );
    const malformedCandidateReferenceBinding = {
      path: 'fixtures/malformed-candidate-comparison-reference-v001.json',
      schemaVersion: CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
      fileSha256: sha256(malformedCandidateReferenceBytes)
    };
    await Promise.all([
      writeTemporaryFixtureFile(
        fifthMeasurementFixture.workspaceRoot,
        malformedCandidateReviewBinding.path,
        malformedCandidateReviewBytes
      ),
      writeTemporaryFixtureFile(
        fifthMeasurementFixture.workspaceRoot,
        malformedCandidateHumanReviewBinding.path,
        malformedCandidateHumanReviewBytes
      ),
      writeTemporaryFixtureFile(
        fifthMeasurementFixture.workspaceRoot,
        malformedCandidateReferenceBinding.path,
        malformedCandidateReferenceBytes
      )
    ]);
    await assert.rejects(
      verifyCandidateVideoHumanComparisonReferenceEvidenceV001(
        malformedCandidateReferenceBinding,
        fifthComparisonJob,
        fifthMeasurementFixture.workspaceRoot
      ),
      {name: 'CandidateVideoUnderstandingContractErrorV001'},
      'candidate reviewから映像成立証拠を壊して全SHA連鎖を更新する攻撃を拒否'
    );

    const outOfWindowCandidateReview = clone(fifthHumanComparison.candidateReview);
    const outOfWindowParts = outOfWindowCandidateReview.evaluatedParts as Array<
      Record<string, unknown>
    >;
    outOfWindowParts[0].sourceInterval = {sourceStartMs: 100000, sourceEndMs: 100100};
    outOfWindowParts[1].sourceInterval = {sourceStartMs: 6000000, sourceEndMs: 6000100};
    const outOfWindowCandidateReviewBytes = orderedContractBytes(outOfWindowCandidateReview);
    const outOfWindowCandidateReviewBinding = {
      path: 'fixtures/out-of-window-candidate-review-result-v001.json',
      schemaVersion: 'distant-connection-candidate-review-result-v001',
      fileSha256: sha256(outOfWindowCandidateReviewBytes)
    };
    const outOfWindowHumanReview = clone(fifthHumanComparison.humanReview);
    (outOfWindowHumanReview.sourceBindings as Record<string, unknown>).candidateReviewResult =
      outOfWindowCandidateReviewBinding;
    outOfWindowHumanReview.evaluatedIntervals = {
      firstPartSourceInterval: {sourceStartMs: 100000, sourceEndMs: 100100},
      secondPartSourceInterval: {sourceStartMs: 6000000, sourceEndMs: 6000100}
    };
    const outOfWindowHumanReviewBytes = orderedContractBytes(outOfWindowHumanReview);
    const outOfWindowHumanReviewBinding = {
      path: 'fixtures/out-of-window-candidate-human-review-result-v001.json',
      schemaVersion: 'distant-connection-candidate-human-review-result-v001',
      fileSha256: sha256(outOfWindowHumanReviewBytes)
    };
    const outOfWindowReference = clone(fifthHumanComparison.reference);
    (outOfWindowReference.evidenceBindings as Record<string, unknown>).humanReview =
      outOfWindowHumanReviewBinding;
    const outOfWindowReferenceBytes = canonicalJsonBytesV001(outOfWindowReference);
    const outOfWindowReferenceBinding = {
      path: 'fixtures/out-of-window-candidate-comparison-reference-v001.json',
      schemaVersion: CANDIDATE_VIDEO_HUMAN_COMPARISON_REFERENCE_SCHEMA_V001,
      fileSha256: sha256(outOfWindowReferenceBytes)
    };
    await Promise.all([
      writeTemporaryFixtureFile(
        fifthMeasurementFixture.workspaceRoot,
        outOfWindowCandidateReviewBinding.path,
        outOfWindowCandidateReviewBytes
      ),
      writeTemporaryFixtureFile(
        fifthMeasurementFixture.workspaceRoot,
        outOfWindowHumanReviewBinding.path,
        outOfWindowHumanReviewBytes
      ),
      writeTemporaryFixtureFile(
        fifthMeasurementFixture.workspaceRoot,
        outOfWindowReferenceBinding.path,
        outOfWindowReferenceBytes
      )
    ]);
    await assert.rejects(
      verifyCandidateVideoHumanComparisonReferenceEvidenceV001(
        outOfWindowReferenceBinding,
        fifthComparisonJob,
        fifthMeasurementFixture.workspaceRoot
      ),
      {name: 'CandidateVideoUnderstandingContractErrorV001'},
      'candidate reviewとhuman reviewの区間・全SHA連鎖を比較窓外へ移す攻撃を拒否'
    );
    assertions += 9;
  } finally {
    await fifthMeasurementFixture.cleanup();
  }

  const badJobs: Array<[string, (value: Record<string, unknown>) => void]> = [
    ['extra job field', (value) => { value.finalVerdict = 'approved'; }],
    ['comparison scope without wider exploration bindings', (value) => {
      value.evaluationScope = 'intervalization-replacement-comparison';
    }],
    ['unsafe path', (value) => {
      (((value.localBindings as Record<string, unknown>).candidate as Record<string, unknown>).path) = '../candidate.json';
    }],
    ['video absent', (value) => {
      ((((value.candidateMedia as Record<string, unknown>).video as Record<string, unknown>).codecName)) = '';
    }],
    ['audio absent', (value) => {
      ((((value.candidateMedia as Record<string, unknown>).audio as Record<string, unknown>).codecName)) = '';
    }],
    ['mapping gap', (value) => {
      (((value.sourceMapping as Record<string, unknown>).segments as Array<Record<string, unknown>>)[1].candidateStartPts) = 107520;
    }],
    ['mapping overlap', (value) => {
      (((value.sourceMapping as Record<string, unknown>).segments as Array<Record<string, unknown>>)[1].candidateStartPts) = 106496;
    }],
    ['mapping reverse', (value) => {
      (((value.sourceMapping as Record<string, unknown>).segments as Array<Record<string, unknown>>)[0].candidateEndPtsExclusive) = 0;
    }],
    ['source overlap', (value) => {
      (((value.sourceMapping as Record<string, unknown>).segments as Array<Record<string, unknown>>)[1].sourceSelectionStartMs) = 671000;
    }],
    ['mapping incomplete', (value) => {
      (((value.sourceMapping as Record<string, unknown>).segments as Array<Record<string, unknown>>)[1].candidateFrameEndIndexExclusive) = 1670;
    }],
    ['human review as reference context source', (value) => {
      value.referenceContext = {
        status: 'present',
        source: 'validated-candidate-video-understanding-result',
        sourceResult: {
          path: humanReference.humanReviewPath,
          schemaVersion: 'human-review-result-v002',
          fileSha256: humanReference.humanReviewSha256
        },
        role: 'coreEvent',
        opaqueReferenceId: 'reference-0001',
        factualObservation: humanReference.humanReason,
        factualObservationSha256: createHash('sha256')
          .update(humanReference.humanReason)
          .digest('hex')
      };
    }],
    ['retry enabled', (value) => {
      ((value.inferencePolicy as Record<string, unknown>).automaticRetryCount) = 1;
    }]
  ];
  for (const [label, mutate] of badJobs) {
    const invalid = clone(JOBS[0]) as unknown as Record<string, unknown>;
    mutate(invalid);
    expectContractFailure(() => assertCandidateVideoUnderstandingJobV001(invalid), label);
    assertions += 1;
  }

  const badOutputs: Array<[string, (value: Record<string, unknown>) => void]> = [
    ['extra output field', (value) => { value.score = 100; }],
    ['unknown role', (value) => {
      (((value.roleObservations as Array<Record<string, unknown>>)[0]).role) = 'punchline';
    }],
    ['end <= start', (value) => {
      const role = (value.roleObservations as Array<Record<string, unknown>>)[0];
      (((role.intervals as Array<Record<string, unknown>>)[0]).endTimeMs) = 6900;
    }],
    ['outside duration', (value) => {
      const role = (value.roleObservations as Array<Record<string, unknown>>)[0];
      (((role.intervals as Array<Record<string, unknown>>)[0]).endTimeMs) = 55701;
    }],
    ['duplicate observation ID', (value) => {
      const role = (value.roleObservations as Array<Record<string, unknown>>)[1];
      (((role.intervals as Array<Record<string, unknown>>)[0]).observationId) = 'observation-001';
    }],
    ['duplicate observation', (value) => {
      const role = (value.roleObservations as Array<Record<string, unknown>>)[0];
      const rows = role.intervals as Array<Record<string, unknown>>;
      const duplicate = clone(rows[0]);
      duplicate.observationId = 'observation-999';
      rows.push(duplicate);
    }],
    ['missing role', (value) => {
      (value.roleObservations as Array<Record<string, unknown>>).pop();
    }],
    ['duplicate role', (value) => {
      (((value.roleObservations as Array<Record<string, unknown>>)[1]).role) = 'coreEvent';
    }],
    ['not observed with interval', (value) => {
      (((value.roleObservations as Array<Record<string, unknown>>)[0]).status) = 'notObserved';
    }],
    ['observed without interval', (value) => {
      const role = (value.roleObservations as Array<Record<string, unknown>>)[0];
      role.intervals = [];
    }],
    ['duplicate evidence modality', (value) => {
      const role = (value.roleObservations as Array<Record<string, unknown>>)[0];
      (((role.intervals as Array<Record<string, unknown>>)[0]).evidenceModalities) = ['video', 'video'];
    }],
    ['unknown visual note', (value) => {
      (((value.visualCautions as Array<Record<string, unknown>>)[0]).kind) = 'good-video';
    }],
    ['insufficient evidence mismatch', (value) => {
      ((value.insufficientEvidence as Record<string, unknown>).present) = false;
    }],
    ['observed role declared missing', (value) => {
      ((value.insufficientEvidence as Record<string, unknown>).missingEvidence as string[])
        .push('coreEvent');
    }],
    ['notObserved role omitted from missing evidence', (value) => {
      ((value.insufficientEvidence as Record<string, unknown>).missingEvidence) = ['visualEvent'];
    }]
  ];
  for (const [label, mutate] of badOutputs) {
    const invalid = clone(output) as unknown as Record<string, unknown>;
    mutate(invalid);
    expectContractFailure(
      () => assertCandidateVideoUnderstandingProviderOutputV001(invalid, JOBS[0]),
      label
    );
    assertions += 1;
  }

  const resultWithDecision = clone(result) as unknown as Record<string, unknown>;
  resultWithDecision.finalVerdict = 'approved';
  expectContractFailure(
    () => assertCandidateVideoUnderstandingResultV001(resultWithDecision, resultReadyJob),
    'resultは最終採否を所有しない'
  );
  const resultWithRetry = clone(failedResult);
  ((resultWithRetry.execution as Record<string, unknown>).automaticRetryCount) = 1;
  expectContractFailure(
    () => assertCandidateVideoUnderstandingResultV001(resultWithRetry),
    'failed resultでもretryは禁止'
  );
  assertions += 2;

  const resultWithChangedProjection = clone(result);
  resultWithChangedProjection.projectedRoleIntervals[0].sourceIntervals[0].sourceStartTimeMs = {
    numerator: 1,
    denominator: 1
  };
  expectContractFailure(
    () => assertCandidateVideoUnderstandingResultV001(resultWithChangedProjection, resultReadyJob),
    'result projectionの手修正は禁止'
  );
  assertions += 1;

  const mismatchedCandidateSha = clone(JOBS[0]);
  mismatchedCandidateSha.localBindings.candidate.fileSha256 = '0'.repeat(64);
  await assert.rejects(
    verifyCandidateVideoUnderstandingJobFilesV001(mismatchedCandidateSha, WORKSPACE_ROOT),
    {name: 'CandidateVideoUnderstandingContractErrorV001'}
  );
  assertions += 1;

  const nonCanonical = Buffer.from(JSON.stringify(JOBS[0]), 'utf8');
  expectContractFailure(() => decodeCandidateVideoUnderstandingJobV001(nonCanonical), 'non-canonical job byte');
  assert.notDeepEqual(canonicalJsonBytesV001({b: 1, a: 2}), Buffer.from('{"b":1,"a":2}\n'));
  assertions += 2;

  const formallyReadyIntervalizationComparisonJobs = comparisonContractFixtures.filter(
    ({job, plan}) => job.evaluationScope === 'intervalization-replacement-comparison'
      && job.comparisonInput.status === 'resolved'
      && job.preflight.status === 'ready'
      && plan.fixedWindowSettingsApproval.status === 'approved'
  ).length;

  process.stdout.write(`${JSON.stringify({
    status: 'passed',
    assertions,
    fixtureJobsBound: JOBS.length,
    providerInputAllowlistPassed: JOBS.length,
    providerSchemaUnsupportedKeywords: 0,
    formallyRepresentableAbsentRoles: CANDIDATE_VIDEO_ROLE_VALUES_V001.length,
    rawEmpiricalComparisonWindowDurationMs: 502580,
    speechBoundarySnappedComparisonWindowDurationMs: snappedComparisonDurationMs,
    candidatePointsDerivedFromBoundArtifacts: 10,
    mockRequestCaptures,
    communicationPlanStatus: communicationProposal.status,
    formallyClosedSourceMappings: 5,
    explicitUnmappedPtsIntervals: 1,
    apiCommunications: 0,
    videosGenerated: 0,
    comparisonPlanFixturesValidated: comparisonContractFixtures.length,
    comparisonExperimentPlanV002Status: comparisonExperimentPlanV002.status,
    comparisonExperimentPlanV002CanonicalSha256:
      sha256(comparisonExperimentPlanV002Bytes),
    comparisonExperimentPlanV002CalibrationItems:
      comparisonExperimentPlanV002.totals.calibrationItems,
    comparisonExperimentPlanV002DurationBasis:
      comparisonExperimentPlanV002.totals.durationBasis,
    freeHumanBaselineRawDurationMs:
      comparisonExperimentPlanV002.totals.freeHumanBaselineRawDurationMs,
    freeHumanBaselineSnappedDurationMs:
      comparisonExperimentPlanV002.totals.freeHumanBaselineSnappedDurationMs,
    geminiExplorationRawDurationMs:
      comparisonExperimentPlanV002.totals.geminiExplorationRawDurationMs,
    geminiExplorationSnappedDurationMs:
      comparisonExperimentPlanV002.totals.geminiExplorationSnappedDurationMs,
    truthRequiredMetricEligibleItems:
      comparisonExperimentPlanV002.totals.truthEligibleItems,
    truthRequiredMetricEligibleLoci:
      comparisonExperimentPlanV002.totals.truthEligibleLoci,
    truthRequiredMetricExcludedItems:
      comparisonExperimentPlanV002.totals.truthExcludedItems,
    formalIntervalizationComparisonJobsReady: formallyReadyIntervalizationComparisonJobs,
    provisionalHumanComparisonCrossBindingFixturesVerified: 3,
    formalHumanTruthReceiptsReady: 0,
    formalComparisonMeasurementsReady: 0,
    humanComparisonReferenceTamperingRejected: true,
    candidateDiscoveryNegativeApprovedRequiredIntervals: 0,
    humanReviewArtifactReadsForLeakageNegativeTest: 0,
    humanReviewArtifactsIncludedInProviderInput: 0
  })}\n`);
}

await main();

// task-015: synthetic output only; the saved live response is revalidated separately
// after all suites and typechecks pass. No provider request or human artifact is read here.
{
  const {loadPreparationJobs} = await import('./candidate-video-understanding-transport-v001.js');
  const {deriveCandidateVideoReviewV002, buildCandidateVideoRequestTemplateV002} =
    await import('./candidate-video-understanding-v001.js');
  const job = (await loadPreparationJobs(join(import.meta.dirname, '../..')))[0];
  const beforeRequest = canonicalJsonBytesV001(buildCandidateVideoRequestTemplateV002(job));
  const answered = () => ({
    schemaVersion: 'candidate-video-understanding-provider-output-v002' as const,
    itemId: job.itemId, status: 'answered' as 'answered' | 'partial' | 'abstain', summary: 'Synthetic observation.',
    roleObservations: CANDIDATE_VIDEO_ROLE_VALUES_V001.map((role, index) => ({
      role, status: 'observed' as 'observed' | 'notObserved', factualDescription: 'Synthetic role.',
      intervals: [{observationId: `observation-${String(index + 1).padStart(3, '0')}`,
        startTimeMs: 1000 + index * 1000, endTimeMs: 1500 + index * 1000,
        factualDescription: 'Synthetic interval.', evidenceModalities: ['video' as const]}]
    })),
    visualCautions: [{kind: 'audioDependent' as const, startTimeMs: 1000, endTimeMs: 1500,
      factualDescription: 'Synthetic caution.'}],
    insufficientEvidence: {present: false, missingEvidence: [] as string[], factualDescription: ''}
  });
  let checks = 0;
  function rejected(name: string, mutate: (o: ReturnType<typeof answered>) => void) {
    const o = answered(); mutate(o);
    assert.throws(() => assertCandidateVideoOutputV002(o, job), name); checks++;
  }
  for (const description of ['', 'No missing evidence reported.']) {
    const o = answered(); o.insufficientEvidence.factualDescription = description;
    const original = canonicalJsonBytesV001(o);
    assertCandidateVideoOutputV002(o, job);
    assert.deepEqual(canonicalJsonBytesV001(o), original);
    assert.equal(deriveCandidateVideoReviewV002(job, o).status, 'established'); checks++;
  }
  for (const status of ['partial', 'abstain'] as const) rejected(status + ' empty', o => { o.status = status; });
  rejected('present true', o => { o.insufficientEvidence.present = true; });
  rejected('missing evidence field contradicts answered', o => { o.insufficientEvidence.missingEvidence = ['visualEvent']; });
  rejected('coherent partial still needs explanation', o => {
    o.status = 'partial'; o.insufficientEvidence.present = true; o.insufficientEvidence.missingEvidence = ['visualEvent'];
  });
  for (const index of [0, 1, 2, 3, 4, 5]) {
    const o = answered(); o.status = 'partial';
    o.roleObservations[index].status = 'notObserved'; o.roleObservations[index].intervals = [];
    o.insufficientEvidence.present = true; o.insufficientEvidence.missingEvidence = [o.roleObservations[index].role];
    let ordinal = 0; o.roleObservations.forEach(r => r.intervals.forEach(i => { i.observationId = `observation-${String(++ordinal).padStart(3, '0')}`; }));
    assert.throws(() => assertCandidateVideoOutputV002(o, job));
    o.insufficientEvidence.factualDescription = 'Synthetic reason for missing role.';
    assertCandidateVideoOutputV002(o, job);
    if (index < 3) {
      const review = deriveCandidateVideoReviewV002(job, o);
      assert.equal(review.status, 'not-established'); assert.equal(review.sourcePresentationDurationMs, null);
    }
    checks++;
  }
  {
    const o = answered(); o.status = 'abstain'; o.roleObservations.forEach(r => { r.status = 'notObserved'; r.intervals = []; });
    o.insufficientEvidence.present = true; o.insufficientEvidence.missingEvidence = [...CANDIDATE_VIDEO_ROLE_VALUES_V001];
    assert.throws(() => assertCandidateVideoOutputV002(o, job));
    o.insufficientEvidence.factualDescription = 'Synthetic abstention reason.';
    assertCandidateVideoOutputV002(o, job); assert.equal(deriveCandidateVideoReviewV002(job, o).sourcePresentationDurationMs, null); checks++;
  }
  for (const value of [' ', '\n', null, 0, false, undefined]) rejected('not an exact empty string', o => {
    (o.insufficientEvidence as any).factualDescription = value;
  });
  rejected('missing explanation field', o => { delete (o.insufficientEvidence as any).factualDescription; });
  rejected('unknown failure status', o => { (o as any).status = 'failed'; });
  rejected('unknown insufficiency field', o => { (o.insufficientEvidence as any).otherMissingEvidence = true; });
  rejected('summary stays required', o => { o.summary = ''; });
  rejected('visual caution stays required', o => { o.visualCautions[0].factualDescription = ''; });
  for (let index = 0; index < 6; index++) {
    rejected('role explanation stays required ' + index, o => { o.roleObservations[index].factualDescription = ''; });
    rejected('interval explanation stays required ' + index, o => { o.roleObservations[index].intervals[0].factualDescription = ''; });
  }
  const legacy = validProviderOutput(); legacy.insufficientEvidence.factualDescription = '';
  assert.throws(() => assertCandidateVideoUnderstandingProviderOutputV001(legacy, JOBS[0])); checks++;
  assert.deepEqual(canonicalJsonBytesV001(buildCandidateVideoRequestTemplateV002(job)), beforeRequest); checks++;
  process.stdout.write(JSON.stringify({suite: 'task-015-insufficiency-explanation', status: 'passed', checks,
    apiCommunications: 0, savedResponseReads: 0, humanReviewArtifactReads: 0}) + '\n');
}

// Forward-only real exploration mappings; no human evaluation file is opened here.
{
  const {loadPreparationJobs} = await import('./candidate-video-understanding-transport-v001.js');
  const {projectCandidateIntervalV002,
    deriveCandidateVideoReviewV002, aggregateCandidateVideoReviewsV002,
    candidateVideoSchemaV002} = await import('./candidate-video-understanding-v001.js');
  const jobs = await loadPreparationJobs(join(import.meta.dirname, '../..'));
  let checks = 0;
  for (const job of jobs) {
    assertCandidateVideoJobV002(job);
    assertCandidateVideoProviderSchemaSupportedSubsetV001(candidateVideoSchemaV002(job.itemId));
    const interval = {startTimeMs: job.itemId === 'item-0003' ? 55051 : job.itemId === 'item-0005' ? 50618 : 1000,
      endTimeMs: job.itemId === 'item-0003' ? 55052 : job.itemId === 'item-0005' ? 50619 : 1001};
    const p = projectCandidateIntervalV002(job, interval);
    assert.ok(p.sourceIntervals.length > 0);
    const s = job.sourceMapping.segments.find(s => s.segmentId === p.sourceIntervals[0].mappingSegmentId)!;
    const actual = p.sourceIntervals[0].sourceStartTimeMs;
    // Independent cross-product equality, with no floating-point tolerance.
    const t = job.sourceMapping.candidateTimeBase;
    const st = job.sourceMapping.sourceTimeBase;
    const deltaN = BigInt(interval.startTimeMs) * BigInt(t.denominator) - BigInt(s.candidateStartPts) * 1000n * BigInt(t.numerator);
    const deltaD = 1000n * BigInt(t.numerator);
    const n = (BigInt(s.sourceStartPts) * deltaD * BigInt(s.candidateEndPtsExclusive - s.candidateStartPts)
      + deltaN * BigInt(s.sourceEndPtsExclusive - s.sourceStartPts)) * 1000n * BigInt(st.numerator);
    const d = deltaD * BigInt(s.candidateEndPtsExclusive - s.candidateStartPts) * BigInt(st.denominator);
    assert.equal(BigInt(actual.numerator) * d, n * BigInt(actual.denominator));
    for (const gap of job.sourceMapping.unmappedCandidatePts) {
      const start = Math.ceil(gap.startPts * 1000 / 15360);
      const end = Math.floor(gap.endPtsExclusive * 1000 / 15360);
      const only = projectCandidateIntervalV002(job, {startTimeMs: start, endTimeMs: end});
      assert.equal(only.sourceIntervals.length, 0);
      assert.equal(only.unmappedCandidateIntervals.length, 1);
      const cross = projectCandidateIntervalV002(job, {startTimeMs: start - 2, endTimeMs: end + 2});
      assert.equal(cross.sourceIntervals.length, 2);
      assert.equal(cross.unmappedCandidateIntervals.length, 1);
      checks += 4;
    }
    checks += 4;
  }
  const entries = jobs.map(job => ({job, output: {...validProviderOutput(),
    schemaVersion: 'candidate-video-understanding-provider-output-v002' as const,
    itemId: job.itemId, status: 'partial' as const}}));
  for (const {job, output} of entries) {
    assertCandidateVideoOutputV002(output, job);
    const review = deriveCandidateVideoReviewV002(job, output);
    assert.equal(review.status, 'established');
    assert.deepEqual(review.candidatePresentationDurationMs, {numerator: 3100, denominator: 1});
    const contradictory = {...output, status: 'answered'};
    assert.throws(() => assertCandidateVideoOutputV002(contradictory, job));
    const extra = {...output, humanApproval: 'synthetic'};
    assert.throws(() => assertCandidateVideoOutputV002(extra, job));
    checks += 5;
  }
  const aggregate = aggregateCandidateVideoReviewsV002(entries);
  assert.equal(aggregate.status, 'established');
  assert.ok(aggregate.sourcePurePlaybackDurationMs);
  // Items 4 and 5 share their first source piece: global union must deduplicate it.
  const total = aggregate.totalPresentationDurationMs!;
  const pure = aggregate.sourcePurePlaybackDurationMs!;
  assert.ok(BigInt(pure.numerator) * BigInt(total.denominator) < BigInt(total.numerator) * BigInt(pure.denominator));
  const absent = structuredClone(entries[0]);
  absent.output.roleObservations[0].status = 'notObserved';
  absent.output.roleObservations[0].intervals = [];
  absent.output.insufficientEvidence.missingEvidence.push('coreEvent');
  let ordinal = 0;
  absent.output.roleObservations.forEach(r => r.intervals.forEach(i => { i.observationId = `observation-${String(++ordinal).padStart(3, '0')}`; }));
  assert.equal(deriveCandidateVideoReviewV002(absent.job, absent.output).status, 'not-established');
  assert.equal(aggregateCandidateVideoReviewsV002([absent, ...entries.slice(1)]).totalPresentationDurationMs, null);
  checks += 5;
  const disjoint = structuredClone(entries[0]);
  disjoint.output.roleObservations[0].intervals[0].startTimeMs = 1000;
  disjoint.output.roleObservations[0].intervals[0].endTimeMs = 2000;
  assert.deepEqual(deriveCandidateVideoReviewV002(disjoint.job, disjoint.output).candidatePresentationDurationMs,
    {numerator: 3900, denominator: 1});
  assert.equal(deriveCandidateVideoReviewV002(disjoint.job, disjoint.output).humanInitialReviewIntervals.length, 2);
  const gapOnly = structuredClone(entries[4]);
  const gap = gapOnly.job.sourceMapping.unmappedCandidatePts[0];
  gapOnly.output.roleObservations[0].intervals[0].startTimeMs = Math.ceil(gap.startPts * 1000 / 15360);
  gapOnly.output.roleObservations[0].intervals[0].endTimeMs = Math.floor(gap.endPtsExclusive * 1000 / 15360);
  assert.equal(deriveCandidateVideoReviewV002(gapOnly.job, gapOnly.output).status, 'not-established');
  const abstained = structuredClone(entries[0]);
  abstained.output.status = 'abstain' as typeof abstained.output.status;
  abstained.output.roleObservations.forEach(r => { r.status = 'notObserved'; r.intervals = []; });
  abstained.output.insufficientEvidence.missingEvidence = [...CANDIDATE_VIDEO_ROLE_VALUES_V001];
  assertCandidateVideoOutputV002(abstained.output, abstained.job);
  assert.equal(deriveCandidateVideoReviewV002(abstained.job, abstained.output).sourcePresentationDurationMs, null);
  checks += 5;
  process.stdout.write(JSON.stringify({suite: 'v002-pts-roles-review-regression', status: 'passed', checks,
    realExplorationMappings: 5, humanReviewArtifactReads: 0, apiCommunications: 0}) + '\n');
}

// task-027: real fixed source bindings, synthetic answers, memory-only request/result construction.
{
  let checks = 0;
  const check = (fn: () => void) => {fn(); checks += 1;};
  const inputs = await loadCandidateVideoIdInputsV003(WORKSPACE_ROOT);
  const formal = JSON.parse(await readFile(join(WORKSPACE_ROOT, SEMANTIC_PATH), 'utf8')) as {
    utterances: Array<{utteranceId: string; ordinal: number; text: string; sourceStartMs: number; sourceEndMs: number}>};
  const formalIndex = new Map(formal.utterances.map(u => [u.utteranceId, u]));
  const allRows = inputs.flatMap(i => i.segments.flatMap(s => s.utterances));
  check(() => assert.deepEqual(inputs.map(i => i.itemId), ['item-0001', 'item-0002', 'item-0003', 'item-0004', 'item-0005']));
  check(() => assert.equal(allRows.length, 1287));
  check(() => assert.equal(new Set(allRows.map(r => r.utteranceId)).size, 1241));
  check(() => assert.equal(allRows.filter(r => r.frameCoverage === 'partial').length, 20));
  check(() => assert.equal(allRows.filter(r => r.selectionCoverage === 'outside').length, 12));
  check(() => assert.equal(allRows.filter(r => r.frameCoverage === 'full' && r.selectionCoverage === 'full').length, 1265));
  check(() => assert.deepEqual(allRows.map(r => [r.utteranceId, r.ordinal, r.text, r.sourceStartMs, r.sourceEndMs]),
    allRows.map(r => {const f = formalIndex.get(r.utteranceId)!; return [f.utteranceId, f.ordinal, f.text, f.sourceStartMs, f.sourceEndMs];})));
  check(() => assert.equal(inputs.flatMap(i => i.segments).reduce((sum, s) => sum + s.targetUtteranceIds.length, 0), 286));
  check(() => assert.deepEqual(inputs.map(i => i.segments.map(s => s.utterances.length)), [[141, 73], [174, 232], [187, 178], [44, 79], [44, 135]]));
  check(() => assert.deepEqual(inputs[3].segments.map(s => s.targetText), ['今年一怖いと言われるホラーゲーム', 'おい、急に速くなった!おい、急に速くなった!']));
  check(() => assert.deepEqual(inputs[4].segments[1].targetUtteranceIds,
    [...formal.utterances.slice(10643, 10650), ...formal.utterances.slice(10657, 10664)].map(u => u.utteranceId)));
  check(() => assert.ok(!inputs[4].segments[1].targetUtteranceIds.includes('semantic-utterance-010651')));
  for (const input of inputs) {
    check(() => assertCandidateVideoIdInputV003(structuredClone(input)));
    const changed = structuredClone(input);
    changed.segments[0].utterances[0].sourceStartMs += 1;
    check(() => assert.throws(() => assertCandidateVideoIdInputV003(changed)));
    const textChanged = structuredClone(input);
    textChanged.segments[0].targetText = '人間の採用理由を混入';
    check(() => assert.throws(() => buildCandidateVideoIdRequestV003(textChanged, 'A')));
    const a = buildCandidateVideoIdRequestV003(input, 'A');
    const b = buildCandidateVideoIdRequestV003(input, 'B', MOCK_FILES_URI);
    check(() => assert.deepEqual(a.body, {...b.body, contents: [{...b.body.contents[0], parts: b.body.contents[0].parts.slice(0, 1)}]}));
    check(() => assert.equal(a.body.contents[0].parts.length, 1));
    check(() => assert.equal(b.body.contents[0].parts.length, 2));
    check(() => assert.deepEqual(b.body.contents[0].parts[1], {fileData: {mimeType: 'video/mp4', fileUri: MOCK_FILES_URI},
      mediaProcessing: 'STATIC', videoMetadata: {fps: 1}, mediaResolution: {level: 'MEDIA_RESOLUTION_HIGH'}}));
    check(() => assert.deepEqual(a.body.generationConfig.responseJsonSchema, b.body.generationConfig.responseJsonSchema));
    check(() => assertCandidateVideoProviderSchemaSupportedSubsetV001(candidateVideoIdSchemaV003(input)));
    const text = (a.body.contents[0].parts[0] as {text: string}).text;
    const payload = JSON.parse(text.slice(CANDIDATE_VIDEO_ID_PROMPT_V003.length + 1));
    check(() => assert.deepEqual(payload.segments.map((s: {targetUtteranceIds: string[]}) => s.targetUtteranceIds), input.segments.map(s => s.targetUtteranceIds)));
    check(() => assert.deepEqual(Object.keys(payload).sort(), ['itemId', 'segmentRelationship', 'segments', 'unmappedCandidateIntervals'].sort()));
    check(() => assert.ok(!/candidateId|fileSha256|sourcePackage|humanApproval|humanReview|addedUnderstanding|direction|previousResponse|conversation|messages|answer/u.test(JSON.stringify(payload))));
    const otherUniqueId = inputs.flatMap(i => i.segments.flatMap(s => s.utterances.map(r => r.utteranceId)))
      .find(id => !input.segments.some(s => s.utterances.some(r => r.utteranceId === id)))!;
    check(() => assert.ok(!text.includes(otherUniqueId)));
    check(() => assert.throws(() => buildCandidateVideoIdRequestV003(input, 'A', MOCK_FILES_URI)));
    check(() => assert.throws(() => buildCandidateVideoIdRequestV003(input, 'B')));
    for (const [index, segment] of input.segments.entries()) {
      const mapping = input.sourceMapping.segments[index];
      for (const row of segment.utterances) for (const endpoint of ['startTimeMs', 'endTimeMs'] as const) {
        // Independent cross multiplication of the PTS relation; no rounded milliseconds or chosen tolerance.
        const c = row.candidateMs[endpoint];
        const s = row.mappedSourceMs[endpoint];
        const cb = input.sourceMapping.candidateTimeBase;
        const sb = input.sourceMapping.sourceTimeBase;
        const candidateOffsetN = BigInt(c.numerator) * BigInt(cb.denominator)
          - BigInt(mapping.candidateStartPts) * BigInt(c.denominator) * 1000n * BigInt(cb.numerator);
        const sourceOffsetN = BigInt(s.numerator) * BigInt(sb.denominator)
          - BigInt(mapping.sourceStartPts) * BigInt(s.denominator) * 1000n * BigInt(sb.numerator);
        check(() => assert.equal(candidateOffsetN * BigInt(s.denominator) * BigInt(sb.numerator)
          * BigInt(mapping.sourceEndPtsExclusive - mapping.sourceStartPts),
        sourceOffsetN * BigInt(c.denominator) * BigInt(cb.numerator)
          * BigInt(mapping.candidateEndPtsExclusive - mapping.candidateStartPts)));
      }
    }
  }
  const edge = inputs[3].segments[0].utterances.find(u => u.utteranceId === 'semantic-utterance-000094')!;
  check(() => assert.deepEqual(edge.mappedSourceMs, {startTimeMs: {numerator: 265015, denominator: 1}, endTimeMs: {numerator: 265016, denominator: 1}}));
  check(() => assert.equal(edge.selectionCoverage, 'outside'));
  check(() => assert.ok(inputs[0].segments[1].unannotatedMappedIntervals.some(g =>
    g.sourceMs.startTimeMs.numerator === 1377918 && g.sourceMs.startTimeMs.denominator === 1
    && g.sourceMs.endTimeMs.numerator === 1412798 && g.sourceMs.endTimeMs.denominator === 1)));
  check(() => assert.equal(inputs[0].unmappedCandidateIntervals.length, 0));
  check(() => assert.deepEqual(inputs[3].unmappedCandidateIntervals, [{
    startTimeMs: {numerator: 50600, denominator: 1}, endTimeMs: {numerator: 151850, denominator: 3}}]));

  const unconfirmed = (input: CandidateVideoIdInputV003): CandidateVideoIdProviderOutputV003 => ({
    schemaVersion: 'candidate-video-understanding-id-provider-output-v003', itemId: input.itemId,
    observations: input.segments.flatMap(segment => CANDIDATE_VIDEO_ID_ROLES_V003.map(role => ({
      role, segmentId: segment.segmentId, status: 'notObserved', description: 'この入力からは確認できない',
      evidenceUtteranceRanges: [], evidenceKinds: [], reactionKind: role === 'reaction' ? 'unknown' : 'notApplicable',
      idLocation: 'segmentOnlyEventUnresolved', unconfirmedPoints: ['判断材料不足'], causalScope: 'notClaimed', causalEvidence: []
    })))
  });
  const observe = (output: CandidateVideoIdProviderOutputV003, role: CandidateVideoIdObservationV003['role'], segmentIndex = 0) => {
    const observation = output.observations[segmentIndex * CANDIDATE_VIDEO_ID_ROLES_V003.length + CANDIDATE_VIDEO_ID_ROLES_V003.indexOf(role)];
    observation.status = 'observed'; observation.description = '元候補の発話内容を文字から確認した';
    observation.evidenceKinds = ['transcript']; observation.idLocation = 'evidenceUtterancesOnly'; observation.unconfirmedPoints = [];
    const id = inputs[3].segments[segmentIndex].targetUtteranceIds[0];
    observation.evidenceUtteranceRanges = [{fromUtteranceId: id, throughUtteranceId: id}];
    return observation;
  };
  const input = inputs[3];
  const empty = unconfirmed(input);
  check(() => assertCandidateVideoIdOutputV003(empty, input, 'A'));
  check(() => assertCandidateVideoIdOutputV003(empty, input, 'B'));
  check(() => assert.equal(empty.observations.find(o => o.role === 'visualCaution')!.status, 'notObserved'));
  const unknownSchema = JSON.stringify(candidateVideoIdSchemaV003(input));
  check(() => assert.ok(!/startTime|endTime|timestamp|offset|frameNumber|cut|selection|quality|condition|eventAbsent|"number"|"integer"/u.test(unknownSchema)));
  const valid = unconfirmed(input);
  observe(valid, 'coreEvent').description = '今年一怖いという紹介を文字から確認した';
  check(() => assertCandidateVideoIdOutputV003(valid, input, 'A'));
  const resolved = resolveCandidateVideoIdEvidenceV003(input, 'A', valid);
  check(() => assert.deepEqual(resolved, resolveCandidateVideoIdEvidenceV003(structuredClone(input), 'A', structuredClone(valid))));
  check(() => assert.equal(resolved.observations[0].evidenceGroups[0].utterances[0].sourceStartMs,
    formalIndex.get(input.segments[0].targetUtteranceIds[0])!.sourceStartMs));
  check(() => assert.ok(resolved.observations.every(o => o.eventPosition === 'unresolved')));
  check(() => assert.deepEqual(Object.keys(resolved).sort(), ['schemaVersion', 'itemId', 'condition', 'scope', 'semanticArtifact', 'observations'].sort()));

  const negativeMutations: Array<(o: CandidateVideoIdProviderOutputV003) => void> = [
    o => {o.itemId = inputs[4].itemId;},
    o => {o.observations[0].segmentId = 'segment-0003';},
    o => {o.observations[0].evidenceUtteranceRanges[0].fromUtteranceId = 'semantic-utterance-999999';},
    o => {o.observations[0].evidenceUtteranceRanges[0].throughUtteranceId = 'speech-67';},
    o => {o.observations[0].evidenceUtteranceRanges[0] = {fromUtteranceId: 'semantic-utterance-003931', throughUtteranceId: 'semantic-utterance-003931'};},
    o => {o.observations[0].evidenceUtteranceRanges[0] = {fromUtteranceId: 'semantic-utterance-001182', throughUtteranceId: 'semantic-utterance-001182'};},
    o => {o.observations[0].evidenceUtteranceRanges[0] = {fromUtteranceId: 'semantic-utterance-000082', throughUtteranceId: 'semantic-utterance-000067'};},
    o => {o.observations[0].evidenceUtteranceRanges.push({...o.observations[0].evidenceUtteranceRanges[0]});},
    o => {o.observations[0].evidenceUtteranceRanges.push({fromUtteranceId: 'semantic-utterance-000060', throughUtteranceId: 'semantic-utterance-000060'});},
    o => {o.observations[0].status = 'eventAbsent' as 'observed';},
    o => {o.observations[0].status = 'notObserved';},
    o => {o.observations[0].evidenceKinds = ['video'];},
    o => {o.observations[0].evidenceKinds = ['audio'];},
    o => {o.observations[0].evidenceKinds = ['transcript', 'transcript'];},
    o => {o.observations[0].reactionKind = 'direct';},
    o => {o.observations[0].idLocation = 'segmentOnlyEventUnresolved';},
    o => {o.observations[0].causalScope = 'withinSegment';},
    o => {o.observations.pop();},
    o => {o.observations.push({...o.observations[0], status: 'notApplicable', evidenceKinds: [], evidenceUtteranceRanges: [], idLocation: 'segmentOnlyEventUnresolved'});},
    o => {Object.assign(o, {startTimeMs: 0});},
    o => {Object.assign(o.observations[0], {endTimeMs: 100});},
    o => {Object.assign(o.observations[0].evidenceUtteranceRanges[0], {time: 100});},
    o => {Object.assign(o, {selection: []});},
    o => {Object.assign(o, {qualityScore: 1});},
    o => {Object.assign(o, {condition: 'A'});},
    o => {o.observations[0].description = '別のsegment-0002が原因だ';},
    o => {o.observations[0].unconfirmedPoints = ['位置は00:02:03'];}
  ];
  for (const mutate of negativeMutations) {
    const invalid = structuredClone(valid); mutate(invalid);
    check(() => assert.throws(() => assertCandidateVideoIdOutputV003(invalid, input, 'A')));
  }
  for (const text of ['00:01:02', '12.5秒', '５秒', '三秒', '1000ms', '12 seconds', '12 s', 'frame 12', 'フレーム12', 'offset=12', 'time:12', '開始:12', '十分後', '10分', '十分時点', '時刻:三分']) {
    const invalid = structuredClone(valid); invalid.observations[0].description = text;
    check(() => assert.throws(() => assertCandidateVideoIdOutputV003(invalid, input, 'B')));
  }
  for (const text of ['十分な導入', '十分に確認できない', '三分割', '10分割', '判断材料が不十分', '導入は十分でしょう']) {
    const ordinary = structuredClone(valid); ordinary.observations[0].description = text;
    check(() => assertCandidateVideoIdOutputV003(ordinary, input, 'A'));
  }
  const direct = unconfirmed(input);
  const reaction = observe(direct, 'reaction', 1);
  reaction.reactionKind = 'direct'; reaction.causalScope = 'withinSegment';
  reaction.causalEvidence = reaction.evidenceUtteranceRanges.map(r => ({...r, segmentId: reaction.segmentId}));
  check(() => assertCandidateVideoIdOutputV003(direct, input, 'A'));
  const crossed = structuredClone(direct);
  crossed.observations[10].causalEvidence[0].segmentId = 'segment-0001';
  check(() => assert.throws(() => assertCandidateVideoIdOutputV003(crossed, input, 'B')));
  const noCausalEvidence = structuredClone(direct); noCausalEvidence.observations[10].causalEvidence = [];
  check(() => assert.throws(() => assertCandidateVideoIdOutputV003(noCausalEvidence, input, 'B')));
  const retrospective = structuredClone(direct);
  retrospective.observations[10].reactionKind = 'retrospective'; retrospective.observations[10].causalScope = 'notClaimed';
  retrospective.observations[10].causalEvidence = [];
  check(() => assertCandidateVideoIdOutputV003(retrospective, input, 'A'));
  retrospective.observations[10].causalScope = 'withinSegment';
  check(() => assert.throws(() => assertCandidateVideoIdOutputV003(retrospective, input, 'B')));
  const silent = unconfirmed(input);
  const silentReaction = observe(silent, 'reaction', 1);
  Object.assign(silentReaction, {description: '無言の表情変化が見えた', evidenceKinds: ['video'], evidenceUtteranceRanges: [],
    reactionKind: 'silent', idLocation: 'segmentOnlyEventUnresolved', unconfirmedPoints: ['発話による位置限定ができない']});
  check(() => assertCandidateVideoIdOutputV003(silent, input, 'B'));
  check(() => assert.throws(() => assertCandidateVideoIdOutputV003(silent, input, 'A')));
  const silentResolved = resolveCandidateVideoIdEvidenceV003(input, 'B', silent).observations[10];
  check(() => assert.deepEqual(silentResolved.evidenceGroups, []));
  check(() => assert.equal(silentResolved.eventPosition, 'unresolved'));
  silentReaction.evidenceUtteranceRanges = [{fromUtteranceId: 'semantic-utterance-003931', throughUtteranceId: 'semantic-utterance-003931'}];
  silentReaction.idLocation = 'evidenceUtterancesOnly';
  check(() => assert.throws(() => assertCandidateVideoIdOutputV003(silent, input, 'B')));
  const disjoint = unconfirmed(inputs[4]);
  const comment = disjoint.observations[10];
  Object.assign(comment, {status: 'observed', description: '後から叫んだと述べている', evidenceKinds: ['transcript'],
    reactionKind: 'retrospective', idLocation: 'evidenceUtterancesOnly', unconfirmedPoints: [],
    evidenceUtteranceRanges: [
      {fromUtteranceId: 'semantic-utterance-010644', throughUtteranceId: 'semantic-utterance-010650'},
      {fromUtteranceId: 'semantic-utterance-010658', throughUtteranceId: 'semantic-utterance-010664'}]});
  const groups = resolveCandidateVideoIdEvidenceV003(inputs[4], 'A', disjoint).observations[10].evidenceGroups;
  check(() => assert.deepEqual(groups.map(g => g.utterances.length), [7, 7]));
  check(() => assert.ok(!groups.flatMap(g => g.utterances).some(r => r.utteranceId === 'semantic-utterance-010651')));
  // A real but semantically unrelated in-segment ID can pass syntax. Do not claim semantic validation.
  const unrelated = structuredClone(valid);
  const unrelatedId = input.segments[0].utterances.find(r => !input.segments[0].targetUtteranceIds.includes(r.utteranceId))!.utteranceId;
  unrelated.observations[0].evidenceUtteranceRanges = [{fromUtteranceId: unrelatedId, throughUtteranceId: unrelatedId}];
  check(() => assertCandidateVideoIdOutputV003(unrelated, input, 'A'));
  check(() => assert.deepEqual(buildCandidateVideoIdRequestV003(input, 'B', MOCK_FILES_URI).body,
    buildCandidateVideoIdRequestV003(input, 'B', MOCK_FILES_URI).body));
  process.stdout.write(JSON.stringify({suite: 'v003-id-reference-calibration-mock', status: 'passed', checks,
    fixedItems: 5, conditions: 10, formalRowsCompared: 1287, exactMappingEndpointsCompared: 2574,
    targetIdAppearances: 286, apiCommunications: 0, retries: 0, repairs: 0, formalArtifactsWritten: 0}) + '\n');

  // task-028: synthetic approvals, references and price bytes; no new filesystem fixture.
  // Separate-process source re-admission is exercised by the transport integration suite.
  {
    let admissionChecks = 0;
    const verify = (fn: () => void) => {fn(); admissionChecks += 1;};
    const digest = (value: unknown) => sha256(canonicalJsonBytesV001(value));
    const changed = <T>(value: T, mutate: (copy: T) => void): T => {
      const copy = structuredClone(value); mutate(copy); return copy;
    };
    const table = buildCandidateVideoIdInputTableV004('synthetic-task-028-core', 'mock', inputs);
    verify(() => assertCandidateVideoIdInputTableV004(JSON.parse(JSON.stringify(table)), 'mock'));
    verify(() => assert.throws(() => assertCandidateVideoIdInputTableV004(table, 'live')));
    verify(() => assert.throws(() => buildCandidateVideoIdInputTableV004(' padded ', 'mock', inputs)));
    verify(() => assert.throws(() => buildCandidateVideoIdInputTableV004('synthetic\nidentity', 'mock', inputs)));
    verify(() => assert.throws(() => assertCandidateVideoIdInputTableV004(changed(table, t => t.inputs.reverse()))));
    verify(() => assert.throws(() => assertCandidateVideoIdInputTableV004(changed(table, t => t.inputs.pop()))));
    verify(() => assert.throws(() => assertCandidateVideoIdInputTableV004(changed(table, t => {
      t.inputs[0].segments[0].utterances[0].text = '合成の差し替え';
    }))));
    verify(() => assert.throws(() => assertCandidateVideoIdInputTableV004(changed(table, t => {
      Object.assign(t.inputs[0], {humanReview: '合成の混入'});
    }))));
    await assert.rejects(verifyCandidateVideoIdInputTableV004(WORKSPACE_ROOT, table, 'live'));
    admissionChecks += 1;
    const plan: CandidateVideoIdExecutionPlanV004 = {
      schemaVersion: 'candidate-video-understanding-id-execution-plan-v004', experimentId: table.experimentId,
      origin: 'mock', inputTableSha256: digest(table), targets: structuredClone([...CANDIDATE_VIDEO_ID_FIXED_TARGETS_V004]),
      files: inputs.map((item, index) => ({itemId: item.itemId, name: 'files/synthetic-task028-' + index,
        uri: 'https://generativelanguage.googleapis.com/v1beta/files/synthetic-task028-' + index,
        expirationTime: '2026-12-31T00:00:00.000Z', mimeType: 'video/mp4', byteLength: item.mediaByteLength,
        mediaSha256: item.bindings.explorationVideo.fileSha256})),
      filesSourceBinding: {path: 'synthetic-task-028/files-reference.json', fileSha256: 'a'.repeat(64)},
      timeouts: {...CANDIDATE_VIDEO_ID_TIMEOUTS_V004}, limits: {...CANDIDATE_VIDEO_ID_LIMITS_V004},
      retry: 0, repair: 0, reupload: 0, extraPoll: 0
    };
    verify(() => assertCandidateVideoIdExecutionPlanV004(plan, table));
    verify(() => assert.deepEqual(Object.values(CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004), [
      'input-id-table-v001.json', 'execution-plan-v001.json', 'execution-record-v001.jsonl', 'paired-comparison-v001.json'
    ].map(name => 'evals/clip_composition/outputs/work-candidate-video-understanding-recalibration-v001/' + name)));
    const badPlans: Array<(p: CandidateVideoIdExecutionPlanV004) => void> = [
      p => {p.experimentId = 'another-synthetic-experiment';},
      p => {p.origin = 'live';},
      p => {p.inputTableSha256 = 'b'.repeat(64);},
      p => {p.targets.pop();},
      p => {p.targets[1] = {...p.targets[0]};},
      p => {p.targets[0].itemId = 'item-0006';},
      p => {Object.assign(p.targets[0], {condition: 'C'});},
      p => {Object.assign(p.timeouts, {metadataGetMs: 30001});},
      p => {Object.assign(p.timeouts, {countTokensMs: 180001});},
      p => {Object.assign(p.timeouts, {inferenceMs: 600001});},
      p => {Object.assign(p.timeouts, {extraPollMs: 0});},
      p => {Object.assign(p.limits, {total: 26});},
      p => {Object.assign(p.limits, {perConditionInference: 2});},
      p => {Object.assign(p, {retry: 1});},
      p => {Object.assign(p, {repair: 1});},
      p => {Object.assign(p, {reupload: 1});},
      p => {Object.assign(p, {extraPoll: 1});},
      p => {p.files.reverse();},
      p => {p.files.pop();},
      p => {p.files[0].byteLength += 1;},
      p => {p.files[0].mediaSha256 = p.files[1].mediaSha256;},
      p => {p.files[0].name = p.files[1].name; p.files[0].uri = p.files[1].uri;},
      p => {p.files[0].uri += '?key=synthetic-not-a-key';},
      p => {p.files[0].uri = p.files[0].uri.replace('https://', 'https://synthetic@');},
      p => {p.files[0].expirationTime = '2026-02-30T00:00:00.000Z';},
      p => {p.filesSourceBinding.path = '../synthetic.json';},
      p => {p.filesSourceBinding.fileSha256 = 'missing';},
      p => {Object.assign(p, {humanEvaluation: '合成の混入'});}
    ];
    for (const mutate of badPlans) verify(() => assert.throws(() => assertCandidateVideoIdExecutionPlanV004(changed(plan, mutate), table)));
    const requests = buildCandidateVideoIdFixedRequestsV004(table, plan);
    verify(() => assertCandidateVideoIdFixedRequestsV004(requests, table, plan));
    verify(() => assert.deepEqual(requests.map(({itemId, condition}) => ({itemId, condition})), plan.targets));
    for (const item of inputs) {
      const a = requests.find(r => r.itemId === item.itemId && r.condition === 'A')!;
      const b = requests.find(r => r.itemId === item.itemId && r.condition === 'B')!;
      verify(() => assert.deepEqual(a.request, buildCandidateVideoIdRequestV003(item, 'A')));
      verify(() => assert.deepEqual(b.request, buildCandidateVideoIdRequestV003(item, 'B', plan.files.find(f => f.itemId === item.itemId)!.uri)));
      verify(() => assert.deepEqual(a.request.body.contents[0].parts, b.request.body.contents[0].parts.slice(0, 1)));
      verify(() => assert.equal(a.request.body.contents[0].parts.length, 1));
      verify(() => assert.equal(b.request.body.contents[0].parts.length, 2));
      verify(() => assert.equal(a.exactRequestSha256, digest({method: a.request.method, url: a.request.url, body: a.request.body})));
      verify(() => assert.equal(b.exactRequestSha256, digest({method: b.request.method, url: b.request.url, body: b.request.body})));
    }
    verify(() => assert.throws(() => assertCandidateVideoIdFixedRequestsV004(requests.slice(0, 1), table, plan)));
    verify(() => assert.throws(() => assertCandidateVideoIdFixedRequestsV004(changed(requests, r => {
      Object.assign(r[0].request.body, {humanReview: '合成の混入'});
      r[0].exactRequestSha256 = digest({method: r[0].request.method, url: r[0].request.url, body: r[0].request.body});
    }), table, plan)));
    const reversed = changed(plan, p => p.targets.reverse());
    verify(() => assertCandidateVideoIdExecutionPlanV004(reversed, table));
    verify(() => assert.deepEqual(buildCandidateVideoIdFixedRequestsV004(table, reversed).map(r => [r.itemId, r.condition]),
      [...requests].reverse().map(r => [r.itemId, r.condition])));

    // These rates and the budget are synthetic test values, not an approval for real expenditure.
    const priceBytes = canonicalJsonBytesV001({schemaVersion: 'candidate-video-understanding-provider-spec-price-snapshot-v001',
      model: 'gemini-3.8-flash', checkedOn: '2026-09-05', synthetic: true,
      standardPrice: {inputNanoUsdPerToken: 1, outputIncludingThinkingNanoUsdPerToken: 2, validThrough: '2026-12-31'}});
    const cost: CandidateVideoIdCostConditionsV004 = {maximumNanoUsd: '1000000000',
      priceReference: {path: 'synthetic-task-028/price.json', fileSha256: sha256(priceBytes)},
      inputNanoUsdPerToken: 1, outputIncludingThinkingNanoUsdPerToken: 2, priceValidThrough: '2026-12-31',
      acceptEstimateNotGuaranteedCap: true};
    verify(() => assertCandidateVideoIdPriceSnapshotV004(priceBytes, cost));
    for (const budget of ['', '-1', '01', '1.5', '1e9', ' 1']) {
      verify(() => assert.throws(() => assertCandidateVideoIdCostConditionsV004({...cost, maximumNanoUsd: budget})));
    }
    verify(() => assert.throws(() => assertCandidateVideoIdCostConditionsV004({...cost, priceValidThrough: '2026-02-30'})));
    verify(() => assert.throws(() => assertCandidateVideoIdCostConditionsV004({...cost, inputNanoUsdPerToken: -1})));
    verify(() => assert.throws(() => assertCandidateVideoIdCostConditionsV004({...cost, outputIncludingThinkingNanoUsdPerToken: 0.5})));
    verify(() => assert.throws(() => assertCandidateVideoIdCostConditionsV004({...cost, acceptUnverifiedPreparationBilling: false})));
    verify(() => assert.throws(() => assertCandidateVideoIdCostConditionsV004({...cost, acceptEstimateNotGuaranteedCap: false})));
    verify(() => assert.throws(() => assertCandidateVideoIdPriceSnapshotV004(Buffer.from('{}'), cost)));
    verify(() => assert.throws(() => assertCandidateVideoIdPriceSnapshotV004(priceBytes, {...cost, inputNanoUsdPerToken: 2})));
    for (const replacement of [{model: 'different-synthetic-model'}, {checkedOn: '2026-02-30'}, {checkedOn: '2027-01-01'}]) {
      const invalidPrice = canonicalJsonBytesV001({...JSON.parse(priceBytes.toString('utf8')), ...replacement});
      verify(() => assert.throws(() => assertCandidateVideoIdPriceSnapshotV004(invalidPrice, {
        ...cost, priceReference: {...cost.priceReference, fileSha256: sha256(invalidPrice)}
      })));
    }
    const preparePrice = syntheticTask029PreparationPrice(table.experimentId, 'synthetic-prepare-approval-not-live');
    const prepare: CandidateVideoIdPrepareApprovalV004 = {
      schemaVersion: 'candidate-video-understanding-id-approval-v004', experimentId: table.experimentId,
      origin: 'mock', approvedBy: 'mock', phase: 'prepare', planSha256: digest(plan), inputTableSha256: digest(table),
      approvalReference: 'synthetic-prepare-approval-not-live', timeouts: {...plan.timeouts}, costConditions: preparePrice.cost,
      targets: structuredClone(plan.targets), limits: {metadataGet: 5, countTokens: 10, inference: 0, perConditionInference: 0, total: 15}
    };
    verify(() => assertCandidateVideoIdPrepareApprovalV004(prepare, table, plan));
    const badPrepare: Array<(a: CandidateVideoIdPrepareApprovalV004) => void> = [
      a => {Object.assign(a, {phase: 'inference'});}, a => {a.approvedBy = 'kawafmm';},
      a => {a.origin = 'live';}, a => {a.experimentId += '-other';}, a => {a.planSha256 = 'c'.repeat(64);},
      a => {a.inputTableSha256 = 'd'.repeat(64);}, a => {a.approvalReference = '';},
      a => {a.targets.pop();}, a => {a.targets.reverse();},
      a => {Object.assign(a.limits, {inference: 1, total: 16});},
      a => {Object.assign(a.timeouts, {inferenceMs: 1});},
      a => {Object.assign(a, {costConditions: undefined});},
      a => {Object.assign(a, {inferenceAutoStart: true});}
    ];
    for (const mutate of badPrepare) verify(() => assert.throws(() => assertCandidateVideoIdPrepareApprovalV004(changed(prepare, mutate), table, plan)));
    const recordSha = 'e'.repeat(64);
    const inference: CandidateVideoIdInferenceApprovalV004 = {
      ...prepare, phase: 'inference', costConditions: cost, expectedRecordSha256: recordSha,
      approvalReference: 'synthetic-separate-inference-approval',
      executionPolicy: {...CANDIDATE_VIDEO_ID_INFERENCE_POLICY_V004},
      targets: [requests[0], requests[3], requests[8]].map(({itemId, condition, exactRequestSha256}) => ({itemId, condition, exactRequestSha256})),
      limits: {metadataGet: 0, countTokens: 0, inference: 3, perConditionInference: 1, total: 3}
    };
    verify(() => assertCandidateVideoIdInferenceApprovalV004(inference, table, plan, requests, recordSha));
    for (const selected of [requests.slice(0, 1), requests, requests.slice(6)]) {
      verify(() => assertCandidateVideoIdInferenceApprovalV004({...inference,
        targets: selected.map(({itemId, condition, exactRequestSha256}) => ({itemId, condition, exactRequestSha256})),
        limits: {...inference.limits, inference: selected.length, total: selected.length}}, table, plan, requests, recordSha));
    }
    verify(() => assert.throws(() => assertCandidateVideoIdInferenceApprovalV004(undefined, table, plan, requests, recordSha)));
    verify(() => assert.throws(() => assertCandidateVideoIdInferenceApprovalV004(prepare, table, plan, requests, recordSha)));
    verify(() => assert.throws(() => assertCandidateVideoIdInferenceApprovalV004(inference, table, plan, requests.slice(0, 9), recordSha)));
    const badInference: Array<(a: CandidateVideoIdInferenceApprovalV004) => void> = [
      a => {a.targets = [];}, a => {a.targets.reverse();}, a => {a.targets[1] = {...a.targets[0]};},
      a => {a.targets[0].itemId = 'item-0006';}, a => {a.targets[0].exactRequestSha256 = 'f'.repeat(64);},
      a => {a.expectedRecordSha256 = 'f'.repeat(64);}, a => {Object.assign(a.targets[0], {request: requests[0].request});},
      a => {Object.assign(a.limits, {metadataGet: 1});}, a => {Object.assign(a.limits, {countTokens: 1});},
      a => {Object.assign(a.limits, {perConditionInference: 2});}, a => {a.limits.inference = 10; a.limits.total = 10;}
    ];
    for (const mutate of badInference) verify(() => assert.throws(() => assertCandidateVideoIdInferenceApprovalV004(changed(inference, mutate), table, plan, requests, recordSha)));
    const comparisonSha = 'f'.repeat(64);
    const comparison: CandidateVideoIdComparisonApprovalV004 = {
      schemaVersion: 'candidate-video-understanding-id-comparison-approval-v004', experimentId: table.experimentId,
      origin: 'mock', approvedBy: 'mock', approvalReference: 'synthetic-separate-comparison-approval',
      planSha256: digest(plan), inputTableSha256: digest(table), expectedRecordSha256: recordSha, comparisonSha256: comparisonSha
    };
    verify(() => assertCandidateVideoIdComparisonApprovalV004(comparison, table, plan, recordSha, comparisonSha));
    verify(() => assert.throws(() => assertCandidateVideoIdComparisonApprovalV004(undefined, table, plan, recordSha, comparisonSha)));
    verify(() => assert.throws(() => assertCandidateVideoIdComparisonApprovalV004({...comparison, expectedRecordSha256: 'a'.repeat(64)}, table, plan, recordSha, comparisonSha)));
    verify(() => assert.throws(() => assertCandidateVideoIdComparisonApprovalV004({...comparison, comparisonSha256: 'a'.repeat(64)}, table, plan, recordSha, comparisonSha)));
    verify(() => assert.throws(() => assertCandidateVideoIdComparisonApprovalV004({...comparison, origin: 'live', approvedBy: 'kawafmm'}, table, plan, recordSha, comparisonSha)));
    process.stdout.write(JSON.stringify({suite: 'v004-id-plan-approval-storage-contract-mock', status: 'passed', checks: admissionChecks,
      syntheticApprovals: true, providerRequestContractChanged: false, newFixturePaths: 0,
      apiCommunications: 0, formalArtifactsWritten: 0}) + '\n');
  }
}
