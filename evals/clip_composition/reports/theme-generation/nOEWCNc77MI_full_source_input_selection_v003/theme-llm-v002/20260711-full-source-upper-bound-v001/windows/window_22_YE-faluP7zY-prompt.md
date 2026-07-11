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
    "windowId": "window_22_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 3767029,
    "sourceEndMs": 3879156
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
      "promptSegmentCount": 28,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 528,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3767029,
          "sourceEndMs": 3779852,
          "text": "いや無理じゃない登らないってこれでもここにさ足場があるってことはさ足場じゃなくてさこれネイチャーアートだよこれ自然が作り出したものでさいやいやそんな登る足場"
        },
        {
          "speechId": 529,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3780418,
          "sourceEndMs": 3782640,
          "text": "マジ?"
        },
        {
          "speechId": 530,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3782640,
          "sourceEndMs": 3784401,
          "text": "マジで言ってるの?"
        },
        {
          "speechId": 531,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3784401,
          "sourceEndMs": 3788484,
          "text": "あの鳥がこっちに戻ってくるとき、それがお前の死ぬときだここ!"
        },
        {
          "speechId": 532,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3788484,
          "sourceEndMs": 3790965,
          "text": "くそー!"
        },
        {
          "speechId": 533,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3790965,
          "sourceEndMs": 3791245,
          "text": "あーくそ!"
        },
        {
          "speechId": 534,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3791245,
          "sourceEndMs": 3792887,
          "text": "マリリンどこ行ったの?"
        },
        {
          "speechId": 535,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3792887,
          "sourceEndMs": 3795608,
          "text": "あの岩の上岩の上のぽにょ?"
        },
        {
          "speechId": 536,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3795608,
          "sourceEndMs": 3797790,
          "text": "待って、水やばい岩の上のぽにょ?"
        },
        {
          "speechId": 537,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3797790,
          "sourceEndMs": 3798350,
          "text": "やだ!"
        },
        {
          "speechId": 538,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3798350,
          "sourceEndMs": 3798470,
          "text": "痛い!"
        },
        {
          "speechId": 539,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3798470,
          "sourceEndMs": 3798590,
          "text": "痛い!"
        },
        {
          "speechId": 540,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3798590,
          "sourceEndMs": 3799911,
          "text": "痛い!"
        },
        {
          "speechId": 541,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3799911,
          "sourceEndMs": 3800212,
          "text": "マジ?"
        },
        {
          "speechId": 542,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3800212,
          "sourceEndMs": 3800612,
          "text": "どうした?"
        },
        {
          "speechId": 543,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3800612,
          "sourceEndMs": 3800872,
          "text": "どうした?"
        },
        {
          "speechId": 544,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3800872,
          "sourceEndMs": 3801633,
          "text": "どうした?"
        },
        {
          "speechId": 545,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3801633,
          "sourceEndMs": 3803274,
          "text": "くらったー死んだ?"
        },
        {
          "speechId": 546,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3803274,
          "sourceEndMs": 3808177,
          "text": "いや、まだまだ生きてるえ、待って、反対側から登れるってマジ?"
        },
        {
          "speechId": 547,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3808177,
          "sourceEndMs": 3809258,
          "text": "うん、コメントに書いてある"
        },
        {
          "speechId": 548,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3810310,
          "sourceEndMs": 3820095,
          "text": "そんなさ反対側から登れるよってそんなさすごいじゃんまた来てるまた来てるまた来てるっておいでおいでマリンマリン生きてる?"
        },
        {
          "speechId": 549,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3820095,
          "sourceEndMs": 3822016,
          "text": "まだ生きてるコーネどこ?"
        },
        {
          "speechId": 550,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3822016,
          "sourceEndMs": 3824737,
          "text": "コーネもう上登ってるよあ裏から?"
        },
        {
          "speechId": 551,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3824737,
          "sourceEndMs": 3839904,
          "text": "うん今裏に一瞬影がね見えた気がしたのあ本当だ登れたよOK行くわなにこれ黒い粉だったわコーネ今ね今鳥のこと見てたらね鳥ね普通にねあの床に落ちてる道端の地面のね岩拾って"
        },
        {
          "speechId": 552,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3840794,
          "sourceEndMs": 3851679,
          "text": "あそういうことじゃ上に行ってるわけじゃないんだそういう感じっぽい上に来たけど上にも何もないなこれ何もない?"
        },
        {
          "speechId": 553,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3851679,
          "sourceEndMs": 3865406,
          "text": "パイナップルが咲いてるあお腹減ってるから食べる黄色い粉とかは取らなくていいよな粉はいらないかもねあそこに止まるのかもしれないね"
        },
        {
          "speechId": 554,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3872594,
          "sourceEndMs": 3873174,
          "text": "止まるんじゃない?"
        },
        {
          "speechId": 555,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3873174,
          "sourceEndMs": 3879156,
          "text": "あそこにえ、分からんなこれどうすればいいんじゃんこれちょっと満身創痍だよどうする?"
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
