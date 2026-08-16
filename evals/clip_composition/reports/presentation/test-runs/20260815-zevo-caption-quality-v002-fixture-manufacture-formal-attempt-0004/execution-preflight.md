# F/U fixture正式製造 attempt-0004 起動前記録

日付: 2026-08-15

- fixtureSetId: `zevo-caption-quality-v002-fu-formal-20260815-attempt-0004`
- fixture job: `evals/clip_composition/reports/presentation/test-fixture-jobs/zevo-caption-quality-v002-fu-formal-20260815-attempt-0004/fixture-job-v001.json`
- fixture job SHA-256: `014ecf9bd73664cff83794fad0cf76bfbe6bc1b85d17ddf1cad3e810001a8793`
- strict decoder: `decoded`
- value validator: `passed`
- implementation binding: 52/52 SHA一致
- approved contract binding: 17/17 SHA一致
- formal proof job basename静的preflight: 26/26一致、重複0、malformed明示除外1/1
- consumer入口閉包: F/Uのpath・basename・receipt環境規則を現物逆引き済み
- package root・proof output parent: 2/2不存在
- 実行環境: Darwin arm64 native
- Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`、登録SHA一致
- TSX CLI: `/Users/kawafmm/workspace/zev2/runner/node_modules/tsx/dist/cli.mjs`、登録SHA一致
- `NODE_OPTIONS`: 不存在
- `PATH`: 固定Node先頭、`/opt/homebrew/bin`を`/usr/local/bin`より前に配置
- Chromium: 登録済み実体・SHA一致、headless `about:blank`起動終了0
- FFmpeg/FFprobe: `/opt/homebrew/bin`実体・登録SHA一致
- command: 固定Node → 固定TSX CLI → fixture runner → job path一引数
- 証拠: stdout、stderr、終了code、signalを独立保存する
- API通信: 0回
- 費用: US$0
- 停止規律: 不合格一件で追加修正せず停止する

## 正式attempt前の設営訂正

新job初版は追加時の末尾LFが2件となり、正式実行前のbyte確認で検出した。出力rootへの書込0件のまま、既存正式serializerと同じ末尾LF一件へ訂正した。続くstrict decoder、value validator、69 binding、未使用root照合に合格した後だけ正式attemptへ入る。decoder確認用の最初の`tsx -e`はtop-level awaitをCJS出力で使ったため診断command自体が失敗し、二回目は制限環境のIPC拒否で失敗した。いずれもfixture runner未起動・出力root書込0件であり、ネイティブ環境の同一decoder確認で合格を得た。これらをformal manufactureのretryには数えない。

