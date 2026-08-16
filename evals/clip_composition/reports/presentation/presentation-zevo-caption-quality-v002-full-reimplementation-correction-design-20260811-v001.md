# ZEVO字幕品質v002 全面再実装 修正設計 v001

日付: 2026-08-11

状態: 実装承認待ち

通信: 0回

費用: US$0

## 0. 結論

承認済み契約3件を変更せず、既存変更0・新規14 pathの同じ構成で全面再実装できる。

旧attemptの未完成14 pathは、path・SHA-256を証拠記録へ固定した後、作業ツリーから14/14除去済みである。新attemptは旧byteをcopy、patch、部分流用せず、次の正本3件と現行の既存再利用入口だけから実装する。

1. 親契約: `presentation-zevo-caption-quality-v002-contract-design-20260810-v001.md`
2. 完全実装設計v001: `presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md`
3. 累積追補v002: `presentation-zevo-caption-quality-v002-complete-implementation-design-binding-wiring-addendum-20260811-v002.md`

再発防止の中心は、14 pathを作り終えてから一括監査する方式を禁止し、各production pathと対になるtest pathを一組ずつ完成させ、その工程の正式成果物集合、status、所有code、proof itemが閉じた場合だけ次工程へ進む直列ゲートである。

## 1. 実現性調査

### 1.1 正本と開始条件

| 対象 | 固定値・実測 | 判定 |
|---|---|---|
| 親契約SHA-256 | `33b61ee497d765fbe9eb63fb1b05bce16a99488d238eb27b732550b4daac24ba` | 一致 |
| 完全実装設計SHA-256 | `44fb6199a80663657bf056df0118def3db750fe65813d86e9d106cdc4f42d6e4d` | 一致 |
| 追補v002 SHA-256 | `a3c8c3ef8e57cd557e4a7cae17ecc188dc523df1508a45de6e2bce36691c7e4d` | 一致 |
| 追補v001 SHA-256 | `6de44032c8215253b1bb9e1b71b6ed33273d983d022d2f6737e3696c3609ce23` | 承認履歴として一致。formal jobへ重複束縛しない |
| renderer SHA-256 | `c90dc00456ade415e46cf8c692c49f3d08ae0ab21186b10227cdb5676f445292` | 一致 |
| preset registry SHA-256 | `8e9b0a039c8a4c9edf2c66b1df343c1d892d4688ebc4886a9af322bd44a6e5a8` | 一致 |
| 旧attempt証拠記録 | SHA-256 `6afe0f2a82eeadb0e3692d7a8523a74b62663b1dfa820eb163ed476acdaeb6e6` | 14/14元実体一致後に固定 |
| exact 14 path | 14/14不存在 | 新attempt開始条件成立 |
| 15 path目 | 0件 | closed |

### 1.2 現物入口

完全実装設計§1.1と追補v002 §2.1で固定された既存入口のpath・export・SHAは、旧attempt除去後も変更されていない。実装開始時に同じ一覧を再読し、一件でも差があれば実装せず停止する。

特に次の二点を固定する。

- 物理配置は既存`buildPresentationOutputPhysicalPageGraphV001`、時間写像は既存piecewise mapper、費用は既存cost guard、描画は既存共通描画coreを唯一の正本とする。
- rendererとpresetのfade事実は、追補v002 §7の現SHAに対する事実である。どちらかのSHA差を観測した場合は停止し、値を再解釈しない。

### 1.3 旧attemptを使わない保証

- 旧14 pathの実byteは作業ツリーに存在しない。
- 証拠記録はpath・SHAだけを保持し、ソース本文を保持しない。
- 新attemptの実装入力は正本3件と既存再利用入口だけである。
- 旧attempt SHAを新job、実装binding、fixture、期待値へ転記しない。

## 2. exact 14 path

