# ZEVO字幕品質v002 直接影響回帰 attempt-0001 起動前記録

- 実行環境: native
- Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`
- Node SHA-256: `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c`
- TSX CLI: `/Users/kawafmm/workspace/zev2/runner/node_modules/tsx/dist/cli.mjs`
- TSX CLI SHA-256: `5c916fa6ecad44aedbb01ca5815536d00ea07de6b73eeb9443d317326b0218d8`
- `NODE_OPTIONS`: 不存在
- `PATH`先頭: 固定Node directory、続いて`/opt/homebrew/bin`
- Chromium: 固定実体が実行可能
- FFmpeg / FFprobe: `/opt/homebrew/bin`系を解決
- 検査集合: `presentation-zevo-caption-quality-v002-direct-impact-test-set-20260815-v001.md`
- 検査集合SHA-256: `53b5a29a6da5e73380f3cdb49f8ad607a163190851fa6098312c1965b94e72dd`
- test path: 15件
- TAP、stderr、終了code、signal: 独立fileへ保存
- 起動形: 固定Node→固定TSX CLI絶対path→`--test`→固定15 path
