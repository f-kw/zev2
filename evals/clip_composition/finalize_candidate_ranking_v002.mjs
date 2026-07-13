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
const experimentRoot = path.join(evalRoot, 'outputs', 'candidate-ranking', '20260713-character-context-run1-v002');
const preauditPath = path.join(experimentRoot, 'result.json');
const humanPath = path.join(experimentRoot, 'human-review-unlabeled-v002', 'human-review-result.json');
const finalPath = path.join(experimentRoot, 'final-result.json');
const reportPath = path.join(evalRoot, 'reports', 'candidate-ranking', 'candidate-ranking-v002-run1-final-result-20260713.md');

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));

function labelCounts(candidates) {
  const knownHit = candidates.filter((candidate) => candidate.isKnownHit).length;
  const humanPublish = candidates.filter((candidate) => candidate.humanLabel?.answer === 'publish').length;
  const humanOkaySkip = candidates.filter((candidate) => candidate.humanLabel?.answer === 'okay_skip').length;
  const humanBoring = candidates.filter((candidate) => candidate.humanLabel?.answer === 'boring').length;
  return {
    knownHit,
    humanPublish,
    humanOkaySkip,
    humanBoring,
    strongKnownOrPublish: knownHit + humanPublish,
    reviewWorthyKnownOrNonBoring: knownHit + humanPublish + humanOkaySkip,
    denominator: candidates.length
  };
}

