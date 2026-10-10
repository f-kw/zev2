export type J16TextBindingV001 = Readonly<{text: string; sha256: string; bytes: number}>;
export type J16ChoiceValueV001 = 'normal' | 'effect' | 'unresolved';
export type J16WireAnswerV001 = {localCaptionId: string; outcome: 'choice'; choice: J16ChoiceValueV001;
 confidence: number; probabilities: Array<{value: J16ChoiceValueV001; probability: number}>}
 | {localCaptionId: string; outcome: 'refusal'; choice: null};
export type J16ScenePacketV001 = Readonly<{sceneId: string; captionIndices: number[];
 source: J16TextBindingV001; request: J16TextBindingV001}>;
export type J16StageBatchV001 = J16ScenePacketV001 & {response: J16TextBindingV001};
export type J16StageInputV001 = Readonly<{schemaVersion: 'presentation-j16-stage-input-v001'; mode: 'mock';
 originalInput: J16TextBindingV001; inputSha256: string; targetCaptionIds: string[]; batches: J16StageBatchV001[];
 decisions: J16WireAnswerV001[]; missingCaptionIds: string[]; issues: Array<{batchIndex?: number; captionId?: string; code: string}>;
 status: 'held' | 'ready-for-details'; instruction: string; stageInputSha256: string}>;
export const J16_STAGE_ORIGIN_V001: 'openai-j16-staged-v001';
export const J16_MODEL_V001: 'gpt-6-luna';
export const J16_VALUES_V001: readonly J16ChoiceValueV001[];
export function bindJ16TextV001(text: string): J16TextBindingV001;
export function projectJ16SceneV001(input: Record<string, any>, sceneId: string): Record<string, any>;
export function buildJ16RequestSnapshotV001(source: Uint8Array,
 binding: {sha256: string; bytes: number; captionIds: readonly string[]}, indices?: readonly number[]): Readonly<{
 sourceSha256: string; sourceBytes: number; requestSha256: string; localCaptionIds: readonly string[];
 body: Readonly<{model: string; input: string; questions: readonly {type: 'choice'; name: string; instructions: string;
 choices: {value: J16ChoiceValueV001; description: string}[]}[]}>}>;
export function validateJ16AnswerRowsV001(ids: readonly string[], response: unknown): J16WireAnswerV001[];
export function createJ16ScenePacketV001(input: J16TextBindingV001, sceneId: string, indices?: readonly number[]): J16ScenePacketV001;
export function createJ16StageInputV001(options: {originalInput: J16TextBindingV001; batches: readonly J16StageBatchV001[]}): J16StageInputV001;
export function readJ16StageDetailsV001(stage: J16AnyStageInputV001, reply: J16TextBindingV001): string;
export function assertJ16StagedOriginV001(options: {input: Record<string, any>; replyBytes: string;
 origin: {kind: typeof J16_STAGE_ORIGIN_V001; stageInput: J16AnyStageInputV001; stageReply: J16TextBindingV001}}): true;

export type J16RawBindingV001 = Readonly<{base64: string; sha256: string; bytes: number}>;
export type J16LiveStageBatchV001 = J16ScenePacketV001 & {response: J16RawBindingV001;
 attempt: J16TextBindingV001; transport: J16TextBindingV001};
export type J16LiveStageInputV001 = Readonly<Omit<J16StageInputV001, 'schemaVersion' | 'mode' | 'batches'> & {
 schemaVersion: 'presentation-j16-live-stage-input-v001'; mode: 'live';
 authorization: J16TextBindingV001; requestManifest: J16TextBindingV001;
 batches: J16LiveStageBatchV001[]; unattemptedSceneIds: string[]}>;
export type J16AnyStageInputV001 = J16StageInputV001 | J16LiveStageInputV001;
export function bindJ16RawV001(bytes: Uint8Array): J16RawBindingV001;
export function createJ16LiveStageInputV001(options: {originalInput: J16TextBindingV001;
 authorization: J16TextBindingV001; requestManifest: J16TextBindingV001;
 batches: readonly J16LiveStageBatchV001[]}): J16LiveStageInputV001;
export function replayJ16StageInputV001(stage: J16AnyStageInputV001): J16AnyStageInputV001;