| # | path | 役割 | 完成直後ゲート |
|---:|---|---|---|
| 1 | `evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs` | source正式処理 | Sゲート |
| 2 | `evals/clip_composition/presentation_output_caption_cue_source_package_v001.test.mjs` | ZCQ001〜006 | Sゲート |
| 3 | `evals/clip_composition/run_presentation_output_caption_cue_b5_b6_v001.mjs` | B5/B6正式runner | Aゲート |
| 4 | `evals/clip_composition/run_presentation_output_caption_cue_b5_b6_v001.test.mjs` | ZCQ007〜017 | Aゲート |
| 5 | `evals/clip_composition/presentation_output_caption_cue_selection_v001.mjs` | selection受入・pure finalizer | Lゲート |
| 6 | `evals/clip_composition/presentation_output_caption_cue_selection_v001.test.mjs` | ZCQ018〜027 | Lゲート |
| 7 | `evals/clip_composition/presentation_output_page_line_planner_v003.mjs` | 決定的planner v003 | Pゲート |
| 8 | `evals/clip_composition/presentation_output_page_line_planner_v003.test.mjs` | ZCQ028〜037 | Pゲート |
| 9 | `evals/clip_composition/presentation_output_render_plan_v003.mjs` | render plan v003 | Rゲート |
| 10 | `evals/clip_composition/presentation_output_render_plan_v003.test.mjs` | ZCQ038〜041 | Rゲート |
| 11 | `evals/clip_composition/run_presentation_zevo_caption_quality_v002_proof_job_v001.ts` | proof正式runner | Fゲート |
| 12 | `evals/clip_composition/run_presentation_zevo_caption_quality_v002_proof_job_v001.test.mjs` | ZCQ042〜044 | Fゲート |
| 13 | `evals/clip_composition/presentation_zevo_caption_quality_v002_review_ui_v001.mjs` | review UI | Uゲート |
| 14 | `evals/clip_composition/presentation_zevo_caption_quality_v002_review_ui_v001.test.mjs` | ZCQ045〜046 | Uゲート |

既存path変更0件、15 path目0件を維持する。

## 3. 工程完成ゲート

各ゲートは、productionと対応testを同時に閉じる。下表の全列が成立する前に次ゲートのpathを作らない。

| ゲート | 正常経路 | 非正常経路 | code閉包 | proof閉包 | 公開閉包 |
|---|---|---|---|---|---|
| S source | 実job→全binding前読→style実import→後読→package build→stable再読→atomic公開 | rejected/fatal | source 7/7 | ZCQ001〜006 | source package一件、上書き0、公開不能時formal root 0 |
| A B5/B6 | B5 measure-onlyとB6 generate-onceを別job・別承認で実処理。test transportだけで全枝を起動 | passed/rejected/fatal、B5からB6自動進行0 | API 9/9 | ZCQ007〜017 | B5 P0〜P8、B6結果別集合、raw先行、failure/root集合 |
| L selection | raw実byte三者一致→strict意味受入→実style/physical/timeline→selection保存→stable再読→pure finalizer | passed/rejected/abstained/fatal | selection 14/14 | ZCQ018〜027 | passedはselection+report、他は契約固定集合、partial禁止 |
| P planner | report binding必須→本文・atom・span・時刻の機械復元→実physical/timeline | passed/rejected、例外はproofへfatal | planner 7/7 | ZCQ028〜037 | proof staging内plan、stable再読、旧plan変換0 |
| R render | output request binding必須→meaning projection→既存共通element投影 | passed/rejected、公開失敗はproof owner | render 4/4 | ZCQ038〜041 | proof staging内render plan、stable再読 |
| F proof | 追補v002の12段順→実renderer/QC→review→completion | passed/rejected/fatal | proof 6/6 | ZCQ042〜044 | completion/rejection/fatal三者排他、prefix固定、partial公開0 |
| U review | 検証済みreview input→escaped HTML | passed/rejected | 新codeなし | ZCQ045〜046 | review input/HTML binding、completionとの非循環 |

## 4. 正式成果物集合とstatus閉包

親正本のschema・path・固定prefixを再定義せず、次の一件表で実装対象を漏れなく割り当てる。

