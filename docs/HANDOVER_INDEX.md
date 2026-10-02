# ZEV Build Loop — 引き継ぎインデックス

更新日：2026-10-03（JST） / revision：handover-index-20261003-v046
正本：f-kw/zev2 main の docs/HANDOVER_INDEX.md
固定入口：docs/ZEV_START_HERE.md。プロジェクトには固定入口の写しを置く。

**最新更新：d231a911c05f2eacbb6e7f70d8a0ac9e65a3aacfを監査。第一表示要求217atom/14単位の正常回答とSHA差替えcloneの拒否は成立したが、補助が接頭辞なしコードとraw errorを比較してexit1。相談役は完全な拒否本文への比較値修正、旧証拠保全用attempt-002、同一要求SHAの第一回答byte同一再利用を設営22の一件として個別承認した。正本は[NEGATIVE_MESSAGE_FIX](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001_NEGATIVE_MESSAGE_FIX.md)、保存7a3111eb629c017e277ca7b281363b864b78fbf0。適用済み製品6/設営21、22は適用時に計上。残8回答・trace/receipt・最終manifest・別process再読は未完了。修正受領・再稼働・全9回答完成は未確認。既存accept・人間Pendingは戻さない。**

## 0. 最初に読む

1. プロジェクトZEV_START_HERE.mdを全文読む。
2. GitHub mainの現在HEADを取得し、その同一SHAの本書を全文読む。
3. [AGENTS](../AGENTS.md)、[監査プロトコル](CODEX_CHATGPT_AUDIT_PROTOCOL.md)、[人間確認方針](policies/HUMAN_REVIEW_ACCUMULATION_POLICY_v001.md)、[CURRENT_GOAL](CURRENT_GOAL.md)、§4の現行指示と必要な根拠を読む。
4. 役割・現在地・完了・未解決・人間回答・指示と実稼働を復元する。取得不能・保存不能・Mac上の未観測を明示する。旧添付・会話要約・メモリだけで現在地を認定しない。

優先順：最新本人指示と適用範囲→現行個別指示→対応実績と一次回答→本書→旧計画。無関係な日付だけで上書きしない。

