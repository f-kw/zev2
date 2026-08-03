# 意味情報／表現境界 実装完了報告 v001

日付: 2026-08-03

状態: **実装ゲート完了。次工程へ自動進行せず停止**

実装commit A: `a1fd43d890fe12bb2c6db432b4d9cdfd828d4a8f`

## 1. 結論

ZEVが作る意味情報と、横型・縦型ごとの見せ方を分けるforward-only経路を実装した。

一つの意味情報パッケージから、出力側が形式別の行折り、配置、crop、preset適用、描画計画を決定する配管が、合成入力では最初から最後まで機械合格した。既存の横型2本・縦型1本は変更していない。

本完了が証明するのは**新しい境界と決定的plannerの機械的成立**までである。実データでのGemini実走、横型・縦型の描画、日本語改行の読みやすさ、人間目視合格はまだ実施していない。

## 2. 最終周回で行った限定修正

OEE001の検査は、実際のQC結果に「小数が必ず存在する」と要求していた。契約は有限小数を**受理できること**を求めるが、全ての正常入力で小数の**存在を必須化**してはいない。

そこで単純にassertを削除せず、人間認定済みcrop係数と同じ数値区分に属する有限小数を含む決定的な合成入力を、正式なQC構築・検証経路へ通した。`0.5`と`1000.5`が欠落・丸め・拒否されずに保持されることを検査し、小数受理経路が実動した証拠へ置換した。

- 変更した検査期待: OEE001の1件だけ。
- production変更: 0件。
- 契約変更: 0件。
- 正式成果物変更: 0件。
- `npm exec`等のpackage導入を伴う実行: 0件。
- 外部通信: 0回。
- 費用: US$0。

## 3. 検査結果（事実）

### 3.1 新経路の正式検査

| 項目 | 結果 | 証拠 |
|---|---:|---|
| 正式検査 | **205/205合格** | `test-runs/20260803-meaning-output-boundary-v001/formal-205-attempt-v007.tap` |
| TAP SHA-256 | `1d9a5fec540b43bfe004804a428a2973775516cdc13bd06bc41733cf2dc403bf` | 43,810 byte |
| stderr | 0 byte | SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 全検査ID保存 | 205件を各1回 | missing 0 / extra 0 |

同attempt内での修正・再試行は行っていない。

### 3.2 既存の正常系gate

| 検査群 | 合格 |
|---|---:|
| 残存発話抽出 | 50/50 |
| 境界証拠 | 21/21 |
| 意味入力v002 | 10/10 |
| 意味回答v001 | 161/161 |
| 意味回答v002 | 8/8 |
| 基礎映像＋timeline v002 | 15/15 |
| レイアウト検査 | 12/12 |
| API費用保護 | 10/10 |
| **合計** | **287/287** |

一括TAP: `test-runs/20260803-meaning-output-boundary-v001/existing-green-gates-after-v007.tap`

SHA-256: `d444c0c5463eab6f22221e420612db6bdf1bbeae345702eb4b811eaa23366653`

### 3.3 既知baselineの不変

既知の未合格を「直った」と扱わず、設計時に固定した件数と完全一致した。

| 検査群 | 今回 | 固定baseline |
|---|---:|---:|
| 意味入力v001 | 43/133 | 43/133 |
| 基礎映像生成v001 | 6/20 | 6/20 |
| renderer v002 | 12/19 | 12/19 |
| 縦型確認renderer | 0/1 | 0/1 |
| 縦型正式経路 | 3/6 | 3/6 |
| 基礎映像・renderer接続 | 0/2 | 0/2 |
| **合計** | **64/181** | **64/181** |

一括TAP: `test-runs/20260803-meaning-output-boundary-v001/known-baseline-after-v007.tap`

SHA-256: `cd8b2cb84803cf4b9dfc1a8f5981b3efd9ddd3467f9f7ed89e381fa19d32aca3`

### 3.4 既存3本の最終照合

| 既存成果物 | 安定tree OID | 結果 |
|---|---|---|
| candidate 13 横型 | `27affa2cff1e099d263f5a00ed9c4558be1300bd` | 一致 |
| candidate 59 横型 | `454fcf002ac90b0d6ce72f63f55476ed9f8ffc72` | 一致 |
| candidate 59 縦型 | `53076722863d2c36d470cc4ce9503739406ec03a` | 一致 |

照合TAP: `test-runs/20260803-meaning-output-boundary-v001/stable-three-trees-after-v007.tap`

