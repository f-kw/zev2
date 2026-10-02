# ZEV Build Loop — 引き継ぎインデックス

更新日：2026-10-03（JST） / revision：handover-index-20261002-v042（Codex2入力対応checkpoint追記）
正本：f-kw/zev2 main の docs/HANDOVER_INDEX.md
固定入口：docs/ZEV_START_HERE.md。プロジェクトには固定入口の写しを置く。

**最新更新：7bb5de02の実判断付き計画acceptと入力対応指示をCodex2専用Edgeで全文受領。main 9acea7e2へ同期し、個別承認の設営18を実施。9区間・3613保持断片・18入力項目の対応、不足、旧成果の再利用条件、最初の二path接続案を[report](reports/digest-presentation-input-mapping-20261002/README.md)に保存した。小補助exit0、新診断約1.01MiBの一回再読bytes一致・元state不変。製品5／設営18。製品変更・字幕演出の新回答・製造・媒体作用は0。今回入力対応の相談役監査は未受領、通常commit/push・直接報告へ進む。新しい実装/製造へは着工しない。**

## 0. 最初に読む

1. プロジェクトZEV_START_HERE.mdを全文読む。
2. GitHub mainの現在HEADを取得し、その同一SHAの本書を全文読む。
3. [AGENTS](../AGENTS.md)、[監査プロトコル](CODEX_CHATGPT_AUDIT_PROTOCOL.md)、[人間確認方針](policies/HUMAN_REVIEW_ACCUMULATION_POLICY_v001.md)、[CURRENT_GOAL](CURRENT_GOAL.md)、§4の現行指示と根拠を読む。
4. 役割・現在地・完了・残件・人間回答・指示と実稼働を復元する。取得不能・保存不能・Mac上の未観測は明記する。旧添付・会話要約・メモリだけで現在地を認定しない。

優先順：最新本人指示と適用範囲→現行個別指示→対応する実績と一次回答→本書→旧計画／歴史資料。無関係な日付だけで上書きしない。

