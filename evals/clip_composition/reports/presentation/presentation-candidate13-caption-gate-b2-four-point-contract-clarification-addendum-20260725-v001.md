# candidate 13 基本テロップ ゲートB2 4点確定 契約追補 v001

- 作成日: 2026-07-25
- 状態: **kawafmm方向承認済み。独立監査でP0/P1なしの場合に限り、今回だけ追加の人間承認を待たず実装へ進める**
- 追補先:
  - `presentation-candidate13-caption-gate-b2-observation-record-replacement-contract-addendum-20260724-v001.md`
  - `presentation-candidate13-caption-gate-b2-five-failure-two-audit-integrated-repair-design-20260724-v001.md`
- 起草根拠:
  - `presentation-candidate13-caption-gate-b2-observation-replacement-implementation-preflight-stop-20260724-v001.md` §6
  - 2026-07-25のkawafmmによる、同§6の推奨4点の一括承認と夜間連続作業許可
- 人間作業: 承認済み方向から逸れなければ追加0件。媒体視聴、時刻入力、正解生成、時間計測なし

## 1. 目的

承認済み観測記録置換追補v001には、TAPの完全一致期待を変える4点が残っていた。
実装者判断で埋めずに停止したことを受け、本追補は停止報告§6の推奨方向をそのまま実装正本へ固定する。

本追補の目的は、検査を通りやすくすることではない。

1. test 123で「7実体は正しいが、一覧だけ1件欠ける」という一原因を実際の生成順に沿って作る。
2. 対象操作を、jobから一意に導出したabsolute rootの成果物子孫へ限定する。
3. 故障後もrunnerが実際に行った操作を捨てず、起きていない操作も作らない。
4. fault traceの配列／object解釈を一意にする。

## 2. 効力と上書き範囲

本追補v001は、停止報告§6の4点について既に人間承認された方向を版付きで固定する。
効力は、承認済み観測記録置換追補v001と、その追補先である統合修正設計v001の一組へ及ぶ。
4点は一括で効力を持ち、部分採用、実装者による代替選択、実測後のoracle変更を認めない。
追補先本文を黙って書き換えず、次だけを上書きする。

| 追補先 | 本追補による確定 |
|---|---|
| 観測記録置換追補§4.3、§5の7実体束縛、§9.1 | §3の「生成後・一覧欠落注入直前」の束縛へ置換。「実行前」はrunner起動前を意味しない |
| 観測記録置換追補§4.1〜4.2 | §4のworkspace起点absolute rootと、root自身を除く子孫pathの包含規則へ置換 |
| 観測記録置換追補§4.4、§9.2 | §5の「故障後を含む実発生操作全件」へ置換。「補完禁止」は架空操作の追加禁止へ限定 |
| 観測記録置換追補§3、§4.4、§9.2〜9.3、および統合修正設計§7.3 | §6のsnapshot厳密1件検査とentry object格納へ固定 |

次は変更しない。

- 取得不能な生の`artifactReads`を使わないこと
- test側でproduction内部の生列に似た列を再構成しないこと
- production runner、正式report、debug入口を変更しないこと
- package側の新しいexportを追加しないこと
- 変更可能範囲をpackage検査本体と合成検査の2ファイルに限定すること
- R2案A、file hash／canonical hash／bindingの意味
- 既存違反コード、固定順、担当検査
- 正式7ファイル、schema、生成順、二回生成の決定性検査
- package側132件を一度だけ頭から実行すること
- 一件でも不合格、skip、todo、cancelなら同attemptで修正せず停止すること
- 意味回答側、回帰、preflight、前提P、安定tagの後続条件
- 観測記録のouter key順`faultTrace / filesystemOperations / violations / publicationFailures`

## 3. test 123の固定7実体束縛

### 3.1 「実行前」の確定解釈

観測記録置換追補にあった「実行前」は、runner起動前または固定7ファイル生成前を意味しない。
次の順序へ一意に固定する。

1. production runnerが承認済みbuilderを二回呼ぶ。
2. 既存の決定性検査が二回のpackage生成一致を確認する。
3. runnerが第一生成結果の固定7 artifact byteを作業directoryへ排他的に書き、各fileのcloseと作業directoryのdurability処理を完了する。
4. 合成filesystemが、作業directoryに対する**最初の**`readdirWithTypes`を受ける。
5. directory entryを返す前に、test専用の読取り専用snapshotを一回だけ取得する。
6. snapshotの固定7実体を、第一生成結果の期待7 artifactへ完全一致で束縛する。
7. snapshotや実体を変更せず、directory entryだけを既存のUTF-16昇順の先頭1件欠落へする。
8. production runnerが、6件の一覧と7件の実体読取りを続ける。

