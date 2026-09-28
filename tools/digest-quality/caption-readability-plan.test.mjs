import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildCaptionReadabilityPlanV001, restoreCaptionReadabilityPlanV001,
  captionReadabilityPlanSha256V001, captionReadabilityMeasurementContextSha256V001} from './caption-readability-plan.mjs';
import {indexExplicitLinesV001, PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001}
  from '../../evals/clip_composition/presentation_renderer_text_layout_v001.mjs';

const clone = structuredClone;
function fixture({effect = {kind: 'normal'}, required = false, end = 100, widths = [120, 240, 120]} = {}) {
  const text = '赤い犬が走る';
  const atoms = [{atomId: 'a', text: '赤い犬が', startFrame: 10, endFrameExclusive: 50,
    sourceStartMs: 1000, sourceEndMs: 2000, timelineSegmentId: 'source-segment'},
  {atomId: 'b', text: '走る', startFrame: 50, endFrameExclusive: end,
    sourceStartMs: 2000, sourceEndMs: 4000, timelineSegmentId: 'source-segment'}];
  const normalPlan = {schemaVersion: 'presentation-output-common-core-plan-v001',
    canvas: {width: 1920, height: 1080, fps: 30},
    layoutRules: {characterWidthRule: PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001},
    elements: [{instructionId: 'caption', kind: 'speech-caption', text,
      indexedLines: indexExplicitLinesV001([text]).indexedLines,
      startFrame: 10, endFrameExclusive: end, displayFrameCount: end - 10,
      sourceStartMs: 1000, sourceEndMs: 4000, timelineSegmentId: 'source-segment',
      visualState: {textStyle: {fontSizePx: 144, borderWidthPx: 4}, layout: {maxLines: 2, maxCharsPerLine: 36}},
      transition: {entry: {type: 'alpha-fade', frames: 4}, exit: {type: 'alpha-fade', frames: 4}},
      targetProvenance: {sourceAtomIds: ['a', 'b']}}]};
  const evidence = {schemaVersion: 'caption-readability-evidence-v001',
    sourcePlanSha256: captionReadabilityPlanSha256V001(normalPlan), clockId: 'source-grounded-output-30fps', maxWidthPx: 180,
    captions: [{captionId: 'caption', measurementContextSha256: captionReadabilityMeasurementContextSha256V001(normalPlan, 'caption'),
      atoms, boundaries: [{atomEndIndexExclusive: 1, frame: 50, kind: 'semantic', reason: '既存の主語句と述語句の境界判断', required}],
      measurements: [{startAtomIndex: 0, endAtomIndexExclusive: 1, singleLineWidthPx: widths[0], twoLine: null},
        {startAtomIndex: 0, endAtomIndexExclusive: 2, singleLineWidthPx: widths[1], twoLine: null},
        {startAtomIndex: 1, endAtomIndexExclusive: 2, singleLineWidthPx: widths[2], twoLine: null}], effect}]};
  return {normalPlan, evidence};
}
const build = f => buildCaptionReadabilityPlanV001(f);
const bind = f => {
  f.evidence.sourcePlanSha256 = captionReadabilityPlanSha256V001(f.normalPlan);
  f.evidence.captions.forEach(c => c.measurementContextSha256 = captionReadabilityMeasurementContextSha256V001(f.normalPlan, c.captionId));
};

test('measured overflow splits at explicit source clock, preserving every multi-character atom and original envelope', () => {
  const f = fixture(), input = clone(f), saved = build(f);
  assert.deepEqual(f, input);
  assert.deepEqual(saved.normalPlan.elements.map(e => e.text), ['赤い犬が', '走る']);
  assert.deepEqual(saved.normalPlan.elements.map(e => [e.startFrame, e.endFrameExclusive]), [[10, 50], [50, 100]]);
  assert.deepEqual(saved.normalPlan.elements.flatMap(e => e.targetProvenance.sourceAtomIds), ['a', 'b']);
  assert.deepEqual(saved.normalPlan.elements.flatMap(e => e.indexedLines.flatMap(l => l.sourceUnitIds)), ['a', 'b']);
  assert.deepEqual(saved.normalPlan.elements.map(e => [e.sourceStartMs, e.sourceEndMs, e.timelineSegmentId]),
    [[1000, 2000, 'source-segment'], [2000, 4000, 'source-segment']]);
  assert(saved.normalPlan.elements.every(e => e.visualState.textStyle.fontSizePx === 144));
  assert.equal(saved.summary.splitParents, 1);
  assert.equal(saved.humanQuality, 'not-evaluated');
});

