# 縦型正式経路 renderer binding 失敗所有権補遺 v001

## 1. 結論

縦型正式rendererが解決する入力15件とjob実装29件について、どの不一致をどの違反code、failure stage、variant、metricsへ帰属するかを一意に固定する。

- 非crop入力14件のbinding不一致を新規`VERTICAL_RENDER_INPUT_BINDING_MISMATCH`が所有する。
- `cropDecision`は既存の`VERTICAL_LAYOUT_DECISION_INVALID`と`VERTICAL_LAYOUT_INPUT_HASH_MISMATCH`が所有する。
- `screen-layout`以外のjob実装28件のbinding不一致を新規`VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH`が所有する。
- `screen-layout`は既存の`VERTICAL_LAYOUT_IMPLEMENTATION_HASH_MISMATCH`が所有する。
- jobとrenderer trustが二重所有する5 pathは、job側照合を先に完了し、通過後だけtrust側照合へ進む。
- 新規違反codeは2件、検査IDは2件だけ追加する。全体は34 codeから36 code、90検査から92検査になる。

これは失敗所有権の不足を閉じる補遺である。API呼出し、正式job生成、renderer実装、動画生成、正式成果物公開は行わない。

## 2. 正本と適用範囲

親設計:

- path: `evals/clip_composition/reports/presentation/presentation-vertical-formal-path-contract-design-20260729-v001.md`
- SHA-256: `db62f752ce19c5a727de9890898885a4e1a68b65ed500da5842de34b12cd6e69`

承認済み費用補遺:

- path: `evals/clip_composition/reports/presentation/presentation-vertical-formal-path-cost-spending-cap-amendment-20260729-v001.md`
- SHA-256: `d761d1ab40b2de97df01b3d92110773a19aefa643a44aa6b3b4f46a3dc79fefa`

本補遺は親設計の次の箇所だけを具体化する。

1. §8.1と§8.4が列挙する入力15件、job実装29件、二重所有5 pathの失敗所有権
2. §10の新規code一覧
3. §11の検査数、所有検査表、V05、V06、V16の期待値、およびV20、V21
4. §13.3のvertical render failureにおける3 binding summary
5. §14のcode数と検査数

上記以外の親設計と費用補遺は変更しない。競合する記述がある場合だけ本補遺を優先し、競合しない固定値、schema、path、順序、処理、停止条件は親設計をそのまま使う。既存形式を受理する後方互換分岐は作らない。

## 3. 追加する違反code

既存1〜34の順序と意味は変更せず、末尾へ次の2件を追加する。

| code順 | code | 所有する不一致 |
|---:|---|---|
| 35 | `VERTICAL_RENDER_INPUT_BINDING_MISMATCH` | 非crop入力14件の必須key、path、file SHA、canonical SHA、媒体binding、安定再読、固定集合、または入力間参照の不一致 |
| 36 | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | `screen-layout`以外のjob実装28件について、固定role、path、順序、file SHA、現物、静的local依存閉包、または開始時と公開直前の安定再読結果の不一致 |

code 35は入力内容の意味違反を横取りしない。crop decisionの外形・viewport不正、crop decision実体の差し替え、字幕本文、crop出力、frame、音声、QCには親設計の既存codeを使う。

code 36はrenderer trust側の来歴不一致や7 toolの不一致を横取りしない。job実装照合を通過した後に判明したtrust側の不一致は既存`VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH`が所有する。

## 4. 共通のstage、variant、metrics

親設計のstage、variant、metrics keyを増やさず、次の3行を完全表として使う。

