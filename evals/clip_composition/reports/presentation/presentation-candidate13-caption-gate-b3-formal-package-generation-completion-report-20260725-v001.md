# candidate 13 基本テロップ ゲートB3 正式入力package生成 完了報告 v001

日付: 2026-07-25
対象: `DmWu0jVQfTE` candidate 13
生成系統: `presentation-caption-semantic-source-package-v001` / formal generation
実行前HEAD: `375518f4938125ffee4d6450cb1a1c98f893a4aa`
人間作業: 0件、媒体視聴なし、時間計測なし

## 1. 結論

B3は合格した。

B2で固定した残存354文字と機械境界候補205件から、Geminiへ渡す前のsource-only入力packageを正式7ファイルとして一度だけ生成した。CLI、正式公開、公開後再読、固定値照合はすべて合格した。

この結果は、**元の文字・時刻・ID・候補対応・表示幅の来歴を保った正式入力ができた**ことを意味する。自然な改行、意味品質、Gemini回答、表示計画、演出指示書、描画品質はまだ検査していない。

## 2. 正式jobと実行前preflight

- 正式job:
  `evals/clip_composition/outputs/presentation/caption-semantic-source-package-jobs/DmWu0jVQfTE-candidate-13-caption-b1-v001.json`
- job ID:
  `DmWu0jVQfTE-candidate-13-caption-semantic-source-package-formal-v001`
- job SHA-256:
  `cefcc699d2a4c47c6da4e5799dd5adb218c163668c1f9c212bbb483d9e173278`
- mode: `formal-generation`
- package ID:
  `DmWu0jVQfTE-candidate-13-caption-semantic-source-package-v001`
- 正式出力先:
  `evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/DmWu0jVQfTE-candidate-13-v001`

B2の読み取り専用jobとの差は次の4箇所だけだった。

1. job ID
2. 読み取り専用から正式生成へのmode変更
3. 監視投影から除外するjob自身のpath
4. 正式job保管先と正式出力先の親を準備した後の監視投影hash

正式jobのschema検査は合格し、正規化したJSONと実byteも一致した。正式root、同名`.lock`、同名`.work`は実行前にすべて不存在だった。

## 3. 親directoryの準備

workspaceから`evals/clip_composition/outputs/presentation`までの各ancestorが、symlinkでない実directoryであることを確認した。

準備工程は、存在しなかった次の直近親だけを非再帰・排他的に作成した。

| 用途 | path | 種別 | symlink | device | inode |
|---|---|---|---|---:|---:|
| 正式job保管 | `evals/clip_composition/outputs/presentation/caption-semantic-source-package-jobs` | directory | なし | 16777231 | 81950940 |
| 正式7ファイルの親 | `evals/clip_composition/outputs/presentation/segmenter-boundary-evidence` | directory | なし | 16777231 | 81950941 |

production runnerへ親の自動作成やfallbackは追加していない。

## 4. 一回限りの正式生成

| 項目 | 実測 |
|---|---|
| 正式runner起動回数 | 1回 |
| 自動再試行 | 0回 |
| CLI終了 | 0 |
| stdout | 3,602 byte |
| stdout SHA-256 | `b356a763c5c1c8ee0cae35f1cef68b562b4ab586b7196ca00ec192743f58be8f` |
| stderr | 0 byte |
| stderr SHA-256 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| run report | `passed` |
| run reportの検査 | 19/19 passed |
| 違反 | 0 |
| 公開状態 | `published_validated` |
| 公開失敗 | 0 |

lockを保持した作業directoryへ固定7ファイルを書き、入力再照合後にdirectory単位で正式rootへ一度だけ公開した。終了後は`.lock`と`.work`が不存在で、正式rootだけが残った。

## 5. preflight固定値との照合

### 5.1 件数

| 単位 | 固定source文字 | 実測source文字 | 固定候補 | 実測候補 | 結果 |
|---|---:|---:|---:|---:|---|
| 全体 | 354 | 354 | 205 | 205 | 一致 |
| container 1 | 126 | 126 | 60 | 60 | 一致 |
| container 2 | 122 | 122 | 78 | 78 | 一致 |
| container 3 | 106 | 106 | 67 | 67 | 一致 |

### 5.2 preflightで固定した証拠hash

