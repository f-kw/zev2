# candidate 13 字幕表示計画 B4 結果・来歴分離不変比較 契約追補 v001

- 日付: 2026-07-25
- 対象:
  - `presentation-candidate13-caption-gate-b4-jsonpath-number-token-policy-contract-addendum-20260725-v001.md`
  - `presentation-candidate13-caption-gate-b4-number-token-invariance-comparison-stop-report-20260725-v001.md`
- 種別: 不変比較の「処理結果」と「実装来歴」を分離する版付き契約追補
- 状態: **草案。kawafmm承認待ち**
- コード変更: なし
- 既存観測の再取得: なし
- 検査実行: なし
- Gemini、正式変換、描画: なし
- 人間作業: 本追補の承認または却下1件

## 1. 結論

不変比較を次の二層へ分ける。

1. **処理結果層**: 同じ意味の入力へ同じ処理を行った結果。ここは完全不変を要求する。
2. **来歴層**: 実装file、tool、入力実体等の同一性を記録する情報。ここは、承認済み変更へ対応する、事前列挙済みの差だけを許す。

二層の片方だけが合格しても全体を合格にしない。

```text
全体合格
  = 処理結果層が完全不変
  AND 来歴層の変更元が承認済み実体と一致
  AND 来歴層の変更pathが事前allowlistと完全一致
  AND 来歴から派生するformal/canonical hashが既存処理で再計算一致
  AND allowlist外の変更0件
```

「来歴欄だから変化してよい」というobject単位の免除は作らない。変更を許すのは、承認済みcommit・file path・before/after実体SHAへ束縛したleaf pathだけである。

本件では、既存比較がすでに確定した処理結果層を再生成しない。追加するのは、来歴差分の再構成と照合だけである。

## 2. 現在の`failed`の意味

既存比較:

```text
evals/clip_composition/outputs/presentation/
  caption-b4-number-token-invariance-v002/comparison.json
```

は次を記録している。

| 観測 | 結果 |
|---|---|
| harness byte | 不変 |
| B3正式7 JSONの入力・復号・canonical hash | 不変 |
| 外部表示情報6 slot | 不変 |
| builder先頭5成果物 | 不変 |
| 固定hash probe | 不変 |
| package manifest | hash変化 |
| package validation report | hash変化 |
| 総合 | `failed` |

最後の2成果物は、package core実体hashを実装来歴へ含む。今回の承認済み変更はそのpackage core file自身を変更するため、hash変化は設計上必要である。

比較器は差を正しく検出した。しかし「処理結果の差」と「来歴の差」を同じ`projectionUnchanged`へ畳んだため、正当性を判定できず`failed`になった。本追補は検出を弱めず、検出後の帰属を二層へ分ける。

既存`comparison.json`は失敗証拠として変更しない。新しい二層照合が合格しても、過去の`failed`を`passed`へ書き換えない。

## 3. 適用範囲

### 3.1 標準形として採用する

本追補の結果・来歴二層比較を、今回だけの例外ではなく、**実装・tool・入力の同一性を成果物へ記録する工程の不変比較の標準形**とする。

対象例:

- 実装file SHAをmanifestへ持つ生成工程。
- Node、FFmpeg、TSX等の実体hashを実行記録へ持つ工程。
- 入力媒体・fixture・台帳のhashを来歴へ持つ工程。
- manifestを参照するvalidation reportのように、来歴成果物のhashから二次的に変化する成果物。

標準化の理由は、実装やtoolを正当に更新すれば、処理結果が不変でも来歴hashは変わる構造が繰り返し現れるためである。FFmpeg実体差、Node実体束縛、今回のpackage core実体差と同型である。

ただし、標準化は「来歴変化の一般許可」を意味しない。各ゲートは実走前に次を個別固定する。

1. 結果層のexact projection。
2. 来歴層の成果物・leaf path。
3. 変更を許す承認済みcommit、file path、before/after SHA。
4. 一次変更から派生するhashの計算経路。
5. allowlist外変更時の停止点。

