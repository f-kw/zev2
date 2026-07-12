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
    "windowId": "window_24_o8rZAhARXAc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "o8rZAhARXAc",
    "sourceStartMs": 10491099,
    "sourceEndMs": 10738500
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
      "promptSegmentCount": 32,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 1178,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10491099,
          "sourceEndMs": 10491219,
          "text": "あーナイス!"
        },
        {
          "speechId": 1179,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10491219,
          "sourceEndMs": 10492820,
          "text": "ナイス天野くん!"
        },
        {
          "speechId": 1180,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10492820,
          "sourceEndMs": 10495322,
          "text": "あーナイス!"
        },
        {
          "speechId": 1181,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10495322,
          "sourceEndMs": 10495763,
          "text": "ナイス天野くん!"
        },
        {
          "speechId": 1182,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10495763,
          "sourceEndMs": 10495923,
          "text": "あーナイス!"
        },
        {
          "speechId": 1183,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10495923,
          "sourceEndMs": 10496203,
          "text": "ナイス天野くん!"
        },
        {
          "speechId": 1184,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10496203,
          "sourceEndMs": 10496423,
          "text": "あーナイス!"
        },
        {
          "speechId": 1185,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10496423,
          "sourceEndMs": 10498605,
          "text": "ナイス天野くん!"
        },
        {
          "speechId": 1186,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10498605,
          "sourceEndMs": 10498865,
          "text": "あーナイス!"
        },
        {
          "speechId": 1187,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10498865,
          "sourceEndMs": 10499225,
          "text": "ナイス天野くん!"
        },
        {
          "speechId": 1188,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10499225,
          "sourceEndMs": 10499366,
          "text": "あーナ"
        },
        {
          "speechId": 1189,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10503922,
          "sourceEndMs": 10529860,
          "text": "肩DのクイックCそして内は投類C総力Cさすがに投類かさすがに投類なのかここはやるべきだよね投類しないとクイックCはちょっといいけど危ない"
        },
        {
          "speechId": 1190,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10532138,
          "sourceEndMs": 10547007,
          "text": "CCだとキツイかうーん微妙かーリスクリスクは怖いよねー同類版とスクイーズできたら熱い?"
        },
        {
          "speechId": 1191,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10547007,
          "sourceEndMs": 10558394,
          "text": "失敗したらヤバいよなーうん失敗したらヤバい"
        },
        {
          "speechId": 1192,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10564926,
          "sourceEndMs": 10567828,
          "text": "リターンの方がでかい?"
        },
        {
          "speechId": 1193,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10567828,
          "sourceEndMs": 10568568,
          "text": "リスク!"
        },
        {
          "speechId": 1194,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10568568,
          "sourceEndMs": 10569348,
          "text": "リターン!"
        },
        {
          "speechId": 1195,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10569348,
          "sourceEndMs": 10570089,
          "text": "リスク!"
        },
        {
          "speechId": 1196,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10570089,
          "sourceEndMs": 10572750,
          "text": "リターン!"
        },
        {
          "speechId": 1197,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10572750,
          "sourceEndMs": 10587579,
          "text": "アヴァの普通に撃ってくれるなら普通に転がしたらで、これでゲッツーだったらどうしようトールイできたらほぼ勝ち?"
        },
        {
          "speechId": 1198,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10587579,
          "sourceEndMs": 10589220,
          "text": "待って、こいつってさ早い?"
        },
        {
          "speechId": 1199,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10589220,
          "sourceEndMs": 10589560,
          "text": "142キロ"
        },
        {
          "speechId": 1200,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10590002,
          "sourceEndMs": 10605131,
          "text": "142キルかーキチいか?"
        },
        {
          "speechId": 1201,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10605131,
          "sourceEndMs": 10605491,
          "text": "キチいか?"
        },
        {
          "speechId": 1202,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10605491,
          "sourceEndMs": 10606131,
          "text": "リスクを犯さないと勝てない?"
        },
        {
          "speechId": 1203,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10606131,
          "sourceEndMs": 10618318,
          "text": "送りバント?"
        },
        {
          "speechId": 1204,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10628796,
          "sourceEndMs": 10629597,
          "text": "ああああああ"
        },
        {
          "speechId": 1205,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10680294,
          "sourceEndMs": 10687940,
          "text": "しかもセーフだー!"
        },
        {
          "speechId": 1206,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10721215,
          "sourceEndMs": 10725236,
          "text": "スクイーズ2なんですけどスクイーズ2なんですけど君たちこれ何?"
        },
        {
          "speechId": 1207,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10725236,
          "sourceEndMs": 10733158,
          "text": "スクイーズ2ですけどデンデー?"
        },
        {
          "speechId": 1208,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10733158,
          "sourceEndMs": 10736439,
          "text": "デンデー?"
        },
        {
          "speechId": 1209,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10736439,
          "sourceEndMs": 10738500,
          "text": "デンデー何入れる?"
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
