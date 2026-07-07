# 音声分離確認パッケージ

- 対象: aX-axQMWR3c
- HTML: outputs/block-check/aX-axQMWR3c/20260707-material-block-audio-review-v002/index.html
- fixture/expected作成: なし
- confirmedペア変更: なし
- 本体側変更: なし

## 作成理由

左右同時音声の確認では、画面変化が少ない候補や片側が無音の候補を人間が判定しづらい。そこで、候補ごとに切り抜き側と元配信側を別動画として切り出し、HTML上で片方ずつ、または切り抜き→元配信の順で再生できるようにした。

## 人間確認結果

- 確認日: 2026-07-07
- 確認者: kawafmm
- 確認手段: 音声分離確認パッケージ(v002)
- 結論: 全run一致

| run | 音声分離最終判定 | 同時再生一次判定 | clip | source | 対応語 |
| ---: | --- | --- | --- | --- | ---: |
| 32 | 一致 | 不一致 | 0:27.258-0:29.079 | 82:02.443-82:05.405 | 10 |
| 41 | 一致 | 不一致 | 1:00.702-1:04.905 | 82:36.865-82:41.488 | 23 |
| 43 | 一致 | 一致 | 1:06.706-1:11.509 | 82:46.271-82:51.214 | 47 |
| 45 | 一致 | 一致 | 1:11.849-1:15.211 | 82:51.354-82:54.616 | 30 |
| 47 | 一致 | 一致 | 1:15.591-1:18.693 | 82:55.157-82:58.259 | 18 |
| 49 | 一致 | 一致 | 1:23.276-1:29.980 | 83:02.784-83:09.648 | 24 |
| 57 | 一致 | 不一致 | 2:00.314-2:06.137 | 83:41.276-83:47.538 | 29 |
| 59 | 一致 | 一致 | 2:06.698-2:12.641 | 83:47.778-83:53.699 | 41 |
| 61 | 一致 | 判定困難 | 2:13.161-2:28.109 | 83:56.039-84:11.072 | 86 |
| 62 | 一致 | 判定困難 | 2:28.109-2:29.530 | 84:13.693-84:16.495 | 18 |

## 判定上の注意

- ここでの問いは、素材対応の妥当性であり、境界確定ではない。
- 同時再生の一次判定では不一致/判定困難が出たが、画面変化が少なく音声が重なる確認方法の問題だった。音声分離版では全run一致。
- このパッケージ作成によってfixture/expectedは更新していない。

## 動画

- run 32: clip `../outputs/block-check/aX-axQMWR3c/20260707-material-block-audio-review-v002/videos/block_01_run_032_clip.mp4` / source `../outputs/block-check/aX-axQMWR3c/20260707-material-block-audio-review-v002/videos/block_01_run_032_source.mp4`
- run 41: clip `../outputs/block-check/aX-axQMWR3c/20260707-material-block-audio-review-v002/videos/block_01_run_041_clip.mp4` / source `../outputs/block-check/aX-axQMWR3c/20260707-material-block-audio-review-v002/videos/block_01_run_041_source.mp4`
- run 43: clip `../outputs/block-check/aX-axQMWR3c/20260707-material-block-audio-review-v002/videos/block_01_run_043_clip.mp4` / source `../outputs/block-check/aX-axQMWR3c/20260707-material-block-audio-review-v002/videos/block_01_run_043_source.mp4`
- run 45: clip `../outputs/block-check/aX-axQMWR3c/20260707-material-block-audio-review-v002/videos/block_01_run_045_clip.mp4` / source `../outputs/block-check/aX-axQMWR3c/20260707-material-block-audio-review-v002/videos/block_01_run_045_source.mp4`
- run 47: clip `../outputs/block-check/aX-axQMWR3c/20260707-material-block-audio-review-v002/videos/block_01_run_047_clip.mp4` / source `../outputs/block-check/aX-axQMWR3c/20260707-material-block-audio-review-v002/videos/block_01_run_047_source.mp4`
- run 49: clip `../outputs/block-check/aX-axQMWR3c/20260707-material-block-audio-review-v002/videos/block_01_run_049_clip.mp4` / source `../outputs/block-check/aX-axQMWR3c/20260707-material-block-audio-review-v002/videos/block_01_run_049_source.mp4`
- run 57: clip `../outputs/block-check/aX-axQMWR3c/20260707-material-block-audio-review-v002/videos/block_01_run_057_clip.mp4` / source `../outputs/block-check/aX-axQMWR3c/20260707-material-block-audio-review-v002/videos/block_01_run_057_source.mp4`
- run 59: clip `../outputs/block-check/aX-axQMWR3c/20260707-material-block-audio-review-v002/videos/block_01_run_059_clip.mp4` / source `../outputs/block-check/aX-axQMWR3c/20260707-material-block-audio-review-v002/videos/block_01_run_059_source.mp4`
- run 61: clip `../outputs/block-check/aX-axQMWR3c/20260707-material-block-audio-review-v002/videos/block_01_run_061_clip.mp4` / source `../outputs/block-check/aX-axQMWR3c/20260707-material-block-audio-review-v002/videos/block_01_run_061_source.mp4`
- run 62: clip `../outputs/block-check/aX-axQMWR3c/20260707-material-block-audio-review-v002/videos/block_01_run_062_clip.mp4` / source `../outputs/block-check/aX-axQMWR3c/20260707-material-block-audio-review-v002/videos/block_01_run_062_source.mp4`
