import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {checkResumeStagesV001,runResumeV001} from './original-resolution-full-resume.mjs';
import {EXECUTION_AREA,json} from './original-resolution-execution-input.mjs';
const prior=path.join(EXECUTION_AREA,'full-production-001'),monitor=path.join(EXECUTION_AREA,'full-supervised-001');
const bg=await json(path.join(prior,'background-complete.json')),audio=await json(path.join(prior,'reference-audio-complete.json')),stop=await json(path.join(monitor,'summary.json')),first=JSON.parse((await readFile(path.join(monitor,'resource.jsonl'),'utf8')).split('\n')[0]);
test('resume is limited to original successful start and matching completed stages',()=>{
 assert.equal(checkResumeStagesV001(bg,audio,stop,first),true);
 for(const args of [
  [bg,audio,{...stop,status:'completed'},first],
  [bg,audio,{...stop,stage:'native'},first],
  [bg,{...audio,inputRef:{...audio.inputRef,fileSha256:'0'.repeat(64)}},stop,first],
  [{...bg,value:{...bg.value,verification:{...bg.value.verification,status:'failed'}}},audio,stop,first],
  [bg,audio,stop,{...first,availableBytes:49999999999}],
  [bg,audio,stop,{...first,pressure:2}],
 ])assert.throws(()=>checkResumeStagesV001(...args));
});
test('resume refuses unsupervised media start',async()=>{await assert.rejects(runResumeV001(),/SUPERVISOR_REQUIRED/);});
test('original bound launcher, monitor and instruction remain byte-identical',async()=>{
 for(const file of ['tools/digest-quality/original-resolution-full-launch.mjs','tools/digest-quality/original-resolution-full-supervisor.py','docs/reports/original-resolution-execution-20260930/launch-instruction.md'])assert.deepEqual(await readFile(file),execFileSync('git',['show','b9dce1b2:'+file]));
 for(const file of ['docs/reports/original-resolution-execution-20260930/full-interruption.json'])assert.deepEqual(await readFile(file),execFileSync('git',['show','6fae72b7:'+file]));
});
