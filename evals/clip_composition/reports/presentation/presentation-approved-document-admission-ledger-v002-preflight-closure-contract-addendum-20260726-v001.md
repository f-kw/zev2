# approved-document-admission-ledger-v002 実装前preflight閉包契約追補 v001

- 日付: 2026-07-26
- 状態: **設計提示・人間承認待ち・実装停止**
- 基準commit:
  `2b96ed3325245b0c9d3cd9ec445036a8145699f4`
- 対象の承認済み設計:
  `evals/clip_composition/reports/presentation/presentation-approved-document-admission-ledger-v002-implementation-contract-addendum-20260726-v001.md`
- 起点となる停止報告:
  `evals/clip_composition/reports/presentation/presentation-approved-document-admission-ledger-v002-implementation-preflight-stop-report-20260726-v001.md`
- 撤退条件上の位置:
  同じ実装前監査パスで検出した停止イベント**1件目 / 2件**を閉じる追補。本文の起草・監査は新しい停止イベントへ数えない
- 今回の実装、schema作成、台帳作成、検査実行、B5設計、API通信、Gemini実走: **0件**
- 人間作業:
  本追補を承認するか差し戻すかの判断1件。動画視聴、時刻入力、時間計測なし

## 改訂履歴

- v001（2026-07-26）:
  実装前preflightで同時に見つかった、JavaScript import検査の実装契約未固定と、非登録commitで承認済み文書を改変して復元できる履歴上の穴を、一つの追補で値レベルまで閉じた。

## 1. 結論

kawafmmの裁定を次のとおり正本化する。

1. import範囲検査は、既存scanner由来の**v002内単一scanner**を正本とする。
   scannerをtoolGraphの6件目へ増やさず、固定5実体の
   `bootstrap-runner`内に一つだけ置く。
2. 承認済み文書pathのidentityはfirst-parent履歴で連続追跡し、当該pathを対象にした正規のrevision登録commit以外での変更、削除、type change、復元を違反とする。
3. 新しい履歴違反を既存70件の末尾へ71件目として追加する。
   既存codeは改名も採番変更もしない。
4. 統合検査をI025まで増やし、正式な新規検査総数を
   **違反71件＋fatal 7件＋統合25件＝103件**に固定する。
5. toolGraph 5件、bootstrap commit path 10件、bootstrap文書12件、pair 3件、legacy 6件は変えない。
6. 本追補は実装許可ではない。人間承認後にだけ、元の承認済み実装範囲を再開できる。

本来の目的は、形式だけの検査を増やすことではない。

- 検査対象moduleが未知のimport先を評価する前に止める。
- 現在byteが元へ戻っていても、承認済み文書が途中commitで無断変更された事実を残す。

この二つを、既存の5実体、履歴snapshot、違反報告の枠内で実際に検査可能にすることが目的である。

## 2. 元契約との関係

### 2.1 本追補が上書き・明確化する箇所

本追補が人間承認された場合、次の記述だけを上書きまたは明確化する。
元文書を黙って編集せず、元記録は当時の設計として保持する。

| 元文書の箇所 | 本追補での扱い |
|---|---|
| §3.1、§3.2 | import検査の評価前保証と承認済み文書identityの履歴連続性を追加し、bootstrap launcherと本追補自身の非証明範囲を明確化 |
| §4.4 | 文書identityを変えてよいcommitを、当該pathの正規revision登録commit一つだけへ限定 |
| §5 | scanner所有者、評価前入口、code 68専用pre-child報告の責務を追加 |
| §6.3.1 | toolGraph 5件不変、scannerを6件目にしないことを明確化 |
| §6.13 | `treePathRecords`で非blob typeを表す規則、履歴違反が既存収集値だけを読むこと、bootstrap precommitのv1評価前束縛を運ぶ`runtimeImportContext`／`runtimeImportEvidence`を追加 |
| §7.5 | bootstrap precommitで固定v1 checkerを評価する直前の束縛・typed carrier・code 68／39の組合せを追加 |
| §8.1(6)、§8.4、§8.5 | v1 checkerを含むscanner対象、評価前の順序、role別import契約、code 68の所有を確定 |
| §10 | 初回scannerと本追補の自己適用限界を追加 |
| §11.2〜§11.4 | code 68専用pre-child報告、exit 1、通常reportとの境界を追加 |
| §12 | 新違反code 71を末尾追加 |
| §13 | V071、I025、I003・I018〜I020・I024の明確化、103件への件数改訂 |
| §13.3 | 71 code、25統合検査を完了条件へ反映 |
| §16、§16.1 | import解釈、評価前入口、履歴連続性、収集carrier、件数の値レベル閉包を反映 |
| §17、§18 | 実装再開には本追補の明示承認が必要であることを追加 |

起点停止報告§3.3と§4.3の「推奨する確定方向」は、kawafmmの裁定を反映した本追補が上書きする。

### 2.2 変えないもの

- v002の正式pathとtoolGraph 5件。
- bootstrap commit path 10件。
- bootstrap文書12件、pair 3件、legacy 6件。
- 既存1〜70の違反code名と順序。
- fatal 7件とexit 0／1／2の大分類。
- `firstParentDiffs`と`treePathRecords`を含む既存snapshotの収集I/O境界。
- v001 6/6を新規検査数へ含めない規則。
- 後方互換、fallback、暗黙変換を作らない規則。
- 同attemptで期待値を動かさず、不成立なら停止する規則。
- B5設計・B5実装・token計測・API通信・Gemini実走の停止。

### 2.3 本追補自身の台帳上の位置

本追補は、既に閉じたbootstrap文書12件へ遡及追加しない。
toolGraph件数だけでなくbootstrap文書・pair件数の波及改訂も行わない。

本追補の起草裁定と将来の承認は、依頼書なしの直接指示として
`DECISIONS.md`を正本にする。
したがって初回v002台帳は本追補自身のbyteを暗号学的にも再帰的にも証明しない。
これはbootstrap 12件を維持するための自己適用限界であり、本追補が未承認でも変更可能という意味ではない。
実装者は本追補の承認時commitを作業正本として参照するが、v002の台帳検査へ未定義の7件目legacy、4対目、別bindingとして混ぜない。
本追補のbyteを機械照合済みと主張せず、保証は`DECISIONS.md`の直接裁定とGit commit参照までである。

将来、この追補自体を台帳へ登録する必要が生じた場合は、bootstrap件数を黙って変えず、通常admissionまたは台帳対象範囲の別設計として人間へ戻す。

## 3. 追加する保証と保証境界

### 3.1 追加して保証すること

1. 作業ツリー上のbootstrap launcherが固定Nodeで正常に起動し、§7の前処理へ到達できた場合、七つの正式検査phaseでは、固定5実体をprocess固有一時directoryへmaterializeした後、**その5実体を一つもmodule評価する前に**、同じ単一scannerで全byteの明示的import構文と列挙済み迂回入口を検査する。
2. bootstrap precommitで実行する固定v1 checkerも、dynamic import前に同じscannerで検査する。
3. scannerで不成立が見つかった実体は評価せず、code 68のexit 1として報告する。
4. 承認済み文書として有効になったpathは、保護開始commitから現在anchorまでの全first-parent隣接commitでidentityを追跡する。
5. identity変化を許すのは、当該pathを`revisedDocument.path`に持つ正規のrevision登録commitだけである。
6. 現在の文書byteが承認済みidentityへ戻っていても、途中commitの不正変更・削除・type change・復元を違反として残す。

### 3.2 追加しても保証しないこと

- operatorが最初に起動する作業ツリー上の
  `run_approved_document_admission_ledger_v002_bootstrap.mjs`
  自身が、契約どおりscannerを実行したことの暗号学的証明。
  このlauncherは既存どおり運用上の信頼根である。
- 作業ツリー上のlauncher自身が構文不正等でNodeから起動できない場合に、そのlauncher自身がcode 68を自己報告すること。
  外側launcherの起動成立はformal reportより外側のbootstrap信頼境界であり、起動不能はNode processの失敗として扱う。code 68を偽造して「検査済み」とは報告しない。
- launcher自身のNode組み込みimportが評価される前の自己検査。
  launcherは相対・package importを持たない設計に固定するが、自分自身を評価前に自己証明するとは主張しない。
- mutation runnerを直接起動したprocessの安全性。
  mutation出力は正式検査前の未信頼入力であり、commitへ受け入れる前に七phaseのscannerと本体検査を通す。
- scanner観測後からchild module評価まで、外部processが一時directoryを変更して元へ戻さなかったことのkernel監視による連続証明。
  一時directoryの排他作成、通常file・symlink 0件、scan時hash、child側tool identityの再照合で観測可能な差は拒否するが、既存のbootstrap信頼根を暗号学的閉包と偽らない。
- 一つのcommitのtreeへ現れない、commit作成前の一時的な作業ツリー変更。
  新しい履歴規則が保証するのはGit first-parentのcommitted tree状態である。
- `refs/heads/main`の履歴自体が暗号学的に改竄不能であること。

## 4. v002内単一scannerの由来と所有

### 4.1 由来正本

字句状態機械の由来を次へ固定する。

| 項目 | 固定値 |
|---|---|
| commit | `2173b5550da76fcb7b47bfb333b597e302e47b02` |
| path | `evals/clip_composition/presentation_caption_semantic_output_v001.mjs` |
| Git blob | `9df6862a0214e6e0c8b0961f48c944a096ae5b05` |
| file byte数 | `140111` |
| file SHA-256 | `1e37b697f4c7b288f667f6c2e44ab8517921c34be4cc3f8a02db5de6cdc939de` |
| block開始marker | `// EXECUTABLE_JAVASCRIPT_SCANNER_GRAMMAR_V001_BEGIN` |
| block終了marker | `// EXECUTABLE_JAVASCRIPT_SCANNER_GRAMMAR_V001_END` |
| markerを含み直後LFを含まないblock byte数 | `15620` |
| 同block SHA-256 | `c6bd6253cb1ba6e114c962728fc648effab23a697046e7b0ae5a8b09c4e98ea0` |
| 由来関数 | `executableJavaScriptTokens`、`executableJavaScriptTokensFromBytesV001` |
| 由来block外の依存 | `compareUtf16`とNodeの`Buffer`だけ |

同じgrammar blockがsource-package側にもbyte一致で存在することは由来確認に使えるが、由来commitを後続版へ読み替えない。

### 4.2 継承するもの・継承しないもの

継承するのは次の字句状態機械である。

- code、line comment、block comment、単一引用符、二重引用符、template raw、template式、正規表現の区別。
- templateの`${...}`内を実行codeとして再走査する状態遷移。
- 括弧・波括弧・角括弧、演算子、正規表現開始位置の判定。
- hashbangを通常codeから除外してから走査する順序。

次は継承しない。

- `IMPORT_SPECIFIER_PATTERN`。
- `importSpecifiers`。
- raw sourceへ正規表現を当ててimportを抽出する経路。
- literal内容を`<literal>`へ潰したtokenだけからspecifierを推測する経路。

v002 scannerが正式に外へ返すのは、sourceごとの合否とraw byteのSHA-256だけである。
token列、位置、error indexは成果物・report・検査契約へ公開しない。
人間が使わない内部表現を固定して検査不能な契約を増やさず、§5の受理／拒否結果をproduction scannerそのもので検査する。

読取専用pure入口を次へ固定する。

```text
scanApprovedDocumentAdmissionJavaScriptV002({
  role,
  sourceBytes
})
```

- `role`は§6の6 roleの一つ。
- `sourceBytes`のdomainは`Uint8Array`一つで、`Buffer`を含む。
  `DataView`、他のtyped array、通常array、stringはdomain外であり、§4.3のinspectionがscanner呼出前に工程間入力不成立のfatalとして拒否する。
- 入口は呼出直後に`Buffer.from(sourceBytes)`をexact一回呼び、新しい所有Bufferへ全byteを同順・同長でcopyする。
  raw byte SHA-256、strict UTF-8 decode、由来関数
  `executableJavaScriptTokensFromBytesV001`は全てこの同じ所有Bufferだけを読む。
  任意offsetのUint8Array viewもview範囲だけをcopyし、背後buffer全体へ広げない。
  copy後の呼出元mutationは合否・hashへ影響しない。
- returnのfield順は`status`、`fileSha256`。
- `status`は`"passed"`または`"failed"`。
- `fileSha256`は入力raw byteの小文字64桁SHA-256。
- domain内の入力ではthrowせず、部分token、自由文detailを返さない。

sourceはstrict UTF-8としてdecodeし、再encodeしたbyteが入力と完全一致しない場合は`"failed"`。
specifierは元sourceの引用符内raw ASCIIだけを使う。
Unicode正規化、escape展開、path正規化を行わない。

内部走査では、base codeと各template `${...}`を別々の`code context`として扱う。
contextは入れ子開始順の内部連番で区別し、構文照合は**同じcontext、同じ丸括弧・角括弧・波括弧depth内の連続実行tokenだけ**で行う。
`${`前後をまたいでtoken列を連結しない。
top-levelはbase code contextかつ三depthが全て0の場合だけである。
このcontext情報も外へ返さず、I019のtemplate境界fixtureで挙動を検査する。

### 4.3 scannerの単一所有者

scanner実装を持てる正式pathは次の一つだけである。

`evals/clip_composition/run_approved_document_admission_ledger_v002_bootstrap.mjs`

- core、checker、admission runner、testへscannerを複製しない。
- bootstrap runnerは上のpure scannerに加え、同じscanner結果から§8 byteを作る
  `buildApprovedDocumentAdmissionPrechildImportReportV001({phase, admissionId, scanResults})`
  と、bootstrap mutationのdynamic import直前に同じ実体を再照合する
  `verifyMaterializedCoreIdentityBeforeImportV001({materializedCorePath, expectedFileSha256})`
  に加え、launcherが全対象を同じscannerへ通すpure orchestration
  `inspectApprovedDocumentAdmissionMaterializedSourcesV001({phase, admissionId, sources})`
  をnamed exportする。named exportはこの四つだけである。
