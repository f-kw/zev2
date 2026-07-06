# 複数区間 カット点ベース再照合レポート

- 結果JSON: outputs/cutpoint-realignment-r_ztjHaHmcg-20260706-local-stt-300s-v001.json
- 旧30秒方式アーカイブ: outputs/archive/fixed30-alignment-r_ztjHaHmcg-20260706-local-stt-300s-v001.json
- 静止画比較パッケージ: outputs/visual-check/r_ztjHaHmcg/cutpoint-20260706-local-stt-300s-v001
- fixture凍結: no
- readyForFreeze: false

## 方針

- 固定30秒幅ではなく、切り抜き側の音声不連続候補と映像シーンチェンジ候補から可変長セグメントを作る。
- 音声不連続候補を先に採用し、映像シーンチェンジ候補は補助として追加する。
- 整合率は、単語タイムスタンプ対応が線形に続いた最長区間の長さをセグメント長で割った値。
- 整合率は自動凍結条件ではなく、人間確認のための数値として読む。

## 新セグメント

| seg | clip | source | text | linear | inherited | stills |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 0:02.555-0:13.040 | 36:14.596-36:34.118 | 85.5% | 24.2% | requires_review | segment01_head/mid/tail.jpg |
| 2 | 0:13.040-0:19.367 | 36:33.738-36:51.736 | 85.7% | 32% | requires_review | segment02_head/mid/tail.jpg |
| 3 | 0:19.367-0:53.370 | 36:48.532-37:38.575 | 83.1% | 26.3% | requires_review | segment03_head/mid/tail.jpg |
| 4 | 0:53.370-0:59.680 | 38:35.887-38:56.728 | 83.3% | 59.5% | requires_review | segment04_head/mid/tail.jpg |
| 5 | 0:59.680-1:04.100 | 38:56.468-39:00.910 | 92% | 100% | requires_review | segment05_head/mid/tail.jpg |
| 6 | 1:04.100-1:06.540 | 39:00.850-39:03.230 | 89.5% | 95.6% | requires_review | segment06_head/mid/tail.jpg |
| 7 | 1:06.540-1:08.910 | 39:03.230-39:07.532 | 100% | 61.4% | requires_review | segment07_head/mid/tail.jpg |
| 8 | 1:08.910-1:15.233 | 39:11.013-39:33.874 | 71.2% | 63.8% | requires_review | segment08_head/mid/tail.jpg |
| 9 | 1:15.233-1:24.960 | 39:33.814-39:43.662 | 98.1% | 96.8% | requires_review | segment09_head/mid/tail.jpg |
| 10 | 1:24.960-1:27.233 | 39:43.562-39:44.983 | 100% | 60.7% | requires_review | segment10_head/mid/tail.jpg |
| 11 | 1:27.233-1:37.000 | 39:44.963-40:09.298 | 100% | 97.5% | requires_review | segment11_head/mid/tail.jpg |
| 12 | 1:37.000-1:41.100 | 40:08.618-40:13.402 | 100% | 76.5% | requires_review | segment12_head/mid/tail.jpg |
| 13 | 1:41.100-1:45.390 | 40:12.721-40:17.625 | 100% | 73.8% | requires_review | segment13_head/mid/tail.jpg |
| 14 | 1:45.390-1:49.120 | 40:17.545-40:21.348 | 100% | 45% | requires_review | segment14_head/mid/tail.jpg |
| 15 | 1:49.120-1:56.470 | 40:21.228-40:29.701 | 86.4% | 38.1% | requires_review | segment15_head/mid/tail.jpg |
| 16 | 1:56.470-2:01.147 | 40:31.422-40:40.868 | 100% | 100% | requires_review | segment16_head/mid/tail.jpg |

## 旧30秒方式との比較

- old chunk 1: 旧固定幅チャンクは新セグメント3件に分かれたため、固定幅境界が実カット点をまたいでいた可能性がある。
  - 旧clip: 0:02.555-0:32.555 / 旧source: 36:14.596-37:04.510
  - 旧整合率: 29.9% / 線形に続かなかった長さ: 0:21.045
  - 人間観測: 最初は一致したが、チャンク全体を連続した同一元区間としては固定しない。
  - new seg 1: clip 0:02.555-0:13.040 / source 36:14.596-36:34.118 / 整合率 24.2% / 継承 requires_review
  - new seg 2: clip 0:13.040-0:19.367 / source 36:33.738-36:51.736 / 整合率 32% / 継承 requires_review
  - new seg 3: clip 0:19.367-0:53.370 / source 36:48.532-37:38.575 / 整合率 26.3% / 継承 requires_review
