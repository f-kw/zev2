# candidate 13 package v002 正式生成前 条件衝突停止報告 v001

- 日付: 2026-07-27
- 対象: `DmWu0jVQfTE` candidate 13
- 状態: **package生成前・API送信前に停止**
- B6同一実行点の人間判断停止: **2/2**

## 結論

承認された案Aの次の2条件は、現行の承認済みpackage生成処理では同時に成立しない。

1. package v002を版付きの新しいdirectoryへ正式生成する。
2. v001との差分を、manifest/reportの承認済み来歴5欄だけに限定する。

新しいdirectoryへ正式生成すると、生成処理は新job、新package ID、新保存先をmanifest/reportへ必ず記録する。そのため、承認済み来歴5欄に加えて、版のidentityを示す6欄も必ず変わる。最小の差分は合計11欄であり、5欄にはできない。

一回限りの正式生成を、実行前から条件違反と分かっている状態で消費しないため停止した。package v002、B1 job、B4 job、B6 runner、Gemini応答は作っていない。

## 事実

### 実行状況

- package v002正式生成: 0回
- Gemini生成API: 0回
- 今回の追加費用: US$0
- `.env`とAPI key: 未読
- package v001: 不変
- B5正式6成果物と固定request: 不変
- 固定request SHA-256: `7fa902580b78bb5da3d36025135e4655ab2528e401ba5a76537f2af3c1939ed2`

### 現行生成処理が要求する差分

先頭5成果物の内容を同じに保つため、内容を表すartifact IDはv001のまま使える。一方、正式な版付き生成であることを表すjob、package、保存先はv002へ変える必要がある。

| 成果物 | 必ず変わる欄 | 区分 |
|---|---|---|
| manifest | `packageId` | 新しい版identity |
| manifest | `formalOutputPath` | 新しい版identity |
| manifest | `packageJobBinding.path` | 新しい版identity |
| manifest | `packageJobBinding.fileSha256` | 承認済み来歴 |
| manifest | `implementationBinding.files[0].fileSha256` | 承認済み来歴 |
| validation report | `jobBinding.path` | 新しい版identity |
| validation report | `jobBinding.fileSha256` | 承認済み来歴 |
| validation report | `package.packageId` | 新しい版identity |
| validation report | `package.formalOutputPath` | 新しい版identity |
| validation report | `manifestBinding.fileSha256` | 承認済み来歴 |
| validation report | `manifestBinding.canonicalSha256` | 承認済み来歴 |

承認済みの結果・来歴比較が許可したのは、この表の「承認済み来歴」5欄だけである。版付き新directory化で追加される「新しい版identity」6欄は、その比較では対象になっていなかった。

### 回避できない根拠

- manifestはjobのpackage ID、正式保存先、job snapshotをそのまま記録する。
- validation reportも同じjobとmanifestの実体を再記録する。
- package検査は、これらがjobと実成果物から再導出した値に一致しなければ不合格にする。
- v001の保存先は既に存在し、新しい正式生成の保存先として再利用できない。
- v001 jobの変更、成果物の手作業コピー、manifest/reportだけの書き換えは、いずれも「v001不変」または「現行承認済み実装で生成」の条件に反する。

## 推測

先頭5成果物はbyte同一になる見込みが高い。既存の結果・来歴比較では、同じ内容を現行package生成処理で再構成したとき、先頭5成果物が不変であることを確認済みである。

ただし、正式なv002を今回は生成していないため、正式v002のbyte同一は未確認である。

## 未確認

- 正式package v002の先頭5成果物がv001とbyte同一になるか。
- 固定した11欄以外の差分が0件になるか。
- v002へ束縛したB1とB4が合格するか。
- Geminiの一回回答がB1を通り、B4表示計画まで到達するか。

## 計画の差し替え案

同じB6実行点の停止が2/2に達したため、追加patchや第三の回避策を掘らず、計画ごと人間へ戻す。

推奨する差し替えは一つだけである。

> **案A2（推奨）**: 先頭5成果物のv001とのbyte同一を絶対条件のまま維持する。manifest/reportの差分許可だけを、承認済み来歴5欄と、版付き新directory化で不可避なidentity 6欄を合わせた固定11欄へ置き換える。11欄以外に1 byteでも差があれば停止する。合格時だけB1/B4をv002へ束縛し、B5固定requestを無改変でB6へ一回送る。

5欄限定を維持する場合、現行契約のまま版付き新directoryへpackage v002を正式生成することはできず、B6は停止を維持する。

人間作業は案A2の承認または却下1件だけ。目安1分未満、時間計測なし。