- `sources[]`のfield順は
  `role`、`path`、`identitySource`、`sourceCommit`、`sourceBytes`。
  最初の5件はtoolGraph順、bootstrap precommitだけ6件目をv1 checkerとする。
  `sourceBytes`以外は§8.1の値域、`sourceBytes`はlauncherがmaterialize実体から一回読んだ`Uint8Array`。
- `sources`がarrayでない、件数・順・field集合・role・metadata値域が違う、または`sourceBytes instanceof Uint8Array`でない場合、正式launcherはinspectionを呼ばず
  `TOOL_GRAPH_EXECUTION_FAILED`、解釈済みphase、`path=null`、exit 2のfatalを出す。
  部分`scanResults`やcode 68 reportを作らない。
  pure inspectionのdomainはこのshape検査を通過したsourcesだけである。
- orchestrationは各sourceを表順にpure scannerへexact一回渡し、
  sourceの先頭四fieldとscanner返値を
  `role`、`path`、`identitySource`、`sourceCommit`、`fileSha256`、`status`
  の順へ写したexact objectを`scanResults[]`の一件とする。
  metadataをscannerへ再推測させず、scanner返値へ列挙外fieldを足さない。
  report builderへ渡す`scanResults`もこの同一array instanceであり、別写像・再sort・再hashを行わない。
- inspection returnは、全件合格ならfield順
  `{status:"passed", scanResults}`、一件以上不合格なら
  `{status:"failed", scanResults, reportBytes}`。
  `reportBytes`は§8 valueをreport builderで一回作りcanonical serializeした`Uint8Array`。
  inspectionは全sourceを最後まで走査し、Git／filesystem／network／clock／environment／process起動を行わない。
- 正式launcherはinspectionをexact一回呼び、`status="passed"`のときだけmaterialized checker childへ進む。
  failed時は`reportBytes`を一回送出し、child起動分岐へ入らない。
- testはmaterialized bootstrap runnerからこの四つをnamed static importし、production scanner、production report builder、production再照合処理、production inspectionを直接使う。
  同等scanner・同等report builder・同等再照合処理をtest側へ作らない。
- bootstrap runnerのCLI本体は、file末尾のexact guard
  `process.argv[1] !== undefined && process.argv[1] === import.meta.filename`
  がtrueの場合だけ一回呼ぶ。
  このguardは文字列完全一致だけを行い、`resolve`、`realpath`、`stat`、`open`等のpath変換・filesystem I/Oを行わない。
  operatorはsymlinkでない正式bootstrap runnerのabsolute pathをargv[1]へ渡す。
  named import時はCLI、mutation、Git／filesystem I/Oを開始しない。
- scannerを第6 toolGraph実体にしない。
- scanner blockの由来情報とv002拡張部分は同じbootstrap runner内に置く。
- static import graphの解釈とcode 68 reportの生成はこのscanner結果だけを使う。

## 5. scannerの受理構文

### 5.1 source byteとhashbang

- UTF-8、BOMなし。
- 改行はLFだけとし、CRLF、裸CR、U+2028、U+2029を拒否する。
- hashbangを持つ場合はfile先頭の
  `#!/usr/bin/env node\n`
  だけを許す。
- hashbangを許すroleは`checker`、`bootstrap-runner`、`admission-runner`だけとする。
- `core`、`test`、`v1-checker`はhashbangを持たない。
- hashbangより前の空白、BOM、別payload、末尾LFなし、2行目以降の`#!`を拒否する。
- 許可hashbang行の内容はimportとして解釈しない。

### 5.2 静的`import`

静的importはtop-levelの次の二形だけを許す。
token間の空白とcommentは許すが、comment内の文字をtokenへ戻さない。

```text
import "<specifier>";
import { <name> [as <local>] (, <name> [as <local>])* [,] } from "<specifier>";
```

規則を次へ固定する。

- 引用符は単一引用符または二重引用符のどちらか一つ。
- specifierはASCII文字だけで、escape、改行、template literal、連結、変数を禁止する。
- `<name>`と`<local>`はASCII
  `[A-Za-z_$][A-Za-z0-9_$]*`かつ次の予約語set外:
  `as`, `async`, `await`, `break`, `case`, `catch`, `class`, `const`,
  `continue`, `debugger`, `default`, `delete`, `do`, `else`, `export`,
  `extends`, `false`, `finally`, `for`, `from`, `function`, `get`, `if`,
  `import`, `in`, `instanceof`, `let`, `new`, `null`, `of`, `return`,
  `set`, `static`, `super`, `switch`, `this`, `throw`, `true`, `try`,
  `typeof`, `var`, `void`, `while`, `with`, `yield`。
- default import、namespace import、string-named import、import attributes、import assertionsを拒否する。
- semicolonを必須とする。
- 同じrole内で同じspecifierを二回以上importすることを拒否する。
- 許可specifier集合にある値が実際に未使用であることは違反にしない。
  許可集合は上限であり、未使用importを作らせる必須集合ではない。

### 5.3 `export ... from`

実行code内の`export`はbase code context・三depth 0だけを許し、次のshapeへ限定する。

1. `export const`、`export let`、`export var`、`export function`、
   `export class`、`export async function`で始まるnamed declaration。
2. `export { <name> [as <name>] (, <name> [as <name>])* [,] } ;`
   のlocal export list。

local export listの`}`直後はsemicolonだけを許すため、`from`は入らない。
named declarationはprefixを上の六形で確定した後、その宣言本文に現れるproperty名`from`等をre-export判定へ戻さない。

次は全roleで拒否する。

- `export default`。
- `export { ... } from "...";`
- `export * from "...";`
- `export * as ... from "...";`
- nested code contextまたはdepth非0の`export`。
- 上の二shape以外の`export`。

再exportが必要になった場合は、scannerの見逃しとして実装を迂回せず、契約改訂へ戻す。

`bootstrap-runner`だけは、上の一般形に加えてexport binding集合を次へ限定する。

```text
export {
  scanApprovedDocumentAdmissionJavaScriptV002,
  buildApprovedDocumentAdmissionPrechildImportReportV001,
  verifyMaterializedCoreIdentityBeforeImportV001,
  inspectApprovedDocumentAdmissionMaterializedSourcesV001
};
```

- 上の四bindingは各一回、表順、aliasなしの単一local export listで公開する。
- `export`付きdeclaration、二個目のlocal export list、四bindingの欠落・重複・別順、列挙外bindingを拒否する。
- 他roleのexport binding集合は各roleの既存source設計に委ねるが、§5.3の構文制限は同じく受ける。
- scannerはbootstrap roleの走査終了時に上のexact集合と順序を照合する。
  testが四bindingをimportできることだけで「余分な五件目がない」と推測しない。

### 5.4 動的`import()`

動的importは原則として全roleで拒否する。
例外は、同じcode context・同じbrace depthにある次のexact statement列だけである。
空白とcommentはtoken間に許すが、statement順とidentifierは変えない。

`bootstrap-runner`:

```text
const loadVerifiedMaterializedCoreForBootstrapV001 =
  async ({materializedRoot, scanResults}) => {
const materializedCorePath =
  materializedRoot + "/approved_document_admission_ledger_v002.mjs";
const scannedCoreFileSha256 =
  scanResults[0].fileSha256;
const materializedCoreIdentityStatus =
  verifyMaterializedCoreIdentityBeforeImportV001(
    {
      materializedCorePath,
      expectedFileSha256: scannedCoreFileSha256
    }
  );
if (materializedCoreIdentityStatus.status !== "passed") {
  return materializedCoreIdentityStatus;
}
const verifiedMaterializedCoreUrl =
  pathToFileURL(materializedCorePath).href;
const verifiedMaterializedCoreModule =
  await import(verifiedMaterializedCoreUrl);
return {status: "passed", module: verifiedMaterializedCoreModule};
};
```

`core`:

```text
const loadVerifiedMaterializedV1CheckerV001 =
  async ({runtimeImportContext}) => {
const runRoot =
  dirname(dirname(runtimeImportContext.materializedRoot));
const materializedV1CheckerPath =
  runRoot + "/v1/evals/clip_composition/check_approved_document_bindings_v001.mjs";
const runtimeImportEvidence =
  verifyMaterializedV1CheckerIdentityBeforeImportV001(materializedV1CheckerPath);
if (runtimeImportEvidence.status !== "passed") {
  return {status: "failed", runtimeImportEvidence};
}
const verifiedMaterializedV1CheckerUrl =
  pathToFileURL(materializedV1CheckerPath).href;
const verifiedMaterializedV1CheckerModule =
  await import(verifiedMaterializedV1CheckerUrl);
const evaluatedRuntimeImportEvidence = {
  ...runtimeImportEvidence,
  moduleEvaluated: true
};
return {
  status: "passed",
  module: verifiedMaterializedV1CheckerModule,
  runtimeImportEvidence: evaluatedRuntimeImportEvidence
};
};
```

- identity status直後の`if`も上のexact token列の一部であり、否定条件、return値、braceを変えない。
  `"failed"`は§7・§7.5の所有先へ戻り、import文へfall throughしない。
- 上のreserved identifier
  （二つのload helper、二つのpath、bootstrap側identity status、core側`runtimeImportEvidence`と`evaluatedRuntimeImportEvidence`、二つのURL、二つのmodule、`runRoot`、`scannedCoreFileSha256`、二つのverify関数、`pathToFileURL`、`dirname`、`runtimeImportContext`）
  は、上のstatement列、§4.3のstatic import、二つのverify関数のtop-level `const` arrow定義、§7.5のcollector引数decode以外のbinding位置へ現れてはならない。
- reserved identifierについて、`const`以外の宣言、parameter、destructuring key／binding、assignment左辺、更新式、class／function名、catch binding、別scopeの同名tokenを全て拒否する。
- `pathToFileURL`は`node:url`から、`dirname`は`node:path`から同名のnamed static importで一回だけ受け、aliasを許さない。
- 二つのload helperと二つのverify関数は各所有fileにtop-level `const <exact-name> = (...) => { ... };`で一件だけ置く。
  load helperのparameter、failure return、success returnは上のexact列から変えない。
  bootstrap mutation側verifyのreturnは
  `{status:"passed", fileSha256}`または`{status:"failed", fileSha256}`
  の二shapeへ固定する。
  `fileSha256`は読めた現在raw byteの64桁値で、読取不能は§7.4のfatalへ返すためこの関数の`"failed"`には入れない。
  引数は§4.3のexact objectだけで、`expectedFileSha256`へ
  `scannedCoreFileSha256`を写す。positional二引数や別field名を許さない。
  v1 checker側verifyは§7.5の`runtimeImportEvidence` exact objectを
  `moduleEvaluated=false`で返し、§6.11の固定identityとの一致を判定する。
  import完了後に上のexact spread一回だけで`true`へした新objectを作り、元objectをmutationしない。
- 各例外siteは該当roleにexact一件。
  argumentの別identifier、literal、式、関数返値、二つ目のsiteを拒否する。
- `object.import()`、`object?.import()`等、実行token列でmember名`import`をcallする形も保守的に拒否する。
- bootstrap runnerはdynamic import直前に、`materializedCorePath`のrealpath、通常file、symlink 0件、byte数、SHA-256が、そのprocessでscannerへ渡したcore実体と完全一致することを再確認する。
  bootstrap mutationで不一致なら§8のcode 68専用pre-child reportとし、不一致URLをimportしない。
- coreは§7.5の`runtimeImportContext.materializedRoot`だけからv1 pathを導出し、dynamic import直前に通常file、symlink 0件、§6.11の固定6 identityへ再照合する。
  outer launcherがscannerへ渡したbyteとのprocess間連続一致はcarrierを新設して証明せず、§3.2のbootstrap信頼根・連続不変非証明へ残す。
  現在実体が固定identityと違う場合は§7.5のtyped carrierを通じて通常reportのcode 68とし、v1 checkerを評価しない。
- scannerはI019でexact statement列、reserved binding位置、支配分岐、別URL、別siteを検査する。

### 5.5 `require`

`require(...)`は全roleで拒否する。

- top-level、関数内、template式内を同じ扱いにする。
- shadowされたbindingであっても許さない。
- `object.require()`、`object?.require()`も保守的に拒否する。
- comment、通常文字列、template raw、正規表現内の見かけ上の`require`は実行tokenでないため無視する。

### 5.6 `import.meta`

`import.meta`はimport edgeではないが、roleとmemberを次へ限定する。

| role | 許可member |
|---|---|
| `core` | なし |
| `checker` | `filename` |
| `bootstrap-runner` | `filename` |
| `admission-runner` | なし |
| `test` | なし |
| `v1-checker` | `url` |

- exactな`import . meta . <member>`だけを許す。
- computed access、未列挙member、optional chain、call、member後の追加chainを拒否する。
- `bootstrap-runner`の`import.meta.filename`は§4.3のexact CLI main guard一箇所だけに許し、別用途・二箇所目を拒否する。
- `v1-checker`の`import.meta.url`は固定済み既存byteを受理するための明示規則であり、v002の別roleへ一般化しない。

### 5.7 comment・文字列・template・正規表現

- scanner内部contextを`base-code`、`template-raw`、`template-expression`へ固定する。
- line comment、block comment、単一・二重引用文字列、template raw、正規表現内の`import`、`export`、`require`、`import.meta`はedgeにも違反にも数えない。
- template rawは開始backtickから、escapeされていない`${`または終了backtickまで。
  `\${`はrawのままで式を開かない。
- escapeされていない`${`の直後から対応する`}`までをtemplate expressionとして通常codeと同じく字句化し、
  `require`、`import.meta`、§5.8の禁止tokenを検査する。
  ただし静的import、export、§5.4の許可dynamic import siteはtemplate expression内では常に拒否する。
- template expression内のcomment、文字列、正規表現、nested template rawも同じmode規則で除外し、
  nested templateの`${...}`だけを再帰的に検査する。
- tagged templateのtag側はbase codeとして通常検査する。
- base codeと各template expressionは§4.2の別code contextであり、前後のtokenを連結して受理構文を作らない。
- 閉じていないcomment、文字列、template、正規表現、delimiterは字句不正とする。
- 除外対象を生の正規表現置換で消す実装を禁止する。
  由来状態機械のmode遷移だけで区別する。

