#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

function workspaceRoot() {
  let current = process.cwd();
  while (!existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
    const parent = path.dirname(current);
    if (parent === current) throw new Error('workspaceなし');
    current = parent;
  }
  return current;
}

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const outputRoot = path.join(evalRoot, 'outputs', 'candidate-ranking', '20260713-causal-context-audit-v001');
const reportPath = path.join(evalRoot, 'reports', 'candidate-ranking', 'candidate-ranking-causal-context-audit-result-20260713.md');

const sourceConfigs = {
  B: {
    fixtureId: 'nOEWCNc77MI_multiblock_material_v001',
    themePath: path.join(evalRoot, 'outputs', 'theme-generation', 'nOEWCNc77MI_chat_velocity_top100_input_selection_v004', 'theme-llm-v002', '20260711-chat-velocity-top100-v001', 'run-01-gemini-output.json'),
    inputPath: path.join(evalRoot, 'outputs', 'theme-generation', 'nOEWCNc77MI_chat_velocity_top100_input_selection_v004', 'theme-llm-v002', '20260711-chat-velocity-top100-v001', 'prompt-input.json')
  },
  second: {
    fixtureId: '9dtwF5Exu5w_multiblock_material_v001',
    themePath: path.join(evalRoot, 'outputs', 'theme-generation', '9dtwF5Exu5w_chat_velocity_top100_input_selection_v004', 'theme-llm-v002', '20260712-chat-velocity-top100-generalization-v001', 'run-01-gemini-output.json'),
    inputPath: path.join(evalRoot, 'outputs', 'theme-generation', '9dtwF5Exu5w_chat_velocity_top100_input_selection_v004', 'theme-llm-v002', '20260712-chat-velocity-top100-generalization-v001', 'prompt-input.json')
  }
};

const targets = [
  {
    sourceKey: 'B', candidateId: 58, previousAnswer: '悪くないが選ばない', sampleType: '文脈不明の起点',
    causeSpeechIds: [927], reactionSpeechIds: [931],
    assessment: 'cause-in-evidence',
    rationale: '移動中に潜っているころねを置き去りにする可能性と、ころねが犬かきで追う宣言がspeech 927にあり、実際に距離が離れて絶叫する反応がspeech 931にある。'
  },
  {
    sourceKey: 'B', candidateId: 12, previousAnswer: 'つまらない', sampleType: '単純なゲーム行動',
    causeSpeechIds: [77, 78, 79, 80], reactionSpeechIds: [81, 82, 83],
    assessment: 'cause-in-evidence',
    rationale: '食料がココナッツだけで不足している状態と、ころねが鳥を仕留めた出来事がspeech 77-80にあり、食べられるかの確認と肉確保への反応がspeech 81-83にある。'
  },
  {
    sourceKey: 'B', candidateId: 84, previousAnswer: 'つまらない', sampleType: '本人のゲーム内ミス',
    causeSpeechIds: [1647, 1648, 1649], reactionSpeechIds: [1650, 1651],
    assessment: 'cause-in-evidence',
    rationale: '別の大きいテーブルを選び直してもローテーブルだった失敗がspeech 1647-1649にあり、正解発見と大量に作ったテーブルへの困惑がspeech 1650-1651にある。以前の失敗映像はないが、量産した状態はspeech 1651で明示される。'
  },
  {
    sourceKey: 'second', candidateId: 25, previousAnswer: 'つまらない', sampleType: '外部選択で状況悪化',
    causeSpeechIds: [565, 566, 567, 568, 569, 570], reactionSpeechIds: [571, 572],
    assessment: 'cause-in-evidence',
    rationale: '対戦相手をチャットに選ばせて一番右へ決め、Bランクを引いた経緯がspeech 565-570にあり、学校名を見て不安になる反応がspeech 571-572にある。'
  }
];

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));

