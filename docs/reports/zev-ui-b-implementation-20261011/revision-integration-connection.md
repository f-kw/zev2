# Codex-UI｜No.68 全体保持→変更後時計/字幕準備の最小接続案

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
