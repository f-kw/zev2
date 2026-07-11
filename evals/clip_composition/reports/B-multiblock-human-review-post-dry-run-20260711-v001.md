# B素材 人間確認とpost-human dry-run

日付: 2026-07-11

## 人間確認結果

- 確認者: kawafmm
- 固定テーマ: `マリンところねRaftで船を作る`
- 採用block: 1, 3, 4, 6, 7, 8, 9, 10, 11, 13, 14, 15, 17
- 不採用block: 2, 5, 12, 16
- 不採用理由: 各blockへ入る境目の前側で、切り抜きと元配信が同じ素材ではなかった
- fixture/expected実書き込み: なし

確認2の前側は、近い時刻ではあるが一致していないとの人間メモを保持する。

## 境目の記録方法

人間が問題なしと確認した境目でも、片側のblockが不採用ならfixtureの境目としては使わない。人間観察はdecision JSONの `humanObservation` に残し、凍結時の扱いだけを `excluded_with_rejected_adjacent_block` とした。

- fixtureで採用する境目: 3, 6, 7, 8, 9, 10, 13, 14
- fixture対象外の境目: 1, 2, 4, 5, 11, 12, 15, 16

## post-human dry-run

- 判定エラー: 0
- fixture書き込み可能: yes
- expectedCuts draft: 13
- 除外範囲 draft: 4
- transcript draft: 739 STT区間
- 固定テーマ反映: pass
- fixture/expected書き込み実行: no

## 現物

- 人間回答: `evals/clip_composition/outputs/boundary-review-responses/nOEWCNc77MI/nOEWCNc77MI-multiblock-human-review-20260711-v001.json`
- 凍結用decision: `evals/clip_composition/outputs/boundary-review-responses/nOEWCNc77MI/nOEWCNc77MI-multiblock-human-decision-20260711-v001.json`
- dry-run結果: `evals/clip_composition/outputs/multiblock-material-fixture-freeze-preview-nOEWCNc77MI_multiblock_material_v001-20260711-post-human-dry-run-v001.json`

次は人間がこの13採用・4除外を確認し、実凍結を承認した場合だけfixture/expectedへ書き込む。
