# OpenAI J16 — 情報を失わない接続の次工程案

## 更新 — TODO44の正式段階入力と専用受理器の次工程案

2026-10-09 17:26:11 JSTに親monaの監査結果と範囲整理指示を受領。monaはGitHubの指定3実装fileと終了報告を読み取り、限定offline接続を受領し、差し戻し必須の具体的不具合は見つからなかった。18件の実行結果は担当の報告として扱う。Check60は本人確認用に保持。保存6件testはZEV_J16_SAVED_TRIAL_ROOTなしではskip、保存5入力testも別環境変数で条件化される点、関連2件の旧素材不足、caller既存型診断は残件へ保持する。

**次に勧める一件は「OpenAIによる要否の結果を正式な段階入力に束縛し、詳細回答の専用受理器を外部送信なしで実装・検証する」こと。** 想定8path、実装4〜5時間・検証2〜3時間・記録/後始末/Git0.5〜1時間、計6.5〜9時間。今回の指示はこの範囲整理だけであり、この新工事・本番適用・API送信は未着工/未承認。先のTODO60の3path・2〜3時間見積を流用しない。

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
| 専用受理記録 | 明示的staged originに原入力/J16/stage-input/stage-replyの由来を残し、保存state再読でも同じ制約を再検査。生成済み旧回答のtechnical-recompileやfresh-codex単独originに偽装しない |

対象集合は「今回採用する新字幕の全ID」を明示し、詳細と接続は現行の全被覆を維持する。部分requestの結果はpendingとして保存できるが、全対象のJ16回答が集まるまで正式採用にしない。今回の旧6回答やmockから、別の新字幕の実判断を作ったふりをしない。

### 受理条件案

1. 原参照のbyte/SHA、元ID/時計/場面/前後観測、対象集合、request/response/model/name対応を再読一致する。別入力・一部欠落・重複・原文や時計差し替えは停止。
2. normalは詳細の明示normalと有限Normal選択だけ、effectは既存有限役割と非normalの許可preset/実範囲を要求する。effectの許可集合へnormalを混ぜて結果を抜けさせない。物理的に表せないeffectは保留し、normalへfallbackしない。
3. 詳細生成役は通常行を含む全字幕の新しいreason/evidenceIdsと全接続回答を作る。部分ColorのtargetText/occurrence、Pulseのeligible peak、Panelの背景/配色等は現行の検査を通す。過去理由のコピー、J16のconfidenceからの採用閾値、元本文/時計の変更は導入しない。
4. unresolved/refusal/不正応答/詳細不足/矛盾は元の別状態として保存し、正式受理可にしない。既存のoverride権限、接続判断、媒体QC、人間の品質採用は別の現行責務として保つ。
5. 専用受理時と保存state再読時の双方で上記を検査する。stage-originや返却byteの改竄、J16要否と詳細の不一致は正式保存/後続利用より前に止める。通常キューや旧acceptの既定動作は変えない。

### 想定する最小変更8path

| path | 次工事で変更する候補 |
|---|---|
| runner/src/openai-decisions-j16-v001.ts | 同じ新fresh入力からscene/requestを作り、原応答を検査し、全対象集合の被覆を束ねる型付き入口。現offline reviewは別操作として保持 |
| evals/clip_composition/presentation_j16_staged_boundary_v001.mjs（新規候補） | 段階envelope/由来/要否制約を検査する純粋な共有境界。原応答チェックを重複実装せずTS側とCoreの両方から使う |
| 同名presentation_j16_staged_boundary_v001.d.mts（新規候補） | JS境界の型宣言。runner strictとNode直実行のCore双方に使い、tsconfig/依存/loaderの一般変更を避ける |
| evals/clip_composition/presentation_orchestration_prepare_v001.mjs | 原観測v003は保持し、検証済み上流判断を参照する専用stage-inputと詳細生成指示を排他保存 |
| evals/clip_composition/presentation_orchestration_v001.mjs | 独立したstage受理入口/明示originとcompile・validateStateでの再検査。既存有限preset/範囲/理由/接続/QCを維持 |
| evals/clip_composition/run_new_material_digest_20260926_presentation.mts | 明示prepare-stage/accept-stage操作と原参照束縛。次工事では専用候補/fixture領域だけで実行し、通常受理/queue/renderは切替しない |
| runner/src/openai-decisions-j16-v001.test.ts | current新入力の模擬batch、ID被覆、拒否/保留/差替え、TS入口と実callerの限定検査 |
| evals/clip_composition/presentation_orchestration_v001.test.mjs | 正常なnormal/effect/部分範囲・理由/根拠・接続、専用origin再読、不足/矛盾/別SHAの拒否、旧受理の保持 |

