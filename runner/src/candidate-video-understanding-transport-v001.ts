import {createHash} from 'node:crypto';
import {request as httpsRequest} from 'node:https';
import {readFile, open, access, mkdir, lstat, realpath} from 'node:fs/promises';
import {createReadStream, constants as fsConstants} from 'node:fs';
import {resolve, dirname, basename, sep} from 'node:path';
import {tmpdir} from 'node:os';
import {
  assertCandidateVideoJobV002, assertCandidateVideoOutputV002,
  buildCandidateVideoRequestTemplateV002, canonicalJsonBytesV001,
  candidateVideoDigestV002, deriveCandidateVideoReviewV002,
  projectCandidateIntervalV002,
  assertCandidateVideoIdInputV003, assertCandidateVideoIdOutputV003,
  CandidateVideoUnderstandingContractErrorV001,
  buildCandidateVideoIdRequestV003, resolveCandidateVideoIdEvidenceV003,
  type CandidateVideoJobV002, type CandidateVideoOutputV002,
  type CandidateVideoIdInputV003, type CandidateVideoIdConditionV003,
  type CandidateVideoIdProviderOutputV003,
  type CandidateVideoIdRequestV003
} from './candidate-video-understanding-v001.js';
import {
  CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004,
  CANDIDATE_VIDEO_ID_TIMEOUTS_V004, CANDIDATE_VIDEO_ID_LIMITS_V004, CANDIDATE_VIDEO_ID_FIXED_TARGETS_V004,
  buildCandidateVideoIdInputTableV004, verifyCandidateVideoIdInputTableV004,
  loadCandidateVideoIdInputsV003, assertCandidateVideoIdPriceSnapshotV004,
  assertCandidateVideoIdPrepareCostConditionsV004, assertCandidateVideoIdPreparePriceSnapshotV004,
  assertCandidateVideoIdInputTableV004, assertCandidateVideoIdExecutionPlanV004,
  buildCandidateVideoIdFixedRequestsV004, assertCandidateVideoIdPrepareApprovalV004,
  assertCandidateVideoIdInferenceApprovalV004, assertCandidateVideoIdComparisonApprovalV004,
  assertCandidateVideoIdInferenceCostContinuationV004,
  createCandidateVideoIdCacheBillingReviewV004, assertCandidateVideoIdCacheBillingReviewV004,
  deriveCandidateVideoIdCacheUsageV004, type CandidateVideoIdCacheBillingReviewV004,
  createCandidateVideoIdUsageScalarReviewV004, assertCandidateVideoIdUsageScalarReviewV004,
  deriveCandidateVideoIdScalarUsageV004, type CandidateVideoIdUsageScalarReviewV004,
  type CandidateVideoIdInputTableV004, type CandidateVideoIdExecutionPlanV004,
  type CandidateVideoIdPrepareApprovalV004, type CandidateVideoIdInferenceApprovalV004,
  type CandidateVideoIdComparisonApprovalV004, type CandidateVideoIdCostConditionsV004,
  type CandidateVideoIdPriceConditionsV004, type CandidateVideoIdPrepareCostConditionsV004,
  type CandidateVideoIdFileReferenceV004, type CandidateVideoIdFixedRequestV004
} from './candidate-video-understanding-v001.js';
import {
  CANDIDATE_VIDEO_ID_PROFILE_V005, buildCandidateVideoIdFixedRequestsV005,
  assertCandidateVideoIdFixedRequestsV005, assertCandidateVideoIdPriceReviewV005,
  type CandidateVideoIdFixedRequestV005, type CandidateVideoIdPriceReviewV005
} from './candidate-video-understanding-v001.js';

const HOST = 'generativelanguage.googleapis.com';
const ORIGIN = `https://${HOST}`;
const MODEL = 'gemini-3.8-flash';
export const HTTP_OPERATIONS = ['upload-start', 'upload-finalize', 'metadata-get', 'count-tokens', 'inference'] as const;
type Operation = typeof HTTP_OPERATIONS[number];
type Failure = 'local-preflight-failure' | 'upload-failure' | 'metadata-not-ready'
  | 'count-tokens-failure' | 'inference-failure' | 'provider-schema-failure'
  | 'local-validation-failure' | 'projection-failure';
export type HttpRequest = {method: 'POST' | 'GET'; url: string; headers: Record<string, string>; body: Buffer};
export type HttpResponse = {status: number; headers: Record<string, string>; body: Buffer};
export type HttpPort = {mode: 'mock' | 'live'; exchange(request: HttpRequest): Promise<HttpResponse>};
export type JournalEvent = {
  ordinal: number; previousSha256: string | null; itemId: string; operation: Operation | 'preflight';
  phase: 'intent' | 'response' | 'failure'; timestamp: string; detail: unknown; sha256: string;
};
// The future caller must durably append the intent before resolving this sink.
// No CLI, workflow wiring, environment lookup, or network is run at module import.
export type JournalSink = (event: Readonly<JournalEvent>) => Promise<void>;
export const byteSha = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const json = canonicalJsonBytesV001;
const same = (a: unknown, b: unknown): boolean => candidateVideoDigestV002(a) === candidateVideoDigestV002(b);
function check(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(label);
}
function object(value: unknown): Record<string, any> {
  check(value && typeof value === 'object' && !Array.isArray(value), 'invalid-object');
  return value as Record<string, any>;
}
function integer(value: unknown): asserts value is number {
  check(Number.isSafeInteger(value) && (value as number) >= 0, 'invalid-token-count');
}
function safeUrl(value: string, kind: 'file' | 'session' | 'endpoint'): URL {
  const u = new URL(value);
  check(u.protocol === 'https:' && u.hostname === HOST && !u.port && !u.username && !u.password && !u.hash,
    'untrusted-provider-url');
  if (kind === 'file') check(!u.search && /^\/v1beta\/files\/[a-zA-Z0-9_-]+$/u.test(u.pathname), 'invalid-file-uri');
  if (kind === 'session') check(u.pathname.startsWith('/upload/'), 'invalid-upload-session');
  return u;
}

export function assertProviderRequestAllowlist(job: CandidateVideoJobV002, body: unknown, fileUri: string | null): void {
  const expected = buildCandidateVideoRequestTemplateV002(job).body;
  if (fileUri !== null) safeUrl(fileUri, 'file');
  expected.contents[0].parts[0].fileData!.fileUri = fileUri;
  check(same(expected, body), 'provider-input-allowlist-violation');
}

export function buildExactRequest(job: CandidateVideoJobV002, fileUri: string) {
  safeUrl(fileUri, 'file');
  const template = buildCandidateVideoRequestTemplateV002(job);
  const body = structuredClone(template.body);
  body.contents[0].parts[0].fileData!.fileUri = fileUri;
  assertProviderRequestAllowlist(job, body, fileUri);
  const exact = {method: 'POST' as const, url: template.url, body};
  return {exact, sha256: candidateVideoDigestV002(exact), bodySha256: byteSha(json(body)),
    countTokensBody: {generateContentRequest: {model: `models/${MODEL}`, ...body}},
    countTokensDifference: 'Same complete generateContent body nested in generateContentRequest; nested model required; endpoint differs.'};
}

export function estimateUsageCost(usage: {input: number; output: number; thinking: number}) {
  Object.values(usage).forEach(integer);
  const inputNanoUsd = BigInt(usage.input) * 750n;
  const outputIncludingThinkingNanoUsd = (BigInt(usage.output) + BigInt(usage.thinking)) * 3750n;
  return {kind: 'standard-list-price-estimate-not-invoice', inputNanoUsd: inputNanoUsd.toString(),
    outputIncludingThinkingNanoUsd: outputIncludingThinkingNanoUsd.toString(),
    totalNanoUsd: (inputNanoUsd + outputIncludingThinkingNanoUsd).toString(),
    priceSnapshotDate: '2026-09-05', priceValidThrough: '2026-12-31', hardCostCap: false};
}

function parseInferencePayload(raw: Buffer, job: CandidateVideoJobV002, exactRequestSha256: string) {
  let envelope: Record<string, any>;
  try { envelope = object(JSON.parse(raw.toString('utf8'))); }
  catch { throw new Error('provider-schema-failure'); }
  check(envelope.modelVersion === MODEL, 'provider-schema-failure');
  check(Array.isArray(envelope.candidates) && envelope.candidates.length === 1, 'provider-schema-failure');
  const candidate = object(envelope.candidates[0]);
  check(candidate.finishReason === 'STOP' && candidate.content?.role === 'model', 'provider-schema-failure');
  const parts = candidate.content.parts;
  check(Array.isArray(parts) && parts.length > 0, 'provider-schema-failure');
  const visible: string[] = [];
  for (const part of parts) {
    check(part && typeof part.text === 'string' && (part.thought === undefined || typeof part.thought === 'boolean'),
      'provider-schema-failure');
    check(Object.keys(part).every(k => ['text', 'thought', 'thoughtSignature'].includes(k)), 'provider-schema-failure');
    if (!part.thought) visible.push(part.text);
  }
  let output: unknown;
  try { output = JSON.parse(visible.join('')); }
  catch { throw new Error('provider-schema-failure'); }
  try { assertCandidateVideoOutputV002(output, job); }
  catch { throw new Error('local-validation-failure'); }
  const u = object(envelope.usageMetadata);
  [u.promptTokenCount, u.candidatesTokenCount, u.thoughtsTokenCount, u.totalTokenCount].forEach(integer);
  check(u.totalTokenCount === u.promptTokenCount + u.candidatesTokenCount + u.thoughtsTokenCount,
    'provider-schema-failure');
  check(u.cachedContentTokenCount === undefined || u.cachedContentTokenCount === 0, 'provider-schema-failure');
  check(u.toolUsePromptTokenCount === undefined || u.toolUsePromptTokenCount === 0, 'provider-schema-failure');
  check(envelope.responseId === undefined || (typeof envelope.responseId === 'string' && envelope.responseId.length > 0),
    'provider-schema-failure');
  let review;
  try { review = deriveCandidateVideoReviewV002(job, output); }
  catch { throw new Error('projection-failure'); }
  const usage = {input: u.promptTokenCount as number, output: u.candidatesTokenCount as number, thinking: u.thoughtsTokenCount as number};
  return {schemaVersion: 'candidate-video-understanding-result-v002', classification: 'calibration',
    itemId: job.itemId, jobSha256: candidateVideoDigestV002(job), exactRequestSha256,
    rawResponseSha256: byteSha(raw), providerResponseId: envelope.responseId ?? null,
    model: MODEL, completionStatus: 'completed', status: output.status, observation: output,
    sourceMappingBinding: job.bindings.mapping, review, usage, cost: estimateUsageCost(usage),
    adoptionDecisionPermitted: false};
}

export function parseInference(raw: Buffer, job: CandidateVideoJobV002, exactRequestSha256: string) {
  try { return parseInferencePayload(raw, job, exactRequestSha256); }
  catch (error) {
    if (error instanceof Error && ['local-validation-failure', 'projection-failure'].includes(error.message)) throw error;
    throw new Error('provider-schema-failure');
  }
}

/** Direct REST only: no redirect handling, polling, retries, repair, or key lookup. */
export function createDirectRestPort(approval: {approvedBy: 'kawafmm'; approvalReference: string;
  phase: 'upload-and-count' | 'inference'; manifestSha256: string; timeoutMs: number}, apiKey: string): HttpPort {
  check(approval.approvedBy === 'kawafmm' && approval.approvalReference.length > 0
    && /^[a-f0-9]{64}$/u.test(approval.manifestSha256) && Number.isSafeInteger(approval.timeoutMs)
    && approval.timeoutMs > 0 && apiKey.length > 0, 'live-authorization-missing');
  return {mode: 'live', async exchange(input) {
    const u = safeUrl(input.url, input.url.includes('/upload/') ? 'session' : 'endpoint');
    const inference = u.pathname.endsWith(':generateContent');
    check((approval.phase === 'inference') === inference, 'wrong-approval-phase');
    const headers = {...input.headers};
    if (!('X-Goog-Upload-Offset' in headers)) headers['x-goog-api-key'] = apiKey;
    return wallClockDeadline(approval.timeoutMs, signal => new Promise<HttpResponse>((resolveResponse, reject) => {
      const req = httpsRequest(u, {method: input.method, headers, signal}, response => {
        const chunks: Buffer[] = [];
        response.on('data', b => chunks.push(Buffer.from(b)));
        response.on('error', () => reject(new Error('send-outcome-unknown')));
        response.on('aborted', () => reject(new Error('send-outcome-unknown')));
        response.on('end', () => resolveResponse({status: response.statusCode ?? 0,
          headers: Object.fromEntries(Object.entries(response.headers).map(([k, v]) => [k.toLowerCase(), String(v ?? '')])),
          body: Buffer.concat(chunks)}));
      });
      req.on('error', () => reject(new Error('send-outcome-unknown')));
      req.end(input.body);
    }));
  }};
}

type Prepared = {job: CandidateVideoJobV002; fileUri: string; name: string;
  exact: ReturnType<typeof buildExactRequest>; inputTokens: number; origin: 'mock' | 'live'};

