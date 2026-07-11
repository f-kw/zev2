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
    "windowId": "window_59_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 9932704,
    "sourceEndMs": 10086129
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
      "promptSegmentCount": 26,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 1492,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9932704,
          "sourceEndMs": 9936626,
          "text": "なんかね、なんか誘われるのかなって感じだね誘え?"
        },
        {
          "speechId": 1493,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9936626,
          "sourceEndMs": 9950556,
          "text": "あちら側にやめていや、もはやもうあちら側なのかもしれない怖い怖い怖いここ何も入ってないじゃん何入れにしようかなこれ何入れにしたいの?"
        },
        {
          "speechId": 1494,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9950556,
          "sourceEndMs": 9958502,
          "text": "なんだろうマジで分からん何入れたらいいんだろう船長迷ってます"
        },
        {
          "speechId": 1495,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9960098,
          "sourceEndMs": 9966181,
          "text": "ここね何入れたらいいと思う?"
        },
        {
          "speechId": 1496,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9966181,
          "sourceEndMs": 9967061,
          "text": "どこ?"
        },
        {
          "speechId": 1497,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9967061,
          "sourceEndMs": 9968122,
          "text": "この真ん中真ん中?"
        },
        {
          "speechId": 1498,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9968122,
          "sourceEndMs": 9973724,
          "text": "でも上がベトベトでしょ?"
        },
        {
          "speechId": 1499,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9973724,
          "sourceEndMs": 9980728,
          "text": "一番下が一番下なんか統一感なくてもやるなご飯入れちゃう?"
        },
        {
          "speechId": 1500,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9980728,
          "sourceEndMs": 9988912,
          "text": "いっそのことここにご飯を一番上にしたい気持ちもあるけどなでも真ん中で一貫何も入ってないしな"
        },
        {
          "speechId": 1501,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9990194,
          "sourceEndMs": 9993135,
          "text": "あ、じゃあ移動しちゃおうもうこんだけならさっさとできる?"
        },
        {
          "speechId": 1502,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9993135,
          "sourceEndMs": 10013422,
          "text": "できるできるじゃあ上に入れちゃうよOK結構入れちゃうよいいよじゃがいも今焼いてるあ、焼いてないわ焼いてよし、もうちょっと釣ろうかやべ、水飲まなきゃ仮面仮面つついてみていい?"
        },
        {
          "speechId": 1503,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10013422,
          "sourceEndMs": 10016603,
          "text": "ちょっといいよいいよ気になる?"
        },
        {
          "speechId": 1504,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10016603,
          "sourceEndMs": 10019724,
          "text": "仮面どうなるのか"
        },
        {
          "speechId": 1505,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10020094,
          "sourceEndMs": 10020314,
          "text": "どうだったっけ?"
        },
        {
          "speechId": 1506,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10020314,
          "sourceEndMs": 10050000,
          "text": "やばい、待って海のヌシが来てる、やばいおらよーOKあ、ここ綺麗ナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナ"
        },
        {
          "speechId": 1507,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10050034,
          "sourceEndMs": 10054676,
          "text": "いいね食べ物入れハマグリって食べ物判定か?"
        },
        {
          "speechId": 1508,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10054676,
          "sourceEndMs": 10055376,
          "text": "何判定?"
        },
        {
          "speechId": 1509,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10055376,
          "sourceEndMs": 10064040,
          "text": "ハマグリって何なんだろうねいやでも美味しいよなハマグリってせいちゃんハマグリ食べたことない?"
        },
        {
          "speechId": 1510,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10064040,
          "sourceEndMs": 10078886,
          "text": "ないかもしんないもしかしたらハマグリホタテじゃないのアサリとかシジミなのかなそんなわけではないなにどういうこと?"
        },
        {
          "speechId": 1511,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10078886,
          "sourceEndMs": 10079446,
          "text": "全然わかんない"
        },
        {
          "speechId": 1512,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10080546,
          "sourceEndMs": 10082947,
          "text": "ハマグリの種類よ、ハマグリの種類種類?"
        },
        {
          "speechId": 1513,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10082947,
          "sourceEndMs": 10083748,
          "text": "貝じゃないの?"
        },
        {
          "speechId": 1514,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10083748,
          "sourceEndMs": 10083968,
          "text": "え?"
        },
        {
          "speechId": 1515,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10083968,
          "sourceEndMs": 10084168,
          "text": "え?"
        },
        {
          "speechId": 1516,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10084168,
          "sourceEndMs": 10086029,
          "text": "え?"
        },
        {
          "speechId": 1517,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10086029,
          "sourceEndMs": 10086129,
          "text": "え?"
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
