# CURRENT_GOAL — 現在の目的と復元入口

更新日：2026-10-03（JST）

## 1. 復元

プロジェクトZEV_START_HERE.mdを全文読み、GitHub mainの現在HEADと同一SHAのHANDOVER_INDEX、現行指示を読む。保存・発行・受領・実行・技術受理・人間採用を区別する。

更新前v046相当の全文、設営22の指示とattempt-002の技術成立・行末一点未修正は[d93e6418固定版](https://github.com/f-kw/zev2/blob/d93e641815f4f5f17eeb857754a986af5c0b53e0/docs/CURRENT_GOAL.md)へ保持。d231a911初回表示停止、a98f569a準備完成、f577bfba初回準備停止、4556e389入力対応、7bb5de02実判断、ccd907a5までのv005履歴を辿れる。過去の停止や次試験を後のacceptへ逆流させない。

## 2. 完了・監査受理

- v005通常キュー接続は技術完了。7c8f34ceに対する[親v005 §13](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md)のacceptを維持し、再検証工事へ戻さない。
- 実判断付きDigest計画一件は7bb5de02でaccept。12候補/7採用/9保持、keep3,613/drop3,460、通常4工程succeeded、27,691frame/40,705,770sample、別process再読exit0。15:23案の区間・順序・時計を維持し、心霊回帰を比較へ追加。映像音声・STT誤り・汎化・人間品質とは別。
- 字幕演出入口の入力対応は4556e389でaccept。9区間/3,613断片/18項目、供給元/不足/旧再利用条件の静的対応まで。
- 字幕判断入力の準備接続はa98f569aでaccept。判定は[表示実回答指示§1](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001.md)、保存b14ef8f51ed040556d4f43e45a322a5affda1e91。新二path→既存入力validator→3,613atom/9要求保存、旧正常658断片比較、11拒否、別process再構築、旧54件不変。manifest SHA 83052a914317ae8b5a056ff641635ff061ebf59830df68a8090d180f2f0cfb75、11file/2,591,297bytes。

15分初稿レビュー、構成改善v001の局所検証、一件後修正/Reset、旧9:47案1080p低メモリ製造も既存完了範囲を維持する。以上はGitHubのコード・記録監査であり、Macのignored runtimeや媒体を相談役が直接再実行したものではない。

## 3. 現在の一件 — 表示回答の行末一点訂正

**d93e6418のattempt-002は9回答・3,613atom・218表示単位/289行の実検査と別process再読がexit0。仕上げで要求9の第9表示単位に文節を割る一行末が残ったため、候補全体の最終acceptは保留。相談役はその行末訂正と、旧成功候補を守る新attemptへの設営23を承認した。**

親：[保存9表示要求への実回答](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001.md)
再開正本：[LINE_END_FIX](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001_LINE_END_FIX.md)、指示保存6601b6fac7594fd1e2f394cd5f1fd3f3e4f4c3bd。

kawafmm承認済みの表示境界実回答と軽微技術判断委任の範囲。本人への視聴・採点・再確認・転記は不要。製品不具合修正・一般本適用・動画許可ではない。

### 3.1 訂正内容

要求9の第9表示単位で、行末local124→125（boundary-003513→003514）だけを変更する。

旧：まあマリンはこんなもん／にしようかなと思います?
新：まあマリンはこんなもんに／しようかなと思います?

実要求から完全なIDを取り、answer.captions[0].cues[8].lineEndBoundaryIds[0]の一field差分を確認する。cue終端local136、全文、所属/順序、16表示単位/17行は維持。幅22/23→24/21で既存36以内。判断理由はreport/evidenceに別記し、元responseの他fieldは変更しない。

要求9 SHA：51931ef75ed33d81f7845924b4b9d07258849f1746146ee2b89b5897659b3943。
旧response9 SHA：7debdc87ea057f3ce36b4bcb4c81af9a7cbec0c271ec68809413dc1e1e0e7e7f。

### 3.2 設営23と再利用

run-display.mtsのOUTだけを同PARENTのattempt-003へ変更し、累積・受領HEAD・再利用/訂正記録を追従する。判定機能・stdin手順・reader・validator・例外処理・親scopeは無変更。現在製品6/設営22、適用時に設営23を計上。内容訂正を製品修正7とはせず、一般上限・強制停止・履歴を変更しない。

新先：runtime/artifacts/digest-caption-display-answers-20261003-v001/attempt-003/。
旧attempt-002 manifest SHA：996f506dedbd1c7fc512de9ff0f8ad5bd057d101410d842d54ac418f2c22816a。

各要求1〜8が提示された後、要求実bytes/SHAと旧responseのsize/SHA/requestFileSha256を照合し、新先へbyte同一・排他作成でコピーして既存stdinへ返す。再判断・再整形・旧SHA付替え・未来回答先送信はしない。要求9だけ提示後に上記行末を訂正した新回答を作る。全9件のresult/token/trace/receiptは実Skill/validatorで再生成し、旧合格印で代用しない。

### 3.3 完了条件と証拠保全

必要型検査/preflight→同一1〜8再利用・9訂正→既存9件検査・新束保存→変更後の別process再読一回→担当のみcommit/push・直接報告まで進める。今回の一field差分、全被覆/順序/行数/幅、元21入力/製品実装/旧候補不変を確認する。既存helper内SHA差替えclone一件は維持し、新しい否定suiteは増やさない。

旧attempt-001のexit1・全失敗記録、attempt-002の全回答/trace/manifest/readback/log/content-checkpointとrun/readback exit0、d231a911/d93e6418固定Git版を不変保持する。技術成立と内容一点未達を分け、旧成功を失敗にも全体完成にも書き換えない。修正後の新実観測へ旧成功再読を付け替えない。

入力bundleはruntime/artifacts/digest-caption-input-preparation-20261003-v001/attempt-002/bundle/、manifest SHA 83052a914317ae8b5a056ff641635ff061ebf59830df68a8090d180f2f0cfb75。元purpose/承認/要求本文/ID/task/style/各SHA、親scope SHA 3f2982a5b55f27c29b62f83cbf2871b3339c3a8b62716fab637f533f9074767a は不変。再開追補は別path/SHAへ記録する。

新再利用待機・コピー・再検査と一行末訂正時間を分離し、初回第一判断時間の未測定を埋めない。既に判断した内容を白紙から再選定せず、準備・v005・通常4工程・旧suite/QC・人間レビューも再実行しない。

## 4. 人間回答・権限・容量

36論理幅/2行は候補条件であり144px最終style・物理幅・表示時間・見心地の合格ではない。「読む必要がある文章でなかったら」の条件付き分割を保持。全文3,613atom、候補6非連続3group、keep/dropは不変。

presentation=not-connected／executionPermission=not-approved／humanQuality=pending／outlineChoice=null、ID9-PD-01/02未承認。水色肯定、縁B21論理不合格、他色/強調・アップ・修正版7点・鬼武者Q3-2は[台帳](HUMAN_REVIEW_PENDING.md)と一次回答を維持。旧307状態/18色/82frameアップは一括移植しない。

背景4参照、最終style/renderer束縛、ROOT基準後段読取、演出・動画許可・人間品質、本番/公開・旧state移行は別の未解決/未承認事項。

旧8コピー35.79GiB削除と33旧参照の再作成要を保持。006/007と実判断の正実走は別実績。実判断終了時空き12,933,283,840bytesは過去観測で、現在空き・SSDは未確認。今回許可するコピーは同一回答1〜8の小JSONのみ。媒体read/hash/copy/PUT、通常HTTP、新API/provider/費用、取得/STT/inspection/ffprobe、演出/描画/動画、新queue/UI、SSD、削除、本番/公開は0。

## 5. 起動・問い合わせ・Git

初回は本人手貼り。開始後はCodex2専用Edgeから同じZEV Build Loopへ直接送り、返信生成完了・全文読了まで受領する。本人を通常の中継役へ戻さず、受理だけの独立commit・Codex1起動は不要。

報告：Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9の後続・保存表示要求への実回答。
担当のみ通常commit/push、他者変更保持、Git操作直列化、対象process終了を確認する。今回の候補訂正完了から演出/動画工事へ自動着工しない。

現在地：設営22適用・attempt-002技術成立と一行末未修正を監査済み。LINE_END_FIX発行済み。設営23の受領・適用・attempt-003実行・訂正完了は未確認。残存0はCodex報告であり、Macの現processを相談役が直接観測したものではない。


Codex2中断checkpoint（2026-10-03）：LINE_END_FIXを0140357bで全文受領し設営23適用、型/preflight exit0。attempt-003の第一要求を同一性確認して再利用し、既存Skill/validatorとSHA拒否を通過、新result/trace/receiptまで保存。その後、一時の履歴追従コマンドがreport JSON末尾へ改行でなくliteral backslash+nを付け、既存readerがSyntaxErrorで拒否、process exit1。製品欠陥ではなくCodex2の記録整形ミス。壊れた実bytes/log/失敗recordを同attemptへ保存し、reportだけ既知の余剰末尾を除いて有効JSONへ戻し失敗履歴を追加。旧attempt-001/002・元21入力/実装は不変。回答2〜9・一行末修正・新manifest/再読は未実施。製品6/設営23を維持し、新attempt-004へのOUT/履歴追従と一時記録をjson.dumpで保存する最小案を設営24の個別判断へ返す。未適用・未再実行、自己承認なし。媒体/API/描画/費用0。行末の既承認一field修正と候補回答の完成は保留。[report](reports/digest-caption-display-answers-20261003/README.md)/[evidence](reports/digest-caption-display-answers-20261003/evidence.json)。
