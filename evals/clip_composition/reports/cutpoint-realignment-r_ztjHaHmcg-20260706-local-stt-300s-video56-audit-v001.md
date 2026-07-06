# 複数区間 カット点ベース再照合レポート

- 結果JSON: outputs/cutpoint-realignment-r_ztjHaHmcg-20260706-local-stt-300s-video56-audit-v001.json
- 旧30秒方式アーカイブ: outputs/archive/fixed30-alignment-r_ztjHaHmcg-20260706-local-stt-300s-video56-audit-v001.json
- 静止画比較パッケージ: outputs/visual-check/r_ztjHaHmcg/cutpoint-20260706-local-stt-300s-video56-audit-v001
- fixture凍結: no
- readyForFreeze: false

## 方針

- 固定30秒幅ではなく、切り抜き側の音声不連続候補と映像シーンチェンジ候補から可変長セグメントを作る。
- 音声不連続候補を先に採用し、映像シーンチェンジ候補は補助として追加する。
- 整合率は、単語タイムスタンプ対応が線形に続いた最長区間の長さをセグメント長で割った値。
- 対応に使えた単語数が10語未満の場合、整合率は判定不能として表示する。
- 整合率は自動凍結条件ではなく、人間確認のための数値として読む。

## 新セグメント

| seg | clip | source | text | 対応単語 | 整合率表示 | inherited | stills |
| ---: | --- | --- | ---: | ---: | ---: | --- | --- |
| 1 | 0:02.555-0:05.000 | 36:19.927-36:22.049 | 90.5% | 19 | 67.9% | requires_review | segment01_head/mid/tail.jpg |
| 2 | 0:05.000-0:07.833 | 36:21.989-36:26.652 | 100% | 11 | 54.9% | requires_review | segment02_head/mid/tail.jpg |
| 3 | 0:07.833-0:10.400 | 36:24.210-36:30.335 | 100% | 19 | 95.9% | requires_review | segment03_head/mid/tail.jpg |
| 4 | 0:10.400-0:13.040 | 36:28.133-36:34.118 | 61.9% | 13 | 32.6% | requires_review | segment04_head/mid/tail.jpg |
| 5 | 0:13.040-0:19.367 | 36:33.738-36:51.736 | 85.7% | 24 | 32% | requires_review | segment05_head/mid/tail.jpg |
| 6 | 0:19.367-0:21.333 | 36:50.915-36:53.678 | 100% | 17 | 100% | requires_review | segment06_head/mid/tail.jpg |
| 7 | 0:21.333-0:23.000 | 36:52.957-36:54.759 | 100% | 12 | 100% | requires_review | segment07_head/mid/tail.jpg |
| 8 | 0:23.000-0:25.267 | 36:56.561-36:58.704 | 93.3% | 14 | 81.1% | requires_review | segment08_head/mid/tail.jpg |
| 9 | 0:25.267-0:27.100 | 36:58.423-37:00.485 | 100% | 15 | 100% | requires_review | segment09_head/mid/tail.jpg |
| 10 | 0:27.100-0:30.933 | 37:00.405-37:04.350 | 100% | 21 | 68.1% | requires_review | segment10_head/mid/tail.jpg |
| 11 | 0:30.933-0:34.733 | 37:04.350-37:22.989 | 94.7% | 18 | 36.3% | requires_review | segment11_head/mid/tail.jpg |
| 12 | 0:34.733-0:36.567 | 23:47.360-23:49.281 | 80% | 4 | 判定不能 (4/10語) | requires_review | segment12_head/mid/tail.jpg |
| 13 | 0:36.567-0:38.467 | 37:22.149-37:24.430 | 91.7% | 11 | 87.5% | requires_review | segment13_head/mid/tail.jpg |
| 14 | 0:38.467-0:40.067 | 37:24.410-37:25.650 | 100% | 7 | 判定不能 (7/10語) | requires_review | segment14_head/mid/tail.jpg |
| 15 | 0:40.067-0:42.267 | 37:25.630-37:26.911 | 100% | 17 | 40.9% | requires_review | segment15_head/mid/tail.jpg |
| 16 | 0:42.267-0:44.533 | 37:26.711-37:26.751 | 100% | 2 | 判定不能 (2/10語) | requires_review | segment16_head/mid/tail.jpg |
| 17 | 0:44.533-0:53.370 | 38:10.710-38:35.987 | 70% | 28 | 20.4% | requires_review | segment17_head/mid/tail.jpg |
| 18 | 0:53.370-0:55.867 | 38:35.887-38:36.828 | 100% | 10 | 36.1% | requires_review | segment18_head/mid/tail.jpg |
| 19 | 0:55.867-0:59.680 | 38:52.687-38:56.728 | 76.9% | 20 | 98.5% | requires_review | segment19_head/mid/tail.jpg |
| 20 | 0:59.680-1:04.100 | 38:56.468-39:00.910 | 92% | 23 | 100% | requires_review | segment20_head/mid/tail.jpg |
| 21 | 1:04.100-1:06.540 | 39:00.850-39:03.230 | 89.5% | 17 | 95.6% | requires_review | segment21_head/mid/tail.jpg |
| 22 | 1:06.540-1:08.910 | 39:03.230-39:07.532 | 100% | 15 | 61.4% | requires_review | segment22_head/mid/tail.jpg |
| 23 | 1:08.910-1:10.933 | 39:07.171-39:10.553 | 93.8% | 15 | 78.4% | requires_review | segment23_head/mid/tail.jpg |
| 24 | 1:10.933-1:12.867 | 39:11.833-39:31.532 | 85.7% | 12 | 86.3% | requires_review | segment24_head/mid/tail.jpg |
| 25 | 1:12.867-1:15.233 | 39:31.432-39:33.734 | 87.5% | 21 | 96.1% | requires_review | segment25_head/mid/tail.jpg |
| 26 | 1:15.233-1:17.400 | 39:33.814-39:36.156 | 100% | 13 | 100% | requires_review | segment26_head/mid/tail.jpg |
| 27 | 1:17.400-1:19.800 | 39:34.975-39:38.338 | 95% | 19 | 96.9% | requires_review | segment27_head/mid/tail.jpg |
| 28 | 1:19.800-1:22.000 | 39:38.418-39:40.720 | 87.5% | 7 | 判定不能 (7/10語) | requires_review | segment28_head/mid/tail.jpg |
| 29 | 1:22.000-1:24.960 | 39:40.479-39:43.662 | 100% | 15 | 89.6% | requires_review | segment29_head/mid/tail.jpg |
| 30 | 1:24.960-1:27.233 | 39:43.562-39:44.983 | 100% | 9 | 判定不能 (9/10語) | requires_review | segment30_head/mid/tail.jpg |
| 31 | 1:27.233-1:32.833 | 39:44.963-40:05.816 | 100% | 34 | 95.7% | requires_review | segment31_head/mid/tail.jpg |
| 32 | 1:32.833-1:34.867 | 40:04.635-40:07.137 | 100% | 13 | 100% | requires_review | segment32_head/mid/tail.jpg |
| 33 | 1:34.867-1:37.000 | 40:06.776-40:09.298 | 100% | 14 | 100% | requires_review | segment33_head/mid/tail.jpg |
| 34 | 1:37.000-1:38.800 | 40:08.618-40:11.000 | 100% | 14 | 46.6% | requires_review | segment34_head/mid/tail.jpg |
| 35 | 1:38.800-1:41.100 | 40:10.920-40:13.402 | 100% | 21 | 100% | requires_review | segment35_head/mid/tail.jpg |
| 36 | 1:41.100-1:43.833 | 40:12.721-40:14.723 | 100% | 14 | 100% | requires_review | segment36_head/mid/tail.jpg |
| 37 | 1:43.833-1:45.390 | 40:14.703-40:17.625 | 100% | 10 | 67.1% | requires_review | segment37_head/mid/tail.jpg |
| 38 | 1:45.390-1:49.120 | 40:17.545-40:21.348 | 100% | 31 | 45% | requires_review | segment38_head/mid/tail.jpg |
| 39 | 1:49.120-1:53.933 | 40:21.228-40:27.439 | 79.3% | 23 | 30.2% | requires_review | segment39_head/mid/tail.jpg |
| 40 | 1:53.933-1:56.470 | 40:28.020-40:31.262 | 93.8% | 15 | 99.6% | requires_review | segment40_head/mid/tail.jpg |
| 41 | 1:56.470-2:01.147 | 40:31.422-40:40.868 | 100% | 26 | 100% | requires_review | segment41_head/mid/tail.jpg |

