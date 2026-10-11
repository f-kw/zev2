# Codex-UI｜No.68 人間新版の全体保持・時計字幕準備と検証

**最新結果（2026-10-11 10:10 UTC）：人間新版準備と現在の編集要求の対応を、UI表示時に再照合する限定接続が成立。** 新人工7群・関連54件・client37件が全て合格、backend/client build/types exit0。専用Edgeの隔離mockで閲覧・取消・連打・旧版拒否・再表示を確認した。既存準備参照とrequest hash/反映ID/bindingを再利用し、別台帳や要求の消込を増やさない。保持本文と予定尺の準備成立は表示するが、字幕表示回答・正式製造・完成QC・人間品質は未完。実素材やproduction backendとの通し確認ではない。No.68全体未完成、No.70未着手。旧停止・失敗・過去の検証範囲は以下に保持する。

以下の具体案・Git保存待ち・初稿型検査停止は各時刻の履歴として保持する。最新の許可・修正・検証・cleanupは末尾「型注記6の個別承認と今回の成立範囲」に記録する。[成功生ログと検証索引](revision-preparation-evidence/verification-v002.json)。

2026-10-11 08:45 UTC、読取main `e33c00318b4819f013e6c5302101c4bfaf2e2373`、開始Git clean/untracked0。親が追加保持受入の人工8/8を受領し、次の接続の対象path・入出力・旧保持再利用条件・人工検証範囲をまず返すよう指示した。**調整用の具体案で、以下の仮path/schema/routeを実装・新設承認したものではない。** 今回はsource編集/test/API/実素材/製造0、Git枠は親でstage/commit/pushしない。No.68全体未完成、No.70未着手。

## 推奨する一件と所有path

既存の現在資料資格化と保存回答readerから、原AI採用scene＋人間追加sceneの全体保持を別来歴で復元し、同一全体を既存時計validatorと字幕入力builderへ渡す。**専用writer/readonly readerを一つの新moduleに置き、媒体を作らない準備manifestまで**を次の一件候補にする。通常AI plan/consumption/caption reader、Skill/validator/builder、runner dispatchを改訂しない。UIの追加要求は反映完了へ変更せず、正式receipt接続は後続として残す。

| source/test候補path | 最小差分と所有調整 |
| --- | --- |
| `backend/src/domain/digest-ui-revision-preparation.ts`（新規案） | 全体統合・時計・字幕要求を同じ入力から構築する専用writer/readonly reader。UIのデータ接続担当。新しい汎用producer/ledger/queueは作らない。 |
| `backend/src/domain/digest-ui-composition-data.ts`（既存） | privateの現在snapshot/構成/元保持再資格化を新moduleへ限定して再利用する内部helperを返す。既存caller全文reader/回答readerと不変保存を使い、validator処理をコピーしない。一般UIへ元保持本文を返さない。 |
| `backend/src/domain/digest-ui-review.ts`（既存） | このreaderが既に登録SHAで読んだ`inspection`/そのbindingと`style`/そのbinding、元plan/executionの必要参照を内部qualification結果へ追加するだけ。現在はこれらを読取後にreturnしていない。表示・認証・normal runner readerの条件を変えない。UI readerの所有確認が必要。 |
| `backend/src/routes/control.ts`（既存） | 既存agent認証必須・共有operation queue内で専用writer/readを呼ぶ限定2route。人間UIの製造操作へ直結しない。新service/dispatchや認証変更なし。 |
| `backend/test/digest-ui-revision-preparation.test.mjs`（新規案） | 下記の全体統合/時計/字幕準備だけを人工検証。既存SSD fixtureとbackend-local Node/tsx入口・直列条件を再利用。 |
| `backend/test/digest-ui-fixture.mts`（必要時だけ） | 複数の非重複sceneを一般的なfixture引数で作る最小拡張。現A/B二sceneだけで足りる検査では変更しない。素材専用値やproduction条件への例外を入れない。 |

制作所有の`serve_digest_review_v001.py`と対応test、既存runner/Skill/保持validator、時計validator、字幕builder、shared命令型は変更候補に入れない。制作callerに新moduleをimport/呼出するpath変更が必要なら、そのpathと作用を先に親/所有担当へ返す。上表は候補の列挙であり、正本path上限の新設ではない。

