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
    "windowId": "window_01_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 12000,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 60482,
    "sourceEndMs": 267270
  },
  "sources": [
    {
      "sourceVideoId": "YE-faluP7zY",
      "sourceUrl": "https://www.youtube.com/watch?v=YE-faluP7zY",
      "sourceTitle": "【Raft】ころね、キミさえいればこの海の果てまでだって──【ホロライブ/宝鐘マリン】",
      "transcriptKind": "local_stt",
      "language": "ja-JP",
      "durationSec": 1500,
      "rawSegmentCount": 7395,
      "promptSegmentCount": 19,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 1,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 60482,
          "sourceEndMs": 62324,
          "text": "このマリンを本物の海賊に"
        },
        {
          "speechId": 2,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 150610,
          "sourceEndMs": 153112,
          "text": "ってなんだ?"
        },
        {
          "speechId": 3,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 153112,
          "sourceEndMs": 163720,
          "text": "今日は二人で作業するんですけれどもねそうなんですけどもねちょっと待ってコーネそこいたら邪魔じゃない?"
        },
        {
          "speechId": 4,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 163720,
          "sourceEndMs": 167062,
          "text": "コーネもっと下げていい?"
        },
        {
          "speechId": 5,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 167062,
          "sourceEndMs": 178451,
          "text": "確かに邪魔だなコーネバカ野郎コーネのいい位置を探すかちょっとどうしようかな天の声的な感じで天の声?"
        },
        {
          "speechId": 6,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 178451,
          "sourceEndMs": 178571,
          "text": "上?"
        },
        {
          "speechId": 7,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 180554,
          "sourceEndMs": 183835,
          "text": "これ弾だろうがよ!"
        },
        {
          "speechId": 8,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 183835,
          "sourceEndMs": 184495,
          "text": "おい!"
        },
        {
          "speechId": 9,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 184495,
          "sourceEndMs": 185216,
          "text": "ヒルなんですよ!"
        },
        {
          "speechId": 10,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 185216,
          "sourceEndMs": 188257,
          "text": "やめろよ!"
        },
        {
          "speechId": 11,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 188257,
          "sourceEndMs": 190257,
          "text": "ヒルなんですどうしよう?"
        },
        {
          "speechId": 12,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 190257,
          "sourceEndMs": 191938,
          "text": "どこに?"
        },
        {
          "speechId": 13,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 191938,
          "sourceEndMs": 193198,
          "text": "まず、あれか?"
        },
        {
          "speechId": 14,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 193198,
          "sourceEndMs": 193778,
          "text": "音声?"
        },
        {
          "speechId": 15,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 193778,
          "sourceEndMs": 195199,
          "text": "おい!"
        },
        {
          "speechId": 16,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 195199,
          "sourceEndMs": 198040,
          "text": "帽子みたいな感じであ、かわいいかも!"
        },
        {
          "speechId": 17,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 198040,
          "sourceEndMs": 209884,
          "text": "かわいくないだろなんかでもサザエさんのエンディングみたいオープニングのそれねサザエさんみたいな感じで弾がさ、こう、みかんから出てくるやつ"
        },
        {
          "speechId": 18,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 210802,
          "sourceEndMs": 236189,
          "text": "ねってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってって"
        },
        {
          "speechId": 19,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 240202,
          "sourceEndMs": 267270,
          "text": "コロナが上がっちゃったちょっと諦めようかなちょっとちょっと難易度高めこれにさなんか文句言われたらちょっと考えような確かに文句ないと思うけどね当然ねこっち向くわはいということでねこっち向くわとか言っちゃったちょっとコーネがね今日ねずこスタイルなんでどうもどうもねずこはそんなこと言わないうんうんうんうん"
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
