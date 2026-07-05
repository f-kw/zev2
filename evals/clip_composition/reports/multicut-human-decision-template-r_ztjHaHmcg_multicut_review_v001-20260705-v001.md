# 複数区間expected 人間確認テンプレート

- 結果JSON: outputs/multicut-human-decision-template-r_ztjHaHmcg_multicut_review_v001-20260705-v001.json
- 対象: r_ztjHaHmcg
- fixture ID: r_ztjHaHmcg_multicut_review_v001

## 入力すること

- 4つのchunk.statusを `confirmed` にする。
- `humanConfirmation.allChunksConfirmed` を `true` にする。
- `fixedTheme.title` と `fixedTheme.summary` を人間が書く。

## 確認対象

| part | clip | source | video | current |
| ---: | --- | --- | --- | --- |
| 1 | 0:02.555-0:32.555 | 36:19.930-36:49.930 | evals/clip_composition/outputs/visual-check/r_ztjHaHmcg/multicut_r_ztjHaHmcg_20260705-v001_chunk01.mp4 | pending |
| 2 | 0:32.555-1:02.555 | 38:29.360-38:59.360 | evals/clip_composition/outputs/visual-check/r_ztjHaHmcg/multicut_r_ztjHaHmcg_20260705-v001_chunk02.mp4 | pending |
| 3 | 1:02.555-1:32.555 | 39:21.159-39:51.159 | evals/clip_composition/outputs/visual-check/r_ztjHaHmcg/multicut_r_ztjHaHmcg_20260705-v001_chunk03.mp4 | pending |
| 4 | 1:32.555-2:01.147 | 40:04.730-40:33.322 | evals/clip_composition/outputs/visual-check/r_ztjHaHmcg/multicut_r_ztjHaHmcg_20260705-v001_chunk04.mp4 | pending |

## 入力後の凍結コマンド

```bash
runner/node_modules/.bin/tsx evals/clip_composition/freeze_multicut_review_fixture.ts \
  --review evals/clip_composition/outputs/multicut-expected-review-r_ztjHaHmcg-20260705-v001.json \
  --target evals/clip_composition/stt-targets/r_ztjHaHmcg.json \
  --sourceSttId r_ztjHaHmcg_-DwSCDMCWDQ_youtube_auto \
  --decision <this JSON path> \
  --writeFixture true \
  --outputId 20260705-v001
```

## 本体影響

- このテンプレート生成ではruntime/、fixtures/、expected/へ書き込まない。

