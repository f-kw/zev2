import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {AUTO_PRESENTATION_RULES_REF_V007, fixAutoPresentationProposalV001} from './presentation_auto_effects_v001.mjs';
import {PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001, PRESENTATION_NATIVE_FRAME_QC_BASIS_V001,
  buildPresentationNativeFrameQcRecipeV001, classifyPresentationNativeFrameRgbV001,
  PRESENTATION_NATIVE_FRAME_EXECUTION_V001, buildPresentationNativeFrameBatchPlanV001,
  buildPresentationNativeFrameBatchExtractionArgumentsV001, buildPresentationNativeLayerPlanV001,
  buildPresentationNativeLayerArgumentsV001, buildPresentationNativeReferenceExecutionV001,
  buildPresentationNativeReferenceArgumentsV001,
  validatePresentationNativeFrameQcEvidenceV001} from './presentation_native_frame_qc_v001.mjs';
import {combinePresentationIntegrityStateQcV001, PRESENTATION_INTEGRITY_STATE_QC_BASIS_V001,
  PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001}
  from './presentation_integrity_state_qc_v001.mjs';
import {PRESENTATION_ENCODED_OMISSION_QC_BASIS_V002} from './presentation_encoded_omission_qc_v002.mjs';
import {buildPresentationPulseStateElementsV001, getPresentationPulseProgramV001,
  PRESENTATION_PULSE_PRESET_V001} from './presentation_pulse_v001.mjs';
import {buildPresentationCaptionMotionStateElementsV001, getPresentationCaptionMotionProgramV001}
  from './presentation_caption_motion_v001.mjs';
import {buildPresentationCompositeArgumentsV001, buildPresentationRenderApplicationResultsV002,
  inspectPresentationCompletedFrameQcV001, executeValidatedPresentationDrawAndQcV001}
  from './render_presentation_v002.mjs';
import {evaluatePresentationRendererQcV002} from './presentation_renderer_qc_v002.mjs';
import {PRESENTATION_EXACT_REPLAY_QC_SCHEMA_V001,
  inspectPresentationExactReplayQcV001, parsePresentationExactAudioPacketsV001,
  parsePresentationExactVideoFrameHashV001,
  validatePresentationExactReplayQcEvidenceV001} from './presentation_exact_replay_qc_v001.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const hashJson = value => hash(canonicalJson(value));
const clone = value => structuredClone(value);

function fixture() {
  const element = {instructionId: 'caption-0', kind: 'speech-caption', text: '字幕',
    presetId: 'normal', requestedPresetId: 'normal', appliedPresetId: 'normal', registryVersion: 'normal-v001',
    indexedLines: [{lineIndex: 0, text: '字幕'}], startFrame: 0, endFrameExclusive: 2,
    displayFrameCount: 2, visualState: {textStyle: {fontAssetId: 'test-font', fontSizePx: 1,
      fontColor: '#FFFFFF', borderColor: '#000000', borderWidthPx: 0, glowWidthPx: 0},
      position: {preset: 'bottom-center', alignment: 'center', offsetXPercent: 0,
        offsetYPercent: 0}, background: null, layout: {maxLines: 1}}};
  const plan = {schemaVersion: 'presentation-output-common-core-plan-v001',
    canvas: {width: 2, height: 2, fps: 30}, elements: [element]};
  return {plan, records: [{element: clone(element), pngPath: '/fixture/overlay.png',
    pngSha256: hash('overlay')}], expectedFrameCount: 2};
}

function frameHashText({hashes = [hash('frame-0'), hash('frame-1')],
  pts = ['0', '1'], timeBase = '1/30'} = {}) {
  const header = ['#format: frame checksums', '#version: 2', '#hash: SHA256',
    '#software: Lavf', '#tb 0: ' + timeBase, '#media_type 0: video',
    '#codec_id 0: rawvideo', '#dimensions 0: 2x2', '#sar 0: 1/1',
    '#stream#, dts, pts, duration, size, hash'];
  return [...header, ...hashes.map((sha, index) =>
    '0, ' + pts[index] + ', ' + pts[index] + ', 1, 6, ' + sha)].join('\n') + '\n';
}

function audioProbe() {
  return {streams: [{index: 1, codec_type: 'audio', codec_name: 'aac',
    sample_rate: '48000', channels: 2, channel_layout: 'stereo', time_base: '1/48000',
    start_pts: 0, duration_ts: 2048}], packets: [0, 1].map(index => ({
      stream_index: 1, pts: index * 1024, dts: index * 1024,
      duration: 1024, size: '4', data_hash: 'SHA256:' + hash('audio-' + index),
    }))};
}

function videoProbe() {
  return {streams: [{index: 0, codec_type: 'video', codec_name: 'h264',
    width: 2, height: 2, pix_fmt: 'yuv420p', r_frame_rate: '30/1',
    avg_frame_rate: '30/1', nb_frames: '2', time_base: '1/15360',
    start_pts: 0, duration_ts: 1024, sample_aspect_ratio: '1:1', display_aspect_ratio: '1:1',
    color_range: 'tv', color_space: 'bt709', color_transfer: 'bt709', color_primaries: 'bt709',
    chroma_location: 'left', field_order: 'progressive'}]};
}

function fileRef(role, file, bytes = role, fileSha256 = hash(bytes)) {
  return {role, path: file, realPath: file, bytes: Buffer.byteLength(bytes), fileSha256};
}

// Self-consistent synthetic evidence is for validation tests only; it is never
// saved or represented as a real media inspection.
function syntheticEvidence({decoded = false} = {}) {
  const f = fixture();
  const recordBindings = [{instructionId: f.plan.elements[0].instructionId,
    elementCanonicalSha256: hashJson(f.plan.elements[0]), states: [{
      state: 'static', elementCanonicalSha256: hashJson(f.plan.elements[0]),
      pngPath: f.records[0].pngPath, pngSha256: f.records[0].pngSha256,
      inputRole: 'overlay:0:static',
    }]}];
  const refs = [
    fileRef('base-media', '/fixture/base.mp4'),
    fileRef('completed-media', '/fixture/completed.mp4', 'completed'),
    ...['ffmpeg', 'ffprobe'].map(name => fileRef('tool:' + name, '/fixture/' + name)),
    fileRef('runtime:node', '/fixture/node'),
    ...['render_presentation_v002.mjs', 'presentation_exact_replay_qc_v001.mjs']
      .map(name => fileRef('source:evals/clip_composition/' + name, '/fixture/source/' + name)),
    fileRef('overlay:0:static', f.records[0].pngPath, 'overlay'),
  ];
  const completed = clone(refs[1]);
  const replay = {path: '/fixture/qc/replay.mp4', realPath: '/fixture/qc/replay.mp4',
    bytes: decoded ? 6 : completed.bytes, fileSha256: decoded ? hash('replay') : completed.fileSha256};
  const compositorInput = {baseMediaPath: refs[0].path, planCanonicalSha256: hashJson(f.plan),
    recordBindingsCanonicalSha256: hashJson(recordBindings), expectedFrameCount: f.expectedFrameCount,
    serializePngAndFilters: true, presentationTimeline: null, timelineAudio: null};
  const compositorArguments = buildPresentationCompositeArgumentsV001({
    baseMediaPath: compositorInput.baseMediaPath, plan: f.plan, overlayRecords: f.records,
    expectedFrameCount: f.expectedFrameCount, serializePngAndFilters: true,
  });
  const encodeArguments = [...compositorArguments, '-movflags', '+faststart',
    '-progress', 'pipe:1', '-nostats', replay.path];
  const observedVideo = {codecName: 'h264', pixelFormat: 'yuv420p', width: 2, height: 2,
    fps: '30/1', averageFps: '30/1', frameCount: 2, timeBase: '1/15360',
    start: '0/1', duration: '1/15', display: {sampleAspectRatio: '1/1', displayAspectRatio: '1/1',
      colorRange: 'tv', colorSpace: 'bt709', colorTransfer: 'bt709', colorPrimaries: 'bt709',
      chromaLocation: 'left', fieldOrder: 'progressive', sideData: null}};
  const frames = parsePresentationExactVideoFrameHashV001({text: frameHashText(), width: 2, height: 2});
  const audio = parsePresentationExactAudioPacketsV001(audioProbe());
  const result = {...f, evidence: {
    schemaVersion: PRESENTATION_EXACT_REPLAY_QC_SCHEMA_V001, expectedFrameCount: f.expectedFrameCount,
    planCanonicalSha256: hashJson(f.plan), recordBindings, compositorInput, compositorArguments, encodeArguments,
    compositorArgumentsCanonicalSha256: hashJson(compositorArguments),
    encodeArgumentsCanonicalSha256: hashJson(encodeArguments),
    inputManifest: {refs, refsCanonicalSha256: hashJson(refs), before: clone(refs), after: clone(refs)},
    completed, replay, encodeProgress: {completed: true, encodedFrames: 2, observations: 1},
    video: {completed: clone(observedVideo), replay: clone(observedVideo)},
    mp4BytesIdentical: !decoded, comparisonMethod: decoded
      ? 'all-decoded-yuv420p-frames-and-audio-packets' : 'mp4-byte-identical',
    decodedVideo: decoded ? {completed: clone(frames), replay: clone(frames)} : null,
    audioPackets: decoded ? {completed: clone(audio), replay: clone(audio)} : null,
    generatedArtifacts: [clone(replay)], verifiedGeneratedArtifacts: [clone(replay)],
  }};
  attachSyntheticExecutionProofs(result);
  return result;
}

function ticks(fraction, timeBase) {
  const [n, d] = fraction.split('/').map(BigInt), [tn, td] = timeBase.split('/').map(BigInt);
  assert.equal((n * td) % (d * tn), 0n);
  return ((n * td) / (d * tn)).toString();
}

