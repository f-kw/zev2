import { readFileSync, writeFileSync } from 'node:fs';

const [oraclePath, actualPath, outputPath] = process.argv.slice(2);

const parseTap = filePath => {
  const text = readFileSync(filePath, 'utf8');
  const cases = [];
  for (const line of text.split('\n')) {
    const match = /^(not ok|ok) (\d+) - (.*?)(?: # (?:SKIP|TODO).*)?$/u.exec(line);
    if (!match) continue;
    cases.push({
      status: match[1] === 'ok' ? 'passed' : 'failed',
      ordinal: Number.parseInt(match[2], 10),
      name: match[3],
    });
  }
  const readSummary = key => {
    const match = new RegExp(`^# ${key} (\\d+)$`, 'mu').exec(text);
    return match ? Number.parseInt(match[1], 10) : 0;
  };
  return {
    cases,
    summary: {
      tests: readSummary('tests'),
      pass: readSummary('pass'),
      fail: readSummary('fail'),
      cancelled: readSummary('cancelled'),
      skipped: readSummary('skipped'),
      todo: readSummary('todo'),
    },
  };
};

const oracle = parseTap(oraclePath);
const actual = parseTap(actualPath);
const differences = [];
const count = Math.max(oracle.cases.length, actual.cases.length);
for (let index = 0; index < count; index += 1) {
  const expected = oracle.cases[index] ?? null;
  const observed = actual.cases[index] ?? null;
  if (JSON.stringify(expected) !== JSON.stringify(observed)) {
    differences.push({ index, expected, observed });
  }
}

const exact = JSON.stringify(oracle.summary) === JSON.stringify(actual.summary)
  && differences.length === 0;
const report = {
  schemaVersion: 'zevo-caption-quality-v002-baseline-comparison-v002',
  oraclePath,
  actualPath,
  oracleSummary: oracle.summary,
  actualSummary: actual.summary,
  oracleCaseCount: oracle.cases.length,
  actualCaseCount: actual.cases.length,
  exactCaseSequenceMatch: differences.length === 0,
  differenceCount: differences.length,
  differences,
  exact,
};

writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify(report));
process.exitCode = exact ? 0 : 1;
