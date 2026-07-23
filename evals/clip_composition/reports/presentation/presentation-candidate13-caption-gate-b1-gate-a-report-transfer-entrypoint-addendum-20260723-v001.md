# candidate 13 基本テロップ ゲートB1・ゲートA検査結果受け渡し入口 追補 v001

- 作成日: 2026-07-23
- 状態: **設計提示・承認待ち。実装、合成検査、回帰、preflightは未再開**
- 追補先: `presentation-candidate13-caption-gate-b1-implementation-contract-design-20260723-v001.md`
- 起草根拠:
  - `presentation-candidate13-caption-gate-b2-night-stop-report-20260723-v001.md`
  - 2026-07-23のkawafmmによる追補起草承認
- 人間作業: 本追補の承認または却下という1判断。媒体視聴、時刻入力、文字分割、時間計測はない

## 1. 目的

ゲートB1のpackage runnerが、既存ゲートA検査器の結果を、承認済みの内包レポート組立処理へ渡せる正式入口を一つだけ追加する。

現行B1契約は、次の処理をそれぞれ固定している。

1. package coreは、B1が読み取った生の観測からゲートA用の旧形式入力を再構成し、既存ゲートA検査器を呼ぶ。
2. package runnerは、検査結果を含む7項目を内包レポート組立処理へ渡す。
3. package runnerから既存ゲートA検査器を直接importしない。
4. package coreの公開入口集合へ、実装者判断で入口を追加しない。

しかし、1で得た検査結果を2へ渡す公開経路が固定されていなかった。本追補は、この工程間の縫い目だけを埋める。ゲートA検査ロジック、B1の7ファイル構成、違反コード、job、CLI、意味出力、描画契約は変更しない。

## 2. 承認時の効力と上書き範囲

本追補が承認された場合、承認済みB1契約v001と本追補v001を一組の実装正本とする。元設計本文を黙って書き換えない。

本追補は、元設計の次の記述だけを改訂する。

| 元設計 | 改訂内容 |
|---|---|
| §4.1 package coreの全公開入口集合 | §3の純粋入口を1件追加 |
| §4.1 package coreとpackage runnerの責務 | package runnerは§3の入口を静的importし、既存ゲートA検査器を直接importしない |
| §4.2 ゲートA旧形式入力の再構成 | 境界証拠前後で共用する旧形式土台の写像を§3のprivate処理へ、既存検査器呼出しと工程間公開を§3の公開入口へ固定 |
| §4.5 内包レポート組立処理の入力 | package runnerが独自に組み立てず、§3の成功返値をそのまま使う |
| §7.2 ゲートA内包証拠の処理順 | `evidence-gate`合格後に§3の入口を通す段を追加 |
| §20.4 検査可能性 | productionと合成検査が同じ受け渡し入口を使う検査を追加 |
| §21 完全性チェック | 「工程間の受け渡し」を標準項目として追加 |

本追補は、元設計§16の57違反コード、§17の終了コード・診断文字列、§6のjob schema、§7の正式ファイルschema、§4.1の既存公開入口の引数・返値を変更しない。

承認時は、元設計§25の改訂履歴へ、本追補名、上書きする条項、承認日を案内行として追記する。これは正本の逆引きだけを追加する変更であり、上表以外の本文を改訂しない。同じ承認コミットでDECISIONSとHANDOVERを「承認済み・B2再開可」へ同期する。承認前の現時点では、元設計本文と改訂履歴を変更しない。

## 3. 追加する唯一の版付き純粋入口

package coreへ、次のnamed exportを一つ追加する。

```js
derivePresentationCaptionEmbeddedGateAReportContextV001(context)
```

package core内部には、非exportの共通処理
`derivePresentationCaptionGateALegacyBaseContextV001(context)`
を一つだけ置く。このprivate処理は、境界証拠を除く生観測から、既存ゲートA検査器へ渡す旧形式contextの土台を作る唯一の写像である。

private処理の入力は、次のfieldをこの順にちょうど七つ持つplain objectである。

```js
{
  jobValue,
  jobInput,
  implementationInputs,
  sourceInputs,
  legacyRecheck,
  legacyReadOnlyObservation,
  runtimeObservation
}
```

private処理の返値は次の二形だけである。

```js
{
  status: "derived",
  value: {
    jobValue,
    jobSnapshot,
    observedImplementationBinding,
    inputSnapshots,
    runtimeBinding,
    readOnlyGuard,
    productionMode
  }
}
```

```js
{
  status: "context-invalid"
}
```

