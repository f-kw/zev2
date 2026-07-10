# 素材対応ブロック再構成

- 対象: nOEWCNc77MI
- DP入力: `outputs/dp-candidate-run-union-nOEWCNc77MI-YE-faluP7zY-20260710-full-plus-selected-v001.json`
- HTML確認パッケージ: `outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/index.html`
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
| 1 | 1 | 0:04.909-0:09.532 | 4:20.068-4:24.269 | 23 | +0ms | +0ms | -422ms |
| 2 | 2 | 0:14.595-0:18.477 | 5:09.446-5:13.689 | 10 | +0ms | +0ms | +361ms |
| 3 | 3, 4 | 0:18.477-0:24.321 | 5:25.479-5:30.720 | 35 | +0ms | +200ms | -603ms |
| 4 | 5 | 0:37.539-0:40.120 | 17:32.987-17:35.347 | 19 | +0ms | +0ms | -221ms |
| 5 | 6 | 0:44.701-0:49.962 | 20:54.601-20:58.062 | 20 | +0ms | +0ms | -1800ms |
| 6 | 7, 8, 9 | 0:59.564-1:13.795 | 46:30.074-46:46.680 | 52 | +1760ms | +0ms | +2375ms |
| 7 | 10, 11, 12 | 1:28.226-1:43.019 | 50:06.642-50:21.412 | 71 | +160ms | +400ms | -23ms |
| 8 | 13, 14 | 1:44.380-1:53.446 | 53:00.410-53:10.215 | 36 | +198ms | +0ms | +739ms |
| 9 | 15 | 2:18.480-2:21.901 | 54:45.387-54:48.829 | 17 | +0ms | +0ms | +21ms |
| 10 | 16 | 3:03.024-3:13.011 | 57:55.241-58:05.035 | 55 | +0ms | +0ms | -193ms |
| 11 | 17, 18, 19 | 3:50.898-4:19.188 | 66:38.452-67:06.707 | 99 | +0ms | +4946ms | -35ms |
| 12 | 20 | 4:25.210-4:33.665 | 68:22.099-68:29.864 | 43 | +0ms | +0ms | -690ms |
| 13 | 21, 22 | 4:39.029-4:51.898 | 81:17.136-81:29.844 | 29 | +0ms | +420ms | -161ms |
| 14 | 23, 24 | 5:16.355-5:22.480 | 86:23.974-86:29.318 | 42 | +139ms | +0ms | -781ms |
| 15 | 25 | 5:38.724-5:40.845 | 86:57.231-86:58.992 | 13 | +0ms | +0ms | -360ms |
| 16 | 26, 27, 28 | 5:58.151-6:13.786 | 173:59.052-174:10.741 | 31 | +0ms | +3668ms | -3946ms |
| 17 | 29, 30, 31, 32, 33, 34 | 7:05.880-7:39.146 | 192:21.555-192:55.281 | 121 | +0ms | +2070ms | +460ms |

## 素材境界表

