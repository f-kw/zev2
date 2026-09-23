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
  let draws = 0; const series = [];
  const adapter = {buildProps: element => element, renderStill: async (props, output, options) => {
    series.push(options.series); draws++; await writeFile(output, JSON.stringify(props));
  }, renderLineMask: async () => {throw new Error('unused');}};
  const options = {repositoryRoot, directory: path.join(repositoryRoot, 'generated'), adapter,
    drawingProfile: {fontSha256: 'fixed-font', implementationSha256: 'fixed-code'}};
  const output = name => path.join(repositoryRoot, name + '.png');
  return {options, adapter, output, series, draws: () => draws};
}

test('native cache requires two independent equal draws, survives another process adapter and binds all props and rules', async t => {
  const f = await fixture(t), first = await createPresentationNativeAssetCacheV001(f.options);
  await first.adapter.renderStill({text: '同じ', paint: 'normal'}, f.output('first'));
  assert.equal(first.stats.bitmapReuses, 0);
  await first.adapter.renderStill({text: '同じ', paint: 'normal'}, f.output('repeat'));
  assert.equal(first.stats.verifiedPairsAdded, 1); assert.equal(f.draws(), 2);
  assert.deepEqual(f.series, ['normal', 'repeat']);
  const proofName = (await readdir(f.options.directory)).find(name => name.endsWith('.json'));
  assert.deepEqual(JSON.parse(await readFile(path.join(f.options.directory, proofName))).renderSeries, ['normal', 'repeat']);
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

test('explicit repeated requests use separate series, masks also require independent cache admission, and reuse refuses overwrite', async t => {
  const f = await fixture(t), masks = [];
  const cache = await createPresentationNativeAssetCacheV001({...f.options,
    adapter: {...f.adapter, renderLineMask: async (props, index, output, options) => {
      masks.push(options.series); await writeFile(output, JSON.stringify({...props, inspectionLineIndex: index}));
    }}});
  await cache.adapter.renderStill({text: '再現先行'}, f.output('a'), {series: 'repeat'});
  await cache.adapter.renderStill({text: '再現先行'}, f.output('b'), {series: 'repeat'});
  assert.deepEqual(f.series, ['repeat', 'normal']);
  await cache.adapter.renderLineMask({text: '行'}, 0, f.output('mask-a'));
  await cache.adapter.renderLineMask({text: '行'}, 0, f.output('mask-b'));
  assert.deepEqual(masks, ['normal', 'repeat']);
  await cache.adapter.renderLineMask({text: '行'}, 0, f.output('mask-c'));
  assert.equal(masks.length, 2); assert.equal(cache.stats.bitmapReuses, 1);
  await writeFile(f.output('occupied'), 'preserve');
  await assert.rejects(cache.adapter.renderLineMask({text: '行'}, 0, f.output('occupied')), {code: 'EEXIST'});
  assert.equal(await readFile(f.output('occupied'), 'utf8'), 'preserve');
});
