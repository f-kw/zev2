# 複数区間 静止画確認パッケージ

- 結果JSON: `outputs/multicut-still-check-r_ztjHaHmcg-20260705-needs-cutpoint-v001.json`
- 対象: `r_ztjHaHmcg`
- 状態: fixture凍結は保留
- 目的: 固定幅30秒チャンクの途中ずれを、人間が短時間で確認できるようにする。

## 人間目視の結果

- chunk1: 最初が一致。チャンク全体を連続した同一元区間としては固定しない。
- chunk2: 途中から一致。固定幅チャンクの途中に未検出の繋ぎ目がある可能性がある。
- chunk3: 途中から一致。固定幅チャンクの途中に未検出の繋ぎ目がある可能性がある。
- chunk4: 完全一致。

## 静止画

| chunk | head | mid | tail |
| ---: | --- | --- | --- |
| 1 | `outputs/visual-check/r_ztjHaHmcg/stills-20260705-needs-cutpoint-v001/chunk01_head.jpg` | `outputs/visual-check/r_ztjHaHmcg/stills-20260705-needs-cutpoint-v001/chunk01_mid.jpg` | `outputs/visual-check/r_ztjHaHmcg/stills-20260705-needs-cutpoint-v001/chunk01_tail.jpg` |
| 2 | `outputs/visual-check/r_ztjHaHmcg/stills-20260705-needs-cutpoint-v001/chunk02_head.jpg` | `outputs/visual-check/r_ztjHaHmcg/stills-20260705-needs-cutpoint-v001/chunk02_mid.jpg` | `outputs/visual-check/r_ztjHaHmcg/stills-20260705-needs-cutpoint-v001/chunk02_tail.jpg` |
| 3 | `outputs/visual-check/r_ztjHaHmcg/stills-20260705-needs-cutpoint-v001/chunk03_head.jpg` | `outputs/visual-check/r_ztjHaHmcg/stills-20260705-needs-cutpoint-v001/chunk03_mid.jpg` | `outputs/visual-check/r_ztjHaHmcg/stills-20260705-needs-cutpoint-v001/chunk03_tail.jpg` |
| 4 | `outputs/visual-check/r_ztjHaHmcg/stills-20260705-needs-cutpoint-v001/chunk04_head.jpg` | `outputs/visual-check/r_ztjHaHmcg/stills-20260705-needs-cutpoint-v001/chunk04_mid.jpg` | `outputs/visual-check/r_ztjHaHmcg/stills-20260705-needs-cutpoint-v001/chunk04_tail.jpg` |

## 判断

- この静止画パッケージは自動判定ではない。
- 現在の4チャンクは、正解データとして凍結しない。
- 次は切り抜き側のカット点または音声不連続点を検出し、固定幅30秒ではなく可変長セグメントで照合し直す。

## 本体影響

- runtime/ への書き込みなし
- fixtures/ への書き込みなし
- expected/ への書き込みなし
- 本番UI/API/キュー/DBへの変更なし
