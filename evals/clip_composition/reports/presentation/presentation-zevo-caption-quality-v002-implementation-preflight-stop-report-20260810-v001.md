# ZEVO字幕品質v002 実装前閉包停止報告 v001

- 日付: 2026-08-10
- 対象正本: `presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md`
- 対象正本SHA-256: `44fb6199a80663657bf056df0118def3db750fe65813d86e9d106cdc4f42d6e4`
- 開始HEAD: `542b35684a3ad67dbab042ca2bb3bff022e42023`
- 状態: **実装前停止**
- API通信: 0回
- 費用: US$0
- 正式検査: 未開始
- 正式描画: 未実施

## 1. 結論

承認済み設計のexact module surfaceでは、page/line planが必須とする2値を正規の入力から作れない。さらにrender planについても、「正式byteを保存して再読した証拠」をbuilderへ渡す入口がない。

これらを実装内の推測、path組立て、再直列化で埋めると、承認済み設計の「検証済み成果物だけを後段へ渡す」という意味を変える。そのため、14 pathの実装・検査へ入らず停止した。

本停止は実装バグでも検査不合格でもない。**exact入口と必須成果物fieldの間に残った実装契約の閉包不足**である。

## 2. 確定した観測

### 2.1 page/line plannerの必須欠落

| 必須値 | 正本の要求 | 現行builder入力 | 判定 |
|---|---|---|---|
| page/line plan ID | `<proof jobId>-<caseId>-page-line-v003` | `caseId`はあるがproof job IDはない | 同じ入力一式を異なるproof jobが使えるため一意に作れない |
| selection reportの実binding | schemaと後段照合で必須 | report値はあるが、実fileのpath・file SHA・canonical SHAはない | report自身から作ると実在・再読を証明できない |

現行入口は次の6種の値だけを受ける。

```text
source package / selection / selection report / meaning package / case ID / verified dependencies
```

一方、proof jobはproof job IDとselection report bindingを既に持つ。runnerには値があるが、planner入口へ渡す線だけがない。

### 2.2 render planの検証証拠欠落

render planはoutput requestの実bindingを必須とし、未実在・未検証のrequestを拒否する契約である。正式順序も「output requestを正式byteで保存し、stable再読してbindingを確定してからrender planを作る」と固定されている。

しかし現行render builderはparsed output requestを受けるだけで、stable再読後のbindingを受けない。request IDと固定pathからbindingの値を再構成することはできても、それは実fileを読んだ証拠にならない。

render plan IDもoutput request IDから文字列変換できるが、その導出はexact builder契約に書かれていない。実装者判断を残さないため、runnerが確定値を明示的に渡す形が最小である。

### 2.3 循環や推測で埋められない理由

- selection report自身へ自分のbindingを入れると、自身のSHAを自身のbyteへ含める循環になる。
- output request自身へ自分のbindingを入れる場合も同じ循環になる。
- objectを再直列化してSHAを作る方法では、正式pathにそのbyteが実在し、stable再読できたことを証明しない。
- 兄弟pathや固定file名からpathを推測する方法も、実在・無改変の証拠にはならない。
- hidden metadata、global map、暗黙のrunner状態はexact interface外であり採用できない。

## 3. 帰属

| 三分法 | 判定 | 根拠 |
|---|---|---|
| 実装が契約に届いていない | 該当しない | 正式実装attempt開始前に発見し、途中実装を全撤回した |
| 検査・fixtureが契約とずれている | 該当しない | 正式検査は未開始 |
| 契約が実装に必要な入力を閉じていない | **該当** | exact builder入力から必須ID・実bindingを供給できない |

既存production、既存3本、A-v002記録対象成果物、stable tagに異常を観測していない。

## 4. 14 path水平確認

### 4.1 非一意の欠落が確定した箇所

- page/line planner: proof job ID
- page/line planner: selection report binding

### 4.2 実在・stable再読の証拠を渡せない箇所

- render plan builder: output request binding

### 4.3 同型欠落なしと確認した箇所

- source package: job ID、固定job path、formal byte規則からjob bindingを閉じられる。
- B5/B6: runnerがjob pathを直接受ける。
- selection: job ID・attempt・output rootと固定成果物名から必要値を閉じられる。
- output request: proof jobとcase contextから全値を作れ、bindingはrunnerが保存・再読後に持てる。
- review/completion: runnerが先行成果物をstable再読した後に全bindingを持てる。循環はない。
- common core: 正式公開成果物ではないmodule間projectionであり、completionがrender planの実bindingを最終的に保持する。

### 4.4 今回は確定しない論点

