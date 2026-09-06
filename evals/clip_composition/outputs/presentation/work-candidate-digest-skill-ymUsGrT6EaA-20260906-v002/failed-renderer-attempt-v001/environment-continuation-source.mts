import {lstat, mkdir, readdir, rename, readFile} from 'node:fs/promises';
import path from 'node:path';
import {
  ROOT, loadDigestContextV001, readJson, readBound, bind, publish, same, fail, fileSha,
  verifyDigestE2EV001, type Json,
} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {
  verifyDigestAdoptionV001, buildDigestCaptionInputsV001, validateDigestDisplayV001,
  constructDigestCaptionCoreV001, CORE_FILES, renderDigestV001,
} from './candidate_digest_core_adapter_v001.mts';

// 今回のソケット拒否だけを、保存済み判断・Core入力を変えずに再実行する。
// Skill再判断、旧plan実行、検査の省略、失敗出力の上書きは行わない。
async function main() {
  const c = await loadDigestContextV001(process.argv[2]);
  const out = (name: string) => `${c.plan.outputRoot}/${name}`;
  const abs = (name: string) => path.join(ROOT, out(name));
  const failure = await readJson(out('failure.json'));
  const execution = await readJson(out('renderer-result.json'));
  const stderr = await readFile(abs(`process-observations/${c.plan.planId}/0003-layout-inspection/stderr.txt`), 'utf8');
  if (failure.stage !== 'renderer' || execution.exitCode !== 2
    || execution.result?.failure?.message !== 'layout inspector produced no result'
    || !stderr.includes('listen EPERM: operation not permitted /private/tmp/tsx-')) fail('EXPECTED_ENVIRONMENT_FAILURE_REQUIRED');
  const {adoption, editPlan} = await verifyDigestAdoptionV001(c);
  const baseEnvelope = await readJson(out('base-media-bindings.json'));
  const {schemaVersion: _, ...base} = baseEnvelope;
  for (const [name, b] of Object.entries(base)) {
    if (name === 'baseMedia') {
      if (await fileSha(path.join(ROOT, b.path)) !== b.fileSha256) fail('BASE_MEDIA_CHANGED');
    } else await readBound(b);
  }
  const inputs = buildDigestCaptionInputsV001(c, adoption, base);
  const tokens = [], displayJudgments = [];
  for (const [i, expected] of inputs.requests.entries()) {
    const request = await readJson(out(`display-${i + 1}-request.json`));
    const response = await readJson(out(`display-${i + 1}-response.json`));
    const result = await readJson(out(`display-${i + 1}-result.json`));
    if (!same(request, expected)) fail('DISPLAY_REQUEST_CHANGED');
    tokens.push(validateDigestDisplayV001(request, response, result));
    displayJudgments.push({request: bind(out(`display-${i + 1}-request.json`), request),
      response: bind(out(`display-${i + 1}-response.json`), response), result: bind(out(`display-${i + 1}-result.json`), result)});
  }
  const core = await constructDigestCaptionCoreV001(c, adoption, base, tokens);
  const artifacts: Json = {};
  for (const [name, filename] of Object.entries(CORE_FILES)) {
    const saved = await readJson(out(filename));
    if (!same(saved, core[name as keyof typeof core])) fail('CORE_INPUT_CHANGED');
    artifacts[name] = bind(out(filename), saved);
  }
  const names = ['failure.json', 'renderer-result.json', 'admission-receipt.json', 'line-layout.json',
    'process-observations', '.render.presentation-renderer-v002.lock', '.render.presentation-renderer-v002-work-ww5xel'];
  const evidence: Json[] = [];
  async function inventory(relative: string) {
    const s = await lstat(abs(relative));
    if (s.isSymbolicLink()) fail('FAILURE_EVIDENCE_SYMLINK');
    if (s.isDirectory()) for (const child of await readdir(abs(relative))) await inventory(`${relative}/${child}`);
    else if (s.isFile()) evidence.push({path: relative, sizeBytes: s.size, fileSha256: await fileSha(abs(relative))});
    else fail('FAILURE_EVIDENCE_UNSUPPORTED');
  }
  for (const name of names) await inventory(name);
  await mkdir(abs('failed-renderer-attempt-v001'));
  for (const name of names) await rename(abs(name), abs(`failed-renderer-attempt-v001/${name}`));
  for (const record of evidence) {
    if (await fileSha(abs(`failed-renderer-attempt-v001/${record.path}`)) !== record.fileSha256) fail('FAILURE_EVIDENCE_CHANGED');
  }
  const continuation = await publish(out('renderer-environment-continuation.json'), {
    schemaVersion: 'candidate-digest-renderer-environment-continuation-v001',
    reason: 'tsx-internal-socket-denied-by-execution-sandbox',
    planBinding: c.planBinding, rendererJobBinding: artifacts.rendererJob,
    unchangedSavedCandidateAndDisplayJudgments: true, deterministicCoreReconstruction: 'exact',
    unchangedRendererAndStyle: true, priorFailureDirectory: out('failed-renderer-attempt-v001'),
    preservedFiles: evidence, action: 'same-job-with-environment-permission',
  });
  const renderer = await renderDigestV001(c, artifacts);
  const candidateJudgment: Json = {};
  for (const name of ['request', 'response', 'result']) candidateJudgment[name] = bind(out(`candidate-${name}.json`), await readJson(out(`candidate-${name}.json`)));
  const manifest = {schemaVersion: 'candidate-discovery-digest-skill-e2e-manifest-v001', status: 'review-ready',
    instruction: 'ZEV進行管理２ 指示-001', planBinding: c.planBinding, candidateJudgment,
    candidateJudgmentMode: 'continue-same-new-codex-judgment-after-cli-repair',
    priorCandidateJudgmentBindings: c.plan.priorCandidateJudgment,
    machineAdoption: bind(out('machine-adoption.json'), adoption), editPlan: bind(out('edit-plan.json'), editPlan),
    baseMedia: base, displayJudgments,
    reusedDisplaySkill: c.plan.implementationBindings.find((v: Json) => v.path.endsWith('/skills/caption-display-boundaries-v001.ts')),
    core: artifacts, renderer, rendererEnvironmentContinuation: continuation,
    trace: {sourceVideo: c.plan.request.sourceVideo, adoptedCandidateCount: adoption.selectedCandidates.length,
      selectedSourceRanges: editPlan.segments, outputOrder: adoption.selectedCandidates.map((v: Json) => v.candidateId)},
    operations: {newCandidateJudgments: 1, newDisplayJudgments: 3, apiCommunication: 'none', newMaterial: 'none', humanQuality: 'not-evaluated'},
    humanDecision: {status: 'pending', video: renderer.video,
      questions: ['選ばれた箇所が見どころとして妥当か', '不要な箇所が多くないか', '必要な文脈が欠けていないか', '全体としてダイジェストとして気持ちよく見られるか']}};
  await publish(out('manifest.json'), manifest);
  const verified = await verifyDigestE2EV001(out('manifest.json'));
  await publish(out('verification.json'), {schemaVersion: 'candidate-digest-final-verification-v001', ...verified});
  process.stdout.write(`${JSON.stringify({manifest: out('manifest.json'), verified})}\n`);
}
main().catch(error => {console.error(error); process.exitCode = 1;});
