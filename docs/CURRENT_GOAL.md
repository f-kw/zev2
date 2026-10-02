# CURRENT_GOAL — 現在の目的と復元入口

更新日：2026-10-03（JST）

## 1. 復元

プロジェクトのZEV_START_HERE.mdを全文読み、GitHub mainの現在HEADと同一SHAの[HANDOVER_INDEX](HANDOVER_INDEX.md)、現行指示を読む。保存・発行・受領・実行・技術受理・人間採用を区別する。

更新前全文と初回準備停止は[f577bfba固定版](https://github.com/f-kw/zev2/blob/f577bfbaedd1488b0e64c1f702002eb89a0fea68/docs/CURRENT_GOAL.md)に保持。入力対応checkpointは4556e389、実判断運転・設営17は7bb5de02、v005の履歴はccd907a5固定版から辿る。過去の未完了・次の試験を現在へ戻さない。

## 2. 完了・監査受理

**v005通常キュー接続は技術完了。** 成果7c8f34ceに対する[親v005 §13](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md)のacceptを維持し、再検証工事へ戻さない。

**通常依頼から実判断付きDigest計画一件も7bb5de02でaccept。** 12候補・7採用・9保持、keep3,613/drop3,460、通常4工程succeeded、27,691frame/40,705,770sample、別process再読exit0。既存15:23案の区間・順序・時計は維持し、心霊回帰会話を正式比較へ追加した。実AIの未見素材汎化・映像音声・人間品質とは別。

**字幕演出入口の入力対応は4556e389fc6cb2a9933f98bd5d83716324ef8b01でaccept。** 9区間・3,613断片・18項目の供給元/不足/再利用条件・最小案を保存。設営18補助exit0、小診断一回再読bytes一致・元state不変。監査はreport/mapping/小補助/現行関数/5file差分の照合であり、Macの全runtime再実行やpresentation consumer受理ではない。

判定と準備接続指示は[字幕判断入力の準備接続v001](work-orders/ZEV_DIGEST_CAPTION_JUDGMENT_INPUT_PREPARATION_20261003_v001.md)§1、保存34be96102a430b475e7d2bf4b58583bd92110ede。

15分初稿レビュー、構成改善v001の実案・局所検証、一件後修正/Reset、旧9:47案1080p低メモリ製造は既存完了範囲を保持する。

## 3. 現在の一件 — 字幕判断入力の準備接続

**f577bfbaの初回準備は目的参照位置の誤りでexit1。相談役は製品修正6と設営20を別々に個別承認した。準備の技術完了は未認定。**

親正本：[ZEV_DIGEST_CAPTION_JUDGMENT_INPUT_PREPARATION_20261003_v001.md](work-orders/ZEV_DIGEST_CAPTION_JUDGMENT_INPUT_PREPARATION_20261003_v001.md)。kawafmm承認済みID9主線と「終わったら次に進んで」に基づく準備接続のみ。

再開正本：[目的参照修正・保存先分離](work-orders/ZEV_DIGEST_CAPTION_JUDGMENT_INPUT_PREPARATION_20261003_v001_PURPOSE_REFERENCE_FIX.md)、指示保存0c94c3c9ebe37e61b4576e5c6eaec33927bb7cf5。同じCodex2が返信全文を受領し、attempt-002で続行する。本人の再手貼りや技術判断の転記は不要。

### 3.1 維持する実装と終点

通常保存計画から意味atomと区間別表示要求9件を組み立て、保存して再構築する。回答・製造はしない。

旧adopted_media_manufacturing_v001.mtsは直接編集せず、本文/group/要求生成の必要な純粋計算だけを新規adopted_caption_judgment_inputs_v001.mtsへ限定派生し、新規runner/src/digest-caption-input-preparation-v001.tsから呼ぶ。旧builderの切替もしない。既存validator/owner/resolverを再利用し、reader/製造の大量複製はしない。

元入力はdraft_eCg3g-IMIzEWMtJuMyJWBの受理済みstate/plan/execution/採否保持/STT/共通発話/時計。正規依存鎖と小JSONの実SHAを確認する。旧purpose・承認snapshotの「今回は字幕を作らない」は不変。親正本の準備scopeを新manifestに別束縛し、旧製造許可へ偽装しない。

style/taskDescriptionはmappingでSHA確認済みの旧source templateのpromptInputを準備用技術入力に限定して使用する。36論理幅/2行/既存文字幅規則は今回の参照値であり、144px正式style・縁選択を確定するものではない。将来変更は新要求版で扱う。

9保持区間をcandidateIdだけでまとめずsegmentId/順序/断片列で扱う。3,613保持atomと境界候補を決定的に作り、drop3,460や区間間の空白を復活させない。表示回答・cue/行末・各atom出力時計・演出は作らない。

### 3.2 今回の二つの個別修正

A（製品修正6）：新runnerのget(plan.approvedRequestBinding)が返すbinding-inputは承認記録で、productionIntent直下参照は誤り。承認snapshot全体をrecord(intent.identity).approvedDraftとapprovedでdeepEqualし、目的本文は正規stage('production-intent.json').productionIntentとdraft.purposeでequalする二行へ置換する。他の3判断要求の目的全文・owner・SHA・版検査は維持する。

B（設営20）：prepare-test.mtsのNEWをruntime/artifacts/digest-caption-input-preparation-20261003-v001/attempt-002にし、PARAMS.outputRoot・meaningPath・count・oldPrefixの四箇所を同attempt-002/bundleへ揃える。新parameters/保全一覧/否定fixture/proofだけを新先へ置き、初回rootのparameters・失敗・old-inputs-beforeを上書きしない。

親正本の実SHA c56aa5710696686778ac9cc5ab26787d35395b7c9d9b672db956f22ea09db209は維持。本追補は別の修正承認として記録し、元scopeBindingを付け替えない。新準備は修正後の新runner実装SHAへ束縛する。

確認は今回入力の実接続、既存の小同等性確認、今回境界の最小拒否、別process再構築一回という親の四群のまま。初回旧正常一区間658断片の比較通過は部分成立として保持し、未実施の保存・再読の合格と合算しない。旧suite・通常4工程・動画QCを繰り返さない。完成source package・背景4参照・renderer jobは未生成のまま残す。

適用済み累積は製品修正5／設営19、新二path初回実装。今回承認は適用時に製品6／設営20として別々に計上。一般上限・強制停止・旧履歴をリセットせず、別不具合を混ぜない。

## 4. 容量と保全

本人承認の旧8コピー35.79GiB削除、33旧参照の再作成要という履歴を維持。旧runtime全体の即時再読を認定しない。006/007と実判断運転の正実走・保存再読は別の完了実績。

実判断運転の追加媒体は通常prepareの一つ4,803,412,827 bytes。終了時空き12,933,283,840 bytesは過去観測。今回も小JSONだけで、新媒体read/hash/copy/PUT・旧copy復元・容量整理・SSD操作・追加削除を許可しない。現在空き・Mac processは相談役が直接観測していない。

## 5. 承認外・人間回答

presentation=not-connected／executionPermission=not-approved／humanQuality=pending／outlineChoice=null。ID9-PD-01一般本適用、ID9-PD-02動画許可、旧業務state移行、本番、未見素材の実AI品質、人間採用、公開は未承認。

144pxと「読む必要がある文章でなかったら」の条件付き分割、水色肯定、縁B21論理不合格、他色/強調・アップ・修正版7点・鬼武者Q3-2は[人間台帳](HUMAN_REVIEW_PENDING.md)と一次回答へ保持。済んだレビューを再要求しない。旧字幕/307状態/18色/82frameアップを一括移植しない。

前の未調整案停止を保持し、当時の貼付を承認に遡及変換しない。現行の明示指示と実受領を区別する。

## 6. 起動・問い合わせ・Git

初回は本人手貼り。開始後はCodex2専用Edgeから同じZEV Build Loopへ直接送信し、返信生成完了・全文読了まで受領する。本人を通常の中継役へ戻さない。

準備接続の受領・新二path初回実装・設営19適用・局所exit1はCodex報告と保存証拠で確認。製品6／設営20の受領・適用・attempt-002実行・完成は未確認。相談役はMacの実processを直接観測していない。

main、担当fileのみ明示stage、他者変更保全、stage/commit/push直列化。Codex1起動・受理だけの再commitは不要。今回完了から字幕回答・演出・動画工事へ自動着工しない。

## Codex2 checkpoint — 2026-10-03 字幕判断入力準備の初回局所停止

f577bfba固定版の履歴：8c96aa62から新規二pathと設営19を実装。対象型検査・export/出力不存在確認、旧正常一区間の純粋比較を通過。実入力準備は承認保存参照から目的文を取り出す位置の誤りでexit1。要求保存/別process再構築は未完了。初回失敗証拠と旧入力54件不変を[主report](reports/digest-caption-input-preparation-20261003/README.md)へ保存。媒体/通常HTTP/判断/描画/費用0、既存受理・人間Pendingは不変。この停止を今回の承認や後続成功へ付け替えない。

## Codex2 完了checkpoint — 2026-10-03 字幕判断入力の準備接続

追補最終返信を専用Edgeで全文受領、f5ca9bcbへ同期。製品修正6の承認snapshot/目的保存物を分ける二行と、設営20の新保存先対応だけ適用。attempt-002/bundleに意味入力・9要求・準備manifestを保存。3,613atom/9group、候補6三範囲、drop混入0、元本文/ms/順序/style一致。今回一系列内の旧正常658断片比較、最小拒否11条件、別process再構築一回はすべてexit0。manifest実SHA 83052a914317ae8b5a056ff641635ff061ebf59830df68a8090d180f2f0cfb75、元JSON/既存実装54件SHA不変。初回exit1/f577bfba/失敗runtimeは不変に残る。新二path初実装と累積製品6/設営20は別記、一般上限不変。

詳細は[主report](reports/digest-caption-input-preparation-20261003/README.md)と[evidence](reports/digest-caption-input-preparation-20261003/evidence.json)。媒体/通常HTTP/判断/製造/費用0、元scope/purposeと人間Pendingは不変。完成は準備のみで表示回答・背景4出力・renderer接続・動画許可は未成立。担当差分の通常commit/pushと直接報告へ進む。相談役の監査受理とは区別する。
