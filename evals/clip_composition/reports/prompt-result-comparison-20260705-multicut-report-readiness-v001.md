# clip_composition prompt結果比較

- 結果JSON: outputs/prompt-result-comparison-20260705-multicut-report-readiness-v001.json

## 比較方針

- 指定された result.json だけを読み、どのrunを比較しているかを固定する。
- 自動の重み付けや合成スコアは作らず、開始差分、終了差分、重なりの説明をそのまま並べる。
- theme側とcomposition側の暫定判定は、各 result.json に記録された文言をそのまま表示する。

## IMQYaT_RWRA_clip_audio_v001

| prompt | model | cuts | exact | overlap | missing | extra | selected intervals | expected intervals | first start delta | first end delta | cut diffs |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| clip_composition_prompt_v001 | rule-based-build_clip_composition | 1/1 | 1 | 1 | 0 | 0 | 1997050-2015672 | 1997050-2015672 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 18622ms |
| clip_composition_prompt_v001 | rule-based-result-as-external | 1/1 | 1 | 1 | 0 | 0 | 1997050-2015672 | 1997050-2015672 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 18622ms |

### 判定メモ

- clip_composition_prompt_v001: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側の候補選択差分はありません
- clip_composition_prompt_v001: 期待区間1件に対して選択区間1件。 完全一致1件、重なりあり1件。 未選択の期待区間0件、余分な選択区間0件。
- clip_composition_prompt_v001: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側の候補選択差分はありません
- clip_composition_prompt_v001: 期待区間1件に対して選択区間1件。 完全一致1件、重なりあり1件。 未選択の期待区間0件、余分な選択区間0件。

## 読み取り

- 差分が0msのrunは、指定された期待区間と一致している。
- cuts列は、選択区間数/期待区間数を表す。
- selected intervalsとexpected intervalsは、複数区間expectedの場合に全区間を順番に表示する。
- cut diffsは、各区間の開始差分、終了差分、重なりを順番に表示する。
- missingは期待区間に対応する選択区間がない件数、extraは期待区間に対応しない選択区間の件数を表す。
- 終了差分がマイナスのrunは期待区間より短く、プラスのrunは期待区間より長い。
- どちらが良いかは、この表だけで自動決定せず、対応するsummaryと境界粒度レポートを見て判断する。
