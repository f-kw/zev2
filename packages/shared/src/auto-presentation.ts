/** Finite whole/partial presentation; selectors never change caption text or drawing values. */
export interface AutoPresentationFileRef {
  /** Provenance location; content identity uses hashes, not this location. */
  path: string;
  fileSha256: string;
}
export interface AutoPresentationContext {
  baselineRef: AutoPresentationFileRef & {canonicalSha256: string};
  decisionInputRef: AutoPresentationFileRef;
  renderingRulesRef: {version: 'auto-presentation-rules-v002'; contentSha256: string};
}
interface AutoPresentationFocusBase {
  role: 'Focus';
  presentation: 'provisional-focus';
}
export interface AutoPresentationWholeFocus extends AutoPresentationFocusBase {
  scope: 'whole-caption';
}
export interface AutoPresentationPartialFocus extends AutoPresentationFocusBase {
  scope: 'partial-caption';
  /** Exact text from the fixed caption, without normalization or fuzzy matching. */
  targetText: string;
  /** One-based exact occurrence. Required when the text occurs more than once. */
  occurrence?: number;
}
export type AutoPresentationFocus = AutoPresentationWholeFocus | AutoPresentationPartialFocus;
export type AutoPresentationSelection = {role: 'Normal'} | AutoPresentationFocus;
/** Derived from the fixed caption at resolution time; never accepted as a saved selector. */
export interface AutoPresentationCanonicalRange {
  startCodePoint: number;
  endCodePointExclusive: number;
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
    /** Null means an unresolved, unrepresentable, or unprocessed automatic judgment. */
    automaticSelection: AutoPresentationSelection | null;
    effectiveSelection: AutoPresentationSelection;
    hasOverride: boolean;
    /** The effective Focus range in Unicode code points; Normal has no range. */
    canonicalRange: AutoPresentationCanonicalRange | null;
  }>;
}
