# 同一Digest原寸全編・低メモリ本体合成：全編実走結果

## 実走の範囲

ZEV相談役の短区間監査後の `decision: continue` に従い、保存済み全編背景・参照AAC・307状態PNGから、低メモリ経路だけで本体とreplayを作った。背景・接続・AAC・PNGの再生成はしていない。旧方式で停止した48 bytesの `normal.mp4` はそのまま保持した。A=8/4は技術入力であり、`outlineChoice=null`、人間品質は未確認である。

全17,613フレームを最大210フレームの連続した84区間で一度ずつ処理し、各区間に必要なPNGだけを開いた。区間producerは1件ずつ起動し、YUV420pを一本の `libx264` encoderへ流した。全編rawファイル・区間MP4は作っていない。背景1件とPNG最大21状態で、producerの最大入力数は22。全編で旧方式の307状態を同時に開くことはなかった。

監視v002の下で、背景の再検証、AACの再利用、本体、replay、既存の全編native QC、共有保存、別processによる独立再読まで完了した。開始は2026-09-30 03:16:40 UTC、監督終了は06:30:07 UTC。監督の結果は `completed`、exit code 0である。

## 媒体と検査

| 項目 | 結果 |
|---|---|
| 本体・replay | 各396,134,504 bytes、MP4全byte一致、SHA-256 `65afceb046aca0629b0fe097f602caae3b05697b10cff8eb6a295106185f3858` |
| 合成前YUV | 両方の連続出力SHA-256 `00ca5e2ccee066df08b728dc7d03e4d5bbc121cd23ba3cdbe9b4d3d1fb97f7dc` |
| 映像 | 各17,613フレーム、1920×1080、30fps、587.1秒。表示時計も独立再読で一致 |
| 音声 | 44,100Hz stereo AAC、論理サンプル25,891,110、両媒体のAAC packet SHA-256 `ea550bc89739fec8a3cf8a7d3ec506107203fdbff66e4144fecd5dee6a9aabe5` |
| native QC | 345/345標本、論理候補211,732件、違反0件、`technical-passed` |
| 共有保存後の独立再読 | `technical-passed`。345標本のreceiptと保存入力2,658 fileを確認、解放済み標本345件を確認 |

既存短区間では旧rendererとの圧縮前YUV・復号YUV・音声・MP4全byte一致を確認済みで、結果は [短区間報告](README.md) にある。旧方式の原寸全編媒体は未完成なので、全編同士の旧新MP4比較はできない。今回の全編では本体とreplayの全byte一致、native QC、独立再読を確認した。人間による映像の目視採否は行っていない。

## 資源と後始末

監視の1秒間隔の9,376標本では、親子合計RSS最大4,395,352,064 bytes、親単体RSS最大3,357,212,672 bytes、実空き最小38,524,760,064 bytes、OS memory pressureは全標本で正常値1だった。群内同時processは全工程最大7件（native QCを含む）。親単体最大と親子合計最大は同一時刻の値とは限らない。標本間の瞬間最大は保証しない。

停止条件の実空き12,000,000,000 bytes、親子RSS 17,179,869,184 bytes、OS pressure warning/critical/unknown、観測不能を緩和していない。監督終了後、専用process groupの残存は0。終了時のpressureは1、実空き39,376,252,928 bytesだった。

## 証拠と判定

成果物と詳細receiptは `runtime/artifacts/original-resolution-execution-20260930-v001/full-lowmem-production-001/`、監視記録は同階層の `full-lowmem-supervised-001/` に保存した。主なSHA-256は次のとおり。

- `media-completion.json`: `24675161d6212a1d40682d0f1229e01d15d055270e2958040c8f5f52d5ddc756`
- `qc-completion.json`: `f9acbf58b82904ed9d13c44cf8f1f6d3dc96285e4c92421b3a34b3f3d1511767`
- `independent.json`: `2eb64688098f625ae89a4d449cf5b1bcf04ba9f4a8765c3a3e19d8186c2ecd53`
- `completion.json`: `1ae4ccf5510f43f1d7e2defb278423bcde78dcc32f86a25fda4cece7c88bb418`
- 監督 `summary.json`: `a1cd569e7024bd87b36894a5be00a06d69ea0299f0219323a53fd56485c951c6`
- 監視 `resource.jsonl`: `e8a3ead0a8f98a17d30d173b522bac1ce25a8bead425c2dc5035fe4e46a45881`
- 群停止 `group-shutdown.json`: `33453c9e9f1f2a5c9a6f65473c0370b0e67841b9163e5b79129f43fcd23c1217`

技術検査は完了した。正式採用・公開・人間品質判定はこの結果に含めない。既存の凍結renderer、旧全編入口、旧停止証拠には変更を加えていない。
