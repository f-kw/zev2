/** Source-clock adapter for readability candidates. No timing inference,
 * semantic selection, source mutation, media access, or proportional splitting. */
import {
  frameBoundaryWithVideoOffsetV001,
  sourceEndFrameBoundaryWithVideoOffsetV001,
  mapPresentationSourceIntervalV002,
} from '../../evals/clip_composition/presentation_base_media_timeline_v004.mjs';
import {
  assertProjectionMatchesStateV001,
  projectCaptionPlanV001,
  projectCaptionIntervalV001,
} from '../../evals/clip_composition/presentation_orchestration_projection_v001.mjs';
import {canonicalJson, canonicalSha256} from './clock.mjs';

const require = (condition, message) => {
  if (!condition) throw new TypeError('CAPTION_READABILITY_SOURCE_INVALID: ' + message);
};
const same = (a, b) => canonicalJson(a) === canonicalJson(b);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const text = value => typeof value === 'string' && value.length > 0;
const list = value => Array.isArray(value) && value.length > 0;
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const parseBytes = (bytes, label) => {
  require(typeof bytes === 'string' || Buffer.isBuffer(bytes) || bytes instanceof Uint8Array,
    label + ' original bytes are required');
  try { return JSON.parse(Buffer.from(bytes).toString('utf8')); }
  catch { throw new TypeError('CAPTION_READABILITY_SOURCE_INVALID: ' + label + ' is not JSON'); }
};

/** Accept the original saved bytes as well as parsed inputs: projection hashes
 * alone do not bind an unrelated parsed timeline or caption plan. A final plan
 * may resolve presentation/style, but cannot change caption text, IDs or clocks.
 * Zero-frame source atoms remain present; only a complete caption/envelope must
 * satisfy the existing positive-duration interval validator. */
