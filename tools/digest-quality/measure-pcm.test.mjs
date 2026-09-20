import test from 'node:test';
import assert from 'node:assert/strict';
import {measurePcmIntervals, measureCompletedPcm} from './measure-pcm.mjs';
import {mkdtemp, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const unit = (id,startFrame,endFrameExclusive) => ({id,range:{startFrame,endFrameExclusive}});
function pcm(values) { const b=Buffer.alloc(values.length*4); values.forEach((v,i)=>b.writeFloatLE(v,i*4)); return b; }
test('opposite stereo channels are measured separately, including the whole no-caption interval',()=>{
  const measured=measurePcmIntervals(pcm([1,-1,0.5,-0.5,0,0,0.25,-0.25]),{channels:2,sampleRate:2,fpsNum:1,fpsDen:1,units:[unit('caption',0,1),unit('no-caption',1,2)]});
  assert.equal(measured.decodedSampleCount,4);
  assert.equal(measured.intervals[0].channelMetrics[0].rootMeanSquare,Math.sqrt(0.625));
  assert.equal(measured.intervals[0].channelMetrics[1].rootMeanSquare,Math.sqrt(0.625));
  assert.equal(measured.intervals[1].channelMetrics[0].peakSample,3);
  assert.equal(measured.intervals[1].channelMetrics[0].exactZeroSamples,1);
  assert.equal(measured.intervals[1].channelMetrics[1].previousSample,-0.5);
});
test('missing samples, non-finite values and a nonintegral sample boundary fail instead of rounding',()=>{
  assert.throws(()=>measurePcmIntervals(pcm([0]),{channels:1,sampleRate:2,fpsNum:1,fpsDen:1,units:[unit('a',0,1)]}),/missing decoded/);
  assert.throws(()=>measurePcmIntervals(pcm([NaN]),{channels:1,sampleRate:1,fpsNum:1,fpsDen:1,units:[unit('a',0,1)]}),/non-finite/);
  assert.throws(()=>measurePcmIntervals(pcm([0,0]),{channels:1,sampleRate:1,fpsNum:2,fpsDen:1,units:[unit('a',0,1)]}),/exact sample/);
});
test('a different media hash is rejected before invoking the decoder',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'q3-pcm-reject-')); const media=path.join(dir,'media'); await writeFile(media,'different bytes');
  await assert.rejects(measureCompletedPcm({media:{path:media,sha256:'0'.repeat(64)}},{outputDir:path.join(dir,'out'),ffmpegPath:'/must-not-run',ffprobePath:'/must-not-run'}),/media identity/);
});
