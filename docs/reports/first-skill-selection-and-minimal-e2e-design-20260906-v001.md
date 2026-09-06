# 最初のSkill選定と最小実動画E2E設計 v001

日付: 2026-09-06。区分: 調査・設計の副線報告。Skill、契約、Goalの制定・実装指示ではない。

## 1. 結論

最初の実装単位は **字幕表示区切りSkill** とすることを推奨する。一つの問いは「確定済みの字幕本文を、意味が読み取れるどの表示単位・行末で見せるか」である。字幕本文の再生成、意味まとまりの作り直し、場面採否、カット境界、描画は含めない。

読みやすい字幕を判断した既存の処理、回答検査、表示境界の正式投影、実動画、人間合格の記録がある。さらに遠方接続では、同じ表示境界の形から現行の注文書v002・rendererへ通した実動画がある。この二つの実績を足場に、判断を独立したSkillへ包むのが、候補探索から新たに採否・区間化・構成を閉じるより短い。

ただし、**新しいSkillの判断が良くなることは未実証**である。過去の回答を再生するだけの配線試験をSkill完成と数えない。最小実証は、既存の遠方接続完成例を固定入力にして新しい表示判断を通し、元動画・Skillなしの既存完成動画・Skill使用動画を人間が比較できるところまでとする。これは字幕Skillの最初の縦断実証であり、ダイジェストと遠方接続を共通構造から完成させる製品全体の第一完成ではない。

2番手は字幕意味まとまり。候補探索は重要だが、最初の包装だけで新しい動画価値を検証するまでに必要な選択と製造の接続が最も多い。

## 2. 調査基準・権限・事実の区別

- repository: `f-kw/zev2`、branch: `main`。
- 調査基準HEAD: `026c36c4e96b4ecf7e8cc7d48c22a8ebd24d4342`。開始時にlocal mainとGitHub mainが一致することを確認した。
- 今回の個別指示は「ZEV進行管理２」経由のkawafmm承認済み調査・設計。成果は本Markdownの作成、内容検査、commit、通常push、Drive共有、GPT_DECISION提出まで。Skill実装は含まない。
- `DECISIONS.md`を読んだ上で、現在の運用は`AGENTS.md`の優先節に従う。過去の承認記録を今回の着工根拠にしない。記録行は追加していない。
- 現行目的は`docs/CURRENT_GOAL.md`、上位方針は`相談役/方針/2026-09-06_ZEV_方針整理.md`。目的は「見たものが気持ちいい動画を作る」。第一完成はダイジェストと遠方接続の2系統。`docs/GOAL_DEFINITION.md` v3.6は既存関門の記録として読み、9月6日方針への適用未確定を保持した。
- `docs/architecture/ZEV_AGENT_SKILL_ARCHITECTURE_v001.md` §§9・16・19を責務と接続先の基準にした。意味判断は実行封印より前、封印後は正式投影・描画・技術QC。旧main workflowをそのまま新しい完成経路にしない。
- `docs/ZEV_候補動画理解_AB較正終了記録_v001.md`の終了範囲を確認した。Gemini共通後段の再開、原因・因果、minimum context、natural ending、正確なカット境界、画面構成選択、遠方前半探索、カタルシス型固有探索、自由なLLM Plannerを候補にしていない。
- 作業前から存在する候補動画理解の変更4ファイルと未追跡9ファイルは調査基準・commit対象から除外し、開始時の内容ハッシュを保存した。

以下では「現物確認」「保存済み実績」「設計提案」「未確認」を分ける。動画内容の新たなAI解析・目視認定は行っていない。API推論、費用支出、新素材取得、動画再生成は0件。GitHub・Drive・指定ChatGPTへの共有操作は今回明示された作業として実施する。

## 3. 現行の責務とコードの読み方

ZEVGは採用区間・物語順・発話とその出現・字幕の意味まとまりを持つ。ZEVOは出力形式に応じた字幕表示単位、改行、style等を持つ。現行の「意味上の行末」という名称は、字幕表示上の自然な折り方の判断を指し、字幕の意味まとまりを再構築する権限を意味しない。

