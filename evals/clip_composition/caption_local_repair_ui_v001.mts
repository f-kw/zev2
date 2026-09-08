import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {readFile, writeFile, mkdir, stat, realpath, lstat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {ROOT, canonicalSha, keys, bind, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import type {CaptionRepairPurposeV001, CaptionLocalRepairOperationV001, CaptionLocalRepairObservationV001, CaptionRepairByteBindingV001} from '../../packages/shared/src/caption-local-repair-v001.js';
import {
  type CaptionRepairContextV001, type CaptionRepairSessionV001,
  loadCaptionRepairContextV001, describeCaptionRepairV001, captionRepairSourceSnapshotV001,
  createCaptionRepairSessionV001, observeCaptionRepairFrameV001, saveCaptionRepairObservationV001,
  savedCaptionRepairObservationsV001, validateCaptionLocalRepairV001, captionRepairApprovalDraftV001,
  adoptCaptionLocalRepairV001, reconstructCaptionLocalRepairV001, publishCaptionLocalRepairV001,
  renderCaptionLocalRepairV001, readRepairBoundBytesV001,
} from './caption_local_repair_common_v001.mts';

export interface RepairUICaseV001 {
  id: string; title: string; context: CaptionRepairContextV001;
  seed?: CaptionLocalRepairObservationV001[];
  reviewCandidates?: {instructionId: string; reasons: string[]}[];
}
export interface RepairUIOptionsV001 {
  cases: RepairUICaseV001[]; purpose: CaptionRepairPurposeV001; outputRoot: string;
  render?: typeof renderCaptionLocalRepairV001;
  reviewSummary?: string;
}
const HTML = `<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>字幕の局所補修</title>
<style>
:root{color-scheme:dark;font-family:system-ui,-apple-system,sans-serif;background:#10151c;color:#e7edf6}*{box-sizing:border-box}body{max-width:1160px;margin:auto;padding:24px}h1{font-size:26px;margin:0 0 8px}p{line-height:1.7}button,select,input,textarea{font:inherit}button,select{padding:10px 14px;border:1px solid #546174;background:#243245;color:#f4f7fc;border-radius:7px}button{cursor:pointer}button:disabled{opacity:.4;cursor:default}button.primary{background:#356ce0;border-color:#6597ff}button.danger{border-color:#efaa73}select{max-width:100%}.top,.buttons{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.card{background:#1a222e;border:1px solid #354151;border-radius:12px;padding:18px;margin-top:18px}.grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(280px,1fr);gap:18px}.muted{color:#afbed0;font-size:14px}video{display:block;width:100%;background:black;border-radius:7px;max-height:440px}.text{font-size:20px;line-height:1.6;overflow-wrap:anywhere}input[type=range]{width:100%;margin:14px 0}label{display:block;margin:12px 0}input[type=checkbox],input[type=radio]{margin-right:8px;accent-color:#79a8ff}textarea{display:block;width:100%;min-height:72px;background:#111a25;border:1px solid #5d6b7c;color:#fff;padding:9px;border-radius:5px}.notice{border-left:3px solid #e6b765;padding:8px 12px;background:#2b2a24}#message{min-height:1.7em;white-space:pre-wrap}#summary li{margin:9px 0;line-height:1.5}#preview{white-space:pre-wrap;line-height:1.7}button[aria-pressed=true]{background:#37649e}#review{border-color:#6aaa88}.compare{display:grid;grid-template-columns:1fr 1fr;gap:14px}[hidden]{display:none!important}@media(max-width:760px){body{padding:12px}.grid,.compare{grid-template-columns:1fr}.card{padding:14px}}
</style><body><h1>字幕の局所補修</h1><p id="purpose" class="muted"></p>
<p id="selection-summary" class="notice" hidden></p><div class="top"><label>動画 <select id="case"></select></label><button id="reload">保存内容を再読込</button></div>
<div class="card"><label>確認する字幕 <select id="target"></select></label><div id="text" class="text"></div><p id="current" class="muted"></p></div>
<section class="card" id="candidate-review" hidden><h2>確認する理由</h2><ul id="candidate-reasons"></ul><div class="buttons"><button id="no-issue">問題なし</button><button id="has-issue">問題あり → 境界指定・除外</button></div><p id="candidate-answer" role="status"></p></section>
<div class="grid"><section class="card"><video id="video" preload="metadata" playsinline></video><p id="position" class="muted">映像を読み込んでいます</p><input id="seek" type="range" step="1" aria-label="確認範囲のコマ位置"><div class="buttons"><button id="play">短時間再生</button><button id="restart">確認範囲の先頭</button><button id="previous-frame">1コマ戻る</button><button id="next-frame">1コマ進む</button></div><p class="muted">音声を聞き、映像を止めて位置を選びます。終了は、そのコマから字幕が消える位置です。</p></section>
<section class="card" id="repair-controls"><label><input type="radio" name="operation" id="boundary-mode" value="boundary" checked>開始・終了を直す</label><label><input type="radio" name="operation" id="exclude-mode" value="exclude">この字幕を除外する</label>
<div id="boundary-controls"><label><input id="keep-start" type="checkbox" checked>開始維持</label><button id="pick-start">表示中のコマを開始に指定</button><p id="start-value" class="muted"></p><label><input id="keep-end" type="checkbox" checked>終了維持</label><button id="pick-end">表示中のコマを終了に指定</button><button id="pick-final">最終コマの直後を終了に指定</button><p id="end-value" class="muted"></p></div>
<div id="exclude-controls" hidden><p class="notice">動画と音声は残し、次の字幕だけを完成版から除外します。</p><p id="excluded-text" class="text"></p><label>除外する理由<textarea id="reason" placeholder="例：この箇所には対応する発話がない"></textarea></label><label><input id="confirm-exclude" type="checkbox">上の本文の字幕を除外することを確認した</label></div>
<button id="save" class="primary">この指定を保存</button><p id="message" role="status" aria-live="polite"></p></section></div>
<section class="card"><h2>保存した変更</h2><ul id="summary"></ul><p class="muted">保存だけでは動画を変更しません。変更内容を確認してから再生成します。</p><button id="validate">保存した変更を確認</button><div id="preview"></div><button id="approve" class="primary" hidden>この変更を承認して再生成</button><p id="render-status" role="status"></p></section>
<section class="card" id="review" hidden><h2>変更箇所だけ再確認</h2><p id="review-text"></p><div class="compare"><div><h3>補修前</h3><video id="before" preload="metadata" controls playsinline></video></div><div><h3>補修後</h3><video id="after" preload="metadata" controls playsinline></video></div></div><div class="buttons"><button id="play-before">補修前のこの箇所を再生</button><button id="play-after">補修後のこの箇所を再生</button></div><p class="muted">表示中の字幕の確認範囲だけを再生します。全体の品質を再評価する画面ではありません。</p></section>
<script type="module" src="/app.mjs"></script></body></html>`;

export async function startCaptionRepairUIV001(options: RepairUIOptionsV001) {
  assert(!options.render || options.purpose === 'ui-verification', 'TEST_RENDERER_ONLY_IN_UI_VERIFICATION');
  assert(options.cases.length > 0 && new Set(options.cases.map(c => c.id)).size === options.cases.length);
  assert(options.outputRoot.startsWith('evals/clip_composition/outputs/') && options.outputRoot.split('/').every(p => p && p !== '.' && p !== '..'));
  await mkdir(path.dirname(path.join(ROOT, options.outputRoot)), {recursive: true});
  assert.equal(await realpath(path.dirname(path.join(ROOT, options.outputRoot))), path.dirname(path.join(ROOT, options.outputRoot)));
  await mkdir(path.join(ROOT, options.outputRoot)); // No reuse of another session's observation directory.
  const states = new Map<string, any>();
  for (const c of options.cases) {
    assert(/^[A-Za-z0-9._-]+$/u.test(c.id));
    // A fixture-fed UI is always marked as verification, never live human input.
    if (c.seed?.length) assert.equal(options.purpose, 'ui-verification', 'FIXTURE_UI_CANNOT_CREATE_HUMAN_OBSERVATIONS');
    if(c.reviewCandidates) {
      assert(!c.seed?.length, 'REVIEW_STARTS_WITHOUT_REPAIR_OBSERVATIONS');
      assert.deepEqual(c.reviewCandidates.map(r=>r.instructionId),describeCaptionRepairV001(c.context).allowedTargets.map(t=>t.instructionId),'REVIEW_TARGET_SCOPE_MISMATCH');
      assert(c.reviewCandidates.every(r=>r.reasons.length>0&&r.reasons.every(s=>typeof s==='string'&&s.trim())),'REVIEW_REASON_REQUIRED');
    }
    const session = await createCaptionRepairSessionV001(c.context, options.purpose);
    const state = {definition: c, session, files: new Map(), preview: null, run: null, reviews: new Map()}; states.set(c.id, state);
    for (const previous of c.seed ?? []) {
      const op = structuredClone(previous.operation);
      if (op.kind === 'change-boundaries') for (const side of ['start','end'] as const) if (op[side].mode === 'observed') {
        const old = op[side].observation;
        op[side] = {mode:'observed', observation: observeCaptionRepairFrameV001(session, op.target.instructionId, old.presentedVideoFrame, old.boundaryKind)};
      }
      const row = saveCaptionRepairObservationV001(session, op); await persist(state, row);
    }
  }
  async function persist(state: any, row: CaptionLocalRepairObservationV001) {
    const p = `${options.outputRoot}/${row.observationId}.json`, raw = JSON.stringify(row, null, 2) + '\n';
    await writeFile(path.join(ROOT, p), raw, {flag:'wx'}); state.files.set(row.observationId, {path:p, raw});
  }
  async function saved(state: any) {
    const records = savedCaptionRepairObservationsV001(state.session);
    for (const row of records) {
      const file = state.files.get(row.observationId); assert(file, 'OBSERVATION_NOT_PERSISTED');
      assert.equal(await readFile(path.join(ROOT, file.path), 'utf8'), file.raw, 'SAVED_OBSERVATION_REPLACED');
    }
    return [...new Map(records.map(row => [row.operation.target.instructionId, row])).values()];
  }
  const body = async (request: http.IncomingMessage) => {
    assert.equal(request.headers['content-type'], 'application/json');
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  };
  const reply = (response: http.ServerResponse, value: unknown, status = 200) => {
    response.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    response.end(JSON.stringify(value));
  };
  async function serveFile(request: http.IncomingMessage, response: http.ServerResponse, ref: CaptionRepairByteBindingV001) {
    const p = path.join(ROOT, ref.path); assert.equal(await realpath(p), p); assert(!(await lstat(p)).isSymbolicLink());
    const total = (await stat(p)).size; let start=0,end=total-1,status=200;
    if (request.headers.range) {
      const m = /^bytes=(\d+)-(\d*)$/u.exec(request.headers.range);
      if (!m) {response.writeHead(416, {'Content-Range':`bytes */${total}`}); response.end(); return;}
      start=Number(m[1]); end=m[2] ? Math.min(Number(m[2]),end) : end; status=206;
      if (!integer(start) || !integer(end) || start>end) {response.writeHead(416, {'Content-Range':`bytes */${total}`}); response.end(); return;}
    }
    const headers: any = {'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Length':end-start+1,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
    if(status===206) headers['Content-Range']=`bytes ${start}-${end}/${total}`;
    response.writeHead(status, headers);
    if(request.method==='HEAD') {response.end();return;}
    const stream = createReadStream(p,{start,end}); response.on('close',()=>stream.destroy());stream.on('error',()=>response.destroy());stream.pipe(response);
  }
  const server = http.createServer(async (request,response) => {
    try {
      const host = `127.0.0.1:${(server.address() as any).port}`, origin = `http://${host}`;
      if(request.headers.host!==host) {reply(response,{error:'接続先が一致しません。'},403);return;}
      const url = new URL(request.url!,origin);
      if(request.method==='GET' && url.pathname==='/') {response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});response.end(HTML);return;}
      if(request.method==='GET' && url.pathname==='/app.mjs') {response.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});response.end(await readFile(new URL('./caption_local_repair_ui_v001.mjs',import.meta.url)));return;}
      if(request.method==='GET' && url.pathname==='/api/state') {
        const cases=[];
        for(const [id,state] of states) cases.push({id,title:state.definition.title,...describeCaptionRepairV001(state.definition.context),
          purpose:options.purpose,reviewCandidates:state.definition.reviewCandidates,reviewAnswers:[...state.reviews.values()],records:await saved(state),run:state.run,mediaUrl:`/media/${id}/before`});
        reply(response,{cases,reviewSummary:options.reviewSummary??null});return;
      }
      const media=/^\/media\/([A-Za-z0-9._-]+)\/(before|after)$/u.exec(url.pathname);
      if(['GET','HEAD'].includes(request.method!) && media) {
        const state=states.get(media[1]);assert(state,'UNKNOWN_CASE');
        const ref=media[2]==='before'?captionRepairSourceSnapshotV001(state.definition.context).source.completedMedia:state.run?.renderer?.video;
        assert(ref,'RENDER_NOT_READY');await serveFile(request,response,ref);return;
      }
      if(request.method!=='POST'||request.headers.origin!==origin) {reply(response,{error:'操作元が一致しません。'},403);return;}
      const input=await body(request), state=states.get(input.caseId); assert(state,'UNKNOWN_CASE');
      assert.equal(input.sourceSha256,describeCaptionRepairV001(state.definition.context).sourceSha256,'STALE_SOURCE');
      if(url.pathname==='/api/review') {
        assert(keys(input,['caseId','sourceSha256','instructionId','answer']));
        assert(state.definition.reviewCandidates?.some((r:any)=>r.instructionId===input.instructionId),'NOT_A_REVIEW_CANDIDATE');
        assert(['issue','no-issue'].includes(input.answer),'INVALID_REVIEW_ANSWER');
        assert(state.run?.status!=='running','REPAIR_RUNNING');
        if(input.answer==='no-issue')assert(!(await saved(state)).some(r=>r.operation.target.instructionId===input.instructionId),'SAVED_REPAIR_ALREADY_EXISTS');
        const target=describeCaptionRepairV001(state.definition.context).targets.find(t=>t.instructionId===input.instructionId)!;
        const row={schemaVersion:'caption-review-answer-v001',reviewId:randomUUID(),sourceSha256:input.sourceSha256,target,
          answer:input.answer,purpose:options.purpose,newHumanJudgment:options.purpose==='human-observation',status:'review-recorded-no-repair-adopted'};
        await writeFile(path.join(ROOT,options.outputRoot,`${row.reviewId}.json`),JSON.stringify(row,null,2)+'\n',{flag:'wx'});
        state.reviews.set(input.instructionId,row);reply(response,row);return;
      }
      if(url.pathname==='/api/frame') {
        assert(keys(input,['caseId','sourceSha256','instructionId','presentedVideoFrame','boundaryKind']));
        reply(response,observeCaptionRepairFrameV001(state.session,input.instructionId,input.presentedVideoFrame,input.boundaryKind));return;
      }
      if(url.pathname==='/api/save') {
        assert(keys(input,['caseId','sourceSha256','operation'])); assert(state.run?.status!=='running','REPAIR_RUNNING');
        if(state.definition.reviewCandidates)assert(state.reviews.get(input.operation?.target?.instructionId)?.answer==='issue','HUMAN_ISSUE_REVIEW_REQUIRED');
        const row=saveCaptionRepairObservationV001(state.session,input.operation);await persist(state,row);state.preview=null;state.run=null;
        reply(response,row);return;
      }
      if(url.pathname==='/api/validate') {
        assert(keys(input,['caseId','sourceSha256'])); assert(state.run?.status!=='running','REPAIR_RUNNING');
        const records=await saved(state),validation=validateCaptionLocalRepairV001(state.session,records),approval=captionRepairApprovalDraftV001(validation);
        state.preview={id:randomUUID(),validation,approval,recordsHash:canonicalSha(records)};
        reply(response,{approvalId:state.preview.id,approval,operations:records.map(row=>row.operation)});return;
      }
      if(url.pathname==='/api/render') {
        assert(keys(input,['caseId','sourceSha256','approvalId','approval'])); assert(state.preview,'VALIDATION_REQUIRED');
        assert.equal(input.approvalId,state.preview.id,'STALE_APPROVAL');assert.equal(canonicalSha(await saved(state)),state.preview.recordsHash,'SAVED_CHANGES_NOT_APPROVED');
        assert.equal(canonicalSha(input.approval),canonicalSha(state.preview.approval),'EXACT_APPROVAL_REQUIRED');
        if(state.run?.approvalId===input.approvalId) {reply(response,state.run);return;}
        assert(state.run?.status!=='running','REPAIR_RUNNING');
        const adoption=adoptCaptionLocalRepairV001(state.preview.validation,input.approval);
        const runId=`caption-repair-${randomUUID()}`;state.run={status:'running',approvalId:input.approvalId,runId};reply(response,state.run,202);
        try {
          const rebuilt=await reconstructCaptionLocalRepairV001(adoption,`${options.outputRoot}/${runId}`,runId);
          await publishCaptionLocalRepairV001(rebuilt);
          const renderer=await (options.render??renderCaptionLocalRepairV001)(rebuilt);
          state.run={...state.run,status:'completed',renderer,reviewUrl:`/media/${input.caseId}/after`,scope:rebuilt.scope};
        } catch(error:any) {state.run={...state.run,status:'failed',error:String(error.message)};}
        return;
      }
      reply(response,{error:'操作が見つかりません。'},404);
    } catch(error:any) {if(!response.headersSent)reply(response,{error:String(error.message)},400);else response.destroy();}
  });
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>{server.off('error',reject);resolve();});});
  return {server,url:`http://127.0.0.1:${(server.address() as any).port}/`,close:()=>new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()))};
}
const integer = (n: number) => Number.isSafeInteger(n) && n >= 0;

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const sourceIndex=process.argv.indexOf('--source'),outputIndex=process.argv.indexOf('--output');
  assert(outputIndex>0&&process.argv[outputIndex+1],'--output requires a new workspace-relative directory');
  const cases:RepairUICaseV001[]=[];
  let purpose:CaptionRepairPurposeV001='human-observation';
  if(process.argv.includes('--fixtures')) {
    assert(sourceIndex<0);purpose='ui-verification';
    const {loadHistoricalCaptionRepairFixtureV001}=await import('./replay_caption_local_repair_v001.mts');
    for(const id of ['digest','distant'] as const) {const b=await loadHistoricalCaptionRepairFixtureV001(id);cases.push({id,title:id==='digest'?'ダイジェスト':'遠方接続',context:b.context,seed:b.records});}
  } else {
    assert(sourceIndex>0&&process.argv[sourceIndex+1],'--source or --fixtures required');
    const source=JSON.parse(await readFile(process.argv[sourceIndex+1],'utf8'));
    const context=await loadCaptionRepairContextV001(source);cases.push({id:source.sourceId,title:'字幕補修',context});
  }
  const ui=await startCaptionRepairUIV001({cases,purpose,outputRoot:process.argv[outputIndex+1]});
  console.log(ui.url);
}
