/** Manual callers and future selectors use the same finite renderer input. */
export interface PresentationEffects {
  captions?: Array<{
    captionId: string;
    /** `panel` is provisional until the owner explicitly adopts a product name. */
    preset: 'normal' | 'emphasis' | 'reaction' | 'panel';
  }>;
  connections?: Array<{
    beforeSegmentId: string;
    afterSegmentId: string;
    transition: 'normal-cut' | 'black';
  }>;
}