参照した現行正本・実装の中心:

| 処理の意味 | repository path |
|---|---|
| 複数source・物語順・再利用を表す意味情報契約 | `evals/clip_composition/reports/presentation/presentation-meaning-information-package-contract-design-20260803-v001.md` |
| 意味情報の検査・正式製造 | `evals/clip_composition/presentation_meaning_information_package_v001.mjs` |
| 採用済み部分区間から意味情報を作る実データ系列 | `evals/clip_composition/presentation_a_meaning_information_package_v002.mjs` |
| 出力判断と物理限界の契約 | `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-contract-design-20260810-v001.md` |
| ZEVO出力契約・正式描画計画 | `evals/clip_composition/presentation_output_contract_v001.mjs`、`evals/clip_composition/presentation_output_render_plan_v003.mjs` |
| 注文書・描画の分離契約と明示改行の追補 | `evals/clip_composition/reports/presentation/presentation-rendering-decoupling-contract-design-20260817-v001.md`、`presentation-rendering-decoupling-contract-design-addendum-20260818-v004.md`（同directory） |
| 現行の意味情報から描画命令への変換 | `evals/clip_composition/presentation_instruction_artifact_v002.mjs` |
| 現行の時間写像・受入・描画・QC | `evals/clip_composition/presentation_base_media_timeline_v004.mjs`、`presentation_renderer_admission_receipt_v002.mjs`、`run_presentation_instruction_renderer_job_v002.ts`、`presentation_renderer_qc_v002.mjs`（同directory） |

意味情報v001の一般契約と、意味情報v002の単一source実証subset、遠方接続用の意味入力は同じschemaではない。ファイル名の版番号だけで新旧を一列に並べ、全入力が互換だと解釈しない。新試作は現行の注文書v002とtimeline v004へ接続し、旧版へのfallbackを設けない。

## 4. 候補A: 候補探索

### A. 既存処理

`runner/src/steps/theme-options.ts:188`は、書き起こしと人間承認済み命令・実行条件から候補一覧を返す。現在の実モードは固定候補の読込と書き起こしからの候補化で、サンプル分岐もある。書き起こし側は発話グループ（なければ発話）から先頭側を列挙する処理であり、LLMによる意味的重要度判断ではない。固定データの読込・列挙は決定的だが、生成日時を付けるので成果物のbyte一致とは別である。この関数自体は正式ZEVGを公開しない。

呼出元は`runner/src/workflow-step-builders.ts:204`。続く`runner/src/steps/composition.ts:41`は採用候補と発話から区間、本文、役割、接続説明を作り、同builderのcomposition・edit-plan工程へ渡す。先頭を導入、末尾を結論とする役割付与や、発話から時刻を導出する処理まで含む。候補探索Skillに丸ごと入れると、探索と構成・正式実行値の導出が混ざる。

LLMによる既存候補探索は`evals/clip_composition/run_theme_generation_windowed_web_gemini.mjs`。窓化した発話入力をWeb Geminiへ送り、回答候補を集約する。入力製造は`build_theme_generation_payload.ts`、`build_theme_generation_windows.ts`、漏洩検査は`inspect_theme_generation_payload_leakage.ts`（同directory）。回答は非決定的。窓の統合、根拠発話からの時刻補正、重なりによる機械統合と出力保存もrunner内にあり、その全体はSkillではない。候補保存は正式な採用区間確定と区別する必要がある。

fixture・実績は`evals/clip_composition/outputs/theme-generation/`と既存候補からのcomposition/render系列にある。ただし、今回確認した範囲では、通常workflowの候補関数単独の直接test、および新architectureの固定planから汎用候補探索Skillを経て実動画比較まで閉じる試験は確認できていない。保存候補の存在を「そのまま新しいSkill E2E実証済み」と扱わない。

### B. 包装に必要な変更（未実装案）

