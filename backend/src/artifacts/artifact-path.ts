import path from 'node:path';

export const artifactUrlPrefix = '/api/artifacts/';

export function artifactRoot(runtimeDir: string): string {
  return path.join(runtimeDir, 'artifacts');
}

export function artifactUrl(requestDraftId: string, fileName: string): string {
  return `${artifactUrlPrefix}${encodeURIComponent(requestDraftId)}/${encodeURIComponent(fileName)}`;
}

export function artifactPathByUrl(runtimeDir: string, uri: string): string {
  if (!uri.startsWith(artifactUrlPrefix)) {
    throw new Error(`成果物URIを読めません: ${uri}`);
  }

  const relativePath = uri.slice(artifactUrlPrefix.length).split('/').map(decodeURIComponent).join(path.sep);
  const root = path.resolve(artifactRoot(runtimeDir));
  const artifactPath = path.resolve(root, relativePath);
  if (!artifactPath.startsWith(`${root}${path.sep}`)) {
    throw new Error(`成果物URIの保存先が不正です: ${uri}`);
  }

  return artifactPath;
}

export function artifactDestination(runtimeDir: string, requestDraftId: string, fileName: string): string {
  const draftDirectory = path.resolve(artifactRoot(runtimeDir), requestDraftId);
  const destinationPath = path.resolve(draftDirectory, fileName);
  if (!destinationPath.startsWith(`${draftDirectory}${path.sep}`)) {
    throw new Error('成果物保存先が不正です');
  }

  return destinationPath;
}
