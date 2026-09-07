import assert from 'node:assert/strict';
import {test, before} from 'node:test';
import {readFile} from 'node:fs/promises';
import {reconstructDistantHumanRepairV001, validateDistantHumanObservationsV001, verifyDistantRepairScopeV001}
  from './repair_distant_caption_human_v001.mts';

let b: Awaited<ReturnType<typeof reconstructDistantHumanRepairV001>>;
before(async () => { b = await reconstructDistantHumanRepairV001(); });
function validate(human = structuredClone(b.human)) {
  return validateDistantHumanObservationsV001(human, b.config, b.old, b.timeline, b.generation);
}
test('confirmed human boundaries reconstruct all formal artifacts deterministically', async () => {
  assert.deepEqual(b.changes.map(c=>c.humanFrames), [
    {startFrame:1255,endFrameExclusive:1338}, {startFrame:1505,endFrameExclusive:1565}, {startFrame:1576,endFrameExclusive:1671}]);
  for (const [key, ref] of Object.entries(b.artifacts) as [string, any][])
    assert.deepEqual(b.core[key], JSON.parse(await readFile(ref.path,'utf8')));
});
for (const [name, mutate] of [
  ['synthetic UI observation', (h:any)=>{h.observations[0].observation.recordPurpose='synthetic-ui-verification';}],
  ['different media', (h:any)=>{h.observations[0].observation.completedMediaBinding.fileSha256='0'.repeat(64);}],
  ['different subtitle identity', (h:any)=>{h.observations[1].observation.targetBinding.textIds=[];}],
  ['unobserved frame', (h:any)=>{h.observations[1].observation.request.start.presentedFrame++;}],
  ['audio sample mismatch', (h:any)=>{h.observations[2].observation.start.outputAudioSample++;}],
  ['missing human start', (h:any)=>{h.observations[1].observation.startMode='keep-current';h.observations[1].observation.request.startMode='keep-current';}],
  ['noninteger frame', (h:any)=>{h.observations[1].observation.request.start.frame+=0.5;}],
] as const) test(`reject ${name}`,()=>{const h=structuredClone(b.human);mutate(h);assert.throws(()=>validate(h));});
test('reject alteration to the other subtitle',()=>{
  const core=structuredClone(b.core);core.instruction.instructions[0].outputTime.endFrameExclusive++;
  assert.throws(()=>verifyDistantRepairScopeV001(b.old,core,b.changes));
});
test('reject subtitle text and display segmentation changes',()=>{
  const core=structuredClone(b.core);core.meaning.atomOccurrences[25].text+='変更';
  assert.throws(()=>verifyDistantRepairScopeV001(b.old,core,b.changes));
  const next=structuredClone(b.core);next.selection.response.captions[0].cues.pop();
  assert.throws(()=>verifyDistantRepairScopeV001(b.old,next,b.changes));
});
test('reject renderer or style changes',()=>{
  const core=structuredClone(b.core);core.rendererJob.extraStyleOverride=true;
  assert.throws(()=>verifyDistantRepairScopeV001(b.old,core,b.changes));
});
test('final frame boundary uses the admitted segment endpoint and preserves the first start',()=>{
  const last=b.timeline.segments.at(-1);
  assert.equal(b.changes[2].coreSourceInterval.sourceEndMs,last.sourceEndMs);
  assert.equal(b.changes[0].startMode,'keep-current');
  assert.equal(b.changes[0].humanFrames.startFrame,b.old.instruction.instructions[1].outputTime.startFrame);
});
