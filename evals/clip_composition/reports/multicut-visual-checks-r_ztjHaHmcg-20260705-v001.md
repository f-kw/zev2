# 複数区間目視確認動画

- 対象: r_ztjHaHmcg
- 結果JSON: outputs/multicut-visual-checks-r_ztjHaHmcg-20260705-v001.json
- 切り抜き動画: evals/clip_composition/research/downloads/r_ztjHaHmcg/r_ztjHaHmcg.mp4
- 元動画: evals/clip_composition/research/downloads/r_ztjHaHmcg/sources/-DwSCDMCWDQ/-DwSCDMCWDQ.mp4

## 生成物

### チャンク 1

- 確認動画: evals/clip_composition/outputs/visual-check/r_ztjHaHmcg/multicut_r_ztjHaHmcg_20260705-v001_chunk01.mp4
- 切り抜き側: 0:02.555 - 0:32.555
- 元動画側: 36:19.930 - 36:49.930
- 前チャンクとの関係: first
- 生成状態: rendered

### チャンク 2

- 確認動画: evals/clip_composition/outputs/visual-check/r_ztjHaHmcg/multicut_r_ztjHaHmcg_20260705-v001_chunk02.mp4
- 切り抜き側: 0:32.555 - 1:02.555
- 元動画側: 38:29.360 - 38:59.360
- 前チャンクとの関係: gap
- 生成状態: rendered

### チャンク 3

- 確認動画: evals/clip_composition/outputs/visual-check/r_ztjHaHmcg/multicut_r_ztjHaHmcg_20260705-v001_chunk03.mp4
- 切り抜き側: 1:02.555 - 1:32.555
- 元動画側: 39:21.159 - 39:51.159
- 前チャンクとの関係: gap
- 生成状態: rendered

### チャンク 4

- 確認動画: evals/clip_composition/outputs/visual-check/r_ztjHaHmcg/multicut_r_ztjHaHmcg_20260705-v001_chunk04.mp4
- 切り抜き側: 1:32.555 - 2:01.147
- 元動画側: 40:04.730 - 40:33.322
- 前チャンクとの関係: gap
- 生成状態: rendered

## 次の作業

- 生成した各チャンク動画をWeb版Geminiへ渡し、切り抜き側と元動画側が同じ元ネタか確認する。
- Geminiまたは人間確認で一致したチャンクだけをexpectedCuts候補に残す。
- 固定テーマは確認済み区間から人間が逆算して書く。
- 複数区間expectedを採点できるようにscore側を拡張してからcomposition評価へ入れる。
