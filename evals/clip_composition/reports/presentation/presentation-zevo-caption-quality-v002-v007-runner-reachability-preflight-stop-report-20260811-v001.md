# ZEVO字幕品質v002 v007 runner到達性 preflight停止報告 v001

- 日付: 2026-08-11
- 対象: ZCQ004案B・追補v007の実現性調査
- 結果: 実装開始前停止
- 外部通信: 0回
- 費用: US$0

## 1. 停止結論

kawafmm裁定の案Bと「最終package validatorをS production 1 pathの版付きpure入口として共用する」方向は実現可能である。

ただし、証明二部構成のうち「意味captionの`captionId`空というplain data入力を**正式runner経由**で`rejected / package-validation / CUE_SOURCE_PROMPT_PROJECTION_INVALID`へ到達させる」は、現行の入力検査順では不可能である。

追補v007を裁定1〜4と「完全一致」として起草するには、この不可能性を無視するか、追加のproduction入口・契約判断を暗黙に導入する必要がある。どちらも停止条件に該当するため、v007正本候補を製造せず停止する。

## 2. 現物による到達性の確定

### 2.1 正式runnerの入力経路

`executePresentationOutputCaptionCueSourceJobV001`は、source builderを呼ぶ前に次を行う。

1. 意味packageの正式byteをstable readする。
2. `validatePresentationAMeaningInformationPackageV002`を検査関数として渡す。
3. 不成立なら`binding-mismatch`とし、runnerは`rejected / input-reread / CUE_SOURCE_INPUT_BINDING_INVALID`を返す。
4. 検査成立のmeaning packageだけをsource builderへ渡す。

対応する現物は、source productionの上流再読637〜648行、builder呼出し801〜819行である。

### 2.2 上流meaning packageのcaption ID契約

`validatePresentationAMeaningInformationPackageV002`の内側は、各captionに対し次を必須にする。

- exact 4 key。
- `captionId === caption-<1始まりの6桁ordinal>`。
- dense ordinal。
- 改行を含まない非空本文。
- 1件以上のatom occurrence ID。

対応する現物は`presentation_a_meaning_information_package_v002.mjs`の158〜164行と、それをpackage envelopeから呼ぶ201〜203行である。`captionId:''`はここで必ず拒否される。

### 2.3 実際の最初不成立predicate

| 入力経路 | `captionId:''`の最初不成立 | 実経路の結果 |
| --- | --- | --- |
| 正式runner | 上流meaning packageのcaption ID形式 | `rejected / input-reread / CUE_SOURCE_INPUT_BINDING_INVALID` |
| source pure builder直接 | source builderの簡易meaning envelopeはcaption IDを検査しないため通過し、最終package validatorの再構築map側で不成立 | `rejected / CUE_SOURCE_PROMPT_PROJECTION_INVALID`。builder返値にstageはない |

したがって、source pure builderのcaption ID空枝は49 code中の実code発火証明には使えるが、正式runner経由の`package-validation`実枝証明とは言えない。pure builderのreturnにstageを足す、上流validatorを緩める、runnerへcase input注入口を足す、test専用分岐を作る、のはどれも本裁定の自動範囲には入らない。

## 3. v007の起草可能部分

次の部分は新たな判断なしに値レベルで閉じられる。

1. S production 1 path内で、最終package validatorを`validatePresentationOutputCaptionCueSourcePackageV001`という版付きpure named exportにする。
2. exact一引数はsource package object。返値はexact `status,violations`の2 keyとし、各violationをexact `path,rule`の2 keyにする。順序はroot→prompt→caption ordinal→boundary ordinal→style→reconstruction→provenanceの固定順とする。
3. 正常時は`{status:'passed',violations:[]}`、不成立時は`{status:'rejected',violations:[...]}`。全object/arrayとviolationをfreezeする。
4. runnerの製造後、serializer後、staging再読後の各3箇所は、この同一named functionを呼び、別validatorを作らない。
5. pure入口へのplain data直接入力により、path/SHA/時刻の余分key、空boundary本文、同一boundary IDと本文の重複投影、prompt styleと再構築case styleの不一致を決定的に検査できる。同じ本文が異なるboundary IDで正当に繰り返されるケースは拒否しない。
6. codeの意味は「可視projectionまたは再構築mapを含む最終package検査の不成立」とし、49 code/statusを変えない。
7. ZCQ004の既存4 proofはそのまま残さず、新しい4 IDへ一対一置換してproof総数489、ZCQ004 owner 4件を維持する。詳細IDは正本v007のmarker行から同一抽出器で再導出する。
8. formal jobのapproved contract構成は、source/B5/B6/selection/proofの上流来歴閉包を維持するため、v006後の5/5/6/7/7へv007を1件ずつ加えた6/6/7/8/8とするのが整合的である。この五工程波及を含む実装は、正本v007の承認なしに開始しない。

## 4. ZCQ005の状態

ZCQ005の限定修正は既に閉じている。staging初回`lstat`の`ENOENT`だけを`source-invalid`へ写し、その他例外を再throwして外側catchの`helper-execution-failed`を維持する。欠落、非directory、symlink、identity/type差、binding shape、binding byte差、通常I/Oの7行実発火を新attemptの必須観測にする。

ただしS設営とZCQ004が一体の新attempt条件であるため、ZCQ005だけを先に実装しない。

## 5. TAP SHA errata

実fileを再計測した結果、attempt-0003 TAPの正しいSHA-256は`ffe86e30f4e0dea9f10f76c03004458abcb4cad51613387aa73907c7069e8f39`である。

- attempt-0003停止報告の記載: 正しい。
- S設営・ZCQ005修正設計v001 §1.1の記載: 誤り。
- 誤記の元文字列は上書きず、同設計書§9のErrataで正値を追記した。

## 6. 三分法

| 論点 | 帰属 | 理由 |
| --- | --- | --- |
| pure validatorの版付き共用 | 承認済み契約方向 | S production 1 pathで複製なしに実現可能 |
| caption ID空の正式runner E2E | 契約解釈の追加判断が必要 | 上流正式validatorがbuilder前に必ず拒否する |
| ZCQ005 staging欠落分類 | production欠陥 | 初回`lstat` ENOENTだけが外側既定catchへ落ちる |
| TAP SHA差 | 文書記録誤り | 実file再計測と停止報告の値は一致 |

## 7. 未実施と停止位置

- v007正本候補の製造: 0件
- DECISIONSへのv007 SHA登録: 0件
- production/test/fixture/期待値変更: 0件
- S新attempt: 0回
- A/L/P/R/F/U、正式46件、回帰、green、baseline、tree照合: 未実施
- API通信、countTokens、generateContent、費用支出、正式描画、stable tag: 0件

## 8. 次の裁定で確定する一点

推奨は、二部構成2(a)を次のように字義調整する案である。

> caption ID空のplain dataをsource **pure builder**に渡し、`CUE_SOURCE_PROMPT_PROJECTION_INVALID`のcode実発火を観測する。これは再構築map枝によるcode写像の証明とlabelし、正式CLI runnerの`package-validation`実枝を通過したとは主張しない。runnerの対応stageが`package-validation`であることは、別の共用pure写像入口を設けてrunner/testが共用するか、実発火要求の対象からstageだけを外すかを別途固定する。

「runner経由のexact triple」を維持する場合は、上流meaning package契約を弱めずに達成する新しいproduction最終化入口の役割・exact API・formal runnerとの関係を追補v007で追加裁定する必要がある。

どちらかの明示裁定を受けるまで、S production/testの変更とS新attemptは行わない。
