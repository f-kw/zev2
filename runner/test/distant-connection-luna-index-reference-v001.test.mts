import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  DISTANT_CONNECTION_LUNA_INDEX_RESPONSE_SCHEMA_V001,
  DistantConnectionLunaIndexReferenceErrorV001,
  assertDistantConnectionLunaIndexResponseV001,
  buildDistantConnectionLunaIndexedModelInputV001,
  decodeDistantConnectionLunaIndexResponseV001,
  decodeDistantConnectionLunaIndexedModelInputV001,
  deriveDistantConnectionCandidateIdFromIndexReferenceV001,
  resolveDistantConnectionLunaIndexResponseFromBytesV001,
  serializeDistantConnectionLunaIndexResponseV001,
  serializeDistantConnectionLunaIndexedModelInputV001,
  validateDistantConnectionLunaIndexedModelInputAgainstSourceV001,
  type DistantConnectionLunaIndexCandidateV001,
  type DistantConnectionLunaIndexResponseV001
} from '../src/distant-connection-luna-index-reference-v001.js';
import {
  validateDistantConnectionLunaResponseV002
} from '../src/distant-connection-luna-source-package-v002.js';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const sourcePackagePath =
  'evals/clip_composition/outputs/'
  + 'work-distant-connection-luna-source-package-op-ed-rejection-feedback-ymUsGrT6EaA-v002/'
  + 'source-package-v002.json';

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

const fixturePromise = readFile(path.join(workspaceRoot, sourcePackagePath)).then(
  (sourcePackageBytes) => {
    const indexedModelInput = buildDistantConnectionLunaIndexedModelInputV001({
      sourcePackagePath,
      sourcePackageBytes
    });
    const indexedModelInputBytes = serializeDistantConnectionLunaIndexedModelInputV001(
      indexedModelInput
    );
    return {sourcePackageBytes, indexedModelInput, indexedModelInputBytes};
  }
);

function validCandidate(): DistantConnectionLunaIndexCandidateV001 {
  return {
    anchorIndex: 972,
    firstPartUtteranceIndexes: [1278],
    secondPartUtteranceIndexes: [1279],
    addedUnderstanding: '前半の具体的な出来事によって後半の反応の意味が増える。',
    direction: 'future'
  };
}

function validResponse(
  candidate: DistantConnectionLunaIndexCandidateV001 = validCandidate()
): DistantConnectionLunaIndexResponseV001 {
  return {
    schemaVersion: DISTANT_CONNECTION_LUNA_INDEX_RESPONSE_SCHEMA_V001,
    candidates: [candidate]
  };
}

function expectCode(code: string, action: () => unknown): void {
  assert.throws(action, (error: unknown) => (
    error instanceof DistantConnectionLunaIndexReferenceErrorV001 && error.code === code
  ));
}

test('SHA束縛したsource v002の全発話・全アンカーを別namespaceの0-based indexへ投影する', async () => {
  const {sourcePackageBytes, indexedModelInput, indexedModelInputBytes} = await fixturePromise;
  assert.equal(indexedModelInput.sourcePackageBinding.path, sourcePackagePath);
  assert.equal(indexedModelInput.sourcePackageBinding.fileSha256, sha256(sourcePackageBytes));
  assert.equal(indexedModelInput.indexBase, 0);
  assert.equal(indexedModelInput.utteranceCount, 10_723);
  assert.equal(indexedModelInput.utterances.length, 10_723);
  assert.equal(indexedModelInput.anchorCount, 4_442);
  assert.equal(indexedModelInput.anchors.length, 4_442);
  assert.deepEqual(indexedModelInput.anchors[972], {
    anchorIndex: 972,
    utteranceIndex: 1278
  });
  assert.equal(indexedModelInput.utterances[972]!.utteranceIndex, 972);
  assert.equal('utteranceId' in indexedModelInput.utterances[972]!, false);
  assert.equal('anchorId' in indexedModelInput.anchors[972]!, false);
  assert.equal('candidateId' in indexedModelInput.learningContext.rejectedCandidate, false);

  const schema: any = indexedModelInput.responseContract.jsonSchema;
  const properties = schema.properties.candidates.items.properties;
  assert.deepEqual(properties.anchorIndex, {type: 'integer', minimum: 0, maximum: 4_441});
  assert.deepEqual(properties.firstPartUtteranceIndexes.items, {
    type: 'integer', minimum: 0, maximum: 10_722
  });
  assert.equal('uniqueItems' in properties.firstPartUtteranceIndexes, false);
  assert.equal('uniqueItems' in properties.secondPartUtteranceIndexes, false);

  const decoded = decodeDistantConnectionLunaIndexedModelInputV001(indexedModelInputBytes);
  validateDistantConnectionLunaIndexedModelInputAgainstSourceV001(decoded, {
    sourcePackagePath,
    sourcePackageBytes
  });
  assert.deepEqual(
    serializeDistantConnectionLunaIndexedModelInputV001(decoded),
    indexedModelInputBytes
  );
});

