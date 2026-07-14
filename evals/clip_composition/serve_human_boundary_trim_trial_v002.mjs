#!/usr/bin/env node
import http from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
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
const outputRoot = path.join(root, 'evals', 'clip_composition', 'outputs', 'human-boundary-trim', '20260713-trial-v002');
const videoPaths = {
  'YE-faluP7zY': path.join(root, 'evals', 'clip_composition', 'research', 'downloads', 'nOEWCNc77MI', 'sources', 'YE-faluP7zY', 'YE-faluP7zY.mp4'),
  o8rZAhARXAc: path.join(root, 'evals', 'clip_composition', 'research', 'downloads', '9dtwF5Exu5w', 'sources', 'o8rZAhARXAc', 'o8rZAhARXAc.mp4')
};
const host = '127.0.0.1';
const port = Number(process.argv.find((item) => item.startsWith('--port='))?.split('=')[1] ?? 4318);

async function serveVideo(req, res, id) {
  const file = videoPaths[id];
  if (!file || !existsSync(file)) {
    res.writeHead(404).end('video not found');
    return;
  }
  const info = await stat(file);
  const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? '');
  if (!match) {
    res.writeHead(200, { 'content-type': 'video/mp4', 'content-length': info.size, 'accept-ranges': 'bytes' });
    createReadStream(file).pipe(res);
    return;
  }
  const start = Number(match[1]);
  const end = match[2] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1;
  if (start > end || start >= info.size) {
    res.writeHead(416, { 'content-range': `bytes */${info.size}` }).end();
    return;
  }
  res.writeHead(206, { 'content-type': 'video/mp4', 'content-length': end - start + 1, 'content-range': `bytes ${start}-${end}/${info.size}`, 'accept-ranges': 'bytes' });
  createReadStream(file, { start, end }).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${host}:${port}`);
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(await readFile(path.join(outputRoot, 'index.html')));
      return;
    }
    if (req.method === 'GET' && url.pathname.startsWith('/video/')) {
      await serveVideo(req, res, decodeURIComponent(url.pathname.slice('/video/'.length)));
      return;
    }
    res.writeHead(404).end('not found');
  } catch (error) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }).end(error.message);
  }
});

server.listen(port, host, () => {
  console.log(JSON.stringify({ status: 'ready', url: `http://${host}:${port}/`, mode: 'static-copy-only-utterance-context-selection' }, null, 2));
});
