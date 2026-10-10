import test from 'node:test';
import assert from 'node:assert/strict';
import {partitionFramesV001,producerArgumentsV001,runFormalLowMemoryCompositeV001,FULL_FRAMES,DEFAULT_MAX_FRAMES} from './original-resolution-low-memory-composite.mjs';
import {loadExecutionInputV001} from './original-resolution-execution-input.mjs';
import {mkdtemp,mkdir,writeFile,readFile,statfs,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {canonicalJson} from '../../evals/clip_composition/presentation_caption_contract_v002.mjs';
import os from 'node:os';
import path from 'node:path';

test('the whole display clock is covered exactly once in finite sequential ranges',()=>{
  const ranges=partitionFramesV001(0,FULL_FRAMES);
  assert.equal(ranges.length,84);
  assert.equal(ranges[0].startFrame,0);
  assert.equal(ranges.at(-1).endFrameExclusive,FULL_FRAMES);
  assert(ranges.every(r=>r.endFrameExclusive-r.startFrame<=DEFAULT_MAX_FRAMES));
  for(let n=1;n<ranges.length;n++)assert.equal(ranges[n].startFrame,ranges[n-1].endFrameExclusive);
  assert.equal(ranges.reduce((n,r)=>n+r.endFrameExclusive-r.startFrame,0),FULL_FRAMES);
});

test('an actual black separator frame runs with background input and no PNG input',async()=>{
  const x=await loadExecutionInputV001('representative-05');
  const command=producerArgumentsV001({baseMediaPath:'/tmp/fixed-background.nut',plan:x.plan,records:x.records,
    scopeStart:x.interval.start,fullFrameCount:x.interval.frameCount,
    range:{startFrame:11125,endFrameExclusive:11126},maxFrames:1});
  assert.equal(command.captionCount,0);
  assert.equal(command.stateCount,0);
  assert.equal(command.inputCount,1);
  assert.equal(command.args.filter(a=>a==='-i').length,1);
  assert.equal(command.args.at(-1),'pipe:1');
});

test('a motion interval opens only states referenced by its clipped renderer graph',async()=>{
  const x=await loadExecutionInputV001('representative-03');
  const command=producerArgumentsV001({baseMediaPath:'/tmp/fixed-background.nut',plan:x.plan,records:x.records,
    scopeStart:x.interval.start,fullFrameCount:x.interval.frameCount,
    range:{startFrame:x.interval.start,endFrameExclusive:x.interval.start+1},maxFrames:1});
  assert.equal(command.captionCount,1);
  assert(command.stateCount>0&&command.stateCount<x.rows.length);
  assert.equal(command.inputCount,command.stateCount+1);
  assert.equal(command.args.filter(a=>a==='-i').length,command.inputCount);
});

// Pure graph fixtures carry no receipts, hashes or manufacturing permissions.
const normalPlanFixture = frameCount => {
  const element = {instructionId:'planning-only-caption',startFrame:0,endFrameExclusive:frameCount,
    displayFrameCount:frameCount};
  return {plan:{canvas:{width:1920,height:1080,fps:30},elements:[element]},
    overlayRecords:[{element:structuredClone(element),pngPath:'/tmp/planning-only-caption.png'}]};
};
const hash = value => createHash('sha256').update(value).digest('hex');
const canonicalHash = value => hash(canonicalJson(value));
// Structural selection fixtures confer no job or manufacturing authority.
// Their binding bytes refer to actual small, test-only JSON bodies.
const testJsonBinding = (fileName,body) => {
  const bytes=Buffer.from(JSON.stringify(body,null,2)+'\n');
  return {path:'runtime/artifacts/composite-visibility-test-v001/'+fileName,
    fileSha256:hash(bytes),sizeBytes:bytes.length,schemaVersion:body.schemaVersion,canonicalSha256:canonicalHash(body)};
};
const visibilityFixture = (plan,decisions) => ({
  schemaVersion:'digest-caption-visibility-selection-v001',mode:'explicit-cue-adoption-v001',
  adoptionBinding:testJsonBinding('adoption.json',{schemaVersion:'test-only-caption-adoption',decisions}),
  manifestBinding:testJsonBinding('manifest.json',{schemaVersion:'test-only-caption-manifest',elements:plan.elements}),
  rendererPlanCanonicalSha256:canonicalHash(plan),
  entries:plan.elements.map((element,index)=>({instructionId:element.instructionId,decision:decisions[index]})),
  counts:{totalInstructions:plan.elements.length,shownInstructions:decisions.filter(value=>value==='show').length,
    suppressedInstructions:decisions.filter(value=>value==='suppress').length},
});
const twoCaptionFixture = () => {
  const elements=[{instructionId:'test-first',startFrame:0,endFrameExclusive:6,displayFrameCount:6},
    {instructionId:'test-second',startFrame:6,endFrameExclusive:12,displayFrameCount:6}];
  return {plan:{canvas:{width:1920,height:1080,fps:30},elements},
    overlayRecords:elements.map(element=>({element:structuredClone(element),pngPath:'/tmp/test-only-overlay.png'})),
    expectedFrameCount:12,expectedOverlayCount:2,maxFrames:5};
};
const withSupervision = async task => {
  const previous=process.env.ZEV_FULL_SUPERVISED;
  process.env.ZEV_FULL_SUPERVISED='1';
  try{return await task();}finally{
    if(previous===undefined)delete process.env.ZEV_FULL_SUPERVISED;
    else process.env.ZEV_FULL_SUPERVISED=previous;
  }
};
const formalPlanningOnly = async (input={},visit) => {
  const directory=await mkdtemp(path.join(os.tmpdir(),'zev-composite-plan-'));
  try{
    return await withSupervision(async()=>{
      let observed;
      const args={baseMediaPath:'/tmp/planning-only-base.mp4',...normalPlanFixture(421),
        expectedFrameCount:421,expectedOverlayCount:1,outputPath:path.join(directory,'uncreated.mp4'),
        ffmpegPath:'/tmp/planning-only-ffmpeg-must-not-execute',
        resourceCheck:async()=>assert.fail('planning test must not enter a production callback'),
        processObserver:{observeOperation:async(request,task)=>{
          assert.equal(typeof task,'function');observed=request;
          return {status:'test-planning-only'};
        }},...input};
      if(visit)await visit(args);
      const result=await runFormalLowMemoryCompositeV001(args);
      assert.deepEqual(result,{status:'test-planning-only'});
      assert(observed);
      return observed.input;
    });
  }finally{await rm(directory,{recursive:true,force:true});}
};

test('formal planning accepts explicit different complete clocks without starting media children',async()=>{
  for(const count of [1,211,421,17613,27691,32000]){
    const result=await formalPlanningOnly({...normalPlanFixture(count),expectedFrameCount:count});
    const ranges=result.segments.map(row=>row.range);
    assert.equal(result.expectedFrameCount,count);
    assert.equal(ranges.length,Math.ceil(count/DEFAULT_MAX_FRAMES));
    assert.equal(ranges[0].startFrame,0);assert.equal(ranges.at(-1).endFrameExclusive,count);
    assert.equal(ranges.reduce((sum,row)=>sum+row.endFrameExclusive-row.startFrame,0),count);
    ranges.forEach((row,index)=>{
      assert(row.endFrameExclusive-row.startFrame<=DEFAULT_MAX_FRAMES);
      if(index)assert.equal(row.startFrame,ranges[index-1].endFrameExclusive);
    });
    assert.equal(result.encoderArgs[result.encoderArgs.indexOf('-frames:v')+1],String(count));
    assert.equal(result.encoderArgs[result.encoderArgs.indexOf('-c:a')+1],'copy');
    assert(result.segments.every(row=>row.args.at(-1)==='pipe:1'));
    if(count===27691)assert.equal(ranges.at(-1).endFrameExclusive-ranges.at(-1).startFrame,181);
  }
});

test('formal planning refuses absent, invalid and byte-overflow complete clocks',async()=>{
  for(const count of [undefined,null,0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER]){
    await assert.rejects(formalPlanningOnly({expectedFrameCount:count}),/explicit complete frame clock required/);
  }
});

test('formal planning refuses omitted or mismatched approved overlay counts and records',async()=>{
  for(const count of [undefined,0,1.5,422]){
    await assert.rejects(formalPlanningOnly({expectedOverlayCount:count}),/approved candidate overlay count required/);
  }
  await assert.rejects(formalPlanningOnly({expectedOverlayCount:2}));
  await assert.rejects(formalPlanningOnly({overlayRecords:[]}));
  await assert.rejects(formalPlanningOnly({plan:undefined}),/complete Normal plan and records required/);
});

test('formal planning refuses changed record clocks, order, duplicate IDs and finite effects',async()=>{
  await assert.rejects(formalPlanningOnly({expectedFrameCount:420}));
  await assert.rejects(formalPlanningOnly({},args=>{
    args.overlayRecords[0].element.displayFrameCount--;
  }),/record order or saved element changed/);
  await assert.rejects(formalPlanningOnly({},args=>{
    args.plan.elements[0].displayFrameCount--;args.overlayRecords[0].element.displayFrameCount--;
  }));
  await assert.rejects(formalPlanningOnly({},args=>{
    const first={instructionId:'one',startFrame:0,endFrameExclusive:210,displayFrameCount:210};
    const second={instructionId:'two',startFrame:210,endFrameExclusive:421,displayFrameCount:211};
    args.plan.elements=[first,second];args.expectedOverlayCount=2;
    args.overlayRecords=[{element:structuredClone(second),pngPath:'/tmp/two.png'},
      {element:structuredClone(first),pngPath:'/tmp/one.png'}];
  }),/record order or saved element changed/);
  await assert.rejects(formalPlanningOnly({},args=>{
    const first={instructionId:'duplicate',startFrame:0,endFrameExclusive:210,displayFrameCount:210};
    const second={instructionId:'duplicate',startFrame:210,endFrameExclusive:421,displayFrameCount:211};
    args.plan.elements=[first,second];args.expectedOverlayCount=2;
    args.overlayRecords=[first,second].map(element=>({element:structuredClone(element),pngPath:'/tmp/duplicate.png'}));
  }));
  await assert.rejects(formalPlanningOnly({},args=>{args.overlayRecords[0].motionStates=[];}),/only Normal records/);
  await assert.rejects(formalPlanningOnly({renderRange:{startFrame:0,endFrameExclusive:210}}),/unsupported formal composite options/);
});

test('formal planning retains the finite-unit cap and requires process and resource observers',async()=>{
  for(const maxFrames of [0,211,1.5])await assert.rejects(formalPlanningOnly({maxFrames}));
  await assert.rejects(formalPlanningOnly({resourceCheck:undefined}),/formal resource gate is required/);
  await assert.rejects(formalPlanningOnly({processObserver:undefined}),/formal operation observer is required/);
});

test('formal planning never replaces an existing output',async()=>{
  await assert.rejects(formalPlanningOnly({},args=>writeFile(args.outputPath,'existing proof')),
    /formal output already exists/);
});

test('formal planning requires the existing supervisor environment',async()=>{
  const previous=process.env.ZEV_FULL_SUPERVISED;delete process.env.ZEV_FULL_SUPERVISED;
  try{
    await assert.rejects(runFormalLowMemoryCompositeV001({}),/SUPERVISOR_REQUIRED/);
  }finally{if(previous!==undefined)process.env.ZEV_FULL_SUPERVISED=previous;}
});

test('legacy producer retains its default full clock, clipped phase and background-only gap',()=>{
  const {plan,overlayRecords}=normalPlanFixture(30);
  const input={baseMediaPath:'/tmp/legacy-background.nut',plan,records:overlayRecords,
    scopeStart:0,fullFrameCount:FULL_FRAMES,range:{startFrame:11,endFrameExclusive:12},maxFrames:1};
  const implicit=producerArgumentsV001(input);
  assert.deepEqual(implicit,producerArgumentsV001({...input,graphFullFrameCount:FULL_FRAMES}));
  const graph=implicit.args[implicit.args.indexOf('-filter_complex')+1];
  assert(graph.includes('(N+11)'));assert(graph.includes('(n+11)'));
  assert.equal(implicit.inputCount,2);assert.equal(implicit.args.at(-1),'pipe:1');
  const separator=producerArgumentsV001({...input,range:{startFrame:30,endFrameExclusive:31}});
  assert.equal(separator.captionCount,0);assert.equal(separator.inputCount,1);
  assert.equal(separator.args[separator.args.indexOf('-filter_complex')+1],'[0:v]fps=30,format=yuv420p[video]');
});

test('explicit all-show produces the unchanged graph and AAC encoder arguments',async()=>{
  const fixture=twoCaptionFixture();
  const baseline=await formalPlanningOnly(fixture);
  const selection=visibilityFixture(fixture.plan,['show','show']);
  const actual=await formalPlanningOnly({...fixture,visibilitySelection:selection});
  assert.equal(baseline.visibilityComposition,null);
  assert.deepEqual(actual.encoderArgs.slice(0,-1),baseline.encoderArgs.slice(0,-1));
  assert.deepEqual(actual.segments.map(row=>row.args),baseline.segments.map(row=>row.args));
  assert.equal(actual.expectedOverlayCount,2);
  assert.deepEqual(actual.visibilityComposition.shownInstructionIds,['test-first','test-second']);
  assert.deepEqual(actual.visibilityComposition.suppressedInstructionIds,[]);
});

test('explicit suppression changes only overlay inputs and keeps every logical record and frame',async()=>{
  const fixture=twoCaptionFixture();
  for(const decisions of [['show','suppress'],['suppress','suppress']]){
    const result=await formalPlanningOnly({...fixture,visibilitySelection:visibilityFixture(fixture.plan,decisions)});
    const shown=fixture.plan.elements.filter((_element,index)=>decisions[index]==='show');
    assert.equal(result.expectedOverlayCount,2);assert.equal(result.expectedFrameCount,12);
    assert.deepEqual(result.visibilityComposition.shownInstructionIds,shown.map(element=>element.instructionId));
    for(const segment of result.segments){
      const ids=shown.filter(element=>element.startFrame<segment.range.endFrameExclusive
        &&element.endFrameExclusive>segment.range.startFrame).map(element=>element.instructionId);
      assert.deepEqual(segment.shownInstructionIds,ids);assert.equal(segment.captionCount,ids.length);
      assert.equal(segment.args.filter(value=>value==='-i').length,ids.length+1);
      if(ids.length===0)assert.equal(segment.args[segment.args.indexOf('-filter_complex')+1],
        '[0:v]fps=30,format=yuv420p[video]');
    }
    assert.equal(result.segments.reduce((n,row)=>n+row.range.endFrameExclusive-row.range.startFrame,0),12);
    assert.equal(result.encoderArgs[result.encoderArgs.indexOf('-c:a')+1],'copy');
    assert.deepEqual(result.encoderArgs.slice(result.encoderArgs.indexOf('-map'),result.encoderArgs.indexOf('-vf')),
      ['-map','0:v:0','-map','1:a:0']);
  }
});

test('invalid decisions, mismatched plans, IDs and counts are rejected before children',async()=>{
  const fixture=twoCaptionFixture(),selection=visibilityFixture(fixture.plan,['show','suppress']);
  const mutations=[value=>value.entries.pop(),value=>value.entries.reverse(),
    value=>value.entries[1].instructionId='unknown',value=>value.entries[1].instructionId='test-first',
    value=>value.entries[0].decision='automatic',value=>value.counts.shownInstructions++,
    value=>value.rendererPlanCanonicalSha256=hash('different plan'),value=>value.criteria={duration:6}];
  for(const mutate of mutations){
    const changed=structuredClone(selection);mutate(changed);
    await assert.rejects(formalPlanningOnly({...fixture,visibilitySelection:changed}),/invalid caption visibility selection/);
  }
  await assert.rejects(formalPlanningOnly({...fixture,visibilitySelection:selection,
    overlayRecords:fixture.overlayRecords.slice(0,1)}));
});

test('operation observation keeps its own snapshot when the caller decision object changes',async()=>{
  const fixture=twoCaptionFixture(),selection=visibilityFixture(fixture.plan,['show','suppress']);
  const original=structuredClone(selection);
  const promise=formalPlanningOnly({...fixture,visibilitySelection:selection},args=>{
    // This callback runs before selection validation, so no mutation here.
    assert.equal(args.visibilitySelection,selection);
  });
  const result=await promise;
  selection.entries[0].decision='suppress';
  assert.deepEqual(result.visibilitySelection,original);
});

test('small actual composites preserve visible choices, 12-frame clock and every original AAC packet',async()=>{
  const run=promisify(execFile),directory=await mkdtemp(path.join(os.tmpdir(),'zev-composite-visibility-native-'));
  const ffmpeg='/opt/homebrew/bin/ffmpeg',ffprobe='/opt/homebrew/bin/ffprobe',magick='/opt/homebrew/bin/magick';
  const execute=(command,args,options={})=>run(command,args,{maxBuffer:8*1024*1024,...options});
  try{
    const fixture=twoCaptionFixture(),base=path.join(directory,'base.mp4'),png=path.join(directory,'overlay.png');
    await execute(ffmpeg,['-hide_banner','-loglevel','error','-nostdin','-n','-f','lavfi','-i',
      "color=c=black:s=1920x1080:r=30:d=0.4,geq=lum='16+8*N':cb=128:cr=128",'-f','lavfi','-i','sine=frequency=440:sample_rate=44100:duration=0.4',
      '-map','0:v:0','-map','1:a:0','-frames:v','12','-c:v','libx264','-preset','fast','-crf','20',
      '-pix_fmt','yuv420p','-c:a','aac','-movie_timescale','30',base]);
    await execute(magick,['-size','1920x1080','xc:none','-fill','white','-draw',
      'rectangle 900,480 1020,600','PNG32:'+png]);
    fixture.overlayRecords=fixture.overlayRecords.map(record=>({...record,pngPath:png}));
    const audio=async file=>JSON.parse((await execute(ffprobe,['-v','error','-select_streams','a:0',
      '-show_streams','-show_packets','-show_data_hash','sha256','-show_entries',
      'stream=codec_name,sample_rate,time_base,duration_ts:packet=pts,dts,duration,size,data_hash,side_data_list',
      '-of','json',file])).stdout);
    const pixel=async(file,frame)=>(await execute(ffmpeg,['-v','error','-nostdin','-i',file,'-vf',
      `select=eq(n\\,${frame}),crop=2:2:960:540`,'-frames:v','1','-pix_fmt','gray','-f','rawvideo','pipe:1'],
      {encoding:null})).stdout;
    const backgroundFrames=async file=>(await execute(ffmpeg,['-v','error','-nostdin','-i',file,'-vf',
      'crop=2:2:100:100','-pix_fmt','gray','-f','rawvideo','pipe:1'],{encoding:null})).stdout;
    const losslessVideo=path.join(directory,'separate-background.nut');
    await execute(ffmpeg,['-hide_banner','-loglevel','error','-nostdin','-n','-i',base,'-map','0:v:0','-an','-c:v','ffv1','-f','nut',losslessVideo]);
    const originalAudio=await audio(base),originalBackground=await backgroundFrames(base),results=[];
    const originalSamples=await Promise.all([pixel(base,2),pixel(base,8)]);
    assert.equal(originalBackground.length,12*4);
    assert(new Set(originalBackground).size>4,'fixture must expose changing source frames');
    for(const [name,decisions] of [['legacy',null],['all-show',['show','show']],
      ['partial',['show','suppress']],['all-suppress',['suppress','suppress']],['separate-aac',['show','suppress']]]){
      const selection=decisions===null?null:visibilityFixture(fixture.plan,decisions);
      // Bind actual test-only JSON bytes; these fixtures are not approval records.
      if(selection!==null)for(const [fileName,body] of [
        ['adoption.json',{schemaVersion:'test-only-caption-adoption',decisions}],
        ['manifest.json',{schemaVersion:'test-only-caption-manifest',elements:fixture.plan.elements}]]){
        const binding=fileName==='adoption.json'?selection.adoptionBinding:selection.manifestBinding;
        binding.path='runtime/artifacts/composite-visibility-test-v001/'+name+'/'+fileName;
        const file=path.join(directory,binding.path);await mkdir(path.dirname(file),{recursive:true});
        await writeFile(file,JSON.stringify(body,null,2)+'\n',{flag:'wx'});
        assert.equal(hash(await readFile(file)),binding.fileSha256);
      }
      const outputPath=path.join(directory,name+'.mp4');
      const result=await withSupervision(()=>runFormalLowMemoryCompositeV001({...fixture,baseMediaPath:name==='separate-aac'?losslessVideo:base,
        ...(name==='separate-aac'?{audioMediaPath:base}:{}),outputPath,ffmpegPath:ffmpeg,visibilitySelection:selection,
        resourceCheck:async({newBytes})=>{
          const space=await statfs(directory);assert(space.bavail*space.bsize>12_000_000_000+newBytes);
          assert(process.memoryUsage().rss<16*1024**3);
        },processObserver:{observeOperation:async(_request,operation)=>operation()}}));
      const media=JSON.parse((await execute(ffprobe,['-v','error','-select_streams','v:0','-count_frames',
        '-show_entries','stream=width,height,r_frame_rate,nb_read_frames','-of','json',outputPath])).stdout).streams[0];
      assert.equal(media.nb_read_frames,'12');assert.equal(media.r_frame_rate,'30/1');
      assert.equal(media.width,1920);assert.equal(media.height,1080);
      assert.deepEqual(await audio(outputPath),originalAudio,name+' original AAC packets or clock changed');
      assert.equal(result.rawYuvBytes,12*1920*1080*3/2);assert.equal(result.frameCoverage,'complete-contiguous-once');
      assert.equal(result.expectedOverlayCount,2);assert.equal(result.scope.frameCount,12);
      if(name==='separate-aac')assert.equal(result.audioMediaPath,base);
      const background=await backgroundFrames(outputPath);assert.equal(background.length,originalBackground.length);
      assert([...background].every((value,index)=>Math.abs(value-originalBackground[index])<=2),
        name+' source background frame content or order changed');
      const samples=await Promise.all([pixel(outputPath,2),pixel(outputPath,8)]);
      for(const [index,sample] of samples.entries()){
        assert.equal(sample.length,4);const expected=decisions===null||decisions[index]==='show';
        assert([...sample].every((value,pixelIndex)=>expected?value>=220
          :Math.abs(value-originalSamples[index][pixelIndex])<=2),name+' visibility pixel mismatch');
      }
      results.push({name,rawYuvSha256:result.rawYuvSha256,outputSha256:result.output.fileSha256,
        frames:Number(media.nb_read_frames),audioPacketCount:originalAudio.packets.length,
        audioPacketPayloadSha256:hash(originalAudio.packets.map(packet=>packet.data_hash).join('\n')),
        originalAudioPacketsAndClockIdentical:true,all12SourceBackgroundFramesInOrder:true,
        backgroundPixelMaximumAllowedError:2,visibilityComposition:result.visibilityComposition,
        pixelSamples:samples.map(sample=>[...sample])});
    }
    assert.equal(results[0].rawYuvSha256,results[1].rawYuvSha256,'all-show changed original composition');
    assert.equal(results[0].outputSha256,results[1].outputSha256,'all-show changed encoded output bytes');
    console.log('Synthetic visibility implementation evidence: '+JSON.stringify({frameCount:12,
      manufacturing:false,wholeVideoListening:false,results}));
  }finally{await rm(directory,{recursive:true,force:true});}
});
