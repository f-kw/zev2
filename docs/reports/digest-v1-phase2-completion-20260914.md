# Digest v1 Phase 2 — 完成記録

2026-09-14。**Phase 2 COMPLETED**。kawafmmが完成動画の代表3箇所を確認し、3箇所とも問題なしと報告した。**全編通し視聴は未実施**と記録したうえで、本人の完成裁定によりPhase 2を閉じる。全編未視聴を未完了の理由にしない。

## 完成した制作経路

実素材から7 Prospectを生成し、全Prospectを採用した。12保持区間を元動画の時刻順に接続し、4,437本文要素を保持した325字幕、94pxの正式派生style、base media、rendererを通じて完成MP4へ到達した。この実素材C-all経路をDigest v1の成立済み経路として固定する。

完成MP4の実path：

`/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/style-94-v001/.render-v003.presentation-renderer-v002-work-OF3SgY/publish/presentation-rendered-v002.mp4`

SHA-256：`665c31638dcf55af4bf1e6327f915839bbed31d905c007a6a9281e29776b8c34`。616,632,321 bytes。尺は44,408 frame / 30fps = **24分40.266667秒**。

## 保存済みの技術確認

| 確認内容 | 結果 |
| --- | --- |
| 正式字幕の原文・ID・順序・境界・改行・時刻 | 325 / 325 PASS |
| 94pxの実画像検査 | 325 / 325 PASS、安全領域違反0 |
| 完成MP4の通常技術確認 | PASS |
| 映像 | H.264、1920×1080、30fps、44,408 frame |
| 音声と通常decode | 音声あり、decode error 0 |
| 完成MP4への字幕反映 | 代表1字幕のE2E spot check 1 / 1 PASS |

これらは保存済みの合格結果を参照している。今回の完成記録作成に伴う追加QC・decode・描画は行っていない。

## kawafmmによる人間確認

| 代表箇所 | 完成動画の時刻 | 本人の結果 |
| --- | --- | --- |
| Prospect間の接続 | 00:59.633 | 問題なし |
| Prospect内部の接続 | 03:24.033 | 問題なし |
| 字幕282の表示 | 19:21.367 | 問題なし |

代表3箇所確認、問題0、人間確認結果は受理。全編通し視聴は未実施。3箇所の対象は提示済みv002レビューUIから取得し、そのsnapshotを人間確認結果へ固定した。全編を視聴したとの記録や全編品質への保証に読み替えない。本人の指示に従い、追加の人間確認を要求しない。

## 過剰QCと診断資料

325字幕それぞれのcounterfactual動画を再符号化する旧検査は、比較完了6件、未完了319件（中断1件、未着手318件）のまま証拠を保持する。全325件合格とは記録しない。

この検査はproduction acceptanceから除外済みであり、**Phase 2のcompletion blockerではない**。扱いは `removed from production acceptance; not required`。今後の用途は **renderer regression / fixture verification** とし、今回の完成後に自動再開しない。

- 検証したい失敗モードは、それを直接確認できる最も低コストな層で検査する。
- 機械的リスク一覧を、そのまま人間の全件確認リストへ変換しない。
- 完成物の人間レビューは通常利用に近い形を基本とし、代表spot checkを必要以上に増やさない。

fallback字幕と接続境界の一覧は問題発見後の診断資料として保持する。全件目視の要求へ変換しない。

## 完成artifact

保存先は `evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/phase2-completion-v001/`。

- `completion-record.json`：完成状態と制作経路、必要な技術確認、各成果物・証拠への束縛。
- `human-review-result.json`：本人の代表3箇所受理、問題0、全編視聴未実施。
- `production-acceptance-decision.json`：旧counterfactual検査の未完了件数とproduction gateからの除外、保持する3原則。

完成記録は完成MP4のpath・SHA、base media、94px style、common plan、bridgeと意味判断の来歴、字幕source QC、raster QC、MP4技術確認、字幕E2E spot check、人間確認結果、旧gateの除外decisionを結び付けている。

完成記録とreport更新だけをcommit / pushする。巨大MP4、既存レビューUI、前作業から残る方針文書の差分は今回のcommitへ含めない。main merge・tag・stable昇格・releaseは行わない。

**Phase 2は完了。追加監査・QC・再描画・再視聴を開始せず、次工程は別work-orderとする。**
