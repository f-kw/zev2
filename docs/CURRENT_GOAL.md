# CURRENT_GOAL — 現在の目的と復元入口

更新日：2026-10-01（JST）

## 1. 最初に読む

プロジェクトのZEV_START_HERE.mdを全文読み、GitHub mainの現在HEADを確認し、同一SHAの [HANDOVER_INDEX.md](HANDOVER_INDEX.md) と指定資料から復元する。旧添付・Drive snapshot・会話要約・メモリだけで現在地を認定しない。

## 2. 現在の主作業・次の指示

**9. 明示Digestの通常キュー接続（v005）。`60b959d91d0885ac2bf9cf4aaae66eff93454bab` の時計修正・local通常登録／消費complete・別process再読を限定技術受理した。uploadは素材copy中のENOSPCで停止、v005全体は未完了。次は大容量copyを再試行せず、容量と保存先の実測・具体的再開案、および追加素材copyを要しない未実施検証へ進む。**

`decision: continue`。今回の正本は [容量preflightと低容量検証の限定指示](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_CAPACITY_PREFLIGHT.md)、保存 `6444a8685953bb47429442e122a5212a0f7b8520`。同じCodex2単独、同じv005内の続行。本人の「終わったら次に進んで」「独断で決めれる程度なら自動で承認して」に基づく。Codex1再起動・人間視聴・採点・転記は不要。

このcontinueは**読取り中心の容量確認・小さい試験設営・低容量の残検証**に限定する。大容量copy／PUT／upload、旧成果削除・移動、外部保存先の新規利用を許可したものではない。実在する保存先・追加保持量・工程中ピークを確認してから、大容量工程の再開を相談役が具体化する。新しい指示の受領・再稼働、Macの最新空き・別保存先・容量確保の実施は未確認。

## 3. 今回の受理範囲と容量停止

相談役は時計参照consumer・shared型／検査、15局所検査結果、容量停止の実state、停止後再読記録、通常試験の実行順を照合した。Macでの直接再実行／全bytes再hashではない。

- 時計だけ実保存bytesのSHAを持つbyte参照、他のJSON出力・消費記録は版付きJSONのまま。時計本文／計算／区間・断片／順序／frame/sample、serializer、null・admissionを維持した限定修正は受理済み。
- 局所15検査、shared/backend/runner/Remotion/client型検査はexit0の記録。attempt-005 localは通常下書き・承認→旧source/STTの実claim/PUT/complete→実index/factoryの3判断→計画complete→次の実消費completeまで成立。別process再構築1件、96保護file確認、時計SHAは旧attempt-004と一致。実AI品質、素材取得／STT処理の全工程合格ではない。
- uploadはData volume空き約1.9GiB、素材4,803,412,827 bytes（約4.47GiB）の条件でcopyがENOSPC。計画はfailed、計画／検証FileRef未登録、検証queued。自分の試験親／二backendを停止したという報告。現時点のMac稼働・空きは相談役未観測。
- upload転送／worker-backend分離root／転送先だけの別process再読、MP4直接登録／inspection未提供の通常complete、通常否定・Clip回帰は未実施。局所null検査を未提供の通常経路完了へ広げない。目的2件の全3判断と全経路の合格もまだ認定しない。

根拠：[主report](reports/request-intent-connection-20261001/README.md)、[容量依頼](reports/request-intent-connection-20261001/queue-capacity-followup-request.md)、[停止現物](reports/request-intent-connection-20261001/queue-capacity-stop-evidence-attempt-005.json)、[15検査](reports/request-intent-connection-20261001/queue-clock-reference-evidence-attempt-005.json)、[再読・保全](reports/request-intent-connection-20261001/queue-clock-capacity-readback-attempt-005.json)。

## 4. 容量対応の具体的範囲

現在のworkspace/runtime、元素材、worker/backend/readerのvolume・実利用可能bytes、今回のrequest-intent系領域の使用量を読取り中心で確認する。論理bytes・割当bytes・実際に解放できる量を混同しない。別folderや/tmpを独立容量とみなさず、外付けSSDの実在・利用許可を推測しない。

残りのcopy／PUT／GET・一時file・既存全保持を含め、volume別に必要な追加保持量とピークを実処理から算出する。新しいruntimeだけを既承認の容量ある保存先へ置く構成を第一候補として、実path・許可根拠・必要差分を一案にする。確認済み保存先がなければ未確認として相談役へ返す。削除・移動・圧縮・link置換・snapshot/cache操作・新しい外部転送／購入はしない。

