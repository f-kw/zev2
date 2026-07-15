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
    "windowId": "window_03_qdczJpv8RCc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "qdczJpv8RCc",
    "sourceStartMs": 578333,
    "sourceEndMs": 778234
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
      "promptSegmentCount": 25,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 47,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 578333,
          "sourceEndMs": 598742,
          "text": "やばいもうないんだけどマリンのことだけは信じてほしいマリン嘘はつかない本当にこれは信じてほしいありがとうありがとうありがとうじゃあこれでいきます待ってね今選び方こうして"
        },
        {
          "speechId": 48,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 603564,
          "sourceEndMs": 604144,
          "text": "こっちの人が!"
        },
        {
          "speechId": 49,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 634763,
          "sourceEndMs": 635864,
          "text": "何震えてんの早く撃てよ!"
        },
        {
          "speechId": 50,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 635864,
          "sourceEndMs": 653676,
          "text": "あ、カードが勝てる嘘死んじゃったの?"
        },
        {
          "speechId": 51,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 653676,
          "sourceEndMs": 658799,
          "text": "これ死んじゃったの?"
        },
        {
          "speechId": 52,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 658799,
          "sourceEndMs": 659940,
          "text": "一発で死んじゃったの?"
        },
        {
          "speechId": 53,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 660226,
          "sourceEndMs": 671556,
          "text": "あ、これマリンの番、マリンの番ねじゃあ、じゃあこれにする、あ、ボイチャンにするの忘れたこれ出すわ、これ、これねあ、間違え、なんで?"
        },
        {
          "speechId": 54,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 671556,
          "sourceEndMs": 688570,
          "text": "まち、まちが、間違えてないいいよ、これ、これが出したかった間違えてないよ、間違えてないいや、さ、最初のうちはさ最初のうちはさ、絶対さみんな出すもんね"
        },
        {
          "speechId": 55,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 695365,
          "sourceEndMs": 697006,
          "text": "嘘ってこと?"
        },
        {
          "speechId": 56,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 697006,
          "sourceEndMs": 719920,
          "text": "え、嘘かも違う、できない罰だ罰目が合っちゃったほーらほらなんか自白してんじゃんもう首振ってさ首振ってたもんよ耐えた"
        },
        {
          "speechId": 57,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 720002,
          "sourceEndMs": 721723,
          "text": "耐えてんだよお前!"
        },
        {
          "speechId": 58,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 721723,
          "sourceEndMs": 723263,
          "text": "耐えるな!"
        },
        {
          "speechId": 59,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 723263,
          "sourceEndMs": 726005,
          "text": "耐えてんじゃねーよ!"
        },
        {
          "speechId": 60,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 726005,
          "sourceEndMs": 737049,
          "text": "おとなしくしんどけ!"
        },
        {
          "speechId": 61,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 737049,
          "sourceEndMs": 743432,
          "text": "早く出せよ!"
        },
        {
          "speechId": 62,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 743432,
          "sourceEndMs": 745273,
          "text": "最初は普通に出すくない?"
        },
        {
          "speechId": 63,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 745273,
          "sourceEndMs": 745513,
          "text": "これは"
        },
        {
          "speechId": 64,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 750246,
          "sourceEndMs": 750767,
          "text": "なんでよ!"
        },
        {
          "speechId": 65,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 750767,
          "sourceEndMs": 764840,
          "text": "なんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんで"
        },
        {
          "speechId": 66,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 766226,
          "sourceEndMs": 769048,
          "text": "よし運ゲーの勝者!"
        },
        {
          "speechId": 67,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 769048,
          "sourceEndMs": 771129,
          "text": "なめてんじゃないよ!"
        },
        {
          "speechId": 68,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 771129,
          "sourceEndMs": 772290,
          "text": "馬鹿が!"
        },
        {
          "speechId": 69,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 772290,
          "sourceEndMs": 775252,
          "text": "馬鹿!"
        },
        {
          "speechId": 70,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 775252,
          "sourceEndMs": 777814,
          "text": "マリンの故郷に勝てると思ってんの?"
        },
        {
          "speechId": 71,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 777814,
          "sourceEndMs": 778234,
          "text": "馬鹿野郎!"
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
