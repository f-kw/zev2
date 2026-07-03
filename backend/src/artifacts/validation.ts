import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, open, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import {
  getFileRefKindForRequest,
  type AgentCompletionInput,
  type AgentRequest,
  type FileRef
} from '@zev2/shared';
import {
  artifactPathByUrl as resolveArtifactPathByUrl,
  artifactRoot as resolveArtifactRoot,
  artifactUrlPrefix
} from './artifact-path.js';
import { resolveRuntimeDir } from '../config/runtime-dir.js';

const runtimeDir = resolveRuntimeDir();

export function artifactRoot(): string {
  return resolveArtifactRoot(runtimeDir);
}

export function artifactPathByUrl(uri: string): string {
  return resolveArtifactPathByUrl(runtimeDir, uri);
}

export async function hashFileSha256(artifactPath: string): Promise<string> {
  const hash = createHash('sha256');
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(artifactPath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });
  return hash.digest('hex');
}

export async function readArtifactFileMetadata(artifactPath: string): Promise<ArtifactFileMetadata> {
  const fileStatus = await stat(artifactPath);
  return {
    artifactFileName: path.basename(artifactPath),
    byteSize: fileStatus.size,
    sha256: await hashFileSha256(artifactPath)
  };
}

export function normalizedMimeType(mimeType: string): string {
  return mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
}

export function isJsonMimeType(mimeType: string): boolean {
  const normalized = normalizedMimeType(mimeType);
  return normalized === 'application/json' || normalized.endsWith('+json');
}

export function isVideoMimeType(mimeType: string): boolean {
  return normalizedMimeType(mimeType).startsWith('video/');
}

export async function readJsonArtifactKind(artifactPath: string): Promise<string | undefined> {
  const raw = await readFile(artifactPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object' || !('kind' in parsed)) {
    return undefined;
  }

  const kind = (parsed as { kind?: unknown }).kind;
  return typeof kind === 'string' ? kind : undefined;
}

export async function isMp4File(artifactPath: string): Promise<boolean> {
  const handle = await open(artifactPath, 'r');
  try {
    const header = Buffer.alloc(12);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    return bytesRead >= 8 && header.subarray(4, 8).toString('ascii') === 'ftyp';
  } finally {
    await handle.close();
  }
}

export async function validateMp4Artifact(artifactPath: string): Promise<string | undefined> {
  try {
    const isMp4 = await isMp4File(artifactPath);
    return isMp4 ? undefined : '動画成果物はMP4ファイルを指定してください';
  } catch {
    return '動画成果物を読めません';
  }
}

export async function validateCompletionFileRef(
  agentRequest: AgentRequest,
  fileRef: AgentCompletionInput['fileRef']
): Promise<{ artifactPath: string; metadata: ArtifactFileMetadata } | { error: string }> {
  if (!fileRef) {
    return { error: 'AI操作の完了には成果物参照が必要です' };
  }

  const uri = fileRef.uri.trim();
  const mimeType = fileRef.mimeType.trim();
  const expectedKind = getFileRefKindForRequest(agentRequest.type);
  const validation = await validateArtifactFileRefForKind(agentRequest.requestDraftId, expectedKind, uri, mimeType);
  if ('error' in validation) {
    return validation;
  }

  try {
    return {
      artifactPath: validation.artifactPath,
      metadata: await readArtifactFileMetadata(validation.artifactPath)
    };
  } catch {
    return { error: '成果物参照のファイル情報を読めません' };
  }
}

export async function validateArtifactFileRefForKind(
  requestDraftId: string,
  expectedKind: FileRef['kind'],
  uri: string,
  mimeType: string
): Promise<{ artifactPath: string } | { error: string }> {
  const normalizedUri = uri.trim();
  const normalizedMimeTypeValue = mimeType.trim();
  const expectedPrefix = `${artifactUrlPrefix}${encodeURIComponent(requestDraftId)}/`;
  if (!normalizedUri.startsWith(expectedPrefix)) {
    return { error: '成果物参照は対象の編集コピー配下に保存してください' };
  }

  let artifactPath = '';
  try {
    artifactPath = artifactPathByUrl(normalizedUri);
  } catch {
    return { error: '成果物参照のURIが不正です' };
  }

  try {
    await access(artifactPath);
  } catch {
    return { error: '成果物参照のファイルが見つかりません' };
  }

  if (expectedKind === 'output_video') {
    if (!isVideoMimeType(normalizedMimeTypeValue)) {
      return { error: '動画生成工程の成果物参照は動画ファイルを指定してください' };
    }

    const videoError = await validateMp4Artifact(artifactPath);
    return videoError ? { error: videoError } : { artifactPath };
  }

  if (expectedKind === 'source_video' && isVideoMimeType(normalizedMimeTypeValue)) {
    const videoError = await validateMp4Artifact(artifactPath);
    return videoError ? { error: videoError } : { artifactPath };
  }

  if (!isJsonMimeType(normalizedMimeTypeValue)) {
    return { error: 'このAI工程の成果物参照はJSONファイルを指定してください' };
  }

  try {
    const actualKind = await readJsonArtifactKind(artifactPath);
    if (actualKind !== expectedKind) {
      return { error: '成果物参照の種別がAI工程と一致していません' };
    }
  } catch {
    return { error: '成果物参照のJSONを読めません' };
  }

  return { artifactPath };
}

export type ArtifactFileMetadata = {
  artifactFileName: string;
  byteSize: number;
  sha256: string;
};
