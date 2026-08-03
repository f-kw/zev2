# 意味／表現境界 attempt v005 残存5件 読み取り診断 v001

- 診断日: 2026-08-03
- 対象: 正式205件 attempt v005 の OEE001 / OEE002 / OEE005 / OEE007 / OEE008
- 入力TAP: `formal-205-attempt-v005.tap`
- 入力TAP SHA-256: `e77b34c6e2cadc9bce54c18e6de660e44f52f79084e0f8abb949df54d7a2176d`
- 診断時の正式再実行: 0回
- Gemini / Google API通信: 0回
- 費用: US$0
- 修正周回: 1 / 2へ進む前の診断

## 結論

契約矛盾は見つからなかった。残る5件は、正式成果物を組み立てる処理の欠陥2群、検査用の故障注入時機の欠陥1群、描画toolを起動する検査環境1群に分かれた。契約・直列化規則・安全なfile読取規則・違反の所有規則を緩める必要はない。

| 検査 | 帰属 | 確定した原因 | 既存契約内の限定対処 |
|---|---|---|---|
| OEE001 | production | 厳密JSON読取後の3つの参照が、通常のJSON objectへ戻されないまま正式な適用結果とmanifestへ渡った | 正式成果物を組み立てる境界で3参照だけを内容同一の通常objectへ複製する |
| OEE002 | production | 縦crop出力の論理pathが `/var/...`、同じ実体の正規pathが `/private/var/...` で、安全読取がpath差だけを正しく拒否した | crop後の内部一時媒体pathを実体pathへ直してからhash・描画へ渡す |
| OEE005 | fixture / 実行環境 | 同じfixtureでRemotion配下のChromium起動失敗を再現した。固定Node 20で始めた検査から、子processだけNode 23を選ぶPATH差も観測した | 正式attemptをnative環境かつ固定Nodeを先頭にしたPATHで実行する。期待値やproductionは変えない |
| OEE007 | fixture | 余分なstaging fileの注入が作業directory出現直後に走り、狙ったstaging検査より前の描画段階を壊した | 描画済みvideoの成立を確認してから余分なfileを1回だけ注入する |
| OEE008 | fixture | 公開先の競合注入も早すぎ、公開段階より前へ入り込んだ | 描画済みvideoの成立を確認してから公開先を1回だけ作る |

## 診断証拠

### OEE001

- 最初の拒否位置はプリセット台帳参照だった。
- 同じ形の未変換参照は、意味情報package参照と基礎映像参照にもあった。
- メモリ内だけで3参照を通常objectへ複製すると、横型は終了0になり、正式5成果物まで到達した。
- 厳密な正式直列化規則を緩める案は不採用とする。

### OEE002

- crop済み媒体は通常file、hard link数1、期待SHAと実測SHAが一致した。
- 不一致は論理path `/var/...` と実体path `/private/var/...` のみだった。
- メモリ内だけで実体pathへ直すと、縦型は終了0になり、正式5成果物まで到達した。
- symlinkを許すよう安全検査を緩める案は不採用とする。

### OEE005

- 共通描画coreが正常に起動できた観測では、空白字幕が既存の描画後検査で拒否され、終了1、空overlay違反、対象表示IDまで期待どおり取得できた。
- 同じfixtureで終了2になった観測では、ChromiumのMac IPC登録が権限拒否され、Remotionがbrowser起動不能として停止した。
- 保存済みv005 TAPには内側stderrがないため、v005の終了2が同じChromium原因だったことは未確認である。よってv005については「同じ外形を同じfixtureで再現し、実行環境まで原因候補を限定した」が証明範囲である。

### OEE007 / OEE008

- 両検査は、作業directoryを見つけた直後に故障を注入していた。
- 反復観測で停止段階が描画実行・staging検査間を揺れた。公開競合も公開段階へ安定到達しなかった。
- 描画済みvideoの成立をhandshakeにすれば、初期予約後かつ正式成果物検査前の範囲へ注入時機を限定できる。

## 通信に関する事実・未確認

診断補助の最初の1回で、`npm exec -- tsx /private/tmp/diagnose-oee001-oee002-instrumented.mjs` を実行し、終了0とともに `tsx@4.23.5` を導入する旨のnpm警告が出た。`package.json` と `pnpm-lock.yaml` の変更は0件で、Gemini / Google API通信、秘密送信、課金は0件だった。一方、npm cacheから解決した可能性とregistryへ接続した可能性を保存済み表示だけでは分離できないため、npm registry通信は「可能性あり・未確認」と記録する。以後の確定診断は固定済みのローカルNode / TSXだけで再現した。

## 修正周回1の固定範囲

1. 正式成果物の組立時に、3つの外部参照を通常objectへ内容同一複製する。
2. 縦crop後の内部一時媒体を実体pathへ正規化する。
3. staging・公開競合の故障注入を、描画済みvideo成立後の1回へ限定する。
4. 正式205件はnative環境・固定NodeのPATHで全件を頭から1回だけ実行し、TAP全IDを版付き保存する。

この範囲外の契約改訂、28件目の実装file、検査期待の緩和、正式成果物の変更が必要になった場合は実装せず停止する。新attemptに1件でも不合格があれば同attemptで直さず停止する。
