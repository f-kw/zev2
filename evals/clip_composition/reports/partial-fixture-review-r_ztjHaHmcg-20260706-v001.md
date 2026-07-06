# 部分fixture 凍結前確認パケット

- 対象: r_ztjHaHmcg
- タイトル: 同接100人いたら食べていけるの？
- 元動画: -DwSCDMCWDQ
- 結果JSON: outputs/partial-fixture-review-r_ztjHaHmcg-20260706-v001.json
- 人間確認テンプレート: outputs/partial-fixture-human-decision-template-r_ztjHaHmcg_partial_material_v001-20260706-v001.json
- 境界確認HTML: evals/clip_composition/outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/index.html

## 結論

- 境界1・3・4・5は人間認定済みの素材切り替わりとして記録した。
- 境界2を含むclip 0:33.504-0:51.810は、単一境界ではなく再分割が必要なunresolved区間として除外した。
- fixture/expectedへの書き込みはしていない。人間確認待ちで停止する。

## 境界定義

- expectedCuts境界: 素材対応の切り替わり点。元動画の別位置へ飛ぶ点だけを境界とし、同一場面内の詰めはinternalGapMs系の注記にする。
- crossfade: crossfadeは素材対応の切り替わりとして扱う。ただし境界点を1フレームに厳密化せず、遷移として確認した事実を注記する。
- 未説明区間: 長い未説明区間は内部詰めに吸収せず、再分割が必要なunresolved区間としてfixtureから除外する。

## 除外区間

| id | clip | source | 理由 |
| --- | --- | --- | --- |
| boundary2_unresolved_clip_33504_51810 | 0:33.504-0:51.810 | 37:21.469-38:34.526 | 人間確認で、境界2-Aは2回切り替わり、境界2-Bも無音だが切り替わっていると判定された。単一の素材境界ではなく再分割が必要なため、部分fixtureから除外する。 |

## 素材ブロック草案

| block | clip | source | words | 品質 | 境界状態 | 注記 |
| ---: | --- | --- | ---: | --- | --- | --- |
| 1 | 0:15.903-0:32.383 | 36:48.172-37:04.490 | 79 | material_block_granularity | clip_review_start / human_recognized_material_switch | source内部詰め候補 1263ms |
| 2 | 0:32.564-0:33.504 | 37:17.847-37:21.469 | 12 | material_block_granularity | human_recognized_material_switch / adjacent_to_unresolved_exclusion | 直後の境界2を含む区間は未解決として除外。block2自体は除外区間の手前までの素材ブロック草案。 |
| 3 | 0:51.810-0:54.271 | 38:34.526-38:36.828 | 20 | material_block_granularity | adjacent_to_unresolved_exclusion / human_recognized_material_switch | 直前の境界2を含む区間は未解決として除外。block3自体は除外区間の後からの素材ブロック草案。 |
| 4 | 0:57.045-1:10.497 | 38:53.847-39:10.553 | 80 | material_block_granularity | human_recognized_material_switch / human_recognized_material_switch | - |
| 5 | 1:11.198-1:24.653 | 39:29.790-39:42.581 | 81 | material_block_granularity | human_recognized_material_switch / human_recognized_material_switch | - |
| 6 | 1:27.475-2:01.147 | 39:59.621-40:40.868 | 193 | material_block_granularity | human_recognized_material_switch / clip_review_end | source内部詰め候補 4628ms。clip内部詰め候補 161ms。高精度サンプルあり |

## 人間確認チェック

- 境界2を含むclip 0:33.504-0:51.810がunresolvedとして除外されていることを確認する。
- 境界1・3・4・5の人間認定内容が、今回のJSON/MDに正しく転記されていることを確認する。
- expectedCutsDraftが素材ブロック粒度であり、高精度サンプルと混同していないことを確認する。
- 部分fixtureとして凍結してよい場合だけ、人間確認テンプレートを埋める。
- 固定テーマはAI生成ではなく、正解区間から人間が逆算して書く。

## 品質等級

- 素材ブロック粒度: 素材の飛びを測る粗い粒度。source/clip範囲内に内部詰めを含みうる。
- 高精度サンプル: 映像・音声で境界を詰めた採点基準。素材ブロック粒度とは別に保持する。

## 本体影響

- runtime/ への書き込みなし
- 本番UI/API/キュー/DBへの変更なし
- fixture/expected への書き込みなし
- confirmedペアの変更なし

