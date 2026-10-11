# Codex-UI｜No.68 人間要求と構成データの専用接続（人工検証済み）

2026-10-11。親が採用済みBの範囲内で承認した「immutable要求snapshot＋元AI採用binding→他の採用場面を残す全体構成→保存と別process再読」の一件。**データ専用接続の人工検査は51/51成功。No.68全体未完成、No.70未着手。** 実素材・通常製造・人間品質まで完成したとは扱わない。

## 最新：追加場面の保持要求prepare/read（2026-10-11 06:41 UTC）

現在の保存構成を再照合し、追加場面だけの閉じた保持Skill要求を未回答として別小JSONへ保存・再読できるconsumer接続の人工検査を完了した。原保持4記録は原request全体・response/result SHA・元本文/ID/候補所属/境界を既存validator/resolverで再照合して内部参照に限る。原回答SHAを新版へ付替えず、原AIのreject理由を変更しない。新入力の理由は保存探索要約と原bindingに固定し、保存から判断・製造処理を起動しない。公開応答は追加場面名/未回答/未準備/未承認を返すだけで、原保持記録を公開しない。

親が`retentionBindings`の型宣言一箇所だけを**限定実装修正4**として個別承認した。`Record<string, Obj>`を既存`DigestByteBindingV001`へそろえた差分だけを適用し、runtime値・SHA・照合・製造資格は不変、`as any`やvalidator緩和なし。これは既存work-order内の型整合で製品/人間判断の意味を変えないため相談役の個別技術判断となる。別不具合を含めず、一般枠/累積をリセットしない。適用累積は設営10/実装修正4/停止6、追補0・費用US$0。

[backend build](retention-inputs-evidence/backend-build-v002.txt)はexit0、[新対象人工検査](retention-inputs-evidence/backend-unit-v001.txt)は**8/8成功・失敗0・exit0**。異素材A/B、構成2JSONの事前保存必須、同時繰返し保存の同一結果、原全file/state/要求store不変、追加だけの未回答・閉じた元本文/IDと理由出典、旧回答SHA不変、原参照非公開、古い確認/別素材/未所属候補/要求chain変更/余分な実行許可の拒否、原保持4記録/元資料/構成/新要求の欠損・改変拒否、Bの別compiled processで同結果再読を確認した。空欄/不一致の探索要約は保存回答の改変として通常SHA照合で拒否した検査であり、正式に再束縛した新producer版を製作したとは扱わない。以前の51件を再実行せず、原TS2345と旧48/51・51/51証拠のbytes不変も[検証索引](retention-inputs-evidence/verification-v002.json)へ保存した。

準備保存前後でUI応答/fingerprint不変、場面名つき未回答と入力検査未完了をHTTPで確認した。既存App.vue1914行の停止理由欄へ渡る本文であり、**ブラウザー描画/ユーザー操作は今回未実施**。clientから新prepare/readを呼ぶ明示操作は未接続。今後表示が変わった場合も旧確認を付替えず、現在のfingerprintで再確認する。正式保持回答受理/全体統合・新版時計・字幕manifest・要求反映の正式対応・UI再資格確認/作成接続・実媒体/人間品質は残る。No.68全体未完成、No.70未着手を維持する。

cleanup：人工SSD/source root残件0、今回test server/processとbuild process終了。監査コピーをbyte一致再読後、自己/tmp重複1,909bytesを削除。fixture回収量は未測定、大容量媒体0、原本/正式/他担当/退避物と他担当processは保持。空き観測は検査中Mac17,243,356KiB/SSD1,903,287,808KiB、検査後Mac17,240,708KiB/SSD1,903,312,384KiBで、共有変動を回収量としない。保護対象20件中19件は観測HEADとbytes一致、CURRENT_GOALだけ別担当変更。制作sourceと他担当5文書は操作せず、自分の対象だけをUI Git枠で保存する。

## 次の一件の読取提案（2026-10-11 06:19 UTC、未実装）

