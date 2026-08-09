# C工程 タイトル帯外側余白修正版 完成物検証レポート v004

- 日付: 2026-08-09
- 対象: 元配信`qdczJpv8RCc`、candidate 59
- API通信: 0回
- 追加費用: US$0
- 実行した: はい（契約検査、正式描画、描画後QC、静止画による実物確認）
- 人間認定状態: 文言・文字位置・表示時間は確定済み。全幅タイトル帯の目視だけ未確認

## 1. 結論

kawafmmが選んだ案Aを、新しい版付き経路へ実装した。

- 濃紺の帯は残した。
- 帯と最終画面の上端・左端・右端との外側の隙間だけを0にした。
- 文字と帯の縁の間にある内側余白は残した。
- 80px、横型1行、縦型2行、冒頭6秒を維持した。
- 横型・縦型とも正式描画後QC 6/6に合格した。

直前版で「背景板を外す」としたのはエージェントの誤読だった。却下経緯は消さずに保持し、本版ではユーザーの訂正どおり、帯そのものと文字の内側余白を残している。

## 2. ユーザーから見た変化

正式タイトルは`片付けの「やりかけ癖」を語るマリン船長`のまま。

横型は1行。

```text
片付けの「やりかけ癖」を語るマリン船長
```

縦型は2行。

```text
片付けの「やりかけ癖」
を語るマリン船長
```

濃紺帯は画面最上部の全幅を使う。文字は帯の縁へ貼り付けず、従来の安全領域と内側余白の中に置く。

## 3. 確認動画

### 横型

- path: `evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-landscape-v006-output/title-rendered-v001.mp4`
- SHA-256: `ad6187e23f3f586e7ce1db1fa8b5fedb54abc950ebe6de2a50ffcb616757b486`
- 1920×1080 / 51.566016秒 / 1,547 frame
- タイトル: 1行、frame 0〜179
- QC: 6/6

### 縦型

- path: `evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-vertical-v006-output/title-rendered-v001.mp4`
- SHA-256: `dc37a08f5fe1a34180b219da67ffa9fdff0ab86b46ca3ed8d509dd8b7901196c`
- 1080×1920 / 51.566016秒 / 1,547 frame
- タイトル: 2行、frame 0〜179
- QC: 6/6

## 4. 機械検証

| 検証 | 結果 |
|---|---:|
| タイトル契約・runner | 63/63 |
| 半透明の全幅帯を実PNGで測る限定QC | 1/1 |
| 横型描画後QC | 6/6 |
| 縦型描画後QC | 6/6 |

横型の帯は`left=0 / top=0 / right=1920 / bottom=200`、縦型は`left=0 / top=0 / right=1080 / bottom=301`として実PNGから測定した。文字は別のマスクで測り、横型は`left=203..right=1717 / top=95..bottom=173`、縦型の2行はそれぞれ安全領域内だった。

描画後QCは、元動画束縛、タイトル本文、タイトル適用、配置と可視性、frame数、音声の6項目を検査した。二形式とも全1,547 frameを保ち、元動画と出力動画の音声packet SHAが一致した。

### 停止と限定修正の記録

最初の横型v005は、半透明帯が実際には画面端まで描けていたのに、検査器が左上の半透明画素を背景と誤認して不合格にした。旧検査は帯を除外し、完全不透明な文字だけを測っていた。

修正はalphaが0より大きい画素を前景として測る処理だけに限定した。帯の画面端検査と、文字の安全領域検査は別々のまま維持した。v005は正式公開されず、縦型v005は実行していない。失敗時のworkとlockは証拠として保持している。

正式な契約回帰の起動では、最初にTSX loaderを付けず、次にReactの探索pathを付けず、検査本体前で2回失敗した。固定loaderと固定探索pathを揃えた正式条件では63/63に合格した。これはproductionの不合格ではなく、検査commandの設営不備である。

## 5. 既存成果物への影響

- v001〜v003のtitle registry、旧job、旧動画は変更していない。
- 直前のv004動画も再計算したSHAが従来値と一致した。
- 新版はregistry v004とjob/output v006の新しいpathだけへ公開した。
- タイトル本文を持つ意味情報パッケージv002はSHA `8838733c...fe0e`のまま不変。
- fallback、旧版変換、candidate 59固有の描画分岐は作っていない。
- 人間目視合格前なので、C工程のcommit・安定tagはまだ作っていない。

## 6. 実物確認

横型・縦型の1秒地点を画像化して確認した。機械観測では、濃紺帯が画面上端・左右端へ接し、文字には内側余白があり、横型1行・縦型2行・80pxである。

最終的に意図どおり見えるかは機械合格にしない。kawafmmの目視を正本とする。

## 7. 事実・推測・未確認

### 事実

- 背景は`rgba(13, 20, 35, 0.88)`、角丸0、内側余白は左右46px・上下28px。
- 帯は最終画面の上端・左端・右端へ接している。
- 文字サイズは80px、横型1行、縦型2行、表示はframe 0〜179。
- 二形式ともQC 6/6、1,547 frame、音声packet SHA一致。
- API通信0回、費用US$0。

### 推測

- 全幅帯にしたため、浮いた情報カードのように見えた外側余白は解消したと見込む。

### 未確認

- 全幅帯の最終的な人間合否。
- 人間合格後のC工程安定点化。

## 8. 証拠

- 契約・runner TAP: `evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v004/targeted/title-contract-runner.tap`
- 半透明全幅帯QC TAP: `evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v004/targeted/top-band-qc.tap`
- 描画検証: `evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v004/render-verification-v001.json`
- 1秒地点画像: `evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v004/visual-check/`
- v005失敗証拠: `evals/clip_composition/outputs/presentation/title-output-renders/.qdczJpv8RCc-candidate-59-c-title-landscape-v005-output.presentation-renderer-v002-work-zZtspr/`

## 9. 次の人間作業

確認ページで横型・縦型の冒頭6秒だけを見る。確認するのは、帯の外側の隙間が消えたこと、文字の内側余白が残ったこと、80px・横1行／縦2行が自然なこと。人間作業は1判断、約15秒。

候補プール、UI、ChatGPT投稿の項目は本経路と無関係なので混載していない。
