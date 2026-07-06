# llm-v010 2fixture x 3run summary

- 実行日: 2026-07-06
- 生成系統: llm-v010
- 実行モデル: gemini-web-flash
- 実行方法: run_web_gemini_prompt.ts
- 採点方法: score_prompt_output.ts / overlap-matched-v001
- 比較表: evals/clip_composition/reports/prompt-result-comparison-20260706-v010-three-way-v003.md

## 入力

| fixture | prompt |
| --- | --- |
| UpRyakf5j80_clip_audio_v001 | evals/clip_composition/reports/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v010/20260706-152330/prompt.md |
| r_ztjHaHmcg_partial_material_v001 | evals/clip_composition/reports/r_ztjHaHmcg_partial_material_v001/clip_composition_prompt_v010/20260706-152334/prompt.md |

## 実走結果

| fixture | run | selected intervals | start delta | end delta | exact | overlap | missing | extra |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| UpRyakf5j80_clip_audio_v001 | 1 | 11364140-11404850 | -360ms | -2328ms | 0/1 | 1/1 | 0 | 0 |
| UpRyakf5j80_clip_audio_v001 | 2 | 11364140-11404850 | -360ms | -2328ms | 0/1 | 1/1 | 0 | 0 |
| UpRyakf5j80_clip_audio_v001 | 3 | 11364140-11405460 | -360ms | -1718ms | 0/1 | 1/1 | 0 | 0 |
| r_ztjHaHmcg_partial_material_v001 | 1 | 2208172-2224490 / 2314526-2350553 / 2369790-2382581 / 2399621-2440868 | 0ms | 0ms | 3/6 | 5/6 | 1 | 0 |
| r_ztjHaHmcg_partial_material_v001 | 2 | 2208172-2224490 / 2314526-2316828 / 2333847-2350553 / 2369790-2382581 / 2399621-2440868 | 0ms | 0ms | 5/6 | 5/6 | 1 | 0 |
| r_ztjHaHmcg_partial_material_v001 | 3 | 2208172-2224350 / 2314526-2316828 / 2333847-2350553 | 0ms | -140ms | 2/6 | 3/6 | 3 | 0 |

## 揺れ

- UpRyakf5j80_clip_audio_v001: 開始位置は3回とも同じ。終了位置は2種類で、揺れ幅は610ms。
- r_ztjHaHmcg_partial_material_v001: 3回とも期待区間2の 2237847-2241469 を選ばなかった。選択区間数は3、4、5で揺れた。
- r_ztjHaHmcg_partial_material_v001 run1 は期待区間3と4を1区間に結合したため、素材ブロック粒度としては過結合がある。
- r_ztjHaHmcg_partial_material_v001 run2 は期待区間2以外を完全一致で返した。
- r_ztjHaHmcg_partial_material_v001 run3 は後半2区間を落とした。

## 三つ巴比較

- baseline-rule は、r_ztjHaHmcg_partial_material_v001 では6/6完全一致。UpRyakf5j80_clip_audio_v001 では開始-2061ms、終了+1992ms。
- llm-v006の7/5 Web Gemini実績は UpRyakf5j80_clip_audio_v001 のみ存在し、開始-360ms、終了-2328ms。
- r_ztjHaHmcg_partial_material_v001 の v006 result は7/6のbaseline-rule混同側であり、llm-v006実績としては比較に入れていない。
- llm-v010は UpRyakf5j80_clip_audio_v001 ではv006と同等または終端が610ms改善。r_ztjHaHmcg_partial_material_v001 では複数区間を返せたが、短い期待区間2を3回とも落とした。

## 採点ガード確認

- 6runすべてで suspectedFabricatedTimestamp は false。
- 6runすべてで excludedSelectedCuts は空。未解決除外区間だけを選んだケースはなかった。
- r_ztjHaHmcg_partial_material_v001 では、期待値側の未解決除外区間は result.json の excludedRanges に記録されている。

## 読み取り

- v010の複数区間対応は効いている。特にrun2は短い期待区間2以外をすべて完全一致で返した。
- 短い素材ブロック、特に未解決除外区間の隣にある1秒未満から数秒のブロックをLLMが落とす傾向が見える。
- 次のプロンプト改善対象は、複数素材ブロックのうち短くても意味をつなぐ区間を落とさない指示。ただし、未解決除外区間を巻き込ませない条件とセットで扱う必要がある。
