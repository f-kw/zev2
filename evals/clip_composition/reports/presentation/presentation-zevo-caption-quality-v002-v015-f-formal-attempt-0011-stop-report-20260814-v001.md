# ZEVO字幕品質v002 v015 F局所正式attempt-0011 完全停止報告 v001

日付: 2026-08-14

## 1. 結論

F局所正式attempt-0011は1/3で停止した。

- ZCQ042: 合格
- ZCQ043: renderer作業rootの既使用拒否で不合格
- ZCQ044: 同じrenderer作業root衝突の派生で、後段負例の保持manifest照合が不成立

帰属は三分法の「fixture・検査設営欠陥」である。環境manifestはrun root、fixture root、出力親、正式出力root、staging rootの5件を単一正本化したが、productionがjob IDとattempt IDから導出するrenderer作業rootを宣言対象へ含めなかった。内部job IDとattempt IDが過去attempt-0009のまま再利用され、同じrenderer作業rootが現存していたため、productionは契約どおり既使用を拒否した。

本再開後の検査設営起因不合格であるため、討ち止めの事前コミットを発効する。いかなる修正、新attempt、U以降の実行も行わず完全停止する。F/U fixture製造の独立工程化は本裁定により採用済みとし、残る人間判断は着工時期と工事範囲だけである。

## 2. 事実

### 2.1 環境要求の単一正本化

既存F test一pathに、F/Uの実行前環境manifestを一箇所だけ置いた。

Fについて宣言した状態:

1. run root: 開始前は不存在、設営後は実directory
2. fixture root: 開始前は不存在、設営後は存在する空の実directory
3. 出力親directory: 存在・非symlink・書込/探索可能
4. proof出力root: 不存在を維持
5. proof staging root: 不存在を維持

U testは直接のfilesystem書込みを持たないため、同じmanifest内で環境要求0件と宣言した。

外側preflightは同じmanifestから宣言→設営→照合を実行し、版付きrecordへ保存した。run rootと空fixture rootは宣言どおり製造され、正式F testの開始前hookも同じmanifestの照合入口を使った。

負例別保持manifestも再確認し、26/26、存在/不存在矛盾0件、未宣言集約root 0件で合格した。

### 2.2 正式attempt-0011の結果

| ID | 結果 | 実測時間 | 到達点 |
| --- | --- | ---: | --- |
| ZCQ042 | passed | 約2.49秒 | 契約束縛、pure入口、module表面、V15証明を通過 |
| ZCQ043 | failed | 約4.51秒 | 最初のcaseのrenderer作業root取得で既使用拒否 |
| ZCQ044 | failed | 約11.51秒 | 後段renderer拒否負例で、最初のcaseが同じ既使用rootにより完了できず保持manifest不一致 |

全体:

- tests: 3
- passed: 1
- failed: 2
- cancelled / skipped: 0 / 0
- 終了code: 1
- signal: null
- stderr: 0 byte
- 全所要時間: 約19.08秒

### 2.3 renderer作業root衝突

production現物は各caseのrenderer作業rootを、固定親の下で次の3値から導出する。

- proof job ID
- attempt ID
- case ID

今回のfixtureは正式出力rootをattempt-0011へ更新したが、proof job IDとattempt IDはattempt-0009の値を保持していた。したがってrenderer作業rootは過去attempt-0009と同一になった。

現物確認:

- 同じrenderer作業rootは正式attempt-0011開始前から存在
- rootの更新時刻は今回attemptより前
- voice-013 / voice-067 / voice-190のwork directoryとlockが保持済み
- voice-013のowner recordも保持済み
- productionはrenderer起動前に当該rootの不存在を検査し、既使用なら拒否する

ZCQ043の正式結果は`rejected / renderer-work / CUE_PROOF_RENDER_FAILED`であり、render planまでの3成果物とrejection reportを保持した。productionの既使用拒否は契約どおりである。

### 2.4 ZCQ044の不合格は派生

ZCQ044の`renderer-rejected-second-case`負例は、1件目を正式rendererで完了させ、2件目だけを故障注入で拒否する設計である。しかし1件目が既使用renderer作業rootで先に拒否されたため、実際の保持成果物は次で止まった。

- voice-013のoutput request
- voice-013のpage/line plan
- voice-013のrender plan
- rejection report

期待manifestが要求したvoice-013の動画/QCとvoice-067の3計画は作られていない。これは負例別manifest構造の矛盾ではなく、共通環境前提の不足から派生した不一致である。

## 3. 三分法

| 帰属候補 | 判定 | 根拠 |
| --- | --- | --- |
| production欠陥 | 該当しない | productionは既使用renderer作業rootを開始前に拒否している |
| fixture・検査設営欠陥 | **該当** | 環境manifestがproductionの導出するrenderer作業rootを閉包せず、旧job/attempt IDによる既存root衝突を事前検出しなかった |
| 契約解釈が必要 | 該当しない | root不存在要求、拒否stage/code、保持成果物の意味は現契約で確定済み |