## caller入力・出力

入力は現在の依頼ID/identity/確認fingerprint/requestHash、資格化済みの人間snapshot/構成/未回答bundleのbinding、**追加要求IDごとに一つの保存回答hash/bindingの明示対応**とする。回答候補をfile走査や最新mtimeで自動選択しない。追加要求の集合・順・所属と完全一致し、重複/不足/余分/別要求SHAを拒否する。外からkeep/drop、時計、元本文、style値、製造許可を直接渡す入口は設けない。

元plan/execution/caption登録と元AI採否/保持4記録、候補/本文/発話/source inspection/styleは現在の正常readerから取得する。inspection/styleとbindingは同じ登録資料から取得し、別にcallerが値だけを差し込まない。旧source videoの実bytes資格化範囲は現readerのままにし、今回メタデータだけで新しい媒体QC合格を名乗らない。

保存先は**制作caller/親が明示した既存SSD inputRoot内の新出力directory/prefix、preparationId、scope binding**へ限定する。Codexがroot/上限/scopeを仮置きせず、元出力rootを上書きしない。UI runtimeのsnapshot/回答と、SSD側normal準備の参照はそれぞれ実rootとbindingを明示し、同じ相対pathだから同じfileとは扱わない。巨大素材コピーや署名URL/素材取得なし。

最小出力案は以下。schema名は調整用で、normal AI準備schemaを名乗らない。

| 新規保存物 | 内容 |
| --- | --- |
| `revision-retention.json` | 仮schema `ui-digest-human-retention-integration-v001`。人間snapshot/構成/bundle、全要求ID、原AI採否binding、旧保持4記録/追加回答bindingを閉じる。sceneの採用由来（原AI/人間追加）と保持由来を分け、各元blockの本文/ID/理由/roles/元端点/evidenceを保持。新全体keep順とdrop集合、新全体ID→元candidate/record/block/segment ID対応も保存。別の採用fileを複製せず、この結果が実際の全体構成来歴を担う。 |
| `revision-edit-plan.json` | 新全体keep一件を編集区間一件にする。全体ordinalと`segment-0001`等の一意IDを決定的に割当て、旧record側のIDを変更しない。追加候補の外端へ戻してdropを復活させない。 |
| `revision-clock-resolution.json` | 全体keepの同一順序・同一元端点を既存clock validatorへ渡した結果と、inspection/全体保持/編集のbinding。passed、mapping件数/全体ID/元端点の一致を閉じる。時計のみで製造承認としない。 |
| `meaning-input.json`＋各`display-request-*.json` | 既存字幕builderから新全体parts・keep/drop・原本文/発話・登録styleで作る意味atomと未回答表示判断要求。builderの`machineAdoptionBinding`引数には**上の人間全体結果の真のschema/SHA binding**を渡し、元AI adoptionを偽装しない。表示回答・境界採択・描画なし。 |
| `revision-preparation-manifest.json` | 仮schema `ui-digest-human-revision-preparation-v001`。現在の依頼/全chain/元basis/各回答/inspection/style/scope/実root・実装SHAと各出力bindingを閉じる。全体保持/時計/字幕入力の成立と、execution not-approved/human quality pending、未回答表示判断/未製造を分ける。 |

writerは全体構築と純粋検査が成立してから保存する。既存fileがある場合は全bytes同一だけを再利用し、改変/symlink/別chainのpartialを上書き・自動修復しない。manifestは最後に保存する。readonly readerは保存manifestのsummaryを信じず、現在入力と選択された保存回答から全出力bytesを独立再構築し、全binding/実装SHA/保存bytesを照合する。依頼/構成/元資料/回答/実装が変われば旧fileを保持してcurrentへの適用拒否とする。

route候補は既存agent限定prefixの`POST /agent-digest-retention/:id/:requestHash/revision-preparation`と`GET .../revision-preparation/:preparationHash`。scope/root等の正規入力契約は親/制作所有者との調整後に閉じる。一般UIへの全文公開、通常準備登録の流用、pending要求の削除、作成前確認の解除、job/claim/render/provider呼出なし。

