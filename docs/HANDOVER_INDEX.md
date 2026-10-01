# ZEV Build Loop — 引き継ぎインデックス

更新日：2026-10-01（JST） / revision：handover-index-20261001-v016
正本：`f-kw/zev2` の `main` 上の `docs/HANDOVER_INDEX.md`
固定入口：`docs/ZEV_START_HERE.md`。ChatGPTプロジェクトには、この固定入口の写しを置く。

**最新更新：`60b959d91d0885ac2bf9cf4aaae66eff93454bab` の時計二path修正・局所15検査・local通常計画／検証complete・別process再読を限定技術受理。uploadは素材copy中のENOSPCで未完了。decision: continueとして、容量実測・再開案と追加素材copyを要しない残検証へ限定指示を発行した（保存 `6444a8685953bb47429442e122a5212a0f7b8520`）。同条件の大容量再試行、旧成果削除・移動、新しい外部保存利用は許可しない。現在の実施履歴は製品5／設営6、必要な試験preflight／scenario選択の訂正一件は適用時に設営7として相談役承認。Codex2単独、本指示受領・再稼働・容量確保は未確認。詳細は§2.15。**

過去の詳細原文は[更新前v015全文](https://github.com/f-kw/zev2/blob/60b959d91d0885ac2bf9cf4aaae66eff93454bab/docs/HANDOVER_INDEX.md)、各個別指示・reportに保持する。以下の履歴要約で過去の承認・実測を消さず、過去の「未確認」「次」を現在へ逆流させない。

## 0. 最初に読む人へ

新セッション、コンテキスト圧縮後、担当交代時は次の作業提案の前に本書を全文読む。

1. GitHub接続でmainの現在HEADを取得し、同一SHAの本書と必要資料を読む。検索スニペットだけで読了にしない。
2. 本書は保存時点の状態。最新の関連report・個別指示があれば差分を読む。無関係な日付の新しさで判断を上書きしない。
3. [AGENTS](../AGENTS.md)、[監査プロトコル](CODEX_CHATGPT_AUDIT_PROTOCOL.md)、[人間確認方針](policies/HUMAN_REVIEW_ACCUMULATION_POLICY_v001.md)と、§4の現在作業の必読資料を読む。過去の全動画・全資料を毎回再走査・再実行しない。
4. 役割・主作業・完了済み・未解決・人間回答・担当／稼働確認・次に許可された行動を復元する。未取得・未確認を明示する。
5. GitHub取得不能時はメモリ・旧添付で最新を認定せず、未確認の工事・再試行・人間レビューを始めない。

優先順位：最新のユーザー明示決定と適用範囲 → 現行の承認済み個別指示 → 対応する実績・人間回答の一次記録 → 本書の要約 → 旧計画・旧引き継ぎ・メモリ。矛盾は出所・対象版を確認する。

## 1. 役割・目的・運用

ZEVは素材と制作意図から、内容・構成・字幕・必要な演出を持つ、見ていて気持ちいい動画を作る基盤。DigestとShortは別系統、現在の主線はDigest。短尺化・演出数・一本生成・技術検査だけを製品品質の達成としない。

- キョウカさん（kawafmm）：製品方向、任せる範囲、目視・好み、費用・契約・公開等の専決判断。通常の技術監査・課題整理・中継を担わせない。
- ZEV相談役（このChatGPT）：全体の残課題・優先順位・作業範囲・現物監査・次指示。直近の一工程だけを見て次を飛躍させない。
- Codex：指示内の実装・実行・試験・保存・通常commit/push・直接報告。人間品質を代理採用しない。

### 人間負荷と軽微な技術判断

人間の時間は限られる。確認は[既存台帳](HUMAN_REVIEW_PENDING.md)へ蓄積し、それに依存しない承認済み作業を進める。未回答を採用へ変えず、未回答だけで全体を止めない。長尺の再視聴・全字幕採点・正解区間ラベル付けを標準にしない。既回答を問い直さない。

本人の「独断で決めれる程度なら自動で承認して」により、AGENTSの軽微技術判断規則を適用する。既承認work-order内、原因と最小差分が現物で特定済み、製品方針・承認意味・人間品質・費用/API・素材・公開・削除・本番・権限を変えない一件は、相談役が本人再確認なしで判断する。修正回数は保持し、Codexは上限超過を自己承認しない。一般上限の恒久変更・他の強制停止条件を無効化する規則ではない。

### 受け渡し・Edge・Git

初回／再起動指示はコピーできる一つのコードブロックでユーザーへ渡す。保存・発行・受領・実稼働を混同しない。着手後はCodex自身がGPT_DECISION／AUDIT_ONLYを同じ相談役会話へ直接送る。送信表示を確認し、未送信は未送信として保存する。通常技術事項を人間へ転記させない。

各Codex／各セッションは自分専用のEdgeタブだけを使う。他担当・ユーザーのタブを共有・流用・操作しない。専用タブがなければ自分用を新設し、tab IDを永久固定しない。固定規則はAGENTS、保存 `743a53d21387123f2cab48fe8a9cc72242f2437b`。別チャット送信権限を増やしたものではない。

確認済み相談役会話名：**ZEV Build Loop**。
報告先：`https://chatgpt.com/g/g-p-6a8aab6b92308191b44f77a03945fed4-zevxiang-tan-yi/c/6abbcacc-8c98-83ee-9276-248a1d29b047`。
新会話へ移ったら実際の報告先を確認して一度知らせる。URLを推測しない。

通常main、担当fileだけ明示stage。stage/commit/pushは直列化し、他者の未commitをreset/stash/削除/stageしない。branch/worktree・force pushを自己判断で作らない。主線は現在Codex2単独。

## 2. 最新状態のカプセル

最新監査対象：`60b959d91d0885ac2bf9cf4aaae66eff93454bab`。時計修正・local成立は受理、upload等を含むv005全体は未完了。監査と次指示のcommitは実行成果と区別する。

| 担当／項目 | 到達点 | 残件・扱い |
|---|---|---|
| Codex2：旧9:47案の1080p生成 | `d7e465925c6277a08248b4207d7df8951e988895`。265字幕・307状態、345点native QC・本体/replay・共有保存・別process再読、低メモリ化を含め技術受理 | 再製造・再実装しない。全課題解消・人間採用ではない |
| Codex1：Decisions / Jev評価 | `830ea96811c94e5794f751914e835e20977ce126`。36判断点、J16比較326字幕（53/273）固定。調査完了 | 調査時点で仕様・価格・access未確定、実推論0・本番0。今回接続の依存にしない。最新公開状況は必要時に公式で確認 |
| Codex2：ID9採用区間・構成案 | `b69e168cf1d34f21d7b760bdebcd9e19baca69c7`受理。11候補・7採用・9保持、27,691frame（15:23.033）、旧版差分、局所540p5本・147字幕、111試験・保存再読 | 送信実績`68a32038ebcd6dbee62454deca8999bd3d27d33c`とGit終了受領済み。人間品質・新案1080p・汎化は未認定 |
| Codex1：ID9独立点検 | 点検`9b72bc0fed58684a2cdd8d012ff3757443cfcd18`、対象案`bd0113c8301e49eb74993385286fd12c1b9894b8`受理。送信`b93870fcafbf5671b45ada02cc1f8217478fac86`・Git終了受領済み | 担当終了。補足後版・局所媒体を点検済みへ広げず、再起動・自動監視不要 |
| 通常準備v002 | `11809f6f6bebed82014971c966b79b383b921a1d`限定受理。通常API→承認／claim→実factory→3判断→保存／再開／再読、27結果・21捕捉 | source/STT成功依存はfixture。通常complete所有者・素材JSONは後のv005で確認 |
| 後段入力v003 | `7b600a648cf4ee5228601b72b0a6b6629038fa75`限定受理。非連続keep→既存Digest形式→job形状／時計、保存再読。15＋5結果 | 当該範囲に通常登録・実製造・人間採用は含まない |
| 通常キュー設計v004 | `d77f2a5ddc48016e6e1c7f22bee454fc231ffda7`の一案・10境界（受理2／想定拒否8）・別process26保護pathを受理 | 製品code変更0。キュー完成ではない |
| Codex2：v005時計修正・local | `60b959d9`。時計二pathを製品5として適用、設営6維持。15局所検査・関連型検査、local計画／検証complete・別process再読を相談役受理 | 旧時計不具合を再開しない。uploadは容量不足、MP4／未提供の通常complete・通常否定／Clip回帰等は未完了 |
| Codex2：容量対応・低容量検証 | [今回指示](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_CAPACITY_PREFLIGHT.md)、保存`6444a8685953bb47429442e122a5212a0f7b8520` | 読取り中心の容量実測・再開案、追加素材copy不要な未実施試験を許可。大容量実走・旧成果削除／移動・新しい外部保存利用は未許可。受領／再稼働は未確認 |

Codex2から`60b959d9`のmain/local/origin一致、push成功、Git clean・staged0・untracked0、11担当file、Git操作終了・追加作用停止を受領。remote HEAD・文書・実装は相談役が確認。Macの実process・ローカルGit・現在空き・実bytesはCodex報告であり相談役の直接実測ではない。相談役の文書保存後にGit担当を返す。報告時の1.9GiBを現在の実測値と断定しない。

旧1080p媒体：[完了報告](reports/original-resolution-low-memory-20260930/full-run-report.md)、SHA `65afceb046aca0629b0fe097f602caae3b05697b10cff8eb6a295106185f3858`。実体はMacの `runtime/artifacts/original-resolution-execution-20260930-v001/full-lowmem-production-001/`。GitHub／ChatGPT sandboxで再生可能と仮定しない。旧84区間・最大22入力の製造工事、監視v002停止漏れ修正は完了。50GB開始・12GB保持・RSS16GiB等は当該実走限定で、現在の容量対応へ流用しない。

### 2.1〜2.7 受理済みの流れ

心霊回帰会話001364〜001370／断片25926〜26131は採否理由の補足だけを求め、主題関連を認めつつ退勤後に未確定の噂を再開しない不採用理由を受理した。9保持は不変。追加採用・再生成・本人回答は強制せず、補足だけを理由にCodex1を再起動しない。

v001 `cc288f8e`で、制作意図は命令へ届くが通常Digest callerがないことを確認。v002で準備依存から3判断へ、v003で保存計画から既存Digest入力へ限定接続。v004で明示系統、新kind、通常completeのOutputEntity所有者、素材JSONと実動画SHA、単一テーマ型と複数採否の違いを整理した。詳細の章番号と指示保存SHAは[v015固定版](https://github.com/f-kw/zev2/blob/60b959d91d0885ac2bf9cf4aaae66eff93454bab/docs/HANDOVER_INDEX.md)を参照。

v005の開発候補は `productionType: clip | digest`、既存source/STT＋prepare_digest_plan／validate_digest_plan、専用digest_plan_json／digest_execution_input_json。Clipは既存7工程・確認条件を維持。動画工程は追加しない。prepareは採否／保持を登録、validateが次工程として正規FileRef・参照一式を再読する。source/STTは旧保存物を実claim/PUT/completeへ登録するだけで、取得・STT実行ではない。

### 2.8〜2.10 参照不整合と設営停止の履歴

`debd5897`は候補一覧の宣言pathとrequest付き保存名が不一致、製品3／設営4で停止。本人の「良い。指示書作って」を受けv005 §11を発行し、論理draft／producer-request／fileと既存単一保存名の対応を製品4、stdout誤検出除去を設営5として修正。二表示名も適用、型検査は合格。

`01ad1e54`の局所attempt-003は版情報のない書き起こしへ版付き参照を作る試験設営で保存前exit1。旧証拠を保持し、この時点では設営6回目を本人判断待ちとした。その待ちは次節の委任で解消済み。過去のhuman_decisionを現在へ戻さない。

### 2.11 軽微技術判断の本人委任

本人原文：「良い。これは重要な確認か？ 独断で決めれる程度なら自動で承認して。指示書を作って」。AGENTSへ相談役自動承認規則を保存 `0c58c6a340ab1d18e1c90d4e487e68a0411b8508`。書き起こしをbyte参照にする局所4行は設営6として承認、v005 §12保存 `db51ad066f8fb847c8651d65ee4ca94a752139c4`。一般上限・履歴のリセットではない。軽微な例外は相談役が個別判断し、本人へ都度聞き直さない。

### 2.12〜2.13 時計参照の停止と限定修正

`b9bb6b40`では局所attempt-004の内部5参照／拒否9件、通常source/STT・計画登録・内部参照対応が成立。前の参照不整合は解消。一方、版情報のない時計結果を一律JSON参照にしたconsumerが消費記録保存でfailed。

相談役は[時計追補](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_CLOCK_BINDING_FIX.md)を製品5回目として個別承認、保存 `eab83a079db3c095174fc248fd73ddaf161e685c`。時計参照だけbyteへ直す二path、他JSONの版検査と時計処理・serializer不変。本人再確認は不要。

### 2.14 時計修正成立後の容量不足

`60b959d9`は時計15検査とlocal実complete・別process再読が成立。時計SHAは同条件の旧attempt-004と一致。旧96保護fileと失敗証拠は不変の報告。相談役はこれを今回限定受理した。

uploadはData volume空き約1.9GiBに対して素材4,803,412,827 bytesのcopyでENOSPC。実計画failed、計画／検証FileRefなし、検証queued。試験親／二backendのみ停止、親exit143。現物は[容量停止記録](reports/request-intent-connection-20261001/queue-capacity-stop-evidence-attempt-005.json)。新しい製品欠陥・旧素材破損と認定しない。

### 2.15 2026-10-01：時計／local受理と容量preflight・低容量検証の限定続行

**decision: continue。** [今回指示](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_CAPACITY_PREFLIGHT.md)、保存 `6444a8685953bb47429442e122a5212a0f7b8520`。

- 相談役は二pathの現物、15検査、容量failed state、別process再読、試験のlocal→upload→MP4の固定実行順を確認。時計修正・local限定成立を受理したが、v005全体は未完了。Mac再実行ではない。
- 次は容量と保存先のmetadataを実測する。今回領域の素材複製／JSON／partialと、volume別の使用量・空き、残工程のcopy／PUT／GET／一時fileの追加保持・ピークを計算する。単一素材分だけを必要量とせず、旧attemptを全保持する。
- 第一候補は旧成果を動かさず、新しいruntimeだけを既にZEV用途を許可された実在の容量ある保存先へ置くこと。ただし現在その絶対path・空き・許可根拠は未確認。候補を一案にし、未確認を隠さない。別folder／tmpを独立空き容量とみなさず、外付けSSDや新しい外部保存許可を推測しない。
- 既存scenarioの明示選択・作用なし容量preflightを試験側へ最小追加してよい。対象は既存queue-integration-test.mtsと必要なら小さいqueue-capacity-preflight.mts。製品側／通常caller・固定応答・検査意味は変えない。適用時に設営7回目として個別承認。現在の実施履歴は製品5／設営6、未適用を実施済みにしない。
- 完了済みlocalを再製造せず、未実施の通常入力拒否／Clip対象回帰のうち大きな素材copy不要のものを進める。新しい小JSON・隔離stateだけを使い、旧stateは不変。必要なcopyがある項目だけ容量待ちに残す。省略はnot-run、別依頼の旧結果と同一E2Eへ合算しない。
- 大容量copy／uploadの同条件再試行、旧成果の削除・移動・圧縮・link化、snapshot/cache削除、新規外部／cloud転送・購入は未許可。今回の成果は実容量表・具体的再開案・低容量の未実施試験結果であり、容量確保済みやupload完了ではない。追加製品修正・一般数値上限新設も許可しない。
- 受領／再稼働は未確認。Codeや指示書の保存だけでCodex稼働を認定しない。Codex1起動、応答保存だけの再commit・終了連絡、本人転記は不要。

## 3. ユーザーが確定した主線

「既存レビューを反映した採用区間・構成の改善」は本人の「OK 一旦やることはそれで確定して。」で確定。実案作成の[指示v001](work-orders/ZEV_SELECTION_STRUCTURE_IMPROVEMENT_20260930_v001.md)、保存 `241d08ac5e9b5cfba2923ce9b1d6dcc090392477` は実施済み。現在は制作意図を通常依頼から各判断・後段へ渡す接続の後続。

保存済み同素材・全文を使い、制作要求の伝達不足と判断の問題を切り分ける。解決済み／人間保留／技術未解決／未着手を既存台帳へ結ぶ。5候補・3採用・9:47を正解とせず、商品紹介のキーワード除外・「ホラー以外不要」等を勝手に足さない。7Bの実装都合による配信末尾の締めと内容上の終わりを分ける。

「終わったら次に進んで」に従い、相談役は監査と実施可能な次指示を同じ返答で出す。任意の別エピック・費用・契約・本番・強制停止の無効化は包括承認ではない。現在v005で動画を生成しない。新素材取得・STT再実行・人間ラベル付けも不要。将来の軽量開発は540p、まとまった最終出力に1080pとし、小変更ごとに全編QCを繰り返さない。

プロジェクト設定完了は本人申告で受領。6.1 Solという本人申告と実行metadataは別に保存し、モデル名だけで性能を認定・比較実験・API変更しない。

## 4. 必読資料と根拠の入口

運用3文書は§0。現在作業は下表の冒頭を優先する。内容・品質判断に戻る際は一次レビューを読む。

| 資料 | 復元するもの |
|---|---|
| [容量preflight指示](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_CAPACITY_PREFLIGHT.md) | 今回の許可差分・大容量停止・容量実測／低容量残検証・設営7の適用条件 |
| [容量依頼](reports/request-intent-connection-20261001/queue-capacity-followup-request.md)、[停止現物](reports/request-intent-connection-20261001/queue-capacity-stop-evidence-attempt-005.json)、[再読](reports/request-intent-connection-20261001/queue-clock-capacity-readback-attempt-005.json) | `60b959d9`、時計／local成立とENOSPC・未実施の区別 |
| [15検査](reports/request-intent-connection-20261001/queue-clock-reference-evidence-attempt-005.json)、[部分接続](reports/request-intent-connection-20261001/queue-integration-evidence-attempt-005.json)、[主report](reports/request-intent-connection-20261001/README.md) | 実行・保存・失敗・時間・試験範囲 |
| [v005](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md)、[時計追補](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_CLOCK_BINDING_FIX.md) | 親の完了条件・権限、受理済み二pathと設営／製品履歴 |
| [v004](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v004.md)、[一案](reports/request-intent-connection-20261001/queue-integration-contract-proposal-v001.md)、[10境界](reports/request-intent-connection-20261001/queue-contract-evidence.json) | 通常queueと承認／出力の設計、kind合格と詳細受理の違い |
| [v003](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v003.md)、[v002](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v002.md)、[v001](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v001.md) | 受理済みの限定接続とfixture範囲。旧未確認へ戻さない |
| [構成案主report](reports/selection-structure-improvement-20260930/README.md)、[独立点検](reports/selection-structure-improvement-20260930/independent-review.md) | 15:23案、既存レビュー対応、Codex1点検対象版 |
| [15分版レビュー](reports/new-material-digest-human-review-20260928/README.md)、[9/29回答](reports/caption-readability-splitting-20260928/human-feedback-20260929-v001.md) | 初見済み・144pxと条件付き分割肯定・縁未選択 |
| [7B構成](reports/digest-structure-20260929/README.md)、[判断経路棚卸し](reports/jev-decision-inventory-20260928/README.md) | 旧3件案の範囲、既存探索／採否／保持。326字幕と現案を混同しない |
| [旧1080p完了](reports/original-resolution-low-memory-20260930/full-run-report.md)、[人間台帳](HUMAN_REVIEW_PENDING.md) | 製造完了と残る人間回答の対象・適用範囲 |

必要時：[メイン計画](../相談役/方針/ZEV_開発計画.md)（ID9案完了時v018）、[統合preview](reports/integrated-preview-20260930/README.md)、[色](reports/caption-palette-20260929/README.md)、[表情アップ](reports/reaction-close-up-20260929/README.md)、[内容修正](reports/digest-quality-q5-3-20260921-v001/README.md)、[一件後修正](reports/digest-one-edit-e2e-20260917.md)、[R1〜R3](reports/review-reflection-r1-r3-20260921-v002/STATUS.md)、[Decisions](reports/openai-decisions-evaluation-20260930/README.md)。v002/v003の詳細proofと過去停止証拠は主reportおよびv015固定版から辿る。

旧HANDOVER・Drive snapshot・Library・メモリは歴史資料。古いJev credential待ち、540p進行中等を現指示へ戻さない。更新前CURRENT_GOALは[60b959d9固定版](https://github.com/f-kw/zev2/blob/60b959d91d0885ac2bf9cf4aaae66eff93454bab/docs/CURRENT_GOAL.md)。

## 5. 未解決・人間回答を失わない

| 項目 | 状態 |
|---|---|
| 縁A/B | 選択null。A=8/4は技術入力。B=8/12は21字幕の論理領域不合格。実alpha診断で保証免除しない |
| 字幕 | 144pxと新分割は局所肯定あり。「読む必要がある文章でなかったら」の条件を保持 |
| 色 | 水色とカラフルな方向は肯定。強調箇所・適用範囲・追加色の技術不合格は別。2色で全課題解消としない |
| 内容選定・構成 | 実案／局所確認／対象版点検／補足は受理。通常接続・実推論・汎化・人間品質・新案全編とは別 |
| 表情アップ | 手指定1箇所、固定1.2倍82frame、HUD制約、人間未確認。自動選択一般化は未実証 |
| 旧レビュー／UI | 旧10回答受領済みとR1〜R3修正版7点未回答は別。旧カット・色の肯定を別素材へ移さず、一件編集／保存／Resetを未着手にしない |
| 制作負担 | 低メモリ製造完了と全工程の速度・操作負荷は別。今回の容量不足も製造・品質完了へ混ぜない |
| 本適用・承認 | ID9-PD-01（公開型／工程と一般機械委任）、ID9-PD-02（動画許可SHA／scope）、旧業務state移行・本番有効化は未承認。今回の技術修正委任とは別 |
| 容量・残検証 | 時計／localは受理。upload・MP4／inspection未提供の通常complete・通常否定／Clip回帰等は未完了。今回低容量で行った項目だけ後から閉じる。新保存先・旧成果処理は未承認／未確認 |

全課題の件数を固定した表ではない。新しい課題は根拠と既存IDに結び、全残件の解消を独立作業の開始条件にしない。別素材ID8は将来の一般化確認であり、済んだ初稿／15分レビューの再実施ではない。

## 6. 突然の会話上限への備え

方針・指示・監査・完了・中断は相談役が同じターンで正本へ保存し、会話の最後を待たない。保存不能は未保存と明示する。自動同期・タイマーが稼働していると装わない。

Codexは受領・実質checkpoint・完了・中断・未送信を報告前にGitへ記録し、再利用先・残判断を保存する。長い証拠はreport、本書は入口にする。方針確定／指示発行／受領／実行／判断待ち／技術完了／監査受理／人間保留を分ける。

相談役は監査と次の実施可能な主線指示を同じ返答でつなぐ。Codexは受領後同じセッションで続行し、受理記録だけの終了・再起動・再commitを増やさない。費用・素材・公開・製品方針・契約・強制停止等の必要判断は分離する。容量がまだ確保できていないのに再開済みと言わない。

## 7. 撤回済みの誤った次工程案

「次は全編レビューをもう一度」「新素材で初めて一本」「後修正UIを一から」「生成成功で全課題解決」「選定機能を新規に作る」は撤回済み。過去会話から再採用しない。ユーザー向けには「1080pの完成動画生成」と説明し、内部呼称「原寸全編」で普通の生成を別の製品成果のように言わない。

## 8. 新セッションへの依頼文

> ZEV_START_HERE.mdから引き継いでください。GitHubの最新HANDOVER_INDEX.mdと必読資料を確認し、役割・現在地・完了済み・未解決・人間回答・次の確定作業を復元してください。済んだレビューや実装をやり直さず、人間確認待ちに依存しない承認済み作業を進めてください。
