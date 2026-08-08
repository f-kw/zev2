# fatal観測性v002 scope-revision attempt-0002 起動前記録

- 実行前確認日時: `2026-08-08T12:24:49+0900`
- 開始HEAD: `84c723362de8a0ee0d74fd0303eabab0992c879f`
- 実行環境: native
- attempt root: 作成前に未使用を確認済み
- 並行process: `node --test` / TSX / Remotion / Chromium の競合0件

## 正本再読

- 129/130停止報告: `presentation-fatal-observability-v002-scope-revision-attempt-0001-stop-report-20260808-v001.md`、SHA-256 `ceb77058b7097891a4e7e0fce0ffcbc0b27922c81c0f393034ec65d89f089c53`
- OEE002診断: `presentation-fatal-observability-v002-oee002-style-binding-diagnosis-20260808-v001.md`、SHA-256 `2679fdd9a150ccbec693cb924fdf90b58dfc33301bcbd7b223a841831a536294`
- `DECISIONS.md`: 案Cの来歴/live分離、ネイティブ環境規律、起動前checklist、環境対照だけで原因確定しない規律を再読済み

## 固定実体

| 実体 | path | SHA-256 / 値 |
| --- | --- | --- |
| Node | `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node` | `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c` / `v20.19.6` |
| TSX loader | `/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs` | `f06fb3da72f722ec9a2c3e8502f750ae1b6300b93fb76e8a52548dba69b6730f` |
| Chromium | `/Users/kawafmm/workspace/zev2/runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell` | `b469d05c698ccf9f4ae3dc43fb194fbdcf56f9da1fc46dcc19f2bf9fe2aa20b8` |
| 縦型renderer | `evals/clip_composition/render_presentation_vertical_review_v001.ts` | `6fb4edfd9c9a9161f474921368b05bd32c0aaef2b1fd5155e148d291134c8c75` |
| OPF002台帳更新後 | `evals/clip_composition/presentation_output_render_plan_v001.test.mjs` | `c735b590a6dfa226df9cd98c7429824f5cad0f69cff2d2d935c30ee159516391` |

## 起動条件

- `PATH`先頭: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin`
- `NODE_OPTIONS`: 環境変数自体が不存在
- TSX: 上記絶対pathを`--import`へ指定
- test concurrency: `1`
- Chromium: 上記固定実体で`about:blank`をnative起動し、終了0・HTML取得を確認
- 構文検査: OPF002を含む検査fileは固定Nodeで終了0

## 許可された変更

OPF002の検査側承認済み変更表へ、縦型renderer pathと新SHAを1件追加し、件数を2件へ更新した。production、契約、正式成果物、正式81件の合格実装は変更していない。
