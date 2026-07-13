# candidate-ranking-v001 単独信号の机上検証

- ランキング母集団はB素材89候補・第二素材60候補。expected hitで抽出済みの24候補は使っていない。
- 各信号を単独で順位付けし、係数・合成スコアなし。上位件数は事前固定の5。
- 配信内位置は候補の最初の根拠時刻とし、早い順・遅い順を両方出して、向きを結果後に選ばない。
- title/reasonは自然言語のため、追加LLM実走なしでは根拠のない数値代理へ変換せず、今回の機械比較対象外。

| 信号 | B hit候補/5 | B 全expected Recall@5 | B 入力内 Recall@5 | 第二 hit候補/5 | 第二 全expected Recall@5 | 第二 入力内 Recall@5 | 5位同点 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| generation_order | 2/5 | 2/13 (15.4%) | 2/12 (16.7%) | 1/5 | 1/25 (4.0%) | 1/18 (5.6%) | B 一意 / 第二 一意 |
| chat_peak | 1/5 | 1/13 (7.7%) | 1/12 (8.3%) | 1/5 | 1/25 (4.0%) | 1/18 (5.6%) | B 一意 / 第二 曖昧 |
| chat_mean | 1/5 | 1/13 (7.7%) | 1/12 (8.3%) | 1/5 | 1/25 (4.0%) | 1/18 (5.6%) | B 一意 / 第二 一意 |
| evidence_shorter | 0/5 | 0/13 (0.0%) | 0/12 (0.0%) | 1/5 | 1/25 (4.0%) | 1/18 (5.6%) | B 一意 / 第二 一意 |
| evidence_longer | 0/5 | 0/13 (0.0%) | 0/12 (0.0%) | 2/5 | 5/25 (20.0%) | 5/18 (27.8%) | B 一意 / 第二 一意 |
| laughter_density | 1/5 | 1/13 (7.7%) | 1/12 (8.3%) | 1/5 | 1/25 (4.0%) | 1/18 (5.6%) | B 一意 / 第二 曖昧 |
| position_earlier | 2/5 | 2/13 (15.4%) | 2/12 (16.7%) | 1/5 | 1/25 (4.0%) | 1/18 (5.6%) | B 一意 / 第二 一意 |
| position_later | 2/5 | 1/13 (7.7%) | 1/12 (8.3%) | 1/5 | 1/25 (4.0%) | 1/18 (5.6%) | B 一意 / 第二 一意 |

## 上位5の明細

### nOEWCNc77MI_multiblock_material_v001

- generation_order: 1. candidate 1 [-] / 2. candidate 2 [1] / 3. candidate 3 [2] / 4. candidate 4 [-] / 5. candidate 5 [-]
- chat_peak: 1. candidate 2 [1] / 2. candidate 1 [-] / 3. candidate 36 [-] / 4. candidate 4 [-] / 5. candidate 5 [-]
- chat_mean: 1. candidate 2 [1] / 2. candidate 1 [-] / 3. candidate 5 [-] / 4. candidate 36 [-] / 5. candidate 38 [-]
- evidence_shorter: 1. candidate 23 [-] / 2. candidate 9 [-] / 3. candidate 22 [-] / 4. candidate 19 [-] / 5. candidate 66 [-]
- evidence_longer: 1. candidate 57 [-] / 2. candidate 70 [-] / 3. candidate 36 [-] / 4. candidate 40 [-] / 5. candidate 55 [-]
- laughter_density: 1. candidate 63 [-] / 2. candidate 52 [11] / 3. candidate 59 [-] / 4. candidate 56 [-] / 5. candidate 80 [-]
- position_earlier: 1. candidate 1 [-] / 2. candidate 2 [1] / 3. candidate 3 [2] / 4. candidate 4 [-] / 5. candidate 5 [-]
- position_later: 1. candidate 89 [-] / 2. candidate 88 [13] / 3. candidate 87 [13] / 4. candidate 86 [-] / 5. candidate 85 [-]

### 9dtwF5Exu5w_multiblock_material_v001

- generation_order: 1. candidate 1 [-] / 2. candidate 2 [-] / 3. candidate 3 [-] / 4. candidate 4 [-] / 5. candidate 5 [6]
- chat_peak: 1. candidate 59 [25] / 2. candidate 57 [-] / 3. candidate 23 [-] / 4. candidate 53 [-] / 5. candidate 49 [-]
- chat_mean: 1. candidate 59 [25] / 2. candidate 23 [-] / 3. candidate 57 [-] / 4. candidate 53 [-] / 5. candidate 49 [-]
- evidence_shorter: 1. candidate 49 [-] / 2. candidate 36 [-] / 3. candidate 30 [16] / 4. candidate 60 [-] / 5. candidate 53 [-]
- evidence_longer: 1. candidate 12 [-] / 2. candidate 16 [10,11,12,13] / 3. candidate 39 [-] / 4. candidate 8 [-] / 5. candidate 5 [6]
- laughter_density: 1. candidate 1 [-] / 2. candidate 2 [-] / 3. candidate 3 [-] / 4. candidate 4 [-] / 5. candidate 5 [6]
- position_earlier: 1. candidate 1 [-] / 2. candidate 2 [-] / 3. candidate 3 [-] / 4. candidate 4 [-] / 5. candidate 5 [6]
- position_later: 1. candidate 60 [-] / 2. candidate 59 [25] / 3. candidate 58 [-] / 4. candidate 57 [-] / 5. candidate 56 [-]

## 読み方

- 全expected Recall@5が運用全体の物差し。入力内Recall@5はランキングだけの能力を分離する補助値。
- 2素材だけなので、この表だけで恒久標準や複数信号の合成を決めない。
- 笑い表記がない候補同士の同点が大きい場合、その候補番号順を能力として解釈しない。
- 24〜25件のhit済み候補を先に抽出して順位付けすると正解由来情報のリークになるため、全89／60候補を母集団にしている。

## 結論

- 配信内位置の早い順は両素材で生成順と同じ上位5・同じRecall@5になった。生成窓順の言い換えであり、独立した改善ではない。
- チャット流速と笑い表記はB素材で悪化し、長い根拠範囲は第二素材だけ改善してB素材を0件にした。生成順を独立に改善する機械信号は0件。
- よって機械信号の単独標準化と、結果を見た後の合成は行わない。
- 最有力の次仮説は、title/reasonだけを読む意味判断ランキング。ただし本指示では実装・重み付け・追加LLM実走を行わず、人間承認待ちとする。機械信号は将来実走時の監査値として残す。
