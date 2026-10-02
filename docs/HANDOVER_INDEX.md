# ZEV Build Loop — 引き継ぎインデックス

更新日：2026-10-03（JST） / revision：handover-index-20261003-v044
正本：f-kw/zev2 main の docs/HANDOVER_INDEX.md
固定入口：docs/ZEV_START_HERE.md。プロジェクトには固定入口の写しを置く。

**最新更新：f577bfbaedd1488b0e64c1f702002eb89a0fea68の字幕判断入力準備停止を監査。新二path初実装・設営19適用、型検査と旧正常小比較の通過を保存。新runnerが承認記録binding-input.jsonを目的本文保存物と取り違え、要求保存前にexit1。相談役は承認snapshot全体と別production-intent本文の二行照合を製品修正6、初回証拠を保持するattempt-002/bundleへの保存先追従を設営20として別々に個別承認。正本は[目的参照修正・保存先分離](work-orders/ZEV_DIGEST_CAPTION_JUDGMENT_INPUT_PREPARATION_20261003_v001_PURPOSE_REFERENCE_FIX.md)、指示保存0c94c3c9ebe37e61b4576e5c6eaec33927bb7cf5。親指示SHAと旧入力は不変。適用済み5/19、6/20は適用時に計上。修正受領・再稼働・完成は未確認。v005、実判断計画、入力対応のacceptは戻さない。**

## 0. 最初に読む

1. プロジェクトZEV_START_HERE.mdを全文読む。
2. GitHub mainの現在HEADを取得し、同一SHAの本書を全文読む。
3. [AGENTS](../AGENTS.md)、[監査プロトコル](CODEX_CHATGPT_AUDIT_PROTOCOL.md)、[人間確認方針](policies/HUMAN_REVIEW_ACCUMULATION_POLICY_v001.md)、[CURRENT_GOAL](CURRENT_GOAL.md)、§4の現行指示と必要な根拠を読む。
4. 役割・現在地・完了・残件・人間回答・指示と実稼働を復元する。取得不能・保存不能・Mac上の未観測を明示する。旧添付・会話要約・メモリだけで最新としない。

優先順：最新本人指示と適用範囲→現行個別指示→対応する実績と一次回答→本書→旧計画。無関係な日付だけで上書きしない。

