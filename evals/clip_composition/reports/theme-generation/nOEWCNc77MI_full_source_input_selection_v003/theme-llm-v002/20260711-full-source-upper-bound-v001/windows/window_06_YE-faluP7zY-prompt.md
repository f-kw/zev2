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
    "windowId": "window_06_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 993519,
    "sourceEndMs": 1144276
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
      "promptSegmentCount": 28,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 113,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 993519,
          "sourceEndMs": 1001441,
          "text": "コロゾネス待たなくていいよずっとベリーだって食べちゃうどこだ?"
        },
        {
          "speechId": 114,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1001441,
          "sourceEndMs": 1006182,
          "text": "どこだちょっと待って一緒にゴーデスとか行かなこれじゃあイカダでちょっと待っとくか?"
        },
        {
          "speechId": 115,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1006182,
          "sourceEndMs": 1009243,
          "text": "オッケーちょっと待ってなイカダどこだ?"
        },
        {
          "speechId": 116,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1009243,
          "sourceEndMs": 1011184,
          "text": "じゃあヤ、ヤちょっと弓?"
        },
        {
          "speechId": 117,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1011184,
          "sourceEndMs": 1011864,
          "text": "ヤ、ヤ弓?"
        },
        {
          "speechId": 118,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1011864,
          "sourceEndMs": 1014365,
          "text": "死ぬかもしれんこれ嘘でしょ?"
        },
        {
          "speechId": 119,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1014365,
          "sourceEndMs": 1019166,
          "text": "ちょっとヤと作っとこうコーネも一緒に一緒にさ弓やする?"
        },
        {
          "speechId": 120,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1021002,
          "sourceEndMs": 1022723,
          "text": "殺した方が早く殺せるか!"
        },
        {
          "speechId": 121,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1022723,
          "sourceEndMs": 1034412,
          "text": "そうそうそう、ちょっとロープちょっと作ってブドウのネバネバはちょっと海藻で作るかなんかそう、1個だ1個もないっけなこれえ、見失っちゃった?"
        },
        {
          "speechId": 122,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1034412,
          "sourceEndMs": 1039036,
          "text": "待てねーちょっと待てーどっかにないか?"
        },
        {
          "speechId": 123,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1039036,
          "sourceEndMs": 1046161,
          "text": "ネバネバあ、ここね鉱石あるなさてさてさてちょっとまとめてやの数が少ないって!"
        },
        {
          "speechId": 124,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1046161,
          "sourceEndMs": 1049624,
          "text": "アドバイスパソーカーなんとない時にね"
        },
        {
          "speechId": 125,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1050106,
          "sourceEndMs": 1058648,
          "text": "違う、違う違うね、ごめんねやめてね、そんなつもりじゃないからねや、や、やーだけにやめてもう何も言えねえ!"
        },
        {
          "speechId": 126,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1058648,
          "sourceEndMs": 1072470,
          "text": "嘘すぎるもう何も言えねえよわかった、せいちゃんが矢作ったときあ、やばい、いる、いるなあねえ、待って、イノシシ3匹いるあれ、作った矢どこ、あ、21本3匹いる?"
        },
        {
          "speechId": 127,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1072470,
          "sourceEndMs": 1079852,
          "text": "3匹いる、3匹いる何個いるかな、ちょっと1人30本ずつ持つか、じゃあここやばいかもあ、でも板足りない"
        },
        {
          "speechId": 128,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1081354,
          "sourceEndMs": 1081915,
          "text": "居た?"
        },
        {
          "speechId": 129,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1081915,
          "sourceEndMs": 1082435,
          "text": "居た?"
        },
        {
          "speechId": 130,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1082435,
          "sourceEndMs": 1084155,
          "text": "居た?"
        },
        {
          "speechId": 131,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1084155,
          "sourceEndMs": 1085376,
          "text": "居た?"
        },
        {
          "speechId": 132,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1085376,
          "sourceEndMs": 1085716,
          "text": "居た?"
        },
        {
          "speechId": 133,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1085716,
          "sourceEndMs": 1086196,
          "text": "居た?"
        },
        {
          "speechId": 134,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1086196,
          "sourceEndMs": 1086696,
          "text": "居た?"
        },
        {
          "speechId": 135,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1086696,
          "sourceEndMs": 1087116,
          "text": "居た?"
        },
        {
          "speechId": 136,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1087116,
          "sourceEndMs": 1087296,
          "text": "居た?"
        },
        {
          "speechId": 137,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1110182,
          "sourceEndMs": 1139684,
          "text": "来た時用に矢作ってありがたいねーこれで一緒にターン行こうよちょっと20本ずつちょっとコーネ1本少ない19本だけどまあ細かいことは全然いい全然いいあ全然いい解消できるしねベトベト足りるかなベトベトベトベト足りるかな問題があったわやっと見つけたオッケーあ行けるなよし弓作ったあじゃあ今ここで渡しちゃうねありがてーよこれ弓と"
        },
        {
          "speechId": 138,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1140194,
          "sourceEndMs": 1141995,
          "text": "はいこれ、嫌ね?"
        },
        {
          "speechId": 139,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1141995,
          "sourceEndMs": 1142956,
          "text": "拾ってよ?"
        },
        {
          "speechId": 140,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1142956,
          "sourceEndMs": 1144276,
          "text": "水に流される前にね?"
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
