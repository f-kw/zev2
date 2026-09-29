import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {assertCollapsedRepresentativeClockV001 as check} from './original-resolution-representative-clock-resume.mjs';
import {REPRESENTATIVE_AREA} from './original-resolution-representatives.mjs';
test('a clock-only continuation requires every original frame and an actual clock defect',async()=>{
 const p=JSON.parse(await readFile(path.join(REPRESENTATIVE_AREA,'representative-05-media-002/clock-resume.json'),'utf8'));
 check(p.oldClock,14);assert.throws(()=>check(p.oldClock,13));
 const correct={streams:[{time_base:'1/30'}],frames:Array.from({length:14},(_,pts)=>({pts}))};
 assert.throws(()=>check(correct,14));assert.equal(p.newClock.frameCount,14);
 assert.equal(p.original.path,path.join(REPRESENTATIVE_AREA,'representative-05-media-001/background/background.nut'));
});
