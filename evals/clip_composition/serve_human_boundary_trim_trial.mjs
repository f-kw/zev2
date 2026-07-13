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
const outputRoot = path.join(evalRoot, 'outputs', 'human-boundary-trim', '20260713-trial-v001');
const manifestPath = path.join(outputRoot, 'manifest.json');
const htmlPath = path.join(outputRoot, 'index.html');
const progressPath = path.join(outputRoot, 'progress.json');
const progressTempPath = path.join(outputRoot, 'progress.json.tmp');
const auditPath = path.join(outputRoot, 'save-audit.jsonl');
const host = '127.0.0.1';
const port = Number(process.argv.find((item) => item.startsWith('--port='))?.split('=')[1] ?? 4317);
const videoPaths = {
  'YE-faluP7zY': path.join(evalRoot, 'research', 'downloads', 'nOEWCNc77MI', 'sources', 'YE-faluP7zY', 'YE-faluP7zY.mp4'),
  o8rZAhARXAc: path.join(evalRoot, 'research', 'downloads', '9dtwF5Exu5w', 'sources', 'o8rZAhARXAc', 'o8rZAhARXAc.mp4')
};

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const allowedTaskIds = new Set(manifest.tasks.map((item) => item.id));

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
  if (!value || value.kind !== 'human_boundary_trim_trial_progress') throw new Error('progress kind不正');
  if (value.version !== manifest.version || value.reviewer !== manifest.reviewer) throw new Error('試験版または確認者不一致');
  if (!value.tasks || typeof value.tasks !== 'object') throw new Error('tasksなし');
  for (const [id, record] of Object.entries(value.tasks)) {
    if (!allowedTaskIds.has(id) || record.taskId !== id) throw new Error(`未知のtask: ${id}`);
    if (!['not_started', 'in_progress', 'complete', 'unable'].includes(record.status)) throw new Error(`status不正: ${id}`);
    for (const key of ['provisionalStartMs', 'provisionalEndMs', 'finalStartMs', 'finalEndMs', 'activeElapsedMs', 'hiddenElapsedMs']) {
      if (!Number.isFinite(record[key]) || record[key] < 0) throw new Error(`${id} ${key}不正`);
    }
    if (record.status === 'complete' && !(record.finalStartMs < record.finalEndMs)) throw new Error(`${id} 完了境界の順序不正`);
    if (!record.operationCounts || !Array.isArray(record.events)) throw new Error(`${id} 操作記録なし`);
  }
}

async function initialState() {
  if (existsSync(progressPath)) return JSON.parse(await readFile(progressPath, 'utf8'));
  return {
    kind: 'human_boundary_trim_trial_progress',
    version: manifest.version,
    reviewer: manifest.reviewer,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tasks: {}
  };
}

async function serveVideo(req, res, sourceVideoId) {
  const file = videoPaths[sourceVideoId];
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
  res.writeHead(206, {
    'content-type': 'video/mp4',
    'content-length': end - start + 1,
    'content-range': `bytes ${start}-${end}/${info.size}`,
    'accept-ranges': 'bytes'
  });
  createReadStream(file, { start, end }).pipe(res);
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
    if (req.method === 'POST' && url.pathname === '/api/save') {
      const value = await bodyJson(req);
      validateProgress(value);
      const serialized = `${JSON.stringify(value, null, 2)}\n`;
      await writeFile(progressTempPath, serialized);
      await rename(progressTempPath, progressPath);
      await appendFile(auditPath, `${JSON.stringify({ savedAt: new Date().toISOString(), completed: Object.values(value.tasks).filter((item) => item.status === 'complete').length, unable: Object.values(value.tasks).filter((item) => item.status === 'unable').length })}\n`);
      return json(res, 200, { status: 'saved' });
    }
    if (req.method === 'GET' && url.pathname.startsWith('/video/')) return serveVideo(req, res, decodeURIComponent(url.pathname.slice('/video/'.length)));
    json(res, 404, { error: 'not found' });
  } catch (error) {
    json(res, 400, { error: error.message });
  }
});

server.listen(port, host, () => {
  console.log(JSON.stringify({ status: 'ready', url: `http://${host}:${port}/`, taskCount: manifest.taskCount, progressPath: path.relative(root, progressPath) }, null, 2));
});
