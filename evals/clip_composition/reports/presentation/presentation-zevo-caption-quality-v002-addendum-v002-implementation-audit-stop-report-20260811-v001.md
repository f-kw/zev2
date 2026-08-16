# ZEVO字幕品質v002 追補v002実装後監査 停止報告 v001

日付: 2026-08-11

対象HEAD: `542b35684a3ad67dbab042ca2bb3bff022e42023`

親正本SHA-256: `44fb6199a80663657bf056df0118def3db750fe65813d86e9d106cdc4f42d6e4d`

追補v001 SHA-256: `6de44032c8215253b1bb9e1b71b6ed33273d983d022d2f6737e3696c3609ce23`

追補v002 SHA-256: `a3c8c3ef8e57cd557e4a7cae17ecc188dc523df1508a45de6e2bce36691c7e4d`

通信: 0回

費用: US$0

状態: **正式46件を開始せず停止**

## 1. 結論

新規14 pathは全て作業ツリーに存在するが、実装後監査の開始条件を満たさない。正式検査を走らせて合格扱いにすると、承認済み追補v002 §10.3の「証明消失0」と§11の停止条件へ反するため、正式attemptは開始しない。

停止理由は次の二点である。

1. 契約固定47 codeのうち、production 7 pathで実枝を持つcodeは32件、欠落は15件である。
2. ZCQ001〜ZCQ046のtop-level IDは46件存在するが、親正本・追補v001・追補v002から導出するproof itemの実観測diagnosticは0件である。

これは契約矛盾や現物SHA差ではない。**実装が承認済み契約へ届いていない実装欠陥**である。

## 2. 正本と固定実体の再照合

| 対象 | 期待SHA-256 | 実測 | 判定 |
|---|---|---|---|
| 親正本 | `44fb6199...42d6e4` | 一致 | passed |
| 追補v001 | `6de44032...9ce23` | 一致 | passed |
| 追補v002 | `a3c8c3ef...c7e4d` | 一致 | passed |
| renderer | `c90dc004...45292` | 一致 | passed |
| preset registry | `8e9b0a03...a6e5a8` | 一致 | passed |
| DECISIONS承認行 | 追補v002実測SHAを含む一行 | 610行目に存在 | passed |

追補§7のfade固定事実の前提となるrenderer・preset SHAは崩れていない。

## 3. 14 pathの状態

| 項目 | 実測 |
|---|---:|
| 新規production/support path | 7/7存在 |
| 新規test path | 7/7存在 |
| 合計 | 14/14存在 |
| 15 path目 | 0件 |
| 既存14対象pathの変更 | 0件 |
| 新規14 pathのGit状態 | 全て未追跡。正式成果物・commitではない |

作業ツリーには他作業由来の変更・未追跡物が多数存在する。本停止報告はそれらを対象にせず、上記14 pathと今回のDECISIONS承認行だけを観測した。

## 4. 閉語彙code監査

親正本§9が固定する47 codeに対し、新規production 7 pathのsourceから観測できた一意codeは32件だった。次の15件はproductionに存在しないため、実発火47/47を成立させられない。

1. `CUE_OFFICIAL_SNAPSHOT_MISMATCH`
2. `CUE_TOKEN_COUNT_FAILED`
3. `CUE_SPENDING_LIMIT_EXCEEDED`
4. `CUE_PROVIDER_TRANSPORT_FAILED`
5. `CUE_PROVIDER_ENVELOPE_INVALID`
6. `CUE_PROVIDER_USAGE_INVALID`
7. `CUE_API_PUBLICATION_FAILED`
8. `CUE_LINE_END_INVALID`
9. `CUE_LINE_WIDTH_INVALID`
10. `CUE_SELECTION_PUBLICATION_FAILED`
11. `CUE_RENDER_PUBLICATION_FAILED`
12. `CUE_PROOF_CASE_SET_MISMATCH`
13. `CUE_PROOF_RENDER_FAILED`
14. `CUE_PROOF_QC_FAILED`
15. `CUE_PROOF_PUBLICATION_FAILED`

静的文字列を追加するだけでは実発火にならないため、code文字列の補充では解消扱いにしない。

## 5. 工程別の未閉包

