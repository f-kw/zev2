# ZEV Build Loop — 引き継ぎインデックス

更新日：2026-10-02（JST） / revision：handover-index-20261002-v041
正本：f-kw/zev2 main の docs/HANDOVER_INDEX.md
固定入口：docs/ZEV_START_HERE.md。プロジェクトには固定入口の写しを置く。

**最新更新：Codex2が7e0de670の新指示を受領し、設営16の薄い補助を適用。f1d716243ded9c6a783404ffc27a4b84ff209e6fで親directory不足によるENOENT・exit1を報告。通常API・runner・媒体作用は開始前。相談役はrun-local.mtsと失敗証拠を照合し、attempt mkdir直前に親だけをmkdir({recursive:true})する一行を設営17として個別承認した。attempt自身のrecursive:falseと既存拒否、失敗履歴、製品5／設営16は保持し、17は適用時に計上。再開正本は[親directory修正](work-orders/ZEV_DIGEST_REAL_JUDGMENT_LOCAL_20261002_v001_PARENT_DIRECTORY_FIX.md)、保存9ecf3ae3893ab0c9c8d06783f3837720c51d4815。容量再実測後に同じ実判断計画一件へ戻る。設営17受領・適用・実再開は未確認。v005の技術完了は不変。**

## 0. 最初に読む

1. プロジェクトZEV_START_HERE.mdを全文読む。
2. GitHub mainの現在HEADを取得し、その同一SHAの本書を全文読む。
3. [AGENTS](../AGENTS.md)、[監査プロトコル](CODEX_CHATGPT_AUDIT_PROTOCOL.md)、[人間確認方針](policies/HUMAN_REVIEW_ACCUMULATION_POLICY_v001.md)、[CURRENT_GOAL](CURRENT_GOAL.md)、§4の現行指示と根拠を読む。
4. 役割・現在地・完了・残件・人間回答・指示と実稼働を復元する。読めないもの、保存不能、Mac上の未観測は明記する。旧添付・会話要約・メモリだけで現在地を認定しない。

優先順：最新本人指示と適用範囲→現行個別指示→対応する実績と一次回答→本書→旧計画／歴史資料。無関係な資料の日付だけで上書きしない。

