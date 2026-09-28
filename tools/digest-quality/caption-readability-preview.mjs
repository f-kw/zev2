/** 7A local candidate only. No registry/trust activation or source mutation. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {indexExplicitLinesV001} from '../../evals/clip_composition/presentation_renderer_text_layout_v001.mjs';
import {captionReadabilityPlanSha256V001, captionReadabilityMeasurementContextSha256V001,
  buildCaptionReadabilityPlanV001, restoreCaptionReadabilityPlanV001} from './caption-readability-plan.mjs';
import {buildReadabilitySourceAtomsV001} from './caption-readability-source.mjs';
import {buildPresentationCaptionMotionStateElementsV001,assertPresentationCaptionMotionLayoutsV001} from '../../evals/clip_composition/presentation_caption_motion_v001.mjs';
import {buildPresentationPulseStateElementsV001} from '../../evals/clip_composition/presentation_pulse_v001.mjs';
import {createPresentationRendererOverlayJobV001,composePresentationMediaV001} from '../../evals/clip_composition/render_presentation_v002.mjs';
import {createPresentationRendererProcessObserverV001} from '../../evals/clip_composition/presentation_renderer_process_observation_v001.mjs';
import {inspectOverlayPngWithToolV001,inspectRenderedMediaWithToolsV001} from '../../evals/clip_composition/presentation_renderer_qc_v002.mjs';
import {execFile, spawn} from 'node:child_process';
import {promisify} from 'node:util';

export const READABILITY_PREVIEW_V001 = Object.freeze({
  schemaVersion: 'caption-readability-preview-profile-v001',
  adoption: 'not-adopted-human-preview-required',
  normalFontSizePx: 144, scaleFontSizePx: 192,
  borderWidthPx: 4, glowWidthPx: 4, outlineColor: '#2F4F4F',
  outlineColorOrigin: 'DarkSlateGray named color',
  // Keep the geometry engine and formulas intact. These are separate preview
  // inputs, never a claim that the old human-approved trust authorizes them.
  geometryEngine: 'normal-landscape-render-layout-v001',
  horizontalSafeMarginRatio: 0,
  safeAreaPx: {left: 4, right: 4, top: 40, bottom: 40},
  protectionReason: 'Existing engine minimum 4px; full stroke/glow raster must fit. Vertical placement protection retained.',
});
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const originalRoot = path.join(root, 'evals/clip_composition/outputs/presentation/new-material-digest-20260926-first-draft-qc-resume-v001');
const runtimeRoot = path.join(root, 'runtime/artifacts/digest-new-material-20260926-v001');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async p => JSON.parse(await readFile(p, 'utf8'));
const save = (p, x) => writeFile(p, JSON.stringify(x, null, 2) + '\n', {flag: 'wx'});
const bound = async p => {const b = await readFile(p); return {path: p, bytes: b.length, sha256: sha(b)};};
const execute=promisify(execFile);
const ffmpeg='/opt/homebrew/bin/ffmpeg',magick='/opt/homebrew/bin/magick',ffprobe='/opt/homebrew/bin/ffprobe';
const run=async(cmd,args)=>(await execute(cmd,args,{encoding:'buffer',maxBuffer:128*1024*1024})).stdout;
export function makeReadabilityPreviewPlanV001(original) {
  const plan = structuredClone(original);
  plan.canvas.safeAreaPx = {...READABILITY_PREVIEW_V001.safeAreaPx};
  plan.layoutRules.horizontalSafeMarginRatio = READABILITY_PREVIEW_V001.horizontalSafeMarginRatio;
  for (const e of plan.elements) {
    const s = e.visualState.textStyle;
    assert([96, 128].includes(s.fontSizePx), 'unexpected old font size');
    s.fontSizePx = s.fontSizePx === 128 ? 192 : 144;
    if (!e.visualState.background) Object.assign(s, {borderWidthPx: 4, glowWidthPx: 4,
      borderColor: '#2F4F4F', glowColor: '#2F4F4F'});
  }
  return plan;
}
export function readabilityEffectV001(e) {
  if (e.presentationMotion) return e.presentationMotion.presentation.endsWith('bounce') ? 'bounce' : 'shake';
  if (e.presentationPulse) return 'pulse';
  if (e.visualState.background) return 'panel';
  if (e.visualState.textStyle.fontSizePx === 192) return 'scale';
  if (e.presentationColorRange) return 'color';
  return 'normal';
}
function propsFor(e, plan, registry) {
  const font = registry.fontAssets.find(f => f.fontAssetId === e.visualState.textStyle.fontAssetId);
  assert(font);
  return {schemaVersion: 'presentation-renderer-overlay-props-v001', canvas: plan.canvas,
    instructionId: e.instructionId, text: e.text, indexedLines: e.indexedLines,
    ...(e.presentationColorRange ? {presentationColorRange: e.presentationColorRange} : {}),
    visualState: e.visualState, layoutRules: plan.layoutRules,
    fontFamilyName: `zev-renderer-${font.fontAssetId}`, fontFileName: font.fileName, inspectionLineIndex: null};
}
function sourceAtomsForCaption(row) {
  return row.atoms.map(a => ({atomId:a.atomId,text:a.text,startFrame:a.startFrame,endFrameExclusive:a.endFrameExclusive,
    sourceStartMs:a.sourceSpans[0].sourceStartMs,sourceEndMs:a.sourceSpans.at(-1).sourceEndMs,
    timelineSegmentId:a.sourceSpans[0].timelineSegmentId}));
}
function applySavedEffects(original, resolution) {
  const effects=new Map(original.elements.map(e=>[e.instructionId,e]));
  const resolved=structuredClone(resolution.normalPlan);
  for(const mapping of resolution.effectMappings) {
    const e=resolved.elements.find(c=>c.instructionId===mapping.childCaptionId),old=effects.get(mapping.parentCaptionId);
    assert(e&&old,'saved presentation target is missing');
    if(mapping.kind==='color')e.presentationColorRange={...mapping.range,fontColor:old.presentationColorRange.fontColor};
    if(old.presentationPreset)e.presentationPreset=structuredClone(old.presentationPreset);
    if(old.presentationMotion)e.presentationMotion={...old.presentationMotion,presetVersion:'presentation-caption-motion-readability-v001'};
    if(old.presentationPulse)throw Error('saved Pulse not present in this fixture; fixture-only coverage is separate');
  }
  return resolved;
}
/** Rebuild from the saved finite judgment, not today's editable judgment file.
 * Original source bytes and source clocks are checked separately by the reader. */
