# CURRENT_GOAL — 現在の目的と復元入口

更新日：2026-10-03（JST）

## 1. 復元・旧履歴

プロジェクトZEV_START_HERE.mdを全文読み、GitHub mainの現在HEADと同一SHAのHANDOVER_INDEX、現行指示を読む。保存・発行・受領・適用・実行・技術受理・人間採用を区別する。

更新前の全文と設営26の初回停止は[9dc72330固定版](https://github.com/f-kw/zev2/blob/9dc723304cf3387ae1b45e3ba8f654c61d7ea3a0/docs/CURRENT_GOAL.md)へ保持。903d79b4計画時計完成、fda455c4表示回答完成、01b25053記録整形停止、d93e6418旧技術候補と行末未達、d231a911第一回答停止、a98f569a準備完成、f577bfba準備初回停止、4556e389入力対応、7bb5de02実判断、ccd907a5までのv005履歴を辿る。古い停止や次試験を後のacceptへ逆流させない。

## 2. 完了・相談役受理

- **v005通常キュー接続：技術完了。** 7c8f34ce、[親v005 §13](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md)accept。追加拒否/転送検証へ戻さない。
- **通常依頼の実判断付き計画：7bb5de02 accept。** 12候補/7採用/9保持、keep3,613/drop3,460、4工程succeeded、27,691frame/40,705,770sample、別process再読0。既見素材一件で汎化・人間品質とは別。
- **字幕演出入口の入力対応：4556e389 accept。** 18項目の供給元・不足・再利用条件の静的対応。
- **字幕判断入力準備：a98f569a accept。** 新二path、3,613atom/9要求、旧658断片比較、11拒否、別process再構築。
- **保存9表示要求への実回答候補：fda455c4 accept。** attempt-004、218表示単位/289行、1〜8同一回答再利用・9一行末訂正、全被覆/既存検査/別process再読0。manifest SHA bbf4536aaae9941a3142630b74a74db5638c570a731b33c03360770a32b6bc88。
- **接続前計画時計診断：903d79b4 accept。** 全218cue/289行/3,613atomを同じ9区間の計画frameへ対応、unmapped0、保存再読一致。受理は[STYLE_COMPATIBILITY §1](work-orders/ZEV_DIGEST_CAPTION_STYLE_COMPATIBILITY_20261003_v001.md)。時計JSON SHA 72eab2201c0bb3e918aabf314ec3c0613f61ef4641a20402db5e7316282a2761、manifest SHA 36f41a965c891aa5cf35c00c81b2aaf171284a1941d9d9d20a9c64532db44179。8〜526frame/空白15件1,220frame/重なり0は観測値で見心地合格ではない。

15分初稿レビュー、構成改善v001の局所検証、一件後修正/Reset、旧9:47案1080p低メモリ製造も完了範囲を保持。これらは保存コード・実測証拠に基づく相談役監査であり、Macの全runtime再実行や媒体視聴を相談役が行ったものではない。

## 3. 現在の一件 — 144px診断の正本読取修正

**9dc72330の初回停止を監査。正本MarkdownをJSON readerへ渡した設営欠陥を、既存byte readerによるSHA照合へ直し、新attempt-002で診断を続ける一件を設営27として個別承認した。製品6/設営26は適用済み。27の受領・適用・実行は未確認。診断到達0、全cue結果はまだない。**

再開正本：[SCOPE_READ_FIX](work-orders/ZEV_DIGEST_CAPTION_STYLE_COMPATIBILITY_20261003_v001_SCOPE_READ_FIX.md)、保存26e982e57e24614287b26bfa647ae3c0549a84d4。
親：[STYLE_COMPATIBILITY](work-orders/ZEV_DIGEST_CAPTION_STYLE_COMPATIBILITY_20261003_v001.md)、保存be4ba18cb82743f8604777a62ca40859c77121a7。

kawafmm承認済み親scope内の、原因と最小差分が現物で確定した検査設営一件。AGENTSの相談役委任で本人への再確認・転記は不要。一般上限・強制停止・過去履歴・自己承認権は変更しない。

### 修正と保全

check-style.mtsの `await ref(evidence.workOrder);` だけを
`const scope = obj(evidence.workOrder); await bytes(str(scope.path), str(scope.fileSha256));`
へ置換する。refはbytes照合後にJSON.parseするためMarkdownで失敗した。既存bytesによるpath/SHA/observed検査は維持し、JSON入力のreaderや例外処理を緩めない。

OUTだけをruntime/artifacts/digest-caption-style-compatibility-20261003-v001/attempt-002へ変更。新規/排他保存と不存在確認を維持し、旧attempt-001は上書き・削除しない。同helperのmanifest.history、evidence/README/現在地の累積・受領HEAD・保存先・失敗履歴の記録追従は可。適用時に設営27、製品6のまま。

親正本とevidence.workOrderの実SHA 4e244e34f9b3f04ed338574801a38eccc76e7b1be4fafb5b6a6fed6827b363b5 は維持。修正追補を別path/SHA/受領HEADへ記録し、元scopeBindingへ付け替えない。

旧attempt-001のfailure.json/evidence-snapshot.json、失敗時helper SHA 5048864bbf9a3c0073b5f99c971dec0a1641fb1fa0a72e7a615fc49e7a4205c8、型0/run1/診断0、9dc72330固定Git版を保持。後の成功へ上書きしない。

### 続行する診断

目的は既存144px・縁A=8/4 Normal技術候補へ、保存218cue/289行を本文・行末・時計不変で当て、不適合cue/元要求の最小再準備対象を得ること。Aの人間選択や最終style採用ではない。

比較attempt-003 verificationのraster[tag=0-A,label=0].propsと元candidate-plan/raster-records/font宣言の同参照鎖を実行時に照合する。初期7A4/4やB8/12を混ぜない。欠落は具体的な不足として返し仮値を使わない。今回この後段検査はまだ未実行。

既存indexExplicitLinesV001/buildExactTextModel/inspectPresentationRenderLayoutV001をそのまま使い、Nodeのdocumentなし推定幅として記録する。字体実測ではない。通常の領域不適合は全件収集して診断結果とし、初件でhelper故障扱いしない。予期しない例外は隠さず、折返し・縮小・safe area緩和で無理に合格させない。

必要型/export/入力SHA/新先確認→全cue診断→新小JSON保存再読一回→読んだ旧小入力不変→担当のみ通常commit/push・対象process終了確認・直接報告まで進む。新しい否定suite/別process・旧資産全走査・旧run-display/map-timing/通常4工程/QC/人間レビューは追加しない。

## 4. 人間回答・別の未承認事項

144pxと「読む必要がある文章でなかったら」の条件付き分割、水色/カラフル方向肯定を保持する。36論理幅での候補成立を144px最終style・物理幅・表示時間・全編品質の合格にしない。

presentation=not-connected／executionPermission=not-approved／humanQuality=pending／outlineChoice=null、ID9-PD-01/02未承認。Aは診断用技術候補。B8/12の21論理不合格、強調変更B未肯定、LightCoral技術不合格と好みの区別、固定アップのHUD/自動選択/品質未解決を保持。

旧10回答・15分レビューは済み。R1〜R3修正版7点、鬼武者Q3-2未回答は[台帳](HUMAN_REVIEW_PENDING.md)へ保持。一件後修正/Resetは既存能力。旧307状態/18色/82frameアップは一括移植しない。

背景4参照、正式style/renderer/font ledgerの採用、ROOT基準後段接続、演出・動画許可・人間品質、旧state移行・本番・公開は別の残件。今回新要求/回答を作らず、旧acceptを取り消さない。

## 5. 容量・禁止・受渡し

旧8コピー35.79GiB削除・33参照再作成要、元動画/STT/inspection/完成媒体/判断/旧state保持を維持。実判断終了時空き12,933,283,840bytesは過去観測で現在空き/SSDは未確認。

製品/旧helper/Skill/validator/renderer、元purpose/承認/準備/回答/時計は不変。媒体/フォントbinary read/hash/copy/PUT、通常HTTP/backend/index runner、新API/provider/費用、STT/inspection/ffprobe、内容再判断、新要求/回答、描画/背景/演出/動画、新queue/UI、SSD、削除、本番/公開は行わない。

同じCodex2専用Edgeで返信生成完了・全文読了まで受領して指定範囲を続行する。本人への再手貼り/転記/視聴/採点、Codex1起動、受理だけの独立commitは不要。main・担当のみ明示stage、他者変更保全、Git操作直列化。

報告：Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9の後続・144px技術候補と表示回答の適合。

発行時点：main 9dc72330と保存コード・失敗記録を確認。Git clean/untracked0とprocess残存0はCodex報告で、相談役のMac直接観測ではない。設営27の指示は保存済み、受領・適用・attempt-002稼働/診断完了は未確認。