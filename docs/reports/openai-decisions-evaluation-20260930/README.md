# OpenAI Decisions API / Jev代替評価

作成日：2026-09-30（JST）／担当：Codex1／調査開始main：`f8b426f9ade3b69c8bd7acd8afbd2a81a0d180ea`

## 結論

**Decisions APIは公式発表を確認できたが、今回確認できた公開情報だけでは安全に実APIを呼べない。本番採用は保留し、第一評価対象をJ16「字幕の演出要否」に絞った実験準備まで完了した。** endpoint、正式schema、専用価格、当アカウントのpreview権限が未確認のため、推論呼出しは0、追加推論費用は0.00 USD。Responses APIによる代用実験も行っていない。API不存在・アカウント非対象を断定する結論ではない。

今取り込めるのは、既存36判断点の責務分離、同じtext入力で比較する方法、保存判断を正解としない評価方法である。製品の判断経路は変更しない。Decisionsの速度・費用・品質・校正・batch効率の優位性はまだ未測定。Jevも前回shadowがcredential確認で停止しており、ZEVでの比較実績はない。

今回の指示書§8に従い、API実走不可でも調査・対応表・比較入力固定・評価指標・将来接続の案を完成させた。Codex2の原寸Digest、低メモリ合成、native QC、renderer、productionには変更を加えていない。

## 1. 公式発表と公開仕様の境界

