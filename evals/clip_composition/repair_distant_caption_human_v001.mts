import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile, readdir} from 'node:fs/promises';
import {ROOT, readJson, readBound, bind, publish, fileSha, same, pass, keys, type Json}
  from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {loadDistantContextV001, verifyDistantAdoptionV001, buildDistantCaptionInputsV001, constructDistantCaptionCoreV001}
  from './run_distant_connection_pair_skill_e2e_v001.mts';
import {validateDisplayForAdoptionV001, assembleAdoptedCaptionCoreV001, renderAdoptedVideoV001, CORE_FILES}
  from './adopted_media_manufacturing_v001.mts';
import {mapPresentationSourceIntervalV002} from './presentation_base_media_timeline_v004.mjs';

export const WORK = 'evals/clip_composition/outputs/presentation/work-distant-connection-skill-e2e-20260907-v001';
export const REVIEW = `${WORK}/human-caption-boundary-v001`;
export const REPAIR = `${WORK}/caption-human-repair-v001`;
const RUN = `${WORK}/run-v001`, ID = 'distant-human-caption-repair-20260908-v001';
const SELF = 'evals/clip_composition/repair_distant_caption_human_v001.mts';
const CONFIRMED = `${REVIEW}/confirmed-observations.json`;
const out = (n: string) => `${REPAIR}/${n}`;
const exactFile = async (p: string) => ({path: p, fileSha256: await fileSha(path.join(ROOT, p))});

/** 人間の整数frameを既存の映像時計へ逆写像する。STTへの近傍丸めはしない。 */
export function frameToCoreSourceMsV001(timeline: Json, segment: Json, frame: number) {
  assert(Number.isInteger(frame) && frame >= segment.outputStartFrame && frame <= segment.outputEndFrame);
  // 採用区間の端は既にそのframeへ解決された正式な端点を参照する。
  if (frame === segment.outputStartFrame) return segment.sourceStartMs;
  if (frame === segment.outputEndFrame) return segment.sourceEndMs;
  const sourceFrame = segment.sourceStartFrame30 + frame - segment.outputStartFrame;
  return Math.round(sourceFrame * 1000 / 30 + timeline.sourceFrameClock.videoPresentationOffsetMs);
}

