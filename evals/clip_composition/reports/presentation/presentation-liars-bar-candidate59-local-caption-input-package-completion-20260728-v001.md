# Liar's Bar candidate 59 ローカル字幕入力package 完了報告 v001

- 日付: 2026-07-28
- 対象: `qdczJpv8RCc` candidate 59
- 人間作業: 0件
- 外部通信: 0回
- API費用: US$0

## 1. 結論

人間が採用した51.567秒の切り分けから、Geminiへ渡す直前の
source-only入力packageまで、ローカル工程を完了した。

成立したもの:

- 人間が見た切り分けと同じ1,547 frameの基礎映像。
- 切除後に残る発話281文字。
- 発話まとまり2件と、行末として選べる境界候補164件。
- 元文字・時刻・IDへ戻せる対応表。
- Geminiへ渡す正式入力7ファイル。

まだ実施していないもの:

- `countTokens`による入力token計測。
- Gemini生成。
- Gemini回答の受入。
- 表示計画、字幕描画、完成字幕の人間目視。

## 2. 基礎映像

正式出力:

`evals/clip_composition/outputs/presentation/base-media/qdczJpv8RCc-candidate-59-v001`

| 成果物 | SHA-256 |
| --- | --- |
| `base-media.mp4` | `faad660c7623cdbf3a8f3b55cdaffc34729d06683ce391997c51f10fbc076967` |
| `timeline.json` | `dbebfe08882aabf66f4c7b13f4489f3bd7348e7bd499ec783250827ccddafcb2` |
| `generation-manifest.json` | `bc47f29089eaaf1a062593add2d8690971682d80d474d168dce6114aebf7b9e6` |
| `validation-report.json` | `b091465fca55f258fd2c33076b1ae864b82ee8576af6b40f6f636c735b79d776` |

実測は1920×1080、30fps、1,547 frame、AAC 48kHz stereo、
2,475,200 sample、51.566667秒。

現在の基礎映像生成器は字幕canonical処理の信頼SHA不一致を残しているため、
candidate 13で合格済みのcommit `3c2e03772b7db2be718ccf2a30796dbdcc1d8b39`
を隔離環境で一度だけ実行した。隔離版の直接検査は35/35、
生成物の検査は7/7で合格した。

これは履歴上の検証済み生成経路を使った正式成果物であり、
現在の基礎映像生成器を修復したという意味ではない。

## 3. 残存発話と機械境界候補

残存発話の正式出力:

`evals/clip_composition/outputs/presentation/retained-source-atoms/qdczJpv8RCc-candidate-59-v001`

| 項目 | 結果 |
| --- | ---: |
| 残存文字 | 281件 |
| 発話777 | 162件 |
| 発話778 | 119件 |
| 欠落・余分・切除範囲との交差 | 0件 |
| source atoms canonical SHA-256 | `25d27b6b67d16fa63b0b9733505e4b7c77fa427755bab741aca060837457c36b` |

Gate Aの読み取り専用preflightは21/21、残存発話回帰は50/50で合格した。

| 項目 | 結果 |
| --- | ---: |
| 発話まとまり | 2件 |
| 行末候補 | 164件 |
| まとまり1 | 162文字・91候補 |
| まとまり2 | 119文字・73候補 |
| 行末候補canonical SHA-256 | `4c43c6487e2c2ef9de6b476ff2e742419f6d1c504921259111bc8abe8dbfb1c5` |
| 文字所属canonical SHA-256 | `f6a409410b3039a7c967dd00febc526d2f1b3bf84bde8d0c6cddf52a83bc4494` |
| 境界証拠canonical SHA-256 | `ef78a1ec86e8f72c337fb23b95e7bb4ee6ac6e567d4ea6aba4b0c0036bc3cfe8` |

## 4. B3正式入力package

正式job:

`evals/clip_composition/outputs/presentation/caption-semantic-source-package-jobs/qdczJpv8RCc-candidate-59-caption-b1-v001.json`

- job SHA-256:
  `ea5de55f1726ba744b82f004e52c38da1037223ad427f2bec98606cdb2feadd1`
- 読み取り専用preflight:
  17/17、違反0、監視先不変。
- 正式runner:
  1回。
- 自動再試行:
  0回。
- 終了:
  0。
- stdout:
  3,602 byte、
  SHA-256 `76ac169984b2d73645a51ece9bb9604ff8410f26526510b678fbcefc73ddf350`。
- stderr:
  0 byte。
- 正式検査:
  19/19、違反0。
- 公開:
  `published_validated`。
- lock / work:
  終了後は不存在。

正式7ファイル:

`evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/qdczJpv8RCc-candidate-59-v001`

| ファイル | byte | SHA-256 |
| --- | ---: | --- |
| `segmenter-boundary-evidence.json` | 96,011 | `55f8c39bb7211b037e2b6dbd17d8f19e235fc633fdc399eb8cc6bae25807299f` |
| `embedded-gate-a-validation-report.json` | 4,875 | `500bbf38dec8f98bfca3027dc26c7c3291a96efd59fdabc354cadb05c592e2a3` |
| `semantic-source-input.json` | 24,257 | `ead2a47ef57480c3da9e598a650059a92c1f1519b25b94d2617b86485f79433a` |
| `deterministic-expansion-map.json` | 69,646 | `29dd63800c8f5947c54874b7cb55b70e1d1b32b069619dd54e7cd2a284c7ef6d` |
| `source-only-leakage-report.json` | 2,040 | `64ef172e54b84df3c60afdcd6b46aa159ea0befdba20a5ca5af45da678e9e6ed` |
| `package-manifest.json` | 8,711 | `c26aa7065a73cd6be391cc6eb7de3477480f84407e173b5882a99d08a8ae3cd0` |
| `package-validation-report.json` | 4,588 | `0cef4e5ee6dea5218ad38b9d868f07a73b2252c7d6519496212b64217dcf1700` |

内容集合のcanonical SHA-256は
`0579fe7da51b0487a33b30c9663eb0c742385b64d4d42347efd41ea43775d26d`。
7ファイル以外、symlink、hardlink、subdirectoryは0件。

## 5. 合成fixtureの既知不具合

B3生成処理の旧合成検査を現在の作業ツリーで実行すると43/133だった。
90件は、candidate 13専用fixtureが古いGate A実装SHAを固定しているため、
現在の承認済み残存発話処理を読み込んだ時点で
`context-invalid`になる同一原因である。

これはcandidate 59の実入力経路の不合格ではない。
candidate 59の実jobは読み取り専用preflight 17/17、
正式生成19/19で合格した。

旧fixtureやcandidate 13正式成果物は今回変更していない。
この負債を133/133と報告せず、別の検査fixture課題として残す。

## 6. 次の停止点

次はB5初回token計測である。

- Googleへ送るもの:
  今回の`semantic-source-input.json`と、
  回答形式の最大構造を数えるための入力。
- 外部呼出し:
  `countTokens`を2回。
- Gemini生成:
  0回。
- 自動再試行:
  0回。
- timeout:
  各600秒。
- API key:
  環境変数からだけ読み、生key保存0件を検査する。
- 課金:
  応答から実課金を観測できないため、未確認として記録する。

B5を実行すると入力tokenの実測値と、次のB6生成1回の費用上限を
独自換算なしで提示できる。外部送信を含むため、ここで人間承認へ戻す。

B5合格後もB6へ自動進行しない。