## 旧30秒方式との比較

- old chunk 1: 旧固定幅チャンクは新セグメント11件に分かれたため、固定幅境界が実カット点をまたいでいた可能性がある。
  - 旧clip: 0:02.555-0:32.555 / 旧source: 36:14.596-37:04.510
  - 旧整合率: 29.9% / 線形に続かなかった長さ: 0:21.045
  - 人間観測: 最初は一致したが、チャンク全体を連続した同一元区間としては固定しない。
  - new seg 1: clip 0:02.555-0:05.000 / source 36:19.927-36:22.049 / 対応単語 19 / 整合率表示 67.9% / 継承 requires_review
  - new seg 2: clip 0:05.000-0:07.833 / source 36:21.989-36:26.652 / 対応単語 11 / 整合率表示 54.9% / 継承 requires_review
  - new seg 3: clip 0:07.833-0:10.400 / source 36:24.210-36:30.335 / 対応単語 19 / 整合率表示 95.9% / 継承 requires_review
  - new seg 4: clip 0:10.400-0:13.040 / source 36:28.133-36:34.118 / 対応単語 13 / 整合率表示 32.6% / 継承 requires_review
  - new seg 5: clip 0:13.040-0:19.367 / source 36:33.738-36:51.736 / 対応単語 24 / 整合率表示 32% / 継承 requires_review
  - new seg 6: clip 0:19.367-0:21.333 / source 36:50.915-36:53.678 / 対応単語 17 / 整合率表示 100% / 継承 requires_review
  - new seg 7: clip 0:21.333-0:23.000 / source 36:52.957-36:54.759 / 対応単語 12 / 整合率表示 100% / 継承 requires_review
  - new seg 8: clip 0:23.000-0:25.267 / source 36:56.561-36:58.704 / 対応単語 14 / 整合率表示 81.1% / 継承 requires_review
  - new seg 9: clip 0:25.267-0:27.100 / source 36:58.423-37:00.485 / 対応単語 15 / 整合率表示 100% / 継承 requires_review
  - new seg 10: clip 0:27.100-0:30.933 / source 37:00.405-37:04.350 / 対応単語 21 / 整合率表示 68.1% / 継承 requires_review
  - new seg 11: clip 0:30.933-0:34.733 / source 37:04.350-37:22.989 / 対応単語 18 / 整合率表示 36.3% / 継承 requires_review
