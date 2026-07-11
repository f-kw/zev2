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
    "windowId": "window_54_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 9070932,
    "sourceEndMs": 9179872
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
          "speechId": 1357,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9070932,
          "sourceEndMs": 9089612,
          "text": "でももう行くなよこうではいはいもう行きませんそっか葉っぱに変えちゃ…そっかロープに変えちゃえばいいのかでもあれだよね言うて葉っぱも使いはするから多少はとっておいたほうがいいねえーロープロープロープロープロープロープあ、ここで作ればいい"
        },
        {
          "speechId": 1358,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9094796,
          "sourceEndMs": 9117453,
          "text": "てんやそんにゃんそいにゃんそいにゃんてんやそんにゃんそいにゃんてんやそんにゃんそいにゃんそいにゃん歌ってる、ごきげんですごきげん中身、あ、これOKクラゲ食べられるのかな?"
        },
        {
          "speechId": 1359,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9117453,
          "sourceEndMs": 9118033,
          "text": "クラゲってあのなんかないっけ?"
        },
        {
          "speechId": 1360,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9118033,
          "sourceEndMs": 9118834,
          "text": "食べ物のクラゲ"
        },
        {
          "speechId": 1361,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9120194,
          "sourceEndMs": 9121875,
          "text": "クラゲは食べれるよね?"
        },
        {
          "speechId": 1362,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9121875,
          "sourceEndMs": 9124816,
          "text": "なんか、なんかあった気がするクラゲのなんか、おすい…おすい…すのものみたいなえ?"
        },
        {
          "speechId": 1363,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9124816,
          "sourceEndMs": 9124896,
          "text": "え?"
        },
        {
          "speechId": 1364,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9124896,
          "sourceEndMs": 9125156,
          "text": "あ?"
        },
        {
          "speechId": 1365,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9125156,
          "sourceEndMs": 9125816,
          "text": "なになになに?"
        },
        {
          "speechId": 1366,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9125816,
          "sourceEndMs": 9126997,
          "text": "イルカだー!"
        },
        {
          "speechId": 1367,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9126997,
          "sourceEndMs": 9130618,
          "text": "またイルカだー!"
        },
        {
          "speechId": 1368,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9130618,
          "sourceEndMs": 9130798,
          "text": "わー!"
        },
        {
          "speechId": 1369,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9130798,
          "sourceEndMs": 9133740,
          "text": "わー!"
        },
        {
          "speechId": 1370,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9133740,
          "sourceEndMs": 9141803,
          "text": "かわいい群れをなしているーほんとにすごいねーかわいいねー、イルカはーイルカの鳴き声できる?"
        },
        {
          "speechId": 1371,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9141803,
          "sourceEndMs": 9143043,
          "text": "え、イルカの鳴き声?"
        },
        {
          "speechId": 1372,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9143043,
          "sourceEndMs": 9147325,
          "text": "あ、でも、あのー、聞いたことあるよえ、やめる?"
        },
        {
          "speechId": 1373,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9147325,
          "sourceEndMs": 9148326,
          "text": "えいー!"
        },
        {
          "speechId": 1374,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9148326,
          "sourceEndMs": 9148606,
          "text": "みたいな"
        },
        {
          "speechId": 1375,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9150958,
          "sourceEndMs": 9151678,
          "text": "エゲツナイ!"
        },
        {
          "speechId": 1376,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9151678,
          "sourceEndMs": 9153239,
          "text": "エゲツナイな!"
        },
        {
          "speechId": 1377,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9153239,
          "sourceEndMs": 9155980,
          "text": "エゲツナイ?"
        },
        {
          "speechId": 1378,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9155980,
          "sourceEndMs": 9156421,
          "text": "クラゲ!"
        },
        {
          "speechId": 1379,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9156421,
          "sourceEndMs": 9159182,
          "text": "あ、クラゲじゃないかクラゲ?"
        },
        {
          "speechId": 1380,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9159182,
          "sourceEndMs": 9160082,
          "text": "クラゲ?"
        },
        {
          "speechId": 1381,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9160082,
          "sourceEndMs": 9161443,
          "text": "イルカ?"
        },
        {
          "speechId": 1382,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9161443,
          "sourceEndMs": 9161943,
          "text": "エゲツナイ?"
        },
        {
          "speechId": 1383,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9161943,
          "sourceEndMs": 9167006,
          "text": "イルカエゲツナイな聞こえなんだなえ、どんな感じ?"
        },
        {
          "speechId": 1384,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9167006,
          "sourceEndMs": 9178691,
          "text": "やってイルカでしょ?"
        },
        {
          "speechId": 1385,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9178691,
          "sourceEndMs": 9179052,
          "text": "えぇ!"
        },
        {
          "speechId": 1386,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9179052,
          "sourceEndMs": 9179512,
          "text": "そんなんかなぁ!"
        },
        {
          "speechId": 1387,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9179512,
          "sourceEndMs": 9179872,
          "text": "せいちゃん違うと思う"
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
