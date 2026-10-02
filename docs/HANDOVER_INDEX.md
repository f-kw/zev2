# ZEV Build Loop — 引き継ぎインデックス

更新日：2026-10-03（JST） / revision：handover-index-20261003-v043
正本：f-kw/zev2 main の docs/HANDOVER_INDEX.md
固定入口：docs/ZEV_START_HERE.md。プロジェクトには固定入口の写しを置く。

**最新更新：4556e389fc6cb2a9933f98bd5d83716324ef8b01の字幕演出入力対応を相談役accept。9区間・3,613保持断片・18項目の対応/不足/再利用条件は完成。次は意味atomと表示要求9件の準備・保存・再構築だけ。旧製造fileは直接編集せず、必要な純粋計算を新規fileへ限定派生し、新runner準備moduleから呼ぶ二pathに調整した。新指示保存34be96102a430b475e7d2bf4b58583bd92110ede。表示回答・新演出・背景4出力・動画・本番は許可しない。既存累積製品5/設営18、新試験補助は適用時のみ設営19。新指示の受領・実装・実行・完成は未確認。**

## 0. 最初に読む

1. プロジェクトZEV_START_HERE.mdを全文読む。
2. GitHub mainの現在HEADを取得し、同一SHAの本書を全文読む。
3. [AGENTS](../AGENTS.md)、[監査プロトコル](CODEX_CHATGPT_AUDIT_PROTOCOL.md)、[人間確認方針](policies/HUMAN_REVIEW_ACCUMULATION_POLICY_v001.md)、[CURRENT_GOAL](CURRENT_GOAL.md)、§4の現行指示と必要な根拠を読む。
4. 役割・現在地・完了・残件・人間回答・指示と実稼働を復元する。取得不能・保存不能・Mac上の未観測を明示する。旧添付・会話要約・メモリだけで最新としない。

優先順：最新本人指示と適用範囲→現行個別指示→対応する実績と一次回答→本書→旧計画。無関係な日付だけで上書きしない。

