/** Human observations are evidence, never executable caption instructions. */
export type CaptionRepairByteBindingV001 = { path: string; fileSha256: string };
export interface CaptionRepairFormalBindingV001 extends CaptionRepairByteBindingV001 {
  schemaVersion: string;
  canonicalSha256: string;
}
export type CaptionRepairFramesV001 = { startFrame: number; endFrameExclusive: number };
export type CaptionRepairPurposeV001 = 'human-observation' | 'fixture-replay' | 'ui-verification';

export interface CaptionRepairTargetV001 {
  instructionId: string;
  text: string;
  textIds: string[];
  currentFrames: CaptionRepairFramesV001;
  originalFormalInputSha256: string;
  completedMediaSha256: string;
  baseMediaSha256: string;
  audioPacketSha256: string;
  timelineSegmentId: string;
}

export interface CaptionRepairFrameObservationV001 {
  observationId: string;
  target: CaptionRepairTargetV001;
  presentedVideoFrame: number;
  selectedVideoFrame: number;
  boundaryKind: 'frame-start' | 'after-final-frame';
  outputAudioSample: number;
  sourceAudioSample: number;
  sourceVideoFrame: number;
  purpose: CaptionRepairPurposeV001;
  evidence: CaptionRepairByteBindingV001[];
}

export type CaptionRepairEndpointV001 =
  | { mode: 'keep-current' }
  | { mode: 'observed'; observation: CaptionRepairFrameObservationV001 };

export type CaptionLocalRepairOperationV001 =
  | {
      kind: 'change-boundaries';
      target: CaptionRepairTargetV001;
      start: CaptionRepairEndpointV001;
      end: CaptionRepairEndpointV001;
    }
  | {
      kind: 'exclude-caption';
      target: CaptionRepairTargetV001;
      reason: string;
      confirmedText: string;
    };

export interface CaptionLocalRepairObservationV001 {
  schemaVersion: 'caption-local-repair-observation-v001';
  observationId: string;
  sessionId: string;
  sourceSha256: string;
  purpose: CaptionRepairPurposeV001;
  operation: CaptionLocalRepairOperationV001;
  evidence: CaptionRepairByteBindingV001[];
  status: 'saved-not-adopted';
}

export interface CaptionLocalRepairApprovalV001 {
  schemaVersion: 'caption-local-repair-approval-v001';
  sessionId: string;
  sourceSha256: string;
  observationSha256s: string[];
  purpose: CaptionRepairPurposeV001;
  action: 'approve-local-repair';
}

export interface CaptionRepairAllowedTargetV001 {
  instructionId: string;
  operations: ('change-start' | 'change-end' | 'exclude-caption')[];
  reviewWindow: CaptionRepairFramesV001;
}

/** Supplied by the approved operation; candidate selection is not part of repair. */
export interface CaptionRepairSourceV001 {
  schemaVersion: 'caption-local-repair-source-v001';
  sourceId: string;
  completedMedia: CaptionRepairByteBindingV001;
  base: {
    baseMedia: CaptionRepairByteBindingV001;
    timeline: CaptionRepairFormalBindingV001;
    generationManifest: CaptionRepairFormalBindingV001;
    validationReceipt: CaptionRepairFormalBindingV001;
  };
  artifacts: {
    meaning: CaptionRepairFormalBindingV001;
    sourcePackage: CaptionRepairFormalBindingV001;
    selection: CaptionRepairFormalBindingV001;
    instruction: CaptionRepairFormalBindingV001;
    rendererJob: CaptionRepairFormalBindingV001;
    lineEndProjection: CaptionRepairFormalBindingV001;
    cueEndProjection: CaptionRepairFormalBindingV001;
  };
  audioPacketSha256: string;
  allowedTargets: CaptionRepairAllowedTargetV001[];
}