新規候補pathは`runner/src/skills/candidate-discovery-v001.ts`とその隣の検査、候補採否を固定する個別plan、既存意味情報・製造へ接続する個別executor。既存の候補時刻補正・重複統合・採用決定はSkillの外へ切り分ける必要がある。通常workflowへの差込みは最初の試作には不要だが、旧関数全体を呼ぶだけでは成立しない。

入力は編集上の目的と発話参照、必要な既存観測。出力は根拠発話を参照した候補集合と理由であり、採用済み区間・正式時刻ではない。validationは発話参照と根拠の閉包、provenanceは入力・判断手段・保存回答への実行記録、executorは固定planが採用した候補のみ既存の区間化・意味情報へ渡す。これらを汎用registryにしない。

### C. 技法横断

ダイジェストの候補材料には直接有用。遠方接続では本体候補の材料として使えるが、離れた場面の関係を見つける責務は別である。同じSkillが両技法の探索全体を代替するとはいえない。将来技法でも候補材料は共用できるが、目的と根拠を揃える入力adapterが必要。

### D. 実動画まで不足するもの

編集上の重要箇所を答える処理の独立化、候補集合の新interface、固定採否、区間化への明示接続、物語順と重複の確定、ZEVG製造、既存ZEVO接続、実動画比較が必要。今回除外された正確なカット境界やminimum contextを暗黙に解けたことにせず、既承認区間だけに制限しても候補の価値と採否の実証が残る。最初のSkillには選ばない。

## 5. 候補B: 字幕意味まとまり

### A. 既存処理

`evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs:23`の問いは、各発話containerについて意味が自然に完結するまとまりの終端を選ぶこと。入力は順序付き本文片と終端候補、回答は提示された意味境界IDの列である。本文・時刻・順序を生成させない。

非決定的判断の呼出元は`run_presentation_meaning_boundary_b5_b6_v001.mjs`。受理側は`presentation_meaning_boundary_selection_v001.mjs:434`で、回答形式、全量被覆、元発話・atomの対応、実際のprovider実行証拠を検査する。後者のjob実行部は正式selectionと検査報告を公開する。意味情報への展開・正式製造は`presentation_meaning_information_package_v001.mjs:1123`等が担う。**回答判断だけをSkillとし、selection公開や意味情報製造は外に残す。**

検査は`presentation_meaning_boundary_source_package_v001.test.mjs`、`presentation_meaning_boundary_b5_b6_v001.test.mjs`、`presentation_meaning_boundary_selection_v001.test.mjs`、`presentation_meaning_information_package_v001.test.mjs`（同directory）。候補被覆、拒否、元atomの保存、正式byte等の検査を確認した。

実動画は`presentation-meaning-output-first-real-run-stable-point-completion-report-20260806-v001.md`（同directoryの`reports/presentation/`）がcandidate 59の横型・縦型、人間合格を記録している。ただしこれは当時の意味情報・出力系列の実績。現行v002注文書へ新しいSkillを接続した証明ではない。

### B. 包装に必要な変更（未実装案）

新規候補pathは`runner/src/skills/caption-meaning-grouping-v001.ts`とその検査、意味情報製造へ接続する個別executor・固定plan。入力の問いと回答形は既存の意味境界契約を使用できる。新しい判断手段を使う場合、その実行証拠を保存し、既存B5/B6の実行証拠を捏造しない。

validationとprovenanceは既存の被覆・atom保持・参照検査を再利用する。変更が必要なのは呼出境界の包装と、採用結果から現在の意味情報・timelineへ進む明示配線。画面幅を意味まとまりSkillに混ぜない。意味情報v001を無条件にv002へ詰め替えるadapterも作らない。

### C. 技法横断

本文と発話の出現順を渡せれば、ダイジェスト・遠方接続・別技法で同じ意味完結の問いを使える。ただし、異なる場面をまたぐcontainerの切り方、同じ発話が複数回出現する場合の区別は入力側が確定する必要がある。現行遠方接続の意味入力は独自schemaなので、直接接続は未実証。

### D. 実動画まで不足するもの

