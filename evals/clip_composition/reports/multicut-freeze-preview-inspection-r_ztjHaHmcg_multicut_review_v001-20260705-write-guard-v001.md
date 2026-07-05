# 複数区間fixture凍結preview 構造検査

- 結果JSON: outputs/multicut-freeze-preview-inspection-r_ztjHaHmcg_multicut_review_v001-20260705-write-guard-v001.json
- preview: evals/clip_composition/outputs/multicut-fixture-freeze-preview-r_ztjHaHmcg_multicut_review_v001-20260705-v001.json
- fixture ID: r_ztjHaHmcg_multicut_review_v001
- 構造有効: yes
- fixture書き込み可能: no
- expected未固定: yes
- summary: 凍結previewの構造は有効。固定テーマと人間確認が揃うまでexpectedへは固定しない。

## 検査結果

| status | check | meaning |
| --- | --- | --- |
| pass | preview種別 | 凍結previewとして読めるJSONであることを確認する。 |
| pass | 書き込み先の範囲 | fixture固定時の書き込み先が評価環境内に閉じていることを確認する。 |
| pass | 本体未接続 | preview生成が本番UI、API、キュー、DB、runtimeに触れない前提であることを確認する。 |
| pass | expected未固定 | 人間確認前のpreviewではexpectedやfixtureを書き込まないことを確認する。 |
| pass | 固定ファイル未作成 | 凍結不可のpreviewで、予定されたfixture/expectedファイルが実際には作られていないことを確認する。 |
| pass | fixtureメタデータ | 凍結後にrun_evalがfixture、文字起こし、テーマ候補を読めるメタデータであることを確認する。 |
| pass | 文字起こし構造 | 複数区間の各期待区間に対応する発話まとまりがあり、発話IDが実在することを確認する。 |
| pass | 発話時刻の範囲 | 各発話が対応するexpected区間の中に収まっていることを確認する。 |
| pass | 期待区間構造 | expected草案の区間数、開始終了、composition評価利用状態を確認する。 |
| warn | 固定テーマ | 人間が正解区間から逆算した固定テーマがまだないため、fixture固定前に入力が必要。 |
| pass | preview要約 | 人間向けpreviewの発話数と表示テキストが、内部の文字起こし草案と一致していることを確認する。 |

## 本体影響

- runtime/ への書き込みなし
- 本番UI/API/キュー/DBへの変更なし
- fixtures/ への書き込みなし
- expected/ への書き込みなし
