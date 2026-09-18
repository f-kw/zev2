import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {copyFile, lstat, mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from './presentation_output_directory_v001.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
async function bind(file) {
  const metadata = await lstat(file);
  assert(metadata.isFile() && !metadata.isSymbolicLink(), 'native cache file must be regular');
  const sha = createHash('sha256');
  for await (const chunk of createReadStream(file)) sha.update(chunk);
  return {path: file, bytes: metadata.size, fileSha256: sha.digest('hex')};
}

/** Reuse a bitmap only after two independent native draws agreed under the
 * same complete props and fixed drawing implementation. All later layout and
 * completed-video checks still run on the copied current artifact. */
export async function createPresentationNativeAssetCacheV001({repositoryRoot, directory, adapter, drawingProfile}) {
  assert(path.isAbsolute(directory));
  const relative = path.relative(repositoryRoot, directory);
  assert(relative && relative !== '..' && !relative.startsWith('../') && !path.isAbsolute(relative));
  let current = repositoryRoot;
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part);
    try {const stat = await lstat(current); assert(stat.isDirectory() && !stat.isSymbolicLink());}
    catch (error) {if (error.code !== 'ENOENT') throw error;}
  }
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot,
    outputDirectory: path.join(directory, '.new-native-cache-entry')});
  try {await lstat(directory);} catch (error) {
    if (error.code !== 'ENOENT') throw error;
    assertIgnoredPresentationOutputDirectoryV001({repositoryRoot, outputDirectory: directory});
    await mkdir(directory, {recursive: true});
  }
  const profileSha256 = hash(canonicalJson(drawingProfile)), pending = new Map();
  const stats = {nativeDraws: 0, bitmapReuses: 0, verifiedPairsAdded: 0};
  const draw = async (props, outputPath, render) => {
    const propsSha256 = hash(canonicalJson(props));
    const key = hash(canonicalJson({profileSha256, propsSha256}));
    const pngPath = path.join(directory, key + '.png'), proofPath = path.join(directory, key + '.json');
    try {
      const proofRef = await bind(proofPath), proof = JSON.parse(await readFile(proofPath, 'utf8'));
      const {proofSha256, ...body} = proof;
      assert.equal(hash(canonicalJson(body)), proofSha256);
      assert.equal(proof.schemaVersion, 'presentation-native-asset-cache-v001');
      assert.equal(proof.key, key); assert.equal(proof.profileSha256, profileSha256);
      assert.equal(proof.propsSha256, propsSha256);
      assert.notEqual(proof.first.path, proof.repeat.path);
      assert.equal(proof.first.fileSha256, proof.repeat.fileSha256);
      assert.deepEqual(await bind(pngPath), proof.png);
      assert.equal(proof.png.fileSha256, proof.first.fileSha256);
      await copyFile(pngPath, outputPath);
      assert.equal((await bind(outputPath)).fileSha256, proof.png.fileSha256);
      assert.deepEqual(await bind(proofPath), proofRef);
      stats.bitmapReuses++;
      return;
    } catch (error) {if (error.code !== 'ENOENT') throw error;}
    await render(); stats.nativeDraws++;
    assert.equal(hash(canonicalJson(props)), propsSha256, 'native draw mutated props');
    const actual = await bind(outputPath), first = pending.get(key);
    if (!first) {pending.set(key, actual); return;}
    assert.notEqual(first.path, actual.path, 'deterministic cache pair needs distinct native outputs');
    assert.deepEqual(await bind(first.path), first);
    assert.equal(first.fileSha256, actual.fileSha256, 'native draw pair differs');
    await copyFile(actual.path, pngPath);
    const body = {schemaVersion: 'presentation-native-asset-cache-v001', key, profileSha256, propsSha256,
      first, repeat: actual, png: await bind(pngPath)};
    await writeFile(proofPath, JSON.stringify({...body, proofSha256: hash(canonicalJson(body))}, null, 2) + '\n', {flag: 'wx'});
    pending.delete(key); stats.verifiedPairsAdded++;
  };
  return {stats, profileSha256, directory,
    adapter: {...adapter,
      renderStill: (props, outputPath) => draw(props, outputPath, () => adapter.renderStill(props, outputPath)),
      renderLineMask: (props, lineIndex, outputPath) => draw({...props, inspectionLineIndex: lineIndex}, outputPath,
        () => adapter.renderLineMask(props, lineIndex, outputPath))}};
}