Skill包装、現在の採用済み区間・発話出現との接続、意味情報の正式製造、基礎映像との閉包、ZEVOの表示判断、現行注文書・renderer接続、比較レビューが残る。表示区切りより上流を変えるため、意味まとまりと表示品質の影響を分ける比較が必要。再利用性は高いが2番手とする。

## 6. 候補C: 字幕表示区切り（推奨）

### A. 既存処理

`evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs:18`に既存の判断指示がある。確定済み字幕の本文片をすべて順番どおり使い、読める小まとまりの表示終端を先に選び、一行に収まらない場合だけ自然な行末を選ぶ。語、固有名詞、反復語、文節の途中を避ける。独自の重みや数値評価は加えない。

| 部分 | 入出力・性質・呼出関係 |
|---|---|
| 入力製造 | 同source package処理が意味情報、既存style、基礎映像参照から本文片・境界ID・既定の行幅/行数制限を作る。決定的。時刻・元atom・正式参照は復元用の外側に保持する |
| 編集判断 | `run_presentation_output_caption_cue_b5_b6_v001.mjs`が上記入力をproviderへ渡す。非決定的。回答は表示終端と行末の境界ID。生回答・実行証拠を保存するが、その保存だけでは正式selectionにならない |
| 回答検査・正式公開 | `presentation_output_caption_cue_selection_v001.mjs:1376`以降。順序・全量被覆・参照・物理配置・timeline・provider由来を検査し、正式selectionと報告を製造する。ここはSkillではない |
| 既存の出力側変換 | `presentation_output_page_line_planner_v003.mjs`、`presentation_output_render_plan_v003.mjs`。判断済み境界を表示計画へ解決する |
| 現行Coreへの変換 | `presentation_cue_end_projection_v001.mjs`で表示終端と行末を別の正式投影へ分け、`presentation_instruction_artifact_v002.mjs`で本文と表示frameを注文書へ写す。`presentation_renderer_line_layout_rule_v002.mjs`は受け取った行末を使用し、意味を再判断しない |
| 描画 | `run_presentation_instruction_renderer_job_v002.ts`が受入・行配置・既存描画・QCへ接続する |

検査はsource package、B5/B6 runner、selection、page/line計画、render計画それぞれの同名`.test.mjs`、および現行`presentation_cue_end_projection_v001.test.mjs`、`presentation_instruction_artifact_v002.test.mjs`、`presentation_renderer_line_layout_rule_v002.test.mjs`、`presentation_renderer_admission_receipt_v002.test.mjs`にある。今回、新たな生成や検査実走の合格を主張していない。

実動画・人間合格の根拠は`evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-human-pass-final-verification-20260816-v001.md`。横型voice-013/067/190の3本で、文字の残留、短文の不要な改行、長文の自然な二行、全文保持、短い表示の見え方について人間合格を記録している。新しいSkillの未確認品質へこの認定を移さない。

### B. 包装に必要な変更

判断の入力・出力は既存形を使える。新規実装の提案pathと接続は§8に限定する。既存のsource package生成とprovider実行runnerを丸ごとSkillに入れず、判断呼出の薄い入口だけを設ける。正式公開は別の決定的executorが担う。

重要な制約が二つある。

1. 字幕品質の既存proof runner `run_presentation_zevo_caption_quality_v002_proof_job_v001.ts:58`はvoice-013/067/190の3ケース固定で、注文書v001へつながる。任意1本を受ける汎用runnerではない。これを修正して一般化することを最小案に含めない。
2. 既存selection admissionは実際のB6実行証拠と意味情報系列を検査する。任意のSkill回答に架空のB6成功証拠を付けて通すことはできない。新しいSkill結果の受理は外側で実際の来歴を検査し、既存の投影・注文書・renderer境界を使う専用配線が必要。この不足を「既存関数を一度呼べば完了」と省略しない。

### C. 技法横断

