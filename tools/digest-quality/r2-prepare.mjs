/** Explicit R2-only derivation from saved source evidence; no new AI decision. */
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {resolveR2OpeningExtensionV001} from './r2-opening.mjs';
import {bindR2File as bind, saveR2Json as save, buildR2OpeningBackgroundV001} from './r2-media.mjs';
import {frameBoundaryWithVideoOffsetV001} from '../../evals/clip_composition/presentation_base_media_timeline_v004.mjs';
import {AUTO_PRESENTATION_RULES_REF_V009, sha256AutoPresentationV001, fixAutoPresentationProposalV001,
  createAutoPresentationOverridesV001, editAutoPresentationOverrideV001, resolveAutoPresentationV001}
  from '../../evals/clip_composition/presentation_auto_effects_v001.mjs';
import {loadAutoPresentationContextV001, loadAutoPresentationV001} from '../../evals/clip_composition/presentation_auto_effects_io_v001.mjs';
import {getPresentationCaptionMotionProgramV001, PRESENTATION_BOUNCE_SPEECH_RETURN_PRESET_V001}
  from '../../evals/clip_composition/presentation_caption_motion_v001.mjs';
import {getPresentationPulseProgramV001, PRESENTATION_PULSE_SPEECH_RETURN_PRESET_V001}
  from '../../evals/clip_composition/presentation_pulse_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from '../../evals/clip_composition/presentation_output_directory_v001.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mainRepo = '/Users/kawafmm/workspace/zev2';
const oldWork = path.join(mainRepo, 'evals/clip_composition/outputs/presentation/work-digest-caption-sync-internal-edit-20260907-v001');
const q3 = path.join(repo, 'evals/clip_composition/outputs/presentation/stage4-editing-20260918-v001/quality-q3-20260920-v001/run-v001');
const originalDrawingPath = path.join(repo, 'evals/clip_composition/outputs/presentation/stage4-editing-20260918-v001/quality-q1-q2-20260920-v001/candidates-v001/motion-drawing-evidence.json');
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const bare = ref => ({path: ref.path, fileSha256: ref.fileSha256});
async function checked(ref) {const actual = await bind(ref.path); assert.equal(actual.fileSha256, ref.fileSha256); return actual;}

