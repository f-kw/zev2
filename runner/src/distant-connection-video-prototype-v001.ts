import {createHash} from 'node:crypto';

import {
  decodeDistantConnectionLunaResponseV001,
  decodeDistantConnectionLunaSourcePackageV001,
  type DistantConnectionCandidateV001
} from './distant-connection-luna-source-package-v001.js';
import {
  assertSemanticUtteranceArtifactV001,
  type SemanticUtteranceArtifactV001,
  type SemanticUtteranceV001
} from './semantic-utterance-artifact-v001.js';

export const DISTANT_CONNECTION_VIDEO_PROTOTYPE_PLAN_SCHEMA_V001 =
  'distant-connection-video-prototype-plan-v001';

export class DistantConnectionVideoPrototypeErrorV001 extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DistantConnectionVideoPrototypeErrorV001';
  }
}

export type DistantConnectionVideoCaptionCueV001 = {
  cueId: string;
  part: 'first' | 'second';
  text: string;
  semanticUtteranceIds: string[];
  sourceUnits: Array<{semanticUtteranceId: string; text: string}>;
  sourceStartMs: number;
  sourceEndMs: number;
};

export type DistantConnectionVideoPartV001 = {
  sourceStartMs: number;
  sourceEndMs: number;
  text: string;
  semanticUtteranceIds: string[];
  sourceSegmentIds: number[];
  boundaryDecision: 'candidate-selected-formal-utterance-closure';
};

export type DistantConnectionVideoCandidatePlanV001 = {
  candidateId: string;
  anchorId: string;
  direction: 'past' | 'future';
  addedUnderstanding: string;
  firstPart: DistantConnectionVideoPartV001;
  secondPart: DistantConnectionVideoPartV001;
  gapMs: number;
  outputDurationMs: number;
  captions: DistantConnectionVideoCaptionCueV001[];
};

export type DistantConnectionVideoPrototypePlanV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_VIDEO_PROTOTYPE_PLAN_SCHEMA_V001;
  sourceVideoId: string;
  sourceVideoBinding: {path: string; fileSha256: string};
  candidateResponseBinding: {path: string; fileSha256: string};
  semanticUtteranceBinding: {path: string; fileSha256: string};
  sourcePackageBinding: {path: string; fileSha256: string};
  intervalPolicy: {
    selection: 'candidate-selected-formal-utterance-closure';
    expansionApplied: false;
    reason: string;
  };
  captionLayoutPolicy: {
    characterWidthRule: string;
    maxLogicalWidthPerLine: number;
    maxLines: number;
  };
  candidates: DistantConnectionVideoCandidatePlanV001[];
};

type BuildInput = {
  candidateResponsePath: string;
  candidateResponseBytes: Uint8Array;
  expectedCandidateResponseSha256: string;
  semanticUtterancePath: string;
  semanticUtteranceBytes: Uint8Array;
  expectedSemanticUtteranceSha256: string;
  sourcePackagePath: string;
  sourcePackageBytes: Uint8Array;
  sourceVideoPath: string;
  sourceVideoSha256: string;
  expectedSourceVideoSha256: string;
  maxLogicalWidthPerLine: number;
  maxLines: number;
  characterWidthRule: string;
};

const SHA256 = /^[0-9a-f]{64}$/u;
const WIDTH_RULE = 'U+0000..U+00FF=1; other Unicode code point=2';

