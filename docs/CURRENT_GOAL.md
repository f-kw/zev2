# CURRENT_GOAL — 現在の目的と復元入口

更新日：2026-10-01（JST）

## 1. 最初に読む

現在の復元入口は [HANDOVER_INDEX.md](HANDOVER_INDEX.md)。新セッション・コンテキスト復元時はプロジェクトのZEV_START_HERE.mdを全文読み、GitHub mainの現在HEADを取得し、同一SHAのインデックスと必読資料から復元する。古い添付・Drive snapshot・会話要約・メモリだけで現在地を認定しない。

## 2. 現在の主作業

**9. 明示Digestの通常キュー接続検証。相談役保存HEAD `8cbde0b9`で時計二path修正を受領し、製品累積5／設営6として適用済み。局所15検査・関連型検査、attempt-005のlocal計画→検証complete・別process再読が成立した。uploadは素材copy中のENOSPCで実計画failedとなり追加作用停止。空き約1.9GiB、素材約4.47GiB。旧保存物を削除せずに容量を準備する一点をGPT_DECISIONへ返す。v005全体は未完了。**

今回の正本は [v005時計参照修正の限定追補](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_CLOCK_BINDING_FIX.md)、保存 `eab83a079db3c095174fc248fd73ddaf161e685c`。親の [v005](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md) の範囲・完了条件・§12の相談役自動承認を維持する。同じ工事の一件であり、一般上限や履歴をリセットしない。現在の実施履歴は製品5／設営6。今回の二pathは適用済み。一般上限・履歴は変更しない。

前回の局所試験4行修正は設営6として適用済み。新局所attempt-004は内部5参照／拒否9件合格。通常attempt-004は実source/STT登録→実index/factoryの3判断→計画complete、実OutputEntity所有者3鎖、要求内部5参照のregistry／bytes対応まで進んだ。旧candidate-set参照不整合を未修正へ戻さない。

今回の停止は、次のconsumerが版情報を持たない時計結果を版付きJSON参照にしたことで、消費記録を正式JSONへ保存できなかったもの。4区間を既存job／時計validatorへ渡し4出力は保存済みだが、validate completeと検証成果物登録は未成立。時計計算やserializerを緩める修正ではない。今回の差分と監査限界は§2.6。

開発候補は必須の `productionType: clip | digest`、共通キューの `prepare_digest_plan → validate_digest_plan`、専用 `digest_plan_json`／`digest_execution_input_json`。Digestは既存source/STTにこの2工程を続けるところまで。動画工程は型・命令とも追加しない。Clipの既存7工程・テーマ／場面／生成前確認は維持する。

通常source/STT処理自体は行わず、旧保存素材とSTTを隔離環境の実claim・PUT・completeで登録する。FileRef.ownerIdはOutputEntity IDであることを確認し、旧fixtureの命令IDを受理する救済は作らない。素材参照JSONと解決した実動画のSHAを分け、依存graphを辿る。入力・登録・消費は通常callerを使い、試験で置換するのは判断応答だけ。

計画登録で次工程の消費を先取りしない。consumptionBindingは検証成果物側に置く。論理参照・安全な単一fileName・既存PUT/GETを使い、次工程が必要な参照先一式を再読する。uploadは別root・別processから転送先だけで成立させ、path検査緩和、新endpoint、旧回答SHA付替えで回避しない。

旧live実装は固定Git版・proofで歴史的に保持する。現行の開発を永久に止める条件にせず、旧bindingの現行実行拒否と固定版の来歴確認を分ける。旧業務state補完・削除・一括移行・本番切替はしない。

admissionの計画整合、字幕／演出未接続、動画許可未承認、人間品質pendingを分離する。参照未提供と提供済み参照の欠損・改変も分け、後者をpendingへ丸めない。検証工程の完了を動画実行可能や完成としない。

