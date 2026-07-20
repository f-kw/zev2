#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { canonicalJson } from './presentation_caption_contract.mjs';
import {
  PRESENTATION_REGISTRY_TRUST_SCHEMA_VERSION,
  validatePresentationInstructionContract,
} from './presentation_instruction_contract.mjs';
import {
  deriveEmptyMaterialValidationIndex,
  derivePresetValidationIndex,
  validateCandidateRegistry,
} from './build_presentation_initial_preset_review.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, '..', '..');

export const CANDIDATE_ROOT = path.join(
  scriptDir,
  'outputs',
  'presentation',
  'initial-preset-registry-candidate-20260720-v002',
);
export const APPROVAL_ROOT = path.join(
  scriptDir,
  'outputs',
  'presentation',
  'initial-preset-registry-approval-20260720-v001',
);
export const FORMAL_REGISTRY_ROOT = path.join(
  scriptDir,
  'registries',
  'presentation',
  'normal-landscape-preset-registry-v001',
);

export const FORMAL_FILES = Object.freeze({
  presetRegistry: 'preset-registry.json',
  presetValidationIndex: 'preset-validation-index.json',
  materialValidationIndex: 'material-validation-index.json',
  trustedRegistryBindings: 'trusted-registry-bindings.json',
});

const APPROVAL_FILES = Object.freeze({
  humanApproval: 'human-approval.json',
  humanResult: 'human-result.md',
  approvalManifest: 'approval-manifest.json',
});

const CANDIDATE_FILES = Object.freeze({
  presetRegistry: 'candidate-preset-registry.json',
  presetValidationIndex: 'candidate-preset-validation-index.json',
  materialValidationIndex: 'candidate-empty-material-validation-index.json',
  previewManifest: 'preview-manifest.json',
});

const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));
const writeJson = async (filePath, value) => writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
export const sha256Canonical = (value) => sha256(canonicalJson(value));
const fileSha256 = async (filePath) => new Promise((resolve, reject) => {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath);
  stream.on('data', (chunk) => hash.update(chunk));
  stream.on('error', reject);
  stream.on('end', () => resolve(hash.digest('hex')));
});
const repoPath = (filePath) => path.relative(workspaceRoot, filePath);
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const sameCanonical = (left, right) => canonicalJson(left) === canonicalJson(right);

const buildHumanResult = ({ approval, previewManifestSha256 }) => `# 初期プリセット台帳v001 人間確認結果

- 確認者: ${approval.reviewer}
- 確認日: ${approval.approvedOn}
- 時間計測: なし
- 候補プリセット: \`${approval.candidatePresetId}\`
- 承認対象preview: \`${approval.previewId}\`
- preview manifest SHA-256（ファイル）: \`${previewManifestSha256}\`
- 人間原文: 「${approval.sourceStatement}」

## 判定

- Q1: 承認
  - 素の基本テロップを再利用していない: はい
  - 文字造形が読みやすい: はい
  - 単調を避ける最低限の変化がある: はい
- Q2: 承認
- Q3: 承認
- Q4: 承認
- Q5: 承認

## 適用範囲

- 修正版preview v002で確認した候補を、内容変更なしで正式台帳へ昇格する。
- 初期素材台帳は空のまま固定する。G7の合成カードは認定媒体だけに使ったもので、正式素材には登録しない。
- 時間は測っていない。
`;

const makeEmptyInstructionBundle = (presetValidationIndex, materialValidationIndex) => {
  const sourceAtoms = [];
  const resolutionPackage = {
    schemaVersion: 'presentation-resolution-package-v001',
    resolutionPackageId: 'formal-registry-validation-empty-resolution-v001',
    sourceProvenance: 'formal-registry-validation-empty-source-v001',
    atomGranularity: 'word-timestamp',
    sourceAtomsSha256: sha256Canonical(sourceAtoms),
    sourceAtoms,
    targets: [],
    captionContracts: [],
  };
  return {
    schemaVersion: 'presentation-instruction-check-v001',
    instructionSet: {
      schemaVersion: 'zev-presentation-instruction-v001',
      instructionSetId: 'formal-registry-validation-empty-instructions-v001',
      format: 'normal-landscape',
      rendererContractVersion: 'zev-renderer-boundary-v001',
      sourceProvenance: resolutionPackage.sourceProvenance,
      resolutionPackageId: resolutionPackage.resolutionPackageId,
      resolutionPackageSha256: sha256Canonical(resolutionPackage),
      presetRegistryVersion: presetValidationIndex.registryVersion,
      materialRegistryVersion: materialValidationIndex.registryVersion,
      instructions: [],
    },
    resolutionPackage,
    presetValidationIndex,
    materialValidationIndex,
  };
};

