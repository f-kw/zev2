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
    "windowId": "window_07_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 1144276,
    "sourceEndMs": 1280213
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
          "speechId": 141,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1144276,
          "sourceEndMs": 1147819,
          "text": "はいはいはいはいちょっとご飯も食べるから拾った!"
        },
        {
          "speechId": 142,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1147819,
          "sourceEndMs": 1148819,
          "text": "オッケー?"
        },
        {
          "speechId": 143,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1148819,
          "sourceEndMs": 1154923,
          "text": "うーんと、サメの頭いらねご飯も食べてよ?"
        },
        {
          "speechId": 144,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1154923,
          "sourceEndMs": 1156044,
          "text": "はい!"
        },
        {
          "speechId": 145,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1156044,
          "sourceEndMs": 1162007,
          "text": "よし、今日はしし鍋しし丼しし汁しししちゅうね?"
        },
        {
          "speechId": 146,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1162007,
          "sourceEndMs": 1164989,
          "text": "そう、しししちゅうが一番好きだわあ、これ夜になるけどこれどう?"
        },
        {
          "speechId": 147,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1164989,
          "sourceEndMs": 1165249,
          "text": "いいか?"
        },
        {
          "speechId": 148,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1165249,
          "sourceEndMs": 1169712,
          "text": "別に先にねほねば、夜の方がさ、海の中"
        },
        {
          "speechId": 149,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1170418,
          "sourceEndMs": 1174119,
          "text": "あれだよな、探索しやすいんだよなあ、する?"
        },
        {
          "speechId": 150,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1174119,
          "sourceEndMs": 1182180,
          "text": "最初海の中やっちゃってそうやで、暗いとイノシシも見えなくて危ないしあ、これマリリーさんこれ使ってみるよ、禰豆子あ、禰豆子?"
        },
        {
          "speechId": 151,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1182180,
          "sourceEndMs": 1183641,
          "text": "いや、大丈夫だよ平気?"
        },
        {
          "speechId": 152,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1183641,
          "sourceEndMs": 1199144,
          "text": "平気平気OK待って、弓矢じゃなくて矢も持って持ち物は大丈夫だなよし生の芋、芋焼いとこうかな食料あるよある?"
        },
        {
          "speechId": 153,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1199144,
          "sourceEndMs": 1199564,
          "text": "あるよ、あの"
        },
        {
          "speechId": 154,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1200098,
          "sourceEndMs": 1223383,
          "text": "箱に入ってる全部の箱を1個ずつ開けたら見つかるありがとう次はちゃんとね分かりやすくしとくわ2階建てにしたらきてるきてるきてるお前許さねえサメだサメだ多分サメだコーネいる多分というかサメやこれは間違いなくね間違いなくラフトやこれはラフト?"
        },
        {
          "speechId": 155,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1223383,
          "sourceEndMs": 1229904,
          "text": "これはラフトというゲームやいたいやサメサメサメほらいるよなやっぱりないるすいませんマリンよりコーネのことを食べてください"
        },
        {
          "speechId": 156,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1230214,
          "sourceEndMs": 1234815,
          "text": "なんでやねんコーニーさん狙われたらヤバいで今死にかけの…え、痛っ!"
        },
        {
          "speechId": 157,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1234815,
          "sourceEndMs": 1235315,
          "text": "待って!"
        },
        {
          "speechId": 158,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1235315,
          "sourceEndMs": 1235596,
          "text": "待って!"
        },
        {
          "speechId": 159,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1235596,
          "sourceEndMs": 1236016,
          "text": "痛っ!"
        },
        {
          "speechId": 160,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1236016,
          "sourceEndMs": 1236436,
          "text": "痛っ!"
        },
        {
          "speechId": 161,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1236436,
          "sourceEndMs": 1237096,
          "text": "痛っ!"
        },
        {
          "speechId": 162,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1237096,
          "sourceEndMs": 1237476,
          "text": "痛っ!"
        },
        {
          "speechId": 163,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1237476,
          "sourceEndMs": 1258062,
          "text": "コーニーありがとう今まですごい大好きだった本当によいごんサメはさ弓矢で…でももったいないなちょっとでも確かにね弓矢弱えないっすなあ弓矢でも弓でもサメ倒せるよって言われてるなえ待ってもしかしてさもしかしてこの丈さいや無理かコンコンできるかと思った"
        },
        {
          "speechId": 164,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1260022,
          "sourceEndMs": 1274430,
          "text": "そんな…竹取りの翁というものありきりやんそんな…竹取りの翁というものありきり…そんな丁寧に…あ、違うわ!"
        },
        {
          "speechId": 165,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1274430,
          "sourceEndMs": 1275270,
          "text": "かぐや姫や!"
        },
        {
          "speechId": 166,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1275270,
          "sourceEndMs": 1277732,
          "text": "かぐや姫生まれちゃうよそうだねえ?"
        },
        {
          "speechId": 167,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1277732,
          "sourceEndMs": 1280213,
          "text": "かぐや姫生まれちゃうよなに?"
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
