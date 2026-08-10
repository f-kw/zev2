# A-v002 旧層1 v3三候補 完成物検証レポート v001

実行した: はい

実行できなかった場合:

- 該当なし。正式proofは終了code 0で完走した。
- ただし、新しい6動画のkawafmm目視はまだ実施していない。
- 確認ページのローカルURLはブラウザ制御の安全制限で直接開けなかった。HTML実体、動画参照、動画・QCの現物は読み取り確認した。

---

# 完成物検証レポート

## 1. 結論

**機械実証は意図どおり完了した。人間目視合格は未確定である。**

人間認定済みの3つの無音・間の切断を、文字atomの途中であっても時刻を丸めずに適用し、切断をまたぐ一つの文字を一度だけ保持するA-v002案Bが、実データで横型3本と縦型字幕診断3本を生成した。正式92件は92/92、proofは6実行、QCは6/6で合格し、動画・QCの記録SHAは全て現物と一致した。

今回の到達は「時間圧縮と字幕意味の接続が機械的に成立した」ことまでである。新しい6本の音・繋ぎ・字幕の自然さは、kawafmmが確認ページで全編を見て初めて合格となる。縦型3本は字幕跨ぎ診断専用であり、正式preset、crop品質、公開品質を認定するものではない。

## 2. ユーザーから見た変化

これまでは、削除したい無音区間が一つの文字や字幕の時刻内に入ると、その文字を残すか消すかの二択になり、認定済み切断時刻をそのまま扱えなかった。

A-v002では次の処理ができる。

1. 人間が認定した削除区間の前後を、採用する元区間2本として保存する。
2. 削除区間をまたぐ一つの文字を複製せず、一つの意味atomのまま保持する。
3. その文字が実際に残る元時刻片を2本の配列として記録する。
4. 出力側は2本の元時刻片を、切断後の連続した表示時間へ写す。
5. 横型の正式styleと、縦型の字幕跨ぎ診断の両方を、同じ意味情報から決定的に組み立てる。

3候補で除いた時間は2.480秒、1.820秒、2.240秒である。切断時刻は旧層1 v3で人間合格済みの値から変更していない。

## 3. 実行した操作

1. 保存済みv007の縦型配置入力を読み、横型用配置検査と縦型専用配置検査へそれぞれ適用した。
2. 停止原因を、縦型用描画入力を横型用配置検査へ渡していたproof runnerの接続欠陥と確定した。
3. 既存の縦型専用配置検査を呼び、その合格結果を既存共通描画へ渡す2 path限定修正を行った。契約、schema、違反code、横型経路、描画計算は変更していない。
4. native環境、固定Node、固定TSX絶対path、`NODE_OPTIONS`不存在、Chromium起動、FFmpeg・FFprobeの実体SHAを確認した。
5. 正式92件をattempt-0012として頭から1回実行した。
6. 92/92合格後、runner SHAだけを更新した正式jobを作り、未使用のv008 rootでproofを1回実行した。
7. 3候補それぞれについて、横型1本と縦型字幕診断1本を生成し、各動画へ描画後QCを適用した。
8. 完了stdout、run記録、review入力、確認ページ、動画6本、QC 6件を再読し、SHA・尺・frame数を現物照合した。
9. 横型第1号の保存済みv007現物と今回のv008現物を再hashし、同じSHAであることを確認した。

API通信は0回、費用はUS$0、同attempt内の修正・再実行は0回である。

## 4. 保存データの確認

正式root:

`evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-runs/a-v002-layer1-v3-option-b-proof-20260810-v008/`

主な保存物:

