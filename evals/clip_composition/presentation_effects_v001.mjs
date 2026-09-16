// Renderer-owned finite values. Selection supplies names, never drawing values.
// Panel Accent is a provisional design: one opaque light rectangle with dark text.
export const PRESENTATION_EFFECT_TRIAL_PRESETS_V001 = Object.freeze({
  emphasis: Object.freeze({fontColor: '#FFD65A'}),
  reaction: Object.freeze({fontSizePx: 128}),
});
export const PRESENTATION_PANEL_PRESET_V001 = Object.freeze({
  // Use the existing light/dark caption palette. The plate provides contrast,
  // so outline and glow are unnecessary. Font size and display times stay fixed.
  textStyle: Object.freeze({fontColor: '#111827', borderWidthPx: 0, glowWidthPx: 0}),
  background: Object.freeze({color: '#FFFDF8', borderRadiusPx: 0, paddingXPx: 24, paddingYPx: 16}),
});
export const PRESENTATION_BLACK_FRAME_COUNT_V001 = 12;

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value, keys) => object(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const reject = message => { throw new TypeError(`presentation effects: ${message}`); };

/**
 * @param {{plan: object, expectedFrameCount: number, baseTimeline?: object,
 * effects?: import('../../packages/shared/src/presentation-effects.js').PresentationEffects}} input
 * Keep the admitted plan identical without effects. Base frame references and
 * display frame references are separate; inserted black has no source time.
 */
export function resolvePresentationEffectsV001({plan, expectedFrameCount, baseTimeline, effects}) {
  const unchanged = {plan, expectedFrameCount, presentationTimeline: null};
  if (effects === undefined) return unchanged;
  if (!object(effects) || Object.keys(effects).some(key => !['captions', 'connections'].includes(key))) {
    reject('only captions and connections are allowed');
  }
  const captions = effects.captions === undefined ? [] : effects.captions;
  const connections = effects.connections === undefined ? [] : effects.connections;
  if (!Array.isArray(captions) || !Array.isArray(connections)) reject('selections must be arrays');
  const elements = new Map(plan.elements.map(element => [element.instructionId, element]));
  if (elements.size !== plan.elements.length) reject('caption IDs are not unique');
  const selected = new Map();
  for (const entry of captions) {
    if (!exact(entry, ['captionId', 'preset']) || typeof entry.captionId !== 'string'
      || !['normal', 'emphasis', 'reaction'].includes(entry.preset)) reject('invalid caption selection');
    if (!elements.has(entry.captionId) || elements.get(entry.captionId).kind !== 'speech-caption') {
      reject('unknown caption ID');
    }
    if (selected.has(entry.captionId)) reject('duplicate caption selection');
    selected.set(entry.captionId, entry.preset);
  }
  const cuts = [];
  if (connections.length > 0) {
    const segments = baseTimeline?.segments;
    if (!Array.isArray(segments) || segments.length === 0
      || !Number.isInteger(expectedFrameCount) || expectedFrameCount <= 0) reject('missing base timeline');
    const ids = new Set();
    let end = 0;
    for (const segment of segments) {
      if (typeof segment.segmentId !== 'string' || !segment.segmentId || ids.has(segment.segmentId)
        || segment.outputStartFrame !== end || !Number.isInteger(segment.outputEndFrame)
        || segment.outputEndFrame <= end) reject('invalid contiguous base timeline');
      ids.add(segment.segmentId);
      end = segment.outputEndFrame;
    }
    if (end !== expectedFrameCount) reject('base timeline frame count differs');
    const used = new Set();
    for (const entry of connections) {
      if (!exact(entry, ['beforeSegmentId', 'afterSegmentId', 'transition'])
        || !['normal-cut', 'black'].includes(entry.transition)) reject('invalid connection selection');
      const before = segments.findIndex(segment => segment.segmentId === entry.beforeSegmentId);
      if (before < 0 || segments[before + 1]?.segmentId !== entry.afterSegmentId) reject('connection is not adjacent');
      if (used.has(before)) reject('duplicate connection selection');
      used.add(before);
      if (entry.transition === 'black') cuts.push({
        atBaseFrame: segments[before].outputEndFrame,
        beforeSegmentId: entry.beforeSegmentId,
        afterSegmentId: entry.afterSegmentId,
      });
    }
  }
  cuts.sort((a, b) => a.atBaseFrame - b.atBaseFrame);
  if (cuts.length && plan.canvas.fps !== 30) reject('12-frame black requires the 30fps digest clock');
  const changed = [...selected.values()].some(value => value !== 'normal');
  if (!changed && !cuts.length) return unchanged;
  const resolvedPlan = {...plan, elements: plan.elements.map(element => {
    const preset = selected.get(element.instructionId) ?? 'normal';
    if (cuts.some(cut => element.startFrame < cut.atBaseFrame
      && element.endFrameExclusive > cut.atBaseFrame)) reject('caption crosses selected connection');
    const shift = cuts.filter(cut => cut.atBaseFrame <= element.startFrame).length
      * PRESENTATION_BLACK_FRAME_COUNT_V001;
    if (preset === 'normal' && shift === 0) return element;
    return {
      ...element,
      ...(shift ? {startFrame: element.startFrame + shift,
        endFrameExclusive: element.endFrameExclusive + shift} : {}),
      ...(preset !== 'normal' ? {presentationPreset: preset, visualState: {
        ...element.visualState,
        textStyle: {...element.visualState.textStyle, ...PRESENTATION_EFFECT_TRIAL_PRESETS_V001[preset]},
      }} : {}),
    };
  })};
  if (!cuts.length) return {...unchanged, plan: resolvedPlan};
  let baseStart = 0;
  let displayStart = 0;
  const spans = [];
  for (const cut of cuts) {
    const length = cut.atBaseFrame - baseStart;
    spans.push({kind: 'base', baseStartFrame: baseStart, baseEndFrame: cut.atBaseFrame,
      startFrame: displayStart, endFrameExclusive: displayStart + length});
    displayStart += length;
    spans.push({kind: 'black', beforeSegmentId: cut.beforeSegmentId, afterSegmentId: cut.afterSegmentId,
      startFrame: displayStart, endFrameExclusive: displayStart + PRESENTATION_BLACK_FRAME_COUNT_V001});
    displayStart += PRESENTATION_BLACK_FRAME_COUNT_V001;
    baseStart = cut.atBaseFrame;
  }
  spans.push({kind: 'base', baseStartFrame: baseStart, baseEndFrame: expectedFrameCount,
    startFrame: displayStart, endFrameExclusive: displayStart + expectedFrameCount - baseStart});
  return {plan: resolvedPlan,
    expectedFrameCount: expectedFrameCount + cuts.length * PRESENTATION_BLACK_FRAME_COUNT_V001,
    presentationTimeline: {spans}};
}

/** The same base-frame schedule drives video and decoded audio samples. */
export function buildPresentationTimelineFiltersV001({presentationTimeline, canvas, audio}) {
  const spans = presentationTimeline.spans;
  const baseCount = spans.filter(span => span.kind === 'base').length;
  const filters = [`[0:v]split=${baseCount}${Array.from({length: baseCount}, (_, i) => `[basev${i}]`).join('')}`];
  if (audio && (!Number.isInteger(audio.sampleRate) || audio.sampleRate % canvas.fps !== 0
    || !['mono', 'stereo'].includes(audio.channelLayout))) reject('audio requires an integral sample/frame clock and mono/stereo layout');
  if (audio) filters.push(`[0:a]asplit=${baseCount}${Array.from({length: baseCount}, (_, i) => `[basea${i}]`).join('')}`);
  let baseIndex = 0;
  for (const [index, span] of spans.entries()) {
    const frames = span.endFrameExclusive - span.startFrame;
    if (span.kind === 'base') {
      filters.push(`[basev${baseIndex}]trim=start_frame=${span.baseStartFrame}:end_frame=${span.baseEndFrame},setpts=PTS-STARTPTS[tv${index}]`);
      if (audio) filters.push(`[basea${baseIndex}]atrim=start_sample=${span.baseStartFrame * audio.sampleRate / canvas.fps}:end_sample=${span.baseEndFrame * audio.sampleRate / canvas.fps},asetpts=PTS-STARTPTS[ta${index}]`);
      baseIndex++;
    } else {
      filters.push(`color=c=black:s=${canvas.width}x${canvas.height}:r=${canvas.fps},trim=end_frame=${frames},setpts=PTS-STARTPTS[tv${index}]`);
      if (audio) filters.push(`anullsrc=r=${audio.sampleRate}:cl=${audio.channelLayout},atrim=end_sample=${frames * audio.sampleRate / canvas.fps},asetpts=PTS-STARTPTS[ta${index}]`);
    }
  }
  filters.push(`${spans.map((_, i) => `[tv${i}]${audio ? `[ta${i}]` : ''}`).join('')}concat=n=${spans.length}:v=1:a=${audio ? 1 : 0}[timelineVideo]${audio ? '[timelineAudio]' : ''}`);
  return filters;
}
