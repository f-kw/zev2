# candidate 13 字幕表示計画 B4 数値token結果不変baseline 停止報告 v001

- 日付: 2026-07-25
- 対象: JSONPath別数値token方針の実装前baseline
- 結果: **baseline不成立で停止**
- parser変更: なし
- 限定実装: 未着手
- 検査327件: 未実行
- preflight v002: 未実行
- Gemini、正式変換、描画: なし

## 1. 到達地点

承認済みの順序に従い、既存の厳密JSON解析処理へ触る前に、次を作成した。

1. 変更前後の結果不変を保存するtest-only投影処理。
2. 内部配置JSON読取の新規12件検査file。
3. 変更前投影の初回生成物`before.json`。

生成process自体は終了0だった。しかし、生成後の保存物を契約schemaと照合したところ、固定hash確認欄が事前登録した型に一致しなかった。このため`before.json`を有効なbaselineとして固定せず、parser変更へ進まなかった。

## 2. 不一致

事前登録した`fixedHashProbe`は次のexact objectである。

```json
{
  "utf8": "<固定文字列>",
  "inputBytesSha256": "<64 hex>",
  "returnedStatus": "<hash入口の状態>",
  "returnedSha256": "<64 hex>"
}
```

実際の初回生成物は次の形になった。

```json
{
  "returnedStatus": "invalid",
  "returnedSha256": {
    "status": "hashed",
    "sha256": "7d953836906d34a8091e3c65118aa458de8e46dd93131e662cdd2d5ef7fa7fb4"
  }
}
```

固定hash入口は文字列でなく`{status, sha256}`を返す。test-only投影処理が返値の二fieldを取り出さず、object全体を`returnedSha256`へ保存したことが原因である。

## 3. 帰属

| 対象 | 状態 | 帰属 |
|---|---|---|
| productionの厳密JSON解析処理 | byte不変 | 無傷 |
| 固定hash入口 | 契約どおり`{status, sha256}`を返した | 無傷 |
| test-only投影処理 | 返値の受け取り形式が不一致 | 検査harnessの実装欠陥 |
| 生成済み`before.json` | exact schema不適合 | baselineとして不採用 |

production parserのSHA-256は承認前の固定値
`db3b5968207479d8f6849c9995224140b8286844ed1c17b1e75c89ac718bf224`
のままである。

## 4. 実体hash

| 実体 | SHA-256 |
|---|---|
| test-only投影処理を含む既存source package検査file | `2ba31fc7b52d98edd6a975475df583d54b9a6eeba8c533755dfe9a6ec0ce10a5` |
| 新規12件検査file | `7a60a26a606e9b57494ee0476b463046e8ebbce5711ed16e23c6972c0f055380` |
| 未変更のparser所有file | `db3b5968207479d8f6849c9995224140b8286844ed1c17b1e75c89ac718bf224` |
| schema不適合の初回`before.json` | `1c86c009ab6f73475fb2897dc42228d668cbb3b82c59e8dc6b13905aa944800d` |

## 5. 停止条件との照合

承認済み追補は、parser変更前のbaselineを固定できない場合、同attemptで直して再生成せず停止すると定めている。

よって次を行っていない。

- test-only投影処理の修正。
- `before.json`の削除または再生成。
- parser、runner、bindingの変更。
- 新規12件、既存133件、B4 87件、回帰95件の実行。
- candidate 13 preflight v002の生成・実行。

## 6. 再開に必要な判断

次の一件が新たに承認された場合だけ再開できる。

1. test-only投影処理で、固定hash入口の返値から`status`と`sha256`を明示的に取り出す限定修正。
2. schema不適合の初回`before.json`は失敗証拠として保持し、別attempt・別保存先または版付きfile名で、変更前baselineを新たに一回生成する。
3. 新しいbaselineがexact schemaへ適合した場合だけ、承認済み限定実装と後続検査へ進む。

これはproduction契約の変更ではなく、baselineを作る検査harnessの修正である。修正・再実行は本停止時点では行わない。