function videoProbeForObserved(video) {
  const stream = {index: 0, codec_type: 'video', codec_name: video.codecName,
    width: video.width, height: video.height, pix_fmt: video.pixelFormat,
    r_frame_rate: video.fps, avg_frame_rate: video.averageFps, nb_frames: String(video.frameCount),
    time_base: video.timeBase, start_pts: ticks(video.start, video.timeBase),
    duration_ts: ticks(video.duration, video.timeBase)};
  for (const [field, key] of [['sample_aspect_ratio', 'sampleAspectRatio'], ['display_aspect_ratio', 'displayAspectRatio'],
    ['color_range', 'colorRange'], ['color_space', 'colorSpace'], ['color_transfer', 'colorTransfer'],
    ['color_primaries', 'colorPrimaries'], ['chroma_location', 'chromaLocation'], ['field_order', 'fieldOrder'],
    ['side_data_list', 'sideData']]) {
    if (video.display[key] !== null) stream[field] = clone(video.display[key]);
  }
  return {streams: [stream]};
}

function frameHashForObserved(video) {
  return ['#format: frame checksums', '#version: 2', '#hash: SHA256',
    '#tb 0: ' + video.timeBase, '#media_type 0: video', '#codec_id 0: rawvideo',
    '#dimensions 0: ' + video.width + 'x' + video.height, '#sar 0: ' + video.sampleAspectRatio,
    ...video.frames.map(frame => ['0', ticks(frame.dts, video.timeBase), ticks(frame.pts, video.timeBase),
      ticks(frame.duration, video.timeBase), String(frame.bytes), frame.sha256].join(', ')),
  ].join('\n') + '\n';
}

function audioProbeForObserved(value) {
  return {streams: value.streams.map(stream => ({index: stream.streamIndex, codec_type: 'audio',
    codec_name: stream.codecName, sample_rate: String(stream.sampleRate), channels: stream.channels,
    ...(stream.channelLayout === null ? {} : {channel_layout: stream.channelLayout}),
    time_base: stream.timeBase, start_pts: ticks(stream.start, stream.timeBase), duration_ts: ticks(stream.duration, stream.timeBase)})),
  packets: value.packets.map(packet => {
    const stream = value.streams.find(row => row.streamIndex === packet.streamIndex);
    return {stream_index: packet.streamIndex, pts: ticks(packet.pts, stream.timeBase),
      dts: ticks(packet.dts, stream.timeBase), duration: ticks(packet.duration, stream.timeBase),
      size: String(packet.bytes), data_hash: 'SHA256:' + packet.sha256};
  })};
}

function attachSyntheticExecutionProofs(f) {
  const e = f.evidence, directory = path.dirname(e.replay.path);
  const ffmpeg = e.inputManifest.refs.find(ref => ref.role === 'tool:ffmpeg').path;
  const ffprobe = e.inputManifest.refs.find(ref => ref.role === 'tool:ffprobe').path;
  const videoFields = 'stream=index,codec_type,codec_name,width,height,pix_fmt,r_frame_rate,avg_frame_rate,nb_frames,time_base,start_pts,duration_ts,sample_aspect_ratio,display_aspect_ratio,color_range,color_space,color_transfer,color_primaries,chroma_location,field_order:stream_side_data';
  e.generatedArtifacts = [];
  const artifact = (name, text) => {
    const file = path.join(directory, name), bytes = Buffer.from(text, 'utf8');
    const ref = {path: file, realPath: file, bytes: bytes.length, fileSha256: hash(bytes)};
    e.generatedArtifacts.push(ref); return ref;
  };
  artifact('fixed-input.json', JSON.stringify({plan: f.plan, recordBindings: e.recordBindings,
    compositorInput: e.compositorInput}, null, 2) + '\n');
  artifact('encode-arguments.json', JSON.stringify({compositorArguments: e.compositorArguments,
    encodeArguments: e.encodeArguments, observationOnlyArguments: ['-progress', 'pipe:1', '-nostats'],
    unchangedProductionSuffix: ['-movflags', '+faststart']}, null, 2) + '\n');
  e.executableVersions = {ffmpeg: 'synthetic-ffmpeg-version\n', ffprobe: 'synthetic-ffprobe-version\n'};
  const commands = [
    {purpose: 'version-ffmpeg', command: ffmpeg, args: ['-version'], file: 'ffmpeg-version.txt',
      text: e.executableVersions.ffmpeg},
    {purpose: 'version-ffprobe', command: ffprobe, args: ['-version'], file: 'ffprobe-version.txt',
      text: e.executableVersions.ffprobe},
    {purpose: 'encode', command: ffmpeg, args: e.encodeArguments, file: 'encode-progress.txt',
      text: 'frame=' + e.encodeProgress.encodedFrames + '\nprogress=end\n'},
    ...['completed', 'replay'].map(side => ({purpose: 'video-probe-' + side, command: ffprobe,
      args: ['-v', 'error', '-select_streams', 'v', '-show_streams', '-show_entries', videoFields, '-of', 'json', e[side].path],
      file: side + '-video-probe.json', text: JSON.stringify(videoProbeForObserved(e.video[side]))})),
  ];
  if (!e.mp4BytesIdentical) for (const side of ['completed', 'replay']) {
    commands.push({purpose: 'framehash-' + side, command: ffmpeg,
      args: ['-hide_banner', '-loglevel', 'error', '-nostdin', '-i', e[side].path, '-map', '0:v:0', '-an', '-sn', '-dn',
        '-vf', 'format=yuv420p', '-fps_mode', 'passthrough', '-c:v', 'rawvideo', '-pix_fmt', 'yuv420p', '-f', 'framehash', '-hash', 'sha256', 'pipe:1'],
      file: side + '.framehash', text: frameHashForObserved(e.decodedVideo[side])});
    commands.push({purpose: 'audio-packets-' + side, command: ffprobe,
      args: ['-v', 'error', '-select_streams', 'a', '-show_streams', '-show_packets', '-show_data_hash', 'sha256', '-show_entries',
        'stream=index,codec_type,codec_name,sample_rate,channels,channel_layout,time_base,start_pts,duration_ts:packet=stream_index,pts,dts,duration,size,data_hash',
        '-of', 'json', e[side].path],
      file: side + '-audio-packets.json', text: JSON.stringify(audioProbeForObserved(e.audioPackets[side]))});
  }
  e.rawObservations = {};
  e.processes = commands.map(command => {
    const ref = artifact(command.file, command.text);
    e.rawObservations[command.purpose] = {artifactPath: ref.path, stdoutUtf8: command.text, stderrUtf8: ''};
    return {purpose: command.purpose, command: command.command, args: clone(command.args),
      argumentsCanonicalSha256: hashJson(command.args), code: 0, signal: null, wallClockMs: 0,
      stdoutSha256: hash(command.text), stderrSha256: hash('')};
  });
  e.generatedArtifacts.push(clone(e.replay));
  e.verifiedGeneratedArtifacts = clone(e.generatedArtifacts);
}

const validate = f => validatePresentationExactReplayQcEvidenceV001({
  plan: f.plan, evidence: f.evidence, expectedFrameCount: f.expectedFrameCount,
  currentCompletedMediaRef: {path: f.evidence.completed.path, fileSha256: f.evidence.completed.fileSha256},
});