| stage | variant | 許可するcode | `metrics`のexact key |
|---|---|---|---|
| `input-binding` | `input-binding-summary` | `VERTICAL_LAYOUT_DECISION_INVALID / VERTICAL_LAYOUT_INPUT_HASH_MISMATCH / VERTICAL_RENDER_INPUT_BINDING_MISMATCH` | `verifiedInputBindingCount / requiredInputBindingCount` |
| `implementation-binding` | `implementation-binding-summary` | `VERTICAL_LAYOUT_IMPLEMENTATION_HASH_MISMATCH / VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | `verifiedImplementationBindingCount / requiredImplementationBindingCount` |
| `runtime-binding` | `runtime-binding-summary` | `VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH` | `verifiedRuntimeToolCount / requiredRuntimeToolCount` |

各countは0以上のsafe integerとする。required値は次で固定する。

- `requiredInputBindingCount = 15`
- `requiredImplementationBindingCount = 29`
- `requiredRuntimeToolCount = 7`

verified値は合格した必須項目だけを数える。未読、読取失敗、上流不一致により検査不能、期待値を推測した項目は数えない。余分な項目はrequiredにもverifiedにも加えない。

入力について、`reviewRenderRequest`が不一致なら下流14件をそのrequestから真実に解決できないため、単独負例は`0 / 15`とする。`reviewRenderRequest`が合格し、残る1件だけが不一致なら`14 / 15`とする。全必須15件が合格して余分なkeyだけがある場合は`15 / 15`のままcode 35で拒否する。

実装について、各固定slotはrole、path、file SHA、現物SHA、固定順、必要な静的到達性が全て一致した場合だけ1件と数える。1 slotだけが不一致なら`28 / 29`、全29 slotが合格して余分なbindingまたは未登録local importだけがある場合は`29 / 29`のまま該当codeで拒否する。

runtime summaryの2 countは7 toolだけを数える。job実装と一致済みの二重所有pathについてtrustだけが不一致で、7 toolが全て合格している場合は`7 / 7`とする。toolも同じpassで不一致なら、合格したtool数を`0〜6 / 7`で記録する。不一致の二重所有pathとtoolは`violations[].relatedPaths`の和集合で完全に特定する。二重所有pathをtool数へ混ぜず、独自の合算値を作らない。

## 5. 入力15件の完全所有表

全行のstageは`input-binding`、variantは`input-binding-summary`、metricsは`verifiedInputBindingCount / requiredInputBindingCount`である。

「binding不一致」は、対象行の必須key、path、file SHA、canonical SHA、媒体fileにおけるcanonical SHA省略規則、安定再読、または同じ上流参照との一致に失敗した状態を指す。行が正しく束縛された後の意味検査は親設計の専用codeへ進む。

| ID | `inputBindings` key | binding不一致の所有code | 単独負例のmetrics | 補足 |
|---|---|---|---|---|
| I01 | `reviewRenderRequest` | `VERTICAL_RENDER_INPUT_BINDING_MISMATCH` | `0 / 15` | 唯一の上流入口。失敗後に下流値を推測しない |
| I02 | `baseMedia` | `VERTICAL_RENDER_INPUT_BINDING_MISMATCH` | `14 / 15` | 媒体fileなのでcanonical SHAを持たせない |
| I03 | `baseMediaGenerationManifest` | `VERTICAL_RENDER_INPUT_BINDING_MISMATCH` | `14 / 15` | requestから解決した同一実体だけを許す |
| I04 | `baseMediaTimeline` | `VERTICAL_RENDER_INPUT_BINDING_MISMATCH` | `14 / 15` | requestと生成manifestが指すtimelineと一致させる |
| I05 | `baseMediaValidationReport` | `VERTICAL_RENDER_INPUT_BINDING_MISMATCH` | `14 / 15` | 基礎映像bindingとの参照一致を含む |
| I06 | `displayPlan` | `VERTICAL_RENDER_INPUT_BINDING_MISMATCH` | `14 / 15` | review requestが束縛した表示計画だけを許す |
| I07 | `instructionBundle` | `VERTICAL_RENDER_INPUT_BINDING_MISMATCH` | `14 / 15` | review requestと表示計画が指す同一bundleだけを許す |
| I08 | `captionCheck` | `VERTICAL_RENDER_INPUT_BINDING_MISMATCH` | `14 / 15` | instruction/display計画との参照一致を含む |
| I09 | `layoutPreflight` | `VERTICAL_RENDER_INPUT_BINDING_MISMATCH` | `14 / 15` | display plan bindingとの参照一致を含む |
| I10 | `cropDecision` | `VERTICAL_LAYOUT_INPUT_HASH_MISMATCH` | `14 / 15` | path、file SHA、canonical SHA、安定再読の不一致 |
| I11 | `presetRegistry` | `VERTICAL_RENDER_INPUT_BINDING_MISMATCH` | `14 / 15` | trustと同じ正式台帳実体を指す |
| I12 | `presetValidationIndex` | `VERTICAL_RENDER_INPUT_BINDING_MISMATCH` | `14 / 15` | preset registryの公開記録と一致させる |
| I13 | `materialValidationIndex` | `VERTICAL_RENDER_INPUT_BINDING_MISMATCH` | `14 / 15` | 認定素材の公開記録と一致させる |
| I14 | `trustedRegistryBindings` | `VERTICAL_RENDER_INPUT_BINDING_MISMATCH` | `14 / 15` | 台帳とtrustの接続記録に一致させる |
| I15 | `rendererTrust` | `VERTICAL_RENDER_INPUT_BINDING_MISMATCH` | `14 / 15` | review requestと台帳側commit recordが指すtrust実体に一致させる |

`inputBindings` objectの必須key欠落は当該行の所有codeを使うため、`cropDecision`だけはcode 13、他の14件はcode 35になる。余分なkey、重複表現、許可しない順序、または必須行に限定できない集合不一致はcode 35が所有する。認識できた必須行は上記規則で数える。crop行と非crop行が同じpassで不一致なら、code 13と35を§10順で並べ、各`relatedPaths`を重複させない。

`cropDecision`のbindingが合格した後、その実体のschema、status、型ID、`selectedPlan.screenLayoutId`、viewport key、有限性、範囲、左右上下関係が不正なら既存`VERTICAL_LAYOUT_DECISION_INVALID`を使う。この場合はbinding自体が15件とも合格しているためmetricsは`15 / 15`である。crop decisionのbinding差し替えと内容不正が同時にある場合は、先行するbinding照合だけを報告し、code 13とする。未信頼実体を内容検査してcode 12へ進めない。

## 6. job実装29件の完全所有表

全行のstageは`implementation-binding`、variantは`implementation-binding-summary`、metricsは`verifiedImplementationBindingCount / requiredImplementationBindingCount`である。「二重」はrenderer trustにも同じrole/path/SHAが存在する5 pathを示す。

| ID | role | 固定path | job側所有code | 二重 |
|---|---|---|---|---|
| M01 | `vertical-review-renderer` | `evals/clip_composition/render_presentation_vertical_review_v001.ts` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | はい |
| M02 | `instruction-contract-v004` | `evals/clip_composition/presentation_instruction_contract_v004.mjs` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | いいえ |
| M03 | `display-pair-v004` | `evals/clip_composition/presentation_caption_display_pair_v004.mjs` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | いいえ |
| M04 | `instruction-contract-v003` | `evals/clip_composition/presentation_instruction_contract_v003.mjs` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | いいえ |
| M05 | `display-pair-v003` | `evals/clip_composition/presentation_caption_display_pair_v003.mjs` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | いいえ |
| M06 | `semantic-source-package-v001` | `evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | いいえ |
| M07 | `semantic-output-v001` | `evals/clip_composition/presentation_caption_semantic_output_v001.mjs` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | いいえ |
| M08 | `segmenter-boundary-v001` | `evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | いいえ |
| M09 | `segmenter-preflight-v001` | `evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | いいえ |
| M10 | `retained-source-atoms-v001` | `evals/clip_composition/presentation_retained_source_atoms_v001.mjs` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | いいえ |
| M11 | `renderer-core` | `evals/clip_composition/render_presentation_v002.mjs` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | はい |
| M12 | `layout-inspector-v001` | `evals/clip_composition/inspect_presentation_render_layout_v001.ts` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | いいえ |
| M13 | `presentation-renderer-entry-v001` | `evals/clip_composition/presentation_renderer_entry_v001.tsx` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | いいえ |
| M14 | `screen-layout` | `runner/src/screen-layout.ts` | `VERTICAL_LAYOUT_IMPLEMENTATION_HASH_MISMATCH` | はい |
| M15 | `shared-package-manifest` | `packages/shared/package.json` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | いいえ |
| M16 | `shared-runtime-index` | `packages/shared/dist/index.js` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | いいえ |
| M17 | `shared-runtime-common` | `packages/shared/dist/common.js` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | いいえ |
| M18 | `shared-runtime-activity` | `packages/shared/dist/activity.js` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | いいえ |
| M19 | `shared-runtime-web-gemini-review` | `packages/shared/dist/web-gemini-review.js` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | いいえ |
| M20 | `telop-remotion` | `runner/src/telop-remotion.ts` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | はい |
| M21 | `renderer-qc` | `evals/clip_composition/presentation_renderer_qc_v002.mjs` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | はい |
| M22 | `caption-contract-v002` | `evals/clip_composition/presentation_caption_contract_v002.mjs` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | いいえ |
| M23 | `caption-contract-v003` | `evals/clip_composition/presentation_caption_contract_v003.mjs` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | いいえ |
| M24 | `instruction-contract-v002` | `evals/clip_composition/presentation_instruction_contract_v002.mjs` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | いいえ |
| M25 | `base-media-timeline-v002` | `evals/clip_composition/presentation_base_media_timeline_v002.mjs` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | いいえ |
| M26 | `renderer-plan-v002` | `evals/clip_composition/presentation_renderer_plan_v002.mjs` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | いいえ |
| M27 | `renderer-text-layout-v001` | `evals/clip_composition/presentation_renderer_text_layout_v001.mjs` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | いいえ |
| M28 | `source-speaker-policy-v001` | `evals/clip_composition/presentation_source_speaker_policy_v001.mjs` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | いいえ |
| M29 | `source-speaker-registry-v001` | `evals/clip_composition/registries/presentation/presentation-source-speaker-non-identity-registry-v001/registry.json` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | いいえ |

