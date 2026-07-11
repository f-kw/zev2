# input-selection-v004 実走前の上限確認

## 結論

- v003で唯一missしたのは expected 11 / block 14（5,183,974–5,189,318ms）。
- チャット流速上位100分で唯一入力外になるのは expected 10 / block 13（4,877,136–4,889,844ms、流速136位）。
- 2件は同一区間ではない。
- v004の入力可視性による理論上限は12/13。
- v003の12 hitにはexpected 10が含まれるため、v004はそのhitを入力選定時点で失う。一方、v003でmissしたexpected 11はv004でも入力内に残る。

したがって、v003と同じ候補選択傾向のままなら、v003のhitを11件保持するのが事前期待になる。v004が12/13へ達するには、入力外になったexpected 10の代わりに、v003でmissしたexpected 11を新たに拾う必要がある。

## 実走条件

- 入力選定: `input-selection-v004`。チャット流速上位100分。配信内の完全な1分区間の平均を1.0とする相対順位で選ぶ。
- N=100はB素材1本のexpectedを参照して選んだ閾値であり、汎化未検証。
- プロンプト: `theme_generation_prompt_v002`
- 生成系統: `theme-llm-v002@gemini-web-flash`
- run: 1
- 1窓のbyte上限: 13,084 bytes
- 窓間重複: 0ms
- 1窓あたり候補上限: 8
- 統合: 同一元配信で根拠範囲が重なる候補だけを機械統合。
- 採点: 入力内expected、入力外expected、全expectedを分離する既存正式採点器。
- 変更する変数はモデルへ渡す元配信範囲だけ。プロンプト、モデル、窓分割、統合規則、採点器はv003から変えない。

## 証拠

- v003正式採点: `outputs/theme-generation/theme-llm-v002-20260711-B-full-source-input-selection-v003-upper-bound-v001-formal-score.json`
- チャット流速机上検証: `outputs/chat-velocity-analysis/nOEWCNc77MI-chat-velocity-simulation-20260711-v001.json`
- 凍結expected: `expected/nOEWCNc77MI_multiblock_material_v001.json`

## 生成後の入力検証

- source-only選択計画: 上位100分、合計6,000,000ms。expected、切り抜き本文、チャット本文、投稿者名を含まない。
- 実入力で見えるexpected: 12/13。入力外はexpected 10 / block 13だけ。
- 生成窓: 37窓。
- リーク検査: 全体入力1件＋37窓の38/38 pass。
- v003と入力発話以外のmodelInputを比較: 完全一致。
- v003との窓条件比較: プロンプト版、1窓候補上限、run数、byte上限、重複、境界補完の全項目が一致。
- 窓数だけは入力発話量に応じて69窓から37窓へ減少しており、分割規則の変更ではない。

実走bundle: `outputs/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001`
