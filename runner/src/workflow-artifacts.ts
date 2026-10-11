import type { DigestByteBindingV001, AgentRequestType, FileRefAccess, FileRefKind } from '@zev2/shared';

export type ArtifactInfo = {
  path: string;
  uri: string;
  mimeType: string;
  access: FileRefAccess;
  payload?: unknown;
  dataBindings?: DigestByteBindingV001[];
};

export type SourceVideoArtifact = {
  kind: 'source_video';
  mode: 'youtube-download' | 'local-source-reference' | 'remote-source-reference';
  sourceUri: string;
  purpose: string;
  registeredAt: string;
  localPath?: string;
  sourceInspectionBinding?: DigestByteBindingV001;
  fileName?: string;
  downloadTool?: string;
};

export type { SttSegment, SpeechTimingRef, TranscriptMode, TranscriptThemeSeed, TranscriptArtifact, ThemeArtifact, ClipCompositionArtifact, EditPlanArtifact, PatchArtifact } from '@zev2/shared';

export type WorkflowStepManifest = {
  kind: 'workflow_step_manifest';
  requestDraftId: string;
  requestId: string;
  stepType: AgentRequestType;
  stepLabel: string;
  createdAt: string;
  mode?: string;
  inputs: Array<{
    dependencyType: AgentRequestType;
    kind: FileRefKind;
    uri: string;
    meaning: string;
  }>;
  outputs: Array<{
    kind: FileRefKind;
    uri: string;
    mimeType: string;
    access: FileRefAccess;
    meaning: string;
  }>;
};
