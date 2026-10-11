# Codex-UI｜No.68 保存候補の明示採用・接続境界

後続：親の技術判断とUI Git lease返却後、[一場面追加の人間編集要求保存](scene-addition.md)を実装・人工検証した。正式producerへの新版準備接続は残件として保持する。以下の境界調査と未修正時点の検査/失敗証拠は履歴として保持する。

2026-10-11 04:45 UTC。status: GPT_DECISION / handoff。調査と既存UI人工検査を実施。今回の製品source変更0。Digestの採用保存と正式計画への反映は未実装、No.68全体/No.70は未完成。

親の追問に対して、確定PDF全4pageと保存実計画を読取確認した。[変更単位の判断材料](candidate-choice-unit.md)。画面で触る対象は個別シーン、正式反映先は複数シーンからなる全体構成。PDFに差替え元の指定はなく、最小案は未採用の選択シーンを全体の採用集合へ反映し、他採用を維持する方式。新記録/正式再準備の接続は未実装であり、本報告の当時の境界記録を残す。

## 変更結果・本人向け

保存候補を開いてタイトルと要約を読む導線は接続済みです。通常の切り抜きでは、画面上で候補を選んだ後、明示的に次へ進む操作で採否を保存します。Digestでは、閲覧した候補を人間の選択として保存し、制作計画へ反映する経路がまだありません。このため、Digestの閲覧を採用済みとして表示していません。

既存の採否保存をDigestへそのまま流用すると、保存と同時に後続処理も起動します。また、Digestの制作計画には候補の採否だけでなく、保持する本文と元時計の確認結果が結ばれています。選択した候補の名前だけを入れ替えても、変更後の制作資料にはなりません。

候補を選ぶ本人操作と、変更した内容に対して必要な準備・作成前確認・費用確認を分ける接続が必要です。未準備の候補へ変更した場合、保存済み資料を上書きせず、変更後の準備が必要であることを示す案を親へ返します。新しい承認記録の意味と制作側の変更手順を確認するまで、この案を実装済みにはしません。

## AI note｜受領範囲・現物

親の同No.68続行指示「保存候補を見て、明示的に採用を変更し、作成前確認へ進む」の接続調査。既存正規変更手順を再利用できる部分は人工入力で実装/検証可、新しい承認方式/制作制約の変更が必要なら差分と理由を先に返す、を受領。Git枠はSSD担当のまま。今回の製品source変更、stage/commit/push、実素材/API/製造、共有board/Goal/HANDOVER/DECISIONS編集は0。

開始main/HEAD `fe88cc3611db039e5d98058e31d9d0f884e3b0cf`、staged/tracked/untracked差分0。確定PDFは前cycleの4ページ実表示/SHA記録を再利用し、再取得0。[既存UI報告](handoff.md)。

| 現経路 | 確認した現物 | 再利用できるもの / 境界 |
| --- | --- | --- |
| 候補閲覧・画面上の選択 | `client/src/App.vue:1542`以降 | 開閉/Escape、現在draftと確認資料fingerprintの束縛、連打lock、変更時dialog破棄。Digestはqualified保存候補を閲覧可能、正式theme_selection reviewがないため採用buttonは無効 |
| 切り抜きの採否保存 | `backend/src/domain/control-review.ts:300`以降、`client/src/stores/controlQueue.ts:316`以降 | HumanReviewActionのselectedOptionId、現在review確認、保存後再読。対象はtheme_selection等の切り抜きreview。Digest候補へ有効な正規review/変更経路なし |
| 採否保存後の実行 | `backend/src/routes/control.ts:887`以降 | approve/request-changesはstartDryRunRunnerを呼ぶ。閲覧や選択保存だけに流用すると後続開始を伴うため、現在の経路は流用しない |
| Digestの候補採用 | `runner/src/digest-plan-preparation-v001.ts:378`、`evals/clip_composition/candidate_selection_validation_v001.mts:143` | 検査済みAI resultの不透明tokenからmachine-adoptionを決定的に作る。人間selected IDを入力する既存経路なし。AI result/validationを書換えて人間選択を擬装しない |
| 保持本文の準備 | 同prepare `:387`、`runner/src/digest-plan-consumption-v001.ts:90`以降 | 保持判断はその時に採用された候補だけを入力とし、保存採否とSHAで結ぶ。不採用候補の保持判断は準備済みとみなせない |
| 現在資料の資格 | `backend/src/domain/digest-ui-review.ts`、shared Digest artifact validator | 現producer/FileRef/本文/元時計/保存字幕準備を再照合。現計画と違う選択を、同じ準備のverified状態で作成前確認へ進めない |

shared `getRequiredControlReviewKind`/`requiredApprovedReviewKindBeforeRequest`にDigestの採否gateはない。Digest plan qualityはhuman-review-pending、execution admissionはpresentation=not-connected / executionPermission=not-approved / humanQuality=pendingを固定している。これらをUI選択だけで変更しない。

`serve_digest_review_v001.py`は保存された3動画/確認文書の読取配信で、今回の候補選択保存経路ではない。読取のみ、制作担当のfile/test/runner/生成契約へ編集0。

## GPT_DECISION｜未適用の最小接続案

以下は必要差分の提案。endpoint/schema/正本変更を確定したものではない。親に、新しい選択保存の意味と、制作側の正式反映手順を確認してから実装許可を返してもらう。

