import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';

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

const rows = git(['ls-tree', '-r', commit, '--', relativeRoot])
  .toString('utf8').trim().split('\n').filter(Boolean);
const expectedFiles = rows.map(row => {
  const match = /^(\d+) blob ([0-9a-f]{40})\t(.+)$/u.exec(row);
  if (!match) throw new Error(`Unexpected tree row: ${row}`);
  return { mode: match[1], oid: match[2], path: match[3] };
});

const missingPaths = expectedFiles.filter(row => !existsSync(row.path)).map(row => row.path);
const existingPaths = expectedFiles.filter(row => existsSync(row.path)).map(row => row.path);
const currentOids = existingPaths.length === 0
  ? []
  : git(['hash-object', '--stdin-paths'], {
      input: `${existingPaths.join('\n')}\n`,
    }).toString('utf8').trim().split('\n');
const actualOidByPath = new Map(existingPaths.map((file, index) => [file, currentOids[index]));
const changedPaths = expectedFiles.flatMap(row => {
  const actualOid = actualOidByPath.get(row.path);
  if (!actualOid || actualOid === row.oid) return [];
  return [{ path: row.path, expectedOid: row.oid, actualOid }];
});

const exact = treeMatch[1] === expectedTreeOid
  && expectedFiles.length === 2887
  && missingPaths.length === 0
  && changedPaths.length === 0;
const report = {
  schemaVersion: 'zevo-caption-quality-v002-a-v002-recorded-tree-verification-v002',
  commit,
  relativeRoot,
  expectedTreeOid,
  observedCommitTreeOid: treeMatch[1],
  recordedFileCount: expectedFiles.length,
  missingPaths,
  changedPaths,
  exact,
};

writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify(report));
process.exitCode = exact ? 0 : 1;
