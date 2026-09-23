/** One asynchronous render per registered editing document; immutable inputs. */
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {createWriteStream} from 'node:fs';
import {mkdir, readFile, readdir, writeFile, rename, lstat, open, unlink, link} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bindEditingFileV001, assertEditingFileV001, hashEditingValueV001, writeEditingSnapshotV001}
  from './presentation_editing_state_v001.mjs';
import {restoreOrchestrationDrawingViewEvidenceV001} from './presentation_orchestration_v001.mjs';
import {deriveEditingPreviewRangeV001, assertEditingRangeV001} from './presentation_editing_navigation_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from './presentation_output_directory_v001.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const serialized = value => JSON.stringify(value, null, 2) + '\n';
const demand = (condition, message, code = 'EDITING_JOB_INVALID') => {
  if (!condition) {const error = new Error(message); error.code = code; throw error;}
};
const equal = (a, b) => hashEditingValueV001(a) === hashEditingValueV001(b);
const publicJob = job => job && Object.fromEntries(['id', 'kind', 'status', 'revision', 'phase', 'error', 'mediaId',
  'startedAt', 'completedAt', 'reused', 'elapsedMilliseconds'].filter(key => Object.hasOwn(job, key)).map(key => [key, job[key]]));
async function pendingRecord(file, value) {
  const pending = file + '.' + randomUUID() + '.pending';
  const handle = await open(pending, 'wx', 0o600);
  try {await handle.writeFile(serialized(value)); await handle.sync();} finally {await handle.close();}
  return pending;
}
async function syncParent(file) {
  const handle = await open(path.dirname(file), 'r');
  try {await handle.sync();} finally {await handle.close();}
}
async function removePending(file) {try {await unlink(file);} catch (error) {if (error.code !== 'ENOENT') throw error;}}
async function atomicRecord(file, value) {
  const pending = await pendingRecord(file, value);
  try {await rename(pending, file); await syncParent(file);} finally {await removePending(pending);}
}
async function publishNewRecord(file, value) {
  const pending = await pendingRecord(file, value);
  try {
    try {await link(pending, file);} catch (error) {if (error.code === 'EEXIST') return false; throw error;}
    await syncParent(file); return true;
  } finally {await removePending(pending);}
}
async function present(file) {try {return (await lstat(file)).isFile();} catch (error) {if (error.code === 'ENOENT') return false; throw error;}}
function stopWorkerGroup(child) {
  if (!Number.isSafeInteger(child.pid) || child.pid <= 1) return;
  try {process.kill(-child.pid, 'SIGTERM');} catch (error) {if (error.code !== 'ESRCH') throw error;}
}
export async function createEditingJobsV001({directory, generatedRoot, drawingRulesRef, backgroundReuseProofPath, backgroundReuseDecoderRef,
  nativeAssetReuse, workerPath = fileURLToPath(new URL('./presentation_editing_worker_v001.mjs', import.meta.url))}) {
  const media = new Map(), verifiedMedia = new Map(), verifyingMedia = new Map(), finishing = new Map();
  let latestJob = null, active = null, starting = false, refreshing = null;
  const manifest = await json(path.join(directory, 'document.json'));
  const originalRef = await bindEditingFileV001(path.join(directory, 'original-drawing-evidence.json'));
  media.set('original', {...manifest.originalMedia, drawingEvidenceRef: originalRef, createdAt: manifest.createdAt,
    label: '工程IIIの自動案・全編', renderVerified: true});
  const allSavedMedia = await readdir(path.join(directory, 'media'));
  for (const name of allSavedMedia.filter(name => /^[a-f0-9-]+\.json$/.test(name))) {
    const row = await json(path.join(directory, 'media', name));
    demand(row.schemaVersion === 'presentation-editing-media-v001' && row.id + '.json' === name, '動画登録記録が不正です');
    media.set(row.id, row);
  }
  const sameStats = (a, b) => a.length === b.length && a.every((row, index) =>
    ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs'].every(key => row[key] === b[index][key]));
  async function mediaStats(refs) {
    return Promise.all(refs.map(async ref => {
      const info = await lstat(ref.path, {bigint: true});
      demand(info.isFile() && !info.isSymbolicLink(), '登録ファイルが通常ファイルではありません', 'EDITING_BINDING_CHANGED');
      return info;
    }));
  }
  async function verifyMedia(row) {
    const refs = [row, row.drawingEvidenceRef, ...(row.resultRef ? [row.resultRef] : [])];
    const key = hashEditingValueV001({viewSha256: row.viewSha256,
      refs: refs.map(ref => ({path: ref.path, fileSha256: ref.fileSha256, bytes: ref.bytes ?? null}))});
    const before = await mediaStats(refs), cached = verifiedMedia.get(key);
    if (cached && sameStats(cached.stats, before)) {
      demand(sameStats(before, await mediaStats(refs)), '登録ファイルが確認中に変わりました', 'EDITING_BINDING_CHANGED');
      return cached.view;
    }
    if (verifyingMedia.has(key)) {await verifyingMedia.get(key); return verifyMedia(row);}
    const checking = (async () => {
      for (const ref of refs) await assertEditingFileV001(ref);
      const view = restoreOrchestrationDrawingViewEvidenceV001(await json(row.drawingEvidenceRef.path));
      demand(view.viewSha256 === row.viewSha256, '動画と編集状態の対応が変わっています');
      const after = await mediaStats(refs);
      demand(sameStats(before, after), '登録ファイルが検査中に変わりました', 'EDITING_BINDING_CHANGED');
      verifiedMedia.set(key, {stats: after, view});
      return view;
    })();
    verifyingMedia.set(key, checking);
    try {return await checking;} finally {if (verifyingMedia.get(key) === checking) verifyingMedia.delete(key);}
  }
  async function finishOnce(job, resultPath) {
    const result = await json(resultPath);
    demand(result.status === 'passed' && result.viewSha256 === job.viewSha256
      && result.projectionSha256 === job.projectionSha256 && equal(result.range, job.range), '出力は開始時の保存版・範囲と一致しません');
    demand(equal(result.drawingRulesRef, job.drawingRulesRef), '描画規則が実行開始時と一致しません');
    const candidate = await assertEditingFileV001(result.candidateVideo);
    const content = {schemaVersion: 'presentation-editing-media-v001', ...candidate, id: job.id, kind: job.kind,
      revision: job.revision, jobKey: job.jobKey, range: job.range, drawingRulesRef: job.drawingRulesRef,
      drawingEvidenceRef: job.drawingEvidenceRef, viewSha256: job.viewSha256,
      projectionSha256: job.projectionSha256, fourSavedSha256: job.fourSavedSha256,
      resultRef: await bindEditingFileV001(resultPath),
      label: job.kind === 'preview' ? '周辺確認' : '変更を反映した全編', renderVerified: true};
    await verifyMedia(content);
    const savedRecord = path.join(directory, 'media', job.id + '.json');
    let record = {...content, createdAt: new Date().toISOString()};
    if (!await publishNewRecord(savedRecord, record)) {
      const existing = await json(savedRecord), {createdAt, ...existingContent} = existing;
      demand(equal(existingContent, content) && Number.isFinite(Date.parse(createdAt)), '完成動画の登録が競合しました');
      await verifyMedia(existing); record = existing;
    }
    media.set(record.id, record);
    Object.assign(job, {status: 'succeeded', phase: job.kind === 'preview' ? 'この範囲の確認が完了しました' : '全編出力と検査が完了しました',
      completedAt: record.createdAt, mediaId: record.id,
      elapsedMilliseconds: Date.now() - Date.parse(job.startedAt)});
    await atomicRecord(job.recordPath, job);
    return record;
  }
  async function finish(job, resultPath) {
    if (finishing.has(job.id)) return finishing.get(job.id);
    const completion = finishOnce(job, resultPath);
    finishing.set(job.id, completion);
    try {return await completion;} finally {if (finishing.get(job.id) === completion) finishing.delete(job.id);}
  }
  async function fail(job, message) {
    Object.assign(job, {status: 'failed', phase: '出力に失敗しました。保存済みの変更と前の動画は保持しています。',
      error: message, completedAt: new Date().toISOString(), elapsedMilliseconds: Date.now() - Date.parse(job.startedAt)});
    await atomicRecord(job.recordPath, job);
  }
  // A previous successful output remains playable after service restart. An
  // interrupted worker is never silently promoted or assumed to have finished.
  for (const name of await readdir(path.join(directory, 'jobs'))) {
    if (!/^[a-f0-9-]+$/.test(name)) continue;
    const recordPath = path.join(directory, 'jobs', name, 'job.json');
    if (!await present(recordPath)) continue;
    const job = await json(recordPath);
    demand(job.id === name && job.recordPath === recordPath, '処理記録の参照が不正です');
    if (job.status === 'running') {
      if (await present(job.resultPath)) {try {await finish(job, job.resultPath);} catch (error) {await fail(job, error.message);}}
      else {
        let alive = false;
        if (Number.isSafeInteger(job.workerPid)) {try {process.kill(job.workerPid, 0); alive = true;} catch {}}
        if (alive) active = {job, child: null};
        else await fail(job, '前の処理は完了記録を残さず終了しました。同じ保存状態から再試行できます。');
      }
    }
    if (!latestJob || job.startedAt > latestJob.startedAt) latestJob = job;
  }
  async function refreshOnce() {
    if (active && !active.child) {
      const job = active.job;
      if (await present(job.resultPath)) {try {await finish(job, job.resultPath);} catch (error) {await fail(job, error.message);} active = null;}
      else if (await present(job.failurePath)) {await fail(job, (await json(job.failurePath)).message); active = null;}
      else {
        try {process.kill(job.workerPid, 0);} catch {await fail(job, '処理が途中終了しました。前の動画と保存状態は保持しています。'); active = null;}
      }
    }
    // Completion is public only after its durable record is written and the
    // running slot is released; otherwise the enabled next action sees busy.
    if (active?.child && active.job.status !== 'running') await active.completion;
    if (active && await present(active.job.progressPath)) {
      try {const progress = await json(active.job.progressPath); if (typeof progress.phase === 'string') active.job.phase = progress.phase;} catch {}
    }
    return publicJob(latestJob);
  }
  async function refresh() {
    if (refreshing) return refreshing;
    const observation = refreshOnce(); refreshing = observation;
    try {return await observation;} finally {if (refreshing === observation) refreshing = null;}
  }
  async function startInternal({snapshot, kind, target, contextSeconds, rangeOverride}) {
    await refresh(); demand(!active, '同じ編集対象の出力が実行中です。完了後に再実行してください。', 'EDITING_JOB_BUSY');
    demand(['preview', 'full'].includes(kind), '出力の種類が不正です');
    const started = performance.now();
    const range = rangeOverride ? assertEditingRangeV001(snapshot.view, rangeOverride)
      : kind === 'full' ? {startFrame: 0, endFrameExclusive: snapshot.view.projection.displayFrameCount}
      : deriveEditingPreviewRangeV001({view: snapshot.view, kind: target?.kind, itemId: target?.itemId,
        contextSeconds: contextSeconds ?? 2});
    const jobKey = hashEditingValueV001({revision: snapshot.revision, kind, range, drawingRulesRef});
    const id = randomUUID(), jobDirectory = path.join(directory, 'jobs', id);
    await mkdir(jobDirectory);
    const run = path.join(generatedRoot, 'run-' + id);
    const guard = assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory: run});
    await mkdir(run);
    const drawingEvidenceRef = await writeEditingSnapshotV001({snapshot, outputDirectory: path.join(jobDirectory, 'input')});
    const job = {schemaVersion: 'presentation-editing-job-v001', id, kind, status: 'running', revision: snapshot.revision,
      jobKey, startedAt: new Date().toISOString(), phase: '保存状態を固定しました。周辺の準備を始めます。',
      drawingEvidenceRef, drawingRulesRef, viewSha256: snapshot.view.viewSha256,
      projectionSha256: snapshot.view.projection.projectionSha256, fourSavedSha256: snapshot.view.fourSavedSha256,
      range, target: target ?? null, guard, recordPath: path.join(jobDirectory, 'job.json'),
      resultPath: path.join(run, 'result.json'), failurePath: path.join(run, 'failure.json'),
      progressPath: path.join(run, 'progress.json'),
      renderOptions: {drawingEvidenceRef, drawingRulesRef, outputDirectory: path.join(run, 'render'),
        evidenceDirectory: path.join(run, 'evidence'), range: kind === 'full' ? null : range,
        ...(backgroundReuseProofPath ? {backgroundReuseProofPath} : {}),
        ...(backgroundReuseDecoderRef ? {backgroundReuseDecoderRef} : {}),
        ...(nativeAssetReuse ? {nativeAssetReuse} : {})}};
    latestJob = job;
    const reusable = [...media.values()].find(row => row.jobKey === jobKey && row.renderVerified);
    if (reusable) {
      try {
        await verifyMedia(reusable);
        Object.assign(job, {status: 'succeeded', phase: '同じ保存状態・範囲の検査済み動画を再利用しました。',
          reused: true, mediaId: reusable.id, completedAt: new Date().toISOString(), elapsedMilliseconds: performance.now() - started});
        await writeFile(job.recordPath, serialized(job), {flag: 'wx', mode: 0o600}); return publicJob(job);
      } catch (error) {
        await writeFile(path.join(run, 'cache-rejected.json'), serialized({message: error.message, mediaId: reusable.id}), {flag: 'wx'});
      }
    }
    await writeFile(job.recordPath, serialized(job), {flag: 'wx', mode: 0o600});
    const child = spawn(process.execPath, [workerPath, job.recordPath], {cwd: repo, detached: true, env: {...process.env,
      PATH: path.dirname(process.execPath) + path.delimiter + process.env.PATH}, stdio: ['ignore', 'pipe', 'pipe']});
    let releaseStarting, resolveCompletion;
    const startingRecord = new Promise(resolve => {releaseStarting = resolve;});
    const completion = new Promise(resolve => {resolveCompletion = resolve;});
    active = {job, child, completion}; job.workerPid = child.pid;
    let completed = false;
    const complete = async (code, signal, spawnError) => {
      if (completed) return; completed = true;
      try {
        await startingRecord;
        if (!spawnError && code === 0 && await present(job.resultPath)) await finish(job, job.resultPath);
        else await fail(job, await present(job.failurePath) ? (await json(job.failurePath)).message
          : spawnError?.message ?? `描画処理が終了しました（終了状態 ${code ?? signal}）。`);
      } catch (error) {
        try {await fail(job, error.message);} catch (recordError) {
          Object.assign(job, {status: 'failed', phase: '処理記録を保存できませんでした。保存済みの変更は保持しています。',
            error: recordError.message});
        }
      } finally {if (active?.job.id === job.id) active = null; resolveCompletion();}
    };
    // Register both events before the first await: a spawn failure is emitted
    // on the next tick and a worker may exit before its PID record is durable.
    child.once('error', error => {void complete(null, null, error);});
    child.once('exit', (code, signal) => {void complete(code, signal);});
    child.stdout?.pipe(createWriteStream(path.join(run, 'stdout.log'), {flags: 'wx'}));
    child.stderr?.pipe(createWriteStream(path.join(run, 'stderr.log'), {flags: 'wx'}));
    let recordError;
    try {await atomicRecord(job.recordPath, job);} catch (error) {recordError = error;}
    finally {releaseStarting();}
    if (recordError) {stopWorkerGroup(child); await completion; throw recordError;}
    return publicJob(job);
  }
  async function start(options) {
    demand(!starting, '出力開始を処理中です。少し待ってください。', 'EDITING_JOB_BUSY');
    starting = true; try {return await startInternal(options);} finally {starting = false;}
  }
  async function retry(jobId) {
    await refresh();
    demand(latestJob?.id === jobId && latestJob.status === 'failed', '再試行できる失敗した処理がありません');
    demand(equal(latestJob.drawingRulesRef, drawingRulesRef), '描画規則が更新されています。現在の保存状態から新しく出力してください。');
    await assertEditingFileV001(latestJob.drawingEvidenceRef);
    const evidence = await json(latestJob.drawingEvidenceRef.path);
    const view = restoreOrchestrationDrawingViewEvidenceV001(evidence);
    const snapshot = {directory, view, source: evidence.source, state: evidence.state,
      revision: latestJob.revision, drawingRulesRef};
    return start({snapshot, kind: latestJob.kind, target: latestJob.target, rangeOverride: latestJob.range});
  }
  async function getMedia(id) {
    const row = media.get(id); demand(row, '登録されていない動画です', 'EDITING_NOT_FOUND');
    const view = await verifyMedia(row); return {row, view};
  }
  return {start, retry, refresh, getMedia,
    listMedia: revision => [...media.values()].map(row => ({id: row.id, url: '/api/editing/media/' + row.id + '.mp4',
      kind: row.kind, revision: row.revision, range: row.range, isCurrent: row.revision === revision,
      createdAt: row.createdAt, label: row.label})),
    close: async () => {
      const running = active;
      if (running?.child) {stopWorkerGroup(running.child); await running.completion;}
    },
  };
}
