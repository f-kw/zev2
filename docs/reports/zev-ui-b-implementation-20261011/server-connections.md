# Codex-UI 接続工程検査報告｜68. B案UI実装（全体未完成）

2026-10-11 UTC。実装checkpoint: `a55b8bcdbf88d58369280422cf1e470593c6d572`（初回接続保存 `c8784b28b9a0bfae9eb008aa87ac5dab4c12d8e6`）。開始main: `cbee9353a61b7ef7eb01fc18b8323dc4b08039c1`。前のclient checkpoint `c65877cfe52801455207bada148b90503a1f0b31` に続く接続工程の記録。

## 変更結果

下書き・確認資料・完成動画の表示内容をサーバーでも照合するようにした。表示後に差し替わった資料は409で拒否し、新しい動画を勝手に最終判断の対象へ選び直さない。確認と保存は既存のstate排他処理の内側で行う。

保存済み候補には題名・要約だけでなく、元の発話本文・区間を表示する。作成前確認には登録済みの順番・区間・字幕・表示枠・発話対応を表示する。ファイルの存在だけで信頼せず、処理結果と保存登録、実際のsize/hashを照合する。動画のhash検査はストリームで行い、全動画をメモリへ展開しない。

再開は表示中の承認済み依頼だけを対象とする。runnerの次作業取得・claim・完了・失敗・後続取得にも同じ依頼と期待版を渡す。確認した実行設定も固定し、設定変更や未確認の実効STT接続先を拒否する。別依頼のqueueへ移らず、競合する起動・claimも拒否する。

**この接続工程の実装と隔離検査は済んだ。No.68全体は未完成、Doing rev3を維持する。** 既存資料に正式な元音声保持・品質判定がなく、作成前の承認は停止したまま。推薦の指定、プレビュー未作成と実際の準備中の判定、Digestの通常UIからの製造、外部送信・料金承認も未接続。本人へ同じレイアウト承認を求めない。

## 指示・所有範囲

本人2026/10/11 10:14 JST「63 OK これで進めて」、採用済み4ページPDFの承認に基づくNo.68。PDFの版・現物・全4ページの確認は[前checkpointの記録](handoff.md)にある。同じLibrary IDの再取得0、原本変更0。

委任元 `01a0ff1f-1ad3-70b5-bb7f-d0f3988a10e6` から、既存state排他内の期待版照合、保存済み資料reader、実行時の費用確認拒否を許可された。その後、`runner/src/index.ts` のnext/claim/後続loopに限り担当を引き継ぎ、依頼限定実行まで実装する指示を受領。GitはSSD担当の先行保存後に返却された。新しいversion管理、課金仕組み、製造契約、permit、Goal/work-order、DECISIONSの変更は行わない。

自分のsource対象15path:

- client: `App.vue`, `api.ts`, `guided-workflow.ts`, `stores/controlQueue.ts`, 専用unit/mock各1file。
- backend: `domain/ui-review.ts`, `domain/control-review.ts`, `routes/control.ts`, `runner/auto-runner.ts`, `web-gemini/routes.ts`, 専用unit1file。
- shared: `src/index.ts`, `src/ui-confirmation.ts`。
- runner: `src/index.ts` の取得・loop・実行scope境界のみ。

制作担当の `evals/clip_composition/serve_digest_review_v001.py`、対応test、正式製造job、artifact型/validator、生成契約は変更0。共有checkout切替、reset/stash、branch/worktree、他sessionのstage/commit、配信/アプリ停止0。SSDへの処理起動・書込み0。

## 接続の根拠

