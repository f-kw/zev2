# candidate 13 B5設計入力 差分棚卸し v001

- 日付: 2026-07-26
- 区分: 人間待ち充填方式の副線・読み取り専用整理
- 主線停止点: B4 T082・T083修正設計の承認待ち
- 人間作業: 0件

## 1. 目的

B5はGeminiを実行する段階ではない。B3の正式入力7ファイルとB4の表示計画契約を、変更不能なprompt・API送信payload・実行構成・漏洩検査・費用上限へ束縛する段階である。

本書はB5設計そのものではなく、B4完了後に設計へ入るための既決事項と未固定事項を分ける。

## 2. B5へ渡せる既存正本

| 入力 | 現在値 |
|---|---|
| B3正式source-only package | 固定7ファイル、一回生成、検査19/19、`stable/b3-complete-20260725` |
| 元発話 | 354文字 |
| 機械境界候補 | 205件 |
| 発話まとまり | 3件 |
| モデルが返せる内容 | 各containerの行末候補ID、1〜2行のmeaning groupだけ |
| 本文・時刻・ID | モデルに生成させず、B1の決定的処理が復元 |
| B4表示計画契約 | field、検査、正式7ファイル、review状態を固定済み。実装完了は未成立 |
| 正解情報 | 教師、expected、既存切り抜き、人間ラベルをモデルへ渡さない |

## 3. 既に確定しているB5方針

1. 正式な意味判断の実行経路はGemini APIを正本とする。
2. Web版Geminiは動画・見た目・品質の観察と評価に使い、正式意味回答へ転記しない。
3. 第一候補モデルは`gemini-3.6-flash`。モデル名をproduction coreやprompt本文へ定数として焼き込まず、承認済み実行構成の値にする。
4. 同一attempt内のモデル版変更は禁止。変更時は新attempt。
5. 一回実行、自動再試行0。無効出力を修復しない。
6. 正式B3 packageだけからpayloadを作る。
7. 最終prompt全文の実byte・SHA-256と、使用したB3・B4契約のhashを実走前に固定する。
8. token数は正式payloadから機械計測し、354文字・205候補へ独自係数を掛けて推定しない。
9. B5で固定するのは**費用上限の算出方法と上限値**であり、実費ではない。実費はB6のAPI応答に記録された実tokenから確定する。

## 4. B5設計で初めて固定する必要があるもの

| 領域 | 未固定事項 | B5で必要な成果 |
|---|---|---|
| prompt | system/user等の役割分け、B3内の仕事本文との参照関係、出力JSON以外を返さない指示 | 版付きprompt本文、唯一の正本、byte/hash |
| payload | APIへ送るfield、field順、モデル可視JSON、出力上限 | exact schema、formal serializer、payload byte/hash |
| API入口 | API製品・endpoint・SDK/HTTP方式、認証情報の参照方法 | secretを成果物へ含めない実行契約 |
| モデル | 設定モデルIDと応答モデル表記の関係 | execution configとmanifest field |
| token | 実行モデルに対応した事前計測方法 | 入力token計測器、実体・版・失敗条件 |
| 費用上限 | 入力token、最大出力token、呼出回数1、承認時単価 | 入力・出力・合計を分けた上限。実費表現は禁止 |
| 応答保存 | APIのHTTP状態、headersの許可範囲、raw body、モデル表記、usage | raw responseを改変せず保存する版付きmanifest |
| 漏洩 | 許可field、値の由来、最終prompt全文 | shape・元値一致・全文走査の三検査 |
| 一回性 | attempt ID、送信前状態、送信済み状態 | 二重送信を拒否するjob／lock／report契約 |
| 停止 | timeout、API拒否、raw不正、usage欠落 | 再試行せず失敗を保存して停止する帰属 |

## 5. 費用欄の分離

B5:

- 正式payloadの入力token実測。
- 最大出力token。
- 呼出回数1。
- 承認時点の入力・出力単価と出所。
- 以上から求める入力費上限、出力費上限、合計上限。

B6:

- API応答が返した実入力token。
- 実出力token。
- 必要ならAPIが区別して返すcached/reasoning等のtoken内訳。
- B5で固定した単価規則による実費。

B5の上限をB6の実費として報告しない。B6の実費が上限を超える、またはusageが欠落する場合は、推測で埋めず停止する。

## 6. 既存文書との表現差

過去文書にはB6を「Web版Gemini」「Edgeでモデル確認・タブ終了」とした記述がある。

- `presentation-candidate13-caption-gate-b1-implementation-contract-design-20260723-v001.md`
- `presentation-candidate13-caption-gate-b1-contract-readiness-inventory-20260723-v001.md`
- `presentation-candidate13-caption-gate-b-direction-approval-readiness-audit-20260723-v001.md`
- `presentation-candidate13-caption-gate-b1-contract-authority-matrix-20260723-v001.md`

これは当時の実行面候補の記録であり、2026-07-26のkawafmm確定「正式意味判断=API、Web=品質評価」で上書きされる。B5設計時は、旧文書を黙って編集せず、版付き改訂履歴と新正本への案内を付ける。

モデル第一候補と単価も人間指定の記録であり、実走前にB5で出所・適用日・単位を固定する。現在の本書では価格確認や費用計算を行わない。

## 7. B5へ進める条件

B5設計の起草条件はB4完了である。現時点はT082・T083の修正設計承認待ちで、B4の全検査・preflight・安定点が未成立であるため、prompt本文、payload、API job、token計測、費用計算を作っていない。
