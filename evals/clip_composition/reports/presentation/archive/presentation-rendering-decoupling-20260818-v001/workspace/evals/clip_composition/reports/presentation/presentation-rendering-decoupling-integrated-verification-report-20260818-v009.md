# ④.5 レンダリング疎結合化 全確認事項・統合検証報告 v009

今どこ: 注文書・受領書・出力側行分割・新renderer runnerの実装と、字幕横型1本・タイトル2本の描画/QC・注文書レビュー画面まで成立した。正式44 IDは43/44で、字幕1 cueの行末だけが分離前と一致しない。

次に何が起きるか: 人間合格済みの意味上の行末を新rendererへ明示的に渡す追補を採るか、現在の出力側均衡分割を正とするかを第1層で決める。別件として、baselineが要求する既存3.38GB入力の復元可否を決める。

kawafmmの判断が要るか: 要る。第1に行末所有の契約判断、第2に退避原本へ触れず登録SHAどおりの大容量入力をclean側へ復元してよいかの判断が必要である。

本書は停止報告v001〜v008、追補v001〜v003、後続の正式44検査、独立回帰、baseline、tree照合、描画成果物、注文書レビュー画面、path会計、作業ツリー、外部作用を一通へ統合した最新版である。旧報告と失敗証拠は履歴として上書き・削除しない。

## CURRENT_GOAL 4項

1. 今の目的: 動画出力を別プログラムへ分けて疎結合にする。これにより同時に開発を進められ、中間生成物をレビューでき、修正の影響が小さくなって検証しやすくなり、クオリティを上げやすくなる。
2. 主計画上の現在位置: ④字幕品質v002は完了（`stable/caption-quality-v002-20260816`）。④.5 レンダリング疎結合化（演出指示書境界の実装）の着手前。これが済むと⑤美しいレンダリング・⑥遠方接続・⑦骨格清書が並列化できる。
3. 今の作業と目的への接続: 契約設計v001に基づく実装工事。注文書・受領書・出力側行分割・新renderer runnerを作り、字幕横型1本とタイトル2本で「注文書を人間がレビューできる状態」を実証する。正本path上限25件。
4. 今回やらないこと: 字幕縦型 / G4〜G7 / renderer表現力の拡張 / 旧プログラムの物理削除 / A-v002の目視合格・tag / commit・tag・公開 / API通信・費用支出。

確認事項: CURRENT_GOALの第2項は現物上「着手前」のままだが、第3項は実装工事中、実際の到達点も実装・描画後である。CodexにはCURRENT_GOALの書換権限がないため変更していない。本書では原文をそのまま転記し、未同期事実を隠さない。

## 1. 結論

疎結合化の中核経路は実データ3ケースで成立した。

- 注文書を独立fileとして公開できる。
- 出力プログラムの実行条件をrenderer jobへ置き、受領書との一致後だけ描画できる。
- caption/titleの正式runnerは旧直結描画を使用せず、新renderer runnerへ接続できる。
- 外部processは終了code・stderr全文・signalを出力読取前に独立保存できる。
- タイトル横型・縦型は分離前と本文・表示区間・行の折り方が一致し、QCにも合格した。
- 字幕横型は本文、cue終端、frame、atom全量、atom順序、音声、QCが成立した。
- 注文書、分離前後の動画、QC、字幕の一件差を同じ確認ページで読める。

未完了は二つである。

1. voice-013の11 cue中1 cueで、意味上の行末と出力側の均衡分割が異なる。これによりPRM003が不合格で正式44 IDは43/44。
2. baseline 203 ID中1 IDが、clean checkoutに既存3.38GB一時入力がないため期待と異なる。残る202 IDは期待と一致。

したがって、描画プログラム自体の実証は成立したが、work-orderの完了条件は未成立である。

## 2. work-orderと契約の確認

