# CURRENT_GOAL — 現在の目的と復元入口

更新日：2026-10-01（JST）

## 1. 最初に読む

プロジェクトのZEV_START_HERE.mdを全文読み、GitHub mainの現在HEADを確認し、同一SHAの [HANDOVER_INDEX.md](HANDOVER_INDEX.md) と指定資料から復元する。旧添付・Drive snapshot・会話要約・メモリだけで現在地を認定しない。

## 2. 現在の主作業・次の指示

**9. 明示Digestの通常キュー接続（v005）：本人承認済みの容量整理をCodex2が実施。元素材と実size／SHAが一致した試験コピー8本（35.79GiB）を削除し、同volume空きを2.00GiBから37.82GiBへ回復した。元素材・元STT／inspection・完成／確認用動画・判断／検査記録・stateを保持。削除した素材を参照する旧runtimeは再作成前の即時再読不可。大容量試験は再開せず、SSDの接続・移行先・利用開始は未確認。v005全体は未完了。**

`decision: continue`（限定した容量整理）。正本は [本人承認済みの削除指示](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_STORAGE_CLEANUP.md)、保存 `a8fc1a7d4f2631055fef907017e6b82dccfbb1d3`。直前の [容量preflight指示](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_CAPACITY_PREFLIGHT.md) の削除禁止を、今回明示した検証用複製／partialだけについて更新する。一般の旧成果削除許可ではなく、今回の本人の直接依頼に基づく一回の整理である。

同じCodex2単独。候補一覧作成だけで止めず、適格なfileは同じ作業内で削除・回収確認まで行う。本人に一覧承認を再要求しない。由来・保持元・使用状況が確認できないfileは残し、他の適格な対象を進める。大容量copy／upload／MP4試験は、空きを回復しても自動再開して埋め直さない。

## 3. 受理済み範囲と容量停止

`60b959d91d0885ac2bf9cf4aaae66eff93454bab` の時計修正・local通常登録／消費complete・別process再読は限定技術受理済み。v005全体は未完了。相談役の監査はGitHubの実装・保存証拠に基づき、Macでの直接再実行／全bytes再hashではない。

- 時計だけ実保存bytesのSHAを持つbyte参照、他JSON・消費記録は版付き。時計本文／計算／区間／断片／順序／frame/sample、serializer、null・admissionを維持した修正は受理済み。
- 15局所検査、shared/backend/runner/Remotion/client型検査のexit0、attempt-005 localの通常下書き／承認→旧source/STTの実claim/PUT/complete→実index/factoryの3判断→計画complete→実消費complete、別process再構築、96保護file確認、旧attempt-004との時計SHA一致を記録。実AI品質や素材取得／STT処理の全工程合格ではない。
- uploadは当時のData volume空き約1.9GiB、素材4,803,412,827 bytes（約4.47GiB）の条件でcopyがENOSPC。計画failed、計画／検証FileRefなし、検証queued。試験親／二backendのみ停止という報告。今回の削除直後の実空きは37.82GiB、ID9試験writerは観測されなかった（削除記録の時点）。
- upload／分離root／転送先だけの別process再読、MP4直接登録／inspection未提供の通常complete、通常否定・Clip回帰等は未実施。直前preflight指示で新たに実施した項目があればCodexの実報告で更新する。目的2件の全3判断・全経路の合格は未認定。

根拠：[主report](reports/request-intent-connection-20261001/README.md)、[容量依頼](reports/request-intent-connection-20261001/queue-capacity-followup-request.md)、[停止現物](reports/request-intent-connection-20261001/queue-capacity-stop-evidence-attempt-005.json)、[15検査](reports/request-intent-connection-20261001/queue-clock-reference-evidence-attempt-005.json)、[再読・保全](reports/request-intent-connection-20261001/queue-clock-capacity-readback-attempt-005.json)。

## 4. 今回の削除範囲と実施後の扱い

実workspaceの `runtime/artifacts/` 直下の **request-intent-系のID9通常接続試験領域**から、元ファイルとの実size／SHA一致が確認できる検証用素材コピー、または失敗ログ等で確定した素材copy／転送partialだけを対象とする。prefixは探索条件であり、一括削除の指定ではない。file単位で対象を確定し、現在使用中ではないことを確認する。

元素材 `runtime/artifacts/digest-new-material-20260926-v001/source/source-video.mp4`、書き起こし・inspection、完成／確認用動画、判断・要求／回答・採否／保持・state・binding・manifest・ログ・検査結果・SHA・Git管理file・他担当作業・唯一の実体は削除しない。original-resolution系など他領域にも広げない。

削除前にpath、size、実SHA、保持する原本／コピー、分類、参照する旧attemptを軽量一覧へ保存・pushする。その後、一覧の適格なfileだけを実削除する。原本を一覧に含めず、symlinkや未知hardlinkを推測で処理せず、runtime全体・拡張子・prefixによる一括削除をしない。回収のためにユーザーのゴミ箱全体・snapshot・cacheを消さない。

