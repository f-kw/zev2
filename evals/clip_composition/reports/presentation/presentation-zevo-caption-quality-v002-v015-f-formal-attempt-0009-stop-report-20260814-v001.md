# ZEVO字幕品質v002 v015 F局所正式attempt-0009 停止報告 v001

日付: 2026-08-14

## 1. 結論

F局所正式attempt-0009は2/3で停止した。ZCQ042とZCQ043は合格し、ZCQ044だけが検査側の保存物集約assertで不合格になった。production、契約、入力fixtureの不合格ではない。

帰属は三分法の「検査設営欠陥」である。最新裁定の最終歯止めに従い、同attempt内の修正、個別修正案、再計画案は出さず、F/U工程を停止する。U局所、正式46件、直接影響回帰、green 287、baseline 86/203 exact、tree照合は未実施である。

## 2. 今回到達したこと

### 2.1 v015の診断・契約・実装

- 保存済み正式証拠により、固定TSX下の相対指定子評価は失敗し、同じ起動形で検証済み絶対file URL評価は成功することを確定した。
- 追補v015を起草し、解決段が検証したURLを評価段へ渡す契約へ改訂した。
- relative literal、19依存閉集合、固定順、一件ずつawait、retry/fallback/並列/二重import 0件は維持した。
- approved contract bindingをsource/B5/B6/selection/proof = 14/14/15/16/16へ更新した。
- proof総数489件、code 49件、検査ID 46件、implementation binding 36/11/19/41/51、path 17件は不変である。

追補v015:

- `presentation-zevo-caption-quality-v002-resolved-url-evaluation-addendum-20260814-v015.md`
- SHA-256: `42874101356eac7c2d76d8a7c75cdc1c77097f7c4ee8391dda2bb80b8d0ce275`

### 2.2 attempt-0008と限定修正1/2

attempt-0008は、v015追加後のproof job binding総数が68件であるのにF productionが旧67件を要求していたため、job-readで0/3となった。fixtureの68 bindingは全て現物byteと一致していた。

これはv015導入時に混入したF production/test 2 path内の限定欠陥だったため、許可済み自己修正枠1/2を使用して67から68へ訂正した。契約、schema、path、proof会計は変更していない。

限定修正記録:

- `presentation-zevo-caption-quality-v002-v015-f-formal-attempt-0008-limited-fix-report-20260814-v001.md`

### 2.3 attempt-0009の正式結果

起動前checklistは合格した。

- native arm64
- 固定Node
- 登録済み固定TSX CLI絶対path
- `NODE_OPTIONS`不存在
- 固定Nodeを先頭にし、`/opt/homebrew/bin`を含むPATH
- FFmpeg/FFprobeの実体・SHA一致
- Chromium起動可能
- fixture/output/staging root未使用
- formal job binding 68件の実体一致

検査結果:

| ID | 結果 | 実測時間 | 意味 |
| --- | --- | ---: | --- |
| ZCQ042 | passed | 2.336秒 | v015 binding、19依存、解決済みURL評価、module表面を通過 |
| ZCQ043 | passed | 324.509秒 | 合成selectionから実renderer・QCまでの正常経路を通過 |
| ZCQ044 | failed | 3367.272秒 | 全負例実行後の検査側保存物集約assertで停止 |

集計は3件中2件合格、1件不合格、cancel 0、skip 0、終了code 1、signal null、stderr 0 byteである。

## 3. ZCQ044の内側原因

### 3.1 具体的な停止点

最後のassertは、検査が保持対象として集めた全rootについて「1ファイル以上存在する」ことを一律要求していた。

```
assert.ok(preserved.every(item => item.files.length > 0))
```

不成立だったのは次の版付きstaging rootだけである。

```
evals/clip_composition/outputs/presentation/zevo-caption-quality-v002-test/f-gate-attempt-0009-failure-report-write-failure.staging
```

実測entry数は0件だった。

### 3.2 なぜ矛盾するか

この負例は、rejection reportのno-replace書込みだけをEIOで失敗させる。その直後、検査自身が次を確認している。

- 結果はfatal / artifact-publication / CUE_PROOF_PUBLICATION_FAILEDである。
- staging rootは保持されている。
- `rejection-report-v001.json`は存在しない。

そのrootを保持対象へ加えた後、検査末尾が全保持rootへ一律に「ファイル数 > 0」を要求した。書込み対象が最初の正式ファイルで、それを意図的に失敗させた枝では、空のstaging directory保持はproductionの観測と矛盾しない。検査内の個別期待と末尾の集約期待が互いに両立していない。

### 3.3 三分法

