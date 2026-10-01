# Codex2 GPT_DECISION — v005時計修正成立後の容量不足

基準HEAD `8cbde0b9359ab090ab30561862d49dcfd83b1e0a`。担当：Codex2。製品修正累積5／設営6、追加修正未実施。

## 成立した差分

追補で個別承認された二pathだけを製品5回目として修正。時計は実保存bytesのSHAを持つbyte参照、他3出力・消費記録は版付きJSONのまま。局所15検査、shared/backend/runner/Remotion/client型検査はexit0。通常attempt-005のlocal JSON経路は実source/STT登録、通常計画complete、次工程の実消費completeまで成立。別processで再構築・再読し、旧96保護fileを確認。時計SHAは旧attempt-004と一致し、計算結果不変。

## 新しい停止の現物

通常uploadの計画工程は元素材の独立copy中にENOSPCとなり、実queueにfailedを保存した。下書き `draft_bf6hKeP7hmmx5CMKYTCNb`、計画命令 `agent_jGgk6ywiuluA2Sv0IkOrQ`。source/STTは実complete済み、計画・検証FileRefは未登録、検証はqueued。残っていた自分の試験親process・二backendだけをSIGTERM停止し、親exit143。通常indexの子processは停止前の一覧で既に観測されなかった。

Data volumeの空き約1.9GiBに対し、元素材は4,803,412,827 bytes（約4.47GiB）。現在の試験はlocalの独立素材copy、upload worker／backend／後続readerへの保存、MP4直接PUTを行うため、残りは単一の素材copyさえ置けない。空き量は実測であり新しい製品上限ではない。

## 相談役へ求める一点

**旧証拠・旧state・保存素材を削除／上書きせず、残りの隔離通信試験に必要な容量を確保する具体的手段・場所を判断してください。** 推奨は容量準備後に新しい隔離attemptでupload／MP4／未提供枝へ進むこと。現在の時計二pathへ追加の製品修正をまとめる理由はない。

現時点の最小差分は製品コード0。通常callerや実PUT/GETを試験copyへ置換して通す案は採らない。既存の一般上限、履歴、承認意味、安全検査を変更しない。今回の作業では削除対象・外部保存先・容量上限を自己指定しない。設営preflightやscratch rootの変更が必要なら具体的な一差分を相談役が個別判断する。本人への転記・技術再確認をCodexから要求しない。

未実施：upload転送complete・分離root／転送先だけの別process再読、MP4直接登録／inspection未提供の通常complete、通常否定・Clip回帰。時計局所のnull条件は15検査内で成立しているが、未提供の通常completeとは別。source取得・STT・inspection・動画・外部推論・費用は0。ID9-PD-01/02・字幕演出未接続・動画許可未承認・人間品質pending維持。

証拠：queue-clock-reference-evidence-attempt-005.json、queue-integration-evidence-attempt-005.json、queue-capacity-stop-evidence-attempt-005.json、queue-clock-capacity-readback-attempt-005.json。旧attempt-004は不変。
