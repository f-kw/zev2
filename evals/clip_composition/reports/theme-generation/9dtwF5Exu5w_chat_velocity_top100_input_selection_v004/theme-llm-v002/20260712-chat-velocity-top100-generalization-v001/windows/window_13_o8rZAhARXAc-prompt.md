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
    "windowId": "window_13_o8rZAhARXAc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "o8rZAhARXAc",
    "sourceStartMs": 6360082,
    "sourceEndMs": 6579774
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
      "promptSegmentCount": 29,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 637,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6360082,
          "sourceEndMs": 6389414,
          "text": "とか持ってる長谷川長谷川はこの学校はざまみ小学校じゃないざまみ高校は強すぎるやつの中に一人こういう長谷川みたいなこれ1年生だ1年でお前それから強えな1年生入れてこれ教育中今育成中です育成中投手負け運負け運来たうわー"
        },
        {
          "speechId": 638,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6390562,
          "sourceEndMs": 6417590,
          "text": "ムービングファースト、シュート、進化、チェンジアップなるほどクイックはD、盗塁はなんかできそうだなクイックDで肩がDだから盗塁はなんかワンチャンあるな、雰囲気ま、一旦転がしていくとりあえず一旦転がしていく"
        },
        {
          "speechId": 643,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6480278,
          "sourceEndMs": 6480718,
          "text": "何類?"
        },
        {
          "speechId": 644,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6480718,
          "sourceEndMs": 6483039,
          "text": "えぇー?"
        },
        {
          "speechId": 645,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6483039,
          "sourceEndMs": 6484639,
          "text": "まー?"
        },
        {
          "speechId": 646,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6484639,
          "sourceEndMs": 6485520,
          "text": "チャンスだけど?"
        },
        {
          "speechId": 647,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6485520,
          "sourceEndMs": 6488640,
          "text": "あ、どうしよう?"
        },
        {
          "speechId": 648,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6488640,
          "sourceEndMs": 6489301,
          "text": "転がす?"
        },
        {
          "speechId": 649,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6489301,
          "sourceEndMs": 6493982,
          "text": "それとも送りバント?"
        },
        {
          "speechId": 650,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6493982,
          "sourceEndMs": 6500204,
          "text": "え、あーでも転、うーん転がすか普通にうーん、転がすと出バント?"
        },
        {
          "speechId": 651,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6500204,
          "sourceEndMs": 6508846,
          "text": "うーん、まあ一旦転がすかさっきみたいに普通にアウトってなるかもしれんけどバントからスクイーズでちゃんと1点取るべき?"
        },
        {
          "speechId": 652,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6511002,
          "sourceEndMs": 6525131,
          "text": "ちゃんと1点取るか迷うなぁ…うーん…ま、これ…剥がすかぁ…一旦…お願い!"
        },
        {
          "speechId": 653,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6525131,
          "sourceEndMs": 6525871,
          "text": "頑張ってよ!"
        },
        {
          "speechId": 654,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6525871,
          "sourceEndMs": 6526271,
          "text": "転がったら!"
        },
        {
          "speechId": 655,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6526271,
          "sourceEndMs": 6527292,
          "text": "よーしよしよしよしよしよしよし!"
        },
        {
          "speechId": 656,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6527292,
          "sourceEndMs": 6528033,
          "text": "泡の工夫!"
        },
        {
          "speechId": 657,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6528033,
          "sourceEndMs": 6529974,
          "text": "やればできるじゃない!"
        },
        {
          "speechId": 658,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6529974,
          "sourceEndMs": 6530934,
          "text": "なんだって!"
        },
        {
          "speechId": 659,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6530934,
          "sourceEndMs": 6531275,
          "text": "スワ!"
        },
        {
          "speechId": 660,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6531275,
          "sourceEndMs": 6532956,
          "text": "お前やれんのか!"
        },
        {
          "speechId": 661,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6532956,
          "sourceEndMs": 6534216,
          "text": "スワ!"
        },
        {
          "speechId": 662,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6534216,
          "sourceEndMs": 6535777,
          "text": "やれんのか状態で!"
        },
        {
          "speechId": 663,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6535777,
          "sourceEndMs": 6539920,
          "text": "スワスワスワ!"
        },
        {
          "speechId": 664,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6540034,
          "sourceEndMs": 6569860,
          "text": "いいかーでも総力はBでも数字が3だとなんか嫌な感じがするよなやばっすわやれんのかお前転がせ5かこれやれんのか状態でまずいやる気かってすわやんのかってどうするってこれトルいくべちょっと怖いちょっと怖い3とか言われるとちょっと嫌な気が"
        },
        {
          "speechId": 665,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6570790,
          "sourceEndMs": 6572211,
          "text": "犠牲フライもある?"
        },
        {
          "speechId": 666,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6572211,
          "sourceEndMs": 6572671,
          "text": "確かに!"
        },
        {
          "speechId": 667,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6572671,
          "sourceEndMs": 6573891,
          "text": "犠牲フライでもいい!"
        },
        {
          "speechId": 668,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6573891,
          "sourceEndMs": 6577653,
          "text": "トウコンも切るのか?"
        },
        {
          "speechId": 669,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6577653,
          "sourceEndMs": 6579774,
          "text": "これトウコンも切るのか?"
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