test('one line is preferred to an explicit two-line exception when a supported split exists', () => {
  const f = fixture();
  f.evidence.captions[0].measurements[1].twoLine = {lines: ['赤い犬が', '走る'], widthsPx: [120, 120], reason: '比較候補'};
  assert.equal(build(f).summary.twoLineCaptions, 0);
  assert.equal(build(f).summary.outputCaptions, 2);
});

test('two lines require a reason and are used only when no one-line partition is feasible', () => {
  const f = fixture(); f.evidence.captions[0].boundaries = [];
  f.evidence.captions[0].measurements = [f.evidence.captions[0].measurements[1]];
  assert.throws(() => build(f), /no source-grounded/);
  f.evidence.captions[0].measurements[0].twoLine = {lines: ['赤い犬が', '走る'], widthsPx: [120, 120], reason: '意味単位をこれ以上分けない既存判断'};
  const saved = build(f);
  assert.equal(saved.summary.twoLineCaptions, 1);
  assert.equal(saved.normalPlan.elements[0].instructionId, 'caption');
  f.evidence.captions[0].measurements[0].twoLine.reason = '';
  assert.throws(() => build(f), /reason/);
});

test('fitting text is unchanged by duration alone; a grounded required gap boundary follows slower phrase delivery', () => {
  const normal = fixture({widths: [120, 160, 120]});
  const slow = fixture({widths: [120, 160, 120], end: 900});
  assert.equal(build(normal).summary.splitParents, 0);
  assert.equal(build(slow).summary.splitParents, 0);
  slow.evidence.captions[0].atoms[0].endFrameExclusive = 40;
  slow.evidence.captions[0].atoms[0].sourceEndMs = 1800;
  Object.assign(slow.evidence.captions[0].boundaries[0], {kind: 'source-gap', required: true, reason: '保存発話間隔にある既存の意味境界'});
  const saved = build(slow);
  assert.equal(saved.summary.splitParents, 1);
  assert.deepEqual(saved.normalPlan.elements.map(e => [e.startFrame, e.endFrameExclusive]), [[10, 50], [50, 900]]);
});

test('partial Color transfers into exactly one child with the same literal range', () => {
  const f = fixture({effect: {kind: 'color', range: {startCodePoint: 4, endCodePointExclusive: 6}}});
  const saved = build(f), mapping = saved.effectMappings[0];
  assert.deepEqual(mapping, {parentCaptionId: 'caption', childCaptionId: 'caption-readability-02', kind: 'color',
    range: {startCodePoint: 0, endCodePointExclusive: 2}});
  assert.equal(saved.effectMappings.length, 1);
  assert.equal([...saved.normalPlan.elements[1].text].slice(mapping.range.startCodePoint, mapping.range.endCodePointExclusive).join(''), '走る');
});

test('Color target crossing a required boundary is rejected; no color replication or target truncation', () => {
  const f = fixture({effect: {kind: 'color', range: {startCodePoint: 2, endCodePointExclusive: 5}}, required: true});
  assert.throws(() => build(f), /cuts the Color target/);
  f.evidence.captions[0].boundaries[0].required = false;
  assert.throws(() => build(f), /no source-grounded/);
  f.evidence.captions[0].measurements[1].singleLineWidthPx = 160;
  assert.equal(build(f).summary.splitParents, 0);
});

for (const kind of ['panel', 'scale', 'pulse', 'bounce', 'shake']) {
  test(kind + ' is never split, duplicated, or silently shrunk', () => {
    const f = fixture({effect: {kind}});
    assert.throws(() => build(f), /presentation overflow/);
    f.evidence.captions[0].measurements[1].singleLineWidthPx = 170;
    const saved = build(f);
    assert.equal(saved.summary.splitParents, 0);
    assert.deepEqual(saved.effectMappings, [{parentCaptionId: 'caption', childCaptionId: 'caption', kind}]);
    assert.deepEqual(saved.normalPlan.elements[0].transition, f.normalPlan.elements[0].transition);
    f.evidence.captions[0].boundaries[0].required = true;
    assert.throws(() => build(f), /unsplit caption/);
  });
}

