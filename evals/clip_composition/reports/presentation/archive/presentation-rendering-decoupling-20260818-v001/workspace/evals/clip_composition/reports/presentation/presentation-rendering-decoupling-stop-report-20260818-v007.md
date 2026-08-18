# ④.5 レンダリング疎結合化 統合停止報告 v007

今どこ: title横型・縦型とcaption横型の新renderer描画・QCまで成立した。分離前後比較でcaption 11 cue中1 cueの行の折り方だけが一致せず、停止条件を適用した。

次に何が起きるか: 行分割規則を旧成果物の折り方へ合わせるか、比較基準を新規則へ改訂するかの第1層裁定後に、caption正式経路・44 ID・review pageへ進む。

kawafmmの判断が要るか: 要る。承認済み行分割規則の意味または分離前後一致条件に触れるため、自走修正しない。

## CURRENT_GOAL 4項

1. 今の目的: 動画出力を別プログラムへ分けて疎結合にする。これにより同時に開発を進められ、中間生成物をレビューでき、修正の影響が小さくなって検証しやすくなり、クオリティを上げやすくなる。
2. 主計画上の現在位置: ④字幕品質v002は完了（`stable/caption-quality-v002-20260816`）。④.5 レンダリング疎結合化（演出指示書境界の実装）の着手前。これが済むと⑤美しいレンダリング・⑥遠方接続・⑦骨格清書が並列化できる。
3. 今の作業とそれが目的へどう繋がるか: 契約設計v001に基づく実装工事。注文書・受領書・出力側行分割・新renderer runnerを作り、字幕横型1本とタイトル2本で「注文書を人間がレビューできる状態」を実証する。これが目的の中間生成物レビューをそのまま実現する。正本path上限25件（2026-08-18 kawafmm確定）。
4. 今回やらないこと: 字幕縦型 / G4〜G7 / renderer表現力の拡張 / 旧プログラムの物理削除（骨格清書で行う） / A-v002の目視合格・tag（注文書レビュー可能化の後に別途） / commit・tag・公開 / API通信・費用支出。

## 1. 停止結論

前回裁定で指定されたbrowserの役割分離を反映し、共通描画処理を先に閉じてからtitle横型、title縦型、caption横型へ展開した。

- title横型: 描画・QC合格。分離前と同じ1行表示。
- title縦型: 描画・QC合格。分離前と同じ2行表示。
- caption横型: 新rendererで11 cueを描画し、QC合格。
- captionの分離前後比較: 11 cue中10 cueは行本文が一致し、最後の1 cueだけ折る位置が不一致。

不一致は、同じ19 atom・同じ本文・同じcue終端・同じframeの中で、分離前が12 atom / 7 atom、新rendererが9 atom / 10 atomへ分けたものである。文字の欠落・重複やcue境界の差ではない。

本work-orderの明示停止条件「分ける前後で描画結果が一致しない」に該当する。承認済みの`balanced-source-boundary-v001`規則自体と旧成果物のbyte oracleが両立していないため、素材固有の例外や独自係数を足さず、実装・検査・描画を停止した。

## 2. 分離前後の比較結果

### 2.1 title横型

| 項目 | 分離前 | 新renderer |
|---|---|---|
| 表示 | `片付けの「やりかけ癖」を語るマリン船長` | 同一 |
| 行数 | 1 | 1 |
| 動画SHA-256 | `9ea78fa0a8105af78e755b429b1ae27d69537670d48953fbc5d0034b33764afe` | `0aa5c83d7c407406eacd604abb337adf98d99913af962da85aebf0f4fe0ddd63` |
| QC | 旧正式成果物 | passed、1920x1080、1547 frame、audio payload一致 |

新動画:
`evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-landscape-decoupled-v015-output/presentation-rendered-v002.mp4`

正式attempt証拠:
`evals/clip_composition/reports/presentation/test-runs/20260818-rendering-decoupling-title-landscape-attempt-0015/`

### 2.2 title縦型

