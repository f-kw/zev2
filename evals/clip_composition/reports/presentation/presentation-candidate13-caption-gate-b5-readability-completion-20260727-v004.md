# candidate 13 B5 v004 入力計測 完了報告

- 日付: 2026-07-27
- 対象: `DmWu0jVQfTE` candidate 13
- 人間作業: 0件・0分

## 事実

- B5 v004は10要件群すべてに合格した。
- v003からの生成request差分は、承認された読みやすさ優先のsystem instruction 1文追加だけである。
- `thinkingLevel: medium`、B3意味入力、1行の上限入力、2行までの回答schema、model、料金方式は変えていない。
- 入力`countTokens`は1回だけ実行した。自動再試行0回、Gemini生成0回。
- 最大有効回答構造requestはv002とbyte同一であり、今回のAPI再計測は0回。検証済み3,758 tokenを来歴付きで参照した。
- 正式成果物は4件、保存した生API keyは0件だった。

## requestとtoken

| 項目 | v003 | v004 | 差 |
|---|---:|---:|---:|
| 生成request | 36,912 byte | 37,170 byte | +258 byte |
| 入力token計測request | 37,208 byte | 37,466 byte | +258 byte |
| 入力token | 9,212 | 9,258 | +46 |
| Paid Standard入力費用見積り | US$0.01381800 | US$0.01388700 | US$0.00006900 |

生成request SHA-256:

`92b8bee3426d6ad0822f0e81acb832a2340d468362ecff3d5b31f5a1b52bcfc0`

入力token計測request SHA-256:

`734e4e1e49cc7a647ae89df78e0d93b862430017182e6daaab0351e63864e94f`

## 正式成果物

| file | byte | SHA-256 |
|---|---:|---|
| `generate-content-request.json` | 37,170 | `92b8bee3426d6ad0822f0e81acb832a2340d468362ecff3d5b31f5a1b52bcfc0` |
| `input-token-count-request.json` | 37,466 | `734e4e1e49cc7a647ae89df78e0d93b862430017182e6daaab0351e63864e94f` |
| `input-token-count-response.raw.json` | 121 | `8f524acc5bc42a91edb89aaeb61eecc0a544be58e4d691140162d6233c8e20ea` |
| `b5-manifest.json` | 9,129 | `1f6bfba3fd20cb3e8be1694f4cc791a1443d0962cb3f7f371476c1f229d6ff8c` |

保存先:

`evals/clip_composition/outputs/presentation/caption-gate-b5/DmWu0jVQfTE-candidate-13-v004/`

## 未確認

- `countTokens`応答から、Google側の実課金額と実際に適用されたtierは確認できない。
- 短い2行がどの程度選ばれるか、B1へ受理されるか、読みやすいかはB6実走前なので未確認。

## 次

承認済みの連続範囲に従い、上記生成requestをbyte不変でB6へ1回だけ送る。B1受入、受理時はB4表示計画まで進め、どちらの場合も追加の修復・再実走をせず停止する。