| 処理上の意味 | path | SHA-256 / 実測 |
|---|---|---|
| proof全体の実行記録 | `proof-run-v001.json` | `27d747ed2d0244d01a0d89a757d4ca0820af5450bd24d96a5fdfa4c63cbe79c7` |
| 人間確認用の3候補×2形式入力 | `review-input-v001.json` | `bb37481d7707b09d0b22959102d7242cba4cafa5a56f635fd44a6395e6383583` |
| 確認ページ | `review.html` | `81f26b7bb60291a315329a5133a22cb2f6de19880f12790e62313eb20bbd6fa8` |
| 旧v3人間認定の3切断 | `human-approval-v001.json` | `a731556d31a22a1b7f02533cf605ff3e80ad9ccc4123e9645acbaf64cfd0e7a0` |
| 全候補の文字時刻正本 | `source-atom-transcript-v001.json` | 各proof inputからSHA束縛済み |
| 各候補の正式入力 | `<candidate>/proof-input-v001.json` | 3件 |
| 採用元区間列のjob | `<candidate>/source-sequence-job-v002.json` | 3件 |
| 意味情報パッケージのjob | `<candidate>/meaning-package-job-v002.json` | 3件 |
| 切断後の基礎映像と時刻表 | `<candidate>/base-media.mp4`、`base-media-timeline-v002.json` | 各3件 |
| 二形式の出力要求・表示計画・QC・動画 | `<candidate>/<variant>/` | 3候補×2形式 |
| planner資源観測 | `planner-resource-observations-v001/` | 1,524件 |

公開rootは通常file 1,574件、約94MBで、symlinkと隠し項目は0件だった。成功後のhidden renderer workは空directory 4件だけで、file、lock、v008由来の一時媒体は0件だった。

旧v3人間認定記録、proof入力、基礎映像時刻表、review入力の候補IDと切断時刻は3件全て一致した。

## 5. 確認ページ

画面をブラウザで直接再生確認した: **いいえ**。

理由は、ブラウザ制御がローカル`file://` URLの遷移を安全制限で拒否したためである。別ブラウザや迂回操作は行っていない。

代替でHTML実体を確認し、次を確定した。

- 3候補のsectionがある。
- 横型3本と縦型字幕診断3本、合計6つの`video`参照がある。
- 6参照先は全て実在し、review入力・run記録・現物SHAが一致する。
- 「縦型は字幕跨ぎ診断専用で、正式preset・crop品質・公開品質を主張しない」という注意が表示される。
- 各候補に、人間認定済み切断、切断をまたぐ文字、保持した前後の元時刻片、尺、frame、動画SHA、QCが表示される。

人間確認先:

`evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-runs/a-v002-layer1-v3-option-b-proof-20260810-v008/review.html`

## 6. 出力動画の確認

| 候補 | 形式 | 尺 / frame / 解像度 | 動画SHA-256 | QC |
|---|---|---|---|---|
| `2:voice-013` | 横型正式 | 25.167秒 / 755 / 1920×1080 | `b12ec0af708af0a5afa69488b72bf55a6300bbed162877c59cc9154f79f14fcf` | passed |
| `2:voice-013` | 縦型字幕診断 | 25.167秒 / 755 / 1080×1920 | `d157a1758cb5aa964d7832eb1119913c39ac27fd53e7094eb505575a8780bc5b` | passed |
| `5:voice-067` | 横型正式 | 21.367秒 / 641 / 1920×1080 | `ff8571395187d26a609576fa107422a2aa1c05c6c7a5e17ce3928f569e643cdd` | passed |
| `5:voice-067` | 縦型字幕診断 | 21.367秒 / 641 / 1080×1920 | `e49a3424470805b2cdee3de773ecea9bbfdf7d682dda24b2a1cc1114a45a6471` | passed |
| `5:voice-190` | 横型正式 | 26.900秒 / 807 / 1920×1080 | `5745e6b282759db7b10f4af28c332225df5db8869f8784a3e527cb5ed207d9f0` | passed |
| `5:voice-190` | 縦型字幕診断 | 26.900秒 / 807 / 1080×1920 | `42d0979a6fa2283e7caa25ae73ba94b4bd764cae1393e4ddcabdeb32071da659` | passed |

6つのQCは全て、指示適用、配置・可視性、媒体の3群がpassed、違反0件だった。ffprobeで再読したframe数と尺は記録値に一致した。

### 候補別の時間圧縮

