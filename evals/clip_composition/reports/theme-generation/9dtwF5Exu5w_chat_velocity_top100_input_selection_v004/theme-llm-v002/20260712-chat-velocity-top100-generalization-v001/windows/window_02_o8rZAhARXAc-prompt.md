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
    "windowId": "window_02_o8rZAhARXAc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "o8rZAhARXAc",
    "sourceStartMs": 872562,
    "sourceEndMs": 1109720
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
      "promptSegmentCount": 30,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 112,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 872562,
          "sourceEndMs": 876084,
          "text": "え、じゃあ粉落としってさリリカが考えたの?"
        },
        {
          "speechId": 113,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 876084,
          "sourceEndMs": 878566,
          "text": "あれリリカが考えた弾だったの?"
        },
        {
          "speechId": 114,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 878566,
          "sourceEndMs": 882228,
          "text": "すごくない?"
        },
        {
          "speechId": 115,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 882228,
          "sourceEndMs": 892815,
          "text": "え、待ってリリカみたいに考えらんなよなんて考えられないのあかんなよ助けて"
        },
        {
          "speechId": 119,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 961718,
          "sourceEndMs": 964320,
          "text": "どうやって作ったらいいんだろう?"
        },
        {
          "speechId": 120,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 964320,
          "sourceEndMs": 976009,
          "text": "分かんないよ開発する?"
        },
        {
          "speechId": 121,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 976009,
          "sourceEndMs": 989800,
          "text": "ほなみこちに聞くかみこちに聞いたって分かるわけないじゃん分かるわけない開発する新旧種が開発"
        },
        {
          "speechId": 122,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 990246,
          "sourceEndMs": 1001811,
          "text": "いきますフォーカが強いんじゃないのやっぱみんなフォーカが強いって言ってるよねみおしゃに聞く?"
        },
        {
          "speechId": 123,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1001811,
          "sourceEndMs": 1002672,
          "text": "誰か?"
        },
        {
          "speechId": 124,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1002672,
          "sourceEndMs": 1003332,
          "text": "みお先輩誰か?"
        },
        {
          "speechId": 125,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1003332,
          "sourceEndMs": 1003512,
          "text": "誰か?"
        },
        {
          "speechId": 126,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1003512,
          "sourceEndMs": 1005033,
          "text": "誰か?"
        },
        {
          "speechId": 127,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1005033,
          "sourceEndMs": 1013337,
          "text": "待ってディスコードでちょっと飛ばしてみよう誰かわかる人いませんか?"
        },
        {
          "speechId": 128,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1013337,
          "sourceEndMs": 1019860,
          "text": "ちょっと待ってえっとタレントアット"
        },
        {
          "speechId": 129,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1021154,
          "sourceEndMs": 1048380,
          "text": "タレントえっとすみません今パワープロやってるんですけどオリジナル九州っていうのを作ったことがあってわかる人っていらっしゃいますか全くわからず"
        },
        {
          "speechId": 130,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1057442,
          "sourceEndMs": 1059143,
          "text": "フォークかな?"
        },
        {
          "speechId": 131,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1059143,
          "sourceEndMs": 1060783,
          "text": "フォークかな?"
        },
        {
          "speechId": 132,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1060783,
          "sourceEndMs": 1063304,
          "text": "フォークなのかな?"
        },
        {
          "speechId": 133,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1063304,
          "sourceEndMs": 1066625,
          "text": "とりあえず誰かのリリカしか作ってなくね?"
        },
        {
          "speechId": 134,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1066625,
          "sourceEndMs": 1074728,
          "text": "フォーク系を選択してフォーク系?"
        },
        {
          "speechId": 135,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1074728,
          "sourceEndMs": 1076449,
          "text": "やばい!"
        },
        {
          "speechId": 136,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1076449,
          "sourceEndMs": 1078770,
          "text": "なにこれ!"
        },
        {
          "speechId": 137,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1078770,
          "sourceEndMs": 1079410,
          "text": "フォークか?"
        },
        {
          "speechId": 138,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1081082,
          "sourceEndMs": 1083804,
          "text": "フォークか?"
        },
        {
          "speechId": 139,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1083804,
          "sourceEndMs": 1087006,
          "text": "フォークからのフォーク?"
        },
        {
          "speechId": 140,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1087006,
          "sourceEndMs": 1092229,
          "text": "これフォークからのフォーク?"
        },
        {
          "speechId": 141,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1092229,
          "sourceEndMs": 1095091,
          "text": "粉落としの粉落としのパクる?"
        },
        {
          "speechId": 142,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1095091,
          "sourceEndMs": 1098593,
          "text": "粉落としでリリカがやってたのと全く同じの作ればいいんじゃない?"
        },
        {
          "speechId": 143,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1098593,
          "sourceEndMs": 1104637,
          "text": "パクんな全く同じの作ればいいんじゃないの?"
        },
        {
          "speechId": 144,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1104637,
          "sourceEndMs": 1109720,
          "text": "リリカの真似して作ろうフォークからのフォークで"
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
