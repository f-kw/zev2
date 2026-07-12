# 素材対応ブロック再構成

- 対象: 9dtwF5Exu5w
- DP入力: `outputs/global-dp-word-alignment-9dtwF5Exu5w_o8rZAhARXAc_full_local30_20260712_v001.json`
- HTML確認パッケージ: `outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/index.html`
- 素材境界の判定: source側の進みとclip側の進みの差が 10000ms 以上の点
- fixture/expected作成: なし
- confirmedペア変更: なし
- 本体側変更: なし

## DECISIONS.md 追記案

- expectedCutsの開始・終了境界は「素材対応の切り替わり点」、つまり元動画の別位置へ飛ぶ点として扱う。同一素材対応の内部で間・沈黙・フィラーを詰めた箇所はexpectedCuts境界にしない。
- 同一素材ブロック内のジャンプカットや詰めは `internalGapMs` 系の注記として保持する。境界採点では「別素材への飛び」と「同一素材内の編集詰め」を分ける。
- 人間確認済みの使用範囲が、より粗い素材対応ブロックの内側に入る場合は矛盾ではない。境界を書き換える前に、素材切り替わり点と編集上の使用開始・終了を分けて確認する。

## ブロック表

| block | 対応run | clip範囲 | source範囲 | 対応語 | source側内部詰め候補 | clip側内部余り候補 | source範囲長 - clip範囲長 |
| ---: | --- | --- | --- | ---: | ---: | ---: | ---: |
| 1 | 6 | 0:03.655-0:04.135 | 4:41.521-4:42.642 | 13 | +0ms | +0ms | +641ms |
| 2 | 24 | 0:12.036-0:13.276 | 5:00.714-5:01.675 | 10 | +0ms | +0ms | -279ms |
| 3 | 31 | 0:17.557-0:20.297 | 5:38.755-5:41.516 | 21 | +0ms | +0ms | +21ms |
| 4 | 38 | 0:28.719-0:33.887 | 7:21.877-7:27.039 | 17 | +0ms | +0ms | -6ms |
| 5 | 51 | 0:44.572-0:59.078 | 8:22.720-8:37.104 | 59 | +0ms | +0ms | -122ms |
| 6 | 83 | 1:23.838-1:27.285 | 20:50.139-20:54.342 | 28 | +0ms | +0ms | +756ms |
| 7 | 98 | 1:43.872-1:47.413 | 33:33.635-33:37.195 | 27 | +0ms | +0ms | +19ms |
| 8 | 108, 113, 114 | 1:50.255-1:59.560 | 34:59.120-35:07.080 | 45 | +0ms | +1080ms | -1345ms |
| 9 | 181, 184 | 2:27.079-2:34.084 | 61:30.566-61:37.689 | 35 | +0ms | +221ms | +118ms |
| 10 | 199, 200, 201 | 2:42.489-2:59.660 | 62:21.344-62:38.425 | 133 | +0ms | +0ms | -90ms |
| 11 | 207 | 3:03.688-3:06.709 | 70:07.639-70:10.641 | 16 | +0ms | +0ms | -19ms |
| 12 | 208 | 3:08.310-3:14.913 | 70:32.807-70:39.410 | 27 | +0ms | +0ms | +0ms |
| 13 | 216 | 3:21.636-3:27.679 | 71:13.428-71:19.472 | 22 | +0ms | +0ms | +1ms |
| 14 | 235 | 3:37.524-3:39.445 | 72:47.214-72:49.035 | 16 | +0ms | +0ms | -100ms |
| 15 | 264 | 4:04.758-4:12.004 | 78:43.988-78:51.031 | 26 | +0ms | +0ms | -203ms |
| 16 | 290 | 4:31.898-4:35.259 | 80:45.080-80:46.482 | 11 | +0ms | +0ms | -1959ms |
| 17 | 355, 360 | 5:43.028-5:52.535 | 104:49.092-104:58.479 | 46 | +20ms | +0ms | -120ms |
| 18 | 400 | 6:29.200-6:29.780 | 108:46.271-108:47.012 | 14 | +0ms | +0ms | +161ms |
| 19 | 460 | 7:16.123-7:17.184 | 115:26.857-115:27.358 | 11 | +0ms | +0ms | -560ms |
| 20 | 479 | 7:38.963-7:39.584 | 116:50.155-116:51.256 | 15 | +0ms | +0ms | +480ms |
| 21 | 593 | 9:42.784-9:43.444 | 132:25.178-132:27.279 | 13 | +0ms | +0ms | +1441ms |
| 22 | 635, 642, 644, 651, 653, 658 | 10:09.836-10:56.958 | 138:24.378-139:26.359 | 108 | +13501ms | +341ms | +14859ms |
| 23 | 670 | 11:05.120-11:09.864 | 141:40.956-141:41.857 | 11 | +0ms | +0ms | -3843ms |
| 24 | 694 | 11:46.613-11:47.234 | 151:57.659-151:59.080 | 25 | +0ms | +0ms | +800ms |
| 25 | 697 | 11:51.176-11:53.537 | 152:30.522-152:32.464 | 17 | +0ms | +0ms | -419ms |
| 26 | 717, 719 | 12:04.092-12:15.158 | 167:57.799-168:08.896 | 31 | +0ms | +1421ms | +31ms |
| 27 | 733 | 12:34.675-12:35.436 | 170:21.096-170:21.656 | 16 | +0ms | +0ms | -201ms |
| 28 | 806 | 13:54.573-13:58.177 | 175:21.894-175:29.420 | 17 | +0ms | +0ms | +3922ms |
| 29 | 834, 839 | 15:23.195-15:36.132 | 179:50.744-180:03.724 | 26 | +34ms | +0ms | +43ms |
| 30 | 868, 869, 870, 872, 876, 880, 892, 893, 899 | 16:06.892-16:27.839 | 183:30.322-183:46.195 | 302 | +1161ms | +3698ms | -5074ms |
| 31 | 923 | 17:01.834-17:05.024 | 195:30.442-195:33.624 | 14 | +0ms | +0ms | -8ms |