`productionMode`は常に`true`。private処理はthrowせず、package core外へexportしない。`gate-a-context-gate`と本公開入口は、この同じprivate処理を呼ぶ。別の旧形式写像を作らない。

処理の意味は次の一つに限定する。

> B1が既に読み取ったゲートAの生観測から、既存ゲートA検査器を一度呼び、内包ゲートAレポート組立処理へそのまま渡せる検査済み入力一式を返す。

この入口は次を行わない。

- filesystem、network、時刻、PID、乱数、環境変数を読む。
- candidate 13固有の件数、path、hashを持つ。
- ゲートA違反をB1用に補正、削除、並べ替えする。
- 内包レポートを保存、公開、直列化する。
- package runner、CLI、jobから検査器や期待値を注入させる。
- ゲートA検査器と同等の判定を別実装する。

## 4. 入力契約

引数はplain object一件で、root fieldを次の順にちょうど二つ持つ。

1. `gateA`
2. `runtimeObservation`

`gateA`は次のfieldを、この順にちょうど七つ持つ。

1. `jobValue`
2. `jobInput`
3. `implementationInputs`
4. `sourceInputs`
5. `legacyRecheck`
6. `legacyReadOnlyObservation`
7. `evidencePasses`

各fieldの型、role順、snapshot、読取観測、二回目読取、読み取り専用監視、境界証拠二passのshapeは、元設計§4.2をそのまま使う。未知field、欠落field、順序違い、疎な配列、追加property、accessor、非plain objectを許さない。

`evidencePasses`は、元設計§4.2の成功object二件でなければならない。各成功objectは、境界証拠の値、正式byte、実byte hash、canonical hash、入力copy観測を持つ。入口は境界証拠の値だけを既存ゲートA検査器へ渡すが、実byteと二hashも再計算して成功objectの申告と照合する。結果を見てpass 2へ選び替えず、順序を維持する。

`runtimeObservation`は元設計§4.2のexact shapeを使う。ゲートA旧契約へ渡す`productionMode`は、入口内部で`true`へ固定する。引数から受け取らない。

この入力は、package runnerが`evidence-gate`へ渡したpackage checker contextの生観測から作る。同じ値を別ファイルから読み直したり、checkerの合否列から復元したりしない。

本公開入口は、入力から次のprivate入力を、記載順の新しいplain objectとして作る。

```js
{
  jobValue: context.gateA.jobValue,
  jobInput: context.gateA.jobInput,
  implementationInputs: context.gateA.implementationInputs,
  sourceInputs: context.gateA.sourceInputs,
  legacyRecheck: context.gateA.legacyRecheck,
  legacyReadOnlyObservation: context.gateA.legacyReadOnlyObservation,
  runtimeObservation: context.runtimeObservation
}
```

この投影は`evidencePasses`をprivate処理へ渡さないためのfield選択だけであり、旧形式fieldの組立処理を持たない。private処理が返した成功土台から、既存ゲートA検査器へ渡す最終contextを次のfield順で明示的に新規構築する。object spreadや後置追加により順序を決めない。

```js
{
  jobValue,
  jobSnapshot,
  observedImplementationBinding,
  inputSnapshots,
  runtimeBinding,
  evidencePasses,
  buildFailure,
  readOnlyGuard,
  productionMode
}
```

`evidencePasses`は入力の二つの値、`buildFailure`は`null`、残る七fieldはprivate処理の成功返値を同値で使う。土台を別の写像で作り直さない。

## 5. 出力・例外契約

返値は次の二形だけである。

成功:

```js
{
  status: "derived",
  value: {
    jobValue,
    jobSnapshot,
    inputSnapshots,
    runtimeBinding,
    evidencePasses,
    readOnlyGuard,
    checkReport
  }
}
```

入力不成立:

```js
{
  status: "context-invalid"
}
```

`value`のfield順は、既存
`buildEmbeddedPresentationSegmenterBoundaryPreflightReportV001`
の入力と完全一致する。package runnerはfieldを追加、削除、改名、再構成せず、成功返値の`value`をそのまま二回の内包レポート組立へ渡す。

各fieldの由来は次へ固定する。

| 出力 | 唯一の由来 |
|---|---|
| `jobValue` | 入力`gateA.jobValue` |
| `jobSnapshot` | 初回job観測と`legacyRecheck.jobInput`から再構成した既存ゲートA形 |
| `inputSnapshots` | 初回source観測と`legacyRecheck.sourceInputs`から再構成した既存ゲートA順 |
| `runtimeBinding` | 入力`runtimeObservation`から作る既存ゲートA形 |
| `evidencePasses` | 入力の二成功passにある境界証拠の値二件 |
| `readOnlyGuard` | 入力`legacyReadOnlyObservation`から作る既存ゲートA形 |
| `checkReport` | 上記から作った旧形式contextを既存`checkPresentationSegmenterBoundaryPreflightV001`へ一度渡した生の返値 |