- old chunk 2: 旧固定幅チャンクは新セグメント3件に分かれたため、固定幅境界が実カット点をまたいでいた可能性がある。
  - 旧clip: 0:32.555-1:02.555 / 旧source: 38:01.066-38:59.669
  - 旧整合率: 18.4% / 線形に続かなかった長さ: 0:24.490
  - 人間観測: 途中から一致した。固定幅チャンクの途中に未検出の繋ぎ目がある可能性がある。
  - new seg 3: clip 0:19.367-0:53.370 / source 36:48.532-37:38.575 / 整合率 26.3% / 継承 requires_review
  - new seg 4: clip 0:53.370-0:59.680 / source 38:35.887-38:56.728 / 整合率 59.5% / 継承 requires_review
  - new seg 5: clip 0:59.680-1:04.100 / source 38:56.468-39:00.910 / 整合率 100% / 継承 requires_review
- old chunk 3: 旧固定幅チャンクは新セグメント7件に分かれたため、固定幅境界が実カット点をまたいでいた可能性がある。
  - 旧clip: 1:02.555-1:32.555 / 旧source: 39:01.290-40:05.816
  - 旧整合率: 44.9% / 線形に続かなかった長さ: 0:16.545
  - 人間観測: 途中から一致した。固定幅チャンクの途中に未検出の繋ぎ目がある可能性がある。
  - new seg 5: clip 0:59.680-1:04.100 / source 38:56.468-39:00.910 / 整合率 100% / 継承 requires_review
  - new seg 6: clip 1:04.100-1:06.540 / source 39:00.850-39:03.230 / 整合率 95.6% / 継承 requires_review
  - new seg 7: clip 1:06.540-1:08.910 / source 39:03.230-39:07.532 / 整合率 61.4% / 継承 requires_review
  - new seg 8: clip 1:08.910-1:15.233 / source 39:11.013-39:33.874 / 整合率 63.8% / 継承 requires_review
  - new seg 9: clip 1:15.233-1:24.960 / source 39:33.814-39:43.662 / 整合率 96.8% / 継承 requires_review
  - new seg 10: clip 1:24.960-1:27.233 / source 39:43.562-39:44.983 / 整合率 60.7% / 継承 requires_review
  - new seg 11: clip 1:27.233-1:37.000 / source 39:44.963-40:09.298 / 整合率 97.5% / 継承 requires_review
- old chunk 4: 旧固定幅チャンクは新セグメント6件に分かれたため、固定幅境界が実カット点をまたいでいた可能性がある。
  - 旧clip: 1:32.555-2:01.147 / 旧source: 40:04.635-40:35.445
  - 旧整合率: 29.1% / 線形に続かなかった長さ: 0:20.281
  - 人間観測: 完全一致。ただし切り抜き全体のexpectedを作るには、前段チャンクの未検出カット点を再照合する必要がある。
  - new seg 11: clip 1:27.233-1:37.000 / source 39:44.963-40:09.298 / 整合率 97.5% / 継承 requires_review
  - new seg 12: clip 1:37.000-1:41.100 / source 40:08.618-40:13.402 / 整合率 76.5% / 継承 requires_review
  - new seg 13: clip 1:41.100-1:45.390 / source 40:12.721-40:17.625 / 整合率 73.8% / 継承 requires_review
  - new seg 14: clip 1:45.390-1:49.120 / source 40:17.545-40:21.348 / 整合率 45% / 継承 requires_review
  - new seg 15: clip 1:49.120-1:56.470 / source 40:21.228-40:29.701 / 整合率 38.1% / 継承 requires_review
  - new seg 16: clip 1:56.470-2:01.147 / source 40:31.422-40:40.868 / 整合率 100% / 継承 requires_review

## 本体影響

- runtime/ への書き込みなし
- fixtures/ への書き込みなし
- expected/ への書き込みなし
- 本番UI/API/キュー/DBへの変更なし