export function validateDistantHumanObservationsV001(human: Json, config: Json, old: Json, timeline: Json, generation: Json) {
  assert.equal(human.schemaVersion, 'distant-human-caption-confirmed-observations-v001');
  assert.equal(human.authority, 'ZEV進行管理２ 指示-014');
  assert.equal(human.userConfirmation, '3字幕を指定した');
  assert.equal(human.observations.length, 3); assert.equal(config.targets.length, 3);
  assert.equal(config.framesPerSecond, 30); assert.equal(config.audioSampleRate, generation.audio.sampleRate);
  const changes = human.observations.map((entry: Json, i: number) => {
    const o = entry.observation, t = config.targets[i], ins = old.instruction.instructions[i+1];
    assert.equal(o.recordPurpose, 'human-boundary-observation', 'SYNTHETIC_OBSERVATION_NOT_ALLOWED');
    assert.equal(o.status, 'human-observation-saved-not-promoted');
    assert.equal(o.authority, human.authority); assert(same(o.targetBinding, t));
    assert.equal(t.instructionId, ins.instructionId); assert.equal(t.text, ins.content.text);
    assert.deepEqual(t.textIds, ins.targetProvenance.atomOccurrenceIds);
    assert.deepEqual(t.currentFrames, ins.outputTime);
    assert.equal(o.configSha256, human.configBinding.fileSha256);
    assert.equal(o.request.configSha256, o.configSha256); assert.equal(o.request.targetId, t.id);
    assert(same(o.sourceBindings, config.sources));
    for (const key of ['completedMediaBinding', 'baseMediaBinding']) assert(same(o[key], config[key]));
    assert.equal(o.audioPacketPayloadSha256, generation.audio.encoded.packetPayloadSha256);
    const segment = timeline.segments.find((s: Json) => s.segmentId === t.timelineSegment.segmentId);
    const gen = generation.segments.find((s: Json) => s.segmentId === segment.segmentId);
    assert.deepEqual(t.timelineSegment, gen);
    assert.equal(o.startMode, o.request.startMode);
    const keep = o.startMode === 'keep-current';
    assert(keep || o.startMode === 'human-selected');
    if (keep) {assert.equal(i, 0); assert.equal(o.start, null); assert.equal(o.request.start, null);}
    const frames = {...ins.outputTime};
    for (const side of (keep ? ['end'] : ['start', 'end'])) {
      const obs = o[side], request = o.request[side];
      assert(keys(request, ['frame', 'presentedFrame', 'kind']));
      const f = request.frame, shown = request.presentedFrame;
      assert(Number.isInteger(f) && Number.isInteger(shown));
      assert(shown >= config.windowStartFrame && shown < config.windowEndFrameExclusive);
      if (request.kind === 'frame-start') assert.equal(f, shown);
      else {assert.equal(request.kind, 'after-final-frame'); assert.equal(side, 'end');
        assert.equal(shown, config.windowEndFrameExclusive-1); assert.equal(f, config.windowEndFrameExclusive);}
      assert(f >= segment.outputStartFrame && f <= segment.outputEndFrame);
      assert.equal(obs.side, side); assert.equal(obs.outputVideoFrame, f);
      assert.equal(obs.observedPresentedFrame, shown); assert.equal(obs.kind, request.kind);
      const sample = f * config.audioSampleRate / 30;
      assert(Number.isInteger(sample)); assert.equal(obs.outputAudioSample, sample);
      const sourceSample = gen.audioSamples.sourceStart + sample - gen.audioSamples.outputStart;
      assert.equal(obs.sourceAudioSample, sourceSample);
      assert.equal(obs.sourceVideoFrame30, segment.sourceStartFrame30 + f - segment.outputStartFrame);
      assert.deepEqual(obs.outputTimeSecondsExact, {numerator: f, denominator: 30});
      assert.deepEqual(obs.sourceAudioTimeSecondsExact, {numerator: sourceSample, denominator: config.audioSampleRate});
      assert.equal(obs.instructionId, ins.instructionId); assert.deepEqual(obs.textIds, t.textIds);
      assert.equal(obs.completedMediaSha256, config.completedMediaBinding.fileSha256);
      assert.equal(obs.baseMediaSha256, config.baseMediaBinding.fileSha256);
      assert.equal(obs.audioPacketPayloadSha256, config.audioPacketPayloadSha256);
      frames[side === 'start' ? 'startFrame' : 'endFrameExclusive'] = f;
    }
    assert.deepEqual(frames, o.proposedFrames); assert(frames.startFrame < frames.endFrameExclusive);
    const atoms = old.meaning.atomOccurrences.filter((a: Json) => t.textIds.includes(a.atomOccurrenceId));
    assert.equal(atoms.length, t.textIds.length); assert.equal(atoms.map((a: Json) => a.text).join(''), t.text);
    const spans = atoms.flatMap((a: Json) => a.retainedSpans);
    assert(spans.every((s: Json) => s.timelineSegmentId === segment.segmentId));
    const interval = {
      sourceStartMs: keep ? Math.min(...spans.map((s: Json) => s.sourceStartMs)) : frameToCoreSourceMsV001(timeline, segment, frames.startFrame),
      sourceEndMs: frameToCoreSourceMsV001(timeline, segment, frames.endFrameExclusive),
    };
    const mapped = pass(mapPresentationSourceIntervalV002(timeline, interval.sourceStartMs, interval.sourceEndMs), 'HUMAN_FRAME_BRIDGE_INVALID').mapping;
    assert.deepEqual({startFrame: mapped.startFrame, endFrameExclusive: mapped.endFrameExclusive}, frames);
    return {originalInstructionId: ins.instructionId, ordinal: i+2, text: t.text, textIds: t.textIds,
      originalFrames: ins.outputTime, humanFrames: frames, startMode: o.startMode,
      coreSourceInterval: {...interval, timelineSegmentId: segment.segmentId}, observation: o,
      interpretation: 'caption-display-span-from-human-frame; original-STT-observation-remains-in-parent-meaning'};
  });
  assert(changes[0].humanFrames.startFrame >= old.instruction.instructions[0].outputTime.endFrameExclusive);
  for (let i=1; i<changes.length; i++) assert(changes[i-1].humanFrames.endFrameExclusive <= changes[i].humanFrames.startFrame, 'HUMAN_CAPTIONS_OVERLAP');
  return changes;
}

