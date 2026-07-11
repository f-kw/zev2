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
    "windowId": "window_19_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 4831414,
    "sourceEndMs": 5189318
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
      "promptSegmentCount": 26,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 721,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4831414,
          "sourceEndMs": 4838499,
          "text": "マジで待って、弾が、弾がそろわないよ、弾があ、マリン!"
        },
        {
          "speechId": 722,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4838499,
          "sourceEndMs": 4839800,
          "text": "待って、見ていたわ、弾!"
        },
        {
          "speechId": 723,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4839800,
          "sourceEndMs": 4842281,
          "text": "待って、どれのこれ?"
        },
        {
          "speechId": 724,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4842281,
          "sourceEndMs": 4845523,
          "text": "これ!"
        },
        {
          "speechId": 725,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4845523,
          "sourceEndMs": 4856150,
          "text": "もう、すごいなぁなんかこの弾、鼻筋の整えがすごいな弾、鼻筋やってんね、これ鼻筋やってる?"
        },
        {
          "speechId": 726,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4856150,
          "sourceEndMs": 4859872,
          "text": "これ一旦外そう一旦外して柱を建てて待って、何したんだっけ?"
        },
        {
          "speechId": 742,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4980118,
          "sourceEndMs": 5008544,
          "text": "あ、確かにじゃあここでまたねまた集めよっかいのししもいるかもしれないしね反応してる反応してるいのししも喜んでるロープ石嬉しいぞ声がもう嬉しい嬉しいぞ本当さごめんなんだけどマリリンここの箱見てここここ?"
        },
        {
          "speechId": 743,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5008544,
          "sourceEndMs": 5009944,
          "text": "仲間外れがいるよこっちこっち"
        },
        {
          "speechId": 744,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5010074,
          "sourceEndMs": 5013056,
          "text": "手前の箱仲間外れの葉っぱはどれかな?"
        },
        {
          "speechId": 745,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5013056,
          "sourceEndMs": 5021861,
          "text": "これこれねこれねこれねこれだー!"
        },
        {
          "speechId": 746,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5021861,
          "sourceEndMs": 5023902,
          "text": "買いぞー!"
        },
        {
          "speechId": 747,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5023902,
          "sourceEndMs": 5025143,
          "text": "見つけた!"
        },
        {
          "speechId": 748,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5025143,
          "sourceEndMs": 5026684,
          "text": "見つけたぞー!"
        },
        {
          "speechId": 749,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5026684,
          "sourceEndMs": 5027064,
          "text": "見ーっけー!"
        },
        {
          "speechId": 750,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5027064,
          "sourceEndMs": 5030987,
          "text": "仲間外れ見っけー!"
        },
        {
          "speechId": 751,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5030987,
          "sourceEndMs": 5035930,
          "text": "終わったごめん面白すぎてちょっと見せたかったわご飯ある?"
        },
        {
          "speechId": 752,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5035930,
          "sourceEndMs": 5038751,
          "text": "ご飯あるよ生酢焼けてるよ食べない?"
        },
        {
          "speechId": 753,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5038751,
          "sourceEndMs": 5039712,
          "text": "ここ生酢あるから"
        },
        {
          "speechId": 763,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5101438,
          "sourceEndMs": 5103939,
          "text": "おかしくないか?"
        },
        {
          "speechId": 764,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5103939,
          "sourceEndMs": 5109002,
          "text": "お水にペットボトルそういうことねペットボトルにお水組みなか?"
        },
        {
          "speechId": 765,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5109002,
          "sourceEndMs": 5128111,
          "text": "そうだね順番が違うだけでこうもさ意味が違ってくるなすごいよな日本語の神秘を感じてるすごいよ木でも凝ろうかなじゃあいいね木こりしながら探すわ木こりしながらイノシシになる?"
        },
        {
          "speechId": 766,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5128111,
          "sourceEndMs": 5128291,
          "text": "あれ?"
        },
        {
          "speechId": 767,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5130066,
          "sourceEndMs": 5133747,
          "text": "イノシシンリーでいいのかなこれイノシシンリーやん?"
        },
        {
          "speechId": 768,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5133747,
          "sourceEndMs": 5135367,
          "text": "イノシシンリーなに言ってる?"
        },
        {
          "speechId": 769,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5135367,
          "sourceEndMs": 5158994,
          "text": "ごめんねなんでもないわ無視してノープランに話し始めるな申し訳ちょっと木凝っちゃお魚焼いてあーこれあれかそっか魚焼くのにも板がいるんだなあそうでも板今ね凝ってるからね持ってくわ今からありがとう板はめとくからちょ待ってよこれもいける"
        },
        {
          "speechId": 770,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5162499,
          "sourceEndMs": 5189318,
          "text": "よー取れるぴょんぴょんぴょんぴょんマンゴー邪魔だから食べようじゃマンゴーマンゴーじゃんじゃんそんな笑わないそんな笑うとこじゃねーから今の面白いいやそういうの好きなんだよねそういうくだらないやつがさそんなおもろくないことでいっぱい笑われると気まず"
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
