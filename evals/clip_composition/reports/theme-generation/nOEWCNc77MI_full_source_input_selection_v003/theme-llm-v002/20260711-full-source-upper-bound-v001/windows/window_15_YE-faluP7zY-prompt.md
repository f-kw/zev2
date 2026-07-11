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
    "windowId": "window_15_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 2410728,
    "sourceEndMs": 2541381
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
      "promptSegmentCount": 27,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 346,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2410728,
          "sourceEndMs": 2414189,
          "text": "俺いや、猪きつそうだねどうやるの?"
        },
        {
          "speechId": 347,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2414189,
          "sourceEndMs": 2429652,
          "text": "絶対なでもさ、さっきと違って逃げていくんじゃなくて向かってくるわけだからさ確かになワンチャン当たりやすいかもね、エイム的にはワタメがBGMがフグ来てる、フグ来てるよ気をつけ、そっち殺されたからな、さっき"
        },
        {
          "speechId": 348,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2430194,
          "sourceEndMs": 2434695,
          "text": "オッケオッケオッケマジ気をつけてそいつのやばいからまだ来てるかこれ?"
        },
        {
          "speechId": 349,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2434695,
          "sourceEndMs": 2439917,
          "text": "タゲ外れたか?"
        },
        {
          "speechId": 350,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2439917,
          "sourceEndMs": 2449059,
          "text": "さっきそいつのなんか毒で死んだわあーこいつかーこれーこれは痛いねーいけ?"
        },
        {
          "speechId": 351,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2449059,
          "sourceEndMs": 2459662,
          "text": "回想ちょっと取っとったー鉱石欲しいなー鉱石ねオッケーに置かないなんといってもやっぱり今後はね鉱石の時代が来ますからー終わった"
        },
        {
          "speechId": 352,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2463416,
          "sourceEndMs": 2465738,
          "text": "鉱石、鉱石…あるに越したことはないよね?"
        },
        {
          "speechId": 353,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2465738,
          "sourceEndMs": 2469981,
          "text": "そうね、とりあえず取れるもん全部取るわオッケー?"
        },
        {
          "speechId": 354,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2469981,
          "sourceEndMs": 2471683,
          "text": "あれ、石はいらない?"
        },
        {
          "speechId": 355,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2471683,
          "sourceEndMs": 2477007,
          "text": "石は…まぁ…今めちゃめちゃあるからそんなにいらないかもしんないけど…ない!"
        },
        {
          "speechId": 356,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2477007,
          "sourceEndMs": 2478969,
          "text": "りょりょりょ…優先順位は低めかな?"
        },
        {
          "speechId": 357,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2478969,
          "sourceEndMs": 2479269,
          "text": "オッケーぴょん?"
        },
        {
          "speechId": 358,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2479269,
          "sourceEndMs": 2479630,
          "text": "ないなぁ…ぴょん?"
        },
        {
          "speechId": 359,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2479630,
          "sourceEndMs": 2485134,
          "text": "ないなぁ…ぴょん?"
        },
        {
          "speechId": 360,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2485134,
          "sourceEndMs": 2488337,
          "text": "ぴょん?"
        },
        {
          "speechId": 361,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2488337,
          "sourceEndMs": 2489398,
          "text": "酸素ボンベ欲しくなってきたな"
        },
        {
          "speechId": 362,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2490482,
          "sourceEndMs": 2492143,
          "text": "あげるよ?"
        },
        {
          "speechId": 363,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2492143,
          "sourceEndMs": 2519066,
          "text": "いや、大丈夫新しいやつがいかん作るわ、いずれ出世したらさすがやなお、お風呂はいらないってかあ、でも声ってか口つき立ってるもんね、これブチュチュってなんか、でもね、船長、コーナーだったらいいよ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死"
        },
        {
          "speechId": 364,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2521474,
          "sourceEndMs": 2523255,
          "text": "なんで死にかけてるの?"
        },
        {
          "speechId": 365,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2523255,
          "sourceEndMs": 2525615,
          "text": "なんで死にかけてんの?"
        },
        {
          "speechId": 366,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2525615,
          "sourceEndMs": 2530097,
          "text": "いや、水の中でさ、ゴンにさ、息できると思ってたらしくてさ。"
        },
        {
          "speechId": 367,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2530097,
          "sourceEndMs": 2531317,
          "text": "残念やね。"
        },
        {
          "speechId": 368,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2531317,
          "sourceEndMs": 2534198,
          "text": "3,3本目を手にしたことで調子に乗ってますね。"
        },
        {
          "speechId": 369,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2534198,
          "sourceEndMs": 2536639,
          "text": "そう、調子乗ってた今。"
        },
        {
          "speechId": 370,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2536639,
          "sourceEndMs": 2539200,
          "text": "でもね、金属の鉱石がね。"
        },
        {
          "speechId": 371,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2539200,
          "sourceEndMs": 2540381,
          "text": "あ、見つけた?"
        },
        {
          "speechId": 372,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2540381,
          "sourceEndMs": 2541381,
          "text": "8個。"
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
