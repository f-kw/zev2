/** Process/storage tests use synthetic media bytes; they are not video evidence.
 * Caption saves still pass the real font/geometry acceptance and drawing rules. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile, lstat, utimes, rename, rm} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createEditingJobsV001} from './presentation_editing_jobs_v001.mjs';
import {initializeEditingWorkspaceV001, bindEditingFileV001,
  saveEditingOverrideV001} from './presentation_editing_state_v001.mjs';
import {AUTO_PRESENTATION_RULES_REF_V008} from './presentation_auto_effects_v001.mjs';
import {createOrchestrationContextV001, createOrchestrationJudgmentInputV001,
  fixOrchestrationJudgmentV001} from './presentation_orchestration_v001.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const saved = path.join(repo, 'docs/reports/digest-presentation-orchestration-stage3-inputs-20260918');
const {buildEditedOrchestrationDrawingRulesRefV001} = await import('./presentation_orchestration_edited_render_v001.mjs');
const rules = await buildEditedOrchestrationDrawingRulesRefV001();
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const exists = async file => {try {await lstat(file); return true;} catch (error) {if (error.code === 'ENOENT') return false; throw error;}};
async function until(operation) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {const result = await operation(); if (result) return result; await delay(10);}
  throw new Error('Synthetic worker did not reach the expected state');
}
async function fixture(t, mode = 'success') {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zev-editing-jobs-test-'));
  const generatedRoot = await mkdtemp(path.join(repo, 'evals/clip_composition/outputs/presentation/stage4-editing-jobs-test-'));
  const managers = [];
  t.after(async () => {
    for (const manager of managers) await manager.close();
    await rm(root, {recursive: true, force: true});
    await rm(generatedRoot, {recursive: true, force: true});
  });
  // Preserve the historical v007 report. Rebuild this storage-only fixture's
  // bindings with the supported v008 vocabulary and unchanged semantic choices.
  const savedInputDirectory = path.join(root, 'inputs'); await mkdir(savedInputDirectory);
  const source = await json(path.join(saved, 'source-bindings.json'));
  source.captionContext.renderingRulesRef = structuredClone(AUTO_PRESENTATION_RULES_REF_V008);
  const context = createOrchestrationContextV001(source);
  const previousInput = (await json(path.join(saved, 'selectionRecord.json'))).input;
  const evidence = Object.fromEntries(['productionPurpose', 'captions', 'contexts', 'observations',
    'audioEvidence', 'audioCandidates'].map(key => [key, previousInput[key]]));
  const input = createOrchestrationJudgmentInputV001({context, evidence});
  const reply = await json(path.join(saved, 'raw-ai-response-v001.json'));
  reply.schemaVersion = 'presentation-orchestration-judgment-v002'; reply.inputSha256 = input.inputSha256;
  // v007's Panel was the plain background; v008 requires that choice explicitly.
  for (const row of reply.captions) for (const choice of row.allowedPresets) if (choice.preset === 'panel') {
    assert.deepEqual(Object.keys(choice), ['preset']); choice.allowedBackgroundPresets = ['plain'];
  }
  const replyBytes = JSON.stringify(reply) + '\n';
  const state = fixOrchestrationJudgmentV001({context, input, replyBytes});
  for (const [name, value] of Object.entries({...state, 'source-bindings': source, 'fresh-input': input}))
    await writeFile(path.join(savedInputDirectory, name + '.json'), JSON.stringify(value) + '\n');
  await writeFile(path.join(savedInputDirectory, 'raw-ai-response-v001.json'), replyBytes);
  const original = path.join(root, 'original.mp4');
  await writeFile(original, 'SYNTHETIC BYTES: storage test, not playable media');
  const directory = path.join(root, 'editing');
  const snapshot = await initializeEditingWorkspaceV001({directory, savedInputDirectory,
    title: '検査専用・実映像ではない', originalMedia: await bindEditingFileV001(original),
    originalDrawingRulesRef: rules, drawingRulesRef: rules, backgroundProofPath: null});
  const modePath = path.join(root, 'mode.txt'), ready = path.join(root, 'ready'), release = path.join(root, 'release');
  const resultReady = path.join(root, 'result-ready'), exit = path.join(root, 'exit');
  const descendantReady = path.join(root, 'descendant-ready'), descendantStopped = path.join(root, 'descendant-stopped');
  await writeFile(modePath, mode);
  const workerPath = path.join(root, 'synthetic-worker.mjs');
  await writeFile(workerPath, `
import {readFile,writeFile,rename,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import path from 'node:path';
const job=JSON.parse(await readFile(process.argv[2],'utf8'));
const mode=await readFile(${JSON.stringify(modePath)},'utf8');
if(mode==='fail') process.exit(17);
if(mode==='descendant') {
  const source=${JSON.stringify(`const fs=require('node:fs');
process.once('SIGTERM',()=>{fs.writeFileSync(${JSON.stringify(descendantStopped)},'SIGTERM');process.exit(0)});
fs.writeFileSync(${JSON.stringify(descendantReady)},String(process.pid));setInterval(()=>{},1000);`)};
  const descendant=spawn(process.execPath,['-e',source],{stdio:'ignore'});
  while(true) {try {await stat(${JSON.stringify(descendantReady)}); break;} catch {await delay(10);}}
  await writeFile(${JSON.stringify(ready)},JSON.stringify({workerPid:process.pid,descendantPid:descendant.pid}));
  await new Promise(()=>{});
}
if(mode==='gate') {
  await writeFile(${JSON.stringify(ready)},'ready');
  while(true) {try {await stat(${JSON.stringify(release)}); break;} catch {await delay(10);}}
}
const candidatePath=path.join(path.dirname(job.resultPath),'synthetic-candidate.mp4');
const bytes=Buffer.from('SYNTHETIC RESULT: process test, not playable media');
await writeFile(candidatePath,bytes,{flag:'wx'});
if(mode==='partial-fail'||mode==='partial-cancel') {
  await writeFile(job.resultPath,JSON.stringify({status:'running',candidateVideo:{path:candidatePath}}),{flag:'wx'});
  await writeFile(${JSON.stringify(ready)},'partial candidate and incomplete result');
  if(mode==='partial-fail') process.exit(17);
  setInterval(()=>{},1000);
  await new Promise(()=>{});
}
const result={status:'passed',viewSha256:job.viewSha256,projectionSha256:job.projectionSha256,
  range:job.range,drawingRulesRef:job.drawingRulesRef,candidateVideo:{path:candidatePath,
    bytes:bytes.length,fileSha256:createHash('sha256').update(bytes).digest('hex')}};
await writeFile(job.resultPath+'.pending',JSON.stringify(result)+'\\n',{flag:'wx'});
await rename(job.resultPath+'.pending',job.resultPath);
if(mode==='gate') {
  await writeFile(${JSON.stringify(resultReady)},'ready');
  while(true) {try {await stat(${JSON.stringify(exit)}); break;} catch {await delay(10);}}
}
`);
  const create = async () => {
    const manager = await createEditingJobsV001({directory, generatedRoot, drawingRulesRef: rules, workerPath});
    managers.push(manager); return manager;
  };
  return {root, directory, generatedRoot, snapshot, original, create, modePath, ready, release, resultReady, exit,
    descendantStopped};
}
async function finished(manager) {
  return until(async () => {const job = await manager.refresh(); return job && job.status !== 'running' ? job : null;});
}

test('即時失敗を記録し、後から保存が進んでも失敗時の状態を再試行する', async t => {
  const f = await fixture(t, 'fail'), manager = await f.create();
  const started = await manager.start({snapshot: f.snapshot, kind: 'full'});
  const failed = await finished(manager);
  assert.equal(failed.id, started.id); assert.equal(failed.status, 'failed');
  const changed = await saveEditingOverrideV001({directory: f.directory, drawingRulesRef: rules,
    applicabilityOptions: {generatedRoot: f.generatedRoot, nativeAssetReuse: path.join(f.generatedRoot, 'native-assets')},
    expectedRevision: f.snapshot.revision, kind: 'caption', itemId: f.snapshot.context.captionIds[0], selection: 'Normal'});
  assert.notEqual(changed.revision, f.snapshot.revision);
  await writeFile(f.modePath, 'success');
  const retried = await manager.retry(failed.id);
  assert.equal(retried.revision, f.snapshot.revision);
  assert.equal((await finished(manager)).status, 'succeeded');
  const media = manager.listMedia(changed.revision).find(row => row.id === retried.id);
  assert.equal(media.isCurrent, false);
  const reused = await manager.start({snapshot: f.snapshot, kind: 'full'});
  assert.equal(reused.status, 'succeeded'); assert.equal(reused.reused, true); assert.equal(reused.mediaId, retried.id);
});

test('媒体登録後の中断から再起動して成功記録を補完し登録時刻を変えない', async t => {
  const f = await fixture(t), manager = await f.create();
  const started = await manager.start({snapshot: f.snapshot, kind: 'full'});
  assert.equal((await finished(manager)).status, 'succeeded'); await manager.close();
  const jobPath = path.join(f.directory, 'jobs', started.id, 'job.json');
  const mediaPath = path.join(f.directory, 'media', started.id + '.json');
  const mediaBytes = await readFile(mediaPath, 'utf8'), recorded = await json(jobPath);
  recorded.status = 'running';
  for (const key of ['completedAt', 'elapsedMilliseconds', 'mediaId']) delete recorded[key];
  await writeFile(jobPath, JSON.stringify(recorded));
  const restarted = await f.create(), recovered = await restarted.refresh();
  assert.equal(recovered.status, 'succeeded'); assert.equal(recovered.mediaId, started.id);
  assert.equal(await readFile(mediaPath, 'utf8'), mediaBytes);
  assert.equal((await json(jobPath)).completedAt, JSON.parse(mediaBytes).createdAt);
});

for (const mode of ['partial-fail', 'partial-cancel']) {
  test(`${mode}: 部分媒体と未完了結果を残しても失敗・取消後と再起動後に公開しない`, async t => {
    const f = await fixture(t, mode), manager = await f.create();
    const started = await manager.start({snapshot: f.snapshot, kind: 'full'});
    await until(() => exists(f.ready));
    const jobPath = path.join(f.directory, 'jobs', started.id, 'job.json');
    const job = await json(jobPath), incomplete = await json(job.resultPath);
    assert.equal(incomplete.status, 'running');
    assert.equal(await exists(incomplete.candidateVideo.path), true);
    if (mode === 'partial-cancel') await manager.close();
    const failed = await finished(manager);
    assert.equal(failed.status, 'failed');
    assert.match(failed.error, mode === 'partial-fail' ? /17/ : /SIGTERM/);
    const checkUnpublished = async current => {
      assert.equal(current.listMedia(f.snapshot.revision).some(row => row.id === started.id), false);
      await assert.rejects(current.getMedia(started.id), {code: 'EDITING_NOT_FOUND'});
      assert.equal(await exists(path.join(f.directory, 'media', started.id + '.json')), false);
      assert.equal((await current.getMedia('original')).row.fileSha256, (await bindEditingFileV001(f.original)).fileSha256);
    };
    await checkUnpublished(manager);
    await manager.close();
    // Simulate interruption before the durable failed state was saved as well.
    const interrupted = await json(jobPath);
    interrupted.status = 'running';
    await writeFile(jobPath, JSON.stringify(interrupted));
    const restarted = await f.create();
    assert.equal((await restarted.refresh()).status, 'failed');
    await checkUnpublished(restarted);
  });
}

test('実行中の保存は固定入力を変えず、同時開始と復帰後の二重完了を防ぐ', async t => {
  const f = await fixture(t, 'gate'), manager = await f.create();
  const attempts = await Promise.allSettled([manager.start({snapshot: f.snapshot, kind: 'full'}),
    manager.start({snapshot: f.snapshot, kind: 'full'})]);
  assert.equal(attempts.filter(row => row.status === 'fulfilled').length, 1);
  assert.equal(attempts.find(row => row.status === 'rejected').reason.code, 'EDITING_JOB_BUSY');
  const started = attempts.find(row => row.status === 'fulfilled').value;
  await until(() => exists(f.ready));
  const changed = await saveEditingOverrideV001({directory: f.directory, drawingRulesRef: rules,
    applicabilityOptions: {generatedRoot: f.generatedRoot, nativeAssetReuse: path.join(f.generatedRoot, 'native-assets')},
    expectedRevision: f.snapshot.revision, kind: 'connection', itemId: 'connection-01', selection: 'black-separator'});
  const restarted = await f.create();
  await writeFile(f.release, 'release'); await until(() => exists(f.resultReady));
  const observations = await Promise.all([restarted.refresh(), restarted.refresh(), restarted.refresh()]);
  assert(observations.every(job => job.status === 'succeeded' && job.id === started.id));
  const mediaBytes = await readFile(path.join(f.directory, 'media', started.id + '.json'), 'utf8');
  await writeFile(f.exit, 'exit');
  assert.equal((await finished(manager)).status, 'succeeded');
  assert.equal(await readFile(path.join(f.directory, 'media', started.id + '.json'), 'utf8'), mediaBytes);
  assert.equal(restarted.listMedia(changed.revision).find(row => row.id === started.id).isCurrent, false);
  assert.equal((await restarted.getMedia(started.id)).view.viewSha256, f.snapshot.view.viewSha256);
});

test('未変更の検証済み時計は再利用し、同一size/mtimeの改変もctimeから検出する', async t => {
  const f = await fixture(t), manager = await f.create();
  const stamp = 1700000000;
  await utimes(f.original, stamp, stamp);
  const first = await manager.getMedia('original'), second = await manager.getMedia('original');
  assert.strictEqual(second.view, first.view);
  const originalBytes = await readFile(f.original), before = await lstat(f.original, {bigint: true});
  const changed = Buffer.from(originalBytes); changed[0] ^= 1;
  await writeFile(f.original, changed); await utimes(f.original, stamp, stamp);
  const after = await lstat(f.original, {bigint: true});
  assert.equal(after.size, before.size); assert.equal(after.mtimeNs, before.mtimeNs);
  assert.notEqual(after.ctimeNs, before.ctimeNs);
  await assert.rejects(manager.getMedia('original'), {code: 'EDITING_BINDING_CHANGED'});
  await writeFile(f.original, originalBytes); await utimes(f.original, stamp, stamp);
  const restored = await manager.getMedia('original');
  assert.notStrictEqual(restored.view, first.view);
  const replacement = f.original + '.replacement'; await writeFile(replacement, originalBytes);
  await utimes(replacement, stamp, stamp); await rename(replacement, f.original);
  const replaced = await manager.getMedia('original');
  assert.notStrictEqual(replaced.view, restored.view);
  assert.notEqual((await lstat(f.original, {bigint: true})).ino, after.ino);
});

test('生成結果と描画証拠も検証cacheで改変を見逃さない', async t => {
  const f = await fixture(t), manager = await f.create();
  const started = await manager.start({snapshot: f.snapshot, kind: 'full'});
  assert.equal((await finished(manager)).status, 'succeeded');
  const record = await json(path.join(f.directory, 'media', started.id + '.json'));
  for (const ref of [record.resultRef, record.drawingEvidenceRef]) {
    const stamp = 1700000000; await utimes(ref.path, stamp, stamp);
    await manager.getMedia(started.id);
    const originalBytes = await readFile(ref.path), changed = Buffer.from(originalBytes);
    changed[0] ^= 1; await writeFile(ref.path, changed); await utimes(ref.path, stamp, stamp);
    await assert.rejects(manager.getMedia(started.id), {code: 'EDITING_BINDING_CHANGED'});
    await writeFile(ref.path, originalBytes);
  }
});

test('service終了ではworkerだけでなく同じgroupの子processにも停止を伝える', async t => {
  const f = await fixture(t, 'descendant'), manager = await f.create();
  await manager.start({snapshot: f.snapshot, kind: 'full'});
  await until(() => exists(f.ready));
  const pids = await json(f.ready);
  const alive = pid => {try {process.kill(pid, 0); return true;} catch (error) {if (error.code === 'ESRCH') return false; throw error;}};
  assert(alive(pids.workerPid)); assert(alive(pids.descendantPid));
  try {
    await manager.close();
    await until(async () => !alive(pids.workerPid) && !alive(pids.descendantPid) && await exists(f.descendantStopped));
    assert.equal(await readFile(f.descendantStopped, 'utf8'), 'SIGTERM');
    assert.equal((await manager.refresh()).status, 'failed');
  } finally {
    for (const pid of [pids.workerPid, pids.descendantPid]) {
      try {process.kill(pid, 'SIGTERM');} catch (error) {if (error.code !== 'ESRCH') throw error;}
    }
  }
});
