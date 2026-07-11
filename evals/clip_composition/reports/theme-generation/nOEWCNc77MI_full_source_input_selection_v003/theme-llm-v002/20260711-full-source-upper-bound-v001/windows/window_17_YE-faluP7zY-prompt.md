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
    "windowId": "window_17_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 2773337,
    "sourceEndMs": 2893495
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
      "promptSegmentCount": 32,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 398,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2773337,
          "sourceEndMs": 2787609,
          "text": "さっきちょっとワタメに気を取られたから普通にシンプルに今回はちゃんとイノシシ一点張りで了解海の中から狙い撃ちよう了解あ、見て!"
        },
        {
          "speechId": 399,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2787609,
          "sourceEndMs": 2789030,
          "text": "綺麗だねうん"
        },
        {
          "speechId": 400,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2790074,
          "sourceEndMs": 2798477,
          "text": "なんか君の心みたいにあったかいあなたの心はどこ行った?"
        },
        {
          "speechId": 401,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2798477,
          "sourceEndMs": 2802758,
          "text": "あっこっちよもうお茶目だなどこ行ったんだい?"
        },
        {
          "speechId": 402,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2802758,
          "sourceEndMs": 2803679,
          "text": "待て待て!"
        },
        {
          "speechId": 403,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2803679,
          "sourceEndMs": 2805559,
          "text": "待て!"
        },
        {
          "speechId": 404,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2805559,
          "sourceEndMs": 2815803,
          "text": "気持ち悪いからついてこないで血を見ずにでも使ってなさい急に冷たくなっちゃって来ないね気持ち悪いわ照れているのかな?"
        },
        {
          "speechId": 405,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2815803,
          "sourceEndMs": 2819724,
          "text": "待てっておい待てちょ待てって"
        },
        {
          "speechId": 406,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2821638,
          "sourceEndMs": 2823639,
          "text": "キモい!"
        },
        {
          "speechId": 407,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2823639,
          "sourceEndMs": 2824019,
          "text": "キモい!"
        },
        {
          "speechId": 408,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2824019,
          "sourceEndMs": 2825059,
          "text": "キモい!"
        },
        {
          "speechId": 409,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2825059,
          "sourceEndMs": 2825559,
          "text": "キモい!"
        },
        {
          "speechId": 410,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2825559,
          "sourceEndMs": 2828840,
          "text": "キモい!"
        },
        {
          "speechId": 411,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2828840,
          "sourceEndMs": 2831401,
          "text": "キモい!"
        },
        {
          "speechId": 412,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2831401,
          "sourceEndMs": 2832181,
          "text": "キモい!"
        },
        {
          "speechId": 413,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2832181,
          "sourceEndMs": 2832741,
          "text": "キモい!"
        },
        {
          "speechId": 414,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2832741,
          "sourceEndMs": 2833261,
          "text": "キモい!"
        },
        {
          "speechId": 415,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2833261,
          "sourceEndMs": 2834442,
          "text": "キモい!"
        },
        {
          "speechId": 416,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2834442,
          "sourceEndMs": 2838323,
          "text": "キモい!"
        },
        {
          "speechId": 417,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2838323,
          "sourceEndMs": 2839283,
          "text": "キモい!"
        },
        {
          "speechId": 418,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2839283,
          "sourceEndMs": 2840364,
          "text": "キモい!"
        },
        {
          "speechId": 419,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2840364,
          "sourceEndMs": 2840524,
          "text": "キモい!"
        },
        {
          "speechId": 420,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2840524,
          "sourceEndMs": 2840764,
          "text": "キモい!"
        },
        {
          "speechId": 421,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2840764,
          "sourceEndMs": 2841604,
          "text": "キモい!"
        },
        {
          "speechId": 422,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2841604,
          "sourceEndMs": 2843765,
          "text": "キモい!"
        },
        {
          "speechId": 423,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2843765,
          "sourceEndMs": 2846385,
          "text": "キモい!"
        },
        {
          "speechId": 424,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2846385,
          "sourceEndMs": 2846926,
          "text": "キモい!"
        },
        {
          "speechId": 425,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2846926,
          "sourceEndMs": 2848146,
          "text": "キモい!"
        },
        {
          "speechId": 426,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2851182,
          "sourceEndMs": 2853043,
          "text": "お尻ぷりぷりしちゃおう!"
        },
        {
          "speechId": 427,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2853043,
          "sourceEndMs": 2853843,
          "text": "悔しいか?"
        },
        {
          "speechId": 428,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2853843,
          "sourceEndMs": 2878230,
          "text": "ぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷり�"
        },
        {
          "speechId": 429,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2890914,
          "sourceEndMs": 2893495,
          "text": "アリー当てた?"
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
