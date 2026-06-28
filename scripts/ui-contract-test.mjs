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

console.log('UI契約テスト成功');
