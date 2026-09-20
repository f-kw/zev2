import {getPresentationPanelPresetV002} from './presentation_panel_presets_v002.mjs';
/** Prepare one approved 32-caption Digest without choosing any expression. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {inspectPresentationRenderLayoutV001} from './inspect_presentation_render_layout_v001.js';
import {buildPresentationRendererOverlayAdapterV001} from './render_presentation_v002.mjs';
import {PRESENTATION_EFFECT_TRIAL_PRESETS_V001} from './presentation_effects_v001.mjs';
import {PRESENTATION_PULSE_PRESET_V001, assertPresentationPulseAnchorsV001} from './presentation_pulse_v001.mjs';
import {PRESENTATION_CAPTION_MOTION_PRESETS_V001, getPresentationCaptionMotionProgramV001,
  buildPresentationCaptionMotionStateElementsV001, assertPresentationCaptionMotionLayoutsV001}
  from './presentation_caption_motion_v001.mjs';

type Json = Record<string, any>;
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = async (p: string) => JSON.parse(await readFile(p, 'utf8'));
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const bind = async (p: string) => ({path: path.resolve(p), fileSha256: sha(await readFile(p))});
const save = (p: string, v: unknown) => writeFile(p, JSON.stringify(v, null, 2) + '\n', {flag: 'wx'});
const observedFields = ['text', 'indexedLines', 'startFrame', 'endFrameExclusive', 'displayFrameCount', 'targetProvenance'];

export async function prepareCaptionExpressionStage1V001({outputDirectory, baselinePath, contextPath}: {
  outputDirectory: string; baselinePath: string; contextPath: string;
}) {
  const out = path.resolve(outputDirectory);
  const baselineBytes = await readFile(baselinePath), contextBytes = await readFile(contextPath);
  const plan = JSON.parse(baselineBytes.toString('utf8')), oldContext = JSON.parse(contextBytes.toString('utf8'));
  assert.equal(plan.schemaVersion, 'presentation-output-common-core-plan-v001');
  assert.equal(plan.elements.length, 32, 'This preparation is scoped to the approved 32-caption Digest');
  assert(plan.elements.every((e: Json) => e.kind === 'speech-caption'));
  assert.deepEqual([plan.canvas.width, plan.canvas.height, plan.canvas.fps], [1920, 1080, 30]);
  assert.equal(Math.max(...plan.elements.map((e: Json) => e.endFrameExclusive)), 4831);
  assert.deepEqual(oldContext.captionContextIds.map((r: Json) => r.captionId), plan.elements.map((e: Json) => e.instructionId));
  for (const element of plan.elements) {
    for (const key of ['presentationColorRange', 'presentationPreset', 'presentationPulse', 'presentationMotion']) {
      assert(!Object.hasOwn(element, key), 'The fixed input must be the unchanged Normal plan');
    }
  }
  const registryPath = path.join(repo, 'evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json');
  const registry = await read(registryPath);
  const fonts = registry.fontAssets.filter((font: Json) => plan.elements.some((e: Json) => e.visualState.textStyle.fontAssetId === font.fontAssetId));
  assert.equal(fonts.length, new Set(plan.elements.map((e: Json) => e.visualState.textStyle.fontAssetId)).size);
  for (const font of fonts) assert.equal(sha(await readFile(path.join(repo, font.path))), font.sha256);
  const adapter = buildPresentationRendererOverlayAdapterV001({
    remotionPath: path.join(repo, 'runner/node_modules/@remotion/cli/remotion-cli.js'),
    chromiumPath: path.join(repo, 'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell'),
    processObserver: {run: async () => {throw new Error('Input preparation only measures existing native font layout');}},
  });
  await mkdir(out);
  await mkdir(path.join(out, 'feasibility'));
  const copiedBaseline = path.join(out, 'normal-plan.json');
  await writeFile(copiedBaseline, baselineBytes, {flag: 'wx'});
  const sourcePaths = [baselinePath, contextPath, registryPath, fileURLToPath(import.meta.url),
    ...['presentation_effects_v001.mjs', 'presentation_pulse_v001.mjs', 'presentation_caption_motion_v001.mjs',
      'render_presentation_v002.mjs', 'inspect_presentation_render_layout_v001.ts', 'presentation_renderer_entry_v001.tsx',
      'presentation_renderer_text_layout_v001.mjs'].map(p => path.join(repo, 'evals/clip_composition', p)),
    ...['runner/src/remotion/components/TelopText.tsx', 'runner/src/remotion/utils/telop-font.ts',
      'runner/src/telop/text-metrics.ts', 'runner/src/telop/telop-render-model.ts', 'runner/src/telop/telop-line-break.ts'].map(p => path.join(repo, p)),
    ...fonts.flatMap((font: Json) => [path.join(repo, font.path), path.join(repo, font.licensePath)])];
  const sourceRefs = await Promise.all(sourcePaths.map(bind));
  const inspect = (elements: Json[]) => {
    for (const element of elements) {
      const original = plan.elements.find((e: Json) => e.instructionId === element.instructionId);
      assert(original);
      for (const key of observedFields) assert.deepEqual(element[key], original[key], key);
      assert.deepEqual(element.visualState.layout, original.visualState.layout);
    }
    const overlays = elements.map(element => adapter.buildProps(element, plan, registry));
    const input = {canvas: structuredClone(plan.canvas), overlays};
    const result = inspectPresentationRenderLayoutV001(input);
    assert.equal(result.items.length, elements.length);
    return {input, result};
  };
  const summaries: Json[] = [], observations: Json[] = [], evidenceRefs: Json[] = [];
  const layouts = new Map<string, Json>();
  const recordGroup = async (name: string, elements: Json[]) => {
    const value = inspect(elements);
    const rows = elements.map(element => ({captionId: element.instructionId,
      layout: value.result.items.find((row: Json) => row.instructionId === element.instructionId),
      violations: value.result.violations.filter((v: Json) => v.instructionId === element.instructionId)}));
    assert(rows.every(row => row.layout));
    const p = path.join(out, 'feasibility', name + '.json');
    await save(p, {schemaVersion: 'stage1-native-layout-group-v001', name, sourceRefs, ...value, rows});
    evidenceRefs.push(await bind(p));
    layouts.set(name, {rows, ref: await bind(p)});
    return rows;
  };
  const pushSummary = async (name: string, rows: Json[]) => {
    const unavailable = rows.filter(row => row.violations.length > 0).map(row => row.captionId);
    const p = path.join(out, 'feasibility', name + '-summary.json');
    const summary = {schemaVersion: 'stage1-preset-feasibility-v001', name, sourceRefs, rows,
      captionCount: 32, availableCount: 32 - unavailable.length, unavailable,
      meaningSelection: false, changesToTextOrTimes: false};
    await save(p, summary); evidenceRefs.push(await bind(p)); summaries.push(summary);
    if (unavailable.length > 0) observations.push({observationId: 'stage1-' + name + '-physical-unrepresentable',
      kind: name + '-unrepresentable', captionIds: unavailable,
      description: name + ' の固定状態すべてについて、確定本文・改行・字幕期間を変えずに、実フォントの配置、安全域、行間と所定の移動を検査しました。列挙字幕では固定期間または配置が成立しません。縮小・再改行・時刻変更で補正しません。意味上の採否を示す記録ではありません。'});
    process.stdout.write(name + ': ' + (32 - unavailable.length) + '/32 physically available\n');
  };
  const normalRows = await recordGroup('normal', plan.elements);
  assert(normalRows.every(row => row.violations.length === 0), 'The unchanged Normal input must fit');
  for (const kind of ['scale', 'panel']) {
    const elements = plan.elements.map((element: Json) => {
      const value = structuredClone(element);
      if (kind === 'scale') Object.assign(value.visualState.textStyle, PRESENTATION_EFFECT_TRIAL_PRESETS_V001.reaction);
      else {
        Object.assign(value.visualState.textStyle, getPresentationPanelPresetV002('provisional-panel').textStyle);
        value.visualState.background = structuredClone(getPresentationPanelPresetV002('provisional-panel').background);
      }
      assert.deepEqual(value.visualState.position, element.visualState.position);
      return value;
    });
    await pushSummary(kind, await recordGroup(kind, elements));
  }
  const pulseSizes = [['normal', PRESENTATION_PULSE_PRESET_V001.normalFontSizePx],
    ['middle', PRESENTATION_PULSE_PRESET_V001.middleFontSizePx], ['maximum', PRESENTATION_PULSE_PRESET_V001.maximumFontSizePx]] as const;
  for (const [state, size] of pulseSizes) {
    if (state === 'normal') layouts.set('pulse-normal', layouts.get('normal')!);
    else if (state === 'maximum') layouts.set('pulse-maximum', layouts.get('scale')!);
    else await recordGroup('pulse-' + state, plan.elements.map((element: Json) => ({...element,
      visualState: {...element.visualState, textStyle: {...element.visualState.textStyle, fontSizePx: size}}})));
  }
  const pulseRows = plan.elements.map((element: Json, index: number) => {
    const states = pulseSizes.map(([state]) => ({state, ...layouts.get('pulse-' + state)!.rows[index]}));
    const violations = states.flatMap(row => row.violations);
    try {assertPresentationPulseAnchorsV001(states.map(row => row.layout));}
    catch (error) {
      if (!(error instanceof TypeError) || !error.message.startsWith('Pulse Accent:')) throw error;
      violations.push({code: 'PULSE_FIXED_ANCHOR_VIOLATION', reason: error.message});
    }
    return {captionId: element.instructionId, states, violations};
  });
  await pushSummary('pulse', pulseRows);
  for (const kind of ['bounce', 'shake'] as const) {
    const preset = PRESENTATION_CAPTION_MOTION_PRESETS_V001[kind];
    const rows = [];
    for (const original of plan.elements) {
      const element = {...original, presentationMotion: {presentation: preset.presentation, presetVersion: preset.version}};
      const violations: Json[] = []; let program, states, measured;
      try {
        program = getPresentationCaptionMotionProgramV001({element, canvas: plan.canvas});
        states = buildPresentationCaptionMotionStateElementsV001({element, canvas: plan.canvas});
        // The same caption ID occurs once per independent layout measurement.
        measured = states.map((state: Json) => ({state: state.state, ...inspect([state.element])}));
        violations.push(...measured.flatMap((state: Json) => state.result.violations.map((v: Json) => ({...v, state: state.state}))));
        assertPresentationCaptionMotionLayoutsV001({element, canvas: plan.canvas,
          layoutItems: measured.map((state: Json) => state.result.items[0])});
        assert.deepEqual(states[0].element, original, 'Stable state must be the unchanged fixed caption');
      } catch (error) {
        if (!(error instanceof TypeError) || !error.message.startsWith('Caption motion:')) throw error;
        violations.push({code: 'CAPTION_MOTION_UNREPRESENTABLE', reason: error.message});
      }
      rows.push({captionId: original.instructionId, program: program ?? null, states: measured ?? null, violations});
    }
    await pushSummary(kind, rows);
  }
  const layoutKinds = ['scale-unrepresentable', 'panel-unrepresentable', 'pulse-unrepresentable', 'bounce-unrepresentable', 'shake-unrepresentable'];
  const retainedEvidence = oldContext.evidenceRefs.filter((ref: Json) => !ref.path.includes('/feasibility/'));
  for (const ref of [...retainedEvidence, oldContext.digestAudioSourceRef]) assert.deepEqual(await bind(ref.path), ref);
  const context = {...structuredClone(oldContext),
    observations: [...oldContext.observations.filter((o: Json) => !layoutKinds.includes(o.kind)), ...observations],
    evidenceRefs: [...retainedEvidence, ...evidenceRefs]};
  for (const key of ['digestId', 'productionPurpose', 'contexts', 'captionContextIds', 'digestAudioSourceRef']) {
    assert.deepEqual(context[key], oldContext[key]);
  }
  const savedContext = path.join(out, 'context.json');
  await save(savedContext, context);
  for (const ref of sourceRefs) assert.deepEqual(await bind(ref.path), ref, 'Input or measured implementation changed during preparation');
  assert.deepEqual(await readFile(copiedBaseline), baselineBytes);
  const result = {schemaVersion: 'stage1-real-input-preparation-v001', status: 'passed', sourceRefs,
    normalPlanRef: await bind(copiedBaseline), contextRef: await bind(savedContext), evidenceRefs,
    captionCount: 32, expectedFrameCount: 4831, meaningSelection: false, previousSelectionsRead: false,
    semanticContextsUnchanged: true, fixedNormalPlanBytesUnchanged: true, renderingExecuted: false,
    availability: summaries.map(summary => ({preset: summary.name, available: summary.availableCount, unavailable: summary.unavailable}))};
  await save(path.join(out, 'preparation.json'), result);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [outputDirectory, baselinePath, contextPath] = process.argv.slice(2);
  if (!outputDirectory || !baselinePath || !contextPath) throw new Error('usage: stage1-prepare new-output-directory fixed-normal-plan.json saved-context.json');
  await prepareCaptionExpressionStage1V001({outputDirectory, baselinePath, contextPath});
}
