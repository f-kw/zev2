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
    "windowId": "window_14_o8rZAhARXAc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "o8rZAhARXAc",
    "sourceStartMs": 6579774,
    "sourceEndMs": 6680196
  },
  "sources": [
    {
      "sourceVideoId": "o8rZAhARXAc",
      "sourceUrl": "https://www.youtube.com/watch?v=o8rZAhARXAc",
      "sourceTitle": "【 #ホロライブ甲子園2025】2年目夏！！夏合宿と甲子園初戦で狙え育成上振れ！！【ホロライブ/宝鐘マリン】",
      "transcriptKind": "local_stt",
      "language": "ja-JP",
      "durationSec": 11898.441,
      "rawSegmentCount": 34507,
      "promptSegmentCount": 33,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 670,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6579774,
          "sourceEndMs": 6582235,
          "text": "これこれトウコン?"
        },
        {
          "speechId": 671,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6582235,
          "sourceEndMs": 6582775,
          "text": "いかんか?"
        },
        {
          "speechId": 672,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6582775,
          "sourceEndMs": 6584636,
          "text": "これやっとくべきか?"
        },
        {
          "speechId": 673,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6584636,
          "sourceEndMs": 6589198,
          "text": "これ最悪ギ…今の風見て飛ばないぞ?"
        },
        {
          "speechId": 674,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6589198,
          "sourceEndMs": 6590698,
          "text": "風強いから犠牲ダメ?"
        },
        {
          "speechId": 675,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6590698,
          "sourceEndMs": 6596661,
          "text": "そっかそうかもわかった風向きね?"
        },
        {
          "speechId": 676,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6596661,
          "sourceEndMs": 6598882,
          "text": "わかったトウコンはまだわかった"
        },
        {
          "speechId": 677,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6601538,
          "sourceEndMs": 6603359,
          "text": "ほな、転がす?"
        },
        {
          "speechId": 678,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6603359,
          "sourceEndMs": 6606102,
          "text": "じゃあ転がすこれ?"
        },
        {
          "speechId": 679,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6606102,
          "sourceEndMs": 6611666,
          "text": "じゃあ転がすこれ?"
        },
        {
          "speechId": 680,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6611666,
          "sourceEndMs": 6615068,
          "text": "んー転ごうでいいかな?"
        },
        {
          "speechId": 681,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6615068,
          "sourceEndMs": 6622814,
          "text": "ほなほな転ごうか月通が怖い?"
        },
        {
          "speechId": 682,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6622814,
          "sourceEndMs": 6623315,
          "text": "そうか!"
        },
        {
          "speechId": 683,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6623315,
          "sourceEndMs": 6624656,
          "text": "月通が怖いか!"
        },
        {
          "speechId": 684,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6624656,
          "sourceEndMs": 6626717,
          "text": "ほなセンター返しか!"
        },
        {
          "speechId": 685,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6626717,
          "sourceEndMs": 6629600,
          "text": "ほなセンター返しか!"
        },
        {
          "speechId": 686,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6629600,
          "sourceEndMs": 6629780,
          "text": "じゃあ"
        },
        {
          "speechId": 687,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6634591,
          "sourceEndMs": 6637592,
          "text": "いけ!"
        },
        {
          "speechId": 688,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6637592,
          "sourceEndMs": 6638872,
          "text": "センター返しだ!"
        },
        {
          "speechId": 689,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6638872,
          "sourceEndMs": 6657739,
          "text": "飛んでるこれ犠牲フライみたいな感じになら…な…な…まあまあまあまあ1点入ったいいじゃんチャンスだ"
        },
        {
          "speechId": 690,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6660842,
          "sourceEndMs": 6662063,
          "text": "え?"
        },
        {
          "speechId": 691,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6662063,
          "sourceEndMs": 6665005,
          "text": "盗塁なんかできそうじゃね?"
        },
        {
          "speechId": 692,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6665005,
          "sourceEndMs": 6666546,
          "text": "コロネ?"
        },
        {
          "speechId": 693,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6666546,
          "sourceEndMs": 6669368,
          "text": "盗塁D、負草力Bえ、いけるよね?"
        },
        {
          "speechId": 694,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6669368,
          "sourceEndMs": 6669989,
          "text": "いけるっしょ?"
        },
        {
          "speechId": 695,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6669989,
          "sourceEndMs": 6670829,
          "text": "盗塁していいよね?"
        },
        {
          "speechId": 696,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6670829,
          "sourceEndMs": 6673791,
          "text": "気持ちいいしていいっすかこれ?"
        },
        {
          "speechId": 697,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6673791,
          "sourceEndMs": 6674572,
          "text": "え、スクイーズ?"
        },
        {
          "speechId": 698,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6674572,
          "sourceEndMs": 6676974,
          "text": "え、と、スクイーズ?"
        },
        {
          "speechId": 699,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6676974,
          "sourceEndMs": 6678715,
          "text": "と、スクイーズ?"
        },
        {
          "speechId": 700,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6678715,
          "sourceEndMs": 6679375,
          "text": "盗塁スクイーズ?"
        },
        {
          "speechId": 701,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6679375,
          "sourceEndMs": 6679755,
          "text": "盗塁?"
        },
        {
          "speechId": 702,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6679755,
          "sourceEndMs": 6680196,
          "text": "スクイーズ?"
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
