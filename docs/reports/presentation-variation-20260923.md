# 4. 表現バリエーション拡充

担当: Codex1。実施日: 2026-09-23〜24。着手時main: `79e527aa135472af98d8469959e70cfcbfbe40a8`。remote同一、clean、untracked 0。

## 4.1 指示と外観の固定（実装前）

2026-09-23の個別指示に基づき、最大2外観の選択・保存・再読・描画・一件修正・Reset、既存Digestの確認動画1本、検証・記録・main commit/push・指示元への直接報告までを扱う。新素材、AI判断の再実行、動き・時計・本文の変更、他エピックの再開は対象外。

目的は字幕の見せ方の単調さを減らすこと。現物確認の結果、無地と方眼紙、4配色、保存とResetは既に存在するため、新しいデザインや同等のrendererを追加しない。

| 固定した外観 | 差と用途 | 再利用・変更範囲 | 確認対象 |
|---|---|---|---|
| 無地Panel | 文字を一枚の面にまとめる。短い説明・状況のまとまり | 既存Panel・配色・余白・書体をそのまま再利用。保存原案とResetの比較基準 | HRB、字幕000014「なんかグロいやつに捕まってる」の保存原案（暖色） |
| 方眼紙Panel | 同じ面へ格子が入り、色以外にも違いがある。状況を観察・整理する字幕の技術見本 | 既存ローカルSVGと同じ暖色を再利用。000014の背景だけを手指定で変更 | 同じ字幕、完成動画58.200–60.566…秒（frame 1746–1817、終了端除外） |

対象IDの共通接頭辞は `digest-human-caption-repair-20260907-v001-instruction-instruction-`。対象外000022の暗地無地、000031の暗地方眼紙を含む既存選択を保持する。2種類を全動画へ使うノルマにはしない。

既存判断は [R1〜R3の完成記録](review-reflection-r1-r3-20260921-v002/COMPLETION.md) を参照。コミック枠は明示的に新しい選択・編集から除外されたため復活させない。無地・方眼紙の既存評価を取り消さず、今回の手指定を新しい自動判断や人間の正式採用と扱わない。

使用する作品はR1〜R3反映済みHRB全体候補（4878frame、162.6秒）。保存済み `hrb-integrated-v003` の通常計画・判断入力・自動案・人修正を現行mainの読取境界で検証できた。対応する完成媒体・字幕なし合成元も現存する。旧工程IIIの編集サービス設定は媒体・proofの参照先が欠落しているため、それを新作品へ偽装せず、現在も再読できる全体候補と既存の一件編集CLI・共通rendererを使用する。

必要な限定実装は、一件編集CLIが現行Panelの必須配色を指定・表示できない接続漏れの修正。既存の有限配色を明示指定できるようにし、除外済みコミックを新しい操作候補へ出さない。描画規則、保存済み版・hash、自動案、選択AI、QC判定は変更しない。

## 4.2 接続・保存・Reset

既存CLIへ `--palette ivory / cool / warm / dark` を接続し、現在状態と保存済み自動案の配色も表示するようにした。無地と方眼紙の操作では配色を必須とし、未知・重複・他操作への配色指定、および除外済みコミックの新規指定を保存前に拒否する。既存の有限定義、判断・描画規則の版、renderer、QC本体は変更していない。

実Digestで、CLIの別プロセスから方眼紙（暖色）を保存→別プロセス再読→Normal保存→別プロセス再読→Reset保存→別プロセス再読を実施。全段階で自動案、通常計画、他31字幕、対象外の人修正が一致した。Reset後は保存済みの人修正と解決計画が元のものに完全一致し、元からある冒頭字幕のNormal指定も保持した。最終描画は最初に保存した方眼紙指定を使用する。

最終指定は [selected-overrides.json](presentation-variation-20260923/selected-overrides.json)、入力hash・独立再読・実描画適用検査は [verification.json](presentation-variation-20260923/verification.json) に保存。元作品の保存物はすべて読取りのみ。

既存CLIの利用例（パスは保存済み入力・出力へ置換する）：

```sh
node evals/clip_composition/edit_auto_presentation_v001.mjs panel-graph-paper \
  --baseline <通常計画> --decision-input <判断入力> --auto <保存自動案> \
  --overrides <現在の人修正> --caption-id <対象ID> --palette warm --output <新規保存先>
node evals/clip_composition/edit_auto_presentation_v001.mjs reset \
  --baseline <同じ通常計画> --decision-input <同じ判断入力> --auto <同じ保存自動案> \
  --overrides <変更を保存した人修正> --caption-id <同じ対象ID> --output <別の新規保存先>
```

## 4.3 検証

