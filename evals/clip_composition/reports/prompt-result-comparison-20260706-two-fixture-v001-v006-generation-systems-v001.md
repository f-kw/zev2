# clip_composition prompt結果比較

- 結果JSON: outputs/prompt-result-comparison-20260706-two-fixture-v001-v006-generation-systems-v001.json

## 比較方針

- 指定された result.json だけを読み、どのrunを比較しているかを固定する。
- 自動の重み付けや合成スコアは作らず、開始差分、終了差分、重なりの説明をそのまま並べる。
- theme側とcomposition側の暫定判定は、各 result.json に記録された文言をそのまま表示する。

## r_ztjHaHmcg_partial_material_v001

| system | generator | prompt label | model | cuts | exact | overlap | missing | extra | selected intervals | expected intervals | first start delta | first end delta | cut diffs |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| baseline-rule (legacy inferred) | runner.buildClipComposition | clip_composition_prompt_v001 | rule-based-build_clip_composition | 6/6 | 6 | 6 | 0 | 0 | 2208172-2224490<br>2237847-2241469<br>2314526-2316828<br>2333847-2350553<br>2369790-2382581<br>2399621-2440868 | 2208172-2224490<br>2237847-2241469<br>2314526-2316828<br>2333847-2350553<br>2369790-2382581<br>2399621-2440868 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 16318ms<br>2:compared / 開始 0ms / 終了 0ms / 重なり 3622ms<br>3:compared / 開始 0ms / 終了 0ms / 重なり 2302ms<br>4:compared / 開始 0ms / 終了 0ms / 重なり 16706ms<br>5:compared / 開始 0ms / 終了 0ms / 重なり 12791ms<br>6:compared / 開始 0ms / 終了 0ms / 重なり 41247ms |
| baseline-rule (legacy inferred) | runner.buildClipComposition | clip_composition_prompt_v002 | rule-based-build_clip_composition | 6/6 | 6 | 6 | 0 | 0 | 2208172-2224490<br>2237847-2241469<br>2314526-2316828<br>2333847-2350553<br>2369790-2382581<br>2399621-2440868 | 2208172-2224490<br>2237847-2241469<br>2314526-2316828<br>2333847-2350553<br>2369790-2382581<br>2399621-2440868 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 16318ms<br>2:compared / 開始 0ms / 終了 0ms / 重なり 3622ms<br>3:compared / 開始 0ms / 終了 0ms / 重なり 2302ms<br>4:compared / 開始 0ms / 終了 0ms / 重なり 16706ms<br>5:compared / 開始 0ms / 終了 0ms / 重なり 12791ms<br>6:compared / 開始 0ms / 終了 0ms / 重なり 41247ms |
| baseline-rule (legacy inferred) | runner.buildClipComposition | clip_composition_prompt_v003 | rule-based-build_clip_composition | 6/6 | 6 | 6 | 0 | 0 | 2208172-2224490<br>2237847-2241469<br>2314526-2316828<br>2333847-2350553<br>2369790-2382581<br>2399621-2440868 | 2208172-2224490<br>2237847-2241469<br>2314526-2316828<br>2333847-2350553<br>2369790-2382581<br>2399621-2440868 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 16318ms<br>2:compared / 開始 0ms / 終了 0ms / 重なり 3622ms<br>3:compared / 開始 0ms / 終了 0ms / 重なり 2302ms<br>4:compared / 開始 0ms / 終了 0ms / 重なり 16706ms<br>5:compared / 開始 0ms / 終了 0ms / 重なり 12791ms<br>6:compared / 開始 0ms / 終了 0ms / 重なり 41247ms |
| baseline-rule (legacy inferred) | runner.buildClipComposition | clip_composition_prompt_v004 | rule-based-build_clip_composition | 6/6 | 6 | 6 | 0 | 0 | 2208172-2224490<br>2237847-2241469<br>2314526-2316828<br>2333847-2350553<br>2369790-2382581<br>2399621-2440868 | 2208172-2224490<br>2237847-2241469<br>2314526-2316828<br>2333847-2350553<br>2369790-2382581<br>2399621-2440868 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 16318ms<br>2:compared / 開始 0ms / 終了 0ms / 重なり 3622ms<br>3:compared / 開始 0ms / 終了 0ms / 重なり 2302ms<br>4:compared / 開始 0ms / 終了 0ms / 重なり 16706ms<br>5:compared / 開始 0ms / 終了 0ms / 重なり 12791ms<br>6:compared / 開始 0ms / 終了 0ms / 重なり 41247ms |
| baseline-rule (legacy inferred) | runner.buildClipComposition | clip_composition_prompt_v005 | rule-based-build_clip_composition | 6/6 | 6 | 6 | 0 | 0 | 2208172-2224490<br>2237847-2241469<br>2314526-2316828<br>2333847-2350553<br>2369790-2382581<br>2399621-2440868 | 2208172-2224490<br>2237847-2241469<br>2314526-2316828<br>2333847-2350553<br>2369790-2382581<br>2399621-2440868 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 16318ms<br>2:compared / 開始 0ms / 終了 0ms / 重なり 3622ms<br>3:compared / 開始 0ms / 終了 0ms / 重なり 2302ms<br>4:compared / 開始 0ms / 終了 0ms / 重なり 16706ms<br>5:compared / 開始 0ms / 終了 0ms / 重なり 12791ms<br>6:compared / 開始 0ms / 終了 0ms / 重なり 41247ms |
| baseline-rule (legacy inferred) | runner.buildClipComposition | clip_composition_prompt_v006 | rule-based-build_clip_composition | 6/6 | 6 | 6 | 0 | 0 | 2208172-2224490<br>2237847-2241469<br>2314526-2316828<br>2333847-2350553<br>2369790-2382581<br>2399621-2440868 | 2208172-2224490<br>2237847-2241469<br>2314526-2316828<br>2333847-2350553<br>2369790-2382581<br>2399621-2440868 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 16318ms<br>2:compared / 開始 0ms / 終了 0ms / 重なり 3622ms<br>3:compared / 開始 0ms / 終了 0ms / 重なり 2302ms<br>4:compared / 開始 0ms / 終了 0ms / 重なり 16706ms<br>5:compared / 開始 0ms / 終了 0ms / 重なり 12791ms<br>6:compared / 開始 0ms / 終了 0ms / 重なり 41247ms |

