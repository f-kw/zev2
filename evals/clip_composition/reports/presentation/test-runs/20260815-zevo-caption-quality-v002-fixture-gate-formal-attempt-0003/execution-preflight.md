# F/U fixture工程 正式検査 attempt-0003 起動前記録

日付: 2026-08-15

- 限定修正権: 2/2を使用済み。これ以後の追加修正権なし。
- 変更: admission返却をfreezeする際、生byteのBuffer本体を再帰freeze対象外とした。schema・件数・bindingは不変。
- fixtureSetId: `zevo-caption-quality-v002-fixture-selftest-20260815-attempt-0003`
- 過去2 attemptのjob、root、TAP、stderr、終了code、signal: 不変保持
- 新package root、proof output root: 開始前に未使用を確認
- 実行環境: native
- Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`
- TSX CLI: `/Users/kawafmm/workspace/zev2/runner/node_modules/tsx/dist/cli.mjs`
- `NODE_OPTIONS`: 不存在
- `PATH`先頭: 固定Node、`/opt/homebrew/bin`
- command: 固定Node → 固定TSX CLI → `--test` → fixture job test
- 証拠: TAP、stderr、終了code、signalを別fileへ保存する
- API通信: 0回
- 費用: US$0
