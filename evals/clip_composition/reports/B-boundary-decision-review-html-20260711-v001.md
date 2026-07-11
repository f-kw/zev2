# B素材 境界確認入力HTML

日付: 2026-07-11

## 目的

B素材 `nOEWCNc77MI` の確認媒体を見ながら人間が回答を入力し、凍結前ガードが直接読めるdecision JSONと、チャットへ返す確認結果を出力する。

## 現物

- 入力HTML: `evals/clip_composition/outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/decision-review.html`
- 元の確認媒体HTML: `evals/clip_composition/outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/index.html`
- decisionテンプレート: `evals/clip_composition/outputs/multiblock-material-human-decision-template-nOEWCNc77MI_multiblock_material_v001-20260710-pre-human-v001.json`
- 生成処理: `evals/clip_composition/build_multiblock_decision_review_html.mjs`

## 入力内容

- 16境界それぞれの切り抜き側の切り替わり
- 16境界それぞれの元配信位置の切り替わり
- 各境界前後の素材対応
- 17素材ブロックの採用・不採用・判定不能
- 確認者、確認日、固定テーマ1行、全体メモ
- 凍結候補として確定する人間の明示チェック

境界回答からブロック状態を埋める機能は入力補助であり、確定操作ではない。17ブロックの採否は人間が最終確認する。

## 出力

- チャットへそのまま貼れる人間確認結果
- `clip_composition_multiblock_material_human_decision` 形式のJSON
- JSONファイル保存

不一致・判定不能・未回答、採用ブロック間の未確定境界、固定テーマ未入力、最終確認未入力を検出した場合は `readyForFreeze=false` にする。

## 機械検証

- 境界入力欄: 16
- ブロック判定欄: 17
- 回答生成・回答コピー・JSONコピー・JSON保存ボタン: 4
- 元HTMLから引き継いだ媒体参照: 448
- 欠落媒体: 0
- 埋め込みJavaScript構文検査: pass
- 元の `index.html` 変更: なし
- fixture/expected書き込み: なし

アプリ内ブラウザーは、ローカルファイルとホスト側localhostへのアクセスを安全制約で拒否したため、そこでの画面操作試験は実施できなかった。別ブラウザーへの自動迂回はしていない。ユーザーがローカルHTMLを開き、実媒体の再生と入力操作を最終確認する。
