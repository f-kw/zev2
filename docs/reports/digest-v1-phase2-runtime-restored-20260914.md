# ダイジェストv1 Phase 2 — 実行環境復旧と製造再開

2026-09-14 JST。欠落した音響実行環境469ファイルを、保存済み期待SHA-256に完全一致するローカルキャッシュから元のpathへ復元した。正常だった112ファイルは上書きしていない。既存validatorと期待値を変更せず、581 / 581件の一致および保存済み保持判断の再検証に合格した。

## 承認と実施範囲

kawafmmの今回の指示は、第7回の例外として上記復旧に対するZEV進行管理３の判断・承認を最終の続行承認とし、追加確認なしで実行するよう明記した。581件の照合合格後は、承認済みPhase 2の正式字幕時刻保存、Phase 1共通Core、renderer、技術検査、MP4生成まで続行する。受領全文の要点・限定範囲を出力directoryの `seventh-runtime-restoration-authorization-v001.json` に保存した。

復旧処理は、記録された581参照と欠落469件の集合、ローカルarchive 12件、対象member全件のbyteを検証してから書込みに入った。対象外pathとsymlink経由の書込みを拒否し、欠落ファイルだけを排他的に新規作成した。必要な親directoryだけを作成した。package install、環境の再構築、download、package/versionの選び直しは行っていない。

実行結果は `runtime-restoration-result-v001.json`、実行前照合は `runtime-restoration-preflight-v001.json`、復旧処理は `restore-recorded-runtime-v001.py` に保存した。復旧後、変更していない既存の端点検証入口を呼び、実行環境581件と保存済み観測・7候補・12保持区間の来歴照合が合格した。結果は `runtime-validator-replay-v001.json`。音響モデルの再実行・新しい観測・新しい意味判断は0回。

## 正式字幕時刻の保存

既存の製造adapterで正式時刻保存を1回実行し、325字幕すべての時刻を `caption-timing-resolution-v002.json` へ保存した。保存済み回答と既存音響観測から同じ決定的処理を再構築したもので、字幕本文や時刻判断の変更はない。

保存済み診断と同じく、271字幕は音響両端が確定し、43字幕は片側、11字幕は両側で既存STT端点を使用する。全325字幕は正の長さを持ち、保持区間内に収まり、隣接字幕との時間重複がない。音との同期品質は人間未評価のままである。

未観測の任意診断欄8か所だけをJSONの欠落へ写す既存adapterの訂正を使用した。時刻の数値は変更していない。保存時のadapter実装SHAと変換内容を `caption-timing-serialization-recovery-v002.json` へ固定した。

## この記録作成時点

Phase 1で合格済みの共通処理へ、同じ採用済み12区間を渡して映像・音声の製造を実行中。元動画の全フレームと音声の時刻検査を待っている。字幕描画、描画後の技術検査、完成MP4はまだ未到達であり、本記録は完成を主張しない。

branchは `codex/digest-v1`、再開時のHEADは `60040ee0575302a6e02a4958fd19e015c0865471`。325字幕、原本文、正式ID・順序、7候補・12保持区間、既存style、Skill、Phase 1共通処理、validator、期待SHA、runtime参照は不変。人間品質は未評価、完成承認は未申告を維持する。

新たに別の設営訂正が必要になった場合、第8回を自走せずZEV進行管理３へ報告する。同セッションが既存work-order・契約内と判断できる限定修正は同セッションで判断し、新たな第1層事項だけをkawafmmへ戻す。main merge、tag、stable、releaseは行わない。

証拠の共通directory：`evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/`。
