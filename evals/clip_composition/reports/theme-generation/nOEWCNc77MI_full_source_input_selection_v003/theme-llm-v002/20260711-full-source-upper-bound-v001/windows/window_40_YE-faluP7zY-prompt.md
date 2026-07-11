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
    "windowId": "window_40_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 6792473,
    "sourceEndMs": 6975330
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
      "promptSegmentCount": 21,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 997,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6792473,
          "sourceEndMs": 6800778,
          "text": "はーいはーいはーいあ、待って何かあ、なんかあ、ヒロちゃんヒロちゃんナイスナイスナイスヒロちゃんナイス?"
        },
        {
          "speechId": 998,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6800778,
          "sourceEndMs": 6810000,
          "text": "じゃあちょっとここにでかいストレージ置いたことによってここから整理整頓を今からここから始めましょうOK言われたら今度やっとく"
        },
        {
          "speechId": 999,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6810022,
          "sourceEndMs": 6814025,
          "text": "え、じゃあねーどうしたらいいと思う?"
        },
        {
          "speechId": 1000,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6814025,
          "sourceEndMs": 6838782,
          "text": "え、待ってあれなんかあるよ、こうね、あそこほらほらほんとや飛び込んで、待ってわかった、向かうわそっちにこらよえっとこらねこらよえ、もうちょっとこっちかこらよでもさっきサメ殺したからワンチャン安定しかいね、まだあれかもね、来ないかもねワンチャン安定してる、安牌"
        },
        {
          "speechId": 1001,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6840222,
          "sourceEndMs": 6841343,
          "text": "チャンスタイムまであれ?"
        },
        {
          "speechId": 1002,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6841343,
          "sourceEndMs": 6870000,
          "text": "ちょっと見るわうーんとねあ、カゴ拾ったえぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇ"
        },
        {
          "speechId": 1003,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6870114,
          "sourceEndMs": 6881063,
          "text": "じわじわ送るよなオッケー何を拾ったかと言いますとあ、レシピとネジとあ、いいじゃんネジあ、でもしょうもないなそれぐらいか?"
        },
        {
          "speechId": 1004,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6881063,
          "sourceEndMs": 6883925,
          "text": "あ、それぐらいかまあまあまあ板20枚入ってたの?"
        },
        {
          "speechId": 1005,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6883925,
          "sourceEndMs": 6890751,
          "text": "あ、いいじゃんおいしいね助かるねおいしいおいしいあ、じゃあさどうしようか板さここに全部しまう?"
        },
        {
          "speechId": 1006,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6890751,
          "sourceEndMs": 6896756,
          "text": "あ、そうだなんか上からさなんか使う資材順みたいなあ、じゃあ一番上板にする?"
        },
        {
          "speechId": 1007,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6896756,
          "sourceEndMs": 6898637,
          "text": "そうやねん使う資材順にちょっと入れていくかオッケー"
        },
        {
          "speechId": 1008,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6900970,
          "sourceEndMs": 6919398,
          "text": "楽しくなってきたぞなってきたね整理整頓始まったなねーどうやって分けるのがいいかなちょっと君たちおすすめの分け方をねコメントで教えてください木材&ロープ次がプラ&スクラップだって木材&ロープはいで?"
        },
        {
          "speechId": 1009,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6919398,
          "sourceEndMs": 6921339,
          "text": "プラ&スクラップ?"
        },
        {
          "speechId": 1010,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6921339,
          "sourceEndMs": 6928882,
          "text": "そうでその下が鉱石鉱石系もろもろ終わったこれ分からすぎな"
        },
        {
          "speechId": 1011,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6930382,
          "sourceEndMs": 6946514,
          "text": "また箱増やすわじゃあもっとわかりやすくするためにありがとね寄れるのりょうじゃあやっぱこの階段際のデッドスペースをやっぱり活かすのがやはりこれ大人の女のやることだから大人の女だなそうでしょ?"
        },
        {
          "speechId": 1012,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6946514,
          "sourceEndMs": 6959784,
          "text": "さすがやわここはあえて斜めにするかそれとも素直にこうドドンといくか悩むないいじゃんおしゃれやなどっちがいいかな"
        },
        {
          "speechId": 1013,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6962083,
          "sourceEndMs": 6965825,
          "text": "楽しいこうかな?"
        },
        {
          "speechId": 1014,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6965825,
          "sourceEndMs": 6969707,
          "text": "こうな気がする何?"
        },
        {
          "speechId": 1015,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6969707,
          "sourceEndMs": 6971648,
          "text": "斜めのがいい?"
        },
        {
          "speechId": 1016,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6971648,
          "sourceEndMs": 6972829,
          "text": "どっちがいい?"
        },
        {
          "speechId": 1017,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6972829,
          "sourceEndMs": 6975330,
          "text": "お好みで君たちに聞いてるの?"
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
