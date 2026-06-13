import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createInitialState, type Zev2State } from '@zev2/shared';

const runtimeDir = process.env.ZEV2_RUNTIME_DIR
  ? path.resolve(process.env.ZEV2_RUNTIME_DIR)
  : path.resolve(process.cwd(), '../runtime');

const statePath = path.join(runtimeDir, 'state.json');

function createEmptyState(): Zev2State {
  return createInitialState();
}

function isZev2State(value: unknown): value is Zev2State {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const state = value as Partial<Record<keyof Zev2State, unknown>>;
  return (
    Array.isArray(state.requestDrafts) &&
    Array.isArray(state.agentRequests) &&
    Array.isArray(state.fileRefs) &&
    Array.isArray(state.outputs) &&
    Array.isArray(state.decisionLogs) &&
    Array.isArray(state.controlReviewItems) &&
    Array.isArray(state.humanReviewActions)
  );
}

export async function loadState(): Promise<Zev2State> {
  await mkdir(runtimeDir, { recursive: true });

  if (!existsSync(statePath)) {
    const initialState = createEmptyState();
    await saveState(initialState);
    return initialState;
  }

  const raw = await readFile(statePath, 'utf8');
  if (!raw.trim()) {
    const initialState = createEmptyState();
    await saveState(initialState);
    return initialState;
  }

  try {
    const state = JSON.parse(raw) as unknown;
    if (isZev2State(state)) {
      return state;
    }

    const brokenStatePath = `${statePath}.broken-${Date.now()}`;
    await rename(statePath, brokenStatePath);
    const initialState = createEmptyState();
    await saveState(initialState);
    return initialState;
  } catch {
    const brokenStatePath = `${statePath}.broken-${Date.now()}`;
    await rename(statePath, brokenStatePath);
    const initialState = createEmptyState();
    await saveState(initialState);
    return initialState;
  }
}

export async function saveState(state: Zev2State): Promise<void> {
  await mkdir(runtimeDir, { recursive: true });
  const temporaryPath = `${statePath}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(state, null, 2));
  await rename(temporaryPath, statePath);
}
