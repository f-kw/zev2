# ZEV Build Loop — 引き継ぎインデックス

更新日：2026-10-01（JST） / revision：handover-index-20261001-v015
正本：`f-kw/zev2` の `main` 上の `docs/HANDOVER_INDEX.md`
固定入口：`docs/ZEV_START_HERE.md`。ChatGPTプロジェクトには、この固定入口の写しを置く。

**最新更新：Codex2は `8cbde0b9`で時計追補を受領・二path修正を製品累積5として適用（設営6維持）。局所15参照検査・関連型検査、attempt-005のlocal計画→検証の実complete・別process再読が成立した。uploadは素材copyのENOSPCで実計画failed。空き1.9GiBに対して素材約4.47GiBであり、旧保存物を削除せず容量を準備する一点をGPT_DECISIONへ返す。追加作用停止、試験親／二backendのみ停止。残りのupload／MP4／未提供／否定／Clip回帰は未実施、v005全体未完了。旧failed証拠・未承認事項・品質pendingは維持。詳細は§2.14。**

本書は現在地を復元する入口。過去の詳細原文は[更新前v013全文](https://github.com/f-kw/zev2/blob/b9bb6b40b26a454bb850b0967b457b7fedbfff4a/docs/HANDOVER_INDEX.md)、[v011全文](https://github.com/f-kw/zev2/blob/01ad1e54dbb95d10e6013a7076d274be2dfcf9fd/docs/HANDOVER_INDEX.md)、[v010全文](https://github.com/f-kw/zev2/blob/ad180adce010bd3eb765f081f451a39b354b7d9f/docs/HANDOVER_INDEX.md)、個別指示・reportに保持する。過去の「未確認」「次」を現在へ逆流させない。

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

最新の停止監査対象：`b9bb6b40b26a454bb850b0967b457b7fedbfff4a`。時計結果参照の限定欠陥に対する判断であり、v005全体の完成受理ではない。

| 担当／項目 | 到達点 | 残件・扱い |
|---|---|---|
| Codex2：旧9分47秒案の1080p生成 | `d7e465925c6277a08248b4207d7df8951e988895`。265字幕・307状態、全345点native QC・本体/replay一致・共有保存・独立再読。低メモリ化を含め技術受理済み | 再実装・再生成しない。全レビュー課題解消・人間採用ではない |
| Codex1：Decisions API / Jev代替評価 | `830ea96811c94e5794f751914e835e20977ce126`。36判断点、J16比較326字幕（53/273）を固定。調査完了 | 調査時点で実行仕様・価格・access未確定、実推論0・本番0。今回接続の依存にしない。現時点公開状況は必要時に公式で確認 |
| Codex2：ID9採用区間・構成案 | `b69e168cf1d34f21d7b760bdebcd9e19baca69c7`を受理。11候補・7採用・9保持、27,691frame（15:23.033）の案、旧版差分、局所540p5本・147字幕、111試験、別process再読 | 送信実績`68a32038ebcd6dbee62454deca8999bd3d27d33c`・Git終了受領済み。人間品質・新案1080p・汎化は未認定 |
| Codex1：ID9独立点検 | 点検`9b72bc0fed58684a2cdd8d012ff3757443cfcd18`、対象案`bd0113c8301e49eb74993385286fd12c1b9894b8`を受理。送信実績`b93870fcafbf5671b45ada02cc1f8217478fac86`・Git終了受領済み | 担当終了。後続補足・局所媒体を点検済みへ広げず、再起動・再点検・自動監視不要 |
| Codex2：通常callerの計画準備v002 | `11809f6f6bebed82014971c966b79b383b921a1d`を技術受理。通常API→承認・claim→実factory→3判断→別保存・再開・再読。27結果・21捕捉 | source/STT完了はfixture。通常complete所有者と素材JSONの扱いはv005で確認する。限定成果を一般E2Eへ広げない |
| Codex2：保存計画の後段入力v003 | `7b600a648cf4ee5228601b72b0a6b6629038fa75`を技術受理。非連続保持を既存Digest形式へ変換、job形状／時計検査、4出力保存・再読。15結果＋5拒否 | 通常完了登録・後続キュー・実製造・人間採用は当該範囲外。旧計画消費と旧bytes不変はその検証時点の結果 |
| Codex2：仕様案・境界実測v004 | `d77f2a5ddc48016e6e1c7f22bee454fc231ffda7`の一案、実validator受理2／想定拒否8、別process26保護path再読、6file差分を相談役受理 | 製品コード変更0。通常キューの完成ではない |
| Codex2：明示Digest通常キュー隔離実装v005 | 時計二pathを製品5／設営6で適用。局所15検査・型検査、attempt-005のlocal計画／検証complete・別process再読成立 | uploadは素材copyでENOSPC、実計画failed。容量準備をGPT_DECISION。upload転送・MP4／未提供・通常否定／Clip回帰未実施。全体未完了 |

Codex2から`b9bb6b40`のmain/local/origin一致、通常push成功、Git clean・staged0・untracked0、9担当fileだけの保存、Git操作終了・追加作用停止を受領。remote mainと対象文書・実装は相談役が確認した。Macのprocess一覧・ローカルGit・型検査・実bytesはCodexの実測報告であり、相談役の直接実測ではない。共通状態の保存担当は相談役へ返却済み。今回の指示発行をCodex2の実再開と混同しない。

旧1080p媒体：[完了報告](reports/original-resolution-low-memory-20260930/full-run-report.md)、SHA `65afceb046aca0629b0fe097f602caae3b05697b10cff8eb6a295106185f3858`。実体はMacの `runtime/artifacts/original-resolution-execution-20260930-v001/full-lowmem-production-001/`。GitHubやChatGPT sandboxで再生できると仮定しない。

旧メモリ工事は84区間・最大22入力・逐次producer＋単一encoderで完了。旧失敗・背景・AAC・PNGは保持、停止漏れも監視v002で修正済み。50GB開始・12GB保持・RSS16GiB等は当該実走限定値であり、今回へ転用しない。

### 2.1 Codex1補足指示の履歴

心霊回帰会話001364〜001370／断片25926〜26131の採否理由だけ補足を指示。追加採用・再生成・人間回答は強制していない。原文は[旧インデックス](https://github.com/f-kw/zev2/blob/7b600a648cf4ee5228601b72b0a6b6629038fa75/docs/HANDOVER_INDEX.md)と[独立点検](reports/selection-structure-improvement-20260930/independent-review.md)。

### 2.2 ID9 v001の技術受理と両担当の終了

[主report](reports/selection-structure-improvement-20260930/README.md)の一案・差分・局所検証は受理済み。心霊回帰会話は主題関連を認めたうえで、退勤後に未確定の噂を再開しないという不採用理由を相談役受理、9保持は不変。両担当の送信実績・Git終了は上表のSHAで確定。補足版・媒体のCodex1点検、実声／映像の事実、自然さ、網羅性、人間採用、新案1080pは未認定。旧未確認を再作業にしない。

### 2.3 通常依頼入力の追跡v001

[指示v001](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v001.md)、保存`05c042ae3efe69e8ef0157a2db2614a3b8fa1c7f`。`cc288f8ea5d0ab0937ffb74b952fcf5826616209`で通常目的の保存・7命令伝達とDigest3判断の通常caller欠落を確認。型の存在を接続完成にしていない。

### 2.4 通常factoryへの限定追加v002

[指示v002](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v002.md)、保存`54931a3ab289e5ab826fac64d6ba0cebd9fdc300`。通常factoryの文字起こし検証後、明示準備依存がある場合だけ既存3判断を呼ぶ。承認snapshot・素材・目的全文・条件・要求SHAを検査し、別保存・再開・再読。`11809f6f`で限定受理済み。当該版の通常出力・人間確認・公開API・本番既定は不変だった。

### 2.5 保存計画から既存Digest製造入力への接続v003

[指示v003](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v003.md)、保存`785c28b0cbedcfbe05ddf946f6e64ab078afb5b6`。旧readerを使い、個々のkeepを既存Digest編集計画・job形状／時計検査へ渡す。当該版では旧16実装・18保存物・要求SHAを保持。`7b600a64`で限定受理済み。backend通常登録・動画実走は当該範囲外。

### 2.6 通常キュー接続の仕様案v004

[v004](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v004.md)、保存`7db8c025c4dbfafe2e7651d18d3bfce3008fcd8a`。[一案](reports/request-intent-connection-20261001/queue-integration-contract-proposal-v001.md)と[10境界実測](reports/request-intent-connection-20261001/queue-contract-evidence.json)を`d77f2a5d`へ保存・受理。通常FileRef.ownerIdはOutputEntity IDで旧fixtureとは異なり、local素材の参照JSONと実動画SHAも別。job形状／kind受理はhuman assembly承認／runner詳細型の受理ではない。静的確認と実測を区別する。

### 2.7 明示Digest通常キューの隔離実装v005

[v005](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md)、初回保存`a3bd8594df7c9151e164bf1e96024029a2356a0a`。開発候補として必須productionType、共通queueのprepare_digest_plan／validate_digest_plan、専用2kindを接続。Digestはsource/STT＋2工程、Clipは既存7工程・確認条件を維持。動画工程の型・命令は追加しない。

prepareは採否・保持を登録し、validateが登録計画と参照先一式を実再読する。source/STT実処理は旧保存物を使うが、登録は実claim・PUT・complete。所有者・素材JSON／実動画のSHAを検証し、転送先だけで再読する。旧保存は固定Git版・proofで履歴保全し、旧回答の付替え・大量reader複製・hash免除はしない。

本適用・一般委任のID9-PD-01、動画許可SHA／scopeのID9-PD-02、旧業務state移行・本番有効化は未承認。開発候補の固定応答試験をこれらの承認やAI品質へ昇格させない。

### 2.8 参照不整合の停止監査（当時の記録）

`debd5897`で製品3／設営4。採否要求はdraft直下candidate-set.json、保存はrequest--candidate-set.jsonで宣言pathが不存在。内容SHA一致や計画completeだけでは参照先一式の成立にならない。相談役は停止を妥当とし、参照対応修正だけ追加1回を本人へ求めた。当時のhuman_decisionは次節の本人回答で解消した。

### 2.9 参照対応修正1回と検証再開の本人承認・実施

本人の「良い。指示書作って」を受領し、[v005 §11](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md)へ保存（`16de0445ff4bba405e2d32189c4e1d5d35aac86b`）。参照対応に限る製品修正累積4回目と既承認検証再開を許可。一般上限は変更せず、stdout設営修正は既存枠内5回目、二表示名は§10で許可済みとした。別製品修正・設営枠超過は停止報告する条件を維持した。

Codex2は`87c53ade`で受領・再開。論理draft／producer-request／fileを物理producer-request--fileへ対応させ、内部参照の検査を接続したと報告。製品4／設営5を適用し、二表示名・shared/backend/runner/Remotion/client型検査は報告上完了。この時点では局所参照試験・通常接続は未合格だった。その後のattempt-004成立と、新しい時計参照停止は§2.12を参照する。

### 2.10 2026-10-01：局所試験の設営枠による中断監査（当時の記録）

`01ad1e54`で局所attempt-003が試験設営の誤った版付きbindingにより保存前exit1となり、設営5回枠へ到達していたため、当時は追加作用を停止した。[4行案](reports/request-intent-connection-20261001/queue-reference-setup-followup-request.md)は、旧transcriptBytesをそのまま保存し、path＋fileSha256のbyte bindingへ直す試験helper限定修正。製品serializer／validator、通常caller、provider、旧素材／旧回答の変更ではない。

この時点では本人判断待ちとしたが、後続の本人方針「独断で決めれる程度なら自動で承認して」により、軽微な技術・設営判断は相談役が自動承認する運用へ変更された。現在の扱いは後続の§2.11〜2.13を正とし、当時のhuman_decisionを現在へ戻さない。失敗attempt-003・保存3file・当時の参照未合格は履歴として保持する。

### 2.11 2026-10-01：軽微な技術判断の自動承認ルールと設営6回目

本人から「良い。これは重要な確認か？ 独断で決めれる程度なら自動で承認して。指示書を作って」と受領した。相談役は4行を試験設営だけの修正であり、人間の製品判断ではないと判定した。

- 固定ルール：[AGENTS](../AGENTS.md)へ「相談役による軽微な技術判断の自動承認」を追加（`0c58c6a340ab1d18e1c90d4e487e68a0411b8508`）。Codexが上限超過を自己承認せず、証拠を固定して相談役へGPT_DECISIONし、相談役が本人確認の要否を判定する。
- 相談役だけで承認できる範囲：本人承認済みwork-order内、原因と最小差分が現物で特定済み、製品方針・承認意味・人間品質を変えず、費用/API・新素材・公開・削除・本番切替・権限拡張を伴わない軽微な一件。回数を累積し、一般上限をリセット／恒久増加しない。
- 本人へ上げる範囲：契約・任せる範囲・上限値そのものの恒久変更、費用/API、新素材、正式削除・上書き、tag/release/公開、本番切替、権限／セキュリティ、人間の目視・好み・品質採用、製品方針や承認意味、根拠不足。
- 設営の4行案を累積6回目として承認し、[v005 §12](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md)へ保存（`db51ad066f8fb847c8651d65ee4ca94a752139c4`）。旧attempt-003を保持した新attemptで参照確認後、既承認未実施検証へ戻す指示。

後続の別不具合は個別判断し、軽微なら本人へ再確認せず相談役が扱う。費用・素材・本番・動画・公開・品質や他の強制停止条件は変更しない。

### 2.12 Codex2：§12実再開と新しい時計結果参照の停止

`9f031229`で指示受領・設営累積6適用。新局所attempt-004の内部5参照／拒否9件は合格、通常attempt-004は実source/STT・計画登録、実所有者3鎖と内部参照5件のregistry／bytes対応を確認。前の参照対応不整合はこの新attemptで解消した。次のconsumerは4出力と4区間の時計結果を保存したが、版なし時計結果を版付きJSON参照にしたため消費記録を正式JSONへ保存できずfailed。検証complete・upload／分離root・MP4／inspection未提供・否定・Clip回帰は未完了。

[失敗現物](reports/request-intent-connection-20261001/queue-clock-binding-failure-attempt-004.json)、[具体的二path案](reports/request-intent-connection-20261001/queue-clock-binding-followup-request.md)、[停止後再読](reports/request-intent-connection-20261001/queue-clock-stop-readback-attempt-004.json)、[主report](reports/request-intent-connection-20261001/README.md)を`b9bb6b40`へ保存。再読は24参照データの計画再構築、内部5参照、4出力と旧attempt-003の3file確認、provider0・state不変という報告。消費completeの合格ではない。設営6の未承認へ巻き戻さない。

### 2.13 2026-10-01：時計結果のbyte参照修正を相談役が個別承認

**decision: continue。** §2.11の本人委任とAGENTSに基づき、既承認v005の限定欠陥修正として本人確認なしで承認した。指示は[v005時計参照修正追補](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_CLOCK_BINDING_FIX.md)、保存 `eab83a079db3c095174fc248fd73ddaf161e685c`。

- 監査：`b9bb6b40`の二path案・失敗証拠・停止後再読と、consumer／共有型・参照検査を照合。時計結果はstatus／violations／mappingsで版情報がなく、全4出力に一律bindを使うためformal(expected)が失敗するという原因説明は整合。Macの再実行・直接再hashやv005全体の完成監査ではない。
- 許可差分：`runner/src/digest-plan-consumption-v001.ts`で時計結果参照だけをpath＋実保存bytesのSHAへする。`packages/shared/src/digest-plan-artifacts-v001.ts`でclockResolutionBindingだけをDigestByteBindingV001 | nullへし、byte参照検査に合わせる。他の3JSON出力・3JSON薄参照、時計本文／計算／区間／断片／順序／frame/sample、必須field・明示null・admissionは維持する。
- 判断理由：今回の開発候補の参照型訂正に閉じ、製品方針・承認意味・人間品質・費用・素材・公開・本番・権限を変えない。製品累積5回目として例外承認。実施前は製品4／設営6であり、未適用を実施済みにしない。一般上限や履歴をリセットしない。
- 次行動：4出力の版有無と参照型を事前照合し、時計byte参照の保存／再読と型・欠損／改変拒否、他JSONの版必須、inspection未提供のnull維持を小さく検証。その後、新しい隔離attemptでv005のvalidate complete・upload・分離root・転送先のみの別process再読・MP4・inspection未提供・否定・Clip回帰・関連型検査まで続ける。旧失敗attempt・4出力・stateを修復上書きしない。
- 境界：serializer／内容validator・時計処理・認証・PUT/GET・path安全条件・renderer/native QC・実業務・外部推論等は対象外。汎用fallbackや架空版番号、旧回答SHA付替えを使わない。既に通った前回局所試験や旧全動画・111試験・人間レビューをやり直す仕事にしない。
- 状態：指示発行・正本保存済み、Codex2の受領・実再開・適用は未確認。Codex1起動、受理記録だけの再commit・終了連絡、本人転記は不要。同じセッションで次の実質checkpointまで進める。

### 2.14 Codex2：時計参照修正成立後、通常uploadの容量不足で停止

`8cbde0b9359ab090ab30561862d49dcfd83b1e0a`で追補を受領。時計だけbyte参照へ訂正し、他JSON／時計計算／serializerは不変。製品5／設営6として保存。15対象検査、shared/backend/runner/Remotion/client型検査はexit0。attempt-005のlocalでは実source/STT登録→通常計画complete→次の消費completeへ到達し、別processで再構築。時計SHAは同条件の旧attempt-004と一致。

uploadは計画の素材copy中にENOSPCとなり実failed、検証queued。空き1.9GiBに対し素材4,803,412,827 bytes。自己判断の削除や旧保存物上書き、通常通信の試験置換はせず、今回の試験親／二backendを停止（親exit143）。容量準備を相談役へGPT_DECISIONとして返す。一般枠・履歴をリセットせず、追加修正は未実施。

[主report](reports/request-intent-connection-20261001/README.md)、[15参照検査](reports/request-intent-connection-20261001/queue-clock-reference-evidence-attempt-005.json)、[部分接続](reports/request-intent-connection-20261001/queue-integration-evidence-attempt-005.json)、[停止現物](reports/request-intent-connection-20261001/queue-capacity-stop-evidence-attempt-005.json)、[停止後再読](reports/request-intent-connection-20261001/queue-clock-capacity-readback-attempt-005.json)、[一点の依頼](reports/request-intent-connection-20261001/queue-capacity-followup-request.md)。旧attempt-004の4出力・stateと96保護file・旧Git証拠は不変。

未実施はupload転送／分離root／転送先のみの再読、MP4直接登録／inspection未提供の通常complete、通常否定・Clip回帰。局所未提供nullの合格を通常未提供枝の完了へ広げない。外部推論・費用・新素材・取得／STT／inspection・動画0。ID9-PD-01/02・字幕演出・動画許可・人間品質pending維持。Codex1起動・人間の転記／採点要求なし。

## 3. ユーザーが確定した主線

「既存レビューを反映した採用区間・構成の改善」は本人の「OK 一旦やることはそれで確定して。」で確定。[前回v001](work-orders/ZEV_SELECTION_STRUCTURE_IMPROVEMENT_20260930_v001.md)、保存`241d08ac5e9b5cfba2923ce9b1d6dcc090392477`の案作成は完了し、現在は通常依頼接続の後続である。

「終わったら次に進んで」に従い、相談役は承認済み主線の実施可能な次指示を監査と同じ返答で出す。任意の別エピック・費用・契約・本番切替・停止枠超過への包括許可ではない。軽微な技術例外は§2.11の個別判断を使う。

保存済み同素材・全文を使い、制作要求の伝達不足と判断の問題を切り分ける。解決済み／人間保留／技術未解決／未着手を既存台帳へ結び、必要最小修正から実案・差分へ進む。5候補・3採用・9分47秒を正解にせず、商品紹介の単純キーワード除外や「ホラー以外不要」等の未承認規則を足さない。7Bの実装都合による配信末尾の締めと、内容上の終わりを区別する。

新素材取得・STT再実行・人間ラベル作成は不要。軽量開発確認は540p、まとまった最終出力に1080p。小変更ごとに全編QC・媒体を再製造しない。現在のv005は動画自体を生成しない。

プロジェクト設定完了は本人申告で受領。6.1 Solの本人申告とCodex実行metadataは別に保存し、モデル名だけで性能を認定したり比較・API設定変更を始めたりしない。

## 4. 必読資料と根拠の入口

運用3文書は§0。現在作業は冒頭の追補・証拠を優先する。内容・品質を判断する場合は一次レビューまで戻るが、歴史の全再実行はしない。

| 資料 | 復元するもの |
|---|---|
| [時計参照修正の限定追補](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_CLOCK_BINDING_FIX.md) | 製品5回目の相談役承認・二path差分・再開条件。受領／実再開は未確認 |
| [時計の二path案](reports/request-intent-connection-20261001/queue-clock-binding-followup-request.md)、[失敗現物](reports/request-intent-connection-20261001/queue-clock-binding-failure-attempt-004.json)、[停止後再読](reports/request-intent-connection-20261001/queue-clock-stop-readback-attempt-004.json) | `b9bb6b40`、製品4／設営6、計画completeと参照問題解消、消費記録未成立の区別 |
| [現在のv005](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md) | 全体の対象・完了条件、§10二表示名・§11参照修正・§12設営6回目はいずれも適用済み。今回の差分は追補を優先 |
| [設営4行案](reports/request-intent-connection-20261001/queue-reference-setup-followup-request.md)、[局所失敗](reports/request-intent-connection-20261001/queue-reference-setup-failure-attempt-003.json)、[局所合格](reports/request-intent-connection-20261001/queue-reference-evidence-attempt-004.json) | 旧attempt-003失敗から新attempt-004合格まで。古い未承認・未合格へ戻さない |
| [通常接続report](reports/request-intent-connection-20261001/README.md)、[旧参照不整合](reports/request-intent-connection-20261001/queue-logical-reference-gap-evidence.json)、[旧中断再読](reports/request-intent-connection-20261001/queue-interruption-readback-proof.json) | 各attempt・部分到達・未完了と累積／保全 |
| [v004](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v004.md)、[一案](reports/request-intent-connection-20261001/queue-integration-contract-proposal-v001.md)、[境界実測](reports/request-intent-connection-20261001/queue-contract-evidence.json) | 受理済み設計、通常登録と承認の不足。v005の具体的差分を優先 |
| [v003](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v003.md)、[v002](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v002.md)、[v001](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v001.md) | 完了した準備・消費の範囲。過去の未確認を現在へ戻さない |
| [consumer結果](reports/request-intent-connection-20261001/consumer-connection-evidence-attempt-001.json)、[追加拒否](reports/request-intent-connection-20261001/consumer-rejection-evidence.json)、[consumer binding](reports/request-intent-connection-20261001/consumer-binding-proof.json) | v003の限定成立・旧版保全 |
| [factory最終attempt-006](reports/request-intent-connection-20261001/factory-connection-evidence-attempt-006.json)、[factory binding](reports/request-intent-connection-20261001/factory-binding-proof.json) | v002の27結果・16実装参照・18保存物・fixture限界 |
| [実案主report](reports/selection-structure-improvement-20260930/README.md)、[独立点検](reports/selection-structure-improvement-20260930/independent-review.md) | ID9の15:23案、既存レビュー対応とCodex1の対象版 |
| [15分版レビュー](reports/new-material-digest-human-review-20260928/README.md)、[9/29追加回答](reports/caption-readability-splitting-20260928/human-feedback-20260929-v001.md) | 初見レビュー実施済み、144pxと条件付き分割の肯定、縁未選択。再質問しない |
| [7B構成修正](reports/digest-structure-20260929/README.md)、[判断経路棚卸し§1〜3](reports/jev-decision-inventory-20260928/README.md) | 旧3件案の変更範囲、探索・採否・保持・演出の責務。旧5候補・326字幕と新案を混同しない |
| [旧1080p完了](reports/original-resolution-low-memory-20260930/full-run-report.md) | 旧9:47案の製造工事完了。新案全編とは別 |
| [人間回答・保留台帳](HUMAN_REVIEW_PENDING.md) | とくに§0.10〜0.14、対象版・原文・適用条件・未回答 |

必要時に展開：[メイン計画](../相談役/方針/ZEV_開発計画.md)（前回完了時v018）、[統合preview](reports/integrated-preview-20260930/README.md)、[色](reports/caption-palette-20260929/README.md)、[表情アップ](reports/reaction-close-up-20260929/README.md)、[内容修正](reports/digest-quality-q5-3-20260921-v001/README.md)、[一件後修正](reports/digest-one-edit-e2e-20260917.md)、[R1〜R3](reports/review-reflection-r1-r3-20260921-v002/STATUS.md)、[Decisions調査](reports/openai-decisions-evaluation-20260930/README.md)。

旧HANDOVER・Drive snapshot・Library・メモリは由来と履歴。[旧CURRENT_GOAL](https://github.com/f-kw/zev2/blob/d7e465925c6277a08248b4207d7df8951e988895/docs/CURRENT_GOAL.md)と各固定Git版は原文を保持する。古いJev credential待ち・進行中表記で後続判断を巻き戻さない。

## 5. 未解決・人間回答を失わないための整理

| 項目 | 状態 |
|---|---|
| 縁A/B | 選択null。A=8/4は技術入力。B=8/12は21字幕の論理領域不合格。実alpha診断で保証を免除しない |
| 字幕 | 144pxと新分割への局所肯定あり。「読む必要がある文章でなかったら」の条件を保持し、未回答へ戻さない |
| 色 | 水色とカラフルな方向は肯定。強調箇所・適用範囲・追加色の技術不合格は別。2色で全課題解決としない |
| 内容選定・構成 | 実案・差分・局所確認・対象版独立点検・補足受理は完了。計画準備／後段入力・v004設計も限定受理。v005と実業務適用・実推論・網羅性・人間品質は別 |
| アップ | 手指定1箇所・固定1.2倍82frame、HUD制約、人間未確認。自動選択一般化は未実証 |
| 旧レビュー／UI | 旧10回答受領済みとR1〜R3修正後7ポイント未回答は別。旧カット・色への肯定を別素材へ移さない。既存一件編集・保存・Resetを未着手へ戻さない |
| 制作負担 | 低メモリ化完了と全工程の速度・操作負荷は別。別素材、入力、検査頻度等の残件を消さず、新しい高速化を無断着工しない |
| 本適用・承認 | ID9-PD-01（公開型／工程・一般委任）、ID9-PD-02（動画許可SHA／scope）、旧業務state移行・本番有効化は未承認。隔離試験とは分ける |
| 今回の時計参照修正 | 製品5／設営6適用、15検査・local通常complete・再読成立。upload容量不足で停止、残検証未完了。一般枠・品質Pending・PD-01/02とは別 |

これが全課題の件数確定ではない。既存IDと根拠で新しい課題を結び、全残件解消を独立作業の開始条件にしない。別素材検証ID8は将来の一般化確認であり、済んだ新素材初稿・15分レビューの再実施指示ではない。

## 6. 突然の上限への備えと継続

方針・優先順位・許可範囲・指示発行・監査・担当変更は相談役が同じターンで正本へ保存する。会話の最後や上限警告を待たない。保存不能は未保存と伝える。自動同期・タイマーを実装したという意味ではない。

Codexは受領・checkpoint・完了・中断・未送信を報告前にGitへ記録し、再利用先と必要判断を残す。本文・長い証拠はreportに置き、インデックスを全ログの複製にしない。方針確定・指示発行・受領・実行・判断待ち・技術完了・監査受理・人間保留を区別する。

並行担当は自分の範囲だけ更新し、remote最新版とblob SHAを確認する。stage/commit/pushは直列化し、他者の未commitをreset/stash/削除/stageしない。新branch/worktree・force pushを自己判断で行わない。主線は現在Codex2単独。

本人の「終わったら次に進んで」に従い、相談役は完了監査と実施可能な次の具体的指示を同じ返答でつなぐ。「次は未指示」で再催促を待たない。Codexは受領後同じセッションで続行し、受理記録だけの終了・再起動・再commitを増やさない。費用・API・素材・公開・製品方針・契約・強制停止など本当に別判断が必要な依存部分は分けて返す。軽微な技術例外はAGENTSの委任に従い相談役が判断する。未確認の稼働や任意の別エピックの許可を推測しない。

## 7. 撤回済みの誤った次工程案

「次は全編レビューをもう一度」「新素材で初めて一本」「後修正UIを一から」「生成成功でレビュー課題全解決」「選定機能を新規に作る」は撤回済み。過去会話から再採用しない。ユーザー向けには「1080pの完成動画生成」と言い、内部呼称「原寸全編」で普通の生成を別の製品成果のように説明しない。

## 8. 新セッションへの依頼文

> ZEV_START_HERE.mdから引き継いでください。GitHubの最新HANDOVER_INDEX.mdと必読資料を確認し、役割・現在地・完了済み・未解決・人間回答・次の確定作業を復元してください。済んだレビューや実装をやり直さず、人間確認待ちに依存しない承認済み作業を進めてください。
