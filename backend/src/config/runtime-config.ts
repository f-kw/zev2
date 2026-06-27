import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { recordValue, type RuntimeConfig, type SttRuntimeMode } from '@zev2/shared';

const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  stt: {
    mode: 'fixed',
    localServerUrl: 'http://192.168.1.7:8000',
    language: 'ja-JP'
  },
  source: {
    defaultUri: 'runtime/artifacts/draft_w4Lp9IJC6pQl3FsRfFL9t/source-video.mp4',
    defaultPurpose: '固定データでショート動画を作成する'
  }
};

function workspaceRoot(): string {
  if (process.env.ZEV2_WORKSPACE_ROOT) {
    return path.resolve(process.env.ZEV2_WORKSPACE_ROOT);
  }

  const current = process.cwd();
  if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
    return current;
  }

  const parent = path.resolve(current, '..');
  if (existsSync(path.join(parent, 'pnpm-workspace.yaml'))) {
    return parent;
  }

  return current;
}

function runtimeConfigPath(): string {
  return process.env.ZEV2_RUNTIME_CONFIG_PATH
    ? path.resolve(process.env.ZEV2_RUNTIME_CONFIG_PATH)
    : path.join(workspaceRoot(), 'config', 'runtime.json');
}

function parseSttMode(value: unknown): SttRuntimeMode {
  if (value === 'fixed' || value === 'local') {
    return value;
  }

  throw new Error('設定ファイルの stt.mode は fixed または local を指定してください');
}

function stringFromConfig(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeRuntimeConfig(value: unknown): RuntimeConfig {
  const root = recordValue(value);
  const stt = recordValue(root.stt);
  const source = recordValue(root.source);

  return {
    stt: {
      mode: parseSttMode(stt.mode ?? DEFAULT_RUNTIME_CONFIG.stt.mode),
      localServerUrl: stringFromConfig(stt.localServerUrl, DEFAULT_RUNTIME_CONFIG.stt.localServerUrl),
      language: stringFromConfig(stt.language, DEFAULT_RUNTIME_CONFIG.stt.language)
    },
    source: {
      defaultUri: stringFromConfig(source.defaultUri, DEFAULT_RUNTIME_CONFIG.source.defaultUri),
      defaultPurpose: stringFromConfig(source.defaultPurpose, DEFAULT_RUNTIME_CONFIG.source.defaultPurpose)
    }
  };
}

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  const filePath = runtimeConfigPath();
  if (!existsSync(filePath)) {
    return DEFAULT_RUNTIME_CONFIG;
  }

  const raw = await readFile(filePath, 'utf8');
  try {
    return normalizeRuntimeConfig(JSON.parse(raw) as unknown);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`設定ファイルを読めません: ${filePath}\n${message}`);
  }
}

export function createRunnerEnvironmentFromConfig(config: RuntimeConfig): Record<string, string> {
  if (config.stt.mode === 'fixed') {
    return {
      ZEV2_USE_FIXED_AGENT_ARTIFACTS: '1',
      ZEV2_STT_SERVER_URL: '',
      ZEV_STT_SERVER_URL: '',
      ZEV2_STT_LANGUAGE: config.stt.language
    };
  }

  return {
    ZEV2_USE_FIXED_AGENT_ARTIFACTS: '0',
    ZEV2_STT_SERVER_URL: config.stt.localServerUrl,
    ZEV_STT_SERVER_URL: config.stt.localServerUrl,
    ZEV2_STT_LANGUAGE: config.stt.language
  };
}
