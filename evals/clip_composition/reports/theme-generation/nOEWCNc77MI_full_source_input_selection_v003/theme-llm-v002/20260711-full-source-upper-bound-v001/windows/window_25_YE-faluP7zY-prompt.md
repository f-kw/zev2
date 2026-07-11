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
    "windowId": "window_25_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 4233359,
    "sourceEndMs": 4354127
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
      "promptSegmentCount": 29,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 605,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4233359,
          "sourceEndMs": 4233799,
          "text": "OK!"
        },
        {
          "speechId": 606,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4233799,
          "sourceEndMs": 4236259,
          "text": "釣竿できました!"
        },
        {
          "speechId": 607,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4236259,
          "sourceEndMs": 4236799,
          "text": "助かる!"
        },
        {
          "speechId": 608,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4236799,
          "sourceEndMs": 4237699,
          "text": "助かる!"
        },
        {
          "speechId": 609,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4237699,
          "sourceEndMs": 4238900,
          "text": "渡しまーす!"
        },
        {
          "speechId": 610,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4238900,
          "sourceEndMs": 4240980,
          "text": "ありがとうございます!"
        },
        {
          "speechId": 611,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4240980,
          "sourceEndMs": 4242040,
          "text": "Thankyouverymuch!"
        },
        {
          "speechId": 612,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4242040,
          "sourceEndMs": 4242280,
          "text": "すごい!"
        },
        {
          "speechId": 613,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4242280,
          "sourceEndMs": 4243321,
          "text": "資材もいっぱい来てる!"
        },
        {
          "speechId": 614,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4243321,
          "sourceEndMs": 4245021,
          "text": "どんどん拾うわよ!"
        },
        {
          "speechId": 615,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4245021,
          "sourceEndMs": 4246521,
          "text": "取る取る取る!"
        },
        {
          "speechId": 616,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4246521,
          "sourceEndMs": 4246901,
          "text": "いいよ!"
        },
        {
          "speechId": 617,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4246901,
          "sourceEndMs": 4248482,
          "text": "ここに取るから!"
        },
        {
          "speechId": 618,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4248482,
          "sourceEndMs": 4249482,
          "text": "ここ取れるのか?"
        },
        {
          "speechId": 619,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4249482,
          "sourceEndMs": 4254543,
          "text": "空腹の雨より視界がぼやけてる今お魚焼いてるからね!"
        },
        {
          "speechId": 620,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4254543,
          "sourceEndMs": 4254763,
          "text": "頼む!"
        },
        {
          "speechId": 621,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4254763,
          "sourceEndMs": 4255583,
          "text": "焼けててくれ!"
        },
        {
          "speechId": 622,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4255583,
          "sourceEndMs": 4256263,
          "text": "お願い!"
        },
        {
          "speechId": 623,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4256263,
          "sourceEndMs": 4256563,
          "text": "いいよ!"
        },
        {
          "speechId": 624,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4256563,
          "sourceEndMs": 4256963,
          "text": "いいよ!"
        },
        {
          "speechId": 625,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4256963,
          "sourceEndMs": 4257604,
          "text": "焼けてる!"
        },
        {
          "speechId": 626,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4257604,
          "sourceEndMs": 4257844,
          "text": "助かる!"
        },
        {
          "speechId": 627,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4257844,
          "sourceEndMs": 4259964,
          "text": "ナイス!"
        },
        {
          "speechId": 628,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4263026,
          "sourceEndMs": 4264307,
          "text": "お味はいかがでしょうか?"
        },
        {
          "speechId": 629,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4264307,
          "sourceEndMs": 4289544,
          "text": "お味はですね、これ食べてアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアム"
        },
        {
          "speechId": 630,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4290094,
          "sourceEndMs": 4308985,
          "text": "なめんなよサメだからって撮影が高いえっとネット壊されちゃったなこれは痛えネットでもどうしようかなとりあえず気にしちゃいけない気にしちゃ負けだわあそういうこと?"
        },
        {
          "speechId": 631,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4308985,
          "sourceEndMs": 4319892,
          "text": "うんとりあえずちょっとお魚釣って食材多めに確保しといてOKあナマズ釣ったナマズあナマズいいよナマズいい食料"
        },
        {
          "speechId": 632,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4320114,
          "sourceEndMs": 4348870,
          "text": "いいよー盛りだくさんだからナマズはプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリ"
        },
        {
          "speechId": 633,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4350866,
          "sourceEndMs": 4354127,
          "text": "ここなんでできない?"
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
