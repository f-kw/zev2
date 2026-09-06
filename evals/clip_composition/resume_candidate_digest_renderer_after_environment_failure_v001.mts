import {lstat, mkdir, readdir, rename, readFile} from 'node:fs/promises';
import path from 'node:path';
import {
  ROOT, loadDigestContextV001, readJson, readBound, bind, publish, same, fail, fileSha,
  verifyDigestE2EV001, judgeThroughStdinV001, type Json,
} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {
  verifyDigestAdoptionV001, buildDigestCaptionInputsV001, validateDigestDisplayV001,
  constructDigestCaptionCoreV001, CORE_FILES, renderDigestV001,
} from './candidate_digest_core_adapter_v001.mts';
import {runCaptionDisplayBoundariesV001} from '../../runner/src/skills/caption-display-boundaries-v001.js';

// ソケット拒否解消後に実寸検査が見つけた3字幕だけを再判断する今回専用の続行。
// 候補・映像・本文・renderer/styleを変更せず、既存Skillと全検査を再実行する。
async function main() {
  const c = await loadDigestContextV001(process.argv[2]);
  const out = (name: string) => `${c.plan.outputRoot}/${name}`;
  const abs = (name: string) => path.join(ROOT, out(name));
  const execution = await readJson(out('renderer-result.json'));
  const rejected = execution.result?.failure;
  if (execution.exitCode !== 1 || rejected?.stage !== 'layout-preflight'
    || !same(rejected.violations.map((v: Json) => ({code: v.code, instruction: v.instructionId.slice(-6)})),
      ['000028', '000030', '000032'].map(instruction => ({code: 'LAYOUT_SAFE_AREA_VIOLATION', instruction})))) fail('EXPECTED_LAYOUT_FAILURE_REQUIRED');
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
  let core = await constructDigestCaptionCoreV001(c, adoption, base, tokens);
  const artifacts: Json = {};
  for (const [name, filename] of Object.entries(CORE_FILES)) {
    const saved = await readJson(out(filename));
    if (!same(saved, core[name as keyof typeof core])) fail('CORE_INPUT_CHANGED');
    artifacts[name] = bind(out(filename), saved);
  }
  const names = ['renderer-result.json', 'admission-receipt.json', 'line-layout.json',
    'process-observations', '.render.presentation-renderer-v002.lock', '.render.presentation-renderer-v002-work-nnrXx7',
    'display-3-response.json', 'display-3-result.json', ...Object.values(CORE_FILES)];
  const evidence: Json[] = [];
  async function inventory(relative: string) {
    const s = await lstat(abs(relative));
    if (s.isSymbolicLink()) fail('FAILURE_EVIDENCE_SYMLINK');
    if (s.isDirectory()) for (const child of await readdir(abs(relative))) await inventory(`${relative}/${child}`);
    else if (s.isFile()) evidence.push({path: relative, sizeBytes: s.size, fileSha256: await fileSha(abs(relative))});
    else fail('FAILURE_EVIDENCE_UNSUPPORTED');
  }
  for (const name of names) await inventory(name);
  await mkdir(abs('failed-layout-attempt-v001'));
  for (const name of names) await rename(abs(name), abs(`failed-layout-attempt-v001/${name}`));
  for (const record of evidence) {
    if (await fileSha(abs(`failed-layout-attempt-v001/${record.path}`)) !== record.fileSha256) fail('FAILURE_EVIDENCE_CHANGED');
  }
  const request = inputs.requests[2];
  await publish(out('display-3-layout-repair-request.json'), {
    schemaVersion: 'candidate-digest-display-layout-repair-request-v001', request,
    rejectedLayout: rejected, preservedFiles: evidence,
    task: '実寸安全領域を超えた3字幕の意味を保って表示終端・行末を見直す。他の表示・本文・候補・styleは維持する。',
  });
  let response: Json | undefined;
  const result = await runCaptionDisplayBoundariesV001(request.input, async input => {
    if (!same(input, request.input)) fail('DISPLAY_INPUT_CHANGED');
    response = await judgeThroughStdinV001(request);
    await publish(out('display-3-response.json'), response);
    return response.answer;
  });
  await publish(out('display-3-result.json'), result);
  tokens[2] = validateDigestDisplayV001(request, response!, result);
  displayJudgments[2] = {request: bind(out('display-3-request.json'), request),
    response: bind(out('display-3-response.json'), response!), result: bind(out('display-3-result.json'), result)};
  core = await constructDigestCaptionCoreV001(c, adoption, base, tokens);
  for (const [name, filename] of Object.entries(CORE_FILES)) artifacts[name] = await publish(out(filename), core[name as keyof typeof core]);
  const continuation = await publish(out('renderer-layout-continuation.json'), {
    schemaVersion: 'candidate-digest-renderer-layout-continuation-v001',
    reason: 'three-caption-lines-rejected-by-actual-safe-area-inspection',
    planBinding: c.planBinding, rendererJobBinding: artifacts.rendererJob,
    unchangedSavedCandidateJudgment: true, changedDisplayJudgment: 3, unchangedTextAndMedia: true,
    unchangedRendererAndStyle: true, priorFailureDirectory: out('failed-layout-attempt-v001'),
    preservedFiles: evidence, action: 'existing-display-skill-revision-and-full-renderer-qc',
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
    core: artifacts, renderer, rendererLayoutContinuation: continuation,
    rendererEnvironmentContinuation: bind(out('renderer-environment-continuation.json'), await readJson(out('renderer-environment-continuation.json'))),
    trace: {sourceVideo: c.plan.request.sourceVideo, adoptedCandidateCount: adoption.selectedCandidates.length,
      selectedSourceRanges: editPlan.segments, outputOrder: adoption.selectedCandidates.map((v: Json) => v.candidateId)},
    operations: {newCandidateJudgments: 1, newDisplayJudgments: 4, displayLayoutRevisions: 1, apiCommunication: 'none', newMaterial: 'none', humanQuality: 'not-evaluated'},
    humanDecision: {status: 'pending', video: renderer.video,
      questions: ['選ばれた箇所が見どころとして妥当か', '不要な箇所が多くないか', '必要な文脈が欠けていないか', '全体としてダイジェストとして気持ちよく見られるか']}};
  await publish(out('manifest.json'), manifest);
  const verified = await verifyDigestE2EV001(out('manifest.json'));
  await publish(out('verification.json'), {schemaVersion: 'candidate-digest-final-verification-v001', ...verified});
  process.stdout.write(`${JSON.stringify({manifest: out('manifest.json'), verified})}\n`);
}
main().catch(error => {console.error(error); process.exitCode = 1;});
