# theme redo source-only input package

- 対象: 9dtwF5Exu5w
- 入力セット: 9dtwF5Exu5w_chat_velocity_top100_input_selection_v004
- 入力選定版: input-selection-v004
- 入力選定計画: evals/clip_composition/outputs/chat-velocity-analysis/9dtwF5Exu5w-input-selection-v004-chat-top100-plan.json
- 元配信: o8rZAhARXAc
- 生成系統: theme-llm-v002
- プロンプト版: theme_generation_prompt_v002
- 候補数N: 8
- 予定runs: 1
- 全体prompt bytes: 194319
- STT manifest: evals/clip_composition/stt/9dtwF5Exu5w_o8rZAhARXAc_local30_v001/source/manifest.json
- STT完了状態: complete
- 窓分割: あり
- 窓数: 28
- 通常窓: 28
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
| window_01_o8rZAhARXAc | primary | 2:03-14:24 | 25 | 13032 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_01_o8rZAhARXAc-prompt.md |
| window_02_o8rZAhARXAc | primary | 14:32-18:29 | 30 | 12956 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_02_o8rZAhARXAc-prompt.md |
| window_03_o8rZAhARXAc | primary | 18:33-30:29 | 26 | 12848 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_03_o8rZAhARXAc-prompt.md |
| window_04_o8rZAhARXAc | primary | 30:30-44:59 | 20 | 13077 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_04_o8rZAhARXAc-prompt.md |
| window_05_o8rZAhARXAc | primary | 45:00-50:37 | 29 | 12959 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_05_o8rZAhARXAc-prompt.md |
| window_06_o8rZAhARXAc | primary | 50:37-59:14 | 28 | 13061 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_06_o8rZAhARXAc-prompt.md |
| window_07_o8rZAhARXAc | primary | 59:14-1:08:14 | 19 | 13044 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_07_o8rZAhARXAc-prompt.md |
| window_08_o8rZAhARXAc | primary | 1:08:16-1:14:46 | 21 | 12992 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_08_o8rZAhARXAc-prompt.md |
| window_09_o8rZAhARXAc | primary | 1:14:46-1:18:30 | 29 | 12912 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_09_o8rZAhARXAc-prompt.md |
| window_10_o8rZAhARXAc | primary | 1:18:30-1:23:20 | 33 | 13033 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_10_o8rZAhARXAc-prompt.md |
| window_11_o8rZAhARXAc | primary | 1:23:20-1:37:14 | 31 | 13079 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_11_o8rZAhARXAc-prompt.md |
| window_12_o8rZAhARXAc | primary | 1:37:14-1:45:59 | 26 | 12869 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_12_o8rZAhARXAc-prompt.md |
| window_13_o8rZAhARXAc | primary | 1:46:00-1:49:39 | 29 | 13026 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_13_o8rZAhARXAc-prompt.md |
| window_14_o8rZAhARXAc | primary | 1:49:39-1:51:20 | 33 | 12920 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_14_o8rZAhARXAc-prompt.md |
| window_15_o8rZAhARXAc | primary | 1:51:20-1:53:17 | 33 | 13016 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_15_o8rZAhARXAc-prompt.md |
| window_16_o8rZAhARXAc | primary | 1:53:17-1:56:46 | 26 | 13077 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_16_o8rZAhARXAc-prompt.md |
| window_17_o8rZAhARXAc | primary | 1:56:46-2:02:58 | 15 | 12801 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_17_o8rZAhARXAc-prompt.md |
| window_18_o8rZAhARXAc | primary | 2:03:01-2:08:57 | 28 | 12786 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_18_o8rZAhARXAc-prompt.md |
| window_19_o8rZAhARXAc | primary | 2:10:01-2:16:58 | 29 | 12965 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_19_o8rZAhARXAc-prompt.md |
| window_20_o8rZAhARXAc | primary | 2:16:58-2:18:25 | 35 | 13051 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_20_o8rZAhARXAc-prompt.md |
| window_21_o8rZAhARXAc | primary | 2:18:25-2:38:59 | 28 | 13077 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_21_o8rZAhARXAc-prompt.md |
| window_22_o8rZAhARXAc | primary | 2:38:59-2:53:15 | 25 | 12974 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_22_o8rZAhARXAc-prompt.md |
| window_23_o8rZAhARXAc | primary | 2:53:15-2:54:51 | 32 | 12943 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_23_o8rZAhARXAc-prompt.md |
| window_24_o8rZAhARXAc | primary | 2:54:51-2:58:58 | 32 | 13069 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_24_o8rZAhARXAc-prompt.md |
| window_25_o8rZAhARXAc | primary | 2:58:58-3:00:48 | 34 | 12979 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_25_o8rZAhARXAc-prompt.md |
| window_26_o8rZAhARXAc | primary | 3:00:48-3:06:58 | 26 | 13076 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_26_o8rZAhARXAc-prompt.md |
| window_27_o8rZAhARXAc | primary | 3:07:03-3:16:29 | 26 | 12767 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_27_o8rZAhARXAc-prompt.md |
| window_28_o8rZAhARXAc | primary | 3:17:03-3:17:19 | 1 | 6346 | evals/clip_composition/reports/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/windows/window_28_o8rZAhARXAc-prompt.md |
