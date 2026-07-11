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
    "windowId": "window_46_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 7658833,
    "sourceEndMs": 7673981
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
      "promptSegmentCount": 37,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 1154,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7658833,
          "sourceEndMs": 7660254,
          "text": "よし!"
        },
        {
          "speechId": 1155,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7660254,
          "sourceEndMs": 7660454,
          "text": "よし!"
        },
        {
          "speechId": 1156,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7660454,
          "sourceEndMs": 7660694,
          "text": "よし!"
        },
        {
          "speechId": 1157,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7660694,
          "sourceEndMs": 7660814,
          "text": "よし!"
        },
        {
          "speechId": 1158,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7660814,
          "sourceEndMs": 7661074,
          "text": "よし!"
        },
        {
          "speechId": 1159,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7661074,
          "sourceEndMs": 7661294,
          "text": "よし!"
        },
        {
          "speechId": 1160,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7661294,
          "sourceEndMs": 7661474,
          "text": "よし!"
        },
        {
          "speechId": 1161,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7661474,
          "sourceEndMs": 7661814,
          "text": "よし!"
        },
        {
          "speechId": 1162,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7661814,
          "sourceEndMs": 7661934,
          "text": "よし!"
        },
        {
          "speechId": 1163,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7661934,
          "sourceEndMs": 7661994,
          "text": "よし!"
        },
        {
          "speechId": 1164,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7661994,
          "sourceEndMs": 7662114,
          "text": "よし!"
        },
        {
          "speechId": 1165,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7662114,
          "sourceEndMs": 7662335,
          "text": "よし!"
        },
        {
          "speechId": 1166,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7662335,
          "sourceEndMs": 7662535,
          "text": "よし!"
        },
        {
          "speechId": 1167,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7662535,
          "sourceEndMs": 7663975,
          "text": "よし!"
        },
        {
          "speechId": 1168,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7663975,
          "sourceEndMs": 7664176,
          "text": "よし!"
        },
        {
          "speechId": 1169,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7664176,
          "sourceEndMs": 7664476,
          "text": "よし!"
        },
        {
          "speechId": 1170,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7664476,
          "sourceEndMs": 7664536,
          "text": "よし!"
        },
        {
          "speechId": 1171,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7664536,
          "sourceEndMs": 7664836,
          "text": "よし!"
        },
        {
          "speechId": 1172,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7664836,
          "sourceEndMs": 7664916,
          "text": "よし!"
        },
        {
          "speechId": 1173,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7664916,
          "sourceEndMs": 7665156,
          "text": "よし!"
        },
        {
          "speechId": 1174,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7665156,
          "sourceEndMs": 7665496,
          "text": "よし!"
        },
        {
          "speechId": 1175,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7665496,
          "sourceEndMs": 7665596,
          "text": "よし!"
        },
        {
          "speechId": 1176,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7665596,
          "sourceEndMs": 7666617,
          "text": "よし!"
        },
        {
          "speechId": 1177,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7666617,
          "sourceEndMs": 7666677,
          "text": "よし!"
        },
        {
          "speechId": 1178,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7666677,
          "sourceEndMs": 7667777,
          "text": "よし!"
        },
        {
          "speechId": 1179,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7667777,
          "sourceEndMs": 7667838,
          "text": "よし!"
        },
        {
          "speechId": 1180,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7667838,
          "sourceEndMs": 7667898,
          "text": "よし!"
        },
        {
          "speechId": 1181,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7667898,
          "sourceEndMs": 7667958,
          "text": "よし!"
        },
        {
          "speechId": 1182,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7667958,
          "sourceEndMs": 7668038,
          "text": "よし!"
        },
        {
          "speechId": 1183,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7668038,
          "sourceEndMs": 7668438,
          "text": "よし!"
        },
        {
          "speechId": 1184,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7668438,
          "sourceEndMs": 7668818,
          "text": "よし!"
        },
        {
          "speechId": 1185,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7668818,
          "sourceEndMs": 7669058,
          "text": "よし!"
        },
        {
          "speechId": 1186,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7669058,
          "sourceEndMs": 7669899,
          "text": "よし!"
        },
        {
          "speechId": 1187,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7669899,
          "sourceEndMs": 7672500,
          "text": "よし!"
        },
        {
          "speechId": 1188,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7672500,
          "sourceEndMs": 7673861,
          "text": "よし!"
        },
        {
          "speechId": 1189,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7673861,
          "sourceEndMs": 7673921,
          "text": "よし!"
        },
        {
          "speechId": 1190,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7673921,
          "sourceEndMs": 7673981,
          "text": "よし!"
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
