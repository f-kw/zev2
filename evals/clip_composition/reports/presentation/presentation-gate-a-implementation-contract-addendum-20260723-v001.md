# ゲートA 実装契約追補 v001

- 作成日: 2026-07-23
- 状態: **設計提示。人間承認待ち。未実装・未実走**
- 追補先: `presentation-candidate13-caption-resolution-pair-generation-design-20260722-v001.md`
- 起草根拠: 2026-07-23の夜間停止報告と、kawafmmによる追補起草承認
- 人間作業: 本追補の承認1判断。媒体視聴なし。時間計測なし

## 1. 目的と停止点

本追補は、ゲートAの承認後に実装可能性監査で見つかった未固定9項目と、元設計§11.3/§15の範囲矛盾を解消する。

目的は、実装者がfield、採番、anchor、違反コード、実行環境、CLI、入出力を独自判断せず、同じ契約から一意にコードへ移せる状態を作ることである。自然な語の切れ目、意味の読めるテロップ単位、配置、描画をゲートAで合格認定するものではない。

今回行うのは本設計書の提示と`DECISIONS.md`への工程教訓の追記だけである。次は本追補の人間承認待ちで停止する。次のものはまだ行わない。

- 機械境界証拠generator・checker・runnerの実装。
- 合成testdata、candidate 13 preflight jobの作成。
- 読み取り専用preflight、正式成果物生成、Gemini実走、指示書生成、描画。
- 追補先の承認済み本文の直接編集。

## 2. 承認済み設計との関係と上書き範囲

本追補は新規文書として提示する。**本追補がkawafmmに承認された時点でのみ**、追補先v001の次の記述を記録付きで上書きする。承認前は追補先を変更しない。

| 追補先 | 現在の記述 | 本追補による一意化 |
|---|---|---|
| §5.1 | schema名と概念項目だけ | 本書§3〜§7のfield-level契約、採番、anchor、実行環境、hashを適用 |
| §10.1 | generator・checker・read-only runner | generatorとcheckerを同一core fileの別export、runnerを別fileとし、本書§8のjobと§10のCLIを含む二実装file・三責務として固定 |
| §11冒頭 | §11.2〜11.3はゲートB | §11.2は全てゲートBのまま。§11.3も列挙済みのv003・配置・正式job検査は全てゲートBのまま。ゲートA自身のCLI 0/1/2とread-only検査だけは、本書§9〜§11の独立契約でゲートAへ含める |
| §11.1 | ゲートA検査項目の概念列挙 | 本書§9の固定違反コードと§11の合成検査へ具体化 |
| §12 | candidate 13の期待投影 | 本書§8.4のpreflight job固有値としてのみ固定 |
| §15 第1項 | 全違反コードの発火確認 | 本書§9の**ゲートA専用35コードだけ**を意味する。ゲートBのコードは含めない |
| §15 第3項 | CLI終了コード | 本書§10のゲートA read-only runnerの0/1/2だけを意味する。ゲートB正式jobの終了コードではない |

この上書きはゲートAの実装契約を完全化するための改訂であり、ゲートB、v003契約、正式成果物、Gemini、描画の承認範囲を広げない。追補承認後も、追補先v001の既存本文は履歴としてそのまま保持し、実装時は「追補先v001＋本追補v001」を一組の正本とする。

ただし、元設計だけを読んだ実装者が旧条項を正本と誤認しないよう、**本追補が承認された後の承認処理**では、追補先v001の改訂履歴へ次の案内だけを追記する。この案内追記は本追補の承認に含め、承認前には行わない。

- 追補のrepository相対path。
- 本表の上書き対象節。
- 追補承認日と承認者。
- 「実装時は元設計v001と承認済み追補v001を一組で読む」という一文。

元設計の設計本文を黙って書き換えたり、履歴案内だけで追補の内容を要約し直したりしない。

## 3. 機械境界証拠の厳密schema

schema名は`presentation-segmenter-boundary-evidence-v001`とする。全objectは、明示したfieldだけを許す。必須fieldの欠落、型違い、未知fieldを拒否する。配列順は意味を持ち、並べ替えない。

### 3.1 top-level

許可fieldは次の9個だけで、全て必須とする。

```json
{
  "schemaVersion": "presentation-segmenter-boundary-evidence-v001",
  "artifactId": "non-empty-string",
  "generatorVersion": "presentation-segmenter-boundary-evidence-generator-v001",
  "sourceBinding": {},
  "runtimeBinding": {},
  "segmentationPolicy": {},
  "boundaryCandidates": [],
  "boundaryCandidatesCanonicalSha256": "64-char-lowercase-hex",
  "sourceAtomMembershipCanonicalSha256": "64-char-lowercase-hex"
}
```

`artifactId`はjobが与える非空文字列であり、candidate番号や件数をschemaへ埋め込まない。

本書で使う違反`path`はchecker contextをrootとするnon-empty JSONPath stringとし、次の決定規則だけで組み立てる。context全体は`$`。既知property名が`^[A-Za-z_][A-Za-z0-9_]*$`なら`.property`、それ以外のproperty名は`[`＋`JSON.stringify(propertyName)`＋`]`、配列indexは0始まり10進数の`[index]`を親pathへ連結する。先頭0、locale変換、atom IDやfilesystem pathの埋め込み、別記法を許さない。codeごとのpath選択は§9.3で固定する。

### 3.2 `sourceBinding`

許可fieldは次の8個だけで、全て必須とする。

```json
{
  "sourceArtifactId": "non-empty-string",
  "sourceArtifactPath": "workspace-relative-path",
  "sourceArtifactFileSha256": "64-char-lowercase-hex",
  "sourceArtifactCanonicalSha256": "64-char-lowercase-hex",
  "sourceRef": "non-empty-string",
  "sourceProvenance": "non-empty-string",
  "atomGranularity": "character-timestamp",
  "rawSourceAtomsCanonicalSha256": "64-char-lowercase-hex"
}
```

`sourceArtifactPath`はworkspace相対の`/`区切りで記録する。実体は同じopen file handleからhash・parseし、symbolic link、workspace外、祖先差し替えを拒否する。

### 3.3 `runtimeBinding`

許可fieldは次の6個だけで、全て必須とする。

```json
{
  "nodeBinarySha256": "64-char-lowercase-hex",
  "nodeVersion": "non-empty-string",
  "icuVersion": "non-empty-string",
  "resolvedLocale": "ja",
  "resolvedGranularity": "word",
  "diagnostics": {
    "resolvedNodePath": "absolute-path",
    "platform": "non-empty-string",
    "arch": "non-empty-string",
    "v8Version": "non-empty-string",
    "unicodeVersion": "non-empty-string",
    "cldrVersion": "non-empty-string"
  }
}
```

合否へ使うのは`nodeBinarySha256`、`nodeVersion`、`icuVersion`、`resolvedLocale`、`resolvedGranularity`の5項目である。`diagnostics`の6項目は来歴記録であり、**pathだけが異なり同じNode実体hash・版・ICUを使う場合は不合格にしない**。反対に、pathが同じでもbinary hashが違えば不合格とする。

### 3.4 `segmentationPolicy`

許可fieldは次の8個だけで、値も固定する。

```json
{
  "policyVersion": "presentation-segmenter-boundary-policy-v001",
  "engine": "Intl.Segmenter",
  "locale": "ja",
  "granularity": "word",
  "indexUnit": "utf16-code-unit",
  "containerRule": "maximal-contiguous-run-by-timeline-segment-and-speech-v001",
  "candidateIdRule": "source-order-six-digit-v001",
  "unicodeNormalization": "none"
}
```

### 3.5 `boundaryCandidates[]`

候補objectの許可fieldは次の12個だけで、全て必須とする。

```json
{
  "boundaryCandidateId": "segmenter-boundary-000001",
  "containerId": "segmenter-container-000001",
  "timelineSegmentId": "non-empty-string",
  "speechId": 1,
  "sourceAtomIds": ["opaque-atom-id"],
  "text": "non-empty-string",
  "startAnchor": {"atomId": "opaque-atom-id", "edge": "start"},
  "endAnchor": {"atomId": "opaque-atom-id", "edge": "end"},
  "segmenterIndexUtf16": 0,
  "segmenterLengthUtf16": 1,
  "isWordLike": true,
  "sourceAtomCount": 1
}
```

- `speechId`はsource atomに保存された整数をそのまま使う。
- `sourceAtomIds`は1件以上で、元配列上の連続sliceでなければならない。
- `sourceAtomCount`は`sourceAtomIds.length`と厳密一致する。
- `text`は`sourceAtomIds`が指す本文を元順にUnicode正規化なしで厳密連結した値とする。
- anchorは既存caption契約と同じexact shapeとし、開始は先頭atomの`start`、終了は末尾atomの`end`を指す。生msを複製しない。
- `segmenterIndexUtf16`と`segmenterLengthUtf16`は0以上／1以上の整数で、container本文内のUTF-16 code unit位置を表す。
- `Intl.Segmenter`の種別は、実APIが返す`isWordLike`を同名のbooleanで保存する。独自の`kind`文字列へ翻訳しない。`false`も捨てない。
- 単一の`speaker`を置かない。raw話者証拠は`sourceAtomIds`から元atomへ戻って確認する。多数決、`unknown`の既知話者化、話者値による語途中分割を行わない。
- raw source atomの`speaker`はoptionalとし、存在する場合はnon-empty stringまたは`null`だけを許す。field省略もraw話者値の集計時は`null`へ写す。空文字、数値、boolean、object、arrayは`SOURCE_ATOM_CONTRACT_INVALID`とする。既存retained-source-atoms validatorがspeaker値型を検査していないため、本coreがこの追加契約を担当する。

各containerについて、`Intl.Segmenter`の返却列と保存候補列を次の全条件で一対一照合する。

