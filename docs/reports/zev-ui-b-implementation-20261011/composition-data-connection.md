# Codex-UI｜No.68 人間要求と構成データの専用接続（人工検証済み）

2026-10-11。親が採用済みBの範囲内で承認した「immutable要求snapshot＋元AI採用binding→他の採用場面を残す全体構成→保存と別process再読」の一件。**データ専用接続の人工検査は51/51成功。No.68全体未完成、No.70未着手。** 実素材・通常製造・人間品質まで完成したとは扱わない。

## 今回の検証結果（2026-10-11 06:06 UTC）

親が報告された具体条件に基づき、成功時inventory検査の一件を設営9として個別承認した。親がpatch全差分を読了したとの記録ではない。製品readerを変更せず、test1fileに閉じて適用した。返却bindingのsnapshot/composition2件を必須にし、それ以外の新fileは、その2件に完全対応する`._`名のregular/single-link fileで、AppleDouble magic/version・entry table/参照区間の範囲・非重複・entry ID一意を満たす場合だけ分類する。名前だけの除外や全`._`除外はしない。元全file SHA、state/要求store bytes、UI応答、拒否時全inventoryの不変検査は保持した。

元の[51件を再実行したraw log](composition-data-evidence/backend-unit-v002.txt)は51成功/失敗0/exit0（接続7＋編集要求9＋資料照合6＋UI確認29）。異素材A/Bで、各2JSON、同時二重保存の同一結果、元AI採用場面と不採用理由の保持、元資料・state・要求store不変、UIの追加要求待ち/製造停止維持を確認。異素材hash・古いchain/確認・余分な権限項目・重複/逆順/変更前集合の不整合・snapshot/構成/元AI資料改変を拒否する。**Bの別compiled backend processでも保存構成を再構築・再読し、同結果とbytes不変を確認した。**

AppleDoubleはA/B各2件、計4件を観測した。いずれも4,096bytesで、name/size/SHAは原logと[今回の検証索引](composition-data-evidence/verification-v002.json)に保存。原JSON2件のbinding SHA検査と旧全file SHA検査は省略していない。

別の証拠収集helperも親が独立した一件として承認した。inline Pythonのprotected配列の`evals/clip_composition/test_serve_digest_review_v001.py`を実在する`evals/clip_composition/serve_digest_review_v001.test.py`へ訂正しただけ。**保護対象20件を一つも削らず**、存在・HEAD bytes一致・size/SHAの収集を維持して成功した。これを証拠収集修正の累積10件目として独立記録し、設営9へまとめない。一般設営枠5の恒久増加/リセットはしない。

適用累積は設営/証拠収集修正10（以前8＋inventory9＋別helper10）、明示停止累積5は据置、限定実装修正3/一般枠3、追補0。今回製品source/reader・fixtureの変更0。有料API/実素材製造/公開0、費用US$0。旧48/51・旧helper失敗・旧累積は下記原log/index/work logに保持し、失敗を合格へ書き換えない。

cleanup：after-hookにより人工SSD/source root残件0、test process/server終了。今回raw logをbyte一致再読後、所有/tmp重複13,763bytesを削除。fixture回収量は未測定、新大容量媒体0、原本/正式/他担当/退避物と他担当processを保持。空き観測は開始Mac17,255,180KiB/SSD1,903,314,432KiB、検査後Mac17,262,160KiB/SSD1,903,312,896KiB。共有変動を含むため回収量の証明へ使わない。

現在は返却されたUI Git枠で今回test・新証拠・自分の報告/logだけを保存する工程。中央CURRENT_GOAL/HANDOVER/DECISIONSへ長い経過は追記しない。正式保持/時計/字幕新版準備・正式な要求反映対応・UI再資格確認・通常製造許可・実媒体/人間品質は残る。保存構成データだけを製造資格にしない。

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
