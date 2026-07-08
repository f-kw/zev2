# clip_composition prompt結果比較

- 結果JSON: outputs/prompt-result-comparison-20260708-four-fixture-v010-v011-v012-baseline-v001.json

## 比較方針

- 指定された result.json だけを読み、どのrunを比較しているかを固定する。
- 自動の重み付けや合成スコアは作らず、開始差分、終了差分、重なりの説明をそのまま並べる。
- theme側とcomposition側の暫定判定は、各 result.json に記録された文言をそのまま表示する。

## aX-axQMWR3c_single_material_v001

| system | generator | prompt label | model | cuts | exact | overlap | missing | extra | selected intervals | expected intervals | first start delta | first end delta | cut diffs |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| llm-v010 | web-gemini+prompt | clip_composition_prompt_v010 | gemini-web-flash | 1/1 | 1 | 1 | 0 | 0 | 4922443-5056495 | 4922443-5056495 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 134052ms |
| llm-v010 | web-gemini+prompt | clip_composition_prompt_v010 | gemini-web-flash | 1/1 | 1 | 1 | 0 | 0 | 4922443-5056495 | 4922443-5056495 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 134052ms |
| llm-v010 | web-gemini+prompt | clip_composition_prompt_v010 | gemini-web-flash | 1/1 | 1 | 1 | 0 | 0 | 4922443-5056495 | 4922443-5056495 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 134052ms |
| llm-v011 | web-gemini+prompt | clip_composition_prompt_v011 | gemini-web-flash | 1/1 | 1 | 1 | 0 | 0 | 4922443-5056495 | 4922443-5056495 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 134052ms |
| llm-v011 | web-gemini+prompt | clip_composition_prompt_v011 | gemini-web-flash | 1/1 | 1 | 1 | 0 | 0 | 4922443-5056495 | 4922443-5056495 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 134052ms |
| llm-v011 | web-gemini+prompt | clip_composition_prompt_v011 | gemini-web-flash | 1/1 | 1 | 1 | 0 | 0 | 4922443-5056495 | 4922443-5056495 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 134052ms |
| llm-v012 | web-gemini+prompt | clip_composition_prompt_v012 | gemini-web-flash | 1/1 | 1 | 1 | 0 | 0 | 4922443-5056495 | 4922443-5056495 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 134052ms |
| llm-v012 | web-gemini+prompt | clip_composition_prompt_v012 | gemini-web-flash | 1/1 | 1 | 1 | 0 | 0 | 4922443-5056495 | 4922443-5056495 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 134052ms |
| llm-v012 | web-gemini+prompt | clip_composition_prompt_v012 | gemini-web-flash | 1/1 | 1 | 1 | 0 | 0 | 4922443-5056495 | 4922443-5056495 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 134052ms |
| baseline-rule | runner.buildClipComposition | baseline-rule | baseline-rule | 1/1 | 1 | 1 | 0 | 0 | 4922443-5056495 | 4922443-5056495 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 134052ms |

### 判定メモ

- llm-v010 / clip_composition_prompt_v010: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側の候補選択差分はありません
- llm-v010 / clip_composition_prompt_v010: 期待区間1件に対して選択区間1件。完全一致1件、重なりあり1件。
- llm-v010 / clip_composition_prompt_v010: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側の候補選択差分はありません
- llm-v010 / clip_composition_prompt_v010: 期待区間1件に対して選択区間1件。完全一致1件、重なりあり1件。
- llm-v010 / clip_composition_prompt_v010: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側の候補選択差分はありません
- llm-v010 / clip_composition_prompt_v010: 期待区間1件に対して選択区間1件。完全一致1件、重なりあり1件。
- llm-v011 / clip_composition_prompt_v011: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側の候補選択差分はありません
- llm-v011 / clip_composition_prompt_v011: 期待区間1件に対して選択区間1件。完全一致1件、重なりあり1件。
- llm-v011 / clip_composition_prompt_v011: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側の候補選択差分はありません
- llm-v011 / clip_composition_prompt_v011: 期待区間1件に対して選択区間1件。完全一致1件、重なりあり1件。
- llm-v011 / clip_composition_prompt_v011: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側の候補選択差分はありません
- llm-v011 / clip_composition_prompt_v011: 期待区間1件に対して選択区間1件。完全一致1件、重なりあり1件。
- llm-v012 / clip_composition_prompt_v012: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側の候補選択差分はありません
- llm-v012 / clip_composition_prompt_v012: 期待区間1件に対して選択区間1件。完全一致1件、重なりあり1件。
- llm-v012 / clip_composition_prompt_v012: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側の候補選択差分はありません
- llm-v012 / clip_composition_prompt_v012: 期待区間1件に対して選択区間1件。完全一致1件、重なりあり1件。
- llm-v012 / clip_composition_prompt_v012: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側の候補選択差分はありません
- llm-v012 / clip_composition_prompt_v012: 期待区間1件に対して選択区間1件。完全一致1件、重なりあり1件。
- baseline-rule / baseline-rule: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側の候補選択差分はありません
- baseline-rule / baseline-rule: 期待区間1件に対して選択区間1件。完全一致1件、重なりあり1件。

