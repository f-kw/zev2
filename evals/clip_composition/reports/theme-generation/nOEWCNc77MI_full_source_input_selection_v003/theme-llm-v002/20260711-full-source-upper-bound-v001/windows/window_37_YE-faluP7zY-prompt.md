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
    "windowId": "window_37_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 6268278,
    "sourceEndMs": 6419384
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
          "speechId": 919,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6268278,
          "sourceEndMs": 6268698,
          "text": "もしにや"
        },
        {
          "speechId": 920,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6269270,
          "sourceEndMs": 6269657,
          "text": "とか言って"
        },
        {
          "speechId": 921,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6270000,
          "sourceEndMs": 6271020,
          "text": "どうする?"
        },
        {
          "speechId": 922,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6271020,
          "sourceEndMs": 6276563,
          "text": "あれ鉱石あんだってちょっと集めてくるわちょっとあれ船長?"
        },
        {
          "speechId": 923,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6276563,
          "sourceEndMs": 6276623,
          "text": "ん?"
        },
        {
          "speechId": 924,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6276623,
          "sourceEndMs": 6277023,
          "text": "待ってどうした?"
        },
        {
          "speechId": 925,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6277023,
          "sourceEndMs": 6287447,
          "text": "気のせいかサメに食われてるような気がしたんだすごいなサメに食われて自覚ないってやばいないやイカダの方だからさ自覚じゃあないじゃん?"
        },
        {
          "speechId": 926,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6287447,
          "sourceEndMs": 6299272,
          "text": "なるほどね次パートは失礼よかったよかった板もちょっと回収してここガラスも引っ張るじゃあこれで清浄機をちょっと一個作って"
        },
        {
          "speechId": 927,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6300522,
          "sourceEndMs": 6328283,
          "text": "で、大区画のあ、蝶津貝もいるのかちょっと下に潜って探すねありがとうどうしよう、どんどんこの隙に移動しててさコーネが置き去りにされていてしまったらば置き去りにされたらコーネはでも犬かけにそっちまで行くねなかわいいかわいい!"
        },
        {
          "speechId": 928,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6328283,
          "sourceEndMs": 6328883,
          "text": "届きましたよ!"
        },
        {
          "speechId": 929,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6332538,
          "sourceEndMs": 6335759,
          "text": "そういうとこがね、好きなんだねえ、やだぁ?"
        },
        {
          "speechId": 930,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6335759,
          "sourceEndMs": 6336419,
          "text": "んん?"
        },
        {
          "speechId": 931,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6336419,
          "sourceEndMs": 6361383,
          "text": "待て待て、めっちゃwwwこ、こね、どんどん離れていってるwwwまねぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇでも、ほんと?"
        },
        {
          "speechId": 932,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6361383,
          "sourceEndMs": 6362065,
          "text": "見てて?"
        },
        {
          "speechId": 933,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6362065,
          "sourceEndMs": 6362286,
          "text": "分かった"
        },
        {
          "speechId": 934,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6390286,
          "sourceEndMs": 6390766,
          "text": "いた!"
        },
        {
          "speechId": 935,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6390766,
          "sourceEndMs": 6391527,
          "text": "18枚!"
        },
        {
          "speechId": 936,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6391527,
          "sourceEndMs": 6392948,
          "text": "あ、ナイス!"
        },
        {
          "speechId": 937,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6392948,
          "sourceEndMs": 6394909,
          "text": "鉱石は?"
        },
        {
          "speechId": 938,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6394909,
          "sourceEndMs": 6395669,
          "text": "鉱石?"
        },
        {
          "speechId": 939,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6395669,
          "sourceEndMs": 6399091,
          "text": "鉱石!"
        },
        {
          "speechId": 940,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6399091,
          "sourceEndMs": 6404515,
          "text": "君の笑顔が鉱石だよやがましすぎる、ちょっと待ってサメ、サメ来て!"
        },
        {
          "speechId": 941,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6404515,
          "sourceEndMs": 6406996,
          "text": "そんなこと言ってる場合じゃねえんだよ!"
        },
        {
          "speechId": 942,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6406996,
          "sourceEndMs": 6409217,
          "text": "サメが来てんだよ、サメ貝は!"
        },
        {
          "speechId": 943,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6409217,
          "sourceEndMs": 6410418,
          "text": "鉱石がないです!"
        },
        {
          "speechId": 944,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6410418,
          "sourceEndMs": 6415321,
          "text": "まあまあ、まあいいでしょうで、何をしたいんだっけ?"
        },
        {
          "speechId": 945,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6415321,
          "sourceEndMs": 6419384,
          "text": "船長あ、そうだ、えーと、であ、いたいたいたいや、こんなに離れちゃうもんなんだな"
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