**「追加場面の保持Skill要求を準備・保存・再読する接続」だけを次対象にする。** 既存snapshot/構成を現在のformal baselineへ再照合し、変更しない採用場面の元保持request/response/result/validationを原bindingで参照する。追加場面だけに未回答の保持要求を作る。回答生成・全区間keepの仮採用・全体保持の合成・字幕回答・製造はこの一件へ含めない。

新しく束縛する入力は、snapshot/composition binding・requestHash・全represented ID、元source/STT/共通発話/候補/AI採否/保持4記録のbinding、追加場面の既存Skill入力（目的、candidateId/title、highlightReason、発話ID、断片IDと元本文）。highlightReasonは保存探索回答の候補要約を参照し、その原bindingも保持する案。人間追加の来歴は外側の要求IDで記録し、元AIのreject理由をadopt理由へ書き換えない。Skillの閉じたinputへ時計・課金/製造許可・人間品質を混入しない。準備ID/rootは担当の明示入力とし、新上限を置かない。

再利用条件：旧保持は旧request全体と元回答/結果のbytes・目的・候補ID/title/理由・発話/断片列/本文・元境界を再照合し、既存provenance/ID/clock解決を通した**原記録参照**としてだけ使う。旧responseのrequest SHAを新版へ付け替えず、旧全候補回答を追加場面の回答にしない。追加場面に回答がなければ未回答を返す。新版保持回答の再利用も、その保存requestが現在の期待request/input/元参照と一致する場合だけで、候補IDや本文一致だけでは不可。

再利用する実装は、既存UIの`readUiReviewMaterials`/構成reader/候補resolver、`assertInternalRetentionInputV001`、後続回答の`validateInternalRetentionProvenanceV001`→`resolveInternalRetentionV001`。保持inputの写像は通常producer385–393行と字幕reader199–210行にinlineで、公開builderはないため、同じ閉じた写像だけを薄く接続する。通常producerをextract/cloneしない。

| 次一件の対象path（提案のみ） | 最小差分 |
| --- | --- |
| `backend/src/domain/digest-ui-review.ts` | 内部のqualified結果へ、既に閉じた元保持4記録のbinding/文書参照を返す。公開UI応答は変更しない |
| `backend/src/domain/digest-ui-composition-data.ts` | 既存再構築・保存bytes再読を使う追加保持入力のprepare/read関数。原保持参照＋追加だけの閉じた未回答要求を一束へ保存。新ledger/serviceなし、既存構成保存の2JSON条件は変更しない |
| `backend/src/routes/control.ts` | 必要なら専用の明示prepare/readを既存人間認証・操作キュー内へ接続。構成保存から自動起動せず、dispatch/通常queueに入れない |
| `backend/test/digest-ui-revision-retention-inputs.test.mjs`（新規案） | 入力の原本文/IDと来歴、旧回答SHA不変、未回答/改変拒否と再読だけの対象検査。今回51件の繰返しは調査段階で実施しない |

**制作側の境界：** 保持回答を正式受理し旧保持と統合するproducer、新版全体の元時計、字幕manifestは制作担当の明示所有/承認が必要。既存`runner/src/digest-plan-consumption-v001.ts`と`runner/src/digest-caption-input-preparation-v001.ts`は旧normal AI採否/保持を再構築するため、新構成を差し込むoptionは追加しない。純粋`buildAdoptedCaptionJudgmentInputsV001`は検査済み全keep/drop・part時計を必要とし、`machineAdoptionBinding`をそのまま出力する。context-only構成や人間構成bindingをAI採用bindingへ読み替えて呼ばない。正式な人間構成/全保持/時計から純粋本文builderへ渡す薄い制作adapterが後続境界となる。

