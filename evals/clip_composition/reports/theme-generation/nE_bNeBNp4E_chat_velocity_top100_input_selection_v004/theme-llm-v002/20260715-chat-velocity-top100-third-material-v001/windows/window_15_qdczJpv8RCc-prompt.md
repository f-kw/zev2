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
    "windowId": "window_15_qdczJpv8RCc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "qdczJpv8RCc",
    "sourceStartMs": 1887930,
    "sourceEndMs": 2278942
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
      "promptSegmentCount": 26,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 436,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1887930,
          "sourceEndMs": 1888590,
          "text": "耐えすぎやろ?"
        },
        {
          "speechId": 437,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1892050,
          "sourceEndMs": 1919800,
          "text": "クイーンねさあ見ますかおーいいじゃんよ言っとくけど嘘は通用しないよこっちはね結構自分の手札で悟ってんだから嘘は通用しないと思っていただきたいまあ1枚くらいは"
        },
        {
          "speechId": 444,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1984368,
          "sourceEndMs": 2009940,
          "text": "嘘だと思います顔でわかる顔でわかるんだからほーらマリンが正しいんだから覚悟決めやさあそろそろ血を流してくれマリンに見せてよ耐えん耐えすぎてなんでこいつら全員こんな耐え散らかしてんのみんな耐えすぎ"
        },
        {
          "speechId": 445,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2010042,
          "sourceEndMs": 2032395,
          "text": "次マジで血を流してどれ悪くめっちゃいくねもはやまあ一旦ね言っとくけどマジでマリンの元に集ってるよこれ"
        },
        {
          "speechId": 446,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2040002,
          "sourceEndMs": 2068199,
          "text": "一旦真面目に出すかシマシカが嘘っぽいなーってやってるからこれは一旦ホント感を出すどうしたこっち見てこれホントだよマリンが君に嘘ついたことあったっけないそうないこれガチないよね"
        },
        {
          "speechId": 447,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2070140,
          "sourceEndMs": 2098406,
          "text": "なんだお前その態度はなんだその態度嘘くさいな嘘くさいと思うスカイドレアさんノスノスもシマシカが怪しいってマリンもシマシカだと思う"
        },
        {
          "speechId": 448,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2103466,
          "sourceEndMs": 2105227,
          "text": "それ嘘やん!"
        },
        {
          "speechId": 449,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2105227,
          "sourceEndMs": 2106367,
          "text": "なわけ!"
        },
        {
          "speechId": 450,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2106367,
          "sourceEndMs": 2108588,
          "text": "トゥーって!"
        },
        {
          "speechId": 451,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2108588,
          "sourceEndMs": 2120992,
          "text": "いやシマシカが嘘ついててスカイドリアさんは本当これで行くわシマシカが嘘ついてるノスノスさんもそう思う?"
        },
        {
          "speechId": 452,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2120992,
          "sourceEndMs": 2128234,
          "text": "こいつら信者だからさマリンにさライアーって言えないと思うんだよなよし"
        },
        {
          "speechId": 453,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2130950,
          "sourceEndMs": 2150741,
          "text": "ここで嘘つかないのマリンだけなんだよなこの現場で嘘つかないのマリンだけノスノスさんはマリンだけ信じて後の奴らは敵だと思って?"
        },
        {
          "speechId": 454,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2150741,
          "sourceEndMs": 2152142,
          "text": "ノスノス?"
        },
        {
          "speechId": 455,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2152142,
          "sourceEndMs": 2156264,
          "text": "ノスノス?"
        },
        {
          "speechId": 456,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2156264,
          "sourceEndMs": 2159406,
          "text": "嘘でしょ?"
        },
        {
          "speechId": 457,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2159406,
          "sourceEndMs": 2159546,
          "text": "お前さ"
        },
        {
          "speechId": 458,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2163780,
          "sourceEndMs": 2166702,
          "text": "ワン、キング"
        },
        {
          "speechId": 459,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2193742,
          "sourceEndMs": 2219860,
          "text": "マリンは1枚目は嘘つかないことにしてる通った3枚とか出したらさライアってノスノス言ってくるぞこれ絶対3枚とか出したら絶対さライアって言ってくる3枚出そう"
        },
        {
          "speechId": 460,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2221419,
          "sourceEndMs": 2247350,
          "text": "ちゃんと切ってるからボイチャは3枚出したらね疑うと思うよ嘘っぽいと思うやん嘘っぽいと思うやんこれガチですしまちかなんだその態度は目そらしてんじゃないよこれガチ"
        },
        {
          "speechId": 461,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2252382,
          "sourceEndMs": 2263210,
          "text": "通るんかい…通るんかい…確かに!"
        },
        {
          "speechId": 462,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2263210,
          "sourceEndMs": 2268474,
          "text": "なにっ!"
        },
        {
          "speechId": 463,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2268474,
          "sourceEndMs": 2272177,
          "text": "ノスノスお前!"
        },
        {
          "speechId": 464,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2272177,
          "sourceEndMs": 2274619,
          "text": "空気読め!"
        },
        {
          "speechId": 465,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2274619,
          "sourceEndMs": 2275820,
          "text": "しましか耐えろ!"
        },
        {
          "speechId": 466,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2275820,
          "sourceEndMs": 2277961,
          "text": "耐えていく!"
        },
        {
          "speechId": 467,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2277961,
          "sourceEndMs": 2278942,
          "text": "耐えていった!"
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
