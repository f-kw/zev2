/** Two renderer-owned entrance expressions. This is not an animation input language. */
const freeze = value => {
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const reject = reason => { throw new TypeError(`Caption motion: ${reason}`); };
const integer = value => Number.isSafeInteger(value) && value >= 0;
const exact = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const common = {version: 'presentation-caption-motion-v002', fps: 30, normalFontSizePx: 96,
  positionPreset: 'bottom-center', commonFadeFrames: 4, stableVisibleFrames: 8};

export const PRESENTATION_CAPTION_MOTION_PRESETS_V001 = freeze({
  bounce: {...common, presentation: 'provisional-bounce', motionFrameCount: 8, minimumDisplayFrames: 20,
    states: [
      {state: 'stable', fontSizePx: 96, offsetXPx: 0},
      {state: 'small', fontSizePx: 88, offsetXPx: 0},
      {state: 'middle', fontSizePx: 104, offsetXPx: 0},
      {state: 'maximum', fontSizePx: 112, offsetXPx: 0},
      // Linear midpoints of the existing 104→112 and 104→96 intervals.
      // The 88→104 midpoint already has the stable state's 96 px geometry.
      {state: 'between-middle-maximum', fontSizePx: (104 + 112) / 2, offsetXPx: 0},
      {state: 'between-middle-stable', fontSizePx: (104 + 96) / 2, offsetXPx: 0},
    ],
    excursion: [
      {state: 'small', startOffset: 0, endOffsetExclusive: 1},
      {state: 'stable', startOffset: 1, endOffsetExclusive: 2},
      {state: 'middle', startOffset: 2, endOffsetExclusive: 3},
      {state: 'between-middle-maximum', startOffset: 3, endOffsetExclusive: 4},
      {state: 'maximum', startOffset: 4, endOffsetExclusive: 6},
      {state: 'middle', startOffset: 6, endOffsetExclusive: 7},
      {state: 'between-middle-stable', startOffset: 7, endOffsetExclusive: 8},
    ]},
  shake: {...common, presentation: 'provisional-shake', motionFrameCount: 12, minimumDisplayFrames: 24,
    states: [
      {state: 'stable', fontSizePx: 96, offsetXPx: 0},
      {state: 'left-12', fontSizePx: 96, offsetXPx: -12},
      {state: 'right-12', fontSizePx: 96, offsetXPx: 12},
      {state: 'left-8', fontSizePx: 96, offsetXPx: -8},
      {state: 'right-8', fontSizePx: 96, offsetXPx: 8},
      {state: 'left-4', fontSizePx: 96, offsetXPx: -4},
      {state: 'right-4', fontSizePx: 96, offsetXPx: 4},
    ],
    excursion: [
      {state: 'left-12', startOffset: 0, endOffsetExclusive: 2},
      {state: 'right-12', startOffset: 2, endOffsetExclusive: 4},
      {state: 'left-8', startOffset: 4, endOffsetExclusive: 6},
      {state: 'right-8', startOffset: 6, endOffsetExclusive: 8},
      {state: 'left-4', startOffset: 8, endOffsetExclusive: 10},
      {state: 'right-4', startOffset: 10, endOffsetExclusive: 12},
    ]},
});

/** Explicit opt-in: hold the existing entrance peak until the bound phrase ends. */
export const PRESENTATION_BOUNCE_SPEECH_RETURN_PRESET_V001 = freeze({
  ...PRESENTATION_CAPTION_MOTION_PRESETS_V001.bounce,
  version: 'presentation-bounce-speech-return-v001',
  returnStates: ['between-middle-maximum', 'middle', 'between-middle-stable'],
  returnRule: 'normal-at-speech-end-or-one-frame-before-common-exit-fade',
});

function checkedPreset(element, canvas) {
  const metadata = element?.presentationMotion;
  const speechReturn = metadata?.presetVersion === PRESENTATION_BOUNCE_SPEECH_RETURN_PRESET_V001.version;
  if (!exact(metadata, speechReturn ? ['presentation', 'presetVersion', 'speechEndFrame']
    : ['presentation', 'presetVersion'])) reject('expected one finite presentation and preset version');
  const preset = speechReturn ? PRESENTATION_BOUNCE_SPEECH_RETURN_PRESET_V001
    : Object.values(PRESENTATION_CAPTION_MOTION_PRESETS_V001)
    .find(value => value.presentation === metadata.presentation);
  if (!preset || metadata.presetVersion !== preset.version || metadata.presentation !== preset.presentation) {
    reject('unknown presentation or preset version');
  }
  if (canvas?.fps !== preset.fps || !integer(canvas.width) || canvas.width === 0
    || !integer(canvas.height) || canvas.height === 0) reject('the finite preset requires an integer canvas at 30 fps');
  if (element.kind !== 'speech-caption' || !integer(element.startFrame) || !integer(element.endFrameExclusive)
    || element.endFrameExclusive <= element.startFrame
    || element.displayFrameCount !== element.endFrameExclusive - element.startFrame) {
    reject('invalid fixed caption interval');
  }
  if (element.visualState?.textStyle?.fontSizePx !== preset.normalFontSizePx) {
    reject('the finite preset requires the unchanged 96 px normal caption');
  }
  const position = element.visualState?.position;
  if (position?.preset !== preset.positionPreset || position.alignment !== 'center'
    || position.offsetXPercent !== 0 || !Number.isFinite(position.offsetYPercent)) {
    reject('the finite preset requires the existing horizontally centred bottom anchor and finite saved vertical offset');
  }
  if (['presentationColorRange', 'presentationPreset', 'presentationPulse']
    .some(key => Object.hasOwn(element, key))) reject('expressions cannot be stacked');
  if (element.displayFrameCount < preset.minimumDisplayFrames) {
    reject(speechReturn ? 'the complete entrance and visible speech-end return do not fit'
      : 'the complete entrance, eight fully visible stable frames and common exit fade do not fit');
  }
  if (speechReturn && (!integer(metadata.speechEndFrame) || metadata.speechEndFrame <= element.startFrame
    || metadata.speechEndFrame > element.endFrameExclusive)) reject('invalid bound speech end');
  return preset;
}

/** The original caption start is the entrance clock; it is not inferred speech onset. */
export function getPresentationCaptionMotionProgramV001({element, canvas}) {
  const preset = checkedPreset(element, canvas);
  if (preset.version === PRESENTATION_BOUNCE_SPEECH_RETURN_PRESET_V001.version) {
    // The bound speech end is independent evidence. The unchanged exit fade
    // limits the return so a fully opaque normal state is visible before it.
    const speechEndFrame = element.presentationMotion.speechEndFrame;
    const stableStartFrame = Math.min(speechEndFrame,
      element.endFrameExclusive - preset.commonFadeFrames - 1);
    const returnStartFrame = stableStartFrame - preset.returnStates.length;
    const peak = preset.excursion.find(row => row.state === 'maximum');
    if (returnStartFrame < element.startFrame + peak.endOffsetExclusive) {
      reject('the unchanged entrance maximum and visible speech-end return do not fit');
    }
    const entrance = preset.excursion.filter(row => row.endOffsetExclusive <= peak.startOffset)
      .map(row => ({state: row.state, startFrame: element.startFrame + row.startOffset,
        endFrameExclusive: element.startFrame + row.endOffsetExclusive}));
    const segments = [...entrance,
      {state: 'maximum', startFrame: element.startFrame + peak.startOffset, endFrameExclusive: returnStartFrame},
      ...preset.returnStates.map((state, index) => ({state, startFrame: returnStartFrame + index,
        endFrameExclusive: returnStartFrame + index + 1})),
      {state: 'stable', startFrame: stableStartFrame, endFrameExclusive: element.endFrameExclusive}];
    const frames = [...Array.from({length: stableStartFrame - element.startFrame + 1},
      (_, index) => element.startFrame + index), element.endFrameExclusive - preset.commonFadeFrames];
    return freeze({presentation: preset.presentation, presetVersion: preset.version,
      speechEndFrame, returnStartFrame, motionFrameCount: stableStartFrame - element.startFrame,
      stableStartFrame, representativeFrame: element.startFrame + peak.startOffset,
      segments, samples: [...new Set(frames)].sort((left, right) => left - right).map(frame => ({frame,
        expectedState: segments.find(row => row.startFrame <= frame && frame < row.endFrameExclusive).state}))});
  }
  const stableStartFrame = element.startFrame + preset.motionFrameCount;
  const segments = [...preset.excursion.map(row => ({state: row.state,
    startFrame: element.startFrame + row.startOffset,
    endFrameExclusive: element.startFrame + row.endOffsetExclusive})),
  {state: 'stable', startFrame: stableStartFrame, endFrameExclusive: element.endFrameExclusive}];
  const frames = [...Array.from({length: preset.motionFrameCount + 1}, (_, index) => element.startFrame + index),
    element.endFrameExclusive - preset.commonFadeFrames - 1];
  return freeze({presentation: preset.presentation, presetVersion: preset.version,
    motionFrameCount: preset.motionFrameCount, stableStartFrame,
    // Both presets have a changed, fully opaque state at this fixed entrance frame.
    representativeFrame: element.startFrame + 4,
    segments,
    samples: [...new Set(frames)].sort((left, right) => left - right).map(frame => ({frame,
      expectedState: segments.find(row => row.startFrame <= frame && frame < row.endFrameExclusive).state}))});
}

/** Actual full-canvas native PNGs carry movement, so the compositor still overlays at 0:0. */
export function buildPresentationCaptionMotionStateElementsV001({element, canvas}) {
  getPresentationCaptionMotionProgramV001({element, canvas});
  const preset = checkedPreset(element, canvas);
  const {presentationMotion: _motion, ...normal} = element;
  return preset.states.map(row => ({state: row.state, element: row.state === 'stable' ? normal : {
    ...normal, visualState: {...normal.visualState,
      textStyle: {...normal.visualState.textStyle, fontSizePx: row.fontSizePx},
      position: {...normal.visualState.position, offsetXPercent: row.offsetXPx * 100 / canvas.width}},
  }}));
}

/** Detect clamping: intended movement must appear exactly, and the stable PNG stays at the original anchor. */
export function assertPresentationCaptionMotionLayoutsV001({element, canvas, layoutItems}) {
  const preset = checkedPreset(element, canvas);
  if (!Array.isArray(layoutItems) || layoutItems.length !== preset.states.length) reject('all finite native layouts are required');
  const boxes = layoutItems.map(item => {
    const box = item?.wrapper;
    if (!box || !['left', 'top', 'width', 'height'].every(key => Number.isFinite(box[key]))
      || box.width <= 0 || box.height <= 0) reject('native layout wrapper is missing');
    return box;
  });
  const stable = boxes[0], centre = stable.left + stable.width / 2, bottom = stable.top + stable.height;
  for (const [index, state] of preset.states.entries()) {
    const box = boxes[index];
    if (box.left + box.width / 2 !== centre + state.offsetXPx || box.top + box.height !== bottom) {
      reject('a native state was clamped or its fixed centre/bottom displacement changed');
    }
    if (preset.presentation === 'provisional-shake' && (box.width !== stable.width || box.height !== stable.height)) {
      reject('a shake state changed the stable caption dimensions');
    }
  }
  if (preset.presentation === 'provisional-bounce') {
    const ordered = preset.states.map((state, index) => ({fontSizePx: state.fontSizePx, box: boxes[index]}))
      .sort((left, right) => left.fontSizePx - right.fontSizePx).map(row => row.box);
    if (ordered.some((box, index) => index > 0
      && (box.width <= ordered[index - 1].width || box.height <= ordered[index - 1].height))) {
      reject('bounce native layouts do not follow every finite interpolated size');
    }
  }
}
