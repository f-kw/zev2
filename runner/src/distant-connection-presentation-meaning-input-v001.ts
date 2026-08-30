import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

import {
  assertDistantConnectionEditPlanProjectionV001,
  type DistantConnectionEditPlanProjectionV001
} from './distant-connection-edit-plan-projection-v001.js';
import {
  assertDistantConnectionIntervalizationPlanV002,
  type DistantConnectionIntervalizationPlanV002
} from './distant-connection-intervalization-plan-v002.js';
import {
  assertSemanticUtteranceArtifactV001,
  type SemanticUtteranceArtifactV001,
  type SemanticUtteranceV001
} from './semantic-utterance-artifact-v001.js';

export const DISTANT_CONNECTION_PRESENTATION_MEANING_INPUT_SCHEMA_V001 =
  'distant-connection-presentation-meaning-input-v001';

export class DistantConnectionPresentationMeaningInputErrorV001 extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DistantConnectionPresentationMeaningInputErrorV001';
  }
}

type RecordValue = Record<string, unknown>;
type Binding = {path: string; schemaVersion: string; fileSha256: string};

export type DistantConnectionPresentationMeaningAtomV001 = {
  atomOccurrenceId: string;
  ordinal: number;
  text: string;
  semanticUtteranceId: string;
  retainedSpans: [{
    timelineSegmentId: 'segment-0001' | 'segment-0002';
    sourceStartMs: number;
    sourceEndMs: number;
  }];
};

export type DistantConnectionPresentationMeaningPartV001 = {
  part: 'first' | 'second';
  sourceInterval: {sourceStartMs: number; sourceEndMs: number};
  candidateSemanticUtteranceIds: string[];
  includedSemanticUtteranceIds: string[];
  atomOccurrenceIds: string[];
};

export type DistantConnectionPresentationMeaningInputV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_PRESENTATION_MEANING_INPUT_SCHEMA_V001;
  artifactId: string;
  sourceVideoId: string;
  candidateId: string;
  sourceBindings: {
    candidateResponse: Binding;
    semanticUtterance: Binding;
    intervalizationPlan: Binding;
    editPlanProjection: Binding;
    assemblyDecision: Binding;
  };
  orderedParts: [
    DistantConnectionPresentationMeaningPartV001,
    DistantConnectionPresentationMeaningPartV001
  ];
  atomOccurrences: DistantConnectionPresentationMeaningAtomV001[];
  captions: [{
    captionId: string;
    ordinal: 1;
    text: string;
    atomOccurrenceIds: string[];
  }];
  responsibilityPrinciple: string;
};

export type BuildDistantConnectionPresentationMeaningInputV001 = {
  artifactId: string;
  candidateId: string;
  candidateResponsePath: string;
  candidateResponseBytes: Uint8Array;
  expectedCandidateResponseSha256: string;
  semanticUtterancePath: string;
  semanticUtteranceBytes: Uint8Array;
  expectedSemanticUtteranceSha256: string;
  intervalizationPlanPath: string;
  intervalizationPlanBytes: Uint8Array;
  expectedIntervalizationPlanSha256: string;
  editPlanProjectionPath: string;
  editPlanProjectionBytes: Uint8Array;
  expectedEditPlanProjectionSha256: string;
  assemblyDecisionPath: string;
  assemblyDecisionBytes: Uint8Array;
  expectedAssemblyDecisionSha256: string;
};

export type BuildDistantConnectionPresentationMeaningInputFromFilesV001 = Omit<
  BuildDistantConnectionPresentationMeaningInputV001,
  | 'candidateResponseBytes'
  | 'semanticUtteranceBytes'
  | 'intervalizationPlanBytes'
  | 'editPlanProjectionBytes'
  | 'assemblyDecisionBytes'
> & {workspaceRoot: string};

