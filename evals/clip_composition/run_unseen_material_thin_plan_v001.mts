import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdir, readFile} from 'node:fs/promises';
import {
  ROOT, bind, readJson, readBound, publish, same, keys, sha, formal, fileSha, pass, type Json,
} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {runCandidateDiscoveryV001} from '../../runner/src/skills/candidate-discovery-v001.js';
import {runCandidateSelectionV001} from '../../runner/src/skills/candidate-selection-v001.js';
import {runCaptionDisplayBoundariesV001} from '../../runner/src/skills/caption-display-boundaries-v001.js';
import {buildSelectionRequestV001} from './candidate_selection_validation_v001.mts';
import {assertThinPlanV0} from './run_thin_plan_candidate_selection_v0.mts';
import {
  buildDistantConnectionCommonUtteranceArtifactFromTranscriptFileV001 as buildUtterances,
  validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001 as validateUtterances,
} from '../../runner/src/distant-connection-common-utterance-artifact-v001.js';
import {
  ROOT024, WORK024, SOURCE024, SOURCE_VIDEO024, TRANSCRIPT024, STRUCTURE024,
  buildUnseenDiscoveryRequestV001, validateUnseenDiscoveryV001, projectUnseenSelectionPlanV001,
  selectUnseenCandidatesV001, keepWholeSelectedContextsV001,
} from './unseen_material_thin_plan_v001.mts';
import {
  buildAdoptedBaseMediaV001, buildAdoptedCaptionInputsV001, validateDisplayForAdoptionV001,
  readValidatedDisplayTracesV001, assembleAdoptedCaptionCoreV001, renderAdoptedVideoV001, CORE_FILES,
} from './adopted_media_manufacturing_v001.mts';
import {validatePresentationBaseMediaBuildJobV001 as validateManufacturingJob}
  // @ts-expect-error Existing JS validator has no declaration file.
  from './presentation_base_media_build_v003.mjs';

export const IMPLEMENTATIONS024 = [
  'evals/clip_composition/run_unseen_material_thin_plan_v001.mts',
  'evals/clip_composition/unseen_material_thin_plan_v001.mts',
  'runner/src/skills/candidate-discovery-v001.ts',
  'runner/src/skills/candidate-selection-v001.ts',
  'runner/src/skills/caption-display-boundaries-v001.ts',
  'runner/src/skills/candidate-internal-retention-v001.ts',
  'runner/src/distant-connection-common-utterance-artifact-v001.ts',
  'runner/src/transcript-utils.ts',
  'evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts',
  'evals/clip_composition/run_thin_plan_candidate_selection_v0.mts',
  'evals/clip_composition/candidate_selection_validation_v001.mts',
  'evals/clip_composition/adopted_media_manufacturing_v001.mts',
];
const templateRoot = 'evals/clip_composition/outputs/presentation/distant-connection-existing-caption-selection/candidate-doctor-disappearance-to-ogre-mother-v001';
const out = (name: string) => `${WORK024}/${name}`;
const byteBinding = async (p: string) => ({path: p, fileSha256: await fileSha(path.join(ROOT, p))});
const jsonBinding = async (p: string) => {
  const b = bind(p, await readJson(p));
  assert.equal(await fileSha(path.join(ROOT, p)), b.fileSha256, 'FORMAL_JSON_BYTES_REQUIRED');
  return b;
};

