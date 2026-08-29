import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  validatePresentationBaseMediaAssemblyDecisionV001,
} from './presentation_base_media_build_v001.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const PLAN_PATH = 'evals/clip_composition/outputs/work-distant-connection-intervalization-plan-ymUsGrT6EaA-v002/intervalization-plan-v002.json';
const VIDEO_PATH = 'evals/clip_composition/outputs/work-distant-connection-real-input-preparation-ymUsGrT6EaA-v001/source/ymUsGrT6EaA.mp4';
const PLAN_SHA = 'f9a4c6e3b524117fd46b56d8e14bb410dea9747fec1657022ab69d15019be192';
const VIDEO_SHA = '79e9cf231000c18448d52541449f65ceecd6068ae800e18736c2a0c358c90537';

const CASES = [
  {
    candidateId: 'candidate-horror-claim-to-speed-up',
    path: 'evals/clip_composition/outputs/presentation/source-assembly-formalizations/ymUsGrT6EaA-candidate-horror-claim-to-speed-up-v001/assembly-decision.json',
    segments: [
      {sourceStartMs: 246000, sourceEndMs: 255324},
      {sourceStartMs: 1980000, sourceEndMs: 1996000},
    ],
  },
  {
    candidateId: 'candidate-doctor-disappearance-to-ogre-mother',
    path: 'evals/clip_composition/outputs/presentation/source-assembly-formalizations/ymUsGrT6EaA-candidate-doctor-disappearance-to-ogre-mother-v001/assembly-decision.json',
    segments: [
      {sourceStartMs: 1724755, sourceEndMs: 1739800},
      {sourceStartMs: 5693397, sourceEndMs: 5714097},
    ],
  },
];

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fileSha256 = (filePath) => new Promise((resolve, reject) => {
  const hash = createHash('sha256');
  const input = createReadStream(filePath);
  input.on('data', (chunk) => hash.update(chunk));
  input.on('error', reject);
  input.on('end', () => resolve(hash.digest('hex')));
});

test('承認された2候補を一般区間化計画と同じ区間で別々の正式組立決定へ固定する', async () => {
  const [planBytes, videoSha] = await Promise.all([
    readFile(path.join(ROOT, PLAN_PATH)),
    fileSha256(path.join(ROOT, VIDEO_PATH)),
  ]);
  assert.equal(sha256(planBytes), PLAN_SHA);
  assert.equal(videoSha, VIDEO_SHA);
  const plan = JSON.parse(planBytes.toString('utf8'));
  assert.equal(plan.sourceVideoId, 'ymUsGrT6EaA');

  for (const definition of CASES) {
    const bytes = await readFile(path.join(ROOT, definition.path));
    const decision = JSON.parse(bytes.toString('utf8'));
    assert.deepEqual(validatePresentationBaseMediaAssemblyDecisionV001(decision).violations, []);
    assert.equal(decision.payload.basisEditPlan.path, PLAN_PATH);
    assert.equal(decision.payload.basisEditPlan.fileSha256, PLAN_SHA);
    assert.equal(decision.payload.sourceArtifact.sourceProvenance, 'zev-local-stt-chunked');
    assert.equal(decision.payload.sourceArtifact.sourceRef, 'youtube:ymUsGrT6EaA');
    assert.equal(decision.payload.sourceArtifact.sourceUri, path.join(ROOT, VIDEO_PATH));
    assert.equal(decision.payload.sourceArtifact.fileSha256, VIDEO_SHA);
    assert.deepEqual(decision.payload.segments, definition.segments);
    assert.deepEqual(decision.payload.unresolvedEdits, []);
    assert.equal(
      decision.approval.recordId,
      `distant-connection-ymUsGrT6EaA-${definition.candidateId}-assembly-approval-v001`,
    );
    const planCandidate = plan.candidates.find(({candidateId}) => candidateId === definition.candidateId);
    assert.ok(planCandidate);
    assert.deepEqual(decision.payload.segments, [
      {
        sourceStartMs: planCandidate.firstPart.sourceStartMs,
        sourceEndMs: planCandidate.firstPart.sourceEndMs,
      },
      {
        sourceStartMs: planCandidate.secondPart.sourceStartMs,
        sourceEndMs: planCandidate.secondPart.sourceEndMs,
      },
    ]);
  }
});

test('未知の組立種別と未解決編集は既存契約で引き続き拒否する', async () => {
  const bytes = await readFile(path.join(ROOT, CASES[0].path));
  const decision = JSON.parse(bytes.toString('utf8'));
  decision.schemaVersion = 'unknown-assembly-decision';
  decision.payload.unresolvedEdits = [{kind: 'unknown'}];
  const validation = validatePresentationBaseMediaAssemblyDecisionV001(decision);
  assert.equal(validation.status, 'failed');
  assert.ok(validation.violations.some(({code}) => code === 'ASSEMBLY_DECISION_INVALID'));
  assert.ok(validation.violations.some(({code}) => code === 'ASSEMBLY_DECISION_UNRESOLVED_EDITS'));
});