export class CandidateVideoTransport {
  #events: JournalEvent[] = [];
  #counts = Object.fromEntries(HTTP_OPERATIONS.map(k => [k, 0])) as Record<Operation, number>;
  #started = new Set<string>();
  #inferred = new Set<string>();
  #prepared = new Map<string, Prepared>();
  #stopped = false;
  #busy = false;
  #secrets = new Set<string>();
  constructor(private port: HttpPort, private sink: JournalSink, private clock: () => string) {}
  get snapshot() { return structuredClone({mode: this.port.mode, stopped: this.#stopped,
    counts: this.#counts, events: this.#events, retry: 0, repair: 0,
    formallyReady: false, preparedCount: this.#prepared.size}); }
  private async event(itemId: string, operation: JournalEvent['operation'], phase: JournalEvent['phase'], detail: unknown) {
    const content = {ordinal: this.#events.length + 1, previousSha256: this.#events.at(-1)?.sha256 ?? null,
      itemId, operation, phase, timestamp: this.clock(), detail};
    const event = {...content, sha256: candidateVideoDigestV002(content)};
    this.#events.push(event);
    try { await this.sink(structuredClone(event)); }
    catch { this.#stopped = true; throw new Error('journal-persistence-failure'); }
  }
  private safeResponse(raw: Buffer): boolean {
    const text = raw.toString('utf8');
    return ![...this.#secrets].some(s => text.includes(s))
      && !/AIza[\w-]{20,}|authorization\s*[":=]|x-goog-api-key|upload_id=|upload-session/iu.test(text);
  }
  private async send(itemId: string, operation: Operation, request: HttpRequest) {
    check(!this.#stopped && this.#counts[operation] < 5
      && Object.values(this.#counts).reduce((a, b) => a + b, 0) < 25, 'http-limit-or-terminal-stop');
    // Session target is intentionally NOT persisted, including as a path or query.
    const safeRequest = {method: request.method,
      target: operation === 'upload-finalize' ? 'memory-only-upload-session' : request.url,
      headers: request.headers, bodySha256: byteSha(request.body), bodyByteLength: request.body.length,
      bodyBase64: operation === 'upload-finalize' ? null : request.body.toString('base64')};
    this.#counts[operation]++;
    await this.event(itemId, operation, 'intent', safeRequest);
    let response: HttpResponse;
    try { response = await this.port.exchange(request); }
    catch { throw new Error('send-outcome-unknown-no-retry'); }
    // Register even a rejected session before inspecting the response body: a server
    // could echo that same secret there. Its header is never copied to the journal.
    const returnedSession = response.headers['x-goog-upload-url'];
    if (returnedSession) this.#secrets.add(returnedSession);
    const rawSafe = this.safeResponse(response.body);
    await this.event(itemId, operation, 'response', {status: response.status,
      rawResponseSha256: byteSha(response.body), rawResponseByteLength: response.body.length,
      rawResponseBase64: rawSafe ? response.body.toString('base64') : null,
      rawOmissionReason: rawSafe ? null : 'secret-like-response-rejected',
      headerPolicy: 'upload-session-and-all-provider-headers-omitted'});
    check(rawSafe, 'secret-like-response-rejected');
    check(response.status >= 200 && response.status < 300, 'http-failure-no-redirect-or-retry');
    return response;
  }
  private async fail(itemId: string, operation: JournalEvent['operation'], category: Failure) {
    this.#stopped = true;
    await this.event(itemId, operation, 'failure', {category, retry: 0, repair: 0,
      reasonPolicy: 'untrusted-exception-text-never-persisted'});
  }
  async prepare(jobInput: CandidateVideoJobV002, mediaInput: Buffer) {
    check(!this.#stopped && !this.#busy, 'terminal-stop-or-concurrent-call');
    this.#busy = true;
    let operation: JournalEvent['operation'] = 'preflight';
    let itemId = 'unbound';
    try {
      const job = structuredClone(jobInput);
      assertCandidateVideoJobV002(job);
      itemId = job.itemId;
      check(!this.#started.has(itemId), 'retry-forbidden');
      this.#started.add(itemId);
      const media = Buffer.from(mediaInput);
      check(media.length > 0 && byteSha(media) === job.bindings.explorationVideo.fileSha256, 'media-sha-mismatch');
      const template = buildCandidateVideoRequestTemplateV002(job);
      assertProviderRequestAllowlist(job, template.body, null);
      operation = 'upload-start';
      const start = await this.send(itemId, operation, {method: 'POST', url: `${ORIGIN}/upload/v1beta/files`,
        headers: {'Content-Type': 'application/json', 'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start', 'X-Goog-Upload-Header-Content-Length': String(media.length),
          'X-Goog-Upload-Header-Content-Type': 'video/mp4'},
        body: json({file: {display_name: itemId}})});
      const session = start.headers['x-goog-upload-url'];
      check(typeof session === 'string', 'missing-upload-session');
      safeUrl(session, 'session');
      this.#secrets.add(session);
      operation = 'upload-finalize';
      const upload = await this.send(itemId, operation, {method: 'POST', url: session,
        headers: {'Content-Type': 'video/mp4', 'Content-Length': String(media.length),
          'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize'}, body: media});
      const uploaded = object(object(JSON.parse(upload.body.toString('utf8'))).file);
      check(typeof uploaded.name === 'string' && /^files\/[a-zA-Z0-9_-]+$/u.test(uploaded.name), 'bad-file-name');
      operation = 'metadata-get';
      const metadata = await this.send(itemId, operation, {method: 'GET', url: `${ORIGIN}/v1beta/${uploaded.name}`,
        headers: {}, body: Buffer.alloc(0)});
      const file = object(JSON.parse(metadata.body.toString('utf8')));
      check(file.name === uploaded.name && file.uri === `${ORIGIN}/v1beta/${file.name}`, 'file-uri-mismatch');
      check(file.displayName === itemId && file.mimeType === 'video/mp4' && file.sizeBytes === String(media.length)
        && file.sha256Hash === Buffer.from(job.bindings.explorationVideo.fileSha256, 'hex').toString('base64'), 'file-sha-or-metadata-mismatch');
      check(file.state === 'ACTIVE', 'metadata-not-ready');
      check(![...this.#prepared.values()].some(p => p.fileUri === file.uri), 'file-uri-reuse');
      const exact = buildExactRequest(job, file.uri);
      operation = 'count-tokens';
      const count = await this.send(itemId, operation, {method: 'POST',
        url: `${ORIGIN}/v1beta/models/${MODEL}:countTokens`, headers: {'Content-Type': 'application/json'},
        body: json(exact.countTokensBody)});
      const tokenResponse = object(JSON.parse(count.body.toString('utf8')));
      integer(tokenResponse.totalTokens);
      check(tokenResponse.totalTokens > 0, 'empty-count');
      const prepared: Prepared = {job, fileUri: file.uri, name: file.name, exact,
        inputTokens: tokenResponse.totalTokens, origin: this.port.mode};
      this.#prepared.set(itemId, prepared);
      return {itemId, origin: prepared.origin, status: prepared.origin === 'mock' ? 'mock-only-not-ready' : 'measured-awaiting-inference-approval',
        exactRequest: exact.exact, exactRequestSha256: prepared.origin === 'live' ? exact.sha256 : null,
        mockExactRequestSha256: prepared.origin === 'mock' ? exact.sha256 : null,
        inputTokens: prepared.inputTokens, inferenceAuthorized: false};
    } catch {
      const category: Failure = operation === 'preflight' ? 'local-preflight-failure'
        : operation === 'metadata-get' ? 'metadata-not-ready' : operation === 'count-tokens' ? 'count-tokens-failure' : 'upload-failure';
      await this.fail(itemId, operation, category);
      throw new Error(category);
    } finally { this.#busy = false; }
  }
  /** The live caller swaps in a separately authorized inference-only REST port. */
  async inferAll(approval: {approvedBy: 'kawafmm' | 'mock'; exactRequestSha256s: string[]}, inferencePort?: HttpPort) {
    check(!this.#stopped && !this.#busy, 'terminal-stop-or-concurrent-call');
    this.#busy = true;
    let itemId = 'unbound';
    try {
      check(this.#prepared.size === 5 && this.#inferred.size === 0, 'all-five-counts-required-no-retry');
      const prepared = [...this.#prepared.values()];
      check(same(approval.exactRequestSha256s, prepared.map(p => p.exact.sha256)), 'exact-request-approval-mismatch');
      check(approval.approvedBy === (this.port.mode === 'mock' ? 'mock' : 'kawafmm'), 'inference-not-authorized');
      if (this.port.mode === 'live') check(inferencePort?.mode === 'live', 'separate-live-inference-port-required');
      if (inferencePort) { check(inferencePort.mode === this.port.mode, 'mock-live-mix'); this.port = inferencePort; }
      const results = [];
      for (const p of prepared) {
        itemId = p.job.itemId;
        this.#inferred.add(itemId);
        assertProviderRequestAllowlist(p.job, p.exact.exact.body, p.fileUri);
        const r = await this.send(itemId, 'inference', {method: 'POST', url: p.exact.exact.url,
          headers: {'Content-Type': 'application/json'}, body: json(p.exact.exact.body)});
        const result = parseInference(r.body, p.job, p.exact.sha256);
        results.push({origin: this.port.mode, result});
      }
      return results;
    } catch (error) {
      const categories: Failure[] = ['provider-schema-failure', 'local-validation-failure', 'projection-failure'];
      const category = error instanceof Error && categories.includes(error.message as Failure) ? error.message as Failure : 'inference-failure';
      await this.fail(itemId, 'inference', category);
      throw new Error(category);
    } finally { this.#busy = false; }
  }
}

export function assertJournal(events: JournalEvent[]) {
  let previous: string | null = null;
  let terminal = false;
  const nextOperation = new Map<string, number>();
  const counts = Object.fromEntries(HTTP_OPERATIONS.map(op => [op, 0])) as Record<Operation, number>;
  events.forEach((event, index) => {
    const {sha256, ...content} = event;
    check(!terminal && event.ordinal === index + 1 && event.previousSha256 === previous
      && candidateVideoDigestV002(content) === sha256, 'journal-chain-mismatch');
    const detail = object(event.detail);
    if (event.phase === 'intent') {
      check(event.operation !== 'preflight', 'journal-operation-mismatch');
      const next = nextOperation.get(event.itemId) ?? 0;
      check(event.operation === HTTP_OPERATIONS[next], 'journal-operation-order-mismatch');
      nextOperation.set(event.itemId, next + 1);
      check(++counts[event.operation] <= 5, 'journal-http-limit');
      if (event.operation === 'inference') check(counts['count-tokens'] === 5, 'journal-inference-before-five-counts');
      if (detail.bodyBase64 !== null) {
        const body = Buffer.from(detail.bodyBase64, 'base64');
        check(byteSha(body) === detail.bodySha256 && body.length === detail.bodyByteLength, 'journal-request-bytes-mismatch');
      } else check(event.operation === 'upload-finalize' && detail.target === 'memory-only-upload-session', 'journal-unexpected-body-omission');
    } else if (event.phase === 'response') {
      const intent = events[index - 1];
      check(intent?.phase === 'intent' && intent.itemId === event.itemId && intent.operation === event.operation,
        'journal-response-without-intent');
      if (detail.rawResponseBase64 !== null) {
        const raw = Buffer.from(detail.rawResponseBase64, 'base64');
        check(byteSha(raw) === detail.rawResponseSha256 && raw.length === detail.rawResponseByteLength, 'journal-response-bytes-mismatch');
      } else check(detail.rawOmissionReason === 'secret-like-response-rejected', 'journal-unexpected-raw-omission');
    } else { check(event.phase === 'failure', 'journal-unknown-phase'); terminal = true; }
    previous = sha256;
  });
}

export const EXPLORATION_ROOT = 'evals/clip_composition/outputs/work-candidate-video-understanding-calibration-exploration-media-v001';
export const PREPARATION_ROOT = 'evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001';
const BASELINES = [ [[646264,683238],[1377898,1428811]], [[1661474,1700141],[4379070,4414765]],
  [[1715972,1750321],[5682312,5715037]], [[216538,265495],[1967689,2015211]], [[216538,265495],[6114357,6153435]] ];

/** Read only approved media/mapping/build files, never a human review artifact. */
export async function loadPreparationJobs(workspace: string): Promise<CandidateVideoJobV002[]> {
  const jobs: CandidateVideoJobV002[] = [];
  for (let n = 1; n <= 5; n++) {
    const itemId = `item-${String(n).padStart(4, '0')}`;
    const root = `${EXPLORATION_ROOT}/${itemId}`;
    const mappingPath = `${root}/exploration-video-source-pts-mapping-v001.json`;
    const buildPath = `${root}/build-and-verification-v001.json`;
    const [mapBytes, buildBytes] = await Promise.all([readFile(resolve(workspace, mappingPath)), readFile(resolve(workspace, buildPath))]);
    const map = JSON.parse(mapBytes.toString('utf8'));
    const build = JSON.parse(buildBytes.toString('utf8'));
    check(build.status === 'passed' && build.itemId === itemId, 'build-not-passed');
    const strip = (b: any) => ({path: b.path, schemaVersion: b.schemaVersion, fileSha256: b.fileSha256});
    const mappingBinding = {path: mappingPath, schemaVersion: map.schemaVersion, fileSha256: byteSha(mapBytes)};
    check(same(strip(build.bindings.sourceMappingArtifact), mappingBinding), 'mapping-build-binding-mismatch');
    check(same(strip(build.bindings.explorationVideo), strip(map.evidenceBindings.candidateVideo)), 'media-map-binding-mismatch');
    check(same(strip(build.bindings.sourceVideo), strip(map.evidenceBindings.sourceVideo)), 'source-map-binding-mismatch');
    const v = build.explorationMedia.video;
    const job: CandidateVideoJobV002 = {
      schemaVersion: 'candidate-video-understanding-job-v002', classification: 'calibration', itemId,
      sourceVideoId: build.sourceVideoId,
      bindings: {sourceVideo: strip(build.bindings.sourceVideo), explorationVideo: strip(build.bindings.explorationVideo),
        mapping: mappingBinding, buildVerification: {path: buildPath, schemaVersion: build.schemaVersion, fileSha256: byteSha(buildBytes)}},
      video: {codecName: v.codecName, width: v.width, height: v.height,
        frameRateNumerator: v.rFrameRate.numerator, frameRateDenominator: v.rFrameRate.denominator,
        frameCount: v.frameCount, timeBaseNumerator: v.timeBase.numerator, timeBaseDenominator: v.timeBase.denominator,
        firstFramePts: v.firstFramePts, lastFramePts: v.lastFramePts, lastFrameDurationPts: v.lastFrameDurationPts},
      sourceMapping: {schemaVersion: 'candidate-video-source-pts-mapping-v001', status: 'closed',
        method: 'formal-frame-pts-piecewise-linear-v001', provenance: mappingBinding, ...map.mapping},
      freeBaselineWindow: {beforeMs: 16000, afterMs: 16000, snap: 'outward-utterance-boundaries',
        sourceIntervals: BASELINES[n - 1].map(([startTimeMs, endTimeMs]) => ({startTimeMs, endTimeMs}))},
      geminiExplorationWindow: {beforeMs: 34880, afterMs: 15378, snap: 'outward-utterance-boundaries',
        sourceIntervals: map.mapping.segments.map((s: any) => ({startTimeMs: s.sourceSelectionStartMs, endTimeMs: s.sourceSelectionEndMs}))},
      preflight: {status: 'local-preparation-only', exactRequestSha256: null, inputTokens: null,
        liveCommunicationsAuthorized: false, adoptionDecisionPermitted: false}
    };
    assertCandidateVideoJobV002(job);
    jobs.push(job);
  }
  return jobs;
}

export async function verifyBoundBytes(workspace: string, jobs: CandidateVideoJobV002[]) {
  const seen = new Map<string, string>();
  for (const job of jobs) for (const binding of Object.values(job.bindings)) {
    if (seen.has(binding.path)) { check(seen.get(binding.path) === binding.fileSha256, 'conflicting-binding'); continue; }
    const h = createHash('sha256');
    for await (const chunk of createReadStream(resolve(workspace, binding.path))) h.update(chunk);
    check(h.digest('hex') === binding.fileSha256, 'bound-file-sha-mismatch');
    seen.set(binding.path, binding.fileSha256);
  }
  return {distinctFilesVerified: seen.size, humanReviewArtifactReads: 0, videoGenerated: 0};
}

export class Stage1Timeout extends Error { constructor() { super('timeout'); } }
export async function wallClockDeadline<T>(ms: number, action: (signal: AbortSignal) => Promise<T>,
  schedule: (fn: () => void, ms: number) => (() => void) = (fn, ms) => {
    const timer = setTimeout(fn, ms); return () => clearTimeout(timer);
  }): Promise<T> {
  const controller = new AbortController();
  let cancel = () => {};
  try {
    return await Promise.race([new Promise<never>((_ok, reject) => {
      cancel = schedule(() => { reject(new Stage1Timeout()); controller.abort(); }, ms);
    }), action(controller.signal)]);
  } finally { cancel(); }
}

export const STAGE1_TIMEOUTS = Object.freeze({
  'upload-start': 30000, 'upload-finalize': 300000, 'metadata-get': 30000, 'count-tokens': 180000
});
type Stage1Operation = keyof typeof STAGE1_TIMEOUTS;
type Stage1Failure = 'local-preflight-failure' | 'local-persistence-failure' | 'upload-start-failure'
  | 'upload-finalize-failure' | 'metadata-request-failure' | 'metadata-not-active'
  | 'metadata-integrity-mismatch' | 'counttokens-failure';
type Sha256FailureReason = 'sha256-missing' | 'sha256-invalid-base64' | 'sha256-invalid-hex' | 'sha256-invalid-length' | 'sha256-mismatch';
type Sha256Diagnostics = {
  expectedJsonPath: '$.file.sha256Hash' | '$.sha256Hash';
  selectedJsonPath: '$.file.sha256Hash' | '$.sha256Hash' | 'missing';
  selectedFileObject: '$.file' | '$' | 'invalid-file-wrapper'; expectedShapeMatched: boolean;
  fieldPresent: boolean; fieldType: 'string' | 'non-string' | 'missing';
  encodedLengthChars: number | null; firstDecodedLengthBytes: number | null; finalDigestLengthBytes: number | null;
  sha256Representation: 'raw-digest-base64' | 'hex-text-base64' | 'unsupported';
  canonicalSha256Base64Length: boolean; decodedSha256Length: boolean;
  base64ValidationResult: 'passed' | 'failed' | 'not-checked';
  digestMatchResult: 'matched' | 'mismatched' | 'not-checked';
  hasPadding: boolean | null; looksHexOnly: boolean | null; decodedLooksHexOnly: boolean | null;
};
type Sha256Validation = ({status: 'passed'} | {status: 'failed'; reason: Sha256FailureReason}) & {diagnostics: Sha256Diagnostics};
class Stage1Sha256Failure extends Error {
  constructor(readonly reason: Sha256FailureReason) { super(reason); }
}
export type Stage1Event = {sequence: number; previousSha256: string | null; timestamp: string;
  item: string | null; operation: Stage1Operation | null; phase: string; detail: any; sha256: string};
const STAGE1_JOURNAL = `${PREPARATION_ROOT}/stage1-communication-record-v001.jsonl`;
const STAGE1_MEASUREMENT = `${PREPARATION_ROOT}/stage1-measurement-v001.json`;

function stage1ResponseRoot(raw: Buffer): Record<string, any> {
  try { return object(JSON.parse(raw.toString('utf8'))); } catch { return {}; }
}
function stage1ResponseFile(root: Record<string, any>): Record<string, any> {
  if (!Object.hasOwn(root, 'file')) return root;
  try { return object(root.file); } catch { return {}; }
}

/** Check the original field before filtering. Never retain unverified provider values. */
function validateStage1Sha256(root: Record<string, any>, localSha256: string,
  operation: 'upload-finalize' | 'metadata-get'): Sha256Validation {
  const file = stage1ResponseFile(root);
  const wrapped = Object.hasOwn(root, 'file');
  const selectedFileObject = !wrapped ? '$' : root.file && typeof root.file === 'object' && !Array.isArray(root.file)
    ? '$.file' : 'invalid-file-wrapper';
  const fieldPresent = Object.hasOwn(file, 'sha256Hash');
  const value: unknown = file.sha256Hash;
  const diagnostics: Sha256Diagnostics = {
    expectedJsonPath: operation === 'upload-finalize' ? '$.file.sha256Hash' : '$.sha256Hash',
    selectedJsonPath: !fieldPresent ? 'missing' : wrapped ? '$.file.sha256Hash' : '$.sha256Hash',
    selectedFileObject, expectedShapeMatched: selectedFileObject === (operation === 'upload-finalize' ? '$.file' : '$'),
    fieldPresent, fieldType: !fieldPresent ? 'missing' : typeof value === 'string' ? 'string' : 'non-string',
    encodedLengthChars: typeof value === 'string' ? value.length : null, firstDecodedLengthBytes: null,
    finalDigestLengthBytes: null, sha256Representation: 'unsupported',
    canonicalSha256Base64Length: typeof value === 'string' && value.length === 44, decodedSha256Length: false,
    base64ValidationResult: 'not-checked', digestMatchResult: 'not-checked',
    hasPadding: typeof value === 'string' ? value.endsWith('=') : null,
    looksHexOnly: typeof value === 'string' ? /^[a-fA-F0-9]+$/u.test(value) : null, decodedLooksHexOnly: null
  };
  const failed = (reason: Sha256FailureReason): Sha256Validation => ({status: 'failed', reason, diagnostics});
  if (!fieldPresent) return failed('sha256-missing');
  // Strict standard padded Base64, not Buffer.from's permissive decoder. Empty Base64
  // decodes to zero bytes and is therefore a length failure, not a missing field.
  diagnostics.base64ValidationResult = 'failed';
  if (typeof value !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value))
    return failed('sha256-invalid-base64');
  const firstDecoded = Buffer.from(value, 'base64');
  diagnostics.firstDecodedLengthBytes = firstDecoded.length;
  // These existing booleans describe the first decode, not the final normalized digest.
  diagnostics.decodedSha256Length = firstDecoded.length === 32;
  diagnostics.decodedLooksHexOnly = firstDecoded.length > 0 && firstDecoded.every(b =>
    (b >= 48 && b <= 57) || (b >= 65 && b <= 70) || (b >= 97 && b <= 102));
  if (firstDecoded.toString('base64') !== value) return failed('sha256-invalid-base64');
  diagnostics.base64ValidationResult = 'passed';
  let digest: Buffer;
  if (firstDecoded.length === 32) {
    digest = firstDecoded;
    diagnostics.sha256Representation = 'raw-digest-base64';
  } else if (firstDecoded.length === 64) {
    // Check every original byte before decoding: Node's hex decoder alone accepts
    // truncation, and ASCII conversion alone can mask non-ASCII high bits.
    if (!diagnostics.decodedLooksHexOnly) return failed('sha256-invalid-hex');
    digest = Buffer.from(firstDecoded.toString('ascii'), 'hex');
    if (digest.length !== 32) return failed('sha256-invalid-length');
    diagnostics.sha256Representation = 'hex-text-base64';
  } else return failed('sha256-invalid-length');
  diagnostics.finalDigestLengthBytes = digest.length;
  diagnostics.digestMatchResult = digest.equals(Buffer.from(localSha256, 'hex')) ? 'matched' : 'mismatched';
  if (diagnostics.digestMatchResult === 'mismatched') return failed('sha256-mismatch');
  return {status: 'passed', diagnostics};
}

/** Only typed non-secret metadata is retained, even for malformed/error responses. */
function stage1ResponseFields(root: Record<string, any>): Record<string, unknown> {
  const file = stage1ResponseFile(root);
  const result: Record<string, unknown> = {};
  if (typeof file.name === 'string' && /^files\/[a-zA-Z0-9_-]+$/u.test(file.name)) result.name = file.name;
  if (typeof file.uri === 'string') { try { safeUrl(file.uri, 'file'); result.uri = file.uri; } catch { /* omit unsafe field */ } }
  if (file.mimeType === 'video/mp4') result.mimeType = file.mimeType;
  if (typeof file.sizeBytes === 'string' && /^\d+$/u.test(file.sizeBytes)) result.sizeBytes = file.sizeBytes;
  if (['ACTIVE', 'PROCESSING', 'FAILED', 'STATE_UNSPECIFIED'].includes(file.state)) result.state = file.state;
  if (typeof file.displayName === 'string' && /^item-000[1-5]$/u.test(file.displayName)) result.displayName = file.displayName;
  for (const key of ['createTime', 'updateTime', 'expirationTime']) if (typeof file[key] === 'string'
    && /^\d{4}-\d\d-\d\dT[\d:.]+Z$/u.test(file[key])) result[key] = file[key];
  if (Number.isSafeInteger(root.totalTokens) && root.totalTokens >= 0) result.totalTokens = root.totalTokens;
  return result;
}

const REMAINING_STAGE1_ITEMS = ['item-0002', 'item-0003', 'item-0004', 'item-0005'] as const;
type BoundedStage1Scope = 'item-0001-upload-and-count' | 'remaining-four-upload-and-count';

export function validateStage1Journal(events: Stage1Event[]) {
  let previous: string | null = null;
  const intents = new Map<string, number>();
  let terminal = false;
  let item0001Only = false;
  let remainingOnly = false;
  for (const [index, e] of events.entries()) {
    const {sha256, ...content} = e;
    check(e.sequence === index + 1 && e.previousSha256 === previous && candidateVideoDigestV002(content) === sha256,
      'stage1-journal-chain-mismatch');
    if (e.phase === 'initialization' && e.detail.scope === 'item-0001-upload-and-count') {
      check(index === 0 && e.detail.maximumHttp === 4 && same(e.detail.targetItems, ['item-0001']), 'one-item-journal-scope');
      item0001Only = true;
    }
    if (e.phase === 'initialization' && e.detail.scope === 'remaining-four-upload-and-count') {
      check(index === 0 && e.detail.maximumHttp === 16 && same(e.detail.targetItems, REMAINING_STAGE1_ITEMS), 'remaining-journal-scope');
      remainingOnly = true;
    }
    if (e.phase === 'intent') {
      check(!terminal && e.operation !== null, 'stage1-terminal-or-inference');
      const next = intents.get(e.item!) ?? 0;
      check(Object.keys(STAGE1_TIMEOUTS)[next] === e.operation, 'stage1-order');
      intents.set(e.item!, next + 1);
      check(e.detail.timeoutMs === STAGE1_TIMEOUTS[e.operation]
        && e.detail.counter === [...intents.values()].reduce((a, b) => a + b, 0)
        && e.detail.counter <= (remainingOnly ? 16 : item0001Only ? 4 : 20), 'stage1-counter');
      if (item0001Only) check(e.item === 'item-0001', 'one-item-journal-target');
      if (remainingOnly) check(e.item === REMAINING_STAGE1_ITEMS[Math.floor((e.detail.counter - 1) / 4)], 'remaining-journal-target-order');
      if (e.detail.request.body !== null) check(byteSha(json(e.detail.request.body)) === e.detail.requestPayloadSha256, 'stage1-payload-sha');
    }
    if (e.phase === 'failure') terminal = true;
    previous = sha256;
  }
}

export async function executeStage1(jobs: CandidateVideoJobV002[], deps: {
  mode: 'mock' | 'live'; manifestSha256: string;
  scope?: 'item-0001-finalize-diagnostic' | BoundedStage1Scope;
  media(job: CandidateVideoJobV002): Promise<Buffer>;
  exchange(request: HttpRequest, operation: Stage1Operation): Promise<HttpResponse>;
  append(event: Stage1Event): Promise<void>;
  wait(ms: number): Promise<void>; clock(): string;
}) {
  const diagnosticOnly = deps.scope === 'item-0001-finalize-diagnostic';
  const item0001Only = deps.scope === 'item-0001-upload-and-count';
  const remainingOnly = deps.scope === 'remaining-four-upload-and-count';
  const maximumHttp = remainingOnly ? 16 : item0001Only ? 4 : diagnosticOnly ? 2 : 20;
  const events: Stage1Event[] = [];
  let counter = 0;
  let actualStarted = 0;
  let failure: {item: string | null; operation: Stage1Operation | null; category: Stage1Failure;
    reason: 'credential-not-configured' | 'classified-without-exception-text' | Sha256FailureReason;
    timeout: boolean; deliveryState: 'unknown' | 'response-received' | 'not-sent'} | null = null;
  const items = jobs.map(job => ({itemId: job.itemId, videoSha256: job.bindings.explorationVideo.fileSha256,
    mappingSha256: job.bindings.mapping.fileSha256, templateSha256: candidateVideoDigestV002(buildCandidateVideoRequestTemplateV002(job)),
    uploaded: false, active: null as boolean | null, providerFile: null as any,
    exactInference: null as ReturnType<typeof buildExactRequest> | null, countTokensRequestSha256: null as string | null,
    inputTokens: null as number | null, status: 'not-attempted',
    operations: [] as Array<{operation: Stage1Operation; attempted: number; completed: number; failed: number; unknown: number; notSent: number}>}));
  async function append(phase: string, item: string | null, operation: Stage1Operation | null, detail: unknown) {
    const content = {sequence: events.length + 1, previousSha256: events.at(-1)?.sha256 ?? null,
      timestamp: deps.clock(), item, operation, phase, detail};
    const event = {...content, sha256: candidateVideoDigestV002(content)};
    await deps.append(structuredClone(event));
    events.push(event);
  }
  let currentItem: string | null = null;
  let operation: Stage1Operation | null = null;
  let category: Stage1Failure = 'local-preflight-failure';
  let deliveryState: 'unknown' | 'response-received' | 'not-sent' = 'not-sent';
  let activeRow: typeof items[number]['operations'][number] | undefined;
  try {
    if (item0001Only) assertItem0001Target(jobs);
    else if (remainingOnly) assertRemainingStage1Targets(jobs);
    else check(jobs.length === 5 && new Set(jobs.map(j => j.itemId)).size === 5, 'five-jobs-required');
    jobs.forEach(assertCandidateVideoJobV002);
    if (diagnosticOnly) check(jobs[0].itemId === 'item-0001', 'diagnostic-item-0001-only');
    category = 'local-persistence-failure';
    await append('initialization', null, null, {mode: deps.mode, manifestSha256: deps.manifestSha256,
      maximumHttp, inference: 0, retry: 0, repair: 0, timeouts: STAGE1_TIMEOUTS,
      metadataWaitMs: diagnosticOnly ? 0 : 60000, scope: deps.scope ?? 'five-item-upload-and-count',
      targetItems: jobs.map(job => job.itemId)});
    for (const [index, job] of jobs.entries()) {
      const item = items[index]; currentItem = job.itemId; operation = null;
      category = 'local-preflight-failure'; deliveryState = 'not-sent';
      const media = await deps.media(job);
      check(byteSha(media) === item.videoSha256, 'local-media-sha');
      const template = buildCandidateVideoRequestTemplateV002(job);
      assertProviderRequestAllowlist(job, template.body, null);
      const send = async (op: Stage1Operation, request: HttpRequest) => {
        operation = op; deliveryState = 'not-sent';
        category = 'local-persistence-failure';
        check(counter < maximumHttp && item.operations.length === Object.keys(STAGE1_TIMEOUTS).indexOf(op), 'stage1-no-retry-limit');
        if (item0001Only) check(job.itemId === 'item-0001', 'one-item-target-forbidden');
        if (remainingOnly) check(job.itemId === REMAINING_STAGE1_ITEMS[index], 'remaining-item-target-forbidden');
        if (diagnosticOnly) check(job.itemId === 'item-0001' && (op === 'upload-start' || op === 'upload-finalize'), 'diagnostic-operation-forbidden');
        const row = {operation: op, attempted: 1, completed: 0, failed: 0, unknown: 0, notSent: 0};
        activeRow = row; item.operations.push(row); counter++;
        await append('intent', job.itemId, op, {counter, templateSha256: item.templateSha256,
          exactRequestSha256: item.exactInference?.sha256 ?? null, destinationHost: HOST,
          timeoutMs: STAGE1_TIMEOUTS[op], requestPayloadSha256: byteSha(request.body), byteCount: request.body.length,
          request: {method: request.method, url: op === 'upload-finalize' ? null : request.url,
            body: op === 'upload-finalize' || op === 'metadata-get' ? null : JSON.parse(request.body.toString('utf8'))},
          mediaByteSha256: item.videoSha256, sessionUrlPersisted: false});
        category = op === 'metadata-get' ? 'metadata-request-failure' : op === 'count-tokens' ? 'counttokens-failure'
          : op === 'upload-start' ? 'upload-start-failure' : 'upload-finalize-failure';
        actualStarted++; deliveryState = 'unknown';
        const response = await deps.exchange(request, op);
        deliveryState = 'response-received';
        const root = stage1ResponseRoot(response.body);
        const sha256 = op === 'upload-finalize' || op === 'metadata-get' ? validateStage1Sha256(root, item.videoSha256, op) : null;
        const fields = stage1ResponseFields(root);
        category = 'local-persistence-failure';
        await append('response', job.itemId, op, {httpStatus: response.status,
          responsePayloadSha256: byteSha(response.body), byteCount: response.body.length,
          fields, sha256Validation: sha256 === null ? null : sha256.status === 'passed'
            ? {status: 'passed', reason: null} : {status: 'failed', reason: sha256.reason},
          sha256Diagnostics: sha256?.diagnostics ?? null,
          rawHeaderPolicy: 'never-persist',
          bodyPolicy: 'allowlisted-fields-only-original-body-SHA-retained'});
        category = op === 'metadata-get' ? 'metadata-request-failure' : op === 'count-tokens' ? 'counttokens-failure'
          : op === 'upload-start' ? 'upload-start-failure' : 'upload-finalize-failure';
        check(response.status >= 200 && response.status < 300, 'http-status-stop');
        if (sha256?.status === 'failed') {
          category = op === 'metadata-get' ? 'metadata-integrity-mismatch' : 'upload-finalize-failure';
          throw new Stage1Sha256Failure(sha256.reason);
        }
        row.completed = 1;
        return {...response, fields};
      };
      const start = await send('upload-start', {method: 'POST', url: `${ORIGIN}/upload/v1beta/files`,
        headers: {'Content-Type': 'application/json', 'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start', 'X-Goog-Upload-Header-Content-Length': String(media.length),
          'X-Goog-Upload-Header-Content-Type': 'video/mp4'}, body: json({file: {display_name: job.itemId}})});
      const session = start.headers['x-goog-upload-url'];
      check(typeof session === 'string', 'missing-session'); safeUrl(session, 'session');
      const uploaded = await send('upload-finalize', {method: 'POST', url: session,
        headers: {'Content-Type': 'video/mp4', 'Content-Length': String(media.length),
          'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize'}, body: media});
      const file = uploaded.fields;
      check(typeof file.name === 'string', 'missing-file-name'); item.uploaded = true; item.providerFile = file;
      if (diagnosticOnly) { item.status = 'diagnostic-finalize-complete'; activeRow = undefined; break; }
      category = 'local-persistence-failure';
      await append('fixed-wait', job.itemId, null, {durationMs: 60000, before: 'metadata-get', additionalPoll: 0});
      await deps.wait(60000);
      const metadata = await send('metadata-get', {method: 'GET', url: `${ORIGIN}/v1beta/${file.name}`, headers: {}, body: Buffer.alloc(0)});
      const verified = metadata.fields; item.providerFile = verified;
      category = 'metadata-integrity-mismatch';
      check(verified.name === file.name && verified.uri === `${ORIGIN}/v1beta/${file.name}`
        && verified.mimeType === 'video/mp4' && verified.sizeBytes === String(media.length)
        && verified.displayName === job.itemId, 'metadata-integrity');
      item.active = verified.state === 'ACTIVE'; category = 'metadata-not-active';
      check(item.active, 'not-active');
      item.exactInference = buildExactRequest(job, verified.uri as string);
      const countRequest = {method: 'POST' as const, url: `${ORIGIN}/v1beta/models/${MODEL}:countTokens`,
        headers: {'Content-Type': 'application/json'}, body: json(item.exactInference.countTokensBody)};
      item.countTokensRequestSha256 = candidateVideoDigestV002({method: countRequest.method, url: countRequest.url, body: item.exactInference.countTokensBody});
      const count = await send('count-tokens', countRequest);
      const countFields = count.fields; integer(countFields.totalTokens);
      check(countFields.totalTokens > 0, 'empty-token-count'); item.inputTokens = countFields.totalTokens;
      item.status = 'measured'; activeRow = undefined;
    }
  } catch (error) {
    failure = {item: currentItem, operation, category,
      reason: error instanceof Stage1Sha256Failure ? error.reason
        : error instanceof Error && error.message === 'credential-not-configured' ? 'credential-not-configured' : 'classified-without-exception-text',
      timeout: error instanceof Stage1Timeout, deliveryState};
    if (activeRow) { activeRow.completed = 0;
      if ((deliveryState as string) === 'unknown') activeRow.unknown = 1;
      else if ((deliveryState as string) === 'not-sent') activeRow.notSent = 1;
      else activeRow.failed = 1;
    }
    const item = items.find(i => i.itemId === currentItem); if (item) item.status = 'stopped';
    try { if (category !== 'local-persistence-failure') await append('failure', currentItem, operation, failure); }
    catch { /* Do not retry a failed append; caller still publishes the partial measurement. */ }
  }
  validateStage1Journal(events);
  const measured = items.filter(i => i.inputTokens !== null);
  const acquiredInputTokens = measured.reduce((n, i) => n + i.inputTokens!, 0);
  return {schemaVersion: 'candidate-video-understanding-stage1-measurement-v001', mode: deps.mode,
    classification: diagnosticOnly ? 'sha256-format-diagnostic-only' : 'calibration',
    status: failure ? 'stopped' : remainingOnly ? 'remaining-four-measured-awaiting-separate-approval'
      : item0001Only ? 'item-0001-measured-awaiting-separate-approval'
      : diagnosticOnly ? 'diagnostic-complete-no-metadata-or-inference' : 'measured-awaiting-separate-inference-approval',
    manifestSha256: deps.manifestSha256, items, events, failure, reservedHttp: counter, actualStartedHttp: actualStarted,
    measuredItemCount: measured.length, acquiredInputTokens, allFiveInputTokens: measured.length === 5 ? acquiredInputTokens : null,
    inputPriceNanoUsdPerToken: 750, acquiredInputCostNanoUsd: String(BigInt(acquiredInputTokens) * 750n),
    fiveInferenceInputCostNanoUsd: measured.length === 5 ? String(BigInt(acquiredInputTokens) * 750n) : null,
    configuredOutputTokensPerInference: 4096, fiveOutputAllowanceNanoUsd: '76800000',
    thinkingTokens: null, totalCostUpperBound: null, inference: 0, retry: 0, repair: 0, extraPoll: 0,
    priceSnapshot: `${PREPARATION_ROOT}/provider-spec-and-price-snapshot-v001.json`};
}

function assertItem0001Target(jobs: CandidateVideoJobV002[]) {
  check(jobs.length === 1 && jobs[0].itemId === 'item-0001', 'exactly-item-0001-required');
  assertCandidateVideoJobV002(jobs[0]);
}

function assertRemainingStage1Targets(jobs: CandidateVideoJobV002[]) {
  check(same(jobs.map(job => job.itemId), REMAINING_STAGE1_ITEMS), 'exactly-remaining-four-in-order-required');
  jobs.forEach(assertCandidateVideoJobV002);
}

export async function executeRemainingStage1(jobs: CandidateVideoJobV002[],
  deps: Omit<Parameters<typeof executeStage1>[1], 'scope'>) {
  const target = structuredClone(jobs);
  assertRemainingStage1Targets(target);
  return executeStage1(target, {...deps, scope: 'remaining-four-upload-and-count'});
}

/** A singleton target is required, not a five-item run interrupted after item one. */
export async function executeItem0001Stage1(jobs: CandidateVideoJobV002[],
  deps: Omit<Parameters<typeof executeStage1>[1], 'scope'>) {
  const target = structuredClone(jobs);
  assertItem0001Target(target);
  return executeStage1(target, {...deps, scope: 'item-0001-upload-and-count'});
}

/** Exclusive creation, fsync, and read-back before any live request. Never resume/reupload. */
export async function runApprovedStage1(workspace: string, apiKey: string) {
  const journalPath = resolve(workspace, STAGE1_JOURNAL);
  const measurementPath = resolve(workspace, STAGE1_MEASUREMENT);
  for (const path of [journalPath, measurementPath]) {
    let exists = false; try { await access(path); exists = true; } catch { /* checked again by wx */ }
    check(!exists, 'stage1-path-already-used-no-retry');
  }
  const manifestBytes = await readFile(resolve(workspace, PREPARATION_ROOT, 'job-manifest-v001.json'));
  check(byteSha(manifestBytes) === 'c008579876c1912348bfece9510aefa2fae70babee94e5079724a3d8c86577c3', 'approved-manifest-sha');
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const jobs = await loadPreparationJobs(workspace);
  check(same(jobs, manifest.jobs), 'manifest-job-binding');
  await verifyBoundBytes(workspace, jobs);
  for (const job of jobs) {
    const build = JSON.parse(await readFile(resolve(workspace, job.bindings.buildVerification.path), 'utf8'));
    const media = await readFile(resolve(workspace, job.bindings.explorationVideo.path));
    check(media.length === build.bindings.explorationVideo.byteLength && media.toString('ascii', 4, 8) === 'ftyp', 'video-byte-length-or-MP4-signature');
    check(same(buildCandidateVideoRequestTemplateV002(job), manifest.templates.find((t: any) => t.itemId === job.itemId).template), 'template-changed');
  }
  const journal = await open(journalPath, 'ax+', 0o600);
  const parent = await open(dirname(journalPath), 'r'); await parent.sync(); await parent.close();
  let expected = Buffer.alloc(0);
  let result: Awaited<ReturnType<typeof executeStage1>>;
  try {
    result = await executeStage1(jobs, {mode: 'live', manifestSha256: byteSha(manifestBytes),
      clock: () => new Date().toISOString(),
      media: job => {
        check(apiKey.length > 0, 'credential-not-configured');
        return readFile(resolve(workspace, job.bindings.explorationVideo.path));
      },
      wait: ms => new Promise(ok => { process.stdout.write('Upload completed; fixed 60-second wait before one metadata GET.\n'); setTimeout(ok, ms); }),
      append: async event => {
        const line = json(event); const priorLength = expected.length;
        await journal.writeFile(line); await journal.sync();
        expected = Buffer.concat([expected, line]);
        const actual = await readFile(journalPath);
        check(actual.length === priorLength + line.length && actual.equals(expected), 'journal-readback-failure');
      },
      exchange: (request, operation) => {
        check(Object.hasOwn(STAGE1_TIMEOUTS, operation) && !request.url.includes(':generateContent'), 'stage1-inference-forbidden');
        return createDirectRestPort({approvedBy: 'kawafmm', approvalReference: '7d34afa4-9204-4d6f-b2b6-601c0e73fe04',
          phase: 'upload-and-count', manifestSha256: byteSha(manifestBytes), timeoutMs: STAGE1_TIMEOUTS[operation]}, apiKey).exchange(request);
      }});
  } finally { await journal.close(); }
  const measurement = await open(measurementPath, 'wx', 0o600);
  try {
    const {events, ...summary} = result;
    const record = {...summary, journal: {path: STAGE1_JOURNAL, fileSha256: byteSha(expected), eventCount: events.length,
      finalEventSha256: events.at(-1)?.sha256 ?? null},
      executionImplementationSha256: byteSha(await readFile(resolve(workspace, 'runner/src/candidate-video-understanding-transport-v001.ts'))),
      executedOn: new Date().toISOString(), billingVerification: {checkedOn: '2026-09-05',
        files: 'https://ai.google.dev/gemini-api/docs/files', billing: 'https://ai.google.dev/gemini-api/docs/billing',
        pricing: 'https://ai.google.dev/gemini-api/docs/pricing', filesUploadUsd: 0, countTokensUsd: null,
        countTokensBillingNote: 'Current billing FAQ explicitly names GetTokens as unbilled, not this legacy countTokens endpoint. No invoice observed; do not assert an actual charge.'}};
    await measurement.writeFile(json(record)); await measurement.sync();
    check((await readFile(measurementPath)).equals(json(record)), 'measurement-readback-failure');
    return record;
  } finally { await measurement.close(); }
}

export function assertCredentialStopResumeHistory(journalBytes: Buffer, measurementBytes: Buffer) {
  check(byteSha(journalBytes) === '9f25aadf541bd81abe4eaa1798cd39de232878d1e16cdfd9d223ef30d1e78264'
    && byteSha(measurementBytes) === '2b30a621df6df9004dbede6fa4eef5171db61e61a0681409796bf160cf3a2888',
  'resume-history-not-original-unused-credential-stop');
  const events = journalBytes.toString('utf8').trimEnd().split('\n').map(line => JSON.parse(line) as Stage1Event);
  validateStage1Journal(events);
  const old = JSON.parse(measurementBytes.toString('utf8'));
  check(old.failure?.reason === 'credential-not-configured' && old.actualStartedHttp === 0
    && old.reservedHttp === 0 && old.journal.fileSha256 === byteSha(journalBytes), 'resume-not-zero-send-stop');
  return events;
}

export function assertSha256FixResumeHistory(journalBytes: Buffer, measurementBytes: Buffer) {
  check(byteSha(journalBytes) === '5c602cea845d3e8986274ee0080a41473e9f75731b67cad855eb9c4794217a64',
    'resume-history-not-approved-attempt-0002-stop');
  const lines = journalBytes.toString('utf8').trimEnd().split('\n');
  assertCredentialStopResumeHistory(Buffer.from(lines.slice(0, 2).join('\n') + '\n'), measurementBytes);
  const events = lines.map(line => JSON.parse(line) as Stage1Event);
  validateStage1Journal(events);
  const priorAttempt = events.filter(e => e.phase === 'attempt-event').map(e => e.detail.payload as Stage1Event);
  validateStage1Journal(priorAttempt);
  const measurement = events.at(-1)!;
  check(measurement.phase === 'attempt-measurement' && measurement.detail.attemptId === 'attempt-0002'
    && measurement.detail.payload.actualStartedHttp === 3
    && measurement.detail.payload.failure?.category === 'metadata-integrity-mismatch', 'resume-not-approved-metadata-stop');
  return events;
}

export function assertSha256DiagnosticHistory(journalBytes: Buffer, measurementBytes: Buffer) {
  check(byteSha(journalBytes) === 'bdd7f643d9ae2b85d0e6c50f06c1a4e0a0df55fafd19a7995be52897f8c059a1',
    'diagnostic-history-not-approved-attempt-0003-stop');
  const lines = journalBytes.toString('utf8').trimEnd().split('\n');
  const events = lines.map(line => JSON.parse(line) as Stage1Event);
  const boundary = events.findIndex(e => e.phase === 'attempt-boundary' && e.detail.attemptId === 'attempt-0003');
  check(boundary > 0, 'diagnostic-missing-prior-boundary');
  assertSha256FixResumeHistory(Buffer.from(lines.slice(0, boundary).join('\n') + '\n'), measurementBytes);
  validateStage1Journal(events);
  validateStage1Journal(events.filter(e => e.phase === 'attempt-event' && e.detail.attemptId === 'attempt-0003').map(e => e.detail.payload));
  const final = events.at(-1)!;
  check(final.phase === 'attempt-measurement' && final.detail.attemptId === 'attempt-0003'
    && final.detail.payload.actualStartedHttp === 2 && final.detail.payload.failure?.reason === 'sha256-invalid-length',
    'diagnostic-not-approved-length-stop');
  return events;
}

type Item0001AttemptApproval = {
  attemptId: string; expectedPriorJournalSha256: string; manifestSha256: string; implementationSha256: string;
};
type AttemptRecordPort = {
  readJournal(): Promise<Buffer>; readMeasurement(): Promise<Buffer>;
  /** Append only, then fsync before resolving. Never replace or truncate the file. */
  appendJournal(line: Buffer): Promise<void>;
};
type BoundedAttemptDeps = Omit<Parameters<typeof executeStage1>[1], 'scope' | 'append' | 'manifestSha256'> & {records: AttemptRecordPort};

function preservedItem0001(prior: Buffer) {
  const lines = prior.toString('utf8').trimEnd().split('\n');
  const history = lines.map(line => JSON.parse(line) as Stage1Event);
  validateStage1Journal(history);
  const end = history.findIndex(e => e.phase === 'attempt-measurement' && e.detail.attemptId === 'attempt-0005');
  check(end >= 0 && byteSha(Buffer.from(lines.slice(0, end + 1).join('\n') + '\n'))
    === '9d9cb41f800d074881528869804f1d5a81e882684bdb05e649003fd2e95f5b69', 'attempts-0001-through-0005-changed');
  const record = history[end].detail.payload;
  check(record.mode === 'live' && record.failure === null && record.items.length === 1
    && record.items[0].itemId === 'item-0001' && record.items[0].status === 'measured'
    && record.items[0].inputTokens === 32350, 'preserved-item-0001-not-measured');
  return record.items[0] as Awaited<ReturnType<typeof executeStage1>>['items'][number];
}

/** Re-derive exclusively from the pinned live item-one record and this attempt's count responses. */
export function deriveFiveItemStage1Measurement(prior: Buffer, result: Awaited<ReturnType<typeof executeStage1>>, attemptId: string) {
  const first = preservedItem0001(prior);
  check(same(result.items.map(item => item.itemId), REMAINING_STAGE1_ITEMS), 'aggregation-remaining-items');
  validateStage1Journal(result.events);
  const rows = [{itemId: first.itemId, sourceAttemptId: 'attempt-0005', inputTokens: first.inputTokens,
    countTokensRequestSha256: first.countTokensRequestSha256}];
  for (const item of result.items) {
    if (item.inputTokens !== null) {
      integer(item.inputTokens);
      const response = result.events.filter(e => e.item === item.itemId && e.phase === 'response' && e.operation === 'count-tokens');
      const intent = result.events.filter(e => e.item === item.itemId && e.phase === 'intent' && e.operation === 'count-tokens');
      check(item.inputTokens > 0 && item.status === 'measured' && item.uploaded && item.active === true
        && response.length === 1 && response[0].detail.httpStatus >= 200 && response[0].detail.httpStatus < 300
        && response[0].detail.fields.totalTokens === item.inputTokens && intent.length === 1
        && candidateVideoDigestV002(intent[0].detail.request) === item.countTokensRequestSha256, 'aggregation-count-evidence-mismatch');
    }
    rows.push({itemId: item.itemId, sourceAttemptId: attemptId, inputTokens: item.inputTokens,
      countTokensRequestSha256: item.inputTokens === null ? null : item.countTokensRequestSha256});
  }
  const complete = result.failure === null && rows.every(row => row.inputTokens !== null);
  const total = complete ? rows.reduce((sum, row) => sum + row.inputTokens!, 0) : null;
  return {status: complete ? 'complete' : 'partial',
    measurementKind: result.mode === 'live' ? 'provider-measured-input-tokens' : 'mock-new-items-with-preserved-live-item-0001',
    item0001Remeasured: false, items: rows, totalInputTokens: total, averageInputTokens: total === null ? null : total / 5};
}

/** Existing attempts are immutable inputs; all new writes use one ordered append sink. */
export async function executeItem0001Attempt(jobs: CandidateVideoJobV002[], approval: Item0001AttemptApproval,
  deps: BoundedAttemptDeps) {
  return executeBoundedStage1Attempt(jobs, approval, deps, 'item-0001-upload-and-count');
}

export async function executeRemainingStage1Attempt(jobs: CandidateVideoJobV002[], approval: Item0001AttemptApproval,
  deps: BoundedAttemptDeps) {
  return executeBoundedStage1Attempt(jobs, approval, deps, 'remaining-four-upload-and-count');
}

async function executeBoundedStage1Attempt(jobs: CandidateVideoJobV002[], approval: Item0001AttemptApproval,
  deps: BoundedAttemptDeps, scope: BoundedStage1Scope) {
  const target = structuredClone(jobs);
  const remainingOnly = scope === 'remaining-four-upload-and-count';
  if (remainingOnly) assertRemainingStage1Targets(target); else assertItem0001Target(target);
  check(/^attempt-\d{4}$/u.test(approval.attemptId), 'invalid-attempt-id');
  for (const digest of [approval.expectedPriorJournalSha256, approval.manifestSha256, approval.implementationSha256])
    check(/^[a-f0-9]{64}$/u.test(digest), 'invalid-attempt-binding');
  const prior = await deps.records.readJournal();
  const priorMeasurement = await deps.records.readMeasurement();
  check(byteSha(prior) === approval.expectedPriorJournalSha256 && prior.at(-1) === 10, 'attempt-prior-record-mismatch');
  check(byteSha(priorMeasurement) === '2b30a621df6df9004dbede6fa4eef5171db61e61a0681409796bf160cf3a2888', 'attempt-prior-measurement-mismatch');
  if (remainingOnly) preservedItem0001(prior);
  const lines = prior.toString('utf8').trimEnd().split('\n');
  const history = lines.map(line => JSON.parse(line) as Stage1Event);
  validateStage1Journal(history);
  const fourthEnd = history.findIndex(e => e.phase === 'attempt-measurement' && e.detail.attemptId === 'attempt-0004');
  check(fourthEnd >= 0 && byteSha(Buffer.from(lines.slice(0, fourthEnd + 1).join('\n') + '\n'))
    === '0896a3fc96d2e0313542eb6da4c5cf9815b35eff42d43ce2676136e371aed4d5', 'attempts-0001-through-0004-changed');
  const ids = new Set(['attempt-0001']);
  let openAttempt: string | null = null;
  let nested: Stage1Event[] = [];
  for (const e of history.slice(2)) {
    if (e.phase === 'attempt-boundary') {
      check(openAttempt === null && !ids.has(e.detail.attemptId), 'duplicate-or-unfinished-prior-attempt');
      ids.add(e.detail.attemptId); openAttempt = e.detail.attemptId; nested = [];
    } else {
      check(openAttempt !== null && e.detail.attemptId === openAttempt, 'prior-attempt-order');
      if (e.phase === 'attempt-event') nested.push(e.detail.payload);
      else {
        check(e.phase === 'attempt-measurement', 'prior-attempt-phase');
        validateStage1Journal(nested); openAttempt = null;
      }
    }
  }
  check(openAttempt === null && history.at(-1)?.phase === 'attempt-measurement', 'unfinished-prior-attempt');
  check(!ids.has(approval.attemptId), 'attempt-id-already-used');
  let expected = Buffer.from(prior);
  let previous = history.at(-1)!.sha256;
  let sequence = history.length;
  let broken = false;
  let writing = false;
  const newEvents: Stage1Event[] = [];
  async function appendEnvelope(phase: string, payload: unknown) {
    check(!broken && !writing, 'attempt-append-unavailable');
    writing = true;
    try {
      check((await deps.records.readJournal()).equals(expected)
        && (await deps.records.readMeasurement()).equals(priorMeasurement), 'attempt-record-changed-before-append');
      const content = {sequence: sequence + 1, previousSha256: previous, timestamp: deps.clock(),
        item: null, operation: null, phase, detail: {attemptId: approval.attemptId, payload}};
      const event = {...content, sha256: candidateVideoDigestV002(content)};
      const line = json(event);
      await deps.records.appendJournal(line);
      const next = Buffer.concat([expected, line]);
      check((await deps.records.readJournal()).equals(next), 'attempt-append-readback-mismatch');
      expected = next; previous = event.sha256; sequence++;
    } catch (error) { broken = true; throw error; }
    finally { writing = false; }
  }
  await appendEnvelope('attempt-boundary', {priorJournalSha256: byteSha(prior), priorMeasurementSha256: byteSha(priorMeasurement),
    manifestSha256: approval.manifestSha256, implementationSha256: approval.implementationSha256,
    scope, targetItems: target.map(job => job.itemId), maximumHttp: remainingOnly ? 16 : 4,
    inferenceAuthorized: false, retry: 0, repair: 0, extraPoll: 0});
  const execute = remainingOnly ? executeRemainingStage1 : executeItem0001Stage1;
  const result = await execute(target, {...deps, manifestSha256: approval.manifestSha256,
    append: async event => {
      const proposed = [...newEvents, event]; validateStage1Journal(proposed);
      await appendEnvelope('attempt-event', event); newEvents.push(structuredClone(event));
    }});
  check(!broken && same(newEvents, result.events), 'attempt-events-not-durable');
  const {events, ...summary} = result;
  const record = {...summary, attemptId: approval.attemptId, attemptEventCount: events.length,
    priorJournalSha256: byteSha(prior), priorMeasurementSha256: byteSha(priorMeasurement),
    executionImplementationSha256: approval.implementationSha256,
    fiveItemMeasurement: remainingOnly ? deriveFiveItemStage1Measurement(prior, result, approval.attemptId) : null};
  await appendEnvelope('attempt-measurement', record);
  check((await deps.records.readMeasurement()).equals(priorMeasurement)
    && (await deps.records.readJournal()).equals(expected) && expected.subarray(0, prior.length).equals(prior), 'attempt-final-readback-mismatch');
  return record;
}

/** Future live entry; caller must separately authorize an unused attempt and the prior record SHA. */
export async function runApprovedItem0001Stage1(workspace: string, apiKey: string,
  approval: {approvedBy: 'kawafmm'; attemptId: string; expectedPriorJournalSha256: string}) {
  return runApprovedBoundedStage1(workspace, apiKey, approval, 'item-0001-upload-and-count');
}

export async function runApprovedRemainingStage1(workspace: string, apiKey: string,
  approval: {approvedBy: 'kawafmm'; attemptId: string; expectedPriorJournalSha256: string}) {
  return runApprovedBoundedStage1(workspace, apiKey, approval, 'remaining-four-upload-and-count');
}

async function runApprovedBoundedStage1(workspace: string, apiKey: string,
  approval: {approvedBy: 'kawafmm'; attemptId: string; expectedPriorJournalSha256: string}, scope: BoundedStage1Scope) {
  const remainingOnly = scope === 'remaining-four-upload-and-count';
  check(approval.approvedBy === 'kawafmm', 'one-item-live-approval-required');
  check(Boolean(apiKey.trim()), 'credential-not-configured');
  const journalPath = resolve(workspace, STAGE1_JOURNAL);
  const measurementPath = resolve(workspace, STAGE1_MEASUREMENT);
  const [priorBytes, priorMeasurement, manifestBytes] = await Promise.all([
    readFile(journalPath), readFile(measurementPath), readFile(resolve(workspace, PREPARATION_ROOT, 'job-manifest-v001.json'))]);
  check(byteSha(priorBytes) === approval.expectedPriorJournalSha256, 'one-item-approved-prior-record');
  check(byteSha(manifestBytes) === 'c008579876c1912348bfece9510aefa2fae70babee94e5079724a3d8c86577c3', 'approved-manifest-sha');
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const priceBytes = await readFile(resolve(workspace, manifest.providerSpecPriceSnapshot.path));
  check(byteSha(priceBytes) === manifest.providerSpecPriceSnapshot.fileSha256, 'price-snapshot-sha');
  check(new Date().toISOString().slice(0,10) <= '2026-12-31', 'approved-price-period-ended');
  const preparedJobs = await loadPreparationJobs(workspace);
  check(same(preparedJobs, manifest.jobs), 'manifest-job-binding');
  const jobs = preparedJobs.filter(job => remainingOnly ? (REMAINING_STAGE1_ITEMS as readonly string[]).includes(job.itemId) : job.itemId === 'item-0001');
  if (remainingOnly) assertRemainingStage1Targets(jobs); else assertItem0001Target(jobs);
  await verifyBoundBytes(workspace, jobs);
  for (const job of jobs) {
    const build = JSON.parse(await readFile(resolve(workspace, job.bindings.buildVerification.path), 'utf8'));
    const media = await readFile(resolve(workspace, job.bindings.explorationVideo.path));
    check(media.length === build.bindings.explorationVideo.byteLength && media.toString('ascii',4,8) === 'ftyp', 'media-length-or-mime');
    check(same(buildCandidateVideoRequestTemplateV002(job), manifest.templates.find((t:any) => t.itemId === job.itemId).template), 'template-changed');
  }
  const handle = await open(journalPath, 'a');
  try {
    const execute = remainingOnly ? executeRemainingStage1Attempt : executeItem0001Attempt;
    return await execute(jobs, {...approval, manifestSha256: byteSha(manifestBytes),
      implementationSha256: byteSha(await readFile(resolve(workspace, 'runner/src/candidate-video-understanding-transport-v001.ts')))}, {
      mode: 'live', records: {readJournal: () => readFile(journalPath), readMeasurement: () => readFile(measurementPath),
        appendJournal: async line => { await handle.writeFile(line); await handle.sync(); }},
      clock: () => new Date().toISOString(),
      media: job => { check(remainingOnly ? (REMAINING_STAGE1_ITEMS as readonly string[]).includes(job.itemId) : job.itemId === 'item-0001', 'bounded-other-item-forbidden');
        return readFile(resolve(workspace, job.bindings.explorationVideo.path)); },
      wait: ms => new Promise(ok => { check(ms === 60000, 'one-item-fixed-wait'); setTimeout(ok, ms); }),
      exchange: (request, operation) => {
        check(Object.hasOwn(STAGE1_TIMEOUTS, operation) && !request.url.includes(':generateContent'), 'one-item-inference-forbidden');
        return createDirectRestPort({approvedBy:'kawafmm', approvalReference:`kawafmm-${approval.attemptId}-${scope}`,
          phase:'upload-and-count', manifestSha256:byteSha(manifestBytes), timeoutMs:STAGE1_TIMEOUTS[operation]}, apiKey).exchange(request);
      }});
  } finally { await handle.close(); }
}

// task-013: this path is reserved for a separately approved live invocation. Mock
// tests use an in-memory sink and must never create or populate this record.
export const ITEM0001_INFERENCE_RECORD = `${PREPARATION_ROOT}/item-0001-inference-record-v001.jsonl`;
export const REMAINING_INFERENCE_RECORD = `${PREPARATION_ROOT}/remaining-four-inference-record-v001.jsonl`;
export const REMAINING_THREE_INFERENCE_RECORD = `${PREPARATION_ROOT}/remaining-three-inference-record-v001.jsonl`;
export const ITEM0005_INFERENCE_RECORD = `${PREPARATION_ROOT}/item-0005-inference-record-v001.jsonl`;
const INFERENCE_STAGE1_SHA = '680b4800fb208523ffe9f7ba59d57c69579d2ddf181e89daf342c69c3995bb61';
const INFERENCE_MANIFEST_SHA = 'c008579876c1912348bfece9510aefa2fae70babee94e5079724a3d8c86577c3';
const INFERENCE_PRICE_SHA = '0cabe8a32772cf451378e3aed8ed7a8e4cce6dec37f96928e776af46fc6fb977';
type InferenceStage = 'pre-send-validation' | 'inference-http' | 'provider-response'
  | 'structured-output' | 'local-strict-validation' | 'pts-projection' | 'human-review-interval-derivation';
export type Item0001InferenceApproval = {
  approvedBy: 'mock' | 'kawafmm'; attemptId: string; expectedStage1Sha256: string;
  exactRequestSha256: string; maximumHttp: 1; retry: 0; repair: 0;
  // No new timeout is silently chosen; a future live approval supplies this value.
  timeoutMs: number;
};
type InferenceEvidence = {
  stage1: Buffer; measurement: Buffer; manifest: Buffer; price: Buffer;
  media: Buffer; mapping: Buffer; build: Buffer; implementationSha256: string;
};
export type Item0001InferenceEvent = {
  sequence: number; previousSha256: string | null; attemptId: string; itemId: string;
  timestamp: string; phase: 'boundary' | 'intent' | 'response' | 'usage' | 'validated' | 'projected' | 'complete' | 'failure';
  detail: Record<string, any>; sha256: string;
};
type InferenceDeps = {
  port: HttpPort; clock(): string; evidence(): Promise<InferenceEvidence>;
  records: {read(): Promise<Buffer>; append(line: Buffer): Promise<void>};
  // The live wrapper provides the key only for rejection, never as persisted data.
  containsSecret(raw: Buffer): boolean;
};
class InferencePreSendRejection extends Error {}

function inferenceResponseIsSafe(raw: Buffer, containsSecret: InferenceDeps['containsSecret']) {
  const unsafe = (text: string) => containsSecret(Buffer.from(text))
    || /AIza[\w-]{20,}|authorization\s*[":=]|x-goog-api-key|upload_id=|upload-session/iu.test(text);
  if (unsafe(raw.toString('utf8'))) return false;
  // Decode JSON escapes before secret inspection too, without changing saved bytes.
  const scan = (v: unknown): boolean => {
    if (typeof v === 'string') {
      if (unsafe(v)) return false;
      // Structured output is JSON inside a JSON text part. Inspect decoded values
      // too, before persisting either the raw envelope or its validated output.
      try { const decoded: unknown = JSON.parse(v); return decoded === v || scan(decoded); }
      catch { return true; }
    }
    return Array.isArray(v) ? v.every(scan) : v !== null && typeof v === 'object'
      ? Object.entries(v).every(([k, value]) => !/authorization|x-goog-api-key/iu.test(k) && scan(k) && scan(value)) : true;
  };
  try {
    const envelope = JSON.parse(raw.toString('utf8'));
    if (!scan(envelope)) return false;
    // The parser joins visible parts; secrets split across those parts must not
    // emerge only after the raw response has already been saved.
    return !Array.isArray(envelope?.candidates) || envelope.candidates.every((candidate: any) => {
      const parts = candidate?.content?.parts;
      return !Array.isArray(parts) || scan(parts.filter(p => typeof p?.text === 'string' && !p.thought).map(p => p.text).join(''));
    });
  } catch { return true; }
}

function inferenceUsage(envelope: Record<string, any>, origin: 'mock' | 'live') {
  const u = envelope.usageMetadata;
  const counts = {input: u?.promptTokenCount ?? null, output: u?.candidatesTokenCount ?? null, thinking: u?.thoughtsTokenCount ?? null};
  const completeCounts = Object.values(counts).every(n => Number.isSafeInteger(n) && n >= 0);
  return {providerUsage: u ?? null, ...counts, origin,
    cost: completeCounts ? estimateUsageCost(counts as {input: number; output: number; thinking: number}) : null};
}

/** Format-independent single-use sequencing. A rejected target never grants the
 * next target permission to run; neither historical nor ID mocks may retry it. */
async function executeBoundedInferenceTargets<T>(targets: readonly T[], maximum: number,
  identity: (target: T) => string, execute: (target: T, index: number) => Promise<boolean>) {
  check(Number.isSafeInteger(maximum) && maximum > 0 && targets.length === maximum,
    'bounded-inference-target-count');
  const identities = targets.map(identity);
  check(new Set(identities).size === targets.length, 'bounded-inference-duplicate-target');
  const visited = new Set<string>();
  for (const [index, target] of targets.entries()) {
    check(!visited.has(identities[index]) && visited.size < maximum, 'bounded-inference-no-retry');
    visited.add(identities[index]);
    if (!await execute(target, index)) return false;
  }
  return true;
}

/** Shared envelope decoding, independent of the old numeric and new ID schemas. */
function inferenceVisibleText(envelope: Record<string, any>) {
  check(envelope.modelVersion === MODEL && Array.isArray(envelope.candidates) && envelope.candidates.length === 1,
    'inference-provider-envelope');
  const candidate = object(envelope.candidates[0]);
  check(candidate.finishReason === 'STOP' && candidate.content?.role === 'model', 'inference-not-completed');
  check(Array.isArray(candidate.content.parts) && candidate.content.parts.length > 0, 'inference-missing-parts');
  const visible: string[] = [];
  for (const part of candidate.content.parts) {
    check(part && typeof part.text === 'string' && (part.thought === undefined || typeof part.thought === 'boolean')
      && Object.keys(part).every(k => ['text','thought','thoughtSignature'].includes(k)), 'inference-provider-part');
    if (!part.thought) visible.push(part.text);
  }
  return visible.join('');
}

/** Verify ordered exact bytes and re-derive successful output without any I/O. */
export function validateItem0001InferenceRecord(record: Buffer, job: CandidateVideoJobV002) {
  return validateBoundedItemInferenceRecord(record, job, 'item-0001');
}

function validateBoundedItemInferenceRecord(record: Buffer, job: CandidateVideoJobV002, expectedItemId: string) {
  check(record.length > 0 && record.at(-1) === 10, 'inference-record-incomplete-line');
  const events: Item0001InferenceEvent[] = record.toString('utf8').trimEnd().split('\n').map(line => JSON.parse(line));
  check(Buffer.concat(events.map(json)).equals(record), 'inference-record-noncanonical-bytes');
  let previous: string | null = null; let priorPhase = ''; let terminal = false; let attempt: string | undefined;
  let intent: Item0001InferenceEvent | undefined; let response: Item0001InferenceEvent | undefined;
  const next: Record<string, string> = {boundary: 'intent', intent: 'response', response: 'usage',
    usage: 'validated', validated: 'projected', projected: 'complete'};
  for (const [i, e] of events.entries()) {
    const {sha256, ...content} = e;
    check(!terminal && e.itemId === expectedItemId && e.sequence === i + 1 && e.previousSha256 === previous
      && candidateVideoDigestV002(content) === sha256 && Number.isFinite(Date.parse(e.timestamp)), 'inference-record-chain');
    if (i === 0) {
      check(e.phase === 'boundary' && /^inference-attempt-\d{4}$/u.test(e.attemptId)
        && same(e.detail.targetItems, [expectedItemId]) && e.detail.maximumHttp === 1
        && ['mock','live'].includes(e.detail.origin) && e.detail.retry === 0 && e.detail.repair === 0
        && e.detail.upload === 0 && e.detail.metadataGet === 0 && e.detail.countTokens === 0, 'inference-record-boundary');
      attempt = e.attemptId;
    } else {
      check(e.attemptId === attempt && (e.phase === 'failure' || e.phase === next[priorPhase]), 'inference-record-operation-order');
    }
    if (e.phase === 'intent') {
      check(e.detail.operation === 'inference' && e.detail.counter === 1 && !intent, 'inference-record-http-limit');
      const uri = e.detail.exactRequest.body.contents[0].parts[0].fileData.fileUri;
      const exact = buildExactRequest(job, uri);
      check(same(e.detail.exactRequest, exact.exact) && e.detail.exactRequestSha256 === exact.sha256
        && e.detail.bodySha256 === byteSha(json(exact.exact.body))
        && e.detail.bodyByteLength === json(exact.exact.body).length, 'inference-record-request-bytes');
      intent = e;
    }
    if (e.phase === 'response') {
      check(intent && !response, 'inference-record-response-without-intent');
      if (e.detail.rawResponseBase64 !== null) {
        const raw = Buffer.from(e.detail.rawResponseBase64, 'base64');
        check(raw.toString('base64') === e.detail.rawResponseBase64 && byteSha(raw) === e.detail.rawResponseSha256
          && raw.length === e.detail.rawResponseByteLength, 'inference-record-response-bytes');
      } else check(e.detail.rawOmissionReason === 'secret-like-response-rejected', 'inference-record-raw-omission');
      response = e;
    }
    if (e.phase === 'usage') {
      check(response && response.detail.rawResponseBase64 !== null, 'inference-record-usage-without-raw');
      const envelope = object(JSON.parse(Buffer.from(response.detail.rawResponseBase64, 'base64').toString('utf8')));
      check(same(e.detail, inferenceUsage(envelope, events[0].detail.origin)), 'inference-record-usage-not-reproducible');
    }
    if (e.phase === 'complete') {
      check(intent && response && response.detail.httpStatus >= 200 && response.detail.httpStatus < 300
        && response.detail.rawResponseBase64 !== null && e.detail.actualHttp === 1
        && e.detail.retry === 0 && e.detail.repair === 0 && e.detail.status === 'completed', 'inference-record-completion');
      const canonical = parseInference(Buffer.from(response.detail.rawResponseBase64, 'base64'), job, intent.detail.exactRequestSha256);
      const projections = canonical.observation.roleObservations.flatMap(role => role.intervals.map(interval => ({
        role: role.role, observationId: interval.observationId, projection: projectCandidateIntervalV002(job, interval)})));
      check(canonical.review.status === 'established' && same(e.detail.result,
        {...canonical, origin: events[0].detail.origin, projections, review: canonical.review}), 'inference-record-result-not-reproducible');
      check(same(events.find(v => v.phase === 'validated')?.detail, {status: canonical.status, observation: canonical.observation})
        && same(events.find(v => v.phase === 'projected')?.detail, {mappingBinding: job.bindings.mapping, projections}),
        'inference-record-intermediate-not-reproducible');
      terminal = true;
    }
    if (e.phase === 'failure') {
      check(e.detail.actualHttp === (response ? 1 : intent ? (e.detail.failure.delivery === 'not-sent' ? 0 : 1) : 0)
        && e.detail.failure.retry === 0 && e.detail.failure.repair === 0, 'inference-record-failure-count');
      terminal = true;
    }
    priorPhase = e.phase; previous = sha256;
  }
  return {terminal, actualHttp: events.at(-1)?.detail.actualHttp ?? null, eventCount: events.length};
}

const INFERENCE_PREPARATIONS: Record<string, {attemptId: string; inputTokens: number}> = {
  'item-0001': {attemptId: 'attempt-0005', inputTokens: 32350},
  'item-0002': {attemptId: 'attempt-0006', inputTokens: 32651},
  'item-0003': {attemptId: 'attempt-0006', inputTokens: 32350},
  'item-0004': {attemptId: 'attempt-0006', inputTokens: 36865},
  'item-0005': {attemptId: 'attempt-0006', inputTokens: 32049}
};

function assertInferenceEvidence(job: CandidateVideoJobV002, evidence: InferenceEvidence, now: string, expectedItemId: string) {
  check(job.itemId === expectedItemId && Object.hasOwn(INFERENCE_PREPARATIONS, expectedItemId), 'inference-target-mismatch');
  assertCandidateVideoJobV002(job);
  check(byteSha(evidence.stage1) === INFERENCE_STAGE1_SHA, 'inference-stage1-changed');
  check(byteSha(evidence.measurement) === '2b30a621df6df9004dbede6fa4eef5171db61e61a0681409796bf160cf3a2888', 'inference-measurement-changed');
  check(byteSha(evidence.manifest) === INFERENCE_MANIFEST_SHA && byteSha(evidence.price) === INFERENCE_PRICE_SHA,
    'inference-manifest-or-price-changed');
  const manifest = JSON.parse(evidence.manifest.toString('utf8'));
  check(same(job, manifest.jobs.find((j: CandidateVideoJobV002) => j.itemId === expectedItemId)), 'inference-job-changed');
  for (const [kind, data] of [['explorationVideo', evidence.media], ['mapping', evidence.mapping],
    ['buildVerification', evidence.build]] as const) check(byteSha(data) === job.bindings[kind].fileSha256, 'inference-bound-bytes-changed');
  const build = JSON.parse(evidence.build.toString('utf8'));
  check(build.status === 'passed' && build.itemId === expectedItemId
    && build.bindings.explorationVideo.byteLength === evidence.media.length
    && evidence.media.toString('ascii', 4, 8) === 'ftyp', 'inference-media-binding');
  check(/^[a-f0-9]{64}$/u.test(evidence.implementationSha256), 'inference-implementation-binding');
  const binding = INFERENCE_PREPARATIONS[expectedItemId];
  const history: Stage1Event[] = evidence.stage1.toString('utf8').trimEnd().split('\n').map(line => JSON.parse(line));
  validateStage1Journal(history);
  const prepared = history.find(e => e.phase === 'attempt-measurement' && e.detail.attemptId === binding.attemptId)?.detail.payload;
  check(prepared?.mode === 'live' && prepared.failure === null, 'inference-preparation-not-successful');
  const first = prepared.items.find((i: {itemId: string}) => i.itemId === expectedItemId);
  check(first?.status === 'measured' && first.inputTokens === binding.inputTokens, 'inference-measured-token-binding');
  check(first.active === true && first.uploaded && first.videoSha256 === job.bindings.explorationVideo.fileSha256,
    'inference-item-one-not-ready');
  const events = history.filter(e => e.phase === 'attempt-event' && e.detail.attemptId === binding.attemptId).map(e => e.detail.payload as Stage1Event);
  validateStage1Journal(events);
  const responses = (op: string) => events.filter(e => e.item === expectedItemId && e.phase === 'response' && e.operation === op);
  const finalize = responses('upload-finalize'); const metadata = responses('metadata-get');
  check(finalize.length === 1 && metadata.length === 1, 'inference-file-evidence-missing');
  for (const e of [finalize[0], metadata[0]]) {
    const d = e.detail;
    check(d.httpStatus >= 200 && d.httpStatus < 300 && d.sha256Validation.status === 'passed'
      && d.sha256Diagnostics.digestMatchResult === 'matched'
      && d.sha256Diagnostics.finalDigestLengthBytes === 32
      && ['raw-digest-base64', 'hex-text-base64'].includes(d.sha256Diagnostics.sha256Representation), 'inference-file-integrity');
  }
  const file = metadata[0].detail.fields;
  check(same(file, first.providerFile) && file.state === 'ACTIVE' && file.name === finalize[0].detail.fields.name
    && file.uri === `${ORIGIN}/v1beta/${file.name}` && file.uri === finalize[0].detail.fields.uri
    && file.displayName === expectedItemId && file.mimeType === 'video/mp4' && file.sizeBytes === String(evidence.media.length),
    'inference-active-file-binding');
  const timestamp = Date.parse(now); const expiry = Date.parse(file.expirationTime);
  const price = JSON.parse(evidence.price.toString('utf8'));
  check(Number.isFinite(timestamp) && Number.isFinite(expiry) && timestamp < expiry
    && now.slice(0,10) >= price.checkedOn && now.slice(0,10) <= price.standardPrice.validThrough, 'inference-file-or-price-expired');
  const exact = buildExactRequest(job, file.uri);
  check(same(exact, first.exactInference), 'inference-request-differs-from-measured');
  const counts = responses('count-tokens');
  const countIntent = events.filter(e => e.item === expectedItemId && e.phase === 'intent' && e.operation === 'count-tokens');
  check(counts.length === 1 && counts[0].detail.fields.totalTokens === binding.inputTokens && countIntent.length === 1
    && candidateVideoDigestV002(countIntent[0].detail.request) === first.countTokensRequestSha256
    && same(countIntent[0].detail.request.body, exact.countTokensBody), 'inference-count-binding');
  return {exact, price, file, sourceAttemptId: binding.attemptId};
}

/** A single-use record, never a continuation of the five-item inference loop. */
export async function executeItem0001Inference(jobInput: CandidateVideoJobV002,
  approvalInput: Item0001InferenceApproval, deps: InferenceDeps) {
  return executeBoundedItemInference(jobInput, approvalInput, deps, 'item-0001');
}

/** Shared per-item engine. The caller owns the explicit target, never provider output. */
async function executeBoundedItemInference(jobInput: CandidateVideoJobV002,
  approvalInput: Item0001InferenceApproval, deps: InferenceDeps, expectedItemId: string) {
  const job = structuredClone(jobInput); const approval = structuredClone(approvalInput);
  check(approval.approvedBy === (deps.port.mode === 'mock' ? 'mock' : 'kawafmm'), 'inference-approval-mode');
  check(/^inference-attempt-\d{4}$/u.test(approval.attemptId) && approval.maximumHttp === 1
    && approval.retry === 0 && approval.repair === 0 && Number.isSafeInteger(approval.timeoutMs) && approval.timeoutMs > 0,
    'inference-bounds-not-approved');
  check((await deps.records.read()).length === 0, 'inference-record-already-used-no-retry');
  let expected = Buffer.alloc(0); let broken = false;
  const events: Item0001InferenceEvent[] = [];
  let stage: InferenceStage = 'pre-send-validation'; let actualHttp = 0;
  let delivery: 'not-sent' | 'unknown' | 'response-received' = 'not-sent';
  let evidence: InferenceEvidence | undefined;
  let usage: Record<string, unknown> | null = null;
  let result: Record<string, unknown> | null = null;
  async function append(phase: Item0001InferenceEvent['phase'], detail: Record<string, any>) {
    check(!broken, 'inference-record-unavailable');
    try {
      check((await deps.records.read()).equals(expected), 'inference-record-changed');
      const content = {sequence: events.length + 1, previousSha256: events.at(-1)?.sha256 ?? null,
        attemptId: approval.attemptId, itemId: expectedItemId, timestamp: deps.clock(), phase, detail};
      const event = {...content, sha256: candidateVideoDigestV002(content)};
      const line = json(event);
      const next = Buffer.concat([expected, line]);
      validateBoundedItemInferenceRecord(next, job, expectedItemId);
      await deps.records.append(line);
      check((await deps.records.read()).equals(next), 'inference-record-readback');
      expected = next; events.push(event);
    } catch (error) { broken = true; throw error; }
  }
  try {
    await append('boundary', {origin: deps.port.mode, maximumHttp: 1, retry: 0, repair: 0,
      targetItems: [expectedItemId], upload: 0, metadataGet: 0, countTokens: 0, timeoutMs: approval.timeoutMs});
    evidence = await deps.evidence();
    check(approval.expectedStage1Sha256 === INFERENCE_STAGE1_SHA, 'inference-unapproved-history');
    const {exact, price, file, sourceAttemptId} = assertInferenceEvidence(job, evidence, deps.clock(), expectedItemId);
    check(approval.exactRequestSha256 === exact.sha256, 'inference-exact-request-not-approved');
    const body = json(exact.exact.body);
    check(!deps.containsSecret(body), 'inference-secret-in-request');
    await append('intent', {operation: 'inference', counter: 1, exactRequest: exact.exact,
      exactRequestSha256: exact.sha256, bodySha256: byteSha(body), bodyByteLength: body.length,
      sourceAttemptId, stage1Sha256: byteSha(evidence.stage1), manifestSha256: byteSha(evidence.manifest),
      preSendValidation: {status: 'passed', itemId: job.itemId, providerFileUri: file.uri,
        active: true, uploadIntegrity: 'passed', metadataIntegrity: 'passed', countTokens: 'passed',
        countTokensRequestSha256: candidateVideoDigestV002({method: 'POST',
          url: `${ORIGIN}/v1beta/models/${MODEL}:countTokens`, body: exact.countTokensBody}),
        measuredInputTokens: INFERENCE_PREPARATIONS[expectedItemId].inputTokens},
      implementationSha256: evidence.implementationSha256, mediaSha256: byteSha(evidence.media),
      mappingBinding: job.bindings.mapping, fileExpirationTime: file.expirationTime,
      priceSnapshot: {path: `${PREPARATION_ROOT}/provider-spec-and-price-snapshot-v001.json`,
        sha256: byteSha(evidence.price), checkedOn: price.checkedOn, reference: price.sources.pricing}});
    // Recheck immutable inputs and expiry immediately before the only exchange.
    const latest = await deps.evidence();
    for (const k of ['stage1','measurement','manifest','price','media','mapping','build'] as const)
      check(latest[k].equals(evidence[k]), 'inference-input-changed-before-send');
    check(latest.implementationSha256 === evidence.implementationSha256, 'inference-code-changed-before-send');
    assertInferenceEvidence(job, latest, deps.clock(), expectedItemId);
    assertProviderRequestAllowlist(job, exact.exact.body, file.uri);
    stage = 'inference-http'; check(actualHttp === 0, 'inference-send-limit');
    actualHttp = 1; delivery = 'unknown';
    const response = await deps.port.exchange({method: 'POST', url: exact.exact.url,
      headers: {'Content-Type': 'application/json'}, body});
    delivery = 'response-received';
    const rawSafe = inferenceResponseIsSafe(response.body, deps.containsSecret);
    await append('response', {httpStatus: response.status, rawResponseSha256: byteSha(response.body),
      rawResponseByteLength: response.body.length, rawResponseBase64: rawSafe ? response.body.toString('base64') : null,
      rawOmissionReason: rawSafe ? null : 'secret-like-response-rejected', headerPolicy: 'all-headers-omitted'});
    check(response.status >= 200 && response.status < 300, 'inference-http-failure');
    stage = 'provider-response'; check(rawSafe, 'inference-secret-response');
    const envelope = object(JSON.parse(response.body.toString('utf8')));
    // Preserve provider usage even when later output/strict/projection checks fail.
    usage = inferenceUsage(envelope, deps.port.mode);
    await append('usage', usage);
    const visible = inferenceVisibleText(envelope);
    stage = 'structured-output'; const observation = JSON.parse(visible);
    stage = 'local-strict-validation'; assertCandidateVideoOutputV002(observation, job);
    await append('validated', {status: observation.status, observation});
    stage = 'pts-projection';
    const projections = observation.roleObservations.flatMap(role => role.intervals.map(interval => ({
      role: role.role, observationId: interval.observationId, projection: projectCandidateIntervalV002(job, interval)})));
    await append('projected', {mappingBinding: job.bindings.mapping, projections});
    stage = 'human-review-interval-derivation';
    const review = deriveCandidateVideoReviewV002(job, observation);
    check(review.status === 'established', 'inference-required-review-not-established');
    // Retain the existing provider/usage strict contract as well as the stage-specific checks above.
    stage = 'provider-response'; const canonical = parseInference(response.body, job, exact.sha256);
    result = {...canonical, origin: deps.port.mode, projections, review};
    await append('complete', {status: 'completed', actualHttp, result, retry: 0, repair: 0});
    return {status: 'completed' as const, origin: deps.port.mode, actualHttp, result, usage, failure: null, retry: 0, repair: 0};
  } catch (error) {
    if (error instanceof InferencePreSendRejection) { actualHttp = 0; delivery = 'not-sent'; }
    const failure = {stage, delivery, reason: broken ? 'record-persistence-failure'
      : error instanceof Stage1Timeout ? 'timeout-no-resend' : 'stage-rejected-no-repair', retry: 0, repair: 0};
    if (!broken) await append('failure', {failure, actualHttp, result: null});
    return {status: 'stopped' as const, origin: deps.port.mode, actualHttp, result: null, usage, failure, retry: 0, repair: 0};
  }
}

export type RemainingInferenceApproval = Omit<Item0001InferenceApproval, 'maximumHttp' | 'exactRequestSha256'> & {
  maximumHttp: 4; exactRequests: Array<{itemId: string; sha256: string}>;
};
export type RemainingThreeInferenceApproval = Omit<RemainingInferenceApproval, 'maximumHttp' | 'timeoutMs'> & {
  maximumHttp: 3; timeoutMs: 600000;
};
export type Item0005InferenceApproval = Omit<RemainingThreeInferenceApproval, 'maximumHttp'> & {
  maximumHttp: 1;
};
type BoundedBatchInferenceApproval = RemainingInferenceApproval | RemainingThreeInferenceApproval | Item0005InferenceApproval;
type InferenceScope = {
  targetItems: readonly string[]; maximumHttp: 1 | 3 | 4; timeoutMs: 600000 | null; recordPath: string;
};
const FOUR_INFERENCE_SCOPE: InferenceScope = Object.freeze({targetItems: REMAINING_STAGE1_ITEMS,
  maximumHttp: 4, timeoutMs: null, recordPath: REMAINING_INFERENCE_RECORD});
const THREE_INFERENCE_SCOPE: InferenceScope = Object.freeze({
  targetItems: Object.freeze(['item-0003', 'item-0004', 'item-0005']),
  maximumHttp: 3, timeoutMs: 600000, recordPath: REMAINING_THREE_INFERENCE_RECORD});
const ITEM0005_INFERENCE_SCOPE: InferenceScope = Object.freeze({targetItems: Object.freeze(['item-0005']),
  maximumHttp: 1, timeoutMs: 600000, recordPath: ITEM0005_INFERENCE_RECORD});

function assertInferenceScopeTargets(jobs: CandidateVideoJobV002[], scope: InferenceScope) {
  check(same(jobs.map(job => job.itemId), scope.targetItems), 'exactly-approved-inference-items-in-order-required');
  jobs.forEach(assertCandidateVideoJobV002);
}
type RemainingInferenceEvent = {
  sequence: number; previousSha256: string | null; attemptId: string; timestamp: string;
  phase: 'batch-boundary' | 'item-event' | 'batch-complete' | 'batch-failure';
  detail: Record<string, any>; sha256: string;
};
type RemainingInferenceDeps = Omit<InferenceDeps, 'evidence'> & {
  evidence(job: CandidateVideoJobV002): Promise<InferenceEvidence>;
};

/** One ordered record; nested events are the unchanged single-item engine's proof. */
export function validateRemainingInferenceRecord(record: Buffer, jobs: CandidateVideoJobV002[]) {
  return validateBoundedBatchInferenceRecord(record, jobs, FOUR_INFERENCE_SCOPE);
}

export function validateRemainingThreeInferenceRecord(record: Buffer, jobs: CandidateVideoJobV002[]) {
  return validateBoundedBatchInferenceRecord(record, jobs, THREE_INFERENCE_SCOPE);
}

export function validateItem0005InferenceRecord(record: Buffer, jobs: CandidateVideoJobV002[]) {
  return validateBoundedBatchInferenceRecord(record, jobs, ITEM0005_INFERENCE_SCOPE);
}

function validateBoundedBatchInferenceRecord(record: Buffer, jobs: CandidateVideoJobV002[], scope: InferenceScope) {
  assertInferenceScopeTargets(jobs, scope);
  check(record.length > 0 && record.at(-1) === 10, 'remaining-inference-incomplete-line');
  const events: RemainingInferenceEvent[] = record.toString('utf8').trimEnd().split('\n').map(line => JSON.parse(line));
  check(Buffer.concat(events.map(json)).equals(record), 'remaining-inference-noncanonical');
  const itemEvents: Item0001InferenceEvent[][] = jobs.map(() => []);
  let current = -1; let previous: string | null = null; let terminal = false; let intents = 0;
  const boundary = events[0];
  const completed: Array<{itemId: string; completionSha256: string}> = [];
  for (const [i, event] of events.entries()) {
    const {sha256, ...content} = event;
    check(!terminal && event.sequence === i + 1 && event.previousSha256 === previous
      && candidateVideoDigestV002(content) === sha256 && event.attemptId === boundary.attemptId
      && Number.isFinite(Date.parse(event.timestamp)), 'remaining-inference-chain');
    if (i === 0) {
      check(event.phase === 'batch-boundary' && /^inference-attempt-\d{4}$/u.test(event.attemptId)
        && same(event.detail.targetItems, scope.targetItems) && event.detail.maximumHttp === scope.maximumHttp
        && event.detail.retry === 0 && event.detail.repair === 0 && event.detail.upload === 0
        && event.detail.metadataGet === 0 && event.detail.countTokens === 0
        && ['mock','live'].includes(event.detail.origin)
        && Number.isSafeInteger(event.detail.timeoutMs) && event.detail.timeoutMs > 0
        && (scope.timeoutMs === null || event.detail.timeoutMs === scope.timeoutMs)
        && event.detail.expectedStage1Sha256 === INFERENCE_STAGE1_SHA
        && Array.isArray(event.detail.exactRequests) && event.detail.exactRequests.length === scope.targetItems.length
        && event.detail.exactRequests.every((r: any, index: number) => r.itemId === jobs[index].itemId
          && /^[a-f0-9]{64}$/u.test(r.sha256)), 'remaining-inference-boundary');
    } else if (event.phase === 'item-event') {
      const inner = event.detail.event as Item0001InferenceEvent;
      if (inner.phase === 'boundary') {
        check(current + 1 < scope.targetItems.length && (current === -1 || itemEvents[current].at(-1)?.phase === 'complete'),
          'remaining-inference-order-or-fail-fast');
        current++;
        check(inner.detail.origin === boundary.detail.origin && inner.detail.timeoutMs === boundary.detail.timeoutMs,
          'remaining-inference-item-boundary');
      }
      check(current >= 0 && inner.itemId === jobs[current].itemId && inner.attemptId === event.attemptId,
        'remaining-inference-wrong-item');
      itemEvents[current].push(inner);
      validateBoundedItemInferenceRecord(Buffer.concat(itemEvents[current].map(json)), jobs[current], jobs[current].itemId);
      if (inner.phase === 'intent') {
        intents++;
        check(intents <= scope.maximumHttp && inner.detail.exactRequestSha256 === boundary.detail.exactRequests[current].sha256,
          'remaining-inference-request-or-http-limit');
        const preparation = inner.detail.preSendValidation;
        check(preparation?.status === 'passed' && preparation.itemId === jobs[current].itemId
          && preparation.measuredInputTokens === INFERENCE_PREPARATIONS[jobs[current].itemId].inputTokens
          && preparation.active === true && preparation.uploadIntegrity === 'passed'
          && preparation.metadataIntegrity === 'passed' && preparation.countTokens === 'passed'
          && preparation.providerFileUri === inner.detail.exactRequest.body.contents[0].parts[0].fileData.fileUri,
          'remaining-inference-preparation-proof');
      }
      check(event.detail.communicationCounter === intents, 'remaining-inference-counter');
      if (inner.phase === 'complete') completed.push({itemId: inner.itemId, completionSha256: inner.sha256});
    } else {
      check(event.phase === 'batch-complete' || event.phase === 'batch-failure', 'remaining-inference-phase');
      const last = current >= 0 ? itemEvents[current].at(-1) : undefined;
      const actualHttp = itemEvents.reduce((sum, es) => sum + (es.at(-1)?.detail.actualHttp ?? 0), 0);
      check(event.detail.actualHttp === actualHttp && actualHttp <= scope.maximumHttp && same(event.detail.completed, completed)
        && event.detail.retry === 0 && event.detail.repair === 0, 'remaining-inference-terminal-count');
      if (event.phase === 'batch-complete') check(completed.length === scope.targetItems.length && actualHttp === scope.maximumHttp
        && last?.phase === 'complete', 'remaining-inference-incomplete-success');
      else check(last?.phase === 'failure' && event.detail.failedItem === jobs[current].itemId
        && event.detail.failureSha256 === last.sha256, 'remaining-inference-failure-reference');
      terminal = true;
    }
    previous = sha256;
  }
  return {terminal, communicationCounter: intents, completed, eventCount: events.length};
}

/** Exactly items 2,3,4,5, single use, no preparation port and no continuation. */
export async function executeRemainingInference(jobsInput: CandidateVideoJobV002[],
  approvalInput: RemainingInferenceApproval, deps: RemainingInferenceDeps) {
  return executeBoundedBatchInference(jobsInput, approvalInput, deps, FOUR_INFERENCE_SCOPE);
}

/** Exactly items 3,4,5 at the approved 600-second timeout; never reopens a stopped record. */
export async function executeRemainingThreeInference(jobsInput: CandidateVideoJobV002[],
  approvalInput: RemainingThreeInferenceApproval, deps: RemainingInferenceDeps) {
  return executeBoundedBatchInference(jobsInput, approvalInput, deps, THREE_INFERENCE_SCOPE);
}

/** Single approved target; the same bounded engine and unchanged inference contract. */
export async function executeItem0005Inference(jobsInput: CandidateVideoJobV002[],
  approvalInput: Item0005InferenceApproval, deps: RemainingInferenceDeps) {
  return executeBoundedBatchInference(jobsInput, approvalInput, deps, ITEM0005_INFERENCE_SCOPE);
}

async function executeBoundedBatchInference(jobsInput: CandidateVideoJobV002[],
  approvalInput: BoundedBatchInferenceApproval, deps: RemainingInferenceDeps, scope: InferenceScope) {
  const jobs = structuredClone(jobsInput); const approval = structuredClone(approvalInput);
  assertInferenceScopeTargets(jobs, scope);
  check(approval.approvedBy === (deps.port.mode === 'mock' ? 'mock' : 'kawafmm'), 'remaining-inference-approval-mode');
  check(approval.maximumHttp === scope.maximumHttp && approval.retry === 0 && approval.repair === 0
    && (scope.timeoutMs === null || approval.timeoutMs === scope.timeoutMs),
    'remaining-inference-bounds-not-approved');
  check((await deps.records.read()).length === 0, 'remaining-inference-record-already-used-no-retry');
  let expected = Buffer.alloc(0); let broken = false; let actualHttp = 0; let intents = 0;
  const events: RemainingInferenceEvent[] = []; const sent = new Set<string>();
  const items: Array<{itemId: string; outcome: Awaited<ReturnType<typeof executeBoundedItemInference>>}> = [];
  const completed: Array<{itemId: string; completionSha256: string}> = [];
  let failedItem: string | null = null;
  async function append(phase: RemainingInferenceEvent['phase'], detail: Record<string, any>) {
    try {
      check(!broken && (await deps.records.read()).equals(expected), 'remaining-inference-record-changed');
      const content = {sequence: events.length + 1, previousSha256: events.at(-1)?.sha256 ?? null,
        attemptId: approval.attemptId, timestamp: deps.clock(), phase, detail};
      const event = {...content, sha256: candidateVideoDigestV002(content)};
      const next = Buffer.concat([expected, json(event)]);
      validateBoundedBatchInferenceRecord(next, jobs, scope);
      await deps.records.append(json(event));
      check((await deps.records.read()).equals(next), 'remaining-inference-record-readback');
      expected = next; events.push(event);
    } catch (error) { broken = true; throw error; }
  }
  try {
    await append('batch-boundary', {origin: deps.port.mode, targetItems: [...scope.targetItems],
      maximumHttp: scope.maximumHttp, retry: 0, repair: 0, upload: 0, metadataGet: 0, countTokens: 0,
      timeoutMs: approval.timeoutMs, expectedStage1Sha256: approval.expectedStage1Sha256, exactRequests: approval.exactRequests});
    const finished = await executeBoundedInferenceTargets(jobs, scope.maximumHttp, job => job.itemId, async (job, index) => {
      failedItem = job.itemId;
      let localRecord = Buffer.alloc(0);
      const outcome = await executeBoundedItemInference(job, {...approval, maximumHttp: 1,
        exactRequestSha256: approval.exactRequests[index].sha256}, {
        clock: deps.clock, containsSecret: deps.containsSecret, evidence: () => deps.evidence(structuredClone(job)),
        records: {read: async () => Buffer.from(localRecord), append: async line => {
          const event: Item0001InferenceEvent = JSON.parse(line.toString('utf8'));
          const nextCounter = intents + (event.phase === 'intent' ? 1 : 0);
          await append('item-event', {communicationCounter: nextCounter, event});
          intents = nextCounter; localRecord = Buffer.concat([localRecord, line]);
        }},
        port: {mode: deps.port.mode, exchange: async request => {
          try {
            check(!broken && !sent.has(job.itemId) && actualHttp < scope.maximumHttp
              && request.method === 'POST' && request.url === `${ORIGIN}/v1beta/models/${MODEL}:generateContent`,
              'remaining-inference-send-limit');
            check((await deps.records.read()).equals(expected), 'remaining-inference-record-changed-before-send');
            const intent = events.at(-1)?.detail.event as Item0001InferenceEvent;
            check(intent.itemId === job.itemId && intent.phase === 'intent'
              && intent.detail.exactRequestSha256 === approval.exactRequests[index].sha256
              && byteSha(request.body) === intent.detail.bodySha256, 'remaining-inference-no-durable-intent');
          } catch { throw new InferencePreSendRejection(); }
          sent.add(job.itemId); actualHttp++;
          return deps.port.exchange(request);
        }}
      }, job.itemId);
      items.push({itemId: job.itemId, outcome});
      if (broken) return false;
      const last = events.at(-1)!.detail.event as Item0001InferenceEvent;
      if (outcome.status === 'stopped') {
        await append('batch-failure', {actualHttp, completed, failedItem, failureSha256: last.sha256, retry: 0, repair: 0});
        return false;
      }
      completed.push({itemId: job.itemId, completionSha256: last.sha256});
      return true;
    });
    if (!finished && !broken)
      return {status: 'stopped' as const, origin: deps.port.mode, actualHttp, items, failedItem: failedItem as string | null, retry: 0, repair: 0};
    if (!broken) {
      await append('batch-complete', {actualHttp, completed, retry: 0, repair: 0});
      return {status: 'completed' as const, origin: deps.port.mode, actualHttp, items, failedItem: null, retry: 0, repair: 0};
    }
  } catch { /* Failed persistence or boundary validation never permits another send. */ }
  return {status: 'stopped' as const, origin: deps.port.mode, actualHttp, items, failedItem: failedItem as string | null,
    failure: 'record-or-boundary-rejected-no-resend', retry: 0, repair: 0};
}

async function readInferenceEvidence(workspace: string, job: CandidateVideoJobV002): Promise<InferenceEvidence> {
  return {
    stage1: await readFile(resolve(workspace, STAGE1_JOURNAL)), measurement: await readFile(resolve(workspace, STAGE1_MEASUREMENT)),
    manifest: await readFile(resolve(workspace, PREPARATION_ROOT, 'job-manifest-v001.json')),
    price: await readFile(resolve(workspace, PREPARATION_ROOT, 'provider-spec-and-price-snapshot-v001.json')),
    media: await readFile(resolve(workspace, job.bindings.explorationVideo.path)),
    mapping: await readFile(resolve(workspace, job.bindings.mapping.path)), build: await readFile(resolve(workspace, job.bindings.buildVerification.path)),
    implementationSha256: byteSha(await readFile(resolve(workspace, 'runner/src/candidate-video-understanding-transport-v001.ts')))
  };
}

/** Future explicit live approval only. Lazy exclusive creation at first pre-send record. */
export async function runApprovedRemainingInference(workspace: string, apiKey: string,
  approval: RemainingInferenceApproval & {approvedBy: 'kawafmm'}) {
  return runApprovedBoundedBatchInference(workspace, apiKey, approval, FOUR_INFERENCE_SCOPE);
}

export async function runApprovedRemainingThreeInference(workspace: string, apiKey: string,
  approval: RemainingThreeInferenceApproval & {approvedBy: 'kawafmm'}) {
  return runApprovedBoundedBatchInference(workspace, apiKey, approval, THREE_INFERENCE_SCOPE);
}

/** Separate future live approval only; no record or network activity on import. */
export async function runApprovedItem0005Inference(workspace: string, apiKey: string,
  approval: Item0005InferenceApproval & {approvedBy: 'kawafmm'}) {
  return runApprovedBoundedBatchInference(workspace, apiKey, approval, ITEM0005_INFERENCE_SCOPE);
}

async function runApprovedBoundedBatchInference(workspace: string, apiKey: string,
  approval: BoundedBatchInferenceApproval & {approvedBy: 'kawafmm'}, scope: InferenceScope) {
  check(approval.approvedBy === 'kawafmm' && Boolean(apiKey.trim()), 'inference-live-credential-or-approval-missing');
  const manifest = await readFile(resolve(workspace, PREPARATION_ROOT, 'job-manifest-v001.json'));
  check(byteSha(manifest) === INFERENCE_MANIFEST_SHA, 'inference-manifest-changed');
  const jobs: CandidateVideoJobV002[] = JSON.parse(manifest.toString('utf8')).jobs.filter(
    (job: CandidateVideoJobV002) => scope.targetItems.includes(job.itemId));
  assertInferenceScopeTargets(jobs, scope);
  const path = resolve(workspace, scope.recordPath);
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  const read = async () => {
    try { return await readFile(path); } catch (error) {
      if (!handle && (error as NodeJS.ErrnoException).code === 'ENOENT') return Buffer.alloc(0);
      throw error;
    }
  };
  try {
    return await executeBoundedBatchInference(jobs, approval, {
      port: createDirectRestPort({approvedBy: 'kawafmm', approvalReference: approval.attemptId,
        phase: 'inference', manifestSha256: INFERENCE_MANIFEST_SHA, timeoutMs: approval.timeoutMs}, apiKey),
      clock: () => new Date().toISOString(), evidence: job => readInferenceEvidence(workspace, job),
      containsSecret: raw => raw.includes(Buffer.from(apiKey)), records: {read, append: async line => {
        handle ??= await open(path, 'wx', 0o600);
        await handle.writeFile(line); await handle.sync();
      }}
    }, scope);
  } finally { await handle?.close(); }
}

/** Not called by tests or module import. A new explicit live approval is mandatory. */
export async function runApprovedItem0001Inference(workspace: string, apiKey: string,
  approval: Item0001InferenceApproval & {approvedBy: 'kawafmm'}) {
  check(approval.approvedBy === 'kawafmm' && Boolean(apiKey.trim()), 'inference-live-credential-or-approval-missing');
  const manifestPath = resolve(workspace, PREPARATION_ROOT, 'job-manifest-v001.json');
  const manifestBytes = await readFile(manifestPath);
  check(byteSha(manifestBytes) === INFERENCE_MANIFEST_SHA, 'inference-manifest-changed');
  const job: CandidateVideoJobV002 = JSON.parse(manifestBytes.toString('utf8')).jobs.find((j: CandidateVideoJobV002) => j.itemId === 'item-0001');
  const evidence = () => readInferenceEvidence(workspace, job);
  const port = createDirectRestPort({approvedBy: 'kawafmm', approvalReference: approval.attemptId,
    phase: 'inference', manifestSha256: INFERENCE_MANIFEST_SHA, timeoutMs: approval.timeoutMs}, apiKey);
  const path = resolve(workspace, ITEM0001_INFERENCE_RECORD);
  // Exclusive create is also the cross-process duplicate/retry barrier; never truncate or reuse.
  const handle = await open(path, 'wx', 0o600);
  try {
    return await executeItem0001Inference(job, approval, {port, evidence, clock: () => new Date().toISOString(),
      containsSecret: raw => raw.includes(Buffer.from(apiKey)), records: {read: () => readFile(path),
        append: async line => { await handle.writeFile(line); await handle.sync(); }}});
  } finally { await handle.close(); }
}

// task-027: the new ID contract is a separate input/output contract, not a
// conversion of the historical numeric results. This entry has no live mode,
// credential lookup, preparation calls, file writer, or official-record sink.
const ID_MOCK_ITEMS_V003 = Object.freeze(['item-0001', 'item-0002', 'item-0003', 'item-0004', 'item-0005']);
export type CandidateVideoIdMockPlanV003 = {
  schemaVersion: 'candidate-video-understanding-id-mock-plan-v003';
  origin: 'mock-only'; liveReady: false; maximumMockExchanges: 10; retry: 0; repair: 0;
  upload: 0; metadataGet: 0; countTokens: 0; officialArtifactWrites: 0;
  targets: Array<{itemId: string; condition: CandidateVideoIdConditionV003; inputSha256: string;
    request: CandidateVideoIdRequestV003; exactRequestSha256: string}>;
};
export type CandidateVideoIdMockDepsV003 = {
  port: HttpPort; clock(): string; containsSecret?(raw: Buffer): boolean;
};
type IdMockStageV003 = 'pre-send-validation' | 'inference-exchange' | 'provider-response'
  | 'usage-validation' | 'structured-output' | 'id-validation' | 'evidence-resolution';
type IdMockStopV003 = {itemId: string; condition: CandidateVideoIdConditionV003;
  stage: IdMockStageV003; reason: string};
type IdMockTargetStateV003 = {
  itemId: string; condition: CandidateVideoIdConditionV003;
  delivery: 'not-sent' | 'unknown' | 'response-received';
  acceptance: 'not-evaluated' | 'accepted' | 'rejected';
  usage: ReturnType<typeof inferenceUsage> | null;
  fee: {actualCharge: 'mock-no-charge'; simulatedUsageStatus: 'not-sent' | 'unavailable' | 'incomplete' | 'available';
    simulatedEstimate: ReturnType<typeof estimateUsageCost> | null};
  result: ReturnType<typeof resolveCandidateVideoIdEvidenceV003> | null;
  notSentReason: 'not-yet-run' | 'global-stop' | null;
};
type IdMockEventV003 = {
  sequence: number; previousSha256: string | null; timestamp: string;
  itemId: string; condition: CandidateVideoIdConditionV003;
  phase: 'intent' | 'response' | 'usage' | 'accepted' | 'failure';
  detail: Record<string, unknown>; sha256: string;
};
const usedIdMockPlansV003 = new WeakSet<CandidateVideoIdMockPlanV003>();

function exactIdWireRequestV003(request: CandidateVideoIdRequestV003) {
  return {method: request.method, url: request.url, body: request.body};
}

/** All ten complete requests are fixed before the first mock answer exists.
 * Files references here are explicitly unverified mocks, never live readiness. */
export function buildCandidateVideoIdMockPlanV003(inputs: CandidateVideoIdInputV003[],
  mockFiles: Array<{itemId: string; fileUri: string}>): CandidateVideoIdMockPlanV003 {
  check(same(inputs.map(input => input.itemId), ID_MOCK_ITEMS_V003), 'id-mock-fixed-five-inputs-required');
  inputs.forEach(assertCandidateVideoIdInputV003);
  check(same(mockFiles.map(file => file.itemId), ID_MOCK_ITEMS_V003)
    && new Set(mockFiles.map(file => file.fileUri)).size === 5
    && mockFiles.every(file => same(Object.keys(file).sort(), ['fileUri', 'itemId'])), 'id-mock-media-binding');
  mockFiles.forEach(file => safeUrl(file.fileUri, 'file'));
  return {schemaVersion: 'candidate-video-understanding-id-mock-plan-v003', origin: 'mock-only',
    liveReady: false, maximumMockExchanges: 10, retry: 0, repair: 0,
    upload: 0, metadataGet: 0, countTokens: 0, officialArtifactWrites: 0,
    targets: inputs.flatMap((input, index) => (['A', 'B'] as const).map(condition => {
      const request = buildCandidateVideoIdRequestV003(input, condition,
        condition === 'B' ? mockFiles[index].fileUri : undefined);
      return {itemId: input.itemId, condition, inputSha256: candidateVideoDigestV002(input), request,
        exactRequestSha256: candidateVideoDigestV002(exactIdWireRequestV003(request))};
    }))};
}

function assertCandidateVideoIdMockPlanV003(inputs: CandidateVideoIdInputV003[], plan: CandidateVideoIdMockPlanV003) {
  check(plan && Array.isArray(plan.targets), 'id-mock-plan-required');
  const mockFiles = plan.targets.filter(target => target.condition === 'B').map(target => {
    const parts = object(target.request?.body).contents?.[0]?.parts;
    check(Array.isArray(parts), 'id-mock-request-parts');
    const media = parts.filter(part => part?.fileData);
    check(media.length === 1 && typeof media[0].fileData.fileUri === 'string', 'id-mock-file-reference-required');
    return {itemId: target.itemId, fileUri: media[0].fileData.fileUri as string};
  });
  check(same(plan, buildCandidateVideoIdMockPlanV003(inputs, mockFiles)), 'id-mock-exact-plan-binding');
}

function completeIdMockUsageV003(envelope: Record<string, any>): boolean {
  const u = envelope.usageMetadata;
  return u !== null && typeof u === 'object' && !Array.isArray(u)
    && [u.promptTokenCount, u.candidatesTokenCount, u.thoughtsTokenCount, u.totalTokenCount]
      .every(n => Number.isSafeInteger(n) && n >= 0)
    && u.totalTokenCount === u.promptTokenCount + u.candidatesTokenCount + u.thoughtsTokenCount
    && (u.cachedContentTokenCount === undefined || u.cachedContentTokenCount === 0)
    && (u.toolUsePromptTokenCount === undefined || u.toolUsePromptTokenCount === 0);
}

/** One local mock run, using the same bounded fail-fast controller as historical
 * batches. Unsent targets are retained; receipt, acceptance, stop and mock usage
 * are independent facts. This does not authorize or implement a live A/B run. */
export async function executeCandidateVideoIdMockV003(inputsInput: CandidateVideoIdInputV003[],
  planInput: CandidateVideoIdMockPlanV003, deps: CandidateVideoIdMockDepsV003) {
  // Reject before clock, exchange, secret inspection or any caller callback.
  check(deps.port.mode === 'mock', 'id-mock-live-port-forbidden');
  check(Object.keys(deps).every(key => ['port', 'clock', 'containsSecret'].includes(key)), 'id-mock-no-artifact-sink');
  check(!usedIdMockPlansV003.has(planInput), 'id-mock-plan-already-used-no-retry');
  const inputs = structuredClone(inputsInput); const plan = structuredClone(planInput);
  assertCandidateVideoIdMockPlanV003(inputs, plan);
  usedIdMockPlansV003.add(planInput);
  const port = deps.port; const exchange = port.exchange;
  const containsSecret = deps.containsSecret ?? (() => false);
  const states: IdMockTargetStateV003[] = plan.targets.map(target => ({itemId: target.itemId, condition: target.condition,
    delivery: 'not-sent', acceptance: 'not-evaluated', usage: null,
    fee: {actualCharge: 'mock-no-charge', simulatedUsageStatus: 'not-sent', simulatedEstimate: null},
    result: null, notSentReason: 'not-yet-run'}));
  const events: IdMockEventV003[] = [];
  let mockExchanges = 0;
  let globalStop: IdMockStopV003 | null = null;
  function append(index: number, phase: IdMockEventV003['phase'], detail: Record<string, unknown>) {
    const timestamp = deps.clock();
    check(Number.isFinite(Date.parse(timestamp)), 'id-mock-clock-invalid');
    const content = {sequence: events.length + 1, previousSha256: events.at(-1)?.sha256 ?? null,
      timestamp, itemId: states[index].itemId, condition: states[index].condition, phase, detail: structuredClone(detail)};
    events.push({...content, sha256: candidateVideoDigestV002(content)});
  }
  const completed = await executeBoundedInferenceTargets(plan.targets, plan.maximumMockExchanges,
    target => `${target.itemId}/${target.condition}`, async (target, index) => {
      const state = states[index]; let stage: IdMockStageV003 = 'pre-send-validation';
      try {
        check(globalStop === null && state.delivery === 'not-sent', 'id-mock-terminal-stop');
        const input = inputs.find(value => value.itemId === target.itemId)!;
        const exact = exactIdWireRequestV003(target.request);
        const body = json(exact.body);
        check(candidateVideoDigestV002(input) === target.inputSha256
          && candidateVideoDigestV002(exact) === target.exactRequestSha256, 'id-mock-input-or-request-changed');
        check(inferenceResponseIsSafe(body, containsSecret), 'id-mock-secret-request');
        append(index, 'intent', {origin: 'mock-only', exactRequest: exact,
          exactRequestSha256: target.exactRequestSha256, bodySha256: byteSha(body), bodyByteLength: body.length,
          inputSha256: target.inputSha256, mockExchangeOrdinal: mockExchanges + 1,
          measurement: 'not-run', mediaReference: target.condition === 'B' ? 'unverified-mock-reference' : 'not-provided'});
        check(port.mode === 'mock' && deps.port === port && port.exchange === exchange, 'id-mock-port-changed-before-send');
        stage = 'inference-exchange';
        state.delivery = 'unknown'; state.notSentReason = null;
        state.fee.simulatedUsageStatus = 'unavailable'; mockExchanges++;
        const response = await exchange.call(port, {method: exact.method, url: exact.url,
          headers: {'Content-Type': 'application/json'}, body: Buffer.from(body)});
        state.delivery = 'response-received';
        stage = 'provider-response';
        const raw = Buffer.from(response.body);
        const rawSafe = inferenceResponseIsSafe(raw, containsSecret);
        append(index, 'response', {httpStatus: response.status, rawResponseSha256: byteSha(raw),
          rawResponseByteLength: raw.length, rawResponseBase64: rawSafe ? raw.toString('base64') : null,
          rawOmissionReason: rawSafe ? null : 'secret-like-response-rejected', headerPolicy: 'all-headers-omitted'});
        check(rawSafe, 'id-mock-secret-response');
        // Preserve usage before checking HTTP success or interpreting the answer.
        const envelope = object(JSON.parse(raw.toString('utf8')));
        state.usage = inferenceUsage(envelope, 'mock');
        const completeUsage = completeIdMockUsageV003(envelope);
        state.fee.simulatedUsageStatus = completeUsage ? 'available' : 'incomplete';
        state.fee.simulatedEstimate = completeUsage ? state.usage.cost : null;
        append(index, 'usage', {usage: state.usage, fee: state.fee});
        check(response.status >= 200 && response.status < 300, 'id-mock-http-failure');
        stage = 'usage-validation';
        check(completeUsage, 'id-mock-usage-incomplete');
        stage = 'provider-response';
        const visible = inferenceVisibleText(envelope);
        stage = 'structured-output'; const output: unknown = JSON.parse(visible);
        stage = 'id-validation'; assertCandidateVideoIdOutputV003(output, input, target.condition);
        state.acceptance = 'accepted';
        stage = 'evidence-resolution';
        state.result = resolveCandidateVideoIdEvidenceV003(input, target.condition, output);
        append(index, 'accepted', {observation: output, evidenceResolution: state.result,
          semanticAccuracy: 'not-evaluated', finalSelectionProduced: false});
        return true;
      } catch (error) {
        if (stage === 'structured-output' || stage === 'id-validation') state.acceptance = 'rejected';
        globalStop = {itemId: target.itemId, condition: target.condition, stage,
          reason: error instanceof Stage1Timeout ? 'timeout-no-resend' : 'stage-rejected-no-repair'};
        // Exception/provider free text is not copied into the failure record.
        try { append(index, 'failure', {globalStop, delivery: state.delivery, acceptance: state.acceptance, fee: state.fee}); }
        catch { /* Retain in-memory target state even if a test clock fails. */ }
        return false;
      }
    });
  if (!completed) for (const state of states) if (state.delivery === 'not-sent') state.notSentReason = 'global-stop';
  return {schemaVersion: 'candidate-video-understanding-id-mock-result-v003', origin: 'mock-only',
    status: completed ? 'completed' as const : 'stopped' as const, liveReady: false,
    targets: structuredClone(states), events: structuredClone(events), globalStop: globalStop as IdMockStopV003 | null,
    mockExchanges, actualApiCalls: 0, paidInference: 0, upload: 0, metadataGet: 0, countTokens: 0,
    actualApiCostUsd: 0, officialArtifactWrites: 0, retry: 0, repair: 0};
}

// task-028. One phase engine and append-only proof format serve every approved
// cardinality. The live entry points create their own filesystem/HTTPS adapters;
// mock entry points cannot inject a live port or an arbitrary artifact writer.
type IdArtifactV004 = keyof typeof CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004;
type IdOperationV004 = 'metadata-get' | 'count-tokens' | 'inference';
type IdApprovalV004 = CandidateVideoIdPrepareApprovalV004 | CandidateVideoIdInferenceApprovalV004;
export type CandidateVideoIdEventV004 = {
  schemaVersion: 'candidate-video-understanding-id-event-v004'; sequence: number;
  previousSha256: string | null; timestamp: string; experimentId: string; origin: 'mock' | 'live';
  approvalReference: string; stage: 'prepare' | 'inference';
  phase: 'boundary' | 'intent' | 'response' | 'metadata' | 'requests-fixed' | 'measurement'
    | 'usage' | 'accepted' | 'rejected' | 'complete' | 'failure'
    | 'cache-reassessment-boundary' | 'fee-reassessment' | 'answer-reassessment'
    | 'cache-reassessment-complete' | 'cache-reassessment-failure';
  operation: IdOperationV004 | null; itemId: string | null; condition: CandidateVideoIdConditionV003 | null;
  detail: Record<string, any>; sha256: string;
};
type IdStoreV004 = {
  read(kind: IdArtifactV004): Promise<Buffer | null>;
  create(kind: IdArtifactV004, data: Buffer): Promise<void>;
  append(data: Buffer): Promise<void>;
};
export type CandidateVideoIdMockStoreV004 = IdStoreV004;
type IdMockStoreHooksV004 = {
  beforeCreate?(kind: IdArtifactV004): Promise<void>;
  beforeAppend?(event: CandidateVideoIdEventV004): Promise<void>;
};
const idMockStoresV004 = new WeakSet<IdStoreV004>();
const idArtifactKindsV004 = Object.keys(CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004) as IdArtifactV004[];
const idPricePathV004 = `${PREPARATION_ROOT}/provider-spec-and-price-snapshot-v001.json`;

export function createCandidateVideoIdMemoryStoreMockV004(hooks: IdMockStoreHooksV004 = {}): CandidateVideoIdMockStoreV004 {
  const saved = new Map<IdArtifactV004, Buffer>();
  const store: IdStoreV004 = Object.freeze({
    async read(kind: IdArtifactV004) { const data = saved.get(kind); return data ? Buffer.from(data) : null; },
    async create(kind: IdArtifactV004, data: Buffer) {
      await hooks.beforeCreate?.(kind); check(!saved.has(kind), 'id-artifact-already-exists');
      saved.set(kind, Buffer.from(data));
    },
    async append(data: Buffer) {
      await hooks.beforeAppend?.(JSON.parse(data.toString('utf8')));
      check(saved.has('executionRecord'), 'id-record-not-created');
      saved.set('executionRecord', Buffer.concat([saved.get('executionRecord')!, data]));
    }
  });
  idMockStoresV004.add(store); return store;
}

async function assertIdDirectoryV004(directory: string, anchor: string): Promise<string> {
  const root = await realpath(anchor); const target = resolve(directory);
  check(target.startsWith(root + sep) && target !== root, 'id-artifact-directory-outside-root');
  let current = root;
  for (const part of target.slice(root.length + 1).split(sep)) {
    current = resolve(current, part);
    const stat = await lstat(current);
    check(stat.isDirectory() && !stat.isSymbolicLink(), 'id-artifact-symlink-or-not-directory');
  }
  check(await realpath(target) === target, 'id-artifact-directory-alias'); return target;
}

async function idFileStoreV004(directory: string, hooks: IdMockStoreHooksV004 = {}): Promise<IdStoreV004> {
  const pathFor = (kind: IdArtifactV004) => {
    check(idArtifactKindsV004.includes(kind), 'id-artifact-kind');
    return resolve(directory, basename(CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004[kind]));
  };
  const read = async (kind: IdArtifactV004): Promise<Buffer | null> => {
    const path = pathFor(kind);
    try { const stat = await lstat(path); check(stat.isFile() && !stat.isSymbolicLink(), 'id-artifact-not-regular'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
    return readFile(path);
  };
  return Object.freeze({read,
    async create(kind: IdArtifactV004, data: Buffer) {
      await hooks.beforeCreate?.(kind);
      const handle = await open(pathFor(kind), 'wx', 0o600);
      try { await handle.writeFile(data); await handle.sync(); } finally { await handle.close(); }
      const directoryHandle = await open(directory, 'r');
      try { await directoryHandle.sync(); } finally { await directoryHandle.close(); }
      check((await read(kind))?.equals(data), 'id-created-artifact-readback-failed');
    },
    async append(data: Buffer) {
      await hooks.beforeAppend?.(JSON.parse(data.toString('utf8')));
      check(await read('executionRecord') !== null, 'id-record-not-created');
      // Append only to an existing regular file. Unlike 'a', these flags never
      // recreate a missing record between the existence check and open.
      const handle = await open(pathFor('executionRecord'), fsConstants.O_WRONLY | fsConstants.O_APPEND | fsConstants.O_NOFOLLOW);
      try {
        const written = await handle.write(data);
        check(written.bytesWritten === data.length, 'id-record-partial-append'); await handle.sync();
      } finally { await handle.close(); }
    }
  });
}

/** Only a pre-existing real temporary leaf is accepted; no official path is an
 * argument to this adapter. The four names are reused across mock processes. */
export async function createCandidateVideoIdTemporaryStoreMockV004(directory: string,
  hooks: IdMockStoreHooksV004 = {}): Promise<CandidateVideoIdMockStoreV004> {
  const root = await realpath(tmpdir()); const target = await realpath(directory);
  check(target === resolve(directory) && target.startsWith(root + sep), 'id-mock-store-not-temporary-or-alias');
  const verified = await assertIdDirectoryV004(target, root);
  check(!verified.includes('/workspace/') && !verified.includes('/evals/'), 'id-mock-official-path-forbidden');
  const store = await idFileStoreV004(verified, hooks); idMockStoresV004.add(store); return store;
}

function idTimestampV004(now: string): string {
  check(typeof now === 'string' && /^\d{4}-\d\d-\d\dT[\d:.]+Z$/u.test(now)
    && Number.isFinite(Date.parse(now)), 'id-clock-invalid'); return now;
}
function idKeyV004(target: {itemId: string; condition: CandidateVideoIdConditionV003}) {
  return `${target.itemId}/${target.condition}`;
}
type IdUsageAssessmentV004 = {
  origin: 'mock' | 'live'; providerUsage: any; complete: boolean; estimatedNanoUsd: string | null;
  actualCharge: 'mock-no-charge' | 'not-an-invoice'; priceReference: CandidateVideoIdCostConditionsV004['priceReference'];
  estimateIsGuaranteedCap: false; billingReviewSha256?: string;
  billingBreakdown?: ReturnType<typeof deriveCandidateVideoIdCacheUsageV004>['billingBreakdown'] | null;
  normalizedProviderUsage?: ReturnType<typeof deriveCandidateVideoIdScalarUsageV004>['normalizedProviderUsage'] | null;
  usageNormalization?: ReturnType<typeof deriveCandidateVideoIdScalarUsageV004>['usageNormalization'] | null;
  normalizationReviewSha256?: string;
  feeFailure?: 'unsupported-or-invalid-usage' | null;
};
/** Audit only: reproduce the historical saved decision, including unknown fees.
 * No execution entry point can select this rule for a new inference. */
function idHistoricalUsageV004(envelope: Record<string, any>, origin: 'mock' | 'live',
  cost: CandidateVideoIdCostConditionsV004): IdUsageAssessmentV004 {
  const u = envelope.usageMetadata ?? null;
  const complete = completeIdMockUsageV003(envelope);
  const estimate = complete ? (BigInt(u.promptTokenCount) * BigInt(cost.inputNanoUsdPerToken)
    + BigInt(u.candidatesTokenCount + u.thoughtsTokenCount) * BigInt(cost.outputIncludingThinkingNanoUsdPerToken)).toString() : null;
  return {origin, providerUsage: u, complete, estimatedNanoUsd: estimate,
    actualCharge: origin === 'mock' ? 'mock-no-charge' : 'not-an-invoice',
    priceReference: cost.priceReference, estimateIsGuaranteedCap: false};
}
/** Audit only: reproduce task-032's saved major-field-presence decision. */
function idHistoricalCacheUsageV004(envelope: Record<string, any>, origin: 'mock' | 'live', cost: CandidateVideoIdCostConditionsV004,
  review: CandidateVideoIdCacheBillingReviewV004, requestBody: unknown): IdUsageAssessmentV004 {
  assertCandidateVideoIdCacheBillingReviewV004(review, cost);
  const base = {origin, providerUsage: envelope.usageMetadata ?? null,
    actualCharge: origin === 'mock' ? 'mock-no-charge' as const : 'not-an-invoice' as const,
    priceReference: cost.priceReference, estimateIsGuaranteedCap: false as const,
    billingReviewSha256: candidateVideoDigestV002(review)};
  try {
    const usage = deriveCandidateVideoIdCacheUsageV004(envelope, review, requestBody);
    return {...base, complete: true, estimatedNanoUsd: usage.estimatedNanoUsd,
      billingBreakdown: usage.billingBreakdown, feeFailure: null};
  } catch (error) {
    if (!(error instanceof CandidateVideoUnderstandingContractErrorV001)) throw error;
    return {...base, complete: false, estimatedNanoUsd: null, billingBreakdown: null,
      feeFailure: 'unsupported-or-invalid-usage'};
  }
}
/** All new inference and task-033 local re-evaluation require the reviewed
 * scalar rule. The raw provider metadata is retained independently. */
function idUsageV004(envelope: Record<string, any>, origin: 'mock' | 'live', cost: CandidateVideoIdCostConditionsV004,
  review: CandidateVideoIdCacheBillingReviewV004, scalarReview: CandidateVideoIdUsageScalarReviewV004,
  requestBody: unknown): IdUsageAssessmentV004 {
  assertCandidateVideoIdUsageScalarReviewV004(scalarReview, review, cost);
  const base = {origin, providerUsage: envelope.usageMetadata ?? null,
    actualCharge: origin === 'mock' ? 'mock-no-charge' as const : 'not-an-invoice' as const,
    priceReference: cost.priceReference, estimateIsGuaranteedCap: false as const,
    billingReviewSha256: candidateVideoDigestV002(review), normalizationReviewSha256: candidateVideoDigestV002(scalarReview)};
  try {
    const usage = deriveCandidateVideoIdScalarUsageV004(envelope, review, scalarReview, requestBody);
    return {...base, complete: true, estimatedNanoUsd: usage.estimatedNanoUsd,
      billingBreakdown: usage.billingBreakdown, normalizedProviderUsage: usage.normalizedProviderUsage,
      usageNormalization: usage.usageNormalization, feeFailure: null};
  } catch (error) {
    if (!(error instanceof CandidateVideoUnderstandingContractErrorV001)) throw error;
    return {...base, complete: false, estimatedNanoUsd: null, billingBreakdown: null,
      normalizedProviderUsage: null, usageNormalization: null, feeFailure: 'unsupported-or-invalid-usage'};
  }
}
type IdTargetStateV004 = {
  itemId: string; condition: CandidateVideoIdConditionV003;
  delivery: 'not-sent' | 'unknown' | 'response-received'; acceptance: 'not-evaluated' | 'accepted' | 'rejected';
  usage: ReturnType<typeof idUsageV004> | null; result: ReturnType<typeof resolveCandidateVideoIdEvidenceV003> | null;
  rejection: ReturnType<typeof idRejectedV004> | null;
  feeStatus: 'not-sent' | 'unknown' | 'estimated'; notSentReason: 'not-yet-approved' | 'global-stop' | null;
};
export type CandidateVideoIdCacheReassessmentApprovalV004 = {
  schemaVersion: 'candidate-video-understanding-task-032-cache-reassessment-approval-v001'; workOrderId: 'task-032';
  origin: 'mock' | 'live'; experimentId: string; approvedBy: 'mock' | 'kawafmm'; approvalReference: string;
  expectedRecordSha256: string; expectedRecordByteLength: number; expectedEventCount: 57;
  inputTableSha256: string; planSha256: string;
  originalInferenceApprovalSha256: string; originalInferenceApprovalReference: string; failureEventSha256: string;
  targets: Array<{itemId: string; condition: CandidateVideoIdConditionV003; exactRequestSha256: string;
    intentEventSha256: string; responseEventSha256: string; rawResponseSha256: string; usageEventSha256: string;
    priorEstimatedNanoUsd: string | null}>;
  answerTarget: {itemId: string; condition: CandidateVideoIdConditionV003};
  cacheBillingReview: CandidateVideoIdCacheBillingReviewV004;
  limits: {inference: 0; metadataGet: 0; countTokens: 0; upload: 0; retry: 0; repair: 0; resend: 0;
    maximumNanoUsd: '1000000000'};
};
export type CandidateVideoIdScalarReassessmentApprovalV004 = Omit<CandidateVideoIdCacheReassessmentApprovalV004,
  'schemaVersion' | 'workOrderId' | 'expectedEventCount'> & {
  schemaVersion: 'candidate-video-understanding-task-033-scalar-reassessment-approval-v001'; workOrderId: 'task-033';
  expectedEventCount: 75; usageScalarReview: CandidateVideoIdUsageScalarReviewV004;
};
type IdLocalReassessmentApprovalV004 = CandidateVideoIdCacheReassessmentApprovalV004 | CandidateVideoIdScalarReassessmentApprovalV004;
type IdCacheReassessmentStateV004 = {
  approval: IdLocalReassessmentApprovalV004; originalApproval: CandidateVideoIdInferenceApprovalV004;
  feeTargetsCompleted: number; answerCompleted: boolean; completed: boolean;
};
type IdExecutionProofV004 = {
  origin: 'mock' | 'live'; events: CandidateVideoIdEventV004[]; targets: IdTargetStateV004[];
  measurements: ReturnType<typeof idMeasurementV004>[];
  preparationReferenceCost: ReturnType<typeof idPreparationReferenceCostV004> | null;
  preparationBillingAssessment: ReturnType<typeof deriveCandidateVideoIdPreparationBillingV004> | null;
  requests: CandidateVideoIdFixedRequestV004[]; counts: {metadataGet: number; countTokens: number; inference: number; total: number};
  prepared: boolean; normalPause: boolean; abnormal: boolean; estimatedNanoUsd: string; recordSha256: string;
  phaseApproval: IdApprovalV004 | null; approvalReferences: string[];
  cacheBillingReview: CandidateVideoIdCacheBillingReviewV004 | null;
  usageScalarReview: CandidateVideoIdUsageScalarReviewV004 | null; reassessment: IdCacheReassessmentStateV004 | null;
};
function idMetadataV004(raw: Buffer, expected: CandidateVideoIdFileReferenceV004, now: string) {
  const file = object(JSON.parse(raw.toString('utf8')));
  check(file.name === expected.name && file.uri === expected.uri && file.state === 'ACTIVE'
    && file.mimeType === expected.mimeType && file.sizeBytes === String(expected.byteLength)
    && file.expirationTime === expected.expirationTime
    && Date.parse(expected.expirationTime) > Date.parse(now), 'id-files-metadata-rejected');
  check(validateStage1Sha256(file, expected.mediaSha256, 'metadata-get').status === 'passed', 'id-files-sha-rejected');
  return {origin: null, file: expected, active: true};
}
function idMeasurementV004(raw: Buffer, target: CandidateVideoIdFixedRequestV004, origin: 'mock' | 'live',
  cost: CandidateVideoIdPriceConditionsV004) {
  const root = object(JSON.parse(raw.toString('utf8'))); integer(root.totalTokens);
  check(root.totalTokens > 0, 'id-count-tokens-empty');
  const inputNanoUsd = BigInt(root.totalTokens) * BigInt(cost.inputNanoUsdPerToken);
  const configuredResponseTokenAllowance = target.request.body.generationConfig.maxOutputTokens;
  const configuredResponseAllowanceNanoUsd = BigInt(configuredResponseTokenAllowance) * BigInt(cost.outputIncludingThinkingNanoUsdPerToken);
  return {origin, itemId: target.itemId, condition: target.condition, exactRequestSha256: target.exactRequestSha256,
    countTokensResponseSha256: byteSha(raw), totalTokens: root.totalTokens as number,
    measurementKind: origin === 'mock' ? 'simulated-new-complete-request' : 'provider-new-complete-request',
    referenceCost: {origin, kind: origin === 'mock' ? 'simulated-reference-estimate' : 'measured-input-reference-estimate',
      priceReference: cost.priceReference, inputNanoUsdPerToken: cost.inputNanoUsdPerToken,
      outputIncludingThinkingNanoUsdPerToken: cost.outputIncludingThinkingNanoUsdPerToken,
      configuredResponseTokenAllowance, inputNanoUsd: inputNanoUsd.toString(),
      configuredResponseAllowanceNanoUsd: configuredResponseAllowanceNanoUsd.toString(),
      inputPlusConfiguredResponseAllowanceNanoUsd: (inputNanoUsd + configuredResponseAllowanceNanoUsd).toString(),
      thinkingTokenCount: null, preparationChargeNanoUsd: null, isInvoice: false, guaranteedTotalCap: false,
      excludesUnmeasuredThinkingAndPreparationBilling: true}};
}
function idPreparationReferenceCostV004(measurements: ReturnType<typeof idMeasurementV004>[],
  cost: CandidateVideoIdPriceConditionsV004) {
  check(measurements.length === 10 && measurements.every(measurement => measurement.origin === measurements[0].origin
    && same(measurement.referenceCost.priceReference, cost.priceReference)), 'id-ten-cost-measurements-required');
  const inputNanoUsd = measurements.reduce((sum, measurement) => sum + BigInt(measurement.referenceCost.inputNanoUsd), 0n);
  const configuredResponseAllowanceNanoUsd = measurements.reduce((sum, measurement) =>
    sum + BigInt(measurement.referenceCost.configuredResponseAllowanceNanoUsd), 0n);
  return {origin: measurements[0].origin, priceReference: cost.priceReference, completeRequestCount: measurements.length,
    inputNanoUsd: inputNanoUsd.toString(), configuredResponseAllowanceNanoUsd: configuredResponseAllowanceNanoUsd.toString(),
    inputPlusConfiguredResponseAllowanceNanoUsd: (inputNanoUsd + configuredResponseAllowanceNanoUsd).toString(),
    thinkingTokenCount: null, preparationChargeNanoUsd: null, isInvoice: false, guaranteedTotalCap: false,
    excludesUnmeasuredThinkingAndPreparationBilling: true};
}
class IdObservationRejectedV004 extends Error {
  constructor(readonly stage: 'structured-output' | 'local-output-contract', readonly reason: string) {
    super(reason);
  }
}
function idAcceptedV004(raw: Buffer, input: CandidateVideoIdInputV003, condition: CandidateVideoIdConditionV003) {
  // Invalid local input, response provenance and evidence resolution are never
  // model-answer failures. Keep all three outside the narrow answer catches.
  assertCandidateVideoIdInputV003(input);
  check(condition === 'A' || condition === 'B', 'id-answer-condition-invalid');
  const envelope = object(JSON.parse(raw.toString('utf8')));
  check(envelope.modelVersion === MODEL, 'id-response-model-mismatch');
  let visible: string;
  try { visible = inferenceVisibleText(envelope); }
  catch (error) {
    if (error instanceof Error && Object.getPrototypeOf(error) === Error.prototype
      && ['inference-provider-envelope', 'invalid-object', 'inference-not-completed',
      'inference-missing-parts', 'inference-provider-part'].includes(error.message))
      throw new IdObservationRejectedV004('structured-output', error.message);
    throw error;
  }
  let value: unknown;
  try { value = JSON.parse(visible); }
  catch (error) {
    if (error instanceof SyntaxError) throw new IdObservationRejectedV004('structured-output', 'answer-json-not-established');
    throw error;
  }
  try {
    assertCandidateVideoIdOutputV003(value, input, condition);
  } catch (error) {
    if (error instanceof CandidateVideoUnderstandingContractErrorV001)
      throw new IdObservationRejectedV004('local-output-contract', error.message);
    throw error;
  }
  return {observation: value, evidenceResolution: resolveCandidateVideoIdEvidenceV003(input, condition, value),
    semanticAccuracy: 'not-evaluated', finalSelectionProduced: false};
}
function idRejectedV004(raw: Buffer, error: IdObservationRejectedV004,
  usage: ReturnType<typeof idUsageV004>, cumulativeEstimatedNanoUsd: string) {
  const envelope = object(JSON.parse(raw.toString('utf8')));
  // The unchanged candidate payload is the answer, including incomplete or
  // absent structured text. It is evidence, never an admitted observation.
  return {status: 'answer-contract-not-established', rawResponseSha256: byteSha(raw),
    answer: {candidates: envelope.candidates ?? null, promptFeedback: envelope.promptFeedback ?? null},
    rejection: {stage: error.stage, reason: error.reason}, usage, cumulativeEstimatedNanoUsd,
    observation: null, evidenceResolution: null, semanticAccuracy: 'not-evaluated', finalSelectionProduced: false,
    continuation: 'next-unexecuted-approved-condition-with-unchanged-request', retry: 0, repair: 0, resend: 0};
}
function idExactOperationV004(operation: IdOperationV004, target: CandidateVideoIdFixedRequestV004 | null,
  file: CandidateVideoIdFileReferenceV004 | null) {
  if (operation === 'metadata-get') return {method: 'GET' as const, url: file!.uri, body: null};
  const exact = exactIdWireRequestV003(target!.request);
  return operation === 'inference' ? exact : {method: 'POST' as const,
    url: `${ORIGIN}/v1beta/models/${MODEL}:countTokens`,
    body: {generateContentRequest: {model: `models/${MODEL}`, ...exact.body}}};
}

function idSavedInferenceV004(events: CandidateVideoIdEventV004[], target: {itemId: string; condition: CandidateVideoIdConditionV003}) {
  const selected = events.filter(event => event.operation === 'inference'
    && event.itemId === target.itemId && event.condition === target.condition);
  const one = (phase: 'intent' | 'response' | 'usage') => {
    const matches = selected.filter(event => event.phase === phase);
    check(matches.length === 1, 'id-reassessment-source-not-unique'); return matches[0];
  };
  const intent = one('intent'), response = one('response'), usage = one('usage');
  check(response.detail.httpStatus >= 200 && response.detail.httpStatus < 300
    && typeof response.detail.rawResponseBase64 === 'string' && response.detail.rawOmissionReason === null,
  'id-reassessment-requires-successful-saved-raw');
  const raw = Buffer.from(response.detail.rawResponseBase64, 'base64');
  check(byteSha(raw) === response.detail.rawResponseSha256 && raw.length === response.detail.rawResponseByteLength
    && raw.toString('base64') === response.detail.rawResponseBase64 && inferenceResponseIsSafe(raw, () => false),
  'id-reassessment-raw-invalid');
  return {intent, response, usage, raw};
}
function idUnexecutedTargetsV004(original: CandidateVideoIdInferenceApprovalV004,
  events: CandidateVideoIdEventV004[], states: IdTargetStateV004[]) {
  // An intent is consumed even if a subsequent pre-send failure says not-sent.
  // An invalid answer likewise never restores the once-only send entitlement.
  const consumed = new Set(events.filter(event => event.phase === 'intent' && event.operation === 'inference')
    .map(event => `${event.itemId}/${event.condition}`));
  for (const state of states) if (state.delivery !== 'not-sent' || state.acceptance !== 'not-evaluated') consumed.add(idKeyV004(state));
  return original.targets.filter(target => !consumed.has(idKeyV004(target))).map(target => ({...target}));
}
function idReassessmentApprovalFromProofV004(record: Buffer, table: CandidateVideoIdInputTableV004,
  plan: CandidateVideoIdExecutionPlanV004, proof: IdExecutionProofV004,
  context: {approvedBy: 'mock' | 'kawafmm'; approvalReference: string; checkedAt: string}): CandidateVideoIdCacheReassessmentApprovalV004 {
  const original = proof.phaseApproval, failure = proof.events.at(-1);
  check(context.approvedBy === (table.origin === 'live' ? 'kawafmm' : 'mock')
    && typeof context.approvalReference === 'string' && context.approvalReference.trim().length > 0
    && !proof.approvalReferences.includes(context.approvalReference), 'id-reassessment-approval-required');
  idTimestampV004(context.checkedAt);
  check(proof.prepared && proof.abnormal && !proof.normalPause && proof.reassessment === null
    && proof.cacheBillingReview === null && proof.events.length === 57
    && original?.phase === 'inference' && original.targets.length === plan.targets.length
    && same(original.targets.map(({itemId, condition}) => ({itemId, condition})), plan.targets)
    && proof.counts.inference === 2 && proof.counts.metadataGet === 5 && proof.counts.countTokens === 10
    && failure?.phase === 'failure' && failure.operation === 'inference'
    && failure.itemId === 'item-0001' && failure.condition === 'B'
    && failure.detail.reason === 'response-rejected-no-repair' && failure.detail.delivery === 'response-received'
    && failure.detail.recordPolicy === 'terminal-no-resume', 'id-reassessment-not-approved-cache-stop');
  if (table.origin === 'live') check(record.length === 2876941
    && byteSha(record) === '4e35677e0960369b4f27c3281d7ba1fb533c593f8ddcb4b307a33d1a1cad3399',
  'id-task032-stopped-evidence-not-approved');
  const sent = proof.targets.filter(state => state.delivery !== 'not-sent');
  check(same(sent.map(({itemId, condition}) => ({itemId, condition})),
    [{itemId: 'item-0001', condition: 'A'}, {itemId: 'item-0001', condition: 'B'}])
    && sent[0].acceptance === 'rejected' && sent[0].usage?.complete === true
    && sent[1].acceptance === 'not-evaluated' && sent[1].usage?.complete === false
    && sent[1].usage?.estimatedNanoUsd === null, 'id-reassessment-prior-status-invalid');
  const review = createCandidateVideoIdCacheBillingReviewV004({origin: table.origin, experimentId: table.experimentId,
    approvalReference: context.approvalReference, checkedAt: context.checkedAt});
  assertCandidateVideoIdCacheBillingReviewV004(review, original.costConditions, {origin: table.origin,
    experimentId: table.experimentId, approvalReference: context.approvalReference, now: context.checkedAt});
  const targets = sent.map(state => {
    const source = idSavedInferenceV004(proof.events, state);
    const fixed = proof.requests.find(request => idKeyV004(request) === idKeyV004(state))!;
    const envelope = object(JSON.parse(source.raw.toString('utf8')));
    const usage = idHistoricalCacheUsageV004(envelope, table.origin, original.costConditions, review, fixed.request.body);
    check(usage.complete && envelope.modelVersion === MODEL
      && same(source.usage.detail.usage.providerUsage, envelope.usageMetadata), 'id-reassessment-unresolved-usage-or-model');
    if (state.usage!.estimatedNanoUsd !== null) check(usage.estimatedNanoUsd === state.usage!.estimatedNanoUsd,
      'id-reassessment-known-fee-mismatch');
    else check(envelope.usageMetadata.cachedContentTokenCount > 0, 'id-reassessment-not-cache-fee-unknown');
    return {itemId: state.itemId, condition: state.condition, exactRequestSha256: fixed.exactRequestSha256,
      intentEventSha256: source.intent.sha256, responseEventSha256: source.response.sha256,
      rawResponseSha256: source.response.detail.rawResponseSha256 as string, usageEventSha256: source.usage.sha256,
      priorEstimatedNanoUsd: state.usage!.estimatedNanoUsd};
  });
  return {schemaVersion: 'candidate-video-understanding-task-032-cache-reassessment-approval-v001', workOrderId: 'task-032',
    origin: table.origin, experimentId: table.experimentId, approvedBy: context.approvedBy,
    approvalReference: context.approvalReference, expectedRecordSha256: byteSha(record), expectedRecordByteLength: record.length,
    expectedEventCount: 57, inputTableSha256: candidateVideoDigestV002(table), planSha256: candidateVideoDigestV002(plan),
    originalInferenceApprovalSha256: candidateVideoDigestV002(original), originalInferenceApprovalReference: original.approvalReference,
    failureEventSha256: failure.sha256, targets, answerTarget: {itemId: failure.itemId!, condition: failure.condition!},
    cacheBillingReview: review,
    limits: {inference: 0, metadataGet: 0, countTokens: 0, upload: 0, retry: 0, repair: 0, resend: 0,
      maximumNanoUsd: '1000000000'}};
}

/** Pure authorization construction, bound to the already approved stopped
 * bytes. This does not append events, inspect credentials or send a request. */
export function buildCandidateVideoIdCacheReassessmentApprovalV004(record: Buffer, table: CandidateVideoIdInputTableV004,
  plan: CandidateVideoIdExecutionPlanV004,
  context: {approvedBy: 'mock' | 'kawafmm'; approvalReference: string; checkedAt: string}) {
  return idReassessmentApprovalFromProofV004(record, table, plan,
    inspectCandidateVideoIdExecutionRecordV004(record, table, plan), context);
}

function idScalarReassessmentApprovalFromProofV004(record: Buffer, table: CandidateVideoIdInputTableV004,
  plan: CandidateVideoIdExecutionPlanV004, proof: IdExecutionProofV004,
  context: {approvedBy: 'mock' | 'kawafmm'; approvalReference: string; checkedAt: string}): CandidateVideoIdScalarReassessmentApprovalV004 {
  const original = proof.reassessment?.originalApproval, failure = proof.events.at(-1);
  check(context.approvedBy === (table.origin === 'live' ? 'kawafmm' : 'mock')
    && typeof context.approvalReference === 'string' && context.approvalReference.trim().length > 0
    && !proof.approvalReferences.includes(context.approvalReference), 'id-scalar-reassessment-approval-required');
  idTimestampV004(context.checkedAt);
  check(proof.prepared && proof.abnormal && !proof.normalPause && proof.events.length === 75
    && proof.reassessment?.completed && proof.reassessment.approval.workOrderId === 'task-032'
    && proof.cacheBillingReview !== null && proof.usageScalarReview === null
    && original?.phase === 'inference' && original.targets.length === plan.targets.length
    && same(original.targets.map(({itemId, condition}) => ({itemId, condition})), plan.targets)
    && proof.counts.inference === 5 && proof.counts.metadataGet === 5 && proof.counts.countTokens === 10
    && failure?.phase === 'failure' && failure.operation === 'inference'
    && failure.itemId === 'item-0003' && failure.condition === 'A'
    && failure.detail.reason === 'response-rejected-no-repair' && failure.detail.delivery === 'response-received'
    && failure.detail.recordPolicy === 'terminal-no-resume', 'id-scalar-reassessment-not-approved-stop');
  if (table.origin === 'live') check(record.length === 3571948
    && byteSha(record) === '6c479af89e26418d25a5eadc37b072e76f58d217a385a22e114151188041b996',
  'id-task033-stopped-evidence-not-approved');
  const remaining = idUnexecutedTargetsV004(original, proof.events, proof.targets);
  const consumed = original.targets.filter(target => !remaining.some(value => idKeyV004(value) === idKeyV004(target)));
  check(consumed.length === proof.counts.inference && consumed.length === 5, 'id-scalar-consumed-count-mismatch');
  const cacheBillingReview = createCandidateVideoIdCacheBillingReviewV004({origin: table.origin,
    experimentId: table.experimentId, approvalReference: context.approvalReference, checkedAt: context.checkedAt});
  const usageScalarReview = createCandidateVideoIdUsageScalarReviewV004({origin: table.origin,
    experimentId: table.experimentId, approvalReference: context.approvalReference, checkedAt: context.checkedAt}, cacheBillingReview);
  assertCandidateVideoIdUsageScalarReviewV004(usageScalarReview, cacheBillingReview, original.costConditions,
    {origin: table.origin, experimentId: table.experimentId, approvalReference: context.approvalReference, now: context.checkedAt});
  const answerTarget = {itemId: failure.itemId, condition: failure.condition};
  const targets: CandidateVideoIdScalarReassessmentApprovalV004['targets'] = [];
  let knownSubtotal = 0n;
  for (const target of consumed) {
    const state = proof.targets.find(value => idKeyV004(value) === idKeyV004(target))!;
    const source = idSavedInferenceV004(proof.events, target);
    const fixed = proof.requests.find(value => idKeyV004(value) === idKeyV004(target))!;
    const envelope = object(JSON.parse(source.raw.toString('utf8')));
    const usage = idUsageV004(envelope, table.origin, original.costConditions, cacheBillingReview,
      usageScalarReview, fixed.request.body);
    check(usage.complete && usage.estimatedNanoUsd !== null && envelope.modelVersion === MODEL
      && same(source.usage.detail.usage.providerUsage, envelope.usageMetadata), 'id-scalar-source-usage-or-model-invalid');
    if (idKeyV004(target) === idKeyV004(answerTarget)) {
      check(state.delivery === 'response-received' && state.acceptance === 'not-evaluated'
        && state.feeStatus === 'unknown' && state.usage?.complete === false && state.usage.estimatedNanoUsd === null
        && !Object.hasOwn(envelope.usageMetadata, 'candidatesTokenCount')
        && usage.normalizedProviderUsage?.candidatesTokenCount === 0, 'id-scalar-not-approved-missing-output-stop');
      targets.push({itemId: target.itemId, condition: target.condition, exactRequestSha256: fixed.exactRequestSha256,
        intentEventSha256: source.intent.sha256, responseEventSha256: source.response.sha256,
        rawResponseSha256: source.response.detail.rawResponseSha256, usageEventSha256: source.usage.sha256,
        priorEstimatedNanoUsd: null});
    } else {
      check(state.delivery === 'response-received' && state.acceptance !== 'not-evaluated' && state.usage?.complete
        && state.feeStatus === 'estimated' && state.usage.estimatedNanoUsd === usage.estimatedNanoUsd,
      'id-scalar-established-fee-or-verdict-changed');
      knownSubtotal += BigInt(usage.estimatedNanoUsd);
    }
  }
  check(targets.length === 1 && knownSubtotal.toString() === proof.estimatedNanoUsd,
    'id-scalar-target-or-single-charge-subtotal-mismatch');
  return {schemaVersion: 'candidate-video-understanding-task-033-scalar-reassessment-approval-v001', workOrderId: 'task-033',
    origin: table.origin, experimentId: table.experimentId, approvedBy: context.approvedBy,
    approvalReference: context.approvalReference, expectedRecordSha256: byteSha(record), expectedRecordByteLength: record.length,
    expectedEventCount: 75, inputTableSha256: candidateVideoDigestV002(table), planSha256: candidateVideoDigestV002(plan),
    originalInferenceApprovalSha256: candidateVideoDigestV002(original), originalInferenceApprovalReference: original.approvalReference,
    failureEventSha256: failure.sha256, targets, answerTarget, cacheBillingReview, usageScalarReview,
    limits: {inference: 0, metadataGet: 0, countTokens: 0, upload: 0, retry: 0, repair: 0, resend: 0, maximumNanoUsd: '1000000000'}};
}

export function buildCandidateVideoIdScalarReassessmentApprovalV004(record: Buffer, table: CandidateVideoIdInputTableV004,
  plan: CandidateVideoIdExecutionPlanV004,
  context: {approvedBy: 'mock' | 'kawafmm'; approvalReference: string; checkedAt: string}) {
  return idScalarReassessmentApprovalFromProofV004(record, table, plan,
    inspectCandidateVideoIdExecutionRecordV004(record, table, plan), context);
}

export function deriveCandidateVideoIdRemainingInferenceApprovalV004(record: Buffer, table: CandidateVideoIdInputTableV004,
  plan: CandidateVideoIdExecutionPlanV004, context: {approvedBy: 'mock' | 'kawafmm'; approvalReference: string}) {
  const proof = inspectCandidateVideoIdExecutionRecordV004(record, table, plan);
  check(proof.normalPause && !proof.abnormal && proof.reassessment?.completed && proof.cacheBillingReview,
    'id-reassessment-must-complete-before-resume');
  const original = proof.reassessment.originalApproval;
  const targets = idUnexecutedTargetsV004(original, proof.events, proof.targets);
  check(proof.targets.filter(state => !targets.some(target => idKeyV004(target) === idKeyV004(state)))
    .every(state => state.usage?.complete && state.usage.estimatedNanoUsd !== null), 'id-resume-consumed-fee-unknown');
  const approval: CandidateVideoIdInferenceApprovalV004 = {...structuredClone(original), approvedBy: context.approvedBy,
    approvalReference: context.approvalReference, expectedRecordSha256: byteSha(record), targets,
    limits: {metadataGet: 0, countTokens: 0, inference: targets.length, perConditionInference: 1, total: targets.length}};
  check(!proof.approvalReferences.includes(context.approvalReference), 'id-resume-approval-already-used');
  assertCandidateVideoIdInferenceApprovalV004(approval, table, plan, proof.requests, byteSha(record));
  assertCandidateVideoIdInferenceCostContinuationV004(approval.costConditions, proof.estimatedNanoUsd);
  return approval;
}

function idFeeReassessmentDetailV004(state: IdCacheReassessmentStateV004,
  events: CandidateVideoIdEventV004[], targets: IdTargetStateV004[], requests: CandidateVideoIdFixedRequestV004[]) {
  const target = state.approval.targets[state.feeTargetsCompleted];
  check(target, 'id-reassessment-fees-already-complete');
  const saved = idSavedInferenceV004(events, target), fixed = requests.find(request => idKeyV004(request) === idKeyV004(target))!;
  const envelope = object(JSON.parse(saved.raw.toString('utf8')));
  const usage = state.approval.workOrderId === 'task-033'
    ? idUsageV004(envelope, state.approval.origin, state.originalApproval.costConditions,
      state.approval.cacheBillingReview, state.approval.usageScalarReview, fixed.request.body)
    : idHistoricalCacheUsageV004(envelope, state.approval.origin, state.originalApproval.costConditions,
      state.approval.cacheBillingReview, fixed.request.body);
  check(usage.complete && usage.estimatedNanoUsd !== null, 'id-reassessment-fee-still-unknown');
  check(target.priorEstimatedNanoUsd === null || target.priorEstimatedNanoUsd === usage.estimatedNanoUsd,
    'id-reassessment-established-fee-changed');
  const cumulative = targets.reduce((sum, existing) => sum + BigInt(idKeyV004(existing) === idKeyV004(target)
    ? usage.estimatedNanoUsd! : existing.usage?.estimatedNanoUsd ?? '0'), 0n);
  const unexecuted = idUnexecutedTargetsV004(state.originalApproval, events, targets);
  const unknownConsumedFeeCount = targets.filter(existing => idKeyV004(existing) !== idKeyV004(target)
    && !unexecuted.some(value => idKeyV004(value) === idKeyV004(existing))
    && (!existing.usage?.complete || existing.usage.estimatedNanoUsd === null)).length;
  return {source: target, usage, priorEstimateMatches: target.priorEstimatedNanoUsd === null ? null : true,
    cumulativeEstimatedNanoUsd: cumulative.toString(), unknownConsumedFeeCount,
    allConsumedFeesKnown: unknownConsumedFeeCount === 0, accounting: 'one-assessment-per-original-send',
    additionalInferenceCount: 0, explicitCacheStorageEvidence: 'no-creation-operation-or-reference-in-fixed-requests'};
}
function idAnswerReassessmentDetailV004(state: IdCacheReassessmentStateV004, events: CandidateVideoIdEventV004[],
  targets: IdTargetStateV004[], table: CandidateVideoIdInputTableV004, cumulative: string) {
  const target = state.approval.answerTarget, source = idSavedInferenceV004(events, target);
  const usage = targets.find(existing => idKeyV004(existing) === idKeyV004(target))!.usage!;
  check(state.feeTargetsCompleted === state.approval.targets.length && !state.answerCompleted && usage.complete,
    'id-reassessment-answer-before-fees-or-duplicate');
  assertCandidateVideoIdInferenceCostContinuationV004(state.originalApproval.costConditions, cumulative);
  try {
    const result = idAcceptedV004(source.raw, table.inputs.find(input => input.itemId === target.itemId)!, target.condition);
    return {verdict: 'accepted' as const, result, rawResponseSha256: byteSha(source.raw), additionalInferenceCount: 0};
  } catch (error) {
    if (!(error instanceof IdObservationRejectedV004)) throw error;
    return {verdict: 'rejected' as const, result: idRejectedV004(source.raw, error, usage, cumulative),
      rawResponseSha256: byteSha(source.raw), additionalInferenceCount: 0};
  }
}
function idReassessmentCompleteDetailV004(state: IdCacheReassessmentStateV004,
  events: CandidateVideoIdEventV004[], targets: IdTargetStateV004[], inferenceCount: number, cumulative: string) {
  check(state.feeTargetsCompleted === state.approval.targets.length && state.answerCompleted,
    'id-reassessment-incomplete');
  assertCandidateVideoIdInferenceCostContinuationV004(state.originalApproval.costConditions, cumulative);
  const remaining = idUnexecutedTargetsV004(state.originalApproval, events, targets);
  return {status: 'saved-answer-reevaluated-ready-for-original-unexecuted-conditions',
    originalInferenceApprovalSha256: state.approval.originalInferenceApprovalSha256,
    preservedRecordSha256: state.approval.expectedRecordSha256, preservedRecordByteLength: state.approval.expectedRecordByteLength,
    cumulativeEstimatedNanoUsd: cumulative, maximumNanoUsd: state.originalApproval.costConditions.maximumNanoUsd,
    consumedTargets: state.originalApproval.targets.filter(target => !remaining.some(value => idKeyV004(value) === idKeyV004(target))),
    remainingTargets: remaining, inferenceCount, additionalInferenceCount: 0,
    actualApiCalls: 0, simulatedApiCalls: 0, retry: 0, repair: 0, resend: 0};
}

/** Strict replay derives receipt, admission and measurements from saved bytes.
 * An unterminated phase is abnormal, even if no send could be proven. Its intent
 * consumes the target, with unknown delivery/fee; approval cannot retry it. */
export function inspectCandidateVideoIdExecutionRecordV004(record: Buffer, table: CandidateVideoIdInputTableV004,
  plan: CandidateVideoIdExecutionPlanV004): IdExecutionProofV004 {
  assertCandidateVideoIdExecutionPlanV004(plan, table);
  const requests = buildCandidateVideoIdFixedRequestsV004(table, plan);
  const states: IdTargetStateV004[] = plan.targets.map(t => ({...t, delivery: 'not-sent', acceptance: 'not-evaluated',
    usage: null, result: null, rejection: null, feeStatus: 'not-sent', notSentReason: 'not-yet-approved'}));
  const measurements: ReturnType<typeof idMeasurementV004>[] = [];
  let preparationReferenceCost: ReturnType<typeof idPreparationReferenceCostV004> | null = null;
  let preparationBillingAssessment: ReturnType<typeof deriveCandidateVideoIdPreparationBillingV004> | null = null;
  const counts = {metadataGet: 0, countTokens: 0, inference: 0, total: 0};
  const events: CandidateVideoIdEventV004[] = [];
  let current: IdApprovalV004 | null = null;
  let pending: CandidateVideoIdEventV004 | null = null;
  let response: {event: CandidateVideoIdEventV004; raw: Buffer | null} | null = null;
  let usageSeen = false, filesVerified = 0, fixed = false, prepared = false, complete = false, failed = false;
  let phaseTargets = 0, phaseCompleted = 0, estimatedNanoUsd = 0n;
  let cacheBillingReview: CandidateVideoIdCacheBillingReviewV004 | null = null;
  let usageScalarReview: CandidateVideoIdUsageScalarReviewV004 | null = null;
  let reassessment: IdCacheReassessmentStateV004 | null = null;
  const approvalReferences = new Set<string>();
  let prefix = Buffer.alloc(0);
  if (record.length) check(record.at(-1) === 10, 'id-record-incomplete-line');
  for (const line of record.length ? record.toString('utf8').slice(0, -1).split('\n') : []) {
    const event = object(JSON.parse(line)) as CandidateVideoIdEventV004;
    const {sha256, ...content} = event;
    check(same(Object.keys(event).sort(), ['schemaVersion','sequence','previousSha256','timestamp','experimentId','origin',
      'approvalReference','stage','phase','operation','itemId','condition','detail','sha256'].sort())
      && json(event).toString('utf8') === line + '\n' && event.schemaVersion === 'candidate-video-understanding-id-event-v004'
      && event.sequence === events.length + 1 && event.previousSha256 === (events.at(-1)?.sha256 ?? null)
      && candidateVideoDigestV002(content) === sha256 && event.origin === table.origin
      && event.experimentId === table.experimentId
      && (!failed || event.phase === 'cache-reassessment-boundary'), 'id-record-chain-or-terminal');
    idTimestampV004(event.timestamp); object(event.detail);
    if (event.phase === 'cache-reassessment-boundary') {
      check(failed && !complete && (reassessment === null || reassessment.completed) && current?.phase === 'inference'
        && event.stage === 'inference' && event.operation === null && event.itemId === null && event.condition === null,
      'id-reassessment-boundary-not-after-approved-stop');
      const approval = event.detail.approval as IdLocalReassessmentApprovalV004;
      const before: IdExecutionProofV004 = {origin: table.origin, events, targets: states, measurements,
        preparationReferenceCost, preparationBillingAssessment, requests, counts, prepared,
        normalPause: false, abnormal: true, estimatedNanoUsd: estimatedNanoUsd.toString(), recordSha256: byteSha(prefix),
        phaseApproval: current, approvalReferences: [...approvalReferences], cacheBillingReview, usageScalarReview, reassessment};
      const build = approval?.workOrderId === 'task-033' ? idScalarReassessmentApprovalFromProofV004 : idReassessmentApprovalFromProofV004;
      const expected = build(prefix, table, plan, before, {approvedBy: approval?.approvedBy,
        approvalReference: approval?.approvalReference, checkedAt: approval?.cacheBillingReview?.checkedAt});
      check(same(event.detail, {approval: expected}) && event.approvalReference === expected.approvalReference,
        'id-reassessment-approval-binding');
      assertCandidateVideoIdCacheBillingReviewV004(expected.cacheBillingReview, current.costConditions,
        {origin: table.origin, experimentId: table.experimentId, approvalReference: expected.approvalReference, now: event.timestamp});
      const originalApproval: CandidateVideoIdInferenceApprovalV004 = expected.workOrderId === 'task-033'
        ? reassessment!.originalApproval : current;
      usageScalarReview = expected.workOrderId === 'task-033' ? expected.usageScalarReview : null;
      if (usageScalarReview !== null) assertCandidateVideoIdUsageScalarReviewV004(usageScalarReview,
        expected.cacheBillingReview, originalApproval.costConditions, {origin: table.origin,
          experimentId: table.experimentId, approvalReference: expected.approvalReference, now: event.timestamp});
      reassessment = {approval: expected, originalApproval, feeTargetsCompleted: 0, answerCompleted: false, completed: false};
      cacheBillingReview = expected.cacheBillingReview; failed = false;
      approvalReferences.add(expected.approvalReference);
    } else if (reassessment && !reassessment.completed) {
      check(event.approvalReference === reassessment.approval.approvalReference && event.stage === 'inference'
        && event.operation === null, 'id-reassessment-event-outside-local-phase');
      if (event.phase === 'fee-reassessment') {
        const expected = idFeeReassessmentDetailV004(reassessment, events, states, requests);
        const target = reassessment.approval.targets[reassessment.feeTargetsCompleted];
        check(event.itemId === target.itemId && event.condition === target.condition && same(event.detail, expected),
          'id-reassessment-fee-derived-mismatch');
        const existing = states.find(state => idKeyV004(state) === idKeyV004(target))!;
        existing.usage = expected.usage; existing.feeStatus = 'estimated';
        estimatedNanoUsd = BigInt(expected.cumulativeEstimatedNanoUsd); reassessment.feeTargetsCompleted++;
      } else if (event.phase === 'answer-reassessment') {
        const target = reassessment.approval.answerTarget;
        const expected = idAnswerReassessmentDetailV004(reassessment, events, states, table, estimatedNanoUsd.toString());
        check(event.itemId === target.itemId && event.condition === target.condition && same(event.detail, expected),
          'id-reassessment-answer-derived-mismatch');
        const existing = states.find(state => idKeyV004(state) === idKeyV004(target))!;
        existing.acceptance = expected.verdict;
        if (expected.verdict === 'accepted') existing.result = expected.result.evidenceResolution;
        else existing.rejection = expected.result;
        reassessment.answerCompleted = true;
      } else if (event.phase === 'cache-reassessment-complete') {
        check(event.itemId === null && event.condition === null && same(event.detail,
          idReassessmentCompleteDetailV004(reassessment, events, states, counts.inference, estimatedNanoUsd.toString())),
        'id-reassessment-completion-binding');
        reassessment.completed = true; pending = null; response = null; usageSeen = false; complete = true;
        for (const state of states) if (state.delivery === 'not-sent') state.notSentReason = 'not-yet-approved';
      } else if (event.phase === 'cache-reassessment-failure') {
        check(event.itemId === null && event.condition === null && same(event.detail,
          {reason: 'local-reassessment-infrastructure-failure', recordPolicy: 'terminal-no-resume', additionalInferenceCount: 0}),
        'id-reassessment-failure-binding'); failed = true;
      } else check(false, 'id-reassessment-unsupported-event');
    } else if (event.phase === 'boundary') {
      check((events.length === 0 || complete) && !pending && event.operation === null && event.itemId === null
        && event.condition === null && !approvalReferences.has(event.approvalReference), 'id-phase-boundary-invalid');
      const approval = event.detail.approval as IdApprovalV004;
      if (!prepared) {
        check(events.length === 0, 'id-prepare-once'); assertCandidateVideoIdPrepareApprovalV004(approval, table, plan);
        preparationBillingAssessment = deriveCandidateVideoIdPreparationBillingV004(approval, null,
          {metadataGet: 0, countTokens: 0}, event.timestamp);
      } else {
        assertCandidateVideoIdInferenceApprovalV004(approval, table, plan, requests, byteSha(prefix));
        check(approval.targets.every(t => states.find(s => idKeyV004(s) === idKeyV004(t))!.delivery === 'not-sent'),
          'id-inference-target-consumed');
      }
      if (Object.hasOwn(event.detail, 'cacheBillingReview')) {
        check(approval.phase === 'inference', 'id-cache-price-only-for-inference');
        assertCandidateVideoIdCacheBillingReviewV004(event.detail.cacheBillingReview, approval.costConditions,
          {origin: table.origin, experimentId: table.experimentId, approvalReference: approval.approvalReference, now: event.timestamp});
        cacheBillingReview = event.detail.cacheBillingReview;
      } else {
        check(reassessment === null, 'id-new-inference-cannot-drop-cache-pricing');
        cacheBillingReview = null; // Only historical boundaries lack the new pricing proof.
      }
      if (Object.hasOwn(event.detail, 'usageScalarReview')) {
        check(approval.phase === 'inference' && cacheBillingReview !== null, 'id-scalar-review-only-for-priced-inference');
        assertCandidateVideoIdUsageScalarReviewV004(event.detail.usageScalarReview, cacheBillingReview, approval.costConditions,
          {origin: table.origin, experimentId: table.experimentId, approvalReference: approval.approvalReference, now: event.timestamp});
        usageScalarReview = event.detail.usageScalarReview;
      } else {
        check(usageScalarReview === null, 'id-new-inference-cannot-drop-scalar-rule');
        // Historical task-030/032 records deliberately retain the rules that
        // produced their saved decisions. A live entry point cannot select them.
      }
      check(event.stage === approval.phase && event.approvalReference === approval.approvalReference
        && same(event.detail, {approval, ...(cacheBillingReview === null ? {} : {cacheBillingReview}),
          ...(usageScalarReview === null ? {} : {usageScalarReview})}), 'id-boundary-approval-binding');
      current = approval; complete = false; phaseTargets = 0; phaseCompleted = 0;
      approvalReferences.add(event.approvalReference);
    } else {
      check(current && !complete && event.stage === current.phase && event.approvalReference === current.approvalReference,
        'id-event-outside-approved-phase');
      if (event.phase === 'requests-fixed') {
        check(current.phase === 'prepare' && !pending && filesVerified === 5 && !fixed && counts.countTokens === 0
          && event.operation === null && event.itemId === null && event.condition === null
          && same(event.detail, {origin: table.origin, requests}), 'id-all-ten-requests-before-first-count'); fixed = true;
      } else if (event.phase === 'intent') {
        check(!pending && event.operation !== null, 'id-overlapping-intent');
        let target: CandidateVideoIdFixedRequestV004 | null = null, file: CandidateVideoIdFileReferenceV004 | null = null;
        if (event.operation === 'metadata-get') {
          check(current.phase === 'prepare' && counts.metadataGet < 5 && !fixed && filesVerified === counts.metadataGet,
            'id-metadata-operation-limit'); file = plan.files[counts.metadataGet];
          check(event.itemId === file.itemId && event.condition === null, 'id-metadata-target-order'); counts.metadataGet++;
        } else if (event.operation === 'count-tokens') {
          check(current.phase === 'prepare' && fixed && measurements.length === counts.countTokens && counts.countTokens < 10,
            'id-count-operation-limit'); target = requests[counts.countTokens++];
        } else {
          check(event.operation === 'inference' && current.phase === 'inference' && prepared && measurements.length === 10
            && phaseTargets < current.targets.length && phaseCompleted === phaseTargets && counts.inference < 10,
            'id-inference-operation-limit');
          assertCandidateVideoIdInferenceCostContinuationV004(current.costConditions, estimatedNanoUsd.toString());
          const selected = current.targets[phaseTargets++]; target = requests.find(t => idKeyV004(t) === idKeyV004(selected))!;
          const state = states.find(s => idKeyV004(s) === idKeyV004(target!))!;
          check(state.delivery === 'not-sent', 'id-inference-no-resend');
          state.delivery = 'unknown'; state.feeStatus = 'unknown'; state.notSentReason = null; counts.inference++;
        }
        if (target) check(event.itemId === target.itemId && event.condition === target.condition, 'id-exact-target-order');
        const exact = idExactOperationV004(event.operation, target, file);
        const body = exact.body === null ? Buffer.alloc(0) : json(exact.body);
        const timeoutMs = event.operation === 'metadata-get' ? plan.timeouts.metadataGetMs
          : event.operation === 'count-tokens' ? plan.timeouts.countTokensMs : plan.timeouts.inferenceMs;
        counts.total++;
        let preparationBilling: ReturnType<typeof deriveCandidateVideoIdPreparationBillingV004> | null = null;
        if (event.operation !== 'inference') {
          check(current.phase === 'prepare', 'id-task029-billing-outside-preparation');
          preparationBilling = deriveCandidateVideoIdPreparationBillingV004(current, event.operation,
            {metadataGet: counts.metadataGet, countTokens: counts.countTokens}, event.timestamp);
        }
        check(counts.total <= 25 && same(event.detail, {exactRequest: exact,
          exactRequestSha256: candidateVideoDigestV002(exact), bodySha256: byteSha(body), bodyByteLength: body.length,
          completeInferenceRequestSha256: target?.exactRequestSha256 ?? null, timeoutMs, operationOrdinal: counts.total,
          ...(preparationBilling === null ? {} : {preparationBilling})}),
        'id-intent-exact-request-binding');
        if (preparationBilling !== null) preparationBillingAssessment = preparationBilling;
        pending = event; response = null; usageSeen = false;
      } else if (event.phase === 'response') {
        check(pending && !response && event.operation === pending.operation && event.itemId === pending.itemId
          && event.condition === pending.condition, 'id-response-without-intent');
        const d = event.detail; integer(d.rawResponseByteLength); integer(d.httpStatus);
        check(d.headerPolicy === 'all-headers-omitted' && same(Object.keys(d).sort(), ['httpStatus','rawResponseSha256',
          'rawResponseByteLength','rawResponseBase64','rawOmissionReason','headerPolicy'].sort()), 'id-raw-response-fields');
        let raw: Buffer | null = null;
        if (d.rawResponseBase64 !== null) {
          check(typeof d.rawResponseBase64 === 'string' && d.rawOmissionReason === null, 'id-raw-response-encoding');
          raw = Buffer.from(d.rawResponseBase64, 'base64');
          check(raw.toString('base64') === d.rawResponseBase64 && raw.length === d.rawResponseByteLength
            && byteSha(raw) === d.rawResponseSha256 && inferenceResponseIsSafe(raw, () => false), 'id-raw-response-binding');
        } else check(d.rawOmissionReason === 'secret-like-response-rejected' && /^[a-f0-9]{64}$/u.test(d.rawResponseSha256),
          'id-raw-omission-invalid');
        response = {event, raw};
        if (pending.operation === 'inference') states.find(s => s.itemId === event.itemId && s.condition === event.condition)!.delivery = 'response-received';
      } else if (['metadata','measurement','usage','accepted','rejected'].includes(event.phase)) {
        check(pending && response?.raw && event.operation === pending.operation && event.itemId === pending.itemId
          && event.condition === pending.condition, 'id-derived-without-raw');
        const raw = response.raw; const httpOkay = response.event.detail.httpStatus >= 200 && response.event.detail.httpStatus < 300;
        const target = requests.find(t => t.itemId === event.itemId && t.condition === event.condition);
        if (event.phase === 'metadata') {
          check(event.operation === 'metadata-get' && httpOkay, 'id-metadata-without-success');
          const result = idMetadataV004(raw, plan.files[filesVerified], response.event.timestamp);
          check(same(event.detail, {...result, origin: table.origin}), 'id-metadata-derived-mismatch');
          filesVerified++; pending = null; response = null; usageSeen = false;
        } else if (event.phase === 'measurement') {
          check(event.operation === 'count-tokens' && httpOkay && target, 'id-measurement-without-success');
          const measured = idMeasurementV004(raw, target, table.origin, current.costConditions);
          check(same(event.detail, measured), 'id-measurement-request-response-binding');
          measurements.push(measured); pending = null; response = null; usageSeen = false;
        } else if (event.phase === 'usage') {
          check(event.operation === 'inference' && current.phase === 'inference' && !usageSeen, 'id-usage-order');
          const envelope = object(JSON.parse(raw.toString('utf8')));
          const usage = cacheBillingReview === null ? idHistoricalUsageV004(envelope, table.origin, current.costConditions)
            : usageScalarReview === null
              ? idHistoricalCacheUsageV004(envelope, table.origin, current.costConditions, cacheBillingReview, target!.request.body)
              : idUsageV004(envelope, table.origin, current.costConditions, cacheBillingReview, usageScalarReview, target!.request.body);
          check(same(event.detail, {usage}), 'id-usage-derived-mismatch'); usageSeen = true;
          const state = states.find(s => s.itemId === event.itemId && s.condition === event.condition)!; state.usage = usage;
          if (usage.estimatedNanoUsd !== null) { estimatedNanoUsd += BigInt(usage.estimatedNanoUsd); state.feeStatus = 'estimated'; }
        } else {
          const state = states.find(s => s.itemId === event.itemId && s.condition === event.condition)!;
          check(event.operation === 'inference' && current.phase === 'inference' && target && httpOkay && usageSeen
            && state.usage?.complete, 'id-answer-terminal-without-usage');
          assertCandidateVideoIdInferenceCostContinuationV004(current.costConditions, estimatedNanoUsd.toString());
          let accepted: ReturnType<typeof idAcceptedV004> | null = null, rejected: ReturnType<typeof idRejectedV004> | null = null;
          try { accepted = idAcceptedV004(raw, table.inputs.find(i => i.itemId === event.itemId)!, target.condition); }
          catch (error) {
            if (!(error instanceof IdObservationRejectedV004)) throw error;
            rejected = idRejectedV004(raw, error, state.usage, estimatedNanoUsd.toString());
          }
          if (event.phase === 'accepted') {
            check(accepted && !rejected && same(event.detail, accepted), 'id-observation-derived-mismatch');
            state.acceptance = 'accepted'; state.result = accepted.evidenceResolution;
          } else {
            check(rejected && !accepted && same(event.detail, rejected), 'id-rejection-derived-mismatch');
            state.acceptance = 'rejected'; state.rejection = rejected;
          }
          phaseCompleted++;
          pending = null; response = null; usageSeen = false;
        }
      } else if (event.phase === 'complete') {
        check(!pending && event.operation === null && event.itemId === null && event.condition === null, 'id-complete-pending');
        if (current.phase === 'prepare') {
          preparationReferenceCost = idPreparationReferenceCostV004(measurements, current.costConditions);
          preparationBillingAssessment = deriveCandidateVideoIdPreparationBillingV004(current, null,
            {metadataGet: counts.metadataGet, countTokens: counts.countTokens}, event.timestamp);
          check(fixed && filesVerified === 5 && measurements.length === 10
            && counts.inference === 0 && same(event.detail, {status: 'prepared-awaiting-new-inference-approval',
              measurementCount: 10, fixedRequestCount: 10, referenceCost: preparationReferenceCost,
              preparationBilling: preparationBillingAssessment}), 'id-incomplete-preparation');
        }
        else check(phaseCompleted === current.targets.length && same(event.detail, {status: counts.inference === 10
          ? 'all-ten-completed' : 'approved-subset-completed-awaiting-new-approval', completedTargets: phaseCompleted}),
        'id-incomplete-approved-subset');
        prepared = true; complete = true;
      } else if (event.phase === 'failure') {
        check(same(Object.keys(event.detail).sort(), ['reason','acceptance','delivery','recordPolicy'].sort())
          && ['phase-rejected-no-retry','response-rejected-no-repair','send-outcome-unknown'].includes(event.detail.reason)
          && event.detail.acceptance === 'not-evaluated'
          && event.detail.recordPolicy === 'terminal-no-resume', 'id-failure-fields');
        if (pending) check(event.operation === pending.operation && event.itemId === pending.itemId
          && event.condition === pending.condition, 'id-failure-not-bound-to-pending-operation');
        else if (event.operation !== null || event.itemId !== null || event.condition !== null) {
          const next = current.phase === 'inference' ? current.targets[phaseTargets]
            : fixed ? requests[counts.countTokens] : plan.files[counts.metadataGet];
          const nextOperation = current.phase === 'inference' ? 'inference' : fixed ? 'count-tokens' : 'metadata-get';
          check(next && event.operation === nextOperation && event.itemId === next.itemId
            && event.condition === ('condition' in next ? next.condition : null), 'id-failure-not-bound-to-next-approved-operation');
        }
        const delivery = event.detail.delivery;
        check(event.operation === null ? delivery === null : ['not-sent','unknown','response-received'].includes(delivery),
          'id-failure-delivery-invalid');
        check(!response || delivery === 'response-received', 'id-failure-erases-received-response');
        if (delivery === 'unknown') check(pending && !response && event.detail.reason === 'send-outcome-unknown', 'id-unknown-without-send-intent');
        if (delivery === 'response-received') check(pending && response, 'id-receipt-without-saved-response');
        if (delivery === 'not-sent') check(!response && event.detail.reason === 'phase-rejected-no-retry', 'id-unsent-after-response');
        check(event.detail.reason === 'send-outcome-unknown' ? delivery === 'unknown'
          : event.detail.reason === 'response-rejected-no-repair' ? delivery === 'response-received'
          : delivery === 'not-sent' || delivery === null, 'id-stop-reason-delivery-mismatch');
        if (event.itemId && event.condition) {
          const state = states.find(s => s.itemId === event.itemId && s.condition === event.condition);
          check(state && state.acceptance === 'not-evaluated', 'id-failure-target'); state.acceptance = event.detail.acceptance;
          if (delivery === 'not-sent') { state.delivery = 'not-sent'; state.feeStatus = 'not-sent'; }
        }
        failed = true;
      } else check(false, 'id-unknown-phase');
    }
    events.push(event); prefix = Buffer.concat([prefix, Buffer.from(line + '\n')]);
  }
  const abnormal = failed || (events.length > 0 && !complete);
  if (abnormal) for (const state of states) if (state.delivery === 'not-sent') state.notSentReason = 'global-stop';
  return {origin: table.origin, events, targets: states, measurements, preparationReferenceCost, preparationBillingAssessment,
    requests, counts, prepared,
    normalPause: complete && !failed, abnormal, estimatedNanoUsd: estimatedNanoUsd.toString(),
    recordSha256: byteSha(record), phaseApproval: current, approvalReferences: [...approvalReferences],
    cacheBillingReview, usageScalarReview, reassessment};
}

type IdEvidenceV004 = {filesSource: Buffer; price: Buffer};
type IdPreparationBillingApprovalV004 = Pick<CandidateVideoIdPrepareApprovalV004,
  'phase' | 'origin' | 'approvedBy' | 'experimentId' | 'approvalReference' | 'costConditions'>;
type IdPreparationBillingCountsV004 = {metadataGet: number; countTokens: number};

/** TASK-029 only. This is an approved, current-document reference estimate,
 * never an unknown-fee fallback, an invoice or a promise of permanent free use.
 * Replay and the actual pre-send gate share this exact arithmetic and binding. */
export function deriveCandidateVideoIdPreparationBillingV004(approval: IdPreparationBillingApprovalV004,
  operation: 'metadata-get' | 'count-tokens' | null, counts: IdPreparationBillingCountsV004, now: string) {
  idTimestampV004(now); assertCandidateVideoIdPrepareCostConditionsV004(approval.costConditions);
  const cost: CandidateVideoIdPrepareCostConditionsV004 = approval.costConditions; const review = cost.preparationBillingReview;
  check(approval.phase === 'prepare' && review.origin === approval.origin
    && review.experimentId === approval.experimentId && review.approvalReference === approval.approvalReference
    && approval.approvedBy === (approval.origin === 'mock' ? 'mock' : 'kawafmm'), 'id-task029-billing-approval-binding');
  if (approval.origin === 'live') check(cost.priceReference.path === idPricePathV004
    && cost.priceReference.fileSha256 === INFERENCE_PRICE_SHA, 'id-task029-live-price-reference-not-allowlisted');
  check(Date.parse(review.checkedAt) <= Date.parse(now) && now.slice(0, 10) <= cost.priceValidThrough,
    'id-task029-billing-review-not-current');
  check(same(Object.keys(counts).sort(), ['countTokens','metadataGet']), 'id-task029-billing-counter-shape');
  integer(counts.metadataGet); integer(counts.countTokens);
  check(counts.metadataGet <= CANDIDATE_VIDEO_ID_LIMITS_V004.metadataGet
    && counts.countTokens <= CANDIDATE_VIDEO_ID_LIMITS_V004.countTokens, 'id-task029-billing-operation-limit');
  if (operation === 'metadata-get') check(counts.metadataGet > 0 && counts.countTokens === 0, 'id-task029-billing-get-order');
  else if (operation === 'count-tokens') check(counts.metadataGet === 5 && counts.countTokens > 0, 'id-task029-billing-count-order');
  else check(operation === null && ((counts.metadataGet === 0 && counts.countTokens === 0)
    || (counts.metadataGet === 5 && counts.countTokens === 10)), 'id-task029-billing-operation-not-covered');
  // The core validator admits only the explicitly reviewed zero for these two
  // operations. Missing/unknown values fail above; no default value is chosen.
  const perOperation = BigInt(review.estimatedPreparationNanoUsd);
  const cumulative = perOperation * BigInt(counts.metadataGet + counts.countTokens);
  check(cumulative <= BigInt(cost.maximumNanoUsd), 'id-task029-preparation-frame-exceeded');
  return {schemaVersion: 'candidate-video-understanding-task-029-preparation-billing-assessment-v001',
    workOrderId: 'task-029', origin: approval.origin, experimentId: approval.experimentId,
    approvalReference: approval.approvalReference, reviewSha256: candidateVideoDigestV002(review),
    reviewCheckedAt: review.checkedAt, savedPriceReference: structuredClone(cost.priceReference),
    operation, consumedCalls: {...counts}, operationEstimatedNanoUsd: operation === null ? null : perOperation.toString(),
    cumulativeEstimatedNanoUsd: cumulative.toString(), maximumNanoUsd: cost.maximumNanoUsd,
    basis: 'no-independent-fee-entry-in-the-official-pricing-reviewed-for-this-preparation',
    actualInvoiceNanoUsd: null, permanentFreeGuarantee: false, otherOperationsCovered: false};
}

/** Price bytes are an explicit input. The live caller supplies only its fixed
 * saved price path; mock tests supply synthetic bytes and never open files. */
export function assertCandidateVideoIdPreparationSendBillingV004(approval: IdPreparationBillingApprovalV004,
  priceBytes: Buffer, operation: 'metadata-get' | 'count-tokens' | null,
  counts: IdPreparationBillingCountsV004, now: string) {
  assertCandidateVideoIdPreparePriceSnapshotV004(priceBytes, approval.costConditions, now);
  return deriveCandidateVideoIdPreparationBillingV004(approval, operation, counts, now);
}
type IdEngineDepsV004 = {
  mode: 'mock' | 'live'; store: IdStoreV004; port: HttpPort; clock(): string;
  evidence(): Promise<IdEvidenceV004>; containsSecret(raw: Buffer): boolean;
  verifyInputs?(table: CandidateVideoIdInputTableV004): Promise<void>;
};
export type CandidateVideoIdMockDepsV004 = {
  store: CandidateVideoIdMockStoreV004; port: HttpPort; clock(): string;
  filesSource: Buffer; price: Buffer; containsSecret?(raw: Buffer): boolean;
};
type IdLastResponseV004 = {
  operation: IdOperationV004; itemId: string; condition: CandidateVideoIdConditionV003 | null;
  httpStatus: number; rawResponseBase64: string | null; rawResponseSha256: string; rawResponseByteLength: number;
  rawOmissionReason: string | null; rawPersistence: 'not-persisted' | 'persisted'; usage: ReturnType<typeof idUsageV004> | null;
};
export type CandidateVideoIdPhaseResultV004 = {
  schemaVersion: 'candidate-video-understanding-id-phase-result-v004'; origin: 'mock' | 'live';
  status: 'completed-phase' | 'stopped'; liveReady: boolean;
  proof: ReturnType<typeof inspectCandidateVideoIdExecutionRecordV004>;
  savedRecordVerifiable: boolean; persistenceFailed: boolean; lastResponse: IdLastResponseV004 | null;
  actualApiCalls: number; simulatedApiCalls: number; actualApiCostUsd: 0 | null;
  preparationBilling: 'mock-no-charge'
    | 'task-029-reviewed-preparation-estimate-zero-not-invoice-or-permanent-free-guarantee';
  retry: 0; repair: 0; reupload: 0; extraPoll: 0;
};
function idLiveEvidencePathsV004(plan: CandidateVideoIdExecutionPlanV004, cost: CandidateVideoIdPriceConditionsV004) {
  // Reject references before opening anything. In particular an approval never
  // turns a human-evaluation path, .env or arbitrary local JSON into evidence.
  check(plan.origin === 'live' && plan.filesSourceBinding.path === STAGE1_JOURNAL
    && plan.filesSourceBinding.fileSha256 === INFERENCE_STAGE1_SHA
    && cost.priceReference.path === idPricePathV004 && cost.priceReference.fileSha256 === INFERENCE_PRICE_SHA,
  'id-live-evidence-reference-not-allowlisted');
}
function idFilesFromSavedSourceV004(source: Buffer, table: CandidateVideoIdInputTableV004) {
  check(byteSha(source) === INFERENCE_STAGE1_SHA, 'id-live-files-source-changed');
  const history: Stage1Event[] = source.toString('utf8').trimEnd().split('\n').map(line => JSON.parse(line));
  validateStage1Journal(history);
  return table.inputs.map(input => {
    const items = history.filter(e => e.phase === 'attempt-measurement' && e.detail.payload?.mode === 'live'
      && e.detail.payload.failure === null).flatMap(e => e.detail.payload.items ?? [])
      .filter(item => item.itemId === input.itemId && item.active === true && item.uploaded === true);
    check(items.length === 1 && items[0].videoSha256 === input.bindings.explorationVideo.fileSha256,
      'id-live-files-provenance-not-unique');
    const file = object(items[0].providerFile);
    check(file.state === 'ACTIVE' && file.mimeType === 'video/mp4' && file.sizeBytes === String(input.mediaByteLength),
      'id-live-files-provenance-invalid');
    // No historical count, request, observation or human assessment is read into
    // this contract. Only the already-saved Files identity and integrity survive.
    return {itemId: input.itemId, name: file.name, uri: file.uri, expirationTime: file.expirationTime,
      mimeType: 'video/mp4' as const, byteLength: input.mediaByteLength,
      mediaSha256: input.bindings.explorationVideo.fileSha256} satisfies CandidateVideoIdFileReferenceV004;
  });
}
function idValidateEvidenceV004(evidence: IdEvidenceV004, table: CandidateVideoIdInputTableV004,
  plan: CandidateVideoIdExecutionPlanV004, approval: IdApprovalV004, now: string) {
  idTimestampV004(now);
  if (approval.phase === 'prepare') assertCandidateVideoIdPreparePriceSnapshotV004(evidence.price, approval.costConditions, now);
  else assertCandidateVideoIdPriceSnapshotV004(evidence.price, approval.costConditions);
  const cost = approval.costConditions;
  const price = object(JSON.parse(evidence.price.toString('utf8')));
  check(now.slice(0, 10) >= price.checkedOn && now.slice(0, 10) <= cost.priceValidThrough, 'id-price-not-current');
  check(BigInt(cost.maximumNanoUsd) > 0n, 'id-zero-cost-frame-forbids-send');
  check(byteSha(evidence.filesSource) === plan.filesSourceBinding.fileSha256, 'id-files-source-binding');
  if (table.origin === 'live') {
    idLiveEvidencePathsV004(plan, cost);
    check(same(idFilesFromSavedSourceV004(evidence.filesSource, table), plan.files), 'id-live-files-not-from-saved-source');
  } else check(price.origin === 'mock' && same(JSON.parse(evidence.filesSource.toString('utf8')),
    {origin: 'mock', files: plan.files}), 'id-mock-evidence-not-synthetic');
  for (const file of plan.files) check(Date.parse(file.expirationTime) > Date.parse(now), 'id-files-expired-no-reupload');
}
async function idReadArtifactsV004(store: IdStoreV004) {
  const [table, plan, record] = await Promise.all(['inputTable','executionPlan','executionRecord'].map(kind =>
    store.read(kind as IdArtifactV004)));
  check(table && plan && record, 'id-saved-preparation-proof-missing');
  return {tableBytes: table, planBytes: plan, record,
    table: JSON.parse(table.toString('utf8')) as CandidateVideoIdInputTableV004,
    plan: JSON.parse(plan.toString('utf8')) as CandidateVideoIdExecutionPlanV004};
}
function idMockDepsV004(deps: CandidateVideoIdMockDepsV004): IdEngineDepsV004 {
  check(deps && deps.port?.mode === 'mock' && idMockStoresV004.has(deps.store)
    && Object.keys(deps).every(k => ['store','port','clock','filesSource','price','containsSecret'].includes(k)),
  'id-mock-live-port-or-unbranded-store-forbidden');
  const filesSource = Buffer.from(deps.filesSource), price = Buffer.from(deps.price);
  return {mode: 'mock', store: deps.store, port: deps.port, clock: deps.clock,
    containsSecret: deps.containsSecret ?? (() => false), evidence: async () => ({filesSource: Buffer.from(filesSource), price: Buffer.from(price)})};
}

async function idExecutePhaseV004(tableInput: CandidateVideoIdInputTableV004, planInput: CandidateVideoIdExecutionPlanV004,
  approvalInput: IdApprovalV004, deps: IdEngineDepsV004): Promise<CandidateVideoIdPhaseResultV004> {
  const table = structuredClone(tableInput), plan = structuredClone(planInput), approval = structuredClone(approvalInput);
  check(table.origin === deps.mode && deps.port.mode === deps.mode, 'id-phase-origin-mismatch');
  assertCandidateVideoIdInputTableV004(table, deps.mode); assertCandidateVideoIdExecutionPlanV004(plan, table);
  const requests = buildCandidateVideoIdFixedRequestsV004(table, plan);
  let prefix: Buffer = Buffer.alloc(0);
  if (approval.phase === 'prepare') {
    assertCandidateVideoIdPrepareApprovalV004(approval, table, plan);
    for (const kind of idArtifactKindsV004) check(await deps.store.read(kind) === null, 'id-prepare-artifact-already-exists');
  } else {
    check(await deps.store.read('pairedComparison') === null, 'id-comparison-already-freezes-experiment');
    const saved = await idReadArtifactsV004(deps.store); prefix = saved.record;
    check(saved.tableBytes.equals(json(table)) && saved.planBytes.equals(json(plan)), 'id-saved-input-plan-bytes-changed');
    assertCandidateVideoIdInferenceApprovalV004(approval, table, plan, requests, byteSha(prefix));
    const proof = inspectCandidateVideoIdExecutionRecordV004(prefix, table, plan);
    check(proof.prepared && proof.normalPause && !proof.abnormal && proof.measurements.length === 10
      && !proof.approvalReferences.includes(approval.approvalReference)
      && approval.targets.every(t => proof.targets.find(s => idKeyV004(s) === idKeyV004(t))!.delivery === 'not-sent'),
    'id-preparation-not-complete-or-target-consumed');
  }
  check(inferenceResponseIsSafe(json({table, plan, approval}), deps.containsSecret), 'id-secret-in-local-input');
  const port = deps.port, exchange = port.exchange;
  const firstEvidence = await deps.evidence();
  idValidateEvidenceV004(firstEvidence, table, plan, approval, deps.clock());
  if (approval.phase === 'prepare') assertCandidateVideoIdPreparationSendBillingV004(approval, firstEvidence.price, null,
    {metadataGet: 0, countTokens: 0}, deps.clock());
  let proof = inspectCandidateVideoIdExecutionRecordV004(prefix, table, plan);
  // Every newly executed inference uses the reviewed cache-inclusive pricing
  // and the official scalar omission rule.
  // Historical audit is not an execution option or a caller-selectable mode.
  const cacheReview = approval.phase === 'inference' ? createCandidateVideoIdCacheBillingReviewV004({origin: table.origin,
    experimentId: table.experimentId, approvalReference: approval.approvalReference, checkedAt: idTimestampV004(deps.clock())}) : null;
  const scalarReview = cacheReview === null ? null : createCandidateVideoIdUsageScalarReviewV004({origin: table.origin,
    experimentId: table.experimentId, approvalReference: approval.approvalReference, checkedAt: cacheReview.checkedAt}, cacheReview);
  if (approval.phase === 'inference') {
    // This is an explicitly limited estimate, not a bill or a guaranteed bound
    // on thinking. No historical count is a source for these per-request values.
    const estimatedSelection = approval.targets.reduce((sum, target) => {
      const measurement = proof.measurements.find(m => idKeyV004(m) === idKeyV004(target))!;
      const fixed = requests.find(r => idKeyV004(r) === idKeyV004(target))!;
      return sum + BigInt(measurement.totalTokens) * BigInt(approval.costConditions.inputNanoUsdPerToken)
        + BigInt(fixed.request.body.generationConfig.maxOutputTokens) * BigInt(approval.costConditions.outputIncludingThinkingNanoUsdPerToken);
    }, BigInt(proof.estimatedNanoUsd));
    check(estimatedSelection <= BigInt(approval.costConditions.maximumNanoUsd), 'id-approved-subset-estimate-over-frame');
  }
  let actualApiCalls = 0, simulatedApiCalls = 0, persistenceFailed = false;
  let lastResponse: IdLastResponseV004 | null = null;
  let active: {operation: IdOperationV004; itemId: string; condition: CandidateVideoIdConditionV003 | null} | null = null;
  let activeDelivery: 'not-sent' | 'unknown' | 'response-received' | null = null;
  let sendPending = false, responseRejected = false;
  const append = async (phase: CandidateVideoIdEventV004['phase'], detail: Record<string, any>, target = active) => {
    check(!persistenceFailed, 'id-persistence-terminal');
    const content = {schemaVersion: 'candidate-video-understanding-id-event-v004' as const,
      sequence: proof.events.length + 1, previousSha256: proof.events.at(-1)?.sha256 ?? null,
      timestamp: idTimestampV004(deps.clock()), experimentId: table.experimentId, origin: table.origin,
      approvalReference: approval.approvalReference, stage: approval.phase, phase,
      operation: target?.operation ?? null, itemId: target?.itemId ?? null, condition: target?.condition ?? null,
      detail: structuredClone(detail)};
    const event = {...content, sha256: candidateVideoDigestV002(content)};
    const line = json(event); const next = Buffer.concat([prefix, line]);
    const nextProof = inspectCandidateVideoIdExecutionRecordV004(next, table, plan);
    try {
      check((await deps.store.read('executionRecord'))?.equals(prefix), 'id-record-prefix-changed-before-append');
      // One O_APPEND write, one fsync and exact-prefix readback. A stale writer
      // never rebases or retries. Its competing line makes both proofs terminal.
      await deps.store.append(line);
      check((await deps.store.read('executionRecord'))?.equals(next), 'id-record-competing-or-failed-append');
      prefix = next; proof = nextProof;
    } catch { persistenceFailed = true; throw new Error('id-record-persistence-failed'); }
  };
  const exchangeOnce = async (operation: IdOperationV004, target: CandidateVideoIdFixedRequestV004 | null,
    file: CandidateVideoIdFileReferenceV004 | null) => {
    active = {operation, itemId: target?.itemId ?? file!.itemId, condition: target?.condition ?? null};
    activeDelivery = 'not-sent';
    const exact = idExactOperationV004(operation, target, file);
    const body = exact.body === null ? Buffer.alloc(0) : json(exact.body);
    const timeoutMs = operation === 'metadata-get' ? plan.timeouts.metadataGetMs
      : operation === 'count-tokens' ? plan.timeouts.countTokensMs : plan.timeouts.inferenceMs;
    // Freeze the one intent's consumed count before either pre-send check.
    // The second check must not reserve/count the same operation a second time.
    const preparationCounts = {metadataGet: proof.counts.metadataGet + (operation === 'metadata-get' ? 1 : 0),
      countTokens: proof.counts.countTokens + (operation === 'count-tokens' ? 1 : 0)};
    const preparationBilling = operation !== 'inference' && approval.phase === 'prepare'
      ? deriveCandidateVideoIdPreparationBillingV004(approval, operation, preparationCounts, deps.clock()) : null;
    const verifyBeforeSend = async () => {
      check((await deps.store.read('inputTable'))?.equals(json(table))
        && (await deps.store.read('executionPlan'))?.equals(json(plan))
        && (await deps.store.read('executionRecord'))?.equals(prefix), 'id-artifacts-changed-before-send');
      check(await deps.store.read('pairedComparison') === null, 'id-comparison-freezes-further-send');
      await deps.verifyInputs?.(table);
      check(same(buildCandidateVideoIdFixedRequestsV004(table, plan), requests), 'id-request-changed-before-send');
      const freshEvidence = await deps.evidence();
      idValidateEvidenceV004(freshEvidence, table, plan, approval, deps.clock());
      if (operation !== 'inference') {
        check(approval.phase === 'prepare', 'id-task029-billing-outside-preparation');
        check(same(assertCandidateVideoIdPreparationSendBillingV004(approval, freshEvidence.price, operation,
          preparationCounts, deps.clock()), preparationBilling), 'id-task029-billing-changed-before-send');
      }
      check(port.mode === deps.mode && deps.port === port && port.exchange === exchange, 'id-port-changed-before-send');
      check(inferenceResponseIsSafe(body, deps.containsSecret), 'id-secret-request');
      if (operation === 'inference') {
        check(approval.phase === 'inference', 'id-inference-approval-phase');
        assertCandidateVideoIdCacheBillingReviewV004(cacheReview, approval.costConditions,
          {origin: table.origin, experimentId: table.experimentId, approvalReference: approval.approvalReference, now: deps.clock()});
        assertCandidateVideoIdUsageScalarReviewV004(scalarReview, cacheReview!, approval.costConditions,
          {origin: table.origin, experimentId: table.experimentId, approvalReference: approval.approvalReference, now: deps.clock()});
        assertCandidateVideoIdInferenceCostContinuationV004(approval.costConditions, proof.estimatedNanoUsd);
        const measured = proof.measurements.find(m => idKeyV004(m) === idKeyV004(target!))!;
        check(measured?.origin === deps.mode && measured.exactRequestSha256 === target!.exactRequestSha256
          && BigInt(proof.estimatedNanoUsd) + BigInt(measured.totalTokens) * BigInt(approval.costConditions.inputNanoUsdPerToken)
            + BigInt(target!.request.body.generationConfig.maxOutputTokens) * BigInt(approval.costConditions.outputIncludingThinkingNanoUsdPerToken)
          <= BigInt(approval.costConditions.maximumNanoUsd), 'id-next-input-and-response-estimate-exceeds-frame');
      }
    };
    await verifyBeforeSend();
    await append('intent', {exactRequest: exact, exactRequestSha256: candidateVideoDigestV002(exact),
      bodySha256: byteSha(body), bodyByteLength: body.length,
      completeInferenceRequestSha256: target?.exactRequestSha256 ?? null, timeoutMs, operationOrdinal: proof.counts.total + 1,
      ...(preparationBilling === null ? {} : {preparationBilling})});
    // Re-read the unchanged prefix immediately before the external side effect.
    await verifyBeforeSend();
    check((await deps.store.read('executionRecord'))?.equals(prefix), 'id-immediate-intent-prefix-changed');
    sendPending = true;
    activeDelivery = 'unknown';
    if (deps.mode === 'mock') simulatedApiCalls++; else actualApiCalls++;
    const response = await wallClockDeadline(timeoutMs, () => exchange.call(port,
      {method: exact.method, url: exact.url, headers: exact.body === null ? {} : {'Content-Type': 'application/json'}, body}));
    sendPending = false;
    activeDelivery = 'response-received';
    const raw = Buffer.from(response.body), safe = inferenceResponseIsSafe(raw, deps.containsSecret);
    lastResponse = {...active, httpStatus: response.status, rawResponseBase64: safe ? raw.toString('base64') : null,
      rawResponseSha256: byteSha(raw), rawResponseByteLength: raw.length,
      rawOmissionReason: safe ? null : 'secret-like-response-rejected', rawPersistence: 'not-persisted', usage: null};
    if (safe && operation === 'inference') {
      check(approval.phase === 'inference', 'id-inference-approval-phase');
      try { lastResponse.usage = idUsageV004(object(JSON.parse(raw.toString('utf8'))), deps.mode, approval.costConditions,
        cacheReview!, scalarReview!, target!.request.body); }
      catch { /* Raw bytes still survive even when no usage object can be decoded. */ }
    }
    await append('response', {httpStatus: response.status, rawResponseSha256: byteSha(raw), rawResponseByteLength: raw.length,
      rawResponseBase64: safe ? raw.toString('base64') : null, rawOmissionReason: safe ? null : 'secret-like-response-rejected',
      headerPolicy: 'all-headers-omitted'});
    lastResponse.rawPersistence = 'persisted'; responseRejected = true;
    check(safe, 'id-secret-response-rejected');
    if (operation === 'inference') {
      check(approval.phase === 'inference', 'id-inference-approval-phase');
      const usage = idUsageV004(object(JSON.parse(raw.toString('utf8'))), deps.mode, approval.costConditions,
        cacheReview!, scalarReview!, target!.request.body);
      await append('usage', {usage});
      check(usage.complete, 'id-usage-incomplete');
      assertCandidateVideoIdInferenceCostContinuationV004(approval.costConditions, proof.estimatedNanoUsd);
    }
    check(response.status >= 200 && response.status < 300, 'id-http-response-rejected');
    return raw;
  };
  try {
    if (approval.phase === 'prepare') {
      await deps.store.create('inputTable', json(table));
      check((await deps.store.read('inputTable'))?.equals(json(table)), 'id-input-table-save-failed');
      await deps.store.create('executionPlan', json(plan));
      check((await deps.store.read('executionPlan'))?.equals(json(plan)), 'id-plan-save-failed');
      await deps.store.create('executionRecord', Buffer.alloc(0));
    }
    await append('boundary', {approval, ...(cacheReview === null ? {} : {cacheBillingReview: cacheReview, usageScalarReview: scalarReview})}, null);
    if (approval.phase === 'prepare') {
      for (const file of plan.files) {
        const raw = await exchangeOnce('metadata-get', null, file);
        await append('metadata', {...idMetadataV004(raw, file, deps.clock()), origin: deps.mode});
        responseRejected = false; active = null; activeDelivery = null;
      }
      await append('requests-fixed', {origin: deps.mode, requests}, null);
      for (const request of requests) {
        const raw = await exchangeOnce('count-tokens', request, null);
        await append('measurement', idMeasurementV004(raw, request, deps.mode, approval.costConditions));
        responseRejected = false; active = null; activeDelivery = null;
      }
      await append('complete', {status: 'prepared-awaiting-new-inference-approval', measurementCount: 10, fixedRequestCount: 10,
        referenceCost: idPreparationReferenceCostV004(proof.measurements, approval.costConditions),
        preparationBilling: deriveCandidateVideoIdPreparationBillingV004(approval, null,
          {metadataGet: proof.counts.metadataGet, countTokens: proof.counts.countTokens}, deps.clock())}, null);
    } else {
      await executeBoundedInferenceTargets(approval.targets, approval.targets.length, idKeyV004, async selected => {
        const target = requests.find(r => idKeyV004(r) === idKeyV004(selected))!;
        const raw = await exchangeOnce('inference', target, null);
        let accepted: ReturnType<typeof idAcceptedV004> | null = null, rejected: ReturnType<typeof idRejectedV004> | null = null;
        try { accepted = idAcceptedV004(raw, table.inputs.find(i => i.itemId === target.itemId)!, target.condition); }
        catch (error) {
          if (!(error instanceof IdObservationRejectedV004)) throw error;
          const usage = proof.targets.find(state => idKeyV004(state) === idKeyV004(target))!.usage!;
          rejected = idRejectedV004(raw, error, usage, proof.estimatedNanoUsd);
        }
        // Derive and durably replay the condition terminal before another send.
        // Persistence/infrastructure exceptions are outside the answer catch.
        if (rejected) await append('rejected', rejected);
        else { check(accepted, 'id-answer-terminal-missing'); await append('accepted', accepted); }
        responseRejected = false; active = null; activeDelivery = null; return true;
      });
      await append('complete', {status: proof.counts.inference === 10 ? 'all-ten-completed'
        : 'approved-subset-completed-awaiting-new-approval', completedTargets: approval.targets.length}, null);
    }
  } catch (error) {
    if (!persistenceFailed && proof.events.length > 0 && !proof.normalPause) {
      try { await append('failure', {reason: sendPending ? 'send-outcome-unknown'
        : responseRejected ? 'response-rejected-no-repair' : 'phase-rejected-no-retry',
        acceptance: 'not-evaluated',
        delivery: activeDelivery,
        recordPolicy: 'terminal-no-resume'}); } catch { persistenceFailed = true; }
    }
    // Partial input/plan creation is also terminal; never repair or delete it.
    if (!proof.events.length) persistenceFailed = true;
  }
  let savedRecordVerifiable = true;
  try {
    const saved = await deps.store.read('executionRecord');
    check(saved !== null && saved.equals(prefix), 'id-final-record-not-owned-prefix');
    proof = inspectCandidateVideoIdExecutionRecordV004(saved, table, plan);
  } catch { savedRecordVerifiable = false; persistenceFailed = true; }
  return {schemaVersion: 'candidate-video-understanding-id-phase-result-v004', origin: deps.mode,
    status: !persistenceFailed && proof.normalPause ? 'completed-phase' : 'stopped',
    liveReady: deps.mode === 'live' && proof.prepared && proof.normalPause && !persistenceFailed,
    proof, savedRecordVerifiable, persistenceFailed, lastResponse,
    actualApiCalls, simulatedApiCalls, actualApiCostUsd: deps.mode === 'mock' ? 0 : null,
    preparationBilling: deps.mode === 'mock' ? 'mock-no-charge'
      : 'task-029-reviewed-preparation-estimate-zero-not-invoice-or-permanent-free-guarantee',
    retry: 0, repair: 0, reupload: 0, extraPoll: 0};
}

export async function executeCandidateVideoIdPreparationMockV004(inputs: CandidateVideoIdInputV003[],
  table: CandidateVideoIdInputTableV004, plan: CandidateVideoIdExecutionPlanV004,
  approval: CandidateVideoIdPrepareApprovalV004, deps: CandidateVideoIdMockDepsV004) {
  const bounded = idMockDepsV004(deps);
  check(same(table, buildCandidateVideoIdInputTableV004(table.experimentId, 'mock', inputs)), 'id-mock-input-table-differs');
  bounded.verifyInputs = async fixed => { check(same(fixed, buildCandidateVideoIdInputTableV004(fixed.experimentId, 'mock', inputs)), 'id-mock-local-inputs-changed'); };
  return idExecutePhaseV004(table, plan, approval, bounded);
}
export async function executeCandidateVideoIdInferenceMockV004(inputs: CandidateVideoIdInputV003[],
  approval: CandidateVideoIdInferenceApprovalV004, deps: CandidateVideoIdMockDepsV004) {
  const bounded = idMockDepsV004(deps); const saved = await idReadArtifactsV004(bounded.store);
  check(same(saved.table, buildCandidateVideoIdInputTableV004(saved.table.experimentId, 'mock', inputs)), 'id-mock-saved-inputs-differ');
  bounded.verifyInputs = async fixed => { check(same(fixed, buildCandidateVideoIdInputTableV004(fixed.experimentId, 'mock', inputs)), 'id-mock-local-inputs-changed'); };
  return idExecutePhaseV004(saved.table, saved.plan, approval, bounded);
}

type IdCacheLocalDepsV004 = Omit<IdEngineDepsV004, 'port'>;
export type CandidateVideoIdCacheReassessmentMockDepsV004 = Omit<CandidateVideoIdMockDepsV004, 'port'>;

/** Local-only execution has no port and never constructs an inference intent.
 * The approved historical prefix is checked before and after each durable append. */
async function idExecuteCacheReassessmentV004(approvalInput: IdLocalReassessmentApprovalV004,
  deps: IdCacheLocalDepsV004): Promise<CandidateVideoIdPhaseResultV004> {
  const approval = structuredClone(approvalInput), saved = await idReadArtifactsV004(deps.store);
  const {table, plan} = saved;
  check(table.origin === deps.mode && saved.tableBytes.equals(json(table)) && saved.planBytes.equals(json(plan)),
    'id-local-reassessment-saved-inputs-changed');
  check(await deps.store.read('pairedComparison') === null, 'id-comparison-freezes-reassessment');
  await deps.verifyInputs?.(table);
  const build = approval.workOrderId === 'task-033' ? buildCandidateVideoIdScalarReassessmentApprovalV004
    : buildCandidateVideoIdCacheReassessmentApprovalV004;
  check(same(approval, build(saved.record, table, plan,
    {approvedBy: approval.approvedBy, approvalReference: approval.approvalReference,
      checkedAt: approval.cacheBillingReview?.checkedAt})), 'id-local-reassessment-approval-mismatch');
  check(inferenceResponseIsSafe(json({table, plan, approval}), deps.containsSecret)
    && inferenceResponseIsSafe(saved.record, deps.containsSecret), 'id-local-reassessment-secret-evidence');
  let prefix = saved.record, proof = inspectCandidateVideoIdExecutionRecordV004(prefix, table, plan);
  const original = approval.workOrderId === 'task-033' ? proof.reassessment!.originalApproval
    : proof.phaseApproval as CandidateVideoIdInferenceApprovalV004;
  const evidence = await deps.evidence();
  idValidateEvidenceV004(evidence, table, plan, original, deps.clock());
  assertCandidateVideoIdCacheBillingReviewV004(approval.cacheBillingReview, original.costConditions,
    {origin: table.origin, experimentId: table.experimentId, approvalReference: approval.approvalReference, now: deps.clock()});
  if (approval.workOrderId === 'task-033') assertCandidateVideoIdUsageScalarReviewV004(approval.usageScalarReview,
    approval.cacheBillingReview, original.costConditions, {origin: table.origin, experimentId: table.experimentId,
      approvalReference: approval.approvalReference, now: deps.clock()});
  let persistenceFailed = false;
  const append = async (phase: CandidateVideoIdEventV004['phase'], detail: Record<string, any>,
    target: {itemId: string; condition: CandidateVideoIdConditionV003} | null = null) => {
    check(!persistenceFailed, 'id-local-reassessment-persistence-terminal');
    const content = {schemaVersion: 'candidate-video-understanding-id-event-v004' as const,
      sequence: proof.events.length + 1, previousSha256: proof.events.at(-1)?.sha256 ?? null,
      timestamp: idTimestampV004(deps.clock()), experimentId: table.experimentId, origin: table.origin,
      approvalReference: approval.approvalReference, stage: 'inference' as const, phase,
      operation: null, itemId: target?.itemId ?? null, condition: target?.condition ?? null, detail: structuredClone(detail)};
    const line = json({...content, sha256: candidateVideoDigestV002(content)}), next = Buffer.concat([prefix, line]);
    const nextProof = inspectCandidateVideoIdExecutionRecordV004(next, table, plan);
    try {
      check((await deps.store.read('inputTable'))?.equals(saved.tableBytes)
        && (await deps.store.read('executionPlan'))?.equals(saved.planBytes)
        && (await deps.store.read('executionRecord'))?.equals(prefix), 'id-local-reassessment-prefix-changed');
      check(next.subarray(0, saved.record.length).equals(saved.record), 'id-local-reassessment-erased-history');
      await deps.store.append(line);
      check((await deps.store.read('executionRecord'))?.equals(next), 'id-local-reassessment-append-readback-failed');
      prefix = next; proof = nextProof;
    } catch { persistenceFailed = true; throw new Error('id-local-reassessment-persistence-failed'); }
  };
  try {
    await append('cache-reassessment-boundary', {approval});
    for (const target of approval.targets) {
      const detail = idFeeReassessmentDetailV004(proof.reassessment!, proof.events, proof.targets, proof.requests);
      await append('fee-reassessment', detail, target);
    }
    assertCandidateVideoIdInferenceCostContinuationV004(original.costConditions, proof.estimatedNanoUsd);
    await append('answer-reassessment', idAnswerReassessmentDetailV004(proof.reassessment!, proof.events,
      proof.targets, table, proof.estimatedNanoUsd), approval.answerTarget);
    await append('cache-reassessment-complete', idReassessmentCompleteDetailV004(proof.reassessment!, proof.events,
      proof.targets, proof.counts.inference, proof.estimatedNanoUsd));
  } catch {
    if (!persistenceFailed && proof.reassessment && !proof.reassessment.completed) {
      try { await append('cache-reassessment-failure', {reason: 'local-reassessment-infrastructure-failure',
        recordPolicy: 'terminal-no-resume', additionalInferenceCount: 0}); } catch { persistenceFailed = true; }
    }
  }
  let savedRecordVerifiable = true;
  try {
    const final = await deps.store.read('executionRecord');
    check(final !== null && final.equals(prefix) && final.subarray(0, saved.record.length).equals(saved.record),
      'id-local-reassessment-final-prefix-mismatch');
    proof = inspectCandidateVideoIdExecutionRecordV004(final, table, plan);
  } catch { savedRecordVerifiable = false; persistenceFailed = true; }
  return {schemaVersion: 'candidate-video-understanding-id-phase-result-v004', origin: deps.mode,
    status: !persistenceFailed && proof.normalPause && proof.reassessment?.completed ? 'completed-phase' : 'stopped',
    liveReady: deps.mode === 'live' && !persistenceFailed && proof.normalPause && proof.reassessment?.completed === true,
    proof, savedRecordVerifiable, persistenceFailed, lastResponse: null,
    actualApiCalls: 0, simulatedApiCalls: 0, actualApiCostUsd: 0,
    preparationBilling: deps.mode === 'mock' ? 'mock-no-charge'
      : 'task-029-reviewed-preparation-estimate-zero-not-invoice-or-permanent-free-guarantee',
    retry: 0, repair: 0, reupload: 0, extraPoll: 0};
}

async function idExecuteLocalReassessmentMockV004(inputs: CandidateVideoIdInputV003[],
  approval: IdLocalReassessmentApprovalV004, deps: CandidateVideoIdCacheReassessmentMockDepsV004) {
  check(deps && idMockStoresV004.has(deps.store)
    && Object.keys(deps).every(key => ['store', 'clock', 'filesSource', 'price', 'containsSecret'].includes(key)),
  'id-local-reassessment-no-network-or-arbitrary-store');
  const filesSource = Buffer.from(deps.filesSource), price = Buffer.from(deps.price);
  return idExecuteCacheReassessmentV004(approval, {mode: 'mock', store: deps.store, clock: deps.clock,
    containsSecret: deps.containsSecret ?? (() => false),
    evidence: async () => ({filesSource: Buffer.from(filesSource), price: Buffer.from(price)}),
    async verifyInputs(table) {
      check(same(table, buildCandidateVideoIdInputTableV004(table.experimentId, 'mock', inputs)),
        'id-local-reassessment-mock-inputs-changed');
    }});
}

export async function executeCandidateVideoIdCacheReassessmentMockV004(inputs: CandidateVideoIdInputV003[],
  approval: CandidateVideoIdCacheReassessmentApprovalV004, deps: CandidateVideoIdCacheReassessmentMockDepsV004) {
  return idExecuteLocalReassessmentMockV004(inputs, approval, deps);
}
export async function executeCandidateVideoIdScalarReassessmentMockV004(inputs: CandidateVideoIdInputV003[],
  approval: CandidateVideoIdScalarReassessmentApprovalV004, deps: CandidateVideoIdCacheReassessmentMockDepsV004) {
  return idExecuteLocalReassessmentMockV004(inputs, approval, deps);
}

/** Only the existing approved record is opened for append. No key, HTTP port,
 * upload, metadata request, countTokens call or new artifact is available here. */
async function idRunApprovedLocalReassessmentV004(workspace: string, approval: IdLocalReassessmentApprovalV004) {
  check(approval?.approvedBy === 'kawafmm' && approval.origin === 'live', 'id-local-reassessment-live-approval-required');
  const store = await idLiveStoreV004(workspace, false);
  return idExecuteCacheReassessmentV004(approval, {mode: 'live', store, clock: () => new Date().toISOString(),
    containsSecret: () => false,
    async verifyInputs(table) { await verifyCandidateVideoIdInputTableV004(workspace, table, 'live'); },
    async evidence() {
      return {filesSource: await readFile(resolve(workspace, STAGE1_JOURNAL)),
        price: await readFile(resolve(workspace, idPricePathV004))};
    }});
}

export async function runApprovedCandidateVideoIdCacheReassessmentV004(workspace: string,
  approval: CandidateVideoIdCacheReassessmentApprovalV004) {
  return idRunApprovedLocalReassessmentV004(workspace, approval);
}
export async function runApprovedCandidateVideoIdScalarReassessmentV004(workspace: string,
  approval: CandidateVideoIdScalarReassessmentApprovalV004) {
  return idRunApprovedLocalReassessmentV004(workspace, approval);
}

/** This future, explicitly authorized local read constructs the actual invocation
 * arguments in memory. It writes nothing and does not read credentials or old
 * observations. It must not itself be mistaken for preparation/send approval. */
export async function readCandidateVideoIdLivePreparationInputsV004(workspace: string,
  authorization: {approvedBy: 'kawafmm'; approvalReference: string; experimentId: string}) {
  check(authorization?.approvedBy === 'kawafmm' && typeof authorization.approvalReference === 'string'
    && authorization.approvalReference.trim().length > 0, 'id-live-local-read-approval-missing');
  const inputs = await loadCandidateVideoIdInputsV003(workspace);
  const table = buildCandidateVideoIdInputTableV004(authorization.experimentId, 'live', inputs);
  const source = await readFile(resolve(workspace, STAGE1_JOURNAL));
  const plan: CandidateVideoIdExecutionPlanV004 = {schemaVersion: 'candidate-video-understanding-id-execution-plan-v004',
    experimentId: table.experimentId, origin: 'live', inputTableSha256: candidateVideoDigestV002(table),
    targets: structuredClone([...CANDIDATE_VIDEO_ID_FIXED_TARGETS_V004]), files: idFilesFromSavedSourceV004(source, table),
    filesSourceBinding: {path: STAGE1_JOURNAL, fileSha256: INFERENCE_STAGE1_SHA},
    timeouts: {...CANDIDATE_VIDEO_ID_TIMEOUTS_V004}, limits: {...CANDIDATE_VIDEO_ID_LIMITS_V004},
    retry: 0, repair: 0, reupload: 0, extraPoll: 0};
  assertCandidateVideoIdExecutionPlanV004(plan, table);
  return {table, plan, planSha256: candidateVideoDigestV002(plan), inputTableSha256: candidateVideoDigestV002(table),
    priceReference: {path: idPricePathV004, fileSha256: INFERENCE_PRICE_SHA},
    instruction: 'Separate complete preparation approval including explicit cost conditions is still required; no artifact saved or HTTP sent.'};
}
async function idLiveStoreV004(workspace: string, createDirectory: boolean) {
  const workspaceReal = await realpath(workspace);
  const directory = resolve(workspaceReal, dirname(CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004.inputTable));
  if (createDirectory) {
    // Verify every existing ancestor before mkdir; never follow a symlink into
    // another artifact root. Creation is reachable only after full approval.
    let ancestor = workspaceReal;
    for (const part of directory.slice(workspaceReal.length + 1).split(sep)) {
      ancestor = resolve(ancestor, part);
      try { const stat = await lstat(ancestor); check(stat.isDirectory() && !stat.isSymbolicLink(), 'id-live-parent-symlink'); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; await mkdir(ancestor); }
    }
  }
  return idFileStoreV004(await assertIdDirectoryV004(directory, workspaceReal));
}
function idLiveDepsV004(workspace: string, table: CandidateVideoIdInputTableV004, plan: CandidateVideoIdExecutionPlanV004,
  approval: IdApprovalV004, apiKey: string, store: IdStoreV004): IdEngineDepsV004 {
  idLiveEvidencePathsV004(plan, approval.costConditions);
  const requests = buildCandidateVideoIdFixedRequestsV004(table, plan);
  const port: HttpPort = {mode: 'live', async exchange(request) {
    const operation: IdOperationV004 = request.method === 'GET' ? 'metadata-get'
      : request.url.endsWith(':countTokens') ? 'count-tokens' : 'inference';
    const allowed = operation === 'metadata-get' ? plan.files.map(file => idExactOperationV004(operation, null, file))
      : requests.map(target => idExactOperationV004(operation, target, null));
    check(allowed.some(exact => request.method === exact.method && request.url === exact.url
      && request.body.equals(exact.body === null ? Buffer.alloc(0) : json(exact.body)))
      && (approval.phase === 'inference') === (operation === 'inference'), 'id-live-request-not-approved');
    const timeoutMs = operation === 'metadata-get' ? plan.timeouts.metadataGetMs
      : operation === 'count-tokens' ? plan.timeouts.countTokensMs : plan.timeouts.inferenceMs;
    return createDirectRestPort({approvedBy: 'kawafmm', approvalReference: approval.approvalReference,
      phase: operation === 'inference' ? 'inference' : 'upload-and-count',
      manifestSha256: candidateVideoDigestV002(plan), timeoutMs}, apiKey).exchange(request);
  }};
  return {mode: 'live', store, port, clock: () => new Date().toISOString(), containsSecret: raw => raw.includes(Buffer.from(apiKey)),
    async verifyInputs(fixed) { await verifyCandidateVideoIdInputTableV004(workspace, fixed, 'live'); },
    async evidence() {
      idLiveEvidencePathsV004(plan, approval.costConditions);
      return {filesSource: await readFile(resolve(workspace, STAGE1_JOURNAL)), price: await readFile(resolve(workspace, idPricePathV004))};
    }};
}
export async function runApprovedCandidateVideoIdPreparationV004(workspace: string, plan: CandidateVideoIdExecutionPlanV004,
  approval: CandidateVideoIdPrepareApprovalV004, apiKey: string) {
  check(approval?.approvedBy === 'kawafmm' && approval.origin === 'live' && typeof apiKey === 'string' && apiKey.trim().length > 0,
    'id-live-key-or-approval-missing');
  const table = buildCandidateVideoIdInputTableV004(plan.experimentId, 'live', await loadCandidateVideoIdInputsV003(workspace));
  assertCandidateVideoIdPrepareApprovalV004(approval, table, plan); idLiveEvidencePathsV004(plan, approval.costConditions);
  const evidence = {filesSource: await readFile(resolve(workspace, STAGE1_JOURNAL)), price: await readFile(resolve(workspace, idPricePathV004))};
  idValidateEvidenceV004(evidence, table, plan, approval, new Date().toISOString());
  assertCandidateVideoIdPreparationSendBillingV004(approval, evidence.price, null,
    {metadataGet: 0, countTokens: 0}, new Date().toISOString());
  check(inferenceResponseIsSafe(json({table, plan, approval}), raw => raw.includes(Buffer.from(apiKey))), 'id-live-secret-input');
  return idExecutePhaseV004(table, plan, approval, idLiveDepsV004(workspace, table, plan, approval, apiKey, await idLiveStoreV004(workspace, true)));
}
export async function runApprovedCandidateVideoIdInferenceV004(workspace: string, approval: CandidateVideoIdInferenceApprovalV004,
  apiKey: string) {
  check(approval?.approvedBy === 'kawafmm' && approval.origin === 'live' && typeof apiKey === 'string' && apiKey.trim().length > 0,
    'id-live-key-or-approval-missing');
  const store = await idLiveStoreV004(workspace, false); const saved = await idReadArtifactsV004(store);
  await verifyCandidateVideoIdInputTableV004(workspace, saved.table, 'live');
  const requests = buildCandidateVideoIdFixedRequestsV004(saved.table, saved.plan);
  assertCandidateVideoIdInferenceApprovalV004(approval, saved.table, saved.plan, requests, byteSha(saved.record));
  idLiveEvidencePathsV004(saved.plan, approval.costConditions);
  return idExecutePhaseV004(saved.table, saved.plan, approval, idLiveDepsV004(workspace, saved.table, saved.plan, approval, apiKey, store));
}

export type CandidateVideoIdPairedComparisonV004 = {
  schemaVersion: 'candidate-video-understanding-id-paired-comparison-v004'; experimentId: string; origin: 'mock' | 'live';
  executionRecordSha256: string;
  pairs: Array<{itemId: string; A: Pick<IdTargetStateV004, 'delivery' | 'acceptance'>;
    B: Pick<IdTargetStateV004, 'delivery' | 'acceptance'>; assessment: unknown}>;
};
async function idSaveComparisonV004(store: IdStoreV004, table: CandidateVideoIdInputTableV004,
  plan: CandidateVideoIdExecutionPlanV004, approval: CandidateVideoIdComparisonApprovalV004,
  payload: CandidateVideoIdPairedComparisonV004) {
  const saved = await idReadArtifactsV004(store); const bytes = json(payload);
  check(saved.tableBytes.equals(json(table)) && saved.planBytes.equals(json(plan)), 'id-comparison-source-changed');
  assertCandidateVideoIdComparisonApprovalV004(approval, table, plan, byteSha(saved.record), byteSha(bytes));
  const proof = inspectCandidateVideoIdExecutionRecordV004(saved.record, table, plan);
  check(proof.events.length > 0 && ((proof.normalPause && proof.phaseApproval?.phase === 'inference')
    || proof.events.at(-1)?.phase === 'failure'), 'id-comparison-unfrozen-record');
  check(inferenceResponseIsSafe(json({approval, payload}), () => false), 'id-comparison-secret-like-input');
  check(same(Object.keys(payload).sort(), ['schemaVersion','experimentId','origin','executionRecordSha256','pairs'].sort())
    && payload.schemaVersion === 'candidate-video-understanding-id-paired-comparison-v004'
    && payload.experimentId === table.experimentId && payload.origin === table.origin
    && payload.executionRecordSha256 === byteSha(saved.record) && Array.isArray(payload.pairs) && payload.pairs.length === 5,
  'id-comparison-payload-binding');
  payload.pairs.forEach((pair, i) => {
    check(same(Object.keys(pair).sort(), ['itemId','A','B','assessment'].sort()) && pair.itemId === table.inputs[i].itemId,
      'id-comparison-five-pairs-required');
    for (const condition of ['A','B'] as const) {
      const target = proof.targets.find(t => t.itemId === pair.itemId && t.condition === condition)!;
      check(same(pair[condition], {delivery: target.delivery, acceptance: target.acceptance}), 'id-comparison-status-mismatch');
    }
  });
  check((await store.read('executionRecord'))?.equals(saved.record), 'id-comparison-record-changed-before-save');
  await store.create('pairedComparison', bytes);
  check((await store.read('pairedComparison'))?.equals(bytes) && (await store.read('executionRecord'))?.equals(saved.record),
    'id-comparison-readback-or-record-changed');
  return {origin: table.origin, comparisonSha256: byteSha(bytes), executionRecordSha256: byteSha(saved.record),
    semanticAssessmentComputed: false, actualApiCalls: 0};
}
export async function saveCandidateVideoIdComparisonMockV004(inputs: CandidateVideoIdInputV003[],
  approval: CandidateVideoIdComparisonApprovalV004, payload: CandidateVideoIdPairedComparisonV004,
  store: CandidateVideoIdMockStoreV004) {
  check(idMockStoresV004.has(store), 'id-comparison-mock-store-required'); const saved = await idReadArtifactsV004(store);
  check(same(saved.table, buildCandidateVideoIdInputTableV004(saved.table.experimentId, 'mock', inputs)), 'id-comparison-mock-inputs');
  return idSaveComparisonV004(store, saved.table, saved.plan, approval, payload);
}
export async function saveApprovedCandidateVideoIdComparisonV004(workspace: string,
  approval: CandidateVideoIdComparisonApprovalV004, payload: CandidateVideoIdPairedComparisonV004) {
  check(approval?.approvedBy === 'kawafmm' && approval.origin === 'live', 'id-comparison-live-approval-required');
  const store = await idLiveStoreV004(workspace, false); const saved = await idReadArtifactsV004(store);
  await verifyCandidateVideoIdInputTableV004(workspace, saved.table, 'live');
  return idSaveComparisonV004(store, saved.table, saved.plan, approval, payload);
}

// task-035 is a second calibration. V004 replay above still derives 4096 and
// never selects this profile by inspecting a request, a file name, or a result.
const ID_PREVIOUS_RECORD_SHA_V005 = '115b4c4398cb2a967d13608e16c1f4e3dec89500cfff3762715cc9096ee24ca8';
export type CandidateVideoIdSourcesV005 = {inputTable: Buffer; executionPlan: Buffer; previousRecord: Buffer};
type IdSourceBindingsV005 = Record<keyof CandidateVideoIdSourcesV005,
  {path: string; fileSha256: string; byteLength: number}>;
type IdRequestIdentityV005 = {itemId: string; condition: CandidateVideoIdConditionV003;
  exactRequestSha256: string; previousExactRequestSha256: string};
export type CandidateVideoIdPreparationApprovalV005 = {
  schemaVersion: 'candidate-video-understanding-id-preparation-approval-v005';
  experimentId: 'task-035'; origin: 'mock' | 'live'; approvedBy: 'mock' | 'kawafmm'; approvalReference: string;
  phase: 'prepare'; profile: typeof CANDIDATE_VIDEO_ID_PROFILE_V005; sources: IdSourceBindingsV005;
  requests: IdRequestIdentityV005[]; priceReview: CandidateVideoIdPriceReviewV005;
};
export type CandidateVideoIdEventV005 = Omit<CandidateVideoIdEventV004, 'schemaVersion'> & {
  schemaVersion: 'candidate-video-understanding-id-event-v005';
};
export type CandidateVideoIdRecordStoreV005 = {
  read(): Promise<Buffer | null>; create(data: Buffer): Promise<void>; append(data: Buffer): Promise<void>;
};
const idMemoryStoresV005 = new WeakSet<CandidateVideoIdRecordStoreV005>();
export function createCandidateVideoIdMemoryRecordV005(hooks: {
  beforeCreate?(): Promise<void>; beforeAppend?(event: CandidateVideoIdEventV005): Promise<void>
} = {}): CandidateVideoIdRecordStoreV005 {
  let saved: Buffer | null = null;
  const store = Object.freeze({
    async read() { return saved === null ? null : Buffer.from(saved); },
    async create(data: Buffer) {
      await hooks.beforeCreate?.(); check(saved === null, 'id-v005-record-already-exists'); saved = Buffer.from(data);
    },
    async append(data: Buffer) {
      await hooks.beforeAppend?.(JSON.parse(data.toString('utf8')));
      check(saved !== null, 'id-v005-record-not-created'); saved = Buffer.concat([saved, data]);
    }
  });
  idMemoryStoresV005.add(store); return store;
}
function idSourceBindingsV005(sources: CandidateVideoIdSourcesV005): IdSourceBindingsV005 {
  const paths = {inputTable: CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004.inputTable,
    executionPlan: CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004.executionPlan,
    previousRecord: CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004.executionRecord};
  return Object.fromEntries((Object.keys(paths) as Array<keyof typeof paths>).map(kind => {
    check(Buffer.isBuffer(sources[kind]), 'id-v005-source-bytes-required');
    return [kind, {path: paths[kind], fileSha256: byteSha(sources[kind]), byteLength: sources[kind].length}];
  })) as IdSourceBindingsV005;
}
function idReadSourcesV005(sources: CandidateVideoIdSourcesV005) {
  check(same(Object.keys(sources).sort(), ['executionPlan','inputTable','previousRecord']), 'id-v005-source-keys');
  const bindings = idSourceBindingsV005(sources);
  const table = JSON.parse(sources.inputTable.toString('utf8')) as CandidateVideoIdInputTableV004;
  const plan = JSON.parse(sources.executionPlan.toString('utf8')) as CandidateVideoIdExecutionPlanV004;
  assertCandidateVideoIdInputTableV004(table); assertCandidateVideoIdExecutionPlanV004(plan, table);
  check(sources.inputTable.equals(json(table)) && sources.executionPlan.equals(json(plan))
    && table.experimentId !== CANDIDATE_VIDEO_ID_PROFILE_V005.experimentId, 'id-v005-source-canonical-or-experiment');
  const previous = inspectCandidateVideoIdExecutionRecordV004(sources.previousRecord, table, plan);
  check(previous.prepared && previous.normalPause && !previous.abnormal && previous.counts.inference === 10
    && previous.events.at(-1)?.stage === 'inference' && previous.events.at(-1)?.phase === 'complete',
  'id-v005-previous-calibration-not-complete');
  if (table.origin === 'live') check(bindings.previousRecord.fileSha256 === ID_PREVIOUS_RECORD_SHA_V005
    && previous.events.length === 101 && sources.previousRecord.length === 4329602, 'id-v005-approved-old-history-changed');
  const requests = buildCandidateVideoIdFixedRequestsV005(table, plan);
  requests.forEach((target, index) => check(target.previousExactRequestSha256 === previous.requests[index].exactRequestSha256,
    'id-v005-previous-request-sha-mismatch'));
  return {table, plan, requests, bindings};
}
function idRequestIdentitiesV005(requests: CandidateVideoIdFixedRequestV005[]): IdRequestIdentityV005[] {
  return requests.map(({itemId, condition, exactRequestSha256, previousExactRequestSha256}) =>
    ({itemId, condition, exactRequestSha256, previousExactRequestSha256}));
}
/** Builds invocation data from an explicit authorization; it neither saves an
 * approval nor grants inference or a monetary frame. */
export function buildCandidateVideoIdPreparationApprovalV005(sources: CandidateVideoIdSourcesV005,
  authorization: {approvedBy: 'mock' | 'kawafmm'; approvalReference: string}, priceReview: CandidateVideoIdPriceReviewV005
): CandidateVideoIdPreparationApprovalV005 {
  const source = idReadSourcesV005(sources);
  const approval: CandidateVideoIdPreparationApprovalV005 = {
    schemaVersion: 'candidate-video-understanding-id-preparation-approval-v005',
    experimentId: 'task-035', origin: source.table.origin, ...authorization, phase: 'prepare',
    profile: structuredClone(CANDIDATE_VIDEO_ID_PROFILE_V005), sources: source.bindings,
    requests: idRequestIdentitiesV005(source.requests), priceReview: structuredClone(priceReview)
  };
  idAssertPreparationApprovalV005(approval, source, priceReview.checkedAt); return approval;
}
type IdSourcesReadV005 = ReturnType<typeof idReadSourcesV005>;
function idAssertPriceV005(review: CandidateVideoIdPriceReviewV005,
  context: {origin: 'mock' | 'live'; approvalReference: string}, now: string) {
  assertCandidateVideoIdPriceReviewV005(review); idTimestampV004(now);
  check(review.origin === context.origin && review.experimentId === 'task-035'
    && review.approvalReference === context.approvalReference && Date.parse(review.checkedAt) <= Date.parse(now)
    && now.slice(0, 10) <= review.standardPrice.validThrough, 'id-v005-price-context-or-time');
}
function idAssertPreparationApprovalV005(approval: CandidateVideoIdPreparationApprovalV005,
  source: IdSourcesReadV005, now: string) {
  check(approval && same(Object.keys(approval).sort(), ['schemaVersion','experimentId','origin','approvedBy',
    'approvalReference','phase','profile','sources','requests','priceReview'].sort()), 'id-v005-prepare-approval-keys');
  check(approval.schemaVersion === 'candidate-video-understanding-id-preparation-approval-v005'
    && approval.experimentId === 'task-035' && approval.origin === source.table.origin
    && approval.approvedBy === (source.table.origin === 'live' ? 'kawafmm' : 'mock')
    && typeof approval.approvalReference === 'string' && approval.approvalReference.trim() === approval.approvalReference
    && approval.approvalReference.length > 0 && !/[\u0000-\u001f\u007f]/u.test(approval.approvalReference)
    && approval.phase === 'prepare' && same(approval.profile, CANDIDATE_VIDEO_ID_PROFILE_V005)
    && same(approval.sources, source.bindings) && same(approval.requests, idRequestIdentitiesV005(source.requests)),
  'id-v005-prepare-approval-binding');
  idAssertPriceV005(approval.priceReview, approval, now);
}
function idExactPreparationV005(operation: 'metadata-get' | 'count-tokens', source: IdSourcesReadV005,
  index: number) {
  if (operation === 'metadata-get') return {method: 'GET' as const, url: source.plan.files[index].uri, body: null};
  return {method: 'POST' as const, url: `${ORIGIN}/v1beta/models/${MODEL}:countTokens`,
    body: {generateContentRequest: {model: `models/${MODEL}`, ...source.requests[index].request.body}}};
}
function idMeasurementV005(raw: Buffer, target: CandidateVideoIdFixedRequestV005, origin: 'mock' | 'live') {
  const root = object(JSON.parse(raw.toString('utf8'))); integer(root.totalTokens);
  check(root.totalTokens > 0, 'id-v005-count-tokens-empty');
  return {origin, itemId: target.itemId, condition: target.condition, exactRequestSha256: target.exactRequestSha256,
    countTokensResponseSha256: byteSha(raw), totalTokens: root.totalTokens as number,
    measurementKind: origin === 'live' ? 'provider-new-8192-request' : 'simulated-new-8192-request'};
}
function idReferenceCostV005(measurements: ReturnType<typeof idMeasurementV005>[], review: CandidateVideoIdPriceReviewV005) {
  check(measurements.length === 10, 'id-v005-ten-measurements-required');
  const inputTokens = measurements.reduce((sum, measurement) => sum + BigInt(measurement.totalTokens), 0n);
  check(inputTokens <= BigInt(Number.MAX_SAFE_INTEGER), 'id-v005-input-total-out-of-range');
  const generatedTokens = BigInt(CANDIDATE_VIDEO_ID_PROFILE_V005.maxOutputTokens) * 10n;
  const inputNanoUsd = inputTokens * BigInt(review.standardPrice.inputNanoUsdPerToken);
  const generatedNanoUsd = generatedTokens * BigInt(review.standardPrice.outputIncludingThinkingNanoUsdPerToken);
  return {inputTokens: Number(inputTokens), configuredGenerationTokens: Number(generatedTokens),
    inputNanoUsd: inputNanoUsd.toString(), configuredGenerationNanoUsd: generatedNanoUsd.toString(),
    referenceTotalNanoUsd: (inputNanoUsd + generatedNanoUsd).toString(), priceReviewSha256: candidateVideoDigestV002(review),
    futureCacheDiscountAssumed: false, actualInvoiceNanoUsd: null, guaranteedTotalCap: false,
    thinkingTokensNotIndependentlyFixed: true, inferenceExpenseBudget: 'not-approved',
    historicalExperimentExpenseIncluded: false};
}
function idV005Raw(event: CandidateVideoIdEventV005) {
  const detail = event.detail;
  check(detail.rawOmissionReason === null && typeof detail.rawResponseBase64 === 'string', 'id-v005-raw-omitted');
  const raw = Buffer.from(detail.rawResponseBase64, 'base64');
  check(raw.toString('base64') === detail.rawResponseBase64 && raw.length === detail.rawResponseByteLength
    && byteSha(raw) === detail.rawResponseSha256 && inferenceResponseIsSafe(raw, () => false), 'id-v005-raw-integrity');
  return raw;
}
type IdPreparationProofV005 = {
  origin: 'mock' | 'live'; events: CandidateVideoIdEventV005[]; prepared: boolean; abnormal: boolean;
  counts: {metadataGet: number; countTokens: number; inference: number; total: number};
  measurements: ReturnType<typeof idMeasurementV005>[]; requests: CandidateVideoIdFixedRequestV005[];
  approval: CandidateVideoIdPreparationApprovalV005 | null; referenceCost: ReturnType<typeof idReferenceCostV005> | null;
  recordSha256: string;
};
/** Replays only V005. The explicit source record is audited with V004, never
 * inserted into this record and never used as provider input or a mock answer. */
export function inspectCandidateVideoIdPreparationRecordV005(record: Buffer, sources: CandidateVideoIdSourcesV005): IdPreparationProofV005 {
  return idInspectPreparationV005(record, idReadSourcesV005(sources));
}
function idInspectPreparationV005(record: Buffer, source: IdSourcesReadV005): IdPreparationProofV005 {
  const events: CandidateVideoIdEventV005[] = [];
  const measurements: ReturnType<typeof idMeasurementV005>[] = [];
  const counts = {metadataGet: 0, countTokens: 0, inference: 0, total: 0};
  let approval: CandidateVideoIdPreparationApprovalV005 | null = null;
  let pending: CandidateVideoIdEventV005 | null = null, response: CandidateVideoIdEventV005 | null = null;
  let metadata = 0, requestsFixed = false, prepared = false, abnormal = false;
  let referenceCost: ReturnType<typeof idReferenceCostV005> | null = null;
  check(record.length === 0 || record.at(-1) === 10, 'id-v005-unterminated-record');
  const lines = record.length === 0 ? [] : record.toString('utf8').slice(0, -1).split('\n');
  for (const line of lines) {
    const event = JSON.parse(line) as CandidateVideoIdEventV005;
    const {sha256, ...content} = event;
    check(same(Object.keys(event).sort(), ['schemaVersion','sequence','previousSha256','timestamp','experimentId','origin',
      'approvalReference','stage','phase','operation','itemId','condition','detail','sha256'].sort())
      && json(event).equals(Buffer.from(line + '\n')) && sha256 === candidateVideoDigestV002(content)
      && event.schemaVersion === 'candidate-video-understanding-id-event-v005' && event.experimentId === 'task-035'
      && event.origin === source.table.origin && event.stage === 'prepare' && event.sequence === events.length + 1
      && event.previousSha256 === (events.at(-1)?.sha256 ?? null) && !prepared && !abnormal,
    'id-v005-event-chain-or-terminal');
    idTimestampV004(event.timestamp);
    check(events.length === 0 || Date.parse(event.timestamp) >= Date.parse(events.at(-1)!.timestamp), 'id-v005-clock-reversed');
    check(inferenceResponseIsSafe(json(event), () => false), 'id-v005-secret-like-record');
    if (event.phase === 'boundary') {
      check(events.length === 0 && event.operation === null && event.itemId === null && event.condition === null
        && same(Object.keys(event.detail), ['approval']), 'id-v005-first-boundary-required');
      approval = event.detail.approval; idAssertPreparationApprovalV005(approval!, source, event.timestamp);
    } else {
      check(approval && event.approvalReference === approval.approvalReference, 'id-v005-approval-required');
      if (event.phase === 'intent') {
        check(!pending && !response, 'id-v005-overlapping-intents');
        const operation = event.operation;
        check(operation === 'metadata-get' || operation === 'count-tokens', 'id-v005-preparation-operation-only');
        const isGet = operation === 'metadata-get', index = isGet ? counts.metadataGet : counts.countTokens;
        check(isGet ? !requestsFixed && index === metadata && index < 5
          : requestsFixed && metadata === 5 && index === measurements.length && index < 10, 'id-v005-operation-order-or-limit');
        const item = isGet ? source.plan.files[index] : source.requests[index];
        check(event.itemId === item.itemId && event.condition === (isGet ? null : source.requests[index].condition),
          'id-v005-operation-target');
        const exact = idExactPreparationV005(operation, source, index);
        const body = exact.body === null ? Buffer.alloc(0) : json(exact.body);
        const expected = {exactRequest: exact, exactRequestSha256: candidateVideoDigestV002(exact),
          bodyByteLength: body.length, bodySha256: byteSha(body), operationOrdinal: counts.total + 1,
          completeInferenceRequestSha256: isGet ? null : source.requests[index].exactRequestSha256,
          timeoutMs: isGet ? CANDIDATE_VIDEO_ID_PROFILE_V005.timeouts.metadataGetMs : CANDIDATE_VIDEO_ID_PROFILE_V005.timeouts.countTokensMs};
        check(same(event.detail, expected), 'id-v005-intent-complete-request-binding');
        idAssertPriceV005(approval.priceReview, approval, event.timestamp);
        source.plan.files.forEach(file => check(Date.parse(file.expirationTime) > Date.parse(event.timestamp), 'id-v005-files-expired'));
        if (isGet) counts.metadataGet++; else counts.countTokens++;
        counts.total++; pending = event;
      } else if (event.phase === 'response') {
        check(pending && !response && event.operation === pending.operation && event.itemId === pending.itemId
          && event.condition === pending.condition, 'id-v005-response-without-intent');
        check(same(Object.keys(event.detail).sort(), ['httpStatus','headerPolicy','rawOmissionReason','rawResponseBase64',
          'rawResponseByteLength','rawResponseSha256'].sort()) && Number.isSafeInteger(event.detail.httpStatus)
          && event.detail.httpStatus >= 100 && event.detail.httpStatus <= 599
          && event.detail.headerPolicy === 'not-persisted', 'id-v005-response-shape');
        if (event.detail.rawOmissionReason === null) idV005Raw(event);
        else check(event.detail.rawOmissionReason === 'secret-like-response-rejected'
          && event.detail.rawResponseBase64 === null && event.detail.rawResponseByteLength === null
          && event.detail.rawResponseSha256 === null, 'id-v005-secret-omission-shape');
        response = event;
      } else if (event.phase === 'metadata' || event.phase === 'measurement') {
        check(pending && response && response.detail.httpStatus >= 200 && response.detail.httpStatus < 300
          && event.operation === pending.operation && event.itemId === pending.itemId && event.condition === pending.condition,
        'id-v005-derived-evidence-without-success-response');
        const raw = idV005Raw(response);
        const expected = event.phase === 'metadata'
          ? {...idMetadataV004(raw, source.plan.files[metadata], event.timestamp), origin: source.table.origin}
          : idMeasurementV005(raw, source.requests[measurements.length], source.table.origin);
        check((event.phase === 'metadata') === (pending.operation === 'metadata-get') && same(event.detail, expected),
          'id-v005-derived-evidence-mismatch');
        if (event.phase === 'metadata') metadata++;
        else measurements.push(expected as ReturnType<typeof idMeasurementV005>);
        pending = null; response = null;
      } else if (event.phase === 'requests-fixed') {
        check(!pending && !response && metadata === 5 && !requestsFixed && counts.countTokens === 0
          && event.operation === null && event.itemId === null && event.condition === null
          && same(Object.keys(event.detail).sort(), ['origin','requests']), 'id-v005-request-freeze-order');
        check(event.detail.origin === source.table.origin, 'id-v005-request-origin');
        assertCandidateVideoIdFixedRequestsV005(event.detail.requests, source.table, source.plan); requestsFixed = true;
      } else if (event.phase === 'complete') {
        check(!pending && !response && metadata === 5 && requestsFixed && measurements.length === 10
          && counts.total === 15 && event.operation === null && event.itemId === null && event.condition === null,
        'id-v005-incomplete-preparation');
        referenceCost = idReferenceCostV005(measurements, approval.priceReview);
        check(same(event.detail, {status: 'prepared-awaiting-separate-inference-approval', measuredRequestCount: 10,
          referenceCost, inferenceAuthorized: false, inferenceCount: 0}), 'id-v005-completion-evidence');
        prepared = true;
      } else if (event.phase === 'failure') {
        check(same(Object.keys(event.detail).sort(), ['reason','delivery','recordPolicy','retry','repair','resend'].sort())
          && ['pre-send-validation-failed','send-outcome-unknown','response-rejected'].includes(event.detail.reason)
          && ['not-sent','unknown','response-received'].includes(event.detail.delivery)
          && event.detail.recordPolicy === 'terminal-no-resume' && event.detail.retry === 0
          && event.detail.repair === 0 && event.detail.resend === 0, 'id-v005-failure-shape');
        const delivery = event.detail.delivery;
        check(event.detail.reason === (delivery === 'unknown' ? 'send-outcome-unknown'
          : delivery === 'response-received' ? 'response-rejected' : 'pre-send-validation-failed')
          && (delivery === 'unknown' ? pending !== null && response === null
            : delivery === 'response-received' ? pending !== null && response !== null : response === null),
        'id-v005-failure-delivery-evidence');
        if (pending) check(event.operation === pending.operation && event.itemId === pending.itemId
          && event.condition === pending.condition, 'id-v005-failure-pending-target');
        else {
          const next = requestsFixed ? source.requests[measurements.length] : source.plan.files[metadata];
          check(event.operation === null ? event.itemId === null && event.condition === null
            : next && event.operation === (requestsFixed ? 'count-tokens' : 'metadata-get')
              && event.itemId === next.itemId && event.condition === (requestsFixed ? source.requests[measurements.length].condition : null),
          'id-v005-failure-unsent-target');
        }
        abnormal = true;
      } else throw new Error('id-v005-unapproved-event-phase');
    }
    check(approval && event.approvalReference === approval.approvalReference, 'id-v005-event-approval-reference');
    events.push(event);
  }
  return {origin: source.table.origin, events, prepared, abnormal, counts, measurements, requests: source.requests,
    approval, referenceCost, recordSha256: byteSha(record)};
}
type IdPreparationDepsV005 = {
  mode: 'mock' | 'live'; store: CandidateVideoIdRecordStoreV005; port: HttpPort; clock(): string;
  containsSecret(raw: Buffer): boolean; verifySources(): Promise<CandidateVideoIdSourcesV005>;
};
type IdLastResponseV005 = {rawPersistence: 'not-persisted' | 'persisted' | 'omitted-secret';
  rawResponseSha256: string | null; rawResponseByteLength: number | null; httpStatus: number};
async function idExecutePreparationV005(sources: CandidateVideoIdSourcesV005,
  approvalInput: CandidateVideoIdPreparationApprovalV005, deps: IdPreparationDepsV005) {
  const source = idReadSourcesV005(sources), approval = structuredClone(approvalInput), port = deps.port, exchange = port.exchange;
  idAssertPreparationApprovalV005(approval, source, deps.clock());
  check(deps.mode === source.table.origin && port.mode === deps.mode, 'id-v005-execution-origin');
  check((await deps.store.read()) === null, 'id-v005-preparation-already-started-no-resume');
  let prefix = Buffer.alloc(0), proof = idInspectPreparationV005(prefix, source);
  let persistenceFailed = false, actualApiCalls = 0, simulatedApiCalls = 0;
  const deliveryState: {value: 'not-sent' | 'unknown' | 'response-received'} = {value: 'not-sent'};
  let active: {operation: 'metadata-get' | 'count-tokens'; itemId: string; condition: CandidateVideoIdConditionV003 | null} | null = null;
  const lastResponse: {value: IdLastResponseV005 | null} = {value: null};
  const verify = async () => {
    check(same(approvalInput, approval) && port.mode === deps.mode && deps.port === port && port.exchange === exchange,
      'id-v005-approval-or-port-changed');
    const fresh = await deps.verifySources();
    check(same(idSourceBindingsV005(fresh), source.bindings), 'id-v005-sources-changed');
    idAssertPreparationApprovalV005(approval, source, deps.clock());
    source.plan.files.forEach(file => check(Date.parse(file.expirationTime) > Date.parse(deps.clock()), 'id-v005-files-expired'));
    check(inferenceResponseIsSafe(json({approval, requests: source.requests}), deps.containsSecret), 'id-v005-secret-request');
  };
  await verify();
  const append = async (phase: CandidateVideoIdEventV005['phase'], detail: Record<string, any>, target = active) => {
    check(!persistenceFailed, 'id-v005-persistence-terminal');
    const content = {schemaVersion: 'candidate-video-understanding-id-event-v005' as const,
      sequence: proof.events.length + 1, previousSha256: proof.events.at(-1)?.sha256 ?? null,
      timestamp: idTimestampV004(deps.clock()), experimentId: 'task-035', origin: source.table.origin,
      approvalReference: approval.approvalReference, stage: 'prepare' as const, phase,
      operation: target?.operation ?? null, itemId: target?.itemId ?? null, condition: target?.condition ?? null, detail};
    const event = {...content, sha256: candidateVideoDigestV002(content)}, next = Buffer.concat([prefix, json(event)]);
    const nextProof = idInspectPreparationV005(next, source);
    try {
      check((await deps.store.read())?.equals(prefix), 'id-v005-record-changed-before-append');
      await deps.store.append(json(event));
      check((await deps.store.read())?.equals(next), 'id-v005-record-readback-failed');
      prefix = next; proof = nextProof;
    } catch { persistenceFailed = true; throw new Error('id-v005-persistence-failed'); }
  };
  const send = async (operation: 'metadata-get' | 'count-tokens', index: number) => {
    const target = operation === 'metadata-get' ? source.plan.files[index] : source.requests[index];
    active = {operation, itemId: target.itemId, condition: operation === 'metadata-get' ? null : source.requests[index].condition};
    deliveryState.value = 'not-sent';
    const exact = idExactPreparationV005(operation, source, index), body = exact.body === null ? Buffer.alloc(0) : json(exact.body);
    const timeoutMs = operation === 'metadata-get' ? CANDIDATE_VIDEO_ID_PROFILE_V005.timeouts.metadataGetMs
      : CANDIDATE_VIDEO_ID_PROFILE_V005.timeouts.countTokensMs;
    await verify();
    await append('intent', {exactRequest: exact, exactRequestSha256: candidateVideoDigestV002(exact), bodyByteLength: body.length,
      bodySha256: byteSha(body), operationOrdinal: proof.counts.total + 1,
      completeInferenceRequestSha256: operation === 'metadata-get' ? null : source.requests[index].exactRequestSha256, timeoutMs});
    await verify(); check((await deps.store.read())?.equals(prefix), 'id-v005-immediate-intent-changed');
    deliveryState.value = 'unknown'; if (deps.mode === 'live') actualApiCalls++; else simulatedApiCalls++;
    const received = await wallClockDeadline(timeoutMs, () => exchange.call(port, {method: exact.method, url: exact.url,
      headers: exact.body === null ? {} : {'content-type': 'application/json'}, body: Buffer.from(body)}));
    deliveryState.value = 'response-received';
    const raw = Buffer.from(received.body), safe = inferenceResponseIsSafe(raw, deps.containsSecret);
    lastResponse.value = {rawPersistence: 'not-persisted', rawResponseSha256: safe ? byteSha(raw) : null,
      rawResponseByteLength: safe ? raw.length : null, httpStatus: received.status};
    await append('response', {httpStatus: received.status, headerPolicy: 'not-persisted',
      rawOmissionReason: safe ? null : 'secret-like-response-rejected', rawResponseBase64: safe ? raw.toString('base64') : null,
      rawResponseByteLength: safe ? raw.length : null, rawResponseSha256: safe ? byteSha(raw) : null});
    lastResponse.value.rawPersistence = safe ? 'persisted' : 'omitted-secret';
    check(safe && received.status >= 200 && received.status < 300, 'id-v005-response-rejected');
    if (operation === 'metadata-get') await append('metadata', {...idMetadataV004(raw, source.plan.files[index], deps.clock()), origin: deps.mode});
    else await append('measurement', idMeasurementV005(raw, source.requests[index], deps.mode));
    active = null; deliveryState.value = 'not-sent';
  };
  try {
    await deps.store.create(Buffer.alloc(0));
    check((await deps.store.read())?.equals(prefix), 'id-v005-empty-record-readback');
    await append('boundary', {approval}, null);
    for (let index = 0; index < 5; index++) await send('metadata-get', index);
    await append('requests-fixed', {origin: deps.mode, requests: source.requests}, null);
    for (let index = 0; index < 10; index++) await send('count-tokens', index);
    await verify();
    await append('complete', {status: 'prepared-awaiting-separate-inference-approval', measuredRequestCount: 10,
      referenceCost: idReferenceCostV005(proof.measurements, approval.priceReview), inferenceAuthorized: false, inferenceCount: 0}, null);
  } catch {
    if (!persistenceFailed && proof.events.length > 0 && !proof.prepared && !proof.abnormal) {
      try { await append('failure', {reason: deliveryState.value === 'unknown' ? 'send-outcome-unknown'
        : deliveryState.value === 'response-received' ? 'response-rejected' : 'pre-send-validation-failed', delivery: deliveryState.value,
        recordPolicy: 'terminal-no-resume', retry: 0, repair: 0, resend: 0}); }
      catch { persistenceFailed = true; }
    } else if (proof.events.length === 0) persistenceFailed = true;
  }
  let savedRecordVerifiable = false;
  try { const saved = await deps.store.read(); check(saved && saved.equals(prefix), 'id-v005-final-readback');
    proof = idInspectPreparationV005(saved, source); savedRecordVerifiable = true;
  } catch { persistenceFailed = true; }
  return {status: proof.prepared && !persistenceFailed ? 'prepared' as const : 'stopped' as const,
    origin: deps.mode, proof, savedRecordVerifiable, persistenceFailed, lastResponse: lastResponse.value, actualApiCalls, simulatedApiCalls,
    inferenceCount: 0, retry: 0, repair: 0, resend: 0, reupload: 0, extraPoll: 0, inferenceAuthorized: false};
}
export async function executeCandidateVideoIdPreparationMockV005(sources: CandidateVideoIdSourcesV005,
  approval: CandidateVideoIdPreparationApprovalV005, deps: {
    store: CandidateVideoIdRecordStoreV005; port: HttpPort; clock(): string; containsSecret?(raw: Buffer): boolean;
    verifySources?(): Promise<CandidateVideoIdSourcesV005>
  }) {
  check(deps.port?.mode === 'mock' && approval.origin === 'mock' && idMemoryStoresV005.has(deps.store),
    'id-v005-mock-origin-and-memory-store-required');
  return idExecutePreparationV005(sources, approval, {mode: 'mock', store: deps.store, port: deps.port,
    clock: deps.clock, containsSecret: deps.containsSecret ?? (() => false), verifySources: deps.verifySources ?? (async () => sources)});
}
async function idLiveSourcesV005(workspace: string): Promise<CandidateVideoIdSourcesV005> {
  const workspaceReal = await realpath(workspace);
  const directory = resolve(workspaceReal, dirname(CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004.inputTable));
  await assertIdDirectoryV004(directory, workspaceReal);
  const read = async (relative: string) => {
    const file = resolve(workspaceReal, relative), stat = await lstat(file);
    check(stat.isFile() && !stat.isSymbolicLink(), 'id-v005-source-not-regular'); return readFile(file);
  };
  const [inputTable, executionPlan, previousRecord] = await Promise.all([
    read(CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004.inputTable), read(CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004.executionPlan),
    read(CANDIDATE_VIDEO_ID_ARTIFACT_PATHS_V004.executionRecord)]);
  // Admission must precede any assertion that relies on this process's
  // independently rebuilt semantic/media bindings. A saved receipt is not it.
  const table: unknown = JSON.parse(inputTable.toString('utf8'));
  await verifyCandidateVideoIdInputTableV004(workspaceReal, table, 'live');
  const sources = {inputTable, executionPlan, previousRecord}; idReadSourcesV005(sources);
  return sources;
}
export async function readCandidateVideoIdLiveSourcesV005(workspace: string,
  authorization: {approvedBy: 'kawafmm'; approvalReference: string}) {
  check(authorization?.approvedBy === 'kawafmm' && authorization.approvalReference?.trim().length > 0,
    'id-v005-explicit-source-read-authorization');
  return idLiveSourcesV005(workspace);
}
async function idLiveRecordV005(workspace: string): Promise<CandidateVideoIdRecordStoreV005> {
  const workspaceReal = await realpath(workspace);
  const directory = resolve(workspaceReal, dirname(CANDIDATE_VIDEO_ID_PROFILE_V005.executionRecordPath));
  await assertIdDirectoryV004(directory, workspaceReal);
  const file = resolve(workspaceReal, CANDIDATE_VIDEO_ID_PROFILE_V005.executionRecordPath);
  const read = async () => {
    try { const stat = await lstat(file); check(stat.isFile() && !stat.isSymbolicLink(), 'id-v005-record-not-regular'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
    return readFile(file);
  };
  return {read,
    async create(data) {
      const handle = await open(file, 'wx', 0o600);
      try { await handle.writeFile(data); await handle.sync(); } finally { await handle.close(); }
      const parent = await open(directory, 'r'); try { await parent.sync(); } finally { await parent.close(); }
      check((await read())?.equals(data), 'id-v005-record-create-readback');
    },
    async append(data) {
      check(await read() !== null, 'id-v005-record-missing');
      const handle = await open(file, fsConstants.O_WRONLY | fsConstants.O_APPEND | fsConstants.O_NOFOLLOW);
      try { const written = await handle.write(data); check(written.bytesWritten === data.length, 'id-v005-short-append');
        await handle.sync(); } finally { await handle.close(); }
    }
  };
}
/** This live entry can issue only the fifteen expressly authorized preparation
 * operations. There is no upload, inference, environment lookup, or retry. */
export async function runApprovedCandidateVideoIdPreparationV005(workspace: string,
  approval: CandidateVideoIdPreparationApprovalV005, apiKey: string) {
  check(approval?.origin === 'live' && approval.approvedBy === 'kawafmm' && typeof apiKey === 'string'
    && apiKey.trim().length > 0, 'id-v005-live-preparation-authorization');
  const sources = await idLiveSourcesV005(workspace), source = idReadSourcesV005(sources);
  idAssertPreparationApprovalV005(approval, source, new Date().toISOString());
  const allowed = [...source.plan.files.map((_, i) => idExactPreparationV005('metadata-get', source, i)),
    ...source.requests.map((_, i) => idExactPreparationV005('count-tokens', source, i))];
  const port: HttpPort = {mode: 'live', async exchange(request) {
    check(allowed.some(exact => request.method === exact.method && request.url === exact.url
      && request.body.equals(exact.body === null ? Buffer.alloc(0) : json(exact.body))), 'id-v005-live-preparation-request-not-approved');
    const timeoutMs = request.method === 'GET' ? CANDIDATE_VIDEO_ID_PROFILE_V005.timeouts.metadataGetMs
      : CANDIDATE_VIDEO_ID_PROFILE_V005.timeouts.countTokensMs;
    return createDirectRestPort({approvedBy: 'kawafmm', approvalReference: approval.approvalReference,
      phase: 'upload-and-count', manifestSha256: candidateVideoDigestV002(approval), timeoutMs}, apiKey).exchange(request);
  }};
  return idExecutePreparationV005(sources, approval, {mode: 'live', store: await idLiveRecordV005(workspace), port,
    clock: () => new Date().toISOString(), containsSecret: raw => raw.includes(Buffer.from(apiKey)),
    verifySources: () => idLiveSourcesV005(workspace)});
}

// These are requirements for a FUTURE, separate inference approval, not an
// operational grant. The immutable task-035 preparation profile still allows
// zero inference and contains no monetary frame. No factory selects a budget.
export const CANDIDATE_VIDEO_ID_INFERENCE_LIMITS_V005 = Object.freeze({
  metadataGet: 0, countTokens: 0, inference: 10, perConditionInference: 1, total: 10
} as const);
export const CANDIDATE_VIDEO_ID_INFERENCE_POLICY_V005 = Object.freeze({
  modelAnswerContractFailure: 'persist-rejected-condition-and-continue', infrastructureFailure: 'stop-all',
  unknownUsageOrCost: 'stop-all', costAtOrAboveLimit: 'stop-all', retry: 0, repair: 0, resend: 0
} as const);
export type CandidateVideoIdInferenceApprovalV005 = {
  schemaVersion: 'candidate-video-understanding-id-inference-approval-v005'; experimentId: 'task-035';
  origin: 'mock' | 'live'; approvedBy: 'mock' | 'kawafmm'; approvalReference: string; phase: 'inference';
  expectedRecordSha256: string; sources: IdSourceBindingsV005; requests: IdRequestIdentityV005[];
  maximumNanoUsd: string; timeoutMs: 600000; limits: typeof CANDIDATE_VIDEO_ID_INFERENCE_LIMITS_V005;
  executionPolicy: typeof CANDIDATE_VIDEO_ID_INFERENCE_POLICY_V005;
  cacheBillingReview: CandidateVideoIdCacheBillingReviewV004; usageScalarReview: CandidateVideoIdUsageScalarReviewV004;
};
type IdUsageAssessmentV005 = {
  schemaVersion: 'candidate-video-understanding-id-usage-v005'; origin: 'mock' | 'live';
  providerUsage: unknown; normalizedProviderUsage: ReturnType<typeof deriveCandidateVideoIdScalarUsageV004>['normalizedProviderUsage'] | null;
  usageNormalization: ReturnType<typeof deriveCandidateVideoIdScalarUsageV004>['usageNormalization'] | null;
  billingBreakdown: ReturnType<typeof deriveCandidateVideoIdScalarUsageV004>['billingBreakdown'] | null;
  complete: boolean; estimatedNanoUsd: string | null; actualCharge: 'mock-no-charge' | 'not-an-invoice';
  estimateIsGuaranteedCap: false; billingReviewSha256: string; normalizationReviewSha256: string;
  feeFailure: 'unsupported-or-invalid-usage' | null;
};
type IdTargetStateV005 = {
  itemId: string; condition: CandidateVideoIdConditionV003; consumed: boolean;
  delivery: 'not-sent' | 'unknown' | 'response-received'; acceptance: 'not-evaluated' | 'accepted' | 'rejected';
  feeStatus: 'not-sent' | 'unknown' | 'estimated'; usage: IdUsageAssessmentV005 | null;
  result: ReturnType<typeof idAcceptedV004> | null; rejection: ReturnType<typeof idRejectedInferenceV005> | null;
};
export type CandidateVideoIdExecutionProofV005 = {
  origin: 'mock' | 'live'; events: CandidateVideoIdEventV005[]; preparation: IdPreparationProofV005;
  prepared: boolean; completed: boolean; abnormal: boolean;
  counts: {metadataGet: number; countTokens: number; inference: number; total: number};
  targets: IdTargetStateV005[]; estimatedNanoUsd: string; unknownFeeRecorded: boolean;
  approval: CandidateVideoIdInferenceApprovalV005 | null; recordSha256: string;
  preparationRecordSha256: string; preparationRecordByteLength: number;
};
function idInferenceApprovalV005(value: CandidateVideoIdInferenceApprovalV005,
  source: IdSourcesReadV005, preparation: IdPreparationProofV005, preparationBytes: Buffer, now: string) {
  check(value && same(Object.keys(value).sort(), ['schemaVersion','experimentId','origin','approvedBy','approvalReference',
    'phase','expectedRecordSha256','sources','requests','maximumNanoUsd','timeoutMs','limits','executionPolicy',
    'cacheBillingReview','usageScalarReview'].sort()), 'id-v005-inference-approval-keys');
  check(preparation.prepared && !preparation.abnormal && preparation.events.length === 48
    && preparation.counts.inference === 0 && preparation.counts.total === 15,
  'id-v005-inference-requires-complete-preparation');
  check(value.schemaVersion === 'candidate-video-understanding-id-inference-approval-v005'
    && value.experimentId === 'task-035' && value.origin === source.table.origin
    && value.approvedBy === (source.table.origin === 'live' ? 'kawafmm' : 'mock') && value.phase === 'inference'
    && typeof value.approvalReference === 'string' && value.approvalReference.length > 0
    && value.approvalReference.trim() === value.approvalReference && !/[\u0000-\u001f\u007f]/u.test(value.approvalReference)
    && value.approvalReference !== preparation.approval!.approvalReference
    && value.expectedRecordSha256 === byteSha(preparationBytes) && same(value.sources, source.bindings)
    && same(value.requests, idRequestIdentitiesV005(source.requests))
    && value.timeoutMs === 600000 && same(value.limits, CANDIDATE_VIDEO_ID_INFERENCE_LIMITS_V005)
    && same(value.executionPolicy, CANDIDATE_VIDEO_ID_INFERENCE_POLICY_V005), 'id-v005-inference-approval-binding');
  check(typeof value.maximumNanoUsd === 'string' && /^[1-9]\d*$/u.test(value.maximumNanoUsd),
    'id-v005-positive-explicit-inference-budget-required');
  idTimestampV004(now);
  check(Date.parse(now) >= Date.parse(preparation.events.at(-1)!.timestamp), 'id-v005-inference-precedes-preparation');
  const context = {origin: value.origin, experimentId: value.experimentId, approvalReference: value.approvalReference, now};
  // No V004 cost argument: that argument asserts task-030's historical US$1
  // frame. Only the already reviewed unit prices and scalar rules are reused.
  assertCandidateVideoIdCacheBillingReviewV004(value.cacheBillingReview, undefined, context);
  assertCandidateVideoIdUsageScalarReviewV004(value.usageScalarReview, value.cacheBillingReview, undefined, context);
  const preparedPrice = preparation.approval!.priceReview.standardPrice;
  check(value.cacheBillingReview.standardPrice.inputNanoUsdPerToken === preparedPrice.inputNanoUsdPerToken
    && value.cacheBillingReview.standardPrice.outputNanoUsdPerToken === preparedPrice.outputIncludingThinkingNanoUsdPerToken
    && value.cacheBillingReview.standardPrice.thinkingNanoUsdPerToken === preparedPrice.outputIncludingThinkingNanoUsdPerToken
    && value.cacheBillingReview.standardPrice.validThrough === preparedPrice.validThrough,
  'id-v005-inference-reviewed-prices-differ');
}
export function buildCandidateVideoIdInferenceApprovalV005(sources: CandidateVideoIdSourcesV005, preparedRecord: Buffer,
  authorization: {approvedBy: 'mock' | 'kawafmm'; approvalReference: string; expectedRecordSha256: string; maximumNanoUsd: string},
  reviews: {cacheBillingReview: CandidateVideoIdCacheBillingReviewV004; usageScalarReview: CandidateVideoIdUsageScalarReviewV004}
): CandidateVideoIdInferenceApprovalV005 {
  const source = idReadSourcesV005(sources), preparation = idInspectPreparationV005(preparedRecord, source);
  const approval: CandidateVideoIdInferenceApprovalV005 = {
    schemaVersion: 'candidate-video-understanding-id-inference-approval-v005', experimentId: 'task-035',
    origin: source.table.origin, ...authorization, phase: 'inference', sources: source.bindings,
    requests: idRequestIdentitiesV005(source.requests), timeoutMs: 600000,
    limits: structuredClone(CANDIDATE_VIDEO_ID_INFERENCE_LIMITS_V005),
    executionPolicy: structuredClone(CANDIDATE_VIDEO_ID_INFERENCE_POLICY_V005),
    cacheBillingReview: structuredClone(reviews.cacheBillingReview), usageScalarReview: structuredClone(reviews.usageScalarReview)
  };
  idInferenceApprovalV005(approval, source, preparation, preparedRecord, reviews.usageScalarReview.checkedAt);
  return approval;
}
function idInferenceWireV005(target: CandidateVideoIdFixedRequestV005) {
  return {method: target.request.method, url: target.request.url, body: target.request.body};
}
function idInferenceFrameV005(approval: CandidateVideoIdInferenceApprovalV005, cumulative: string,
  preparation: IdPreparationProofV005, target: CandidateVideoIdFixedRequestV005) {
  check(/^(?:0|[1-9]\d*)$/u.test(cumulative), 'id-v005-invalid-cumulative-fee');
  const accrued = BigInt(cumulative), maximum = BigInt(approval.maximumNanoUsd);
  check(accrued < maximum, 'id-v005-inference-fee-frame-reached');
  const measurement = preparation.measurements.find(value => idKeyV004(value) === idKeyV004(target));
  check(measurement && measurement.origin === approval.origin && measurement.exactRequestSha256 === target.exactRequestSha256,
    'id-v005-inference-requires-new-measured-sha');
  const nextReference = BigInt(measurement.totalTokens) * BigInt(approval.cacheBillingReview.standardPrice.inputNanoUsdPerToken)
    + 8192n * BigInt(approval.cacheBillingReview.standardPrice.outputNanoUsdPerToken);
  check(accrued + nextReference <= maximum, 'id-v005-next-reference-exceeds-explicit-frame');
  return nextReference.toString();
}
function idUsageInferenceV005(raw: Buffer, approval: CandidateVideoIdInferenceApprovalV005,
  target: CandidateVideoIdFixedRequestV005): IdUsageAssessmentV005 {
  let envelope: unknown = null;
  try { envelope = JSON.parse(raw.toString('utf8')); }
  catch (error) { if (!(error instanceof SyntaxError)) throw error; }
  const providerUsage = envelope !== null && typeof envelope === 'object' && !Array.isArray(envelope)
    ? (envelope as Record<string, unknown>).usageMetadata ?? null : null;
  const base = {schemaVersion: 'candidate-video-understanding-id-usage-v005' as const, origin: approval.origin,
    providerUsage, actualCharge: approval.origin === 'mock' ? 'mock-no-charge' as const : 'not-an-invoice' as const,
    estimateIsGuaranteedCap: false as const, billingReviewSha256: candidateVideoDigestV002(approval.cacheBillingReview),
    normalizationReviewSha256: candidateVideoDigestV002(approval.usageScalarReview)};
  try {
    const assessed = deriveCandidateVideoIdScalarUsageV004(envelope, approval.cacheBillingReview,
      approval.usageScalarReview, target.request.body);
    return {...base, complete: true, estimatedNanoUsd: assessed.estimatedNanoUsd, normalizedProviderUsage: assessed.normalizedProviderUsage,
      usageNormalization: assessed.usageNormalization, billingBreakdown: assessed.billingBreakdown, feeFailure: null};
  } catch (error) {
    if (!(error instanceof CandidateVideoUnderstandingContractErrorV001)) throw error;
    return {...base, complete: false, estimatedNanoUsd: null, normalizedProviderUsage: null,
      usageNormalization: null, billingBreakdown: null, feeFailure: 'unsupported-or-invalid-usage'};
  }
}
function idRejectedInferenceV005(raw: Buffer, error: IdObservationRejectedV004,
  usage: IdUsageAssessmentV005, cumulativeEstimatedNanoUsd: string) {
  const envelope = object(JSON.parse(raw.toString('utf8')));
  return {status: 'answer-contract-not-established', rawResponseSha256: byteSha(raw),
    answer: {candidates: envelope.candidates ?? null, promptFeedback: envelope.promptFeedback ?? null},
    rejection: {stage: error.stage, reason: error.reason}, usage, cumulativeEstimatedNanoUsd,
    observation: null, evidenceResolution: null, semanticAccuracy: 'not-evaluated', finalSelectionProduced: false,
    continuation: 'next-unexecuted-approved-condition-with-unchanged-request', retry: 0, repair: 0, resend: 0};
}

/** Explicit V005 replay. It never changes the meaning of V004 history or
 * feeds a previous calibration's responses into this experiment. */
export function inspectCandidateVideoIdExecutionRecordV005(record: Buffer,
  sources: CandidateVideoIdSourcesV005): CandidateVideoIdExecutionProofV005 {
  return idInspectExecutionV005(record, idReadSourcesV005(sources));
}
function idInspectExecutionV005(record: Buffer, source: IdSourcesReadV005): CandidateVideoIdExecutionProofV005 {
  check(Buffer.isBuffer(record) && (record.length === 0 || record.at(-1) === 10)
    && Buffer.from(record.toString('utf8'), 'utf8').equals(record), 'id-v005-execution-record-encoding');
  const lines = record.length === 0 ? [] : record.toString('utf8').slice(0, -1).split('\n');
  const firstInference = lines.findIndex(line => JSON.parse(line).stage === 'inference');
  const preparationBytes = firstInference < 0 ? Buffer.from(record) : Buffer.from(lines.slice(0, firstInference).join('\n') + '\n');
  const preparation = idInspectPreparationV005(preparationBytes, source);
  const events = [...preparation.events];
  const targets: IdTargetStateV005[] = source.requests.map(target => ({itemId: target.itemId, condition: target.condition,
    consumed: false, delivery: 'not-sent', acceptance: 'not-evaluated', feeStatus: 'not-sent', usage: null, result: null, rejection: null}));
  const counts = {...preparation.counts};
  let approval: CandidateVideoIdInferenceApprovalV005 | null = null;
  let pending: CandidateVideoIdEventV005 | null = null, response: CandidateVideoIdEventV005 | null = null;
  let usageSeen = false, completed = false, abnormal = preparation.abnormal, terminalCount = 0;
  let estimatedNanoUsd = 0n, unknownFeeRecorded = false;
  if (firstInference >= 0) check(preparation.prepared && !preparation.abnormal && preparation.events.length === 48,
    'id-v005-inference-before-complete-preparation');
  for (const line of firstInference < 0 ? [] : lines.slice(firstInference)) {
    const event = JSON.parse(line) as CandidateVideoIdEventV005;
    const {sha256, ...content} = event;
    check(same(Object.keys(event).sort(), ['schemaVersion','sequence','previousSha256','timestamp','experimentId','origin',
      'approvalReference','stage','phase','operation','itemId','condition','detail','sha256'].sort())
      && json(event).equals(Buffer.from(line + '\n')) && sha256 === candidateVideoDigestV002(content)
      && event.schemaVersion === 'candidate-video-understanding-id-event-v005' && event.experimentId === 'task-035'
      && event.origin === source.table.origin && event.stage === 'inference' && event.sequence === events.length + 1
      && event.previousSha256 === events.at(-1)!.sha256 && !completed && !abnormal, 'id-v005-inference-event-chain-or-terminal');
    idTimestampV004(event.timestamp);
    check(Date.parse(event.timestamp) >= Date.parse(events.at(-1)!.timestamp), 'id-v005-inference-clock-reversed');
    check(inferenceResponseIsSafe(json(event), () => false), 'id-v005-inference-secret-like-record');
    if (event.phase === 'boundary') {
      check(approval === null && events.length === preparation.events.length && event.operation === null
        && event.itemId === null && event.condition === null && same(Object.keys(event.detail), ['approval']),
      'id-v005-one-inference-boundary-only');
      approval = event.detail.approval;
      idInferenceApprovalV005(approval!, source, preparation, preparationBytes, event.timestamp);
    } else {
      check(approval && event.approvalReference === approval.approvalReference, 'id-v005-inference-explicit-approval-required');
      if (event.phase === 'intent') {
        check(!pending && !response && !usageSeen && counts.inference === terminalCount && counts.inference < 10
          && !unknownFeeRecorded && event.operation === 'inference', 'id-v005-once-only-inference-intent-order');
        const target = source.requests[counts.inference], state = targets[counts.inference];
        check(!state.consumed && event.itemId === target.itemId && event.condition === target.condition,
          'id-v005-once-only-inference-target');
        idInferenceApprovalV005(approval, source, preparation, preparationBytes, event.timestamp);
        source.plan.files.forEach(file => check(Date.parse(file.expirationTime) > Date.parse(event.timestamp), 'id-v005-inference-files-expired'));
        idInferenceFrameV005(approval, estimatedNanoUsd.toString(), preparation, target);
        const exact = idInferenceWireV005(target), body = json(exact.body);
        check(same(event.detail, {exactRequest: exact, exactRequestSha256: candidateVideoDigestV002(exact),
          completeInferenceRequestSha256: target.exactRequestSha256, bodySha256: byteSha(body), bodyByteLength: body.length,
          operationOrdinal: counts.total + 1, timeoutMs: 600000}), 'id-v005-inference-intent-exact-binding');
        counts.inference++; counts.total++; state.consumed = true; state.delivery = 'unknown'; state.feeStatus = 'unknown';
        pending = event;
      } else if (event.phase === 'response') {
        check(pending && !response && event.operation === 'inference' && event.itemId === pending.itemId
          && event.condition === pending.condition, 'id-v005-inference-response-without-intent');
        check(same(Object.keys(event.detail).sort(), ['httpStatus','headerPolicy','rawOmissionReason','rawResponseBase64',
          'rawResponseByteLength','rawResponseSha256'].sort()) && Number.isSafeInteger(event.detail.httpStatus)
          && event.detail.httpStatus >= 100 && event.detail.httpStatus <= 599 && event.detail.headerPolicy === 'not-persisted',
        'id-v005-inference-response-shape');
        if (event.detail.rawOmissionReason === null) idV005Raw(event);
        else check(event.detail.rawOmissionReason === 'secret-like-response-rejected'
          && event.detail.rawResponseBase64 === null && event.detail.rawResponseByteLength === null
          && event.detail.rawResponseSha256 === null, 'id-v005-inference-secret-omission-shape');
        response = event; targets[counts.inference - 1].delivery = 'response-received';
      } else if (event.phase === 'usage' || event.phase === 'accepted' || event.phase === 'rejected') {
        check(pending && response && event.operation === 'inference' && event.itemId === pending.itemId
          && event.condition === pending.condition, 'id-v005-inference-derived-without-response');
        const raw = idV005Raw(response), state = targets[counts.inference - 1], target = source.requests[counts.inference - 1];
        if (event.phase === 'usage') {
          check(!usageSeen, 'id-v005-inference-usage-already-recorded');
          const usage = idUsageInferenceV005(raw, approval, target);
          check(same(event.detail, {usage}), 'id-v005-inference-usage-rederivation');
          usageSeen = true; state.usage = usage;
          if (usage.complete) {
            check(usage.estimatedNanoUsd !== null, 'id-v005-known-fee-missing');
            estimatedNanoUsd += BigInt(usage.estimatedNanoUsd); state.feeStatus = 'estimated';
          } else { unknownFeeRecorded = true; state.feeStatus = 'unknown'; }
        } else {
          check(response.detail.httpStatus >= 200 && response.detail.httpStatus < 300 && usageSeen && state.usage?.complete
            && estimatedNanoUsd < BigInt(approval.maximumNanoUsd) && !unknownFeeRecorded,
          'id-v005-answer-terminal-requires-success-and-known-fee-within-frame');
          let accepted: ReturnType<typeof idAcceptedV004> | null = null;
          let rejected: ReturnType<typeof idRejectedInferenceV005> | null = null;
          try { accepted = idAcceptedV004(raw, source.table.inputs.find(input => input.itemId === target.itemId)!, target.condition); }
          catch (error) {
            if (!(error instanceof IdObservationRejectedV004)) throw error;
            rejected = idRejectedInferenceV005(raw, error, state.usage, estimatedNanoUsd.toString());
          }
          if (event.phase === 'accepted') {
            check(accepted !== null && rejected === null && same(event.detail, accepted), 'id-v005-accepted-answer-rederivation');
            state.acceptance = 'accepted'; state.result = accepted;
          } else {
            check(rejected !== null && accepted === null && same(event.detail, rejected), 'id-v005-rejected-answer-rederivation');
            state.acceptance = 'rejected'; state.rejection = rejected;
          }
          terminalCount++; pending = null; response = null; usageSeen = false;
        }
      } else if (event.phase === 'complete') {
        check(!pending && !response && !usageSeen && terminalCount === 10 && counts.inference === 10
          && !unknownFeeRecorded && event.operation === null && event.itemId === null && event.condition === null
          && same(event.detail, {status: 'all-ten-completed', completedTargets: 10, estimatedNanoUsd: estimatedNanoUsd.toString(),
            actualInvoiceNanoUsd: null, historicalExperimentExpenseIncluded: false}), 'id-v005-inference-not-complete');
        completed = true;
      } else if (event.phase === 'failure') {
        check(same(Object.keys(event.detail).sort(), ['reason','delivery','recordPolicy','retry','repair','resend'].sort())
          && event.detail.recordPolicy === 'terminal-no-resume' && event.detail.retry === 0
          && event.detail.repair === 0 && event.detail.resend === 0, 'id-v005-inference-failure-shape');
        const delivery = event.detail.delivery;
        check(['not-sent','unknown','response-received'].includes(delivery)
          && event.detail.reason === (delivery === 'unknown' ? 'send-outcome-unknown'
            : delivery === 'response-received' ? 'response-rejected' : 'pre-send-validation-failed')
          && (delivery === 'unknown' ? pending !== null && response === null
            : delivery === 'response-received' ? pending !== null && response !== null : response === null),
        'id-v005-inference-failure-delivery-evidence');
        if (pending) {
          check(event.operation === 'inference' && event.itemId === pending.itemId && event.condition === pending.condition,
            'id-v005-inference-failure-pending-target');
          if (delivery === 'not-sent') { targets[counts.inference - 1].delivery = 'not-sent'; targets[counts.inference - 1].feeStatus = 'not-sent'; }
        } else {
          const next = source.requests[counts.inference];
          check(event.operation === null ? event.itemId === null && event.condition === null
            : next && event.operation === 'inference' && event.itemId === next.itemId && event.condition === next.condition,
          'id-v005-inference-failure-unsent-target');
        }
        abnormal = true;
      } else throw new Error('id-v005-inference-unapproved-event');
    }
    check(approval && event.approvalReference === approval.approvalReference, 'id-v005-inference-event-approval-reference');
    events.push(event);
  }
  return {origin: source.table.origin, events, preparation, prepared: preparation.prepared, completed, abnormal, counts, targets,
    estimatedNanoUsd: estimatedNanoUsd.toString(), unknownFeeRecorded, approval, recordSha256: byteSha(record),
    preparationRecordSha256: byteSha(preparationBytes), preparationRecordByteLength: preparationBytes.length};
}

type IdInferenceDepsV005 = {
  mode: 'mock' | 'live'; store: CandidateVideoIdRecordStoreV005; port: HttpPort; clock(): string;
  containsSecret(raw: Buffer): boolean; verifySources(): Promise<CandidateVideoIdSourcesV005>;
};
async function idExecuteInferenceV005(sources: CandidateVideoIdSourcesV005,
  approvalInput: CandidateVideoIdInferenceApprovalV005, deps: IdInferenceDepsV005) {
  const source = idReadSourcesV005(sources), approval = structuredClone(approvalInput), port = deps.port, exchange = port.exchange;
  check(deps.mode === source.table.origin && port.mode === deps.mode, 'id-v005-inference-execution-origin');
  const initial = await deps.store.read(); check(initial !== null, 'id-v005-inference-preparation-record-missing');
  const preparationBytes = Buffer.from(initial);
  let prefix = Buffer.from(initial), proof = idInspectExecutionV005(prefix, source);
  check(proof.prepared && !proof.abnormal && !proof.completed && proof.approval === null && proof.events.length === 48,
    'id-v005-inference-already-started-or-not-prepared');
  idInferenceApprovalV005(approval, source, proof.preparation, preparationBytes, deps.clock());
  let persistenceFailed = false, actualApiCalls = 0, simulatedApiCalls = 0;
  const delivery = {value: 'not-sent' as 'not-sent' | 'unknown' | 'response-received'};
  let active: {itemId: string; condition: CandidateVideoIdConditionV003} | null = null;
  let lastResponse: {httpStatus: number; rawPersistence: 'not-persisted' | 'persisted' | 'omitted';
    rawResponseBase64: string | null; rawResponseSha256: string | null; rawResponseByteLength: number | null;
    rawOmissionReason: 'secret-like-response-rejected' | null; usage: IdUsageAssessmentV005 | null} | null = null;
  const verify = async () => {
    check(same(approvalInput, approval) && deps.port === port && port.mode === deps.mode && port.exchange === exchange,
      'id-v005-inference-approval-or-port-changed');
    const fresh = await deps.verifySources();
    check(same(idSourceBindingsV005(fresh), source.bindings), 'id-v005-inference-sources-changed');
    const freshSource = idReadSourcesV005(fresh);
    check(same(freshSource.requests, source.requests), 'id-v005-inference-request-rederivation-changed');
    idInferenceApprovalV005(approval, source, proof.preparation, preparationBytes, deps.clock());
    source.plan.files.forEach(file => check(Date.parse(file.expirationTime) > Date.parse(deps.clock()), 'id-v005-inference-files-expired'));
    check(inferenceResponseIsSafe(json({approval, requests: source.requests}), deps.containsSecret), 'id-v005-inference-secret-request');
    check((await deps.store.read())?.equals(prefix), 'id-v005-inference-record-changed-before-send');
  };
  // Validation is outside the writing section: an absent/old/preparation-only
  // approval or missing/zero budget never creates an inference boundary.
  await verify();
  const append = async (phase: CandidateVideoIdEventV005['phase'], detail: Record<string, any>, target = active) => {
    check(!persistenceFailed, 'id-v005-inference-persistence-terminal');
    const content = {schemaVersion: 'candidate-video-understanding-id-event-v005' as const,
      sequence: proof.events.length + 1, previousSha256: proof.events.at(-1)!.sha256,
      timestamp: idTimestampV004(deps.clock()), experimentId: 'task-035', origin: deps.mode,
      approvalReference: approval.approvalReference, stage: 'inference' as const, phase,
      operation: target === null ? null : 'inference' as const, itemId: target?.itemId ?? null,
      condition: target?.condition ?? null, detail};
    const event = {...content, sha256: candidateVideoDigestV002(content)}, next = Buffer.concat([prefix, json(event)]);
    const nextProof = idInspectExecutionV005(next, source);
    try {
      check((await deps.store.read())?.equals(prefix), 'id-v005-inference-record-changed-before-append');
      await deps.store.append(json(event));
      check((await deps.store.read())?.equals(next), 'id-v005-inference-record-readback-failed');
      prefix = next; proof = nextProof;
    } catch { persistenceFailed = true; throw new Error('id-v005-inference-persistence-failed'); }
  };
  try {
    await append('boundary', {approval}, null);
    for (let index = 0; index < source.requests.length; index++) {
      const target = source.requests[index], exact = idInferenceWireV005(target), body = json(exact.body);
      active = {itemId: target.itemId, condition: target.condition}; delivery.value = 'not-sent';
      await verify(); idInferenceFrameV005(approval, proof.estimatedNanoUsd, proof.preparation, target);
      await append('intent', {exactRequest: exact, exactRequestSha256: candidateVideoDigestV002(exact),
        completeInferenceRequestSha256: target.exactRequestSha256, bodySha256: byteSha(body), bodyByteLength: body.length,
        operationOrdinal: proof.counts.total + 1, timeoutMs: 600000});
      await verify(); idInferenceFrameV005(approval, proof.estimatedNanoUsd, proof.preparation, target);
      check((await deps.store.read())?.equals(prefix), 'id-v005-inference-immediate-intent-changed');
      // The persisted intent has consumed the condition. Timeout, interruption
      // and any later failure never return that one-send entitlement.
      delivery.value = 'unknown'; if (deps.mode === 'live') actualApiCalls++; else simulatedApiCalls++;
      const received = await wallClockDeadline(approval.timeoutMs, () => exchange.call(port,
        {method: exact.method, url: exact.url, headers: {'content-type': 'application/json'}, body: Buffer.from(body)}));
      delivery.value = 'response-received';
      const raw = Buffer.from(received.body), safe = inferenceResponseIsSafe(raw, deps.containsSecret);
      lastResponse = {httpStatus: received.status, rawPersistence: 'not-persisted', rawResponseBase64: safe ? raw.toString('base64') : null,
        rawResponseSha256: safe ? byteSha(raw) : null, rawResponseByteLength: safe ? raw.length : null,
        rawOmissionReason: safe ? null : 'secret-like-response-rejected', usage: null};
      await append('response', {httpStatus: received.status, headerPolicy: 'not-persisted',
        rawOmissionReason: safe ? null : 'secret-like-response-rejected', rawResponseBase64: safe ? raw.toString('base64') : null,
        rawResponseByteLength: safe ? raw.length : null, rawResponseSha256: safe ? byteSha(raw) : null});
      lastResponse.rawPersistence = safe ? 'persisted' : 'omitted';
      check(safe, 'id-v005-inference-secret-response');
      const usage = idUsageInferenceV005(raw, approval, target); lastResponse.usage = usage;
      await append('usage', {usage});
      check(usage.complete, 'id-v005-inference-unknown-usage-or-fee');
      check(BigInt(proof.estimatedNanoUsd) < BigInt(approval.maximumNanoUsd), 'id-v005-inference-fee-frame-reached');
      check(received.status >= 200 && received.status < 300, 'id-v005-inference-http-rejected');
      let accepted: ReturnType<typeof idAcceptedV004> | null = null;
      let rejected: ReturnType<typeof idRejectedInferenceV005> | null = null;
      try { accepted = idAcceptedV004(raw, source.table.inputs.find(input => input.itemId === target.itemId)!, target.condition); }
      catch (error) {
        if (!(error instanceof IdObservationRejectedV004)) throw error;
        rejected = idRejectedInferenceV005(raw, error, usage, proof.estimatedNanoUsd);
      }
      // Only a narrow model-answer rejection reaches this branch. Raw/usage,
      // source admission, model provenance and persistence failures do not.
      if (rejected !== null) await append('rejected', rejected);
      else { check(accepted !== null, 'id-v005-inference-answer-terminal-missing'); await append('accepted', accepted); }
      active = null; delivery.value = 'not-sent';
    }
    await verify();
    await append('complete', {status: 'all-ten-completed', completedTargets: 10, estimatedNanoUsd: proof.estimatedNanoUsd,
      actualInvoiceNanoUsd: null, historicalExperimentExpenseIncluded: false}, null);
  } catch {
    if (!persistenceFailed && proof.approval !== null && !proof.completed && !proof.abnormal) {
      try { await append('failure', {reason: delivery.value === 'unknown' ? 'send-outcome-unknown'
        : delivery.value === 'response-received' ? 'response-rejected' : 'pre-send-validation-failed',
        delivery: delivery.value, recordPolicy: 'terminal-no-resume', retry: 0, repair: 0, resend: 0}); }
      catch { persistenceFailed = true; }
    }
  }
  let savedRecordVerifiable = false;
  try {
    const saved = await deps.store.read(); check(saved !== null && saved.equals(prefix), 'id-v005-inference-final-readback');
    proof = idInspectExecutionV005(saved, source); savedRecordVerifiable = true;
    check(saved.subarray(0, preparationBytes.length).equals(preparationBytes), 'id-v005-inference-preparation-prefix-changed');
  } catch { persistenceFailed = true; }
  return {status: proof.completed && !persistenceFailed ? 'completed' as const : 'stopped' as const,
    origin: deps.mode, proof, savedRecordVerifiable, persistenceFailed, lastResponse, actualApiCalls, simulatedApiCalls,
    inferenceCount: proof.counts.inference, retry: 0, repair: 0, resend: 0, reupload: 0, extraPoll: 0};
}
export async function executeCandidateVideoIdInferenceMockV005(sources: CandidateVideoIdSourcesV005,
  approval: CandidateVideoIdInferenceApprovalV005, deps: {
    store: CandidateVideoIdRecordStoreV005; port: HttpPort; clock(): string; containsSecret?(raw: Buffer): boolean;
    verifySources?(): Promise<CandidateVideoIdSourcesV005>
  }) {
  check(deps.port?.mode === 'mock' && approval?.origin === 'mock' && idMemoryStoresV005.has(deps.store),
    'id-v005-inference-mock-origin-and-memory-store-required');
  return idExecuteInferenceV005(sources, approval, {mode: 'mock', store: deps.store, port: deps.port, clock: deps.clock,
    containsSecret: deps.containsSecret ?? (() => false), verifySources: deps.verifySources ?? (async () => sources)});
}
/** Dormant until a separate, fully bound kawafmm approval and positive budget
 * are supplied. This entry cannot upload, poll, count tokens or infer a frame. */
export async function runApprovedCandidateVideoIdInferenceV005(workspace: string,
  approval: CandidateVideoIdInferenceApprovalV005, apiKey: string) {
  check(approval?.origin === 'live' && approval.approvedBy === 'kawafmm' && typeof apiKey === 'string'
    && apiKey.trim().length > 0, 'id-v005-live-inference-authorization');
  const sources = await idLiveSourcesV005(workspace), source = idReadSourcesV005(sources);
  const allowed = source.requests.map(idInferenceWireV005);
  const port: HttpPort = {mode: 'live', async exchange(request) {
    check(allowed.some(exact => request.method === exact.method && request.url === exact.url && request.body.equals(json(exact.body))),
      'id-v005-live-inference-request-not-approved');
    return createDirectRestPort({approvedBy: 'kawafmm', approvalReference: approval.approvalReference,
      phase: 'inference', manifestSha256: candidateVideoDigestV002(approval), timeoutMs: 600000}, apiKey).exchange(request);
  }};
  return idExecuteInferenceV005(sources, approval, {mode: 'live', store: await idLiveRecordV005(workspace), port,
    clock: () => new Date().toISOString(), containsSecret: raw => raw.includes(Buffer.from(apiKey)),
    verifySources: () => idLiveSourcesV005(workspace)});
}
