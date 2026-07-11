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
    "windowId": "window_34_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 5686333,
    "sourceEndMs": 5831798
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
          "speechId": 845,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5686333,
          "sourceEndMs": 5688435,
          "text": "これもういいかな?"
        },
        {
          "speechId": 846,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5688435,
          "sourceEndMs": 5689396,
          "text": "逆、方が逆向きなのかな?"
        },
        {
          "speechId": 847,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5689396,
          "sourceEndMs": 5690517,
          "text": "あー!"
        },
        {
          "speechId": 848,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5690517,
          "sourceEndMs": 5699584,
          "text": "方外したらまた戻っちゃった待って、パドル作るわ、ちょっともう方いいかなと思ってさごめんね、ソーリーいいよ"
        },
        {
          "speechId": 849,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5700502,
          "sourceEndMs": 5727982,
          "text": "もっかいつけまーすはーいあーどっこいしょとそっかこんな止まっちゃうんだねすぐねこうよいやーほんとありがてありがてありがとねてっきりもういいのかと思ってさちょっと木終わる木の対策にねここでねヤシの木の栽培をね始めていきたいと思いまーすありがとございまーすえっとじゃあヤシの種種種種種種ある?"
        },
        {
          "speechId": 850,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5727982,
          "sourceEndMs": 5729864,
          "text": "ありますよー種どっかで"
        },
        {
          "speechId": 851,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5732991,
          "sourceEndMs": 5735231,
          "text": "マリリン、さっきジャガイモ焼いてた?"
        },
        {
          "speechId": 852,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5735231,
          "sourceEndMs": 5739913,
          "text": "あ、焼いたー焼けたからさ、これいる?"
        },
        {
          "speechId": 853,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5739913,
          "sourceEndMs": 5744414,
          "text": "あ、コーネ食べたければ食べてもいいよあ、いいよ、コーネにお魚あるからねあんた?"
        },
        {
          "speechId": 854,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5744414,
          "sourceEndMs": 5756917,
          "text": "じゃあ貰うわほらあ、そっかはい見せびらかしてたわ、今うんごめんね気づきちゃう進んでる?"
        },
        {
          "speechId": 855,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5756917,
          "sourceEndMs": 5758878,
          "text": "これあ、進んでないな、これ進んない?"
        },
        {
          "speechId": 856,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5767379,
          "sourceEndMs": 5772220,
          "text": "逆だったん?"
        },
        {
          "speechId": 857,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5772220,
          "sourceEndMs": 5775261,
          "text": "逆でしたでもこれってさ船長が悪いと思う?"
        },
        {
          "speechId": 858,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5775261,
          "sourceEndMs": 5783643,
          "text": "ううんこのほうが悪いと思うねえ難しいあ、ここにあったげるちゃんいくよ?"
        },
        {
          "speechId": 859,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5783643,
          "sourceEndMs": 5787383,
          "text": "あら?"
        },
        {
          "speechId": 860,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5787383,
          "sourceEndMs": 5788664,
          "text": "見上げてるもう任せろよ"
        },
        {
          "speechId": 861,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5790578,
          "sourceEndMs": 5796179,
          "text": "コーネにはさぁ…こうかな?"
        },
        {
          "speechId": 862,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5796179,
          "sourceEndMs": 5796999,
          "text": "何笑ってんだよ!"
        },
        {
          "speechId": 863,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5796999,
          "sourceEndMs": 5797319,
          "text": "コーネ!"
        },
        {
          "speechId": 864,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5797319,
          "sourceEndMs": 5797899,
          "text": "コーネ!"
        },
        {
          "speechId": 865,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5797899,
          "sourceEndMs": 5798500,
          "text": "ほんとに!"
        },
        {
          "speechId": 866,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5798500,
          "sourceEndMs": 5798980,
          "text": "ほんとに!"
        },
        {
          "speechId": 867,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5798980,
          "sourceEndMs": 5800020,
          "text": "足しか引っ張れずに魚釣ります!"
        },
        {
          "speechId": 868,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5800020,
          "sourceEndMs": 5813083,
          "text": "マジで…あーごめんなさい頼むよ、犬神様…いや、頼まれよう頼まれよう…何笑ってんだよ!"
        },
        {
          "speechId": 869,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5813083,
          "sourceEndMs": 5820000,
          "text": "ごめんなさい…ごめんなさい…ごめんなさい…お魚…お魚釣って…お魚…よいしょ…お魚…お魚…お水入れて"
        },
        {
          "speechId": 870,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5821110,
          "sourceEndMs": 5824633,
          "text": "水遠いのだる水遠いのだるいな2個作る?"
        },
        {
          "speechId": 871,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5824633,
          "sourceEndMs": 5831798,
          "text": "2個いらないか水はでも割ってもいいかもね作るコスト的にそんな重くなければ2回にも作れば?"
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
