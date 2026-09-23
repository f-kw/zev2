// Codex2の限定比較。既存入力を再利用し、通常runner・旧実験の契約を変更しない。
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {copyFile, mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {GoogleGenAI} from '@google/genai';
import {buildEditPlanArtifact} from '../src/steps/edit-plan.js';
import {assertDistantConnectionComparisonIndexResponseV001} from '../src/distant-connection-comparison-luna-b5-local-v001.js';

const root = path.resolve(import.meta.dirname, '../..');
const out = '/private/tmp/zev2-codex2-model-comparison-20260923';
const fixture = path.join(root, 'evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/legacy-crop');
const openaiFixture = path.join(root, 'evals/clip_composition/outputs/work-distant-connection-comparison-input-o8rZAhARXAc-v001');
const sha = (b: string | Buffer) => createHash('sha256').update(b).digest('hex');
const json = async (p: string) => JSON.parse(await readFile(p, 'utf8'));
const save = async (name: string, value: unknown) => writeFile(path.join(out, name), JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
const text = (r: any) => r.candidates[0].content.parts.map((p: any) => typeof p.text === 'string' ? p.text : '').join('').trim();
const parse = (s: string) => JSON.parse(s); // strict JSONで成立すれば既存のJSON/fenced JSON parserでも成立する。
await mkdir(out, {recursive: true});
const oldVideo = await json(path.join(fixture, 'gemini-edit-plan-response.raw.json'));
const oldLayout = await json(path.join(fixture, 'gemini-layout-candidate-response.raw.json'));
const display = await json(path.join(root, 'evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-caption-local-reselection-v001/display-plan.json'));
const units = display.containers.flatMap((c: any) => c.cues).map((c: any, i: number) => ({id: i + 1, sourceStartMs: c.sourceStartMs,
  sourceEndMs: c.sourceEndMs, text: c.lines.map((l: any) => l.text).join('')}));
const composition: any = {kind: 'composition_json', selectedThemeId: 'candidate-59', sourceUri: 'saved-candidate-59.mp4',
  title: 'マリンのADHD的？な片付け事情と無意識の脱衣', themeSummary: '片付けの途中で別のことを始めてしまう話と、無意識に服を脱いでいた話',
  parts: [{role: '本編', sourceStartMs: 5941162, sourceEndMs: 5992736, speechIds: units.map((u: any) => u.id),
    transcriptText: units.map((u: any) => u.text).join(''), speechUnits: units}]};
const request: any = {target: {sourceUri: composition.sourceUri}, input: {purpose: '縦型ショートの画面構成previewで、旧crop窓を決める'}};

// 既存の演出案・候補選択validatorを通常入口から呼ぶ。画像製造は保存媒体を使う検査用port。
// 新演出案の検証では、候補画像製造に到達した時点で終了。映像描画成功とは扱わない。
async function replay(video: any, layout: any, videoOnly = false) {
  const requests: any[] = [];
  const context: any = {
    useFixedEditPlan: false, fixedEditPlanPath: '', hasGeminiApiConnection: true, ffmpegCommand: 'fixture-media-only',
    requestArtifactDir: () => out, resolveSourceVideoPath: () => path.join(fixture, 'candidate-59-legacy-input-640.mp4'),
    probeVideoDimensions: async () => {if (videoOnly) throw new Error('VIDEO_VALIDATOR_PASSED'); return {width: 640, height: 360};},
    runCommand: async (_command: string, args: string[]) => {
      const destination = args.at(-1)!;
      const name = destination.endsWith('.mp4') ? 'candidate-59-legacy-input-640.mp4'
        : path.basename(destination).replace('candidate-preview-1-', 'candidate-preview-');
      await copyFile(path.join(fixture, name), destination);
    },
    generateGeminiJsonContent: async (_request: any, parts: any[], name: string) => {
      requests.push({parts, name}); return requests.length === 1 ? video : layout;
    },
    extractGeminiResponseText: text, parseGeminiJsonText: parse,
  };
  try {const result = await buildEditPlanArtifact(request, composition, {} as any, context); return {requests, result};}
  catch (e) {if (videoOnly && e instanceof Error && e.message === 'VIDEO_VALIDATOR_PASSED') return {requests, result: null}; throw e;}
}
const baseline = await replay(oldVideo, oldLayout);
const historicalPromptEquality: boolean[] = [];
for (const [i, name] of ['gemini-edit-plan-prompt.txt', 'gemini-layout-candidate-prompt.txt'].entries()) {
  const current = baseline.requests[i].parts[0].text;
  const historical = (await readFile(path.join(fixture, name), 'utf8')).replace(/\n$/, '');
  assert(current.length > 0);
  historicalPromptEquality.push(current === historical);
  // 保存媒体と発話は固定し、両モデルには現在の通常runnerが組み立てた同一promptを送る。
  if (i === 0) assert.equal(current.slice(current.indexOf('依頼目的:')), historical.slice(historical.indexOf('依頼目的:')));
}
const fingerprints = baseline.requests.map(r => ({name: r.name, partsSha256: sha(JSON.stringify(r.parts)),
  parts: r.parts.map((p: any) => p.text ? {text: p.text} : {mimeType: p.inlineData.mimeType,
    sha256: sha(Buffer.from(p.inlineData.data, 'base64')), bytes: Buffer.from(p.inlineData.data, 'base64').length})}));
const mode = process.argv[2];
const model = process.argv[3];
if (mode === 'preflight') {
  await save('preflight.json', {fixture: path.relative(root, fixture), parserReplayPassed: true,
    historicalPromptEquality, promptSource: 'current buildEditPlanArtifact', fingerprints, baselinePlan: baseline.result});
  console.log(JSON.stringify({preflight: 'passed', requests: fingerprints.map(r => ({name: r.name, partsSha256: r.partsSha256})), externalCalls: 0}));
} else if (mode === 'verify') {
  const evidence = await json(path.join(root, 'docs/reports/ai-model-update-20260923.evidence.json'));
  assert.deepEqual(fingerprints, evidence.preflight.fingerprints);
  assert.equal(sha(await readFile(path.join(root, evidence.historicalOpenAI.rawPath))), evidence.historicalOpenAI.rawSha256);
  const historicalRequest = evidence.historicalOpenAI.transport.requestBinding;
  assert.equal(sha(await readFile(path.join(root, historicalRequest.path))), historicalRequest.fileSha256);
  assertDistantConnectionComparisonIndexResponseV001(evidence.historicalOpenAI.answer,
    await json(path.join(openaiFixture, 'indexed-model-input-v001.json')));
  for (const run of evidence.runs) {
    assert.equal(sha(run.rawText), run.rawSha256);
    const raw = JSON.parse(run.rawText);
    const {mode: savedMode, model: savedModel} = run.intent;
    const expectedRequest = savedMode === 'openai'
      ? {...await json(path.join(openaiFixture, 'exact-request-v001.json')), model: savedModel}
      : {model: savedModel, contents: baseline.requests[savedMode === 'gemini-video' ? 0 : 1].parts, config: {responseMimeType: 'application/json'}};
    assert.equal(sha(JSON.stringify(expectedRequest)), run.intent.requestSha256);
    assert.equal(run.result.validation, 'passed');
    let answer: any;
    if (savedMode === 'openai') {
      assert.equal(raw.model, savedModel);
      assert.equal(raw.status, 'completed');
      answer = JSON.parse(raw.output.filter((x: any) => x.type === 'message').flatMap((x: any) => x.content)
        .filter((x: any) => x.type === 'output_text').map((x: any) => x.text).join(''));
      assertDistantConnectionComparisonIndexResponseV001(answer, await json(path.join(openaiFixture, 'indexed-model-input-v001.json')));
    } else {
      assert.equal(raw.modelVersion, savedModel);
      assert.equal(raw.candidates[0].finishReason, 'STOP');
      answer = parse(text(raw));
      if (savedMode === 'gemini-video') {
        for (const field of ['title', 'hookText']) assert.equal(typeof answer[field], 'string');
        assert(answer.renderSegments.every((s: any) => ['role', 'caption', 'screenLayoutId', 'layoutReason', 'detections'].every(f => f in s)));
        assert(answer.telopPlan.every((s: any) => ['sourceSpeechIds', 'text', 'role'].every(f => f in s)));
      }
      await replay(savedMode === 'gemini-video' ? raw : oldVideo, savedMode === 'gemini-layout' ? raw : oldLayout, savedMode === 'gemini-video');
    }
    assert.deepEqual(answer, run.result.answer);
  }
  console.log(JSON.stringify({savedResponseReplay: 'passed', cases: evidence.runs.length, externalCalls: 0}));
} else {
  assert(['openai', 'gemini-video', 'gemini-layout'].includes(mode));
  assert(mode === 'openai' ? model === 'gpt-6-luna' : ['gemini-3.5-flash', 'gemini-3.8-flash'].includes(model));
  // dotenvと同じ既存fileを読み、必要なキーだけをメモリへ置く。値をログへ出さない。
  const env = await readFile(path.join(root, '.env'), 'utf8');
  const keyName = mode === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY';
  const line = env.split(/\r?\n/).find(x => x.startsWith(keyName + '='));
  const key = (process.env[keyName] || line?.slice(keyName.length + 1) || '').trim().replace(/^(['"])(.*)\1$/, '$2');
  assert(key, 'credential missing');
  const id = `${mode}-${model}`;
  const prepared = mode === 'openai' ? {...await json(path.join(openaiFixture, 'exact-request-v001.json')), model}
    : {model, contents: baseline.requests[mode === 'gemini-video' ? 0 : 1].parts, config: {responseMimeType: 'application/json'}};
  await save(`${id}-intent.json`, {mode, model, requestSha256: sha(JSON.stringify(prepared)), startedAt: new Date().toISOString(),
    retry: 0, requestShapeChanged: mode === 'openai' ? ['model'] : [], input: mode === 'openai' ? path.relative(root, openaiFixture) : fingerprints});
  const started = performance.now();
  let raw: any, httpStatus: number | null = null;
  try {
    if (mode === 'openai') {
      const r = await fetch('https://api.openai.com/v1/responses', {method: 'POST', headers: {Authorization: `Bearer ${key}`, 'Content-Type': 'application/json'},
        body: JSON.stringify(prepared), signal: AbortSignal.timeout(600000), redirect: 'error'});
      httpStatus = r.status;
      raw = JSON.parse(await r.text());
    } else {
      raw = await new GoogleGenAI({apiKey: key}).models.generateContent(prepared as any);
    }
  } catch (e) {
    const error = e as any;
    // SDK/network例外からURL・headers・secret値を保存しない。
    await save(`${id}-error.json`, {name: error?.name ?? 'Error', httpStatus: error?.status ?? null, elapsedMs: performance.now() - started,
      category: 'request-failed', automaticRetry: false});
    console.log(JSON.stringify({id, status: 'request-failed', httpStatus: error?.status ?? null}));
    process.exitCode = 1;
  }
  if (raw) {
    const elapsedMs = performance.now() - started;
    await save(`${id}-raw.json`, raw); // 解釈に先行して保存
    let validation = 'passed', validationError: string | null = null, answer: any, plan: any;
    try {
      if (mode === 'openai') {
        assert.equal(httpStatus, 200); assert.equal(raw.model, model); assert.equal(raw.status, 'completed');
        answer = JSON.parse(raw.output.filter((x: any) => x.type === 'message').flatMap((x: any) => x.content)
          .filter((x: any) => x.type === 'output_text').map((x: any) => x.text).join(''));
        assertDistantConnectionComparisonIndexResponseV001(answer, await json(path.join(openaiFixture, 'indexed-model-input-v001.json')));
      } else {
        assert.equal(raw.modelVersion, model); assert.equal(raw.candidates[0].finishReason, 'STOP');
        answer = parse(text(raw));
        plan = (await replay(mode === 'gemini-video' ? raw : oldVideo, mode === 'gemini-layout' ? raw : oldLayout, mode === 'gemini-video')).result;
      }
    } catch (e) {validation = 'failed'; validationError = e instanceof Error ? e.message : 'validation failed';}
    const result = {id, model, httpStatus, elapsedMs, automaticRetry: false, validation, validationError,
      usage: raw.usage ?? raw.usageMetadata ?? null, answer, plan};
    await save(`${id}-result.json`, result);
    console.log(JSON.stringify({...result, answer: undefined, plan: undefined}));
  }
}
