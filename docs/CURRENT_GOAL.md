# CURRENT_GOAL — 現在の目的と復元入口

更新日：2026-10-01（JST）

## 1. 最初に読む

現在の復元入口は [HANDOVER_INDEX.md](HANDOVER_INDEX.md)。新セッション・コンテキスト復元時はプロジェクトのZEV_START_HERE.mdを全文読み、GitHub mainの現在HEADを取得し、同一SHAのインデックスと必読資料から復元する。古い添付・Drive snapshot・会話要約・メモリだけで現在地を認定しない。

## 2. 現在の主作業

**9. 明示Digestの参照対応不整合を修正し、通常キュー接続の検証を再開する。本人の「良い。指示書作って」を受領し、当該修正に限る追加1回（製品修正累積4回目）と既承認検証の再開を許可、v005 §11へ指示を発行した。本人承認待ちは解消。Codex2の受領・実再開・適用は未確認。v005全体は未完了であり、今回の指示を完成受理とはしない。**

正本は [v005指示書、とくに§11](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md)、再開指示保存 `16de0445ff4bba405e2d32189c4e1d5d35aac86b`。初回指示保存は `a3bd8594df7c9151e164bf1e96024029a2356a0a`。中断実装は `debd58971f543958df0022988e00bed9e20ddcbc`、停止監査・本人判断待ちの保存は `ad180adce010bd3eb765f081f451a39b354b7d9f`。今回の本人承認を、一般の修正上限改訂・公開契約の本適用・一般の機械判断委任・実業務導入・動画承認方式の承認へ広げない。

今回の開発候補は必須の `productionType: clip | digest`、共通キュー内の `prepare_digest_plan → validate_digest_plan`、専用の `digest_plan_json`／`digest_execution_input_json`。Digestの工程列は既存source/STTにこの2工程を続けるところまで。動画工程は型・命令とも追加しない。Clipの既存7工程・テーマ／場面／生成前確認は維持する。

通常source/STTの実処理は行わず、旧保存素材とSTTを隔離環境の**実claim・PUT・complete**で登録する。通常のFileRef.ownerIdはOutputEntity IDであることを検査し、旧fixtureの命令IDを認める救済分岐は作らない。素材参照JSONと解決された実動画のSHAを分け、依存graphに束縛する。入力・登録・消費は実際の通常callerを使い、試験で置換するのは判断応答だけ。

計画の完了登録に次工程の消費を先取りさせない。v004一案のconsumptionBindingは計画の必須fieldから検証成果物側へ移す。新規保存時から安全な単一fileName／論理artifact参照へ結び、既存PUT/GETを使って必要なデータ一式を保存・転送する。uploadでは転送元のローカルデータを暗黙参照できない別root／別processから再読する。path検査緩和、新endpoint、旧回答の付け替えはしない。

旧live実装参照は固定Git版・proofで歴史的に保持し、現行コードの開発を永久に止める条件にしない。旧bindingの新HEAD実行は拒否し、固定版の来歴確認と現行製造資格を分ける。旧業務stateの識別補完・削除・一括移行、本番サービスの切替は行わない。正確な変更path、拒否試験、影響範囲の型検査はv005を参照する。

`admission`の計画整合、字幕／演出未接続、動画許可未承認、人間品質pendingを分離する。参照が未提供なのか、提供された参照が欠損・改変なのかも区別し、後者をpendingへ丸めない。通常キューの検証工程が完了しても動画完成・実行可能とは報告しない。

主report：[通常接続report](reports/request-intent-connection-20261001/README.md)。今回の試験は同directoryの`queue-integration-test.mts`と必要な軽量証拠・旧版保全proofへ保存する。`debd5897`で通常計画登録までの部分実測と停止証拠を保存済み。その旧attemptは変更せず、修正後の新しい隔離attemptへ進む指示。再開自体はまだ観測していない。

## 2.1 v004の受理と未承認の適用事項

`d77f2a5d`の[一案](reports/request-intent-connection-20261001/queue-integration-contract-proposal-v001.md)、[probe](reports/request-intent-connection-20261001/queue-contract-probe.mts)、[実測](reports/request-intent-connection-20261001/queue-contract-evidence.json)、主reportと6file差分を照合した。10境界はkind／形状受理2と想定拒否8。別processの26保護path確認は保存結果・Codex報告に基づき、相談役がMacで再実行したものではない。通常completeの所有者、sharedの命令生成、artifact PUT、stdin transportも現物確認した。

