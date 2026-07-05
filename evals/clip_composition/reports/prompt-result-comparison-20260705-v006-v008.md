# clip_composition prompt結果比較

- 結果JSON: outputs/prompt-result-comparison-20260705-v006-v008.json

## 比較方針

- 指定された result.json だけを読み、どのrunを比較しているかを固定する。
- 自動の重み付けや合成スコアは作らず、開始差分、終了差分、重なりの説明をそのまま並べる。
- theme側とcomposition側の暫定判定は、各 result.json に記録された文言をそのまま表示する。

## IMQYaT_RWRA_context_v001

| prompt | model | selected | expected | start delta | end delta | overlap |
| --- | --- | --- | --- | ---: | ---: | --- |
| clip_composition_prompt_v006 | gemini-web-flash | 1997050-2015672 | 1997050-2015672 | 0ms | 0ms | 期待区間と完全に一致しています |
| clip_composition_prompt_v008 | gemini-web-flash | 1997050-2015672 | 1997050-2015672 | 0ms | 0ms | 期待区間と完全に一致しています |

### 判定メモ

- clip_composition_prompt_v006: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側の候補選択差分はありません
- clip_composition_prompt_v008: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側の候補選択差分はありません

## UpRyakf5j80_clip_audio_v001

| prompt | model | selected | expected | start delta | end delta | overlap |
| --- | --- | --- | --- | ---: | ---: | --- |
| clip_composition_prompt_v006 | gemini-web-flash | 11364140-11404850 | 11364500-11407178 | -360ms | -2328ms | 一部重なっています。重なりは40350ms、LLM選択は40710ms、期待区間は42678msです |
| clip_composition_prompt_v007 | gemini-web-flash | 11364140-11405460 | 11364500-11407178 | -360ms | -1718ms | 一部重なっています。重なりは40960ms、LLM選択は41320ms、期待区間は42678msです |
| clip_composition_prompt_v008 | gemini-web-flash | 11364140-11409170 | 11364500-11407178 | -360ms | +1992ms | LLMが選んだ区間が期待区間を含んでいます |

### 判定メモ

- clip_composition_prompt_v006: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- clip_composition_prompt_v007: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- clip_composition_prompt_v008: theme側=theme側で正解区間が候補に入っていない可能性は低い / composition側=composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります

## 読み取り

- 差分が0msのrunは、指定された期待区間と一致している。
- 終了差分がマイナスのrunは期待区間より短く、プラスのrunは期待区間より長い。
- どちらが良いかは、この表だけで自動決定せず、対応するsummaryと境界粒度レポートを見て判断する。
