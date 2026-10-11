import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import * as published from '@zev2/agent-runner/digest-readonly';
import { readConsumedDigestPlanV001 } from '../dist/digest-plan-consumption-v001.js';
import { readPreparedDigestCaptionJudgmentInputsV001 } from '../dist/digest-caption-input-preparation-v001.js';
import { createInitialState, createRequestDraft, createAgentRequestsFromDraft, DEFAULT_GEMINI_MODEL } from '@zev2/shared';

test('public surface exposes the identical existing readers and no manufacturing capability', () => {
  assert.deepEqual(Object.keys(published).sort(), ['readConsumedDigestPlanV001','readPreparedDigestCaptionJudgmentInputsV001']);
  assert.equal(published.readConsumedDigestPlanV001, readConsumedDigestPlanV001);
  assert.equal(published.readPreparedDigestCaptionJudgmentInputsV001, readPreparedDigestCaptionJudgmentInputsV001);
});

test('published consumption reader still rejects unapproved input and missing registered plan', async () => {
  const state=createInitialState();let sequence=0;
  const draft=createRequestDraft({productionType:'digest',purpose:'人工入力',sourceUri:'file:///saved/fixture.mp4',durationLabel:'60秒以内',themeCountLabel:'3候補',geminiModelName:DEFAULT_GEMINI_MODEL,preset:'shorts_default'},'2026-10-11T03:00:00Z',()=> 'draft-readonly');
  state.requestDrafts.push(draft);state.agentRequests.push(...createAgentRequestsFromDraft(draft,draft.createdAt,()=> 'request-'+(++sequence)));
  const request=state.agentRequests.find(r=>r.type==='validate_digest_plan');
  const deps={preparation:{workspaceRoot:process.cwd(),artifactRoot:tmpdir()}};
  const before=structuredClone(state);
  await assert.rejects(()=>published.readConsumedDigestPlanV001(deps,{state,request}));
  assert.deepEqual(state,before);
  draft.status='approved';state.agentRequests.find(r=>r.type==='prepare_digest_plan').status='succeeded';
  const approved=structuredClone(state);
  await assert.rejects(()=>published.readConsumedDigestPlanV001(deps,{state,request}),/DIGEST_DEPENDENCY_REFERENCE_INVALID/);
  assert.deepEqual(state,approved);
});

test('published caption reader retains the real SSD input-root qualification', async () => {
  const root=await realpath(await mkdtemp(path.join(tmpdir(),'zev-digest-readonly-')));
  try {
    const parameters={workspaceRoot:process.cwd(),inputRoot:root,inputPrefix:'runtime/artifacts/fixture',sourceRuntimeRoot:root,outputRoot:root,preparationId:'fixture',
      stateBinding:{path:'state.json',fileSha256:'a'.repeat(64)},scopeBinding:{path:'scope.json',fileSha256:'a'.repeat(64)},
      styleTemplateBinding:{path:'style.json',fileSha256:'a'.repeat(64)},expected:{requestDraftId:'fixture',planRequestId:'plan',executionRequestId:'execution',planSha256:'a'.repeat(64),executionSha256:'b'.repeat(64)}};
    await assert.rejects(()=>published.readPreparedDigestCaptionJudgmentInputsV001(parameters,{path:'manifest.json',fileSha256:'a'.repeat(64)}),/CAPTION_PREPARATION_SSD_INPUT_ROOT_REQUIRED/);
  } finally { await rm(root,{recursive:true,force:true}); }
});
