import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

import {
  buildPresentationCueEndProjectionBindingV001,
  buildPresentationCueEndProjectionV001,
  buildPresentationSemanticLineEndProjectionV001,
  decodePresentationSemanticLineEndProjectionV001,
  decodePresentationCueEndProjectionV001,
  serializePresentationSemanticLineEndProjectionV001,
  serializePresentationCueEndProjectionV001,
  validatePresentationSemanticLineEndProjectionV001,
  validatePresentationCueEndProjectionV001,
} from './presentation_cue_end_projection_v001.mjs';

const FIXTURE_ROOT = 'evals/clip_composition/reports/presentation/test-runs/'
  + '20260814-zevo-caption-quality-v002-f-gate-attempt-0011/fixtures';
const HASH = '0'.repeat(64);
const producerJobBinding = Object.freeze({
  schemaVersion: 'presentation-rendering-decoupling-projection-job-v001',
  path: 'evals/clip_composition/outputs/presentation/rendering-decoupling/jobs/projection.json',
  fileSha256: HASH,
  canonicalSha256: HASH,
});

const fixture = async () => {
  const [sourcePackage, selection] = await Promise.all([
    readFile(`${FIXTURE_ROOT}/source-package-v001.json`, 'utf8').then(JSON.parse),
    readFile(`${FIXTURE_ROOT}/selection-v001.json`, 'utf8').then(JSON.parse),
  ]);
  const input = {
    projectionId: 'voice-013-cue-end-projection-v001',
    sourcePackageBinding: selection.sourcePackageBinding,
    sourceSelectionDigest: {
      schemaVersion: selection.schemaVersion,
      artifactId: selection.selectionId,
      fileSha256: HASH,
      canonicalSha256: HASH,
    },
    producerJobBinding,
    sourcePackage,
    selection,
  };
  const result = buildPresentationCueEndProjectionV001(input);
  assert.equal(result.status, 'built');
  const projectionBinding = buildPresentationCueEndProjectionBindingV001({
    path: 'evals/clip_composition/outputs/presentation/rendering-decoupling/'
      + 'voice-013/cue-end-projection-v001.json',
    projection: result.projection,
  });
  const lineResult = buildPresentationSemanticLineEndProjectionV001({
    projectionId: 'voice-013-semantic-line-end-projection-v001',
    sourcePackageBinding: input.sourcePackageBinding,
    cueEndProjectionBinding: projectionBinding,
    sourceSelectionDigest: input.sourceSelectionDigest,
    producerJobBinding,
    sourcePackage,
    selection,
    cueEndProjection: result.projection,
  });
  assert.equal(lineResult.status, 'built');
  return {
    ...input,
    projection: result.projection,
    projectionBinding,
    lineProjection: lineResult.projection,
  };
};

test('PRP001 formal byte・exact schema・決定的再構築', async () => {
  const {projection} = await fixture();
  const bytes = serializePresentationCueEndProjectionV001(projection);
  assert.equal(bytes[bytes.length - 1], 0x0a);
  assert.deepEqual(Object.keys(projection), [
    'schemaVersion', 'projectionId', 'sourcePackageBinding',
    'sourceSelectionDigest', 'captions', 'provenance',
  ]);
  const decoded = decodePresentationCueEndProjectionV001(bytes);
  assert.equal(decoded.status, 'decoded');
  assert.deepEqual(decoded.value, projection);
  assert.deepEqual(
    validatePresentationCueEndProjectionV001({...projection, unexpected: true}),
    {
      status: 'rejected',
      primaryCode: 'CUE_END_PROJECTION_INVALID',
      violations: [{code: 'CUE_END_PROJECTION_INVALID', path: '/', relatedIds: []}],
    },
  );
});

test('PRP002 source packageとcaption集合・順序・IDがexact一致', async () => {
  const {projection, sourcePackage, selection} = await fixture();
  assert.equal(
    validatePresentationCueEndProjectionV001(projection, {sourcePackage, selection}).status,
    'passed',
  );
  assert.deepEqual(
    projection.captions.map(row => [row.caseId, row.inputCaptionId, row.semanticCaptionId]),
    sourcePackage.reconstructionMap.caseContexts.map((context, index) => [
      context.caseId,
      context.inputCaptionId,
      sourcePackage.reconstructionMap.captions[index].semanticCaptionId,
    ]),
  );
  const changed = structuredClone(projection);
  changed.captions[0].caseId = 'wrong-case';
  assert.equal(
    validatePresentationCueEndProjectionV001(changed, {sourcePackage, selection}).primaryCode,
    'CUE_END_PROJECTION_BINDING_MISMATCH',
  );
});