- old chunk 2: 旧固定幅チャンクは新セグメント10件に分かれたため、固定幅境界が実カット点をまたいでいた可能性がある。
  - 旧clip: 0:32.555-1:02.555 / 旧source: 38:01.066-38:59.669
  - 旧整合率: 18.4% / 線形に続かなかった長さ: 0:24.490
  - 人間観測: 途中から一致した。固定幅チャンクの途中に未検出の繋ぎ目がある可能性がある。
  - new seg 11: clip 0:30.933-0:34.733 / source 37:04.350-37:22.989 / 対応単語 18 / 整合率表示 36.3% / 継承 requires_review
  - new seg 12: clip 0:34.733-0:36.567 / source 23:47.360-23:49.281 / 対応単語 4 / 整合率表示 判定不能 (4/10語) / 継承 requires_review
  - new seg 13: clip 0:36.567-0:38.467 / source 37:22.149-37:24.430 / 対応単語 11 / 整合率表示 87.5% / 継承 requires_review
  - new seg 14: clip 0:38.467-0:40.067 / source 37:24.410-37:25.650 / 対応単語 7 / 整合率表示 判定不能 (7/10語) / 継承 requires_review
  - new seg 15: clip 0:40.067-0:42.267 / source 37:25.630-37:26.911 / 対応単語 17 / 整合率表示 40.9% / 継承 requires_review
  - new seg 16: clip 0:42.267-0:44.533 / source 37:26.711-37:26.751 / 対応単語 2 / 整合率表示 判定不能 (2/10語) / 継承 requires_review
  - new seg 17: clip 0:44.533-0:53.370 / source 38:10.710-38:35.987 / 対応単語 28 / 整合率表示 20.4% / 継承 requires_review
  - new seg 18: clip 0:53.370-0:55.867 / source 38:35.887-38:36.828 / 対応単語 10 / 整合率表示 36.1% / 継承 requires_review
  - new seg 19: clip 0:55.867-0:59.680 / source 38:52.687-38:56.728 / 対応単語 20 / 整合率表示 98.5% / 継承 requires_review
  - new seg 20: clip 0:59.680-1:04.100 / source 38:56.468-39:00.910 / 対応単語 23 / 整合率表示 100% / 継承 requires_review
