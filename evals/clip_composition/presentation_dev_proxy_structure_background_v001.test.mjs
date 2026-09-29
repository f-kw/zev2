import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {validatePresentationBaseMediaSegmentPlanV002} from './presentation_base_media_build_v003.mjs';
import {createOrchestrationProjectionV001} from './presentation_orchestration_projection_v001.mjs';
import {derivePresentationDevProxyStructureRecipeV001, buildPresentationDevProxySelectedPieceArgumentsV001,
  buildPresentationDevProxyStructureBaseV001, readPresentationDevProxyStructureBaseV001,
  buildPresentationDevProxyStructureBackgroundV001, readPresentationDevProxyStructureBackgroundV001} from './presentation_dev_proxy_structure_background_v001.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const profileId = 'dev-proxy-540p-v001', tools = {ffmpegPath: '/opt/homebrew/bin/ffmpeg', ffprobePath: '/opt/homebrew/bin/ffprobe'};
const hash = value => createHash('sha256').update(value).digest('hex');
const clone = structuredClone;
async function ref(file) {const bytes = await readFile(file); return {path: file, bytes: bytes.length, fileSha256: hash(bytes)};}
const plainRef = ({path, fileSha256}) => ({path, fileSha256});
async function save(file, value) {await writeFile(file, JSON.stringify(value, null, 2) + '\n'); return ref(file);}
function fixture(sourceRef = {path: path.join(root, 'runtime/artifacts/test-source.nut'), fileSha256: 'a'.repeat(64)}, timeBase = '1/15360') {
  const step = Number(timeBase.split('/')[1]) / 60, decodedFrameCount = 240;
  const inspection = {sourceVideoBinding: clone(sourceRef), media: {fps: 60, decodedFrameCount, logicalFrameCount: 120,
    source: {video: {width: 1920, height: 1080, frameRate: '60/1', timeBase, firstPts: 0, ptsStep: step,
      decodedFrameCount, containerStartTimeMs: 0, presentationOffsetMs: 0, rotation: 0},
    audio: {sampleRate: 44100, channels: 2, channelLayout: 'stereo', timeBase: '1/44100', firstDecodedPts: 0}},
    videoClock: {streamTimeBase: timeBase, firstPts: 0, ptsStep: step, presentationOffsetMs: 0},
    audioClock: {sampleRate: 44100, channels: 2, channelLayout: 'stereo', spans: [], sourceGridSampleCount: 176400,
      sourceGridMappingEndSample: 176400, decodedTailPaddingSampleCount: 0}}};
  const selection = [[100, 567], [1434, 2000], [2400, 2900], [3134, 3800]].map(([sourceStartMs, sourceEndMs]) => ({sourceStartMs, sourceEndMs}));
  const resolved = validatePresentationBaseMediaSegmentPlanV002(selection, {fps: 60, decodedFrameCount, logicalFrameCount: 120,
    presentationOffsetMs: 0}, inspection.media.audioClock);
  assert.equal(resolved.status, 'passed', JSON.stringify(resolved));
  return {sourceRef, inspection, segments: resolved.mappings, profileId};
}

test('selected intervals use source absolute PTS and samples, preserving global-even parity after bounded seeking', () => {
  const input = fixture(), recipe = derivePresentationDevProxyStructureRecipeV001(input), piece = recipe.pieces[1];
  assert.equal(piece.seekSeconds, 1); assert.equal(piece.boundedEndSeconds, 2);
  assert.deepEqual(piece.sourceFrame60Range, {startFrame: 86, endFrameExclusive: 120});
  assert.match(piece.videoFilter, /gte\(pts,22016\).*not\(mod\(pts-0,512\)\)/);
  assert.match(piece.audioFilter, /start_pts=63210:end_pts=88200/);
  // A decoder starting on odd source frame 61 must reject it, then select 62,
  // not choose ordinal zero of the local decoder stream.
  const selected = [61, 62, 63, 64].filter(i => (i * 256) % 512 === 0);
  assert.deepEqual(selected, [62, 64]);
  const args = buildPresentationDevProxySelectedPieceArgumentsV001({sourcePath: input.sourceRef.path, outputPath: '/tmp/piece.nut', piece});
  assert.equal(args[args.indexOf('-ss') + 1], '1'); assert.equal(args[args.indexOf('-t') + 1], '1');
  assert.equal(args.filter(a=>a==='-i').length, 2); assert.equal(args.filter(a=>a==='-ss').length, 1);
  assert(args.includes('1:a:0')); assert.equal(recipe.audioDecode, 'source-origin-zero-continuous-decoder-absolute-sample-trim-v001');
  assert.equal(args[args.indexOf('-bf') + 1], '0'); assert(args.includes('-copyts'));
  assert(!args.includes('-shortest')); assert(!args.includes('-frames:v'));
});