字幕の既存回答はinputのcaption/boundary ID・本文順・目的・styleLimits一致と原response/result/provenanceの再検査が必要。既存migrationの全体writer/readerは採用構成・meaning本文/ID/順序・時計不変（現コードでは31group）を要求し、追加場面への一般再利用には使えない。新版字幕要求は全保持がresolvedになった後に再準備する。製造資格・人間品質/採用・有料APIは新構成/保持入力束だけでは成立しない。今回source編集・検査/API再実行0、Git枠は親保持。

## 今回の検証結果（2026-10-11 06:06 UTC）

親が報告された具体条件に基づき、成功時inventory検査の一件を設営9として個別承認した。親がpatch全差分を読了したとの記録ではない。製品readerを変更せず、test1fileに閉じて適用した。返却bindingのsnapshot/composition2件を必須にし、それ以外の新fileは、その2件に完全対応する`._`名のregular/single-link fileで、AppleDouble magic/version・entry table/参照区間の範囲・非重複・entry ID一意を満たす場合だけ分類する。名前だけの除外や全`._`除外はしない。元全file SHA、state/要求store bytes、UI応答、拒否時全inventoryの不変検査は保持した。

元の[51件を再実行したraw log](composition-data-evidence/backend-unit-v002.txt)は51成功/失敗0/exit0（接続7＋編集要求9＋資料照合6＋UI確認29）。異素材A/Bで、各2JSON、同時二重保存の同一結果、元AI採用場面と不採用理由の保持、元資料・state・要求store不変、UIの追加要求待ち/製造停止維持を確認。異素材hash・古いchain/確認・余分な権限項目・重複/逆順/変更前集合の不整合・snapshot/構成/元AI資料改変を拒否する。**Bの別compiled backend processでも保存構成を再構築・再読し、同結果とbytes不変を確認した。**

AppleDoubleはA/B各2件、計4件を観測した。いずれも4,096bytesで、name/size/SHAは原logと[今回の検証索引](composition-data-evidence/verification-v002.json)に保存。原JSON2件のbinding SHA検査と旧全file SHA検査は省略していない。

別の証拠収集helperも親が独立した一件として承認した。inline Pythonのprotected配列の`evals/clip_composition/test_serve_digest_review_v001.py`を実在する`evals/clip_composition/serve_digest_review_v001.test.py`へ訂正しただけ。**保護対象20件を一つも削らず**、存在・HEAD bytes一致・size/SHAの収集を維持して成功した。これを証拠収集修正の累積10件目として独立記録し、設営9へまとめない。一般設営枠5の恒久増加/リセットはしない。

適用累積は設営/証拠収集修正10（以前8＋inventory9＋別helper10）、明示停止累積5は据置、限定実装修正3/一般枠3、追補0。今回製品source/reader・fixtureの変更0。有料API/実素材製造/公開0、費用US$0。旧48/51・旧helper失敗・旧累積は下記原log/index/work logに保持し、失敗を合格へ書き換えない。

cleanup：after-hookにより人工SSD/source root残件0、test process/server終了。今回raw logをbyte一致再読後、所有/tmp重複13,763bytesを削除。fixture回収量は未測定、新大容量媒体0、原本/正式/他担当/退避物と他担当processを保持。空き観測は開始Mac17,255,180KiB/SSD1,903,314,432KiB、検査後Mac17,262,160KiB/SSD1,903,312,896KiB。共有変動を含むため回収量の証明へ使わない。

返却されたUI Git枠で今回test・新証拠・自分の報告4fileだけを明示保存し、検証済みcheckpoint `7eaae3587040efd5391db3271fdb345e9bd5f271` をcommit/push成功（`3a1cca21..7eaae358 main -> main`）。[今回のsession log](../../work-logs/2026-10/2026-10-11T0607_Codex-UI_No68-composition-data-validation_7eaae358.md)とこの保存行を後続doc commitへ残す。中央CURRENT_GOAL/HANDOVER/DECISIONSへ長い経過は追記しない。正式保持/時計/字幕新版準備・正式な要求反映対応・UI再資格確認・通常製造許可・実媒体/人間品質は残る。保存構成データだけを製造資格にしない。