export const buildFormalTrustBinding = (presetValidationIndex, materialValidationIndex) => ({
  schemaVersion: PRESENTATION_REGISTRY_TRUST_SCHEMA_VERSION,
  presetRegistryVersion: presetValidationIndex.registryVersion,
  presetValidationIndexSha256: sha256Canonical(presetValidationIndex),
  materialRegistryVersion: materialValidationIndex.registryVersion,
  materialValidationIndexSha256: sha256Canonical(materialValidationIndex),
});

export const validateHumanApproval = ({ approval, previewManifest, previewManifestSha256 }) => {
  assert(
    approval?.schemaVersion === 'presentation-preset-human-approval-v001',
    'human approval schema mismatch',
  );
  assert(approval.approvalId === 'normal-landscape-readable-pop-v001-approval-20260720', 'approval ID mismatch');
  assert(approval.approvedOn === '2026-07-20', 'approval date mismatch');
  assert(approval.reviewer === 'kawafmm', 'approval reviewer mismatch');
  assert(approval.timeMeasurement === false, 'time measurement must remain disabled');
  assert(
    approval.sourceStatement === '修正版確認したよ。まとめて承認します。',
    'human source statement mismatch',
  );
  assert(approval.previewId === previewManifest.previewId, 'approved preview ID mismatch');
  assert(approval.previewManifestSha256 === previewManifestSha256, 'approved preview manifest hash mismatch');
  assert(approval.candidatePresetId === previewManifest.preset.presetId, 'approved preset ID mismatch');
  assert(
    approval.presetRegistryVersion === previewManifest.preset.registryVersion,
    'approved preset registry version mismatch',
  );
  assert(
    approval.materialRegistryVersion === previewManifest.materialIndex.registryVersion,
    'approved material registry version mismatch',
  );
  for (const questionId of ['q1', 'q2', 'q3', 'q4', 'q5']) {
    assert(approval.decisions?.[questionId] === 'approved', `${questionId} is not approved`);
  }
  for (const criterion of [
    'plainBasicCaptionNotReused',
    'readableTypography',
    'minimumDeclaredVariation',
  ]) {
    assert(approval.q1Criteria?.[criterion] === true, `Q1 criterion ${criterion} is not approved`);
  }
  assert(previewManifest.formalTrustBindingWritten === false, 'candidate manifest was mutated into a formal record');
  assert(
    previewManifest.preflightOnlyTrustBindingPersisted === false,
    'candidate preflight trust must not be persisted as formal trust',
  );
  return true;
};