更新前v045全文と表示第一回答後の停止checkpointは[d231a911固定版](https://github.com/f-kw/zev2/blob/d231a911c05f2eacbb6e7f70d8a0ac9e65a3aacf/docs/HANDOVER_INDEX.md)へ保持。v044準備完成はa98f569a、初回f577bfba、入力対応4556e389、実判断7bb5de02、v005までの履歴ccd907a5を辿れる。古い停止/未完了を後のacceptへ逆流させず、全過去工事を再走査・再実行しない。

## 1. 役割・目的・運用

ZEVは素材と制作意図から内容・構成・字幕・必要な演出を備えた、見ていて気持ちいい動画を作る基盤。主線はDigest、Shortは別系統。一本の生成成功や試験合格だけで製品完成としない。

- kawafmm：製品方向、任せる範囲、目視・好み、費用・契約・公開等の専決判断。通常技術監査・中継を担わせない。
- 相談役：残課題・優先順位・作業範囲・現物監査・具体指示と正本保存。
- Codex：指定範囲の実装・実行・検証・保存・通常commit/push・直接報告。人間品質を代理採用しない。

本人の「終わったら次に進んで」に従い、監査と同じ主線の具体的な許可範囲を同じ返答へつなぐ。任意の別エピック・本番・公開・費用・一般権限拡張へ広げない。

軽微技術修正の相談役委任はAGENTSの個別条件内。一般上限・累積・強制停止・Codex自己承認権は変更しない。v005製品5/設営15、実判断補助16/親directory17、入力対応18、準備補助19/保存先20、製品目的参照修正6、表示回答補助21を保持。現適用済みは製品6/設営21、新規二path初回実装は修正履歴と別。設営22は比較値欠陥と失敗保全用再開の一件として個別承認し、適用時に計上する。

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
| 旧9:47案1080p/低メモリ | d7e46592、265字幕/307状態、345点QC、本体/replay/保存再読 | 新15:23案全編や通常アプリからの動画生成完成と別 |
| 字幕・演出・一件後修正 | 7A/7B/13、Panel/motion、Normal/Reset、性能第一期等 | renderer/低メモリ/一件後修正を再実装しない |
| Decisions/Jev | 830ea968、9/30調査/36判断点/J16準備、実推論0 | 当時の未確認と現在の公開状況は別。主線停止理由にしない |

v005各suiteと正実走は別実績。E2E件数として合算せず、upload006親exit未返却を別process exit0へ付け替えない。

## 3. 現在の具体指示 — 表示実回答の続行

親：[ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001.md](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001.md)
再開：[NEGATIVE_MESSAGE_FIX](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001_NEGATIVE_MESSAGE_FIX.md)、保存7a3111eb629c017e277ca7b281363b864b78fbf0。

### 3.1 監査で確認した停止と限定差分

d231a911のrun-display全文、evidence、既存fail、親scopeと差分を照合。既存failのrawメッセージはDIGEST_SKILL_E2E接頭辞を持つが、補助の比較値にない。正常第一回答と否定cloneの拒否は成立、その後の補助assertでexit1。製品validator欠陥でも正常回答の来歴不一致でもない。

修正はrun-display.mtsの `assert.equal(code, 'DIGEST_SKILL_E2E: DISPLAY_PROVENANCE_MISMATCH')` と、OUTを同parentのattempt-002へ揃えること。negative.expected、累積6/22、受領HEAD/実行metadata、再利用履歴の記録追従のみ可。完全一致・出力不増加を維持し、汎用エラー正規化や例外無視はしない。別不具合を混ぜない。

### 3.2 同じ第一回答の保全再利用

入力bundle：runtime/artifacts/digest-caption-input-preparation-20261003-v001/attempt-002/bundle/
manifest SHA：83052a914317ae8b5a056ff641635ff061ebf59830df68a8090d180f2f0cfb75
意味入力SHA：6e16d247d36f841783d59badc4c4a3f35c8cf4739b6acae29baccc32a7d061a3
元state SHA：c62e3b38d00c8222f0918b52704e579f87a14346217fada6c9cd754fc6fccf3c

元計画draft_eCg3g-IMIzEWMtJuMyJWB、prepare agent_xKOu8eZKSNa5viNENtJ4L、validate agent_wGiuVx5QiJvjGUxEW8Qxa。plan SHA cd69dd7fccfab6b4d0f266e6dddf56d5eae4c670283cd7caf467b9fde2925ee3、execution SHA 735d6763afe6fcfabeb4c103871ee3a65368b96c9fa9df1a01f37717ace08f37。9groupの断片数217/658/120/1033/778/258/158/167/224、候補6の3非連続区間、keep3,613/drop3,460は不変。

第一要求の実SHA fee145844ff2409c4a8ead59558a4d0a5879bf177387e593b2075f1944e6c567。旧表示attempt-001/response-0001.jsonは5,405bytes、SHA 5228394586b8aab05fe8943d3b944a368327627955421494c0083af7e4036034。旧resultは4,725bytes、SHA a4943d074bf4be10a8fd670eadca252d2b82ef17c080c5ea86143caea3dd82a3。

新実行で同じ第一要求が提示された後、要求実bytes/SHA・旧responseのsize/SHAを照合し、新attempt-002へbyte同一・排他作成でresponseだけをコピーして既存stdinへ返す。内容の再判断・再整形・SHA付替えなし。result/tokenは実Skill/validatorから再生成する。旧resultや合格印で検査を代替しない。同一性不成立なら流用しない。

第一回答の再利用待機/コピーを新内容判断時間にしない。残8件は実要求提示ごとにCodexが読み、新回答を返す。固定generator・未提示未来回答は使わない。

### 3.3 終点・保存・元scope

新先：runtime/artifacts/digest-caption-display-answers-20261003-v001/attempt-002/。
旧attempt-001のresponse/result/失敗log/record/入力一覧とd231a911初回コードを不変保持。初回exit1・部分通過を後の成功へ付け替えない。

親回答指示SHA 3f2982a5b55f27c29b62f83cbf2871b3339c3a8b62716fab637f533f9074767a は維持。元purposeの「今回は字幕・演出・動画を作らず」、承認snapshot、準備bundle、要求schema/ID/task/style/本文/SHAを編集しない。再開追補は別の修正承認path/SHAで記録する。

run-displayの必要型検査・既存preflight、第一回答再受理とSHA差替えclone一件、残8実回答、全9trace/receipt/manifest保存、最後の別process内容判断なし再検査を行う。元JSONからtoken/traceを復元し、全SHA/trace一致・元bundle/state不変までが終点。旧準備検証・11拒否/旧suite・通常4工程・動画QC・人間レビューを繰り返さない。

既存Skill/validatorを維持し、回答4fieldと全文被覆/所属/順序/行数/論理幅を検査。WeakMap tokenは保存しない。成果はvalidated-display-for-review候補で、完成sourcePackage/renderer artifact/通常queue completeではない。

担当pathはrun-display.mts、README.md、evidence.json、新runtimeと自分のCURRENT_GOAL/HANDOVER状態のみ。製品code・新準備二path・既存製造/Skill/validator/通常factory/index/backend/sharedを変更しない。

## 4. 今回読む根拠

| 資料 | 用途 |
|---|---|
| [再開追補](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001_NEGATIVE_MESSAGE_FIX.md) | 設営22、正確な比較値・保存先・第一回答再利用条件、失敗保全 |
| [親実回答指示](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001.md) | 唯一の9回答scope、既存実経路、保存、検証、承認外。編集しない |
| [今回report](reports/digest-caption-display-answers-20261003/README.md)、[evidence](reports/digest-caption-display-answers-20261003/evidence.json)、[run-display](reports/digest-caption-display-answers-20261003/run-display.mts) | d231a911停止、第一回答/result、実拒否本文と初回検査 |
| [準備report](reports/digest-caption-input-preparation-20261003/README.md)、[evidence](reports/digest-caption-input-preparation-20261003/evidence.json) | a98f569aの完了manifest/9要求SHA/同等性/再読 |
| [準備親](work-orders/ZEV_DIGEST_CAPTION_JUDGMENT_INPUT_PREPARATION_20261003_v001.md)、[目的参照修正](work-orders/ZEV_DIGEST_CAPTION_JUDGMENT_INPUT_PREPARATION_20261003_v001_PURPOSE_REFERENCE_FIX.md) | 完了済みscope/SHAと初回失敗。編集しない |
| [入力対応](reports/digest-presentation-input-mapping-20261002/README.md)、[実判断](reports/request-intent-real-judgment-20261002/README.md)、[v005 §13](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md) | 供給元/不足/再利用条件、通常保存計画、完了と承認外 |
| [構成改善](reports/selection-structure-improvement-20260930/README.md)、[独立点検](reports/selection-structure-improvement-20260930/independent-review.md) | 15:23案・補足・局所検証の対象版 |
| [9/28レビュー](reports/new-material-digest-human-review-20260928/README.md)、[9/29回答](reports/caption-readability-splitting-20260928/human-feedback-20260929-v001.md) | 制作要求、144px/条件付き分割/縁未選択 |
| [人間台帳](HUMAN_REVIEW_PENDING.md)、[開発計画](../相談役/方針/ZEV_開発計画.md) | 未回答・別エピック |

## 5. 人間回答と残課題

144pxと「読む必要がある文章でなかったら」の条件付き分割、水色・カラフル方向の肯定は保持。説明/否定/因果/言い直しを不必要に細切れにしない。今回36論理幅/2行は候補条件であり最終物理幅・表示時間・見心地の合格ではない。

縁A=8/4は技術入力、outlineChoice=null。B=8/12は21論理不合格で実alphaによる保証免除なし。強調範囲変更B未肯定、LightCoral技術不合格と好みは別。固定アップ1.2倍82frameのHUD/人間品質/一般自動選択は未解決。

旧10回答は受領済み、R1〜R3修正版7点・鬼武者Q3-2は未回答。一件後修正/Resetは既存能力、一般本人反映入口・操作負担は別。別素材一般化は後続、Shortは今開始しない。性能第一期完了。

旧7B選択2,483断片のうち共通2,435、旧末尾48は除外、今回1,178は旧7Bにない。旧7A共通2,330は本文/元ms/発話ID一致だが発話artifact bytesは別。旧307状態/18色/82frameアップは一括移植しない。今回第一回答の厳密同一再利用を他の旧回答の流用許可へ広げない。

presentation=not-connected／executionPermission=not-approved／humanQuality=pending／outlineChoice=null、ID9-PD-01/02未承認。背景4参照、最終style/renderer、ROOT基準後段読取、演出/動画許可・人間品質、旧state移行・本番・公開は別。新レビューを今回の開始条件にしない。

## 6. 容量と旧証拠

本人承認整理04c21bfd/78805d86：8コピー35.79GiB削除、33旧参照は再作成まで旧runtime即時再読不可。元素材/STT/inspection/完成媒体/判断/証拠/旧stateは保持。

upload006の3実体、MP4007の1実体、実判断運転の1実体4,803,412,827bytesは保持。終了時空き12,933,283,840bytesは過去観測、現在空き・SSDは未確認。今回第一回答5,405bytesの小JSONコピー以外へ復元を広げない。媒体read/hash/copy/PUT、通常HTTP、新API/provider/費用、取得/STT/inspection/ffprobe、描画/演出/動画、新queue/UI、SSD、削除、本番/公開は0。

## 7. 受け渡し・実稼働・Git

初回は本人手貼り。開始後はCodex2専用Edgeから同じZEV Build Loopへ直接送り、返信生成完了・全文読了まで受領して指定範囲を続行。実UI/通信障害以外は返信生成中を終了理由にしない。自分専用タブのみ使用、tab IDは恒久固定しない。

既存報告先：https://chatgpt.com/g/g-p-6a8aab6b92308191b44f77a03945fed4-zevxiang-tan-yi/c/6abbcacc-8c98-83ee-9276-248a1d29b047
新セッションでは実際の報告先を照合する。

main、担当のみ明示stage、Git操作直列化。他者変更をreset/stash/削除/stageせず、branch/worktree/force pushを自己判断で作らない。Codex1起動・受理だけの独立commit・本人中継は不要。

旧未調整案停止を保持し当時の貼付を承認へ遡及変換しない。d231a911の設営21適用・第一回答と否定拒否・補助exit1・残存0はCodex報告/保存証拠で確認。設営22は発行済み、受領・適用・新実行・完成は未確認。Macの現在processを相談役が直接観測したものではない。

方針・指示・完了・中断は同じターンで正本保存。自動監視/非同期作業を装わない。新しい実質問題がなければ今回の修正から全9回答保存・再検査・通常push・直接報告まで進め、演出/動画製造へは自動着工しない。
