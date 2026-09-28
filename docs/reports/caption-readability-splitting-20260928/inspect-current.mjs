/** 7A read-only inventory and executable reproduction of the finite-size guard. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {getPresentationCaptionMotionProgramV001} from '../../../evals/clip_composition/presentation_caption_motion_v001.mjs';
import {getPresentationPulseProgramV001} from '../../../evals/clip_composition/presentation_pulse_v001.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const output = 'evals/clip_composition/outputs/presentation/new-material-digest-20260926-first-draft-qc-resume-v001';
const runtime = 'runtime/artifacts/digest-new-material-20260926-v001';
const refs = [];
async function read(file) {
  const bytes = await readFile(path.join(root, file));
  refs.push({path: file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex')});
  return JSON.parse(bytes);
}
const plan = await read(`${output}/presentation-render-plan-v002.json`);
const baseline = await read(`${runtime}/caption-attempt-003/normal-plan.json`);
const meaning = await read(`${runtime}/caption-attempt-003/meaning-input.json`);
const layout = await read(`${runtime}/presentation/feasibility/normal.json`);
const registry = await read('evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json');
const atoms = new Map(meaning.atomOccurrences.map(a => [a.atomOccurrenceId, a]));
assert.equal(plan.elements.length, 326);
const counts = {};
for (const e of plan.elements) {
  const kind = e.presentationMotion?.presentation === 'provisional-bounce' ? 'Bounce'
    : e.presentationMotion ? 'Shake' : e.presentationPulse ? 'Pulse'
    : e.visualState.background ? 'Panel' : e.presentationColorRange ? 'Color'
    : e.visualState.textStyle.fontSizePx !== 96 ? 'Scale' : 'Normal';
  counts[kind] = (counts[kind] ?? 0) + 1;
}
const ids = ['000053', '000026', '000089', '000260', '000137', '000135', '000095', '000263', '000092'];
const representatives = ids.map(id => {
  const e = plan.elements.find(e => e.instructionId.endsWith(id)); assert(e);
  const source = e.targetProvenance.sourceAtomIds.map(id => atoms.get(id));
  assert(source.every(Boolean));
  return {id: e.instructionId, text: e.text, lines: e.indexedLines.map(l => l.text),
    startFrame: e.startFrame, endFrameExclusive: e.endFrameExclusive,
    displaySeconds: e.displayFrameCount / 30, codePoints: Array.from(e.text).length,
    displayedCodePointsPerSecond: Array.from(e.text).length / (e.displayFrameCount / 30),
    sourceAtoms: source.map(a => ({id: a.atomOccurrenceId, text: a.text, spans: a.retainedSpans})),
    savedNodeLayoutEstimate: layout.rows.find(r => r.captionId === e.instructionId)?.layout,
    color: e.presentationColorRange ?? null, motion: e.presentationMotion ?? null,
    background: e.visualState.background};
});
const checks = [];
for (const presentation of ['provisional-bounce', 'provisional-shake']) {
  const original = plan.elements.find(e => e.presentationMotion?.presentation === presentation);
  const originalBytes = JSON.stringify(original);
  const current = getPresentationCaptionMotionProgramV001({element: original, canvas: plan.canvas});
  const candidate = structuredClone(original); candidate.visualState.textStyle.fontSizePx = 144;
  let rejection;
  try {getPresentationCaptionMotionProgramV001({element: candidate, canvas: plan.canvas});}
  catch (error) {rejection = error.message;}
  assert.match(rejection ?? '', /unchanged 96 px normal caption/);
  assert.equal(JSON.stringify(original), originalBytes);
  checks.push({presentation, captionId: original.instructionId, currentAccepted: true,
    currentSegmentCount: current.segments.length, proposedFontSizePx: 144, rejection});
}
// This Digest has no Pulse; use a declared synthetic timing fixture, not a saved observation.
const pulse = structuredClone(baseline.elements[0]);
pulse.startFrame = 0; pulse.endFrameExclusive = 90; pulse.displayFrameCount = 90;
pulse.presentationPulse = {presentation: 'provisional-pulse', anchorPeakId: '7a-synthetic-guard-only', anchorFrame: 30};
getPresentationPulseProgramV001({element: pulse, canvas: baseline.canvas});
pulse.visualState.textStyle.fontSizePx = 144;
let pulseRejection;
try {getPresentationPulseProgramV001({element: pulse, canvas: baseline.canvas});}
catch (error) {pulseRejection = error.message;}
assert.match(pulseRejection ?? '', /unchanged 96 px normal caption/);
checks.push({presentation: 'provisional-pulse', fixture: 'synthetic; no saved Pulse in this Digest',
  currentAccepted: true, proposedFontSizePx: 144, rejection: pulseRejection});
console.log(JSON.stringify({schemaVersion: 'caption-readability-current-inspection-v001',
  observedAt: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(),
  status: 'inspection-passed-adoption-not-performed', refs, fonts: registry.fontAssets,
  captions: plan.elements.length, lineCounts: {one: plan.elements.filter(e => e.indexedLines.length === 1).length,
    two: plan.elements.filter(e => e.indexedLines.length === 2).length}, effectCounts: {...counts, Pulse: counts.Pulse ?? 0},
  normalStyle: baseline.elements[0].visualState, canvas: baseline.canvas, layoutRules: baseline.layoutRules,
  representatives, contractChecks: checks, productionChanged: false, rasterRendered: false,
  speechPaceVerifiedByAudio: false}, null, 2));