- 保存・選択・版・未知指定・旧保存再読・対象外保持の53試験と、保存IOの25試験が合格。
- Native Panelの7試験が合格。短文・2行が通り、横幅超過・3行・行重なりは元の期待どおり拒否。合計85試験、未解決failure 0。
- 今回の実字幕は方眼紙・Normal・Reset後の無地の3段階で、本番の実描画適用検査に合格。文字欠け・領域超過・行衝突の違反0。
- 暖色の無地と方眼紙の実PNGを比較。文字マスクの全RGBAと板の全alphaが完全一致し、格子で26,717画素のRGBが変わった。文字形や板の大きさを変えて種類数を水増ししていない。両画像をCodexでも確認した。
- 保存入力の所在を明示できるよう実入力テストの参照先だけを調整。旧Panel単独テストに欠けていた本番と同じ文字の実測・中央配置を検査側に接続した。fixtureの本文・寸法・値・拒否期待値、QCの合格条件は変更していない。最初の不合格ログも証拠に保存した。
- 全工程の固定文字起こし欠損は今回復旧していない。全体 `pnpm test` の成功を主張せず、今回必要な経路を上記の試験・実走で検証する。

実行はNode v20.19.6、既存ffmpeg・ImageMagick・Remotion・LINE Seed書体。検証用の [実行スクリプト](../../tools/digest-quality/panel-variation-verification.mjs) は、保存済み完成記録を入力に受け、`prepare` でCLI保存・再読・局所検査、`render` で同じ字幕なし媒体と保存設定を共通rendererへ渡す。新しい選択AI・汎用評価基盤ではない。

テストの再実行は、Node20をPATH先頭に置き、`ZEV_PANEL_SAVED_OUTPUT_ROOT` に現存する `.../stage4-editing-20260918-v001` を明示して以下を実行する。

```sh
node --test evals/clip_composition/edit_auto_presentation_v001.test.mjs \
  evals/clip_composition/presentation_orchestration_panel_palettes_v003.test.mjs \
  evals/clip_composition/presentation_orchestration_panel_background_v002.test.mjs
node --test evals/clip_composition/presentation_auto_effects_io_v001.test.mjs
node --test evals/clip_composition/presentation_auto_effects_panel_v001.test.mjs
```

## 確認動画・完了状態

[確認動画（MP4）](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/presentation/stage4-editing-variation-20260923-v001/render/presentation-rendered-v002.mp4)。既存の媒体ファイル再生導線から開ける。Codexのファイルパネルにも表示を要求済み（UI応答はqueued。プレイヤーでの再生操作を完了したとは扱わない）。1920×1080、30fps、4878frame、162.6秒、73,592,255bytes。動画本体は既存の `stage4-editing-*` 成果物置場のignore対象で、Gitには追加しない。

| 字幕ID末尾 | 完成動画上の表示区間（終了端除外） | 今回の扱い |
|---|---|---|
| 000014 | 58.200–60.566…秒 | 保存原案の暖色無地から、暖色方眼紙へ一件だけ手指定 |
| 000022 | 119.933…–123.466…秒 | 既存の暗地無地を保持 |
| 000031 | 153.300–157.200秒 | 既存の暗地方眼紙を保持 |

完成動画QCは合格、違反0。全編の独立再描画とのMP4バイト一致と、32字幕・選定158フレーム・22,269比較候補を扱う既存の実画素QCが合格した。158は検査用に選定したフレーム数であり、全4878フレームを個別に画素検査したという意味ではない。完成MP4から59.333…秒・121.666…秒・155秒の実フレームを抽出し、変更した方眼紙と保持した2字幕の外観、文字の表示領域を確認した。

完成動画SHA-256: `82957560ab7123cb54c76d63ee9865c7116050cf94b819f54e662f0bbfee4c6f`。元Digestと完成動画のAAC音声ペイロード、および44.1kHz・7,170,660サンプルの論理PCMがそれぞれ完全一致した。元作品の保存入力・完成媒体・字幕なし媒体のhashは実行前後で不変。本文・改行・ID・時計・元動画対応・接続・保存自動案・対象外31字幕の指定は維持した。

全編の詳細証拠は同じ成果物置場の `completion.json`、実フレームは `completed-frames/`。Git管理する軽量要約には詳細証拠と媒体のhashを記録した。今回作った一時ログは同じ置場の `execution-logs/` へまとめ、未整理の一時ファイルは残さない。`.gitignore`の追加・変更はない。

### 指示書の完了条件との照合

1. 最大2外観の選定理由と差: §4.1に実装前に固定。既存の無地・方眼紙を再利用し、新規種類の追加なし。
2. 選択・保存・再読・描画・一件修正・Reset: CLI別プロセスと実字幕の3段階検査、完成動画で確認済み。
3. 内容・時刻・対象外指定・過去保存物の保全: 不変比較と保存物hash一致で確認済み。
4. 必要なtest・実フレーム・確認動画1本: 85試験合格、局所検査と完成動画QC合格、媒体を提出可能。
5. 技術結果と人間採用の区別: 000014は手指定の技術見本。無修正の自動生成品質、人間の視聴・正式採用、新素材全般の品質保証は主張しない。既知の固定文字起こし欠損を伴う全工程testは未確認のまま明記した。
6. 記録・commit・main push・Git整理: 本記録とコード・小型証拠を今回のcommit対象とする。commit SHA、push、最終Git状態、指示元会話への送信確認は完了報告で示す。

今回の技術範囲の未完了事項なし。人間の追加作業要求0件。別の外観追加や編集サービス旧参照の復旧は今回に必要なく、Not nowとする。完了報告後は別エピックへ自動着手しない。
