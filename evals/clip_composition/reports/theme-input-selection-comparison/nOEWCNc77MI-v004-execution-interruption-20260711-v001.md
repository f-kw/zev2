# input-selection-v004 実走中断記録

> 2026-07-11追記: この中断後、保存済み16窓から再開し、37窓すべてを完了した。正式採点結果は `nOEWCNc77MI-v004-execution-and-score-20260711-v001.md` を正とする。本書は中断時点の履歴として残す。

## 現在地

- 入力選定: `input-selection-v004`。チャット流速上位100分。
- 生成系統: `theme-llm-v002@gemini-web-flash`。
- run: 1。
- 生成窓: 37窓。
- 完全保存済み: window 1–16の16窓。
- 未完: window 17–37の21窓。
- 次の再開位置: `window_17_YE-faluP7zY`。
- run全体の統合出力: 未生成。
- 正式範囲hit採点: 未実施。
- v002/v003/v004効率比較: 未実施。

欠落21窓を無視した暫定統合・暫定採点は行わない。

## 停止理由

window 17は、Edge上のWeb Geminiへ同じ完全プロンプトを送信したが、以下の両方でJSON生成途中のまま完結しなかった。

1. 通常ランナーで最大10分待機。
2. タブを閉じない直接実行で最大20分待機。

20分後の診断でも`stillRunning: true`で、回答は1候補目の`evidenceRanges`直前までの201文字しか得られていない。拒否、認証切れ、CDP切断ではなく、Web Gemini画面上の継続生成が完結しない状態。

途中JSONは`not_usable_for_scoring_or_human_review`として診断保存し、正式候補には含めていない。

## 完全性を守った処理

- 各窓は完全な`themes`配列を検証できた場合だけ保存。
- 保存済み窓は再開時に再検証してskip。
- 途中切れ・生成中の回答は診断ファイルへ分離。
- 37窓がすべて揃うまでrun全体を統合しない。
- 統合出力がない状態で採点器を実行しない。

## 入力と単変数条件

- source-only選択計画: 100個の完全な1分区間、合計6,000,000ms。
- 入力可視性: 12/13。入力外はexpected 10 / block 13だけ。
- v003 missはexpected 11 / block 14であり、入力外expected 10とは別区間。
- v004の入力可視性上限は12/13。
- リーク検査: 全体入力1件＋37窓の38/38 pass。
- v003と入力発話以外のmodelInputは完全一致。
- プロンプト、モデル、1窓候補上限、byte上限、窓間重複、境界補完、統合規則、採点器はv003から変更していない。
- 取得安定化のため待機上限を5分から10分、最後に20分へ延長したが、モデル入力・生成条件・出力採否条件は変更していない。

## 再開条件と手順

Web Geminiの継続生成異常が解消した時点で、同じbundle・同じrun 1を再実行する。保存済みwindow 1–16を検証してskipし、window 17から再開する。

37窓完了後にのみ、次を実行する。

1. 既存規則で37窓を機械統合。
2. `input-selection-v004`・`formal-primary`として三分類付き正式採点。
3. v002/v003/v004を候補総数、根拠範囲和集合カバー率、入力内hit/候補数、全expected hit/候補数で比較。
4. 台帳の状態を「実走中断」から実測結果へ更新。

## 証拠

- 実走bundle: `outputs/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001`
- 進捗: 同bundleの`run-01-execution-progress.json`
- window 17診断: 同bundleの`windows/run-01-window_17_YE-faluP7zY-gemini-output.json.failure.json`
- 実走前上限確認: `reports/theme-input-selection-comparison/nOEWCNc77MI-v004-pre-run-ceiling-20260711-v001.md`
- source-only選択計画: `outputs/chat-velocity-analysis/nOEWCNc77MI-input-selection-v004-chat-top100-plan.json`
