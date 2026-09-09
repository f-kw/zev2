import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn, execFileSync} from 'node:child_process';
import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import {buildPresentationCompositeArgumentsV001, buildPresentationFrameExtractionArgumentsV001,
  renderPresentationCounterfactualEncodedFrameV001} from './render_presentation_v002.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const WORK=path.join(ROOT,'evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001');
const FIXTURE=path.join(WORK,'qc-integrated-fixture-v001-ibyU3m');
const FFMPEG='/opt/homebrew/bin/ffmpeg', MAGICK='/opt/homebrew/bin/magick';
const hash=b=>createHash('sha256').update(b).digest('hex');
const run=(command,args)=>new Promise((resolve,reject)=>{
  const child=spawn(command,args,{stdio:['ignore','pipe','pipe']});const stdout=[],stderr=[];
  child.stdout.on('data',b=>stdout.push(b));child.stderr.on('data',b=>stderr.push(b));child.on('error',reject);
  child.on('close',(code,signal)=>{const result={code,signal,stdout:Buffer.concat(stdout),stderr:Buffer.concat(stderr)};
    if(code===0&&signal===null)resolve(result);else reject(new Error(JSON.stringify({code,signal,stderr:result.stderr.toString()})));});
});
const bind=async p=>{const b=await readFile(p);return {path:path.relative(ROOT,p),bytes:b.length,fileSha256:hash(b)};};
const save=(p,v)=>writeFile(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const canvas={width:1920,height:1080,fps:30};
const png=n=>path.join(FIXTURE,n+'.png');
const input={baseMediaPath:path.join(FIXTURE,'base.mp4'),plan:{canvas},expectedFrameCount:900,
  overlayRecords:[{element:{instructionId:'target',startFrame:280,displayFrameCount:41},pngPath:png('target')},
    {element:{instructionId:'other',startFrame:270,displayFrameCount:61},pngPath:png('other')}]};

test('execution control applies only to PNG decoders and the complex filter graph',()=>{
  assert.throws(()=>buildPresentationCompositeArgumentsV001({...input,serializePngAndFilters:1}),/must be boolean/u);
  const defaults=buildPresentationCompositeArgumentsV001(input);
  assert.deepEqual(buildPresentationCompositeArgumentsV001({...input,serializePngAndFilters:false}),defaults);
  const controlled=buildPresentationCompositeArgumentsV001({...input,serializePngAndFilters:true});
  const inputs=[];let begin=0;
  for(let i=0;i<controlled.length;i++)if(controlled[i]==='-i'){inputs.push(controlled.slice(begin,i+2));begin=i+2;}
  assert.equal(inputs.length,3);assert(!inputs[0].includes('-threads'));
  assert.equal(inputs[0][inputs[0].indexOf('-filter_complex_threads')+1],'1');
  for(const segment of inputs.slice(1))assert.deepEqual(segment.slice(0,2),['-threads','1']);
  assert(!controlled.slice(begin).includes('-threads'),'encoder thread option changed');
  const stripped=[];
  for(let i=0;i<controlled.length;i++){
    if(controlled[i]==='-threads'||controlled[i]==='-filter_complex_threads'){assert.equal(controlled[++i],'1');continue;}
    stripped.push(controlled[i]);
  }
  assert.deepEqual(stripped,defaults,'any non-resource argument changed');
});

test('all decoded fixture frames and streamed QC frames match before resource control',async()=>{
  const directory=await mkdtemp(path.join(WORK,'resource-control-fixture-v001-'));
  const corePath=path.join(ROOT,'evals/clip_composition/render_presentation_v002.mjs');
  const current=await bind(corePath);
  const captured=execFileSync('git',['show','91b740d7707b812fdf22de4129e157309e0f9155:evals/clip_composition/render_presentation_v002.mjs'],{cwd:ROOT,encoding:'utf8'});
  assert.equal(hash(captured),'b5670f2e9a665fddf7082fee107b322181f6a2c6a89edb6c1d77fcebce38a61b');
  const begin=captured.indexOf('export const buildPresentationCompositeArgumentsV001 =');
  const end=captured.indexOf('\nconst composite =',begin);assert(begin>=0&&end>begin);
  const legacy=vm.runInNewContext(captured.slice(begin,end).replace('export const','const')+'\nbuildPresentationCompositeArgumentsV001;');
  await save(path.join(directory,'captured-implementation.json'),{commit:'91b740d7707b812fdf22de4129e157309e0f9155',fileSha256:hash(captured),content:captured});
  const fixtureBindings=await Promise.all(['base.mp4','target.png','other.png','moved.png','transparent.png'].map(n=>bind(path.join(FIXTURE,n))));
  const cases=[
    {name:'regular',start:90,count:61,otherStart:10,otherCount:25,target:'target',other:'other'},
    {name:'short-fade',start:190,count:3,otherStart:10,otherCount:25,target:'target',other:'other'},
    {name:'simultaneous',start:280,count:41,otherStart:270,otherCount:61,target:'target',other:'other'},
    {name:'transparent',start:410,count:31,otherStart:400,otherCount:61,target:'transparent',other:'other'},
    {name:'wrong-omission',start:280,count:41,otherStart:270,otherCount:61,target:'target',other:'transparent'},
    {name:'moved-target',start:280,count:41,otherStart:270,otherCount:61,target:'moved',other:'other'},
  ];
  const evidence=[];const frames=new Map();
  for(const c of cases){
    const argsInput={...input,overlayRecords:[{element:{instructionId:'target',startFrame:c.start,displayFrameCount:c.count},pngPath:png(c.target)},
      {element:{instructionId:'other',startFrame:c.otherStart,displayFrameCount:c.otherCount},pngPath:png(c.other)}]};
    const legacyArgs=Array.from(legacy(argsInput));
    assert.deepEqual(buildPresentationCompositeArgumentsV001(argsInput),legacyArgs,'default differs from captured pre-change implementation');
    const controlledArgs=buildPresentationCompositeArgumentsV001({...argsInput,serializePngAndFilters:true});
    await save(path.join(directory,c.name+'-inputs.json'),{input:argsInput,legacyArgs,controlledArgs});
    const oldVideo=path.join(directory,c.name+'-before.mp4'),newVideo=path.join(directory,c.name+'-after.mp4');
    await run(FFMPEG,[...legacyArgs,'-movflags','+faststart',oldVideo]);
    await run(FFMPEG,[...controlledArgs,'-movflags','+faststart',newVideo]);
    const frameHash=async video=>(await run(FFMPEG,['-hide_banner','-loglevel','error','-i',video,'-map','0:v:0','-pix_fmt','yuv420p','-f','framehash','-hash','sha256','-'])).stdout;
    const before=await frameHash(oldVideo),after=await frameHash(newVideo);
    await writeFile(path.join(directory,c.name+'-before.framehash.txt'),before,{flag:'wx'});
    await writeFile(path.join(directory,c.name+'-after.framehash.txt'),after,{flag:'wx'});
    assert.equal(before.toString().split('\n').filter(s=>s&&!s.startsWith('#')).length,900);
    assert.deepEqual(after,before,c.name+': decoded full video pixels changed');
    const representativeFrame=c.start+Math.floor(c.count/2);
    const oldFrame=path.join(directory,c.name+'-before.png');
    await run(FFMPEG,buildPresentationFrameExtractionArgumentsV001({inputPath:oldVideo,frame:representativeFrame,outputPath:oldFrame,fps:30}));
    const request={instructionId:'target',ffmpegPath:FFMPEG,compositeArguments:controlledArgs,representativeFrame,expectedFrameCount:900,outputPath:path.join(directory,c.name+'-stream.png')};
    const outcome=await renderPresentationCounterfactualEncodedFrameV001(request);
    assert.equal(outcome.status,'completed');
    const pixels=async p=>(await run(MAGICK,[p,'-depth','8','rgba:-'])).stdout;
    const oldPixels=await pixels(oldFrame),streamPixels=await pixels(request.outputPath);
    assert.deepEqual(streamPixels,oldPixels,c.name+': streamed QC pixels changed');frames.set(c.name,oldPixels);
    evidence.push({name:c.name,frames:900,allDecodedFramesIdentical:true,streamedQcFrameIdentical:true,
      representativeFrame,beforeVideo:await bind(oldVideo),afterVideo:await bind(newVideo),
      frameHash:await bind(path.join(directory,c.name+'-after.framehash.txt')),outcome});
    process.stdout.write('# '+c.name+': all 900 decoded frames and streamed QC frame identical\n');
  }
  assert.notDeepEqual(frames.get('wrong-omission'),frames.get('simultaneous'),'other subtitle removal was not distinguishable');
  assert.notDeepEqual(frames.get('moved-target'),frames.get('simultaneous'),'position change was not distinguishable');
  assert.deepEqual(await bind(corePath),current,'implementation changed during equivalence test');
  await save(path.join(directory,'result.json'),{schemaVersion:'presentation-render-execution-resource-equivalence-v001',status:'passed',
    implementationBinding:current,fixtureBindings,capturedImplementationFileSha256:hash(captured),
    defaultArgumentsUnchanged:true,onlyPngDecoderAndFilterThreadArgumentsChanged:true,
    baseDecoderAndEncoderThreadsUnchanged:true,allDecodedFramesIdentical:true,streamedQcFramesIdentical:true,
    wrongOmissionDistinguished:true,positionMutationDistinguished:true,evidence});
  process.stdout.write('# evidence: '+directory+'\n');
});
