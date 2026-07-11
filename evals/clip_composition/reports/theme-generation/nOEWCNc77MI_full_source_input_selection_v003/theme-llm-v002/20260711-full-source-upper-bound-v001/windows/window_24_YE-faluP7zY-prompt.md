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
    "windowId": "window_24_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 4040050,
    "sourceEndMs": 4233359
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
      "promptSegmentCount": 23,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
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
        },
        {
          "speechId": 585,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4055446,
          "sourceEndMs": 4074140,
          "text": "あるあるいただきいただきインカいただきストリートあれも作る、回収ネットも作りたいな作ろう2階を完成させるという当初の目的を急に思い出してきたえっとじゃあ何あ、とりあえず行きゃー!"
        },
        {
          "speechId": 586,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4074140,
          "sourceEndMs": 4079944,
          "text": "よしよしよしちょっとさ、さっきさお魚釣りするわOK"
        },
        {
          "speechId": 587,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4080646,
          "sourceEndMs": 4094315,
          "text": "じゃあ船長は次第を集めたいけど今何も流れてないからこれ引っかかってないよね大丈夫だよね動いてる動いてるめっちゃ釣れるじゃんこれ楽しいいいねロープどっかにあったのロープ?"
        },
        {
          "speechId": 588,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4094315,
          "sourceEndMs": 4095935,
          "text": "ロープ?"
        },
        {
          "speechId": 589,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4095935,
          "sourceEndMs": 4109864,
          "text": "まじイノスキにやられるかとお腹がまじめちゃめちゃになったわ今のイノスキでそんな笑うとは思わなかったよ腹よじれたガチでよじれた死ぬかと思ったまあ嬉しいよねまあ"
        },
        {
          "speechId": 590,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4110474,
          "sourceEndMs": 4122562,
          "text": "嬉しいよねクールな嬉しい嬉しいクールな犬がめちゃめちゃ嬉しいよなかなか進まないなせんちゃんも釣りしてダブルスタイルで行くかあれ?"
        },
        {
          "speechId": 591,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4122562,
          "sourceEndMs": 4125663,
          "text": "ほがほの向きがあれ?"
        },
        {
          "speechId": 592,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4125663,
          "sourceEndMs": 4139192,
          "text": "いやそうだね向きがあれかもちょっと待って開くかOKOK開きましての向かいも広いねあいいよいいよいいよ生きてる生きてる?"
        },
        {
          "speechId": 593,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4139192,
          "sourceEndMs": 4139852,
          "text": "うんうまく"
        },
        {
          "speechId": 594,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4140240,
          "sourceEndMs": 4154686,
          "text": "離れたから綺麗に離れたらもうたたむか閉じてりょりょりょのりょいや死ぬかと思ったな見て釣ったこれはもういいよなに釣った?"
        },
        {
          "speechId": 595,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4154686,
          "sourceEndMs": 4165790,
          "text": "見て釣ったよちっちぇなねえ頑張ったんだけどなんかその顔のデカさに対してのスケール感がさああそんなんじゃなかったごめんね焼きまーす"
        },
        {
          "speechId": 596,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4166934,
          "sourceEndMs": 4169542,
          "text": "とみちゃんも釣り竿作るかネジスクラップ"
        },
        {
          "speechId": 597,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4172355,
          "sourceEndMs": 4175696,
          "text": "釣竿壊れたんですけど絵も壊れたの?"
        },
        {
          "speechId": 598,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4175696,
          "sourceEndMs": 4190561,
          "text": "自分で作りまーす偉いね自分で作って偉い偉いあでも板いるんか素材集めまーす金属で作る?"
        },
        {
          "speechId": 599,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4190561,
          "sourceEndMs": 4192702,
          "text": "金属だと作れるもったいなくない?"
        },
        {
          "speechId": 600,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4192702,
          "sourceEndMs": 4199724,
          "text": "いやそんなことないでしょむしろ板使わないし金属の釣竿で長く使えるしありやね"
        },
        {
          "speechId": 601,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4200866,
          "sourceEndMs": 4202386,
          "text": "スクールアップでじゃあ、よろしくお願いしまーす!"
        },
        {
          "speechId": 602,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4202386,
          "sourceEndMs": 4202646,
          "text": "オッケーでーす!"
        },
        {
          "speechId": 603,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4202646,
          "sourceEndMs": 4229712,
          "text": "あ、待って、お腹すいてベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベ"
        },
        {
          "speechId": 604,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4230258,
          "sourceEndMs": 4233359,
          "text": "ここにいっぱい…他人事?"
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