この順序により、固定7実体をrunner起動前に置いて排他的書込みと衝突させない。
また、一覧欠落を返した後の結果を見て期待7成果物を再生成しない。

### 3.2 期待側の正本

期待側は、同じrunner呼出でproduction builderが返した第一package生成結果の固定7 artifactsだけを正本とする。

- `builder.calls.packageResults.length === 2`
- 第一結果と第二結果の一致は、既存のproduction決定性ゲートを正本とする。
- test専用束縛は第一結果を複製生成せず、既存builder spyが同じproduction builder呼出から保全した結果を読む。
- candidate 13固有値、期待hashの手書き値、別builder呼出を使わない。

fileNameとslot順は、productionのprivate定数をexportせず、合成検査内のtest-privateな凍結済みoracleとして次へ固定する。

1. `segmenter-boundary-evidence.json`
2. `embedded-gate-a-validation-report.json`
3. `semantic-source-input.json`
4. `deterministic-expansion-map.json`
5. `source-only-leakage-report.json`
6. `package-manifest.json`
7. `package-validation-report.json`

第一結果の`artifacts[index].fileName`はこのliteral順と一致しなければならない。
この7名称は合成検査file内へ順序付きのdeep-frozen literalとして置く。
第一結果、virtual entries、実際のopen列から期待fileName順を導出する、
実測後にsortする、productionのprivate定数を新exportする、のいずれも認めない。

artifactの製造・読取り順とdirectory listing順は別契約である。
製造・読取りは上記7 literal順、directory listingは既存どおりUTF-16昇順とする。
したがって一覧欠落fixtureが一覧から外す一件は`deterministic-expansion-map.json`であり、
最初に内容読取りするfileは`segmenter-boundary-evidence.json`のままである。

### 3.3 実体側snapshotの取得

実体側snapshotは、合成filesystem内の作業directoryに存在する固定7 file entryから、
最初のstaging directory listingを返す直前に一度だけ取得する。

test専用callbackは、production経路へ値を返さず、実体を変更せず、次だけをdeep copyして保全する。

1. fileName
2. byte列
3. byte列から計算したfile SHA-256
4. strict JSON復号値
5. 復号値から計算したcanonical SHA-256

callbackの呼出回数は厳密1回とし、0回または2回以上はfixture不成立である。
production runnerとpackage検査器はこのtest専用記録を読まない。
callbackは合成filesystemのprivate entryを直接読取り、
`openReadOnly / lstatBigInt / realpath`その他のfilesystem operationを追加発火させず、
production操作記録を汚さない。

### 3.4 完全一致条件

§3.2のtest-private固定7順の各slotについて、実体のkindがfileであることと、次を全て完全一致させる。

- fileName
- byte列
- file SHA-256
- strict JSON復号値
- canonical SHA-256

実体は厳密7件であり、不足、余分、directory等への型違い、並べ替えを認めない。
束縛不成立は合成fixture自身のtop-level不合格とし、production違反code 53等へ偽装しない。

この束縛と、production runnerが実際に行った固定7 `openReadOnly`、
子I/O・内容・hash・snapshot追加違反0件、公開失敗0件、code 53一件だけを共同で確認する。

一致しない場合はtest 123を合格させず、そのattemptで期待を変更しない。

## 4. 対象rootとpath包含規則

### 4.1 absolute rootの導出

対象rootは、実操作列やhost filesystemから推測しない。
test正本の`WORKSPACE_ROOT`とjob正本の相対pathから、一回だけ次で導出する。

```js
const publishedRoot = resolve(
  WORKSPACE_ROOT,
  runnerJob.value.publication.formalOutputPath
);
const stagingRoot = `${publishedRoot}.work`;
```

`WORKSPACE_ROOT`、jobの相対path、導出後rootを実行結果に合わせて変更しない。
basename一致、realpathによる別path救済、実操作側pathの再正規化を行わない。

### 4.2 「対象root配下」の確定

対象root配下は、次を満たす**子孫pathだけ**とする。

```js
candidatePath !== targetRoot
  && candidatePath.startsWith(`${targetRoot}/`)
```

