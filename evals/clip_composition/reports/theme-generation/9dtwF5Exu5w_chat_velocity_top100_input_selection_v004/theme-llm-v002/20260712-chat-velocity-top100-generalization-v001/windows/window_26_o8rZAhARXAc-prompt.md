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
    "windowId": "window_26_o8rZAhARXAc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "o8rZAhARXAc",
    "sourceStartMs": 10848424,
    "sourceEndMs": 11218614
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
      "promptSegmentCount": 26,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 1244,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10848424,
          "sourceEndMs": 10854928,
          "text": "スクイズ2も怖いだろうがスクイズ2だって怖いだろ怖くねーの?"
        },
        {
          "speechId": 1245,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10854928,
          "sourceEndMs": 10855268,
          "text": "え?"
        },
        {
          "speechId": 1246,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10855268,
          "sourceEndMs": 10856869,
          "text": "怖くねーのこれ?"
        },
        {
          "speechId": 1247,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10856869,
          "sourceEndMs": 10857950,
          "text": "2怖くねーの?"
        },
        {
          "speechId": 1248,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10874134,
          "sourceEndMs": 10881004,
          "text": "クイズでバント職人だからいける?"
        },
        {
          "speechId": 1249,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10881004,
          "sourceEndMs": 10882366,
          "text": "バント職人に賭けろ?"
        },
        {
          "speechId": 1250,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10891770,
          "sourceEndMs": 10899476,
          "text": "分かったバント職人に!"
        },
        {
          "speechId": 1251,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10899476,
          "sourceEndMs": 10901057,
          "text": "2はダメ?"
        },
        {
          "speechId": 1252,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10901057,
          "sourceEndMs": 10917950,
          "text": "分かんない…分かんないっぴ…分かんないっぴ!"
        },
        {
          "speechId": 1253,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10927714,
          "sourceEndMs": 10928062,
          "text": "マジで?"
        },
        {
          "speechId": 1254,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10957266,
          "sourceEndMs": 10958769,
          "text": "やめろいいわまずいはい"
        },
        {
          "speechId": 1255,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10980390,
          "sourceEndMs": 10981311,
          "text": "犠牲フライしてやばい!"
        },
        {
          "speechId": 1256,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10981311,
          "sourceEndMs": 10985234,
          "text": "2ストライクや!"
        },
        {
          "speechId": 1257,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10985234,
          "sourceEndMs": 10986114,
          "text": "になったらスクイズ?"
        },
        {
          "speechId": 1258,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10986114,
          "sourceEndMs": 10987796,
          "text": "か?"
        },
        {
          "speechId": 1259,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10987796,
          "sourceEndMs": 11005829,
          "text": "うん分かった分かったストライク"
        },
        {
          "speechId": 1260,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11010002,
          "sourceEndMs": 11034742,
          "text": "ああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああ"
        },
        {
          "speechId": 1261,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11083154,
          "sourceEndMs": 11083575,
          "text": "涙出た"
        },
        {
          "speechId": 1262,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11100566,
          "sourceEndMs": 11106251,
          "text": "辛かった本当にもう嫌だやった!"
        },
        {
          "speechId": 1263,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11106251,
          "sourceEndMs": 11106471,
          "text": "勝ちましたね!"
        },
        {
          "speechId": 1264,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11106471,
          "sourceEndMs": 11121986,
          "text": "はいふぶちゃん何も上がってないのかー"
        },
        {
          "speechId": 1265,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11140562,
          "sourceEndMs": 11142104,
          "text": "この試合すごい活躍だったね!"
        },
        {
          "speechId": 1266,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11142104,
          "sourceEndMs": 11142625,
          "text": "これからも頑張ってね!"
        },
        {
          "speechId": 1267,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11142625,
          "sourceEndMs": 11158005,
          "text": "いいね、いいね、いいね分かったら特訓ある今日はここまでです"
        },
        {
          "speechId": 1268,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11180811,
          "sourceEndMs": 11189520,
          "text": "もうつらいんだよこれでいいかな?"
        },
        {
          "speechId": 1269,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11199718,
          "sourceEndMs": 11218614,
          "text": "動いた上がった上がった総合で総合3で上がった総合3でみんなの今効率上がってんのこれイヤン"
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