export function buildReadabilitySourceAtomsV001({
  finalPlan, meaning, baseTimeline, projection, sourcePlanBytes, baseTimelineBytes,
}) {
  const sourcePlan = parseBytes(sourcePlanBytes, 'source caption plan');
  require(same(parseBytes(baseTimelineBytes, 'base timeline'), baseTimeline),
    'parsed base timeline differs from its saved bytes');
  require(projection?.sourceClock && Array.isArray(projection.connections), 'saved projection is required');
  const source = projection.sourceClock;
  assertProjectionMatchesStateV001({projection,
    digestRef: source.digestRef, planRef: source.planRef, timelineRef: source.timelineRef,
    mediaRef: source.mediaRef, planBytes: sourcePlanBytes, timelineBytes: baseTimelineBytes,
    playbackSampleRate: source.playbackSampleRate, observationSampleRate: source.observationSampleRate,
    connections: projection.connections.map(({connectionId, preset, presetVersion}) => ({connectionId, preset, presetVersion})),
  });
  require(finalPlan?.canvas?.fps === 30 && sourcePlan?.canvas?.fps === 30
    && Array.isArray(finalPlan.elements) && Array.isArray(sourcePlan.elements), '30fps caption plans are required');
  const projectedPlan = projectCaptionPlanV001({projection, planBytes: sourcePlanBytes}).plan;
  const sourceCaptions = sourcePlan.elements.filter(e => e.kind === 'speech-caption');
  const projectedCaptions = projectedPlan.elements.filter(e => e.kind === 'speech-caption');
  const captions = finalPlan.elements.filter(e => e.kind === 'speech-caption');
  require(captions.length > 0 && captions.length === sourceCaptions.length
    && new Set(captions.map(e => e.instructionId)).size === captions.length, 'caption coverage or identity differs');
  require(list(meaning?.atomOccurrences), 'saved meaning atoms are required');
  const atomById = new Map();
  for (const atom of meaning.atomOccurrences) {
    require(text(atom?.atomOccurrenceId) && !atomById.has(atom.atomOccurrenceId)
      && text(atom.text) && (integer(atom.sourceSegmentId) || text(atom.sourceSegmentId))
      && text(atom.semanticUtteranceId) && list(atom.retainedSpans), 'invalid or duplicate source atom');
    atomById.set(atom.atomOccurrenceId, atom);
  }
  require(list(baseTimeline?.segments), 'base timeline segments are required');
  const segments = new Map();
  for (const segment of baseTimeline.segments) {
    // This validates the full timeline using the same production clock rules.
    const mapped = mapPresentationSourceIntervalV002(baseTimeline, segment.sourceStartMs, segment.sourceEndMs);
    require(mapped.status === 'passed' && mapped.mapping.timelineSegmentId === segment.segmentId,
      'invalid base timeline: ' + (mapped.violations?.map(v => v.code).join(',') ?? 'segment'));
    const retained = projection.retainedSpans.find(row => row.segmentId === segment.segmentId);
    require(retained && retained.sourceStartFrame === segment.outputStartFrame
      && retained.sourceEndFrameExclusive === segment.outputEndFrame, 'retained segment clock differs');
    segments.set(segment.segmentId, {segment, retained});
  }
  const observedIds = [];
  const result = captions.map((caption, index) => {
    const original = sourceCaptions[index], expected = projectedCaptions[index];
    const ids = caption.targetProvenance?.sourceAtomIds;
    require(text(caption.instructionId) && text(caption.text) && list(ids)
      && caption.instructionId === expected.instructionId && caption.text === expected.text
      && same(caption.targetProvenance, expected.targetProvenance)
      && caption.startFrame === expected.startFrame && caption.endFrameExclusive === expected.endFrameExclusive
      && caption.displayFrameCount === caption.endFrameExclusive - caption.startFrame,
    'final caption text, provenance or projected clock differs');
    const atoms = ids.map(id => {
      const atom = atomById.get(id);
      require(atom, 'caption references an unknown source atom');
      observedIds.push(id);
      const sourceSpans = atom.retainedSpans.map(span => {
        const bound = segments.get(span?.timelineSegmentId);
        require(bound && integer(span.sourceStartMs) && integer(span.sourceEndMs)
          && span.sourceStartMs < span.sourceEndMs && span.sourceStartMs >= bound.segment.sourceStartMs
          && span.sourceEndMs <= bound.segment.sourceEndMs, 'source atom span is outside its retained segment');
        const sourceStart = frameBoundaryWithVideoOffsetV001(span.sourceStartMs,
          baseTimeline.sourceFrameClock.videoPresentationOffsetMs);
        const sourceEnd = sourceEndFrameBoundaryWithVideoOffsetV001(span.sourceEndMs, baseTimeline.sourceFrameClock);
        const offset = bound.segment.outputStartFrame - bound.segment.sourceStartFrame30;
        const startFrame = offset + sourceStart + bound.retained.shiftFrames;
        const endFrameExclusive = offset + sourceEnd + bound.retained.shiftFrames;
        require(integer(startFrame) && integer(endFrameExclusive) && startFrame <= endFrameExclusive
          && startFrame >= bound.retained.displayStartFrame
          && endFrameExclusive <= bound.retained.displayEndFrameExclusive, 'source atom frame mapping is invalid');
        return {timelineSegmentId: span.timelineSegmentId,
          sourceStartMs: span.sourceStartMs, sourceEndMs: span.sourceEndMs, startFrame, endFrameExclusive};
      });
      sourceSpans.forEach((span, i) => require(!i || span.startFrame >= sourceSpans[i - 1].endFrameExclusive,
        'source atom spans overlap or run backward'));
      return {atomId: id, text: atom.text, sourceSegmentId: atom.sourceSegmentId,
        semanticUtteranceId: atom.semanticUtteranceId, sourceSpans,
        startFrame: sourceSpans[0].startFrame, endFrameExclusive: sourceSpans.at(-1).endFrameExclusive};
    });
    require(atoms.map(a => a.text).join('') === caption.text
      && atoms[0].startFrame === caption.startFrame && atoms.at(-1).endFrameExclusive === caption.endFrameExclusive,
    'source text or outer clocks differ from the caption');
    atoms.forEach((atom, i) => require(!i || atom.startFrame >= atoms[i - 1].endFrameExclusive,
      'caption source atom clocks overlap or run backward'));
    // Revalidate the full source envelope. This also rejects a caption crossing
    // an inserted connection; a zero-frame atom alone is never a new caption.
    const spans = atoms.flatMap(a => a.sourceSpans);
    require(new Set(spans.map(s => s.timelineSegmentId)).size === 1, 'caption crosses retained segments');
    const mapped = mapPresentationSourceIntervalV002(baseTimeline, spans[0].sourceStartMs, spans.at(-1).sourceEndMs);
    require(mapped.status === 'passed' && mapped.mapping.startFrame === original.startFrame
      && mapped.mapping.endFrameExclusive === original.endFrameExclusive, 'caption source envelope differs');
    const display = projectCaptionIntervalV001({projection, caption: {
      clock: 'digest-original', sourceClockSha256: projection.sourceClockSha256,
      captionId: caption.instructionId, startFrame: mapped.mapping.startFrame,
      endFrameExclusive: mapped.mapping.endFrameExclusive,
    }});
    require(display.startFrame === caption.startFrame && display.endFrameExclusive === caption.endFrameExclusive,
      'caption projection differs');
    let codePointOffset = 0;
    const internalBoundaries = atoms.slice(0, -1).map((atom, i) => {
      codePointOffset += [...atom.text].length;
      return {atomEndIndexExclusive: i + 1, afterAtomId: atom.atomId, beforeAtomId: atoms[i + 1].atomId,
        codePointOffset, boundaryFrame: atoms[i + 1].startFrame};
    });
    return {captionId: caption.instructionId, text: caption.text,
      startFrame: caption.startFrame, endFrameExclusive: caption.endFrameExclusive, atoms, internalBoundaries};
  });
  require(same(observedIds, meaning.atomOccurrences.map(a => a.atomOccurrenceId)),
    'caption atom coverage differs from saved meaning order');
  return freeze({schemaVersion: 'caption-readability-source-atoms-v001',
    sourceBindings: {finalPlanSha256: canonicalSha256(finalPlan), meaningSha256: canonicalSha256(meaning),
      sourcePlanFileSha256: source.planRef.fileSha256, baseTimelineFileSha256: source.timelineRef.fileSha256,
      projectionSha256: projection.projectionSha256},
    captions: result});
}