理由:

- 本検査の対象は、固定7成果物の内容読取りとその子孫pathである。
- root自身の存在確認、directory listing、作成・rename等は別のproduction検査が担当する。
- root自身の操作を混ぜると、固定7成果物の読取り列とdirectory準備操作の責務が混ざる。

候補path側へ`resolve / normalize / realpath / basename`による救済を掛けない。
adapterが記録したabsolute stringを、そのまま上の式へ入れる。
親chain、兄弟、文字列prefixだけが同じ別rootは除外する。

### 4.3 投影対象

§4.2の子孫pathに対して、次の実操作だけを発生順のまま全件投影する。

1. `lstatBigInt`
2. `realpath`
3. `openReadOnly`

成功・失敗、期待内・期待外を問わず、一件も後から除外しない。
対象root自身、root外、上記3種以外の操作は本投影へ入れず、存在しなかったとも主張しない。
各entryのkey順は`operation / path`へ固定し、entryと列のdeep-frozen copyを集約記録へ渡す。
§3.2の固定7 direct child expected pathも、対象rootと固定literalを`/`で結んだabsolute pathとして完全一致させる。

## 5. 故障後の実操作と「補完禁止」

### 5.1 保存範囲

fault wrapperが一件の故障を注入した後も、production runnerが同じstageで残りの固定ファイルを確認した場合、
その後に実際に発生した対象操作を含め、runner呼出が停止または完了するまでの対象root子孫の実操作を全件保存する。

故障位置で記録列を打ち切らない。
別stageのrootに属する操作は、そのstageの投影へ混ぜない。
runner promiseがsettleした後、testによる追加診断I/Oの前に、
live operation列からdeep-frozen snapshotを一度だけ作る。
集約記録はlive列を後から参照しない。

### 5.2 「補完しない」の確定解釈

「故障後の操作を補完しない」は、次だけを意味する。

> 実際には起きなかった`lstatBigInt / realpath / openReadOnly`を、
> 固定7 slotや期待列に合わせるためtest側で合成・追加しない。

実際に故障後に起きた操作を捨てる意味ではない。

### 5.3 open故障

wrapperがbase adapterへ渡す前にopen故障を投げたpathは、
`filesystemOperations`の`openReadOnly`へ現れない。
この一pathを架空のoperationとして追加しない。

次の二つを別々に完全一致させる。

- `faultTrace`: 故障pathと`matched / open-thrown`
- `filesystemOperations`: base adapterへ実際に到達した、故障後を含む全対象操作

この組合せから固定7 slotへの試行を確認するが、「成功openが7件」とは主張しない。

### 5.4 read／post-read-stat／close故障

base adapterの`openReadOnly`へ到達したpathは実操作へ現れる。
handle内部のread、stat、closeは本追補の3操作投影へ新しいoperationとして作らない。
到達段階はfault traceの固定phaseとproduction違反／公開失敗要約で確認する。

## 6. fault traceの格納形

### 6.1 snapshotの自己検査

故障行では、test専用fault harnessの`snapshotTraceV001()`が返す値について、
集約記録を作る前に次を検査する。

1. dense arrayである
2. `length === 1`
3. entryが追補先で固定済みのfield、field順、値、phase順を持つ
4. entryとphase配列がdeep-frozenである

0件または2件以上はfixture不成立として、その行を失敗させる。
別のproduction違反による偽合格を認めない。

### 6.2 集約記録

自己検査に合格した場合だけ、集約objectへ次のように格納する。

```js
const faultTraceSnapshot = snapshotTraceV001();
assertSingleFrozenFaultTraceEntryV001(faultTraceSnapshot);

Object.freeze({
  faultTrace: faultTraceSnapshot[0],
  filesystemOperations: Object.freeze([...]),
  violations: Object.freeze([...]),
  publicationFailures: Object.freeze([...])
})
```

故障snapshot配列そのものは`faultTrace`へ入れない。
故障なしは厳密に`null`とし、`[]`、`undefined`、空objectを認めない。

同じsnapshot関数を二回呼んで別時点の列を混ぜない。
runner完了後、集約object作成の直前に一回だけ取得した配列を自己検査し、その一entryをdeep-frozen copyして格納する。

## 7. test 123・124の確定後期待

### 7.1 test 123