for (const [name, mutate, match] of [
  ['missing atom time', f => delete f.evidence.captions[0].atoms[0].startFrame, /source atom/],
  ['missing source milliseconds', f => delete f.evidence.captions[0].atoms[0].sourceStartMs, /source atom/],
  ['missing parent source binding', f => {f.normalPlan.elements[0].sourceStartMs = null; bind(f);}, /source range\/segment/],
  ['wrong parent source binding', f => {f.normalPlan.elements[0].sourceEndMs++; bind(f);}, /source range\/segment/],
  ['crossing source segment', f => f.evidence.captions[0].atoms[1].timelineSegmentId = 'other', /source atom/],
  ['wrong source text', f => f.evidence.captions[0].atoms[0].text = '青い犬が', /source atom identity/],
  ['wrong source ID', f => f.evidence.captions[0].atoms[1].atomId = 'other', /source atom identity/],
  ['outer start changed', f => f.evidence.captions[0].atoms[0].startFrame++, /outer clocks/],
  ['outer end changed', f => f.evidence.captions[0].atoms[1].endFrameExclusive--, /outer clocks/],
  ['invented proportional clock', f => f.evidence.captions[0].boundaries[0].frame = 70, /next source atom/],
  ['missing reason', f => f.evidence.captions[0].boundaries[0].reason = '', /boundary is malformed/],
  ['unobserved gap', f => f.evidence.captions[0].boundaries[0].kind = 'source-gap', /no measured gap/],
  ['missing width', f => f.evidence.captions[0].measurements.pop(), /missing actual-width/],
  ['duplicate measurement', f => f.evidence.captions[0].measurements.push(clone(f.evidence.captions[0].measurements[0])), /duplicate measured/],
  ['nonfinite width', f => f.evidence.captions[0].measurements[0].singleLineWidthPx = NaN, /measured span/],
  ['hidden caption', f => f.evidence.captions = [], /coverage/],
  ['unknown effect', f => f.evidence.captions[0].effect.kind = 'hide', /unknown presentation/],
  ['stale font measurement', f => {f.normalPlan.elements[0].visualState.textStyle.fontSizePx = 160; f.evidence.sourcePlanSha256 = captionReadabilityPlanSha256V001(f.normalPlan);}, /measurement context/],
]) test(name + ' is rejected before any rendering', () => {
  const f = fixture(); mutate(f); assert.throws(() => build(f), match);
});

test('a valid atom boundary inside a grapheme is not a permissible display boundary', () => {
  const f = fixture(); f.normalPlan.elements[0].text = 'e\u0301';
  f.normalPlan.elements[0].indexedLines = indexExplicitLinesV001(['e\u0301']).indexedLines;
  f.evidence.captions[0].atoms[0].text = 'e'; f.evidence.captions[0].atoms[1].text = '\u0301'; bind(f);
  assert.throws(() => build(f), /grapheme boundary/);
});

test('new pieces must fit the original fade envelopes; original short captions are not retimed', () => {
  const f = fixture(); f.evidence.captions[0].atoms[0].endFrameExclusive = 12;
  f.evidence.captions[0].atoms[1].startFrame = 12; f.evidence.captions[0].boundaries[0].frame = 12;
  assert.throws(() => build(f), /no source-grounded/);
  f.evidence.captions[0].measurements[1].singleLineWidthPx = 150;
  assert.equal(build(f).summary.splitParents, 0);
});

test('restore recomputes all source, effect, measurement and clock decisions; tampering cannot reuse a pass', () => {
  const f = fixture(), saved = JSON.parse(JSON.stringify(build(f)));
  assert.deepEqual(restoreCaptionReadabilityPlanV001({...f, saved}), saved);
  for (const mutate of [s => s.normalPlan.elements[0].startFrame++, s => s.normalPlan.elements[1].text = '違う',
    s => s.captionMappings[0].children[0].endCodePointExclusive++, s => s.summary.outputCaptions = 9,
    s => s.effectMappings.push({kind: 'panel'}), s => s.planSha256 = '0'.repeat(64)]) {
    const altered = clone(saved); mutate(altered);
    assert.throws(() => restoreCaptionReadabilityPlanV001({...f, saved: altered}), /saved readability/);
  }
  const changedEvidence = clone(f); changedEvidence.evidence.captions[0].measurements[0].singleLineWidthPx++;
  assert.throws(() => restoreCaptionReadabilityPlanV001({...changedEvidence, saved}), /saved readability/);
});

