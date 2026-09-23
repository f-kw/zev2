import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {AUTO_PRESENTATION_RULES_REF_V008} from './presentation_auto_effects_v001.mjs';
import {createOrchestrationContextV001, createOrchestrationJudgmentInputV001, fixOrchestrationJudgmentV001,
  resolveOrchestrationDrawingViewV001, restoreOrchestrationDrawingViewEvidenceV001}
  from './presentation_orchestration_v001.mjs';
import {buildPresentationNativeQcAlternativeElementsV001, preparePresentationNativeFrameQcV001}
  from './presentation_native_frame_qc_preparation_v001.mjs';
import {buildPresentationPulseStateElementsV001, getPresentationPulseProgramV001} from './presentation_pulse_v001.mjs';
import {buildPresentationCaptionMotionStateElementsV001, getPresentationCaptionMotionProgramV001}
  from './presentation_caption_motion_v001.mjs';
import {PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001, PRESENTATION_NATIVE_FRAME_QC_BASIS_V001,
  buildPresentationNativeFrameQcRecipeV001, classifyPresentationNativeFrameRgbV001,
  validatePresentationNativeFrameQcEvidenceV001} from './presentation_native_frame_qc_v001.mjs';
import {PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001} from './presentation_integrity_state_qc_v001.mjs';
import {buildPresentationCompositeArgumentsV001, executeValidatedPresentationDrawAndQcV001}
  from './render_presentation_v002.mjs';
import {inspectPresentationExactReplayQcV001, validatePresentationExactReplayQcEvidenceV001}
  from './presentation_exact_replay_qc_v001.mjs';
import {createOrchestrationRenderScopeV001, assertOrchestrationScopedPlansV001}
  from './presentation_orchestration_render_scope_v001.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = value => sha(canonicalJson(value));
const clone = value => structuredClone(value);
const jsonBytes = value => JSON.stringify(value, null, 2) + '\n';