## 前回の停止・監査保存の記録

**後続の監査保存（2026-10-11 06:01 UTC）：** 親がSSDからUIへGit枠を返却したため、この停止時点の実装・原失敗証拠・記録11fileだけを監査checkpoint `ff061726c9e6bc0910d269a4e40194fa5516d9a6` にcommit/pushした。未承認の設営9案・別helper修正は未適用、再検査0。以下の「未commit」やdirty件数は保存前の状態を記録したもの。検査未合格とNo.68全体未完成は継続し、中央CURRENT_GOAL/HANDOVERには追記していない。Git枠返却後の保存結果は[後続session log](../../work-logs/2026-10/2026-10-11T0601_Codex-UI_No68-audit-checkpoint_ff061726.md)を参照。

## 変更結果と範囲

保存した場面追加の要求を、その時点の依頼・元資料・要求chainに固定する小JSONと、その要求を表した全体構成の小JSONを保存するconsumer側接続を実装した。元のAI採否と人間の追加を別の来歴として記録し、追加対象が以前AIで不採用だった理由もそのまま保持する。未変更の採用場面を残し、既存の候補復元で所属・元順・元時計を確認する。

この構成は **composition-data-only**。場面の元区間は候補のcontextに限り、保持判断・字幕準備は未準備、製造許可は未承認、人間品質は未確認と保存する。既存UIの「追加要求待ち」と旧準備による作成停止を解除せず、AI採否、producer/output/FileRef、通常処理キュー、state、保存編集要求を更新しない。clientからこの新保存を自動実行する配線は追加していない。

変更source/testは以下の5fileだけ。

- `backend/src/domain/digest-ui-review.ts`：正常なformal照合と人間要求chain復元を終えた場合だけ、既存の資格確認結果を内部返却。
- `backend/src/domain/ui-review.ts`：公開のUI応答は従来どおりmodelのみ。内部readerが資格確認結果を共有し、normal readerや候補写像を複製しない。
- `backend/src/domain/digest-ui-composition-data.ts`：現在の全chainを固定・再構築し、既存flat artifact directoryへsnapshot/compositionの2JSONをexclusive保存。両方の既存bytesを照合してから書き、改変済みpartialを修復・上書きしない。再読も同じchain・元資料・全構成を再構築して両bytesを照合する。
- `backend/src/routes/control.ts`：既存人間認証・直列操作キュー内の専用POST/GET。製造dispatch対象には追加しない。
- `backend/test/digest-ui-composition-data.test.mjs`：既存fixtureを変更せず人工A/Bで検証する7case。

構成の`requestHash`と`representedEditRequestIds`は、どの要求を表したかの来歴であり、要求を正式に完了したreceiptではない。元AI採用bindingを保持し、将来の再照合に必要な要求hash/IDを返す。正式producer全体のcopy、汎用snapshot service、新ledgerは作っていない。

制作担当の`serve_digest_review_v001.py`と対応test、runner/正式契約、shared、client、通常caller、中央Goal/HANDOVER/DECISIONSは変更0。人間品質/課金確認/原本保持の条件変更0。新有料通信・実素材取得/STT/動画製造・公開0、費用US$0。

## 検証と今回の停止

[backend/shared/runner build](composition-data-evidence/backend-build-v001.txt)はexit0。source差分checkも成功。

[人工backend検査の原log](composition-data-evidence/backend-unit-v001.txt)は **51件中48成功・3失敗、exit1**。既存44件（編集要求9、資料照合6、UI確認29）は全件成功。新しい7件は4成功・3失敗であり、合格とは報告しない。