## r_ztjHaHmcg_partial_material_v001

| system | generator | prompt label | model | cuts | exact | overlap | missing | extra | selected intervals | expected intervals | first start delta | first end delta | cut diffs |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| llm-v010 | web-gemini+prompt | clip_composition_prompt_v010 | gemini-web-flash | 4/6 | 3 | 5 | 1 | 0 | 2208172-2224490<br>2314526-2350553<br>2369790-2382581<br>2399621-2440868 | 2208172-2224490<br>2237847-2241469<br>2314526-2316828<br>2333847-2350553<br>2369790-2382581<br>2399621-2440868 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 16318ms<br>2:missing_selected_cut / 開始 比較不可 / 終了 比較不可 / 重なり 0ms<br>3:compared / 開始 0ms / 終了 +33725ms / 重なり 2302ms<br>4:compared / 開始 -19321ms / 終了 0ms / 重なり 16706ms<br>5:compared / 開始 0ms / 終了 0ms / 重なり 12791ms<br>6:compared / 開始 0ms / 終了 0ms / 重なり 41247ms |
| llm-v010 | web-gemini+prompt | clip_composition_prompt_v010 | gemini-web-flash | 5/6 | 5 | 5 | 1 | 0 | 2208172-2224490<br>2314526-2316828<br>2333847-2350553<br>2369790-2382581<br>2399621-2440868 | 2208172-2224490<br>2237847-2241469<br>2314526-2316828<br>2333847-2350553<br>2369790-2382581<br>2399621-2440868 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 16318ms<br>2:missing_selected_cut / 開始 比較不可 / 終了 比較不可 / 重なり 0ms<br>3:compared / 開始 0ms / 終了 0ms / 重なり 2302ms<br>4:compared / 開始 0ms / 終了 0ms / 重なり 16706ms<br>5:compared / 開始 0ms / 終了 0ms / 重なり 12791ms<br>6:compared / 開始 0ms / 終了 0ms / 重なり 41247ms |
| llm-v010 | web-gemini+prompt | clip_composition_prompt_v010 | gemini-web-flash | 3/6 | 2 | 3 | 3 | 0 | 2208172-2224350<br>2314526-2316828<br>2333847-2350553 | 2208172-2224490<br>2237847-2241469<br>2314526-2316828<br>2333847-2350553<br>2369790-2382581<br>2399621-2440868 | 0ms | -140ms | 1:compared / 開始 0ms / 終了 -140ms / 重なり 16178ms<br>2:missing_selected_cut / 開始 比較不可 / 終了 比較不可 / 重なり 0ms<br>3:compared / 開始 0ms / 終了 0ms / 重なり 2302ms<br>4:compared / 開始 0ms / 終了 0ms / 重なり 16706ms<br>5:missing_selected_cut / 開始 比較不可 / 終了 比較不可 / 重なり 0ms<br>6:missing_selected_cut / 開始 比較不可 / 終了 比較不可 / 重なり 0ms |
| llm-v011 | web-gemini+prompt | clip_composition_prompt_v011 | gemini-web-flash | 4/6 | 3 | 5 | 1 | 0 | 2208172-2224490<br>2314526-2350553<br>2369790-2382581<br>2399621-2440868 | 2208172-2224490<br>2237847-2241469<br>2314526-2316828<br>2333847-2350553<br>2369790-2382581<br>2399621-2440868 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 16318ms<br>2:missing_selected_cut / 開始 比較不可 / 終了 比較不可 / 重なり 0ms<br>3:compared / 開始 0ms / 終了 +33725ms / 重なり 2302ms<br>4:compared / 開始 -19321ms / 終了 0ms / 重なり 16706ms<br>5:compared / 開始 0ms / 終了 0ms / 重なり 12791ms<br>6:compared / 開始 0ms / 終了 0ms / 重なり 41247ms |
| llm-v011 | web-gemini+prompt | clip_composition_prompt_v011 | gemini-web-flash | 5/6 | 5 | 5 | 1 | 0 | 2208172-2224490<br>2314526-2316828<br>2333847-2350553<br>2369790-2382581<br>2399621-2440868 | 2208172-2224490<br>2237847-2241469<br>2314526-2316828<br>2333847-2350553<br>2369790-2382581<br>2399621-2440868 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 16318ms<br>2:missing_selected_cut / 開始 比較不可 / 終了 比較不可 / 重なり 0ms<br>3:compared / 開始 0ms / 終了 0ms / 重なり 2302ms<br>4:compared / 開始 0ms / 終了 0ms / 重なり 16706ms<br>5:compared / 開始 0ms / 終了 0ms / 重なり 12791ms<br>6:compared / 開始 0ms / 終了 0ms / 重なり 41247ms |
| llm-v011 | web-gemini+prompt | clip_composition_prompt_v011 | gemini-web-flash | 4/6 | 2 | 5 | 1 | 0 | 2208172-2224490<br>2314526-2350553<br>2369790-2382501<br>2399621-2440868 | 2208172-2224490<br>2237847-2241469<br>2314526-2316828<br>2333847-2350553<br>2369790-2382581<br>2399621-2440868 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 16318ms<br>2:missing_selected_cut / 開始 比較不可 / 終了 比較不可 / 重なり 0ms<br>3:compared / 開始 0ms / 終了 +33725ms / 重なり 2302ms<br>4:compared / 開始 -19321ms / 終了 0ms / 重なり 16706ms<br>5:compared / 開始 0ms / 終了 -80ms / 重なり 12711ms<br>6:compared / 開始 0ms / 終了 0ms / 重なり 41247ms |
| llm-v012 | web-gemini+prompt | clip_composition_prompt_v012 | gemini-web-flash | 4/6 | 4 | 4 | 2 | 0 | 2208172-2224490<br>2314526-2316828<br>2333847-2350553<br>2399621-2440868 | 2208172-2224490<br>2237847-2241469<br>2314526-2316828<br>2333847-2350553<br>2369790-2382581<br>2399621-2440868 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 16318ms<br>2:missing_selected_cut / 開始 比較不可 / 終了 比較不可 / 重なり 0ms<br>3:compared / 開始 0ms / 終了 0ms / 重なり 2302ms<br>4:compared / 開始 0ms / 終了 0ms / 重なり 16706ms<br>5:missing_selected_cut / 開始 比較不可 / 終了 比較不可 / 重なり 0ms<br>6:compared / 開始 0ms / 終了 0ms / 重なり 41247ms |
| llm-v012 | web-gemini+prompt | clip_composition_prompt_v012 | gemini-web-flash | 5/6 | 5 | 5 | 1 | 0 | 2208172-2224490<br>2314526-2316828<br>2333847-2350553<br>2369790-2382581<br>2399621-2440868 | 2208172-2224490<br>2237847-2241469<br>2314526-2316828<br>2333847-2350553<br>2369790-2382581<br>2399621-2440868 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 16318ms<br>2:missing_selected_cut / 開始 比較不可 / 終了 比較不可 / 重なり 0ms<br>3:compared / 開始 0ms / 終了 0ms / 重なり 2302ms<br>4:compared / 開始 0ms / 終了 0ms / 重なり 16706ms<br>5:compared / 開始 0ms / 終了 0ms / 重なり 12791ms<br>6:compared / 開始 0ms / 終了 0ms / 重なり 41247ms |
| llm-v012 | web-gemini+prompt | clip_composition_prompt_v012 | gemini-web-flash | 4/6 | 3 | 5 | 1 | 0 | 2208172-2224490<br>2314526-2316828<br>2333847-2382581<br>2399621-2440868 | 2208172-2224490<br>2237847-2241469<br>2314526-2316828<br>2333847-2350553<br>2369790-2382581<br>2399621-2440868 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 16318ms<br>2:missing_selected_cut / 開始 比較不可 / 終了 比較不可 / 重なり 0ms<br>3:compared / 開始 0ms / 終了 0ms / 重なり 2302ms<br>4:compared / 開始 0ms / 終了 +32028ms / 重なり 16706ms<br>5:compared / 開始 -35943ms / 終了 0ms / 重なり 12791ms<br>6:compared / 開始 0ms / 終了 0ms / 重なり 41247ms |
| baseline-rule | runner.buildClipComposition | baseline-rule | baseline-rule | 6/6 | 6 | 6 | 0 | 0 | 2208172-2224490<br>2237847-2241469<br>2314526-2316828<br>2333847-2350553<br>2369790-2382581<br>2399621-2440868 | 2208172-2224490<br>2237847-2241469<br>2314526-2316828<br>2333847-2350553<br>2369790-2382581<br>2399621-2440868 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 16318ms<br>2:compared / 開始 0ms / 終了 0ms / 重なり 3622ms<br>3:compared / 開始 0ms / 終了 0ms / 重なり 2302ms<br>4:compared / 開始 0ms / 終了 0ms / 重なり 16706ms<br>5:compared / 開始 0ms / 終了 0ms / 重なり 12791ms<br>6:compared / 開始 0ms / 終了 0ms / 重なり 41247ms |

