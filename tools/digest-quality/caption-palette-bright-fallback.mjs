/** Recheck the already generated brightest caption. Keep the failed three-color
 * attempt intact; adopt only the explicitly authorized two-color fallback. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bindDigestStructureFileV001 as bind,verifyDigestStructureFileV001 as verify} from './digest-structure-evidence.mjs';
import {paletteProbePropsV001,inspectPaletteRgbaV001,assertPaletteRgbaV001} from './caption-palette-pixel-probe.mjs';
import {CAPTION_PALETTE_V001} from './caption-palette-policy.mjs';
import {canonicalJson} from './clock.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const base=path.join(root,'runtime/artifacts/caption-palette-20260929-v001');
const output=path.join(base,'bright-fallback-v001');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const began=performance.now(),startedAt=new Date().toISOString();
await mkdir(output);
const failureRef=await bind(path.join(base,'bright-background-v001/failure.json'));
const failure=await json(failureRef.path);
assert.equal(failure.status,'failed');assert.equal(failure.samples.length,18);
const probeRef=await bind(path.join(base,'pixel-probe-v003/summary.json')),probe=await json(probeRef.path);
assert.equal(probe.status,'passed');
for(const ref of [...failure.refs,...probe.inputs,...probe.sourceBindings])await verify(ref);
const completionRef=failure.refs[0],completion=await json(completionRef.path),tools=completion.tools;
const selected=failure.samples.reduce((best,s)=>s.visibleSubtitleY.mean>best.visibleSubtitleY.mean?s:best);
const record=completion.stateRecords.find(r=>r.captionId===selected.captionId);assert(record);
const rgba=p=>execFileSync(tools.imageMagickPath,[p,'-depth','8','rgba:-'],{maxBuffer:8*1024*1024});
const yellow=rgba(path.join(base,'bright-background-v001/yellow-overlay.png'));
const coralPath=path.join(base,'bright-background-v001/light-coral-overlay.png'),coral=rgba(coralPath);
const alphaDifferences=[];for(let i=3;i<yellow.length;i+=4)if(yellow[i]!==coral[i])alphaDifferences.push({x:((i-3)/4)%960,y:Math.floor((i-3)/4/960),yellow:yellow[i],coral:coral[i]});
assert(alphaDifferences.length>0,'fallback requires a real technical failure');
assert(yellow.equals(rgba(record.png.path)));
// Reuse the already built independent DOM observer, after verifying every source
// in its saved build manifest. It draws the unchanged production component.
const bundleRef=await bind(path.join(base,'pixel-probe-v003/diagnostic-browser.js'));
const bundle=await readFile(bundleRef.path,'utf8');
const req=createRequire(path.join(root,'runner/package.json'));
const remotion=createRequire(req.resolve('@remotion/cli/package.json'));
const {openBrowser}=remotion('@remotion/renderer');
const {screenshot}=remotion(path.join(path.dirname(remotion.resolve('@remotion/renderer')),'puppeteer-screenshot.js'));
const font=await readFile(path.join(root,'runner/public/font/LINESeedJP_A_OTF_Eb.otf'));
const server=createServer((request,response)=>{if(request.url==='/font/LINESeedJP_A_OTF_Eb.otf'){response.writeHead(200,{'Content-Type':'font/otf'});response.end(font);}else{response.writeHead(200,{'Content-Type':'text/html'});response.end('<!doctype html><html><body></body></html>');}});
let browser;const palettes=[],diagnostics=[];
const geometry=m=>({...m,exact:{...m.exact,textModel:{...m.exact.textModel,lines:m.exact.textModel.lines.map(({colorRuns,...line})=>line)}}});
try {
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 browser=await openBrowser('chrome',{browserExecutable:tools.chromiumPath,forceDeviceScaleFactor:0.5,logLevel:'error'});
 const page=await browser.newPage({context:()=>null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:null,onLog:()=>{}});
 await page.setViewport({width:1920,height:1080,deviceScaleFactor:0.5});
 await page.goto({url:`http://127.0.0.1:${server.address().port}`,timeout:30000});await page.evaluate(bundle);
 const shot=async name=>{const p=path.join(output,name+'.png'),bytes=await screenshot({page,type:'png',omitBackground:true,width:1920,height:1080,scale:0.5});await writeFile(p,bytes,{flag:'wx'});diagnostics.push(await bind(p));return rgba(p);};
 await page.evaluate(`PaletteProbe.draw(${JSON.stringify(record.props)})`);
 const selection=await page.evaluate(`PaletteProbe.mask(${JSON.stringify(record.props)})`),mask=await shot('selected-mask');
 let baseline,baselineGeometry;
 for(const palette of CAPTION_PALETTE_V001.colors){
  const props=paletteProbePropsV001(record.props,palette.paletteId),name=palette.paletteId;
  const measurement=await page.evaluate(`PaletteProbe.draw(${JSON.stringify(props)})`),full=await shot(name+'-full');
  const generated=failure.paletteRows.find(p=>p.paletteId===name);assert(generated);await verify(generated.overlay);await verify(generated.composite);
  assert(full.equals(rgba(generated.overlay.path)),'independent observer must match actual saved production pixels');
  await page.evaluate('PaletteProbe.fillOnly()');const fill=await shot(name+'-fill');
  await page.evaluate('PaletteProbe.strokeOnly()');const stroke=await shot(name+'-stroke-glow');
  if(!baseline){baseline={full,fill,stroke};baselineGeometry=geometry(measurement);}
  assert.equal(canonicalJson(geometry(measurement)),canonicalJson(baselineGeometry));
  const inspected=inspectPaletteRgbaV001({baseline:baseline.full,colored:full,selectedMask:mask,baselineFill:baseline.fill,coloredFill:fill,
   baselineStroke:baseline.stroke,coloredStroke:stroke,width:960,height:540,safeArea:Object.fromEntries(Object.entries(props.canvas.safeAreaPx).map(([k,v])=>[k,v/2])),expectedColor:palette.fontColor});
  assertPaletteRgbaV001(inspected,{expectChange:name!=='yellow'});
  palettes.push({...generated,...inspected,independentHarnessMatchesProduction:true,lineAndGlyphGeometryUnchanged:true});
 }
 const inputs=[...failure.refs,probeRef,failureRef,bundleRef,await bind(fileURLToPath(import.meta.url)),await bind(path.join(root,'tools/digest-quality/caption-palette-policy.mjs'))];
 for(const ref of inputs)await verify(ref);
 const summary={schemaVersion:'caption-palette-bright-background-v001',status:'passed',startedAt,endedAt:new Date().toISOString(),wallMilliseconds:performance.now()-began,
  inputs,sourceBindings:probe.sourceBindings,sampleCount:18,selectedCaptionId:selected.captionId,selectedFrame:selected.frame,selectedVisibleSubtitleMeanY:selected.visibleSubtitleY.mean,
  selectionRule:'Maximum saved decoded Y mean under caption alpha among the 18 existing Color middle frames; no new background extraction.',
  palettes,diagnostics,selectedText:selection,backgroundRef:selected.backgroundPng,
  excludedCandidate:{paletteId:'light-coral',reason:'full production alpha changed; no tolerance introduced',alphaDifferences,overlay:await bind(coralPath),failureRef},
  humanQuality:'not-evaluated',productionDefaultChanged:false,externalApiCalls:0};
 await writeFile(path.join(output,'summary.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({status:summary.status,palettes:palettes.map(p=>p.paletteId),excludedAlphaPixels:alphaDifferences.length,output}));
} finally {await browser?.close({silent:true});if(server.listening)await new Promise(r=>server.close(r));}
