# ZEVO字幕品質v002 v015 F正式attempt-0008 限定修正記録 v001

- 日付: 2026-08-14
- 判定: 不合格を保存し、新attemptへ進む
- 通信: 0回
- 費用: US$0

## 1. 事実

- 固定Node、固定TSX CLI絶対path、`--test`、固定PATH、`NODE_OPTIONS`不存在、native arm64、Chromium起動可能を起動前に照合した。
- F局所3件は0/3、終了code 1だった。
- 3件ともdependency importより前の`binding-pre-read`で`job-read / CUE_PROOF_JOB_INVALID`となった。
- 保存済みjobのimplementation bindingは51件、approved contract bindingは16件、runtime data bindingは1件で、全68 bindingの現物SHAはjob記録と一致した。
- productionは再読完了後の件数を旧値67件と比較していた。v015後の正値は`51 + 16 + 1 = 68`件である。

## 2. 三分法

| 分類 | 判定 | 根拠 |
|---|---|---|
| v015実装欠陥 | 該当 | approved contractを一件追加したのに、F productionの再読合計だけが67のままだった |
| fixture・検査設営 | 非該当 | jobは新契約16件と現在実体SHAを正しく保持し、68件全てが一致した |
| 契約解釈 | 非該当 | v015がimplementation 51・contract 16・runtime 1を固定しており、合計68は一意である |

## 3. 限定修正

- 修正枠: 1/2
- F production一pathで開始時再読のexact合計を67から68へ置換する。
- F test一pathでproduction sourceが68を要求することを実読検査へ加える。
- contract、schema、path、code、検査ID、proof 489件、owner件数、fixture値は変更しない。
- attempt-0008のTAP・stderr・終了code・fixtureは上書きせず保持する。

## 4. 証拠

- TAP: `evals/clip_composition/reports/presentation/test-runs/20260814-zevo-caption-quality-v002-v015-f-formal-attempt-0008/tap.log`
- stderr: 同rootの`stderr.log`
- 終了code: 同rootの`exit-code.txt`
- 起動前記録: `presentation-zevo-caption-quality-v002-v015-formal-command-preflight-20260814-v001.json`

## 5. 次の実行

修正後は未使用のattempt-0009 fixture/output rootを使い、同じ正式commandでF局所3件を頭から一度実行する。不合格時は同attemptで直さず、残る修正枠または停止条件に従う。
