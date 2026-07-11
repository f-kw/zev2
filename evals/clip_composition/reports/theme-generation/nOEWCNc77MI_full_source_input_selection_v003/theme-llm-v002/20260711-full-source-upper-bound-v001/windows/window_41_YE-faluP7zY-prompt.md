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
    "windowId": "window_41_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 6975330,
    "sourceEndMs": 7139944
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
          "speechId": 1018,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6975330,
          "sourceEndMs": 6989518,
          "text": "君たちに聞いてるこうねには聞かないちょっと拗ねちゃった新しいあれを作ろう焼けたの?"
        },
        {
          "speechId": 1019,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6991386,
          "sourceEndMs": 6993226,
          "text": "一番下がなんだっけ?"
        },
        {
          "speechId": 1020,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6993226,
          "sourceEndMs": 7005529,
          "text": "一番下が鉱石系ほしいっけネオガニタンなにサメ復活してんじゃんあいつ生き返ってるわサメえ、粘土はどうする?"
        },
        {
          "speechId": 1021,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7005529,
          "sourceEndMs": 7015031,
          "text": "んー、粘土粘土か、じゃあ新しい作るわ粘土砂系のストレージを今から作りますマジ?"
        },
        {
          "speechId": 1022,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7015031,
          "sourceEndMs": 7019772,
          "text": "そのためにはね板が必要なんだ板ね、板ね今一番上に入れとるんでな"
        },
        {
          "speechId": 1023,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7020182,
          "sourceEndMs": 7036194,
          "text": "あ、そうだったさあもうどこにあるか聞くこともなく20枚しかないあ、でも全然助かるちょっとこれでじゃああ、この箱拾おうかあ、待って待って待って行かないで大丈夫?"
        },
        {
          "speechId": 1024,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7036194,
          "sourceEndMs": 7036354,
          "text": "大丈夫か?"
        },
        {
          "speechId": 1025,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7036354,
          "sourceEndMs": 7041157,
          "text": "な、荷物落としたサメ来てる荷物落とした荷物落とした大丈夫?"
        },
        {
          "speechId": 1026,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7041157,
          "sourceEndMs": 7043459,
          "text": "え、待って拾えた?"
        },
        {
          "speechId": 1027,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7043459,
          "sourceEndMs": 7049243,
          "text": "わかんないどっか行った何を落としたんだ私"
        },
        {
          "speechId": 1028,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7052286,
          "sourceEndMs": 7052626,
          "text": "くそー!"
        },
        {
          "speechId": 1029,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7052626,
          "sourceEndMs": 7053107,
          "text": "くそだー!"
        },
        {
          "speechId": 1030,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7053107,
          "sourceEndMs": 7055248,
          "text": "か、かつおー!"
        },
        {
          "speechId": 1031,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7055248,
          "sourceEndMs": 7058290,
          "text": "くそよー!"
        },
        {
          "speechId": 1032,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7058290,
          "sourceEndMs": 7058730,
          "text": "ちょっとあれだねあー!"
        },
        {
          "speechId": 1033,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7058730,
          "sourceEndMs": 7060331,
          "text": "食べられんのよ!"
        },
        {
          "speechId": 1034,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7060331,
          "sourceEndMs": 7061572,
          "text": "は?"
        },
        {
          "speechId": 1035,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7061572,
          "sourceEndMs": 7061872,
          "text": "は?"
        },
        {
          "speechId": 1036,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7061872,
          "sourceEndMs": 7061972,
          "text": "は?"
        },
        {
          "speechId": 1037,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7061972,
          "sourceEndMs": 7062092,
          "text": "は?"
        },
        {
          "speechId": 1038,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7062092,
          "sourceEndMs": 7065555,
          "text": "食べられちゃったえ、ど、どこ?"
        },
        {
          "speechId": 1039,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7065555,
          "sourceEndMs": 7066655,
          "text": "あ、か、ん?"
        },
        {
          "speechId": 1040,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7066655,
          "sourceEndMs": 7066996,
          "text": "床?"
        },
        {
          "speechId": 1041,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7066996,
          "sourceEndMs": 7078903,
          "text": "あ、でもね、今ね、追い払った、素手であ、回収ネット減ったってことかうん、なんか、か、噛みちぎられた、か、噛みちぎられたかと思いきやー思いきやーいや、噛みちぎられてるね"
        },
        {
          "speechId": 1042,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7081634,
          "sourceEndMs": 7108474,
          "text": "え、なんかついたけど島にそう、島ついちゃったからちょっとあれ回す方つけてあれするわ終わったえっと石はでもそんなあれかこっちに石石は何に何に該当するんだろうそれで言うとえ、鉱石じゃないのやっぱりあ、確かに鉱石か確かになえっと"
        },
        {
          "speechId": 1043,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7110258,
          "sourceEndMs": 7139944,
          "text": "楽しい分けるの鳥の声する鳥来てるねでもさ天井があるからさやられなくて済むねいや、愉快だな愉快だね愉快だよスクラッツ、ロープ、蝶津貝待って、持ち物パンパンだったドンベリーアンカー降ろさなくていいわちょっと今一周してきちゃう一周しようと思ったけど島広広い一周できるほどじゃないいや、広すぎだわ"
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
