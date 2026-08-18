# ④.5 レンダリング疎結合化 完了報告 v001

今どこ: 注文書・受領書・新renderer runnerの疎結合境界を実装し、字幕横型1本・タイトル横型/縦型各1本の実描画、QC、回帰、tree不変照合まで完了した。

次に何が起きるか: kawafmmが注文書レビューページで、注文書と分離前後の3ケースを確認する。本work-order内の追加実装はない。

kawafmmの判断が要るか: 本work-orderの機械検証には不要。人間レビュー後の次工程・commit/tagは別の第1層判断である。

## CURRENT_GOAL 4項

1. 今の目的: 動画出力を別プログラムへ分けて疎結合にする。これにより同時に開発を進められ、中間生成物をレビューでき、修正の影響が小さくなって検証しやすくなり、クオリティを上げやすくなる。
2. 主計画上の現在位置: ④字幕品質v002は完了（`stable/caption-quality-v002-20260816`）。④.5 レンダリング疎結合化（演出指示書境界の実装）の着手前。これが済むと⑤美しいレンダリング・⑥遠方接続・⑦骨格清書が並列化できる。
3. 今の作業と目的への接続: 契約設計v001に基づく実装工事。注文書・受領書・出力側行分割・新renderer runnerを作り、字幕横型1本とタイトル2本で「注文書を人間がレビューできる状態」を実証する。正本path上限25件。
4. 今回やらないこと: 字幕縦型 / G4〜G7 / renderer表現力の拡張 / 旧プログラムの物理削除 / A-v002の目視合格・tag / commit・tag・公開 / API通信・費用支出。

第2項は現物の転記であり「着手前」のまま未同期だが、第3項と本報告の実測では④.5実装・検証完了である。CodexにはCURRENT_GOALを書き換える権限がないため変更していない。

## 1. 結論

work-order `PRESENTATION-RENDERING-DECOUPLING-V001` の機械検証は完了した。

- 注文書、renderer job、独立受領書、行分割成果物を別fileとして正式公開できる。
- caption/titleの正式runnerは旧直結描画を使わず、新renderer runnerへ接続する。
- 人間合格済みの意味上の行末を別projectionとして明示的に受け渡し、字幕voice-013の旧24/14行分割を再現する。
- 3ケースとも描画・QC合格。本文、表示区間、行の折り方は分離前と一致する。
- 正式44 ID、baseline、5 tree、A-v002記録対象treeはすべて所定条件に一致する。
- API通信、費用、commit、tag、公開は0件。

## 2. 正式44 ID

| 所有工程 | 契約期待 | test宣言 | TAP observed | TAP passed |
|---|---:|---:|---:|---:|
| PRP | 6 | 6 | 6 | 6 |
| PRI | 10 | 10 | 10 | 10 |
| PRL | 8 | 8 | 8 | 8 |
| PRA | 12 | 12 | 12 | 12 |
| PRM | 8 | 8 | 8 | 8 |
| 合計 | 44 | 44 | 44 | 44 |

- ID集合は四者でexact一致、重複ID 0件。
- TAP: `evals/clip_composition/reports/presentation/test-runs/20260818-rendering-decoupling-formal-44-attempt-0004/stdout.txt`
- TAP SHA-256: `dea7825ec97b15d5acab7e3f9a3a1ddc41f22d686d4fa5a6aab1597ea7e263c1`
- process: exit 0、signal none、stderr 0 byte。
- 四者照合記録: 同attempt rootの`four-way-verification-v001.json`。

## 3. 実描画と分離前後の一致

| ケース | 新動画SHA-256 | QC | 分離前との一致 |
|---|---|---|---|
| 字幕横型 voice-013 | `6b477c886cebabde3bca461613fa23cad8ca8f37b8875385d2f14e003d566036` | passed | 本文、cue終端、frame、全行末がexact。`デスカード、デビルカード` / `来ないんだけど`の24/14を復元 |
| title横型 | `0aa5c83d7c407406eacd604abb337adf98d99913af962da85aebf0f4fe0ddd63` | passed | 本文、180 frame、一行、style適用が一致 |
| title縦型 | `889fb29ac65860528bb70f06c404d236b10dc3e491d7e1d13c85310e578bb890` | passed | 本文、180 frame、11/8文字の二行、style適用が一致 |

最終描画attemptはいずれもexit 0、signal none、stderr 0 byte。外部processの終了code・stderr・signalは出力読取前に独立保存した。

## 4. baseline・tree照合

