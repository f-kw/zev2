# ZEVO字幕品質v002 完全実装設計 binding受け渡し追補 v001

- 日付: 2026-08-10
- 状態: 承認待ち
- 親正本: `presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md`
- 親正本SHA-256: `44fb6199a80663657bf056df0118def3db750fe65813d86e9d106cdc4f42d6e4`
- 起点停止報告: `presentation-zevo-caption-quality-v002-implementation-preflight-stop-report-20260810-v001.md`
- 起点停止報告SHA-256: `f08853a8e14580511eeccb025decb6df9840b33dd207ef1f214a4a7b5effc224`
- 通信: 0回
- 費用: US$0
- 実装・検査・描画: 本追補の範囲外

## 1. 追補の位置づけ

本書は親正本§3.1、§5.7〜§5.10、§9、§10、§13のうち、planner v003とrender v003へ検証済みの実行identity・成果物bindingを渡す配線だけを補う。

本文、時刻、行幅、表示規則、成果物schema、ID形式、status、終了code、違反code、path数、検査ID数は変えない。親正本と本書が食い違う箇所は、本書のexact入口と受け渡し順だけを正とし、それ以外は親正本を維持する。

## 2. 実現性調査

### 2.1 現物照合の結果

| 必須値 | 現在の所有者 | 現在の確定時点 | 親正本の受信入口 | 調査結果 |
|---|---|---|---|---|
| proof job ID | proof runner | proof jobをstrict decode・validateし、job pathとIDを照合した後 | planner/renderとも引数なし | 配線不足 |
| selection report binding | proof runner | proof jobの宣言値とreport実byteのstable再読結果を照合した後 | plannerに引数なし | 配線不足 |
| output request binding | proof runner | output requestを正式保存し、stable再読・strict decode・validateした後 | renderに引数なし | 配線不足 |
| page/line plan binding | proof runner | planを正式保存し、stable再読した後 | completionには既に存在 | render plan schemaへの追加は不要 |
| render plan binding | proof runner | planを正式保存し、stable再読した後 | completionには既に存在 | 閉包済み |

proof runnerは不足3値をすでに正規の工程で確定できる。新しい計算、schema、path、binding製造器は不要である。欠けているのは、確定済みの値をpure builderへ渡すnamed argumentだけである。

### 2.2 「値を作れる」と「現物を検証済み」の分離

- bindingのpathやSHAをobject、ID、兄弟pathから推測して作ることを禁止する。
- builder内でobjectを再直列化し、欠けたbindingを製造することを禁止する。
- selection report bindingは、proof jobに記録済みのbindingを現物へ照合した後、その同じ4-key objectを渡す。
- output request bindingは、proof runnerが正式byteをno-replace保存し、その実byteをstable再読した公開工程で初めて成立する。保存前の予定値はbindingとして扱わない。
- SHA計算は実fileの照合・正式公開を所有する既存処理だけが行う。planner/render builderはSHAを計算しない。
- hidden metadata、global map、process状態、fallbackによる受け渡しを禁止する。

### 2.3 staging読取とformal binding path

proof rootは親正本のatomic root publication規則を維持する。root公開前に作るoutput request、page/line plan、render planのbindingは、次の一意な二層で扱う。

- `binding.path`は検証済み`proofJob.outputRoot`と親正本§8の固定relative suffixから決まる**公開後formal path**とする。staging pathを正式成果物へ記録しない。
- file SHA・canonical SHAは、`<proofJob.outputRoot>.staging`配下の同じ固定relative suffixに実在するbyteをstable再読して得る。
- staging rootがformal rootのexact siblingであること、relative suffixが同一であること、symlinkを含まないことをpublisherが検査する。
- 公開直前stable再読までに全bindingを確定し、全rootのno-replace atomic renameが成功した場合だけformal pathのbindingとして公開する。rename失敗は親正本どおりstagingを保持する公開失敗とする。rename後の新しい再読を合否条件へ追加しない。

これはIDや兄弟成果物からpathを推測する処理ではない。検証済みproof jobの正式output rootと、親正本に既に固定されたpublication suffixを使う既存公開規則の投影である。selection reportは既に公開済みの別rootにあるため、proof job記載のformal pathを直接stable再読する。

