# theme_generation_prompt_v002

あなたは元配信から切り抜きテーマ候補を作る。

## 目的

元配信の文字起こしだけを見て、切り抜きとして成立しそうなテーマ候補を出す。最終的な切り抜き区間を確定する担当ではない。区間選択は後段のcompositionが行う。

## 入力の読み方

- 入力は元配信単体から得られる情報だけである。
- 切り抜き動画、expected、照合結果、人間確認メモ、既存切り抜きタイトルは入力に含まれない。
- `sourceTitle` は配信全体の文脈を読む補助情報として使う。
- `segments` は元配信内の発話で、`speechId`、時刻、本文を持つ。
- 入力が長尺配信の一部窓である場合は、その窓の範囲内で判断し、配信全体を見たように書かない。
- 笑い、沈黙、音量変化などの非発話シグナルが入力にある場合は補助情報として扱う。本文より強い根拠として扱わない。

## 禁止

- 切り抜き動画や正解区間を知っている前提で書かない。
- 元配信本文にない場面や反応を作らない。
- 秒数だけを根拠に候補を作らない。
- 「雑談」「面白い場面」のように広すぎて何を切るか決まらないテーマを出さない。
- 既存切り抜きのタイトル風に盛った表現を、本文根拠なしで作らない。

## 判断方針

- 候補は、元配信内の発話から見どころが説明できる具体的なテーマにする。
- 単独で視聴者に伝わるフリ、展開、反応、結論がある場面を優先する。
- 同じ話題が離れた場所で補足される場合は、同じテーマ候補の根拠として複数の発話範囲を持ってよい。
- 根拠範囲は、候補テーマを説明するために必要な発話だけにする。配信全体や長い雑談を大きく囲わない。
- 別話題をまたぐ場合は、1つの広い範囲にまとめず、該当する狭い範囲だけを返す。

## v002の出力方針

v002では、判断方針はv001から変えない。変えるのは出力形式だけである。

- 候補ごとの長文説明は返さない。
- 根拠は `evidenceRanges` の配列で返す。
- 同じ話題が複数シーンに分かれる場合は、1つの広い開始・終了で囲わず、狭い根拠範囲を複数入れる。
- `reason` は採用理由を1文だけで書く。
- 弱い候補を無理に埋めない。

## 出力

JSONだけを返す。説明文やMarkdownを付けない。

`requestedThemeCount` が指定されている場合は、その件数を上限にする。良い候補が足りない場合は、無理に埋めない。

```json
{
  "themes": [
    {
      "themeId": "theme_001",
      "title": "短いテーマ名",
      "reason": "切り抜きとして成立すると判断した理由を1文で書く。",
      "evidenceRanges": [
        {
          "sourceVideoId": "元動画ID",
          "sourceStartMs": 123000,
          "sourceEndMs": 153000,
          "supportingSpeechIds": ["12-47", 52, "55-60"]
        }
      ]
    }
  ]
}
```

## supportingSpeechIds

- 連続する発話IDは `"12-47"` のような範囲文字列で返す。
- 不連続な発話IDは、個別の数値として同じ配列に入れる。
- 連続範囲と個別IDを混ぜてよい。
- 根拠に使っていない発話IDを含めない。

## 時刻

- `sourceStartMs` は、その根拠範囲の最初の発話時刻にする。
- `sourceEndMs` は、その根拠範囲の最後の発話時刻にする。
- 同じテーマの根拠が複数箇所にある場合は、`evidenceRanges` を複数に分ける。間にある無関係な別話題を含めない。
- 正解境界を当てる評価ではないが、後段の機械判定でexpected区間との重なりを見るため、候補根拠の範囲を本文に基づいて正しく出す。

## 入力JSON

