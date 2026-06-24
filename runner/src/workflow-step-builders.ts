import type { AgentRequest, AgentRequestType, FileRef, FileRefKind, Zev2State } from '@zev2/shared';
import type {
  ArtifactInfo,
  ClipCompositionArtifact,
  EditPlanArtifact,
  PatchArtifact,
  ThemeArtifact,
  TranscriptArtifact
} from './workflow-artifacts.js';

export type StepArtifactBuilder = (context: {
  request: AgentRequest;
  state: Zev2State;
}) => Promise<ArtifactInfo>;

export type WorkflowStepRuntime = {
  prepareSourceVideo: (request: AgentRequest) => Promise<ArtifactInfo>;
  buildTranscript: (request: AgentRequest, state: Zev2State) => Promise<TranscriptArtifact>;
  buildThemeOptionsArtifact: (transcript: TranscriptArtifact, request: AgentRequest) => Promise<ThemeArtifact>;
  buildClipComposition: (
    themes: ThemeArtifact,
    transcript: TranscriptArtifact,
    selectedThemeId: string
  ) => ClipCompositionArtifact;
  buildEditPlanArtifact: (
    request: AgentRequest,
    composition: ClipCompositionArtifact,
    state: Zev2State
  ) => Promise<EditPlanArtifact>;
  buildPatch: (editPlanUri: string) => PatchArtifact;
  renderVideo: (request: AgentRequest, editPlan: EditPlanArtifact, state: Zev2State) => Promise<ArtifactInfo>;
  selectedThemeIdFromState: (state: Zev2State, requestDraftId: string, themes: ThemeArtifact) => string;
  requireRequestOutputFileRef: (
    state: Zev2State,
    request: AgentRequest,
    dependencyType: AgentRequestType,
    missingMessage: string
  ) => FileRef;
  readRequestOutputArtifact: <T>(
    state: Zev2State,
    request: AgentRequest,
    dependencyType: AgentRequestType,
    missingMessage: string
  ) => Promise<T>;
  writeJsonArtifact: (request: AgentRequest, kind: FileRefKind, payload: unknown) => Promise<ArtifactInfo>;
};

export function createStepArtifactBuilders(runtime: WorkflowStepRuntime): Record<AgentRequestType, StepArtifactBuilder> {
  return {
    prepare_video: async ({ request }) => runtime.prepareSourceVideo(request),

    run_stt: async ({ request, state }) =>
      runtime.writeJsonArtifact(request, 'transcript_json', await runtime.buildTranscript(request, state)),

    propose_clip_themes: async ({ request, state }) => {
      const transcript = await runtime.readRequestOutputArtifact<TranscriptArtifact>(
        state,
        request,
        'run_stt',
        '文字起こし成果物がないためテーマ候補を作れません'
      );
      return runtime.writeJsonArtifact(request, 'theme_json', await runtime.buildThemeOptionsArtifact(transcript, request));
    },

    build_clip_composition: async ({ request, state }) => {
      const transcript = await runtime.readRequestOutputArtifact<TranscriptArtifact>(
        state,
        request,
        'run_stt',
        '文字起こし成果物がないため構成案を作れません'
      );
      const themes = await runtime.readRequestOutputArtifact<ThemeArtifact>(
        state,
        request,
        'propose_clip_themes',
        'テーマ候補成果物がないため構成案を作れません'
      );
      const selectedThemeId = runtime.selectedThemeIdFromState(state, request.requestDraftId, themes);
      return runtime.writeJsonArtifact(
        request,
        'composition_json',
        runtime.buildClipComposition(themes, transcript, selectedThemeId)
      );
    },

    create_edit_plan: async ({ request, state }) => {
      const composition = await runtime.readRequestOutputArtifact<ClipCompositionArtifact>(
        state,
        request,
        'build_clip_composition',
        '複数箇所の構成案がないため演出案を作れません'
      );
      return runtime.writeJsonArtifact(
        request,
        'edit_plan_json',
        await runtime.buildEditPlanArtifact(request, composition, state)
      );
    },

    apply_adjustment: async ({ request, state }) => {
      const editPlanRef = runtime.requireRequestOutputFileRef(
        state,
        request,
        'create_edit_plan',
        '編集案がないため微調整できません'
      );
      return runtime.writeJsonArtifact(request, 'patch_json', runtime.buildPatch(editPlanRef.uri));
    },

    render_video: async ({ request, state }) => {
      const editPlan = await runtime.readRequestOutputArtifact<EditPlanArtifact>(
        state,
        request,
        'create_edit_plan',
        '編集案がないため動画生成できません'
      );
      return runtime.renderVideo(request, editPlan, state);
    }
  };
}
