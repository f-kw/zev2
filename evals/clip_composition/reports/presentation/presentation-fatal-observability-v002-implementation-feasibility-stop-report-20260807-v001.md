# fatal観測性 v002 実装前現物調査 停止報告 v001

- 日付: 2026-08-07
- 対象HEAD: `84c723362de8a0ee0d74fd0303eabab0992c879f`
- 承認済み完全実装設計: `presentation-fatal-observability-v002-complete-implementation-design-draft-20260807-v001.md`
- 承認済み設計SHA-256: `945b3337b90fde6969963a4dc051778b3aaf015be90e57193b97bd2d63dc7369`
- 状態: **実装前の現物調査で前提不成立を検出し、安全停止**
- production／test実装変更: 0件
- 検査実行: 0件
- API通信: 0回
- 費用: US$0

## 1. 結論

18 file実装には着手していない。

開始SHAは既存15 fileすべて設計値と一致し、新規3 fileは未存在だった。しかし、pathとSHAの一致だけでなく、実際の入口、所有分岐、検査ID、保存先、旧jobへの影響まで照合すると、承認済み設計に現物と食い違う前提が10点あった。

このうち7点は、実装者が独自判断すると、failure reportの正本owner、fatal／rejected境界、旧jobの受理、context前後の保存規則を変え得る。したがって、kawafmmの恒久ルール「設計は現物調査から始めること」に従い、実装を始めず停止した。

## 2. 現物照合済みの範囲

| 対象 | 結果 |
| --- | --- |
| F01〜F03 | 3/3未存在。新規予定と一致 |
| F04〜F18 | 15/15存在。SHA-256は設計§5の開始値と完全一致 |
| 5境界の正規入口 | timeline、旧B1、意味終端、意味package、出力runner／共通描画coreの全てで実在を確認 |
| 14 inner code | 13 codeは既存停止枝から所有可能。`REQUIRED_EXPORT_MISSING`は承認済み案Aの通常guardで所有可能 |
| 既存検査総数 | 直接影響130、green 287、baseline 181の算術と現物test fileを確認 |
| 正式成果物 | 5 rootのtree OIDとfile数を正しいstable tagから読み取り確認 |

主な現物根拠:

- timeline runnerと公開枝: `evals/clip_composition/presentation_timeline_composition_decision_v001.mjs:834`
- 旧B1の実readerと外側fatal catch: `evals/clip_composition/run_presentation_caption_semantic_output_check_v002.mjs:337`、同`:567`
- 意味終端の実体差検査とrunner: `evals/clip_composition/presentation_meaning_boundary_selection_v001.mjs:580`、同`:676`
- 意味package failure report正本: `evals/clip_composition/run_presentation_meaning_information_package_job_v001.mjs:202`
- 出力のimplementation role列とexact検査: `evals/clip_composition/presentation_output_contract_v001.mjs:106`、同`:645`
- 出力runnerの共通描画core import: `evals/clip_composition/run_presentation_output_job_v001.ts:84`
- 共通描画coreのexportと子process枝: `evals/clip_composition/render_presentation_v002.mjs:71`、同`:112`

## 3. 現物と設計の差

### 3.1 実装の所有・合否境界に関わる7点

