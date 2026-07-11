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
    "windowId": "window_05_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 864927,
    "sourceEndMs": 1019166
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
      "promptSegmentCount": 24,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 96,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 864927,
          "sourceEndMs": 867669,
          "text": "大丈夫、ダメージ大丈夫まだ平気ほんと?"
        },
        {
          "speechId": 97,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 867669,
          "sourceEndMs": 868349,
          "text": "心配かけたな"
        },
        {
          "speechId": 98,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 870042,
          "sourceEndMs": 874784,
          "text": "言うほど心配してないよ心配してーよー!"
        },
        {
          "speechId": 99,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 874784,
          "sourceEndMs": 875844,
          "text": "はいはい、あれ?"
        },
        {
          "speechId": 100,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 875844,
          "sourceEndMs": 877525,
          "text": "あれ?"
        },
        {
          "speechId": 101,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 877525,
          "sourceEndMs": 878365,
          "text": "心配して?"
        },
        {
          "speechId": 102,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 878365,
          "sourceEndMs": 884347,
          "text": "心配ねしてるしてるちょっと待って、一旦荷物預けて雑すぎ気づいた?"
        },
        {
          "speechId": 103,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 884347,
          "sourceEndMs": 899732,
          "text": "雑すぎんやんいやでもマリリンは反応が雑でもこういうゲームのね作業ちゃんとするから偉いと思うわ謎のフォローが入りましたそうなんよ船長ってちょっとね反応たまに雑になるけどでもちゃんとするからねそう言うてね"
        },
        {
          "speechId": 104,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 900098,
          "sourceEndMs": 904802,
          "text": "営業をしっかりしてるところがコーポイントだよね、マジでうん、わかるわかる?"
        },
        {
          "speechId": 105,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 904802,
          "sourceEndMs": 925239,
          "text": "わかりみが深いえ、ちょ、せんちゃんあれするわあのさぁ海藻とか探すわあのね、結構ねあ、あ、ありがてありがて柔道のネマネマとかがね、今後必要になってくることはサメ、気をつけてね間違いない、オッケーでもさぁ、冷静に考えてさぁうんこうやって、目標がさぁ、どんどん変わってくからさぁ今、するべきことって痛っ、ヤバい!"
        },
        {
          "speechId": 106,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 925239,
          "sourceEndMs": 926740,
          "text": "ちょっと待っている?"
        },
        {
          "speechId": 107,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 926740,
          "sourceEndMs": 928241,
          "text": "いやああああああああああああああ"
        },
        {
          "speechId": 108,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 932566,
          "sourceEndMs": 934587,
          "text": "気をつけてこれイノシシいるの?"
        },
        {
          "speechId": 109,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 934587,
          "sourceEndMs": 953740,
          "text": "イノシシもいるわこれわかった助太刀に行こうちょっと矢でさ撃ち殺すかイノシシパーティーしよう今日はここにイノシシいるわしし鍋しし丼しししちゅうみたいなしししちゅうしたいしししちゅうそっかこいつはもう食べれるんだよな多分なそうだよ弓矢あれ弓矢ってどかなかったっけ持ってる?"
        },
        {
          "speechId": 110,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 953740,
          "sourceEndMs": 959944,
          "text": "弓矢どっかにあったはずコーネ持ってないんだなコーネ持ってないあったあったちょっとさ弓矢でさ"
        },
        {
          "speechId": 111,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 960122,
          "sourceEndMs": 989832,
          "text": "殺すわ食べようよ食べたいこれで撃てるのかな行くわそっち待ってあれマリゾネスどこマリゾネスまだイカダイカダにいる鳥もいるしねなんかねイノシシ2匹ぐらいいたから気をつけてなOKもうみんな撃ち殺すから任してセイチョ結構エイムにはね自信あるからそうでしょ自信はねあったところってなんだよどういう意味だよちょっと待って自信だけ"
        },
        {
          "speechId": 112,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 990278,
          "sourceEndMs": 993519,
          "text": "もうダメなんだよこれコロゾネス待った方がいいやつ?"
        },
        {
          "speechId": 113,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 993519,
          "sourceEndMs": 1001441,
          "text": "コロゾネス待たなくていいよずっとベリーだって食べちゃうどこだ?"
        },
        {
          "speechId": 114,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1001441,
          "sourceEndMs": 1006182,
          "text": "どこだちょっと待って一緒にゴーデスとか行かなこれじゃあイカダでちょっと待っとくか?"
        },
        {
          "speechId": 115,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1006182,
          "sourceEndMs": 1009243,
          "text": "オッケーちょっと待ってなイカダどこだ?"
        },
        {
          "speechId": 116,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1009243,
          "sourceEndMs": 1011184,
          "text": "じゃあヤ、ヤちょっと弓?"
        },
        {
          "speechId": 117,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1011184,
          "sourceEndMs": 1011864,
          "text": "ヤ、ヤ弓?"
        },
        {
          "speechId": 118,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1011864,
          "sourceEndMs": 1014365,
          "text": "死ぬかもしれんこれ嘘でしょ?"
        },
        {
          "speechId": 119,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1014365,
          "sourceEndMs": 1019166,
          "text": "ちょっとヤと作っとこうコーネも一緒に一緒にさ弓やする?"
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
