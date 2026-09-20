/** Q5-1 raw-first acceptance. Structural checks do not certify the meaning judgment. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyQ4Request} from './q4-run.mjs';
import {extractQ5CandidateInput} from './q5-candidate-input.mjs';
import {canonicalSha256} from './clock.mjs';
import {fileSha256} from './prepare.mjs';
import {decodePresentationCaptionB1StrictJsonV001} from '../../evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from '../../evals/clip_composition/presentation_output_directory_v001.mjs';

const here=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(here,'../..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const save=(file,value)=>writeFile(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const exact=(value,fields,where)=>assert(value&&typeof value==='object'&&!Array.isArray(value)
  &&Object.keys(value).length===fields.length&&fields.every(field=>Object.hasOwn(value,field)),where+': unexpected fields');
const text=(value,where)=>assert(typeof value==='string'&&value.trim().length,where+': nonempty text required');
const ids=(values,where)=>{assert(Array.isArray(values),where+': array required');
  assert(values.every(value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)),where+': invalid ID');
  assert.equal(new Set(values).size,values.length,where+': duplicate ID');};
async function boundBytes(ref) {
  exact(ref,['path','bytes','fileSha256'],'file reference');assert(path.isAbsolute(ref.path));
  const raw=await readFile(ref.path);assert.equal(raw.length,ref.bytes);assert.equal(sha(raw),ref.fileSha256,'bound bytes changed: '+ref.path);
  return raw;
}

export async function verifyQ5CandidateRequest(directory) {
  const request=JSON.parse(await readFile(path.join(directory,'request.json')));
  assert.equal(request.schemaVersion,'digest-quality-q5-1-candidate-request-v001');
  assert.equal(request.input.path,path.join(directory,'input.json'));assert.equal(request.prompt.path,path.join(directory,'prompt.md'));
  const input=JSON.parse(await boundBytes(request.input));
  const prompt=await boundBytes(request.prompt);assert.deepEqual(prompt,await readFile(path.join(here,'q5-candidate-prompt.md')));
  assert.deepEqual(request.sourceRefs,input.sourceRefs);
  exact(request.sourceRefs,['q4Request','q4SourceBindings','q4SemanticInput'],'original references');
  for(const ref of Object.values(request.sourceRefs))await boundBytes(ref);
  const q4Directory=path.dirname(request.sourceRefs.q4Request.path);
  assert.equal(request.sourceRefs.q4Request.path,path.join(q4Directory,'request.json'));
  assert.equal(request.sourceRefs.q4SourceBindings.path,path.join(q4Directory,'source-bindings.json'));
  assert.equal(request.sourceRefs.q4SemanticInput.path,path.join(q4Directory,'judgment-input.json'));
  const original=await verifyQ4Request(q4Directory);
  const asrBytes=await readFile(original.input.audioEvidence.asrRef.path);
  assert.equal(sha(asrBytes),original.input.audioEvidence.asrRef.fileSha256);
  assert.deepEqual(JSON.parse(asrBytes).segments,original.input.audioEvidence.allAsrSegments);
  assert.equal(await fileSha256(original.input.audioEvidence.sourceRef.path),original.input.audioEvidence.sourceRef.fileSha256);
  assert.deepEqual(input,extractQ5CandidateInput({source:original.source,input:original.input,sourceRefs:request.sourceRefs}));
  assert.equal(request.inputSha256,input.inputSha256);
  assert.equal(request.originalMediaVerified,true);assert.equal(request.completeCaptionCount,325);
  assert.equal(request.completeContextCount,12);assert.equal(request.completeAsrCount,462);
  for(const key of ['oldConcretePresentationLabelsProvided','oldHumanQualityAnswersProvided','newSemanticMediaObservation','contentEditAdopted'])assert.equal(request[key],false);
  return{request,input,source:original.source};
}

export function validateQ5CandidateReply(input,rawBytes) {
  const {inputSha256,...body}=input;assert.equal(inputSha256,canonicalSha256(body),'candidate input hash');
  const decoded=decodePresentationCaptionB1StrictJsonV001(rawBytes);
  assert.equal(decoded.status,'decoded','candidate reply must be strict JSON: '+(decoded.reason??''));
  const reply=decoded.value;
  exact(reply,['schemaVersion','inputSha256','completion','reviewedContextIds','coverageSummary','status','preferredCandidateId',
    'candidates','excludedConsiderations','humanQualityApproved'],'candidate reply');
  assert.equal(reply.schemaVersion,'digest-quality-q5-1-candidate-judgment-v001');assert.equal(reply.inputSha256,input.inputSha256);
  assert.equal(reply.completion,'complete');assert.equal(reply.humanQualityApproved,false);
  ids(reply.reviewedContextIds,'reviewed contexts');
  assert.deepEqual([...reply.reviewedContextIds].sort(),input.contexts.map(row=>row.contextId).sort(),'complete context coverage');
  text(reply.coverageSummary,'coverage summary');
  assert(['candidate-proposed','no-supported-candidate'].includes(reply.status));
  assert(Array.isArray(reply.candidates));assert(Array.isArray(reply.excludedConsiderations));
  const contexts=new Map(input.contexts.map(row=>[row.contextId,row]));
  const captions=new Map(input.captions.map(row=>[row.captionId,row]));
  const asr=new Map(input.asrSegments.map(row=>[row.id,row]));
  const checkRefs=(contextId,captionIds,asrIds)=>{
    assert(contexts.has(contextId),'unknown candidate context');ids(captionIds,'caption references');ids(asrIds,'ASR references');
    assert(captionIds.every(id=>captions.get(id)?.contextId===contextId),'caption outside candidate context');
    const {startFrame,endFrameExclusive}=contexts.get(contextId).range;
    assert(asrIds.every(id=>asr.has(id)&&asr.get(id).startSec<endFrameExclusive/input.original.fps
      &&asr.get(id).endSec>startFrame/input.original.fps),'ASR outside candidate context');
  };
  const meanings=['retainedExplanation','omittedExplanation','sharedInformation','uniqueInformationInOmission',
    'dependencies','normalAlternative','boundaryFeasibility','comparisonContext','selectionReason'];
  const candidateIds=[];
  for(const candidate of reply.candidates) {
    exact(candidate,['candidateId','contextId','keepCaptionIds','omitCaptionIds','keepAsrIds','omitAsrIds',...meanings,'unknowns'],'candidate');
    candidateIds.push(candidate.candidateId);
    checkRefs(candidate.contextId,candidate.keepCaptionIds,candidate.keepAsrIds);
    checkRefs(candidate.contextId,candidate.omitCaptionIds,candidate.omitAsrIds);
    assert(candidate.keepAsrIds.length&&candidate.omitAsrIds.length,'both explanations need saved speech references');
    assert(candidate.keepCaptionIds.every(id=>!candidate.omitCaptionIds.includes(id)),'same caption kept and omitted');
    assert(candidate.keepAsrIds.every(id=>!candidate.omitAsrIds.includes(id)),'same ASR kept and omitted');
    meanings.forEach(field=>text(candidate[field],field));
    assert(Array.isArray(candidate.unknowns)&&candidate.unknowns.length,'unknown observations required');candidate.unknowns.forEach(value=>text(value,'unknown'));
  }
  ids(candidateIds,'candidate IDs');
  for(const row of reply.excludedConsiderations){exact(row,['contextId','captionIds','asrIds','reason'],'excluded consideration');
    checkRefs(row.contextId,row.captionIds,row.asrIds);text(row.reason,'exclusion reason');}
  if(reply.status==='candidate-proposed')assert(candidateIds.length&&candidateIds.includes(reply.preferredCandidateId),'preferred candidate missing');
  else{assert.equal(candidateIds.length,0);assert.equal(reply.preferredCandidateId,null);assert(reply.excludedConsiderations.length,'no candidate needs exclusion evidence');}
  return{reply,rawReplySha256:sha(rawBytes),semanticsCertified:false};
}

export async function acceptQ5CandidateReply({directory,replyPath}) {
  const receiptDirectory=path.join(directory,'acceptance-v001');
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot:repo,outputDirectory:receiptDirectory});
  const raw=await readFile(replyPath);
  await mkdir(receiptDirectory);
  await writeFile(path.join(receiptDirectory,'candidate-reply.raw.json'),raw,{flag:'wx'});
  try {
    const {input}=await verifyQ5CandidateRequest(directory);
    const checked=validateQ5CandidateReply(input,raw);
    const result={schemaVersion:'digest-quality-q5-1-candidate-acceptance-v001',inputSha256:input.inputSha256,
      rawReplySha256:checked.rawReplySha256,status:checked.reply.status,candidateCount:checked.reply.candidates.length,
      preferredCandidateId:checked.reply.preferredCandidateId,completeContextCoverage:true,semanticsCertified:false,
      boundaryFixed:false,contentEditAdopted:false,humanQualityApproved:false};
    await save(path.join(receiptDirectory,'candidate-validation.json'),result);return result;
  }catch(error){await save(path.join(receiptDirectory,'candidate-rejection.json'),{rawReplySha256:sha(raw),message:error.message,
    contentEditAdopted:false,outputVideoGenerated:false});throw error;}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const [directory,replyPath,...extra]=process.argv.slice(2);
  if(!directory||!replyPath||extra.length)throw new Error('Usage: q5-run.mjs <candidate-directory> <new-raw-reply.json>');
  acceptQ5CandidateReply({directory:path.resolve(directory),replyPath:path.resolve(replyPath)})
    .then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.stack);process.exitCode=1;});
}
