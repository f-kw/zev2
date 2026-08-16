# ZEVO字幕品質v002 Gemini 3.7 Flash B5 source再読停止報告v001

## 1. 結果

正式B5 `countTokens` attemptは、API通信前のsource package再読で拒否されて停止した。

- 終了状態: rejected
- 停止段階: source package再読
- 外側分類: `CUE_B5_JOB_INVALID`
- API通信: 0回
- 追加費用: US$0
- 同attemptでの修正・再実行: 0件
- B6、selection受入、planner、render plan、正式描画: 未実施

## 2. 保存証拠

### 2.1 正式実行記録

- 実行記録root: `evals/clip_composition/reports/presentation/test-runs/20260815-zevo-caption-quality-gemini-3-7-b5-formal-attempt-0002`
- preflight SHA-256: `269d2d08b49b59d7a659e166996934871f78b27b0a61d185cf8c834cbb597c68`
- stdout SHA-256: `e0491f21149463d1c0bd1d0bb9c5288f721eed449808cbf7400e926d8d09d9a5`
- stderr SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- exit-code SHA-256: `4355a46b19d348dc2f57c046f8ef63d4538ebb936000f3c9ee954a27460dd865`

### 2.2 正式失敗成果物

- failure report: `evals/clip_composition/outputs/presentation/output-caption-cue-b5-attempts/a-v002-caption-quality-first-api-b5-20260815-v001/attempt-0001/b5-failure-report.json`
- failure report SHA-256: `79e1c4253753e773e46cae8e41616c35935e0b6edbf9b2e3465449c3777111cc`
- 正式jobのfile SHAはjob内束縛値と一致した。
- source packageのfile SHAはjob内束縛値と一致した。
- output rootは失敗報告を持つ使用済みrootとして保持する。

## 3. 読み取り診断

### 3.1 source package自体

対象source packageは既存の正式validatorで合格した。

- package: `evals/clip_composition/outputs/presentation/output-caption-cue-source-packages/a-v002-caption-quality-first-api-source-20260815-v001/source-package-v001.json`
- file SHA-256: `1dcc8189ea34bb0a001a6ec6d07066f583133d8fda7f71bf9263cc189e555536`
- 正式validator: passed、違反0件
- provenance implementation binding: 36件
- provenance approved contract binding: 14件

14件はsource package製造時に承認済みだった集合と一致し、Gemini 3.7 Flash・期間付き価格追補v016を含まない。

### 3.2 実装側の不一致

現行B5/B6 runnerは、Gemini 3.7 Flash・期間付き価格追補v016をB5用の承認契約集合へ追加する際、その集合をsource package provenance検査にも共用している。そのためsource package再読では15件を要求し、正式な既存source packageの14件を拒否した。

しかし追補v016 §6は次を固定している。

- v016を追加するのはB5/B6 formal jobだけ。
- B5は14件から15件、B6は15件から16件へ改訂する。
- source、selection、proofの契約件数は変えない。

したがって、source packageへv016を遡及要求する現行配線は承認済み追補と一致しない。

## 4. 三分法

- production実装: 欠陥あり。B5/B6専用の追加契約をsource package再読へ誤って波及させた。
- job・fixture・正式source package: 欠陥なし。byte/SHAは一致し、source package正式validatorも合格した。
- 契約: 矛盾なし。v016 §6がsource件数不変を明示しているため、解釈の追加は不要。

## 5. 推奨する限定修正

同attemptでは実施しない。次の承認後に行う候補は以下である。

1. source package再読が参照する承認契約集合を、既存14件のsource専用集合としてB5/B6 formal job集合から分離する。
2. B5 formal jobはv016を含む15件、B6 formal jobはv005とv016を含む16件の要求を維持する。
3. 保存済みsource packageが14件で合格し、B5/B6 jobからv016を欠かすと拒否される回帰検査を追加する。
4. 使用済みjob・output root・全失敗証拠を不変保持し、新しい版付きjobと未使用output rootでB5を再開する。

source packageへの追補追加、既存source成果物の作り直し、contract検査の緩和、fallbackは行わない。

## 6. 現在地

- `.env`からのAPI key読込: 成立。値は出力・記録していない。
- B5 countTokens: 通信前停止。実API呼出し0回。
- B6 generateContent: 未実施。
- 横型3本の再描画・QC・確認ページ: 未実施。

