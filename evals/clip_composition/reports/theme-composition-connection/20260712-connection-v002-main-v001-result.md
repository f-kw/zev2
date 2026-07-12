# connection-v002 / llm-v013 接続本走結果

- hit済みテーマ限定の条件付き成績
- 生成系統: llm-v013@gemini-web-flash
- 比較元: llm-v012@gemini-web-flash / connection-v001
- 文脈: テーマ窓前後5分

## v001との比較

| 指標 | connection-v001 | connection-v002 | 差 |
| --- | ---: | ---: | ---: |
| 一致run | 0 | 0 | 0 |
| 到達以上run | 73 | 74 | 1 |
| 完全な写し | 65 | 40 | -25 |
| 完全な写しまたは片側境界継承 | 71 | 68 | -3 |
| 範囲内で別場面を選んだ事故 | 0 | 0 | 0 |

- 撤退条件: 非該当。候補単位の多数決で到達以上は 25/25。
- 完全な写しは 86.7% から 53.3% へ減ったが、根拠境界を少なくとも片側に使うrunは 94.7% から 90.7% で、境界依存は残った。

## 三段階

- 一致: 0/75
- 到達: 74/75
- 不達: 1/75

## 根拠範囲の写し

- 長さ比1未満: 1
- 長さ比1: 40
- 長さ比1超: 33
- 形式不成立: 1
- 完全な写し: 40/75 (53.3%)
- 片側境界継承: 28/75 (37.3%)

## 失敗と揺れ

- 範囲内で別場面を選んだ事故: 0
- 形式不成立: 1
  - nOEWCNc77MI_multiblock_material_v001 candidate 32 run 1: cut-1-usedSpeechIds-syntax
- 根拠範囲外へ出たrun: 33
- 安定 14候補 / 境界揺れ 10候補 / 構造揺れ 1候補

## 判定

- 事前登録した自動撤退条件には該当しない。一方、一致は0のままで、中心照準契約を正式採用する根拠も得られなかった。v013は接続実験版として保持し、採用判断は保留する。

## 候補単位

| fixture | candidate | 一致 | 到達 | 不達 | 最良 | 多数決 | 揺れ |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| nOEWCNc77MI_multiblock_material_v001 | 2 | 0 | 3 | 0 | reach | reach | stable |
| nOEWCNc77MI_multiblock_material_v001 | 3 | 0 | 3 | 0 | reach | reach | stable |
| nOEWCNc77MI_multiblock_material_v001 | 17 | 0 | 3 | 0 | reach | reach | boundary |
| nOEWCNc77MI_multiblock_material_v001 | 32 | 0 | 2 | 1 | reach | reach | structural |
| nOEWCNc77MI_multiblock_material_v001 | 35 | 0 | 3 | 0 | reach | reach | stable |
| nOEWCNc77MI_multiblock_material_v001 | 37 | 0 | 3 | 0 | reach | reach | stable |
| nOEWCNc77MI_multiblock_material_v001 | 39 | 0 | 3 | 0 | reach | reach | boundary |
| nOEWCNc77MI_multiblock_material_v001 | 41 | 0 | 3 | 0 | reach | reach | stable |
| nOEWCNc77MI_multiblock_material_v001 | 46 | 0 | 3 | 0 | reach | reach | stable |
| nOEWCNc77MI_multiblock_material_v001 | 52 | 0 | 3 | 0 | reach | reach | boundary |
| nOEWCNc77MI_multiblock_material_v001 | 53 | 0 | 3 | 0 | reach | reach | stable |
| nOEWCNc77MI_multiblock_material_v001 | 87 | 0 | 3 | 0 | reach | reach | stable |
| nOEWCNc77MI_multiblock_material_v001 | 88 | 0 | 3 | 0 | reach | reach | boundary |
| 9dtwF5Exu5w_multiblock_material_v001 | 5 | 0 | 3 | 0 | reach | reach | boundary |
| 9dtwF5Exu5w_multiblock_material_v001 | 9 | 0 | 3 | 0 | reach | reach | boundary |
| 9dtwF5Exu5w_multiblock_material_v001 | 13 | 0 | 3 | 0 | reach | reach | boundary |
| 9dtwF5Exu5w_multiblock_material_v001 | 14 | 0 | 3 | 0 | reach | reach | stable |
| 9dtwF5Exu5w_multiblock_material_v001 | 16 | 0 | 3 | 0 | reach | reach | boundary |
| 9dtwF5Exu5w_multiblock_material_v001 | 22 | 0 | 3 | 0 | reach | reach | boundary |
| 9dtwF5Exu5w_multiblock_material_v001 | 28 | 0 | 3 | 0 | reach | reach | stable |
| 9dtwF5Exu5w_multiblock_material_v001 | 30 | 0 | 3 | 0 | reach | reach | boundary |
| 9dtwF5Exu5w_multiblock_material_v001 | 44 | 0 | 3 | 0 | reach | reach | stable |
| 9dtwF5Exu5w_multiblock_material_v001 | 52 | 0 | 3 | 0 | reach | reach | stable |
| 9dtwF5Exu5w_multiblock_material_v001 | 54 | 0 | 3 | 0 | reach | reach | stable |
| 9dtwF5Exu5w_multiblock_material_v001 | 59 | 0 | 3 | 0 | reach | reach | stable |
