# theme-llm-v001 一段目範囲hit採点

- outputId: 20260709-v001
- generationSystem: theme-llm-v001
- このレポートは区間比較による機械採点。人間確認は含めない。

## Fixture別

| fixture | run | expected hit | expected total | range hit rate | candidates | no-hit candidates |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| UpRyakf5j80_clip_audio_v001 | 1 | 0 | 1 | 0.000 | 3 | 3 |
| UpRyakf5j80_clip_audio_v001 | 2 | 0 | 1 | 0.000 | 8 | 8 |
| UpRyakf5j80_clip_audio_v001 | 3 | 0 | 1 | 0.000 | 1 | 1 |
| r_ztjHaHmcg_partial_material_v001 | 1 | 1 | 6 | 0.167 | 7 | 6 |
| r_ztjHaHmcg_partial_material_v001 | 2 | 0 | 6 | 0.000 | 8 | 8 |
| r_ztjHaHmcg_partial_material_v001 | 3 | 0 | 6 | 0.000 | 4 | 4 |
| aX-axQMWR3c_single_material_v001 | 1 | 1 | 1 | 1.000 | 6 | 5 |
| aX-axQMWR3c_single_material_v001 | 2 | 0 | 1 | 0.000 | 5 | 5 |
| aX-axQMWR3c_single_material_v001 | 3 | 0 | 1 | 0.000 | 6 | 6 |
| XauLZgnWHtA_part01_partial_material_v001 | 1 | 0 | 6 | 0.000 | 45 | 45 |
| XauLZgnWHtA_part01_partial_material_v001 | 2 | 1 | 6 | 0.167 | 38 | 37 |
| XauLZgnWHtA_part01_partial_material_v001 | 3 | 0 | 6 | 0.000 | 42 | 42 |

## top8 / top全体比較

窓分割fixtureでは、窓ごとに候補を出して統合するため、最終候補数が8を超える。ここでは全候補を記録しつつ、上位8件だけを見た場合の数字も併記する。Nの正式な扱いは次版設計で決める。

| fixture | run | top8 expected hit | all expected hit | expected total | top8 candidates | all candidates |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| UpRyakf5j80_clip_audio_v001 | 1 | 0 | 0 | 1 | 3 | 3 |
| UpRyakf5j80_clip_audio_v001 | 2 | 0 | 0 | 1 | 8 | 8 |
| UpRyakf5j80_clip_audio_v001 | 3 | 0 | 0 | 1 | 1 | 1 |
| r_ztjHaHmcg_partial_material_v001 | 1 | 1 | 1 | 6 | 7 | 7 |
| r_ztjHaHmcg_partial_material_v001 | 2 | 0 | 0 | 6 | 8 | 8 |
| r_ztjHaHmcg_partial_material_v001 | 3 | 0 | 0 | 6 | 4 | 4 |
| aX-axQMWR3c_single_material_v001 | 1 | 1 | 1 | 1 | 6 | 6 |
| aX-axQMWR3c_single_material_v001 | 2 | 0 | 0 | 1 | 5 | 5 |
| aX-axQMWR3c_single_material_v001 | 3 | 0 | 0 | 1 | 6 | 6 |
| XauLZgnWHtA_part01_partial_material_v001 | 1 | 0 | 0 | 6 | 8 | 45 |
| XauLZgnWHtA_part01_partial_material_v001 | 2 | 1 | 1 | 6 | 8 | 38 |
| XauLZgnWHtA_part01_partial_material_v001 | 3 | 0 | 0 | 6 | 8 | 42 |

## 範囲hit候補

