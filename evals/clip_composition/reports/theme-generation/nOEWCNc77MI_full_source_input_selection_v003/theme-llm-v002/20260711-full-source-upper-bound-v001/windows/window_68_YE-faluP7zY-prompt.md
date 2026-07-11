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
    "windowId": "window_68_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 11491834,
    "sourceEndMs": 11607854
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
          "speechId": 1712,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11491834,
          "sourceEndMs": 11518518,
          "text": "まあでもいい感じになってきてるのではないでしょうかいい綺麗になってるこれはね次回ねあの会見フレンズでコヨリと坂本が見たらば非常にびっくりする光景にびっくりびっくらぽんよこんなのなってるでしょうねロープなくなっちゃったのこれ作りますロープ葉っぱから何のために葉っぱがねそうそうそう何のための葉っぱなんですかそうでしょ"
        },
        {
          "speechId": 1713,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11520066,
          "sourceEndMs": 11524428,
          "text": "あ、ここベッドルームにしよっかな、ワンちゃんいい!"
        },
        {
          "speechId": 1714,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11524428,
          "sourceEndMs": 11525368,
          "text": "いい?"
        },
        {
          "speechId": 1715,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11525368,
          "sourceEndMs": 11526849,
          "text": "めっちゃいい!"
        },
        {
          "speechId": 1716,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11526849,
          "sourceEndMs": 11528309,
          "text": "ここ4つ置けるか?"
        },
        {
          "speechId": 1717,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11528309,
          "sourceEndMs": 11529650,
          "text": "この幅でしょ?"
        },
        {
          "speechId": 1718,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11529650,
          "sourceEndMs": 11532931,
          "text": "最高!"
        },
        {
          "speechId": 1719,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11532931,
          "sourceEndMs": 11549658,
          "text": "最高すぎいいでしょ、いいでしょ最高ここベッドルームねいや、いいなー終わりが見えないな、ちょっと閉めだけしてあとは水面下でこっそり進めとくわ、船長は"
        },
        {
          "speechId": 1720,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11551287,
          "sourceEndMs": 11552047,
          "text": "でも誘って?"
        },
        {
          "speechId": 1721,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11552047,
          "sourceEndMs": 11553908,
          "text": "本当?"
        },
        {
          "speechId": 1722,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11553908,
          "sourceEndMs": 11555869,
          "text": "付き合ってくれるの?"
        },
        {
          "speechId": 1723,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11555869,
          "sourceEndMs": 11565995,
          "text": "付き合いたいマリーンそれ告白だよもうでもマリーンはいろんな女いるからな気づいた?"
        },
        {
          "speechId": 1724,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11565995,
          "sourceEndMs": 11571979,
          "text": "だいぶ前から気づいてるけどねバレたか誰でもいいんでしょ?"
        },
        {
          "speechId": 1725,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11571979,
          "sourceEndMs": 11578423,
          "text": "そんなことないよ誰でもよくはない選んでんだちゃっかりちゃっかり選んでるよ"
        },
        {
          "speechId": 1726,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11580626,
          "sourceEndMs": 11593310,
          "text": "だから選んでんだね誰でもよくはないあ、そうでもコーネとならやっていける気がする、マリンはほんと?"
        },
        {
          "speechId": 1727,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11593310,
          "sourceEndMs": 11594530,
          "text": "じゃあ愛しのマリン?"
        },
        {
          "speechId": 1728,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11594530,
          "sourceEndMs": 11596111,
          "text": "なんか見つけたよ何?"
        },
        {
          "speechId": 1729,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11596111,
          "sourceEndMs": 11596691,
          "text": "どれ?"
        },
        {
          "speechId": 1730,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11596691,
          "sourceEndMs": 11596951,
          "text": "どこ?"
        },
        {
          "speechId": 1731,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11596951,
          "sourceEndMs": 11597911,
          "text": "見て、ちょっと遠いかな?"
        },
        {
          "speechId": 1732,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11597911,
          "sourceEndMs": 11600072,
          "text": "あれあっち見える?"
        },
        {
          "speechId": 1733,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11600072,
          "sourceEndMs": 11602873,
          "text": "あ、ほんとだね!"
        },
        {
          "speechId": 1734,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11602873,
          "sourceEndMs": 11603193,
          "text": "で?"
        },
        {
          "speechId": 1735,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11603193,
          "sourceEndMs": 11603793,
          "text": "行くの?"
        },
        {
          "speechId": 1736,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11603793,
          "sourceEndMs": 11604933,
          "text": "ちょっとコーネやめな!"
        },
        {
          "speechId": 1737,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11604933,
          "sourceEndMs": 11606794,
          "text": "行かない行かない行かない行かない!"
        },
        {
          "speechId": 1738,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11606794,
          "sourceEndMs": 11607854,
          "text": "ちょっと今葉っぱ…"
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