### 判定メモ

- llm-v010 / clip_composition_prompt_v010: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- llm-v010 / clip_composition_prompt_v010: 期待区間6件に対して選択区間4件。完全一致3件、重なりあり5件。
- llm-v010 / clip_composition_prompt_v010: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- llm-v010 / clip_composition_prompt_v010: 期待区間6件に対して選択区間5件。完全一致5件、重なりあり5件。
- llm-v010 / clip_composition_prompt_v010: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- llm-v010 / clip_composition_prompt_v010: 期待区間6件に対して選択区間3件。完全一致2件、重なりあり3件。
- llm-v011 / clip_composition_prompt_v011: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- llm-v011 / clip_composition_prompt_v011: 期待区間6件に対して選択区間4件。完全一致3件、重なりあり5件。
- llm-v011 / clip_composition_prompt_v011: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- llm-v011 / clip_composition_prompt_v011: 期待区間6件に対して選択区間5件。完全一致5件、重なりあり5件。
- llm-v011 / clip_composition_prompt_v011: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- llm-v011 / clip_composition_prompt_v011: 期待区間6件に対して選択区間4件。完全一致2件、重なりあり5件。
- llm-v012 / clip_composition_prompt_v012: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- llm-v012 / clip_composition_prompt_v012: 期待区間6件に対して選択区間4件。完全一致4件、重なりあり4件。
- llm-v012 / clip_composition_prompt_v012: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- llm-v012 / clip_composition_prompt_v012: 期待区間6件に対して選択区間5件。完全一致5件、重なりあり5件。
- llm-v012 / clip_composition_prompt_v012: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- llm-v012 / clip_composition_prompt_v012: 期待区間6件に対して選択区間4件。完全一致3件、重なりあり5件。
- baseline-rule / baseline-rule: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側の候補選択差分はありません
- baseline-rule / baseline-rule: 期待区間6件に対して選択区間6件。完全一致6件、重なりあり6件。