export function verifyReadabilityPreviewStateV001({original,source,profile,prepared,normalPlan,evidence,resolution,plan}) {
  assert.deepEqual(profile,READABILITY_PREVIEW_V001,'saved preview profile changed');
  assert.deepEqual(prepared.profile,profile,'prepared profile differs');
  assert.equal(prepared.status,'layout-preflight-passed-raster-and-human-not-yet-checked');
  const expected=makeReadabilityPreviewPlanV001(original);
  expected.schemaVersion='presentation-output-common-core-plan-v001';
  assert.equal(source.captions.length,expected.elements.length,'source caption coverage differs');
  assert.equal(evidence.captions.length,expected.elements.length,'saved evidence coverage differs');
  for(const [i,e] of expected.elements.entries()) {
    const row=source.captions[i],old=original.elements[i];
    assert.equal(row.captionId,e.instructionId,'saved source caption order differs');
    const atoms=sourceAtomsForCaption(row);
    for(const k of ['overlaySha256','presentationColorRange','presentationPreset','presentationPulse','presentationMotion'])delete e[k];
    Object.assign(e,{sourceStartMs:atoms[0].sourceStartMs,sourceEndMs:atoms.at(-1).sourceEndMs,timelineSegmentId:atoms[0].timelineSegmentId});
    assert.deepEqual(evidence.captions[i].atoms,atoms,'saved source atoms differ');
    const kind=readabilityEffectV001(makeReadabilityPreviewPlanV001({...original,elements:[old]}).elements[0]);
    const effect=kind==='color'?{kind,range:{startCodePoint:old.presentationColorRange.startCodePoint,
      endCodePointExclusive:old.presentationColorRange.endCodePointExclusive}}:{kind};
    assert.deepEqual(evidence.captions[i].effect,effect,'saved presentation meaning differs');
  }
  assert.deepEqual(normalPlan,expected,'saved unsplit plan differs from original/profile/source');
  assert.equal(evidence.clockId,source.sourceBindings.projectionSha256,'saved evidence clock differs');
  assert.equal(prepared.clockId,evidence.clockId,'prepared clock differs');
  const rebuilt=restoreCaptionReadabilityPlanV001({normalPlan,evidence,saved:resolution});
  assert.deepEqual(prepared.summary,rebuilt.summary,'prepared summary differs');
  assert.deepEqual(plan,applySavedEffects(original,rebuilt),'saved candidate plan differs from restored decisions');
  return {old:original,plan,resolution:rebuilt};
}
async function readVerifiedPreview(output) {
  const names=['prepared','candidate-profile','source-atoms','unsplit-core-plan','readability-evidence','readability-resolution','candidate-render-plan'];
  const [prepared,profile,source,normalPlan,evidence,resolution,plan]=await Promise.all(names.map(n=>json(path.join(output,n+'.json'))));
  const sourcePlanPath=path.join(originalRoot,'presentation-render-plan-v002.json');
  assert.deepEqual(await bound(sourcePlanPath),prepared.sourcePlan,'original saved plan changed');
  const original=await json(sourcePlanPath);
  const drawing=await json(path.join(runtimeRoot,'presentation/drawing-evidence.json'));
  const projection=await json(path.join(runtimeRoot,'presentation/background/projection.json'));
  const meaning=await json(path.join(runtimeRoot,'caption-attempt-003/meaning-input.json'));
  const currentSource=buildReadabilitySourceAtomsV001({finalPlan:original,meaning,projection,
    baseTimeline:JSON.parse(drawing.source.timelineBytes),sourcePlanBytes:drawing.source.planBytes,baseTimelineBytes:drawing.source.timelineBytes});
  assert.deepEqual(source,currentSource,'saved source atoms or original clock inputs changed');
  return verifyReadabilityPreviewStateV001({original,source,profile,prepared,normalPlan,evidence,resolution,plan});
}

/** Validate every saved raster/state against its restored caption and file bytes.
 * This is a read-only check; it does not redraw or reinterpret a pass. */
