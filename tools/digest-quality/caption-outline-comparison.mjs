/** Human-requested two-option outline comparison; no production rules change. */
import assert from 'node:assert/strict';
import {createPresentationRendererProcessObserverV001 as observer} from '../../evals/clip_composition/presentation_renderer_process_observation_v001.mjs';
import {mkdir,readFile,writeFile,realpath} from 'node:fs/promises';
import path from 'node:path';import {fileURLToPath} from 'node:url';
import {bindDigestStructureFileV001 as bind,verifyDigestStructureFileV001 as verify,saveDigestStructureFileV001 as save} from './digest-structure-evidence.mjs';
import {createPresentationRendererOverlayJobV001 as overlayJob,composePresentationMediaV001 as compose,runPresentationRendererChildProcessV001 as child} from '../../evals/clip_composition/render_presentation_v002.mjs';
import {inspectOverlayPngWithToolV001 as inspectPng,inspectRenderedMediaWithToolsV001 as inspectMedia} from '../../evals/clip_composition/presentation_renderer_qc_v002.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),source=path.join(root,'runtime/artifacts/caption-readability-20260928-preview-v004');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const variants=[{id:'A',borderWidthPx:8,glowWidthPx:4,label:'A 輪郭を太く・外周は控えめ'}, {id:'B',borderWidthPx:8,glowWidthPx:12,label:'B 輪郭・外周とも元の太さ'}];
const widths=(element,variant)=>{assert(!element.visualState.background);const e=structuredClone(element),s=e.visualState.textStyle;assert(Number.isFinite(s.fontSizePx)&&s.fontSizePx>0);assert.equal(s.borderWidthPx,4);assert.equal(s.glowWidthPx,4);s.borderWidthPx=variant.borderWidthPx;s.glowWidthPx=variant.glowWidthPx;const restored=structuredClone(e);Object.assign(restored.visualState.textStyle,{borderWidthPx:4,glowWidthPx:4});assert.deepEqual(restored,element);return e;};
const tool={ffmpegPath:'/opt/homebrew/bin/ffmpeg',ffprobePath:'/opt/homebrew/bin/ffprobe',imageMagickPath:'/opt/homebrew/bin/magick'};
const run=async(p,args)=>(await child(p,args)).stdout;
async function main(output){
 assert(output.startsWith(path.join(root,'runtime/artifacts/caption-outline-comparison-20260929-v001')+path.sep));await mkdir(output);
 const start=performance.now(),pkg=await json(path.join(source,'human-package-final.json')),plan=await json(path.join(source,'candidate-render-plan.json')),records=await json(path.join(source,'raster-records.json'));
 const registry=await json(path.join(root,'evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json'));
 const inputs=await Promise.all(['human-package-final.json','candidate-render-plan.json','raster-records.json'].map(p=>bind(path.join(source,p))));
 for(const p of pkg.pairs)for(const r of [p.base,p.audio]){const actual=await bind(r.path);assert.equal(actual.fileSha256,r.sha256);assert.equal(actual.bytes,r.bytes);inputs.push(actual);}
 const implementation=await Promise.all([fileURLToPath(import.meta.url),process.execPath,...Object.values(tool)].map(async p=>bind(await realpath(p))));
 const processObserver=observer({observationDirectory:path.join(output,'processes')});
 const job=overlayJob({processObserver,remotionPath:path.join(root,'runner/node_modules/@remotion/cli/remotion-cli.js'),chromiumPath:path.join(root,'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell')});
 const raster=[],movies=[],labeled=[];
 try {for(const [i,pair]of pkg.pairs.entries()){
  const rows=records.filter(r=>pair.children.some(c=>r.element.instructionId===c.captionId));assert.equal(rows.length,pair.children.length);
  for(const variant of variants){
   const tag=`${i}-${variant.id}`,dir=path.join(output,tag);await mkdir(dir);
   async function draw(row,label){const e=widths(row.element,variant),props=job.buildProps(e,plan,registry),pngPath=path.join(dir,label+'.png');await job.renderStill(props,pngPath);
    const observation=await inspectPng({instructionId:e.instructionId,pngPath,imageMagickPath:tool.imageMagickPath});const b=observation.alphaBounds,s=plan.canvas.safeAreaPx;
    assert(b&&b.left>=s.left&&b.right<=1920-s.right&&b.top>=s.top&&b.bottom<=1080-s.bottom,'outline exceeds saved safe area');
    raster.push({tag,label,captionId:e.instructionId,element:e,props,png:await bind(pngPath),observation});return {element:e,pngPath};}
   const overlays=[];
   for(const [j,row]of rows.entries()){
    assert.equal(row.element.visualState.textStyle.fontSizePx,144,'base caption size must remain the accepted candidate size');
    if(row.motionStates){const states=[];for(const [k,s]of row.motionStates.entries())states.push({...await draw(s,`${j}-${k}`),state:s.state});overlays.push({element:widths(row.element,variant),pngPath:states[0].pngPath,motionStates:states});}
    else overlays.push(await draw(row,String(j)));
   }
   const count=pair.endFrameExclusive-pair.startFrame,video=path.join(dir,'video.mp4');
   await compose({baseMediaPath:pair.base.path,audioMediaPath:pair.audio.path,plan:{...plan,elements:overlays.map(r=>r.element)},overlayRecords:overlays,expectedFrameCount:count,outputPath:video,ffmpegPath:tool.ffmpegPath,serializePngAndFilters:true,renderRange:{startFrame:pair.startFrame,endFrameExclusive:pair.endFrameExclusive,fullFrameCount:27949}});
   const media=await inspectMedia(video,tool);assert.equal(media.video.frameCount,count);assert.equal(media.video.fps,30);
   const original=pair.sides.find(s=>s.name==='candidate').inspected;assert.equal(media.audio.packetPayloadSha256,original.audio.packetPayloadSha256);assert.equal(media.audio.durationMs,original.audio.durationMs);
   const label=path.join(dir,'label.png'),result=path.join(dir,'labeled.mp4');
   await run(tool.imageMagickPath,['-background','#000000A6','-fill','white','-font',path.join(root,'runner/public/font/LINESeedJP_A_OTF_Eb.otf'),'-pointsize','40',`label:例${i+1} ${variant.label}`,'-bordercolor','#000000A6','-border','12x8',label]);
   await run(tool.ffmpegPath,['-hide_banner','-v','error','-nostdin','-n','-i',video,'-loop','1','-i',label,'-filter_complex','[0:v][1:v]overlay=24:24,format=yuv420p[v]','-map','[v]','-map','0:a:0','-frames:v',String(count),'-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart',result]);
   labeled.push(result);movies.push({pair:i,variant:variant.id,video:await bind(video),labeled:await bind(result),media,sourceRange:{startFrame:pair.startFrame,endFrameExclusive:pair.endFrameExclusive},captionIds:overlays.map(r=>r.element.instructionId)});
  }
 }}finally{await job.close();}
 const concat=path.join(output,'concat.txt');await writeFile(concat,labeled.map(p=>`file '${p}'`).join('\n')+'\n',{flag:'wx'});
 const video=path.join(output,'A-B-outline-comparison.mp4');
 await run(tool.ffmpegPath,['-hide_banner','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',concat,'-vf','fps=30','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',video]);
 const media=await inspectMedia(video,tool);assert.equal(media.video.frameCount,712);assert.equal(media.video.fps,30);
 for(const ref of inputs)await verify(ref);for(const ref of implementation)await verify(ref);
 const result={status:'comparison-ready-human-choice-pending',variants,inputs,implementation,raster,movies,video:await bind(video),media,seconds:(performance.now()-start)/1000,productionDefaultChanged:false,adoptedVariant:null};
 await save(path.join(output,'verification.json'),result);console.log(JSON.stringify({status:result.status,video:result.video,rasterCount:raster.length,seconds:result.seconds}));
}
await main(path.resolve(process.argv[2]));