1. 返却列・保存列の件数が一致する。
2. 先頭候補の`segmenterIndexUtf16`は0。
3. 隣接候補は`前.index + 前.length === 次.index`で隙間も重なりもない。
4. 最終候補の`index + length`はcontainer本文のUTF-16 code unit長と一致する。
5. 各候補の`text`は`containerText.slice(index, index + length)`と厳密一致する。
6. 各位置の`index`、`segment`、`isWordLike`はSegmenterが返した同位置の値と厳密一致する。
7. 候補が指すatom列のUTF-16範囲は当該`index/length`と厳密一致する。

候補ID、container ID、anchor、上記位置写像を含む候補objectのshapeが一つでも不成立なら、後段で推測補完せず§9の専用違反コードで停止する。

### 3.6 hashの定義

- `boundaryCandidatesCanonicalSha256`: `boundaryCandidates`配列全体を既存`canonicalJsonV001`と同じ規則（object keyを再帰sort、配列順保持、Unicode正規化なし）でSHA-256化する。
- `sourceAtomMembershipCanonicalSha256`: `boundaryCandidates`を同じ順で`[{boundaryCandidateId, sourceAtomIds}]`へ射影し、同じcanonical規則でSHA-256化する。
- preflight reportの`evidence.canonicalSha256`: **完成したevidence top-level object全体**を同じcanonical規則でSHA-256化する。evidence object自身にはこの全体hash fieldを持たないため循環はない。内部の上記2 hashも全体hashの入力へ含む。
- evidenceの正式serialize byteは、generatorが§3で宣言したfield順に構築した実objectへ`JSON.stringify(evidence, null, 2) + "\n"`を一度だけ適用したUTF-8 byteとする。serializerがfieldをsort・再構築したり、parse後にcanonical化したりしない。二つのobjectが意味上同じでもfield挿入順が違えばserialize byteは異なるため、生成順の非決定性を検出できる。
- JSON fileのbyte hashは、objectのcanonical hashと別物として扱う。将来正式保存する場合も上記serialize byteをそのまま使うが、ゲートA preflightでは保存しない。

## 4. 決定的な生成規則

1. 元順の唯一の正本は`rawSourceAtoms`配列順とする。atom IDはopaque文字列であり、末尾数値を順序・連続性の判定に使わない。
2. timeline segment所属は`selection.segments[].atomIds`から取得し、時刻から再推定しない。各atomはちょうど一つのsegmentへ属さなければならない。
3. speech所属は各atomの保存済み`speechId`を使う。
4. containerは、同一`timelineSegmentId`かつ同一`speechId`が`rawSourceAtoms`配列上で続く**最大連続run**とする。同じ組合せが後で再登場しても結合しない。
5. container IDは元順の1始まり全体通番で`segmenter-container-`＋6桁以上の10進数とする。1件目は`segmenter-container-000001`。6桁を超えた場合は切り詰めない。
6. 各container本文だけを`new Intl.Segmenter('ja', {granularity: 'word'})`へ渡す。containerをまたいで連結しない。
7. boundary candidate IDは全containerを通した元順の1始まり全体通番で`segmenter-boundary-`＋6桁以上の10進数とする。1件目は`segmenter-boundary-000001`。
8. SegmenterのUTF-16開始・終了がatom境界に一致しない場合は救済せず停止する。surrogate pairや結合文字を1 code unitと仮定しない。
9. 各atomは候補一件へ一度だけ所属する。欠落、重複、元順逆転、非連続slice、segmentまたぎ、speechまたぎを停止条件にする。
10. source atom同士の正の時刻重なりは既存契約どおり拒否せず、`observedProjection.sourcePositiveOverlapCount`とpreflight reportへだけ観測件数を残す。evidence schemaへ観測fieldは追加しない。件数は全source atomの順不同ペア`(i,j), i < j`のうち、`max(startMs_i,startMs_j) < min(endMs_i,endMs_j)`を満たすペア数とする。同時刻での境界接触は数えない。各atom自身の`startMs >= endMs`、または配列上で後のatomの`startMs`が前のatomより小さくなる場合だけ時刻不成立とする。文字列順を時刻から並べ替えない。
11. 本文の修正、空白・句読点除去、Unicode正規化、時刻生成、話者推定、自然な語境界の認定を行わない。

## 5. check reportの厳密schema

checkerの返却schemaは`presentation-segmenter-boundary-check-report-v001`とする。top-levelは次の6 fieldだけを許し、全て必須とする。

```json
{
  "schemaVersion": "presentation-segmenter-boundary-check-report-v001",
  "status": "passed",
  "artifactId": "non-empty-string-or-null",
  "checks": [],
  "observedProjection": {},
  "violations": []
}
```

- `status`は`passed`または`failed`。10 checkが全てpassedの場合だけpassed、一件でもfailedまたはnot_runがあればfailed。
- `artifactId`は`segmentation`がpassedした場合だけevidenceのartifact IDを持ち、それ以外は`null`。shapeだけ作れた不合格evidenceのIDを正本として残さない。
- `checks`は本書§9.1の10件を同じ固定順で持つ配列。各項目は`{name, status, violationCodes}`の3 fieldだけ。nameは各位置の固定check名、statusは`passed / failed / not_run_with_upstream_failure`とする。`violationCodes`は当該checkの`violations[]`に1件以上あるcodeを**重複なしで一度だけ**、§9の固定code順に並べる。個別違反が同codeで複数件あってもcode文字列を重複掲載しない。object key順へcheck順を埋め込まない。
- `observedProjection`は`segmentation`と`coverage`がともにpassedし、§8.2の全項目を作れた場合だけ`expectedProjection`と同じexact shapeで実測値を持つ。それ以外は`null`。`expectedProjection`との値不一致だけなら実測値を保持する。
- `violations[]`は`{code, path, details}`の3 fieldだけ。v001の`details`は常にexact empty object `{}`とし、keyを追加しない。診断位置は§9.3の`path`だけで表す。将来detailsを増やす場合はcodeごとのexact schemaを固定した契約改訂を要し、実装都合で任意message・時刻・PID・一時path・絶対path・stack・OS依存errorを入れない。

違反順は、(1) §9のcode固定順、(2) `path`のUTF-16 code unit順とする。locale依存sort、検出非同期順、object列挙順へ依存しない。同じcode・同じpathに複数の不成立条件が集まっても`violations[]`は一件だけを出し、異なるpathの同codeは各一件を出す。この集約単位を実装者判断で変えない。

### 5.1 coreの公開入口とchecker入力

新規core fileは次の二つの関数、§9のcheck名・違反code固定配列、実際にloadされたmodule URLを渡す来歴objectだけをexportする。checkerを別fileへ分けない。

来歴objectは`PRESENTATION_SEGMENTER_BOUNDARY_MODULE_URLS_V001`というfreeze済み`{core, retainedSourceAtomsCore}`とする。`core`は新規core自身の`import.meta.url`、`retainedSourceAtomsCore`は既存coreがexport済みの`PRESENTATION_RETAINED_SOURCE_ATOMS_MODULE_URL`原文を再掲する。runnerはこのobjectとrunner自身の`import.meta.url`から、§5.1の`loadedModuleUrl` 3件を作る。pathを静的文字列から再構築して「実際にloadしたURL」と呼ばない。

1. `buildPresentationSegmenterBoundaryEvidenceV001({artifactId, sourceArtifact, sourceArtifactSnapshot, runtimeBinding})`
   - `artifactId`は§3.1の規則を満たす文字列。
   - `sourceArtifact`は、同じ実byteからparse済みの`presentation-retained-source-atoms-v001` object。
   - `sourceArtifactSnapshot`は`{path, fileSha256}`の2 fieldだけ。pathは検査済みworkspace相対path、hashは`sourceArtifact`をparseした同じbyte bufferのSHA-256。
   - `runtimeBinding`は§3.3のexact object。
   - 返値は§3のevidence object。`sourceBinding`は、artifact ID・source ref・provenance・粒度・raw hashを`sourceArtifact`から、path・file hashを`snapshot`から取り、source artifact canonical hashだけを同じobjectから再計算して組み立てる。file I/Oは行わない。
2. `checkPresentationSegmenterBoundaryPreflightV001(context)`
   - 返値は§5のcheck report。
   - `context`は次の9 fieldだけを持つin-memory objectで、全field必須。永続化schemaではないが、実装・合成testとも同じ入口を使う。

| field | exact meaning |
|---|---|
| `jobValue` | parse済みjobの任意JSON value。schema不成立もcheckerが受けて`JOB_INVALID`へする |
| `jobSnapshot` | `{path, firstFileSha256, secondFileSha256, issues}`。issuesは下記固定語彙・固定順 |
| `observedImplementationBinding` | `{files}`。filesは§8.1の固定順3件で`{role,path,firstFileSha256,secondFileSha256,loadedModuleUrl,issues}` |
| `inputSnapshots` | §8.1の固定順3件。各項目は`{role,path,firstFileSha256,secondFileSha256,document,issues}` |
| `runtimeBinding` | §3.3のobserved exact object。取得不能時だけ`null` |
| `evidencePasses` | `[firstEvidence, secondEvidence]`の固定長2配列。各non-null要素は任意JSON valueとしてcheckerが受け、schema不成立も検査する。生成不能passは`null` |
| `buildFailure` | 正常時`null`。生成例外時だけ`{pass,kind}`。passは`1 / 2`、kindは`segmenter_exception / unexpected_exception` |
| `readOnlyGuard` | 安全な監視pathを確立できた場合は§8.1のexact 4-field object、確立不能時は`null` |
| `productionMode` | production runnerでは必ず`true`。合成testの改変evidence注入時だけ`false` |

context top-levelの未知field・必須field欠落、9 field自体の大分類型不成立、`productionMode`がbooleanでない状態は、入力成果物の契約違反ではなくchecker呼出側の実装不成立である。checkerは固定名`SegmenterBoundaryInternalContextError`をthrowし、production runnerはexit 2の`SEGMENTER_BOUNDARY_CLI_INTERNAL_REPORT_INVALID`へだけ正規化する。35違反codeのreportを推測生成しない。各field内部の不成立は、以下の担当checkへ渡して通常のexit 1 reportにする。

