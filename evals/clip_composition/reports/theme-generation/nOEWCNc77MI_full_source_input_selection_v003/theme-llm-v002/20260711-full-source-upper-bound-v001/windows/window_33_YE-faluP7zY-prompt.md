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
    "windowId": "window_33_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 5501533,
    "sourceEndMs": 5686333
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
      "promptSegmentCount": 27,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 818,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5501533,
          "sourceEndMs": 5514140,
          "text": "サメサメねジャンプで木なくなった木なくなった木なくなった待ってよ何枚持ってると思う?"
        },
        {
          "speechId": 819,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5514140,
          "sourceEndMs": 5519964,
          "text": "ちょっと待って期待を込めて50枚マジで言ってる?"
        },
        {
          "speechId": 820,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5520750,
          "sourceEndMs": 5522671,
          "text": "50枚ある?"
        },
        {
          "speechId": 821,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5522671,
          "sourceEndMs": 5523691,
          "text": "6枚6枚?"
        },
        {
          "speechId": 822,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5523691,
          "sourceEndMs": 5529994,
          "text": "まあまあまあまあでも待ってここになかった?"
        },
        {
          "speechId": 823,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5529994,
          "sourceEndMs": 5530275,
          "text": "どこ?"
        },
        {
          "speechId": 824,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5530275,
          "sourceEndMs": 5537818,
          "text": "ここなかったなかったかもうないよごめんね本当にまたコツコツ今から集めるから進んでなくない?"
        },
        {
          "speechId": 825,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5537818,
          "sourceEndMs": 5546502,
          "text": "待ってやばいきっと大区画の作物になっちゃって進んでないのであれ?"
        },
        {
          "speechId": 826,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5546502,
          "sourceEndMs": 5549244,
          "text": "ん?"
        },
        {
          "speechId": 827,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5549244,
          "sourceEndMs": 5549924,
          "text": "船がね進んでない"
        },
        {
          "speechId": 828,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5552102,
          "sourceEndMs": 5578382,
          "text": "あれかな、ちょっと一回砲つけてさそうね、砲つけないとね、これねOK、つけるわよーほーよーほーだわ、これさーけばーあれ、砲どこやったっけ、船長あ、持ってたわ、手に待って、ここにこれパドルがあるから必要なのほらほら、行く行くほらほら、見ていや、砲立てたほうが早いからほら見てよ、移動してない?"
        },
        {
          "speechId": 829,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5578382,
          "sourceEndMs": 5578702,
          "text": "してる"
        },
        {
          "speechId": 830,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5581366,
          "sourceEndMs": 5584688,
          "text": "捨てるけど、頬を立てたほうがほら!"
        },
        {
          "speechId": 831,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5584688,
          "sourceEndMs": 5586909,
          "text": "ほらほらほらほら!"
        },
        {
          "speechId": 832,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5586909,
          "sourceEndMs": 5591793,
          "text": "そんな、そんなちまちまやってさぁひどしてるよ!"
        },
        {
          "speechId": 833,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5591793,
          "sourceEndMs": 5593073,
          "text": "まどろっこしいんだよ!"
        },
        {
          "speechId": 834,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5593073,
          "sourceEndMs": 5605881,
          "text": "なんでなんちゅうこと今、頬開いてやったからよ感謝しろよなぁよし、進み始めた?"
        },
        {
          "speechId": 835,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5605881,
          "sourceEndMs": 5607402,
          "text": "ん?"
        },
        {
          "speechId": 836,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5607402,
          "sourceEndMs": 5608963,
          "text": "進んでるこれ?"
        },
        {
          "speechId": 837,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5608963,
          "sourceEndMs": 5609183,
          "text": "あれ?"
        },
        {
          "speechId": 838,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5609183,
          "sourceEndMs": 5609944,
          "text": "すでに進んでるよ"
        },
        {
          "speechId": 839,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5610114,
          "sourceEndMs": 5639964,
          "text": "逆でしたと向きが逆でしたおいおい何やってんだおんじゃんお前がやれよ泣くぞ泣くぞぐずってるぐずってる早く泣けよ泣くまでが長いでまだぐすぐすしてるあれ?"
        },
        {
          "speechId": 840,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5641350,
          "sourceEndMs": 5648235,
          "text": "もう遅いよもういつまでグズってんだよあれ進まないんだけどおかしくない?"
        },
        {
          "speechId": 841,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5648235,
          "sourceEndMs": 5669490,
          "text": "なんかやっぱパドルの出番ってわけよこれがおかしいなぁ向きは合ってると思うんだけどねちょっと待ってなぁパドルでこくから今行けパドルでやった方がいいと思うんだよね待っちょ待っちょ"
        },
        {
          "speechId": 842,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5671582,
          "sourceEndMs": 5672062,
          "text": "進んでる?"
        },
        {
          "speechId": 843,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5672062,
          "sourceEndMs": 5676266,
          "text": "これであ、進んだ進んだ進んだ!"
        },
        {
          "speechId": 844,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5676266,
          "sourceEndMs": 5686333,
          "text": "ほらよ、感謝しな壊れたわぬるっと壊れたね、今壊れたわパドルいいじゃん、これあ、でも移動してる?"
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