## 既存保持の再利用条件と再利用する低層実装

1. 現依頼/元資料/元AI採否・source所属・元候補順を現normal readerで閉じる。原採用scene集合を全部保持し、人間追加以外の差替え/除外/順序変更を今回へ混ぜない。
2. 原採用sceneの保持は**旧全要求のまま**本文/発話/採用理由から復元する。`validateInternalRetentionProvenanceV001`と`resolveInternalRetentionV001`で再検証し、旧validation全bytes相当の内容と一致した時だけ元記録参照として再利用する。sceneごとに旧request SHAを付替えたり、新しい人間回答と称したりしない。
3. 追加sceneは8/8済みの`readDigestUiRetentionCallerAnswer`で現在bundle/要求全文/保存回答/元境界を再資格化する。追加回答が一件でも未回答/abstained/不一致/未解決なら全体準備へ進めない。自動再判断・全keep代替・時刻補間なし。
4. 全体は構成scene順、scene内は検査済みblock順で組む。元IDの重複/keep-drop衝突・正の区間重なり・逆順・元所属欠落を拒否する。重複を勝手に間引いたり、時計の都合で意味を削ったりしない。元block/元端点/evidence/roles/reasonのbytesを変更せず、新ID/ordinalと対応表だけを新結果に持つ。
5. `validatePresentationBaseMediaSegmentPlanV002`へ、同じinspectionのfps/decoded/logical frame数/video offset/audioClockと新全体keep区間だけを渡す。既存frame/sample対応・source終端・元音声範囲を維持し、mappingを全体ID/元端点へ照合する。純粋validatorだけを呼び、媒体build/製造job値作成は不要。
6. `buildAdoptedCaptionJudgmentInputsV001`へ、検証済み新全体parts/keep/drop、同一原本文/共通発話、登録styleを渡す。原文/ID/範囲を変えない。builderが原atomをkeep区間に収められない場合も、clip/本文改変へ逃げず拒否する。独立readerは人間全体bindingのschema/来歴を確認する。

`runner/src/digest-plan-consumption-v001.ts:120–149`の旧adoption→parts→clock呼出、`runner/src/digest-caption-input-preparation-v001.ts:272–310`の旧parts→builder呼出が接続の参照になる。元のentrypointは元AI選択graphを復元するため使い回さず、低層validator/builderだけを直接再利用する。`backend/src/domain/digest-ui-review.ts`はinspection/styleを既に登録SHAで読んでいるため、別のsource reader基盤を作る必要はない。

## 人工検証の範囲・所有調整点

- A/Bで原採用＋追加keep/dropを全体化し、原keep/drop/ID/本文/端点/evidenceを完全保持、新全体IDとorigin対応、全体clock件数/frame/sample、意味atomとdisplay要求の順・keep網羅/drop不混入を確認する。可能なら三scene以上・複数追加は既存fixtureの一般引数だけで検査する。
- 不足/余分/重複/別scene/別chainの保存回答、偽authority、旧回答SHA付替え、古いsource/style/inspection、元保持改変を作用前に拒否し、元資料/AI採否/旧保持/state/queue不変を照合する。
- 複数sceneの元segment ID衝突は新全体ID/対応表で解く。元断片ID重複・keep/drop衝突・正の区間重なり・逆順・source範囲外・frame/sample対応不能は勝手な修復なしで拒否する。
- 繰返し/同時writer、既存正常bytes、partial/missing/tamper/symlink、現在依頼/構成変更後の旧保存保持と適用拒否を確認する。新processでmanifestから全出力bytesを再構築し、通常AI readerと一般UIへの誤登録/表示/製造資格昇格を拒否する。
- backendの同じNode/tsx/SSD人工fixture/直列入口と関連build/typesを使う。新インストール/有料通信/実素材decode/動画製造/ブラウザ上の人間品質採点なし。過去8群とbuildを新しい全体統合の検証の代用にしない。

