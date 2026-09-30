import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// 保存実物を既存validatorへ渡すだけ。complete POST、provider、製造、state保存は呼ばない。
const root = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const report = path.dirname(fileURLToPath(import.meta.url));
const runtime = path.join(root, 'runtime/artifacts/request-intent-connection-20261001-v004-probe-001');
process.env.ZEV2_RUNTIME_DIR = runtime;
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const relative = (absolute: string) => path.relative(root, absolute);
const bytes = (name: string) => readFile(path.join(root, name));
const json = async (name: string) => JSON.parse((await bytes(name)).toString());
const optionalSha = async (name: string) => {
  try {return sha(await bytes(name));}
  catch (e) {if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e;}
};
if (process.argv[2] === 'read') {
  const saved = JSON.parse(await readFile(path.join(report, 'queue-contract-evidence.json'), 'utf8'));
  assert.equal(saved.schemaVersion, 'request-intent-queue-contract-probe-evidence-v001');
  assert.equal(saved.status, 'passed'); assert.equal(saved.results.length, 10);
  for (const [p, hash] of Object.entries(saved.preservation.observedPaths)) assert.equal(await optionalSha(p), hash);
  for (const ref of [...Object.values(saved.copies), saved.preparationCopy, ...saved.implementations] as any[])
    assert.equal(sha(await bytes(ref.path)), ref.fileSha256);
  assert.equal(sha(await bytes(saved.sourceBinding.path)), saved.sourceBinding.fileSha256);
  console.log(JSON.stringify({status:'read-back-passed', results:saved.results.length,
    protectedPaths:Object.keys(saved.preservation.observedPaths).length, stateWrites:0, validatorReruns:0}));
  process.exit(0);
}
const evidence = await json(relative(path.join(report, 'consumer-connection-evidence-attempt-001.json')));
const statePath = `${evidence.runtime}/state.json`;
const state = await json(statePath);
const selected = evidence.completed[0];
const recordBytes = await bytes(selected.binding), record = JSON.parse(recordBytes.toString());
const preparationBytes = await bytes(record.preparationBinding.path);
assert.equal(sha(preparationBytes), record.preparationBinding.fileSha256);
const preparation = JSON.parse(preparationBytes.toString());
const draftId = preparation.identity.requestDraftId;
const command = (type: string) => {
  const rows = state.agentRequests.filter((r: any) => r.requestDraftId === draftId && r.type === type);
  assert.equal(rows.length, 1); return rows[0];
};
const protectedPaths = [statePath, 'runtime/state.json', selected.binding, record.preparationBinding.path,
  ...Object.values(record.outputs).map((r: any) => r.path),
  ...Object.values(preparation.artifacts).map((r: any) => r.path)];
const before = Object.fromEntries(await Promise.all(protectedPaths.map(async p => [p, await optionalSha(p)])));
const implementationPaths = [
  'backend/src/artifacts/validation.ts', 'backend/src/artifacts/artifact-path.ts', 'backend/src/config/runtime-dir.ts',
  'packages/shared/src/index.ts', 'runner/src/workflow-artifact-validation.ts',
  'evals/clip_composition/presentation_base_media_build_v003.mjs',
];
const implementations = await Promise.all(implementationPaths.map(async p => ({path:p, fileSha256:sha(await bytes(p))})));
await mkdir(runtime); // 既存probeの上書き・再利用をしない。
const destination = path.join(runtime, 'artifacts', draftId);
await mkdir(destination, {recursive:true});
const copies: Record<string, any> = {};
for (const name of ['machine-adoption.json', 'edit-plan.json', 'manufacturing-values.json']) {
  const original = record.outputs[name], content = await bytes(original.path);
  assert.equal(sha(content), original.fileSha256);
  const target = path.join(destination, name);
  await writeFile(target, content, {flag:'wx'});
  copies[name] = {origin:original, path:relative(target), fileSha256:sha(content), value:JSON.parse(content.toString())};
}
const prepTarget = path.join(destination, 'preparation-binding.json');
await writeFile(prepTarget, preparationBytes, {flag:'wx'});
const {validateCompletionFileRef} = await import('../../../backend/src/artifacts/validation.js');
const {assertJsonArtifactForKind} = await import('../../../runner/src/workflow-artifact-validation.js');
const {validatePresentationBaseMediaBuildJobV001, validatePresentationBaseMediaAssemblyDecisionV001} =
  await import('../../../evals/clip_composition/presentation_base_media_build_v003.mjs');
