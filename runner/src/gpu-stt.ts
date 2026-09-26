import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { setTimeout as delay } from 'node:timers/promises';
import { recordValue } from '@zev2/shared';

type GpuSttInput = {
  baseUrl: string;
  timeoutMs: number;
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

/** Full-input jobs: submit once, retain the receipt, and poll without resubmitting. */
export async function transcribeWithGpuStt(input: GpuSttInput): Promise<unknown> {
  if (!input.baseUrl.trim()) {
    throw new Error('GPU-STTの接続先がありません。STT_BASE_URL または stt.localServerUrl を設定してください。');
  }
  const baseUrl = new URL(input.baseUrl);
  if (!['http:', 'https:'].includes(baseUrl.protocol)) throw new Error('GPU-STTの接続先はHTTP(S)で指定してください');
  if (!Number.isSafeInteger(input.timeoutMs) || input.timeoutMs <= 0) {
    throw new Error('GPU-STTの待機時間は正の整数ミリ秒で指定してください');
  }
  const signal = AbortSignal.timeout(input.timeoutMs);
  let jobId: string | undefined;
  const requestJson = async (route: string, init?: RequestInit) => {
    const response = await fetch(new URL(route, baseUrl), { ...init, signal });
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!response.ok) throw new Error(`GPU-STT ${route} がHTTP ${response.status}を返しました: ${bytes.toString('utf8')}`);
    try {
      return { bytes, payload: recordValue(JSON.parse(bytes.toString('utf8'))) };
    } catch {
      throw new Error(`GPU-STT ${route} の応答JSONを読めません`);
    }
  };

  try {
    const health = (await requestJson('/health')).payload;
    if (health.ok !== true || health.workerActive !== true) throw new Error('GPU-STTのhealth確認で利用可能なworkerを確認できません');

    await mkdir(input.artifactDir, { recursive: true });
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(input.mediaPath, { signal })) hash.update(chunk);
    const inputSha256 = hash.digest('hex');
    const upload = await createGpuSttUpload(input.mediaPath, input.language, signal);
    const receipt = (await requestJson('/jobs', { method: 'POST', ...upload })).payload;
    const registeredJob = recordValue(receipt.job);
    if (typeof registeredJob.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(registeredJob.id)) {
      throw new Error('GPU-STTの受付応答に有効なjob IDがありません。自動再送は行いません');
    }
    jobId = registeredJob.id;
    await writeFile(path.join(input.artifactDir, 'gpu-stt-job.json'), `${JSON.stringify({
      sourceUri: input.sourceUri,
      inputSha256,
      baseUrl: baseUrl.toString(),
      language: input.language,
      registeredAt: new Date().toISOString(),
      receipt
    }, null, 2)}\n`);
    if (recordValue(registeredJob.input).sha256 !== inputSha256) throw new Error('GPU-STTの受付と送信した動画のSHA-256が一致しません');

    let job = registeredJob;
    while (true) {
      if (job.id !== jobId || recordValue(job.input).sha256 !== inputSha256) throw new Error('GPU-STTのjobと動画の対応が一致しません');
      await writeFile(path.join(input.artifactDir, 'gpu-stt-status.json'), `${JSON.stringify(job, null, 2)}\n`);
      if (job.state === 'completed') break;
      if (job.state !== 'queued' && job.state !== 'running') {
        throw new Error(`GPU-STTのjobを完了できません: ${String(job.state)} ${JSON.stringify(job.error ?? '')}`);
      }
      await delay(2000, undefined, { signal });
      job = (await requestJson(`/jobs/${jobId}`)).payload;
    }

    const result = await requestJson(`/jobs/${jobId}/result`);
    await saveRawResult(path.join(input.artifactDir, `gpu-stt-${jobId}.response.json`), result.bytes);
    if (result.payload.jobId !== jobId || recordValue(result.payload.input).sha256 !== inputSha256) {
      throw new Error('GPU-STTの結果と動画の対応が一致しません');
    }
    if (!result.payload.zevResult || typeof result.payload.zevResult !== 'object' || Array.isArray(result.payload.zevResult)) {
      throw new Error('GPU-STTの結果にZEV用の文字起こしがありません');
    }
    const durationSec = result.payload.audioDurationSeconds;
    if (typeof durationSec !== 'number' || !Number.isFinite(durationSec) || durationSec <= 0) {
      throw new Error('GPU-STTの結果に入力全体の長さがありません');
    }
    // zevResult.durationSec can be the last spoken timestamp; retain trailing silence.
    return { ...result.payload.zevResult, durationSec };
  } catch (error) {
    const tracking = jobId ? ` job ID: ${jobId}。保存した受付情報から状態を確認できます。` : ' job受付が不明な場合はGPU側の状態を確認してください。';
    if (signal.aborted) throw new Error(`GPU-STTの待機時間を超えました。GPU側のjobは取り消していません。${tracking}`, { cause: error });
    throw new Error(`GPU-STT処理に失敗しました。${tracking} ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
}
