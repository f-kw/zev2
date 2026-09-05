import {createHash} from 'node:crypto';
import {request as httpsRequest} from 'node:https';
import {readFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {resolve} from 'node:path';
import {
  assertCandidateVideoJobV002, assertCandidateVideoOutputV002,
  buildCandidateVideoRequestTemplateV002, canonicalJsonBytesV001,
  candidateVideoDigestV002, deriveCandidateVideoReviewV002,
  type CandidateVideoJobV002, type CandidateVideoOutputV002
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
    return new Promise<HttpResponse>((resolveResponse, reject) => {
      const req = httpsRequest(u, {method: input.method, headers}, response => {
        const chunks: Buffer[] = [];
        response.on('data', b => chunks.push(Buffer.from(b)));
        response.on('error', () => reject(new Error('send-outcome-unknown')));
        response.on('aborted', () => reject(new Error('send-outcome-unknown')));
        response.on('end', () => resolveResponse({status: response.statusCode ?? 0,
          headers: Object.fromEntries(Object.entries(response.headers).map(([k, v]) => [k.toLowerCase(), String(v ?? '')])),
          body: Buffer.concat(chunks)}));
      });
      req.setTimeout(approval.timeoutMs, () => req.destroy(new Error('timeout')));
      req.on('error', () => reject(new Error('send-outcome-unknown')));
      req.end(input.body);
    });
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