## UpRyakf5j80_clip_audio_v001

| system | generator | prompt label | model | cuts | exact | overlap | missing | extra | selected intervals | expected intervals | first start delta | first end delta | cut diffs |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| llm-v010 | web-gemini+prompt | clip_composition_prompt_v010 | gemini-web-flash | 1/1 | 0 | 1 | 0 | 0 | 11364140-11404850 | 11364500-11407178 | -360ms | -2328ms | 1:compared / 開始 -360ms / 終了 -2328ms / 重なり 40350ms |
| llm-v010 | web-gemini+prompt | clip_composition_prompt_v010 | gemini-web-flash | 1/1 | 0 | 1 | 0 | 0 | 11364140-11404850 | 11364500-11407178 | -360ms | -2328ms | 1:compared / 開始 -360ms / 終了 -2328ms / 重なり 40350ms |
| llm-v010 | web-gemini+prompt | clip_composition_prompt_v010 | gemini-web-flash | 1/1 | 0 | 1 | 0 | 0 | 11364140-11405460 | 11364500-11407178 | -360ms | -1718ms | 1:compared / 開始 -360ms / 終了 -1718ms / 重なり 40960ms |
| llm-v011 | web-gemini+prompt | clip_composition_prompt_v011 | gemini-web-flash | 1/1 | 0 | 1 | 0 | 0 | 11364140-11404850 | 11364500-11407178 | -360ms | -2328ms | 1:compared / 開始 -360ms / 終了 -2328ms / 重なり 40350ms |
| llm-v011 | web-gemini+prompt | clip_composition_prompt_v011 | gemini-web-flash | 1/1 | 0 | 1 | 0 | 0 | 11364140-11404850 | 11364500-11407178 | -360ms | -2328ms | 1:compared / 開始 -360ms / 終了 -2328ms / 重なり 40350ms |
| llm-v011 | web-gemini+prompt | clip_composition_prompt_v011 | gemini-web-flash | 1/1 | 0 | 1 | 0 | 0 | 11364140-11404850 | 11364500-11407178 | -360ms | -2328ms | 1:compared / 開始 -360ms / 終了 -2328ms / 重なり 40350ms |
| llm-v012 | web-gemini+prompt | clip_composition_prompt_v012 | gemini-web-flash | 1/1 | 0 | 1 | 0 | 0 | 11364140-11404850 | 11364500-11407178 | -360ms | -2328ms | 1:compared / 開始 -360ms / 終了 -2328ms / 重なり 40350ms |
| llm-v012 | web-gemini+prompt | clip_composition_prompt_v012 | gemini-web-flash | 1/1 | 0 | 1 | 0 | 0 | 11364140-11404850 | 11364500-11407178 | -360ms | -2328ms | 1:compared / 開始 -360ms / 終了 -2328ms / 重なり 40350ms |
| llm-v012 | web-gemini+prompt | clip_composition_prompt_v012 | gemini-web-flash | 1/1 | 0 | 1 | 0 | 0 | 11364140-11405460 | 11364500-11407178 | -360ms | -1718ms | 1:compared / 開始 -360ms / 終了 -1718ms / 重なり 40960ms |
| baseline-rule | runner.buildClipComposition | baseline-rule | baseline-rule | 1/1 | 0 | 1 | 0 | 0 | 11362439-11409170 | 11364500-11407178 | -2061ms | +1992ms | 1:compared / 開始 -2061ms / 終了 +1992ms / 重なり 42678ms |