調整が必要なのは、上のUI reader内部返却pathと新writer所有、制作callerが使うSSDの実出力root/prefix・scope/preparationId、**人間全体manifestを読む正式消費口と未接続receiptの境界**。ここが閉じるまでは新sourceを編集しない。製造/人間品質/費用・任せる範囲の新しい承認は今回の案から導出しない。

累積設営11・限定実装修正5・停止8・追補0・費用US$0を保持（今回増分0）。停止8からの今回再開許可を継承し、同じcwd問題の本人了承を再要求しない。別の新しい強制停止/安全境界が出れば別に扱う。この案とsession logは保存・再読だけを行い、Git枠親のため保存待ち対象として返す。

## 呼出位置の読取確定・Git保存指示（08:50 UTC）

親が提案を受領し、制作担当へ所有/SSD出力/正式消費口の確認を依頼した。今回UIへGit枠を渡し、この未commit2文書だけを保存/pushする指示を受領。実装着手は境界回答後の次指示まで待つ。追加資料/source/testは作らない。

| 専用writer/readonly readerからの呼出 | 既存sourceの参照 |
| --- | --- |
| 原保持の再検証はcomposition-data内の既存資格化を限定helper経由で再利用 | `backend/src/domain/digest-ui-composition-data.ts:131–132` → `candidate_internal_retention_validation_v001.mts:41,74`のprovenance/resolve。旧全要求の入力と旧validation照合を維持。 |
| 追加保持は保存回答readerを直接再利用 | 同composition-data `:264`の`readDigestUiRetentionCallerAnswer` → `:222,224`の同じprovenance/resolve。回答生成は呼ばない。 |
| 統合keepから元frame/sample時計を算出 | `evals/clip_composition/presentation_base_media_build_v003.mjs:1301`の`validatePresentationBaseMediaSegmentPlanV002`を直接呼ぶ。引数/対応照合は`runner/src/digest-plan-consumption-v001.ts:137`を参照し、その通常consume入口は呼ばない。 |
| 同じ統合keep/dropから意味atomと未回答display要求を算出 | `evals/clip_composition/adopted_caption_judgment_inputs_v001.mts:24`の`buildAdoptedCaptionJudgmentInputsV001`を直接呼ぶ。引数は`runner/src/digest-caption-input-preparation-v001.ts:301`を参照し、通常AI準備writer/readerは呼ばない。 |

この呼出を専用moduleの共通再構築関数へまとめ、writerとreadonly readerは同じ構築を使う案。人間新版の実bindingを渡す設計を維持し、既存AI由来manifestのschema/来歴を新構成へ偽装しない。

人工検査の出力は既存`createFixtureWorkspace`が作る一時SSD rootと人工runtime内へ限定し、cleanupする。実製造側の出力は所有担当が指定した別root/prefix/scopeで扱い、fixture rootやそのmanifestを正式登録へ流用しない。今回どちらの新出力も製造せず、実出力scopeをCodexが仮置きしない。

## 許可済み初稿と型検査停止（09:07 UTC）

親が制作担当との衝突なし確認を返し、専用module/内部helper/agent route/対象testの最小差分でwriter・独立readerと人工検証を指示した。実素材/paid API/製造/正式消費reader/runnerは変更対象外、明示SSD fixtureへ隔離して今回の一時物だけcleanup、Git枠UI。開始main b3b6096eaf003969ec830f5351ead82fc2389ecd、Git clean/untracked0。

初稿は新専用module、composition-dataの限定内部helper、digest-ui-reviewの資格化済みinspection/style返却、controlのagent/queue内2route、既存fixtureの一般候補数/idSuffix引数の5source/testに限定した。元block/ID/端点/evidenceを新scene記録へ保持し、新全体ID対応を別に記録する。元断片重複と区間衝突を新ID割当前に拒否する構築、既存clock validator/字幕builder、全出力の独立再構築、原出力と独立したSSD出力rootの検査、manifest最後の不変保存まで初稿を実装した。通常AI登録や製造資格を与える接続はない。

