import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {canonicalSha256} from './clock.mjs';
import {validateQ5CandidateReply,acceptQ5CandidateReply} from './q5-run.mjs';

// Synthetic structural evidence only; these statements are not C-all meaning judgments.
function fixture() {
  const body={schemaVersion:'digest-quality-q5-1-candidate-input-v001',original:{fps:30},
    contexts:[{contextId:'context-a',range:{startFrame:0,endFrameExclusive:300}},
      {contextId:'context-b',range:{startFrame:300,endFrameExclusive:600}}],
    captions:[{captionId:'caption-a',contextId:'context-a'},{captionId:'caption-b',contextId:'context-a'},
      {captionId:'caption-c',contextId:'context-b'}],
    asrSegments:[{id:'asr-a',startSec:1,endSec:2},{id:'asr-b',startSec:3,endSec:4},{id:'asr-c',startSec:11,endSec:12}]};
  const input={...body,inputSha256:canonicalSha256(body)};
  const candidate={candidateId:'candidate-a',contextId:'context-a',keepCaptionIds:['caption-a'],omitCaptionIds:['caption-b'],
    keepAsrIds:['asr-a'],omitAsrIds:['asr-b'],unknowns:['synthetic fixture, no meaning validation']};
  for(const field of ['retainedExplanation','omittedExplanation','sharedInformation','uniqueInformationInOmission',
    'dependencies','normalAlternative','boundaryFeasibility','comparisonContext','selectionReason'])candidate[field]='fixture '+field;
  return{input,reply:{schemaVersion:'digest-quality-q5-1-candidate-judgment-v001',inputSha256:input.inputSha256,completion:'complete',
    reviewedContextIds:['context-a','context-b'],coverageSummary:'synthetic full context coverage',status:'candidate-proposed',
    preferredCandidateId:'candidate-a',candidates:[candidate],excludedConsiderations:[],humanQualityApproved:false}};
}
const wire=value=>Buffer.from(JSON.stringify(value));
test('candidate and zero-supported outcomes remain distinct from semantic certification',()=>{
  const {input,reply}=fixture();assert.equal(validateQ5CandidateReply(input,wire(reply)).semanticsCertified,false);
  reply.status='no-supported-candidate';reply.preferredCandidateId=null;reply.candidates=[];
  reply.excludedConsiderations=[{contextId:'context-a',captionIds:['caption-a'],asrIds:['asr-a'],reason:'fixture unavailable boundary'}];
  assert.equal(validateQ5CandidateReply(input,wire(reply)).reply.candidates.length,0);
});
for(const [name,mutate]of Object.entries({
  'changed input binding':r=>r.inputSha256='0'.repeat(64),
  'incomplete context coverage':r=>r.reviewedContextIds.pop(),
  'duplicated context coverage':r=>r.reviewedContextIds.push('context-a'),
  'caption from another context':r=>r.candidates[0].omitCaptionIds=['caption-c'],
  'speech from another context':r=>r.candidates[0].omitAsrIds=['asr-c'],
  'same speech retained and omitted':r=>r.candidates[0].omitAsrIds=['asr-a'],
  'same caption retained and omitted':r=>r.candidates[0].omitCaptionIds=['caption-a'],
  'unrecorded preferred candidate':r=>r.preferredCandidateId='candidate-b',
  'failed judgment called complete':r=>r.completion='failed',
  'zero-candidate flag with candidate':r=>r.status='no-supported-candidate',
  'unbound extra cut frames':r=>r.candidates[0].startFrame=30,
  'human approval invented':r=>r.humanQualityApproved=true,
  'missing uncertainty':r=>r.candidates[0].unknowns=[],
  'unknown exclusion references':r=>r.excludedConsiderations=[{contextId:'context-a',captionIds:[],asrIds:['missing'],reason:'fixture'}]
}))test('rejects '+name,()=>{const {input,reply}=fixture();mutate(reply);assert.throws(()=>validateQ5CandidateReply(input,wire(reply)));});
test('strict raw JSON rejects duplicate keys, fences and trailing text',()=>{
  const {input,reply}=fixture(),raw=JSON.stringify(reply);
  for(const invalid of ['{"status":"candidate-proposed",'+raw.slice(1),'```json\n'+raw+'\n```',raw+' trailing'])
    assert.throws(()=>validateQ5CandidateReply(input,Buffer.from(invalid)));
});
test('raw-first file receipt preserves a rejected response and refuses overwrite',async()=>{
  const repository=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
  const directory=await mkdtemp(path.join(repository,'evals/clip_composition/outputs/presentation/stage4-editing-q5-fixture-receipt-'));
  try {
    const replyPath=path.join(directory,'fixture-reply.json'),raw=Buffer.from('{"fixture":"raw-reply-before-request-check"}\n');
    await writeFile(replyPath,raw,{flag:'wx'});
    await assert.rejects(acceptQ5CandidateReply({directory,replyPath}),/request.json/);
    const receipt=path.join(directory,'acceptance-v001');
    assert.deepEqual(await readFile(path.join(receipt,'candidate-reply.raw.json')),raw);
    const rejected=JSON.parse(await readFile(path.join(receipt,'candidate-rejection.json')));
    assert.equal(rejected.outputVideoGenerated,false);assert.equal(rejected.contentEditAdopted,false);
    await assert.rejects(acceptQ5CandidateReply({directory,replyPath}),/unused run directory/);
    assert.deepEqual(await readFile(path.join(receipt,'candidate-reply.raw.json')),raw);
  }finally{await rm(directory,{recursive:true,force:true});}
});