| 対象 | 無変更で使える部分 | 入力側に必要なもの・未確認 |
|---|---|---|
| ダイジェスト | 固定本文片から読みやすい表示終端・行末を選ぶ問いと回答形 | 採用済み構成から発話出現順、字幕container、既存styleを渡す薄いadapter。汎用ダイジェスト全体の完成実績はない |
| 遠方接続 | 同じ本文片・境界ID・style制限の入力shape、同じselectionとprojection | 現行`distant_connection_existing_caption_selection_projection_v001.mts:200`が実際に同じshapeを製造する。ただし既存字幕の転記処理で、新しい判断は行わない |
| 将来の別編集技法 | 語の途中を避けて表示単位を選ぶ判断 | 字幕本文が確定し、発話の各出現と既存style制約を渡せる範囲。未知のstyleや多sourceの製造まで実証済みとはいわない |

判断コードへ「ダイジェスト」「遠方接続」の分岐を入れない。技法が違っても同じ字幕入力なら同じ問いとなる。一方、遠方接続用の意味入力をそのまま意味情報v002だと偽ることはしない。技法adapterとCoreの対応範囲は別に検査する。

### D. 実動画まで不足するもの

不足は、一つの判断入口、固定plan、実際のSkill結果を受理する専用の決定的配線、現行v002 Coreへ渡すjob、比較動画のreview入口である。場面探索、区間採否、物語順、意味情報、styleは既存の完成例を固定する。新しい一般基盤・renderer再設計を必要条件にしない。

## 7. 比較と追加候補の確認

| 判断軸 | 候補探索 | 字幕意味まとまり | 字幕表示区切り |
|---|---|---|---|
| 実動画までの近さ | 候補の採否・区間・構成から閉じる必要がある | 意味情報から表示判断も経る | 採用済み意味入力と既存Coreの間に一つの判断を挿入できる |
| 既存コードの再利用 | 候補生成はあるが選択と製造の分離が必要 | 意味境界検査・意味情報製造を再利用できる | 既存の問い・境界形・投影・注文書・描画を再利用できる |
| 技法横断 | 候補材料として共用、技法全体の探索とは異なる | 入力container整理で共用可能 | 共通入力shapeを遠方接続の現物でも確認 |
| 責務境界 | 現行wrapperに構成と時刻の混入がある | ZEVG判断として明確 | ZEVOの一つの判断として明確 |
| 新一般基盤を増やさず成立 | 可能だが個別配線の不足が大きい | 可能、現在の意味情報系列への接続が残る | 専用plan/executorと既存Coreで成立する設計が可能 |

数値化・重み付き総合点・独自係数は使っていない。表示区切りが全ての動画で最も大きい効果を出すという主張ではなく、現在の証拠から最初に判断と製造を分離し、実動画で価値を判定できる距離が最も短いという選定である。

追加候補としてタイトル周辺も確認した。`presentation_output_title_compositor_v001.mjs`と`run_presentation_output_title_job_v001.ts`は、与えられたタイトルの表示・既存動画への合成・QCを主に担う。これを包んでも独立した新しい編集判断にはならない。タイトル文言を選ぶSkillにするには別途意味判断の独立化が必要で、表示区切りより短い根拠がないため正式比較候補に追加しない。composition全体の包装も同じ理由で選ばない。

コメント量・音量・画面変化は観測の供給側でありSkillではない。将来候補探索へ必要なら既存sensor → 観測/seed → 候補探索という境界に置く。今回はsensorの一般化も行わない。

## 8. 最小E2E試作設計（未実装）

### 8.1 最初の固定入力

現行v002 Coreまで既に閉じている遠方接続例 `candidate-doctor-disappearance-to-ogre-mother` を最初の配線対象に提案する。新しい遠方接続技法や候補を作るものではなく、採用済み二場面・順序・本文・元音声・styleを保持し、字幕の見せ方だけを比較する。

既存入力と出力は`evals/clip_composition/outputs/presentation/distant-connection-presentation-execution/candidate-doctor-disappearance-to-ogre-mother-v001/`にある。実行結果はcompleted、現物MP4のSHA-256は`d9ce7d6f45c9eb46807402d379dc176397dc38d06b9f4ceeb180565a94593861`、サイズ11,039,767 byte。今回現物hashを取得した。保存されたrenderer結果にはQC passedと表示frame・音声の検査がある。人間が新Skillの出力を合格させた証拠ではない。