const SHA256 = /^[0-9a-f]{64}$/u;
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const RESPONSIBILITY =
  '本成果物は正式候補と正式意味発話の本文・IDを、一般区間化計画、edit_plan_json projection、人間承認済み組立決定の前半→後半順で字幕意味入力へ無変更投影する。新しい意味判断、発話追加削除、要約、言い換え、区間補正、候補採否を行わない。';

function fail(message: string): never {
  throw new DistantConnectionPresentationMeaningInputErrorV001(message);
}

function isRecord(value: unknown): value is RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: RecordValue, keys: string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function formalBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parse(bytes: Uint8Array, label: string): RecordValue {
  try {
    const value: unknown = JSON.parse(Buffer.from(bytes).toString('utf8'));
    if (!isRecord(value)) fail(`${label}のrootがobjectではありません`);
    return value;
  } catch (error) {
    if (error instanceof DistantConnectionPresentationMeaningInputErrorV001) throw error;
    fail(`${label}がJSONとして読めません`);
  }
}

function checkedSha(bytes: Uint8Array, expected: string, label: string): string {
  const actual = sha256(bytes);
  if (!SHA256.test(expected) || actual !== expected) fail(`${label}のSHA-256が一致しません`);
  return actual;
}

function assertBinding(value: unknown, label: string): asserts value is Binding {
  if (!isRecord(value)
    || !exactKeys(value, ['path', 'schemaVersion', 'fileSha256'])
    || typeof value.path !== 'string'
    || value.path.length === 0
    || typeof value.schemaVersion !== 'string'
    || value.schemaVersion.length === 0
    || typeof value.fileSha256 !== 'string'
    || !SHA256.test(value.fileSha256)) fail(`${label}が不正です`);
}

function assertStringArray(value: unknown, label: string): asserts value is string[] {
  if (!Array.isArray(value)
    || value.length === 0
    || value.some((item) => typeof item !== 'string' || item.length === 0)
    || new Set(value).size !== value.length) fail(`${label}が空・不正・重複しています`);
}

function assertCandidateResponse(value: RecordValue): void {
  if (!exactKeys(value, ['schemaVersion', 'sourceVideoId', 'sourcePackageBinding', 'candidates'])
    || value.schemaVersion !== 'distant-connection-luna-response-v001'
    || typeof value.sourceVideoId !== 'string'
    || value.sourceVideoId.length === 0
    || !isRecord(value.sourcePackageBinding)
    || !Array.isArray(value.candidates)
    || value.candidates.length === 0) fail('正式候補成果物の形が不正です');
}

function resolveSourceVideoId(semantic: SemanticUtteranceArtifactV001): string {
  const basename = path.basename(semantic.sourceUri);
  const extension = path.extname(basename);
  const id = extension.length > 0 ? basename.slice(0, -extension.length) : basename;
  return id.length > 0 ? id : fail('正式意味発話から元動画IDを解決できません');
}

