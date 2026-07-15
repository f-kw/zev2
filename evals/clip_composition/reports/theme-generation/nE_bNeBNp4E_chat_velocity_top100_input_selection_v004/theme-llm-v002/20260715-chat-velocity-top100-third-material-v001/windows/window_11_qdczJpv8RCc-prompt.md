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
    "windowId": "window_11_qdczJpv8RCc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "qdczJpv8RCc",
    "sourceStartMs": 1257939,
    "sourceEndMs": 1259540
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
          "speechId": 314,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1257939,
          "sourceEndMs": 1257959,
          "text": "?"
        },
        {
          "speechId": 315,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1257959,
          "sourceEndMs": 1258059,
          "text": "え!"
        },
        {
          "speechId": 316,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258059,
          "sourceEndMs": 1258079,
          "text": "?"
        },
        {
          "speechId": 317,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258079,
          "sourceEndMs": 1258119,
          "text": "え!"
        },
        {
          "speechId": 318,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258119,
          "sourceEndMs": 1258139,
          "text": "?"
        },
        {
          "speechId": 319,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258139,
          "sourceEndMs": 1258219,
          "text": "え!"
        },
        {
          "speechId": 320,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258219,
          "sourceEndMs": 1258239,
          "text": "?"
        },
        {
          "speechId": 321,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258239,
          "sourceEndMs": 1258339,
          "text": "え!"
        },
        {
          "speechId": 322,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258339,
          "sourceEndMs": 1258359,
          "text": "?"
        },
        {
          "speechId": 323,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258359,
          "sourceEndMs": 1258399,
          "text": "え!"
        },
        {
          "speechId": 324,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258399,
          "sourceEndMs": 1258459,
          "text": "?"
        },
        {
          "speechId": 325,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258459,
          "sourceEndMs": 1258499,
          "text": "え!"
        },
        {
          "speechId": 326,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258499,
          "sourceEndMs": 1258519,
          "text": "?"
        },
        {
          "speechId": 327,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258519,
          "sourceEndMs": 1258579,
          "text": "え!"
        },
        {
          "speechId": 328,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258579,
          "sourceEndMs": 1258599,
          "text": "?"
        },
        {
          "speechId": 329,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258599,
          "sourceEndMs": 1258639,
          "text": "え!"
        },
        {
          "speechId": 330,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258639,
          "sourceEndMs": 1258659,
          "text": "?"
        },
        {
          "speechId": 331,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258659,
          "sourceEndMs": 1258699,
          "text": "え!"
        },
        {
          "speechId": 332,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258699,
          "sourceEndMs": 1258739,
          "text": "?"
        },
        {
          "speechId": 333,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258739,
          "sourceEndMs": 1258799,
          "text": "え!"
        },
        {
          "speechId": 334,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258799,
          "sourceEndMs": 1258859,
          "text": "?"
        },
        {
          "speechId": 335,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258859,
          "sourceEndMs": 1258939,
          "text": "え!"
        },
        {
          "speechId": 336,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258939,
          "sourceEndMs": 1258959,
          "text": "?"
        },
        {
          "speechId": 337,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258959,
          "sourceEndMs": 1258999,
          "text": "え!"
        },
        {
          "speechId": 338,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258999,
          "sourceEndMs": 1259019,
          "text": "?"
        },
        {
          "speechId": 339,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259019,
          "sourceEndMs": 1259059,
          "text": "え!"
        },
        {
          "speechId": 340,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259059,
          "sourceEndMs": 1259079,
          "text": "?"
        },
        {
          "speechId": 341,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259079,
          "sourceEndMs": 1259119,
          "text": "え!"
        },
        {
          "speechId": 342,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259119,
          "sourceEndMs": 1259139,
          "text": "?"
        },
        {
          "speechId": 343,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259139,
          "sourceEndMs": 1259180,
          "text": "え!"
        },
        {
          "speechId": 344,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259180,
          "sourceEndMs": 1259200,
          "text": "?"
        },
        {
          "speechId": 345,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259200,
          "sourceEndMs": 1259320,
          "text": "え!"
        },
        {
          "speechId": 346,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259320,
          "sourceEndMs": 1259340,
          "text": "?"
        },
        {
          "speechId": 347,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259340,
          "sourceEndMs": 1259380,
          "text": "え!"
        },
        {
          "speechId": 348,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259380,
          "sourceEndMs": 1259400,
          "text": "?"
        },
        {
          "speechId": 349,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259400,
          "sourceEndMs": 1259460,
          "text": "え!"
        },
        {
          "speechId": 350,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259460,
          "sourceEndMs": 1259500,
          "text": "?"
        },
        {
          "speechId": 351,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259500,
          "sourceEndMs": 1259540,
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
