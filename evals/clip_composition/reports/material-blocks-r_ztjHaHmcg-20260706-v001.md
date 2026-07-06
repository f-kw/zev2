# 素材対応ブロック再構成

- 対象: r_ztjHaHmcg
- DP入力: `outputs/global-dp-word-alignment-r_ztjHaHmcg-20260706-offset-jump-v001.json`
- HTML確認パッケージ: `outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/index.html`
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
| 1 | 52, 55, 57 | 0:15.903-0:32.383 | 36:48.172-37:04.490 | 79 | +1263ms | +0ms | -162ms |
| 2 | 59 | 0:32.564-0:33.504 | 37:17.847-37:21.469 | 12 | +0ms | +0ms | +2682ms |
| 3 | 85 | 0:51.810-0:54.271 | 38:34.526-38:36.828 | 20 | +0ms | +0ms | -159ms |
| 4 | 88, 89 | 0:57.045-1:10.497 | 38:53.847-39:10.553 | 80 | +0ms | +0ms | +3254ms |
| 5 | 90 | 1:11.198-1:24.653 | 39:29.790-39:42.581 | 81 | +0ms | +0ms | -664ms |
| 6 | 97, 99, 101, 104, 108 | 1:27.475-2:01.147 | 39:59.621-40:40.868 | 193 | +4628ms | +161ms | +7575ms |

## 素材境界表

| 境界 | block | clip前後 | clip間隔 | source前後 | source間隔 | 素材飛び量 | offset跳び根拠 |
| ---: | --- | --- | ---: | --- | ---: | ---: | ---: |
| 1 | 1->2 | 0:32.383 -> 0:32.564 | +181ms | 37:04.490 -> 37:17.847 | +13357ms | +13176ms | 1 |
| 2 | 2->3 | 0:33.504 -> 0:51.810 | +18306ms | 37:21.469 -> 38:34.526 | +73057ms | +54751ms | 6 |
| 3 | 3->4 | 0:54.271 -> 0:57.045 | +2774ms | 38:36.828 -> 38:53.847 | +17019ms | +14245ms | 1 |
| 4 | 4->5 | 1:10.497 -> 1:11.198 | +701ms | 39:10.553 -> 39:29.790 | +19237ms | +18536ms | 1 |
| 5 | 5->6 | 1:24.653 -> 1:27.475 | +2822ms | 39:42.581 -> 39:59.621 | +17040ms | +14218ms | 1 |

## 確定済み最終ブロックとの関係

- 確定ペア: clip 1:32.555-2:01.147 / source 40:04.730-40:36.085
- 判定: contained
- 関係: 確定ペアは素材対応ブロックの内側に含まれる。素材としては手前から連続し、確定ペアは人間確認済みの使用範囲として残るため矛盾ではない。
- 対応ブロック: block 6
- ブロック境界との差: clip開始 -5080ms, clip終了 +0ms, source開始 -5109ms, source終了 +4783ms

## 確認パッケージの見方

- `clip連続再生`: 切り抜き単体。境界前から境界後まで実際の順番で見る。ここで切り替わりが起きているか、未対応部分が挟まるかを見る。
- `source前後連続再生`: 元動画の前側対応2秒、後側対応2秒を順番につないだ確認動画。これは人工連結で、元動画の実連続ではない。前側と後側が別位置に見えるかを見る。
- `前側対応確認` / `後側対応確認`: 左が切り抜き、右が元動画。前後それぞれの対応が正しそうかを補助確認する。
- 静止画は補助。切り替わり判定は連続再生動画で判断する。
- 見ないこと: 同一素材内の細かい詰め、口元の完全同期、expectedCutsの最終開始・終了秒の確定。
- 同一素材内の詰めや細かいジャンプカットは、ここでは境界にしない。

## 境界別素材

### 境界1: block 1 -> 2

