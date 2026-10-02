# CURRENT_GOAL — 現在の目的と復元入口

更新日：2026-10-03（JST）

## 1. 復元と旧履歴

プロジェクトZEV_START_HERE.mdを全文読み、GitHub mainの現在HEADと同一SHAのHANDOVER_INDEX、現行指示を読む。保存・発行・受領・実行・技術受理・人間採用を区別する。

更新前全文、LINE_END_FIX/設営23、attempt-003の停止は[01b25053固定版](https://github.com/f-kw/zev2/blob/01b25053bce09484ecd3d6e1e0cf93ab1f36baac/docs/CURRENT_GOAL.md)へ保持。d93e6418のattempt-002技術成立/一行末未達、d231a911の初回表示停止、a98f569a準備完成、f577bfba初回準備停止、4556e389入力対応、7bb5de02実判断、ccd907a5までのv005履歴を辿れる。過去の未完了・次試験を後のacceptへ逆流させない。

## 2. 完了・監査受理

- **v005通常キュー接続は技術完了。** 7c8f34ce、[親v005 §13](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md)accept。追加の拒否・転送検証へ戻さない。
- **実判断付きDigest計画一件は7bb5de02でaccept。** 12候補/7採用/9保持、keep3,613/drop3,460、通常4工程succeeded、27,691frame/40,705,770sample、別process再読exit0。15:23案の区間/順序/時計を維持し心霊回帰を比較へ追加。未見素材汎化・人間品質とは別。
- **字幕演出入口の入力対応は4556e389でaccept。** 9区間/3,613断片/18項目、供給元/不足/再利用条件の静的対応まで。
- **字幕判断入力準備はa98f569aでaccept。** 新二path→既存入力validator→3,613atom/9要求、658断片比較、11拒否、別process再構築、旧54件不変。manifest SHA 83052a914317ae8b5a056ff641635ff061ebf59830df68a8090d180f2f0cfb75。判定は[表示実回答指示§1](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001.md)。

15分初稿レビュー、構成改善v001の局所検証、一件後修正/Reset、旧9:47案1080p低メモリ製造も既存完了範囲を保持する。これらは保存コード・記録に基づく相談役監査であり、Macの全runtimeを相談役が再実行したものではない。

## 3. 現在の一件 — 保存9表示回答の候補完成・最終監査へ

**Codex2は61dd76d9のREUSE_JSON_FIXと確定返信全文を受領し設営24適用。attempt-004の全9件実検査/保存と別process一回の再読はexit0。回答1〜8は提示された要求との同一性照合後にbytes同一再利用、回答9は承認済み一fieldだけ訂正した。全3,613断片/218表示単位/289行・元21入力/実装・旧3試行不変を確認。製品6/設営24、対象process残存0。候補完成として最終監査へ提出し、人間品質はpending。**

再開正本：[REUSE_JSON_FIX](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001_REUSE_JSON_FIX.md)、保存90c3d3464d63cde16b199a79db9fed2b33f7627b。
親：[保存9表示要求への実回答](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001.md)。
内容訂正：[LINE_END_FIX](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001_LINE_END_FIX.md)。

### 3.1 今回許可する差分

run-display.mtsのOUTだけを同PARENT/attempt-004へ変更し、累積/実受領HEAD/保存先/時刻/再利用/失敗履歴の記録を追従する。判定機能、stdin、reader/validator、raw拒否期待値、入力、schema、親scopeは無変更。

一時履歴コマンドはjson.dumpでUTF-8 fileへ直接保存し、escaped末尾を連結しない。保存・close後にjson.load/json.loadsで再読し更新objectと一致した場合だけstdinへ返す。helperの当該入力待ち中に書込みと照合を完了し、stdin送信後に同じreportを並行更新しない。汎用fallback/JSON自動修復/例外無視/新試験基盤は作らない。

適用済みは製品6/設営24。記録整形修正と失敗保全用新先を設営24の個別一件として適用・計上した。設営21/22/23、製品修正6、新二path初実装を区別し、一般上限・強制停止・過去履歴をリセットしない。

### 3.2 既承認の内容訂正・回答再利用

再利用元は有効manifestを持つattempt-002。manifest SHA 996f506dedbd1c7fc512de9ff0f8ad5bd057d101410d842d54ac418f2c22816a。

各要求1〜8提示後に要求bytes/SHA、旧responseのsize/SHA/requestFileSha256を照合して新先へbyte同一・排他作成でコピー。内容再判断・再整形・未来回答先送り・SHA付替えなし。同一性不成立なら流用しない。全result/token/trace/receiptは実Skill/validatorから作り、旧resultや合格印で代替しない。

要求9提示後、answer.captions[0].cues[8].lineEndBoundaryIds[0]だけlocal124→125（boundary-003513→003514、完全IDは実要求から取得）へ訂正する。
旧：まあマリンはこんなもん／にしようかなと思います?
新：まあマリンはこんなもんに／しようかなと思います?
cue終端local136、本文/疑問符/所属/順序、16表示単位/17行、他fieldは不変。幅22/23→24/21。理由は別記する。
要求9 SHA 51931ef75ed33d81f7845924b4b9d07258849f1746146ee2b89b5897659b3943、旧response9 SHA 7debdc87ea057f3ce36b4bcb4c81af9a7cbec0c271ec68809413dc1e1e0e7e7f。

### 3.3 保存・保全・終点

新先：runtime/artifacts/digest-caption-display-answers-20261003-v001/attempt-004/。
元入力：runtime/artifacts/digest-caption-input-preparation-20261003-v001/attempt-002/bundle/。元manifestは§2のSHA、元purpose/承認/要求/準備scopeは不変。親scope実SHA 3f2982a5b55f27c29b62f83cbf2871b3339c3a8b62716fab637f533f9074767a とLINE_END_FIXは編集せず、本追補を別path/SHAへ記録する。

破損report実体44,729bytes/SHA c4cafc67cee696b3ad274c4c4734aabd5cb5119ac14bb07e79fc5e179a11189fは旧attempt-003/evidence-format-failure.txtに保持。reportだけ既知余剰末尾除去・失敗記録保存済み。旧attempt-001/002/003の失敗・成功候補・部分成果・log/manifest/readbackを変更しない。

必要型検査/既存preflight→1〜8同一再利用/9一field訂正→全9既存検査・新保存束→内容判断なしの別process再読一回→担当のみ通常commit/push・直接報告まで進める。元21入力/実装/旧候補不変、全3,613atom被覆/順序/所属・218表示単位/289行・既存幅条件を確認する。数値は今回の照合値。既存SHA差替えclone一件を維持し、新しいsuiteを増やさない。

attempt-001 exit1、attempt-002技術run/readback exit0＋一行末未達、attempt-003記録整形exit1、新attempt-004の観測は分離する。旧成功再読を新束へ付け替えない。再利用待機/コピー/記録整形/検査と内容訂正時間を分ける。準備接続/v005/通常4工程/旧suite/QC/人間レビューを再実行しない。

## 4. 人間回答・権限・容量

36論理幅/2行は候補条件で144px最終style・物理幅・表示時間・見心地の合格ではない。「読む必要がある文章でなかったら」の条件付き分割、候補6の三非連続groupを維持する。

presentation=not-connected／executionPermission=not-approved／humanQuality=pending／outlineChoice=null、ID9-PD-01/02未承認。水色肯定、縁B21論理不合格、他色/強調/アップ・修正版7点・鬼武者Q3-2は[台帳](HUMAN_REVIEW_PENDING.md)と一次回答に保持。旧307状態/18色/82frameアップを一括移植しない。

背景4参照、最終style/renderer束縛、ROOT基準後段読取、演出・動画許可・人間品質・本番/公開・旧state移行は別。旧8コピー35.79GiB削除・33参照再作成要の履歴も維持。実判断終了時空き12,933,283,840bytesは過去観測で、現在空き/SSDは未確認。

今回許可のコピーは同一回答の小JSONだけ。製品code、媒体read/hash/copy/PUT、通常HTTP、新API/provider/費用、取得/STT/inspection/ffprobe、演出/描画/動画、SSD、削除、本番/公開は変更・実行しない。

## 5. 起動・問い合わせ・Git

初回は本人手貼り。開始後はCodex2専用Edgeで同じZEV Build Loopへ直接問い合わせ、返信生成完了・全文読了まで受領して指定範囲で続行する。本人への再手貼り/転記/視聴/採点、Codex1起動、受理だけの独立commitは不要。

main・担当のみ明示stage、他者変更保全、Git操作直列化、Git状態と対象process終了を確認する。報告名：Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9の後続・保存表示要求への実回答。今回完成から演出/動画へ自動着工しない。

01b25053の設営23適用・第一部分成立・記録整形exit1・残存0はCodex報告と保存証拠として確認。相談役はMacの現processや破損runtimeを直接観測していない。設営24を全文受領・適用し、attempt-004の行末一点訂正/9件検査/保存/別process再読まで確認した。


Codex2 checkpoint（2026-10-03 JST）：61dd76d9のREUSE_JSON_FIXと専用Edgeの生成完了返信を全文受領。製品6を維持し、設営24として補助の新先attempt-004・累積・受領HEADを適用。一時履歴は標準JSON保存後に再読一致を確認してからstdinへ返す。旧attempt-001/002/003と破損実体は保持。新実行と行末一点訂正はこれから確認する。


Codex2最終checkpoint（2026-10-03 JST）：最終manifest SHA bbf4536aaae9941a3142630b74a74db5638c570a731b33c03360770a32b6bc88。型/preflight/run/readback exit0、旧attempt-001/002/003の56fileと元21入力/実装不変。新束42file/2,923,632bytes、回答JSONコピー70,705bytes、媒体0。主process98,423.34ms/検査保存17.71ms/別process388.12ms。第一回答判断と記録整形の独立時間は未計測。製品6/設営24、process0。担当5fileのcommit/pushと専用Edge直接報告へ進む。[最終report](reports/digest-caption-display-answers-20261003/README.md)。背景/最終style/後段/演出/動画/品質は別の残件。
