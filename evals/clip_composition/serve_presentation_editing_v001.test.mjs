import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
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
    assert(access.some(row => row.path === '/api/editing/media/:media.mp4' && row.status === 206));
    assert(access.every(row => row.outcome === 'completed' && row.requestId && row.arrivedAt && row.completedAt));
    assert.equal(new Set(access.map(row => row.requestId)).size, access.length);
    assert(!accessText.includes('must-not-be-recorded') && !accessText.includes(state.csrfToken)
      && !accessText.includes(restored.csrfToken) && !accessText.includes('<script>'));
  } finally {await service.close();}
});
