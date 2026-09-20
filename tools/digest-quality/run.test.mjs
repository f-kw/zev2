import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import {verifySavedRequest,acceptRun,reviewRun} from './run.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
async function savedRequest() {
  const dir=await mkdtemp(path.join(os.tmpdir(),'q3-request-binding-'));
  const packet={inputSha256:'a'.repeat(64),media:{sha256:'b'.repeat(64)}};
  const input=JSON.stringify(packet), prompt='A concrete initial judgment prompt';
  await writeFile(path.join(dir,'judgment-input.json'),input);
  await writeFile(path.join(dir,'judgment-prompt.md'),prompt);
  await writeFile(path.join(dir,'request.json'),JSON.stringify({schemaVersion:'digest-quality-request-v001',inputSha256:packet.inputSha256,inputFileSha256:hash(input),promptSha256:hash(prompt),mediaSha256:packet.media.sha256}));
  return {dir,packet};
}
test('received judgment remains bound to the saved input bytes and prompt, even after a coordinated input/reply rehash',async()=>{
  const {dir,packet}=await savedRequest(); assert.deepEqual(await verifySavedRequest(dir),packet);
  packet.inputSha256='c'.repeat(64); await writeFile(path.join(dir,'judgment-input.json'),JSON.stringify(packet));
  const raw='{"inputSha256":"'+packet.inputSha256+'","untrusted":"actual received bytes"}';
  const reply=path.join(dir,'received.json');await writeFile(reply,raw);
  await assert.rejects(acceptRun(dir,reply),/saved judgment request/);
  assert.equal(await readFile(path.join(dir,'judgment-reply.raw.json'),'utf8'),raw);
  const rejection=JSON.parse(await readFile(path.join(dir,'judgment-rejection.json'),'utf8'));
  assert.equal(rejection.rawReplySha256,hash(raw));assert.equal(rejection.reviewCreated,false);
  await assert.rejects(reviewRun(dir,'/does-not-exist'),/saved judgment request/);
});
test('a different prompt or stored media binding is rejected before review conversion',async()=>{
  const a=await savedRequest();await writeFile(path.join(a.dir,'judgment-prompt.md'),'Changed instructions');
  await assert.rejects(verifySavedRequest(a.dir),/saved judgment request/);
  const b=await savedRequest();const ref=path.join(b.dir,'request.json');const request=JSON.parse(await readFile(ref,'utf8'));
  request.mediaSha256='f'.repeat(64);await writeFile(ref,JSON.stringify(request));
  await assert.rejects(verifySavedRequest(b.dir),/saved judgment request/);
});