削除後は論理削除量とvolumeの実空き増加を分けて報告する。旧証拠は書換えず、新しい削除記録に `retired-by-user-approved-cleanup`、保持元と再作成が必要な参照を残す。**過去の成功は履歴として維持するが、削除した試験runtimeをそのまま再読できるとは主張しない。** この整理を理由にreaderを弱めたり、失ったコピーを直ちに再生成したりしない。

SSDは本人の準備意向のみ確認。接続・mount先・利用開始や移行は未確認。大容量再試行は別の具体的な再開指示まで保留する。既承認の小JSONのみの独立検証は削除対象へ依存しない範囲で可能だが、容量整理の報告を先延ばししない。

削除一覧・実行結果は既存report directoryの `queue-storage-cleanup-20261001-v001.json`、主reportへ関連付ける。直前preflight／scenario選択の設営7は許可済み・未適用。製品5／設営6の履歴を維持し、今回の本人指示による容量整理を修正枠のリセットに使わない。

削除実績：削除前記録を `04c21bfdeccde7210193d731bcf205f4ea19a03e` でpushしてから8本を個別削除。論理量38,427,302,616 bytes、実空き2,145,939,456→40,604,250,112 bytes、観測増加38,458,310,656 bytes。保持元3fileのidentity不変、旧証拠69件SHA不変、その他試験file634件metadata不変。partial指定先は元から不存在。大容量工程は保留。

## 5. 親v005の製品境界と未承認事項

[v005](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md) の開発候補は必須productionType、共通queueのprepare_digest_plan／validate_digest_plan、専用digest_plan_json／digest_execution_input_json。Digestはsource/STT＋この2工程まで、Clipの既存7工程・確認条件は維持。動画工程は型・命令とも追加しない。

FileRef.ownerIdはOutputEntity ID、素材参照JSONと実動画SHAは別。実依存鎖、要求／回答SHA、全断片被覆、内部参照、通常登録と次工程の再読を維持する。旧fixtureのownerId救済、架空selectedThemeId、単一テーマ偽装、旧回答SHA付替えは使わない。

ID9-PD-01（一般のDigest下書き承認による機械採否／保持の委任と公開型の本適用）、ID9-PD-02（特定計画／基礎映像／最終出力への動画許可SHA・scope）、旧業務state移行・本番有効化は未承認。字幕／演出未接続、動画許可未承認、人間品質pendingを維持。inspection未提供nullと、提供済み参照の欠損／改変は区別する。

外部推論・費用・新素材・取得／STT／inspection実行・映像音声製造・新UI・renderer/native QC変更・本番・正式採用・公開は対象外。今回の明示許可対象以外の削除・移動・圧縮・外部転送も許可しない。

## 6. 完了済みを巻き戻さない

- 15分31.633秒初稿生成と9/28レビューは完了。9/29の144pxと条件付き分割の肯定を保持。
- 旧9:47案の1080p生成・低メモリ化・345点QC・本体/replay・保存再読は`d7e46592`で技術受理済み。
- ID9構成案は`b69e168c`で受理。11候補・7採用・9保持、15:23.033、局所540p5本・147字幕・111試験・保存再読。送信`68a32038`とGit終了受領済み。新案全編1080p・人間品質は別。
- Codex1は`bd0113c8`対象を`9b72bc0f`で点検、送信`b93870fc`と終了受領済み。補足後版・局所媒体の再点検は要求しない。
- v002準備`11809f6f`、v003後段入力`7b600a64`、v004設計`d77f2a5d`は限定受理。fixtureの成立を実通常全工程へ一般化しない。
- v005参照対応と局所5参照／拒否9件はattempt-004で成立。時計修正・local通常completeも受理。容量不足・コピー整理で未修正へ戻さない。
- 一件変更・保存・Reset・内容修正は既存能力。一から作り直さない。

## 7. 人間負荷・記録・継続

役割・残課題・担当状態は [HANDOVER_INDEX.md](HANDOVER_INDEX.md)、人間原文と対象版は [HUMAN_REVIEW_PENDING.md](HUMAN_REVIEW_PENDING.md)。縁A/B未選択、B論理不合格、字幕の条件付き評価、色・強調、HUD、旧レビュー修正版未回答、制作負担・通常適用・人間品質等を失わない。通常技術事項を本人へ転記させない。

方針・指示・受理・中断は同じターンで正本へ反映。Codex2の`60b959d9`のGit終了は受領済み。先行preflightの設営7は未適用、今回は削除だけを実施。最新の未commit・担当競合を確認し、他者変更を保持する。担当fileのみ明示stage、直列commit/push、専用Edgeを維持。受領だけの再commit・終了連絡・再起動、Codex1再起動は不要。削除実績は[削除前一覧・実行結果](reports/request-intent-connection-20261001/queue-storage-cleanup-20261001-v001.json)と主reportで確認する。

上位運用は[AGENTS](../AGENTS.md)、[監査プロトコル](CODEX_CHATGPT_AUDIT_PROTOCOL.md)、[人間確認方針](policies/HUMAN_REVIEW_ACCUMULATION_POLICY_v001.md)。一般上限・強制停止条件は変更しない。更新前全文は[034503d7固定版](https://github.com/f-kw/zev2/blob/034503d72e70665615879686e07f1acf24f6cbd1/docs/CURRENT_GOAL.md)に保持する。
