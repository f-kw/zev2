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
    "windowId": "window_31_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 5135367,
    "sourceEndMs": 5309614
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
        },
        {
          "speechId": 771,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5190322,
          "sourceEndMs": 5195044,
          "text": "そんな面白くないと思ったえ、綺麗え、綺麗?"
        },
        {
          "speechId": 772,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5195044,
          "sourceEndMs": 5195084,
          "text": "何?"
        },
        {
          "speechId": 773,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5195084,
          "sourceEndMs": 5195464,
          "text": "夕焼け?"
        },
        {
          "speechId": 774,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5195464,
          "sourceEndMs": 5195944,
          "text": "朝日?"
        },
        {
          "speechId": 775,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5195944,
          "sourceEndMs": 5212850,
          "text": "うんほんとだほら、すごいね私さ、この景色一生忘れないと思うなんで?"
        },
        {
          "speechId": 776,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5212850,
          "sourceEndMs": 5213570,
          "text": "そんな思い出ある?"
        },
        {
          "speechId": 777,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5213570,
          "sourceEndMs": 5219192,
          "text": "バカされてるあ、そういう演技かそういう演技ごめんね、ごめんね気づけなくてごめんそういう演技"
        },
        {
          "speechId": 778,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5225398,
          "sourceEndMs": 5231500,
          "text": "ごめんねごめんね縁目だからちゃんと読んできた縁目今日の縁目縁目?"
        },
        {
          "speechId": 779,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5231500,
          "sourceEndMs": 5234981,
          "text": "縁目なんてあった?"
        },
        {
          "speechId": 780,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5234981,
          "sourceEndMs": 5236381,
          "text": "あ、待ってそれも演技か?"
        },
        {
          "speechId": 781,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5236381,
          "sourceEndMs": 5244903,
          "text": "マリンやったなぁねぇもう伝わってよマジついでなぁ今日絡みづらい?"
        },
        {
          "speechId": 782,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5244903,
          "sourceEndMs": 5249964,
          "text": "ちょっとやばいかもでもちょっとねあの絡みづらいのは伊之助の時は本当にねあのマジ"
        },
        {
          "speechId": 783,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5250620,
          "sourceEndMs": 5259163,
          "text": "いのすけ限定やんそれその時はね本当に死ぬと思ったね命も覚悟した船長本当に?"
        },
        {
          "speechId": 784,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5259163,
          "sourceEndMs": 5279310,
          "text": "まあでも死ななくてよかったねこっちが死にそうですなんなんなんどうした急にサメが来たから地道に泳いでるよしよしよし逃げれた逃げれたサメの餌作ってちょっとあれやりたいけどなもったいないんだよなそんなやつのためにクソがよどういう感情それ"
        },
        {
          "speechId": 785,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5280554,
          "sourceEndMs": 5283936,
          "text": "で、これ作ったやつ…あ、これもしかして斧で?"
        },
        {
          "speechId": 786,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5283936,
          "sourceEndMs": 5284357,
          "text": "どれ?"
        },
        {
          "speechId": 787,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5284357,
          "sourceEndMs": 5284977,
          "text": "斧?"
        },
        {
          "speechId": 788,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5284977,
          "sourceEndMs": 5287619,
          "text": "あ、斧で壊せるじゃん!"
        },
        {
          "speechId": 789,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5287619,
          "sourceEndMs": 5288399,
          "text": "何を?"
        },
        {
          "speechId": 790,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5288399,
          "sourceEndMs": 5289900,
          "text": "あ、あ、作ったやつ?"
        },
        {
          "speechId": 791,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5289900,
          "sourceEndMs": 5299307,
          "text": "うん、これは気づきでしたはい、すごーいおめでとうあ、へぇーえ、天井高くする?"
        },
        {
          "speechId": 792,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5299307,
          "sourceEndMs": 5302869,
          "text": "そうなったら…あ、でも、なんか大変じゃない?"
        },
        {
          "speechId": 793,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5302869,
          "sourceEndMs": 5305131,
          "text": "そう、なんか壊して作るの大変じゃない?"
        },
        {
          "speechId": 794,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5305131,
          "sourceEndMs": 5309614,
          "text": "材料がちょっと減ってる感じする、元よりね、なんかここだけ粗いけど何?"
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
