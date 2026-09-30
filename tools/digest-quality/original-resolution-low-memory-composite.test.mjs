import test from 'node:test';
import assert from 'node:assert/strict';
import {partitionFramesV001,producerArgumentsV001,FULL_FRAMES,DEFAULT_MAX_FRAMES} from './original-resolution-low-memory-composite.mjs';
import {loadExecutionInputV001} from './original-resolution-execution-input.mjs';

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
