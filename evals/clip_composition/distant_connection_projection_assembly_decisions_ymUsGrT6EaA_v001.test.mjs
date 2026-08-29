import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {validatePresentationBaseMediaAssemblyDecisionV001} from './presentation_base_media_build_v001.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const VIDEO_PATH = 'evals/clip_composition/outputs/work-distant-connection-real-input-preparation-ymUsGrT6EaA-v001/source/ymUsGrT6EaA.mp4';
const VIDEO_SHA = '79e9cf231000c18448d52541449f65ceecd6068ae800e18736c2a0c358c90537';
const CASES = [
  {
    candidateId: 'candidate-horror-claim-to-speed-up',
    projectionSha: '961b4f529fb5abff4ffa11129e6ee55967977794ba1bb15d394c2cd8ffee9db6',
    decisionSha: 'bd9a0394c1caec7008d291c272aba62798b17f4a9a31c880b57ba68e44a76ca3',
    segments: [{sourceStartMs: 246000, sourceEndMs: 255324}, {sourceStartMs: 1980000, sourceEndMs: 1996000}],
  },
  {
    candidateId: 'candidate-doctor-disappearance-to-ogre-mother',
    projectionSha: 'ea5aac7a133da5575660dc4527f14625e5eddafad191bbae98532641146d8bc0',
    decisionSha: '8a9e4dccfa3a08c8a33db71261efbd4f3f0c7df70bff84def65acb8358a33362',
    segments: [{sourceStartMs: 1724755, sourceEndMs: 1739800}, {sourceStartMs: 5693397, sourceEndMs: 5714097}],
  },
];
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const streamSha256 = (filePath) => new Promise((resolve, reject) => {
  const hash = createHash('sha256');
  const input = createReadStream(filePath);
  input.on('data', (chunk) => hash.update(chunk));
  input.on('error', reject);
  input.on('end', () => resolve(hash.digest('hex')));
});

test('投影後edit planを根拠に2候補を別々の人間承認済み組立決定へ固定する', async () => {
  assert.equal(await streamSha256(path.join(ROOT, VIDEO_PATH)), VIDEO_SHA);
  for (const definition of CASES) {
    const projectionPath = `evals/clip_composition/outputs/work-distant-connection-edit-plan-projection-ymUsGrT6EaA-v001/${definition.candidateId}/edit-plan.json`;
    const decisionPath = `evals/clip_composition/outputs/presentation/source-assembly-formalizations/ymUsGrT6EaA-${definition.candidateId}-edit-plan-projection-v001/assembly-decision.json`;
    const [projectionBytes, decisionBytes] = await Promise.all([
      readFile(path.join(ROOT, projectionPath)), readFile(path.join(ROOT, decisionPath)),
    ]);
    assert.equal(sha256(projectionBytes), definition.projectionSha);
    assert.equal(sha256(decisionBytes), definition.decisionSha);
    const projection = JSON.parse(projectionBytes.toString('utf8'));
    const decision = JSON.parse(decisionBytes.toString('utf8'));
    assert.equal(projection.kind, 'edit_plan_json');
    assert.equal(projection.candidateId, definition.candidateId);
    assert.deepEqual(validatePresentationBaseMediaAssemblyDecisionV001(decision).violations, []);
    assert.deepEqual(decision.payload.basisEditPlan, {
      kind: 'edit_plan_json', path: projectionPath, fileSha256: definition.projectionSha,
    });
    assert.equal(decision.payload.sourceArtifact.sourceRef, 'youtube:ymUsGrT6EaA');
    assert.equal(decision.payload.sourceArtifact.sourceUri, path.join(ROOT, VIDEO_PATH));
    assert.equal(decision.payload.sourceArtifact.fileSha256, VIDEO_SHA);
    assert.deepEqual(decision.payload.segments, definition.segments);
    assert.deepEqual(decision.payload.segments, projection.segments.map(({sourceStartMs, sourceEndMs}) => ({
      sourceStartMs, sourceEndMs,
    })));
    assert.deepEqual(decision.payload.unresolvedEdits, []);
    assert.equal(decision.approval.status, 'approved');
    assert.equal(decision.approval.approverType, 'human');
  }
});

test('旧組立決定は履歴としてbyte不変で残る', async () => {
  const oldShas = [
    '658cdcf32686d2574c0f73bc79afb14469395c03d47e671320bc4c62da20b056',
    '8749cbf5762778933bfe64f718da346ae6e965b2dfcca7a35347a3d2c3e96f20',
  ];
  for (const [index, definition] of CASES.entries()) {
    const oldPath = `evals/clip_composition/outputs/presentation/source-assembly-formalizations/ymUsGrT6EaA-${definition.candidateId}-v001/assembly-decision.json`;
    assert.equal(sha256(await readFile(path.join(ROOT, oldPath))), oldShas[index]);
  }
});

test('投影SHA差と未承認状態は既存契約・binding検査で拒否する', async () => {
  const definition = CASES[0];
  const decisionPath = `evals/clip_composition/outputs/presentation/source-assembly-formalizations/ymUsGrT6EaA-${definition.candidateId}-edit-plan-projection-v001/assembly-decision.json`;
  const decision = JSON.parse(await readFile(path.join(ROOT, decisionPath), 'utf8'));
  const changed = structuredClone(decision);
  changed.approval.status = 'pending';
  assert.equal(validatePresentationBaseMediaAssemblyDecisionV001(changed).status, 'failed');
  assert.notEqual(decision.payload.basisEditPlan.fileSha256, '0'.repeat(64));
  assert.equal(decision.payload.basisEditPlan.fileSha256, definition.projectionSha);
});