SHA-256: `509a390ad33783375fcd351a62cce2424c549f55728218ffaf41cc3c5fd4369c`

## 4. commit Aの27ファイルSHA表

以下は作業treeではなく、commit Aのtreeから導出したSHA-256である。

| ID | path | commit A file SHA-256 | 処理上の役割 |
|---|---|---|---|
| M01 | `evals/clip_composition/presentation_timeline_composition_decision_v001.mjs` | `d113c3ffd683353e08d8de070eaa9ba33e0b61f5cc3ede698bd483f9ec274c1e` | 区間構成を純意味情報として固定する |
| M02 | `evals/clip_composition/presentation_meaning_information_package_v001.mjs` | `6f2e6b33dd7c73206abe3cdbb354d2f10f014192187a9655404b43b6c5dffe42` | 字幕本文・発話時刻・区間・タイトルを全量閉包する |
| M03 | `evals/clip_composition/run_presentation_meaning_information_package_job_v001.mjs` | `edb98e7e9c187101d7bde8e902e7cfbdc8c0a40b75f987e338acafc19864e322` | 意味情報パッケージjobを正式入口から実行する |
| M04 | `evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs` | `fea5926ceffb2efc0815e4f31490e27f31fc3a59c90b122196b8385f01cd9a9b` | Geminiへ渡す意味終端選択用入力を構築する |
| M05 | `evals/clip_composition/run_presentation_meaning_boundary_b5_b6_v001.mjs` | `3fc2ad6d5349e736117cc978de565d81171311190454f17a65150b986fc15d5e` | token計測と意味終端選択の正式実行を制御する |
| M06 | `evals/clip_composition/presentation_meaning_boundary_selection_v001.mjs` | `455e209fc00ae1cd14548f5e1dc950dd703736a2050c39988fcb91f55116afb9` | Gemini回答を候補終端へ厳密に写像する |
| M07 | `evals/clip_composition/presentation_meaning_information_package_v001.test.mjs` | `19a30bb4debf03af26b219bd5b6b6bdd3942ff04a036983b84e6a0c1e68f4184` | 意味情報パッケージの閉包を検査する |
| M08 | `evals/clip_composition/presentation_meaning_boundary_source_package_v001.test.mjs` | `bcbf40370e58505b0c389956c0d9f39c98d6e51749af60928dc9e666b1c4fae7` | 意味終端選択入力の境界を検査する |
| M09 | `evals/clip_composition/presentation_meaning_boundary_b5_b6_v001.test.mjs` | `c66734c1fcc306de5cd75efaa2e54b64f0a6a4b775a1184bdb67b6f660293634` | B5/B6の通信・費用・保存規律を検査する |
| M10 | `evals/clip_composition/presentation_meaning_boundary_selection_v001.test.mjs` | `ca6b154d51acbce059ce19b10a3224bd6c6db2f76dd28d19c911d17683820d78` | 意味終端回答の受入と拒否を検査する |
| O01 | `evals/clip_composition/presentation_output_base_media_v001.mjs` | `2a7c01e3b60059350ffbf80494b4e4ba041f0624b05bc96c92f356448e15fd06` | 純意味区間から出力用基礎映像を組み立てる |
| O02 | `evals/clip_composition/run_presentation_output_base_media_job_v001.mjs` | `9bd71d7d387a9e8b45de3003cbc51433a77664439f18fb40d396a2e82d8f6a12` | 出力用基礎映像jobを正式入口から実行する |
| O03 | `evals/clip_composition/presentation_output_contract_v001.mjs` | `3ef748913f60974c06cd1cd496ad5009e85a42639c8c4557869b252e17aefe35` | 出力側入力と成果物のexact schemaを検査する |
| O04 | `evals/clip_composition/presentation_output_page_line_planner_v001.mjs` | `9f5a84af0804a80a49a20e1350e86a1f301ef6bc8ac07c555893aba99656b5f0` | 意味まとまりを形式別に決定的にページ・行へ折る |
| O05 | `evals/clip_composition/presentation_output_style_resolver_v001.ts` | `5d3c97866d48aac877ba085849a9ba7cda2aaf79f19d8bbcd01c939714fde68b` | preset・幅・cropなど出力側のスタイル入力を解決する |
| O06 | `evals/clip_composition/presentation_output_render_plan_v001.mjs` | `e2e5fb23562a50bc0560dad1f9d210ba8009548bdba05b7394ae4ed458783391` | 行・配置・cropを描画計画へ統合し物理成立を検査する |
| O07 | `evals/clip_composition/run_presentation_output_job_v001.ts` | `f4e8994e4dc08879cdbce55fa38e28bf126bdae1fac7b9cc8ac8cc9341db8e5e` | 出力側の全工程を一つの正式jobとして実行する |
| O08 | `evals/clip_composition/presentation_output_base_media_v001.test.mjs` | `71183d1fe005be6eeb1058882758f13cc3d6c3d1f076566b181a8b1bd6fc7d6e` | 出力用基礎映像の正常・拒否経路を検査する |
| O09 | `evals/clip_composition/presentation_output_contract_v001.test.mjs` | `001c7ef61d80e560fe50290fb367d1022168fe476b38a78923587b7a13336ac1` | 出力側契約のexact受入を検査する |
| O10 | `evals/clip_composition/presentation_output_timeline_mapping_v001.test.mjs` | `04665e40f0a1f9ab713d4f248c8f0340001f589b82e2c9925b009b274cef72a7` | 元時刻と合成後時刻の全量写像を検査する |
| O11 | `evals/clip_composition/presentation_output_page_line_planner_v001.test.mjs` | `f9f8da20f63121250365597d1597a73f74873d9dcd66fcd585f3b95a6410a065` | 決定的なページ・行折りを検査する |
| O12 | `evals/clip_composition/presentation_output_style_resolver_v001.test.mjs` | `22169b74fc8b804e4a7815a0b2b5e93ea66417e164d9300d7741245cb1d1d389` | 横型・縦型のスタイル入力解決を検査する |
| O13 | `evals/clip_composition/presentation_output_render_plan_v001.test.mjs` | `53d5850ab4de7b6c27d1b7210c174d794214c09906c40bc5e931b48b95910d08` | 描画計画、QC、既存3本の不変を検査する |
| X01 | `evals/clip_composition/presentation_renderer_plan_v002.mjs` | `3a77c7feb7005fa06d7e45a6364f76ab4bc40a8622370568cf557d5090f08b79` | 既存renderer計算をpure入口として再利用する |
| X02 | `evals/clip_composition/inspect_presentation_preset_layout.ts` | `416a81b54b18be6a6ccdd5906d3a3730bd0455edfe4be7002c9c6c4ccf2f8843` | 既存layout計算をpure入口として再利用する |
| X03 | `evals/clip_composition/presentation_caption_api_cost_guard_v001.mjs` | `29ac0e7e4d54400d8063bd35caab5272a64474b3c00a306d49b33aa0092db57b` | 既存API支出上限計算をpure入口として再利用する |
| X04 | `evals/clip_composition/run_presentation_caption_gate_b6_v001.mjs` | `ecad17891d63038647e2be0634b5844d2d117c38ea6e07ccef470d2887e56204` | 既存B6応答保存・受入処理をpure入口として再利用する |

