// 通常APIと実在する通常builderの境界を測る。Digest接続完成の試験ではない。
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const sha = (s: Uint8Array | string) => createHash('sha256').update(s).digest('hex');
const loader = path.join(root, 'runner/node_modules/tsx/dist/loader.mjs');
const transcriptPath = path.join(root, 'runtime/artifacts/digest-new-material-20260926-v001/transcript.json');
const source = async (p: string) => import(new URL(p, `file://${root}/`).href);
const mode = process.argv[2];
if (mode === 'readback') {
  assert(process.env.ZEV2_RUNTIME_DIR?.startsWith(path.join(tmpdir(), 'zev2-codex2-intent-')));
  const {loadState} = await source('backend/src/store/json-store.ts');
  const state = await loadState();
  console.log(JSON.stringify(state));
} else {
  assert.equal(mode, 'probe');
  const isolated = await mkdtemp(path.join(tmpdir(), 'zev2-codex2-intent-'));
  const businessStatePath = path.join(root, 'runtime/state.json');
  const businessBefore = await readFile(businessStatePath).catch(e => {
    if (e.code !== 'ENOENT') throw e;
    return null;
  });
  const transcriptBytes = await readFile(transcriptPath);
  Object.assign(process.env, {
    ZEV2_RUNTIME_DIR: isolated, ZEV2_DISABLE_AUTO_RUNNER: '1',
    ZEV2_AGENT_API_TOKEN: 'isolated-agent', ZEV2_HUMAN_API_TOKEN: 'isolated-human',
    GEMINI_API_KEY: '', GOOGLE_API_KEY: '',
  });
  const {default: express} = await source('backend/node_modules/express/index.js');
  const {default: router} = await source('backend/src/routes/control.ts');
  const app = express();
  app.use(express.json()); app.use('/api', router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve); server.once('error', reject);
  });
  const address = server.address(); assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api`;
  const api = async (route: string, method = 'GET', body?: unknown, actor = 'human') => {
    const response = await fetch(base + route, {method, headers: {
      'content-type': 'application/json', authorization: `Bearer isolated-${actor}`,
    }, ...(body === undefined ? {} : {body: JSON.stringify(body)})});
    return {status: response.status, body: await response.json() as any};
  };
  try {
    const transcript = JSON.parse(transcriptBytes.toString());
    const intents = ['導入で場面を説明し、出来事の流れと反応を残す。\n結末まで理解できる構成にする。',
      '結果が分かる場面を中心にし、直前の説明と反応を保持する。\n同じ内容の繰り返しを比較する。'];
    const inputs = intents.map(purpose => ({purpose, sourceUri: transcript.sourceUri,
      durationLabel: '接続試験用の尺指定', themeCountLabel: '2候補',
      geminiModelName: '接続試験用モデル表記', preset: '接続試験用の編集条件'}));
    const blank = await api('/request-drafts', 'POST', {...inputs[0], purpose: ' '});
    assert.equal(blank.status, 400);
    const created = [];
    for (const input of inputs) {
      const response = await api('/request-drafts', 'POST', input);
      assert.equal(response.status, 201); created.push(response.body.draft);
    }
    const unapproved = await api('/state'); assert.equal(unapproved.status, 200);
    assert.equal(unapproved.body.agentRequests.length, 0);
    const noNext = await api('/agent-requests/next', 'GET', undefined, 'agent');
    assert.equal(noNext.status, 200); assert.equal(noNext.body.request, null);
    // 新しい依頼は旧依頼の承認を継承しない。通常APIだけで命令を作る。
    const approved = await api(`/request-drafts/${created[0].id}/approve`, 'POST', {});
    assert.equal(approved.status, 200);
    assert.equal(approved.body.state.requestDrafts.find((d: any) => d.id === created[1].id).status, 'draft');
    assert(approved.body.state.agentRequests.every((r: any) => r.requestDraftId === created[0].id));
    const duplicateApproval = await api(`/request-drafts/${created[0].id}/approve`, 'POST', {});
    assert.equal(duplicateApproval.status, 409);
    assert.equal((await api(`/request-drafts/${created[1].id}/approve`, 'POST', {})).status, 200);
    const state = (await api('/state')).body;
    for (const [i, draft] of created.entries()) {
      const commands = state.agentRequests.filter((r: any) => r.requestDraftId === draft.id);
      assert.equal(commands.length, 7);
      for (const command of commands) {
        assert.equal(command.input.purpose, intents[i]);
        assert.equal(command.target.sourceUri, inputs[i].sourceUri);
        assert.deepEqual(command.input.settings, draft.settings);
        assert.deepEqual(command.constraints, draft.settings);
      }
    }
    const child = spawnSync(process.execPath, ['--import', loader, fileURLToPath(import.meta.url), 'readback'],
      {cwd: root, env: process.env, encoding: 'utf8'});
    assert.equal(child.status, 0, child.stderr);
    assert.deepEqual(JSON.parse(child.stdout), state);
    const {buildThemeOptionsArtifact} = await source('runner/src/steps/theme-options.ts');
    const {buildClipCompositionArtifact} = await source('runner/src/steps/composition.ts');
    const withoutDate = (v: any) => {const {generatedAt, ...rest} = v; return rest;};
    const outputs = [];
    for (const draft of created) {
      const themeCommand = state.agentRequests.find((r: any) => r.requestDraftId === draft.id && r.type === 'propose_clip_themes');
      const compositionCommand = state.agentRequests.find((r: any) => r.requestDraftId === draft.id && r.type === 'build_clip_composition');
      const themes = await buildThemeOptionsArtifact(transcript, themeCommand, {
        contentDiscoveryMode: 'transcript', fixedThemeOptionsPath: '', sanitizePathPart: (s: string) => s,
      });
      // 独立builderの実挙動確認のみ。人間テーマ承認を通過したrunner全体とは呼ばない。
      const composition = buildClipCompositionArtifact(themes, transcript, state, draft.id, compositionCommand.input.purpose);
      outputs.push({themes: withoutDate(themes), composition: withoutDate(composition)});
    }
    assert.deepEqual(outputs[0], outputs[1], '通常builderの未接続境界の観測が変化した');
    assert.equal(sha(await readFile(transcriptPath)), sha(transcriptBytes));
    const businessAfter = await readFile(businessStatePath).catch(e => {
      if (e.code !== 'ENOENT') throw e;
      return null;
    });
    assert.deepEqual(businessAfter, businessBefore);
    const evidence = {
      observedAt: new Date().toISOString(), status: 'partial-path-observed-digest-not-connected',
      checks: {normalDraftCreationAndApproval: 'passed', twoPurposesPreservedInAllSevenCommands: 'passed',
        newDraftDoesNotInheritApproval: 'passed', unapprovedDraftProducesNoCommands: 'passed',
        duplicateApprovalRejected: 'passed', emptyPurposeRejected: 'passed',
        separateProcessStoreReadback: 'passed', realTranscriptThemeAndCompositionIgnoreGeneralPurpose: 'observed',
        businessStateAndSavedTranscriptUnchanged: 'passed'},
      transcript: {path: path.relative(root, transcriptPath), sha256: sha(transcriptBytes), sourceUri: transcript.sourceUri},
      requests: created.map((draft: any, i: number) => ({draftId: draft.id, sourceUri: inputs[i].sourceUri,
        purpose: intents[i], approvedCommands: state.agentRequests.filter((r: any) => r.requestDraftId === draft.id)
          .map((r: any) => ({id: r.id, type: r.type, purpose: r.input.purpose}))})),
      isolatedStateSha256: sha(await readFile(path.join(isolated, 'state.json'))),
      limits: ['Digest判断3件は通常callerが無いため未実行', '旧回答・別素材のDigest拒否は通常経路未接続のため未検証',
        '通常UI・人間テーマ選択・動画生成のE2Eではない'],
      externalInferenceCalls: 0, sttRuns: 0, generatedVideos: 0, realQueueMutations: 0,
    };
    await writeFile(new URL('./partial-path-observation.json', import.meta.url), JSON.stringify(evidence, null, 2)+'\n', {flag: 'wx'});
    console.log(JSON.stringify({status: evidence.status, checks: evidence.checks}));
  } finally {
    await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
    await rm(isolated, {recursive: true});
  }
}