- 新case1はAで2回同時保存が200かつ同じ結果、要求snapshot、元AI採用/不採用理由、構成来歴、hash、未準備/未承認の値まで確認した。その後の「追加fileは2件」のassertに、SSDが作った`._...--snapshot.json`と`._...--composition.json`も入り失敗。B側、producer全bytes不変、UI全応答不変の後続assertは未完了。
- 新case2はBの保存結果がcase1で未作成のため、別素材hash拒否の箇所で未定義参照へ落ちた。case7も同じ理由で別process再読に着手できなかった。別素材拒否・別process再読は未確認。
- 成功した新case3〜6：保存snapshot/構成改変のreadと再保存拒否、要求ID変更による古いhash/確認拒否、重複/順序逆転/変更前集合不一致の保存拒否、元AI採否bytes改変の拒否。拒否時のstate・要求store・fixture全fileのbytes不変、改変を戻した後の旧snapshot再読を確認。

SSD実測のfilesystemはExFAT。失敗logに記録された追加物は2つの新JSONと同名の`._`補助fileだけ。今回のtest fixtureはafter-hookで既に削除されているため、補助fileのAppleDouble headerは未読。製品sourceの修正が必要との根拠は今のところない。

**GPT_DECISION推奨案（まだ適用しない）：** この新testの成功時inventory検査1箇所に限り、追加JSON2件と、それらと完全に対応する`._`補助fileを分けて観測する。補助物を認める場合はAppleDouble magic/versionを確認し、他の追加fileは拒否する。元の全fileのSHA不変と拒否時の全inventory比較は維持し、補助fileの名前・size・hashも証拠へ残す。fixture、製品source、正式readerのpath制約、SSD構成、全体上限は変更しない。この一件を**検査設営修正9件目の個別例外**として親が判定した後に適用・必要検査を再実行する。依存caseの未実施を合格へ書き換えない。

根拠は[AGENTS.md](../../../AGENTS.md)「枠（5回）を超えた場合…報告して停止する」と、同じ承認済み範囲の具体的な一件だけ相談役が例外承認できる規則。適用済み設営修正累積8/一般枠5、限定実装修正累積3/一般枠3は維持する。今回の修正追加0、明示停止を累積5として記録、契約追補0。

## 証拠・cleanup・Git・残件

[検証索引とsource SHA](composition-data-evidence/verification-v001.json)に自分の5fileと原logを固定。証拠索引helperは、制作担当testを`test_serve_digest_review_v001.py`と推測していたため存在確認で停止した。実在pathは`evals/clip_composition/serve_digest_review_v001.test.py`。helperの修正版は未実行、この別件の収集不備も親へ渡す。source/raw SHAは独立した読取commandで取得し、禁止範囲の差分なしは実在pathを指定したGit差分で確認する。正式検査の設営修正9件目へ別の不備をまとめて例外適用しない。

raw log2件はbyte一致で保存・再読後、所有/tmpの重複16,198bytesだけ削除。人工SSD/source fixture残件0、test loopback serverとbuild/test process終了。fixture回収量は未測定。大容量媒体を生成せず、元素材・正式成果・他担当・退避領域は保持。他担当アプリや配信の停止0。

開始側観測の空きはMac17,270,360KiB/SSD1,903,314,432KiB、検査後はMac17,266,424KiB/SSD1,903,313,920KiB。共有環境の変動を含むためcleanupの増減量とは扱わない。

Git枠はSSD担当のまま。stage/commit/pushは未実行。`main`の観測HEADは`3ca4bc5fe71606222c58415a2bd5905ece8248d1`。親/SSDが進めた入口文書等のcommitを保持し、開始時の他担当未commit6fileは現在HEADへ保存されており、今回そのfileへ操作していない。現在のdirtyは自分の未検証source/testと今回の記録だけ。最終statusは[session work log](../../work-logs/2026-10/2026-10-11T0552_Codex-UI_No68-composition-data-stop_3ca4bc5f.md)と親への報告へ示す。Git clean/完成/checkpoint保存済みとは扱わない。