async function main() {
  const [preaudit, human] = await Promise.all([readJson(preauditPath), readJson(humanPath)]);
  if (preaudit.kind !== 'candidate_ranking_v002_run1_preaudit_result') throw new Error('監査前結果の種類が不正');
  if (human.sourceGenerationSystem !== preaudit.generationSystem || human.items.length !== preaudit.humanWork.exactNewItemCount) throw new Error('人間確認の対象数または生成系統が不一致');
  const humanByKey = new Map(human.items.map((item) => [`${item.fixtureId}:${item.candidateId}`, item]));
  const expectedKeys = preaudit.fixtures.flatMap((fixture) => fixture.unreviewedCandidates.map((candidate) => `${fixture.fixtureId}:${candidate.candidateId}`));
  if (expectedKeys.length !== humanByKey.size || expectedKeys.some((key) => !humanByKey.has(key))) throw new Error('人間確認対象が監査前の未ラベル候補と不一致');

  const fixtures = preaudit.fixtures.map((fixture) => {
    const rankedCandidates = fixture.rankedCandidates.map((candidate) => {
      const answer = humanByKey.get(`${fixture.fixtureId}:${candidate.candidateId}`);
      if (!answer) return candidate;
      return {
        ...candidate,
        humanLabel: {
          answer: answer.answer,
          answerLabel: answer.answerLabel,
          sourceReviewId: human.reviewId,
          reviewerNote: answer.reviewerNote
        },
        labelStatus: 'human-reviewed',
        countsAsStrong: answer.answer === 'publish',
        countsAsReviewWorthy: answer.answer === 'publish' || answer.answer === 'okay_skip'
      };
    });
    const finalMixedScore = labelCounts(rankedCandidates);
    if (finalMixedScore.denominator !== 5 || finalMixedScore.knownHit + finalMixedScore.humanPublish + finalMixedScore.humanOkaySkip + finalMixedScore.humanBoring !== 5) throw new Error(`${fixture.fixtureId} の最終ラベルが5件を満たさない`);
    return { ...fixture, rankedCandidates, unreviewedCandidates: [], finalMixedScore };
  });

  const overall = fixtures.reduce((sum, fixture) => {
    for (const key of ['knownHit', 'humanPublish', 'humanOkaySkip', 'humanBoring', 'strongKnownOrPublish', 'reviewWorthyKnownOrNonBoring', 'denominator']) sum[key] += fixture.finalMixedScore[key];
    return sum;
  }, { knownHit: 0, humanPublish: 0, humanOkaySkip: 0, humanBoring: 0, strongKnownOrPublish: 0, reviewWorthyKnownOrNonBoring: 0, denominator: 0 });

  const comparison = [
    { system: 'generation-order', knownHit: 3, strong: 3, reviewWorthy: 6, denominator: 10 },
    { system: 'candidate-ranking-v001@gemini-web-flash', knownHit: 2, strong: 5, reviewWorthy: 6, denominator: 10 },
    { system: preaudit.generationSystem, knownHit: overall.knownHit, strong: overall.strongKnownOrPublish, reviewWorthy: overall.reviewWorthyKnownOrNonBoring, denominator: overall.denominator }
  ];
  const finalResult = {
    kind: 'candidate_ranking_v002_run1_final_result',
    finalizedAt: new Date().toISOString(),
    generationSystem: preaudit.generationSystem,
    model: preaudit.model,
    runCount: preaudit.runCount,
    inputPolicy: preaudit.inputPolicy,
    scoringStatus: 'final-human-review-complete',
    humanReview: human,
    fixtures,
    overall,
    comparison,
    adjudication: {
      result: 'limited-pass-provisional-standard-for-hand-trim-trial',
      reason: '既知hitが生成順3/10・v001 2/10に対してv002 5/10となり、両素材とも現在の人間ラベル上は強い候補4/5を満たし、v001の既知hitを落とさなかった。',
      limitation: '2素材・run 1・確認者1名の開発データであり、汎化済み標準ではない。candidate 58と過去のゲーム場面判定には、場面自体の価値と提示文脈の不足を分離できない交絡が残った。',
      next: 'candidate-ranking-v002の上位5を手直し試験v002の入力に使い、1配信あたり公開3〜5本の仕上げ合計15分以内を測る。'
    },
    fixtureAndExpectedChanges: false
  };

  const fixtureRows = fixtures.map((fixture) => `| ${fixture.fixtureId} | ${fixture.finalMixedScore.knownHit} | ${fixture.finalMixedScore.humanPublish} | ${fixture.finalMixedScore.humanOkaySkip} | ${fixture.finalMixedScore.humanBoring} | ${fixture.finalMixedScore.strongKnownOrPublish}/5 | ${fixture.finalMixedScore.reviewWorthyKnownOrNonBoring}/5 |`);
  const comparisonRows = comparison.map((item) => `| ${item.system} | ${item.knownHit}/${item.denominator} | ${item.strong}/${item.denominator} | ${item.reviewWorthy}/${item.denominator} |`);
  const report = `# candidate-ranking-v002 run 1 最終結果\n\n- 生成系統: \`${preaudit.generationSystem}\`\n- 人間確認: 1件、見積り約1分、実測1分39秒\n- 形式違反: 0件\n- 漏洩検査: 2素材ともpass\n- v001から落ちた既知hit: 0件\n- 既存fixture・expected変更: なし\n\n## 最終混成打率\n\n| 素材 | 既知hit | 公開したい | 悪くない | つまらない | 強い候補 | 確認価値あり |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: |\n${fixtureRows.join('\n')}\n| 合計 | ${overall.knownHit} | ${overall.humanPublish} | ${overall.humanOkaySkip} | ${overall.humanBoring} | ${overall.strongKnownOrPublish}/10 | ${overall.reviewWorthyKnownOrNonBoring}/10 |\n\n## 比較\n\n| 方式 | 既知hit | 強い候補 | 確認価値あり |\n| --- | ---: | ---: | ---: |\n${comparisonRows.join('\n')}\n\n強い候補・確認価値ありは、今回提示した根拠範囲に対する人間ラベルである。文脈不足でゲーム場面が低く評価された可能性があるため、生成順とv001の値が本来より低い交絡を残す。一方、既知hitは提示媒体に依存しない実績ラベルで、v002は生成順3/10・v001 2/10に対して5/10だった。\n\n## candidate 58の人間観察\n\n- 判定: **悪くないが選ばない**\n- 人間メモ: 「面白いのかもしれないが文脈がわからないね」\n- 追加観察: 「ゲームのシーンが面白くない原因も同じかもしれない」\n- 読めること: 強い反応が理由文に書かれていても、候補内で反応の理由を理解できなければ公開候補へは上がらない。\n- まだ分からないこと: 元場面自体の問題か、theme-llm-v002の根拠範囲が前提を含まないのか、確認媒体が前後を狭く提示したのかは分離できない。\n- 既存解釈の補正: 「ゲーム内イベント自体の価値が低い」とは確定しない。過去に低評価だったゲーム場面も、文脈不足によって低く見えた可能性を残す。\n- 扱い: 直ちにv003へ変更せず、文脈の完結性をゲーム・非ゲームの両方で分離する観測として保存する。\n\n## 判定\n\n**限定合格。手直し試験v002で使う暫定標準にする。**\n\n既知hitは生成順3/10、candidate-ranking-v001 2/10に対してv002は5/10へ増え、v001上位の既知hitも落としていない。現在の人間ラベルでは両素材とも強い候補4/5、合計8/10で、次の「上位5だけを仕上げる」手直し試験へ進める水準に達した。\n\nただし2素材・run 1・確認者1名の開発データであり、汎化済み標準ではない。人間三択には提示文脈の不足という交絡があるため、強い候補8/10という比較値だけで恒久採用しない。手直し試験の前に、反応の原因を理解できる文脈提示を設計する。\n`;
  await mkdir(path.dirname(reportPath), { recursive: true });
  await Promise.all([
    writeFile(finalPath, `${JSON.stringify(finalResult, null, 2)}\n`),
    writeFile(reportPath, report)
  ]);
  console.log(JSON.stringify({
    status: 'final',
    finalResult: path.relative(root, finalPath),
    report: path.relative(root, reportPath),
    overall,
    adjudication: finalResult.adjudication.result
  }, null, 2));
}

main().catch((error) => { console.error(error.stack ?? error.message); process.exitCode = 1; });