| # | 現物の事実 | 設計との差 | 独自判断した場合の危険 |
| ---: | --- | --- | --- |
| 1 | F05の既存13検査にtimeline runner fatal期待はない。F05がtimelineからimportするのはvalidatorである | F05の許可変更は「既存13件内のtimeline fatal期待をv002へ更新」と書かれている | 存在しない期待を書き換えたことにする、または無関係な既存IDへ検査を混ぜる |
| 2 | 意味package failure reportのvalidator／builderはF11が現行正本で、F12もF11からimportする | F10の許可変更はfailure report v002のschema／validator／builderとも読める | F10へ移すかF11へ残すかで二重実装または無断移設になる |
| 3 | 意味package本体のcandidate package直列化失敗は`MEANING_PACKAGE_BYTE_INVALID`の検査済み拒否・終了1である | 「formal-serialization fatal」の対象範囲が限定されていない | 現行rejectedをfatalへ変えてstatus契約を破る |
| 4 | F16がF18から使う必須exportは4件。3件は関数だが、違反code集合は凍結配列である | guard条件が「必須exportが関数」とだけ書かれている | 配列を誤拒否するか、一部exportを検査しない |
| 5 | guardを置けるのはjobのlive実体SHA照合後、最初のF18利用前。この時点ではdurable reportに必要なacceptance／render plan bindingがまだない | guard失敗をcontext前／後のどちらへ置くか未固定 | 作れないdurable reportを作る、またはstreamを実装者が選ぶ |
| 6 | strict decoderは`number-invalid`を返すが、F16の現行wrapperが理由を捨てる | 数値表記不正、その他JSON不正、binding不一致の所有優先順が未固定 | 同じbyteを異なるinner codeへ写し得る |
| 7 | 出力正式jobのrole列は現行11件exact。末尾へF01を加えると、保存済み11-role jobを現行validatorで再受理できない | F13の禁止欄「既存job受理」とforward-onlyのF01 live binding追加が両立しない | 旧jobを黙って拒否するか、union／fallbackを作る |

### 3.2 検査・証拠の値レベル差3点

| # | 現物の事実 | 設計との差 |
| ---: | --- | --- |
| 8 | F17の33件は`ORP001〜008 / OEE001〜009 / OPF001〜016` | 「ORP001〜033」は実在しないID列 |
| 9 | FOVT001の正本tagは`stable/first-clip-complete-20260727`、FOVT002は`stable/second-clip-generality-20260728` | 設計表は両方を`stable/vertical-first-clip-20260802`としている。tree OIDとfile数は正しい |
| 10 | test実行には固定Node、固定TSX loader、`--test --test-concurrency=1`と対象path列が必要 | 設計§10は「各正本command」に留まり、argvが値レベルで未固定 |

## 4. 一括修正案

次の10点を一組で固定すれば、path上限18 file、新規81件、既存回帰件数を変えずに実装へ戻れる。

1. F05は13件の変更対象ではなく、13/13を保つ直接影響回帰とする。timeline fatal v002の動的検査は新規F03のFOVB001〜003が所有する。F05を無理に編集しない。18 path表には現物不変確認対象として残す。
2. 意味package failure report v002のschema、validator、builder、公開分類は、現行正本ownerであるF11へ維持する。F10は意味package jobのimplementation role末尾へF01を加える責務だけを持ち、failure report計算を複製しない。
3. `formal-serialization` fatalは、failure report／runner envelopeを正式byteへできない現在fatalの枝だけに限定する。candidate package直列化失敗は従来どおり`MEANING_PACKAGE_BYTE_INVALID`のrejected・終了1とする。
4. F16の通常guardは次のexact 4 exportを検査する。
   - `PRESENTATION_RENDERER_VIOLATION_CODES`: 凍結された密配列
   - `commitValidatedPresentationArtifactsV002`: 関数
   - `executeValidatedPresentationDrawAndQcV001`: 関数
   - `inspectFrameCountWithToolV001`: 関数
5. guardはF16のlive実体SHA照合後、F18を最初に使う前に一度実行する。欠落時はcontext前扱いとし、既存外側code`OUTPUT_RENDER_CORE_PROCESS_FAILED`、終了2、stderrの`presentation-output-runner-diagnostic-v002`へ、`runner-bootstrap / 束縛済みcommon-renderer / REQUIRED_EXPORT_MISSING`を記録する。durable failure reportは製造しない。
6. F16はstrict decoderが返した閉じたreasonだけを保持し、`number-invalid`を`NUMERIC_TOKEN_INVALID`、それ以外の復号不成立を`FORMAL_JSON_VALUE_INVALID`へ写す。復号成功後のfile／canonical SHA不一致を`BINDING_REFERENCE_MISMATCH`へ写す。この順を変えない。
7. F01 role追加はforward-onlyの新attempt jobだけに適用し、保存済み11-role jobの再受理は保証しない。保存済み成果物と当時のjob byteは不変保持する。union、converter、fallbackは作らない。「既存job受理を変えない」というF13禁止文は、新規成果物の合否・既存成果物byteを変えない、へ読み替える。
8. F17の既存33件は`ORP001〜008 / OEE001〜009 / OPF001〜016`と記録する。
9. 5 treeの正本を次で固定する。

