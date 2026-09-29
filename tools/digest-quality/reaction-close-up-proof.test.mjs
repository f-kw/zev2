import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,unlink,rmdir} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {bindDigestStructureFileV001 as bind} from './digest-structure-evidence.mjs';
import {readReactionProofV001 as read} from './reaction-close-up-proof.mjs';
import {runPresentationRendererChildProcessV001 as child} from '../../evals/clip_composition/render_presentation_v002.mjs';
const saved=process.env.REACTION_PROOF_COMPLETION;
async function changed(fn){const dir=await mkdtemp(path.join(os.tmpdir(),'zev-reaction-reader-test-')),file=path.join(dir,'completion.json');try{const c=JSON.parse(await readFile(saved,'utf8'));fn(c);await writeFile(file,JSON.stringify(c));await assert.rejects(read(await bind(file)));}finally{await unlink(file).catch(()=>{});await rmdir(dir);}}
test('child failure is rejected, never accepted as a generated frame',async()=>{await assert.rejects(child(process.execPath,['-e','process.exit(9)']));});
test('independent reader rejects an incomplete receipt before using media',async()=>{const dir=await mkdtemp(path.join(os.tmpdir(),'zev-reaction-incomplete-')),file=path.join(dir,'completion.json');try{await writeFile(file,JSON.stringify({schemaVersion:'reaction-close-up-proof-v001',status:'incomplete'}));await assert.rejects(read(await bind(file)));}finally{await unlink(file);await rmdir(dir);}});
test('independent reader rejects missing required evidence',async()=>{await assert.rejects(read({path:path.join(os.tmpdir(),'zev-reaction-not-created-completion.json'),fileSha256:'0'.repeat(64)}));});
test('recorded command tampering is rejected',{skip:!saved},()=>changed(c=>{c.rows[0].cropArgs[c.rows[0].cropArgs.indexOf('-filter_complex')+1]='[0:v]null[v]';}));
test('an output from the other framing state cannot replace the saved result',{skip:!saved},()=>changed(c=>{c.rows[0].video=c.rows[1].video;}));
test('missing retained image is not accepted',{skip:!saved},()=>changed(c=>{c.rows[0].background.path+='.missing';}));
test('a Reset relabeled as Normal is rejected',{skip:!saved},()=>changed(c=>{c.rows[2].stateRef=c.rows[1].stateRef;}));
