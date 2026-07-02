import path from 'node:path';

export function resolveRuntimeDir(): string {
  return process.env.ZEV2_RUNTIME_DIR
    ? path.resolve(process.env.ZEV2_RUNTIME_DIR)
    : path.resolve(process.cwd(), '../runtime');
}
