# カット点rank上限診断

- 結果JSON: outputs/cutpoint-rank-limit-diagnosis-r_ztjHaHmcg-20260706-rank-limit-v001.json
- 確認済みカット点: 1:32.555
- 近傍候補の探索幅: ±3000ms
- fixture凍結: no
- readyForFreeze: false

## raw候補

- 最近傍の音声不連続候補: audio_discontinuity 1:32.550 rank 2035 delta -5ms
- 最近傍の映像シーンチェンジ候補: video_scene_change 1:32.567 rank 199 delta +12ms
- 近傍内でrankが最も良い音声候補: audio_discontinuity 1:33.700 rank 18 delta +1145ms
- 近傍内でrankが最も良い映像候補: video_scene_change 1:34.867 rank 30 delta +2312ms
- 検算対象の音声候補: audio_discontinuity 1:32.410 rank 416 delta -145ms
- 検算対象の映像候補: video_scene_change 1:32.833 rank 56 delta +278ms

## 設定別の採用結果

| 設定 | 音声rank上限 | 映像rank上限 | 対象カット採用 | カット数 | セグメント数 | 追加カット数 |
| --- | ---: | ---: | --- | ---: | ---: | ---: |
| current | 12 | 8 | no | 15 | 16 | 0 |
| audio-only-minimum | 416 | 8 | no | 45 | 46 | 36 |
| video-only-minimum | 12 | 56 | yes | 40 | 41 | 25 |

## 最小設定の見立て

- 現行設定では確認済みカット点は採用されない。
- 検算対象の候補が採用された設定のうち、追加カット数が最小だったのは video-only-minimum (音声12 / 映像56)。追加カットは25件、セグメント数は41。
- 音声rank上限だけで拾う場合は、検算対象の音声候補rankまで広げた設定を確認する。
- 映像rank上限だけで拾う場合は、検算対象の映像候補rankまで広げた設定を確認する。
- どちらを採用するかはこの診断では決めない。増える分割数を見て人間が判断する。

## 本体影響

- runtime/ への書き込みなし
- fixtures/ への書き込みなし
- expected/ への書き込みなし
- 本番UI/API/キュー/DBへの変更なし

## audio-only-minimum で対象候補を塞ぐ選択済みカット点
- audio_discontinuity 1:31.690 rank 41 value 0.057169
- audio_discontinuity 1:33.700 rank 18 value 0.067546

## audio-only-minimum で増えるカット点
- audio_discontinuity 0:04.120 rank 373 value 0.025517
- audio_discontinuity 0:06.460 rank 92 value 0.04589
- audio_discontinuity 0:08.440 rank 65 value 0.052253
- audio_discontinuity 0:11.510 rank 43 value 0.056879
- audio_discontinuity 0:15.920 rank 66 value 0.051362
- audio_discontinuity 0:17.470 rank 107 value 0.043952
- audio_discontinuity 0:19.800 rank 403 value 0.024151
- audio_discontinuity 0:23.450 rank 177 value 0.035352
- audio_discontinuity 0:24.960 rank 97 value 0.04536
- audio_discontinuity 0:28.750 rank 29 value 0.061916
- audio_discontinuity 0:32.570 rank 303 value 0.028685
- audio_discontinuity 0:36.930 rank 198 value 0.034031
- audio_discontinuity 0:41.080 rank 404 value 0.02409
- audio_discontinuity 0:48.700 rank 74 value 0.048732
- audio_discontinuity 0:51.630 rank 26 value 0.063099
- audio_discontinuity 0:56.100 rank 102 value 0.044577
- audio_discontinuity 0:57.710 rank 39 value 0.058088
- audio_discontinuity 1:01.280 rank 109 value 0.043381
- audio_discontinuity 1:03.710 rank 13 value 0.071934
- audio_discontinuity 1:11.490 rank 31 value 0.061654
- audio_discontinuity 1:14.320 rank 24 value 0.063651
- audio_discontinuity 1:15.820 rank 171 value 0.035714
- audio_discontinuity 1:19.070 rank 114 value 0.041814
- audio_discontinuity 1:21.920 rank 32 value 0.06112
- audio_discontinuity 1:27.450 rank 169 value 0.035894
- audio_discontinuity 1:28.980 rank 14 value 0.071872
- audio_discontinuity 1:31.690 rank 41 value 0.057169
- audio_discontinuity 1:33.700 rank 18 value 0.067546
- audio_discontinuity 1:37.250 rank 17 value 0.070087
- audio_discontinuity 1:39.450 rank 116 value 0.041779
- audio_discontinuity 1:41.320 rank 60 value 0.052636
- audio_discontinuity 1:47.070 rank 52 value 0.055066
- audio_discontinuity 1:50.780 rank 28 value 0.062403
- audio_discontinuity 1:52.310 rank 215 value 0.033153
- audio_discontinuity 1:54.470 rank 262 value 0.030527
- audio_discontinuity 1:58.110 rank 162 value 0.036462

## video-only-minimum で増えるカット点
- video_scene_change 0:05.000 rank 31 value 1.424
- video_scene_change 0:07.833 rank 12 value 1.982
- video_scene_change 0:10.400 rank 14 value 1.961
- video_scene_change 0:21.333 rank 25 value 1.508
- video_scene_change 0:23.000 rank 55 value 1.223
- video_scene_change 0:25.267 rank 33 value 1.403
- video_scene_change 0:27.100 rank 23 value 1.547
- video_scene_change 0:30.933 rank 42 value 1.346
- video_scene_change 0:34.733 rank 11 value 2.014
- video_scene_change 0:36.567 rank 54 value 1.245
- video_scene_change 0:38.467 rank 51 value 1.261
- video_scene_change 0:40.067 rank 36 value 1.377
- video_scene_change 0:42.267 rank 22 value 1.563
- video_scene_change 0:44.533 rank 10 value 2.018
- video_scene_change 0:55.867 rank 34 value 1.394
- video_scene_change 1:10.933 rank 29 value 1.47
- video_scene_change 1:12.867 rank 24 value 1.511
- video_scene_change 1:17.400 rank 13 value 1.974
- video_scene_change 1:19.800 rank 19 value 1.879
- video_scene_change 1:22.000 rank 44 value 1.333
- video_scene_change 1:32.833 rank 56 value 1.222
- video_scene_change 1:34.867 rank 30 value 1.469
- video_scene_change 1:38.800 rank 9 value 2.052
- video_scene_change 1:43.833 rank 52 value 1.258
- video_scene_change 1:53.933 rank 15 value 1.942