公開型・工程は**開発候補の隔離実装**として扱う。正式適用に残る判断は `ID9-PD-01`（一般のDigest下書き承認で品質pendingの機械採否・保持まで任せるか）、`ID9-PD-02`（特定計画／基礎映像／最終出力への動画許可SHA・scopeの正式な束縛）。旧業務state移行・本番有効化も未承認。これらは品質視聴の未回答とは別の適用事項で、今回の固定応答試験を一般委任の実績へ読み替えない。

新しい人間の視聴・採点・技術方式選択を今要求しない。動画許可recordや人間品質採用を代理で作らず、開発・隔離試験はv005と今回の個別再開条件に従う。

## 2.2 受理済みv003

`7b600a64` の新消費側182行、接続・拒否試験、15結果＋5追加拒否、主report、9file差分を照合し限定技術受理済み。通常API→store→承認・claim→変更しないfactory→旧準備reader→新消費側→既存job形状／区間時計検査まで成立。複数候補・非連続keep、候補ID／区間ID／断片列／順序／元msを維持し、4出力保存・別process再読・拒否を確認した。

source/STT成功依存とproviderは隔離fixtureであり、実completeを通した所有者やlocal素材JSONの確認はv005で行う。前回の限定成果を無効にしない一方、通常全工程・実AI品質・動画製造・人間採用へ広げない。旧v002の16実装・18保存物の保全はその検証時点の記録として保持する。

job形状検査は専用human assembly承認の検査・実行資格とは別。backend kindが通ることもrunner詳細schemaの受理と別。v004で確認したこれらの境界をv005でも偽装しない。

## 2.3 参照不整合の修正・再開（今回の本人承認を受領）