過去の比較結果を遡って再判定しない。今後の比較と、本件の未完了比較にだけ適用する。

### 3.2 適用しないもの

- 意味・本文・時刻・件数・IDの変化。
- formal schemaの変化。
- 変更理由が承認済みcommitへ束縛されていない実装差。
- 「診断情報」「metadata」等の広いobject名だけで許す変化。
- temporary path、時刻、duration等を後から除外する処理。
- 不合格を通すためのignore option、wildcard path、正規表現allowlist。

## 4. 本件の固定済み入力

### 4.1 既存観測

| role | path | SHA-256 |
|---|---|---|
| 不成立baselineの証拠 | `caption-b4-number-token-invariance-v001/before.json` | `1c86c009ab6f73475fb2897dc42228d668cbb3b82c59e8dc6b13905aa944800d` |
| 成立したbefore | `caption-b4-number-token-invariance-v002/before.json` | `885775b57e57c0f86755eae2259cdb5912877db58cf1bf6409acafb784d35ac0` |
| 成立したafter | `caption-b4-number-token-invariance-v002/after.json` | `7988633dcba02572bed1237b63bf2ab1a33e9a2074552d942c93b3c7e8719c5e` |
| failed比較 | `caption-b4-number-token-invariance-v002/comparison.json` | `aff2a58d8d8b25464690003d17b9a23a56bd98ebce5ef6a518e5620e61fa7512` |

不成立baselineは来歴差分照合へ使わない。失敗証拠として保持するだけである。

### 4.2 承認済み実装差

| 項目 | before | after |
|---|---|---|
| commit | `9f95e3fa2023d4d9755bdf1e0ab32f7cb163ca80` | `171751885fc75943b392c566309062916118ba98` |
| file | `evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs` | 同左 |
| file SHA-256 | `db3b5968207479d8f6849c9995224140b8286844ed1c17b1e75c89ac718bf224` | `c81ef4b9829d8bc3d5bc84a048eaae6886caec90cbb77b1635af916512cdd1b6` |

照合器は、commit文字列を記録するだけでなく、各commitに保存された当該fileの実byteをGit objectから読み、そのSHA-256が表と一致することを必須とする。

after SHAは作業ツリーの値ではなく、承認済み実装commit内の実体を正本とする。作業ツリーが同じ値であることは実装再開前チェックで別途確認する。

## 5. 処理結果層

### 5.1 完全不変を要求するprojection

既存`before.json`と`after.json`から、次だけを処理結果層として取り出す。

1. `projection.b3StrictJson`全件。
2. `projection.externalDisplaySlots`全件。
3. `projection.builtArtifacts[0..4]`。
4. `projection.fixedHashProbe`。

比較は既存canonical化処理によるbyte完全一致とする。fieldを省略した独自要約hashは作らない。

合格条件:

- 配列長と順序が同じ。
- 全path、role、file名が同じ。
- 全入力file SHAが同じ。
- 全statusが同じ。
- 全formal/canonical SHAが同じ。
- 固定hash probeの入力と返値が同じ。

この層にはmanifestとvalidation reportを含めない。両者を検査対象から捨てるのではなく、§6の来歴層へ移す。

### 5.2 既存観測の再取得禁止

§5.1は、既存`before.json`と`after.json`を読むだけで検査する。B3、外部表示情報、builder先頭5成果物、hash probeを再生成しない。

既存観測で次は成立済みである。

```text
harness不変
外部入力不変
処理結果層不変
水平確認の追加0件
```

新しい照合器はこれを再取得せず、固定済みfile SHAと内部値を再読して確認する。

## 6. 来歴層

### 6.1 対象成果物