| 項目 | 現在値 |
|---|---|
| work-order | `PRESENTATION-RENDERING-DECOUPLING-V001` |
| 起点commit | `b5f8fabeefd3358184f45f1c1d036ec70df534a2` |
| 契約設計v001 SHA-256 | `aec224048ac6131173eb8b69b4b4d45cda88d5646ab3b67e8fa8b5561310df94` |
| 追補v001 SHA-256 | `2643e7bf7ad8cdac6dd81a4fa1f1bb5c884b6f2968ec4db465554ad91bee1fad` |
| 追補v002 SHA-256 | `f19a0ff9a27de640959bbbc81fcf7920b63f7a0c19354bc7bf7c6b2a5fcdf47b` |
| 追補v003 SHA-256 | `cd4bfb75f8dfe0aec325ee8ae79cb136908ea7fa7e5fd2e610a430bfb4d1b16d` |
| 正本path | 23/25 |
| 追補会計 | 3/5 |
| 停止会計 | 7/12 |
| 検査設営修正 | 5/15 |
| 限定実装修正 | 3/6 |
| API probe | 0 |
| 費用 | US$0 |

追補の意味:

- v001: renderer jobへ外部実行体6件を明示し、現行live dependencyに合わせたrenderer trust v002を発行。
- v002: 表示状態をrenderer jobと受領書の一致値として明示し、配列先頭やdefaultを禁止。
- v003: Remotion・Chromiumを共通描画入口へ明示注入し、全外部processの終了証拠を出力読取前に保存。

## 3. 正本path 23/25

| # | path | 現SHA-256 | 意味 |
|---:|---|---|---|
| 1 | `evals/clip_composition/reports/presentation/presentation-rendering-decoupling-contract-design-20260817-v001.md` | `aec224048ac6131173eb8b69b4b4d45cda88d5646ab3b67e8fa8b5561310df94` | 契約設計 |
| 2 | `evals/clip_composition/presentation_cue_end_projection_v001.mjs` | `e3ea2279e96671c796fedde5cad51c6e4ae98edd29e1bc6106092e8e87543381` | cue終端projection |
| 3 | `evals/clip_composition/presentation_cue_end_projection_v001.test.mjs` | `befba7b6277bf6fe3ea94cbe4d9f8b38593b959848d056b9f330c5a35361e24b` | projection検査 |
| 4 | `evals/clip_composition/presentation_instruction_artifact_v001.mjs` | `99888864b1213e5e31e24c5c1155e92ec50fae8a8190b8f7d4708071845d5bad` | 注文書 |
| 5 | `evals/clip_composition/presentation_instruction_artifact_v001.test.mjs` | `33c778651c135529e7f03d2a3eab26ca231011f6f518f8ffe1bedacd1663ecca` | 注文書検査 |
| 6 | `evals/clip_composition/presentation_renderer_line_layout_rule_v001.mjs` | `88aa01f0364e1f17416956daef79bafa33125579b4e587fa02b8e8143ce8e9e1` | 出力側行分割 |
| 7 | `evals/clip_composition/presentation_renderer_line_layout_rule_v001.test.mjs` | `a323ee11ca8180391027862634695716befc9c75e91a8bc6ad43091c97bb9684` | 行分割検査 |
| 8 | `evals/clip_composition/presentation_renderer_admission_receipt_v001.mjs` | `2ac68f394a4a40c354907bd931e3c76a5938a75661dc5de89d9a48bfdfb16ea3` | renderer job・受領書・admission |
| 9 | `evals/clip_composition/presentation_renderer_admission_receipt_v001.test.mjs` | `aeaa25598e703122d8fdd05fe2dff69b05fbdd995fc02e3ff05683fbdf62ba10` | admission検査 |
| 10 | `evals/clip_composition/run_presentation_instruction_renderer_job_v001.ts` | `d7e7e8386ec3854e9dfb504a7e2e12b7945b13c6ca0f07926279c8f84f8c3e74` | 新renderer runner |
| 11 | `evals/clip_composition/run_presentation_instruction_renderer_job_v001.test.mjs` | `f96e340862c74f06e79cee45cba4678a6968bbd9cca0d8c81c5db9eb0bde8bea` | renderer統合検査 |
| 12 | `evals/clip_composition/run_presentation_zevo_caption_quality_v002_proof_job_v001.ts` | `00318088e5dcfd6788b368c5bf830a4745b48ec0ab90c25e94223bdc8faaf9a7` | caption正式経路の新renderer接続 |
| 13 | `evals/clip_composition/run_presentation_zevo_caption_quality_v002_proof_job_v001.test.mjs` | `61573af7f233741dcdc545b42da3b750981ce83aeadafe50481df76ab7004d32` | caption正式経路検査 |
| 14 | `evals/clip_composition/run_presentation_zevo_caption_quality_v002_fixture_job_v001.mjs` | `ff560a3045b8c23788e965e1bed4e646bfcc5cf47baecf29cbfd8a199cfb3601` | caption fixture job更新 |
| 15 | `evals/clip_composition/run_presentation_zevo_caption_quality_v002_fixture_job_v001.test.mjs` | `be205b9bf4f382ddb3f2164f00f23f8db2934faf6e37f1247dc36a680144b96f` | caption fixture検査 |
| 16 | `evals/clip_composition/run_presentation_output_title_job_v001.ts` | `89c0b28e3bffd8341112f8ae43bed04fb2612cb48f668a6b5e3f35f3de75f8b5` | title正式経路の新renderer接続 |
| 17 | `evals/clip_composition/run_presentation_output_title_job_v001.test.mjs` | `e1017b1e3f2783d72ac30552215d7d384e168835d60ac2076eef3e79c366f191` | title正式経路検査 |
| 18 | `evals/clip_composition/registries/presentation/presentation-renderer-trust-v002/trust.json` | `6e21352ff105e3b77acc351625fed22ff97486fb21d0ce9ee5b1821750a9047a` | renderer trust再発行 |
| 19 | `evals/clip_composition/render_presentation_v002.mjs` | `666907c3ff9f045b2141d62a41eb9b746cdad1f5102fe4500e5cb8036c77ce59` | 共通描画coreへ明示実行体・観測入口を追加 |
| 20 | `evals/clip_composition/presentation_renderer_qc_v002.mjs` | `b20992c6756f4c5e460af79a7b7d5872f7b6f4a23b41700023c7bd51b14c4837` | QC内processも同じ観測へ接続 |
| 21 | `evals/clip_composition/presentation_renderer_process_observation_v001.mjs` | `957952952fc736f21d7de59aedd8add53d9f12e211ed3db9f3d65e38f24bf030` | 終了code・stderr・signalの共用保存 |
| 22 | `evals/clip_composition/presentation_output_title_compositor_v001.mjs` | `dff1195034b8f1e11ced60866aece07ac82cee9e19c7bc5803f2b42627144d8e` | title側のstrict実装束縛へ共用観測実装を追加 |
| 23 | `evals/clip_composition/presentation_output_title_compositor_v001.test.mjs` | `efaaa0a81f1ffab296f714bf0af70a98a858f0c319a7d557a4880e4974c05ea6` | 新renderer導入後の正式実装束縛66件へ旧検査を接続 |