## 3. exact入口の改訂

### 3.1 planner v003

親正本§3.1のplanner入口を次へ置換する。

```text
buildPresentationOutputPageLinePlanV003({
  sourcePackage,
  selection,
  selectionReport,
  selectionReportBinding,
  meaningPackage,
  caseId,
  proofJobId,
  verifiedDependencies,
})
```

追加は`selectionReportBinding`と`proofJobId`の2 keyである。named objectは上記8 keyのexact集合とし、欠落・余分を許さない。

proof runnerは、strict decode・validate済みproof job由来の`proofJobId`だけを渡す。この出自保証とID規則の検査はrunnerが既存proof job validatorとjob basename照合で所有し、planner自身はproof jobを再認定しない。plannerは次だけを行う。

1. named argumentの`proofJobId`がprimitive stringであることだけを確認する。新しいID predicateやregexを作らない。
2. `planId=<proofJobId>-<caseId>-page-line-v003`を親正本§5.10どおり作る。
3. `selectionReportBinding`がformal JSON bindingのexact 4 keyであることを確認する。
4. passed selection report、report内selection binding、入力selection、物理・時間projectionの既存照合を行う。
5. 受け取った`selectionReportBinding`をbyteを変えずpage/line planへ写す。

plannerはselection reportのfile SHA・canonical SHAを計算しない。bindingと現物report byteの一致は、proof runnerがplanner起動前に証明する。

### 3.2 render v003

親正本§3.1のrender入口を次へ置換する。

```text
buildPresentationOutputRenderPlanV003({
  outputRequest,
  outputRequestBinding,
  pageLinePlan,
  sourcePackage,
  selection,
  selectionReport,
  meaningPackage,
  proofJobId,
  verifiedDependencies,
})
```

追加は`outputRequestBinding`と`proofJobId`の2 keyである。named objectは上記9 keyのexact集合とし、欠落・余分を許さない。

proof runnerは、strict decode・validate済みproof job由来の`proofJobId`だけを渡す。この出自保証とID規則の検査はrunnerが既存proof job validatorとjob basename照合で所有し、render builder自身はproof jobを再認定しない。render builderは次だけを行う。

1. named argumentの`proofJobId`がprimitive stringであることだけを確認する。新しいID predicateやregexを作らない。
2. `outputRequest.requestId=<proofJobId>-<outputRequest.caseId>-horizontal-request`をexact照合する。
3. `planId=<proofJobId>-<outputRequest.caseId>-render-v003`を親正本§5.10どおり作る。
4. `outputRequestBinding`がformal JSON bindingのexact 4 keyであることを確認する。
5. output request、page/line plan、selection report、selection、meaning package、base media、styleの既存cross-input照合を行う。
6. 受け取った`outputRequestBinding`をbyteを変えずrender planへ写す。

render builderはoutput requestのpath・file SHA・canonical SHAを計算しない。request bindingと正式fileの一致は、proof runnerがrender起動前に証明する。

### 3.3 direct plan ID引数を採用しない理由

停止報告ではrunner確定のrender plan IDを直接渡す案も挙げた。本追補では、両builderへ検証済み`proofJobId`を渡し、既存§5.10の規則で各plan IDを作る形へ閉じる。

これにより、page/lineとrenderが同じ実行identityを一つの正本から参照し、output request IDのsuffix置換や別のID計算を作らない。ID形式そのものは変更しない。

## 4. proof runnerが所有する受け渡し順

caseごとの正式順を次へ固定する。

1. proof jobを正式byteからstrict decode・validateする。
2. job pathのbasenameと`proofJob.jobId`をexact照合する。
3. proof jobが宣言するselection report pathをstable再読する。
4. 実byteのfile SHA、strict decode後のcanonical SHA、schemaをproof jobの`selectionReportBinding`へexact照合する。
5. output requestを既存builderで製造し、固定case staging pathへ正式serializerでno-replace保存する。
6. output requestをstable再読し、strict decode・validateしたstaging実byteのSHAと§2.3のformal pathから`outputRequestBinding`を確定する。
7. plannerへ`proofJob.jobId`、検証済みselection report value、proof jobと現物が一致したselection report bindingを渡す。
8. page/line planを固定case staging pathへ正式保存し、stable再読・strict decode・validateして、§2.3のformal pathを持つbindingを確定する。
9. renderへ`proofJob.jobId`、再読済みoutput request valueとbinding、再読済みpage/line plan valueを渡す。
10. render planを正式保存し、stable再読・strict decode・validateして、§2.3のformal pathを持つbindingを確定する。
11. 公開直前再読でselection report、output request、page/line plan、render planを再照合する。
12. completionで同一caseのpage/line plan bindingとrender plan bindingを既存schemaどおり束縛する。

