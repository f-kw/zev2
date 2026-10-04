import test from 'node:test';
import assert from 'node:assert/strict';
import {partitionFramesV001,producerArgumentsV001,runFormalLowMemoryCompositeV001,FULL_FRAMES,DEFAULT_MAX_FRAMES} from './original-resolution-low-memory-composite.mjs';
import {loadExecutionInputV001} from './original-resolution-execution-input.mjs';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
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
