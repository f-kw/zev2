# candidate 13 字幕表示計画 B4 8不合格診断・契約確定追補 v001

- 日付: 2026-07-25
- 対象: B4正式合成検査85件中の不合格8件
- 状態: **診断と契約確定追補の提示。実装・検査再実行は未承認**
- 人間作業: 0件

## 1. 結論

8件は、検査が実装後の不整合を検出した正常な停止である。今回の停止は、実装者判断を要する未確定を実装前に見つけた停止ではない。したがって、地雷探知の「人間判断残件0件」宣言は破られていない。

診断では、次の事実を確定した。

1. 2件は、空素材台帳の正しいfieldを実装が読み違えた実装バグである。
2. 2件はその実装バグから正常構築ができなかった派生である。
3. 違反帰属4件では、承認済み契約内に「単一変異は一件へ帰属」と「派生違反の併発可」が同時にあり、所有者を一意に決める規則が不足している。
4. 水平確認で、構築失敗時の正式報告について「成果物はゼロ」と「6成果物の参照必須」が両立しない別の契約矛盾を確認した。

契約矛盾が見つかったため、通常の実装修正設計には進まない。本書を承認済み契約の版付き追補案として提示し、承認後にだけ実装修正へ進む。

## 2. 参照した正本

次を正本として照合した。

1. `presentation-candidate13-caption-gate-b4-display-plan-contract-design-20260725-v001.md`
2. `presentation-candidate13-caption-gate-b4-implementation-contract-addendum-20260725-v001.md`
3. `presentation-candidate13-caption-gate-b4-v003-contract-core-implementation-addendum-20260725-v001.md`
4. `presentation-candidate13-caption-gate-b4-contract-closure-and-approved-document-recovery-addendum-20260725-v001.md`
5. `DECISIONS.md`のR2案Aと実装契約完全性チェック
6. 正式合成検査TAP `/private/tmp/b4-synthetic-85.tap`
7. 現行B4実装と85件の検査実体

正式合成検査85件は再実行していない。診断では、保存済みTAP、静的なコード照合、既存入力生成処理を公開せずに呼び出す読み取り専用観測だけを使った。

## 3. 8件の帰属

| 検査 | 表面上の不一致 | 一次帰属 | 確定した原因 | 本追補後の解消見込み |
|---|---|---|---|---|
| T018 | 期待1件に対し3違反 | 契約矛盾 | atom ID欠落から、文字網羅・本文・終端の3違反が派生した。単一leaf probe一件契約と、18/19/20併発可の記述に所有者優先がない | §6.1の三表現照合と同一leaf派生抑制で、code 18一件へ固定 |
| T023 | 元発話ID重複で、先に字幕計画側の文字網羅違反が出た | 契約矛盾 | 壊れた元発話列を字幕計画検査が親の比較材料に使い、後段の正しい子違反が固定順で隠れた | §6.2の子不正先行判定でcode 23を可視化 |
| T026 | 元発話追加で、字幕計画側の文字網羅違反が出た | 契約矛盾 | 字幕計画内は自己整合しているのに、元発話側のextraを字幕計画の欠落として帰属した | §6.2の所有者規則でcode 26へ固定 |
| T027 | 元発話逆順で、字幕計画側の文字網羅違反が出た | 契約矛盾 | 元発話側の順序不正を、先に走る字幕計画との列不一致へ帰属した | §6.2の所有者規則でcode 27へ固定 |
| T080 | 正常入力を5成果物へ構築できない | 実装バグ | 空素材台帳の配列名は`materials`だが、実装が存在しない`entries`を読んでlayout検査を失敗させた | 正本fieldへ実装を合わせれば解消見込み |
| T081 | 同一入力の決定性確認以前に構築失敗 | 実装バグ | T080と同じ一原因。二回ともlayout段で停止 | T080と同じ修正で解消見込み |
| T082 | 正常CLIが終了2 | 実装バグ | T080のため成果物ゼロとなり、正式報告を作る段でfatalへ落ちた | T080修正で正常経路へ戻る見込み。ただし構築失敗報告の契約矛盾は§6.3で別途解消必須 |
| T083 | 契約不合格CLIが終了2 | 実装バグ | 本来は成果物構築後に既存出力をcode 63で拒否する入力だが、T080が先に発生してfatalへ落ちた | T080修正でcode 63のtrusted failed reportへ戻る見込み。ただし§6.3を先に確定 |