23件目の追加理由: 新renderer境界が正式実装roleを10件増やした後も、既存title検査が旧56件を要求していた。productionの正式集合66件と契約順序を維持したまま、検査期待だけを66へ接続した。修正後48/48。原因確定済みで修正が一意なため試行錯誤枠消費0。

残り枠は2 path。推奨案Aでは追補v004を1 pathとして追加し、実装は既存path内で閉じるため24/25の見込みである。

## 4. 正式44 IDの四者exact照合

| 所有工程 | 契約期待 | test宣言 | TAP observed | TAP passed |
|---|---:|---:|---:|---:|
| PRP | 6 | 6 | 6 | 6 |
| PRI | 10 | 10 | 10 | 10 |
| PRL | 8 | 8 | 8 | 8 |
| PRA | 12 | 12 | 12 | 12 |
| PRM | 8 | 8 | 8 | 7 |
| 合計 | 44 | 44 | 44 | 43 |

- 不合格: `PRM003`のみ。
- 正式attempt: `evals/clip_composition/reports/presentation/test-runs/20260818-rendering-decoupling-formal-44-attempt-0002/`
- TAP SHA-256: `e4c577869ed40a867c6ca900d47bd7cc24819f3c735aff06d0a2e9486cc86acf`
- ID比較記録 SHA-256: `41c012f64152920e97d39542e2b38fa4d98167f3dc452fe0a464afeba59d629e`
- stderr: 0 byte。
- signal: none。
- process終了code: 1。PRM003不一致を正しく反映。

attempt-0001では画像差processの正常な終了1まで一律0を要求した検査設営欠陥があった。終了1を許す対象をその比較processだけへ限定し、観測保存は維持した。原因・修正とも一意で枠消費0。