// File-bound synthetic state exercises the integration contract, never pixel or
// media quality. Actual drawing and composition-order faults have separate runs.
async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'zev-orchestration-render-test-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const save = async (name, bytes) => {const file = path.join(directory, name); await writeFile(file, bytes, {flag: 'wx'});
    return {path: file, fileSha256: sha(bytes)};};
  const plan = {schemaVersion: 'presentation-output-common-core-plan-v001', canvas: {width: 1920, height: 1080, fps: 30},
    elements: ['条件を残す', '急に来た', '怖くて驚いた', '説明をまとめる'].map((text, index) => ({instructionId: 'caption-' + index,
      kind: 'speech-caption', text, indexedLines: [{lineIndex: 0, text}], startFrame: index * 120,
      endFrameExclusive: index * 120 + 100, displayFrameCount: 100,
      visualState: {textStyle: {fontAssetId: 'synthetic-native-font', fontSizePx: 96, fontColor: '#FFFDF8',
        borderColor: '#111827', borderWidthPx: 8, glowWidthPx: 12},
      position: {preset: 'bottom-center', alignment: 'center', offsetXPercent: 0, offsetYPercent: -6},
      background: null, transitionId: 'quick-fade-4f-v001'}}))};
  const planBytes = jsonBytes(plan), planRef = await save('normal.json', planBytes), mediaRef = await save('original.mp4', 'original media bytes');
  const timeline = {schemaVersion: 'presentation-base-media-timeline-v003',
    baseMedia: {frameRate: '30/1', expectedFrameCount: 480, fileSha256: mediaRef.fileSha256},
    segments: plan.elements.map((_, index) => ({segmentId: 'segment-' + index, outputStartFrame: index * 120,
      outputEndFrame: (index + 1) * 120, sourceStartFrame30: index * 1000, sourceEndFrame30: index * 1000 + 120}))};
  const timelineBytes = jsonBytes(timeline), timelineRef = await save('timeline.json', timelineBytes);
  const pulseTimingEvidence = {schemaVersion: 'auto-presentation-pulse-timing-v001',
    sourceRef: await save('native-source.mp4', 'measured audio source'),
    candidatesRef: await save('native-candidates.json', 'native candidate bytes'), peaksRef: await save('native-peaks.json', 'native peak bytes'),
    sampleRate: 16000, sampleCount: 256000, candidates: [{candidateId: 'candidate-1', peakIds: ['peak-1']}],
    peaks: [{peakId: 'peak-1', startSample: 75000, endSampleExclusive: 85000, peakSample: 80000}]};
  const decisionInputBytes = jsonBytes({schemaVersion: 'presentation-focus-decision-input-v005', pulseTimingEvidence});
  const captionContext = {baselineRef: {...planRef, canonicalSha256: hash(plan)},
    decisionInputRef: await save('native-binding.json', decisionInputBytes), renderingRulesRef: clone(AUTO_PRESENTATION_RULES_REF_V008), pulseTimingEvidence};
  const source = {digestRef: {version: 'synthetic-orchestration-render-v001', sha256: sha('fixed Digest bytes')},
    planRef, timelineRef, mediaRef, planBytes, timelineBytes, playbackSampleRate: 44100, observationSampleRate: 16000,
    captionContext, decisionInputBytes};
  const context = createOrchestrationContextV001(source);
  const input = createOrchestrationJudgmentInputV001({context, evidence: {productionPurpose: '原時刻と描画時刻を分離した結合検査。',
    captions: plan.elements.map((row, index) => ({captionId: row.instructionId, text: row.text, contextId: 'context-' + index,
      startFrame: row.startFrame, endFrameExclusive: row.endFrameExclusive, eligiblePulsePeakIds: index === 1 ? ['peak-1'] : []})),
    contexts: plan.elements.map((_, index) => ({contextId: 'context-' + index, description: '保持文脈 ' + index})), observations: [],
    audioEvidence: {sourceRef: pulseTimingEvidence.sourceRef, candidatesRef: pulseTimingEvidence.candidatesRef, sampleRate: 16000, sampleCount: 256000},
    audioCandidates: [{candidateId: 'candidate-1', startSample: 60000, endSampleExclusive: 85000, constituentPeakIds: ['peak-1']}]}});
  const choices = [{preset: 'color', scope: 'partial-caption', targetText: '条件'}, {preset: 'pulse', anchorPeakId: 'peak-1'},
    {preset: 'shake'}, {preset: 'panel', allowedBackgroundPresets: ['plain']}];
  const reply = {schemaVersion: 'presentation-orchestration-judgment-v002', inputSha256: input.inputSha256, completion: 'complete',
    captions: plan.elements.map((row, index) => ({captionId: row.instructionId, status: 'resolved',
      semanticRole: ['focus', 'vocal-energy', 'reaction', 'focus'][index], allowedPresets: [choices[index]],
      reason: '有限表現の検証対象。', evidenceIds: [row.instructionId]})),
    connections: context.connectionIds.map(connectionId => ({connectionId, status: 'resolved', semanticRole: 'separator',
      allowedPresets: ['soft-separator'], reason: '保持場面の境界。', evidenceIds: [connectionId]}))};
  const state = fixOrchestrationJudgmentV001({context, input, replyBytes: jsonBytes(reply)});
  const view = resolveOrchestrationDrawingViewV001({context, state});
  const propsFor = element => ({schemaVersion: 'presentation-renderer-overlay-props-v001', instructionId: element.instructionId,
    canvas: clone(view.resolvedPlan.canvas), text: element.text, indexedLines: clone(element.indexedLines),
    visualState: clone(element.visualState), inspectionLineIndex: null,
    ...(element.presentationColorRange ? {presentationColorRange: clone(element.presentationColorRange)} : {})});
  const inspect = (props, fileSha256) => ({instructionId: props.instructionId, overlaySha256: fileSha256,
    appliedOverlayPropsCanonicalSha256: hash(props), alphaBounds: {left: 20, top: 20, right: 30, bottom: 30, width: 10, height: 10}});
  const physical = async (element, stateName, prefix) => {
    const props = propsFor(element), bytes = jsonBytes(props), png = await save(prefix + '-' + stateName + '.png', bytes);
    return {state: stateName, element: clone(element), props, pngPath: png.path, pngSha256: png.fileSha256,
      inspection: inspect(props, png.fileSha256)};
  };
  const records = [];
  for (const [index, element] of view.resolvedPlan.elements.entries()) {
    const states = element.presentationPulse ? buildPresentationPulseStateElementsV001({element, canvas: plan.canvas})
      : element.presentationMotion ? buildPresentationCaptionMotionStateElementsV001({element, canvas: plan.canvas}) : [{state: 'static', element}];
    const native = [];
    for (const row of states) native.push(await physical(row.element, row.state, 'production-' + index));
    records.push({...native[0], element: clone(element), fileStem: 'caption-' + index,
      ...(element.presentationPulse ? {pulseStates: native, inspection: {...native[0].inspection,
        pulse: {states: native.map(row => ({state: row.state, ...row.inspection}))}}}
        : element.presentationMotion ? {motionStates: native, inspection: {...native[0].inspection,
          motion: {states: native.map(row => ({state: row.state, ...row.inspection}))}}} : {})});
  }
  const drawCalls = [];
  const options = {plan: view.resolvedPlan, records, presentationTimeline: null, orchestrationDrawingView: view,
    presetRegistry: {version: 'synthetic-native-registry'}, scratchDirectory: path.join(directory, 'native-qc'),
    overlayAdapter: {buildProps: propsFor, renderStill: async (props, output) => {drawCalls.push({props: clone(props), output});
      await writeFile(output, jsonBytes(props), {flag: 'wx'});}},
    inspectPng: async ({pngPath}) => {const bytes = await readFile(pngPath); return inspect(JSON.parse(bytes), sha(bytes));}};
  return {directory, save, plan, source, context, state, view, records, options, drawCalls};
}

