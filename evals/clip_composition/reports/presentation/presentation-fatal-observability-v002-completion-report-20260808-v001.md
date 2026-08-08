# fatal観測性v002 完了報告 v001

- 日付: 2026-08-08
- 判定: **実装ゲート完了**
- commit A: `743c5ad4eb3821da6f4fd016ecdb777f85ca0ad3`
- commit tree: `b26ca4b6fa9cb60d62cceeb026c4f7589e85af70`
- 通信: 0回
- 費用: US$0
- 正式成果物変更: 0件
- stable tag変更: 0件

## 1. 実現したこと

旧B1、timeline、意味終端、意味情報package、ZEVO出力の5境界でfatalが起きたとき、既存の外側status・違反code・終了codeを変えず、次の限定情報を正式失敗報告へ残せるようにした。

- 13段階のどこで止まったか
- 14種の閉じたinner codeのどれか
- 既存decoder・validatorで検証できた対象fileのpathとSHA。証明できない場合は`null`

生message、stack、stdout、stderr、字幕本文、secretは保存しない。既存の正常経路・検査済み拒否・正式成果物byteは変えていない。

## 2. 正式検査結果

| 工程 | 結果 | TAP | SHA-256 |
| --- | ---: | --- | --- |
| 新規正式検査 | `81/81` | `test-runs/20260807-fatal-observability-v002/attempt-0003/formal-81.tap` | `7033607988acb6404367a4aec7c0f910e231119fb74d3d8cdfb612d6e0ff55e7` |
| 直接影響 | `130/130` | `test-runs/20260808-fatal-observability-v002-scope-revision/attempt-0002/direct-impact-130.tap` | `4af8ba575d67e421f79b9c226e532daf54fd8d54a37393136e8b922f3ee875bb` |
| 既存green | `287/287` | `test-runs/20260808-fatal-observability-v002-scope-revision/attempt-0002/green-aggregate-287.tap` | `509a20e574bb8f1de2d73e57786995d3ae1b40afe72a3d9ffea4a2ee73dfb977` |
| 正式baseline | `86/203`、fail 117 | `test-runs/20260808-fatal-observability-v002-scope-revision/attempt-0002/baseline-aggregate-181.tap` | `e071fc9a56ef69ecf05b252d832ed9d03a91451de43b11619b9b7767f5abde52` |
| 既存正式tree | `5/5` | `test-runs/20260808-fatal-observability-v002-scope-revision/attempt-0002/five-tree.tap` | `3bff6198715788595cac26076306139fe21ccee96b3f2090dbc9e4e7bdcfa76c` |

各正式commandは固定Node、固定TSX絶対path、`NODE_OPTIONS`不存在、native環境で実行した。該当stderrは全て0 byteである。

旧baseline `64/181`は削除せず、loaderなしで縦型test file全体がmodule起動前に`0/1`へ畳まれた歴史的記録として保持した。現行正式baseline `86/203`では同じfileの23検査が展開されて`22/23`となり、全体の不合格117件は不変である。

## 3. 既存5 tree

| ID | tree OID | 結果 |
| --- | --- | --- |
| FOVT001 | `27affa2cff1e099d263f5a00ed9c4558be1300bd` | 一致 |
| FOVT002 | `454fcf002ac90b0d6ce72f63f55476ed9f8ffc72` | 一致 |
| FOVT003 | `53076722863d2c36d470cc4ce9503739406ec03a` | 一致 |
| FOVT004 | `ce2f5807db5ff63b83e1200bcec9f40796210327` | 一致 |
| FOVT005 | `5e65c51ad30a65f43b087a71b50f6172162b2c49` | 一致 |

commit Aにはこの5 rootの変更が0件であることも確認した。

## 4. commit Aの18 path SHA-256

以下は作業ツリーではなく、commit Aのtreeから再計算した値である。