selection reportの宣言bindingと現物が違う場合はplannerを起動しない。output requestの保存・stable再読が不成立、または再読byteのschema/valueが不成立ならrenderを起動しない。後段成果物を先に作る経路は0件とする。

## 5. owner・停止結果

新codeを追加しない。既存ownerを次のように適用する。

| 観測 | status/owner | 後段 |
|---|---|---|
| formal proof job IDの欠落・余分・型不正 | report 0、CLI `job-read` / `CUE_PROOF_JOB_INVALID` | planner未起動 |
| direct planner named argsの欠落・余分・型不正 | rejected / `CUE_PLANNER_INPUT_INVALID` | page/line plan以後0件 |
| valid object間のreport内selection binding・入力selection・projection不一致 | rejected / `CUE_PLANNER_BINDING_MISMATCH` | page/line plan以後0件 |
| selection reportのread I/O・resource失敗 | fatal / `CUE_PROOF_EXECUTION_FAILED` | planner未起動 |
| proof job宣言bindingとselection report現物の不一致 | rejected / `CUE_PROOF_JOB_INVALID` | planner未起動 |
| render named argsの欠落・余分・型不正 | rejected / `CUE_RENDER_INPUT_INVALID` | render plan以後0件 |
| valid object間のproof job ID・request ID・request内容・plan/report/media来歴不一致 | rejected / `CUE_RENDER_BINDING_MISMATCH` | render plan以後0件 |
| output request再読byteのschema/value不成立 | rejected / `CUE_RENDER_INPUT_INVALID` | render未起動 |
| output requestの書込み、stable再読のI/O・実体変化、公開失敗 | fatal / `CUE_PROOF_PUBLICATION_FAILED` | render未起動 |
| render planの書込み・公開前再読不成立 | fatal / `CUE_RENDER_PUBLICATION_FAILED` | 後段0件 |

既存のrejected/fatal区分、CLI stage、終了code、正式prefix規則を変えない。

## 6. page/line plan bindingをrender schemaへ追加しない裁定案

本追補ではrender plan schemaへ`pageLinePlanBinding`を追加しない。

理由は次の3点である。

1. render builderへ渡すpage/line planは、proof runnerが固定case staging pathへ保存し、stable再読・strict検査したvalueだけである。
2. render planの`captionDisplays`は、その再読済みpage/line planの同名配列をbyte-exact複製する。
3. completionは同一caseの`pageLinePlanBinding`と`renderPlanBinding`を既に束縛する。

render plan単体へ直前artifactの直接来歴まで持たせるのは新しいschema要件であり、本追補の「配線だけ」の範囲を超える。将来その保証が必要なら別改訂とする。

## 7. schema・path・code・検査差分

### 7.1 数量差分

| 項目 | 親正本 | 本追補後 | 差分 |
|---|---:|---:|---:|
| formal artifact JSON schema | 既定集合 | 同一 | 0 |
| formal artifact JSONのexact key | 既定集合 | 同一 | 0 |
| module exact named args | planner 6 / render 7 | planner 8 / render 9 | 各+2 |
| implementation path | 14 | 14 | 0 |
| 既存path変更 | 0 | 0 | 0 |
| 新規違反code | 47 | 47 | 0 |
| 新規検査ID | 46 | 46 | 0 |
| status/終了code | 既定集合 | 同一 | 0 |

本追補文書は統治文書であり、親正本§3の14 implementation pathへ数えない。

### 7.2 影響するimplementation path

既定14 path中、次の6 pathだけが本追補の配線を実装・検査する。

