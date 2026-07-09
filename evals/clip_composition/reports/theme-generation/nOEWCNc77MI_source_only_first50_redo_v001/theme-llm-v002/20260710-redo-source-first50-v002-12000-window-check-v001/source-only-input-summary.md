# theme redo source-only input package

- 対象: nOEWCNc77MI
- 入力セット: nOEWCNc77MI_source_only_first50_redo_v001
- 元配信: YE-faluP7zY
- 生成系統: theme-llm-v002
- プロンプト版: theme_generation_prompt_v002
- 候補数N: 8
- 予定runs: 1
- 全体prompt bytes: 63110
- STT manifest: evals/clip_composition/stt/nOEWCNc77MI_YE-faluP7zY_local30_first50_v001/source/manifest.json
- STT完了状態: unknown
- 窓分割: あり
- 窓数: 10
- 通常窓: 10
- 境界補完窓: 0
- 窓間オーバーラップ: 0ms
- prompt byte上限: 12000
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
| window_01_YE-faluP7zY | primary | 1:00-4:27 | 19 | 11920 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_source_only_first50_redo_v001/theme-llm-v002/20260710-redo-source-first50-v002-12000-window-check-v001/windows/window_01_YE-faluP7zY-prompt.md |
| window_02_YE-faluP7zY | primary | 4:38-6:57 | 20 | 11873 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_source_only_first50_redo_v001/theme-llm-v002/20260710-redo-source-first50-v002-12000-window-check-v001/windows/window_02_YE-faluP7zY-prompt.md |
| window_03_YE-faluP7zY | primary | 7:00-10:48 | 14 | 11953 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_source_only_first50_redo_v001/theme-llm-v002/20260710-redo-source-first50-v002-12000-window-check-v001/windows/window_03_YE-faluP7zY-prompt.md |
| window_04_YE-faluP7zY | primary | 10:48-12:28 | 20 | 11518 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_source_only_first50_redo_v001/theme-llm-v002/20260710-redo-source-first50-v002-12000-window-check-v001/windows/window_04_YE-faluP7zY-prompt.md |
| window_05_YE-faluP7zY | primary | 12:32-14:24 | 22 | 11782 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_source_only_first50_redo_v001/theme-llm-v002/20260710-redo-source-first50-v002-12000-window-check-v001/windows/window_05_YE-faluP7zY-prompt.md |
| window_06_YE-faluP7zY | primary | 14:24-16:46 | 19 | 11914 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_source_only_first50_redo_v001/theme-llm-v002/20260710-redo-source-first50-v002-12000-window-check-v001/windows/window_06_YE-faluP7zY-prompt.md |
| window_07_YE-faluP7zY | primary | 16:46-18:59 | 23 | 11866 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_source_only_first50_redo_v001/theme-llm-v002/20260710-redo-source-first50-v002-12000-window-check-v001/windows/window_07_YE-faluP7zY-prompt.md |
| window_08_YE-faluP7zY | primary | 19:00-20:37 | 24 | 11865 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_source_only_first50_redo_v001/theme-llm-v002/20260710-redo-source-first50-v002-12000-window-check-v001/windows/window_08_YE-faluP7zY-prompt.md |
| window_09_YE-faluP7zY | primary | 20:37-22:31 | 22 | 11699 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_source_only_first50_redo_v001/theme-llm-v002/20260710-redo-source-first50-v002-12000-window-check-v001/windows/window_09_YE-faluP7zY-prompt.md |
| window_10_YE-faluP7zY | primary | 22:31-24:58 | 15 | 10620 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_source_only_first50_redo_v001/theme-llm-v002/20260710-redo-source-first50-v002-12000-window-check-v001/windows/window_10_YE-faluP7zY-prompt.md |
