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
    "windowId": "window_18_qdczJpv8RCc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "qdczJpv8RCc",
    "sourceStartMs": 2820506,
    "sourceEndMs": 3253312
  },
  "sources": [
    {
      "sourceVideoId": "qdczJpv8RCc",
      "sourceUrl": "https://www.youtube.com/watch?v=qdczJpv8RCc",
      "sourceTitle": "【Liar's Bar】キミたちと初見であそぶ！視聴者参加型【ホロライブ/宝鐘マリン】",
      "transcriptKind": "local_stt",
      "language": "ja-JP",
      "durationSec": 7760.401,
      "rawSegmentCount": 23963,
      "promptSegmentCount": 25,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 533,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2820506,
          "sourceEndMs": 2848699,
          "text": "いやこいつ嘘つくからなーほんとかもしれんあのさしましかさんもさライアした方がいいと思うのすのすにちゃんとさ刺してくれないとはいこれ嘘はいちゃんと刺してくれないと困るよこれやってくれないとほーらだから当たり前のように嘘なんだからこれお別れだねのすのすさん"
        },
        {
          "speechId": 534,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2855953,
          "sourceEndMs": 2878726,
          "text": "震えとるわ震えとるわしましかさ怖い死ぬのが怖い怖いね死ぬのが一騎打ちですもんねキングかいや一騎打ちだからここは"
        },
        {
          "speechId": 535,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2883522,
          "sourceEndMs": 2884363,
          "text": "1キング2キング2キング"
        },
        {
          "speechId": 536,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2911350,
          "sourceEndMs": 2939580,
          "text": "ほーほーほーんトゥーキングなるほどなるほどなるほどねマリンも2枚出しちゃおっかなぶーかお前は嘘つきでもマリンは嘘をつかない残念でしたかっこきめーよ"
        },
        {
          "speechId": 537,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2942286,
          "sourceEndMs": 2944173,
          "text": "え?"
        },
        {
          "speechId": 538,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2944173,
          "sourceEndMs": 2946360,
          "text": "運ゲーの勝者?"
        },
        {
          "speechId": 539,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2946360,
          "sourceEndMs": 2947022,
          "text": "タエタだと?"
        },
        {
          "speechId": 540,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2975023,
          "sourceEndMs": 2999090,
          "text": "シマシカさんとは友情が芽生えてる今お互いにさライアーって言うのはやめようだってシマシカさん嘘つかないからそしてマリンも嘘つかないお前さ"
        },
        {
          "speechId": 541,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3001086,
          "sourceEndMs": 3001887,
          "text": "なに?"
        },
        {
          "speechId": 542,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3001887,
          "sourceEndMs": 3002867,
          "text": "友達じゃない!"
        },
        {
          "speechId": 543,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3002867,
          "sourceEndMs": 3006270,
          "text": "ねえ君はもう友達じゃない!"
        },
        {
          "speechId": 544,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3006270,
          "sourceEndMs": 3007691,
          "text": "ブタコの!"
        },
        {
          "speechId": 545,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3007691,
          "sourceEndMs": 3008451,
          "text": "クソブタ!"
        },
        {
          "speechId": 546,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3008451,
          "sourceEndMs": 3011193,
          "text": "許され!"
        },
        {
          "speechId": 547,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3011193,
          "sourceEndMs": 3013255,
          "text": "ヘイヘイヘイ!"
        },
        {
          "speechId": 548,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3013255,
          "sourceEndMs": 3014776,
          "text": "どうした?"
        },
        {
          "speechId": 549,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3014776,
          "sourceEndMs": 3025623,
          "text": "マーリンはまだ生きとるけどなほね?"
        },
        {
          "speechId": 550,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3025623,
          "sourceEndMs": 3029086,
          "text": "あのさ、言っとくけどこっちの手札最強でごめん"
        },
        {
          "speechId": 551,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3030458,
          "sourceEndMs": 3032260,
          "text": "最強でごめん状態分かる?"
        },
        {
          "speechId": 552,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3032260,
          "sourceEndMs": 3058462,
          "text": "だからつまり一旦出してだね逆にあいつ全然持ってないってことじゃない?"
        },
        {
          "speechId": 553,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3063763,
          "sourceEndMs": 3089578,
          "text": "いやえありえるかありえるかいやここで2枚出したら嘘だと思うはずここで2枚出したら嘘だと思うと思うあのねこっちは無限にあるんだよエースがね無限に持って"
        },
        {
          "speechId": 554,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3093571,
          "sourceEndMs": 3119740,
          "text": "バーカ無限に持ってんだよこっちは無限やねんこっちは血で行ってよし何がダーリンだバカ勝ち勝った勝ちました嬉しい"
        },
        {
          "speechId": 555,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3121274,
          "sourceEndMs": 3149940,
          "text": "スカイドリームさんかスカイドリームさんのすのすさんみんなありがとうこれさあれ入れてみたいデビルしてみようデビルわかんないけど何もわかんないけどデビルしてみようデビルでやってみよう一回試しにわかったルールは"
        },
        {
          "speechId": 556,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3150134,
          "sourceEndMs": 3175202,
          "text": "把握したすっかり水飲みますみんな準備完了ですか行きますよデビルのがハラハラするデビルにライアーしちゃうとみんなアウトなるほどデビルにライアーしちゃうとみんなアウト"
        },
        {
          "speechId": 566,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3249350,
          "sourceEndMs": 3253312,
          "text": "何だったんだ!"
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
