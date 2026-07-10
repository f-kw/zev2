import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const options = parseOptions(process.argv.slice(2));

function parseOptions(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      continue;
    }
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      throw new Error(`${item} に値がありません`);
    }
    values.set(key, next);
    index += 1;
  }
  const inputs = values.get('inputs')?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
  const output = values.get('output')?.trim();
  if (inputs.length < 2) {
    throw new Error('--inputs に複数のDP結果JSONをカンマ区切りで指定してください');
  }
  if (!output) {
    throw new Error('--output を指定してください');
  }
  return {
    inputs: inputs.map((item) => path.resolve(item)),
    output: path.resolve(output)
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function runKey(run) {
  return [run.clipStartMs, run.clipEndMs, run.sourceStartMs, run.sourceEndMs].join(':');
}

function assertRun(run, inputPath, runOffset) {
  for (const field of ['clipStartMs', 'clipEndMs', 'sourceStartMs', 'sourceEndMs', 'matchedWordPairCount']) {
    if (!Number.isFinite(run?.[field])) {
      throw new Error(`${inputPath} candidateRuns[${runOffset}] の ${field} が不正です`);
    }
  }
  if (run.clipEndMs <= run.clipStartMs || run.sourceEndMs <= run.sourceStartMs) {
    throw new Error(`${inputPath} candidateRuns[${runOffset}] の時間範囲が不正です`);
  }
}

const inputs = [];
for (const inputPath of options.inputs) {
  const payload = await readJson(inputPath);
  const candidateRuns = payload?.alignment?.candidateRuns;
  if (!Array.isArray(candidateRuns) || candidateRuns.length === 0) {
    throw new Error(`${inputPath} にcandidateRunsがありません`);
  }
  candidateRuns.forEach((run, index) => assertRun(run, inputPath, index));
  inputs.push({ inputPath, payload, candidateRuns });
}

const byKey = new Map();
for (const [inputIndex, input] of inputs.entries()) {
  for (const run of input.candidateRuns) {
    const key = runKey(run);
    const provenance = {
      inputIndex: inputIndex + 1,
      inputPath: input.inputPath,
      originalRunIndex: run.index
    };
    const existing = byKey.get(key);
    if (existing) {
      existing.provenance.push(provenance);
      continue;
    }
    byKey.set(key, { run, provenance: [provenance] });
  }
}

const mergedEntries = [...byKey.values()].sort((left, right) => (
  left.run.clipStartMs - right.run.clipStartMs ||
  left.run.clipEndMs - right.run.clipEndMs ||
  left.run.sourceStartMs - right.run.sourceStartMs ||
  left.run.sourceEndMs - right.run.sourceEndMs
));

for (let leftIndex = 0; leftIndex < mergedEntries.length; leftIndex += 1) {
  for (let rightIndex = leftIndex + 1; rightIndex < mergedEntries.length; rightIndex += 1) {
    const left = mergedEntries[leftIndex].run;
    const right = mergedEntries[rightIndex].run;
    const clipOverlaps = left.clipStartMs < right.clipEndMs && right.clipStartMs < left.clipEndMs;
    const sourceOverlaps = left.sourceStartMs < right.sourceEndMs && right.sourceStartMs < left.sourceEndMs;
    if (clipOverlaps || sourceOverlaps) {
      throw new Error(
        `統合後の候補直線が競合します: ${runKey(left)} / ${runKey(right)}`
      );
    }
  }
}

const candidateRuns = mergedEntries.map((entry, index) => ({
  ...entry.run,
  index,
  candidateRunUnion: {
    provenance: entry.provenance
  }
}));

const primary = inputs[0].payload;
const result = {
  kind: 'clip_composition_dp_candidate_run_union',
  runAt: new Date().toISOString(),
  clip: primary.clip,
  source: primary.source,
  settings: {
    mergeRule: '候補直線のclip開始/終了とsource開始/終了の4時刻がすべて完全一致する場合だけ重複除外',
    conflictRule: 'clipまたはsourceの時間範囲が重なる非一致候補があれば処理を失敗させる',
    inputPrecedence: '完全一致した候補本体は--inputsの先頭を保持',
    coefficientsAdded: false
  },
  inputs: inputs.map((input, index) => ({
    inputIndex: index + 1,
    inputPath: input.inputPath,
    candidateRunCount: input.candidateRuns.length
  })),
  alignment: {
    candidateRuns,
    allRuns: candidateRuns,
    boundaryCandidates: {
      offsetJumpCandidates: [],
      note: '入力ごとにpairIndex系が異なるため、統合結果でoffset jumpのpairIndexを作らない。素材境界は統合候補直線の実時刻差から再構成する。'
    },
    unionSummary: {
      inputCandidateRunCount: inputs.reduce((sum, input) => sum + input.candidateRuns.length, 0),
      exactDuplicateCount: inputs.reduce((sum, input) => sum + input.candidateRuns.length, 0) - candidateRuns.length,
      mergedCandidateRunCount: candidateRuns.length
    }
  }
};

await writeFile(options.output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(`result: ${options.output}`);
console.log(`candidate runs: ${candidateRuns.length}`);
console.log(`exact duplicates: ${result.alignment.unionSummary.exactDuplicateCount}`);