- 3.38GB fixture: size `3,384,584,064`、SHA-256 `219cd4af6e6560a0819bbca67fe36433cdb5e3f4b3260b42a5285093e9030209`。
- 退避原本: 復元前後でinode `81331159`、mtime `2026-07-22T15:05:23+0900`、size、SHAが不変。
- clean側: copy-on-write複製後のinode `86648062`、mtime・size・SHA一致。指定pathへ残置。
- baseline: 86 pass / 117 expected fail / 203 total、ID・順序・status差0。比較記録SHA `801d5159c3eff105f3a81529aefd6e2ee24de0246680c7acebe2b4038229a0b3`。
- 既存5 tree: 5/5、TAP SHA `e78a0f98a8099b3acefbe68cbcb0022e800bd2ed9523740a009f886c95d4a43e`。
- A-v002記録対象: 2,887件、欠落0、byte差0、記録SHA `386462402f325e92daa378319f8b8681d979f2f41ad2d3195c0cab2fbbf0bc47`。

在庫: 大容量回帰fixtureのlifecycleが未定義である。ランダムsuffix付き一時work pathへ恒久依存し、3.38GB本体の所有・供給・admission契約がないため、骨格清書時に別途扱う。本工事では復元して現行回帰を維持した。

## 5. 注文書の人間レビュー

対象: `evals/clip_composition/reports/presentation/rendering-decoupling-order-review-20260818-v001/review.html`

1. 字幕voice-013の注文書を開き、本文、frame区間、style参照を読む。
2. 分離前動画と新動画を再生し、11 cueの本文・表示区間・行末が同じこと、特に24/14の二行を確認する。
3. title横型で本文・180 frame・一行が同じことを確認する。
4. title縦型で本文・180 frame・11/8文字の二行が同じことを確認する。
5. 各ケースのQCがpassedであることを確認する。

review manifestの注文書・旧動画・新動画9参照は、全件が実在し記載SHAと一致する。HTML SHAは`7459383dbdb01804476dab1feddf3cfb2402fd9502001fee7a18a5ddf9bc17a7`、manifest SHAは`d3336e85a29f8511e81c26e7633216e371acccc12fdfcbcb74885c1cc28ab236`。

## 6. 正本path 24/25

| # | path | SHA-256 |
|---:|---|---|
| 1 | `evals/clip_composition/reports/presentation/presentation-rendering-decoupling-contract-design-20260817-v001.md` | `aec224048ac6131173eb8b69b4b4d45cda88d5646ab3b67e8fa8b5561310df94` |
| 2 | `evals/clip_composition/presentation_cue_end_projection_v001.mjs` | `f85ae2a10d92d6bfb72dcd0a568c03fa1cf72e14e68fc32ab23f104872461d89` |
| 3 | `evals/clip_composition/presentation_cue_end_projection_v001.test.mjs` | `f92718bcd098a355372e12b119e7eb18457571dfa9ca09610c8ab870f1e56340` |
| 4 | `evals/clip_composition/presentation_instruction_artifact_v001.mjs` | `99888864b1213e5e31e24c5c1155e92ec50fae8a8190b8f7d4708071845d5bad` |
| 5 | `evals/clip_composition/presentation_instruction_artifact_v001.test.mjs` | `33c778651c135529e7f03d2a3eab26ca231011f6f518f8ffe1bedacd1663ecca` |
| 6 | `evals/clip_composition/presentation_renderer_line_layout_rule_v001.mjs` | `d92580b3bb0ae8033225bb06b47bbf510b071ba08938c8e65998eb122b8f59a6` |
| 7 | `evals/clip_composition/presentation_renderer_line_layout_rule_v001.test.mjs` | `46d23f16b3d6e3e79686cc67003608971b0f9a6c732e900de585d2cc417d140e` |
| 8 | `evals/clip_composition/presentation_renderer_admission_receipt_v001.mjs` | `d0056889b76bee5a75f94701bd10d1c9687d1af68e66a5e570e971de09d0a75a` |
| 9 | `evals/clip_composition/presentation_renderer_admission_receipt_v001.test.mjs` | `8a87b0899328c906a35280566e35ecc4910308d8ea5575f80f3b094efa3a38a1` |
| 10 | `evals/clip_composition/run_presentation_instruction_renderer_job_v001.ts` | `bd3f491e33fc2fe2e44fc2a24395b76b1d839478ed6771f6b46749efc69190e3` |
| 11 | `evals/clip_composition/run_presentation_instruction_renderer_job_v001.test.mjs` | `2039da71c89da4fdd959cff416b8ddfe6a029a6e249fda6748db285a37e45d4d` |
| 12 | `evals/clip_composition/run_presentation_zevo_caption_quality_v002_proof_job_v001.ts` | `d97b8f44ff5be0b09618f91b9fc8f3fa021e202ffe05c14f25df7e16b93f188e` |
| 13 | `evals/clip_composition/run_presentation_zevo_caption_quality_v002_proof_job_v001.test.mjs` | `61573af7f233741dcdc545b42da3b750981ce83aeadafe50481df76ab7004d32` |
| 14 | `evals/clip_composition/run_presentation_zevo_caption_quality_v002_fixture_job_v001.mjs` | `55accf5ce00f942119e6475824b11605d2a31238248f0b48231b6c1a6229ac4d` |
| 15 | `evals/clip_composition/run_presentation_zevo_caption_quality_v002_fixture_job_v001.test.mjs` | `76ce8c051456bdd52d971b1ee05faad660be8241607ccacee2907f3593b6b5de` |
| 16 | `evals/clip_composition/run_presentation_output_title_job_v001.ts` | `409b7701da28366c28186388563d0dab367c74598f5a8993e3b77fef3f681eb3` |
| 17 | `evals/clip_composition/run_presentation_output_title_job_v001.test.mjs` | `45ee1451eea3d4083b8d1ead60c01b4e3052733ea005cc26aecce24bead47320` |
| 18 | `evals/clip_composition/registries/presentation/presentation-renderer-trust-v002/trust.json` | `6e21352ff105e3b77acc351625fed22ff97486fb21d0ce9ee5b1821750a9047a` |
| 19 | `evals/clip_composition/render_presentation_v002.mjs` | `666907c3ff9f045b2141d62a41eb9b746cdad1f5102fe4500e5cb8036c77ce59` |
| 20 | `evals/clip_composition/presentation_renderer_qc_v002.mjs` | `b20992c6756f4c5e460af79a7b7d5872f7b6f4a23b41700023c7bd51b14c4837` |
| 21 | `evals/clip_composition/presentation_renderer_process_observation_v001.mjs` | `957952952fc736f21d7de59aedd8add53d9f12e211ed3db9f3d65e38f24bf030` |
| 22 | `evals/clip_composition/presentation_output_title_compositor_v001.mjs` | `dff1195034b8f1e11ced60866aece07ac82cee9e19c7bc5803f2b42627144d8e` |
| 23 | `evals/clip_composition/presentation_output_title_compositor_v001.test.mjs` | `efaaa0a81f1ffab296f714bf0af70a98a858f0c319a7d557a4880e4974c05ea6` |
| 24 | `evals/clip_composition/reports/presentation/presentation-rendering-decoupling-contract-design-addendum-20260818-v004.md` | `8321a7ba99672af164f6a66285a3802f05b7f876e6c4fbf94e4211b0524f4d36` |

