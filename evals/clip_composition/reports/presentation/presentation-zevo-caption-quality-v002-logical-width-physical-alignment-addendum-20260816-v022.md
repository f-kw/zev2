# ZEVO字幕品質v002 論理幅・物理page graph整合 追補v022 設計v001

- 作成日: 2026-08-16
- 状態: 設計提示・未承認・未実装
- 目的: providerへ提示する一行上限とZEVOの正式物理page graphを同じ値へ揃え、AIが提示規則に適合した一行を物理配置だけが拒否する不整合を解消する
- 親正本: ZEVO字幕品質v002契約設計、完全実装設計、累積追補v002〜v021
- 診断正本: `evals/clip_composition/reports/presentation/diagnostics/presentation-zevo-caption-quality-v002-v021-physical-width-diagnosis-20260816-v001/diagnostic-record-v001.json`

## 1. 実現性調査

### 1.1 現物照合

| 対象 | 開始時SHA-256 | 現物位置 | 照合結果 |
|---|---|---|---|
| source package正式入口 | `cd63dc1b0313b296785f3c914e8b479667ee64b2943891c8d22432622f49295f` | `presentation_output_caption_cue_source_package_v001.mjs` 301〜328、338〜365、610〜639、707〜725行 | 最大論理幅は正整数のjob値であり、固定36ではない。job上限、3件のresolved style、promptInputの値をexact一致させる実枝がある |
| style解決入口 | `e63e4b4cf47d94d763333e13513570abe2dbac418e5ac5b396e1295b22956403` | `presentation_output_style_resolver_v001.ts` 300〜315、338〜370、540〜568行 | 横型style入力の最大論理幅をresolved styleへ値不変で写し、preset capability 36以下を受理する。35は現行schemaと能力範囲で表現可能 |
| selection正式入口 | `fbe7152f1a26837af51f26a4c673b2cddbc889370988b6e3c85dedb50d741cd6` | `presentation_output_caption_cue_selection_v001.mjs` 1492〜1539行 | source packageの上限を論理幅検査へ使い、同じcase contextから物理page graphを呼ぶ。別の幅値を組み立てる枝はない |
| 物理page graph正本 | `ebafe022060aaf9b98d9f7f27ae60af5e139295e0390ccca4db5caa99f590879` | `presentation_output_page_line_planner_v001.mjs` 323〜349、385〜441、448〜485行 | resolved style上限以下の行候補だけを作り、既存の表示検査へ一件ずつ渡す。provider側とplanner側を同じ35へできる |
| 表示検査 | `416a81b54b18be6a6ccdd5906d3a3730bd0455edfe4be7002c9c6c4ccf2f8843` | `inspect_presentation_preset_layout.ts` 47〜91行 | 実在する行矩形をcanvas safe areaへ照合し、超過を`LINE_BOX_OUTSIDE_SAFE_AREA`として拒否する |
| Node時の文字幅正本 | `6fe78a6b478d61a169ec724e6c9336fdfcbf00cfa7ddee7cbbb5fbc19d87478a` | `runner/src/telop/text-metrics.ts` 8〜14、16〜41、44〜62行 | `document`不存在時は論理幅×font size×0.5を使う。今回の正式selectionはこの既存fallbackを使用した |
| 行矩形製造 | `5c32103a6f8faaa3ea1d30bb4624f0ca092385c8b77446aa5f51e3e3a0583412` | `runner/src/telop/telop-render-model.ts` 147〜228、250〜299行 | font 96px、縁・光彩、padding、wrapperを既存正本で製造する。別計算を追加する必要はない |
| 横型preset | `8e9b0a039c8a4c9edf2c66b1df343c1d892d4688ebc4886a9af322bd44a6e5a8` | `normal-landscape-preset-registry-v001/preset-registry.json` 62〜91行 | readable-popは96px、縁8px、光彩12px、能力上限36、最大2行を持つ。job入力35は能力上限以下で受理できる |
| v021 source job | `14c76e9fd3b7121d1ad0b843dfbc0e330e28b7df64027a53c2f72379509ca0a7` | `a-v002-caption-quality-first-api-source-20260816-v002.json` | job上限36と3件の横型style上限36が同じ正式byte内に実在する。4値を35へ揃えた新版jobを表現できる |
| v021 source package | `505e0af866f9c9014ac134723fa80b54281860e834fa706ade6a5894f4d4bf4d` | `a-v002-caption-quality-first-api-source-20260816-v002/source-package-v001.json` | 3 caption、253 boundary、本文、復元表、上限36を保持する。履歴証拠として変更しない |
| v021 selection report | `1bfbd457842e2451d5b5b1ef20a8c185d2f02d68dd4f09f87ca05638b0379b7e` | `a-v002-caption-quality-first-api-selection-20260816-v001-attempt-0001/selection-report-v001.json` | 正式selectionは物理配置一件だけを拒否した。selection成果物は公開されていない |

