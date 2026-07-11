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
    "windowId": "window_47_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 7673981,
    "sourceEndMs": 7769844
  },
  "sources": [
    {
      "sourceVideoId": "YE-faluP7zY",
      "sourceUrl": "https://www.youtube.com/watch?v=YE-faluP7zY",
      "sourceTitle": "【Raft】ころね、キミさえいればこの海の果てまでだって──【ホロライブ/宝鐘マリン】",
      "transcriptKind": "local_stt",
      "language": "ja-JP",
      "durationSec": 11824.121,
      "rawSegmentCount": 53180,
      "promptSegmentCount": 32,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 1191,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7673981,
          "sourceEndMs": 7674121,
          "text": "よし!"
        },
        {
          "speechId": 1192,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7674121,
          "sourceEndMs": 7674301,
          "text": "よし!"
        },
        {
          "speechId": 1193,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7674301,
          "sourceEndMs": 7674361,
          "text": "よし!"
        },
        {
          "speechId": 1194,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7674361,
          "sourceEndMs": 7674421,
          "text": "よし!"
        },
        {
          "speechId": 1195,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7674421,
          "sourceEndMs": 7676382,
          "text": "よし!"
        },
        {
          "speechId": 1196,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7676382,
          "sourceEndMs": 7676462,
          "text": "よし!"
        },
        {
          "speechId": 1197,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7676462,
          "sourceEndMs": 7676662,
          "text": "よし!"
        },
        {
          "speechId": 1198,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7676662,
          "sourceEndMs": 7676742,
          "text": "よし!"
        },
        {
          "speechId": 1199,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7676742,
          "sourceEndMs": 7676802,
          "text": "よし!"
        },
        {
          "speechId": 1200,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7676802,
          "sourceEndMs": 7676862,
          "text": "よし!"
        },
        {
          "speechId": 1201,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7676862,
          "sourceEndMs": 7677082,
          "text": "よし!"
        },
        {
          "speechId": 1202,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7677082,
          "sourceEndMs": 7677543,
          "text": "よし!"
        },
        {
          "speechId": 1203,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7677543,
          "sourceEndMs": 7678743,
          "text": "よし!"
        },
        {
          "speechId": 1204,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7678743,
          "sourceEndMs": 7679003,
          "text": "よし!"
        },
        {
          "speechId": 1205,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7679003,
          "sourceEndMs": 7679063,
          "text": "よし!"
        },
        {
          "speechId": 1206,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7679063,
          "sourceEndMs": 7679124,
          "text": "よし!"
        },
        {
          "speechId": 1207,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7679124,
          "sourceEndMs": 7679184,
          "text": "よし!"
        },
        {
          "speechId": 1208,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7679184,
          "sourceEndMs": 7679264,
          "text": "よし!"
        },
        {
          "speechId": 1209,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7679264,
          "sourceEndMs": 7679324,
          "text": "よし!"
        },
        {
          "speechId": 1210,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7679324,
          "sourceEndMs": 7679524,
          "text": "よし!"
        },
        {
          "speechId": 1211,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7679524,
          "sourceEndMs": 7679704,
          "text": "よし!"
        },
        {
          "speechId": 1212,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7679704,
          "sourceEndMs": 7679804,
          "text": "よし!"
        },
        {
          "speechId": 1213,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7679804,
          "sourceEndMs": 7679964,
          "text": "よし!"
        },
        {
          "speechId": 1214,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7679964,
          "sourceEndMs": 7680000,
          "text": "よし"
        },
        {
          "speechId": 1215,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7681101,
          "sourceEndMs": 7686024,
          "text": "いいよ下は探索しないけど大丈夫?"
        },
        {
          "speechId": 1216,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7686024,
          "sourceEndMs": 7687365,
          "text": "一旦いいんじゃない?"
        },
        {
          "speechId": 1217,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7687365,
          "sourceEndMs": 7696430,
          "text": "一旦了解とりあえずねなんでこっち見てくんの?"
        },
        {
          "speechId": 1218,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7696430,
          "sourceEndMs": 7700873,
          "text": "なんか別に見ただけじゃんそんな見られたら何?"
        },
        {
          "speechId": 1219,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7700873,
          "sourceEndMs": 7708118,
          "text": "ってなるじゃんごめんね生の肉焼いてますストレージねこうして"
        },
        {
          "speechId": 1220,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7709515,
          "sourceEndMs": 7709983,
          "text": "ろっこつ"
        },
        {
          "speechId": 1221,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7710506,
          "sourceEndMs": 7739692,
          "text": "作って6個あれば大体まかないそうだよねあとはもう細かいストレージでそうね小さい人たちにここに2つ付けたりとかっていうのも可能なんだろうかちょっとやってみるかここの種系もしまうところそうね、種なぶどうのベトベトを入れてここが鉱石か"
        },
        {
          "speechId": 1222,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7740970,
          "sourceEndMs": 7769844,
          "text": "犬獅子の頭入ってるよねごめんごめんごめんごめんごめんなさい回収しに行きます装備入れる棚とかもあったら便利だよね確かに言われてみると言われてねーけどさ言われてみると確かにそうなに笑ってんの面白いなと思ってごめんねスクラップスクラップないかな"
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