| 機能 | 保存・実行時の条件 |
| --- | --- |
| 下書き開始 | 表示した全RequestDraftと全RuntimeConfigの既存値が一致。旧empty-body承認は拒否 |
| 内容確認・修正 | review ID/draft ID、登録資料hashを含む表示fingerprintを再構築。一致しない古い確認は拒否 |
| 保存候補reader | 最新producerのresult→OutputEntity→FileRefを照合。theme候補ID、発話ID、元本文、clockは保存資料から読む |
| プレビュー | 候補の既存evidenceが明示する同依頼の登録動画だけを読取。全体完成動画を候補previewとして流用しない |
| 作成前資料 | composition/editPlan/patch/sourceの登録、kind/MIME/path、size/hash、表示対象fieldsを検査。patchの編集案参照とrenderReadyを照合 |
| 最終判断・動画修正 | 表示中のFileRef ID/hashをPOSTし、現在の最新producerに一致する同じ媒体だけを対象とする |
| 再開・後続loop | 承認済みdraftの全既存値＋確認した設定のscopeを必須化。指定外応答は製造前に拒否 |
| claimの期限 | 既存の期限回復を指定依頼にだけ適用。期限切れownerの完了は拒否。別依頼のclaimは変更しない |
| 競合 | 既存runnerが動いている起動、別running作業があるclaim、重複claimを拒否 |
| 外部費用 | 正式な送信・料金承認資料がないGemini API modeはserverとrunnerでも拒否。価格・上限を仮置きしない |

既存backendの `validateArtifactFileRefForKind` を再利用した。JSONは表示項目の整合も確認するが、runnerに閉じた全 `assertJsonArtifactForKind` の再実行まで接続したとは報告しない。音声保持・品質資格を欠く状態を合格にはしない。

UI/ backend/runnerは同一checkpointのセットとして接続する必要がある。scope/確認資料のない旧呼出しを通す後方互換分岐は設けていない。

## 検証

- [backend-unit.txt](server-evidence/backend-unit.txt): **18/18 pass**。実control router、既存state排他、隔離runtime、auto-runner無効で検査。古い内容/誤依頼/確認欠落、登録bytes差替、重複承認、readiness不足、実行設定差替、最新動画差替、古い動画からの修正、別queue/競合claim/期限回復を確認。
- 同検査のactual runner CLIは偽loopback endpointだけを使用。指定外next、変わったclaim応答、未確認の実効STT接続先を取得/製造前に拒否。claim応答を検証できなかった場合は、未取得の依頼へfailを送らない。provider/media builderは呼んでいない。
- [client-unit.txt](server-evidence/client-unit.txt): **17/17 pass**。遅延した資料取得が別依頼/新版の表示を上書きしないことを追加。
- [shared-build.txt](server-evidence/shared-build.txt)、[backend-runner-build.txt](server-evidence/backend-runner-build.txt)、[client-build.txt](server-evidence/client-build.txt): shared/backend/runner/Remotion/client型検査・build成功。既存のclient 500kB超chunk警告は残る。
- [ui-contract.txt](server-evidence/ui-contract.txt): 既存UI契約検査成功。diff whitespace検査成功。

専用Edge＋全 `/api/` を隔離するmockで確認した操作:

| 操作 | 観測 |
| --- | --- |
| 候補を開く→別案閲覧→閉じる→再表示 | 採用不変。画面上の採用反映までPOST0 |
| 採用反映→次へ進む | 候補`turn`の保存POST1。閲覧と保存を分離 |
| 作成前確認の再表示・候補一覧Escape | 保存字幕/区間を表示。音声/品質不足で作成無効。閉じた後にbuttonへfocus復帰 |
| 別依頼も待機中→再開 | 表示中`draft-3`だけのscopeでPOST1。実行設定も含む。表示はその依頼の内容確認へ復帰 |
| 新規入力→保存→戻って修正→別版保存→確認後開始 | 保存2回、承認1回。旧版を開始しない |
| 動画修正の範囲確認→取消→再表示→確定 | 修正POST1。表示FileRef/hashと設定を送信。new copyへ切替、旧動画の再表示なし |
| 失敗の再表示→再試行 | 再試行POST1、設定を送信。新しい編集コピーへ復帰 |

