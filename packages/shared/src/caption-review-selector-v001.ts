/** A deterministic review selector. It has no text, identity, human-label or repair input. */
export interface CaptionReviewFeaturesV001 {
  sttIntervals: {startMs: number; endMs: number}[];
  display: {startFrame: number; endFrameExclusive: number};
  previousEndFrame: number | null;
  nextStartFrame: number | null;
  mappingAvailable: boolean;
  acoustic: {
    available: boolean;
    startResolved: boolean;
    endResolved: boolean;
    startOutputFrame: number | null;
    endOutputFrame: number | null;
    whollyOutsideAdoptedUnitCount: number;
  };
}

export const CAPTION_REVIEW_SIGNALS_V001 = Object.freeze({
  'nonpositive-recognition': '元の音声認識に、終了が開始以前の区間があります。',
  'unresolved-acoustic-boundary': '保存済み音響観測から、この字幕の開始または終了を個別に確定できません。',
  'acoustic-outside-adopted-media': '対応する音響観測の区間が、採用映像の区間外にあります。',
  'acoustic-display-disjoint': '確定できた音響観測の区間と、字幕表示の区間が重なりません。',
  'caption-overlap': '前後の字幕と表示区間が重なっています。',
});
export type CaptionReviewSignalV001 = keyof typeof CAPTION_REVIEW_SIGNALS_V001;

export function selectCaptionReviewV001(f: CaptionReviewFeaturesV001) {
  const signals: CaptionReviewSignalV001[] = [];
  if (f.sttIntervals.some(s => s.endMs <= s.startMs)) signals.push('nonpositive-recognition');
  const a = f.acoustic;
  if (a.available && (!a.startResolved || !a.endResolved)) signals.push('unresolved-acoustic-boundary');
  if (a.whollyOutsideAdoptedUnitCount > 0) signals.push('acoustic-outside-adopted-media');
  if (a.startResolved && a.endResolved && a.startOutputFrame !== null && a.endOutputFrame !== null
    && a.endOutputFrame > a.startOutputFrame
    && (a.endOutputFrame <= f.display.startFrame || a.startOutputFrame >= f.display.endFrameExclusive))
    signals.push('acoustic-display-disjoint');
  if ((f.previousEndFrame !== null && f.previousEndFrame > f.display.startFrame)
    || (f.nextStartFrame !== null && f.nextStartFrame < f.display.endFrameExclusive)) signals.push('caption-overlap');
  const missingEvidence: string[] = [];
  if (!f.sttIntervals.length) missingEvidence.push('original-recognition-missing');
  if (!f.mappingAvailable) missingEvidence.push('source-output-mapping-missing');
  if (!a.available) missingEvidence.push('saved-acoustic-observation-missing');
  return {
    status: signals.length ? 'review-required' as const : missingEvidence.length ? 'insufficient-evidence' as const : 'no-review-signal' as const,
    signals, reasons: signals.map(s => CAPTION_REVIEW_SIGNALS_V001[s]), missingEvidence,
  };
}
