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

統合結果、既存test、branch/worktree整理結果は作業完了時に追記する。