検査バグに帰属するものは0件である。85件の一件表は、T018・T023・T026・T027を含め期待codeとpathを明記しており、検査側はその正本どおりに不一致を検出した。

## 4. 読み取り専用診断の観測

### 4.1 違反帰属4件

保存済み入力生成処理から同じpure checker入力を再構成し、違反列だけを観測した。

| 検査 | 実際の違反列 |
|---|---|
| T018 | `COMPILER_ATOM_COVERAGE_INVALID`、`COMPILER_TEXT_MISMATCH`、`COMPILER_ANCHOR_MISMATCH` |
| T023 | 固定順で残ったものは`COMPILER_ATOM_COVERAGE_INVALID`。後段の元発話違反はcutoffで非表示 |
| T026 | 固定順で残ったものは`COMPILER_ATOM_COVERAGE_INVALID`。後段の元発話違反はcutoffで非表示 |
| T027 | 固定順で残ったものは`COMPILER_ATOM_COVERAGE_INVALID`。後段の元発話違反はcutoffで非表示 |

元発話の不正を親側へ波及させる現行挙動は、R2案Aの「壊れた子は親集計へ部分利用せず、子自身の違反として可視化する」と整合しない。

### 4.2 正常構築4件

正常構築入力を同じpure builderへ渡し、正式検査を再実行せず失敗段階だけを観測した。

```text
status: failed
failureStage: layout-inspection
```

空素材台帳の正本は次である。

```json
{
  "registryVersion": "presentation-material-registry-empty-v001",
  "materials": []
}
```

現行実装だけが`entries`を参照していた。これにより、空台帳が正しいにもかかわらず`materialRegistry`検査が不合格になった。

正常CLIの診断出力は終了2かつ
`CAPTION_B4_FORMAL_CLI_JOB_CONTEXT_UNAVAILABLE`
だった。これはlayout段の構築失敗後に、成果物の存在を前提とする正式報告作成へ進んだ派生である。

## 5. 水平確認

### 5.1 字幕計画内の派生違反

- 同じ実装箇所: 1箇所。字幕計画のatom列、本文、anchorを一つの関数で順次検査する箇所。
- 現在の不合格: T018の1件。
- 残り77件: 本文だけを壊すT019、anchorだけを壊すT020は合格している。構造不成立を先に止めるT014〜T017も合格している。
- 未検査の同型: atom列の置換・重複・逆順と本文／anchorの派生不一致。別の実装箇所はないが、同じ一箇所で再現しうる。

### 5.2 壊れた元発話を親比較へ使う経路

- 同じ実装箇所: 1経路。字幕計画検査へ元発話列を渡した後、元発話検査を実行する順序と、先に失敗したcheck以降を隠すcutoff。
- 現在の不合格: T023、T026、T027の3件。
- 残り77件: 元発話binding、shape、時刻、話者のT021・T022・T024・T025は合格している。表示計画以降の一件probeにも同じ誤帰属は観測されていない。
- 未検査の同型: 元発話のmissing側。extra側のT026と同じ所有者問題を持つ。

### 5.3 空素材台帳fieldの読み違い

- 誤った`entries`参照: B4経路内で1箇所。
- 正しい`materials`の利用: 正式台帳、初期台帳検査、既存instruction検査で確認。
- 現在の不合格: T080〜T083の4件。
- 残り77件: 同じ誤fieldを読む別実装はない。

### 5.4 構築失敗時の正式報告