## 素材境界表

| 境界 | block | clip前後 | clip間隔 | source前後 | source間隔 | 素材飛び量 | offset跳び根拠 |
| ---: | --- | --- | ---: | --- | ---: | ---: | ---: |
| 1 | 1->2 | 0:04.135 -> 0:12.036 | +7901ms | 4:42.642 -> 5:00.714 | +18072ms | +10171ms | 2 |
| 2 | 2->3 | 0:13.276 -> 0:17.557 | +4281ms | 5:01.675 -> 5:38.755 | +37080ms | +32799ms | 2 |
| 3 | 3->4 | 0:20.297 -> 0:28.719 | +8422ms | 5:41.516 -> 7:21.877 | +100361ms | +91939ms | 6 |
| 4 | 4->5 | 0:33.887 -> 0:44.572 | +10685ms | 7:27.039 -> 8:22.720 | +55681ms | +44996ms | 6 |
| 5 | 5->6 | 0:59.078 -> 1:23.838 | +24760ms | 8:37.104 -> 20:50.139 | +733035ms | +708275ms | 31 |
| 6 | 6->7 | 1:27.285 -> 1:43.872 | +16587ms | 20:54.342 -> 33:33.635 | +759293ms | +742706ms | 10 |
| 7 | 7->8 | 1:47.413 -> 1:50.255 | +2842ms | 33:37.195 -> 34:59.120 | +81925ms | +79083ms | 4 |
| 8 | 8->9 | 1:59.560 -> 2:27.079 | +27519ms | 35:07.080 -> 61:30.566 | +1583486ms | +1555967ms | 56 |
| 9 | 9->10 | 2:34.084 -> 2:42.489 | +8405ms | 61:37.689 -> 62:21.344 | +43655ms | +35250ms | 5 |
| 10 | 10->11 | 2:59.660 -> 3:03.688 | +4028ms | 62:38.425 -> 70:07.639 | +449214ms | +445186ms | 4 |
| 11 | 11->12 | 3:06.709 -> 3:08.310 | +1601ms | 70:10.641 -> 70:32.807 | +22166ms | +20565ms | 1 |
| 12 | 12->13 | 3:14.913 -> 3:21.636 | +6723ms | 70:39.410 -> 71:13.428 | +34018ms | +27295ms | 3 |
| 13 | 13->14 | 3:27.679 -> 3:37.524 | +9845ms | 71:19.472 -> 72:47.214 | +87742ms | +77897ms | 9 |
| 14 | 14->15 | 3:39.445 -> 4:04.758 | +25313ms | 72:49.035 -> 78:43.988 | +354953ms | +329640ms | 20 |
| 15 | 15->16 | 4:12.004 -> 4:31.898 | +19894ms | 78:51.031 -> 80:45.080 | +114049ms | +94155ms | 12 |
| 16 | 16->17 | 4:35.259 -> 5:43.028 | +67769ms | 80:46.482 -> 104:49.092 | +1442610ms | +1374841ms | 55 |
| 17 | 17->18 | 5:52.535 -> 6:29.200 | +36665ms | 104:58.479 -> 108:46.271 | +227792ms | +191127ms | 17 |
| 18 | 18->19 | 6:29.780 -> 7:16.123 | +46343ms | 108:47.012 -> 115:26.857 | +399845ms | +353502ms | 31 |
| 19 | 19->20 | 7:17.184 -> 7:38.963 | +21779ms | 115:27.358 -> 116:50.155 | +82797ms | +61018ms | 8 |
| 20 | 20->21 | 7:39.584 -> 9:42.784 | +123200ms | 116:51.256 -> 132:25.178 | +933922ms | +810722ms | 52 |
| 21 | 21->22 | 9:43.444 -> 10:09.836 | +26392ms | 132:27.279 -> 138:24.378 | +357099ms | +330707ms | 16 |
| 22 | 22->23 | 10:56.958 -> 11:05.120 | +8162ms | 139:26.359 -> 141:40.956 | +134597ms | +126435ms | 7 |
| 23 | 23->24 | 11:09.864 -> 11:46.613 | +36749ms | 141:41.857 -> 151:57.659 | +615802ms | +579053ms | 18 |
| 24 | 24->25 | 11:47.234 -> 11:51.176 | +3942ms | 151:59.080 -> 152:30.522 | +31442ms | +27500ms | 1 |
| 25 | 25->26 | 11:53.537 -> 12:04.092 | +10555ms | 152:32.464 -> 167:57.799 | +925335ms | +914780ms | 12 |
| 26 | 26->27 | 12:15.158 -> 12:34.675 | +19517ms | 168:08.896 -> 170:21.096 | +132200ms | +112683ms | 7 |
| 27 | 27->28 | 12:35.436 -> 13:54.573 | +79137ms | 170:21.656 -> 175:21.894 | +300238ms | +221101ms | 32 |
| 28 | 28->29 | 13:58.177 -> 15:23.195 | +85018ms | 175:29.420 -> 179:50.744 | +261324ms | +176306ms | 15 |
| 29 | 29->30 | 15:36.132 -> 16:06.892 | +30760ms | 180:03.724 -> 183:30.322 | +206598ms | +175838ms | 16 |
| 30 | 30->31 | 16:27.839 -> 17:01.834 | +33995ms | 183:46.195 -> 195:30.442 | +704247ms | +670252ms | 14 |

