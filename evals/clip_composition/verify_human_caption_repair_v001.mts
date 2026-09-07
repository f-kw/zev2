import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile, readdir} from 'node:fs/promises';
import {ROOT, readJson, readBound, bind, publish, fileSha, same} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {WORK, REPAIR, reconstructHumanRepairV001} from './repair_internal_caption_human_v001.mts';
const root = `${WORK}/caption-human-repair-render-v002`, manifestPath = `${root}/manifest.json`;
const manifest = await readJson(manifestPath), built = await reconstructHumanRepairV001();
for (const [k,b] of Object.entries(built.artifacts) as [string, any][]) {
  if(k !== 'rendererJob') {assert(same(manifest.artifacts[k], b));assert(same(await readBound(b), built.core[k]));}
}
const setup = await readBound(manifest.setupCorrection), job = await readBound(manifest.artifacts.rendererJob);
assert(same(setup.originalArtifacts, built.artifacts));assert(same(setup.rendererJob, manifest.artifacts.rendererJob));
assert.equal(await fileSha(path.join(ROOT, setup.implementation.path)), setup.implementation.fileSha256);
const expectedJob = structuredClone(built.core.rendererJob);expectedJob.jobId += '-render-v002';expectedJob.attemptId += '-render-v002';
expectedJob.publication = {admissionReceiptPath:`${root}/admission-receipt.json`,lineLayoutPath:`${root}/line-layout.json`,renderOutputRoot:`${root}/render`};
assert(same(expectedJob, job));
const layout = await readBound(manifest.renderer.lineLayout), priorLayout = await readBound(built.parent.renderer.lineLayout);
assert.equal(layout.entries.length,32);
for (const [i,row] of layout.entries.entries()) {
  assert.equal(row.instructionId, built.core.instruction.instructions[i].instructionId);
  const previous = structuredClone(priorLayout.entries[i+1]);previous.instructionId=row.instructionId;
  assert.deepEqual(row, previous, 'ACTUAL_LAYOUT_TEXT_SOURCE_IDS_OR_LINEBREAK_CHANGED');
}
const execution = await readBound(manifest.renderer.execution);assert.equal(execution.result.status,'completed');
assert.equal(execution.result.qc.status,'passed');assert.deepEqual(execution.result.qc.violations,[]);
assert.equal(execution.result.qc.mediaEvidence.observed.audio.packetPayloadSha256,built.generation.audio.encoded.packetPayloadSha256);
assert.equal(await fileSha(path.join(ROOT,manifest.renderer.video.path)),manifest.renderer.video.fileSha256);
const files: any[]=[];
for (const base of [`${REPAIR}/process-observations`,`${root}/process-observations`]) {
  async function collect(p:string){for(const e of await readdir(path.join(ROOT,p),{withFileTypes:true})) {
    const name=`${p}/${e.name}`;if(e.isDirectory()) await collect(name); else {const bytes=await readFile(path.join(ROOT,name));
      files.push({path:name,fileSha256:await fileSha(path.join(ROOT,name)),sizeBytes:bytes.length,encoding:'base64',bytes:bytes.toString('base64')});}
  }}await collect(base);
}
const processes = await publish(`${root}/process-observation-evidence.json`,{schemaVersion:'digest-human-caption-process-evidence-v001',files});
await publish(`${root}/final-verification.json`,{schemaVersion:'digest-human-caption-final-verification-v001',status:'passed',
  manifestBinding:bind(manifestPath,manifest),processEvidence:processes,
  checks:{reconstructedFormalInputs:'exact', actualLayout32TextSourceIdsAndLinebreaks:'exact', other30FrameIntervals:'exact',
    twoHumanFrames:'exact',originalMediaAndAudioPackets:'unchanged',rendererAndStyle:'unchanged',qc:'passed'},
  humanQuality:'pending-three-local-reviews'});
console.log(JSON.stringify({status:'passed',processEvidenceFiles:files.length,video:manifest.renderer.video}));
