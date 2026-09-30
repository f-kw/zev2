# ZEV Build Loop — 引き継ぎインデックス

更新日：2026-10-01（JST） / revision：handover-index-20261001-v008
正本：`f-kw/zev2` の `main` 上の `docs/HANDOVER_INDEX.md`
固定入口：`docs/ZEV_START_HERE.md`。ChatGPTプロジェクトには、この固定入口の写しを置く。

**最新更新：v003は`7b600a648cf4ee5228601b72b0a6b6629038fa75`で限定技術受理済み。[v004](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v004.md)をCodex2がee032be8で受領し、[最小仕様案一つ](reports/request-intent-connection-20261001/queue-integration-contract-proposal-v001.md)と保存実物の境界10件・別process再読を保存。製品コード・公開契約・承認方式の変更0。通常commit/push後、GPT_DECISION＋NEXT_REQUESTを専用Edgeから直接送り、次の限定差分を同じセッションで受領する。§2.6を参照。**

本書は現在地を短く復元する入口。過去の発行時点の長い重複説明は、[v007全文の固定版](https://github.com/f-kw/zev2/blob/7b600a648cf4ee5228601b72b0a6b6629038fa75/docs/HANDOVER_INDEX.md)と個別指示・reportに原文を保持する。過去の「未確認」「次」を現在へ逆流させない。

## 0. 最初に読む人へ

新セッション、コンテキスト圧縮後、担当交代時は、次の仕事を提案する前に本書を全文読む。

1. GitHub接続でmainの現在HEADを取得し、同一SHAの本書と必要資料を読む。検索スニペットだけで読了にしない。
2. 本書の状態は保存時点の記録。照合基準より新しい関連報告・個別指示があれば差分を読む。無関係な新日付で判断を上書きしない。
3. [AGENTS](../AGENTS.md)、[監査プロトコル](CODEX_CHATGPT_AUDIT_PROTOCOL.md)、[人間確認方針](policies/HUMAN_REVIEW_ACCUMULATION_POLICY_v001.md)を読み、§4の必読資料へ進む。過去の全動画・全資料の毎回再走査は不要。
4. 役割、現在の主作業、完了済み、残件、人間回答、担当と稼働確認、次に許可された行動を根拠から復元し、未取得・未確認を明示する。
5. GitHubを取得できない場合、メモリ・旧添付で最新状態を認定せず、未確認の工事・再試行・再レビューを始めない。

優先順位：最新のユーザー明示決定とその適用範囲 → 現行の承認済み個別指示 → 対応する実績・人間回答の一次記録 → 本書の要約 → 旧計画・旧引き継ぎ・メモリ。矛盾は出所と対象版を確認し、黙って混ぜない。

## 1. 役割・製品目的・運用

ZEVは、素材と制作意図から、内容・構成・字幕・必要な演出を持つ、見ていて気持ちいい動画を作る基盤。DigestとShortは別系統、現在の主線はDigest。技術検査、短尺化、演出数、一本生成できたことだけを製品品質の達成にしない。

- キョウカさん（kawafmm）：製品方向、任せる範囲、目視・好み、費用・契約・公開等の専決判断。通常の技術監査・課題整理・中継を担わせない。
- ZEV相談役（このChatGPT）：全体の残課題・優先順位・作業範囲・独立監査・次指示。直近の完成報告だけで次工程を飛躍させない。
- Codex：個別指示内の実装・実行・試験・証拠保存・通常commit/push・直接報告。人間採用の代理認定はしない。

### 人間負荷

人間の時間は限られる。必要な確認は[既存台帳](HUMAN_REVIEW_PENDING.md)へ蓄積し、それに依存しない承認済み作業は進める。未回答を採用へ変えず、未回答だけで全体を止めない。任意の別エピックへ無断移動する許可ではない。

既回答を問い直さず、人に全編から問題を探させない。長尺の反復比較、全字幕採点、正解区間の手作業ラベル付けを標準工程にしない。新しく人間しか決められない問いだけ対象・前後文脈を絞る。本当に全体評価が必要な場合も、済んだレビューを未実施へ戻さない。

### 受け渡し・Edge

最初の起動・再起動指示は、ユーザーへ全文コピーできる一つのテキストコードブロックで渡す。保存だけで受領・起動・稼働済みにしない。着手後のGPT_DECISION／AUDIT_ONLY／完了報告はCodex自身が相談役会話へ直接送る。通常技術判断を人間へ転記させない。相談役はGitHubの現物を監査し、Mac上の媒体を直接観測していない場合はその限界を明示する。

Edgeは各Codex・各セッションが自分専用のタブだけを使う。他担当・ユーザーのタブは共有・流用・操作しない。使えなければ自分用を新設し、tab IDを恒久固定しない。[AGENTS固定方針](../AGENTS.md#固定方針)、保存 `743a53d21387123f2cab48fe8a9cc72242f2437b`。別チャット送信権限を増やしたものではない。

確認済み相談役会話名：**ZEV Build Loop**。
確認済み報告先：`https://chatgpt.com/g/g-p-6a8aab6b92308191b44f77a03945fed4-zevxiang-tan-yi/c/6abbcacc-8c98-83ee-9276-248a1d29b047`。
新セッションへ移ったら新報告先を確認して一度知らせ、本欄を更新する。URLを推測せず、旧会話への未送信を送信済みにしない。

## 2. 最新状態のカプセル

最新技術監査対象：`7b600a648cf4ee5228601b72b0a6b6629038fa75`。今回の指示・状態更新commitとは区別する。

| 担当／項目 | 到達点 | 残件・扱い |
|---|---|---|
| Codex2：旧9分47秒案の1080p生成 | `d7e465925c6277a08248b4207d7df8951e988895`。265字幕・307状態、全345点native QC・本体/replay一致・共有保存・独立再読。低メモリ化を含め技術受理済み | 再実装・再生成しない。全レビュー課題解消・人間採用ではない |
| Codex1：Decisions API / Jev代替評価 | `830ea96811c94e5794f751914e835e20977ce126`。36判断点、J16比較326字幕（53/273）を固定。調査完了 | 調査時点で実行仕様・価格・access未確定、実推論0・本番0。今回接続の依存にしない。現時点公開状況は必要時に公式で確認 |
| Codex2：ID9採用区間・構成案 | `b69e168cf1d34f21d7b760bdebcd9e19baca69c7`を受理。11候補・7採用・9保持、27,691frame（15:23.033）の案、旧版差分、局所540p5本・147字幕、111試験、別process再読 | 送信実績`68a32038ebcd6dbee62454deca8999bd3d27d33c`・Git終了受領済み。人間品質・新案1080p・汎化は未認定 |
| Codex1：ID9独立点検 | 点検`9b72bc0fed58684a2cdd8d012ff3757443cfcd18`、対象案`bd0113c8301e49eb74993385286fd12c1b9894b8`を受理。送信実績`b93870fcafbf5671b45ada02cc1f8217478fac86`・Git終了受領済み | 担当終了。後続補足・局所媒体を点検済みへ広げず、再起動・再点検・自動監視不要 |
| Codex2：通常callerの計画準備v002 | `11809f6f6bebed82014971c966b79b383b921a1d`を技術受理。通常API→承認・claim→実factory→3判断→別保存・再開・再読。27結果・21捕捉 | 明示依存だけで有効。通常index既定・一テーマ確認・公開API不変。固定provider配線試験であり実AI品質ではない |
| Codex2：保存計画の後段入力v003 | `7b600a64`を今回技術受理。個々の保持を既存Digest形式へ変換、job形状／時計検査、4出力保存・再読。15結果＋5拒否、旧計画消費・保全 | 通常push・Git clean・staged0・untracked0・Git操作終了の報告を受領。通常完了登録・後続キュー・実製造・人間採用は未接続／未認定 |
| Codex2：次のv004 | 通常キューに必要な最小仕様案・変更範囲と、保存実物による既存境界実測を同じセッションで行う指示発行済み | 受領・再開未確認。製品コード・公開契約・本番defaultの変更は今回許可していない。§2.6参照 |

共通状態の保存担当は今回相談役へ返却済み。Macのprocess一覧・ローカルGit状態は相談役が直接観測しておらず、Codexの実測報告とremote確認を区別する。指示発行・受領・作業中を混同しない。

旧1080p媒体：[完了報告](reports/original-resolution-low-memory-20260930/full-run-report.md)、SHA `65afceb046aca0629b0fe097f602caae3b05697b10cff8eb6a295106185f3858`。実体はMacの `runtime/artifacts/original-resolution-execution-20260930-v001/full-lowmem-production-001/`。GitHubやChatGPT sandboxで再生できると仮定しない。

旧メモリ工事は84区間・最大22入力・逐次producer＋単一encoderで完了。旧失敗・背景・AAC・PNGは保持、停止漏れも監視v002で修正済み。50GB開始・12GB保持・RSS16GiB等は当該実走限定値であり、今回へ転用しない。

### 2.1 Codex1補足指示の履歴

原文は[v007固定版](https://github.com/f-kw/zev2/blob/7b600a648cf4ee5228601b72b0a6b6629038fa75/docs/HANDOVER_INDEX.md)と[独立点検](reports/selection-structure-improvement-20260930/independent-review.md)。心霊回帰会話001364〜001370／断片25926〜26131の採否理由だけ補足を指示した。追加採用・再生成・人間回答は強制していない。

### 2.2 2026-10-01：ID9 v001の技術受理と両担当の終了

[主report](reports/selection-structure-improvement-20260930/README.md)の一案・差分・局所検証を受理済み。心霊回帰会話は主題関連を認めたうえで、退勤後に未確定の噂を再開しないという不採用理由を相談役受理、9保持は不変。両担当の送信実績・Git終了は上表のSHAで確定。旧未確認を再作業にしない。補足版・媒体のCodex1点検、実声／映像の事実、自然さ、網羅性、人間採用、新案1080pは未認定のまま。

### 2.3 通常依頼入力の追跡v001

[指示v001](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v001.md)、保存`05c042ae3efe69e8ef0157a2db2614a3b8fa1c7f`。`cc288f8ea5d0ab0937ffb74b952fcf5826616209`で通常目的の保存・7命令への伝達と、Digest3判断の通常caller欠落を確認。型の存在を接続完成にしていない。

### 2.4 通常factoryへの限定追加v002

[指示v002](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v002.md)、保存`54931a3ab289e5ab826fac64d6ba0cebd9fdc300`。通常factoryの文字起こし検証後、明示準備依存がある場合だけ既存3判断を呼ぶ。通常request／承認snapshot・素材・目的全文・条件・要求SHAを検査し、別領域へ保存・再開・再読。通常出力・人間確認・公開API・本番既定は不変。`11809f6f`で限定受理済み。詳細は[通常接続report](reports/request-intent-connection-20261001/README.md)。

### 2.5 保存計画から既存Digest製造入力への接続v003

[指示v003](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v003.md)、保存`785c28b0cbedcfbe05ddf946f6e64ab078afb5b6`。新しい消費側から旧readerを使い、保持区間を編集計画・job形状検査・時計解決へ渡す。keep/drop/keepをmin/maxに戻さず、旧v002の16実装・18保存物・要求SHAを保持する。通常Clipの一テーマ型への偽装、backend完了登録、動画実走は範囲外。今回の結果受理は次節。

### 2.6 2026-10-01：v003技術受理と通常キュー接続の仕様案v004

- **受理**：`7b600a648cf4ee5228601b72b0a6b6629038fa75`の182行実装、接続・追加拒否試験、15＋5結果、主report、9ファイル差分を相談役が照合。限定範囲に必須追加修正は見つからず技術受理。Macでの直接再実行・再hashではない。
- **到達点**：実factory→旧準備reader→新消費側→`validatePresentationBaseMediaBuildJobV001`／`validatePresentationBaseMediaSegmentPlanV002`。非連続保持、各区間と元断片・順序・ms・frame/sample対応、保存・別process再読、拒否を確認。旧v002計画消費と保全は保存証拠・Codex報告に基づく。取得/STT成功依存とproviderは隔離fixture、実AI品質・通常全工程ではない。
- **未接続の意味**：job形状検査はassembly承認検査を代替しない。現在の`assemblyDecision`参照先は機械採否保存物で、専用human assembly schemaではない。通常backendのkind検査を通っても、runnerの詳細型・後段消費が成立するとは限らない。これらはv003の範囲外を具体化したもので、v003を不合格へ戻す指摘ではない。
- **次指示**：[v004](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v004.md)、保存`7db8c025c4dbfafe2e7651d18d3bfce3008fcd8a`。これ以上別保存adapterを増やさず、通常キューへ正式接続する最小の一案を作る。明示Digest識別、工程と出力schema、実際の確認条件、計画／実行／品質／公開の承認帰属、旧live-hash束縛の移行を、現行callerと保存実物へ照合する。必要な読取り中心probeを行い、正確な変更file・field・consumerと承認差分を返す。
- **権限**：v004は同じ承認済み主線の設計・境界確認。公開契約／人間確認方式の改訂・製品コード適用・本番default有効化は未承認で、今回実施しない。旧承認の流用、偽のselectedThemeId、validator免除、動画・外部推論・STT・費用・新素材・新UI・実キュー変更はしない。
- **v004成果**：[一案](reports/request-intent-connection-20261001/queue-integration-contract-proposal-v001.md)、[probeと10実測](reports/request-intent-connection-20261001/queue-contract-evidence.json)を保存。種別／job形状受理2・path／kind／詳細構造／人間組立承認の想定拒否8、別process再読・26保護path不変。公開制作系統の欠落、通常出力所有者と素材JSONの不足、旧16/5実装SHA変更影響を具体化。推奨次作業は明示Digest→通常計画登録→次の実消費の限定実装。通常製品接続・動画・品質合格は未成立。
- **運用**：Codex2がee032be8でv004全文を受領・実施。累積設営3・製品限定修正2を保持し、版更新でリセットしない。今回担当6fileだけを通常commit/pushし、相談役へ判断と次差分を依頼する。応答記録だけの再commit／終了／再起動を増やさない。送信・次指示は受領時点でreportへ保存する。

## 3. ユーザーが確定した主線

「既存レビューを反映した採用区間・構成の改善」はユーザーの「OK 一旦やることはそれで確定して。」で確定。その後の指示書作成依頼を受け、[前回v001](work-orders/ZEV_SELECTION_STRUCTURE_IMPROVEMENT_20260930_v001.md)を`241d08ac5e9b5cfba2923ce9b1d6dcc090392477`へ保存・実施した。前回の案作成は完了し、現在は通常依頼接続の後続である。

今回の本人指示「終わったら次に進んで」により、相談役は承認済み主線の実施可能な次指示を監査と同じ返答で出す。任意の別エピック・費用・契約・本番切替への包括許可ではない。

元の目的：保存済み同素材と全文・探索・採否・保持を使い、制作要求の伝達不足と判断の問題を切り分ける。解決済み／人間保留／技術未解決／未着手を既存台帳へ結び、必要最小修正から実案・差分へ進む。5候補・3採用・9分47秒を正解にせず、商品紹介のキーワード除外や「ホラー以外不要」等の未承認規則を足さない。7Bの実装都合による配信末尾の締めと、内容上の終わりを区別する。

新素材の取得・STT再実行・人間ラベル作成は不要。開発の軽量確認は540p、まとまった最終出力に1080p。小変更のたびに全編QCや媒体を再製造しない。現在のv004では動画自体を生成しない。

プロジェクト設定完了は本人申告で受領。6.1 Solという本人申告とCodexの実測metadataは別に保存し、モデル名だけで性能向上を認定したりモデル比較・API設定変更を始めたりしない。

## 4. 必読資料と根拠の入口

運用3文書は§0。現在作業について以下を確認する。内容・品質に踏み込む判断では、その一次レビューまで戻る。歴史の全再実行はしない。

| 資料 | 復元するもの |
|---|---|
| [現在のv004](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v004.md) | 通常キュー接続の一案・境界実測、今回の範囲と公開契約未承認の区別 |
| [前のv003](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v003.md)、[v002](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v002.md)、[v001](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v001.md) | 完了した準備・消費の範囲。過去の未確認を現在へ戻さない |
| [通常接続report](reports/request-intent-connection-20261001/README.md)、[consumer結果](reports/request-intent-connection-20261001/consumer-connection-evidence-attempt-001.json)、[追加拒否](reports/request-intent-connection-20261001/consumer-rejection-evidence.json)、[consumer binding](reports/request-intent-connection-20261001/consumer-binding-proof.json) | 最新実装・結果・保全・未接続。v003の根拠 |
| [factory最終attempt-006](reports/request-intent-connection-20261001/factory-connection-evidence-attempt-006.json)、[factory binding](reports/request-intent-connection-20261001/factory-binding-proof.json) | v002の27結果・16実装参照・18保存物・fixture限界 |
| [実案主report](reports/selection-structure-improvement-20260930/README.md)、[独立点検](reports/selection-structure-improvement-20260930/independent-review.md) | ID9の15:23案と既存レビュー対応、Codex1の対象版 |
| [15分版レビュー](reports/new-material-digest-human-review-20260928/README.md) | 9/28の初見レビュー実施済み、文字・分割・縁・導入／締め・不要部分・色・人間負荷 |
| [9/29追加回答](reports/caption-readability-splitting-20260928/human-feedback-20260929-v001.md) | 144pxと条件付き分割の肯定、縁未選択。再質問を防ぐ |
| [7B構成修正](reports/digest-structure-20260929/README.md) | 本編不変の旧3件案、導入・締め・除外とその制約 |
| [判断経路棚卸し§1〜3](reports/jev-decision-inventory-20260928/README.md) | 既存探索・採否・保持・演出の責務。旧5候補・326字幕と新案を混同しない |
| [旧1080p完了](reports/original-resolution-low-memory-20260930/full-run-report.md) | 旧9:47案の製造工事完了。新案全編とは別 |
| [人間回答・保留台帳](HUMAN_REVIEW_PENDING.md) | とくに§0.10〜0.14、対象版・原文・適用条件・未回答 |

必要時に展開：[メイン計画](../相談役/方針/ZEV_開発計画.md)（前回完了時v018）、[統合preview](reports/integrated-preview-20260930/README.md)、[色](reports/caption-palette-20260929/README.md)、[表情アップ](reports/reaction-close-up-20260929/README.md)、[内容修正](reports/digest-quality-q5-3-20260921-v001/README.md)、[一件後修正](reports/digest-one-edit-e2e-20260917.md)、[R1〜R3](reports/review-reflection-r1-r3-20260921-v002/STATUS.md)、[Decisions調査](reports/openai-decisions-evaluation-20260930/README.md)。

旧HANDOVER・Drive snapshot・Library・メモリは由来と履歴。[旧CURRENT_GOAL固定版](https://github.com/f-kw/zev2/blob/d7e465925c6277a08248b4207d7df8951e988895/docs/CURRENT_GOAL.md)と本書v007は原文をGit履歴に保持する。古いJev credential待ちや進行中表記で後続判断を巻き戻さない。

## 5. 未解決・人間回答を失わないための整理

| 項目 | 状態 |
|---|---|
| 縁A/B | 選択null。A=8/4は技術入力。B=8/12は21字幕の論理領域不合格。実alpha診断で保証を免除しない |
| 字幕 | 144pxと新分割への局所肯定あり。「読む必要がある文章でなかったら」の条件を保持し、未回答へ戻さない |
| 色 | 水色とカラフルな方向は肯定。強調箇所・適用範囲・追加色の技術不合格は別。2色で全課題解決としない |
| 内容選定・構成 | 実案・差分・局所確認・対象版独立点検・補足受理は完了。通常計画準備／後段入力も限定受理。通常キュー接続・実推論・網羅性・人間品質は別 |
| アップ | 手指定1箇所・固定1.2倍82frame、HUD制約、人間未確認。自動選択一般化は未実証 |
| 旧レビュー／UI | 旧10回答受領済みとR1〜R3修正後7ポイント未回答は別。旧カット・色への肯定を別素材へ移さない。既存一件編集・保存・Resetを未着手へ戻さない |
| 制作負担 | 低メモリ化完了と全工程の速度・操作負荷は別。別素材、入力、検査頻度等の残件を消さず、新しい高速化を無断着工しない |

これが全課題の件数確定ではない。既存IDと根拠を使って新しい課題を結び、全残件の解消を独立作業の開始条件にしない。別素材検証ID8は将来の一般化確認であり、済んだ新素材初稿・15分レビューの再実施指示ではない。

## 6. 突然の上限への備えと継続

方針・優先順位・許可範囲・指示発行・監査・担当変更は相談役が同じターンで正本へ保存する。会話の最後や上限警告を待たない。保存不能は未保存と伝える。自動同期・タイマーを実装したという意味ではない。

Codexは受領・checkpoint・完了・中断・未送信を報告前にGitへ記録し、再利用先と必要判断を残す。本文・長い証拠はreportに置き、インデックスを全ログの複製にしない。方針確定・指示発行・受領・実行・判断待ち・技術完了・監査受理・人間保留を区別する。

並行担当は自分の範囲だけ更新し、remote最新版とblob SHAを確認する。stage/commit/pushは直列化し、他者の未commitをreset/stash/削除/stageしない。新branch/worktree・force pushを自己判断で行わない。主線は現在Codex2単独。

本人の「終わったら次に進んで」に従い、相談役は完了監査と実施可能な次の具体的指示を同じ返答でつなぐ。「次は未指示」で再催促を待たない。Codexは受領後同じセッションで続行し、受理記録だけの終了・再起動・再commitを増やさない。費用・API・素材・公開・製品方針・契約・強制停止など本当に別判断が必要な依存部分は分けて返す。未確認の稼働や任意の別エピックの許可を推測しない。

## 7. 撤回済みの誤った次工程案

「次は全編レビューをもう一度」「新素材で初めて一本」「後修正UIを一から」「生成成功でレビュー課題全解決」「選定機能を新規に作る」は撤回済み。過去会話から再採用しない。ユーザー向けには「1080pの完成動画生成」と言い、内部呼称「原寸全編」で普通の生成を別の製品成果のように説明しない。

## 8. 新セッションへの依頼文

> ZEV_START_HERE.mdから引き継いでください。GitHubの最新HANDOVER_INDEX.mdと必読資料を確認し、役割・現在地・完了済み・未解決・人間回答・次の確定作業を復元してください。済んだレビューや実装をやり直さず、人間確認待ちに依存しない承認済み作業を進めてください。
