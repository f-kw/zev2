import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile, readdir, mkdir, writeFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {request as httpRequest} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startPresentationEditingServiceV001} from './serve_presentation_editing_v001.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixturePath = process.env.ZEV_EDITING_SERVICE_FIXTURE_CONFIG;
test('loopback HTTPの保存・再起動・Range配信と外部要求/path/競合の拒否', {skip: !fixturePath}, async () => {
  const original = JSON.parse(await readFile(fixturePath, 'utf8')), id = randomUUID();
  const config = {...original, port: 0, directory: path.join(repo, 'runtime/presentation-editing/service-test-' + id),
    generatedRoot: path.join(repo, 'evals/clip_composition/outputs/presentation/stage4-editing-service-test-' + id)};
  let service = await startPresentationEditingServiceV001(config);
  const fixedNames = ['captionAuto', 'connectionAuto', 'selectionRecord', 'connectionOverrides'];
  const fixed = await Promise.all(fixedNames.map(name => readFile(path.join(config.directory, name + '.json'), 'utf8')));
  let origin = new URL(service.url).origin;
  const request = (route, options = {}) => fetch(origin + '/api/editing' + route, options);
  const post = (route, content, token, extra = {}) => request(route, {method: 'POST', headers: {
    'content-type': 'application/json', origin, 'x-zev-editing-token': token, ...extra}, body: JSON.stringify(content)});
  try {
    const page = await fetch(service.url);
    assert.equal(page.status, 200); const html = await page.text(); assert.match(html, /<div id="app">/);
    assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    const assetPaths = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(match => match[1]);
    assert(assetPaths.some(asset => asset.endsWith('.js')) && assetPaths.some(asset => asset.endsWith('.css')));
    for (const asset of assetPaths) {
      const resource = await fetch(origin + asset); assert.equal(resource.status, 200);
      assert(resource.headers.get('content-type').includes(asset.endsWith('.js') ? 'javascript' : 'css'));
      assert((await resource.arrayBuffer()).byteLength > 0);
    }
    assert.equal((await fetch(service.url + '/')).status, 200);
    const stateResponse = await request('/state'), state = await stateResponse.json();
    assert.equal(stateResponse.status, 200); assert.equal(state.captions.length, 32); assert.equal(state.connections.length, 6);
    const caption = state.captions.find(row => row.status === 'normal');
    const change = {expectedRevision: state.revision, kind: 'caption', itemId: caption.id, selection: {preset: 'panel'}};
    const generatedBefore = await readdir(config.generatedRoot);
    const unchecked = await (await request('/targets/caption/' + encodeURIComponent(caption.id))).json();
    assert.equal(unchecked.text, caption.text); assert.equal(unchecked.revision, state.revision);
    assert(unchecked.options.every(row => row.status === 'unchecked' && !Object.hasOwn(row, 'enabled')));
    assert(unchecked.peakOptions.length > 0 && unchecked.peakOptions.every(row => row.status === 'unchecked'));
    assert.deepEqual(await readdir(config.generatedRoot), generatedBefore, '対象GETだけでは実描画を開始しない');
    assert.equal((await post('/check', change, state.csrfToken, {origin: 'https://unrelated.invalid'})).status, 403);
    assert.equal((await post('/check', change, '')).status, 403);
    assert.equal((await post('/check', {...change, applicabilityOptions: {}}, state.csrfToken)).status, 400);
    const checkedResponse = await post('/check', change, state.csrfToken);
    assert.equal(checkedResponse.status, 200); const checked = await checkedResponse.json();
    assert.equal(checked.status, 'applicable'); assert.equal(checked.revision, state.revision);
    assert.equal(checked.kind, 'caption'); assert.equal(checked.itemId, caption.id);
    assert.deepEqual(checked.selection, change.selection); assert(checked.checkKey);
    const checkedDetails = await (await request('/targets/caption/' + encodeURIComponent(caption.id))).json();
    assert.equal(checkedDetails.options.find(row => row.value === 'panel').status, 'applicable');
    assert.equal(checkedDetails.options.find(row => row.value === 'normal').status, 'unchecked');
    assert.equal((await post('/save', change, state.csrfToken, {origin: 'https://unrelated.invalid'})).status, 403);
    assert.equal((await post('/save', change, '')).status, 403);
    // Node fetch rewrites Host. Use HTTP's explicit header for this negative test.
    const wrongHostStatus = await new Promise((resolve, reject) => {
      const sent = httpRequest(origin + '/api/editing/state', {headers: {host: 'unrelated.invalid'}}, response => {
        response.resume(); response.on('end', () => resolve(response.statusCode));
      }); sent.on('error', reject); sent.end();
    });
    assert.equal(wrongHostStatus, 403);
    assert.equal((await request('/state', {headers: {origin: 'https://unrelated.invalid'}})).status, 403);
    assert.equal((await post('/save', {...change, path: '/tmp/arbitrary-target'}, state.csrfToken)).status, 400);
    assert.equal((await post('/command', {command: 'touch /tmp/not-allowed'}, state.csrfToken)).status, 404);
    assert.equal((await request('/media/..%2f..%2fdocument.json')).status, 404);
    assert.equal((await fetch(origin + '/runtime/presentation-editing/document.json')).status, 404);
    assert.equal((await request('/state')).status, 200);
    assert.equal((await request('/state?secret-query=must-not-be-recorded')).status, 200);
    assert.equal((await fetch(origin + '/must-not-be-recorded')).status, 404);
    const bad = await post('/save', {...change, selection: {preset: 'color', scope: 'partial-caption',
      startUtf16: 0, endUtf16: 1, selectedText: '<script>'}}, state.csrfToken);
    assert.equal(bad.status, 400);
    assert.equal((await (await request('/state')).json()).revision, state.revision);
    const good = await post('/save', change, state.csrfToken); assert.equal(good.status, 200);
    const saved = await good.json(); assert.notEqual(saved.revision, state.revision);
    assert.equal(saved.captions.find(row => row.id === caption.id).preset, 'panel');
    assert.equal((await post('/save', change, state.csrfToken)).status, 409);
    assert.equal((await post('/check', change, state.csrfToken)).status, 409);
    let checkFinished = false;
    const selectedShake = {expectedRevision: saved.revision, kind: 'caption', itemId: caption.id, selection: {preset: 'shake'}};
    const pendingCheck = post('/check', selectedShake, state.csrfToken).then(async response => {
      const value = await response.json(); checkFinished = true; return {status: response.status, value};
    });
    pendingCheck.catch(() => {});
    const deadline = Date.now() + 10000;
    let checking;
    do {
      checking = await (await request('/targets/caption/' + encodeURIComponent(caption.id))).json();
      if (checking.options.find(row => row.value === 'shake').status === 'checking') break;
      assert.equal(checkFinished, false, '選択した実検査の開始を観測できませんでした');
      assert(Date.now() < deadline, '検査中の状態が返りませんでした');
      await delay(10);
    } while (true);
    assert.equal(checkFinished, false);
    const otherId = state.captions.find(row => row.id !== caption.id).id;
    const [readDuring, otherDuring] = await Promise.race([
      Promise.all([request('/state').then(response => response.json()),
        request('/targets/caption/' + encodeURIComponent(otherId)).then(response => response.json())]),
      pendingCheck.then(() => {throw new Error('検査完了まで状態・別対象GETが待たされました');}),
    ]);
    assert.equal(checkFinished, false); assert.equal(readDuring.revision, saved.revision); assert.equal(otherDuring.id, otherId);
    const completedCheck = await pendingCheck;
    assert.equal(completedCheck.status, 200); assert.equal(completedCheck.value.status, 'applicable');
    assert.deepEqual(completedCheck.value.selection, selectedShake.selection);
    const afterCheck = await (await request('/targets/caption/' + encodeURIComponent(caption.id))).json();
    assert.equal(afterCheck.options.find(row => row.value === 'shake').status, 'applicable');
    assert.equal((await (await request('/state')).json()).revision, saved.revision, '検査だけで保存を変更しない');
    const after = await Promise.all(fixedNames.map(name => readFile(path.join(config.directory, name + '.json'), 'utf8')));
    assert.deepEqual(after, fixed);
    const oldMedia = await request('/media/original.mp4', {method: 'HEAD', headers: {range: 'bytes=0-31'}});
    assert.equal(oldMedia.status, 206); assert.equal(oldMedia.headers.get('content-length'), '32');
    const seek = await (await request('/seek?' + new URLSearchParams({mediaId: 'original', kind: 'caption', itemId: caption.id}))).json();
    const found = await (await request('/playhead?' + new URLSearchParams({mediaId: 'original', seconds: String(seek.seconds)}))).json();
    assert.deepEqual(found.captionIds, [caption.id]);
    assert(saved.media.every(row => !row.isCurrent), '工程IIIの動画を新描画規則で最新と偽らない');
    await service.close(); service = await startPresentationEditingServiceV001(config); origin = new URL(service.url).origin;
    const restored = await (await request('/state')).json();
    assert.equal(restored.revision, saved.revision); assert.equal(restored.captions.find(row => row.id === caption.id).preset, 'panel');
    assert.equal(restored.media.length, 1); assert.equal(restored.media[0].id, 'original');
    assert.notEqual(restored.csrfToken, saved.csrfToken);
    const normalResponse = await post('/save', {expectedRevision: restored.revision, kind: 'caption', itemId: caption.id,
      selection: {preset: 'normal'}}, restored.csrfToken);
    assert.equal(normalResponse.status, 200); const normal = await normalResponse.json();
    assert.equal(normal.captions.find(row => row.id === caption.id).preset, 'normal');
    assert.equal(normal.captions.find(row => row.id === caption.id).hasOverride, true);
    assert.notEqual(normal.revision, state.revision, '通常表示への固定を自動案へのResetと混同しない');
    const malformedNormal = await post('/save', {expectedRevision: normal.revision, kind: 'caption', itemId: caption.id,
      selection: {preset: 'normal', unregistered: true}}, restored.csrfToken);
    assert.equal(malformedNormal.status, 400);
    assert.equal((await (await request('/state')).json()).revision, normal.revision);
    const resetResponse = await post('/save', {expectedRevision: normal.revision, kind: 'caption', itemId: caption.id,
      selection: 'Reset'}, restored.csrfToken);
    assert.equal(resetResponse.status, 200); assert.equal((await resetResponse.json()).revision, state.revision);
    await service.close();
    const accessText = await readFile(path.join(config.directory, 'access.ndjson'), 'utf8');
    const access = accessText.trim().split('\n').map(line => JSON.parse(line));
    assert(access.some(row => row.path === '/presentation-editing' && row.status === 200));
    assert(access.some(row => row.path === '/api/editing/save' && row.status === 403));
    assert(access.some(row => row.path === '/api/editing/check' && row.status === 403));
    assert(access.some(row => row.path === '/api/editing/check' && row.status === 200));
    assert(access.some(row => row.path === '/api/editing/check' && row.status === 409));
    assert(access.some(row => row.path === '/api/editing/media/:media.mp4' && row.status === 206));
    assert(access.every(row => row.outcome === 'completed' && row.requestId && row.arrivedAt && row.completedAt));
    assert.equal(new Set(access.map(row => row.requestId)).size, access.length);
    assert(!accessText.includes('must-not-be-recorded') && !accessText.includes(state.csrfToken)
      && !accessText.includes(restored.csrfToken) && !accessText.includes('<script>'));
  } finally {await service.close();}
});