// Pure evidence fixture: two decoded frames and one 2x2 Normal observation.
// These fixed bytes test evidence validation; they are not real media output.
function combinedEvidenceFixture(completedId = 'a') {
  const f = syntheticEvidence({decoded: true}), e = f.evidence;
  const completed = fileRef('completed-media', '/fixture/completed-' + completedId + '.mp4', 'completed-' + completedId);
  e.completed = clone(completed);
  e.inputManifest.refs = e.inputManifest.refs.map(row => row.role === 'completed-media' ? clone(completed) : row);
  e.inputManifest.refsCanonicalSha256 = hashJson(e.inputManifest.refs);
  e.inputManifest.before = clone(e.inputManifest.refs);
  e.inputManifest.after = clone(e.inputManifest.refs);
  attachSyntheticExecutionProofs(f);
  const baselinePlan = clone(f.plan);
  const jsonRef = (role, value) => ({role, path: '/fixture/' + role + '.json',
    fileSha256: hash(JSON.stringify(value)), canonicalSha256: hashJson(value)});
  const baselineRef = jsonRef('baseline-plan', baselinePlan);
  const context = {baselineRef: {path: baselineRef.path, fileSha256: baselineRef.fileSha256,
    canonicalSha256: baselineRef.canonicalSha256},
  decisionInputRef: {path: '/fixture/decision.json', fileSha256: hash('decision')},
  renderingRulesRef: AUTO_PRESENTATION_RULES_REF_V007, pulseTimingEvidence: null};
  const autoPresentation = {context, autoProposal: fixAutoPresentationProposalV001({baselinePlan, context,
    proposal: {schemaVersion: 'auto-presentation-proposal-v001', context,
      targetCaptionIds: [f.plan.elements[0].instructionId], completion: 'complete', exceptions: [], effects: []}})};
  const element = f.plan.elements[0];
  const props = {schemaVersion: 'presentation-renderer-overlay-props-v001',
    instructionId: element.instructionId, canvas: clone(f.plan.canvas), text: element.text,
    indexedLines: clone(element.indexedLines), visualState: clone(element.visualState), inspectionLineIndex: null};
  const record = {...clone(f.records[0]), props, inspection: {
    instructionId: element.instructionId, overlaySha256: f.records[0].pngSha256,
    appliedOverlayPropsCanonicalSha256: hashJson(props),
    alphaBounds: {left: 0, top: 0, right: 2, bottom: 2, width: 2, height: 2}}};
  record.alternates = [{...clone(record), kind: 'normal'}];
  const recipe = buildPresentationNativeFrameQcRecipeV001({plan: f.plan, baselinePlan, autoPresentation, records: [record]});
  assert.equal(recipe.samples.length, 1);
  const wanted = recipe.samples[0];
  assert.equal(wanted.frame, 1);
  assert.deepEqual(wanted.references.map(row => row.id), ['expected', 'omitted', 'alternate-normal']);
  const expectedRgb = Buffer.alloc(12, 10), omittedRgb = Buffer.alloc(12, 0);
  const referenceRgb = wanted.references.map(row => ({id: row.id, rgb: row.id === 'omitted' ? omittedRgb : expectedRgb}));
  const decision = classifyPresentationNativeFrameRgbV001({completedRgb: expectedRgb, references: referenceRgb});
  assert.equal(decision.visible, true);
  const directory = '/fixture/finite-' + completedId;
  const frameExtraction = buildPresentationNativeFrameBatchPlanV001({samples: recipe.samples, directory: directory + '/frames'});
  const nativeLayers = buildPresentationNativeLayerPlanV001({samples: recipe.samples, sceneBindings: recipe.sceneBindings,
    directory: directory + '/layers'});
  const referenceDirectory = directory + '/references';
  const sample = {...clone(wanted), ...decision,
    baseFrame: {path: frameExtraction.frames[0].basePath, fileSha256: hash('base-png')},
    completedFrame: {path: frameExtraction.frames[0].completedPath, fileSha256: hash('completed-png')},
    completedRgb: {path: directory + '/completed.rgb', fileSha256: hash(expectedRgb)},
    completedRgbSha256: hash(expectedRgb),
    references: wanted.references.map((row, index) => ({...clone(row), ...decision.references[index],
      rgbPath: directory + '/reference-' + index + '.rgb'}))};
  const executions = buildPresentationNativeReferenceExecutionV001({sample, sceneBindings: recipe.sceneBindings,
    nativeLayers, directory: referenceDirectory});
  sample.references.forEach((reference, index) => {reference.rgbPath = executions[index].path;});
  const uniqueExecutions = [...new Map(executions.map(row => [row.key, row])).values()];
  const layerGroups = new Map();
  for (const layer of nativeLayers.layers.filter(row => row.generated)) {
    if (!layerGroups.has(layer.sourceSha256)) layerGroups.set(layer.sourceSha256, []);
    layerGroups.get(layer.sourceSha256).push(layer);
  }
  const exactRef = (fromRole, role) => {
    const row = e.inputManifest.refs.find(ref => ref.role === fromRole);
    return {role, path: row.path, fileSha256: row.fileSha256};
  };
  const inputRefs = [jsonRef('plan', f.plan), baselineRef, jsonRef('auto-input', autoPresentation),
    exactRef('base-media', 'base-media'), exactRef('completed-media', 'completed-media'),
    exactRef('tool:ffmpeg', 'tool-ffmpeg'),
    {role: 'tool-imagemagick', path: '/fixture/magick', fileSha256: hash('magick')},
    ...recipe.sceneBindings.flatMap(group => [...group.states, ...group.alternates]).map(row => ({
      role: 'png-' + row.bindingId, path: row.pngPath, fileSha256: row.pngSha256}))];
  const verified = inputRefs.map(({role, path: file, fileSha256}) => ({role, path: file, fileSha256}));
  const inputManifest = {planCanonicalSha256: hashJson(f.plan), baselinePlanCanonicalSha256: hashJson(baselinePlan),
    autoPresentationCanonicalSha256: hashJson(autoPresentation), inputRefs,
    inputRefsCanonicalSha256: hashJson(inputRefs), before: clone(verified), after: clone(verified)};
  const local = {schemaVersion: PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001, instructionId: element.instructionId,
    baselinePlan, autoPresentation, sceneBindings: recipe.sceneBindings, inputManifest, samples: [sample]};
  const inspection = {...clone(record.inspection), visibilityComparisonBasis: PRESENTATION_NATIVE_FRAME_QC_BASIS_V001,
    representativeFrame: 1, nativeFrameQc: clone(local)};
  const ffmpeg = inputRefs.find(row => row.role === 'tool-ffmpeg').path;
  const magick = inputRefs.find(row => row.role === 'tool-imagemagick').path;
  const executableVersions = {ffmpeg: 'synthetic-ffmpeg-version\n', imageMagick: 'synthetic-magick-version\n'};
  const observedProcess = (purpose, command, args, stdout = '') => ({purpose, command, args,
    argumentsCanonicalSha256: hashJson(args), code: 0, signal: null, wallClockMs: 0,
    stdoutSha256: hash(stdout), stderrSha256: hash('')});
  const processes = [
    observedProcess('tool-version', ffmpeg, ['-version'], executableVersions.ffmpeg),
    observedProcess('tool-version', magick, ['-version'], executableVersions.imageMagick),
    observedProcess('source-frames-extract', ffmpeg, buildPresentationNativeFrameBatchExtractionArgumentsV001(
      inputRefs.find(row => row.role === 'base-media').path, [1], frameExtraction.baseOutputPattern)),
    observedProcess('completed-frames-extract', ffmpeg, buildPresentationNativeFrameBatchExtractionArgumentsV001(
      completed.path, [1], frameExtraction.completedOutputPattern)),
    ...[...layerGroups.values()].map(group => observedProcess('native-layer-prepare', ffmpeg,
      buildPresentationNativeLayerArgumentsV001(group))),
    observedProcess('completed-rgb-crop', magick, [sample.completedFrame.path, '-crop', '2x2+0+0',
      '+repage', '-alpha', 'off', '-depth', '8', 'rgb:-'], expectedRgb),
    observedProcess('native-reference-composite', ffmpeg, buildPresentationNativeReferenceArgumentsV001({
      sample: {...sample, references: uniqueExecutions.map(row => row.reference)}, nativeLayers,
      sceneBindings: recipe.sceneBindings, baseFramePath: sample.baseFrame.path,
      outputPaths: uniqueExecutions.map(row => row.path)})),
  ];
  const finiteEvidence = {...clone(local), processes, executableVersions,
    executionMethod: PRESENTATION_NATIVE_FRAME_EXECUTION_V001, frameExtraction, nativeLayers, referenceDirectory,
    outputArtifacts: [clone(sample.baseFrame), clone(sample.completedFrame),
      ...[...layerGroups.values()].flat().map(layer => ({path: layer.outputPath, fileSha256: hash('prepared-' + layer.key)})),
      clone(sample.completedRgb),
      ...uniqueExecutions.map(row => ({path: row.path, fileSha256: row.reference.rgbSha256}))]};
  delete finiteEvidence.instructionId;
  return {plan: f.plan, expectedFrameCount: f.expectedFrameCount,
    currentCompletedMediaRef: {path: completed.path, fileSha256: completed.fileSha256},
    replay: {status: 'passed', violations: [], evidence: e},
    finite: {status: 'passed', violations: [], inspections: [inspection], evidence: finiteEvidence}};
}

function assertCombinedRejection(result, code, reason) {
  assert.equal(result.status, 'failed');
  assert.ok(result.violations.some(row => row.code === code && (!reason || reason.test(row.reason))),
    JSON.stringify(result.violations));
}

function rendererQcInput(f = combinedEvidenceFixture()) {
  const combined = combinePresentationIntegrityStateQcV001(f);
  const overlayInspections = combined.inspections.map(inspection => ({...inspection,
    overlayFile: '/fixture/overlay.png', alphaMax: 1, lineCount: 1,
    lineAlphaBounds: [{lineIndex: 0, ...clone(inspection.alphaBounds)}]}));
  const applicationResults = overlayInspections.map((inspection, index) => {
    const element = f.plan.elements[index];
    return {instructionId: element.instructionId, requestedPresetId: element.presetId,
      appliedPresetId: element.presetId, appliedPresetRegistryVersion: element.registryVersion,
      overlayFile: inspection.overlayFile, overlaySha256: inspection.overlaySha256,
      appliedOverlayPropsCanonicalSha256: inspection.appliedOverlayPropsCanonicalSha256,
      finalPlanElementReference: {planFile: 'presentation-render-plan-v002.json',
        instructionId: element.instructionId,
        canonicalSha256: hashJson({...element, overlaySha256: inspection.overlaySha256})}};
  });
  const audio = {codecName: 'aac',
    packetPayloadSha256: f.replay.evidence.audioPackets.completed.packetPayloadSequenceSha256};
  return {plan: clone(f.plan), applicationResults, overlayInspections,
    canvas: {...clone(f.plan.canvas), safeAreaPx: {left: 0, top: 0, right: 0, bottom: 0}},
    mediaInspection: {durationMs: f.expectedFrameCount * 1000 / f.plan.canvas.fps,
      video: {codecName: 'h264', ...clone(f.plan.canvas), frameCount: f.expectedFrameCount}, audio},
    expectedAudio: {present: true, ...audio}, expectedFrameCount: f.expectedFrameCount,
    completedFrameQcEvidence: combined.evidence, currentCompletedMediaRef: clone(f.currentCompletedMediaRef)};
}

function assertRendererCompletedFailure(result, innerCode) {
  assert.equal(result.status, 'failed');
  assert.equal(result.checks.instructionApplication.status, 'passed');
  assert.equal(result.checks.media.status, 'passed');
  assert.equal(result.checks.layoutAndVisibility.status, 'failed');
  assert.ok(result.violations.length > 0);
  assert.ok(result.violations.every(row => row.code === 'COMPLETED_FRAME_QC_INVALID'),
    JSON.stringify(result.violations));
  if (innerCode) assert.ok(result.violations.some(row =>
    row.details?.reasons?.some(reason => reason.code === innerCode)), JSON.stringify(result.violations));
}