export async function prepareR2OpeningV001({outputDirectory, buildMedia = false}) {
  assert.equal(process.version, 'v20.19.6');
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory});
  const historical = await json(originalDrawingPath), plan = JSON.parse(historical.source.planBytes);
  assert.equal(sha256AutoPresentationV001(plan), historical.source.captionContext.baselineRef.canonicalSha256);
  const fixed = historical.state.captionAuto.proposal, priorCaptionIds = plan.elements.slice(0, 5).map(row => row.instructionId);
  assert.deepEqual(plan.elements.slice(0, 5).map(row => row.text),
    ['あーもういるやん', 'これもういるやん', 'いるやんいるやん', 'もうリカちゃんやめてー!', 'リカー!']);
  assert.deepEqual(plan.elements.slice(0, 5).map(row => [row.startFrame, row.endFrameExclusive]),
    [[8, 13], [13, 37], [37, 71], [71, 154], [154, 197]]);
  const observationPath = path.join(oldWork, 'acoustic-observation-chunk-0042-v001.json');
  const validationPath = path.join(oldWork, 'acoustic-correspondence-validation-v003.json');
  const inspectionPath = path.join(oldWork, 'internal-edit-v001/source-media-inspection.json');
  const manifestPath = path.join(q3, 'source-inputs/raw-inputs/baseline-generation-manifest.json');
  const [observation, validation, inspection, manifest, fullInput] = await Promise.all([
    json(observationPath), json(validationPath), json(inspectionPath), json(manifestPath), json(path.join(q3, 'judgment-input.json')),
  ]);
  const sourceVideo = fullInput.references.find(ref => ref.id === 'original-source-media');
  const completed = fullInput.references.find(ref => ref.id === 'completed-media');
  const refs = {
    historicalDrawing: await bind(originalDrawingPath), sourceInspection: await bind(inspectionPath),
    sourceObservation: await bind(observationPath), sourceValidation: await bind(validationPath),
    sourceManifest: await bind(manifestPath), originalBaseline: await checked(historical.source.captionContext.baselineRef),
    originalBase: await checked(historical.source.mediaRef),
    originalCompleted: await checked({path: completed.path, fileSha256: completed.sha256}),
    originalSource: await checked({path: sourceVideo.path, fileSha256: sourceVideo.sha256}),
    preflight: await checked(observation.preflightBinding),
  };
  const preflight = await json(refs.preflight.path), chunk = preflight.chunks.find(row => row.index === 42);
  assert.equal(chunk.startMs, 1260000);
  for (const [key, binding] of [['chunkAudio', chunk.audioBinding], ['chunkRawText', chunk.rawTextBinding]]) {
    assert(binding, key); refs[key] = await checked(binding);
  }
  const units = validation.chunks.find(row => row.chunkIndex === 42).units;
  const firstUnits = units.filter(row => row.sourceSegmentIds.some(id => 2604 <= id && id <= 2611));
  assert.equal(firstUnits.map(row => row.text).join(''), plan.elements[0].text);
  for (const unit of [...firstUnits, units.find(row => row.unitId === 'chunk-42-unit-25'),
    units.find(row => row.unitId === 'chunk-42-unit-39')]) {
    const ordinal = Number(unit.unitId.split('-').at(-1)), word = observation.words[ordinal - 1];
    assert.equal(word.word, unit.text);
    assert.equal(Math.round(word.start * 1000) + chunk.startMs, unit.startMs);
    assert.equal(Math.round(word.end * 1000) + chunk.startMs, unit.endMs);
    assert.equal(unit.timeOrigin, 'fixed-text-acoustic-token-group');
  }
  assert.equal(firstUnits[0].startTimeRole, 'acoustic-token-boundary');
  const extension = resolveR2OpeningExtensionV001({inspection, generationManifest: manifest,
    completedFrameCount: fullInput.media.frameCount, observedStartMs: firstUnits[0].startMs,
    observedEndMs: firstUnits.at(-1).endMs});
  assert.equal(extension.addedFrameCount, 11);
  const speech = [
    {captionId: priorCaptionIds[1], unitId: 'chunk-42-unit-25', version: PRESENTATION_BOUNCE_SPEECH_RETURN_PRESET_V001.version},
    {captionId: priorCaptionIds[3], unitId: 'chunk-42-unit-39', version: PRESENTATION_PULSE_SPEECH_RETURN_PRESET_V001.version},
  ].map(row => {
    const unit = units.find(unit => unit.unitId === row.unitId);
    const sourceFrame = frameBoundaryWithVideoOffsetV001(unit.endMs, inspection.media.videoClock.presentationOffsetMs);
    return {...row, sourceUnit: unit, sourceFrame, oldDigestFrame: sourceFrame - manifest.segments[0].sourceStartFrame30,
      newGlobalFrame: sourceFrame - extension.sourceVideoRange.startFrame};
  });
  assert.deepEqual(speech.map(row => row.oldDigestFrame), [37, 154]);
  const baselinePlan = {...structuredClone(plan), elements: plan.elements.slice(0, 5).map(element => ({...structuredClone(element),
    startFrame: element.startFrame + extension.addedFrameCount, endFrameExclusive: element.endFrameExclusive + extension.addedFrameCount}))};
  baselinePlan.elements[0].startFrame = 0;
  baselinePlan.elements[0].displayFrameCount = baselinePlan.elements[0].endFrameExclusive;
  for (const [index, element] of baselinePlan.elements.entries()) {
    assert.equal(element.text, plan.elements[index].text);
    assert.deepEqual(element.indexedLines, plan.elements[index].indexedLines);
    assert.equal(element.endFrameExclusive - element.startFrame, element.displayFrameCount);
    if (index) assert.equal(baselinePlan.elements[index - 1].endFrameExclusive, element.startFrame);
  }
  await mkdir(outputDirectory);
  const baselinePath = path.join(outputDirectory, 'normal-plan.json'), decisionInputPath = path.join(outputDirectory, 'decision-input.json');
  await save(baselinePath, baselinePlan);
  const pulseTimingProjection = {schemaVersion: 'auto-presentation-pulse-frame-offset-v001', frameOffset: extension.addedFrameCount,
    sourceBaselineRef: historical.source.captionContext.baselineRef};
  await save(decisionInputPath, {schemaVersion: 'presentation-focus-decision-input-v005',
    pulseTimingEvidence: historical.source.captionContext.pulseTimingEvidence, pulseTimingProjection,
    purpose: 'R2 fixed source-observation timing projected once after the eleven-frame source prefix; not a new measurement',
    historicalDrawingRef: refs.historicalDrawing, speech, extension});
  const loaded = await loadAutoPresentationContextV001({baselinePath, decisionInputPath,
    renderingRulesRef: AUTO_PRESENTATION_RULES_REF_V009, pulseTimingProjection});
  assert.deepEqual(loaded.context.pulseTimingEvidence, historical.source.captionContext.pulseTimingEvidence);
  assert.deepEqual(loaded.context.pulseTimingProjection, pulseTimingProjection);
  const effects = fixed.effects.filter(row => priorCaptionIds.includes(row.captionId)).map(row => {
    const timing = speech.find(timing => timing.captionId === row.captionId);
    return timing ? {...structuredClone(row), presetVersion: timing.version, speechEndFrame: timing.newGlobalFrame} : structuredClone(row);
  });
  const autoProposal = fixAutoPresentationProposalV001({...loaded, proposal: {schemaVersion: 'auto-presentation-proposal-v001',
    context: loaded.context, targetCaptionIds: priorCaptionIds, completion: 'complete', effects, exceptions: []}});
  let overrides = createAutoPresentationOverridesV001({...loaded, autoProposal});
  overrides = editAutoPresentationOverrideV001({...loaded, autoProposal, overrides, captionId: priorCaptionIds[0], selection: 'Normal'});
  const resolved = resolveAutoPresentationV001({...loaded, autoProposal, overrides});
  const autoProposalPath = path.join(outputDirectory, 'fixed-proposal.json'), overridesPath = path.join(outputDirectory, 'overrides.json');
  await save(autoProposalPath, autoProposal); await save(overridesPath, overrides); await save(path.join(outputDirectory, 'resolved-plan.json'), resolved.plan);
  const reloaded = await loadAutoPresentationV001({baselinePath, decisionInputPath, autoProposalPath, overridesPath});
  assert.deepEqual(resolveAutoPresentationV001({baselinePlan: reloaded.baselinePlan, ...reloaded.autoPresentation}), resolved);
  const peak = loaded.context.pulseTimingEvidence.peaks.find(row => row.peakId === effects.find(row => row.role === 'Pulse accent').anchorPeakId);
  const peakRate = loaded.context.pulseTimingEvidence.sampleRate;
  const programs = resolved.plan.elements.filter(row => row.presentationMotion || row.presentationPulse).map(element => ({
    captionId: element.instructionId, text: element.text,
    program: element.presentationMotion ? getPresentationCaptionMotionProgramV001({element, canvas: baselinePlan.canvas})
      : getPresentationPulseProgramV001({element, canvas: baselinePlan.canvas})}));
  const evidence = {status: 'prepared', sourceRefs: refs, extension, firstUtterance: firstUnits,
    speechEndEvidence: speech, clockScope: {oldShortRange: {startFrame: 0, endFrameExclusive: 197},
      newShortRange: {startFrame: 0, endFrameExclusive: 208}, newGlobalRange: {startFrame: 0, endFrameExclusive: extension.newCompletedFrameCount}},
    captions: baselinePlan.elements.map((element, index) => ({captionId: element.instructionId, text: element.text,
      oldRange: {startFrame: plan.elements[index].startFrame, endFrameExclusive: plan.elements[index].endFrameExclusive},
      newGlobalRange: {startFrame: element.startFrame, endFrameExclusive: element.endFrameExclusive},
      change: index === 0 ? 'restore the observed first utterance from the new source head' : 'one uniform eleven-frame projection'})),
    measuredPeak: {native: peak, nativeSampleRate: peakRate, nativeEvidenceUnchanged: true,
      newSeconds: {numerator: peak.peakSample * 30 + extension.addedFrameCount * peakRate, denominator: peakRate * 30},
      oldFrame: Math.floor(peak.peakSample * 30 / peakRate), newFrame: Math.floor((peak.peakSample * 30 + extension.addedFrameCount * peakRate) / peakRate)},
    programs, originalExceptions: fixed.exceptions.filter(row => priorCaptionIds.includes(row.captionId)),
    firstCaptionSelection: 'Normal is explicitly retained while restoring timing; no new semantic motion decision is claimed',
    newAutomaticJudgment: false, oldSourceFilesUnchanged: true, semanticListening: false,
    files: {baselinePath, decisionInputPath, autoProposalPath, overridesPath},
    limits: ['saved acoustic alignment is a timing observation, not perfect phoneme truth',
      'local PCM and frame checks establish retained media, not human quality approval',
      'R1/R3 full-Digest integration uses the same source prefix and one-time projection separately']};
  await save(path.join(outputDirectory, 'r2-evidence.json'), evidence);
  if (buildMedia) await buildR2OpeningBackgroundV001({extension, sourceRef: refs.originalSource,
    sourceInspectionRef: refs.sourceInspection, originalBaseRef: refs.originalBase, originalCompletedRef: refs.originalCompleted,
    oldEndFrame: 197, outputDirectory: path.join(outputDirectory, 'background')});
  for (const ref of Object.values(refs)) await checked(ref);
  await writeFile(path.join(outputDirectory, 'preservation-passed.txt'), 'All bound original files match their original SHA.\n', {flag: 'wx'});
  return {outputDirectory, evidencePath: path.join(outputDirectory, 'r2-evidence.json'), ...evidence.files};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [outputDirectory, option] = process.argv.slice(2);
  console.log(JSON.stringify(await prepareR2OpeningV001({outputDirectory, buildMedia: option === '--build-media'}), null, 2));
}