| 帰属候補 | 判定 | 根拠 |
| --- | --- | --- |
| production欠陥 | 該当しない | 狙ったfatal tripleと空staging保持が成立しており、失敗はその後のtest-only集約assert |
| fixture・検査設営欠陥 | **該当** | 同一test内の個別期待と集約期待が矛盾 |
| 契約解釈が必要 | 該当しない | code、status、保存schema、path、公開規則の変更を要求していない |

v015の評価入力改訂はZCQ042で実動し、ZCQ043の正常経路も完走している。したがって本不合格をv015のproduction欠陥へ統合しない。

## 4. 証明上の扱い

- ZCQ044は全負例の処理を終えた後に失敗したが、proof itemをTAPへ出す処理より前で止まった。
- よってZCQ044の35 proofをobserved/passedとして数えない。
- F局所3/3、proof四者一致、F工程完了はいずれも主張しない。
- attempt-0009の途中TAP hashではなく、process終了後の最終TAP hashだけを正式証拠とする。

## 5. 最終歯止めの適用

本不合格は、F/U再閉包後の検査設営起因不合格である。裁定どおり以下を行わない。

- 同attempt内修正
- 残る自己修正枠2/2の使用
- Fの新attempt
- U局所以降の実行
- 個別patchまたは再計画の提示

## 6. fixture製造独立工程化の論点整理

実装提案ではなく、次の人間裁定に必要な比較だけを残す。

| 方式 | 現行の検査内fixture製造 | fixture製造を独立工程化 |
| --- | --- | --- |
| 正常・負例状態の製造 | testが実行中に製造 | 事前に版付き成果物と期待manifestを製造 |
| 前提閉包 | testのhelperと末尾assertへ分散 | 製造段階でcase別に閉包可能 |
| 今回型の矛盾 | 個別期待と全体集約期待が離れ、正式attempt末尾で露出 | case別期待manifestを先に固定できるため早期検出しやすい |
| 実行時間 | 失敗が約56分後に判明 | fixture監査を描画枝実走前へ分離できる可能性 |
| 現行17 pathへの影響 | 変更なし | 新しい正式pathを要するなら18 path目となり、現契約では停止対象 |
| bindingへの影響 | 変更なし | 正式成果物化する場合はimplementation/contract binding改訂が必要 |
| 工事量 | 小 | 独立schema・publisher・admission・再読・proof ownerの設計が必要になり得る |

今回の一点だけならtest内期待の整理で閉じる可能性はある。しかし最終歯止めは個別修正を禁じているため、本報告はどちらを採用するか決めない。

## 7. 証拠

### 7.1 起動前checklist

- `presentation-zevo-caption-quality-v002-v015-formal-command-preflight-20260814-v002.json`
- SHA-256: `dcc110f8cc3a71265d21723a3ceb695c487112aab9d9e874b050cfa5235fac7f`

### 7.2 正式attempt-0009

root:

- `test-runs/20260814-zevo-caption-quality-v002-v015-f-formal-attempt-0009/`

| file | SHA-256 |
| --- | --- |
| `tap.log` | `9333ce559830bba326f70975dbee80f33d8cc52380dd928b44eb05ddff31b167` |
| `stderr.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `exit-code.txt` | `4355a46b19d348dc2f57c046f8ef63d4538ebb936000f3c9ee954a27460dd865` |
| `signal.txt` | `38e0b9de817f645c4bec37c0d4a3e58baecccb040f5718dc069a72c7385a0bed` |

## 8. 完了・未実施

| 工程 | 状態 |
| --- | --- |
| v015診断・起草・一致監査・DECISIONS記録 | 完了 |
| v015実装・静的proof会計 | 完了 |
| F attempt-0008 | 0/3、v015 binding総数の限定欠陥を記録 |
| 限定修正 | 1/2使用、次attemptでjob-read解消を確認 |
| F attempt-0009 | **2/3、不合格停止** |
| U局所 | 未実施 |
| 正式46件 | 未実施 |
| 直接影響回帰 | 未実施 |
| green 287/287 | 未実施 |
| baseline 86/203 exact | 未実施 |
| 既存5 tree・A-v002記録対象tree照合 | 未実施 |
| commit/tag | 未実施・非承認範囲 |

## 9. 外部作用

- API通信: 0回
- countTokens: 0回
- generateContent: 0回
- 費用: US$0
- 正式描画: 0回
- stable tag: 0件

## 10. 在庫

- F/U fixture製造の独立工程化
- 契約件数pin proofの追補ごとの置換連鎖
- 新設runnerの観測標準
- 観測契約・loader構造変更時のtoolchain変換範囲照合
- 外部tool補助処理の終了code・stderr先行保存