主report：[通常接続report](reports/request-intent-connection-20261001/README.md)。今回の根拠は同directoryの `queue-clock-binding-followup-request.md`、`queue-clock-binding-failure-attempt-004.json`、`queue-clock-stop-readback-attempt-004.json`。新しい隔離attemptで検証し、旧attempt-004・4出力・失敗記録・stateを修復上書きしない。

## 2.1 v004の受理と未承認の適用事項

`d77f2a5d`の[一案](reports/request-intent-connection-20261001/queue-integration-contract-proposal-v001.md)、[probe](reports/request-intent-connection-20261001/queue-contract-probe.mts)、[実測](reports/request-intent-connection-20261001/queue-contract-evidence.json)等を照合し、設計・境界実測を受理した。10境界はkind／形状受理2と想定拒否8。通常complete所有者、素材JSON、実依存callerの不足を具体化した。Macの直接再実行ではない。

公開型・工程は開発候補の隔離実装として扱う。`ID9-PD-01`（一般のDigest下書き承認で品質pendingの機械採否・保持まで任せる範囲）、`ID9-PD-02`（特定計画／基礎映像／最終出力への動画許可SHA・scope）、旧業務state移行・本番有効化は未承認。品質視聴Pendingとも、今回の限定参照修正とも別。

## 2.2 受理済みv003

`7b600a64`の新消費側182行、接続・拒否試験、15＋5結果、主report、9file差分を照合し、限定入力接続として受理済み。実factory→旧準備reader→新消費側→既存job形状／区間時計検査、個々の非連続keep・元断片／順序／ms・保存再読を確認した。

source/STT成功依存とproviderはfixtureであり、実complete所有者やlocal素材JSONはv005で確認する範囲。旧v002の16実装・18保存物の保全は当該検証時点の結果。前回の限定成果を取り消さず、通常全工程・実AI品質・動画・人間採用へも広げない。job形状・kind受理はhuman assembly承認・実製造資格と別である。

## 2.3 参照不整合の修正・再開（本人承認受領・適用済み）

`debd5897`の採否要求が指すcandidate-set.jsonと、保存されたrequest--candidate-set.jsonの不一致について、本人が参照対応修正だけ追加1回と既承認検証の再開を許可した。v005 §11がその範囲を規定し、一般の製品3回枠・設営5回枠・過去履歴は変更しない。

Codex2は論理`artifacts/<draft>/<producer-request>/<file>`を既存の単一保存名`<producer-request>--<file>`へ対応させ、正規依存元・要求内部参照の照合を実装し、製品累積4と記録した。stdout設営修正は5回目、二表示名は既許可内で適用済み。shared/backend/runner/Remotion/client型検査は`01ad1e54`の報告でexit0。その後attempt-004で局所5参照／拒否9件と通常計画の内部参照対応が成立した。全接続完成とは区別する。

## 2.4 局所試験の設営6回目・中断履歴

`01ad1e54`では局所試験helperがschemaVersionのない旧書き起こしを版付きJSON bindingへしてしまい、正式JSON保存前にexit1で止まった。通常接続attempt-003は未起動、localReferencesAccepted=falseだった。原因は試験組立てであり、製品serializer／validatorの欠陥とは扱わない。

当時は設営5回枠到達のため本人判断待ちとしたが、後続の本人方針更新により4行を相談役自動承認。`9f031229`で受領し設営6として適用、局所attempt-004で合格した。当時の停止・失敗証拠を変更せず、旧本人判断待ちを現在へ戻さない。

## 2.5 軽微な技術判断の自動承認（本人方針更新）

本人の「独断で決めれる程度なら自動で承認して」により、[AGENTS](../AGENTS.md)へ相談役の自動承認ルールを追加した。承認済みwork-order内の軽微な設営・技術修正で、製品方針・承認意味・人間品質を変えず、費用/API・素材・公開・本番・権限・正式削除等を伴わず、原因と最小差分を相談役が現物から判断できる場合は、回数上限に達していても個別例外を本人へ聞き直さず相談役が判断する。Codexが自己承認する規則ではない。