| artifact | before formal SHA | after formal SHA | before canonical SHA | after canonical SHA |
|---|---|---|---|---|
| `package-manifest.json` | `c3f553a2aa2f951c18cefe82a1a07e9331f5ccef8600ef6b89821eb687242bc7` | `108821740fdb5c3cd9685508d131b1864f063caf913e3be851640af194996d7b` | `4a1e3aa69f9c23412800ab136425373f286e97575a6abdb7baa5ec565e8af68c` | `e0c258f9cd2a5127839481693a786563828b7c35a8bf9ff8a93fad0841ce2ed9` |
| `package-validation-report.json` | `259a1743c302e63c6de116112f0c3ae5382a6c86d21f546a9d00c6b62931a008` | `9a29022e9a1fc1dda49be16c1862135659080be0b9815ae15a49351df4429131` | `cd2fafb21e1421cbd884f28a295c7cbdbbc6d86602de700ad8a10d5c8cb43a5a` | `80f9a7c44e2a815b8f859d59e4f5cee6149df714a6a16e0bf8b766baa2eff9fa` |

### 6.2 一次変更

一次変更として許すのは一件だけである。

```text
package core実体
  db3b5968... -> c81ef4b9...
```

この差は次の三条件を全て満たさなければならない。

1. before/after commitの当該file実byte SHAが§4.2と一致。
2. after commitが、kawafmm承認済みのJSONPath別数値token限定実装を保存したcommitである。
3. parser所有file以外を一次変更元として追加していない。

job、CLI、環境変数、比較器入力から別の変更元を追加できない。

### 6.3 許可するleaf差分

package builderの既存構造から、一次変更で直接または決定的に変わるleaf pathを次へ固定する。

#### package manifest

1. `$.packageJobBinding.fileSha256`
2. `$.implementationBinding.files[0].fileSha256`

`implementationBinding.files[0]`はrole=`packageCore`、path=
`evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs`
でなければならない。

`packageJobBinding.fileSha256`は、同じjobの
`implementationBinding.files[0].fileSha256`
だけをbefore/afterで差し替え、既存formal serializerで再生成したjob byteのSHAと一致しなければならない。

#### package validation report

1. `$.jobBinding.fileSha256`
2. `$.manifestBinding.fileSha256`
3. `$.manifestBinding.canonicalSha256`

`jobBinding.fileSha256`はmanifestの`packageJobBinding.fileSha256`と一致する。

`manifestBinding.fileSha256 / canonicalSha256`は、§6.3の二leaf以外を変えずに既存formal/canonical処理で再生成したmanifestの値と一致する。

#### artifact外側のhash

`before.json / after.json`の`builtArtifacts`に記録されたformal/canonical SHAは、上記leaf差分を反映した実成果物の再計算値と一致する。

### 6.4 禁止する差分

- manifestの上記2 leaf以外。
- validation reportの上記3 leaf以外。
- 配列長、順序、role、path、schemaVersion。
- content artifactのhash。
- runtime、外部入力、Gate A、projection、check、violation、scope。
- `gitCommit`の後付け変更。
- self hashを合わせるための任意field変更。

deep diffの変更leaf path集合が§6.3と完全一致しなければ不合格とする。subsetも不合格である。期待した来歴更新が起きていないことも、古い実体を使った兆候だからである。

## 7. 追加照合の方法

### 7.1 再生成しないもの

- B3正式7 JSON。
- 外部表示情報6 slot。
- builder先頭5成果物。
- 固定hash probe。
- 既存`before.json / after.json / comparison.json`。

### 7.2 追加で再構成するもの

既存観測はmanifest/reportのaggregate hashだけを持ち、内部leaf差分を保存していない。このため、allowlist外変更0件を証明するには、二成果物の値だけを追加で再構成する必要がある。

再構成はtest-onlyで行い、production exportや観測点を増やさない。

1. current fixture builderへ、§4.2のbefore package core byteとSHAを持つstable snapshotを与える。
2. 同じbuilderへ、after package core byteとSHAを持つstable snapshotを与える。
3. その他のsnapshot byte、runtime観測、および
   `implementationBinding.files[0].fileSha256`以外のjob fieldを同一に固定する。
   job byte自体は、この一leafだけが異なるbefore/after jobを既存formal serializerで
   それぞれ再生成したものとする。
