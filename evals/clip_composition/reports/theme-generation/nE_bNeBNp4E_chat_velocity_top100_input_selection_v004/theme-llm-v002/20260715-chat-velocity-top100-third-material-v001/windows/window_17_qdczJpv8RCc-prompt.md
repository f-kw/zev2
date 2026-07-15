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
    "windowId": "window_17_qdczJpv8RCc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "qdczJpv8RCc",
    "sourceStartMs": 2551046,
    "sourceEndMs": 2816838
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
      "promptSegmentCount": 29,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 497,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2551046,
          "sourceEndMs": 2575504,
          "text": "いやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいや"
        },
        {
          "speechId": 505,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2644574,
          "sourceEndMs": 2654540,
          "text": "うわっ、ライアーって言われたかったのにくそっいやいやいやいや"
        },
        {
          "speechId": 506,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2656098,
          "sourceEndMs": 2659960,
          "text": "いやいやいやtoってことはないんじゃない?"
        },
        {
          "speechId": 507,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2659960,
          "sourceEndMs": 2663162,
          "text": "のすのすさんこれどう思われます?"
        },
        {
          "speechId": 508,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2663162,
          "sourceEndMs": 2669146,
          "text": "toクイーンはちょっとないよねそれはないんじゃないの?"
        },
        {
          "speechId": 509,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2671622,
          "sourceEndMs": 2674284,
          "text": "必死さが足りないんじゃない?"
        },
        {
          "speechId": 510,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2674284,
          "sourceEndMs": 2674764,
          "text": "後ろ!"
        },
        {
          "speechId": 511,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2674764,
          "sourceEndMs": 2684430,
          "text": "いけ!"
        },
        {
          "speechId": 512,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2684430,
          "sourceEndMs": 2686932,
          "text": "死んたくない…死んたくない!"
        },
        {
          "speechId": 513,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2686932,
          "sourceEndMs": 2687992,
          "text": "マリンに生きてて欲しいよね!"
        },
        {
          "speechId": 514,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2687992,
          "sourceEndMs": 2688253,
          "text": "みんな!"
        },
        {
          "speechId": 515,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2688253,
          "sourceEndMs": 2689493,
          "text": "マリンに生きてて欲しいよね!"
        },
        {
          "speechId": 516,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2689493,
          "sourceEndMs": 2690854,
          "text": "マリンが死んじゃったらやだよね!"
        },
        {
          "speechId": 517,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2690854,
          "sourceEndMs": 2691475,
          "text": "つまらんよね!"
        },
        {
          "speechId": 518,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2691475,
          "sourceEndMs": 2692255,
          "text": "寂しいよね!"
        },
        {
          "speechId": 519,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2692255,
          "sourceEndMs": 2694256,
          "text": "耐えるんだわ!"
        },
        {
          "speechId": 520,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2694256,
          "sourceEndMs": 2694777,
          "text": "死なないよ!"
        },
        {
          "speechId": 521,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2694777,
          "sourceEndMs": 2695577,
          "text": "キマジを置いて!"
        },
        {
          "speechId": 522,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2695577,
          "sourceEndMs": 2697759,
          "text": "マリンは死んだりしない!"
        },
        {
          "speechId": 523,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2697759,
          "sourceEndMs": 2699019,
          "text": "キマジを一人にはしない!"
        },
        {
          "speechId": 524,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2699019,
          "sourceEndMs": 2699740,
          "text": "一人ではないか!"
        },
        {
          "speechId": 525,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2712903,
          "sourceEndMs": 2714463,
          "text": "2つのクイーンズ"
        },
        {
          "speechId": 526,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2730234,
          "sourceEndMs": 2758278,
          "text": "マリンは1順目は嘘つかないからわかったいやここで2枚出したら2、1、1、いやまだ微妙以下ここで、いやダイヤしてくるかも"
        },
        {
          "speechId": 527,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2761226,
          "sourceEndMs": 2776230,
          "text": "何だい?"
        },
        {
          "speechId": 528,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2776230,
          "sourceEndMs": 2777951,
          "text": "何よ?"
        },
        {
          "speechId": 529,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2777951,
          "sourceEndMs": 2786033,
          "text": "疑うの?"
        },
        {
          "speechId": 530,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2786033,
          "sourceEndMs": 2786454,
          "text": "おい、何?"
        },
        {
          "speechId": 531,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2786454,
          "sourceEndMs": 2788094,
          "text": "シマシカと相談してんのか?"
        },
        {
          "speechId": 532,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2793122,
          "sourceEndMs": 2816838,
          "text": "その態度はやれやれみたいな2枚もあるわけないよねそれともお前が嘘ついてたんかのすのす"
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
