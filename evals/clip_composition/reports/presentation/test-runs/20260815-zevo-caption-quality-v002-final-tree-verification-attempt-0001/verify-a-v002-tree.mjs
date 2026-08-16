import { execFileSync } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const repositoryRoot = process.cwd();
const commit = '542b35684a3ad67dbab042ca2bb3bff022e42023';
const relativeRoot = 'evals/clip_composition/outputs/presentation/a-v002';
const expectedTreeOid = '2b683b0d82672789bccd1508bc2c7c914c196750';
const outputPath = process.argv[2];

const git = (args, options = {}) => execFileSync('git', args, {
  cwd: repositoryRoot,
  ...options,
});

const treeLine = git(['ls-tree', commit, '--', relativeRoot]).toString('utf8').trim();
const treeMatch = /^040000 tree ([0-9a-f]{40})\t(.+)$/u.exec(treeLine);
if (!treeMatch) throw new Error('A-v002 tree is absent from the recorded commit');

const expectedRows = git(['ls-tree', '-r', commit, '--', relativeRoot])
  .toString('utf8').trim().split('\n').filter(Boolean);
const expectedFiles = new Map(expectedRows.map(row => {
  const match = /^(\d+) blob ([0-9a-f]{40})\t(.+)$/u.exec(row);
  if (!match) throw new Error(`Unexpected tree row: ${row}`);
  return [match[3], { mode: match[1], oid: match[2] }];
}));

const currentFiles = [];
const visit = relativeDirectory => {
  for (const entry of readdirSync(path.join(repositoryRoot, relativeDirectory), {
    withFileTypes: true,
  })) {
    const relative = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) visit(relative);
    else currentFiles.push(relative);
  }
};
visit(relativeRoot);
currentFiles.sort();

const currentOids = currentFiles.length === 0
  ? []
  : git(['hash-object', '--stdin-paths'], {
    input: `${currentFiles.join('\n')}\n`,
  }).toString('utf8').trim().split('\n');

const missingPaths = [...expectedFiles.keys()].filter(file => !currentFiles.includes(file));
const unexpectedPaths = currentFiles.filter(file => !expectedFiles.has(file));
const changedPaths = currentFiles.flatMap((file, index) => {
  const expected = expectedFiles.get(file);
  if (!expected || expected.oid === currentOids[index]) return [];
  return [{ path: file, expectedOid: expected.oid, actualOid: currentOids[index] }];
});

const report = {
  schemaVersion: 'zevo-caption-quality-v002-a-v002-tree-verification-v001',
  commit,
  relativeRoot,
  expectedTreeOid,
  observedCommitTreeOid: treeMatch[1],
  expectedFileCount: expectedFiles.size,
  actualFileCount: currentFiles.length,
  missingPaths,
  unexpectedPaths,
  changedPaths,
  exactMatch: treeMatch[1] === expectedTreeOid
    && missingPaths.length === 0
    && unexpectedPaths.length === 0
    && changedPaths.length === 0,
};

writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify(report));
process.exitCode = report.exactMatch ? 0 : 1;
