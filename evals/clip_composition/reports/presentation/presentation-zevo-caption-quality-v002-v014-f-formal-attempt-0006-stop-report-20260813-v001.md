# ZEVO字幕品質v002 v014 F局所正式attempt-0006 停止報告 v001

- 日付: 2026-08-13
- 通信: 0回
- 費用: US$0
- 正式描画: 0回
- 同attempt内修正: 0件

## 1. 結論

F局所attempt-0006は0/3、終了code 1で停止した。v014は停止位置を、最初のsource依存の`dependency-evaluate / evaluate-dependency`まで具体化し、例外code識別子`ERR_UNSUPPORTED_RESOLVE_REQUEST`を正式TAPへ残した。

ただし原因はproduction、fixture、依存実体ではなく、attempt-0006を起動した外側commandの設営誤りである。既存の正式attempt-0004/0005は固定TSX CLIを直接起動していたのに対し、attempt-0006では固定NodeへTSX loaderを`--import`して起動した。後者は本件`.ts` moduleを非階層baseの変換文脈へ置き、F module内のrelative literal importを解決できなかった。

したがってkawafmm裁定2(b)「帰属が実行環境にある場合」を適用し、コードを修正せず、新attemptも実行せず停止する。U、正式46件、直接影響回帰、green 287、baseline、tree照合は未実施である。

## 2. 読み取り診断で確定した事実

### 2.1 依存集合

- 現行`dynamicDependencies`はdirect dependency 19件である。
- v013診断済み19件とordinal、key、workspace相対pathが19/19一致し、差分0件だった。
- 従来報告の20件目は`dynamicDependencies`直前のatomic publisher loaderであり、診断集合の欠落ではない。

### 2.2 指定子と文脈

- v013 production: F module基点のrelative literal。
- v013診断: absolute file URLを物理`.mjs` importerから使用。
- v012以前の固定TSX変換記録: relative literalをF productionのdirect importで使用。
- 固定TSXのproduction同文脈再現はcode識別子なしで失敗し、物理`.mjs`対照は成功した。この時点では細段階の帰属は未確定だった。

### 2.3 v014正式観測

3検査は全て次へ一致した。

| 項目 | 観測 |
|---|---|
| 外側 | `fatal / input-reread / CUE_PROOF_EXECUTION_FAILED` |
| checkpoint | `dependency-evaluate` |
| operation | `evaluate-dependency` |
| targetPath | `evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs` |
| osCode | `null` |
| errorCodeIdentifier | `ERR_UNSUPPORTED_RESOLVE_REQUEST` |

同じ観測であることは同一原因の推測に使わず、起動command差との照合で帰属を確定した。

## 3. 起動設営差

### 正式attempt-0004/0005

固定Nodeが、登録済み固定TSX CLIの絶対pathを第一引数として起動し、TSX CLIが`--test`を処理した。

### attempt-0006

固定Nodeへ固定TSX loaderを`--import`し、Node test runnerを直接起動した。

preflight record §5には後者を「固定TSX」と記載したが、過去の正式commandと同一の起動入口であることを照合していなかった。これはpreflightの誤判定であり、同recordは上書きせず失敗証拠として保持する。

ローカルNode実体に含まれるcode定義では、`ERR_UNSUPPORTED_RESOLVE_REQUEST`は相対module指定子を非階層baseから解決できない場合の識別子である。attempt-0006の起動差と正式観測が一致する。

## 4. 三分法

### 事実

- runtime 7/7、読取99/99、implementation 51/51、directory 5/5、output/staging未使用2/2は合格した。
- Chromiumはnative環境で起動成功した。
- v014契約、19件の依存集合、4段checkpoint、5 field返却、489 proofの一対一置換は実装済みである。
- attempt-0006だけが既存正式attemptと異なるTSX起動入口を使った。
- 3検査ともfixtureの内容検査、staging、rendererへ到達する前に停止した。

### 推測

- なし。production欠陥、依存実体欠陥、fixture欠陥へ帰属させない。

### 未確認

- 固定TSX CLIによるv014のF局所3件の合否。
- F合格後のU、正式46件、各回帰とtree照合。

### 帰属

| 区分 | 判定 | 根拠 |
|---|---|---|
| production | 不成立 | 失敗は正式起動入口と異なるloader直指定文脈で発生 |
| fixture・検査内容 | 不成立 | fixture処理より前に停止 |
| 契約 | 不一致なし | v014の観測・件数・不変条件は閉じている |
| 実行環境・設営 | 確定 | 固定TSX CLIではなくloader直指定を使ったcommand差と識別codeが一致 |

## 5. v014実装の状態

- 追補v014は起草・一致監査・DECISIONS記録済み。
- 全formal jobのapproved contract bindingは13/13/14/15/15へ配線済み。
- F productionは19件の指定子と順序を変えず4段checkpointを装備済み。
- F testは5 fieldの安全表示と識別code写像を検査する状態である。
- attempt-0006後のproduction/test修正は0件。

## 6. 証拠

- 読み取り診断: `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-v014-import-context-diagnosis-20260813-v001.json`
- 追補v014: `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-dependency-load-stage-observation-addendum-20260813-v014.md`
- preflight: `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-v014-f-preflight-record-20260813-v001.md`
- environment preflight: `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-v014-f-u-environment-preflight-20260813-v006.json`
- TAP: `evals/clip_composition/reports/presentation/test-runs/20260813-zevo-caption-quality-v002-v014-f-formal-attempt-0006/tap.log`
- stderr: `evals/clip_composition/reports/presentation/test-runs/20260813-zevo-caption-quality-v002-v014-f-formal-attempt-0006/stderr.log`
- exit code: `evals/clip_composition/reports/presentation/test-runs/20260813-zevo-caption-quality-v002-v014-f-formal-attempt-0006/exit-code.txt`

証拠SHA-256:

- 診断: `c8cc8e409c1f5d134a57926897776e5157e3806c1f754c53a8bb763a4a37dcc9`
- 追補v014: `446cd7df58d61fd345a9f6ef73510c1e225ebc4f078de9d001fcb84d1ba5d7bc`
- environment preflight: `d4b9b6cc1afdd89f4a86ac7d3c8241852ab2fce9331d881a0ce2922972ccb1a2`
- TAP: `c8dc34d01f65535012bc058447e7f6308961f24baa18f63b91914f21156a87d9`
- stderr: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- exit code: `4355a46b19d348dc2f57c046f8ef63d4538ebb936000f3c9ee954a27460dd865`

## 7. 現在地

- 完了: 読み取り診断、v014追補、v014実装、環境preflight、F attempt-0006証拠保存、三分法帰属。
- 未完了: 固定TSX CLIでのF 3件、U局所、正式46件、直接影響回帰、green 287、baseline 86/203 exact、既存5 treeとA-v002記録対象tree照合、実装完了報告。
- 外部作用: API通信0回、費用US$0、正式描画0回、stable tag 0件。

## 8. 次の裁定点

同じv014実装・同じfixture値・新しい未使用attempt/rootを用い、既存正式入口どおり「固定Node→固定TSX CLI絶対path→`--test`」でF局所3件を一度実行する設営訂正が最小である。ただし本裁定は実行環境帰属時の停止を要求するため、ここでは再実行せずkawafmmへ戻す。