停止監査時の記録はインデックス§2.8と[当時の本書](https://github.com/f-kw/zev2/blob/ad180adce010bd3eb765f081f451a39b354b7d9f/docs/CURRENT_GOAL.md)に保持。今回の本人回答と指示はインデックス§2.9とv005 §11を正とし、古い「本人承認未受領」で止め直さない。

採否要求の参照は`artifacts/<draft>/candidate-set.json`、実保存名は`artifacts/<draft>/<request>--candidate-set.json`。内容SHAは一致するが宣言pathは存在しない。[証拠](reports/request-intent-connection-20261001/queue-logical-reference-gap-evidence.json)とshared resolver・準備moduleのoutputRoot/fileを相談役が照合し、完了にせず停止した判断を妥当とした。Macの試験再実行や全保存物の直接hash検査ではない。

修正は新規論理参照`artifacts/<draft>/<producer-request>/<file>`を既存の安全な単一保存名`<producer-request>--<file>`へ共通resolverで対応付け、準備のoutputRoot／registryと必要な参照形成を合わせる。主対象はsharedの`digest-plan-artifacts-v001.ts`とrunnerの`digest-plan-preparation-v001.ts`。不可欠な同じ欠陥のcallsite追従だけv005 §5の既許可path内で行う。内容builder／validator・PUT/GET・認証／安全条件は変えない。

上位manifestに加え要求内部の参照も登録前・次の実消費で確認し、欠損・別draft・依存外request・衝突を拒否する。source/STTの正規依存元と無関係requestを区別する。旧JSON／要求／回答SHAの付け替え・alias作成で隠さず、修正後の新しい隔離attemptだけへ適用する。

**本人の「良い。指示書作って」により、今回の参照対応修正に限り追加1回＝製品修正累積4回目と、その後の既承認未実施検証を再開してよい。** 一般の3回上限・失敗履歴は変更／リセットしない。別の製品修正が必要になれば追加作用を止めて報告する。修正後の検証実行だけに再承認を求めない。

stdoutの元発話「失敗」を判定から外し、実exitと実queue状態を見る設営修正は、適用時に既存枠内の設営5回目とする。App.vueの二表示名は`83f9112939457ddc0f4dcfc4e172b39b7d19b785`で許可済み。この再開内で適用・client型検査を行い、結果を次の実質checkpointにまとめる。表示名の再承認は不要で、型検査を弱めない。

通常source/STT登録・3判断・計画completeは部分到達。再開後は次工程complete、upload／別root消費、MP4枝、inspection未提供枝、否定回帰・clientを含む必要型検査まで続行する。旧成果・人間回答は保持し、全動画の再生成・再レビューは不要。Codex2単独、Codex1再起動や応答保存だけの再commit・終了連絡も不要。指示は発行済みだが、実再開・修正完了・各検証合格はまだ未確認。

## 3. 完了済みを再開しない

- 新素材の15分31.633秒初稿と9/28の人間初見レビューは実施済み。9/29の144pxと条件付き新分割への肯定回答も保持する。
- 旧9分47秒案の1080p生成・低メモリ化・本体/replay一致・345点native QC・共有保存・別process再読は `d7e465925c6277a08248b4207d7df8951e988895` で技術受理済み。
- ID9実案は `b69e168cf1d34f21d7b760bdebcd9e19baca69c7` で受理。11候補・7採用・9保持、27,691frame（15:23.033）の一案、旧版差分、局所540p5本・147字幕、111試験・保存再読まで。送信実績 `68a32038ebcd6dbee62454deca8999bd3d27d33c` とGit終了を受領済み。
- Codex1点検 `9b72bc0fed58684a2cdd8d012ff3757443cfcd18` は対象案 `bd0113c8301e49eb74993385286fd12c1b9894b8` まで。送信実績 `b93870fcafbf5671b45ada02cc1f8217478fac86` と終了受領済み。心霊回帰会話の不採用理由はCodex2が補足し相談役受理。補足版・局所媒体のCodex1点検は未実施のまま、再起動不要。
- 通常callerからの計画準備v002は `11809f6f6bebed82014971c966b79b383b921a1d` で受理。通常factoryから明示依存で3判断を呼び、目的・承認版・素材・要求SHAを保持。27対象結果、保存・再開・再読。通常既定は未指定だった。
- v003、v004はそれぞれ限定入力接続、設計・境界実測として受理済み。製造実走や人間未回答を理由に未完了へ戻さない。
- 一件変更・保存・Reset・内容修正の既存能力はある。未着手扱いして一から作らない。

根拠は[引き継ぎインデックス§2](HANDOVER_INDEX.md#2-最新状態のカプセル)と各report。旧完成MP4、新15:23構成案・局所媒体、固定provider配線試験、通常キューの開発候補と実業務適用は別の到達点である。

## 4. 人間負荷・未解決・権限

人間確認事項は[既存台帳](HUMAN_REVIEW_PENDING.md)へ蓄積し、依存しない承認済み作業を進める。全編再視聴・正解ラベル付け・過去の感想の再説明・通常技術判断をキョウカさんへ要求しない。未回答を採用としない。

縁A/B選択null、A=8/4は技術入力、Bの21字幕の論理不合格、色の種類と適用、アップのHUD制約・手指定、旧レビューと修正後未回答、制作負担・通常キュー本適用・実推論・人間品質は残件として保持する。Decisions調査は完了・実API評価は保留であり、この接続の依存にしない。必要時に公式情報を再確認する。

新規素材・外部推論API・費用・一般委任契約・製品モデル設定・本番既定・正式採用・公開・旧成果削除を包括承認しない。今回の開発候補の具体的な型／caller差分はv005に限定。STT・inspection・動画実走は行わない。中断時の累積は設営修正4・製品限定修正3。§11の参照修正を適用すれば製品累積4、stdout修正を適用すれば設営累積5として記録する。未適用を実施済みにせず、一般上限・その他の停止条件は維持する。

## 5. 保存と継続

方針・指示発行・監査・完了・中断は同じターンに正本へ反映し、会話の上限を待たない。取得・保存不能や未確認の稼働は明示する。初回／再起動の指示はコピー可能な一つのコードブロック、着手後はCodexの直接報告と相談役の監査・次指示を同じセッションでつなぐ。

各セッションは自分専用のEdgeタブだけを使い、他担当・ユーザーのタブに触れない。stage/commit/pushは直列化、担当fileだけ明示stageし、他者成果を保持する。`debd5897`のGit操作終了・担当返却と隔離process残存なしはCodex報告として受領し、remote mainは相談役が確認した。今回、本人承認と再開指示を正本へ保存し、文書保存終了後はCodex2が最新mainを取り込んで再開する。受領・稼働はまだ未確認。受理記録だけの再commit・終了連絡・再起動を増やさない。

上位運用は [AGENTS](../AGENTS.md)、[監査プロトコル](CODEX_CHATGPT_AUDIT_PROTOCOL.md)、[人間確認方針](policies/HUMAN_REVIEW_ACCUMULATION_POLICY_v001.md)。一般の上限や旧GOAL_DEFINITIONの意味・数値は変更していない。更新前の本書は[本人判断待ちの固定Git版](https://github.com/f-kw/zev2/blob/ad180adce010bd3eb765f081f451a39b354b7d9f/docs/CURRENT_GOAL.md)、[中断時の固定Git版](https://github.com/f-kw/zev2/blob/debd58971f543958df0022988e00bed9e20ddcbc/docs/CURRENT_GOAL.md)、[前の固定Git版](https://github.com/f-kw/zev2/blob/d77f2a5ddc48016e6e1c7f22bee454fc231ffda7/docs/CURRENT_GOAL.md)で保持し、古い現在地は履歴として扱う。