## 確定済み最終ブロックとの関係

- 確定ペア: なし
- 判定: not_checked
- 関係: この対象には確認済みペアをまだ持たせていないため、素材ブロックとの包含関係は未判定。
- 対応ブロック: none
- ブロック境界との差: n/a

## 確認パッケージの見方

- `clip連続再生`: 切り抜き単体。境界前から境界後まで実際の順番で見る。ここで切り替わりが起きているか、未対応部分が挟まるかを見る。
- `source前後連続再生`: 元動画の前側対応2秒、後側対応2秒を順番につないだ確認動画。これは人工連結で、元動画の実連続ではない。前側と後側が別位置に見えるかを見る。
- `前側対応確認` / `後側対応確認`: 左が切り抜き、右が元動画。前後それぞれの対応が正しそうかを補助確認する。
- 静止画は補助。切り替わり判定は連続再生動画で判断する。
- 見ないこと: 同一素材内の細かい詰め、口元の完全同期、expectedCutsの最終開始・終了秒の確定。
- 同一素材内の詰めや細かいジャンプカットは、ここでは境界にしない。

## 境界別素材

### 境界1: block 1 -> 2

- clip: 0:04.135 -> 0:12.036 (+7901ms)
- source: 4:42.642 -> 5:00.714 (+18072ms)
- 素材飛び量: +10171ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_01_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_01_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_01_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_01_after_match.mp4`

#### clip前素材終端 0:04.135

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_01_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_01/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_01/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_01/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_01/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_01/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 0:12.036

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_01_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_01/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_01/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_01/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_01/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_01/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 4:42.642

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_01_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_01/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_01/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_01/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_01/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_01/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 5:00.714

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_01_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_01/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_01/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_01/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_01/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_01/source_after/source_after_plus1000ms.jpg)
### 境界2: block 2 -> 3

- clip: 0:13.276 -> 0:17.557 (+4281ms)
- source: 5:01.675 -> 5:38.755 (+37080ms)
- 素材飛び量: +32799ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_02_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_02_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_02_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_02_after_match.mp4`

