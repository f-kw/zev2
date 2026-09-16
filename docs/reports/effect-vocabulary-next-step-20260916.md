# ZEV 演出語彙の整理と次工程

日付: 2026-09-16

base: `c16a64cf82477fd980d9fa5f9f99bddc0a71ee34`

branch: `codex/digest-effect-vocabulary`

## 1. 採用済み名称

ユーザー確認により、次の二つを正式な効果名として扱う。

- **Color Accent** — 文字色を変えて目立たせる効果。
- **Scale Accent** — 文字を拡大して目立たせる効果。

従来の `Focus` / `Vocal accent` は、v004保存contractに残る内部storage tokenとしてのみ扱う。公開上の効果名・説明名として新規文書や判断promptへ増やさない。

「意味上重要」「声の勢いがある」は効果名ではなく、自動判断が効果を選ぶ根拠である。

## 2. 命名ルール

重要な新名称は実装側で仮称を置いてよいが、ユーザーの明示採用なしに正式名称へ昇格させない。

このルールにより、次の演出候補は現時点で `panel` という内部仮IDだけを持つ。`Background Accent`、`Panel Accent` 等を正式名称として確定しない。

## 3. 次の演出候補の条件

ユーザー評価から、通常版や中間版と比較しなければ価値が分からないほど微弱な演出は追加しない。

次候補は次を満たすものに限定する。

- 完成版を単体で見ても変化が認識できる
- 内容を壊さない
- 既存Digest正本を変更しない
- 有限presetである
- AIから自由な描画値を受け取らない
- 三層保存と一件overrideを壊さない
- 正式名称は未承認のまま保持できる

## 4. 今回開始した実装

既存rendererがすでに持つ字幕背景描画を利用し、仮の第三演出 `panel` の有限presetをmanual/trial経路へ追加した。

現行presetは次だけを変更する。

- `visualState.background.color`
- `borderRadiusPx`
- `paddingXPx`
- `paddingYPx`

本文、改行、字幕時刻、位置、font size、font color、保持区間、Prospect、元動画対応は変更しない。

`panel` は自動判断へまだ接続していない。正式採用でもない。まず有限描画能力として局所性を固定し、その後に既存layout/QCと実素材で成立するかを確認する。

専用テスト `presentation_effects_panel_v001.test.mjs` を追加し、選択字幕の背景だけが変わること、他字幕・本文・時刻・位置・text styleが不変であること、自由な色指定等を受けないことを検査対象にした。

## 5. 次に自走する順序

1. 既存検査を含めて `panel` の回帰を確認する。
2. 既存layout inspection / renderer QCへ通し、長字幕・二行字幕・safe areaを確認する。
3. 既存161秒素材へ仮適用できる最小の判断contractを作る。自動件数quotaは置かない。
4. 単体で見て意味がある候補だけを残す。微差なら破棄する。
5. 人間評価へ出す場合も、その時点で一番機能が入った完成候補だけを提出する。通常版・少機能版を視聴課題にしない。
6. 効果自体が有用と判断された後に、正式名称をユーザーへ確認する。

main merge、tag、stable、releaseは行わない。
