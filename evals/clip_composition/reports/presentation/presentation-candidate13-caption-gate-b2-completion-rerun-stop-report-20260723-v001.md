# candidate 13 基本テロップ ゲートB2完成版検査 停止報告 v001

- 日付: 2026-07-23
- 基準コミット: `53f00a7b`
- 結論: **完成版package側検査が33/55で不合格となったため、承認済み停止規律に従って停止した**
- 人間作業: 0件

## 1. 今回の承認範囲

前回の早期検査で見つかった未完成箇所を、承認済みB1契約へ合わせて静的に再監査・完成したうえで、次を一度だけ順に実行する範囲だった。

1. package側のB2全検査
2. 意味回答側のB2全検査
3. ゲートA既存回帰
4. 残存source atom既存回帰
5. candidate 13読み取り専用preflight

最初のpackage側全検査が不合格だったため、2〜5は実行していない。修正、部分再実行、全件再実行のいずれも行っていない。

## 2. 実行前に完成した内容

早期検査4件は、契約を変更せず実装を契約へ合わせた。

| 早期検査での指摘 | 完成内容 | 帰属 |
|---|---|---|
| 公開入口2件が未実装 | 契約記載の2入口を追加 | 未完成実装 |
| BOMを受理した | 先頭BOMを拒否 | 実装欠陥 |
| 通常のJSON objectを誤拒否した | 通常objectとnull prototype objectの双方を受理 | 実装欠陥 |
| `toJSON`とobject判定の優先順位が違った | 契約の優先順位へ一致 | 実装欠陥 |

意味回答側を水平確認した結果、BOM処理または通常object受理を別実装として複製した箇所は0件だった。意味回答側はpackage側の共通strict JSON処理を再利用する。

静的な実装完成監査では、公開入口、固定違反コード、検査との対応、CLI、import graph、module読込時の外部I/O、production経路と検査経路の同一性を照合した。この時点では新しいP0/P1を検出しなかった。

## 3. 実装固定値

完成版検査を始める前に、次の6ファイルを固定した。

| 役割 | ファイル | SHA-256 |
|---|---|---|
| package生成・検査の共通処理 | `presentation_caption_semantic_source_package_v001.mjs` | `d6e5ad2286199b0f27faa5084244081660493034411bea711202ab8a70b80da6` |
| package実行処理 | `run_presentation_caption_semantic_source_package_job_v001.mjs` | `6793763cbe03a6d5dbcd51a01f3f29285f50986cfaa75ef9f1d3f98846e58f46` |
| 意味回答の展開・検査処理 | `presentation_caption_semantic_output_v001.mjs` | `ef8e925a39a5933b2a5a5056a5ececaeb67fe8f2ec9555b97db25804b61a3b84` |
| 意味回答の実行処理 | `run_presentation_caption_semantic_output_check_v001.mjs` | `9eebecf0cd0ca96b79d2d690015afee4aab521a9c4c581c8a52f46abcd520e0f` |
| package側全検査 | `test_presentation_caption_semantic_source_package_v001.mjs` | `8c4ed0de0f8b47a67dd4a87701330385e65086553a350052656b3fa7305cb166` |
| 意味回答側全検査 | `test_presentation_caption_semantic_output_v001.mjs` | `6a8e3e4ce4e24be661092a13d138716dfe9f8ce950ed38a041cd7502b13e989c` |

## 4. 完成版検査の実測

実行したのは次の1回だけ。

```text
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node --test evals/clip_composition/test_presentation_caption_semantic_source_package_v001.mjs
```

| 項目 | 結果 |
|---|---:|
| 全検査 | 55 |
| 合格 | 33 |
| 不合格 | 22 |
| skipped | 0 |
| 終了コード | 1 |
| 実行時間 | 約3.2秒 |

24/28だった早期検査を部分合格と扱わなかったのと同様に、33/55も部分合格とは扱わない。

## 5. 不合格の内容

### 5.1 strict JSONの復号object形

適法なescapeと補助平面文字の往復検査で、値と文字列は一致したが、復号objectのprototypeが一致しなかった。

- 実装: 重複keyを安全に検出するため、復号objectをnull prototypeで作る
- 検査期待: 通常の`Object.prototype`を持つobjectと完全一致
- 承認済み契約: メモリ内値は通常objectとnull prototype objectの双方を受理

したがって、この不合格は値の破損ではなく、**検査期待が契約で許した二形式の一方だけへ狭まっている不一致**である。どちらのprototypeを復号結果の正本にするか、または値同一だけを検査するかは、今回の承認範囲で独自決定しない。

### 5.2 承認済み外部台帳の小数とB1共通canonical化

正常fixtureを作る途中で、レンダラー信頼台帳をB1共通canonical化へ渡すと`number-invalid`になり、fixture生成が停止した。

信頼台帳には、人間がpreviewで認定した次の小数値が実在する。

- 文字周囲の安全余白比率 `0.04`
- 横方向の安全余白比率 `0.04`
- 縦方向の安全余白比率 `0.02`
- 代替文字領域比率 `0.98`

一方、承認済みB1契約は次の二つを同時に要求している。

1. レンダラー信頼台帳を含む外部JSON 5件へcanonical SHA-256を記録する
2. B1共通strict JSONはsafe integerだけを許し、「B1には小数fieldを置かない」

つまり、**B1自身が所有する成果物の数値制約と、B1が束縛する承認済み外部台帳のcanonical化範囲が両立していない**。これは今回の未完成4件とは別に、完成版検査が初めて露出させた契約・入力境界の不整合である。

### 5.3 波及

正常fixtureを作れないため、多くのpackage検査が同じ準備段階で不合格になった。最後の違反コード完全性検査も、前段のfixture生成停止により本来の観測集合を作れず不合格になった。これらを独立したproduction欠陥とは数えない。

## 6. 帰属

- 早期の不合格4検査は、当初の報告どおり、**公開入口2件の欠落をまとめて検出した未完成実装1件と、BOM・通常object・`toJSON`優先順位の実装欠陥3件**であり、契約側の欠陥ではなかった。今回すべて契約記載へ合わせて完成した。
- 今回のprototype不一致は、実装が許可された形式を返す一方、検査が一形式だけを期待した**検査期待の不一致**である。
- 今回の小数不一致は、承認済み外部入力とB1共通canonical化規則が同時に成立しない**契約・工程間境界の不整合**である。
- したがって、「検査が未完成実装を正しく検出した」という早期停止の帰属は維持するが、完成版が契約どおり通るとは確認できなかった。

## 7. 停止後に行っていないこと

- 不合格箇所の修正
- 検査期待値の変更
- package側の部分再実行または全件再実行
- 意味回答側B2全検査
- ゲートA既存回帰
- 残存source atom既存回帰
- candidate 13読み取り専用preflight
- 正式7-file package生成
- prompt登録
- Gemini実走
- 正式表示計画、指示書、描画

既存の正式成果物、fixture、expected、candidate 13正式基礎映像は変更していない。

## 8. 次に必要な人間判断

再実行の前に、契約改訂または検査契約の追補として次の2点を一意にする必要がある。

1. strict JSON復号objectの正本prototypeと、往復検査で比較する範囲
2. B1所有成果物の整数限定と、承認済み外部JSONの小数をcanonical hashへ束縛する処理の境界

特に2は、実装者が小数を勝手に許可する、信頼台帳を書き換える、外部台帳だけ暗黙例外にする、のいずれも不可。対象、入口、違反理由、hash手順を版付きで固定してから完成版検査の新しい1回を承認する必要がある。

人間へ必要なのは媒体視聴ではなく、上記契約方針の判断1セッションだけである。
