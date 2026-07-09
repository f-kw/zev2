# B素材5件目fixture化の開始記録 2026-07-10 v001

## 目的

B素材 `nOEWCNc77MI` を、テーマ生成評価の5件目fixture候補として正式に製造対象へ移す。

発動理由は、theme-llm-v001の人間監査が素材選定の失敗で中断したため。
確認者が判断可能なホロライブ/宝鐘マリン系素材を使い、theme-llm-v002の範囲hit採点に物差しを戻す。

## 対象

| 種別 | ID | 内容 | 状態 |
| --- | --- | --- | --- |
| 切り抜き | `nOEWCNc77MI` | ころねのボケ連発で過去1番の大笑いをするマリン船長まとめ | 取得済み、ローカルSTT済み |
| 元配信 | `YE-faluP7zY` | 【Raft】ころね、キミさえいればこの海の果てまでだって── | 取得済み、部分ローカルSTT済み |

## RUNBOOK照合

| 工程 | 状態 | 現在の証拠 | 凍結可否 |
| --- | --- | --- | --- |
| 切り抜き取得 | 完了 | `research/downloads/nOEWCNc77MI/nOEWCNc77MI.mp4` | 可 |
| 元配信候補特定 | 完了 | `YE-faluP7zY` を主候補として記録済み | 可 |
| 切り抜き側ローカルSTT | 完了 | `stt/nOEWCNc77MI/clip/` | 可 |
| 元配信側ローカルSTT | 部分完了 | selected windows、first50、rough top50の一部 | 不足 |
| DP照合 | 部分完了 | selected windowsベースのDP結果 | 凍結根拠としては不足 |
| 素材ブロック再構成 | 部分完了 | 6ブロック、5境界 | 人間確認前 |
| 人間確認 | 未実施 | 境界確認HTMLは生成済み | 不可 |
| 固定テーマ | 未設定 | 人間確認後に逆算して書く | 不可 |
| fixture/expected凍結 | 未実施 | readyForFreeze false | 不可 |

## 既存の部分成果

- STT対象台帳: `evals/clip_composition/stt-targets/nOEWCNc77MI.json`
- selected windows DP: `evals/clip_composition/outputs/global-dp-word-alignment-nOEWCNc77MI_YE-faluP7zY_selected_windows_20260709_redo_v001_dp.json`
- 素材ブロック: `evals/clip_composition/outputs/material-blocks-nOEWCNc77MI-20260709-redo-selected-windows-v001.json`
- 境界確認HTML: `evals/clip_composition/outputs/boundary-check/nOEWCNc77MI/20260709-redo-selected-windows-v001/index.html`

selected windowsの素材ブロックは6件。
ただしこれは粗探索で当てた元配信候補窓だけをローカルSTTした結果であり、全域STTからの凍結根拠ではない。
RUNBOOK上は、人間確認前の候補パッケージとして扱い、fixture/expectedにはまだ入れない。

## 現在のブロッカー

`http://192.168.1.4:8000/health` がタイムアウトしている。
そのため、元配信側の残りローカルSTTと発話量上位50のSTT再開ができない。

ローカルSTTサーバーが復旧するまで、YouTube自動字幕や途中STTを凍結根拠にしてはいけない。

## 次に実行すること

STTサーバー復旧後:

1. 発話量上位50の残りSTTを完了する。
2. 必要なら、B素材のfixture凍結用に元配信全域または候補範囲の追加ローカルSTTを行う。
3. DP照合を再実行し、素材ブロックを再構成する。
4. 人間確認パッケージを、少数・明確な問いに絞って作る。
5. 人間確認後、固定テーマを人間が逆算して書く。
6. dry-runを通してから、fixture/expectedを凍結する。

## 制約確認

- この記録ではfixture/expectedを作成しない。
- 既存confirmedペアを変更しない。
- runtime、本体UI/API/キュー/DBへ書き込まない。
- STT未完了データをLLM入力または凍結根拠にしない。
