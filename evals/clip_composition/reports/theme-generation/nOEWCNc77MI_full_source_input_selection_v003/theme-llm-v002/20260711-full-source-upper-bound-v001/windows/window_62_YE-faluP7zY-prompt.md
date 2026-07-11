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
    "windowId": "window_62_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 10480910,
    "sourceEndMs": 10666579
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
          "speechId": 1563,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10480910,
          "sourceEndMs": 10499844,
          "text": "待って待って、斧壊れたああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああ"
        },
        {
          "speechId": 1564,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10500130,
          "sourceEndMs": 10529171,
          "text": "こっちこっち作っとくわありがとうじゃげんなよマジでクソがよやられたねまんまと木の門やられたわここ出入りできた方が便利だないやいいななんかいいなどうしよううちら一生やってるのかなもしかしてでもさ"
        },
        {
          "speechId": 1565,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10539459,
          "sourceEndMs": 10557783,
          "text": "回収ネットあれつけれないじゃん釘いただいちゃって回収ネット作ってなんでここにカーテンつけちゃったんだろうちょっとカーテン作ったの?"
        },
        {
          "speechId": 1566,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10557783,
          "sourceEndMs": 10559944,
          "text": "何も考えずに変なとこにカーテンつけちゃったまぁいっか見たい見たいどこ?"
        },
        {
          "speechId": 1567,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10561041,
          "sourceEndMs": 10563042,
          "text": "え、これ閉まるの?"
        },
        {
          "speechId": 1568,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10563042,
          "sourceEndMs": 10564203,
          "text": "プレイ閉まるのかな?"
        },
        {
          "speechId": 1569,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10564203,
          "sourceEndMs": 10564823,
          "text": "え、やってみ?"
        },
        {
          "speechId": 1570,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10564823,
          "sourceEndMs": 10568045,
          "text": "やってみ?"
        },
        {
          "speechId": 1571,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10568045,
          "sourceEndMs": 10589758,
          "text": "え、全然いじれないんだけどえ、マリ、マリミツちゃんそこにいてそこにいていくよでも、でもね、もしかしたらいないでしょ?"
        },
        {
          "speechId": 1572,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10590322,
          "sourceEndMs": 10591943,
          "text": "こういうことなんじゃない?"
        },
        {
          "speechId": 1573,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10591943,
          "sourceEndMs": 10592823,
          "text": "あ、そういうこと?"
        },
        {
          "speechId": 1574,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10592823,
          "sourceEndMs": 10595264,
          "text": "この笑いっていないないバーの笑いなんじゃない?"
        },
        {
          "speechId": 1575,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10595264,
          "sourceEndMs": 10617471,
          "text": "わかるマリンごめんちょっともう5秒ちょうだいいくよいないなーいあ、隠れたわはい、終了見えてないよくそー難しいないないねバーって釘がなくなったもしかしていっぱい使ってたごめんこれ全部取ってたえ?"
        },
        {
          "speechId": 1576,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10617471,
          "sourceEndMs": 10618431,
          "text": "なんで?"
        },
        {
          "speechId": 1577,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10618431,
          "sourceEndMs": 10619692,
          "text": "釘取ってたごめん会社ネットで"
        },
        {
          "speechId": 1578,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10620122,
          "sourceEndMs": 10632427,
          "text": "ああそういうことねでも見てほしいここ見てほら見てほらあ、ほんとだすっきりさっきりできてるできてるいいねえ待ってここどうするここどこ?"
        },
        {
          "speechId": 1579,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10632427,
          "sourceEndMs": 10634168,
          "text": "ここ回収ネットにする?"
        },
        {
          "speechId": 1580,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10634168,
          "sourceEndMs": 10638150,
          "text": "ああしたいしたいでも可能できるかなできそう?"
        },
        {
          "speechId": 1581,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10638150,
          "sourceEndMs": 10647054,
          "text": "やってみるかうんOK一回もう一回釘釘をもらって"
        },
        {
          "speechId": 1582,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10657996,
          "sourceEndMs": 10664879,
          "text": "いいねええーとあ、やべ、またお腹減ってる、ちょっともう、集中して作りたいのにさあお腹?"
        },
        {
          "speechId": 1583,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10664879,
          "sourceEndMs": 10666579,
          "text": "あ、なに、ゲームの方?"
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