| fixture | run | expected | candidate | title | sourceVideoId | candidate range | expected range | overlapMs |
| --- | ---: | --- | ---: | --- | --- | --- | --- | ---: |
| r_ztjHaHmcg_partial_material_v001 | 1 | 6: 配信者が食べていける同接規模について現実的に答える場面 | 6 | Gemini回答が途中で切れたため、タイトルは完全には取得できなかった。 | -DwSCDMCWDQ | 2425558-2628323 | 2399621-2440868 | 15310 |
| aX-axQMWR3c_single_material_v001 | 1 | 1: Vの組織内あれこれ | 6 | 上司4人に部下1人！？白雪レイド、会社の狂った逆ピラミッド体制に困惑 | SGQqVJXsNNE | 4890622-5010000 | 4922443-5056495 | 87557 |
| XauLZgnWHtA_part01_partial_material_v001 | 2 | 1: 逆凸遊戯王 | 1 | Gemini回答が途中で切れたため、タイトルは完全には取得できなかった。 | OJoi31bq8lk | 405919-607760 | 440672-450696 | 10024 |

## 機械で分けられる品質分類

ここで確定できる分類は「期待範囲に重なった候補」と「期待範囲に重ならない候補」だけ。過広範囲、別話題、根拠なしは、候補の中心がどこにあるかを別の根拠検査で見る。重複音声を見るだけの人間確認は行わない。

| fixture | run | range-hit candidates | range-miss/unclassified candidates |
| --- | ---: | ---: | ---: |
| UpRyakf5j80_clip_audio_v001 | 1 | 0 | 3 |
| UpRyakf5j80_clip_audio_v001 | 2 | 0 | 8 |
| UpRyakf5j80_clip_audio_v001 | 3 | 0 | 1 |
| r_ztjHaHmcg_partial_material_v001 | 1 | 1 | 6 |
| r_ztjHaHmcg_partial_material_v001 | 2 | 0 | 8 |
| r_ztjHaHmcg_partial_material_v001 | 3 | 0 | 4 |
| aX-axQMWR3c_single_material_v001 | 1 | 1 | 5 |
| aX-axQMWR3c_single_material_v001 | 2 | 0 | 5 |
| aX-axQMWR3c_single_material_v001 | 3 | 0 | 6 |
| XauLZgnWHtA_part01_partial_material_v001 | 1 | 0 | 45 |
| XauLZgnWHtA_part01_partial_material_v001 | 2 | 1 | 37 |
| XauLZgnWHtA_part01_partial_material_v001 | 3 | 0 | 42 |

## runs 3の顔ぶれ揺れ

完全一致するtitle文字列だけで機械集計している。意味的に同じタイトルの言い換えは人間判定前なので統合しない。

| fixture | unique titles | pair | exact title overlap | exact title jaccard |
| --- | ---: | --- | ---: | ---: |
| UpRyakf5j80_clip_audio_v001 | 10 | run1-run2 | 0 | 0.000 |
| UpRyakf5j80_clip_audio_v001 | 10 | run1-run3 | 0 | 0.000 |
| UpRyakf5j80_clip_audio_v001 | 10 | run2-run3 | 0 | 0.000 |
| r_ztjHaHmcg_partial_material_v001 | 9 | run1-run2 | 0 | 0.000 |
| r_ztjHaHmcg_partial_material_v001 | 9 | run1-run3 | 1 | 1.000 |
| r_ztjHaHmcg_partial_material_v001 | 9 | run2-run3 | 0 | 0.000 |
| aX-axQMWR3c_single_material_v001 | 7 | run1-run2 | 0 | 0.000 |
| aX-axQMWR3c_single_material_v001 | 7 | run1-run3 | 0 | 0.000 |
| aX-axQMWR3c_single_material_v001 | 7 | run2-run3 | 1 | 1.000 |
| XauLZgnWHtA_part01_partial_material_v001 | 94 | run1-run2 | 1 | 0.016 |
| XauLZgnWHtA_part01_partial_material_v001 | 94 | run1-run3 | 1 | 0.015 |
| XauLZgnWHtA_part01_partial_material_v001 | 94 | run2-run3 | 1 | 0.017 |

## 期待区間2

- run 1: 範囲hitなし
- run 2: 範囲hitなし
- run 3: 範囲hitなし

## 窓分割

