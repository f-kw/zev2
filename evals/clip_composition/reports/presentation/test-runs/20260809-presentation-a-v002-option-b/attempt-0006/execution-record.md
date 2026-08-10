# A-v002案B 正式attempt-0006 実行記録

| 項目 | 実測 |
|---|---|
| 開始 | 2026-08-09T12:56:01Z |
| 終了 | 2026-08-09T13:13:46Z |
| job | `a-v002-layer1-v3-option-b-proof-20260809-v004.json` |
| job SHA-256 | `e5aacdbd51c9ec30aee8a9ef847386a8e641dd723a2aca099229ae0fe4c7104b` |
| proof出力root | `a-v002-layer1-v3-option-b-proof-20260809-v002` |
| 実行回数 | 1回 |
| 終了code / status | `2 / fatal` |
| stdout | 680 byte / SHA-256 `2e53225cf506aa394f9538866c795cc4f2cb52f45fb385a819d1b11742402745` |
| stderr | 0 byte / SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| API通信 / 費用 | 0回 / US$0 |

## 到達点

- 開始時の依存初期化と全入力再読は完了した。
- 旧v3候補1件目の採用元区間列と意味情報パッケージを生成した。
- 基礎映像を正式proof rootへ公開し、timeline・manifest・検査receiptを保存した。
- 基礎映像は755 frame、SHA-256 `6fe8c8ac4b41379073b5f194c1a3e5977a64ed39434c8842fe7db03b40247f7e`、validation receiptは`passed`である。
- 横型・縦型のrenderer work rootは作成されず、完成動画・renderer QC・確認ページは0件である。

正式stdoutの内側観測は`variant-execution / child-process / step null / target null`、共通観測は`unknown / UNCLASSIFIED / target null`である。現在のrunnerはvariant内の例外を一括して`child-process`と記録するため、この語だけから外部tool失敗とは判定しない。
