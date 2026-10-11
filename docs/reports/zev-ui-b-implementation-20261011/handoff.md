# No.68 B案UI — client検査済みcheckpoint／全体未完成

session: Codex-UI。2026-10-11 01:51 UTC時点。保存前main: f32216b536c622f6b929f82e99b710d5b9e42515。

## 変更結果

採用済み4ページPDFに沿って、淡色の「依頼→下書き→内容確認→作成前確認→作成→動画確認」を実装した。下書き保存と処理開始を分離し、保存済み候補の閲覧、画面上の採用変更、次へ進む時の採用保存を分けた。候補を開くだけではAPI送信・AI処理・動画作成を行わない。

戻って別下書きを保存する導線、保存版の表示、動画保存先、最終判断、修正範囲の確認と取消、新しい編集コピーへの切替、失敗再試行、中止・再開を既存APIへ接続した。依頼や結果が変わると確認状態・dialog・旧動画・旧レビューを破棄する。実行設定の変更でも開始前確認を解除する。連打はstore境界でも拒否する。初期準備・演出準備・動画作成の表示段階を実工程から求め、待機・中止を完了としない。

保存済み資料は現在テーマ候補で、シーン区間・候補プレビュー・推薦指定の情報が不足している。初期表示は「保存済みの先頭案（推奨の指定は未接続）」、プレビューは「未接続」と明示した。作成前資料不足、Digestの動画工程不足、外部AIの送信・料金確認不足では開始・承認を止める。生成済み・未作成・実際の準備中を推測で付けない。

**安全に独立して進められるclient実装と操作検査は済んだ。No.68全体は未完成・Doing rev3。Doneへ移さない。本人の同じレイアウト採否を再確認しない。** 実動画製造、外部公開、有料API、新素材取得は0。人間の映像品質採用は未確認。

## 範囲と根拠

- 本人承認: 2026/10/11 10:14 JST「63 OK これで進めて」、確定後に実装する指示。
- No.68: `mona-zev-ui-b-production-implementation-20261011`、owner mona。登録・再読後に着手。Doing rev3保存済みを親から受領。No.63は本人削除済み、復元0。
- 親の続行指示: 内蔵client/mock検査は独立続行、backend変更は禁止、必要境界を入出力とfilesで返す。自分のclient変更・検査・引継ぎのcommit保存を許可、pushは共有状態確認後に判断。
- 親からSSD拡張は10:47 JST完了、元mount/UUID/既存内容/4確認URL復旧済みを受領。今回の作業は内蔵だけで継続し、SSDへの処理再開0。
- AGENTS、DECISIONS、CURRENT_GOAL、9/6製品方針、監査/cleanup/session log規則を読取。repoと親workspaceに `.agents/skills` は存在しない。
- 確定PDF: `/Users/kawafmm/Documents/Codex/2026-10-05/task-2/library-pdf-materialized-20261010/ZEV_UI案B_順番が見える案内型.pdf`。Library `libfile_018306f8ceb48191a340763e00c836d8`、version1、4pages、105260bytes、SHA256 `763225ae91db31dc8a4b49f3b8d2d87617ef9db6653e60eaf1c37bf5f0069b17`。materialization記録と実fileが一致。PDF skillで4pageを描画して目視。再取得0。

変更はclient5pathと専用report/evidence/session logのみ。backend/runner/shared source、制作担当の `evals/clip_composition/serve_digest_review_v001.py` とtest、生成契約、共有CURRENT_GOAL/HANDOVER、DECISIONSへの編集0。checkout/reset/stash/branch/worktree作成0。他session変更のstage/commit0。

## 実装と検証

対象: `client/src/App.vue`、`client/src/stores/controlQueue.ts`、`client/src/guided-workflow.ts`、`client/test/guided-workflow.test.mjs`、`client/test/guided-ui-mock.mjs`。

最新producerのresult.outputId→登録OutputEntity→FileRefを照合する。FileRef.ownerIdは実backendのoutput IDでありdraft IDではない。kind、result.outputType、request.fileRefIds、URI、hash、sizeも照合し、動画はvideo MIMEを要求。同時刻の新attemptも配列の新登録を優先し、古い成功動画を復活させない。再読時には表示draftをstoreのactiveDraftIdへ束縛する。別draftもready/runningであれば全体再開を拒否する。

