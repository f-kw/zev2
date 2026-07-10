# theme redo source-only input package

- 対象: nOEWCNc77MI
- 入力セット: nOEWCNc77MI_rough_top50_speech_chars_source_only_v001
- 元配信: YE-faluP7zY
- 生成系統: theme-llm-v002
- プロンプト版: theme_generation_prompt_v002
- 候補数N: 8
- 予定runs: 1
- 全体prompt bytes: 59833
- STT manifest: evals/clip_composition/stt/nOEWCNc77MI_YE-faluP7zY_rough_top50_speech_chars_local30_v001/source/manifest.json
- STT完了状態: complete
- 窓分割: あり
- 窓数: 8
- 通常窓: 8
- 境界補完窓: 0
- 窓間オーバーラップ: 0ms
- prompt byte上限: 13084
- 漏洩検査: pass
- Web Gemini実走: なし
- fixture/expected作成: なし

## 入力分離

- モデル入力は元配信STTと元配信メタ情報だけで構成。
- 切り抜きID、切り抜きURL、expected、照合結果、人間確認メモ、固定テーマはモデル入力に入れない。
- このパッケージは実走準備であり、正解データではない。

## 窓

| window | kind | source range | speeches | prompt bytes | prompt |
| --- | --- | --- | ---: | ---: | --- |
| window_01_YE-faluP7zY | primary | 3:30-8:59 | 20 | 12636 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_rough_top50_speech_chars_source_only_v001/theme-llm-v002/nOEWCNc77MI-rough-top50-theme-input-after-stt-20260710-v001/windows/window_01_YE-faluP7zY-prompt.md |
| window_02_YE-faluP7zY | primary | 9:00-16:49 | 20 | 12930 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_rough_top50_speech_chars_source_only_v001/theme-llm-v002/nOEWCNc77MI-rough-top50-theme-input-after-stt-20260710-v001/windows/window_02_YE-faluP7zY-prompt.md |
| window_03_YE-faluP7zY | primary | 16:49-26:59 | 24 | 12874 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_rough_top50_speech_chars_source_only_v001/theme-llm-v002/nOEWCNc77MI-rough-top50-theme-input-after-stt-20260710-v001/windows/window_03_YE-faluP7zY-prompt.md |
| window_04_YE-faluP7zY | primary | 27:30-49:05 | 22 | 13002 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_rough_top50_speech_chars_source_only_v001/theme-llm-v002/nOEWCNc77MI-rough-top50-theme-input-after-stt-20260710-v001/windows/window_04_YE-faluP7zY-prompt.md |
| window_05_YE-faluP7zY | primary | 49:05-1:22:42 | 22 | 12892 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_rough_top50_speech_chars_source_only_v001/theme-llm-v002/nOEWCNc77MI-rough-top50-theme-input-after-stt-20260710-v001/windows/window_05_YE-faluP7zY-prompt.md |
| window_06_YE-faluP7zY | primary | 1:22:42-1:49:18 | 22 | 12994 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_rough_top50_speech_chars_source_only_v001/theme-llm-v002/nOEWCNc77MI-rough-top50-theme-input-after-stt-20260710-v001/windows/window_06_YE-faluP7zY-prompt.md |
| window_07_YE-faluP7zY | primary | 1:49:18-2:42:59 | 24 | 12808 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_rough_top50_speech_chars_source_only_v001/theme-llm-v002/nOEWCNc77MI-rough-top50-theme-input-after-stt-20260710-v001/windows/window_07_YE-faluP7zY-prompt.md |
| window_08_YE-faluP7zY | primary | 2:45:00-3:09:59 | 14 | 11462 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_rough_top50_speech_chars_source_only_v001/theme-llm-v002/nOEWCNc77MI-rough-top50-theme-input-after-stt-20260710-v001/windows/window_08_YE-faluP7zY-prompt.md |