#### clip前素材終端 0:13.276

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_02_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_02/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_02/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_02/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_02/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_02/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 0:17.557

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_02_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_02/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_02/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_02/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_02/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_02/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 5:01.675

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_02_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_02/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_02/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_02/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_02/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_02/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 5:38.755

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_02_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_02/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_02/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_02/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_02/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_02/source_after/source_after_plus1000ms.jpg)
### 境界3: block 3 -> 4

- clip: 0:20.297 -> 0:28.719 (+8422ms)
- source: 5:41.516 -> 7:21.877 (+100361ms)
- 素材飛び量: +91939ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_03_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_03_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_03_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_03_after_match.mp4`

#### clip前素材終端 0:20.297

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_03_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_03/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_03/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_03/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_03/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_03/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 0:28.719

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_03_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_03/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_03/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_03/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_03/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_03/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 5:41.516

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_03_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_03/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_03/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_03/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_03/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_03/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 7:21.877

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_03_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_03/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_03/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_03/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_03/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_03/source_after/source_after_plus1000ms.jpg)
### 境界4: block 4 -> 5

- clip: 0:33.887 -> 0:44.572 (+10685ms)
- source: 7:27.039 -> 8:22.720 (+55681ms)
- 素材飛び量: +44996ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_04_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_04_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_04_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_04_after_match.mp4`

#### clip前素材終端 0:33.887

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_04_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_04/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_04/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_04/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_04/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_04/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 0:44.572

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_04_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_04/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_04/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_04/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_04/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_04/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 7:27.039

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_04_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_04/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_04/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_04/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_04/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_04/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 8:22.720

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_04_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_04/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_04/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_04/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_04/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_04/source_after/source_after_plus1000ms.jpg)
### 境界5: block 5 -> 6

- clip: 0:59.078 -> 1:23.838 (+24760ms)
- source: 8:37.104 -> 20:50.139 (+733035ms)
- 素材飛び量: +708275ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_05_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_05_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_05_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_05_after_match.mp4`

#### clip前素材終端 0:59.078

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_05_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_05/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_05/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_05/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_05/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_05/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 1:23.838

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_05_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_05/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_05/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_05/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_05/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_05/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 8:37.104

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_05_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_05/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_05/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_05/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_05/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_05/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 20:50.139

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_05_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_05/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_05/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_05/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_05/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_05/source_after/source_after_plus1000ms.jpg)
### 境界6: block 6 -> 7

- clip: 1:27.285 -> 1:43.872 (+16587ms)
- source: 20:54.342 -> 33:33.635 (+759293ms)
- 素材飛び量: +742706ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_06_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_06_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_06_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_06_after_match.mp4`

