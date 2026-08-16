# ZEVO字幕品質v002 依存単位内側観測 追補 v013

- 日付: 2026-08-13
- 親契約: `presentation-zevo-caption-quality-v002-contract-design-20260810-v001.md`
- 完全実装設計: `presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md`
- 累積追補: v002〜v012
- 変更対象: F proof runnerの依存初期化観測、F testの証明、全formal jobの契約来歴
- 通信・費用・正式描画: 0

## 1. 実現性調査と診断

### 1.1 現物の依存集合

F productionの`dynamicDependencies`本体を現物byteから機械抽出した。direct importは20件ではなく19件である。直前に別checkpointで実行するatomic publisher loader一件を加えると、依存初期化周辺のload操作は20件になる。v013が対象にする`dynamicDependencies`の閉集合は次の19件である。

| 順 | 返却key | workspace相対targetPath |
|---:|---|---|
| 1 | `source` | `evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs` |
| 2 | `selection` | `evals/clip_composition/presentation_output_caption_cue_selection_v001.mjs` |
| 3 | `planner` | `evals/clip_composition/presentation_output_page_line_planner_v003.mjs` |
| 4 | `render` | `evals/clip_composition/presentation_output_render_plan_v003.mjs` |
| 5 | `review` | `evals/clip_composition/presentation_zevo_caption_quality_v002_review_ui_v001.mjs` |
| 6 | `renderer` | `evals/clip_composition/render_presentation_v002.mjs` |
| 7 | `style` | `evals/clip_composition/presentation_output_style_resolver_v001.ts` |
| 8 | `plannerV1` | `evals/clip_composition/presentation_output_page_line_planner_v001.mjs` |
| 9 | `plannerV2` | `evals/clip_composition/presentation_output_page_line_planner_v002.mjs` |
| 10 | `renderV1` | `evals/clip_composition/presentation_output_render_plan_v001.mjs` |
| 11 | `renderV2` | `evals/clip_composition/presentation_output_render_plan_v002.mjs` |
| 12 | `timeline` | `evals/clip_composition/presentation_timeline_composition_decision_v001.mjs` |
| 13 | `meaningV2` | `evals/clip_composition/presentation_a_meaning_information_package_v002.mjs` |
| 14 | `sourceSequenceV2` | `evals/clip_composition/presentation_a_source_sequence_v002.mjs` |
| 15 | `semantic` | `evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs` |
| 16 | `finite` | `evals/clip_composition/presentation_output_crop_application_v001.mjs` |
| 17 | `piecewise` | `evals/clip_composition/presentation_output_piecewise_timeline_v002.mjs` |
| 18 | `qc` | `evals/clip_composition/presentation_renderer_qc_v002.mjs` |
| 19 | `fatal` | `evals/clip_composition/presentation_fatal_observation_v002.mjs` |

重複specifierは0件である。返却key、順序、targetPathはこの表を唯一の正本とし、記憶から補わない。

### 1.2 読み取り診断

物理`.mjs` importerを固定Node・固定TSX絶対pathで一回起動し、§1.1を同順で一件ずつimportした。19/19が成功し、errno観測は0件だった。fixture、正式output、stagingは使用していない。

診断record: `presentation-zevo-caption-quality-v002-v013-dynamic-dependency-import-diagnosis-20260813-v001.json`

同record SHA-256: `63ed44133755a62e5ae822ea31e77455f4df5fb009376851ac08ea15314f0282`

正式attempt-0003ではZCQ042が合格し、attempt-0004では環境preflight合格下の3検査全てが`dependency-initialization / import-runtime-dependencies`で停止した。attempt間の意図された変更はv012である。個別19件が成功したことと合わせても、formal test process内の複合処理が失敗した原因、3件の同根性、production／設営帰属は確定しない。順序はproductionと同じ、重複は0件という事実だけを記録する。

### 1.3 実装可能性

F production一path内で、§1.1の19行をfreeze済みprivate tableへ一度だけ置き、各行に返却key、workspace相対targetPath、既存dynamic importを持たせられる。loaderは同じ順で一回ずつ実行し、import直前に現在targetPathをv012の返却観測へ設定する。新export、test専用分岐、別module、path追加、保存成果物変更は不要である。

## 2. 依存単位の観測契約

### 2.1 固定順の順次import

`dynamicDependencies`は§1.1の19件を1から19の順で一件ずつawaitする。並列化、順序変更、重複import、retry、fallback、job・環境による選択を禁止する。全件成功時の返却objectは従来と同じ19 key・同じmodule namespace参照とする。

各import直前に、v012の現在観測を次へ置く。

- `checkpoint`: `dependency-initialization`
- `operation`: `import-runtime-dependencies`
- `targetPath`: §1.1の現在行にあるworkspace相対path。`null`禁止
- `osCode`: import開始時は`null`。失敗例外にv012のerrno閉語彙がある場合だけ当該値へ写す

一件が失敗した場合は後続をimportせず、現在行のtargetPathを保持したままv012の外側fatalへ返す。checkpointとoperationの語彙追加は0件である。

### 2.2 v012不変条件

- 観測は返却envelopeだけで運び、productionから診断fileを書かない。
- staging取得前のfilesystem書込は0件を維持する。
- 外側status、stage、primaryCode、終了codeを変えない。
- `rejection-report-v001.json`、`fatal-observation-v001.json`、`completion-report-v001.json`のschema、key、byteへ観測を混ぜない。
- 内外envelope、innerObservation、依存tableのrowをfreezeし、同一入力・同一失敗の観測を決定的にする。
- 生message、stack、生stderr、本文、secret、絶対path、workspace外pathを返却・保存しない。
- osCodeはv012の閉語彙にあるerrno名だけを許し、それ以外は`null`とする。
- S/A/L runnerへ同型拡張を行わない。