runnerは固定generatorをpass 1、pass 2の順に独立して呼び、その2返値を`evidencePasses`へ渡す。pass 1が失敗したらpass 2は呼ばず`[null,null]`、pass 2が失敗したら`[firstEvidence,null]`とする。`NONDETERMINISTIC`は両passがnon-nullの場合、checkerが§3.6の正式serialize byteを比較して発火させる。生成例外はrunnerが上記2種類へだけ正規化し、stack・任意messageを合否値や決定的reportへ入れない。`BUILD_FAILED`は`buildFailure`からcheckerが発火させる。

`evidencePasses`と`buildFailure`の合法unionは次の3形だけとする。`E`はnon-nullの任意JSON valueであり、正常時はgeneratorが返したevidence objectである。

| 状態 | `evidencePasses` | `buildFailure` | 帰属 |
|---|---|---|---|
| 2 pass返却 | `[E, E]` | `null` | 各passを検査し、正式serialize byteを比較 |
| pass 1生成例外 | `[null, null]` | `{pass:1, kind}` | `BUILD_FAILED`、determinism未実行 |
| pass 2生成例外 | `[E, null]` | `{pass:2, kind}` | `BUILD_FAILED`、determinism未実行 |

`[null,null]+null`、`[E,null]+null`、`[null,E]`、`[E,E]+buildFailure`、失敗pass番号と配列位置の不整合、固定外`kind`は、生成失敗を推測せず`EVIDENCE_SCHEMA_INVALID`だけへ帰属する。合法な失敗unionだけが`BUILD_FAILED`を発火する。`productionMode:false`でも合法union自体は変えず、`E`の内容を合成testが改変できる点だけが異なる。

`segmentation`はpass 1・pass 2を**それぞれ独立に**schema・binding・Segmenter写像・hashまで検査し、どちらかがnullまたは個別不成立ならfailedにする。`determinism`は個別schema合格を前提にせず、両passがnon-nullなら正式serialize byteを必ず比較する。したがって、field挿入順だけが違うschema-validな二objectでも`NONDETERMINISTIC`を単独発火でき、片方が改変されて「個別不成立かつserialize byte差あり」の場合はsegmentationの具体的違反と`NONDETERMINISTIC`が併発する。片方が生成例外でnullなら比較不能なのでdeterminismは`not_run_with_upstream_failure`。coverage・expected projection・reportのevidence欄はpass 1を正本として計算し、pass 2は決定性比較以外へ使わない。

snapshotのnull原因は`issues`で明示し、nullだけから推測しない。

- jobの許可issuesは固定順`second_read_failed / hash_changed`。initial read・parseまで成立した文脈だけがcheckerへ来るためfirst hashは必ずnon-null。second hashは`second_read_failed`時だけnull。hashが異なる場合は両hashを残して`hash_changed`。
- 実装fileの許可issuesは固定順`path_unsafe / first_read_failed / second_read_failed / hash_changed / module_url_unavailable / module_path_mismatch`。
- 入力fileの許可issuesは固定順`path_unsafe / first_read_failed / json_parse_failed / second_read_failed / hash_changed`。
- `path_unsafe`ならI/Oを試さずhash・documentをnullにし、他のread/parse issueを併記しない。`first_read_failed`ならfirst/second hashとdocumentをnull。`json_parse_failed`ならfirst hashを残しdocumentだけnull。`second_read_failed`ならsecond hashだけnull。`hash_changed`なら両hashを残す。
- 実装fileの`loadedModuleUrl`は`module_url_unavailable`時だけnull。作れた値を失敗時にnullへ落とさない。

`issues`の合法な併発は次で閉じる。固定外の組合せや、issueとhash/document/URLのnull状態が食い違うcontextは各担当違反として拒否する。

- jobは`[] / [second_read_failed] / [hash_changed]`の三択。後二者は併発しない。
- 入力はpath/read軸として`[] / [path_unsafe] / [first_read_failed] / [second_read_failed] / [hash_changed]`の一つを選ぶ。`json_parse_failed`はpath/read軸が`[] / second_read_failed / hash_changed`のときだけ追加できる。したがって`first_read_failed`後のparse・第二読取、`second_read_failed+hash_changed`は成立しない。
- 実装fileはpath/read軸として入力と同じ五択（`json_parse_failed`なし）、module軸として`[] / [module_url_unavailable] / [module_path_mismatch]`の一つを選び、両軸を固定issue順で連結する。`module_url_unavailable`と`module_path_mismatch`は併発しない。前者ならURLはnull、後者またはmodule issueなしならURLはnon-nullである。

入力issuesの帰属は、`path_unsafe`だけを`INPUT_PATH_UNSAFE`、`first_read_failed / second_read_failed / hash_changed`を`INPUT_HASH_MISMATCH`、`json_parse_failed`を`INPUT_SCHEMA_UNSUPPORTED`とする。実装issuesは全て`IMPLEMENTATION_MISMATCH`、job issuesは全て`JOB_FILE_MISMATCH`とする。issuesとnull状態が上記規則に反する場合も各担当違反とし、nullを合格扱いしない。

合成testは`productionMode:false`で、改変job、改変evidence pair、前後snapshotをこのchecker入口へ直接渡して全違反codeを発火できる。production CLIはjob path一つしか受けず、evidence、Segmenter、filesystem adapter、期待値を引数・環境変数・stdinから注入できない。

### 5.2 checkの成立範囲

- `jobBinding`はjob schemaと`jobSnapshot`の前後hashを検査する。
- `implementationBinding`はjobの期待bindingと、実際にloadしたmodule URL・3 fileの前後hashを検査する。
- `inputBinding`はjobの3入力、3 document、§8.1のpath/hash安定性、既存正式成果物間のbindingを検査する。
- `runtimeBinding`はjobの期待5値と観測値を検査する。
- `sourceContract`は既存`validatePresentationRetainedSourceAtomsPublishedArtifactsV001`の合格と、本追補§4に必要なsource契約（本書で追加固定したspeaker値型を含む）を検査する。
- `segmentation`はevidence schema、evidence来歴とjob/実入力/観測環境の相互束縛、Segmenter返却との一対一写像、ID、anchor、本文を検査する。
- `coverage`はpass 1の`boundaryCandidates[].sourceAtomIds`だけをraw source atom順へ射影し、source atomの欠落・重複・候補間の順序逆転を検査する。candidateのsegment/speech越えは`segmentation`が担当し、coverageへ重複させない。
- `expectedProjection`はjob固有の期待投影との一致だけを検査する。evidence内部hashの自己整合は`segmentation`で常に検査し、期待投影失敗へ巻き込まない。
- `determinism`は2回のevidence正式serialize byte一致を検査する。
- `readOnlyPreflight`は監視pathの前後snapshotを検査する。read-only adapterのmethod集合と書込呼出0件は、実装bindingで固定したsourceの静的検査とspy adapter合成testが担当し、checkerへ自己申告値を渡して合格させない。

正常なgenerator出力だけでは作れない不正（重複ID、空候補、hash改変等）も、checkerへ改変evidenceを渡す合成testで検出する。productionで改変evidenceを受け取る入口は作らない。

## 6. 実行環境の固定値

2026-07-23の設計起草時に読み取り確認した値は次である。

| 項目 | 値 | ゲートA合否 |
|---|---|---|
| Node binary SHA-256 | `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c` | 一致必須 |
| Node version | `v20.19.6` | 一致必須 |
| ICU version | `77.1` | 一致必須 |
| resolved locale | `ja` | 一致必須 |
| resolved granularity | `word` | 一致必須 |
| resolved Node path | `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node` | 診断記録のみ |
| platform / arch | `darwin` / `arm64` | 診断記録のみ |
| V8 / Unicode / CLDR | `11.3.244.8-node.33` / `16.0` / `47.0` | 診断記録のみ |

Node実体とruntime値はrunnerが次の固定手順で取得する。

1. `process.execPath`がabsolute non-empty pathであることを確認し、`realpath`で一度解決する。解決後pathを`resolvedNodePath`へ記録する。
2. 解決後pathを`O_RDONLY | O_NOFOLLOW`でopenし、同じhandleについて読取前後の`fstat`（device、inode、size、mtimeNs）一致を確認する。同じhandleから読んだ全byteだけをSHA-256化する。regular fileでない場合も取得失敗とする。
3. preflight report返却直前に`process.execPath`を再度`realpath`し、同じ解決後pathであることを確認する。別のread-only handleから全byteを再読し、第二SHA-256が第一SHA-256と一致することを確認する。第二handleも同じ`fstat`安定性を要求する。
4. `nodeVersion=process.version`、`icuVersion=process.versions.icu`、diagnosticsのplatform/arch/V8/Unicode/CLDRを同じprocessから取得する。`new Intl.Segmenter('ja', {granularity:'word'}).resolvedOptions()`からlocaleとgranularityを取得し、要求値を自己申告で代入しない。
5. 上記のどれかを取得・安定確認できない場合、observed `runtimeBinding`全体を`null`にする。jobBindingがpassedしていれば`runtimeBinding` checkをfailedとし、`RUNTIME_MISMATCH`を出す。部分objectや推測値を作らない。jobBindingがfailedなら同checkは依存規則どおり未実行である。

Node binary読取には§8.1の固定read-only adapterを使うが、workspace内path制約は適用しない。許されるworkspace外読取は`process.execPath`からその場で解決したこの一実体だけであり、job・引数・環境変数から別binary pathを指定できない。

binary hash・版・ICU・locale・granularityのどれかが違えば、件数や本文が偶然一致しても`SEGMENTER_BOUNDARY_RUNTIME_MISMATCH`で停止する。値を実行後の環境へ合わせて変更して再試行する場合は、理由と新しい期待値を人間へ提示して別承認を得る。

## 7. 汎用coreとcandidate固有preflightの分離

### 7.1 core/schemaへ固定してよい値

- `character-timestamp`
- `Intl.Segmenter`
- locale `ja`
- granularity `word`
- UTF-16 index
- §4のcontainer規則とID規則
- schema版、check名、違反コード、CLI意味

### 7.2 core/schemaへ入れてはいけない値

