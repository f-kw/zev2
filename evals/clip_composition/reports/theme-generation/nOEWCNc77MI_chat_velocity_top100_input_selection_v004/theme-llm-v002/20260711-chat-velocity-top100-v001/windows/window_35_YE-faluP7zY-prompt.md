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
    "windowId": "window_35_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 11098463,
    "sourceEndMs": 11478929
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
          "speechId": 1652,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11098463,
          "sourceEndMs": 11099044,
          "text": "無理なの?"
        },
        {
          "speechId": 1653,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11099044,
          "sourceEndMs": 11099304,
          "text": "それは"
        },
        {
          "speechId": 1676,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11220314,
          "sourceEndMs": 11224838,
          "text": "椅子ってさぁ、あってもなくてもさぁでもローテーブルなんでしょ?"
        },
        {
          "speechId": 1677,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11224838,
          "sourceEndMs": 11226559,
          "text": "あ、いいじゃん!"
        },
        {
          "speechId": 1678,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11226559,
          "sourceEndMs": 11228121,
          "text": "あ、いい?"
        },
        {
          "speechId": 1679,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11228121,
          "sourceEndMs": 11229081,
          "text": "めっちゃいいじゃん!"
        },
        {
          "speechId": 1680,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11229081,
          "sourceEndMs": 11229682,
          "text": "あ、めっちゃいい?"
        },
        {
          "speechId": 1681,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11229682,
          "sourceEndMs": 11235026,
          "text": "え、ロ、あ、これローテーブルじゃないやつ?"
        },
        {
          "speechId": 1682,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11235026,
          "sourceEndMs": 11241071,
          "text": "これは、これはローテーブルじゃないやつローテーブルも見てみたかったけどね見てみる?"
        },
        {
          "speechId": 1683,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11241071,
          "sourceEndMs": 11245835,
          "text": "おくねじゃあ見てみていい?"
        },
        {
          "speechId": 1684,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11245835,
          "sourceEndMs": 11248698,
          "text": "これ、でも可愛いよなぁ、これ可愛いよ"
        },
        {
          "speechId": 1685,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11251114,
          "sourceEndMs": 11271141,
          "text": "デザインはかわいいよワッフルみたいじゃん、ワッフルね、かわいいんだけどな確かにかわいいな、どっかに飾ったらかわいい、普通にかわいいよそれかわいいねうんでもやっぱ食卓囲むときこの高さだなクロスはいいんだけどないいんじゃない?"
        },
        {
          "speechId": 1686,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11271141,
          "sourceEndMs": 11280000,
          "text": "でも地面に座ってこう、星座しながら食べるのもツーでしょわびさびわびさびですかわびさびだと思うけど"
        },
        {
          "speechId": 1697,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11400666,
          "sourceEndMs": 11402486,
          "text": "君たち?"
        },
        {
          "speechId": 1698,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11402486,
          "sourceEndMs": 11402907,
          "text": "君たち?"
        },
        {
          "speechId": 1699,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11402907,
          "sourceEndMs": 11403687,
          "text": "お前たち?"
        },
        {
          "speechId": 1700,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11403687,
          "sourceEndMs": 11404767,
          "text": "お前たち?"
        },
        {
          "speechId": 1701,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11404767,
          "sourceEndMs": 11408048,
          "text": "お前たちじゃないよ君たちね君たち?"
        },
        {
          "speechId": 1702,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11408048,
          "sourceEndMs": 11408568,
          "text": "貴様ら?"
        },
        {
          "speechId": 1703,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11408568,
          "sourceEndMs": 11418930,
          "text": "やばいいや本当いいねマリリンはいい女や何急に何急にどうしたの?"
        },
        {
          "speechId": 1704,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11418930,
          "sourceEndMs": 11427031,
          "text": "本当にいい女だと思うからさ思い出したかのようにさ一味代表一味なの?"
        },
        {
          "speechId": 1705,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11427031,
          "sourceEndMs": 11429872,
          "text": "コンデ先輩は一味代表の言葉一味だと思うけどね"
        },
        {
          "speechId": 1706,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11431250,
          "sourceEndMs": 11432250,
          "text": "そんなに好きなの?"
        },
        {
          "speechId": 1707,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11432250,
          "sourceEndMs": 11434852,
          "text": "私のことそんなに好きなんだ?"
        },
        {
          "speechId": 1708,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11434852,
          "sourceEndMs": 11455582,
          "text": "結構喋ってる方だと思うけどでも確かにやめどころがないねそろそろさ切り上げるムードは出していくかそうかじゃあちょっと感想でも言っとく?"
        },
        {
          "speechId": 1709,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11455582,
          "sourceEndMs": 11459924,
          "text": "確かに感想今日はねちょっと中途半端に"
        },
        {
          "speechId": 1710,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11461581,
          "sourceEndMs": 11478929,
          "text": "見せかけて言うてこれね、かなりね出来てきてるってあ、なんだこれあ、そっかベッドが邪魔なんかこう、ね、そうこう感想言ってる間にもね着々とこう着工しておりほらこんなにもね出来上がってきているわけです終わっちゃうの?"
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