- 生成後・最初のstaging directory listing直前の固定7実体束縛: 7/7完全一致
- test専用snapshot callback: 1回
- directory entry: UTF-16昇順の先頭`deterministic-expansion-map.json`だけを欠いた6件
- staging root子孫の実操作: 発生順の全件
- 固定7 `openReadOnly`: 固定順で完全一致
- 子I/O・内容・hash・snapshot追加違反: 0件
- production違反: code 53の一件だけ
- publication failure: 0件
- input再確認以降: 未実行
- `faultTrace`: `null`

生の`artifactReads`件数・内部slot・statusはactualへ含めない。

### 7.2 test 124

9行それぞれについて、一つの集約記録へ次を固定順で保存する。

1. 厳密1件を自己検査したfault trace entry
2. 対象stage root子孫で、故障後を含め実際に発生した全対象操作
3. production package検査器の違反列
4. production reportの公開失敗要約

input再確認行は、staging root子孫で実際に発生した成果物操作と、
job固定のGate A入力pathに対するfault traceを同じ集約記録へ別由来のまま入れる。
Gate A入力pathをstaging root子孫操作へ混ぜない。

全9行のoracleは132件実行前にtest sourceへ固定し、
実行結果を見て操作を足す、消す、並べ替える、期待phaseを変えることを禁止する。

`filesystemOperations`のexpectedはactual列から作らず、各行の事前固定されたstage、fault kind、
§3.2の固定7 fileNameから次の規則で構成する。

test-private oracleのsignatureは次へ固定する。

```js
buildExpectedFilesystemOperationsV001({
  stage,
  faultKind,
  stagingRoot,
  publishedRoot,
})
```

- `stage`: `staging / published / input-recheck`の3値だけ
- `faultKind`: `open / read-throw / post-read-stat-error / close`の4値だけ
- 7 fileName: §3.2のtest-private frozen literalをclosureから読む
- 禁止入力: `filesystem.operations`、runner結果、fault harnessの実測列、virtual entries
- 戻り値: `operation / path` key順のentryを持つdeep-frozen array

1. 固定7 fileを§3.2の順に走査する。
2. 各fileについて`lstatBigInt / lstatBigInt / realpath`をこの順で置く。
3. open故障の対象fileだけは`openReadOnly`を置かない。その他のfile、およびread／post-read-stat／close故障の対象fileには`openReadOnly`を置く。
4. pathはstaging行なら`stagingRoot/fileName`、published行なら`publishedRoot/fileName`とする。
5. input再確認行は、staging rootの固定7について故障なしの同列を置く。Gate A入力への故障は`faultTrace`だけで表し、この列へ足さない。

9行とoracle引数は次へ固定する。

| 行 | `stage` | `faultKind` | artifact故障対象 |
|---|---|---|---|
| staging-open | staging | open | 固定7の先頭 |
| staging-read | staging | read-throw | 固定7の先頭 |
| staging-post-read-fstat | staging | post-read-stat-error | 固定7の先頭 |
| staging-close | staging | close | 固定7の先頭 |
| published-open | published | open | 固定7の先頭 |
| published-read | published | read-throw | 固定7の先頭 |
| published-post-read-fstat | published | post-read-stat-error | 固定7の先頭 |
| published-close | published | close | 固定7の先頭 |
| input-recheck-read | input-recheck | read-throw | なし。Gate A入力だけ |

`faultTrace`は各行の事前固定されたfault id、fault kind、固定path、固定phase列から構成する。
`violations`と`publicationFailures`は、production返値の全entry・全field・固定順をdeep copyし、
test sourceへ事前固定した完全expectedと比較する。code集合や`some()`だけの確認へ縮退しない。

## 8. 実装契約完全性チェック

| 項目 | 確定内容 |
|---|---|
| 成果物schema | 観測記録置換追補§3の4 key順を維持。fault traceだけ本追補§6でobjectへ確定 |
| 違反コード | 既存集合・順序・担当を変更しない |
| 終了コード | 既存CLI 0/1/2を変更しない |
| 環境固定 | 既存Node／workspace固定を変更しない。pathは§4で一意にabsolute化 |
| 入力範囲 | job正本、builder同一呼出の第一package結果、合成filesystemの固定7実体 |
| 工程間受渡し | production builder→固定7 write→最初のstaging listing直前snapshot→一覧欠落 |
| 検査可能性 | 許可済みtestファイル内のbuilder spy、virtual entries、operation log、fault harnessだけで取得 |
| 観測データ取得可能性 | 生成場所、取得時点、shape、consumerを§3〜§6で固定。production公開面追加なし |
| 観測データの副作用 | snapshotはdeep copyのみ。productionへ返さず、実体・一覧・結果を変更しない |
| 汎用性 | candidate 13固有値をschema・helperへ焼き込まない。固有件数・hashはpreflightへ分離 |

