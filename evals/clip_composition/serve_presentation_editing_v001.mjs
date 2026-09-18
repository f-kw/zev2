/** Scoped loopback editing service for the existing Vue client. No path or
 * command supplied by a browser can become a filesystem/executable target. */
import {createServer} from 'node:http';
import {randomBytes, randomUUID} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir, readFile, lstat, realpath, appendFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {readEditingWorkspaceV001, initializeEditingWorkspaceV001, saveEditingOverrideV001,
  editingTargetListV001, editingTargetDetailsV001, hashEditingValueV001, acquireEditingServiceLockV001}
  from './presentation_editing_state_v001.mjs';
import {checkEditingSelectionV001, editingSelectionCheckKeyV001, revalidateEditingSelectionCheckV001}
  from './presentation_editing_state_v001.mjs';
import {getEditingPlaybackTargetsV001, getEditingPlaybackSeekV001} from './presentation_editing_navigation_v001.mjs';
import {createEditingJobsV001} from './presentation_editing_jobs_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from './presentation_output_directory_v001.mjs';
import {parsePresentationMediaRangeV001} from './serve_presentation_first_real_data_gate_v001.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const parse = async file => JSON.parse(await readFile(file, 'utf8'));
const exact = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const demand = (condition, message, code = 'EDITING_INVALID') => {
  if (!condition) {const error = new Error(message); error.code = code; throw error;}
};
const safeHeaders = {
  'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
  'cross-origin-resource-policy': 'same-origin', 'referrer-policy': 'no-referrer',
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; media-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
};
const send = (response, status, value) => {
  const content = Buffer.from(JSON.stringify(value));
  response.writeHead(status, {...safeHeaders, 'content-type': 'application/json; charset=utf-8', 'content-length': content.length}); response.end(content);
};
function accessPath(requestUrl) {
  // Persist registered route shapes only: no query, target text, headers,
  // request body, or arbitrary unmatched path can enter the access record.
  let pathname;
  try {pathname = new URL(requestUrl, 'http://127.0.0.1').pathname;} catch {return '<invalid>';}
  if (/^\/presentation-editing\/?$/.test(pathname)) return pathname;
  if (/^\/assets\/[a-zA-Z0-9_.-]+$/.test(pathname)) return '/assets/:asset';
  if (/^\/api\/editing\/(state|save|check|jobs|retry|playhead|seek)$/.test(pathname)) return pathname;
  if (/^\/api\/editing\/targets\/(caption|connection)\/[^/]+$/.test(pathname))
    return pathname.replace(/\/[^/]+$/, '/:item');
  if (/^\/api\/editing\/media\/(original|[a-f0-9-]+)\.mp4$/.test(pathname)) return '/api/editing/media/:media.mp4';
  return '<unregistered>';
}
async function body(request, maximumBytes) {
  demand(request.headers['content-type']?.split(';')[0] === 'application/json', 'JSON形式で送信してください');
  let size = 0; const chunks = [];
  for await (const chunk of request) {size += chunk.length; demand(size <= maximumBytes, '編集要求が大き過ぎます'); chunks.push(chunk);}
  try {return JSON.parse(Buffer.concat(chunks).toString('utf8'));} catch {throw new TypeError('編集要求を読み取れません');}
}
async function ensureRegisteredDirectory(directory, {unused = false} = {}) {
  if (unused) assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory: directory});
  const relative = path.relative(repo, directory);
  demand(relative && !relative.startsWith('..') && !path.isAbsolute(relative), '編集用directoryはこの作業tree内に限定します');
  let current = repo;
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part);
    try {const info = await lstat(current); demand(info.isDirectory() && !info.isSymbolicLink(), '編集用directoryに別pathへの参照があります');}
    catch (error) {if (error.code !== 'ENOENT') throw error; await mkdir(current);}
  }
}
export async function startPresentationEditingServiceV001(config) {
  const {directory, generatedRoot, savedInputDirectory, originalCompletionPath, title, backgroundProofPath,
    nativeAssetReuse, backgroundReuseDecoderRef, port = 0} = config;
  for (const file of [directory, generatedRoot, savedInputDirectory, originalCompletionPath, backgroundProofPath])
    demand(path.isAbsolute(file), '登録設定には絶対pathが必要です');
  demand(path.dirname(directory) === path.join(repo, 'runtime/presentation-editing'), '編集保存先は登録済みrootに限定します');
  demand(path.dirname(generatedRoot) === path.join(repo, 'evals/clip_composition/outputs/presentation')
    && path.basename(generatedRoot).startsWith('stage4-editing-'), '生成先は工程IVのrootに限定します');
  demand(Number.isSafeInteger(port) && port >= 0 && port <= 65535, 'listen portが不正です');
  const clientRoot = path.join(repo, 'client/dist'); await lstat(path.join(clientRoot, 'index.html'));
  const {buildEditedOrchestrationDrawingRulesRefV001, verifyEditedOrchestrationDrawingRulesRefV001}
    = await import('./presentation_orchestration_edited_render_v001.mjs');
  const drawingRulesRef = await buildEditedOrchestrationDrawingRulesRefV001({backgroundReuseDecoderRef});
  await ensureRegisteredDirectory(path.dirname(directory));
  const completion = await parse(originalCompletionPath);
  demand(completion.status === 'passed', '工程IIIの検査済み候補が必要です');
  const originalDrawingRulesRef = {schemaVersion: 'stage3-drawing-implementation-ref-v001',
    files: completion.implementationReferences, canonicalSha256: hashEditingValueV001(completion.implementationReferences)};
  try {await lstat(directory);} catch (error) {
    if (error.code !== 'ENOENT') throw error;
    assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory: directory});
    await initializeEditingWorkspaceV001({directory, savedInputDirectory, title, originalMedia: completion.candidateVideo,
      originalDrawingRulesRef, drawingRulesRef, backgroundProofPath});
  }
  await ensureRegisteredDirectory(directory);
  const releaseService = await acquireEditingServiceLockV001(directory);
  let server, jobs;
  try {
    await ensureRegisteredDirectory(generatedRoot);
    jobs = await createEditingJobsV001({directory, generatedRoot, drawingRulesRef,
      backgroundReuseProofPath: backgroundProofPath, backgroundReuseDecoderRef, nativeAssetReuse});
    const applicabilityOptions = {generatedRoot, nativeAssetReuse};
    const csrfToken = randomBytes(32).toString('hex');
    const checks = new Map(); let checksRevision;
    const load = async () => {
      const snapshot = await readEditingWorkspaceV001({directory, drawingRulesRef});
      if (checksRevision !== snapshot.revision) {checks.clear(); checksRevision = snapshot.revision;}
      return snapshot;
    };
    const initial = await load();
    // A one-item edit cannot require more JSON than its complete original plan.
    const maximumRequestBytes = Buffer.byteLength(initial.source.planBytes);
    const operationLog = path.join(directory, 'operations.ndjson');
    const accessLog = path.join(directory, 'access.ndjson');
    let pendingAccess = Promise.resolve();
    const logged = async (operation, task) => {
      const start = performance.now();
      try {const value = await task(); await appendFile(operationLog, JSON.stringify({operation, status: 'passed',
        elapsedMilliseconds: performance.now() - start, observedAt: new Date().toISOString()}) + '\n'); return value;}
      catch (error) {await appendFile(operationLog, JSON.stringify({operation, status: 'failed', code: error.code ?? 'EDITING_FAILED',
        elapsedMilliseconds: performance.now() - start, observedAt: new Date().toISOString()}) + '\n'); throw error;}
    };
    const state = async snapshot => {
      const saved = snapshot ?? await load();
      const job = await jobs.refresh();
      return {title: saved.manifest.title, revision: saved.revision, savedAt: saved.savedAt,
        fps: saved.view.projection.sourceClock.frameRate, frameCount: saved.view.projection.displayFrameCount,
        csrfToken, ...editingTargetListV001(saved), media: jobs.listMedia(saved.revision), job};
    };
    const targetDetails = async (snapshot, kind, itemId) => {
      const details = await editingTargetDetailsV001(snapshot, kind, itemId);
      const observed = async (selection, initial) => {
        const key = editingSelectionCheckKeyV001({revision: snapshot.revision, kind, itemId, selection});
        const entry = checks.get(key); if (!entry) return initial;
        const check = entry.promise ? entry.check : await revalidateEditingSelectionCheckV001({snapshot, check: entry.check});
        return {...initial, status: check.status, ...(check.reason ? {reason: check.reason} : {})};
      };
      details.peakOptions = await Promise.all(details.peakOptions.map(peak =>
        observed({preset: 'pulse', anchorPeakId: peak.id}, peak)));
      details.options = await Promise.all(details.options.map(option => {
        const selection = kind === 'connection' ? option.value : option.value === 'color'
          ? {preset: 'color', scope: 'whole-caption'} : option.value === 'pulse'
            ? {preset: 'pulse', anchorPeakId: details.peakOptions[0]?.id} : {preset: option.value};
        return option.value === 'pulse' && !details.peakOptions.length ? option : observed(selection, option);
      }));
      return details;
    };
    server = createServer(async (request, response) => {
      const arrivedAt = new Date().toISOString(), requestId = randomUUID();
      let accessRecorded = false;
      const recordAccess = outcome => {
        if (accessRecorded) return; accessRecorded = true;
        const entry = {arrivedAt, completedAt: new Date().toISOString(), requestId,
          method: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(request.method)
            ? request.method : '<other>', path: accessPath(request.url),
          status: response.headersSent ? response.statusCode : null, outcome};
        pendingAccess = pendingAccess.then(() => appendFile(accessLog, JSON.stringify(entry) + '\n'))
          .catch(error => process.stderr.write(JSON.stringify({event: 'editing-access-record-failed',
            requestId, code: error.code ?? 'WRITE_FAILED'}) + '\n'));
      };
      response.once('finish', () => recordAccess('completed'));
      response.once('close', () => recordAccess('closed-before-finish'));
      try {
        const host = `127.0.0.1:${server.address().port}`, origin = 'http://' + host;
        demand(request.socket.remoteAddress === '127.0.0.1' && request.headers.host === host,
          'この操作は同じPCの編集画面に限定されています', 'EDITING_FORBIDDEN');
        demand(request.headers['sec-fetch-site'] !== 'cross-site'
          && (!request.headers.origin || request.headers.origin === origin), '外部ページからの要求は受け付けません', 'EDITING_FORBIDDEN');
        const url = new URL(request.url, origin);
        demand(url.origin === origin && !request.url.includes('\\'), '要求先が不正です');
        const route = url.pathname;
        if (request.method === 'POST') {
          demand(request.headers.origin === origin && request.headers['x-zev-editing-token'] === csrfToken,
            '編集画面を読み直してから操作してください', 'EDITING_FORBIDDEN');
          const input = await body(request, maximumRequestBytes);
          if (route === '/api/editing/save') {
            demand(exact(input, ['expectedRevision', 'kind', 'itemId', 'selection']), '保存項目が不正です');
            const saved = await logged('save', () => saveEditingOverrideV001({directory, drawingRulesRef, applicabilityOptions, ...input}));
            return send(response, 200, await state(saved));
          }
          if (route === '/api/editing/check') {
            demand(exact(input, ['expectedRevision', 'kind', 'itemId', 'selection']), '確認項目が不正です');
            const snapshot = await load();
            demand(input.expectedRevision === snapshot.revision, '保存状態が変わりました。読み直してから確認してください。', 'EDITING_CONFLICT');
            const identity = {revision: snapshot.revision, kind: input.kind, itemId: input.itemId, selection: input.selection};
            const key = editingSelectionCheckKeyV001(identity);
            const previous = checks.get(key);
            if (previous?.promise) return send(response, 200, await previous.promise);
            const entry = {check: {...identity, checkKey: key, status: 'checking'}};
            checks.set(key, entry);
            entry.promise = logged('selected-expression-check', () => checkEditingSelectionV001({directory,
              drawingRulesRef, applicabilityOptions, ...input}));
            try {entry.check = await entry.promise; return send(response, 200, entry.check);}
            catch (error) {if (checks.get(key) === entry) checks.delete(key); throw error;}
            finally {delete entry.promise;}
          }
          if (route === '/api/editing/jobs') {
            demand(input.kind === 'full' ? exact(input, ['expectedRevision', 'kind'])
              : exact(input, ['expectedRevision', 'kind', 'target', 'contextSeconds'])
                && exact(input.target, ['kind', 'itemId']), '出力項目が不正です');
            const snapshot = await load();
            demand(input.expectedRevision === snapshot.revision, '保存状態が変わりました。読み直してから出力してください。', 'EDITING_CONFLICT');
            await verifyEditedOrchestrationDrawingRulesRefV001(drawingRulesRef);
            const job = await logged(input.kind + '-start', () => jobs.start({snapshot, kind: input.kind,
              target: input.target, contextSeconds: input.contextSeconds}));
            return send(response, 202, job);
          }
          if (route === '/api/editing/retry') {
            demand(exact(input, ['jobId']) && typeof input.jobId === 'string', '再試行する処理が不正です');
            await verifyEditedOrchestrationDrawingRulesRefV001(drawingRulesRef);
            return send(response, 202, await logged('retry', () => jobs.retry(input.jobId)));
          }
          return send(response, 404, {error: 'この操作は登録されていません', code: 'EDITING_NOT_FOUND'});
        }
        demand(['GET', 'HEAD'].includes(request.method), 'この操作方法は受け付けません');
        if (route === '/api/editing/state') return send(response, 200, await state());
        const detail = /^\/api\/editing\/targets\/(caption|connection)\/([^/]+)$/.exec(route);
        if (detail) return send(response, 200, await logged('target-details', async () =>
          targetDetails(await load(), detail[1], decodeURIComponent(detail[2]))));
        if (route === '/api/editing/playhead' || route === '/api/editing/seek') {
          const {row, view} = await jobs.getMedia(url.searchParams.get('mediaId'));
          if (route.endsWith('/playhead')) {
            const current = await load();
            const result = await logged('playhead-search', async () => getEditingPlaybackTargetsV001({playingView: view,
              currentView: current.view, range: row.range, seconds: Number(url.searchParams.get('seconds'))}));
            return send(response, 200, {...result, revision: current.revision});
          }
          return send(response, 200, await logged('target-seek', async () => getEditingPlaybackSeekV001({playingView: view,
            range: row.range, kind: url.searchParams.get('kind'), itemId: url.searchParams.get('itemId')})));
        }
        const movie = /^\/api\/editing\/media\/(original|[a-f0-9-]+)\.mp4$/.exec(route);
        if (movie) {
          const {row} = await jobs.getMedia(movie[1]);
          const range = parsePresentationMediaRangeV001(request.headers.range, row.bytes);
          if (range?.status === 'invalid') {response.writeHead(416, {...safeHeaders, 'content-range': `bytes */${row.bytes}`}); return response.end();}
          const partial = range?.status === 'partial';
          response.writeHead(partial ? 206 : 200, {...safeHeaders, 'content-type': 'video/mp4', 'accept-ranges': 'bytes',
            'content-length': partial ? range.length : row.bytes,
            ...(partial ? {'content-range': `bytes ${range.start}-${range.end}/${row.bytes}`} : {})});
          if (request.method === 'HEAD') return response.end();
          return createReadStream(row.path, partial ? {start: range.start, end: range.end} : {}).pipe(response);
        }
        const asset = /^\/assets\/([a-zA-Z0-9_.-]+)$/.exec(route);
        const file = ['/presentation-editing', '/presentation-editing/'].includes(route)
          ? path.join(clientRoot, 'index.html') : asset ? path.join(clientRoot, 'assets', asset[1]) : null;
        if (!file) return send(response, 404, {error: '対象が見つかりません', code: 'EDITING_NOT_FOUND'});
        const actual = await realpath(file);
        demand(actual.startsWith(clientRoot + path.sep), '配信範囲外のfileです', 'EDITING_FORBIDDEN');
        const content = await readFile(actual), extension = path.extname(file);
        const mime = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
          '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.svg': 'image/svg+xml'}[extension];
        demand(mime, '配信できないfile形式です');
        response.writeHead(200, {...safeHeaders, 'content-type': mime, 'content-length': content.length});
        return response.end(request.method === 'HEAD' ? undefined : content);
      } catch (error) {
        if (response.headersSent) {response.destroy(); return;}
        const code = error.code ?? 'EDITING_INVALID';
        send(response, code === 'EDITING_FORBIDDEN' ? 403 : code === 'EDITING_NOT_FOUND' ? 404
          : ['EDITING_CONFLICT', 'EDITING_BUSY', 'EDITING_JOB_BUSY'].includes(code) ? 409 : 400,
        {error: error.message, code});
      }
    });
    await new Promise((resolve, reject) => {server.once('error', reject); server.listen(port, '127.0.0.1', resolve);});
    let closing;
    const close = () => closing ??= (async () => {
      await jobs.close();
      await new Promise(resolve => server.close(resolve)); await pendingAccess; await releaseService();
    })();
    return {url: `http://127.0.0.1:${server.address().port}/presentation-editing`, server, close, directory, generatedRoot};
  } catch (error) {if (server?.listening) server.close(); await releaseService(); throw error;}
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [configPath] = process.argv.slice(2);
  if (!configPath) throw new Error('usage: serve_presentation_editing_v001.mjs absolute-registered-config.json');
  const service = await startPresentationEditingServiceV001(await parse(configPath));
  process.stdout.write(JSON.stringify({status: 'listening', url: service.url, directory: service.directory,
    generatedRoot: service.generatedRoot}) + '\n');
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {void service.close().then(() => process.exit(0));});
}