- UpRyakf5j80_clip_audio_v001: {"applied":false,"reason":"初回はプロンプトを1本に収め、窓統合器の癖を入れない。","overlapMs":0,"preMergeCandidateCount":null,"postMergeCandidateCount":null}
- r_ztjHaHmcg_partial_material_v001: {"applied":false,"reason":"初回はプロンプトを1本に収め、窓統合器の癖を入れない。","overlapMs":0,"preMergeCandidateCount":null,"postMergeCandidateCount":null}
- aX-axQMWR3c_single_material_v001: {"applied":false,"reason":"初回はプロンプトを1本に収め、窓統合器の癖を入れない。","overlapMs":0,"preMergeCandidateCount":null,"postMergeCandidateCount":null}
- XauLZgnWHtA_part01_partial_material_v001: {"applied":true,"mode":"speech-time","reason":"未分割入力でEdgeレンダラが高負荷化して戻らなかったため、発話境界を保った時間窓へ分割する。","maxPromptBytes":340000,"overlapMs":180000,"windowCount":8,"preMergeCandidateCount":null,"postMergeCandidateCount":null,"merge":"同一sourceVideoIdで根拠範囲が重なる候補だけを機械統合。意味ベースの統合はしない。","windows":[{"windowId":"window_01_OJoi31bq8lk","sourceVideoId":"OJoi31bq8lk","sourceStartMs":96110,"sourceEndMs":13637460,"segmentCount":1226,"firstSpeechId":1,"lastSpeechId":1226,"promptPath":"evals/clip_composition/reports/theme-generation/XauLZgnWHtA_part01_partial_material_v001/theme-llm-v001/20260709-v001/windows/window_01_OJoi31bq8lk-prompt.md","payloadPath":"evals/clip_composition/outputs/theme-generation/XauLZgnWHtA_part01_partial_material_v001/theme-llm-v001/20260709-v001/windows/window_01_OJoi31bq8lk-prompt-input.json","promptBytes":339819},{"windowId":"window_02_OJoi31bq8lk","sourceVideoId":"OJoi31bq8lk","sourceStartMs":13458979,"sourceEndMs":13959389,"segmentCount":46,"firstSpeechId":1205,"lastSpeechId":1250,"promptPath":"evals/clip_composition/reports/theme-generation/XauLZgnWHtA_part01_partial_material_v001/theme-llm-v001/20260709-v001/windows/window_02_OJoi31bq8lk-prompt.md","payloadPath":"evals/clip_composition/outputs/theme-generation/XauLZgnWHtA_part01_partial_material_v001/theme-llm-v001/20260709-v001/windows/window_02_OJoi31bq8lk-prompt-input.json","promptBytes":18221},{"windowId":"window_03_O4ryDQBcMDc","sourceVideoId":"O4ryDQBcMDc","sourceStartMs":17430,"sourceEndMs":4420189,"segmentCount":328,"firstSpeechId":1,"lastSpeechId":328,"promptPath":"evals/clip_composition/reports/theme-generation/XauLZgnWHtA_part01_partial_material_v001/theme-llm-v001/20260709-v001/windows/window_03_O4ryDQBcMDc-prompt.md","payloadPath":"evals/clip_composition/outputs/theme-generation/XauLZgnWHtA_part01_partial_material_v001/theme-llm-v001/20260709-v001/windows/window_03_O4ryDQBcMDc-prompt-input.json","promptBytes":102883},{"windowId":"window_04_vWv9H-hfHXo","sourceVideoId":"vWv9H-hfHXo","sourceStartMs":8810,"sourceEndMs":13595840,"segmentCount":1442,"firstSpeechId":1,"lastSpeechId":1442,"promptPath":"evals/clip_composition/reports/theme-generation/XauLZgnWHtA_part01_partial_material_v001/theme-llm-v001/20260709-v001/windows/window_04_vWv9H-hfHXo-prompt.md","payloadPath":"evals/clip_composition/outputs/theme-generation/XauLZgnWHtA_part01_partial_material_v001/theme-llm-v001/20260709-v001/windows/window_04_vWv9H-hfHXo-prompt-input.json","promptBytes":339944},{"windowId":"window_05_vWv9H-hfHXo","sourceVideoId":"vWv9H-hfHXo","sourceStartMs":13421090,"sourceEndMs":19944810,"segmentCount":709,"firstSpeechId":1424,"lastSpeechId":2132,"promptPath":"evals/clip_composition/reports/theme-generation/XauLZgnWHtA_part01_partial_material_v001/theme-llm-v001/20260709-v001/windows/window_05_vWv9H-hfHXo-prompt.md","payloadPath":"evals/clip_composition/outputs/theme-generation/XauLZgnWHtA_part01_partial_material_v001/theme-llm-v001/20260709-v001/windows/window_05_vWv9H-hfHXo-prompt-input.json","promptBytes":164011},{"windowId":"window_06_Lw_FdQPTOs8","sourceVideoId":"Lw_FdQPTOs8","sourceStartMs":65460,"sourceEndMs":4930460,"segmentCount":410,"firstSpeechId":1,"lastSpeechId":410,"promptPath":"evals/clip_composition/reports/theme-generation/XauLZgnWHtA_part01_partial_material_v001/theme-llm-v001/20260709-v001/windows/window_06_Lw_FdQPTOs8-prompt.md","payloadPath":"evals/clip_composition/outputs/theme-generation/XauLZgnWHtA_part01_partial_material_v001/theme-llm-v001/20260709-v001/windows/window_06_Lw_FdQPTOs8-prompt-input.json","promptBytes":115020},{"windowId":"window_07_hKVrBcgAIpQ","sourceVideoId":"hKVrBcgAIpQ","sourceStartMs":115860,"sourceEndMs":8987960,"segmentCount":419,"firstSpeechId":1,"lastSpeechId":419,"promptPath":"evals/clip_composition/reports/theme-generation/XauLZgnWHtA_part01_partial_material_v001/theme-llm-v001/20260709-v001/windows/window_07_hKVrBcgAIpQ-prompt.md","payloadPath":"evals/clip_composition/outputs/theme-generation/XauLZgnWHtA_part01_partial_material_v001/theme-llm-v001/20260709-v001/windows/window_07_hKVrBcgAIpQ-prompt-input.json","promptBytes":201999},{"windowId":"window_08_CwmyZc3eskQ","sourceVideoId":"CwmyZc3eskQ","sourceStartMs":540,"sourceEndMs":6678739,"segmentCount":596,"firstSpeechId":1,"lastSpeechId":596,"promptPath":"evals/clip_composition/reports/theme-generation/XauLZgnWHtA_part01_partial_material_v001/theme-llm-v001/20260709-v001/windows/window_08_CwmyZc3eskQ-prompt.md","payloadPath":"evals/clip_composition/outputs/theme-generation/XauLZgnWHtA_part01_partial_material_v001/theme-llm-v001/20260709-v001/windows/window_08_CwmyZc3eskQ-prompt-input.json","promptBytes":162543}]}