## 5. 実行環境（事実）

- Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`
- Node実体SHA-256: `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c`（job固定値との一致を実行前に確認）
- TSX loader SHA-256: `f06fb3da72f722ec9a2c3e8502f750ae1b6300b93fb76e8a52548dba69b6730f`（job固定値との一致を確認）
- TSX package SHA-256: `e84b6af2fe6ddf9cae613ee92b41d1c67627dcbc14fe3b7e490d0b545b8e9dbe`（job固定値との一致を確認）
- 正式検査・回帰とも固定Node／固定TSX実体だけを使用した。
- API keyの読取・外部送信・秘密の保存は行っていない。

## 6. 推測

- 合成入力で意味情報から横型・縦型の描画計画まで通ったため、境界の基本構造は実データrunへ進める状態にあると考える。
- 同じ意味情報を二形式で共用するため、形式ごとにGeminiへ同じ判断を再依頼する必要はない見込みである。

これらは実データ実走前の見込みであり、品質合格の事実ではない。

## 7. 未確認・未実施

- B5 `countTokens`。
- B6 Gemini生成。
- 正式な意味情報パッケージ、基礎映像、横型・縦型mp4の生成。
- 日本語の行折りが人間に読みやすいかの目視。
- 横型・縦型の運用採用。
- 新経路でのAPI実費。

これらを本完了報告の合格範囲へ含めない。

## 8. 停止点

実装ゲートは完了した。初回実データ横型＋縦型runの承認依頼は別文書として準備したが、素材・対象区間・二形式のstyle入力・支出上限の固定とkawafmmの別承認が必要である。本報告をもって停止する。