- 成果物が無い場合にも6成果物を無条件参照する箇所: runner内の正式報告作成1箇所。
- 無条件参照: 5 content artifactとmanifestの計6参照。
- 現在の表面化: T082・T083でlayout失敗後にfatal終了2となった経路。
- 既存85件での穴: T060はpure checkerへ`BUILD_FAILED`を与えるだけで、成果物ゼロから正式failed reportを組み立てる経路を通らない。

ここは実装だけの問題ではなく、次節の契約矛盾があるため、実装修正へ進めない。

## 6. 契約矛盾と確定案

### 6.1 code 18・19・20の所有者

現行契約には次が同時にある。

1. code probeは一つのvalid fixtureの一leafだけを壊し、期待code一件だけを観測する。
2. T018は`sourceAtomIds`を一件欠落させ、code 18一件を期待する。
3. code 18は19・20と併発可と書かれている。

`sourceAtomIds`を欠落させると、元の本文と終端anchorを維持したままでは、本文とanchorも現在のID列に一致しなくなる。現在の記述だけでは、一leaf由来の派生2件と、独立して壊れた2leafを区別できない。

本追補では、三つの冗長表現を使う所有者判定を正本にする。

1. ID表現: `sourceAtomIds`
2. 本文表現: 元発話文字を連結した本文
3. 範囲表現: start/end anchorが示す元発話の連続区間

判定:

- 本文表現と範囲表現が一致し、ID表現だけが違う: code 18だけ。
- ID表現と範囲表現が一致し、本文表現だけが違う: code 19だけ。
- ID表現と本文表現が一致し、範囲表現だけが違う: code 20だけ。
- 一致する二表現を特定できない複数leaf不正: 不一致したcodeを固定順で併記できる。

これにより、T018はcode 18一件、T019は19一件、T020は20一件となり、別leafを同時に壊した場合だけ併発を保てる。

この条項は、実装契約追補§10.3のcode 18〜20の「併発・抑制」と、§10.5の抑制規則を上書きする。

### 6.2 字幕計画と元発話の所有者

所有者判定はR2案Aを適用し、次の順で行う。報告上の17 check順は変更しない。

1. 元発話のbinding、shape、ID重複、時刻、話者、時刻順を先に内部判定する。
2. 元発話が不正なら、その元発話を字幕計画のcoverage比較へ使わない。不正はcode 21〜25または27として可視化する。
3. 字幕計画の各行について§6.1の三表現が自己整合するかを判定する。
4. 字幕計画側だけが不整合ならcode 18〜20へ帰属する。
5. 字幕計画の三表現が自己整合し、字幕計画全体と元発話列の集合だけが違うならcode 26へ帰属する。
6. 集合が同じで順序だけが違う、または元発話自身の時刻順が逆転するならcode 27へ帰属する。

壊れた子を親比較へ使って親違反を作らない。除外した事実は子の違反として残し、隠蔽しない。

この条項は、実装契約追補§10.3のcode 18・23・26・27と§10.5を上書きする。17 checkの表示順、違反code順、JSON pathは変更しない。

### 6.3 構築失敗時の正式報告

現行契約には次の矛盾がある。

1. pure builderが失敗した場合、`artifacts: null`とし、部分成果物を正式byteにしない。
2. code 60 `BUILD_FAILED`を正式違反として持つ。
3. CLI終了1はtrusted failed reportを返す。
4. validation reportの`outputBindings`は、5 content artifactとmanifestの6件をすべて非nullのhash bindingとして必須にする。

成果物ゼロのまま4を満たすことはできない。現在のrunnerは6件を無条件参照して例外となり、終了2へ落ちる。

本追補ではvalidation reportを
`presentation-caption-display-pair-validation-report-v002`
へ改訂し、v001との後方互換を作らない。

`outputBindings`は6 fieldの固定objectを維持し、値を次の二状態に限定する。

1. builder成功後: 従来どおり6件すべてが非nullの`{path,fileSha256,canonicalSha256}`。
2. builder失敗かつcode 60を信頼して作れる場合: 6件すべてが`null`。