検査結果が正当に`failed`であっても、入力形式と旧形式contextが成立していれば`status: "derived"`で返す。失敗結果を`context-invalid`へ変えない。`checkReport`のstatus、検査列、観測投影、違反列を補正しない。

入力形式不成立、旧形式contextを完全に作れない、既存ゲートA検査器がthrowした場合だけ`context-invalid`を返す。関数自身はthrowしない。自由文のreason、修正版context、推測値を返さない。

## 6. package core内の単一所有

ゲートA旧形式の土台への写像は、§3のprivate共通処理だけが所有する。既存ゲートA検査器を呼び、結果を工程間へ公開する責務は、本公開入口だけが所有する。

`checkPresentationCaptionSemanticSourcePackageV001`は、境界証拠が無い段階ではprivate共通処理を、二つの境界証拠が揃う`evidence-gate`以降では本公開入口を内部から呼ぶ。package checker用に旧形式写像やゲートA検査器呼出しを複製しない。

- `gate-a-context-gate`では、境界証拠がまだ無いため本公開入口を呼ばない。package checker contextから、`gateA.jobValue`、`gateA.jobInput`、`gateA.implementationInputs`、`gateA.sourceInputs`、`gateA.legacyRecheck`、`gateA.legacyReadOnlyObservation`、rootの`runtimeObservation`を、この順で§3のprivate入力へ投影する。`gateA.completionReportInput`、`gateA.evidencePasses`、`gateA.embeddedReportPasses`を渡さない。private共通処理の成立性からcode 8を判定する。
- `evidence-gate`以降では、同じ六つの`gateA` fieldとrootの`runtimeObservation`に、`gateA.evidencePasses`を加えて§4の公開入力を作り、本入口を呼ぶ。`gateA.completionReportInput`と`gateA.embeddedReportPasses`を渡さない。
- package checkerは、元設計どおり、code 8をprivate土台写像の不成立、code 9をGate A完了報告のpath・存在・安全性・hash不一致または内包レポートvalidator拒否、code 10を有効な内包レポートが示すGate A失敗、code 48・49を既存builderと二回生成の観測からそれぞれ帰属する。
- package runnerは、`evidence-gate`合格後に同じ入口を明示的に一度呼び、内包レポート組立の入力を得る。

package checker内部とpackage runnerの二呼出しは、同じ生観測に対して同じ結果を返さなければならない。どちらかだけが別の写像を持たない。

先行する`gateAContext`、`evidenceBuild`、`evidenceDeterminism`が全てpassedであるのに、package checker内部の本入口呼出しが`context-invalid`となった場合、package checkerは違反を推測せず`{status: "context-invalid"}`を返す。runnerは既存の内部不整合診断によるexit 2で停止する。code 8へ戻したり、新しい違反を作ったりしない。

## 7. production経路と注入口の禁止

package runnerは、package coreから本入口をexact named importする。

productionの処理順は次へ固定する。

1. 元設計どおり生観測を読み、二つの境界証拠を作る。
2. 同じpackage checkerで`evidence-gate`を検査する。
3. `evidence-gate`が合格した場合だけ、同じ生観測と二passを§4の形へ投影し、本入口を一度呼ぶ。
4. `derived.value`を、既存の防御copy規則を通して、private production builder adapterの`buildEmbeddedGateAReport`へ二回渡す。
5. 二回の内包レポートbyte一致後、常にpass 1を採用する。
6. 同じpackage checkerで`embedded-report-gate`を検査する。

`evidence-gate`が合格したのに本入口が`context-invalid`を返した場合は、承認済み処理同士の内部不整合である。trusted failed reportへ推測変換せず、既存の
`CAPTION_B1_PACKAGE_CLI_INTERNAL_REPORT_INVALID`
によるexit 2で停止する。新しい違反コードや診断文字列を追加しない。

package runnerは、既存ゲートA検査器を直接importしない。既存ゲートAからpackage runnerが直接importできるのは、引き続き境界証拠生成処理だけである。

本入口はpackage runnerのbuilder adapter fieldへ追加しない。production CLIは引き続きjob path一件だけを受ける。CLI引数、job、環境変数、stdin、global hookから、本入口、ゲートA検査器、返値、期待値を差し替える経路を作らない。