1. **選択記録を処理開始から分ける。** 現在のDigest依頼、表示資料fingerprint、計画/実行入力/候補集合のbinding、本人が選んだ既存candidate IDを、明示操作で記録する。この記録は本人の内容選択であり、費用・製造・品質採用の許可にしない。既存AI採否/正式plan/admissionは上書きしない。ControlReviewItem/HumanReviewActionへDigestをどう位置付けるかは新しい意味になるため、今回勝手にkindを増やさない。
2. **変更後資料への束縛を必須にする。** 現AI採用と同じ選択であっても、必要な本人確認と製造許可を補作しない。異なる選択は旧資料を保持したまま「変更後の準備が必要」と表示し、作成前確認のverified状態を引き継がない。既存の保持resultがない候補では、元本文/時計/品質条件を維持した新しい正式準備が必要。自動AI呼出し・全候補製造・課金は0にする。
3. **制作側で新しい計画版を作り、UIは再読する。** 既存source/STT/candidate保存を使える範囲と、採否/保持/consumption/字幕準備の再束縛方法は制作担当の正規変更手順として決める。旧正式成果を直接上書きせず、新版のproducer/FileRefと本人選択の一致が確認できた時だけ、作成前確認へ進める。UI担当はwriter/job/permitを変更しない。

消費側の変更候補は、sharedのUI確認/選択入力型、backendの選択保存domain/storeとroute、既存UI確認資料reader、client API/store/候補dialog・案内と各関連test。制作側は別担当所有のprepare/consumption/rebinding境界。**正本path数や上限、新承認contractの設置をここで仮置きしない。**

Digestは複数候補を元順でまとめる計画であり、現在のclipの単一selectedOptionIdと同じ意味とは限らない。「他候補を採用」が一候補への全体置換か、現構成内の選択集合変更かは、現契約から独立して決められない。本人の確定UIを再採否する問い合わせではなく、親がB案と制作意図に沿って接続の意味を明文化する必要がある。

推薦は、候補集合の保存順やUIが推測した重みから作らない。現AI採否のadopted集合は人間品質未採用の保存判断として区別する。

## 接続後の具体的な検査条件

| 人工ケース | 必須結果 |
| --- | --- |
| 候補を開く、別案閲覧、閉じる、Escape、戻る、再表示 | current採否/正式plan/費用/producer/state byte不変。POST/AI/job/製造0 |
| 明示選択の確認前に取消 | 選択記録0、元の採用表示を維持。局所閲覧中のIDを保存しない |
| 現candidate IDと現版の明示選択・連打 | 当該選択だけ一度記録。server state排他の内側でsnapshot/FileRef/SHA/指紋/会員IDを再読照合。二重作用0、処理開始0 |
| 古い表示、同ID異素材、候補/plan/manifest差替え、GETとPOST間の版変更 | 409/拒否、記録/実行0。新しい版への自動再送0、再確認要求 |
| 未準備候補を採用 | 選択の保存と準備状態を分離し、旧準備を変更後のverified資料として使用しない。元本文・保持結果・時計を推測しない |
| 新計画/準備が正式に保存された後、再読/再表示 | 選択と新版binding一致のみ資格可。旧動画・旧作成前確認・旧費用確認の混入0 |
| 同版で選択を戻す / 新依頼 / 失敗から戻る | 過去記録は保持、現版だけ表示。未接続製造/品質は未確認表示を維持 |

## 実施検査・証拠・cleanup

既存再利用部分の人工unit `node --test client/test/guided-workflow.test.mjs` は**20/20合格、exit0**。[原出力](candidate-adoption-evidence/existing-client-unit-v001.txt)。現在版/資料/producerの確認、保存と承認の分離、連打、旧結果/他依頼拒否、Digestの準備資格と完成検査を区別する既存assertionを維持。これを新しいDigest選択保存の合格とはしない。製品source/type/build入力を変えていないため既存合格済みtype/buildは反復しない。

読取対象のbyte/SHAとsource差分0を[境界証拠](candidate-adoption-evidence/source-boundary-v001.json)に保存。独自test/helper修正0、設営修正累積8回/一般枠5回を維持。新たな設営9回目を自己承認しない。明示的な過去GPT停止3回に、今回の採用境界GPT_DECISIONを加えて4回。新contract追補0、費用US$0、実素材/媒体/公開0。

証拠まとめ用の一回のshell scriptは、Nodeの原出力をTAPの`# tests 20`と仮定したassertで終了1。実原出力はspec表示の`ℹ tests 20 / pass 20 / fail 0`であり、unitそのものはexit0。製品/test/helper/期待値の修正や再検証は行わず、raw出力をそのまま保存し、source SHAは別の読取で記録した。[失敗記録](candidate-adoption-evidence/evidence-collection-v001-failed.txt)。この証拠保存処理の失敗を製品test失敗や設営test修正の適用へ読み替えない。

今回のown processは上記unitだけ、exit0。SSD fixture/server/browser/renderer作成0、大容量媒体/cleanup対象0、回収容量0。元素材/正式成果/他担当file/processは触れていない。

Git枠SSDにつき保存操作は未実行。今回の専用report/evidence/work logだけを未保存差分として親へ返し、lease返却後にexplicit pathsで保存する。今回調査終了をNo.68完成/Doneにしない。新しい採用保存の意味と制作側の反映境界の返信待ち。