| 工程 | status | 正式成果物集合 | 作らないもの |
|---|---|---|---|
| source | passed | `source-package-v001.json`一件 | failure report、旧package |
| source | rejected/fatal | formal root 0件、CLI一行 | 空package、fallback |
| B5 | passed | 親正本P8の13成果物 | B6 job・B6 root |
| B5 | rejected/fatal | 到達済み`Pn`+`b5-failure-report.json`。job前/報告不能/root公開不能は契約固定の0件またはstaging保持 | 未到達request/rawの空file |
| B6 | passed | raw、provider envelope、B6 manifest | failure report、selection |
| B6 | rejected provider/cost | 親正本の結果別raw/envelope/manifest集合 | 自動再試行、selection |
| B6 | fatal | 到達済みprefix+failure report、またはreport不能時formal root 0件/staging保持 | 未受信raw、空envelope |
| selection | passed | selection一件+passed report一件 | partial selection |
| selection | rejected/abstained | report一件、selection 0件 | planner以後 |
| selection | admission fatal | formal fatal report一件が成立可能な枝だけ。report不能枝はCLIのみ | 生error、partial selection |
| selection | selection publication fatal | partial selection不在を証明後、fatal report一件 | selection単独公開 |
| planner | passed | proof case staging内page/line plan一件 | v001/v002変換物 |
| planner | rejected/fatal | proofのrejection/fatal固定prefix | 後段render plan・video |
| render | passed | proof case staging内render plan一件 | 旧plan併産 |
| render | rejected/fatal | proofのrejection/fatal固定prefix | video・QC・completion |
| proof | passed | 3 caseのoutput request、page/line plan、render plan、video、QC、review input/HTML、completion | rejection/fatal report |
| proof | rejected | 完了prefix+rejection report | completion、fatal report、後段case成果物 |
| proof | fatal | 完了prefix+fatal observationまたはCLI-only固定集合 | completion、rejection report、生文字列 |

## 5. 47 code owner一件表

| # | code | owner ID | 完成ゲート |
|---:|---|---|---|
| 1 | `CUE_SOURCE_JOB_INVALID` | ZCQ001 | S |
| 2 | `CUE_SOURCE_INPUT_BINDING_INVALID` | ZCQ005 | S |
| 3 | `CUE_SOURCE_STYLE_INVALID` | ZCQ005 | S |
| 4 | `CUE_SOURCE_ATOM_CLOSURE_INVALID` | ZCQ003 | S |
| 5 | `CUE_SOURCE_PROMPT_PROJECTION_INVALID` | ZCQ004 | S |
| 6 | `CUE_SOURCE_EXECUTION_FAILED` | ZCQ005 | S |
| 7 | `CUE_SOURCE_PUBLICATION_FAILED` | ZCQ005 | S |
| 8 | `CUE_B5_JOB_INVALID` | ZCQ007 | A |
| 9 | `CUE_OFFICIAL_SNAPSHOT_MISMATCH` | ZCQ012 | A |
| 10 | `CUE_TOKEN_COUNT_FAILED` | ZCQ011 | A |
| 11 | `CUE_SPENDING_LIMIT_EXCEEDED` | ZCQ013 | A |
| 12 | `CUE_B6_JOB_INVALID` | ZCQ007 | A |
| 13 | `CUE_PROVIDER_TRANSPORT_FAILED` | ZCQ015 | A |
| 14 | `CUE_PROVIDER_ENVELOPE_INVALID` | ZCQ016 | A |
| 15 | `CUE_PROVIDER_USAGE_INVALID` | ZCQ016 | A |
| 16 | `CUE_API_PUBLICATION_FAILED` | ZCQ016 | A |
| 17 | `CUE_SELECTION_JOB_INVALID` | ZCQ018 | L |
| 18 | `CUE_SELECTION_INPUT_BINDING_MISMATCH` | ZCQ018 | L |
| 19 | `CUE_PROVIDER_RESPONSE_INVALID` | ZCQ019 | L |
| 20 | `CUE_PROVIDER_ABSTAINED` | ZCQ020 | L |
| 21 | `CUE_CAPTION_SET_MISMATCH` | ZCQ021 | L |
| 22 | `CUE_BOUNDARY_ID_INVALID` | ZCQ022 | L |
| 23 | `CUE_ORDER_INVALID` | ZCQ023 | L |
| 24 | `CUE_LINE_END_INVALID` | ZCQ023 | L |
| 25 | `CUE_ATOM_COVERAGE_INVALID` | ZCQ024 | L |
| 26 | `CUE_LINE_WIDTH_INVALID` | ZCQ025 | L |
| 27 | `CUE_PHYSICAL_LAYOUT_INVALID` | ZCQ026 | L |
| 28 | `CUE_TIMELINE_MAPPING_INVALID` | ZCQ026 | L |
| 29 | `CUE_SELECTION_EXECUTION_FAILED` | ZCQ027 | L |
| 30 | `CUE_SELECTION_PUBLICATION_FAILED` | ZCQ027 | L |
| 31 | `CUE_PLANNER_INPUT_INVALID` | ZCQ036 | P |
| 32 | `CUE_PLANNER_BINDING_MISMATCH` | ZCQ036 | P |
| 33 | `CUE_RECONSTRUCTION_FAILED` | ZCQ028 | P |
| 34 | `CUE_SELECTED_EDGE_NOT_FOUND` | ZCQ032 | P |
| 35 | `CUE_PLANNER_PHYSICAL_INVALID` | ZCQ031 | P |
| 36 | `CUE_PLANNER_TIMELINE_INVALID` | ZCQ033 | P |
| 37 | `CUE_PLANNER_OVERLAP_INVALID` | ZCQ034 | P |
| 38 | `CUE_RENDER_INPUT_INVALID` | ZCQ038 | R |
| 39 | `CUE_RENDER_BINDING_MISMATCH` | ZCQ039 | R |
| 40 | `CUE_RENDER_PROJECTION_INVALID` | ZCQ040 | R |
| 41 | `CUE_RENDER_PUBLICATION_FAILED` | ZCQ044 | F |
| 42 | `CUE_PROOF_JOB_INVALID` | ZCQ042 | F |
| 43 | `CUE_PROOF_CASE_SET_MISMATCH` | ZCQ042 | F |
| 44 | `CUE_PROOF_RENDER_FAILED` | ZCQ043 | F |
| 45 | `CUE_PROOF_QC_FAILED` | ZCQ043 | F |
| 46 | `CUE_PROOF_EXECUTION_FAILED` | ZCQ044 | F |
| 47 | `CUE_PROOF_PUBLICATION_FAILED` | ZCQ044 | F |

