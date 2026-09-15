/** Phase 1: finite whole-caption presentation; no text, timing, or free drawing values. */
export interface AutoPresentationFileRef {
  path: string;
  fileSha256: string;
}
export interface AutoPresentationContext {
  baselineRef: AutoPresentationFileRef & {canonicalSha256: string};
  decisionInputRef: AutoPresentationFileRef;
  renderingRulesRef: {version: 'auto-presentation-rules-v001'; contentSha256: string};
}
export interface AutoPresentationFocus {
  role: 'Focus';
  presentation: 'provisional-focus';
  scope: 'whole-caption';
}
export interface AutoPresentationException {
  captionId: string;
  status: 'unrepresentable' | 'unresolved';
  reason: string;
}
export interface AutoPresentationProposal {
  schemaVersion: 'auto-presentation-proposal-v001';
  context: AutoPresentationContext;
  targetCaptionIds: string[];
  completion: 'complete';
  effects: Array<AutoPresentationFocus & {captionId: string}>;
  exceptions: AutoPresentationException[];
}
/** Construct only through proposal validation; the renderer validates again. */
export interface FixedAutoPresentation {
  schemaVersion: 'fixed-auto-presentation-v001';
  proposalSha256: string;
  proposal: AutoPresentationProposal;
}
export interface AutoPresentationOverrides {
  schemaVersion: 'auto-presentation-overrides-v001';
  context: AutoPresentationContext;
  autoProposalSha256: string | null;
  entries: Array<{captionId: string; role: 'Normal'} | (AutoPresentationFocus & {captionId: string})>;
}
export interface AutoPresentationInput {
  context: AutoPresentationContext;
  autoProposal?: FixedAutoPresentation;
  overrides?: AutoPresentationOverrides;
}
export interface AutoPresentationResolution {
  context: AutoPresentationContext;
  autoProposalSha256: string | null;
  overridesSha256: string | null;
  automaticStatus: 'not-processed' | 'partially-processed' | 'complete' | 'complete-with-exceptions';
  exceptions: AutoPresentationException[];
  captions: Array<{
    captionId: string;
    origin: 'baseline' | 'automatic' | 'human';
    role: 'Normal' | 'Focus';
    automaticStatus: 'not-processed' | 'normal' | 'selected' | 'unrepresentable' | 'unresolved';
  }>;
}