`corepack pnpm --filter backend build`はexit2。新moduleの元segmentをspreadして新ID/対応を付けた配列で、TypeScriptが元のindex signature fieldsを推論せず、sourceSegmentIds/candidateId/sourceStartMs/sourceEndMsの参照5箇所を拒否した。runtime/媒体検証には進んでおらず、新人工testはまだ作成・実行していない。旧8/8を今回の初稿へ流用しない。[失敗ログ/型エラー/source SHA](revision-preparation-evidence/verification-v001.json)を保存・byte再読した。

提案する**限定実装修正6は未適用**。新moduleの`const segments = sourceParts.map(`を`const segments: Obj[] = sourceParts.map(`へ変更する1行だけで、既存の元segment `Record<string, any>`を配列の型として明示する。実行時処理、出力shape、原本文/ID/時計、validator、scope/権限/品質の意味は変えない。新インストールやcaller再設計は不要。個別一件の軽微な型注記として親へGPT_DECISIONを返し、例外判定を待つ。自己適用/再buildなし。

累積は適用済み設営11・限定実装修正5、修正6候補未適用、明示停止9、追補0・US$0。停止8からの本人再開許可と旧累積を保持し、同じcwd了承を再要求しない。今回の別型の一件を新しく自己承認しない。失敗raw logをrepoへ保存後に自分の/tmp重複1869bytesを削除。fixture/新媒体/残process0、他担当process停止0。制作serve/test・runner/Skill/低層validator/builderは変更0。No.68全体未完成・No.70未着手、初稿の実行成立は未確認。

## 型注記6の個別承認と今回の成立範囲（09:21 UTC）

親が「限定実装修正6として、報告されたsegments配列への型注記1行を承認します」と返信した。sourcePartsは旧全保持のprovenance/ID/元境界再検証と追加保存回答readerから取得されることを確認し、`const segments: Obj[] = sourceParts.map(`の1行だけを適用した。runtime処理・出力shape・本文ID時計・validator・scope/権限・品質の意味を変えない技術的な型推論補足であり、親の第2層判断として同じ承認済み一件内で扱った。`as any`/検査無効化/費用/素材/製造/契約/一般上限の変更はない。停止9と前の失敗証拠は消さない。

専用moduleは元採用sceneの旧保持全要求を再検証して参照し、追加sceneは保存回答readerで現在bundle/全文SHA/元境界を照合する。全体の元断片重複/keep-drop衝突/区間重複や逆順を新IDの割当前に拒否する。元block/本文/端点/evidence/roles/reasonと旧segment IDをscene側へ残し、global segment ID/ordinalと原blockの対応を新資料へ記録する。その同じkeep列から既存clock validatorと字幕builderを直接呼び、原AI正本を上書きしない。旧UI summaryには内部inspection/styleや新版全文を出さない。

agent認証必須/共有operation queue内に限定したPOST保存とGET読取を実装した。入力は現在identity/fingerprint/bundle SHA、追加要求ごとに一つの明示された回答hash、scope binding、出力root/preparationId。出力は現在登録したSSD inputRoot/prefix内で、旧source runtimeと旧字幕準備rootに重ならない専用directoryだけに保存する。全構築/検査後に不変bytesを保存、manifestを最後に書く。改変/symlink/別版の上書きなし。既知の同一partialは明示された同じPOST再試行でだけ補完する。GETは欠落を修復せず、現在原資料/回答/実装から全出力bytesを再構築する。root移動や原資料/現在chain変化の場合は旧記録を保持して適用拒否。

| 今回の検証 | 実結果 |
| --- | --- |
| 型注記後backend build/types | exit0、同じpnpm入口。[生ログ](revision-preparation-evidence/backend-build-v002-passed.txt) |
| 新版writer/独立reader人工検証 | 8群実行・8合格・失敗/skip/cancel0、38,603.63475ms。[生ログ](revision-preparation-evidence/backend-unit-v001-passed.txt) |
| 関連既存UI/保持接続6file | 46件実行・46合格・失敗/skip/cancel0、64,956.915625ms。[生ログ](revision-preparation-evidence/backend-regression-v001-passed.txt) |
| source/原本/権限 | 元資料/AI採否/旧保持/state/queue bytes不変、通常AI登録拒否、UI追加要求は未反映状態を保持。source6と保護14のSHAを検証索引へ保存 |

