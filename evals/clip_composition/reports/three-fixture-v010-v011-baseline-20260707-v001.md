# 3fixture構成 v010/v011/baseline-rule 比較

- 実施日: 2026-07-07
- 比較対象fixture:
  - `UpRyakf5j80_clip_audio_v001`
  - `r_ztjHaHmcg_partial_material_v001`
  - `aX-axQMWR3c_single_material_v001`
- 比較レポート: `evals/clip_composition/reports/prompt-result-comparison-20260707-three-fixture-v010-v011-baseline-v001.md`
- 比較JSON: `evals/clip_composition/outputs/prompt-result-comparison-20260707-three-fixture-v010-v011-baseline-v001.json`

## 3件目fixtureの凍結

`aX-axQMWR3c_single_material_v001` を、通常ガードを通した単一区間fixtureとして凍結した。

| 項目 | 内容 |
| --- | --- |
| 固定テーマ | `Vの組織内あれこれ` |
| clip範囲 | `0:27.258-2:29.530` |
| source範囲 | `82:02.443-84:16.495` |
| source上の期待区間 | `4922443-5056495` |
| source区間長 | `134052ms` |
| clip区間長 | `122272ms` |
| 内部詰め注記 | source側余剰 `8878ms`、clip側余剰 `742ms` |
| 人間確認 | 音声分離確認パッケージ v002 で全run一致 |
| 品質等級 | 素材ブロック粒度 |

このfixtureでは、素材対応の切り替わり点だけをexpectedCutsの境界とし、同一素材内の詰めは `internalGapMs` として扱う。

## 三系統比較

| fixture | baseline-rule | llm-v010 runs 3 | llm-v011 runs 3 | 読み取り |
| --- | --- | --- | --- | --- |
| `UpRyakf5j80_clip_audio_v001` | 1区間選択。開始 `-2061ms`、終了 `+1992ms`。重なりあり、完全一致なし | 3回とも1区間。開始 `-360ms` 固定、終了は `-2328ms` 2回 / `-1718ms` 1回 | 3回とも1区間。開始 `-360ms`、終了 `-2328ms` で固定 | LLMはbaseline-ruleより開始が近い。終了は短めに切る傾向がある |
| `r_ztjHaHmcg_partial_material_v001` | 6期待区間すべて完全一致 | 選択区間数は `4/5/3`。完全一致は `3/5/2`。期待区間2は3回とも未選択 | 選択区間数は `4/5/4`。完全一致は `3/5/2`。期待区間2は3回とも未選択 | 複数区間fixtureではLLMの揺れは境界より構造に出る。区間3/4の過結合も残る |
| `aX-axQMWR3c_single_material_v001` | 1区間選択。開始 `0ms`、終了 `0ms`。完全一致 | 3回とも1区間。開始 `0ms`、終了 `0ms`。完全一致 | 3回とも1区間。開始 `0ms`、終了 `0ms`。完全一致 | 初見の長尺単一区間では、v010/v011/baseline-ruleの全系統が期待区間に一致 |

## 3件目の長尺単一区間の結果

`aX-axQMWR3c_single_material_v001` は、2分14秒の長尺単一区間で、内部詰め候補が約9秒ある。v010/v011はいずれも内部詰めを別区間として切らず、単一区間として返した。

| 系統 | run | 選択区間 | 開始ずれ | 終了ずれ | 判定 |
| --- | ---: | --- | ---: | ---: | --- |
| llm-v010 | 1 | `4922443-5056495` | `0ms` | `0ms` | 完全一致 |
| llm-v010 | 2 | `4922443-5056495` | `0ms` | `0ms` | 完全一致 |
| llm-v010 | 3 | `4922443-5056495` | `0ms` | `0ms` | 完全一致 |
| llm-v011 | 1 | `4922443-5056495` | `0ms` | `0ms` | 完全一致 |
| llm-v011 | 2 | `4922443-5056495` | `0ms` | `0ms` | 完全一致 |
| llm-v011 | 3 | `4922443-5056495` | `0ms` | `0ms` | 完全一致 |
| baseline-rule | 1 | `4922443-5056495` | `0ms` | `0ms` | 完全一致 |

v010/v011とも、この3件目では選択区間数、開始位置、終了位置の揺れはない。

## baseline-ruleの成績

baseline-ruleは、今回の3fixture構成では以下の状態。

- `UpRyakf5j80_clip_audio_v001`: 期待区間と重なるが、開始が約2.1秒早く、終了が約2.0秒遅い。完全一致ではない。
- `r_ztjHaHmcg_partial_material_v001`: 6期待区間すべて完全一致。
- `aX-axQMWR3c_single_material_v001`: 期待区間と完全一致。

baseline-ruleは、fixture入力の固定テーマと素材ブロックが正しく与えられている場合は強い。ただし1件目の境界では、期待境界より広く取る挙動が残っている。

## LLM runs 3 の揺れ

- 1件目: v010は終了が `610ms` 揺れた。v011は3回固定。
- 2件目: v010/v011とも構造が揺れた。期待区間2は全runで未選択。区間3と4を1本に過結合するrunがある。
- 3件目: v010/v011とも構造・境界とも揺れなし。

このため、LLM評価では、単一区間fixtureだけでは構造揺れを検出できない。複数区間fixtureではruns 3以上が必要という判断は維持する。

## 期待区間2の入力診断

対象: `r_ztjHaHmcg_partial_material_v001` の期待区間2。

結論は、仮説A「テキスト上に採用手掛かりはあるがLLMが見落としている」は弱く、仮説B「テキスト上の採用手掛かりが弱く、入力表現上は落ちやすい」が強い。

根拠:

- 期待区間2の本文は `だし昔のアナリティクス見` で、文として閉じていない。
- 前後の発話単位も断片的で、区間2を採用すべき文脈を補強していない。
- 区間2の後ろは未解決除外区間に接しており、入力上は続きが抜けている。
- 区間3と4の間には入力発話がなく、本文だけでは素材飛びの分離根拠が見えない。

したがって次に触るべき主対象は、v012プロンプトではなく、入力に素材ブロック候補や除外区間隣接の意味をどう渡すかである。

詳細: `evals/clip_composition/reports/expected-cut2-input-diagnosis-r_ztjHaHmcg-20260706-v001.md`

## 3件目clip冒頭の調査

対象: `aX-axQMWR3c` の clip `0:00.000-0:27.258`。

判定: STT出力は存在する。無発話やSTT欠落ではない。

この冒頭部には clip `0:03.098-0:27.258` に96語のSTTがある。内容は「4人が社長で同じ立場」という導入説明に見える。ただしDP上では、安定した1本の素材ブロック候補ではなく、31個の短い対応断片と6件の対応オフセット跳びに分断されていた。

そのため、今回の3件目fixtureには含めず、「STTはあるが素材対応の物理確認がまだない未確定冒頭」として扱うのが妥当。

詳細: `evals/clip_composition/reports/aX-axQMWR3c-unmatched-head-diagnosis-20260707-v001.md`

## 実行上の注記

Web Geminiの一部runでは、画面本文の自動抽出がプロンプト内のfew-shot例を拾った。該当runは、保存済みの生回答本文の先頭にある実回答から `selectedCuts` を復元し、復元した事実を採点パラメータに記録した。

対象:

- `aX-axQMWR3c_single_material_v001` / llm-v010 run1
- `aX-axQMWR3c_single_material_v001` / llm-v010 run2
- `aX-axQMWR3c_single_material_v001` / llm-v011 run2

復元は画面抽出層の修復であり、区間判断そのものはWeb Geminiの生回答本文に基づく。