以上を現物照合済みとする。必要な入口、値供給、検証時点、consumer、出力先は全て実在する。新しい幅計算、文字種係数、物理計測器、schema、provider向け追加fieldを作らずに成立する。

### 1.2 actual値配線の逆引き

| actual値 | 供給成果物 | 検証時点 | exact引数 | consumer | 転記先 |
|---|---|---|---|---|---|
| 最大論理幅35 | 新版source jobの`styleLimits` | source job decode/value validate | source builderのjob入力 | source package製造 | `promptInput.styleLimits.maxLogicalWidthPerLine` |
| 最大論理幅35×3件 | 同じ新版source jobの各`horizontalStyleInput.captionLayoutPolicy` | style解決時 | style resolverの既存style入力 | 3件のstyle解決 | `reconstructionMap.caseContexts[].resolvedStyle.maxLogicalWidthPerLine` |
| provider可視上限35 | 新版source packageのpromptInput | B5開始時・B6公開直前再読 | 既存request builderのpromptInput | countTokens / generateContent | user content内の正式JSON |
| ローカル論理上限35 | 同じ新版source package | selection受入 | source package exact値 | selection validator | 各選択行の論理幅検査 |
| 物理候補上限35 | 同じcase contextのresolved style | selection/plannerのcase再読 | `styleResolution.resolvedStyle` | 既存physical page graph | 生成する一行・二行候補集合 |

provider用とZEVO用に別の値を持たせない。jobの共通値一件を、既存の同一性検査を通して両者へ届ける。

### 1.3 逆影響

- 現行productionは正整数かつpreset能力上限以下の任意値を既に扱うため、幅計算・style resolver・selection・planner本体のlogic変更は不要である。
- 新版契約をformal jobへ束縛する固定契約集合の追記は必要であり、source production/testとB5/B6 production/testの4 pathを変更する。
- 新値35の実枝回帰はselection testとpage/line planner testへsubcaseを追加する。検査IDは増やさない。
- 既存source package、v021 raw回答、selection failure、正式成果物、stable tag、preset registryは変更しない。
- source packageのfile SHAが変わるため、B5前の残余リスク受入記録は新版source package SHAを束縛して別版発行する必要がある。旧受入を暗黙流用しない。

## 2. 読み取り診断結果

### 2.1 論理幅

対象cueは`てめぇはしゃぎやがってじゃ報告しない`で、18 code point全てが現行規則の非ASCII幅2である。合計論理幅は36。小書き`ぇ`・`ゃ`・促音`っ`も他の日本語文字と同じ幅2であり、特定文字種だけの差は観測されなかった。

### 2.2 物理page graph

正式selectionと同じNode文脈ではDOM canvasは存在せず、既存正本のestimated widthを使う。

| 項目 | 実測値 |
|---|---:|
| font size | 96px |
| 論理幅1あたり | 48px |
| glyph幅 | 1,728px |
| 縁・光彩の最大stroke extent | 左右20pxずつ、計40px |
| 行矩形 | left 81 / right 1,849 / width 1,768px |
| safe横範囲 | left 80 / right 1,840 / width 1,760px |
| 超過 | right 9px |
| 違反 | `LINE_BOX_OUTSIDE_SAFE_AREA` |

formal Node page graphで許容できる整数上限は、現物値だけから`floor((1760 - 40) / 48) = 35`と導出される。係数や安全率を新設していない。

### 2.3 同一字幕の上限付近比較

同じ第3字幕で、AIが一行選択した論理幅34〜36のcueは対象一件だけであり、その一件が不合格だった。他の上限付近一行cueが通るという対照は存在しない。

### 2.4 帰属と分岐

- 文字種別の幅表差: 観測なし。
- 一律係数差: 観測なし。正式Node計測は現行論理幅と同じ重みを使用する。
- 上限値の差: 観測あり。上限36が縁・光彩の40pxを予約していない。

従ってkawafmm裁定の分岐(a)を採用する。分岐(b)のprovider向け物理到達可能境界集合や、AIを意味cueだけへ縮める分業変更は本工事へ導入しない。