## 3. 実装と検査

### 3.1 F production

現行19個のimport文を§1.1のprivate tableへ移し、同tableを唯一の依存一覧とする。`dynamicDependencies`は`setActiveDependencyTarget`一引数を必須にし、各rowのloader呼出し直前にrowのtargetPathを渡す。execute入口はそのcallbackでv012の現在観測だけを更新する。module namespaceの組立て、後段consumer、import回数、返却keyを変えない。

### 3.2 F test

ZCQ042は次を検査する。

1. v013文書byteから§1.1の19行を抽出し、production private tableのkey・path・順序と19/19一致する。
2. tableの重複key・重複pathが0件である。
3. `dynamicDependencies`が各loader直前に同rowのtargetPathを観測callbackへ渡し、全件成功時に同keyへnamespaceを一件ずつ格納する配線を持つ。
4. v012のcreate-staging-root実発火、freeze、passed null、保存report schema不変、TAP安全表示を維持する。
5. 新正式attemptで依存import fatalが再現した場合は、TAPのtargetPathが§1.1の一件へ必ず一致する。再現しない場合はF 3/3の通常合否を用いる。

検査専用import選択、故障用path、watcher、polling、timer、並行差替えは作らない。

## 4. approved contract binding

本書を全formal jobへ一件加える。roleは`caption-quality-dependency-unit-observation-addendum`、pathは本書path、SHAは本書の実測値を使う。role狭義昇順を維持する。

| job | v012 | v013 | exact構成 |
|---|---:|---:|---|
| source | 11 | 12 | parent、complete design、v002、v004、v006、v007、v008、v009、v010、v011、v012、本書 |
| B5 | 11 | 12 | parent、complete design、v002、v004、v006、v007、v008、v009、v010、v011、v012、本書 |
| B6 | 12 | 13 | parent、complete design、v002、v004、v005、v006、v007、v008、v009、v010、v011、v012、本書 |
| selection | 13 | 14 | parent、complete design、v002、v003、v004、v005、v006、v007、v008、v009、v010、v011、v012、本書 |
| proof | 13 | 14 | parent、complete design、v002、v003、v004、v005、v006、v007、v008、v009、v010、v011、v012、本書 |

implementation binding source/B5/B6/selection/proof=36/11/19/41/51、path 17、code 49、検査ID 46、proof総数489、owner件数は増減0とする。ZCQ044 35枝の証明内容を変更しない。

## 5. proof exact置換

次の7件だけを一対一置換し、表外proofを失効しない。

| 失効ID | 置換ID |
|---|---|
| `V12-ZCQ001-01` | `V13-ZCQ001-01` |
| `V12-ZCQ007-01` | `V13-ZCQ007-01` |
| `V12-ZCQ018-01` | `V13-ZCQ018-01` |
| `V12-ZCQ018-02` | `V13-ZCQ018-02` |
| `V12-ZCQ027-01` | `V13-ZCQ027-01` |
| `V12-ZCQ042-01` | `V13-ZCQ042-01` |
| `V12-ZCQ042-02` | `V13-ZCQ042-02` |

期待集合はexact `(v012適用後489件 − 上記7件) ∪ §6の7件`とする。期待、test source宣言、TAP observed、TAP passedを489件へexact一致させる。

## 6. V13-PROOF-ITEMS-BEGIN

- V13-ZCQ001-01 | source implementation 36件とapproved contract 12件のexact role/path/SHA集合を検査し、本書を含むsource構成へ一致する
- V13-ZCQ007-01 | B5/B6 implementation 11/19件を維持し、approved contractが本書を含む12/13件へexact一致する
- V13-ZCQ018-01 | selection implementation 41件とapproved contract 14件のexact role/path/SHA集合を前読・import後・公開直前三時点で実再読する
- V13-ZCQ018-02 | selection approved contract 14件の不足・余分・本書SHA不一致をdynamic import前のjob-read/CUE_SELECTION_JOB_INVALIDで拒否する
- V13-ZCQ027-01 | selection approved contract 14件とatomic helper 3 implementation bindingを公開直前まで照合する
- V13-ZCQ042-01 | proof implementation 51件とapproved contract 14件のexact role/path/SHA集合を前読・import後・公開直前三時点で実再読する
- V13-ZCQ042-02 | v012の返却・freeze・保存schema・TAP安全表示を維持し、§1.1の19依存がproduction private tableのkey/path/順序へexact一致し、各import直前に現在rowの非null targetPathを同観測へ渡すことを検査する

## 7. V13-PROOF-ITEMS-END

## 8. 完全一致監査と停止条件

| kawafmm裁定 | 本書 | 判定 |
|---|---|---|
| 現物依存を物理`.mjs` importerで一件ずつ診断し、安全fieldだけを版付き保存 | §1.1〜1.2 | closed。現物direct 19件、直前publisherを加え20操作 |
| 依存一件ずつ順次importし、失敗targetPathを必須化 | §1.1・§2〜§3 | closed |
| v012の返却限定・staging前書込0・保存schema不変・freeze・決定性を維持 | §2.2〜§3 | closed |
| contract 12/12/13/14/14、proof 489、他件数不変 | §4〜§6 | closed |

新たな契約判断、path追加、保存schema変更、code・検査ID・proof・owner増減は0件である。診断時点では原因帰属未確定のため、v013実装後のF新正式attemptで実観測する。

新attempt不合格時は同attemptで修正しない。targetPathを得ても帰属不能、契約改訂・path追加・保存schema変更が必要、実行環境起因、検査設営起因のいずれかなら裁定5へ従い停止する。検査設営起因なら修正案を出さず、F/U fixture製造独立工程化の論点を添える。

API通信、countTokens、generateContent、費用、正式描画、stable tagを行わない。