| 候補 | 元の外側区間 | 除いた区間 | 除いた長さ | 切断をまたぐ文字 | その文字で保持した元時刻片 |
|---|---|---|---:|---|---|
| `2:voice-013` | `[4080650, 4108290)` | `[4084435, 4086915)` | 2,480ms | `ぁ [4083972, 4087055)` | `[4083972,4084435)` + `[4086915,4087055)` |
| `5:voice-067` | `[4445826, 4469038)` | `[4455270, 4457090)` | 1,820ms | `が [4453870,4457212)` | `[4453870,4455270)` + `[4457090,4457212)` |
| `5:voice-190` | `[4590178, 4619286)` | `[4611230, 4613470)` | 2,240ms | `ク [4610824,4616745)` | `[4610824,4611230)` + `[4613470,4616745)` |

3候補とも、削除区間を完全包含する文字atomはexact 1件だった。一つの意味atomを一度だけ保持し、前後2片を出力の連続表示へ写す契約が適用されている。

## 7. ZEVG / ZEVOの責務分離

- ZEVG側は、人間認定済みの削除を反映した採用元区間列、一つの意味atom、複数の保持元時刻片、字幕本文、来歴を所有する。
- ZEVO側は、採用元区間列を連続したframeへ写し、意味atomを表示page・lineへ組み立て、横型または縦型診断として描画する。
- 横型と縦型で字幕の意味本文を作り直していない。
- 縦型の見た目を正式preset品質と偽っていない。
- VAD観測だけで削除を確定していない。使用した3切断は、旧層1 v3でkawafmmが認定したものだけである。
- 既存成果物を新形式へ暗黙変換する後方互換経路は作っていない。

## 8. A-v002合格判定チェック

1. 人間認定済み3切断を丸めず保持: **OK**
2. 切断前後を採用元区間列として保存: **OK**
3. 切断をまたぐ意味atomを一度だけ保持: **OK**
4. 一つのatomに複数の保持元時刻片を保存: **OK**
5. 切断時間を出力frameへ写さない: **OK**
6. 横型3本を正式styleで生成: **OK**
7. 縦型3本を診断専用として生成し限界明示: **OK**
8. QC 6/6、違反0: **OK**
9. 動画・QCの記録SHAと現物一致: **OK**
10. 横型第1号のv007/v008 byte不変: **OK**
11. API通信0、費用US$0: **OK**
12. 新6本の人間目視: **未実施**

候補プール、候補選抜ログ、ChatGPT投稿等の別系統テンプレート項目は、本経路の合否へ混載していない。

## 9. 問題点

確認範囲では、機械工程に残る重大な不合格はない。

未完なのは人間目視である。QCは媒体・配置・欠落を検査できるが、切断後の音、語感、字幕の自然さを人間の代わりに認定しない。

## 10. まだ未実装・未認定のこと

1. 新しい6本のkawafmm目視合格と、目視結果の版付き保存。
2. 縦型3本の正式preset、crop、公開品質。今回の縦型は字幕跨ぎだけを見る全画面診断である。
3. candidate 59で観測済みのVAD 6件をA-v002で実際に切断・描画すること。今回は机上表現可能性だけを既存検査で確認した。
4. O1（ZEVO基礎映像の複数区間・物語順対応）。A完了後の予約であり、本proofへ混ぜていない。
5. 人間認定前のstable tag。発行していない。

## 11. 参考: 不足している可能性のある機能

| 状態 | 機能・証拠 | ユーザー影響 | 扱い |
|---|---|---|---|
| 実行で確認 | 6本の一画面比較ページは生成済みだが、現在のブラウザ制御ではローカルURLを開けなかった | kawafmmはローカルfileを直接開いて確認する必要がある | 検証経路の制約。production欠陥とは未判定 |
| 実行で確認 | 縦型は字幕跨ぎ診断専用 | 縦型公開品質の判断には使えない | 今回意図した範囲外。将来の正式実証 |
| 設計・検査で確認 | candidate 59のVAD 6件は同じ複数保持片契約で表現可能 | 実動画での自然さは未確認 | 今後の実データfixture |
| 予約済み | O1の複数区間・物語順対応 | 遠距離接続と意味サポート場面の本体へ未到達 | 次工程 |