## 5. 描画物・QC・旧版比較

| ケース | 分離前動画SHA-256 | 新動画SHA-256 | QC | 表示比較 |
|---|---|---|---|---|
| 字幕横型 voice-013 | `c7fc6c07fbd1ad94851e02774d735f4ef8da82052b67dc9afd8cd6100ef21811` | `58dd7f69d8b3f45226fc2205f80967db76513de718cce2190ab5aa3b4fe0e8ef` | passed、1920x1080、755 frame、25167ms、audio一致 | 11 cue中10 cue完全一致、1 cueの行末だけ差 |
| title横型 | `9ea78fa0a8105af78e755b429b1ae27d69537670d48953fbc5d0034b33764afe` | `0aa5c83d7c407406eacd604abb337adf98d99913af962da85aebf0f4fe0ddd63` | passed、1920x1080、1547 frame、audio一致 | 本文、180frame、一行、style一致 |
| title縦型 | `fcc9f91e879377baedfb2a4fa30036fac272ac15b6223d9006584309e166a396` | `889fb29ac65860528bb70f06c404d236b10dc3e491d7e1d13c85310e578bb890` | passed、1080x1920、1547 frame、audio一致 | 本文、180frame、11/8文字の二行、style一致 |

描画結果path:

- 字幕: `evals/clip_composition/outputs/presentation/rendering-decoupling-caption-renders/a-v002-voice-013-v005/presentation-rendered-v002.mp4`
- title横型: `evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-landscape-decoupled-v015-output/presentation-rendered-v002.mp4`
- title縦型: `evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-vertical-decoupled-v015-output/presentation-rendered-v002.mp4`

描画attempt証拠:

| attempt | 結果記録SHA-256 | stderr | exit | signal |
|---|---|---|---:|---|
| caption attempt-0005 | `aaef7fdd6cff01afbf358ee44eca7e026ffe5b5262c255a8eaca90cbdcea894f` | 0 byte | 0 | none |
| title landscape attempt-0015 | stdout `5033fe6c969da31f19eca41feb95745fe328b7ba3bce13d6d7d3f104a15719d4` | 0 byte | 0 | none |
| title vertical attempt-0015 | stdout `1ee61ceff570b7f1f219d710d303b19f5be0e578871136a1cdf5bf563adffd7c` | 0 byte | 0 | none |

## 6. 注文書・renderer job・受領書・行分割成果物

### 字幕 voice-013

| 成果物 | SHA-256 |
|---|---|
| source proof job | `10e70df0fce59237a98f6f26df4b7e47f379fb06a30bafce3f9321f2f09ba14f` |
| cue終端projection | `70ab0cbed985e95c52fb60881217f09fcac0c1f005744ad6180beaf8fd339ea7` |
| 注文書 | `32c08934cddd9a216ce71801e1f4d9baf095c4afab44833e57eeb216d7b5cfd4` |
| renderer job | `460422a993acdba493c4dea20ba5814a2ffa060e5c269a55b1b59df8cf836599` |
| 受領書 | `b4e0c2b82310862facf3131e9cab8969f606fb9829d63b0538a13d4292a2d29c` |
| line layout | `7c6bc1392354668f1a470051f3982564e4ba1b5b9bc38e9ffdf845ff299119f5` |

root: `evals/clip_composition/outputs/presentation/rendering-decoupling-caption-control/a-v002-voice-013-v005/`

### title横型

| 成果物 | SHA-256 |
|---|---|
| formal title job | `73d200cdf2271220bb7f7c83d7a49df518ca48b336acecb45761f8854f4a23a4` |
| 注文書 | `99dcf101cd59d3893b2212e585855e855eb2f810204179bf0121d552f5e5d504` |
| renderer job | `dc775dd0f32e5cb1724e2a25a58ba59dfa2e848b4072d9144807abd8bf043d98` |
| 受領書 | `1418923f2800a4a2cd20996572c61e0ee41dd618b6386503117b7d0f05842cd3` |
| line layout | `a8eea91b9d1bffa2c91429e0efde10f6f6b954374f04abb5da451e40ccf70b1f` |

### title縦型

