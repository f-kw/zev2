# A-v002案B 正式92検査 実行環境

- attempt: `attempt-0001`
- 開始時刻(UTC): `2026-08-09T05:54:08Z`
- 固定Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`
- 固定TSX: `/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs`
- PATH: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`
- `NODE_OPTIONS`: 環境から削除し、変数自体を存在させない
- test concurrency: `1`
- test name filter: `^(ASQ|AMP|OPT|OPLV2|ORPV2|OPL02[89]|APF|AVD|APJ|ARU|ORP01[78])`
- 実装固定: `presentation-a-v002-preformal-audit-20260809-v001.md`のexact 24 path SHA表
- 正式TAP: `formal-92.tap`
- 不合格時: 同attemptで修正・再実行しない