この例の元入力製造は`runner/src/distant-connection-presentation-meaning-input-v001.ts`、既存字幕の転記は`evals/clip_composition/distant_connection_existing_caption_selection_projection_v001.mts`、現行実行は`distant_connection_presentation_execution_v001.mts:414`（同directory）。最後の処理は過去の承認済みselectionを再束縛して使用するため、新しい回答を渡すだけで承認されたことにはならない。

voice-013の人間合格済み字幕例は、表示判断の回帰・レビュー基準として再利用する。旧v001 proof runnerの1ケース化や、旧timelineの無条件変換を最初の工事へ混ぜない。ダイジェスト側の同一Skill呼出は、採用済み本文を同じ入力shapeへ渡す配線検査として設計し、ダイジェスト動画の第一完成は別途閉じる。

### 8.2 処理の流れと判断所有

制作要求は「この固定済み動画の内容を保って、字幕の表示区切りを読みやすくする」。固定planは素材・構成・字幕本文・既存styleと使用Skillの版を選ぶ。基礎映像とtimelineは確定済みZEVGから決定的に準備済みのものを参照する。

| 段階 | 選ぶ・確定するもの | 所有者と残す結果 |
|---|---|---|
| 制作要求/固定plan | 対象の承認済み意味入力・基礎映像、style、使うSkill、比較対象 | plan。場面採否・順序・形式はここで固定。自由なPlannerを置かない |
| Skill入力 | 本文片、提示された境界ID、既存styleの行制限 | 入力adapter。元媒体・時刻・SHAの検査は外側 |
| Skill | 各確定済み字幕をどう表示単位と行に分けるか | 正式権限のない回答。本文生成や正式時刻を含めない |
| validation | 形式、IDの存在、一意性、順序、全量保持、cue内改行、既存幅/行数制限、元入力との対応 | 決定的検査。失敗・回答辞退では昇格しない。意味の読みやすさの合格は人間レビューに残す |
| planによる採用 | 検査済み回答を今回の出力候補として採用するか | 固定planに明記した採用条件と承認境界。回答が自分で採用済みを宣言しない |
| 正式値への決定的昇格 | 採用済み境界を正式selectionと表示終端・行末の投影へ写す | Skillの外のexecutor。入力・回答・採用記録に結び付けて公開し再読する |
| 実行封印/正式描画入力 | 同じ元atom・timelineから本文と表示frame、既存style参照を確定 | 既存の注文書v002、行末投影、renderer job。意味判断は既に終了 |
| ZEV Core | 受入、時刻写像、既定行末の解決、描画、技術QC | 既存v002 runner。判断を再選択せずreview動画を製造 |
| 人間レビュー | 元/Skillなしより良いか、必要内容を壊していないか | kawafmmの品質判定。機械QCのpassで代用しない |

### 8.3 入出力の最小形

Skillへ渡すのは既存`presentation-zevo-caption-selection-input-v001`の本文側である。ここでの名前はinterfaceを監査するための定義であり、通常報告は処理の意味で行う。

```text
入力: captions[{captionId, boundaryCandidates[{boundaryId,text}]}]
      + 既存taskDescription + 既存styleLimits
回答: {status:'complete', captions:[
        {captionId, cues:[{cueEndBoundaryId, lineEndBoundaryIds:[...]}]}
      ]}
      または既存規約に沿う回答辞退
```

本文の書換え、時刻、frame、source path、正式採用フラグは回答させない。固定planはどの回答を使用したかを選び、昇格処理が回答IDを元atomへ一意に対応付ける。Coreはプロンプトや生回答を受け取らず、正式注文書・参照された媒体/timeline・行末投影・style・実行条件を受け取る。

### 8.4 提案する新規pathと既存path変更

次表は必要な役割を具体化した候補pathであり、正本path上限の設定や着工済み宣言ではない。次工事の対象と枠は監査後の指示で確定する。

