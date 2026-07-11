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
    "windowId": "window_43_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 7320202,
    "sourceEndMs": 7499784
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
      "promptSegmentCount": 20,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 1067,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7320202,
          "sourceEndMs": 7349370,
          "text": "マリンにお土産に持って帰ろうお土産なんだろ楽しみ楽しみにしといて板、1、2、3、4、あ、でも5枚くらい取れてるのか、結構いいなよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよし"
        },
        {
          "speechId": 1068,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7353641,
          "sourceEndMs": 7353882,
          "text": "あれ?"
        },
        {
          "speechId": 1069,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7353882,
          "sourceEndMs": 7379952,
          "text": "やべ、種足りなくなってきたなぁ粘土あった、粘土すなぁんんぬぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅ"
        },
        {
          "speechId": 1070,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7380920,
          "sourceEndMs": 7382561,
          "text": "やるじゃないかー!"
        },
        {
          "speechId": 1071,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7382561,
          "sourceEndMs": 7383302,
          "text": "誰?"
        },
        {
          "speechId": 1072,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7383302,
          "sourceEndMs": 7387904,
          "text": "やるじゃないかよーどっちから来たんだっけ?"
        },
        {
          "speechId": 1073,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7387904,
          "sourceEndMs": 7388985,
          "text": "やばい、これ大丈夫かな?"
        },
        {
          "speechId": 1074,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7388985,
          "sourceEndMs": 7393787,
          "text": "よしよしよしよし今、嫌な予感がしてるコーネのところに行けるかな?"
        },
        {
          "speechId": 1075,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7393787,
          "sourceEndMs": 7395808,
          "text": "これはい、大丈夫?"
        },
        {
          "speechId": 1076,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7395808,
          "sourceEndMs": 7399910,
          "text": "突っかかりそうな予感がしてるこれをもうちょっと行きか?"
        },
        {
          "speechId": 1077,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7399910,
          "sourceEndMs": 7403712,
          "text": "ちょっとイノシシやるわOK?"
        },
        {
          "speechId": 1078,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7403712,
          "sourceEndMs": 7406894,
          "text": "ここの地に生息するイノシシをこうしてだね"
        },
        {
          "speechId": 1079,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7408322,
          "sourceEndMs": 7409497,
          "text": "あ、逆か?"
        },
        {
          "speechId": 1080,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7409497,
          "sourceEndMs": 7410000,
          "text": "あれ、いいよ"
        },
        {
          "speechId": 1081,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7413735,
          "sourceEndMs": 7431561,
          "text": "ワンチャンもコーネに泳いであ、いいよいいよ行くよ行くよ島沿いにはいるからオッケー、終わったまって、いぼいの獅子の頭を持って帰るぞあ、誰かいる誰かいる?"
        },
        {
          "speechId": 1082,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7431561,
          "sourceEndMs": 7439624,
          "text": "これもペットだな、なんかいるわ、ウサギじゃない、カンガルーかなんかいるわいいね、あれかな、ランチャーでつかめるかな、あ、ここダメだ"
        },
        {
          "speechId": 1083,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7441675,
          "sourceEndMs": 7452421,
          "text": "いいかも、ランチャーレンあ、なんか人工的なものがあるよあ、カゴだって、カゴカゴなんかいいアイテムありそう?"
        },
        {
          "speechId": 1084,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7452421,
          "sourceEndMs": 7468951,
          "text": "ねえ、ちょっと見てみるわ回して、回して回れ、回れ、回れ、こっち回れ、回れ、回れ、こっちいけるかな?"
        },
        {
          "speechId": 1085,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7468951,
          "sourceEndMs": 7469532,
          "text": "地道に進んでいくんだよな"
        },
        {
          "speechId": 1086,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7475012,
          "sourceEndMs": 7499784,
          "text": "ガラスだってあ、ブドウのベトベトも拾ったナイスガラスとブドウのベトベトなぜカゴの中になぜブドウのベトベトなぜカゴの中に入ってるんだカゴの中に入ってたなぜマリリンを探そうかな、じゃあ今ね、島沿いではあるだろう"
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
