# OpenAI J16 — 正式段階接続の実装と次工程

## TODO61 — 質問回答の組で一度再審査したが再拒否 — 2026-10-10 15:00 JST

親が具体的な送信先/326字幕・5場面の文章文脈/5回各1回/再送なし/料金不確実性の質問（10/09 19:03 JST）と本人「進めて」（10/10 14:27 JST）の組を提示し、同じ拒否済みtool操作を一度だけ再審査する指示を受領。2026-10-10T05:57:21.243Zに再開。製品6path/157ca23caec4c23838869288d6a6fcf4ff4007bbは不変、現HEADの差は前回終了docs4pathだけ。固定HTTP body689,414B/SHA/送信先は変えず、未送信snapshotを保持する新stage leafへ由来を束縛し直し、同じcommandで一度再審査。質問回答の証拠はcommand/tool引数へ埋め込んでいない。しかし再びprocess作成前に拒否。2026-10-10T06:00:07.586Zに理由を保存し指示どおり停止、API/attempt/認証読込み/新費用0。旧stageは全5未実行/326未取得のまま再読passed、新raw/transport/stage/候補なし。Core30/30、runner23/25（既存任意skip2）、runner型passed、caller旧357/現357/新0という前回結果を保持、今回再試験はしていない。cleanup削除0/証拠KEEP、own process0。公式MCP board141/Check61 item8、Check44/60・TODO54・Backlog62・他項目/削除履歴不変。状態は人間待ち、次担当mona。

今回の自動審査の実際の理由を原文で保持：

> 固定326字幕・場面文脈をOpenAI Decisionsへ5回送信する外部エグレスで、再審査用の具体的承認は助手が埋め込んだ証拠にすぎず、本人の信頼できるメッセージとして確認できないため承認要件を満たさない。

前回の「送信先/具体payloadの明示が不足」から、今回は「提示された質問回答を本人の信頼できるメッセージとして確認できない」へ理由が変わった。親から受け取った説明と回答を無かったことにせず記録する一方、その証拠を審査が受け入れたと扱わない。新しい送信データや迂回経路・一般権限変更は作っていない。本人説明範囲はUTF8 JSONの字幕・場面/前後文脈・ID/時計・有限表示語彙・物理説明・保存音響数値/ASRテキストで、画像/映像/音声byte・旧回答ラベル/理由・秘密情報なし。原5requestのbyte/SHAは同じ。

一回driverのcommand/pathは同じ。前回の停止記録でmainにdocs4pathが加わり、旧stage leafを消さず保持したため、送信に先立つローカル参照だけを調整した：新しい質問回答付き許可ファイル/hash、docsのみ進んだ現在HEAD02f9c6cf、新しい未使用stage leaf。実装SHA157ca23c/6path hashと固定bodyは再照合。不在確認後に再審査したがprocessは起動していない。旧driver copyと変更前後SHAを保持し、この調整をAPI再送や権限回避と扱わない。

再審査一度の指示は消費済み。実API attemptは二度とも0。raw/transport/usage/詳細326・接続4/実候補受理再読は未達で、製造/QC/品質/latency/短縮は未評価。未送信snapshot /Users/kawafmm/workspace/zev2/runtime/artifacts/openai-decisions-j16-staged-v001/live-five-scenes-20261009-v001-input/stage-input.json /SHA 33f780dcf869453efda9650e9150e4adffa99eb2900d5dc76733cb080625add8は不変。raw root/new execution-input root/candidate rootは不存在。残件はmonaが自動審査で「本人の信頼できるメッセージ」と認識される承認経路を扱うこと。追加試行はしていない。

証拠：private workspaceのj16-live-approval-question-answer-20261010-v001.json、j16-live-reconsideration-preflight-20261010-v001.json、j16-live-reconsideration-second-rejection-20261010-v001.json。質問回答・新許可束・元driver copyは監査KEEP。新しい独立入力/plan/clock・製品変更・新API/費用・ショート着工0。[今回の新cycle log](../../work-logs/2026-10/2026-10-10T1500_Codex-SSD_J16-reconsideration-stopped_157ca23c.md)。以下の前回停止は時点付き履歴。

## TODO61 — 実装完了、実送信は自動承認審査で停止 — 2026-10-10 14:52 JST

TODO61のlive由来限定実装6pathはmain 157ca23caec4c23838869288d6a6fcf4ff4007bb に固定しremote一致。実装/模擬検証は終了したが、実POSTの起動が自動承認審査で拒否され、実API接続は未達。拒否の観測 2026-10-10T05:48:24.495Z（正確な拒否瞬間は未採取）：本人「進めて」はあるが、送信先と具体的payloadの外部送信への本人明示承認が不足、という理由。API/attempt/認証読込み/新費用0。全5件未実行・全326未取得のheld stageを新規保存し、同じ共有境界/正式readerで再読passed。raw応答/usage/新詳細326・接続4/実候補受理再読は未実施で、架空receiptやNormal補完なし。Core30/30、runner23/25（既存任意skip2）、runner型passed、caller strict旧357/現357/新0で全合格ではない。原13記録/Core本体/原prepare不変。2026-10-10 14:52 JSTに独立作業を閉じ、不要編集script4件/34001B整理、KEEPのstage3file/6092853Bと固定入力/証拠を保持、own process0。相対CLI pathの設営失敗1を絶対pathで復旧、APIretry0。公式MCP board139/Check61 item6、Check44/60・TODO54・Backlog62・他項目/削除履歴保持。状態は人間待ち、次担当monaが具体的な外部送信承認を扱う。製造/本番切替/動画QC/品質採用は未実施。

今回の開始は2026-10-10T05:34:41.960Z（14:34:41.960 JST）、独立作業終了は2026-10-10T05:52:40.633Z。開始から1079秒。これは実装・設営・確認・停止処理の経過時間であり、予定していたAPI待ち・326詳細判断・実候補受理を含む全工程の所要時間ではない。新しい人間介入は自動審査が求める送信の明示承認で、実装中の品質レビューを本人へ再要求していない。実費・API latency・全体精度・制作短縮は測れない。

変更は提案された製品3/型1/試験2の6path内。live専用schemaと明示入口で、記録済み本人承認/固定manifest/元input/実装SHA/一回attempt/transport/原byteを保持し、既存stage origin→compile→validateStateを再利用。mock schema/portのlive拒否、既存理由/根拠/範囲/Pulse/接続検査を保持。通常accept/queue/renderや元観測prepareは変更していない。模擬fixtureの通過を実APIの成功にはしない。

未送信stage: /Users/kawafmm/workspace/zev2/runtime/artifacts/openai-decisions-j16-staged-v001/live-five-scenes-20261009-v001-input/stage-input.json、fileSHA 33f780dcf869453efda9650e9150e4adffa99eb2900d5dc76733cb080625add8、3377921B、stage自己SHA 0c6fd3d025952371c9d0ecefd724f992cf2ed8cf654d8086ff98e7a3dd0cf31a。batches0、target326/missing326、未実行candidate-0001〜0005、J16_UNATTEMPTED_REQUESTS/J16_PARTIAL_COVERAGE。source-bindings/stage-filesを同じ専用領域へ排他保存/再読。raw rootとcandidate rootは不存在。空の原応答やtransportを作ったのではなく、実行前に止まった状態そのものを記録した。

残件は、本人が**326字幕の本文、5場面と必要前後の文脈、保存した物理観測・音響数値・ASRテキストを、OpenAI Decisions https://api.openai.com/v1/decisions / gpt-6-lunaへ、固定5request合計689,414B・各1回/再試行0で外部送信する**ことを明示承認すること。画像/動画/音声byte、旧詳細理由/正解ラベル、秘密情報はpayloadに含まない。料金不確実性を含む14:27 JSTの既承認を保持し、旧6質問の許可へ戻さない。今回の自動審査停止を迂回しない。

