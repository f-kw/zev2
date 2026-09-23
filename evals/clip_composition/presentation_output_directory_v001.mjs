import {execFileSync} from 'node:child_process';
import {lstatSync} from 'node:fs';
import path from 'node:path';

/** Check a new run directory before any generated files are written. */
export function assertIgnoredPresentationOutputDirectoryV001({repositoryRoot, outputDirectory}) {
  const root = path.resolve(repositoryRoot);
  const output = path.resolve(outputDirectory);
  const relative = path.relative(root, output);
  if (relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`)
      || path.isAbsolute(relative)) throw new TypeError('output must be inside the repository');
  const canonicalRoot = execFileSync('git', ['-C', root, 'rev-parse', '--show-toplevel'],
    {encoding: 'utf8'}).trim();
  if (path.resolve(canonicalRoot) !== root) throw new TypeError('repository root must be explicit');
  let current = root;
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part);
    try {
      const stat = lstatSync(current);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw new TypeError('output parent must be a real directory');
      if (current === output) throw new TypeError('output must be an unused run directory');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  const tracked = execFileSync('git', ['-C', root, 'ls-files', '-z', '--', relative]);
  if (tracked.length !== 0) throw new TypeError('output may not contain tracked files');
  const probe = path.posix.join(relative.split(path.sep).join('/'), 'generated-output-probe.txt');
  let rule;
  try {
    execFileSync('git', ['-C', root, 'check-ignore', '--no-index', '-q', '--', probe],
      {stdio: ['ignore', 'pipe', 'pipe']});
    rule = execFileSync('git', ['-C', root, 'check-ignore', '--no-index', '-v', '--', probe],
      {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
  } catch {
    throw new TypeError('output is not covered by an explicit generated-data ignore rule');
  }
  if (rule.length === 0) throw new TypeError('output ignore rule was not reported');
  return Object.freeze({repositoryRoot: root, outputDirectory: output, relativeDirectory: relative,
    matchedIgnoreRule: rule, directoryCreated: false});
}
