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
    "windowId": "window_19_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 3034400,
    "sourceEndMs": 3243147
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
          "speechId": 457,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3034400,
          "sourceEndMs": 3043724,
          "text": "それバックパックも作れるバックパックそれ需要しかないってあれバックパックあれどういうこと?"
        },
        {
          "speechId": 458,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3043724,
          "sourceEndMs": 3043964,
          "text": "ん?"
        },
        {
          "speechId": 459,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3043964,
          "sourceEndMs": 3059832,
          "text": "わからんこれあうんうんうん革のヘルメットとかボディアーマーとかも作れるえそれは熱いあと軟膏軟膏とかペイントブラシだってえめっちゃいいじゃんでも革2枚しかないからいっぱい取らなきゃねこれねやっぱりさ"
        },
        {
          "speechId": 460,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3060374,
          "sourceEndMs": 3063596,
          "text": "殺すしかないって殺す?"
        },
        {
          "speechId": 461,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3063596,
          "sourceEndMs": 3069038,
          "text": "あいつらをあの鳥もさ多分川を落とすんじゃない?"
        },
        {
          "speechId": 462,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3069038,
          "sourceEndMs": 3072540,
          "text": "鳥か鳥捕まえられるネットとかなかったっけ?"
        },
        {
          "speechId": 463,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3072540,
          "sourceEndMs": 3080503,
          "text": "あれか次はネットランチャーねごめん船長さ配信前にさどう考えてもトイレに行ったけどさどうしても我慢できずもう一回行っていい?"
        },
        {
          "speechId": 464,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3080503,
          "sourceEndMs": 3085986,
          "text": "いいよちょっと行ってくるね待っててねうんいちみさんの喋ってていい?"
        },
        {
          "speechId": 465,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3085986,
          "sourceEndMs": 3086726,
          "text": "ちょっとよろしく"
        },
        {
          "speechId": 466,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3097202,
          "sourceEndMs": 3119058,
          "text": "いってらっしゃいみちみさんこんにちは緊張しちゃうね2人だと2人じゃないけどいっぱいいっぱいいるけど2人きりだと緊張しちゃうねこれ待ってた方がいいのかなぁ食材がないなでも"
        },
        {
          "speechId": 467,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3120354,
          "sourceEndMs": 3149486,
          "text": "なんか落ちてるんだよここら辺に今日もかわいいねって言われちゃったマリゾネスかわいいって言われちゃったよ一味のみなさんにみんなではないけど一部に一味の一部にこれ全然面白くない全然面白くないんだけどあー待ってこれじゃあ食材が足りなくなっちゃうそうだなこれ釣りもしたいな一味の一部"
        },
        {
          "speechId": 468,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3150170,
          "sourceEndMs": 3173801,
          "text": "一味の一部一味しちみー一味の一部おけりよいしょはいあーこうねのソロ配信助かったな何もしないけどねこれさマリゾネスさこれさ止まってるときにさ魚で釣れないんだっけいや止まってても魚は釣れるあ釣れる?"
        },
        {
          "speechId": 469,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3173801,
          "sourceEndMs": 3179964,
          "text": "釣れるよ食材がさ多分どんどんなくなっちゃいそうでさこれさあー確かにそれあるな確かに?"
        },
        {
          "speechId": 470,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3180190,
          "sourceEndMs": 3181130,
          "text": "しし肉焼いてる?"
        },
        {
          "speechId": 471,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3181130,
          "sourceEndMs": 3197098,
          "text": "しし肉あ、ごめんなさい焼いてなかったわもうしっかりしてくれよごめんなさいあなたお前がちゃんとしないと子供に示しがつかないだろ見て!"
        },
        {
          "speechId": 472,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3197098,
          "sourceEndMs": 3198258,
          "text": "マリン見てこれ!"
        },
        {
          "speechId": 473,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3198258,
          "sourceEndMs": 3198959,
          "text": "すごいよ!"
        },
        {
          "speechId": 474,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3198959,
          "sourceEndMs": 3201080,
          "text": "バーベキューだ!"
        },
        {
          "speechId": 475,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3201080,
          "sourceEndMs": 3205402,
          "text": "奇跡じゃんガチの!"
        },
        {
          "speechId": 476,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3205402,
          "sourceEndMs": 3209684,
          "text": "これ回復量絶対えげつないからお腹がホキで空いてる時だけで食べてるの歩かないでちょっとそこ"
        },
        {
          "speechId": 477,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3211310,
          "sourceEndMs": 3238642,
          "text": "ごめんぬやりやがったやめて汚いね俺だって疲れてんだよ疲れてるなら寝なさいよじゃあなんでバーベキューの網の上歩くのよやめて汚いお前には分からないお前には分からないだろうな俺くらいやってないと分からないだろうな何をだよ働きを働いてるのね俺ほどの働きをしてないとお前には分からないだろうな一生分からないわごめんなさいね"
        },
        {
          "speechId": 478,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3240846,
          "sourceEndMs": 3241707,
          "text": "なんだっけ?"
        },
        {
          "speechId": 479,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3241707,
          "sourceEndMs": 3243147,
          "text": "何をしようとしたんだっけ?"
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