## 4. 実現性調査・preflightで事前検出できたか

**できた。** productionのrenderer作業root導出式と、fixture内のjob ID・attempt IDを逆引きし、環境manifestへ全導出rootを列挙していれば、正式attempt前に既使用を検出できた。

今回の単一正本化は、開始前hookが直接読む5 pathだけを対象にし、production本体が後段で導出するrenderer作業rootまで逆引きしなかった。これは「fixtureが参照・作成する全path」という承認範囲の閉包不足である。

## 5. 証明上の扱い

- ZCQ042の36 proofだけがTAPでobserved / passedとなった。
- ZCQ043の12 proofは数えない。
- ZCQ044の35 proofは数えない。
- F局所3/3、proof四者exact一致、F工程完了は主張しない。
- 負例保持manifest 26/26は静的・事前整合の合格であり、全負例のproduction実走合格とは扱わない。

## 6. 討ち止めの発効

本件は、本裁定後に再発した検査設営起因不合格である。事前コミットどおり次を行わない。

- renderer作業rootをmanifestへ追加する修正
- proof job ID / attempt IDの更新
- 既存renderer作業rootの削除
- 同attemptの再実行
- 新しいF attempt
- U局所、正式46件、回帰、tree照合
- commit / stable tag

F/U fixture製造の独立工程化は**採用済み**とする。以後、方式採否は問い直さない。

## 7. 人間が決める残項目

### 7.1 着工時期

| 選択 | 内容 | 影響 |
| --- | --- | --- |
| A. スケルトン清書へ統合 | 既定の再構築期に、fixture schema・製造・admission・proof ownerを一気通貫で設計 | 17 path上限やbinding体系を清書と同時に再定義できる。A-v002完了はそれまで保留 |
| B. 清書前に独立着工 | 現draft実装上へ18 path目以降を正式追加し、F/Uを先に閉じる | A-v002完了を先行できるが、後の清書で同じ境界を再構築する可能性がある |

### 7.2 工事範囲

| 選択 | 範囲 | 工事の下限 |
| --- | --- | --- |
| 1. F/U限定 | Fの正常・負例fixture製造とU review fixtureを独立成果物化 | 契約設計、完全実装設計、製造runner、test、admission/receipt、F/U受入配線、回帰 |
| 2. ZEVO局所gate全体 | S/A/L/P/R/F/Uのfixture製造を同じ工程へ統合 | 1に加え、各gateのschema・owner・receipt・proof割当てを全件再閉包 |

現物から確定できるpath下限は、独立runnerとそのtestの2 pathであり、現行17 pathを必ず超える。schema、validator、admissionを既存pathで共用できるかは実現性調査前なので未確定である。推測でexact件数を置かない。

## 8. 証拠

### 8.1 環境manifest三段record

- `presentation-zevo-caption-quality-v002-fu-environment-manifest-preflight-20260814-v001.json`
- SHA-256: `3ec5452f0255095a56407591065d550d7bef5206abaf9dbdd0b2e2a590c092d3`

### 8.2 正式attempt-0011

証拠root:

- `test-runs/20260814-zevo-caption-quality-v002-v015-f-formal-attempt-0011/`

| file | SHA-256 |
| --- | --- |
| `preflight.json` | `be0caed28b7deed7410d14125a595543bcce5a51d4cd2d2e613e1b65f013f186` |
| `tap.log` | `8d9532e499f79ca1498f7f41ddd509e2d54f2b8f7a7691199896bc991319f6d3` |
| `stderr.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `exit-code.txt` | `4355a46b19d348dc2f57c046f8ef63d4538ebb936000f3c9ee954a27460dd865` |
| `signal.txt` | `38e0b9de817f645c4bec37c0d4a3e58baecccb040f5718dc069a72c7385a0bed` |

## 9. 完了・未実施

| 工程 | 状態 |
| --- | --- |
| 環境manifest宣言→設営→照合 | 5件合格。ただしrenderer作業root閉包不足 |
| 負例保持manifest事前整合 | 26/26 |
| F attempt-0011 | **1/3で完全停止** |
| U局所 | 未実施 |
| 正式46件 | 未実施 |
| 直接影響回帰 | 未実施 |
| green 287/287 | 未実施 |
| baseline 86/203 exact | 未実施 |
| 既存5 tree・A-v002記録対象tree照合 | 未実施 |
| commit / tag | 未実施・禁止範囲 |

## 10. 外部作用

- API通信: 0回
- countTokens: 0回
- generateContent: 0回
- 費用: US$0
- 正式描画: 0回
- commit: 0件
- stable tag: 0件

## 11. 副線

- provider再評価v002は受領済みの在庫状態を維持した。
- API接続、公式情報調査、第二provider実走は行っていない。
