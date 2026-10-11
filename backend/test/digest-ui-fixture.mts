// Artificial JSON qualification fixture. No media decoding, provider traffic or production state.
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as shared from '@zev2/shared';
import { prepareDigestPlanV001 } from '../../runner/src/digest-plan-preparation-v001.js';
import { consumePreparedDigestPlanV001 } from '../../runner/src/digest-plan-consumption-v001.js';
import { prepareDigestCaptionJudgmentInputsV001 } from '../../runner/src/digest-caption-input-preparation-v001.js';
import { formal, sha } from '../../evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts';
export const workspace = await realpath(fileURLToPath(new URL('../../', import.meta.url)));
export async function createFixtureWorkspace() {
  const volume = process.env.ZEV_UI_DIGEST_TEST_SSD;
  assert(volume?.startsWith('/Volumes/'), 'Explicit SSD test root required; never fall back or relax the normal reader');
  const inputRoot = await realpath(await mkdtemp(path.join(volume, 'zev-ui68-json-test-')));
  const prefix = 'runtime/artifacts/ui68-artificial', runtime = path.join(inputRoot, prefix, 'normal-runtime');
  await mkdir(path.join(runtime, 'artifacts'), { recursive: true });
  await mkdir(path.join(workspace, 'runtime'), { recursive: true });
  const sourceRoot = await mkdtemp(path.join(workspace, 'runtime/ui68-artificial-source-'));
  return { inputRoot, prefix, runtime, sourceRoot,
    cleanup: async () => { await rm(inputRoot, { recursive: true });await rm(sourceRoot, { recursive: true }); } };
}
export async function makeDigestUiFixture(area: Awaited<ReturnType<typeof createFixtureWorkspace>>, variant: 'a' | 'b', selection: 'all' | 'first-only' = 'all',
  options: { candidateCount?: number; idSuffix?: string } = {}) {
  const state = shared.createInitialState(), at = '2026-10-11T04:00:00.000Z';
  const fixtureId = variant + (options.idSuffix ?? '');
  const bytes = Buffer.from(`artificial-${fixtureId}-not-a-playable-media-file`), sourcePath = path.join(area.sourceRoot, `${fixtureId}.mp4`);
  await writeFile(sourcePath, bytes, { flag: 'wx' });
  const draft = shared.createRequestDraft({ productionType: 'digest', purpose: `人工素材${variant}の要点を元順序で確認`,
    sourceUri: new URL(`file://${sourcePath}`).href, durationLabel: '入力の範囲内', themeCountLabel: '保存候補',
    geminiModelName: shared.DEFAULT_GEMINI_MODEL, preset: 'artificial-fixture' }, at, () => `digest-${fixtureId}`);
  draft.status = 'approved';state.requestDrafts.push(draft);
  let n = 0;state.agentRequests = shared.createAgentRequestsFromDraft(draft, at, () => `${fixtureId}-request-${++n}`);
  const request = (type: shared.AgentRequest['type']) => state.agentRequests.find(r => r.type === type)!;
  const video = request('prepare_video'), stt = request('run_stt'), plan = request('prepare_digest_plan'), execution = request('validate_digest_plan');
  const directory = path.join(area.runtime, 'artifacts', draft.id);await mkdir(directory);
  const logical = (id: string, name: string) => `artifacts/${draft.id}/${id}/${name}`;
  const physical = (id: string, name: string) => path.join(directory, shared.digestArtifactFileNameV001(logical(id, name), draft.id));
  const save = async (id: string, name: string, value: any) => { const data = Buffer.from(formal(value));await writeFile(physical(id, name), data, { flag: 'wx' });return data; };
  const register = async (r: shared.AgentRequest, name: string, value: any) => {
    const data = await save(r.id, name, value), outputId = `out-${r.id}`;
    const f: shared.FileRef = { id: `file-${r.id}`, ownerId: outputId, kind: shared.getFileRefKindForRequest(r.type),
      uri: `/api/artifacts/${draft.id}/${path.basename(physical(r.id, name))}`, mimeType: 'application/json', access: 'internal',
      artifactFileName: path.basename(physical(r.id, name)), byteSize: data.length, sha256: sha(data), createdAt: at };
    state.fileRefs.push(f);state.outputs.push({ id: outputId, type: shared.getOutputTypeForRequest(r.type), fileRefId: f.id, meaning: '人工fixture' });
    r.status = 'succeeded';r.fileRefIds = [f.id];r.result = { outputId, outputType: shared.getOutputTypeForRequest(r.type), fileRefId: f.id, meaning: '人工fixture' };
    return f;
  };
  const count = variant === 'a' ? 6 : 8, baseId = variant === 'a' ? 101 : 701;
  const candidateCount = options.candidateCount ?? 2;
  assert(Number.isSafeInteger(candidateCount) && candidateCount >= 2 && candidateCount <= count);
  const segments = Array.from({ length: count }, (_, i) => ({ id: baseId + i, startMs: 1000 + i * 500,
    endMs: 1500 + i * 500, text: `人工${variant}の発話${i + 1}。` }));
  const durationSec = (segments.at(-1)!.endMs + 1000) / 1000;
  const inspection = { schemaVersion: 'new-material-source-inspection-v001',
    sourceVideoBinding: { path: logical(plan.id, 'source-media.mp4'), fileSha256: sha(bytes) },
    media: { fps: 30, decodedFrameCount: durationSec * 30, logicalFrameCount: durationSec * 30,
      videoClock: { presentationOffsetMs: 0 }, audioClock: { sampleRate: 48000, channels: 2, channelLayout: 'stereo',
        spans: [], sourceGridSampleCount: durationSec * 48000, sourceGridMappingEndSample: durationSec * 48000, decodedTailPaddingSampleCount: 0 } } };
  const inspectionBytes = await save(video.id, 'source-inspection.json', inspection);
  await register(video, 'source.json', { kind: 'source_video', mode: 'local-source-reference', sourceUri: draft.source.uri,
    purpose: draft.purpose, registeredAt: at, localPath: sourcePath,
    sourceInspectionBinding: { path: logical(video.id, 'source-inspection.json'), fileSha256: sha(inspectionBytes) } });
  const transcript = { kind: 'transcript_json' as const, mode: 'zev-sample-stt' as const, generatedAt: at, sourceUri: draft.source.uri,
    language: 'ja', durationSec, segmentCount: count, segments, speechUnitGroups: [segments.map(s => s.id)], notes: [] };
  const transcriptFile = await register(stt, 'transcript.json', transcript);
  const claim = (r: shared.AgentRequest) => Object.assign(r, { status: 'running', claimOwnerId: 'artificial-fixture',
    claimedAt: at, claimUpdatedAt: at, claimExpiresAt: '2026-10-12T04:00:00.000Z' });
  claim(plan);
  const judge = async (stage: string, r: any) => {
    let answer;
    if (stage === 'discovery') {
      const ranges = Array.from({ length: candidateCount }, (_, i) => [Math.floor(r.input.utterances.length * i / candidateCount),
        Math.floor(r.input.utterances.length * (i + 1) / candidateCount) - 1]);
      answer = { status: 'complete', candidates: ranges.map(([start, end], i) => ({
        sourceId: r.input.sourceId, title: `人工${variant}の場面${i + 1}`, reason: `保存済み要約${variant}-${i + 1}`,
        evidenceUtteranceIds: [r.input.utterances[start].utteranceId], contextStartUtteranceId: r.input.utterances[start].utteranceId,
        contextEndUtteranceId: r.input.utterances[end].utteranceId })) };
    } else if (stage === 'selection') {
      answer = { status: 'complete', decisions: r.input.candidates.map((c: any, index: number) => ({ candidateId: c.candidateId, sourceId: c.sourceId,
        decision: selection === 'first-only' && index > 0 ? 'reject' : 'adopt', basis: selection === 'first-only' && index > 0 ? 'weak' : 'distinct-highlight', reason: '人工入力の配線確認', evidenceUtteranceIds: [c.utterances[0].utteranceId],
        comparisons: r.input.candidates.filter((o: any) => o.candidateId !== c.candidateId).map((o: any) => ({ candidateId: o.candidateId, evidenceUtteranceIds: [o.utterances[0].utteranceId] })) })) };
    } else {
      answer = { status: 'complete', candidates: r.input.candidates.map((c: any) => { const atoms = c.utterances.flatMap((u: any) => u.atoms);
        return { candidateId: c.candidateId, meaningPreserved: '人工本文をそのまま保持', blocks: [{ action: 'keep', startSourceSegmentId: atoms[0].sourceSegmentId,
          endSourceSegmentId: atoms.at(-1).sourceSegmentId, roles: ['payoff'], reason: '人工区間を保持' }] }; }) };
    }
    return { schemaVersion: stage === 'discovery' ? 'candidate-discovery-judgment-response-v001' : stage === 'selection' ? 'candidate-selection-response-v001' : 'candidate-internal-retention-response-v001',
      requestFileSha256: sha(formal(r)), answer, judgmentNote: '通信しない人工回答' };
  };
  const deps = { workspaceRoot: workspace, artifactRoot: path.join(area.runtime, 'artifacts') };
  const prepared = await prepareDigestPlanV001({ ...deps, judge }, { state, request: plan, transcript, transcriptUri: transcriptFile.uri });
  const planFile = await register(plan, 'digest-plan.json', prepared.artifact);
  claim(execution);const consumed = await consumePreparedDigestPlanV001({ preparation: deps }, { state, request: execution });
  assert.equal(consumed.status, 'consumed');const executionFile = await register(execution, 'digest-execution.json', consumed.artifact);
  const json = (value: unknown) => Buffer.from(formal(value));
  const snapshotPath = `${area.prefix}/state-${fixtureId}.json`, stateBytes = json(state);await writeFile(path.join(area.inputRoot, snapshotPath), stateBytes);
  const stylePath = `${area.prefix}/style-${fixtureId}.json`, styleBytes = json({
    promptInput: { schemaVersion: 'presentation-zevo-caption-selection-input-v001', taskDescription: '人工字幕の表示境界確認',
      captions: [{ captionId: 'artificial-caption', boundaryCandidates: [{ boundaryId: 'artificial-boundary', text: '人工本文' }] }],
      styleLimits: { maxLogicalWidthPerLine: 18, maxLinesPerCue: 2, characterWidthRule: '人工検査の文字幅' } },
    reconstructionMap: { caseContexts: [{ resolvedStyle: { audioMode: 'preserve-source-only' } }] }
  });await writeFile(path.join(area.inputRoot, stylePath), styleBytes);
  const scopePath = 'docs/reports/zev-ui-b-implementation-20261011/digest-read-boundary.md';
  const parameters = { inputRoot: area.inputRoot, inputPrefix: area.prefix, sourceRuntimeRoot: area.runtime,
    outputRoot: path.join(area.inputRoot, area.prefix, `caption-${fixtureId}`), preparationId: `artificial-caption-${fixtureId}`,
    stateBinding: { path: snapshotPath, fileSha256: sha(stateBytes) }, scopeBinding: { path: scopePath, fileSha256: sha(await readFile(path.join(workspace, scopePath))) },
    styleTemplateBinding: { path: stylePath, fileSha256: sha(styleBytes) }, expected: { requestDraftId: draft.id, planRequestId: plan.id,
      executionRequestId: execution.id, planSha256: planFile.sha256, executionSha256: executionFile.sha256 } };
  const captions = await prepareDigestCaptionJudgmentInputsV001({ ...parameters, workspaceRoot: workspace });
  return { state, draft, plan, execution, planFile, executionFile, consumed, parameters, manifestBinding: captions.manifestBinding,
    body: { draftIdentity: shared.draftConfirmationIdentity(draft), parameters, manifestBinding: captions.manifestBinding }, inspection, directory };
}