| ID | 正本tag | tree OID | file数 |
| --- | --- | --- | ---: |
| FOVT001 | `stable/first-clip-complete-20260727` | `27affa2cff1e099d263f5a00ed9c4558be1300bd` | 25 |
| FOVT002 | `stable/second-clip-generality-20260728` | `454fcf002ac90b0d6ce72f63f55476ed9f8ffc72` | 21 |
| FOVT003 | `stable/vertical-first-clip-20260802` | `53076722863d2c36d470cc4ce9503739406ec03a` | 35 |
| FOVT004 | `stable/meaning-output-first-real-run-20260806` | `ce2f5807db5ff63b83e1200bcec9f40796210327` | 35 |
| FOVT005 | `stable/meaning-output-first-real-run-20260806` | `5e65c51ad30a65f43b087a71b50f6172162b2c49` | 42 |

10. 全test commandのprefixを次で固定する。

```text
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node
--import
/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs
--test
--test-concurrency=1
```

後続argvは、設計表の順で、新規81件はF02・F03、直接影響130件は§9.1の6 path、green 287件は§9.2の8 path、baseline 181件は§9.3の6 pathとする。green／baselineは各file単独と表順一括を分けて実行する。baselineの一括終了非0は失敗条件にせず、TAPの`tests 181 / pass 64 / fail 117 / cancelled 0 / skipped 0 / todo 0`完全一致を合否とする。

## 5. 停止の帰属

### 事実

- 10点はいずれもproduction／test実装を始める前の読み取り調査で検出した。
- 既存15 fileの開始SHAは15/15一致しており、作業途中の改変が原因ではない。
- production／test、正式成果物、stable tagへ変更していない。
- DECISIONSには、kawafmmが今回入力した実現性調査の恒久ルールと、完全実装設計＋案Aの承認を記録した。

### 実現性調査で事前検出できたか

**できた。** 今回、実装前に検出した。

前のdraftで検出しきれなかった理由は、開始SHA・pathの存在と一部の停止枝までは調べたが、各変更fileが本当にその検査・正本計算を所有するか、role追加が保存済みjob受理へ与える逆影響、stable tag名、正式argvまでを値レベルで全数照合しなかったためである。今後は恒久ルールどおり、この層まで本文起草前に閉じる。

### 推測

- なし。

### 未確認

- §4の一括修正案がkawafmmに承認されるか。
- 修正案承認後の新規81/81、直接影響130/130、green 287/287、baseline exact不変、5 tree不変。

## 6. 次の判断

人間判断は1件だけである。

> 本停止を受理し、§4の一括修正案10点を、SHA-256 `945b3337b90fde6969963a4dc051778b3aaf015be90e57193b97bd2d63dc7369`の完全実装設計v001に対する実現性調査追補として承認する。18 path上限、14 inner code、新規81件、既存回帰と5 treeの完了条件は維持する。承認後は18 path内の実装、新規81/81、直接影響130/130、green 287/287、baseline exact不変、5 tree最終照合、commit A、18 path SHA表付き完了報告まで再開してよい。新たな現物差、19 path目、実発火不能、status・既存違反code変更、生文字列保存、計算複製、固定値差、既存成果物差のいずれかで同attempt内に直さず停止する。

承認されるまでproduction／test実装、検査実行、commitへ進まない。