- `DmWu0jVQfTE`、candidate 13
- 354 / 205 / 248 / 106 / 138 / 67 / 126 / 122 / 106 / 12 / 11
- `SPEAKER_00`、`unknown`
- 今回のatom ID、path、input hash、Node binary hash

これらはcandidate 13用preflight jobだけに置く。合成testdataは別ID・別件数・数値suffixを持たないatom IDを含め、ID suffix解析やcandidate固有化を検出する。

## 8. read-only preflight job

### 8.1 job schema

schema名は`presentation-segmenter-boundary-preflight-job-v001`とする。top-levelは次の10 fieldだけを許し、全て必須とする。

```json
{
  "schemaVersion": "presentation-segmenter-boundary-preflight-job-v001",
  "jobId": "non-empty-string",
  "artifactId": "non-empty-string",
  "mode": "read-only-preflight",
  "implementationBinding": {},
  "inputs": [],
  "expectedSourceBinding": {},
  "expectedRuntime": {},
  "expectedProjection": {},
  "readOnlyGuard": {}
}
```

`implementationBinding`は`{gitCommit, files}`だけを許す。`gitCommit`は40桁小文字hex。`files`は次の固定順3件で、各項目は`{role, path, fileSha256}`だけとする。

1. `core`: `evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs`
2. `retainedSourceAtomsCore`: `evals/clip_composition/presentation_retained_source_atoms_v001.mjs`
3. `runner`: `evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs`

新規coreはgeneratorとcheckerを同一fileの別exportとして持ち、workspace内moduleとしては既存`presentation_retained_source_atoms_v001.mjs`だけをimportする。そこから`canonicalJsonV001`と`validatePresentationRetainedSourceAtomsPublishedArtifactsV001`を再利用し、同じ検査を別実装しない。runnerのworkspace内importは新規coreだけとする。dynamic import、`createRequire`、未束縛のworkspace内module importを禁止する。

実行時は3ファイルの実byte hashがjobと一致しなければならない。`loadedModuleUrl`は実際にloadした新規core、既存core、runner自身の`import.meta.url`という`file:` URL原文を持つ。checkerは`fileURLToPath`で絶対pathへ一度だけ変換し、workspace内real pathをrepository相対の`/`区切りへ直した値とjobの各pathを比較する。URL文字列をpath文字列として直接比較しない。

`gitCommit`はcommit Aの追跡用来歴であり、CLI内の合否値には使わない。runnerは`child_process`を禁止しており、`.git/HEAD`・ref・worktree pointerを新たな直接入力として読まないためである。実装同一性の機械的な信頼根は3 fileの実byte hashとloaded module URLである。「現在HEADと一致」とは報告しない。実装後はまず新規core・runner・合成検査をcommit Aへ固定し、candidate 13用jobへcommit AのIDと3ファイルの実byte hashを記入して一度だけpreflightする。job自体の実byte hashはrunnerが同じopen handleから計算し、完了報告へ記録する。jobをcommit Aへ自己参照させない。

`inputs`は次の固定順3件で、各項目は`{role, path, fileSha256}`だけを許す。

1. `sourceAtoms`
2. `sourceGenerationManifest`
3. `sourceValidationReport`

Gate Aはtimeline、base media、preset、material、教師、expectedを直接読まない。source manifestとvalidation reportが既に束縛した上流を、Gate Aで再解決しない。

3入力は全て`evals/clip_composition/outputs/presentation/retained-source-atoms/<artifact-directory>/`という同じreal directory直下にあり、roleごとのbasenameを`source-atoms.json / generation-manifest.json / validation-report.json`へ固定する。別directory、別basename、3件間で異なる親directoryを拒否する。`sourceBinding.sourceArtifactPath`は実際の`sourceAtoms` pathとbyte一致しなければならない。

`expectedSourceBinding`は次の2 fieldだけを許し、candidate固有のsemantic hashをjob byteへ固定する。

```json
{
  "sourceArtifactCanonicalSha256": "64-char-lowercase-hex",
  "rawSourceAtomsCanonicalSha256": "64-char-lowercase-hex"
}
```

`expectedRuntime`は`{nodeBinarySha256, nodeVersion, icuVersion, resolvedLocale, resolvedGranularity}`の5 fieldだけとし、§6の合否値を置く。

`artifactId`は`^[A-Za-z0-9][A-Za-z0-9._-]*$`を満たし、`.`と`..`を拒否する。`readOnlyGuard`は`{formalOutputPath, expectedState}`の2 fieldだけとし、`expectedState`は`absent`だけを許す。`formalOutputPath`は必ず次の式とbyte一致し、固定root自身や別pathを監視対象にできない。

```text
evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/<artifactId>
```

leafは開始前に不存在でなければならない。workspace rootからleafまでの**存在する全祖先**はreal directoryで、symbolic linkを含まないこと。途中から不存在でもよいが、その場合は最初の不存在component以下が終了時まで全て不存在でなければならない。開始時点の最寄りの存在祖先を`watchedAncestorPath`として固定し、その直下entryを`{name,type}`へ射影してUTF-16 code unit順にsortしたcanonical hashと件数を前後で完全一致させる。`type`の閉語彙は`regular-file / directory / symbolic-link / other`とし、`lstat`の結果をこの順の排他的判定で写す。終了時に、より深い祖先・leafの出現、symbolic link化、entry一覧の変化があれば停止する。

checker contextの`readOnlyGuard`は次の4 fieldだけを持つ。`before`と`after`も各3 fieldだけであり、§10のpreflight reportはこのobjectをそのまま写す。

```json
{
  "formalOutputPath": "workspace-relative-path",
  "watchedAncestorPath": "workspace-relative-path",
  "before": {"formalPathState": "absent", "entryCount": 0, "entriesCanonicalSha256": "64-char-lowercase-hex"},
  "after": {"formalPathState": "absent", "entryCount": 0, "entriesCanonicalSha256": "64-char-lowercase-hex"}
}
```

`formalPathState`は`absent / present / inspection_failed`。`inspection_failed`のsnapshotだけ`entryCount`と`entriesCanonicalSha256`を`null`にし、それ以外は0以上の整数と64桁小文字hexを必須にする。adapterのmethod名やcall履歴をこのobjectへ混ぜない。

runnerが自ら書かなかったことは、次の二重証拠で確認する。

- runnerの処理関数へ渡すfilesystem adapterは`openReadOnly / lstat / realpath / readdir`だけを持つfreeze済みobjectとし、write・rename・mkdir・remove APIを持たせない。production CLIは固定adapterだけを使い、引数・環境変数・stdinで差し替えられない。
- production adapter factoryはrunner file内に置き、filesystem importを`node:fs/promises`のnamed `open / lstat / realpath / readdir`と、`node:fs`の`constants`だけに限定する。namespace importを禁止する。`openReadOnly`は`open(path, constants.O_RDONLY | constants.O_NOFOLLOW)`だけを呼び、別flag・modeを受け取らない。factory外のrunner処理は上記importを直接呼ばず、必ずadapter経由にする。
- 合成testではspy adapterでread呼出を記録し、write可能methodの存在0件をassertする。source検査は、coreのfilesystem・`child_process` import 0件、runnerのfilesystem importが上記exact allowlistだけ、`writeFile / appendFile / rename / mkdir / rm / unlink / copyFile / truncate / createWriteStream`等のwrite-capable import・呼出0件、factory外の`open / lstat / realpath / readdir`直接呼出0件、dynamic import・`createRequire`・`child_process`使用0件を確認する。

これはrunner自身の永続書込0件と、開始・終了snapshotの不変を保証する。非協調の外部processが実行途中だけpathを作って削除する一般TOCTOUまでは検出できない既知限界とし、「実行中の全外部変更を検出」とは主張しない。

### 8.1.1 安定読込の共通契約

job、3入力、実装bindingの3 fileは、すべて次の手順で読む。

1. workspace相対pathを解決し、workspace外・absolute入力・`..`・symbolic link・非regular fileを拒否する。
2. 存在する全祖先がreal directoryでsymbolic linkでないことを確認する。
3. read-only open handle一つからbyteを一度だけ読み、同じbyte bufferからSHA-256を計算する。JSONのjob・3入力は**その同じbuffer**だけをparseする。
4. 同じhandleの読取前後`fstat`でdevice、inode、size、mtimeNsを一致させる。
5. report返却直前に同pathをもう一度安全にopenし、第二snapshotのbyte hashが第一snapshotと一致することを確認する。jobは差異を`JOB_FILE_MISMATCH`、3入力は`INPUT_HASH_MISMATCH`、実装fileは`IMPLEMENTATION_MISMATCH`へ帰属する。

実装fileはJSON parse対象ではないが、hashは同じopen handleのbufferから計算する。Nodeが実際にloadしたmodule URLとの一致は上記`loadedModuleUrl`で別に確かめる。

### 8.2 `expectedProjection`のgeneric shape

許可fieldは次の11個だけで、全て必須とする。

```json
{
  "sourceAtomCount": 1,
  "containerCount": 1,
  "boundaryCandidateCount": 1,
  "wordLikeCandidateCount": 1,
  "nonWordLikeCandidateCount": 0,
  "timelineSegments": [],
  "containers": [],
  "mixedRawSpeakerCandidateCount": 0,
  "rawSpeakerExactSetQueryResults": [],
  "sourcePositiveOverlapCount": 0,
  "membership": {
    "missingCount": 0,
    "duplicatedCount": 0,
    "orderReversedCount": 0,
    "crossSegmentCount": 0,
    "crossSpeechCount": 0
  }
}
```

