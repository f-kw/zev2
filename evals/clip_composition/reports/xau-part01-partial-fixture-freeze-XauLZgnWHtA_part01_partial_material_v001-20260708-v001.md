# XauLZgnWHtA前半 部分fixture凍結結果

- 結果JSON: evals/clip_composition/outputs/xau-part01-partial-fixture-freeze-XauLZgnWHtA_part01_partial_material_v001-20260708-v001.json
- fixture ID: XauLZgnWHtA_part01_partial_material_v001
- 書き込み実行: yes
- expectedCuts: 6
- excludedClipRanges: 4
- excludedRanges: 1
- 固定テーマ: 4. 【2023年6月①週】10分でわかる先週のにじさんじ爆笑シーンまとめ / 前半 0:00-7:05

## 採用した素材ブロック

| part | block | 章 | 元配信 | clip | source | 対応語数 |
| ---: | ---: | --- | --- | --- | --- | ---: |
| 1 | 1 | 逆凸遊戯王 | OJoi31bq8lk | 0:34.928-0:44.633 | 7:20.672-7:30.696 | 61 |
| 2 | 2 | スタッフと相談 | O4ryDQBcMDc | 1:09.013-1:28.720 | 30:09.559-30:29.518 | 43 |
| 3 | 3 | 変態女装おじさん | vWv9H-hfHXo | 2:30.510-2:46.177 | 124:38.079-125:00.512 | 75 |
| 4 | 4 | 拍手の音 | Lw_FdQPTOs8 | 3:42.589-3:45.071 | 57:12.777-57:14.438 | 28 |
| 5 | 5 | 実装から2年 朝4時 | hKVrBcgAIpQ | 4:36.055-4:44.437 | 90:27.822-90:36.145 | 44 |
| 6 | 6 | 取りたい資格 | CwmyZc3eskQ | 4:47.017-4:49.838 | 67:29.549-67:32.650 | 22 |

## 人間確認と境界精度

- 確認者: kawafmm
- 確認日: 2026-07-08
- 採用6ブロックの素材対応: 全ブロック正しい
- 境界精度: 素材ブロック粒度
- 測定限界: ±1秒未満の差分は測定限界内として扱う

## 除外したclip範囲

| id | 章 | clip | 理由 |
| --- | --- | --- | --- |
| unresolved_volume_warning_clip_115000_148000 | ※音量注意 | 1:55.000-2:28.000 | 切り抜き側STTが再取得後も0語で、比較先が見つかっていない。人間が判断できる材料ではないため、採点対象外にする。 |
| unresolved_pants_group_clip_176000_221000 | パンツ集団 | 2:56.000-3:41.000 | STTはあるが、章全体を素材ブロックとして確定できる連続対応がない。短い一致候補は章全体の確定証拠ではないため、採点対象外にする。 |
| unresolved_two_people_room_clip_382000_425000 | 部屋に2人きり | 6:22.000-7:05.000 | STTはあるが、章全体を素材ブロックとして確定できる連続対応がない。短い一致候補は章全体の確定証拠ではないため、採点対象外にする。 |
| false_positive_block_7_oyAW0m4FtXE_clip_370571_371591 | 空飛ぶ女神 | 6:10.571-6:11.591 | 人間判定で違う素材とされたため、採点対象外にする。 |

## 本体影響

- runtime/ への書き込みなし
- 本番UI/API/キュー/DBへの変更なし
- evals/clip_composition/fixtures と expected だけにfixtureを固定

## baseline-rule 検証

- 実行結果: `evals/clip_composition/outputs/XauLZgnWHtA_part01_partial_material_v001/clip_composition_prompt_baseline-rule/20260708-102845/result.json`
- summary: `evals/clip_composition/reports/XauLZgnWHtA_part01_partial_material_v001/clip_composition_prompt_baseline-rule/20260708-102845/summary.md`
- 結果: 期待区間6件に対して選択区間6件。完全一致6件、重なりあり6件。未選択の期待区間0件、余分な選択区間0件。
- 揺れ幅: 1回実行のため開始0ms、終了0ms。