test('range scopes retain complete caption clocks, original bindings and exact playback samples', async t => {
  const f = await fixture(t), range = {startFrame: 160, endFrameExclusive: 166};
  const scoped = createOrchestrationRenderScopeV001(f.view, range);
  assert.equal(scoped.scope.frameCount, 6);
  assert.equal(scoped.scope.playbackStartSample, 235200);
  assert.equal(scoped.scope.playbackEndSampleExclusive, 244020);
  assert.deepEqual(scoped.resolvedPlan.elements, [f.view.resolvedPlan.elements[1]]);
  assert.equal(scoped.resolvedPlan.elements[0].startFrame, 132);
  assert.equal(scoped.resolvedPlan.elements[0].presentationPulse.anchorFrame, 162);
  assert.deepEqual(f.view.sourceRefs.planRef, f.source.planRef);
  assert.throws(() => createOrchestrationRenderScopeV001(f.view, {startFrame: 1.5, endFrameExclusive: 6}));
  const restarted = clone(scoped.resolvedPlan); restarted.elements[0].startFrame = 0;
  assert.throws(() => assertOrchestrationScopedPlansV001({view: f.view, plan: restarted,
    baselinePlan: scoped.normalPlan, renderRange: scoped.renderRange}), /drawing plans differ/);
});

test('mid-Pulse preview uses the full finite phase and samples local media without restarting the fade', async t => {
  const f = await fixture(t), scoped = createOrchestrationRenderScopeV001(f.view, {startFrame: 160, endFrameExclusive: 166});
  const records = f.records.filter(record => record.element.instructionId === 'caption-1');
  const prepared = await preparePresentationNativeFrameQcV001({...f.options, plan: scoped.resolvedPlan,
    records, renderRange: scoped.renderRange});
  const recipe = buildPresentationNativeFrameQcRecipeV001({plan: scoped.resolvedPlan, baselinePlan: scoped.normalPlan,
    records: prepared.records, orchestrationDrawingView: f.view, renderRange: scoped.renderRange});
  assert(recipe.samples.every(sample => sample.frame >= 160 && sample.frame < 166
    && sample.mediaFrame === sample.frame - 160
    && sample.references[0].layers[0].localFrame === sample.frame - 132));
  assert(recipe.samples.some(sample => sample.frame === 162 && sample.expectedState === 'maximum'));
  const args = buildPresentationCompositeArgumentsV001({baseMediaPath: '/fixture/range.nut', plan: scoped.resolvedPlan,
    overlayRecords: records, expectedFrameCount: 6, renderRange: scoped.renderRange});
  const filter = args[args.indexOf('-filter_complex') + 1];
  assert.match(filter, /\(N\+28\)/);
  assert.match(filter, /setpts=PTS\+0\/30\/TB/);
  assert.doesNotMatch(filter, /split=0/);
  assert.equal(args[args.indexOf('-frames:v') + 1], '6');
});