function fail(message: string): never {
  throw new DistantConnectionVideoPrototypeErrorV001(message);
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function parseJson(bytes: Uint8Array, label: string): unknown {
  try {
    return JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch {
    fail(`${label}がJSONとして読めません`);
  }
}

function logicalWidth(text: string, rule: string): number {
  if (rule !== WIDTH_RULE) fail('既存rendererと異なる文字幅規則は使用できません');
  return Array.from(text).reduce(
    (total, character) => total + (/^[\u0000-\u00ff]$/u.test(character) ? 1 : 2),
    0
  );
}

function resolvePart(
  candidateId: string,
  part: 'first' | 'second',
  ids: string[],
  byId: Map<string, SemanticUtteranceV001>
): {part: DistantConnectionVideoPartV001; utterances: SemanticUtteranceV001[]} {
  const utterances = ids.map((id) => byId.get(id)
    ?? fail(`${candidateId}の${part}が未知の正式発話ID ${id} を参照しています`));
  if (utterances.length === 0) fail(`${candidateId}の${part}が空です`);
  for (let index = 1; index < utterances.length; index += 1) {
    if (utterances[index].ordinal !== utterances[index - 1].ordinal + 1) {
      fail(`${candidateId}の${part}が連続する正式発話範囲ではありません`);
    }
  }
  const first = utterances[0];
  const last = utterances.at(-1)!;
  return {
    utterances,
    part: {
      sourceStartMs: first.sourceStartMs,
      sourceEndMs: last.sourceEndMs,
      text: utterances.map((row) => row.text).join(''),
      semanticUtteranceIds: ids,
      sourceSegmentIds: utterances.flatMap((row) => row.sourceSegmentIds),
      boundaryDecision: 'candidate-selected-formal-utterance-closure'
    }
  };
}

function buildCaptions(
  candidateId: string,
  part: 'first' | 'second',
  utterances: SemanticUtteranceV001[],
  maxCueWidth: number,
  characterWidthRule: string
): DistantConnectionVideoCaptionCueV001[] {
  const groups: SemanticUtteranceV001[][] = [];
  let group: SemanticUtteranceV001[] = [];
  let width = 0;
  const flush = () => {
    if (group.length > 0) groups.push(group);
    group = [];
    width = 0;
  };
  for (const utterance of utterances) {
    const nextWidth = logicalWidth(utterance.text, characterWidthRule);
    if (nextWidth > maxCueWidth) {
      fail(`${candidateId}の正式発話1件が既存字幕の最大論理幅を超えています`);
    }
    const previous = group.at(-1);
    const hasSourcePause = previous !== undefined && utterance.sourceStartMs > previous.sourceEndMs;
    if (group.length > 0 && (width + nextWidth > maxCueWidth || hasSourcePause)) flush();
    group.push(utterance);
    width += nextWidth;
  }
  flush();
  return groups.map((rows, index) => ({
    cueId: `${candidateId}-${part}-caption-${String(index + 1).padStart(3, '0')}`,
    part,
    text: rows.map((row) => row.text).join(''),
    semanticUtteranceIds: rows.map((row) => row.utteranceId),
    sourceUnits: rows.map((row) => ({
      semanticUtteranceId: row.utteranceId,
      text: row.text
    })),
    sourceStartMs: rows[0].sourceStartMs,
    sourceEndMs: rows.at(-1)!.sourceEndMs
  }));
}

function buildCandidate(
  candidate: DistantConnectionCandidateV001,
  byId: Map<string, SemanticUtteranceV001>,
  maxCueWidth: number,
  characterWidthRule: string
): DistantConnectionVideoCandidatePlanV001 {
  const first = resolvePart(
    candidate.candidateId,
    'first',
    candidate.firstPartSemanticUtteranceIds,
    byId
  );
  const second = resolvePart(
    candidate.candidateId,
    'second',
    candidate.secondPartSemanticUtteranceIds,
    byId
  );
  if (second.part.sourceStartMs <= first.part.sourceEndMs) {
    fail(`${candidate.candidateId}の前半と後半が時間的に離れていません`);
  }
  return {
    candidateId: candidate.candidateId,
    anchorId: candidate.anchorId,
    direction: candidate.direction,
    addedUnderstanding: candidate.addedUnderstanding,
    firstPart: first.part,
    secondPart: second.part,
    gapMs: second.part.sourceStartMs - first.part.sourceEndMs,
    outputDurationMs:
      (first.part.sourceEndMs - first.part.sourceStartMs)
      + (second.part.sourceEndMs - second.part.sourceStartMs),
    captions: [
      ...buildCaptions(
        candidate.candidateId,
        'first',
        first.utterances,
        maxCueWidth,
        characterWidthRule
      ),
      ...buildCaptions(
        candidate.candidateId,
        'second',
        second.utterances,
        maxCueWidth,
        characterWidthRule
      )
    ]
  };
}

export function buildDistantConnectionVideoPrototypePlanV001(
  input: BuildInput
): DistantConnectionVideoPrototypePlanV001 {
  const candidateSha = sha256(input.candidateResponseBytes);
  const semanticSha = sha256(input.semanticUtteranceBytes);
  const sourcePackageSha = sha256(input.sourcePackageBytes);
  if (candidateSha !== input.expectedCandidateResponseSha256) {
    fail('正式候補成果物のSHA-256が指定正本と一致しません');
  }
  if (semanticSha !== input.expectedSemanticUtteranceSha256) {
    fail('正式意味発話成果物のSHA-256が指定正本と一致しません');
  }
  if (!SHA256.test(input.sourceVideoSha256)
    || input.sourceVideoSha256 !== input.expectedSourceVideoSha256) {
    fail('元動画のSHA-256が指定正本と一致しません');
  }
  if (!Number.isSafeInteger(input.maxLogicalWidthPerLine)
    || input.maxLogicalWidthPerLine <= 0
    || !Number.isSafeInteger(input.maxLines)
    || input.maxLines <= 0) {
    fail('既存字幕の行幅または行数が不正です');
  }

  const semantic = parseJson(
    input.semanticUtteranceBytes,
    '正式意味発話成果物'
  ) as SemanticUtteranceArtifactV001;
  assertSemanticUtteranceArtifactV001(semantic);
  if (semantic.sourceUri !== input.sourceVideoPath) {
    fail('正式意味発話が指定元動画を参照していません');
  }
  const sourcePackage = decodeDistantConnectionLunaSourcePackageV001(input.sourcePackageBytes);
  if (sourcePackage.semanticUtteranceBinding.path !== input.semanticUtterancePath
    || sourcePackage.semanticUtteranceBinding.fileSha256 !== semanticSha
    || sourcePackage.sourceVideoId !== 'ymUsGrT6EaA') {
    fail('Luna正式入力が指定された実配信の正式意味発話を束縛していません');
  }
  const response = decodeDistantConnectionLunaResponseV001(input.candidateResponseBytes, {
    sourcePackagePath: input.sourcePackagePath,
    sourcePackageBytes: input.sourcePackageBytes
  });
  if (response.sourceVideoId !== sourcePackage.sourceVideoId || response.candidates.length !== 2) {
    fail('動画試作対象は実配信の正式候補2件である必要があります');
  }
  const byId = new Map(semantic.utterances.map((row) => [row.utteranceId, row]));
  const maxCueWidth = input.maxLogicalWidthPerLine * input.maxLines;
  const candidates = response.candidates.map((candidate) => buildCandidate(
    candidate,
    byId,
    maxCueWidth,
    input.characterWidthRule
  ));
  return {
    schemaVersion: DISTANT_CONNECTION_VIDEO_PROTOTYPE_PLAN_SCHEMA_V001,
    sourceVideoId: response.sourceVideoId,
    sourceVideoBinding: {path: input.sourceVideoPath, fileSha256: input.sourceVideoSha256},
    candidateResponseBinding: {path: input.candidateResponsePath, fileSha256: candidateSha},
    semanticUtteranceBinding: {path: input.semanticUtterancePath, fileSha256: semanticSha},
    sourcePackageBinding: {path: input.sourcePackagePath, fileSha256: sourcePackageSha},
    intervalPolicy: {
      selection: 'candidate-selected-formal-utterance-closure',
      expansionApplied: false,
      reason: '両候補の前半・後半はいずれも連続する正式発話で意味が閉じており、追加文脈を発明せず候補範囲をそのまま使用する。'
    },
    captionLayoutPolicy: {
      characterWidthRule: input.characterWidthRule,
      maxLogicalWidthPerLine: input.maxLogicalWidthPerLine,
      maxLines: input.maxLines
    },
    candidates
  };
}

export function serializeDistantConnectionVideoPrototypePlanV001(
  plan: DistantConnectionVideoPrototypePlanV001
): Buffer {
  return Buffer.from(`${JSON.stringify(plan, null, 2)}\n`, 'utf8');
}
