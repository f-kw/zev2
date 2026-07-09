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
    "windowId": "window_03_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 12000,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 420358,
    "sourceEndMs": 648402
  },
  "sources": [
    {
      "sourceVideoId": "YE-faluP7zY",
      "sourceUrl": "https://www.youtube.com/watch?v=YE-faluP7zY",
      "sourceTitle": "【Raft】ころね、キミさえいればこの海の果てまでだって──【ホロライブ/宝鐘マリン】",
      "transcriptKind": "local_stt",
      "language": "ja-JP",
      "durationSec": 1500,
      "rawSegmentCount": 7395,
      "promptSegmentCount": 14,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 40,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 420358,
          "sourceEndMs": 438186,
          "text": "そうかもしれない悩んだそうなのそうだったかもしれねえナルト風のそうだったかもしれねえ朝になったんで皆さんに紹介していきたいと思いますこうねうろうろしてないであれをあげてくれよなどれ?"
        },
        {
          "speechId": 41,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 438186,
          "sourceEndMs": 449852,
          "text": "アンカー落としてるんだよね当然これ落としてる落としてる落としてるいきますよ飛び込んでったはいいきますよ"
        },
        {
          "speechId": 42,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 450034,
          "sourceEndMs": 461818,
          "text": "オラァイヨォォォォォォォォォォォォォォォォォォォォォォォォォォォォォォォォォ"
        },
        {
          "speechId": 43,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 482374,
          "sourceEndMs": 507883,
          "text": "まず紹介やってよ紹介誰がやるのこうなったらこちらの階段はテンテンテンテンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテー"
        },
        {
          "speechId": 44,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 511410,
          "sourceEndMs": 539932,
          "text": "床を強化素材に変えてみましたこうなったらば簡単にはサメに食われないだろうと思って付けたんですけれどもめちゃめちゃ資材を食う割にはガンガン壊れてしまい意外とそんなに良くなかったなっていう感じだよね遠い目をしてるそして2階を作ったんですけど一旦これ入り口のグッドティンなんていうか"
        },
        {
          "speechId": 45,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 540280,
          "sourceEndMs": 567026,
          "text": "こう書いてあるんだこれTingGoodTingCometochooseまああれだよな俺らの場所みたいな俺らの場所や俺らの場所かこれじゃあ俺らの場所俺らのフロアや俺らのフロアということが書いてある階段もつけまして2階というのを設置してねここから先の必需品って誰だろうこのアンテナをねちょっと"
        },
        {
          "speechId": 46,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 567658,
          "sourceEndMs": 570004,
          "text": "つけてきましたでもちょっと使い方ちょっと忘れちゃったからね"
        },
        {
          "speechId": 47,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 570560,
          "sourceEndMs": 582966,
          "text": "これからねコメントの指示中を見ながら把握していく心づむりでございますといってもやっぱこのアンテナで冒険するのはお腹すいて死ぬお腹すいてる?"
        },
        {
          "speechId": 48,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 582966,
          "sourceEndMs": 591351,
          "text": "すいてるちょっと食べるわ芋あるよ芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋"
        },
        {
          "speechId": 49,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 598246,
          "sourceEndMs": 600004,
          "text": "これねマリリンが作ってくれたんですけど"
        },
        {
          "speechId": 50,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 600202,
          "sourceEndMs": 629792,
          "text": "この2階あそうそう2階をねちょっと地味に作り始めたんだけど教科書外で作り始めちゃったんだけどもう素材すごい食って全然作らないからちょっとプレミしたなと思ってそれでね今日ちょっと作業するかってなったんだよねそうそうだからちょっとこっからは普通素材でガガガーっと骨組みだけ作っていきたいなと思いながらこのアンテナ使うのは次回4人揃った時でいいかなと思って今回は複面を完成させるというところにそうねということで今日はお邪魔します"
        },
        {
          "speechId": 51,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 631198,
          "sourceEndMs": 641920,
          "text": "よろしくおねがいしまーすおねがいしまーす鉄もね、ちょっとまあね、ゆるい感じでいこうやん今日ゆるめにね、いきましょうまったりとまあ、2時間くらいかなえ、ちょっとなんか、なんか悪くね?"
        },
        {
          "speechId": 52,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 641920,
          "sourceEndMs": 647641,
          "text": "みたいに思わないでくださいね今日はゆるくいこからこれ大丈夫なの?"
        },
        {
          "speechId": 53,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 647641,
          "sourceEndMs": 648402,
          "text": "なんか、あれ?"
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
