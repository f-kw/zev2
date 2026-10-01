# ZEV Build Loop — 引き継ぎインデックス

更新日：2026-10-01（JST） / revision：handover-index-20261001-v021
正本：`f-kw/zev2` の `main` 上の `docs/HANDOVER_INDEX.md`
固定入口：`docs/ZEV_START_HERE.md`。ChatGPTプロジェクトには固定入口の写しを置く。

**最新更新：`b47999f7398118b1ef53b68b5b95a7ea922e7779`の媒体なし回帰停止を監査し、相談役が3fixtureの下書き選択を対象命令のrequestDraftIdへ直す一件を設営累積8回目として個別承認した。decision: continue。正本[媒体なし指示§6](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_NO_MEDIA_REGRESSION.md)、判断保存`a76ceedb322091883dda20d01f81312c23edb745`。本人への再確認は不要。同じCodex2で新attempt-002の残検証・完成時再読へ進む。適用済みは製品5／設営7、8は適用時に計上。今回の受領・適用・再稼働は未確認。旧38件は部分成立の証拠であり、媒体なし回帰・v005全体は未完了。媒体・SSD・容量整理は再開しない。詳細§2.20。**

更新前全文は[v020固定版](https://github.com/f-kw/zev2/blob/b47999f7398118b1ef53b68b5b95a7ea922e7779/docs/HANDOVER_INDEX.md)、[v019固定版](https://github.com/f-kw/zev2/blob/6f72ce8ac5b5a53c5337dc686b410acb3c074e24/docs/HANDOVER_INDEX.md)、[v018固定版](https://github.com/f-kw/zev2/blob/78805d861a41955ccf3f3914d5946f0446e4178d/docs/HANDOVER_INDEX.md)、過去の詳細は[v017](https://github.com/f-kw/zev2/blob/9aaa5f5b1b6259fce96e66ee4dad3cf8469d4a58/docs/HANDOVER_INDEX.md)、[v016](https://github.com/f-kw/zev2/blob/034503d72e70665615879686e07f1acf24f6cbd1/docs/HANDOVER_INDEX.md)、[v015](https://github.com/f-kw/zev2/blob/60b959d91d0885ac2bf9cf4aaae66eff93454bab/docs/HANDOVER_INDEX.md)と各reportへ保持。以下の要約で原文・実測を消さず、古い未確認・禁止を後続決定へ逆流させない。

## 0. 最初に読む人へ

新セッション・コンテキスト復元・担当交代時は、作業提案の前に本書を全文読む。

1. GitHub mainの現在HEADを取得し、同一SHAの本書と必要資料を読む。検索スニペットだけで読了にしない。
2. 本書は保存時点の状態。関連する新しいreport・個別指示を照合する。無関係な日付の新しさで判断を上書きしない。
3. [AGENTS](../AGENTS.md)、[監査プロトコル](CODEX_CHATGPT_AUDIT_PROTOCOL.md)、[人間確認方針](policies/HUMAN_REVIEW_ACCUMULATION_POLICY_v001.md)、§4の現在作業必読を読む。過去の全資料・動画を毎回再走査／再実行しない。
4. 役割・主作業・完了済み・未解決・人間回答・担当／稼働・次の許可行動を復元する。未取得・未確認は明示する。
5. GitHub取得不能時は古い添付・メモリで最新を認定せず、未確認の工事・再試行・人間レビューを始めない。

優先順位：最新ユーザー決定と適用範囲 → 現行個別指示 → 対応する実績・人間回答 → 本書要約 → 旧計画・引き継ぎ・メモリ。矛盾は出所・対象版を確認する。

## 1. 役割・目的・運用

ZEVは素材と制作意図から、内容・構成・字幕・必要な演出を持つ、見ていて気持ちいい動画を作る基盤。DigestとShortは別系統、主線はDigest。短尺化・演出数・一本生成・技術検査だけを製品品質の達成としない。

- キョウカさん（kawafmm）：製品方向、任せる範囲、目視・好み、費用・契約・公開等の専決判断。通常技術監査・課題整理・中継を担わせない。
- 相談役（このChatGPT）：全体の残課題・優先順位・作業範囲・現物監査・次指示。直近一工程だけで次を飛躍させない。
- Codex：指示内の実装・実行・試験・保存・通常commit/push・直接報告。人間品質を代理採用しない。

### 人間負荷と軽微な判断

必要な人間確認は[既存台帳](HUMAN_REVIEW_PENDING.md)へ蓄積し、依存しない承認済み作業を進める。未回答を採用へ変えず、未回答だけで全体を止めない。長尺再視聴・全字幕採点・正解区間ラベルを標準にせず、既回答を問い直さない。

本人の「独断で決めれる程度なら自動で承認して」に従う。AGENTSの条件（既承認work-order内、原因・最小差分特定済み、方針・承認意味・品質・費用/API・素材・公開・削除・本番・権限を変えない軽微な一件）を満たせば相談役が本人再確認なしで判断する。回数は保持し、Codex自身の超過承認や無制限試行、一般上限・強制停止の無効化にはしない。今回の削除は別途の本人明示指示に基づく一回の整理だった。

### 受け渡し・Edge・Git

初回／再起動指示はコピー可能な一つのコードブロックで渡す。保存・発行・受領・実稼働は別。着手後はCodexが同じ相談役会話へGPT_DECISION／AUDIT_ONLYを直接送り、送信表示を確認する。未送信を送信済みにせず、通常技術事項を本人へ転記させない。

各Codex／セッションは自分専用Edgeタブだけを使う。他担当・ユーザーのタブを共有／流用／操作しない。必要なら自分用を新設し、tab IDを恒久固定しない。AGENTS規則保存`743a53d21387123f2cab48fe8a9cc72242f2437b`。別チャット送信権限は別。

会話名：**ZEV Build Loop**。
報告先：`https://chatgpt.com/g/g-p-6a8aab6b92308191b44f77a03945fed4-zevxiang-tan-yi/c/6abbcacc-8c98-83ee-9276-248a1d29b047`。
新セッションでは実際の報告先を確認して一度知らせる。URLを推測しない。

通常main・担当fileのみ明示stage。stage/commit/pushは直列化。他者未commitをreset/stash/削除/stageしない。branch/worktree・force pushを自己判断で作らない。主線はCodex2単独、Codex1は今回起動しない。

## 2. 最新状態のカプセル

直近の停止監査：`b47999f7398118b1ef53b68b5b95a7ea922e7779`。直近の容量整理監査：`78805d861a41955ccf3f3914d5946f0446e4178d`。直近の製品接続限定受理：`60b959d91d0885ac2bf9cf4aaae66eff93454bab`。指示・状態更新commitと実行成果を区別する。

| 担当／項目 | 到達点 | 残件・扱い |
|---|---|---|
| Codex2：旧9:47案1080p | `d7e465925c6277a08248b4207d7df8951e988895`。265字幕・307状態、345点QC、本体/replay、保存再読、低メモリ化を受理 | 再製造・再実装しない。全課題解消・人間採用ではない。削除対象外 |
| Codex1：Decisions/Jev | `830ea96811c94e5794f751914e835e20977ce126`。36判断点、J16比較326字幕（53/273）、調査完了 | 調査時点で仕様・価格・access未確定、実推論0・本番0。接続の依存にしない。必要時だけ公式確認 |
| Codex2：ID9構成案 | `b69e168cf1d34f21d7b760bdebcd9e19baca69c7`受理。11候補・7採用・9保持、27,691frame（15:23.033）、差分・局所540p5本・147字幕・111試験 | 送信`68a32038ebcd6dbee62454deca8999bd3d27d33c`と終了受領。人間品質・新案1080p・汎化未認定 |
| Codex1：ID9点検 | 点検`9b72bc0fed58684a2cdd8d012ff3757443cfcd18`、対象`bd0113c8301e49eb74993385286fd12c1b9894b8`、送信`b93870fcafbf5671b45ada02cc1f8217478fac86`と終了受領 | 補足後版・局所媒体を点検済みへ広げず再起動・監視不要 |
| 通常準備v002 | `11809f6f6bebed82014971c966b79b383b921a1d`限定受理。API→承認/claim→factory→3判断→保存/再開/再読、27結果 | source/STT成功依存はfixture。所有者・素材JSONは後のv005で確認 |
| 後段入力v003 | `7b600a648cf4ee5228601b72b0a6b6629038fa75`限定受理。非連続keep→Digest形式→job/時計、保存再読、15＋5結果 | 通常登録・実製造・人間採用は当該範囲外 |
| キュー設計v004 | `d77f2a5ddc48016e6e1c7f22bee454fc231ffda7`、一案・10境界・26保護pathを受理 | code変更0、キュー完成ではない |
| Codex2：v005時計/local | `60b959d9`。製品5／設営6、15検査・型検査、local計画/検証complete・別process再読受理 | upload・MP4/未提供・通常否定/Clip回帰は残件。コピー整理後の旧runtime即時再読は不可 |
| Codex2：容量整理 | 削除前`04c21bfdeccde7210193d731bcf205f4ea19a03e`、実績`78805d86`。8本削除・論理35.79GiB・削除時空き2.00→37.82GiBを相談役受理 | 整理完了。33素材参照は再作成要、旧記録は保持。追加削除・大容量試験はしない |
| Codex2：媒体なし残検証 | `b47999f7`で入口1／API28／局所9が部分成立、誤対象fixtureでexit1。設営7適用 | §6で3fixtureのID指定修正を設営8として相談役承認。新attempt-002で残る否定・ゲート・完成時再読へ。受領／適用／実再開未確認、全体未完了 |

`b47999f7`のmain/local/origin一致・通常push・Git clean/staged0/untracked0・担当5file・Git終了・追加作用停止はCodex報告として受領。remote HEADと試験コード・証拠を相談役が確認した。Macのprocess・state実bytes・実行結果は保存されたCodex実測であり、相談役の直接再実行ではない。今回の指示保存だけで再稼働済みと扱わない。

旧1080p媒体SHA：`65afceb046aca0629b0fe097f602caae3b05697b10cff8eb6a295106185f3858`。Macの`runtime/artifacts/original-resolution-execution-20260930-v001/full-lowmem-production-001/`、今回削除対象外。GitHub／ChatGPT sandboxから再生できると仮定しない。旧84区間・最大22入力・監視v002は完成済み。50GB開始・12GB保持・RSS16GiBは当該実走限定で現在へ転用しない。

### 2.1〜2.7 受理済みの流れ

心霊回帰会話001364〜001370／断片25926〜26131は理由だけ補足し、主題関連は認めつつ退勤後に未確定の噂を再開しない不採用理由を受理。9保持不変、追加採用・動画生成・本人回答・Codex1再起動は要求しない。

v001`cc288f8e`で目的の命令到達と通常Digest caller欠落を確認。v002は3判断準備、v003は保存計画→既存Digest入力、v004は明示系統・専用kind・実OutputEntity所有者・素材JSONと実動画SHA・単一テーマと複数採否を整理。原文と指示SHAはv015固定版から辿る。

v005はproductionType、source/STT＋prepare_digest_plan／validate_digest_planと専用2kind。Clip7工程・確認条件を維持しDigest動画工程は追加しない。prepareが計画登録、validateが正規FileRef／参照一式を再読。source/STTは旧保存物の実登録で、取得・STT実行ではない。

### 2.8〜2.11 参照・設営修正と委任

`debd5897`の候補一覧path不一致を本人承認で製品4、stdout誤検出を設営5として修正。`01ad1e54`は版なし書き起こしの試験参照で保存前失敗。本人の軽微判断委任をAGENTSへ保存`0c58c6a340ab1d18e1c90d4e487e68a0411b8508`し、局所4行を設営6としてv005 §12で承認`db51ad066f8fb847c8651d65ee4ca94a752139c4`。旧本人判断待ちへ戻さず、履歴もリセットしない。

### 2.12〜2.14 時計修正と容量停止

`b9bb6b40`で内部5参照/拒否9件と通常計画登録が成立、前の参照欠陥は解消。版なし時計結果の参照だけを[時計追補](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_CLOCK_BINDING_FIX.md)で製品5として修正し、`60b959d9`で15検査・local実complete・別process再読を受理。時計SHAは同条件旧版と一致。uploadは当時約1.9GiB空きに4,803,412,827 bytesのcopyでENOSPC、実計画failed・検証queued。[停止現物](reports/request-intent-connection-20261001/queue-capacity-stop-evidence-attempt-005.json)。素材破損や新製品欠陥とは認定しない。

### 2.15 容量preflight・低容量検証（先行指示）

[先行指示](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_CAPACITY_PREFLIGHT.md)、保存`6444a8685953bb47429442e122a5212a0f7b8520`。容量実測、scenario選択、素材コピー不要の通常入力拒否・Clip回帰を許可。設営7は削除完了時点で未適用。今回の媒体なし入口分離にこの許可を使い、重複計上しない。容量調査は整理で再利用済み、棚卸しを再工事にしない。

### 2.16 本人承認の削除

本人原文：「また容量が問題になってるのか。SSD用意するから一旦削除して」。[削除正本](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_STORAGE_CLEANUP.md)、保存`a8fc1a7d4f2631055fef907017e6b82dccfbb1d3`。request-intent系の確認済み検証用コピー／partialだけを個別削除。元素材・STT/inspection・完成/確認媒体・JSON/state/判断/証拠/Git原本は保全。削除前記録push→個別削除→実空き確認までを許可、再承認不要。SSDは準備意向のみで、空きを埋め直す大容量再試行は許可しなかった。

### 2.17 コピー8本削除・容量回復の実績

削除前保存`04c21bfd`、実績`78805d86`。8本すべて保持元動画と実size/SHA一致、通常file・単一link・別inode・Git管理外・未使用を確認し、33保存参照で由来を記録。個別削除exit0、全8path不存在。partial指定先は元から不存在で件数0。

論理38,427,302,616 bytes（35.79GiB）、同volume空き2,145,939,456→40,604,250,112 bytes（2.00→37.82GiB）、観測増加38,458,310,656 bytes。削除時刻06:01:30〜06:01:38 UTC（2026-10-01）、現在の空き保証ではない。保持元3file identity/size、旧記録69件SHA、その他634file metadata不変を別processで確認。初回一覧組立て失敗は削除0、旧pathの実対応を直して成功した履歴も保持。

[一覧・実績](reports/request-intent-connection-20261001/queue-storage-cleanup-20261001-v001.json)、[主report](reports/request-intent-connection-20261001/README.md)。旧成功・失敗proofを書き換えず、削除分はretired-by-user-approved-cleanup。33素材参照は再作成まで旧runtimeの即時再読不可。製品5/設営6、設営7未適用、大容量再開0・SSD操作0という報告。

### 2.18 2026-10-01：整理受理・媒体なし残検証へ続行

**decision: continue。** 相談役は削除前後の記録、scriptの明示8path・保持元・個別unlinkと確認、5file差分を照合し、今回の容量整理を受理した。Macでの直接再実行・再hashではない。整理を再実施せず、SSD準備待ちで低容量の独立検証まで止めない。

- 指示：[媒体なし回帰](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_NO_MEDIA_REGRESSION.md)、保存`bf24872681eba292f2bb0211f162ea94db7f9e46`。同じCodex2へ発行、6f72ce8aのキックで受領・実行。結果は次節。
- 実API/通常store：系統欠損・未知値・空目的の拒否、未承認で命令0、正常承認のClip7/Digest4工程と依存順、目的全文・条件の命令対応、重複承認・未完了依存へのclaim拒否、小stateの別process再読。
- 制御関数：承認入力不一致、テーマ/場面/生成前ゲートを検証。単体メモリfixtureと実API結果は区別し、通常storeへ成功状態・架空成果物・人間承認を注入しない。依存不成立だけで確認ゲートの検証済みとしない。
- 入口は媒体なしを明示、通常runner・引数なしrunを呼ばない。試験fileは既存queue-integration-test.mtsと必要ならqueue-no-media-regression-test.mts。入口分離に先行承認の設営7を適用時のみ計上、製品5は不変。汎用storage・監視・数値上限は作らない。
- 小JSON/state/logのみ。素材read/hash/copy/PUT、source/STT complete、削除コピーの復元・link代用、旧reader再実行、追加削除はしない。旧local成功を今回へ合算しない。
- upload・分離root・転送先消費、MP4/inspection未提供の通常complete、目的2件の全3判断は残件として保留。SSD接続未確認のまま、空き量だけで再開しない。結果は主reportとqueue-no-media-regression-evidence-v001.jsonへ保存する。

### 2.19 媒体なしattempt-001：部分成立・局所fixtureの設営停止

キック指示を6f72ce8aで受領し、製品codeを変更せず新しい媒体なし専用入口を設営累積7として適用。引数なしrun・通常runnerは呼ばない。実行exit1、入口1／実API-store28／制御関数メモリ9の38結果を[現物証拠](reports/request-intent-connection-20261001/queue-no-media-regression-evidence-v001.json)へ保存。Clip7／Digest4工程・各kind／依存順・目的改行全文／条件、認証、入力拒否、未承認命令0、重複承認409、未完了依存9工程claim409、最初の2命令のみ実claimは成立。

局所「下書き未承認」caseが配列先頭を変更したが、承認元Clipは2番目。対象を変えていないため既存承認入力関数は正当に一致し、期待例外なしでtestが失敗した。別processで新しい通常storeを読み、対象依頼IDでClipを変更すると現行関数が拒否することを原因照合した。製品の未承認拒否欠陥とは扱わない。state26,434 bytes／SHA f3099a3aa295522196b1d31fbecebdddc32ad27a63f2eaa14cc27634c7759294不変、新runtimeは小state1件のみ。11命令はrunning2／waiting9、成功・成果物・人間確認／承認0。旧report証拠6件SHA不変、自分の試験／backend残存なし。

残る5承認入力否定、確認生成元3件・独立ゲート3件、完成時API応答と保存stateの完全対照は未実施。停止後読取を完成時再読へ合算しない。最小案は未承認・重複・工程列3fixtureの下書き選択を対象依頼IDへ変更し、旧attempt-001／v001証拠を保持した新attempt-002／別証拠名で同じ媒体なし入口を再実行すること。製品5／設営7、追加修正未適用として相談役へ提出した。その判断待ちは次節の個別承認で解消し、適用・実行結果は別に確認する。

[主report](reports/request-intent-connection-20261001/README.md)へ停止を保存し、担当のみ通常commit/push・専用Edge直接報告まで実施。容量整理再実行・追加削除・素材read/hash/copy/PUT／complete・旧コピー復元・大容量upload・SSD操作・外部推論・動画製造0という報告。人間品質pending・ID9-PD-01/02等維持。

### 2.20 2026-10-01：対象下書き3fixtureの修正・設営8を相談役承認

**decision: continue。** 本人の軽微技術判断委任とAGENTSに基づく個別判断。正本は[媒体なし指示§6](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_NO_MEDIA_REGRESSION.md)、保存`a76ceedb322091883dda20d01f81312c23edb745`。

- 同SHAのtest、失敗／原因照合／未適用最小案、5file差分を照合。命令の承認元ではない先頭下書きを変更した試験側の欠陥と整合。Macの直接再実行ではなく、38部分成立を対象全体の合格にはしない。
- 対象は既存queue-no-media-regression-test.mtsだけ。3fixtureを対象requestDraftIdで選び、基準での存在・一意性と配列順非依存を小さく確認。製品関数・caller・認証・期待値は不変。新attempt-002／別結果名／実行metadataの追従を含む同一欠陥の一件。
- 設営8を適用時に計上、製品5は不変。一般の枠・過去履歴・別強制停止条件をリセットしない。本人へ再確認せず、修正から残る媒体なし検証・完成時別process再読まで同じCodex2で続行する。
- 旧attempt-001／v001証拠／失敗時code SHAを保持。新結果はqueue-no-media-regression-evidence-attempt-002.json。新一系列を確認する小さい前段再実行は可、旧38件の合算・停止後診断の完成時再読への流用は不可。
- 素材・大容量upload・SSD・追加削除・製品変更・外部推論・動画・本番・公開へ広げない。SSD到着は今回の開始条件ではない。受領・適用・実再開・完了は未確認。専用Edgeから直接報告、Codex1再起動や受領だけのcommit／終了連絡は不要。

## 3. ユーザーが確定した主線

「既存レビューを反映した採用区間・構成の改善」は本人の「OK 一旦やることはそれで確定して。」で確定。[案作成指示](work-orders/ZEV_SELECTION_STRUCTURE_IMPROVEMENT_20260930_v001.md)、保存`241d08ac5e9b5cfba2923ce9b1d6dcc090392477`は実施済み。現在は通常依頼→各判断→後段への接続の後続。

保存全文・同素材で要求伝達不足と判断問題を分離し、既存レビューを回収する。5候補・3採用・9:47を正解にせず、商品紹介キーワード除外や「ホラー以外不要」を足さない。7Bの実装都合の締めと内容上の終わりを分ける。

「終わったら次に進んで」に従い監査と実施可能な次指示を同じ返答でつなぐ。任意の別エピック・費用・契約・本番・強制停止無効化へ広げない。新素材/STT/人間ラベルは不要。将来の軽量確認は540p、最終候補で1080p、小変更ごとの全編QCを繰り返さない。今回v005では動画製造を行わない。

プロジェクト設定完了は本人申告で受領。6.1 Solの本人申告と実行metadataは別。モデル名だけで性能認定・比較・API変更しない。

## 4. 必読資料と根拠の入口

運用3文書は§0。現在は媒体なし指示§6とb47999f7の試験／失敗記録を優先。内容品質を判断する場合は一次レビューへ戻る。

| 資料 | 復元するもの |
|---|---|
| [媒体なし指示§6](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_NO_MEDIA_REGRESSION.md)、[失敗・最小案](reports/request-intent-connection-20261001/queue-no-media-regression-evidence-v001.json)、[対象test](reports/request-intent-connection-20261001/queue-no-media-regression-test.mts) | 3fixtureのID指定・設営8の個別承認、新attempt-002、38部分成立と未完了の区別 |
| [削除一覧・結果](reports/request-intent-connection-20261001/queue-storage-cleanup-20261001-v001.json)、[主report](reports/request-intent-connection-20261001/README.md) | 8本削除・原本保全・33参照再作成要・空き観測・整理受理 |
| [削除指示](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_STORAGE_CLEANUP.md)、[preflight](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_CAPACITY_PREFLIGHT.md) | 本人の一回整理、原本保護、大容量保留、先行設営7の許可 |
| [容量停止](reports/request-intent-connection-20261001/queue-capacity-stop-evidence-attempt-005.json)、[再読](reports/request-intent-connection-20261001/queue-clock-capacity-readback-attempt-005.json)、[15検査](reports/request-intent-connection-20261001/queue-clock-reference-evidence-attempt-005.json) | local限定成立とupload未完了。削除後の即時再読とは別 |
| [v005](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md)、[時計追補](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_CLOCK_BINDING_FIX.md) | 親の製品範囲・完了条件、受理済み修正と履歴 |
| [v004](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v004.md)、[一案](reports/request-intent-connection-20261001/queue-integration-contract-proposal-v001.md)、[10境界](reports/request-intent-connection-20261001/queue-contract-evidence.json) | queue/出力/承認の差分 |
| [v003](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v003.md)、[v002](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v002.md)、[v001](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v001.md) | 受理済み限定接続とfixture範囲 |
| [構成案report](reports/selection-structure-improvement-20260930/README.md)、[独立点検](reports/selection-structure-improvement-20260930/independent-review.md) | 15:23案・レビュー対応・点検対象版 |
| [15分レビュー](reports/new-material-digest-human-review-20260928/README.md)、[9/29回答](reports/caption-readability-splitting-20260928/human-feedback-20260929-v001.md) | 初見済み、144px・条件付き分割肯定・縁未選択 |
| [7B構成](reports/digest-structure-20260929/README.md)、[判断棚卸し](reports/jev-decision-inventory-20260928/README.md) | 旧3件案・既存探索/採否/保持・326字幕と現案の別 |
| [旧1080p](reports/original-resolution-low-memory-20260930/full-run-report.md)、[人間台帳](HUMAN_REVIEW_PENDING.md) | 製造完了・回答原文と対象範囲 |

必要時：[メイン計画](../相談役/方針/ZEV_開発計画.md)（ID9案完了時v018）、[統合preview](reports/integrated-preview-20260930/README.md)、[色](reports/caption-palette-20260929/README.md)、[アップ](reports/reaction-close-up-20260929/README.md)、[内容修正](reports/digest-quality-q5-3-20260921-v001/README.md)、[一件後修正](reports/digest-one-edit-e2e-20260917.md)、[R1〜R3](reports/review-reflection-r1-r3-20260921-v002/STATUS.md)、[Decisions](reports/openai-decisions-evaluation-20260930/README.md)。旧proofは主report・固定旧版から辿る。旧HANDOVER/Drive/Library/メモリは歴史資料で、古いJev credential待ちや540p進行中を現指示にしない。

## 5. 未解決・人間回答を失わない

| 項目 | 状態 |
|---|---|
| 縁A/B | 選択null。A=8/4技術入力、B=8/12は21字幕論理不合格。実alphaで保証免除しない |
| 字幕 | 144px・新分割は局所肯定。「読む必要がある文章でなかったら」の条件を保持 |
| 色 | 水色・カラフル方向は肯定。強調箇所・適用範囲・追加色不合格は別 |
| 内容選定/構成 | 案/局所/対象版点検/補足は受理。通常接続・実推論・汎化・品質・新案全編は別 |
| アップ | 手指定固定1.2倍82frame、HUD制約・人間未確認。一般自動選択は未実証 |
| 旧レビュー/UI | 旧10回答受領済みとR1〜R3修正版7点未回答は別。旧肯定を別素材へ移さず一件編集を未着手にしない |
| 制作負担 | 低メモリ製造完了と全工程速度・操作負荷は別。容量回復を品質と混ぜない |
| 本適用 | ID9-PD-01/02、旧業務state移行・本番有効化は未承認。技術委任・削除承認は別 |
| 容量/残検証 | 8本整理受理済み、33参照再作成要。媒体なし回帰は38部分成立、設営8修正を指示済み・実行未確認。upload等保留、SSDは準備意向のみ |

全課題数を固定した表ではない。新課題は根拠・既存IDと結び、全残件解消を独立作業開始条件にしない。別素材ID8は将来の一般化確認であり、済んだ初稿/15分レビューの再実施ではない。

## 6. 突然の会話上限への備え

方針・指示・監査・完了・中断は相談役が同じターンで正本保存し、会話終了を待たない。保存不能は明示、自動同期やタイマー稼働を装わない。

Codexは受領・実質checkpoint・完了・中断・未送信を報告前に保存。長い証拠はreport、本書は入口。指示発行・受領・実行・技術受理・人間採用を区別する。削除後の原本保持と旧runtime再読可否も別にする。

相談役は監査と次の実施可能な主線指示を同じ返答でつなぐ。受理だけの終了・再起動・再commitを増やさない。今回の容量整理受理と、SSD接続未確認・大容量保留を区別する。

## 7. 撤回済みの誤った次工程案

「次は全編レビューをもう一度」「新素材で初めて一本」「後修正UIを一から」「生成成功で全課題解決」「選定機能を新規に作る」は撤回済み。過去会話から再採用しない。ユーザー向けには「1080pの完成動画生成」と説明する。

## 8. 新セッションへの依頼文

> ZEV_START_HERE.mdから引き継いでください。GitHubの最新HANDOVER_INDEX.mdと必読資料を確認し、役割・現在地・完了済み・未解決・人間回答・次の確定作業を復元してください。済んだレビューや実装をやり直さず、人間確認待ちに依存しない承認済み作業を進めてください。
