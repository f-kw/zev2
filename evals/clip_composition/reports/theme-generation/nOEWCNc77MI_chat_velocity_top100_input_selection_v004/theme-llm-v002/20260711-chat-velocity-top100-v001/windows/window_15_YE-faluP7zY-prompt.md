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
    "windowId": "window_15_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 3211310,
    "sourceEndMs": 3467816
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
        },
        {
          "speechId": 480,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3243147,
          "sourceEndMs": 3252153,
          "text": "ごはん食べたいなぁ焼けないかなぁ裏返したくなるよねこれね確かにこんなことしてる場合じゃなかったわごはん確かになくなりそうだこれでしょ?"
        },
        {
          "speechId": 481,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3252153,
          "sourceEndMs": 3269924,
          "text": "とりあえず冷静にいやーちょっとあれかイノシシやるかそうだねやっぱイノシシねえマーリン何よ見てえーイノスケじゃんねずことイノスケちゃたせな"
        },
        {
          "speechId": 482,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3270262,
          "sourceEndMs": 3273863,
          "text": "行くぞ!"
        },
        {
          "speechId": 483,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3273863,
          "sourceEndMs": 3278425,
          "text": "炭治郎!"
        },
        {
          "speechId": 484,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3278425,
          "sourceEndMs": 3279045,
          "text": "マリン、いいの?"
        },
        {
          "speechId": 485,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3279045,
          "sourceEndMs": 3279325,
          "text": "これ?"
        },
        {
          "speechId": 486,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3279325,
          "sourceEndMs": 3279926,
          "text": "マリンかぶる?"
        },
        {
          "speechId": 487,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3279926,
          "sourceEndMs": 3282927,
          "text": "これ?"
        },
        {
          "speechId": 488,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3282927,
          "sourceEndMs": 3283867,
          "text": "せいちゃん、じゃあねずこよ。"
        },
        {
          "speechId": 489,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3283867,
          "sourceEndMs": 3287408,
          "text": "え、それさ、待ってねずことさ、それって共存してる?"
        },
        {
          "speechId": 490,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3287408,
          "sourceEndMs": 3290589,
          "text": "共存できない!"
        },
        {
          "speechId": 491,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3290589,
          "sourceEndMs": 3292350,
          "text": "お前はこっちを使うんだ!"
        },
        {
          "speechId": 492,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3306889,
          "sourceEndMs": 3307710,
          "text": "あははは!"
        },
        {
          "speechId": 493,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3338034,
          "sourceEndMs": 3338916,
          "text": "どっちがいい?"
        },
        {
          "speechId": 494,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3338916,
          "sourceEndMs": 3339658,
          "text": "伊之助がいい?"
        },
        {
          "speechId": 495,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3339658,
          "sourceEndMs": 3342545,
          "text": "これちょっと待って今泣いてるからちょっと待って"
        },
        {
          "speechId": 496,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3366903,
          "sourceEndMs": 3387921,
          "text": "これさ頭が猪になるだけでさ何も得はないんだな見て焼けてるよこっちね焼けてるぞ食べな食べな分けようほら乾杯だ乾杯"
        },
        {
          "speechId": 497,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3390154,
          "sourceEndMs": 3417711,
          "text": "ほら乾杯しよう肉で乾杯だこれ絶対回復量すごいからさもったいないよ今食べたらもったいないじゃん別のにするもっとギリギリになってから食べようもっといいよなんだよ何でつぼってんのこれちょっと頭かぶってみてほしいよそしたらそんな面白いこれ違う違ういや"
        },
        {
          "speechId": 498,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3425014,
          "sourceEndMs": 3438683,
          "text": "あ、すごいすごい!"
        },
        {
          "speechId": 499,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3438683,
          "sourceEndMs": 3440304,
          "text": "ほんとだ!"
        },
        {
          "speechId": 500,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3440304,
          "sourceEndMs": 3441965,
          "text": "それでずっと積もってるのね!"
        },
        {
          "speechId": 501,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3441965,
          "sourceEndMs": 3443126,
          "text": "あ、くれるのありがとね"
        },
        {
          "speechId": 502,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3452146,
          "sourceEndMs": 3467816,
          "text": "掘ってくれる説森で育った森で育った勘を出していくわそうだねちょっと行こうかちょっと待って斧だけ作っていい?"
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
