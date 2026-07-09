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
    "maxPromptBytes": 12000,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 752798,
    "sourceEndMs": 864927
  },
  "sources": [
    {
      "sourceVideoId": "YE-faluP7zY",
      "sourceUrl": "https://www.youtube.com/watch?v=YE-faluP7zY",
      "sourceTitle": "【Raft】ころね、キミさえいればこの海の果てまでだって──【ホロライブ/宝鐘マリン】",
      "transcriptKind": "local_stt",
      "language": "ja-JP",
      "durationSec": 1500,
      "rawSegmentCount": 7395,
      "promptSegmentCount": 22,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 74,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 752798,
          "sourceEndMs": 779564,
          "text": "アンカーちょっと食べていくか食べて、アンカーアンカーどこやねんアンカーどこやねんアンカーあったですありましたですか作れましたですナイスです降ろしちゃうよこれいいよここです何食べようかな、マナマナカツオ食べよう今ちょっとゴーディ誘ってくる誘ってやってくるじゃねえよ木探してくるわあ、オッケーあれ持ってる?"
        },
        {
          "speechId": 75,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 779564,
          "sourceEndMs": 779884,
          "text": "あのー"
        },
        {
          "speechId": 76,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 780346,
          "sourceEndMs": 809552,
          "text": "斧持ってるんだなこれが多いでしょすごいすごい独り立ちの日だよもう独り立ちの日かそうだよ良かったね独り立ちコロさんがちゃんと作ってるってもう成長を感じてほしいねコネいや結構ねあれだからねコネはね頑張ってるからねここで頑張ってるんだよなユウってねめちゃめちゃ集めるのも早いしうちの有能だからねしっかり船長がフォローしとくからコネのことサンキューな"
        },
        {
          "speechId": 77,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 810330,
          "sourceEndMs": 817353,
          "text": "えっとちょっと待ってココナッツしか取れねぇよ食料確かにちょっとしけてきたなあでも足りない?"
        },
        {
          "speechId": 78,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 817353,
          "sourceEndMs": 818634,
          "text": "しけしけになってきた?"
        },
        {
          "speechId": 79,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 818634,
          "sourceEndMs": 822236,
          "text": "ちょっと若干了解あ!"
        },
        {
          "speechId": 80,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 822236,
          "sourceEndMs": 823876,
          "text": "鳥殺した!"
        },
        {
          "speechId": 81,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 823876,
          "sourceEndMs": 824557,
          "text": "鳥殺したの?"
        },
        {
          "speechId": 82,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 824557,
          "sourceEndMs": 825157,
          "text": "食べれる?"
        },
        {
          "speechId": 83,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 825157,
          "sourceEndMs": 839584,
          "text": "食べれる食べれるちょっと待って鳥肉が絶対取れる食べてみて食べてみてOKOKOKOKちゃんと火通すんよOKあ、こんなとこでサメ肉3つあんじゃんラッキーラッキーラッキーじゃなくてラッキーとかじゃないねあ、サメ倒してたねそういえばね"
        },
        {
          "speechId": 84,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 840194,
          "sourceEndMs": 840494,
          "text": "完全忘れてたよね?"
        },
        {
          "speechId": 85,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 840494,
          "sourceEndMs": 859444,
          "text": "ちょっと待って、これ焼いてとこれちょっと拾ってともうちょっと一個食べてとなるほどねで、閉まってちょっとサメ肉閉まってで、このチキンを焼いてとやばっ!"
        },
        {
          "speechId": 86,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 859444,
          "sourceEndMs": 859605,
          "text": "くっそー!"
        },
        {
          "speechId": 87,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 859605,
          "sourceEndMs": 860065,
          "text": "どうした?"
        },
        {
          "speechId": 88,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 860065,
          "sourceEndMs": 860165,
          "text": "どうした?"
        },
        {
          "speechId": 89,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 860165,
          "sourceEndMs": 860485,
          "text": "何が来た?"
        },
        {
          "speechId": 90,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 860485,
          "sourceEndMs": 861386,
          "text": "鳥が!"
        },
        {
          "speechId": 91,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 861386,
          "sourceEndMs": 861626,
          "text": "鳥が来てる!"
        },
        {
          "speechId": 92,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 861626,
          "sourceEndMs": 863347,
          "text": "大丈夫か?"
        },
        {
          "speechId": 93,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 863347,
          "sourceEndMs": 864327,
          "text": "ダメージ?"
        },
        {
          "speechId": 94,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 864327,
          "sourceEndMs": 864687,
          "text": "平気?"
        },
        {
          "speechId": 95,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 864687,
          "sourceEndMs": 864927,
          "text": "ダメージ?"
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
