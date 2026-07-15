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
    "windowId": "window_08_qdczJpv8RCc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "qdczJpv8RCc",
    "sourceStartMs": 1241549,
    "sourceEndMs": 1247873
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
          "speechId": 200,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1241549,
          "sourceEndMs": 1243610,
          "text": "いやいやいや!"
        },
        {
          "speechId": 201,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1243610,
          "sourceEndMs": 1243650,
          "text": "は!"
        },
        {
          "speechId": 202,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1243650,
          "sourceEndMs": 1243890,
          "text": "?"
        },
        {
          "speechId": 203,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1243890,
          "sourceEndMs": 1244070,
          "text": "は!"
        },
        {
          "speechId": 204,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244070,
          "sourceEndMs": 1244130,
          "text": "?"
        },
        {
          "speechId": 205,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244130,
          "sourceEndMs": 1244171,
          "text": "え!"
        },
        {
          "speechId": 206,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244171,
          "sourceEndMs": 1244191,
          "text": "?"
        },
        {
          "speechId": 207,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244191,
          "sourceEndMs": 1244231,
          "text": "え!"
        },
        {
          "speechId": 208,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244231,
          "sourceEndMs": 1244251,
          "text": "?"
        },
        {
          "speechId": 209,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244251,
          "sourceEndMs": 1244311,
          "text": "え!"
        },
        {
          "speechId": 210,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244311,
          "sourceEndMs": 1244331,
          "text": "?"
        },
        {
          "speechId": 211,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244331,
          "sourceEndMs": 1244371,
          "text": "え!"
        },
        {
          "speechId": 212,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244371,
          "sourceEndMs": 1244391,
          "text": "?"
        },
        {
          "speechId": 213,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244391,
          "sourceEndMs": 1244431,
          "text": "え!"
        },
        {
          "speechId": 214,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244431,
          "sourceEndMs": 1244531,
          "text": "?"
        },
        {
          "speechId": 215,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244531,
          "sourceEndMs": 1244611,
          "text": "え!"
        },
        {
          "speechId": 216,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244611,
          "sourceEndMs": 1244631,
          "text": "?"
        },
        {
          "speechId": 217,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244631,
          "sourceEndMs": 1244671,
          "text": "え!"
        },
        {
          "speechId": 218,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244671,
          "sourceEndMs": 1244691,
          "text": "?"
        },
        {
          "speechId": 219,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244691,
          "sourceEndMs": 1244731,
          "text": "え!"
        },
        {
          "speechId": 220,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244731,
          "sourceEndMs": 1244751,
          "text": "?"
        },
        {
          "speechId": 221,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244751,
          "sourceEndMs": 1246492,
          "text": "え!"
        },
        {
          "speechId": 222,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1246492,
          "sourceEndMs": 1246772,
          "text": "?"
        },
        {
          "speechId": 223,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1246772,
          "sourceEndMs": 1246812,
          "text": "え!"
        },
        {
          "speechId": 224,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1246812,
          "sourceEndMs": 1246872,
          "text": "?"
        },
        {
          "speechId": 225,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1246872,
          "sourceEndMs": 1246972,
          "text": "え!"
        },
        {
          "speechId": 226,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1246972,
          "sourceEndMs": 1246992,
          "text": "?"
        },
        {
          "speechId": 227,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1246992,
          "sourceEndMs": 1247032,
          "text": "え!"
        },
        {
          "speechId": 228,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1247032,
          "sourceEndMs": 1247052,
          "text": "?"
        },
        {
          "speechId": 229,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1247052,
          "sourceEndMs": 1247092,
          "text": "え!"
        },
        {
          "speechId": 230,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1247092,
          "sourceEndMs": 1247192,
          "text": "?"
        },
        {
          "speechId": 231,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1247192,
          "sourceEndMs": 1247232,
          "text": "え!"
        },
        {
          "speechId": 232,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1247232,
          "sourceEndMs": 1247693,
          "text": "?"
        },
        {
          "speechId": 233,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1247693,
          "sourceEndMs": 1247753,
          "text": "え!"
        },
        {
          "speechId": 234,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1247753,
          "sourceEndMs": 1247773,
          "text": "?"
        },
        {
          "speechId": 235,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1247773,
          "sourceEndMs": 1247813,
          "text": "え!"
        },
        {
          "speechId": 236,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1247813,
          "sourceEndMs": 1247833,
          "text": "?"
        },
        {
          "speechId": 237,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1247833,
          "sourceEndMs": 1247873,
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