function assertAssemblyDecision(
  value: RecordValue,
  projection: DistantConnectionEditPlanProjectionV001,
  projectionPath: string,
  projectionSha: string
): void {
  if (!exactKeys(value, ['schemaVersion', 'decisionId', 'payload', 'approval'])
    || value.schemaVersion !== 'presentation-base-media-assembly-decision-v001'
    || typeof value.decisionId !== 'string'
    || !isRecord(value.payload)
    || !exactKeys(value.payload, [
      'basisEditPlan', 'sourceArtifact', 'segments', 'unresolvedEdits'
    ])
    || !isRecord(value.payload.basisEditPlan)
    || !exactKeys(value.payload.basisEditPlan, ['kind', 'path', 'fileSha256'])
    || value.payload.basisEditPlan.kind !== 'edit_plan_json'
    || value.payload.basisEditPlan.path !== projectionPath
    || value.payload.basisEditPlan.fileSha256 !== projectionSha
    || !Array.isArray(value.payload.segments)
    || value.payload.segments.length !== 2
    || !Array.isArray(value.payload.unresolvedEdits)
    || value.payload.unresolvedEdits.length !== 0
    || !isRecord(value.approval)
    || !exactKeys(value.approval, [
      'status', 'approverType', 'recordId', 'recordedAt', 'targetPayloadSha256'
    ])
    || value.approval.status !== 'approved'
    || value.approval.approverType !== 'human'
    || typeof value.approval.targetPayloadSha256 !== 'string'
    || value.approval.targetPayloadSha256 !== sha256(Buffer.from(
      canonicalJson(value.payload), 'utf8'
    ))) fail('projectionをbasisとする人間承認済み組立決定が不正です');
  for (const [index, segment] of value.payload.segments.entries()) {
    const projected = projection.segments[index];
    if (!isRecord(segment)
      || !exactKeys(segment, ['sourceStartMs', 'sourceEndMs'])
      || segment.sourceStartMs !== projected.sourceStartMs
      || segment.sourceEndMs !== projected.sourceEndMs) {
      fail('組立決定の区間がprojectionと一致しません');
    }
  }
}