### 5.8 文字列code実行・反射的module取得の禁止

static／dynamic import graphを文字列code実行で迂回しないため、用語を次へ固定する。

- bare identifier:
  identifier／keyword tokenで、直前tokenが`.`、`?.`、computed memberの`[`でないもの。
- direct member:
  `.`または`?.`直後のidentifier token。
- computed exact member:
  `[`と`]`の間が単一・二重引用文字列または式なしtemplate一つで、
  quoteを除いたraw ASCIIにescapeがないもの。

全roleで、次の名前がbare identifier、direct member、computed exact memberのいずれかに現れたら拒否し、code 68が所有する。

`eval`、`Function`、`AsyncFunction`、`GeneratorFunction`、
`AsyncGeneratorFunction`、`getBuiltinModule`、`binding`、
`_linkedBinding`、`dlopen`、`mainModule`、`createRequire`、`_load`、
`compileFunction`、`runInThisContext`、`runInNewContext`、
`runInContext`、`SourceTextModule`、`SyntheticModule`、`constructor`、
`__proto__`、`prototype`、`getOwnPropertyDescriptor`、
`getOwnPropertyDescriptors`、`getOwnPropertyNames`、
`getOwnPropertySymbols`、`getPrototypeOf`、`setPrototypeOf`、
`defineProperty`、`defineProperties`。

computed memberのstringにescapeが一文字でもある場合は、復号して安全名へ読み替えず、そのcomputed member自体を拒否する。
したがって`process["get\u0042uiltinModule"]`を許可しない。

privileged rootを次へ固定する。

- `globalThis`、`global`、`Reflect`はbare identifierとしての出現を全て拒否する。
- bare `process`はexact direct member
  `argv`、`env`、`cwd`、`execPath`、`exitCode`、`pid`、`platform`、
  `version`、`versions`、`stdout`、`stderr`
  のrootとしてだけ許す。
  `process`単体、import／宣言／parameterのbinding、alias代入、destructuring、optional member、computed member、表外direct memberを拒否する。
  許可member後の通常chainも上の禁止member規則を受ける。
- bare `Object`はexact direct member
  `freeze`、`keys`、`entries`、`fromEntries`、`values`、`is`、`hasOwn`
  のrootとしてだけ許す。
  `Object`単体、import／宣言／parameterのbinding、alias代入、optional／computed member、表外direct memberを拒否する。
- privileged rootに対するcomputed memberは、keyがliteralか式かを問わず常に拒否する。
  `process["get" + "BuiltinModule"]`や
  `Object["get" + "PrototypeOf"]`も許可しない。

`node:vm`、`node:module`等は§6のspecifier allowlist外として別経路でも拒否する。
comment、通常文字列、template raw、正規表現内に同じ字面があるだけでは拒否しない。
templateの`${...}`内は検査する。
named importのimported／local tokenも上の名前規則を受ける。
I019は各禁止群の正例・負例と、文字列／comment内の同字面を除外できることを同じID内のsubcaseで確認する。

このscannerが保証するのは、固定source identityに対する版付きの字句・構文graph閉包である。
明示的import／requireと、ここで列挙した固定的な反射入口を拒否する。
一般objectの任意計算property、native runtime自体の改変、JavaScript全意味論をsandboxとして証明するものではない。
ただしprivileged rootを一般objectへaliasする既知の固定経路は上の規則で拒否する。
安全memberを追加する必要が生じた場合はscannerを黙って緩和せず、契約改訂へ戻す。

## 6. role別の許可specifier

Node組み込みは`node:` prefix付きの次のliteralだけを許す。
裸の`fs`、`path`等は同じmoduleでも拒否する。
相対pathも表のraw literal完全一致だけを許し、正規化しない。

| role | 許可するNode specifier | 許可する相対specifier |
|---|---|---|
| `core` | `node:child_process`, `node:crypto`, `node:fs`, `node:os`, `node:path`, `node:url` | なし |
| `checker` | `node:fs`, `node:path`, `node:process` | `./approved_document_admission_ledger_v002.mjs` |
| `bootstrap-runner` | `node:child_process`, `node:crypto`, `node:fs`, `node:os`, `node:path`, `node:process`, `node:url` | なし |
| `admission-runner` | `node:crypto`, `node:fs`, `node:path`, `node:process` | `./approved_document_admission_ledger_v002.mjs` |
| `test` | `node:assert/strict`, `node:child_process`, `node:crypto`, `node:fs`, `node:os`, `node:path`, `node:process`, `node:test`, `node:url` | `./approved_document_admission_ledger_v002.mjs`, `./run_approved_document_admission_ledger_v002_bootstrap.mjs` |
| `v1-checker` | `node:child_process`, `node:crypto`, `node:fs`, `node:path`, `node:url` | なし |

次は常に拒否する。

- 表外Node組み込み。
- package名、`node_modules`解決。
- `../`、`./`の表外path、query、fragment、percent escape。
- repository絶対path、filesystem絶対path。
- `file:` literal。
- `http:`、`https:`、`data:`、network import。
- backslashを含むspecifier。
- case違い、Unicode正規化でのみ一致する値。

`bootstrap-runner`に相対static importを許さないのは、未検証launcherがworktree上のcoreをscannerより先に評価する循環を作らないためである。
bootstrap mutationでcoreが必要な場合だけ、§5.4のscanner通過後dynamic importを使う。
`admission-runner`の`node:crypto`は、元契約§6.12で保存前の承認原文、
承認記録、改訂対象byteのSHA-256を導出する既存責務だけに使う。
global WebCryptoや別hash実装へ逃がさず、`createHash`のnamed import一件を使う。

元契約§6.13のcollector I/O境界に対し、外側launcherがmodule評価前に行う次の読取だけを狭い例外として追加する。

- 固定5実体と固定v1 checkerのmaterialize、通常file／symlink、byte数、SHA-256、scanner入力byteの読取。
- §5.4のdynamic import直前に行う、同じmaterialize実体のrealpath・identity再照合。

これはsnapshot、ledger、承認履歴、Git diffを収集する入口ではない。
collectorのrepository状態収集は従来どおりcoreだけが所有し、launcherは上記読取からvalidation結果を推測しない。

### 6.1 bootstrap precommitのv1実行carrier

元契約§6.13の公開関数数は六つのままとし、
`collectApprovedDocumentAdmissionSnapshotV002`の引数だけを次のfield順へ非互換に明確化する。

```text
{
  phase,
  admissionId,
  jobPath,
  repositoryContext,
  runtimeImportContext
}
```

- `bootstrap-precommit-index`だけ、`runtimeImportContext`は
  `{kind:"approved-document-admission-materialized-runtime-v001", materializedRoot}`
  の二field exact object。
- `materializedRoot`は§7.2で固定5実体を展開した
  `runRoot + "/evals/clip_composition"`の実体absolute path。
  materialized checkerが既存child argvの第四引数を検証した後、内部でそのまま写す。
  job、環境変数、追加CLI引数から受け取らない。
- 他の六正式phaseでは`runtimeImportContext=null`。
- `isolated-git-fixture-v001`でbootstrap precommitを検査する場合だけ、testがprocess固有一時directoryへ同じlayoutを作り、同じtagged objectを共有collectorへ直接渡せる。
  production CLIからfixture contextへ到達できない既存契約は変えない。
- 未知field、別kind、別phaseでの非null、bootstrap precommitでのnullを拒否する。
  これらはsnapshot shapeの通常違反へ補完せず、collectorを呼ぶ工程間入力自体の不成立として
  `TOOL_GRAPH_EXECUTION_FAILED`、解釈済み`phase`、固定v1 checker path、exit 2のfatalにする。
  `phase`自体が正式enum外なら既存`USAGE`、`phase=null`、`path=null`、exit 2が先に所有する。
  不正contextではfilesystem読取、snapshot生成、通常report生成を開始しない。

`RepositorySnapshotV002`は、元の20番
`precommitReportEvidence`の後へ次を挿入する。

21. `runtimeImportEvidence`: bootstrap precommit以外は`null`
22. `v1BaselineEvidence`: bootstrap precommit以外は`null`

旧21番`v1BaselineEvidence`は22番へ移る。
同じschema名の旧21-field snapshotを受理するshim、補完、fallbackは作らない。
まだv002実装・利用者が存在しないため、これは実装前契約の非互換明確化である。

`runtimeImportEvidence`のfield順と値域を次へ固定する。

| 順 | field | exact value |
|---:|---|---|
| 1 | `kind` | `"v1-checker-before-import-v001"` |
| 2 | `role` | `"v1-checker"` |
| 3 | `path` | `evals/clip_composition/check_approved_document_bindings_v001.mjs` |
| 4 | `expectedSourceCommit` | `01adea0881372cb3dae0e27192e7f5543ffb9840` |
| 5 | `expectedGitMode` | `"100644"` |
| 6 | `expectedGitBlobObjectId` | `4c27b38e84b84c9e5817c79a6e806989bcbd4c04` |
| 7 | `expectedByteLength` | `7525` |
| 8 | `expectedFileSha256` | `688e132fdf60e1e8d36575681d6075b674d7ffa587c79d6bcf23234a5056f61e` |
| 9 | `resolvedRelativePath` | `"v1/evals/clip_composition/check_approved_document_bindings_v001.mjs"`または解決不能時`null` |
| 10 | `componentSymlinkCount` | 0以上safe integer |
| 11 | `observedGitMode` | 通常fileで実行bitが一つもなければ`"100644"`、一つ以上あれば`"100755"`、symlinkなら`"120000"`、directoryなら`"040000"`、その他または読取不能なら`null` |
| 12 | `observedGitBlobObjectId` | 同じraw byteからGit SHA-1 object formatの`blob <byteLength>\0<rawBytes>`を一回hashした小文字40桁、読取不能時`null` |
| 13 | `observedByteLength` | 0以上safe integerまたは読取不能時`null` |
| 14 | `observedFileSha256` | 読めたraw byteの小文字64桁SHA-256、読取不能時`null` |
| 15 | `statStable` | 同じfile descriptorの読取前後`fstat`完全一致なら`true`、他は`false` |
| 16 | `status` | `"passed"`または`"failed"` |
| 17 | `moduleEvaluated` | import完了時だけ`true`、それ以前は`false` |

`status="passed"`は、`runRoot`から固定相対pathで導出した全componentが通常directory／通常file、symlink 0件で、`resolvedRelativePath`が表の値、前後`fstat`一致、observed mode／Git blob OID／byte数／SHA-256が表の期待値と全一致する場合だけである。
Git blob OIDとSHA-256は同じfile descriptorから読んだ同じraw byte列から各一回導出し、片方の読取値を他方から推測しない。
これらの事実の一つでも不成立なら`"failed"`とし、v1 moduleを評価せず、
`v1BaselineEvidence=null`のsnapshotをvalidatorへ返す。
validatorはこのexact objectから同じ合否を再計算し、failedをcode 68、
`admissionId=null`、v1 checker path一件へ写す。
collectorがfailedを`V001_BASELINE_FAILED`へ読み替えない。

最初のcomponent `lstat`で`ENOENT`または`ENOTDIR`となる不存在、symlink、非通常file、mode／Git blob OID／byte数／hash不一致、読取中のstat変化はcode 68が所有する。
最初の`lstat`の表外errorと、通常file確認後の`open`／`read`／`fstat`の全I/O例外は、競合を不存在へ読み替えず、snapshotを部分生成しない
`TOOL_GRAPH_EXECUTION_FAILED`のfatalへ返す。
module import例外、export不在、関数呼出例外も同じfatalである。
symlink／非通常fileでは`open`せずfailed evidenceを作る。

expected source commitは、launcherが固定commitからmaterializeしたという§3.2の来歴であり、materialized filesystemだけから再導出できない。
一方、mode／Git blob OID／byte数／SHA-256／固定相対pathの五つは上記carrierで現在実体を再照合する。
したがって§5.4・§7.2の「固定6 identityへ再照合」は、
source commit provenance一値を運用信頼根として保持し、残り五値を現在実体から再観測する意味である。
source commitを現在byteから暗号学的に再証明したとは主張しない。
合格時だけ固定v1 moduleを一回dynamic importし、既存
`checkApprovedDocumentBindingsV001`を元契約どおり
`workspaceRoot="/Users/kawafmm/workspace/zev2"`、
`phase="implementation-start"`、
固定6 bindingで一回呼び、旧§6.13どおり`v1BaselineEvidence`を作る。

期待source commitは固定来歴であり、materialized filesystemから再証明した観測値ではない。
期待blobは同じraw byteから再導出した`observedGitBlobObjectId`と照合する。
現在byte・mode・blob・pathの再照合と、launcherが固定source commitからmaterializeしたという
§3.2の運用信頼根を混同しない。

通常reportの`evidence` field数と順序は変えない。
追加carrierは既存`repositorySnapshotSha256`へ含まれ、
`v1BaselineEvidenceSha256`はbinding failed時に`null`である。
`repositorySnapshotSha256`は22-field snapshotを正本に再計算する。

## 7. code 68の所有と評価前入口

### 7.1 code 68が所有する不成立

既存68番
`TOOL_GRAPH_IMPORT_OUTSIDE_GRAPH`
は次を所有する。

1. materializeできた対象JavaScript byteの字句不正。
2. §5で許可していないimport／export-from／require／import.meta構文。
3. role別許可集合外のspecifier。
4. specifierのescape、非ASCII、非literal、正規化依存。
5. 同じspecifierの重複。
6. 許可されたdynamic import siteのrole、token列、件数、実行時URL束縛の不一致。
7. hashbang規則の不一致。
8. §5.8で禁止した文字列code実行・反射的module取得の実行token。

対象fileをGit/indexから読めない、通常fileとしてmaterializeできない、scanner自体を起動できない場合は、source byteを解釈できないため既存fatalが所有する。
作業ツリー上の外側launcher自身がNodeから起動不能な場合もcode 68を自己報告できず、bootstrap信頼境界外のprocess失敗である。