### 判定メモ

- llm-v010 / clip_composition_prompt_v010: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- llm-v010 / clip_composition_prompt_v010: 期待区間1件に対して選択区間1件。完全一致0件、重なりあり1件。
- llm-v010 / clip_composition_prompt_v010: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- llm-v010 / clip_composition_prompt_v010: 期待区間1件に対して選択区間1件。完全一致0件、重なりあり1件。
- llm-v010 / clip_composition_prompt_v010: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- llm-v010 / clip_composition_prompt_v010: 期待区間1件に対して選択区間1件。完全一致0件、重なりあり1件。
- llm-v011 / clip_composition_prompt_v011: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- llm-v011 / clip_composition_prompt_v011: 期待区間1件に対して選択区間1件。完全一致0件、重なりあり1件。
- llm-v011 / clip_composition_prompt_v011: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- llm-v011 / clip_composition_prompt_v011: 期待区間1件に対して選択区間1件。完全一致0件、重なりあり1件。
- llm-v011 / clip_composition_prompt_v011: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- llm-v011 / clip_composition_prompt_v011: 期待区間1件に対して選択区間1件。完全一致0件、重なりあり1件。
- llm-v012 / clip_composition_prompt_v012: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- llm-v012 / clip_composition_prompt_v012: 期待区間1件に対して選択区間1件。完全一致0件、重なりあり1件。
- llm-v012 / clip_composition_prompt_v012: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- llm-v012 / clip_composition_prompt_v012: 期待区間1件に対して選択区間1件。完全一致0件、重なりあり1件。
- llm-v012 / clip_composition_prompt_v012: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- llm-v012 / clip_composition_prompt_v012: 期待区間1件に対して選択区間1件。完全一致0件、重なりあり1件。
- baseline-rule / baseline-rule: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- baseline-rule / baseline-rule: 期待区間1件に対して選択区間1件。完全一致0件、重なりあり1件。