- 数値は0以上の整数。source・container・candidate件数は1以上。
- `timelineSegments[]`は元順で`{timelineSegmentId, sourceAtomCount, boundaryCandidateCount}`だけを持つ。
- `containers[]`は元順で`{containerId, timelineSegmentId, speechId, sourceAtomCount, boundaryCandidateCount}`だけを持つ。
- `rawSpeakerExactSetQueryResults[]`は`{values, boundaryCandidateCount}`だけを持つ。これは全分布ではなく、jobの`expectedProjection.rawSpeakerExactSetQueryResults`が同じ固定順で宣言した`values`集合へのquery結果である。observed側は各queryの`values`を**job記載順のまま**写し、実測件数だけを入れる。`values`はstringまたはnullの重複なし配列。候補側のraw話者値は元atom初出順で重複除去するが、queryとの一致判定は順序を無視したexact set equalityとする。同じ集合を順序だけ変えて複数queryへ登録したjobは`JOB_INVALID`。`unknown`等をcoreの特別値にしない。jobのquery列を変えるとreport byteも変わるため、その変更はjob変更としてhashに残る。
- `mixedRawSpeakerCandidateCount`はraw話者値集合が2種類以上の候補数。話者を持たないatomはnullとして一種類に数える。

### 8.3 candidate 13の直接入力と実byte hash

| role | path | file SHA-256 |
|---|---|---|
| `sourceAtoms` | `evals/clip_composition/outputs/presentation/retained-source-atoms/DmWu0jVQfTE-candidate-13-v001/source-atoms.json` | `8656549ec3fbbc0fb9447be7b9c2e784d22ebd18f08ee3e24c474ee62225c6d3` |
| `sourceGenerationManifest` | `evals/clip_composition/outputs/presentation/retained-source-atoms/DmWu0jVQfTE-candidate-13-v001/generation-manifest.json` | `18094dd3729eead88c498f997e883253a1481ee8a33279882350aacfcf869cf1` |
| `sourceValidationReport` | `evals/clip_composition/outputs/presentation/retained-source-atoms/DmWu0jVQfTE-candidate-13-v001/validation-report.json` | `be32244280a2564eda9a716a83d04da38f241120a6d2ba40e72e867072fc2ae6` |

candidate 13用jobの`expectedSourceBinding`へ次をliteralとして置き、実体と相互照合する。文書中の値をrunnerへhard-codeしない。

- source artifact canonical SHA-256: `0bf1e10ab94388ec9521cb2270e6c339e7c7b6d8317443b469606b6b353df43c`
- raw source atoms canonical SHA-256: `cd76bfd2fe7ab3b5156433f6d9e2229b20c3d3bbd7d94f2b9e9abbc804a6efb3`
- validation reportのstatusが`passed`。
- manifestとvalidation reportが指すartifact ID、file hash、canonical hash、raw atom hashが実体と一致。
- 3ファイルのschemaが既知のv001で一致。

### 8.4 candidate 13の期待投影

次はjobにだけ置く。

- source atom 354件。
- container 3件。
- boundary candidate 205件。word-like 205件、non-word-like 0件。
- `segment-0001`: 248 atom / 138候補。
- `segment-0002`: 106 atom / 67候補。
- container 1: `segment-0001`・speech 1・126 atom / 60候補。
- container 2: `segment-0001`・speech 2・122 atom / 78候補。
- container 3: `segment-0002`・speech 3・106 atom / 67候補。
- 複数raw話者値を含む候補12件。
- `rawSpeakerExactSetQueryResults`は`values:["unknown"]`のquery一件だけで、候補11件。
- source正重なり0件。
- missing / duplicated / order reversed / cross segment / cross speechは全て0件。
- `readOnlyGuard.formalOutputPath`: `evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/DmWu0jVQfTE-candidate-13-v001`。開始前・終了後とも不存在。

205件や各内訳は機械分割の再現と完全対応を調べるpreflight値であり、日本語として正しい語数、cue数、公開品質の期待値ではない。

## 9. check名・違反コード・固定順

### 9.1 check名の固定順

1. `jobBinding`
2. `implementationBinding`
3. `inputBinding`
4. `runtimeBinding`
5. `sourceContract`
6. `segmentation`
7. `coverage`
8. `expectedProjection`
9. `determinism`
10. `readOnlyPreflight`

依存関係は次で固定する。前提が一つでも`failed`または`not_run_with_upstream_failure`なら当該checkは`not_run_with_upstream_failure`にする。前提がないcheck、または前提が全てpassedのcheckは、別checkの失敗があっても実行する。各check内では発見した同check所属違反を全件収集してからstatusを確定する。

| check | prerequisites |
|---|---|
| `jobBinding` | なし |
| `implementationBinding` | `jobBinding` |
| `inputBinding` | `jobBinding` |
| `runtimeBinding` | `jobBinding` |
| `sourceContract` | `inputBinding` |
| `segmentation` | `implementationBinding`, `runtimeBinding`, `sourceContract` |
| `coverage` | `sourceContract`、かつpass 1の`boundaryCandidates`が配列で全候補の`sourceAtomIds`がstring配列として読取可能 |
| `expectedProjection` | `segmentation`, `coverage` |
| `determinism` | `implementationBinding`, `runtimeBinding`, `sourceContract`、かつevidence pass 1/2が双方non-null |
| `readOnlyPreflight` | `jobBinding` |

`readOnlyPreflight`のafter snapshotは、jobBindingがpassedして安全な監視pathを確立できた場合、他checkが失敗しても`finally`相当で必ず取得する。check配列の表示順は上記固定順を維持し、実行時刻順へ並べ替えない。

`coverage`は`segmentation`の成否に従属させない。pass 1のmembership射影を安全に読める場合は、候補の別fieldやSegmenter写像が不成立でも必ず実行し、segmentation違反とcoverage違反の併発を許す。`boundaryCandidates`または`sourceAtomIds`のshape不成立でmembership射影自体を作れない場合だけ`not_run_with_upstream_failure`とし、その原因はsegmentationの`EVIDENCE_SCHEMA_INVALID`へ記録する。これにより、候補削除・atom二重所属・候補順逆転の合成fixtureでcoverage 3 codeを実際に発火できる。

`determinism`だけは生成passの可用性も明示前提に持つ。check前提3件がpassedしても、`buildFailure`により一方がnullなら`not_run_with_upstream_failure`とし、その上流失敗はsegmentationの`BUILD_FAILED`へ記録する。双方non-nullなら、segmentationの成否を待たず必ず正式serialize byteを比較する。

### 9.2 違反コードの固定順と担当check

| 順 | code | check |
|---:|---|---|
| 1 | `SEGMENTER_BOUNDARY_JOB_INVALID` | `jobBinding` |
| 2 | `SEGMENTER_BOUNDARY_JOB_FILE_MISMATCH` | `jobBinding` |
| 3 | `SEGMENTER_BOUNDARY_IMPLEMENTATION_MISMATCH` | `implementationBinding` |
| 4 | `SEGMENTER_BOUNDARY_INPUT_PATH_UNSAFE` | `inputBinding` |
| 5 | `SEGMENTER_BOUNDARY_INPUT_HASH_MISMATCH` | `inputBinding` |
| 6 | `SEGMENTER_BOUNDARY_INPUT_SCHEMA_UNSUPPORTED` | `inputBinding` |
| 7 | `SEGMENTER_BOUNDARY_SOURCE_VALIDATION_NOT_PASSED` | `inputBinding` |
| 8 | `SEGMENTER_BOUNDARY_SOURCE_BINDING_MISMATCH` | `inputBinding` |
| 9 | `SEGMENTER_BOUNDARY_RUNTIME_MISMATCH` | `runtimeBinding` |
| 10 | `SEGMENTER_BOUNDARY_SOURCE_ATOM_CONTRACT_INVALID` | `sourceContract` |
| 11 | `SEGMENTER_BOUNDARY_SOURCE_ATOM_DUPLICATE` | `sourceContract` |
| 12 | `SEGMENTER_BOUNDARY_SOURCE_ATOM_TIME_REVERSED` | `sourceContract` |
| 13 | `SEGMENTER_BOUNDARY_SEGMENT_MEMBERSHIP_INVALID` | `sourceContract` |
| 14 | `SEGMENTER_BOUNDARY_SPEECH_MEMBERSHIP_INVALID` | `sourceContract` |
| 15 | `SEGMENTER_BOUNDARY_EVIDENCE_SCHEMA_INVALID` | `segmentation` |
| 16 | `SEGMENTER_BOUNDARY_EVIDENCE_BINDING_MISMATCH` | `segmentation` |
| 17 | `SEGMENTER_BOUNDARY_SEGMENTER_OUTPUT_INVALID` | `segmentation` |
| 18 | `SEGMENTER_BOUNDARY_SPLITS_SOURCE_ATOM` | `segmentation` |
| 19 | `SEGMENTER_BOUNDARY_CANDIDATE_EMPTY` | `segmentation` |
| 20 | `SEGMENTER_BOUNDARY_CONTAINER_ID_INVALID` | `segmentation` |
| 21 | `SEGMENTER_BOUNDARY_CANDIDATE_ID_INVALID` | `segmentation` |
| 22 | `SEGMENTER_BOUNDARY_CANDIDATE_ID_DUPLICATE` | `segmentation` |
| 23 | `SEGMENTER_BOUNDARY_CANDIDATE_NONCONTIGUOUS` | `segmentation` |
| 24 | `SEGMENTER_BOUNDARY_CANDIDATE_CROSSES_SEGMENT` | `segmentation` |
| 25 | `SEGMENTER_BOUNDARY_CANDIDATE_CROSSES_SPEECH` | `segmentation` |
| 26 | `SEGMENTER_BOUNDARY_CANDIDATE_TEXT_MISMATCH` | `segmentation` |
| 27 | `SEGMENTER_BOUNDARY_CANDIDATE_ANCHOR_MISMATCH` | `segmentation` |
| 28 | `SEGMENTER_BOUNDARY_SOURCE_ATOM_MISSING` | `coverage` |
| 29 | `SEGMENTER_BOUNDARY_SOURCE_ATOM_DUPLICATED` | `coverage` |
| 30 | `SEGMENTER_BOUNDARY_SOURCE_ATOM_ORDER_REVERSED` | `coverage` |
| 31 | `SEGMENTER_BOUNDARY_EXPECTED_PROJECTION_MISMATCH` | `expectedProjection` |
| 32 | `SEGMENTER_BOUNDARY_EVIDENCE_HASH_MISMATCH` | `segmentation` |
| 33 | `SEGMENTER_BOUNDARY_NONDETERMINISTIC` | `determinism` |
| 34 | `SEGMENTER_BOUNDARY_READ_ONLY_CONTRACT_VIOLATED` | `readOnlyPreflight` |
| 35 | `SEGMENTER_BOUNDARY_BUILD_FAILED` | `segmentation` |