code 67
`TOOL_GRAPH_IDENTITY_MISMATCH`
との境界を次へ固定する。

- code 67は、scannerが固定toolGraph 5実体へ全件合格しchildを起動できた後、
  materializeした**その5実体**とstrict ledgerのtoolGraph identityが不一致である場合だけを所有する。
- `bootstrap-runner`からmaterialized coreへ移る許可dynamic importの直前再照合不一致は、
  child／core評価前なので§8のpre-child code 68が所有する。
- coreから固定v1 checkerへ移る許可dynamic importの直前再照合不一致は、
  v1 checkerがtoolGraph 5件外であるため§6.1のtyped carrierを経た通常report code 68が所有する。
- scanner不合格fileは評価しないため、同じfileが予定identityとも異なる場合でも、そのrunではcode 68だけをpre-childで報告する。
- code 67を先に出すために不正sourceを評価しない。
- 上の二つの許可dynamic import再照合以外では、scanner合格後は通常reportの固定code順に戻る。

### 7.2 評価前の正式順序

七つの正式検査phaseで外側launcherは次の順だけを取る。

1. 固定Node／Gitと親環境を既存契約どおり確認する。
2. index stage 0またはbootstrap導入候補treeから固定5実体をprocess固有一時directoryへmaterializeする。
3. 全5実体の通常file、symlink 0件、byte数、SHA-256を読み取り、単一scannerを**toolGraph順の全5件**へ実行する。
4. `bootstrap-precommit-index`だけは、固定v1 checkerを固定source commitから別途materializeし、scanResults上の6件目として同じscannerを実行する。
   v1 checkerはtoolGraphの6件目にはしない。
   出力先は
   `runRoot + "/v1/evals/clip_composition/check_approved_document_bindings_v001.mjs"`
   だけで、全親componentを通常directory・symlink 0件として作り、§6.11の6 identityをsource commitから照合する。
5. 一件でも不合格なら、どのmaterialized moduleも評価せず§8のpre-child reportを出す。
6. 全件合格の場合だけ、materialized checkerを固定Nodeで一回起動する。
7. checkerはscanner合格済みのmaterialized coreをstatic importする。
   bootstrap precommitだけは、checkerが検証済み`materializedRoot`を§6.1の
   `runtimeImportContext`へ写し、coreがscanner合格済みv1 checkerを§5.4の限定dynamic importで一回呼ぶ。
   他phaseは`runtimeImportContext=null`である。

launcherは最初の不合格で走査を打ち切らず、materialize済み対象を全件走査してfile単位の不成立を揃える。
ただしmaterialize自体が完遂できない場合はscanner reportを捏造せずfatal停止する。

### 7.3 launcher責務の限定改訂

元契約§8.5の
「launcher自身はpassed／failed reportを作らない」
を、次の一件だけ上書きする。

- launcherは§8の**code 68専用pre-child failed report**だけを生成できる。
- launcherはpassed report、通常check report、code 68以外の違反reportを生成できない。
- scanner合格時はreportを作らず、従来どおりchild stdout／exitを透過する。
- pre-child reportを正式report pathへ保存しない。
- pre-child reportをprecommit trailerへ束縛しない。
- code 68以外の不成立をscanner reportへ混ぜない。

これは検査対象を評価せずcode 68を所有するための最小例外であり、launcherを通常validatorへ昇格させるものではない。

code 68の文字列literalは、pre-child報告をcore評価前に作るため外側launcherにも一件必要になる。
これはscanner logicの複製ではなく、既存coreがexportする68番codeと一致させるための不可避な識別子複製である。
coreの違反code正本はnamed constant export
`APPROVED_DOCUMENT_ADMISSION_VIOLATION_CODES_V002`
へ固定する。
値は`Object.freeze`した文字列arrayで、元契約§12の1〜70を同じ順で置き、
末尾71件目だけ本追補§11の
`"APPROVED_DOCUMENT_IDENTITY_TRANSITION_INVALID"`を追加する。
重複、空文字、別順、object化を許さない。
元契約§6.13のproduction関数export六件は変えず、このconstantを関数入口へ数えない。
launcher側literalは
`"TOOL_GRAPH_IMPORT_OUTSIDE_GRAPH"`
一つに固定し、V068とI019で、正常に評価できる固定coreのexport 68番、launcher側literal、V068観測codeが三者byte一致することを確認する。
launcherはこのconstantをscanner前にimportしない。
正常coreを評価できたtestだけがarrayの68番を読む。
一つのtest内へ別scannerを作らず、V068は不正sourceをlauncherへ与えてpre-child reportを観測し、I019は正常な固定coreを既存の検査済み入口から読み出して三者を照合する。
不一致時に片方を正規化して合わせず検査不合格とする。

### 7.4 bootstrap mutationの評価前入口

`--prepare-bootstrap-v001`は七つのformal phaseとは別processだが、coreをdynamic importする前に次の順を必須とする。

1. 外側bootstrap launcher自身が元契約§6.3.1のtoolGraph 5 pathをexact literalで所有し、Git index stage 0だけからprocess固有一時directoryへmaterializeする。
   未信頼bootstrap jobを読んでscan対象pathを選ばない。
2. 固定5件を§7.2と同じ順で読取・hash・scanする。
3. scanner不合格または§5.4のcore URL束縛不一致なら、`phase="bootstrap-mutation-prepare"`、`admissionId=null`、`scanResults` 5件の§8 pre-child reportをstdoutへ出し、exit 1で停止する。coreを評価せず、台帳・承認記録・job・reportを作らない。
4. materialize・読取・一時directory・実行中Node／Git identity照合を完遂できない場合は、次の表と既存fatal schemaでexit 2とする。scan結果を捏造しない。
5. 全5件合格し、core pathの直前identity再照合も合格した場合だけ、§5.4のexact siteからmaterialized coreを一回dynamic importする。

bootstrap mutationのfatal所有を次へ固定する。

| 観測段階 | fatalCode | `phase` | `path` |
|---|---|---|---|
| CLI shape／未知mode／引数数不一致 | `USAGE` | `null` | `null` |
| 親processに下記の禁止Git選択環境変数が一つ以上存在 | `GIT_ENVIRONMENT_OVERRIDE_PRESENT` | `null` | `null` |
| 親processに下記の禁止Node／dynamic-loader環境変数が一つ以上存在 | `ENVIRONMENT_UNAVAILABLE` | `null` | `null` |
| 固定Node／Git実体のmode・byte数・SHA不一致、`realpath("/private/tmp") !== "/private/tmp"`、`/private/tmp`不存在、一時root／下記子directoryの作成・mode・symlink・排他性不成立 | `ENVIRONMENT_UNAVAILABLE` | `null` | `null` |
| Node child用またはGit child用のexact envを下記どおり構築不能、実行時`LC_ALL`／`LANG`／`TZ`がexact値でない | `ENVIRONMENT_UNAVAILABLE` | `null` | `null` |
| 固定Git processの起動・stdin／stdout／stderr transport不能 | `GIT_IO_FAILED` | `null` | `null` |
| indexは読めたが固定5 path欠落、stage 0でない、blobでない、blob展開不能、materialize file読取不能 | `TOOL_GRAPH_EXECUTION_FAILED` | `null` | 一意なら当該toolGraph path、他は`null` |
| scanner実行自体の例外、core再照合のI/O例外、core import／export／呼出例外 | `TOOL_GRAPH_EXECUTION_FAILED` | `null` | core対象ならcore path、他は`null` |
| 一時rootの後始末不能 | `ENVIRONMENT_UNAVAILABLE` | `null` | `null` |

禁止Git選択環境変数は
`GIT_DIR`、`GIT_WORK_TREE`、`GIT_COMMON_DIR`、`GIT_INDEX_FILE`、
`GIT_OBJECT_DIRECTORY`、`GIT_ALTERNATE_OBJECT_DIRECTORIES`、
`GIT_NAMESPACE`、`GIT_CONFIG_SYSTEM`、`GIT_CONFIG_GLOBAL`、
`GIT_CONFIG_NOSYSTEM`、`GIT_CONFIG_COUNT`、
および一件以上の`GIT_CONFIG_KEY_<decimal>`／`GIT_CONFIG_VALUE_<decimal>`である。
禁止Node／dynamic-loader環境変数は
`NODE_OPTIONS`、`NODE_PATH`、`NODE_REPL_EXTERNAL_MODULE`、
`NODE_COMPILE_CACHE`、`DYLD_INSERT_LIBRARIES`、`DYLD_LIBRARY_PATH`、
`DYLD_FRAMEWORK_PATH`、`LD_PRELOAD`、`LD_LIBRARY_PATH`である。
前者だけを`GIT_ENVIRONMENT_OVERRIDE_PRESENT`が所有し、後者を同codeへ混ぜない。

Node child envは親envを継承せず、元契約§8.5の
`HOME=<runRoot>/home`、`XDG_CONFIG_HOME=<runRoot>/xdg`、
`XDG_CACHE_HOME=<runRoot>/xdg-cache`、`XDG_DATA_HOME=<runRoot>/xdg-data`、
`TMPDIR=<runRoot>/tmp`、`PATH=/opt/homebrew/Cellar/git/2.52.0_1/bin`、
`LC_ALL=C`、`LANG=C`、`TZ=UTC`、
`GIT_CONFIG_NOSYSTEM=1`、`GIT_CONFIG_GLOBAL=/dev/null`、
`GIT_NO_REPLACE_OBJECTS=1`、`GIT_NO_LAZY_FETCH=1`
の13 key exact objectだけを作る。
Git child envは元契約§7.1の
`HOME=<runRoot>/home`、`XDG_CONFIG_HOME=<runRoot>/xdg`、
`TMPDIR=<runRoot>/tmp`、`PATH=/usr/bin:/bin`、
同じlocale三値、同じGit制御四値の11 key exact objectだけを作る。
対応する`home`、`xdg`、`xdg-cache`、`xdg-data`、`tmp`は同じprocess固有runRoot直下の通常directory、symlink 0件とする。
列挙外keyを親envから暗黙継承しない。

`bootstrap-mutation-prepare`はfatal schemaの正式phase enum外なのでfatal時は全て`phase=null`である。
`HISTORY_UNREADABLE`は履歴を読まないpre-child bootstrap mutationでは発火不能。
`REPORT_WRITE_FAILED`は元契約どおりcheckerの正式report原子保存だけが所有し、
外側launcherはreport fileを保存しない。
pre-child JSONはvalidated valueから決定的に作るため、memory上の構築不成立は
`TOOL_GRAPH_EXECUTION_FAILED`とする。
stdout自体が書けない場合は成功reportを偽造せずexit 2とし、そのtransport failureをstdout上で自己証明できないことは外部I/O信頼境界として記録する。

bootstrap mutationで生成したbyteは、それだけで承認済み・検査済みにはならない。
indexへ載せた後に`bootstrap-precommit-index`の七phase経路で再度scannerと全契約検査を通るまで未信頼入力である。
通常admission mutation runnerはbootstrap後に固定identityとして導入済みの正式実体を使うが、その出力も各admission precommit検査まで未信頼である。

### 7.5 v1 checkerの評価前再照合

bootstrap precommitのcore collectorは、§6.1の`runtimeImportContext`をstrict decodeした後だけ、
§5.4の`loadVerifiedMaterializedV1CheckerV001`を一回呼ぶ。

1. `materializedRoot`から`runRoot`と固定v1 pathを一意に導出する。
2. `verifyMaterializedV1CheckerIdentityBeforeImportV001`が§6.1の
   `runtimeImportEvidence`を作る。
3. evidenceがfailedならv1 checkerをimportせず、snapshotの
   `runtimeImportEvidence=failed`、`v1BaselineEvidence=null`としてvalidatorへ渡す。
4. validatorはcode 68一行を通常reportへ出す。
5. evidenceがpassedの場合だけ固定URLを一回importし、v1 6/6結果を既存carrierへ保存する。

この経路はlauncherのpre-child reportではない。
coreとvalidatorが起動済みでtyped evidenceを運べるため、通常reportの所有である。
v1 moduleのidentity不一致をcode 67へ読み替えず、v1 6/6の失敗をcode 68へ読み替えない。

validatorの組合せ表を次へ固定する。

| `runtimeImportEvidence` | `moduleEvaluated` | `v1BaselineEvidence` | 結果 |
|---|---:|---|---|
| `status="failed"` | `false` | `null` | code 68だけ。code 39を出さない |
| `status="passed"` | `true` | 従来exact shape | bindingは合格。内容6/6不成立だけ既存code 39 `V001_BASELINE_FAILED` |
| 上記以外 | 任意 | 任意 | snapshot shape／工程間受け渡し不成立として既存`TOOL_GRAPH_EXECUTION_FAILED` fatal。code 39／68で補完しない |

normal report内でtoolGraph 5件由来のcode 67とv1由来のcode 68が別対象に同時成立した場合は、固定code順で両方を記録する。
一方を理由に他方を抑制しない。

## 8. code 68専用pre-child report

### 8.1 exact schema

canonical JSONは元契約§6.1と同じ2-space indent・LF一つを使う。
field順を次へ固定する。

| 順 | field | exact shape |
|---:|---|---|
| 1 | `schemaVersion` | `"approved-document-admission-ledger-prechild-import-report-v001"` |
| 2 | `phase` | 元契約§11.1の七phaseの一つ、または`"bootstrap-mutation-prepare"` |
| 3 | `status` | `"failed"` |
| 4 | `admissionId` | admission二phaseはCLIのID、他phaseとbootstrap mutationは`null` |
| 5 | `scanResults` | 下記array |
| 6 | `violations` | 下記array |
| 7 | `guaranteeBoundary` | 下記object |

`scanResults[]`のfield順:

1. `role`: toolGraph 5 roleまたは`"v1-checker"`。
2. `path`: 対象repository相対path。
3. `identitySource`:
   `"index-stage-0"`、
   `"bootstrap-introduction-candidate-tree"`、
   `"fixed-source-commit"`の一つ。