| 成果物 | SHA-256 |
|---|---|
| formal title job | `efbe4d31abfa474c396401b7e0bba0820d456d090aa4f2903ae59f3352ea8a54` |
| 注文書 | `c0e6c4cdbe1d6fff2d83dd6c9d3307adb159077df5a791e9b67c72e4ac24ad38` |
| renderer job | `9ebf82b79e7a3c67c5e7f2f0c5093ed8bb738350359f00cfc3231e2155d16c77` |
| 受領書 | `e9a7fb5c8c7542d62580aa75b1adf8d5df25d1b54f86fa923d5a020987971bc0` |
| line layout | `54e6e3a2fa579378c747ce7dc8ec30056c87c7b2c8f2dc2676080db4eee8cc8c` |

## 7. PRM003の唯一の表示差

不一致は字幕cue ordinal 10だけである。

| | 1行目 | 2行目 |
|---|---|---|
| 分離前 | `デスカード、デビルカード` | `来ないんだけど` |
| 新renderer | `デスカード、デビル` | `カード来ないんだけど` |

| | 1行目 | 2行目 |
|---|---|---|
| 分離前 | atom 000072〜000083、12 atom、幅24 | atom 000084〜000090、7 atom、幅14 |
| 新renderer | atom 000072〜000080、9 atom、幅18 | atom 000081〜000090、10 atom、幅20 |

一致しているもの:

- cue数11
- instruction数11
- 本文全量
- cue終端
- frame
- atom全量
- atom順序
- 他10 cueの行本文
- 動画のframe/audio/QC

### 原因

v022正式selectionは途中の行末`display-boundary-000001-000083`を保存している。分離前page/line planはこれを使い24/14へ分けた。現行cue終端projectionは設計どおりAI選択済み行末を除き、cue終端だけを保持する。新rendererは行末を受け取らず、`balanced-source-boundary-v001`により行数、最大幅、幅差、境界順を比較し、より均衡する18/20を選ぶ。

### 三分法

- 契約・設計: 人間合格済みの意味上の行末を保持する要求と、行末を捨てて出力側で均衡分割する規則が同時成立しない。
- production: 承認済み均衡規則どおり18/20を選択しており、欠損・重複・補完はない。
- 検査設営: 分離前後の正式保存byteを直接比較し、正式TAPでも同じ一件差を再現しているため今回の原因ではない。

帰属は**契約設計の不整合**である。

## 8. 行末所有の裁定案

### 案A: 人間合格済みの意味上の行末を維持する（推奨）

- cue終端projectionは行末0件のまま変更しない。
- 同じproduction module内に、別schemaの意味上の行末projectionを追加する。
- caption正式runnerがsource packageと正式selectionをstable再読し、caption/cue/選択済み行末だけを決定的順序で公開する。
- renderer jobと受領書が同じbindingを明示保持する。
- admissionはsource package、cue終端projection、行末projectionの対応を検査する。
- rendererは指定境界をatomへ一対一解決し、cue外・順序不正・幅超過・物理配置不成立をfail-closedにする。
- 注文書schema、本文、cue終端、frame、styleProfileIdは変えない。
- 素材固有文字列・固定境界・独自係数・暗黙補完は追加しない。
- 実装path追加0件。追補v004の1件だけを正本へ加え、24/25で閉じる見込み。

案Aは、AIが意味cueと行末を選び、機械が検査して描画するという字幕品質v002の分業を維持しながら、人間合格済み表示を再現する。

### 案B: 新rendererの18/20を正とする

- 現productionを変更しない。
- PRM003と完了条件を、新しい均衡分割の受入へ改訂する。
- 分離前と表示が変わるため別途人間目視が必要。
- v022でAIへ行末判断基準を与えた成果を新経路で使わない状態が残る。

## 9. 独立回帰

| 検査 | 結果 | TAP SHA-256 | 判定 |
|---|---:|---|---|
| title compositor | 48/48 | `ce23393f52ad277f8fbfa0beda6b8691603f61861c4ff8a48efa1e3918592f3d` | 合格 |
| title runner | 20/20 | `b686ce6ea997e906fe3b1c24b88b0b4bc710e22ef6c81b061e66dfb9515bc567` | 合格 |
| renderer runtime/process観測support | 5/5 | `11aaeb745e9aed8a2ccbb3cb3e86f4c70e02fcef17f6e644e8ce7edcde1d91f8` | 合格 |

