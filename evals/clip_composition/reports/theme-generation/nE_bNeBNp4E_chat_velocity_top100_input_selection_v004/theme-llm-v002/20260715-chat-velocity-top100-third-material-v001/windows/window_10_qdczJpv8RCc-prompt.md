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
    "windowId": "window_10_qdczJpv8RCc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "qdczJpv8RCc",
    "sourceStartMs": 1254437,
    "sourceEndMs": 1257939
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
          "speechId": 276,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254437,
          "sourceEndMs": 1254457,
          "text": "?"
        },
        {
          "speechId": 277,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254457,
          "sourceEndMs": 1254617,
          "text": "え!"
        },
        {
          "speechId": 278,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254617,
          "sourceEndMs": 1254677,
          "text": "?"
        },
        {
          "speechId": 279,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254677,
          "sourceEndMs": 1254797,
          "text": "え!"
        },
        {
          "speechId": 280,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254797,
          "sourceEndMs": 1254817,
          "text": "?"
        },
        {
          "speechId": 281,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254817,
          "sourceEndMs": 1254857,
          "text": "え!"
        },
        {
          "speechId": 282,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254857,
          "sourceEndMs": 1254897,
          "text": "?"
        },
        {
          "speechId": 283,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254897,
          "sourceEndMs": 1255037,
          "text": "え!"
        },
        {
          "speechId": 284,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1255037,
          "sourceEndMs": 1255057,
          "text": "?"
        },
        {
          "speechId": 285,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1255057,
          "sourceEndMs": 1255117,
          "text": "え!"
        },
        {
          "speechId": 286,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1255117,
          "sourceEndMs": 1255197,
          "text": "?"
        },
        {
          "speechId": 287,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1255197,
          "sourceEndMs": 1255337,
          "text": "え!"
        },
        {
          "speechId": 288,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1255337,
          "sourceEndMs": 1255437,
          "text": "?"
        },
        {
          "speechId": 289,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1255437,
          "sourceEndMs": 1255577,
          "text": "え!"
        },
        {
          "speechId": 290,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1255577,
          "sourceEndMs": 1255657,
          "text": "?"
        },
        {
          "speechId": 291,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1255657,
          "sourceEndMs": 1255777,
          "text": "え!"
        },
        {
          "speechId": 292,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1255777,
          "sourceEndMs": 1255858,
          "text": "?"
        },
        {
          "speechId": 293,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1255858,
          "sourceEndMs": 1255978,
          "text": "え!"
        },
        {
          "speechId": 294,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1255978,
          "sourceEndMs": 1256058,
          "text": "?"
        },
        {
          "speechId": 295,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1256058,
          "sourceEndMs": 1256158,
          "text": "え!"
        },
        {
          "speechId": 296,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1256158,
          "sourceEndMs": 1256178,
          "text": "?"
        },
        {
          "speechId": 297,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1256178,
          "sourceEndMs": 1256338,
          "text": "え!"
        },
        {
          "speechId": 298,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1256338,
          "sourceEndMs": 1256358,
          "text": "?"
        },
        {
          "speechId": 299,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1256358,
          "sourceEndMs": 1256398,
          "text": "え!"
        },
        {
          "speechId": 300,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1256398,
          "sourceEndMs": 1256478,
          "text": "?"
        },
        {
          "speechId": 301,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1256478,
          "sourceEndMs": 1256598,
          "text": "え!"
        },
        {
          "speechId": 302,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1256598,
          "sourceEndMs": 1256618,
          "text": "?"
        },
        {
          "speechId": 303,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1256618,
          "sourceEndMs": 1256918,
          "text": "え!"
        },
        {
          "speechId": 304,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1256918,
          "sourceEndMs": 1256938,
          "text": "?"
        },
        {
          "speechId": 305,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1256938,
          "sourceEndMs": 1256978,
          "text": "え!"
        },
        {
          "speechId": 306,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1256978,
          "sourceEndMs": 1257058,
          "text": "?"
        },
        {
          "speechId": 307,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1257058,
          "sourceEndMs": 1257218,
          "text": "え!"
        },
        {
          "speechId": 308,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1257218,
          "sourceEndMs": 1257238,
          "text": "?"
        },
        {
          "speechId": 309,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1257238,
          "sourceEndMs": 1257418,
          "text": "え!"
        },
        {
          "speechId": 310,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1257418,
          "sourceEndMs": 1257438,
          "text": "?"
        },
        {
          "speechId": 311,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1257438,
          "sourceEndMs": 1257879,
          "text": "え!"
        },
        {
          "speechId": 312,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1257879,
          "sourceEndMs": 1257899,
          "text": "?"
        },
        {
          "speechId": 313,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1257899,
          "sourceEndMs": 1257939,
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
