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
const evalRoot = path.join(root, 'evals', 'clip_composition');
const outputRoot = path.join(evalRoot, 'outputs', 'human-boundary-trim', '20260713-trial-v002');
const videoPaths = {
  'YE-faluP7zY': path.join(root, 'evals', 'clip_composition', 'research', 'downloads', 'nOEWCNc77MI', 'sources', 'YE-faluP7zY', 'YE-faluP7zY.mp4'),
  o8rZAhARXAc: path.join(root, 'evals', 'clip_composition', 'research', 'downloads', '9dtwF5Exu5w', 'sources', 'o8rZAhARXAc', 'o8rZAhARXAc.mp4')
};
const wordTimestampPaths = {
  'YE-faluP7zY': path.join(evalRoot, 'stt', 'nOEWCNc77MI_YE-faluP7zY_local30_v001', 'source', 'word-timestamps.json'),
  o8rZAhARXAc: path.join(evalRoot, 'stt', '9dtwF5Exu5w_o8rZAhARXAc_local30_v001', 'source', 'word-timestamps.json')
};
const transcriptPaths = {
  'YE-faluP7zY': path.join(evalRoot, 'stt', 'nOEWCNc77MI_YE-faluP7zY_local30_v001', 'source', 'transcript.json'),
  o8rZAhARXAc: path.join(evalRoot, 'stt', '9dtwF5Exu5w_o8rZAhARXAc_local30_v001', 'source', 'transcript.json')
};
const sttChunkDurationMs = 30_000;
const sourceCache = new Map();
const host = '127.0.0.1';
const port = Number(process.argv.find((item) => item.startsWith('--port='))?.split('=')[1] ?? 4318);

async function sourceData(id) {
  if (!wordTimestampPaths[id] || !transcriptPaths[id]) return null;
  if (!sourceCache.has(id)) {
    const [wordData, transcript] = await Promise.all([
      readFile(wordTimestampPaths[id], 'utf8').then(JSON.parse),
      readFile(transcriptPaths[id], 'utf8').then(JSON.parse)
    ]);
    sourceCache.set(id, { words: wordData.words, chunkCount: transcript.fullChunkCount, durationMs: Math.round(transcript.originalDurationSec * 1000) });
  }
  return sourceCache.get(id);
}

function buildUtterances(words, chunkIndex) {
  const rows = [];
  let current = [];
  const flush = () => {
    if (current.length === 0) return;
    const text = current.map((word) => String(word.text ?? '')).join('').trim();
    if (text) rows.push({ id: `${chunkIndex}-${rows.length}`, startMs: current[0].startMs, endMs: current.at(-1).endMs, text });
    current = [];
  };
  for (const word of words) {
    if (!String(word.text ?? '')) continue;
    current.push(word);
    if (/[。！？!?]$/.test(String(word.text))) flush();
  }
  flush();
  if (rows.length > 1 && [...rows[0].text].length === 1) {
    rows[1] = { ...rows[1], startMs: rows[0].startMs, text: rows[0].text + rows[1].text };
    rows.shift();
  }
  if (rows.length > 1 && [...rows.at(-1).text].length === 1) {
    const tail = rows.pop();
    rows[rows.length - 1].endMs = tail.endMs;
    rows[rows.length - 1].text += tail.text;
  }
  return rows.map((row, index) => ({ ...row, id: `${chunkIndex}-${index}` }));
}

async function serveTranscriptChunk(res, id, chunkIndex) {
  const source = await sourceData(id);
  if (!source || !Number.isInteger(chunkIndex) || chunkIndex < 0 || chunkIndex >= source.chunkCount) {
    res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' }).end(JSON.stringify({ error: 'transcript chunk not found' }));
    return;
  }
  const startMs = chunkIndex * sttChunkDurationMs;
  const endMs = Math.min(startMs + sttChunkDurationMs, source.durationMs);
  const words = source.words.filter((word) => word.startMs >= startMs && word.startMs < endMs);
  const body = {
    sourceVideoId: id,
    chunkIndex,
    startMs,
    endMs,
    hasPrevious: chunkIndex > 0,
    hasNext: chunkIndex < source.chunkCount - 1,
    utterances: buildUtterances(words, chunkIndex)
  };
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

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
    if (req.method === 'GET' && url.pathname === '/api/transcript-chunk') {
      await serveTranscriptChunk(res, url.searchParams.get('sourceVideoId'), Number(url.searchParams.get('chunkIndex')));
      return;
    }
    res.writeHead(404).end('not found');
  } catch (error) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }).end(error.message);
  }
});

server.listen(port, host, () => {
  console.log(JSON.stringify({ status: 'ready', url: `http://${host}:${port}/`, mode: 'read-only-expandable-utterance-context-copy-only' }, null, 2));
});