混在は不正とする。部分成果物のhashをfailed reportへ載せない。

builder失敗reportの追加契約:

- `status`: `failed`
- `failureStage`: code 60の`details.stage`にある固定builder stage
- `outputBindings`: 6件すべてnull
- `reviewState`: null
- `observedProjection`: 既存契約どおり、必要構造が揃わなければ全field null
- report validatorへ渡す`artifactBytes`: 空配列
- report validatorへ渡す`manifestBytes`: null
- 正式出力rootへ何も公開しない
- stdoutへtrusted failed report一件、stderr 0 byte、CLI終了1

成果物なし、code 60なし、またはreport自体を再検査できない場合だけ終了2とする。

v002 reportの`failureStage`は次で固定する。

- `passed_pending_human_review`: null
- code 60を持つ`failed`: code 60の`details.stage`
- code 60を持たない`failed`: 17 check固定順で最初に`failed`となったcheck名

report builderはB4 coreの版付きpure入口
`buildPresentationCaptionDisplayPairValidationReportV002`
とする。report validatorは
`validatePresentationCaptionDisplayPairValidationReportV002`
へ改訂する。production runnerはv002 builderとvalidatorだけを使い、v001 reportの受理、runner内と検査用の同等ロジック複製、暗黙変換を行わない。

### 6.4 空素材台帳の正本field

material validation indexの正本shapeは
`{registryVersion, materials}`
である。空台帳の成立条件は`materials`が配列かつ0件である。

`entries`は存在しないfieldであり、受理・fallback・別名変換を禁止する。実装だけを`materials`へ合わせる。台帳、hash、registry versionは変更しない。

## 7. 承認後の実装修正範囲

本追補が承認された場合だけ、次の版付き修正設計を正本として実装へ進む。

1. 字幕計画のatom列・本文・anchorを§6.1の順で判定する。
2. 元発話の内部不正を親比較から除外し、§6.2で所有者を固定する。
3. layout検査の空素材判定を`materials`へ修正する。
4. validation report v002のpure assemblyとvalidatorを実装し、runnerは同じ入口を使う。
5. v001 reportを受理する互換分岐を作らない。
6. T018・T023・T026・T027の期待値は変更しない。
7. T060の同じ1検査内で、成果物ゼロのcode 60からv002 failed reportを構築・再検査できることまで確認する。検査総数85は増やさない。
8. T080〜T083の期待値は変更しない。
9. T085はproduction runnerが新しいpure report assembly入口を直接使い、代替入口を持たないことも確認する。

修正対象の見込み:

| 原因 | production対象 | 検査対象 | 期待変更 |
|---|---:|---:|---|
| 三表現の帰属 | 1ファイル・1検査領域 | T018〜T020、T023、T026、T027 | なし |
| 子不正の親利用禁止 | 同じ1ファイル・1受け渡し領域 | T021〜T027 | なし |
| 空素材field | 同じB4 core内1行相当 | T080〜T083 | なし |
| failed report v002 | B4 coreとrunnerの共有入口 | T060、T082〜T085 | schemaだけv002へ更新、合否意味は不変 |

正確な変更行数は実装前に固定しない。対象fileと入口を追補承認後の修正設計で一意化し、別の契約判断が必要なら実装前に停止する。

## 8. 再検査

実装は本追補と別承認である。承認後の実行順は従来どおりとする。

1. 合成検査85件を先頭から1回。
2. 69違反codeの全発火とexport集合の完全一致。
3. 回帰95件。
4. candidate 13読み取り専用preflight。
5. 完了報告。

不合格1件でも同attemptで修正・再実行せず停止する。

## 9. 承認依頼

次の一件を承認対象とする。

> B4 8不合格診断・契約確定追補v001を承認する。§6.1〜6.4による既存B4契約の改訂、validation report v002への非互換改訂、§7の範囲での版付き実装修正設計の起草を許可する。実装・85件再実行・回帰・preflightは修正設計の別承認まで行わない。