4. `sourceCommit`:
   indexなら`null`、他二種は小文字40桁OID。
5. `fileSha256`: scannerが読んだbyteの64桁SHA-256。
6. `status`: `"passed"`または`"failed"`。
   通常phaseではscanner字句・構文検査の結果。
   bootstrap mutationのcoreだけは、scanner合格後の§5.4 URL／identity再束縛も含み、そこが不一致なら`"failed"`へする。

対応を次へ固定する。

| phase／role | `identitySource` | `sourceCommit` |
|---|---|---|
| `bootstrap-precommit-index`のtoolGraph 5件 | `"index-stage-0"` | `null` |
| `bootstrap-postcommit-head`以後の六formal phaseのtoolGraph 5件 | `"bootstrap-introduction-candidate-tree"` | launcherが選んだ候補**commit**の40桁OID |
| `bootstrap-precommit-index`のv1 checker | `"fixed-source-commit"` | `01adea0881372cb3dae0e27192e7f5543ffb9840` |
| `bootstrap-mutation-prepare`のtoolGraph 5件 | `"index-stage-0"` | `null` |

`bootstrap-introduction-candidate-tree`はlauncherが一意に選んだ候補であり、
真の導入commitであることをlauncherが証明したという意味ではない。
materialize元はこの候補commitのtreeだが、`sourceCommit`へtree OIDを入れない。
tree OIDはchild側の履歴・toolGraph検査が再導出する値であり、pre-child reportへ別fieldを新設しない。
真の導入commitの再導出と一致はmaterialized child validatorだけが判定する。

順序はtoolGraph 5件の固定順。
bootstrap precommitだけ、その後へ`v1-checker`を一件追加して6件とする。
他の六formal phaseとbootstrap mutationは5件ちょうどである。

`violations[]`は通常reportと同じfield順
`code`、`admissionId`、`path`。

- `code`は全件`"TOOL_GRAPH_IMPORT_OUTSIDE_GRAPH"`。
- `admissionId`はtop-levelと同じ。
- `path`はfailedになったscanResultのpath。
- 一fileに複数のscanner不成立、またはbootstrap mutation coreのURL／identity不一致があっても一行へ集約する。
- toolGraph順、最後にv1 checkerの順とし、同じpathを重複掲載しない。
- 一件以上を必須とする。

`guaranteeBoundary`のfield順:

1. `executionBoundary`:
   formal七phaseは`"before-materialized-checker-child-start"`、
   bootstrap mutationは`"before-materialized-core-module-evaluation"`
2. `bootstrapLauncherCryptographicallyProved` = `false`
3. `materializedTargetModuleEvaluated` = `false`
4. `continuousFilesystemImmutabilityProved` = `false`

### 8.2 stdout・exit

- stdoutは上記JSON一つだけ。
- stderrは0 byte。
- exitは1。
- report fileを作らない。
- formal七phaseではmaterialized checkerのNode childを起動しない。
- bootstrap mutationではchecker child工程自体がなく、materialized core moduleを評価しない。
- materializeのために既に使用した固定Git childまで0件とは主張しない。
- 列挙外field、自由文detail、stack traceを入れない。
- report valueはmemory上で確定し、元契約§8.5の一時directory後始末が成功してからstdoutへ一回だけ出す。
  後始末が失敗した場合はcode 68 reportを先に出さず、
  `ENVIRONMENT_UNAVAILABLE`、formalなら解釈済みphase、mutationなら`phase=null`、`path=null`、exit 2とする。
- validated report valueの構築・canonical serializeを完遂できない場合は部分byteを出さず、
  `TOOL_GRAPH_EXECUTION_FAILED`、formalなら解釈済みphase、mutationなら`phase=null`、`path=null`、exit 2とする。
- stdout byteを全てmemoryで作った後のOS write開始後にEPIPE／partial writeとなった場合、同じstdoutへ別fatal JSONを追記してcanonical成功を偽装しない。
  exit 2とするが、壊れたstdout上でfatalを自己証明できない点は外部I/O信頼境界である。

scanner合格runにはこのreportを作らない。
child側通常reportの`toolResults`が評価された5実体のidentityを記録し、外側launcherがscanを実行したこと自体は§3.2の運用信頼根境界に残す。
強く見せるためだけの署名・自己申告attestationを新設しない。

## 9. 承認済み文書identityの履歴状態機械

### 9.1 保護対象

first-parent履歴で保護する対象を次へ固定する。

| 対象 | 保護開始 | 有効identityの所有ID |
|---|---|---|
| `legacyDocuments`の文書 | 各`sourceCommit` | `legacyId`。reportの`admissionId`は`null` |
| `request-approval-pair`で`approvalEffect="approve-request-document-as-contract"`の`requestDocument` | pair登録commit | その`admissionId` |
| 全`approvalRecordDocument` | そのpair／revision登録commit | その`admissionId` |
| `approved-document-revision`の`revisedDocument` | 対象pathは旧identityから同commitで切替。新identityは同commitから保護 | revisionの`admissionId` |

approval recordを含める根拠は、元契約§3.1(6)が現在identityの永続照合を要求し、かつapproval recordをrevision対象へできないためである。
登録時の承認来歴を後から差し替える経路を残さない。

次はこの新しいidentity連続性検査の対象外である。

- `approvalEffect="authorize-requested-action"`のrequest。
- `revisionRequestDocument`。
- toolGraph 5実体。
- precommit／postcommit report。
- 本追補自身。

対象外でも、commit-pinned source identity、toolGraph identity、report契約等の既存検査は変わらない。

### 9.2 有効mapの作成

validatorはstrict decode済みledgerと履歴から、各first-parent commit時点の
`path -> {ownerKind, ownerId, identity}`
mapを決定的に作る。

1. pre-bootstrap legacy mapは、最初のstrict bootstrap ledgerにあるlegacy 6件から各`sourceCommit`までfirst-parentを遡って事後導出する。
   bootstrap ledgerをstrict decodeできない場合は既存ledger違反が所有し、code 71用のlegacy mapを推測生成しない。
2. legacy pathは各`sourceCommit`のtreeで宣言identityと一致した時点から有効。
3. bootstrap前であっても、legacyの`sourceCommit`以後は同じidentityを追跡する。
4. contract承認requestとapproval recordは登録commitから有効。
5. revision対象pathはrevision commitの親まで旧identity、revision commitから新identity。
6. approval recordはrevision対象にできず、登録identityのまま永続する。
7. 同じpathへ有効identityが二つ並立する、版鎖が一意でない、保護開始commitがfirst-parent祖先でない場合は既存のledger／版鎖／source順序違反が所有し、新codeで推測補完しない。

### 9.3 許可するidentity遷移

code 71が使うtree identityを
`{presence, gitMode, gitBlobObjectId}`
へ固定する。
`presence = (gitMode !== null)`であり、他二値は`treePathRecords`のraw値である。

隣接するfirst-parentの親Pと子Cで、保護pathのtree identityが同じ場合、同pathの`firstParentDiffs.records`が0件である場合だけ合格する。
identityが変わる場合は、次の全条件を満たす一件だけを許す。

1. Cは単一親で、親がP。
2. CのledgerはPのledgerをexact prefixとして持ち、
   `approved-document-revision`を末尾へ一件だけ追加する。
3. そのrevisionの`revisedDocument.path`が変化pathとbyte一致する。
4. `supersedes`がP時点の有効ownerとidentityを完全参照する。
5. Pのtree identityが旧有効identityと一致する。
6. Cのtree identityが`revisedDocument`と一致する。
7. Cの`firstParentDiffs`に、同pathのstatus `M`が一件だけある。
8. 同じrevisionで同pathを二回、別pathを暗黙変更、別revisionを同時追加していない。
9. 改訂文書、approval record、ledger、jobの既存4 path契約も成立する。

tree identityとdiff carrierの相互整合を次へ固定する。

- 同pathのdiff recordは、保護pathをstrict UTF-8 encodeしたbyteと`pathBytes`が完全一致するrecordだけを数える。文字列正規化・case変換・path正規化をしない。
- identity不変なら同pathのdiff recordは0件。
- 正規revisionのidentity変更なら、同pathのstatus `M`がexact一件。
- identity不変なのにdiffがある、identity変更なのにdiffがない、二件以上ある、statusまたはpathがtree遷移と一致しない、のいずれもcode 71。
- diffの整合だけで正規revisionとは扱わず、上の九条件を全て要求する。

この条件を満たさない次の変化は全て違反である。

- 非登録commitでのbyte変更。
- 削除。
- executable bitを含むmode変更。
- 通常fileからsymlink、tree、gitlink等へのtype change。
- 違法変更後の元byteへの復元。
- 別pathのrevision登録commitに便乗した変更。
- pair登録commitに便乗した変更。
- 違法変更後にrevisionを登録して過去の変更を正当化すること。

違法変更後のrevisionは、revision親のidentityが有効旧版と一致しないため合格しない。

### 9.4 既存収集値だけを使う

履歴上のidentity・diffという**事実を観測する追加carrier**は、既存snapshotの次の二つだけである。

- `firstParentDiffs`
- `treePathRecords`

保護path、owner、保護開始、正規revisionの制御mapは、§9.2どおり既存検査がstrict decode済みledgerから導出した値を参照する。
これは新しい履歴観測carrierでもcollector I/Oでもない。
code 71の状態機械は、履歴上のtree・diff事実については上の二arrayだけを入力とし、`blobTable`を読まない。
byte変更はGit blob OIDの差で検出する。
既存の承認identity検査がbyte数・SHA-256を`blobTable`から照合する責務は変えないが、それはcode 71の追加入力ではない。
collectorへ新しいGit command、filesystem読取、履歴走査を追加しない。
validatorがGitやworktreeを再読しない。

## 10. `treePathRecords`のtype carrier明確化

元契約§6.13の`treePathRecords[]`各recordの四field数は変えず、値の意味を次へ固定する。
RepositorySnapshot全体は§6.1で21 fieldから22 fieldへ非互換改訂しており、それとは別の話である。

| tree entry | `gitMode` | `gitBlobObjectId` |
|---|---|---|
| path不存在 | `null` | `null` |
| regular／executable file | raw mode `100644`／`100755` | blob OID |
| symbolic link | raw mode `120000` | blob OID |
| tree | raw mode `040000` | `null` |
| gitlink | raw mode `160000` | `null` |

- presenceは`gitMode !== null`で判定する。
- `gitBlobObjectId`が非nullのrecordだけを既存`blobTable`必須対象にする。
- 非blob entryのobject byteをblobと偽って`blobTable`へ入れない。
- protected pathは承認時点で通常fileでなければならないため、通常fileから非blob typeへ入る最初の辺を`gitMode`差で必ず検出できる。
- 非blob状態内のobject差を承認identityとして受理しない。
  非blobへ変わった最初の辺で既に新codeが成立し、復元辺も別の不正遷移である。
- `firstParentDiffs`の`D`、`T`、`A`、または`M`とtree identityを合わせて使い、status名だけから内容を推測しない。

この明確化は既存`ls-tree`／`diff-tree`相当の収集値の写し方を固定するもので、新しいI/Oを追加しない。

## 11. 新違反code 71

既存1〜70を維持し、末尾へ次を追加する。

| 順 | code | 所有する不成立 |
|---:|---|---|
| 71 | `APPROVED_DOCUMENT_IDENTITY_TRANSITION_INVALID` | 保護開始後のfirst-parent隣接commitで、承認済み文書pathのidentityが§9.3の正規revision以外で変化した、または同pathのtree identityとdiff carrierが§9.3の対応を満たさない |

### 11.1 reportへの写し方

通常reportの`violations[]` schemaは変えない。

- `code`: 上記code。
- `path`: 不正遷移があった保護path。
- `admissionId`:
  最初の不正遷移直前に有効だったidentityのowner ID。
  legacyなら`null`、pair／revision／approval recordならその`admissionId`。
- 同じpathに複数の不正遷移があっても一行へ集約する。
- 最初の不正遷移をowner選択の正本とし、後の復元でownerを差し替えない。
- 複数pathは既存どおりcode順、pathのUTF-8 byte順、ID順。

全遷移の根拠は同じrunの`firstParentDiffs`と`treePathRecords`に残り、
reportの`firstParentDiffsSha256`と`repositorySnapshotSha256`へ束縛される。
自由文やcommit一覧を違反rowへ追加しない。

## 12. 検査表と件数の確定

### 12.1 code probe

- 違反probeを`V001`〜`V071`の71件へ改訂する。
- exportされた違反code集合とV001〜V071の観測集合を完全一致assertする。
- `V071`はlegacy保護path
  `docs/v071-approved-document.md`
  を非登録commitで変更し、次commitで元identityへ復元したsnapshotを使う。
  現在byteが承認identityへ戻っていても、期待する`violations`は
  `{code:"APPROVED_DOCUMENT_IDENTITY_TRANSITION_INVALID", admissionId:null, path:"docs/v071-approved-document.md"}`
  の一行だけである。
- `V068`は一つのprobe ID内で次をexactに検査する。
  phaseは`bootstrap-precommit-index`、`admissionId=null`。
  toolGraph 5件と固定v1 checkerの正常baseline byteを§7.2順に置き、
  `test` roleのbyteだけを
  `import "node:vm";\n`
  へ置換する。
  testだけ`status="failed"`、他5件はpassed。
  期待違反は
  `{code:"TOOL_GRAPH_IMPORT_OUTSIDE_GRAPH",admissionId:null,path:"evals/clip_composition/test_approved_document_admission_ledger_v002.mjs"}`
  の一行だけとする。
  materialized checker起動、core評価、v1評価、report file生成は全て0件。
  report builderのcode、正常baseline coreがexportする68番、launcher literalの三者をbyte一致assertする。
  正常baselineの将来hashはjob固定値へ照合し、置換byteのhashだけを同byteから一回導出する。仮hashを置かない。
- fatal probeはF001〜F007の7件不変。

### 12.2 既存統合検査の明確化