export async function loadOriginalDistantCaptionV001() {
  const parent = await readJson(`${RUN}/verification.json`);
  const c = await loadDistantContextV001(parent.planBinding.path);
  assert(same(c.planBinding, parent.planBinding));
  const {adoption: machineAdoption} = await verifyDistantAdoptionV001(c);
  const {schemaVersion, ...base} = await readJson(`${RUN}/base-media-bindings.json`);
  const timeline = await readBound(base.timeline), generation = await readBound(base.generationManifest);
  const inputs = buildDistantCaptionInputsV001(c, machineAdoption, base), tokens = [];
  for (const [i, req] of inputs.requests.entries()) {
    assert(same(req, await readJson(`${RUN}/display-${i+1}-request.json`)));
    tokens.push(validateDisplayForAdoptionV001(req, await readJson(`${RUN}/display-${i+1}-response.json`),
      await readJson(`${RUN}/display-${i+1}-result.json`), 'distant-connection-pair-display-response-v001'));
  }
  const old = await constructDistantCaptionCoreV001(c, machineAdoption, base, tokens);
  for (const [key, ref] of Object.entries(parent.artifacts) as [string, Json][]) assert(same(old[key], await readBound(ref)));
  return {c, parent, base, timeline, generation, old, machineAdoption};
}

export function verifyDistantRepairScopeV001(old: Json, core: Json, changes: Json[]) {
  assert.equal(core.instruction.instructions.length, 4);
  assert.equal(core.meaning.atomOccurrences.length, 68);
  for (const [i, atom] of core.meaning.atomOccurrences.entries()) {
    const expected = structuredClone(old.meaning.atomOccurrences[i]);
    const change = changes.find(ch => ch.textIds.includes(atom.atomOccurrenceId));
    if (change) expected.retainedSpans = [change.coreSourceInterval];
    assert.deepEqual(atom, expected, 'UNAUTHORIZED_ATOM_OR_TEXT_CHANGE');
  }
  assert.deepEqual(core.meaning.orderedCandidates, old.meaning.orderedCandidates);
  assert.deepEqual(core.meaning.captions, old.meaning.captions);
  for (const [i, row] of core.instruction.instructions.entries()) {
    const before = old.instruction.instructions[i];
    for (const key of ['semanticKind', 'content', 'targetProvenance', 'materialRefs']) assert.deepEqual(row[key], before[key]);
    assert.deepEqual(row.outputTime, i ? changes[i-1].humanFrames : before.outputTime, 'UNAUTHORIZED_FRAME_CHANGE');
  }
  assert.deepEqual(core.selection.response, old.selection.response, 'DISPLAY_SEGMENTATION_CHANGED');
  assert.deepEqual(core.sourcePackage.promptInput, old.sourcePackage.promptInput);
  const job = structuredClone(old.rendererJob);
  for (const k of ['jobId', 'attemptId', 'instructionArtifactBinding', 'lineEndProjectionBinding', 'publication']) job[k] = core.rendererJob[k];
  assert.deepEqual(job, core.rendererJob, 'MEDIA_RENDERER_STYLE_OR_QC_CHANGED');
}

