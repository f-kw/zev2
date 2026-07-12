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
    "windowId": "window_18_o8rZAhARXAc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "o8rZAhARXAc",
    "sourceStartMs": 7381314,
    "sourceEndMs": 7737121
  },
  "sources": [
    {
      "sourceVideoId": "o8rZAhARXAc",
      "sourceUrl": "https://www.youtube.com/watch?v=o8rZAhARXAc",
      "sourceTitle": "【 #ホロライブ甲子園2025】2年目夏！！夏合宿と甲子園初戦で狙え育成上振れ！！【ホロライブ/宝鐘マリン】",
      "transcriptKind": "local_stt",
      "language": "ja-JP",
      "durationSec": 11898.441,
      "rawSegmentCount": 34507,
      "promptSegmentCount": 28,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 788,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7381314,
          "sourceEndMs": 7407126,
          "text": "ここがいい伝令入れで引っ張るゲッツー、確かゲッツーになったらやばいかうーん、そうだワンアウトだからかただアイリスあんまり打ててないあんまり打ててないここスクイズで次伝令"
        },
        {
          "speechId": 789,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7411546,
          "sourceEndMs": 7424578,
          "text": "ゲッツーはやだねゲッツーはやだよなぁまぁステータス的に撃てない可能性も高いからなぁ確実に行く?"
        },
        {
          "speechId": 790,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7424578,
          "sourceEndMs": 7433367,
          "text": "スクイーズで?"
        },
        {
          "speechId": 791,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7433367,
          "sourceEndMs": 7436250,
          "text": "うんスクイーズしといて次"
        },
        {
          "speechId": 792,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7440799,
          "sourceEndMs": 7469400,
          "text": "次プレアちゃんか次プレアちゃんアイリスの次はプレアちゃんですね次のプレアもあんま打てないんだよな次のプレアもあんま打てないんだよなかといって1点入れたいよなスクイーズしてプレアに伝令かしらそうするか"
        },
        {
          "speechId": 793,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7490633,
          "sourceEndMs": 7499840,
          "text": "はいうーんデプレイヤーちゃん2.0かえっと使っちゃいけないのが"
        },
        {
          "speechId": 797,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7564002,
          "sourceEndMs": 7589239,
          "text": "えー転がせでいいかセンター6だけど6だけどパワーないしな転ごで行くかうん撃てるかプレア頑張れ撃ってねやーばい撃てる?"
        },
        {
          "speechId": 798,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7589239,
          "sourceEndMs": 7589640,
          "text": "プレアちゃん"
        },
        {
          "speechId": 799,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7590810,
          "sourceEndMs": 7593311,
          "text": "撃ってね!"
        },
        {
          "speechId": 800,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7593311,
          "sourceEndMs": 7603034,
          "text": "怖い!"
        },
        {
          "speechId": 801,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7603034,
          "sourceEndMs": 7618940,
          "text": "撃てないかー撃てないかー全然まで使ったのに撃てないかー厳しいですねーもう7回かもうやばくない?"
        },
        {
          "speechId": 802,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7618940,
          "sourceEndMs": 7619520,
          "text": "早くビト見せろよ"
        },
        {
          "speechId": 806,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7680498,
          "sourceEndMs": 7687944,
          "text": "なあ、ビトが魔物かどうかが見れないんだよバントじゃダメ?"
        },
        {
          "speechId": 807,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7687944,
          "sourceEndMs": 7708199,
          "text": "わかった、転がすわじゃあボールな、ボールなあ、ファウルかあ、ナイス!"
        },
        {
          "speechId": 808,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7708199,
          "sourceEndMs": 7709920,
          "text": "大山やればできんじゃんお前"
        },
        {
          "speechId": 809,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7710254,
          "sourceEndMs": 7711954,
          "text": "歩き出したか!"
        },
        {
          "speechId": 810,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7711954,
          "sourceEndMs": 7713655,
          "text": "ビト!"
        },
        {
          "speechId": 811,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7713655,
          "sourceEndMs": 7714135,
          "text": "?"
        },
        {
          "speechId": 812,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7713655,
          "sourceEndMs": 7714135,
          "text": "?"
        },
        {
          "speechId": 813,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7714135,
          "sourceEndMs": 7716136,
          "text": "ラッキーボーイ!"
        },
        {
          "speechId": 814,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7716136,
          "sourceEndMs": 7717416,
          "text": "お前ふざけんなお前!"
        },
        {
          "speechId": 815,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7717416,
          "sourceEndMs": 7720497,
          "text": "何がしたいんだお前は!"
        },
        {
          "speechId": 816,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7720497,
          "sourceEndMs": 7723738,
          "text": "な、勝つ気あんのかお前!"
        },
        {
          "speechId": 817,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7723738,
          "sourceEndMs": 7727619,
          "text": "何がラッキーボーイやふざけんなお前!"
        },
        {
          "speechId": 818,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7727619,
          "sourceEndMs": 7735201,
          "text": "えっとー待て盗塁…できるか?"
        },
        {
          "speechId": 819,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7735201,
          "sourceEndMs": 7735761,
          "text": "3ってどうなの?"
        },
        {
          "speechId": 820,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7735761,
          "sourceEndMs": 7737001,
          "text": "総力C盗塁C結構よくね?"
        },
        {
          "speechId": 821,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7737001,
          "sourceEndMs": 7737121,
          "text": "うん"
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