async function assertCombinedProfileRejectedBeforeMedia(t, {change, reason}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zev-combined-profile-unit-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const input = {...fixture(), scratchDirectory: directory,
    baseMediaPath: path.join(directory, 'base-not-opened.mp4'),
    completedMediaPath: path.join(directory, 'completed-not-opened.mp4'),
    counterfactualQcMethod: PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001,
    // Real executable paths permit resolution. No executable is ever invoked.
    toolPaths: {ffmpegPath: process.execPath, ffprobePath: process.execPath,
      imageMagickPath: process.execPath}};
  await change(input, directory);
  const before = clone({plan: input.plan, records: input.records});
  const filesBefore = await readdir(directory);
  const calls = [];
  input.processObserver = {async run(command, args) {
    calls.push({command, args}); assert.fail('profile rejection must precede every media child');
  }};
  let caught;
  await assert.rejects(inspectPresentationCompletedFrameQcV001(input), error => {
    assert.ok(error instanceof TypeError); assert.match(error.message, reason);
    caught = error; return true;
  });
  assert.deepEqual(calls, []);
  assert.deepEqual({plan: input.plan, records: input.records}, before);
  const {failureFile, ...failure} = caught.completedFrameQcFailure;
  assert.equal(failure.method, PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001);
  assert.equal(failure.phase, 'profile-validation');
  assert.equal(failure.replay, null); assert.equal(failure.preparation, null);
  assert.equal(failure.exactReplayFailure, null); assert.equal(failure.finiteStateFailure, null);
  assert.equal(Object.hasOwn(failure, 'failureRecordWriteError'), false);
  const saved = await readFile(failureFile.path);
  assert.equal(failureFile.fileSha256, hash(saved));
  assert.deepEqual(JSON.parse(saved), failure);
  assert.deepEqual((await readdir(directory)).sort(), [...filesBefore, 'completed-frame-qc-failure.json'].sort());
}

test('production drawing rejects missing and standalone diagnostic QC methods before output or child processes', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zev-final-qc-dispatch-unit-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const calls = [];
  const unexpected = operation => { calls.push(operation); assert.fail('method rejection must precede ' + operation); };
  for (const [index, method] of [undefined, 'encoded', 'native'].entries()) {
    const f = fixture(), before = clone(f);
    await assert.rejects(executeValidatedPresentationDrawAndQcV001({
      plan: f.plan, expectedFrameCount: f.expectedFrameCount,
      outputDirectory: path.join(directory, 'case-' + index),
      ...(method === undefined ? {} : {counterfactualQcMethod: method}),
      overlayAdapter: {buildProps: () => unexpected('drawing properties'),
        renderStill: async () => unexpected('native PNG'), renderLineMask: async () => unexpected('line mask')},
      processObserver: {run: async () => unexpected('child process')},
    }), error => error instanceof TypeError
      && /final completed-frame QC requires an explicit corrected-omission or combined-replay method/u.test(error.message));
    assert.deepEqual(f, before);
  }
  // Each supported method must pass dispatch and reach the existing input
  // conflict check. Stop there; this is not a synthetic completed-video PASS.
  for (const method of ['encoded-omission-v2', PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001]) {
    await assert.rejects(executeValidatedPresentationDrawAndQcV001({
      plan: fixture().plan, expectedFrameCount: 2, counterfactualQcMethod: method,
      autoPresentation: {}, effects: {}, outputDirectory: path.join(directory, method),
      processObserver: {run: async () => unexpected('child process')},
    }), /automatic presentation and trial effects cannot be combined/u);
  }
  assert.deepEqual(calls, []);
  assert.deepEqual(await readdir(directory), []);
});

test('diagnostic completed-frame QC also requires an explicitly selected method before any work', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zev-diagnostic-qc-dispatch-unit-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const f = fixture(), before = clone(f), calls = [];
  await assert.rejects(inspectPresentationCompletedFrameQcV001({...f, scratchDirectory: directory,
    baseMediaPath: path.join(directory, 'base-not-opened.mp4'),
    completedMediaPath: path.join(directory, 'completed-not-opened.mp4'),
    toolPaths: {ffmpegPath: process.execPath, ffprobePath: process.execPath, imageMagickPath: process.execPath},
    processObserver: {run: async () => { calls.push('child'); assert.fail('no implicit diagnostic method'); }},
  }), error => error instanceof TypeError && /unsupported completed frame QC method/u.test(error.message));
  assert.deepEqual(calls, []);
  assert.deepEqual(f, before);
  assert.deepEqual(await readdir(directory), []);
});

test('public combined QC entry rejects an unsupported frame rate before every media child without fallback', async t => {
  await assertCombinedProfileRejectedBeforeMedia(t, {
    change: input => {input.plan.canvas.fps = 24;},
    reason: /combined QC requires the existing 30fps native profile/u,
  });
});

test('public combined QC entry rejects absent, relative or changed normal-plan references before every media child', async t => {
  for (const kind of ['absent', 'relative', 'changed-bytes']) {
    await assertCombinedProfileRejectedBeforeMedia(t, {
      change: async (input, directory) => {
        if (kind === 'absent') return;
        const bytes = Buffer.from(JSON.stringify(input.plan));
        const file = path.join(directory, 'normal-plan.json');
        await writeFile(file, bytes, {flag: 'wx'});
        input.autoPresentation = {context: {baselineRef: {
          path: kind === 'relative' ? 'normal-plan.json' : file,
          fileSha256: kind === 'changed-bytes' ? hash('different normal-plan bytes') : hash(bytes),
          canonicalSha256: hashJson(input.plan)}}};
      },
      reason: kind === 'changed-bytes' ? /combined QC fixed normal-plan bytes changed/u
        : /combined QC requires the fixed normal-plan reference/u,
    });
  }
});

test('production evaluator accepts complete combined evidence with valid application, layout and media inputs', () => {
  const input = rendererQcInput(), before = clone(input);
  const result = evaluatePresentationRendererQcV002(input);
  assert.equal(result.status, 'passed'); assert.deepEqual(result.violations, []);
  assert.equal(result.instructionCount, 1);
  assert.deepEqual(Object.values(result.checks).map(check => check.status), ['passed', 'passed', 'passed']);
  assert.deepEqual(result.completedFrameQcEvidence, input.completedFrameQcEvidence);
  assert.deepEqual(result.currentCompletedMediaRef, input.currentCompletedMediaRef);
  assert.deepEqual(input, before);
  // The combined method supplies visibility without the former pixel-count shortcut.
  assert.equal(Object.hasOwn(input.overlayInspections[0], 'changedPixelsAgainstInstructionOmittedFrame'), false);
});

test('production final QC rejects old pixel-count and valid native-only evidence without the new global proof', () => {
  for (const basis of ['same-composite-with-instruction-omitted', PRESENTATION_NATIVE_FRAME_QC_BASIS_V001]) {
    const input = rendererQcInput();
    delete input.completedFrameQcEvidence;
    delete input.currentCompletedMediaRef;
    const inspection = input.overlayInspections[0];
    inspection.visibilityComparisonBasis = basis;
    inspection.changedPixelsAgainstInstructionOmittedFrame = 1;
    if (basis === PRESENTATION_NATIVE_FRAME_QC_BASIS_V001) {
      assert.equal(validatePresentationNativeFrameQcEvidenceV001({plan: input.plan, inspection}).status, 'passed');
    }
    const before = clone(input), result = evaluatePresentationRendererQcV002(input);
    assertRendererCompletedFailure(result);
    assert.ok(result.violations.some(row => row.details?.missingGlobalEvidence === true));
    assert.equal(result.completedFrameQcEvidence, null);
    assert.equal(result.currentCompletedMediaRef, null);
    assert.deepEqual(input, before);
  }
});

test('production evaluator rejects missing global evidence or a missing whole-video proof', () => {
  const missingGlobal = rendererQcInput(); delete missingGlobal.completedFrameQcEvidence;
  const result = evaluatePresentationRendererQcV002(missingGlobal);
  assertRendererCompletedFailure(result);
  assert.ok(result.violations.some(row => row.details?.missingGlobalEvidence === true));
  const missingReplay = rendererQcInput(); delete missingReplay.completedFrameQcEvidence.exactReplay;
  assertRendererCompletedFailure(evaluatePresentationRendererQcV002(missingReplay), 'EXACT_REPLAY_QC_INVALID');
});

test('production evaluator rejects a missing or substituted current completed-video path or hash', () => {
  for (const change of [
    input => {delete input.currentCompletedMediaRef;},
    input => {input.currentCompletedMediaRef.path = '/fixture/current-other.mp4';},
    input => {input.currentCompletedMediaRef.fileSha256 = hash('current-other');},
  ]) {
    const input = rendererQcInput(); change(input);
    assertRendererCompletedFailure(evaluatePresentationRendererQcV002(input), 'EXACT_REPLAY_QC_INVALID');
  }
});

test('production evaluator rejects whole-video corruption even when native state observations pass', () => {
  const f = combinedEvidenceFixture();
  f.replay.evidence.decodedVideo.completed = parsePresentationExactVideoFrameHashV001({
    text: frameHashText({hashes: [hash('changed non-representative frame'), hash('frame-1')]}),
    width: 2, height: 2});
  attachSyntheticExecutionProofs({plan: f.plan, evidence: f.replay.evidence});
  const replay = validatePresentationExactReplayQcEvidenceV001({...f, evidence: f.replay.evidence});
  assert.equal(replay.status, 'failed');
  assert.match(replay.violations[0].reason, /complete decoded video frame sequence/u);
  assert.equal(validatePresentationNativeFrameQcEvidenceV001({plan: f.plan,
    inspection: f.finite.inspections[0]}).status, 'passed');
  assert.equal(f.replay.status, 'passed'); // Deliberately stale; production must re-evaluate the proof.
  assertRendererCompletedFailure(evaluatePresentationRendererQcV002(rendererQcInput(f)), 'EXACT_REPLAY_QC_INVALID');
});