4. 各実行からmanifestとvalidation reportだけを取り出す。
5. 再構成した4 hashが§6.1の既存観測と完全一致することを確認する。
6. 一致した場合だけdeep leaf diffを§6.3と照合する。

これは処理結果層の再取得ではなく、既存aggregate hashに内部差分の説明を追加する**来歴照合だけの再構成**である。

再構成したbefore manifest/reportが既存before hashに一致しない場合、再構成方法が元観測を再現していないため停止する。after側も同じである。期待hashを再構成後の値へ動かさない。

### 7.3 実装場所

既存before/after harnessを変更しない。新しいtest-only照合器を次へ分離する。

```text
evals/clip_composition/
  verify_presentation_caption_number_token_result_provenance_v001.mjs
```

理由:

- 既存harnessのbyte不変観測を保持する。
- 過去の`failed`比較器を上書きしない。
- 結果層の再生成と来歴追加照合を混ぜない。

production file、runner、job schema、正式成果物schema、違反コードは変更しない。

## 8. 追加成果物

保存先:

```text
evals/clip_composition/outputs/presentation/
  caption-b4-number-token-invariance-v002/
    result-provenance-comparison-v001.json
```

exact root:

```json
{
  "schemaVersion": "presentation-caption-result-provenance-invariance-comparison-v001",
  "sourceObservationBindings": {},
  "approvedImplementationChange": {},
  "resultLayer": {},
  "provenanceLayer": {},
  "status": "passed"
}
```

### 8.1 sourceObservationBindings

固定済み`before / after / comparison`のpathとfile SHAを持つ。開始時・終了時に再読し、byte不変を要求する。

### 8.2 approvedImplementationChange

§4.2のbefore/after commit、file path、実byte SHAを持つ。Git objectから読んだ実体との一致結果を含める。

### 8.3 resultLayer

次だけを持つ。

```text
b3StrictJsonUnchanged
externalDisplaySlotsUnchanged
firstFiveBuiltArtifactsUnchanged
fixedHashProbeUnchanged
status
```

四booleanが全て真の場合だけ`passed`。

### 8.4 provenanceLayer

次を持つ。

```text
beforeReconstructionMatchesObservedHashes
afterReconstructionMatchesObservedHashes
approvedSourceHashTransitionMatches
changedLeafPaths
expectedChangedLeafPaths
unexpectedChangedLeafPaths
manifestDerivedHashesMatch
validationReportDerivedHashesMatch
status
```

`changedLeafPaths`と`expectedChangedLeafPaths`は、artifact名とJSONPathの固定順配列としてbyte一致を要求する。

`unexpectedChangedLeafPaths`は空配列だけを許す。

### 8.5 全体status

```text
resultLayer.status == passed
AND provenanceLayer.status == passed
AND source observation 3fileの開始後byte不変
```

の場合だけ`passed`。それ以外は`failed`で保存し、同attemptで修正・再実行しない。

## 9. 標準形のDECISIONS追記案

本追補が承認され、追加照合が合格した節目で、次を`DECISIONS.md`の実装契約完全性原則へ追記する。

> 不変比較の対象に実装・tool・入力の同一性を示す来歴情報が含まれる場合、処理結果層と来歴層を分ける。処理結果は完全不変を要求し、来歴差は承認済みcommit・file path・before/after実体hashと、事前列挙したleaf pathへ束縛する。来歴object全体の除外、wildcard、後付けignoreは禁止する。一次変更から派生するmanifest・report hashは既存formal/canonical処理で再計算し、allowlist外変更0件を合格条件とする。結果層または来歴層の片方だけでは全体合格にしない（2026-07-25、B4 JSONPath数値token不変比較の来歴分離）。

承認前は共有文書へ追記しない。

## 10. 既存観測を再取得しない根拠

既存`before / after`は同一harness SHAを持ち、次をすでに保存している。