合成検査用のin-process runnerが受け取るfilesystem adapterとbuilder adapterは元設計どおり維持するが、どちらからも本入口を差し替えられない。

## 8. 工程間の受け渡しとhash照合

本入口は保存artifactではなく、同一process内の版付き運搬入口である。運搬中の一時objectへ独自hashを追加しない。

正本との対応は、既存の次のhash鎖で検査する。

| 段 | 実体と照合 |
|---|---|
| 上流のjob・実装・source・Node | 初回と再読取の実byte hash、job固定hash |
| 二つの境界証拠 | 各passの実byte hash・canonical hash、B1 jobの固定三hash、二passの実byte一致 |
| `checkReport` | 既存ゲートA検査器の生返値。独立保存せず、内包レポートの一fieldとして保持 |
| 内包レポート | 既存serializerで二回生成し、実byte・actual SHA-256・canonical SHA-256を照合 |
| B1 package | 7ファイルmanifestとpackage validation reportの既存相互hash検査 |

したがって、`checkReport`を含む運搬結果は、保存時には内包レポート全体のactual/canonical hashへ含まれる。運搬一時objectへ別hashを加えて、同じ事実を二つの正本にしない。

## 9. 失敗の帰属

本追補により、既存の失敗帰属を変更しない。

| 観測 | 帰属 |
|---|---|
| 境界証拠を除く生観測から旧形式の土台を作れない | `gate-a-context-gate`の既存code 8 |
| 先行3 check合格後に公開入口が`context-invalid` | package checkerも`context-invalid`、runnerは既存internal診断のexit 2 |
| 内包レポートbuilderがthrow・不正返値・入力変異 | 既存code 48 |
| 二回の内包レポートbyteが異なる | 既存code 49 |
| Gate A完了報告のpath・存在・安全性・hashが不成立、または既存ゲートA report validatorが拒否 | 既存code 9 |
| 有効な内包レポートだがstatusがfailed | 既存code 10 |

本入口が返した正当なfailed `checkReport`を自動修復せず、内包レポートへそのまま運び、既存validatorとB1 checkerに判定させる。

## 10. 必須合成検査

本追補が承認され、B2を再開する場合は、元設計§20へ次を追加する。

### 10.1 純粋入口

- 正常な生観測から`derived`を返す。
- 同じ入力へ二回適用した返値の正式JSON投影がbyte同一である。
- 入力object、配列、境界証拠、Bufferを変更しない。
- 欠落field、未知field、field順違い、疎な配列、不正passは`context-invalid`となり、throwしない。
- 既存ゲートA検査器が正当にfailedを返すfixtureでも`derived`となり、生のfailed結果を保持する。
- 本入口の`checkReport`と、手書きの固定legacy context fixtureを既存ゲートA検査器へ直接渡した結果がbyte同一である。固定legacy fixtureに対応するraw入力fixtureも対で保存し、test用mapperや追加exportを作らない。
- package coreの公開入口集合が、本入口を一件追加したexact集合と完全一致する。

### 10.2 実物と同一経路

- package runnerが本入口を静的importし、`evidence-gate`合格後に呼ぶ。
- package runnerが既存ゲートA検査器を直接importしない。
- `gate-a-context-gate`と本入口が同じprivate共通処理を使い、package checkerが旧形式写像・ゲートA検査器呼出しを別実装しない。
- 同じ正常raw fixtureと同じ不成立raw fixtureについて、`gate-a-context-gate`と本入口が同じprivate土台導出結果へ到達することを検査する。不成立時は前者が既存code 8、後者が`context-invalid`となり、帰属だけが段階に従って分かれることも確認する。
- 合成runnerのspy builderが受け取った二回の内包レポート入力は、本入口の`derived.value`とdeep exact一致する。
- 同じ合成入力で、runnerが作る内包レポートbyteと、本入口の返値を既存builderへ渡して作ったbyteが一致する。
- production runner sourceに、本入口を迂回する別の旧形式写像や直接checker呼出しが無いことを構文解析で確認する。

### 10.3 注入口なしと回帰

- production CLIはjob path一件だけを許し、0件・2件を拒否する。
- job、CLI引数、stdin、環境変数、global hookから本入口・検査器・返値・期待値を差し替えられない。
- package runnerの既存filesystem adapter・builder adapterのfield集合を増やさない。
- 元設計のB1合成検査を全件再実行する。
- ゲートA 21/21と残存source atom 50/50を全件再実行する。
- candidate 13読み取り専用preflightは、追補実装後のB2全検査合格時だけ一回実行する。

正式入力生成、prompt登録、Gemini、正式表示計画、指示書、描画は引き続き行わない。