test('PRP003 cue終端がstrict増加し最終boundaryまでatom全量を一度ずつ覆う', async () => {
  const {projection, sourcePackage, selection} = await fixture();
  assert.equal(
    validatePresentationCueEndProjectionV001(projection, {sourcePackage, selection}).status,
    'passed',
  );
  for (const [index, row] of projection.captions.entries()) {
    const source = sourcePackage.reconstructionMap.captions[index];
    const ordinals = row.cues.map(cue => source.boundaries.find(
      boundary => boundary.boundaryId === cue.cueEndBoundaryId,
    ).ordinal);
    assert.deepEqual([...ordinals].sort((a, b) => a - b), ordinals);
    assert.equal(new Set(ordinals).size, ordinals.length);
    assert.equal(row.cues.at(-1).cueEndBoundaryId, source.boundaries.at(-1).boundaryId);
  }
});

test('PRP004 旧selectionのlineEndBoundaryIdsがprojection byteへ0件', async () => {
  const {projection, lineProjection} = await fixture();
  const text = serializePresentationCueEndProjectionV001(projection).toString('utf8');
  assert.equal(text.includes('lineEndBoundaryIds'), false);
  assert.equal(text.includes('display-boundary-000001-000017'), false);
  const lineBytes = serializePresentationSemanticLineEndProjectionV001(lineProjection);
  assert.equal(lineBytes.toString('utf8').includes('lineEndBoundaryIds'), true);
  assert.equal(decodePresentationSemanticLineEndProjectionV001(lineBytes).status, 'decoded');
});

test('PRP005 sourceSelectionDigestにpathがなく旧selection bindingをreject', async () => {
  const {projection} = await fixture();
  assert.deepEqual(Object.keys(projection.sourceSelectionDigest), [
    'schemaVersion', 'artifactId', 'fileSha256', 'canonicalSha256',
  ]);
  const invalid = structuredClone(projection);
  invalid.sourceSelectionDigest.path = `${FIXTURE_ROOT}/selection-v001.json`;
  assert.equal(
    validatePresentationCueEndProjectionV001(invalid).primaryCode,
    'CUE_END_PROJECTION_INVALID',
  );
});

test('PRP006 同一sourceとselectionから2回製造したprojection byteが一致', async () => {
  const input = await fixture();
  const second = buildPresentationCueEndProjectionV001(input);
  assert.equal(second.status, 'built');
  assert.deepEqual(
    serializePresentationCueEndProjectionV001(second.projection),
    serializePresentationCueEndProjectionV001(input.projection),
  );
  const secondLine = buildPresentationSemanticLineEndProjectionV001({
    projectionId: input.lineProjection.projectionId,
    sourcePackageBinding: input.sourcePackageBinding,
    cueEndProjectionBinding: input.projectionBinding,
    sourceSelectionDigest: input.sourceSelectionDigest,
    producerJobBinding,
    sourcePackage: input.sourcePackage,
    selection: input.selection,
    cueEndProjection: input.projection,
  });
  assert.equal(secondLine.status, 'built');
  assert.deepEqual(
    serializePresentationSemanticLineEndProjectionV001(secondLine.projection),
    serializePresentationSemanticLineEndProjectionV001(input.lineProjection),
  );
  assert.equal(validatePresentationSemanticLineEndProjectionV001(
    input.lineProjection,
    {
      sourcePackage: input.sourcePackage,
      selection: input.selection,
      cueEndProjection: input.projection,
    },
  ).status, 'passed');
  const invalid = structuredClone(input.lineProjection);
  invalid.captions[0].cues[0].lineEndBoundaryIds[0] =
    invalid.captions[0].cues[1].cueEndBoundaryId;
  assert.equal(validatePresentationSemanticLineEndProjectionV001(
    invalid,
    {
      sourcePackage: input.sourcePackage,
      selection: input.selection,
      cueEndProjection: input.projection,
    },
  ).primaryCode, 'LINE_END_PROJECTION_INVALID');
});