- [unit.txt](evidence/unit.txt): 16/16 pass、fail/skipped0。保存と承認、正確な版、資料不足、出力束縛、同時刻の新attempt、古いrefresh、再読、別依頼の再開/再試行/中止/修正を検査。
- [build.txt](evidence/build.txt): client build成功。shared build＋vue-tscを含む。既存500kB超chunk警告あり。
- [ui-contract.txt](evidence/ui-contract.txt): 既存UI契約検査成功。
- `git diff --check`: 成功。

専用Edge＋全APIを遮断するloopback mockで行った操作:

| 操作 | 観測 |
| --- | --- |
| 下書きを見るの連打／戻って目的変更／別下書き保存 | 保存は各1回、保存だけの承認0。確認前の開始無効 |
| 確認後の開始連打 | 下書き承認1回 |
| 他候補を開く・別案を閲覧・閉じる・再表示 | 採用不変、POST0 |
| 明示採用・再表示・次へ進む連打 | 画面上採用保持。保存1回、selectedOptionId=turn |
| 作成前の不足資料 | 承認無効、製造POST0 |
| Escape／Shift+Tab／閉じた後 | dialog内でfocus循環、元buttonへ復帰 |
| 動画保存先／媒体読取失敗 | video/downloadは同じFileRef付URI。意図的なmock媒体404をエラー表示 |
| 修正範囲の演出／内容切替、取消、Escape | 範囲を明記、取消で修正POST0 |
| 確認後の演出修正連打 | コピー作成1回。新draft版を表示、旧video要素0。旧登録結果保持 |
| 投稿候補保存／新コピーの最終完了の連打 | 各1回。旧動画の保存判断を新動画へ引き継がない |
| 失敗再試行連打 | 1回。実APIと同じnew draft形式でもコピーへ切替、旧video0 |
| 中止連打／単独依頼の再開連打 | 各1回、中止版保持 |
| 別依頼も実行対象の時 | 再開buttonを表示せず境界説明。表示依頼だけを中止 |
| Digest保存／Gemini料金mode保存 | 保存可能、確認checkbox/開始無効、承認0 |
| 390px幅の失敗画面／候補dialog | document幅390、dialog幅342、横はみ出し0。viewport reset済み |

[browser-mutations.json](evidence/browser-mutations.json)は3cycleの通信記録。POST数は4、10、1。QA用GETによるfixture切替を製品操作と区別。最初のcycle後、実APIのowner/output形式との相違を発見しclient/helperを修正。2回目以降は実登録形式。途中helperのretryが同draftを返したため、最後のcycleで実APIと同じnew copy形式に修正して再検査。初回TS `.at` 型失敗はlib設定を広げず配列添字へ修正。古い検査を実媒体の合格に書き換えない。

画面: [候補](evidence/candidates.jpg)、[作成前停止](evidence/readiness.jpg)、[動画確認mock](evidence/output.jpg)、[狭幅の失敗](evidence/narrow-failure.jpg)。作成前画像はmutation終了待ち時点も含むが、資料不足の拒否は継続表示とstore unitでも確認。全てmockで、実動画・人間品質の証拠ではない。動画の再生成功・実ファイルdownload成功は未確認。最終判断POSTもmockのため、実backendの媒体資格・品質gate通過を意味しない。

再現: `node --test client/test/guided-workflow.test.mjs`。操作mockは `node client/test/guided-ui-mock.mjs`、127.0.0.1:5179。全 `/api/` は専用middlewareで返し、本番proxyへ通さない。`/__qa/scenario?name=output|readiness|failure|waiting|mixed-waiting|new-version|fee` でfixture切替。`ZEV_UI_QA_LOG`指定でローカル通信記録を保存できる。mock媒体は意図的に404で、再生成功を検査するhelperではない。

## 親へ返す接続境界（変更案、未実装）

以下は必要入出力の整理であり、新契約・endpointの確定やbackend編集の許可ではない。既存品質gate、原本保持、字幕本文/時計/発話ID、費用承認を維持した接続を担当調整する。

