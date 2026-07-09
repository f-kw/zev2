#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const generationSystem = 'theme-llm-v001';
const outputId = '20260709-v001';
const fixtureIds = [
  'UpRyakf5j80_clip_audio_v001',
  'r_ztjHaHmcg_partial_material_v001',
  'aX-axQMWR3c_single_material_v001',
  'XauLZgnWHtA_part01_partial_material_v001'
];

const youtubeCoverage = [
  {
    fixtureId: 'UpRyakf5j80_clip_audio_v001',
    sourceVideoId: 'kNX-wQTvsws',
    query: '宝鐘マリン 地獄銭湯 切り抜き',
    examples: [
      'Yq2A16ryla8: お局マリン＆新人博衣さんの地獄銭湯Reをイッキ見',
      'beHZQ-KjG5U: 地獄銭湯 ホロメン達のウザ客対応切り抜き',
      '5Ll6pJSGHSM: 地獄銭湯シリーズ最恐びっくりシーン反応比較'
    ],
    assessment: '同じゲーム配信系の切り抜きが多数見つかる。正解1区間だけを分母にするとテーマ生成の網羅評価としては疎。'
  },
  {
    fixtureId: 'r_ztjHaHmcg_partial_material_v001',
    sourceVideoId: '-DwSCDMCWDQ',
    query: '渋谷ハル 引っ越し 同接100人 食べていける 切り抜き',
    examples: [
      'r_ztjHaHmcg: 同接100人いたら食べていけるの？',
      'YsfXnFfsDzc: VTuberになりたい就活生に正論パンチ',
      '5q4-vzVkhaQ: ブラック企業時代を振り返る渋谷ハル',
      'UYR8VnW8IfY: 伸びる配信者の共通点'
    ],
    assessment: '同じ元配信・同じ雑談文脈から複数の切り抜き候補が実在しそう。未ラベル金脈の可能性が高い。'
  },
  {
    fixtureId: 'aX-axQMWR3c_single_material_v001',
    sourceVideoId: 'SGQqVJXsNNE',
    query: '重大発表 merise 渋谷ハル 切り抜き / merise 白雪レイド 渋谷ハル 切り抜き',
    examples: [
      'aX-axQMWR3c: 急に上司が4人増えて困惑する白雪レイド',
      '1OQvcvcv9qQ: ネオポルテ二期生デビューします',
      'TuVZlYx2YYM: meriseからの新人デビューを楽しみにしている渋谷ハル',
      'R3r6CjmvhJE: 企業所属を事後報告される白雪レイド',
      'eWhy2pFNmv4: merise立ち上げ理由'
    ],
    assessment: '同じ発表配信から複数の切り抜きが実在。正解1区間ではテーマ生成の評価分母として狭い。'
  },
  {
    fixtureId: 'XauLZgnWHtA_part01_partial_material_v001',
    sourceVideoId: 'multi-source',
    query: 'にじさんじ 逆凸遊戯王 / スタッフと相談 / 変態女装おじさん / 拍手の音 / 資格 切り抜き',
    examples: [
      'KuC-kxTCeEc: 星導ショウの闇のデュエル凸待ち',
      'Eit0l56dejg: エニーカラースタッフの相談',
      'jHkUkmIki2E: 変態女装おじさん手描きまとめ',
      'Zzf6uC6RqhM: 拍手音声を突然作り出す雑談配信',
      'XauLZgnWHtA: 10分でわかる先週のにじさんじ爆笑シーンまとめ'
    ],
    assessment: '総集編の各素材は、それぞれ別の切り抜き文化圏・別テーマに接続している。1つの総集編fixtureをテーマ生成のN=8評価へ同列投入するには設計上の注意が必要。'
  }
];

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

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function markdownCell(value) {
  return String(value ?? '').replace(/\|/g, '/').replace(/\n/g, '<br>');
}

function msText(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) {
    return '(時刻なし)';
  }
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
}

