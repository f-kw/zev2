#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appVuePath = path.join(workspaceRoot, 'client', 'src', 'App.vue');

function assertContract(condition, message) {
  if (!condition) {
    throw new Error(`UI契約テスト失敗: ${message}`);
  }
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

const appVue = await readFile(appVuePath, 'utf8');

assertContract(
  appVue.includes('<h2 class="glitch-title">{{ hudStatusText }}</h2>'),
  '右HUDの現在状態見出しは、状態名を1回だけ表示する必要があります'
);

assertContract(
  !appVue.includes(':data-t="hudStatusText"') && !appVue.includes('data-t="hudStatusText"'),
  '右HUDの現在状態見出しを疑似要素用属性へ複製してはいけません'
);

assertContract(
  !appVue.includes('content: attr(data-t)'),
  'CSSで同じ状態名を疑似要素へ複製してはいけません'
);

assertContract(
  countMatches(appVue, /hudStatusText/g) === 2,
  '現在状態見出しの参照箇所が増えています。重複表示になっていないか確認してください'
);

assertContract(
  appVue.includes('const artifactReferenceItems = computed<ArtifactReferenceItem[]>'),
  '成果物参照一覧を作る処理が見つかりません'
);

assertContract(
  appVue.includes('aria-label="成果物参照"') &&
    appVue.includes('class="artifact-reference-list"') &&
    appVue.includes('{{ item.uri }}'),
  '右HUDで成果物参照の種別、意味、URIを確認できる表示が見つかりません'
);

assertContract(
  appVue.includes('class="activity-search"') &&
    appVue.includes('v-model="activitySearchInput"') &&
    appVue.includes('placeholder="工程名、理由、成果物参照など"'),
  '作業履歴ダイアログで履歴本文を検索できる入力が見つかりません'
);

assertContract(
  appVue.includes('aria-label="完成動画の人間判断"') &&
    appVue.includes("submitOutputFinalReview('publish_ready')") &&
    appVue.includes("submitOutputFinalReview('final_complete')"),
  '完成動画を投稿可能または最終完了として記録する人間判断欄が見つかりません'
);

assertContract(
  appVue.includes('!hasFinalCompleteForCurrentOutput.value && !agentOperationLocked.value') &&
    appVue.includes('hasFinalCompleteForCurrentOutput.value ||') &&
    appVue.includes(':disabled="agentOperationLocked || hasFinalCompleteForCurrentOutput'),
  '最終完了済みの完成動画で、作り直しやWeb Geminiレビュー変更を止めるUI条件が見つかりません'
);

console.log('UI契約テスト成功');
