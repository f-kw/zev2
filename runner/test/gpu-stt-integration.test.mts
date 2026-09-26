import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtemp, open, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import type { AgentRequest, Zev2State } from '@zev2/shared';
import { buildTranscriptArtifact, normalizeGpuSttResponse } from '../src/steps/transcript.js';
import { buildThemeOptionsArtifact } from '../src/steps/theme-options.js';
import { buildClipComposition } from '../src/steps/composition.js';
import { assertClipCompositionArtifact, assertThemeArtifact, assertTranscriptArtifact } from '../src/workflow-artifact-validation.js';
import { createRunnerEnvironmentFromConfig, loadRuntimeConfig } from '../../backend/src/config/runtime-config.js';
import { createGpuSttUpload, resumeGpuSttJob, transcribeWithGpuStt, GpuSttClientInterruptedError } from '../src/gpu-stt.js';

test('4GBを超える動画でも送信サイズを32bitへ切り詰めず、未送信streamを閉じられる', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zev-gpu-large-upload-'));
  const mediaPath = path.join(directory, 'large.mp4');
  const file = await open(mediaPath, 'w');
  const size = 2 ** 32 + 17;
  await file.truncate(size); await file.close();
  try {
    const upload = await createGpuSttUpload(mediaPath, 'ja');
    assert(Number(upload.headers['content-length']) > size);
    assert.match(upload.headers['content-type'], /^multipart\/form-data; boundary=/);
    assert.equal(upload.duplex, 'half');
    await upload.body.cancel();
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('multipart送信は二進データ・日本語ファイル名を保持し、宣言サイズと全送信bytesが一致する', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zev-gpu-upload-bytes-'));
  const mediaPath = path.join(directory, '元動画.mp4');
  const bytes = Buffer.from([0, 255, 13, 10, 128, 34]);
  await writeFile(mediaPath, bytes);
  try {
    const upload = await createGpuSttUpload(mediaPath, 'ja');
    const body = Buffer.from(await new Response(upload.body).arrayBuffer());
    assert(body.toString().includes('filename="元動画.mp4"'));
    assert.equal(body.length, Number(upload.headers['content-length']));
    const headerEnd = body.indexOf('\r\n\r\n') + 4;
    assert.deepEqual(body.subarray(headerEnd, headerEnd + bytes.length), bytes);
    const boundary = upload.headers['content-type'].split('boundary=')[1];
    assert(body.subarray(headerEnd + bytes.length).toString().endsWith(`\r\nja\r\n--${boundary}--\r\n`));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

const media = Buffer.from('existing media bytes');
const sha256 = createHash('sha256').update(media).digest('hex');
const zevResult = {
  language: 'ja', durationSec: 4.4,
  segments: [
    { id: 1, startMs: 120, endMs: 800, text: '前半。', speaker: 'SPEAKER_00', speakerConfidence: 1 },
    { id: 2, startMs: 3200, endMs: 4400, text: '後半。', speaker: 'unknown' }
  ],
  speechUnitGroups: [[1, 2]]
};
type Options = {
  state?: string; unhealthy?: boolean; resultSha?: string; invalidSegments?: boolean;
  noJobId?: boolean; stalledResult?: boolean; invalidJson?: boolean; reused?: boolean;
  httpError?: boolean; disconnect?: boolean; statusSha?: string; statusJobId?: string;
  httpDelayMs?: number; stalledStatus?: boolean;
};

async function withServer(options: Options, run: (setup: {
  directory: string; mediaPath: string; baseUrl: string; calls: string[];
  execute: (timeoutMs?: number) => ReturnType<typeof buildTranscriptArtifact>;
  resume: (timeoutMs?: number) => ReturnType<typeof resumeGpuSttJob>;
}) => Promise<void>) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zev-gpu-stt-test-'));
  const mediaPath = path.join(directory, 'source.mp4');
  await writeFile(mediaPath, media);
  const calls: string[] = [];
  const job = (state: string) => ({ id: 'job_1', state, input: { sha256 } });
  let polls = 0;
  const server = createServer(async (req, res) => {
    calls.push(`${req.method} ${req.url}`);
    if (options.httpDelayMs) await delay(options.httpDelayMs);
    const json = (value: unknown) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(value)); };
    if (req.url === '/health') {
      if (options.disconnect) { req.socket.destroy(); return; }
      if (options.httpError) { res.statusCode = 503; return json({ error: 'unavailable' }); }
      return json({ ok: !options.unhealthy, workerActive: true });
    }
    if (req.url === '/jobs' && req.method === 'POST') {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const body = Buffer.concat(buffers).toString();
      assert.ok(body.includes('source.mp4') && body.includes(media.toString()) && body.includes('\r\nja\r\n'));
      res.statusCode = 202;
      return json({ job: options.noJobId ? {} : job(options.state ?? 'queued'), reused: Boolean(options.reused) });
    }
    if (req.url === '/jobs/job_1') {
      if (options.stalledStatus) {res.writeHead(200); res.write('{'); return;}
      return json({...job(options.state ?? (++polls === 1 ? 'running' : 'completed')),
        id: options.statusJobId ?? 'job_1', input: {sha256: options.statusSha ?? sha256}});
    }
    if (req.url === '/jobs/job_1/result') {
      if (options.stalledResult) { res.writeHead(200); res.write('{'); return; }
      if (options.invalidJson) return res.end('invalid JSON');
      return json({ jobId: 'job_1', input: { sha256: options.resultSha ?? sha256 }, audioDurationSeconds: 5,
        zevResult: options.invalidSegments ? { ...zevResult, segments: [{ id: 1 }] } : zevResult,
        rawOnlyEvidence: 'retained' });
    }
    res.statusCode = 404; res.end();
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const resume = (timeoutMs = 10_000) => resumeGpuSttJob({artifactDir: directory, mediaPath, sourceUri: mediaPath, timeoutMs});
  const request = { target: { sourceUri: mediaPath }, constraints: { themeCountLabel: '2件' } } as AgentRequest;
  const execute = (timeoutMs = 10_000) => buildTranscriptArtifact(request, {} as Zev2State, {
    sttServerUrl: `http://127.0.0.1:${address.port}`, sttServerTimeoutMs: timeoutMs,
    sttSamplePath: '', fixedTranscriptPath: '', useFixedTranscript: false,
    requestArtifactDir: () => directory, resolveSourceVideoPath: () => mediaPath
  });
  try { await run({ directory, mediaPath, baseUrl, calls, execute, resume }); }
  finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
}

test('非同期jobを一度だけ投入し、生結果と対応を保存して既存の後続工程が受理する', async () => {
  await withServer({}, async ({ directory, calls, execute }) => {
    const result = await execute();
    assertTranscriptArtifact(result);
    assert.equal(result.durationSec, 5, '末尾に発話がなくても入力全体の長さを維持する');
    assert.deepEqual(result.segments.map(s => [s.startMs, s.endMs, s.speaker]), [[120, 800, 'SPEAKER_00'], [3200, 4400, 'unknown']]);
    assert.deepEqual(result.speechUnitGroups, [[1], [2]]);
    assert.equal(result.sourceUri, path.join(directory, 'source.mp4'));
    const themes = await buildThemeOptionsArtifact(result, {
      target: { sourceUri: result.sourceUri }, constraints: { themeCountLabel: '2件' }
    } as AgentRequest, { contentDiscoveryMode: 'transcript', fixedThemeOptionsPath: '', sanitizePathPart: x => x });
    assertThemeArtifact(themes);
    assert.equal(themes.themes.length, 2);
    const receipt = JSON.parse(await readFile(path.join(directory, 'gpu-stt-job.json'), 'utf8'));
    assert.equal(receipt.inputSha256, sha256);
    assert.equal(receipt.receipt.job.id, 'job_1');
    assert.equal(JSON.parse(await readFile(path.join(directory, 'gpu-stt-status.json'), 'utf8')).state, 'completed');
    const raw = JSON.parse(await readFile(path.join(directory, 'gpu-stt-job_1.response.json'), 'utf8'));
    assert.equal(raw.zevResult.segments[0].speakerConfidence, 1);
    assert.deepEqual(raw.zevResult.speechUnitGroups, [[1, 2]], 'GPUの生まとまりを保持する');
    assert.equal(raw.rawOnlyEvidence, 'retained');
    assert.deepEqual(calls, ['GET /health', 'POST /jobs', 'GET /jobs/job_1', 'GET /jobs/job_1', 'GET /jobs/job_1/result']);
  });
});

test('GPUの文単位groupが変わってもZEVの断片単位入力とテーマ候補を変えない', async () => {
  const segments = [1, 2, 3, 4, 5].map(id => ({ id, startMs: id * 100, endMs: id * 100 + 50, text: `発話${id}` }));
  const request = { target: { sourceUri: 'file:///group-contract.mp4' }, constraints: { themeCountLabel: '5件' } } as AgentRequest;
  const groups = [ [[1, 2, 3, 4, 5]], [[1, 2], [3, 4, 5]], [[1], [2], [3], [4], [5]], [] ];
  for (const speechUnitGroups of groups) {
    const response = { ...zevResult, segments, speechUnitGroups };
    const preservedRaw = JSON.stringify(response);
    const transcript = normalizeGpuSttResponse(response, request);
    assertTranscriptArtifact(transcript);
    assert.deepEqual(transcript.speechUnitGroups, [[1], [2], [3], [4], [5]]);
    assert.equal(JSON.stringify(response), preservedRaw, '入力したGPU応答を変更しない');
    const themes = await buildThemeOptionsArtifact(transcript, request, { contentDiscoveryMode: 'transcript', fixedThemeOptionsPath: '', sanitizePathPart: x => x });
    assertThemeArtifact(themes);
    assert.deepEqual(themes.themes.map(t => t.representativeSpeechIds), [[1], [2], [3], [4], [5]]);
  }
});

test('candidate 59の旧STT製造単位を維持し、保存GPU結果から要求した5候補と後続を受理する', async () => {
  const old = JSON.parse(await readFile(new URL('../../evals/clip_composition/stt/nE_bNeBNp4E_qdczJpv8RCc_local30_v001/source/transcript.json', import.meta.url), 'utf8'));
  assert.deepEqual(old.speechUnitGroups, old.segments.map(s => [s.id]));
  const oldSegments = old.segments.filter(s => s.endMs > 5941162 && s.startMs < 5992736)
    .map(s => ({ ...s, startMs: s.startMs - 5941162, endMs: s.endMs - 5941162 }));
  assert.equal(oldSegments.length, 281);
  const raw = JSON.parse(await readFile(new URL('../../docs/reports/gpu-stt-integration-20260923/gpu-result.json', import.meta.url), 'utf8'));
  assert.equal(raw.zevResult.speechUnitGroups.length, 2);
  const request = { target: { sourceUri: 'file:///candidate-59.mp4' }, constraints: { themeCountLabel: '5件' } } as AgentRequest;
  const gpu = normalizeGpuSttResponse({ ...raw.zevResult, durationSec: raw.audioDurationSeconds }, request);
  assertTranscriptArtifact(gpu);
  assert.equal(gpu.speechUnitGroups.length, 269);
  assert.deepEqual(gpu.speechUnitGroups.flat(), gpu.segments.map(s => s.id));
  for (const transcript of [gpu, { ...gpu, segments: oldSegments, segmentCount: oldSegments.length, speechUnitGroups: oldSegments.map(s => [s.id]) }]) {
    assertTranscriptArtifact(transcript);
    const themes = await buildThemeOptionsArtifact(transcript, request, { contentDiscoveryMode: 'transcript', fixedThemeOptionsPath: '', sanitizePathPart: x => x });
    assertThemeArtifact(themes);
    assert.equal(themes.themes.length, 5);
    for (const theme of themes.themes) {
      assertClipCompositionArtifact(buildClipComposition(themes, transcript, theme.id));
    }
  }
});

test('保存済みjobの再利用を受理し、同じ生結果を上書きしない', async () => {
  await withServer({ state: 'completed', reused: true }, async ({ directory, execute }) => {
    await execute();
    await execute();
    const rawPath = path.join(directory, 'gpu-stt-job_1.response.json');
    await writeFile(rawPath, 'previous evidence');
    await assert.rejects(execute(), /上書きしません/);
    assert.equal(await readFile(rawPath, 'utf8'), 'previous evidence');
  });
});

for (const [name, options, pattern] of [
  ['health失敗では投入しない', { unhealthy: true }, /health/],
  ['HTTPエラーでは投入しない', { httpError: true }, /HTTP 503/],
  ['接続切断では投入しない', { disconnect: true }, /fetch failed/],
  ['受付不明では自動再送しない', { noJobId: true }, /job IDがありません/],
  ['失敗したjobでは結果を読まない', { state: 'failed' }, /failed/],
  ['中断したjobでは結果を読まない', { state: 'interrupted' }, /interrupted/],
  ['別動画の結果を拒否する', { state: 'completed', resultSha: 'different' }, /結果と動画/],
  ['応答JSON破損を拒否する', { state: 'completed', invalidJson: true }, /応答JSON/],
  ['既存形式に不適合な発話を拒否する', { state: 'completed', invalidSegments: true }, /発話.*不正/]
] as const) {
  test(name, async () => withServer(options, async ({ calls, execute }) => {
    await assert.rejects(execute(), pattern);
    assert.ok(calls.filter(x => x === 'POST /jobs').length <= 1);
    assert.ok(!calls.some(x => x.includes('/transcribe')));
  }));
}

test('待機上限ではjob情報を残し、二重投入せず終了する', async () => {
  await withServer({}, async ({ directory, calls, execute }) => {
    await assert.rejects(execute(150), error => {
      assert(error instanceof GpuSttClientInterruptedError);
      assert.equal(error.reason, 'polling-timeout'); assert.equal(error.jobId, 'job_1');
      assert.match(error.message, /resume可能/); return true;
    });
    const client = JSON.parse(await readFile(path.join(directory, 'gpu-stt-client-status.json'), 'utf8'));
    assert.equal(client.status, 'interrupted'); assert.equal(client.reason, 'polling-timeout');
    assert(['queued', 'running'].includes(client.jobState));
    assert.ok((await readdir(directory)).includes('gpu-stt-job.json'));
    assert.equal(calls.filter(x => x === 'POST /jobs').length, 1);
  });
});

test('結果の本文読み込みは個別HTTP timeoutで中断し、保存jobから再開できると通知する', async () => {
  await withServer({ state: 'completed', stalledResult: true }, async ({ execute }) => {
    await assert.rejects(execute(150), error => {
      assert(error instanceof GpuSttClientInterruptedError);
      assert.equal(error.reason, 'http-timeout'); assert.equal(error.jobId, 'job_1');
      assert.match(error.message, /resume可能/); return true;
    });
  });
});

test('既存設定へ環境接続先を渡せ、fixedはネットワークを使用しない', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zev-gpu-config-test-'));
  const saved = { url: process.env.STT_BASE_URL, config: process.env.ZEV2_RUNTIME_CONFIG_PATH };
  try {
    process.env.ZEV2_RUNTIME_CONFIG_PATH = path.join(directory, 'runtime.json');
    process.env.STT_BASE_URL = 'http://gpu.example:8000';
    await writeFile(process.env.ZEV2_RUNTIME_CONFIG_PATH, JSON.stringify({ stt: { mode: 'local', localServerUrl: '' } }));
    const local = await loadRuntimeConfig();
    assert.equal(createRunnerEnvironmentFromConfig(local).ZEV2_STT_SERVER_URL, 'http://gpu.example:8000');
    delete process.env.STT_BASE_URL;
    await assert.rejects(loadRuntimeConfig(), /STT_BASE_URL/);
    const fixedPath = path.join(directory, 'fixed.json');
    await writeFile(fixedPath, JSON.stringify(zevResult));
    const artifact = await buildTranscriptArtifact({ target: { sourceUri: 'file:///existing.mp4' } } as AgentRequest, {} as Zev2State, {
      sttServerUrl: '', sttServerTimeoutMs: 1, useFixedTranscript: true,
      sttSamplePath: '', fixedTranscriptPath: fixedPath,
      requestArtifactDir: () => { throw new Error('network path must not run'); }, resolveSourceVideoPath: () => undefined
    });
    assertTranscriptArtifact(artifact);
    assert.equal(artifact.mode, 'zev-sample-stt');
  } finally {
    if (saved.url === undefined) delete process.env.STT_BASE_URL; else process.env.STT_BASE_URL = saved.url;
    if (saved.config === undefined) delete process.env.ZEV2_RUNTIME_CONFIG_PATH; else process.env.ZEV2_RUNTIME_CONFIG_PATH = saved.config;
    await rm(directory, { recursive: true, force: true });
  }
});


test('各HTTPに独立したtimeoutを適用し、複数通信の合計が通信timeoutを超えても完了する', async () => {
  await withServer({state: 'completed', httpDelayMs: 300}, async ({execute, calls}) => {
    assertTranscriptArtifact(await execute(500));
    assert.deepEqual(calls, ['GET /health', 'POST /jobs', 'GET /jobs/job_1/result']);
  });
});

test('polling期限はupload完了後に開始し、HTTPの予算やGPU job寿命へ使わない', async () => {
  await withServer({state: 'running', httpDelayMs: 100}, async ({directory, mediaPath, baseUrl, calls}) => {
    await assert.rejects(transcribeWithGpuStt({baseUrl, timeoutMs: 500, pollingTimeoutMs: 50,
      mediaPath, sourceUri: mediaPath, language: 'ja', artifactDir: directory}),
      error => error instanceof GpuSttClientInterruptedError && error.reason === 'polling-timeout');
    assert.equal(JSON.parse(await readFile(path.join(directory, 'gpu-stt-job.json'), 'utf8')).receipt.job.id, 'job_1');
    assert.equal(calls.filter(c => c === 'GET /health').length, 1);
    assert.equal(calls.filter(c => c === 'POST /jobs').length, 1);
    assert(!calls.some(c => c.endsWith('/result')));
  });
});

test('保存受付だけを使ってrunningを返し、状態と観測時刻を保存し、POSTしない', async () => {
  await withServer({state: 'running'}, async ({directory, execute, resume, calls}) => {
    await assert.rejects(execute(150), GpuSttClientInterruptedError);
    const before = calls.length, receipt = await readFile(path.join(directory, 'gpu-stt-job.json'));
    const observation = await resume();
    assert.equal(observation.state, 'running'); assert.equal(observation.jobId, 'job_1');
    assert.equal(observation.inputSha256, sha256); assert(Number.isFinite(Date.parse(observation.observedAt)));
    assert.deepEqual(calls.slice(before), ['GET /jobs/job_1']);
    assert((await readFile(path.join(directory, 'gpu-stt-job.json'))).equals(receipt));
    const client = JSON.parse(await readFile(path.join(directory, 'gpu-stt-client-status.json'), 'utf8'));
    assert.equal(client.status, 'pending'); assert.equal(client.jobState, 'running');
  });
});

test('別Nodeプロセスで保存jobを再開し、同一jobのcompleted結果をGETだけで取得する', async () => {
  const options: Options = {state: 'running'};
  await withServer(options, async ({directory, mediaPath, execute, calls}) => {
    await assert.rejects(execute(150), GpuSttClientInterruptedError);
    options.state = 'completed';
    const before = calls.length;
    const script = `import {resumeGpuSttJob} from ${JSON.stringify(new URL('../src/gpu-stt.ts', import.meta.url).href)};
      console.log(JSON.stringify(await resumeGpuSttJob(JSON.parse(process.argv[1]))));`;
    const {stdout} = await promisify(execFile)(process.execPath,
      ['--import', new URL('../node_modules/tsx/dist/loader.mjs', import.meta.url).pathname,
        '--input-type=module', '-e', script, JSON.stringify({artifactDir: directory, mediaPath, sourceUri: mediaPath, timeoutMs: 2000})]);
    const resumed = JSON.parse(stdout);
    assert.equal(resumed.state, 'completed'); assert.equal(resumed.jobId, 'job_1');
    assert.equal(resumed.result.durationSec, 5);
    assert.deepEqual(calls.slice(before), ['GET /jobs/job_1', 'GET /jobs/job_1/result']);
    assert.equal(JSON.parse(await readFile(resumed.rawResultPath, 'utf8')).rawOnlyEvidence, 'retained');
  });
});

test('通常の文字起こし工程を再実行しても保存jobを再開し、POSTは全体で一度だけ', async () => {
  const options: Options = {state: 'running'};
  await withServer(options, async ({execute, calls}) => {
    await assert.rejects(execute(150), GpuSttClientInterruptedError);
    options.state = 'completed';
    assertTranscriptArtifact(await execute());
    assertTranscriptArtifact(await execute());
    assert.equal(calls.filter(c => c === 'POST /jobs').length, 1);
    assert.equal(calls.filter(c => c === 'GET /health').length, 1);
  });
});

for (const changed of ['source-bytes', 'source-reference', 'saved-sha', 'saved-job-id', 'server-sha', 'server-job-id'] as const) {
  test(`resumeは${changed}不一致を拒否して再投入しない`, async () => {
    const options: Options = {state: 'running'};
    await withServer(options, async ({directory, mediaPath, execute, resume, calls}) => {
      await assert.rejects(execute(150), GpuSttClientInterruptedError);
      const receiptPath = path.join(directory, 'gpu-stt-job.json');
      const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
      if (changed === 'source-bytes') await writeFile(mediaPath, 'changed media');
      if (changed === 'source-reference') receipt.sourceUri += '-different';
      if (changed === 'saved-sha') receipt.inputSha256 = '0'.repeat(64);
      if (changed === 'saved-job-id') receipt.receipt.job.id = 'invalid/id';
      if (changed === 'server-sha') options.statusSha = '0'.repeat(64);
      if (changed === 'server-job-id') options.statusJobId = 'job_other';
      await writeFile(receiptPath, JSON.stringify(receipt));
      const before = calls.length;
      await assert.rejects(resume(), /一致|不正/);
      assert(!calls.slice(before).includes('POST /jobs'));
      assert(!calls.slice(before).some(c => c.endsWith('/result')));
    });
  });
}

test('resumeでfailedを受け取っても自動再投入しない', async () => {
  const options: Options = {state: 'running'};
  await withServer(options, async ({execute, resume, calls}) => {
    await assert.rejects(execute(150), GpuSttClientInterruptedError);
    options.state = 'failed';
    const before = calls.length;
    await assert.rejects(resume(), /failed.*自動再投入しません/);
    await assert.rejects(execute(), /failed.*自動再投入しません/);
    assert.deepEqual(calls.slice(before), ['GET /jobs/job_1', 'GET /jobs/job_1']);
  });
});

test('保存受付がないresumeは通信せず拒否する', async () => {
  await withServer({}, async ({resume, calls}) => {
    await assert.rejects(resume(), /ありません.*新規投入しません/);
    assert.deepEqual(calls, []);
  });
});

test('resumeの個別HTTP timeoutもjob失敗にせず、同じ受付から再試行できる', async () => {
  const options: Options = {state: 'running'};
  await withServer(options, async ({execute, resume, calls}) => {
    await assert.rejects(execute(150), GpuSttClientInterruptedError);
    options.stalledStatus = true;
    await assert.rejects(resume(150), error => error instanceof GpuSttClientInterruptedError
      && error.reason === 'http-timeout' && error.jobId === 'job_1');
    options.stalledStatus = false; options.state = 'completed';
    assert.equal((await resume()).state, 'completed');
    assert.equal(calls.filter(c => c === 'POST /jobs').length, 1);
  });
});
