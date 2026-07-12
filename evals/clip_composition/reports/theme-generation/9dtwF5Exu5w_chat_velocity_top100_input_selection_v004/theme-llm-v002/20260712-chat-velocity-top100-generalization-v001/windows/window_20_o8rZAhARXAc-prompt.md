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
    "windowId": "window_20_o8rZAhARXAc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "o8rZAhARXAc",
    "sourceStartMs": 8218519,
    "sourceEndMs": 8305599
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
      "promptSegmentCount": 35,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 890,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8218519,
          "sourceEndMs": 8219780,
          "text": "プルヒッターもついてました"
        },
        {
          "speechId": 891,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8226920,
          "sourceEndMs": 8231004,
          "text": "ほなどっちですか?"
        },
        {
          "speechId": 892,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8231004,
          "sourceEndMs": 8237910,
          "text": "ミート対応でも強振してくれるセンター返し行きます!"
        },
        {
          "speechId": 893,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8237910,
          "sourceEndMs": 8240673,
          "text": "自分センター返し行かしてもらいます!"
        },
        {
          "speechId": 894,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8240673,
          "sourceEndMs": 8243275,
          "text": "期待してません決して!"
        },
        {
          "speechId": 895,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8243275,
          "sourceEndMs": 8244817,
          "text": "引っ張るのがいいんすか?"
        },
        {
          "speechId": 896,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8244817,
          "sourceEndMs": 8245998,
          "text": "でもナナがセンター返しか?"
        },
        {
          "speechId": 897,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8250754,
          "sourceEndMs": 8254357,
          "text": "7だし引っ張り?"
        },
        {
          "speechId": 898,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8254357,
          "sourceEndMs": 8261603,
          "text": "6引っ張りですか?"
        },
        {
          "speechId": 899,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8261603,
          "sourceEndMs": 8263465,
          "text": "センター?"
        },
        {
          "speechId": 900,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8263465,
          "sourceEndMs": 8274975,
          "text": "プロだから引っ張り?"
        },
        {
          "speechId": 901,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8274975,
          "sourceEndMs": 8275275,
          "text": "風?"
        },
        {
          "speechId": 902,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8275275,
          "sourceEndMs": 8276596,
          "text": "風?"
        },
        {
          "speechId": 903,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8276596,
          "sourceEndMs": 8276656,
          "text": "風?"
        },
        {
          "speechId": 904,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8276656,
          "sourceEndMs": 8278277,
          "text": "風ね?"
        },
        {
          "speechId": 905,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8278277,
          "sourceEndMs": 8279058,
          "text": "引っ張り方向が風が来てる?"
        },
        {
          "speechId": 906,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8280670,
          "sourceEndMs": 8281050,
          "text": "引っ張りの風が来てる?"
        },
        {
          "speechId": 907,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8281050,
          "sourceEndMs": 8281210,
          "text": "分かった!"
        },
        {
          "speechId": 908,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8281210,
          "sourceEndMs": 8284891,
          "text": "引っ張りの風が来てるから!"
        },
        {
          "speechId": 909,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8284891,
          "sourceEndMs": 8285372,
          "text": "引っ張りまーす!"
        },
        {
          "speechId": 910,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8285372,
          "sourceEndMs": 8286532,
          "text": "いけるかな?"
        },
        {
          "speechId": 911,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8286532,
          "sourceEndMs": 8286972,
          "text": "えいっ!"
        },
        {
          "speechId": 912,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8286972,
          "sourceEndMs": 8298036,
          "text": "あっ!"
        },
        {
          "speechId": 913,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8298036,
          "sourceEndMs": 8298256,
          "text": "あっ!"
        },
        {
          "speechId": 914,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8298256,
          "sourceEndMs": 8304178,
          "text": "あっ!"
        },
        {
          "speechId": 915,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8304178,
          "sourceEndMs": 8304238,
          "text": "あっ!"
        },
        {
          "speechId": 916,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8304238,
          "sourceEndMs": 8304298,
          "text": "ツバ!"
        },
        {
          "speechId": 917,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8304298,
          "sourceEndMs": 8304358,
          "text": "ツバ!"
        },
        {
          "speechId": 918,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8304358,
          "sourceEndMs": 8304438,
          "text": "あっ!"
        },
        {
          "speechId": 919,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8304438,
          "sourceEndMs": 8304538,
          "text": "入っ!"
        },
        {
          "speechId": 920,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8304538,
          "sourceEndMs": 8304818,
          "text": "入っちゃう!"
        },
        {
          "speechId": 921,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8304818,
          "sourceEndMs": 8305218,
          "text": "入らないかーい!"
        },
        {
          "speechId": 922,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8305218,
          "sourceEndMs": 8305378,
          "text": "入らないかーい!"
        },
        {
          "speechId": 923,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8305378,
          "sourceEndMs": 8305478,
          "text": "まいっか!"
        },
        {
          "speechId": 924,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8305478,
          "sourceEndMs": 8305599,
          "text": "ナーイスー!"
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