| 新規path案 | 最小の役割 |
|---|---|
| `runner/src/skills/caption-display-boundaries-v001.ts` | 一つの問いを既存入力形で判断手段へ渡し、権限なしの回答を返す入口。一般registryやprovider選定器を作らない |
| `runner/test/caption-display-boundaries-v001.test.mts` | 保存回答で入出力の分離を確認。過去回答の再生は配線試験に限定 |
| `evals/clip_composition/run_caption_display_skill_e2e_v001.mts` | 固定planの読込、来歴記録、回答検査、採用済み結果の決定的昇格、現行v002製造関数の順次呼出。Skill本体と別責務 |
| `evals/clip_composition/run_caption_display_skill_e2e_v001.test.mts` | 不正ID・全文欠落・順序差・不正改行・由来差の拒否、および同一採用結果から同一正式命令となることを確認 |
| `evals/clip_composition/jobs/presentation/caption-display-skill-e2e/fixed-plan-v001.json` | 承認された既存一例の入力、Skill版、style、回答採用条件、出力先を明示。値は未設定 |

既存production pathの変更は**予定しない**。既存の表示境界投影、注文書v002、timeline v004、line layout v002、admission v002、rendererを直接使用する。遠方接続の既存実行処理を参考に、入力読込とjob配線のみを個別executorへ記述し、計算本体を複製しない。旧main workflowや3ケース固定proof runnerへ新分岐を加えない。

検査結果や実行記録・新しい比較動画・簡素なreview入口は作業成果物として別出力先に置く設計とし、正式既存成果物を上書きしない。巨大な監査基盤や台帳frameworkは追加しない。

### 8.5 validation・provenance・受理の不足をどう閉じるか

新しいSkill回答の受理は、既存B6専用admissionを無効化したり、承認済み字幕転記の入口を偽装したりして行わない。最小executorの入力は「固定plan」「実際のSkill入出力」「その回答を使用する承認/採用記録」。呼出日時・判断手段と版・入力/回答の実体参照を外側の実行記録に保存する。SHA・存在検査・正式byte・公開後再読は既存処理を使い、Skill内へ入れない。

受理検査は既存source package validator、表示終端/行末projection validator、現行注文書validator、既存styleとline layout検査を組み合わせる。projectionが作れるだけでは承認条件を満たしたと扱わない。renderer admissionと物理QCも従来どおり必要である。追加するのは、この一つの固定planとSkill実行証拠を結び付ける専用の受理・公開配線である。

ここは設計上の追加箇所であり、既存B6の検査全体と同等であると未実装のまま断言しない。次工事の最初に、同じ意味入力・既存字幕の保存回答から正式投影と注文書を再現できるかをローカルに確認する。既存validatorで閉じず、ZEVG/ZEVOやrenderer契約の意味変更が必要になった場合は、包装の名目で修正せず不足を報告する。

providerは固定planで一つに限定する。今回providerの新規実走は承認されていない。次工事で採用する判断手段・送信可否・必要な費用条件は指示に明記してもらう。既存の保存回答だけを使う最初の検査には通信不要だが、それだけで新Skillの品質検証を完了としない。Gemini動画理解の追加較正をこの字幕判断へ持ち込まない。

## 9. 「見たものが気持ちいい」を判定できるreview

### 9.1 三つを同じ条件で見る

1. 元動画: 対象となる二つの元場面を参照し、必要な発話・意味・音があるか確認する。新しい素材を取得しない。
2. Skillなし: 現在の既存完成動画。過去の字幕判断は残るが、今回新設するSkillを使用しない基準である。「AI判断が一切ない動画」という意味にはしない。
3. Skill使用: 同じ場面・順序・字幕本文・元音声・画面形式・styleで、表示終端と改行だけを今回のSkill回答から作った動画。

同じ箇所へ移動できる簡素なreview入口を設け、既存の比較ページの構成を利用する。JSON閲覧を主導線にしない。差がある字幕区間を一覧から再生できればよく、新しいレビュー製品は作らない。

### 9.2 人間が答える事項

