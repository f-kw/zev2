# 境界候補payload

- fixture: UpRyakf5j80_clip_audio_v001
- 結果JSON: evals/clip_composition/outputs/boundary-signal-payload-UpRyakf5j80-v009-candidate-v001.json
- 単語時刻: evals/clip_composition/stt/UpRyakf5j80_kNX-wQTvsws_youtube_auto/source/word-timestamps.json
- 候補範囲: 11362439ms - 11409170ms
- 境界候補単位: 23件
- 遷移: 22件

## 目的

v009で発話途中の境界を扱えるように、expectedから独立した字幕時刻の境界候補を作る。
このpayload本体は、selectedThemeの候補発話範囲と重なる字幕時刻だけを含み、expectedCutsや音声比較で確定した正解時刻は含めない。

## 漏えい確認

- expectedの開始・終了時刻と同じ数値はpayload本体に見つからない。

## 遷移

- transition_001: overlap / prevEnd 11362439ms (189:22.439) / nextStart 11360880ms (189:20.880) / 怖いから一緒に入ろう -> うん
- transition_002: overlap / prevEnd 11364140ms (189:24.140) / nextStart 11362439ms (189:22.439) / うん -> 香りどうもありがとうございます
- transition_003: overlap / prevEnd 11366760ms (189:26.760) / nextStart 11364140ms (189:24.140) / 香りどうもありがとうございます -> とある記事で船長は
- transition_004: overlap / prevEnd 11368859ms (189:28.859) / nextStart 11366760ms (189:26.760) / とある記事で船長は -> 現在現役で活躍されているvtuberで
- transition_005: overlap / prevEnd 11370479ms (189:30.479) / nextStart 11368859ms (189:28.859) / 現在現役で活躍されているvtuberで -> 世界2位なんだと取り上げられているのを
- transition_006: overlap / prevEnd 11372939ms (189:32.939) / nextStart 11370479ms (189:30.479) / 世界2位なんだと取り上げられているのを -> 見ましたその人と結婚してるなんてどうか
- transition_007: overlap / prevEnd 11373899ms (189:33.899) / nextStart 11372939ms (189:32.939) / 見ましたその人と結婚してるなんてどうか -> 私も
- transition_008: overlap / prevEnd 11375640ms (189:35.640) / nextStart 11373899ms (189:33.899) / 私も -> 誇らしいやら
- transition_009: overlap / prevEnd 11377620ms (189:37.620) / nextStart 11375640ms (189:35.640) / 誇らしいやら -> 恥ずかしいやろで緊張していますどうした
- transition_010: overlap / prevEnd 11381180ms (189:41.180) / nextStart 11377620ms (189:37.620) / 恥ずかしいやろで緊張していますどうした -> マジで大丈夫か
- transition_011: gap / prevEnd 11381180ms (189:41.180) / nextStart 11381340ms (189:41.340) / マジで大丈夫か -> さあそんな世界に行くとか
- transition_012: overlap / prevEnd 11385540ms (189:45.540) / nextStart 11383740ms (189:43.740) / さあそんな世界に行くとか -> 言うけどさそんなもんさーやめようよ
- transition_013: overlap / prevEnd 11388479ms (189:48.479) / nextStart 11385540ms (189:45.540) / 言うけどさそんなもんさーやめようよ -> そんなのなんか
- transition_014: overlap / prevEnd 11391899ms (189:51.899) / nextStart 11388479ms (189:48.479) / そんなのなんか -> あんまりなんかそういうさあ
- transition_015: overlap / prevEnd 11394479ms (189:54.479) / nextStart 11391899ms (189:51.899) / あんまりなんかそういうさあ -> 変動するじゃんそういうのって
- transition_016: overlap / prevEnd 11397300ms (189:57.300) / nextStart 11394479ms (189:54.479) / 変動するじゃんそういうのって -> 変動するものであんま喜べないんだよね
- transition_017: overlap / prevEnd 11398200ms (189:58.200) / nextStart 11397300ms (189:57.300) / 変動するものであんま喜べないんだよね -> 船長
- transition_018: overlap / prevEnd 11399359ms (189:59.359) / nextStart 11398200ms (189:58.200) / 船長 -> うん
- transition_019: overlap / prevEnd 11402359ms (190:02.359) / nextStart 11399359ms (189:59.359) / うん -> どうせまた変わるしみたいな感じ
- transition_020: overlap / prevEnd 11404850ms (190:04.850) / nextStart 11402359ms (190:02.359) / どうせまた変わるしみたいな感じ -> あんま喜べないんだよね先日の
- transition_021: touching / prevEnd 11405460ms (190:05.460) / nextStart 11405460ms (190:05.460) / あんま喜べないんだよね先日の -> うん
- transition_022: overlap / prevEnd 11409170ms (190:09.170) / nextStart 11407260ms (190:07.260) / うん -> えーっと
