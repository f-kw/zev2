import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fixture} from './presentation_orchestration_v001.test.mjs';
import {fixOrchestrationJudgmentV001, resolveOrchestrationDrawingViewV001}
  from './presentation_orchestration_v001.mjs';
import {createOrchestrationPaletteJudgmentInputV001, fixOrchestrationPaletteJudgmentV001,
  restoreOrchestrationPaletteJudgmentV001} from './presentation_auto_effects_palette_v001.mjs';
import {createCaptionPaletteAutoV001, createCaptionPaletteOverridesV001, resolveCaptionPaletteV001}
  from '../../tools/digest-quality/caption-palette-policy.mjs';
import {canonicalSha256} from '../../tools/digest-quality/clock.mjs';

const clone = structuredClone, serialize = value => JSON.stringify(value) + '\n';
const sha = value => createHash('sha256').update(value).digest('hex');
function example({mixed = false} = {}) {
  const f = fixture(), input = createOrchestrationPaletteJudgmentInputV001({context: f.context, evidence: f.evidence});
  const reply = clone(f.reply);
  reply.schemaVersion = 'presentation-orchestration-palette-judgment-v001'; reply.inputSha256 = input.inputSha256;
  reply.captions.forEach((row, i) => {
    if (!mixed) row.allowedPresets = [{preset: 'color', scope: 'whole-caption'}];
    row.allowedPresets.filter(choice => choice.preset === 'color').forEach(choice => {
      choice.paletteId = ['yellow', 'light-sky-blue', 'yellow'][i];
    });
  });
  return {...f, input, reply};
}
const fix = (f, reply = f.reply) => fixOrchestrationPaletteJudgmentV001({context: f.context, input: f.input, replyBytes: serialize(reply)});
function withoutPalette(f, reply = f.reply) {
  const old = clone(reply); old.schemaVersion = 'presentation-orchestration-judgment-v002';
  old.inputSha256 = f.input.originalInput.inputSha256;
  for (const row of old.captions) for (const choice of row.allowedPresets) if (choice.preset === 'color') delete choice.paletteId;
  return old;
}

test('a single extended semantic reply delegates the unchanged expression, range and connection judgment', () => {
  const f = example({mixed: true}), before = clone(f.source), saved = fix(f);
  const delegated = serialize(withoutPalette(f));
  const original = fixOrchestrationJudgmentV001({context: f.context, input: f.input.originalInput, replyBytes: delegated});
  assert.deepEqual(saved.originalState, original);
  assert.equal(saved.delegatedReplyBytes, delegated); assert.equal(saved.delegatedReplySha256, sha(delegated));
  assert.equal(saved.replyBytes, serialize(f.reply)); assert.equal(saved.replySha256, sha(serialize(f.reply)));
  assert.equal(saved.additionalModelCalls, 0); assert.equal(saved.productionDefaultChanged, false);
  assert.equal(saved.humanQuality, 'not-evaluated'); assert.deepEqual(f.source, before);
  assert.deepEqual(saved.choices.map(row => row.captionId), original.captionAuto.proposal.effects
    .filter(row => row.role === 'Focus').map(row => row.captionId));
  assert.deepEqual(restoreOrchestrationPaletteJudgmentV001({context: f.context, saved}), saved);
  // An old reader is deliberately not made to accept the new wire.
  assert.throws(() => fixOrchestrationJudgmentV001({context: f.context,
    input: f.input.originalInput, replyBytes: serialize(f.reply)}));
});

test('palette choices are explicit and unconstrained by quotas; Yellow-only is valid', () => {
  const f = example(), saved = fix(f);
  assert.deepEqual(saved.choices.map(row => row.paletteId), ['yellow', 'light-sky-blue', 'yellow']);
  for (const row of f.reply.captions) row.allowedPresets[0].paletteId = 'yellow';
  assert.deepEqual(fix(f).choices.map(row => row.paletteId), ['yellow', 'yellow', 'yellow']);
  const reversed = clone(f.reply); reversed.captions.reverse();
  assert.deepEqual(fix(f, reversed).choices, fix(f).choices);
});

test('partial Color stays exact through the original judgment and the separate fixed palette resolver', () => {
  const f = example();
  f.reply.captions[0].allowedPresets = [{preset: 'color', scope: 'partial-caption', targetText: '字幕', paletteId: 'light-sky-blue'}];
  const saved = fix(f), view = resolveOrchestrationDrawingViewV001({context: f.context, state: saved.originalState});
  const source = {sourceViewSha256: view.viewSha256, resolvedPlan: view.resolvedPlan,
    projectedNormalPlan: view.projectedNormalPlan, effectiveSelections: view.effectiveSelections};
  const automatic = createCaptionPaletteAutoV001({source, choices: saved.choices});
  const overrides = createCaptionPaletteOverridesV001({source, automatic});
  const resolved = resolveCaptionPaletteV001({source, automatic, overrides});
  assert.deepEqual(resolved.plan.elements[0].presentationColorRange,
    {startCodePoint: 2, endCodePointExclusive: 4, fontColor: '#87CEFA'});
  assert.deepEqual(resolved.effectiveSelections[0].selection,
    {...view.effectiveSelections[0].selection, paletteId: 'light-sky-blue'});
  assert.equal(resolved.effectiveSelections[0].selection.scope, 'partial-caption');
  resolved.plan.elements.forEach((row, i) => {
    const yellow = clone(row); yellow.presentationColorRange.fontColor = '#FFD65A';
    assert.deepEqual(yellow, view.resolvedPlan.elements[i]);
  });
});

