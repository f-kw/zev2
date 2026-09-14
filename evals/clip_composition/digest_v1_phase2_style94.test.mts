import assert from 'node:assert/strict';
import {test} from 'node:test';
import path from 'node:path';
import {derivePhase294Style, validatePhase294Style, validatePhase294Plan} from './digest_v1_phase2_style94.mts';
import {ROOT, readJson, readBound, fileSha, publish, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';

const root = 'evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001';
const preflight = await readJson(`${root}/style-94-v001/preflight.json`);
const bridge = await readBound(preflight.bridgeBinding);
const parentPreflight = await readBound(preflight.parentPreflightBinding);
const source = await readBound(parentPreflight.styleBinding);
const applied = await readBound(preflight.styleBinding);
const originalPlan = await readBound(parentPreflight.planBinding);
const appliedPlan = await readBound(preflight.planBinding);
const profileId = bridge.instructionArtifact.styleProfileId;
const cases: Json[] = [];
test('正式派生styleは元styleの文字サイズ1項目だけを変更する', () => {
  assert.deepEqual(derivePhase294Style(source, profileId), applied);
  validatePhase294Style(source, applied, profileId);
  validatePhase294Plan(originalPlan, appliedPlan);
  cases.push({name: 'formal-derived-style-and-common-plan', status: 'passed'});
});
const styleMutations: [string, (value: Json) => void][] = [
  ['旧95px', v => {v.presets[0].visualStates[0].textStyle.fontSizePx = 95;}],
  ['未承認93px', v => {v.presets[0].visualStates[0].textStyle.fontSizePx = 93;}],
  ['書体', v => {v.fontAssets[0].fileName += '-changed';}],
  ['縁取り', v => {v.presets[0].visualStates[0].textStyle.borderWidthPx += 1;}],
  ['glow', v => {v.presets[0].visualStates[0].textStyle.glowWidthPx -= 1;}],
  ['行間隔', v => {v.presets[0].visualStates[0].textStyle.lineSpacingPercent += 1;}],
  ['配置', v => {v.presets[0].visualStates[0].position.offsetXPercent += 1;}],
  ['safe area', v => {v.canvas.safeAreaPx.right -= 1;}],
  ['行上限', v => {v.presets[0].visualStates[0].layout.maxCharsPerLine += 1;}],
  ['transition', v => {v.transitions[0].entry.frames += 1;}],
  ['別stateの変更', v => {v.presets[0].visualStates[1].textStyle.fontSizePx -= 1;}],
];
for (const [name, mutate] of styleMutations) test(`派生styleの${name}改変を拒否する`, () => {
  const value = structuredClone(applied); mutate(value);
  assert.throws(() => validatePhase294Style(source, value, profileId));
  cases.push({name: `style-${name}`, status: 'passed', invalidInput: 'rejected'});
});
const planMutations: [string, (value: Json) => void][] = [
  ['本文', v => {v.elements[0].text += '変更';}],
  ['正式ID', v => {v.elements[0].targetProvenance.sourceAtomIds[0] += '-changed';}],
  ['順序', v => {v.elements.reverse();}],
  ['改行', v => {v.elements[0].indexedLines[0].renderedText += '変更';}],
  ['字幕時刻', v => {v.elements[0].endFrameExclusive += 1;}],
  ['font weight', v => {v.layoutRules.fontWeight += 1;}],
  ['canvas', v => {v.canvas.width += 1;}],
];
for (const [name, mutate] of planMutations) test(`描画計画の${name}改変を拒否する`, () => {
  const value = structuredClone(appliedPlan); mutate(value);
  assert.throws(() => validatePhase294Plan(originalPlan, value));
  cases.push({name: `plan-${name}`, status: 'passed', invalidInput: 'rejected'});
});
test('正式layout325件合格と改変拒否検査を実装へ束縛して保存する', async () => {
  const layout = await readBound(preflight.layoutBinding);
  assert.equal(layout.status, 'passed');
  assert.equal(layout.items.length, 325);
  assert.deepEqual(layout.violations, []);
  assert.equal(cases.length, 1 + styleMutations.length + planMutations.length);
  assert(cases.every(v => v.status === 'passed'));
  const testPath = 'evals/clip_composition/digest_v1_phase2_style94.test.mts';
  await publish(`${root}/style-94-v001/tests.json`, {schemaVersion: 'digest-v1-phase2-style94-tests-v001', status: 'passed', cases,
    implementationBinding: preflight.implementationBinding,
    testImplementationBinding: {path: testPath, fileSha256: await fileSha(path.join(ROOT, testPath))},
    styleBinding: preflight.styleBinding, layoutBinding: preflight.layoutBinding,
    layoutCaptionCount: layout.items.length, rendererStarted: false});
});