code配列はexport済み`Object.freeze`の固定配列とし、未知codeの生成を拒否する。合成検査は各codeを意図した不正入力で最低1回発火させ、**export code集合＝実観測code集合**を完全一致でassertする。codeの追加・削除・順序変更は本契約の版改訂を要する。

- evidenceの未知field・必須field欠落・型・`sourceAtomCount`不一致は`EVIDENCE_SCHEMA_INVALID`。
- evidenceの`artifactId`がjobと違う、`sourceBinding`が実`sourceAtoms` snapshot・canonical hash・artifact内来歴と違う、`runtimeBinding`が観測環境と違う場合は`EVIDENCE_BINDING_MISMATCH`。入力成果物同士やjob期待値の不一致を表す`SOURCE_BINDING_MISMATCH`とは分離する。
- container IDの形式・全体通番・対応不一致は`CONTAINER_ID_INVALID`。
- candidate IDの形式・全体通番の欠番・順序不一致は`CANDIDATE_ID_INVALID`、同値複数は`CANDIDATE_ID_DUPLICATE`。
- `startAnchor` / `endAnchor`のshape・先頭末尾atomとの不一致は`CANDIDATE_ANCHOR_MISMATCH`。
- §3.5のSegmenter返却件数、先頭0、隣接連続、最終長、返却`segment/index/isWordLike`との一対一不一致は`SEGMENTER_OUTPUT_INVALID`。
- evidence内の2保存hashと、その対象配列を再計算したhashの不一致は、期待投影とは独立に`EVIDENCE_HASH_MISMATCH`。preflight reportへ載せるevidence全体hashは、検査済みevidenceから§3.6どおり生成し、report schemaの合成testで再計算一致を確認する。
- jobの未知/欠落/type/value、artifact ID規則は`JOB_INVALID`。安全にparseしたjob byteの前後差だけを`JOB_FILE_MISMATCH`とする。CLIが安全なjob文脈を作れない場合は違反codeを作らずexit 2。
- 3入力のpath・祖先・role別root/basename違反は`INPUT_PATH_UNSAFE`、前後byte/hash不一致は`INPUT_HASH_MISMATCH`、parse・schema版不成立は`INPUT_SCHEMA_UNSUPPORTED`。実装3 fileのpath・module URL・前後hash違反は全て`IMPLEMENTATION_MISMATCH`。jobの`gitCommit`は来歴でありHEAD照合codeを持たない。
- validation status不合格は`SOURCE_VALIDATION_NOT_PASSED`。manifest/report/source実体間およびjobの`expectedSourceBinding`とのsemantic hash・ID不一致は`SOURCE_BINDING_MISMATCH`。
- source atomのshape・型・空本文・不正時刻幅は`SOURCE_ATOM_CONTRACT_INVALID`、atom ID同値複数は`SOURCE_ATOM_DUPLICATE`、配列順start時刻の逆行は`SOURCE_ATOM_TIME_REVERSED`、segment/speech所属不成立は各専用code。
- Segmenter境界がatom途中なら`SPLITS_SOURCE_ATOM`。候補のatom列が元配列の連続sliceでない場合は`CANDIDATE_NONCONTIGUOUS`、segment/speechをまたぐ場合は各専用code。全source coverageの欠落・二重所属・候補間の元順逆転は`coverage`の各専用code。
- job内`formalOutputPath`の式・文字列安全性・`expectedState`不一致は`JOB_INVALID`だけへ帰属する。`jobBinding`合格後に実filesystemで判明した祖先symbolic link・非directory・inspection失敗、開始時leaf存在、終了時leaf/新祖先出現、before/after entry一覧変化を`READ_ONLY_CONTRACT_VIOLATED`へ帰属する。adapter契約はcheckerへの自己申告ではなく、実装sourceの静的検査とspy adapter合成testを不合格にして止める。

違反の併発規則は「**同じ一つの不成立には最も具体的なcodeだけ、独立した複数の不成立には全code**」とする。generic codeを専用codeの別名として併発させない。特に次を固定する。

| code | exact predicate | 同じ不成立で抑制するgeneric code |
|---|---|---|
| `SOURCE_ATOM_CONTRACT_INVALID` | source atom配列が空、atomの許可/必須field・atomId/text/sourceRef/speaker・start/endの型、空文字、`startMs >= endMs`、sourceRef一致のいずれかが不成立 | なし。下記専用predicateだけの不成立には出さない |
| `SOURCE_ATOM_DUPLICATE` | 有効なstring atomIdがrawSourceAtoms内で2回目以降に出現 | `SOURCE_ATOM_CONTRACT_INVALID` |
| `SOURCE_ATOM_TIME_REVERSED` | startMsが整数である隣接atomについて、後atomのstartMsが前atomより小さい | `SOURCE_ATOM_CONTRACT_INVALID` |
| `SEGMENT_MEMBERSHIP_INVALID` | selection segmentのshape/hash、atom IDの全単射、segment列内・全体のraw順、各atom時刻のsegment包含のいずれかが不成立 | `SOURCE_ATOM_CONTRACT_INVALID` |
| `SPEECH_MEMBERSHIP_INVALID` | atomの`speechId`が整数でない | `SOURCE_ATOM_CONTRACT_INVALID` |
| `CANDIDATE_EMPTY` | fieldの型は成立しているが、`sourceAtomIds.length === 0`、`text.length === 0`、または`segmenterLengthUtf16 === 0` | `EVIDENCE_SCHEMA_INVALID` |
| `CANDIDATE_NONCONTIGUOUS` | 候補内`sourceAtomIds`がrawSourceAtoms上の一つの連続sliceでない | `EVIDENCE_SCHEMA_INVALID` |
| `CANDIDATE_CROSSES_SEGMENT` | 一候補のatomが複数timeline segmentへ属する、または候補のsegment IDと所属segmentが違う | `EVIDENCE_SCHEMA_INVALID` |
| `CANDIDATE_CROSSES_SPEECH` | 一候補のatomが複数speechIdを持つ、または候補のspeechIdと所属speechIdが違う | `EVIDENCE_SCHEMA_INVALID` |

例えば、重複IDのatomが同時に空本文なら`SOURCE_ATOM_DUPLICATE`と`SOURCE_ATOM_CONTRACT_INVALID`を両方出す。重複IDだけなら前者だけを出す。候補の未知fieldと空候補が同時なら、独立不成立として`EVIDENCE_SCHEMA_INVALID`と`CANDIDATE_EMPTY`を両方出す。

### 9.3 codeごとの違反path

全`details`は`{}`で固定し、同じ入力から次表以外のpathを選ばない。code欄は共通prefix `SEGMENTER_BOUNDARY_`を省略している。`p`は0→1のpass順、`i`と`j`は元配列の昇順である。表が「各」とする場合は、該当する異なるpathを全て出す。

| code | path選択 |
|---|---|
| `JOB_INVALID` | 常に`$.jobValue` |
| `JOB_FILE_MISMATCH` | 常に`$.jobSnapshot` |
| `IMPLEMENTATION_MISMATCH` | 各`$.observedImplementationBinding.files[i]` |
| `INPUT_PATH_UNSAFE` | 各`$.inputSnapshots[i].path` |
| `INPUT_HASH_MISMATCH` | 各`$.inputSnapshots[i]` |
| `INPUT_SCHEMA_UNSUPPORTED` | 各`$.inputSnapshots[i].document` |
| `SOURCE_VALIDATION_NOT_PASSED` | `$.inputSnapshots[2].document.status` |
| `SOURCE_BINDING_MISMATCH` | job期待値と不一致なら`$.jobValue.expectedSourceBinding`、正式3入力同士だけの不一致なら`$.inputSnapshots`。両方なら二件 |
| `RUNTIME_MISMATCH` | 常に`$.runtimeBinding` |
| `SOURCE_ATOM_CONTRACT_INVALID` | 配列自体または空配列は`$.inputSnapshots[0].document.rawSourceAtoms`、atom単位は各`$.inputSnapshots[0].document.rawSourceAtoms[i]` |
| `SOURCE_ATOM_DUPLICATE` | 重複2回目以降の各`$.inputSnapshots[0].document.rawSourceAtoms[i].atomId` |
| `SOURCE_ATOM_TIME_REVERSED` | 直前よりstartが戻った各`$.inputSnapshots[0].document.rawSourceAtoms[i].startMs` |
| `SEGMENT_MEMBERSHIP_INVALID` | segment単位で特定できれば各`$.inputSnapshots[0].document.selection.segments[i]`、segment列全体の全単射・順序だけの不成立は`$.inputSnapshots[0].document.selection.segments` |
| `SPEECH_MEMBERSHIP_INVALID` | 各`$.inputSnapshots[0].document.rawSourceAtoms[i].speechId` |
| `EVIDENCE_SCHEMA_INVALID` | 合法union不成立は直後の固定規則、evidence object shape不成立は各`$.evidencePasses[p]` |
| `EVIDENCE_BINDING_MISMATCH` | 各`$.evidencePasses[p]` |
| `SEGMENTER_OUTPUT_INVALID` | 各不成立containerの先頭候補`$.evidencePasses[p].boundaryCandidates[i]`。候補0件で先頭を持てない場合は`$.evidencePasses[p].boundaryCandidates` |
| `SPLITS_SOURCE_ATOM` | 各`$.evidencePasses[p].boundaryCandidates[i].sourceAtomIds` |
| `CANDIDATE_EMPTY` | 各`$.evidencePasses[p].boundaryCandidates[i]` |
| `CONTAINER_ID_INVALID` | 各`$.evidencePasses[p].boundaryCandidates[i].containerId` |
| `CANDIDATE_ID_INVALID` | 各`$.evidencePasses[p].boundaryCandidates[i].boundaryCandidateId` |
| `CANDIDATE_ID_DUPLICATE` | 重複2回目以降の各`$.evidencePasses[p].boundaryCandidates[i].boundaryCandidateId` |
| `CANDIDATE_NONCONTIGUOUS` | 各`$.evidencePasses[p].boundaryCandidates[i].sourceAtomIds` |
| `CANDIDATE_CROSSES_SEGMENT` | 各`$.evidencePasses[p].boundaryCandidates[i]` |
| `CANDIDATE_CROSSES_SPEECH` | 各`$.evidencePasses[p].boundaryCandidates[i]` |
| `CANDIDATE_TEXT_MISMATCH` | 各`$.evidencePasses[p].boundaryCandidates[i].text` |
| `CANDIDATE_ANCHOR_MISMATCH` | 不正な各`startAnchor`または`endAnchor`のfield path。最終配列順は§5のcode→path順だけに従う |
| `SOURCE_ATOM_MISSING` | 各`$.inputSnapshots[0].document.rawSourceAtoms[i].atomId` |
| `SOURCE_ATOM_DUPLICATED` | 二重所属2回目以降の各`$.evidencePasses[0].boundaryCandidates[i].sourceAtomIds[j]` |
| `SOURCE_ATOM_ORDER_REVERSED` | 元順を最初に逆行させた各`$.evidencePasses[0].boundaryCandidates[i].sourceAtomIds[j]` |
| `EXPECTED_PROJECTION_MISMATCH` | 常に`$.jobValue.expectedProjection` |
| `EVIDENCE_HASH_MISMATCH` | 不一致の各`boundaryCandidatesCanonicalSha256`または`sourceAtomMembershipCanonicalSha256`のfield path。最終配列順は§5のcode→path順だけに従う |
| `NONDETERMINISTIC` | 常に`$.evidencePasses` |
| `READ_ONLY_CONTRACT_VIOLATED` | 常に`$.readOnlyGuard` |
| `BUILD_FAILED` | 常に`$.buildFailure` |