test('production evaluator rejects an omitted native caption even when whole-video equality passes', () => {
  const f = combinedEvidenceFixture(), sample = f.finite.evidence.samples[0];
  const expected = Buffer.alloc(12, 10), omitted = Buffer.alloc(12, 0);
  const decision = classifyPresentationNativeFrameRgbV001({completedRgb: omitted,
    references: sample.references.map(row => ({id: row.id, rgb: row.id === 'omitted' ? omitted : expected}))});
  const references = sample.references.map((row, index) => ({...row, ...decision.references[index]}));
  Object.assign(sample, decision, {references, completedRgbSha256: hash(omitted),
    completedRgb: {...sample.completedRgb, fileSha256: hash(omitted)}});
  f.finite.inspections[0].nativeFrameQc.samples[0] = clone(sample);
  f.finite.evidence.processes.find(row => row.purpose === 'completed-rgb-crop').stdoutSha256 = hash(omitted);
  f.finite.evidence.outputArtifacts.find(row => row.path === sample.completedRgb.path).fileSha256 = hash(omitted);
  assert.equal(validatePresentationExactReplayQcEvidenceV001({...f, evidence: f.replay.evidence}).status, 'passed');
  assert.equal(validatePresentationNativeFrameQcEvidenceV001({plan: f.plan,
    inspection: f.finite.inspections[0]}).status, 'failed');
  assert.equal(f.finite.status, 'passed');
  const combined = combinePresentationIntegrityStateQcV001(f);
  assert.ok(combined.violations.length > 0);
  assert.ok(combined.violations.every(row => row.code === 'NATIVE_FRAME_QC_INVALID'), JSON.stringify(combined.violations));
  assertRendererCompletedFailure(evaluatePresentationRendererQcV002(rendererQcInput(f)), 'NATIVE_FRAME_QC_INVALID');
});

test('production evaluator rejects detached finite-state evidence and a mixed comparison basis', () => {
  const detached = rendererQcInput();
  detached.overlayInspections[0].nativeFrameQc.samples[0].completedRgb.path += '.other';
  assertRendererCompletedFailure(evaluatePresentationRendererQcV002(detached), 'INTEGRITY_STATE_QC_INVALID');
  const mixed = rendererQcInput();
  mixed.overlayInspections[0].visibilityComparisonBasis = PRESENTATION_NATIVE_FRAME_QC_BASIS_V001;
  const result = evaluatePresentationRendererQcV002(mixed);
  assertRendererCompletedFailure(result, 'INTEGRITY_STATE_QC_INVALID');
  assert.ok(result.violations.some(row => row.details?.mixedComparisonMethods === true));
});

test('production Pulse rejects legacy final proof and retains native state checks without duplicate new-method requirements', () => {
  // Reuse the production state/application builders; this small synthetic layout
  // isolates method dispatch, not the real Pulse image-discrimination result.
  const canvas = {width: 1920, height: 1080, fps: 30,
    safeAreaPx: {left: 80, right: 80, top: 40, bottom: 40}};
  const element = fixture().plan.elements[0];
  element.endFrameExclusive = 30; element.displayFrameCount = 30;
  element.visualState.textStyle.fontSizePx = 96;
  element.presentationPulse = {presentation: 'provisional-pulse', anchorPeakId: 'measured', anchorFrame: 14};
  const states = buildPresentationPulseStateElementsV001({element, canvas}).map(row => {
    const width = row.element.visualState.textStyle.fontSizePx;
    const bounds = {left: 960 - width / 2, top: 980 - width, right: 960 + width / 2,
      bottom: 980, width, height: width};
    const props = {text: row.element.text, visualState: row.element.visualState}, pngSha256 = hashJson(row);
    return {...row, props, pngPath: '/fixture/' + row.state + '.png', pngSha256,
      inspection: {instructionId: element.instructionId, overlayFile: 'overlays/' + row.state + '.png',
        overlaySha256: pngSha256, appliedOverlayPropsCanonicalSha256: hashJson(props),
        pixelWidth: canvas.width, pixelHeight: canvas.height, alphaMax: 1, alphaBounds: bounds,
        lineCount: 1, lineAlphaBounds: [{lineIndex: 0, ...bounds}],
        layoutWrapper: {left: bounds.left, top: bounds.top, width, height: width}}};
  });
  const program = getPresentationPulseProgramV001({element, canvas});
  const record = {...states[0], element, pulseStates: states, inspection: {...states[0].inspection,
    visibilityComparisonBasis: 'same-composite-with-instruction-omitted', changedPixelsAgainstInstructionOmittedFrame: 1,
    pulse: {presetVersion: PRESENTATION_PULSE_PRESET_V001.version, metadata: element.presentationPulse, program,
      states: states.map(row => ({state: row.state, ...row.inspection})),
      completedFrames: [[program.normalBeforeFrame, 'normal'], [program.maximumFrame, 'maximum'],
        [program.normalAfterFrame, 'normal']].map(([frame, state]) => ({frame, expectedState: state,
        comparisonBasis: 'same-source-frame-three-native-pulse-states',
        expectedOverlaySha256: states.find(row => row.state === state).pngSha256,
        outputFrameSha256: hash('completed-frame'), baseFrameSha256: hash('base-frame'),
        stateDistances: states.map(row => ({state: row.state, overlaySha256: row.pngSha256,
          absoluteRgbDifference: row.state === state ? 0 : 1, referenceFrameSha256: hash('reference-frame')}))}))}}};
  const input = {plan: {canvas, elements: [element]}, canvas,
    applicationResults: buildPresentationRenderApplicationResultsV002([record]), overlayInspections: [record.inspection],
    mediaInspection: {video: {...canvas, frameCount: 30}, durationMs: 1000},
    expectedAudio: {present: false}, expectedFrameCount: 30};
  // This positive control checks the three physical layouts only. It does not
  // certify completed-video visibility or substitute for the combined PASS test.
  assert.equal(evaluatePresentationRendererQcV002({...input, requireFinalVisibility: false}).status, 'passed');
  // Even complete legacy three-point observations cannot certify the final video.
  assertRendererCompletedFailure(evaluatePresentationRendererQcV002(input));
  delete input.overlayInspections[0].pulse.completedFrames;
  for (const basis of [PRESENTATION_INTEGRITY_STATE_QC_BASIS_V001, PRESENTATION_ENCODED_OMISSION_QC_BASIS_V002]) {
    const changed = clone(input); changed.overlayInspections[0].visibilityComparisonBasis = basis;
    assertRendererCompletedFailure(evaluatePresentationRendererQcV002(changed));
    changed.overlayInspections[0].pulse.states[1].overlaySha256 = hash('substituted-pulse-state');
    const invalidNative = evaluatePresentationRendererQcV002(changed);
    assert.ok(invalidNative.violations.some(row => row.code === 'PULSE_NATIVE_STATE_MISMATCH'));
    assert.ok(!invalidNative.violations.some(row => row.code === 'PULSE_FRAME_STATE_MISMATCH'));
  }
});

test('combined proof accepts matching complete evidence and ignores cached decisions without mutating inputs', () => {
  const f = combinedEvidenceFixture(), before = clone(f);
  const result = combinePresentationIntegrityStateQcV001(f);
  assert.equal(result.status, 'passed'); assert.deepEqual(result.violations, []);
  assert.deepEqual(f, before);
  f.replay.status = 'failed'; f.replay.violations = [{code: 'cached-replay-failure'}];
  f.finite.status = 'failed'; f.finite.violations = [{code: 'cached-finite-failure'}];
  assert.equal(combinePresentationIntegrityStateQcV001(f).status, 'passed');
});

test('combined proof rejects missing whole-video evidence despite cached pass flags', () => {
  const f = combinedEvidenceFixture();
  delete f.replay.evidence;
  assertCombinedRejection(combinePresentationIntegrityStateQcV001(f), 'EXACT_REPLAY_QC_INVALID');
});

test('combined proof rejects mixing individually valid observations from different completed videos', () => {
  const a = combinedEvidenceFixture('a'), b = combinedEvidenceFixture('b');
  assert.equal(combinePresentationIntegrityStateQcV001(a).status, 'passed');
  assert.equal(combinePresentationIntegrityStateQcV001(b).status, 'passed');
  assertCombinedRejection(combinePresentationIntegrityStateQcV001({...a, finite: b.finite}),
    'INTEGRITY_STATE_QC_INVALID', /different inputs: completed-media/u);
});

test('combined proof requires the current completed-video path and hash supplied by its caller', () => {
  const f = combinedEvidenceFixture();
  for (const currentCompletedMediaRef of [undefined,
    {...f.currentCompletedMediaRef, path: '/fixture/another-current.mp4'},
    {...f.currentCompletedMediaRef, fileSha256: hash('another-current-file')},
  ]) assertCombinedRejection(combinePresentationIntegrityStateQcV001({...f, currentCompletedMediaRef}),
    'EXACT_REPLAY_QC_INVALID');
});