人工A/Bは追加1sceneずつ、3sceneのB変種は追加2scene。keep区間は3/3/5、時計上の出力frame数75/105/90で、実媒体は生成しない。元ID/本文/端点/evidence、新全体IDと元block対応、frame/sample、keep網羅/drop不混入の意味atom/未回答display要求を検査した。認証、不足/余分/重複/別回答/偽authority/別root、元保持/inspection/style/保存出力改変、missing/partial/symlink、古い依頼/source/chain、偽実装来歴、繰返し/同時POST、compiled backend新processの全出力再読を検査した。既存fixtureは一般候補数/idSuffix引数だけを拡張し、既存2sceneの関連46件も通った。既存Node/tsx/backend cwd/明示SSD/直列入口を再利用し、新インストールなし。

準備状態は`human-revision-inputs-prepared`、新manifestは`ui-digest-human-revision-preparation-v001`。本文builderの`machineAdoptionBinding`には実際の人間統合資料のschema/SHAを渡し、AI由来manifestを偽装しない。保持統合verified/clock passed/字幕入力preparedと、字幕表示回答unanswered/UI反映not-connected/execution not-approved/human quality pendingを区別する。正式消費口/製造reader/runnerは未変更。新表示回答・AI推論・実素材・有料API・媒体製造・公開・人間品質・今回のブラウザ目視は未実施。以前の8群やclient/動画の合格を今回の全体製品完成へ流用しない。

after hookで自分の隔離SSD fixtureとlocal人工sourceを削除した。run log生成以降の同prefix残directory0、残server/子process0、他担当のアプリ/配信/STT process停止0。回収fixture容量は未計測、新playable媒体/巨大中間物0。成功log3fileをrepoへbyte一致で保存・再読し、自分の/tmp重複10,286bytesを削除。旧失敗log/checkpointは保持。

累積は**設営11・限定実装修正6・停止9・追補0・US$0**。今回適用修正増分1、停止増分0。source型注記1line＋新人工testと自分の成功証拠/reportを監査checkpointへ保存し、そのSHAを含むsession logを追加してから最終push/Git確認/親報告を行う。正式完成/採用を意味しない。No.68全体未完成、No.70未着手、次の正式消費/receiptは明示指示まで待つ。

検証済みsource/test/成功証拠の監査checkpointは`854d9885c3a0f25a68ffff140f10f772e9932faf`。この追記と[session log](../../work-logs/2026-10/2026-10-11T0924_Codex-UI_No68-revision-preparation-verified_854d9885.md)をdoc commitへ保存し、両commitをmainへpushして最終SHA/statusを親へ報告する。型注記前の失敗checkpoint`0fe675ac`は履歴として保持する。

## 現在の新版準備への反映再照合・初稿型検査停止（09:49 UTC）

親は01d5d326のwriter/readerを独立読取レビューし、限定範囲受領可・具体的差戻し欠陥なしとした。次の指示は、既存request hash/反映ID/bindingを再利用して「どの編集要求がどの新版準備へ反映されたか」をUIで再照合する最小読取・表示と人工検証。別台帳・古い要求/別構成/改変manifestの反映済み扱い・通常AI偽装は禁止。製造資格/表示未回答の停止を維持し、正式製造reader/runner/実素材/paid APIは未変更。Git枠UI。開始main/originは01d5d326634529d083212b0c7096f16a3c8f1cf0、staged0。

初稿は既存`ui-digest-preparations.json`の一件にoptionalな人間新版manifest参照（requestHash/outputRoot/manifestBinding）を持たせた。新しい「反映済み」台帳や要求の消込は作らない。agent認証/既存operation queue内の参照登録だけを追加し、既存独立readerによる全出力再構築・現在chain/binding一致後に保存する。UI GETでは同じreaderを再実行し、現在の全編集要求ID・構成順・追加sceneと原本文を照合した表示suffixだけを返す。既存内部reader/fingerprintはbaselineのまま、新suffixは計算後に付けるため自己参照を避ける。旧writer/reader/manifest実装SHA対象は変更しない。