export async function prepareUnseenMaterialV001() {
  const thinPlan = await readJson(`${ROOT024}/thin-plan-v0.json`);
  assertThinPlanV0(thinPlan);
  const received = await readJson(`${ROOT024}/source-acquisition-authorization-v001.json`);
  assert.equal(received.sourceId, SOURCE024);
  assert.equal(received.sourceUrl, `https://www.youtube.com/watch?v=${SOURCE024}`);
  assert.equal(received.authorizationQuote, '新素材を承認します。');
  assert.equal(received.productionIntent, thinPlan.productionIntent);
  const transcript = await readJson(TRANSCRIPT024);
  assert.equal(transcript.partial, false, 'FULL_SOURCE_TRANSCRIPT_REQUIRED');
  assert.equal(transcript.processedChunkCount, transcript.fullChunkCount, 'FULL_SOURCE_TRANSCRIPT_REQUIRED');
  assert.equal(transcript.sourceUri, path.join(ROOT, SOURCE_VIDEO024), 'TRANSCRIPT_VIDEO_SOURCE_REQUIRED');
  await mkdir(path.join(ROOT, WORK024));
  const authorization = await publish(out('received-instruction.json'), {
    schemaVersion: 'unseen-material-received-instruction-v001', recordId: 'instruction-024-continue-SsdxVhwxyYo',
    receivedAuthorizationBinding: await jsonBinding(`${ROOT024}/source-acquisition-authorization-v001.json`),
    instruction: received.instruction, sourceId: SOURCE024, sourceUrl: received.sourceUrl,
    authorizationQuote: received.authorizationQuote, scope: received.conditions,
  });
  const utterances = await buildUtterances({workspaceRoot: ROOT, sourceTranscriptPath: TRANSCRIPT024});
  const utteranceBinding = await publish(out('utterances.json'), utterances);
  const plan = {
    schemaVersion: 'unseen-material-thin-plan-evaluation-v001', planId: 'unseen-SsdxVhwxyYo-024-v001',
    stage: 'candidate-discovery', authorization,
    sourceAcquisitionBinding: await jsonBinding(`${ROOT024}/acquisition-completion-v001.json`),
    sttVerificationBinding: await jsonBinding(`${ROOT024}/stt-completion-verification-v004.json`),
    thinPlanBinding: await jsonBinding(`${ROOT024}/thin-plan-v0.json`), discoveryPlanBinding: null,
    request: {purpose: thinPlan.productionIntent, sourceId: SOURCE024,
      sourceVideo: await byteBinding(SOURCE_VIDEO024), transcript: await byteBinding(TRANSCRIPT024),
      utterances: utteranceBinding, candidateSet: null,
      rendererTemplate: await jsonBinding(`${templateRoot}/renderer-template-v002.json`),
      captionStyleTemplate: await jsonBinding(`${templateRoot}/source-package-v001.json`)},
    structureConditions: [...STRUCTURE024],
    implementationBindings: await Promise.all(IMPLEMENTATIONS024.map(byteBinding)), outputRoot: WORK024,
  };
  await publish(out('discovery-plan.json'), plan);
  const c = await loadUnseenContextV001('discovery');
  const request = buildUnseenDiscoveryRequestV001(c);
  await publish(out('candidate-request.json'), request);
  await publish(out('discovery-input-isolation.json'), {
    schemaVersion: 'unseen-material-discovery-input-isolation-v001', status: 'passed', planBinding: c.planBinding,
    requestBinding: bind(out('candidate-request.json'), request), thinPlanBinding: plan.thinPlanBinding,
    fullTranscriptUtteranceCount: utterances.utteranceCount,
    inputUtteranceCount: request.input.utterances.length,
    equalityToAllTranscriptUtterances: same(request.input.utterances,
      utterances.utterances.map(u => ({utteranceId: u.utteranceId, text: u.text}))),
    priorLabelsOrExternalEditorialData: 'not-provided', productionIntentFixedBeforeAcquisition: true,
    perceptualClaimsFromSTT: 'not-established',
  });
  return {requestPath: out('candidate-request.json'), utteranceCount: request.input.utterances.length};
}