想定は製品5＋型宣言1＋試験2の8pathで、新たなフレームワークを作る案ではない。CoreはNodeで直接動くmjs、runnerはstrict TSでrootDir=srcなので、型付き共有境界を独立させる候補にした。実装時に別のreader/schema/job/permission等へ変更が必要と分かったら、具体箇所・理由・最小差分を先に親へ返し、path上限を勝手に増やさない。この8pathを既に着工許可された上限とは扱わない。

### 外部送信なしで完了できる範囲と見積もり

専用段階入力/受理器/再読とcallerまでの実装、人工字幕と明示mockの少数positive/negative fixture、変更に対応するunit/typecheck、保存/排他/readback/元state不変、必要な旧受理互換の限定検査、記録/cleanup/通常Gitまで。fixtureは原観測→mock J16→新mock詳細→候補stateを一つの束として扱い、模擬結果を新字幕の実判断や品質採用にしない。保存6件の再試験・旧素材復旧・モデル比較・全字幕採点を新工事の前提にはしない。試験で実入力が必須なら必要参照を明示して準備し、未設定によるskipを合格件数へ入れない。

見積：段階schema/共有境界・由来2〜2.5h、prepare/caller/受理/再読2〜2.5h、少数fixtureと関連型検査2〜3h、終了処理0.5〜1h、計6.5〜9h。見積であり実測ではない。HTTP dispatcher/新認証/永続権限/新素材API送信/詳細生成API/provider/通常本番切替/新媒体は含まない。段階入力を増やすだけで仕事が減る保証はなく、実工程短縮は後の承認済み利用時に測る。

### 実API利用は別に判断する

**上のoffline契約・受理器の成立確認に追加API試験は不要。** 実際の新字幕をOpenAIへ判断させる時は新送信が必要で、旧一回許可は流用しない。最初の追加利用を必要と親が判断した場合の最小候補は、承認対象の新字幕の一場面、全場面文脈/前後と既存テキスト観測を保持した最大6質問・1request・再試行0。対象素材/元ID/原byte/SHA/全場面字幕数は未選定なので、送信可能な具体packetではなく候補範囲である。画像/動画/音声byte、旧参照ラベル、保存済み演出理由、秘密情報は含めない。場面文脈を6字幕だけへ切り詰めない。部分6件はその対象だけの新回答で、残件未判定と正式全被覆を区別する。

10月9日に再照合した[公式Decisions料金](https://developers.openai.com/api/docs/guides/decisions)は基本入力0.10USD/100万token、地域/長文倍率が適用される。新packetの課金input量Tが未確認なので確定金額は出せない。基本式は0.10×T/1,000,000 USD。仮に10万inputなら0.01USDで加算別。昨日の同じ6質問・53字幕文脈では実usage22,894、基本計算0.0022894USDだったが、これを新packetの確定見積・上限・実請求へ移さない。具体packetを固定して保守的な費用根拠と回数/予算/出力先を親が確認できる形にしてから、別の送信承認を得る。新しい詳細生成用APIを必要とする方針へ変えるなら、そのデータ/回数/費用もさらに別で扱う。

### 親が次に決められる具体範囲

次の限定工事候補：上記8path/計6.5〜9hで、正式段階入力と専用受理/再読をmockだけで実装・限定検証してよいか。**追加送信/費用/本番適用/製造は含めない。** 実API利用候補は別判断。現在はTODO44の範囲整理を完了し、次担当monaがこの候補を本人へ説明して必要な承認を扱う。文脈TODO54は未適用のまま。以下は、受領済みTODO60の承認前に固定した過去の範囲案であり、現在の着工承認を取り消す記述ではない。


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