function inspectSources(input: BuildDistantConnectionPresentationMeaningInputV001) {
  const candidateSha = checkedSha(
    input.candidateResponseBytes,
    input.expectedCandidateResponseSha256,
    '正式候補成果物'
  );
  const semanticSha = checkedSha(
    input.semanticUtteranceBytes,
    input.expectedSemanticUtteranceSha256,
    '正式意味発話成果物'
  );
  const planSha = checkedSha(
    input.intervalizationPlanBytes,
    input.expectedIntervalizationPlanSha256,
    '一般区間化計画'
  );
  const projectionSha = checkedSha(
    input.editPlanProjectionBytes,
    input.expectedEditPlanProjectionSha256,
    'edit_plan_json projection'
  );
  const assemblySha = checkedSha(
    input.assemblyDecisionBytes,
    input.expectedAssemblyDecisionSha256,
    '人間承認済み組立決定'
  );

  const candidateResponse = parse(input.candidateResponseBytes, '正式候補成果物');
  assertCandidateResponse(candidateResponse);
  const semantic = parse(input.semanticUtteranceBytes, '正式意味発話成果物');
  assertSemanticUtteranceArtifactV001(semantic);
  const plan = parse(input.intervalizationPlanBytes, '一般区間化計画');
  assertDistantConnectionIntervalizationPlanV002(plan);
  const projection = parse(input.editPlanProjectionBytes, 'edit_plan_json projection');
  assertDistantConnectionEditPlanProjectionV001(projection);
  const assemblyDecision = parse(input.assemblyDecisionBytes, '人間承認済み組立決定');

  const sourceVideoId = resolveSourceVideoId(semantic);
  if (candidateResponse.sourceVideoId !== sourceVideoId
    || plan.sourceVideoId !== sourceVideoId
    || projection.sourceVideoId !== sourceVideoId
    || projection.candidateId !== input.candidateId) fail('5正本の元動画IDまたはcandidate IDが一致しません');
  if (plan.sourceBindings.candidateResponse.path !== input.candidateResponsePath
    || plan.sourceBindings.candidateResponse.fileSha256 !== candidateSha
    || plan.sourceBindings.semanticUtterance.path !== input.semanticUtterancePath
    || plan.sourceBindings.semanticUtterance.fileSha256 !== semanticSha
    || projection.sourceBindings.intervalizationPlan.path !== input.intervalizationPlanPath
    || projection.sourceBindings.intervalizationPlan.fileSha256 !== planSha
    || projection.sourceBindings.candidateResponse.path !== input.candidateResponsePath
    || projection.sourceBindings.candidateResponse.fileSha256 !== candidateSha
    || projection.sourceBindings.semanticUtterance.path !== input.semanticUtterancePath
    || projection.sourceBindings.semanticUtterance.fileSha256 !== semanticSha) {
    fail('正式候補・正式意味発話・一般区間化計画・projectionのbindingが一致しません');
  }
  assertAssemblyDecision(
    assemblyDecision,
    projection,
    input.editPlanProjectionPath,
    projectionSha
  );

  const candidates = candidateResponse.candidates as RecordValue[];
  const matches = candidates.filter((row) => isRecord(row) && row.candidateId === input.candidateId);
  const planned = plan.candidates.filter((row) => row.candidateId === input.candidateId);
  if (matches.length !== 1 || planned.length !== 1) fail('対象candidateが欠落または重複しています');
  const candidate = matches[0];
  if (!exactKeys(candidate, [
    'candidateId', 'anchorId', 'firstPartSemanticUtteranceIds',
    'secondPartSemanticUtteranceIds', 'addedUnderstanding', 'direction'
  ])) fail('対象candidateに余分または欠落fieldがあります');
  assertStringArray(candidate.firstPartSemanticUtteranceIds, 'candidate前半発話ID');
  assertStringArray(candidate.secondPartSemanticUtteranceIds, 'candidate後半発話ID');

  const plannedCandidate = planned[0];
  const parts = [plannedCandidate.firstPart, plannedCandidate.secondPart] as const;
  const candidateParts = [
    candidate.firstPartSemanticUtteranceIds,
    candidate.secondPartSemanticUtteranceIds
  ] as const;
  const byId = new Map(semantic.utterances.map((row) => [row.utteranceId, row]));
  const partRows: [SemanticUtteranceV001[], SemanticUtteranceV001[]] = [[], []];
  for (const [index, part] of parts.entries()) {
    const projected = projection.segments[index];
    if (projected.part !== (index === 0 ? 'first' : 'second')
      || projected.sourceStartMs !== part.sourceStartMs
      || projected.sourceEndMs !== part.sourceEndMs
      || JSON.stringify(projected.includedSemanticUtteranceIds)
        !== JSON.stringify(part.includedSemanticUtteranceIds)
      || JSON.stringify(plannedCandidate.formalCandidate[
        index === 0 ? 'firstPartSemanticUtteranceIds' : 'secondPartSemanticUtteranceIds'
      ]) !== JSON.stringify(candidateParts[index])) fail('候補・計画・projectionの発話または区間が一致しません');
    const rows = part.includedSemanticUtteranceIds.map((id) =>
      byId.get(id) ?? fail(`未知の正式発話ID ${id} です`));
    if (rows.some((row, rowIndex) =>
      row.sourceStartMs < part.sourceStartMs
      || row.sourceEndMs > part.sourceEndMs
      || (rowIndex > 0 && row.ordinal <= rows[rowIndex - 1].ordinal))) {
      fail('正式発話が承認済み区間外または時系列逆転です');
    }
    if (!(candidateParts[index] as string[]).every((id) =>
      part.includedSemanticUtteranceIds.includes(id))) fail('区間計画が正式候補発話を包含していません');
    partRows[index] = rows;
  }
  if (partRows[0].at(-1)!.ordinal >= partRows[1][0].ordinal) fail('前半→後半の順序が不正です');

  return {
    sourceVideoId,
    candidateResponse,
    semantic,
    plan,
    projection,
    assemblyDecision,
    hashes: {candidateSha, semanticSha, planSha, projectionSha, assemblySha},
    candidate,
    plannedCandidate,
    partRows
  };
}

