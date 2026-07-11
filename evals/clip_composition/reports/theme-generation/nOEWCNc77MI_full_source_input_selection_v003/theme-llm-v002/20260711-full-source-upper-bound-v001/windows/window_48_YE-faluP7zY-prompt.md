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
    "windowId": "window_48_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 7770146,
    "sourceEndMs": 7983079
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
      "promptSegmentCount": 22,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 1223,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7770146,
          "sourceEndMs": 7775129,
          "text": "もうなくなっちったかななくなっちったかもスクラップ?"
        },
        {
          "speechId": 1224,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7775129,
          "sourceEndMs": 7783874,
          "text": "そうあ、ガラス拾ったよ見てあ、これ持てないかこれんー持ててない持てない?"
        },
        {
          "speechId": 1225,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7783874,
          "sourceEndMs": 7784215,
          "text": "これは?"
        },
        {
          "speechId": 1226,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7784215,
          "sourceEndMs": 7798903,
          "text": "あ、あったあったスクラップあったわなにこれ待ってあ、待たなくていいわ待てないよ別にひどーい"
        },
        {
          "speechId": 1227,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7800514,
          "sourceEndMs": 7829952,
          "text": "別に待ってないよーひどくなーいとりあえず作ってここ置いてこれね、あ、板めっちゃ引っかかってるわ、すごいわよし、もう降りよ今考えてる、うーん、そうだなー今考えて、考えて、考えて、うぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅ"
        },
        {
          "speechId": 1228,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7831238,
          "sourceEndMs": 7833238,
          "text": "花とかいる?"
        },
        {
          "speechId": 1229,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7833238,
          "sourceEndMs": 7855683,
          "text": "一応でもストレージが増えてるからワンチャンしまえなくもないからあれだな壁作って今あるちっちゃいストレージをいくつか壊してここに引っ掛けてねえねえ今コメントで見たんだけどさいらないものボックスねえ!"
        },
        {
          "speechId": 1230,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7855683,
          "sourceEndMs": 7856703,
          "text": "死ね!"
        },
        {
          "speechId": 1231,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7856703,
          "sourceEndMs": 7859744,
          "text": "いらないものいらないものボックス作って"
        },
        {
          "speechId": 1232,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7860254,
          "sourceEndMs": 7872042,
          "text": "なんかとりあえずいまいらないものボックスみたいなあーオッケーオッケーオッケーオッケー端っこにさ、なんかゴミ箱作ろうぜ、じゃあいいよーゴミ箱という名のストレージを端っこ…あ、じゃあここにしよ、階段横にしない?"
        },
        {
          "speechId": 1233,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7872042,
          "sourceEndMs": 7874984,
          "text": "あ、ブブブ…階段横にしよ、階段横いいね、いいねわかりやすくない?"
        },
        {
          "speechId": 1234,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7874984,
          "sourceEndMs": 7889634,
          "text": "覚えやすい溶けよ、お前マジでね、また乾杯しようあ、そんな…ごめんね、そんな時間ないよなに、乾杯ってね、この…さんこれ"
        },
        {
          "speechId": 1235,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7891182,
          "sourceEndMs": 7892883,
          "text": "いらないものボックス作る前にOK?"
        },
        {
          "speechId": 1236,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7892883,
          "sourceEndMs": 7893523,
          "text": "いいよ?"
        },
        {
          "speechId": 1237,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7893523,
          "sourceEndMs": 7894063,
          "text": "いい?"
        },
        {
          "speechId": 1238,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7894063,
          "sourceEndMs": 7914530,
          "text": "今食ったよなよ1個あげる食べちまったよもうないの?"
        },
        {
          "speechId": 1239,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7914530,
          "sourceEndMs": 7919412,
          "text": "もうない乾杯"
        },
        {
          "speechId": 1240,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7920182,
          "sourceEndMs": 7948778,
          "text": "一人で食べまーすだってさ、い、い、い、いちいのししからさ、に、に、に、ににくしかとれないんだもんだっていちいのししからににく、なるほどそう、ににくしかとれないからーあれとろいけーいまね、サーモン焼いてっからうんサーモンいいねーでかいしなー3回くらい食べれるしえっと、じゃあここにー食べはね食われてるーえっと、で、どうしたいんだっけ"
        },
        {
          "speechId": 1241,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7953528,
          "sourceEndMs": 7979063,
          "text": "じゃあ船長の物もちょっと整理しないとか一回じゃあ鉱石君たちがなんて言ってたか忘れちゃったなあここがスクラップかここにじゃあスクラップちょっと入れてOK海の産物とかねあーいいねでも粘土と砂って海で取れるからさ海藻もここでいいか確かにあれは?"
        },
        {
          "speechId": 1242,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7979063,
          "sourceEndMs": 7979404,
          "text": "ん?"
        },
        {
          "speechId": 1243,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7979404,
          "sourceEndMs": 7979684,
          "text": "川は"
        },
        {
          "speechId": 1244,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7980118,
          "sourceEndMs": 7983079,
          "text": "皮皮?"
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
