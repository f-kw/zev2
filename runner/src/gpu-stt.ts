import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { setTimeout as delay } from 'node:timers/promises';
import { recordValue } from '@zev2/shared';

export type GpuSttInput = {
  baseUrl: string;
  timeoutMs: number;
  pollingTimeoutMs?: number;
  mediaPath: string;
  sourceUri: string;
  language: string;
  artifactDir: string;
};

/** Stream exact file bytes without Blob's 32-bit file-size truncation on the
 * supported Node runtime. The same multipart path handles every file size. */
export async function createGpuSttUpload(mediaPath: string, language: string, signal?: AbortSignal) {
  const { size } = await stat(mediaPath);
  if (!Number.isSafeInteger(size) || size <= 0) throw new Error('GPU-STTの入力ファイルサイズが不正です');
  const boundary = `----zev-gpu-stt-${randomUUID()}`;
  const filename = path.basename(mediaPath).replace(/[\r\n"]/g, c =>
    c === '\r' ? '%0D' : c === '\n' ? '%0A' : '%22');
  const prefix = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`);
  const suffix = Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${language}\r\n--${boundary}--\r\n`);
  const contentLength = prefix.length + size + suffix.length;
  if (!Number.isSafeInteger(contentLength)) throw new Error('GPU-STTの送信サイズが不正です');
  async function* parts() {
    yield prefix;
    let bytes = 0;
    for await (const chunk of createReadStream(mediaPath, { signal })) {
      bytes += chunk.length;
      if (bytes > size) throw new Error('GPU-STTの送信中に入力サイズが変わりました');
      yield chunk;
    }
    if (bytes !== size) throw new Error('GPU-STTの送信中に入力サイズが変わりました');
    yield suffix;
  }
  return { body: Readable.toWeb(Readable.from(parts())) as ReadableStream,
    duplex: 'half' as const,
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}`, 'content-length': String(contentLength) } };
}

async function saveRawResult(filePath: string, bytes: Buffer): Promise<void> {
  try {
    await writeFile(filePath, bytes, { flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    if (!(await readFile(filePath)).equals(bytes)) {
      throw new Error(`保存済みのGPU-STT生結果と応答が異なります。上書きしません: ${filePath}`);
    }
  }
}

type SavedJob = {
  sourceUri: string;
  inputSha256: string;
  baseUrl: string;
  receipt: Record<string, unknown>;
};
export type GpuSttResumeInput = Pick<GpuSttInput, 'artifactDir' | 'mediaPath' | 'sourceUri' | 'timeoutMs'>;
export type GpuSttJobObservation = {
  jobId: string; inputSha256: string; sourceUri: string; observedAt: string;
} & ({state: 'queued' | 'running'} | {state: 'completed'; result: unknown; rawResultPath: string});

/** Client interruption is distinct from a terminal state reported by the GPU. */
export class GpuSttClientInterruptedError extends Error {
  readonly code = 'GPU_STT_CLIENT_INTERRUPTED';
  constructor(readonly reason: 'http-timeout' | 'polling-timeout', message: string,
    readonly jobId?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'GpuSttClientInterruptedError';
  }
}

function validateTimeout(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('GPU-STTのtimeoutは正の整数ミリ秒で指定してください');
}
function httpUrl(value: string) {
  if (!value.trim()) throw new Error('GPU-STTの接続先がありません。STT_BASE_URL または stt.localServerUrl を設定してください。');
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('GPU-STTの接続先はHTTP(S)で指定してください');
  return url;
}
async function fileSha256(mediaPath: string) {
  const hash = createHash('sha256');
  // Local hashing has no HTTP deadline and does not consume the polling budget.
  for await (const chunk of createReadStream(mediaPath)) hash.update(chunk);
  return hash.digest('hex');
}
async function readSavedJob(artifactDir: string): Promise<SavedJob | undefined> {
  let bytes: string;
  try { bytes = await readFile(path.join(artifactDir, 'gpu-stt-job.json'), 'utf8'); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
  const saved = recordValue(JSON.parse(bytes));
  const receipt = recordValue(saved.receipt), job = recordValue(receipt.job);
  if (typeof job.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(job.id)
    || typeof saved.inputSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(saved.inputSha256)
    || typeof saved.sourceUri !== 'string' || !saved.sourceUri
    || typeof saved.baseUrl !== 'string') throw new Error('保存済みGPU-STT受付情報が不正です。再投入しません');
  httpUrl(saved.baseUrl);
  if (recordValue(job.input).sha256 !== saved.inputSha256) throw new Error('保存jobと受付のSHA-256が一致しません。再投入しません');
  return saved as SavedJob;
}
async function verifySource(saved: SavedJob, input: GpuSttResumeInput) {
  if (saved.sourceUri !== input.sourceUri) throw new Error('保存jobのsourceと現在の動画参照が一致しません');
  if (await fileSha256(input.mediaPath) !== saved.inputSha256) throw new Error('保存jobと元動画のSHA-256が一致しません');
}

/** Each request owns its timeout, including upload streaming and response body. */
async function requestJson(baseUrl: string, timeoutMs: number, route: string,
  makeInit?: (signal: AbortSignal) => Promise<RequestInit>) {
  validateTimeout(timeoutMs);
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    const init = await makeInit?.(signal);
    const response = await fetch(new URL(route, httpUrl(baseUrl)), {...init, signal});
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!response.ok) throw new Error(`GPU-STT ${route} がHTTP ${response.status}を返しました: ${bytes.toString('utf8')}`);
    try { return {bytes, payload: recordValue(JSON.parse(bytes.toString('utf8')))}; }
    catch { throw new Error(`GPU-STT ${route} の応答JSONを読めません`); }
  } catch (error) {
    if (signal.aborted) throw new GpuSttClientInterruptedError('http-timeout',
      `GPU-STTの個別HTTP timeout / interrupted: ${route}。GPU jobの失敗・取消を意味しません。`, undefined, {cause: error});
    throw error;
  }
}
async function recordClient(input: GpuSttResumeInput, saved: SavedJob, status: string,
  details: Record<string, unknown> = {}) {
  await writeFile(path.join(input.artifactDir, 'gpu-stt-client-status.json'), JSON.stringify({
    status, jobId: recordValue(saved.receipt.job).id, sourceUri: saved.sourceUri,
    inputSha256: saved.inputSha256, observedAt: new Date().toISOString(), ...details
  }, null, 2) + '\n');
}
async function observeJob(input: GpuSttResumeInput, saved: SavedJob,
  initialJob?: Record<string, unknown>): Promise<GpuSttJobObservation> {
  const jobId = String(recordValue(saved.receipt.job).id);
  try {
    const job = initialJob ?? (await requestJson(saved.baseUrl, input.timeoutMs, `/jobs/${jobId}`)).payload;
    if (job.id !== jobId || recordValue(job.input).sha256 !== saved.inputSha256) throw new Error('GPU-STTのjobと動画の対応が一致しません');
    await writeFile(path.join(input.artifactDir, 'gpu-stt-status.json'), JSON.stringify(job, null, 2) + '\n');
    const observation = {jobId, inputSha256: saved.inputSha256, sourceUri: saved.sourceUri, observedAt: new Date().toISOString()};
    if (job.state === 'queued' || job.state === 'running') {
      await recordClient(input, saved, 'pending', {jobState: job.state});
      return {...observation, state: job.state};
    }
    if (job.state !== 'completed') {
      await recordClient(input, saved, 'server-job-terminal', {jobState: job.state, error: job.error ?? null});
      throw new Error(`GPU-STTのjobを完了できません: ${String(job.state)} ${JSON.stringify(job.error ?? '')}。自動再投入しません`);
    }
    const result = await requestJson(saved.baseUrl, input.timeoutMs, `/jobs/${jobId}/result`);
    const rawResultPath = path.join(input.artifactDir, `gpu-stt-${jobId}.response.json`);
    await saveRawResult(rawResultPath, result.bytes);
    if (result.payload.jobId !== jobId || recordValue(result.payload.input).sha256 !== saved.inputSha256) throw new Error('GPU-STTの結果と動画の対応が一致しません');
    if (!result.payload.zevResult || typeof result.payload.zevResult !== 'object' || Array.isArray(result.payload.zevResult)) throw new Error('GPU-STTの結果にZEV用の文字起こしがありません');
    const durationSec = result.payload.audioDurationSeconds;
    if (typeof durationSec !== 'number' || !Number.isFinite(durationSec) || durationSec <= 0) throw new Error('GPU-STTの結果に入力全体の長さがありません');
    await recordClient(input, saved, 'completed', {jobState: 'completed', rawResultPath});
    return {...observation, state: 'completed', rawResultPath, result: {...result.payload.zevResult, durationSec}};
  } catch (error) {
    if (error instanceof GpuSttClientInterruptedError) {
      await recordClient(input, saved, 'interrupted', {reason: error.reason});
      throw new GpuSttClientInterruptedError(error.reason,
        `${error.message} job ID: ${jobId}。保存したgpu-stt-job.jsonからresume可能です。`, jobId, {cause: error});
    }
    throw error;
  }
}

/** Read the saved job once. This entry point never calls health or POST /jobs. */
export async function resumeGpuSttJob(input: GpuSttResumeInput): Promise<GpuSttJobObservation> {
  validateTimeout(input.timeoutMs);
  const saved = await readSavedJob(input.artifactDir);
  if (!saved) throw new Error('保存済みgpu-stt-job.jsonがありません。resumeでは新規投入しません');
  await verifySource(saved, input);
  return observeJob(input, saved);
}

/** Submit only when no receipt exists; subsequent process runs resume that receipt. */
export async function transcribeWithGpuStt(input: GpuSttInput): Promise<unknown> {
  validateTimeout(input.timeoutMs);
  const pollingTimeoutMs = input.pollingTimeoutMs ?? input.timeoutMs;
  validateTimeout(pollingTimeoutMs);
  await mkdir(input.artifactDir, {recursive: true});
  let saved = await readSavedJob(input.artifactDir);
  let initialJob: Record<string, unknown> | undefined;
  if (saved) {
    await verifySource(saved, input);
  } else {
    const baseUrl = httpUrl(input.baseUrl).toString();
    const health = (await requestJson(baseUrl, input.timeoutMs, '/health')).payload;
    if (health.ok !== true || health.workerActive !== true) throw new Error('GPU-STTのhealth確認で利用可能なworkerを確認できません');
    const inputSha256 = await fileSha256(input.mediaPath);
    const receipt = (await requestJson(baseUrl, input.timeoutMs, '/jobs', async signal => ({
      method: 'POST', ...await createGpuSttUpload(input.mediaPath, input.language, signal)
    }))).payload;
    const registeredJob = recordValue(receipt.job);
    if (typeof registeredJob.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(registeredJob.id)) throw new Error('GPU-STTの受付応答に有効なjob IDがありません。自動再送は行いません');
    saved = {sourceUri: input.sourceUri, inputSha256, baseUrl, receipt};
    await writeFile(path.join(input.artifactDir, 'gpu-stt-job.json'), JSON.stringify({
      ...saved, language: input.language, registeredAt: new Date().toISOString()
    }, null, 2) + '\n', {flag: 'wx'});
    if (recordValue(registeredJob.input).sha256 !== inputSha256) throw new Error('GPU-STTの受付と送信した動画のSHA-256が一致しません');
    initialJob = registeredJob;
  }
  // The polling budget starts after upload/receipt (or source verification on resume).
  const deadline = performance.now() + pollingTimeoutMs;
  let observation = await observeJob(input, saved, initialJob);
  while (observation.state !== 'completed') {
    const remaining = deadline - performance.now();
    if (remaining <= 0) {
      await recordClient(input, saved, 'interrupted', {reason: 'polling-timeout', jobState: observation.state});
      throw new GpuSttClientInterruptedError('polling-timeout',
        `GPU-STT client-side polling timeout / interrupted。GPU jobは${observation.state}であり、失敗・取消を意味しません。 job ID: ${observation.jobId}。保存したgpu-stt-job.jsonからresume可能です。`, observation.jobId);
    }
    await delay(Math.min(2000, remaining));
    if (performance.now() >= deadline) continue;
    observation = await observeJob(input, saved);
  }
  return observation.result;
}
