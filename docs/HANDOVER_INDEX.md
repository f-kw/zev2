# ZEV Build Loop — 引き継ぎインデックス

更新日：2026-10-03（JST） / revision：handover-index-20261003-v047
正本：f-kw/zev2 main の docs/HANDOVER_INDEX.md
固定入口：docs/ZEV_START_HERE.md。プロジェクトには固定入口の写しを置く。

**最新更新：d93e641815f4f5f17eeb857754a986af5c0b53e0を監査。設営22後の9回答・3,613atom・218表示単位/289行、実runと別process再読exit0を技術成立として保持。ただし要求9・第9表示単位の行末「こんなもん／にしよう」に一点の内容未達が残る。相談役はlocal124→125の行末訂正、旧成功候補を保持するattempt-003への設営23、同一要求の回答1〜8のbyte同一再利用を許可した。正本は[LINE_END_FIX](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001_LINE_END_FIX.md)、保存6601b6fac7594fd1e2f394cd5f1fd3f3e4f4c3bd。製品6/設営22を保持し23は適用時に計上。全体accept、設営23受領・適用・新実行・訂正完了は未確認。既存acceptと人間Pendingを戻さない。**

## 0. 最初に読む

1. プロジェクトZEV_START_HERE.mdを全文読む。
2. GitHub mainの現在HEADを取得し、その同一SHAの本書を全文読む。
3. [AGENTS](../AGENTS.md)、[監査プロトコル](CODEX_CHATGPT_AUDIT_PROTOCOL.md)、[人間確認方針](policies/HUMAN_REVIEW_ACCUMULATION_POLICY_v001.md)、[CURRENT_GOAL](CURRENT_GOAL.md)、§4の現行指示と必要な根拠を読む。
4. 役割・現在地・完了・未解決・人間回答・指示と実稼働を復元する。取得不能・保存不能・Mac上の未観測を明示する。旧添付・会話要約・メモリだけで最新としない。

優先順：最新本人指示と適用範囲→現行個別指示→対応実績と一次回答→本書→旧計画。無関係な日付だけで上書きしない。

