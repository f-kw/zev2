# Digest v1 Phase 2 — 完成動画の視聴候補

2026-09-14 JST。**Phase 2 COMPLETED**。kawafmmによる代表3箇所の人間確認で問題0。全編通し視聴は未実施と正確に記録したうえで、本人の裁定により実素材C-all経路を成立済みとして閉じた。旧counterfactual検査は未完了の事実を保持し、production acceptanceから除外済みで完成阻害条件にはしない。[最終完成記録](digest-v1-phase2-completion-20260914.md)を現在地とする。追加監査・QC・再描画・再視聴は開始しない。以下は完了前の製造・確認・停止履歴として保持する。

2026-09-14。**Phase 2 human-review candidate**。kawafmmの「QC方針修正と完成動画確認」に基づく必要な技術確認が合格し、次工程はkawafmmによる実動画視聴となった。人間品質は `not-evaluated`、完成承認は `not-claimed`。

## 視聴する動画

実path：

`evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/style-94-v001/.render-v003.presentation-renderer-v002-work-OF3SgY/publish/presentation-rendered-v002.mp4`

616,632,321 bytes。SHA-256：`665c31638dcf55af4bf1e6327f915839bbed31d905c007a6a9281e29776b8c34`。保持していた主合成MP4と完全一致した。動画の尺は44,408 frame / 30 fps = **24分40.266667秒**。

## 技術確認

| 確認する処理 | 結果 |
| --- | --- |
| 正式325字幕の原文・ID・順序・境界・改行・時刻 | PASS。4,437 source atomの欠落・重複・順序異常0。保持区間外0。全件で開始が終了より前。 |
| 既存規則による文字量と行数 | PASS。最大論理幅36、最大2行。U+0000..U+00FFは1、その他Unicode code pointは2という既存規則をそのまま使用。 |
| 94pxの既存実画像証拠 | 325 / 325 PASS、違反0。独立再描画一致。字幕282の右端1834、安全上限1840。新しい字幕描画0。 |
| 完成動画への字幕反映 | **1 / 1 PASS**。字幕282の中央34841 frame（0始まり）、19:21.366667を一枚だけ抽出。全文の表示、欠けなし、下部中央の配置を確認。 |
| 完成MP4の通常検査 | PASS。実ファイル・非空・SHA一致、MP4 container、H.264、1920×1080、30fps、44,408 frame、AAC音声。通常の映像・音声decodeを一度実行して終了0・stderr 0 byte、重複・drop 0。 |

container上の尺は1480.266016秒。通常decodeの終了は1480.266667秒。映像stream末端の差は10 time-base ticks（約0.651ms）で最終frameの表示区間内に収まり、44,408 frameの予定尺と整合する。再符号化や任意の許容係数による補正は行っていない。

字幕282の抽出では元のtimestampを維持し、PTS 17838592 / 15360 = 34841 / 30を確認した。保存した静止画の全文は「なにする?どうする?なにする?どうする?」。この確認は全325字幕のE2E合格を意味しない。

画像をWeb Geminiへ渡すファイル選択操作は、外部送信の明示承認がないとして自動承認レビューに拒否された。選択をキャンセルして使用タブを閉じ、画像・質問とも送信0。確認範囲を静止画一枚の表示・欠け・配置に限定し、Codexが保存PNGをローカルで表示して確認した。新しい動画内容解析や音響解析は行っていない。

## 同期の重点確認

保存済み音響境界で開始・終了を両方取得できた字幕271件。片側fallback43件、両側fallback11件の計54件を全件列挙した。これは同期不良の断定ではなく視聴時の注意対象である。

Prospect間の接続は00:59.633、04:43.500、08:56.067、10:19.267、12:16.633、13:46.733。前後の字幕番号を記録した。同一Prospect内の保持区間接続5箇所も別表に掲載している。任意の「近傍秒数」は設けず、接続に隣接する各区間の最後と最初の字幕を選んだ。

一覧：`evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/human-review-candidate-v001/human-sync-watchlist.md`。字幕同期、読みやすさ、場面接続、文脈、テンポ、全体品質は実動画を視聴して確認する。

## Production受入条件の修正

[恒久QC方針](../policies/PRODUCTION_QC_LAYER_POLICY_v001.md)に従い、各字幕を除外した長時間動画の再符号化検査は **production QCとして不要と判断して設計から外した**。受入記録は `removed from production acceptance; not required`。旧検査が325 / 325 PASSしたとは扱わない。

停止記録と完了6件・中断1件・未着手318件の証拠を保持している。旧方式の実装はrenderer regression / fixture verification用の課題として残し、完成動画ごとの全字幕へ実行しない。renderer・QCアルゴリズム・style・字幕の変更、再描画、再合成、動画再符号化、API通信、新素材取得は0。

## 証拠

新しい証拠はすべて `evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/human-review-candidate-v001/` に保存した。

- `review-candidate.json`：現在の受入状態、MP4実path・SHA、各検査と方針の束縛。
- `source-caption-qc.json`：325字幕全件照合の簡潔な集計。
- `reused-raster-qc.json`：既存94px実画像証拠の再利用。
- `mp4-technical-qc.json`：containerと通常decodeの集計。実行命令・stdout・stderrも保存。
- `subtitle-282-spot-check.json` と `subtitle-282-frame-34841.png`：1 / 1の反映確認と現物。
- `human-sync-watchlist.md` / `.json`：人間が確認する54字幕と接続位置。

保存データ照合は `evals/clip_composition/digest_v1_phase2_human_review_data_check.mts` を一度実行して終了0。既存の表示境界validator、既存の論理文字幅関数、既存の元時刻からframeへの写像を呼び出し、rendererやQCアルゴリズムは改修していない。

このcheckpointは視聴候補の現状固定であり、正式完成・stable tag・公開を意味しない。追加の長いChatGPT監査は行わず、kawafmmの視聴へ進む。