export async function reconstructDistantHumanRepairV001(original?: Awaited<ReturnType<typeof loadOriginalDistantCaptionV001>>) {
  const b = original ?? await loadOriginalDistantCaptionV001();
  const human = await readJson(CONFIRMED), config = await readJson(`${REVIEW}/config.json`);
  assert.equal((await exactFile(CONFIRMED)).fileSha256, '6425cc8791070b9fd9411201f910c662a4bd96d2eb117895dffc6683ccbef38b');
  assert.equal((await exactFile(human.configBinding.path)).fileSha256, human.configBinding.fileSha256);
  for (const ref of config.sources.concat([config.completedMediaBinding, config.baseMediaBinding])) assert.equal((await exactFile(ref.path)).fileSha256, ref.fileSha256);
  for (const item of human.observations) {
    assert.equal((await exactFile(item.sourceFile.path)).fileSha256, item.sourceFile.fileSha256);
    assert(same(await readJson(item.sourceFile.path), item.observation));
  }
  const changes = validateDistantHumanObservationsV001(human, config, b.old, b.timeline, b.generation);
  const adoption = {schemaVersion: 'distant-human-caption-repair-adoption-v001', artifactId: `${ID}-adoption`,
    authority: human.authority, parentVerification: bind(`${RUN}/verification.json`, b.parent),
    humanObservations: await exactFile(CONFIRMED), implementation: await exactFile(SELF),
    sharedManufacturing: await exactFile('evals/clip_composition/adopted_media_manufacturing_v001.mts'),
    policy: 'three-human-caption-boundaries-only-no-new-inference', changes,
    humanSemanticQuality: 'passed-in-instruction-014', humanCaptionSync: 'pending-four-local-review-points'};
  const ab = bind(out('caption-adoption.json'), adoption);
  const meaning = structuredClone(b.old.meaning); meaning.artifactId = `${ID}-meaning`;
  meaning.originalMeaningBinding = b.parent.artifacts.meaning; meaning.humanTimingAdoptionBinding = ab;
  meaning.timingInterpretation = 'only-three-cue-display-spans-use-human-frames; no-new-token-level-acoustic-estimates';
  for (const atom of meaning.atomOccurrences) {
    const ch = changes.find(c => c.textIds.includes(atom.atomOccurrenceId));
    if (ch) atom.retainedSpans = [ch.coreSourceInterval];
  }
  const source = structuredClone(b.old.sourcePackage); source.packageId = `${ID}-source-package`;
  const mb = bind(out('meaning-input.json'), meaning);
  source.reconstructionMap.meaningPackageBindings = [mb];
  source.reconstructionMap.caseContexts[0].meaningPackageBinding = mb;
  source.reconstructionMap.caseContexts[0].caseId = ID;
  source.provenance.sourcePackageJobBinding = ab;
  const c = {plan: {planId: ID, outputRoot: REPAIR}, rendererTemplate: b.old.rendererJob};
  const core = await assembleAdoptedCaptionCoreV001(c, {meaning, sourcePackage: source}, b.base, adoption,
    [{cues: structuredClone(b.old.selection.response.captions[0].cues)}]);
  verifyDistantRepairScopeV001(b.old, core, changes);
  const artifacts = Object.fromEntries(Object.entries(CORE_FILES).map(([key, file]) => [key, bind(out(file), core[key])]));
  return {...b, c, human, config, changes, core, artifacts};
}

