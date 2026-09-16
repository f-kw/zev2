/** One finite, provisional pulse. No caller supplies drawing or animation values. */
const freeze = value => {
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const reject = reason => { throw new TypeError(`Pulse Accent: ${reason}`); };
const integer = value => Number.isSafeInteger(value) && value >= 0;
const exact = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

export const PRESENTATION_PULSE_PRESET_V001 = freeze({
  version: 'presentation-pulse-preset-v001',
  presentation: 'provisional-pulse',
  fps: 30,
  normalFontSizePx: 96,
  middleFontSizePx: 112,
  maximumFontSizePx: 128,
  positionPreset: 'bottom-center',
  commonFadeFrames: 4,
  // These are this single preset's states, not a user-editable keyframe language.
  excursion: [
    {state: 'middle', startOffset: -4, endOffsetExclusive: -1},
    {state: 'maximum', startOffset: -1, endOffsetExclusive: 3},
    {state: 'middle', startOffset: 3, endOffsetExclusive: 6},
  ],
});

function checkCaption(element, canvas) {
  const preset = PRESENTATION_PULSE_PRESET_V001;
  if (canvas?.fps !== preset.fps) reject('the finite preset requires 30 fps');
  if (element?.kind !== 'speech-caption'
    || !integer(element.startFrame) || !integer(element.endFrameExclusive)
    || element.endFrameExclusive <= element.startFrame
    || element.displayFrameCount !== element.endFrameExclusive - element.startFrame) {
    reject('invalid fixed caption interval');
  }
  if (element.visualState?.textStyle?.fontSizePx !== preset.normalFontSizePx) {
    reject('the finite preset requires the unchanged 96 px normal caption');
  }
  if (element.visualState?.position?.preset !== preset.positionPreset) {
    reject('the finite preset requires the existing bottom-centre caption anchor');
  }
  if (Object.hasOwn(element, 'presentationColorRange')) reject('expressions cannot be stacked');
}

function programForAnchor(element, canvas, anchorFrame) {
  checkCaption(element, canvas);
  if (!integer(anchorFrame)) reject('invalid derived anchor frame');
  const preset = PRESENTATION_PULSE_PRESET_V001;
  const excursion = preset.excursion.map(row => ({state: row.state,
    startFrame: anchorFrame + row.startOffset,
    endFrameExclusive: anchorFrame + row.endOffsetExclusive}));
  const pulseStartFrame = excursion[0].startFrame;
  const pulseEndFrameExclusive = excursion.at(-1).endFrameExclusive;
  // A fully visible normal frame must exist immediately before and after the
  // excursion. Never shift the peak, shorten the pulse, or extend the subtitle.
  if (pulseStartFrame < element.startFrame + preset.commonFadeFrames
    || pulseEndFrameExclusive > element.endFrameExclusive - preset.commonFadeFrames) {
    reject('the complete pulse and visible normal return do not fit this peak');
  }
  return freeze({presentation: preset.presentation, anchorFrame, pulseStartFrame, pulseEndFrameExclusive,
    normalBeforeFrame: pulseStartFrame - 1,
    maximumFrame: anchorFrame,
    normalAfterFrame: pulseEndFrameExclusive,
    segments: [
      {state: 'normal', startFrame: element.startFrame, endFrameExclusive: pulseStartFrame},
      ...excursion,
      {state: 'normal', startFrame: pulseEndFrameExclusive, endFrameExclusive: element.endFrameExclusive},
    ]});
}

/** Derive the one excursion from an actual measured sample, never AI seconds. */
export function resolvePresentationPulseTimingV001({element, canvas, peakSample, sampleRate}) {
  checkCaption(element, canvas);
  if (!integer(peakSample) || !integer(sampleRate) || sampleRate === 0) reject('invalid measured peak sample');
  const sampleTime = BigInt(peakSample) * BigInt(canvas.fps);
  const rate = BigInt(sampleRate);
  if (sampleTime < BigInt(element.startFrame) * rate
    || sampleTime >= BigInt(element.endFrameExclusive) * rate) {
    reject('the measured peak itself is outside the caption');
  }
  const frame = sampleTime / rate;
  if (frame > BigInt(Number.MAX_SAFE_INTEGER)) reject('derived frame is outside the exact integer range');
  return programForAnchor(element, canvas, Number(frame));
}

/** The renderer accepts only metadata created by the bound fixed-plan resolver. */
export function getPresentationPulseProgramV001({element, canvas}) {
  const value = element?.presentationPulse;
  if (!exact(value, ['presentation', 'anchorPeakId', 'anchorFrame'])
    || value.presentation !== PRESENTATION_PULSE_PRESET_V001.presentation
    || typeof value.anchorPeakId !== 'string' || value.anchorPeakId.trim().length === 0) {
    reject('expected finite pulse metadata with one measured peak ID');
  }
  return programForAnchor(element, canvas, value.anchorFrame);
}

/** Three native PNGs belong to the same logical caption and retain its times. */
export function buildPresentationPulseStateElementsV001({element, canvas}) {
  getPresentationPulseProgramV001({element, canvas});
  const {presentationPulse, ...normal} = element;
  const preset = PRESENTATION_PULSE_PRESET_V001;
  return [
    {state: 'normal', element: normal},
    {state: 'middle', element: {...normal, visualState: {...normal.visualState,
      textStyle: {...normal.visualState.textStyle, fontSizePx: preset.middleFontSizePx}}}},
    {state: 'maximum', element: {...normal, visualState: {...normal.visualState,
      textStyle: {...normal.visualState.textStyle, fontSizePx: preset.maximumFontSizePx}}}},
  ];
}

/** Reject native layout clamping that moves the finite pulse's fixed anchor. */
export function assertPresentationPulseAnchorsV001(layoutItems) {
  if (!Array.isArray(layoutItems) || layoutItems.length !== 3) reject('all three native layouts are required');
  const anchors = layoutItems.map(item => {
    const box = item?.wrapper;
    if (!box || !['left', 'top', 'width', 'height'].every(key => Number.isFinite(box[key]))) {
      reject('native layout wrapper is missing');
    }
    return {centre: box.left + box.width / 2, bottom: box.top + box.height};
  });
  if (anchors.some(value => value.centre !== anchors[0].centre || value.bottom !== anchors[0].bottom)) {
    reject('a pulse state would move the existing horizontal centre or bottom anchor');
  }
}
