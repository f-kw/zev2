#!/usr/bin/env node

import { buildGeminiEditPlanPrompt } from '../src/steps/edit-plan.ts';

const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) {
    throw new Error(message);
  }
};

const prompt = buildGeminiEditPlanPrompt(
  {
    title: '検査用テーマ',
    themeSummary: '画面種類の判別指示を検査する',
    parts: [{
      role: '本編',
      sourceStartMs: 0,
      sourceEndMs: 2_000,
      speechIds: [1, 2],
      transcriptText: '検査用の発話です',
      speechUnits: [
        { id: 1, sourceStartMs: 0, sourceEndMs: 1_000, text: '検査用の' },
        { id: 2, sourceStartMs: 1_000, sourceEndMs: 2_000, text: '発話です' },
      ],
    }],
  } as any,
  {
    input: {
      purpose: '動画種類に応じたcrop候補を作る',
    },
  } as any,
);

const requiredStatements = [
  '最初に動画の種類を判別し、その種類に対応する画面枠を選んでください。',
  '主要な視覚対象が話者1人で、場面の理解に同時表示が必要な独立映像がない。',
  '話者とは別に、ゲーム、共有画面、ブラウザ、資料、別映像など、場面の理解に同時表示が必要な独立映像がある。',
  '2人の話者の表情や反応を同時に残す必要がある。',
  '同じ話者を含む元映像全体と、その話者を上下へ重複表示してはいけません。',
  'screen は元映像全体ではなく、話者とは独立して内容理解に必要な情報画面の範囲です。',
  'layoutReason',
];

for (const statement of requiredStatements) {
  assert(prompt.includes(statement), `種類判別promptに必要な記述がありません: ${statement}`);
}

assert(
  !prompt.includes('screen は、その断片で見えている画面全体です。'),
  '元映像全体を独立screenとみなす旧定義が残っています',
);
assert(
  !prompt.includes('"screenLayoutId": "screen_speaker",'),
  '単一種類へ誘導する旧JSON例が残っています',
);
assert(
  prompt.indexOf('最初に動画の種類を判別') < prompt.indexOf('detections:'),
  'crop対象の検出より先に動画種類を判別する順序が示されていません',
);

console.log(JSON.stringify({
  status: 'passed',
  checks: requiredStatements.length + 3,
  classificationBeforeDetection: true,
  concreteSingleLayoutExample: false,
}));
