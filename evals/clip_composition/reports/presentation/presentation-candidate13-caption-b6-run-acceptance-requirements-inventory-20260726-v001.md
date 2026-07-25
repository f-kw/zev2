# candidate 13 B6実走 受入要件棚卸し v001

- 日付: 2026-07-26
- 区分: 人間待ち充填方式の副線・読み取り専用整理
- 人間作業: 0件
- 実走: 0回

## 1. B6の仕事

B6は、B5で封印したprompt・payload・実行構成を一回だけGemini APIへ送り、raw応答を保存し、既存B1意味回答検査へ渡す段階である。

B6でprompt、出力shape、モデル、出力上限、漏洩規則を結果に合わせて変えない。正式表示計画・指示書・描画はB7であり、B6へ前倒ししない。

## 2. 実走前にB5で固定済みでなければならない項目

| 項目 | B5で固定するもの |
|---|---|
| 入力 | B3正式7ファイルとそのhash |
| prompt | 版、全文byte、SHA-256 |
| payload | exact schema、formal byte、SHA-256 |
| モデル | 設定モデルID。第一候補`gemini-3.6-flash` |
| 回数 | 1 |
| 再試行 | 0 |
| 出力 | 最大token、期待MIME／JSON形 |
| 漏洩 | shape、正式元値一致、最終全文走査 |
| token | 事前入力tokenの機械計測方法と実体 |
| 費用 | 入力・出力・合計の上限 |
| 保存 | raw request／response、execution manifest、failure reportのpath |
| 停止 | API失敗、timeout、usage欠落、無効JSON、契約違反時の処理 |

一項目でも未固定ならB6を開始しない。

## 3. B6で初めて実測する項目

| 項目 | 記録 |
|---|---|
| 実行日時 | timezone付き |
| attempt | 一意ID |
| 設定モデルID | B5値のexact copy |
| API応答のモデル表記 | 応答から取り出した原値 |
| request | 送信byte数・SHA-256 |
| raw response | 受信byte数・SHA-256、改変前保存 |
| HTTP/API状態 | 応答コードと版付き失敗分類 |
| usage | APIが返した入力・出力・その他内訳 |
| 実費 | B5の単価規則へ実usageを適用した値 |
| 受入検査 | B1の形式・候補対応・順序・本文不変検査 |
| compiler | 再構成した入力のbyte／canonical SHA-256 |

B5の費用上限とB6の実費は別欄にする。

## 4. 成功条件

1. 送信は一回だけ。
2. 設定モデルIDがattempt途中で変わっていない。
3. raw requestがB5正式payloadとbyte一致。
4. raw responseを部分抽出や修復前に保存できた。
5. API応答上のモデル表記とusageをmanifestへ記録できた。
6. B1 raw意味回答契約が完全合格。
7. 候補外ID、本文改変、候補順変更、container横断、欠落、重複が0件。
8. compiler入力を決定的に一件作り、検査報告の二hashを固定できた。
9. 正式B3 package、B4契約、prompt、payload、raw応答の来歴が一つのmanifestで追える。
10. B7の正式成果物はまだ作っていない。

成功しても「読みやすい」ことは証明しない。読みやすさはB7の初描画で人間が確認する。

## 5. 失敗時

次は全て、raw観測とfailure reportを保存して停止する。

- API接続・認証・timeout・rate limit。
- 応答モデル表記の不一致または欠落。
- usageの欠落。
- raw応答がJSON一件でない。
- 候補外位置、本文改変、順序変更。
- B1検査の違反。
- B5費用上限の超過。
- 正式入力または実装bindingの差し替わり。

自動再試行、モデル変更、prompt修正、JSON修復、部分的な回答採用は行わない。再実行が必要なら新attemptとして人間へ戻す。

## 6. 実走後の停止点

- 成功: B6完了報告と正式回答のhashを提示し、B7正式表示計画・v003対生成の別承認で停止。
- 失敗: 観測・帰属・再開に必要な判断だけを提示して停止。

本棚卸しはB6の実装・API接続・実走を許可しない。