| 問い | このSkillで確認できること | 誤って主張しないこと |
|---|---|---|
| 元より良いか | 音声に沿って読めるか、文字の切替えが意味を助けるか | 元映像そのものの面白さをSkillが改善したとはいわない |
| Skillなしより良いか | 同一場面で読みやすさ、追いやすさ、自然な改行が改善/同等/悪化したか | 保存回答の再生だけで改善とはしない |
| 不要な部分が減ったか | 不要な改行、細かすぎる表示切替え、前の字幕の残りなどが減ったか | 不要場面の削除や尺短縮は責務外であり、達成したと数えない |
| 必要な部分を壊していないか | 語・固有名詞・反復・つながった文節を壊していないか、必要な文字が読める時間見えるか | 全文字が存在するだけで人間に読めるとは認定しない |

元映像・音声・構成が変わった場合は字幕判断の比較として成立しないので、原因を切り分ける。人間判定は「改善・同等・悪化・判断保留」と具体的な箇所・理由で記録できる形にし、総合点や独自の重みを作らない。

### 9.3 完成と未完成の区別

配線成立は「保存回答から同じ正式入力を製造できる」、技術成立は「新回答を検査し既存Coreで動画を作りQCを通る」、価値成立は「人間が比較して改善を確認し、必要内容の破壊を認めない」。三つを分けて報告する。

同等だけなら包装による再利用は確認できても品質改善は未確認。悪化なら採用せず、入力や判断の問題を範囲内で検討する。字幕表示の品質向上だけで、不要場面の削減、自然な終わり、ダイジェスト/遠方接続の第一完成を宣言しない。

## 10. 今回の現物検査・残る不確実性

コードと正本文書を読み、入力・回答・正式投影・rendererの呼出を追跡した。報告に記載した既存参照56 pathの実在と調査基準commitとのbyte一致を確認した。作業前からの13 pathの内容はすべて保持され、空白エラーの検査も合格した。本工事は文書のみであり、製品コードの新たなtest実走・API実走・描画は行わない。

既存の`evals/clip_composition/reports/presentation/rendering-decoupling-order-review-20260818-v001/review-manifest.json`にある3ケースの注文書・旧動画・新動画、計9参照は、今回すべて現物の存在とSHA一致を再確認した。これは保存済み動画の同一性検査であり、新しい目視判定ではない。代表の字幕新動画SHAは`6b477c886cebabde3bca461613fa23cad8ca8f37b8875385d2f14e003d566036`。

現行v002経路については§8.1の遠方接続動画の実体とSHAを確認した。次の点は未確認として残す。

- 新しい独立Skillの回答品質と、技法を変えたときの判断品質。
- 提案した専用受理配線が既存の全validatorを実際に通ること。
- 現在の実行環境で、新しいjobから既存動画と同じ製造が再現できること。保存済み成功を今日の再実行成功とは扱わない。
- 現行subsetを超える多source、任意形式・任意styleでの製造。
- ダイジェスト全体を共通plan/Skill/Coreで完成させる工程。

これらを巨大frameworkの先行作成理由にせず、選んだ一つの判断から実動画へ届く試作で確認する。

## 11. 提出と次の判断

本報告だけをcommitしGitHub mainへ通常push、local/remote main一致を確認する。reportを既存の`ZEV共有 / ZEV進行管理２ snapshot`へ追加し、MANIFESTに報告追加後のHEADとファイル同一性を同期する。commit自身のSHAを本文に自己参照で埋め込まず、GitとDrive MANIFESTで識別する。

GPT_DECISIONで求める判断は、字幕表示区切りを一意の最初のSkillとすること、現行v002の既存遠方接続例で最小E2Eを始めること、Skillの外側で受理と正式昇格を閉じること、技法横断の問いを共通に保つこと、一般基盤を追加しないことの監査である。実装へ進む場合は、対象path・入力・判断手段と実走条件を含む次の承認済み指示に従う。

この報告提出までが今回の作業範囲であり、監査のcontinueを確認する前にSkill実装へ着手しない。