export async function loadUnseenContextV001(stage: 'discovery' | 'selection'): Promise<Json> {
  const planPath = out(`${stage}-plan.json`);
  const plan = await readJson(planPath);
  assert(keys(plan, ['schemaVersion', 'planId', 'stage', 'authorization', 'sourceAcquisitionBinding', 'sttVerificationBinding', 'thinPlanBinding', 'discoveryPlanBinding',
    'request', 'structureConditions', 'implementationBindings', 'outputRoot'])
    && plan.schemaVersion === 'unseen-material-thin-plan-evaluation-v001'
    && plan.planId === 'unseen-SsdxVhwxyYo-024-v001' && plan.stage === `candidate-${stage}`
    && plan.outputRoot === WORK024, 'PLAN_INVALID');
  assert(keys(plan.request, ['purpose', 'sourceId', 'sourceVideo', 'transcript', 'utterances',
    'candidateSet', 'rendererTemplate', 'captionStyleTemplate']), 'REQUEST_FIELDS_INVALID');
  assert.equal(plan.request.sourceId, SOURCE024);
  assert.equal(plan.request.sourceVideo.path, SOURCE_VIDEO024);
  assert.equal(plan.request.transcript.path, TRANSCRIPT024);
  assert(same(plan.structureConditions, STRUCTURE024), 'STRUCTURE_CHANGED');
  assert(same(plan.implementationBindings.map((b: Json) => b.path), IMPLEMENTATIONS024), 'IMPLEMENTATION_MEMBERSHIP_CHANGED');
  for (const b of [...plan.implementationBindings, plan.request.sourceVideo, plan.request.transcript]) {
    assert.equal(await fileSha(path.join(ROOT, b.path)), b.fileSha256, 'BOUND_FILE_CHANGED');
  }
  for (const b of [plan.authorization, plan.sourceAcquisitionBinding, plan.sttVerificationBinding, plan.thinPlanBinding, plan.request.utterances,
    plan.request.rendererTemplate, plan.request.captionStyleTemplate]) {
    assert.equal(await fileSha(path.join(ROOT, b.path)), b.fileSha256, 'BOUND_JSON_BYTES_CHANGED');
  }
  const [thinPlan, authorization, utterances, rendererTemplate, captionStyleTemplate] = await Promise.all([
    readBound(plan.thinPlanBinding), readBound(plan.authorization), readBound(plan.request.utterances),
    readBound(plan.request.rendererTemplate), readBound(plan.request.captionStyleTemplate),
  ]);
  assertThinPlanV0(thinPlan);
  const received = await readBound(authorization.receivedAuthorizationBinding);
  assert.equal(received.sourceId, SOURCE024);
  assert.equal(received.authorizationQuote, '新素材を承認します。');
  assert.equal(authorization.recordId, 'instruction-024-continue-SsdxVhwxyYo');
  assert.equal(received.productionIntent, thinPlan.productionIntent);
  assert.equal(plan.request.purpose, thinPlan.productionIntent);
  const acquisition = await readBound(plan.sourceAcquisitionBinding);
  const sttVerification = await readBound(plan.sttVerificationBinding);
  assert.equal(acquisition.status, 'passed'); assert.equal(sttVerification.status, 'passed');
  assert.equal(acquisition.sourceVideo.path, SOURCE_VIDEO024);
  assert.equal(acquisition.sourceVideo.fileSha256, plan.request.sourceVideo.fileSha256);
  assert.equal(acquisition.thinPlanFixedBeforeAcquisition.fileSha256, plan.thinPlanBinding.fileSha256);
  assert.equal(sttVerification.formalTranscriptBinding.path, path.join(ROOT, plan.request.transcript.path));
  assert.equal(sttVerification.formalTranscriptBinding.fileSha256, plan.request.transcript.fileSha256);
  assert.equal(sttVerification.fullChunkCount, sttVerification.verifiedChunkCount);
  const transcriptBytes = await readFile(path.join(ROOT, plan.request.transcript.path));
  validateUtterances(utterances, {sourceTranscriptPath: plan.request.transcript.path, sourceTranscriptBytes: transcriptBytes});
  const transcript = JSON.parse(transcriptBytes.toString());
  assert.equal(transcript.sourceUri, path.join(ROOT, plan.request.sourceVideo.path));
  assert.equal(transcript.partial, false);
  assert.equal(transcript.processedChunkCount, transcript.fullChunkCount);
  const c: Json = {plan, planBinding: bind(planPath, plan), thinPlan, authorization, transcript, utterances,
    rendererTemplate, captionStyleTemplate};
  if (stage === 'discovery') {
    assert.equal(plan.discoveryPlanBinding, null);
    assert.equal(plan.request.candidateSet, null);
  } else {
    const source = await loadUnseenContextV001('discovery');
    assert(same(plan.discoveryPlanBinding, source.planBinding), 'DISCOVERY_CONTEXT_CHANGED');
    const [request, response, result] = await Promise.all(
      ['candidate-request.json', 'candidate-response.json', 'candidate-result.json'].map(p => readJson(out(p))));
    const expected = validateUnseenDiscoveryV001(source, request, response, result);
    c.candidateSet = await readBound(plan.request.candidateSet);
    assert(same(c.candidateSet, expected.candidateSet), 'DISCOVERED_CANDIDATES_FILTERED_OR_CHANGED');
    assert(same(plan, projectUnseenSelectionPlanV001(source, c.candidateSet)), 'SELECTION_PROJECTION_CHANGED');
    c.discovery = result;
  }
  return c;
}