const results: any[] = [];
const ref = (name: string) => ({uri:`/api/artifacts/${encodeURIComponent(draftId)}/${name}`, mimeType:'application/json'});
async function backend(name: string, type: string, fileName: string, expected: 'accepted'|'rejected', scope: string, otherDraft = false) {
  const request = structuredClone(command(type));
  if (otherDraft) request.requestDraftId = `${draftId}-other`;
  const observed = await validateCompletionFileRef(request, ref(fileName));
  const status = 'error' in observed ? 'rejected' : 'accepted';
  assert.equal(status, expected);
  results.push({name, validator:'validateCompletionFileRef', status, scope,
    requestId:request.id, requestType:type, originalRequestDraftId:draftId,
    validatedRequestDraftId:request.requestDraftId, input:ref(fileName), observed});
}
function detailed(name: string, kind: any, value: unknown) {
  let message = '';
  try {assertJsonArtifactForKind(kind, value, '保存v003出力');}
  catch (e) {message = e instanceof Error ? e.message : String(e);}
  assert(message);
  results.push({name, validator:'assertJsonArtifactForKind', kind, status:'rejected', scope:'structure', message});
}
await backend('digest-edit-kind-only', 'create_edit_plan', 'edit-plan.json', 'accepted', 'kind-only');
await backend('digest-edit-wrong-draft', 'create_edit_plan', 'edit-plan.json', 'rejected', 'path', true);
await backend('digest-edit-missing-isolated-file', 'create_edit_plan', 'missing.json', 'rejected', 'path');
await backend('preparation-is-not-theme-kind', 'propose_clip_themes', 'preparation-binding.json', 'rejected', 'kind');
await backend('machine-adoption-is-not-composition-kind', 'build_clip_composition', 'machine-adoption.json', 'rejected', 'kind');
detailed('digest-edit-is-not-clip-edit-schema', 'edit_plan_json', copies['edit-plan.json'].value);
detailed('preparation-is-not-theme-schema', 'theme_json', preparation);
detailed('machine-adoption-is-not-clip-composition-schema', 'composition_json', copies['machine-adoption.json'].value);
const job = validatePresentationBaseMediaBuildJobV001(copies['manufacturing-values.json'].value);
assert.equal(job.status, 'passed');
results.push({name:'saved-job-reference-shape', validator:'validatePresentationBaseMediaBuildJobV001',
  status:'accepted', scope:'shape-only-no-reference-read-no-execution', observed:job});
const assembly = validatePresentationBaseMediaAssemblyDecisionV001(copies['machine-adoption.json'].value);
assert.equal(assembly.status, 'failed');
assert(assembly.violations.some((v: any) => v.path === '$.approval'));
results.push({name:'machine-adoption-is-not-human-assembly', validator:'validatePresentationBaseMediaAssemblyDecisionV001',
  status:'rejected', scope:'schema-and-human-approval', observed:assembly});
for (const [p, hash] of Object.entries(before)) assert.equal(await optionalSha(p), hash, `protected bytes changed: ${p}`);
for (const impl of implementations) assert.equal(sha(await bytes(impl.path)), impl.fileSha256);
for (const [name, copy] of Object.entries(copies)) assert.equal(sha(await bytes(copy.path)), record.outputs[name].fileSha256);
const output = {
  schemaVersion:'request-intent-queue-contract-probe-evidence-v001', status:'passed',
  generatedAt:new Date().toISOString(), head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
  runtime:relative(runtime), sourceEvidence:'docs/reports/request-intent-connection-20261001/consumer-connection-evidence-attempt-001.json',
  sourceBinding:{path:selected.binding,fileSha256:sha(recordBytes)},
  copies:Object.fromEntries(Object.entries(copies).map(([name,{value,...copy}])=>[name,copy])),
  preparationCopy:{path:relative(prepTarget), fileSha256:sha(preparationBytes)}, implementations, results,
  preservation:{status:'unchanged', observedPaths:before},
  effects:{completePost:0,stateWrites:0,videoCopies:0,providerCalls:0,inspectionCalls:0,renderCalls:0},
  limitation:'kind/shape受理と詳細schema・人間承認拒否の境界実測。実完了登録・製造・品質合格は未実施。',
};
await writeFile(path.join(report,'queue-contract-evidence.json'),JSON.stringify(output,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:output.status,results:results.length,accepted:results.filter(x=>x.status==='accepted').length,
  rejected:results.filter(x=>x.status==='rejected').length,preservation:output.preservation.status}));
