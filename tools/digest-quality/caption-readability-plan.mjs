/** Readability partitions over saved source atoms. This module performs no
 * semantic inference, font measurement, media work, or presentation selection. */
import {canonicalSha256, canonicalJson} from './clock.mjs';
import {indexExplicitLinesV001, codePointWeightV001, validateIndexedLinesV001}
  from '../../evals/clip_composition/presentation_renderer_text_layout_v001.mjs';

const clone = structuredClone;
const same = (a, b) => canonicalJson(a) === canonicalJson(b);
const integer = n => Number.isSafeInteger(n) && n >= 0;
const text = s => typeof s === 'string' && s.trim().length > 0;
const exact = (v, keys) => v && typeof v === 'object' && !Array.isArray(v)
  && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
const require = (ok, message) => {if (!ok) throw new TypeError('CAPTION_READABILITY_INVALID: ' + message);};
const width = n => Number.isFinite(n) && n >= 0;
const sha = s => typeof s === 'string' && /^[a-f0-9]{64}$/.test(s);
function freeze(value) {
  if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);}
  return value;
}
export const captionReadabilityPlanSha256V001 = canonicalSha256;

/** Measurements must be made with precisely these supplied rendering inputs.
 * Width means the full rendered extent, including outline/glow, Panel padding
 * and all applicable motion states, not only glyph advances. The caller retains
 * the actual font/tool binding and raster inspection. */
export function captionReadabilityMeasurementContextSha256V001(plan, captionId) {
  const caption = plan.elements.find(e => e.instructionId === captionId);
  require(caption?.kind === 'speech-caption', 'measurement caption is missing');
  return canonicalSha256({canvas: plan.canvas, layoutRules: plan.layoutRules,
    visualState: caption.visualState, text: caption.text});
}

