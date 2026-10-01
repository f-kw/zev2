# CURRENT_GOAL — 現在の目的と復元入口

更新日：2026-10-01（JST）

## 1. 最初に読む

現在の復元入口は [HANDOVER_INDEX.md](HANDOVER_INDEX.md)。新セッション・コンテキスト復元時はプロジェクトのZEV_START_HERE.mdを全文読み、GitHub mainの現在HEADを取得し、同一SHAのインデックスと必読資料から復元する。古い添付・Drive snapshot・会話要約・メモリだけで現在地を認定しない。

## 2. 現在の主作業

**9. 明示Digestの通常キュー接続検証。§12の相談役自動承認を9f031229で受領し、局所設営4行を累積6回目として適用。新局所attempt-004は内部5参照／拒否9件が合格。通常attempt-004はsource/STT・計画の実complete、内部参照対応まで成立。次の消費工程は時計結果に存在しない版情報を付けた新しい製品欠陥で消費記録保存前にfailed。製品4／設営6を保持して追加作用を停止し、二pathの最小差分を相談役の個別自動承認へ返す。v005未完了。**

正本は [v005指示書、とくに§10・11](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md)。参照修正1回の本人承認は「良い。指示書作って」として受領、`16de0445ff4bba405e2d32189c4e1d5d35aac86b`に保存した。Codex2は`87c53ade`で受領・再開し、参照修正を製品累積4、stdout誤検出除去を設営累積5として適用した。二表示名の追加とshared/backend/runner/Remotion/client型検査も報告上完了。これらを未承認・未実施へ戻さない。

今回の失敗は、新しい局所試験が旧書き起こしを版付きJSON参照として保存し、存在しないschemaVersionを探索計画へ入れたことで、既存正式JSON直列化が保存前に拒否したもの。通常接続attempt-003は未起動、局所参照accepted=false。製品参照修正や通常接続全体の合格は未認定で、型検査合格を代用しない。具体的な監査と判断待ちは§2.4。

今回の開発候補は必須の `productionType: clip | digest`、共通キューの `prepare_digest_plan → validate_digest_plan`、専用 `digest_plan_json`／`digest_execution_input_json`。Digestは既存source/STTにこの2工程を続けるところまで。動画工程は型・命令とも追加しない。Clipの既存7工程・テーマ／場面／生成前確認は維持する。

通常source/STTの実処理は行わず、旧保存素材とSTTを隔離環境の実claim・PUT・completeで登録する。FileRef.ownerIdはOutputEntity IDであることを確認し、旧fixtureの命令IDを受理する救済は作らない。素材参照JSONと解決した実動画のSHAを分け、依存graphを辿る。入力・登録・消費は通常callerを使い、試験で置換するのは判断応答だけ。

計画登録で次工程の消費を先取りしない。consumptionBindingは検証成果物側に置く。論理参照・安全な単一fileName・既存PUT/GETを使い、次工程が必要な参照先一式を再読する。uploadは別root・別processから転送先だけで成立させ、path検査緩和、新endpoint、旧回答SHA付替えで回避しない。

旧live実装は固定Git版・proofで歴史的に保持する。現行の開発を永久に止める条件にせず、旧bindingの現行実行拒否と固定版の来歴確認を分ける。旧業務state補完・削除・一括移行・本番切替はしない。

admissionの計画整合、字幕／演出未接続、動画許可未承認、人間品質pendingを分離する。参照未提供と提供済み参照の欠損・改変も分け、後者をpendingへ丸めない。検証工程の完了を動画実行可能や完成としない。

主report：[通常接続report](reports/request-intent-connection-20261001/README.md)。今回の未適用案・失敗・再読は同directoryの`queue-reference-setup-followup-request.md`、`queue-reference-setup-failure-attempt-003.json`、`queue-reference-stop-readback-attempt-003.json`。中断実装・データは保持し、再開許可の前に旧attemptを修復しない。

## 2.1 v004の受理と未承認の適用事項

`d77f2a5d`の[一案](reports/request-intent-connection-20261001/queue-integration-contract-proposal-v001.md)、[probe](reports/request-intent-connection-20261001/queue-contract-probe.mts)、[実測](reports/request-intent-connection-20261001/queue-contract-evidence.json)等を照合し、設計・境界実測を受理した。10境界はkind／形状受理2と想定拒否8。通常complete所有者、素材JSON、実依存callerの不足を具体化した。Macの直接再実行ではない。

公開型・工程は開発候補の隔離実装として扱う。`ID9-PD-01`（一般のDigest下書き承認で品質pendingの機械採否・保持まで任せる範囲）、`ID9-PD-02`（特定計画／基礎映像／最終出力への動画許可SHA・scope）、旧業務state移行・本番有効化は未承認。品質視聴Pendingとも、今回の設営枠例外とも別。

## 2.2 受理済みv003

`7b600a64`の新消費側182行、接続・拒否試験、15＋5結果、主report、9file差分を照合し、限定入力接続として受理済み。実factory→旧準備reader→新消費側→既存job形状／区間時計検査、個々の非連続keep・元断片／順序／ms・保存再読を確認した。

source/STT成功依存とproviderはfixtureであり、実complete所有者やlocal素材JSONはv005で確認する範囲。旧v002の16実装・18保存物の保全は当該検証時点の結果。前回の限定成果を取り消さず、通常全工程・実AI品質・動画・人間採用へも広げない。job形状・kind受理はhuman assembly承認・実製造資格と別である。