test('preview starting inside a motion caption preserves each remaining state and has range-only diagnostics', async t => {
  const f = await fixture(t), scoped = createOrchestrationRenderScopeV001(f.view, {startFrame: 269, endFrameExclusive: 275});
  const records = f.records.filter(record => record.element.instructionId === 'caption-2');
  const prepared = await preparePresentationNativeFrameQcV001({...f.options, plan: scoped.resolvedPlan,
    records, renderRange: scoped.renderRange});
  const recipe = buildPresentationNativeFrameQcRecipeV001({plan: scoped.resolvedPlan, baselinePlan: scoped.normalPlan,
    records: prepared.records, orchestrationDrawingView: f.view, renderRange: scoped.renderRange});
  const fullProgram = getPresentationCaptionMotionProgramV001({element: records[0].element, canvas: scoped.resolvedPlan.canvas});
  for (const sample of recipe.samples) {
    assert.equal(sample.expectedState, fullProgram.segments.find(segment => segment.startFrame <= sample.frame
      && segment.endFrameExclusive > sample.frame).state);
    assert.equal(sample.references[0].layers[0].localFrame, sample.frame - 264);
  }
  assert(recipe.samples.every(sample => sample.frame >= 269 && sample.frame < 275));
});

test('a connection-only black range has no fabricated caption or native reference', async t => {
  const f = await fixture(t), scoped = createOrchestrationRenderScopeV001(f.view, {startFrame: 123, endFrameExclusive: 127});
  assert.deepEqual(scoped.resolvedPlan.elements, []);
  const prepared = await preparePresentationNativeFrameQcV001({...f.options, plan: scoped.resolvedPlan,
    records: [], renderRange: scoped.renderRange});
  const recipe = buildPresentationNativeFrameQcRecipeV001({plan: scoped.resolvedPlan, baselinePlan: scoped.normalPlan,
    records: prepared.records, orchestrationDrawingView: f.view, renderRange: scoped.renderRange});
  assert.deepEqual(recipe, {sceneBindings: [], samples: []});
  assert.equal(f.drawCalls.length, 0);
  assert.throws(() => buildPresentationNativeQcAlternativeElementsV001({baselinePlan: scoped.normalPlan,
    plan: scoped.resolvedPlan, orchestrationDrawingView: f.view, presentationTimeline: null}), /drawing plans differ/);
});

test('native preparation binds the original Normal file and draws diagnostic Normal on the projected clock', async t => {
  const f = await fixture(t), before = jsonBytes(f.state), prepared = await preparePresentationNativeFrameQcV001(f.options);
  assert.equal(jsonBytes(f.state), before);
  const normalRef = prepared.provenance.inputRefs.find(row => row.role === 'baseline-plan');
  assert.equal(normalRef.path, f.source.planRef.path); assert.equal(normalRef.fileSha256, f.source.planRef.fileSha256);
  assert.equal(normalRef.canonicalSha256, hash(f.plan));
  assert.notEqual(normalRef.canonicalSha256, hash(f.view.projectedNormalPlan));
  assert.equal(prepared.records[2].alternates.find(row => row.kind === 'normal').element.startFrame, 264);
  assert.equal(prepared.records[2].alternates.find(row => row.kind === 'normal').element.endFrameExclusive, 364);
  assert.ok(prepared.provenance.inputRefs.some(row => row.role === 'orchestration-input'));
  assert.ok(!prepared.provenance.inputRefs.some(row => row.role === 'auto-input'));
  const proofRef = prepared.provenance.inputRefs.find(row => row.role === 'orchestration-input');
  const proof = JSON.parse(await readFile(proofRef.path, 'utf8')), restored = restoreOrchestrationDrawingViewEvidenceV001(proof);
  assert.equal(restored.viewSha256, f.view.viewSha256);
  assert.equal(restored.sourceContext.baselineRef.canonicalSha256, hash(f.plan));
  assert.equal(restored.resolvedPlan.elements[1].presentationPulse.anchorFrame, 162);
  assert.deepEqual(await readFile(f.source.planRef.path, 'utf8'), f.source.planBytes);
});

