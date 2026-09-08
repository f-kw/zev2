import {createRequire} from 'node:module';
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const require = createRequire(fs.realpathSync('runner/node_modules/tsx/package.json'));
const {transformSync, version} = require('esbuild');
const previousRoot = 'evals/clip_composition/outputs/presentation/work-candidate-selection-20260908-v001';
const finalRoot = 'evals/clip_composition/outputs/presentation/work-candidate-selection-20260908-v002';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const options = {loader: 'ts', target: 'es2022', format: 'esm', legalComments: 'none'};
const emit = source => transformSync(source, options).code;
const files = [
  'runner/src/skills/candidate-selection-v001.ts',
  'evals/clip_composition/candidate_selection_validation_v001.mts',
  'evals/clip_composition/run_candidate_selection_e2e_v001.mts',
];
const implementationComparison = files.map(file => {
  const original = fs.readFileSync(`${previousRoot}/executed-source-snapshot-v001/${file}`, 'utf8');
  const current = fs.readFileSync(file, 'utf8');
  const executor = file.endsWith('/run_candidate_selection_e2e_v001.mts');
  const normalized = executor ? original
    .replaceAll('work-candidate-selection-20260908-v001', 'work-candidate-selection-20260908-v002')
    .replaceAll('candidate-selection-ymUsGrT6EaA-20260908-v001', 'candidate-selection-ymUsGrT6EaA-20260908-v002')
    : original;
  const before = emit(normalized), after = emit(current);
  assert.equal(sha(before), sha(after), file);
  return {path: file, originalFileSha256: sha(original), currentFileSha256: sha(current),
    emittedRuntimeSha256: sha(after), runtimeUnchanged: true,
    permittedMetadataChanges: executor ? ['demo output root', 'demo plan ID'] : []};
});
const baseline = fs.readFileSync(`${previousRoot}/integration-typecheck-existing-baseline-v001.log`, 'utf8');
const actual = fs.readFileSync(`${previousRoot}/integration-typecheck-v002.log`, 'utf8');
assert.equal(baseline, actual);
const previousRequest = JSON.parse(fs.readFileSync(`${previousRoot}/selection-request.json`, 'utf8'));
const currentRequest = JSON.parse(fs.readFileSync(`${finalRoot}/selection-request.json`, 'utf8'));
assert.deepEqual(previousRequest.input, currentRequest.input);
const result = {
  schemaVersion: 'candidate-selection-type-fix-reexecution-proof-v001', status: 'passed', previousRoot, finalRoot,
  reason: 'Resolve new strict control-flow/type inference diagnostics; preserve immutable earlier execution.',
  implementationComparison, comparisonCompiler: {name: 'esbuild', version, options},
  strictTypecheck: {existingDiagnosticCount: (baseline.match(/: error TS/g) || []).length,
    currentDiagnosticCount: (actual.match(/: error TS/g) || []).length, existingDiagnosticsExact: true,
    newFileDiagnostics: 0, wholeProjectTypecheckPass: false,
    missingJavaScriptDeclarationsAtNewCallSites: 'Four explicit @ts-expect-error annotations only for existing untyped JS imports; runtime validators unchanged.'},
  judgmentInputExact: true, semanticConditionsChanged: false, newSemanticSearchOrBestSelection: false,
  measurementNote: 'An exploratory TypeScript printer comparison differed in optional single-arrow-parameter parentheses. Compare canonical output of the installed esbuild instead. A subsequent inline command had a quote typo and did not execute; this saved script is the final measurement.',
};
fs.writeFileSync(`${finalRoot}/type-fix-reexecution-proof-v001.json`, JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify({status: result.status, runtimeComparisons: files.length, strictTypecheck: result.strictTypecheck}) + '\n');
