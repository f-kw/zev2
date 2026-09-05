import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {
  CandidateVideoTransport, HTTP_OPERATIONS, assertJournal, assertProviderRequestAllowlist,
  buildExactRequest, byteSha, estimateUsageCost, loadPreparationJobs, parseInference,
  PREPARATION_ROOT, verifyBoundBytes, type HttpPort, type HttpRequest, type HttpResponse,
  type JournalEvent
} from './candidate-video-understanding-transport-v001.js';
import {
  buildCandidateVideoRequestTemplateV002, canonicalJsonBytesV001, candidateVideoDigestV002,
  CANDIDATE_VIDEO_ROLE_VALUES_V001, buildCandidateVideoSeparatedComparisonWindowsV002,
  extractCandidateVideoSpeechBoundariesFromSemanticArtifactV001,
  type CandidateVideoJobV002, type CandidateVideoOutputV002
} from './candidate-video-understanding-v001.js';

const workspace = resolve(import.meta.dirname, '../..');
const bytes = canonicalJsonBytesV001;
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
      response.body = bytes({file: {name: `files/${currentItem}`}});
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

// Canonical artifact drafts are emitted to stdout; the caller uses apply_patch to publish only the approved 3 paths.
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
