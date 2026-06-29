import express from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { access, mkdir, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { findById } from '@zev2/shared';
import { loadState } from '../store/json-store.js';
import { requireAgentApiToken } from '../security/agent-auth.js';

const artifactUrlPrefix = '/api/artifacts/';
const safeDraftIdPattern = /^[A-Za-z0-9_-]+$/;
const safeFileNamePattern = /^[A-Za-z0-9_.-]+$/;

type StoredArtifactMetadata = {
  uri: string;
  artifactFileName: string;
  byteSize: number;
  sha256: string;
  mimeType: string;
};

function routeParamText(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function normalizedMimeType(value: unknown): string {
  const text = Array.isArray(value) ? value[0] : value;
  if (typeof text !== 'string' || !text.trim()) {
    return 'application/octet-stream';
  }

  return text.trim();
}

function artifactRoot(runtimeDir: string): string {
  return path.join(runtimeDir, 'artifacts');
}

function artifactUrl(requestDraftId: string, fileName: string): string {
  return `${artifactUrlPrefix}${encodeURIComponent(requestDraftId)}/${encodeURIComponent(fileName)}`;
}

function artifactDestination(runtimeDir: string, requestDraftId: string, fileName: string): string {
  const root = path.resolve(artifactRoot(runtimeDir));
  const draftDirectory = path.resolve(root, requestDraftId);
  const destinationPath = path.resolve(draftDirectory, fileName);
  if (!destinationPath.startsWith(`${draftDirectory}${path.sep}`)) {
    throw new Error('成果物保存先が不正です');
  }

  return destinationPath;
}

async function ensureDestinationIsNew(destinationPath: string): Promise<void> {
  try {
    await access(destinationPath);
  } catch {
    return;
  }

  throw new Error('同じ名前の成果物がすでに保存されています');
}

async function streamRequestBodyToFile(
  request: express.Request,
  destinationPath: string
): Promise<{ byteSize: number; sha256: string }> {
  await mkdir(path.dirname(destinationPath), { recursive: true });
  await ensureDestinationIsNew(destinationPath);

  const tempPath = path.join(path.dirname(destinationPath), `.upload-${randomUUID()}.tmp`);
  const hash = createHash('sha256');
  let byteSize = 0;
  const measure = new Transform({
    transform(chunk: Buffer, _, callback) {
      byteSize += chunk.length;
      hash.update(chunk);
      callback(null, chunk);
    }
  });

  try {
    await pipeline(request, measure, createWriteStream(tempPath, { flags: 'wx' }));
    await ensureDestinationIsNew(destinationPath);
    await rename(tempPath, destinationPath);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }

  return { byteSize, sha256: hash.digest('hex') };
}

function validateRouteParts(requestDraftId: string, fileName: string): string | undefined {
  if (!safeDraftIdPattern.test(requestDraftId)) {
    return '下書きIDが不正です';
  }

  if (!safeFileNamePattern.test(fileName) || fileName === '.' || fileName === '..') {
    return '成果物ファイル名が不正です';
  }

  return undefined;
}

export function createArtifactUploadRouter(runtimeDir: string): express.Router {
  const router = express.Router();

  router.put('/artifacts/:draftId/:fileName', requireAgentApiToken, async (request, response) => {
    const requestDraftId = routeParamText(request.params.draftId);
    const fileName = routeParamText(request.params.fileName);
    const routeError = validateRouteParts(requestDraftId, fileName);
    if (routeError) {
      response.status(400).json({ error: routeError });
      return;
    }

    const state = await loadState();
    if (!findById(state.requestDrafts, requestDraftId)) {
      response.status(404).json({ error: '実行前下書きが見つかりません' });
      return;
    }

    let destinationPath = '';
    try {
      destinationPath = artifactDestination(runtimeDir, requestDraftId, fileName);
    } catch (error) {
      response.status(400).json({ error: error instanceof Error ? error.message : '成果物保存先が不正です' });
      return;
    }

    try {
      const measured = await streamRequestBodyToFile(request, destinationPath);
      const savedStatus = await stat(destinationPath);
      const metadata: StoredArtifactMetadata = {
        uri: artifactUrl(requestDraftId, fileName),
        artifactFileName: fileName,
        byteSize: savedStatus.size,
        sha256: measured.sha256,
        mimeType: normalizedMimeType(request.headers['content-type'])
      };
      response.status(201).json(metadata);
    } catch (error) {
      response.status(409).json({
        error: error instanceof Error ? error.message : '成果物本体を保存できません'
      });
    }
  });

  return router;
}
