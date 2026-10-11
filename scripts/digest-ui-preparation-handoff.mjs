#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { draftConfirmationIdentity } from '../packages/shared/dist/index.js';

const parameterKeys = ['workspaceRoot', 'inputRoot', 'inputPrefix', 'sourceRuntimeRoot', 'outputRoot',
  'preparationId', 'stateBinding', 'scopeBinding', 'styleTemplateBinding', 'expected'];
function object(value, message) {
  assert(value && typeof value === 'object' && !Array.isArray(value), message);
  return value;
}
function localOrigin(value) {
  const url = new URL(value);
  assert(url.protocol === 'http:' && ['127.0.0.1', '[::1]'].includes(url.hostname)
    && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash,
  '明示したloopbackのbackend originだけを使用します');
  return url.origin;
}

/**
 * Consumer handoff of the existing preparation parameters and completed result's manifestBinding.
 * Does not prepare, discover files, approve a draft, claim a job, manufacture, or retry a request.
 * The server owns workspaceRoot and requalifies all producer references inside its existing queue.
 */
export async function handOffPreparedDigestUiMaterials(parameters, manifestBinding, { backendOrigin, humanToken } = {}) {
  const origin = localOrigin(backendOrigin);
  const p = object(parameters, '正式な字幕準備の入力パラメータが必要です');
  assert.deepEqual(Object.keys(p).sort(), parameterKeys.slice().sort(), '正式な字幕準備パラメータの項目が一致しません');
  assert(typeof p.workspaceRoot === 'string' && p.workspaceRoot, '正式な字幕準備パラメータが不足しています');
  const expected = object(p.expected, '現在の計画・実行入力の参照が必要です');
  assert(typeof expected.requestDraftId === 'string' && expected.requestDraftId, '登録先の依頼参照が必要です');
  const binding = object(manifestBinding, '準備完了結果のmanifestBindingが必要です');
  assert.deepEqual(Object.keys(binding).sort(), ['fileSha256', 'path'], 'manifest参照の項目が一致しません');
  assert(typeof binding.path === 'string' && binding.path && /^[0-9a-f]{64}$/u.test(binding.fileSha256), 'manifest参照が不正です');
  assert(humanToken === undefined || typeof humanToken === 'string', '既存の人間API認証を使用してください');
  const headers = { 'content-type': 'application/json' };
  if (humanToken?.trim()) headers.authorization = `Bearer ${humanToken.trim()}`;
  const request = async (endpoint, options = {}) => {
    const response = await fetch(origin + endpoint, { ...options, headers, redirect: 'error' });
    const result = await response.json();
    if (!response.ok) throw new Error(`受渡しを拒否しました（HTTP ${response.status}）：${result.error || '登録できません'}`);
    return result;
  };
  // Read the current displayed identity; the server additionally compares the original saved snapshot.
  const state = await request('/api/state');
  assert(Array.isArray(state.requestDrafts), '現在の依頼登録を読み取れません');
  const drafts = state.requestDrafts.filter(d => d.id === expected.requestDraftId);
  assert(drafts.length === 1 && drafts[0].productionType === 'digest' && drafts[0].status === 'approved',
    '現在の承認済みDigest依頼に一致する登録先がありません');
  const { workspaceRoot: _producerCodeRoot, ...consumerParameters } = p;
  const body = { draftIdentity: draftConfirmationIdentity(drafts[0]),
    parameters: structuredClone(consumerParameters), manifestBinding: structuredClone(binding) };
  const result = await request(`/api/request-drafts/${encodeURIComponent(expected.requestDraftId)}/ui-digest-preparation`,
    { method: 'POST', body: JSON.stringify(body) });
  assert(result.registration?.requestDraftId === expected.requestDraftId
    && result.materials?.requestDraftId === expected.requestDraftId && result.materials.draftIdentity === body.draftIdentity
    && result.materials.digestPreparation?.status === 'verified', '受渡し後の確認資料を資格付きで読み取れません');
  assert.deepEqual(result.registration.parameters, body.parameters, '登録された準備参照が異なります');
  assert.deepEqual(result.registration.manifestBinding, body.manifestBinding, '登録されたmanifest参照が異なります');
  return result;
}

function cliOptions(args) {
  const names = ['--backend-origin', '--parameters-file', '--manifest-path', '--manifest-sha256'];
  const options = new Map();
  assert(args.length === names.length * 2, 'backend-origin、parameters-file、manifest-path、manifest-sha256を各一つ指定してください');
  for (let i = 0; i < args.length; i += 2) {
    assert(names.includes(args[i]) && !options.has(args[i]) && args[i + 1], '受渡しの引数が不正です');
    options.set(args[i], args[i + 1]);
  }
  return options;
}
async function main() {
  const options = cliOptions(process.argv.slice(2));
  const parameters = JSON.parse(await readFile(options.get('--parameters-file'), 'utf8'));
  const result = await handOffPreparedDigestUiMaterials(parameters,
    { path: options.get('--manifest-path'), fileSha256: options.get('--manifest-sha256') },
    { backendOrigin: options.get('--backend-origin'), humanToken: process.env.ZEV2_HUMAN_API_TOKEN });
  // No credentials, input bodies or media-quality claims in the CLI result.
  process.stdout.write(JSON.stringify({ requestDraftId: result.registration.requestDraftId,
    preparationId: result.registration.parameters.preparationId, preparationStatus: result.materials.digestPreparation.status,
    registeredAt: result.registration.registeredAt }) + '\n');
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { process.stderr.write(`Digest準備の受渡し失敗：${error.message}\n`);process.exitCode = 1; });
}