test('index参照をexact mappingし、参照構造SHAの正式candidate IDで既存v002検査へ渡す', async () => {
  const {sourcePackageBytes, indexedModelInput, indexedModelInputBytes} = await fixturePromise;
  const candidate = validCandidate();
  const response = validResponse(candidate);
  const first = resolveDistantConnectionLunaIndexResponseFromBytesV001({
    sourcePackagePath,
    sourcePackageBytes,
    indexedModelInputBytes,
    indexResponseBytes: Buffer.from(JSON.stringify(response))
  });
  const second = resolveDistantConnectionLunaIndexResponseFromBytesV001({
    sourcePackagePath,
    sourcePackageBytes,
    indexedModelInputBytes,
    indexResponseBytes: first.indexResponseBytes
  });
  assert.equal(first.response.candidates[0]!.candidateId,
    deriveDistantConnectionCandidateIdFromIndexReferenceV001(candidate));
  assert.equal(first.response.candidates[0]!.anchorId, 'comment-anchor-001279');
  assert.deepEqual(first.response.candidates[0]!.firstPartSemanticUtteranceIds,
    ['semantic-utterance-001279']);
  assert.deepEqual(first.response.candidates[0]!.secondPartSemanticUtteranceIds,
    ['semantic-utterance-001280']);
  assert.equal(first.response.sourcePackageBinding.fileSha256, sha256(sourcePackageBytes));
  validateDistantConnectionLunaResponseV002(first.response, {
    sourcePackagePath,
    sourcePackageBytes
  });
  assert.deepEqual(first.indexResponseBytes,
    serializeDistantConnectionLunaIndexResponseV001(response, indexedModelInput));
  assert.deepEqual(first.responseBytes, second.responseBytes);
});

test('formal ID・candidate ID・source bindingを含むmodel返答を救済せず拒否する', async () => {
  const {indexedModelInput} = await fixturePromise;
  const withCandidateId: any = validResponse();
  withCandidateId.candidates[0].candidateId = 'candidate-model-made';
  expectCode('INDEX_RESPONSE_INVALID', () => {
    assertDistantConnectionLunaIndexResponseV001(withCandidateId, indexedModelInput);
  });

  const withFormalIds: any = {
    schemaVersion: DISTANT_CONNECTION_LUNA_INDEX_RESPONSE_SCHEMA_V001,
    candidates: [{
      anchorId: 'comment-anchor-000972',
      firstPartSemanticUtteranceIds: ['semantic-utterance-000972'],
      secondPartSemanticUtteranceIds: ['semantic-utterance-002000'],
      addedUnderstanding: 'IDを返した旧形式です。',
      direction: 'future'
    }]
  };
  expectCode('INDEX_RESPONSE_INVALID', () => {
    decodeDistantConnectionLunaIndexResponseV001(
      Buffer.from(JSON.stringify(withFormalIds)),
      indexedModelInput
    );
  });

  const withSourceBinding: any = validResponse();
  withSourceBinding.sourcePackageBinding = indexedModelInput.sourcePackageBinding;
  expectCode('INDEX_RESPONSE_INVALID', () => {
    assertDistantConnectionLunaIndexResponseV001(withSourceBinding, indexedModelInput);
  });
});

