# ZEV Build Loop — 引き継ぎインデックス

更新日：2026-10-03（JST） / revision：handover-index-20261003-v048
正本：f-kw/zev2 main の docs/HANDOVER_INDEX.md
固定入口：docs/ZEV_START_HERE.md。プロジェクトには固定入口の写しを置く。

**最新更新：01b25053bce09484ecd3d6e1e0cf93ab1f36baacを監査。設営23後のattempt-003は第一回答の再利用・Skill/validator・SHA拒否・result/trace/receipt保存まで成立。その後、一時履歴コマンドの余剰末尾二文字でreport JSON読取がSyntaxError、exit1。相談役は一時記録をjson.dump→保存再読一致に直し、旧証拠保全用attempt-004へ移す一件を設営24として個別承認した。正本は[REUSE_JSON_FIX](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001_REUSE_JSON_FIX.md)、保存90c3d3464d63cde16b199a79db9fed2b33f7627b。再利用元はattempt-002、1〜8同一回答/9一行末訂正の既承認範囲は不変。製品6/設営23が適用済み、24は適用時に計上。新指示受領・新実行・行末訂正完了・全体acceptは未確認。**

## 0. 最初に読む

1. プロジェクトZEV_START_HERE.mdを全文読む。
2. GitHub mainの現在HEADを取得し、同一SHAの本書を全文読む。
3. [AGENTS](../AGENTS.md)、[監査プロトコル](CODEX_CHATGPT_AUDIT_PROTOCOL.md)、[人間確認方針](policies/HUMAN_REVIEW_ACCUMULATION_POLICY_v001.md)、[CURRENT_GOAL](CURRENT_GOAL.md)、§4の現行指示と必要な根拠を読む。
4. 役割・現在地・完了・残件・人間回答・指示と稼働を復元する。取得/保存不能とMac上の未観測を明示する。会話要約や旧添付だけで最新としない。

優先順は、最新本人指示と適用範囲→現行個別指示→対応実績と一次回答→本書→旧計画。

