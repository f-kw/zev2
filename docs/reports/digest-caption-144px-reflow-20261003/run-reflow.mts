/** Individually approved setup 29: new requests, actual stdin answers, limited correspondence and readback. */
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {assertCaptionDisplayInputV001, runCaptionDisplayBoundariesV001, assertCaptionDisplayResultV001} from '../../../runner/src/skills/caption-display-boundaries-v001.js';
type Obj = Record<string, unknown>;
type Binding = {path: string; fileSha256: string; sizeBytes: number};
function isObj(v: unknown): v is Obj {return v !== null && typeof v === 'object' && !Array.isArray(v);}
function obj(v: unknown): Obj {assert(isObj(v)); return v;}
function arr(v: unknown): unknown[] {assert(Array.isArray(v)); return v;}
function records(v: unknown): Obj[] {return arr(v).map(obj);}
function str(v: unknown): string {assert(typeof v === 'string'); return v;}
function num(v: unknown): number {assert(typeof v === 'number' && Number.isFinite(v)); return v;}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const REPORT = 'docs/reports/digest-caption-144px-reflow-20261003';
const OUT = 'runtime/artifacts/digest-caption-144px-reflow-20261003-v001/attempt-001';
const SCHEMA = 'digest-caption-judgment-display-response-v001';
const same = (a: unknown, b: unknown) => assert.deepEqual(a, b);
const abs = (p: string) => path.join(ROOT, p);
const load = (p: string) => import(pathToFileURL(abs(p)).href);
const wire = await load('evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
const display = await load('evals/clip_composition/adopted_media_manufacturing_v001.mts');
const indexer = await load('evals/clip_composition/presentation_renderer_text_layout_v001.mjs');
const renderer = await load('evals/clip_composition/presentation_renderer_entry_v001.tsx');
const inspector = await load('evals/clip_composition/inspect_presentation_render_layout_v001.ts');
const clock = await load('evals/clip_composition/presentation_base_media_timeline_v004.mjs');
const observed = new Map<string, Binding>();
async function bytes(p: string, expected?: string) {
  assert(!path.isAbsolute(p) && !p.split('/').includes('..') && /\.(json|md|mts|mjs|ts|tsx)$/.test(p));
  const b = await readFile(abs(p)), binding = {path: p, fileSha256: str(wire.sha(b)), sizeBytes: b.length};
  if (expected) same(binding.fileSha256, expected);
  if (observed.has(p)) same(observed.get(p), binding);
  observed.set(p, binding); return b;
}
async function json(p: string, expected?: string): Promise<Obj> {return obj(JSON.parse((await bytes(p, expected)).toString()));}
async function ref(v: unknown) {const b = obj(v); return json(str(b.path), str(b.fileSha256));}
async function save(name: string, value: unknown): Promise<Binding> {
  const b: Buffer = wire.formal(value), p = OUT + '/' + name;
  await writeFile(abs(p), b, {flag: 'wx'}); return {path: p, fileSha256: str(wire.sha(b)), sizeBytes: b.length};
}
async function unchanged(bindings: Binding[]) {for (const b of bindings) {const current = await readFile(abs(b.path)); same(current.length, b.sizeBytes); same(wire.sha(current), b.fileSha256);}}
async function context() {
  const evidence = obj(JSON.parse(await readFile(abs(REPORT + '/evidence.json'), 'utf8')));
  const scope = obj(evidence.workOrder); await bytes(str(scope.path), str(scope.fileSha256));
  const diagnostic = await json('runtime/artifacts/digest-caption-style-compatibility-20261003-v001/attempt-003/compatibility.json', 'eb7a7a69c97722fc8433f73d4dbfd7733125d652903498cc1642f036c5336525');
  const diagnosticManifest = await json('runtime/artifacts/digest-caption-style-compatibility-20261003-v001/attempt-003/manifest.json', '948c1e11d2e6c6745c280f3c1797af956bd47a6b160810018525ba4b9516c02d');
  same(obj(diagnosticManifest.outputBinding).fileSha256, 'eb7a7a69c97722fc8433f73d4dbfd7733125d652903498cc1642f036c5336525');
  const dm = await ref(diagnostic.displayManifestBinding), prep = await ref(diagnostic.inputManifestBinding), meaning = await ref(dm.meaningBinding);
  const map = await ref(diagnostic.mapBinding);
  await json('runtime/artifacts/digest-caption-plan-timing-20261003-v001/attempt-001/manifest.json', '36f41a965c891aa5cf35c00c81b2aaf171284a1941d9d9d20a9c64532db44179');
  same(dm.inputManifestBinding, diagnostic.inputManifestBinding); same(map.inputManifestBinding, diagnostic.inputManifestBinding);
  const tc = obj(diagnostic.technicalCandidate), comparison = await ref(tc.source);
  const a = records(comparison.raster).find(r => r.tag === '0-A' && r.label === '0'); assert(a); same(a.props, tc.props);
  const ledger = await ref(tc.fontLedgerBinding);
  // Match the declared font by saved asset ID; do not read the declared font path.
  const props = obj(tc.props), ts = obj(obj(props.visualState).textStyle);
  const actualFont = records(ledger.fontAssets).find(f => f.fontAssetId === ts.fontAssetId); assert(actualFont); same(actualFont, tc.declaredFont);
  same([ts.fontSizePx, ts.borderWidthPx, ts.glowWidthPx], [144, 8, 4]); same(obj(props.visualState).background, null);
  const implementations = ['runner/src/skills/caption-display-boundaries-v001.ts', 'evals/clip_composition/adopted_media_manufacturing_v001.mts', 'evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts', 'evals/clip_composition/presentation_output_crop_application_v001.mjs', 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs', 'evals/clip_composition/presentation_renderer_text_layout_v001.mjs', 'evals/clip_composition/presentation_renderer_entry_v001.tsx', 'evals/clip_composition/inspect_presentation_render_layout_v001.ts', 'evals/clip_composition/presentation_base_media_timeline_v004.mjs', 'runner/src/telop/text-metrics.ts', 'runner/src/telop/telop-line-break.ts', REPORT + '/run-reflow.mts'];
  for (const p of implementations) await bytes(p);
  for (const fn of [wire.formal, wire.canonicalSha, wire.judgeThroughStdinV001, display.validateDisplayForAdoptionV001, display.readValidatedDisplayTracesV001, indexer.indexExplicitLinesV001, renderer.buildExactTextModel, inspector.inspectPresentationRenderLayoutV001, clock.frameBoundaryWithVideoOffsetV001, clock.sourceEndFrameBoundaryWithVideoOffsetV001]) same(typeof fn, 'function');
  same(typeof document, 'undefined');
  const responses = records(dm.responses), groups = records(meaning.orderedCandidates), diagnosticRows = records(diagnostic.cues), oldRows = records(map.cues);
  same(responses.length, groups.length);
  const atoms = new Map(records(meaning.atomOccurrences).map(a => [str(a.atomOccurrenceId), a]));
  const requests: Obj[] = [];
  for (const [i, receipt] of responses.entries()) {
    const r = await ref(receipt.requestBinding), oldResponse = await ref(receipt.responseBinding), oldResult = await ref(receipt.resultBinding);
    same(oldResponse.answer, oldResult.answer); same(oldResponse.requestFileSha256, obj(receipt.requestBinding).fileSha256);
    same(wire.sha(wire.formal(r)), obj(receipt.requestBinding).fileSha256); same(r.inputCanonicalSha256, wire.canonicalSha(r.input));
    assertCaptionDisplayInputV001(r.input); same(r.input.styleLimits.maxLogicalWidthPerLine, 36); same(r.input.styleLimits.maxLinesPerCue, 2);
    const group = groups[i]; assert(group); same(r.candidateId, group.candidateId); same(r.timelineSegmentId, group.timelineSegmentId);
    const oldGroup = oldRows.filter(c => c.groupOrdinal === i + 1), diagnosis = diagnosticRows.filter(c => c.groupOrdinal === i + 1);
    same(oldGroup.length, diagnosis.length);
    const cap = r.input.captions[0]; assert(cap); same(cap.boundaryCandidates.length, arr(group.atomOccurrenceIds).length);
    for (const [j, b] of cap.boundaryCandidates.entries()) {const atom = atoms.get(str(arr(group.atomOccurrenceIds)[j])); assert(atom); same(atom.text, b.text);}
    for (const [j, row] of oldGroup.entries()) {same(row.requestBinding, receipt.requestBinding); same(row.cueEndBoundaryId, diagnosis[j]?.cueEndBoundaryId); same(row.atomOccurrenceIds, diagnosis[j]?.atomOccurrenceIds); same(row.lines, diagnosis[j]?.lines);}
    const next = structuredClone(r); next.requestId = 'digest-caption-144px-reflow-20261003-v001-display-' + String(i + 1);
    const input = obj(next.input); obj(input.styleLimits).maxLogicalWidthPerLine = 26; next.inputCanonicalSha256 = wire.canonicalSha(input); assertCaptionDisplayInputV001(input);
    const restored = structuredClone(next); restored.requestId = r.requestId; obj(obj(restored.input).styleLimits).maxLogicalWidthPerLine = 36; restored.inputCanonicalSha256 = r.inputCanonicalSha256; same(restored, r);
    requests.push(next);
  }
  // Saved inspection is resolved only through the prior preparation's declared physical JSON reference.
  const logical = str(obj(map.inspectionBinding).path), physicals = records(prep.logicalToPhysical).filter(b => b.path === logical);
  same(physicals.length, 1); const physical = physicals[0]; assert(physical, 'inspection physical binding missing');
  same(physical.bytesVerified, true); same(physical.fileSha256, obj(map.inspectionBinding).fileSha256);
  const physicalPath = str(physical.physicalPath), inspection = await json(physicalPath, str(obj(map.inspectionBinding).fileSha256));
  const media = obj(inspection.media), video = obj(media.source).video; const videoObj = obj(video);
  same(videoObj.frameRate, obj(map.sourceFrameClock).inputFrameRate); same(media.decodedFrameCount, obj(map.sourceFrameClock).decodedFrameCount); same(videoObj.presentationOffsetMs, obj(map.sourceFrameClock).videoPresentationOffsetMs);
  return {evidence, diagnostic, dm, prep, meaning, map, props, groups, atoms, requests, responses, oldRows, diagnosticRows, implementations};
}
type Context = Awaited<ReturnType<typeof context>>;
function correspond(c: Context, i: number, request: Obj, result: Obj) {
  const group = c.groups[i]; assert(group); const cap = obj(arr(obj(request.input).captions)[0]);
  const boundaries = records(cap.boundaryCandidates), atomIds = arr(group.atomOccurrenceIds).map(str);
  const positions = new Map(boundaries.map((b, j) => [str(b.boundaryId), j]));
  const mapping = records(c.map.originalMappings).find(m => m.segmentId === group.timelineSegmentId); assert(mapping);
  const old = c.oldRows.filter(r => r.groupOrdinal === i + 1), d = c.diagnosticRows.filter(r => r.groupOrdinal === i + 1);
  const answerCues = records(obj(arr(obj(result.answer).captions)[0]).cues), rows: Obj[] = [], changes: Obj[] = [];
  let nextCue = 0, previous = 0;
  for (const [oldIndex, original] of old.entries()) {
    const outerEnd = positions.get(str(original.cueEndBoundaryId)); assert(outerEnd !== undefined);
    same(atomIds.slice(previous, outerEnd + 1), original.atomOccurrenceIds);
    const children: Obj[] = []; let start = previous;
    while (start <= outerEnd) {
      const cue = answerCues[nextCue]; assert(cue, 'old outer boundary omitted');
      const end = positions.get(str(cue.cueEndBoundaryId)); assert(end !== undefined && end >= start && end <= outerEnd, 'crosses old cue');
      const childAtoms = atomIds.slice(start, end + 1).map(id => {const a = c.atoms.get(id); assert(a); return a;});
      const lines: Obj[] = []; let lineStart = start;
      for (const boundary of arr(cue.lineEndBoundaryIds).map(str)) {
        const e = positions.get(boundary); assert(e !== undefined && e >= lineStart && e <= end);
        lines.push({lineEndBoundaryId: boundary, text: boundaries.slice(lineStart, e + 1).map(b => str(b.text)).join(''), atomOccurrenceIds: atomIds.slice(lineStart, e + 1), sourceSegmentIds: childAtoms.slice(lineStart - start, e - start + 1).map(a => a.sourceSegmentId)}); lineStart = e + 1;
      }
      same(lineStart, end + 1); same(lines.map(l => l.text).join(''), childAtoms.map(a => a.text).join(''));
      let timing: Obj;
      if (start === previous && end === outerEnd) timing = Object.fromEntries(['sourceStartMs','sourceEndMs','sourceStartFrame30','sourceEndFrame30','startFrame','endFrameExclusive','displayFrameCount'].map(k => [k, original[k]]));
      else {
        const spans = childAtoms.map(a => {const s = records(a.retainedSpans); same(s.length, 1); same(s[0]?.timelineSegmentId, group.timelineSegmentId); return obj(s[0]);});
        const sourceStartMs = num(spans[0]?.sourceStartMs), sourceEndMs = num(spans.at(-1)?.sourceEndMs), frameClock = obj(c.map.sourceFrameClock);
        const sf: unknown = clock.frameBoundaryWithVideoOffsetV001(sourceStartMs, frameClock.videoPresentationOffsetMs), ef: unknown = clock.sourceEndFrameBoundaryWithVideoOffsetV001(sourceEndMs, frameClock);
        const startFrame = num(mapping.outputStartFrame) + num(sf) - num(mapping.sourceStartFrame30), endFrameExclusive = num(mapping.outputStartFrame) + num(ef) - num(mapping.sourceStartFrame30);
        assert(startFrame >= num(original.startFrame) && endFrameExclusive <= num(original.endFrameExclusive) && startFrame < endFrameExclusive, 'invalid child plan range');
        timing = {sourceStartMs,sourceEndMs,sourceStartFrame30:sf,sourceEndFrame30:ef,startFrame,endFrameExclusive,displayFrameCount:endFrameExclusive-startFrame};
      }
      const indexed = obj(indexer.indexExplicitLinesV001(lines.map(l => str(l.text)))); same(indexed.status, 'passed'); same(indexed.sourceText, childAtoms.map(a => a.text).join(''));
      const overlay = {...structuredClone(c.props), instructionId: 'reflow-diagnostic-' + String(i + 1) + '-' + String(nextCue + 1), text: indexed.sourceText, indexedLines: indexed.indexedLines};
      const exact: unknown = renderer.buildExactTextModel(overlay), geometry = obj(inspector.inspectPresentationRenderLayoutV001({canvas:c.props.canvas, overlays:[overlay]})); same(geometry.status, 'passed'); same(geometry.violations, []);
      const row = {groupOrdinal:i+1,cueOrdinal:nextCue+1,oldCueOrdinal:original.cueOrdinal,candidateId:group.candidateId,timelineSegmentId:group.timelineSegmentId,captionId:cap.captionId,cueEndBoundaryId:cue.cueEndBoundaryId,lineEndBoundaryIds:cue.lineEndBoundaryIds,atomOccurrenceIds:atomIds.slice(start,end+1),sourceSegmentIds:childAtoms.map(a=>a.sourceSegmentId),semanticUtteranceIds:[...new Set(childAtoms.map(a=>a.semanticUtteranceId))],lines,...timing,geometry,exactTextModel:exact};
      rows.push(row); children.push(row); start = end + 1; nextCue += 1;
    }
    const diagnosis = d[oldIndex]; assert(diagnosis); const fixed = diagnosis.compatibility === 'compatible';
    if (fixed) {same(children.length,1);const child=children[0];assert(child);for(const k of ['cueEndBoundaryId','lineEndBoundaryIds','atomOccurrenceIds','sourceSegmentIds','semanticUtteranceIds','lines','sourceStartMs','sourceEndMs','sourceStartFrame30','sourceEndFrame30','startFrame','endFrameExclusive','displayFrameCount']) same(child[k],original[k]);}
    same(children[0]?.startFrame, original.startFrame); same(children.at(-1)?.endFrameExclusive, original.endFrameExclusive); same(children.at(-1)?.cueEndBoundaryId,original.cueEndBoundaryId);
    same(children.flatMap(r=>arr(r.atomOccurrenceIds)),original.atomOccurrenceIds);
    changes.push({oldRequestBinding:original.requestBinding,oldCueOrdinal:original.cueOrdinal,timelineSegmentId:original.timelineSegmentId,oldCueEndBoundaryId:original.cueEndBoundaryId,oldAtomOccurrenceIds:original.atomOccurrenceIds,fixed,newCueOrdinals:children.map(r=>r.cueOrdinal),oldLineEndBoundaryIds:original.lineEndBoundaryIds,newLineEndBoundaryIds:children.map(r=>r.lineEndBoundaryIds),outerFrameUnchanged:true});
    previous=outerEnd+1;
  }
  same(nextCue,answerCues.length); same(previous,boundaries.length); same(rows.flatMap(r=>arr(r.atomOccurrenceIds)),group.atomOccurrenceIds);
  for(let k=1;k<rows.length;k++) assert(num(rows[k]?.startFrame)>=num(rows[k-1]?.endFrameExclusive),'new plan overlap');
  return {rows,changes};
}
async function absent() {try {await access(abs(OUT));throw Error('new output exists');}catch(e){if(!isObj(e)||e.code!=='ENOENT')throw e;} await access(abs('runtime/artifacts'));}
async function run() {
  await absent(); const began=performance.now(), c=await context(), oldBindings=[...observed.values()];
  await mkdir(path.dirname(abs(OUT)),{recursive:true});await mkdir(abs(OUT));
  const newRequests: Binding[]=[];
  for(const [i,r] of c.requests.entries())newRequests.push(await save('request-'+String(i+1).padStart(4,'0')+'.json',r));
  await save('preflight.json',{scopeBinding:c.evidence.workOrder,exports:'verified',newDestinationAbsent:true,documentAbsent:true,oldInputBindings:oldBindings,history:{product:6,setup:29}});
  const receipts:Obj[]=[],tokens:object[]=[],allRows:Obj[]=[],allChanges:Obj[]=[],times:Obj[]=[];
  for(const [i,r] of c.requests.entries()) {
    assertCaptionDisplayInputV001(r.input); const rb=newRequests[i];assert(rb); const old=c.oldRows.filter(x=>x.groupOrdinal===i+1), diagnosis=c.diagnosticRows.filter(x=>x.groupOrdinal===i+1);
    const input=r.input, cap=input.captions[0];assert(cap);const positions=new Map(cap.boundaryCandidates.map((b,j)=>[b.boundaryId,j+1]));
    console.log(JSON.stringify({event:'reflow-correspondence-constraints',ordinal:i+1,newRequestBinding:rb,taskDescription:input.taskDescription,styleLimits:input.styleLimits,oldRequestBinding:c.responses[i]?.requestBinding,oldResponseBinding:c.responses[i]?.responseBinding,oldCues:old.map((x,j)=>({oldCueOrdinal:x.cueOrdinal,fixed:diagnosis[j]?.compatibility==='compatible',cueEndBoundaryId:x.cueEndBoundaryId,cueEndLocal:positions.get(str(x.cueEndBoundaryId)),lineEndBoundaryIds:x.lineEndBoundaryIds,lineEndLocal:arr(x.lineEndBoundaryIds).map(id=>positions.get(str(id))),lines:records(x.lines).map(l=>({text:l.text,logicalWidth:Array.from(str(l.text)).reduce((n,ch)=>n+num(indexer.codePointWeightV001(ch,input.styleLimits.characterWidthRule)),0)})),atomOccurrenceIds:x.atomOccurrenceIds}))}));
    let response: Obj={},waitStart=0,readyAt=0;
    const result=await runCaptionDisplayBoundariesV001(input,async actual=>{same(actual,input);waitStart=Date.now();response=obj(await wire.judgeThroughStdinV001(r));readyAt=Date.now();return response.answer;});
    const validationStart=performance.now();assertCaptionDisplayResultV001(result);const token:object=display.validateDisplayForAdoptionV001(r,response,result,SCHEMA);tokens.push(token);
    const projections=correspond(c,i,r,obj(result));allRows.push(...projections.rows);allChanges.push(...projections.changes);
    const number=String(i+1).padStart(4,'0'),responseBinding=await save('response-'+number+'.json',response),resultBinding=await save('result-'+number+'.json',result),trace:unknown=display.readValidatedDisplayTracesV001([r],[token]);
    assert(Array.isArray(trace)&&trace.length===1);const traceBinding=await save('trace-'+number+'.json',{schemaVersion:'digest-caption-144px-reflow-trace-v001',traces:trace});
    const correspondenceBinding=await save('correspondence-'+number+'.json',{schemaVersion:'digest-caption-144px-reflow-correspondence-v001',...projections});
    const receipt={ordinal:i+1,oldRequestBinding:c.responses[i]?.requestBinding,requestBinding:rb,responseBinding,resultBinding,traceBinding,correspondenceBinding,cueCount:projections.rows.length,lineCount:projections.rows.reduce((n,x)=>n+arr(x.lines).length,0),atomCount:arr(c.groups[i]?.atomOccurrenceIds).length,fixedOldCues:projections.changes.filter(x=>x.fixed).length,variableOldCues:projections.changes.filter(x=>!x.fixed).length,judgmentNote:response.judgmentNote};receipts.push(receipt);
    times.push({ordinal:i+1,judgmentReuseAndFormattingWallMs:readyAt-waitStart,validationGeometryAndSaveMs:performance.now()-validationStart});
    await save('receipt-'+number+'.json',{receipt,timing:times.at(-1)});
    await writeFile(abs(REPORT+'/evidence.json'),wire.formal({...c.evidence,status:'judging',history:{product:6,setupApplied:29},acceptedResponses:receipts,timing:times}));
    console.log(JSON.stringify({event:'reflow-validated',...receipt}));
  }
  const traces:unknown=display.readValidatedDisplayTracesV001(c.requests,tokens);const tracesBinding=await save('traces.json',{schemaVersion:'digest-caption-144px-reflow-traces-v001',traces});
  const correspondenceBinding=await save('correspondence.json',{schemaVersion:'digest-caption-144px-reflow-correspondence-v001',rows:allRows,changes:allChanges});
  const fixed=allChanges.filter(x=>x.fixed).length,variable=allChanges.length-fixed;same(fixed,obj(c.diagnostic.summary).compatible);same(variable,obj(c.diagnostic.summary).incompatible);
  const summary={groups:c.requests.length,oldCues:allChanges.length,fixedOldCues:fixed,variableOldCues:variable,newCues:allRows.length,newLines:allRows.reduce((n,x)=>n+arr(x.lines).length,0),atoms:allRows.reduce((n,x)=>n+arr(x.atomOccurrenceIds).length,0),minDisplayFrames:Math.min(...allRows.map(x=>num(x.displayFrameCount))),maxDisplayFrames:Math.max(...allRows.map(x=>num(x.displayFrameCount))),originalClockSummary:c.map.summary};
  same(summary.atoms,obj(c.diagnostic.summary).atoms);await unchanged(oldBindings);
  const manifest={schemaVersion:'digest-caption-144px-reflow-candidate-bundle-v001',scopeBinding:c.evidence.workOrder,receivedHead:c.evidence.receivedHead,history:{product:6,setup:29},diagnosticBinding:observed.get('runtime/artifacts/digest-caption-style-compatibility-20261003-v001/attempt-003/compatibility.json'),oldInputBindings:oldBindings,newStyleLimits:{maxLogicalWidthPerLine:26,maxLinesPerCue:2,characterWidthRule:obj(obj(c.requests[0]?.input).styleLimits).characterWidthRule},technicalCandidate:c.diagnostic.technicalCandidate,meaningBinding:c.dm.meaningBinding,mapBinding:c.diagnostic.mapBinding,responses:receipts,tracesBinding,correspondenceBinding,summary,timing:times,totalBeforeManifestMs:performance.now()-began,admission:c.evidence.admission,effects:{mediaFontBinary:0,copyBytes:0,rendering:0,productChanges:0,apiCostUsd:0}};
  const manifestBinding=await save('manifest.json',manifest);
  await writeFile(abs(REPORT+'/evidence.json'),wire.formal({...c.evidence,status:'candidate-saved-readback-pending',history:{product:6,setupApplied:29},manifestBinding,summary,acceptedResponses:receipts,timing:times}));
  console.log(JSON.stringify({event:'reflow-saved',manifestBinding,summary}));
}
async function readback() {
  const start=performance.now(),c=await context(),e=obj(JSON.parse(await readFile(abs(REPORT+'/evidence.json'),'utf8'))),m=await ref(e.manifestBinding);
  const oldBindings=records(m.oldInputBindings).map(b=>({path:str(b.path),fileSha256:str(b.fileSha256),sizeBytes:num(b.sizeBytes)}));
  await unchanged(oldBindings);const receipts=records(m.responses),tokens:object[]=[],rows:Obj[]=[],changes:Obj[]=[];same(receipts.length,c.requests.length);
  for(const [i,r]of receipts.entries()) {
    const request=await ref(r.requestBinding);same(request,c.requests[i]);same(wire.sha(wire.formal(request)),obj(r.requestBinding).fileSha256);
    const response=await ref(r.responseBinding),result=await ref(r.resultBinding);assertCaptionDisplayResultV001(result);
    const token:object=display.validateDisplayForAdoptionV001(request,response,result,SCHEMA);tokens.push(token);
    const trace=await ref(r.traceBinding);same(trace,{schemaVersion:'digest-caption-144px-reflow-trace-v001',traces:display.readValidatedDisplayTracesV001([request],[token])});same(await readFile(abs(str(obj(r.traceBinding).path))),wire.formal(trace));
    const projection=correspond(c,i,request,result);same(await ref(r.correspondenceBinding),{schemaVersion:'digest-caption-144px-reflow-correspondence-v001',...projection});rows.push(...projection.rows);changes.push(...projection.changes);
  }
  const traces={schemaVersion:'digest-caption-144px-reflow-traces-v001',traces:display.readValidatedDisplayTracesV001(c.requests,tokens)};same(await ref(m.tracesBinding),traces);same(await readFile(abs(str(obj(m.tracesBinding).path))),wire.formal(traces));
  const correspondence={schemaVersion:'digest-caption-144px-reflow-correspondence-v001',rows,changes};same(await ref(m.correspondenceBinding),correspondence);same(await readFile(abs(str(obj(m.correspondenceBinding).path))),wire.formal(correspondence));await unchanged(oldBindings);
  const result={status:'passed',judgmentsCalled:0,processId:process.pid,traceAndCorrespondenceBytesEqual:true,oldInputsUnchanged:true,summary:m.summary,elapsedMs:performance.now()-start};const readbackBinding=await save('readback.json',result);
  await writeFile(abs(REPORT+'/evidence.json'),wire.formal({...e,status:'passed',readbackBinding,readback:result}));console.log(JSON.stringify(result));
}
const mode=process.argv[2];same(process.argv.length,3);
if(mode==='preflight'){await absent();const c=await context();console.log(JSON.stringify({status:'passed',exports:'verified',inputCount:observed.size,requests:c.requests.length,oldSummary:c.diagnostic.summary,newOutputAbsent:true,documentAbsent:true}));}
else if(mode==='run')await run();else if(mode==='readback')await readback();else throw Error('Explicit preflight/run/readback required');