自己監査の結論:

- 停止報告§6の推奨方向から逸脱していない。
- 変更禁止runnerやproduction公開面を増やさず、許可2ファイルで取得できる。
- 実装者が新しい係数、許容差、fallback、期待値を選ぶ余地を残していない。
- 132件を実行してからoracleを直す経路を残していない。

## 9. 変更可能範囲と禁止事項

変更可能範囲は次の2ファイルだけ。

1. `evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs`
2. `evals/clip_composition/test_presentation_caption_semantic_source_package_v001.mjs`

禁止:

- production runner、正式report、debug入口、CLI引数、環境変数、stdinの変更
- 生の`artifactReads`または似たraw列のtest側再構成
- production builderの追加呼出
- test専用snapshotのproduction入力化
- 既存違反コード、schema、hash意味、正式7ファイル、生成順の変更
- candidate 13固有値の汎用helperへの埋込み
- package 132件の部分実行、失敗後の同attempt修正・再実行
- 正式package生成、Gemini実走、指示書、描画

## 10. 既知限界と開始時点

本追補で証明範囲を広げない。

- workspaceの監視root外の読取りは証明対象外
- `lstatBigInt / realpath / openReadOnly`以外のoperationは本投影の対象外
- adapterを迂回するI/Oは本観測では証明しない
- production内部のraw slot列と同値であるとは主張しない

実装開始前の基準:

- package本体 SHA-256: `c1a757141303b5328bc6d64473586f047625b5d1666dea5a8170f1939b7ae479`
- package合成検査 SHA-256: `a598180612de5b7b80b14086965078b9217d814be6108449f52242327fc5b346`
- package runner SHA-256: `1a1537f279cf8b69a90b4236e69a048e7bec2d1118f1819e5bad807373c8cbff`
- Gate A runner SHA-256: `3f35066d43746de3b7527b0e1dc3317faeea828f8beab8bb4dde8ae072a50352`
- 本追補後のpackage検査実行: 0回
- `stable/b2-complete`: 未発行
- 既存撤退点`stable/gate-a-complete-20260723`: 維持

人間作業は、本追補方向の承認1判断のみ。追加媒体、追加視聴、位置入力、正解生成は0件である。

## 11. 実装・検査順と停止条件

独立監査でP0/P1が無い場合だけ、今回の人間承認により次へ進める。

1. 許可2ファイルだけを修正する。
2. 静的に、変更禁止runnerと基準byteの不変、変更範囲、oracle固定を確認する。
3. package側132件を先頭から一度だけ実行する。
4. 一件でも不合格、skip、todo、cancelがあれば、同attemptで修正せず停止する。
5. 132/132の場合だけ、意味回答側、Gate A回帰、残存source atom回帰、candidate 13読み取り専用preflight、前提P再照合へ進む。
6. 安定点3条件を満たした場合だけ、JOURNALと同一commitでB2 stable tagを発行する。
7. B2完了報告と、正式package生成・Gemini実走の次ゲート承認依頼を起草して停止する。

次の一つでも起きた場合は、期待値の変更・修正・再実行へ進まず停止する。

- 本追補§3〜§6を許可2ファイルだけで実装できない。
- 独立監査でP0またはP1が残る。
- snapshot取得がproductionの生成物、操作順、公開結果へ影響する。
- 9行の完全oracleを実行前に一意に固定できない。
- 新しい設計判断、契約解釈、矛盾、実測前提不一致が必要になる。
- production runner、正式report、debug入口の変更が必要になる。
- package側132件または後続検査の事前固定条件を満たさない。

## 12. 承認記録

2026-07-25、kawafmmは停止報告§6の4点を推奨方向のまま一つの版付き追補として確定することを承認した。
今回に限り、本追補が同方向から逸れず、独立監査でP0/P1なしなら、
本追補に対する追加の人間承認を待たず実装・検査へ進める。

推奨方向から逸れる必要、P0/P1、新しい未固定を検出した場合はこの例外を使わず停止する。
