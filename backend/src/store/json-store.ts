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
    return JSON.parse(raw) as Zev2State;
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
