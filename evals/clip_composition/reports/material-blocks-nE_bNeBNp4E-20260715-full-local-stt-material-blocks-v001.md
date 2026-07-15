# 素材対応ブロック再構成

- 対象: nE_bNeBNp4E
- DP入力: `outputs/global-dp-word-alignment-nE_bNeBNp4E_qdczJpv8RCc_20260715-full-local-stt-v001_dp.json`
- HTML確認パッケージ: `outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/index.html`
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
| 1 | 212, 213, 215, 216, 218 | 1:30.098-2:17.396 | 65:32.652-66:27.910 | 157 | +4880ms | +408ms | +7960ms |
| 2 | 222, 224 | 2:24.521-2:44.139 | 66:49.379-66:56.766 | 26 | +321ms | +0ms | -12231ms |
| 3 | 235, 236, 238, 241, 242, 246, 248, 252, 259 | 3:08.483-4:58.173 | 67:50.075-69:58.226 | 300 | +17086ms | +261ms | +18461ms |
| 4 | 270, 275, 276 | 5:09.885-5:28.730 | 70:30.098-70:51.308 | 62 | +0ms | +375ms | +2365ms |
| 5 | 283, 284, 287, 291, 297 | 5:38.552-6:21.924 | 71:14.958-72:07.614 | 67 | +6380ms | +5228ms | +9284ms |
| 6 | 308, 318, 324, 326, 327, 328, 330, 331, 333, 335, 336, 343, 344, 348, 349, 354, 356, 367, 370, 371, 373, 375, 379, 400 | 6:45.518-11:27.624 | 72:46.870-78:20.965 | 511 | +43522ms | +1184ms | +51989ms |
| 7 | 405, 406, 409, 415, 416 | 11:46.442-12:39.546 | 78:50.747-79:47.332 | 87 | +6021ms | +0ms | +3481ms |

## 素材境界表

| 境界 | block | clip前後 | clip間隔 | source前後 | source間隔 | 素材飛び量 | offset跳び根拠 |
| ---: | --- | --- | ---: | --- | ---: | ---: | ---: |
| 1 | 1->2 | 2:17.396 -> 2:24.521 | +7125ms | 66:27.910 -> 66:49.379 | +21469ms | +14344ms | 3 |
| 2 | 2->3 | 2:44.139 -> 3:08.483 | +24344ms | 66:56.766 -> 67:50.075 | +53309ms | +28965ms | 5 |
| 3 | 3->4 | 4:58.173 -> 5:09.885 | +11712ms | 69:58.226 -> 70:30.098 | +31872ms | +20160ms | 4 |
| 4 | 4->5 | 5:28.730 -> 5:38.552 | +9822ms | 70:51.308 -> 71:14.958 | +23650ms | +13828ms | 3 |
| 5 | 5->6 | 6:21.924 -> 6:45.518 | +23594ms | 72:07.614 -> 72:46.870 | +39256ms | +15662ms | 7 |
| 6 | 6->7 | 11:27.624 -> 11:46.442 | +18818ms | 78:20.965 -> 78:50.747 | +29782ms | +10964ms | 3 |

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

- clip: 2:17.396 -> 2:24.521 (+7125ms)
- source: 66:27.910 -> 66:49.379 (+21469ms)
- 素材飛び量: +14344ms
- clip連続再生: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/videos/boundary_01_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/videos/boundary_01_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/videos/boundary_01_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/videos/boundary_01_after_match.mp4`

#### clip前素材終端 2:17.396

- 音声: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/audio/boundary_01_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_01/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_01/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_01/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_01/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_01/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 2:24.521

- 音声: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/audio/boundary_01_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_01/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_01/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_01/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_01/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_01/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 66:27.910

- 音声: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/audio/boundary_01_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_01/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_01/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_01/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_01/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_01/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 66:49.379

- 音声: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/audio/boundary_01_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_01/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_01/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_01/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_01/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_01/source_after/source_after_plus1000ms.jpg)
### 境界2: block 2 -> 3

- clip: 2:44.139 -> 3:08.483 (+24344ms)
- source: 66:56.766 -> 67:50.075 (+53309ms)
- 素材飛び量: +28965ms
- clip連続再生: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/videos/boundary_02_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/videos/boundary_02_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/videos/boundary_02_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/videos/boundary_02_after_match.mp4`

#### clip前素材終端 2:44.139

- 音声: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/audio/boundary_02_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_02/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_02/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_02/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_02/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_02/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 3:08.483

- 音声: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/audio/boundary_02_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_02/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_02/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_02/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_02/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_02/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 66:56.766

- 音声: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/audio/boundary_02_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_02/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_02/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_02/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_02/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_02/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 67:50.075

- 音声: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/audio/boundary_02_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_02/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_02/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_02/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_02/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_02/source_after/source_after_plus1000ms.jpg)
### 境界3: block 3 -> 4

