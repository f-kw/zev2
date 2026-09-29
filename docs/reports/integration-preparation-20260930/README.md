# 既存改善の統合準備

**統合準備完了。縁A/Bは未選択。最終統合動画とそのQCは未実行。**

ユーザーが指定した新しい「ZEV Build Loop」へ7Aの人間回答、縁2案の作成結果、旧会話の長さ上限で未送信だった表情アップを直接報告した。本文表示と監査応答を確認し、「既存改善の統合準備」に限定する続行指示を受領した。元のkawafmm承認済み主線継続範囲内であり、新しい品質改善や正式採用ではない。

## 一本化したもの

- 7Bの保存済み9分47.1秒・17,613frameの構成と音声を基礎に、7Aの265字幕、307の描画状態、保存された本文・改行・時計・動きをそのまま解決する。
- 13のYellow＋LightSkyBlue、既存18 Color範囲を同じ字幕計画へ接続。色の再判断やLightCoral復活はない。
- 表情アップは既存000119の82frameのみ。前後の通常背景、保存済み7秒局所処理、字幕の順に合成する準備情報を保存。局所の前後を含め17,613frameに隙間・重複がないことを確認した。アップ中のHUD欠落は[局所実証の制約](../reaction-close-up-20260929/README.md)のまま。
- 縁A（8/4px）・B（8/12px）は技術previewの解決だけを用意。通常字幕と動きの各状態の輪郭幅だけが変わり、Panel固有の背景・縁は保持する。DarkSlateGray、不透明度82%、文字サイズは不変。
- 保存原案の縁選択はnull。previewのA→B→画角Normal→Reset後は、**縁未選択＋保存された局所アップ**の原案へ完全に戻る。Normalを原案として上書きしない。

字幕・色は既存の保存証拠reader、動きは既存の有限状態生成、画角は既存の局所candidateとフィルター、背景区間は既存の時計付き抽出recipeを使用する。既存readerの短区間制限や旧版の実装hashは変更していない。新規処理は今回の固定入力の準備・preview解決・再読だけを扱う。

## 検証

- [対象8試験](tests.tap)：8合格、失敗0、skip0。全字幕・全描画状態の内容不変、Panel/色/動き保持、画角解除、Reset、未知指定、別入力、改変、欠損・未完了の拒否を確認。
- 別Node processで準備記録を再読し、元の保存入力から全plan・各preview・背景処理を再構成して完全照合。265字幕・307状態・18 Color対象・82frameが一致。
- 既存表情アップの独立readerも使用し、保存媒体・音声・時計・PNG・Reset・tool/実装の不変を再確認。新しい表情アップ描画は実行していない。
- 旧7B媒体・保存音声・背景・表情アップ3媒体・縁比較18PNGと比較媒体のSHA不変。7A/13の保存入力は既存readerの参照束縛を維持する。既存成果物の削除・上書きなし。
- 最新mainは開始時local/remoteとも `99149f0148ce8b1f7e552b31bcf8c88fce6931c1`。旧13の35試験、表情アップの12＋10試験は以前の結果として参照し、今回の8試験へ合算していない。

**今回証明したのは保存・解決・再読と統合の機械的整合。新しい縁で全字幕を描画した後のsafe area、全編媒体、1080p品質、最終QCは後続実走が必要。** 3例の縁比較の領域検査を全265字幕の画素合格へ読み替えない。保存した準備情報を完成動画のreceiptや正式trustとして渡さない。

## 実測・再現

- 準備・既存証拠照合：16.548秒、Node親最大RSS623,034,368 bytes。
- 別process再読：16.490秒、Node親最大RSS554,123,264 bytes。
- 子tool総ピーク・物理I/Oは未計測。動画新規生成0、API/STT/素材取得0。
- 最初の準備は、未指定の外部音声参照を読もうとして停止。実体は既存の区間音声参照にあるため、そこを読む限定修正後、未使用attempt-002で準備を実行した。attempt-001は未完了として保持。旧音声の生成・変更はしていない。

保存先：`runtime/artifacts/integration-preparation-20260930-v001/attempt-002/`。
小型の[検証記録](verification.json)から、入力・準備・preview・完了receipt・新相談役の指示原文へ辿れる。Gitへ媒体は追加していない。

```sh
node tools/digest-quality/integration-preparation.mjs prepare runtime/artifacts/integration-preparation-20260930-v001/attempt-NEW
INTEGRATION_DRAFT="$PWD/runtime/artifacts/integration-preparation-20260930-v001/attempt-002/draft.json" node --test tools/digest-quality/integration-preparation.test.mjs
node tools/digest-quality/integration-preparation.mjs read runtime/artifacts/integration-preparation-20260930-v001/attempt-002/completion.json
```

準備は未使用directoryへ保存する。実装や保存入力が変われば古い実行を合格として再利用せず、不一致を拒否する。

## 未決・次の境界

人間の回答は「新しい文字サイズは読みやすい」「読む必要がある文章でなければ新しい分割が良い」。全文章・全編の無条件採用に拡大しない。[原文と2案](../caption-readability-splitting-20260928/human-feedback-20260929-v001.md)を参照する。

最終動画に入れる前に残る見た目の選択は**縁A/B**。今回の指示どおり代理決定せず、即時回答も要求しない。最終動画の描画・QC・最終人間品質確認は未完了。production default／旧trust／registryは変更していない。

今回の統合準備を直接報告して区切り、1080p全編・別素材8・追加改善へ自動着手しない。
