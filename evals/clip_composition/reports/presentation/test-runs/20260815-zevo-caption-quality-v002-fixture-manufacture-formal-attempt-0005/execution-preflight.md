# F/U fixture正式製造 attempt-0005 起動前記録

日付: 2026-08-15

- 用途: 正式48件を一つの未使用attemptで取得するための新fixtureSet。局所Fで使ったattempt-0004 rootは再利用しない。
- fixtureSetId: `zevo-caption-quality-v002-fu-formal-20260815-attempt-0005`
- fixture job: `evals/clip_composition/reports/presentation/test-fixture-jobs/zevo-caption-quality-v002-fu-formal-20260815-attempt-0005/fixture-job-v001.json`
- fixture job SHA-256: `450d58b16825e471e089cf4424096b2f31a50083ad931772ce4dfd920577d903`
- strict decoder / value validator: decoded / passed
- implementation / approved contract binding: 52/52、17/17 SHA一致
- formal proof job basename静的preflight: 26/26一致、malformed明示除外1/1
- package root・proof output parent: 2/2不存在
- 実行環境: Darwin arm64 native
- Node / TSX / Chromium / FFmpeg / FFprobe: 登録path・SHA一致。Chromium headless起動終了0
- `NODE_OPTIONS`: 不存在
- `PATH`: 固定Node先頭、`/opt/homebrew/bin`を`/usr/local/bin`より前に配置
- command: 固定Node → 固定TSX CLI → fixture runner → job path一引数
- 証拠: stdout、stderr、終了code、signalを独立保存する
- API通信: 0回
- 費用: US$0
- 停止規律: 不合格一件で追加修正せず停止する

