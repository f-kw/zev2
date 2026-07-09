# local STT resume plan

- 出力ID: nOEWCNc77MI-YE-faluP7zY-rough-top50-resume-20260710-v002
- manifest: evals/clip_composition/stt/nOEWCNc77MI_YE-faluP7zY_rough_top50_speech_chars_local30_v001/source/manifest.json
- 完了状態: incomplete
- 処理済み: 7,11,13-14,17-19
- 未処理: 20,22,29,32-33,40-41,43,51,53,55,59,66-67,80,91,98-99,101,125,128,136,144,165,175,180,182,194,207,216-218,224,229,279,323,325,330,362,366,375-376,379
- 全対象: 7,11,13-14,17-20,22,29,32-33,40-41,43,51,53,55,59,66-67,80,91,98-99,101,125,128,136,144,165,175,180,182,194,207,216-218,224,229,279,323,325,330,362,366,375-376,379

## 処理の意味

- STTサーバー停止で中断した選択チャンクSTTを、同じ対象範囲で再開するためのメモ。
- 既存rawがあるチャンクは `run_local_stt_selected_chunks.mjs` が再利用する。
- 未処理チャンクが残っている場合は、STTサーバー再起動後に下のコマンドを再実行する。

## 再開コマンド

```bash
node evals/clip_composition/run_local_stt_selected_chunks.mjs \
  --chunksDir evals/clip_composition/stt/nOEWCNc77MI_YE-faluP7zY_local30_v001/source/chunks \
  --id nOEWCNc77MI_YE-faluP7zY_rough_top50_speech_chars_local30_v001 \
  --role source \
  --ranges 7,11,13-14,17-20,22,29,32-33,40-41,43,51,53,55,59,66-67,80,91,98-99,101,125,128,136,144,165,175,180,182,194,207,216-218,224,229,279,323,325,330,362,366,375-376,379 \
  --server http://192.168.1.4:8000 \
  --chunkSec 30 \
  --timeoutMs 1800000
```

## 制約

- fixture/expectedは作成しない。
- runtimeへ書き込まない。
- 本体側には触れない。