```json
{
  "task": "source_only_theme_generation",
  "generationSystem": "theme-llm-v002",
  "promptVersion": "theme_generation_prompt_v002",
  "requestedThemeCount": 8,
  "inputPolicy": {
    "sourceOnly": true,
    "noClipInfo": true,
    "noExpected": true,
    "noAlignment": true,
    "noHumanReverseTheme": true
  },
  "windowing": {
    "applied": true,
    "mode": "speech-time",
    "windowId": "window_09_qdczJpv8RCc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "qdczJpv8RCc",
    "sourceStartMs": 1247873,
    "sourceEndMs": 1254437
  },
  "sources": [
    {
      "sourceVideoId": "qdczJpv8RCc",
      "sourceUrl": "https://www.youtube.com/watch?v=qdczJpv8RCc",
      "sourceTitle": "【Liar's Bar】キミたちと初見であそぶ！視聴者参加型【ホロライブ/宝鐘マリン】",
      "transcriptKind": "local_stt",
      "language": "ja-JP",
      "durationSec": 7760.401,
      "rawSegmentCount": 23963,
      "promptSegmentCount": 38,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 238,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1247873,
          "sourceEndMs": 1247933,
          "text": "?"
        },
        {
          "speechId": 239,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1247933,
          "sourceEndMs": 1247973,
          "text": "え!"
        },
        {
          "speechId": 240,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1247973,
          "sourceEndMs": 1248013,
          "text": "?"
        },
        {
          "speechId": 241,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1248013,
          "sourceEndMs": 1248073,
          "text": "え!"
        },
        {
          "speechId": 242,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1248073,
          "sourceEndMs": 1248093,
          "text": "?"
        },
        {
          "speechId": 243,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1248093,
          "sourceEndMs": 1248133,
          "text": "え!"
        },
        {
          "speechId": 244,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1248133,
          "sourceEndMs": 1248153,
          "text": "?"
        },
        {
          "speechId": 245,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1248153,
          "sourceEndMs": 1248193,
          "text": "え!"
        },
        {
          "speechId": 246,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1248193,
          "sourceEndMs": 1248213,
          "text": "?"
        },
        {
          "speechId": 247,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1248213,
          "sourceEndMs": 1248253,
          "text": "え!"
        },
        {
          "speechId": 248,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1248253,
          "sourceEndMs": 1248273,
          "text": "?"
        },
        {
          "speechId": 249,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1248273,
          "sourceEndMs": 1248453,
          "text": "え!"
        },
        {
          "speechId": 250,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1248453,
          "sourceEndMs": 1248593,
          "text": "?"
        },
        {
          "speechId": 251,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1248593,
          "sourceEndMs": 1250054,
          "text": "え!"
        },
        {
          "speechId": 252,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1250054,
          "sourceEndMs": 1252516,
          "text": "?"
        },
        {
          "speechId": 253,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1252516,
          "sourceEndMs": 1252596,
          "text": "え!"
        },
        {
          "speechId": 254,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1252596,
          "sourceEndMs": 1252616,
          "text": "?"
        },
        {
          "speechId": 255,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1252616,
          "sourceEndMs": 1252656,
          "text": "え!"
        },
        {
          "speechId": 256,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1252656,
          "sourceEndMs": 1252676,
          "text": "?"
        },
        {
          "speechId": 257,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1252676,
          "sourceEndMs": 1252716,
          "text": "え!"
        },
        {
          "speechId": 258,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1252716,
          "sourceEndMs": 1252736,
          "text": "?"
        },
        {
          "speechId": 259,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1252736,
          "sourceEndMs": 1252776,
          "text": "え!"
        },
        {
          "speechId": 260,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1252776,
          "sourceEndMs": 1253756,
          "text": "?"
        },
        {
          "speechId": 261,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1253756,
          "sourceEndMs": 1253796,
          "text": "え!"
        },
        {
          "speechId": 262,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1253796,
          "sourceEndMs": 1253816,
          "text": "?"
        },
        {
          "speechId": 263,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1253816,
          "sourceEndMs": 1253856,
          "text": "え!"
        },
        {
          "speechId": 264,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1253856,
          "sourceEndMs": 1253876,
          "text": "?"
        },
        {
          "speechId": 265,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1253876,
          "sourceEndMs": 1253916,
          "text": "え!"
        },
        {
          "speechId": 266,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1253916,
          "sourceEndMs": 1253936,
          "text": "?"
        },
        {
          "speechId": 267,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1253936,
          "sourceEndMs": 1254056,
          "text": "え!"
        },
        {
          "speechId": 268,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254056,
          "sourceEndMs": 1254076,
          "text": "?"
        },
        {
          "speechId": 269,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254076,
          "sourceEndMs": 1254116,
          "text": "え!"
        },
        {
          "speechId": 270,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254116,
          "sourceEndMs": 1254136,
          "text": "?"
        },
        {
          "speechId": 271,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254136,
          "sourceEndMs": 1254177,
          "text": "え!"
        },
        {
          "speechId": 272,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254177,
          "sourceEndMs": 1254197,
          "text": "?"
        },
        {
          "speechId": 273,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254197,
          "sourceEndMs": 1254337,
          "text": "え!"
        },
        {
          "speechId": 274,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254337,
          "sourceEndMs": 1254357,
          "text": "?"
        },
        {
          "speechId": 275,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254357,
          "sourceEndMs": 1254437,
          "text": "え!"
        }
      ]
    }
  ],
  "outputContract": {
    "format": "json_only",
    "schema": {
      "themes": [
        {
          "themeId": "string",
          "title": "string",
          "reason": "string_one_sentence",
          "evidenceRanges": [
            {
              "sourceVideoId": "string",
              "sourceStartMs": "number",
              "sourceEndMs": "number",
              "supportingSpeechIds": [
                "number_or_range_string"
              ]
            }
          ]
        }
      ]
    }
  }
}
```