async function build() {
  const b = await reconstructDistantHumanRepairV001();
  for (const [key, ref] of Object.entries(b.artifacts) as [string, Json][]) await publish(ref.path, b.core[key]);
  await publish(out('pre-render-verification.json'), {schemaVersion: 'distant-human-caption-pre-render-verification-v001', status: 'passed',
    artifacts: b.artifacts, humanObservations: await exactFile(CONFIRMED),
    changes: b.changes.map(ch => ({text: ch.text, before: ch.originalFrames, after: ch.humanFrames, startMode: ch.startMode})),
    checks: {parentReconstruction: 'all-eight-core-artifacts-exact', humanFrameRoundTrip: 'all-five-specified-boundaries-exact',
      otherCaption: 'text-frames-and-lines-exact', allCaptionTextIdsAndLineBreaks: 'unchanged', baseMediaAndAudio: 'unchanged',
      rendererStyleCoreAndQc: 'unchanged', newInference: 0}});
  console.log(JSON.stringify({status: 'ready-to-render', changes: b.changes.map(c => c.humanFrames)}));
}
async function renderAndVerify() {
  const b = await reconstructDistantHumanRepairV001();
  for (const [key, ref] of Object.entries(b.artifacts) as [string, Json][]) assert(same(b.core[key], await readBound(ref)));
  const renderer = await renderAdoptedVideoV001(b.c, b.artifacts, 'distant-human-caption-renderer-execution-v001');
  const execution = await readBound(renderer.execution), admission = await readBound(renderer.admission);
  assert.equal(admission.status, 'accepted');
  const qc = execution.result.qc; assert.deepEqual(qc.violations, []);
  assert.equal(qc.mediaEvidence.observed.video.frameCount, 1671);
  assert.equal(qc.mediaEvidence.observed.audio.packetPayloadSha256, b.generation.audio.encoded.packetPayloadSha256);
  const layout = await readBound(renderer.lineLayout), priorLayout = await readBound(b.parent.renderer.lineLayout);
  for (const [i, row] of layout.entries.entries()) {
    const previous = structuredClone(priorLayout.entries[i]); previous.instructionId = row.instructionId;
    assert.deepEqual(row, previous, 'ACTUAL_LAYOUT_CHANGED');
  }
  assert.equal(qc.instructionEvidence.length, 4);
  for (const [i, row] of qc.instructionEvidence.entries()) {
    const ins = b.core.instruction.instructions[i]; assert.equal(row.instructionId, ins.instructionId);
    assert(row.representativeFrame >= ins.outputTime.startFrame && row.representativeFrame < ins.outputTime.endFrameExclusive);
    assert.equal(row.applicationOverlaySha256, row.overlaySha256);
    assert.equal((await exactFile(out(`render/${row.applicationOverlayFile}`))).fileSha256, row.overlaySha256);
  }
  const processFiles: Json[] = [];
  async function collect(p: string) {
    for (const e of await readdir(path.join(ROOT,p), {withFileTypes: true})) {
      const name = `${p}/${e.name}`;
      if (e.isDirectory()) await collect(name);
      else {const bytes = await readFile(path.join(ROOT,name)); processFiles.push({...await exactFile(name), sizeBytes: bytes.length, encoding:'base64', bytes:bytes.toString('base64')});}
    }
  }
  await collect(out('process-observations'));
  const processes = await publish(out('process-observation-evidence.json'), {schemaVersion:'distant-human-caption-process-evidence-v001', files:processFiles});
  const result = {schemaVersion:'distant-human-caption-repair-verification-v001',status:'passed',
    parentVerification:bind(`${RUN}/verification.json`,b.parent),baseMedia:b.base,artifacts:b.artifacts,renderer,processes,
    humanObservations:await exactFile(CONFIRMED),
    changes:b.changes.map(ch=>({instructionId:ch.originalInstructionId,text:ch.text,before:ch.originalFrames,after:ch.humanFrames})),
    checks:{formalReconstruction:'exact',actualFourCaptionLayouts:'exact',humanSelectedBoundaries:5,changedBoundaryValues:4,
      otherCaption:'unchanged',captionTextAndSegmentation:'unchanged',frameCount:1671,durationMs:55700,
      baseMediaAndAudioPackets:'unchanged',rendererStyleCoreAndQc:'unchanged',technicalQc:'passed'},
    humanSemanticQuality:'passed-in-instruction-014',humanCaptionSync:'pending-four-local-review-points'};
  await publish(out('final-verification.json'),result);
  console.log(JSON.stringify({status:'passed',video:renderer.video,checks:result.checks}));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  (process.argv[2] === 'build' ? build() : process.argv[2] === 'render' ? renderAndVerify() : Promise.reject(new Error('Expected build or render')))
    .catch(e=>{console.error(e);process.exitCode=1;});
}