更新前v046全文とattempt-002の技術成立・一行末未達は[d93e6418固定版](https://github.com/f-kw/zev2/blob/d93e641815f4f5f17eeb857754a986af5c0b53e0/docs/HANDOVER_INDEX.md)へ保持。v045第一回答停止はd231a911、v044準備完成はa98f569a、初回f577bfba、入力対応4556e389、実判断7bb5de02、v005までの履歴ccd907a5を辿れる。古い停止・未完了を後のacceptへ逆流させず、全過去工事を再走査・再実行しない。

## 1. 役割・目的・運用

ZEVは素材と制作意図から内容・構成・字幕・必要な演出を備えた、見ていて気持ちいい動画を作る基盤。主線はDigest、Shortは別系統。一本の生成成功や試験合格だけで製品完成としない。

- kawafmm：製品方向、任せる範囲、目視・好み、費用・契約・公開等の専決判断。通常技術監査・中継を担わせない。
- 相談役：残課題・優先順位・作業範囲・現物監査・具体指示と正本保存。
- Codex：指定範囲の実装・実行・検証・保存・通常commit/push・直接報告。人間品質を代理採用しない。

本人の「終わったら次に進んで」に従い、監査と同じ主線の具体的許可範囲を同じ返答へつなぐ。任意の別エピック、本番、公開、費用、一般権限拡張へ広げない。

軽微技術修正の相談役委任はAGENTSの個別条件内。一般上限・累積・強制停止・Codex自己承認権は変更しない。v005製品5/設営15、実判断補助16/親directory17、入力対応18、準備補助19/保存先20、製品目的参照修正6、表示補助21/比較値修正22を保持。現適用済み製品6/設営22。新規二path初回実装は修正履歴と別。今回内容訂正を製品修正7とせず、新先と記録追従を設営23として適用時に計上する。

人間確認は[既存台帳](HUMAN_REVIEW_PENDING.md)へ蓄積し、未回答を採用にせず独立作業を進める。15分初見レビュー・既回答・全字幕採点を繰り返させない。

## 2. 完了済み・受理範囲

| 項目 | 根拠・成立範囲 | 戻してはいけないこと |
|---|---|---|
| 初稿と15分レビュー | 9/26初稿15:31.633、9/28レビュー、9/29字幕局所回答 | 新素材で初めて一本・初見レビュー再実施へ戻さない |
| 9.構成改善v001 | b69e168c受理、11候補/7採用/9保持、接続前15:23.033、局所540p5本/147字幕/111試験、終了68a32038 | 人間品質・新案1080p・汎化と別。白紙再選定を目的にしない |
| Codex1独立点検 | 9b72bc0f、対象bd0113c8、送信b93870fc。心霊回帰理由は後で補足 | 補足後版・局所媒体を独立点検済みにしない。再起動不要 |
| 通常準備v002/後段v003/設計v004 | 11809f6f、7b600a64、d77f2a5dの限定受理 | 旧fixture合格を現行実走へ流用しない |
| **v005通常キュー接続** | **7c8f34ce、親v005 §13 accept、受理df9fce02、共通状態a64465cb** | 技術完了。追加拒否/転送/型検査を増やさず、固定回答を実判断/本番品質にしない |
| **実判断付き計画一件** | **7bb5de02 accept、12候補/7採用/9保持、4工程complete、27,691frame/40,705,770sample、再読exit0** | 既見素材一件。映像音声・STT誤り・汎化・人間品質と別 |
| **字幕演出入口の入力対応** | **4556e389 accept、9区間/3,613断片/18項目、静的対応/不足/再利用条件** | presentation consumer受理・新字幕/動画の完成ではない |
| **字幕判断入力の準備接続** | **a98f569a accept、新二path、3,613atom/9要求/manifest、658断片比較、11拒否、別process再構築exit0** | 準備は完了。実回答・描画・動画・人間採用は別 |
| 保存9表示要求の候補 | d93e6418で技術検査/再読exit0、218単位/289行。行末一箇所訂正待ち | 技術成立を取り消さず、全体acceptや見心地合格にもしない |
| 旧9:47案1080p/低メモリ | d7e46592、265字幕/307状態、345点QC、本体/replay/保存再読 | 新15:23案全編や通常アプリからの動画生成完成と別 |
| 字幕・演出・一件後修正 | 7A/7B/13、Panel/motion、Normal/Reset、性能第一期等 | renderer/低メモリ/一件後修正を再実装しない |
| Decisions/Jev | 830ea968、9/30調査/36判断点/J16準備、実推論0 | 当時の未確認と現在の公開状況は別。主線停止理由にしない |

v005各suiteと正実走は別実績。E2E件数として合算せず、upload006親exit未返却を別process exit0へ付け替えない。

## 3. 現在の具体指示 — 一行末訂正と新候補束

親：[保存表示要求への実回答](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001.md)
再開：[LINE_END_FIX](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001_LINE_END_FIX.md)、保存6601b6fac7594fd1e2f394cd5f1fd3f3e4f4c3bd。

### 3.1 監査で確認した事実

d93e6418のreport/evidence/run-displayと差分を照合。設営22の比較修正とattempt-002への移動後、全9回答を既存Skill/validatorへ渡し、run/readbackはexit0。全3,613atom、218表示単位/289行、SHA差替え拒否、元21小入力/既存実装不変。第一回答は5,405bytesをbyte同一再利用し、残8件は今回実判断。旧attempt-001のexit1は別履歴。

仕上げで要求9第9表示単位の「まあマリンはこんなもん／にしようかなと思います?」が文節を割る一点を発見。修正案は「まあマリンはこんなもんに／しようかなと思います?」。旧候補は不変保持し、全体acceptは訂正と再読まで保留する。これは保存コード・実測証拠の監査であり、相談役のMac直接再実行ではない。

### 3.2 内容訂正・設営23・再利用

回答9のanswer.captions[0].cues[8].lineEndBoundaryIds[0]だけをlocal124→125（boundary-003513→003514）へ変更する。完全IDは実要求から取得。cue終端local136、本文、所属/順序、16単位/17行は不変、幅22/23→24/21。schema/requestFileSha256/judgmentNote/他cue・行末は維持し、理由はreportへ別記する。

run-display.mtsのOUTだけを同PARENTのattempt-003へ変更。累積・受領HEAD・再利用/訂正履歴のみ追従し、reader/validator/例外/期待値/判定機能を変更しない。製品6を維持し、適用時に設営23を計上。

各要求1〜8が提示された後、実要求bytes/SHA、旧response実size/SHAとrequestFileSha256を照合し、新先へbyte同一・排他作成でコピー、既存stdinへ返す。再判断・再整形・未来回答先送りはしない。要求9だけ提示後に一行末修正を新保存。全件のresult/token/trace/receiptは実Skill/validatorから新たに作り、旧合格印で代用しない。

### 3.3 固定入力と保存先

入力bundle：runtime/artifacts/digest-caption-input-preparation-20261003-v001/attempt-002/bundle/
manifest SHA：83052a914317ae8b5a056ff641635ff061ebf59830df68a8090d180f2f0cfb75
意味入力SHA：6e16d247d36f841783d59badc4c4a3f35c8cf4739b6acae29baccc32a7d061a3
元state SHA：c62e3b38d00c8222f0918b52704e579f87a14346217fada6c9cd754fc6fccf3c

元計画draft_eCg3g-IMIzEWMtJuMyJWB、prepare agent_xKOu8eZKSNa5viNENtJ4L、validate agent_wGiuVx5QiJvjGUxEW8Qxa。plan SHA cd69dd7fccfab6b4d0f266e6dddf56d5eae4c670283cd7caf467b9fde2925ee3、execution SHA 735d6763afe6fcfabeb4c103871ee3a65368b96c9fa9df1a01f37717ace08f37。

旧候補root：runtime/artifacts/digest-caption-display-answers-20261003-v001/attempt-002/
旧manifest SHA：996f506dedbd1c7fc512de9ff0f8ad5bd057d101410d842d54ac418f2c22816a
要求9 SHA：51931ef75ed33d81f7845924b4b9d07258849f1746146ee2b89b5897659b3943
旧response9 SHA：7debdc87ea057f3ce36b4bcb4c81af9a7cbec0c271ec68809413dc1e1e0e7e7f
新先：同parent/attempt-003/。不存在確認・新規/排他作成。旧候補や初回失敗への上書き/削除はしない。

### 3.4 終点・scope・保全

対象型検査と既存preflight後、新候補一系列→9既存検査→新trace/receipt/manifest→別process再読一回。1〜8の回答bytes同一、9の一field差分、全文/所属/被覆/順序/行数/幅、元21入力/実装/旧候補不変を確認。既存helperのSHA差替えclone一件は維持し、旧11拒否等のsuiteや通常4工程・動画QC・人間レビューは再実行しない。

旧attempt-001のexit1、attempt-002の技術exit0と一箇所未達、今回訂正と新再読を別記する。旧manifest/全回答/trace/receipt/readback/log/content-checkpoint、d231a911/d93e6418固定版を不変保持。再利用待機/コピー/再検査を新内容判断時間へ合算しない。

親回答正本SHA 3f2982a5b55f27c29b62f83cbf2871b3339c3a8b62716fab637f533f9074767a、元scope/purpose/承認/準備/要求は不変。本追補は別path/SHAで記録。旧helper SHAの束縛を付け替えず、新manifestは新実装SHAを記す。

担当はrun-display.mts、README.md、evidence.json、新runtime、自分のCURRENT_GOAL/HANDOVER状態のみ。完成物はvalidated-display-for-review候補で、sourcePackage/renderer/queue completeではない。候補訂正と保存再読が成立したら最終監査へ提出する。

## 4. 今回読む根拠

| 資料 | 用途 |
|---|---|
| [LINE_END_FIX](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001_LINE_END_FIX.md) | 設営23、唯一の一行末差分、同一1〜8再利用、新先、保全・再読 |
| [親実回答指示](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001.md)、[設営22](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001_NEGATIVE_MESSAGE_FIX.md) | 9回答scope、既存実経路、旧失敗・初回再利用。SHA束縛済みなので編集しない |
| [今回report](reports/digest-caption-display-answers-20261003/README.md)、[evidence](reports/digest-caption-display-answers-20261003/evidence.json)、[補助](reports/digest-caption-display-answers-20261003/run-display.mts) | d93e6418技術成立、contentIssue、旧manifest/回答SHA、未適用案 |
| [準備report](reports/digest-caption-input-preparation-20261003/README.md)、[evidence](reports/digest-caption-input-preparation-20261003/evidence.json) | a98f569a完了、元manifest/各要求SHA、失敗履歴 |
| [入力対応](reports/digest-presentation-input-mapping-20261002/README.md)、[実判断](reports/request-intent-real-judgment-20261002/README.md)、[v005 §13](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md) | 供給元/不足/再利用条件、通常保存計画、既存accept |
| [構成改善](reports/selection-structure-improvement-20260930/README.md)、[独立点検](reports/selection-structure-improvement-20260930/independent-review.md) | 15:23案・補足・局所検証の対象版 |
| [9/28レビュー](reports/new-material-digest-human-review-20260928/README.md)、[9/29回答](reports/caption-readability-splitting-20260928/human-feedback-20260929-v001.md) | 制作要求、144px/条件付き分割/縁未選択 |
| [人間台帳](HUMAN_REVIEW_PENDING.md)、[開発計画](../相談役/方針/ZEV_開発計画.md) | 未回答・別エピック |

## 5. 人間回答・残課題

144pxと「読む必要がある文章でなかったら」の条件付き分割、水色・カラフル方向肯定は保持。説明/否定/因果/言い直しを不要に細切れにしない。36論理幅/2行は候補条件で、最終物理幅・表示時間・見心地の合格ではない。

縁A=8/4は技術入力、outlineChoice=null。B=8/12は21論理不合格で実alphaによる保証免除なし。強調範囲変更B未肯定、LightCoral技術不合格と好みは別。固定アップ1.2倍82frameのHUD/人間品質/自動選択は未解決。

旧10回答受領済み、R1〜R3修正版7点・鬼武者Q3-2は未回答。一件後修正/Resetは既存能力、一般本人反映入口・操作負担は別。別素材一般化は後続、Shortは今開始しない。性能第一期完了。

旧7B選択2,483断片のうち共通2,435、旧末尾48は除外、今回1,178は旧7Bにない。旧7A共通2,330は本文/元ms/発話ID一致だが発話artifact bytesは別。旧307状態/18色/82frameアップは一括移植しない。同一1〜8再利用を無関係な旧回答流用へ広げない。

presentation=not-connected／executionPermission=not-approved／humanQuality=pending／outlineChoice=null、ID9-PD-01/02未承認。背景4参照、最終style/renderer、ROOT基準後段読取、演出/動画許可・人間品質、旧state移行・本番・公開は別。新レビューを今回の開始条件にしない。

## 6. 容量と旧証拠

本人承認整理04c21bfd/78805d86：8コピー35.79GiB削除、33旧参照は再作成まで旧runtime即時再読不可。元素材/STT/inspection/完成媒体/判断/証拠/旧stateは保持。

upload006の3実体、MP4007の1実体、実判断運転の1実体4,803,412,827bytesは保持。終了時空き12,933,283,840bytesは過去観測、現在空き・SSDは未確認。今回同一回答1〜8の小JSONコピー以外に復元を広げない。媒体read/hash/copy/PUT、通常HTTP、新API/provider/費用、取得/STT/inspection/ffprobe、描画/演出/動画、新queue/UI、SSD、削除、本番/公開は0。

## 7. 受け渡し・実稼働・Git

初回は本人手貼り。開始後はCodex2専用Edgeから同じZEV Build Loopへ直接送り、返信生成完了・全文読了まで受領して指定範囲を続行。実UI/通信障害以外は返信生成中を終了理由にしない。自分専用タブのみ使用し、tab IDは恒久固定しない。

既存報告先：https://chatgpt.com/g/g-p-6a8aab6b92308191b44f77a03945fed4-zevxiang-tan-yi/c/6abbcacc-8c98-83ee-9276-248a1d29b047
新セッションでは実際の報告先を照合する。

main、担当のみ明示stage、Git操作直列化。他者変更をreset/stash/削除/stageせず、branch/worktree/force pushを自己判断で作らない。Codex1起動・受理だけの独立commit・本人中継は不要。

旧未調整案停止を保持し当時の貼付を承認へ遡及変換しない。d93e6418の設営22・全9技術検査/再読exit0・内容一点未達・残存0はCodex報告と保存証拠。設営23指示は発行済み、受領・適用・新実行・訂正完了は未確認。Macの現在processを相談役が直接観測したものではない。

方針・指示・完了・中断は同じターンで正本保存。自動監視/非同期作業を装わない。新しい実質問題がなければ今回の訂正から全9候補の保存再検査・通常push・直接報告まで進め、演出/動画製造へは自動着工しない。


Codex2中断checkpoint（2026-10-03）：LINE_END_FIXを0140357bで全文受領し設営23適用、型/preflight exit0。attempt-003の第一要求を同一性確認して再利用し、既存Skill/validatorとSHA拒否を通過、新result/trace/receiptまで保存。その後、一時の履歴追従コマンドがreport JSON末尾へ改行でなくliteral backslash+nを付け、既存readerがSyntaxErrorで拒否、process exit1。製品欠陥ではなくCodex2の記録整形ミス。壊れた実bytes/log/失敗recordを同attemptへ保存し、reportだけ既知の余剰末尾を除いて有効JSONへ戻し失敗履歴を追加。旧attempt-001/002・元21入力/実装は不変。回答2〜9・一行末修正・新manifest/再読は未実施。製品6/設営23を維持し、新attempt-004へのOUT/履歴追従と一時記録をjson.dumpで保存する最小案を設営24の個別判断へ返す。未適用・未再実行、自己承認なし。媒体/API/描画/費用0。行末の既承認一field修正と候補回答の完成は保留。[report](reports/digest-caption-display-answers-20261003/README.md)/[evidence](reports/digest-caption-display-answers-20261003/evidence.json)。
