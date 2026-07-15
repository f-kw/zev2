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
    "windowId": "window_04_qdczJpv8RCc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "qdczJpv8RCc",
    "sourceStartMs": 782954,
    "sourceEndMs": 869520
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
      "promptSegmentCount": 34,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 72,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 782954,
          "sourceEndMs": 809800,
          "text": "言っとくけどねマリンの手札めっつよだけど大丈夫そう全員倒すよこれでまぁ一旦これでいいかどうやって出すんだっけこうだあの口ごちゃにしない方がいいよこれガチですごいよマリンの手札なんだよ"
        },
        {
          "speechId": 73,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 810126,
          "sourceEndMs": 810666,
          "text": "何喋ったよ!"
        },
        {
          "speechId": 74,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 810666,
          "sourceEndMs": 811026,
          "text": "おい!"
        },
        {
          "speechId": 75,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 811026,
          "sourceEndMs": 815709,
          "text": "口を開くんじゃないよ!"
        },
        {
          "speechId": 76,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 815709,
          "sourceEndMs": 816969,
          "text": "何だよ!"
        },
        {
          "speechId": 77,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 816969,
          "sourceEndMs": 817369,
          "text": "何だよ!"
        },
        {
          "speechId": 78,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 817369,
          "sourceEndMs": 817770,
          "text": "何だよ!"
        },
        {
          "speechId": 79,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 817770,
          "sourceEndMs": 818670,
          "text": "調香すんな!"
        },
        {
          "speechId": 80,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 818670,
          "sourceEndMs": 821571,
          "text": "悩むことなんてないだろ!"
        },
        {
          "speechId": 81,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 821571,
          "sourceEndMs": 821731,
          "text": "何?"
        },
        {
          "speechId": 82,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 821731,
          "sourceEndMs": 822352,
          "text": "3枚出した?"
        },
        {
          "speechId": 83,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 822352,
          "sourceEndMs": 822772,
          "text": "え?"
        },
        {
          "speechId": 84,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 822772,
          "sourceEndMs": 823752,
          "text": "3…え?"
        },
        {
          "speechId": 85,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 823752,
          "sourceEndMs": 827854,
          "text": "3枚出した?"
        },
        {
          "speechId": 86,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 827854,
          "sourceEndMs": 829135,
          "text": "何3枚出すって?"
        },
        {
          "speechId": 87,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 829135,
          "sourceEndMs": 831276,
          "text": "何それ?"
        },
        {
          "speechId": 88,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 831276,
          "sourceEndMs": 836738,
          "text": "何あいつ向こう向いてんの?"
        },
        {
          "speechId": 89,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 836738,
          "sourceEndMs": 837819,
          "text": "3枚出すことがあんの?"
        },
        {
          "speechId": 90,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 837819,
          "sourceEndMs": 838119,
          "text": "は?"
        },
        {
          "speechId": 91,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 838119,
          "sourceEndMs": 839520,
          "text": "複数枚出せる?"
        },
        {
          "speechId": 92,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 839520,
          "sourceEndMs": 839920,
          "text": "は?"
        },
        {
          "speechId": 93,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 842026,
          "sourceEndMs": 848840,
          "text": "じゃあさ、例えば待って、例えば、例えばだよこれをさあっ、間違えた!"
        },
        {
          "speechId": 94,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 848840,
          "sourceEndMs": 853790,
          "text": "もぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉ"
        },
        {
          "speechId": 95,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 855986,
          "sourceEndMs": 860030,
          "text": "もう…複数枚出せる?"
        },
        {
          "speechId": 96,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 860030,
          "sourceEndMs": 860531,
          "text": "は?"
        },
        {
          "speechId": 97,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 860531,
          "sourceEndMs": 861932,
          "text": "待って!"
        },
        {
          "speechId": 98,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 861932,
          "sourceEndMs": 862152,
          "text": "え?"
        },
        {
          "speechId": 99,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 862152,
          "sourceEndMs": 862993,
          "text": "で、絶対?"
        },
        {
          "speechId": 100,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 862993,
          "sourceEndMs": 865596,
          "text": "だ、だったらさ、え?"
        },
        {
          "speechId": 101,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 865596,
          "sourceEndMs": 865996,
          "text": "嘘だよ!"
        },
        {
          "speechId": 102,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 865996,
          "sourceEndMs": 867578,
          "text": "だ、だって、そういうことだよね?"
        },
        {
          "speechId": 103,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 867578,
          "sourceEndMs": 868899,
          "text": "つまりさ、だって、え?"
        },
        {
          "speechId": 104,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 868899,
          "sourceEndMs": 869119,
          "text": "あれ?"
        },
        {
          "speechId": 105,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 869119,
          "sourceEndMs": 869520,
          "text": "あれ?"
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