export async function executeUnseenDiscoveryV001(responsePath: string) {
  const c = await loadUnseenContextV001('discovery');
  const request = await readJson(out('candidate-request.json'));
  assert(same(request, buildUnseenDiscoveryRequestV001(c)));
  const response = await readJson(responsePath);
  const result = await runCandidateDiscoveryV001(request.input, async input => {
    assert(same(input, request.input)); return response.answer;
  });
  const {candidateSet, validation} = validateUnseenDiscoveryV001(c, request, response, result);
  await publish(out('candidate-response.json'), response);
  await publish(out('candidate-result.json'), result);
  await publish(out('candidate-set.json'), candidateSet);
  await publish(out('discovery-validation.json'), validation);
  await publish(out('selection-plan.json'), projectUnseenSelectionPlanV001(c, candidateSet));
  const selection = await loadUnseenContextV001('selection');
  const selectionRequest = buildSelectionRequestV001(selection);
  await publish(out('selection-request.json'), selectionRequest);
  return {status: 'discovery-validated', candidateCount: candidateSet.candidates.length,
    selectionRequestPath: out('selection-request.json')};
}

export async function executeUnseenSelectionV001(responsePath: string) {
  const c = await loadUnseenContextV001('selection');
  const request = await readJson(out('selection-request.json'));
  const response = await readJson(responsePath);
  const result = await runCandidateSelectionV001(request.input, async input => {
    assert(same(input, request.input)); return response.answer;
  });
  const selected = selectUnseenCandidatesV001(c, request, response, result);
  await publish(out('selection-response.json'), response);
  await publish(out('selection-result.json'), result);
  await publish(out('selection-validation.json'), selected.validation);
  await publish(out('selection-adoption.json'), selected.adoption);
  return {status: 'selection-validated', adopted: selected.adoption.adoptedCandidates.map((r: Json) => r.candidateId),
    rejected: selected.adoption.rejectedCandidates.map((r: Json) => r.candidateId)};
}

async function reconstructSelection() {
  const c = await loadUnseenContextV001('selection');
  const [request, response, result, saved] = await Promise.all(
    ['selection-request.json', 'selection-response.json', 'selection-result.json', 'selection-adoption.json'].map(p => readJson(out(p))));
  const selected = selectUnseenCandidatesV001(c, request, response, result);
  assert(same(saved, selected.adoption), 'SAVED_ADOPTION_CHANGED');
  return {c, selected};
}

async function reconstructExecution() {
  const {c, selected} = await reconstructSelection();
  const assessment = await readJson(out('retention-assessment.json'));
  const expected = keepWholeSelectedContextsV001(c, selected.adoption, assessment);
  const [adoption, editPlan] = await Promise.all(['machine-adoption.json', 'edit-plan.json'].map(p => readJson(out(p))));
  assert(same(adoption, expected.adoption) && same(editPlan, expected.editPlan), 'EXECUTION_ADOPTION_CHANGED');
  return {c, adoption, editPlan};
}

export async function executeUnseenBaseMediaV001(assessmentPath: string) {
  const {c, selected} = await reconstructSelection();
  const assessment = await readJson(assessmentPath);
  const {adoption, editPlan} = keepWholeSelectedContextsV001(c, selected.adoption, assessment);
  await publish(out('retention-assessment.json'), assessment);
  const ad = await publish(out('machine-adoption.json'), adoption);
  const ep = await publish(out('edit-plan.json'), editPlan);
  const source = {sourceProvenance: 'user-authorized-youtube-full-source', sourceRef: SOURCE024,
    sourceUri: c.transcript.sourceUri, ...c.plan.request.sourceVideo};
  const manufacturingJob = {schemaVersion: 'presentation-base-media-build-job-v001',
    jobId: `${c.plan.planId}-manufacturing-values`, assemblyDecision: {path: ad.path, fileSha256: ad.fileSha256},
    sourceArtifact: source, outputDirectory: out('base-media')};
  pass(validateManufacturingJob(manufacturingJob), 'MANUFACTURING_VALUES_INVALID');
  const jb = await publish(out('manufacturing-values.json'), manufacturingJob);
  const invocation = await publish(out('core-invocation.json'), {
    schemaVersion: 'unseen-material-core-invocation-v001', authorizationBinding: c.plan.authorization,
    planBinding: c.planBinding, machineAdoptionBinding: ad, editPlanBinding: ep, manufacturingValuesBinding: jb,
    admission: 'existing-selection-validation-and-explicit-retention-assessment',
    legacyHumanApprovalJobEntry: 'not-invoked', individualCandidateHumanApproval: 'not-performed',
    adapterBinding: c.plan.implementationBindings[0],
  });
  await reconstructExecution();
  const base = await buildAdoptedBaseMediaV001(c, adoption, editPlan, manufacturingJob, jb, invocation,
    {inspection: 'unseen-material-source-inspection-v001', receipt: 'unseen-material-base-media-validation-v001'});
  await publish(out('base-media-bindings.json'), {schemaVersion: 'unseen-material-base-media-bindings-v001', ...base});
  const inputs = captionInputs(c, adoption, base);
  for (const [i, r] of inputs.requests.entries()) await publish(out(`display-${i + 1}-request.json`), r);
  return {status: 'base-media-complete', displayRequests: inputs.requests.length};
}

