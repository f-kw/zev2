import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AgentRequest, FileRef, Zev2State } from '@zev2/shared';
import type { ArtifactInfo, SourceVideoArtifact } from '../workflow-artifacts.js';

export type SourceVideoArtifactContext = {
  youtubeDownloaderCommand: string;
  sourceVideoFileName: string;
  sourceVideoMetadataFileName: string;
  workspaceRoot: () => string;
  requestArtifactDir: (request: AgentRequest) => string;
  artifactUrl: (request: AgentRequest, fileName: string) => string;
  artifactPathByUrl: (uri: string) => string;
  findRequestOutputFileRef: (
    state: Zev2State,
    requestDraftId: string,
    type: 'prepare_video'
  ) => FileRef | undefined;
  writeJsonArtifact: (request: AgentRequest, kind: 'source_video', payload: unknown) => Promise<ArtifactInfo>;
  runCommand: (command: string, args: string[]) => Promise<void>;
};

function resolveLocalSourcePath(sourceUri: string, workspaceRoot: string): string | undefined {
  if (sourceUri.startsWith('file://')) {
    const url = new URL(sourceUri);
    if (url.hostname && url.hostname !== 'localhost') {
      return undefined;
    }

    const filePath = decodeURIComponent(url.pathname);
    return existsSync(filePath) ? filePath : undefined;
  }

  if (path.isAbsolute(sourceUri) && existsSync(sourceUri)) {
    return sourceUri;
  }

  const workspacePath = path.resolve(workspaceRoot, sourceUri);
  return existsSync(workspacePath) ? workspacePath : undefined;
}

function isYoutubeSourceUri(sourceUri: string): boolean {
  try {
    const url = new URL(sourceUri);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    return hostname === 'youtu.be' || hostname === 'youtube.com' || hostname === 'm.youtube.com' || hostname.endsWith('.youtube.com');
  } catch {
    return false;
  }
}

function findPreparedSourceVideoPath(
  state: Zev2State,
  requestDraftId: string,
  context: SourceVideoArtifactContext
): string | undefined {
  const sourceRef = context.findRequestOutputFileRef(state, requestDraftId, 'prepare_video');
  if (!sourceRef?.mimeType.startsWith('video/')) {
    return undefined;
  }

  try {
    const sourcePath = context.artifactPathByUrl(sourceRef.uri);
    return existsSync(sourcePath) ? sourcePath : undefined;
  } catch {
    return undefined;
  }
}

export function resolveSourceVideoPathFromState(
  state: Zev2State,
  request: AgentRequest,
  context: SourceVideoArtifactContext
): string | undefined {
  return (
    findPreparedSourceVideoPath(state, request.requestDraftId, context) ??
    resolveLocalSourcePath(request.target.sourceUri, context.workspaceRoot())
  );
}

async function writeSourceVideoMetadata(
  request: AgentRequest,
  payload: SourceVideoArtifact,
  context: SourceVideoArtifactContext
): Promise<void> {
  const directory = context.requestArtifactDir(request);
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, context.sourceVideoMetadataFileName),
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf8'
  );
}

async function prepareYoutubeSourceVideo(
  request: AgentRequest,
  context: SourceVideoArtifactContext
): Promise<ArtifactInfo> {
  const directory = context.requestArtifactDir(request);
  const outputPath = path.join(directory, context.sourceVideoFileName);
  await mkdir(directory, { recursive: true });

  try {
    await context.runCommand(context.youtubeDownloaderCommand, [
      '--no-playlist',
      '--merge-output-format',
      'mp4',
      '-f',
      'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/best',
      '-o',
      outputPath,
      request.target.sourceUri
    ]);
  } catch (error) {
    const errorCode = typeof error === 'object' && error && 'code' in error ? (error as { code?: unknown }).code : undefined;
    const message = error instanceof Error ? error.message : String(error);
    if (errorCode === 'ENOENT') {
      throw new Error(
        `YouTube動画を取得できません。${context.youtubeDownloaderCommand} が実行環境にありません。ZEV2_YTDLP_BIN で実行ファイルを指定するか、yt-dlp をPATHに入れてください。`
      );
    }

    throw new Error(`YouTube動画を取得できません。\n${message}`);
  }

  if (!existsSync(outputPath)) {
    throw new Error('YouTube動画の取得は完了しましたが、保存先の動画ファイルを確認できません');
  }

  const payload: SourceVideoArtifact = {
    kind: 'source_video',
    mode: 'youtube-download',
    sourceUri: request.target.sourceUri,
    purpose: request.input.purpose,
    registeredAt: new Date().toISOString(),
    localPath: outputPath,
    fileName: context.sourceVideoFileName,
    downloadTool: context.youtubeDownloaderCommand
  };
  await writeSourceVideoMetadata(request, payload, context);

  return {
    path: outputPath,
    uri: context.artifactUrl(request, context.sourceVideoFileName),
    mimeType: 'video/mp4',
    access: 'internal',
    payload
  };
}

export async function prepareSourceVideoArtifact(
  request: AgentRequest,
  context: SourceVideoArtifactContext
): Promise<ArtifactInfo> {
  if (isYoutubeSourceUri(request.target.sourceUri)) {
    return prepareYoutubeSourceVideo(request, context);
  }

  const localPath = resolveLocalSourcePath(request.target.sourceUri, context.workspaceRoot());
  const payload: SourceVideoArtifact = {
    kind: 'source_video',
    mode: localPath ? 'local-source-reference' : 'remote-source-reference',
    sourceUri: request.target.sourceUri,
    purpose: request.input.purpose,
    registeredAt: new Date().toISOString(),
    ...(localPath ? { localPath } : {})
  };

  return context.writeJsonArtifact(request, 'source_video', payload);
}
