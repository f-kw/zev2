# OpenAI J16 — 正式段階接続の実装と次工程

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