## 12. 次に行うこと

1. 確認ページで3候補×横縦を全編再生し、切断点の音、切断をまたぐ字幕、終端を確認する。
2. 問題があれば、候補番号、横型/縦型、時刻、症状を記録する。問題がなければ6本まとめて目視合格と回答する。
3. 人間合格後にのみ、A-v002の安定点化と予約済みO1への接続を別裁定で行う。

## 13. 実行コマンドとテスト結果

### 正式proof

```sh
env -u NODE_OPTIONS \
  PATH=/Users/kawafmm/.nvm/versions/node/v20.19.6/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin \
  NODE_PATH=/Users/kawafmm/workspace/zev2/runner/node_modules \
  TMPDIR=/private/tmp \
  /Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node \
  --import /Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs \
  evals/clip_composition/run_presentation_a_v002_layer1_v3_proof_job_v001.ts \
  evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-jobs/a-v002-layer1-v3-option-b-proof-20260810-v010.json
```

結果: 終了code 0、`passed`、違反0、実行6件。

### 正式92件

固定Node・固定TSX絶対path・`NODE_OPTIONS`不存在・native環境で、A-v002の11 test fileを明示してNode test runnerを1回実行した。shell全文は別fileへ保存していないため、未保存の文字列を再現して「exact command」とは主張しない。

結果: 92/92合格、fail 0、skip 60、全152 test record、終了code 0、4,226.538ms。

TAP: `evals/clip_composition/reports/presentation/test-runs/20260810-presentation-a-v002-option-b/attempt-0012/formal-92-preflight.tap`

### 現物確認

- `/opt/homebrew/bin/ffprobe`で6動画の解像度、frame数、尺を読み取った。
- 固定Nodeの読み取り処理で、6動画・6 QC・run記録・review入力・確認ページをSHA-256再計算した。
- 保存済みv007とv008の横型第1号を再hashした。
- API通信、Gemini、外部投稿は実行していない。

## 14. 証拠

| 証拠 | path | SHA-256 |
|---|---|---|
| 最終正式92 TAP | `reports/presentation/test-runs/20260810-presentation-a-v002-option-b/attempt-0012/formal-92-preflight.tap` | `c40f8eb65571d7183edd957ee403875d7991d10de3bf8675f8e102273f806c8c` |
| 最終proof stdout | `reports/presentation/test-runs/20260810-presentation-a-v002-option-b/attempt-0012/formal-proof.stdout.json` | `594a164f9e154b15e3e00f01018c8cccd160e77afbbb04e00abc88e52f7adb11` |
| 実行環境・診断・修正・結果 | `reports/presentation/test-runs/20260810-presentation-a-v002-option-b/attempt-0012/execution-environment.md` | `0d2d0274779f4bf9d1bfaefb608c6b59b44eca0836625e9a67a213770f094595` |
| 縦型配置入力の診断値 | `reports/presentation/diagnostics/a-v002-vertical-layout-preflight-20260810-v001.json` | `19e288dcf9c229f1d1e48440394e3aa4ad71c237aa896ffd16b7e10f08c56357` |
| 最終周回修正設計 | `reports/presentation/presentation-a-v002-vertical-layout-preflight-diagnosis-and-final-round-repair-design-20260810-v001.md` | `14d81ada92e8b534957b8bea1a7cb2b14122709e126c41cba242434b45eae73a` |
| planner等価枝刈り設計 | `reports/presentation/presentation-a-v002-page-line-planner-equivalent-pruning-design-20260810-v001.md` | `6612b996f2eddcc6f1b1040eecb4e3129dcf66e66e5dd87ac23344bd0a0c3793` |
| proof run | `outputs/presentation/a-v002/layer1-v3-proof-runs/a-v002-layer1-v3-option-b-proof-20260810-v008/proof-run-v001.json` | `27d747ed2d0244d01a0d89a757d4ca0820af5450bd24d96a5fdfa4c63cbe79c7` |
| review入力 | `outputs/presentation/a-v002/layer1-v3-proof-runs/a-v002-layer1-v3-option-b-proof-20260810-v008/review-input-v001.json` | `bb37481d7707b09d0b22959102d7242cba4cafa5a56f635fd44a6395e6383583` |
| 確認ページ | `outputs/presentation/a-v002/layer1-v3-proof-runs/a-v002-layer1-v3-option-b-proof-20260810-v008/review.html` | `81f26b7bb60291a315329a5133a22cb2f6de19880f12790e62313eb20bbd6fa8` |

