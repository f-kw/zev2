# candidate 13 B6 実走前 binding 矛盾停止報告 v001

- 日付: 2026-07-27
- 対象: `DmWu0jVQfTE` candidate 13
- 状態: **API送信前に停止**
- B6同一実行点の人間判断停止: **1/2**

## 結論

Geminiへ固定requestを送る直前の読み取り監査で、既存B1受入検査が回答内容に関係なく必ず不合格になるbinding矛盾を確認した。

課金してから既知の不合格へ流すことを避けるため、APIは呼んでいない。B6 runner、正式raw応答、B1 job、B4表示計画も作っていない。

## 事実

1. B5で固定した送信requestは次のまま保全されている。
   - path: `evals/clip_composition/outputs/presentation/caption-gate-b5/DmWu0jVQfTE-candidate-13-v002/generate-content-request.json`
   - SHA-256: `7fa902580b78bb5da3d36025135e4655ab2528e401ba5a76537f2af3c1939ed2`
   - byte数: 36,913
2. B3正式packageの`package-manifest.json`は、package生成処理を次の旧SHAへ束縛している。
   - `db3b5968207479d8f6849c9995224140b8286844ed1c17b1e75c89ac718bf224`
3. 現在の同じpackage生成処理の実体SHAは次である。
   - `c81ef4b9829d8bc3d5bc84a048eaae6886caec90cbb77b1635af916512cdd1b6`
4. B1受入検査は、jobが示すpackage生成処理SHAについて、次の両方を同時に要求する。
   - 現在の実ファイルSHAと一致すること。
   - B3正式packageのmanifest内SHAと一致すること。
5. 2と3が異なるため、現行の一つのB1 jobでは両条件を同時に満たせない。
6. SHA変更はB4で承認済みの数値token処理追加に由来する。既存の結果・来歴比較は、B3の意味入力と先頭5成果物の処理結果が不変で、変わったのはmanifest/reportの承認済み来歴5欄だけであることを確認済み。
7. 固定request本文には旧package pathおよび旧artifact IDは含まれない。requestを変更せず、同じ意味入力へ束縛した版付きpackageを使える余地がある。
8. API呼出回数は0回、今回の追加費用はUS$0、`.env`とAPI keyは読み取っていない。

## 推測

最短で契約を弱めずに解消する案は、**現行の承認済みpackage生成処理で版付きpackage v002を新規生成し、意味入力5成果物のbyte不変とmanifest/reportの来歴差だけを検査して、B1と後続B4をv002へ束縛すること**である。

この案なら次を維持できる見込みが高い。

- B5の固定requestを1 byteも変えない。
- 旧B3正式package v001を変更・削除しない。
- B1のSHA完全一致を緩めない。
- 現行実装を旧版へ戻さない。

## 未確認

- package v002を実際に生成したとき、先頭5成果物が正式v001とbyte単位で全て一致するか。
- 新manifest/reportだけへ差が限定されるか。
- v002へ束縛した正式B1 jobとB4 jobが全検査を通るか。

これらは案の承認後、API送信より前に1回だけ検査すべき事項である。

## 人間判断の依頼

推奨案を1件だけ承認してほしい。

> **案A（推奨）**: 現行の承認済みpackage生成処理でcandidate 13のsource-only package v002を版付き新directoryへ1回生成する。意味入力5成果物がv001とbyte同一、差分がmanifest/reportの承認済み来歴だけであることを検査する。合格時のみB1/B4をv002へ束縛し、固定requestのB6一回実走を再開する。v001とB5 requestは不変。

人間作業はこの承認1件だけ、目安1分未満。案Aが不承認ならB6は停止を維持する。
