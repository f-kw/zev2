# CURRENT_GOAL — 現在の目的と復元入口

更新日：2026-10-03（JST）

## 1. 復元・旧履歴

プロジェクトZEV_START_HERE.mdを全文読み、GitHub mainの現在HEADと同一SHAのHANDOVER_INDEX、現行指示を読む。保存・発行・受領・実行・技術受理・人間採用を分ける。

更新前全文、設営24、表示回答の初回失敗からattempt-004完成までの記録は[fda455c4固定版](https://github.com/f-kw/zev2/blob/fda455c46a89318e063af79fdfb33753fd50de8d/docs/CURRENT_GOAL.md)に保持。01b25053の記録整形停止、d93e6418の技術成功と一行末未達、d231a911の初回表示停止、a98f569aの準備完成、f577bfbaの初回準備停止、4556e389の入力対応、7bb5de02の実判断、ccd907a5までのv005履歴を辿れる。古い停止や次試験を後のacceptへ逆流させない。

## 2. 完了・監査受理

- **v005通常キュー接続：技術完了。** 7c8f34ce、[親v005 §13](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md)accept。追加拒否・転送・旧suiteへ戻さない。
- **通常依頼の実判断付き計画：7bb5de02 accept。** 12候補/7採用/9保持、keep3,613/drop3,460、4工程succeeded、27,691frame/40,705,770sample、別process再読exit0。既見素材一件であり、未見素材汎化・人間品質とは別。
- **字幕演出入口の入力対応：4556e389 accept。** 9区間/3,613断片/18項目の供給元・不足・再利用条件。静的対応まで。
- **字幕判断入力準備：a98f569a accept。** 新二path、3,613atom/9要求、旧正常658断片比較、11拒否、別process再構築、旧54件不変。
- **保存9表示要求への実回答候補：fda455c46a89318e063af79fdfb33753fd50de8dを今回accept。必須追加修正なし。** [表示計画時計指示§1](work-orders/ZEV_DIGEST_CAPTION_PLAN_TIMING_20261003_v001.md)、保存31554429dc977723dd06a93fb3bbb7fdaeb4e824に判定を記録。attempt-004で1〜8は同一回答再利用、9は一行末のみ訂正。全3,613atom/218表示単位/289行、既存Skill/validator、SHA差替え拒否、別process再読exit0。元21入力/実装・旧56file不変。manifest SHA bbf4536aaae9941a3142630b74a74db5638c570a731b33c03360770a32b6bc88。

今回はGitHubの保存コード・記録・差分の監査。相談役がMacのignored runtimeを再実行・媒体を視聴したものではない。表示候補の完了を物理style・表示時間の見心地・背景・renderer・動画・人間品質へ広げない。

15分初稿レビュー、構成改善v001の局所検証、一件後修正/Reset、旧9:47案の1080p低メモリ製造も既存完了範囲を維持する。

## 3. 次の一件 — 表示回答の計画frame時計対応

**正本：[ZEV_DIGEST_CAPTION_PLAN_TIMING_20261003_v001.md](work-orders/ZEV_DIGEST_CAPTION_PLAN_TIMING_20261003_v001.md)、保存31554429dc977723dd06a93fb3bbb7fdaeb4e824。**

kawafmm承認済みID9主線と「終わったら次に進んで」に基づく、保存済み一計画の媒体なし診断に限定した新scope。旧回答作業の禁止範囲を遡及変更しない。

既存の218表示単位を、その所属9区間の保存時計へ対応付ける。本文・行末・採否保持は再判断せず、cueごとの元ms/元frame/計画startFrame/endFrameExclusive/displayFrameCountと元参照を小JSONへ保存する。

正式assembleは完成sourcePackage/base.timeline/style registryを要求するため未接続。dummy base・仮SHA・旧timeline偽装で通さない。既存frameBoundaryWithVideoOffsetV001/sourceEndFrameBoundaryWithVideoOffsetV001と既存mapperのoffset算術だけを使い、保存inspection/9mappingに一致する接続前計画時計を診断する。正式timeline/renderer artifact/queue completeを名乗らない。

入力は表示attempt-004のmanifest、準備attempt-002/bundleとparameters、正規参照から辿る元state/保持/時計/保存inspectionの小JSON。元scope/purpose/承認、media bytes未再検査という境界は不変。旧run-displayのrun/readbackを再起動しない。JSON-only準備readerと既存表示検査を今回の入力消費として一度使ってよい。

candidate-0006の三非連続区間を保持し、異なる区間のmin/max結合やdrop復活をしない。source fps/offset/終端を推測せず、必要fieldを保存inspectionと既存定義から確認する。ゼロframe・範囲外・順序不整合はunmappedとして区別し、時間延長・再分割で隠さない。新しい読速や最低表示時間の閾値は設けない。

許可pathはdocs/reports/digest-caption-plan-timing-20261003/のmap-timing.mts、README.md、evidence.json、新runtime/artifacts/digest-caption-plan-timing-20261003-v001/attempt-001/、自分の現在地記録だけ。製品code変更なし。小補助作成・適用時だけ設営25を個別計上する。現累積は製品6/設営24、新二path初実装と各失敗履歴を区別し、一般上限・強制停止・自己承認権を変更しない。

必要型検査/preflight、全cueの元参照・本文不変・区間内frame対応、新小JSONの保存再読一致、読んだ旧入力の不変を確認する。今回診断のために新しい否定suiteや別processを追加必須にしない。全過去資産の再走査や9回答の再判断も行わない。

完了後、正式後段に残る背景4参照/最終style/ROOT読取/動画許可を短く引き継ぐ。今回数値を完成媒体の検証receiptに変換しない。

## 4. 人間回答・未承認・容量

presentation=not-connected／executionPermission=not-approved／humanQuality=pending／outlineChoice=null、ID9-PD-01/02未承認。36論理幅/2行は候補条件。144px・「読む必要がある文章でなかったら」の条件付き分割、水色・カラフル方向肯定は保持するが、最終style・縁選択・人間品質へ拡張しない。

縁B21論理不合格、他色/強調/アップ、R1〜R3修正版7点、鬼武者Q3-2は[人間台帳](HUMAN_REVIEW_PENDING.md)へ保持。旧10回答・15分レビューは済み。旧307状態/18色/82frameアップは一括移植しない。新しい採点・視聴を主線の前提にしない。

完成背景media/timeline/生成manifest/検証receipt、最終style/renderer/font ledger、ROOT基準後段読取、演出・動画許可・人間品質、旧state移行・本番・公開は別。今回新計算は計画frameだけで、元40,705,770sampleは参照のまま。

本人承認の旧8コピー35.79GiB削除、33参照再作成要の履歴を保持。実判断終了時空き12,933,283,840bytesは過去観測で現在空き/SSDは未確認。媒体read/hash/copy/PUT、通常HTTP/backend/runner、新API/provider/費用、取得/STT/inspection/ffprobe、描画/動画、SSD、削除、本番/公開は今回も行わない。

## 5. 起動・問い合わせ・Git

初回は本人手貼り。現在は同じCodex2が専用Edgeから直接問い合わせ、返信生成完了・全文読了まで受領して指定範囲を続行する。同じ主線の今回指示で本人への再手貼り・転記を要求しない。Codex1起動・受理だけの独立commitは不要。

main・担当のみ明示stage、他者変更保全、Git操作直列化。fda455c4のpush・Git clean・対象process残存0はCodex報告と保存記録。相談役のMac直接観測ではない。

表示候補のacceptと次指示は発行済み。新指示受領・設営25適用・計画時計診断の実行/完成は未確認。報告名：Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9の後続・表示回答の計画時計対応。今回完了から背景製造・最終style確定・演出/動画へ自動着工しない。