更新前v047の全文とattempt-003停止は[01b25053固定版](https://github.com/f-kw/zev2/blob/01b25053bce09484ecd3d6e1e0cf93ab1f36baac/docs/HANDOVER_INDEX.md)へ保持。attempt-002技術成立/行末未達はd93e6418、第一回答停止はd231a911、準備完成a98f569a、初回f577bfba、入力対応4556e389、実判断7bb5de02、v005までの履歴ccd907a5から辿る。古い停止・次試験を後のacceptへ逆流させず、過去工事を再走査・再実行しない。

## 1. 役割・目的・運用

ZEVは素材と制作意図から内容・構成・字幕・必要な演出を備えた、見ていて気持ちいい動画を作る基盤。Digestが主線、Shortは別系統。一本の生成成功や試験合格だけで製品完成にしない。

kawafmmは製品方向・任せる範囲・目視/好み・費用/契約/公開等の専決判断。相談役は残課題/優先順位/範囲/現物監査/具体指示/正本保存。Codexは指定内の実装/検証/保存/commit/push/直接報告を担当し、人間品質を代理採用しない。

「終わったら次に進んで」に従い、監査と同じ主線の具体的範囲を同じ返答につなぐ。任意の別エピック・本番・公開・費用・一般権限拡張へ広げない。

軽微修正の相談役委任はAGENTSの個別条件内。一般上限・強制停止・Codex自己承認権を変えない。v005製品5/設営15、実判断補助16/親directory17、入力対応18、準備補助19/保存先20と製品修正6、表示補助21/比較22/行末用新先23を保持。今回一時記録整形/保存先追従は設営24で、製品6を増やさない。新二path初実装は修正履歴と別。

人間確認は[台帳](HUMAN_REVIEW_PENDING.md)へ蓄積する。未回答を採用にせず独立作業は進め、15分初見レビュー・既回答・全字幕採点を繰り返させない。

## 2. 完了済み・受理範囲

| 項目 | 根拠と範囲 | 戻してはいけないこと |
|---|---|---|
| 初稿・15分レビュー | 9/26初稿15:31.633、9/28レビュー、9/29局所回答 | 新素材で初めて一本・初見再レビューへ戻さない |
| 9.構成改善v001 | b69e168c受理、11候補/7採用/9保持、接続前15:23.033、局所540p5本/147字幕/111試験、終了68a32038 | 人間品質・新案1080p・汎化と別。白紙再選定を目的にしない |
| Codex1独立点検 | 9b72bc0f、対象bd0113c8、送信b93870fc。心霊回帰理由は後で補足 | 補足後版/局所媒体を独立点検済みにせず、再起動しない |
| 通常準備v002/消費v003/設計v004 | 11809f6f、7b600a64、d77f2a5d限定受理 | 旧fixture合格を現行実走へ流用しない |
| **v005通常キュー** | **7c8f34ce、親v005 §13 accept、共通状態a64465cb** | 技術完了。追加の拒否/転送を増やさず、固定回答を実判断にしない |
| **実判断付き計画** | **7bb5de02 accept、12候補/7採用/9保持、4工程complete、27,691frame/40,705,770sample、再読0** | 既見素材一件。映像音声/STT/汎化/人間品質と別 |
| **字幕演出入口対応** | **4556e389 accept、9区間/3,613断片/18項目の静的対応・不足・再利用条件** | presentation consumer受理・新字幕/動画完成ではない |
| **字幕判断入力準備** | **a98f569a accept、新二path、3,613atom/9要求/manifest、658断片比較、11拒否、別process再構築0** | 準備完了。実回答/描画/人間採用とは別 |
| 保存9表示要求の候補 | d93e6418で218単位/289行、技術run/readback0。一行末訂正が残る | 技術成立は保持、全体acceptと見心地合格は保留 |
| 旧9:47案1080p/低メモリ | d7e46592、265字幕/307状態、345点QC、本体/replay/保存再読 | 新15:23案全編・通常アプリ動画生成と別 |
| 字幕/演出/一件後修正 | 7A/7B/13、Panel/motion、Normal/Reset、性能第一期 | 既存renderer/低メモリ/後修正を再実装しない |
| Decisions/Jev | 830ea968、9/30調査/36判断点/J16準備、実推論0 | 当時の未確認を現在公開状況と混同せず、主線停止理由にしない |

各試験/正実走は別実績。E2E件数に合算せず、upload006親exit未返却を別process exit0へ付け替えない。

## 3. 現在の具体指示

**再開：[REUSE_JSON_FIX](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001_REUSE_JSON_FIX.md)、保存90c3d3464d63cde16b199a79db9fed2b33f7627b。**
親：[保存9表示要求への実回答](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001.md)。
内容訂正：[LINE_END_FIX](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001_LINE_END_FIX.md)。

### 3.1 停止の事実と許可差分

01b25053のhelperは第一result/trace/receipt保存後にreport JSONを厳密parseする。保存記録では一時コマンドが末尾にliteral backslash+nを付け、Unexpected non-whitespace character after JSON at position 40923、exit1。helper/製品validatorの欠陥ではない。破損44,729bytes/SHA c4cafc67cee696b3ad274c4c4734aabd5cb5119ac14bb07e79fc5e179a11189fをattempt-003/evidence-format-failure.txtに保持し、reportだけ既知余剰末尾除去・失敗履歴追記済み。元21入力/実装/旧attempt不変は報告・証拠として受領する。

設営24としてrun-display.mtsのOUTを同PARENT/attempt-004へ変更し、累積/受領HEAD/保存先/時刻/再利用/失敗履歴だけ追従。一時履歴はjson.dumpで直接保存し、close後のjson.load/json.loadsが更新objectと一致してからstdinを返す。helper入力待ち中に完了させ、stdin送信後にreportを並行更新しない。手書きescaped末尾、汎用修復、fallback、例外無視、reader/Skill/validator変更はしない。

今回の根拠はGitHub保存コード・記録の整合。Macの一時コマンド原実行や破損runtimeを相談役が直接再実行・再hashしたものではない。

### 3.2 固定入力・再利用・一行末訂正

入力bundle：runtime/artifacts/digest-caption-input-preparation-20261003-v001/attempt-002/bundle/
manifest SHA：83052a914317ae8b5a056ff641635ff061ebf59830df68a8090d180f2f0cfb75
意味入力SHA：6e16d247d36f841783d59badc4c4a3f35c8cf4739b6acae29baccc32a7d061a3
元state SHA：c62e3b38d00c8222f0918b52704e579f87a14346217fada6c9cd754fc6fccf3c
元draft：draft_eCg3g-IMIzEWMtJuMyJWB、prepare：agent_xKOu8eZKSNa5viNENtJ4L、validate：agent_wGiuVx5QiJvjGUxEW8Qxa。
plan SHA cd69dd7fccfab6b4d0f266e6dddf56d5eae4c670283cd7caf467b9fde2925ee3、execution SHA 735d6763afe6fcfabeb4c103871ee3a65368b96c9fa9df1a01f37717ace08f37。

再利用元：runtime/artifacts/digest-caption-display-answers-20261003-v001/attempt-002/。
旧manifest SHA：996f506dedbd1c7fc512de9ff0f8ad5bd057d101410d842d54ac418f2c22816a。
新先：同parent/attempt-004/。旧attempt-003を再利用元にしない。

各要求1〜8提示後、要求bytes/SHAと旧response size/SHA/requestFileSha256を照合し、byte同一・排他作成で新先へコピー。再判断・再整形・未来回答先送り・旧SHA付替えなし。全result/token/trace/receiptは実Skill/validatorで新生成する。

要求9提示後、answer.captions[0].cues[8].lineEndBoundaryIds[0]だけlocal124→125（boundary-003513→003514）へ訂正。完全IDは実要求から取得する。
「まあマリンはこんなもん／にしようかなと思います?」→「まあマリンはこんなもんに／しようかなと思います?」。cue終端local136、本文/疑問符/所属/順序・16単位/17行・他fieldは不変、幅22/23→24/21。
要求9 SHA 51931ef75ed33d81f7845924b4b9d07258849f1746146ee2b89b5897659b3943、旧response9 SHA 7debdc87ea057f3ce36b4bcb4c81af9a7cbec0c271ec68809413dc1e1e0e7e7f。

### 3.3 終点・保全

必要型検査/既存preflight→同一1〜8再利用/9訂正→全9既存検査/保存→別process内容判断なし再読一回。全3,613atom被覆/順序/所属、218単位/289行、1〜8bytes一致/9一field差分、既存幅、全SHA/trace bytes一致、元21入力/実装/旧候補不変を確認する。数値は照合値で恒久目標ではない。

既存SHA差替えclone一件を維持し、準備接続/v005/通常4工程/旧suite/QC/人間レビューは再実行しない。新しい実質問題がなければ担当のみcommit/push・直接報告まで進む。

旧attempt-001 exit1、attempt-002技術exit0＋内容一点未達、attempt-003記録整形exit1、新attempt-004結果を分離。旧候補/部分成果/失敗bytes/log/manifest/readbackとGit履歴を保持する。再利用待機/コピー/記録整形/再検査と訂正時間を分け、未計測時間を埋めない。

親回答scope実SHA 3f2982a5b55f27c29b62f83cbf2871b3339c3a8b62716fab637f533f9074767a、LINE_END_FIX実SHA bb21a7b12f06b974db53860a947a223af7c844a8805910cd674083b394135561、元purpose/承認/準備/要求は不変。本追補は別承認path/SHAへ記録し、旧manifestのhelper SHAを付け替えず新実行版を新manifestへ束縛する。

## 4. 読む根拠

| 資料 | 用途 |
|---|---|
| [REUSE_JSON_FIX](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001_REUSE_JSON_FIX.md) | 設営24、記録直列化・入力待ち中再読、新先、保全、終点 |
| [LINE_END_FIX](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001_LINE_END_FIX.md) | 唯一の行末差分、同一1〜8再利用条件 |
| [親実回答指示](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001.md)、[設営22](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001_NEGATIVE_MESSAGE_FIX.md) | 回答scope、実経路、初回失敗。SHA束縛済みで編集しない |
| [report](reports/digest-caption-display-answers-20261003/README.md)、[evidence](reports/digest-caption-display-answers-20261003/evidence.json)、[helper](reports/digest-caption-display-answers-20261003/run-display.mts) | 01b25053停止、attempt002成功、attempt003Failure、保全と来歴 |
| [準備report](reports/digest-caption-input-preparation-20261003/README.md)、[準備evidence](reports/digest-caption-input-preparation-20261003/evidence.json) | a98f569a完了、入力SHA、失敗履歴 |
| [入力対応](reports/digest-presentation-input-mapping-20261002/README.md)、[実判断](reports/request-intent-real-judgment-20261002/README.md)、[v005 §13](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md) | 供給元・不足・既存accept |
| [構成改善](reports/selection-structure-improvement-20260930/README.md)、[独立点検](reports/selection-structure-improvement-20260930/independent-review.md) | 15:23案、局所版、採否理由 |
| [9/28レビュー](reports/new-material-digest-human-review-20260928/README.md)、[9/29回答](reports/caption-readability-splitting-20260928/human-feedback-20260929-v001.md) | 制作要求、144px/条件付き分割/縁未選択 |
| [人間台帳](HUMAN_REVIEW_PENDING.md)、[開発計画](../相談役/方針/ZEV_開発計画.md) | 未回答・残エピック |

## 5. 人間回答・残課題

144pxと「読む必要がある文章でなかったら」の条件付き分割、水色・カラフル方向肯定を保持。説明/否定/因果/言い直しを不要に細切れにしない。36論理幅/2行は候補条件で最終物理幅/表示時間/見心地の合格ではない。

縁A=8/4は技術入力、outlineChoice=null。B=8/12は21論理不合格で実alphaによる保証免除なし。強調範囲変更B未肯定、LightCoral技術不合格と好みは別。固定アップ1.2倍82frameのHUD/人間品質/自動選択は未解決。

旧10回答受領済み、R1〜R3修正版7点・鬼武者Q3-2未回答。一件後修正/Resetは既存能力、一般本人反映入口・操作負担は別。別素材一般化は後続、Shortは今開始しない。性能第一期完了。

旧7Bの2,483断片の共通2,435/旧末尾48除外/今回1,178新規、旧7A共通2,330の本文/元ms/発話ID一致とartifact bytes差を維持。旧307状態/18色/82frameアップを一括移植しない。同一回答再利用を無関係な旧回答流用へ広げない。

presentation=not-connected／executionPermission=not-approved／humanQuality=pending／outlineChoice=null、ID9-PD-01/02未承認。完成背景4参照、最終style/renderer、ROOT基準後段読取、演出/動画許可/人間品質、旧state移行/本番/公開は別。新レビューを今回の開始条件にしない。

## 6. 容量と媒体

本人承認整理04c21bfd/78805d86：8コピー35.79GiB削除、33参照は再作成まで旧runtime即時再読不可。元素材/STT/inspection/完成媒体/判断/証拠/旧stateは保持。

upload006の3実体、MP4007の1実体、実判断の1実体4,803,412,827bytesは保持。終了時空き12,933,283,840bytesは過去観測、現在空き/SSDは未確認。

今回許可するコピーは同一回答の小JSONのみ。媒体read/hash/copy/PUT、通常HTTP、新API/provider/費用、取得/STT/inspection/ffprobe、演出/描画/動画、新queue/UI、SSD、削除、本番/公開は0。

## 7. 受け渡し・実稼働・Git

初回は本人手貼り。開始後はCodex2専用Edgeで同じZEV Build Loopへ直接送り、返信生成完了・全文読了まで受領して指定範囲で続行する。実UI/通信障害以外は返信生成中を終了理由にしない。自分専用タブを使いtab IDは恒久固定しない。

既存報告先：https://chatgpt.com/g/g-p-6a8aab6b92308191b44f77a03945fed4-zevxiang-tan-yi/c/6abbcacc-8c98-83ee-9276-248a1d29b047
新セッションでは実際の報告先を照合する。

main、担当のみ明示stage、Git操作直列化。他者変更をreset/stash/削除/stageせず、branch/worktree/force pushを自己判断で作らない。Codex1起動、受理だけの独立commit、本人中継は不要。

旧未調整案停止を保持し当時の貼付を承認へ遡及変換しない。01b25053の設営23適用・第一部分成立/記録整形exit1・残存0はCodex報告と保存証拠。設営24指示は発行済み、受領・適用・attempt-004実行・訂正完了は未確認。Macの現在processを相談役が直接観測したものではない。

方針・指示・完了・中断は同じターンで正本保存。自動監視/非同期作業を装わない。報告名はCodex2 AUDIT_ONLY＋NEXT_REQUEST｜9の後続・保存表示要求への実回答。今回の候補完成から演出/動画へ自動着工しない。
