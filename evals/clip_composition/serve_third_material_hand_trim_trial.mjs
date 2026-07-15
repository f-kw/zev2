#!/usr/bin/env node
import http from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

function workspaceRoot() {
  let current = process.cwd();
  while (!existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
    const parent = path.dirname(current);
    if (parent === current) throw new Error('pnpm-workspace.yaml が見つかりません');
    current = parent;
  }
  return current;
}

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const outputRoot = path.join(evalRoot, 'outputs', 'human-boundary-trim', '20260716-third-material-trial-v002');
const sources = {
  qdczJpv8RCc: {
    video: path.join(evalRoot, 'research', 'downloads', 'nE_bNeBNp4E', 'sources', 'qdczJpv8RCc', 'qdczJpv8RCc.mp4'),
    words: path.join(evalRoot, 'stt', 'nE_bNeBNp4E_qdczJpv8RCc_local30_v001', 'source', 'word-timestamps.json'),
    transcript: path.join(evalRoot, 'stt', 'nE_bNeBNp4E_qdczJpv8RCc_local30_v001', 'source', 'transcript.json')
  },
  'YE-faluP7zY': {
    video: path.join(evalRoot, 'research', 'downloads', 'nOEWCNc77MI', 'sources', 'YE-faluP7zY', 'YE-faluP7zY.mp4'),
    words: path.join(evalRoot, 'stt', 'nOEWCNc77MI_YE-faluP7zY_local30_v001', 'source', 'word-timestamps.json'),
    transcript: path.join(evalRoot, 'stt', 'nOEWCNc77MI_YE-faluP7zY_local30_v001', 'source', 'transcript.json')
  },
  o8rZAhARXAc: {
    video: path.join(evalRoot, 'research', 'downloads', '9dtwF5Exu5w', 'sources', 'o8rZAhARXAc', 'o8rZAhARXAc.mp4'),
    words: path.join(evalRoot, 'stt', '9dtwF5Exu5w_o8rZAhARXAc_local30_v001', 'source', 'word-timestamps.json'),
    transcript: path.join(evalRoot, 'stt', '9dtwF5Exu5w_o8rZAhARXAc_local30_v001', 'source', 'transcript.json')
  }
};
const cache = new Map();
const chunkDurationMs = 30_000;
const host = '127.0.0.1';
const port = Number(process.argv.find((item) => item.startsWith('--port='))?.split('=')[1] ?? 4318);

async function sourceData(sourceVideoId) {
  const config = sources[sourceVideoId];
  if (!config) return null;
  if (!cache.has(sourceVideoId)) {
    const [wordData, transcript] = await Promise.all([
      readFile(config.words, 'utf8').then(JSON.parse),
      readFile(config.transcript, 'utf8').then(JSON.parse)
    ]);
    cache.set(sourceVideoId, {
      words: wordData.words ?? [],
      chunkCount: transcript.fullChunkCount,
      durationMs: Math.round(transcript.originalDurationSec * 1000)
    });
  }
  return cache.get(sourceVideoId);
}

function buildUtterances(words, chunkIndex) {
  const rows = [];
  let current = [];
  const flush = () => {
    if (current.length === 0) return;
    const text = current.map((word) => String(word.text ?? '')).join('');
    if (text.trim()) {
      rows.push({
        id: `${chunkIndex}-utterance-${rows.length}`,
        startMs: current[0].startMs,
        endMs: current.at(-1).endMs,
        text,
        words: current.map((word, wordOffset) => ({
          id: `${chunkIndex}-word-${rows.length}-${wordOffset}`,
          startMs: word.startMs,
          endMs: word.endMs,
          text: String(word.text ?? '')
        }))
      });
    }
    current = [];
  };
  for (const word of words) {
    const text = String(word.text ?? '');
    if (!text) continue;
    if (current.length > 0 && word.startMs - current.at(-1).endMs >= 2_000) flush();
    current.push(word);
    if (/[。！？!?]$/.test(text)) flush();
  }
  flush();
  return rows;
}

async function serveTranscriptChunk(res, sourceVideoId, chunkIndex) {
  const source = await sourceData(sourceVideoId);
  if (!source || !Number.isInteger(chunkIndex) || chunkIndex < 0 || chunkIndex >= source.chunkCount) {
    res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: '発話区間が見つかりません' }));
    return;
  }
  const startMs = chunkIndex * chunkDurationMs;
  const endMs = Math.min(startMs + chunkDurationMs, source.durationMs);
  const words = source.words.filter((word) => word.startMs >= startMs && word.startMs < endMs);
  const body = {
    sourceVideoId,
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

async function serveVideo(req, res, sourceVideoId) {
  const filePath = sources[sourceVideoId]?.video;
  if (!filePath || !existsSync(filePath)) {
    res.writeHead(404).end('video not found');
    return;
  }
  const info = await stat(filePath);
  const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? '');
  if (!match) {
    res.writeHead(200, { 'content-type': 'video/mp4', 'content-length': info.size, 'accept-ranges': 'bytes' });
    createReadStream(filePath).pipe(res);
    return;
  }
  const start = Number(match[1]);
  const end = match[2] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1;
  if (start > end || start >= info.size) {
    res.writeHead(416, { 'content-range': `bytes */${info.size}` }).end();
    return;
  }
  res.writeHead(206, {
    'content-type': 'video/mp4',
    'content-length': end - start + 1,
    'content-range': `bytes ${start}-${end}/${info.size}`,
    'accept-ranges': 'bytes'
  });
  createReadStream(filePath, { start, end }).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${host}:${port}`);
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(await readFile(path.join(outputRoot, 'index.html')));
      return;
    }
    const sessionMatch = /^\/session-(1|2)\/?$/.exec(url.pathname);
    if (req.method === 'GET' && sessionMatch) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(await readFile(path.join(outputRoot, `session-${sessionMatch[1]}.html`)));
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
  console.log(JSON.stringify({
    status: 'ready',
    url: `http://${host}:${port}/`,
    session1: `http://${host}:${port}/session-1/`,
    session2: `http://${host}:${port}/session-2/`,
    mode: 'read-only-video-and-word-context; browser-local-draft; copy-result'
  }, null, 2));
});
