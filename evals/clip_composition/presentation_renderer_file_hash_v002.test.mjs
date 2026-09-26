import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, open, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileSha256V002} from './presentation_renderer_qc_v002.mjs';
import {verifyPresentationNativeInputRefV001} from './presentation_native_frame_qc_v001.mjs';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';

test('renderer hashes empty and ordinary files without changing SHA semantics', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zev-render-hash-'));
  try {
    for (const bytes of [Buffer.alloc(0), Buffer.from('ZEV\u0000検証\n')]) {
      const file = path.join(directory, 'input');
      await writeFile(file, bytes);
      assert.equal(await fileSha256V002(file), createHash('sha256').update(bytes).digest('hex'));
    }
    await assert.rejects(fileSha256V002(path.join(directory, 'missing')), {code: 'ENOENT'});
  } finally {await rm(directory, {recursive: true});}
});

test('renderer hashes beyond the 2 GiB readFile limit, including the last byte', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zev-render-large-hash-'));
  try {
    const file = path.join(directory, 'large'), boundary = 2 ** 31;
    const handle = await open(file, 'wx');
    try {
      await handle.truncate(boundary + 1);
      await handle.write(Buffer.from([0x5a]), 0, 1, boundary);
    } finally {await handle.close();}
    const expected = createHash('sha256'), zeroBlock = Buffer.alloc(1024 * 1024);
    for (let i = 0; i < boundary / zeroBlock.length; i++) expected.update(zeroBlock);
    expected.update(Buffer.from([0x5a]));
    const digest = expected.digest('hex');
    assert.equal(await fileSha256V002(file), digest);
    await verifyPresentationNativeInputRefV001({role: 'base-media', path: file, fileSha256: digest});
    await assert.rejects(verifyPresentationNativeInputRefV001({role: 'base-media', path: file,
      fileSha256: '0'.repeat(64)}), /input bytes changed/);
  } finally {await rm(directory, {recursive: true});}
});

test('native input verification preserves canonical checks and rejects changed bytes', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zev-native-bound-'));
  try {
    const file = path.join(directory, 'input.json'), value = {z: 1, a: ['字幕']};
    await writeFile(file, JSON.stringify(value, null, 2));
    const ref = {role: 'plan', path: file, fileSha256: await fileSha256V002(file),
      canonicalSha256: createHash('sha256').update(canonicalJson(value)).digest('hex')};
    await verifyPresentationNativeInputRefV001(ref);
    await assert.rejects(verifyPresentationNativeInputRefV001({...ref, canonicalSha256: '0'.repeat(64)}),
      /input canonical content changed/);
    await writeFile(file, JSON.stringify({...value, z: 2}));
    await assert.rejects(verifyPresentationNativeInputRefV001(ref), /input bytes changed/);
  } finally {await rm(directory, {recursive: true});}
});