- clip: 4:58.173 -> 5:09.885 (+11712ms)
- source: 69:58.226 -> 70:30.098 (+31872ms)
- 素材飛び量: +20160ms
- clip連続再生: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/videos/boundary_03_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/videos/boundary_03_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/videos/boundary_03_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/videos/boundary_03_after_match.mp4`

#### clip前素材終端 4:58.173

- 音声: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/audio/boundary_03_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_03/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_03/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_03/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_03/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_03/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 5:09.885

- 音声: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/audio/boundary_03_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_03/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_03/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_03/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_03/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_03/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 69:58.226

- 音声: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/audio/boundary_03_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_03/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_03/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_03/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_03/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_03/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 70:30.098

- 音声: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/audio/boundary_03_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_03/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_03/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_03/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_03/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_03/source_after/source_after_plus1000ms.jpg)
### 境界4: block 4 -> 5

- clip: 5:28.730 -> 5:38.552 (+9822ms)
- source: 70:51.308 -> 71:14.958 (+23650ms)
- 素材飛び量: +13828ms
- clip連続再生: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/videos/boundary_04_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/videos/boundary_04_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/videos/boundary_04_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/videos/boundary_04_after_match.mp4`

#### clip前素材終端 5:28.730

- 音声: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/audio/boundary_04_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_04/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_04/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_04/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_04/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_04/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 5:38.552

- 音声: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/audio/boundary_04_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_04/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_04/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_04/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_04/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_04/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 70:51.308

- 音声: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/audio/boundary_04_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_04/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_04/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_04/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_04/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_04/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 71:14.958

- 音声: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/audio/boundary_04_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_04/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_04/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_04/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_04/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_04/source_after/source_after_plus1000ms.jpg)
### 境界5: block 5 -> 6

- clip: 6:21.924 -> 6:45.518 (+23594ms)
- source: 72:07.614 -> 72:46.870 (+39256ms)
- 素材飛び量: +15662ms
- clip連続再生: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/videos/boundary_05_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/videos/boundary_05_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/videos/boundary_05_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/videos/boundary_05_after_match.mp4`

#### clip前素材終端 6:21.924

- 音声: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/audio/boundary_05_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_05/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_05/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_05/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_05/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_05/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 6:45.518

- 音声: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/audio/boundary_05_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_05/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_05/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_05/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_05/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_05/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 72:07.614

- 音声: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/audio/boundary_05_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_05/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_05/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_05/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_05/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_05/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 72:46.870

- 音声: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/audio/boundary_05_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_05/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_05/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_05/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_05/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_05/source_after/source_after_plus1000ms.jpg)
### 境界6: block 6 -> 7

- clip: 11:27.624 -> 11:46.442 (+18818ms)
- source: 78:20.965 -> 78:50.747 (+29782ms)
- 素材飛び量: +10964ms
- clip連続再生: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/videos/boundary_06_clip_context.mp4`
- source前後連続再生: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/videos/boundary_06_source_sequence.mp4`
- 前側対応確認: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/videos/boundary_06_before_match.mp4`
- 後側対応確認: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/videos/boundary_06_after_match.mp4`

#### clip前素材終端 11:27.624

- 音声: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/audio/boundary_06_clip_before_pm2s.wav`

![clip_before minus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_06/clip_before/clip_before_minus1000ms.jpg)
![clip_before minus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_06/clip_before/clip_before_minus500ms.jpg)
![clip_before exact](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_06/clip_before/clip_before_exact.jpg)
![clip_before plus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_06/clip_before/clip_before_plus500ms.jpg)
![clip_before plus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_06/clip_before/clip_before_plus1000ms.jpg)
#### clip後素材開始 11:46.442

- 音声: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/audio/boundary_06_clip_after_pm2s.wav`

![clip_after minus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_06/clip_after/clip_after_minus1000ms.jpg)
![clip_after minus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_06/clip_after/clip_after_minus500ms.jpg)
![clip_after exact](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_06/clip_after/clip_after_exact.jpg)
![clip_after plus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_06/clip_after/clip_after_plus500ms.jpg)
![clip_after plus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_06/clip_after/clip_after_plus1000ms.jpg)
#### source前素材終端 78:20.965

- 音声: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/audio/boundary_06_source_before_pm2s.wav`

![source_before minus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_06/source_before/source_before_minus1000ms.jpg)
![source_before minus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_06/source_before/source_before_minus500ms.jpg)
![source_before exact](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_06/source_before/source_before_exact.jpg)
![source_before plus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_06/source_before/source_before_plus500ms.jpg)
![source_before plus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_06/source_before/source_before_plus1000ms.jpg)
#### source後素材開始 78:50.747

- 音声: `../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/audio/boundary_06_source_after_pm2s.wav`

![source_after minus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_06/source_after/source_after_minus1000ms.jpg)
![source_after minus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_06/source_after/source_after_minus500ms.jpg)
![source_after exact](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_06/source_after/source_after_exact.jpg)
![source_after plus500ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_06/source_after/source_after_plus500ms.jpg)
![source_after plus1000ms](../outputs/boundary-check/nE_bNeBNp4E/20260715-full-local-stt-material-blocks-v001/stills/boundary_06/source_after/source_after_plus1000ms.jpg)