合法union不成立に対する`EVIDENCE_SCHEMA_INVALID`のpathは、次の上から最初に該当する一つへ固定する。

1. `evidencePasses`はarrayだが長さが2でない、または`[null,E]`という禁止配置なら`$.evidencePasses`。非arrayは§5.1のcontext大分類型不成立としてexit 2であり、このcodeを作らない。
2. `buildFailure`はnon-null objectだがexact `{pass,kind}`でない場合は`$.buildFailure`。non-null非objectは§5.1のcontext大分類型不成立としてexit 2であり、このcodeを作らない。
3. `buildFailure.kind`が固定語彙外なら`$.buildFailure.kind`。
4. `buildFailure.pass`が1/2以外なら`$.buildFailure.pass`。
5. `[null,null]+null`または`[E,null]+null`のように生成失敗位置へfailure objectが無ければ`$.buildFailure`。
6. `[E,E]+buildFailure`のように二pass返却済みなのにfailure objectがあれば`$.buildFailure`。
7. `{pass:1}`と`[E,null]`、`{pass:2}`と`[null,null]`のようにpass番号とnull位置が違えば`$.buildFailure.pass`。

一つのcontextが複数条件へ見えても、この優先順によりunion不成立のpathは一件だけにする。合法union内の各`E`のschema不成立は別件であり、pass順に各`$.evidencePasses[p]`を出す。

### 9.4 併発と抑制の優先規則

§9.2の「最も具体的」を次で一意にする。

1. evidenceの必須field・型が不成立で専用検査の入力を読めない場合は`EVIDENCE_SCHEMA_INVALID`だけとし、その読めないfieldに依存するcodeは出さない。反対に、型は読めるが空、ID、anchor等の専用predicateが不成立なら専用codeを出し、その同じ理由でschema genericを重ねない。未知fieldは独立してschema codeを出す。ただし`startAnchor / endAnchor` object内部の未知・欠落fieldは、anchor shapeの専用predicateとして`CANDIDATE_ANCHOR_MISMATCH`だけへ帰属する。
2. valid形式のcandidate IDが重複した場合、重複2回目以降は`CANDIDATE_ID_DUPLICATE`だけとし、その重複が生んだ通番不一致を`CANDIDATE_ID_INVALID`へ重ねない。重複値自体が形式不正なら、形式不正と重複は独立なので両codeを出す。
3. candidate `text`がsource atom本文連結と違う場合は`CANDIDATE_TEXT_MISMATCH`を出し、そのcandidateの同じtext差を`SEGMENTER_OUTPUT_INVALID`へ重ねない。source atom本文とは一致するがSegmenterが返した`segment`と違う場合だけ`SEGMENTER_OUTPUT_INVALID`を出す。
4. Segmenter境界がatom途中へ落ち、候補へ完全写像できない場合は`SPLITS_SOURCE_ATOM`を出し、その写像不能自体を`SEGMENTER_OUTPUT_INVALID`へ重ねない。Segmenter返却列そのものの件数・index・segment・`isWordLike`不一致は後者である。
5. anchorのshape・edge・先頭末尾atom参照の不成立は`CANDIDATE_ANCHOR_MISMATCH`が担当し、同じanchor理由で`EVIDENCE_SCHEMA_INVALID`を重ねない。anchorを読めない型なら規則1を適用する。
6. `CANDIDATE_EMPTY / NONCONTIGUOUS / CROSSES_SEGMENT / CROSSES_SPEECH`は、それぞれ別predicateが同時成立すれば併発する。ただし一つのfieldが読めないだけなら規則1を適用する。
7. coverageは全体membershipという独立不変条件である。membership射影を読める限り、同じ改変からsegmentation codeと`MISSING / DUPLICATED / ORDER_REVERSED`が生じても両方出す。これをgeneric重複とは扱わない。
8. evidence内容を改変して保存hashを更新しなければ、内容codeと`EVIDENCE_HASH_MISMATCH`は独立なので併発する。内容codeだけを狙う合成testは二つの保存hashを再計算し、hash codeだけを狙うtestは内容を変えずhash fieldだけを変える。
9. `NONDETERMINISTIC`は二passのserialize byte差という独立不変条件であり、片passの内容不成立codeと併発できる。合法な生成例外unionでは比較不能のため未実行とし、`BUILD_FAILED`だけを出す。
10. jobのformal output式・文字列安全性は`JOB_INVALID`だけであり、依存先のread-only checkは未実行とする。job合格後の実filesystem状態だけを`READ_ONLY_CONTRACT_VIOLATED`にする。

## 10. read-only runnerとCLI

正式入口名は`run_presentation_segmenter_boundary_preflight_v001.mjs`とし、引数はjob JSON path一つだけを許す。job pathはworkspace内の`evals/clip_composition/outputs/presentation/segmenter-boundary-preflight-jobs/`配下のregular JSON fileに限定し、absolute path、`..`、symbolic link、root自身を拒否する。cwd、環境変数、stdinでworkspace root・実装・期待値・出力先を差し替える入口は作らない。

| 終了コード | 意味 | 出力 |
|---:|---|---|
| 0 | job・入力・環境・生成・自己検査・期待投影・決定性・read-only guardが全て合格 | stdoutへpreflight report JSON一つ |
| 1 | job pathとJSONを信頼できる形で取得後、契約不成立 | stderrへpreflight report JSON一つ |
| 2 | 引数数、job path、job読取、JSON parse、checker context外形、またはreport相互一致不成立により信頼できる検査文脈・reportを作れない | stderrへ診断文一つ。report fileは作らない |

exit 0/1のreportは`canonicalJsonV001(report) + "\n"`の1行だけを、それぞれstdout/stderrへ出す。反対側streamは空にする。exit 2の診断文は、引数数不正なら`SEGMENTER_BOUNDARY_CLI_USAGE_ERROR\n`、job path・読取・parseで文脈を作れない場合は`SEGMENTER_BOUNDARY_CLI_JOB_CONTEXT_UNAVAILABLE\n`、checker context外形またはreport相互一致の内部検査が不成立なら`SEGMENTER_BOUNDARY_CLI_INTERNAL_REPORT_INVALID\n`のいずれか一行だけとし、OS依存message、stack、絶対pathを混ぜない。

runnerは次を行わない。

- formal evidence、failure report、lock、work directory、publish temporary directoryの作成。
- output path引数の受理。
- `writeFile`、`rename`、`mkdir`等による永続化。
- stdout/stderr以外へのpreflight結果保存。

成功時のstdout、契約不成立時のstderrに出すschemaは`presentation-segmenter-boundary-preflight-report-v001`とする。top-levelは次の10 fieldだけを許し、全て必須とする。

```json
{
  "schemaVersion": "presentation-segmenter-boundary-preflight-report-v001",
  "status": "passed",
  "failureStage": null,
  "job": {"jobId": "...", "path": "...", "fileSha256": "..."},
  "inputs": [],
  "runtimeBinding": {},
  "observedProjection": {},
  "evidence": {
    "artifactId": "...",
    "canonicalSha256": "...",
    "boundaryCandidatesCanonicalSha256": "...",
    "sourceAtomMembershipCanonicalSha256": "..."
  },
  "readOnlyGuard": {
    "formalOutputPath": "...",
    "watchedAncestorPath": "...",
    "before": {"formalPathState": "absent", "entryCount": 0, "entriesCanonicalSha256": "..."},
    "after": {"formalPathState": "absent", "entryCount": 0, "entriesCanonicalSha256": "..."}
  },
  "checkReport": {}
}
```

