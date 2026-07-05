# 複数区間expected 人間確認JSON検査

- 結果JSON: outputs/multicut-human-decision-inspection-r_ztjHaHmcg_multicut_review_v001-20260705-v001.json
- decision: evals/clip_composition/outputs/multicut-human-decision-template-r_ztjHaHmcg_multicut_review_v001-20260705-v001.json
- ready for freeze: no
- issues: 9

## 検査結果

| status | check | meaning |
| --- | --- | --- |
| fail | 確認状態 | 全チャンクを人間が確認したと明示しているかを確認する。 |
| fail | 固定テーマ | 正解区間から人間が逆算した固定テーマが入力されているかを確認する。 |
| fail | チャンク対応 | 確認JSONのchunk件数と番号がexpected草案に対応しているかを確認する。 |
| pass | 時刻対応 | 確認JSONに時刻範囲がある場合、expected草案の時刻と一致しているかを確認する。 |

## 問題

- humanConfirmation.allChunksConfirmed が true ではありません
- humanConfirmation.checkedBy が未入力です
- humanConfirmation.checkedAt が未入力です
- fixedTheme.title が未入力です
- fixedTheme.summary が未入力です
- chunk 1 が confirmed ではありません: pending
- chunk 2 が confirmed ではありません: pending
- chunk 3 が confirmed ではありません: pending
- chunk 4 が confirmed ではありません: pending

## 固定可能になった後のコマンド

```bash
runner/node_modules/.bin/tsx evals/clip_composition/freeze_multicut_review_fixture.ts \
  --review evals/clip_composition/outputs/multicut-expected-review-r_ztjHaHmcg-20260705-v001.json \
  --target evals/clip_composition/stt-targets/r_ztjHaHmcg.json \
  --sourceSttId r_ztjHaHmcg_-DwSCDMCWDQ_youtube_auto \
  --decision evals/clip_composition/outputs/multicut-human-decision-template-r_ztjHaHmcg_multicut_review_v001-20260705-v001.json \
  --writeFixture true \
  --outputId 20260705-v001
```

## 本体影響

- runtime/ への書き込みなし
- fixtures/ への書き込みなし
- expected/ への書き込みなし