v043と初回準備停止の全文は[f577bfba固定版](https://github.com/f-kw/zev2/blob/f577bfbaedd1488b0e64c1f702002eb89a0fea68/docs/HANDOVER_INDEX.md)へ保持。v042の入力対応は4556e389、v041実判断・設営17は7bb5de02、v039までの履歴はccd907a5固定版から辿る。旧「次の試験」「未完了」を後続acceptへ逆流させず、全過去工事を再走査・再実行しない。

## 1. 役割・目的・運用

ZEVは素材と制作意図から内容・構成・字幕・必要な演出を備えた、見ていて気持ちいい動画を作る基盤。主線はDigest、Shortは別系統。一本の生成成功や試験合格だけで製品完成としない。

- kawafmm：製品方向、任せる範囲、目視・好み、費用・契約・公開等の専決判断。通常技術監査・中継を担わせない。
- 相談役：残課題・優先順位・作業範囲・現物監査・具体指示と正本保存。
- Codex：指示内の実装・実行・検証・保存・通常commit/push・直接報告。人間品質を代理採用しない。

本人の「終わったら次に進んで」に従い、監査と実施可能な同じ主線の具体指示を同じ返答へつなぐ。任意の別エピック・本番・公開・費用・権限拡張へ広げない。

「独断で決めれる程度なら自動で承認して」はAGENTS条件内の相談役個別判断委任。一般上限・累積・強制停止・Codex自己承認権は変更しない。v005製品5/設営15、実判断補助16・親directory修正17、入力対応補助18、新準備補助19を保持。新二pathの初実装と過去の修正履歴を区別する。今回の個別承認は製品6/設営20、適用は未確認。新規実装やその修正を製品変更0とは報告しない。

必要な人間確認は[既存台帳](HUMAN_REVIEW_PENDING.md)へ蓄積。未回答を採用にせず、独立作業を進める。15分初見レビューや既回答を繰り返させない。

## 2. 完了済み・受理範囲

| 項目 | 根拠・成立範囲 | 戻してはいけないこと |
|---|---|---|
| 初稿と15分レビュー | 9/26初稿15:31.633、9/28レビュー、9/29字幕局所回答 | 新素材で初めて一本、初見レビュー再実施へ戻さない |
| 9.構成改善v001 | b69e168c受理。11候補/7採用/9保持、接続前15:23.033、局所540p5本/147字幕/111試験、終了68a32038 | 人間品質、新案1080p、汎化と別。白紙再選定を目的にしない |
| Codex1独立点検 | 9b72bc0f、対象bd0113c8、送信b93870fc。心霊回帰理由は後で補足 | 補足後版・局所媒体を独立点検済みにせず、再起動しない |
| 通常準備v002/後段v003/設計v004 | 11809f6f、7b600a64、d77f2a5dの限定受理 | 旧fixture合格を現行実走へ転用しない |
| **v005通常キュー接続** | **7c8f34ceを親v005 §13でaccept。受理df9fce02、共通状態a64465cb** | 技術完了。追加拒否・転送・型検査を増やさず、固定回答を実判断や本番品質にしない |
| **通常依頼の実判断付き計画一件** | **7bb5de02 accept。12候補/7採用/9保持、4工程complete、27,691frame/40,705,770sample、別process再読exit0** | 既見素材一件。映像音声・STT誤り・未見素材汎化・人間品質は別 |
| **字幕演出入口の入力対応** | **4556e389 accept。9区間/3,613保持断片/18項目、設営18補助exit0、小診断保存再読一致、元state不変** | 静的対応の完成であり、presentation consumer受理・新字幕・動画の完成ではない |
| 旧9:47案1080p/低メモリ | d7e46592。265字幕/307状態、345点QC、本体/replay/保存再読 | 新15:23案全編や通常アプリからの動画生成完成と別 |
| 字幕・演出・一件後修正 | 7A/7B/13、Panel/motion、Normal/Reset、性能第一期等の技術成立 | renderer、低メモリ、一件後修正を再実装しない |
| Decisions/Jev | 830ea968。9/30調査/36判断点/J16準備、実推論0 | 当時の未確認と現在の公開状況は別。主線停止理由にしない |

v005各suiteと正実走は別々の実績。件数を一つのE2Eへ合算しない。upload006親exit未返却を別process exit0へ付け替えない。

## 3. 現在の具体指示

**親正本：[字幕判断入力の準備接続v001](work-orders/ZEV_DIGEST_CAPTION_JUDGMENT_INPUT_PREPARATION_20261003_v001.md)**
**再開正本：[目的参照修正・保存先分離](work-orders/ZEV_DIGEST_CAPTION_JUDGMENT_INPUT_PREPARATION_20261003_v001_PURPOSE_REFERENCE_FIX.md)**

前件の監査と受理は親§1。現在の準備は未完了であり、今回のcontinueを完了acceptとしない。

### 3.1 入力と境界

受理済みruntime/artifacts/request-intent-real-judgment-20261002-v001/attempt-001/を小JSONのread-only入力にする。
- draft_eCg3g-IMIzEWMtJuMyJWB
- 計画agent_xKOu8eZKSNa5viNENtJ4L、検証agent_wGiuVx5QiJvjGUxEW8Qxa
- plan SHA cd69dd7fccfab6b4d0f266e6dddf56d5eae4c670283cd7caf467b9fde2925ee3
- execution SHA 735d6763afe6fcfabeb4c103871ee3a65368b96c9fa9df1a01f37717ace08f37
- state SHA c62e3b38d00c8222f0918b52704e579f87a14346217fada6c9cd754fc6fccf3c

正規owner/依存鎖/resolverと小JSONのSHAで入力を確認し、media実bytesは再検査しない。保存purpose・承認snapshotの「今回は字幕を作らない」は不変。親の準備scopeを別manifestへ束縛し、旧製造authorization.recordIdを偽装しない。

### 3.2 二つの新規実装と局所修正

旧adopted_media_manufacturing_v001.mtsは編集しない。本文準備の必要部分を新規evals/clip_composition/adopted_caption_judgment_inputs_v001.mtsへ限定派生し、新規runner/src/digest-caption-input-preparation-v001.tsのprepare/read関数から呼ぶ。旧builder/validator/reader/通常factory/index/backend/shared/rendererは変更しない。

f577bfbaで二path初実装・設営19補助・厳密型検査・preflightを確認。旧正常一区間658断片の純粋比較は準備前にassertionを通過した。実入力準備は承認参照の読み方が誤りで、CAPTION_PREPARATION_PURPOSE_CHANGED、exit1。意味入力・9要求・manifest保存0、別process再構築は未実施。初回失敗の証拠と既存54件のSHA不変を保持する。

製品修正6として、get(plan.approvedRequestBinding)の承認記録からrecord(intent.identity).approvedDraftを取り、既存approvedと全体deepEqualする。制作目的はstage('production-intent.json').productionIntentとdraft.purposeをequalする二行へ置換する。3判断要求の全文照合、正規owner/SHA/版検査は維持し、fallback・旧入力書換えはしない。

設営20としてprepare-test.mtsのNEWをruntime/artifacts/digest-caption-input-preparation-20261003-v001/attempt-002へ変更し、outputRoot・meaningPath・count・oldPrefixを同attempt-002/bundleへ揃える。旧root直下のparameters/old-inputs-before/failure/初回logと旧Git版は不変保持。記録の累積値・受領SHA・新attemptへの追従以外の修正を混ぜない。

親指示の実SHA c56aa5710696686778ac9cc5ab26787d35395b7c9d9b672db956f22ea09db209は不変。本追補を別の承認記録にし、元scopeBindingを付け替えない。新manifestは修正後の実装SHAを束縛する。

### 3.3 実行内容と終点

意味atom・9group・境界候補・表示要求を作り、全9inputに既存assertCaptionDisplayInputV001を適用する。candidate-0006の3非連続groupを保ち、keep3,613にdrop3,460や空白を戻さない。新cue/改行選択・各atom出力時計・演出判断はしない。

style/taskDescriptionはmappingのSHA確認済みsource templateのpromptInputを準備用技術参照として使う。36論理幅/2行/既存文字幅規則は今回の値で、144px正式styleや人間採用ではない。旧base・renderer job・承認は移植しない。

今回入力の実接続、旧正常小contextの純粋計算同等性、今回境界の最小拒否、別processの新readerによる再構築という親四群を維持。初回の比較通過を他の未実行項目に合算しない。新attemptの実行と過去観測を区別する。旧suite/QC/通常4工程の再実行を増やさない。

報告はdocs/reports/digest-caption-input-preparation-20261003/のprepare-test.mts、README.md、evidence.jsonへまとめ、詳細本文/要求は新ignored runtimeへ保存。新二pathと試験の必要型検査と既存file不変を確認する。

完成は判断入力の準備のみ。背景media/timeline/manifest/receipt、表示回答、source package、renderer job、native入力、演出、動画許可は未成立で残る。製品6/設営20の適用・新attempt実行・完成は本更新時点で未確認。

## 4. 今回読む根拠

| 資料 | 用途 |
|---|---|
| [目的参照修正追補](work-orders/ZEV_DIGEST_CAPTION_JUDGMENT_INPUT_PREPARATION_20261003_v001_PURPOSE_REFERENCE_FIX.md) | 製品6と設営20を別々に承認、正確な差分、新attempt、SHA/失敗保持、続行範囲 |
| [親準備接続指示](work-orders/ZEV_DIGEST_CAPTION_JUDGMENT_INPUT_PREPARATION_20261003_v001.md) | 準備のみの二path範囲、目的/style/検証/承認外。本文を変更しない |
| [初回停止report](reports/digest-caption-input-preparation-20261003/README.md)、[evidence](reports/digest-caption-input-preparation-20261003/evidence.json) | f577bfbaの未適用差分、型検査・部分比較・要求未保存、旧54件保全 |
| [入力対応report](reports/digest-presentation-input-mapping-20261002/README.md)、[mapping](reports/digest-presentation-input-mapping-20261002/mapping.json) | 18項目、実path/SHA、不足、旧再利用条件 |
| [入力対応の旧指示](work-orders/ZEV_DIGEST_PRESENTATION_INPUT_MAPPING_20261002_v001.md) | 完了した読取範囲・実判断accept |
| [実判断report](reports/request-intent-real-judgment-20261002/README.md)、[evidence](reports/request-intent-real-judgment-20261002/evidence.json) | 現保存計画、目的、3段階回答、時計、正規所有者 |
| [v005 §13](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md) | 通常キュー完成と承認外。旧testを起動しない |
| [構成改善report](reports/selection-structure-improvement-20260930/README.md)、[独立点検](reports/selection-structure-improvement-20260930/independent-review.md) | 15:23案と採否理由、局所5本対象版 |
| [9/28レビュー](reports/new-material-digest-human-review-20260928/README.md)、[9/29回答](reports/caption-readability-splitting-20260928/human-feedback-20260929-v001.md) | 導入/説明/締め、144px/条件付き分割/縁未選択 |
| [人間台帳](HUMAN_REVIEW_PENDING.md)、[開発計画](../相談役/方針/ZEV_開発計画.md) | 未回答・別エピック |

## 5. 人間回答と残課題

144pxと「読む必要がある文章でなかったら」の分割肯定、水色・カラフル方向肯定は保持。縁A=8/4は技術入力、outlineChoice=null、縁B=8/12は21論理不合格。実alphaで保証免除しない。強調範囲変更Bの未肯定、LightCoral技術不合格と好みの区別、固定アップ1.2倍82frameのHUD/人間品質/自動選択未解決も保持する。

旧10回答は受領済み。R1〜R3修正版7点と鬼武者Q3-2は未回答。一件後修正/Resetは既存能力、一般本人反映入口と実操作負担は別。別素材一般化は後続、Shortは今開始しない。性能第一期は完了。

旧7Bの2,483断片のうち今回共通2,435、旧末尾48は除外、今回1,178は旧7Bにない。旧7Aの共通2,330は本文/元ms/発話ID一致だが発話artifact bytesは別。これを旧回答全体の互換にしない。旧307状態/18色/82frameアップを移植しない。

presentation=not-connected、executionPermission=not-approved、humanQuality=pending、outlineChoice=null。ID9-PD-01一般本適用/ID9-PD-02動画許可、旧state移行、本番、公開、人間採用は別の未承認事項。新レビューを準備作業の開始条件にしない。

## 6. 容量と旧証拠

本人承認整理は04c21bfd/78805d86。8コピー35.79GiB削除、33旧参照は再作成まで旧runtime即時再読不可。元動画/STT/inspection/完成媒体/判断/証拠/旧stateは保全。

upload006の3実体、MP4007の1実体、実判断運転の1実体4,803,412,827bytesは保持。実判断終了時空き12,933,283,840bytesは過去観測。現在空き・SSDは未観測。今回新copy/媒体read/hash/PUT/旧copy復元/追加削除/SSD操作は禁止。

## 7. 受け渡し・実稼働・Git

初回は相談役の一つのコードブロックを本人手貼り。開始後はCodex2が専用Edgeで同じZEV Build Loopへ直接送り、返信生成完了・全文読了まで受領して指定範囲を続行する。実UI/通信障害以外は返信生成中を終了理由にしない。各担当は自分専用タブだけを使い、tab IDを恒久固定しない。

既存報告先：https://chatgpt.com/g/g-p-6a8aab6b92308191b44f77a03945fed4-zevxiang-tan-yi/c/6abbcacc-8c98-83ee-9276-248a1d29b047
新セッションでは実際の報告先を照合する。

main・担当fileのみ明示stage、stage/commit/push直列化。他者変更をreset/stash/削除/stageしない。branch/worktree/force pushを自己判断で作らない。Codex1起動・受理だけの再commitは不要。

旧未調整案停止を保持し、当時の貼付を承認へ遡及変換しない。現在の準備接続は個別指示の範囲のみ。f577bfbaまでの停止・対象process終了はCodex報告と保存記録で、相談役のMac直接観測ではない。正本保存・指示発行だけで新作業が動いたとしない。

方針・指示・完了・中断は同じターンで正本保存する。自動監視/非同期作業を装わない。完成後の字幕回答・演出・動画製造は次の明示判断まで開始しない。
