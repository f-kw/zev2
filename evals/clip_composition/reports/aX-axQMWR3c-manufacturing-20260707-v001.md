# aX-axQMWR3c 3件目fixture候補 製造レポート

- 実施日: 2026-07-07
- 対象切り抜き: `aX-axQMWR3c`
- 元配信候補: `SGQqVJXsNNE`
- 状態: 音声分離確認で素材対応サンプル全run一致。fixture凍結前
- fixture/expected作成: なし
- confirmedペア変更: なし
- 本体側変更: なし

## 取得

| 種別 | パス |
| --- | --- |
| 切り抜き動画 | `evals/clip_composition/research/downloads/aX-axQMWR3c/aX-axQMWR3c.mp4` |
| 切り抜きメタ情報 | `evals/clip_composition/research/downloads/aX-axQMWR3c/aX-axQMWR3c.info.json` |
| 元配信動画 | `evals/clip_composition/research/downloads/aX-axQMWR3c/sources/SGQqVJXsNNE/SGQqVJXsNNE.mp4` |
| 元配信メタ情報 | `evals/clip_composition/research/downloads/aX-axQMWR3c/sources/SGQqVJXsNNE/SGQqVJXsNNE.info.json` |
| STTターゲット | `evals/clip_composition/stt-targets/aX-axQMWR3c.json` |

## STT

| 対象 | STT ID | チャンク | 発話/単語数 | 出力 |
| --- | --- | ---: | ---: | --- |
| 切り抜き | `aX-axQMWR3c` | 30秒 x 6 | 541 | `evals/clip_composition/stt/aX-axQMWR3c/clip/word-timestamps.json` |
| 元配信 | `aX-axQMWR3c_SGQqVJXsNNE_local30_v001` | 30秒 x 171 | 21248 | `evals/clip_composition/stt/aX-axQMWR3c_SGQqVJXsNNE_local30_v001/source/word-timestamps.json` |

300秒チャンクでは、元配信の2チャンク目でSTTサーバーが複数回応答不能になったため、切り抜き側と同じ30秒チャンクで作成した。30秒チャンクでは完走した。

## DP単調照合

| 項目 | 値 |
| --- | ---: |
| DP対応点 | 456 |
| 全直線分 | 65 |
| 確認候補直線分 | 10 |
| オフセット跳び候補 | 22 |
| 局所連続修復 | 12 |

成果物:

- JSON: `evals/clip_composition/outputs/global-dp-word-alignment-aX-axQMWR3c-20260707-global-dp-local30-v001.json`
- レポート: `evals/clip_composition/reports/global-dp-word-alignment-aX-axQMWR3c-20260707-global-dp-local30-v001.md`
- 散布図: `evals/clip_composition/outputs/plots/global-dp-word-alignment-aX-axQMWR3c-20260707-global-dp-local30-v001.svg`

## 素材ブロック再構成

| block | clip範囲 | source範囲 | 対応語 | 内部詰め候補 |
| ---: | --- | --- | ---: | --- |
| 1 | `0:27.258-2:29.530` | `82:02.443-84:16.495` | 326 | source側 8878ms / clip側 742ms |

10秒以上の素材飛び境界は0件。今回の候補は、複数素材ブロックではなく単一区間寄りの候補として扱う。

成果物:

- JSON: `evals/clip_composition/outputs/material-blocks-aX-axQMWR3c-20260707-material-boundaries-v001.json`
- レポート: `evals/clip_composition/reports/material-blocks-aX-axQMWR3c-20260707-material-boundaries-v001.md`
- 境界HTML: `evals/clip_composition/outputs/boundary-check/aX-axQMWR3c/20260707-material-boundaries-v001/index.html`

境界候補が0件のため、境界HTMLはブロック表のみになる。人間確認用には、候補直線分ごとの左右比較動画を別パッケージとして作成した。

## 人間確認用パッケージ

- HTML: `evals/clip_composition/outputs/block-check/aX-axQMWR3c/20260707-material-block-review-v001/index.html`
- レポート: `evals/clip_composition/reports/material-block-review-aX-axQMWR3c-20260707-material-block-review-v001.md`
- 左右比較動画: 10本

確認すること:

- 各動画は左が切り抜き、右が元配信。
- 候補直線分ごとに、同じ発話に見えるかを見る。
- 境界候補は0件なので、ここでは素材飛びの有無ではなく、単一区間対応として妥当かを見る。

## 人間確認結果

| 項目 | 内容 |
| --- | --- |
| 確認日 | 2026-07-07 |
| 確認者 | kawafmm |
| 確認手段 | 音声分離確認パッケージ(v002) |
| 結果 | 全run一致 |
| 確認HTML | `evals/clip_composition/outputs/block-check/aX-axQMWR3c/20260707-material-block-audio-review-v002/index.html` |

同時再生版では一部runが不一致または判定困難に見えたが、画面変化が少なく音声だけを同時に聴く形式では人間判定が安定しなかった。音声を切り抜き側と元配信側に分離して順番に聴く形式では全run一致と確認された。

## 次の判断

人間確認で10本の対応が一致したため、この候補は「単一区間fixture候補」として扱える。複数区間・crossfade接続のfixtureを増やす目的なら、この候補は条件に弱いため、別の3件目候補を探す判断になる。

fixture凍結はここでは行わない。人間確認後に進める場合も、2件目部分fixtureと同じく、全素材ブロックがconfirmedになり、正解区間から人間が逆算して書いた固定テーマ入力が揃うまで凍結しない。