function captionInputs(c: Json, adoption: Json, base: Json) {
  return buildAdoptedCaptionInputsV001(c, adoption.selectedCandidates, bind(out('machine-adoption.json'), adoption), base,
    {meaning: 'unseen-material-presentation-meaning-input-v001',
      displayRequest: 'unseen-material-display-request-v001', sourceRole: 'unseen-source'});
}

export async function executeUnseenCaptionCoreV001(responsesPath: string) {
  const {c, adoption} = await reconstructExecution();
  const {schemaVersion: _baseSchema, ...base} = await readJson(out('base-media-bindings.json'));
  const input = captionInputs(c, adoption, base);
  const responses = await readJson(responsesPath);
  assert(Array.isArray(responses.responses) && responses.responses.length === input.requests.length, 'CAPTION_RESPONSES_MISSING');
  const tokens = [];
  for (const [i, request] of input.requests.entries()) {
    assert(same(request, await readJson(out(`display-${i + 1}-request.json`))), 'DISPLAY_REQUEST_CHANGED');
    const response = responses.responses[i];
    const result = await runCaptionDisplayBoundariesV001(request.input, async value => {
      assert(same(value, request.input)); return response.answer;
    });
    tokens.push(validateDisplayForAdoptionV001(request, response, result, 'unseen-material-display-response-v001'));
    await publish(out(`display-${i + 1}-response.json`), response);
    await publish(out(`display-${i + 1}-result.json`), result);
  }
  const traces = readValidatedDisplayTracesV001(input.requests, tokens);
  const captionAdoption = {schemaVersion: 'unseen-material-caption-adoption-v001',
    machineAdoptionBinding: bind(out('machine-adoption.json'), adoption),
    meaningInputBinding: bind(out('meaning-input.json'), input.meaning),
    displayJudgments: traces.map((v, i) => ({candidateId: v.request.candidateId,
      request: bind(out(`display-${i + 1}-request.json`), v.request),
      response: bind(out(`display-${i + 1}-response.json`), v.response),
      result: bind(out(`display-${i + 1}-result.json`), v.result)})),
    composition: 'validated-display-cues-in-adopted-source-order', quality: 'not-evaluated'};
  const artifacts: Json = await assembleAdoptedCaptionCoreV001(c, input, base, captionAdoption, traces);
  for (const [key, name] of Object.entries(CORE_FILES)) await publish(out(name), artifacts[key]);
  return {status: 'caption-core-complete', rendererJob: out(CORE_FILES.rendererJob)};
}

export async function executeUnseenRenderV001() {
  const {c} = await reconstructExecution();
  const artifacts = Object.fromEntries(await Promise.all(Object.entries(CORE_FILES)
    .map(async ([k, name]) => [k, bind(out(name), await readJson(out(name)))])));
  const rendered = await renderAdoptedVideoV001(c, artifacts, 'unseen-material-renderer-execution-v001');
  return publish(out('render-completion.json'), {
    schemaVersion: 'unseen-material-render-completion-v001', status: 'technical-render-complete',
    planBinding: c.planBinding, machineAdoptionBinding: await jsonBinding(out('machine-adoption.json')),
    ...rendered, humanQuality: 'not-evaluated',
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [stage, inputPath] = process.argv.slice(2);
  const actions: Record<string, () => Promise<unknown>> = {
    prepare: prepareUnseenMaterialV001,
    discover: () => executeUnseenDiscoveryV001(inputPath),
    select: () => executeUnseenSelectionV001(inputPath),
    base: () => executeUnseenBaseMediaV001(inputPath),
    captions: () => executeUnseenCaptionCoreV001(inputPath),
    render: executeUnseenRenderV001,
  };
  assert(actions[stage], 'UNKNOWN_STAGE');
  console.log(JSON.stringify(await actions[stage]()));
}
