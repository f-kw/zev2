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
    "windowId": "window_15_o8rZAhARXAc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "o8rZAhARXAc",
    "sourceStartMs": 6680196,
    "sourceEndMs": 6797971
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
          "speechId": 703,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6680196,
          "sourceEndMs": 6680536,
          "text": "盗塁?"
        },
        {
          "speechId": 704,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6680536,
          "sourceEndMs": 6680996,
          "text": "スクイーズ?"
        },
        {
          "speechId": 705,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6680996,
          "sourceEndMs": 6681337,
          "text": "盗塁?"
        },
        {
          "speechId": 706,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6681337,
          "sourceEndMs": 6682217,
          "text": "スクイーズ?"
        },
        {
          "speechId": 707,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6682217,
          "sourceEndMs": 6682597,
          "text": "盗塁?"
        },
        {
          "speechId": 708,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6682597,
          "sourceEndMs": 6683218,
          "text": "スクイーズ?"
        },
        {
          "speechId": 709,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6683218,
          "sourceEndMs": 6684279,
          "text": "盗塁してスクイーズ?"
        },
        {
          "speechId": 710,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6684279,
          "sourceEndMs": 6685640,
          "text": "数字変わっちゃうけど良き?"
        },
        {
          "speechId": 711,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6685640,
          "sourceEndMs": 6687881,
          "text": "数字変わっちゃうけど良き?"
        },
        {
          "speechId": 712,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6687881,
          "sourceEndMs": 6688902,
          "text": "盗塁したら数字変わっちゃうけど"
        },
        {
          "speechId": 713,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6691546,
          "sourceEndMs": 6696669,
          "text": "まずいか?"
        },
        {
          "speechId": 714,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6696669,
          "sourceEndMs": 6703232,
          "text": "まずいかな?"
        },
        {
          "speechId": 715,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6703232,
          "sourceEndMs": 6705653,
          "text": "いけるよね?"
        },
        {
          "speechId": 716,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6705653,
          "sourceEndMs": 6710035,
          "text": "肩もクイックもD肩もクイックもDさっき見た?"
        },
        {
          "speechId": 717,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6710035,
          "sourceEndMs": 6715998,
          "text": "選手は危ないかな?"
        },
        {
          "speechId": 718,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6715998,
          "sourceEndMs": 6719260,
          "text": "いける?"
        },
        {
          "speechId": 719,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6719260,
          "sourceEndMs": 6719900,
          "text": "牽制されてるから少し"
        },
        {
          "speechId": 720,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6720540,
          "sourceEndMs": 6721260,
          "text": "いける?"
        },
        {
          "speechId": 721,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6721260,
          "sourceEndMs": 6721901,
          "text": "いけるか?"
        },
        {
          "speechId": 722,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6721901,
          "sourceEndMs": 6722181,
          "text": "いける?"
        },
        {
          "speechId": 723,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6722181,
          "sourceEndMs": 6722621,
          "text": "いけます?"
        },
        {
          "speechId": 724,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6722621,
          "sourceEndMs": 6723001,
          "text": "いけます?"
        },
        {
          "speechId": 725,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6723001,
          "sourceEndMs": 6728003,
          "text": "いけます?"
        },
        {
          "speechId": 726,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6728003,
          "sourceEndMs": 6728823,
          "text": "いけるか?"
        },
        {
          "speechId": 727,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6728823,
          "sourceEndMs": 6734205,
          "text": "え、ちょっとなんか、全然見えない見えねーよ!"
        },
        {
          "speechId": 728,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6734205,
          "sourceEndMs": 6748310,
          "text": "あ、1になっちゃったあいつスクイーズ1になっちゃったこれこれスクイーズ1になっちゃったあ、1になっちゃったけどこれやっちゃったかこれ、転がすか一旦"
        },
        {
          "speechId": 729,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6750866,
          "sourceEndMs": 6763495,
          "text": "うんクセモノ切った方がいいかなーこりゃー切るか3かー!"
        },
        {
          "speechId": 730,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6763495,
          "sourceEndMs": 6776824,
          "text": "3だってよー3微妙かなーんー3は危険?"
        },
        {
          "speechId": 731,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6776824,
          "sourceEndMs": 6779286,
          "text": "ん、うん"
        },
        {
          "speechId": 732,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6780658,
          "sourceEndMs": 6788384,
          "text": "微妙かーバンド職人ついてるからいけんじゃね?"
        },
        {
          "speechId": 733,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6788384,
          "sourceEndMs": 6791586,
          "text": "まあほんと?"
        },
        {
          "speechId": 734,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6791586,
          "sourceEndMs": 6793828,
          "text": "いってみるかじゃあね?"
        },
        {
          "speechId": 735,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6793828,
          "sourceEndMs": 6797971,
          "text": "バンド職人があるんだから!"
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