広い直接影響集合の最初の診断attemptは76/88だった。12件は、root検査のReact解決設営、旧renderer trust/headless VERSIONという既存状態、既知のPRM003、one-shot output pathの再利用に分解された。この診断runを完成証明には使っていない。関係する正本経路は上表の独立attemptで頭から再実行した。

## 10. baseline 203 ID

正式oracle:

- 期待: pass 86 / fail 117、合計203 ID。
- 実測: pass 85 / fail 118、合計203 ID。
- ID、順序、statusが一致したもの: 202/203。
- 差: R3大容量実file検査1件のみ。

証拠:

- root: `evals/clip_composition/reports/presentation/test-runs/20260818-rendering-decoupling-baseline-203-attempt-0001/`
- TAP SHA-256: `1c492af108831347ceb4c6421e205befee53615b18921c342ea3171ca8549c5e`
- 比較記録 SHA-256: `20092af83c1210c2a79808eeae889e3276af823f20c952839ff30527cf29993a`
- stderr: 0 byte。
- signal: none。

欠落入力:

- path: `evals/clip_composition/outputs/presentation/base-media/.DmWu0jVQfTE-candidate-13-v002.work-ovnjGJ/source-grid.f32le`
- 期待size: `3,384,584,064` byte。
- 期待SHA-256: `219cd4af6e6560a0819bbca67fe36433cdb5e3f4b3260b42a5285093e9030209`。
- 実測: ENOENT。

現checkoutには同一fileは存在しない。完成済み基礎映像、timeline、generation manifestは存在し、manifestは上記size/SHAを保持する。ただしこの検査を承認した既存設計は「対象work fileが欠落した場合は代替fileを探さず停止」と明記する。退避folderも読取禁止のため、Codex判断で再生成・復元・代替は行っていない。

この欠落は新しい3動画・正式44 IDには影響しないが、work-order完了条件のbaseline 86/203 exactを妨げる。

## 11. tree・既存成果物の不変照合

| 対象 | 結果 | 証拠SHA-256 |
|---|---|---|
| 既存5 tree | 5/5、差0 | TAP `57c8496b38a4a634d2ee4c9a65135a31c79496f17209356d6b049976f9d28e7e` |
| A-v002記録対象tree | 2,887件、欠落0、byte差0、exact true | `386462402f325e92daa378319f8b8681d979f2f41ad2d3195c0cab2fbbf0bc47` |
| voice-013分離前動画・page/line plan | 変更0 | 旧video SHA `c7fc6c07...`、旧planをoracleとして直接比較 |
| title分離前動画2本 | 変更0 | landscape `9ea78fa0...`、vertical `fcc9f91e...` |
| stable tag | 変更0 | 物理変更なし |

最初の5 tree attemptはsandbox内TSX IPC拒否で実行環境に到達しなかったため失敗証拠として保持し、固定実行環境で頭から再実行したattempt-0002だけを正式証拠とした。

## 12. 注文書レビューページ

確認ページ:

`evals/clip_composition/reports/presentation/rendering-decoupling-order-review-20260818-v001/review.html`

- HTML SHA-256: `7a819aa432746d5c9dbc80772b85f852603fa832de97fca72524d8d0e7f07f0d`
- manifest SHA-256: `66bbd5974010e87fb8c089d92ec18d274951b8945a909077910593b96eaff998`
- 状態: `review-ready-with-one-contract-decision-held`。

人間の確認手順:

1. 3ケースそれぞれの注文書JSONで、本文、表示区間、style参照を確認する。
2. 同じ欄の分離前動画と新renderer動画を再生する。
3. title横型は一行が同じ、title縦型は二行の折る位置が同じことを確認する。
4. captionは11 cue中10 cueが一致し、10番目だけ24/14と18/20に分かれることを確認する。
5. 各ケースのQC合格を確認する。

このページは注文書レビュー可能化の実証であり、43/44を44/44と扱うものではない。

## 13. 停止・修正履歴

