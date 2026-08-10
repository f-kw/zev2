# A-v002案B 正式attempt前監査 v001

日付: 2026-08-09  
対象: 旧層1 v3の人間合格済み3切断を「意味atom一件 + 1件以上の採用元時刻片」で扱うforward-only経路  
閉包書: `presentation-a-v002-exact-implementation-closure-20260809-v001.md`  
閉包書SHA-256: `2e64fa71b33463db0d5925d6c194c07b42f49af0ffb4af0586e7be49f06e47eb`

## 1. 監査結論

- exact実装表は24 pathで閉じ、承認上限26 path以内である。25・26 path目は使わない。
- 一括事前確認は92/92合格。これは正式attemptではなく、正式TAPは未作成である。
- ZEVGは、VAD観測だけでremoveを確定せず、人間認定、親媒体、生proposalを一意に照合する。採用区間列は外側区間から認定removeを除いたexact補集合として再計算する。
- 意味packageは一つの元atomを一度だけ保持し、`retainedSpans`に半開区間を1件以上持つ。本文、順序、時刻、caption参照の全量閉包を独立に検査する。
- ZEVOは既存のframe mapper、物理planner、共通描画、QCを唯一の計算正本とし、新しい係数や候補固有値を一般処理に持たない。
- 縦型3本は全画面containの字幕跨ぎ診断であり、正式preset・crop・公開品質を主張しない。
- 正式attemptを開始してよい。不合格1件で同attemptの修正をせず停止する。

## 2. 実装後・正式attempt前の8項目

| # | 項目 | 判定 | 根拠 |
|---:|---|---|---|
| 1 | 定義・import・export実在 | 合格 | 24 pathの全参照先を実在照合。v1 plannerとrender projectionの共有入口はv1自身とv2の両方が呼ぶ。 |
| 2 | rejectedとfatalのcatch分離 | 合格 | 検査済み違反は終了1、I/O・tool・資源・報告不能は違反0件の終了2。runner 0/1/2正例を実行。 |
| 3 | 子process値と生出力の非漏洩 | 合格 | proof jobは固定toolの構造化結果と既存fatal観測語彙だけを保存し、stderr・stack・生message・秘密を成果物に持たない。 |
| 4 | target fileの検証済みbinding | 合格 | 親、source sequence、meaning package、timeline、style支援物、toolはformal/canonical/file SHAを実読取値で照合。自己申告値のみで進まない。 |
| 5 | 保存先不正とno-replace競合の分離 | 合格 | 固定root以外のjobを受理せず、正しいrootの既存・公開競合はpublication failureが所有。全作成物はno-replace。 |
| 6 | normal/rejected/fatal実経路 | 合格 | ZEVG 23 code、ZEVO 16 codeの全39 codeを固定92 ID内の実枝で観測。source/meaningは実runnerで再読・no-replace・0/1/2を確認。 |
| 7 | 実行環境 | 合格 | 固定Node `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`、固定TSX絶対path、`NODE_OPTIONS`不存在、固定Node先頭PATH。実描画はネイティブ環境とChromium起動可能を再確認して開始する。 |
| 8 | 24 pathと既存成果物 | 合格 | 実装・検査はexact 24 pathに閉包。既存正式3本、stable tag、保存済み人間結果への書込は0。 |

## 3. 実装中の検出と修復周回

正式attempt前の自己修復は2周で閉じた。これ以後に新しい穴を見つけても3周目のpatchは行わない。

1. 初期実装に、人間結果の生形式、物理owner、proof runnerの読取・公開経路の粒度差があった。exact schema、既存owner、正式runner呼出しへ接続した。
2. 値レベル監査で、別媒体への認定流用、採用区間のexact補集合、未発火code、meaning/timeline束縛、実測frame、固定tool、一回root確保を補強した。

途中で強化後のsource coreが成立不能にした冗長fixtureが1件あり、37/38となった。production不合格ではなく、同じ違反を下流まで重ねる不成立な検査設営を取り消した。最終固定列は38/38である。

## 4. 違反codeの実発火対応

### 4.1 ZEVG source sequence 10 code

| code | 観測ID |
|---|---|
| `A_SOURCE_SEQUENCE_JOB_INVALID` | ASQ003, ASQ014 |
| `A_PARENT_SEMANTIC_INPUT_INVALID` | ASQ003 |
| `A_REMOVAL_DECISION_INVALID` | ASQ013 |
| `A_REMOVAL_DECISION_NOT_APPROVED` | ASQ004, ASQ005 |
| `A_REMOVAL_DECISION_OUTSIDE_RANGE` | ASQ006 |
| `A_REMOVAL_DECISION_OVERLAP` | ASQ007 |
| `A_ADOPTED_SEQUENCE_EMPTY` | ASQ009 |
| `A_ADOPTED_SEQUENCE_INVALID` | ASQ008, ASQ011 |
| `A_SOURCE_SEQUENCE_BINDING_MISMATCH` | ASQ014 |
| `A_SOURCE_SEQUENCE_PUBLICATION_FAILED` | ASQ014 |