for (const [name, mutate] of [
  ['foreign source SHA', f => {f.sourceRef.fileSha256 = 'b'.repeat(64);}],
  ['foreign source path', f => {f.sourceRef.path += '.other';}],
  ['unknown profile', f => {f.profileId = 'final-1080p';}],
  ['shifted mapping', f => {f.segments[0].sourceStartFrame30++;}],
  ['shifted sample mapping', f => {f.segments[0].audioSamples.sourceStart++;}],
  ['source frame offset', f => {f.inspection.media.source.video.firstPts = 256;}],
  ['source gap', f => {f.inspection.media.audioClock.spans = [{kind: 'gap'}];}],
  ['unsupported frame rate', f => {f.inspection.media.source.video.frameRate = '60000/1001';}],
  ['source rotation', f => {f.inspection.media.source.video.rotation = 90;}],
]) test('rejects ' + name, () => {const input = clone(fixture()); mutate(input); assert.throws(() => derivePresentationDevProxyStructureRecipeV001(input));});

test('small actual selected-source manufacture, connections and independent readback preserve every clock and PCM sample', {timeout: 180000}, async t => {
  const dir = await mkdtemp(path.join(root, 'runtime/artifacts/test-dev-structure-'));
  t.after(() => rm(dir, {recursive: true, force: true}));
  const sourcePath = path.join(dir, 'source.mp4');
  execFileSync(tools.ffmpegPath, ['-hide_banner', '-nostdin', '-v', 'error', '-n', '-f', 'lavfi', '-i',
    'testsrc2=size=1920x1080:rate=60:duration=4', '-f', 'lavfi', '-i', 'anoisesrc=color=white:amplitude=0.3:seed=47:sample_rate=44100:duration=4',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '35', '-bf', '0', '-g', '60', '-c:a', 'aac', '-b:a', '64k', '-ac', '2', sourcePath]);
  const streams = JSON.parse(execFileSync(tools.ffprobePath, ['-v', 'error', '-show_streams', '-of', 'json', sourcePath])).streams;
  const input = fixture(await ref(sourcePath), streams.find(s => s.codec_type === 'video').time_base);
  const sourceInspectionRef = await save(path.join(dir, 'inspection.json'), input.inspection);
  const pieces=derivePresentationDevProxyStructureRecipeV001(input).pieces;
  const audioArgs = (piece, seek) => ['-hide_banner','-nostdin','-v','error','-copyts',
    ...(seek===null?[]:['-ss',String(seek)]),'-t',String(piece.boundedEndSeconds-(seek??0)),'-i',sourcePath,
    '-map','0:a:0','-vn','-af',piece.audioFilter,'-c:a','pcm_f32le','-f','f32le','-'];
  const originPcm=execFileSync(tools.ffmpegPath,audioArgs(pieces[1],null));
  const soughtPcm=execFileSync(tools.ffmpegPath,audioArgs(pieces[1],pieces[1].seekSeconds));
  assert.equal(originPcm.length,soughtPcm.length);
  assert.notEqual(hash(originPcm),hash(soughtPcm),'AAC seek-state difference must be exercised by the fixture');
  const legacyProcesses=[],oldPieces=[];
  for(const [pieceIndex,piece] of pieces.slice(0,2).entries()) {
    const outputPath=path.join(dir,`old-piece-${pieceIndex}.nut`),newArgs=buildPresentationDevProxySelectedPieceArgumentsV001({sourcePath,outputPath,piece});
    const firstI=newArgs.indexOf('-i'),oldArgs=[...newArgs.slice(0,firstI+2),...newArgs.slice(firstI+6)].map(a=>a==='1:a:0'?'0:a:0':a);
    execFileSync(tools.ffmpegPath,oldArgs);
    legacyProcesses.push({command:await (await import('node:fs/promises')).realpath(tools.ffmpegPath),args:oldArgs,
      argumentsSha256:hash(canonicalJson(oldArgs)),code:0,signal:null});
    oldPieces.push({pieceIndex,mediaRef:await ref(outputPath)});
  }
  const videoRecovery={schemaVersion:'presentation-dev-proxy-aac-origin-recovery-v001',
    failureRef:await save(path.join(dir,'old-failure.json'),{status:'incomplete',message:'selected source audio samples changed',processes:legacyProcesses}),
    implementationRef:await ref(fileURLToPath(import.meta.url)),pieces:oldPieces};
  const base = await buildPresentationDevProxyStructureBaseV001({...input, sourceInspectionRef, tools, outputDirectory: path.join(dir, 'base')});
  assert.equal(base.manifest.pieces.length, 4);
  assert.equal(base.manifest.videoPacketIdentity.packets, base.manifest.recipe.frameCount);
  const reloaded = await readPresentationDevProxyStructureBaseV001({manifestRef: base.manifestRef, profileId, tools});
  assert.deepEqual(reloaded.verification, {mode: 'saved-receipt', status: 'passed'});
  assert.equal(reloaded.independentVerification, undefined);
  await t.test('explicit recovery preserves previous video packets and replaces sought PCM from source origin',async()=>{
    const recovered=await buildPresentationDevProxyStructureBaseV001({...input,sourceInspectionRef,tools,videoRecovery,outputDirectory:path.join(dir,'recovered-base')});
    assert.equal(recovered.manifest.pieces.filter(p=>p.recoveredFrom).length,2);
    assert.deepEqual(recovered.manifest.media.audio.pcm,base.manifest.media.audio.pcm);
    for(const row of recovered.manifest.pieces.slice(0,2)){
      assert.equal(row.command.args[row.command.args.indexOf('-c:v')+1],'copy');
      assert(!row.command.args.includes('-vf'));assert(!row.command.args.includes('-ss'));
    }
    const checked=await readPresentationDevProxyStructureBaseV001({manifestRef:recovered.manifestRef,profileId,tools,verification:'independent-observation'});
    assert.equal(checked.independentVerification.status,'passed');
    for(const row of oldPieces)assert.deepEqual(await ref(row.mediaRef.path),row.mediaRef,'old failure media changed');
  });
  await t.test('rejects unrelated recovery input and unsuccessful original command',async()=>{
    const changed=clone(videoRecovery);changed.pieces[0].pieceIndex=1;
    await assert.rejects(buildPresentationDevProxyStructureBaseV001({...input,sourceInspectionRef,tools,videoRecovery:changed,outputDirectory:path.join(dir,'wrong-recovery')}));
    const bad=clone(legacyProcesses);bad[0].code=1;
    const failureRef=await save(path.join(dir,'unsuccessful.json'),{status:'incomplete',message:'selected source audio samples changed',processes:bad});
    await assert.rejects(buildPresentationDevProxyStructureBaseV001({...input,sourceInspectionRef,tools,videoRecovery:{...videoRecovery,failureRef},outputDirectory:path.join(dir,'unsuccessful-recovery')}));
  });
  const plan = {schemaVersion: 'presentation-output-common-core-plan-v001', format: 'normal-landscape',
    canvas: {width: 1920, height: 1080, fps: 30, safeAreaPx: {top: 40, right: 80, bottom: 40, left: 80}}, elements: []};
  const timeline = {schemaVersion: 'presentation-base-media-timeline-v003',
    baseMedia: {frameRate: '30/1', expectedFrameCount: base.manifest.recipe.frameCount, fileSha256: base.mediaRef.fileSha256},
    segments: input.segments.map(({audioSamples, ...row}) => row)};
  const planRef = plainRef(await save(path.join(dir, 'plan.json'), plan)), timelineRef = plainRef(await save(path.join(dir, 'timeline.json'), timeline));
  const projection = createOrchestrationProjectionV001({digestRef: {version: 'synthetic-v001', sha256: 'a'.repeat(64)}, planRef, timelineRef,
    mediaRef: plainRef(base.mediaRef), planBytes: await readFile(planRef.path), timelineBytes: await readFile(timelineRef.path),
    playbackSampleRate: 44100, observationSampleRate: 16000,
    connections: ['normal-cut', 'soft-separator', 'black-separator'].map((preset, i) => ({connectionId: 'connection-0' + (i + 1), preset, presetVersion: 'v001'}))});
  const background = await buildPresentationDevProxyStructureBackgroundV001({baseManifestRef: base.manifestRef, projection, profileId, tools,
    outputDirectory: path.join(dir, 'background')});
  assert.equal(background.manifest.observed.video.frameCount, base.manifest.recipe.frameCount + 24);
  assert.equal(background.manifest.finalPixelQc, 'not-run-dev-only');
  assert.equal(background.manifest.sourceClock.kind, 'projected-background');
  assert.deepEqual(background.manifest.observed.audio.pcm, background.manifest.expectedPcm);
  const moduleUrl = new URL('./presentation_dev_proxy_structure_background_v001.mjs', import.meta.url).href;
  const reread = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', `import {readPresentationDevProxyStructureBackgroundV001 as read} from ${JSON.stringify(moduleUrl)};
    const result=await read(${JSON.stringify({manifestRef: background.manifestRef, profileId, tools, expectedProjection: projection, verification: 'independent-observation'})});
    console.log(JSON.stringify({status:result.independentVerification.status,mediaRef:result.mediaRef}));`], {encoding: 'utf8'}));
  assert.equal(reread.status, 'passed'); assert.deepEqual(reread.mediaRef, background.mediaRef);
  await t.test('refuses output reuse', () => assert.rejects(buildPresentationDevProxyStructureBaseV001({...input, sourceInspectionRef, tools,
    outputDirectory: path.join(dir, 'base')}), /unused run directory/));
  await t.test('refuses changed source bytes', async () => {
    const changed = {...input.sourceRef, fileSha256: 'f'.repeat(64)};
    await assert.rejects(buildPresentationDevProxyStructureBaseV001({...input, sourceRef: changed, sourceInspectionRef, tools,
      outputDirectory: path.join(dir, 'bad-source')}), /input bytes changed/);
  });
  await t.test('failed child process leaves incomplete evidence, never a successful receipt', async () => {
    const outputDirectory = path.join(dir, 'failed-child');
    await assert.rejects(buildPresentationDevProxyStructureBaseV001({...input, sourceInspectionRef,
      tools: {...tools, ffprobePath: '/usr/bin/false'}, outputDirectory}));
    const failure = JSON.parse(await readFile(path.join(outputDirectory, 'failure.json')));
    assert.equal(failure.status, 'incomplete'); assert.equal(failure.processes[0].code, 1);
    await assert.rejects(readFile(path.join(outputDirectory, 'base-manifest.json')), {code: 'ENOENT'});
  });
  await t.test('refuses different requested structure', () => assert.rejects(readPresentationDevProxyStructureBackgroundV001({manifestRef: background.manifestRef,
    profileId, tools, expectedProjection: {...projection, displayFrameCount: 1}}), /different requested structure/));
  await t.test('rejects forged successful receipt after failed production command', async () => {
    const changed = clone(background.manifest); changed.processes[0].code = 1;
    delete changed.manifestSha256; changed.manifestSha256 = hash(canonicalJson(changed));
    const forged = await save(path.join(dir, 'forged.json'), changed);
    await assert.rejects(readPresentationDevProxyStructureBackgroundV001({manifestRef: forged, profileId, tools}));
  });
  await t.test('rejects corrupted media payload', async () => {
    await writeFile(background.mediaRef.path, Buffer.from('corrupted'));
    await assert.rejects(readPresentationDevProxyStructureBackgroundV001({manifestRef: background.manifestRef, profileId, tools}), /input bytes changed/);
  });
});
