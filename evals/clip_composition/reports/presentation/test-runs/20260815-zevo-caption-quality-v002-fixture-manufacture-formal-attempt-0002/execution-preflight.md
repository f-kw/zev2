# F/U fixture正式製造 attempt-0002 起動前記録

日付: 2026-08-15

- fixtureSetId: `zevo-caption-quality-v002-fu-formal-20260815-attempt-0002`
- fixture job: `evals/clip_composition/reports/presentation/test-fixture-jobs/zevo-caption-quality-v002-fu-formal-20260815-attempt-0002/fixture-job-v001.json`
- fixture job SHA-256: `dd2f31c1536417082d1098b60bc3cb897d29128e2c13aeec4d9e48cf4ed58b52`
- strict decoder: `decoded`
- value validator: `passed`
- implementation binding: 52/52 SHA一致
- approved contract binding: 17/17 SHA一致
- package root、proof output root、evidence root: 開始前未使用
- 実行環境: native
- Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`
- TSX CLI: `/Users/kawafmm/workspace/zev2/runner/node_modules/tsx/dist/cli.mjs`
- `NODE_OPTIONS`: 不存在
- `PATH`先頭: 固定Node、`/opt/homebrew/bin`
- FFmpeg/FFprobe: `/opt/homebrew/bin`実体、登録済みSHAとの照合対象
- command: 固定Node → 固定TSX CLI → fixture runner → job path一引数
- API通信: 0回
- 費用: US$0

## preflight訂正履歴

正式attempt開始前の読み取り検証で、最初の`--eval`はtop-level awaitをCJSとして扱いjob読取前に終了した。IIFEへ直したsandbox内検証はTSX IPC作成をsandboxが拒否してjob読取前に終了した。native IIFE検証で上記decode・validator・69 binding照合を完了した。いずれもfixture runnerの正式attemptではなく、package/output rootへの書込0件である。
