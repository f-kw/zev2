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
    "windowId": "window_05_qdczJpv8RCc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "qdczJpv8RCc",
    "sourceStartMs": 869520,
    "sourceEndMs": 963175
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
      "promptSegmentCount": 35,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 106,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 869520,
          "sourceEndMs": 869640,
          "text": "あれ?"
        },
        {
          "speechId": 107,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 869640,
          "sourceEndMs": 869900,
          "text": "あれ?"
        },
        {
          "speechId": 108,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 870646,
          "sourceEndMs": 872207,
          "text": "なぜ?"
        },
        {
          "speechId": 109,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 872207,
          "sourceEndMs": 872847,
          "text": "なぜ?"
        },
        {
          "speechId": 110,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 872847,
          "sourceEndMs": 873007,
          "text": "なぜ?"
        },
        {
          "speechId": 111,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 873007,
          "sourceEndMs": 873227,
          "text": "なぜ?"
        },
        {
          "speechId": 112,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 873227,
          "sourceEndMs": 873888,
          "text": "なぜ?"
        },
        {
          "speechId": 113,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 873888,
          "sourceEndMs": 874608,
          "text": "なぜ?"
        },
        {
          "speechId": 114,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 874608,
          "sourceEndMs": 874908,
          "text": "なぜ?"
        },
        {
          "speechId": 115,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 874908,
          "sourceEndMs": 875168,
          "text": "なぜ?"
        },
        {
          "speechId": 116,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 875168,
          "sourceEndMs": 875268,
          "text": "なぜ?"
        },
        {
          "speechId": 117,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 875268,
          "sourceEndMs": 875608,
          "text": "なぜ?"
        },
        {
          "speechId": 118,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 875608,
          "sourceEndMs": 876069,
          "text": "なぜ?"
        },
        {
          "speechId": 119,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 876069,
          "sourceEndMs": 876389,
          "text": "なぜ?"
        },
        {
          "speechId": 120,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 876389,
          "sourceEndMs": 876789,
          "text": "なぜ?"
        },
        {
          "speechId": 121,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 876789,
          "sourceEndMs": 877069,
          "text": "なぜ?"
        },
        {
          "speechId": 122,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 877069,
          "sourceEndMs": 877849,
          "text": "なぜ?"
        },
        {
          "speechId": 123,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 877849,
          "sourceEndMs": 878230,
          "text": "なぜ?"
        },
        {
          "speechId": 124,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 878230,
          "sourceEndMs": 878370,
          "text": "なぜ?"
        },
        {
          "speechId": 125,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 878370,
          "sourceEndMs": 878570,
          "text": "なぜ?"
        },
        {
          "speechId": 126,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 878570,
          "sourceEndMs": 878750,
          "text": "なぜ?"
        },
        {
          "speechId": 127,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 878750,
          "sourceEndMs": 878910,
          "text": "なぜ?"
        },
        {
          "speechId": 128,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 878910,
          "sourceEndMs": 880211,
          "text": "なぜ?"
        },
        {
          "speechId": 129,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 880211,
          "sourceEndMs": 880331,
          "text": "なぜ?"
        },
        {
          "speechId": 130,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 901643,
          "sourceEndMs": 928566,
          "text": "マリンも3枚出したいでもこれで3枚出したらさすがに普通に3枚出したと分かつた待って分かつてない分かつてないあ出しちゃったまあまあまあいいやまあいいやまあいったんいいやいったんいいか"
        },
        {
          "speechId": 131,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 933106,
          "sourceEndMs": 934006,
          "text": "なに?"
        },
        {
          "speechId": 132,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 934006,
          "sourceEndMs": 934666,
          "text": "嘘?"
        },
        {
          "speechId": 133,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 934666,
          "sourceEndMs": 935027,
          "text": "嘘ついてる?"
        },
        {
          "speechId": 134,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 935027,
          "sourceEndMs": 935327,
          "text": "これ?"
        },
        {
          "speechId": 135,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 935327,
          "sourceEndMs": 940248,
          "text": "あ、こ、あ、なになに争ってる?"
        },
        {
          "speechId": 136,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 940248,
          "sourceEndMs": 941168,
          "text": "こいつ!"
        },
        {
          "speechId": 137,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 941168,
          "sourceEndMs": 945170,
          "text": "こいつめっちゃ嘘つき!"
        },
        {
          "speechId": 138,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 945170,
          "sourceEndMs": 950431,
          "text": "こいつ、DLTさんのお前が一番おーほほ!"
        },
        {
          "speechId": 139,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 950431,
          "sourceEndMs": 959294,
          "text": "よくやったえ、一騎打ちじゃん!"
        },
        {
          "speechId": 140,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 960054,
          "sourceEndMs": 963175,
          "text": "君とマリンの?"
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