test('非整数とanchor・発話それぞれの範囲外indexを拒否する', async () => {
  const {indexedModelInput} = await fixturePromise;
  const cases: Array<{code: string; change: (candidate: any) => void}> = [
    {code: 'INDEX_NOT_INTEGER', change: (candidate) => { candidate.anchorIndex = '972'; }},
    {code: 'INDEX_NOT_INTEGER', change: (candidate) => { candidate.anchorIndex = 972.5; }},
    {code: 'INDEX_OUT_OF_RANGE', change: (candidate) => { candidate.anchorIndex = -1; }},
    {
      code: 'INDEX_OUT_OF_RANGE',
      change: (candidate) => { candidate.anchorIndex = indexedModelInput.anchorCount; }
    },
    {
      code: 'INDEX_OUT_OF_RANGE',
      change: (candidate) => { candidate.firstPartUtteranceIndexes = [-1]; }
    },
    {
      code: 'INDEX_OUT_OF_RANGE',
      change: (candidate) => {
        candidate.secondPartUtteranceIndexes = [indexedModelInput.utteranceCount];
      }
    }
  ];
  for (const item of cases) {
    const response: any = structuredClone(validResponse());
    item.change(response.candidates[0]);
    expectCode(item.code, () => {
      assertDistantConnectionLunaIndexResponseV001(response, indexedModelInput);
    });
  }
});

test('重複・部分内順序・前後順序・direction側anchor所属をローカルで拒否する', async () => {
  const {indexedModelInput} = await fixturePromise;
  const cases: Array<{code: string; candidate: DistantConnectionLunaIndexCandidateV001}> = [
    {
      code: 'INDEX_DUPLICATE',
      candidate: {...validCandidate(), firstPartUtteranceIndexes: [1278, 1278]}
    },
    {
      code: 'INDEX_DUPLICATE',
      candidate: {
        ...validCandidate(),
        firstPartUtteranceIndexes: [1278],
        secondPartUtteranceIndexes: [1278]
      }
    },
    {
      code: 'INDEX_ORDER_REVERSED',
      candidate: {...validCandidate(), firstPartUtteranceIndexes: [1278, 1277]}
    },
    {
      code: 'INDEX_ORDER_REVERSED',
      candidate: {
        ...validCandidate(),
        firstPartUtteranceIndexes: [1278],
        secondPartUtteranceIndexes: [1277]
      }
    },
    {
      code: 'ANCHOR_DIRECTION_MISMATCH',
      candidate: {
        ...validCandidate(),
        firstPartUtteranceIndexes: [1277],
        secondPartUtteranceIndexes: [1278]
      }
    }
  ];
  for (const item of cases) {
    expectCode(item.code, () => {
      assertDistantConnectionLunaIndexResponseV001(
        validResponse(item.candidate),
        indexedModelInput
      );
    });
  }
});

test('同じ参照組は説明文だけ変えても同じIDとなり、複数候補化を拒否する', async () => {
  const {sourcePackageBytes, indexedModelInputBytes} = await fixturePromise;
  const first = validCandidate();
  const second = {...validCandidate(), addedUnderstanding: '説明文だけを変更した候補です。'};
  assert.equal(
    deriveDistantConnectionCandidateIdFromIndexReferenceV001(first),
    deriveDistantConnectionCandidateIdFromIndexReferenceV001(second)
  );
  expectCode('CANDIDATE_REFERENCE_DUPLICATE', () => {
    resolveDistantConnectionLunaIndexResponseFromBytesV001({
      sourcePackagePath,
      sourcePackageBytes,
      indexedModelInputBytes,
      indexResponseBytes: Buffer.from(JSON.stringify({
        schemaVersion: DISTANT_CONNECTION_LUNA_INDEX_RESPONSE_SCHEMA_V001,
        candidates: [first, second]
      }))
    });
  });
});

test('index参照入力の自己整合だけでは通さず、SHA束縛sourceからの再構築差を拒否する', async () => {
  const {sourcePackageBytes, indexedModelInput} = await fixturePromise;
  const changed = structuredClone(indexedModelInput);
  changed.utterances[0]!.text = 'source packageにない改変です。';
  expectCode('INDEXED_MODEL_INPUT_SOURCE_MISMATCH', () => {
    validateDistantConnectionLunaIndexedModelInputAgainstSourceV001(changed, {
      sourcePackagePath,
      sourcePackageBytes
    });
  });
});
