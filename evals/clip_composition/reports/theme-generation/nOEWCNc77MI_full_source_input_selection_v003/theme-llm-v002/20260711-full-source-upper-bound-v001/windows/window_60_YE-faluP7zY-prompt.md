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
    "windowId": "window_60_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 10086129,
    "sourceEndMs": 10273031
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
          "speechId": 1518,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10086129,
          "sourceEndMs": 10088611,
          "text": "そのさ、シジミとかさ、アサリとかあるやんか?"
        },
        {
          "speechId": 1519,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10088611,
          "sourceEndMs": 10091333,
          "text": "あるあるあるあれと同じ漢字なのかな?"
        },
        {
          "speechId": 1520,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10091333,
          "sourceEndMs": 10098317,
          "text": "あ、分類的にね貝、貝、貝、貝じゃない、貝どうでもいいかねえ?"
        },
        {
          "speechId": 1521,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10098317,
          "sourceEndMs": 10109584,
          "text": "何急にどうしてどうでもいいかと思って作業しまーす働くねえ働きますよえっと、でも配置をちょっとね、いじりたいやっぱ真ん中に"
        },
        {
          "speechId": 1522,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10111819,
          "sourceEndMs": 10134315,
          "text": "ちょっとテーブルを置いて一瞬グリル外しちゃうねはーいそんそんそんそんそんあ、でも小規模グリル置いとくわ端っこにはーい家の外に小規模グリルとかあるんだあのサイズつくってたやつ?"
        },
        {
          "speechId": 1523,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10134315,
          "sourceEndMs": 10137998,
          "text": "はいはいはいはいはいあぶな一旦外に置いとくからこれをOK"
        },
        {
          "speechId": 1524,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10140822,
          "sourceEndMs": 10148466,
          "text": "了解ウォッチ了解ウォッチとか夏もうそれ誰も言わないよもうは?"
        },
        {
          "speechId": 1525,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10148466,
          "sourceEndMs": 10169298,
          "text": "了解ウォッチ、了解ウォッチ、了解ウォッチ、了解ウォッチもう一人で全員分の了解ウォッチを一人で一年分言っちゃうよ今のじゃちょっとな一年分は行かないかな了解ウォッチ×100あーそれ略しちゃうねへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへ"
        },
        {
          "speechId": 1526,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10170450,
          "sourceEndMs": 10171490,
          "text": "レシピとかいるんかな?"
        },
        {
          "speechId": 1527,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10171490,
          "sourceEndMs": 10178974,
          "text": "一応取っとくかレシピさぁ、いらんくね?"
        },
        {
          "speechId": 1528,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10178974,
          "sourceEndMs": 10181195,
          "text": "あぁ、いらん説?"
        },
        {
          "speechId": 1529,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10181195,
          "sourceEndMs": 10194041,
          "text": "でもさぁ、いずれさぁレシピあればよかったのにってなる未来も見える確かにね取っとくよ、一応一応取っとこうか毎日に備えてえ?"
        },
        {
          "speechId": 1530,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10194041,
          "sourceEndMs": 10195882,
          "text": "レシピ壁に貼れるって?"
        },
        {
          "speechId": 1531,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10195882,
          "sourceEndMs": 10196502,
          "text": "はぁ?"
        },
        {
          "speechId": 1532,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10196502,
          "sourceEndMs": 10199304,
          "text": "壁に貼るの?"
        },
        {
          "speechId": 1533,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10199304,
          "sourceEndMs": 10200000,
          "text": "ポスターやん"
        },
        {
          "speechId": 1534,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10200370,
          "sourceEndMs": 10202971,
          "text": "あ、ポスター使いってこと?"
        },
        {
          "speechId": 1535,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10202971,
          "sourceEndMs": 10218098,
          "text": "やばい下手くそえ、すごーい飾りなんだ飾りってこと?"
        },
        {
          "speechId": 1536,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10218098,
          "sourceEndMs": 10223461,
          "text": "飾りにもなるってことじゃない?"
        },
        {
          "speechId": 1537,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10223461,
          "sourceEndMs": 10230000,
          "text": "すごあ、調理台ができればそのレシピ通りの料理ができるってこと"
        },
        {
          "speechId": 1538,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10231174,
          "sourceEndMs": 10256457,
          "text": "調理台とかあるんだいいねわかんないあれかもしれないよ本トップじゃないかもしれない出た本トップあるんだって結構な割合の方々が発してるから多分あるんだと思うそれは本トップだね本トップだわ人数が多ければ多いほど本トップとされてるからね"
        },
        {
          "speechId": 1539,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10260642,
          "sourceEndMs": 10268428,
          "text": "うそっぷだったらさうそっぷうそっぷあ、うそっぷってそういうこと?"
        },
        {
          "speechId": 1540,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10268428,
          "sourceEndMs": 10273031,
          "text": "いや、うそっぷが生まれた頃にはわざっぷはないんじゃない?"
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