M14はrole、path、固定slot、job記録SHA、現物SHA、開始時と公開直前の再読結果を含め、job側で観測する不一致を既存code 14が所有する。M14以外の28行では同じ種類の不一致をcode 36が所有する。

jobの29件配列そのものの欠落、余分、重複、順序違反、exact 3 key違反はcode 36が所有する。ただしM14 slotとして識別できる行だけの不一致はcode 14を使う。複数行が同時に不一致でcode 14と36の両方に該当する場合は、同じ`implementation-binding-summary`の一回の照合で両codeを§10順に並べ、各`relatedPaths`を重複させない。

2 rootから導出する静的local依存閉包について、登録29件の必須実体が1件だけ到達不能ならそのslotを未合格として数える。全29件が合格しているが未登録local import、余分な直接local path、許可されないjob→trust edge、逆向きedge、dynamic import、`require`、`import.meta`由来の未登録読取がある場合は`29 / 29`のcode 36として、未登録pathを`relatedPaths`へ入れる。

## 7. 二重所有5 pathの優先順位

開始時と原子的公開直前の各照合passで、次の順序を固定する。

1. job自身を安定再読し、`jobBinding`を真実に構築できることを確認する。
2. job実装29件のrole、path、順序、job SHA、現物SHA、local依存閉包を照合する。
3. 手順2が全件合格した場合だけ、二重所有5 pathについてjob、現物、renderer trustのrole、path、SHAを照合する。
4. 手順3を通過した後、残るtrust依存、font、license、runtime toolを照合する。

