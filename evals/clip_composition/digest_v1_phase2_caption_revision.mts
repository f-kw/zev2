import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {ROOT, bind, readJson, publish, same, sha, formal, canonicalSha, fileSha,
  judgeThroughStdinV001, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {loadPhase2CaptionContext, validatePhase2Display, resolvePhase2CaptionTiming} from './digest_v1_phase2_captions.mts';
import {phase2Out as out, requireAbsent} from './digest_v1_phase2_retention.mts';
import {assertCaptionDisplayInputV001, runCaptionDisplayBoundariesV001} from '../../runner/src/skills/caption-display-boundaries-v001.js';

const implementationPath = 'evals/clip_composition/digest_v1_phase2_caption_revision.mts';
export const approvedDisplayContinuation = '【kawafmm承認による限定的な表示方針改訂】通常の反復表現の途中では区切らない方針は維持する。ただし、意味上の区切りを持たない長い非語彙的な持続発声が既存styleの最大表示容量へ収まらない場合に限り、表示容量を優先して継続分割してよい。現在位置から既存表示容量に収まる最も後ろの有効な正式本文境界を選び、残りについて同じ処理を繰り返す。これは表示上の分割だけであり、新しい意味境界とは扱わない。読みとして一続きの最小発声表記は分断しない。原本文、正式本文ID、本文順序、全量被覆、retention結果、12保持区間、元動画時刻、style、論理幅計算、最大行数、通常の語彙的反復表現に対する方針は変更しない。圧縮・省略・置換・要約・文字削除・別表現への変換・retentionやcut境界への流用・通常発話や通常の反復語への一般化は禁止する。この例外は既存容量では一表示に収まらず、かつ意味境界による分割が成立しない非語彙的な持続発声だけに適用する。';

/** 本文もSkillの形も変えず、承認された判断指示だけを新版へ束縛する。 */
export function revisePhase2DisplayInput(original: Json, authorityBinding: Json, previousRequestBinding: Json) {
  const text = structuredClone(original);
  const revise = (input: Json) => ({...input, taskDescription: `${input.taskDescription}\n\n${approvedDisplayContinuation}`});
  text.promptInput = revise(text.promptInput);
  text.requests = text.requests.map((request: Json) => {
    const input = revise(request.input);
    return {...request, requestId: `${request.requestId}-policy-v002`, input, inputCanonicalSha256: canonicalSha(input)};
  });
  const input = revise(text.request.input);
  text.request = {...text.request, requestId: `${text.request.requestId}-policy-v002`,
    authorityBinding, previousRequestBinding, judgmentPolicyRevision: 'approved-nonlexical-display-continuation-v002',
    input, inputCanonicalSha256: canonicalSha(input)};
  for (const value of [text.promptInput, input, ...text.requests.map((r: Json) => r.input)]) assertCaptionDisplayInputV001(value);
  assert(same(text.textInput, original.textInput));
  assert(same(text.request.input.captions, original.request.input.captions));
  assert(same(text.request.input.styleLimits, original.request.input.styleLimits));
  return text;
}

export async function loadRevisedPhase2CaptionContext(job: string) {
  const c = await loadPhase2CaptionContext(job);
  const authority = await readJson(out(c, 'caption-policy-kawafmm-authorization-v002.json'));
  assert.equal(authority.authorization, 'kawafmm承認');
  assert.equal(authority.additionalCaptionDisplayCalls, 1);
  assert.equal(authority.scope, 'all-existing-12-retained-ranges');
  const text = revisePhase2DisplayInput(c.text, bind(out(c, 'caption-policy-kawafmm-authorization-v002.json'), authority),
    bind(out(c, 'display-all-request.json'), c.text.request));
  return {...c, originalText: c.text, text, authority};
}

export async function prepareRevisedPhase2Captions(job: string) {
  const c = await loadRevisedPhase2CaptionContext(job);
  await requireAbsent(out(c, 'display-all-request-v002.json'));
  await publish(out(c, 'display-all-request-v002.json'), c.text.request);
  await publish(out(c, 'display-input-preflight-v002.json'), {schemaVersion: 'digest-v1-phase2-display-revision-preflight-v002',
    status: 'passed', requestBinding: bind(out(c, 'display-all-request-v002.json'), c.text.request),
    authorityBinding: c.text.request.authorityBinding,
    implementationBinding: {path: implementationPath, fileSha256: await fileSha(path.join(ROOT, implementationPath))},
    unchanged: ['full-text', 'formal-ids', 'order', 'coverage', 'retention', 'retained-ranges', 'source-times', 'style', 'width-rule', 'line-count'],
    previousResponseBinding: bind(out(c, 'display-all-response.json'), await readJson(out(c, 'display-all-response.json'))),
    ranges: c.text.requests.length, atoms: c.text.textInput.atomOccurrences.length,
    previousCaptionCalls: 1, additionalCaptionCallsAllowed: 1, additionalCaptionCallsExecuted: 0});
  process.stdout.write(JSON.stringify({status: 'prepared', requestSha256: sha(formal(c.text.request)), ranges: c.text.requests.length}) + '\n');
}

export async function executeRevisedPhase2Captions(job: string) {
  const c = await loadRevisedPhase2CaptionContext(job);
  assert(same(await readJson(out(c, 'display-all-request-v002.json')), c.text.request));
  const preflight = await readJson(out(c, 'display-input-preflight-v002.json'));
  assert.equal(await fileSha(path.join(ROOT, implementationPath)), preflight.implementationBinding.fileSha256);
  await requireAbsent(out(c, 'display-execution-started-v002.json'));
  await publish(out(c, 'display-execution-started-v002.json'), {schemaVersion: 'digest-v1-phase2-display-execution-started-v002',
    requestBinding: bind(out(c, 'display-all-request-v002.json'), c.text.request),
    previousCaptionCalls: 1, plannedAdditionalCalls: 1, furtherRetryAllowed: false});
  let response: Json | undefined;
  const result = await runCaptionDisplayBoundariesV001(c.text.request.input, async input => {
    assert(same(input, c.text.request.input)); response = await judgeThroughStdinV001(c.text.request);
    await publish(out(c, 'display-all-response-v002.json'), response!); return response!.answer;
  });
  await publish(out(c, 'display-all-result-v002.json'), result);
  const traces = validatePhase2Display(c.text, response!, result);
  for (const [i, trace] of traces.entries()) for (const key of ['request', 'response', 'result'])
    await publish(out(c, `display-${i + 1}-${key}-v002.json`), trace[key]);
  const validation = await publish(out(c, 'display-validation-v002.json'), {schemaVersion: 'digest-v1-phase2-display-validation-v002',
    status: 'passed', requestBinding: bind(out(c, 'display-all-request-v002.json'), c.text.request),
    responseBinding: bind(out(c, 'display-all-response-v002.json'), response!), resultBinding: bind(out(c, 'display-all-result-v002.json'), result),
    perRangeProjection: 'deterministic-no-new-judgment', totalCaptionCalls: 2, additionalCaptionCalls: 1,
    captionCount: traces.reduce((n, t) => n + t.cues.length, 0), ranges: traces.length,
    fullTextCoverage: 'passed', widthAndLineValidation: 'passed', humanQuality: 'not-evaluated'});
  const timing = resolvePhase2CaptionTiming(c, c.adoption, c.text, traces);
  await publish(out(c, 'caption-timing-resolution-v002.json'), {schemaVersion: 'digest-v1-phase2-caption-timing-resolution-v002',
    ...timing, displayValidationBinding: validation, machineAdoptionBinding: bind(out(c, 'machine-adoption.json'), c.adoption),
    acousticValidationBinding: c.originalAcousticBinding, policy: 'existing-cue-endpoint-resolution-and-explicit-unresolved-transcript-fallback',
    supplementalRetentionEndpointEvidenceUsedForCaption: false, humanSync: 'not-evaluated'});
  process.stdout.write(JSON.stringify({status: timing.status, captionCount: traces.reduce((n, t) => n + t.cues.length, 0),
    timingCues: timing.cues.length, issueCount: timing.issues.length, failureReason: timing.failureReason}) + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [mode, job] = process.argv.slice(2);
  try {
    if (mode === 'prepare' && job) await prepareRevisedPhase2Captions(job);
    else if (mode === 'execute' && job) await executeRevisedPhase2Captions(job);
    else throw new Error('usage: prepare|execute job.json');
  } catch (error) {process.stderr.write(String(error) + '\n'); process.exitCode = 1;}
}
