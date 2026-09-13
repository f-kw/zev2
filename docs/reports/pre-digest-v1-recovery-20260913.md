# ダイジェストv1着手前の旧作業保存

2026-09-13のkawafmm承認済みPhase 0に従う復旧用保存。実装完成・正式採用ではなく、mainへmergeしない。

- 確認時branch: main
- HEAD / local main / fetch後origin/main / merge-base: `0a4c28419ec952453f3eadc7cdc1d4c642abf012`
- local-only commits: 0。remote-only commits: 0。staged変更: 0。unstaged tracked変更: 5ファイル。
- 保存branch: `recovery/pre-digest-v1-reset-20260913`
- 旧変更内容: 候補動画理解のID参照較正に関する実装・検査・報告、指示024の字幕比較測定・色metadata検査、停止後の相談役応答と弓区間の提示準備記録。未完成状態をそのまま保存し、検査合格を主張しない。
- 未追跡は31,892ファイル、60,890,061,056 bytes。そのうちsourceとMarkdownの9ファイルを保存。残る31,883ファイルは既存素材・字幕/STT・生成物・検査出力・キャッシュとして元の場所に保持し、削除・移動しない。大容量データのremote保存を主張しない。
- source本文の資格情報形の照合は既存のtask名を誤検出したものだけで、実際の資格情報は検出していない。

## 保存した旧source・文書

| path | bytes | SHA-256 |
| --- | ---: | --- |
| `evals/clip_composition/verify_unseen_material_render_v001.py` | 19952 | `43a3bdf927c2bf709f14d59feee2c37681a90e3e453a7a682ec80713262bd5bb` |
| `runner/src/candidate-video-understanding-transport-v001.test.ts` | 328294 | `038b3b23f294590aeb6e9e2ef22b6b0b4ce3db94243e25f23c2027a747b759f2` |
| `runner/src/candidate-video-understanding-transport-v001.ts` | 309206 | `dfceab4619d77b1611ffa9573e0053d59cde29ca658ebf059e0ae7fc08a450cc` |
| `runner/src/candidate-video-understanding-v001.test.ts` | 254630 | `3bde6ca28bae5e97a433c772332aa5d5c6ec14fdce86881e072d215d802cb541` |
| `runner/src/candidate-video-understanding-v001.ts` | 326135 | `2c04253e2f4d15738b5d27906c6a788226381d7c33aad4d4ff4dea99e621d833` |
| `docs/ZEV_候補動画理解_ID参照再較正計画_v001.md` | 205516 | `8b12ef23a5ee886a592bba5c5d3ec74aeb7d824985164185f23b83011e1c8a9a` |
| `docs/ZEV_候補動画理解_v1_較正結果_v001.md` | 19292 | `26886bf33e05c77ed9399196bee7e8e67bc9dda3194165981c7ab5340ba6a7b1` |
| `docs/reports/candidate-video-understanding-numeric-time-calibration-summary-v001.md` | 18988 | `110991cd012209c9aaf941b2c9acaa131c60d8080e8f0b43eb7c1dfe03688a16` |
| `docs/reports/caption-qc-rationalization-brief-20260910-v001.md` | 16908 | `5d6df958cce78d2e2c575b6aaffe3bf83ad323d2e307aee3afaac483d0569c00` |
| `evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001/bow-human-trial-v001/preparation.md` | 2539 | `09dadf1063d90a50f8f8c60851ded8eb3bcd7d6817035b4254f62bf6df19fd48` |
| `evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001/editorial-review-v001/advisor-procedure-response-v001.md` | 2753 | `776cb2601b5282477f8e9247185bd799a021ad72647e142a147bb66069048468` |
| `evals/clip_composition/run_unseen_material_qc_only_v002.mjs` | 28376 | `10329a7c9d2e1f72d1da708862d412a8f39c80c4b7d85acd19a7acbaefc27047` |
| `evals/clip_composition/unseen_material_qc_color_metadata_v001.mjs` | 3228 | `886dbe52683cb0afb4ca87f78a3605d884370071a4b8cc825e2bbf8c802215e2` |
| `evals/clip_composition/verify_unseen_material_qc_color_metadata_v001.mjs` | 12998 | `4947267b50adceb01b2c70c60fc5cbabc33ba81ce75496a732683504ad87ad5f` |

## 復旧方法

このbranchを別worktreeへcheckoutすると上記14ファイルを保存時のbyteで復元できる。素材・既存実行証拠は元のworkspace上のpathを使う。branchのpush後にremoteのcommitと14ファイルのGit blobを照合してからmainへ戻る。旧作業を再開する承認にはしない。
