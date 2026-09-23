# Q4 実走入口の限定再監査 v002

**前回の指摘2件は解消。今回の限定範囲で残る必須修正は0件。**

## 修正確認

1. 新判断の依頼を保存する前と、保存依頼を再読するときの両方で、元資料から入力全体を再構成して照合する。新判断と明示再コンパイルの区別、元資料の対応、通常接続の維持、入力ハッシュが一致しなければ先へ進まない。
2. HRB比較に使う旧字幕自動案・旧接続自動案を、旧選択記録のcanonical SHAへ照合する。両原文を来歴へ含め、最後にも原文SHAを再読する。現物の来歴6参照は全件SHA一致。

修正箇所の読み取りと [最小確認6件](root-path-audit-checks-v002.stdout.json) で確認した。正常な新入力の受理、ハッシュを付け直した技術再コンパイル入力・別資料対応・接続制約解除の拒否、旧自動案2点のSHA一致が6/6。終了0、標準エラー0 byte。[実行記録](root-path-audit-checks-v002.json) を保存。本体37件は再実行していない。

## HRBを追加描画しない判断

[受領指示§5A](instruction-received-v001.md) は「Q1の同じ事実を再証明するだけの動画は作らない」、§7・§11は未選択背景の手補充や全背景を出すノルマを禁止する。したがって、Panel3件が独立した自動選択で全て無地だった今回、HRBの追加描画を不要とする扱いは指示と整合する。

保存した描画前計画v002は、対象と範囲を空にし、追加描画不要と理由を明示している。最初のPanelを描画する案だったv001も保持されている。両版の選択記録・字幕自動案・接続自動案・両修正記録・描画証拠の6ファイルはbyte同一で、選択結果を変えていない。両版共通の描画内容SHAは `b52b18ee495efcfedb05d2649e9aa3526cc2b495e49b6e0d590cc1eae2e159ed`。

これはHRBで新しい背景動画を検証した実績には数えない。C-allの実選択と必要短尺で背景が実動画へ届く確認、未選択背景の小型検査、人間未回答の区別は引き続き必要である。Q4全体の完成・人間品質合格をこの監査で認定しない。

## 読み取った実装

48 kHz対応は既存の44.1／48 kHzと30 fpsの投影に従う二箇所の変更で、局所音声標本数にも同じ時計を使っている。任意標本率や任意文字サイズへの一般化はない。指示文はQ1未回答・Q3仮説を採用根拠から除外し、HRBは明示再コンパイル入口を使っている。

対象実装のSHA：

- `tools/digest-quality/q4-run.mjs`: `e2e3efd8b8d17156c1201d8419309f76b8abca3457375961ca22b245e551ccf6`
- `tools/digest-quality/q4-recompile-hrb.mjs`: `3e4a3158aef1be310a36eed9227c01a3177c5f48239b47d7a28e17024c87dca8`
- `tools/digest-quality/q4-judgment-prompt.md`: `77b06c240eaedb8ffcbf908392700f70f34b6ad2be64c13e3113e9b516c83622`
- `evals/clip_composition/presentation_orchestration_render_scope_v001.mjs`: `3d4a6a2e06c659b7502f0d65a87cfb195d8a9599818893a3c32332da803e81e3`
- `evals/clip_composition/presentation_orchestration_edited_render_v001.mjs`: `efe6df57b2e2164d16743f1e1626a8f5a56fbce2a8ed426da654f085dc475f9d`

production編集・新描画・映像視聴・意味再判断は行っていない。