export function buildDistantConnectionPresentationMeaningInputV001(
  input: BuildDistantConnectionPresentationMeaningInputV001
): DistantConnectionPresentationMeaningInputV001 {
  if (!FORMAL_ID.test(input.artifactId) || !FORMAL_ID.test(input.candidateId)) {
    fail('artifact IDまたはcandidate IDが不正です');
  }
  const inspected = inspectSources(input);
  const atomOccurrences: DistantConnectionPresentationMeaningAtomV001[] = [];
  const orderedParts = inspected.partRows.map((rows, partIndex) => {
    const part = partIndex === 0 ? 'first' : 'second';
    const plannedPart = partIndex === 0
      ? inspected.plannedCandidate.firstPart
      : inspected.plannedCandidate.secondPart;
    const atomOccurrenceIds = rows.map((row) => {
      const atomOccurrenceId = `${input.artifactId}-atom-${String(
        atomOccurrences.length + 1
      ).padStart(6, '0')}`;
      atomOccurrences.push({
        atomOccurrenceId,
        ordinal: atomOccurrences.length + 1,
        text: row.text,
        semanticUtteranceId: row.utteranceId,
        retainedSpans: [{
          timelineSegmentId: partIndex === 0 ? 'segment-0001' : 'segment-0002',
          sourceStartMs: row.sourceStartMs,
          sourceEndMs: row.sourceEndMs
        }]
      });
      return atomOccurrenceId;
    });
    return {
      part,
      sourceInterval: {
        sourceStartMs: plannedPart.sourceStartMs,
        sourceEndMs: plannedPart.sourceEndMs
      },
      candidateSemanticUtteranceIds: [...(
        partIndex === 0
          ? inspected.candidate.firstPartSemanticUtteranceIds as string[]
          : inspected.candidate.secondPartSemanticUtteranceIds as string[]
      )],
      includedSemanticUtteranceIds: [...plannedPart.includedSemanticUtteranceIds],
      atomOccurrenceIds
    } as DistantConnectionPresentationMeaningPartV001;
  }) as [DistantConnectionPresentationMeaningPartV001, DistantConnectionPresentationMeaningPartV001];

  const artifact: DistantConnectionPresentationMeaningInputV001 = {
    schemaVersion: DISTANT_CONNECTION_PRESENTATION_MEANING_INPUT_SCHEMA_V001,
    artifactId: input.artifactId,
    sourceVideoId: inspected.sourceVideoId,
    candidateId: input.candidateId,
    sourceBindings: {
      candidateResponse: {
        path: input.candidateResponsePath,
        schemaVersion: inspected.candidateResponse.schemaVersion as string,
        fileSha256: inspected.hashes.candidateSha
      },
      semanticUtterance: {
        path: input.semanticUtterancePath,
        schemaVersion: inspected.semantic.schemaVersion,
        fileSha256: inspected.hashes.semanticSha
      },
      intervalizationPlan: {
        path: input.intervalizationPlanPath,
        schemaVersion: inspected.plan.schemaVersion,
        fileSha256: inspected.hashes.planSha
      },
      editPlanProjection: {
        path: input.editPlanProjectionPath,
        schemaVersion: inspected.projection.schemaVersion,
        fileSha256: inspected.hashes.projectionSha
      },
      assemblyDecision: {
        path: input.assemblyDecisionPath,
        schemaVersion: inspected.assemblyDecision.schemaVersion as string,
        fileSha256: inspected.hashes.assemblySha
      }
    },
    orderedParts,
    atomOccurrences,
    captions: [{
      captionId: `${input.artifactId}-caption-000001`,
      ordinal: 1,
      text: atomOccurrences.map((row) => row.text).join(''),
      atomOccurrenceIds: atomOccurrences.map((row) => row.atomOccurrenceId)
    }],
    responsibilityPrinciple: RESPONSIBILITY
  };
  assertDistantConnectionPresentationMeaningInputV001(artifact);
  return artifact;
}