| 報告 | 主な停止理由 | 帰属 | 後続処理 |
|---|---|---|---|
| v001 | runtime toolをjobから確定できない | 契約閉包不足 | 追補v001で明示runtime bindingとtrust v002 |
| v002 | live runtime trustと現物SHAの不一致 | 契約・台帳 | v001へ統合して再発行 |
| v003 | 表示状態を暗黙選択なしで一件へ供給できない | 契約閉包不足 | 追補v002でrenderer job所有へ |
| v004 | overlay child非0だがstderr未保存 | 観測不足 | 追補v003で全processの3点保存 |
| v005 | jobの実行体束縛が実描画入口へ届かない | 契約閉包不足 | 追補v003で共通描画入口へ明示注入 |
| v006 | Chrome Framework欠落等を観測し、旧title検査用browserと実描画Chromeの役割が混同 | 設営配線 | 原因確定後に役割分離 |
| v007 | caption一件の行末が分離前後で不一致 | 契約設計 | 第1層裁定待ち |
| v008 | formal44は43/44、注文書review pageまで成立 | v007と同一 | 判断材料を統合 |
| v009（本書） | v007の行末契約に加え、baseline既存大容量入力欠落を明示 | 契約判断＋既存実行環境 | 二件を独立保留 |

原因確定済みで修正が一意だった主な項目:

- NODE_OPTIONS空文字を「不存在」と誤認したpreflight。
- 出力親directoryの未設営。
- Chrome FrameworkがないChromium pathの使用。
- 旧title起動検査用headless-shellと新renderer実描画用system Chromeの役割混同。
- caption共通描画計画の台帳所有接続。
- 画像差processの正常終了1を失敗扱いした検査期待。
- title正式実装束縛66件に対する旧56件検査。

最新裁定どおり、原因と一意な修正が確定したものは試行錯誤枠を消費していない。原因不明、同型反復、推測修正だけを枠へ数える。

## 14. 完了条件8項の監査

| # | 完了条件 | 判定 | 証拠または不足 |
|---:|---|---|---|
| 1 | PRP6・PRI10・PRL8・PRA12・PRM8の44/44 | 未完了 | 43/44、PRM003のみ不合格 |
| 2 | voice-013の注文書・受領書・行分割が独立正式成果物 | 成立 | caption control v005 |
| 3 | voice-013本文・cue終端・frame・行分割projectionが旧oracle一致 | 未完了 | 行末1件だけ不一致 |
| 4 | 新rendererだけで字幕横型1本を描画しQC合格 | 成立 | video SHA `58dd7f69...` |
| 5 | title横/縦が共通境界を使い旧意味・frame・行分割と一致 | 成立 | videos `0aa5c83d...` / `889fb29a...`、PRM005/006 |
| 6 | caption/title正式runnerの旧direct経路0件 | 成立 | PRM007、title runner 20/20 |
| 7 | 直接影響、baseline exact、5 tree、A-v002 tree不変 | 一部未完了 | 独立回帰・treeは成立、baselineのみ85/203 |
| 8 | 注文書レビュー手順と確認file | 成立 | review.html SHA `7a819aa4...` |

総合判定: **6項成立、2項未完了。工事全体は未完了。**

## 15. 作業path枠と掃除状況

- 正本path: 23/25。
- 作業path上限: 250 path相当の管理枠という規律だが、生成root内の個別frame/process観測fileを含む物理untracked fileは1,451件ある。これは正本path会計とは別である。
- tracked変更: 本書作成前12件。
- untracked: 本書作成前1,451件。本書追加により1件増える。
- 一時work directory、lock、失敗attempt、process観測、TAP、job、動画は判断前の証拠として未削除。
- 完了報告までに、正本へ残すもの、work pathとして保持するもの、退避する一時fileをexact一覧へ閉じる必要がある。
- 現時点では停止証拠保全を優先し、掃除・削除・退避を実施していない。
- 既存正式成果物、stable tag、二つの退避folderには触れていない。

作業tree:

- branch: `main`。
- HEAD: `b5f8fabeefd3358184f45f1c1d036ec70df534a2`。
- commit: 本工事中0件。

## 16. 外部作用

| 作用 | 実績 |
|---|---:|
| API通信 | 0回 |
| 費用 | US$0 |
| commit | 0件 |
| tag | 0件 |
| 公開 | 0件 |
| secret保存 | 0件 |
| 既存正式成果物の上書き・削除 | 0件 |
| stable tag変更 | 0件 |
| 退避folder操作 | 0件 |

## 17. 第1層で確認が必要な全事項

### 確認1: 字幕の行末所有