更新前v041全文と親directory修正・設営17・実走の詳細は[7bb5de02固定版](https://github.com/f-kw/zev2/blob/7bb5de02a59ab78cd7aae6757dff33b6b20f0b88/docs/HANDOVER_INDEX.md)へ不変保持。v039までの全設営経過・過去固定版リンクは[ccd907a5固定版](https://github.com/f-kw/zev2/blob/ccd907a52d15b65083557110700222d1b072c44f/docs/HANDOVER_INDEX.md)へ保持。過去の未完了・次の試験を後のacceptへ逆流させず、全過去工事を毎回再走査・再実行しない。

## 1. 役割・目的・運用

ZEVは素材と制作意図から、内容・構成・字幕・必要な演出を備えた、見ていて気持ちいい動画を作る基盤。主線はDigest、Shortは別系統。生成成功や試験合格だけを製品品質完成にしない。

- kawafmm：製品方向、任せる範囲、目視・好み、費用・契約・公開等の専決判断。通常技術監査・中継を担わせない。
- 相談役：全体の残課題・優先順位・作業範囲・GitHub現物監査・指示と正本保存。
- Codex：指示内の実装・実行・検証・保存・通常commit/push・直接報告。人間品質を代理採用しない。

本人の「独断で決めれる程度なら自動で承認して」はAGENTS条件内の相談役個別判断委任。一般上限・累積・強制停止・Codex自己承認権は変更しない。v005の製品5／設営15、実判断運転の設営16と親directory一行修正17を履歴保持。入力対応正本§6の小JSON補助作成/実行を設営18として個別計上。現累積は製品5／設営18。

人間確認は[既存台帳](HUMAN_REVIEW_PENDING.md)へ蓄積。未回答を採用にせず、独立作業は進める。済んだ15分レビュー、全字幕採点、同じ質問を再要求しない。

## 2. 完了済み・受理範囲

| 項目 | 根拠・成立範囲 | 戻してはいけないこと |
|---|---|---|
| 初稿と15分レビュー | 9/26初稿15:31.633、9/28一次レビュー、9/29字幕局所回答 | 新素材で初めて一本、初見レビュー再実施へ戻さない |
| 9.構成改善v001 | b69e168c受理。11候補・7採用・9保持、接続前15:23.033、局所540p5本・147字幕・111試験。送信/終了68a32038 | 人間品質・新案1080p・汎化と別。白紙再選定を目的にしない |
| Codex1独立点検 | 9b72bc0f、対象bd0113c8、送信b93870fc。心霊回帰比較理由を後で補足 | 補足後版・局所媒体を独立点検済みにしない。Codex1再起動不要 |
| 通常準備v002／後段v003／設計v004 | 11809f6f、7b600a64、d77f2a5dの限定受理 | 旧fixture合格を現行の直接実走にしない |
| **v005通常キュー接続** | **7c8f34ceを親v005 §13でaccept。受理df9fce02、共通状態a64465cb。隔離実装試験は技術完了** | 追加の拒否・転送・型検査を増やさない。固定回答を実判断や本番品質にしない |
| **通常依頼の実判断付き計画一件** | **7bb5de02を今回accept。12候補・7採用・9保持、通常4工程complete、27,691frame／40,705,770sample、別process再読exit0** | 既見素材一件の技術成立。字幕演出接続、動画・未見素材汎化・人間品質・一般本適用は別 |
| 旧9:47案1080p・低メモリ | d7e46592。265字幕・307状態、345点QC、本体/replay・保存再読 | 新15:23案全編や通常アプリからの動画生成完成にしない |
| 字幕・既存演出・一件後修正 | 7A/7B/13、Panel/motion、Normal/Reset、性能第一期等は各reportの技術成立を保持 | renderer、低メモリ、一件後修正を再実装しない |
| Decisions/Jev副線 | 830ea968。9/30調査・36判断点・J16比較準備、実推論0 | 当時の仕様/価格/access未確認と現在の公開状況は別。主線の停止理由にしない |

v005のlocal/upload・分離root・receiver-only・MP4/inspection未提供・異なる2目的・52回帰/参照9/時計15/現行19/最終4拒否は別々の実績。合算E2E件数にせず、upload006親exit未返却を別process exit0へ付け替えない。

## 3. 前件の完成物と次の一件

### 3.1 実判断計画の監査

[主report](reports/request-intent-real-judgment-20261002/README.md)、[evidence](reports/request-intent-real-judgment-20261002/evidence.json)、[readback](reports/request-intent-real-judgment-20261002/readback.mts)、run-local差分とcommitを照合。[新指示§1](work-orders/ZEV_DIGEST_PRESENTATION_INPUT_MAPPING_20261002_v001.md)にacceptを保存した。Mac上の相談役再実行ではない。

通常draft_eCg3g-IMIzEWMtJuMyJWB、計画agent_xKOu8eZKSNa5viNENtJ4L、検証agent_wGiuVx5QiJvjGUxEW8Qxa。runtime/artifacts/request-intent-real-judgment-20261002-v001/attempt-001/に保存。要求発行後に今回のCodex回答を逐次stdinへ戻し、固定purpose全文・要求SHA・回答SHA・registryを対応付けた。親7,073断片をkeep3,613/drop3,460で被覆。既存15:23案の区間・順序・時計は維持、心霊回帰1364–1370を12番目の比較対象として不採用理由を保存。

計画SHA cd69dd7fccfab6b4d0f266e6dddf56d5eae4c670283cd7caf467b9fde2925ee3、検証成果物SHA 735d6763afe6fcfabeb4c103871ee3a65368b96c9fa9df1a01f37717ace08f37、state SHA c62e3b38d00c8222f0918b52704e579f87a14346217fada6c9cd754fc6fccf3c。

時計は接続前27,691frame・923.033秒・40,705,770sample。完成MP4の観測値ではない。runner430.243秒のうち読了・判断・整形・受渡し404.711秒。純推論・製品一発速度ではない。通常4命令succeeded、別processでreused=true・保存結果一致・state不変。初回f1d71624失敗は保持、製品code差分0。

### 3.2 次指示 — 字幕演出入口の入力対応

**正本：[ZEV_DIGEST_PRESENTATION_INPUT_MAPPING_20261002_v001.md](work-orders/ZEV_DIGEST_PRESENTATION_INPUT_MAPPING_20261002_v001.md)。** 同じID9主線の限定読取準備であり、字幕演出の新判断・生成工事や本番権限は追加しない。本人の「終わったら次に進んで」に基づき具体的に指示する。

保存済み9区間・3,613保持断片から、既存字幕・演出入口の必須field、供給元path/SHA、未製造/未接続、旧成果再利用条件、最小接続差分を一案へまとめる。採用候補と保持区間を一対一と仮定せず、dropを復活させない。

静的起点は現行digest-plan-consumption-v001.ts、run_new_material_digest_20260926.mtsのbuildBaseAndDisplayRequests/acceptDisplay、adopted_media_manufacturing_v001.mtsのbuildAdoptedCaptionInputsV001等。既存字幕7A・構成7B・色/演出reportから必要なreaderへ辿る。

旧caption入力はbaseMediaInput・captionStyleTemplate・許可・実装版等も参照する。保存時計だけを完成baseMedia/timeline/receiptに偽装しない。旧固定plan/旧承認へ現行依頼を装わない。未製造が残ることは今回の入力対応調査の失敗ではない。

成果はdocs/reports/digest-presentation-input-mapping-20261002/のREADME.md、mapping.json、必要時map-inputs.mts。補助作成・実行時だけ設営18として個別計上。小JSON/既存コード読取・対応記録・一回の小再読に限定。製品adapter、新queue、内容再選定、表示/色/motion新回答、媒体read/hash/copy/PUT、backend/runner、STT/inspection/ffprobe/render/native QCは起動しない。presentation=not-connectedを維持する。

**前件acceptと次指示の返信全文は同じCodex2で受領済み。入力対応作成・設営18適用・小確認は実施済み。今回の監査受理は未受領。** [mapping](reports/digest-presentation-input-mapping-20261002/mapping.json)に実path/SHA・現行関数/入力field・保持3613/drop3460被覆・9区間frame/sampleを保存。詳細は新しいignored診断JSON（1,053,795bytes、SHA e6b4b7e4662600b219742b5f5adb067d692f4da9d2262de57e75201cf967b64f）。本文cue/演出判断はしていない。

旧7Bとの共通2435断片/旧末尾48除外/今回1178新規と、旧7Aの2330断片の本文・元ms一致を機械照合。版・表示境界・時計・style・承認が異なるため旧字幕/色/アップは再利用候補に留めた。背景media/timeline/manifest/receiptと今回表示/演出回答は未製造/未接続。最初の提案は既存本文準備を背景束縛から分離し、通常resolverで9表示要求へ渡す二path案。提案だけ保存し、製品code/API/queue/renderer/媒体は変更していない。通常commit/push・専用Edge直接報告へ進む。本人中継・受理だけの再commitは挟まない。

## 4. 必読資料

| 資料 | 用途 |
|---|---|
| [入力対応の現行指示](work-orders/ZEV_DIGEST_PRESENTATION_INPUT_MAPPING_20261002_v001.md) | 今回accept、唯一の次読取準備範囲・終点 |
| [前件親指示](work-orders/ZEV_DIGEST_REAL_JUDGMENT_LOCAL_20261002_v001.md)、[設営17](work-orders/ZEV_DIGEST_REAL_JUDGMENT_LOCAL_20261002_v001_PARENT_DIRECTORY_FIX.md) | 完了した限定実判断運転の目的・権限・失敗保持 |
| [実判断report/evidence](reports/request-intent-real-judgment-20261002/README.md) | 現在の通常保存計画・保持断片・時計・正規所有者 |
| [v005 §13](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md)、[通常接続report](reports/request-intent-connection-20261001/README.md) | 完成済み経路・通常保存・承認外。旧testを起動しない |
| [構成改善report](reports/selection-structure-improvement-20260930/README.md)、[案](reports/selection-structure-improvement-20260930/proposal-v001.json)、[独立点検](reports/selection-structure-improvement-20260930/independent-review.md) | 15:23案と比較理由、局所5本の対象版 |
| [9/28一次レビュー](reports/new-material-digest-human-review-20260928/README.md)、[9/29回答](reports/caption-readability-splitting-20260928/human-feedback-20260929-v001.md) | 制作要求、144px・条件付き分割、縁未選択 |
| [7A](reports/caption-readability-splitting-20260928/README.md)、[7B](reports/digest-structure-20260929/README.md)、[色](reports/caption-palette-20260929/README.md)、[統合](reports/integrated-preview-20260930/README.md) | 既存字幕・演出入力と再利用可能性。未取得は推測しない |
| [人間台帳](HUMAN_REVIEW_PENDING.md)、[開発計画](../相談役/方針/ZEV_開発計画.md) | 回答待ちと別エピックの整理 |

## 5. 人間回答・残課題

| 項目 | 保持する状態 |
|---|---|
| 字幕 | 144pxは肯定。分割は「読む必要がある文章でなかったら」の条件付き。無条件細分化にしない |
| 縁A/B | outlineChoice=null。A=8/4は技術入力、B=8/12は21論理不合格。実alphaによる保証免除なし |
| 色 | 水色・カラフル方向は肯定。強調範囲変更Bへの肯定なし。LightCoral技術不合格と好みは別 |
| アップ | 手指定1.2倍82frameは技術成立。HUD・人間品質・一般自動選択は未解決 |
| 内容 | 実判断の通常保存は今回受理。映像音声の自然さ、STT誤り、未見素材汎化・品質採用は別 |
| 10／11 | 旧10回答受領済み。R1〜R3修正版7点、鬼武者Q3-2は未回答。再実装しない |
| UI/制作負担 | 一件後修正/Resetは既存能力。一般の本人反映入口・実操作・全工程時間は別 |
| 8／12／14 | 別素材一般化は後続、Shortは今開始しない。性能第一期完了。Decisions等は副線 |
| 本適用 | ID9-PD-01一般委任、ID9-PD-02動画許可、旧state移行、本番・公開・人間品質は未承認/pending |

機能使用可・修正要求・実装・反映確認を分け、旧素材の肯定を別素材へ移さない。旧18 Color範囲や固定アップを今回計画へ自動適用しない。

## 6. 容量と旧証拠

本人承認整理は削除前04c21bfd・実績78805d86。8コピー35.79GiB削除、当時空き2.00→37.82GiB。33旧参照は再作成まで旧runtime即時再読不可。原本・STT/inspection・完成/確認媒体・判断/証拠/旧state保持。

upload006は3実体、MP4007は1実体、今回実判断はprepareの1実体4,803,412,827 bytesを保持。今回終了時空き12,933,283,840 bytesは過去観測。現在空き・SSDは未観測。次の入力対応は小JSONのみ。新copy・旧copy復元・追加削除・SSD移行は許可しない。

[整理記録](reports/request-intent-connection-20261001/queue-storage-cleanup-20261001-v001.json)、[旧1080p](reports/original-resolution-low-memory-20260930/full-run-report.md)。旧MP4 SHAは65afceb046aca0629b0fe097f602caae3b05697b10cff8eb6a295106185f3858。Mac動画をChatGPT sandboxから再生できると仮定しない。

## 7. 受け渡し・実稼働・Git

初回は相談役が一つのコードブロックを出し、本人が手貼りする。正本保存だけで稼働したと扱わない。開始後のGPT_DECISION/HUMAN_DECISION/NEXT_REQUESTはCodex専用Edgeから相談役へ直接送り、返信生成完了・全文読了まで受領して同じ指定範囲を続行する。実UI/通信障害以外は返信生成中を終了理由にしない。

報告先：ZEV Build Loop。
既存URL：https://chatgpt.com/g/g-p-6a8aab6b92308191b44f77a03945fed4-zevxiang-tan-yi/c/6abbcacc-8c98-83ee-9276-248a1d29b047
新セッションでは実際の報告先を照合する。専用タブのみ使用し、閉じていれば自分用を新設。tab IDは恒久固定しない。

main、担当fileだけ明示stage、stage/commit/push直列化。他者変更をreset/stash/削除/stageしない。branch/worktree・force push自己作成なし。Codex1は今回起動しない。

前の未調整案停止を保持し、当時の貼付を承認に遡及解釈しない。後の新指示受領と今回完了を分ける。Macの現processは相談役が直接観測していない。報告の残存0と次の実稼働を混同しない。

方針・指示・完了・中断は同じターンで正本へ記録する。自動監視・非同期作業を装わない。次の字幕/演出実装・動画工事の許可を今回の読取準備から推測しない。
