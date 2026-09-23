import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {verifyQ4RequestFiles,acceptQ4Reply} from './q4-run.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const bytes=value=>JSON.stringify(value)+'\n';
async function request(t) {
  const directory=await mkdtemp(path.join(tmpdir(),'q4-request-test-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const files={'source-bindings.json':bytes({mediaRef:{fileSha256:'a'.repeat(64)}}),
    'judgment-input.json':bytes({inputSha256:'b'.repeat(64),connectionPolicy:'preserve-normal-cut'}),
    'judgment-prompt.md':'合成の依頼文\n'};
  for(const [name,data]of Object.entries(files))await writeFile(path.join(directory,name),data);
  const record={schemaVersion:'digest-quality-q4-request-v001',files:Object.fromEntries(Object.entries(files).map(([name,data])=>[name,hash(data)])),
    inputSha256:'b'.repeat(64),baseMediaSha256:'a'.repeat(64)};
  await writeFile(path.join(directory,'request.json'),bytes(record));
  return {directory,record,files};
}
test('判断を依頼した後の本文・元媒体対応・指示文の差替えを拒否する',async t=>{
  for(const target of ['judgment-input.json','source-bindings.json','judgment-prompt.md']) {
    const f=await request(t);await verifyQ4RequestFiles(f.directory);
    await writeFile(path.join(f.directory,target),f.files[target]+' ');
    await assert.rejects(verifyQ4RequestFiles(f.directory),/saved request differs/);
  }
});
test('依頼のhashも更新されてもC-all接続保存方針を解除できない',async t=>{
  const f=await request(t),changed=bytes({inputSha256:'b'.repeat(64),connectionPolicy:'semantic-choice'});
  await writeFile(path.join(f.directory,'judgment-input.json'),changed);
  f.record.files['judgment-input.json']=hash(changed);
  await writeFile(path.join(f.directory,'request.json'),bytes(f.record));
  await assert.rejects(verifyQ4RequestFiles(f.directory),/existing connections must remain fixed/);
});
test('入力照合失敗でも受信原文をparse前に保存し、受理記録を作らない',async t=>{
  const f=await request(t),raw='これはJSONではない生回答\n',replyPath=path.join(f.directory,'received.txt');
  await writeFile(replyPath,raw);
  await writeFile(path.join(f.directory,'judgment-prompt.md'),'変わった指示文');
  await assert.rejects(acceptQ4Reply({directory:f.directory,replyPath}),/saved request differs/);
  assert.equal(await readFile(path.join(f.directory,'judgment-reply.raw.json'),'utf8'),raw);
  assert.equal(JSON.parse(await readFile(path.join(f.directory,'judgment-rejection.json'),'utf8')).rawReplySha256,hash(raw));
  await assert.rejects(readFile(path.join(f.directory,'judgment-validation.json')),/ENOENT/);
});