| 項目 | 分離前 | 新renderer |
|---|---|---|
| 1行目 | `片付けの「やりかけ癖」` | 同一 |
| 2行目 | `を語るマリン船長` | 同一 |
| 行数 | 2 | 2 |
| 動画SHA-256 | `fcc9f91e879377baedfb2a4fa30036fac272ac15b6223d9006584309e166a396` | `889fb29ac65860528bb70f06c404d236b10dc3e491d7e1d13c85310e578bb890` |
| QC | 旧正式成果物 | passed、1080x1920、1547 frame、audio payload一致 |

新動画:
`evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-vertical-decoupled-v015-output/presentation-rendered-v002.mp4`

正式attempt証拠:
`evals/clip_composition/reports/presentation/test-runs/20260818-rendering-decoupling-title-vertical-attempt-0015/`

### 2.3 caption横型 voice-013

| 項目 | 結果 |
|---|---|
| cue終端projection | 11件、SHA-256 `86f4143985971050c56e682616f85515b044766a6af5225ab797778217f9002d` |
| 注文書 | 11件、SHA-256 `aabf796a44c9c532fd3c99bfe4b4cd9e28b2942ea23b08ace2b8f573b55c88a1` |
| renderer job | SHA-256 `73d04c88a1b32372e59d20206f7da4e5db0bd30f3f15058e18b4a2226a012f79` |
| 受領書 | SHA-256 `9c0a2e67875a08fbdaab4eaa9e0e34cd563fef6db38c322bd613902792aef68d` |
| 新line layout | 11件、SHA-256 `d6cf1796621a9cd19913b5390f35b74b485a0fbaebc2eda9b0cc7d6e38e94d39` |
| 新動画 | SHA-256 `58dd7f69d8b3f45226fc2205f80967db76513de718cce2190ab5aa3b4fe0e8ef` |
| QC | passed、1920x1080、755 frame、25167ms、audio payload一致 |
| 外部process観測 | 132起動すべてにexit-code・stderr・signalを独立保存 |

新動画:
`evals/clip_composition/outputs/presentation/rendering-decoupling-caption-renders/a-v002-voice-013-v002/presentation-rendered-v002.mp4`

control成果物とprocess観測:
`evals/clip_composition/outputs/presentation/rendering-decoupling-caption-control/a-v002-voice-013-v002/`

## 3. 行分割不一致のexact値

比較対象:

- 分離前page/line plan: `evals/clip_composition/outputs/presentation/output-caption-cue-proof-runs/a-v002-caption-quality-v022-proof-20260816-v003/voice-013/horizontal-formal/page-line-plan-v003.json`
- 分離前SHA-256: `71d47f3e069ddcf5d27c075ef19658face39de835cd954ed5e29cccde54029e9`
- 新line layout: `evals/clip_composition/outputs/presentation/rendering-decoupling-caption-control/a-v002-voice-013-v002/line-layout-v001.json`
- 新SHA-256: `d6cf1796621a9cd19913b5390f35b74b485a0fbaebc2eda9b0cc7d6e38e94d39`

不一致はcue ordinal 10の一件だけである。

| | 1行目 | 2行目 |
|---|---|---|
| 分離前 | `デスカード、デビルカード` | `来ないんだけど` |
| 新renderer | `デスカード、デビル` | `カード来ないんだけど` |

atom範囲:

| | 1行目 | 2行目 |
|---|---|---|
| 分離前 | `atom-occurrence-000072`〜`000083`（12 atom、論理幅24） | `000084`〜`000090`（7 atom、論理幅14） |
| 新renderer | `atom-occurrence-000072`〜`000080`（9 atom、論理幅18） | `000081`〜`000090`（10 atom、論理幅20） |

一致した事実:

- cue数: 11 / 11。
- instruction数: 11 / 11。
- projection数: 11 / 11。
- 他の10 cueの行本文: exact一致。
- 当該cueの全文・atom全量・順序: exact一致。
- 描画とQC: passed。

したがって「字幕内容の欠損・重複」「AI selection差」「frame差」「描画失敗」ではなく、出力側の行分割規則が選んだ境界だけの差である。

## 4. 三分法

### 契約・設計

不整合あり。契約設計v001は、出力側の`balanced-source-boundary-v001`が旧voice-013の行分割を一意再現すると固定している。一方、現物の11 cueへ同規則を適用した結果は最後のcueだけ旧page/line planと異なる。

### production実装