#### clip前素材終端 1:27.285

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_06_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_06/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_06/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_06/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_06/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_06/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 1:43.872

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_06_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_06/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_06/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_06/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_06/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_06/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 20:54.342

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_06_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_06/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_06/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_06/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_06/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_06/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 33:33.635

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_06_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_06/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_06/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_06/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_06/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_06/source_after/source_after_plus1000ms.jpg)
### 境界7: block 7 -> 8

- clip: 1:47.413 -> 1:50.255 (+2842ms)
- source: 33:37.195 -> 34:59.120 (+81925ms)
- 素材飛び量: +79083ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_07_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_07_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_07_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_07_after_match.mp4`

#### clip前素材終端 1:47.413

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_07_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_07/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_07/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_07/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_07/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_07/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 1:50.255

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_07_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_07/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_07/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_07/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_07/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_07/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 33:37.195

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_07_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_07/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_07/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_07/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_07/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_07/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 34:59.120

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_07_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_07/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_07/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_07/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_07/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_07/source_after/source_after_plus1000ms.jpg)
### 境界8: block 8 -> 9

- clip: 1:59.560 -> 2:27.079 (+27519ms)
- source: 35:07.080 -> 61:30.566 (+1583486ms)
- 素材飛び量: +1555967ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_08_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_08_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_08_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_08_after_match.mp4`

#### clip前素材終端 1:59.560

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_08_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_08/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_08/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_08/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_08/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_08/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 2:27.079

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_08_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_08/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_08/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_08/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_08/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_08/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 35:07.080

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_08_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_08/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_08/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_08/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_08/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_08/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 61:30.566

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_08_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_08/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_08/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_08/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_08/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_08/source_after/source_after_plus1000ms.jpg)
### 境界9: block 9 -> 10

- clip: 2:34.084 -> 2:42.489 (+8405ms)
- source: 61:37.689 -> 62:21.344 (+43655ms)
- 素材飛び量: +35250ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_09_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_09_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_09_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_09_after_match.mp4`

#### clip前素材終端 2:34.084

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_09_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_09/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_09/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_09/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_09/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_09/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 2:42.489

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_09_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_09/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_09/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_09/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_09/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_09/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 61:37.689

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_09_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_09/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_09/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_09/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_09/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_09/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 62:21.344

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_09_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_09/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_09/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_09/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_09/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_09/source_after/source_after_plus1000ms.jpg)
### 境界10: block 10 -> 11

- clip: 2:59.660 -> 3:03.688 (+4028ms)
- source: 62:38.425 -> 70:07.639 (+449214ms)
- 素材飛び量: +445186ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_10_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_10_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_10_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_10_after_match.mp4`

#### clip前素材終端 2:59.660

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_10_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_10/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_10/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_10/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_10/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_10/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 3:03.688

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_10_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_10/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_10/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_10/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_10/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_10/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 62:38.425

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_10_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_10/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_10/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_10/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_10/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_10/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 70:07.639

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_10_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_10/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_10/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_10/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_10/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_10/source_after/source_after_plus1000ms.jpg)
### 境界11: block 11 -> 12

- clip: 3:06.709 -> 3:08.310 (+1601ms)
- source: 70:10.641 -> 70:32.807 (+22166ms)
- 素材飛び量: +20565ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_11_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_11_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_11_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_11_after_match.mp4`

#### clip前素材終端 3:06.709

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_11_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_11/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_11/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_11/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_11/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_11/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 3:08.310

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_11_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_11/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_11/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_11/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_11/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_11/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 70:10.641

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_11_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_11/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_11/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_11/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_11/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_11/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 70:32.807

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_11_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_11/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_11/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_11/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_11/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_11/source_after/source_after_plus1000ms.jpg)
### 境界12: block 12 -> 13

- clip: 3:14.913 -> 3:21.636 (+6723ms)
- source: 70:39.410 -> 71:13.428 (+34018ms)
- 素材飛び量: +27295ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_12_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_12_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_12_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_12_after_match.mp4`

#### clip前素材終端 3:14.913

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_12_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_12/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_12/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_12/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_12/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_12/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 3:21.636

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_12_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_12/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_12/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_12/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_12/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_12/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 70:39.410

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_12_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_12/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_12/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_12/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_12/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_12/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 71:13.428

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_12_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_12/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_12/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_12/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_12/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_12/source_after/source_after_plus1000ms.jpg)
### 境界13: block 13 -> 14

