# 境界精度用STT readiness

- 結果JSON: outputs/boundary-stt-readiness-20260705-v003.json
- 作業リストJSON: evals/clip_composition/outputs/boundary-stt-jobs-20260705-v002.json

## 目的

境界精度用STTの予定出力がそろっているか、単語時刻が境界点を覆っているかを確認する。
この確認はSTTを実行しない。

## UpRyakf5j80_clip_audio_v001

- 対象ID: UpRyakf5j80

### clip / UpRyakf5j80_local_boundary_v001

- 状態: missing_output
- 入力: evals/clip_composition/research/downloads/UpRyakf5j80/UpRyakf5j80.m4a
- 単語時刻: evals/clip_composition/stt/UpRyakf5j80_local_boundary_v001/clip/word-timestamps.json
- 発話: evals/clip_composition/stt/UpRyakf5j80_local_boundary_v001/clip/transcript.json

### source / UpRyakf5j80_kNX-wQTvsws_local_boundary_v001

- 状態: missing_output
- 入力: evals/clip_composition/research/downloads/UpRyakf5j80/sources/kNX-wQTvsws/kNX-wQTvsws_3h09m17s_55s_audio.m4a
- 単語時刻: evals/clip_composition/stt/UpRyakf5j80_kNX-wQTvsws_local_boundary_v001/source/word-timestamps.json
- 発話: evals/clip_composition/stt/UpRyakf5j80_kNX-wQTvsws_local_boundary_v001/source/transcript.json

## 読み取り

- `missing_output` は、STTがまだ保存されていない状態。
- `missing_words` は、STT出力はあるが単語時刻がない状態。
- `ready` は、単語時刻があり、境界付近を確認できる状態。
