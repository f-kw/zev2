# theme-llm-v002 → llm-v012 接続本走結果

- hit済みテーマ限定の条件付き成績
- 生成系統: llm-v012@gemini-web-flash
- 文脈: テーマ窓前後5分

## 三段階

- 一致: 0/75
- 到達: 73/75
- 不達: 2/75
- 候補単位の最良・多数決: 25候補すべて到達、候補単位の一致0

| fixture | 一致 | 到達 | 不達 | 完全な写し | 片側境界継承 | 範囲外へ出たrun |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| nOEWCNc77MI_multiblock_material_v001 | 0 | 38 | 1 | 34 | 2 | 3 |
| 9dtwF5Exu5w_multiblock_material_v001 | 0 | 35 | 1 | 31 | 4 | 2 |

## 最重要指標: 根拠範囲から区間を絞れたか

- 長さ比1未満: 3
- 長さ比1: 65
- 長さ比1超: 5
- 形式不成立: 2
- 完全な写し: 65/75 (86.7%)
- 片側境界継承: 6/75 (8.0%)
- 完全な写しまたは片側境界継承: 71/75 (94.7%)
- 判定: 選択区間≒根拠範囲の写しが支配的。±5分文脈だけでは、候補発話範囲から独立した境界探索へ移らなかった。

## 失敗型

- 形式不成立2run。B素材候補87 run2は終了時刻の桁落ちで開始より前、別素材候補16 run2はusedSpeechIdsへ入力に存在しない時刻値4379860を混入。
- 根拠範囲外へ出たrun: 5
- 未ラベル選択を含むrun: 1（非対称原則により即減点していない）
- 形式成立したrunはすべて少なくとも1件の対象expectedへ到達。テーマ範囲内で完全に外したrunは0。

## run間の揺れ

- 安定: 19候補
- 境界揺れ: 4候補（B 3/53、別素材28/59）
- 構造揺れ: 2候補（B 87、別素材16。どちらも1runの形式不成立を含む）

## 候補単位

| fixture | candidate | 一致 | 到達 | 不達 | 最良 | 多数決 | 揺れ |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| nOEWCNc77MI_multiblock_material_v001 | 2 | 0 | 3 | 0 | reach | reach | stable |
| nOEWCNc77MI_multiblock_material_v001 | 3 | 0 | 3 | 0 | reach | reach | boundary |
| nOEWCNc77MI_multiblock_material_v001 | 17 | 0 | 3 | 0 | reach | reach | stable |
| nOEWCNc77MI_multiblock_material_v001 | 32 | 0 | 3 | 0 | reach | reach | stable |
| nOEWCNc77MI_multiblock_material_v001 | 35 | 0 | 3 | 0 | reach | reach | stable |
| nOEWCNc77MI_multiblock_material_v001 | 37 | 0 | 3 | 0 | reach | reach | stable |
| nOEWCNc77MI_multiblock_material_v001 | 39 | 0 | 3 | 0 | reach | reach | stable |
| nOEWCNc77MI_multiblock_material_v001 | 41 | 0 | 3 | 0 | reach | reach | stable |
| nOEWCNc77MI_multiblock_material_v001 | 46 | 0 | 3 | 0 | reach | reach | stable |
| nOEWCNc77MI_multiblock_material_v001 | 52 | 0 | 3 | 0 | reach | reach | stable |
| nOEWCNc77MI_multiblock_material_v001 | 53 | 0 | 3 | 0 | reach | reach | boundary |
| nOEWCNc77MI_multiblock_material_v001 | 87 | 0 | 2 | 1 | reach | reach | structural |
| nOEWCNc77MI_multiblock_material_v001 | 88 | 0 | 3 | 0 | reach | reach | stable |
| 9dtwF5Exu5w_multiblock_material_v001 | 5 | 0 | 3 | 0 | reach | reach | stable |
| 9dtwF5Exu5w_multiblock_material_v001 | 9 | 0 | 3 | 0 | reach | reach | stable |
| 9dtwF5Exu5w_multiblock_material_v001 | 13 | 0 | 3 | 0 | reach | reach | stable |
| 9dtwF5Exu5w_multiblock_material_v001 | 14 | 0 | 3 | 0 | reach | reach | stable |
| 9dtwF5Exu5w_multiblock_material_v001 | 16 | 0 | 2 | 1 | reach | reach | structural |
| 9dtwF5Exu5w_multiblock_material_v001 | 22 | 0 | 3 | 0 | reach | reach | stable |
| 9dtwF5Exu5w_multiblock_material_v001 | 28 | 0 | 3 | 0 | reach | reach | boundary |
| 9dtwF5Exu5w_multiblock_material_v001 | 30 | 0 | 3 | 0 | reach | reach | stable |
| 9dtwF5Exu5w_multiblock_material_v001 | 44 | 0 | 3 | 0 | reach | reach | stable |
| 9dtwF5Exu5w_multiblock_material_v001 | 52 | 0 | 3 | 0 | reach | reach | stable |
| 9dtwF5Exu5w_multiblock_material_v001 | 54 | 0 | 3 | 0 | reach | reach | stable |
| 9dtwF5Exu5w_multiblock_material_v001 | 59 | 0 | 3 | 0 | reach | reach | boundary |

