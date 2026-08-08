# checkpoint: baseline exact停止

- 状態: 停止
- 規定値: `tests=181 / pass=64 / fail=117 / cancelled=0 / skipped=0 / todo=0`
- 実測値: `tests=203 / pass=86 / fail=117 / cancelled=0 / skipped=0 / todo=0`
- 差: 合格済み検査が`+22`、不合格数は差0
- 一括TAP: `baseline-aggregate-181.tap`
- 一括TAP SHA-256: `e071fc9a56ef69ecf05b252d832ed9d03a91451de43b11619b9b7767f5abde52`
- 単独6件と一括1件のstderr: 全て0 byte
- 完了済み: 直接影響`130/130`、green `287/287`
- 未実施: 既存5 tree照合、commit A

## 差分の所在

規定表が`0/1`としていた縦型renderer検査は、現物では`22/23`だった。他の5検査は規定内訳と一致した。対象fileは現在HEAD、`stable/vertical-first-clip-20260802`、`stable/meaning-output-first-real-run-20260806`で同一byte、SHA-256 `10c2da982b2d41004655ce6ea9099a9429ea8cb7b319ed1f25b5b8d30e5b0973`、全て23検査である。
