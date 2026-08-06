# 実行入力記録・crop適用 正式検査attempt v003 停止報告

- 日付: 2026-08-03
- 状態: **227/228で不合格停止**
- 本裁定後の修正周回: 1 / 2
- 外部通信: 0回
- 費用: US$0
- API通信、正式生成、描画: 0回

## 1. 結論

attempt v002の6不合格はすべて解消した。縦型の厳密JSON受け渡しとcrop runnerの正式tool symlink読取に対する限定修正は、対象の正常経路を契約どおり成立させた。横型4件も固定Nodeを先頭に置いたnative環境で本来の正常／拒否枝へ到達した。

新たな不合格は`OPF012`一件だけである。productionや契約の不成立ではなく、正式検査を起動したshellが、本来「環境変数なし」であるべき`NODE_OPTIONS`を空文字として明示設定した検査実行環境の欠陥だった。

不合格一件で停止する規律に従い、同attemptで起動方法を直して再実行していない。既存gate、baseline、既存3本tree照合、実行入力記録の固定にも進んでいない。

## 2. 正式228件の結果

開始前に、同じ正式検査・描画・fixture生成を行う並行processがないことをnative側で確認した。固定Node、固定TSX loader、直列実行、固定Nodeを先頭にしたPATHで、11検査fileを一commandから一度だけ実行した。

| 項目 | 結果 |
|---|---:|
| 全件 | 228 |
| 合格 | 227 |
| 不合格 | 1 |
| skipped / cancelled / todo | 0 / 0 / 0 |
| 実行時間 | 80,267.488375 ms |

### 旧6不合格の到達結果

| ID | v002 | v003 | 処理上の意味 |
|---|---:|---:|---|
| `OEE001` | fatal | 合格 | 横型の意味packageから描画・QC・正式成果物まで成立 |
| `OEE002` | rejected | 合格 | 厳密JSON内部表現を値不変でcrop契約へ渡し、縦型経路が成立 |
| `OEE005` | exit 2 | 合格 | 描画成立後、空字幕を既存QCが期待どおり検査済み拒否 |
| `OEE007` | 注入0 | 合格 | 非空動画成立後にstaging故障を1回注入し、正式staging検査が所有 |
| `OEE008` | 注入0 | 合格 | 非空動画成立後に公開競合を1回注入し、既存commit入口の規則が成立 |
| `OSR010` | fatal | 合格 | 正式ffmpeg／ffprobe pathの実体を安定照合し、crop適用を一回公開 |

これにより、横型4件の第一原因だった実行環境仮説は、新attemptの実経路で確定した。crop適用の新工程は6件共通原因ではなかった。

## 3. 新しい不合格`OPF012`

### 事実

- 検査は、固定Node、固定TSX loader、追加loaderなしという正式実行環境を確認する。
- Node実体、TSX loader実体、TSX package実体のSHA検査は、不合格assertより前に通過した。
- 不合格は`process.env.NODE_OPTIONS`の値だけだった。
- 契約上の期待は「環境変数が存在しない」状態で、期待値は`undefined`である。
- attempt v003の起動commandは`NODE_OPTIONS=`を明示したため、Node process内の実測値は空文字`""`だった。
- TAPの差は`'' !== undefined`である。
- production処理、fixture、検査期待値、正式成果物の値はこの不合格に関与していない。

### 帰属

三分法では**検査実行環境の設営欠陥**である。環境変数の内容に危険なoptionがないことと、契約が要求する「環境変数自体がないこと」を実行commandで混同した。

### 次周回の限定対処案

コード、fixture、期待値は変えない。正式commandから空値代入を除き、`NODE_OPTIONS`を環境から明示的に削除した状態で、同じ228件を新attemptとして頭から一度だけ実行する。

これは検査を緩める修正ではない。正式検査の実行環境を、既存の固定契約へ一致させるだけである。

## 4. 保存証拠

| 証拠 | path | SHA-256 | byte |
|---|---|---|---:|
| TAP全文 | `evals/clip_composition/reports/presentation/test-runs/20260803-meaning-output-run-input-crop-v001/formal-228-attempt-v003.tap` | `5b1f611976f7118713172d49099da354240acd40ec75b2e1511675be015a58e6` | 49,180 |
| stderr | `evals/clip_composition/reports/presentation/test-runs/20260803-meaning-output-run-input-crop-v001/formal-228-attempt-v003.stderr` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | 0 |
| 6件診断・限定修正記録 | `evals/clip_composition/reports/presentation/presentation-meaning-output-run-input-crop-six-failure-diagnosis-and-limited-repair-20260803-v001.md` | `9195be967d98172a2f91d1282d5191cfb59120f6c3c19a602201219f63a5ad40` | - |

限定修正後の2 file SHA-256は次のとおり。

| file | SHA-256 |
|---|---|
| `evals/clip_composition/presentation_output_style_resolver_v001.ts` | `e63e4b4cf47d94d763333e13513570abe2dbac418e5ac5b396e1295b22956403` |
| `evals/clip_composition/run_presentation_output_crop_application_job_v001.mjs` | `a77c75df843d098dc4f12571003973670b5e0c23d86fc0d6b1bc16b97686c7f6` |

## 5. 事実・推測・未確認

### 事実

- 旧6件は全件合格した。
- 新規転落は`OPF012`一件だけである。
- 不合格値は、起動commandが作った空文字の`NODE_OPTIONS`である。
- 不合格後の修正、部分再実行、既存gate、baseline、tree照合、実行入力記録固定は行っていない。

### 推測

- なし。今回の不合格値とその生成元はcommandとTAPから一意に確定した。

### 未確認

- `NODE_OPTIONS`を存在しない状態にした次attemptの228/228。
- 既存合格gate 287/287。
- 既知baseline 64/181不変。
- 既存3本tree SHA不変。
- 実行入力記録の正式固定と固定5項目の実行前下書き。

## 6. 停止点

本裁定後の周回1 / 2を消費し、残りは1回である。次周回でも228/228に到達しない場合は、3周目を行わず12 file工事の範囲改訂案を提示する。

再開する場合も、コード・fixture・期待値を変更せず、正式実行環境だけを契約値へ合わせる。その新attemptに不合格が一件でもあれば同attemptで直さず停止する。
