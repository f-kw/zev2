# C工程 タイトル背景・文字サイズ・改行確認版 完成物検証レポート v003

- 日付: 2026-08-09
- 対象: 元配信`qdczJpv8RCc`、candidate 59
- API通信: 0回
- 追加費用: US$0
- 実行した: はい（正式描画、描画後QC、既存回帰、静止画による実物確認）
- 人間認定状態: 文言・位置・表示時間は確定済み。新版styleの目視だけ未確認

## 1. 結論

指定された変更は機械検証上すべて成立した。

- 内容カードのように見えた濃い背景板を削除した。
- 文字を70pxから、既存の人間認定値80pxへ拡大した。
- 横型は全文1行、縦型は自然だった2行を維持した。
- 上部位置、冒頭6秒、字幕31件、全1,547 frame、音声は変えていない。

最終的な見た目の合否だけは、人間による冒頭6秒の確認を待つ。

## 2. ユーザーから見た変化

正式タイトルは`片付けの「やりかけ癖」を語るマリン船長`のまま。

横型では、画面上部へ次の1行を表示する。

```text
片付けの「やりかけ癖」を語るマリン船長
```

縦型では、同じ本文を次の2行で表示する。

```text
片付けの「やりかけ癖」
を語るマリン船長
```

どちらも濃い背景板はなく、白い明朝体だけを冒頭6秒表示する。

## 3. 確認動画

### 横型

- path: `evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-landscape-v004-output/title-rendered-v001.mp4`
- SHA-256: `841d0adbcc866c645022e6556a23d48bf74f76efeae9ef5f5808eaa878b25062`
- 1920×1080 / 51.566016秒 / 1,547 frame
- タイトル: 1行、frame 0〜179
- QC: 6/6

### 縦型

- path: `evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-vertical-v004-output/title-rendered-v001.mp4`
- SHA-256: `e7c04fe265ddf88e0ec7e411975e9bd649f19533c00605f479a55dfd886e1695`
- 1080×1920 / 51.566016秒 / 1,547 frame
- タイトル: 2行、frame 0〜179
- QC: 6/6

## 4. 機械検証

| 検証 | 結果 |
|---|---:|
| タイトル契約・runner・横1行／縦2行の固定検査 | 61/61 |
| 横型描画後QC | 6/6 |
| 縦型描画後QC | 6/6 |
| 既存green | 287/287 |
| 既知baseline | 86/203、不合格117件でexact不変 |
| 既存正式成果物tree | 5/5 |

描画後QCは、元動画束縛、タイトル本文、タイトル適用、配置と可視性、frame数、音声の6項目を検査した。二形式とも元動画と出力動画の音声packet SHAが一致した。

正式描画前の準備では、最初の確認command 2件がそれぞれTypeScript入口の読み込み方を満たさず失敗した。正式jobや動画はまだ公開していない段階のharness失敗として記録を残し、固定TSX loaderを使う正式preflight v003で合格してから、各形式を一度だけ描画した。productionの合格条件や入力値は変更していない。

## 5. 既存成果物への影響

- v001・v002のtitle registry、旧job、旧動画は変更していない。
- 新版はregistry v003、job/output v004の新しいpathだけへ公開した。
- タイトル本文を持つ意味情報パッケージv002はbyte不変で再利用した。
- fallback、旧版変換、候補59固有の分岐は作っていない。
- C工程の安定tagはまだ発行していない。

## 6. 実物確認

横型・縦型の1秒地点を画像化して確認した。背景板が無いこと、80pxの白い明朝体であること、横型が1行、縦型が2行であることを実物で確認した。

画面上の最終的な読みやすさと、背景板を外した見え方が意図に合うかは機械判定にしない。kawafmmの目視を正本とする。

## 7. 事実・推測・未確認

### 事実

- 背景板は`null`で、文字周囲の追加marginも0である。
- 文字サイズは80px。
- 横型は1行、縦型は2行。
- 二形式ともQC 6/6、1,547 frame、音声packet SHA一致。
- API通信0回、費用US$0。

### 推測

- 背景板を外したため、内容に関係する情報カードと誤認される要因は減ったと見込む。

### 未確認

- 新版styleの最終的な人間合否。
- 人間合格後のC工程安定点化。

## 8. 証拠

- 正式検査TAP: `evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v003/targeted-attempt-0001/title-targeted-61.tap`
- 描画検証: `evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v003/render-verification-v001.json`
- 1秒地点画像: `evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v003/visual-check/`
- green TAP: `evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v003/green-287-attempt-0001/green-287.tap`
- baseline TAP: `evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v003/baseline-203-attempt-0001/baseline-203.tap`
- 5 tree TAP: `evals/clip_composition/reports/presentation/test-runs/20260809-zevo-title-c-v003/five-tree-attempt-0001/five-tree.tap`

## 9. 次の人間作業

確認ページで横型・縦型の冒頭6秒だけを見る。確認点は、背景板が消えたこと、文字の大きさ、横1行／縦2行の自然さの3点。人間作業は1判断、約15秒。

候補プール、UI、ChatGPT投稿の確認項目は本経路と別系統なので、本レポートの合否へ混載していない。
