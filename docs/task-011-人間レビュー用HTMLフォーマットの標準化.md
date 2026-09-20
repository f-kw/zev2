# task-011 — 人間レビュー用HTMLフォーマットの標準化

状態: TODO
作成日: 2026-09-20
優先度: 次回のHuman Review運用改善候補
実装開始: 未承認 / 未着手

## 背景

ZEVの人間レビューでは、毎回レビュー画面・比較方法・問い方が変わると、

- 人間が毎回UIの使い方を読み直す必要がある
- 2〜3分級の動画を最初から最後まで集中して差分確認する負荷が高い
- AI側も「何をどう聞くか」を毎回自由生成するため、問いの品質が安定しない
- レビュー結果をreview_id・対象成果物・反映先へ正しく結び付けにくい

という問題がある。

Human Reviewは、人間に全件再確認させる工程ではなく、
AIが重要箇所・変更箇所・未決箇所を整理し、人間にしか決められないことを短い確認単位で判断してもらうための工程とする。

## 目的

人間レビュー用のHTMLを毎回作り直さず、
**固定テンプレートへReview Batchのデータを流し込む標準方式**を用意する。

AIはHTMLの構造や問い方を毎回自由設計せず、
固定schemaへレビュー対象を埋めるだけにする。

## 基本方針

### 1. Point Reviewを標準にする

演出・字幕・接続・差分などの判断は、
2〜3分の全編を前後比較させず、対象箇所へ直接ジャンプできる短い確認単位で行う。

各レビュー項目には最低限、

- review_id
- title
- target artifact
- target time
- comparison required
- before time
- after time
- what changed
- why human review is needed
- question
- allowed answers

を持たせる。

### 2. Whole Video Reviewは別モードにする

全編視聴は、

- 一本としての自然さ
- 単調さ
- テンポ
- 全体の見心地

のような、全体でしか判断できない項目に限る。

細かい前後差分・演出採否を全編視聴で評価させない。

### 3. UIを固定する

毎回同じ位置・同じ名前で操作できるようにする。

例:

- この箇所を見る
- 5秒前から再生
- Beforeを見る
- Afterを見る
- 問題なし
- 気になる
- 採用
- 修正して採用
- 不採用
- 判断しない
- 次のレビュー項目

### 4. HTMLとレビュー内容を分離する

理想構造:

```
human-review-template/
  index.html
  review.js
  style.css

review-batch/
  review.json
  media/
```

AI / Codexは原則としてHTMLを毎回生成せず、
`review.json` を生成する。

### 5. Human Review Pendingと連携する

`docs/HUMAN_REVIEW_PENDING.md` のHuman Review Batch / review_idから
review.jsonを生成できること。

人間の回答は、対象artifact SHA・review_id・判断範囲に束縛して保存する。

## 人間レビュー品質に関するルール候補

実装時に、Human Review Policyへ次の趣旨を追記することを検討する。

- 2〜3分級の動画を最初から最後まで集中視聴して微差を判定させることを標準手順にしない。
- 長尺視聴では人間の注意・記憶・比較精度が落ちることをレビュー品質リスクとして扱う。
- AIが時刻・状態・差分を保持できる部分を、人間へ丸ごと再確認させない。
- 細かい差分はPoint Review、全体印象だけWhole Video Reviewで確認する。
- 「全部見せる方が安全」という前提を採らない。

## 初期対象

最初の実証対象として、現在のHuman Review Batchを使う。

### HRB-001
- Panel
- Pulse
- Bounce
- Shake
- Soft Separator
- Normal基準
- 自動配置全体

### HRB-002
- 「逃げるやつ?」のPanel変更
- 最初の接続 Normal Cut → Black Separator
- override後の全体整合感

HRB-003の後修正UIレビューは、実ブラウザー受入の環境問題が解消してから扱う。

## 非目的

このTODOでは次を行わない。

- 新しい演出の追加
- rendererの変更
- QC基盤の再設計
- AIによる自動採点
- 人間の評価を数値scoreへ強制変換
- 汎用NLEの構築
- 新しい動画再生成を前提としたレビュー基盤

## 完了条件

- 固定HTMLテンプレートが1つある
- review.json schemaが固定されている
- HRB-001/002を同じUIで表示できる
- Point Review / Whole Video Reviewが区別されている
- Before/Afterが必要な項目だけ比較できる
- 人間回答をreview_idとartifact SHAへ保存できる
- 2回目以降もUIの構造を変えずに新しいReview Batchを投入できる

## 参照

- `docs/policies/HUMAN_REVIEW_ACCUMULATION_POLICY_v001.md`
- `docs/HUMAN_REVIEW_PENDING.md`

## 2026-09-20 Q2着工・実装記録

Codexです。上記のTODO・未承認／未着手は作成時点の履歴として保持する。今回の[Q1・Q2着工指示 v001](work-orders/DIGEST_Q1_Q2_WORK_ORDER_v001.md)により、task-011の実装へ着手した。開始HEADは `66d352ca`、既存の `codex/digest-presentation-editing-stage4` 上で既存作業を保持して実装する。

現在の実装は [`tools/point-review`](../tools/point-review/README.md)。固定テンプレートへBatch別レビュー用データを埋め、対象動画のSHA・fps・フレーム数を照合して、従来の本人直接open用ローカルHTMLを作成する。既存の提示HTML・原回答は変更しない。

- 一つの動画プレイヤーで短区間を再生し、終端・ポイント切替・比較切替で停止する。問いごとに動画固有のフレーム時計を使用し、必要な比較だけBefore／Afterを出す。
- 回答は未回答から開始し、レビュー版・ポイント・動画SHA・区間・反映範囲へ保存する。原文を保持し、別版・重複・対象不整合のimportを拒否する。
- 端末への自動保存、回答ファイルの取り出し／再読、チャット原文の同一ポイントへの整理入口を用意した。機能使用許可・課題完了は自動認定しない。
- `node --test tools/point-review/point-review.test.mjs`：9件合格。異なる二組の合成テストデータ、同一テンプレート投入、DOMを模したUI結線、区間停止、保存・再読・混版拒否を確認した。
- 実ブラウザー操作・使いやすさ・人間品質は未確認。既存の自動操作拒否を迂回していない。今回の修正版を使う実Batch生成・媒体照合はQ1の短尺完成後に同じ生成器へ投入して記録する。

優先順位は上位計画v002のQ1・Q2、その後の具体指示に従うQ3・Q4改善サイクル、必要な編集品質のQ5。ショートは別の明示許可まで着手しない。

## 2026-09-20 Q2 技術提出

Codexです。固定テンプレートへ今回の4ポイントBatch `HRB-Q1-Q2-001 / v001` と別の技術確認用Batchを投入し、同じテンプレート内容で生成できることを確認した。実媒体6本のSHA・fps・フレーム数、5短尺の元時計、4件未回答、保存・再読、別版・別動画・別区間・別対象範囲・別ポイントの拒否まで成立した。[入口と実測](reports/digest-quality-q1-q2-20260920-v001/review-main-verification-v001.md)を参照する。

状態は実装・コード検査・実データ投入完了。実ブラウザーの操作受入と修正後の人間品質は未確認。従来の自動表示拒否を迂回せず、本人が直接開くローカルHTMLを提示する。Nodeの9件成功と実ブラウザーの成功を混同していない。旧提示HTMLと回答は不変保持し、回答済み・採用済みを初期値にしていない。
