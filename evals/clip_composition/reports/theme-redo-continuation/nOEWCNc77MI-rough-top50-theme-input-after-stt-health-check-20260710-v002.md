# theme redo continuation

- 出力ID: nOEWCNc77MI-rough-top50-theme-input-after-stt-health-check-20260710-v002
- dry run: no
- STT manifest: evals/clip_composition/stt/nOEWCNc77MI_YE-faluP7zY_rough_top50_speech_chars_local30_v001/source/manifest.json
- STT完了状態: incomplete
- health: failed

## 処理の意味

- STTが未完了なら、既存rawを再利用して選択チャンクSTTを再開する。
- STT manifestが `complete: true` になった場合だけ、theme-llm-v002の入力パッケージを作る。
- `build_theme_redo_source_only_payload.mjs` 側にも未完了manifestガードがあるため、途中transcriptはLLM入力にならない。

## コマンド

1. resume selected chunk STT: blocked_by_stt_health

```bash
node evals/clip_composition/run_local_stt_selected_chunks.mjs --chunksDir evals/clip_composition/stt/nOEWCNc77MI_YE-faluP7zY_local30_v001/source/chunks --id nOEWCNc77MI_YE-faluP7zY_rough_top50_speech_chars_local30_v001 --role source --ranges 7,11,13,14,17,18,19,20,22,29,32,33,40,41,43,51,53,55,59,66,67,80,91,98,99,101,125,128,136,144,165,175,180,182,194,207,216,217,218,224,229,279,323,325,330,362,366,375,376,379 --server http://192.168.1.4:8000 --chunkSec 30 --timeoutMs 1800000
```

## 制約

- fixture/expectedは作成しない。
- runtimeへ書き込まない。
- 本体側には触れない。
