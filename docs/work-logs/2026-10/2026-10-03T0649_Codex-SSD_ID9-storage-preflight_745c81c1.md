# Codex-SSD — ID9保存先確認

- session: Codex-SSD（今回の委任task。旧Codex2と別）
- work-order: 一素材Digest正式接続/製造の条件付き指示（2026-10-03受領）
- startedAt: 2026-10-03T06:35:55Z（task一覧の開始記録）
- closedAt: 2026-10-03T06:49:39.615718+00:00
- baseHead: 019e98076eef6b27be6aff5110ec0c5d8e5096c1
- sourceFinalHead: 745c81c1d66312af0138b0e0b4362a590622ccab
- checkpointHead: このfileを保存したcommitから参照
- status: stopped-gpt

## 指示と判断

本人06:33:44 UTC「OK 必要な作業をしてくれ」を根拠に、SSD途中物保存の小修正成立確認、成立時のみ保存済み一計画の正式一本製造/QC/負担報告を受領。候補4technical＋監視外への保存先修正が必要なら具体差分を返して停止する指示。読み取り補助agent1件を使い、書込み担当は本taskだけ。

Coreのrepo固定abs/readBound/publishを分ける追加pathが必要。SSDのExFATではhard linkがENOTSUP、chmod444後write-open拒否も不成立。既存保護を緩めて進めず、製造前に停止。

## 作業と検証

開始から証拠report固定まで13分44.616秒。これは保存先調査/一時接続断/記録の経過で、動画製造時間ではない。

main cleanを確認して最新mainへff同期（6運用文書のみ）。既存Codex2は開始時idle、製造process観測なし。4候補SHAすべて一致。専用新SSD directoryで4096byteのwrite/fsync/read/hash/exclusive-create/rename/chmod/hardlinkを確認。[報告](../../reports/digest-ssd-storage-preflight-20261003/README.md)とevidenceへ固定。製品code編集/媒体生成0、API費用0。正式glyph/renderer/QC/映像品質/制作負担未評価。

shell一時切断後にrepo読取が復旧。taskの最終再読はTransport closed、開始時idleを現在状態へ流用していない。親への可視途中送信は自動承認審査拒否・未送信、迂回なし。終了時の親自動返却で報告する。

## cleanup

自作probeの4096byteと新directoryだけ削除、cleanupエラー0、directory残存なし。probe結果JSONと実行scriptは委任workspaceに監査証拠として保持。元素材/旧candidate/旧成果/SSD既存内容に変更なし。旧Codex2のCUA常駐processは他者所有として保持。今回媒体worker未起動、probe processはexit0。

## Git

branch main、code基準HEAD745c81c1。同期後・文書作成前のstaged/tracked/untracked変更0。他者差分は含めない。今回停止証拠のreport/evidence、専用log、CURRENT_GOAL/HANDOVERの現在地だけをcheckpoint対象とする。commit/pushの実結果は最終報告と当該fileのGit履歴へ残し、未実施を成功扱いしない。

## 次状態

相談役待ち。追加1 Core pathを含む限定保存contextと、hard link/保護を保てる専用保存領域を確定する必要あり。ExFATを黙ってformat/image/mountせず、publisher/保護契約を緩めない。既存字幕/時計/選定のaccept、人間品質pending、outlineChoice=nullを保持。今回の条件未成立のため動画製造へ進まない。