| ID | path | SHA-256 |
| --- | --- | --- |
| F01 | `evals/clip_composition/presentation_fatal_observation_v002.mjs` | `cf95c2ba8785be681dcecc03dc4ec009d6f02b4161e3c39f7edbf431b92b6115` |
| F02 | `evals/clip_composition/presentation_fatal_observation_v002.test.mjs` | `d9dca43db6cd8decb11aae97923a3ca2f3d645336500116ac8ce057edf533279` |
| F03 | `evals/clip_composition/presentation_fatal_observability_v002.integration.test.mjs` | `0aa84fcc656fccf8970aff6f33614715f4173193875a6bdee7b609dec0335b5d` |
| F04 | `evals/clip_composition/presentation_timeline_composition_decision_v001.mjs` | `6bd3adba0b12d118df93ffd978c29a727db49003c8391d47f82f23a14ea796ba` |
| F05 | `evals/clip_composition/presentation_meaning_boundary_source_package_v001.test.mjs` | `bcbf40370e58505b0c389956c0d9f39c98d6e51749af60928dc9e666b1c4fae7` |
| F06 | `evals/clip_composition/run_presentation_caption_semantic_output_check_v002.mjs` | `660d01933b114aab6568489dd7477d89351030ceba124ff4a60edb791532409c` |
| F07 | `evals/clip_composition/test_presentation_caption_semantic_output_v002.mjs` | `7dba1c1ada6d6f53b72a58945b8a78dac5ae23177fe0990feebae96e7d228a18` |
| F08 | `evals/clip_composition/presentation_meaning_boundary_selection_v001.mjs` | `52ea9c4505c515ed998297136c242b2a19e1e02ff0f7ad80e9f0aa7a7db33771` |
| F09 | `evals/clip_composition/presentation_meaning_boundary_selection_v001.test.mjs` | `605b7060cc8f1835f912bfee6ad17d709d7f14bb5582fcce3b7a842a93d43cd9` |
| F10 | `evals/clip_composition/presentation_meaning_information_package_v001.mjs` | `46562003fabb1032b1422c2fe266e79f8a6f30f8c27214302f8436c670276567` |
| F11 | `evals/clip_composition/run_presentation_meaning_information_package_job_v001.mjs` | `d76e4de69893aaaa954939627859ffa25788b8aee1b8801a832ee7539b2be8df` |
| F12 | `evals/clip_composition/presentation_meaning_information_package_v001.test.mjs` | `f80fa3b196a37b9ff6fa61c2eaa735350f5add2b4dc5024fbe8786ce08c8abd7` |
| F13 | `evals/clip_composition/presentation_output_contract_v001.mjs` | `95f1da2029a3cf0dda4fa873490321d2aa92ea6bfb548f38d939a0800f5bd5b8` |
| F14 | `evals/clip_composition/presentation_output_contract_v001.test.mjs` | `4349968087d403527d3b11de44a6e0b126adde40c0bd92ae45588cb738d8f7e6` |
| F15 | `evals/clip_composition/presentation_output_render_plan_v001.mjs` | `72789a7ec0b9d272c226543d7aa17e5a2e1f866e2cc31c21abb89311adf28c5b` |
| F16 | `evals/clip_composition/run_presentation_output_job_v001.ts` | `b325908f0e13ffdc34120d01dae820b37328d6eae395e2cd543669f4b7505d49` |
| F17 | `evals/clip_composition/presentation_output_render_plan_v001.test.mjs` | `c735b590a6dfa226df9cd98c7429824f5cad0f69cff2d2d935c30ee159516391` |
| F18 | `evals/clip_composition/render_presentation_v002.mjs` | `ea775b314cc149c65d384603dbc39f3260e3ba8e4a32d99a6275941bf31dd223` |

F05は設計上の18 pathに含まれるが、開始時からbyte不変である。

## 5. 範囲改訂の補助1 path

| path | SHA-256 | 意味 |
| --- | --- | --- |
| `evals/clip_composition/render_presentation_vertical_review_v001.ts` | `6fb4edfd9c9a9161f474921368b05bd32c0aaef2b1fd5155e148d291134c8c75` | OEE002で確定した生成時来歴とlive束縛の分離を適用 |

この補助pathを18 pathへ黙って混ぜず、別枠として記録した。OPF002の検査台帳はF17内にあり、このSHAを承認済み変更として束縛して130/130へ到達した。

## 6. commit scope

commit Aは100 filesである。内容は、承認済み18 pathの実差分17件、補助1 path、DECISIONS、契約・設計・停止・診断記録、全attemptのTAP/stderrである。無関係な素材、動画、正式成果物root、theme作業、別系統の大量未追跡fileは含めていない。

## 7. 事実・推測・未確認

### 事実

- 完了条件は全て成立した。
- 既存status、違反code、終了code、正式成果物、stable tagは不変である。
- fatal観測性v002はcommit Aへ固定済みである。

### 推測

- なし。

### 未確認

- なし。本実装ゲートに必要な作業は残っていない。

## 8. 停止点

本報告の提示で停止する。次工程には着手しない。
