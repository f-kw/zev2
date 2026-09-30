import {findById, type AgentRequest, type AgentRequestType, type FileRef, type FileRefKind, type Zev2State} from '@zev2/shared';
import type {
  ArtifactInfo,
  ClipCompositionArtifact,
  EditPlanArtifact,
  PatchArtifact,
  ThemeArtifact,
  TranscriptArtifact,
  WorkflowStepManifest
} from './workflow-artifacts.js';
import { assertJsonArtifactForKind } from './workflow-artifact-validation.js';
import {consumePreparedDigestPlanV001} from './digest-plan-consumption-v001.js';
import {registeredDigestDependencyV001} from './digest-plan-preparation-v001.js';
import { prepareDigestPlanV001, type DigestPlanPreparationDependenciesV001 } from './digest-plan-preparation-v001.js';

export type StepArtifactBuilder = (context: {
  request: AgentRequest;
  state: Zev2State;
}) => Promise<ArtifactInfo>;

export type WorkflowStepRuntime = {
  digestPlanPreparation?: DigestPlanPreparationDependenciesV001;
  prepareSourceVideo: (request: AgentRequest) => Promise<ArtifactInfo>;
  buildTranscript: (request: AgentRequest, state: Zev2State) => Promise<TranscriptArtifact>;
  buildThemeOptionsArtifact: (transcript: TranscriptArtifact, request: AgentRequest) => Promise<ThemeArtifact>;
  buildClipCompositionArtifact: (
    themes: ThemeArtifact,
    transcript: TranscriptArtifact,
    state: Zev2State,
    requestDraftId: string,
    requestPurpose?: string
  ) => ClipCompositionArtifact;
  buildEditPlanArtifact: (
    request: AgentRequest,
    composition: ClipCompositionArtifact,
    state: Zev2State
  ) => Promise<EditPlanArtifact>;
  buildPatch: (editPlanUri: string) => PatchArtifact;
  renderVideo: (request: AgentRequest, editPlan: EditPlanArtifact, state: Zev2State) => Promise<ArtifactInfo>;
  requireRequestOutputFileRef: (
    state: Zev2State,
    request: AgentRequest,
    dependencyType: AgentRequestType,
    missingMessage: string
  ) => FileRef;
  readArtifactByUrl: <T>(uri: string) => Promise<T>;
  writeStepManifest: (request: AgentRequest, manifest: WorkflowStepManifest) => Promise<void>;
  writeJsonArtifact: (request: AgentRequest, kind: FileRefKind, payload: unknown) => Promise<ArtifactInfo>;
};

export function requireWorkflowRequestOutputFileRef(
  state: Zev2State, request: AgentRequest, dependencyType: AgentRequestType, missingMessage: string
): FileRef {
  const seen = new Set<string>();
  let dependency = findById(state.agentRequests,request.dependsOnAgentRequestId);
  while(dependency) {
    if(seen.has(dependency.id) || dependency.requestDraftId !== request.requestDraftId
      || dependency.input.productionType !== request.input.productionType) throw new Error('依存工程の参照が不正です');
    seen.add(dependency.id);
    if(dependency.type === dependencyType) {
      if(request.input.productionType === 'digest') return registeredDigestDependencyV001(state,dependency,
        dependencyType === 'prepare_digest_plan' ? 'digest_plan_json' : dependencyType === 'run_stt' ? 'transcript_json' : 'source_video');
      const ref=findById(state.fileRefs,dependency.result?.fileRefId);
      if(dependency.status !== 'succeeded' || !ref) throw new Error(missingMessage);
      return ref;
    }
    dependency=findById(state.agentRequests,dependency.dependsOnAgentRequestId);
  }
  throw new Error(missingMessage);
}

async function readValidatedRequestArtifact<T>(
  runtime: WorkflowStepRuntime,
  state: Zev2State,
  request: AgentRequest,
  dependencyType: AgentRequestType,
  kind: FileRefKind,
  missingMessage: string,
  label: string
): Promise<{
  artifact: T;
  input: WorkflowStepManifest['inputs'][number];
}> {
  const fileRef = runtime.requireRequestOutputFileRef(
    state,
    request,
    dependencyType,
    missingMessage
  );
  const artifact = await runtime.readArtifactByUrl<T>(fileRef.uri);
  assertJsonArtifactForKind(kind, artifact, label);
  return {
    artifact,
    input: {
      dependencyType,
      kind,
      uri: fileRef.uri,
      meaning: label
    }
  };
}

