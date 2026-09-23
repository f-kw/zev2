#!/usr/bin/env node
// 実11境界へ束縛した研究用保存テスト。映像・音声・AI・本番保存を実行しない。
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  SCHEMAS, sealResearchRecord, canonicalResearchJson, createResearchBaseline,
  setResearchOverride, resetResearchOverride, resolveResearchConnections,
} from './connection_three_layer_research_v001.mjs';

const tree = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const baselineCommit = '56d31b71febebe124397c9015812b7077cbe6a51';
const profileName = 'docs/reports/digest-connection-objective-profiles-20260917.json';
const out = process.argv[2];
assert(out && path.isAbsolute(out), '未使用の絶対出力pathを指定する');
assert(!fs.existsSync(out), '既存の出力は上書きしない');
const profileBytes = fs.readFileSync(path.join(tree, profileName));
assert.deepEqual(profileBytes, execFileSync('git', ['show', `${baselineCommit}:${profileName}`], {cwd:tree}));
const profile = JSON.parse(profileBytes);
assert.equal(profile.profileCount, 11);

// 被検査moduleとは別に定義する、key順・byte・SHA照合のoracle。
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
  return value;
}
const bytes = v => JSON.stringify(stable(v));
const hash = v => createHash('sha256').update(typeof v === 'string' || Buffer.isBuffer(v) ? v : bytes(v)).digest('hex');
const copy = v => JSON.parse(JSON.stringify(v));
function freeze(value) {if(value!==null&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
const ref = r => ({schemaVersion:r.data.schemaVersion,sha256:r.sha256});
const seal = d => sealResearchRecord(d);
const ids = profile.profiles.map(p=>p.connectionId);
const identity = profile.recordedCanonicalMediaIdentity;
const trustedDigestRef = {version:profile.canonicalCompletionId,completionId:profile.canonicalCompletionId,sha256:identity.sha256};
const catalogue = seal({schemaVersion:SCHEMAS.catalogue,digestRef:trustedDigestRef,
  connections:profile.profiles.map(p=>({connectionId:p.connectionId,beforeSegmentId:p.identityBinding.beforeSegmentId,
    afterSegmentId:p.identityBinding.afterSegmentId,canonicalBoundaryFrame:p.canonicalBoundaryFrame}))});
const baseline = createResearchBaseline({trustedDigestRef,catalogue});
const autoDraft = seal({schemaVersion:SCHEMAS.autoDraft,createdBy:'research-fixture',origin:'simulated-auto',
  digestRef:trustedDigestRef,catalogueRef:ref(catalogue),baselineRef:ref(baseline),
  entries:ids.map((id,i)=>({connectionId:id,role:i===0||i===10?'separator':'normal-cut',
    reason:`研究入力 ${id}：保存とResetの検査用。知覚・必要性・AI判断は未実行。`}))});
const emptyOverride = (mode, draft) => seal({schemaVersion:SCHEMAS.overrides,createdBy:'research-fixture',origin:'simulated-human',
  digestRef:trustedDigestRef,catalogueRef:ref(catalogue),baselineRef:ref(baseline),
  selectionBase:{mode,autoDraftRef:draft===null?null:ref(draft)},entries:[]});
const normalContext = freeze({trustedDigestRef,catalogue,baseline,mode:'normal-only',autoDraft:null,overrides:emptyOverride('normal-only',null)});
const autoContext = freeze({trustedDigestRef,catalogue,baseline,mode:'auto',autoDraft,overrides:emptyOverride('auto',autoDraft)});
const reason = id => `研究上の模擬変更 ${id}。人間による品質判断ではない。`;
const withOverride = (context,id,role) => freeze({...context,overrides:setResearchOverride(context,{connectionId:id,role,reason:reason(id)})});
const withoutOverride = (context,id) => freeze({...context,overrides:resetResearchOverride(context,id)});
const rows = context => resolveResearchConnections(context).data.entries;
const opposite = role => role==='normal-cut'?'separator':'normal-cut';
const passed = [];
const rejected = [];
const snapshots = {};
function test(name, run) { const facts=run()??{};passed.push({name,status:'passed',...facts}); }
function verifySealed(record) {
  assert.equal(record.sha256,hash(record.data));
  assert.equal(canonicalResearchJson(record.data),bytes(record.data));
}
function unchanged(context, run) {
  const original=bytes(context);const result=run();assert.equal(bytes(context),original);return result;
}
// 悪い入力を正しいSHAで再封印する。参照も更新し、単なるhash不一致で
// unknown role等の意味検査が隠れることを避ける。
function resealGraph(context) {
  const c=copy(context);
  c.catalogue=seal(c.catalogue.data);
  c.baseline.data.catalogueRef=ref(c.catalogue);c.baseline=seal(c.baseline.data);
  if(c.autoDraft!==null){c.autoDraft.data.catalogueRef=ref(c.catalogue);c.autoDraft.data.baselineRef=ref(c.baseline);c.autoDraft=seal(c.autoDraft.data);}
  c.overrides.data.catalogueRef=ref(c.catalogue);c.overrides.data.baselineRef=ref(c.baseline);
  c.overrides.data.selectionBase.autoDraftRef=c.autoDraft===null?null:ref(c.autoDraft);
  c.overrides=seal(c.overrides.data);return c;
}
function reject(name, make, action=resolveResearchConnections) {
  const c=freeze(make());const before=bytes(c);let failure;
  try {action(c);} catch(e){failure=e;}
  assert(failure,`${name}: 不正入力を受理した`);
  assert.equal(failure.code,'CONNECTION_RESEARCH_INVALID',`${name}: 予期しない例外 ${failure}`);
  assert.equal(bytes(c),before,`${name}: 拒否時に入力が変わった`);
  rejected.push({name,status:'rejected-as-expected',code:failure.code,message:failure.message,inputSha256:hash(c)});
}
const mutated = (change, base=autoContext) => {const c=copy(base);change(c);return resealGraph(c);};

fs.mkdirSync(out);
try {
  test('実11境界の同一性と保存SHAを固定',()=>{
    for(const r of [catalogue,baseline,autoDraft,autoContext.overrides,normalContext.overrides])verifySealed(r);
    assert.equal(catalogue.data.connections.length,11);
    assert.equal(catalogue.data.connections[0].canonicalBoundaryFrame,1789);
    assert.equal(catalogue.data.connections[10].canonicalBoundaryFrame,26222);
    snapshots.catalogue=catalogue;snapshots.baseline=baseline;snapshots.simulatedAuto=autoDraft;
    snapshots.emptyAutoOverrides=autoContext.overrides;snapshots.emptyNormalOverrides=normalContext.overrides;
    return {boundaries:11,profileFileSha256:hash(profileBytes)};
  });
  test('固定Normalのみで全11接続が通常、出所はbaseline',()=>{
    const result=unchanged(normalContext,()=>resolveResearchConnections(normalContext));verifySealed(result);
    assert.deepEqual(result.data.entries.map(e=>e.connectionId),ids);
    for(const r of result.data.entries){assert.equal(r.role,'normal-cut');assert.equal(r.selectedFrom,'baseline');assert.equal(r.reason,null);}
    snapshots.normalOnly=result;return {normalConnections:11};
  });
  test('模擬自動原案を全件そのまま解決し、AI実走と区別',()=>{
    const result=unchanged(autoContext,()=>resolveResearchConnections(autoContext));verifySealed(result);
    assert.equal(autoDraft.data.createdBy,'research-fixture');assert.equal(autoDraft.data.origin,'simulated-auto');
    result.data.entries.forEach((r,i)=>{const original=autoDraft.data.entries[i];assert.equal(r.role,original.role);assert.equal(r.reason,original.reason);assert.equal(r.selectedFrom,'auto');assert.equal(r.selectionRef.entrySha256,hash(original));});
    snapshots.autoOnly=result;return {simulatedSeparatorConnections:[ids[0],ids[10]],otherConnectionsNormal:9};
  });
  test('11接続それぞれの逆role変更とResetで他10行をbyte不変に保つ',()=>{
    const originalRows=rows(autoContext);let comparisons=0;
    ids.forEach((id,index)=>{
      const changed=unchanged(autoContext,()=>withOverride(autoContext,id,opposite(originalRows[index].role)));
      const changedRows=rows(changed);
      assert.equal(changed.overrides.data.entries.length,1);assert.equal(changedRows[index].selectedFrom,'human-override');
      assert.equal(changedRows[index].role,opposite(originalRows[index].role));assert.equal(changedRows[index].reason,reason(id));
      assert.equal(changedRows[index].selectionRef.entrySha256,hash(changed.overrides.data.entries[0]));
      originalRows.forEach((row,i)=>{if(i!==index){assert.equal(bytes(changedRows[i]),bytes(row));comparisons++;}});
      const reset=unchanged(changed,()=>withoutOverride(changed,id));
      assert.equal(reset.overrides.data.entries.length,0);assert.equal(bytes(reset.overrides),bytes(autoContext.overrides));
      assert.equal(bytes(resolveResearchConnections(reset)),bytes(resolveResearchConnections(autoContext)));
      originalRows.forEach((row,i)=>{if(i!==index){assert.equal(bytes(rows(reset)[i]),bytes(changedRows[i]));comparisons++;}});
    });return {individualChanges:11,individualResets:11,unrelatedRowByteComparisons:comparisons};
  });
  test('明示Normalと未指定を区別し、ResetはSeparator原案へ戻る',()=>{
    const explicit=withOverride(autoContext,ids[0],'normal-cut');
    assert.equal(explicit.overrides.data.entries[0].role,'normal-cut');assert.notEqual(bytes(explicit.overrides),bytes(autoContext.overrides));
    assert.equal(rows(explicit)[0].selectedFrom,'human-override');assert.equal(rows(explicit)[0].role,'normal-cut');
    const reset=withoutOverride(explicit,ids[0]);assert.equal(rows(reset)[0].role,'separator');assert.equal(rows(reset)[0].selectedFrom,'auto');
    snapshots.explicitNormalOverride=explicit.overrides;snapshots.explicitNormalEffective=resolveResearchConnections(explicit);
    snapshots.afterReset=resolveResearchConnections(reset);
  });
  test('固定Normal基準でも模擬上書きの削除で基準へ戻る',()=>{
    const changed=withOverride(normalContext,ids[1],'separator');assert.equal(rows(changed)[1].role,'separator');
    const reset=withoutOverride(changed,ids[1]);assert.equal(bytes(reset.overrides),bytes(normalContext.overrides));
    assert.equal(bytes(resolveResearchConnections(reset)),bytes(resolveResearchConnections(normalContext)));
  });
  test('自動原案も通常でも、人間の明示通常と原案の採用元を区別',()=>{
    const explicit=withOverride(autoContext,ids[1],'normal-cut');
    assert.equal(rows(explicit)[1].role,rows(autoContext)[1].role);
    assert.equal(rows(explicit)[1].selectedFrom,'human-override');assert.equal(rows(autoContext)[1].selectedFrom,'auto');
    assert.equal(explicit.overrides.data.entries.length,1);
    const reset=withoutOverride(explicit,ids[1]);assert.equal(rows(reset)[1].selectedFrom,'auto');
    assert.equal(bytes(reset.overrides),bytes(autoContext.overrides));
    snapshots.explicitNormalOverAutoNormal=explicit.overrides;
  });
  test('複数の模擬上書きから1件だけ削除し他の保存行・実効出所を保つ',()=>{
    const two=withOverride(withOverride(autoContext,ids[0],'normal-cut'),ids[1],'separator');
    const before=rows(two);const reset=withoutOverride(two,ids[0]);const after=rows(reset);
    assert.equal(reset.overrides.data.entries.length,1);assert.equal(bytes(reset.overrides.data.entries[0]),bytes(two.overrides.data.entries[1]));
    assert.equal(after[0].role,'separator');for(let i=1;i<11;i++)assert.equal(bytes(before[i]),bytes(after[i]));
    assert.notEqual(resolveResearchConnections(two).data.overridesRef.sha256,resolveResearchConnections(reset).data.overridesRef.sha256);
    snapshots.twoOverrides=two.overrides;snapshots.oneOverrideAfterReset=reset.overrides;return {unrelatedRows:10};
  });
  test('同じ保存状態の反復解決・同じ設定・空のResetが完全一致',()=>{
    const c=withOverride(autoContext,ids[0],'normal-cut');const a=resolveResearchConnections(c);const b=resolveResearchConnections(c);
    assert.equal(bytes(a),bytes(b));assert.equal(bytes(withOverride(c,ids[0],'normal-cut').overrides),bytes(c.overrides));
    assert.equal(bytes(withoutOverride(c,ids[1]).overrides),bytes(c.overrides));
    assert.equal(bytes(withoutOverride(autoContext,ids[1]).overrides),bytes(autoContext.overrides));
    verifySealed(a);verifySealed(b);
  });
  test('全55組の編集順序を交換して同一の保存状態と実効結果へ到達',()=>{
    let pairs=0;
    for(let a=0;a<ids.length;a++)for(let b=a+1;b<ids.length;b++){
      const ra=opposite(autoDraft.data.entries[a].role),rb=opposite(autoDraft.data.entries[b].role);
      const ab=withOverride(withOverride(autoContext,ids[a],ra),ids[b],rb);
      const ba=withOverride(withOverride(autoContext,ids[b],rb),ids[a],ra);
      assert.equal(bytes(ab.overrides),bytes(ba.overrides));assert.equal(bytes(resolveResearchConnections(ab)),bytes(resolveResearchConnections(ba)));
      assert.equal(bytes(withoutOverride(ab,ids[a]).overrides),bytes(withoutOverride(ba,ids[a]).overrides));
      pairs++;
    }assert.equal(pairs,55);return {connectionPairs:55};
  });
  test('全11接続が上書きされても原案を変更せず出所を区別',()=>{
    let c=autoContext;ids.forEach((id,i)=>{c=withOverride(c,id,opposite(autoDraft.data.entries[i].role));});
    assert.equal(c.overrides.data.entries.length,11);assert(rows(c).every(r=>r.selectedFrom==='human-override'));
    assert.equal(bytes(c.autoDraft),bytes(autoContext.autoDraft));assert.equal(bytes(c.baseline),bytes(baseline));
    snapshots.allOverrides=c.overrides;return {overriddenConnections:11};
  });

  const zeroHash='0'.repeat(64);
  // SHA不一致そのものを各保存層で確認する。
  for(const layer of ['catalogue','baseline','autoDraft','overrides']){
    reject(`${layer}: 保存SHA不一致`,()=>{const c=copy(autoContext);c[layer].sha256=zeroHash;return c;});
    reject(`${layer}: 研究版不一致`,()=>mutated(c=>{c[layer].data.schemaVersion+='-other';}));
    reject(`${layer}: 正本SHA不一致`,()=>mutated(c=>{c[layer].data.digestRef.sha256=zeroHash;}));
    reject(`${layer}: 正本版不一致`,()=>mutated(c=>{c[layer].data.digestRef.version+='-other';}));
    reject(`${layer}: 未知field`,()=>mutated(c=>{c[layer].data.unexpected=true;}));
  }
  for(const [layer,field] of [['baseline','catalogueRef'],['autoDraft','catalogueRef'],['autoDraft','baselineRef'],['overrides','catalogueRef'],['overrides','baselineRef']]){
    reject(`${layer}: ${field}への古いSHA参照`,()=>{const c=copy(autoContext);c[layer].data[field].sha256=zeroHash;c[layer]=seal(c[layer].data);return c;});
    reject(`${layer}: ${field}への異版参照`,()=>{const c=copy(autoContext);c[layer].data[field].schemaVersion+='-other';c[layer]=seal(c[layer].data);return c;});
  }
  reject('信頼側の正本SHAを変更',()=>{const c=copy(autoContext);c.trustedDigestRef.sha256=zeroHash;return c;});
  reject('信頼側の正本版を変更',()=>{const c=copy(autoContext);c.trustedDigestRef.version+='-other';return c;});
  reject('接続一覧の重複ID',()=>mutated(c=>{c.catalogue.data.connections[1].connectionId=ids[0];}));
  reject('接続一覧の非隣接区間',()=>mutated(c=>{c.catalogue.data.connections[1].beforeSegmentId='segment-unrelated';}));
  reject('接続一覧の境界順序不整合',()=>mutated(c=>{c.catalogue.data.connections[1].canonicalBoundaryFrame=1788;}));
  reject('接続一覧が11件未満',()=>mutated(c=>{c.catalogue.data.connections.pop();}));
  reject('Normal基準の役割がSeparator',()=>mutated(c=>{c.baseline.data.entries[0].role='separator';}));
  reject('模擬原案の未知接続',()=>mutated(c=>{c.autoDraft.data.entries[0].connectionId='unknown-connection';}));
  reject('模擬原案の接続重複',()=>mutated(c=>{c.autoDraft.data.entries[1].connectionId=ids[0];}));
  reject('模擬原案の未知role',()=>mutated(c=>{c.autoDraft.data.entries[0].role='crossfade';}));
  reject('模擬原案の判断欠落',()=>mutated(c=>{c.autoDraft.data.entries.pop();}));
  reject('模擬原案の順序不一致',()=>mutated(c=>{c.autoDraft.data.entries.reverse();}));
  reject('模擬原案へ任意描画値',()=>mutated(c=>{c.autoDraft.data.entries[0].durationMs=400;}));
  reject('模擬原案を実AIとして偽装',()=>mutated(c=>{c.autoDraft.data.createdBy='ai';}));
  reject('auto modeで原案文書欠落',()=>{const c=copy(autoContext);c.autoDraft=null;return c;});
  reject('Normal-only modeに原案を黙って残す',()=>{const c=copy(normalContext);c.autoDraft=autoDraft;return c;});
  reject('未知mode',()=>{const c=copy(autoContext);c.mode='fallback';return c;});
  const one=withOverride(autoContext,ids[0],'normal-cut');
  reject('模擬人間指定の未知接続',()=>mutated(c=>{c.overrides.data.entries[0].connectionId='unknown-connection';},one));
  reject('模擬人間指定の接続重複',()=>mutated(c=>{c.overrides.data.entries.push(copy(c.overrides.data.entries[0]));},one));
  reject('模擬人間指定の未知role',()=>mutated(c=>{c.overrides.data.entries[0].role='reset';},one));
  reject('模擬人間指定へ任意描画値',()=>mutated(c=>{c.overrides.data.entries[0].gain=1;},one));
  reject('接続指定へ字幕設定を混入',()=>mutated(c=>{c.overrides.data.captionPresentation={preset:'unchanged'};},one));
  reject('模擬人間指定を本人評価として偽装',()=>mutated(c=>{c.overrides.data.origin='human-observed';},one));
  reject('模擬人間指定が別modeへ束縛',()=>mutated(c=>{c.overrides.data.selectionBase.mode='normal-only';},one));
  reject('古い原案への模擬人間指定',()=>{const c=copy(one);c.overrides.data.selectionBase.autoDraftRef.sha256=zeroHash;c.overrides=seal(c.overrides.data);return c;});
  reject('異版原案への模擬人間指定',()=>{const c=copy(one);c.overrides.data.selectionBase.autoDraftRef.schemaVersion+='-other';c.overrides=seal(c.overrides.data);return c;});
  reject('要求の未知field',()=>({...autoContext,unexpected:true}));
  reject('保存外枠の未知field',()=>({...autoContext,autoDraft:{...autoDraft,unexpected:true}}));
  reject('未指定Resetでも壊れた原案は拒否',()=>{const c=copy(autoContext);c.autoDraft.sha256=zeroHash;return c;},c=>resetResearchOverride(c,ids[1]));
  reject('同じ値の再設定でも壊れた原案は拒否',()=>{const c=copy(one);c.autoDraft.sha256=zeroHash;return c;},c=>setResearchOverride(c,{connectionId:ids[0],role:'normal-cut',reason:reason(ids[0])}));
  reject('未指定Resetでも再封印した原案内の別正本参照を拒否',()=>mutated(c=>{c.autoDraft.data.digestRef.sha256=zeroHash;}),c=>resetResearchOverride(c,ids[1]));
  reject('同値再設定でも再封印した古い上書きを拒否',()=>{const c=copy(one);c.overrides.data.selectionBase.autoDraftRef.sha256=zeroHash;c.overrides=seal(c.overrides.data);return c;},c=>setResearchOverride(c,{connectionId:ids[0],role:'normal-cut',reason:reason(ids[0])}));
  reject('全接続を上書きしていても不完全原案を拒否',()=>{let c=autoContext;ids.forEach((id,i)=>{c=withOverride(c,id,opposite(autoDraft.data.entries[i].role));});return mutated(x=>{x.autoDraft.data.entries.pop();},c);});
  reject('不明接続のReset',()=>autoContext,c=>resetResearchOverride(c,'unknown-connection'));
  reject('設定commandの未知field',()=>autoContext,c=>setResearchOverride(c,{connectionId:ids[0],role:'normal-cut',reason:reason(ids[0]),durationMs:400}));
  reject('設定commandの未知role',()=>autoContext,c=>setResearchOverride(c,{connectionId:ids[0],role:'fade',reason:reason(ids[0])}));

  const bindings=[];
  for(const [name,record] of Object.entries(snapshots)){
    verifySealed(record);const file=path.join(out,`${name}.json`);const serialized=JSON.stringify(record,null,2)+'\n';fs.writeFileSync(file,serialized,{flag:'wx'});
    assert.equal(bytes(JSON.parse(fs.readFileSync(file,'utf8'))),bytes(record));bindings.push({path:file,sha256:hash(Buffer.from(serialized)),recordSha256:record.sha256});
  }
  test('保存した個別文書を読み戻し、明示通常とReset後を同じ結果へ再解決',()=>{
    const read=name=>JSON.parse(fs.readFileSync(path.join(out,`${name}.json`),'utf8'));
    const restored=freeze({trustedDigestRef:copy(trustedDigestRef),catalogue:read('catalogue'),baseline:read('baseline'),
      mode:'auto',autoDraft:read('simulatedAuto'),overrides:read('explicitNormalOverride')});
    assert.equal(bytes(resolveResearchConnections(restored)),bytes(read('explicitNormalEffective')));
    const reset=withoutOverride(restored,ids[0]);assert.equal(bytes(reset.overrides),bytes(read('emptyAutoOverrides')));
    assert.equal(bytes(resolveResearchConnections(reset)),bytes(read('afterReset')));
    const restoredNormal=freeze({...restored,mode:'normal-only',autoDraft:null,overrides:read('emptyNormalOverrides')});
    assert.equal(bytes(resolveResearchConnections(restoredNormal)),bytes(read('normalOnly')));
    return {restoredModes:2};
  });
  const sourceFiles=['connection_three_layer_research_v001.mjs','connection_three_layer_fixture_v001.mjs'].map(name=>{
    const file=path.join(tree,'evals/clip_composition',name),data=fs.readFileSync(file);return {path:file,bytes:data.length,sha256:hash(data)};
  });
  assert.deepEqual(fs.readFileSync(path.join(tree,profileName)),profileBytes);
  const result={schemaVersion:'connection-three-layer-fixture-result-research-v001',status:'passed',
    scope:'研究用の保存・解決だけ。実AI、人間評価、媒体製造、renderer・字幕の本番統合なし。',
    baselineCommit,profileBinding:{path:path.join(tree,profileName),sha256:hash(profileBytes)},trustedDigestRef,
    connectionCount:11,passed,rejected,positiveCaseCount:passed.length,rejectedCaseCount:rejected.length,
    snapshotBindings:bindings,sourceBindings:sourceFiles,aiCalls:0,mediaRenders:0,humanJudgments:0,
    limitation:'保存の意味論を実11境界で検証。正本の再復号、字幕や媒体の再投影、production入口の統合を検証したものではない。'};
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({status:'passed',positiveCaseCount:passed.length,rejectedCaseCount:rejected.length,snapshots:bindings.length,out}));
} catch(error){
  fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({status:'failed',message:error.message,stack:error.stack,passed,rejected},null,2)+'\n',{flag:'wx'});
  throw error;
}