export async function verifyReadabilityPreviewRastersV001({output,plan,resolution,records,verification,registry}) {
  assert.equal(verification.status,'passed');
  assert(Array.isArray(verification.representatives)&&verification.representatives.length>0);
  const selected=new Set(resolution.captionMappings.filter(m=>verification.representatives.some(id=>m.parentCaptionId.endsWith(id))).flatMap(m=>m.children.map(c=>c.captionId)));
  const elements=plan.elements.filter(e=>selected.has(e.instructionId));
  assert.equal(records.length,elements.length,'saved raster coverage differs');
  const expected=[];
  for(const [i,e] of elements.entries()) {
    const record=records[i];assert.deepEqual(record.element,e,'raster caption differs from restored candidate');
    if(e.presentationMotion) {
      const states=buildPresentationCaptionMotionStateElementsV001({element:e,canvas:plan.canvas});
      assert.equal(record.motionStates?.length,states.length,'saved motion state coverage differs');
      for(const [j,s] of states.entries()) {
        const actual=record.motionStates[j];assert.equal(actual.state,s.state,'saved motion state order differs');
        assert.deepEqual(actual.element,s.element,'saved motion state differs');
        expected.push({label:`${i}-${s.state}`,element:s.element,record:actual});
      }
      assert.equal(record.pngPath,record.motionStates[0].pngPath,'motion stable image differs');
    }else expected.push({label:String(i),element:e,record});
  }
  const pulse=structuredClone(plan.elements.find(e=>e.instructionId.endsWith('000053')));assert(pulse);
  pulse.instructionId='7a-synthetic-pulse';pulse.startFrame=0;pulse.endFrameExclusive=90;pulse.displayFrameCount=90;
  pulse.presentationPulse={presentation:'provisional-pulse',presetVersion:'presentation-pulse-readability-v001',anchorPeakId:'synthetic',anchorFrame:30};
  for(const s of buildPresentationPulseStateElementsV001({element:pulse,canvas:plan.canvas}))expected.push({label:`synthetic-pulse-${s.state}`,element:s.element});
  const color=structuredClone(plan.elements.find(e=>e.instructionId.endsWith('000137')));assert(color?.presentationColorRange);
  color.presentationColorRange.fontColor='#87CEFA';expected.push({label:'comparison-only-cyan',element:color});
  const checks=verification.checks.filter(c=>c.props);
  assert.equal(checks.length,expected.length,'raster verification coverage differs');
  for(const [i,item] of expected.entries()) {
    const check=checks[i],pngPath=path.join(output,'raster',item.label+'.png');
    assert.equal(check.label,item.label,'raster label/order differs');
    assert.deepEqual(check.props,propsFor(item.element,plan,registry),'raster props differ from restored candidate');
    assert.equal((await bound(pngPath)).sha256,check.sha256,'saved PNG bytes changed: '+item.label);
    if(item.record) {
      assert.equal(item.record.pngPath,pngPath,'saved raster path differs');
      assert.equal(item.record.sha256,check.sha256,'raster record hash differs');
      assert.deepEqual(item.record.inspection.alphaBounds,check.alphaBounds,'raster inspection differs');
    }
  }
  const first=records[0].motionStates?.[0]??records[0];
  assert.equal((await bound(path.join(output,'raster','independent-repeat.png'))).sha256,first.sha256,'same-process repeat PNG changed');
  return {status:'passed',rasterImages:expected.length+1,repeatScope:'same-overlay-job',mediaRedrawn:false};
}
async function readVerifiedRasters(output) {
  const state=await readVerifiedPreview(output);
  const [records,verification,registry]=await Promise.all([
    json(path.join(output,'raster-records.json')),json(path.join(output,'raster-verification.json')),
    json(path.join(root,'evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json'))]);
  const checked=await verifyReadabilityPreviewRastersV001({output,...state,records,verification,registry});
  return {...state,records,checked};
}
async function verifyPackageFiles(saved,state) {
  const ids=['000260','000137','000095'];assert.equal(saved.pairs.length,ids.length,'comparison pair coverage differs');
  let frames=0;
  for(const [i,pair] of saved.pairs.entries()) {
    const parent=state.old.elements.find(e=>e.instructionId.endsWith(ids[i]));assert(parent);
    assert.equal(pair.parentCaptionId,parent.instructionId,'comparison source differs');
    assert.deepEqual([pair.startFrame,pair.endFrameExclusive],[parent.startFrame,parent.endFrameExclusive],'comparison clocks differ');
    assert.deepEqual(pair.children,state.resolution.captionMappings.find(m=>m.parentCaptionId===parent.instructionId).children,'comparison partition differs');
    assert.deepEqual(pair.sides.map(s=>s.name),['current','candidate']);
    assert.equal(pair.sides[0].audioHash,pair.sides[1].audioHash,'comparison paired audio record differs');
    for(const file of [pair.base,pair.audio,...pair.sides.flatMap(s=>[s.media,s.labeled])])assert.deepEqual(await bound(file.path),file,'comparison media changed');
    pair.sides.forEach(s=>assert.equal(s.frameCount,parent.displayFrameCount,'comparison length differs'));
    frames+=parent.displayFrameCount*2;
  }
  assert.equal(saved.totalFrames,frames);assert.equal(saved.totalVideoSeconds,frames/30);
  assert.deepEqual(await bound(saved.video.path),saved.video,'review video changed');
}
async function measureWidths(requests, output) {
  const req = createRequire(path.join(root, 'runner/package.json'));
  const remotion = createRequire(req.resolve('@remotion/cli/package.json'));
  const {openBrowser} = remotion('@remotion/renderer');
  const {build} = createRequire(req.resolve('tsx/package.json'))('esbuild');
  const chrome = path.join(root, 'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell');
  const fontPath = path.join(root, 'runner/public/font/LINESeedJP_A_OTF_Eb.otf');
  const bundle = await build({stdin: {contents: `export {buildExactTextModel} from './evals/clip_composition/presentation_renderer_entry_v001.tsx';`, resolveDir: root, loader: 'ts'},
    bundle:true,write:false,platform:'browser',format:'iife',globalName:'ReadabilityMetrics',nodePaths:[path.join(root,'runner/node_modules')],
    define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
  const browser=await openBrowser('chrome',{browserExecutable:chrome,forceDeviceScaleFactor:1,logLevel:'error'});
  try {
    const page=await browser.newPage({context:()=>null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:null,onLog:()=>{}});
    await page.setViewport({width:1920,height:1080,deviceScaleFactor:1});
    await page.goto({url:'about:blank',timeout:30000});
    await page.evaluate(bundle.outputFiles[0].text);
    const fontUrl='data:font/otf;base64,'+(await readFile(fontPath)).toString('base64');
    await page.evaluate(`(async()=>{const f=await new FontFace('zev-renderer-line-seed-jp-extra-bold-v001','url('+${JSON.stringify(fontUrl)}+')',{weight:'800'}).load();document.fonts.add(f);await document.fonts.ready;if(!document.fonts.has(f))throw Error('font not active')})()`);
    const measured=await page.evaluate(`(()=>{const ctx=document.createElement('canvas').getContext('2d');return ${JSON.stringify(requests)}.map(r=>{
      const p=r.props;ctx.font='800 '+p.visualState.textStyle.fontSizePx+'px "'+p.fontFamilyName+'"';
      const exact=ReadabilityMetrics.buildExactTextModel(p);
      return {key:r.key,fullWidthPx:exact.wrapper.width+(r.lateralTravelPx??0)*2,wrapper:exact.wrapper,
        measuredLines:p.indexedLines.map(l=>{const m=ctx.measureText(l.text);return {text:l.text,advanceWidthPx:m.width,inkWidthPx:m.actualBoundingBoxLeft+m.actualBoundingBoxRight}})};
    })})()`);
    await save(path.join(output,'span-font-measurements.json'),{font:await bound(fontPath),browser:await bound(chrome),
      geometry:await bound(path.join(root,'evals/clip_composition/presentation_renderer_entry_v001.tsx')),
      metric:await bound(path.join(root,'runner/src/telop/text-metrics.ts')),measurements:measured});
    return new Map(measured.map(r=>[r.key,r]));
  } finally {await browser.close({silent:true});}
}
async function prepare(output) {
  await mkdir(output, {recursive:false});
  const sourcePlanPath=path.join(originalRoot,'presentation-render-plan-v002.json');
  const old=await json(sourcePlanPath), plan=makeReadabilityPreviewPlanV001(old);
  const registry=await json(path.join(root,'evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json'));
  const semanticsPath=path.join(root,'docs/reports/caption-readability-splitting-20260928/semantic-boundaries.json');
  const semantics=await json(semanticsPath);
  assert.deepEqual(await bound(sourcePlanPath),semantics.sourcePlan,'semantic decisions source binding differs');
  const drawing=await json(path.join(runtimeRoot,'presentation/drawing-evidence.json'));
  const projection=await json(path.join(runtimeRoot,'presentation/background/projection.json'));
  const meaning=await json(path.join(runtimeRoot,'caption-attempt-003/meaning-input.json'));
  const source=buildReadabilitySourceAtomsV001({finalPlan:old,meaning,projection,
    baseTimeline:JSON.parse(drawing.source.timelineBytes),sourcePlanBytes:drawing.source.planBytes,baseTimelineBytes:drawing.source.timelineBytes});
  await save(path.join(output,'source-atoms.json'),source);
  // This explicit derived common-core input is local and pre-adoption. It does
  // not replace the old saved plan or carry its materialized overlay hashes.
  const effects=new Map(old.elements.map(e=>[e.instructionId,e]));
  plan.schemaVersion='presentation-output-common-core-plan-v001';
  for(const e of plan.elements) for(const k of ['overlaySha256','presentationColorRange','presentationPreset','presentationPulse','presentationMotion']) delete e[k];
  const requests=[], captions=[];
  for(const [index,e] of plan.elements.entries()) {
    const oldElement=effects.get(e.instructionId), kind=readabilityEffectV001(makeReadabilityPreviewPlanV001({...old,elements:[oldElement]}).elements[0]);
    const decision=semantics.rows.find(r=>r.captionId===e.instructionId);
    const sourceRow=source.captions[index];assert.equal(sourceRow.captionId,e.instructionId);
    const atoms=sourceRow.atoms.map(a=>({atomId:a.atomId,text:a.text,startFrame:a.startFrame,endFrameExclusive:a.endFrameExclusive,
      sourceStartMs:a.sourceSpans[0].sourceStartMs,sourceEndMs:a.sourceSpans.at(-1).sourceEndMs,timelineSegmentId:a.sourceSpans[0].timelineSegmentId}));
    Object.assign(e,{sourceStartMs:atoms[0].sourceStartMs,sourceEndMs:atoms.at(-1).sourceEndMs,timelineSegmentId:atoms[0].timelineSegmentId});
    const parts=decision?.parts??[e.text];assert.equal(parts.join(''),e.text,e.instructionId);
    let cursor=0;
    const boundaries=parts.slice(0,-1).map(part=>{
      cursor+=[...part].length;
      const count=atoms.findIndex((_,i)=>atoms.slice(0,i).map(a=>a.text).join('')===[...e.text].slice(0,cursor).join(''));
      assert(count>0,e.instructionId+' missing atom boundary');
      return {atomEndIndexExclusive:count,frame:atoms[count].startFrame,kind:'semantic',reason:decision.reason,
        required:decision.required===true};
    });
    const points=[0,...boundaries.map(b=>b.atomEndIndexExclusive),atoms.length],measurements=[];
    const requestLine=(start,end,lines,suffix)=>{
      const text=atoms.slice(start,end).map(a=>a.text).join('');
      const indexed=indexExplicitLinesV001(lines);assert.equal(indexed.status,'passed');
      const item=structuredClone(e);item.text=lines.join('');item.indexedLines=indexed.indexedLines;
      if(kind==='bounce')item.visualState.textStyle.fontSizePx=168;
      if(kind==='pulse')item.visualState.textStyle.fontSizePx=192;
      const key=e.instructionId+':'+start+':'+end+':'+suffix;
      requests.push({key,props:propsFor(item,plan,registry),lateralTravelPx:kind==='shake'?18:0});return key;
    };
    for(let a=0;a<points.length;a++)for(let b=a+1;b<points.length;b++) {
      const start=points[a],end=points[b],text=atoms.slice(start,end).map(v=>v.text).join('');
      const measurement={startAtomIndex:start,endAtomIndexExclusive:end,singleLineWidthPx:null,twoLine:null};
      const single=requestLine(start,end,[text],'single');
      const exception=semantics.twoLineExceptions?.find(x=>x.captionId===e.instructionId&&x.lines.join('')===text);
      let two=null;
      if(exception) {
        two=exception.lines.map((line,n)=>requestLine(start,end,[line],`two-${n}`));
        // Separate line measurements retain the same glyph/font/frame inputs;
        // the completed two-line raster is checked in the next phase.
        measurement.twoLine={lines:exception.lines,widthsPx:[null,null],reason:exception.reason};
      }
      measurements.push({measurement,single,two});
    }
    captions.push({captionId:e.instructionId,measurementContextSha256:captionReadabilityMeasurementContextSha256V001(plan,e.instructionId),
      atoms,boundaries,measurements,effect:kind==='color'?{kind,range:{startCodePoint:oldElement.presentationColorRange.startCodePoint,
        endCodePointExclusive:oldElement.presentationColorRange.endCodePointExclusive}}:{kind}});
  }
  const widths=await measureWidths(requests,output);
  for(const caption of captions)caption.measurements=caption.measurements.map(({measurement,single,two})=>{
    measurement.singleLineWidthPx=widths.get(single).fullWidthPx;
    if(two)measurement.twoLine.widthsPx=two.map(k=>widths.get(k).fullWidthPx);
    return measurement;
  });
  const evidence={schemaVersion:'caption-readability-evidence-v001',sourcePlanSha256:captionReadabilityPlanSha256V001(plan),
    clockId:projection.projectionSha256,maxWidthPx:1912,captions};
  await save(path.join(output,'candidate-profile.json'),READABILITY_PREVIEW_V001);
  await save(path.join(output,'unsplit-core-plan.json'),plan);
  await save(path.join(output,'readability-evidence.json'),evidence);
  const rejected=[];
  for(const [i,e] of plan.elements.entries()) {
    const subset={...plan,elements:[e]};
    try{buildCaptionReadabilityPlanV001({normalPlan:subset,evidence:{...evidence,sourcePlanSha256:captionReadabilityPlanSha256V001(subset),captions:[captions[i]]}});}
    catch(error){rejected.push({captionId:e.instructionId,text:e.text,error:error.message});}
  }
  if(rejected.length){await save(path.join(output,'partition-rejections.json'),rejected);throw Error(JSON.stringify(rejected));}
  const result=buildCaptionReadabilityPlanV001({normalPlan:plan,evidence});
  await save(path.join(output,'readability-resolution.json'),result);
  assert.deepEqual(restoreCaptionReadabilityPlanV001({normalPlan:plan,evidence,saved:JSON.parse(JSON.stringify(result))}),result);
  const resolved=applySavedEffects(old,result);
  const finalRequests=[];
  for(const e of resolved.elements) {
    const states=e.presentationMotion?buildPresentationCaptionMotionStateElementsV001({element:e,canvas:resolved.canvas}):[{state:'stable',element:e}];
    for(const s of states)finalRequests.push({key:e.instructionId+':'+s.state,props:propsFor(s.element,resolved,registry),lateralTravelPx:0});
  }
  const fullPath=path.join(output,'resolved-layout');await mkdir(fullPath);
  const finalWidths=await measureWidths(finalRequests,fullPath);
  const overflow=[...finalWidths.values()].filter(r=>r.wrapper.left<4||r.wrapper.left+r.wrapper.width>1916||r.wrapper.top<40||r.wrapper.top+r.wrapper.height>1040);
  await save(path.join(output,'resolved-layout-summary.json'),{status:overflow.length?'failed':'passed',states:finalWidths.size,overflow});
  assert.equal(overflow.length,0,JSON.stringify(overflow));
  for(const e of resolved.elements.filter(e=>e.presentationMotion)) {
    const states=buildPresentationCaptionMotionStateElementsV001({element:e,canvas:resolved.canvas});
    assertPresentationCaptionMotionLayoutsV001({element:e,canvas:resolved.canvas,
      layoutItems:states.map(s=>finalWidths.get(e.instructionId+':'+s.state))});
  }
  await save(path.join(output,'candidate-render-plan.json'),resolved);
  await save(path.join(output,'prepared.json'),{profile:READABILITY_PREVIEW_V001,sourcePlan:await bound(sourcePlanPath),
    semantics:await bound(semanticsPath),summary:result.summary,clockId:projection.projectionSha256,
    status:'layout-preflight-passed-raster-and-human-not-yet-checked'});
  console.log(JSON.stringify(result.summary));
}
const representativeIds=['000053','000026','000089','000260','000137','000135','000095','000263','000092','000117','000139','000071','000119','000266','000278','000312','000318','000304'];
async function draw(output) {
  const {plan,resolution}=await readVerifiedPreview(output);
  const registry=await json(path.join(root,'evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json'));
  const selected=new Set(resolution.captionMappings.filter(m=>representativeIds.some(id=>m.parentCaptionId.endsWith(id))).flatMap(m=>m.children.map(c=>c.captionId)));
  const drawingPath=path.join(output,'raster');await mkdir(drawingPath);
  const observer=createPresentationRendererProcessObserverV001({observationDirectory:path.join(drawingPath,'processes')});
  const job=createPresentationRendererOverlayJobV001({remotionPath:path.join(root,'runner/node_modules/@remotion/cli/remotion-cli.js'),
    chromiumPath:path.join(root,'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell'),processObserver:observer});
  const records=[],checks=[];
  const raster=async(element,label)=>{
    const props=job.buildProps(element,plan,registry),pngPath=path.join(drawingPath,label+'.png');
    const result=await job.renderStill(props,pngPath);
    const inspection=await inspectOverlayPngWithToolV001({instructionId:element.instructionId,pngPath,imageMagickPath:magick});
    const b=inspection.alphaBounds,safe=plan.canvas.safeAreaPx;
    assert(b&&b.left>=safe.left&&b.right<=1920-safe.right&&b.top>=safe.top&&b.bottom<=1080-safe.bottom,JSON.stringify({label,inspection}));
    checks.push({label,captionId:element.instructionId,alphaBounds:b,sha256:result.sha256,props});
    return {element,pngPath,inspection,sha256:result.sha256};
  };
  try {
    for(const [i,e] of plan.elements.filter(e=>selected.has(e.instructionId)).entries()) {
      if(e.presentationMotion) {
        const states=[];
        for(const s of buildPresentationCaptionMotionStateElementsV001({element:e,canvas:plan.canvas}))states.push({state:s.state,...await raster(s.element,`${i}-${s.state}`)});
        records.push({element:e,pngPath:states[0].pngPath,motionStates:states});
      }else records.push(await raster(e,String(i)));
    }
    // The saved Digest has no Pulse. Exercise its finite 144px states with an
    // explicitly synthetic timing fixture; never report a measured audio peak.
    const pulse=structuredClone(plan.elements.find(e=>e.instructionId.endsWith('000053')));
    pulse.instructionId='7a-synthetic-pulse';pulse.startFrame=0;pulse.endFrameExclusive=90;pulse.displayFrameCount=90;
    pulse.presentationPulse={presentation:'provisional-pulse',presetVersion:'presentation-pulse-readability-v001',anchorPeakId:'synthetic',anchorFrame:30};
    for(const s of buildPresentationPulseStateElementsV001({element:pulse,canvas:plan.canvas}))await raster(s.element,`synthetic-pulse-${s.state}`);
    const color=structuredClone(plan.elements.find(e=>e.instructionId.endsWith('000137')));
    assert(color?.presentationColorRange);color.presentationColorRange.fontColor='#87CEFA';
    const cyan=await raster(color,'comparison-only-cyan');
    const yellow=records.find(r=>r.element.instructionId===color.instructionId);
    assert(yellow);
    const [a,b]=await Promise.all([yellow.pngPath,cyan.pngPath].map(p=>run(magick,[p,'-depth','8','rgba:-'])));
    assert.equal(a.length,b.length);let changed=0;
    for(let i=0;i<a.length;i+=4){assert.equal(a[i+3],b[i+3]);if(!a.subarray(i,i+4).equals(b.subarray(i,i+4)))changed++;}
    assert(changed>0);checks.push({kind:'comparison-only-cyan',changedPixels:changed,alphaIdentical:true,officialPaletteChanged:false});
    const repeated=await job.renderStill(job.buildProps(records[0].element,plan,registry),path.join(drawingPath,'independent-repeat.png'),{series:'repeat'});
    assert.equal(repeated.sha256,records[0].sha256);
  } finally {await job.close();}
  await save(path.join(output,'raster-records.json'),records);
  await save(path.join(output,'raster-verification.json'),{status:'passed',checks,
    representatives:representativeIds,sourceAccess:'read-only; this raster check does not assert media immutability',
    repeatScope:'same-overlay-job',humanAdoption:false});
  console.log(JSON.stringify({rasterChecks:checks.length,representatives:representativeIds.length,status:'passed'}));
}
async function packageReview(output) {
  const {old,plan,resolution,records}=await readVerifiedRasters(output);
  const retained=path.join(root,'evals/clip_composition/outputs/presentation/.new-material-digest-20260926-first-draft-v001.presentation-renderer-v002-work-JdfNbP/scratch/native-qc-preparation/preparation.json');
  const previous=await json(retained);
  const dir=path.join(output,'review-v002');await mkdir(dir);
  const pairs=[],segments=[];
  for(const [i,suffix] of ['000260','000137','000095'].entries()) {
    const parent=old.elements.find(e=>e.instructionId.endsWith(suffix));assert(parent);
    const start=parent.startFrame,end=parent.endFrameExclusive,count=end-start;
    const base=path.join(dir,`${i}-background.nut`),audio=path.join(dir,`${i}-shared-audio.m4a`);
    const integerSeconds=Math.floor(start/30),remaining=start-integerSeconds*30;
    const baseArgs=['-hide_banner','-v','error','-nostdin','-n','-ss',String(integerSeconds),'-i',path.join(runtimeRoot,'presentation/background/background.nut'),
      '-vf',`trim=start_frame=${remaining}:end_frame=${remaining+count},setpts=N/(30*TB)`,
      '-an','-c:v','ffv1','-level','3','-pix_fmt','yuv420p',base];
    const audioArgs=['-hide_banner','-v','error','-nostdin','-n','-i',path.join(runtimeRoot,'presentation/background/audio.m4a'),
      '-vn','-af',`atrim=start_sample=${start*1470}:end_sample=${end*1470},asetpts=N/SR/TB`,'-c:a','aac',audio];
    await save(path.join(dir,`${i}-preparation-command.json`),{baseArgs,audioArgs});
    await run(ffmpeg,baseArgs);await run(ffmpeg,audioArgs);
    const selected=resolution.captionMappings.find(m=>m.parentCaptionId===parent.instructionId).children.map(c=>c.captionId);
    const candidates=records.filter(r=>selected.includes(r.element.instructionId));assert.equal(candidates.length,selected.length);
    const original=previous.records.filter(r=>r.element.instructionId===parent.instructionId);assert.equal(original.length,1);
    const sides=[];
    for(const [name,inputPlan,inputRecords] of [['current',old,original],['candidate',plan,candidates]]) {
      const media=path.join(dir,`${i}-${name}.mp4`);
      await composePresentationMediaV001({baseMediaPath:base,audioMediaPath:audio,plan:{...inputPlan,elements:inputRecords.map(r=>r.element)},
        overlayRecords:inputRecords,expectedFrameCount:count,outputPath:media,ffmpegPath:ffmpeg,serializePngAndFilters:true,
        renderRange:{startFrame:start,endFrameExclusive:end,fullFrameCount:27949}});
      const inspected=await inspectRenderedMediaWithToolsV001(media,{ffmpegPath:ffmpeg,ffprobePath:ffprobe,imageMagickPath:magick});
      assert.equal(inspected.video.frameCount,count);assert.equal(inspected.video.fps,30);
      const audioHash=(await run(ffmpeg,['-v','error','-i',media,'-map','0:a:0','-c','copy','-f','framehash','-hash','sha256','-'])).toString();
      const label=name==='current'?`例${i+1} 現行`:`例${i+1} 新候補`;
      const labeled=path.join(dir,`${i}-${name}-labeled.mp4`);
      const labelPng=path.join(dir,`${i}-${name}-label.png`);
      // Installed ffmpeg has no drawtext filter. Use the already available
      // ImageMagick and permitted font for this comparison label only.
      await run(magick,['-background','#000000A6','-fill','white','-font',path.join(root,'runner/public/font/LINESeedJP_A_OTF_Eb.otf'),
        '-pointsize','40',`label:${label}`,'-bordercolor','#000000A6','-border','12x8',labelPng]);
      await run(ffmpeg,['-hide_banner','-v','error','-nostdin','-n','-i',media,'-loop','1','-i',labelPng,
        '-filter_complex','[0:v][1:v]overlay=24:24,format=yuv420p[v]','-map','[v]','-map','0:a:0','-frames:v',String(count),
        '-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart',labeled]);
      sides.push({name,media:await bound(media),labeled:await bound(labeled),frameCount:count,audioHash,inspected});segments.push(labeled);
    }
    assert.equal(sides[0].audioHash,sides[1].audioHash,'paired audio packet/time mismatch');
    pairs.push({suffix,parentCaptionId:parent.instructionId,startFrame:start,endFrameExclusive:end,displaySeconds:count/30,
      children:resolution.captionMappings.find(m=>m.parentCaptionId===parent.instructionId).children,
      base:await bound(base),audio:await bound(audio),audioIdentical:true,sides});
  }
  const concat=path.join(dir,'concat.txt');
  await writeFile(concat,segments.map(p=>`file '${p}'`).join('\n')+'\n',{flag:'wx'});
  const video=path.join(dir,'7A-current-then-candidate.mp4');
  await run(ffmpeg,['-hide_banner','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',concat,
    '-c','copy','-movflags','+faststart',video]);
  const media=await inspectRenderedMediaWithToolsV001(video,{ffmpegPath:ffmpeg,ffprobePath:ffprobe,imageMagickPath:magick});
  const frames=pairs.reduce((sum,p)=>sum+2*(p.endFrameExclusive-p.startFrame),0);
  assert.equal(media.video.frameCount,frames);assert(frames/30<=30);
  await save(path.join(output,'human-package.json'),{schemaVersion:'caption-readability-human-package-v001',
    status:'technical-preview-ready-human-approval-pending',humanApproval:false,video:await bound(video),media,
    totalFrames:frames,totalVideoSeconds:frames/30,pairs,
    questions:['文字サイズ・分割はこの方向でよいか','縁取りは現行よりよいか'],
    note:'Three short saved-source examples, current then candidate. Same base and shared audio per pair. Labels belong only to the comparison. No full-Digest redraw or formal activation.'});
  console.log(JSON.stringify({video,seconds:frames/30,frames,status:'human-review-pending'}));
}
async function finalizePackage(output) {
  const state=await readVerifiedRasters(output);
  const previous=await json(path.join(output,'human-package.json'));
  await verifyPackageFiles(previous,state);
  const dir=path.dirname(previous.video.path),sides=previous.pairs.flatMap(p=>p.sides);
  const args=['-hide_banner','-v','error','-nostdin','-n'];
  for(const side of sides){assert.deepEqual(await bound(side.labeled.path),side.labeled);args.push('-i',side.labeled.path);}
  const graph=sides.flatMap((s,i)=>[
    `[${i}:v]trim=end_frame=${s.frameCount},settb=1/30,setpts=N[v${i}]`,
    `[${i}:a]atrim=end_sample=${s.frameCount*1470},asetpts=N/SR/TB[a${i}]`]);
  graph.push(sides.map((_,i)=>`[v${i}][a${i}]`).join('')+`concat=n=${sides.length}:v=1:a=1[v][a]`);
  const video=path.join(dir,'7A-current-then-candidate-cfr.mp4');
  args.push('-filter_complex',graph.join(';'),'-map','[v]','-map','[a]','-r','30','-c:v','libx264','-preset','fast','-crf','20',
    '-pix_fmt','yuv420p','-c:a','aac','-movie_timescale','30','-video_track_timescale','30','-movflags','+faststart',video);
  await save(path.join(dir,'final-package-command.json'),{command:ffmpeg,args,
    reason:'Normalize the short comparison edits to exact CFR; packet-copy concatenation carried AAC-container boundary offsets. The full Digest is untouched.'});
  await run(ffmpeg,args);
  const media=await inspectRenderedMediaWithToolsV001(video,{ffmpegPath:ffmpeg,ffprobePath:ffprobe,imageMagickPath:magick});
  assert.equal(media.video.frameCount,previous.totalFrames);assert.equal(media.video.fps,30);
  const observed=JSON.parse((await run(ffprobe,['-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp','-of','json',video])).toString());
  assert.equal(observed.frames.length,previous.totalFrames);observed.frames.forEach((f,i)=>assert.equal(Number(f.best_effort_timestamp),i));
  await save(path.join(output,'human-package-final.json'),{...previous,video:await bound(video),media,
    exactCfrPts:true,videoTimeBase:'1/30',previousAssembly:previous.video,
    comparisonAssembly:'Labels and stitching are comparison-only. Each pair uses identical shared audio before this final continuous AAC encoding; no original source audio is edited.'});
  console.log(JSON.stringify({video,seconds:previous.totalVideoSeconds,frames:previous.totalFrames,status:'exact-CFR-human-review-pending'}));
}
async function serveReview(output) {
  const state=await readVerifiedRasters(output);
  const saved=await json(path.join(output,'human-package-final.json'));
  await verifyPackageFiles(saved,state);
  const entry=path.join(root,'docs/reports/caption-readability-splitting-20260928/review.html');
  // Reuse the existing range-capable handler and expose only two explicit
  // artifacts. This is a local review entry, not a product UI or adoption API.
  const script=`import sys,json\nfrom pathlib import Path\nfrom functools import partial\nfrom http.server import ThreadingHTTPServer\nfrom urllib.parse import urlsplit\nsys.dont_write_bytecode=True\nsys.path.insert(0,sys.argv[1])\nimport serve_digest_review_v001 as review\nentry,video=Path(sys.argv[2]),Path(sys.argv[3])\nreview.FILES={entry.name,video.name}\nclass Handler(review.ReviewHandler):\n def send_head(self):\n  target={'/':entry,'/review.html':entry,'/comparison.mp4':video}.get(urlsplit(self.path).path)\n  if target is None:\n   self.send_error(404)\n   return None\n  self.directory,self.path=str(target.parent),'/'+target.name\n  return super().send_head()\nserver=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(entry.parent)))\nprint(json.dumps({'origin':f'http://127.0.0.1:{server.server_port}/','videoShaChecked':True}),flush=True)\nserver.serve_forever()\n`;
  const child=spawn('python3',['-u','-c',script,path.join(root,'evals/clip_composition'),entry,saved.video.path],{stdio:'inherit'});
  await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error('review server exited '+code)));});
}
async function inspect(output) {
  await mkdir(output, {recursive: false});
  const old = await json(path.join(originalRoot, 'presentation-render-plan-v002.json'));
  const registry = await json(path.join(root, 'evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json'));
  const plan = makeReadabilityPreviewPlanV001(old);
  const sourceAtoms = await json(path.join(runtimeRoot, 'caption-attempt-003/meaning-input.json'));
  assert.equal(plan.elements.length, 326);
  await save(path.join(output, 'candidate-profile.json'), READABILITY_PREVIEW_V001);
  await save(path.join(output, 'candidate-unsplit-plan.json'), plan);
  const req = createRequire(path.join(root, 'runner/package.json'));
  const remotion = createRequire(req.resolve('@remotion/cli/package.json'));
  const {openBrowser} = remotion('@remotion/renderer');
  const {build} = createRequire(req.resolve('tsx/package.json'))('esbuild');
  const chrome = path.join(root, 'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell');
  const fontPath = path.join(root, 'runner/public/font/LINESeedJP_A_OTF_Eb.otf');
  const bundle = await build({stdin: {contents: `export {buildExactTextModel} from './evals/clip_composition/presentation_renderer_entry_v001.tsx';`, resolveDir: root, loader: 'ts'},
    bundle: true, write: false, platform: 'browser', format: 'iife', globalName: 'ReadabilityMetrics',
    nodePaths: [path.join(root, 'runner/node_modules')], define: {'process.env.NODE_ENV': '"production"'}, metafile: true, logLevel: 'silent'});
  const sourceBindings = await Promise.all(Object.keys(bundle.metafile.inputs).filter(p => p !== '<stdin>').map(p => bound(path.resolve(root, p))));
  const browser = await openBrowser('chrome', {browserExecutable: chrome, forceDeviceScaleFactor: 1, logLevel: 'error'});
  let rows;
  try {
    const page = await browser.newPage({context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {}});
    await page.setViewport({width: 1920, height: 1080, deviceScaleFactor: 1});
    await page.goto({url: 'about:blank', timeout: 30000});
    await page.evaluate(bundle.outputFiles[0].text);
    const fontUrl = 'data:font/otf;base64,' + (await readFile(fontPath)).toString('base64');
    await page.evaluate(`(async()=>{const f=await new FontFace('zev-renderer-line-seed-jp-extra-bold-v001', 'url('+${JSON.stringify(fontUrl)}+')',{weight:'800'}).load();document.fonts.add(f);await document.fonts.ready;if(!document.fonts.has(f))throw Error('font not active')})()`);
    const requests = plan.elements.map(e => ({props: propsFor(e, plan, registry), kind: readabilityEffectV001(e)}));
    rows = await page.evaluate(`(() => {
      const requests=${JSON.stringify(requests)};
      const ctx=document.createElement('canvas').getContext('2d');
      return requests.map(({props,kind})=>{
        const size=props.visualState.textStyle.fontSizePx;
        ctx.font='800 '+size+'px "'+props.fontFamilyName+'"';
        const text=props.indexedLines.map(l=>l.text).join('');
        const m=ctx.measureText(text);
        const originalLines=props.indexedLines.map(l=>({text:l.text,width:ctx.measureText(l.text).width}));
        const exact=ReadabilityMetrics.buildExactTextModel(props);
        const worstSize=kind==='bounce'?168:kind==='pulse'?192:size;
        const copy=structuredClone(props); copy.visualState.textStyle.fontSizePx=worstSize;
        const largest=ReadabilityMetrics.buildExactTextModel(copy);
        const lateral=kind==='shake'?18:0;
        return {captionId:props.instructionId,kind,text,fontSizePx:size,actualAdvanceWidthPx:m.width,
          actualInkWidthPx:m.actualBoundingBoxLeft+m.actualBoundingBoxRight,originalLines,
          currentLineWrapper:exact.wrapper,largestFiniteStateWrapper:largest.wrapper,
          oneLineFits:m.width+2*(props.visualState.textStyle.borderWidthPx+props.visualState.textStyle.glowWidthPx)+2*Math.max(2,Math.ceil(size*props.layoutRules.textSafePaddingRatio))+(props.visualState.background?.paddingXPx??0)*2+2*lateral<=1912,
          finiteStoredLinesFit:largest.wrapper.width+2*lateral<=1912,
          candidateWordBoundaries:Array.from(new Intl.Segmenter('ja',{granularity:'word'}).segment(text)).map(w=>({text:w.segment,index:w.index,isWordLike:w.isWordLike}))};
      });
    })()`);
  } finally {await browser.close({silent: true});}
  const result = {schemaVersion: 'caption-readability-all-layout-preflight-v001', status: 'measured-before-splitting',
    profile: READABILITY_PREVIEW_V001, source: await bound(path.join(originalRoot,'presentation-render-plan-v002.json')),
    font: await bound(fontPath), browser: await bound(chrome), codeBindings: sourceBindings,
    sourceAtoms: sourceAtoms.atomOccurrences.length, captions: rows.length,
    actualMetrics: 'loaded trusted font in installed Chromium; ink/advance measurements, not rendered alpha bounds',
    currentGeometry: 'existing renderer still uses max(actual font width, logical estimate); it is not silently replaced',
    oneLineOverflow: rows.filter(r=>!r.oneLineFits).length,
    protectedEffectOverflow: rows.filter(r=>!r.finiteStoredLinesFit&&!['normal','color'].includes(r.kind)), rows};
  await save(path.join(output, 'all-layout-preflight.json'), result);
  console.log(JSON.stringify({captions: result.captions, oneLineOverflow:result.oneLineOverflow, protectedEffectOverflow:result.protectedEffectOverflow}));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, output] = process.argv.slice(2);
  assert(path.isAbsolute(output) && output.startsWith(path.join(root,'runtime/artifacts')+path.sep));
  if (command === 'inspect') await inspect(output);
  else if (command === 'prepare') await prepare(output);
  else if (command === 'draw') await draw(output);
  else if (command === 'package') await packageReview(output);
  else if (command === 'finalize') await finalizePackage(output);
  else if (command === 'serve') await serveReview(output);
  else if (command === 'verify') console.log(JSON.stringify((await readVerifiedRasters(output)).checked));
  else if (command === 'verify-package') {
    const state=await readVerifiedRasters(output);
    await verifyPackageFiles(await json(path.join(output,'human-package-final.json')),state);
    console.log(JSON.stringify({...state.checked,packageFiles:'verified',mediaRedrawn:false}));
  }
  else throw Error('inspect <unused absolute runtime/artifacts directory>');
}