export async function finalizeInitialPresetRegistry() {
  const candidatePaths = Object.fromEntries(
    Object.entries(CANDIDATE_FILES).map(([key, fileName]) => [key, path.join(CANDIDATE_ROOT, fileName)]),
  );
  const approvalPath = path.join(APPROVAL_ROOT, APPROVAL_FILES.humanApproval);
  const [
    candidateRegistryText,
    candidatePresetIndexText,
    candidateMaterialIndexText,
    previewManifestText,
    approval,
  ] = await Promise.all([
    readFile(candidatePaths.presetRegistry, 'utf8'),
    readFile(candidatePaths.presetValidationIndex, 'utf8'),
    readFile(candidatePaths.materialValidationIndex, 'utf8'),
    readFile(candidatePaths.previewManifest, 'utf8'),
    readJson(approvalPath),
  ]);
  const candidateRegistry = JSON.parse(candidateRegistryText);
  const candidatePresetIndex = JSON.parse(candidatePresetIndexText);
  const candidateMaterialIndex = JSON.parse(candidateMaterialIndexText);
  const previewManifest = JSON.parse(previewManifestText);
  const previewManifestSha256 = sha256(previewManifestText);

  validateHumanApproval({ approval, previewManifest, previewManifestSha256 });
  validateCandidateRegistry(candidateRegistry);
  const derivedPresetIndex = derivePresetValidationIndex(candidateRegistry);
  const derivedMaterialIndex = deriveEmptyMaterialValidationIndex();
  assert(sameCanonical(candidatePresetIndex, derivedPresetIndex), 'candidate preset index does not derive from approved registry');
  assert(sameCanonical(candidateMaterialIndex, derivedMaterialIndex), 'candidate material index is not the approved empty index');
  assert(
    previewManifest.preset.candidateRegistrySha256 === sha256Canonical(candidateRegistry),
    'preview manifest does not bind the approved candidate registry content',
  );
  assert(
    previewManifest.preset.presetValidationIndexSha256 === sha256Canonical(candidatePresetIndex),
    'preview manifest does not bind the approved preset index content',
  );
  assert(
    previewManifest.materialIndex.sha256 === sha256Canonical(candidateMaterialIndex),
    'preview manifest does not bind the approved material index content',
  );

  const trustBinding = buildFormalTrustBinding(candidatePresetIndex, candidateMaterialIndex);
  const compatibilityReport = validatePresentationInstructionContract(
    makeEmptyInstructionBundle(candidatePresetIndex, candidateMaterialIndex),
    trustBinding,
  );
  assert(compatibilityReport.overallStatus === 'passed', 'formal registry indices do not pass the existing contract');

  await Promise.all([
    mkdir(FORMAL_REGISTRY_ROOT, { recursive: true }),
    mkdir(APPROVAL_ROOT, { recursive: true }),
  ]);
  const formalPaths = Object.fromEntries(
    Object.entries(FORMAL_FILES).map(([key, fileName]) => [key, path.join(FORMAL_REGISTRY_ROOT, fileName)]),
  );
  await Promise.all([
    writeFile(formalPaths.presetRegistry, candidateRegistryText),
    writeFile(formalPaths.presetValidationIndex, candidatePresetIndexText),
    writeFile(formalPaths.materialValidationIndex, candidateMaterialIndexText),
    writeJson(formalPaths.trustedRegistryBindings, trustBinding),
  ]);

  const humanResultPath = path.join(APPROVAL_ROOT, APPROVAL_FILES.humanResult);
  await writeFile(humanResultPath, buildHumanResult({ approval, previewManifestSha256 }));

  const formalArtifactRecords = {};
  for (const [key, filePath] of Object.entries(formalPaths)) {
    formalArtifactRecords[key] = {
      path: repoPath(filePath),
      fileSha256: await fileSha256(filePath),
    };
  }
  const approvalManifest = {
    schemaVersion: 'presentation-preset-approval-manifest-v001',
    approvalId: approval.approvalId,
    approvedOn: approval.approvedOn,
    reviewer: approval.reviewer,
    candidate: {
      presetId: approval.candidatePresetId,
      previewId: approval.previewId,
      previewManifestPath: repoPath(candidatePaths.previewManifest),
      previewManifestFileSha256: previewManifestSha256,
      candidatePresetRegistryPath: repoPath(candidatePaths.presetRegistry),
      candidatePresetRegistryFileSha256: sha256(candidateRegistryText),
      candidatePresetRegistryCanonicalSha256: sha256Canonical(candidateRegistry),
      humanApprovalPath: repoPath(approvalPath),
      humanApprovalFileSha256: await fileSha256(approvalPath),
      humanResultPath: repoPath(humanResultPath),
      humanResultFileSha256: await fileSha256(humanResultPath),
    },
    formalArtifacts: formalArtifactRecords,
    contractCompatibility: {
      status: compatibilityReport.overallStatus,
      checkerVersion: compatibilityReport.checkerVersion,
      inputSha256: compatibilityReport.inputSha256,
    },
    candidateContentChangedDuringPromotion: false,
    formalTrustBindingWritten: true,
  };
  const approvalManifestPath = path.join(APPROVAL_ROOT, APPROVAL_FILES.approvalManifest);
  await writeJson(approvalManifestPath, approvalManifest);
  return { approvalManifest, trustBinding, compatibilityReport };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  finalizeInitialPresetRegistry()
    .then(({ approvalManifest }) => {
      process.stdout.write(`${JSON.stringify({
        status: 'formalized',
        approvalId: approvalManifest.approvalId,
        presetRegistryVersion: approvalManifest.formalArtifacts.presetRegistry.path,
        formalTrustBindingWritten: approvalManifest.formalTrustBindingWritten,
      }, null, 2)}\n`);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