export function assertDistantConnectionPresentationMeaningInputV001(
  value: unknown
): asserts value is DistantConnectionPresentationMeaningInputV001 {
  if (!isRecord(value)
    || !exactKeys(value, [
      'schemaVersion', 'artifactId', 'sourceVideoId', 'candidateId', 'sourceBindings',
      'orderedParts', 'atomOccurrences', 'captions', 'responsibilityPrinciple'
    ])
    || value.schemaVersion !== DISTANT_CONNECTION_PRESENTATION_MEANING_INPUT_SCHEMA_V001
    || typeof value.artifactId !== 'string'
    || !FORMAL_ID.test(value.artifactId)
    || typeof value.sourceVideoId !== 'string'
    || value.sourceVideoId.length === 0
    || typeof value.candidateId !== 'string'
    || !FORMAL_ID.test(value.candidateId)
    || !isRecord(value.sourceBindings)
    || !exactKeys(value.sourceBindings, [
      'candidateResponse', 'semanticUtterance', 'intervalizationPlan',
      'editPlanProjection', 'assemblyDecision'
    ])) fail('正式字幕意味入力のrootまたはbindingが不正です');
  for (const [key, binding] of Object.entries(value.sourceBindings)) {
    assertBinding(binding, `sourceBindings.${key}`);
  }
  if (!Array.isArray(value.orderedParts)
    || value.orderedParts.length !== 2
    || !Array.isArray(value.atomOccurrences)
    || value.atomOccurrences.length === 0
    || !Array.isArray(value.captions)
    || value.captions.length !== 1
    || value.responsibilityPrinciple !== RESPONSIBILITY) fail('正式字幕意味入力の内容が不正です');

  const atomIds = new Set<string>();
  const semanticIds = new Set<string>();
  for (const [index, atom] of value.atomOccurrences.entries()) {
    if (!isRecord(atom)
      || !exactKeys(atom, [
        'atomOccurrenceId', 'ordinal', 'text', 'semanticUtteranceId', 'retainedSpans'
      ])
      || typeof atom.atomOccurrenceId !== 'string'
      || !FORMAL_ID.test(atom.atomOccurrenceId)
      || atomIds.has(atom.atomOccurrenceId)
      || atom.ordinal !== index + 1
      || typeof atom.text !== 'string'
      || atom.text.length === 0
      || typeof atom.semanticUtteranceId !== 'string'
      || semanticIds.has(atom.semanticUtteranceId)
      || !Array.isArray(atom.retainedSpans)
      || atom.retainedSpans.length !== 1) fail(`正式字幕atom ${index + 1}件目が不正です`);
    const span = atom.retainedSpans[0];
    if (!isRecord(span)
      || !exactKeys(span, ['timelineSegmentId', 'sourceStartMs', 'sourceEndMs'])
      || !['segment-0001', 'segment-0002'].includes(span.timelineSegmentId as string)
      || !Number.isSafeInteger(span.sourceStartMs)
      || !Number.isSafeInteger(span.sourceEndMs)
      || (span.sourceEndMs as number) <= (span.sourceStartMs as number)) fail('正式字幕atomの時刻が不正です');
    atomIds.add(atom.atomOccurrenceId);
    semanticIds.add(atom.semanticUtteranceId);
  }

  let previousOrdinal = 0;
  const coveredAtoms: string[] = [];
  for (const [index, part] of value.orderedParts.entries()) {
    const expectedPart = index === 0 ? 'first' : 'second';
    if (!isRecord(part)
      || !exactKeys(part, [
        'part', 'sourceInterval', 'candidateSemanticUtteranceIds',
        'includedSemanticUtteranceIds', 'atomOccurrenceIds'
      ])
      || part.part !== expectedPart
      || !isRecord(part.sourceInterval)
      || !exactKeys(part.sourceInterval, ['sourceStartMs', 'sourceEndMs'])) fail('前半・後半の正式字幕入力が不正です');
    assertStringArray(part.candidateSemanticUtteranceIds, `${expectedPart}候補発話ID`);
    assertStringArray(part.includedSemanticUtteranceIds, `${expectedPart}包含発話ID`);
    assertStringArray(part.atomOccurrenceIds, `${expectedPart}字幕atom ID`);
    if (!(part.candidateSemanticUtteranceIds as string[]).every((id) =>
      (part.includedSemanticUtteranceIds as string[]).includes(id))) fail('候補発話が区間発話に包含されていません');
    for (const atomId of part.atomOccurrenceIds as string[]) {
      const atom = value.atomOccurrences.find((row) => row.atomOccurrenceId === atomId);
      if (!atom || atom.ordinal <= previousOrdinal
        || atom.retainedSpans[0].timelineSegmentId !== `segment-000${index + 1}`
        || atom.retainedSpans[0].sourceStartMs < (part.sourceInterval.sourceStartMs as number)
        || atom.retainedSpans[0].sourceEndMs > (part.sourceInterval.sourceEndMs as number)) {
        fail('前半・後半のatom被覆または時系列が不正です');
      }
      previousOrdinal = atom.ordinal;
      coveredAtoms.push(atomId);
    }
  }
  if (JSON.stringify(coveredAtoms)
    !== JSON.stringify(value.atomOccurrences.map((row) => row.atomOccurrenceId))) {
    fail('全字幕atomを前半・後半でちょうど1回被覆していません');
  }
  const caption = value.captions[0];
  if (!isRecord(caption)
    || !exactKeys(caption, ['captionId', 'ordinal', 'text', 'atomOccurrenceIds'])
    || typeof caption.captionId !== 'string'
    || !FORMAL_ID.test(caption.captionId)
    || caption.ordinal !== 1
    || caption.text !== value.atomOccurrences.map((row) => row.text).join('')
    || JSON.stringify(caption.atomOccurrenceIds) !== JSON.stringify(coveredAtoms)) {
    fail('captionが正式字幕atomの全文・順序と一致しません');
  }
}

