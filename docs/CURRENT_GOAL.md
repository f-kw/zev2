# CURRENT_GOAL — 現在の目的と復元入口

更新日：2026-10-03（JST）

## 1. 復元・旧履歴

プロジェクトZEV_START_HERE.mdを全文読み、GitHub mainの現在HEADと同一SHAのHANDOVER_INDEX、現行指示を読む。保存・発行・受領・適用・実行・技術受理・人間採用を分ける。

更新前全文、設営27の受領/適用とReact解決停止は[0f103935固定版](https://github.com/f-kw/zev2/blob/0f103935d50b6c6059f8bf0db723f8be80a6923d/docs/CURRENT_GOAL.md)に保持。9dc72330の正本Markdown読取停止、903d79b4計画時計完成、fda455c4表示回答完成、01b25053記録整形停止、d93e6418旧候補と行末未達、d231a911第一回答停止、a98f569a準備完成、f577bfba準備初回停止、4556e389入力対応、7bb5de02実判断、ccd907a5までのv005履歴を辿れる。古い停止・次試験を後のacceptへ逆流させない。

## 2. 完了・相談役受理

- **v005通常キュー接続：技術完了。** 7c8f34ce、[親v005 §13](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md)accept。追加拒否/転送検証へ戻さない。
- **通常依頼の実判断付き計画：7bb5de02 accept。** 12候補/7採用/9保持、keep3,613/drop3,460、4工程succeeded、27,691frame/40,705,770sample、別process再読0。既見素材一件で汎化・人間品質とは別。
- **字幕演出入口の入力対応：4556e389 accept。** 18項目の供給元・不足・再利用条件の静的対応。
- **字幕判断入力準備：a98f569a accept。** 新二path、3,613atom/9要求、旧658断片比較、11拒否、別process再構築。
- **保存9表示要求への実回答候補：fda455c4 accept。** attempt-004、218表示単位/289行、1〜8同一回答再利用・9一行末訂正、全被覆/既存検査/別process再読0。manifest SHA bbf4536aaae9941a3142630b74a74db5638c570a731b33c03360770a32b6bc88。
- **接続前計画時計診断：903d79b4 accept。** 全218cue/289行/3,613atomを同じ9区間へ対応、unmapped0、保存再読一致。受理は[STYLE_COMPATIBILITY §1](work-orders/ZEV_DIGEST_CAPTION_STYLE_COMPATIBILITY_20261003_v001.md)。時計JSON SHA 72eab2201c0bb3e918aabf314ec3c0613f61ef4641a20402db5e7316282a2761、manifest SHA 36f41a965c891aa5cf35c00c81b2aaf171284a1941d9d9d20a9c64532db44179。8〜526frame/空白15件1,220frame/重なり0は観測だけで見心地合格ではない。

15分初稿レビュー、構成改善v001の局所検証、一件後修正/Reset、旧9:47案1080p低メモリ製造も完了範囲を維持。受理はGitHubの保存コード・証拠による相談役監査であり、Macの全runtime再実行・媒体視聴を行ったものではない。

## 3. 現在の一件 — 既存Node依存解決で144px診断を再開

**0f103935を監査。設営27の正本byte読取と新先は適用済み、型検査0。実runは既存renderer importのMODULE_NOT_FOUND: reactでexit1、cue診断0・完成出力0。対象childだけNODE_PATHを既存runner/node_modulesへ指定し、失敗保全用attempt-003へ移す一件を設営28として個別承認した。製品6/設営27は実績、28は指示発行済み・適用未確認。**

再開正本：[NODE_PATH_FIX](work-orders/ZEV_DIGEST_CAPTION_STYLE_COMPATIBILITY_20261003_v001_NODE_PATH_FIX.md)、保存16254bd47eaa8f449ec7a202c88765cb74894ea3。
親：[STYLE_COMPATIBILITY](work-orders/ZEV_DIGEST_CAPTION_STYLE_COMPATIBILITY_20261003_v001.md)。
前修正：[SCOPE_READ_FIX](work-orders/ZEV_DIGEST_CAPTION_STYLE_COMPATIBILITY_20261003_v001_SCOPE_READ_FIX.md)。

kawafmm承認済み親作業の起動設営で、既存tools/digest-quality/integrated-preview.mjsとoriginal-resolution-local.mjsにも同じlayout inspector childへのNODE_PATH指定がある。新dependency/製品/検査意味/費用/権限を変えないため、AGENTSの軽微技術判断委任で本人への再確認・転記は不要。一般上限・強制停止・過去履歴・自己承認権は不変。

### 許可する変更

確認済みworkspaceをcwdに、診断commandだけへ次を指定する。

```sh
cd /Users/kawafmm/workspace/zev2 && \
NODE_PATH=/Users/kawafmm/workspace/zev2/runner/node_modules \
node --import ./runner/node_modules/tsx/dist/loader.mjs \
docs/reports/digest-caption-style-compatibility-20261003/check-style.mts run
```

小補助はOUTだけをruntime/artifacts/digest-caption-style-compatibility-20261003-v001/attempt-003へ変更し、manifest.historyを28に追従する。evidence/README/現在地へ実受領HEAD、適用回数、command/cwd/NODE_PATH、既存依存解決先、新先/時刻/失敗履歴を記録する。新しいhelperは不要。設営27のbyte/SHA読取は維持する。

恒久export、shell profile、本番環境、他process、package.json/lockfile/node_modulesは変更しない。install/update、新symlink、stub、独自resolver/loader、製品/renderer/Skill/validator改変・複製は行わない。既存pnpm symlinkの解決・module読取だけを使う。旧製造toolは起動しない。

### 保全と未確認

元evidence.workOrder/出力scopeBindingの親SHA 4e244e34f9b3f04ed338574801a38eccc76e7b1be4fafb5b6a6fed6827b363b5 は不変。今回追補は別path/SHA/受領HEADへ記録し、設営27のrepairApprovalを消さない。旧manifestのhelper SHAを付け替えず、新manifestへ今回実装SHAを記録する。

旧attempt-001のMarkdown失敗、attempt-002のReact失敗を別々に保持。failure.json/evidence-snapshot.json、attempt-002のprocess-output.txt、失敗helper SHA 1f346a9dcf1752e765c54938118330d6147defb02efa26c7cb9de2b8b13970a8、0f103935固定Git版を不変保持する。新先不存在とwxを維持し、旧attemptの削除・上書きはしない。

React18.3.1/Remotion4.0.481の実pathと元NODE_PATH=nullはCodexのrequire.resolve観測報告。相談役の実機再測定ではない。require.resolveや旧起動例だけで今回の実importを合格にせず、新起動条件で既存の実import/export確認を通してから診断する。未解決なら例外を隠さず相談役へ返し、自動install/stubで通さない。

### 続行する診断

218cue/289行を既存144px・縁A=8/4 Normal技術候補へ本文・行末・時計不変で当て、不適合cue/元要求の最小再準備対象を得る。Aの人間選択・最終style採用ではない。

同一の比較attempt-003 verification内raster[tag=0-A,label=0].props、元candidate-plan/raster-records/font宣言の参照鎖を照合。7A初期4/4・A8/4・B8/12を混ぜず、欠落は具体的不足として返す。既存indexExplicitLinesV001/buildExactTextModel/inspectPresentationRenderLayoutV001を使い、documentなし推定幅と実glyph/rasterを区別する。

必要型/preflight/実import→全cue診断→新小JSON保存再読一回→読んだ旧小入力不変→担当のみcommit/push・Git状態/自分のprocess終了確認→専用Edge直接報告まで進む。通常の領域不適合は想定診断結果として全件収集し、初件でhelper故障扱いしない。折返し・縮小・safe area緩和で無理に合格させない。

新否定suite・別process試験・全旧資産走査、旧run-display/map-timing/通常4工程/QC/人間レビューは追加・再実行しない。

## 4. 人間回答・未承認境界

144pxと「読む必要がある文章でなかったら」の条件付き分割、水色/カラフル方向肯定を保持。36論理幅での候補成立を144px最終style・物理幅・表示時間・全編品質の合格へ広げない。

presentation=not-connected／executionPermission=not-approved／humanQuality=pending／outlineChoice=null、ID9-PD-01/02未承認。Aは技術候補。B8/12の21論理不合格、強調変更B未肯定、LightCoral技術不合格と好みの区別、固定アップのHUD/自動選択/品質未解決を保持。

旧10回答・15分レビューは済み。R1〜R3修正版7点、鬼武者Q3-2未回答は[台帳](HUMAN_REVIEW_PENDING.md)へ保持。一件後修正/Resetは既存能力。旧307状態/18色/82frameアップは一括移植しない。

完成背景4参照、正式style/renderer/font ledgerの採用、ROOT基準後段接続、演出・動画許可・人間品質、旧state移行・本番・公開は別。今回新要求/回答を作らず、旧acceptを取り消さない。

## 5. 容量・禁止・受渡し

旧8コピー35.79GiB削除・33参照再作成要、元動画/STT/inspection/完成媒体/判断/旧state保持を維持。実判断終了時空き12,933,283,840bytesは過去観測で現在空き/SSDは未確認。今回容量整理・SSD・削除をしない。

媒体/フォントbinary read/hash/copy/PUT、通常HTTP/backend/index runner、新API/provider/費用、STT/inspection/ffprobe、内容再判断、新要求/回答、描画・背景・演出・動画、新queue/UI、本番/公開は禁止。既存module importを描画許可へ読み替えない。

同じCodex2専用Edgeで返信生成完了・全文読了まで受領して続行する。本人への再手貼り/転記/視聴/採点、Codex1起動、受領だけの独立commitは不要。main・担当のみ明示stage、他者変更保全、Git操作直列化。

報告：Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9の後続・144px技術候補と表示回答の適合。

現在地：設営27適用・型0/run1・診断0、Git clean/untracked0・実run終了はCodex報告と保存記録。相談役のMac直接観測ではない。設営28は正本保存・発行済み。受領・適用・実import・attempt-003の診断完成は未確認。


Codex2 設営28受領・適用checkpoint（2026-10-03）：f83625b4のNODE_PATH_FIX全文と確定返信を受領。対象commandだけNODE_PATH=既存runner/node_modules、OUT attempt-003とmanifest履歴28へ追従。製品6／設営28、旧001/002失敗は不変。正本byte読取・scope・配置・判断・時計を維持。現在は型・実import・診断前。


Codex2 144px診断完成checkpoint（2026-10-03）：attempt-003、対象型/run0、実import/export成功。218cue/289行/3613atomは本文・行末・時計不変、A8/4 Normalの既存推定幅検査で適合120／不適合98／評価不能0。98件は右端116行のsafe area超過、元9要求すべてに分布。新小JSON一回再読object/bytes/SHA一致、読んだ48入力/実装と旧失敗5file不変。製品6／設営28、旧001/002失敗を保持。compatibility SHA eb7a7a69…、manifest948c1e11…。新要求／回答は未作成、120cue再利用候補・98cue再準備の最小案を[report](reports/digest-caption-style-compatibility-20261003/README.md)へ保存。縁null・人間品質pending・動画未承認を維持。次は担当のみcommit/push・Git/process確認・専用Edge直接報告。