test('combined proof rejects local/global disagreement and a severed RGB stdout or artifact chain', () => {
  const changes = [
    {mutate: f => {f.finite.inspections[0].nativeFrameQc.samples[0].completedRgb.path += '.other';},
      reason: /global finite-state observations differ/u},
    {mutate: f => {f.finite.evidence.samples[0].completedRgb.path += '.other';},
      reason: /global finite-state observations differ/u},
    {mutate: f => {
      const changed = hash('another-rgb-observation');
      for (const sample of [f.finite.inspections[0].nativeFrameQc.samples[0], f.finite.evidence.samples[0]]) {
        sample.completedRgb.fileSha256 = changed; sample.completedRgbSha256 = changed;
      }
      f.finite.evidence.outputArtifacts.find(row => row.path === f.finite.evidence.samples[0].completedRgb.path).fileSha256 = changed;
    }, reason: /process does not bind its input and output: completed-rgb-crop/u},
    {mutate: f => {f.finite.evidence.outputArtifacts.find(row => row.path === f.finite.evidence.samples[0].completedRgb.path).fileSha256 = hash('another-output');},
      reason: /output artifacts differ/u},
  ];
  for (const {mutate, reason} of changes) {
    const f = combinedEvidenceFixture(); mutate(f);
    // Each local finite-state record still passes: the combined chain owns these rejections.
    assert.equal(validatePresentationNativeFrameQcEvidenceV001({
      plan: f.plan, inspection: f.finite.inspections[0]}).status, 'passed');
    assertCombinedRejection(combinePresentationIntegrityStateQcV001(f), 'INTEGRITY_STATE_QC_INVALID', reason);
  }
});

test('combined proof rejects altered batch clocks, prepared alpha, missing processes and false reference sharing', () => {
  const changes = [
    f => {delete f.finite.evidence.executionMethod;},
    f => {f.finite.evidence.frameExtraction.frames[0].mediaFrame++;},
    f => {f.finite.evidence.frameExtraction.frames = [];},
    f => {f.finite.evidence.nativeLayers.layers[0].numerator = 4;},
    f => {f.finite.evidence.nativeLayers.layers[0].sourceSha256 = hash('other-native');},
    f => {f.finite.evidence.processes = f.finite.evidence.processes.filter(row => row.purpose !== 'native-layer-prepare');},
    f => {f.finite.evidence.processes.find(row => row.purpose === 'source-frames-extract').args.push('-other');},
    f => {
      const process = f.finite.evidence.processes.find(row => row.purpose === 'source-frames-extract');
      process.args[process.args.indexOf('-vf') + 1] = 'select=eq(n\\,2)';
      process.argumentsCanonicalSha256 = hashJson(process.args);
    },
    f => {f.finite.evidence.outputArtifacts.push(clone(f.finite.evidence.outputArtifacts[0]));},
    f => {
      for (const sample of [f.finite.inspections[0].nativeFrameQc.samples[0], f.finite.evidence.samples[0]])
        sample.references.find(row => row.id === 'omitted').rgbPath = sample.references.find(row => row.id === 'expected').rgbPath;
    },
  ];
  for (const change of changes) {
    const f = combinedEvidenceFixture(); change(f);
    assertCombinedRejection(combinePresentationIntegrityStateQcV001(f), 'INTEGRITY_STATE_QC_INVALID');
  }
});

test('all decoded frame hashes retain order and exact rational timestamps', () => {
  const rows = parsePresentationExactVideoFrameHashV001({
    text: frameHashText({timeBase: '2/60'}), width: 2, height: 2,
  });
  assert.equal(rows.frameCount, 2);
  assert.equal(rows.frames[1].pts, '1/30');
  assert.equal(rows.frames[1].bytes, 6);
  assert.equal(rows.timeBase, '1/30');
  assert.notEqual(rows.frameSequenceSha256, parsePresentationExactVideoFrameHashV001({
    text: frameHashText({hashes: [hash('frame-1'), hash('frame-0')]}), width: 2, height: 2,
  }).frameSequenceSha256);
  const exact = parsePresentationExactVideoFrameHashV001({
    text: frameHashText({pts: ['9007199254740993', '9007199254740994']}), width: 2, height: 2,
  });
  assert.equal(exact.frames[0].pts, '3002399751580331/10');
});

test('frame parser rejects malformed hash, incomplete pixel data, wrong canvas and decimal timestamps', () => {
  const valid = frameHashText();
  for (const text of [
    valid.replace('#hash: SHA256', '#hash: MD5'), valid.replace(', 6,', ', 5,'),
    valid.replace('2x2', '4x2'), valid.replace('0, 0, 0, 1,', '0, 0.0, 0, 1,'),
    valid.replace('#tb 0: 1/30', '#tb 0: 0/30'),
    valid.replace(/0, 0, 0, 1, 6, [a-f0-9]+/u, '0, 0, 0, 1, 6, bad'),
  ]) assert.throws(() => parsePresentationExactVideoFrameHashV001({text, width: 2, height: 2}));
  assert.throws(() => parsePresentationExactVideoFrameHashV001({
    text: valid.split('\n').filter(line => line.startsWith('#')).join('\n'), width: 2, height: 2,
  }), /no frames/u);
});

test('audio parser retains payload order and integer-clock metadata, including negative initial AAC PTS', () => {
  const probe = audioProbe(); probe.packets[0].pts = -1024; probe.packets[0].dts = -1024;
  const parsed = parsePresentationExactAudioPacketsV001(probe);
  assert.equal(parsed.packets[0].pts, '-8/375'); assert.equal(parsed.packetCount, 2);
  const reversed = audioProbe(); reversed.packets.reverse();
  assert.notEqual(parsePresentationExactAudioPacketsV001(audioProbe()).packetPayloadSequenceSha256,
    parsePresentationExactAudioPacketsV001(reversed).packetPayloadSequenceSha256);
  assert.deepEqual(parsePresentationExactAudioPacketsV001({streams: [], packets: []}).packets, []);
});

test('audio parser rejects missing packet hashes, uncovered streams and inexact numeric clocks', () => {
  for (const modify of [
    probe => {delete probe.packets[0].data_hash;}, probe => {probe.packets = [];},
    probe => {probe.packets[0].pts = 0.5;}, probe => {probe.packets[0].stream_index = 7;},
    probe => {probe.streams.push(clone(probe.streams[0]));},
  ]) {const probe = audioProbe(); modify(probe); assert.throws(() => parsePresentationExactAudioPacketsV001(probe));}
});

test('byte equality and full decoded equality are independently valid exact gates', () => {
  for (const decoded of [false, true]) {
    const f = syntheticEvidence({decoded}), before = JSON.stringify(f);
    assert.equal(validate(f).status, 'passed'); assert.equal(JSON.stringify(f), before);
  }
});

test('one changed frame, all-black corruption, changed audio, order and timing are rejected with recomputed digests', () => {
  const changes = [
    f => {f.evidence.decodedVideo.completed = parsePresentationExactVideoFrameHashV001({
      text: frameHashText({hashes: [hash('frame-0'), hash('single changed pixel')]}), width: 2, height: 2,
    });},
    f => {f.evidence.decodedVideo.completed = parsePresentationExactVideoFrameHashV001({
      text: frameHashText({hashes: [hash(Buffer.alloc(6)), hash(Buffer.alloc(6))]}), width: 2, height: 2,
    });},
    f => {f.evidence.decodedVideo.completed = parsePresentationExactVideoFrameHashV001({
      text: frameHashText({hashes: [hash('frame-1'), hash('frame-0')]}), width: 2, height: 2,
    });},
    f => {f.evidence.decodedVideo.completed = parsePresentationExactVideoFrameHashV001({
      text: frameHashText({pts: ['1', '2']}), width: 2, height: 2,
    });},
    f => {const probe = audioProbe(); probe.packets[1].data_hash = 'SHA256:' + hash('changed audio');
      f.evidence.audioPackets.completed = parsePresentationExactAudioPacketsV001(probe);},
    f => {const probe = audioProbe(); probe.packets.reverse();
      f.evidence.audioPackets.completed = parsePresentationExactAudioPacketsV001(probe);},
    f => {const probe = audioProbe(); probe.packets[1].pts += 1;
      f.evidence.audioPackets.completed = parsePresentationExactAudioPacketsV001(probe);},
  ];
  for (const change of changes) {const f = syntheticEvidence({decoded: true}); change(f); attachSyntheticExecutionProofs(f); assert.equal(validate(f).status, 'failed');}
});

test('a cached pass cannot replace complete observations, stable input bindings or original encoder arguments', () => {
  const changes = [
    f => {f.evidence.status = 'passed'; f.evidence.decodedVideo.completed.frames.pop();},
    f => {f.evidence.decodedVideo.completed.frames[0].sha256 = hash('changed without digest');},
    f => {f.evidence.audioPackets.completed.packets.pop();},
    f => {f.evidence.inputManifest.after[0].fileSha256 = hash('changed base');},
    f => {f.evidence.verifiedGeneratedArtifacts = [];}, f => {f.evidence.recordBindings = [];},
    f => {f.evidence.encodeProgress.encodedFrames = 1;}, f => {f.evidence.video.completed.frameCount = 1;},
    f => {f.evidence.video.completed.width = 4;},
    f => {f.evidence.compositorArguments[f.evidence.compositorArguments.indexOf('-crf') + 1] = '21';
      f.evidence.compositorArgumentsCanonicalSha256 = hashJson(f.evidence.compositorArguments);
      f.evidence.encodeArguments = [...f.evidence.compositorArguments, '-movflags', '+faststart',
        '-progress', 'pipe:1', '-nostats', f.evidence.replay.path];
      f.evidence.encodeArgumentsCanonicalSha256 = hashJson(f.evidence.encodeArguments);},
    f => {f.evidence.replay.path = f.evidence.completed.path;},
  ];
  for (const change of changes) {const f = syntheticEvidence({decoded: true}); change(f); assert.equal(validate(f).status, 'failed');}
});

test('byte equality does not invent decoded-frame counts, and an MP4 hash mismatch cannot skip full comparison', () => {
  const f = syntheticEvidence(); f.evidence.decodedVideo = {completed: {}, replay: {}};
  assert.equal(validate(f).status, 'failed');
  const g = syntheticEvidence(); g.evidence.replay.fileSha256 = hash('changed');
  g.evidence.generatedArtifacts = [clone(g.evidence.replay)];
  g.evidence.verifiedGeneratedArtifacts = clone(g.evidence.generatedArtifacts);
  assert.equal(validate(g).status, 'failed');
  const missing = syntheticEvidence({decoded: true}); missing.evidence.audioPackets = null;
  assert.equal(validate(missing).status, 'failed');
});