| ID | 二重所有role | job側不一致 | job通過後のtrust側だけの不一致 | trust側単独負例のmetrics |
|---|---|---|---|---|
| O01 | `vertical-review-renderer` | code 36 / `implementation-binding` | code 20 / `runtime-binding` | `7 / 7` |
| O02 | `renderer-core` | code 36 / `implementation-binding` | code 20 / `runtime-binding` | `7 / 7` |
| O03 | `renderer-qc` | code 36 / `implementation-binding` | code 20 / `runtime-binding` | `7 / 7` |
| O04 | `screen-layout` | code 14 / `implementation-binding` | code 20 / `runtime-binding` | `7 / 7` |
| O05 | `telop-remotion` | code 36 / `implementation-binding` | code 20 / `runtime-binding` | `7 / 7` |

ここでcode 20は`VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH`を指す。手順2で不一致を検出したpathは手順3へ渡さない。同じ原因をjob側codeとtrust側codeへ二重発火させない。

job、現物、trustの三者でjobと現物が一致しtrustだけが違う場合だけtrust側所有になる。現物がjobから変わった場合は、trustの値に偶然一致していてもjob側所有になる。開始時には一致した現物が公開直前に変わり、変更後SHAを安定して取得できた場合もjob側所有になる。

## 8. 検査済み拒否と共通fatal

### 8.1 検査済み拒否

次の全条件を満たす既知の不一致は、vertical render failureをstdoutへ1件返して終了1にする。

- 正式jobをstrict decodeでき、開始時の`jobBinding`を真実に構築できる。
- 対象summaryの一回の照合passを完了し、requiredとverifiedを推測なしで確定できる。
- 不一致pathを辞書順uniqueの`relatedPaths`へ完全に入れられる。
- code、stage、variant、exact metricsを本補遺の表から一意に決められる。
- failure stdoutを契約どおり生成できる。

検査済み拒否では正式動画、overlay、render plan、application results、manifest、QC、予約failure fileを0件とする。公開前work内の生成物を正式成果物として扱わない。

開始時または公開直前に、束縛済み入力や実装現物のSHAが期待値と違うことを安定して実測できた場合は終了1である。既知のbinding不一致を共通fatalへ逃がさない。

### 8.2 共通fatal

次のいずれかではrejected failureを捏造せず、`diagnosticCode = VERTICAL_RENDER_V001_RUNNER_FATAL`の共通fatal stdoutと終了2を使う。

- 正式jobをstrict decodeできず、またはjob自身が安定再読中に変化し、`jobBinding`を真実に構築できない。
- 読取不能、SHA計算不能、子process観測不能等により、一回のsummary passとexact metricsを完了できない。
- 取得できなかった値を0、空文字、null、以前の値、推測値で埋めなければfailureを作れない。
- failure stdoutまたは成功成果物のdurable・原子的な生成や公開を完了できない。
- runner自身の観測契約が崩れ、既知の検査済み不一致として安全に記録できない。