test('native recipe reconstructs projected Pulse and motion samples from durable proof', async t => {
  const f = await fixture(t), prepared = await preparePresentationNativeFrameQcV001(f.options);
  const proofRef = prepared.provenance.inputRefs.find(row => row.role === 'orchestration-input');
  const view = restoreOrchestrationDrawingViewEvidenceV001(JSON.parse(await readFile(proofRef.path, 'utf8')));
  const recipe = buildPresentationNativeFrameQcRecipeV001({plan: view.resolvedPlan, baselinePlan: view.projectedNormalPlan,
    records: prepared.records, orchestrationDrawingView: view});
  assert.deepEqual(recipe.samples.filter(row => row.instructionId === 'caption-1').map(row => row.frame),
    [157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168]);
  const motion = recipe.samples.filter(row => row.instructionId === 'caption-2');
  assert.equal(motion[0].frame, 264); assert.equal(motion[0].references[0].layers[0].localFrame, 0);
  assert.equal(motion.at(-1).frame, 359);
  assert.throws(() => buildPresentationNativeFrameQcRecipeV001({plan: view.resolvedPlan, baselinePlan: f.plan,
    records: prepared.records, orchestrationDrawingView: view}), /drawing plans differ/);
  const stale = clone(view.resolvedPlan); stale.elements[1].presentationPulse.anchorFrame = 150;
  assert.throws(() => buildPresentationNativeFrameQcRecipeV001({plan: stale, baselinePlan: view.projectedNormalPlan,
    records: prepared.records, orchestrationDrawingView: view}), /drawing plans differ/);
});

function syntheticNativeEvidence(f, prepared, range = null) {
  const view = f.view, scoped = createOrchestrationRenderScopeV001(view, range);
  const plan = scoped.resolvedPlan, baselinePlan = scoped.normalPlan, renderRange = scoped.renderRange;
  const proofRef = prepared.provenance.inputRefs.find(row => row.role === 'orchestration-input');
  const recipe = buildPresentationNativeFrameQcRecipeV001({plan, baselinePlan, records: prepared.records, orchestrationDrawingView: view, renderRange});
  return readFile(proofRef.path, 'utf8').then(text => {
    const orchestrationInput = JSON.parse(text);
    const refs = [...prepared.provenance.inputRefs,
      ...['base-media', 'completed-media', 'tool-ffmpeg', 'tool-imagemagick'].map(role => ({role, path: '/synthetic/' + role, fileSha256: sha(role)})),
      ...recipe.sceneBindings.flatMap(group => [...group.states, ...group.alternates]).map(row => ({role: 'png-' + row.bindingId,
        path: row.pngPath, fileSha256: row.pngSha256}))];
    const verified = refs.map(row => ({role: row.role, path: row.path, fileSha256: row.fileSha256}));
    const manifest = {planCanonicalSha256: hash(plan), baselinePlanCanonicalSha256: hash(baselinePlan),
      orchestrationInputCanonicalSha256: hash(orchestrationInput), inputRefs: refs, inputRefsCanonicalSha256: hash(refs),
      before: clone(verified), after: clone(verified)};
    const bindings = new Map(recipe.sceneBindings.flatMap(group => [...group.states, ...group.alternates]).map(row => [row.bindingId, row]));
    const samples = recipe.samples.map((sample, sampleIndex) => {
      const signatures = new Map();
      const references = sample.references.map(row => {
        const signature = canonicalJson(row.layers.map(layer => ({png: bindings.get(layer.bindingId).pngSha256,
          localFrame: layer.localFrame, displayFrameCount: layer.displayFrameCount})));
        if (!signatures.has(signature)) signatures.set(signature, signatures.size + 1);
        return {id: row.id, rgb: Buffer.alloc(sample.crop.width * sample.crop.height * 3, signatures.get(signature))};
      });
      const decision = classifyPresentationNativeFrameRgbV001({completedRgb: references[0].rgb, references});
      return {...sample, ...decision, baseFrame: {path: '/synthetic/base-' + sample.frame, fileSha256: sha('base-' + sample.frame)},
        completedFrame: {path: '/synthetic/completed-' + sample.frame, fileSha256: sha('completed-' + sample.frame)},
        completedRgb: {path: '/synthetic/completed-' + sample.frame + '.rgb', fileSha256: sha(references[0].rgb)},
        completedRgbSha256: sha(references[0].rgb), references: sample.references.map((row, index) => ({...row,
          ...decision.references[index], rgbPath: '/synthetic/reference-' + sampleIndex + '-' + index + '.rgb'}))};
    });
    return prepared.records.map(record => ({...clone(record.inspection), visibilityComparisonBasis: PRESENTATION_NATIVE_FRAME_QC_BASIS_V001,
      representativeFrame: renderRange !== null ? (() => {const local = samples.filter(sample => sample.instructionId === record.element.instructionId);
        return local[Math.floor(local.length / 2)].frame;})()
        : record.element.presentationPulse ? getPresentationPulseProgramV001({element: record.element, canvas: plan.canvas}).maximumFrame
        : record.element.presentationMotion ? getPresentationCaptionMotionProgramV001({element: record.element, canvas: plan.canvas}).representativeFrame
          : record.element.startFrame + Math.floor(record.element.displayFrameCount / 2),
      nativeFrameQc: {schemaVersion: PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001, instructionId: record.element.instructionId,
        baselinePlan: clone(baselinePlan), orchestrationInput, renderRange, sceneBindings: recipe.sceneBindings, inputManifest: manifest,
        samples: samples.filter(sample => sample.instructionId === record.element.instructionId)}}));
  });
}

