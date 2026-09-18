import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, writeFileSync, symlinkSync, existsSync, realpathSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {assertIgnoredPresentationOutputDirectoryV001} from './presentation_output_directory_v001.mjs';

test('a new ignored run stays out of status while source remains visible', () => {
  const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'zev-output-directory-check-')));
  execFileSync('git', ['init', '-q', root]);
  writeFileSync(path.join(root, '.gitignore'), '/generated/run-*/\n');
  const output = path.join(root, 'generated/run-proof');
  const proof = assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: root, outputDirectory: output});
  assert.equal(proof.directoryCreated, false);
  assert.equal(existsSync(output), false);
  mkdirSync(output, {recursive: true});
  writeFileSync(path.join(output, 'frame.png'), 'synthetic-generated-output');
  writeFileSync(path.join(root, 'source.mjs'), '// intended source\n');
  const status = execFileSync('git', ['-C', root, 'status', '--porcelain=v1', '-uall'], {encoding: 'utf8'});
  assert.match(status, /source\.mjs/);
  assert.doesNotMatch(status, /frame\.png/);
  assert.throws(() => assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: root,
    outputDirectory: output}), /unused/);
  assert.throws(() => assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: root,
    outputDirectory: path.join(root, 'source-area/run-next')}), /not covered/);
  assert.throws(() => assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: root,
    outputDirectory: path.join(root, '..', 'outside')}), /inside/);
  symlinkSync(path.join(root, 'generated'), path.join(root, 'linked-output'));
  assert.throws(() => assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: root,
    outputDirectory: path.join(root, 'linked-output/run-next')}), /real directory/);
});
