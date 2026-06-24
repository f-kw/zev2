import type { AgentRequest, AgentRequestType, FileRef, FileRefKind, Zev2State } from '@zev2/shared';
import type {
  ArtifactInfo,
  ClipCompositionArtifact,
  EditPlanArtifact,
  PatchArtifact,
  ThemeArtifact,
  TranscriptArtifact
} from './workflow-artifacts.js';
import { assertJsonArtifactForKind } from './workflow-artifact-validation.js';

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

async function readValidatedRequestArtifact<T>(
  runtime: WorkflowStepRuntime,
  state: Zev2State,
  request: AgentRequest,
  dependencyType: AgentRequestType,
  kind: FileRefKind,
  missingMessage: string,
  label: string
): Promise<T> {
  const artifact = await runtime.readRequestOutputArtifact<T>(
    state,
    request,
    dependencyType,
    missingMessage
  );
  assertJsonArtifactForKind(kind, artifact, label);
  return artifact;
}

async function writeValidatedJsonArtifact(
  runtime: WorkflowStepRuntime,
  request: AgentRequest,
  kind: FileRefKind,
  payload: unknown,
  label: string
): Promise<ArtifactInfo> {
  assertJsonArtifactForKind(kind, payload, label);
  return runtime.writeJsonArtifact(request, kind, payload);
}

export function createStepArtifactBuilders(runtime: WorkflowStepRuntime): Record<AgentRequestType, StepArtifactBuilder> {
  return {
    prepare_video: async ({ request }) => runtime.prepareSourceVideo(request),

    run_stt: async ({ request, state }) =>
      writeValidatedJsonArtifact(
        runtime,
        request,
        'transcript_json',
        await runtime.buildTranscript(request, state),
        'STTが作った文字起こし成果物'
      ),

    propose_clip_themes: async ({ request, state }) => {
      const transcript = await readValidatedRequestArtifact<TranscriptArtifact>(
        runtime,
        state,
        request,
        'run_stt',
        'transcript_json',
        '文字起こし成果物がないためテーマ候補を作れません',
        'テーマ候補作成が読む文字起こし成果物'
      );
      return writeValidatedJsonArtifact(
        runtime,
        request,
        'theme_json',
        await runtime.buildThemeOptionsArtifact(transcript, request),
        'テーマ候補作成が作ったテーマ候補成果物'
      );
    },

    build_clip_composition: async ({ request, state }) => {
      const transcript = await readValidatedRequestArtifact<TranscriptArtifact>(
        runtime,
        state,
        request,
        'run_stt',
        'transcript_json',
        '文字起こし成果物がないため構成案を作れません',
        '複数箇所構成が読む文字起こし成果物'
      );
      const themes = await readValidatedRequestArtifact<ThemeArtifact>(
        runtime,
        state,
        request,
        'propose_clip_themes',
        'theme_json',
        'テーマ候補成果物がないため構成案を作れません',
        '複数箇所構成が読むテーマ候補成果物'
      );
      const selectedThemeId = runtime.selectedThemeIdFromState(state, request.requestDraftId, themes);
      return writeValidatedJsonArtifact(
        runtime,
        request,
        'composition_json',
        runtime.buildClipComposition(themes, transcript, selectedThemeId),
        '複数箇所構成が作った構成案成果物'
      );
    },

    create_edit_plan: async ({ request, state }) => {
      const composition = await readValidatedRequestArtifact<ClipCompositionArtifact>(
        runtime,
        state,
        request,
        'build_clip_composition',
        'composition_json',
        '複数箇所の構成案がないため演出案を作れません',
        '演出作成が読む構成案成果物'
      );
      return writeValidatedJsonArtifact(
        runtime,
        request,
        'edit_plan_json',
        await runtime.buildEditPlanArtifact(request, composition, state),
        '演出作成が作った編集案成果物'
      );
    },

    apply_adjustment: async ({ request, state }) => {
      const editPlanRef = runtime.requireRequestOutputFileRef(
        state,
        request,
        'create_edit_plan',
        '編集案がないため微調整できません'
      );
      return writeValidatedJsonArtifact(
        runtime,
        request,
        'patch_json',
        runtime.buildPatch(editPlanRef.uri),
        '微調整が作った調整結果成果物'
      );
    },

    render_video: async ({ request, state }) => {
      const editPlan = await readValidatedRequestArtifact<EditPlanArtifact>(
        runtime,
        state,
        request,
        'create_edit_plan',
        'edit_plan_json',
        '編集案がないため動画生成できません',
        '動画生成が読む編集案成果物'
      );
      return runtime.renderVideo(request, editPlan, state);
    }
  };
}