test('range native evidence cannot pass as full coverage or move a sampled frame to another media origin', async t => {
  const f = await fixture(t), range = {startFrame: 160, endFrameExclusive: 166};
  const scoped = createOrchestrationRenderScopeV001(f.view, range);
  const prepared = await preparePresentationNativeFrameQcV001({...f.options, plan: scoped.resolvedPlan,
    records: [f.records[1]], renderRange: scoped.renderRange});
  const [inspection] = await syntheticNativeEvidence(f, prepared, range);
  const check = row => validatePresentationNativeFrameQcEvidenceV001({plan: scoped.resolvedPlan,
    inspection: row, renderRange: scoped.renderRange});
  assert.equal(check(inspection).status, 'passed');
  assert.equal(validatePresentationNativeFrameQcEvidenceV001({plan: scoped.resolvedPlan, inspection}).status, 'failed');
  const wrongOrigin = clone(inspection); wrongOrigin.nativeFrameQc.samples[0].mediaFrame++;
  assert.equal(check(wrongOrigin).status, 'failed');
  const globalAsLocal = clone(inspection);
  globalAsLocal.nativeFrameQc.samples[0].mediaFrame = globalAsLocal.nativeFrameQc.samples[0].frame;
  assert.equal(check(globalAsLocal).status, 'failed');
  const changedCoverage = clone(inspection); changedCoverage.nativeFrameQc.renderRange.endFrameExclusive++;
  assert.equal(check(changedCoverage).status, 'failed');
});

test('durable native evidence verifies independent original-file and display-plan hashes and rejects clock substitutions', async t => {
  const f = await fixture(t), prepared = await preparePresentationNativeFrameQcV001(f.options), inspections = await syntheticNativeEvidence(f, prepared);
  for (const inspection of inspections) {
    const checked = validatePresentationNativeFrameQcEvidenceV001({plan: f.view.resolvedPlan, inspection});
    assert.equal(checked.status, 'passed', JSON.stringify(checked));
  }
  const mutations = [row => {row.nativeFrameQc.baselinePlan = clone(f.plan);},
    row => {row.nativeFrameQc.samples[0].frame -= 12;},
    row => {row.nativeFrameQc.inputManifest.inputRefs.find(ref => ref.role === 'baseline-plan').canonicalSha256 = hash(f.view.projectedNormalPlan);},
    row => {row.nativeFrameQc.orchestrationInput.expectedViewSha256 = 'a'.repeat(64);},
    row => {row.nativeFrameQc.autoPresentation = {context: f.source.captionContext};}];
  for (const mutate of mutations) {
    const inspection = clone(inspections[1]); mutate(inspection);
    assert.equal(validatePresentationNativeFrameQcEvidenceV001({plan: f.view.resolvedPlan, inspection}).status, 'failed');
  }
});