## 窓分割run結果

| fixture | run | windows | pre-merge candidates | post-merge candidates |
| --- | ---: | ---: | ---: | ---: |
| UpRyakf5j80_clip_audio_v001 | 1 | 0 | 3 | 3 |
| UpRyakf5j80_clip_audio_v001 | 2 | 0 | 8 | 8 |
| UpRyakf5j80_clip_audio_v001 | 3 | 0 | 1 | 1 |
| r_ztjHaHmcg_partial_material_v001 | 1 | 0 | 7 | 7 |
| r_ztjHaHmcg_partial_material_v001 | 2 | 0 | 8 | 8 |
| r_ztjHaHmcg_partial_material_v001 | 3 | 0 | 4 | 4 |
| aX-axQMWR3c_single_material_v001 | 1 | 0 | 6 | 6 |
| aX-axQMWR3c_single_material_v001 | 2 | 0 | 5 | 5 |
| aX-axQMWR3c_single_material_v001 | 3 | 0 | 6 | 6 |
| XauLZgnWHtA_part01_partial_material_v001 | 1 | 8 | 45 | 45 |
| XauLZgnWHtA_part01_partial_material_v001 | 2 | 8 | 38 | 38 |
| XauLZgnWHtA_part01_partial_material_v001 | 3 | 8 | 42 | 42 |