v039までの全文・全設営経過・過去の固定版リンクは[ccd907a5の旧インデックス全文](https://github.com/f-kw/zev2/blob/ccd907a52d15b65083557110700222d1b072c44f/docs/HANDOVER_INDEX.md)へ不変保持する。旧「次の試験」「未完了」はその時点の履歴で、後のacceptを巻き戻さない。必要時に該当reportへ戻り、全過去試験を毎回再走査・実行しない。

## 1. 役割・目的・運用

ZEVは素材と制作意図から、内容・構成・字幕・必要な演出を備えた、見ていて気持ちいい動画を作る基盤。主線はDigest、Shortは別系統。生成成功や試験合格だけを製品品質の完成にしない。

- kawafmm：製品方向、任せる範囲、目視・好み、費用・契約・公開等の専決判断。通常技術監査・中継を担わせない。
- 相談役：残課題・優先順位・作業範囲・GitHub現物監査・指示と正本保存。
- Codex：指示内の実装・実行・検証・保存・通常commit/push・直接報告。人間品質を代理採用しない。

本人の「独断で決めれる程度なら自動で承認して」はAGENTSの条件内で相談役が個別判断する委任。一般上限・累積履歴・強制停止やCodex自己承認権は変更しない。v005の最終累積は製品5／設営15。新指示の薄い実行補助は設営16として適用済み。親directory不足修正を設営17として個別承認し、適用時に計上する。

必要な人間確認は[既存台帳](HUMAN_REVIEW_PENDING.md)へ蓄積。未回答を採用にせず、独立作業は進める。既回答・15分初見レビュー・全字幕採点を再要求しない。

## 2. 現在地・完了済み

| 項目 | 根拠・成立範囲 | 戻してはいけないこと |
|---|---|---|
| 初稿と15分レビュー | 9/26初稿15:31.633、9/28一次レビュー、9/29字幕局所回答 | 「新素材で初めて一本」「初見レビューをもう一度」に戻さない |
| 9.構成改善v001 | b69e168c受理。11候補・7採用・9保持、通常接続前15:23.033。局所540p5本・147字幕・111試験。送信/終了68a32038 | 人間品質、新案1080p、汎化とは別。新案を白紙から作り直すことを目的にしない |
| Codex1独立点検 | 点検9b72bc0f、対象bd0113c8、送信b93870fc。心霊回帰会話の比較理由を補足 | 補足後版・局所媒体を独立点検済みにしない。再起動は今回不要 |
| 通常準備v002／後段v003／設計v004 | 11809f6f、7b600a64、d77f2a5dの各限定受理 | 旧版fixtureの合格を現行版の直接実行にしない |
| **v005通常キュー接続** | **7c8f34ceを親v005 §13でaccept。受理df9fce02、共通状態a64465cb。隔離実装試験は技術完了** | 追加の拒否・転送・型検査を増やして未完了へ戻さない。固定回答試験を実判断運転や本番品質にしない |
| 旧9:47案1080p・低メモリ | d7e46592。265字幕・307状態、345点QC、本体/replay・保存再読 | 新15:23案全編、人間採用、通常アプリからの動画生成完成とは別 |
| 字幕・既存演出・一件後修正 | 7A/7B/13、Panel/motion、Normal/Reset、性能第一期等は該当reportの技術成立を保持 | 後修正UI、renderer、低メモリ処理を再実装しない |
| Decisions/Jev副線 | 830ea968。9/30調査・36判断点・J16比較準備。実推論0 | 調査時点の仕様/価格/access未確認と現在の公開状況は別。主線の停止理由にしない |

v005の根拠：通常local/upload、分離root・receiver-only別process再読、source JSONとMP4直接登録、inspection未提供、異なる2目的の3判断到達、52回帰・参照9・時計15・現行否定19・最終4拒否。別々の実績であり件数を一つのE2Eへ合算しない。upload006の親exit未返却は、別process再読exit0へ付け替えない。

Codex2のv005終了・accept返信受領・Git cleanは本人提示報告で受領。相談役はMacのprocessを直接観測していない。

## 3. 今回の確定作業と再開範囲

**親正本：[ZEV_DIGEST_REAL_JUDGMENT_LOCAL_20261002_v001.md](work-orders/ZEV_DIGEST_REAL_JUDGMENT_LOCAL_20261002_v001.md)**
**再開正本：[親directory修正・設営17](work-orders/ZEV_DIGEST_REAL_JUDGMENT_LOCAL_20261002_v001_PARENT_DIRECTORY_FIX.md)**

一件の目的：通常依頼からCodexの実判断を既存3Skillへ戻し、採用区間・構成・時計を持つ計画を通常保存して再読する。

- 対象は既存素材-2UUTkv9qvkのみ。purposeは正本§2の全文に固定。
- 保存STTと既存inspectionを使用し、source JSON方式で新しい隔離依頼へ正規登録する。旧state/ownerを付け替えない。
- 通常index/factoryのrequestをCodexが読み、既存stdinへ今回のresponseを一件ずつ返す。新API、固定回答generator、独立推論providerを使わない。
- 15:23案と補足は根拠として再利用可。件数・尺を正解固定せず、同じ判断が妥当なら維持する。
- 通常local一系列、現行準備処理の素材コピー一つだけ。作用前にdevice・source size・実空きを確認し、2×sourceBytes以上（既知sizeで9,606,825,654 bytes）の今回限定条件を満たす場合だけ進む。
- 計画/検証completeと既存consumerの別process再読まで。動画・字幕演出は今回は作らない。
- 書込み対象は新指示指定の小driver/reader、report/evidenceと隔離runtime。製品code変更は含めない。

前の提案は[停止を記録した検討文書](../相談役/方針/2026-10-02_v005完了後_状況整理と次作業案_v001.md)として保持する。本人の旧「キックした」を承認へ遡及変換しない。今回の新しい手貼り指示受領から始める。初回指示保存時点では受領・旧貼付後の差分は未確認だったが、今回f1d71624の報告で新指示受領と旧差分/processなしを確認した。

### 3.1 f1d71624の初回停止と設営17

[実コード](reports/request-intent-real-judgment-20261002/run-local.mts)、[失敗証拠](reports/request-intent-real-judgment-20261002/evidence.json)、[主report](reports/request-intent-real-judgment-20261002/README.md)を照合。固定runtimeの親directoryが未作成で、attemptのmkdir(runtime,{recursive:false})がENOENT。保存証拠はexit1・stateCreated=false・mediaActionStarted=false。通常系列や実判断は未開始。Mac上の相談役再実行ではない。

許可する実処理差分はその直前の `await mkdir(path.dirname(runtime), {recursive:true});` 一行。固定workspace内の親だけを作り、attempt側のrecursive:false、EEXIST拒否を維持する。attempt-001の不存在を再確認できれば同番号を新規作成し、存在時は削除・上書きせず相談役へ返す。

旧evidence/実行codeは固定Git版f1d716243ded9c6a783404ffc27a4b84ff209e6fで保持。初回startedAt/error/stopは失敗履歴として残す。今回の累積17・受領SHA・再開時刻への記録追従は許可し、失敗を成功へ付け替えない。製品5／設営16を維持し、設営17は適用時に計上する。一般上限・強制停止・承認意味は変更しない。

報告の空き17,751,695,360 bytesを現在値として流用しない。既存preflightと大容量作用前の再測定を通過したら、通常登録→段階別の実回答→計画/検証complete→別process再読まで同じセッションで続行する。旧全試験、v005、動画の再実行はしない。設営17の受領・適用・再稼働・完了は指示発行時点で未確認。

## 4. 今回読む根拠

| 資料 | 意味 |
|---|---|
| [親directory修正](work-orders/ZEV_DIGEST_REAL_JUDGMENT_LOCAL_20261002_v001_PARENT_DIRECTORY_FIX.md)、[失敗証拠](reports/request-intent-real-judgment-20261002/evidence.json) | 今回の設営17個別承認・一行差分・失敗保持・再開位置 |
| [新指示全文](work-orders/ZEV_DIGEST_REAL_JUDGMENT_LOCAL_20261002_v001.md) | 今回一件のpurpose、実回答、source/容量、許可path、終点 |
| [v005 §13](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md) | 前工事の最終acceptと承認外 |
| [通常接続report](reports/request-intent-connection-20261001/README.md) | 実local系列・所有者・保存・再読の参照。旧testを起動しない |
| [構成改善report](reports/selection-structure-improvement-20260930/README.md)、[案](reports/selection-structure-improvement-20260930/proposal-v001.json)、[独立点検](reports/selection-structure-improvement-20260930/independent-review.md) | 実判断の根拠、比較理由、採用区間と未観測 |
| [9/28一次レビュー](reports/new-material-digest-human-review-20260928/README.md)、[9/29回答](reports/caption-readability-splitting-20260929/human-feedback-20260929-v001.md) | 導入・説明・締め・除外要求、144px・条件付き分割、縁未選択 |
| [人間台帳](HUMAN_REVIEW_PENDING.md)、[開発計画](../相談役/方針/ZEV_開発計画.md) | 完了・回答待ち・別作業を分ける |

現行実装の具体経路は `runner/src/index.ts`、`digest-plan-preparation-v001.ts`、`digest-plan-consumption-v001.ts`、`workflow-step-builders.ts`、既存 `judgeThroughStdinV001`。新指示はその製品変更を許可しない。

## 5. 残課題・人間回答

| 項目 | 保持する状態 |
|---|---|
| 字幕 | 144pxは肯定。分割は「読む必要がある文章でなかったら」の条件付き。無条件の細分化許可にしない |
| 縁A/B | 選択null。A=8/4技術入力、B=8/12は21字幕論理不合格。実alphaで保証免除しない |
| 色 | 水色・カラフル方向は肯定。強調範囲変更Bへの肯定なし。LightCoral技術不合格と好みは別 |
| アップ | 手指定1.2倍82frameは技術成立。HUD制約・人間品質・一般自動選択は残る |
| 内容 | 15:23案の技術成立と通常実判断運転・映像音声・未見素材汎化は別 |
| 10／11 | 旧10回答は受領済み。R1〜R3修正版7点と鬼武者Q3-2は未回答。再実装しない |
| UI・制作負担 | 一件後修正/Resetは既存能力。一般の本人反映入口・実操作・全工程時間は別 |
| 8／12／14 | 別素材での一般化は後続、Shortは今は開始しない。性能第一期は完了。Decisions等は副線 |
| 本適用 | ID9-PD-01一般委任、ID9-PD-02動画許可、旧state移行、本番、公開、人間品質は未承認／pending |

人間回答は機能使用可・修正要求・修正実装・反映確認を分ける。旧別素材の肯定を現在素材へ移さない。新規レビューを今回作業の開始条件にしない。

## 6. 容量・旧証拠の保持

削除前04c21bfd、実績78805d86の本人承認整理で8コピー35.79GiBを削除。削除時空き2.00→37.82GiBは過去観測。元素材、STT/inspection、完成/確認媒体、判断/証拠/旧stateは保全。33旧参照は再作成まで旧runtimeの即時再読不可。

その後のupload006は3素材実体、MP4007は1素材実体で成立し保持された。現在の実空き・SSD接続は未確認。旧削除や旧コピーを今回再実行しない。新指示の一コピー許可と旧の重い試験を混同しない。

[整理記録](reports/request-intent-connection-20261001/queue-storage-cleanup-20261001-v001.json)、[旧1080p](reports/original-resolution-low-memory-20260930/full-run-report.md)。旧1080p SHAは65afceb046aca0629b0fe097f602caae3b05697b10cff8eb6a295106185f3858。Mac現物をChatGPT sandboxから再生できると仮定しない。

## 7. 受け渡し・Edge・Git

初回は相談役が一つのテキストコードブロックを出し、本人が手貼りする。正本保存だけで実行済みにしない。開始後のGPT_DECISION/HUMAN_DECISION/NEXT_REQUESTはCodex自身が専用Edgeから相談役へ直接送り、返信生成完了・全文読了まで受領して同じ範囲を続行する。実UI/通信障害以外は「返信生成中」を終了理由にしない。

報告先：ZEV Build Loop。
既存会話URL： https://chatgpt.com/g/g-p-6a8aab6b92308191b44f77a03945fed4-zevxiang-tan-yi/c/6abbcacc-8c98-83ee-9276-248a1d29b047
新セッションでは実際の報告先を照合する。各Codexは自分専用タブだけを操作し、閉じていれば自分用を新設。tab IDを恒久固定しない。

main、担当fileだけ明示stage、stage/commit/pushは直列化。他者変更をreset/stash/削除/stageしない。branch/worktree・force pushの自己作成なし。Codex1は今回起動しない。

方針・指示・完了・中断は同じターンで正本へ記録する。自動監視・非同期作業を装わない。新しい次工事の許可は、今回一件の終了から自動推測しない。