| test ID | 本追補による明確化 |
|---|---|
| `I003` | 正常revisionは旧有効identity→新identityの一遷移で、対象pathのexact `M`一件を持つ。§9.3全条件を満たす |
| `I018` | launcherはmaterialized 5実体を評価前にscannerへ通し、不合格ならchild未起動のcode 68専用report、合格なら従来のchecker一回起動になる。`--prepare-bootstrap-v001`も固定5件scan→core URL直前束縛→core一回評価の順で、失敗時にmutation artifact 0件となる |
| `I019` | §5の全受理・拒否構文、comment/string/template raw/regex/hashbang除外、template式内検出、全role許可specifier、dynamic import二例外の実行時束縛、§5.8の文字列code・反射的module取得禁止、launcher側68 literalとcore exportの一致、v1 checkerを表形式のsubcaseで検査する。test専用scannerを作らない |
| `I020` | 通常passed／failed report、七phaseと`bootstrap-mutation-prepare`のcode 68専用pre-child failed report、7 fatal reportのexact shape・stdout・stderr・exit対応を全て確認する |
| `I024` | formal phaseが登録commitだけでなく、§9の保護開始後の全first-parent identity遷移も既存snapshotから再検査する |

#### 12.2.1 I018の評価前入口

I018は次のsubcaseを表順に持つ。
全て同じproduction inspection／scanner／再照合処理を使い、CLIへtest hookを加えない。

| subcase | exact入力差分 | exact期待 |
|---|---|---|
| `I018-F1` formal正常 | bootstrap precommitの正常5件＋固定v1 | 6 passed、checker起動1、core評価1、v1評価1 |
| `I018-F2` formal単一不正 | V068と同じtest byte | 全6件走査、test path一行、checker／core／v1 0 |
| `I018-F3` formal複数不正 | core末尾へ`\nrequire("node:fs");\n`、testはV068 byte | 全6件走査、違反はtoolGraph順でcore、testの二行、全module評価0 |
| `I018-F4` v1不正 | 固定v1 byte末尾へ`\nrequire("node:fs");\n` | toolGraph 5 passed、v1 failed、v1 path一行、checker／core／v1 0 |
| `I018-M1` mutation正常 | 正常5件 | 5 passed、core直前再照合passed、verified URLのcore評価1 |
| `I018-M2` mutation scanner不正 | testをV068 byteへ置換 | 全5件走査、core評価0、生成対象の正式ledger＋承認記録3件へのcreate／write／rename 0 |
| `I018-M3` mutation直前不一致 | baseline coreのscan hash確定後、test一時rootのcoreを別byteへ置換してproduction再照合処理を直接呼ぶ | core再照合failed、core path一行、dynamic import 0、上の生成対象4 pathへのcreate／write／rename 0 |

M3はrace用分岐をproduction CLIへ追加せず、§4.3の正式再照合関数を使う。
正式launcherが同じ関数のpassed以外でimportへ進まないことをsource上のexact call siteと実行subcaseの両方でassertする。
mutationのbootstrap jobは既存入力であり、生成対象4 pathへ数えない。

#### 12.2.2 I019のscanner一件表

I019内部のsubcase群を次へ固定する。
各群の「各一件」は検査実装で個別case名を持ち、実装報告に
`I019 subcases passed/total`を出す。
formal統合IDはI019一件のままである。

source wrapperを次へ固定する。

- bare名`N`: `N;\n`
- direct member名`N`: `x.N;\n`
- computed exact名`N`: `x["N"];\n`
- process member名`N`: `process.N;\n`
- Object member名`N`: `Object.N;\n`
- role／specifier一件: `import "S";\n`
- comment字面: `// X\nconst ok = 1;\n`
- string字面: `const ok = 'X';\n`
- template raw字面: ``const ok = `X`;\n``
- regex字面: `const ok = /X/;\n`

`N`、`S`、`X`は表のraw ASCIIをその位置へbyte挿入し、escape・正規化をしない。
この一件表のcode spanにある`\n`は二文字ではなくLF一byteを表す。
一方、specifier／computed string内の`\xNN`はsourceに残すbackslash付きraw字面である。
`U("...")`は表記したUnicode scalar列をUTF-8へ一回encodeしたbyte、
`H("...")`は空白なし小文字hexを二桁ずつ読んだbyte、
`||`はbyte連結を表す。
dynamic baselineの一箇所変形は、表に書いたexact token列を元baseline内で検索し、
exact一件の場合だけ置換する。0件／複数件ならfixture構築失敗として停止する。

bootstrap roleでpassedを期待する合成sourceは、部分snippetを単独で渡さず、
共通wrapper `B(P,I,D)`へ入れる。
`B(P,I,D) = P || I || U(H) || D || U(F)`であり、
`P`はhashbangまたは空byte、`I`は検査対象のstatic import行列または空byte、
`D`は§5.4のbootstrap dynamic helper全byteまたは空byteである。
固定header `H`は次のcode fence内byteで、先頭`const`から始まる。

```js
const scanApprovedDocumentAdmissionJavaScriptV002 = ({role, sourceBytes}) => {
  return {status: "passed", fileSha256: "0000000000000000000000000000000000000000000000000000000000000000"};
};
const buildApprovedDocumentAdmissionPrechildImportReportV001 = ({phase, admissionId, scanResults}) => {
  return new Uint8Array();
};
const verifyMaterializedCoreIdentityBeforeImportV001 = ({materializedCorePath, expectedFileSha256}) => {
  const fileSha256 = expectedFileSha256;
  if (materializedCorePath === "") {
    return {status: "failed", fileSha256};
  }
  return {status: "passed", fileSha256};
};
const inspectApprovedDocumentAdmissionMaterializedSourcesV001 = ({phase, admissionId, sources}) => {
  return {status: "passed", scanResults: []};
};
```

固定footer `F`は次のcode fence内byteで、末尾は`}\n`である。

```js
const main = () => {};
if (process.argv[1] !== undefined && process.argv[1] === import.meta.filename) {
  main();
}
export {
  scanApprovedDocumentAdmissionJavaScriptV002,
  buildApprovedDocumentAdmissionPrechildImportReportV001,
  verifyMaterializedCoreIdentityBeforeImportV001,
  inspectApprovedDocumentAdmissionMaterializedSourcesV001
};
```

code fence記号はsourceへ含めず、各表示行の末尾はLF一byteである。
fixture wrapperの関数bodyはscanner構文の合否だけを検査する合成byteであり、
production実装の処理結果を模倣した正本ではない。
実production sourceの合否はS16が別に検査する。

| 群 | exact入力・変形 | exact期待 |
|---|---|---|
| `S01` strict byte／view | role=`test`で下のS01 byte六件＋offset view一件 | 不正byte六件はfailed。offset viewはpassedし、hashはview範囲だけ。raw byte SHAは各入力byteから一回導出 |
| `S02` hashbang | 下のS02 source十一件 | 三つの`*-valid`だけpassed、他はfailed |
| `S03` static pass | `import "node:fs";\n`、`import {readFileSync as read,} from "node:fs";\n` | core roleでpassed |
| `S04` static reject | `import fs from "node:fs";\n`、`import * as fs from "node:fs";\n`、`import {"x" as y} from "node:fs";\n`、`import "node:fs" with {type:"json"};\n`、`import "node:fs" assert {type:"json"};\n`、`import "node:fs"\n`、`if (true) { import "node:fs"; }\n`、`import "node:\x66s";\n`、`import "node:ｆs";\n`、`import "node:fs";\nimport "node:fs";\n` | 全てfailed |
| `S05` role matrix | §6の全(role,specifier)を一件ずつ。bootstrap roleだけ`B("", U("import \"<specifier>\";\n"), "")`、他roleは`import "<specifier>";\n`。拒否literalも同じrole別wrapper | 許可表内passed。拒否literalは全roleでfailed |
| `S06` export | role=`core`で`export const x=1;\n`、`const x=1;\nexport {x};\n`、`export default 1;\n`、`const x=1;\nexport {x} from "./x.mjs";\n`、`export * from "./x.mjs";\n`、`export * as x from "./x.mjs";\n` | 前二件passed、後四件failed |
| `S07` dynamic pass | bootstrapは`B("", U("import {pathToFileURL} from \"node:url\";\n"), D)`で`D`を§5.4のbootstrap exact helper全byte、coreは§5.4のcore exact baseline source | 各site一件でpassed |
| `S08` dynamic reject | S07のbootstrap／core baselineへ下のS08 mutationを一件だけ適用 | 全てfailed |
| `S09` require | `require("node:fs");\n`、`x.require();\n`、`x["require"]();\n`、`function f(){require("node:fs");}\n`、``const x=`${require("node:fs")}`;\n``。非実行字面は上の四wrapperで`X=require("node:fs")` | 実行形failed、非実行字面passed |
| `S10` import.meta | 下の三source×六role matrix。追加拒否sourceはv1 roleで`import.meta.other;\n`、`import.meta["url"];\n`、`import?.meta;\n`、`import.meta.url();\n`、`import.meta.url.href;\n`、bootstrap roleで`bootstrap-valid`へguard外の`import.meta.filename;\n`を一行追加、同guardを二個へ複製 | matrixの四許可cellだけpassed、他14 cellと追加七件はfailed |
| `S11` template境界 | 下のS11 source六件 | raw・escaped・regex passed、実行式・nested実行式・隠したdynamic site failed |
| `S12` 反射名 | §5.8の全禁止名をbare／direct member／computed exactの三形。comment／string／template raw／regexにも各一件 | 実行形failed、非実行字面passed |
| `S13` privileged root | bare wrapperでglobalThis/global/Reflect。process／Objectは上のmember wrapperで全許可名。拒否sourceは下のS13表 | 許可memberだけpassed、拒否sourceは全てfailed |
| `S14` computed迂回 | `global["eval"];\n`、`global["e\x76al"];\n`、`x["e\x76al"];\n`、`process["get"+"BuiltinModule"];\n`、`Reflect.get(process,"getBuiltinModule");\n`、`Object.getOwnPropertyDescriptor(process,"getBuiltinModule");\n`、`rows[index];\n` | 前六件failed、最後だけpassed。neutral rootの三件目がescape拒否を独立に検査 |
| `S15` actual v1 | commit `01adea...`の7525 byte | role v1-checkerでpassed。static specifier 5件、`import.meta.url`二箇所を同scannerで受理 |
| `S16` production単一性 | bootstrap runnerをtestから四bindingでnamed import。production scannerでbaseline全byteを走査し、§5.3の単一export listから一binding削除、末尾へ`export const extra = 1;\n`追加、先頭二binding入替を各一件 | baselineのexport key集合は表順exact四件。三mutationはfailed。import時I/O／child／artifact 0。mainが参照するfunctionとtestのnamed exportが同一。由来marker blockはbootstrap runner一件、他4 tool file 0 |
| `S17` code literal | launcher literal、正常core export 68、V068観測code | 三者byte一致 |

各sourceは表のliteral UTF-8とLFをそのまま使い、source generatorがescapeを復号して別入力へ変えない。
S05のrole matrixとS12の禁止名matrixは行列の全cellを展開し、代表一件へ縮めない。

S01の六byteを次へ固定する。

| case | exact byte |
|---|---|
| `bom` | `H("efbbbf") || U("const x=1;\n")` |
| `crlf` | `U("const x=1;\r\n")` |
| `bare-cr` | `U("const x=1;\r")` |
| `u2028` | `U("const x=1;") || H("e280a8") || U("\n")` |
| `u2029` | `U("const x=1;") || H("e280a9") || U("\n")` |
| `invalid-utf8` | `U("const x=1;") || H("ff") || U("\n")` |

S01のoffset viewはbacking byte
`U("xxconst x=1;\nyy")`のbyteOffset 2、byteLength 11だけを
`Uint8Array` viewとして渡す。
期待scanner入力とSHA-256正本は`U("const x=1;\n")`であり、
前後の`xx`／`yy`を含めない。

S02の十一sourceを次へ固定する。

| case | role | exact source |
|---|---|---|
| `checker-valid` | `checker` | `#!/usr/bin/env node\nconst x=1;\n` |
| `bootstrap-valid` | `bootstrap-runner` | `B(U("#!/usr/bin/env node\n"), "", "")` |
| `admission-valid` | `admission-runner` | `#!/usr/bin/env node\nconst x=1;\n` |
| `core-forbidden` | `core` | `#!/usr/bin/env node\nconst x=1;\n` |
| `test-forbidden` | `test` | `#!/usr/bin/env node\nconst x=1;\n` |
| `v1-forbidden` | `v1-checker` | `#!/usr/bin/env node\nconst x=1;\n` |
| `second-line` | `checker` | `const x=1;\n#!/usr/bin/env node\n` |
| `other-payload` | `checker` | `#!/bin/node\nconst x=1;\n` |
| `leading-space` | `checker` | ` #!/usr/bin/env node\nconst x=1;\n` |
| `bom-before` | `checker` | `H("efbbbf") || U("#!/usr/bin/env node\nconst x=1;\n")` |
| `hashbang-no-lf` | `checker` | `#!/usr/bin/env node` |

S10の`bootstrap-valid` sourceは`B("", "", "")`へ固定する。
guard二個caseは固定footer Fの`if`からその直後の`}\n`までをexactに二回連続させ、
guard外追加caseはsource末尾へ`import.meta.filename;\n`を一回追加する。

S10の三source×六role matrixを次へ固定する。

| source | `core` | `checker` | `bootstrap-runner` | `admission-runner` | `test` | `v1-checker` |
|---|---|---|---|---|---|---|
| `import.meta.filename;\n` | failed | passed | failed | failed | failed | failed |
| `import.meta.url;\n` | failed | failed | failed | failed | failed | passed |
| `bootstrap-valid`全byte | failed | passed | passed | failed | failed | failed |

S05で全roleへ与える拒否specifierを次のraw literalへ固定する。