- clip: 3:27.679 -> 3:37.524 (+9845ms)
- source: 71:19.472 -> 72:47.214 (+87742ms)
- 素材飛び量: +77897ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_13_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_13_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_13_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_13_after_match.mp4`

#### clip前素材終端 3:27.679

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_13_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_13/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_13/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_13/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_13/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_13/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 3:37.524

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_13_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_13/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_13/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_13/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_13/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_13/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 71:19.472

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_13_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_13/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_13/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_13/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_13/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_13/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 72:47.214

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_13_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_13/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_13/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_13/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_13/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_13/source_after/source_after_plus1000ms.jpg)
### 境界14: block 14 -> 15

- clip: 3:39.445 -> 4:04.758 (+25313ms)
- source: 72:49.035 -> 78:43.988 (+354953ms)
- 素材飛び量: +329640ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_14_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_14_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_14_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_14_after_match.mp4`

#### clip前素材終端 3:39.445

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_14_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_14/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_14/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_14/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_14/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_14/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 4:04.758

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_14_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_14/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_14/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_14/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_14/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_14/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 72:49.035

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_14_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_14/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_14/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_14/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_14/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_14/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 78:43.988

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_14_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_14/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_14/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_14/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_14/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_14/source_after/source_after_plus1000ms.jpg)
### 境界15: block 15 -> 16

- clip: 4:12.004 -> 4:31.898 (+19894ms)
- source: 78:51.031 -> 80:45.080 (+114049ms)
- 素材飛び量: +94155ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_15_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_15_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_15_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_15_after_match.mp4`

#### clip前素材終端 4:12.004

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_15_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_15/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_15/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_15/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_15/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_15/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 4:31.898

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_15_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_15/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_15/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_15/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_15/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_15/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 78:51.031

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_15_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_15/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_15/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_15/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_15/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_15/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 80:45.080

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_15_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_15/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_15/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_15/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_15/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_15/source_after/source_after_plus1000ms.jpg)
### 境界16: block 16 -> 17

- clip: 4:35.259 -> 5:43.028 (+67769ms)
- source: 80:46.482 -> 104:49.092 (+1442610ms)
- 素材飛び量: +1374841ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_16_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_16_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_16_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_16_after_match.mp4`

#### clip前素材終端 4:35.259

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_16_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_16/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_16/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_16/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_16/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_16/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 5:43.028

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_16_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_16/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_16/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_16/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_16/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_16/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 80:46.482

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_16_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_16/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_16/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_16/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_16/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_16/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 104:49.092

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_16_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_16/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_16/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_16/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_16/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_16/source_after/source_after_plus1000ms.jpg)
### 境界17: block 17 -> 18

- clip: 5:52.535 -> 6:29.200 (+36665ms)
- source: 104:58.479 -> 108:46.271 (+227792ms)
- 素材飛び量: +191127ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_17_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_17_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_17_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_17_after_match.mp4`

#### clip前素材終端 5:52.535

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_17_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_17/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_17/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_17/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_17/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_17/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 6:29.200

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_17_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_17/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_17/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_17/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_17/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_17/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 104:58.479

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_17_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_17/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_17/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_17/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_17/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_17/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 108:46.271

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_17_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_17/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_17/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_17/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_17/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_17/source_after/source_after_plus1000ms.jpg)
### 境界18: block 18 -> 19

- clip: 6:29.780 -> 7:16.123 (+46343ms)
- source: 108:47.012 -> 115:26.857 (+399845ms)
- 素材飛び量: +353502ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_18_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_18_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_18_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_18_after_match.mp4`

#### clip前素材終端 6:29.780

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_18_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_18/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_18/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_18/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_18/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_18/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 7:16.123

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_18_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_18/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_18/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_18/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_18/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_18/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 108:47.012

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_18_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_18/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_18/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_18/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_18/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_18/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 115:26.857

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_18_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_18/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_18/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_18/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_18/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_18/source_after/source_after_plus1000ms.jpg)
### 境界19: block 19 -> 20