設営6回目はv005 §12で承認・適用済み。今回の時計参照修正はその許可の流用ではなく、同ルールに基づく新しい個別技術判断として§2.6へ記録する。一般の上限や他の強制停止条件、ID9-PD-01/02、本適用、動画・公開・人間品質の境界は維持する。

## 2.6 時計結果参照の限定修正を相談役承認

**decision: continue。** 基準`b9bb6b40`の二path案・失敗証拠・停止後再読と、`runner/src/digest-plan-consumption-v001.ts`、`packages/shared/src/digest-plan-artifacts-v001.ts`を照合した。時計結果はstatus／violations／mappingsのみで版情報がなく、一律の版付き参照でformal(expected)が失敗するという説明は整合する。局所5参照・拒否9件、登録計画24データの再構築は保存証拠の確認であり、相談役によるMac上の再実行・再hashではない。

許可する製品変更は上記二pathだけ。`clock-resolution.json`の参照をpath＋実保存bytesのSHAへし、共有型のclockResolutionBindingをDigestByteBindingV001 | nullとする。時計の本文・計算・区間／断片／順序／frame/sample、他の版付きJSON参照、必須field、明示null、admission、serializerは維持する。存在しない版を捏造せず、他のJSONを一律byteへ落とさない。

これは承認済み接続の完了に直接必要な参照型の訂正であり、費用・公開・本番・権限・製品方針・人間品質を変更しない。製品修正の累積5回目として相談役が個別承認した。適用前の実施履歴は製品4／設営6、受領・再開・適用は未確認。詳細と対象試験は[限定追補](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_CLOCK_BINDING_FIX.md)。

新しい隔離attemptで小さい参照型試験からvalidate実消費／complete、upload・分離root・転送先だけの別process消費、MP4直接登録・inspection未提供、通常キュー否定・Clip回帰・修正影響の型検査まで既承認範囲を続行する。過去の全動画・旧111試験・人間レビューをやり直さない。型検査合格や計画completeをv005全体の完成にしない。

## 2.7 時計修正成立・attempt-005の容量不足停止（Codex2実測）

時計参照追補を受領・二path適用、製品累積5／設営6。局所15参照検査、shared/backend/runner/Remotion/client型検査がexit0。通常localは旧保存source/STTの実登録、実index/factory、計画completeから次の実消費completeへ到達し、別process再構築を確認した。時計結果は同条件の旧attempt-004とbyte一致、消費記録・他JSONの版参照は維持。

通常uploadは独立素材copyで容量不足となり計画failed。計画／検証の登録はなく検証queued。空き1.9GiBに対して素材4,803,412,827 bytesであり、削除・上書き・通常通信の迂回を自己判断せず、試験作用停止・自分の二backendと親process停止（親exit143）を実施した。容量準備の具体的一点を相談役へ返す。追加の製品／設営修正はしていない。

upload・分離root・転送先だけの再読、MP4／未提供の通常complete、通常否定・Clip回帰は未実施。局所null条件の合格を未提供の通常completeとしない。旧attempt-004の失敗state・4出力、旧96保護file・既存queue証拠は不変。詳細は[主report](reports/request-intent-connection-20261001/README.md)、[停止現物](reports/request-intent-connection-20261001/queue-capacity-stop-evidence-attempt-005.json)、[一点の判断依頼](reports/request-intent-connection-20261001/queue-capacity-followup-request.md)。外部推論・費用・新素材・STT／inspection実行・動画0、ID9-PD-01/02・品質pending維持。

## 3. 完了済みを再開しない

