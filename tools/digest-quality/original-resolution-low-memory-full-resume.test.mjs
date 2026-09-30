import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {buildFullLaunchPlanV001 as oldPlan} from './original-resolution-full-launch.mjs';
import {buildFullLaunchPlanV001 as newPlan,runFullLaunchV001} from './original-resolution-low-memory-full-launch.mjs';
import {runResumeV001} from './original-resolution-low-memory-full-resume.mjs';

test('low-memory full route retains the approved launch plan and rejects unsupervised entry',async()=>{
  assert.deepEqual(await newPlan(),await oldPlan());
  await assert.rejects(runFullLaunchV001(),/SUPERVISOR_REQUIRED/);
  await assert.rejects(runResumeV001(),/SUPERVISOR_REQUIRED/);
});

test('frozen full launcher, native inputs and supervisor retain their saved bytes',async()=>{
  for(const file of [
    'tools/digest-quality/original-resolution-full-launch.mjs',
    'tools/digest-quality/original-resolution-execution.mjs',
    'tools/digest-quality/original-resolution-execution-qc.mjs',
    'tools/digest-quality/integrated-native-qc-input-v003.mjs',
    'tools/digest-quality/original-resolution-full-supervisor-v002.py',
  ])assert.deepEqual(await readFile(file),execFileSync('git',['show','6f5bf604:'+file]));
});