v042の全文と入力対応checkpointは[4556e389固定版](https://github.com/f-kw/zev2/blob/4556e389fc6cb2a9933f98bd5d83716324ef8b01/docs/HANDOVER_INDEX.md)へ不変保持。v041実判断・設営17は7bb5de02、v039までの履歴はccd907a5固定版から辿る。旧「次の試験」「未完了」を後続acceptへ逆流させず、全過去工事を再走査・再実行しない。

## 1. 役割・目的・運用

ZEVは素材と制作意図から内容・構成・字幕・必要な演出を備えた、見ていて気持ちいい動画を作る基盤。主線はDigest、Shortは別系統。一本の生成成功や試験合格だけで製品完成としない。

- kawafmm：製品方向、任せる範囲、目視・好み、費用・契約・公開等の専決判断。通常技術監査・中継を担わせない。
- 相談役：残課題・優先順位・作業範囲・現物監査・具体指示と正本保存。
- Codex：指示内の実装・実行・検証・保存・通常commit/push・直接報告。人間品質を代理採用しない。

本人の「終わったら次に進んで」に従い、監査と実施可能な同じ主線の具体指示を同じ返答へつなぐ。任意の別エピック・本番・公開・費用・権限拡張へ広げない。

「独断で決めれる程度なら自動で承認して」はAGENTS条件内の相談役個別判断委任。一般上限・累積・強制停止・Codex自己承認権は変更しない。v005製品5/設営15、実判断補助16・親directory修正17、入力対応補助18を保持。次の新2path初回実装と過去の修正履歴を区別し、新試験補助は適用時だけ設営19とする。製品追加を製品変更0と報告しない。

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
| **字幕演出入口の入力対応** | **4556e389を今回accept。9区間/3,613保持断片/18項目、設営18補助exit0、小診断保存再読一致、元state不変** | 静的対応の完成であり、presentation consumer受理・新字幕・動画の完成ではない |
| 旧9:47案1080p/低メモリ | d7e46592。265字幕/307状態、345点QC、本体/replay/保存再読 | 新15:23案全編や通常アプリからの動画生成完成と別 |
| 字幕・演出・一件後修正 | 7A/7B/13、Panel/motion、Normal/Reset、性能第一期等の技術成立 | renderer、低メモリ、一件後修正を再実装しない |
| Decisions/Jev | 830ea968。9/30調査/36判断点/J16準備、実推論0 | 当時の未確認と現在の公開状況は別。主線停止理由にしない |

v005各suiteと正実走は別々の実績。件数を一つのE2Eへ合算しない。upload006親exit未返却を別process exit0へ付け替えない。

## 3. 現在の具体指示

**正本：[ZEV_DIGEST_CAPTION_JUDGMENT_INPUT_PREPARATION_20261003_v001.md](work-orders/ZEV_DIGEST_CAPTION_JUDGMENT_INPUT_PREPARATION_20261003_v001.md)**

前件の監査と受理は同書§1。GitHub上のreport/mapping/map-inputs/現行関数/5file差分を照合した。Macの約1.01MiB診断・全媒体を相談役が直接再実行したものではない。

### 3.1 入力と境界

受理済みruntime/artifacts/request-intent-real-judgment-20261002-v001/attempt-001/を小JSONのread-only入力にする。
- draft_eCg3g-IMIzEWMtJuMyJWB
- 計画agent_xKOu8eZKSNa5viNENtJ4L、検証agent_wGiuVx5QiJvjGUxEW8Qxa
- plan SHA cd69dd7fccfab6b4d0f266e6dddf56d5eae4c670283cd7caf467b9fde2925ee3
- execution SHA 735d6763afe6fcfabeb4c103871ee3a65368b96c9fa9df1a01f37717ace08f37
- state SHA c62e3b38d00c8222f0918b52704e579f87a14346217fada6c9cd754fc6fccf3c

正規owner/依存鎖/resolverと小JSONのSHAで入力を確認し、media実bytesは再検査しない。保存purpose・承認snapshotの「今回は字幕を作らない」は不変。新指示の準備scopeを別manifestへ束縛し、旧製造authorization.recordIdを偽装しない。

### 3.2 二つの新規実装だけ

提案の旧adopted_media_manufacturing_v001.mts編集は採らない。旧live SHAを維持するため、本文準備の必要部分を新規evals/clip_composition/adopted_caption_judgment_inputs_v001.mtsへ限定派生。新規runner/src/digest-caption-input-preparation-v001.tsのprepare/read関数から呼ぶ。旧builder/validator/reader/通常factory/index/backend/shared/rendererを変更しない。

意味atom・9group・境界候補・表示要求を作り、全9inputに既存assertCaptionDisplayInputV001を適用する。candidate-0006の3非連続groupを保ち、keep3,613にdrop3,460や空白を戻さない。新cue/改行選択・各atom出力時計・演出判断はしない。

style/taskDescriptionはmappingのSHA確認済みsource templateのpromptInputを準備用技術参照として使う。36論理幅/2行/既存文字幅規則は今回の値で、144px正式styleや人間採用ではない。旧base・renderer job・承認は移植しない。

新保存領域はruntime/artifacts/digest-caption-input-preparation-20261003-v001/attempt-001/。意味入力、9要求、元参照/style/実装/今回scopeのmanifestだけ。旧attemptや通常stateへ書かず、新queue成果物/completeを名乗らない。

### 3.3 確認と終点

今回の実入力接続、旧正常な小contextでの純粋計算同等性、今回境界の最小拒否、別processの新readerによる再構築一回。本文・順序・境界・styleを比較から除外しない。旧suite/QC/通常4工程を再実行しない。

報告はdocs/reports/digest-caption-input-preparation-20261003/のprepare-test.mts、README.md、evidence.jsonへまとめ、詳細本文/要求はignored runtimeへ保存する。新二pathと試験の必要型検査を行い、旧file不変を照合する。

完成は判断入力の準備のみ。背景media/timeline/manifest/receipt、表示回答、source package、renderer job、native入力、演出、動画許可は未成立で残る。新指示の受領・二path実装・設営19適用・完成は発行時点で未確認。

## 4. 今回読む根拠

| 資料 | 用途 |
|---|---|
| [現行準備接続指示](work-orders/ZEV_DIGEST_CAPTION_JUDGMENT_INPUT_PREPARATION_20261003_v001.md) | 唯一の次実装範囲、変更した提案、目的/style/保存/検証/承認外 |
| [入力対応report](reports/digest-presentation-input-mapping-20261002/README.md)、[mapping](reports/digest-presentation-input-mapping-20261002/mapping.json) | 18項目、実path/SHA、不足、旧再利用条件 |
| [入力対応の旧指示](work-orders/ZEV_DIGEST_PRESENTATION_INPUT_MAPPING_20261002_v001.md) | 完了した読取範囲・前の実判断accept |
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

旧未調整案停止を保持し、当時の貼付を承認へ遡及変換しない。現在の準備接続はこの個別指示で範囲を明示したもの。前件残存0はCodex報告であり、相談役はMacの現processを直接観測していない。保存・発行だけで新作業が動いたとしない。

方針・指示・完了・中断は同じターンで正本保存する。自動監視/非同期作業を装わない。完成後の字幕回答・演出・動画製造は次の明示判断まで開始しない。

## Codex2 checkpoint — 2026-10-03 字幕判断入力準備の局所停止

8c96aa62から新規二pathと設営19を実装。厳密な対象型検査・export/出力不存在確認、旧正常一区間の純粋比較を通過。実入力準備は承認保存参照から目的文を取り出す位置の誤りでexit1、要求保存/別process再構築は未完了。正規参照は準備記録内の承認snapshotを指し、制作要求本文は別の保存物にある。最小未適用差分・初回失敗証拠・旧入力前後不変を[主report](reports/digest-caption-input-preparation-20261003/README.md)へ保存。製品修正5/設営19を維持し、製品6/設営20となる修正・新隔離再走についてGPT_DECISIONする。追加作用は停止中。媒体/通常HTTP/判断/描画/費用0、既存受理・人間Pendingは不変。
