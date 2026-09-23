# ZEV main統合とGit運用整理（2026-09-23）

## 範囲

現在の有効な成果・研究記録をmainへ集約するGit整理。新規実装、QC高速化、API実行、動画生成は開始しない。統合は保存済み成果を利用可能にするもので、既存記録の人間確認待ちや未受理事項を合格へ変更しない。

## 棚卸しと保全

開始時mainは `0a4c28419ec952453f3eadc7cdc1d4c642abf012`。local branch 20本、remote tracking branch 21本。remote照会で演出語彙branchを追加発見し、実remoteは22本。新branch・新worktreeは作成しない。

17 worktree登録のうち、元workspaceと3個はGit接続正常、12個はfolder実体があるが `.git` 接続fileが欠落、1個はfolder不在。接続file欠落の12個は残存する管理情報と現物を読み取り専用で照合した。大量の欠落fileは今回の削除変更として採用しない。全treeのstaged変更は0件。

元workspaceにはQC方針変更1件と未追跡47件。既存の41件は別branchのGit objectと完全同一byteであり、既存commitの統合で追跡する。API較正の6件は由来・本文・生成記録を確認済み。今回の『記録をmainへ残し未追跡を残さない』指示に基づいて診断履歴として保存し、生応答の採用・判断・費用承認を更新しない。

QC方針の既存差分は人間レビューと診断資料の分離を保存する文書変更であり、後続のレビュー運用と一致するため集約対象とする。本文を再編集せず保存する。

工程IVの現存3fileには、復号結果の検証記録形式を変える未完成の変更が残っていた。後続処理の接続・一時媒体の後始末・通し検証は完了しておらず、本体へ適用しない。[未適用patch](pending-qc-observation.patch)を基準commitとSHA付きで保存する。このpatchは自動実行・自動適用するものではない。

完全なpath・SHAは[preservation.json](preservation.json)、branch/worktree開始状態は[inventory-before.json](inventory-before.json)と[欠落worktreeの照合](partial-worktrees-before.json)に保存する。

## 統合方針

- 最新の工程IV branchに連なる116 commitを軸に、Digest・自動演出・一件後修正・人間レビュー・保存済みQCの既存実装と検証記録を集約する。
- 独立した接続研究branchの8 commitは既存本体を上書きしない20追加fileであり、研究と試験として保持する。Normal再認定とtrust調査の履歴も包含する。
- OpenChatCut研究branchの6 commit・4文書と前回の整理報告を統合する。元の研究報告コピーは既存Git objectで保全し、branch側の追記済み版を採用する。
- 旧演出語彙branchは、Color/Scaleの名称が後続版へ反映済み。仮の黒半透明panelは、後続の有限Panel設計と異なる旧試作であり本体へ二重導入しない。研究記録をmainへ取り込み、旧試作のremote履歴は理由付きで保持する。
- recovery branchの未完成動画理解・旧QC実装は再開しない。記録文書だけを原byteでmainへ保存し、未採用の実装を保全するbranchは残す。



## 統合結果と検査

mainへ工程IV、接続研究、OpenChatCut研究を統合し、競合は0件。最新工程IVの27,813追跡pathを照合し、27,811件が同じGit object。差分2件は依頼されたAGENTSのGitルールと元から存在したQC方針文書のみ。本体codeを古いbranchで上書きしていない。開始mainからの削除0件、DECISIONSとarchitectureは不変。詳細は[integration-verification.json](integration-verification.json)。

元の未追跡47件はすべて追跡済み。46件は原byteのまま、OpenChatCut報告1件は元byteを完全な先頭部分として含む研究branchの追記版に集約した。41件の一時移動前に、元byteを既存Git objectとローカル保存コピーで照合した。

- 全workspace build: 合格。
- 全workspace型検査: 合格。
- 標準test: UI契約とmockレビューは合格。全体シナリオは9月6日にも記録された固定書き起こし欠落で未完走。元mainのscriptと固定STT読取り処理は同一byte。
- 統合対象の既存64 test file: 856件中785合格・65不合格・6 skip。不合格を合格・対象外へ変更しない。入力jobや実行設定を別途要求するscript、旧Panel入力、保存版の束縛、ローカル証拠欠落、古い正本path期待などが含まれ、すべての原因確定や修理は未実施。
- 独立した接続研究の既存検証: 正常12件と期待した拒否66件が合格。

検証ログと全不合格は[tests/summary.json](tests/summary.json)および同directoryに保存した。新規実装・fixture値変更・期待値緩和は0件。標準testと追加検査を全合格したとは報告しない。**ユーザー指定のbuild/test検証条件は未達。**

## branch / worktreeの整理準備

main未反映commitが0件のlocal branchは18本。副worktree16件の全HEADもmain未反映commit 0件と照合済み。復旧branch1本は未採用の実装を保全するため保持する。remote branchは削除せず、未完成復旧と旧panel試作を含む履歴参照として理由を残す。[branch-disposition.json](branch-disposition.json)と[worktree-containment.json](worktree-containment.json)を参照。

実体が残る作業場所を調べ、10個は依存link・Gitに保存済みのlinkと空directoryだけだった。工程IIと旧QCの2個は未commit変更なしで、ignore対象も依存cacheまたはPython cacheのみ。工程I・工程III・工程IVの3個には媒体・診断資料を保持する理由があるため、実体を削除せずGit登録だけを整理する計画。工程IVの未完成3fileはmain上の未適用patchで保全済み。

全Git管理情報の退避と3個の有効接続pointerの内容確認は完了した。削除前にHEADのmain包含と作業状態を再確認し、mainへのpushが確認できるまではbranch/worktreeの削除を実行しない。

## ignoreと今回の一時物

既存の媒体除外規則は工程IVの履歴でmainへ統合した。今回追加するのは既存の資源制御検査が毎回作る `resource-control-fixture-v001-*` 出力directoryだけを対象にした1規則。生成元を確認し、test sourceが隠れないことを検証した。今回生成した比較媒体は検証結果を保存した後に削除する。過去の媒体や正式成果物は削除しない。
