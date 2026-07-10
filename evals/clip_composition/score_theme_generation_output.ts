import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  fixtureIds: string[];
  generationSystem: string;
  outputId: string;
};

type ExpectedCut = {
  sourceStartMs: number;
  sourceEndMs: number;
  sourceVideoId?: string;
  usableForCompositionPromptEval?: boolean;
  label?: string;
};

type ExpectedFile = {
  expectedCuts: ExpectedCut[];
};

type ThemeCandidate = {
  themeId?: string;
  title?: string;
  summary?: string;
  whyItCanBeClipped?: string;
  sourceVideoId?: string;
  sourceStartMs?: number;
  sourceEndMs?: number;
  reason?: string;
  evidenceRanges?: Array<{
    sourceVideoId?: string;
    sourceStartMs?: number;
    sourceEndMs?: number;
    supportingSpeechIds?: Array<number | string>;
  }>;
  representativeQuote?: string;
  riskNotes?: string[];
  [key: string]: unknown;
};

type GeminiOutput = {
  runAt?: string;
  model?: string;
  params?: Record<string, unknown>;
  themes?: ThemeCandidate[];
  extractionStatus?: unknown;
  windowingResult?: {
    applied?: boolean;
    windowCount?: number;
    preMergeCandidateCount?: number;
    postMergeCandidateCount?: number;
    [key: string]: unknown;
  };
};

type Payload = {
  fixtureId: string;
  generationSystem: string;
  promptVersion: string;
  requestedThemeCount: number;
  modelInput: {
    windowing?: unknown;
    sources?: Array<{
      sourceVideoId: string;
      transcriptKind?: string;
      rawSegmentCount?: number;
      promptSegmentCount?: number;
      segments: Array<{
        speechId: number;
        sourceVideoId: string;
        sourceStartMs: number;
        sourceEndMs: number;
        text: string;
      }>;
    }>;
  };
};

type LabelledExpected = ExpectedCut & {
  expectedIndex: number;
  label: string;
};

type RangeHit = {
  expectedIndex: number;
  expectedLabel: string;
  candidateIndex: number;
  candidateRangeIndex: number;
  candidateThemeId?: string;
  candidateTitle: string;
  sourceVideoId: string;
  candidateStartMs: number;
  candidateEndMs: number;
  expectedStartMs: number;
  expectedEndMs: number;
  overlapMs: number;
};

type CandidateEvidenceRange = {
  sourceVideoId?: string;
  sourceStartMs: number;
  sourceEndMs: number;
  rangeIndex: number;
};

type RunScore = ReturnType<typeof scoreRun>;

const evalRoot = path.join(workspaceRoot(), 'evals', 'clip_composition');

function workspaceRoot(): string {
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

function parseOptions(argv: string[]): CliOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      continue;
    }
    const inlineValueIndex = item.indexOf('=');
    if (inlineValueIndex >= 0) {
      values.set(item.slice(2, inlineValueIndex), item.slice(inlineValueIndex + 1));
      continue;
    }
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      values.set(key, 'true');
      continue;
    }
    values.set(key, next);
    index += 1;
  }
  const fixtures = values.get('fixtures')?.trim();
  if (!fixtures) {
    throw new Error('--fixtures を指定してください');
  }
  const outputId = values.get('outputId')?.trim();
  if (!outputId) {
    throw new Error('--outputId を指定してください');
  }
  return {
    fixtureIds: fixtures.split(',').map((item) => sanitizePathPart(item.trim())).filter(Boolean),
    generationSystem: values.get('generationSystem')?.trim() || 'theme-llm-v001',
    outputId: sanitizePathPart(outputId)
  };
}

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function requireOutputModel(output: GeminiOutput, label: string): string {
  if (typeof output.model !== 'string' || !output.model.trim()) {
    throw new Error(`${label} に実モデル名 model がありません`);
  }
  return output.model.trim();
}