## XauLZgnWHtA_part01_partial_material_v001

| system | generator | prompt label | model | cuts | exact | overlap | missing | extra | selected intervals | expected intervals | first start delta | first end delta | cut diffs |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| llm-v010 | web-gemini+prompt | clip_composition_prompt_v010 | gemini-web-flash | 3/6 | 3 | 3 | 3 | 0 | 440672-450696<br>1809559-1829518<br>3432777-3434438 | 440672-450696<br>1809559-1829518<br>7478079-7500512<br>3432777-3434438<br>5427822-5436145<br>4049549-4052650 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 10024ms<br>2:compared / 開始 0ms / 終了 0ms / 重なり 19959ms<br>3:missing_selected_cut / 開始 比較不可 / 終了 比較不可 / 重なり 0ms<br>4:compared / 開始 0ms / 終了 0ms / 重なり 1661ms<br>5:missing_selected_cut / 開始 比較不可 / 終了 比較不可 / 重なり 0ms<br>6:missing_selected_cut / 開始 比較不可 / 終了 比較不可 / 重なり 0ms |
| llm-v010 | web-gemini+prompt | clip_composition_prompt_v010 | gemini-web-flash | 4/6 | 4 | 4 | 2 | 0 | 440672-450696<br>1809559-1829518<br>3432777-3434438<br>4049549-4052650 | 440672-450696<br>1809559-1829518<br>7478079-7500512<br>3432777-3434438<br>5427822-5436145<br>4049549-4052650 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 10024ms<br>2:compared / 開始 0ms / 終了 0ms / 重なり 19959ms<br>3:missing_selected_cut / 開始 比較不可 / 終了 比較不可 / 重なり 0ms<br>4:compared / 開始 0ms / 終了 0ms / 重なり 1661ms<br>5:missing_selected_cut / 開始 比較不可 / 終了 比較不可 / 重なり 0ms<br>6:compared / 開始 0ms / 終了 0ms / 重なり 3101ms |
| llm-v010 | web-gemini+prompt | clip_composition_prompt_v010 | gemini-web-flash | 6/6 | 6 | 6 | 0 | 0 | 440672-450696<br>1809559-1829518<br>3432777-3434438<br>4049549-4052650<br>5427822-5436145<br>7478079-7500512 | 440672-450696<br>1809559-1829518<br>7478079-7500512<br>3432777-3434438<br>5427822-5436145<br>4049549-4052650 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 10024ms<br>2:compared / 開始 0ms / 終了 0ms / 重なり 19959ms<br>3:compared / 開始 0ms / 終了 0ms / 重なり 22433ms<br>4:compared / 開始 0ms / 終了 0ms / 重なり 1661ms<br>5:compared / 開始 0ms / 終了 0ms / 重なり 8323ms<br>6:compared / 開始 0ms / 終了 0ms / 重なり 3101ms |
| llm-v011 | web-gemini+prompt | clip_composition_prompt_v011 | gemini-web-flash | 6/6 | 6 | 6 | 0 | 0 | 440672-450696<br>1809559-1829518<br>3432777-3434438<br>4049549-4052650<br>5427822-5436145<br>7478079-7500512 | 440672-450696<br>1809559-1829518<br>7478079-7500512<br>3432777-3434438<br>5427822-5436145<br>4049549-4052650 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 10024ms<br>2:compared / 開始 0ms / 終了 0ms / 重なり 19959ms<br>3:compared / 開始 0ms / 終了 0ms / 重なり 22433ms<br>4:compared / 開始 0ms / 終了 0ms / 重なり 1661ms<br>5:compared / 開始 0ms / 終了 0ms / 重なり 8323ms<br>6:compared / 開始 0ms / 終了 0ms / 重なり 3101ms |
| llm-v011 | web-gemini+prompt | clip_composition_prompt_v011 | gemini-web-flash | 2/6 | 2 | 2 | 4 | 0 | 440672-450696<br>1809559-1829518 | 440672-450696<br>1809559-1829518<br>7478079-7500512<br>3432777-3434438<br>5427822-5436145<br>4049549-4052650 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 10024ms<br>2:compared / 開始 0ms / 終了 0ms / 重なり 19959ms<br>3:missing_selected_cut / 開始 比較不可 / 終了 比較不可 / 重なり 0ms<br>4:missing_selected_cut / 開始 比較不可 / 終了 比較不可 / 重なり 0ms<br>5:missing_selected_cut / 開始 比較不可 / 終了 比較不可 / 重なり 0ms<br>6:missing_selected_cut / 開始 比較不可 / 終了 比較不可 / 重なり 0ms |
| llm-v011 | web-gemini+prompt | clip_composition_prompt_v011 | gemini-web-flash | 2/6 | 2 | 2 | 4 | 0 | 440672-450696<br>1809559-1829518 | 440672-450696<br>1809559-1829518<br>7478079-7500512<br>3432777-3434438<br>5427822-5436145<br>4049549-4052650 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 10024ms<br>2:compared / 開始 0ms / 終了 0ms / 重なり 19959ms<br>3:missing_selected_cut / 開始 比較不可 / 終了 比較不可 / 重なり 0ms<br>4:missing_selected_cut / 開始 比較不可 / 終了 比較不可 / 重なり 0ms<br>5:missing_selected_cut / 開始 比較不可 / 終了 比較不可 / 重なり 0ms<br>6:missing_selected_cut / 開始 比較不可 / 終了 比較不可 / 重なり 0ms |
| llm-v012 | web-gemini+prompt | clip_composition_prompt_v012 | gemini-web-flash | 6/6 | 6 | 6 | 0 | 0 | 440672-450696<br>1809559-1829518<br>3432777-3434438<br>4049549-4052650<br>5427822-5436145<br>7478079-7500512 | 440672-450696<br>1809559-1829518<br>7478079-7500512<br>3432777-3434438<br>5427822-5436145<br>4049549-4052650 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 10024ms<br>2:compared / 開始 0ms / 終了 0ms / 重なり 19959ms<br>3:compared / 開始 0ms / 終了 0ms / 重なり 22433ms<br>4:compared / 開始 0ms / 終了 0ms / 重なり 1661ms<br>5:compared / 開始 0ms / 終了 0ms / 重なり 8323ms<br>6:compared / 開始 0ms / 終了 0ms / 重なり 3101ms |
| llm-v012 | web-gemini+prompt | clip_composition_prompt_v012 | gemini-web-flash | 6/6 | 6 | 6 | 0 | 0 | 440672-450696<br>1809559-1829518<br>3432777-3434438<br>4049549-4052650<br>5427822-5436145<br>7478079-7500512 | 440672-450696<br>1809559-1829518<br>7478079-7500512<br>3432777-3434438<br>5427822-5436145<br>4049549-4052650 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 10024ms<br>2:compared / 開始 0ms / 終了 0ms / 重なり 19959ms<br>3:compared / 開始 0ms / 終了 0ms / 重なり 22433ms<br>4:compared / 開始 0ms / 終了 0ms / 重なり 1661ms<br>5:compared / 開始 0ms / 終了 0ms / 重なり 8323ms<br>6:compared / 開始 0ms / 終了 0ms / 重なり 3101ms |
| llm-v012 | web-gemini+prompt | clip_composition_prompt_v012 | gemini-web-flash | 6/6 | 6 | 6 | 0 | 0 | 440672-450696<br>1809559-1829518<br>7478079-7500512<br>3432777-3434438<br>5427822-5436145<br>4049549-4052650 | 440672-450696<br>1809559-1829518<br>7478079-7500512<br>3432777-3434438<br>5427822-5436145<br>4049549-4052650 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 10024ms<br>2:compared / 開始 0ms / 終了 0ms / 重なり 19959ms<br>3:compared / 開始 0ms / 終了 0ms / 重なり 22433ms<br>4:compared / 開始 0ms / 終了 0ms / 重なり 1661ms<br>5:compared / 開始 0ms / 終了 0ms / 重なり 8323ms<br>6:compared / 開始 0ms / 終了 0ms / 重なり 3101ms |
| baseline-rule | runner.buildClipComposition | clip_composition_prompt_baseline-rule | baseline-rule | 6/6 | 6 | 6 | 0 | 0 | 440672-450696<br>1809559-1829518<br>7478079-7500512<br>3432777-3434438<br>5427822-5436145<br>4049549-4052650 | 440672-450696<br>1809559-1829518<br>7478079-7500512<br>3432777-3434438<br>5427822-5436145<br>4049549-4052650 | 0ms | 0ms | 1:compared / 開始 0ms / 終了 0ms / 重なり 10024ms<br>2:compared / 開始 0ms / 終了 0ms / 重なり 19959ms<br>3:compared / 開始 0ms / 終了 0ms / 重なり 22433ms<br>4:compared / 開始 0ms / 終了 0ms / 重なり 1661ms<br>5:compared / 開始 0ms / 終了 0ms / 重なり 8323ms<br>6:compared / 開始 0ms / 終了 0ms / 重なり 3101ms |

