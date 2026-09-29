/** Diagnostic only: expand the raster viewport, preserving every logical prop.
 * This does not waive the failed logical-layout inspection or change a candidate. */
import assert from 'node:assert/strict';
import {readFile,mkdir,mkdtemp,rm,realpath} from 'node:fs/promises';
import {createRequire} from 'node:module';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import path from 'node:path';import {fileURLToPath} from 'node:url';
import {bindDigestStructureFileV001 as bind,verifyDigestStructureFileV001 as verify,saveDigestStructureFileV001 as save} from './digest-structure-evidence.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),j=async p=>JSON.parse(await readFile(p)),run=promisify(execFile);
const [inputPath,destination]=process.argv.slice(2);assert(inputPath&&destination);const out=path.resolve(destination);assert(out.startsWith(root+'/runtime/artifacts/integrated-preview-20260930-v001/'));await mkdir(out);
const ref=await bind(path.resolve(inputPath)),r=await j(ref.path),job=await j(root+'/runtime/artifacts/caption-palette-20260929-v001/job.json'),t=job.tools;
assert.equal(r.variant,'B');assert.equal(r.rows.length,307);assert.equal(r.violations.length,21);assert(r.violations.every(v=>v.stage==='logical-layout'));
const req=createRequire(createRequire(t.remotionPath).resolve('@remotion/cli')),{bundle}=req('@remotion/bundler'),{openBrowser,selectComposition,renderStill}=req('@remotion/renderer');
const temp=await mkdtemp('/private/tmp/zev-outline-diagnostic-');let browser;
try {
 const url=await bundle({entryPoint:root+'/evals/clip_composition/presentation_renderer_entry_v001.tsx',rootDir:root,publicDir:root+'/runner/public',outDir:temp+'/bundle',enableCaching:true,symlinkPublicDir:true,webpackOverride:c=>c});
 browser=await openBrowser('chrome',{browserExecutable:t.chromiumPath,chromeMode:'headless-shell',forceDeviceScaleFactor:0.5,logLevel:'error'});
 const results=[];
 for(const violation of r.violations){const row=r.rows.find(x=>x.captionId===violation.instructionId);assert(row);await verify(row.png);
  const composition=await selectComposition({serveUrl:url,id:'PresentationOverlayV001',inputProps:row.props,puppeteerInstance:browser,browserExecutable:t.chromiumPath,logLevel:'error'});
  assert.equal(composition.width,1920);assert.equal(composition.height,1080);
  // Cover the entire reported wrapper plus the existing right safe margin.
  const width=Math.ceil((violation.details.bounds.right+row.props.canvas.safeAreaPx.right)/2)*2;assert(width>1920);
  const output=out+'/'+results.length+'.png';await renderStill({composition:{...composition,width},serveUrl:url,inputProps:row.props,puppeteerInstance:browser,browserExecutable:t.chromiumPath,output,overwrite:false,imageFormat:'png',scale:0.5,frame:0,logLevel:'error'});
  const raw=async args=>(await run(t.imageMagickPath,args,{encoding:'buffer',maxBuffer:8*1024*1024})).stdout;
  const original=await raw([row.png.path,'-depth','8','rgba:-']);
  const inner=await raw([output,'-crop','960x540+0+0','+repage','-depth','8','rgba:-']);assert(original.equals(inner),'viewport expansion changed existing pixels');
  const extra=await raw([output,'-crop',`${width/2-960}x540+960+0`,'+repage','-alpha','extract','-depth','8','gray:-']);
  const extraAlphaPixels=extra.reduce((n,x)=>n+(x!==0),0);assert.equal(extraAlphaPixels,0,'ink was clipped at the original right canvas edge');
  results.push({captionId:row.captionId,state:row.state,source:row.png,expanded:await bind(output),logicalPropsUnchanged:true,expandedCompositionWidth:width,originalRgbaBytes:original.length,originalRgbaExact:true,extraAlphaPixels,logicalViolation:violation});
 }
 await verify(ref);const implementation=await Promise.all([fileURLToPath(import.meta.url),root+'/evals/clip_composition/presentation_renderer_entry_v001.tsx',root+'/runner/src/telop/text-metrics.ts',root+'/runner/src/remotion/components/TelopText.tsx',t.chromiumPath,t.imageMagickPath].map(async p=>bind(await realpath(p))));
 console.log(JSON.stringify(await save(out+'/completion.json',{status:'diagnosis-complete-logical-failure-preserved',rasterRef:ref,results,implementation,candidateStatus:'failed',notAQualityApproval:true}),null,2));
}finally{await browser?.close({silent:true});await rm(temp,{recursive:true,force:true});}