現行試験は毎回local-json→upload-json→local-mp4の順に走る。完了済みlocalを再製造しないため、既存scenarioの明示選択と作用なし容量preflightを試験側へ最小追加してよい。今回の設営訂正一件は、適用時に**設営累積7回目**として相談役承認。製品累積5・設営累積6の実施履歴は保持し、適用前を7実施済みにしない。製品code・通常API／caller・固定応答・検査意味は変更しない。

元動画copyを要しない未実施の通常入力拒否／Clip対象回帰は、新しい小さい隔離stateで進める。既存完了計画は読み取り専用で使い、旧stateへ否定fixtureを書き込まない。大容量を要する残件だけ容量待ちに残す。実行しない項目はnot-runとし、旧成功と今回結果を同一E2Eへ合算しない。小さい試験・ログの空きすら不足する場合も無理に作用させない。

## 5. 親v005の製品境界と未承認事項

[v005](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md) の開発候補は必須productionType、共通queueのprepare_digest_plan／validate_digest_plan、専用digest_plan_json／digest_execution_input_json。Digestはsource/STT＋この2工程まで、Clipの既存7工程・確認条件は維持。動画工程は型・命令とも追加しない。

FileRef.ownerIdはOutputEntity ID、素材参照JSONと実動画のSHAは別。実依存鎖、要求／回答SHA、全断片被覆、内部参照、通常登録と次工程の再読を維持する。旧fixtureのownerId救済、架空selectedThemeId、単一テーマへの偽装、旧回答SHA付替えは使わない。

ID9-PD-01（一般のDigest下書き承認による機械採否／保持の委任と公開型の本適用）、ID9-PD-02（特定計画／基礎映像／最終出力への動画許可SHA・scope）、旧業務state移行・本番有効化は未承認。字幕／演出未接続、動画許可未承認、人間品質pendingを維持する。inspectionの未提供nullと、提供済み参照の欠損・改変による不合格も区別する。

外部推論・費用・新素材・取得／STT／inspection実行・映像音声製造・新UI・renderer/native QC変更・本番・正式採用・公開・旧成果削除は対象外。今回の資源調査を追加製品修正や容量上限の新設にしない。

## 6. 完了済みを巻き戻さない

- 15分31.633秒初稿の生成と9/28人間レビューは完了。9/29の144pxと条件付き分割の肯定を保持する。
- 旧9分47秒案の1080p生成・低メモリ化・345点QC・本体/replay・保存再読は`d7e46592`で技術受理済み。
- ID9構成案は`b69e168c`で受理。11候補・7採用・9保持、15:23.033、局所540p5本・147字幕・111試験・保存再読。送信実績`68a32038`、Git終了受領済み。新案全編1080p・人間品質は別。
- Codex1は`bd0113c8`対象の独立点検を`9b72bc0f`で完了、送信実績`b93870fc`と終了を受領。補足後版・局所媒体の再点検は要求しない。
- v002準備接続`11809f6f`、v003後段入力`7b600a64`、v004設計・境界`d77f2a5d`は限定受理済み。source/STT成功fixture等の範囲を実通常全工程へ一般化しない。
- v005の参照対応と局所5参照／拒否9件はattempt-004で成立。時計修正・local通常completeは今回受理。これらを容量不足のせいで未修正へ戻さない。
- 既存の一件変更・保存・Reset・内容修正は実装済み能力であり、一から再開しない。

## 7. 人間負荷・記録・継続

役割・残課題・担当状態は [HANDOVER_INDEX.md](HANDOVER_INDEX.md)、人間原文と対象版は [HUMAN_REVIEW_PENDING.md](HUMAN_REVIEW_PENDING.md)。縁A/B未選択、B論理不合格、字幕の条件付き評価、色・強調、HUD、旧レビュー修正版未回答、制作負担・通常適用・人間品質等を失わない。軽微な技術例外はAGENTSの本人委任に基づいて相談役が判断し、通常技術事項を本人へ転記させない。

方針・指示・受理・中断は同じターンで正本へ反映する。Codex2の`60b959d9`のGit終了を受領済み。相談役の保存終了後に同期する。担当fileだけ明示stageし、stage/commit/pushを直列化する。Edgeは自分専用タブのみ。受領記録だけの再commit・終了連絡・再起動、Codex1再起動は不要。未確認の実稼働を保存完了から推測しない。

上位運用は[AGENTS](../AGENTS.md)、[監査プロトコル](CODEX_CHATGPT_AUDIT_PROTOCOL.md)、[人間確認方針](policies/HUMAN_REVIEW_ACCUMULATION_POLICY_v001.md)。一般上限・強制停止条件は変更しない。更新前全文・細かな中断履歴は[60b959d9の固定版](https://github.com/f-kw/zev2/blob/60b959d91d0885ac2bf9cf4aaae66eff93454bab/docs/CURRENT_GOAL.md)に保持する。