注意: この結論は正式selectionが使うNode page graphに対するものである。browser描画時は既存処理がcanvas font metricsとestimated widthの大きい方を使う。v022はbrowser実測の万能近似を主張せず、描画後QCを従来どおり維持する。

## 3. v022の固定変更

### 3.1 値の変更

新しいsource job一件だけで、次の4箇所を36から35へ同時に変更する。

1. `styleLimits.maxLogicalWidthPerLine`
2. case 1の横型caption layout上限
3. case 2の横型caption layout上限
4. case 3の横型caption layout上限

source packageは既存builderがこれをpromptInput一件とresolved style三件へ転記する。値35をproduction定数へ焼き込まず、同じpresetを使う別jobの値を勝手に変更しない。

### 3.2 不変条件

- schema、key集合、schemaの意味、違反code、status、終了codeを変更しない。
- 3 caption、字幕本文、253 boundary、boundary ID、順序、意味package、時刻復元表を変更しない。
- 文字幅規則`U+0000..U+00FF=1; other Unicode code point=2`を変更しない。
- 最大2行、v021のtaskDescription/system instruction、C1/C2/C4/C6、Tier 1 response schemaを変更しない。
- AIがcue終端と必要な行末を選び、機械がstrict検査する分業を変更しない。
- preset registryの既存byte、能力上限36、font、縁、光彩、safe areaを変更しない。
- 保存済みv021回答を修復・再利用・正式selection化しない。

## 4. path差分

実装path上限19は不変、新規implementation pathは0件とする。変更可能な既存pathは次の6件に限定する。

| path | 役割 | 変更 |
|---|---|---|
| `evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs` | source formal契約集合 | v022のrole/path/SHAを末尾へ一件追加 |
| `evals/clip_composition/presentation_output_caption_cue_source_package_v001.test.mjs` | source回帰 | 契約件数pin、新値35のjob→prompt/resolved style転記、旧36成果物不変をsubcaseで証明 |
| `evals/clip_composition/run_presentation_output_caption_cue_b5_b6_v001.mjs` | B5/B6 formal契約集合 | source/B5/B6の各集合へv022を既定順で一件追加。request意味は変更しない |
| `evals/clip_composition/run_presentation_output_caption_cue_b5_b6_v001.test.mjs` | B5/B6回帰 | 契約件数pin、v022欠落拒否、provider可視上限35のexact転記をsubcaseで証明 |
| `evals/clip_composition/presentation_output_caption_cue_selection_v001.test.mjs` | selection回帰 | v021保存回答を上限35へ当てると当該一行が論理幅で拒否されること、既存正例が不変であることを証明 |
| `evals/clip_composition/presentation_output_page_line_planner_v003.test.mjs` | planner回帰 | resolved style 35で幅36の一行辺が存在せず、既存の二行物理辺・決定的再構築が維持されることを証明 |

本設計書、将来のformal job、source package、残余リスク受入、B5/B6/selection/描画成果物は版付きdata/reportであり、19 implementation path会計へ加えない。

## 5. approved contract binding

本書のroleを`caption-quality-logical-width-physical-alignment-addendum`とし、source package・B5・B6 formal jobの既存集合末尾へ一件追加する。selection/proofのjob自身の契約集合は変更しない。

| formal job | 現行 | v022後 | 構成差 |
|---|---:|---:|---|
| source package | 15 | 16 | 本書を一件追加 |
| B5 | 17 | 18 | 本書を一件追加 |
| B6 | 20 | 21 | 本書を一件追加 |
| selection | 16 | 16 | 不変 |
| proof | 17 | 17 | 不変 |
| F/U fixture manufacture | 17 | 17 | 不変 |

implementation binding 36/11/19/41/51/52、所有code 50件、正式検査ID 48件、proof 523件は増減0とする。契約件数pinと幅値観測だけを同一ID内の新版subcaseへ置換・追加し、期待、test source宣言、TAP observed、TAP passedをexact一致させる。

## 6. 検査一件表

