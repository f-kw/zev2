# CURRENT_GOAL — 現在の目的と復元入口

更新日：2026-10-03（JST）

## 1. 復元

プロジェクトZEV_START_HERE.mdを全文読み、GitHub mainの現在HEADと同一SHAのHANDOVER_INDEX、指定された現行指示を読む。保存・発行・受領・実行・技術受理・人間採用を区別する。

更新前の全文と第一回答後の停止checkpointは[d231a911固定版](https://github.com/f-kw/zev2/blob/d231a911c05f2eacbb6e7f70d8a0ac9e65a3aacf/docs/CURRENT_GOAL.md)へ保持。a98f569a準備完成、f577bfba初回準備停止、4556e389入力対応、7bb5de02実判断、ccd907a5までのv005履歴を辿れる。過去の停止や次試験を後のacceptへ逆流させない。

## 2. 完了・監査受理

- v005通常キュー接続は技術完了。7c8f34ceに対する[親v005 §13](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md)のacceptを維持し、再検証工事へ戻さない。
- 実判断付きDigest計画一件は7bb5de02でaccept。12候補/7採用/9保持、keep3,613/drop3,460、通常4工程succeeded、27,691frame/40,705,770sample、別process再読exit0。15:23案の区間・順序・時計を維持し、心霊回帰会話を比較へ追加。映像音声・STT誤り・汎化・人間品質とは別。
- 字幕演出入口の入力対応は4556e389でaccept。9区間/3,613断片/18項目、供給元/不足/旧再利用条件の静的対応まで。
- 字幕判断入力の準備接続はa98f569aでaccept。判定は[表示実回答指示§1](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001.md)、保存b14ef8f51ed040556d4f43e45a322a5affda1e91。新二path→既存入力validator→3,613atom/9要求保存、旧正常658断片比較、11拒否、別process再構築、旧54件不変を確認。manifest SHA 83052a914317ae8b5a056ff641635ff061ebf59830df68a8090d180f2f0cfb75、11file/2,591,297bytes。

以上はGitHubの保存コード・実測証拠による相談役監査。Macのignored runtimeや媒体を相談役が直接再実行したものではない。15分初稿レビュー、構成改善v001の局所検証、一件後修正/Reset、旧9:47案1080p低メモリ生成も完了範囲を維持する。準備の完成を表示回答・動画・人間採用の完成にしない。

## 3. 現在の一件 — 保存表示要求への実回答

**d231a911で第一要求の実回答・既存検査は通過したが、否定確認のraw error比較で補助がexit1。相談役は設営22の一件として比較値修正・失敗保全用attempt変更・同一要求に対する第一回答byte再利用を承認した。全9回答の完成はまだ未確認。**

親：[ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001.md](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001.md)
再開正本：[NEGATIVE_MESSAGE_FIX](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001_NEGATIVE_MESSAGE_FIX.md)、指示保存7a3111eb629c017e277ca7b281363b864b78fbf0。

kawafmm承認済みの保存9要求への候補回答範囲と軽微技術判断委任による個別修正。本人への再確認・転記は不要。一般委任・製品適用・動画許可は含めない。

### 3.1 停止の事実と修正

既存failは `DIGEST_SKILL_E2E: ${code}` を返す。補助run-display.mtsはraw error.messageと接頭辞なしDISPLAY_PROVENANCE_MISMATCHを比較していた。第一217atom/14表示単位のresponseとSkill resultを保存し、正常validatorは受理。SHA差替えcloneも拒否されたが、その直後の補助assertが失敗した。製品validator不具合・正常回答の来歴不一致ではない。

設営22として、比較一行を `assert.equal(code, 'DIGEST_SKILL_E2E: DISPLAY_PROVENANCE_MISMATCH')` とし、OUTだけを同parentのattempt-002へ変更する。rawメッセージの完全一致、出力不増加、全既存validator・本文・入力SHAは維持。累積・negative.expected・実受領HEAD/再開先・再利用履歴の記録追従のみ可。

現在の適用済み累積は製品6/設営21。22は適用時に計上する。一般上限・強制停止・過去履歴・自己承認権を変更しない。同じ設営欠陥の修正と失敗保全に直接必要な保存先追従を一件として扱い、別の欠陥は混ぜない。

### 3.2 第一回答をやり直さずに続行

入力：runtime/artifacts/digest-caption-input-preparation-20261003-v001/attempt-002/bundle/。
元manifest SHA 83052a914317ae8b5a056ff641635ff061ebf59830df68a8090d180f2f0cfb75、意味入力SHA 6e16d247d36f841783d59badc4c4a3f35c8cf4739b6acae29baccc32a7d061a3。保存parametersでJSON-only readerを使い、prepare/通常4工程を再実行しない。

第一要求SHA fee145844ff2409c4a8ead59558a4d0a5879bf177387e593b2075f1944e6c567。旧attempt-001/response-0001.jsonは5,405bytes、SHA 5228394586b8aab05fe8943d3b944a368327627955421494c0083af7e4036034。新実行で同じ第一要求が提示された後、実bytes/SHAと旧responseを照合して新attempt-002へbyte同一・排他作成でコピーし、同じstdinへ返す。第一内容の再判断・再整形・旧request SHA付替えは不要/禁止。旧resultのコピーで検査を代用せず、実Skill/validatorへ通す。再開時のコピー・待機を新内容判断時間としない。

残り8要求は提示ごとにCodexが実本文を読んで回答する。元purpose・承認snapshot・準備bundle・要求schema/本文/task/style/実SHAは不変。親scope SHA 3f2982a5b55f27c29b62f83cbf2871b3339c3a8b62716fab637f533f9074767a は維持し、再開追補は別path/SHAへ記録する。

### 3.3 終点・保全

新先はruntime/artifacts/digest-caption-display-answers-20261003-v001/attempt-002/。第一の旧response/result/失敗log/record/入力一覧とd231a911固定Git版は不変保持。初回exit1・部分通過と後続成功を分ける。

対象補助の必要型検査・既存preflight→同一第一回答を実検査→SHA差替えclone一件→残8実回答→全9trace/receipt/manifest→最後に別processの内容判断なし再検査・全SHA/trace一致・元bundle/state不変まで進める。準備接続、旧11拒否/全suite/通常4工程/媒体QC/人間レビューを再実行しない。

回答は既存4field・runCaptionDisplayBoundariesV001/validateDisplayForAdoptionV001/readValidatedDisplayTracesV001を使用。WeakMap tokenは保存しない。完成物は検査済み表示候補でありsource package/renderer artifact/queue completeではない。対象はrun-display.mts、README.md、evidence.json、新runtime、自分のCURRENT_GOAL/HANDOVER更新だけ。

## 4. 人間回答・権限・容量

36論理幅/2行/既存文字幅規則は保存候補条件。144px最終style・物理幅・表示時間・見心地の合格ではない。「読む必要がある文章でなかったら」の条件付き分割を保持し、説明・否定・因果・言い直しを不要に細切れにしない。本文を変更/省略/創作せず、全3,613atomを所属要求内で一度ずつ覆い、候補6三groupを結合しない。

presentation=not-connected／executionPermission=not-approved／humanQuality=pending／outlineChoice=null、ID9-PD-01/02未承認。水色肯定、縁B21論理不合格、他色/強調・アップ・修正版7点・鬼武者Q3-2は[台帳](HUMAN_REVIEW_PENDING.md)と一次回答を維持。旧307状態/18色/82frameアップは一括移植せず、済んだレビューを再要求しない。

背景4参照、最終style/renderer束縛、後段ROOT基準読取、演出・動画許可・人間品質は残る。本番/公開・旧state移行は未承認。

本人承認の旧8コピー35.79GiB削除、33旧参照は再作成要という履歴を保持。006/007と実判断運転の正実走は別実績。実判断追加媒体4,803,412,827bytes、当時の空き12,933,283,840bytesは過去観測。現在空き・SSD未確認。

今回、第一回答の小JSON5,405bytesコピー以外に復元を広げない。製品code、新準備二path、既存Skill/validator/通常factory/index/backend/shared無変更。媒体read/hash/copy/PUT、通常HTTP、新API/provider/費用、取得/STT/inspection/ffprobe、描画/演出/動画、SSD、削除、本番/公開は0。

## 5. 起動・問い合わせ・Git

初回は本人手貼り。開始後はCodex2専用Edgeから同じZEV Build Loopへ直接送り、返信生成完了・全文読了まで受領して指定範囲を続行。本人を通常の中継役へ戻さない。今回返信の受領だけの独立commit・Codex1起動は不要。

報告：Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9の後続・保存表示要求への実回答。担当のみ通常commit/push、他者変更保持、Git操作直列化、対象process終了を確認する。候補回答の完成から演出/動画工事へ自動着工しない。

現在地：設営21・第一回答/正常受理/否定拒否と補助exit1は保存証拠で確認済み。設営22の指示は発行済み、受領・適用・attempt-002実行・全9回答完成は未確認。残存0はCodex報告であり、相談役がMacの現processを直接観測したものではない。


Codex2実行checkpoint（2026-10-03）：設営22追補を全文受領、0c24061eへ同期し比較値/新attempt-002/記録だけを適用。9実回答、全3,613atom、218表示単位/289行を既存Skill/validatorで検査・保存し、別process一回exit0で全SHA/trace bytes一致・元21入力/実装不変を確認。製品6/設営22、旧attempt-001不変。仕上げで要求9の一行末が「こんなもん／にしよう」と文節を分割していることを自ら発見。local124→125の候補案を保存したが未適用。全体完成とはせず、新attempt-003への保存先追従・同一要求の1〜8byte再利用・9だけ実判断修正・最終束再読一回を設営23の個別判断へ返す。attempt-002の技術成立/exit0とこの内容未達を区別し、全保存物を不変保持。製品変更・媒体・費用・人間品質採用は0。[report](reports/digest-caption-display-answers-20261003/README.md)/[evidence](reports/digest-caption-display-answers-20261003/evidence.json)。
