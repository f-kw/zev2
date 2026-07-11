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
    "windowId": "window_13_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 2055081,
    "sourceEndMs": 2243688
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
          "speechId": 295,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2055081,
          "sourceEndMs": 2059864,
          "text": "害ないからこそ逆に、これ長押しか?"
        },
        {
          "speechId": 296,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2059864,
          "sourceEndMs": 2061506,
          "text": "待って、めっちゃ速い。"
        },
        {
          "speechId": 297,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2061506,
          "sourceEndMs": 2062366,
          "text": "クソ難しい。"
        },
        {
          "speechId": 298,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2062366,
          "sourceEndMs": 2062666,
          "text": "こいつ速いな!"
        },
        {
          "speechId": 299,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2062666,
          "sourceEndMs": 2065709,
          "text": "こっちの方がいいのでは?"
        },
        {
          "speechId": 300,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2065709,
          "sourceEndMs": 2067810,
          "text": "ちょっとガバガバのエイムが。"
        },
        {
          "speechId": 301,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2070322,
          "sourceEndMs": 2071923,
          "text": "これ当たってるでもこれ当たってるとか?"
        },
        {
          "speechId": 302,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2071923,
          "sourceEndMs": 2076186,
          "text": "ほんとあれ回収できるよなんかうそ!"
        },
        {
          "speechId": 303,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2076186,
          "sourceEndMs": 2076987,
          "text": "これ当たってる?"
        },
        {
          "speechId": 304,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2076987,
          "sourceEndMs": 2080750,
          "text": "これなんか刺さってるよこっちで行く?"
        },
        {
          "speechId": 305,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2080750,
          "sourceEndMs": 2083372,
          "text": "鉛筆で行くわちょっと鉛筆?"
        },
        {
          "speechId": 306,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2083372,
          "sourceEndMs": 2091418,
          "text": "こっちの弓矢の方であ、普通にね確かにこいつだったらば普通にこれ!"
        },
        {
          "speechId": 307,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2091418,
          "sourceEndMs": 2097362,
          "text": "なんかやらされてる当たらないこれさ、これさ、小ヤギじゃないのこれ小ヤギ?"
        },
        {
          "speechId": 308,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2097362,
          "sourceEndMs": 2099744,
          "text": "ヤギいいねヤギ食べたいこれさ、倒したらさ"
        },
        {
          "speechId": 309,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2100342,
          "sourceEndMs": 2129864,
          "text": "やめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめて"
        },
        {
          "speechId": 310,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2138355,
          "sourceEndMs": 2140677,
          "text": "今晩はジンギスカンだな"
        },
        {
          "speechId": 311,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2164145,
          "sourceEndMs": 2165246,
          "text": "今だ!"
        },
        {
          "speechId": 312,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2165246,
          "sourceEndMs": 2189444,
          "text": "どれくらいで死んだんだろうねこれねわかんない、でも4発くらいは当ててるはずだからこっちもね、当ててる、結構全然当たらないどうしよう、ずっとこうしてるのかでも、こんだけさ、痛いからさとどめさせなきゃかわいそうだねな確かにね、2時間ずっとこれだった"
        },
        {
          "speechId": 313,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2196966,
          "sourceEndMs": 2199027,
          "text": "え、馬狩りの才能あるって!"
        },
        {
          "speechId": 314,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2199027,
          "sourceEndMs": 2207410,
          "text": "やっぱ犬だから…リオ…コヨリとかこういうの好きそうだなどこ行った?"
        },
        {
          "speechId": 315,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2207410,
          "sourceEndMs": 2217413,
          "text": "二人でやっちゃおうかななんかサメをさ、殺すのが好きじゃんわかるコヨリはわかるんだコヨーテだしなコヨーテ!"
        },
        {
          "speechId": 316,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2217413,
          "sourceEndMs": 2218814,
          "text": "確かにコヨーテって…ボケ!"
        },
        {
          "speechId": 317,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2220674,
          "sourceEndMs": 2243688,
          "text": "やっぱどうもなんかのこういうお手ってえ、どうなんだろうね待ってワタメがヒャーって言ってるワタメ気づいてしまったから自分のピンチに船長冷静にスイカ食べようスイカ食べんな落ちてんのもスイカがいいねスイカそこ登れるんだそれえ、死んの?"
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
