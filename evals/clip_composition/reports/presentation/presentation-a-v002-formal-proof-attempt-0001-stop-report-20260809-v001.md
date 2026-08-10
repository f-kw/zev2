# A-v002正式proof attempt-0001 停止報告 v001

日付: 2026-08-09  
修正周回: 1/2  
通信: 0回  
費用: US$0

## 1. 結論

承認済み2 pathの修正は正式92件と全回帰に合格した。続く正式proof jobを未使用rootへ一度だけ起動したところ、親proof rootを作る前に終了2のfatalで停止した。

規律どおり、同じattemptでの修正・再実行、横型／縦型描画、QC、確認ページ、O1への接続は行っていない。

## 2. 事実

### 2.1 最小修正と検査前監査

- 変更は既存proof runnerと同testの2 pathだけ。
- source sequenceとmeaning packageを、それぞれstrict formal byte・file SHA・canonical SHAの検証後に親の再読集合へ登録した。
- 親の公開前とcompletion marker直前は、同じ再読処理で集合の全現物を検査する。
- APJ006は、source sequenceとmeaning packageを別々に実filesystem上で変更し、両方とも投影不一致として親公開を拒否することを確認した。
- 独立監査: CLEAN、APJ 10/10。exact 24 pathのうち変化は承認済み2 pathだけ。

| path | 修正後SHA-256 |
|---|---|
| `run_presentation_a_v002_layer1_v3_proof_job_v001.ts` | `4c4bba6516f9bee6dbb329e7552c78e2ddd0e2ddcb5fd109eb36128f8572d49f` |
| `run_presentation_a_v002_layer1_v3_proof_job_v001.test.mjs` | `395525b436d8a547f2d800870c4bd9b5c48200072ed597d6917a6a249d2b3ac7` |

### 2.2 正式検査と回帰

| 工程 | 結果 | 証拠 | SHA-256 |
|---|---:|---|---|
| 正式A-v002 | 92/92 | `test-runs/20260809-presentation-a-v002-option-b/attempt-0002/formal-92.tap` | `4ec6a6376936668ec49b0c615f2bfb404cdd05e97a3fcfad89022e56a24af82c` |
| 既存green | 287/287 | `test-runs/20260809-presentation-a-v002-option-b/attempt-0002/green-287.tap` | `6631f058d088a0682e519ec0479318bae70f049f113d94b533cf5abf64dd8c73` |
| 正式baseline | 86/203、fail 117 | `test-runs/20260809-presentation-a-v002-option-b/attempt-0002/baseline-203.tap` | `bd5435ed70165512b736480f0808f3461eda64751935c169e9d616c6fbf2b086` |
| 既存正式tree | 5/5 | `test-runs/20260809-presentation-a-v002-option-b/attempt-0002/five-tree.tap` | `18cfbcc79d6cb08848a0746c826c30153c3fe287fcecc536ea2b6fdd50a7f806` |

baselineは`tests 203 / pass 86 / fail 117 / cancelled 0 / skipped 0 / todo 0`で既知値とexact一致した。5 treeのOIDも既定値と一致した。

### 2.3 正式proof job

- job製造の最初のメモリ内preflightでは、schema fieldを持たない旧v3入力2件へ承認済みの宣言schemaを付け忘れ、exact validatorが公開前に拒否した。job file・proof rootは作られず、正式実行回数は消費していない。値を変えず、契約上の宣言schemaを明示した正式serializer出力だけを次のjobとして固定した。
- job: `evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-jobs/a-v002-layer1-v3-option-b-proof-20260809-v001.json`
- job SHA-256: `a07944411b08b72702c1d60b3792ceed7387f61f40d099f7eb7909b812a00e86`
- job byte: 7,260 byte、正式serializerのexact byte、validator合格。
- source media: 3,288,164,785 byte、SHA-256 `8359f59d8c205fb815c9165f5a464ec4bb9f109f9d91384b80e571410dc2fa25`。
- 出力rootと派生するsource sequence 3 root・meaning package 3 rootは起動前に未使用を確認した。
- 競合するproof／ffmpeg／Remotion／TSX processは0件だった。
- 束縛済みChromiumはネイティブ環境で実起動し、空ページを正常出力した。
- 固定Node、固定TSX絶対path、固定Node先頭PATH、`NODE_OPTIONS`不存在を記録した。

正式実行結果:

| 項目 | 観測値 |
|---|---|
| 実行時間 | `2026-08-09T08:10:13.632Z`〜`08:10:15.368Z` |
| 終了code / status | `2 / fatal` |
| violations | 0件 |
| fatal観測 | `innerStage=unknown / targetFile=null / innerCode=UNCLASSIFIED` |
| stdout | 235 byte、SHA-256 `1b19a0d01ff0fcce576e13bdfd547e857d987a671103fcd523ea49f7f07c87ba` |
| stderr | 0 byte、SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

保存物:

- `formal-proof-run.stdout.json`
- `formal-proof-run.stderr.txt`
- `formal-proof-run-execution-record.json`（SHA-256 `184bdcdbb6c4dcc34ffcd0d9ada2427714883cff5727c86daa4fa847b0c85f6e`）

### 2.4 停止位置

- 親proof rootは未作成。
- source sequence子rootは0/3、meaning package子rootは0/3。
- 横型動画0/3、縦型字幕診断動画0/3。
- したがって、成功時だけrootを確保するfixture構築より前に停止している。

## 3. 推測

親rootが未作成であるため、失敗候補はdefault dependencyの初期化か、開始時入力・tool実体の再読段階である。ただし正式fatal報告が`unknown / UNCLASSIFIED`であり、両者を観測から区別できない。原因を確定したとは扱わない。

## 4. 未確認

- fatalを発生させた具体的な入口、値、path、tool挙動。
- 実装修正が要るか、実行環境またはjob設営の問題か。
- 修正後に6本の描画とQCへ到達できるか。

## 5. 未実施

| 工程 | 状態 |
|---|---|
| 同attempt修正・再実行 | 0回 |
| 横型3本 | 未生成 |
| 縦型字幕診断3本 | 未生成 |
| QC | 未実施 |
| 確認ページ | 未生成 |
| A-v002完成認定 | 未成立 |
| stable tag | 未発行（人間目視前禁止を維持） |
| O1 | 未接続（A完了条件が未成立） |

## 6. 次の判断依頼

保存済みjob・実行記録・現行runnerだけを用いた、通信0・再実行0の読み取り診断が必要である。診断では、dependency初期化と開始時再読のどちらで止まったか、内側の具体的な値・path・tool挙動を確定してから、修正要否を三分法で提示する。
