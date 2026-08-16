# ZEVO字幕品質v002 自走 完了報告草稿 v006

日付: 2026-08-14

## 現在地

- S 6/6、A 11/11、L 10/10、P 10/10、R 4/4まで局所ゲートに合格している。
- Fはv012でstaging前観測、v013で依存単位の対象path、v014でresolve/evaluate/namespace/storeの細段階とcode識別子を装備した。
- 正式起動command全文を、attempt-0004/0005と今回のattempt-0007でbyte照合し、固定Node→固定TSX CLI→`--test`→test pathの実行体・引数・順序が一致した。
- attempt-0007の起動前checklistは、読取99/99、runtime 7/7、実装束縛51/51、directory 5/5、未使用root 2/2、Chromium起動、FFmpeg/FFprobe束縛に合格した。
- F attempt-0007は0/3。3件とも最初のsource依存の`dependency-evaluate / ERR_UNSUPPORTED_RESOLVE_REQUEST`で停止した。
- attempt-0006固有のloader直指定は原因根拠から除外した。正しい固定TSX CLIでも再現したため、本来のattempt-0004/0005の停止は起動入口差では説明されない。
- 技術原因はF productionのruntime依存load方式にある。修正にはv013/v014が固定したrelative literal指定子またはloader構造の変更が必要であり、契約判断として停止した。
- 同attempt修正0件。U、正式46件、直接影響回帰、green 287、baseline 86/203 exact、既存5 treeとA-v002記録対象tree照合は未実施である。

## 停止理由

v014の観測は停止段階・対象・code識別子を一意化した。一方、その修正は承認済みimport機構の変更を要するため、許可された軽微修正には収まらない。

詳細は`presentation-zevo-caption-quality-v002-v014-f-formal-attempt-0007-contract-stop-report-20260814-v001.md`を参照する。

## 副線

- provider再評価の実現性調査下書きv001は保持した。読み取り専用であり、実走可能とは主張していない。
- 在庫: 契約件数を整数でpinするproofの置換連鎖、出力側fixture製造の独立工程化、新設runnerのstaging前・依存load細段階観測の標準装備。

## 外部作用

- API通信 0回
- 費用 US$0
- 正式描画 0回
- stable tag 0件

