import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp, readFile, readdir, realpath, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {createPresentationNativeAssetCacheV001} from './presentation_native_asset_cache_v001.mjs';

async function fixture(t) {
  const repositoryRoot = await realpath(await mkdtemp(path.join(tmpdir(), 'zev-native-cache-')));
  t.after(() => rm(repositoryRoot, {recursive: true, force: true}));
  execFileSync('git', ['init', '-q', repositoryRoot]);
  await writeFile(path.join(repositoryRoot, '.gitignore'), '/generated/\n');
  let draws = 0;
  const adapter = {buildProps: element => element, renderStill: async (props, output) => {
    draws++; await writeFile(output, JSON.stringify(props));
  }, renderLineMask: async () => {throw new Error('unused');}};
  const options = {repositoryRoot, directory: path.join(repositoryRoot, 'generated'), adapter,
    drawingProfile: {fontSha256: 'fixed-font', implementationSha256: 'fixed-code'}};
  const output = name => path.join(repositoryRoot, name + '.png');
  return {options, adapter, output, draws: () => draws};
}

test('native cache requires two independent equal draws, survives another process adapter and binds all props and rules', async t => {
  const f = await fixture(t), first = await createPresentationNativeAssetCacheV001(f.options);
  await first.adapter.renderStill({text: '同じ', paint: 'normal'}, f.output('first'));
  assert.equal(first.stats.bitmapReuses, 0);
  await first.adapter.renderStill({text: '同じ', paint: 'normal'}, f.output('repeat'));
  assert.equal(first.stats.verifiedPairsAdded, 1); assert.equal(f.draws(), 2);
  const reopened = await createPresentationNativeAssetCacheV001(f.options);
  await reopened.adapter.renderStill({text: '同じ', paint: 'normal'}, f.output('reused'));
  assert.equal(reopened.stats.bitmapReuses, 1); assert.equal(f.draws(), 2);
  assert.deepEqual(await readFile(f.output('reused')), await readFile(f.output('first')));
  await reopened.adapter.renderStill({text: '同じ', paint: 'color'}, f.output('changed-paint'));
  assert.equal(f.draws(), 3);
  const newCode = await createPresentationNativeAssetCacheV001({...f.options, drawingProfile: {implementationSha256: 'new-code'}});
  await newCode.adapter.renderStill({text: '同じ', paint: 'normal'}, f.output('changed-code'));
  assert.equal(f.draws(), 4);
});

test('native cache refuses damaged native bytes and unignored paths instead of accepting a saved pass', async t => {
  const f = await fixture(t), cache = await createPresentationNativeAssetCacheV001(f.options);
  await cache.adapter.renderStill({text: '固定'}, f.output('first'));
  await cache.adapter.renderStill({text: '固定'}, f.output('repeat'));
  const png = (await readdir(f.options.directory)).find(name => name.endsWith('.png'));
  await writeFile(path.join(f.options.directory, png), 'damaged bitmap');
  await assert.rejects(cache.adapter.renderStill({text: '固定'}, f.output('damaged')));
  assert.equal(f.draws(), 2);
  await assert.rejects(createPresentationNativeAssetCacheV001({...f.options,
    directory: path.join(f.options.repositoryRoot, 'unignored')}), /ignore rule/);
});

test('disagreeing independent native draws never enter the reusable set', async t => {
  const f = await fixture(t);
  let count = 0;
  const cache = await createPresentationNativeAssetCacheV001({...f.options,
    adapter: {...f.adapter, renderStill: (_props, output) => writeFile(output, String(count++))}});
  await cache.adapter.renderStill({text: '固定'}, f.output('first'));
  await assert.rejects(cache.adapter.renderStill({text: '固定'}, f.output('repeat')), /native draw pair differs/);
  assert.deepEqual(await readdir(f.options.directory), []);
});
