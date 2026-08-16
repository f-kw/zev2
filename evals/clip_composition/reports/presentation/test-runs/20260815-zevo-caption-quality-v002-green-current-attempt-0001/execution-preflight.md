# ZEVO字幕品質v002 現行green全件 attempt-0001 起動前記録

日付: 2026-08-15

## 検査集合

- 既存green正本8 file: 287件。
- 2026-08-15の前方確認対象: 誤選択した直接影響集合15 fileのうち、既存greenと重なる3 fileを除く12 file。前回実測では249件。
- 新規fixture gate 2件: 保存済み正式48件TAP内のZCQF001/ZCQF002を再利用する。no-replace製造検査を使用済みrootへ再実行せず、同一production/test byteに対する保存済み合格証拠をgreen会計へ加える。
- このattemptでは重複を除いた20 fileを頭から一括実行する。件数はTAPの現物集計から確定し、保存済みfixture 2件を加えた値を現行green総数とする。
- 前回不合格12件（OBM001、OEE001/002/005/006/007/008、OPF002/004/012/015/016）を全て含む。

## 起動条件

- native: Darwin 25.5.0 arm64。
- Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`、SHA-256 `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c`。
- TSX CLI: `/Users/kawafmm/workspace/zev2/runner/node_modules/tsx/dist/cli.mjs`、SHA-256 `5c916fa6ecad44aedbb01ca5815536d00ea07de6b73eeb9443d317326b0218d8`。
- `NODE_OPTIONS`: 不存在。
- `PATH`: 固定Node先頭、`/opt/homebrew/bin`を`/usr/local/bin`より前に配置。
- Chromium: 登録済み実体SHA-256 `b469d05c698ccf9f4ae3dc43fb194fbdcf56f9da1fc46dcc19f2bf9fe2aa20b8`、native headless `about:blank`起動終了0。
- FFmpeg: `/opt/homebrew/bin/ffmpeg`、SHA-256 `d105f770f53607ec1532b27e354ca7c3166a706dc1ccc6f96e3c8d3f54d7e798`。
- FFprobe: `/opt/homebrew/bin/ffprobe`、SHA-256 `dcb242647fedaa21618f7048c5f2982e584fdfbcfca098553b3121d1a5d509d9`。
- command: 固定Node → 固定TSX CLI絶対path → `--test --test-concurrency=1` → 下記20 fileの固定順。
- 証拠: TAP、stderr、終了code、signalを独立保存する。
- API通信0回、費用US$0、描画0件。

## 固定20 file

1. `evals/clip_composition/presentation_retained_source_atoms_v001.test.mjs`
2. `evals/clip_composition/presentation_segmenter_boundary_evidence_v001.test.mjs`
3. `evals/clip_composition/test_presentation_caption_semantic_source_package_v002.mjs`
4. `evals/clip_composition/test_presentation_caption_semantic_output_v001.mjs`
5. `evals/clip_composition/test_presentation_caption_semantic_output_v002.mjs`
6. `evals/clip_composition/presentation_base_media_timeline_v002.test.mjs`
7. `evals/clip_composition/test_presentation_caption_layout_inspection_json_v001.mjs`
8. `evals/clip_composition/test_presentation_caption_api_cost_guard_v001.mjs`
9. `evals/clip_composition/presentation_a_meaning_information_package_v002.test.mjs`
10. `evals/clip_composition/presentation_a_source_sequence_v002.test.mjs`
11. `evals/clip_composition/presentation_fatal_observation_v002.test.mjs`
12. `evals/clip_composition/presentation_meaning_information_package_v001.test.mjs`
13. `evals/clip_composition/presentation_output_base_media_v001.test.mjs`
14. `evals/clip_composition/presentation_output_contract_v001.test.mjs`
15. `evals/clip_composition/presentation_output_page_line_planner_v001.test.mjs`
16. `evals/clip_composition/presentation_output_page_line_planner_v002.test.mjs`
17. `evals/clip_composition/presentation_output_piecewise_timeline_v002.test.mjs`
18. `evals/clip_composition/presentation_output_render_plan_v001.test.mjs`
19. `evals/clip_composition/presentation_output_render_plan_v002.test.mjs`
20. `evals/clip_composition/presentation_output_style_resolver_v001.test.mjs`

## 保存済みfixture gate証拠

- 正式48件TAP: `evals/clip_composition/reports/presentation/test-runs/20260815-zevo-caption-quality-v002-formal-48-attempt-0001/tap.txt`
- SHA-256: `d38d27e9d0d896c963114703bf3f7b3c8b7f98f7b8790cf20abab28af3598341`
- 全体48/48、うちZCQF001/ZCQF002=2/2。

## 停止条件

不合格一件で修正せず停止する。前回12件が再び不合格なら、今回の新規path、fixture package/receipt、test-run証拠、DECISIONS追記等へのfilesystem列挙依存を実測で切り分け、広義の影響なら契約判断へ戻す。