共通fatalは違反code、stage、variant、部分metricsを持たない。処理失敗そのものをcode 35または36へ誤帰属しない。

## 9. 検査契約の差分

新規検査はV20とV21の2 IDだけである。1 IDに複数fixtureを持たせてよいが、各IDの期待codeは1件に固定する。

| ID | 検査する事実 | 期待status | 期待code | stage / variant |
|---|---|---|---|---|
| V20 | 非crop入力14件を一件ずつ差し替え、欠落・余分key・媒体canonical SHA禁止・cross-binding不一致も表駆動で検査する。`reviewRenderRequest`単独不一致は`0 / 15`、他の単独不一致は`14 / 15`、全15件合格かつ余分keyだけなら`15 / 15`を観測する | `rejected` | `VERTICAL_RENDER_INPUT_BINDING_MISMATCH` | `input-binding / input-binding-summary` |
| V21 | `screen-layout`以外のjob実装28件を一件ずつ差し替え、role/path/順序/SHA、未登録local import、余分・不足binding、許可edge違反、開始時と公開直前の差し替えを表駆動で検査する。単独slot不一致は`28 / 29`、全29件合格かつ余分なlocal pathだけなら`29 / 29`を観測する | `rejected` | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | `implementation-binding / implementation-binding-summary` |

既存検査は削除しない。次の期待値を明確化する。

- V02〜V04は、bindingが15件とも合格したcrop decision内容違反としてcode 12、`input-binding / input-binding-summary`、`15 / 15`を観測する。
- V05はcrop decision bindingの差し替えとしてcode 13、`input-binding / input-binding-summary`、`14 / 15`を観測する。
- V06はM14の差し替えとしてcode 14、`implementation-binding / implementation-binding-summary`、`28 / 29`を観測する。
- V14は本補遺の終了0/1/2、codeからstage/variantへの写像、exact metrics、rejected/fatal境界を含めて検査する。
- V16は7 tool、trust依存15件、font、license、およびjob照合通過後の二重所有5 pathのtrust側不一致をcode 20で観測する。job実装29件の所有検査はV06とV21へ分離する。
- V19のworkspace symlink、package exports、runtime 4 fileがjob実装側で不一致ならcode 36、job照合後のtrust側だけで不一致ならcode 20とする。

親設計§11のcode所有表は、既存1〜34をbyte同じ対応のまま維持し、末尾へ次を加える。

| code順 | 所有検査 |
|---:|---|
| 35 | V20 |
| 36 | V21 |

exportした新規code集合36件と検査で実測発火した新規code集合を完全一致させる。92検査全てについて、ID、期待status、期待code、実測codeの一件表を保存する。V20の全fixtureはcode 35、V21の全fixtureはcode 36だけを期待し、1検査IDへ複数codeを詰め込まない。

## 10. 完全性

| 対象 | 親設計 | 本補遺適用後 | 未所有 |
|---|---:|---:|---:|
| renderer入力binding | crop中心 | 15 / 15 | 0 |
| job実装binding | `screen-layout`中心 | 29 / 29 | 0 |
| job/trust二重所有path | 方針のみ | 5 / 5で優先順位固定 | 0 |
| 新規違反code | 34 | 36 | 0 |
| 新規検査ID | 90 | 92 | 0 |

追加する実装対象はcode literal 2件、既存failure mapping 2行への許可code追加、表駆動fixture 2 ID、および全発火表2行である。failureのtop-level schema、stage集合、variant名、metrics key、正式成果物名、公開規則は増やさない。

## 11. 本来の目的との照合

本来の目的は、承認後の型付き命令とfile参照から、縦型正式rendererが同じ入力・同じ実装・同じ認定画素経路を使ったと人間が検証できる骨格を作ることである。本補遺は、失敗時にも「何を照合し、どの層が拒否したか」を曖昧にしないための契約であり、完成UIや巨大な解析結果を追加しない。

独自の係数、重み、閾値、推定countは使っていない。15、29、5、7は親設計の列挙件数であり、34から36、90から92は本補遺の明示追加数から直接導出した値である。

## 12. 人間作業

この補遺を保存するための追加人間作業は0件である。字幕の見た目、134px、crop、費用上限の再認定も求めない。

次の実装作業では、まずV20とV21の表駆動負例を追加し、次にrendererのbinding照合を実装して、36 code全発火と92検査の一件表を確認する。
