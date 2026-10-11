# Codex-UI｜No.68 共通validator・作成前確認の限定接続

status: 限定接続検査完了・handoff。No.68全体未完成・Doing rev3維持。
開始HEAD: fbb74599f54e7fcca81a8c6c4c3f2315e18daec2。
Git枠引継ぎHEAD: 950cc642dad2146bec403ab78895dc156805f8cd、main/origin/main一致。
最終実装checkpoint: 69ca1b4af49e69bc47a0eafe63899e0884af62db、source13path＋専用証拠13path。

## 指示・判断

親から、既存pure validatorと必要型の最小shared移設、登録データの照合、実在metadataのみの推薦/preview表示、作成前入力と完成後QCの分離、producer入力境界の具体化を受領。新素材の取得/STT、Digest製造adapter、正式producer・契約・費用資格は親/制作担当の所有を維持。Git枠返却までは編集/検査のみを実施し、親の制作保存完了メッセージ後に実HEAD/差分を再観測した。

## 主要作業・検証

- source13path。validator本文は旧runnerとbyte一致、型と再exportだけを移した。readerは同一validatorを使い、登録bytesとSTT/構成/編集の相互関係を照合する。
- 推薦は実candidateId/非空reasonが登録資料にある時だけ読む。previewは候補の明示evidenceにある同依頼jobを読む。実claimのないrunning、期限切れ、他依頼は準備中にしない。閲覧からjobを作らず、古い成功を最新失敗へ流用しない。
- 作成前のJSON入力整合はverified。元音声保持指定/音声参照はunknownを維持。実動画QC/人間採用は完成後と明示した。producerの既存binding/style/inspection/clockの必要値を[報告](../../reports/zev-ui-b-implementation-20261011/validator-and-precreation.md)へ具体化。未承認契約を新設していない。
- backend28/28、client19/19、shared/backend/runner/Remotion/client型検査とbuild、UI契約、diff whitespace成功。隔離runtime/偽localhostのみ。Edge mockで推薦/preview状態/開閉/再読込、閲覧POST0を確認。実動画再生/音声/人間品質は未確認。
- 既存fixtureのevidence種別と共有参照配列を修正。失敗証拠は専用directoryへ保持。今回設営2件、前接続の1件を含む保存記録上累計3件。一般上限を変更しない。型移設のprivate型参照不足はshared型aliasで解消した。

## cleanup・Git・次状態

証拠固定後、scratch画像3件217824bytesをhash一致確認後に削除。自分のmock2起動と専用Edgeタブを終了、port5179 listener0、unit runtimeはafterで削除。空き17452122112→17452326912bytes（共有disk観測）。元PDF/素材/正式・旧成果/SSD/共有dist/node_modulesには作用0。有料API/実動画製造/公開0。

Git枠は返却受領済み。自分のsource13pathと専用証拠13pathを上記実装checkpointへ保存した。残る自分の報告・新素材境界補足・専用log計4pathは別の記録commitで保存し、mainへまとめてpushする。対象pathをstage前後に確認し、他担当の保存済み6文書を保持。共有checkout切替/reset/stash/branch/worktreeなし。最終HEAD/push/clean/untracked件数は、この記録commitの後に実観測して親への完了報告に示す。

記録stage時に他担当のtracked文書6pathが再変更されていることを観測した。CURRENT_GOAL、HANDOVER_INDEX、制作時間/検査ledgerのJSON/Markdown、統合scope、SSD担当log。stage外のまま保持し、全体Git cleanとは報告しない。

次状態: No.68全体は未完成。新素材の正式登録、音声指定/参照、推薦/preview producer、Digest通常UI製造、正式外部送信/料金資格は未接続。親へ限定接続と入力境界を返し、次の明示指示を待つ。本人への同じレイアウト承認依頼や別エピックの自走は行わない。
