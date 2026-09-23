import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import type { AgentRequest, Zev2State } from '@zev2/shared';
import { buildTranscriptArtifact } from '../src/steps/transcript.js';
import { buildThemeOptionsArtifact } from '../src/steps/theme-options.js';
import { assertThemeArtifact, assertTranscriptArtifact } from '../src/workflow-artifact-validation.js';
import { createRunnerEnvironmentFromConfig, loadRuntimeConfig } from '../../backend/src/config/runtime-config.js';

const media = Buffer.from('existing media bytes');
const sha256 = createHash('sha256').update(media).digest('hex');
const zevResult = {
  language: 'ja', durationSec: 4.4,
  segments: [
    { id: 1, startMs: 120, endMs: 800, text: '前半。', speaker: 'SPEAKER_00', speakerConfidence: 1 },
    { id: 2, startMs: 3200, endMs: 4400, text: '後半。', speaker: 'unknown' }
  ],
  speechUnitGroups: [[1], [2]]
};
type Options = {
  state?: string; unhealthy?: boolean; resultSha?: string; invalidSegments?: boolean;
  noJobId?: boolean; stalledResult?: boolean; invalidJson?: boolean; reused?: boolean;
  httpError?: boolean; disconnect?: boolean;
};

async function withServer(options: Options, run: (setup: {
  directory: string; calls: string[]; execute: (timeoutMs?: number) => ReturnType<typeof buildTranscriptArtifact>;
}) => Promise<void>) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zev-gpu-stt-test-'));
  const mediaPath = path.join(directory, 'source.mp4');
  await writeFile(mediaPath, media);
  const calls: string[] = [];
  const job = (state: string) => ({ id: 'job_1', state, input: { sha256 } });
  let polls = 0;
  const server = createServer(async (req, res) => {
    calls.push(`${req.method} ${req.url}`);
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
    if (req.url === '/jobs/job_1') return json(job(++polls === 1 ? 'running' : 'completed'));
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
  const request = { target: { sourceUri: mediaPath }, constraints: { themeCountLabel: '2件' } } as AgentRequest;
  const execute = (timeoutMs = 10_000) => buildTranscriptArtifact(request, {} as Zev2State, {
    sttServerUrl: `http://127.0.0.1:${address.port}`, sttServerTimeoutMs: timeoutMs,
    sttSamplePath: '', fixedTranscriptPath: '', useFixedTranscript: false,
    requestArtifactDir: () => directory, resolveSourceVideoPath: () => mediaPath
  });
  try { await run({ directory, calls, execute }); }
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
    assert.equal(raw.rawOnlyEvidence, 'retained');
    assert.deepEqual(calls, ['GET /health', 'POST /jobs', 'GET /jobs/job_1', 'GET /jobs/job_1', 'GET /jobs/job_1/result']);
  });
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
    await assert.rejects(execute(150), /待機時間.*job_1/);
    assert.ok((await readdir(directory)).includes('gpu-stt-job.json'));
    assert.equal(calls.filter(x => x === 'POST /jobs').length, 1);
  });
});

test('結果の本文読み込みにも同じ待機上限を適用する', async () => {
  await withServer({ state: 'completed', stalledResult: true }, async ({ execute }) => {
    await assert.rejects(execute(150), /待機時間/);
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