各codeは親正本§9の「必ず起動する枝」を個別に実行して観測する。source文字列、export名、代表枝、同一booleanの転記は実発火に数えない。

## 6. proof item閉包

### 6.1 導出正本

追補v002 §10.3のexact抽出規則で、親正本P、追補v001 V1、追補v002 V2からproof itemを導出する。現時点の件数は合計393件である。

各testは自分のIDに属するproof item IDをliteralで保持し、各itemが要求する実観測を専用assertへ割り当て、assert成功直後にexact一回`proof-item:<proofItemId>:passed`をTAP diagnosticへ出す。正式attempt実行器は文書から期待集合を再導出し、test source宣言集合、TAP観測集合、passed集合の四者をexact一致させる。

### 6.2 ID別件数一件表

`P/V1/V2=合計`の順で示す。

| ID | proof item件数 | ID | proof item件数 |
|---|---:|---|---:|
| ZCQ001 | 17/0/3=20 | ZCQ024 | 5/0/0=5 |
| ZCQ002 | 3/0/0=3 | ZCQ025 | 2/0/0=2 |
| ZCQ003 | 3/0/0=3 | ZCQ026 | 6/0/1=7 |
| ZCQ004 | 4/0/0=4 | ZCQ027 | 14/0/7=21 |
| ZCQ005 | 5/0/0=5 | ZCQ028 | 7/2/1=10 |
| ZCQ006 | 3/0/1=4 | ZCQ029 | 1/0/0=1 |
| ZCQ007 | 16/0/1=17 | ZCQ030 | 2/0/0=2 |
| ZCQ008 | 1/0/0=1 | ZCQ031 | 4/0/0=4 |
| ZCQ009 | 3/0/0=3 | ZCQ032 | 1/0/0=1 |
| ZCQ010 | 5/0/0=5 | ZCQ033 | 2/0/0=2 |
| ZCQ011 | 19/0/0=19 | ZCQ034 | 3/0/0=3 |
| ZCQ012 | 5/0/0=5 | ZCQ035 | 1/2/1=4 |
| ZCQ013 | 7/0/0=7 | ZCQ036 | 1/6/3=10 |
| ZCQ014 | 5/0/0=5 | ZCQ037 | 4/0/0=4 |
| ZCQ015 | 10/0/0=10 | ZCQ038 | 6/5/4=15 |
| ZCQ016 | 18/0/4=22 | ZCQ039 | 4/5/2=11 |
| ZCQ017 | 8/0/0=8 | ZCQ040 | 2/0/4=6 |
| ZCQ018 | 13/0/5=18 | ZCQ041 | 6/4/2=12 |
| ZCQ019 | 10/0/0=10 | ZCQ042 | 20/9/4=33 |
| ZCQ020 | 1/0/1=2 | ZCQ043 | 8/2/2=12 |
| ZCQ021 | 5/0/0=5 | ZCQ044 | 20/6/5=31 |
| ZCQ022 | 3/0/0=3 | ZCQ045 | 7/0/2=9 |
| ZCQ023 | 2/0/0=2 | ZCQ046 | 5/0/2=7 |

