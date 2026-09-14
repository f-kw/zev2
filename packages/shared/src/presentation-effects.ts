/** Manual callers and future selectors use the same finite renderer input. */
export interface PresentationEffects {
  captions?: Array<{
    captionId: string;
    preset: 'normal' | 'emphasis' | 'reaction';
  }>;
  connections?: Array<{
    beforeSegmentId: string;
    afterSegmentId: string;
    transition: 'normal-cut' | 'black';
  }>;
}
