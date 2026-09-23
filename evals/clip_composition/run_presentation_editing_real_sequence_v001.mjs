/** Explicit development verification of the registered real Digest via HTTP.
 * This does not claim browser interaction or human assessment. */
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startPresentationEditingServiceV001} from './serve_presentation_editing_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from './presentation_output_directory_v001.mjs';

const [configPath, evidenceDirectory, resumeArgument, fullFailureEvidenceDirectory] = process.argv.slice(2);
const fullOnly = resumeArgument === '--full-from-saved';
const completedCaptionEvidenceDirectory = fullOnly ? undefined : resumeArgument;
assert(path.isAbsolute(configPath ?? '') && path.isAbsolute(evidenceDirectory ?? ''));
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const guard = assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory: evidenceDirectory});
await mkdir(evidenceDirectory);
const config = JSON.parse(await readFile(configPath, 'utf8'));
const record = async (name, value) => writeFile(path.join(evidenceDirectory, name + '.json'),
  JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
const clean = value => {
  const result = structuredClone(value); if (result && typeof result === 'object') delete result.csrfToken; return result;
};
const times = [], started = performance.now();
const service = await startPresentationEditingServiceV001(config);
const origin = new URL(service.url).origin;
let state;
async function request(name, route, content) {
  const begin = performance.now();
  const response = await fetch(origin + '/api/editing' + route, content === undefined ? {} : {
    method: 'POST', headers: {'content-type': 'application/json', origin, 'x-zev-editing-token': state.csrfToken},
    body: JSON.stringify(content),
  });
  const value = await response.json();
  times.push({operation: name, status: response.status, elapsedMilliseconds: performance.now() - begin});
  assert(response.ok, JSON.stringify(value)); return value;
}
async function saved(name, kind, itemId, selection) {
  state = await request(name, '/save', {expectedRevision: state.revision, kind, itemId, selection});
  await record(name, clean(state));
}
async function job(name, kind, target) {
  const begin = performance.now();
  const input = {expectedRevision: state.revision, kind, ...(target ? {target, contextSeconds: 2} : {})};
  const initial = await request(name + '-start', '/jobs', input);
  await record(name + '-start', initial);
  process.stdout.write(JSON.stringify({operation: name, status: initial.status, jobId: initial.id}) + '\n');
  let previous = '';
  while (true) {
    state = await request(name + '-poll', '/state');
    assert.equal(state.job.id, initial.id);
    if (state.job.phase !== previous) {
      previous = state.job.phase;
      process.stdout.write(JSON.stringify({operation: name, status: state.job.status, phase: previous}) + '\n');
    }
    if (state.job.status !== 'running') break;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  await record(name + '-finish', clean(state));
  assert.equal(state.job.status, 'succeeded', state.job.error);
  const media = state.media.find(row => row.id === state.job.mediaId);
  assert(media && media.isCurrent && media.kind === kind);
  const ready = await fetch(origin + media.url, {method: 'HEAD', headers: {range: 'bytes=0-31'}});
  assert.equal(ready.status, 206); assert.equal(ready.headers.get('content-length'), '32');
  const elapsedMilliseconds = performance.now() - begin;
  times.push({operation: name + '-ready-for-http-media', elapsedMilliseconds, reused: state.job.reused === true});
  process.stdout.write(JSON.stringify({operation: name, status: 'succeeded', elapsedMilliseconds,
    reused: state.job.reused === true, mediaId: media.id}) + '\n');
  return media;
}
try {
  await record('scope', {entry: 'registered loopback HTTP API; no browser actions', url: service.url,
    generatedAt: new Date().toISOString(), guard, purpose: '動作検証用の修正。品質・正式採用の判断ではない。'});
  state = await request('initial-read', '/state'); await record('initial', clean(state));
  if (fullOnly) {
    assert(path.isAbsolute(fullFailureEvidenceDirectory ?? ''));
    const prior = JSON.parse(await readFile(path.join(fullFailureEvidenceDirectory, 'full-output-finish.json'), 'utf8'));
    assert.equal(prior.job.status, 'failed'); assert.equal(prior.job.kind, 'full');
    // Implementation may change during a scoped repair. Saved edit choices and
    // their displayed clock must remain exactly the previously verified ones.
    assert.deepEqual(state.captions, prior.captions); assert.deepEqual(state.connections, prior.connections);
    assert.equal(state.frameCount, prior.frameCount);
    await record('resume-from-saved-edits', {fullFailureEvidenceDirectory, previousJob: prior.job,
      previousRevision: prior.revision, currentRevision: state.revision,
      meaning: '字幕と接続の保存内容を保持したまま、現在の描画規則で全編を新しく出力する。'});
    const full = await job('full-output', 'full');
    await record('completion', {status: 'passed', full, revision: state.revision,
      elapsedMilliseconds: performance.now() - started, observations: times});
  } else {
  const previousTargets = completedCaptionEvidenceDirectory
    ? JSON.parse(await readFile(path.join(completedCaptionEvidenceDirectory, 'targets.json'), 'utf8')) : null;
  const caption = previousTargets?.caption ?? state.captions.find(row => row.status === 'normal');
  const connection = previousTargets?.connection ?? state.connections.find(row => row.preset === 'normal-cut');
  assert(caption && connection);
  let preview;
  if (completedCaptionEvidenceDirectory) {
    assert(path.isAbsolute(completedCaptionEvidenceDirectory));
    const prior = JSON.parse(await readFile(path.join(completedCaptionEvidenceDirectory, 'caption-preview-reuse-finish.json'), 'utf8'));
    assert.equal(prior.revision, state.revision); assert.equal(prior.job.status, 'succeeded');
    assert.equal(prior.job.reused, true);
    assert.equal(state.captions.filter(row => row.hasOverride).length, 1);
    assert.equal(state.captions.find(row => row.id === caption.id).preset, 'panel');
    assert(state.connections.every(row => !row.hasOverride));
    preview = state.media.find(row => row.id === prior.job.mediaId); assert(preview && preview.isCurrent);
    await record('resumed-after-caption', {completedCaptionEvidenceDirectory, priorJob: prior.job,
      reason: '接続の検証要求を、既存APIで指定された文字列形式へ修正。字幕確認は完了済みのため再描画しない。'});
  } else {
  assert(state.captions.every(row => !row.hasOverride) && state.connections.every(row => !row.hasOverride));
  const detail = await request('caption-target-search', '/targets/caption/' + encodeURIComponent(caption.id));
  assert(detail.options.some(row => row.value === 'panel' && row.enabled));
  await record('targets', {caption, connection});
  await saved('caption-save', 'caption', caption.id, {preset: 'panel'});
  assert.equal(state.captions.find(row => row.id === caption.id).preset, 'panel');
  const separate = await new Promise((resolve, reject) => {
    const modulePath = path.join(repo, 'evals/clip_composition/presentation_editing_state_v001.mjs');
    const rulesPath = path.join(repo, 'evals/clip_composition/presentation_orchestration_edited_render_v001.mjs');
    const code = 'const c=JSON.parse(await (await import("node:fs/promises")).readFile(process.argv[1],"utf8"));'
      + 'const r=await (await import(process.argv[3])).buildEditedOrchestrationDrawingRulesRefV001({backgroundReuseDecoderRef:c.backgroundReuseDecoderRef});'
      + 'const s=await (await import(process.argv[2])).readEditingWorkspaceV001({directory:c.directory,drawingRulesRef:r});'
      + 'process.stdout.write(JSON.stringify({revision:s.revision,viewSha256:s.view.viewSha256,fourSavedSha256:s.view.fourSavedSha256}));';
    const child = spawn(process.execPath, ['--input-type=module', '-e', code, configPath, modulePath, rulesPath], {cwd: repo});
    let out = '', err = ''; child.stdout.on('data', chunk => {out += chunk;}); child.stderr.on('data', chunk => {err += chunk;});
    child.once('error', reject); child.once('exit', status => status === 0 ? resolve(JSON.parse(out)) : reject(new Error(err)));
  });
  assert.equal(separate.revision, state.revision); await record('separate-process-reread', separate);
  preview = await job('caption-preview', 'preview', {kind: 'caption', itemId: caption.id});
  const repeat = await job('caption-preview-reuse', 'preview', {kind: 'caption', itemId: caption.id});
  assert.equal(repeat.id, preview.id); assert.equal(state.job.reused, true);
  }
  await saved('connection-save', 'connection', connection.id, 'black-separator');
  assert(!state.media.find(row => row.id === preview.id).isCurrent);
  await job('connection-preview', 'preview', {kind: 'connection', itemId: connection.id});
  const full = await job('full-output', 'full');
  await record('completion', {status: 'passed', full, elapsedMilliseconds: performance.now() - started,
    captionId: caption.id, connectionId: connection.id, revision: state.revision, observations: times});
  }
} catch (error) {
  await record('failure', {status: 'failed', message: error.message, stack: error.stack, observations: times});
  throw error;
} finally {await service.close();}
