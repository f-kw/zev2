# candidate 13 字幕表示計画 B4 数値token結果不変比較 停止報告 v001

- 日付: 2026-07-25
- 対象: JSONPath別数値token方針の変更前後比較
- 結果: **比較`failed`で停止**
- 変更前baseline: v002 attemptで成立
- 限定実装: 作業ツリーへ適用済み、未検査
- 検査327件: 未実行
- preflight v002: 未実行
- Gemini、正式変換、描画: なし

## 1. 到達地点

前回の不成立baselineは
`caption-b4-number-token-invariance-v001/before.json`
として変更せず保持した。

承認された限定修正では、固定hash入口の返値
`{status, sha256}`
から二fieldを明示的に取り出した。test-only投影処理内の他の入口呼び出しを水平確認し、object返値を未分解で保存する同型箇所は追加0件だった。

別attemptとして次を一回生成した。

```text
evals/clip_composition/outputs/presentation/
  caption-b4-number-token-invariance-v002/before.json
```

この変更前baselineはexact schemaへ適合した。

| 項目 | 値 |
|---|---|
| harness SHA-256 | `adcfa52475f569dc14c5576b32af30009ca5d383b37e2a9ed5b60bb15442d02f` |
| 新規12件file SHA-256 | `7a60a26a606e9b57494ee0476b463046e8ebbce5711ed16e23c6972c0f055380` |
| 変更前parser SHA-256 | `db3b5968207479d8f6849c9995224140b8286844ed1c17b1e75c89ac718bf224` |
| `before.json` SHA-256 | `885775b57e57c0f86755eae2259cdb5912877db58cf1bf6409acafb784d35ac0` |
| 変更前projection canonical SHA-256 | `2899489ec74aa6cb90cb75ea1f2e8e116f678e203a0646ed3cd0f0244e1ca0be` |

exact schema適合後にだけ、承認済み範囲の限定実装を作業ツリーへ適用し、同じharnessで`after.json`と`comparison.json`を一回生成した。

## 2. 比較結果

```json
{
  "harnessUnchanged": true,
  "inputsUnchanged": true,
  "projectionUnchanged": false,
  "beforeProjectionCanonicalSha256": "2899489ec74aa6cb90cb75ea1f2e8e116f678e203a0646ed3cd0f0244e1ca0be",
  "afterProjectionCanonicalSha256": "7068592b34d7c3c957cbeae9dda6de57f9350b284e3f980075f7cc956033eda1",
  "status": "failed"
}
```

| file | SHA-256 |
|---|---|
| `before.json` | `885775b57e57c0f86755eae2259cdb5912877db58cf1bf6409acafb784d35ac0` |
| `after.json` | `7988633dcba02572bed1237b63bf2ab1a33e9a2074552d942c93b3c7e8719c5e` |
| `comparison.json` | `aff2a58d8d8b25464690003d17b9a23a56bd98ebce5ef6a518e5620e61fa7512` |

## 3. 変化した投影

変化したのは、正常fixtureが作る7成果物のうち次の2件だけだった。

| 成果物 | before file SHA | after file SHA | before canonical SHA | after canonical SHA |
|---|---|---|---|---|
| package manifest | `c3f553a2aa2f951c18cefe82a1a07e9331f5ccef8600ef6b89821eb687242bc7` | `108821740fdb5c3cd9685508d131b1864f063caf913e3be851640af194996d7b` | `4a1e3aa69f9c23412800ab136425373f286e97575a6abdb7baa5ec565e8af68c` | `e0c258f9cd2a5127839481693a786563828b7c35a8bf9ff8a93fad0841ce2ed9` |
| package validation report | `259a1743c302e63c6de116112f0c3ae5382a6c86d21f546a9d00c6b62931a008` | `9a29022e9a1fc1dda49be16c1862135659080be0b9815ae15a49351df4429131` | `cd2fafb21e1421cbd884f28a295c7cbdbbc6d86602de700ad8a10d5c8cb43a5a` | `80f9a7c44e2a815b8f859d59e4f5cee6149df714a6a16e0bf8b766baa2eff9fa` |

次は全て不変だった。

- B3正式7 JSONの復号状態とcanonical SHA。
- 外部表示情報6 slotの入力hash、解決状態、canonical SHA。
- builderの先頭5成果物。
- 固定hash入口の状態とSHA。

## 4. 原因

`makeValidFixture()`は、正常fixtureを作る時点のpackage core実体を読み、そのSHAを実装bindingへ入れる。

package manifestとpackage validation reportは、その実装bindingを来歴として保持する。今回の承認済み変更は同じpackage core file内の厳密JSON解析処理を変更するため、package coreの実体SHAが次へ変わった。

| phase | parser所有file SHA-256 |
|---|---|
| before | `db3b5968207479d8f6849c9995224140b8286844ed1c17b1e75c89ac718bf224` |
| after | `c81ef4b9829d8bc3d5bc84a048eaae6886caec90cbb77b1635af916512cdd1b6` |

したがって、処理結果の意味が不変でも、実装来歴を含むmanifestとreportのbyte・canonical SHAは変わる。

一方、現行比較器の`inputsUnchanged`はB3正式7 JSON、外部表示情報6 slot、固定hash probeだけを入力投影としており、package core実体hashを含めていない。このため`inputsUnchanged: true`と、実装binding由来の2成果物変化が同時に成立した。

これはparser実装の動作不良を示す結果ではない。ただし、承認済み契約が要求する`projectionUnchanged: true`を満たしていないため、限定実装を合格とも不合格とも判定せず停止する。

## 5. 停止時の作業ツリー

次の限定実装は作業ツリーへ存在するが、検査未実行であり完成扱いしない。

1. 単一parserのJSONPath追跡と29 pathの数値token方針。
2. 内部配置結果のexact schema読取入口。
3. 配置結果を専用入口で読むrunner変更。
4. 13件目の共有JSON契約実体binding。
5. B4合成検査T086・T087。

変更後投影が不合格になった時点で、次を行っていない。

- 新規12件。
- source package 133件。
- B4正式87件。
- 回帰95件。
- candidate 13 preflight v002。
- 完了報告、安定点tag、JOURNAL、B5承認依頼。

## 6. 再開に必要な契約判断

現行契約の二要求は、そのままでは同時に成立しない。

1. parser所有fileを変更する。
2. そのfileの実体hashを来歴へ含むmanifest・reportのformal/canonical hashも含め、投影を完全不変にする。

再開前に、不変比較の正本を版付き追補で確定する必要がある。

推奨は、処理意味の不変と実装来歴の正当な変化を分けることである。

- B3復号、外部表示6 slot、先頭5成果物、固定hash probeは従来どおり完全不変を要求する。
- manifest・validation reportは、package core実体hashの変更から決定的に派生する来歴fieldと、その自己hashだけを「事前に列挙した期待変化」として検査する。
- それ以外のfield変化は不合格にする。
- `inputsUnchanged`へpackage coreのbefore/after SHAを明示し、「全入力不変」という誤読を防ぐ。

これは検査harnessの修正だけでなく、承認済みの「projection完全不変」契約の改訂である。独自に直して再比較せず、人間承認を待つ。
