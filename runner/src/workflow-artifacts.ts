import type { AgentRequestType, ControlReference, FileRefAccess, FileRefKind } from '@zev2/shared';
import type { ShortsScreenLayoutPlan } from './screen-layout.js';

export type ArtifactInfo = {
  path: string;
  uri: string;
  mimeType: string;
  access: FileRefAccess;
  payload?: unknown;
};

export type SourceVideoArtifact = {
  kind: 'source_video';
  mode: 'youtube-download' | 'local-source-reference' | 'remote-source-reference';
  sourceUri: string;
  purpose: string;
  registeredAt: string;
  localPath?: string;
  fileName?: string;
  downloadTool?: string;
};

export type SttSegment = {
  id: number;
  startMs: number;
  endMs: number;
  text: string;
  speaker?: string;
};

export type SpeechTimingRef = {
  id: number;
  sourceStartMs: number;
  sourceEndMs: number;
  text: string;
  speaker?: string;
};

export type TranscriptMode = 'zev-local-stt' | 'zev-sample-stt';

export type TranscriptThemeSeed = {
  id?: string;
  title?: string;
  summary?: string;
  representativeSpeechIds: number[];
  relatedSpeechIds: number[];
  reason?: string;
  compositionNote?: string;
};

export type TranscriptArtifact = {
  kind: 'transcript_json';
  mode: TranscriptMode;
  sourceUri: string;
  sampleSource?: {
    project?: string;
    path?: string;
    title?: string;
    sourceRange?: {
      sourceStartMs?: number;
      sourceEndMs?: number;
    };
  };
  notes: string[];
  generatedAt: string;
  language: string;
  durationSec: number;
  segmentCount: number;
  segments: SttSegment[];
  speechUnitGroups: number[][];
  themeSeeds?: TranscriptThemeSeed[];
};

export type ThemeArtifact = {
  kind: 'theme_json';
  mode: 'gemini-api-theme-options' | 'sample-theme-options';
  generatedAt: string;
  sourceUri: string;
  themes: Array<{
    id: string;
    title: string;
    summary: string;
    representativeText: string;
    representativeSpeechIds: number[];
    relatedSpeechIds: number[];
    whyItCanBeClipped: string;
    compositionNote: string;
    evidenceRefs: ControlReference[];
  }>;
};

export type ClipCompositionArtifact = {
  kind: 'composition_json';
  mode: 'transcript-multi-part-composition';
  generatedAt: string;
  sourceUri: string;
  selectedThemeId: string;
  title: string;
  themeSummary: string;
  sourceStartMs: number;
  sourceEndMs: number;
  parts: Array<{
    id: string;
    sourceStartMs: number;
    sourceEndMs: number;
    role: string;
    transcriptText: string;
    speechIds: number[];
    speechUnits: SpeechTimingRef[];
    connectionNote: string;
  }>;
  assemblyPlan: string;
};

export type EditPlanArtifact = {
  kind: 'edit_plan_json';
  mode: 'gemini-api-edit-plan' | 'sample-edit-plan';
  generatedAt: string;
  selectedThemeId: string;
  title: string;
  hookText: string;
  sourceStartMs: number;
  sourceEndMs: number;
  geminiApiInput: Array<{
    sourceUri: string;
    sourceStartMs: number;
    sourceEndMs: number;
    purpose: string;
  }>;
  renderSegments: Array<{
    sourceStartMs: number;
    sourceEndMs: number;
    role: string;
    caption: string;
    speechIds: number[];
    speechUnits: SpeechTimingRef[];
    screenLayout: ShortsScreenLayoutPlan;
  }>;
  telopPlan: Array<{
    sourceSpeechIds: number[];
    text: string;
    role: string;
  }>;
};

export type PatchArtifact = {
  kind: 'patch_json';
  mode: 'fixed-adjustment';
  generatedAt: string;
  editPlanUri: string;
  changes: Array<{
    target: string;
    action: string;
    reason: string;
  }>;
  renderReady: boolean;
};

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