function inspectCaption(plan, parent, evidence, maxWidthPx) {
  require(exact(evidence, ['captionId', 'measurementContextSha256', 'atoms', 'boundaries', 'measurements', 'effect'])
    && evidence.captionId === parent.instructionId, 'caption evidence membership/order differs');
  require(evidence.measurementContextSha256 === captionReadabilityMeasurementContextSha256V001(plan, parent.instructionId),
    'font/layout measurement context differs');
  require(!['presentationColorRange', 'presentationPreset', 'presentationPulse', 'presentationMotion'].some(k => Object.hasOwn(parent, k)),
    'readability must precede presentation materialization');
  require(typeof parent.text === 'string' && parent.text.length > 0 && integer(parent.startFrame)
    && integer(parent.endFrameExclusive) && parent.startFrame < parent.endFrameExclusive
    && parent.displayFrameCount === parent.endFrameExclusive - parent.startFrame
    && validateIndexedLinesV001(parent.text, parent.indexedLines).status === 'passed', 'invalid original caption');
  const atoms = evidence.atoms;
  require(Array.isArray(atoms) && atoms.length > 0, 'source atoms required');
  let offset = 0;
  const offsets = [0];
  atoms.forEach((atom, i) => {
    require(exact(atom, ['atomId', 'text', 'startFrame', 'endFrameExclusive', 'sourceStartMs', 'sourceEndMs', 'timelineSegmentId']) && text(atom.atomId)
      && typeof atom.text === 'string' && atom.text.length > 0 && integer(atom.startFrame) && integer(atom.endFrameExclusive)
      && atom.startFrame <= atom.endFrameExclusive && integer(atom.sourceStartMs) && integer(atom.sourceEndMs)
      && atom.sourceStartMs <= atom.sourceEndMs && text(atom.timelineSegmentId)
      && (!i || (atom.startFrame >= atoms[i - 1].endFrameExclusive && atom.sourceStartMs >= atoms[i - 1].sourceEndMs
        && atom.timelineSegmentId === atoms[i - 1].timelineSegmentId)),
    'source atom text/time is missing or out of order');
    offset += [...atom.text].length; offsets.push(offset);
  });
  require(new Set(atoms.map(a => a.atomId)).size === atoms.length
    && same(atoms.map(a => a.atomId), parent.targetProvenance?.sourceAtomIds)
    && atoms.map(a => a.text).join('') === parent.text, 'source atom identity/text differs');
  require(atoms[0].startFrame === parent.startFrame && atoms.at(-1).endFrameExclusive === parent.endFrameExclusive,
    'source outer clocks differ from the original caption');
  require(parent.sourceStartMs === atoms[0].sourceStartMs
    && parent.sourceEndMs === atoms.at(-1).sourceEndMs
    && parent.timelineSegmentId === atoms[0].timelineSegmentId,
  'original source range/segment differs from atom evidence');
  const graphemeOffsets = new Set([0, [...parent.text].length]);
  for (const part of new Intl.Segmenter('ja', {granularity: 'grapheme'}).segment(parent.text)) {
    graphemeOffsets.add([...parent.text.slice(0, part.index)].length);
  }
  const effect = evidence.effect;
  const kinds = ['normal', 'color', 'panel', 'scale', 'pulse', 'bounce', 'shake'];
  require(kinds.includes(effect?.kind) && exact(effect, effect.kind === 'color' ? ['kind', 'range'] : ['kind']),
    'unknown presentation kind');
  if (effect.kind === 'color') {
    const r = effect.range;
    require(exact(r, ['startCodePoint', 'endCodePointExclusive']) && integer(r.startCodePoint)
      && integer(r.endCodePointExclusive) && r.startCodePoint < r.endCodePointExclusive
      && r.endCodePointExclusive <= offset && graphemeOffsets.has(r.startCodePoint)
      && graphemeOffsets.has(r.endCodePointExclusive), 'invalid Color source range');
  }
  require(Array.isArray(evidence.boundaries), 'semantic boundaries required');
  const frames = new Map([[0, parent.startFrame], [atoms.length, parent.endFrameExclusive]]);
  const boundaries = new Map(); let previous = 0;
  for (const boundary of evidence.boundaries) {
    const end = boundary.atomEndIndexExclusive;
    require(exact(boundary, ['atomEndIndexExclusive', 'frame', 'kind', 'reason', 'required'])
      && integer(end) && end > previous && end < atoms.length && integer(boundary.frame)
      && ['semantic', 'source-gap'].includes(boundary.kind) && text(boundary.reason)
      && typeof boundary.required === 'boolean', 'semantic boundary is malformed or out of order');
    require(boundary.frame === atoms[end].startFrame && boundary.frame > parent.startFrame
      && boundary.frame < parent.endFrameExclusive && graphemeOffsets.has(offsets[end]),
    'boundary must use the next source atom clock and a grapheme boundary');
    require(boundary.kind !== 'source-gap' || (atoms[end - 1].endFrameExclusive < atoms[end].startFrame
      && atoms[end - 1].sourceEndMs < atoms[end].sourceStartMs),
      'source-gap boundary has no measured gap');
    frames.set(end, boundary.frame); boundaries.set(end, boundary); previous = end;
  }
  const points = [0, ...boundaries.keys(), atoms.length];
  const measured = new Map();
  require(Array.isArray(evidence.measurements), 'actual font measurements required');
  for (const span of evidence.measurements) {
    require(exact(span, ['startAtomIndex', 'endAtomIndexExclusive', 'singleLineWidthPx', 'twoLine'])
      && points.includes(span.startAtomIndex) && points.includes(span.endAtomIndexExclusive)
      && span.startAtomIndex < span.endAtomIndexExclusive && width(span.singleLineWidthPx), 'invalid measured span');
    const key = span.startAtomIndex + ':' + span.endAtomIndexExclusive;
    require(!measured.has(key), 'duplicate measured span');
    const originalText = atoms.slice(span.startAtomIndex, span.endAtomIndexExclusive).map(a => a.text).join('');
    if (span.twoLine !== null) {
      const two = span.twoLine;
      require(exact(two, ['lines', 'widthsPx', 'reason']) && text(two.reason)
        && Array.isArray(two.lines) && two.lines.length === 2 && two.lines.every(text)
        && two.lines.join('') === originalText && Array.isArray(two.widthsPx)
        && two.widthsPx.length === 2 && two.widthsPx.every(width), 'two-line exception needs exact text, widths and a reason');
      const lineEnd = offsets[span.startAtomIndex] + [...two.lines[0]].length;
      require(offsets.includes(lineEnd) && graphemeOffsets.has(lineEnd), 'line break cuts a source atom/grapheme');
    }
    measured.set(key, span);
  }
  // A missing measurement is not evidence that a shorter or one-line solution
  // is impossible. Require the complete finite graph, without measuring twice.
  for (let a = 0; a < points.length; a++) for (let b = a + 1; b < points.length; b++) {
    require(measured.has(points[a] + ':' + points[b]), 'missing actual-width measurement');
  }
  const allowedBoundary = end => effect.kind !== 'color'
    || offsets[end] <= effect.range.startCodePoint || offsets[end] >= effect.range.endCodePointExclusive;
  for (const [end, boundary] of boundaries) {
    require(!boundary.required || allowedBoundary(end), 'required boundary cuts the Color target');
  }
  const preserveUnsplit = !['normal', 'color'].includes(effect.kind);
  require(!preserveUnsplit || ![...boundaries.values()].some(b => b.required),
    'presentation requires an unsplit caption; required split is unsupported');
  const entryFrames = parent.transition?.entry?.frames ?? 0, exitFrames = parent.transition?.exit?.frames ?? 0;
  require(integer(entryFrames) && integer(exitFrames), 'invalid existing fade duration');
  const minimumFrames = Math.max(1, entryFrames + exitFrames);
  const eligible = (start, end) => {
    if ((start !== 0 && !allowedBoundary(start)) || (end !== atoms.length && !allowedBoundary(end))) return null;
    if (preserveUnsplit && (start !== 0 || end !== atoms.length)) return null;
    if ([...boundaries].some(([point, b]) => b.required && start < point && point < end)) return null;
    // An unchanged short original keeps its existing fade semantics. A newly
    // split piece cannot be shorter than the existing two fade envelopes.
    if ((start !== 0 || end !== atoms.length) && frames.get(end) - frames.get(start) < minimumFrames) return null;
    const span = measured.get(start + ':' + end);
    const fullText = atoms.slice(start, end).map(a => a.text).join('');
    if (span.singleLineWidthPx <= maxWidthPx) return {span, lines: [fullText], widthsPx: [span.singleLineWidthPx], reason: null};
    if (span.twoLine && parent.visualState.layout.maxLines >= 2 && span.twoLine.widthsPx.every(w => w <= maxWidthPx)) {
      return {span, lines: span.twoLine.lines, widthsPx: span.twoLine.widthsPx, reason: span.twoLine.reason};
    }
    return null;
  };
  // Lexicographic policy, not a weighted score: first avoid two-line captions,
  // then avoid needless switches. Equal solutions use the later source boundary.
  const best = new Map([[atoms.length, {rows: [], twoLines: 0}]]);
  for (let i = points.length - 2; i >= 0; i--) {
    let selected = null;
    for (let j = points.length - 1; j > i; j--) {
      const row = eligible(points[i], points[j]), tail = best.get(points[j]);
      if (!row || !tail) continue;
      const option = {rows: [row, ...tail.rows], twoLines: tail.twoLines + (row.lines.length === 2 ? 1 : 0)};
      if (!selected || option.twoLines < selected.twoLines
        || (option.twoLines === selected.twoLines && option.rows.length < selected.rows.length)) selected = option;
    }
    if (selected) best.set(points[i], selected);
  }
  require(best.has(0), preserveUnsplit ? 'presentation overflow cannot be split or shrunk'
    : 'no source-grounded readable partition; do not invent a boundary or shrink');
  return {rows: best.get(0).rows, atoms, offsets, frames, boundaries, effect};
}