function requestOutputInputRef(
  runtime: WorkflowStepRuntime,
  state: Zev2State,
  request: AgentRequest,
  dependencyType: AgentRequestType,
  kind: FileRefKind,
  missingMessage: string,
  label: string
): WorkflowStepManifest['inputs'][number] {
  const fileRef = runtime.requireRequestOutputFileRef(
    state,
    request,
    dependencyType,
    missingMessage
  );

  return {
    dependencyType,
    kind,
    uri: fileRef.uri,
    meaning: label
  };
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

function modeFromPayload(payload: unknown): string | undefined {
  return payload && typeof payload === 'object' && 'mode' in payload && typeof payload.mode === 'string'
    ? payload.mode
    : undefined;
}

async function finishStep(
  runtime: WorkflowStepRuntime,
  request: AgentRequest,
  inputs: WorkflowStepManifest['inputs'],
  outputKind: FileRefKind,
  output: ArtifactInfo,
  outputMeaning: string
): Promise<ArtifactInfo> {
  await runtime.writeStepManifest(request, {
    kind: 'workflow_step_manifest',
    requestDraftId: request.requestDraftId,
    requestId: request.id,
    stepType: request.type,
    stepLabel: request.label,
    createdAt: new Date().toISOString(),
    mode: modeFromPayload(output.payload),
    inputs,
    outputs: [{
      kind: outputKind,
      uri: output.uri,
      mimeType: output.mimeType,
      access: output.access,
      meaning: outputMeaning
    }]
  });

  return output;
}

export function createStepArtifactBuilders(runtime: WorkflowStepRuntime): Record<AgentRequestType, StepArtifactBuilder> {
  return {
    prepare_video: async ({ request }) => finishStep(
      runtime,
      request,
      [],
      'source_video',
      await runtime.prepareSourceVideo(request),
      '後続工程が読める入力動画参照'
    ),

    run_stt: async ({ request, state }) => {
      const sourceInput = requestOutputInputRef(
        runtime,
        state,
        request,
        'prepare_video',
        'source_video',
        '入力動画参照がないため文字起こしできません',
        'STTが読む入力動画参照'
      );
      return finishStep(
        runtime,
        request,
        [sourceInput],
        'transcript_json',
        await writeValidatedJsonArtifact(
          runtime,
          request,
          'transcript_json',
          await runtime.buildTranscript(request, state),
          'STTが作った文字起こし成果物'
        ),
        '動画から発話ID付きで作った文字起こし'
      );
    },

    prepare_digest_plan: async ({request,state}) => {
      if(!runtime.digestPlanPreparation) throw new Error('Digest判断入力の接続がありません');
      const transcriptInput=await readValidatedRequestArtifact<TranscriptArtifact>(runtime,state,request,'run_stt','transcript_json',
        'Digestの保存STT参照がありません','Digest採否・保持が読む保存STT');
      const prepared=await prepareDigestPlanV001(runtime.digestPlanPreparation,{request,state,
        transcript:transcriptInput.artifact,transcriptUri:transcriptInput.input.uri});
      const output=await writeValidatedJsonArtifact(runtime,request,'digest_plan_json',prepared.artifact,'Digest採否・保持計画');
      output.dataBindings=prepared.artifact.dataBindings;
      return finishStep(runtime,request,[transcriptInput.input],'digest_plan_json',output,'承認依頼に束縛した採否・保持の保存参照');
    },
    validate_digest_plan: async ({request,state}) => {
      if(!runtime.digestPlanPreparation) throw new Error('Digest登録計画の読取接続がありません');
      const planInput=requestOutputInputRef(runtime,state,request,'prepare_digest_plan','digest_plan_json',
        '登録済みDigest計画がありません','検証が再読する登録計画');
      const result=await consumePreparedDigestPlanV001({preparation:{workspaceRoot:runtime.digestPlanPreparation.workspaceRoot,
        artifactRoot:runtime.digestPlanPreparation.artifactRoot}},{request,state});
      const output=await writeValidatedJsonArtifact(runtime,request,'digest_execution_input_json',result.artifact,'Digest入力検証結果');
      output.dataBindings=result.artifact.dataBindings;
      return finishStep(runtime,request,[planInput],'digest_execution_input_json',output,'計画整合と未接続・未承認の記録');
    },

    propose_clip_themes: async ({ request, state }) => {
      const transcriptInput = await readValidatedRequestArtifact<TranscriptArtifact>(
        runtime,
        state,
        request,
        'run_stt',
        'transcript_json',
        '文字起こし成果物がないためテーマを整理できません',
        'テーマ作成が読む文字起こし成果物'
      );
      return finishStep(
        runtime,
        request,
        [transcriptInput.input],
        'theme_json',
        await writeValidatedJsonArtifact(
          runtime,
          request,
          'theme_json',
          await runtime.buildThemeOptionsArtifact(transcriptInput.artifact, request),
          'テーマ作成が作ったテーマ成果物'
        ),
        'ユーザーが切り抜くテーマを選ぶための候補'
      );
    },

    build_clip_composition: async ({ request, state }) => {
      const transcriptInput = await readValidatedRequestArtifact<TranscriptArtifact>(
        runtime,
        state,
        request,
        'run_stt',
        'transcript_json',
        '文字起こし成果物がないため切り口と編集元場面を作れません',
        '切り口作成が読む文字起こし成果物'
      );
      const themesInput = await readValidatedRequestArtifact<ThemeArtifact>(
        runtime,
        state,
        request,
        'propose_clip_themes',
        'theme_json',
        'テーマ成果物がないため切り口と編集元場面を作れません',
        '切り口作成が読むテーマ成果物'
      );
      return finishStep(
        runtime,
        request,
        [transcriptInput.input, themesInput.input],
        'composition_json',
        await writeValidatedJsonArtifact(
          runtime,
          request,
          'composition_json',
          runtime.buildClipCompositionArtifact(
            themesInput.artifact,
            transcriptInput.artifact,
            state,
            request.requestDraftId,
            request.input.purpose
          ),
          '切り口作成が作った編集元場面成果物'
        ),
        '選ばれたテーマに関係する切り口と編集元場面'
      );
    },

    create_edit_plan: async ({ request, state }) => {
      const compositionInput = await readValidatedRequestArtifact<ClipCompositionArtifact>(
        runtime,
        state,
        request,
        'build_clip_composition',
        'composition_json',
        '切り口と編集元場面がないため演出案を作れません',
        '演出作成が読む切り口と編集元場面'
      );
      const sourceInput = requestOutputInputRef(
        runtime,
        state,
        request,
        'prepare_video',
        'source_video',
        '入力動画参照がないため演出案を作れません',
        '演出作成が参照する入力動画'
      );
      return finishStep(
        runtime,
        request,
        [compositionInput.input, sourceInput],
        'edit_plan_json',
        await writeValidatedJsonArtifact(
          runtime,
          request,
          'edit_plan_json',
          await runtime.buildEditPlanArtifact(request, compositionInput.artifact, state),
          '演出作成が作った編集案成果物'
        ),
        '切り口と編集元場面に画面枠とテロップを付けた編集案'
      );
    },

    apply_adjustment: async ({ request, state }) => {
      const editPlanInput = await readValidatedRequestArtifact<EditPlanArtifact>(
        runtime,
        state,
        request,
        'create_edit_plan',
        'edit_plan_json',
        '編集案がないため微調整できません',
        '微調整が読む編集案成果物'
      );
      return finishStep(
        runtime,
        request,
        [editPlanInput.input],
        'patch_json',
        await writeValidatedJsonArtifact(
          runtime,
          request,
          'patch_json',
          runtime.buildPatch(editPlanInput.input.uri),
          '微調整が作った調整結果成果物'
        ),
        '動画生成に渡す調整結果'
      );
    },

    render_video: async ({ request, state }) => {
      const editPlanInput = await readValidatedRequestArtifact<EditPlanArtifact>(
        runtime,
        state,
        request,
        'create_edit_plan',
        'edit_plan_json',
        '編集案がないため動画生成できません',
        '動画生成が読む編集案成果物'
      );
      const sourceInput = requestOutputInputRef(
        runtime,
        state,
        request,
        'prepare_video',
        'source_video',
        '入力動画参照がないため動画生成できません',
        '動画生成が読む入力動画参照'
      );
      return finishStep(
        runtime,
        request,
        [editPlanInput.input, sourceInput],
        'output_video',
        await runtime.renderVideo(request, editPlanInput.artifact, state),
        '編集案から生成した音声付きMP4'
      );
    }
  };
}
