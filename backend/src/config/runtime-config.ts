import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  recordValue,
  type AdjustmentRuntimeMode,
  type ContentDiscoveryRuntimeMode,
  type GeminiRuntimeMode,
  type RuntimeConfig,
  type SttRuntimeMode
} from '@zev2/shared';

const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  stt: {
    mode: 'fixed',
    localServerUrl: 'http://192.168.1.7:8000',
    language: 'ja-JP'
  },
  contentDiscovery: {
    mode: 'fixed'
  },
  editPlan: {
    mode: 'fixed'
  },
  adjustment: {
    mode: 'fixed'
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
    : path.join(workspaceRoot(), 'config', 'runtime.jsonc');
}

function parseSttMode(value: unknown): SttRuntimeMode {
  if (value === 'fixed' || value === 'local') {
    return value;
  }

  throw new Error('設定ファイルの stt.mode は fixed または local を指定してください');
}

function parseGeminiRuntimeMode(value: unknown, pathLabel: string): GeminiRuntimeMode {
  if (value === 'fixed' || value === 'gemini') {
    return value;
  }

  throw new Error(`設定ファイルの ${pathLabel} は fixed または gemini を指定してください`);
}

function parseContentDiscoveryRuntimeMode(value: unknown): ContentDiscoveryRuntimeMode {
  if (value === 'fixed' || value === 'transcript') {
    return value;
  }

  throw new Error('設定ファイルの contentDiscovery.mode は fixed または transcript を指定してください');
}

function parseAdjustmentRuntimeMode(value: unknown): AdjustmentRuntimeMode {
  if (value === 'fixed') {
    return value;
  }

  throw new Error('設定ファイルの adjustment.mode は fixed を指定してください');
}

function stringFromConfig(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function removeJsonComments(input: string): string {
  let output = '';
  let insideString = false;
  let escaped = false;
  let insideLineComment = false;
  let insideBlockComment = false;

  for (let index = 0; index < input.length; index += 1) {
    const current = input[index] ?? '';
    const next = input[index + 1] ?? '';

    if (insideLineComment) {
      if (current === '\n' || current === '\r') {
        insideLineComment = false;
        output += current;
      }
      continue;
    }

    if (insideBlockComment) {
      if (current === '*' && next === '/') {
        insideBlockComment = false;
        index += 1;
        continue;
      }

      if (current === '\n' || current === '\r') {
        output += current;
      }
      continue;
    }

    if (insideString) {
      output += current;
      if (escaped) {
        escaped = false;
        continue;
      }

      if (current === '\\') {
        escaped = true;
        continue;
      }

      if (current === '"') {
        insideString = false;
      }
      continue;
    }

    if (current === '"') {
      insideString = true;
      output += current;
      continue;
    }

    if (current === '/' && next === '/') {
      insideLineComment = true;
      index += 1;
      continue;
    }

    if (current === '/' && next === '*') {
      insideBlockComment = true;
      index += 1;
      continue;
    }

    output += current;
  }

  return output;
}

function normalizeRuntimeConfig(value: unknown): RuntimeConfig {
  const root = recordValue(value);
  const stt = recordValue(root.stt);
  const contentDiscovery = recordValue(root.contentDiscovery);
  const editPlan = recordValue(root.editPlan);
  const adjustment = recordValue(root.adjustment);
  const source = recordValue(root.source);

  return {
    stt: {
      mode: parseSttMode(stt.mode ?? DEFAULT_RUNTIME_CONFIG.stt.mode),
      localServerUrl: stringFromConfig(stt.localServerUrl, DEFAULT_RUNTIME_CONFIG.stt.localServerUrl),
      language: stringFromConfig(stt.language, DEFAULT_RUNTIME_CONFIG.stt.language)
    },
    contentDiscovery: {
      mode: parseContentDiscoveryRuntimeMode(
        contentDiscovery.mode ?? DEFAULT_RUNTIME_CONFIG.contentDiscovery.mode
      )
    },
    editPlan: {
      mode: parseGeminiRuntimeMode(
        editPlan.mode ?? DEFAULT_RUNTIME_CONFIG.editPlan.mode,
        'editPlan.mode'
      )
    },
    adjustment: {
      mode: parseAdjustmentRuntimeMode(adjustment.mode ?? DEFAULT_RUNTIME_CONFIG.adjustment.mode)
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
    return normalizeRuntimeConfig(JSON.parse(removeJsonComments(raw)) as unknown);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`設定ファイルを読めません: ${filePath}\n${message}`);
  }
}

export function createRunnerEnvironmentFromConfig(config: RuntimeConfig): Record<string, string> {
  const stageModes = {
    ZEV2_CONTENT_DISCOVERY_MODE: config.contentDiscovery.mode,
    ZEV2_EDIT_PLAN_MODE: config.editPlan.mode,
    ZEV2_ADJUSTMENT_MODE: config.adjustment.mode
  };

  if (config.stt.mode === 'fixed') {
    return {
      ...stageModes,
      ZEV2_STT_RUNTIME_MODE: 'fixed',
      ZEV2_STT_SERVER_URL: '',
      ZEV_STT_SERVER_URL: '',
      ZEV2_STT_LANGUAGE: config.stt.language
    };
  }

  return {
    ...stageModes,
    ZEV2_STT_RUNTIME_MODE: 'local',
    ZEV2_STT_SERVER_URL: config.stt.localServerUrl,
    ZEV_STT_SERVER_URL: config.stt.localServerUrl,
    ZEV2_STT_LANGUAGE: config.stt.language
  };
}