client初稿は反映ID/構成/identity/fingerprint/未承認状態/本文IDを現在資料と照合した時だけ、追加要求と新版場面の対応・追加後の保持本文・予定尺を表示する。表示判断未回答・製造入力資格未完・人間品質未確認を残す。旧準備の追加未反映メッセージは表示上だけ差し替え、serverのblocker/approval gateは変更しない。元要求を消さず、再読の不一致は反映済みにしない。**この表示/登録の動作はまだ検証していない。**

`corepack pnpm --filter backend build`はexit2、新view moduleの5箇所がTS2339となった。既存`readDigestUiRevision`の`outputs`は`Record<string, any>`のJSONと具体manifest型のunionとして推論され、resolution/scenes/atomOccurrences/segmentsを静的に参照できない。既存readerが全保存bytes/現在入力/実装SHAを照合してから返すJSON群であることを読取確認した。型検査より先の新人工test作成/実行、client build、専用Edge操作は未実施。旧8/46件の合格をこの初稿の合格へ流用しない。[失敗raw log・初稿7source SHA・保護20source SHA・未検証範囲](revision-view-evidence/verification-v001.json)をbyte保存・再読した。

**GPT_DECISION：限定実装修正7の個別承認を求める。未適用。** 新view moduleで`const outputs: Record<string, Obj> = revision.outputs;`を一行追加し、既存4出力lookupだけをそのlocal aliasへ変更する。既存のJSON object型を読み手のlocal変数へ明示する推論補足で、既存writer/readerの返却型、出力bytes/来歴、runtime処理、validator、本文ID時計、scope/費用/素材/権限・品質の意味を変えない。`as any`や検査無効化を追加しない。親の一件の技術判定を待ち、自己適用/再buildをしない。

累積は設営11・適用済み限定実装修正6・明示停止10・追補0・US$0。修正7は提案のみで一般上限/counterをリセットしない。停止8からの本人再開許可を保持し、同じcwd了承を再要求しない。failure logをrepoへ固定後、自分の/tmp重複だけ削除。今回fixture/媒体生成0、今回build残processなしを読取確認、他担当process停止0。共有ツリーの別担当5文書は保持しstageしない。No.68全体未完成、No.70未着手。この停止証拠と初稿を監査checkpointへ保存して親cloud threadへdelegation応答で返し、別Web相談役への送信/返信受領を実施したとは書かない。

初稿と失敗証拠の監査checkpointは`f03e1a503a1b909acd89f294f3ee65d78c6b6798`。[今回のsession log](../../work-logs/2026-10/2026-10-11T0949_Codex-UI_No68-revision-view-type-stop_f03e1a50.md)とこの索引をdoc commitへ保存し、最終push/statusを親へ返す。

## 限定修正7の個別承認・現在反映の限定検証成立（10:10 UTC）

親から「限定修正7の型注記と4参照の変更について、revision.outputs が既存readerで検証済みの返却値であることを前提に個別承認します」と受領した。既存reconstructの出力は`Array<{ name: string; value: Obj }>`に具体manifest objectが合流した型で、unknownではない。独立readerは現在入力/実装SHAと全出力bytesの一致を検証してから返す。その返却契約を確認して、new view内の`const outputs: Record<string, Obj> = revision.outputs;`と4lookupだけを承認どおり変更した。既存writer/reader返却型・runtime出力・validator・本文ID時計・費用/scope/権限・品質の意味を変えない型推論補足で、本人の低リスク判断委任に沿う親の技術判定。`as any`/検査省略/一般上限の変更なし。今後もreader返却契約を初稿前に確認する。同じ型推論失敗を追加の本人確認へ戻さない。

| 今回の確認 | 実結果 |
| --- | --- |
| backend build/types | exit0。承認された型注記後の同じpnpm入口 |
| client build/types | exit0。既存bundle-size警告のみ、今回ついでの最適化なし |
| 新版参照・表示人工HTTP/新process | 7群・7合格・失敗/skip/cancel0、62,413.659542ms |
| 既存関連backend 7file | 54件・54合格・失敗/skip/cancel0、103,852.367958ms |
| client unit | 37件・37合格・失敗/skip/cancel0、837.822375ms |
| 専用Edge隔離mock | 現在反映・未回答/未製造表示、閲覧/閉じる/再開/取消、再読/保存の連打、古版拒否/再表示を確認 |

