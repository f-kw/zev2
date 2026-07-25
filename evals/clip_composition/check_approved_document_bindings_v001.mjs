import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  lstatSync,
  openSync,
  closeSync,
  fstatSync,
  readFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const APPROVED_DOCUMENT_BINDING_SCHEMA_VERSION_V001 =
  'approved-document-binding-v001';
export const APPROVED_DOCUMENT_CHECK_SCHEMA_VERSION_V001 =
  'approved-document-binding-check-report-v001';

export const PRESENTATION_CAPTION_B4_APPROVED_DOCUMENT_BINDINGS_V001 = Object.freeze([
  Object.freeze({
    path: 'evals/clip_composition/reports/presentation/presentation-candidate13-caption-gate-b4-display-plan-contract-design-20260725-v001.md',
    approvalCommit: 'b86178e2066fc27dcf9ec2776d51a6927752ef25',
    gitMode: '100644',
    gitBlobObjectId: 'f2d17273b9208cf7171488236e16f5efadb870c8',
    byteLength: 39617,
    fileSha256: '7a239e2d7c1b759aa4050686f85770abecd107120211db97f7f4985df074e946',
  }),
  Object.freeze({
    path: 'evals/clip_composition/reports/presentation/presentation-candidate13-caption-gate-b4-implementation-contract-addendum-20260725-v001.md',
    approvalCommit: 'cfa558abf936f2af983005f91daf9cddbb735631',
    gitMode: '100644',
    gitBlobObjectId: 'b0f4f028f2d5161f446015173770102c392313ed',
    byteLength: 59790,
    fileSha256: '9e3d3e048b077ddffd8302c896853a3a9b49e655c7fffc110e056a0935f76f77',
  }),
  Object.freeze({
    path: 'evals/clip_composition/reports/presentation/presentation-candidate13-caption-gate-b4-v003-contract-core-implementation-addendum-20260725-v001.md',
    approvalCommit: '07c60b0364b7b6661e47e25c245dcc12a85f0644',
    gitMode: '100644',
    gitBlobObjectId: 'c22eb4a2237b3c01158be77b2cbacbae1245b02a',
    byteLength: 23327,
    fileSha256: 'abeb8e098d830af1af5c540759b3971a508faa53bb75e8380e6f8352a0ccee16',
  }),
  Object.freeze({
    path: 'evals/clip_composition/reports/presentation/presentation-candidate13-caption-gate-b4-contract-closure-and-approved-document-recovery-addendum-20260725-v001.md',
    approvalCommit: '2ff3aa587d2029aa7e0d8ba40b712560adffdec9',
    gitMode: '100644',
    gitBlobObjectId: 'df49f75b14fb55726cdc2614eb28ca0049fbb521',
    byteLength: 22516,
    fileSha256: 'f07f5b2daef10c5bee2f20e6b6d7cf7cfddb600c445d69a41434c19f8a6e81c2',
  }),
]);

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sameStat = (left, right) => (
  left.dev === right.dev
  && left.ino === right.ino
  && left.mode === right.mode
  && left.nlink === right.nlink
  && left.size === right.size
  && left.mtimeNs === right.mtimeNs
  && left.ctimeNs === right.ctimeNs
);

const git = (workspaceRoot, args, encoding = 'utf8') => execFileSync(
  'git',
  args,
  {
    cwd: workspaceRoot,
    encoding,
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);

const inspectBinding = (workspaceRoot, binding) => {
  const absolutePath = resolve(workspaceRoot, binding.path);
  if (absolutePath !== `${workspaceRoot}/${binding.path}`) {
    return { binding, status: 'failed', failure: 'PATH_OUTSIDE_WORKSPACE', observed: null };
  }
  let treeLine;
  let approvedBytes;
  try {
    treeLine = git(
      workspaceRoot,
      ['ls-tree', binding.approvalCommit, '--', binding.path],
    ).trim();
    approvedBytes = git(
      workspaceRoot,
      ['show', `${binding.approvalCommit}:${binding.path}`],
      null,
    );
  } catch {
    return { binding, status: 'failed', failure: 'APPROVAL_COMMIT_READ_FAILED', observed: null };
  }
  const match = /^([0-9]{6}) blob ([0-9a-f]{40})\t/.exec(treeLine);
  const pathStat = lstatSync(absolutePath, { bigint: true });
  if (!pathStat.isFile() || pathStat.isSymbolicLink()) {
    return { binding, status: 'failed', failure: 'WORKTREE_NOT_REGULAR_FILE', observed: null };
  }
  const fd = openSync(absolutePath, 'r');
  let before;
  let bytes;
  let after;
  try {
    before = fstatSync(fd, { bigint: true });
    bytes = readFileSync(fd);
    after = fstatSync(fd, { bigint: true });
  } finally {
    closeSync(fd);
  }
  const observed = {
    approvalGitMode: match?.[1] ?? null,
    approvalGitBlobObjectId: match?.[2] ?? null,
    approvalByteLength: approvedBytes.length,
    approvalFileSha256: sha256(approvedBytes),
    worktreeGitMode: `100${(Number(pathStat.mode & 0o777n)).toString(8).padStart(3, '0')}`,
    worktreeByteLength: bytes.length,
    worktreeFileSha256: sha256(bytes),
    stableRead: sameStat(before, after),
  };
  const status = observed.approvalGitMode === binding.gitMode
    && observed.approvalGitBlobObjectId === binding.gitBlobObjectId
    && observed.approvalByteLength === binding.byteLength
    && observed.approvalFileSha256 === binding.fileSha256
    && observed.worktreeGitMode === binding.gitMode
    && observed.worktreeByteLength === binding.byteLength
    && observed.worktreeFileSha256 === binding.fileSha256
    && observed.stableRead
    ? 'passed'
    : 'failed';
  return {
    binding,
    status,
    failure: status === 'passed' ? null : 'APPROVED_DOCUMENT_BINDING_MISMATCH',
    observed,
  };
};

export function checkApprovedDocumentBindingsV001({
  workspaceRoot,
  phase,
  bindings,
}) {
  const results = bindings.map((binding) => inspectBinding(workspaceRoot, binding));
  return {
    schemaVersion: APPROVED_DOCUMENT_CHECK_SCHEMA_VERSION_V001,
    phase,
    status: results.every((result) => result.status === 'passed') ? 'passed' : 'failed',
    results,
  };
}

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) {
    process.stdout.write(`${JSON.stringify({
      schemaVersion: APPROVED_DOCUMENT_CHECK_SCHEMA_VERSION_V001,
      status: 'failed',
      diagnostic: 'USAGE',
    }, null, 2)}\n`);
    process.exitCode = 2;
  } else {
    const phase = process.argv[2];
    const allowedPhases = new Set([
      'implementation-start',
      'formal-test-start',
      'completion-and-stable-tag',
    ]);
    if (!allowedPhases.has(phase)) {
      process.stdout.write(`${JSON.stringify({
        schemaVersion: APPROVED_DOCUMENT_CHECK_SCHEMA_VERSION_V001,
        status: 'failed',
        diagnostic: 'PHASE_UNSUPPORTED',
      }, null, 2)}\n`);
      process.exitCode = 2;
    } else {
      const report = checkApprovedDocumentBindingsV001({
        workspaceRoot,
        phase,
        bindings: PRESENTATION_CAPTION_B4_APPROVED_DOCUMENT_BINDINGS_V001,
      });
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exitCode = report.status === 'passed' ? 0 : 1;
    }
  }
}