function overlapMs(aStart, aEnd, bStart, bEnd) {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

function candidateSourceVideoId(candidate, payload) {
  if (typeof candidate.sourceVideoId === 'string' && candidate.sourceVideoId.trim()) {
    return candidate.sourceVideoId.trim();
  }
  const sources = payload.modelInput?.sources ?? [];
  return sources.length === 1 ? sources[0].sourceVideoId : undefined;
}

function transcriptExcerpt(payload, sourceVideoId, startMs, endMs, maxChars = 900) {
  const source = (payload.modelInput?.sources ?? []).find((item) => item.sourceVideoId === sourceVideoId);
  const segments = source?.segments ?? [];
  const selected = segments.filter((segment) => overlapMs(segment.sourceStartMs, segment.sourceEndMs, startMs, endMs) > 0);
  if (selected.length === 0) {
    return '該当範囲に重なるtranscript入力なし';
  }
  const text = selected
    .map((segment) => `[${msText(segment.sourceStartMs)}-${msText(segment.sourceEndMs)}] ${segment.text}`)
    .join('\n');
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n...` : text;
}

function expectedExcerpt(payload, expected) {
  return transcriptExcerpt(payload, expected.sourceVideoId, expected.sourceStartMs, expected.sourceEndMs, 600);
}

function distanceToRange(candidate, expected) {
  if (candidate.sourceVideoId !== expected.sourceVideoId) {
    return Number.POSITIVE_INFINITY;
  }
  if (overlapMs(candidate.sourceStartMs, candidate.sourceEndMs, expected.sourceStartMs, expected.sourceEndMs) > 0) {
    return 0;
  }
  if (candidate.sourceEndMs <= expected.sourceStartMs) {
    return expected.sourceStartMs - candidate.sourceEndMs;
  }
  return candidate.sourceStartMs - expected.sourceEndMs;
}

async function loadFixture(fixtureId) {
  const runRoot = path.join(evalRoot, 'outputs', 'theme-generation', fixtureId, generationSystem, outputId);
  const payload = await readJson(path.join(runRoot, 'prompt-input.json'));
  const expected = await readJson(path.join(evalRoot, 'expected', `${fixtureId}.json`));
  const score = await readJson(path.join(evalRoot, 'outputs', 'theme-generation', `${generationSystem}-${outputId}-range-score.json`));
  const fixtureScore = score.fixtureReports.find((item) => item.fixtureId === fixtureId);
  const outputs = [];
  for (let run = 1; run <= 3; run += 1) {
    outputs.push(await readJson(path.join(runRoot, `run-${String(run).padStart(2, '0')}-gemini-output.json`)));
  }
  return { fixtureId, payload, expected, fixtureScore, outputs };
}

function expectedLabel(fixtureId, expected, index) {
  if (fixtureId === 'XauLZgnWHtA_part01_partial_material_v001') {
    return expected.label ?? `block ${index + 1}`;
  }
  return expected.label ?? expected.reason ?? `expected ${index + 1}`;
}

function collectCandidateRows(fixtures) {
  const rows = [];
  for (const fixture of fixtures) {
    for (const runScore of fixture.fixtureScore.runScores) {
      const output = fixture.outputs[runScore.run - 1];
      const hitIndexes = new Set(runScore.hits.map((hit) => hit.candidateIndex));
      for (const [offset, candidate] of (output.themes ?? []).entries()) {
        const candidateIndex = offset + 1;
        const sourceVideoId = candidateSourceVideoId(candidate, fixture.payload);
        const validRange = typeof candidate.sourceStartMs === 'number'
          && typeof candidate.sourceEndMs === 'number'
          && candidate.sourceEndMs > candidate.sourceStartMs
          && sourceVideoId;
        const rangeText = validRange
          ? `${sourceVideoId} ${msText(candidate.sourceStartMs)}-${msText(candidate.sourceEndMs)}`
          : '(根拠範囲なし)';
        rows.push({
          fixtureId: fixture.fixtureId,
          run: runScore.run,
          candidateIndex,
          top8Scope: candidateIndex <= 8,
          hit: hitIndexes.has(candidateIndex),
          themeId: candidate.themeId ?? '',
          title: candidate.title ?? '',
          summary: candidate.summary ?? '',
          representativeQuote: candidate.representativeQuote ?? '',
          sourceVideoId,
          sourceStartMs: candidate.sourceStartMs,
          sourceEndMs: candidate.sourceEndMs,
          rangeText,
          excerpt: validRange
            ? transcriptExcerpt(fixture.payload, sourceVideoId, candidate.sourceStartMs, candidate.sourceEndMs)
            : '根拠発話範囲がないため、transcript抜粋なし'
        });
      }
    }
  }
  return rows;
}

function uniqueMissRows(rows) {
  const seen = new Set();
  const result = [];
  for (const row of rows) {
    if (row.hit || !row.top8Scope) {
      continue;
    }
    const key = [
      row.fixtureId,
      normalizeText(row.title),
      normalizeText(row.summary),
      normalizeText(row.representativeQuote),
      row.sourceVideoId ?? '',
      row.sourceStartMs ?? '',
      row.sourceEndMs ?? ''
    ].join('|');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(row);
  }
  return result;
}

function titleOnlyTop8MissCount(rows) {
  const seen = new Set();
  for (const row of rows) {
    if (row.hit || !row.top8Scope) {
      continue;
    }
    seen.add([
      row.fixtureId,
      normalizeText(row.title)
    ].join('|'));
  }
  return seen.size;
}

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function analyzeExpectedMisses(fixtures, candidateRows) {
  const rows = [];
  for (const fixture of fixtures) {
    const usableExpected = fixture.expected.expectedCuts
      .filter((item) => item.usableForCompositionPromptEval !== false);
    for (const [index, expected] of usableExpected.entries()) {
      const hitRuns = fixture.fixtureScore.runScores
        .filter((runScore) => runScore.hits.some((hit) => hit.expectedIndex === index + 1))
        .map((runScore) => runScore.run);
      const sameSourceCandidates = candidateRows
        .filter((row) => row.fixtureId === fixture.fixtureId && row.sourceVideoId === expected.sourceVideoId)
        .map((row) => ({
          ...row,
          distanceMs: distanceToRange(row, expected)
        }))
        .filter((row) => Number.isFinite(row.distanceMs))
        .sort((left, right) => left.distanceMs - right.distanceMs)
        .slice(0, 3);
      rows.push({
        fixtureId: fixture.fixtureId,
        expectedIndex: index + 1,
        label: expectedLabel(fixture.fixtureId, expected, index),
        sourceVideoId: expected.sourceVideoId,
        expectedStartMs: expected.sourceStartMs,
        expectedEndMs: expected.sourceEndMs,
        hitRuns,
        excerpt: expectedExcerpt(fixture.payload, expected),
        nearestCandidates: sameSourceCandidates
      });
    }
  }
  return rows;
}

function candidateAuditHtml(rows, counts) {
  const cards = rows.map((row, index) => `
    <section class="case-card">
      <div class="case-head">
        <div>
          <p class="eyebrow">候補 ${index + 1}</p>
          <h2>${escapeHtml(row.fixtureId)} / run ${row.run} / candidate ${row.candidateIndex}</h2>
        </div>
        <span class="badge">range miss</span>
      </div>
      <div class="grid">
        <section>
          <h3>候補</h3>
          <dl>
            <dt>title</dt>
            <dd>${escapeHtml(row.title || '(未取得)')}</dd>
            <dt>summary</dt>
            <dd>${escapeHtml(row.summary || '(未取得)')}</dd>
            <dt>representativeQuote</dt>
            <dd>${escapeHtml(row.representativeQuote || '(未取得)')}</dd>
            <dt>根拠範囲</dt>
            <dd>${escapeHtml(row.rangeText)}</dd>
          </dl>
        </section>
        <section>
          <h3>根拠発話範囲のtranscript抜粋</h3>
          <pre>${escapeHtml(row.excerpt)}</pre>
        </section>
      </div>
      <section class="answer">
        <h3>人間に答えてほしいこと</h3>
        <p>この候補は、今回のexpectedに当たっていなくても、元配信内の切り抜きテーマとして成立しそうか。</p>
        <ul>
          <li><strong>成立しそう</strong>: このtitle/summaryと発話抜粋だけで、別の切り抜きとして作る価値がありそう。</li>
          <li><strong>しない</strong>: 雑談の断片、範囲が広すぎる、主題が弱い、切り抜きテーマとして立たない。</li>
          <li><strong>判定不能</strong>: transcriptだけでは判断できない、映像や前後文脈が必要。</li>
        </ul>
        <p class="template">${escapeHtml(row.fixtureId)} / run ${row.run} / candidate ${row.candidateIndex}: 成立しそう / しない / 判定不能 - 理由1行</p>
      </section>
    </section>
  `).join('\n');

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>theme-llm-v001 miss candidate audit</title>
  <style>
    :root { color-scheme: light; --bg: #f6f7f9; --text: #20242a; --muted: #647080; --line: #d9dee7; --panel: #fff; --accent: #155d9c; }
    body { margin: 0; background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.65; }
    main { max-width: 1220px; margin: 0 auto; padding: 32px 20px 56px; }
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
    .grid { display: grid; grid-template-columns: minmax(280px, .85fr) minmax(320px, 1.15fr); gap: 16px; margin-bottom: 16px; }
    .grid section, .answer { border: 1px solid var(--line); border-radius: 8px; padding: 14px; background: #fbfcfe; }
    .callout { border-left: 4px solid var(--accent); background: #eef6fc; padding: 12px 14px; margin: 14px 0 0; }
    dl { margin: 0; }
    dt { color: var(--muted); font-size: 12px; margin-top: 10px; }
    dd { margin: 2px 0 0; }
    pre { white-space: pre-wrap; word-break: break-word; background: #101820; color: #eef5ff; border-radius: 8px; padding: 14px; overflow: auto; max-height: 360px; }
    .template { border-left: 4px solid var(--accent); background: #eef6fc; padding: 10px 12px; margin-top: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    @media (max-width: 860px) { .grid { grid-template-columns: 1fr; } main { padding: 18px 12px 40px; } }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>theme-llm-v001 miss candidate audit</h1>
      <p class="muted">range miss候補が、未ラベルの切り抜きテーマとして成立しそうかを人間が見るためのシートです。</p>
      <p class="callout"><strong>目的:</strong> missの正体が「Geminiが駄目」なのか、「現在のexpectedが疎で、Geminiが未ラベルの金脈を拾っている」のかを切り分けます。</p>
      <p class="callout"><strong>件数:</strong> 全miss候補 ${counts.allMiss}件。top8換算のmiss候補 ${counts.top8Miss}件。監査対象は、同じ見出しでも根拠範囲が違う候補を別件として扱い ${rows.length}件です。参考として見出しだけで統合すると ${counts.titleOnlyTop8Miss}件ですが、監査対象には採用しません。</p>
    </header>
    <section class="rule">
      <h2>見ること / 見ないこと</h2>
      <ol>
        <li>見ること: title、summary、代表発話、transcript抜粋から、別の切り抜きテーマとして成立しそうか。</li>
        <li>見ないこと: 既存expectedと一致しているか。これはすでにrange missなので今回の問いではありません。</li>
        <li>迷う場合は判定不能で止めます。映像や長い前後文脈が必要な候補を無理に決めません。</li>
      </ol>
    </section>
    ${cards}
  </main>
</body>
</html>
`.replace(/[ \t]+$/gm, '');
}

function candidateAuditMarkdown(rows, counts) {
  const lines = [
    '# theme-llm-v001 miss candidate audit sheet',
    '',
    `全miss候補: ${counts.allMiss}`,
    `top8換算miss候補: ${counts.top8Miss}`,
    `監査対象: ${rows.length}`,
    `参考: 見出しだけで統合した場合: ${counts.titleOnlyTop8Miss}`,
    '',
    '人間は各候補を「成立しそう / しない / 判定不能」の三択で見る。',
    '',
    '| # | fixture | run | candidate | title | summary | quote | range | transcript excerpt | judgement |',
    '| ---: | --- | ---: | ---: | --- | --- | --- | --- | --- | --- |'
  ];
  rows.forEach((row, index) => {
    lines.push(`| ${index + 1} | ${row.fixtureId} | ${row.run} | ${row.candidateIndex} | ${markdownCell(row.title || '(未取得)')} | ${markdownCell(row.summary || '(未取得)')} | ${markdownCell(row.representativeQuote || '(未取得)')} | ${markdownCell(row.rangeText)} | ${markdownCell(row.excerpt)} | 未判定 |`);
  });
  lines.push('');
  return lines.join('\n');
}

function failureMarkdown({ fixtures, candidateRows, auditRows, expectedRows, counts }) {
  const lines = [
    '# theme-llm-v001 failure analysis',
    '',
    '## 目的',
    '',
    'theme-llm-v001 の失敗を、区間選択の失敗ではなくテーマ生成の失敗として分解する。',
    '',
    '- 範囲hitしなかったexpected区間は、入力上そもそも拾えるテーマだったのか',
    '- Geminiは期待区間ではなく未ラベルの切り抜き候補を拾っているのか',
    '- 窓分割によりN=8条件が崩れた影響はどれくらいか',
    '- 正解1区間/少数区間を分母にするテーマ評価が妥当か',
    '',
    '## miss候補監査の集計',
    '',
    `- 全候補数: ${counts.allCandidates}`,
    `- 全miss候補数: ${counts.allMiss}`,
    `- top8換算miss候補数: ${counts.top8Miss}`,
    `- 監査対象: ${auditRows.length}`,
    `- 参考: 見出しだけで統合した場合: ${counts.titleOnlyTop8Miss}`,
    '- ユーザー指定の「39件」とは現データの集計が一致しない。今回の監査では、同じ見出しでも根拠発話範囲が違う候補を別件として扱うため、top8換算のmiss候補69件をそのまま出す。数を合わせるための水増しや削除はしていない。',
    '',
    '監査シート:',
    '',
    '- `evals/clip_composition/reports/theme-generation/theme-llm-v001-20260709-v001-miss-candidate-audit.html`',
    '- `evals/clip_composition/reports/theme-generation/theme-llm-v001-20260709-v001-miss-candidate-audit.md`',
    '',
    '## expected側の入力診断',
    '',
    '| fixture | expected | hit runs | source range | transcript clue | nearest candidates |',
    '| --- | --- | --- | --- | --- | --- |'
  ];
  for (const row of expectedRows) {
    const nearest = row.nearestCandidates.length === 0
      ? '同一source候補なし'
      : row.nearestCandidates.map((candidate) =>
        `run${candidate.run}/c${candidate.candidateIndex} ${candidate.title || '(titleなし)'} distance=${candidate.distanceMs}ms`
      ).join('<br>');
    lines.push(`| ${row.fixtureId} | ${row.expectedIndex}: ${markdownCell(row.label)} | ${row.hitRuns.length ? row.hitRuns.join(',') : 'なし'} | ${row.sourceVideoId} ${msText(row.expectedStartMs)}-${msText(row.expectedEndMs)} | ${markdownCell(row.excerpt)} | ${markdownCell(nearest)} |`);
  }
  lines.push(
    '',
    '## YouTube検索による正解側の網羅率確認',
    '',
    'YouTube検索レベルの軽い確認。検索結果は時点や検索条件で揺れるため、正解データとして固定しない。',
    '',
    '| fixture | source | query | observed examples | assessment |',
    '| --- | --- | --- | --- | --- |'
  );
  for (const item of youtubeCoverage) {
    lines.push(`| ${item.fixtureId} | ${item.sourceVideoId} | ${markdownCell(item.query)} | ${markdownCell(item.examples.join('\\n'))} | ${markdownCell(item.assessment)} |`);
  }
  lines.push(
    '',
    '## N=8 / 窓分割の扱い',
    '',
    '4件目は未分割入力が大きすぎたため、発話境界で8窓に分割した。その結果、fixture全体の候補数はrun1=45、run2=38、run3=42になり、候補数N=8の前提が崩れている。',
    '',
    '当面の扱い:',
    '',
    '- 統合後の候補数を8へ無理に削らない',
    '- 全候補を保存する',
    '- 採点・レポートではtop8とtop全体の両方を出す',
    '- Nの正式な定義はtheme-llm-v002設計時に決める',
    '',
    '## 暫定結論',
    '',
    '- v001は全体として範囲hit率が低く、expected近傍を安定して拾えていない。',
    '- ただしmiss候補の中に未ラベルの切り抜きテーマが多い場合、これはGeminiの失敗だけでなく、テーマ生成評価の正解ラベルが疎である問題を示す。',
    '- その切り分けは、今回作成したmiss候補監査シートの人間判定後に行う。',
    '- 期待区間2はtheme生成でも3回とも範囲hitなし。composition側だけの問題ではなく、上流テーマ生成でも拾われにくい区間として扱う。',
    '',
    '## 次の作業',
    '',
    '1. miss候補監査シートを人間が三択で確認する。',
    '2. 「成立しそう」が多ければ、正解ラベルを増やす設計へ寄せる。',
    '3. 「しない」が多ければ、theme-llm-v002で候補品質の指示を改善する。',
    '4. 4件目の窓分割N問題は、v002設計でtopK統合または候補予選方式を決める。',
    ''
  );
  return lines.join('\n');
}

async function main() {
  const fixtures = [];
  for (const fixtureId of fixtureIds) {
    fixtures.push(await loadFixture(fixtureId));
  }
  const candidateRows = collectCandidateRows(fixtures);
  const missRows = candidateRows.filter((row) => !row.hit);
  const top8MissRows = missRows.filter((row) => row.top8Scope);
  const auditRows = uniqueMissRows(candidateRows);
  const expectedRows = analyzeExpectedMisses(fixtures, candidateRows);
  const counts = {
    allCandidates: candidateRows.length,
    allMiss: missRows.length,
    top8Miss: top8MissRows.length,
    titleOnlyTop8Miss: titleOnlyTop8MissCount(candidateRows)
  };
  const reportDir = path.join(evalRoot, 'reports', 'theme-generation');
  const outputDir = path.join(evalRoot, 'outputs', 'theme-generation');
  await mkdir(reportDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });
  await writeFile(
    path.join(reportDir, `${generationSystem}-${outputId}-miss-candidate-audit.html`),
    candidateAuditHtml(auditRows, counts),
    'utf8'
  );
  await writeFile(
    path.join(reportDir, `${generationSystem}-${outputId}-miss-candidate-audit.md`),
    candidateAuditMarkdown(auditRows, counts),
    'utf8'
  );
  await writeFile(
    path.join(outputDir, `${generationSystem}-${outputId}-failure-analysis.json`),
    `${JSON.stringify({ counts, auditRows, expectedRows, youtubeCoverage }, null, 2)}\n`,
    'utf8'
  );
  await writeFile(
    path.join(reportDir, `${generationSystem}-${outputId}-failure-analysis.md`),
    failureMarkdown({ fixtures, candidateRows, auditRows, expectedRows, counts }),
    'utf8'
  );
  console.log(`failure analysis: ${path.join(reportDir, `${generationSystem}-${outputId}-failure-analysis.md`)}`);
  console.log(`miss candidate audit: ${path.join(reportDir, `${generationSystem}-${outputId}-miss-candidate-audit.html`)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