| 工程 | 観測事実 | 正本との差 |
|---|---|---|
| source | pure builderと簡易公開経路は存在 | implementation/runtime/contract全束縛の前読・import後読・公開直前再読が未閉包 |
| B5/B6 | decoder、validator、countTokens adapterは存在 | 正式executeはjob受理後に`authorization` fatalを返すだけで、B5 13成果物、B6結果別成果物、費用・usage・raw先行保存の正式経路が未実装 |
| selection | strict provider decode、ID閉包、pure finalizerは一部存在 | 実physical graph・piecewise timelineを通さず、物理・時間projection SHAを空配列から作る。selection保存・stable再読・二段finalize・公開失敗ownerも未実装 |
| planner | pure builderの骨格は存在 | 正式proof経路による全binding・実正本関数接続の証明が未成立 |
| render | pure builderの骨格は存在 | proof runnerによる保存・stable再読・公開失敗ownerの実経路が未成立 |
| proof | decoder、output request、fade照合入口は存在 | 正式executeはjob受理後にfatalを返すだけで、12段固定順、実renderer/QC、completion/rejection/fatalの排他公開が未実装 |
| review | strict decodeとHTML生成の骨格は存在 | proof completionとの実byte bindingを通した正常経路の証明が未成立 |

## 6. 検査閉包

| 項目 | 実測 | 判定 |
|---|---:|---|
| top-level test ID定義 | 46件 | 件数のみ一致 |
| 一意ID | 46件 | passed |
| 範囲 | `ZCQ001`〜`ZCQ046` | passed |
| `proof-item:<ID>:passed` diagnostic | 0件 | failed |
| 47 code実発火表 | 未成立 | failed |
| 正式TAP | 未生成 | 未開始 |

top-level IDの数が揃っていても、親正本・追補v001・追補v002の各proof itemを専用assertで観測していない。したがって追補v002 §10.3の開始条件を満たさない。

## 7. 実施していないこと

- 新規46件の正式Node test attempt
- 直接影響回帰
- green 287/287
- baseline 86/203 exact照合
- 既存5 treeとA-v002記録対象treeの照合
- API通信、countTokens、generateContent
- 費用支出
- 正式描画
- commit、tag

未実施項目を合格とは報告しない。

## 8. 原因と完全性チェックの自己評価

### 8.1 事実

14 pathの名前とtop-level検査IDの件数を先に揃えた一方、各正式runnerの正常・拒否・fatal・公開失敗の実経路と、proof item単位の証明割当てを同時に閉じなかった。結果として、path閉包とID件数閉包だけが先行し、実枝閉包と証明閉包が残った。

### 8.2 推測

なし。

### 8.3 実現性調査で事前検出できたか

できた。追補v002 §10.3と§11は「47 code実発火」と「proof item実観測」を正式attempt前の必須条件として明記している。実装中間物に対して工程別closure表を逐次適用すれば、B5/B6・selection・proofのstub段階で検出できた。

今後は各production pathを作った直後に、そのpathが所有するcode集合・正常/rejected/abstained/fatal・公開prefix・proof itemを同じ一件表で閉じる。14 path完成後にまとめて照合するだけにしない。

## 9. 修正方向の比較

| 案 | 内容 | 契約影響 | 推奨 |
|---|---|---|---|
| A | 現在の14 pathを未完成attemptの証拠として保持し、新attemptで同じ14 pathを正本どおり全面再実装する。工程ごとにowner code・proof item・正式成果物集合を閉じてから次工程へ進む | なし | 推奨 |
| B | 47 code、46 ID、proof item、B5/B6・proof正式経路を現在の簡易実装へ合わせて削減する | 契約改訂と保証低下 | 不採用 |

案Aは15 path目、新schema、新code、後方互換、計算複製を必要としない見込みだが、未完成実装を同attemptで継ぎ足すのではなく、停止後の別承認で再開する。

## 10. 承認依頼文案

ZEVO字幕品質v002 追補v002実装後監査の停止を受理する。正式46件を開始せず、未完成の14 pathと本停止報告を証拠として保持する。修正方向は案Aを採用し、親正本・追補v001・追補v002を変更せず、同じ14 path内で全面再実装する新attemptの版付き修正設計を起草してよい。設計は工程ごとに、正式成果物集合、正常/rejected/abstained/fatal、47 code owner、proof itemの実観測手段を一件表で閉じる。設計提示で停止し、実装・正式検査・API通信・描画は別承認とする。