function generationSystemLabel(baseGenerationSystem: string, model: string): string {
  return `${baseGenerationSystem}@${model}`;
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function overlapMs(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

async function selectedThemeTitle(fixtureId: string): Promise<string> {
  const fixture = await readJson<Record<string, unknown>>(path.join(evalRoot, 'fixtures', fixtureId, 'fixture.json'));
  const selectedThemeId = fixture.selectedThemeId;
  const themes = await readJson<{ themes: Array<{ id: string; title: string }> }>(path.join(evalRoot, 'fixtures', fixtureId, 'themes.json'));
  const theme = themes.themes.find((item) => item.id === selectedThemeId);
  if (!theme) {
    throw new Error(`${fixtureId} selected theme が見つかりません`);
  }
  return theme.title;
}

async function labelledExpected(fixtureId: string, expected: ExpectedFile): Promise<LabelledExpected[]> {
  const cuts = expected.expectedCuts.filter((cut) => cut.usableForCompositionPromptEval !== false);
  if (fixtureId === 'XauLZgnWHtA_part01_partial_material_v001') {
    return cuts.map((cut, index) => ({
      ...cut,
      expectedIndex: index + 1,
      label: cut.label ?? `block ${index + 1}`
    }));
  }
  const label = await selectedThemeTitle(fixtureId);
  return cuts.map((cut, index) => ({
    ...cut,
    expectedIndex: index + 1,
    label
  }));
}

function candidateSourceVideoId(candidate: ThemeCandidate, payload: Payload): string | undefined {
  if (typeof candidate.sourceVideoId === 'string' && candidate.sourceVideoId.trim()) {
    return candidate.sourceVideoId.trim();
  }
  const sources = payload.modelInput.sources ?? [];
  return sources.length === 1 ? sources[0].sourceVideoId : undefined;
}

function candidateEvidenceRanges(candidate: ThemeCandidate, payload: Payload): CandidateEvidenceRange[] {
  if (Array.isArray(candidate.evidenceRanges) && candidate.evidenceRanges.length > 0) {
    return candidate.evidenceRanges
      .map((range, index) => ({
        sourceVideoId: typeof range.sourceVideoId === 'string' && range.sourceVideoId.trim()
          ? range.sourceVideoId.trim()
          : candidateSourceVideoId(candidate, payload),
        sourceStartMs: range.sourceStartMs,
        sourceEndMs: range.sourceEndMs,
        rangeIndex: index + 1
      }))
      .filter((range): range is CandidateEvidenceRange => (
        typeof range.sourceStartMs === 'number'
        && typeof range.sourceEndMs === 'number'
        && range.sourceEndMs > range.sourceStartMs
      ));
  }
  if (typeof candidate.sourceStartMs === 'number'
    && typeof candidate.sourceEndMs === 'number'
    && candidate.sourceEndMs > candidate.sourceStartMs) {
    return [{
      sourceVideoId: candidateSourceVideoId(candidate, payload),
      sourceStartMs: candidate.sourceStartMs,
      sourceEndMs: candidate.sourceEndMs,
      rangeIndex: 1
    }];
  }
  return [];
}

function scoreRun(payload: Payload, expectedCuts: LabelledExpected[], output: GeminiOutput, run: number) {
  const themes = output.themes ?? [];
  const hits: RangeHit[] = [];
  const noHitCandidateIndexes = new Set<number>();
  for (const [candidateOffset, candidate] of themes.entries()) {
    const candidateIndex = candidateOffset + 1;
    const ranges = candidateEvidenceRanges(candidate, payload);
    if (ranges.length === 0) {
      noHitCandidateIndexes.add(candidateIndex);
      continue;
    }
    let hit = false;
    for (const range of ranges) {
      for (const expected of expectedCuts) {
        if (!range.sourceVideoId || expected.sourceVideoId !== range.sourceVideoId) {
          continue;
        }
        const overlap = overlapMs(range.sourceStartMs, range.sourceEndMs, expected.sourceStartMs, expected.sourceEndMs);
        if (overlap <= 0) {
          continue;
        }
        hit = true;
        hits.push({
          expectedIndex: expected.expectedIndex,
          expectedLabel: expected.label,
          candidateIndex,
          candidateRangeIndex: range.rangeIndex,
          candidateThemeId: typeof candidate.themeId === 'string' ? candidate.themeId : undefined,
          candidateTitle: typeof candidate.title === 'string' ? candidate.title : '(titleなし)',
          sourceVideoId: range.sourceVideoId,
          candidateStartMs: range.sourceStartMs,
          candidateEndMs: range.sourceEndMs,
          expectedStartMs: expected.sourceStartMs,
          expectedEndMs: expected.sourceEndMs,
          overlapMs: overlap
        });
      }
    }
    if (!hit) {
      noHitCandidateIndexes.add(candidateIndex);
    }
  }
  const hitExpectedIndexes = new Set(hits.map((hit) => hit.expectedIndex));
  return {
    run,
    themeCount: themes.length,
    expectedCount: expectedCuts.length,
    hitExpectedCount: hitExpectedIndexes.size,
    rangeHitRate: expectedCuts.length === 0 ? 0 : hitExpectedIndexes.size / expectedCuts.length,
    hits,
    noHitCandidateCount: noHitCandidateIndexes.size,
    noHitCandidateIndexes: [...noHitCandidateIndexes],
    model: output.model,
    params: output.params,
    extractionStatus: output.extractionStatus,
    windowingResult: output.windowingResult
  };
}

function normalizedTitle(candidate: ThemeCandidate): string {
  return String(candidate.title ?? '').replace(/\s+/g, ' ').trim();
}

function titleVolatility(outputs: GeminiOutput[]) {
  const titleSets = outputs.map((output) =>
    new Set((output.themes ?? []).map(normalizedTitle).filter(Boolean))
  );
  const uniqueTitles = new Set<string>();
  for (const titleSet of titleSets) {
    for (const title of titleSet) {
      uniqueTitles.add(title);
    }
  }
  const pairs = [];
  for (let left = 0; left < titleSets.length; left += 1) {
    for (let right = left + 1; right < titleSets.length; right += 1) {
      const intersection = [...titleSets[left]].filter((title) => titleSets[right].has(title)).length;
      const union = new Set([...titleSets[left], ...titleSets[right]]).size;
      pairs.push({
        leftRun: left + 1,
        rightRun: right + 1,
        exactTitleOverlap: intersection,
        exactTitleJaccard: union === 0 ? 0 : intersection / union
      });
    }
  }
  return {
    uniqueTitleCount: uniqueTitles.size,
    runTitleCounts: titleSets.map((set, index) => ({ run: index + 1, titleCount: set.size })),
    pairs
  };
}

function transcriptExcerpt(payload: Payload, sourceVideoId: string, startMs: number, endMs: number): string {
  const source = (payload.modelInput.sources ?? []).find((item) => item.sourceVideoId === sourceVideoId);
  const segments = source?.segments ?? [];
  const selected = segments.filter((segment) => overlapMs(segment.sourceStartMs, segment.sourceEndMs, startMs, endMs) > 0);
  const text = selected.map((segment) => `[${msText(segment.sourceStartMs)}-${msText(segment.sourceEndMs)}] ${segment.text}`).join('\n');
  return text.length > 1200 ? `${text.slice(0, 1200)}\n...` : text;
}

function msText(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function textOrMissing(value: unknown): string {
  const text = String(value ?? '').trim();
  return text || '(未取得)';
}

function hitReviewRows(input: {
  fixtureId: string;
  runs: RunScore[];
  outputs: GeminiOutput[];
  payload: Payload;
}) {
  const rows = [];
  for (const runScore of input.runs) {
    const output = input.outputs[runScore.run - 1];
    for (const hit of runScore.hits) {
      const candidate = output.themes?.[hit.candidateIndex - 1] ?? {};
      rows.push({
        fixtureId: input.fixtureId,
        run: runScore.run,
        hit,
        candidate,
        excerpt: transcriptExcerpt(
          input.payload,
          hit.sourceVideoId,
          Math.min(hit.candidateStartMs, hit.expectedStartMs),
          Math.max(hit.candidateEndMs, hit.expectedEndMs)
        )
      });
    }
  }
  return rows;
}

function humanReviewHtml(input: {
  title: string;
  subtitle: string;
  rows: ReturnType<typeof hitReviewRows>;
  mode?: 'human' | 'evidence';
}) {
  const mode = input.mode ?? 'evidence';
  const isEvidenceMode = mode === 'evidence';
  const cards = input.rows.length === 0
    ? '<p class="empty">範囲hitした候補はありません。</p>'
    : input.rows.map((row, index) => {
      const caseId = `${row.fixtureId} / run ${row.run} / candidate ${row.hit.candidateIndex}`;
      return `
      <section class="case-card" id="case-${index + 1}">
        <div class="case-head">
          <div>
            <p class="eyebrow">確認 ${index + 1}</p>
            <h2>${escapeHtml(caseId)}</h2>
          </div>
          <div class="badge">未判定</div>
        </div>
        <div class="grid">
          <section>
            <h3>正解ラベル</h3>
            <p>${escapeHtml(row.hit.expectedLabel)}</p>
            <dl>
              <dt>正解範囲</dt>
              <dd>${escapeHtml(`${row.hit.sourceVideoId} ${row.hit.expectedStartMs}-${row.hit.expectedEndMs}`)}</dd>
              <dt>候補との重なり</dt>
              <dd>${escapeHtml(`${row.hit.overlapMs}ms`)}</dd>
            </dl>
          </section>
          <section>
            <h3>Gemini候補</h3>
            <dl>
              <dt>title</dt>
              <dd>${escapeHtml(textOrMissing(row.candidate.title))}</dd>
              <dt>summary</dt>
              <dd>${escapeHtml(textOrMissing(row.candidate.summary))}</dd>
              <dt>reason</dt>
              <dd>${escapeHtml(textOrMissing(row.candidate.reason))}</dd>
              <dt>representativeQuote</dt>
              <dd>${escapeHtml(textOrMissing(row.candidate.representativeQuote))}</dd>
              <dt>候補範囲</dt>
              <dd>${escapeHtml(`${row.hit.sourceVideoId} range ${row.hit.candidateRangeIndex}: ${row.hit.candidateStartMs}-${row.hit.candidateEndMs}`)}</dd>
            </dl>
          </section>
        </div>
        <section>
          <h3>該当transcript抜粋</h3>
          <pre>${escapeHtml(row.excerpt)}</pre>
        </section>
        <section class="answer">
          <h3>${isEvidenceMode ? 'この画面の扱い' : '答えてほしいこと'}</h3>
          <p>${isEvidenceMode ? 'これは人間への回答依頼ではありません。既存の区間比較で、Gemini候補の時間範囲が人間の正解区間に重なったかを記録する画面です。' : 'このGemini候補は、正解ラベルと<strong>同じ見どころ</strong>を指しているか。'}</p>
          <ul>
            <li><strong>同じ見どころ</strong>: 候補の主題が正解ラベルと同じ。範囲が多少広い/狭いだけならこちら。</li>
            <li><strong>違う見どころ</strong>: 時刻は重なっているが、候補の主題が別の話題・別の面白さを指している。</li>
            <li><strong>判定不能</strong>: 回答が途中切れ、本文が壊れている、ラベルが広すぎるなどで決められない。</li>
          </ul>
          <p class="template">${escapeHtml(caseId)}: ${isEvidenceMode ? '機械採点の範囲hit記録。人間回答不要。' : '同じ見どころ / 違う見どころ / 判定不能 - 理由1行'}</p>
        </section>
      </section>`;
    }).join('\n');

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(input.title)}</title>
  <style>
    :root { color-scheme: light; --bg: #f6f7f9; --text: #20242a; --muted: #647080; --line: #d9dee7; --panel: #fff; --accent: #155d9c; }
    body { margin: 0; background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.65; }
    main { max-width: 1120px; margin: 0 auto; padding: 32px 20px 56px; }
    header, .rule, .case-card { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 22px; margin-bottom: 18px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    h2 { margin: 0; font-size: 20px; }
    h3 { margin: 0 0 10px; font-size: 15px; color: #1e4f7a; }
    p { margin: 0 0 10px; }
    ul, ol { margin: 8px 0 0 22px; padding: 0; }
    li { margin: 6px 0; }
    .muted, .eyebrow { color: var(--muted); }
    .eyebrow { margin: 0 0 4px; font-size: 12px; font-weight: 700; letter-spacing: .02em; text-transform: uppercase; }
    .case-head { display: flex; gap: 16px; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--line); padding-bottom: 14px; margin-bottom: 16px; }
    .badge { border: 1px solid var(--line); border-radius: 999px; padding: 3px 10px; color: var(--muted); white-space: nowrap; font-size: 13px; }
    .grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 16px; margin-bottom: 16px; }
    .grid section, .answer { border: 1px solid var(--line); border-radius: 8px; padding: 14px; background: #fbfcfe; }
    .callout { border-left: 4px solid var(--accent); background: #eef6fc; padding: 12px 14px; margin: 14px 0 0; }
    dl { margin: 0; }
    dt { color: var(--muted); font-size: 12px; margin-top: 10px; }
    dd { margin: 2px 0 0; }
    pre { white-space: pre-wrap; word-break: break-word; background: #101820; color: #eef5ff; border-radius: 8px; padding: 14px; overflow: auto; max-height: 420px; }
    .template { border-left: 4px solid var(--accent); background: #eef6fc; padding: 10px 12px; margin-top: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .empty { font-size: 16px; }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } main { padding: 18px 12px 40px; } }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>${escapeHtml(input.title)}</h1>
      <p class="muted">${escapeHtml(input.subtitle)}</p>
      ${isEvidenceMode ? '<p class="callout"><strong>今回の目的:</strong> Geminiが元配信の文字起こしだけを見て、人間が切り抜きにした正解区間の近くを候補として拾えるかを測ることです。このページは、既存の区間比較と同じ考え方で、候補範囲と正解区間の重なりを記録したものです。</p>' : ''}
      ${isEvidenceMode ? '<p class="callout">このページで人間確認をしないでください。区間一致は機械採点で扱います。人間に頼むのは、文字だけでは決められない正解ラベルの妥当性や編集意図の確認だけです。</p>' : ''}
    </header>
    <section class="rule">
      <h2>最初に読むこと</h2>
      ${isEvidenceMode ? `
      <ol>
        <li>この画面は、人間に採点してもらうための画面ではありません。</li>
        <li>見ているのは「Geminiが出した候補の時間範囲が、人間の正解区間にどれだけ近かったか」です。</li>
        <li>これは以前から使っている区間比較と同じ種類の機械採点です。候補が正解区間に重なった場合は範囲hit、重ならなかった場合はその正解区間をGeminiが拾えなかった扱いにします。</li>
        <li>ここでまだ見ていないのは、切り抜きとして面白いか、候補タイトルが良いか、映像編集として自然か、という点です。</li>
        <li>人間に頼む必要があるのは、映像・音声・編集意図・正解ラベルの妥当性など、文字だけでは決められない確認だけです。</li>
      </ol>` : `
      <ol>
        <li>これはテーマ生成評価の二段目確認です。区間選択の正しさ、境界精度、候補全体の良し悪しは見ません。</li>
        <li>一段目の機械判定で、Gemini候補の根拠範囲が正解区間と少しでも重なった候補だけを載せています。</li>
        <li>あなたに判断してほしいのは、範囲が重なった候補が正解ラベルと同じ見どころを指しているかだけです。</li>
        <li>回答は各カードの末尾にある形式で、「同じ見どころ / 違う見どころ / 判定不能」から1つ選び、理由を1行で添えてください。</li>
      </ol>`}
    </section>
    ${cards}
  </main>
</body>
</html>
`.replace(/[ \t]+$/gm, '');
}

function sheetMarkdown(input: {
  fixtureId: string;
  runs: Array<ReturnType<typeof scoreRun>>;
  outputs: GeminiOutput[];
  payload: Payload;
}) {
  const lines = [
    `# theme_generation range hit evidence: ${input.fixtureId}`,
    '',
    '範囲hitした候補だけを載せる。これは人間判定用ではなく、既存の区間比較で得た範囲hitの証拠一覧。',
    '',
    '| run | expected | candidate | range | title | summary | reason | quote | transcript excerpt |',
    '| ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |'
  ];
  for (const runScore of input.runs) {
    const output = input.outputs[runScore.run - 1];
    for (const hit of runScore.hits) {
      const candidate = output.themes?.[hit.candidateIndex - 1] ?? {};
      const excerpt = transcriptExcerpt(input.payload, hit.sourceVideoId, Math.min(hit.candidateStartMs, hit.expectedStartMs), Math.max(hit.candidateEndMs, hit.expectedEndMs))
        .replace(/\n/g, '<br>');
      lines.push(`| ${runScore.run} | ${hit.expectedLabel} | ${hit.candidateIndex} | ${hit.candidateRangeIndex} | ${String(candidate.title ?? '').replace(/\|/g, '/')} | ${String(candidate.summary ?? '').replace(/\|/g, '/')} | ${String(candidate.reason ?? '').replace(/\|/g, '/')} | ${String(candidate.representativeQuote ?? '').replace(/\|/g, '/')} | ${excerpt.replace(/\|/g, '/')} |`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

function reportMarkdown(input: {
  outputId: string;
  generationSystem: string;
  fixtureReports: Array<{
    fixtureId: string;
    runScores: RunScore[];
    payload: Payload;
    outputs: GeminiOutput[];
  }>;
}) {
  const lines = [
    '# theme-llm-v001 一段目範囲hit採点',
    '',
    `- outputId: ${input.outputId}`,
    `- generationSystem: ${input.generationSystem}`,
    '- このレポートは区間比較による機械採点。人間確認は含めない。',
    '',
    '## Fixture別',
    '',
    '| fixture | run | expected hit | expected total | range hit rate | candidates | no-hit candidates |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |'
  ];
  for (const report of input.fixtureReports) {
    for (const score of report.runScores) {
      lines.push(`| ${report.fixtureId} | ${score.run} | ${score.hitExpectedCount} | ${score.expectedCount} | ${score.rangeHitRate.toFixed(3)} | ${score.themeCount} | ${score.noHitCandidateCount} |`);
    }
  }
  lines.push('', '## top8 / top全体比較', '');
  lines.push('窓分割fixtureでは、窓ごとに候補を出して統合するため、最終候補数が8を超える。ここでは全候補を記録しつつ、上位8件だけを見た場合の数字も併記する。Nの正式な扱いは次版設計で決める。');
  lines.push('');
  lines.push('| fixture | run | top8 expected hit | all expected hit | expected total | top8 candidates | all candidates |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const report of input.fixtureReports) {
    for (const score of report.runScores) {
      const top8ExpectedIndexes = new Set(score.hits
        .filter((hit) => hit.candidateIndex <= 8)
        .map((hit) => hit.expectedIndex));
      lines.push(`| ${report.fixtureId} | ${score.run} | ${top8ExpectedIndexes.size} | ${score.hitExpectedCount} | ${score.expectedCount} | ${Math.min(8, score.themeCount)} | ${score.themeCount} |`);
    }
  }
  lines.push('', '## 範囲hit候補', '');
  lines.push('| fixture | run | expected | candidate | range | title | sourceVideoId | candidate range | expected range | overlapMs |');
  lines.push('| --- | ---: | --- | ---: | ---: | --- | --- | --- | --- | ---: |');
  for (const report of input.fixtureReports) {
    for (const score of report.runScores) {
      for (const hit of score.hits) {
        lines.push(`| ${report.fixtureId} | ${score.run} | ${hit.expectedIndex}: ${hit.expectedLabel.replace(/\|/g, '/')} | ${hit.candidateIndex} | ${hit.candidateRangeIndex} | ${hit.candidateTitle.replace(/\|/g, '/')} | ${hit.sourceVideoId} | ${hit.candidateStartMs}-${hit.candidateEndMs} | ${hit.expectedStartMs}-${hit.expectedEndMs} | ${hit.overlapMs} |`);
      }
    }
  }
  lines.push('', '## 機械で分けられる品質分類', '');
  lines.push('ここで確定できる分類は「期待範囲に重なった候補」と「期待範囲に重ならない候補」だけ。過広範囲、別話題、根拠なしは、候補の中心がどこにあるかを別の根拠検査で見る。重複音声を見るだけの人間確認は行わない。');
  lines.push('');
  lines.push('| fixture | run | range-hit candidates | range-miss/unclassified candidates |');
  lines.push('| --- | ---: | ---: | ---: |');
  for (const report of input.fixtureReports) {
    for (const score of report.runScores) {
      const hitCandidateCount = new Set(score.hits.map((hit) => hit.candidateIndex)).size;
      lines.push(`| ${report.fixtureId} | ${score.run} | ${hitCandidateCount} | ${score.noHitCandidateCount} |`);
    }
  }
  lines.push('', '## runs 3の顔ぶれ揺れ', '');
  lines.push('完全一致するtitle文字列だけで機械集計している。意味的に同じタイトルの言い換えは人間判定前なので統合しない。');
  lines.push('');
  lines.push('| fixture | unique titles | pair | exact title overlap | exact title jaccard |');
  lines.push('| --- | ---: | --- | ---: | ---: |');
  for (const report of input.fixtureReports) {
    const volatility = titleVolatility(report.outputs);
    for (const pair of volatility.pairs) {
      lines.push(`| ${report.fixtureId} | ${volatility.uniqueTitleCount} | run${pair.leftRun}-run${pair.rightRun} | ${pair.exactTitleOverlap} | ${pair.exactTitleJaccard.toFixed(3)} |`);
    }
  }
  lines.push('', '## 期待区間2', '');
  const rReport = input.fixtureReports.find((item) => item.fixtureId === 'r_ztjHaHmcg_partial_material_v001');
  if (rReport) {
    for (const score of rReport.runScores) {
      const hit = score.hits.some((item) => item.expectedIndex === 2);
      lines.push(`- run ${score.run}: ${hit ? '範囲hitあり' : '範囲hitなし'}`);
    }
  } else {
    lines.push('- r_ztjHaHmcg fixtureなし');
  }
  lines.push('', '## 窓分割', '');
  for (const report of input.fixtureReports) {
    const windowing = JSON.stringify(report.payload.modelInput.windowing ?? {});
    lines.push(`- ${report.fixtureId}: ${windowing}`);
  }
  lines.push('', '## 窓分割run結果', '');
  lines.push('| fixture | run | windows | pre-merge candidates | post-merge candidates |');
  lines.push('| --- | ---: | ---: | ---: | ---: |');
  for (const report of input.fixtureReports) {
    for (const score of report.runScores) {
      const result = score.windowingResult;
      if (!result?.applied) {
        lines.push(`| ${report.fixtureId} | ${score.run} | 0 | ${score.themeCount} | ${score.themeCount} |`);
        continue;
      }
      lines.push(`| ${report.fixtureId} | ${score.run} | ${result.windowCount ?? 0} | ${result.preMergeCandidateCount ?? score.themeCount} | ${result.postMergeCandidateCount ?? score.themeCount} |`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

async function scoreFixture(options: CliOptions, fixtureId: string) {
  const root = path.join(evalRoot, 'outputs', 'theme-generation', fixtureId, options.generationSystem, options.outputId);
  const payload = await readJson<Payload>(path.join(root, 'prompt-input.json'));
  const expected = await readJson<ExpectedFile>(path.join(evalRoot, 'expected', `${fixtureId}.json`));
  const expectedCuts = await labelledExpected(fixtureId, expected);
  const outputs: GeminiOutput[] = [];
  const runScores = [];
  for (let run = 1; ; run += 1) {
    const outputPath = path.join(root, `run-${String(run).padStart(2, '0')}-gemini-output.json`);
    if (!existsSync(outputPath)) {
      break;
    }
    const output = await readJson<GeminiOutput>(outputPath);
    requireOutputModel(output, `${fixtureId} run ${run}`);
    outputs.push(output);
    runScores.push(scoreRun(payload, expectedCuts, output, run));
  }
  if (runScores.length === 0) {
    throw new Error(`${fixtureId} のGemini出力がありません: ${root}`);
  }
  const reportDir = path.join(evalRoot, 'reports', 'theme-generation', fixtureId, options.generationSystem, options.outputId);
  await mkdir(reportDir, { recursive: true });
  await writeFile(path.join(reportDir, 'range-hit-evidence.md'), sheetMarkdown({
    fixtureId,
    runs: runScores,
    outputs,
    payload
  }), 'utf8');
  await writeFile(path.join(reportDir, 'range-hit-evidence.html'), humanReviewHtml({
    title: `theme_generation 範囲hit証拠: ${fixtureId}`,
    subtitle: '既存の区間比較と同じ考え方で、Gemini候補範囲と正解区間の重なりを記録します。',
    rows: hitReviewRows({ fixtureId, runs: runScores, outputs, payload }),
    mode: 'evidence'
  }), 'utf8');
  return { fixtureId, runScores, payload, outputs };
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const fixtureReports = [];
  for (const fixtureId of options.fixtureIds) {
    fixtureReports.push(await scoreFixture(options, fixtureId));
  }
  const models = new Set(fixtureReports.flatMap((report) => (
    report.outputs.map((output, index) => requireOutputModel(output, `${report.fixtureId} run ${index + 1}`))
  )));
  if (models.size !== 1) {
    throw new Error(`異なるモデルの出力を同じ採点結果へ混在できません: ${[...models].join(', ')}`);
  }
  const model = [...models][0];
  if (!model) {
    throw new Error('採点対象の実モデル名を確定できません');
  }
  const labelledGenerationSystem = generationSystemLabel(options.generationSystem, model);
  const outputPath = path.join(evalRoot, 'outputs', 'theme-generation', `${options.generationSystem}-${options.outputId}-range-score.json`);
  const reportPath = path.join(evalRoot, 'reports', 'theme-generation', `${options.generationSystem}-${options.outputId}-range-score.md`);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify({
    runAt: new Date().toISOString(),
    generationSystem: labelledGenerationSystem,
    generationSystemBase: options.generationSystem,
    model,
    outputId: options.outputId,
    fixtureReports: fixtureReports.map((report) => ({
      fixtureId: report.fixtureId,
      runScores: report.runScores,
      titleVolatility: titleVolatility(report.outputs)
    }))
  }, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, reportMarkdown({ outputId: options.outputId, generationSystem: labelledGenerationSystem, fixtureReports }), 'utf8');
  await writeFile(path.join(evalRoot, 'reports', 'theme-generation', `${options.generationSystem}-${options.outputId}-range-hit-evidence.html`), humanReviewHtml({
    title: `${labelledGenerationSystem} ${options.outputId} 範囲hit証拠一覧`,
    subtitle: '既存の区間比較と同じ考え方で、Gemini候補範囲と正解区間の重なりを記録します。人間への回答依頼ではありません。',
    rows: fixtureReports.flatMap((report) => hitReviewRows({
      fixtureId: report.fixtureId,
      runs: report.runScores,
      outputs: report.outputs,
      payload: report.payload
    })),
    mode: 'evidence'
  }), 'utf8');
  console.log(`range score: ${outputPath}`);
  console.log(`range report: ${reportPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