`node:vm`、`fs`、`left-pad`、`node_modules/x`、`../x.mjs`、
`./unlisted.mjs`、`/Users/kawafmm/workspace/zev2/x.mjs`、`/tmp/x.mjs`、
`file:///tmp/x.mjs`、`http://example.invalid/x.mjs`、
`https://example.invalid/x.mjs`、`data:text/javascript,export%20{}`、
`./x.mjs?x=1`、`./x.mjs#x`、`.\x.mjs`、`node:FS`、`node:ｆs`。

S08のmutationは、各行の対象baselineで`before`がexact一件であることを確認し、
その一件だけを`after`へ置換する。
`after=""`はそのbyte範囲の削除である。

| case | baseline | before | after |
|---|---|---|---|
| `B-argument` | bootstrap | `await import(verifiedMaterializedCoreUrl)` | `await import(materializedCorePath)` |
| `B-literal` | bootstrap | `await import(verifiedMaterializedCoreUrl)` | `await import("file:///tmp/unverified.mjs")` |
| `B-two-sites` | bootstrap | `return {status: "passed", module: verifiedMaterializedCoreModule};` | `await import(verifiedMaterializedCoreUrl);\nreturn {status: "passed", module: verifiedMaterializedCoreModule};` |
| `B-helper-alias` | bootstrap | baseline末尾 | baseline末尾＋`const bootstrapAlias = loadVerifiedMaterializedCoreForBootstrapV001;\n` |
| `B-helper-assign` | bootstrap | baseline末尾 | baseline末尾＋`loadVerifiedMaterializedCoreForBootstrapV001 = bootstrapAlias;\n` |
| `B-redeclare` | bootstrap | baseline末尾 | baseline末尾＋`const verifiedMaterializedCoreUrl = "file:///tmp/x.mjs";\n` |
| `B-parameter` | bootstrap | baseline末尾 | baseline末尾＋`const f = (verifiedMaterializedCoreUrl) => verifiedMaterializedCoreUrl;\n` |
| `B-inner-shadow` | bootstrap | baseline末尾 | baseline末尾＋`if (true) { const verifiedMaterializedCoreUrl = "file:///tmp/x.mjs"; }\n` |
| `B-path` | bootstrap | `materializedRoot + "/approved_document_admission_ledger_v002.mjs"` | `materializedRoot + "/../approved_document_admission_ledger_v002.mjs"` |
| `B-no-guard` | bootstrap | `if (materializedCoreIdentityStatus.status !== "passed") {\n  return materializedCoreIdentityStatus;\n}\n` | `""` |
| `C-argument` | core | `await import(verifiedMaterializedV1CheckerUrl)` | `await import(materializedV1CheckerPath)` |
| `C-literal` | core | `await import(verifiedMaterializedV1CheckerUrl)` | `await import("file:///tmp/unverified.mjs")` |
| `C-two-sites` | core | `const evaluatedRuntimeImportEvidence = {` | `await import(verifiedMaterializedV1CheckerUrl);\nconst evaluatedRuntimeImportEvidence = {` |
| `C-helper-alias` | core | baseline末尾 | baseline末尾＋`const coreAlias = loadVerifiedMaterializedV1CheckerV001;\n` |
| `C-helper-assign` | core | baseline末尾 | baseline末尾＋`loadVerifiedMaterializedV1CheckerV001 = coreAlias;\n` |
| `C-redeclare` | core | baseline末尾 | baseline末尾＋`const verifiedMaterializedV1CheckerUrl = "file:///tmp/x.mjs";\n` |
| `C-parameter` | core | baseline末尾 | baseline末尾＋`const f = (verifiedMaterializedV1CheckerUrl) => verifiedMaterializedV1CheckerUrl;\n` |
| `C-inner-shadow` | core | baseline末尾 | baseline末尾＋`if (true) { const verifiedMaterializedV1CheckerUrl = "file:///tmp/x.mjs"; }\n` |
| `C-path` | core | `runRoot + "/v1/evals/clip_composition/check_approved_document_bindings_v001.mjs"` | `runRoot + "/../v1/evals/clip_composition/check_approved_document_bindings_v001.mjs"` |
| `C-no-guard` | core | `if (runtimeImportEvidence.status !== "passed") {\n  return {status: "failed", runtimeImportEvidence};\n}\n` | `""` |

S11の六sourceを次へ固定する。

| case | exact source | 期待 |
|---|---|---|
| `raw` | ``const x=`import require eval`;\n`` | passed |
| `escaped-expression` | ``const x=`\${eval}`;\n`` | passed |
| `regex` | `const x=/eval/;\n` | passed |
| `expression` | ``const x=`${eval("x")}`;\n`` | failed |
| `nested-expression` | ``const x=`${`raw ${getBuiltinModule}`}`;\n`` | failed |
| `hidden-dynamic` | ``const x=`${await import(verifiedMaterializedCoreUrl)}`;\n`` | failed |

S13の拒否sourceを次へ固定する。

`globalThis;\n`、`global;\n`、`Reflect;\n`、`process;\n`、`Object;\n`、
`const x=process;\n`、`const x=Object;\n`、
`const {env}=process;\n`、`const {keys}=Object;\n`、
`process?.env;\n`、`Object?.keys;\n`、
`process["env"];\n`、`Object["keys"];\n`、
`process.binding;\n`、`Object.getPrototypeOf;\n`、
`const process=1;\n`、`const Object=1;\n`、
`function f(process){return process;}\n`、
`function f(Object){return Object;}\n`。

#### 12.2.3 I020のreport・fatal対応

code 68専用reportは同じtest-role不正byte
`import "node:vm";\n`
で次を一件ずつ作る。

| subcase | phase | 件数・identity |
|---|---|---|
| `I020-R01` | `bootstrap-precommit-index` | index 5＋fixed-source v1＝6、ID null |
| `I020-R02` | `bootstrap-postcommit-head` | `"bootstrap-introduction-candidate-tree"` 5、ID null |
| `I020-R03` | `admission-precommit-index` | 同identity 5、ID `i020-admission-v001` |
| `I020-R04` | `admission-postcommit-head` | 同identity 5、同ID |
| `I020-R05` | `implementation-start` | 同identity 5、ID null |
| `I020-R06` | `formal-test-start` | 同identity 5、ID null |
| `I020-R07` | `completion-and-stable-tag` | 同identity 5、ID null |
| `I020-R08` | `bootstrap-mutation-prepare` | index 5、ID null |

R01〜R08はschema、field順、identitySource、sourceCommit、5／6件順、
file SHA、status、違反順、execution boundary、canonical末尾LF、stdout一object、
stderr 0、exit 1、report file 0をbyte比較する。
formal七件はmaterialized checker Node child 0、mutationはcore評価0。
materialize用Git childまで0とは主張しない。

`I020-N01`と`I020-N02`は既存正常passed reportと通常failed reportを元契約schemaで一件ずつbyte比較する。
`I020-F01`〜`F07`は既存F001〜F007の観測byteを再利用し、別fatal fixtureを作らない。

| subcase | fatalCode | exact phase／path |
|---|---|---|
| `I020-F01` | `USAGE` | `phase=null`, `path=null` |
| `I020-F02` | `GIT_ENVIRONMENT_OVERRIDE_PRESENT` | `phase="implementation-start"`, `path=null` |
| `I020-F03` | `GIT_IO_FAILED` | `phase="implementation-start"`, `path=null` |
| `I020-F04` | `HISTORY_UNREADABLE` | `phase="implementation-start"`, `path=null` |
| `I020-F05` | `ENVIRONMENT_UNAVAILABLE` | `phase="implementation-start"`, `path=null` |
| `I020-F06` | `TOOL_GRAPH_EXECUTION_FAILED` | `phase="bootstrap-precommit-index"`, path=`evals/clip_composition/test_approved_document_admission_ledger_v002.mjs` |
| `I020-F07` | `REPORT_WRITE_FAILED` | `phase="bootstrap-precommit-index"`, path=`evals/clip_composition/outputs/presentation/approved-document-admission-ledger-v002-bootstrap/precommit-index-report-v001.json` |

F06はbootstrap precommitのindex fixtureからtest pathのstage 0 entryだけを欠落させる。
F07は対応precommit reportの親directoryを読取専用にした既存F007入力をそのまま使う。
全fatalは元契約のfield順、stdout一object、stderr 0、exit 2を照合する。
§8.2のstdout write開始後の外部I/O非証明境界を、別の合格fatal JSONが観測できたと偽らない。

同じI020内の`I020-F06-context-01`〜`04`で、collectorへ渡す工程間入力を次の四形に一件ずつ変える。

1. `bootstrap-precommit-index`のexact contextへ未知field `extra:true`を追加。
2. 同phaseで`kind:"wrong"`。
3. 同phaseで`runtimeImportContext=null`。
4. `implementation-start`でbootstrap用exact contextを非nullのまま渡す。

四件ともfilesystem読取・snapshot・通常report 0件、
`TOOL_GRAPH_EXECUTION_FAILED`、入力の解釈済みphase、
固定v1 checker path、stdout一object、stderr 0、exit 2を期待する。
これはF006の統合subcaseでありfatal probe数も統合ID数も増やさない。

I018・I019・I020のsubcaseは各統合test IDの内訳であり、統合件数を増やさない。

### 12.3 新しいI025

`I025`はprocess固有の実一時Git repositoryを作り、productionと同じcollector・validatorを使って次の全subcaseを検査する。

1. legacy保護文書を非登録commitでbyte変更し、次commitで元byteへ復元。
   期待違反はcode 71の一行だけ、`admissionId=null`。
2. legacy保護文書を削除し、次commitで復元。
   期待違反はcode 71の一行だけ、`admissionId=null`。
3. mode `100644`のlegacy通常fileをmode `120000`のsymlinkへtype changeし、次commitで通常fileへ復元。
   期待違反はcode 71の一行だけ、`admissionId=null`。
4. 別pathのrevision登録commitでlegacy保護文書を便乗変更し、後続commitで復元。
   期待違反は固定code順で
   `POSTCOMMIT_PATH_SET_MISMATCH`、
   `APPROVED_DOCUMENT_IDENTITY_TRANSITION_INVALID`
   の二行。
5. 正規revision commitの旧identity、新identity、同pathのexact `M`一件。
   期待違反は空array。
6. approval recordを非登録commitで変更し、次commitで復元。
   期待違反はcode 71の一行だけで、`admissionId`はそのapproval recordを登録した非null ID。
7. tree identity不変なのに同pathのdiff recordを持つcarrier不整合。
   期待違反はcode 71の一行だけ。
8. tree identityが変化したのに同pathのdiff recordが0件、または二件あるcarrier不整合。
   各入力の期待違反はcode 71の一行だけ。

I025.7／I025.8は、同じproduction collectorで得た正常snapshot `S0`をseedとし、
subcaseごとにfresh deep cloneして使う。
`S0`はproduction validatorで`violations=[]`であることをmutation前提条件とする。
履歴末尾を次へ固定する。

- `R`: 正常な`approved-document-revision`登録commit。
- `U1`: `R`の単一親・非登録child。ledger byteは同一で、保護path外のfixture pathだけを変更。
- `U2`: `U1`の単一親・非登録child。同じく別fixture pathだけを変更。snapshot anchorは`U2`。
- `p`: `R`で改訂した保護path。
- `r`: `R`のrevision `admissionId`。
- `u`: `p`をstrict UTF-8 encodeしたbyte。
- `oldOid`: `R`の親にある`p`のblob OID。
- `newOid`: `R`、`U1`、`U2`にある`p`のblob OID。

mutation前に、`oldOid !== newOid`、対象modeは全て`100644`、
両OIDが`blobTable`に各exact一件、`R→U1`と`U1→U2`のdiffに
`pathBytes=u`が0件、各commitの`treePathRecords`に`p`がexact一件であることをassertする。
不成立ならfixture構築失敗として停止し、期待値を動かさない。

| subcase | `S0`から変える値 | exact期待 |
|---|---|---|
| `I025.7` | `R→U1`のrecordsへ`{status:"M",pathBytes:u}`をraw byte順の唯一位置へ一件追加。tree recordsは不変 | code 71、`admissionId=r`、`path=p`の一行 |
| `I025.8a` | `(U1,p)`のblobだけ`newOid`→`oldOid`。diffは0件のまま | 二辺でidentity変化＋diff 0。上と同じ一行 |
| `I025.8b` | fresh `S0`で同じblob変更。`R→U1`と`U1→U2`の各recordsへ同じM recordをexact二件ずつ連続挿入 | 二辺でidentity変化＋diff 2。上と同じ一行 |

U1／U2は非登録commitなので`POSTCOMMIT_PATH_SET_MISMATCH`を併発しない。
二辺が不正でもpath単位にcode 71一行へ集約する。
この三入力は上記carrier値だけを変え、追加Git／filesystem I/O、別collector、別validatorを作らない。
8a／8bはI025内部subcaseであり正式件数を増やさない。

同じsubcase内で変更と復元が複数回あっても、§11.1どおりpath単位に一行へ集約する。
1〜6は実Git repositoryをproduction collectorで収集する。
7〜8はその正常収集snapshotを基準に、上の表で列挙した
`firstParentDiffs`／`treePathRecords`の対象値だけをtest fixtureとして変え、
production validatorのcarrier相互整合を検査する。
別collectorや履歴判定をtest内へ作らない。
fixture専用の履歴判定、別collector、現在worktreeだけを見るshortcutを作らない。

tree／gitlink型は§10で正式に拒否可能だが、I025の実Git type-change代表は、blob carrierと実媒体を閉じられるregular file→symlinkへ固定する。
tree／gitlinkで収集不能な値を捏造して検査数を増やさない。

### 12.4 正式件数

| 区分 | 件数 |
|---|---:|
| 違反probe | 71 |
| fatal probe | 7 |
| 統合fixture | 25 |
| 新規正式検査合計 | **103** |
| 既存v001回帰 | 6/6、上の103へ含めない |

101、102、104等の別件数を実装者判断で採用しない。
表外検査が必要になった場合は契約改訂へ戻す。

## 13. 完了条件の改訂

元契約§13.3の完了条件を次へ読み替える。