`reports/presentation/`と`outputs/presentation/`の前には`evals/clip_composition/`が付く。

## 15. attempt全史

| attempt | 観測と処理 | 到達点 |
|---|---|---|
| 0001 | 正式92件合格後、親が子成果物を公開前再読集合へ登録していないことを後監査で検出 | proof前停止 |
| 0002 | proof開始時が`unknown / UNCLASSIFIED`で、保存情報だけでは原因未確定 | 観測装備追加へ停止 |
| 0003 | TSX loaderの論理pathとsymlink実体pathを成果物用の厳格読取で同一要求していた | runtime tool照合を実体path+内容SHAへ修正 |
| 0004 | PATHが`/usr/local`側FFmpeg・FFprobeを選び、登録実体SHAと不一致 | `/opt/homebrew/bin`を正式PATHへ固定 |
| 0005 | 一時媒体の`/var`→`/private/var`実体差を成果物用path検査が拒否 | 一時媒体をrealpath前後照合+streaming hashへ接続 |
| 0006 | 基礎映像pathの全path製造と、内側違反ownerの二次例外化 | basename製造と既存違反owner接続へ修正 |
| 0007 | 基礎映像公開後からrenderer work前が粗いUNCLASSIFIED | 複合区間へ段階別checkpointを装備 |
| 0008 | 基礎映像inspectionを非所有moduleからimport | 既存の唯一の所有元へ接続 |
| 0009 | 101 atom・28,807 edgeの探索が約90分CPUを使って完了せず、agentが停止 | 支配関係の証明とbyte oracleを伴う等価枝刈りを設計 |
| 0010 | plannerは横1.604秒・縦1.648秒へ短縮し、横型第1号とQCが完成。縦型v2診断styleを共通投影のv1条件が拒否 | v2正式styleだけを既存共通投影へ接続 |
| 0011 | 投影は解消。縦型入力を横型用配置検査へ渡し、`layout-preflight / CHILD_PROCESS_EXIT_NONZERO` | 既存縦型専用配置検査結果の接続不足と確定 |
| 0012 | 縦型専用配置検査を共通描画へ接続。正式92/92、proof 6実行、QC 6/6 | 機械実証完了 |

停止証拠、使用済みroot、旧jobは上書き・削除していない。

## 16. 事実・推測・未確認

### 事実

- 正式92件、proof 6実行、QC 6件は全合格した。
- 6動画・6 QCの記録SHAと現物SHAは一致した。
- 横型第1号はv007とv008でbyte同一だった。
- 等価枝刈り後のplanner完了時間は、候補1横1,572ms・縦1,563ms、候補2横941ms・縦984ms、候補3横992ms・縦1,083msだった。
- 支配関係の証明と保存済み正式出力のbyte oracleを一組にする計算改善手続は`DECISIONS.md`へ記録済みである。
- 新6本はまだkawafmmが目視していない。

### 推測

- なし。機械合格から、人間が感じる自然さを推定しない。

### 未確認

- 切断点の音と語感が自然か。
- 切断をまたぐ字幕が、人間の目に重複・欠落・不自然な残留なく見えるか。
- 3本それぞれの終端に違和感がないか。
- A-v002の人間合格とstable tag。

## 17. 停止点

A-v002の機械実証と完成報告は完了した。人間目視前のためstable tagは発行せず、O1も開始していない。

次の人間作業は**確認ページ1枚で6動画を見る1回だけ**である。見る箇所は、各候補の切断点の音、切断をまたぐ文字の字幕、終端である。縦型は字幕跨ぎだけを判定し、正式preset・crop・公開品質は判定対象にしない。