async function mockInspection(t, {identical = true, corrupt = false, modifyInput = false,
  afterEncode = null, alterRecords = null} = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zev-exact-replay-unit-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const files = Object.fromEntries(['base.mp4', 'completed.mp4', 'overlay.png', 'ffmpeg', 'ffprobe']
    .map(name => [name, path.join(directory, name)]));
  await Promise.all(Object.entries(files).map(([name, file]) => writeFile(file,
    name === 'completed.mp4' ? 'completed' : name === 'overlay.png' ? 'overlay' : name)));
  const f = fixture(); f.records[0].pngPath = files['overlay.png'];
  if (alterRecords) alterRecords(f.records);
  const calls = [];
  const processObserver = {async run(command, args, options) {
    calls.push({command, args: clone(args), options: clone(options)});
    let output;
    if (args.length === 1 && args[0] === '-version') output = 'mock-version\n';
    else if (args.includes('-progress')) {
      await writeFile(args.at(-1), identical ? 'completed' : 'replay', {flag: 'wx'});
      if (modifyInput) await writeFile(files['base.mp4'], 'changed base during encode');
      if (afterEncode) await afterEncode({files, f});
      output = 'frame=1\nprogress=continue\nframe=2\nprogress=end\n';
    } else if (args.includes('framehash')) {
      const isCompleted = args[args.indexOf('-i') + 1] === files['completed.mp4'];
      output = frameHashText(corrupt && isCompleted ? {hashes: [hash('frame-0'), hash('single changed pixel')]} : {});
    } else if (args[args.indexOf('-select_streams') + 1] === 'v') output = JSON.stringify(videoProbe());
    else if (args[args.indexOf('-select_streams') + 1] === 'a') output = JSON.stringify(audioProbe());
    else throw new Error('unexpected mocked child command');
    return {code: 0, signal: null, stdout: Buffer.from(output), stderr: Buffer.alloc(0)};
  }};
  const originalCompleted = await readFile(files['completed.mp4']);
  let result;
  try {
    result = await inspectPresentationExactReplayQcV001({...f, baseMediaPath: files['base.mp4'],
      completedMediaPath: files['completed.mp4'], scratchDirectory: path.join(directory, 'qc'),
      ffmpegPath: files.ffmpeg, ffprobePath: files.ffprobe, serializePngAndFilters: true, processObserver});
  } catch (error) {error.mockCalls = calls; throw error;}
  assert.deepEqual(await readFile(files['completed.mp4']), originalCompleted);
  return {result, calls, files, f};
}

test('mock I/O runs one replay from the real compositor arguments and reports no unobserved decoded frames', async t => {
  const {result, calls, f, files} = await mockInspection(t);
  assert.equal(result.status, 'passed'); assert.equal(result.performance.encodedFrames, 2);
  assert.equal(result.performance.decodedFrames, null); assert.equal(result.performance.comparedFrames, null);
  assert.equal(result.performance.comparedAudioPackets, null);
  assert.equal(calls.filter(call => call.args.includes('-progress')).length, 1);
  assert.equal(calls.length, 5); assert.ok(!calls.some(call => call.args.includes('framehash')));
  const expected = buildPresentationCompositeArgumentsV001({
    baseMediaPath: files['base.mp4'], plan: f.plan, overlayRecords: f.records,
    expectedFrameCount: 2, serializePngAndFilters: true,
  });
  assert.deepEqual(result.evidence.compositorArguments, expected);
});

test('mock I/O compares every decoded frame and audio packet when container bytes differ', async t => {
  const {result, calls} = await mockInspection(t, {identical: false});
  assert.equal(result.status, 'passed'); assert.equal(result.performance.encodedFrames, 2);
  assert.deepEqual(result.performance.decodedFrames, {completed: 2, replay: 2});
  assert.equal(result.performance.comparedFrames, 2); assert.equal(result.performance.comparedAudioPackets, 2);
  assert.equal(calls.filter(call => call.args.includes('-progress')).length, 1);
  assert.equal(calls.filter(call => call.args.includes('framehash')).length, 2); assert.equal(calls.length, 9);
});

test('mock I/O preserves exact failure for an unknown one-pixel change', async t => {
  const {result} = await mockInspection(t, {identical: false, corrupt: true});
  assert.equal(result.status, 'failed'); assert.match(result.violations[0].reason, /complete decoded video frame sequence/u);
});

test('mock I/O detects inputs changing during encode and rejects a missing production PNG before any child', async t => {
  await assert.rejects(mockInspection(t, {modifyInput: true}), error =>
    /fixed input changed/u.test(error.message) && error.mockCalls.length === 5 && error.exactReplayQcFailure.processes.length === 5);
  await assert.rejects(mockInspection(t, {alterRecords: records => {records[0].pngSha256 = hash('foreign');}}),
    error => /production PNG differs/u.test(error.message) && error.mockCalls.length === 0);
});

for (const expression of ['pulse', 'bounce', 'shake']) test(expression + ' replay binds every production PNG to its exact native state and order', () => {
  const f = syntheticEvidence(), element = f.plan.elements[0];
  element.endFrameExclusive = 90; element.displayFrameCount = 90; element.visualState.textStyle.fontSizePx = 96;
  if (expression === 'pulse') element.presentationPulse = {presentation: 'provisional-pulse', anchorPeakId: 'measured', anchorFrame: 45};
  else element.presentationMotion = {presentation: 'provisional-' + expression, presetVersion: 'presentation-caption-motion-v001'};
  f.expectedFrameCount = 90;
  const states = (expression === 'pulse' ? buildPresentationPulseStateElementsV001
    : buildPresentationCaptionMotionStateElementsV001)({element, canvas: f.plan.canvas})
    .map(row => ({...row, pngPath: '/fixture/' + expression + '-' + row.state + '.png',
      pngSha256: hash(expression + '-' + row.state)}));
  f.records = [{...states[0], element: clone(element),
    ...(expression === 'pulse' ? {pulseStates: states} : {motionStates: states})}];
  const e = f.evidence; e.expectedFrameCount = 90; e.planCanonicalSha256 = hashJson(f.plan);
  e.recordBindings = [{instructionId: element.instructionId, elementCanonicalSha256: hashJson(element),
    states: states.map(row => ({state: row.state, elementCanonicalSha256: hashJson(row.element),
      pngPath: row.pngPath, pngSha256: row.pngSha256, inputRole: 'overlay:0:' + row.state}))}];
  e.compositorInput.planCanonicalSha256 = hashJson(f.plan);
  e.compositorInput.recordBindingsCanonicalSha256 = hashJson(e.recordBindings);
  e.compositorInput.expectedFrameCount = 90;
  e.compositorArguments = buildPresentationCompositeArgumentsV001({
    baseMediaPath: e.compositorInput.baseMediaPath, plan: f.plan, overlayRecords: f.records,
    expectedFrameCount: 90, serializePngAndFilters: true,
  });
  e.compositorArgumentsCanonicalSha256 = hashJson(e.compositorArguments);
  e.encodeArguments = [...e.compositorArguments, '-movflags', '+faststart', '-progress', 'pipe:1', '-nostats', e.replay.path];
  e.encodeArgumentsCanonicalSha256 = hashJson(e.encodeArguments);
  e.inputManifest.refs = [...e.inputManifest.refs.filter(ref => !ref.role.startsWith('overlay:')),
    ...states.map(row => fileRef('overlay:0:' + row.state, row.pngPath, expression + '-' + row.state))];
  e.inputManifest.refsCanonicalSha256 = hashJson(e.inputManifest.refs);
  e.inputManifest.before = clone(e.inputManifest.refs); e.inputManifest.after = clone(e.inputManifest.refs);
  e.encodeProgress.encodedFrames = 90;
  for (const row of Object.values(e.video)) {row.frameCount = 90; row.duration = '3/1';}
  attachSyntheticExecutionProofs(f);
  assert.equal(validate(f).status, 'passed');
  for (const change of [
    value => {value.evidence.recordBindings[0].states.pop();},
    value => {value.evidence.recordBindings[0].states.reverse();},
    value => {value.evidence.recordBindings[0].states[1].pngSha256 = hash('foreign-state');},
  ]) {const changed = clone(f); change(changed); assert.equal(validate(changed).status, 'failed');}
});

test('current completed-file identity is mandatory and rejects a stale pass for another same-format video', () => {
  const f = syntheticEvidence({decoded: true});
  const args = {plan: f.plan, evidence: f.evidence, expectedFrameCount: 2,
    mediaInspection: {video: {codecName: 'h264', width: 2, height: 2, fps: 30, frameCount: 2}}};
  assert.equal(validatePresentationExactReplayQcEvidenceV001(args).status, 'failed');
  for (const currentCompletedMediaRef of [
    {path: f.evidence.completed.path, fileSha256: hash('changed current file')},
    {path: '/different/current.mp4', fileSha256: f.evidence.completed.fileSha256},
  ]) assert.equal(validatePresentationExactReplayQcEvidenceV001({...args, currentCompletedMediaRef}).status, 'failed');
});