合計はP=297、V1=41、V2=55、総計393件である。実装開始前に同じ抽出器で再計算し、差があれば正本差として停止する。

## 7. 工程別の実装順

1. 正本3件、renderer、preset、既存再利用入口、14 path不存在、旧証拠記録を再照合する。
2. Sゲートの2 pathだけを作る。
3. source 7 codeの全実枝、ZCQ001〜006の全proof item、成果物集合、import前後再読を局所監査する。不成立なら他12 pathを作らず停止する。
4. Aゲートの2 pathだけを作る。
5. API 9 code、ZCQ007〜017、B5 P0〜P8、B6結果別集合、別承認、raw先行、secret 0を局所監査する。通信はtest transportだけで、外部通信0を維持する。
6. Lゲートの2 pathだけを作る。
7. selection 14 code、ZCQ018〜027、実physical/timeline、pure finalizer五tuple、selection publication失敗を局所監査する。
8. Pゲートの2 pathだけを作り、planner 7 code、ZCQ028〜037、旧6 plan fixtureを局所監査する。
9. Rゲートの2 pathだけを作り、render 4 code、ZCQ038〜041、common 2 ID、fade二供給元を局所監査する。
10. Fゲートの2 pathだけを作り、proof 6 code、ZCQ042〜044、12段順、実renderer/QC、三報告排他を局所監査する。
11. Uゲートの2 pathだけを作り、ZCQ045〜046、固定5問、fade転記、HTML bindingを局所監査する。
12. 14 path全体へ追補v002 §8と親正本§13を再適用する。この全体監査は局所ゲートの代用にしない。
13. 証明消失0の期待393件を、source宣言・TAP観測・passed diagnosticへ照合する。
14. 全て成立した場合だけ正式46件を一回開始する。

## 8. 正式attempt開始条件

次を全て満たすまでNode test runnerを正式attemptとして起動しない。

1. 14 path実在、15 path目0、既存path変更0。
2. production export集合、test ID定義集合が正本とexact一致。
3. 47 codeがproduction実枝へ一意に割り当て済み。
4. 47 code全てに実発火subcaseが存在。
5. proof item期待393件とtest source宣言393件がexact一致。
6. 正常/rejected/abstained/fatalと成果物集合の一件表が全枝へ割当て済み。
7. B5/B6、selection、proofの正式executeがstubでなく、実decoder・validator・正本計算・公開処理へ接続済み。
8. selectionのphysical/timeline projectionが実正本の観測から作られ、空projectionや固定hashで代用していない。
9. proofの正常経路が実renderer/QCまで到達する。
10. renderer/preset SHAが固定値と一致。
11. 固定Node先頭PATH、固定TSX絶対path、NODE_OPTIONS不存在、native、Chromium、FFmpeg/FFprobe実体・SHAを記録。

## 9. 正式検査と回帰

正式attempt開始後は次の順で進む。

