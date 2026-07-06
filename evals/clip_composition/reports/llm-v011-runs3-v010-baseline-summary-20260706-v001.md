# llm-v011 2fixture x 3run summary

- 実行日: 2026-07-06
- 生成系統: llm-v011
- 実行モデル: gemini-web-flash
- 実行方法: run_web_gemini_prompt.ts
- 採点方法: score_prompt_output.ts / overlap-matched-v001
- 比較表: evals/clip_composition/reports/prompt-result-comparison-20260706-v011-v010-baseline-v001.md

## v011の差分

v011はv010から判断方針を1点だけ変更した。

- 区間を採用するか除外するかは、長さではなく、前後の区間と意味が連続しているかで判断する。

「短い区間を落とすな」という直接命令は入れていない。

## 実走結果

| fixture | run | selected intervals | start delta | end delta | exact | overlap | missing | extra |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| UpRyakf5j80_clip_audio_v001 | 1 | 11364140-11404850 | -360ms | -2328ms | 0/1 | 1/1 | 0 | 0 |
| UpRyakf5j80_clip_audio_v001 | 2 | 11364140-11404850 | -360ms | -2328ms | 0/1 | 1/1 | 0 | 0 |
| UpRyakf5j80_clip_audio_v001 | 3 | 11364140-11404850 | -360ms | -2328ms | 0/1 | 1/1 | 0 | 0 |
| r_ztjHaHmcg_partial_material_v001 | 1 | 2208172-2224490 / 2314526-2350553 / 2369790-2382581 / 2399621-2440868 | 0ms | 0ms | 3/6 | 5/6 | 1 | 0 |
| r_ztjHaHmcg_partial_material_v001 | 2 | 2208172-2224490 / 2314526-2316828 / 2333847-2350553 / 2369790-2382581 / 2399621-2440868 | 0ms | 0ms | 5/6 | 5/6 | 1 | 0 |
| r_ztjHaHmcg_partial_material_v001 | 3 | 2208172-2224490 / 2314526-2350553 / 2369790-2382501 / 2399621-2440868 | 0ms | 0ms | 2/6 | 5/6 | 1 | 0 |

## 指定確認3点

### 期待区間2の採否

r_ztjHaHmcg_partial_material_v001 の期待区間2 `2237847-2241469` は、v011でも3回とも選ばれなかった。

この区間はbaseline-ruleでは完全一致で出る。theme側で候補に入っていないのではなく、LLM側の区間採否で落ちている。

### v010 run1の過結合

v010 run1で起きた期待区間3と4の過結合は、v011でもrun1とrun3で再発した。

- 過結合した選択区間: `2314526-2350553`
- 含まれた期待区間: `2314526-2316828` と `2333847-2350553`
- 過結合していないrun: v011 run2

v011の追加指示は、短い期待区間2の採用にも、期待区間3と4の分離にも十分には効いていない。

### UpRyakf5j80の境界悪化

UpRyakf5j80_clip_audio_v001 はv011で悪化していない。

- v010: run1/run2 は `-360ms / -2328ms`、run3 は `-360ms / -1718ms`
- v011: 3回とも `-360ms / -2328ms`

v011はv010最良runより終端が610ms短くなったが、v010で多数派だった境界と同じ。境界が大きく崩れる悪化はない。

## baseline-ruleとの比較

- baseline-ruleは r_ztjHaHmcg_partial_material_v001 で6/6完全一致。
- baseline-ruleは UpRyakf5j80_clip_audio_v001 で開始-2061ms、終了+1992ms。
- llm-v011は UpRyakf5j80_clip_audio_v001 ではbaseline-ruleより開始・終了とも期待区間内側に寄る。
- llm-v011は r_ztjHaHmcg_partial_material_v001 では複数区間を返せるが、短い期待区間2を構造として保持できていない。

## 揺れ

- UpRyakf5j80_clip_audio_v001: 3回とも同じ区間。境界揺れなし。
- r_ztjHaHmcg_partial_material_v001: 3回とも期待区間2を落とした。選択数は4、5、4で揺れた。過結合はrun1/run3で発生し、run2では発生しなかった。

## 採点ガード確認

- 6runすべてで suspectedFabricatedTimestamp は false。
- 6runすべてで excludedSelectedCuts は空。未解決除外区間だけを選んだケースはなかった。
- r_ztjHaHmcg_partial_material_v001 の未解決除外区間は採点対象外のまま維持されている。

## DECISIONS.md 追記案

- LLMの出力の揺れは境界(数百ms)より区間の取捨(構造)に大きく出る。複数区間fixtureはruns 3以上で評価する。