20〜24件目の追加理由は順に、QC process観測の共通化、process観測の一実装化、title側正式実装束縛への観測実装追加、その検査接続、人間合格済み意味行末の契約追補である。25件目は未使用。

## 7. work path整理

元位置へ保持したwork path:

- 最終test run 10 root: formal44、caption v006、title横/縦v017、baseline attempt-0002、5 tree attempt-0004、A-v002 attempt-0002、renderer support、title compositor回帰、title runner回帰。
- 最終成果物8 root: caption control/render各1、title control/job/render各横縦2。
- 契約履歴: 追補v001〜v003。追補v004は正本24件目。
- 完了証拠: baseline復元記録、completion audit、本完了報告、注文書review directory。
- 復元fixture: 指定3.38GB file。今後も削除・退避しない。

退避:

- root: `evals/clip_composition/reports/presentation/archive/presentation-rendering-decoupling-20260818-v001`
- manifest追加前1,582 file、699,650,201 byte。
- 失敗・診断・旧attempt、旧job/control/render、機械生成work/lock、baseline由来の未追跡failure/synthetic、使用済みprivate helperを相対path付きで保持。
- 削除した失敗証拠は0件。
- 退避台帳: 同rootの`archive-manifest-v001.md`。

### 独立診断の未採用結果

正式44件とは別に実行した字幕fixture selftestは、legacy正常oracleが旧headless-shellを保持する一方、現行proof validatorがsystem Chromeを要求するため0/2だった。原因はfixture runtime profileの世代差として確定し、正式44件・3描画・baseline/treeの完成証明には用いていない。staging・TAPはarchiveへ保持した。これを直すにはfixture供給契約の別整理が必要であり、本work-orderの完成条件・停止条件には含まれない。

## 8. 会計・外部作用

- 正本path: 24/25
- 追補: 4/5
- 停止: 8/12
- 検査設営修正: 5/15
- 限定実装修正: 3/6
- API通信: 0回
- 費用: US$0
- commit: 0件
- tag: 0件
- 公開: 0件
- 旧経路の物理削除: 0件

## 9. 作業ツリー

起点commit以後の変更は、本work-orderの実装・契約・検査・正式描画・証拠・台帳・CURRENT_GOALの相談役同期に属する。

- tracked変更: 12 file。
- staged: 0 file。
- untracked: 2,244 file、4,161,314,437 byte。このうち1,583 fileは版付きarchive、1 fileは残置する3.38GB fixture、残りは正本実装・最終成果物・最終証拠・契約/報告である。
- `.env`、secret、API keyを名前に持つ変更path: 0件。
- `git diff --check`: 合格。
- commit/tag: 0件。
