# theme redo source-only input package

- 対象: nOEWCNc77MI
- 入力セット: nOEWCNc77MI_full_source_input_selection_v003
- 元配信: YE-faluP7zY
- 生成系統: theme-llm-v002
- プロンプト版: theme_generation_prompt_v002
- 候補数N: 8
- 予定runs: 1
- 全体prompt bytes: 479491
- STT manifest: evals/clip_composition/stt/nOEWCNc77MI_YE-faluP7zY_local30_v001/source/manifest.json
- STT完了状態: complete
- 窓分割: あり
- 窓数: 69
- 通常窓: 69
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
| window_01_YE-faluP7zY | primary | 1:00-5:28 | 21 | 13077 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_01_YE-faluP7zY-prompt.md |
| window_02_YE-faluP7zY | primary | 5:30-8:27 | 22 | 12659 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_02_YE-faluP7zY-prompt.md |
| window_03_YE-faluP7zY | primary | 8:31-11:40 | 20 | 12885 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_03_YE-faluP7zY-prompt.md |
| window_04_YE-faluP7zY | primary | 11:40-14:20 | 24 | 12954 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_04_YE-faluP7zY-prompt.md |
| window_05_YE-faluP7zY | primary | 14:20-16:33 | 25 | 12865 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_05_YE-faluP7zY-prompt.md |
| window_06_YE-faluP7zY | primary | 16:33-19:04 | 28 | 13050 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_06_YE-faluP7zY-prompt.md |
| window_07_YE-faluP7zY | primary | 19:04-21:20 | 27 | 12983 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_07_YE-faluP7zY-prompt.md |
| window_08_YE-faluP7zY | primary | 21:20-23:59 | 25 | 12744 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_08_YE-faluP7zY-prompt.md |
| window_09_YE-faluP7zY | primary | 24:00-27:08 | 22 | 12902 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_09_YE-faluP7zY-prompt.md |
| window_10_YE-faluP7zY | primary | 27:08-30:04 | 25 | 13073 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_10_YE-faluP7zY-prompt.md |
| window_11_YE-faluP7zY | primary | 30:04-31:29 | 31 | 12929 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_11_YE-faluP7zY-prompt.md |
| window_12_YE-faluP7zY | primary | 31:31-34:15 | 24 | 12971 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_12_YE-faluP7zY-prompt.md |
| window_13_YE-faluP7zY | primary | 34:15-37:23 | 23 | 12892 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_13_YE-faluP7zY-prompt.md |
| window_14_YE-faluP7zY | primary | 37:23-40:10 | 28 | 13016 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_14_YE-faluP7zY-prompt.md |
| window_15_YE-faluP7zY | primary | 40:10-42:21 | 27 | 12965 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_15_YE-faluP7zY-prompt.md |
| window_16_YE-faluP7zY | primary | 42:21-46:13 | 25 | 12954 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_16_YE-faluP7zY-prompt.md |
| window_17_YE-faluP7zY | primary | 46:13-48:13 | 32 | 13032 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_17_YE-faluP7zY-prompt.md |
| window_18_YE-faluP7zY | primary | 48:13-50:34 | 27 | 12937 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_18_YE-faluP7zY-prompt.md |
| window_19_YE-faluP7zY | primary | 50:34-54:03 | 23 | 13057 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_19_YE-faluP7zY-prompt.md |
| window_20_YE-faluP7zY | primary | 54:03-58:15 | 28 | 13002 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_20_YE-faluP7zY-prompt.md |
| window_21_YE-faluP7zY | primary | 58:15-1:02:47 | 20 | 12885 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_21_YE-faluP7zY-prompt.md |
| window_22_YE-faluP7zY | primary | 1:02:47-1:04:39 | 28 | 12758 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_22_YE-faluP7zY-prompt.md |
| window_23_YE-faluP7zY | primary | 1:04:39-1:07:20 | 26 | 13057 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_23_YE-faluP7zY-prompt.md |
| window_24_YE-faluP7zY | primary | 1:07:20-1:10:33 | 23 | 13014 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_24_YE-faluP7zY-prompt.md |
| window_25_YE-faluP7zY | primary | 1:10:33-1:12:34 | 29 | 13034 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_25_YE-faluP7zY-prompt.md |
| window_26_YE-faluP7zY | primary | 1:12:34-1:14:59 | 30 | 13024 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_26_YE-faluP7zY-prompt.md |
| window_27_YE-faluP7zY | primary | 1:15:00-1:17:06 | 27 | 12878 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_27_YE-faluP7zY-prompt.md |
| window_28_YE-faluP7zY | primary | 1:17:06-1:19:39 | 25 | 12784 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_28_YE-faluP7zY-prompt.md |
| window_29_YE-faluP7zY | primary | 1:19:39-1:22:58 | 26 | 12997 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_29_YE-faluP7zY-prompt.md |
| window_30_YE-faluP7zY | primary | 1:23:00-1:25:35 | 27 | 12839 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_30_YE-faluP7zY-prompt.md |
| window_31_YE-faluP7zY | primary | 1:25:35-1:28:29 | 26 | 13027 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_31_YE-faluP7zY-prompt.md |
| window_32_YE-faluP7zY | primary | 1:28:30-1:31:41 | 23 | 12954 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_32_YE-faluP7zY-prompt.md |
| window_33_YE-faluP7zY | primary | 1:31:41-1:34:46 | 27 | 12957 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_33_YE-faluP7zY-prompt.md |
| window_34_YE-faluP7zY | primary | 1:34:46-1:37:11 | 27 | 12769 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_34_YE-faluP7zY-prompt.md |
| window_35_YE-faluP7zY | primary | 1:37:11-1:40:48 | 24 | 13018 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_35_YE-faluP7zY-prompt.md |
| window_36_YE-faluP7zY | primary | 1:40:48-1:44:28 | 23 | 12940 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_36_YE-faluP7zY-prompt.md |
| window_37_YE-faluP7zY | primary | 1:44:28-1:46:59 | 27 | 12923 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_37_YE-faluP7zY-prompt.md |
| window_38_YE-faluP7zY | primary | 1:47:01-1:50:27 | 25 | 13055 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_38_YE-faluP7zY-prompt.md |
| window_39_YE-faluP7zY | primary | 1:50:27-1:53:12 | 26 | 12901 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_39_YE-faluP7zY-prompt.md |
| window_40_YE-faluP7zY | primary | 1:53:12-1:56:15 | 21 | 12793 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_40_YE-faluP7zY-prompt.md |
| window_41_YE-faluP7zY | primary | 1:56:15-1:58:59 | 26 | 12842 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_41_YE-faluP7zY-prompt.md |
| window_42_YE-faluP7zY | primary | 1:59:00-2:01:59 | 23 | 12363 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_42_YE-faluP7zY-prompt.md |
| window_43_YE-faluP7zY | primary | 2:02:00-2:04:59 | 20 | 12698 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_43_YE-faluP7zY-prompt.md |
| window_44_YE-faluP7zY | primary | 2:05:00-2:07:35 | 30 | 13072 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_44_YE-faluP7zY-prompt.md |
| window_45_YE-faluP7zY | primary | 2:07:35-2:07:38 | 37 | 12977 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_45_YE-faluP7zY-prompt.md |
| window_46_YE-faluP7zY | primary | 2:07:38-2:07:53 | 37 | 12977 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_46_YE-faluP7zY-prompt.md |
| window_47_YE-faluP7zY | primary | 2:07:53-2:09:29 | 32 | 12971 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_47_YE-faluP7zY-prompt.md |
| window_48_YE-faluP7zY | primary | 2:09:30-2:13:03 | 22 | 12778 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_48_YE-faluP7zY-prompt.md |
| window_49_YE-faluP7zY | primary | 2:13:03-2:15:59 | 23 | 12853 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_49_YE-faluP7zY-prompt.md |
| window_50_YE-faluP7zY | primary | 2:16:01-2:19:52 | 26 | 12950 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_50_YE-faluP7zY-prompt.md |
| window_51_YE-faluP7zY | primary | 2:19:54-2:22:57 | 26 | 12831 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_51_YE-faluP7zY-prompt.md |
| window_52_YE-faluP7zY | primary | 2:23:00-2:26:23 | 19 | 13036 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_52_YE-faluP7zY-prompt.md |
| window_53_YE-faluP7zY | primary | 2:26:23-2:31:10 | 18 | 12559 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_53_YE-faluP7zY-prompt.md |
| window_54_YE-faluP7zY | primary | 2:31:10-2:32:59 | 31 | 13062 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_54_YE-faluP7zY-prompt.md |
| window_55_YE-faluP7zY | primary | 2:33:00-2:36:33 | 27 | 13046 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_55_YE-faluP7zY-prompt.md |
| window_56_YE-faluP7zY | primary | 2:36:33-2:39:34 | 29 | 12954 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_56_YE-faluP7zY-prompt.md |
| window_57_YE-faluP7zY | primary | 2:39:34-2:42:27 | 26 | 12808 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_57_YE-faluP7zY-prompt.md |
| window_58_YE-faluP7zY | primary | 2:42:30-2:45:32 | 22 | 13007 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_58_YE-faluP7zY-prompt.md |
| window_59_YE-faluP7zY | primary | 2:45:32-2:48:06 | 26 | 12993 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_59_YE-faluP7zY-prompt.md |
| window_60_YE-faluP7zY | primary | 2:48:06-2:51:13 | 23 | 12753 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_60_YE-faluP7zY-prompt.md |
| window_61_YE-faluP7zY | primary | 2:51:13-2:54:40 | 22 | 12833 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_61_YE-faluP7zY-prompt.md |
| window_62_YE-faluP7zY | primary | 2:54:40-2:57:46 | 21 | 12693 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_62_YE-faluP7zY-prompt.md |
| window_63_YE-faluP7zY | primary | 2:57:46-3:01:00 | 25 | 12874 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_63_YE-faluP7zY-prompt.md |
| window_64_YE-faluP7zY | primary | 3:01:00-3:03:37 | 26 | 12975 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_64_YE-faluP7zY-prompt.md |
| window_65_YE-faluP7zY | primary | 3:03:37-3:05:59 | 28 | 13076 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_65_YE-faluP7zY-prompt.md |
| window_66_YE-faluP7zY | primary | 3:06:01-3:08:30 | 27 | 12845 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_66_YE-faluP7zY-prompt.md |
| window_67_YE-faluP7zY | primary | 3:08:30-3:11:28 | 22 | 12610 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_67_YE-faluP7zY-prompt.md |
| window_68_YE-faluP7zY | primary | 3:11:31-3:13:27 | 27 | 12565 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_68_YE-faluP7zY-prompt.md |
| window_69_YE-faluP7zY | primary | 3:13:32-3:15:40 | 11 | 8966 | evals/clip_composition/reports/theme-generation/nOEWCNc77MI_full_source_input_selection_v003/theme-llm-v002/20260711-full-source-upper-bound-v001/windows/window_69_YE-faluP7zY-prompt.md |