| 境界 | block | clip前後 | clip間隔 | source前後 | source間隔 | 素材飛び量 | offset跳び根拠 |
| ---: | --- | --- | ---: | --- | ---: | ---: | ---: |
| 1 | 1->2 | 0:09.532 -> 0:14.595 | +5063ms | 4:24.269 -> 5:09.446 | +45177ms | +40114ms | 0 |
| 2 | 2->3 | 0:18.477 -> 0:18.477 | +0ms | 5:13.689 -> 5:25.479 | +11790ms | +11790ms | 0 |
| 3 | 3->4 | 0:24.321 -> 0:37.539 | +13218ms | 5:30.720 -> 17:32.987 | +722267ms | +709049ms | 0 |
| 4 | 4->5 | 0:40.120 -> 0:44.701 | +4581ms | 17:35.347 -> 20:54.601 | +199254ms | +194673ms | 0 |
| 5 | 5->6 | 0:49.962 -> 0:59.564 | +9602ms | 20:58.062 -> 46:30.074 | +1532012ms | +1522410ms | 0 |
| 6 | 6->7 | 1:13.795 -> 1:28.226 | +14431ms | 46:46.680 -> 50:06.642 | +199962ms | +185531ms | 0 |
| 7 | 7->8 | 1:43.019 -> 1:44.380 | +1361ms | 50:21.412 -> 53:00.410 | +158998ms | +157637ms | 0 |
| 8 | 8->9 | 1:53.446 -> 2:18.480 | +25034ms | 53:10.215 -> 54:45.387 | +95172ms | +70138ms | 0 |
| 9 | 9->10 | 2:21.901 -> 3:03.024 | +41123ms | 54:48.829 -> 57:55.241 | +186412ms | +145289ms | 0 |
| 10 | 10->11 | 3:13.011 -> 3:50.898 | +37887ms | 58:05.035 -> 66:38.452 | +513417ms | +475530ms | 0 |
| 11 | 11->12 | 4:19.188 -> 4:25.210 | +6022ms | 67:06.707 -> 68:22.099 | +75392ms | +69370ms | 0 |
| 12 | 12->13 | 4:33.665 -> 4:39.029 | +5364ms | 68:29.864 -> 81:17.136 | +767272ms | +761908ms | 0 |
| 13 | 13->14 | 4:51.898 -> 5:16.355 | +24457ms | 81:29.844 -> 86:23.974 | +294130ms | +269673ms | 0 |
| 14 | 14->15 | 5:22.480 -> 5:38.724 | +16244ms | 86:29.318 -> 86:57.231 | +27913ms | +11669ms | 0 |
| 15 | 15->16 | 5:40.845 -> 5:58.151 | +17306ms | 86:58.992 -> 173:59.052 | +5220060ms | +5202754ms | 0 |
| 16 | 16->17 | 6:13.786 -> 7:05.880 | +52094ms | 174:10.741 -> 192:21.555 | +1090814ms | +1038720ms | 0 |

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

- clip: 0:09.532 -> 0:14.595 (+5063ms)
- source: 4:24.269 -> 5:09.446 (+45177ms)
- 素材飛び量: +40114ms
- clip連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_01_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_01_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_01_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_01_after_match.mp4`

#### clip前素材終端 0:09.532

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_01_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_01/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_01/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_01/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_01/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_01/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 0:14.595

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_01_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_01/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_01/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_01/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_01/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_01/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 4:24.269

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_01_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_01/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_01/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_01/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_01/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_01/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 5:09.446

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_01_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_01/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_01/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_01/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_01/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_01/source_after/source_after_plus1000ms.jpg)
### 境界2: block 2 -> 3

- clip: 0:18.477 -> 0:18.477 (+0ms)
- source: 5:13.689 -> 5:25.479 (+11790ms)
- 素材飛び量: +11790ms
- clip連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_02_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_02_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_02_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_02_after_match.mp4`

#### clip前素材終端 0:18.477

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_02_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_02/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_02/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_02/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_02/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_02/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 0:18.477

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_02_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_02/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_02/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_02/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_02/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_02/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 5:13.689

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_02_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_02/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_02/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_02/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_02/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_02/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 5:25.479

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_02_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_02/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_02/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_02/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_02/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_02/source_after/source_after_plus1000ms.jpg)
### 境界3: block 3 -> 4

- clip: 0:24.321 -> 0:37.539 (+13218ms)
- source: 5:30.720 -> 17:32.987 (+722267ms)
- 素材飛び量: +709049ms
- clip連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_03_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_03_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_03_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_03_after_match.mp4`

#### clip前素材終端 0:24.321

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_03_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_03/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_03/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_03/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_03/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_03/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 0:37.539

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_03_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_03/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_03/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_03/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_03/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_03/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 5:30.720

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_03_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_03/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_03/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_03/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_03/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_03/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 17:32.987

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_03_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_03/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_03/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_03/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_03/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_03/source_after/source_after_plus1000ms.jpg)
### 境界4: block 4 -> 5

- clip: 0:40.120 -> 0:44.701 (+4581ms)
- source: 17:35.347 -> 20:54.601 (+199254ms)
- 素材飛び量: +194673ms
- clip連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_04_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_04_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_04_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_04_after_match.mp4`

#### clip前素材終端 0:40.120

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_04_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_04/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_04/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_04/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_04/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_04/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 0:44.701

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_04_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_04/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_04/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_04/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_04/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_04/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 17:35.347

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_04_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_04/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_04/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_04/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_04/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_04/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 20:54.601

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_04_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_04/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_04/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_04/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_04/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_04/source_after/source_after_plus1000ms.jpg)
### 境界5: block 5 -> 6