- clip: 7:17.184 -> 7:38.963 (+21779ms)
- source: 115:27.358 -> 116:50.155 (+82797ms)
- 素材飛び量: +61018ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_19_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_19_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_19_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_19_after_match.mp4`

#### clip前素材終端 7:17.184

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_19_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_19/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_19/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_19/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_19/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_19/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 7:38.963

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_19_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_19/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_19/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_19/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_19/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_19/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 115:27.358

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_19_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_19/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_19/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_19/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_19/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_19/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 116:50.155

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_19_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_19/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_19/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_19/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_19/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_19/source_after/source_after_plus1000ms.jpg)
### 境界20: block 20 -> 21

- clip: 7:39.584 -> 9:42.784 (+123200ms)
- source: 116:51.256 -> 132:25.178 (+933922ms)
- 素材飛び量: +810722ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_20_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_20_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_20_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_20_after_match.mp4`

#### clip前素材終端 7:39.584

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_20_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_20/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_20/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_20/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_20/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_20/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 9:42.784

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_20_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_20/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_20/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_20/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_20/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_20/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 116:51.256

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_20_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_20/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_20/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_20/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_20/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_20/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 132:25.178

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_20_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_20/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_20/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_20/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_20/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_20/source_after/source_after_plus1000ms.jpg)
### 境界21: block 21 -> 22

- clip: 9:43.444 -> 10:09.836 (+26392ms)
- source: 132:27.279 -> 138:24.378 (+357099ms)
- 素材飛び量: +330707ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_21_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_21_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_21_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_21_after_match.mp4`

#### clip前素材終端 9:43.444

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_21_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_21/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_21/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_21/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_21/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_21/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 10:09.836

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_21_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_21/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_21/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_21/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_21/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_21/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 132:27.279

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_21_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_21/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_21/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_21/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_21/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_21/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 138:24.378

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_21_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_21/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_21/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_21/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_21/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_21/source_after/source_after_plus1000ms.jpg)
### 境界22: block 22 -> 23

- clip: 10:56.958 -> 11:05.120 (+8162ms)
- source: 139:26.359 -> 141:40.956 (+134597ms)
- 素材飛び量: +126435ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_22_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_22_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_22_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_22_after_match.mp4`

#### clip前素材終端 10:56.958

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_22_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_22/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_22/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_22/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_22/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_22/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 11:05.120

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_22_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_22/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_22/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_22/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_22/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_22/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 139:26.359

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_22_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_22/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_22/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_22/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_22/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_22/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 141:40.956

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_22_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_22/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_22/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_22/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_22/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_22/source_after/source_after_plus1000ms.jpg)
### 境界23: block 23 -> 24

- clip: 11:09.864 -> 11:46.613 (+36749ms)
- source: 141:41.857 -> 151:57.659 (+615802ms)
- 素材飛び量: +579053ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_23_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_23_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_23_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_23_after_match.mp4`

#### clip前素材終端 11:09.864

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_23_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_23/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_23/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_23/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_23/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_23/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 11:46.613

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_23_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_23/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_23/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_23/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_23/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_23/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 141:41.857

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_23_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_23/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_23/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_23/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_23/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_23/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 151:57.659

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_23_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_23/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_23/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_23/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_23/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_23/source_after/source_after_plus1000ms.jpg)
### 境界24: block 24 -> 25

- clip: 11:47.234 -> 11:51.176 (+3942ms)
- source: 151:59.080 -> 152:30.522 (+31442ms)
- 素材飛び量: +27500ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_24_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_24_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_24_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_24_after_match.mp4`

#### clip前素材終端 11:47.234

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_24_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_24/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_24/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_24/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_24/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_24/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 11:51.176

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_24_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_24/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_24/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_24/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_24/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_24/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 151:59.080

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_24_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_24/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_24/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_24/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_24/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_24/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 152:30.522

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_24_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_24/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_24/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_24/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_24/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_24/source_after/source_after_plus1000ms.jpg)
### 境界25: block 25 -> 26

