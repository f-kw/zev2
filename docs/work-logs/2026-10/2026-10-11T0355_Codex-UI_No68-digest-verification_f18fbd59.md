# Codex-UI｜No.68 Digest登録の検査修正6・7と新版検証

2026-10-11 03:55 UTC。本file名のHEADはGit保存待ち時点の観測値。No.68全体は未完成、Doneではない。

## 指示・判断

ZEV相談役の親から、checkpoint `588134c6c654c79bac56c61f3c28a638c4f2d596` と旧失敗・提案patchの独立読取に基づく返信本文を受領した。同じNo.68内で提案済みの検査修正6回目と7回目を**各一件だけ**例外承認。一般枠5回と旧証拠を保持し、累積は7回。検査表現と正規mock factoryへの配線に閉じ、本人の品質採用・素材・課金・製造許可・契約を変更しないため相談役判断でよい。別のsource修正は許可されていない。stage/commit/push権はSSD担当が保持中のため、検査と証拠保存まで進めた。

## 主要作業

- 6回目：backendの繰返し読取比較だけをwire JSON表現へ揃えた。本文・音声・bytes・state不変assertionを保持。
- 7回目：mockのfactoryへ制作系統を最初から渡し、後付け変異を除去した。通常clipの既定値と正規factory guardを保持。
- 保存候補の閲覧と採用の分離、旧構成/旧動画の混同防止、戻る/再表示/繰返しclickを自分専用のEdgeタブで操作。人工mockだけを使用。

## 検証

新版結合6/6合格。実readerを通す異素材A/B、重複登録byte不変、state不変、資格差替え拒否、元clock差替え後の投影クリア、compiled backend新process、未登録unknown/非SSD拒否を確認。旧4/6失敗やmock起動失敗は保持し、合格へ書き換えない。

実Edgeで候補開閉/Escape/再表示/繰返し選択/再読を確認。候補閲覧による変更API0、採用変更無効、製造ボタン無し。別素材の新しい下書き保存double clickはPOST1回。旧依頼とproducer/outputは不変。戻って修正/作業へ戻るとreloadでも新規版が保たれ、旧構成と旧動画を表示しない。未接続の開始は無効。旧動画mock参照の媒体は再生不能なので、動画/音声/QC合格とは扱わない。

既に合格済みのclient20、backend29、client/backend type/buildを保持。今回の製品code/types/build入力変更0につき、必要な結合とEdgeを新版で実施。新たな有料API、実動画製造、公開0、追加費用US$0、新契約追補0。同日で経過3日上限未到達、停止累積はリセットしない。

## 証拠・cleanup

[今回の追記と索引](../../reports/zev-ui-b-implementation-20261011/digest-registration-progress.md)。`digest-registration-evidence/` のv002 TAP、API/state snapshot、DOM、画面PNG、作用/cleanup記録を保存。旧証拠を保持。

自分のSSD/local人工fixture root残件0、integration終了0、mock server2件終了、localhost:5179 listenerなし、専用Edgeタブ終了。製造媒体は作成せず、削除容量未測定。正式媒体/他担当物削除0、制作/配信停止0。

## Git・次状態

main、03:55 UTC HEAD/origin `f18fbd5999cb4bf5360a39cf119f3576257dc1b1`、staged0。SSD担当が自身の6文書を保存済み。他担当差分を編集/stage/commitしない。自分の検査2pathと新版証拠/報告/本logは未保存。Git権返却を待ち、自己判断でstage/commit/pushをしない。

次の1件は返却後の対象限定Git保存。No.68全体/No.70は未完了でDoneへ移さない。通常製造job/permit/prepare・課金確認・実行接続、完成媒体QC/代表確認/人間採用・end-to-endは親/制作担当の境界であり本cycleでは実施しない。
