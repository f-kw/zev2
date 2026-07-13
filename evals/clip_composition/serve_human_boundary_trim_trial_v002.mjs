#!/usr/bin/env node
import http from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { appendFile, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

function rootDir() {
  let current = process.cwd();
  while (!existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
    const parent = path.dirname(current);
    if (parent === current) throw new Error('workspaceなし');
    current = parent;
  }
  return current;
}

const root = rootDir();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const outputRoot = path.join(evalRoot, 'outputs', 'human-boundary-trim', '20260713-trial-v002');
const manifestPath = path.join(outputRoot, 'manifest.json');
const htmlPath = path.join(outputRoot, 'index.html');
const progressPath = path.join(outputRoot, 'progress.json');
const tempPath = path.join(outputRoot, 'progress.json.tmp');
const auditPath = path.join(outputRoot, 'save-audit.jsonl');
const host = '127.0.0.1';
const port = Number(process.argv.find((item) => item.startsWith('--port='))?.split('=')[1] ?? 4318);
const videoPaths = {
  'YE-faluP7zY': path.join(evalRoot, 'research', 'downloads', 'nOEWCNc77MI', 'sources', 'YE-faluP7zY', 'YE-faluP7zY.mp4'),
  o8rZAhARXAc: path.join(evalRoot, 'research', 'downloads', '9dtwF5Exu5w', 'sources', 'o8rZAhARXAc', 'o8rZAhARXAc.mp4')
};
const transcriptPaths = {
  'YE-faluP7zY': path.join(evalRoot, 'stt', 'nOEWCNc77MI_YE-faluP7zY_local30_v001', 'source', 'transcript.json'),
  o8rZAhARXAc: path.join(evalRoot, 'stt', '9dtwF5Exu5w_o8rZAhARXAc_local30_v001', 'source', 'transcript.json')
};

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const allowedTasks = new Set(manifest.tasks.map((item) => item.id));
const allowedFixtures = new Set(manifest.materials.map((item) => item.fixtureId));
const timelines = Object.fromEntries(await Promise.all(Object.entries(transcriptPaths).map(async ([id, file]) => {
  const transcript = JSON.parse(await readFile(file, 'utf8'));
  const segments = transcript.segments.filter((item) => Number.isFinite(item.startMs) && Number.isFinite(item.endMs) && String(item.text ?? '').trim()).sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
  return [id, segments];
})));

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(`${JSON.stringify(body, null, 2)}\n`);
}

async function bodyJson(req) {
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 10 * 1024 * 1024) throw new Error('保存データが10MBを超えた');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function validateProgress(value) {
  if (!value || value.kind !== 'human_boundary_trim_trial_progress' || value.version !== manifest.version || value.reviewer !== manifest.reviewer) throw new Error('試験識別子不正');
  if (!value.sessions || !value.tasks) throw new Error('計測状態なし');
  for (const [id, session] of Object.entries(value.sessions)) {
    if (!allowedFixtures.has(id) || session.fixtureId !== id) throw new Error(`未知の配信: ${id}`);
    if (!['not_started', 'in_progress', 'complete'].includes(session.status)) throw new Error(`配信状態不正: ${id}`);
    for (const key of ['activeElapsedMs', 'hiddenElapsedMs']) if (!Number.isFinite(session[key]) || session[key] < 0) throw new Error(`${id} ${key}不正`);
  }
  for (const [id, task] of Object.entries(value.tasks)) {
    if (!allowedTasks.has(id) || task.taskId !== id) throw new Error(`未知の候補: ${id}`);
    if (!['not_started', 'in_progress', 'complete'].includes(task.status)) throw new Error(`候補状態不正: ${id}`);
    if (![null, 'publish', 'skip', 'context_unknown'].includes(task.decision)) throw new Error(`候補判断不正: ${id}`);
    for (const key of ['provisionalStartMs', 'provisionalEndMs', 'finalStartMs', 'finalEndMs', 'activeElapsedMs']) if (!Number.isFinite(task[key]) || task[key] < 0) throw new Error(`${id} ${key}不正`);
    if (task.status === 'complete' && task.decision === 'publish' && !(task.finalStartMs < task.finalEndMs)) throw new Error(`${id} 境界順序不正`);
    if (task.status === 'complete' && task.decision == null) throw new Error(`${id} 完了判断なし`);
    if (!task.operationCounts || !Array.isArray(task.events)) throw new Error(`${id} 操作記録なし`);
  }
}