- 新素材の15分31.633秒初稿と9/28の人間初見レビューは実施済み。9/29の144pxと条件付き新分割への肯定回答も保持する。
- 旧9分47秒案の1080p生成・低メモリ化・本体/replay一致・345点native QC・共有保存・別process再読は`d7e465925c6277a08248b4207d7df8951e988895`で技術受理済み。
- ID9実案は`b69e168cf1d34f21d7b760bdebcd9e19baca69c7`で受理。11候補・7採用・9保持、27,691frame（15:23.033）、旧版差分、局所540p5本・147字幕、111試験・保存再読。送信実績`68a32038ebcd6dbee62454deca8999bd3d27d33c`とGit終了受領済み。
- Codex1点検`9b72bc0fed58684a2cdd8d012ff3757443cfcd18`は対象案`bd0113c8301e49eb74993385286fd12c1b9894b8`まで。送信実績`b93870fcafbf5671b45ada02cc1f8217478fac86`と終了受領済み。心霊回帰会話の補足は相談役受理。補足版・局所媒体のCodex1再点検は不要。
- 通常callerのv002は`11809f6f6bebed82014971c966b79b383b921a1d`で限定受理。目的・承認版・素材・要求SHAと27結果、保存・再開・再読。通常既定は当時未指定。
- v003・v004は限定入力接続、設計・境界実測として受理済み。動画や人間未回答を理由に未完了へ戻さない。
- 一件変更・保存・Reset・内容修正は既存能力。未着手扱いして一から作らない。

根拠はインデックス§2と各report。旧完成MP4、新15:23構成案・局所媒体、固定provider配線試験、通常キュー開発候補、実業務適用は別の到達点である。

## 4. 人間負荷・未解決・権限

人間確認事項は[既存台帳](HUMAN_REVIEW_PENDING.md)へ蓄積し、依存しない承認済み作業を進める。全編再視聴・正解ラベル・過去感想の再説明・通常技術判断をキョウカさんへ要求しない。未回答を採用としない。

縁A/B選択null、A=8/4技術入力、Bの21字幕論理不合格、色の種類と適用、アップのHUD制約・手指定、旧レビューと修正後未回答、制作負担、通常キュー本適用・実推論・人間品質は残件。Decisions調査は完了・実API評価保留で、この接続の依存にしない。必要時に公式情報を再確認する。

新規素材・外部推論API・費用・一般委任契約・製品モデル設定・本番既定・正式採用・公開・旧成果削除は包括承認しない。具体的開発差分はv005と今回の時計参照追補。製品5／設営6の実施履歴を保持する。一般上限・その他停止条件は維持する。

## 5. 保存と継続

方針・指示発行・監査・完了・中断は同じターンに正本へ反映し、会話上限を待たない。取得・保存不能や未確認の稼働は明示する。初回／再起動はコピー可能な一つのコードブロック、着手後はCodex直接報告と相談役の監査・次指示を同じセッションでつなぐ。

各担当は専用Edgeタブだけを使い、他担当・ユーザーのタブに触れない。stage/commit/pushは直列化し、担当fileだけ明示stageする。`b9bb6b40`のGit終了・担当返却・追加作用停止を受領、remote mainは相談役確認。Macの稼働・ローカルGitは直接観測していない。今回の時計修正・実再開・local成立を確認したが、uploadの容量不足で追加作用停止した（§2.7）。受理記録だけの再commit・終了連絡・Codex1再起動は行わない。

上位運用は[AGENTS](../AGENTS.md)、[監査プロトコル](CODEX_CHATGPT_AUDIT_PROTOCOL.md)、[人間確認方針](policies/HUMAN_REVIEW_ACCUMULATION_POLICY_v001.md)。一般の上限・旧GOAL_DEFINITIONの意味や数値を変更しない。更新前全文は[時計参照中断時の固定版](https://github.com/f-kw/zev2/blob/b9bb6b40b26a454bb850b0967b457b7fedbfff4a/docs/CURRENT_GOAL.md)、以前の[設営中断版](https://github.com/f-kw/zev2/blob/01ad1e54dbb95d10e6013a7076d274be2dfcf9fd/docs/CURRENT_GOAL.md)等で保持する。

## 9. v005 §12の実再開・時計結果参照での中断

`b9bb6b40`までの中断事実は§2と根拠reportに保持した。前の設営6回目未承認・未適用は現在の停止理由ではない。現在の時計参照の修正と再開は§2.6の相談役個別承認が正本であり、この履歴見出しを新しい停止指示にしない。