- old chunk 3: 旧固定幅チャンクは新セグメント12件に分かれたため、固定幅境界が実カット点をまたいでいた可能性がある。
  - 旧clip: 1:02.555-1:32.555 / 旧source: 39:01.290-40:05.816
  - 旧整合率: 44.9% / 線形に続かなかった長さ: 0:16.545
  - 人間観測: 途中から一致した。固定幅チャンクの途中に未検出の繋ぎ目がある可能性がある。
  - new seg 20: clip 0:59.680-1:04.100 / source 38:56.468-39:00.910 / 対応単語 23 / 整合率表示 100% / 継承 requires_review
  - new seg 21: clip 1:04.100-1:06.540 / source 39:00.850-39:03.230 / 対応単語 17 / 整合率表示 95.6% / 継承 requires_review
  - new seg 22: clip 1:06.540-1:08.910 / source 39:03.230-39:07.532 / 対応単語 15 / 整合率表示 61.4% / 継承 requires_review
  - new seg 23: clip 1:08.910-1:10.933 / source 39:07.171-39:10.553 / 対応単語 15 / 整合率表示 78.4% / 継承 requires_review
  - new seg 24: clip 1:10.933-1:12.867 / source 39:11.833-39:31.532 / 対応単語 12 / 整合率表示 86.3% / 継承 requires_review
  - new seg 25: clip 1:12.867-1:15.233 / source 39:31.432-39:33.734 / 対応単語 21 / 整合率表示 96.1% / 継承 requires_review
  - new seg 26: clip 1:15.233-1:17.400 / source 39:33.814-39:36.156 / 対応単語 13 / 整合率表示 100% / 継承 requires_review
  - new seg 27: clip 1:17.400-1:19.800 / source 39:34.975-39:38.338 / 対応単語 19 / 整合率表示 96.9% / 継承 requires_review
  - new seg 28: clip 1:19.800-1:22.000 / source 39:38.418-39:40.720 / 対応単語 7 / 整合率表示 判定不能 (7/10語) / 継承 requires_review
  - new seg 29: clip 1:22.000-1:24.960 / source 39:40.479-39:43.662 / 対応単語 15 / 整合率表示 89.6% / 継承 requires_review
  - new seg 30: clip 1:24.960-1:27.233 / source 39:43.562-39:44.983 / 対応単語 9 / 整合率表示 判定不能 (9/10語) / 継承 requires_review
  - new seg 31: clip 1:27.233-1:32.833 / source 39:44.963-40:05.816 / 対応単語 34 / 整合率表示 95.7% / 継承 requires_review
- old chunk 4: 旧固定幅チャンクは新セグメント11件に分かれたため、固定幅境界が実カット点をまたいでいた可能性がある。
  - 旧clip: 1:32.555-2:01.147 / 旧source: 40:04.635-40:35.445
  - 旧整合率: 29.1% / 線形に続かなかった長さ: 0:20.281
  - 人間観測: 完全一致。ただし切り抜き全体のexpectedを作るには、前段チャンクの未検出カット点を再照合する必要がある。
  - new seg 31: clip 1:27.233-1:32.833 / source 39:44.963-40:05.816 / 対応単語 34 / 整合率表示 95.7% / 継承 requires_review
  - new seg 32: clip 1:32.833-1:34.867 / source 40:04.635-40:07.137 / 対応単語 13 / 整合率表示 100% / 継承 requires_review
  - new seg 33: clip 1:34.867-1:37.000 / source 40:06.776-40:09.298 / 対応単語 14 / 整合率表示 100% / 継承 requires_review
  - new seg 34: clip 1:37.000-1:38.800 / source 40:08.618-40:11.000 / 対応単語 14 / 整合率表示 46.6% / 継承 requires_review
  - new seg 35: clip 1:38.800-1:41.100 / source 40:10.920-40:13.402 / 対応単語 21 / 整合率表示 100% / 継承 requires_review
  - new seg 36: clip 1:41.100-1:43.833 / source 40:12.721-40:14.723 / 対応単語 14 / 整合率表示 100% / 継承 requires_review
  - new seg 37: clip 1:43.833-1:45.390 / source 40:14.703-40:17.625 / 対応単語 10 / 整合率表示 67.1% / 継承 requires_review
  - new seg 38: clip 1:45.390-1:49.120 / source 40:17.545-40:21.348 / 対応単語 31 / 整合率表示 45% / 継承 requires_review
  - new seg 39: clip 1:49.120-1:53.933 / source 40:21.228-40:27.439 / 対応単語 23 / 整合率表示 30.2% / 継承 requires_review
  - new seg 40: clip 1:53.933-1:56.470 / source 40:28.020-40:31.262 / 対応単語 15 / 整合率表示 99.6% / 継承 requires_review
  - new seg 41: clip 1:56.470-2:01.147 / source 40:31.422-40:40.868 / 対応単語 26 / 整合率表示 100% / 継承 requires_review

## 本体影響

- runtime/ への書き込みなし
- fixtures/ への書き込みなし
- expected/ への書き込みなし
- 本番UI/API/キュー/DBへの変更なし