| 親正本番号 | path | 影響 |
|---:|---|---|
| 7 | `presentation_output_page_line_planner_v003.mjs` | exact引数2 key追加、ID生成、binding無変更転記 |
| 8 | `presentation_output_page_line_planner_v003.test.mjs` | planner配線subcase追加 |
| 9 | `presentation_output_render_plan_v003.mjs` | exact引数2 key追加、ID生成、binding無変更転記 |
| 10 | `presentation_output_render_plan_v003.test.mjs` | render配線subcase追加 |
| 11 | `run_presentation_zevo_caption_quality_v002_proof_job_v001.ts` | stable再読済み値だけを両builderへ渡す |
| 12 | `run_presentation_zevo_caption_quality_v002_proof_job_v001.test.mjs` | runner配線・前段停止・completion照合subcase追加 |

親正本番号1〜6、13〜14への影響は0件である。

### 7.3 検査ID差分

検査IDの追加・削除・rename・owner移動・置換は全て0件。次の既存IDへAND条件またはsubcaseを追記し、元の証明文は全て維持する。

| ID | 追記する証明 | 元の証明の扱い |
|---|---|---|
| ZCQ028 | 検証済みproof job IDとselection report bindingをplannerへ渡し、固定plan IDとbinding無変更転記を確認 | 本文・atom・span・frame・projection証明を全保持 |
| ZCQ035 | 同じ8-key入力tupleから同じplan ID・formal byteを得る | 既存決定性証明を全保持 |
| ZCQ036 | planner追加引数の欠落・余分・`proofJobId`非string・binding型不正、既存cross-input不一致を実発火。builder内binding製造0件 | 旧plan拒否と既存改変拒否を全保持 |
| ZCQ038 | render追加引数の欠落・余分・`proofJobId`非string・binding型不正を`CUE_RENDER_INPUT_INVALID`で実発火し、9-key入口と既存render/output request schema不変を確認 | exact schemaと旧schema拒否を全保持 |
| ZCQ039 | output request bindingの無変更転記、proof job ID・request ID・plan ID・全来歴のcross-input一致を確認 | 既存来歴・meaning projection証明を全保持 |
| ZCQ041 | 同じ9-key入力tupleのbyte決定性、builder file I/O・path推測・SHA製造0件 | 既存改変拒否・既存成果物書込み0を全保持 |
| ZCQ042 | proof runnerがstrict検証済みjob IDと、proof job宣言・現物照合が一致したselection report bindingだけをplannerへ渡す。不一致は`CUE_PROOF_JOB_INVALID`でplanner未起動。output requestをno-replace保存・stable再読・strict validateした後、その同一4-key bindingだけをrenderへ渡し、保存前にrenderを起動しない | job・import graph・schema・非循環証明を全保持 |
| ZCQ043 | 正常E2Eでpage/render planのID・bindingがproof jobと実file再読証拠に一致 | 実renderer/QC・work保持証明を全保持 |
| ZCQ044 | output requestの書込み・stable再読I/O・実体変化・公開失敗を`CUE_PROOF_PUBLICATION_FAILED`で実発火し、render未起動・後段0件を確認 | 全publication/fatal/prefix枝を全保持 |

### 7.4 証明消失0のassert

実装後監査で次を要求する。

1. 親正本の検査ID集合、本追補の検査ID集合、export集合、Node test runner観測集合が46/46一致する。
2. 上表9 IDは親正本の証明文を削らず、追加条件との論理ANDである。
3. 親正本の47 `code→owner検査` pairと実装後集合がbyte一致し、実観測47/47である。
4. 親契約§10の14項owner表は変更0である。

## 8. 工程間binding閉包表

| 成果物の必須field | 供給者 | 検証済みとなる時点 | exact引数 | consumer | 出力先 |
|---|---|---|---|---|---|
| page/line `planId` | proof runnerの検証済みjob ID | proof job path/ID検査後 | `proofJobId` | planner | `pageLinePlan.planId` |
| page/line `selectionReportBinding` | proof runner | selection report stable再読・proof job binding照合後 | `selectionReportBinding` | planner | 同名fieldへ無変更転記 |
| render `planId` | proof runnerの検証済みjob ID | proof job path/ID検査後 | `proofJobId` | render | `renderPlan.planId` |
| render `outputRequestBinding` | proof runner | request正式保存・stable再読・strict検査後 | `outputRequestBinding` | render | 同名fieldへ無変更転記 |
| completion `pageLinePlanBinding` | proof runner | page/line plan stable再読後 | runner内部の検証済みpair | completion製造 | case item |
| completion `renderPlanBinding` | proof runner | render plan stable再読後 | runner内部の検証済みpair | completion製造 | case item |