test('new judgments require one known palette ID and refuse arbitrary RGB, null and missing values', () => {
  const f = example();
  const mutations = [
    row => {delete row.paletteId;}, row => {row.paletteId = null;}, row => {row.paletteId = '';},
    row => {row.paletteId = 'blue';}, row => {row.paletteId = '#87CEFA';},
    row => {row.fontColor = '#87CEFA';}, row => {row.rgb = [135, 206, 250];},
    row => {row.paletteId = ['yellow', 'light-sky-blue'];},
  ];
  for (const mutate of mutations) {const reply = clone(f.reply); mutate(reply.captions[0].allowedPresets[0]); assert.throws(() => fix(f, reply));}
});

test('original range, coverage, semantic role, evidence and non-Color selection checks cannot be bypassed', () => {
  const f = example();
  const mutations = [
    r => {r.captions[0].allowedPresets[0] = {preset: 'color', scope: 'partial-caption', targetText: '不存在', paletteId: 'yellow'};},
    r => {r.captions[0].allowedPresets[0] = {preset: 'color', scope: 'partial-caption', targetText: '字幕', occurrence: 2, paletteId: 'yellow'};},
    r => {r.captions[0].allowedPresets[0].startCodePoint = 1;},
    r => {r.captions[0].allowedPresets.push(clone(r.captions[0].allowedPresets[0]));},
    r => {r.captions[0].allowedPresets = [{preset: 'normal', paletteId: 'yellow'}]; r.captions[0].semanticRole = 'normal';},
    r => {r.captions[0].allowedPresets = [{preset: 'shake', paletteId: 'yellow'}]; r.captions[0].semanticRole = 'reaction';},
    r => {r.captions[0].allowedPresets = [{preset: 'panel', paletteId: 'yellow', allowedBackgroundPresets: ['plain']}];},
    r => {r.captions[0].semanticRole = 'reaction';}, r => {r.captions[0].evidenceIds = ['unknown'];},
    r => {r.captions.pop();}, r => {r.connections.pop();}, r => {r.completion = 'partial';},
  ];
  for (const mutate of mutations) {const reply = clone(f.reply); mutate(reply); assert.throws(() => fix(f, reply));}
});

test('old Panel choice remains in its original contract and contributes no Color palette row', () => {
  const f = example();
  f.reply.captions[0].allowedPresets = [{preset: 'panel', allowedBackgroundPresets: ['plain']}];
  const saved = fix(f);
  assert.deepEqual(saved.choices.map(row => row.captionId), ['caption-2', 'caption-3']);
  const panel = saved.originalState.captionAuto.proposal.effects.find(row => row.captionId === 'caption-1');
  assert.equal(panel.role, 'Panel accent');
  const original = fixOrchestrationJudgmentV001({context: f.context, input: f.input.originalInput,
    replyBytes: serialize(withoutPalette(f))});
  assert.deepEqual(panel, original.captionAuto.proposal.effects.find(row => row.captionId === 'caption-1'));
});

test('source and extended input binding reject changed palettes, policy, clocks and unknown fields', () => {
  const f = example();
  const mutations = [
    input => {input.palette.colors[0].fontColor = '#FFFF00';},
    input => {input.policy.additionalModelCalls = 1;},
    input => {input.originalInput.captions[0].startFrame++;},
    input => {input.originalInput.productionPurpose = 'changed';},
    input => {input.inputSha256 = 'f'.repeat(64);},
    input => {input.unknown = true;},
  ];
  for (const mutate of mutations) {
    const input = clone(f.input); mutate(input);
    assert.throws(() => fixOrchestrationPaletteJudgmentV001({context: f.context, input, replyBytes: serialize(f.reply)}));
  }
});

test('strict JSON rejects duplicate keys, non-JSON payloads and lossy UTF-8', () => {
  const f = example(), bytes = serialize(f.reply);
  const invalid = [bytes.replace('"paletteId":"yellow"', '"paletteId":"yellow","paletteId":"light-coral"'),
    '```json\n' + bytes + '```', bytes + '{}', Buffer.from([0xff, 0xfe]), f.reply];
  for (const replyBytes of invalid) assert.throws(() => fixOrchestrationPaletteJudgmentV001({context: f.context, input: f.input, replyBytes}));
});

test('saved replay checks original bytes, normalized delegate, selected palettes and both hashes', () => {
  const f = example(), saved = fix(f), mutations = [
    row => {row.replyBytes += ' ';}, row => {row.delegatedReplyBytes += ' ';},
    row => {row.replySha256 = '0'.repeat(64);}, row => {row.delegatedReplySha256 = '0'.repeat(64);},
    row => {row.choices[0].paletteId = 'light-coral';}, row => {row.colorChoices.pop();},
    row => {row.originalState.captionAuto.proposal.effects[0].scope = 'partial-caption';},
    row => {row.unrecognized = true;},
  ];
  for (const mutate of mutations) {
    const modified = clone(saved); mutate(modified);
    // Re-signing the outer record cannot conceal a mismatching derivation.
    const {fixedSha256, ...body} = modified; modified.fixedSha256 = canonicalSha256(body);
    assert.throws(() => restoreOrchestrationPaletteJudgmentV001({context: f.context, saved: modified}));
  }
  assert.throws(() => restoreOrchestrationPaletteJudgmentV001({context: f.context,
    saved: {...saved, fixedSha256: '0'.repeat(64)}}));
});
