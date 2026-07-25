# candidate 13 字幕表示計画 B4 承認済み文書 binding更新記録 v001

- 日付: 2026-07-26
- 対象: B4設計書2件
- 更新根拠: kawafmmによる`a651e73b`追記の承認済み改訂確認
- 更新前preflight: 6件中4件合格・2件不合格
- 目的: 承認済み非互換改訂を文書照合のapproval chainへ反映する
- 検査緩和: なし

## 1. 差分限定確認

初回承認byteとcommit
`a651e73b043bd8cb97bfffe2f284a35ede90abd7`
のbyteをpath単位で比較した。

### 1.1 B4表示計画・v003対生成契約 設計v001

```text
8 insertions
0 deletions
```

追加内容は次の2箇所だけだった。

1. 冒頭へ6行の改訂履歴表。
   - 人間承認済みの8不合格診断追補と実装修正設計を根拠として明記。
   - validation report v002への非互換改訂を案内。
2. §11直前へ2行の改訂注記。
   - report v001を今後受理しない。
   - v002の正本文書を明示。

既存行の削除、置換、並べ替えは0件だった。

### 1.2 B4実装契約追補v001

```text
8 insertions
0 deletions
```

追加内容は冒頭の改訂履歴だけだった。

1. 6行の改訂履歴表。
   - 69違反の所有表、code 60の段階別所有、report v002、全null失敗報告を新正本として案内。
2. 2行の非互換注記。
   - 旧本文を履歴として残す。
   - report v001の受理、変換、互換処理を禁止。

既存行の削除、置換、並べ替えは0件だった。

## 2. 限定確認の結論

両文書の差分は、承認済みの改訂履歴と新正本案内の追記だけである。承認範囲外の変更は含まれない。

この確認は、行数だけでなく`git diff --unified=0`の全追加行を読み、削除0件を確認して行った。

## 3. binding更新値

| path | 旧approval commit | 新approval commit | 新blob | 新byte | 新SHA-256 |
|---|---|---|---|---:|---|
| `...b4-display-plan-contract-design...md` | `b86178e2` | `a651e73b043bd8cb97bfffe2f284a35ede90abd7` | `0638369fd62e6e16a3ce4178cd25a0fd49d14c43` | 40,706 | `d16aa8fb366157ef4be30a822831e95eaed5f3616d959f8b3751c74d72c86281` |
| `...b4-implementation-contract-addendum...md` | `cfa558ab` | `a651e73b043bd8cb97bfffe2f284a35ede90abd7` | `788c73c92c5ca85e8eacd9f464b40dc5185e9cec` | 60,791 | `50bd103a338449a7fe2395c9afcc58bb39d8853a6ca97b7e508c68144c056f0a` |

modeは双方`100644`のまま。path、対象件数、他4 binding、照合条件、failure codeは変更しない。

## 4. 今回の例外と恒久手順

今回のbinding更新は、commit `a651e73b`が既に存在する状態で、人間が改訂byteを再確認した後に行う遡及的なapproval chain修復である。

以後の標準手順は次とする。

1. 承認済み文書を改訂する前に、改訂内容と承認根拠を固定する。
2. 改訂文書のbyte、mode、blob、byte数、SHA-256を算出する。
3. 文書の改訂と対応bindingの更新を、同じGit commitの変更集合へ含める。
4. 同commitの直後に承認済み文書照合を実行する。
5. 文書だけ、またはbindingだけを先に進めない。
6. 不一致後に現在値へ追従させる更新は、人間の再確認なしに行わない。

現行binding形式が将来の同一commit更新を表現できない変更型に遭遇した場合は、改訂を実施せず、binding schemaの版付き改訂を先に人間へ戻す。

## 5. 再開条件

本更新後、承認済み文書照合を新attemptで一回実行する。

- 6/6合格なら、承認済みの来歴2成果物再構成へ進む。
- 1件でも不合格なら、同attemptでbindingや文書を直さず停止する。