- clip: 0:49.962 -> 0:59.564 (+9602ms)
- source: 20:58.062 -> 46:30.074 (+1532012ms)
- 素材飛び量: +1522410ms
- clip連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_05_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_05_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_05_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_05_after_match.mp4`

#### clip前素材終端 0:49.962

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_05_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_05/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_05/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_05/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_05/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_05/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 0:59.564

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_05_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_05/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_05/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_05/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_05/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_05/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 20:58.062

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_05_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_05/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_05/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_05/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_05/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_05/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 46:30.074

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_05_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_05/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_05/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_05/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_05/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_05/source_after/source_after_plus1000ms.jpg)
### 境界6: block 6 -> 7

- clip: 1:13.795 -> 1:28.226 (+14431ms)
- source: 46:46.680 -> 50:06.642 (+199962ms)
- 素材飛び量: +185531ms
- clip連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_06_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_06_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_06_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_06_after_match.mp4`

#### clip前素材終端 1:13.795

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_06_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_06/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_06/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_06/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_06/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_06/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 1:28.226

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_06_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_06/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_06/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_06/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_06/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_06/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 46:46.680

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_06_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_06/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_06/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_06/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_06/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_06/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 50:06.642

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_06_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_06/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_06/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_06/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_06/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_06/source_after/source_after_plus1000ms.jpg)
### 境界7: block 7 -> 8

- clip: 1:43.019 -> 1:44.380 (+1361ms)
- source: 50:21.412 -> 53:00.410 (+158998ms)
- 素材飛び量: +157637ms
- clip連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_07_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_07_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_07_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_07_after_match.mp4`

#### clip前素材終端 1:43.019

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_07_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_07/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_07/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_07/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_07/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_07/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 1:44.380

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_07_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_07/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_07/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_07/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_07/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_07/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 50:21.412

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_07_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_07/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_07/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_07/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_07/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_07/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 53:00.410

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_07_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_07/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_07/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_07/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_07/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_07/source_after/source_after_plus1000ms.jpg)
### 境界8: block 8 -> 9

- clip: 1:53.446 -> 2:18.480 (+25034ms)
- source: 53:10.215 -> 54:45.387 (+95172ms)
- 素材飛び量: +70138ms
- clip連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_08_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_08_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_08_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_08_after_match.mp4`

#### clip前素材終端 1:53.446

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_08_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_08/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_08/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_08/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_08/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_08/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 2:18.480

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_08_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_08/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_08/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_08/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_08/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_08/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 53:10.215

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_08_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_08/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_08/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_08/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_08/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_08/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 54:45.387

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_08_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_08/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_08/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_08/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_08/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_08/source_after/source_after_plus1000ms.jpg)
### 境界9: block 9 -> 10

- clip: 2:21.901 -> 3:03.024 (+41123ms)
- source: 54:48.829 -> 57:55.241 (+186412ms)
- 素材飛び量: +145289ms
- clip連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_09_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_09_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_09_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_09_after_match.mp4`

#### clip前素材終端 2:21.901

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_09_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_09/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_09/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_09/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_09/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_09/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 3:03.024

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_09_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_09/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_09/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_09/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_09/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_09/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 54:48.829

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_09_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_09/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_09/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_09/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_09/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_09/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 57:55.241

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_09_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_09/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_09/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_09/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_09/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_09/source_after/source_after_plus1000ms.jpg)
### 境界10: block 10 -> 11

- clip: 3:13.011 -> 3:50.898 (+37887ms)
- source: 58:05.035 -> 66:38.452 (+513417ms)
- 素材飛び量: +475530ms
- clip連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_10_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_10_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_10_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_10_after_match.mp4`

#### clip前素材終端 3:13.011

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_10_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_10/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_10/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_10/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_10/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_10/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 3:50.898

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_10_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_10/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_10/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_10/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_10/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_10/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 58:05.035

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_10_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_10/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_10/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_10/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_10/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_10/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 66:38.452

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_10_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_10/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_10/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_10/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_10/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_10/source_after/source_after_plus1000ms.jpg)
### 境界11: block 11 -> 12

