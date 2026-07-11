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
    "windowId": "window_36_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 6048569,
    "sourceEndMs": 6268278
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
      "promptSegmentCount": 23,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 896,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6048569,
          "sourceEndMs": 6057513,
          "text": "もうさ他にでもさーみんながさサメの頭でなっちゃうかなと思ってキミたち?"
        },
        {
          "speechId": 897,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6057513,
          "sourceEndMs": 6058574,
          "text": "キミたち?"
        },
        {
          "speechId": 898,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6058574,
          "sourceEndMs": 6059134,
          "text": "これいる?"
        },
        {
          "speechId": 899,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6066640,
          "sourceEndMs": 6071644,
          "text": "コメントしてよ!"
        },
        {
          "speechId": 900,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6071644,
          "sourceEndMs": 6079390,
          "text": "ラグを読んで早めにコメントするのが宝鐘海賊団の鉄則でしょ?"
        },
        {
          "speechId": 901,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6079390,
          "sourceEndMs": 6081392,
          "text": "壁に飾れるって!"
        },
        {
          "speechId": 902,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6081392,
          "sourceEndMs": 6082753,
          "text": "壁に飾れるんだよ!"
        },
        {
          "speechId": 903,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6082753,
          "sourceEndMs": 6086977,
          "text": "飾る飾るそしたらよ!"
        },
        {
          "speechId": 904,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6086977,
          "sourceEndMs": 6087837,
          "text": "壁に飾れるの?"
        },
        {
          "speechId": 905,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6090682,
          "sourceEndMs": 6119386,
          "text": "壁がついたらば飾るかそうねあいつバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバ"
        },
        {
          "speechId": 906,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6123928,
          "sourceEndMs": 6140738,
          "text": "なんだ、まず焼けるの遅いなよしえっと、で何をしてたんだっけあ、そうだ、まずすり減った床を増やそう板12枚入れたナイスーナイスーからの?"
        },
        {
          "speechId": 907,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6140738,
          "sourceEndMs": 6141359,
          "text": "からの?"
        },
        {
          "speechId": 908,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6141359,
          "sourceEndMs": 6149984,
          "text": "あ、流れてきてますねーいいねーおっけおっけいい感じよパッケージ拾ってたあ、いいねー"
        },
        {
          "speechId": 909,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6150150,
          "sourceEndMs": 6152731,
          "text": "開けちゃお中は何かな?"
        },
        {
          "speechId": 910,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6152731,
          "sourceEndMs": 6179484,
          "text": "パカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパ"
        },
        {
          "speechId": 911,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6180274,
          "sourceEndMs": 6203868,
          "text": "で、えーと、んーとじゃあここにヤシの木の大物、大規格の作物を何個、3個くらいあってもいいと思う人はーいカイコーネさんとはい、一味の皆さんはどう思われますか?"
        },
        {
          "speechId": 912,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6203868,
          "sourceEndMs": 6204789,
          "text": "君たちー?"
        },
        {
          "speechId": 913,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6204789,
          "sourceEndMs": 6205149,
          "text": "君たちー?"
        },
        {
          "speechId": 914,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6205149,
          "sourceEndMs": 6209932,
          "text": "はーい、だってあ、じゃあ3つくらい作り"
        },
        {
          "speechId": 915,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6210474,
          "sourceEndMs": 6213315,
          "text": "君たち意見を採用して差し上げましょう"
        },
        {
          "speechId": 916,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6241023,
          "sourceEndMs": 6249827,
          "text": "取ると言ってもありけりよ6個も使うのか釘ちょっと重てえな6個か釘?"
        },
        {
          "speechId": 917,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6249827,
          "sourceEndMs": 6252549,
          "text": "釘いっぱいなかったっけ?"
        },
        {
          "speechId": 918,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6252549,
          "sourceEndMs": 6268278,
          "text": "そっかここに待って釘いっぱいあるわ思い返してみると釘いっぱいあるどうしたどうしたハマったハマったごめんなさいハマってました今感じてた今ハマり散らかしてあついたねこれアンカーいらなくないこれほんと?"
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
