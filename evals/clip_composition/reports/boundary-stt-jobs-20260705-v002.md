# 境界精度用STT作業リスト

- 結果JSON: outputs/boundary-stt-jobs-20260705-v002.json
- 境界粒度JSON: evals/clip_composition/outputs/boundary-granularity-20260705-v001.json
- STT対象定義: evals/clip_composition/stt-targets/UpRyakf5j80.json

## 目的

期待境界が発話途中にあるfixtureについて、次にどの短い音声をSTTまたは音声境界解析へ回すべきかを固定する。
このレポートはSTTを実行しない。runtimeにも書き込まない。

## UpRyakf5j80_clip_audio_v001

- 理由: 期待境界が文字起こし発話の途中にあるため、発話単位より細かい境界情報が必要。
- 対象ID: UpRyakf5j80
- 元動画切り出し範囲: 11357000-11412004ms

### 必要な境界

- 開始境界 11364500ms: 発話1 11362439-11366760ms「香りどうもありがとうございます」 の途中。発話開始から 2061ms、発話終了まで 2260ms。切り抜き音声内では 0ms。切り出し音声内では 7500ms
- 終了境界 11407178ms: 発話20 11405460-11409170ms「うん」 の途中。発話開始から 1718ms、発話終了まで 1992ms。切り抜き音声内では 42678ms。切り出し音声内では 50178ms

### STT実行候補

切り抜き側:

```sh
node evals/clip_composition/run_local_stt.ts --input evals/clip_composition/research/downloads/UpRyakf5j80/UpRyakf5j80.m4a --id UpRyakf5j80_local_boundary_v001 --role clip --server http://192.168.1.8:8000
```

- 単語時刻出力: evals/clip_composition/stt/UpRyakf5j80_local_boundary_v001/clip/word-timestamps.json
- 発話出力: evals/clip_composition/stt/UpRyakf5j80_local_boundary_v001/clip/transcript.json

元動画側:

```sh
node evals/clip_composition/run_local_stt.ts --input evals/clip_composition/research/downloads/UpRyakf5j80/sources/kNX-wQTvsws/kNX-wQTvsws_3h09m17s_55s_audio.m4a --id UpRyakf5j80_kNX-wQTvsws_local_boundary_v001 --role source --server http://192.168.1.8:8000
```

- 単語時刻出力: evals/clip_composition/stt/UpRyakf5j80_kNX-wQTvsws_local_boundary_v001/source/word-timestamps.json
- 発話出力: evals/clip_composition/stt/UpRyakf5j80_kNX-wQTvsws_local_boundary_v001/source/transcript.json

### 注意

- STTはここでは実行しない。サーバー復旧後にコマンドを実行する。
- 期待境界をモデル入力へ直接渡すのではなく、単語境界または音声境界を得るための最小STT対象として扱う。
- clipBoundaryMs は、切り抜き音声内で期待境界に対応する位置を示す確認用の値。
- sourceSliceBoundaryMs は、元動画切り出し音声内で期待境界がどこにあるかを示す確認用の値。