### 4.2 ZEVG meaning package 13 code

| code | 観測ID |
|---|---|
| `A_MEANING_JOB_INVALID` | AMP016 |
| `A_MEANING_PARENT_INVALID` | AMP007 |
| `A_MEANING_SEQUENCE_INVALID` | AMP015 |
| `A_SOURCE_ATOM_INVALID` | AMP007 |
| `A_SOURCE_ATOM_ORDER_INVALID` | AMP008 |
| `A_SOURCE_ATOM_SPAN_MISMATCH` | AMP004 |
| `A_SOURCE_ATOM_FULLY_REMOVED` | AMP006 |
| `A_SOURCE_ATOM_TEXT_MISMATCH` | AMP009 |
| `A_CAPTION_COVERAGE_MISMATCH` | AMP010 |
| `A_CAPTION_TEXT_MISMATCH` | AMP011 |
| `A_MEANING_BINDING_MISMATCH` | AMP012, AMP016 |
| `A_MEANING_PACKAGE_BYTE_INVALID` | AMP014 |
| `A_MEANING_PUBLICATION_FAILED` | AMP016 |

### 4.3 ZEVO 16 code

| code | 観測ID |
|---|---|
| `OUTPUT_V002_PIECEWISE_INPUT_INVALID` | OPT010 |
| `OUTPUT_V002_SPAN_UNMAPPED` | OPT006 |
| `OUTPUT_V002_SPAN_AMBIGUOUS` | OPT005 |
| `OUTPUT_V002_SPAN_ORDER_INVALID` | OPT004 |
| `OUTPUT_V002_FRAME_GAP` | OPT007 |
| `OUTPUT_V002_FRAME_OVERLAP` | OPT008 |
| `OUTPUT_V002_ZERO_FRAME` | OPT009 |
| `OUTPUT_V002_FRAME_MAPPING_INVALID` | OPT010 |
| `OUTPUT_V002_PLANNER_INPUT_INVALID` | OPLV2009, OPLV2010 |
| `OUTPUT_V002_TEXT_COVERAGE_MISMATCH` | OPLV2010 |
| `OUTPUT_V002_LAYOUT_UNRESOLVED` | OPLV2005, OPLV2012 |
| `OUTPUT_V002_RENDER_PLAN_INVALID` | ORPV2006 |
| `OUTPUT_V002_RENDER_PROJECTION_MISMATCH` | ORPV2004, ORPV2008 |
| `OUTPUT_V002_BASE_MEDIA_INVALID` | ORPV2006, ORPV2007 |
| `OUTPUT_V002_PUBLICATION_FAILED` | ORPV2007 |
| `OUTPUT_V002_QC_FAILED` | ORPV2008 |

## 5. v1処理結果と来歴の分離

- planner v1は既存の候補生成・物理検査・tuple選択本体を純粋入口へ移し、v1自身もその入口を呼ぶ。OPL028の固定結果hashは一致し、OPL029はv2側に同計算がないことを確認した。
- render v1は既存element投影本体を共通入口へ移し、v1自身もその入口を呼ぶ。ORP017の固定結果hashは一致し、ORP018はv1/v2共用を確認した。
- v1の処理結果は不変。実装fileのSHA変化は共通入口抽出の承認済み来歴として別層で扱う。生成時SHAと現在SHAの同一要求は再導入しない。

## 6. exact 24 path SHA-256