## 11. 実装契約完全性チェックの再発分析

今回の停止は、実装系契約の完全性確認で防ぐべき3回目の同型停止である。不足していた対象は次の三種類だった。

1. ゲートA: 成果物schema、違反コード、終了コード、環境固定、入出力範囲など9項目と、条項間の範囲矛盾。
2. ゲートA: 設計済み検査を、正本定義済み入口から実行できない検査可能性不足。
3. ゲートB1: 前工程の検査結果を、下流の組立処理へ渡す正式経路が無い工程間受け渡し不足。

B1設計§21は、自工程内部のschema、API、I/O、検査入口を確認したが、producerからconsumerへ必要値が到達できるかを辺ごとに確認していなかった。「検査可能性」と「工程間到達性」は別の確認である。

実装契約完全性チェックへ、次を標準項目として追加する。

### 工程間の受け渡し（入口・形式・hash照合）

下流工程の各必須入力について、承認前に次を一行ずつ固定する。

1. 値を作る上流producerと版。
2. productionが使う版付き入口。
3. 運搬形態が値、byte、file、参照のどれか。
4. exactな運搬形式とfield順。
5. 値を受ける下流consumerとexact入力field。
6. hashを持つ場合、計算する側、再照合する側、actual byteとcanonicalの区別。
7. 不一致時の停止点、違反コードまたはuntrusted診断。
8. productionと合成検査が同じ経路を使う証拠。

暗黙の再計算、再構成、未承認wrapper、未承認export追加で辺を補わない。一時的な全てのJS objectへ機械的にhashを増やすのではなく、運搬形態と既存hash鎖のどこへ含まれるかを明記する。

### 本追補への自己適用

| 確認 | 固定位置 | 結果 |
|---|---|---|
| producer | §3・§5。private共通写像で旧形式土台を一度作り、既存ゲートA検査器を公開入口内で一度呼ぶ | 固定 |
| production入口 | §3・§7。版付き純粋入口一件 | 固定 |
| 運搬形態 | §5。in-memoryのexact object | 固定 |
| consumer | §5・§7。既存内包レポートbuilder | 固定 |
| hash照合 | §8。既存入力・証拠・内包レポート・packageのhash鎖 | 固定 |
| 不一致時 | §7・§9。既存codeまたは既存exit 2診断 | 固定 |
| 同一経路検査 | §10.2 | 固定 |
| production注入口なし | §7・§10.3 | 固定 |
| candidate固有値の分離 | §3・§4・§8 | coreへ固有値なし |

## 12. 実装時の変更範囲

本追補が承認された場合、B2再開時に変更できるのは、元設計§22のB2範囲と次だけである。

- package coreの公開入口集合へ§3の一件を追加する。
- package checkerのゲートA旧形式の土台写像を§3のprivate共通処理へ、既存ゲートA検査器呼出しを§3の公開入口へ一本化する。
- package runnerが§3を静的importし、`evidence-gate`と内包レポートbuilderを接続する。
- package合成検査へ§10を追加する。

ゲートA三実装、ゲートA正式job、B1 job schema、B1の57違反コード、7ファイルschema、semantic core/runnerの公開契約は変更しない。

本追補の承認は実装承認を兼ねるかどうかを、承認文で明示する。兼ねる場合でも許可範囲はB2だけであり、正式package、prompt、Gemini、正式指示書、描画へ進まない。

## 13. 承認依頼文

> candidate 13基本テロップのゲートB1・ゲートA検査結果受け渡し入口追補v001を承認する。package coreへ、B1の生観測から既存ゲートA検査器を一度呼び、内包レポートbuilderの7項目を返す版付き純粋入口を一つ追加する。境界証拠前の`gate-a-context-gate`と公開入口は、package core内の同じprivate旧形式土台写像を使う。package checkerとpackage runnerは同じ公開入口を使い、runnerからゲートA検査器を直接importせず、production CLI・job・環境変数・stdinへ差し替え口を作らない。成功返値は既存builderへそのまま渡し、既存の違反コード・診断・7ファイルschema・hash鎖を維持する。本承認は、元B1設計§4.1・§4.2・§4.5・§7.2・§20.4・§21の本追補記載範囲の改訂承認と、B2の実装・合成検査・既存回帰・candidate 13読み取り専用preflight再開を兼ねる。承認コミットでは、元B1設計§25へ本追補名・上書き条項・承認日を案内行として追記し、DECISIONS・HANDOVERを承認済みへ同期する。正式入力生成、prompt登録、Gemini実走、指示書、描画は含めない。