### 判定メモ

- baseline-rule / clip_composition_prompt_v001: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側の候補選択差分はありません
- baseline-rule / clip_composition_prompt_v001: 期待区間6件に対して選択区間6件。 完全一致6件、重なりあり6件。 未選択の期待区間0件、余分な選択区間0件。
- baseline-rule / clip_composition_prompt_v002: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側の候補選択差分はありません
- baseline-rule / clip_composition_prompt_v002: 期待区間6件に対して選択区間6件。 完全一致6件、重なりあり6件。 未選択の期待区間0件、余分な選択区間0件。
- baseline-rule / clip_composition_prompt_v003: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側の候補選択差分はありません
- baseline-rule / clip_composition_prompt_v003: 期待区間6件に対して選択区間6件。 完全一致6件、重なりあり6件。 未選択の期待区間0件、余分な選択区間0件。
- baseline-rule / clip_composition_prompt_v004: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側の候補選択差分はありません
- baseline-rule / clip_composition_prompt_v004: 期待区間6件に対して選択区間6件。 完全一致6件、重なりあり6件。 未選択の期待区間0件、余分な選択区間0件。
- baseline-rule / clip_composition_prompt_v005: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側の候補選択差分はありません
- baseline-rule / clip_composition_prompt_v005: 期待区間6件に対して選択区間6件。 完全一致6件、重なりあり6件。 未選択の期待区間0件、余分な選択区間0件。
- baseline-rule / clip_composition_prompt_v006: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側の候補選択差分はありません
- baseline-rule / clip_composition_prompt_v006: 期待区間6件に対して選択区間6件。 完全一致6件、重なりあり6件。 未選択の期待区間0件、余分な選択区間0件。

## UpRyakf5j80_clip_audio_v001

