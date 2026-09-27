/** Saved-run evidence-only verification. No media tools, rendering, STT or API calls. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, writeFile, mkdir, stat, unlink} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {readJsonInChunks, saveJsonInChunks} from './run_new_material_digest_20260926_qc_resume.mts';
import {readPresentationQcEvidenceV001, writePresentationQcEvidenceV001} from './presentation_qc_evidence_store_v001.mjs';
import {validatePresentationNativeFrameQcInspectionsV001} from './presentation_native_frame_qc_v001.mjs';
const root=path.resolve(process.argv[3]??'runtime/artifacts/qc-evidence-common-20260927-v001/measurement-v003');
const original=path.resolve('runtime/artifacts/digest-new-material-20260926-v001/presentation/qc-resume-attempt-002/finite-result.json');
const commonKeys=['baselinePlan','autoPresentation','orchestrationInput','inputManifest','renderRange','sceneBindings'];
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const hashFile=async(p:string)=>{const h=createHash('sha256');for await(const b of createReadStream(p))h.update(b);return h.digest('hex');};
const read=async(p:string)=>JSON.parse(await readFile(p,'utf8'));
const save=async(n:string,v:any)=>writeFile(path.join(root,n),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
// Independent complete-value digest v2: scalar type/value tokens are hashed in
// their parent node, avoiding a new crypto object for every repeated scalar.
function logicalDigest(value:any){
 const cache=new Map<object,string>();
 const token=(v:any):any=>v===null||typeof v!=='object'?['value',v]:['node',visit(v)];
 function visit(v:any):string {
  const prior=cache.get(v);if(prior)return prior;
  const body=Array.isArray(v)?['array',Array.from(v,child=>token(child===undefined?null:child))]
   :['object',Object.keys(v).filter(k=>v[k]!==undefined).sort().map(key=>[key,token(v[key])])];
  const result=sha(JSON.stringify(body));cache.set(v,result);return result;
 }
 return sha(JSON.stringify(token(value)));
}
const memory=()=>({maxRssBytes:process.resourceUsage().maxRSS*1024,...process.memoryUsage()});
const stage=process.argv[2];await mkdir(root,{recursive:true});
const startedAt=new Date().toISOString(),start=performance.now();
if(stage==='legacy'){
 const readStart=performance.now();const value=readJsonInChunks(original);const readSeconds=(performance.now()-readStart)/1000;
 console.log(new Date().toISOString(),'legacy read',readSeconds);
 await save('legacy-read-checkpoint.json',{readSeconds,memory:memory(),inspections:value.inspections.length,status:value.status,violations:value.violations});
 const writeStart=performance.now();const copy=path.join(root,'legacy-copy.json');await saveJsonInChunks(copy,value);const serializationSeconds=(performance.now()-writeStart)/1000;
 console.log(new Date().toISOString(),'legacy write',serializationSeconds);
 const copiedSha=await hashFile(copy),originalSha=await hashFile(original);assert.equal(copiedSha,originalSha);
 console.log(new Date().toISOString(),'legacy byte identity passed');
 const digestStart=performance.now(),logicalSha256=logicalDigest(value),logicalDigestSeconds=(performance.now()-digestStart)/1000;
 console.log(new Date().toISOString(),'legacy complete-value digest',logicalDigestSeconds);
 const compactStart=performance.now();const compact=await writePresentationQcEvidenceV001(path.join(root,'shared-qc.json'),value);const conversionWriteSeconds=(performance.now()-compactStart)/1000;
 await save('legacy-measurement.json',{stage,startedAt,endedAt:new Date().toISOString(),elapsedSeconds:(performance.now()-start)/1000,
 source:{path:original,bytes:(await stat(original)).size,fileSha256:originalSha},readSeconds,serializationSeconds,logicalDigestSeconds,conversionWriteSeconds,
 logicalDigestVersion:'complete-json-merkle-v002',
 peakMemory:memory(),copyByteIdentical:true,logicalSha256,compact,status:value.status,violations:value.violations,
 inspectionCount:value.inspections.length,sampleCount:value.evidence.samples.length,
 commonLogicalBytes:Object.fromEntries(commonKeys.map(key=>[key,Object.hasOwn(value.evidence,key)?Buffer.byteLength(JSON.stringify(value.evidence[key])):0]))});
 await unlink(copy); // Only the byte-verified copy created by this process. Original remains untouched.
 console.log('legacy completed');
}else if(stage==='shared'){
 const before=await read(path.join(root,'legacy-measurement.json'));
 const readStart=performance.now();const value=await readPresentationQcEvidenceV001(path.join(root,'shared-qc.json'),{expectedFileSha256:before.compact.fileSha256});const readSeconds=(performance.now()-readStart)/1000;const readPeakMemory=memory();
 for(const local of value.inspections)for(const key of commonKeys)if(value.evidence[key]&&typeof value.evidence[key]==='object')assert.equal(local.nativeFrameQc[key],value.evidence[key]);
 const digestStart=performance.now();assert.equal(logicalDigest(value),before.logicalSha256);const logicalDigestSeconds=(performance.now()-digestStart)/1000;
 const plan=await read(path.resolve('evals/clip_composition/outputs/presentation/.new-material-digest-20260926-first-draft-v001.presentation-renderer-v002-work-JdfNbP/scratch/native-qc-preparation/plan.json'));
 const validationStart=performance.now();const result=validatePresentationNativeFrameQcInspectionsV001({plan,inspections:value.inspections});const validationSeconds=(performance.now()-validationStart)/1000;
 assert.equal(result.status,before.status);assert.deepEqual(result.violations,before.violations);
 assert.equal(result.violations.length,1);assert(result.violations[0].instructionId.endsWith('000103'));
 const failedSamples=value.evidence.samples.filter((sample:any)=>sample.visible!==true);
 assert.equal(failedSamples.length,1);const sample103=failedSamples[0];
 assert(sample103.instructionId.endsWith('000103'));assert.equal(sample103.frame,7801);
 const expected103=sample103.classes.find((row:any)=>row.id===sample103.expectedClassId);
 const duplicate103=sample103.classes.find((row:any)=>row.referenceIds.includes('add-caption-101-native-static'));
 assert.equal(expected103.absoluteRgbDifference,1345125);assert.equal(duplicate103.absoluteRgbDifference,1344947);
 const writeStart=performance.now();const again=await writePresentationQcEvidenceV001(path.join(root,'shared-rewrite.json'),value);const serializationSeconds=(performance.now()-writeStart)/1000;
 assert.equal(again.fileSha256,before.compact.fileSha256);
 const video=path.resolve('evals/clip_composition/outputs/presentation/new-material-digest-20260926-first-draft-qc-resume-v001/presentation-rendered-v002.mp4');
 const videoSha256=await hashFile(video);assert.equal(videoSha256,'11611ff2071aa21325eb672094b90f5c495b77af311aa409a460c69e7cb16b8a');
 assert.equal(await hashFile(original),before.source.fileSha256);
 await save('shared-measurement.json',{stage,startedAt,endedAt:new Date().toISOString(),elapsedSeconds:(performance.now()-start)/1000,
 readSeconds,readPeakMemory,logicalDigestSeconds,validationSeconds,serializationSeconds,peakMemory:memory(),bytes:again.bytes,
 logicalDigestMatches:true,commonObjectsShared:true,status:result.status,violations:result.violations,
 inspectionCount:value.inspections.length,sampleCount:value.evidence.samples.length,videoSha256,originalEvidenceUnchanged:true,
 commonLogicalBytes:Object.fromEntries(commonKeys.map(key=>[key,Object.hasOwn(value.evidence,key)?Buffer.byteLength(JSON.stringify(value.evidence[key])):0])),
 nativeObservations:{visible:value.evidence.samples.length-failedSamples.length,notVisible:failedSamples.length,
  failure103:{instructionId:sample103.instructionId,frame:sample103.frame,visible:sample103.visible,
   expectedClassId:sample103.expectedClassId,expected:expected103.absoluteRgbDifference,
   duplicate:duplicate103.absoluteRgbDifference,referenceCount:sample103.references.length,classCount:sample103.classes.length}},
 videoEncodes:0,captionRenders:0,sttRuns:0,apiCalls:0});
 await unlink(path.join(root,'shared-rewrite.json'));console.log('shared completed');
}else if(stage==='report'){
 const before=await read(path.join(root,'legacy-measurement.json'));
 const after=await read(path.join(root,'shared-measurement.json'));
 const checkpoint=await read(path.join(root,'legacy-read-checkpoint.json'));
 const comparison=(oldValue:number,newValue:number)=>({before:oldValue,after:newValue,
  reduction:oldValue-newValue,reductionPercent:(oldValue-newValue)*100/oldValue});
 const commonBytes=Object.values(after.commonLogicalBytes).reduce((sum:number,n:any)=>sum+n,0);
 const bindings=[];for(const name of ['legacy-measurement.json','shared-measurement.json','legacy-read-checkpoint.json']){
  const file=path.join(root,name);bindings.push({path:path.relative(process.cwd(),file),bytes:(await stat(file)).size,fileSha256:await hashFile(file)});
 }
 const record={schemaVersion:'qc-evidence-common-measurement-v001',environment:{node:process.version,
  platform:process.platform,arch:process.arch,release:os.release(),cpu:os.cpus()[0]?.model,totalMemoryBytes:os.totalmem()},
  scope:'Saved finite evidence only; single measurement per format on the same Mac; no media execution; cache/other-process contention uncontrolled',
  source:before.source,sharedEvidence:before.compact,sourceBindings:bindings,
  comparisons:{jsonBytes:comparison(before.source.bytes,after.bytes),
   readSeconds:comparison(before.readSeconds,after.readSeconds),
   readOnlyPeakRssBytes:comparison(checkpoint.memory.maxRssBytes,after.readPeakMemory.maxRssBytes),
   serializationSeconds:comparison(before.serializationSeconds,after.serializationSeconds)},
  validation:{oldSeparateValidationSeconds:null,oldReason:'Original native verdict retained; validation-only time was not separately measured',
   newNativeValidationSeconds:after.validationSeconds,readIncludes:'New reader verifies every node hash, reachability and whole-file SHA; old reader parses chunked JSON',
   status:after.status,violations:after.violations,nativeObservations:after.nativeObservations},
  unchanged:{logicalDigestVersion:before.logicalDigestVersion,logicalSha256:before.logicalSha256,
   completeValueMatches:after.logicalDigestMatches,originalEvidenceUnchanged:after.originalEvidenceUnchanged,videoSha256:after.videoSha256},
  inspections:after.inspectionCount,samples:after.sampleCount,
  commonDuplication:{logicalBytesByField:after.commonLogicalBytes,oneSetLogicalBytes:commonBytes,
   originalCopiesIncludingGlobal:after.inspectionCount+1,extraExpandedCommonLogicalBytes:commonBytes*after.inspectionCount,
   note:'Sum of compact JSON value bytes for present named common fields, excluding key text and transport formatting; absent autoPresentation is zero. Not a physical file size.'},
  temporaryEvidenceJson:{oldOneArtifactBytes:before.source.bytes,newOneArtifactBytes:after.bytes,
   savedBytesPerArtifact:before.source.bytes-after.bytes,originalFilesRetained:true,
   note:'Capacity difference per equivalent evidence file. Original evidence intentionally remains on disk; only copies made for this measurement were removed. Images are unchanged.'},
  verificationOverhead:{legacyLogicalDigestSeconds:before.logicalDigestSeconds,
   sharedLogicalDigestSeconds:after.logicalDigestSeconds,legacyToNewFirstConversionSeconds:before.conversionWriteSeconds,
   legacyWorkerPeakRssBytes:before.peakMemory.maxRssBytes,sharedWorkerPeakRssBytes:after.peakMemory.maxRssBytes,
   note:'Whole-worker peaks include complete-value digest and conversion/validation; do not describe these as serialization-only memory.'},
  actions:{videoEncodes:after.videoEncodes,captionRenders:after.captionRenders,sttRuns:after.sttRuns,paidApiCalls:after.apiCalls}};
 const output=path.resolve('docs/reports/qc-evidence-common-20260927/measurement.json');
 await writeFile(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(output);
}else throw new Error('stage must be legacy, shared or report');
