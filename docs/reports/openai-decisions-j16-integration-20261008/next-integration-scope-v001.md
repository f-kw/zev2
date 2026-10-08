# OpenAI J16 — 情報を失わない接続の次工程案

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