function expandSpeechIds(specs) {
  const result = [];
  for (const spec of specs) {
    const text = String(spec);
    const range = text.match(/^(\d+)-(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (start > end) throw new Error(`speech ID範囲不正: ${text}`);
      for (let id = start; id <= end; id += 1) result.push(id);
    } else if (/^\d+$/.test(text)) result.push(Number(text));
    else throw new Error(`speech ID表記不正: ${text}`);
  }
  return [...new Set(result)];
}

async function main() {
  const loaded = {};
  for (const [key, config] of Object.entries(sourceConfigs)) {
    const [themes, input] = await Promise.all([readJson(config.themePath), readJson(config.inputPath)]);
    loaded[key] = {
      themes: themes.themes,
      segments: input.modelInput.sources[0].segments,
      sourceVideoId: input.modelInput.sources[0].sourceVideoId
    };
  }

  const candidates = targets.map((target) => {
    const config = sourceConfigs[target.sourceKey];
    const source = loaded[target.sourceKey];
    const theme = source.themes[target.candidateId - 1];
    if (!theme) throw new Error(`${target.sourceKey} candidate ${target.candidateId}なし`);
    const evidenceSpeechIds = expandSpeechIds(theme.evidenceRanges.flatMap((range) => range.supportingSpeechIds));
    const segmentById = new Map(source.segments.map((segment) => [segment.speechId, segment]));
    const pieces = evidenceSpeechIds.map((speechId) => {
      const segment = segmentById.get(speechId);
      if (!segment) throw new Error(`${target.sourceKey} speech ${speechId}がモデル入力にない`);
      return segment;
    }).sort((a, b) => a.sourceStartMs - b.sourceStartMs);
    for (const speechId of [...target.causeSpeechIds, ...target.reactionSpeechIds]) {
      if (!evidenceSpeechIds.includes(speechId)) throw new Error(`candidate ${target.candidateId} の判定speech ${speechId}が根拠外`);
    }
    return {
      fixtureId: config.fixtureId,
      sourceVideoId: source.sourceVideoId,
      candidateId: target.candidateId,
      title: theme.title,
      reason: theme.reason,
      previousAnswer: target.previousAnswer,
      sampleType: target.sampleType,
      evidenceRanges: theme.evidenceRanges,
      evidenceSpeechIds,
      evidencePieces: pieces,
      causeSpeechIds: target.causeSpeechIds,
      reactionSpeechIds: target.reactionSpeechIds,
      assessment: target.assessment,
      rationale: target.rationale
    };
  });

  const counts = {
    total: candidates.length,
    causeInEvidence: candidates.filter((candidate) => candidate.assessment === 'cause-in-evidence').length,
    causeOutsideEvidence: candidates.filter((candidate) => candidate.assessment === 'cause-outside-evidence').length,
    textIndeterminate: candidates.filter((candidate) => candidate.assessment === 'text-indeterminate').length
  };
  const result = {
    kind: 'candidate_ranking_causal_context_desk_audit',
    auditId: '20260713-causal-context-audit-v001',
    createdAt: new Date().toISOString(),
    policy: {
      contextSelection: 'causal evidence only; no fixed preceding time',
      rePresent: 'cause-in-evidence only',
      expectedOrClipDataUsedForCauseAssessment: false
    },
    counts,
    humanWork: {
      currentDeskAudit: { itemCount: 0, estimatedMinutes: 0 },
      reReview: { itemCount: counts.causeInEvidence, estimatedMinutesPerItemUpperBound: 2, estimatedTotalMinutesUpperBound: counts.causeInEvidence * 2 }
    },
    candidates,
    finding: '4件とも、theme根拠内の発話だけで原因状態と反応の両方を指せた。candidate 58を含め、旧確認も同じ単一evidenceRangeを連続再生していたため、単純な根拠ピース欠落ではない。つぎはぎ再提示は発話ピース間の無関係部分を除く診断であり、根拠外から原因を補わない。',
    fixtureAndExpectedChanges: false
  };
  const rows = candidates.map((candidate) => `| ${candidate.fixtureId} | ${candidate.candidateId} | ${candidate.evidenceSpeechIds.join(', ')} | 根拠内に原因あり | ${candidate.rationale.replace(/\|/g, '｜')} |`);
  const report = `# candidate-ranking 因果文脈 小監査 机上結果\n\n- 追加LLM実走: なし\n- expected・既存切り抜き・照合結果の原因判定利用: なし\n- 現時点の人間作業: 0件・0分\n- 再提示対象: ${counts.causeInEvidence}件×2分弱、上限約${counts.causeInEvidence * 2}分\n\n| 素材 | candidate | 全根拠speech | 判定 | 根拠 |\n| --- | ---: | --- | --- | --- |\n${rows.join('\n')}\n\n## 結果\n\n4件とも、theme生成時の根拠内に原因状態と反応の両方があった。原因が根拠外だった候補は0件、テキストでは不明は0件。\n\n一方、4件ともevidenceRangesは1件だけで、過去の確認動画も同じ連続範囲を提示していた。特にcandidate 58はspeech 927で「移動中に潜る→置き去りの可能性→犬かきで追う」を述べ、speech 931で距離が離れて絶叫しているが、人間には文脈不明と映った。したがって単純な「根拠ピースの取りこぼし」だけでは説明できない。\n\n再提示では、根拠外へ時間で遡らず、根拠内の全speechピースだけを時系列につぎはぎする。旧動画と情報源は同じだが、発話ピース間の不要部分を除いた因果提示で判定が変わるかを見る。\n\n## 人間作業申告\n\n再提示は4件。1件2分弱、合計上限約8分。四択は「公開したい / 悪くないが選ばない / つまらない / 文脈不明」。旧判定は削除せず、再判定の結果と並べて保存する。\n`;
  await mkdir(outputRoot, { recursive: true });
  await mkdir(path.dirname(reportPath), { recursive: true });
  await Promise.all([
    writeFile(path.join(outputRoot, 'desk-audit.json'), `${JSON.stringify(result, null, 2)}\n`),
    writeFile(reportPath, report)
  ]);
  console.log(JSON.stringify({ status: 'complete', counts, humanWork: result.humanWork, output: path.relative(root, path.join(outputRoot, 'desk-audit.json')), report: path.relative(root, reportPath) }, null, 2));
}

main().catch((error) => { console.error(error.stack ?? error.message); process.exitCode = 1; });