| 意味 | 固定値 | 正式成果物 | 結果 |
|---|---|---|---|
| 205候補の内容と順序 | `0f8e7b07c32befc4e4703e1945b61e7656a2e978a8ba959fd169a753efe454b6` | `0f8e7b07c32befc4e4703e1945b61e7656a2e978a8ba959fd169a753efe454b6` | 一致 |
| 354文字の所属と順序 | `b2da8ee1b3fef9c23b5598d73713d77831f392471cf98a9723392ef115ea50fd` | `b2da8ee1b3fef9c23b5598d73713d77831f392471cf98a9723392ef115ea50fd` | 一致 |
| 境界証拠全体 | `be4344dd5d97596a815a92ae283d0da3c7353600b2983e93cf53b1947c5338eb` | `be4344dd5d97596a815a92ae283d0da3c7353600b2983e93cf53b1947c5338eb` | 一致 |

残存発話、Gate A jobと完了報告、package実装、描画信頼情報、プリセット・素材台帳、Node実体も、jobに固定したhashと報告前の現物hashがすべて一致した。

## 6. 正式7ファイル

固定名称7件だけが存在し、すべて通常ファイル、symlinkなし、hardlinkなし、subdirectoryなしだった。

| ファイル | byte | file SHA-256 | canonical SHA-256 |
|---|---:|---|---|
| `segmenter-boundary-evidence.json` | 118,391 | `40230b94302914261b7e2c46c51cb0fc46ae18b26b99580ea2f74f1b02666c43` | `be4344dd5d97596a815a92ae283d0da3c7353600b2983e93cf53b1947c5338eb` |
| `embedded-gate-a-validation-report.json` | 5,331 | `2ffaa7ae5edfc0950163e664aa09c85057782dc1c74bd20bdcd1eb289565fa19` | `2888713124874501f58426e1b9e862e2cc9aedea0e73af4cafa4f24fce4f849c` |
| `semantic-source-input.json` | 30,279 | `c350a402db15ff7a5405894f939f0a66522482d6d8c78584fe5b55d9dc489980` | `cd642ea72b85d23246538174e013a549465ad8770b0722aa834644a9008ddba6` |
| `deterministic-expansion-map.json` | 85,529 | `33c42a4c625452c6d120f59ccb5a8e78822f9008f5121a91a32e9d3be7133b3d` | `16431dbe0c58386b28a9101849cfa4596076ef956b80aa8dc7d882215be109fc` |
| `source-only-leakage-report.json` | 2,040 | `e2963f6e4e1e68823a97bd66483b8e13688230961f03190bea259d29997003ec` | `9fe6bce5f82de4bb1959c46c011b0a0767607d6684c80f367da0b31018a6088a` |
| `package-manifest.json` | 8,680 | `da4ceb97487833bf50cbbb01252908b04d7e63230d667f625697557d6ae5ae96` | `2a52aab31e9ae04defc8ce99693290087b59722af20a02cd3e40a7ba4970f3d1` |
| `package-validation-report.json` | 4,727 | `18e9b315bba962c16e7e60112c9f08156e4d7ad7b0babef3ec08c0bfebfa8661` | `0b2813cdf4d28318310d8d769122ef5758297efbddaf60b1aac9218df0571a1e` |

manifestが固定する内容集合のcanonical SHA-256は
`e601e30bbd37040c721de8bad06d8bd0f50a1f0b6e6f69b56c28c9a8e9cbb03a`。

manifest内の5内容ファイル参照、job参照、入力・実装参照は、報告前に読み直した現物と完全一致した。validation reportは15/15 passed、違反0だった。

## 7. 合格範囲と未実施

B3で成立したもの:

- Geminiへ渡すsource-only入力
- 元文字へ戻す決定的対応表
- Gate A証拠の内包
- 正解・教師由来情報を入れない検査
- 正式7ファイルの原子的公開と公開後再読

B3に含めず、実施していないもの:

- prompt台帳登録
- execution payload
- Gemini・他LLM実走
- 表示計画
- 演出指示書
- 描画
- 自然な改行・読みやすさの人間認定

次の停止点はB4の表示計画契約である。B3合格を理由にB4、B5、B6へ自動進行しない。

## 8. 安定点

本報告、正式job、正式7ファイル、`DECISIONS.md`、`docs/HANDOVER.md`、`JOURNAL.md`を同一commitへ固定し、全検査合格・正式成果物hash一致・正本同期の3条件が成立した場合だけ、同commitへ`stable/b3-complete-20260725`を付ける。

このタグへ撤退すると、B4以降の表示計画、prompt、Gemini回答、演出指示書、描画を失う。タグ時点ではそれらはまだ存在しない。
