/** Reproducible 7P representative execution; no AI, acquisition or final QC.
 * Completed 7A media/inputs stay read-only. Production APIs live in the proxy
 * modules; this file only chooses this saved Digest and its two sample ranges.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat, mkdir, readFile, realpath, statfs, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {restoreOrchestrationDrawingViewEvidenceV001} from '../../evals/clip_composition/presentation_orchestration_v001.mjs';
import {verifyEditedOrchestrationDrawingRulesRefV001} from '../../evals/clip_composition/presentation_orchestration_edited_render_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from '../../evals/clip_composition/presentation_output_directory_v001.mjs';
import {PRESENTATION_DEV_PROXY_PROFILE_V001, describePresentationDevProxyGeometryV001}
  from '../../evals/clip_composition/presentation_dev_proxy_profile_v001.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const directory = path.join(root, 'runtime/artifacts/development-proxy-20260929-v001');
const originalJobPath = path.join(root, 'runtime/artifacts/caption-readability-full-20260929-v001/job.json');
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const save = (name, value) => writeFile(path.join(directory, name), JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
async function bind(file) {
  const stat = await lstat(file); assert(stat.isFile() && !stat.isSymbolicLink());
  const sha = createHash('sha256'); for await (const part of createReadStream(file)) sha.update(part);
  const after = await lstat(file);
  for (const key of ['ino', 'mtimeMs', 'size']) assert.equal(after[key], stat[key], 'input changed while hashing');
  return {path: file, bytes: stat.size, fileSha256: sha.digest('hex')};
}
const disk = async () => {const s = await statfs(root); return {observedAt: new Date().toISOString(), freeBytes: s.bavail * s.bsize};};
const version = () => execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();

async function prepare() {
  assert.equal(execFileSync('git', ['branch', '--show-current'], {cwd: root, encoding: 'utf8'}).trim(), 'main');
  const old = await json(originalJobPath);
  await verifyEditedOrchestrationDrawingRulesRefV001(old.renderOptions.drawingRulesRef);
  assert.deepEqual(await bind(old.renderOptions.drawingEvidenceRef.path), old.renderOptions.drawingEvidenceRef);
  const view = restoreOrchestrationDrawingViewEvidenceV001(await json(old.renderOptions.drawingEvidenceRef.path));
  const backgroundProofRef = await bind(old.renderOptions.backgroundReuseProofPath), proof = await json(backgroundProofRef.path);
  assert.equal(proof.status, 'passed');
  assert.equal(proof.projectionSha256, view.projection.projectionSha256);
  assert.equal(proof.displayFrameCount, view.projection.displayFrameCount);
  const mediaInput = {
    sourceRef: proof.outputs.background, profileId: PRESENTATION_DEV_PROXY_PROFILE_V001.profileId,
    outputDirectory: path.join(directory, 'background-proxy'),
    ffmpegPath: await realpath('/opt/homebrew/bin/ffmpeg'), ffprobePath: await realpath('/opt/homebrew/bin/ffprobe'),
    sourceClock: {schemaVersion: 'presentation-dev-proxy-source-clock-v001', kind: 'projected-background',
      inputFps: 30, inputFrameCount: view.projection.displayFrameCount,
      logicalStartFrame: 0, logicalEndFrameExclusive: view.projection.displayFrameCount,
      sourceClockSha256: view.projection.sourceClockSha256, projectionSha256: view.projection.projectionSha256,
      audio: {sampleRate: proof.verification.audio.sampleRate, channels: proof.verification.audio.channels}},
  };
  for (const outputDirectory of [mediaInput.outputDirectory, ...['normal-motion', 'color-panel-connection'].map(name => path.join(directory, name))])
    assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: root, outputDirectory});
  await mkdir(directory, {recursive: true});
  const candidateVideo = path.join(old.renderOptions.outputDirectory, 'presentation-rendered-v002.mp4');
  const ranges = [{name: 'normal-motion', startFrame: 7347, endFrameExclusive: 7872},
    {name: 'color-panel-connection', startFrame: 10058, endFrameExclusive: 10552}];
  const job = {schemaVersion: 'development-proxy-representative-job-v001', head: version(),
    startedAt: new Date().toISOString(), profile: PRESENTATION_DEV_PROXY_PROFILE_V001,
    originalJobRef: await bind(originalJobPath), drawingEvidenceRef: old.renderOptions.drawingEvidenceRef,
    backgroundProofRef, mediaInput, ranges,
    preservedCandidateVideoRef: await bind(candidateVideo), preservedDrawingRules: old.renderOptions.drawingRulesRef,
    expected: {captionCount: view.resolvedPlan.elements.length, frameCount: view.projection.displayFrameCount},
    sourceGeometry: describePresentationDevProxyGeometryV001({profileId: mediaInput.profileId, plan: view.resolvedPlan}),
    disk: await disk(), scope: 'reused saved decisions; new development proxy and two representative renders; no final full render'};
  assert.equal(job.expected.captionCount, 431); assert.equal(job.expected.frameCount, 27949);
  await save('job.json', job);
  return {status: 'prepared', expected: job.expected, disk: job.disk};
}

async function stage(name, callback) {
  const job = await json(path.join(directory, 'job.json'));
  const started = performance.now(), startedAt = new Date().toISOString();
  const start = {stage: name, startedAt, head: version(), disk: await disk()};
  await save(name + '-start.json', start);
  try {
    const result = await callback(job);
    const record = {...start, status: 'passed', result, endedAt: new Date().toISOString(),
      wallSeconds: (performance.now() - started) / 1000, parentMaxRssBytes: process.resourceUsage().maxRSS * 1024,
      memoryScope: 'Node parent only; not total concurrent process memory', diskAfter: await disk()};
    await save(name + '-result.json', record);
    console.log(JSON.stringify({stage: name, status: record.status, wallSeconds: record.wallSeconds,
      output: result.mediaRef ?? result.completionRef ?? null, disk: record.diskAfter}));
    return record;
  } catch (error) {
    await save(name + '-failure.json', {...start, status: 'incomplete', endedAt: new Date().toISOString(),
      wallSeconds: (performance.now() - started) / 1000, message: error.message, stack: error.stack});
    throw error;
  }
}

const mode = process.argv[2];
if (mode === 'prepare') console.log(JSON.stringify(await prepare()));
else if (mode === 'media' || mode === 'reuse') {
  const {ensurePresentationDevProxyMediaV001} = await import('../../evals/clip_composition/presentation_dev_proxy_media_v001.mjs');
  await stage(mode, async job => {
    const result = await ensurePresentationDevProxyMediaV001(job.mediaInput);
    assert.equal(result.reused, mode === 'reuse');
    assert.equal(result.encoderInvocations, mode === 'reuse' ? 0 : 1);
    return {manifestRef: result.manifestRef, mediaRef: result.mediaRef, reused: result.reused,
      encoderInvocations: result.encoderInvocations, video: result.manifest.video, audio: result.manifest.audio,
      processes: result.manifest.processes, generationWallMilliseconds: result.manifest.wallMilliseconds};
  });
} else if (mode === 'render' || mode === 'reread') {
  const index = Number(process.argv[3]); assert([0, 1].includes(index));
  const {renderPresentationDevProxyV001, readPresentationDevProxyV001} = await import('../../evals/clip_composition/presentation_dev_proxy_render_v001.mjs');
  await stage(mode + '-' + index, async job => {
    if (mode === 'reread') {
      const prior = await json(path.join(directory, 'render-' + index + '-result.json'));
      return readPresentationDevProxyV001({completionRef: prior.result.completionRef});
    }
    const {name, ...range} = job.ranges[index], media = await json(path.join(directory, 'media-result.json'));
    return renderPresentationDevProxyV001({drawingEvidenceRef: job.drawingEvidenceRef,
      profileId: job.profile.profileId, baseProxyManifestRef: media.result.manifestRef,
      backgroundProofRef: job.backgroundProofRef, outputDirectory: path.join(directory, name), range,
      tools: {ffmpegPath: job.mediaInput.ffmpegPath, ffprobePath: job.mediaInput.ffprobePath,
        imageMagickPath: await realpath('/opt/homebrew/bin/magick'),
        remotionPath: path.join(root, 'runner/node_modules/@remotion/cli/remotion-cli.js'),
        chromiumPath: path.join(root, 'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell'),
        tsxPath: path.join(root, 'runner/node_modules/tsx/dist/cli.mjs')},
      onProgress: event => console.log(JSON.stringify(event))});
  });
} else if (mode === 'preserved') {
  await stage('preserved', async job => {
    await verifyEditedOrchestrationDrawingRulesRefV001(job.preservedDrawingRules);
    assert.deepEqual(await bind(job.originalJobRef.path), job.originalJobRef);
    assert.deepEqual(await bind(job.drawingEvidenceRef.path), job.drawingEvidenceRef);
    assert.deepEqual(await bind(job.backgroundProofRef.path), job.backgroundProofRef);
    assert.deepEqual(await bind(job.preservedCandidateVideoRef.path), job.preservedCandidateVideoRef);
    return {drawingSources: job.preservedDrawingRules.files.length, status: 'all-preserved',
      candidateVideo: job.preservedCandidateVideoRef};
  });
} else throw new Error('use prepare | media | reuse | render 0/1 | reread 0/1 | preserved');
