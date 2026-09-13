# 弓区間・確認用MP4の準備記録

基準commit: 0a4c28419ec952453f3eadc7cdc1d4c642abf012

元本編SHA-256照合済み: 58744717f3d03a19f004fdca76a7199674a6b97a3f2f26e60d1b86b0ee8bf1cd、1,860,839,383 bytes。

本編 [28772, 32822) / 30fps を別MP4に切り出す。入力は959秒へ正確にシークし、映像2フレーム、音声2/30秒（44,100Hzで2,940サンプル）を同じ量だけ除く。映像4,050フレームと音声5,953,500サンプルを残す。内部カット・並べ替え・速度変更なし。映像・音声の内容評価は人の回答待ち。

AI準備開始記録: 2026-09-10 12:15:57 UTC。

切り出し開始: 2026-09-10T12:19:03.348311+00:00

実行command:

```sh
ffmpeg -hide_banner -nostdin -n -threads 2 -ss 959 -t 135.066666667 -i /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/presentation/work-unseen-material-thin-plan-024-v001/.render-v008.presentation-renderer-v002-work-J6DQda/publish/presentation-rendered-v002.mp4 -map 0:v:0 -map 0:a:0 -vf trim=start_frame=2:end_frame=4052,setpts=PTS-STARTPTS -af atrim=start_sample=2940:end_sample=5956440,asetpts=PTS-STARTPTS -c:v libx264 -preset fast -crf 18 -threads 2 -pix_fmt yuv420p -fps_mode passthrough -c:a aac -b:a 192k -movflags +faststart evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001/bow-human-trial-v001/bow-135s-review-v001.mp4
```

切り出し実測処理時間: 116.460 秒。終了code: 0。

最小確認: 30fps・4,050フレーム、映像と音声の開始は両方0秒・長さは両方135秒。確認用MP4の全区間の映像・音声復号は終了0、エラーログ0 bytes。元本編SHA-256は処理前後一致。映像・音声の内容や人の採否は未評価。

確認用MP4: `/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001/bow-human-trial-v001/bow-135s-review-v001.mp4`

SHA-256: `3a0eaa359b90824421e0e5365cd3f35d5b3f9933248ae3713d7392f18e5cd9a8`

確認処理実測時間（probe・復号・SHA照合）: 15.764 秒。

提示準備完了時刻: 2026-09-10T12:21:58.201258+00:00。記録開始から準備完了までの経過時間: 361.201 秒（AI準備・処理・待ち時間を含む。人の実作業時間ではない）。最終チャット提示の描画時刻は未計測。

人の回答・視聴範囲・作業時間: 提示前につき未回答・未確認・未計測。返信間隔を実作業時間に換算しない。回答後に§8の結果記録を作成し、この1件を閉じる。
