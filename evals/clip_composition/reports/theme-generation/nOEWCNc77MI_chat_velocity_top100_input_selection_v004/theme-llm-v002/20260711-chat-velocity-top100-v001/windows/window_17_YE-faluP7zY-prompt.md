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
    "windowId": "window_17_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 3903595,
    "sourceEndMs": 4055446
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
          "speechId": 558,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3903595,
          "sourceEndMs": 3904615,
          "text": "こうね後ろ?"
        },
        {
          "speechId": 559,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3904615,
          "sourceEndMs": 3906196,
          "text": "どこ?"
        },
        {
          "speechId": 560,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3906196,
          "sourceEndMs": 3915439,
          "text": "後ろを振り返ってごらんイノシシ君行きましょう行くぞ!"
        },
        {
          "speechId": 561,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3915439,
          "sourceEndMs": 3918880,
          "text": "声が声が太すぎる行くぞ!"
        },
        {
          "speechId": 562,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3918880,
          "sourceEndMs": 3920401,
          "text": "行くぞ!"
        },
        {
          "speechId": 563,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3920401,
          "sourceEndMs": 3923242,
          "text": "でもイノシシもいなくないか?"
        },
        {
          "speechId": 564,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3923242,
          "sourceEndMs": 3927483,
          "text": "もしかしてもうやっちゃったかもねやっちゃった?"
        },
        {
          "speechId": 565,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3927483,
          "sourceEndMs": 3929884,
          "text": "川他にねえ待ってもうさ移動するこれ?"
        },
        {
          "speechId": 566,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3930774,
          "sourceEndMs": 3936278,
          "text": "ワンチャンありだね、この島結構居だしね、ずっとね、魚釣ってた方がこれ、こう、良いのでは?"
        },
        {
          "speechId": 567,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3936278,
          "sourceEndMs": 3947364,
          "text": "効率確かに、ぐるっと、こっからぐるっとさ、一瞬回ってくか何かさ、特別なものがないか見ながらえっ、目の前に居る?"
        },
        {
          "speechId": 568,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3947364,
          "sourceEndMs": 3948205,
          "text": "えっ?"
        },
        {
          "speechId": 569,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3948205,
          "sourceEndMs": 3948425,
          "text": "居んの?"
        },
        {
          "speechId": 570,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3948425,
          "sourceEndMs": 3951647,
          "text": "こ、こんなのことじゃない?"
        },
        {
          "speechId": 571,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3951647,
          "sourceEndMs": 3952167,
          "text": "分かりづれー!"
        },
        {
          "speechId": 572,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3952167,
          "sourceEndMs": 3952407,
          "text": "分かりづれーこと言うな!"
        },
        {
          "speechId": 573,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3952407,
          "sourceEndMs": 3959892,
          "text": "あ、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま"
        },
        {
          "speechId": 574,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3961702,
          "sourceEndMs": 3980088,
          "text": "こんな顔でこびられてもって話かこの顔ですよとりあえず移動して魚釣りながら素材集めながらダンサーだね行きますか気づいたら結構欠けてるよふざけんなふざけんなふざけんなマジ?"
        },
        {
          "speechId": 575,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3980088,
          "sourceEndMs": 3981448,
          "text": "サメに?"
        },
        {
          "speechId": 576,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3981448,
          "sourceEndMs": 3988230,
          "text": "結構食われてるねこれマジでそういうことするのかするだろうよそりゃ"
        },
        {
          "speechId": 577,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3989600,
          "sourceEndMs": 3989963,
          "text": "とりあえず"
        },
        {
          "speechId": 578,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3991226,
          "sourceEndMs": 4017368,
          "text": "話題がすり減ってますとよしじゃあ出発しますかマリリン今更なんだけどさコーネのさ顔さもうちょい下げてもいいかもよマリリンの顔がさ可愛いフェイスが見えなくなっちゃうあでもね船長はねこうやって下を向いた時にコーネのねあの頭の匂い嗅いでるのからえ、いい匂い?"
        },
        {
          "speechId": 579,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4017368,
          "sourceEndMs": 4018950,
          "text": "うん、臭い泣いちゃったー"
        },
        {
          "speechId": 580,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4023866,
          "sourceEndMs": 4029707,
          "text": "泣くまで時間かかるからねごめんねじわじわ泣くやん早よ泣けやんこれも出発した?"
        },
        {
          "speechId": 581,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4029707,
          "sourceEndMs": 4040050,
          "text": "酷い酷いよあ、もうアンカー外したごめんねはいよーあ、待ってせーの出航!"
        },
        {
          "speechId": 582,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4040050,
          "sourceEndMs": 4044951,
          "text": "一人で行ってる板欲しいなー板?"
        },
        {
          "speechId": 583,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4044951,
          "sourceEndMs": 4049492,
          "text": "板欲しいなー板かーえ、でも板さーここに"
        },
        {
          "speechId": 584,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4050822,
          "sourceEndMs": 4055446,
          "text": "たぶんさ13枚しかないわ13枚あるの?"
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