1. v001 6/6。
2. v001→v002 legacy 6/6の全identity一致。
3. V001〜V071の全code発火とexport集合完全一致。
4. F001〜F007合格。
5. I001〜I025合格。
6. I019で単一production scannerを通した全構文・全role subcaseが成立。
7. I025で変更・削除・type change・復元、approval record改変、tree/diff carrier不整合を検出し、正規revisionだけを許可。
8. `bootstrap-precommit-index`合格。
9. 単一親bootstrap commit作成。
10. `bootstrap-postcommit-head`合格。
11. 3 IDの登録commit再導出がbootstrap commitへ一致。
12. 12文書の既存provenance別照合合格。
13. v002 `implementation-start`合格。

一件でも不成立なら同attemptで修正・期待値変更・再commitせず停止する。

## 14. 実装契約完全性チェック

| 項目 | 判定 | 根拠 |
|---|---|---|
| 本来の目的 | 閉じた | 評価前import拒否と承認文書履歴連続性 |
| scanner由来 | 閉じた | commit、path、blob、file/block SHA、関数を§4.1で固定 |
| scanner実体数 | 閉じた | bootstrap runner内の一つ。第6実体なし |
| bootstrap main guard | 閉じた | absolute `argv[1]`と`import.meta.filename`の文字列完全一致。named import時I/O 0、§4.3・§5.6 |
| raw import正規表現の不採用 | 閉じた | §4.2 |
| scanner返値 | 閉じた | `status`とraw byte SHA-256だけをpure production入口から返し、内部token表現を成果物契約へ露出しない、§4.2 |
| scanner byte ownership | 閉じた | 任意offsetのUint8Array viewを所有Bufferへ一回copyし、hash・decode・由来scannerが同じbyteだけを読む、§4.2 |
| scanner→report写像 | 閉じた | source metadata四field＋pure返値二fieldを表順の同一arrayへ写す、§4.3・§8.1 |
| source byte・hashbang | 閉じた | §5.1 |
| static import grammar | 閉じた | §5.2 |
| re-export | 閉じた | local named exportだけ許し、default／named-from／star-fromを拒否、§5.3 |
| bootstrap export集合 | 閉じた | 単一local export listの四bindingだけを許し、欠落・余分・別順をS16で拒否、§5.3・§12.2.2 |
| dynamic import | 閉じた | role別二siteだけ、§5.4 |
| require | 閉じた | 全拒否、§5.5 |
| import.meta | 閉じた | role×member、§5.6 |
| comment/string/template/regex | 閉じた | mode別、template式だけ再走査、§5.7 |
| 文字列code・反射的module取得 | 閉じた／限界宣言 | 固定実装で使わない入口を§5.8で拒否。任意計算propertyまでの意味論sandboxとは主張しない |
| role別specifier | 閉じた | raw literal allowlist、§6 |
| 評価前入口 | 閉じた | 七phaseはlauncher→全scan→child、bootstrap mutationは固定5 scan→core URL再束縛→一回import、§7.2・§7.4 |
| scanner不合格の所有 | 閉じた | code 68と67の境界、§7.1 |
| pre-child report | 閉じた | schema、順、stdout、exit、非保存を§8で固定 |
| pre-child sourceCommit | 閉じた | candidate commit OIDを記録し、materialize元tree OIDと混同しない、§8.1 |
| v1評価前carrier | 閉じた | collector 5-field入力、22-field snapshot、17-field evidence、現在blob OIDを同じraw byteから再導出、binding／baseline truth table、§6.1・§7.5 |
| v1不存在・I/O所有 | 閉じた | 初回lstatのENOENT／ENOTDIRはcode 68、表外lstat errorとopen後I/O errorはfatal、§6.1 |
| 不正runtime import context | 閉じた | phase不正はUSAGE、それ以外は固定v1 pathのTOOL_GRAPH_EXECUTION_FAILED、I020内四fixture、§6.1・§12.2.3 |
| bootstrap mutation環境fatal | 閉じた | Git選択環境、Node注入環境、13／11 key child env、phase/pathを値レベル固定、§7.4 |
| code 68識別子の二箇所保持 | 閉じた | scanner logicは一つ、launcher literalとcore exportはV068・I019で完全一致 |
| bootstrap循環 | 境界を宣言 | worktree launcherの起動成立は運用信頼根。起動不能時のcode 68自己報告は保証しない、§3.2・§7.1 |
| v1 checker | 閉じた | 固定identity、role allowlist、評価前scan、固定path／URL導出、限定dynamic import、通常report carrier |
| toolGraph件数 | 閉じた | 5件不変 |
| 保護対象 | 閉じた | 種別・開始commit・ownerを§9.1で固定 |
| 有効identity map | 閉じた | §9.2 |
| 許可revision遷移 | 閉じた | 九条件、tree identity／diff exact対応、§9.3 |
| 非登録変更・削除・type change・復元 | 閉じた | code 71、approval recordを含む、§9.3・§11 |
| 履歴入力 | 閉じた | 履歴観測carrierはfirstParentDiffs／treePathRecordsだけ。保護・revision制御mapはstrict ledgerから既存導出、§9.2・§9.4 |
| 履歴carrier相互整合 | 閉じた | identity不変=diff 0、正規revision=exact M一件、それ以外はcode 71 |
| 非blob carrier | 閉じた | modeとnull規則、§10 |
| 違反code採番 | 閉じた | 1〜70不変、71末尾追加 |
| reportのowner選択・重複抑制 | 閉じた | §11.1 |
| 検査一件表 | 閉じた | V071、I003、I018〜I020、I024、I025 |
| scanner fixture byte | 閉じた | S01〜S17のraw byte、role、baseline mutation、wrapperを§12.2.2で固定 |
| 件数閉包 | 閉じた | 71＋7＋25＝103 |
| bootstrap文書・pair・path件数 | 閉じた | 12・3・10を維持 |
| 本追補自身の自己適用 | 境界を宣言 | bootstrap外、DECISIONS正本、§2.3 |
| 履歴collector I/O | 追加なし | code 71は既存`firstParentDiffs`／`treePathRecords`だけ。v1は既存materialized実体の評価前読取をtyped carrier化 |
| 後方互換 | 禁止を確認 | v001 scanner/reportへのfallbackなし |
| 実装・検査停止点 | 閉じた | 本追補承認前は実装しない。不成立時は停止 |

### 14.1 値レベル閉包

- toolGraph role／path:
  元契約§6.3.1の5件で固定。
- scanner由来byte:
  §4.1で固定。
- scanner受理構文:
  §5で固定。
- scanner返値・内部context・禁止入口:
  §4.2・§5.8で固定。
- role別specifier:
  §6で固定。
- dynamic importのpath／URL導出と実行直前identity:
  §5.4で固定。
- collector引数、snapshot、17-field v1 binding evidence／baseline組合せ:
  §6.1・§7.5で固定。
- formal七phaseとbootstrap mutationの評価前順序:
  §7.2・§7.4で固定。
- pre-child report field、順、値域:
  §8で固定。
- 保護対象の時間状態:
  §9で固定。
- treePathRecordsのnull／mode意味:
  §10で固定。
- 新code名・番号:
  §11で固定。
- test ID・総数:
  §12で固定。

### 14.2 A/B/C地雷探知

- A（契約から一意に導出済み）:
  上表の全項目。scanner構文、評価前入口、code 68 report、履歴状態機械、code 71、103件を含む。
- B（人間判断が必要）:
  本追補を承認するか差し戻すかの1件だけ。
  本文内部の追加選択は0件。
- C（実測時に確定）:
  将来実装される5実体のmode・blob・byte数・SHA-256、
  bootstrap jobのbaseCommit、
  materialize runごとの一時pathとscan対象SHA、
  first-parent各commitの実OID・mode・blob、
  precommit report SHA、
  bootstrap commit OID。

Cは取得入口、値域、比較、停止条件が固定済みであり、設計の穴ではない。
独自の仮値で埋めない。

### 14.3 同じ監査パスの追加確認結果

次を同じ追補内で閉じた。

1. scannerをlauncherへ置くと、元契約の「launcherはfailed reportを作らない」と衝突する点。
2. code 68をchildへ所有させると、不正moduleを先に評価してしまう点。
3. v1 checkerの固定外importと`import.meta.url`を同じscannerで扱う必要。
4. dynamic importを全拒否すると、固定v1 checkerのexport関数をtemp pathから呼べない点。
5. `treePathRecords.gitBlobObjectId`だけではtree／gitlinkのtype changeをblobとして表せない点。
6. 本追補自身がbootstrap 12文書の外にある自己適用限界。
7. outer launcher自身が起動不能ならcode 68を自己報告できない信頼根境界。
8. string内へ隠したloader、`eval`、反射的module取得でstatic graphを迂回できる入口。
9. dynamic importの許可identifierだけでは、実行時URLの導出・shadowing・直前identityを一意にできない点。
10. bootstrap mutationがformal七phaseとは別にcoreを評価する経路。
11. scanner内部token表現を成果物契約へ露出すると検査不能になるため、
    pure production入口の合否とraw byte SHAだけを正本にし、I019で実際の受理／拒否を直接検査する点。
12. tree identityとdiff carrierが食い違っても、片方だけでは履歴改変を隠せる点。
13. legacy mapのbootstrap前導出とapproval record永続保護の根拠。
14. v1 checkerのscan合格後にcoreへ渡す評価前identity結果がtyped carrierなしではcode 68／39へ一意に帰属できない点。
15. candidate treeを真の導入commitと過大表示しないidentitySourceと、formal／mutationで異なる実行停止境界。
16. 検査内訳を要約だけにすると実装者が代表caseへ縮められるため、V068・I018〜I020・I025の値レベルsubcaseを固定する点。
17. `realpath`を使うCLI guardではnamed importだけでもfilesystem I/Oが発生するため、absolute `argv[1]`と`import.meta.filename`の文字列完全一致へ固定する点。
18. v1の期待blobをcarrierへ載せるだけでは現在実体を照合できないため、同じraw byteからobserved Git blob OIDを再導出する点。
19. 初回不存在と読取途中I/O例外、不正runtime import context、bootstrap mutationの環境不成立を同じfatalへ曖昧に畳まない点。
20. scanner検査をカテゴリ名だけで残すとfixture生成者が別byteを選べるため、S01〜S17のrole、raw byte、mutation前後を値レベルで固定する点。
21. 由来scannerがBufferを要求する一方で公開入口がUint8Arrayだったため、任意view範囲を所有Bufferへ一回copyする入口を固定する点。
22. pure scanner二fieldとreport六fieldの間に別写像を作れたため、metadata四fieldとの同順結合を単一orchestrationへ固定する点。
23. `sourceCommit`へ候補tree OIDを入れる誤読を防ぎ、materialize元の候補commit OIDを記録する点。
24. 四bindingをimportできても余分なexportを否定できないため、bootstrap roleのexport集合自体をscannerでexact検査する点。

これらを別イベントへ分割せず、入口、report、carrier、保証境界まで本追補で確定した。
提示前の監査で、これ以外に実装者判断を要する未固定は見つからなかった。

## 15. 撤退条件との関係

- 本追補の起草は、停止イベント1件目の同じ監査パスを閉じる作業である。
- 本追補の内容を追加の停止イベントへ数えない。
- 本追補が承認され、次の実装前監査または実装で**別の人間判断を要する独立停止**が起きた場合、それが2件目である。
- 2件目では追加patchや3件目の掘削を行わず、
  「どの文書へ台帳束縛が必要か」の範囲問題としてkawafmmへ戻し、スケルトン設計へ接続する。
- 同じ入力で観測できる検査不合格を細分化して停止件数を水増ししない。

## 16. 承認後に再開できる範囲

本追補の提示だけでは実装へ進まない。

人間が本追補を承認した場合に限り、元の承認済み追補§17の範囲を、次の改訂込みで再開できる。

1. v002 schema、台帳、core、checker、bootstrap runner、admission runner、test。
2. 本追補で固定した単一scannerとcode 68専用pre-child report。
3. code 71と履歴状態機械。
4. V001〜V071、F001〜F007、I001〜I025。
5. 既存6件のbyte同一移行。
6. 人間承認記録3件の版付き保存。
7. bootstrap commit前後検査。
8. 完了または停止報告。

B5設計、B5実装、token計測、費用計算、API通信、Gemini実走は含まない。

## 17. 承認依頼文

> `approved-document-admission-ledger-v002`実装前preflight閉包契約追補v001を承認する。import範囲検査はcommit `2173b5550da76fcb7b47bfb333b597e302e47b02`の既存字句scannerを由来正本とし、toolGraphを5件のまま、bootstrap runner内の単一scannerで固定5実体とbootstrap時のv1 checkerをmodule評価前に検査する。静的import、re-export、dynamic import、require、import.meta、comment・文字列・template・正規表現・hashbang、文字列code・列挙済み反射的module取得、role別specifier、code 67／68の所有を本追補どおり固定する。scanner不合格とbootstrap mutationのcore直前束縛不一致だけはlauncherが専用pre-child failed reportをexit 1で出し、core起動後のv1直前束縛不一致は22-field snapshotの17-field typed evidenceから通常report code 68として出す。作業ツリー上のlauncher自身の起動成立とscan後からimportまでの連続filesystem不変は既存のbootstrap信頼根であり、過大証明しない。承認済み文書identityは保護開始後の全first-parent隣接commitで追跡し、当該pathの正規revision登録commit以外の変更・削除・type change・復元、およびtree identity／diff carrier不整合を新code 71 `APPROVED_DOCUMENT_IDENTITY_TRANSITION_INVALID`で拒否する。履歴観測carrierは既存`firstParentDiffs`・`treePathRecords`だけとし、保護・revision制御mapはstrict ledgerから既存処理で導出し、collectorへ新しいGit・filesystem I/Oを加えない。正式検査は違反71件・fatal 7件・統合25件の103件とし、toolGraph 5件、bootstrap path 10件、文書12件、pair 3件、legacy 6件は変えない。本承認後は元追補§17の実装範囲だけを再開し、B5設計、B5実装、token計測、API通信、Gemini実走は含めない。次の独立停止は2件目として撤退条件を適用する。