/** Every supplied semantic decision and width is retained in the evidence hash.
 * Required boundaries express an existing meaning/pace decision; this resolver
 * never infers slow speech from character count or installs a pace threshold. */
export function buildCaptionReadabilityPlanV001({normalPlan, evidence}) {
  require(normalPlan?.schemaVersion === 'presentation-output-common-core-plan-v001'
    && normalPlan.canvas?.fps === 30 && Array.isArray(normalPlan.elements), 'normal plan required');
  require(exact(evidence, ['schemaVersion', 'sourcePlanSha256', 'clockId', 'maxWidthPx', 'captions'])
    && evidence.schemaVersion === 'caption-readability-evidence-v001' && sha(evidence.sourcePlanSha256)
    && evidence.sourcePlanSha256 === canonicalSha256(normalPlan) && text(evidence.clockId)
    && Number.isFinite(evidence.maxWidthPx) && evidence.maxWidthPx > 0
    && Array.isArray(evidence.captions), 'source plan, clock or evidence differs');
  const captions = normalPlan.elements.filter(e => e.kind === 'speech-caption');
  require(captions.length === evidence.captions.length
    && new Set(normalPlan.elements.map(e => e.instructionId)).size === normalPlan.elements.length, 'caption coverage/identity differs');
  const replaced = new Map(), captionMappings = [], effectMappings = [];
  captions.forEach((parent, i) => {
    let inspected;
    try {inspected = inspectCaption(normalPlan, parent, evidence.captions[i], evidence.maxWidthPx);}
    catch (error) {
      if (error instanceof TypeError && error.message.startsWith('CAPTION_READABILITY_INVALID: ')) {
        throw new TypeError('CAPTION_READABILITY_INVALID: ' + parent.instructionId + ': '
          + error.message.slice('CAPTION_READABILITY_INVALID: '.length), {cause: error});
      }
      throw error;
    }
    const {rows, atoms, offsets, frames, boundaries, effect} = inspected;
    const children = rows.map((row, index) => {
      const start = row.span.startAtomIndex, end = row.span.endAtomIndexExclusive;
      const childAtoms = atoms.slice(start, end);
      const result = indexExplicitLinesV001(row.lines);
      require(result.status === 'passed', 'invalid child line layout');
      const indexedLines = result.indexedLines.map(line => {
        const first = offsets[start] + line.characters[0].sourceIndex;
        const last = offsets[start] + line.characters.at(-1).sourceIndex + 1;
        return {...line, logicalWidth: [...line.text].reduce((sum, c) => sum + codePointWeightV001(c, normalPlan.layoutRules.characterWidthRule), 0),
          sourceUnitIds: atoms.filter((_, k) => offsets[k] >= first && offsets[k + 1] <= last).map(a => a.atomId)};
      });
      const id = rows.length === 1 ? parent.instructionId : parent.instructionId + '-readability-' + String(index + 1).padStart(2, '0');
      const child = {...clone(parent), instructionId: id, text: row.lines.join(''), indexedLines,
        startFrame: frames.get(start), endFrameExclusive: frames.get(end),
        displayFrameCount: frames.get(end) - frames.get(start),
        sourceStartMs: childAtoms[0].sourceStartMs, sourceEndMs: childAtoms.at(-1).sourceEndMs,
        timelineSegmentId: childAtoms[0].timelineSegmentId,
        targetProvenance: {...clone(parent.targetProvenance), sourceAtomIds: childAtoms.map(a => a.atomId)}};
      require(validateIndexedLinesV001(child.text, child.indexedLines).status === 'passed', 'child text/index mismatch');
      return child;
    });
    require(children.map(c => c.text).join('') === parent.text
      && same(children.flatMap(c => c.targetProvenance.sourceAtomIds), parent.targetProvenance.sourceAtomIds)
      && children[0].startFrame === parent.startFrame && children.at(-1).endFrameExclusive === parent.endFrameExclusive,
    'partition changed text, source coverage or outer clocks');
    const mapping = {parentCaptionId: parent.instructionId, originalText: parent.text,
      originalRange: {startFrame: parent.startFrame, endFrameExclusive: parent.endFrameExclusive},
      children: children.map((child, j) => ({captionId: child.instructionId,
        startAtomIndex: rows[j].span.startAtomIndex, endAtomIndexExclusive: rows[j].span.endAtomIndexExclusive,
        startCodePoint: offsets[rows[j].span.startAtomIndex], endCodePointExclusive: offsets[rows[j].span.endAtomIndexExclusive],
        startFrame: child.startFrame, endFrameExclusive: child.endFrameExclusive,
        sourceStartMs: child.sourceStartMs, sourceEndMs: child.sourceEndMs, timelineSegmentId: child.timelineSegmentId,
        lineCount: rows[j].lines.length, measuredWidthsPx: clone(rows[j].widthsPx), twoLineReason: rows[j].reason,
        precedingBoundary: j ? clone(boundaries.get(rows[j].span.startAtomIndex)) : null}))};
    captionMappings.push(mapping); replaced.set(parent.instructionId, children);
    if (effect.kind === 'color') {
      const targets = mapping.children.filter(c => c.startCodePoint <= effect.range.startCodePoint
        && effect.range.endCodePointExclusive <= c.endCodePointExclusive);
      require(targets.length === 1, 'Color target must belong to exactly one child');
      const target = targets[0];
      effectMappings.push({parentCaptionId: parent.instructionId, childCaptionId: target.captionId, kind: 'color',
        range: {startCodePoint: effect.range.startCodePoint - target.startCodePoint,
          endCodePointExclusive: effect.range.endCodePointExclusive - target.startCodePoint}});
    } else if (effect.kind !== 'normal') {
      require(children.length === 1, 'whole-caption presentation was duplicated');
      effectMappings.push({parentCaptionId: parent.instructionId, childCaptionId: children[0].instructionId, kind: effect.kind});
    }
  });
  const elements = normalPlan.elements.flatMap(e => replaced.get(e.instructionId) ?? [clone(e)]);
  require(new Set(elements.map(e => e.instructionId)).size === elements.length, 'generated child caption ID collision');
  const body = {schemaVersion: 'caption-readability-plan-v001', sourcePlanSha256: evidence.sourcePlanSha256,
    evidenceSha256: canonicalSha256(evidence), clockId: evidence.clockId,
    normalPlan: {...clone(normalPlan), elements}, captionMappings, effectMappings,
    summary: {originalCaptions: captions.length, outputCaptions: elements.filter(e => e.kind === 'speech-caption').length,
      splitParents: captionMappings.filter(m => m.children.length > 1).length,
      oneLineCaptions: captionMappings.flatMap(m => m.children).filter(c => c.lineCount === 1).length,
      twoLineCaptions: captionMappings.flatMap(m => m.children).filter(c => c.lineCount === 2).length},
    humanQuality: 'not-evaluated'};
  return freeze({...body, planSha256: canonicalSha256(body)});
}

/** Recompute in a fresh process; no cached success or derived-source mutation. */
export function restoreCaptionReadabilityPlanV001({normalPlan, evidence, saved}) {
  const rebuilt = buildCaptionReadabilityPlanV001({normalPlan, evidence});
  require(same(rebuilt, saved), 'saved readability plan, evidence or source changed');
  return rebuilt;
}
