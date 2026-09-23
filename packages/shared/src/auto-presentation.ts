/** Finite whole/partial presentation; selectors never change caption text or drawing values. */
export interface AutoPresentationFileRef {
  /** Provenance location; content identity uses hashes, not this location. */
  path: string;
  fileSha256: string;
}
export interface AutoPresentationContext {
  baselineRef: AutoPresentationFileRef & {canonicalSha256: string};
  decisionInputRef: AutoPresentationFileRef;
  renderingRulesRef: {version: 'auto-presentation-rules-v008' | 'auto-presentation-rules-v009'; contentSha256: string};
  pulseTimingEvidence: AutoPresentationPulseTimingEvidence | null;
  /** Explicit whole-frame prefix projection; source measurements keep their sample clock. */
  pulseTimingProjection?: {schemaVersion: 'auto-presentation-pulse-frame-offset-v001'; frameOffset: number;
    sourceBaselineRef: AutoPresentationFileRef & {canonicalSha256: string}};
}
export interface AutoPresentationPulseTimingEvidence {
  schemaVersion: 'auto-presentation-pulse-timing-v001';
  sourceRef: AutoPresentationFileRef;
  candidatesRef: AutoPresentationFileRef;
  peaksRef: AutoPresentationFileRef;
  sampleRate: number;
  sampleCount: number;
  candidates: Array<{candidateId: string; peakIds: string[]}>;
  peaks: Array<{peakId: string; startSample: number; endSampleExclusive: number; peakSample: number}>;
}
/** Internal saved token for Color Accent. Native color glyphs retain their original colors. */
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
/** Internal saved token for Scale Accent; no stacking or partial range. */
export interface AutoPresentationVocal {
  role: 'Vocal accent';
  presentation: 'provisional-vocal';
  scope: 'whole-caption';
}
/** Finite managed Panel backgrounds with common centered dark text. */
export interface AutoPresentationPanel {
  role: 'Panel accent';
  presentation: 'provisional-panel' | 'provisional-panel-graph-paper' | 'provisional-panel-comic-frame';
  scope: 'whole-caption';
  /** Required by rules v009. Omitted only in a historical saved recipe. */
  paletteId?: 'ivory' | 'cool' | 'warm' | 'dark';
}
/** One provisional finite pulse anchored to an existing measured peak. */
export interface AutoPresentationPulse {
  role: 'Pulse accent';
  presentation: 'provisional-pulse';
  scope: 'whole-caption';
  anchorPeakId: string;
  presetVersion?: 'presentation-pulse-speech-return-v001';
  /** Bound phrase end on the same frame clock as the caption. */
  speechEndFrame?: number;
}
export interface AutoPresentationBounce {
  role: 'Bounce accent';
  presentation: 'provisional-bounce';
  scope: 'whole-caption';
  presetVersion?: 'presentation-bounce-speech-return-v001';
  speechEndFrame?: number;
}
export interface AutoPresentationShake {
  role: 'Shake accent';
  presentation: 'provisional-shake';
  scope: 'whole-caption';
}
export type AutoPresentationEffect = AutoPresentationFocus | AutoPresentationVocal | AutoPresentationPanel | AutoPresentationPulse | AutoPresentationBounce | AutoPresentationShake;
export type AutoPresentationSelection = {role: 'Normal'} | AutoPresentationEffect;
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
  effects: Array<AutoPresentationEffect & {captionId: string}>;
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
  entries: Array<{captionId: string; role: 'Normal'} | (AutoPresentationEffect & {captionId: string})>;
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
    role: 'Normal' | 'Focus' | 'Vocal accent' | 'Panel accent' | 'Pulse accent' | 'Bounce accent' | 'Shake accent';
    automaticStatus: 'not-processed' | 'normal' | 'selected' | 'unrepresentable' | 'unresolved';
    /** Null means an unresolved, unrepresentable, or unprocessed automatic judgment. */
    automaticSelection: AutoPresentationSelection | null;
    effectiveSelection: AutoPresentationSelection;
    hasOverride: boolean;
    /** The effective Color Accent range; other effects have no partial color range. */
    canonicalRange: AutoPresentationCanonicalRange | null;
  }>;
}
