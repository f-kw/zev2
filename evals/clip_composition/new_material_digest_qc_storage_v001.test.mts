import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {saveJsonInChunks} from './run_new_material_digest_20260926_qc_resume.mts';

test('QC evidence chunked save preserves JSON values and refuses overwriting',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'zev-qc-json-'));
  try {
    const file=path.join(dir,'evidence.json');
    const value={text:'字幕\n"\\',optional:undefined,values:[undefined,null,1,{nested:{x:'確認'}}]};
    await saveJsonInChunks(file,value);
    assert.deepEqual(JSON.parse(await readFile(file,'utf8')),JSON.parse(JSON.stringify(value)));
    await assert.rejects(saveJsonInChunks(file,{changed:true}),{code:'EEXIST'});
    assert.deepEqual(JSON.parse(await readFile(file,'utf8')),JSON.parse(JSON.stringify(value)));
  } finally {await rm(dir,{recursive:true});}
});

test('QC evidence exceeding one Node string is written with all bytes intact',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'zev-qc-large-json-'));
  try {
    const file=path.join(dir,'evidence.json'),unit='x'.repeat(1024*1024), values=Array(600).fill(unit);
    const expected=createHash('sha256');expected.update('[');
    for(let i=0;i<values.length;i++){if(i)expected.update(',');expected.update('"'+unit+'"');}
    expected.update(']');
    await saveJsonInChunks(file,values);
    assert((await stat(file)).size>600*1024*1024);
    const actual=createHash('sha256');for await(const chunk of createReadStream(file))actual.update(chunk);
    assert.equal(actual.digest('hex'),expected.digest('hex'));
  } finally {await rm(dir,{recursive:true});}
});