- `failureStage`はpassed時だけ`null`。failed時は固定check順で最初に`failed`となったcheck名。
- `job`は上記3 fieldだけ。`path`はworkspace相対の`/`区切り。`fileSha256`は常に`jobSnapshot.firstFileSha256`。exit 1では常にobjectで、schema不成立により有効なjob IDを得られない場合だけ`jobId:null`。
- `inputs`は`inputBinding`がpassedした場合だけ、jobと同じ固定順3件の`{role, path, fileSha256}`配列。それ以外は`null`。各`fileSha256`は対応する`inputSnapshots.firstFileSha256`で、部分配列を出さない。
- `runtimeBinding`は`runtimeBinding` checkを実行して§3.3の観測shapeを作れた場合、そのcheckがpassed/failedのどちらでもobject。未実行または取得不能なら`null`。
- `observedProjection`は`segmentation`と`coverage`がともにpassedして全投影を作れた場合だけ§8.2のobject。それ以外は`null`。`expectedProjection`との値不一致だけなら実測値を保持する。
- `evidence`は`segmentation`がpassedした場合だけ上記4 fieldのobject。それ以外は`null`。`canonicalSha256`は§3.6のevidence全体hash。
- `readOnlyGuard`は`readOnlyPreflight`を実行できた場合だけ上記4 fieldのobject。それ以外は`null`。`before/after`は各3 fieldだけで、`formalPathState`は`absent / present / inspection_failed`。passedにはbefore/afterとも`absent`、同じ`watchedAncestorPath`、同じentry count/hashが必要。inspection不能時のhash/countは`null`とし、それ以外でnullを許さない。
- `checkReport`は§5のschema objectそのもの。
- exit 1で上記成立条件を満たさないfieldは、object内部を部分的にnull化せずtop-level field全体を`null`にする。例外は`job.jobId`と`readOnlyGuard.before/after`のinspection不能規則だけである。
- 実行時刻、PID、一時pathを含めない。同じjob・入力・実装・環境から同じpreflight report byteを得る。

report内の重複情報は次の全条件で相互一致させる。

1. `report.status === report.checkReport.status`。
2. exit 0と`status:passed`、exit 1と`status:failed`をそれぞれ必要十分条件とする。
3. passed時は10 checkが全てpassed、`violations` 0件、`failureStage:null`、`inputs/runtimeBinding/observedProjection/evidence/readOnlyGuard`が全てnon-null。
4. failed時は少なくとも一checkがfailed、`violations` 1件以上、`failureStage`が固定順で最初のfailed checkと一致する。not_runだけでfailedを作らない。
5. top-levelとcheck reportの`observedProjection`は、双方null、または双方non-nullかつcanonical JSON完全一致のどちらかでなければならない。片側だけnullを許さない。
6. `evidence.artifactId === checkReport.artifactId === jobValue.artifactId`。evidenceがnullならcheck reportのartifact IDもnull。
7. reportに載せるevidence内部2 hashは検査済みevidenceの同fieldと一致し、全体hashはそのevidenceを§3.6で再計算した値と一致する。
8. top-level `runtimeBinding`がnon-nullならcheckerへ渡したobserved runtimeとcanonical JSONで一致する。top-levelがnullでよいのは、`runtimeBinding` checkが上流失敗で未実行、または観測runtime自体が取得不能だった場合だけである。jobBinding失敗でruntime checkが未実行の場合に、contextへ取得済みruntimeが存在すること自体は内部report不整合にしない。

この相互一致もreportをstdout/stderrへ出す前の必須検査とし、不成立reportを出してexit 0/1にしない。合成testはtop-levelだけ、check reportだけ、failureStageだけ、first/second hashだけを改変した例を別々に検査する。

合成検査だけはOSの一時領域へfixtureを作れるが、各test終了時に自分が作った一時物だけを削除する。candidate 13の読み取り専用preflightは一時fileも作らない。

## 11. ゲートAの合成検査と完了条件

### 11.1 新規検査

- §3〜§5の正常schema、未知field、必須field、型、hashを検査する。
- job、全3入力、実装3 fileについて、workspace外・symbolic link・非regular file・読取中/読取後差し替えと、hash/parseが同一byte buffer由来であることを検査する。
- snapshot issue固定語彙・固定順・null条件と、path/hash/schema/implementation各codeへの一意な帰属を検査する。
- checker contextの未知/欠落field・大分類型・`productionMode`不正が固定internal errorとなり、CLIではreportなしexit 2へだけ帰属することを検査する。
- 通常日本語、`isWordLike=false`の句読点・空白、surrogate pair、結合文字、atom内部へ落ちる境界を検査する。
- 数値suffixを持たないatom IDで、元配列indexだけを連続性正本にしていることを検査する。
- source側不正としてatom ID重複、時刻逆転、segment所属不成立、speech所属不成立を検査する。
- source正重なりを観測として保持し、境界接触を重なりに数えず、時刻逆転だけを拒否する。
- 同じsegment・speechの組合せが非連続で再登場してもcontainerを結合しない。
- raw話者が混在しても単一話者へ変換しない。
- Segmenter返却と候補の件数、index、本文、`isWordLike`、先頭0、隣接連続、最終長の一対一写像を検査する。
- candidate ID・container IDの形式と通番、anchorと先頭末尾atom、`sourceAtomCount`を検査する。
- §9の35違反codeを全件発火させ、export集合との完全一致と固定順を検査する。正常generatorから作れない違反は§5.1のchecker入口へ改変evidenceを渡して検査する。
- CLI 0/1/2、stdout/stderrの分離、failure file等を作らないことを実processで検査する。
- 同じ意味入力を2回生成し、§3.6のevidence正式serialize byteとpreflight report byteが完全一致することを検査する。さらに、field挿入順だけを変えたschema-validな二objectをcheckerへ渡し、`NONDETERMINISTIC`が単独発火することを検査する。
- pass 1/2の片方だけがschema不成立かつserialize byte差ありならsegmentationの具体的違反＋`NONDETERMINISTIC`が併発し、一方がnullならsegmentationの`BUILD_FAILED`＋determinism未実行になることを検査する。
- coverageの3 codeは、pass 1のmembership射影だけをそれぞれ欠落・二重所属・候補順逆転へ改変し、segmentationの成否にかかわらず各codeが発火することを検査する。membership射影不能時だけcoverageが未実行になることも別に検査する。
- checkの§9.1依存表について、独立checkは他check失敗後も実行し、依存checkだけが`not_run_with_upstream_failure`になることを検査する。
- exit 1の各失敗段階について§10のnull規則とread-only snapshot shapeを検査する。
- read-only guardの正式pathが固定root直下のartifact ID childで、開始前・終了後とも不存在、watched ancestor一覧が不変、filesystem adapterにwrite可能methodが0件であることを検査する。

合成testの総件数は実装後の実数を報告し、設計段階で独自の固定件数を作らない。

### 11.2 既存回帰

Gate Aが直接依存する正式残存source atomの既存testを全件再実行する。

```sh
node --test evals/clip_composition/presentation_retained_source_atoms_v001.test.mjs
```

Gate Aは既存caption、instruction、timeline、base-media、rendererをimport・変更しない。したがってそれらをゲートA合格件数へ水増ししない。実装時に予定外の既存module変更が必要になった場合は、新しい設計判断として停止し、本追補の承認を流用しない。

### 11.3 candidate 13読み取り専用preflight

新規検査と既存回帰が全て合格した後、§8のjobを一度だけ実行する。合格条件は次の同時成立である。

- 3入力と実装3ファイルの実byte hashがjobと一致し、job自身を含む全fileの第一・第二snapshotが一致。
- jobの`expectedSourceBinding` 2 hashと正式成果物間のbindingが一致。
- §6の5合否値が一致。
- §8.4の全期待投影が一致。
- evidenceとpreflight reportが2回のin-memory生成でbyte決定的。
- formal output pathが開始前・終了後とも不存在。
- runner自身がstdout/stderr以外へ何も保存しておらず、協調的snapshot脅威モデル内でformal pathとwatched ancestorが不変。

一項目でも不一致なら、夜間指示どおり結果を直すための実装変更・期待値変更・再試行をせず、失敗を記録して停止する。

## 12. 完了報告の範囲

ゲートA実装が別途承認された場合の完了報告には次を含める。

1. generator＋checkerを同居させた新規core、read-only runnerの新規2 file、固定再利用した既存retained-source-atoms core、commit A。
2. 新規合成testの実数、35/35違反code発火、CLI 0/1/2、決定性、安定読込、read-only検査。
3. 既存残存source atom testの実数と全合格。
4. candidate 13のjob hash、3入力hash、実装3 file hash、環境5合否値、354文字・3 container・205候補と内訳、source binding 2 hash、evidence内部2 hashと全体hash。
5. formal output、failure report、lock、work、tmpを作っていないこと。
6. 完全対応は欠落・重複なしだけを示し、自然な語境界を認定していないこと。
7. v003、正式指示書、正式解決パッケージ、Gemini、描画へ未着手であること。
8. 人間作業0件。

全条件成立後だけ、元の夜間指示に従いゲートA完了報告をコミットし、次ゲートのfield-level契約設計を**起草まで**行って提示停止する。

## 13. 本追補の承認文案

> ゲートA実装契約追補v001を承認する。本承認は、`presentation-candidate13-caption-resolution-pair-generation-design-20260722-v001.md`の§5.1、§10.1、§11冒頭・§11.1、§12、§15について、本追補§2に列挙した範囲の改訂承認と、同元設計の改訂履歴へ追補path・上書き節・承認日・一組の正本である旨を案内追記する承認を兼ねる。ゲートAの合格範囲は、機械境界証拠のfield-level契約、固定35違反コード、read-only CLI 0/1/2、合成検査、既存残存source atom回帰、candidate 13読み取り専用preflightまでとする。Node binary hash・Node版・ICU版・locale・granularityは合否条件、resolved path等は診断記録とする。candidate 13固有値はpreflight jobだけに置き、汎用core/schemaへ埋め込まない。正式成果物、v003、Gemini、指示書、解決パッケージ、描画は引き続き未承認とする。

## 14. 改訂履歴

- v001 / 2026-07-23: 夜間の実装可能性監査で発見した未固定9項目と§11.3/§15の範囲矛盾を具体化。起草中の独立再監査で、source snapshot、合法failure union、check責務、固定35 codeの到達可能性、report相互一致、read-only guardを補強し、残存P0/P1なしを確認。起草のみ承認され、人間承認待ちとして提示。実装・testdata・preflightは未着手。