test('renderer rejects fabricated views, old-clock plans, duplicate timelines and missing combined QC before drawing', async t => {
  const f = await fixture(t), calls = [];
  const options = {outputDirectory: path.join(f.directory, 'render'), plan: f.view.projectedNormalPlan,
    orchestrationDrawingView: f.view, expectedFrameCount: f.view.projection.displayFrameCount,
    counterfactualQcMethod: PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001,
    overlayAdapter: {renderStill: () => {calls.push('draw');}},
    processObserver: {run: () => {calls.push('process');}}};
  const changes = [{orchestrationDrawingView: clone(f.view)}, {plan: f.plan}, {baseTimeline: {}},
    {expectedFrameCount: 480}, {validatedLayoutInspection: {}}, {runCounterfactualQc: false},
    {autoPresentation: {context: f.source.captionContext}}, {effects: {}}];
  for (const change of changes) await assert.rejects(executeValidatedPresentationDrawAndQcV001({...options, ...change}), TypeError);
  assert.deepEqual(calls, []); assert.ok(!(await readdir(f.directory)).includes('render'));
});

test('renderer rejects changed original files and a background from another projection before media children', async t => {
  const f = await fixture(t), calls = [];
  const background = {projectionSha256: 'f'.repeat(64), displayFrameCount: f.view.projection.displayFrameCount,
    video: await f.save('background.mkv', 'background'), audio: await f.save('audio.m4a', 'AAC bytes')};
  const options = {outputDirectory: path.join(f.directory, 'render'), plan: f.view.projectedNormalPlan,
    orchestrationDrawingView: f.view, orchestrationBackground: background, baseMediaPath: background.video.path,
    expectedFrameCount: f.view.projection.displayFrameCount, counterfactualQcMethod: PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001,
    processObserver: {run: () => {calls.push('process');}}};
  await assert.rejects(executeValidatedPresentationDrawAndQcV001(options), /current projection/);
  await writeFile(f.source.timelineRef.path, 'changed original timeline');
  await assert.rejects(executeValidatedPresentationDrawAndQcV001(options), /original source bytes changed/);
  assert.deepEqual(calls, []);
});

test('compositor maps independent AAC after every finite PNG and overlays only on completed background', async t => {
  const f = await fixture(t), audio = path.join(f.directory, 'audio.m4a'), base = path.join(f.directory, 'background.mkv');
  const args = buildPresentationCompositeArgumentsV001({baseMediaPath: base, plan: f.view.resolvedPlan, overlayRecords: f.records,
    expectedFrameCount: f.view.projection.displayFrameCount, serializePngAndFilters: true, audioMediaPath: audio});
  const inputs = args.flatMap((value, index) => value === '-i' ? [args[index + 1]] : []);
  const maps = args.flatMap((value, index) => value === '-map' ? [args[index + 1]] : []);
  assert.equal(inputs[0], base); assert.equal(inputs.at(-1), audio);
  assert.equal(inputs.length, 16); // base + Color 1 + Pulse 5 + Shake 7 + Panel 1 + independent AAC
  assert.deepEqual(maps, ['[video]', '15:a:0']);
  assert.equal(args[args.indexOf('-c:a') + 1], 'copy');
  const filter = args[args.indexOf('-filter_complex') + 1];
  assert.ok(filter.includes('[0:v][overlay0]overlay=0:0'));
  assert.ok(filter.includes('setpts=PTS+132/30/TB')); assert.ok(filter.includes('setpts=PTS+264/30/TB'));
  assert.ok(!filter.includes('timelineVideo')); assert.ok(!filter.includes('color=black'));
  assert.throws(() => buildPresentationCompositeArgumentsV001({baseMediaPath: base, plan: f.view.resolvedPlan, overlayRecords: f.records,
    expectedFrameCount: 516, audioMediaPath: audio, presentationTimeline: f.view.projection.presentationTimeline}), /already resolved display clock/);
});

