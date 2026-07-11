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
    "windowId": "window_11_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 1804243,
    "sourceEndMs": 1889522
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
      "promptSegmentCount": 31,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 240,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1804243,
          "sourceEndMs": 1807086,
          "text": "サンキュー!"
        },
        {
          "speechId": 241,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1807086,
          "sourceEndMs": 1807786,
          "text": "よーこいろ!"
        },
        {
          "speechId": 242,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1807786,
          "sourceEndMs": 1809147,
          "text": "ありがとう!"
        },
        {
          "speechId": 243,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1809147,
          "sourceEndMs": 1817494,
          "text": "ちょっと、じゃあクジラ、クジラじゃないやサメもらうわクジラ?"
        },
        {
          "speechId": 244,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1817494,
          "sourceEndMs": 1819996,
          "text": "あ、オッケオッケオッケサメ!"
        },
        {
          "speechId": 245,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1819996,
          "sourceEndMs": 1821817,
          "text": "サメもらって葉っぱがね、あ、60枚集めたねえ、めっちゃ集めてる!"
        },
        {
          "speechId": 246,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1821817,
          "sourceEndMs": 1823419,
          "text": "葉っぱ60枚!"
        },
        {
          "speechId": 247,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1823419,
          "sourceEndMs": 1823439,
          "text": "?"
        },
        {
          "speechId": 248,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1823419,
          "sourceEndMs": 1823439,
          "text": "?"
        },
        {
          "speechId": 249,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1823439,
          "sourceEndMs": 1824459,
          "text": "60枚あるよ!"
        },
        {
          "speechId": 250,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1824459,
          "sourceEndMs": 1825120,
          "text": "葉っぱ大じゃん!"
        },
        {
          "speechId": 251,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1825120,
          "sourceEndMs": 1826201,
          "text": "やったね!"
        },
        {
          "speechId": 252,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1826201,
          "sourceEndMs": 1826481,
          "text": "やったね!"
        },
        {
          "speechId": 253,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1826481,
          "sourceEndMs": 1827061,
          "text": "やった!"
        },
        {
          "speechId": 254,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1827061,
          "sourceEndMs": 1827662,
          "text": "やった!"
        },
        {
          "speechId": 255,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1829721,
          "sourceEndMs": 1830000,
          "text": "どこにいるの"
        },
        {
          "speechId": 256,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1830618,
          "sourceEndMs": 1834199,
          "text": "入れるところがないなあ葉っぱ?"
        },
        {
          "speechId": 257,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1834199,
          "sourceEndMs": 1841020,
          "text": "うんあ、ここにあるわここに入れて優秀やなえ、これさ、いらなくない?"
        },
        {
          "speechId": 258,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1841020,
          "sourceEndMs": 1843381,
          "text": "種みたいなやつヤシの種いる?"
        },
        {
          "speechId": 259,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1843381,
          "sourceEndMs": 1846181,
          "text": "ヤシの種はまだいらんの?"
        },
        {
          "speechId": 260,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1846181,
          "sourceEndMs": 1858764,
          "text": "うん、そうだね栽培してヤシの木生やしてそしたら木材集めなくても来ればいけるようになるからもう一個ストレージ作ろうか、そしたらそうだね、作ろっかほうがいいよなちょっと待ってね、作るわあ、作る?"
        },
        {
          "speechId": 261,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1858764,
          "sourceEndMs": 1859504,
          "text": "役に立つ"
        },
        {
          "speechId": 262,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1861934,
          "sourceEndMs": 1864835,
          "text": "よく似たつなぁ今ではよく似たつぞぉ?"
        },
        {
          "speechId": 263,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1864835,
          "sourceEndMs": 1866456,
          "text": "立ってるよぉ?"
        },
        {
          "speechId": 264,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1866456,
          "sourceEndMs": 1870097,
          "text": "ストレージスクラップとロープOK?"
        },
        {
          "speechId": 265,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1870097,
          "sourceEndMs": 1876578,
          "text": "よし、日朝だし、殺戮してぇなぁあ、いいよ、行ってきていいよあ、一緒にいた方がいかないこれ?"
        },
        {
          "speechId": 266,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1876578,
          "sourceEndMs": 1881480,
          "text": "一緒に殺戮しようよ待つとストレージできるまで待つけどOK?"
        },
        {
          "speechId": 267,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1881480,
          "sourceEndMs": 1886201,
          "text": "殺戮したーいえっと、スクラップ、スクラップね?"
        },
        {
          "speechId": 268,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1886201,
          "sourceEndMs": 1886901,
          "text": "させ、させるか!"
        },
        {
          "speechId": 269,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1886901,
          "sourceEndMs": 1888122,
          "text": "させるか!"
        },
        {
          "speechId": 270,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1888122,
          "sourceEndMs": 1889522,
          "text": "おいで"
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
