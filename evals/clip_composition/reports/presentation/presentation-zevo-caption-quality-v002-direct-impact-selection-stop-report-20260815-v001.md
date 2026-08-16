# ZEVO字幕品質v002 直接影響集合誤選択 停止報告 v001

## 1. 結論

fixture consumer path閉包修正後、F局所3/3、U局所2/2、正式48/48まで合格した。続く直接影響回帰では、対象集合の導出方向を誤り、**335件中323合格・12不合格**、終了code 1となったため停止した。同attempt内の修正、green、baseline、tree照合は行っていない。

三分法の帰属は**検査工程の対象集合構築欠陥**である。今回変更した実装を参照する既存検査（consumer側）ではなく、今回の実装が参照する既存部品の兄弟検査（provider側）を15 path選んだ。現物の逆向き照合では、今回の19 pathを参照するtestは正式48件の8 pathだけであり、既存testは0 pathだった。

## 2. ここまでの成立結果

| 工程 | 結果 | 証拠 | SHA-256 |
|---|---:|---|---|
| fixture局所 | 2/2、proof 34/34 | `test-runs/20260815-zevo-caption-quality-v002-fixture-gate-formal-attempt-0004/tap.txt` | `1c78676adaac0e52567dce999a0956b052a002aa4329adfe3b7b9a530c822083` |
| fixture製造 | 48 file、F/U admission合格、formal basename 26/26、malformed 1件専用除外 | `test-runs/20260815-zevo-caption-quality-v002-fixture-manufacture-formal-attempt-0004/stdout.json` | `a9fe3956cc28c2e341fdf0a72304efb9b57ed0023e75fd4f189af85797f6be2f` |
| F局所 | 3/3、proof 83/83 | `test-runs/20260815-zevo-caption-quality-v002-fu-receipt-f-formal-attempt-0004/tap.txt` | `eef27bd3a55d63d9fb689f19df773a3dbed52bc5c4b0cfa034fdb2dbd6a15a64` |
| U局所 | 2/2、proof 16/16 | `test-runs/20260815-zevo-caption-quality-v002-fu-receipt-u-formal-attempt-0001/tap.txt` | `34c71e06ef01ff253db4e7e913912c7e2ac0dfc7a0b548144c8d9d3d8f405566` |
| 正式48件 | 48/48、proof 523/523、stderr 0 byte、signal none | `test-runs/20260815-zevo-caption-quality-v002-formal-48-attempt-0001/tap.txt` | `d38d27e9d0d896c963114703bf3f7b3c8b7f98f7b8790cf20abab28af3598341` |
| 誤った直接影響集合 | 323/335、12不合格、stderr 0 byte、signal none | `test-runs/20260815-zevo-caption-quality-v002-direct-impact-attempt-0001/tap.txt` | `f6032f86a2d8755a7308ceb739797b7757ef80b8608a8fdf32878e2e9cdb4d09` |

正式48件のproof 523件は、ZEVO字幕品質v002本体489件とfixture製造34件の合計である。

## 3. 直接影響集合の誤り

### 3.1 誤った導出

版付き集合v001は、正式8検査が宣言する実装pathと正常proof jobの51実装束縛を合成し、各実装pathと同じbasenameの既存testを15 path選んだ。これは「新実装が使う既存providerの検査」であり、「新実装の変更により直接影響を受ける既存consumer検査」ではない。

失敗証拠として次を上書きせず保持する。

- `presentation-zevo-caption-quality-v002-direct-impact-test-set-20260815-v001.md`
- SHA-256 `53b5a29a6da5e73380f3cdb49f8ad607a163190851fa6098312c1965b94e72dd`

### 3.2 正しい向きの現物照合

今回のproduction/support path名を全test sourceから検索すると、該当したのは次の正式48件の8 testだけだった。

1. source package
2. B5/B6 runner
3. selection
4. page/line planner v003
5. render plan v003
6. proof runner
7. review UI
8. fixture manufacture/admission

これらは正式48/48で既に実行済みである。上記8 path以外の既存testから今回のproduction/support pathへの参照は0件だった。したがって、正しいreverse consumer graphに基づく**既存の直接影響回帰集合は0件**である。

## 4. 12不合格の扱い

不合格IDは次の12件である。

- `OBM001`
- `OEE001`、`OEE002`、`OEE005`、`OEE006`、`OEE007`、`OEE008`
- `OPF002`、`OPF004`、`OPF012`、`OPF015`、`OPF016`

これらは今回の変更pathをimportしていない。よって、このattemptを今回実装の直接回帰不合格として扱わない。一方、各既存検査の内側不合格を「問題なし」とも判定しない。TAPにある旧来歴SHA、loader表現、作業ツリー列挙、git出力buffer等の観測はそのまま保持し、今回の修正理由には使わない。

## 5. 三分法

| 区分 | 判定 | 根拠 |
|---|---|---|
| production欠陥 | 未観測 | 正式48件、F/U局所は全合格。12件はいずれも今回pathのconsumerではない |
| fixture・検査設営欠陥 | **確定** | direct impactをprovider方向へ走査し、対象外15 pathを正式gateへ入れた |
| 契約解釈 | 不要 | 設計§14.1の「直接影響する既存検査」はreverse consumer graphとして現物から一意に導出できる |

## 6. 事前検出可能性

**事前検出できた。** 集合固定時に、各候補testについて「候補testが今回変更pathを実際にimportするか」を一件ずつ確認すれば15件全てを除外できた。provider実装→兄弟testという対応だけで直接影響を主張したことが不足だった。

## 7. 現在地と未実施

- 完了: consumer path閉包、fixture製造/admission、F、U、正式48/48
- 停止: 誤った直接影響attempt 323/335
- 未実施: 正しい直接影響0件の確定記録、green全件、baseline 86/203 exact、既存5 tree、A-v002記録対象tree、完了報告
- API通信0回、countTokens 0回、generateContent 0回、費用US$0、正式描画0回、commit 0件、stable tag 0件

## 8. 再開案

1. 失敗集合v001とTAPを不変保持する。
2. reverse consumer graphの一件表を版付きで固定し、既存直接影響0件を確定する。
3. 正式48/48の保存済みTAPを再利用し、green全件→baseline 86/203 exact→既存5 tree→A-v002記録対象tree照合へ進む。
4. 新しい直接影響test processは0件なので実行しない。15 pathの再実行もしない。

再開はkawafmmの裁定後とする。