## 2.3 参照不整合の修正・再開（本人承認受領・適用済み）

`debd5897`の採否要求が指すcandidate-set.jsonと、保存されたrequest--candidate-set.jsonの不一致について、本人が参照対応修正だけ追加1回と既承認検証の再開を許可した。v005 §11がその範囲を規定し、一般の製品3回枠・設営5回枠・過去履歴は変更しない。

Codex2は論理`artifacts/<draft>/<producer-request>/<file>`を既存の単一保存名`<producer-request>--<file>`へ対応させ、正規依存元・要求内部参照の照合を実装し、製品累積4と記録した。stdout設営修正は5回目、二表示名は既許可内で適用済み。shared/backend/runner/Remotion/client型検査はexit0という報告を受領した。

局所試験が次節の設営欠陥で止まったため、参照対応の実合格や通常接続完成は未認定。今回の停止を、前回の本人承認未受領や表示名未適用の状態へ戻さない。

## 2.4 局所試験の設営6回目・中断履歴

`01ad1e54`では、局所試験helperがschemaVersionのない旧書き起こしを版付きJSON bindingへしてしまい、正式JSON保存前にexit1で止まった。通常接続attempt-003は未起動、localReferencesAccepted=false。原因は試験組立てであり、製品serializer／validatorの欠陥とは扱わない。

当時は設営5回枠到達のため本人判断待ちとしたが、後続の本人方針更新により、今回の4行は相談役自動承認の対象となった。**現在の再開条件は§2.5とv005 §12を正とする。** 当時の停止・失敗証拠は変更しない。


## 2.5 軽微な技術判断の自動承認（本人方針更新）

本人の「独断で決めれる程度なら自動で承認して」により、[AGENTS](../AGENTS.md)へ相談役の自動承認ルールを追加した。承認済みwork-order内の軽微な設営・技術修正で、製品方針・承認意味・人間品質を変えず、費用/API・素材・公開・本番・権限・正式削除等を伴わず、原因と最小差分を相談役が現物から判断できる場合は、回数上限に達していても個別例外を本人へ聞き直さず相談役が判断する。Codexが自己承認する規則ではなく、上限到達時はGPT_DECISIONで相談役へ返す。

今回の`queue-integration-test.mts`の4行はこの条件に該当する。旧書き起こしbytesを版なしbyte bindingとして保存する試験組立て修正だけを**設営累積6回目**として相談役が自動承認し、旧attempt-003を保持した新attemptからv005検証を再開する。[v005 §12](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md)を正本とする。

これは一般の設営5回上限の恒久変更・リセットではなく、製品修正4回の追加許可でもない。ID9-PD-01/02、本適用、一般委任、動画許可、公開、人間品質は未承認／pendingのまま。

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

新規素材・外部推論API・費用・一般委任契約・製品モデル設定・本番既定・正式採用・公開・旧成果削除は包括承認しない。具体的開発差分はv005、今回の設営6回目と再開は§2.5／v005 §12で相談役自動承認済み。製品4／設営5の実施履歴を保持し、6回目は適用時に累積する。一般上限・その他停止条件は維持する。

## 5. 保存と継続

方針・指示発行・監査・完了・中断は同じターンに正本へ反映し、会話上限を待たない。取得・保存不能や未確認の稼働は明示する。初回／再起動はコピー可能な一つのコードブロック、着手後はCodex直接報告と相談役の監査・次指示を同じセッションでつなぐ。

各担当は専用Edgeタブだけを使い、他担当・ユーザーのタブに触れない。stage/commit/pushは直列化し、担当fileだけ明示stageする。`01ad1e54`のGit終了・担当返却・追加作用停止を受領、remote mainは相談役確認。Macの稼働・ローカルGitは直接観測していない。今回の再開指示は発行済み。Codex2の受領・実再開は未確認であり、保存だけで稼働済みにしない。受理記録だけの再commit・終了連絡・Codex1再起動は行わない。

上位運用は[AGENTS](../AGENTS.md)、[監査プロトコル](CODEX_CHATGPT_AUDIT_PROTOCOL.md)、[人間確認方針](policies/HUMAN_REVIEW_ACCUMULATION_POLICY_v001.md)。一般の上限・旧GOAL_DEFINITIONの意味や数値を変更しない。更新前全文は[固定Git版](https://github.com/f-kw/zev2/blob/01ad1e54dbb95d10e6013a7076d274be2dfcf9fd/docs/CURRENT_GOAL.md)、以前の本人判断待ち原文は[ad180adc](https://github.com/f-kw/zev2/blob/ad180adce010bd3eb765f081f451a39b354b7d9f/docs/CURRENT_GOAL.md)等で保持する。


## 9. v005 §12の実再開・時計結果参照での中断

設営6回目は承認・適用済み。前の「設営6回目未承認」は当時の履歴であり、現在の停止理由ではない。通常登録された計画の要求内部5参照はregistry・実bytesへ一致し、前回の参照対応欠陥は新attemptで解消を確認した。時計結果は版情報を持たず、新consumerが一律にJSON版付き参照を作ることだけが新しい保存不成立の原因。具体的な二path案は[一差分](reports/request-intent-connection-20261001/queue-clock-binding-followup-request.md)、[失敗現物](reports/request-intent-connection-20261001/queue-clock-binding-failure-attempt-004.json)。相談役が軽微な限定実装として独立判断できる場合はAGENTSの自動承認運用を使い、本人確認・転記は要求しない。Codex自身は追加修正を未適用。