- clip: 11:53.537 -> 12:04.092 (+10555ms)
- source: 152:32.464 -> 167:57.799 (+925335ms)
- 素材飛び量: +914780ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_25_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_25_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_25_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_25_after_match.mp4`

#### clip前素材終端 11:53.537

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_25_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_25/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_25/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_25/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_25/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_25/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 12:04.092

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_25_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_25/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_25/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_25/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_25/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_25/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 152:32.464

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_25_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_25/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_25/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_25/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_25/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_25/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 167:57.799

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_25_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_25/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_25/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_25/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_25/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_25/source_after/source_after_plus1000ms.jpg)
### 境界26: block 26 -> 27

- clip: 12:15.158 -> 12:34.675 (+19517ms)
- source: 168:08.896 -> 170:21.096 (+132200ms)
- 素材飛び量: +112683ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_26_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_26_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_26_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_26_after_match.mp4`

#### clip前素材終端 12:15.158

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_26_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_26/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_26/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_26/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_26/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_26/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 12:34.675

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_26_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_26/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_26/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_26/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_26/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_26/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 168:08.896

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_26_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_26/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_26/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_26/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_26/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_26/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 170:21.096

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_26_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_26/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_26/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_26/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_26/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_26/source_after/source_after_plus1000ms.jpg)
### 境界27: block 27 -> 28

- clip: 12:35.436 -> 13:54.573 (+79137ms)
- source: 170:21.656 -> 175:21.894 (+300238ms)
- 素材飛び量: +221101ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_27_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_27_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_27_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_27_after_match.mp4`

#### clip前素材終端 12:35.436

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_27_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_27/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_27/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_27/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_27/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_27/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 13:54.573

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_27_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_27/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_27/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_27/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_27/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_27/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 170:21.656

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_27_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_27/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_27/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_27/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_27/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_27/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 175:21.894

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_27_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_27/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_27/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_27/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_27/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_27/source_after/source_after_plus1000ms.jpg)
### 境界28: block 28 -> 29

- clip: 13:58.177 -> 15:23.195 (+85018ms)
- source: 175:29.420 -> 179:50.744 (+261324ms)
- 素材飛び量: +176306ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_28_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_28_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_28_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_28_after_match.mp4`

#### clip前素材終端 13:58.177

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_28_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_28/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_28/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_28/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_28/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_28/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 15:23.195

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_28_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_28/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_28/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_28/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_28/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_28/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 175:29.420

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_28_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_28/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_28/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_28/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_28/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_28/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 179:50.744

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_28_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_28/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_28/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_28/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_28/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_28/source_after/source_after_plus1000ms.jpg)
### 境界29: block 29 -> 30

- clip: 15:36.132 -> 16:06.892 (+30760ms)
- source: 180:03.724 -> 183:30.322 (+206598ms)
- 素材飛び量: +175838ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_29_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_29_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_29_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_29_after_match.mp4`

#### clip前素材終端 15:36.132

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_29_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_29/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_29/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_29/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_29/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_29/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 16:06.892

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_29_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_29/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_29/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_29/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_29/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_29/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 180:03.724

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_29_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_29/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_29/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_29/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_29/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_29/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 183:30.322

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_29_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_29/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_29/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_29/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_29/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_29/source_after/source_after_plus1000ms.jpg)
### 境界30: block 30 -> 31

- clip: 16:27.839 -> 17:01.834 (+33995ms)
- source: 183:46.195 -> 195:30.442 (+704247ms)
- 素材飛び量: +670252ms
- clip連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_30_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_30_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_30_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/videos/boundary_30_after_match.mp4`

#### clip前素材終端 16:27.839

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_30_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_30/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_30/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_30/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_30/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_30/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 17:01.834

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_30_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_30/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_30/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_30/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_30/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_30/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 183:46.195

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_30_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_30/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_30/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_30/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_30/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_30/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 195:30.442

- 音声: `../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/audio/boundary_30_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_30/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_30/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_30/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_30/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/9dtwF5Exu5w/20260712-full-local30-material-blocks-v001/stills/boundary_30/source_after/source_after_plus1000ms.jpg)
