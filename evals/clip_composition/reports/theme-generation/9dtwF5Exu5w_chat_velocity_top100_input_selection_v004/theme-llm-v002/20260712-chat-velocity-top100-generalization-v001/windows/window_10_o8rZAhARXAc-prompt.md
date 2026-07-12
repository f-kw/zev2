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
    "windowId": "window_10_o8rZAhARXAc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "o8rZAhARXAc",
    "sourceStartMs": 4710742,
    "sourceEndMs": 5000855
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
          "speechId": 435,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4710742,
          "sourceEndMs": 4711703,
          "text": "ミートに!"
        },
        {
          "speechId": 436,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4711703,
          "sourceEndMs": 4713523,
          "text": "左のミートでこっちか!"
        },
        {
          "speechId": 437,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4713523,
          "sourceEndMs": 4715744,
          "text": "これかん!"
        },
        {
          "speechId": 438,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4715744,
          "sourceEndMs": 4719666,
          "text": "こっちかん!"
        },
        {
          "speechId": 439,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4719666,
          "sourceEndMs": 4723728,
          "text": "左のミートこれな!"
        },
        {
          "speechId": 440,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4723728,
          "sourceEndMs": 4725088,
          "text": "しおりんがつくかもしんないもんね!"
        },
        {
          "speechId": 441,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4725088,
          "sourceEndMs": 4726249,
          "text": "わかった!"
        },
        {
          "speechId": 442,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4726249,
          "sourceEndMs": 4727229,
          "text": "じゃこれで行くわ!"
        },
        {
          "speechId": 443,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4727229,
          "sourceEndMs": 4730931,
          "text": "こっち!"
        },
        {
          "speechId": 444,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4730931,
          "sourceEndMs": 4731671,
          "text": "お前かん!"
        },
        {
          "speechId": 445,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4731671,
          "sourceEndMs": 4732992,
          "text": "古川!"
        },
        {
          "speechId": 446,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4732992,
          "sourceEndMs": 4733332,
          "text": "すまー!"
        },
        {
          "speechId": 447,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4733332,
          "sourceEndMs": 4734412,
          "text": "あ!"
        },
        {
          "speechId": 448,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4734412,
          "sourceEndMs": 4735393,
          "text": "しおりん!"
        },
        {
          "speechId": 449,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4735393,
          "sourceEndMs": 4735933,
          "text": "ついた!"
        },
        {
          "speechId": 450,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4735933,
          "sourceEndMs": 4736373,
          "text": "カット打ち!"
        },
        {
          "speechId": 451,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4736373,
          "sourceEndMs": 4738494,
          "text": "ええやん!"
        },
        {
          "speechId": 452,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4741026,
          "sourceEndMs": 4764298,
          "text": "またつくやんいいやんスワはねまだねマリンのチームのね一軍ですからちょっと待ってもうホンダスワやる気出すなやばい3年生が強化されて意味ないどうしようしかもラオーラどうしようなうわどうしよう"
        },
        {
          "speechId": 453,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4770854,
          "sourceEndMs": 4779937,
          "text": "今のうちどうしよう3年生ばっか来る助けてこれどうしようこれダンベル?"
        },
        {
          "speechId": 454,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4779937,
          "sourceEndMs": 4780177,
          "text": "これ?"
        },
        {
          "speechId": 455,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4780177,
          "sourceEndMs": 4785018,
          "text": "走り込むの?"
        },
        {
          "speechId": 456,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4785018,
          "sourceEndMs": 4786338,
          "text": "これ?"
        },
        {
          "speechId": 457,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4786338,
          "sourceEndMs": 4798762,
          "text": "これやだしょぼいからダンベルにするかあ、あったダンベルななんかつけなんもつかんなかー"
        },
        {
          "speechId": 461,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4891090,
          "sourceEndMs": 4895571,
          "text": "なに?"
        },
        {
          "speechId": 462,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4895571,
          "sourceEndMs": 4899312,
          "text": "何しよう?"
        },
        {
          "speechId": 463,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4899312,
          "sourceEndMs": 4910255,
          "text": "えーえーえーえーどうする?"
        },
        {
          "speechId": 464,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4910255,
          "sourceEndMs": 4911456,
          "text": "何がいいかな?"
        },
        {
          "speechId": 465,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4911456,
          "sourceEndMs": 4911936,
          "text": "ミート?"
        },
        {
          "speechId": 466,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4911936,
          "sourceEndMs": 4918818,
          "text": "粘り打ち固め打ちさよなら男ラインドライブカット打ちさよなら男"
        },
        {
          "speechId": 472,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4983207,
          "sourceEndMs": 4988429,
          "text": "どうする?"
        },
        {
          "speechId": 473,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4988429,
          "sourceEndMs": 4990070,
          "text": "インターバル走?"
        },
        {
          "speechId": 474,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4990070,
          "sourceEndMs": 4998554,
          "text": "これ?"
        },
        {
          "speechId": 475,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4998554,
          "sourceEndMs": 5000855,
          "text": "インターバル?"
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
