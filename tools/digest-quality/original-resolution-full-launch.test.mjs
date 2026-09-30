import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {buildFullLaunchPlanV001,rebindFullNativeProvenanceV001 as rebind,runFullLaunchV001,FULL_LAUNCH_STEPS,fullNextAllocationV001} from './original-resolution-full-launch.mjs';
import {EXECUTION_AREA,json} from './original-resolution-execution-input.mjs';
import {canonicalSha256 as hash} from './clock.mjs';
const p=await json(path.join(EXECUTION_AREA,'full-native-preparation-001/completion.json')),old=await json(p.preparedRef.path),input=await json(p.inputRef.path),plan=await json(old.provenance.inputRefs.find(r=>r.role==='plan').path);
test('unsupervised CLI/entry refuses full production before creating any media',async()=>{await assert.rejects(runFullLaunchV001(),/SUPERVISOR_REQUIRED/);assert.throws(()=>execFileSync(process.execPath,['tools/digest-quality/original-resolution-full-launch.mjs','run'],{stdio:'pipe'}),e=>e.status!==0&&e.stderr.toString().includes('SUPERVISOR_REQUIRED'));});
test('whole launch plan preserves all input/state/sample identity and records no execution claim',async()=>{const launch=await buildFullLaunchPlanV001();assert.equal(launch.status,'approved-awaiting-execution');assert.equal(launch.fullExecution,'not-started');assert.equal(launch.operationalGuard,'approved-this-run-only');assert.equal(launch.scope.id,'full');assert.equal(launch.scope.frameCount,17613);assert.equal(launch.captionCount,265);assert.equal(launch.stateCount,307);assert.equal(launch.samples,345);assert.equal(launch.logicalCandidates,211732);assert.deepEqual(launch.steps,FULL_LAUNCH_STEPS);assert.equal(launch.outlineChoice,null);assert(launch.launcherRef.fileSha256);assert(launch.instructionRef.fileSha256);});
test('rebind transformation changes decision/baseline references without mutating saved preparation or images',()=>{const before=hash(old),baselineRef={...input.baselineRef,path:'/test-fixture/new-baseline.json'},evidence={...input,baselineRef,mediaRef:{path:'/test-fixture/not-a-real-media-receipt',fileSha256:'a'.repeat(64)}},inputRef={path:'/test-fixture/rebound-input.json',fileSha256:'b'.repeat(64),bytes:123};const result=rebind(old,{baselineRef,inputRef,evidence,plan});assert.equal(hash(old),before);assert.deepEqual(result.records,old.records);assert.deepEqual(result.evidence,old.evidence);for(const r of old.provenance.inputRefs.filter(r=>!['baseline-plan','integrated-input'].includes(r.role)))assert.deepEqual(result.provenance.inputRefs.find(x=>x.role===r.role),r);assert.equal(result.provenance.inputRefs.find(r=>r.role==='integrated-input').canonicalSha256,hash(evidence));});
test('rebind refuses changed plan/baseline, missing media and a trial scope',()=>{const baselineRef=input.baselineRef,evidence={...input,mediaRef:{path:'/test-fixture/media'}},inputRef={path:'/test-fixture/input'};for(const changes of [{plan:{...plan,elements:[]}},{baselineRef:{...baselineRef,canonicalSha256:'0'.repeat(64)}},{evidence:{...evidence,mediaRef:null}},{evidence:{...evidence,scopeId:'representative-01'}}])assert.throws(()=>rebind(old,{baselineRef,evidence,inputRef,plan,...changes}));});
test('every frozen execution/input/native/renderer module stays identical to accepted commit',async()=>{for(const p of ['tools/digest-quality/original-resolution-execution.mjs','tools/digest-quality/original-resolution-execution-qc.mjs','tools/digest-quality/original-resolution-execution-input.mjs','tools/digest-quality/original-resolution-execution-background.mjs','tools/digest-quality/integrated-native-qc-input-v003.mjs','evals/clip_composition/presentation_native_frame_qc_preparation_integrated_v003.mjs','evals/clip_composition/presentation_native_frame_qc_integrated_v003.mjs','evals/clip_composition/render_presentation_v002.mjs','evals/clip_composition/presentation_native_qc_streaming_v001.mjs','evals/clip_composition/presentation_qc_evidence_store_v001.mjs'])assert.equal(await readFile(p,'utf8'),execFileSync('git',['show','a0a8e4d8:'+p]).toString());});

test('allocation guard reserves the entire next point and only new bytes within a batch',()=>{const spec={samples:[{crop:{width:4,height:3},references:[{},{}]}]};assert.equal(fullNextAllocationV001({phase:'native-sample-start',sampleIndex:0},spec),108);assert.equal(fullNextAllocationV001({phase:'native-reference-composite',plannedLogicalBytes:36,existingReferenceLogicalBytes:72},spec),36);assert.equal(fullNextAllocationV001({phase:'native-layer-prepare',plannedLogicalBytes:null},spec),0);assert.throws(()=>fullNextAllocationV001({phase:'native-sample-start',sampleIndex:1},spec));});
test('approved resource boundaries fail closed and distinguish initial and next allocation checks',()=>{execFileSync('python3',['-B','-c',`import importlib.util
s=importlib.util.spec_from_file_location('guard','tools/digest-quality/original-resolution-full-supervisor.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
a={'pressure':1,'treeRssBytes':0,'availableBytes':m.START}
assert m.decision(a,starting=True) is None
assert m.decision({**a,'availableBytes':m.START-1},starting=True)
assert m.decision({**a,'availableBytes':m.RESERVE})
assert m.decision({**a,'treeRssBytes':m.RSS})
for p in [0,2,4]:assert m.decision({**a,'pressure':p})
assert m.decision({**a,'availableBytes':m.RESERVE+100},100) is None
assert m.decision({**a,'availableBytes':m.RESERVE+99},100)
assert m.decision(a,-1)
try:m.decision({})
except KeyError:pass
else:raise AssertionError('missing observation accepted')
`]);});