- clip: 4:19.188 -> 4:25.210 (+6022ms)
- source: 67:06.707 -> 68:22.099 (+75392ms)
- 素材飛び量: +69370ms
- clip連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_11_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_11_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_11_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_11_after_match.mp4`

#### clip前素材終端 4:19.188

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_11_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_11/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_11/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_11/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_11/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_11/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 4:25.210

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_11_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_11/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_11/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_11/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_11/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_11/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 67:06.707

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_11_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_11/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_11/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_11/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_11/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_11/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 68:22.099

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_11_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_11/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_11/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_11/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_11/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_11/source_after/source_after_plus1000ms.jpg)
### 境界12: block 12 -> 13

- clip: 4:33.665 -> 4:39.029 (+5364ms)
- source: 68:29.864 -> 81:17.136 (+767272ms)
- 素材飛び量: +761908ms
- clip連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_12_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_12_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_12_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_12_after_match.mp4`

#### clip前素材終端 4:33.665

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_12_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_12/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_12/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_12/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_12/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_12/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 4:39.029

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_12_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_12/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_12/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_12/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_12/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_12/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 68:29.864

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_12_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_12/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_12/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_12/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_12/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_12/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 81:17.136

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_12_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_12/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_12/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_12/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_12/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_12/source_after/source_after_plus1000ms.jpg)
### 境界13: block 13 -> 14

- clip: 4:51.898 -> 5:16.355 (+24457ms)
- source: 81:29.844 -> 86:23.974 (+294130ms)
- 素材飛び量: +269673ms
- clip連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_13_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_13_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_13_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_13_after_match.mp4`

#### clip前素材終端 4:51.898

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_13_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_13/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_13/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_13/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_13/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_13/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 5:16.355

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_13_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_13/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_13/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_13/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_13/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_13/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 81:29.844

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_13_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_13/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_13/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_13/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_13/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_13/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 86:23.974

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_13_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_13/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_13/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_13/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_13/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_13/source_after/source_after_plus1000ms.jpg)
### 境界14: block 14 -> 15

- clip: 5:22.480 -> 5:38.724 (+16244ms)
- source: 86:29.318 -> 86:57.231 (+27913ms)
- 素材飛び量: +11669ms
- clip連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_14_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_14_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_14_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_14_after_match.mp4`

#### clip前素材終端 5:22.480

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_14_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_14/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_14/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_14/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_14/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_14/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 5:38.724

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_14_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_14/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_14/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_14/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_14/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_14/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 86:29.318

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_14_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_14/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_14/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_14/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_14/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_14/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 86:57.231

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_14_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_14/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_14/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_14/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_14/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_14/source_after/source_after_plus1000ms.jpg)
### 境界15: block 15 -> 16

- clip: 5:40.845 -> 5:58.151 (+17306ms)
- source: 86:58.992 -> 173:59.052 (+5220060ms)
- 素材飛び量: +5202754ms
- clip連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_15_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_15_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_15_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_15_after_match.mp4`

#### clip前素材終端 5:40.845

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_15_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_15/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_15/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_15/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_15/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_15/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 5:58.151

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_15_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_15/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_15/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_15/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_15/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_15/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 86:58.992

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_15_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_15/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_15/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_15/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_15/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_15/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 173:59.052

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_15_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_15/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_15/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_15/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_15/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_15/source_after/source_after_plus1000ms.jpg)
### 境界16: block 16 -> 17

- clip: 6:13.786 -> 7:05.880 (+52094ms)
- source: 174:10.741 -> 192:21.555 (+1090814ms)
- 素材飛び量: +1038720ms
- clip連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_16_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_16_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_16_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/videos/boundary_16_after_match.mp4`

#### clip前素材終端 6:13.786

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_16_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_16/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_16/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_16/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_16/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_16/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 7:05.880

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_16_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_16/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_16/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_16/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_16/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_16/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 174:10.741

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_16_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_16/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_16/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_16/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_16/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_16/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 192:21.555

- 音声: `../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/audio/boundary_16_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_16/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_16/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_16/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_16/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/stills/boundary_16/source_after/source_after_plus1000ms.jpg)
