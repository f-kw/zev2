# r_ztjHaHmcg YouTube自動字幕照合 v001

## 目的

STTサーバー停止中に、切り抜き `r_ztjHaHmcg` が本当に元動画 `-DwSCDMCWDQ` のどの箇所から作られているかを、YouTube自動字幕と音声比較で確認する。

この結果は `expectedCuts` の確定ではない。fixture化前の候補確認である。

## 入力

- 切り抜き: `evals/clip_composition/research/downloads/r_ztjHaHmcg/r_ztjHaHmcg.mp4`
- 元動画候補: `evals/clip_composition/research/downloads/r_ztjHaHmcg/sources/-DwSCDMCWDQ/-DwSCDMCWDQ.mp4`
- YouTube自動字幕: `evals/clip_composition/research/downloads/r_ztjHaHmcg/sources/-DwSCDMCWDQ/subtitles/-DwSCDMCWDQ.ja-orig.json3`
- 変換後字幕STT: `evals/clip_composition/stt/r_ztjHaHmcg_-DwSCDMCWDQ_youtube_auto/source/word-timestamps.json`

## 先に否定された候補

音声粗スキャンの最上位だった `11:34.445 - 13:39.717` は、Web版Gemini Flashで同一元ネタではないと判定された。

- 保存先: `evals/clip_composition/outputs/r_ztjHaHmcg/visual_verification/20260705-gemini-web-flash-audio-scan-v001.json`
- 理由: 切り抜きは「同接100人」や「2018年のアナリティクス」の話題だが、11分台の元動画候補は引っ越し・回線・PC契約寄りの別話題だった。

## 本命候補

YouTube自動字幕を既存のSTT形式へ変換し、切り抜き側STTを30秒単位で元動画全域へ照合した。

出力:

- 字幕チャンク照合JSON: `evals/clip_composition/outputs/alignment-r_ztjHaHmcg_youtube_auto_v001.json`
- 字幕チャンク照合レポート: `evals/clip_composition/reports/alignment-r_ztjHaHmcg_youtube_auto_v001.md`
- チャンク音声比較JSON: `evals/clip_composition/outputs/audio-compare-chunks-r_ztjHaHmcg_youtube_auto_v001.json`
- チャンク音声比較レポート: `evals/clip_composition/reports/audio-compare-chunks-r_ztjHaHmcg_youtube_auto_v001.md`

## チャンク別結果

| 切り抜き範囲 | 字幕照合の元動画候補 | 音声が最も寄った元動画範囲 | テキスト一致 | 音量包絡相関 |
|---|---:|---:|---:|---:|
| 0:02.555 - 0:32.555 | 36:14.150 - 37:21.110 | 36:19.930 - 36:49.930 | 76.4% | 0.298622 |
| 0:32.555 - 1:02.555 | 37:44.980 - 39:01.049 | 38:29.360 - 38:59.360 | 56.4% | 0.612458 |
| 1:02.555 - 1:32.555 | 39:01.049 - 40:07.649 | 39:21.159 - 39:51.159 | 75.3% | 0.526415 |
| 1:32.555 - 2:01.147 | 40:02.850 - 40:38.059 | 40:04.730 - 40:33.322 | 81.6% | 0.593818 |

## 暫定判断

- 元動画候補 `-DwSCDMCWDQ` 自体は正しい可能性が高い。
- 切り抜きは、元動画の `36:19` 付近から `40:33` 付近までをそのまま連続で抜いたものではなく、待ち時間や別コメントへの反応を詰めて編集している可能性が高い。
- そのため、このfixtureを `sourceStartMs` と `sourceEndMs` だけの単一区間として固定すると、切り抜きに含まれない元動画の間が混ざる。
- 評価データにするなら、チャンク対応を保持できる形にするか、単一区間fixtureとして扱える別候補を選ぶ必要がある。

## 次に必要な確認

1. 元動画側ローカルSTTを復旧後に実行し、YouTube自動字幕由来の誤認識を置き換える。
2. Web版Geminiまたは人間の目視・聴取で、36分台から40分台のチャンク対応が同一元ネタであることを確認する。
3. `expectedCuts` を単一区間で持つか、複数区間で持つかを決める。
4. 単一区間しか評価できないなら、この候補は2件目fixtureとしては保留し、より連続区間の短尺切り抜きを使う。
