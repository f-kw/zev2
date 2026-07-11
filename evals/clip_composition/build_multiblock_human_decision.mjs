import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = workspaceRoot();
const options = parseOptions(process.argv.slice(2));

function workspaceRoot() {
  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error('pnpm-workspace.yaml が見つかりません');
    }
    current = parent;
  }
}

function parseOptions(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`--${key} の値を指定してください`);
    }
    values.set(key, value);
    index += 1;
  }
  return {
    templatePath: resolveRequired(values, 'template'),
    responsePath: resolveRequired(values, 'response'),
    outputPath: resolveRequired(values, 'output')
  };
}

function resolveRequired(values, key) {
  const value = values.get(key)?.trim();
  if (!value) throw new Error(`--${key} を指定してください`);
  return path.isAbsolute(value) ? value : path.join(root, value);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function boundaryStatus(boundary) {
  const values = [boundary.clipSwitch, boundary.sourcePositionSwitches, boundary.beforeMatches, boundary.afterMatches];
  if (values.every((value) => value === true)) return 'confirmed';
  if (values.some((value) => value === null)) return 'unresolved';
  return 'rejected';
}

async function main() {
  const [template, response] = await Promise.all([
    readFile(options.templatePath, 'utf8').then(JSON.parse),
    readFile(options.responsePath, 'utf8').then(JSON.parse)
  ]);
  assert(template.kind === 'clip_composition_multiblock_material_human_decision', 'template.kindが不正です');
  assert(response.kind === 'clip_composition_multiblock_material_human_review_response', 'response.kindが不正です');
  assert(response.fixtureId === template.fixtureId, 'fixtureIdが一致しません');
  assert(response.boundaries.length === template.boundaries.length, '境界回答数が一致しません');

  const accepted = new Set(response.acceptedBlockIndexes);
  const rejected = new Map(response.rejectedBlocks.map((block) => [block.blockIndex, block.reason]));
  const allBlockIndexes = new Set([...accepted, ...rejected.keys()]);
  assert(allBlockIndexes.size === template.blocks.length, '全blockの人間判定が揃っていません');
  assert([...accepted].every((index) => !rejected.has(index)), 'accepted/rejected blockが重複しています');

  const boundaryByIndex = new Map(response.boundaries.map((boundary) => [boundary.boundaryIndex, boundary]));
  const observedBoundaries = template.boundaries.map((boundary) => {
    const answer = boundaryByIndex.get(boundary.boundaryIndex);
    assert(answer, `境界${boundary.boundaryIndex}の回答がありません`);
    const status = boundaryStatus(answer);
    const facts = `clip時間ジャンプ=${answer.clipSwitch} / source位置切替=${answer.sourcePositionSwitches} / 前側対応=${answer.beforeMatches} / 後側対応=${answer.afterMatches}`;
    return {
      ...boundary,
      status,
      beforeMatches: answer.beforeMatches,
      afterMatches: answer.afterMatches,
      sourcePositionSwitches: answer.sourcePositionSwitches,
      note: `${facts}${answer.note ? ` / メモ=${answer.note}` : ''}`,
      humanObservation: {
        status,
        clipSwitch: answer.clipSwitch,
        sourcePositionSwitches: answer.sourcePositionSwitches,
        beforeMatches: answer.beforeMatches,
        afterMatches: answer.afterMatches
      }
    };
  });
  assert(observedBoundaries.every((boundary) => boundary.status !== 'pending'), '未回答の境界があります');

  const blocks = template.blocks.map((block) => {
    if (accepted.has(block.blockIndex)) {
      return { ...block, status: 'accepted', note: '' };
    }
    const reason = rejected.get(block.blockIndex);
    assert(reason, `block ${block.blockIndex}の不採用理由がありません`);
    return { ...block, status: 'rejected', note: reason };
  });
  const boundaries = observedBoundaries.map((boundary) => {
    const adjacentBlocksAccepted = accepted.has(boundary.beforeBlockIndex) && accepted.has(boundary.afterBlockIndex);
    if (adjacentBlocksAccepted || boundary.status !== 'confirmed') {
      return boundary;
    }
    const rejectedAdjacent = [boundary.beforeBlockIndex, boundary.afterBlockIndex]
      .filter((blockIndex) => rejected.has(blockIndex));
    return {
      ...boundary,
      status: 'rejected',
      note: `${boundary.note} / 人間観察では境目自体は問題なし。不採用block ${rejectedAdjacent.join(', ')}へ接続するためfixture対象外。`,
      scoringTreatment: 'excluded_with_rejected_adjacent_block'
    };
  });

  const decision = {
    ...template,
    evidence: {
      ...template.evidence,
      humanResponsePath: path.relative(root, options.responsePath)
    },
    humanConfirmation: {
      checkedBy: response.checkedBy,
      checkedAt: response.checkedAt,
      method: response.method,
      allBlocksReviewed: true,
      allBoundariesReviewed: true,
      note: response.humanNote
    },
    blocks,
    boundaries,
    fixedTheme: {
      ...template.fixedTheme,
      title: response.fixedTheme,
      summary: response.fixedTheme
    },
    readyForFreeze: response.proceedToPostHumanDryRun === true
  };

  await mkdir(path.dirname(options.outputPath), { recursive: true });
  await writeFile(options.outputPath, `${JSON.stringify(decision, null, 2)}\n`, 'utf8');
  console.log(`output: ${path.relative(root, options.outputPath)}`);
  console.log(`accepted blocks: ${[...accepted].join(', ')}`);
  console.log(`rejected blocks: ${[...rejected.keys()].join(', ')}`);
  console.log(`confirmed boundaries: ${boundaries.filter((boundary) => boundary.status === 'confirmed').length}`);
  console.log(`rejected boundaries: ${boundaries.filter((boundary) => boundary.status === 'rejected').map((boundary) => boundary.boundaryIndex).join(', ')}`);
  console.log(`ready for post-human dry-run: ${decision.readyForFreeze}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