- B3復号結果。
- 外部表示6 slot。
- builder 7成果物のformal/canonical SHA。
- 固定hash probe。

不足しているのは、後半2成果物の内部leaf差分だけである。よって、全projectionを再生成する必要はない。

追加照合は二成果物だけを再構成し、既存aggregate hashへ一致するかを確認する。一致しなければ既存観測を置き換えず停止する。この方法により、成立済み観測を取り直して期待値を動かす経路を作らない。

## 11. 追補承認後の順序

1. 承認済み文書と実装commitの作業ツリーbyte照合。
2. test-only来歴照合器を実装。
3. 既存`before / after / comparison`を再読。
4. 結果層を既存観測だけで再判定。
5. manifest/reportだけをbefore/after実装snapshotで再構成。
6. 既存4 aggregate hashとの一致を確認。
7. changed leaf path集合と承認済み実装SHAを照合。
8. `result-provenance-comparison-v001.json`を一回生成。
9. 総合`passed`の場合だけ、未検査の限定実装へ戻る。
10. 新規12件。
11. B4正式87件。
12. 意味回答側133件。
13. 回帰95件。
14. candidate 13 preflight v002。
15. B4完了報告。安定点3条件成立時だけtag＋JOURNALを同一commit。
16. B5 prompt・費用固定承認依頼を起草して停止。

不合格1件、既存hash不一致、allowlist外leaf差、新しい来歴変更元、未定義、契約矛盾のいずれかで停止し、同attemptで修正・再実行しない。

Gemini、正式表示計画生成、正式pair、描画、B5実装、B6は含まない。

## 12. 実装契約完全性チェック

| 項目 | 状態 | 根拠 |
|---|---|---|
| 結果層の範囲 | 固定 | §5 |
| 来歴層の成果物 | 2件に固定 | §6.1 |
| 一次変更 | commit・path・SHA一件 | §4.2、§6.2 |
| 許可leaf差 | manifest 2、report 3 | §6.3 |
| allowlist外変更 | 0件必須 | §6.4 |
| 派生hash計算 | 既存formal/canonical処理 | §6.3 |
| 既存観測の再取得 | 禁止 | §5.2、§7 |
| 追加取得 | manifest/report再構成だけ | §7.2 |
| 検査入口 | 新規test-only file一件 | §7.3 |
| 追加成果物schema | 固定 | §8 |
| production公開面 | 変更なし | §7.3 |
| 標準化範囲 | 来歴付き不変比較 | §3 |
| 停止条件 | 固定 | §8.5、§11 |
| 人間作業 | 承認1件 | 冒頭 |

本追補の範囲について、実装者判断を要する未確定は0件である。

## 13. 起草時に確認した作業ツリー差

本追補の正本入力である停止報告は、commit
`171751885fc75943b392c566309062916118ba98`
の保存byteを参照した。

起草時点の同fileの作業ツリー実体は、commit版と一致せず、一文字`å`だけの未コミット差になっていた。本追補ではそのfileを復元・編集・stageしていない。主体や原因を推測しない。

追補承認後の実装前チェックでは、承認済み文書の作業ツリー／commit照合原則に従い、この差の扱いを先に確定する必要がある。無断復元は行わない。

## 14. 承認依頼

次の一件を承認してほしい。

> `presentation-candidate13-caption-gate-b4-result-provenance-invariance-comparison-contract-addendum-20260725-v001.md`を承認する。処理結果層は既存観測で完全不変を維持し、来歴層は承認済みcommit `171751885fc75943b392c566309062916118ba98`のpackage core実体SHA変更と、事前固定したmanifest 2 leaf・validation report 3 leafだけを許す。既存観測は再生成せず、manifest/reportだけを追加再構成してaggregate hash・deep diffを照合する。二層比較は来歴付き不変比較の標準形として採用する。追補承認後は§11の順で進み、総合`passed`の場合だけ327件以降へ進む。Gemini、正式表示計画生成、描画、B5実装、B6は含まない。