async function mockReplay(t, {modifyAudio = false} = {}) {
  const f = await fixture(t), files = {base: await f.save('background.mkv', 'background'),
    audio: await f.save('audio.m4a', 'original AAC'), completed: await f.save('completed.mp4', 'synthetic completed'),
    ffmpeg: await f.save('ffmpeg', 'synthetic ffmpeg executable'), ffprobe: await f.save('ffprobe', 'synthetic ffprobe executable')};
  const calls = [], frames = f.view.projection.displayFrameCount;
  const processObserver = {async run(command, args) {
    calls.push({command, args: clone(args)});
    let output;
    if (args.length === 1 && args[0] === '-version') output = 'synthetic-version\n';
    else if (args.includes('-progress')) {
      await writeFile(args.at(-1), 'synthetic completed', {flag: 'wx'});
      if (modifyAudio) await writeFile(files.audio.path, 'changed AAC');
      output = 'frame=' + frames + '\nprogress=end\n';
    } else if (args[args.indexOf('-select_streams') + 1] === 'v') output = JSON.stringify({streams: [{index: 0, codec_type: 'video',
      codec_name: 'h264', width: 1920, height: 1080, pix_fmt: 'yuv420p', r_frame_rate: '30/1', avg_frame_rate: '30/1',
      nb_frames: String(frames), time_base: '1/15360', start_pts: 0, duration_ts: frames * 512,
      sample_aspect_ratio: '1:1', display_aspect_ratio: '16:9', color_range: 'tv', color_space: 'bt709',
      color_transfer: 'bt709', color_primaries: 'bt709', chroma_location: 'left', field_order: 'progressive'}]});
    else throw new Error('unexpected synthetic process');
    return {code: 0, signal: null, stdout: Buffer.from(output), stderr: Buffer.alloc(0)};
  }};
  const result = await inspectPresentationExactReplayQcV001({plan: f.view.resolvedPlan, records: f.records,
    baseMediaPath: files.base.path, audioMediaPath: files.audio.path, completedMediaPath: files.completed.path,
    expectedFrameCount: frames, scratchDirectory: path.join(f.directory, 'exact-replay'),
    ffmpegPath: files.ffmpeg.path, ffprobePath: files.ffprobe.path, serializePngAndFilters: true, processObserver});
  return {f, files, result, calls};
}

test('exact replay binds independent AAC before/after and repeats the production input mapping', async t => {
  const {f, files, result, calls} = await mockReplay(t);
  assert.equal(result.status, 'passed', JSON.stringify(result.violations));
  assert.equal(calls.length, 5);
  const manifest = result.evidence.inputManifest, audio = manifest.refs.find(row => row.role === 'audio-media');
  assert.equal(audio.path, files.audio.path); assert.equal(audio.fileSha256, files.audio.fileSha256);
  assert.deepEqual(manifest.before.find(row => row.role === 'audio-media'), audio);
  assert.deepEqual(manifest.after.find(row => row.role === 'audio-media'), audio);
  assert.equal(result.evidence.compositorInput.audioMediaPath, files.audio.path);
  assert.deepEqual(result.evidence.compositorArguments, buildPresentationCompositeArgumentsV001({baseMediaPath: files.base.path,
    plan: f.view.resolvedPlan, overlayRecords: f.records, expectedFrameCount: f.view.projection.displayFrameCount,
    serializePngAndFilters: true, audioMediaPath: files.audio.path}));
  const tampered = clone(result.evidence);
  for (const key of ['refs', 'before', 'after']) tampered.inputManifest[key] = tampered.inputManifest[key].filter(row => row.role !== 'audio-media');
  tampered.inputManifest.refsCanonicalSha256 = hash(tampered.inputManifest.refs);
  const checked = validatePresentationExactReplayQcEvidenceV001({plan: f.view.resolvedPlan, evidence: tampered,
    expectedFrameCount: f.view.projection.displayFrameCount, currentCompletedMediaRef: result.evidence.completed});
  assert.equal(checked.status, 'failed'); assert.ok(checked.violations.some(row => /separate audio file/.test(row.reason)));
});

test('independent AAC mutation during exact replay fails even when output video bytes match', async t => {
  await assert.rejects(mockReplay(t, {modifyAudio: true}), /fixed input changed during exact replay: audio-media/);
});
