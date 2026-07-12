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
    "windowId": "window_09_o8rZAhARXAc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "o8rZAhARXAc",
    "sourceStartMs": 4486111,
    "sourceEndMs": 4710742
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
      "promptSegmentCount": 29,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 400,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4486111,
          "sourceEndMs": 4487272,
          "text": "お、機材交換!"
        },
        {
          "speechId": 401,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4487272,
          "sourceEndMs": 4488574,
          "text": "ティ待って?"
        },
        {
          "speechId": 402,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4488574,
          "sourceEndMs": 4488894,
          "text": "ティ?"
        },
        {
          "speechId": 409,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4560918,
          "sourceEndMs": 4565341,
          "text": "しばき倒されたくなかったらいい加減にしろお前ラオラ?"
        },
        {
          "speechId": 410,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4565341,
          "sourceEndMs": 4565902,
          "text": "ごく普通?"
        },
        {
          "speechId": 411,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4565902,
          "sourceEndMs": 4566782,
          "text": "え?"
        },
        {
          "speechId": 412,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4566782,
          "sourceEndMs": 4570005,
          "text": "どうしよう?"
        },
        {
          "speechId": 413,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4570005,
          "sourceEndMs": 4572187,
          "text": "え、君たちラオラって変えるべき?"
        },
        {
          "speechId": 414,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4572187,
          "sourceEndMs": 4574869,
          "text": "変えないべき?"
        },
        {
          "speechId": 415,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4574869,
          "sourceEndMs": 4578431,
          "text": "気持ちいいどう思う?"
        },
        {
          "speechId": 416,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4578431,
          "sourceEndMs": 4582574,
          "text": "ねぇ気持ちいいあかん?"
        },
        {
          "speechId": 417,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4582574,
          "sourceEndMs": 4582915,
          "text": "ダメ?"
        },
        {
          "speechId": 418,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4582915,
          "sourceEndMs": 4584276,
          "text": "もったいない?"
        },
        {
          "speechId": 419,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4584276,
          "sourceEndMs": 4585877,
          "text": "ごく普通は残す?"
        },
        {
          "speechId": 420,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4585877,
          "sourceEndMs": 4589420,
          "text": "わ、わかったそうするか変えないでいいか"
        },
        {
          "speechId": 421,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4590066,
          "sourceEndMs": 4592167,
          "text": "気になっても仕方ないあるか?"
        },
        {
          "speechId": 422,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4592167,
          "sourceEndMs": 4597071,
          "text": "それは確かにあ、だ!"
        },
        {
          "speechId": 423,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4597071,
          "sourceEndMs": 4602755,
          "text": "いけいけないバイバイねえ、これ何がいらない?"
        },
        {
          "speechId": 424,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4602755,
          "sourceEndMs": 4603855,
          "text": "気持ち!"
        },
        {
          "speechId": 425,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4603855,
          "sourceEndMs": 4606677,
          "text": "これ何がいらなーい?"
        },
        {
          "speechId": 426,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4606677,
          "sourceEndMs": 4619066,
          "text": "占い師も使えねえな、いつみむらしばき倒すぞ、ほんまにえんとう、わかったえんとう、遠藤くんでいくわ遠藤くんで遠藤くんでいくうん"
        },
        {
          "speechId": 427,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4622026,
          "sourceEndMs": 4649940,
          "text": "おー1、待って26、27、28、29あ、もう無理だ青マスなかったインタビューはもうないんだエントー君で行ってさあ合宿だ監督、今日から合宿です頑張りましょうかーこーお、やめろスワとフル"
        },
        {
          "speechId": 428,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4651086,
          "sourceEndMs": 4662938,
          "text": "シャシャるなぁお前シャシャってくんななんでシャシャってきちゃったのどうしよう何がいいかなシオレンマリンが邪魔で見えない?"
        },
        {
          "speechId": 429,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4662938,
          "sourceEndMs": 4664620,
          "text": "マジそれじゃん失礼しました"
        },
        {
          "speechId": 430,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4665958,
          "sourceEndMs": 4677797,
          "text": "邪魔でしたどこにいたらいいかわかんねぇここにいよここにいとこ何がいいかなぁ"
        },
        {
          "speechId": 431,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4680822,
          "sourceEndMs": 4687906,
          "text": "スワにキャッチャーついたってな意味ないから走り込み消そう?"
        },
        {
          "speechId": 432,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4687906,
          "sourceEndMs": 4709200,
          "text": "確かにこれいらないかこのどうせついたってしょうがないだろみたいな時にまだこれからこいつらと甲子園行くから甲子園まだ行くからミート?"
        },
        {
          "speechId": 433,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4709200,
          "sourceEndMs": 4709900,
          "text": "ミートもいらないじゃん"
        },
        {
          "speechId": 434,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4710002,
          "sourceEndMs": 4710742,
          "text": "ミートにするか!"
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