test('raw evidence, all observed commands, original stdout and artifact correspondence are mandatory', () => {
  for (const decoded of [false, true]) for (const change of [
    f => {delete f.evidence.processes;},
    f => {f.evidence.processes.pop();},
    f => {f.evidence.processes[2].command = '/foreign/ffmpeg';},
    f => {f.evidence.processes[2].args = ['-version']; f.evidence.processes[2].argumentsCanonicalSha256 = hashJson(['-version']);},
    f => {f.evidence.processes[2].code = 1;},
    f => {delete f.evidence.rawObservations;},
    f => {delete f.evidence.rawObservations['video-probe-completed'];},
    f => {f.evidence.generatedArtifacts = [clone(f.evidence.replay)]; f.evidence.verifiedGeneratedArtifacts = clone(f.evidence.generatedArtifacts);},
    f => {f.evidence.rawObservations.encode.stdoutUtf8 = 'frame=0\nprogress=end\n';},
    f => {f.evidence.rawObservations.encode.artifactPath = f.evidence.replay.path;},
    f => {f.evidence.executableVersions.ffmpeg = 'different version';},
    f => {f.evidence.video.completed.duration = '999/1';},
  ]) {
    const f = syntheticEvidence({decoded});
    change(f);
    assert.equal(validate(f).status, 'failed');
  }
});

test('parsed equality cannot conceal different raw framehash or packet output with freshly recomputed proof hashes', () => {
  for (const purpose of ['framehash-completed', 'audio-packets-completed']) {
    const f = syntheticEvidence({decoded: true});
    const raw = f.evidence.rawObservations[purpose];
    raw.stdoutUtf8 = raw.stdoutUtf8.replace(purpose.startsWith('framehash') ? hash('frame-1') : hash('audio-1'), hash('changed'));
    const process = f.evidence.processes.find(row => row.purpose === purpose);
    process.stdoutSha256 = hash(raw.stdoutUtf8);
    const artifact = f.evidence.generatedArtifacts.find(row => row.path === raw.artifactPath);
    artifact.fileSha256 = hash(raw.stdoutUtf8); artifact.bytes = Buffer.byteLength(raw.stdoutUtf8);
    f.evidence.verifiedGeneratedArtifacts = clone(f.evidence.generatedArtifacts);
    assert.equal(validate(f).status, 'failed');
  }
});

test('sample/display aspect, color meaning and display side data must match despite identical pixel hashes', () => {
  const values = {sampleAspectRatio: '2/1', displayAspectRatio: '2/1', colorRange: 'pc',
    colorSpace: 'smpte170m', colorTransfer: 'smpte2084', colorPrimaries: 'bt2020',
    chromaLocation: 'center', fieldOrder: 'tt', sideData: [{side_data_type: 'Display Matrix', rotation: 180}]};
  for (const [key, value] of Object.entries(values)) {
    const f = syntheticEvidence({decoded: true});
    f.evidence.video.completed.display[key] = value;
    if (key === 'sampleAspectRatio') f.evidence.decodedVideo.completed.sampleAspectRatio = value;
    attachSyntheticExecutionProofs(f);
    assert.equal(validate(f).status, 'failed');
  }
  const mismatch = syntheticEvidence({decoded: true});
  mismatch.evidence.decodedVideo.completed.sampleAspectRatio = '2/1';
  attachSyntheticExecutionProofs(mismatch);
  assert.equal(validate(mismatch).status, 'failed');
  const a = parsePresentationExactVideoFrameHashV001({text: frameHashText(), width: 2, height: 2});
  const b = parsePresentationExactVideoFrameHashV001({text: frameHashText().replace('#sar 0: 1/1', '#sar 0: 2/1'), width: 2, height: 2});
  assert.notEqual(a.sampleAspectRatio, b.sampleAspectRatio);
});

// Synthetic layout/binding fixtures test rejection paths. They do not stand in
// for the native-font fixture or certify the final video.
function motionRendererFixture(expression) {
  const canvas = {width: 1920, height: 1080, fps: 30,
    safeAreaPx: {left: 80, right: 80, top: 40, bottom: 40}};
  const element = fixture().plan.elements[0];
  element.endFrameExclusive = 30; element.displayFrameCount = 30;
  element.visualState.textStyle.fontSizePx = 96;
  element.visualState.position.offsetYPercent = -6;
  element.presentationMotion = {presentation: 'provisional-' + expression,
    presetVersion: 'presentation-caption-motion-v001'};
  const states = buildPresentationCaptionMotionStateElementsV001({element, canvas}).map(row => {
    const width = row.element.visualState.textStyle.fontSizePx;
    const offset = row.element.visualState.position.offsetXPercent * canvas.width / 100;
    const bounds = {left: 960 + offset - width / 2, top: 980 - width,
      right: 960 + offset + width / 2, bottom: 980, width, height: width};
    const props = {text: row.element.text, visualState: row.element.visualState};
    const pngSha256 = hashJson(row);
    return {...row, props, pngPath: '/fixture/' + row.state + '.png', pngSha256,
      inspection: {instructionId: element.instructionId, overlayFile: 'overlays/' + row.state + '.png',
        overlaySha256: pngSha256, appliedOverlayPropsCanonicalSha256: hashJson(props),
        pixelWidth: canvas.width, pixelHeight: canvas.height, alphaMax: 1, alphaBounds: bounds,
        lineCount: 1, lineAlphaBounds: [{lineIndex: 0, ...bounds}],
        layoutWrapper: {left: bounds.left, top: bounds.top, width, height: width}}};
  });
  const program = getPresentationCaptionMotionProgramV001({element, canvas});
  const record = {...states[0], element, motionStates: states, inspection: {...states[0].inspection,
    motion: {presetVersion: element.presentationMotion.presetVersion, metadata: element.presentationMotion,
      program, states: states.map(row => ({state: row.state, ...row.inspection}))}}};
  const input = {plan: {canvas, elements: [element]}, canvas,
    applicationResults: buildPresentationRenderApplicationResultsV002([record]), overlayInspections: [record.inspection],
    mediaInspection: {video: {...canvas, frameCount: 30}, durationMs: 1000},
    expectedAudio: {present: false}, expectedFrameCount: 30};
  return {input, record};
}

for (const expression of ['bounce', 'shake']) {
  test(expression + ' native QC rejects clamping, unbound images, missing states and invalid static layouts', () => {
    const {input} = motionRendererFixture(expression);
    assert.equal(evaluatePresentationRendererQcV002({...input, requireFinalVisibility: false}).status, 'passed');
    for (const mutate of [
      f => {f.overlayInspections[0].motion.states[1].layoutWrapper.left++;},
      f => {f.overlayInspections[0].motion.states[1].overlaySha256 = hash('substituted-image');},
      f => {f.applicationResults[0].motion.states.pop();},
      f => {f.overlayInspections[0].motion.states.reverse();},
      f => {f.overlayInspections[0].motion.program.segments[0].endFrameExclusive++;},
      f => {f.applicationResults[0].motion.metadata.presetVersion = 'unknown';},
      f => {f.overlayInspections[0].motion.states[1].alphaBounds.width = 97;},
    ]) {
      const changed = clone(input); mutate(changed);
      assert.ok(evaluatePresentationRendererQcV002({...changed, requireFinalVisibility: false}).violations
        .some(row => row.code === 'CAPTION_MOTION_NATIVE_STATE_MISMATCH'));
    }
    const clipped = clone(input);
    clipped.overlayInspections[0].motion.states[1].lineAlphaBounds[0].left = 0;
    assert.ok(evaluatePresentationRendererQcV002({...clipped, requireFinalVisibility: false}).violations
      .some(row => row.code === 'LAYOUT_SAFE_AREA_VIOLATION' && row.details.captionMotionState));
    assertRendererCompletedFailure(evaluatePresentationRendererQcV002(input));
    for (const basis of [PRESENTATION_NATIVE_FRAME_QC_BASIS_V001, PRESENTATION_ENCODED_OMISSION_QC_BASIS_V002]) {
      const changed = clone(input); changed.overlayInspections[0].visibilityComparisonBasis = basis;
      assertRendererCompletedFailure(evaluatePresentationRendererQcV002(changed));
    }
  });

  test(expression + ' collision checks follow the moving state interval beyond the disjoint stable box', () => {
    const {input, record} = motionRendererFixture(expression);
    const stable = record.motionStates[0];
    const element = {...clone(stable.element), instructionId: 'neighbor', startFrame: expression === 'bounce' ? 4 : 6,
      endFrameExclusive: expression === 'bounce' ? 6 : 8, displayFrameCount: 2};
    const bounds = {left: 1010, top: 884, right: 1018, bottom: 980, width: 8, height: 96};
    const props = {...clone(stable.props), instructionId: 'neighbor'};
    const pngSha256 = hash('neighbor');
    const neighbor = {...stable, element, props, pngPath: '/fixture/neighbor.png', pngSha256,
      inspection: {...clone(stable.inspection), instructionId: 'neighbor', overlayFile: 'overlays/neighbor.png',
        overlaySha256: pngSha256, appliedOverlayPropsCanonicalSha256: hashJson(props), alphaBounds: bounds,
        lineAlphaBounds: [{lineIndex: 0, ...bounds}]}};
    input.plan.elements.push(element);
    input.applicationResults.push(...buildPresentationRenderApplicationResultsV002([neighbor]));
    input.overlayInspections.push(neighbor.inspection);
    assert.ok(stable.inspection.alphaBounds.right < bounds.left);
    const result = evaluatePresentationRendererQcV002({...input, requireFinalVisibility: false});
    assert.ok(result.violations.some(row => row.code === 'INSTRUCTION_TEMPORAL_SPATIAL_COLLISION'
      && row.details.overlappingFrames === 2 && row.details.captionMotionStates.left === (expression === 'bounce' ? 'maximum' : 'right-8')));
    input.plan.elements[1].startFrame = 20; input.plan.elements[1].endFrameExclusive = 22;
    assert.ok(!evaluatePresentationRendererQcV002({...input, requireFinalVisibility: false}).violations
      .some(row => row.code === 'INSTRUCTION_TEMPORAL_SPATIAL_COLLISION'));
  });
}