| system | generator | prompt label | model | cuts | exact | overlap | missing | extra | selected intervals | expected intervals | first start delta | first end delta | cut diffs |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| baseline-rule (legacy inferred) | runner.buildClipComposition | clip_composition_prompt_v001 | rule-based-build_clip_composition | 1/1 | 0 | 1 | 0 | 0 | 11362439-11409170 | 11364500-11407178 | -2061ms | +1992ms | 1:compared / 開始 -2061ms / 終了 +1992ms / 重なり 42678ms |
| baseline-rule (legacy inferred) | runner.buildClipComposition | clip_composition_prompt_v002 | rule-based-build_clip_composition | 1/1 | 0 | 1 | 0 | 0 | 11362439-11409170 | 11364500-11407178 | -2061ms | +1992ms | 1:compared / 開始 -2061ms / 終了 +1992ms / 重なり 42678ms |
| baseline-rule (legacy inferred) | runner.buildClipComposition | clip_composition_prompt_v003 | rule-based-build_clip_composition | 1/1 | 0 | 1 | 0 | 0 | 11362439-11409170 | 11364500-11407178 | -2061ms | +1992ms | 1:compared / 開始 -2061ms / 終了 +1992ms / 重なり 42678ms |
| baseline-rule (legacy inferred) | runner.buildClipComposition | clip_composition_prompt_v004 | rule-based-build_clip_composition | 1/1 | 0 | 1 | 0 | 0 | 11362439-11409170 | 11364500-11407178 | -2061ms | +1992ms | 1:compared / 開始 -2061ms / 終了 +1992ms / 重なり 42678ms |
| baseline-rule (legacy inferred) | runner.buildClipComposition | clip_composition_prompt_v005 | rule-based-build_clip_composition | 1/1 | 0 | 1 | 0 | 0 | 11362439-11409170 | 11364500-11407178 | -2061ms | +1992ms | 1:compared / 開始 -2061ms / 終了 +1992ms / 重なり 42678ms |
| baseline-rule (legacy inferred) | runner.buildClipComposition | clip_composition_prompt_v006 | rule-based-build_clip_composition | 1/1 | 0 | 1 | 0 | 0 | 11362439-11409170 | 11364500-11407178 | -2061ms | +1992ms | 1:compared / 開始 -2061ms / 終了 +1992ms / 重なり 42678ms |

### 判定メモ

- baseline-rule / clip_composition_prompt_v001: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- baseline-rule / clip_composition_prompt_v001: 期待区間1件に対して選択区間1件。 完全一致0件、重なりあり1件。 未選択の期待区間0件、余分な選択区間0件。
- baseline-rule / clip_composition_prompt_v002: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- baseline-rule / clip_composition_prompt_v002: 期待区間1件に対して選択区間1件。 完全一致0件、重なりあり1件。 未選択の期待区間0件、余分な選択区間0件。
- baseline-rule / clip_composition_prompt_v003: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- baseline-rule / clip_composition_prompt_v003: 期待区間1件に対して選択区間1件。 完全一致0件、重なりあり1件。 未選択の期待区間0件、余分な選択区間0件。
- baseline-rule / clip_composition_prompt_v004: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- baseline-rule / clip_composition_prompt_v004: 期待区間1件に対して選択区間1件。 完全一致0件、重なりあり1件。 未選択の期待区間0件、余分な選択区間0件。
- baseline-rule / clip_composition_prompt_v005: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- baseline-rule / clip_composition_prompt_v005: 期待区間1件に対して選択区間1件。 完全一致0件、重なりあり1件。 未選択の期待区間0件、余分な選択区間0件。
- baseline-rule / clip_composition_prompt_v006: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- baseline-rule / clip_composition_prompt_v006: 期待区間1件に対して選択区間1件。 完全一致0件、重なりあり1件。 未選択の期待区間0件、余分な選択区間0件。

## 読み取り

- 差分が0msのrunは、指定された期待区間と一致している。
- cuts列は、選択区間数/期待区間数を表す。
- selected intervalsとexpected intervalsは、複数区間expectedの場合に全区間を順番に表示する。
- cut diffsは、各区間の開始差分、終了差分、重なりを順番に表示する。
- missingは期待区間に対応する選択区間がない件数、extraは期待区間に対応しない選択区間の件数を表す。
- 終了差分がマイナスのrunは期待区間より短く、プラスのrunは期待区間より長い。
- どちらが良いかは、この表だけで自動決定せず、対応するsummaryと境界粒度レポートを見て判断する。
- system列がbaseline-ruleの場合、区間を生成したのはルール処理であり、prompt labelは比較用ラベルにすぎない。
- system列がllm-vNNNの場合、区間を生成したのはWeb Geminiと該当プロンプト版である。