| 検査ID | 新たに証明する内容 | 証明を失わない既存範囲 |
|---|---|---|
| ZCQ001 | source approved contract 16件、v022一件、旧15件の順序・SHA不変 | job schema・loader・import graph・CLI guard |
| ZCQ004 | jobの35一件がpromptInput一件とresolved style三件へexact転記され、caption本文・253 boundary・復元表はv021 byte oracleと一致 | final package predicate全件 |
| ZCQ005 | 35/36混在を既存style不一致codeで拒否し、fallbackしない | input binding・再読・no-replace |
| ZCQ007 | B5 18件・B6 21件、v022欠落を通信前に拒否 | B5/B6正式分離、import順、provider transport |
| ZCQ008 | provider可視promptInputの最大論理幅が新版source packageの35とbyte一致 | 3 caption・本文・253 boundaryのbyte一致 |
| ZCQ025 | 保存済みv021回答の当該幅36一行を上限35で`CUE_LINE_WIDTH_INVALID`へ拒否 | 一行cue非改行・二行cue幅検査 |
| ZCQ026 | 同じstyleから作る物理graphが幅36一行を持たず、production正本だけを使う | physical/timeline projection共有 |
| ZCQ028/ZCQ030 | plannerも同じ35を使い、選択済み正当二行辺を再計画せず保持 | source closure・projection set・選択tuple不変 |
| ZCQ036 | 36を残した旧fixtureや35/36混在をdriftとして拒否 | 旧引数shape・binding drift全件 |

検査ID・proof総数は増やさず、既存ID内subcaseで閉じる。既存正式成果物を期待値へ書き換えない。

## 7. 将来の実装・実走順

本書の承認後も、API通信は別承認があるまで行わない。

1. 本書SHAをDECISIONSへ承認値として記録し、2 production pathと4 test pathを限定修正する。
2. 関連検査を新attemptで実行し、TAP・stderr・終了code・signalを独立保存する。
3. 新版source jobを正式serializerで発行し、4箇所の35、本文・253 boundary不変、契約16件を起動前に照合する。
4. 未使用rootへsource packageを一回製造し、prompt上限35、resolved style三件35、既存意味入力・復元表不変を確認する。
5. 新source package SHAを束縛する残余リスク受入記録を別版で発行する。未確認claim三件、受入scope、US$1.00上限は既承認値から変更しない。kawafmmの明示承認なしに旧受入を流用しない。
6. 新版B5 jobの従属binding閉包表を作り、job専用snapshot directory、authorization、契約18件を確認後、countTokensを最大2回実行する。
7. 支出投影がUS$1.00以内の場合だけ、新版B6 job・未使用root・契約21件でGemini 3.6 Flashへ正式B6を一回、再試行0、raw先行保存で送信する。
8. strict受入と既知6境界非再選択へ合格した場合だけ、selectionを正式公開し、P/R/Fで横型3本、QC、確認ページを作る。
9. v021保存回答の27 cueを比較対照として保持し、新回答のうち当該cue以外の26 cueの選択tuple差を観測表へ記録する。差は自動不合格理由にせず、provider非決定性の観測とする。

## 8. 停止条件

- 値35が§2の現物式から導出できない、またはpreset/font/safe area/縁/光彩の実体SHAが変わっている。
- provider値とresolved style/planner値を分離する実装、別幅計算、係数、安全率、fallbackが必要になる。
- schema、schema意味、字幕本文、253 boundary、文字幅表、preset registry、既存正式成果物、stable tagへ変更が必要になる。
- approved contract件数・順序、proof会計、実装path会計が§4〜6と一致しない。
- 将来の正式検査・B5/B6・strict受入・描画・QCで不合格が一件出る。

不合格一件で同attempt修正0件、使用済みroot不変、API再試行0、secret不保存、commit・stable tag 0件を維持する。

## 9. 承認依頼文案

> ZEVO字幕品質v002 論理幅・物理page graph整合 追補v022 設計v001を承認する。正式Node page graphの現物値から、safe幅1,760px、縁・光彩40px、論理幅1あたり48pxを用いて横型実証jobの最大論理幅を35と確定する。新版source jobではstyleLimits一件と3 caseの横型caption layout上限を36から35へ同時に改訂し、provider可視上限・resolved style・selection・plannerを同じ値へ接続する。schema・schema意味・字幕本文・253 boundary・文字幅表・preset registry・既存成果物は不変とし、AIがcue終端と必要な行末を選ぶ分業を維持する。implementation path 19件、binding 36/11/19/41/51/52、code 50件、検査ID 48件、proof 523件は不変。変更は既存6 path内、approved contractはsource/B5/B6を16/18/21件へ改訂する。承認後の実装・関連検査・新版source package製造までを許可し、残余リスク受入、B5/B6 API通信、費用、描画は別承認とする。