1. ZCQ001〜ZCQ046を頭から一回実行し、TAP全文を版付き保存する。
2. 46/46、47 code実発火47/47、proof item 393/393の場合だけ直接影響回帰へ進む。
3. 実装後import graphから固定した直接影響回帰を全件実行する。
4. green 287/287。
5. baseline 86/203 exact、不合格集合117件不変。
6. 既存5 tree不変。
7. A-v002記録対象treeと受理レポート不変。
8. 完了報告または停止報告を作り停止する。

正式検査開始後に不合格が一件でも出た場合は、同attemptで直さない。

## 10. 不変条件

- schema、47 code、46検査ID、status、終了code、幅規則、通信回数を変更しない。
- 正本3件を変更しない。追補v001は履歴として保持しformal jobへ重複束縛しない。
- ZEVG、A-v002、既存正式成果物、stable tagを変更しない。
- API通信、countTokens、generateContent、費用支出、正式描画を行わない。
- 本文・時刻・幅・物理配置・費用計算を複製しない。
- silent fallback、旧plan変換、後方互換分岐を作らない。
- 生本文、raw、secret、message、stack、stderrをfatal/reportへ保存しない。

## 11. 停止条件

次のいずれかで、そのattempt内に直さず停止する。

- 15 path目または既存path変更が必要。
- 新schema、新code、新検査ID、契約解釈が必要。
- 正本exportの不存在・意味差、renderer/preset SHA差、新たな現物差。
- いずれかの局所ゲートでcode owner、proof item、成果物集合を閉じられない。
- 47 codeの実発火不能、proof item 393件の証明消失。
- binding推測、path/SHA自己認定、計算複製、global hidden stateが必要。
- API通信、費用、正式描画が必要。
- 既存成果物・green・baseline・treeに差が出る。
- 正式46件または回帰の不合格一件。

## 12. 人間作業量

| 時点 | 人間作業 | 目安 |
|---|---|---:|
| 今回 | 本修正設計の承認または差戻し | 1件×3〜5分 |
| 実装完了後 | B5計測承認 | 別承認 |
| B5完了後 | B6一回送信承認 | 別承認 |

本修正設計の実装中に人間がfixtureを作る作業は0件である。

## 13. 完全性チェック

| 項目 | 判定 | 根拠 |
|---|---|---|
| 本来目的 | closed | A-v002の字幕残留・不自然改行をZEVOで解く実装基盤 |
| 旧attempt破棄 | closed | 14 SHA証拠固定後、14/14不存在 |
| path閉包 | closed | exact 14、新規のみ、15件目停止 |
| schema閉包 | closed | 正本3件不変 |
| code閉包 | closed | §5で47件を一件割当て |
| 検査閉包 | closed | 46 ID、proof item 393件をID別固定 |
| status閉包 | closed | §3・§4で正常と全非正常経路を割当て |
| 成果物閉包 | closed | §4で結果別集合を固定 |
| 工程間binding | closed | 追補v002 §8を全pathへ一括適用し、各局所ゲートでも確認 |
| 参照実体 | closed | §1.2の既存正本だけを再利用 |
| 再発防止 | closed | pathごとの局所閉包後だけ次工程へ進む |
| 既存成果物 | closed by stop | 回帰・tree差で停止 |
| API・費用・描画 | excluded | 別承認 |

未固定B分類は0件である。実装後にだけ取得できる各新file SHA、直接影響回帰件数、TAP durationはC分類として正式attempt前に固定する。

## 14. 承認依頼文案

ZEVO字幕品質v002 全面再実装 修正設計v001を承認する。承認済み親契約・完全実装設計v001・追補v002を変更せず、新規14 path・既存変更0で全面再実装する。旧attemptの部分コードは流用しない。S→A→L→P→R→F→Uの各局所ゲートで、正式成果物集合、全status経路、所有code、proof itemを閉じた場合だけ次工程へ進み、14 path完成後の一括監査だけへ依存しない。実装後監査、証明消失0、新規46件、直接影響回帰、green 287/287、baseline 86/203 exact、既存5 treeとA-v002記録対象tree不変照合、完了または停止報告まで進めてよい。API通信、countTokens、generateContent、費用支出、正式描画は含まない。§11の停止条件を維持する。