[9月29日の公式発表](https://openai.com/index/devday-2026-recap/)では、Lunaを使う有限判断、ユーザー定義質問、事前定義回答、text/image context、分類・routing・agent next action用途、limited previewと今後の一般公開予定を確認した。**Lunaという説明はリクエストへ `gpt-6-luna` を指定できるという仕様ではない。** 「coming days」を9月30日の利用可能宣言へ読み替えない。

公開リファレンスとguideの索引、changelog、model catalog、pricing、データ取扱い資料を検索・本文確認した。Python/Node SDKの公開API一覧も、それぞれcommit固定の実ファイルを取得して確認した。現時点の確認範囲ではDecisionsの具体的な呼出契約を発見できなかった。限定preview向けの非公開資料・SDKの存在は未確認。

`confirmed` はその行に書いた範囲だけの確認、`not confirmed` は確認できなかったこと、`inaccessible` は資料・機能へアクセスできない場合に使う。今回Platformの閲覧自体は成功したので、権限の不明を認証不能とは記録しない。

|項目|状態|確認内容・限界|
|---|---|---|
|A. endpoint|not confirmed|正式path/method未確認。推測pathをprobeしない。（O2, O3, O4）|
|B. authentication|not confirmed|Decisions固有の認証・権限scope未確認。一般APIのBearerやPlatformログインから移植しない。（O2, O3）|
|C. model designation|not confirmed|Luna intelligenceを使うという発表は確認。リクエストへ指定するmodel ID/alias/versionは未確認。（O1, O6）|
|D. request structure|not confirmed|正式request/response schema、サイズ上限、エラー・retry契約未確認。（O2, O3, O4）|
|E. finite answer declaration|confirmed|事前定義の有限回答という機能概念のみ確認。回答宣言のfield名・JSON構文・最大選択数は未確認。（O1）|
|F. multiple questions per request|not confirmed|発表のquestionsという複数形から1 request多問/batchを推定しない。（O1, O2, O3）|
|G. shared context|not confirmed|contextの入力は確認。1つを複数質問で共有する処理・課金の契約は未確認。（O1, O2）|
|H. text input|confirmed|text context対応は公式発表で確認。表現形式・上限は未確認。（O1）|
|I. image input|confirmed|image context対応は公式発表で確認。サイズ・枚数・課金方式未確認。今回は送信しない。（O1, O7）|
|J. probability/confidence output|not confirmed|分布、confidence、calibrationの仕様・保証は未確認。Jev型から移植しない。（O1, O2, O3）|
|K. usage metadata|not confirmed|token/decision単位等の返却と課金への対応は未確認。（O2, O3, O7）|
|L. latency metadata|not confirmed|real-timeという説明は実測latency/SLA/server timing fieldの保証ではない。（O1, O2）|
|M. rate limits|not confirmed|専用RPM/TPM、並列数、429/retry制約未確認。（O2, O4）|
|N. pricing|not confirmed|Decisions固有料金未確認。事前費用計算不能のため課金推論を実行しない。（O7）|
|O. data handling/retention|not confirmed|Decisions固有の保持期間、学習利用、ZDR/地域/画像条件への適用を未確認。（O8）|
|P. preview access requirements|not confirmed|9/29 limited previewは確認。申込・招待・対象account条件、9/30の一般公開完了は未確認。（O1）|
|Q. current account callable|not confirmed|既存アカウントでPlatform Home/More閲覧成功。Decisions入口は見えず、accessの肯定/否定は確定不可。endpoint/schema/price不明につき推論0。（O2, O7）|

追加の未確認事項：SDK method、response schema、入力token/byte上限、画像枚数・解像度、timeout/retry、拒否・不完全応答、modelの版固定、calibrationの定義・保証。一般APIやJevの仕様から埋めない。通常Lunaのtoken料金もDecisionsの見積りには使わない。

SDKの最新確認（API一覧に `decision` の大文字小文字を区別しない検索で0件、Responsesは掲載）：

|SDK|確認commit|API一覧SHA-256|
|---|---|---|
|openai/openai-python|`58aca1dcfd8d04a3c6352fa2c34b3035ea850f57`|`ed28b607d5c024be055b47039e132fb40f693a7ce63a1d1cc689819ff51cf60d`|
|openai/openai-node|`02f4ef94e8b3b02b43af6516c71a74c3c7a80b5d`|`0eba6ecaf97809e415cef36db1d6fa83f8f8414b5af7254d4544878be29abb41`|

rawページの検索キャッシュには古いcrawlがあったため、それだけを最新の根拠にせず、公式repositoryのmainをcommitへ固定し直して取得した。SDK導入・更新は行っていない。根拠URLと観測範囲は [公式情報一覧](official-source-inventory.json) に保存した。

## 2. 当アカウントの確認

Microsoft Edgeの既存アカウントでPlatformへのログインとHome閲覧が成功した。Homeの機能一覧とMore内にはDecisionsの入口を確認できなかった。これはUIに見えないという観測で、preview entitlementがないことの証明ではない。通常Lunaの案内が見えてもDecisionsの権限と同一視しない。

既存repositoryのOpenAI key設定の存在だけを確認した。keyの値は表示・保存していない。新しいkey・account・契約・sales連絡・有料upgradeは行っていない。既存keyの有効性やDecisions権限は未検証。認証付きmodel一覧GETも実行していない。公開model一覧と認証済みUIは読んだが、任意のendpointを推測してprobeすることは避けた。

価格が不明なので、認証状況だけ確認できても課金推論は実行しない。今回の実験不能理由は **endpoint/schema/価格/accessの未確認** であり、日本語品質の不合格ではない。

## 3. Jevと機能単位で比較

[既存棚卸し](../jev-decision-inventory-20260928/README.md)・[shadow停止報告](../jev-shadow-20260928/README.md)を保持したまま、TypeSafe公式資料を9月30日に再確認した。Jevの宣伝上の速度・校正説明と、ZEVの実測を分ける。

|機能|Jevの公開仕様|OpenAI Decisions|ZEVへの影響・確度|
|---|---|---|---|
|有限回答|Yes/No確率、Choice選択肢と分布|有限回答の概念を確認|J16の問題形式は共通候補。wire互換ではない|
|入力|textのみ|text/imageの発表あり|第一比較は同一text。画像は第二段階候補|
|共通文脈＋多数質問|stateとquestions。共通stateで複数質問を評価|1 request多問・共通context課金は未確認|全326を5requestで送れると決めつけない|
|確率・confidence|Choiceの全選択肢分布・confidenceが文書化|未確認|閾値・校正・低信頼復帰の比較は待つ|
|usage|入力・出力tokenが文書化|未確認|推定tokenを実測扱いしない|
|model/endpoint|jev-1.13.0、POST /v1/systemone|指定model/endpoint未確認|Jevのmethodや型を流用しない|
|価格・上限|入力0.042 USD/Mtok、出力無料、全体64k・state＋最長質問32k|専用価格・上限未確認|費用比較・batch成立は未評価|
|公開rate|100K token/秒、40request/秒。変動あり|未確認|旧reportの250K token/秒・1,200request/分とは異なる。旧資料は履歴のまま保持|
|速度・日本語・再現性|provider説明はあるがZEV実測なし|ZEV実測なし|勝敗・削減率・採用を主張しない|
|calibration|providerは校正を説明。ZEVで独立正解に対する検証なし|仕様・検証とも未確認|保存判断へのagreementをcalibrationと呼ばない|

根拠：[TypeSafe API](https://docs.typesafe.ai/api)、[Models](https://docs.typesafe.ai/models)、[Primitives](https://docs.typesafe.ai/primitives)。今回Jevにも推論・model一覧APIは呼んでいない。

## 4. Function Calling / Structured Outputsとの違い

[Function Calling](https://developers.openai.com/api/docs/guides/function-calling)は、tool/actionと引数を出し、その実行をアプリ側へ接続する仕組み。モデルのtool call自体が外部作用の実行ではない。J16 shadowには外部作用が不要なので、tool呼出しへ仕立てる必然性はない。

[Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)は、対応するJSON Schemaに沿った結果を返す仕組み。Responsesの構造化出力で字幕IDと有限enumの配列を表現する案は成立する。ただし、拒否・不完全応答は別扱いにし、欠落ID・重複・余分なIDは呼出側で検証する。schema適合は意味上の正答や校正を保証しない。[通常GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)はStructured Outputs対応だが、今回そのAPIも呼んでいない。

Decisionsは有限判断に用途を絞ったAPIとして発表されている。**同じ入出力形をResponsesで表現できることと、専用APIの速度・価格・安定性・校正・多数質問の効率は別問題。** JSONへconfidence欄を作りモデルに数値を書かせても、providerの正式な選択確率にはならない。また、通常の非同期Batch APIやprompt cachingを、Decisionsの共有文脈評価と同じ仕様にしない。

## 5. 36判断点の再分類

A＝Decisions直接候補、B＝通常GPT/Responses向き、C＝決定的コード、D＝人間確認。**Aは機能概念上の候補であり、現在呼べる／即採用可能という意味ではない。** 旧9生成・16有限・11コードを壊さず、有限判断から人間2件と非対象・複合判断を分離した。

集計：**A12 / B11 / C11 / D2 = 36**。Bには現経路に存在しないJ07を対象外として含む。新たな順位判断を追加する提案ではない。旧番号・意味・根拠の対応は [判断対応表](zev-decision-mapping.json) に保存した。

|ID|判断の意味|分類|適用条件・残る仕事|
|---|---|---|---|
|J01|新しい見どころを発見する|B|自由生成・範囲発見・説明を通常GPT等に残す。|
|J02|候補名・テーマを言語化する|B|自由生成・範囲発見・説明を通常GPT等に残す。|
|J03|候補を採用・不採用にする|A|固定候補と全体文脈が前提。採否理由の生成J06は残る。|
|J04|制作要求・テーマへ合うか判断する|A|制作要求への適合を有限回答化できる。理由生成は別。|
|J05|複数候補の重複・追加価値を比較する|A|候補間の重複・追加価値を有限質問へ。ただし相互整合性と全候補文脈が必要。|
|J06|採否の理由と根拠の説明を作る|B|自由生成・範囲発見・説明を通常GPT等に残す。|
|J07|見どころの優劣順位・scoreを付ける（現経路にはない）|B|現経路に順位/score判断はない。Bは対象外の便宜分類であり新たに追加しない。|
|J08|採用集合を取り出して素材順に並べる|C|既存の決定的検証・算術・射影を維持する。|
|J09|保持・削除ブロックの両端を発見する|B|自由生成・範囲発見・説明を通常GPT等に残す。|
|J10|既知ブロックをkeep/dropにする|A|ブロック両端が既に確定した場合のみ。両端発見J09は置換しない。|
|J11|前振り・展開・オチ・反応を残すか判断する|A|固定ブロックに対する保持要否だけ。フリと結末の文脈を共有する。|
|J12|残る意味と削る理由を説明する|B|自由生成・範囲発見・説明を通常GPT等に残す。|
|J13|表示単位の区切りを組み立てる|B|自由生成・範囲発見・説明を通常GPT等に残す。|
|J14|各表示の改行位置を組み立てる|B|自由生成・範囲発見・説明を通常GPT等に残す。|
|J15|元断片から字幕時計を解決する|C|既存の決定的検証・算術・射影を維持する。|
|J16|演出を付けるかNormalを保つか判断する|A|第一評価対象。Normal/effect/unresolvedの要否だけで、範囲/preset/理由は未解決のまま残る。|
|J17|意味上の演出役割を選ぶ|A|normal/focus/vocal-energy/reactionの役割選択候補。現回答全体の代替ではない。|
|J18|許される演出presetの集合を決める|A|許可集合の判断。APIに集合回答があるとは未確認。個別可否の結合案も整合性評価が必要。|
|J19|対象字幕と全文/部分を判断する|A|字幕IDを固定し、全文/部分というscopeだけ判断。自由substringはJ20。|
|J20|原文の強調範囲を見つける|B|自由生成・範囲発見・説明を通常GPT等に残す。|
|J21|Panel可否・許可背景・許可配色を判断する|A|既存の有限背景/配色集合の許可だけ。実preset確定はJ25のcode。|
|J22|Bounce/Shakeを許してよいか判断する|A|意味に基づくBounce/Shake可否。物理成立の検証はJ32のcode。|
|J23|声の強調とPulseの観測peakを選ぶ|B|意味上の声の強調と観測peak選択が混在。text観測だけでは声の由来を保証できず初回候補外。算術/peak可否はcodeに残す。|
|J24|演出理由と根拠を説明する|B|自由生成・範囲発見・説明を通常GPT等に残す。|
|J25|許可集合からpreset・背景・配色を確定する|C|既存の決定的検証・算術・射影を維持する。|
|J26|素繋ぎか区切りかを許可する|A|continuation/separator/eitherの許可集合。今回は4接続のみ、一般化不可。|
|J27|字幕を技術上の要確認へ振り分ける|C|既存の決定的検証・算術・射影を維持する。|
|J28|機械違反の種類と不合格を整理する|C|既存の決定的検証・算術・射影を維持する。|
|J29|技術検証後に製造へ進めるか確定する|C|既存の決定的検証・算術・射影を維持する。|
|J30|完成動画を採用・修正・保留にする|D|人間の明示判断を維持する。|
|J31|hash・file実在・schema・ID被覆を検証する|C|既存の決定的検証・算術・射影を維持する。|
|J32|safe areaと演出の物理成立を判定する|C|既存の決定的検証・算術・射影を維持する。|
|J33|RGB・exact・全編再現一致を判定する|C|既存の決定的検証・算術・射影を維持する。|
|J34|人間指定優先とResetを解決する|C|既存の決定的検証・算術・射影を維持する。|
|J35|UIでテーマを選ぶ|D|人間の明示判断を維持する。|
|J36|文字起こし群からテーマ候補・構成を機械生成する|C|既存の決定的検証・算術・射影を維持する。|

J18の許可集合、J21の背景・配色、J22の動きは有限でも、複数回答の整合性や物理成立を別途検証する必要がある。J19のscopeとJ20の自由substring発見を混同しない。J23は候補peakが有限でも声の由来や強調判断をtext観測だけで保証できず、第一実験へ加えない。pixel/native QCと最終人間品質はDecisionsへ移さない。

## 6. J16の固定比較入力

以前の326字幕をそのまま対象にする。後段の統合済み265字幕は混ぜない。保存入力・回答等11ファイルのSHAとbyte数を前回inventoryと再照合し、すべて一致した。保存Normal274 / effect52はreference labelでありground truthではない。人間ラベルを作っていない。

|場面|区分|字幕数|保存Normal/effect|固定した比較入力UTF-8 bytes|
|---|---|---:|---:|---:|
|candidate-0001|tuning|53|45 / 8|109,376|
|candidate-0002|held-out|84|69 / 15|166,996|
|candidate-0003|held-out|61|49 / 12|135,808|
|candidate-0004|held-out|101|88 / 13|191,152|
|candidate-0005|held-out|27|23 / 4|88,458|

入力は既存場面説明・制作要求・同場面の全字幕と順序・場面端の直前/直後字幕と説明・該当字幕の保存音響測定・ASR本文/区間・観測上の制約・物理可否を列投影した。新しい意味要約、数値閾値化、重み付け、原文修正はしていない。音響データは文字列/数値の資料であって、音声を送った実験ではない。画像・動画・音声の送信0。

役割・presetの利用可能語彙は全体の判断条件として残すが、各字幕の保存役割、許可preset、理由、人間overrideはモデル入力へ混ぜない。ラベルは別ファイルに隔離した。配列位置を質問文へ明示し、質問IDだけで字幕を特定できると仮定しない。

`normal / effect / unresolved` は実験で比較したい意味の案であり、Decisionsの正式request/response schemaではない。`effect`から範囲・preset・理由を逆生成しない。失敗・拒否・欠落・文脈不足・表現不能をNormalへ押し込まない。正式APIでこの区別を保持できることを実走前に確認する。

[入力manifest](experiment-input-manifest.json) に全ID、場面分割、元入力SHA、生成script SHA、固定した5入力のSHAを記録した。本文とラベルは既存ignore配下の `runtime/artifacts/openai-decisions-evaluation-20260930-v001/` のみ。Gitには字幕本文・API keyを複写していない。GitHubのreportだけではローカル保存入力を復元できない。

[prepare-experiment.py](prepare-experiment.py) はネットワークを持たない独立研究用の列投影・検証だけである。provider clientや仮endpointは実装していない。再検証：

```sh
python3 docs/reports/openai-decisions-evaluation-20260930/prepare-experiment.py
```

元入力が揃った環境でfixtureがない場合だけ `--prepare` で生成する。異なる既存fixtureは上書きしない。これは実験入力のfreezeであり、tuning実走による質問最適化が終わったという意味ではない。旧Jevは送信入力自体が未作成だったため、今回の固定入力を両providerへ同条件で渡す将来計画である。

## 7. 実験手順・評価指標

詳細は [実験計画・未実行結果](experiment-plan.json)。上限はユーザー指定の合計 **1.00 USD、retryを含む推論12request**。課金仕様から次の送信と再試行の最大費用を事前に計算できなければ送らない。SDKの自動retryも計数し、上限を越える暗黙再送は許さない。

正式に共有context＋複数質問が可能で上限内なら、tuning53を先に確認し、質問・入力変換・model/設定を固定してheld-out4場面273へ進む。基本5request案で、残余があれば固定tuningの再現性を見る。上限不明のまま全326の一括実行を予定済みにしない。

複数質問を正式に使えない場合は、保存ラベルを見て選ばず **candidate-0001の配列位置0〜5** を小標本として固定する。各入力の同一再試行比較は費用・回数に余裕がある場合だけ。全326・held-outの品質へ一般化しない。入力上限を超えたら文脈を黙って切らず、実施不能または明示した小標本結果に留める。byteから独自係数でtokenを作らない。

評価はAPI成功率、有限回答逸脱、欠落/重複/余分ID、coverage、unresolved、保存判断agreement、不一致方向とクラス別分母、日本語の挙動、request単位wall time、全工程wall time、正式usage・費用。tuning/held-outを分離する。agreementはvalidな二値比較の分母と全対象分母を併記し、未回答を除いて見かけだけ良くしない。

probability/confidenceは正式応答に存在する場合だけ記録する。校正には独立した正解が必要で、保存判断一致を正答率へ読み替えない。皮肉や二重否定などの充足が未確認の例は欠測として扱う。同じ固定入力を再実行していなければ再現性未測定とする。batch所要時間を字幕数で割った値を独立API latencyと呼ばない。

## 8. 実験結果と費用・時間

|項目|今回|
|---|---|
|Decisions / Responses comparator / Jev推論|各0request、retry0|
|送信した素材|0 byte、画像/音声/動画0|
|追加推論費用|0.00 USD（推論未送信。請求書照合の実測ではない）|
|API成功率・逸脱率・agreement・不一致|未測定。0%や0件の品質結果に置換しない|
|API wall latency / provider latency|未測定|
|token usage / model返却版|未取得|
|確率 / confidence / calibration|未取得・未評価|
|日本語品質 / 再現性 / batch効率|未測定|
|本番変更・動画再生成|0|

既存演出の170.480秒は、要否だけでなく範囲・preset集合・理由・接続まで含む作業区間であり、モデル単体latencyではない。今回のオフライン列投影時間や将来のJ16だけの時間との差を、そのまま削減効果にしない。J16を前置きして従来一括判断も全件続ければ、むしろ費用と処理が増える。効果認定には残る生成・曖昧群の復帰も含む比較が必要。

## 9. 将来の接続案と採用範囲

実装しない研究用interface案は「固定文脈と質問・有限回答の意味を受け取り、字幕IDごとの選択と実行成否を分けて返す」境界だけ。正式仕様が出てからwire変換を決め、元応答・usage・model版・request時間を根拠付きで保存する。確率等は存在状態ごと記録し、ない値を0や独自confidenceへ置換しない。API schemaを発明したstubは作らない。

- **今採用できる方法**：この責務分類・固定入力・評価指標。A12はResponses＋Structured Outputsでも有限出力の比較候補にできるが、品質/費用は別途評価が必要。今回は本番接続もResponses実走も行わない。
- **公開待ち**：Decisions endpoint/SDK/schema/model、入力と質問上限、共有context、分布/校正、usage/価格/rate/保持、当アカウントのaccess。J16を最初に評価し、合格しても全演出置換には広げない。
- **移さないもの**：自由なsubstring発見・生成は通常GPT系、算術/pixel/native QCはcode、人間の最終視覚品質はhuman review。

公開情報の再確認は、一般公開と正式API資料の提示後に行う。自動監視・新契約・新しい評価AIは作っていない。

## 10. 検証・Git・直接報告

固定入力の再生成照合、11保存物のhash、326 IDの一意被覆、53/273分離、274/52の参照集計、モデル入力とラベルの分離、36判断点とA12/B11/C11/D2、JSON整合・リンク・秘密非保存・差分空白を検証し、すべて合格した。製品code変更がないため、rendererやnative QC等の製品testは再実行しない。

作業範囲は本directoryの調査資料とオフライン研究用script、および独立したignored fixtureのみ。旧Jev資料、主線report、CURRENT_GOAL、DECISIONSは変更しない。mainの他担当更新を保持し、今回ファイルだけを明示stageする。commit/pushと最終Git状態は相談役への直接報告で実値を示す。

相談役へのNEXT_REQUEST：**Decisionsの本番採用は正式仕様/access/料金とJ16実測が揃うまで待ち、公開後はJ16 shadowだけを第一段階として評価する方針でよいか。** Responses＋Structured Outputsは別の比較候補として区別する。Codex2への停止・変更・依頼は行わない。

## 根拠資料

- O1: [OpenAI DevDay 2026 Recap](https://openai.com/index/devday-2026-recap/) — 2026-09-29発表。Decisions節でLuna、有限質問・事前回答、text/image、limited preview、coming daysを確認。
- O2: [API reference](https://developers.openai.com/api/reference/overview) — 公開endpoint一覧にDecisions項目を確認できない。
- O3: [API reference index](https://developers.openai.com/api/reference/llms.txt) — Decisions掲載なし。検索対象229行。
- O4: [API guide index](https://developers.openai.com/api/docs/llms.txt) — Decisions掲載なし。検索対象262行。
- O5: [API changelog](https://developers.openai.com/api/docs/changelog) — Decisions掲載を確認できない。発表の否定には使わない。
- O6: [Model catalog](https://developers.openai.com/api/docs/models) — Decisions固有model designationを確認できない。
- O7: [API pricing](https://developers.openai.com/api/docs/pricing) — Decisions固有価格・画像課金を確認できない。通常Luna価格を代入しない。
- O8: [Data controls](https://developers.openai.com/api/docs/guides/your-data) — Decisions固有の保持・ZDR・地域適用を確認できない。
- O9: [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs) — JSON Schema/enumと拒否・不完全応答の扱いを確認。Decisions仕様ではない。
- O10: [Function calling](https://developers.openai.com/api/docs/guides/function-calling) — tool/argumentsとアプリ側の実行を分離する流れを確認。
- O11: [GPT-6 Luna model](https://developers.openai.com/api/docs/models/gpt-6-luna) — 通常モデルのStructured Outputs対応を確認。Decisions利用権限とは別。
- J1: [TypeSafe API reference](https://docs.typesafe.ai/api) — Noul、Choice分布・confidence、usage、共通stateと質問mapを確認。
- J2: [TypeSafe Models](https://docs.typesafe.ai/models) — jev-1.13.0、入力0.042 USD/Mtok、出力無料、text only、64k/32k、100K token/秒・40request/秒。
- J3: [TypeSafe Primitives](https://docs.typesafe.ai/primitives) — 同一stateに複数質問。並列・追加質問の低負担はprovider説明で、ZEV実測ではない。
