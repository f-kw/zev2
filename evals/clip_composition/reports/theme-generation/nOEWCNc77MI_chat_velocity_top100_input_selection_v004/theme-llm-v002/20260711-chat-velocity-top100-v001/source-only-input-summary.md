# theme redo source-only input package

- 対象: nOEWCNc77MI
- 入力セット: nOEWCNc77MI_chat_velocity_top100_input_selection_v004
- 入力選定版: input-selection-v004
- 入力選定計画: evals/clip_composition/outputs/chat-velocity-analysis/nOEWCNc77MI-input-selection-v004-chat-top100-plan.json
- 元配信: YE-faluP7zY
- 生成系統: theme-llm-v002
- プロンプト版: theme_generation_prompt_v002
- 候補数N: 8
- 予定runs: 1
- 全体prompt bytes: 258947
- STT manifest: evals/clip_composition/stt/nOEWCNc77MI_YE-faluP7zY_local30_v001/source/manifest.json
- STT完了状態: complete
- 窓分割: あり
- 窓数: 37
- 通常窓: 37
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
| window_01_YE-faluP7zY | primary | 1:00-5:28 | 21 | 13077 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_01_YE-faluP7zY-prompt.md |
| window_02_YE-faluP7zY | primary | 5:30-8:27 | 22 | 12659 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_02_YE-faluP7zY-prompt.md |
| window_03_YE-faluP7zY | primary | 8:31-11:40 | 20 | 12885 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_03_YE-faluP7zY-prompt.md |
| window_04_YE-faluP7zY | primary | 11:40-14:24 | 29 | 12963 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_04_YE-faluP7zY-prompt.md |
| window_05_YE-faluP7zY | primary | 14:24-16:59 | 24 | 13046 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_05_YE-faluP7zY-prompt.md |
| window_06_YE-faluP7zY | primary | 17:01-23:12 | 27 | 12957 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_06_YE-faluP7zY-prompt.md |
| window_07_YE-faluP7zY | primary | 23:12-28:33 | 24 | 13078 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_07_YE-faluP7zY-prompt.md |
| window_08_YE-faluP7zY | primary | 28:33-30:34 | 29 | 13000 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_08_YE-faluP7zY-prompt.md |
| window_09_YE-faluP7zY | primary | 30:34-34:59 | 27 | 12216 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_09_YE-faluP7zY-prompt.md |
| window_10_YE-faluP7zY | primary | 35:00-38:24 | 23 | 13069 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_10_YE-faluP7zY-prompt.md |
| window_11_YE-faluP7zY | primary | 38:24-44:57 | 26 | 12947 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_11_YE-faluP7zY-prompt.md |
| window_12_YE-faluP7zY | primary | 46:00-47:33 | 34 | 13061 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_12_YE-faluP7zY-prompt.md |
| window_13_YE-faluP7zY | primary | 47:33-50:26 | 25 | 12890 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_13_YE-faluP7zY-prompt.md |
| window_14_YE-faluP7zY | primary | 50:26-53:29 | 24 | 12832 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_14_YE-faluP7zY-prompt.md |
| window_15_YE-faluP7zY | primary | 53:31-57:47 | 26 | 12773 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_15_YE-faluP7zY-prompt.md |
| window_16_YE-faluP7zY | primary | 57:47-1:05:03 | 22 | 12958 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_16_YE-faluP7zY-prompt.md |
| window_17_YE-faluP7zY | primary | 1:05:03-1:07:35 | 27 | 13018 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_17_YE-faluP7zY-prompt.md |
| window_18_YE-faluP7zY | primary | 1:07:35-1:20:31 | 25 | 13067 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_18_YE-faluP7zY-prompt.md |
| window_19_YE-faluP7zY | primary | 1:20:31-1:26:29 | 26 | 12920 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_19_YE-faluP7zY-prompt.md |
| window_20_YE-faluP7zY | primary | 1:26:30-1:34:32 | 27 | 12963 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_20_YE-faluP7zY-prompt.md |
| window_21_YE-faluP7zY | primary | 1:34:32-1:41:11 | 28 | 12975 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_21_YE-faluP7zY-prompt.md |
| window_22_YE-faluP7zY | primary | 1:41:11-1:46:44 | 25 | 12955 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_22_YE-faluP7zY-prompt.md |
| window_23_YE-faluP7zY | primary | 1:46:44-1:52:56 | 24 | 12930 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_23_YE-faluP7zY-prompt.md |
| window_24_YE-faluP7zY | primary | 1:52:56-2:07:34 | 28 | 12904 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_24_YE-faluP7zY-prompt.md |
| window_25_YE-faluP7zY | primary | 2:07:34-2:07:38 | 37 | 12977 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_25_YE-faluP7zY-prompt.md |
| window_26_YE-faluP7zY | primary | 2:07:38-2:07:47 | 37 | 12977 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_26_YE-faluP7zY-prompt.md |
| window_27_YE-faluP7zY | primary | 2:07:47-2:11:12 | 35 | 12898 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_27_YE-faluP7zY-prompt.md |
| window_28_YE-faluP7zY | primary | 2:11:12-2:21:39 | 27 | 12978 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_28_YE-faluP7zY-prompt.md |
| window_29_YE-faluP7zY | primary | 2:21:39-2:26:45 | 25 | 12829 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_29_YE-faluP7zY-prompt.md |
| window_30_YE-faluP7zY | primary | 2:26:45-2:32:35 | 26 | 12909 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_30_YE-faluP7zY-prompt.md |
| window_31_YE-faluP7zY | primary | 2:32:35-2:41:16 | 31 | 13054 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_31_YE-faluP7zY-prompt.md |
| window_32_YE-faluP7zY | primary | 2:41:16-2:56:03 | 22 | 12972 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_32_YE-faluP7zY-prompt.md |
| window_33_YE-faluP7zY | primary | 2:56:03-2:59:55 | 28 | 13036 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_33_YE-faluP7zY-prompt.md |
| window_34_YE-faluP7zY | primary | 3:03:02-3:04:58 | 28 | 12939 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_34_YE-faluP7zY-prompt.md |
| window_35_YE-faluP7zY | primary | 3:04:58-3:11:18 | 27 | 12890 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_35_YE-faluP7zY-prompt.md |
| window_36_YE-faluP7zY | primary | 3:11:18-3:13:27 | 28 | 12914 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_36_YE-faluP7zY-prompt.md |
| window_37_YE-faluP7zY | primary | 3:13:32-3:15:40 | 11 | 8966 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/windows/window_37_YE-faluP7zY-prompt.md |