規則の実装は指定された「二行の幅差を小さくする」選択として動作している。18/20は24/14より均衡しているため、現行規則からは新結果が導かれる。素材固有のhardcodeや隠れた補完はない。

caption正式proof runnerへの新renderer接続は編集途中であり、44 IDの正式attempt前に比較停止へ到達した。この途中状態を合格根拠へ使用しない。

### 検査設営

今回の不一致原因ではない。旧page/line planと新line layoutの正式保存byteを直接比較しており、本文・atom ID・幅値が読めている。

### 帰属

帰属は**承認済み行分割規則と工事前byte oracleの設計不整合**である。解消には規則の意味または一致条件の改訂が必要であり、現work-order内の一意な実装修正では閉じない。

## 5. 前回停止後の実装修正

### 5.1 browserの役割分離

- 旧title jobの起動検査: 従来のheadless-shell。
- 新renderer jobの実描画: frameworkを同梱したsystem Chrome。

この分離によりtitle横型・縦型の実描画が成立した。

### 5.2 caption共通描画計画の所有修正

caption最初の新renderer実行では、行分割規則をcaption style台帳から読んだため、renderer jobの登録値と一致せず描画前に拒否された。契約上の所有元はrenderer trust台帳で一意だったため、共通描画計画へ同台帳を渡し、その登録値だけを使うよう接続した。

- 失敗証拠: `evals/clip_composition/outputs/presentation/rendering-decoupling-caption-control/a-v002-voice-013-v001/process-observations/attempt-0001/0003-layout-inspection/stderr.txt`
- 修正後のrenderer runner SHA-256: `d7e7e8386ec3854e9dfb504a7e2e12b7945b13c6ca0f07926279c8f84f8c3e74`
- focused test: 5/5。

原因確定済みで修正が一意だったため、最新裁定の数え方により試行錯誤枠は消費しない。

## 6. 正式会計

| 会計 | 前回確定 | 今回 | 現在 |
|---|---:|---:|---:|
| 追補 | 3/5 | 0 | 3/5 |
| 停止 | 6/12 | 1 | 7/12 |
| 検査設営修正 | 5/15 | 0 | 5/15 |
| 限定実装修正 | 3/6 | 0 | 3/6 |
| API probe | 0 | 0 | 0 |
| 費用 | US$0 | US$0 | US$0 |

正本path会計は22/25のままである。今回追加した動画・job・control成果物・process観測・本停止報告はwork pathであり、正本へ残す実装・契約fileを増やしていない。

## 7. 44 IDと未完了工程

- PRP/PRI/PRL/PRA/PRMの44 ID正式attempt: 未実行。
- 四者exact一致: 未確認。
- caption正式proof経路の新renderer切替: production編集途中。正式検査前のため完了扱いにしない。
- 分離前後比較: title 2形式は合格、caption 1 cue不一致で停止。
- 注文書レビューページ: 未作成。
- 作業path枠の掃除・一時file退避: 停止証拠を保持するため未実施。

独立して先行可能だったtitle横型・縦型とcaption単体描画・QCは完了した。比較差が確定した後は、停止条件に従い正式44 IDやreview pageを先行していない。

## 8. 次の裁定に必要な一問

推奨は、**素材固有の例外を作らず、旧page/line plannerが当該境界を選ぶ支配関係を現物から逆引きして、汎用の行分割規則を版付き改訂し、voice-013全11 cueのbyte oracleを再証明する案**である。

代替は、現行の幅均衡規則による18/20を正として、工事前後一致条件とbyte oracleを改訂する案である。この場合は表示の折り方が変わるため、人間の見た目判断も必要になる。

どちらを採るか。前者を採る場合も、規則の実値は推測せず旧plannerの現物診断後に設計提示する。

## 9. 外部作用と作業領域

- API通信: 0回。
- 費用: US$0。
- commit / tag / 公開: 0件。
- DECISIONS承認行: 0件。
- 既存正式成果物・stable tag・退避folderへの変更: 0件。
- 旧経路の物理削除: 0件。
- 分離前の動画・page/line plan: 不変。
- 分離後の3動画、control成果物、全process観測、失敗attempt: 不変保持。
- 本比較差の確定後に行った実装修正・正式検査・描画: 0件。
