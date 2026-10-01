# ZEV Build Loop — 引き継ぎインデックス

更新日：2026-10-01（JST） / revision：handover-index-20261001-v018
正本：`f-kw/zev2` の `main` 上の `docs/HANDOVER_INDEX.md`
固定入口：`docs/ZEV_START_HERE.md`。ChatGPTプロジェクトには、この固定入口の写しを置く。

**最新更新：本人原文「また容量が問題になってるのか。SSD用意するから一旦削除して」に基づき、Codex2が検証用素材コピー8本を実削除。実size／SHAと保持元・未使用を確認し、削除前一覧を04c21bfdでpushした後に実施。論理35.79GiB、同volumeの実空き2.00→37.82GiB。元素材・元STT／inspection・完成／確認用動画・全旧判断／検査記録・stateを保持。削除した素材参照33件は再作成まで旧runtimeの即時再読不可。大容量試験は再開0、SSD準備未確認。製品5／設営6、設営7未適用。時計修正・local成立の受理は維持、v005全体未完了。詳細は§2.17。**

更新前全文は[v017固定版](https://github.com/f-kw/zev2/blob/9aaa5f5b1b6259fce96e66ee4dad3cf8469d4a58/docs/HANDOVER_INDEX.md)、[v016固定版](https://github.com/f-kw/zev2/blob/034503d72e70665615879686e07f1acf24f6cbd1/docs/HANDOVER_INDEX.md)、過去の詳細は[v015固定版](https://github.com/f-kw/zev2/blob/60b959d91d0885ac2bf9cf4aaae66eff93454bab/docs/HANDOVER_INDEX.md)と各reportに保持する。以下の履歴要約で原文・実測を消さず、古い未確認・禁止を新しい本人指示へ逆流させない。

## 0. 最初に読む人へ

新セッション、コンテキスト圧縮後、担当交代時は次の作業提案の前に本書を全文読む。

1. GitHub mainの現在HEADを取得し、同一SHAの本書と必要資料を読む。検索スニペットだけで読了にしない。
2. 本書は保存時点の状態。関連する新しいreport・個別指示があれば差分を読む。無関係な日付の新しさで判断を上書きしない。
3. [AGENTS](../AGENTS.md)、[監査プロトコル](CODEX_CHATGPT_AUDIT_PROTOCOL.md)、[人間確認方針](policies/HUMAN_REVIEW_ACCUMULATION_POLICY_v001.md)と§4の必読資料を読む。過去の全動画・全資料を毎回再走査／再実行しない。
4. 役割・主作業・完了済み・未解決・人間回答・担当／稼働確認・次に許可された行動を復元する。未取得・未確認は明示する。
5. GitHub取得不能時はメモリ・旧添付で最新を認定せず、未確認の工事・再試行・人間レビューを始めない。

優先順位：最新のユーザー明示決定と適用範囲 → 現行個別指示 → 対応する実績・人間回答の一次記録 → 本書の要約 → 旧計画・引き継ぎ・メモリ。矛盾は出所と対象版を確認する。

## 1. 役割・目的・運用

ZEVは素材と制作意図から、内容・構成・字幕・必要な演出を持つ、見ていて気持ちいい動画を作る基盤。DigestとShortは別系統、主線はDigest。短尺化・演出数・一本生成・技術検査だけを製品品質の達成としない。

- キョウカさん（kawafmm）：製品方向、任せる範囲、目視・好み、費用・契約・公開等の専決判断。通常の技術監査・課題整理・中継を担わせない。
- 相談役（このChatGPT）：全体の残課題・優先順位・作業範囲・現物監査・次指示。直近の一工程だけで次を飛躍させない。
- Codex：指示内の実装・実行・試験・保存・通常commit/push・直接報告。人間品質を代理採用しない。

### 人間負荷と軽微な技術判断

確認は[既存台帳](HUMAN_REVIEW_PENDING.md)へ蓄積し、それに依存しない承認済み作業を進める。未回答を採用へ変えず、未回答だけで全体を止めない。長尺再視聴・全字幕採点・正解区間ラベルを標準にせず、既回答を問い直さない。

本人の「独断で決めれる程度なら自動で承認して」により、AGENTSの軽微技術判断規則を適用。既承認work-order内、原因と最小差分が現物で特定済み、製品方針・承認意味・人間品質・費用/API・素材・公開・削除・本番・権限を変えない一件は、相談役が本人再確認なしで判断する。回数は保持し、Codexは上限超過を自己承認しない。今回の削除はこの委任の拡大解釈ではなく、別途受領した本人の明示指示に基づく。

### 受け渡し・Edge・Git

初回／再起動指示はコピー可能な一つのコードブロックで渡す。保存・指示発行・受領・実稼働は別。着手後はCodex自身がGPT_DECISION／AUDIT_ONLYを同じ相談役会話へ直接送る。送信表示を確認し、未送信を送信済みにしない。通常技術事項を人間へ転記させない。

各Codex／セッションは専用Edgeタブだけを使い、他担当・ユーザーのタブを共有・流用・操作しない。必要なら自分用を新設、tab IDは恒久固定しない。AGENTS固定規則の保存 `743a53d21387123f2cab48fe8a9cc72242f2437b`。別チャット送信権限を増やしていない。

会話名：**ZEV Build Loop**。
報告先：`https://chatgpt.com/g/g-p-6a8aab6b92308191b44f77a03945fed4-zevxiang-tan-yi/c/6abbcacc-8c98-83ee-9276-248a1d29b047`。
新会話では実際の報告先を確認して一度知らせる。URLを推測しない。

通常main、担当fileのみ明示stage、stage/commit/pushは直列化。他者未commitをreset/stash/削除/stageしない。branch/worktree・force pushを自己判断で作らない。主線は現在Codex2単独。

## 2. 最新状態のカプセル

最新の実装監査対象：`60b959d91d0885ac2bf9cf4aaae66eff93454bab`。時計修正・local成立は受理、upload等を含むv005全体は未完了。後続の指示・状態更新commitは実行成果と区別する。

| 担当／項目 | 到達点 | 残件・扱い |
|---|---|---|
| Codex2：旧9:47案の1080p生成 | `d7e465925c6277a08248b4207d7df8951e988895`。265字幕・307状態、345点native QC・本体/replay・保存再読、低メモリ化を含め受理 | 再製造・再実装しない。全課題解消・人間採用ではない。今回削除対象外 |
| Codex1：Decisions / Jev評価 | `830ea96811c94e5794f751914e835e20977ce126`。36判断点、J16比較326字幕（53/273）固定。調査完了 | 調査時点で仕様・価格・access未確定、実推論0・本番0。接続の依存にしない。必要時に公式を確認 |
| Codex2：ID9構成案 | `b69e168cf1d34f21d7b760bdebcd9e19baca69c7`受理。11候補・7採用・9保持、27,691frame（15:23.033）、差分、局所540p5本・147字幕・111試験・再読 | 送信`68a32038ebcd6dbee62454deca8999bd3d27d33c`・Git終了受領済み。人間品質・新案1080p・汎化は未認定 |
| Codex1：ID9独立点検 | 点検`9b72bc0fed58684a2cdd8d012ff3757443cfcd18`、対象`bd0113c8301e49eb74993385286fd12c1b9894b8`受理。送信`b93870fcafbf5671b45ada02cc1f8217478fac86`・終了受領 | 担当終了。補足後版・局所媒体を点検済みへ広げず、再起動・監視不要 |
| 通常準備v002 | `11809f6f6bebed82014971c966b79b383b921a1d`限定受理。API→承認／claim→factory→3判断→保存／再開／再読、27結果 | source/STT成功依存はfixture。所有者・素材JSONは後のv005で確認 |
| 後段入力v003 | `7b600a648cf4ee5228601b72b0a6b6629038fa75`限定受理。非連続keep→Digest形式→job／時計、保存再読、15＋5結果 | 当該範囲に通常登録・実製造・人間採用は含まない |
| 通常キュー設計v004 | `d77f2a5ddc48016e6e1c7f22bee454fc231ffda7`一案・10境界・26保護pathを受理 | code変更0、キュー完成ではない |
| Codex2：v005時計修正・local | `60b959d9`。製品5／設営6、15局所検査・型検査、local計画／検証complete・別process再読を受理 | upload容量不足、MP4／未提供・通常否定／Clip回帰等未完了 |
| Codex2：容量preflight | [前指示](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_CAPACITY_PREFLIGHT.md)、保存`6444a8685953bb47429442e122a5212a0f7b8520` | 設営7は未適用、低容量残検証も未実施。容量調査は今回の削除に再利用済み |
| Codex2：検証用複製の削除 | [現指示](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_STORAGE_CLEANUP.md)、保存`a8fc1a7d4f2631055fef907017e6b82dccfbb1d3` | 8本実削除、論理35.79GiB／空き2.00→37.82GiB。原本と旧記録保持、旧素材参照は再作成要。SSD意向のみ受領、大容量再試行は保留 |

`60b959d9`のmain/local/origin一致、push成功、Git clean・staged0・untracked0、11担当file、Git終了・追加作用停止を受領済み。当時のremoteは相談役確認、Macの状態は相談役の直接観測ではなかった。今回Codex2がprocess・file・空きを現物確認して削除した結果は§2.17。旧報告時の1.9GiBを現在値と断定しない。

旧1080p媒体：[完了報告](reports/original-resolution-low-memory-20260930/full-run-report.md)、SHA `65afceb046aca0629b0fe097f602caae3b05697b10cff8eb6a295106185f3858`。Mac上の `runtime/artifacts/original-resolution-execution-20260930-v001/full-lowmem-production-001/`。今回削除対象外。GitHub／ChatGPT sandboxから再生できると仮定しない。旧84区間・最大22入力と監視v002の工事は完了。50GB開始・12GB保持・RSS16GiBは当該実走限定値で現在へ転用しない。

### 2.1〜2.7 受理済みの流れ

心霊回帰会話001364〜001370／断片25926〜26131は理由補足だけを求め、退勤後に未確定の噂を再開しない不採用理由を受理。9保持不変、追加採用・再生成・人間回答・Codex1再起動を強制しない。

v001 `cc288f8e`は制作意図の命令到達と通常Digest caller欠落を確認。v002は準備依存から3判断、v003は保存計画から既存Digest入力へ限定接続。v004は明示系統、新kind、通常completeのOutputEntity所有者、素材JSON／実動画SHA、単一テーマ型と複数採否の違いを整理。細かな指示保存SHA・原文は[v015固定版](https://github.com/f-kw/zev2/blob/60b959d91d0885ac2bf9cf4aaae66eff93454bab/docs/HANDOVER_INDEX.md)を参照。

v005はproductionType: clip | digest、source/STT＋prepare_digest_plan／validate_digest_plan、専用2kind。Clip既存7工程・確認条件は維持、動画工程は追加しない。prepareが採否／保持を登録し、validateが正規FileRef／参照一式を再読。source/STTは旧保存物の実登録で、取得・STT実行ではない。

### 2.8〜2.11 参照・設営修正と委任

`debd5897`で候補一覧の宣言pathと保存名が不一致、製品3／設営4で停止。本人承認でv005 §11を発行、参照対応を製品4、stdout誤検出除去を設営5として修正。二表示名と型検査も完了。

`01ad1e54`の局所attempt-003は版のない書き起こしを版付き参照にした設営で保存前exit1。当時の本人判断待ちは後の「独断で決めれる程度なら自動で承認して」で解消。AGENTS保存`0c58c6a340ab1d18e1c90d4e487e68a0411b8508`、byte参照にする4行を設営6として承認、v005 §12保存`db51ad066f8fb847c8651d65ee4ca94a752139c4`。上限・履歴のリセットではない。

### 2.12〜2.14 時計修正と容量停止

`b9bb6b40`で局所5参照／拒否9件、通常source/STT・計画登録・内部参照が成立し、旧参照不整合は解消。時計結果の一律JSON参照だけが消費記録保存を失敗させた。相談役は[時計追補](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_CLOCK_BINDING_FIX.md)を製品5として承認、保存`eab83a079db3c095174fc248fd73ddaf161e685c`。

`60b959d9`で時計15検査・local実complete・別process再読が成立、旧時計SHAと同条件一致。uploadは約1.9GiB空きに4,803,412,827 bytesのcopyでENOSPC、実計画failed・検証queued。試験親／二backend停止、親exit143。[容量停止現物](reports/request-intent-connection-20261001/queue-capacity-stop-evidence-attempt-005.json)。新しい製品欠陥・旧素材破損とは認定しない。

### 2.15 容量preflight・低容量残検証（先行指示）

[前指示](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_CAPACITY_PREFLIGHT.md)、保存`6444a8685953bb47429442e122a5212a0f7b8520`。読取り中心の容量・保存先実測、必要copy／PUT／GETの追加保持量・ピーク算定、完了済みlocalを繰り返さないscenario選択とpreflight、コピー不要の入力拒否／Clip回帰を許可。設営訂正は適用時に7回目として個別承認、今回の削除時点では未適用。

当時は旧成果削除・移動・新しい外部保存利用を許可していなかった。**今回の検証用複製／partial削除は次節の本人指示を優先**する。その他の禁止・未認定は維持する。調査や小JSON試験の成果が既にあれば引き継ぎ、やり直さない。

### 2.16 2026-10-01：SSD準備前の限定削除を本人承認

本人原文：「また容量が問題になってるのか。SSD用意するから一旦削除して」。`decision: continue`、[削除指示](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_STORAGE_CLEANUP.md)、保存 `a8fc1a7d4f2631055fef907017e6b82dccfbb1d3`。

- 実workspaceのruntime/artifacts直下のrequest-intent-系ID9試験領域に限定。元素材／保持コピーとsize・SHA一致を確認できる検証用素材複製、および実行記録から特定できる未完成の素材copy／転送fileを削除する。prefixで領域ごと削除しない。
- 元素材 `runtime/artifacts/digest-new-material-20260926-v001/source/source-video.mp4`、元STT／inspection、完成／確認用媒体、JSON・state・要求／回答・採否／保持・binding・manifest・ログ・検査結果・Git原本は保全。他領域・他担当・使用中・唯一／不明な実体は対象外。
- fileごとのpath・SHA・size・保持元・分類・旧参照への影響を保存・pushしてから実削除。条件を満たす一覧への再承認待ちは不要。削除できないfileだけ理由を残し、適格な対象を進める。大容量backupを追加作成せず、対象は明示allowlist、symlinkを辿らない。
- 旧失敗／成功記録は書換えず、削除分は新recordへretired-by-user-approved-cleanupとして記録。過去の技術受理は保持するが、削除済みruntimeが即時再読可能とは主張しない。旧readerの欠損無視・即時再コピーはしない。
- 論理削除量と実空き増加を分け、回収できても大容量試験を自動再開して埋め直さない。SSDは本人が用意する意向のみ確認。接続先・移行・format・利用開始は未確認／未指示。
- 指示発行時点は受領・実削除・回収空き未確認だった。今回の実績は次節。Codex2単独。結果は主reportとqueue-storage-cleanup-20261001-v001.jsonへ保存し、同じ相談役へ直接報告。人間への転記・再採点・一覧再承認は不要。

### 2.17 Codex2：検証用複製8本を削除・実空き回復

`9aaa5f5b`で削除正本を受領。明示8fileと元素材の実size／SHA一致、単一link／別inode／通常file／未使用／Git管理外を確認し、保存済み33参照から複製の由来を記録。削除前の約40KB記録と一回実行scriptを `04c21bfdeccde7210193d731bcf205f4ea19a03e` として通常pushしてから個別削除した。実行exit0、8path不存在を別processで確認、未削除の適格候補0。失敗upload指定先のpartialは既に不存在で、削除件数には含めない。

論理38,427,302,616 bytes（35.79GiB）、同volume空き2,145,939,456→40,604,250,112 bytes（2.00→37.82GiB）、実観測増加38,458,310,656 bytes（35.82GiB）。保持元3fileのidentity／size不変、旧binding／state／Git管理JSON証拠69件SHA不変、その他runtime634fileのmetadata集計不変。旧成功／失敗proofは書換えず、新recordで `retired-by-user-approved-cleanup` と記録。削除した素材を使う33参照は再作成が必要で、旧runtime全体の即時再読／復元済みとは扱わない。

[削除前一覧・実績](reports/request-intent-connection-20261001/queue-storage-cleanup-20261001-v001.json)、[主report](reports/request-intent-connection-20261001/README.md)。完成／確認用媒体・他領域／他担当・旧業務stateは対象外のまま。大容量copy／upload／MP4再開0、新backup0、SSD操作0。製品5／設営6、先行preflight設営7未適用。未完の通常upload等と人間品質・動画許可・ID9-PD-01/02を維持し、相談役へ直接AUDIT_ONLY＋NEXT_REQUESTする。次の具体的再開指示まで大容量試験を保留する。

## 3. ユーザーが確定した主線

「既存レビューを反映した採用区間・構成の改善」は本人の「OK 一旦やることはそれで確定して。」で確定。[案作成指示](work-orders/ZEV_SELECTION_STRUCTURE_IMPROVEMENT_20260930_v001.md)、保存`241d08ac5e9b5cfba2923ce9b1d6dcc090392477`は実施済み。現在は通常依頼から各判断・後段への接続の後続で、容量整理を優先。

保存済み同素材・全文を使い、制作要求の伝達不足と判断問題を分離。5候補・3採用・9:47を正解にせず、商品紹介キーワード除外・「ホラー以外不要」を足さない。7Bの実装都合による締めと内容上の終わりは分ける。

「終わったら次に進んで」に従い監査と次の実施可能な指示を同じ返答でつなぐが、今回の容量整理後に大容量工程を自動再開しない。費用・契約・本番・強制停止無効化は包括承認ではない。新素材／STT／人間ラベルは不要。将来の軽量確認は540p、最終候補で1080p、小変更ごとの全編QCを繰り返さない。

プロジェクト設定完了は本人申告で受領。6.1 Solの本人申告と実行metadataは別に保存、モデル名だけで性能認定・比較・API変更しない。

## 4. 必読資料と根拠の入口

運用3文書は§0。現在は下表の冒頭から読む。内容・品質判断へ戻る際は一次レビューを読む。

| 資料 | 復元するもの |
|---|---|
| [今回の削除指示](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_STORAGE_CLEANUP.md) | 本人承認、file単位の条件・原本保護・削除前記録・実削除・SSD前の再試行保留 |
| [容量preflight指示](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_CAPACITY_PREFLIGHT.md) | 読取り調査・小試験・設営7の許可。削除禁止だけは今回の限定範囲で更新 |
| [主report](reports/request-intent-connection-20261001/README.md)、[容量依頼](reports/request-intent-connection-20261001/queue-capacity-followup-request.md)、[停止現物](reports/request-intent-connection-20261001/queue-capacity-stop-evidence-attempt-005.json)、[再読](reports/request-intent-connection-20261001/queue-clock-capacity-readback-attempt-005.json) | 実到達・ENOSPC・試験保存先と素材の由来・保全。削除実績は新recordが保存された後に確認 |
| [15検査](reports/request-intent-connection-20261001/queue-clock-reference-evidence-attempt-005.json)、[部分接続](reports/request-intent-connection-20261001/queue-integration-evidence-attempt-005.json) | 局所／実経路／未実施の区別 |
| [v005](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md)、[時計追補](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_CLOCK_BINDING_FIX.md) | 親の完了条件、受理済み修正・回数履歴 |
| [v004](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v004.md)、[一案](reports/request-intent-connection-20261001/queue-integration-contract-proposal-v001.md)、[10境界](reports/request-intent-connection-20261001/queue-contract-evidence.json) | queue・出力・人間承認の契約差分 |
| [v003](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v003.md)、[v002](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v002.md)、[v001](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v001.md) | 受理済み限定接続とfixture範囲 |
| [構成案report](reports/selection-structure-improvement-20260930/README.md)、[独立点検](reports/selection-structure-improvement-20260930/independent-review.md) | 15:23案・レビュー対応・点検対象版 |
| [15分版レビュー](reports/new-material-digest-human-review-20260928/README.md)、[9/29回答](reports/caption-readability-splitting-20260928/human-feedback-20260929-v001.md) | 初見済み、144px・条件付き分割肯定、縁未選択 |
| [7B構成](reports/digest-structure-20260929/README.md)、[判断経路棚卸し](reports/jev-decision-inventory-20260928/README.md) | 旧3件案の範囲、既存探索／採否／保持、326字幕と現案の区別 |
| [旧1080p](reports/original-resolution-low-memory-20260930/full-run-report.md)、[人間台帳](HUMAN_REVIEW_PENDING.md) | 製造完了と人間回答の対象・範囲 |

必要時：[メイン計画](../相談役/方針/ZEV_開発計画.md)（ID9案完了時v018）、[統合preview](reports/integrated-preview-20260930/README.md)、[色](reports/caption-palette-20260929/README.md)、[アップ](reports/reaction-close-up-20260929/README.md)、[内容修正](reports/digest-quality-q5-3-20260921-v001/README.md)、[一件後修正](reports/digest-one-edit-e2e-20260917.md)、[R1〜R3](reports/review-reflection-r1-r3-20260921-v002/STATUS.md)、[Decisions](reports/openai-decisions-evaluation-20260930/README.md)。過去proofは主reportと固定旧版から辿る。

旧HANDOVER・Drive snapshot・Library・メモリは歴史資料。古いJev credential待ち・540p進行中を現指示にしない。更新前CURRENT_GOALは[034503d7固定版](https://github.com/f-kw/zev2/blob/034503d72e70665615879686e07f1acf24f6cbd1/docs/CURRENT_GOAL.md)。

## 5. 未解決・人間回答を失わない

| 項目 | 状態 |
|---|---|
| 縁A/B | 選択null。A=8/4技術入力、B=8/12は21字幕論理不合格。実alphaで保証免除しない |
| 字幕 | 144px・新分割は局所肯定、「読む必要がある文章でなかったら」の条件を保持 |
| 色 | 水色・カラフル方向は肯定。強調箇所・適用範囲・追加色不合格は別 |
| 内容選定・構成 | 案／局所／対象版点検／補足は受理。通常接続・実推論・汎化・人間品質・新案全編とは別 |
| アップ | 手指定固定1.2倍82frame、HUD制約、人間未確認。一般自動選択は未実証 |
| 旧レビュー／UI | 旧10回答受領済みとR1〜R3修正版7点未回答は別。旧肯定を別素材へ移さず、一件編集を未着手にしない |
| 制作負担 | 低メモリ製造の完了と全工程速度・操作負荷は別。容量不足も品質と混ぜない |
| 本適用 | ID9-PD-01／02、旧業務state移行・本番有効化は未承認。技術修正委任・今回削除承認とは別 |
| 容量・残検証 | 本人承認で素材コピー8本を削除、空き2.00→37.82GiB。旧素材参照33件は再作成要。upload等は未完了、大容量試験は保留、SSDは準備意向のみ |

全課題数を固定した表ではない。新課題は根拠・既存IDと結び、全残件解消を独立作業開始の条件にしない。別素材ID8は将来の一般化確認であり、済んだ初稿／15分レビューの再実施ではない。

## 6. 突然の会話上限への備え

方針・指示・監査・完了・中断は相談役が同じターンで正本保存し、会話終了を待たない。保存不能は明示、自動同期やタイマーが稼働すると装わない。

Codexは受領・実質checkpoint・完了・中断・未送信を報告前にGitへ記録する。長い証拠はreport、本書は入口。今回の整理は削除前一覧と実削除結果を残し、原本が残ることと旧runtimeの即時再読可否を区別する。

相談役は監査と次の実施可能な主線指示を同じ返答でつなぐ。受理だけの終了・再起動・再commitを増やさない。容量回復・8本削除の実績と、SSD接続未確認・大容量試験保留を区別する。

## 7. 撤回済みの誤った次工程案

「次は全編レビューをもう一度」「新素材で初めて一本」「後修正UIを一から」「生成成功で全課題解決」「選定機能を新規に作る」は撤回済み。過去会話から再採用しない。ユーザー向けには「1080pの完成動画生成」と説明する。

## 8. 新セッションへの依頼文

> ZEV_START_HERE.mdから引き継いでください。GitHubの最新HANDOVER_INDEX.mdと必読資料を確認し、役割・現在地・完了済み・未解決・人間回答・次の確定作業を復元してください。済んだレビューや実装をやり直さず、人間確認待ちに依存しない承認済み作業を進めてください。