export function serializeDistantConnectionPresentationMeaningInputV001(
  value: DistantConnectionPresentationMeaningInputV001
): Buffer {
  assertDistantConnectionPresentationMeaningInputV001(value);
  return formalBytes(value);
}

export function decodeDistantConnectionPresentationMeaningInputV001(
  bytes: Uint8Array
): DistantConnectionPresentationMeaningInputV001 {
  const value = parse(bytes, '正式字幕意味入力');
  assertDistantConnectionPresentationMeaningInputV001(value);
  if (!formalBytes(value).equals(Buffer.from(bytes))) fail('正式字幕意味入力がformal byteではありません');
  return value;
}

export async function buildDistantConnectionPresentationMeaningInputFromFilesV001(
  input: BuildDistantConnectionPresentationMeaningInputFromFilesV001
): Promise<DistantConnectionPresentationMeaningInputV001> {
  const read = (relativePath: string) => readFile(path.join(input.workspaceRoot, relativePath));
  const [candidateResponseBytes, semanticUtteranceBytes, intervalizationPlanBytes,
    editPlanProjectionBytes, assemblyDecisionBytes] = await Promise.all([
    read(input.candidateResponsePath),
    read(input.semanticUtterancePath),
    read(input.intervalizationPlanPath),
    read(input.editPlanProjectionPath),
    read(input.assemblyDecisionPath)
  ]);
  return buildDistantConnectionPresentationMeaningInputV001({
    ...input,
    candidateResponseBytes,
    semanticUtteranceBytes,
    intervalizationPlanBytes,
    editPlanProjectionBytes,
    assemblyDecisionBytes
  });
}

export function validateDistantConnectionPresentationMeaningInputAgainstSourcesV001(
  artifact: DistantConnectionPresentationMeaningInputV001,
  input: BuildDistantConnectionPresentationMeaningInputV001
): void {
  const rebuilt = buildDistantConnectionPresentationMeaningInputV001(input);
  if (!serializeDistantConnectionPresentationMeaningInputV001(artifact).equals(
    serializeDistantConnectionPresentationMeaningInputV001(rebuilt)
  )) fail('正式字幕意味入力が5正本からの決定的再生成結果と一致しません');
}