推奨は案Aである。人間合格済みの意味上の行末を専用projectionとしてrendererへ明示し、注文書schemaとcue終端projectionは変えない。追補v004 1件を加え、既存実装path内で閉じる。

承認されれば行うこと:

1. 追補v004を起草し、意味上の行末projectionのexact schema・binding・検査を固定。
2. 既存production/test/runner内で実装。
3. PRP/PRL/PRA/PRMを頭から再実行。
4. captionを未使用job/rootで再描画しQC。
5. 分離前の24/14とbyte一致を確認。
6. 正式44/44を確認。

### 確認2: baseline大容量入力

既存設計が欠落時停止を要求し、退避folderが読取禁止なので自走復元できない。

必要な判断:

- 登録済みsize/SHAと一致する原本を、退避原本を変更せず読み取り、clean側の期待pathへAPFS cloneまたはbyte同一copyとして復元してよいか。
- 許可する場合は、原本pathの確認、copy前後SHA、原本mtime/inode不変、clean側の新規file、baseline再実行を版付き記録へ残す。
- 原本が存在しない場合、同じ正式生成入口での再製造を別途承認するか、baseline完了条件の扱いを契約判断へ戻す。

### 確認3: CURRENT_GOAL第2項の未同期

第2項が「着手前」のままで、第3項と実態は実装・描画後である。Codexは変更しない。相談役が必要と判断する場合のみ同期する。

## 18. 推奨する一組の裁定

1. 案Aによる意味上の行末projection追補v004の起草・実装・再描画・44/44までを承認する。
2. baseline用3.38GB入力を、登録SHA照合と原本不変を条件にclean側へ読み取り複製することを承認する。原本が見つからなければ再製造せず停止する。
3. CURRENT_GOAL第2項の同期は相談役が行う。

この一組が承認されれば、PRM003、正式44/44、baseline 86/203 exact、最終tree照合、review page更新、作業path整理、完了報告まで進められる。

## 19. 主要証拠への索引

- 統合停止報告v008: `evals/clip_composition/reports/presentation/presentation-rendering-decoupling-stop-report-20260818-v008.md`
- 完成監査: `evals/clip_composition/reports/presentation/presentation-rendering-decoupling-completion-audit-20260818-v001.json`、SHA-256 `39a792cd7dec1fd5e3053d3e91c0b3b7e21dac2771c82aba82b0c4c80b134268`
- 行末裁定資料: `evals/clip_composition/reports/presentation/presentation-rendering-decoupling-line-boundary-decision-material-20260818-v001.md`、SHA-256 `25e394f73fd1330cfb8d51348f350ce0364bb4f9e830e872e7f34b40ea4fea57`
- 正式44 attempt: `evals/clip_composition/reports/presentation/test-runs/20260818-rendering-decoupling-formal-44-attempt-0002/`
- baseline attempt: `evals/clip_composition/reports/presentation/test-runs/20260818-rendering-decoupling-baseline-203-attempt-0001/`
- 既存5 tree: `evals/clip_composition/reports/presentation/test-runs/20260818-rendering-decoupling-five-tree-attempt-0002/`
- A-v002 tree: `evals/clip_composition/reports/presentation/test-runs/20260818-rendering-decoupling-a-v002-tree-attempt-0001/`
- title compositor回帰: `evals/clip_composition/reports/presentation/test-runs/20260818-rendering-decoupling-title-compositor-regression-attempt-0002/`
- title runner回帰: `evals/clip_composition/reports/presentation/test-runs/20260818-rendering-decoupling-title-runner-regression-attempt-0001/`
- renderer support回帰: `evals/clip_composition/reports/presentation/test-runs/20260818-rendering-decoupling-renderer-support-attempt-0001/`
- 注文書レビュー: `evals/clip_composition/reports/presentation/rendering-decoupling-order-review-20260818-v001/review.html`

## 20. 停止状態

同じ第1層判断待ちが3回連続し、保留に影響しない描画・QC・正式検査・独立回帰・tree照合・確認ページ・baseline差分確定まで完了した。これ以上は契約改訂または退避原本の読取許可なしに進められないため、Goalはblockedとして停止している。

追加の実装、再描画、baseline復元、commit、tag、公開、API通信、費用支出は行わず、本書を発行してturnを終了する。
