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
    "windowId": "window_06_qdczJpv8RCc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "qdczJpv8RCc",
    "sourceStartMs": 963175,
    "sourceEndMs": 1079006
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
      "promptSegmentCount": 30,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 141,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 963175,
          "sourceEndMs": 966256,
          "text": "君とマリンの一騎打ちなの?"
        },
        {
          "speechId": 142,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 966256,
          "sourceEndMs": 984661,
          "text": "おっとっとまあまあまあまあ一旦落ち着いてあの初めてなんです今日これ今日初めてなんです初めてだから勝ちたいお願い早く出せよ"
        },
        {
          "speechId": 143,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 992626,
          "sourceEndMs": 995087,
          "text": "あ、さあ、めっちゃあるエース。"
        },
        {
          "speechId": 144,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 995087,
          "sourceEndMs": 998769,
          "text": "めっちゃある。"
        },
        {
          "speechId": 145,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 998769,
          "sourceEndMs": 1003031,
          "text": "って言って、本当に出す。"
        },
        {
          "speechId": 146,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1003031,
          "sourceEndMs": 1008754,
          "text": "これは引っかかると思う。"
        },
        {
          "speechId": 147,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1008754,
          "sourceEndMs": 1009535,
          "text": "これガチだ!"
        },
        {
          "speechId": 148,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1009535,
          "sourceEndMs": 1011035,
          "text": "これ!"
        },
        {
          "speechId": 149,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1011035,
          "sourceEndMs": 1013397,
          "text": "これは本当!"
        },
        {
          "speechId": 150,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1013397,
          "sourceEndMs": 1014877,
          "text": "ばーっかー!"
        },
        {
          "speechId": 151,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1014877,
          "sourceEndMs": 1016418,
          "text": "あーあーあー!"
        },
        {
          "speechId": 152,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1016418,
          "sourceEndMs": 1018879,
          "text": "まんまと可愛いマリンちゃんの!"
        },
        {
          "speechId": 153,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1018879,
          "sourceEndMs": 1019520,
          "text": "いーけ!"
        },
        {
          "speechId": 154,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1019520,
          "sourceEndMs": 1019920,
          "text": "いーけ!"
        },
        {
          "speechId": 155,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1020054,
          "sourceEndMs": 1021014,
          "text": "いーけ!"
        },
        {
          "speechId": 156,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1021014,
          "sourceEndMs": 1021914,
          "text": "いーけ!"
        },
        {
          "speechId": 157,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1021914,
          "sourceEndMs": 1023175,
          "text": "いけいけいけ!"
        },
        {
          "speechId": 158,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1023175,
          "sourceEndMs": 1024635,
          "text": "暴れても無駄ですよ!"
        },
        {
          "speechId": 159,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1024635,
          "sourceEndMs": 1030556,
          "text": "おーい悪運の強いやつだなぁ釣れたよ今の!"
        },
        {
          "speechId": 160,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1030556,
          "sourceEndMs": 1041138,
          "text": "ま、違った釣れたよ今のまで入れちゃったボイちゃんにま、最初は何でもいいじゃん最初は何出してもよくね?"
        },
        {
          "speechId": 161,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1041138,
          "sourceEndMs": 1044339,
          "text": "えぇ!"
        },
        {
          "speechId": 162,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1044339,
          "sourceEndMs": 1049540,
          "text": "?"
        },
        {
          "speechId": 163,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1044339,
          "sourceEndMs": 1049540,
          "text": "?"
        },
        {
          "speechId": 164,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1049540,
          "sourceEndMs": 1049700,
          "text": "これ"
        },
        {
          "speechId": 165,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1050130,
          "sourceEndMs": 1053452,
          "text": "これさ、今度は信じていいよ。"
        },
        {
          "speechId": 166,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1053452,
          "sourceEndMs": 1054853,
          "text": "さっきは確かに嘘ついた。"
        },
        {
          "speechId": 167,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1054853,
          "sourceEndMs": 1055773,
          "text": "今度は本当に信じていい。"
        },
        {
          "speechId": 168,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1055773,
          "sourceEndMs": 1067279,
          "text": "これで、ちゃんと…あ、あ、あ、あ、あ、ま、まいっか。"
        },
        {
          "speechId": 169,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1067279,
          "sourceEndMs": 1078506,
          "text": "え、これってさ、4枚しか…ね、あのさ、エースってさ、4枚しかないってことだよね。"
        },
        {
          "speechId": 170,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1078506,
          "sourceEndMs": 1079006,
          "text": "そうだよね。"
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