### 判定メモ

- llm-v010 / clip_composition_prompt_v010: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- llm-v010 / clip_composition_prompt_v010: 期待区間6件に対して選択区間3件。完全一致3件、重なりあり3件。
- llm-v010 / clip_composition_prompt_v010: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- llm-v010 / clip_composition_prompt_v010: 期待区間6件に対して選択区間4件。完全一致4件、重なりあり4件。
- llm-v010 / clip_composition_prompt_v010: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- llm-v010 / clip_composition_prompt_v010: 期待区間6件に対して選択区間6件。完全一致6件、重なりあり6件。
- llm-v011 / clip_composition_prompt_v011: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- llm-v011 / clip_composition_prompt_v011: 期待区間6件に対して選択区間6件。完全一致6件、重なりあり6件。
- llm-v011 / clip_composition_prompt_v011: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- llm-v011 / clip_composition_prompt_v011: 期待区間6件に対して選択区間2件。完全一致2件、重なりあり2件。
- llm-v011 / clip_composition_prompt_v011: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- llm-v011 / clip_composition_prompt_v011: 期待区間6件に対して選択区間2件。完全一致2件、重なりあり2件。
- llm-v012 / clip_composition_prompt_v012: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- llm-v012 / clip_composition_prompt_v012: 期待区間6件に対して選択区間6件。完全一致6件、重なりあり6件。
- llm-v012 / clip_composition_prompt_v012: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- llm-v012 / clip_composition_prompt_v012: 期待区間6件に対して選択区間6件。完全一致6件、重なりあり6件。
- llm-v012 / clip_composition_prompt_v012: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側の候補選択差分はありません
- llm-v012 / clip_composition_prompt_v012: 期待区間6件に対して選択区間6件。完全一致6件、重なりあり6件。
- baseline-rule / clip_composition_prompt_baseline-rule: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側の候補選択差分はありません
- baseline-rule / clip_composition_prompt_baseline-rule: 期待区間6件に対して選択区間6件。完全一致6件、重なりあり6件。

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