新人工A/B追加1件ずつと3scene/2追加で、現在要求IDの集合と順・元構成scene順・manifest hash/binding・全保持本文/元ID端点・予定尺を照合した。参照登録で変更されたfileは既存UI準備参照一件だけ。繰返し登録・UI GET・独立reader・compiled backend新processの再読はstate/queue/旧AI判断/本文/原出力を書き換えない。参照追加前後の確認fingerprintは一致する。全出力file/未回答display入力の改変、manifest/回答/bundle/style、欠落/symlink、古い依頼/元資料/編集要求ID、別root/別構成/別hash/binding/通常AI manifest、偽製造許可、認証不足を拒否した。基準準備を再登録しても旧人間新版参照を保持し、現在に不一致なら反映済みにしない。元要求を消さない。

serverの既存blocker/creationChecksは変更せず、画面では照合済みの保持本文と予定尺だけを更新する。旧保持未回答などobsoleteな表示だけを置換し、追加後字幕の表示未回答・製造入力資格未完・人間品質未確認は残す。段階4表示は準備確認であり製造開始ではない。client unitは本文/ID/順/版/hash/対応ID/偽authorityと非同期旧応答/別依頼の混同を拒否した。既存AI由来manifest/正式consumer/runnerは変更しない。

Edgeは今回新規の専用tabだけで、127.0.0.1:5179の全API隔離mockを使用した。反映済み候補の追加は無効、未追加候補の確認取消ではPOST0、追加保存のdouble-clickでは追加要求POST1だけ。確認要求準備の保存/承認/dispatch/課金はPOST0。候補追加後は旧新版本文/予定尺/反映badgeが外れ、変更前本文と反映未確認へ戻った。再読連打/準備取消/reloadで旧版を復活させない。最初のmock起動は通常sandboxのlocalhost listen EPERMで終了したため、同じsourceを環境権限付きで起動した。QA補助URLの表示はEdgeが拒否したがGETはmockへ到達しており、通常Backで元画面へ戻った。browserのsecurity設定を変更/迂回しない。正常表示への復帰は自分のmockを新しい正常人工状態で再起動して確認したもので、実資料の自動修復ではない。実backendの全byte資格化は別の人工HTTP/compiled process検査で行った。[観察/呼出/画像/DOM](revision-view-evidence/browser-observations-v001.json)と[全検証・SHA索引](revision-view-evidence/verification-v002.json)を保存・byte再読した。

全test after hookで今回のSSD/local人工rootだけを削除。最近生成した自分のprefix残root0、残mock/test process0、専用Edge tab閉鎖を[cleanup証拠](revision-view-evidence/cleanup-v001.json)で確認した。新媒体/巨大中間物0、fixture回収bytesは未計測。自分の/tmp log重複22,221bytesだけ削除。source/来歴の保護20件は停止checkpointとSHA一致、他担当アプリ/配信/STT process停止0、元素材/他成果/archive操作0。

累積は**設営11・限定実装修正7・停止10・追補0・US$0**。修正増分1は親の個別承認、停止増分0。旧型検査exit2と旧counterを保持する。今回の反映照合の限定範囲は検証成立。No.68全体は正式製造/完成QC/実素材通し/人間品質を残し未完成、No.70未着手。検査中に届いた新本人方針を受領し、B導線を維持した保存根拠の短い選択案とSTT原本文/時刻保持へ進むため[次の最小境界案](context-choice-boundary.md)を返す。PDF更新待ちを開始条件にしない。追加作業のボード登録は親が別担当へ依頼済み、番号/登録完了は未受領。新しい候補生成や正式な非表示採用契約を自己変更していない。

検証済み型注記/test/画面証拠/次案の監査checkpointは`f2462954beddf5325bdfca04dd7161ed2f9211a8`。[今回のsession log](../../work-logs/2026-10/2026-10-11T1012_Codex-UI_No68-revision-view-verified_f2462954.md)とこの索引をdoc commitへ保存し、最終push/statusを親へ返す。c35ae4adの初稿停止記録は保持する。