- clip: 0:32.383 -> 0:32.564 (+181ms)
- source: 37:04.490 -> 37:17.847 (+13357ms)
- 素材飛び量: +13176ms
- clip連続再生: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/videos/boundary_01_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/videos/boundary_01_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/videos/boundary_01_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/videos/boundary_01_after_match.mp4`

#### clip前素材終端 0:32.383

- 音声: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/audio/boundary_01_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_01/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_01/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_01/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_01/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_01/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 0:32.564

- 音声: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/audio/boundary_01_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_01/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_01/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_01/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_01/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_01/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 37:04.490

- 音声: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/audio/boundary_01_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_01/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_01/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_01/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_01/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_01/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 37:17.847

- 音声: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/audio/boundary_01_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_01/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_01/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_01/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_01/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_01/source_after/source_after_plus1000ms.jpg)
### 境界2: block 2 -> 3

- clip: 0:33.504 -> 0:51.810 (+18306ms)
- source: 37:21.469 -> 38:34.526 (+73057ms)
- 素材飛び量: +54751ms
- clip連続再生: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/videos/boundary_02_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/videos/boundary_02_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/videos/boundary_02_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/videos/boundary_02_after_match.mp4`

#### clip前素材終端 0:33.504

- 音声: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/audio/boundary_02_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_02/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_02/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_02/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_02/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_02/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 0:51.810

- 音声: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/audio/boundary_02_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_02/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_02/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_02/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_02/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_02/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 37:21.469

- 音声: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/audio/boundary_02_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_02/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_02/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_02/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_02/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_02/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 38:34.526

- 音声: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/audio/boundary_02_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_02/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_02/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_02/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_02/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_02/source_after/source_after_plus1000ms.jpg)
### 境界3: block 3 -> 4

- clip: 0:54.271 -> 0:57.045 (+2774ms)
- source: 38:36.828 -> 38:53.847 (+17019ms)
- 素材飛び量: +14245ms
- clip連続再生: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/videos/boundary_03_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/videos/boundary_03_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/videos/boundary_03_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/videos/boundary_03_after_match.mp4`

#### clip前素材終端 0:54.271

- 音声: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/audio/boundary_03_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_03/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_03/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_03/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_03/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_03/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 0:57.045

- 音声: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/audio/boundary_03_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_03/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_03/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_03/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_03/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_03/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 38:36.828

- 音声: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/audio/boundary_03_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_03/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_03/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_03/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_03/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_03/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 38:53.847

- 音声: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/audio/boundary_03_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_03/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_03/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_03/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_03/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_03/source_after/source_after_plus1000ms.jpg)
### 境界4: block 4 -> 5

- clip: 1:10.497 -> 1:11.198 (+701ms)
- source: 39:10.553 -> 39:29.790 (+19237ms)
- 素材飛び量: +18536ms
- clip連続再生: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/videos/boundary_04_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/videos/boundary_04_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/videos/boundary_04_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/videos/boundary_04_after_match.mp4`

#### clip前素材終端 1:10.497

- 音声: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/audio/boundary_04_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_04/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_04/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_04/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_04/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_04/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 1:11.198

- 音声: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/audio/boundary_04_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_04/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_04/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_04/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_04/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_04/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 39:10.553

- 音声: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/audio/boundary_04_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_04/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_04/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_04/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_04/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_04/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 39:29.790

- 音声: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/audio/boundary_04_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_04/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_04/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_04/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_04/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_04/source_after/source_after_plus1000ms.jpg)
### 境界5: block 5 -> 6

- clip: 1:24.653 -> 1:27.475 (+2822ms)
- source: 39:42.581 -> 39:59.621 (+17040ms)
- 素材飛び量: +14218ms
- clip連続再生: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/videos/boundary_05_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/videos/boundary_05_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/videos/boundary_05_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/videos/boundary_05_after_match.mp4`

#### clip前素材終端 1:24.653

- 音声: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/audio/boundary_05_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_05/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_05/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_05/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_05/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_05/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 1:27.475

- 音声: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/audio/boundary_05_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_05/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_05/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_05/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_05/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_05/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 39:42.581

- 音声: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/audio/boundary_05_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_05/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_05/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_05/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_05/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_05/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 39:59.621

- 音声: `../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/audio/boundary_05_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_05/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_05/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_05/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_05/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/stills/boundary_05/source_after/source_after_plus1000ms.jpg)