test('Pulse検査が実行環境で失敗してもHTTP候補のピークを消さず失敗として返す', {skip: !fixturePath}, async () => {
  const original = JSON.parse(await readFile(fixturePath, 'utf8')), id = randomUUID();
  const generatedRoot = path.join(repo, 'evals/clip_composition/outputs/presentation/stage4-editing-service-failure-' + id);
  await mkdir(generatedRoot);
  const nativeAssetReuse = path.join(generatedRoot, 'not-a-directory'); await writeFile(nativeAssetReuse, 'invalid directory');
  const config = {...original, port: 0, directory: path.join(repo, 'runtime/presentation-editing/service-failure-' + id),
    generatedRoot, nativeAssetReuse};
  const service = await startPresentationEditingServiceV001(config), origin = new URL(service.url).origin;
  const request = route => fetch(origin + '/api/editing' + route);
  try {
    const state = await (await request('/state')).json();
    const caption = state.captions.find(row => row.status === 'normal');
    const route = '/targets/caption/' + encodeURIComponent(caption.id);
    const initial = await (await request(route)).json();
    assert(initial.peakOptions.length > 0); assert(initial.peakOptions.every(row => row.status === 'unchecked'));
    const selection = {preset: 'pulse', anchorPeakId: initial.peakOptions[0].id};
    const response = await fetch(origin + '/api/editing/check', {method: 'POST', headers: {
      'content-type': 'application/json', origin, 'x-zev-editing-token': state.csrfToken},
      body: JSON.stringify({expectedRevision: state.revision, kind: 'caption', itemId: caption.id, selection})});
    assert.equal(response.status, 200); const result = await response.json();
    assert.equal(result.status, 'failed'); assert(result.reason.length > 0); assert.deepEqual(result.selection, selection);
    const after = await (await request(route)).json();
    assert.deepEqual(after.peakOptions.map(row => row.id), initial.peakOptions.map(row => row.id));
    const failedPeak = after.peakOptions.find(row => row.id === selection.anchorPeakId);
    assert.equal(failedPeak.status, 'failed'); assert.equal(failedPeak.reason, result.reason);
    assert.equal((await (await request('/state')).json()).revision, state.revision);
  } finally {await service.close();}
});