async function initialState() {
  if (existsSync(progressPath)) return JSON.parse(await readFile(progressPath, 'utf8'));
  return { kind: 'human_boundary_trim_trial_progress', version: manifest.version, reviewer: manifest.reviewer, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), sessions: {}, tasks: {} };
}

async function serveVideo(req, res, id) {
  const file = videoPaths[id];
  if (!file || !existsSync(file)) return json(res, 404, { error: 'video not found' });
  const info = await stat(file);
  const range = req.headers.range;
  if (!range) {
    res.writeHead(200, { 'content-type': 'video/mp4', 'content-length': info.size, 'accept-ranges': 'bytes' });
    createReadStream(file).pipe(res);
    return;
  }
  const match = /^bytes=(\d+)-(\d*)$/.exec(range);
  if (!match) {
    res.writeHead(416, { 'content-range': `bytes */${info.size}` });
    res.end();
    return;
  }
  const start = Number(match[1]);
  const end = match[2] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1;
  if (start > end || start >= info.size) {
    res.writeHead(416, { 'content-range': `bytes */${info.size}` });
    res.end();
    return;
  }
  res.writeHead(206, { 'content-type': 'video/mp4', 'content-length': end - start + 1, 'content-range': `bytes ${start}-${end}/${info.size}`, 'accept-ranges': 'bytes' });
  createReadStream(file, { start, end }).pipe(res);
}

function boundaryOptions(sourceVideoId, timeMs, side) {
  const segments = timelines[sourceVideoId];
  if (!segments || !Number.isFinite(timeMs) || !['start', 'end'].includes(side)) throw new Error('境界候補要求不正');
  const point = (segment) => side === 'start' ? segment.startMs : segment.endMs;
  let before = -1;
  let after = -1;
  let exact = -1;
  for (let index = 0; index < segments.length; index += 1) {
    const value = point(segments[index]);
    if (value < timeMs) before = index;
    if (value === timeMs) exact = index;
    if (value > timeMs) { after = index; break; }
  }
  const build = (index, relation) => {
    if (index < 0 || index >= segments.length) return null;
    const segment = segments[index];
    return { relation, timeMs: point(segment), word: String(segment.text).trim(), context: [segments[index - 1], segment, segments[index + 1]].filter(Boolean).map((item) => String(item.text).trim()).join('｜') };
  };
  const options = exact >= 0
    ? [build(exact - 1, 'before'), build(exact, 'exact'), build(exact + 1, 'after')]
    : [build(before, 'before'), build(after, 'after')];
  return { sourceVideoId, requestedTimeMs: timeMs, side, options: options.filter(Boolean).filter((item, index, all) => all.findIndex((other) => other.timeMs === item.timeMs) === index) };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${host}:${port}`);
    if (req.method === 'GET' && url.pathname === '/') {
      const page = await readFile(htmlPath);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(page);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/manifest') return json(res, 200, manifest);
    if (req.method === 'GET' && url.pathname === '/api/state') return json(res, 200, await initialState());
    if (req.method === 'GET' && url.pathname === '/api/boundary-options') return json(res, 200, boundaryOptions(url.searchParams.get('sourceVideoId'), Number(url.searchParams.get('timeMs')), url.searchParams.get('side')));
    if (req.method === 'POST' && url.pathname === '/api/save') {
      const value = await bodyJson(req);
      validateProgress(value);
      await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`);
      await rename(tempPath, progressPath);
      await appendFile(auditPath, `${JSON.stringify({ savedAt: new Date().toISOString(), completedMaterials: Object.values(value.sessions).filter((item) => item.status === 'complete').length, completedCandidates: Object.values(value.tasks).filter((item) => item.status === 'complete').length })}\n`);
      return json(res, 200, { status: 'saved' });
    }
    if (req.method === 'GET' && url.pathname.startsWith('/video/')) return serveVideo(req, res, decodeURIComponent(url.pathname.slice('/video/'.length)));
    json(res, 404, { error: 'not found' });
  } catch (error) {
    json(res, 400, { error: error.message });
  }
});

server.listen(port, host, () => {
  console.log(JSON.stringify({ status: 'ready', url: `http://${host}:${port}/`, materialCount: manifest.materials.length, taskCount: manifest.tasks.length, progressPath: path.relative(root, progressPath) }, null, 2));
});