実装変更の限度を変えず、親の技術判定・必要再検査・Git枠返却・checkpoint保存が残る。その後にも保持判断/時計/字幕新版準備/要求反映の正式対応/UI再資格確認/通常製造承認/実媒体と人間品質が未接続・未確認。No.68をDoneにせず、No.70を開始しない。cloud親threadへこのdelegation最終応答が自動通知される経路を使い、別の相談役Web送信・返信受領は主張しない。
# 今回の追加保持要求接続：build停止（2026-10-11 06:29 UTC観測）

親が提案4pathのprepare/readを承認し、UI Git枠を返却したため、内部qualified結果・構成domain・専用routeの3sourceへ初稿を接続した。保存構成を再構築して両JSONのbytesを照合し、原保持4記録は全request/input/response/result・候補/元本文/ID・境界を既存validator/resolverで再照合する。原参照は内部束にだけ保存し、追加場面は保存探索要約を出典とする既存閉じたSkill inputの**未回答要求**として別JSONへexclusive保存する案。公開応答は追加場面名と未回答状態だけを返し、保存から判断処理を起動しない。既存UIの停止理由欄にも追加場面名と未回答を示す初稿を加えた。現時点は未検証で、動作済みとは扱わない。

[今回のbackend build原log](retention-inputs-evidence/backend-build-v001.txt)はexit2。`digest-ui-review.ts(100,101)`の`retentionBindings: Record<string, Obj>`から既存`document(binding: DigestByteBindingV001)`へ渡す引数が、型として必須のpath/fileSha256を保持していない（TS2345）。これまでの51/51は今回sourceの合格証拠に転用しない。新しい対象人工testは未作成・未実行、ブラウザー未実施。旧51件の全体再実行0。

**GPT_DECISION最小案・未適用：** この変数だけ`Record<string, DigestByteBindingV001>`へ型宣言を訂正する。元のruntime値、参照SHA、`document`の登録/binding/bytes照合、公開応答/製造条件は変えない。source型の訂正なので、限定実装修正4件目の個別例外として親の判定を求める。既存適用累積は限定実装修正3/一般枠3、設営/証拠収集修正10/一般枠5を維持し、未承認の4または11を自己適用しない。今回の明示停止を累積6とする。追補0・費用US$0。

[今回の検証索引](retention-inputs-evidence/verification-v001.json)に3source SHAと保護対象20件を保存した。制作runner/正式契約/fixture/client/通常UI-wrapper等19件は観測HEAD bytesと一致。CURRENT_GOALのみ別担当の未commit変更を観測し、触れず保持した。その他の制作/SSD文書変更もstageしない。

cleanup：今回生成fixture/media/browser/server0。build終了をprocess読取で確認、自己生成/tmpログ805bytesは監査コピーのbyte一致再読後に削除。原本・正式成果・他担当process・退避領域への操作0。今回の空き観測はMac17,240,488KiB/SSD1,903,312,384KiBで、共有変動を回収量としない。

No.68全体未完成、No.70未着手。型訂正の個別判定後に新対象testを実装し、異素材・改変拒否・未所属候補・旧全file不変・別compiled process再読を確認する。保持回答の正式受理/全保持aggregate・新版時計・字幕manifest・要求反映の正式対応・UI再資格確認/作成接続・実媒体/人間品質は残る。cloud親へのdelegation応答が監査/判断の返却経路であり、別Web相談役への送信/返信受領は主張しない。

UI Git枠で今回の3source・自分の報告/前回提案log・失敗証拠だけ7fileを監査checkpoint `b46fd6366db6de874462f2ac0a0b0e64e4f0f8e9`へ固定した。build失敗・未検証を維持する。今回の[停止session log](../../work-logs/2026-10/2026-10-11T0632_Codex-UI_No68-retention-inputs-stop_b46fd636.md)とこの記録を後続doc checkpointへ保存し、親へ具体的な型訂正一件を返す。別担当5fileを保持するため共有checkoutはdirtyで、作業完了/全体Git cleanとは報告しない。