render plan自身へpage/line plan bindingも保存するかは、現在のschemaでは要求されていない。completionが両成果物を束縛するため、今回の最小追補に自動で加えない。render plan単体で直前成果物の来歴まで閉じる要件に変えるなら、別の明示裁定が必要である。

## 5. 推奨する最小追補

schema、14 path、47違反code、新規46検査の総数を変えず、exact module surfaceとproof runnerからの受け渡しだけを次のように固定する。

| 入口 | 追加する値 | 正規の供給元 |
|---|---|---|
| page/line planner | `proofJobId` | strict decode・validate済みproof job |
| page/line planner | `selectionReportBinding` | proof jobが束縛し、runnerが現物再読で再照合したbinding |
| render plan builder | `renderPlanId` | proof job IDとcase IDからrunnerが固定規則で作る値 |
| render plan builder | `outputRequestBinding` | output request正式保存・stable再読後のbinding |

plannerの推奨入口は次の意味になる。

```text
source package / selection / selection report / selection report binding /
meaning package / case ID / proof job ID / verified dependencies
```

render builderは既存入力にrender plan IDとoutput request bindingを加える。builderは、渡されたbindingとparsed requestの正式byte・pathをexact照合し、runnerが再読した証拠だけを成果物へ写す。

### 5.1 検査の追記

- proof job IDの欠落・形式違反を拒否する。
- plannerがproof job IDから固定plan IDを作ることを検査する。
- selection report bindingの欠落・別attempt・SHA不一致を拒否する。
- output request bindingの欠落・未実在・別attempt・SHA不一致を拒否する。
- builder内のpath推測、再直列化による自己binding製造が0件であることを静的・実枝の両方で確認する。

既存46件のどのIDを置換・拡張するかは追補内で一件表として固定し、件数を暗黙に増減させない。

## 6. 現在のattempt状態

- exact 14 implementation path: **14/14不在**
- 途中実装: **0 path**（発見時に撤回し、開始状態へ戻した）
- 既存pathのproduction変更: **0件**
- 正式検査/TAP: **0件・未開始**
- API通信/countTokens/generateContent: **0回**
- 正式成果物・描画: **0件**
- approval記録: `DECISIONS.md`へ本承認の一行のみ追加

保存済みA-v002旧render plan 6件は開始時照合値のままである。

| 種別 | SHA-256 |
|---|---|
| voice-013 横型 | `86d8769415b00c5a9379164fdaa209e07b78a0179745382d67612cb1a19cbd5e` |
| voice-013 縦型診断 | `5ebed5a6bb21e29af5c347e17af619737e2b06db55fd4d82336c8ad43cce1ca5` |
| voice-067 横型 | `4c82f3ecd81153befcc4ce470322a4fdbe6a777441fb0ff89f03a2d9c256c0e3` |
| voice-067 縦型診断 | `476fe41ad5b0e659641819f78e49f7b992044f37cf2f9bb56b6973decad1ff92` |
| voice-190 横型 | `613f2862bc6ed7a331a37dad0c03b94fbf0d17b8a1d04958790d9f80d3b72e01` |
| voice-190 縦型診断 | `f153fc409cbb07a9514a80c0f27c6c7f165495ffd23c6eda68ed0b49b139d317` |

## 7. 実現性調査の見逃し記録

本件は、設計の冒頭調査が既存入口・schema・pathの実在までは確認した一方、**各成果物の必須fieldをexact builder引数の供給元まで逆向きに一件ずつ追う確認**を完了していなかったため事前に残った。

今後の完全性チェック候補として、次を追加する必要がある。

> 各正式成果物の全必須fieldについて、正規の供給元、検証済みとなる時点、module境界を越える引数、非循環性を一行ずつ示す。実fileのbindingは、値の再構成可能性ではなくstable再読証拠の受け渡しまで確認する。

この改訂自体は本停止報告ではDECISIONSへ追加せず、人間承認を待つ。

## 8. 停止点

承認済み停止条件の「契約改訂が必要」に該当したため停止する。実装、検査、API通信、描画へは進まない。

## 9. 次の承認依頼文案

> 相談役レビュー済み。kawafmm裁定: ZEVO字幕品質v002実装前閉包停止を受理し、最小実装契約追補の起草を承認する。追補は、page/line plannerへproof job IDと検証済みselection report binding、render plan builderへrunner確定のrender plan IDとoutput requestのstable再読bindingを明示入力として追加する。schema、14 path、47違反code、新規46検査の総数は原則不変とし、検査IDの置換・拡張は一件表で固定する。render planへpage/line plan bindingを追加するかは自動決定せず、現行completion束縛で十分かを追補で一行確定する。全必須fieldの供給元・検証時点・module受け渡しを逆向きに照合した閉包表を付ける。追補提示で停止し、実装再開は別承認とする。
