# CURRENT_GOAL — 現在の目的と復元入口

更新日：2026-10-03（JST）

## 1. 復元・旧履歴

プロジェクトZEV_START_HERE.mdを全文読み、GitHub mainの現在HEADと同一SHAのHANDOVER_INDEX、現行指示を読む。保存・発行・受領・実行・技術受理・人間採用を分ける。

更新前の全文と計画時計診断完了は[903d79b4固定版](https://github.com/f-kw/zev2/blob/903d79b43e0fa99d3a9f2e78881434afa8714dcc/docs/CURRENT_GOAL.md)へ保持。表示回答の全履歴はfda455c4、記録整形停止01b25053、旧候補と行末未達d93e6418、第一回答停止d231a911、準備完成a98f569a、初回準備停止f577bfba、入力対応4556e389、実判断7bb5de02、v005までの履歴ccd907a5を辿る。古い停止・次試験を後のacceptへ逆流させない。

## 2. 完了・相談役受理

- **v005通常キュー接続：技術完了。** 7c8f34ce、[親v005 §13](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md)accept。追加拒否/転送検証へ戻さない。
- **通常依頼の実判断付き計画：7bb5de02 accept。** 12候補/7採用/9保持、keep3,613/drop3,460、4工程succeeded、27,691frame/40,705,770sample、別process再読0。既見素材一件で汎化・人間品質とは別。
- **字幕演出入口の入力対応：4556e389 accept。** 18項目の供給元・不足・再利用条件の静的対応。
- **字幕判断入力準備：a98f569a accept。** 新二path、3,613atom/9要求、旧658断片比較、11拒否、別process再構築。
- **保存9表示要求の実回答候補：fda455c4 accept。** attempt-004、218表示単位/289行、1〜8同一再利用・9一行末訂正、全被覆/既存検査/別process再読0。manifest SHA bbf4536aaae9941a3142630b74a74db5638c570a731b33c03360770a32b6bc88。
- **接続前計画時計診断：903d79b43e0fa99d3a9f2e78881434afa8714dccを今回accept。必須追加修正なし。** 全218cue/289行/3,613atomを同じ9区間の計画frameへ対応、unmapped0。既存境界関数と保存mapping一致、型/run0、新小JSONの保存再読一致、読んだ95件不変。判定は[次指示§1](work-orders/ZEV_DIGEST_CAPTION_STYLE_COMPATIBILITY_20261003_v001.md)、保存be4ba18cb82743f8604777a62ca40859c77121a7。

時計JSON SHA 72eab2201c0bb3e918aabf314ec3c0613f61ef4641a20402db5e7316282a2761、manifest SHA 36f41a965c891aa5cf35c00c81b2aaf171284a1941d9d9d20a9c64532db44179。3file/1,199,438bytes、製品6/設営25。元60/1・722,162 decoded frame・offset0msは保存inspection由来。元27,691frame/40,705,770sampleは不変。8〜526frame/区間内空白15件1,220frame/重なり0は観測のみで見心地の判定ではない。

以上はGitHubのコード・記録・差分監査であり、相談役がMacのignored runtimeを再実行・媒体を視聴したものではない。15分初稿レビュー、構成改善v001の局所検証、一件後修正/Reset、旧9:47案1080p低メモリ製造も既存完了範囲を維持する。今回の診断を正式timeline/renderer/動画の合格へ広げない。

## 3. 次の一件 — 144px技術候補と現在表示回答の適合

**正本：[ZEV_DIGEST_CAPTION_STYLE_COMPATIBILITY_20261003_v001.md](work-orders/ZEV_DIGEST_CAPTION_STYLE_COMPATIBILITY_20261003_v001.md)、保存be4ba18cb82743f8604777a62ca40859c77121a7。**

kawafmm承認済みID9主線と「終わったら次に進んで」に基づく限定媒体なし診断。現在の218cue/289行を既存144px・縁A=8/4のNormal技術候補へ機械的に当て、既存論理領域検査の適合・不適合・評価不能を列挙し、必要な再準備対象だけを特定する。内容・行末・時計は変更しない。最終styleや縁Aを人間採用する指示ではない。

選定理由：現在の回答は旧36論理幅/2行で成立しているが、現行text-metricsはweight*fontSize*0.5を幅の下限にする。36/144pxは2,592pxで1920pxより広い。36合格だけで144px適合とはできない。これは実装算術で、今回各cueの実glyphや全不適合件数を測ったものではない。既回答144pxを問い直さず、背景製造前に差分を絞る。

### 実施範囲

- 現在の計画時計/表示/準備manifestと対応回答の小JSONを実SHAで読む。既に完了したmap-timing/run-display/通常4工程や旧consumerは再実行しない。
- 9/29人間回答、7A verification/current-inspection/candidate-connection、既存入力対応の参照から、A=8/4で使った一つの正常Normal候補のstyle/canvas/layoutRules/font ledgerの小JSONを確認する。7Aの4/4とAの8/4を混ぜない。欠落は具体的な不足として返し仮値で埋めない。
- indexExplicitLinesV001等で保存済み行だけを索引化し、buildExactTextModelとinspectPresentationRenderLayoutV001をそのまま使用。元本文・境界・218cue・計画frameは不変。自動折返し、縮小、safe area緩和をしない。
- documentなしの既存推定幅経路として記録し、実glyph/raster/alpha検査とはしない。font binary、ブラウザ、Remotion描画は起動しない。
- 領域不適合は診断結果として全件収集し、helper故障と区別する。不適合cue→元要求の最小対象集合、再利用可能な回答、新条件で再準備が必要なものを分ける。新要求/新回答や旧SHA付替えは今回行わない。

許可path：docs/reports/digest-caption-style-compatibility-20261003/のcheck-style.mts、README.md、evidence.json、新runtime/artifacts/digest-caption-style-compatibility-20261003-v001/attempt-001/、自分の現在地記録。小補助作成・適用時だけ設営26を個別計上。製品6/設営25、新二path初実装、全失敗履歴、一般上限・強制停止は維持する。

必要確認は補助型/preflight、既存関数による全cue診断、小JSON保存再読一回、読んだ旧小入力不変だけ。新否定suite/別process追加・全過去資産再走査・旧レビュー再実行は不要。

## 4. 人間回答・別の未承認事項

144pxと「読む必要がある文章でなかったら」の条件付き分割、水色/カラフル方向肯定を保持。通常144pxの方向肯定は最終style/registry/default/全編人間品質の承認ではない。

presentation=not-connected／executionPermission=not-approved／humanQuality=pending／outlineChoice=null、ID9-PD-01/02未承認。今回のA=8/4は既存技術候補だけで縁選択ではない。B=8/12の21論理不合格、強調変更B未肯定、LightCoral技術不合格と好みの区別、固定アップのHUD/自動選択/品質を保持する。

旧10回答・15分レビューは済み。R1〜R3修正版7点、鬼武者Q3-2未回答は[人間台帳](HUMAN_REVIEW_PENDING.md)へ保持。一件後修正/Resetは既存能力。旧307状態/18色/82frameアップは一括移植しない。

背景media/timeline/生成manifest/検証receipt、正式style/renderer/font ledgerの採用、ROOT基準後段接続、演出・動画許可・人間品質、旧state移行・本番・公開は別の残件。診断に不適合があっても旧条件での表示/時計acceptを取り消さず、最小次差分だけを返す。

## 5. 容量・保全・禁止

旧8コピー35.79GiB削除・33参照再作成要の履歴を保持。元動画/STT/inspection/完成媒体/判断/旧stateを保持。実判断終了時空き12,933,283,840bytesは過去観測で、現在空き/SSDは未確認。今回容量整理・SSD・削除はしない。

媒体/フォントbinaryのread/hash/copy/PUT、通常HTTP/backend/index runner、新API/provider/費用、取得/STT/inspection/ffprobe、内容再判断・cue/時計変更、描画/画像/背景/演出/動画、新queue/UI、本番/公開は禁止。元purpose・承認・各親scope・旧入力/成果物を編集せず、今回診断scopeを別に記録する。

## 6. 受渡し・Git・稼働

初回は本人手貼り。現在は同じCodex2が専用Edgeから直接問い合わせ、返信生成完了・全文読了まで受領して今回指定範囲で続行する。本人への再手貼り・転記・視聴・採点、Codex1起動、受理だけの独立commitは不要。

main・担当のみ明示stage、他者変更保全、Git操作直列化。903d79b4のpush/Git clean/対象process0はCodex報告と保存証拠であり、相談役のMac直接観測ではない。

今回計画時計acceptと次指示は発行済み。144px適合診断の受領・設営26適用・実行は未確認。報告名：Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9の後続・144px技術候補と表示回答の適合。診断完了から再分割実回答・背景製造・正式style採用・動画へ自動着工しない。


### Codex2 144px診断受領checkpoint（2026-10-03）

main 2626106bで今回正本全文・専用Edgeの完了返信を受領。既存A=8/4 Normalの同一保存束を確認中。小補助作成時の設営26だけ個別承認、現在は製品6／設営25。既受理・旧成果・承認境界は維持。媒体・フォントbinary・描画・新要求／回答・内容や時計変更は行わない。詳細は[今回report](reports/digest-caption-style-compatibility-20261003/README.md)。

Codex2 checkpoint：今回小補助check-style.mtsを作成し、個別承認の設営26を適用。製品6、過去設営25と失敗履歴は維持。現在は型・入力・出力先preflight前、診断未実行。

Codex2 停止checkpoint：設営26の型検査0後、正本MarkdownをJSON readerへ渡したSyntaxErrorでrun exit1。字幕診断到達0、旧入力や媒体作用0。新attempt-001失敗証拠を保持。一行のbyte読取化＋新attempt-002だけを設営27候補としてGPT_DECISIONへ返す。自己承認・再実行はしない。
