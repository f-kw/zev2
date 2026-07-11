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
    "windowId": "window_38_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 6421242,
    "sourceEndMs": 6627110
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
      "promptSegmentCount": 25,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 946,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6421242,
          "sourceEndMs": 6421542,
          "text": "ね!"
        },
        {
          "speechId": 947,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6421542,
          "sourceEndMs": 6422683,
          "text": "意外と移動してたね!"
        },
        {
          "speechId": 948,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6422683,
          "sourceEndMs": 6423464,
          "text": "ね!"
        },
        {
          "speechId": 949,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6423464,
          "sourceEndMs": 6436173,
          "text": "こんなに離れちゃうのかOKOK良いね良いね、挟まってたのいっぱいじゃあこれを板12枚入れたよーありがとう!"
        },
        {
          "speechId": 950,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6436173,
          "sourceEndMs": 6437494,
          "text": "ナイス!"
        },
        {
          "speechId": 951,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6437494,
          "sourceEndMs": 6438115,
          "text": "ナイス!"
        },
        {
          "speechId": 952,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6438115,
          "sourceEndMs": 6448103,
          "text": "水物見て水物見て釣り竿古い方使っちゃおうえ、まだお腹空いてないの?"
        },
        {
          "speechId": 953,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6448103,
          "sourceEndMs": 6449243,
          "text": "マリリンまだ行けるかな?"
        },
        {
          "speechId": 954,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6449243,
          "sourceEndMs": 6449964,
          "text": "マジ?"
        },
        {
          "speechId": 955,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6451610,
          "sourceEndMs": 6479458,
          "text": "そろそろ減ってくるかなってところまず食べちゃおうからねいいよお腹減ってんな食べなそれはマリンにくださいよっていうのかと思ったそれは船長のですよそっかマリン船長っていうか解像度低いのやめてよ学習学習つらいコーネに分かってもらえてなかったのつらい"
        },
        {
          "speechId": 956,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6480406,
          "sourceEndMs": 6484328,
          "text": "え、分かってるよ分かってくれてる?"
        },
        {
          "speechId": 957,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6484328,
          "sourceEndMs": 6510760,
          "text": "マリンは船長って言うよねでも知らなかったじゃん今完全にさ知らなかったわけじゃないとっさに出ちゃうよやっぱりマリンって呼んでるからさあー特別なね呼び方だからねそうだよそうだよじゃあしょうがない最近最近さなんか呼び捨てで呼ぶ時もあるからさそうですねマリンのこと最近そうなってきたよねなんかさ匂わしちゃってわかりみわかりみ"
        },
        {
          "speechId": 958,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6531258,
          "sourceEndMs": 6538283,
          "text": "正常期って確かに2階に置いたら水汲んで入れるのが大変かどう考えても確かにそうだなでも1階と2階と3階に作れば?"
        },
        {
          "speechId": 959,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6538283,
          "sourceEndMs": 6539604,
          "text": "3階作る予定でいる"
        },
        {
          "speechId": 960,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6540500,
          "sourceEndMs": 6551645,
          "text": "いやでもさ、あれなんだよね普通に水を汲むのがさ、汲んでさ、入れるじゃん清浄機にさ、水をさうんうんそう、大変じゃね?"
        },
        {
          "speechId": 961,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6551645,
          "sourceEndMs": 6558467,
          "text": "ちょっと普通にさ水を下で汲んで上にさ、入れに行くっていうあーそういうこと?"
        },
        {
          "speechId": 962,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6558467,
          "sourceEndMs": 6569832,
          "text": "確かに、こうやって見ると間違いなくそうだな下でペットボトルで持って行くあ、なるほどね、じゃあこれを確かにペットボトルでいいか、こうしてあ、こうやってね"
        },
        {
          "speechId": 963,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6570682,
          "sourceEndMs": 6576625,
          "text": "確かにこれでいいなあもうできてんじゃん早もうできてるえマジ?"
        },
        {
          "speechId": 964,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6576625,
          "sourceEndMs": 6592494,
          "text": "やしの木ありがたいねありがてえここにじゃあ種も入れて冷静にじゃあ青少期はやっぱ下に置くとしてあ種次郎種次郎種次郎?"
        },
        {
          "speechId": 965,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6600000,
          "sourceEndMs": 6600340,
          "text": "何?"
        },
        {
          "speechId": 966,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6600340,
          "sourceEndMs": 6605802,
          "text": "じわじわ笑うのやめてごめん何ウケ?"
        },
        {
          "speechId": 967,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6605802,
          "sourceEndMs": 6613465,
          "text": "ちょっと待ってジローって何だろうと思ってねぇハマグリいらんくない?"
        },
        {
          "speechId": 968,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6613465,
          "sourceEndMs": 6614245,
          "text": "ハマグリ?"
        },
        {
          "speechId": 969,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6614245,
          "sourceEndMs": 6617346,
          "text": "あぁでもどうだろういらんかなぁ?"
        },
        {
          "speechId": 970,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6617346,
          "sourceEndMs": 6627110,
          "text": "捨てるってことはないよストレージ増やすからちょっと待ってなあ終わったとりあえずここ入れちゃうわそしたらハマグリいけ?"
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
