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
    "windowId": "window_56_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 9393585,
    "sourceEndMs": 9574159
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
      "promptSegmentCount": 29,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 1415,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9393585,
          "sourceEndMs": 9395687,
          "text": "置けない?"
        },
        {
          "speechId": 1416,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9395687,
          "sourceEndMs": 9397748,
          "text": "なんでじゃろか?"
        },
        {
          "speechId": 1417,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9397748,
          "sourceEndMs": 9400591,
          "text": "ちっちゃいのかな?"
        },
        {
          "speechId": 1418,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9400591,
          "sourceEndMs": 9418786,
          "text": "まあいいやちょっとそれは一旦置いといておうえーっとほねこれとこれを片付けろか先こうやってやりたいことがさ2点3点と変わっていってしまうからちゃんとね一つずつ着実に"
        },
        {
          "speechId": 1419,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9419355,
          "sourceEndMs": 9419821,
          "text": "片付けていく"
        },
        {
          "speechId": 1420,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9421622,
          "sourceEndMs": 9423243,
          "text": "とりあえず食材集めながら材料も拾うね?"
        },
        {
          "speechId": 1421,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9423243,
          "sourceEndMs": 9423583,
          "text": "オッケー?"
        },
        {
          "speechId": 1422,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9423583,
          "sourceEndMs": 9423824,
          "text": "オッケー?"
        },
        {
          "speechId": 1423,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9423824,
          "sourceEndMs": 9424504,
          "text": "ナイス?"
        },
        {
          "speechId": 1424,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9424504,
          "sourceEndMs": 9437694,
          "text": "えーこういったりして…オッケー?"
        },
        {
          "speechId": 1425,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9437694,
          "sourceEndMs": 9447221,
          "text": "んーバランス見てもう一個置きたいなこれ…あこれから生カチオばっかりなら生カチオって何やねん?"
        },
        {
          "speechId": 1426,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9447221,
          "sourceEndMs": 9449122,
          "text": "生のカチオか…なんか当たり前の…当たり前ことを言っているような…"
        },
        {
          "speechId": 1427,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9451814,
          "sourceEndMs": 9479504,
          "text": "まあ、できたらばなんとなく完成させたいよね、この辺はねそうな、そうなでもなんか収納大きすぎてさお片付け上手みたいになってきちゃった倉庫みたいになってるなそうなのよ"
        },
        {
          "speechId": 1428,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9480646,
          "sourceEndMs": 9509704,
          "text": "片付け長寿ここ落ちるからうざいから床付ける床増やすわ広げたいな木材いっぱい集めるわボトボト落下して気分悪いから広げますとそうなナイスありがとうございます"
        },
        {
          "speechId": 1429,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9511343,
          "sourceEndMs": 9517106,
          "text": "この広さあれば…あ、そうだ!"
        },
        {
          "speechId": 1430,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9517106,
          "sourceEndMs": 9518907,
          "text": "ここに絨毯をさ階段登るところに…大丈夫?"
        },
        {
          "speechId": 1431,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9518907,
          "sourceEndMs": 9528293,
          "text": "サメかと思ったらイルカかと思ってイルカかと思ったらサメだったわ危なしーいや、こっちかな?"
        },
        {
          "speechId": 1432,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9528293,
          "sourceEndMs": 9528413,
          "text": "こっちかな?"
        },
        {
          "speechId": 1433,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9528413,
          "sourceEndMs": 9528953,
          "text": "ナイスショー!"
        },
        {
          "speechId": 1434,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9528953,
          "sourceEndMs": 9532315,
          "text": "お!"
        },
        {
          "speechId": 1435,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9532315,
          "sourceEndMs": 9536037,
          "text": "こんなとこに置かないか?"
        },
        {
          "speechId": 1436,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9536037,
          "sourceEndMs": 9536418,
          "text": "おらよー"
        },
        {
          "speechId": 1437,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9544166,
          "sourceEndMs": 9549190,
          "text": "あ、ねえ、こうねえはい!"
        },
        {
          "speechId": 1438,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9549190,
          "sourceEndMs": 9553113,
          "text": "ねえ、上がって、ここにはいなんか思うことない?"
        },
        {
          "speechId": 1439,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9553113,
          "sourceEndMs": 9555055,
          "text": "思うこと?"
        },
        {
          "speechId": 1440,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9555055,
          "sourceEndMs": 9563321,
          "text": "このエリアに関して思うこと?"
        },
        {
          "speechId": 1441,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9563321,
          "sourceEndMs": 9563482,
          "text": "そう"
        },
        {
          "speechId": 1442,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9571678,
          "sourceEndMs": 9572999,
          "text": "じゅうたん!"
        },
        {
          "speechId": 1443,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9572999,
          "sourceEndMs": 9574159,
          "text": "じゅうたんを置いてみたんだけど!"
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