証拠: [候補reader](server-evidence/candidate-reader.jpg)、[作成前reader](server-evidence/readiness-reader.jpg)、[指定依頼の再開](server-evidence/scoped-resume.jpg)、[失敗復帰](server-evidence/failure-recovery.jpg)、[通信記録](server-evidence/browser-mutations.json)。実媒体再生は行わず、mockの媒体は意図的な404。読めない動画は画面で読取失敗を表示する。download先の登録参照を表示したが、実動画download・通常速再生・音声聴取・人間品質採用は未確認。連打・中止・狭幅・旧結果混同の前cycle検査は[前記録](handoff.md)と区別して参照する。

初回readiness fixtureは、必要な採用済みテーマ確認を欠いて検査失敗した。fixtureへ実登録関係を追加して再実行。検査設営修正1件として旧失敗を保持する。ブラウザーのQA JSON直開きはclient側でblockedになったが、サーバーにはQA GETが届いた。通信記録のそのGETを製品操作に数えず、以降はmock起動時のfixture選択で検査した。HMR途中の一時的な画面状態も正式な操作結果に採用していない。

## 残る接続境界 — 親へ返す事項

1. **制作前の正式な音声保持・品質資料。** 既存 `runner/src/workflow-artifacts.ts` のPatchArtifactはrenderReadyのみで、音声保持/品質判定を表せない。`workflow-artifact-validation.ts` の既存validatorと、producerのreview evidenceから、同じsource/composition/edit/patch ID/hashに束縛された正式判定をreadinessへ渡す接続が必要。今回UIが判定値を作ったり旧gateを省略したりしない。readerへの入力資格が固まれば、`backend/src/domain/ui-review.ts` の現在の停止理由を資格照合へ置換できる。
2. **既存validatorの共有利用。** runner内の `assertJsonArtifactForKind` をbackend buildが利用できる既存契約のexport境界が必要。runner TSの直接importはbackend rootDirを越えるため、今回無断移設・validator複製をしていない。現在readerはkind/MIME/path/hashと表示fieldsの範囲まで。
3. **推奨・実際のpreview準備状況。** 現theme/reviewは推薦ID/根拠、候補動画の未作成/実job IDを返さない。制作producerの既存候補IDに対応する資格付き情報が必要。既存の明示FileRef previewは読めるが、推薦・準備中を推測しない。
4. **外部送信と料金承認。** 送信対象/provider/model/見積/本人承認範囲が既存RuntimeConfigにない。正式資格が確定して初めてserver拒否を置換する。料金/上限/承認tokenの新設は今回範囲外。
5. **Digest通常UIとの製造接続。** 既存Digest計画から正式人間承認・製造入力へ渡すadapterは未実装。制作担当のjob/permit/出力登録契約へ触れず、現UIは未接続を明示する。

## cleanup・Git・受渡し

証拠を上記へ固定後、自分の `/tmp/zev-ui-b-server-qa` 269015bytesを削除。元PDF・素材・正式/旧成果・共有archiveの削除0、新しい大容量媒体0。自分のmock起動5回はSIGINT/exit130で終了、専用tab閉鎖、port5179のlistener0。隔離unit runtimeは各testのafterで削除。build成果は既存workspaceの再利用物として保持し、共有のdist/node_modulesは削除しない。観測した内蔵空き17222668KiBは共有disk値で、SSDへの作用0。

今回source15path＋専用証拠11pathを `c8784b28`、ストリーム読取と差替検査3pathを `a55b8bcd` に保存。他session由来の `docs/CURRENT_GOAL.md`、`docs/HANDOVER_INDEX.md`、`docs/reports/openai-decisions-j16-integration-20261008/next-integration-scope-v001.md`、`docs/work-logs/2026-10/2026-10-11T1109_Codex-SSD_No61-current-input-preparation_cbee9353.md` は保持。stage/commit対象に含めていない。共有ツリー全体をcleanとは報告しない。

このreport/logの保存commit、push結果、最後のbranch/HEAD/status/untrackedは委任元への最終通知で示す。source threadへの受渡しはdelegationの終了通知で行う。指定相談役会話への最終監査は未送信であり、No.68の全体完了・Done・正式採用とは扱わない。次の明示指示がなければ、制作契約・費用資格・Digest製造・SSD処理へ広げない。
