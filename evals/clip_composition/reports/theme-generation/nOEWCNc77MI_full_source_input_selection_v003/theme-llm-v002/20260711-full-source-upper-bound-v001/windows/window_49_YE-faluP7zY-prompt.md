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
    "windowId": "window_49_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 7983079,
    "sourceEndMs": 8159844
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
          "speechId": 1245,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7983079,
          "sourceEndMs": 8009832,
          "text": "あの、イノシシ倒したらもらえるやつさんああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああ"
        },
        {
          "speechId": 1246,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8012414,
          "sourceEndMs": 8039724,
          "text": "ぬるっと流れてったからちょっとサクッと拾えちゃうってあーごめんそうなのねすぐそこだいいと思うよでもいいと思うそうねバックパック作ろうバックパックあればさもっと拾えて楽になるからじゃあ作るかと思ってよバックパックね今探してるバックパックがいいバックパックなんてなくねさっきでもさ"
        },
        {
          "speechId": 1247,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8045716,
          "sourceEndMs": 8060321,
          "text": "アルパカとかいるの?"
        },
        {
          "speechId": 1248,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8060321,
          "sourceEndMs": 8060781,
          "text": "アルパカ!"
        },
        {
          "speechId": 1249,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8070022,
          "sourceEndMs": 8075186,
          "text": "すごいね詳しいねみんな詳しいよねどうしてそんな詳しい?"
        },
        {
          "speechId": 1250,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8075186,
          "sourceEndMs": 8099026,
          "text": "あれ片付けてネバネバあっサーモン焼けた焼けたからこれこいつとこいつを焼くんだよあれ外したこれでこうだねな美味しく焼けますようにこれ外した箱って"
        },
        {
          "speechId": 1251,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8100258,
          "sourceEndMs": 8103439,
          "text": "回収できてるか?"
        },
        {
          "speechId": 1252,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8103439,
          "sourceEndMs": 8105039,
          "text": "できてない感じ?"
        },
        {
          "speechId": 1253,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8105039,
          "sourceEndMs": 8105219,
          "text": "あれ?"
        },
        {
          "speechId": 1254,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8105219,
          "sourceEndMs": 8107339,
          "text": "さっき一個外した気がするんだけどあれ?"
        },
        {
          "speechId": 1255,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8107339,
          "sourceEndMs": 8111900,
          "text": "葉っぱはどこだっけ?"
        },
        {
          "speechId": 1256,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8111900,
          "sourceEndMs": 8122202,
          "text": "葉っぱここかほらよアイコーンにさっきさ、勉強したけどな材料が足りん?"
        },
        {
          "speechId": 1257,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8122202,
          "sourceEndMs": 8125263,
          "text": "でもあ、あれじゃない?"
        },
        {
          "speechId": 1258,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8125263,
          "sourceEndMs": 8125803,
          "text": "こっちまでな?"
        },
        {
          "speechId": 1259,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8125803,
          "sourceEndMs": 8126023,
          "text": "うんあ、ほんとだ!"
        },
        {
          "speechId": 1260,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8126023,
          "sourceEndMs": 8127423,
          "text": "羊の毛がいるんだ!"
        },
        {
          "speechId": 1261,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8127423,
          "sourceEndMs": 8128084,
          "text": "おー!"
        },
        {
          "speechId": 1262,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8128084,
          "sourceEndMs": 8129744,
          "text": "羊の毛!"
        },
        {
          "speechId": 1263,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8129744,
          "sourceEndMs": 8129964,
          "text": "あ!"
        },
        {
          "speechId": 1264,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8131090,
          "sourceEndMs": 8134372,
          "text": "そのさ、刈り切り鋏みたいなのあったよね、そういえばあったね!"
        },
        {
          "speechId": 1265,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8134372,
          "sourceEndMs": 8135752,
          "text": "あれで刈るんか!"
        },
        {
          "speechId": 1266,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8135752,
          "sourceEndMs": 8159804,
          "text": "あーなるほどなるほどね納得ですあ、そういうことね刈り切り鋏か刈り切り鋏は蝶酢貝と金属のインゴットとスクラップかダメ?"
        },
        {
          "speechId": 1267,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8159804,
          "sourceEndMs": 8159844,
          "text": "うん"
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
