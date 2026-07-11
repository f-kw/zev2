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
    "windowId": "window_61_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 10273031,
    "sourceEndMs": 10480910
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
      "promptSegmentCount": 22,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 1541,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10273031,
          "sourceEndMs": 10290000,
          "text": "うそっぷ、そういうことではないだろあ、そういうことではなかったないだろなほねええーと、これでこれさ、食材のとこさ、焼いてから入れて"
        },
        {
          "speechId": 1542,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10291094,
          "sourceEndMs": 10291995,
          "text": "どっちがいい?"
        },
        {
          "speechId": 1543,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10291995,
          "sourceEndMs": 10320000,
          "text": "どっちでもいいよ焼けるならここで焼いここにさ、グリル簡素なやつ置いてあるからあ、分かった焼けるなら焼いちゃってちょっと焼けないけど邪魔で入れときたいなら一旦入れてもらってもそうな、あんま考えなくていいかいいよとりあえず焼こうかなあ、落ちてしもたけど上がる上がる上がるファイアーフラッシュこれを生のビール"
        },
        {
          "speechId": 1544,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10320020,
          "sourceEndMs": 10343898,
          "text": "釘とかいらないけどなーでもなー釘は備品じゃないね釘は備品じゃない組み分けを変えようスリザーリン弓も入れたいなこれもこういうこういうあ、それ君たちEに売ってんの?"
        },
        {
          "speechId": 1545,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10343898,
          "sourceEndMs": 10349282,
          "text": "それコーネにも売ってるあのーあ、コーネに売ってるなんだろうこれ水筒とかこれ作ったものみたいなやつ?"
        },
        {
          "speechId": 1546,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10355002,
          "sourceEndMs": 10365672,
          "text": "あの釘とか、釘とかさあるじゃん、釘とか蝶津貝とかは工具系として新たな木装作らせてもらうあ、工具系いいねわかる?"
        },
        {
          "speechId": 1547,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10365672,
          "sourceEndMs": 10367053,
          "text": "いい意味わかる?"
        },
        {
          "speechId": 1548,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10367053,
          "sourceEndMs": 10368974,
          "text": "伝わってきたわわかるわかるオッケー?"
        },
        {
          "speechId": 1549,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10368974,
          "sourceEndMs": 10374699,
          "text": "じゃあこれ工具系入れにしようオッケーオッケーいいじゃんいいじゃんあ、そう!"
        },
        {
          "speechId": 1550,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10374699,
          "sourceEndMs": 10374840,
          "text": "消耗品!"
        },
        {
          "speechId": 1551,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10374840,
          "sourceEndMs": 10376541,
          "text": "君たちそれだよ!"
        },
        {
          "speechId": 1552,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10376541,
          "sourceEndMs": 10379904,
          "text": "消耗品ですこうね、消耗品、ふーん"
        },
        {
          "speechId": 1553,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10380074,
          "sourceEndMs": 10409824,
          "text": "消耗品で終わったこれで消耗品入れねでここに釘とか入れますはーいここでは中身を見て判断してくださいはい中身見ればねこっちのもんよ見れば分かるもんねだよこれね結構釣竿って早く壊れちゃうんだね結構早いよねこうなってくるとここのストレージめちゃめちゃ余ってるからまぁなんかノリで適当にしまいたい時用に終わったよし完璧だな"
        },
        {
          "speechId": 1554,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10411142,
          "sourceEndMs": 10422286,
          "text": "え、なんか超スッキリするわマジでスッキリしてる、言っとくけどめっちゃ綺麗になってるからね、今いいやん、できる女やんわかる?"
        },
        {
          "speechId": 1555,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10422286,
          "sourceEndMs": 10436991,
          "text": "2階も作ってくれたし整理整頓もできてラジオ外しちゃったから静かになるけど寂しがらないよねえ、待ってよ、二人のこのトーク力でカバーよえ、マジ?"
        },
        {
          "speechId": 1556,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10436991,
          "sourceEndMs": 10439932,
          "text": "今船長さマジ船長抱えてるわ、ラジオ"
        },
        {
          "speechId": 1557,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10440054,
          "sourceEndMs": 10442255,
          "text": "完全にこれ嘘?"
        },
        {
          "speechId": 1558,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10442255,
          "sourceEndMs": 10462969,
          "text": "ヒップホップになっちゃったよリリーコングやクリアする時のリリーコングやそれBGMが流れてるからねこれね今消えてる船長のところだとBGMがあえて"
        },
        {
          "speechId": 1559,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10470482,
          "sourceEndMs": 10475085,
          "text": "これドア式にしてこうね、どうかなこういうさチラ見せスタイル後ろ見てーあ、いいじゃん!"
        },
        {
          "speechId": 1560,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10475085,
          "sourceEndMs": 10476927,
          "text": "上めっちゃいいじゃん!"
        },
        {
          "speechId": 1561,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10476927,
          "sourceEndMs": 10480870,
          "text": "こんにちはあ、壊れちゃった!"
        },
        {
          "speechId": 1562,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10480870,
          "sourceEndMs": 10480910,
          "text": "斧!"
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
