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
    "windowId": "window_25_o8rZAhARXAc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "o8rZAhARXAc",
    "sourceStartMs": 10738500,
    "sourceEndMs": 10848424
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
      "promptSegmentCount": 34,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 1210,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10738500,
          "sourceEndMs": 10739420,
          "text": "チョコ先生はですね"
        },
        {
          "speechId": 1211,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10740342,
          "sourceEndMs": 10742803,
          "text": "ミートのやつないミートのやつない"
        },
        {
          "speechId": 1212,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10770830,
          "sourceEndMs": 10772451,
          "text": "大激流かな?"
        },
        {
          "speechId": 1213,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10772451,
          "sourceEndMs": 10773532,
          "text": "オッケー!"
        },
        {
          "speechId": 1214,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10773532,
          "sourceEndMs": 10775733,
          "text": "行け大山!"
        },
        {
          "speechId": 1215,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10775733,
          "sourceEndMs": 10776694,
          "text": "あー!"
        },
        {
          "speechId": 1216,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10776694,
          "sourceEndMs": 10777895,
          "text": "トール行こう?"
        },
        {
          "speechId": 1217,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10777895,
          "sourceEndMs": 10778155,
          "text": "え?"
        },
        {
          "speechId": 1218,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10778155,
          "sourceEndMs": 10778996,
          "text": "した方がいい?"
        },
        {
          "speechId": 1219,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10778996,
          "sourceEndMs": 10780036,
          "text": "しなくていいか?"
        },
        {
          "speechId": 1220,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10780036,
          "sourceEndMs": 10781037,
          "text": "しなくていいか?"
        },
        {
          "speechId": 1221,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10781037,
          "sourceEndMs": 10782718,
          "text": "トールは私にはしなくていいか?"
        },
        {
          "speechId": 1222,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10782718,
          "sourceEndMs": 10783499,
          "text": "な、なにしたらいい?"
        },
        {
          "speechId": 1223,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10783499,
          "sourceEndMs": 10784119,
          "text": "なにしたらどうする?"
        },
        {
          "speechId": 1224,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10784119,
          "sourceEndMs": 10784319,
          "text": "なに?"
        },
        {
          "speechId": 1225,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10784319,
          "sourceEndMs": 10785440,
          "text": "なに?"
        },
        {
          "speechId": 1226,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10785440,
          "sourceEndMs": 10785800,
          "text": "なにする?"
        },
        {
          "speechId": 1227,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10785800,
          "sourceEndMs": 10786161,
          "text": "どうする?"
        },
        {
          "speechId": 1228,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10786161,
          "sourceEndMs": 10786521,
          "text": "なにする?"
        },
        {
          "speechId": 1229,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10786521,
          "sourceEndMs": 10790744,
          "text": "どうする?"
        },
        {
          "speechId": 1230,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10790744,
          "sourceEndMs": 10792705,
          "text": "うん、トールする?"
        },
        {
          "speechId": 1231,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10792705,
          "sourceEndMs": 10793866,
          "text": "トールしとく?"
        },
        {
          "speechId": 1232,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10793866,
          "sourceEndMs": 10795707,
          "text": "オッケー!"
        },
        {
          "speechId": 1233,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10795707,
          "sourceEndMs": 10798589,
          "text": "あー!"
        },
        {
          "speechId": 1234,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10798589,
          "sourceEndMs": 10799430,
          "text": "ミートB、トールE"
        },
        {
          "speechId": 1235,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10800122,
          "sourceEndMs": 10815651,
          "text": "ミートじゃない走力BBトールEEなんだけどこれ大丈夫ぞBなんだけどBDDEトールEなんだけどやれないか?"
        },
        {
          "speechId": 1236,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10815651,
          "sourceEndMs": 10817172,
          "text": "やめとくか?"
        },
        {
          "speechId": 1237,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10817172,
          "sourceEndMs": 10818173,
          "text": "犠牲フライか?"
        },
        {
          "speechId": 1238,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10818173,
          "sourceEndMs": 10827438,
          "text": "これパワーBミートD犠牲フライかな?"
        },
        {
          "speechId": 1239,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10827438,
          "sourceEndMs": 10827559,
          "text": "これ"
        },
        {
          "speechId": 1240,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10837818,
          "sourceEndMs": 10840760,
          "text": "犠牲?"
        },
        {
          "speechId": 1241,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10840760,
          "sourceEndMs": 10845703,
          "text": "犠牲?"
        },
        {
          "speechId": 1242,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10845703,
          "sourceEndMs": 10847144,
          "text": "え?"
        },
        {
          "speechId": 1243,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10847144,
          "sourceEndMs": 10848424,
          "text": "怖い?"
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