この表のどの行も、成果物値から自身bindingを逆算しない。

## 9. 実現性調査・実装後監査への恒久追記

親正本§13の監査へ次を追加する。

> 正式schemaの全必須fieldについて、供給者、検証済みとなる時点、工程間を越えるexact引数名、consumerの照合、成果物keyへの転記を一件ずつ閉じる。artifact bindingは値を再構成できることではなく、実fileのstable再読証拠が正規の引数で次工程へ渡ることまで確認する。呼出側の自己申告、path推測、その場のSHA製造、hidden metadata、global状態は0件とする。

本追補では§8が**本追補で追加・変更する6 field**への自己適用全件表であり、この6 fieldの未閉包は0件である。親正本の全schema全fieldを再掲した表ではない。一般標準は今後の完全設計で全必須fieldへ適用する。

## 10. 実装再開時の範囲

本追補の承認後に限り、親正本の既承認範囲を次の順で再開する。

1. exact 14 pathを新規作成する。
2. 本追補§9を含む実装後監査を行う。
3. 新規46件を頭から一回実行し、TAP全文を版付き保存する。
4. 直接影響回帰、green 287/287、baseline 86/203 exactを行う。
5. 既存5 treeとA-v002記録対象treeの不変を照合する。
6. 実装完了または停止報告を提示する。

API通信、countTokens、generateContent、費用支出、正式描画は含まない。

15 path目、既存path変更、schema・code・検査ID数の改訂、計算複製、binding推測・自己認定、既存成果物差、不合格1件のいずれかで、同attempt内に直さず停止する。

## 11. 完全性チェック

| 項目 | 判定 | 根拠 |
|---|---|---|
| 現物入口の実在 | 合格 | proof runnerがproof jobと上流成果物のstable再読を所有する親正本§5.9を再照合 |
| 本追補で追加・変更するfieldの供給元 | 合格 | §8の6/6行で供給者を固定 |
| 検証時点 | 合格 | §4で保存・再読・builder起動順を固定 |
| 工程間exact引数 | 合格 | §3.1・§3.2で8/9 key集合を固定 |
| 非循環 | 合格 | bindingは上流実file再読後だけ成立し、自身成果物へ自己bindingを入れない |
| schema閉包 | 合格 | exact artifact schema変更0、既存必須fieldへ値を供給 |
| path閉包 | 合格 | 14 path維持、影響6 pathを固定 |
| code閉包 | 合格 | 47 code・owner変更0 |
| 検査閉包 | 合格 | 46 ID維持、追記9 ID、置換0、証明消失0 |
| 取得可能性 | 合格 | proof job ID・selection report binding・output request実byteはrunnerが各段で取得可能 |
| 禁止事項 | 合格 | binding推測、builder再hash、自己認定、fallback、追加pathを明示禁止 |
| 既存成果物不変 | 合格条件 | 実装後に親正本どおりtree照合。追補起草では変更0 |

## 12. 停止点

本書の提示で停止する。実装、検査、API通信、描画を行わない。

## 13. 承認依頼文案

> 相談役レビュー済み。kawafmm裁定: `ZEVO字幕品質v002 完全実装設計 binding受け渡し追補v001`を親正本SHA-256 `44fb6199a80663657bf056df0118def3db750fe65813d86e9d106cdc4f42d6e4`への追補として承認する。planner v003へ検証済みproof job IDとselection report binding、render v003へ同proof job IDと正式保存・stable再読済みoutput request bindingを明示入力として渡す。builder内のbinding推測、path合成、SHA製造、自己認定は禁止する。formal schema・14 path・47 code・46検査IDは不変、既存9検査IDへsubcaseを追加し証明を削らない。render planへpage/line plan bindingは追加せず、proof runnerのstable再読とcompletionの両plan bindingで閉じる。承認後は親正本の既承認範囲どおり14 path実装→監査→46件→回帰→不変照合→完了または停止報告まで再開してよい。通信0・費用US$0、既存停止条件は維持する。