| # | path | SHA-256 |
|---:|---|---|
| 1 | `evals/clip_composition/presentation_a_source_sequence_v002.mjs` | `c20401d398956710842823e9ec2677f07cf5686c9f04b03c1df1532d540e09ec` |
| 2 | `evals/clip_composition/presentation_a_source_sequence_v002.test.mjs` | `2ff5afe428443f2e9c7f3e00eb3f285eaf02c97ce260bd6e2194ec38f9e55062` |
| 3 | `evals/clip_composition/run_presentation_a_source_sequence_job_v002.mjs` | `a564bd336f8bd5d03e9052b6e727b844c894897f4a5a20b2bf2fc0154198cec2` |
| 4 | `evals/clip_composition/presentation_a_meaning_information_package_v002.mjs` | `40a85f526666dd5f68bf64d141a5236146ae5b8e2baf285d4390bef41410e1a2` |
| 5 | `evals/clip_composition/presentation_a_meaning_information_package_v002.test.mjs` | `8b09ec33818948aff3a102c264070ebf2dfdbc64516abf6e668eea341c59c9fe` |
| 6 | `evals/clip_composition/run_presentation_a_meaning_information_package_job_v002.mjs` | `2bdf703d830a03a6ccf4d1988e268cd198b30de3faec7a99d6f0fb18209845eb` |
| 7 | `evals/clip_composition/presentation_output_piecewise_timeline_v002.mjs` | `72305c31005fa8b64d3b881a07a315e619eba36677bf1f8b691b2af4c4623516` |
| 8 | `evals/clip_composition/presentation_output_piecewise_timeline_v002.test.mjs` | `8e8ebbbf30c383ca718a2c15793ccc44c8ccd39d0e0759fc34674f6918efdb6f` |
| 9 | `evals/clip_composition/presentation_output_page_line_planner_v002.mjs` | `7c7d4db95dd3ae8a264b0bcf8d7b3d27e1b57034a233e95e99613bf213bec502` |
| 10 | `evals/clip_composition/presentation_output_page_line_planner_v002.test.mjs` | `07daa56bc6bed1cd44ab973a6c6ef769dcb176fad5c6c999cf611556851b75e5` |
| 11 | `evals/clip_composition/presentation_output_render_plan_v002.mjs` | `80623c9690be58ea4db59eec40d76af3c0f51e3f5c860b0c985c78832e88fe01` |
| 12 | `evals/clip_composition/presentation_output_render_plan_v002.test.mjs` | `4fa5c44cc73154dc6b949e4b6a9b6c62cbfa509c1de2223252eac29db83ba093` |
| 13 | `evals/clip_composition/presentation_output_page_line_planner_v001.mjs` | `c1204f0ef6321510263358414f29f17be85050670e9d96e9c30f6387f3b8913f` |
| 14 | `evals/clip_composition/presentation_output_page_line_planner_v001.test.mjs` | `4bfb9f5a4cb99417431b272845dc6f7a30721b8785d9276b9ba553d0d48094d2` |
| 15 | `evals/clip_composition/presentation_a_v002_layer1_v3_fixture_v001.mjs` | `f48a8a0e7aa37946fddada05d93b4bd9dbf47cb6c4445ebf51e2c8939f24700f` |
| 16 | `evals/clip_composition/presentation_a_v002_layer1_v3_fixture_v001.test.mjs` | `6a8c9c0271bcf716dc245dd7b358d51bdba98539969074c8640a8e9a2b2e942d` |
| 17 | `evals/clip_composition/presentation_a_v002_vertical_caption_diagnostic_v001.mjs` | `4782b56fce59702bdb002deafd1989f86f19dc7936c7341d890be0adf51876c9` |
| 18 | `evals/clip_composition/presentation_a_v002_vertical_caption_diagnostic_v001.test.mjs` | `1a11a93099f4832bf981f1ee25434997555e488231d38ada583a019d75f69f24` |
| 19 | `evals/clip_composition/run_presentation_a_v002_layer1_v3_proof_job_v001.ts` | `b0fbfe3fda894d97b8b6544b6249b3e9c3b85b824fb8e1457407ae2e1b077715` |
| 20 | `evals/clip_composition/run_presentation_a_v002_layer1_v3_proof_job_v001.test.mjs` | `ecc9ce115b2e9bd1f274fd76e67ffab0cd34ffa0ff6fc2ebfab0df91766d07b3` |
| 21 | `evals/clip_composition/presentation_a_v002_review_ui_v001.mjs` | `bae53b0b60deba96d4645ac6b00a9afc870d096e5c2e9ad84751145f84cf986b` |
| 22 | `evals/clip_composition/presentation_a_v002_review_ui_v001.test.mjs` | `3aef1c773abf270a466fb4369a22c6d79508565f00a0e4e2a2c2fb4464b62fd9` |
| 23 | `evals/clip_composition/presentation_output_render_plan_v001.mjs` | `fb7a7ea2839444955ab7a8da6c86d38ab7007c2627af4e00e210d6bda2b7ab82` |
| 24 | `evals/clip_composition/presentation_output_render_plan_v001.test.mjs` | `9e9e12ca3b4d2eb5eb9d0eab7993b5a3ccd2a76024efa4e37b6d7a3b54a0464b` |

## 7. 正式attempt前環境

- Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`
- TSX: `/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs`
- PATH: 固定Nodeを先頭にした既定の固定列
- `NODE_OPTIONS`: 不存在
- 事前確認: 92/92合格、60件の対象外IDはname filterでskip
- 正式attempt: 未実施

## 8. 後続訂正

本監査の「正式attemptを開始してよい」とする当初結論は、正式attempt開始直後の独立再監査で不完全と判明した。元の記録を上書きせず、次の訂正を追記する。

- source sequenceとmeaning packageは、それぞれの子runner内で開始時・公開直前再読とno-replaceを満たしている。
- proof runnerは子runnerの返却bindingをstrict byte・file SHA・canonical SHAで検査して消費するが、その2成果物をproof全体の公開直前再読集合へ登録していない。
- 最終`render-plan-v002.json`はmeaning package bindingを直接参照し、meaning packageのprovenanceはsource sequence bindingを持つ。そのため、子runner返却後からproof completionまでの差し替えを外側が検出しない窓が残る。
- 契約設計§4の「各bindingは開始時と公開直前に再読」、閉包書§4.5の「上流JSONを開始時と公開直前に再読」に未到達である。
- 後続判定は「正式92検査は合格したが、A-v002実装ゲートは未完了」とする。修正は新しい周回の人間承認が必要である。

