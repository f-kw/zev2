# 直近3日作業サマリ

作成時刻: 2026-07-05 07:41:37 +0900

対象期間: 2026-07-02 07:41:37 +0900 以降

確認方法:

- Gitコミット履歴で、期間内に確定された作業を確認
- ファイル更新時刻で、未コミットの作業と生成物を確認
- `runtime/` は本番実行状態を含むため、時刻確認の対象から除外

## 概要

直近3日では、大きく3系統の作業が行われている。

1. Web Geminiレビュー周辺の状態管理、保存、実行状態更新、再生成反映の整理
2. 人間制御APIの大きな処理を、意味ごとの小さい領域へ分割する整理
3. 切り抜き区間選択の評価環境と、バズった切り抜き候補の調査

## 日別サマリ

### 2026-07-02

主な目的は、Web Geminiレビューの保存状態を本体状態へ寄せ、ファイル読み込み中心の扱いを減らすこと。

実施内容:

- Web Geminiレビューと画面表示用の活動履歴の型を共有パッケージへ集約
- Web Geminiレビューの実行状態更新APIを追加
- Edge操作スクリプトをAPI経由の更新へ切り替え
- Web Geminiレビュー状態を本体状態へ保存する処理を追加
- 保存済みレビューを後から実行中状態で上書きしない保護を追加
- backendの状態更新を直列化し、同時更新時の競合リスクを下げる整理を実施
- runnerの子プロセス実行処理を共通化
- Claude向けのシステム概要とコードレビュー結果を文書化

代表コミット:

- `0fbd836` Web Geminiレビューとactivityの型定義を共有パッケージへ集約
- `ff93dce` Web GeminiのファイルI/Oを独立モジュールへ分離し、実行状態更新APIを追加
- `aae9da1` Web GeminiレビューedgeスクリプトをすべてAPI経由へ切り替え
- `1894b8b` Web Geminiレビュー状態をstate.jsonへ二重書きする
- `2b34fa9` Web Geminiレビューの読み出しをstateへ切り替え、ファイル読み込みを削除
- `59363b5` 保存済みWeb Geminiレビューへの実行状態更新を拒否する

### 2026-07-03

主な目的は、人間制御APIの大きな処理を意味ごとに切り出し、後続レビューで追いやすくすること。

実施内容:

- 共通補助処理、操作ログ、本体状態の選択処理を分離
- 活動履歴の組み立て処理を分離
- 成果物検証と作り直し処理を分離
- 人間確認の発行と操作処理を分離
- Web Gemini関連ルートを専用ルートへ分離
- 実行要求の取得、失敗、復旧処理を実行ライフサイクル領域へ分離
- 実施順と完了状況をレビュー文書へ反映

代表コミット:

- `01075f4` 共通ヘルパー・操作ログ・stateセレクタをdomainへ切り出し
- `ed279cb` activity組み立てをactivity/build.tsへ切り出し
- `8807ff4` 成果物検証と作り直し一式をモジュールへ切り出し
- `d56fa0d` 人間確認の発行と操作をdomain/control-review.tsへ切り出し
- `f8f6cb2` Web Gemini系5ルートをweb-gemini/routes.tsへ切り出し
- `913e191` claim/fail/claim復旧をdomain/agent-lifecycle.tsへ切り出し

### 2026-07-04

主な目的は、レビュー依頼の見せ方を整理し、切り抜き区間選択の評価を本体から切り離して始められる状態を作ること。

実施内容:

- Geminiレビュー依頼のUI文言を、人間が判断しやすい表現へ整理
- 関連する画面契約テストとエージェントシナリオテストを更新
- 外部レビュアーへ渡すプロンプト設計と評価基盤の相談用説明を追加
- 切り抜き区間選択の評価環境を `evals/clip_composition/` に追加
- 既存の編集元場面作成処理を、評価環境から単体で呼べるように公開
- 実データ1件をfixtureとして評価用ディレクトリへ固定
- 評価結果JSONと人間向けサマリを生成
- YouTube上の高再生切り抜き候補を調査し、STT前の候補リストを保存
- 第一候補の短尺切り抜き動画をローカルへ保存

代表コミット:

- `90f528a` Geminiレビュー依頼のUI文言を人間向けに整理
- `31b7ac8` 外部レビュアー向けのプロンプト設計・評価基盤の相談用技術説明を追加

未コミットで確認できる作業:

- `runner/src/steps/composition.ts`
  - 編集元場面作成処理を評価環境から直接呼ぶための公開だけを追加
- `evals/clip_composition/run_eval.ts`
  - 固定入力から切り抜き区間を評価し、結果JSONと人間向けサマリを出力
- `evals/clip_composition/fixtures/`
  - 実行済みデータを評価用fixtureとして固定
- `evals/clip_composition/research/`
  - バズった切り抜き候補の調査結果と、第一候補の動画ファイルを保存

## 直近の評価環境成果物

2026-07-04 14:48:25 +0900 に生成:

- `evals/clip_composition/outputs/draft_w4Lp9IJC6pQl3FsRfFL9t/clip_composition_prompt_v001/20260704-144825/result.json`
- `evals/clip_composition/reports/draft_w4Lp9IJC6pQl3FsRfFL9t/clip_composition_prompt_v001/20260704-144825/summary.md`

内容:

- 固定fixture 1件で、既存の編集元場面作成処理を3回実行
- 3回とも同じ区間を選択
- 開始位置と終了位置の揺れは0ms
- 期待区間との差分は0ms

## YouTube候補調査と保存

2026-07-04 15:49 頃に保存:

- `evals/clip_composition/research/viral-youtube-clips-20260704.json`
- `evals/clip_composition/research/viral-youtube-clips-20260704.md`

第一候補:

- 動画: `https://www.youtube.com/watch?v=IMQYaT_RWRA`
- タイトル: `『笑い声がトルコ行進曲』の女`
- 調査時点の再生数: 5,305,609
- 尺: 19秒
- 保存済み動画: `evals/clip_composition/research/downloads/IMQYaT_RWRA/IMQYaT_RWRA.mp4`
- 保存済み動画の確認結果: 640x360、18.622秒、映像h264、音声aac、約1.1MB

## 現在の作業状態

Git上の未コミット変更:

- `runner/src/steps/composition.ts`
- `evals/`

本体側の制御プレーンへの未コミット変更は確認されていない。

## 次に進める作業

1. 第一候補の切り抜き動画をSTTする
2. 説明欄にある元動画候補をSTTする
3. 切り抜き動画の発話列が元動画内のどこにあるか照合する
4. 対応できた元動画区間を期待区間として固定する
5. 評価fixtureを2件目として追加する