| 境界 | 入力／必要出力 | 必要変更候補files／停止点 |
| --- | --- | --- |
| Digest画面と製造の接続 | draft版＋登録DigestPlan/ExecutionInput ID/hash→内容確認→作成前確認→人間承認済み製造入力→同draftの登録完成FileRef。既存製造契約へ渡すadapterの資格も必要 | `packages/shared/src/index.ts`, `packages/shared/src/digest-plan-artifacts-v001.ts`, `backend/src/routes/control.ts`, `backend/src/domain/control-review.ts`, `runner/src/digest-plan-consumption-v001.ts`, `runner/src/digest-approved-job-runner-v001.ts`。現workflowは4工程、renderなし。clientは保存まで |
| 推薦・保存済みシーン/preview | draftId＋producer/result/file ID/hash＋candidate ID→推薦ID/根拠、実シーン区間、保存済みpreview FileRef、未作成、実running job ID、未接続。GETだけで既存資料を読む | sharedのControlReviewOption、`runner/src/workflow-artifacts.ts`, `runner/src/index.ts`のbuildContentSelectionDecision、backend読取集約、client reader。テーマIDをシーンIDへ転用しない。閲覧で新AI/全候補製造を起動しない |
| 作成前確認の資料 | draft版＋登録composition/editPlan/patch/source→断片/区間/順序、表示枠、字幕と発話ID/時計、元音声保持、品質gate、実行条件を資格付きで返す。媒体がある時だけ実FileRef | `runner/src/index.ts`のbuildHumanReviewDecision、`runner/src/workflow-artifacts.ts`, `runner/src/workflow-artifact-validation.ts`, `backend/src/domain/control-review.ts`, `backend/src/routes/control.ts`, shared確認資料型、client reader。現readinessはpatch参照/文言のみ、optionsなし。既存 `/api/artifacts` でJSONを読めることだけでは全資格を認定できない |
| 外部送信・料金確認 | draft版/送信対象/provider/model/実行計画→見積、既承認の上限/範囲、承認token/失効条件。開始APIでもtoken検証 | shared型、`backend/src/config/runtime-config.ts`, `backend/src/routes/control.ts`, `client/src/api.ts`。現RuntimeConfigはmodeのみ。Gemini API modeはclient/storeで開始・内容承認後実行・修正・再試行・再開を拒否 |
| 承認と結果の同時変更拒否 | draft expectedVersion、review ID/hash、表示outputFileRefId/hashを承認へ送る→不一致は409、同versionの状態を返す | `client/src/api.ts`, shared承認入力型、`backend/src/routes/control.ts`, `backend/src/domain/control-review.ts`。現draft承認bodyは空、final承認はaction/reasonでserverが最新outputを選ぶ。client内確認だけでserver競合拒否まで保証しない |
| 依頼を指定した再開 | 表示draftId＋対象request ID/expectedVersion→指定対象だけ実行、指定外draftへrunnerが移らない結果 | `client/src/api.ts`, `backend/src/routes/control.ts`のresume、`backend/src/runner/auto-runner.ts`。現resumeはbodyなしで全queueからfindReadyAgentRequest。clientは他draftのready/runningがあれば停止するがserver競合は未解消 |

必要fieldsは提案であり、制作担当のrunner/生成契約へこの作業から変更しない。backendの変更なしで保証できない境界を、動作済みとして表示しない。

## cleanup・Git・次状態

client/依存は内蔵checkout `/Users/kawafmm/workspace/zev2`。SSD生成領域への書込み0、SSD watcher/実動画再開0。配信/アプリ/ボード/他sessionの停止0。

最初のcycleでPDF描画cache/PNG/helpersを236496176bytes cleanup。今回、通信記録・画面・検査logを専用evidenceへ固定しmock helperをclient/testへ保存した後、自分の `/private/tmp/zev-ui-implementation-pdf` 239547bytesをcleanupする。元PDF、素材、正式/旧成果、他session、archiveへの削除0。新しい大容量媒体0。

自分のmock process2回はSIGINT/exit130、専用Edge tab終了、viewport reset。own watcher/dev server/renderer残存0。全process一覧はsandboxで取得しておらず他sessionを操作しない。内蔵空きの観測17235724KiB（共有disk値、他担当の作用も含む）。

Gitはmain。開始844bafa2、制作担当更新後f32216b5。保存前staged0、今回client/report/evidence/logのみdirty。他session差分0を確認してexplicit pathsで監査checkpoint保存。実commit/push結果と最終HEAD/status/untrackedは親へ最終通知で渡す。commitを正式完成・採用・stable昇格としない。

source threadへのローカルsend_message_to_threadは初回thread not found、送信済みとしない。今回の実受渡しは委任元へのturn終了通知。指定相談役への最終監査は未送信であり、No.68全体完了とは報告しない。次は親によるbackend接続範囲調整。追加指示なしにbackend・契約・SSD製造へ着手しない。