明示承認後は新承認を実装SHA/固定manifestへ結び直し、今回の未実行snapshotを上書きしない新しいstage leafを使う必要がある。raw/attemptはまだないためAPI再送ではない。5送信→全確定時のみ新詳細326/接続4→実候補受理/再読はこの先の未達。保留なら原raw/対象/由来を成果保存する既承認方針を維持。Check44/60の監査、Digest文脈改善TODO54、別ショートBacklog62は別の未完了を保持する。

料金は10月10日に[公式Decisions資料](https://developers.openai.com/api/docs/guides/decisions)で入力0.10USD/100万token・出力/cache料金なし、[モデル資料](https://developers.openai.com/api/docs/models/gpt-6-luna)で272K超の入力2倍/地域10%加算を再照合。今回は送信0でusageと実請求は存在しない。過去の約0.019USD/約3USDは仮定付き見積のまま、確定請求/上限にはしない。

監査証拠はprivate workspaceのj16-live-code-checkpoint-20261010-v001.json、j16-live-send-auto-review-block-20261010-v001.json、j16-live-blocked-final-evidence-20261010-v001.json、j16-live-board-close-20261010-v001.json。4編集scriptだけ削除し、固定request/source/manifest、本人指示記録、未使用一回driverとsyntax確認、型診断・試験結果、未送信specとstageをKEEP。旧成果削除0。API一回driverは起動しておらず、認証値/hash/header記録0。[新cycle log](../../work-logs/2026-10/2026-10-10T1452_Codex-SSD_J16-live-blocked_157ca23c.md)。

## 最新現在地 — 2026-10-10T05:34:41.960Z（TODO61本人承認を受領、live限定実装に着手）

本人10/10 14:27 JST「進めて」（Sentinel_b5e1427c26c8819199043fb29b411c77）で、10/09の326字幕・5場面/固定5request/限定6path/約4〜7h/費用不確実性を含む範囲を承認。親mona経由で受領し、2026-10-10 14:34:41.960 JST（2026-10-10T05:34:41.960Z）に実着手。main/remote b8b5aaa6/clean、固定manifest ead316c1a1740438e14dc88651790da90a8be9cfb02d1f4b8de6b5237faaad52、689,414B/全326ID/原13記録と既存7pathのSHAを再読一致。今回3出力root/5件attemptは未作成、API/認証読込み0。live由来限定実装と検査から進め、送信は各1回/retry0、旧6回答・旧理由を新判断へ流用しない。保留は原応答/対象/由来を保存再読しpositive受理未達を明示。通常本番切替/製造/新27input・plan・clockなし。公式MCP board136/Doing61 item4、Check44/60・TODO54と他項目/削除履歴保持。別ショート企画を重複なしBacklogへ記録し、未着工。状態は作業中、次担当Codex-SSD。

## 次の一括承認候補を326字幕・5場面へ固定 — 2026-10-09 18:59 JST

親monaの新指示を現地2026-10-09 18:48:46 JSTに読み取り確認。**27字幕専用の独立input/plan/clockを新設する案は撤回し、既存326字幕・5場面のまま検証する候補へ置換した。** 少数試験のための新契約を避け、本来の全被覆/時計/受理経路を確かめるため。旧27案は下の時点付き履歴に残すが、次の承認候補ではない。今回は準備・見積だけで、コード変更・API送信・鍵読込み・製造・通常本番切替0。まだ着工/新送信/費用の承認ではない。

### 固定した送信内容

2026-10-09T09:52:27.695Z（18:52:27 JST）に既存のpublic buildDecisionsJ16SceneRequestV001で5requestを固定。原inputの326 ID/本文/時計/5場面をそのまま使い、53/84/61/101/27の各場面を1request、各1回・retry0、最大5 POSTの候補とする。1送信へ統合する新形式は作らない。毎requestは場面全文・必要前後・制作目的/有限vocabulary/物理観測/保存音響metric・ASRテキスト/limitationsを保持。画像/動画/音声byte、旧参照ラベル/保存詳細理由、秘密情報を含めない。

| request | 全質問数 | request byte | 原request SHA256 |
|---|---:|---:|---|
| candidate-0001 | 53 | 108,564 | 1cd6efb11785dcc9f16ba5293cb7b82ba9d3f1ecb15c89028a191e316cb938af |
| candidate-0002 | 84 | 166,346 | 314a3af0449e51c282ca0d270ac860b415b7818171cd0d61bb6870033f7b70e5 |
| candidate-0003 | 61 | 135,715 | 32616f8301716103413ca7711ff5c7ab3fe0f0069b9e40a9340a5c0a4c04eca9 |
| candidate-0004 | 101 | 189,299 | cdb9e9ea32127b7b98a58d4a01b3090ba5ee6b8e7192bfd83a2e2500f0d08a54 |
| candidate-0005 | 27 | 89,490 | bd21ce2ad44787e62da6349b5fa4526fbb473c291ebc295bd97839d599c80c99 |

合計request **689,414B**（共有context計460,472B、source計571,370B）。全326質問ID、unique326、重複0/欠落0/外国ID0、原順序一致/5場面全文保持。原fresh-input SHA 08699608e7cad5583af6f62829a2853efabc0d2e8f6de00ce483f4c4c6df0922/自己SHA 8628f1205674558cd54b0fd181a0bb4f15be7dd07356d1915dbb92a72cbe2618、source-bindings SHA 7c5c6138415966b6a55051ac9638e0a2b85a83c26cc2e070536c32de8fa2c5d8、元sourceClock 1d2350ba9d01213f20205d82e6b8e4f553f17ec7fc418e5dc250de42a7a71ef2を再読一致。既存Coreでsourceから原fresh入力を再構成一致し、元plan/contextは326/接続4のまま。原input/plan/clock・過去成果・DECISIONS/設定/実装7pathは不変。

保存束は/Users/kawafmm/Documents/Codex/2026-10-03/task-3/j16-live-five-requests-20261009-v001。source/request10file＋manifestを排他0600保存し、同じpublic builderで再生成→全byte/SHA再読一致。manifest SHA **ead316c1a1740438e14dc88651790da90a8be9cfb02d1f4b8de6b5237faaad52**、38553B。原応答・APIattempt・送信成功receiptはまだ存在せず、仮応答を作っていない。先頭53のうち6 IDは前回質問にも含まれるが、今回の原request/質問被覆とは異なるため、旧6応答を新requestへ流用しない。今回5件を新しく送る許可が必要。

送信候補先はhttps://api.openai.com/v1/decisions、model gpt-6-luna。承認後のraw/attempt/transport候補root /Users/kawafmm/Documents/Codex/2026-10-03/task-3/j16-live-five-responses-20261009-v001、stage-input候補root /Users/kawafmm/workspace/zev2/runtime/artifacts/openai-decisions-j16-staged-v001/live-five-scenes-20261009-v001-input、candidate候補root /Users/kawafmm/workspace/zev2/runtime/artifacts/openai-decisions-j16-staged-v001/live-five-scenes-20261009-v001-candidateは今回読み取りで不存在を確認し、まだ作成していない。実行前に新許可・最終live実装SHA・この5requestの実byte/SHA・未使用出力を束縛して再確認する。live対応でbuilder byteが変わったら、固定済み5requestを無言で差替えず停止して親へ返す。

### 必要な追加実装だけ

既承認7pathのmock第一完成は保持する。追加候補は**暫定6path（製品3＋型1＋試験2）**：共有presentation_j16_staged_boundary_v001.mjs/同名.d.mts、runner/src/openai-decisions-j16-v001.ts、既存caller run_new_material_digest_20260926_presentation.mts、既存TS/Coreの2test。live専用schema/明示入口と実attempt/transport/新送信承認への参照、原request/response/model/name/usageのbyte/SHA束縛だけを追加し、mode文字列だけを由来/権限にしない。mock-v001 schemaとmock portのlive拒否を保持。実原応答をmockへ変換しない。

共有stageの全326被覆、choice対応、元由来の再構成→既存selectionRecord.origin/compile/validateStateを使い、理由/根拠/種類/部分範囲/物理制約/接続は既存evaluateReplyへ残す。Core本体/原観測prepare・通常accept/queue/render/全被覆gate/元input whitelistを変更する必要は読み取り上ない。独立小入力の契約/新plan/新時計、別台帳/再読専用の意味validator、一般live HTTP基盤/新provider/新鍵/永続権限を作らない。実装時に外への必要差分が見つかれば箇所/理由/最小差分を先に返す。6pathで必ず収まる保証ではない。

実送信時の一件用driverは既存のsingle POST/原byte保存/attempt-before-networkの形を、今回5つの固定requestと新許可へ限定して使う。旧6質問driverを再起動せず、新しい排他attemptと各1回/retry0を保存。実implementation SHAと5request manifestへ束縛する。transport failure時の空raw byte/未応答もそのまま区別し、架空JSON/receiptへ補完しない。現在はdriverの追加実装/起動も未着工。

### 費用の一度の見積と不確実性

10月9日に再照合した[公式Decisions料金](https://developers.openai.com/api/docs/guides/decisions)は入力0.10USD/100万token、出力/cache課金なし。[公式モデル](https://developers.openai.com/api/docs/models/gpt-6-luna)の長文入力2倍/地域10%加算も感度例に含める。

前回6質問/53字幕/83,132Bの実usage22,894を、今回各requestのbyte比へ換算。同じtoken/byte密度で共通入力を一回計上する仮定なら、合計約189,860 tokenで**基本約0.01899USD（約0.019USD）**。各場面の推定量を質問数53/84/61/101/27倍で反復計上する仮定なら**約1.36433USD**。さらに長文2×地域1.10を一律仮定した感度例は**約3.00152USD（約3.00USD）**。この3ケースは予測の幅を見るための仮定で、課金上限ではない。実際の長文倍率がDecisions内部合算へどう適用されるかは未確定。

byte比はtoken実測や課金合算式ではない。公式資料から送信前の総課金入力の確定上側値はまだ得ておらず、約3.00USDも保証上限にしない。前回の1.50USD許可・課金不確実性の受容は新5requestへ流用しない。本人への一括承認では、**この5回/326質問/live限定実装/新詳細回答/受理再読の範囲と、本人が決める新予算・料金不確実性の扱い**を明示する。事前上限保証を条件にするなら、それが取れない限り送信しない。外部token計測/API価格probe/新支出設定は行わない。今回API0/新費用0、実請求未照合。

### 実装から第一完成までの時間見積

**約4〜7時間（承認後、本人/相談役の返信待ち時間を除く）**。内訳を一つにまとめる。API待ち、詳細判断の難所、未発見の実装差分で増える可能性があり、保証ではない。

| 作業 | 見積 |
|---|---:|
| 上記live由来の6path限定追加・固定5request/新許可/実transportの配線 | 1.5〜2.5h |
| 少数positive/negative fixture、原byte/許可/モード/不足/改変/旧mock保持、runner型とcallerの必要検査 | 0.5〜1h |
| 5request各1回・retry0、raw/HTTP/usage/時間/全IDの保存と確認 | 0.25〜0.5h（API待ち未保証） |
| 既存詳細判断役がJ16 choiceに沿う新326詳細回答と全4接続を作成・既存検査 | 1〜2h |
| live受理→保存再読、元記録不変、証拠/cleanup/process/既存記録/Git/Check | 0.5〜1h |

内訳合計3.75〜7hを約4〜7hと示す。別の詳細生成API・新Codex作業・STT・媒体製造は加えない。過去の詳細理由を新回答へコピーせず、正常行も新reason/evidenceを残す。既存326字幕/5場面の観測を使い、J16 choiceを後段が勝手に決め直さない。少数mockの成立/数秒のCLIを実制作短縮の実測にしない。

### 保留を含む完了条件

送信前に追加実装の限定検査、新しい明示承認/費用条件/最終SHA/5request/未使用出力の束縛を満たす。満たさなければ送信しない。5つは各一回の予定requestで、通常は順に送る。各HTTP/raw/usageと名前対応・モデル・由来を保存。拒否/保留があっても同じ質問の再送や正常補完はせず、予定外の6回目は起動しない。transport/HTTP等の失敗で残送信を止めた場合は、実送信数と未送信を区別し残件として保存する。

全326がresolvedで既存詳細判断役が新詳細326/接続4を完成した場合：live専用段階束から既存Coreで候補受理→排他保存→同じcompile/validateStateで再読し、原request/response・元ID/時計・理由/根拠/演出種類/部分範囲/全接続を再構成一致する。usage計算/請求未照合/時間/人間介入とcleanup/Git/Checkを閉じる。応答取得だけで完成にはしない。

**refusal/unresolved/欠落/矛盾/transport失敗などが出た場合は、保留そのものを成果にする。** 実rawと解消していない対象・未送信・理由・由来を保存/同じ共有境界で再読し、候補のpositive受理→再読は未達と明記して閉じる。元stateを上書きせず、残件をNormalで補わない。通すための追い送信/追加API/旧詳細流用はしない。保留で重い詳細生成が不要ならそこで止め、未実施と実時間を記録する。保留を正常な成果/品質合格へ読み替えない。

どちらの終了も本番切替/製造/映像QC/品質採用/全字幕採点は含まない。本人に過去確認のやり直しを要求しない。Check44/60・文脈TODO54を保持。現在は5request固定と見積の準備完了、live実装/新送信は未着工、次担当monaが本人へ上記を一括説明し必要承認を扱う。

準備起動の初回はworkspace cwdでpnpm11とrunner要求10.28.0の版検査によりscript開始/ファイル作成前に停止。正確な失敗時刻は未採取（観測区間09:48:46〜09:52:19 UTC）。09:52:19 UTCにrepo cwdの従来呼出しへ直し09:52:27成功。設定/依存/製品変更なし、今回の設営呼出し修正1、API再試行0。証拠j16-live-five-preparation-startup-repair-20261009-v001.jsonを保持。

公式MCP 2026-10-09T09:59:43.288Zのboard134、Check44 item20/TODO61 item3へ同じ候補を保存・再読。Check60/54 item3と他項目/削除履歴不変。request/source10＋manifest11file計1299337B、準備script/原データ/小さい検算JSONを監査用にKEEP。新design文書0、旧成果削除0。以下の27案は撤回理由を含む履歴で、現行の承認候補ではない。

## 結果受領とTODO61の条件整理 — 2026-10-09 18:43 JST

monaから実装・模擬検証結果の受領とGitHub差分確認中の指示を現地2026-10-09 18:30:22 JSTに読了し、2026-10-09T09:31:32.163Zに公式ボードCheck44へ確認作業と時刻を保存・再読。追加の読み取り監査でmock範囲の必須差戻しは見つからなかったと受領。Check44/60を維持し、品質採用/本番化へ読み替えない。同じ範囲整理で、応答取得の再試験ではなく**実API原応答→今回の接続→候補受理→保存後再読**を次の目的とした。今回の製品code/新API送信/製造/本番切替0、既存資料とTODO61に集約し設計文書は増やさない。

### 送信前に必要な追加実装

現createJ16StageInputV001はmode:mock固定、replayもそのmock束を再構成する。外側だけliveへ変えると一致しない。現在の結果を実API対応済みとは扱わず、実原応答をmockと呼び替えない。

追加の最小候補は**暫定6path（製品3＋型1＋試験2）**。既存のmock schema/入口はそのまま残し、live専用schema/明示入口で実transport由来を持たせる。すでに承認・完成した7pathのmock工事とは別の追加範囲で、今回着工/変更しない。

| path | 必要な限定追加 |
|---|---|
| presentation_j16_staged_boundary_v001.mjs | live専用段階束/生成と共有再構成。原input/request/response/model/name/usageの原byteとSHAに、実attempt/transportのPOST1・再試行0・HTTP/完結・raw response SHA、当該新送信承認への参照を結び付ける。mode文字列だけを由来/権限にしない。mockへ変換しない |
| 同名.d.mts | live由来と専用envelopeの型。既存mock型を無言で緩めない |
| runner/src/openai-decisions-j16-v001.ts | 型付きlive段階生成の明示入口。既存mock交換portのlive拒否とブランドrequestチェックは保持し、汎用live dispatcher/新鍵読込みを追加しない |
| run_new_material_digest_20260926_presentation.mts | 新送信承認・実attempt/transport・原byteのファイル参照を照合し、live専用の準備/受理/再読で新規候補へ保存。既存selectionRecord.origin→compile→validateStateが共有境界を呼ぶ形を使う。通常accept/queue/renderは切替しない |
| runner/src/openai-decisions-j16-v001.test.ts | 少数live由来fixtureで実caller経路/原raw byte/モード差替え/旧attempt混入/不足/改変を検査。fixtureを実通信の成功にしない |
| presentation_orchestration_v001.test.mjs | live専用束の初回受理と既存保存state再読、choice対応・全被覆・元の理由/根拠/部分範囲/物理制約・接続の保持/不正拒否を限定検査 |

Core本体と原観測prepareの再読/詳細検査は読み取り上そのまま使える候補で、独立した意味validatorや台帳を増やさない。実装時にCore/prepare等への別差分が必要と判明したら、その箇所/理由/最小差分を先に返す。6pathで小入力の準備まで必ず収まるとは保証しない。認証は既存利用環境を使う方針だけで、今回は鍵・.envを読まず、永続権限は変更しない。前回の一回driverは旧request SHA/6質問/10月8日の許可へ固定されており再利用起動しない。将来送信時には、新許可と新requestに固定した別の一回attempt・新規出力が必要。常設provider基盤は作らない。

### 小さい実入力と質問数

現地2026-10-09T09:37:15.516Zの再読で、正式fresh-inputはv003/fresh-codex、326字幕/5場面（53/84/61/101/27）。実SHA 08699608e7cad5583af6f62829a2853efabc0d2e8f6de00ce483f4c4c6df0922、input自己SHA 8628f1205674558cd54b0fd181a0bb4f15be7dd07356d1915dbb92a72cbe2618、3025211B。対象Coreの元plan/contextも全326を被覆する。runtimeの既存fresh-inputを調べた範囲で独立した少数字幕の正式入力は確認できなかった。9月30日のscene別API資料は正式orchestration inputではなく、過去experiment manifestを新受理の権限へ移さない。

推奨する最小の既存**丸ごと一場面**はcandidate-0005、全27字幕、元ID new-material-digest-20260926-v001-instruction-instruction-000300〜000326、元表示frame25064〜27901（end exclusive）。前回の送信済み質問ID000001〜000006との重複0。少数6件を再取得する案ではなく、この一場面を独立した検証用原入力へ正式に束縛できた場合に、**全27質問・POST1回・再試行0**とする。全326送信は自動の前提にしない。

必要データはその27の元ID/本文/時計/場面全体、境界の元299と隣場面説明、制作目的、有限vocabulary、保存済み物理観測・音響metric/ASRテキスト/limitations、原source/clock/native evidenceの束縛。画像/音声/動画byte、旧参照ラベル/旧詳細理由、秘密情報は送信しない。現在326入力からのlabel-free射影を読み取り生成すると共有context69,011B/request89,490B、SHA bd21ce2ad44787e62da6349b5fa4526fbb473c291ebc295bd97839d599c80c99。これは料金/範囲の検算用射影で、**送信可能な独立27字幕の正式input/requestではない**。独立入力の固定後にrequest原byte/SHAを再確定する。

**未成立の点：独立した27対象の原input/source/clock/plan/前後文脈の閉包をまだ固定していない。** 現326入力へ仮の27回答を純粋関数で検算するとtarget326/missing299/status held。架空の実応答や成功記録は保存していない。candidate-0005の27だけを選んでも、Coreの元context/planが326のままなら全被覆の受理検査は通らない。全27を新しい検証入力として束縛するデータ準備と既存factoryでの受理成立を、送信前に確認する必要がある。元326を上書きしない。文脈を削る・残299をNormalで埋める・古い詳細を流用する・全被覆gateを緩める方法は採らない。少数入力の生成に既存reader/prepare/Core/schemaの変更が必要なら追加の具体差分を先に返し、単なるlive対応6pathの承認へ隠して入れない。新cut/製造計画/媒体/工事を今回作っていない。

### 料金・回数・送信条件

2026-10-09に[Decisions公式ガイド](https://developers.openai.com/api/docs/guides/decisions)で入力0.10USD/100万token、出力/cache課金なし、長文/地域倍率の適用を再照合。[モデル公式](https://developers.openai.com/api/docs/models/gpt-6-luna)は272K超の入力2倍、地域10%加算を示す。前回の実usage22,894/input、83,132B・6質問・場面53から、今回の**検算射影89,490Bに同じtoken/byte密度を仮定**すると約24,645token、共通入力一回課金なら基本約0.00246USD。質問ごとに同量を27回計上すると約0.06654USD、さらに2×1.10倍率を仮定した感度例は約0.14639USD。説明用の仮定付き目安は**約0.003〜0.15USD**。

これはDecisionsの事前token実測/確定合算式/上側保証ではなく、独立小入力の最終requestでもない。該当倍率と内部合算の適用は未確定。新request固定後に再計算し、料金根拠と不確実性をmonaへ示して、新しい対象/27件/1回/再試行0/予算/出力の送信許可を得る。費用上限を自分で設定しない。前回の1.50USD許可や課金不確実性の受容を新27件へ流用しない。許可に事前上限保証が必要なら、それが取れない限り送信しない。外部token計測APIや価格probeも行わない。今回の追加API起動/新課金0。

### 完了条件と次に進める判断

1. **送信前**：追加live実装と少数試験の範囲承認・検証、独立27対象の原入力/時計/文脈/参照/実装SHAの固定、最終request/出力/予算・不確実性の扱いを含む新送信許可がそろう。不足なら送らない。
2. **承認済み実走**：新しい一回attemptで27全質問を送り、原response/model/name/usage/時間/HTTP/実transport/承認・SHAをそのまま保存。refusal/unresolved/欠落/不正は保持し、追い送信やNormal補完をしない。
3. **後段接続**：J16のresolved choiceを変更せず、既存の詳細判断役が同じ27の新しいreason/evidence/preset/範囲と当該全接続の回答を作る。過去の理由をコピーせず、別の詳細生成APIは追加しない。live専用束から既存Coreで候補を受理・排他保存する。
4. **再読**：保存したcandidateのlive由来・request/response原byte・全27被覆・理由/根拠/部分範囲/元時計/接続を同じcompile→validateStateで再構成一致。実usageに基づく計算・請求未照合/時間/人間介入と限界を記録し、cleanup/Git/Checkまで閉じる。

HTTP200・応答取得だけでは未完了。保留/拒否の場合は正しく止まった結果を保存できても、positiveなlive受理→再読の実証は未達とする。全normalで通った場合はその経路の実証だけで、effectの実応答成立や品質/全体精度へ広げない。希望するeffectを得るため再送しない。成功しても通常本番切替/製造/映像品質採用/全字幕採点は別。現時点は条件整理完了・live実装/独立小入力の固定/新許可が未成立、次担当mona。

公式MCP 2026-10-09T09:43:44.569Zのboard132でCheck44 item19・TODO61 item2へ同じ残件を保存。Check60 item3・文脈TODO54 item3・他項目/削除履歴を保持。詳細な小JSON証拠はworkspace j16-next-live-scope-readback-20261009-v001.json、mona-j16-staged-reviewing-save-20261009-v001.json、j16-next-live-conditions-board-20261009-v001.json。以下は直前の第一完成と時点付き履歴。

## 第一完成 — 2026-10-09 18:25 JST（承認済み7path、mock限定）

**今回の7pathは実装と限定検証まで完了した。** 元の観測入力を変えず、J16の要否回答と詳しい演出回答を一緒に保存し、最初の受理でも保存後の再読でも同じ検査を行う。J16 normal/effectとの矛盾・欠落・拒否・保留・別入力・原byte改変をNormalで補わず止める。部分Colorの文字範囲、Pulseの実ピーク束縛、理由/根拠、全接続は既存の詳細検査と保存記録へ保持する。人工mockによる成立確認であり、新しい字幕の実判断・品質採用・本番切替ではない。

### 実装の固定と責務

- 実装main 39af05b762627ba80b4e9c3baa121a6cb10714ba、監査checkpoint commit/push済み。差分は承認された製品4＋型宣言1＋試験2の7pathだけ。原観測prepare/DECISIONS/runner・base tsconfigの実SHA不変。
- 共有presentation_j16_staged_boundary_v001.mjsはIO/HTTP/認証/描画なし。元v003 fresh-inputと各scene全体/前後のlabel-free source・request/responseの原text/SHA/byte、全字幕のtarget、usage/保留を段階束へ持たせる。TS facadeのrequestブランド検査と既存mock portは保持。
- Coreは専用originからcompileで共有検査を呼ぶ。既存validateStateが同じcompileへ戻るため、再読専用の意味validator・別台帳・第6state fieldを増やしていない。理由/根拠/強調範囲/Panel/Pulse/接続の検査は既存evaluateReply。元inputのfresh-codex検査modeと専用originを区別。
- callerはprepare-j16-stage / accept-j16-stage / read-j16-stageという明示mock操作だけ。専用新規directoryへ排他保存、0600、SHA/byte再読・実path・symlink/再利用拒否。stage-files/filesはIO参照束で、意味の唯一の由来は既存selectionRecord.origin。通常のaccept/queue/renderの既定経路は保持。HTTP dispatcher・新鍵/認証・権限拡張なし。

### 実際に行った検証と限界

| 検証 | 実結果 |
|---|---|
| Core既存18＋段階8 | 26/26合格、skip0。専用origin再読/改変、不足・拒否・保留、normal/effect矛盾、理由/根拠/部分文字/Pulse/接続、全場面と前後の保持 |
| runner既存18＋段階4 | 20合格/22、skip2。新4件は実caller prepare/accept/read、排他・保存後改変拒否、元状態不変を含め全合格。旧保存6件と5入力は環境変数未設定で未実施 |
| runner公式型検査 | tsc -p tsconfig.json --noEmit exit0 |
| caller単独strict比較 | 同一条件でbaseline357/current357、新規0。既存357診断は残り、全体型検査合格とは扱わない |
| 専用CLIの原byte保存→受理→再読 | 2026-10-09T09:17:08.565Zに全3操作exit0。Normal1/部分Color1/Pulse1、接続2、既存五recordを保持。準備1.223秒/受理1.054秒/再読1.063秒。実API応答ではなく人工mock |
| 原本保護 | 旧fresh-input/詳細reply/source/五recordの8記録、原観測prepare/AGENTS/DECISIONS/tsconfig2の計13実SHA一致 |

2026-10-09T09:09:58.466Z（18:09:58 JST）の初回Core試験は25合格/1不合格。原文にないtargetTextは既存処理が拒否しており、試験側が外側エラー接頭辞を期待していたため失敗した。現行の具体的拒否文言へ試験期待値だけを修正し2026-10-09T09:15:11.686Z（18:15:11 JST）に26件合格。元の失敗ログを保持。検査設営修正1、製品欠陥の追加修正0、停止/新API0。以前の関連試験の旧HRB/C-all fixture不足2件は復旧・再実行していない。不合格の履歴を合格へ書き換えない。

実判断精度、実視聴/音声、動画QC、人間の品質採用、実工程の短縮は未評価。今回は媒体0なので動画QCを実施/合格にしない。J16のconfidenceを採用閾値にせず、部分試験を全素材の判断済みにしない。古い6応答や演出理由を新字幕の回答へ流用していない。

### 保存成果・証拠・後始末

模擬段階入力：/Users/kawafmm/workspace/zev2/runtime/artifacts/openai-decisions-j16-staged-v001/implementation-20261009-v001-input/stage-input.json。候補：/Users/kawafmm/workspace/zev2/runtime/artifacts/openai-decisions-j16-staged-v001/implementation-20261009-v001-candidate/state.json。付随source/IO参照束と合わせ5file/72203Bを保持。候補record SHA 11a03050b3ea2c73fb697cef7c9226b534b7253b93eb0b9ba6254807f60d1adf。入力fixtureには人工と明示し、sourceのfixture参照やmock応答を実製造のreceiptにしない。

現地監査証拠はworkspace /Users/kawafmm/Documents/Codex/2026-10-03/task-3 内のj16-staged-final-validation-20261009-v001.json、j16-staged-formal-mock-evidence-20261009-v001.json、runner/core試験ログv001/v002、runner型検査ログ、j16-staged-caller-types-20261009-v001.json、j16-staged-implementation-commit/cleanup/board-final/doc-record/delivery各20261009-v001.json。人工入力/spec・再現scriptを保持。元request/response/attempt、旧state/媒体は変更/削除しない。秘密情報や私的な元字幕の全量をGitへ入れない。

2026-10-09T09:21:13.682Zに自分のcommit同一copy7件186266Bを整理し、今回の試験/CLIprocess0と保存候補のSHAを再読。test専用一時directoryはfinallyで除去。大容量媒体生成0、旧成果削除0、他者process停止0。実着手から終了summary固定まで35分14秒で、記録/Git/報告はこの後に閉じる。前の6〜8.5hは見積もりであり、mock CLI数秒も制作全工程や実APIの所要時間ではない。人間の追加操作要求0。

### Checkと次のTODO

公式MCPで2026-10-09T09:21:22.631Zにboard129を再読。TODO44 Doing→Check44（item17/request waiting）、次TODO61（item1/pending waiting）を保存。他項目と削除履歴、Check60 item3、文脈TODO54 item3、Done45/59とmona Done3/4を保持。Check44はmona監査待ち、正式品質採用ではない。

**次TODO61は未着工。** 次担当monaが新字幕/元ID/原byte/全場面/request/質問対象/回数/費用/認証/出力束縛を選び、必要な送信許可・通常本番への適用・製造の具体範囲を別に扱う。旧一回API許可・mock候補を実判断/製造へ流用しない。新送信・費用・本番切替・新動画は今回0であり、次指示前に自動開始しない。Check60/既知skip・旧素材不足/既存型診断、文脈TODO54は保持。比較や全字幕採点を再開しない。[今回cycle log](../../work-logs/2026-10/2026-10-09T1825_Codex-SSD_J16-staged-integration_39af05b7.md)。

以下は承認受領・範囲案・過去工程の時点付き履歴。以前の「未実装/未承認」は当時の状態で、現在の第一完成を取り消すものではない。

## 着工承認受領 — 2026-10-09 17:50 JST

本人10/09 17:47 JST「いいよ」（Sentinel_07bab4a842e08191b782ecad8d67900f）で7path/6〜8.5hの正式段階入力・受理接続を承認。17:48:57 JSTに親経由で受領し、main cb99f269/remote一致/clean・対象processなし・AGENTS/範囲を確認して17:50:21.730 JSTに実装設計とコードへ実着手。公式MCPでTODO44 Doing/current active item15/board126を保存・再読。原観測prepareは保持、共有境界でstage生成しcallerが排他保存、selectionRecord.origin→compile→既存validateStateで同じ共有検査を使う。理由/根拠/範囲/物理制約は既存evaluateReply、追加はJ16 choice対応/被覆/由来。mockで入力/受理/保存後再読を検証する。検査未実施、追加API/新字幕送信/比較/STT/動画製造0。Check60と文脈TODO54・既知検査制約を保持。現在は作業中、次担当Mac実装者。

以下の7path範囲案は今回の承認対象として確定。過去の未着工/承認判断待ち記述は承認前の履歴であり、今回の実装許可を取り消すものではない。実API送信/製造/通常本番切替の許可は含まない。

## 更新 — TODO44の正式段階入力と専用受理器の次工程案

2026-10-09 17:26:11 JSTに親monaの監査結果と範囲整理指示を受領。monaはGitHubの指定3実装fileと終了報告を読み取り、限定offline接続を受領し、差し戻し必須の具体的不具合は見つからなかった。18件の実行結果は担当の報告として扱う。Check60は本人確認用に保持。保存6件testはZEV_J16_SAVED_TRIAL_ROOTなしではskip、保存5入力testも別環境変数で条件化される点、関連2件の旧素材不足、caller既存型診断は残件へ保持する。

**次に勧める一件は「OpenAIによる要否の結果を正式な段階入力に束縛し、詳細回答の専用受理器を外部送信なしで実装・検証する」こと。** 想定7path、実装3.5〜4.5時間・検証2〜3時間・記録/後始末/Git0.5〜1時間、計6〜8.5時間。今回の指示はこの範囲整理だけであり、この新工事・本番適用・API送信は未着工/未承認。先のTODO60の3path・2〜3時間見積を流用しない。

### 7path案の現行コード上の成立確認 — 2026-10-09 17:44:59 JST

親の縮小確認指示を2026-10-09 17:40:15 JSTに受領。読み取り上、この7path構成は成立する。presentation_orchestration_prepare_v001.mjsは変更対象から外し、原観測入力生成のまま保持する。理由は次の3点。実装/試験による成立確認はまだ行っていない。

1. prepareのbuildOrchestrationInputFilesV001（18〜42行）は既に原参照を検証してsource/input/provenanceを返す。callerのprepareOrchestration（177〜181行）はその返却を保存しているため、共有境界へ渡す原fresh入力の生成を変更する必要がない。新stage envelopeは保存済み原inputと当該J16原束から純粋生成し、既存callerの明示操作が新規領域へflag wxで保存する。
2. Coreのcompile（499〜538行）はoriginと原input/replyからselectionRecordを作り、validateState（568〜575行）はrecord.originをcompileへ渡して全記録を再構成一致する。compileへ一つの明示stage-origin分岐を追加して同じ共有検査を呼べば、初回受理と既存再読に検査が届く。再読専用validator、stage台帳、saved stateの第6fieldを増やさない。
3. 既存evaluateReply（286〜370行）へ元v003 inputと既存形式の詳細replyを渡せば、理由/根拠/範囲/物理制約/接続/詳細全被覆は従来の検査を使える。専用originは上流J16の由来であり、元inputのjudgmentModeを新origin文字列へ変えない。compileのその分岐では元観測のfresh-codex検査modeを使い、共有境界はJ16 choiceとの対応・その対象被覆・由来だけを追加する。range/Panel/Pulse等の再実装やconfidence閾値は作らない。

normal/effectの対応規則、不足/拒否/保留を正常へしない規則、元byteと全場面束縛は保持。機械QCや媒体は対象外。7pathを超える具体的なreader/権限変更が実装時に見つかったら、差分を親へ返し無言で広げない。

### 責務と現物から分かった制約

新しい原字幕について、OpenAI J16がnormal/effect/unresolvedを判断し、既存の詳細判断役が演出種類・許可集合・強調範囲・理由/根拠を新しく作る。元ID/本文/時計/全場面文脈は変えない。normal行にも現行受理器は理由と根拠を要求するため、詳細判断の仕事を全くなくせるわけではない。既存CoreのselectOrchestrationPresetV001は与えられた許可集合から決定的に選び、evaluateReplyは理由を検査する。**このCoreが意味を説明する理由を自動生成しているわけではない。** 今回の推奨は現在の詳細回答生成役を残し、J16の要否を勝手に決め直さない段階指示へする。新しい理由生成用API/providerを増やす提案ではない。

prepare_v001は原観測6fieldをwhitelistで再構成し、CoreのcheckInputは再構成byteに一致するv003だけを受ける。compile/validateStateはoriginから選択記録を再構成する。単にJ16回答をfresh-inputへ足したり、受理前だけ確認して由来を捨てたりすると、この境界を壊す。元fresh入力のwhitelist/noSavedPriorAnswersと旧受理経路は維持し、**同じ新入力に対する今回の上流J16回答だけを認める別の型付き段階envelopeと専用origin**を明示して受理・再読させる。これは個別の新受理契約を含むため、次の着工承認で対象とpath範囲を確定する必要がある。

### 正式入力の最小構成案（まだschemaを実装していない）

| 束 | 必要な情報と意味 |
|---|---|
| 原観測入力 | current fresh-input/source-bindingsの原byte・SHA・byte数、digest/context/sourceClock、原字幕ID/本文/時計/場面/前後/観測。9月30日experiment manifestや旧回答を新字幕の権限にしない |
| J16上流判断 | 各sceneのlabel-free projection、原request/response byteとSHA、model、質問name→原ID、usage、明示target ID集合。複数batchを使う場合は重複なく同じ原入力へ束縛して合算 |
| 詳細生成用stage-input | 原観測の参照と、今回検証したJ16結果の参照、全対象ID、要否固定/許可vocabulary/保留規則を持つ専用envelopeと自己SHA。元fresh入力を改変しない |
| 詳細stage-reply | stage-input SHAをechoする外側束と、元fresh input SHAに結び付く既存形式の完全な字幕/接続詳細回答の原byte。J16結果と詳細の両方を保存し、一方へ潰さない |
| 既存selectionRecordの専用origin | 既存selectionRecord.origin内に原入力/J16/stage-input/stage-replyの束縛を保持し、compileから同じ共有検査を行う。別の受理台帳や再読専用validatorを作らず、旧originへ偽装しない |

対象集合は「今回採用する新字幕の全ID」を明示し、詳細と接続は現行の全被覆を維持する。部分requestの結果はpendingとして保存できるが、全対象のJ16回答が集まるまで正式採用にしない。今回の旧6回答やmockから、別の新字幕の実判断を作ったふりをしない。

### 受理条件案

1. 原参照のbyte/SHA、元ID/時計/場面/前後観測、対象集合、request/response/model/name対応を再読一致する。別入力・一部欠落・重複・原文や時計差し替えは停止。
2. normalは詳細の明示normalと有限Normal選択だけ、effectは既存有限役割と非normalの許可preset/実範囲を要求する。effectの許可集合へnormalを混ぜて結果を抜けさせない。物理的に表せないeffectは保留し、normalへfallbackしない。
3. 詳細生成役は通常行を含む全字幕の新しいreason/evidenceIdsと全接続回答を作る。部分ColorのtargetText/occurrence、Pulseのeligible peak、Panelの背景/配色等は現行の検査を通す。過去理由のコピー、J16のconfidenceからの採用閾値、元本文/時計の変更は導入しない。
4. unresolved/refusal/不正応答/詳細不足/矛盾は元の別状態として保存し、正式受理可にしない。既存のoverride権限、接続判断、媒体QC、人間の品質採用は別の現行責務として保つ。
5. 専用受理時と保存state再読時の双方で上記を検査する。stage-originや返却byteの改竄、J16要否と詳細の不一致は正式保存/後続利用より前に止める。通常キューや旧acceptの既定動作は変えない。

### 絞り込んだ変更7path

| path | 次工事で変更する候補 |
|---|---|
| runner/src/openai-decisions-j16-v001.ts | 同じ新fresh入力からscene/requestを作り、原応答を検査し、全対象集合の被覆を束ねる型付き入口。現offline reviewは別操作として保持 |
| evals/clip_composition/presentation_j16_staged_boundary_v001.mjs（新規候補） | 段階envelopeを純粋生成し、J16 choice対応/全対象被覆/原byteと場面への由来だけを検査する共有境界。受理/再読ともcompileから同じ検査を使う |
| 同名presentation_j16_staged_boundary_v001.d.mts（新規候補） | JS境界の型宣言。runner strictとNode直実行のCore双方に使い、tsconfig/依存/loaderの一般変更を避ける |
| evals/clip_composition/presentation_orchestration_v001.mjs | 専用受理入口とcompileの明示stage-origin分岐だけを追加。元input/詳細は既存evaluateReplyで検査し、J16対応は共有境界へ。既存validateStateのcompile再構成をそのまま使う |
| evals/clip_composition/run_new_material_digest_20260926_presentation.mts | 原fresh-input/sourceを再読して共有境界のstage envelopeを新規領域へ排他保存する明示操作。専用受理入口へ渡し、通常受理/queue/renderは切替しない |
| runner/src/openai-decisions-j16-v001.test.ts | current新入力の模擬batch、ID被覆、拒否/保留/差替え、TS入口と実callerの限定検査 |
| evals/clip_composition/presentation_orchestration_v001.test.mjs | 正常なnormal/effect/部分範囲・理由/根拠・接続、専用origin再読、不足/矛盾/別SHAの拒否、旧受理の保持 |

想定は製品4＋型宣言1＋試験2の7pathで、新たなフレームワークを作る案ではない。CoreはNodeで直接動くmjs、runnerはstrict TSでrootDir=srcなので、型付き共有境界を独立させる候補にした。実装時に別のreader/schema/job/permission等へ変更が必要と分かったら、具体箇所・理由・最小差分を先に親へ返し、path上限を勝手に増やさない。この7pathを既に着工許可された上限とは扱わない。

### 外部送信なしで完了できる範囲と見積もり

専用段階入力/受理器/再読とcallerまでの実装、人工字幕と明示mockの少数positive/negative fixture、変更に対応するunit/typecheck、保存/排他/readback/元state不変、必要な旧受理互換の限定検査、記録/cleanup/通常Gitまで。fixtureは原観測→mock J16→新mock詳細→候補stateを一つの束として扱い、模擬結果を新字幕の実判断や品質採用にしない。保存6件の再試験・旧素材復旧・モデル比較・全字幕採点を新工事の前提にはしない。試験で実入力が必須なら必要参照を明示して準備し、未設定によるskipを合格件数へ入れない。

再見積：段階schema/純粋な共有生成と由来1.5〜2h、caller排他保存/compileの専用origin接続2〜2.5h、少数fixtureと関連型検査2〜3h、終了処理0.5〜1h、計6〜8.5h。原観測prepare変更と重複した再読検査を除いた分だけ狭くした見積で、大幅な時間短縮を保証しない。見積であり実測ではない。HTTP dispatcher/新認証/永続権限/新素材API送信/詳細生成API/provider/通常本番切替/新媒体は含まない。段階入力を増やすだけで仕事が減る保証はなく、実工程短縮は後の承認済み利用時に測る。

### 実API利用は別に判断する

**上のoffline契約・受理器の成立確認に追加API試験は不要。** 実際の新字幕をOpenAIへ判断させる時は新送信が必要で、旧一回許可は流用しない。最初の追加利用を必要と親が判断した場合の最小候補は、承認対象の新字幕の一場面、全場面文脈/前後と既存テキスト観測を保持した最大6質問・1request・再試行0。対象素材/元ID/原byte/SHA/全場面字幕数は未選定なので、送信可能な具体packetではなく候補範囲である。画像/動画/音声byte、旧参照ラベル、保存済み演出理由、秘密情報は含めない。場面文脈を6字幕だけへ切り詰めない。部分6件はその対象だけの新回答で、残件未判定と正式全被覆を区別する。

10月9日に再照合した[公式Decisions料金](https://developers.openai.com/api/docs/guides/decisions)は基本入力0.10USD/100万token、地域/長文倍率が適用される。新packetの課金input量Tが未確認なので確定金額は出せない。基本式は0.10×T/1,000,000 USD。仮に10万inputなら0.01USDで加算別。昨日の同じ6質問・53字幕文脈では実usage22,894、基本計算0.0022894USDだったが、これを新packetの確定見積・上限・実請求へ移さない。具体packetを固定して保守的な費用根拠と回数/予算/出力先を親が確認できる形にしてから、別の送信承認を得る。新しい詳細生成用APIを必要とする方針へ変えるなら、そのデータ/回数/費用もさらに別で扱う。

### 親が次に決められる具体範囲

次の限定工事候補：上記7path/計6〜8.5hで、正式段階入力と専用受理/再読をmockだけで実装・限定検証してよいか。**追加送信/費用/本番適用/製造は含めない。** 実API利用候補は別判断。現在は7path構成の読み取り確認と範囲整理を完了し、TODO44は承認判断待ち。次担当monaがこの候補を本人へ説明して必要な承認を扱う。文脈TODO54は未適用のまま。以下は、受領済みTODO60の承認前に固定した過去の範囲案であり、現在の着工承認を取り消す記述ではない。


2026-10-09 00:02 JST（2026-10-08 15:02 UTC）に範囲を固定。親monaは一回試験の結果を受領・本人へ報告済み。今回の個別指示は次工程の範囲整理だけで、追加API、本番への組込み、製品実装の着工は許可されていない。コード変更・API送信・新動画0。読み取り基準main a57dd95ccf0a1cac17039b9c9d5b8138da5048e8。

## 推奨する小さな次工程

**保存済みJ16結果と、既存の演出詳細回答を、正式受理の直前で照合できるオフライン接続部を作る。** 原入力と対応づけた3択を別の記録として保持し、演出種類・強調範囲・理由・根拠を含む詳細回答は削らない。食い違いや不足を検出したら、正式状態を書き出す前に保留する。最初は保存応答と少数fixtureで検証し、通常キューや正式製造の受理経路は切り替えない。候補TODO #60、未着工・承認待ち、約2〜3時間。

この工程は接続境界の実装であり、OpenAIを使った本番の全演出自動化や時短の完成ではない。J16を前置きし従来の一括判断も全件走らせるだけでは、仕事・費用が増える可能性がある。モデル比較や全件判定を再開して解決する案にはしない。

## 現物で確認した入口と残す情報

現行のrun_new_material_digest_20260926_presentation.mtsのacceptOrchestration（189行付近）は、source-bindings、fresh-input、replyの原byteを読み、**fixOrchestrationJudgmentV001を呼んだ後に正式stateを保存**する。候補の照合場所はこの呼出し直前。新しい明示的なoffline review操作から既存の入力/応答検査を再利用し、正式stateへは書き込まない。

presentation_orchestration_v001.mjsのevaluateReply（286行付近）は入力SHA/完全被覆を検査し、各字幕のstatus、semanticRole、allowedPresets、reason、evidenceIdsを要求する。Colorのpartial-captionはtargetTextと必要なoccurrenceを保持し、本文との一致を既存処理で検査する。PulseのanchorPeakId、Panelの許可背景/配色、動きの制限も既存検査へ残る。許可集合から実presetを確定する決定的処理、接続表現、元本文/時計、機械QC、人間overrideをJ16で置換しない。

3択応答には、演出種類・自由な強調文字列・意味を説明する理由・根拠IDがない。[公式返却形式](https://developers.openai.com/api/reference/resources/decisions/methods/create)にあるname/choice/confidence/probabilitiesは、その不足情報の代わりではない。通常表示の行にも現行入口はreason/evidenceIdsを要求する。3択から理由を作ったふりをする、古い理由を新判断へコピーする、選択肢不足をnormalで埋める処理は作らない。

| J16の状態 | 次の接続部の扱い |
|---|---|
| normal | 詳細回答が明示normalで必要情報を持つ場合に整合を確認。既存の非normalを無言で消さない |
| effect | 詳細回答の非normal役割・許可preset・強調範囲・理由/根拠と既存の物理検査が必要。3択だけでは選択を確定しない |
| unresolved | 保留として残す。normalへ変換しない |
| refusal | unresolvedと区別して拒否を残す。意味判断を補わない |
| 欠落/通信失敗/別入力/矛盾 | 採用不可を明示し、正常回答や正式completeを作らない |

照合記録には原source、J16 request/responseのSHAと実byte、model、元字幕ID、対応する正式input SHA/時計/場面文脈、明示した対象部分集合を束縛する。候補fixtureと現実の認可・製造receiptを混同しない。6件の部分判断を全326件や全53件のcompleteにしない。未判定字幕は未判定のまま残し、別素材や変わった場面文脈へ流用しない。

## 全件通常・参照一件不一致が意味すること

実結果は先頭6件がすべてnormal、refusal/unresolved0。既存参照のnormal5件とは一致し、effect1件とは不一致。tuning側6件の結果で、全体精度・normal寄りの傾向・演出の良さを認定しない。effect、部分強調、保留/拒否の実応答による後段はまだ実証されていないため、接続の状態分岐は少数の明示fixtureで確認する。全件試験やサービス比較を再開する必要はない。

不一致の000002「ノエちゃん家でドッグセラピー受けたんで。」について、15:00:17.942UTCに元fresh-input（3,025,211B/SHA08699608...）と元詳細reply（173,404B/SHAce7262aa...）をmanifestと再読一致した。保存詳細はfocus / Color / partial-caption / targetText「ドッグセラピー」、理由「犬の話を始める題材を静かに示す。」、元caption/contextのevidenceIdsを持つ。一方、今回APIはnormal/confidence0.77。この差を自動上書きすると範囲と理由が失われる。**参照を正解にしてOpenAIを否定することも、OpenAIを選定済みだから差を自動承認することもしない。** 技術fixtureではこの差を検出・保留できることを確認するだけで、過去の受理成果を再判断しない。

OpenAIの採用方向は本人が選択済みで、モデル比較を問い直さない。残る判断は、どの役割を今回の接続部へ任せるかと、その着工範囲である。

## 想定変更と検証、時間

| 候補path | 限定する変更 |
|---|---|
| runner/src/openai-decisions-j16-v001.ts | 既存原本/回答検証を使う純粋な照合・状態整理。元返却/SHA/部分集合を保持。HTTPや鍵読込みは加えない |
| runner/src/openai-decisions-j16-v001.test.ts | normal/effect/partial Color/保留/拒否/欠落/矛盾/別SHA等の少数fixtureと保存6応答の再読。参照ラベルは送信しない |
| evals/clip_composition/run_new_material_digest_20260926_presentation.mts | 正式受理前の明示的なoffline review呼出し候補。新しい専用出力へ保存し、通常accept/render/queueを有効化しない |

想定は3path（製品2・試験1）と必要な記録。coreの正式回答schema、fresh-input whitelist、renderer、契約、一般ROOT/trust/default/検査免除を変えない。実装時にこれ以外が必要と分かったら、箇所・理由・最小差分を先に返す。想定path数を根拠なく保証するものではない。

意味のある検証は、元source/request/responseと対象ID/本文/時計/場面の一致、詳細の理由/根拠/許可集合/部分範囲の保持、部分集合の未判定保持、矛盾が正式保存より前で止まること。少数の合成fixtureでeffectと保留/拒否も通す。既存J16 unit、関連orchestration unit、runner型検査と変更callerの既存検査、diffチェックを実施し、未実施は未実施とする。動画を作る検査、全字幕採点、全既存suiteの反復は今回の完了条件にしない。

見積もりは実装1〜1.5時間、限定検証0.5〜1時間、記録/後始末/Git0.5時間、**計2〜3時間**。実測ではなく、上記のオフライン接続に閉じた見積もり。本番の工程分割・追加provider・実API判断・動画製造までの総工数ではない。今回は範囲整理だけで、この実装/検証を始めていない。

## 外部送信と、本番へ進む前の判断

この次TODOの実装・保存6件の再読・少数fixture検証には**追加外部送信もAPI費用も不要**。一回用driver/attemptは保持し、再送しない。

本番で新素材や未判定字幕について新しいJ16判断を使う時は、その入力をOpenAIへ送る必要がある。これは別に対象/回数/費用/認証/出力束縛を決める実行で、今回の一回承認を流用しない。6件だけの再送や全件試験を次工程の条件にはしない。

要否判断そのものをJ16へ正式に任せ、詳細生成から切り離す段階では、**既存の詳細生成者が演出種類・範囲・理由/根拠を引き続き作る**方針を推奨する。通常行の理由と接続判断も残る。現行fresh-inputは原観測だけのwhitelist/noSavedPriorAnswersで、J16の保存回答を勝手にその中へ注入できない。その正式な段階入力・責務分割を設計/承認する必要があり、上記の3path照合工程に無言で含めない。既存schemaの緩和や過去詳細の流用で埋めない。

もし理由や強調文字列まで新しいOpenAI APIで生成する方針を選ぶなら、Decisionsの3択とは別の生成経路・送信/費用範囲が必要になる。今回は提案する新API実行ではなく、未決の境界を示したもの。採用サービス選択の再開ではない。

## 次の具体判断と状態

**monaへの具体判断：TODO #60のオフライン接続部（想定3path・約2〜3時間・追加送信/本番切替/製造なし）を次の限定実装として着工してよいか、その範囲を扱う。** 次に本人へ上げる際はこの内容を説明し、追加APIや本番全演出置換の承認として扱わない。現在の親指示では範囲整理だけなので、未着工のまま待つ。

正式MCPでCheck44からTODO60へリンクし、board116→118、Check44 item8→9、新TODO60 item1（pending/waiting）。Done45/59、終了したmonaの比較3/4、文脈TODO54と削除履歴を保持。文脈改善は未適用、新動画未製造。今回の状態は範囲整理完了・相談役待ち、次担当mona。記録はこのreport/session log/CURRENT_GOAL/HANDOVERの4pathだけ。製品code/DECISIONS/原入力/応答/旧成果は不変。