test('fresh-process restore produces the same result without a cache', () => {
  const f = fixture(), saved = build(f);
  const modulePath = fileURLToPath(new URL('./caption-readability-plan.mjs', import.meta.url));
  const result = spawnSync(process.execPath, ['--input-type=module', '-e',
    `import {readFileSync} from 'node:fs'; import {restoreCaptionReadabilityPlanV001} from ${JSON.stringify(modulePath)};
     process.stdout.write(JSON.stringify(restoreCaptionReadabilityPlanV001(JSON.parse(readFileSync(0,'utf8')))));`],
  {input: JSON.stringify({...f, saved}), encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), saved);
});

test('same measurement graph ordering does not alter the deterministic result', () => {
  const a = fixture(), b = clone(a); b.evidence.captions[0].measurements.reverse();
  const left = build(a), right = build(b);
  assert.deepEqual(left.normalPlan, right.normalPlan);
  assert.deepEqual(left.captionMappings, right.captionMappings);
});

test('failure identifies the exact caption for full-Digest preflight', () => {
  const f = fixture(); f.evidence.captions[0].atoms[0].startFrame++;
  assert.throws(() => build(f), /CAPTION_READABILITY_INVALID: caption: source outer clocks/);
});

test('zero-frame source atoms survive, but never form a zero-frame child', () => {
  const f = fixture();
  f.normalPlan.elements[0].targetProvenance.sourceAtomIds = ['a', 'punctuation', 'b'];
  f.evidence.captions[0].atoms = [
    {atomId: 'a', text: '赤い犬', startFrame: 10, endFrameExclusive: 50,
      sourceStartMs: 1000, sourceEndMs: 1999, timelineSegmentId: 'source-segment'},
    {atomId: 'punctuation', text: 'が', startFrame: 50, endFrameExclusive: 50,
      sourceStartMs: 1999, sourceEndMs: 2000, timelineSegmentId: 'source-segment'},
    {atomId: 'b', text: '走る', startFrame: 50, endFrameExclusive: 100,
      sourceStartMs: 2000, sourceEndMs: 4000, timelineSegmentId: 'source-segment'}];
  f.evidence.captions[0].boundaries[0].atomEndIndexExclusive = 2;
  f.evidence.captions[0].measurements = [
    {startAtomIndex: 0, endAtomIndexExclusive: 2, singleLineWidthPx: 120, twoLine: null},
    {startAtomIndex: 0, endAtomIndexExclusive: 3, singleLineWidthPx: 240, twoLine: null},
    {startAtomIndex: 2, endAtomIndexExclusive: 3, singleLineWidthPx: 120, twoLine: null}];
  bind(f);
  const saved = build(f);
  assert.deepEqual(saved.normalPlan.elements.flatMap(e => e.targetProvenance.sourceAtomIds), ['a', 'punctuation', 'b']);
  assert(saved.normalPlan.elements.every(e => e.endFrameExclusive > e.startFrame));
});

test('protected motion may use a reasoned two-line layout while retaining one unchanged interval and effect', () => {
  const f = fixture({effect: {kind: 'bounce'}}), parent = f.normalPlan.elements[0];
  f.evidence.captions[0].measurements[1].twoLine = {lines: ['赤い犬が', '走る'], widthsPx: [120, 120],
    reason: '最大motion状態でも全体が収まり、効果を複製せず意味単位を保持する'};
  const saved = build(f), child = saved.normalPlan.elements[0];
  assert.equal(saved.summary.twoLineCaptions, 1);
  assert.equal(saved.summary.splitParents, 0);
  assert.deepEqual([child.instructionId, child.startFrame, child.endFrameExclusive, child.transition, child.visualState],
    [parent.instructionId, parent.startFrame, parent.endFrameExclusive, parent.transition, parent.visualState]);
  assert.deepEqual(saved.effectMappings, [{parentCaptionId: 'caption', childCaptionId: 'caption', kind: 'bounce'}]);
});

test('new child IDs cannot collide with any existing caption', () => {
  const f = fixture(), other = clone(f.normalPlan.elements[0]);
  other.instructionId = 'caption-readability-01';
  f.normalPlan.elements.push(other);
  const evidence = clone(f.evidence.captions[0]); evidence.captionId = other.instructionId;
  f.evidence.captions.push(evidence); bind(f);
  // Both captions split, so this particular baseline ID is no longer retained.
  // Retain the second one as a fitting, unsplit caption to expose the collision.
  evidence.measurements[1].singleLineWidthPx = 100;
  assert.throws(() => build(f), /ID collision/);
});
