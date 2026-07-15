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
    "windowId": "window_21_qdczJpv8RCc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "qdczJpv8RCc",
    "sourceStartMs": 3875096,
    "sourceEndMs": 4079940
  },
  "sources": [
    {
      "sourceVideoId": "qdczJpv8RCc",
      "sourceUrl": "https://www.youtube.com/watch?v=qdczJpv8RCc",
      "sourceTitle": "【Liar's Bar】キミたちと初見であそぶ！視聴者参加型【ホロライブ/宝鐘マリン】",
      "transcriptKind": "local_stt",
      "language": "ja-JP",
      "durationSec": 7760.401,
      "rawSegmentCount": 23963,
      "promptSegmentCount": 30,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 623,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3875096,
          "sourceEndMs": 3877058,
          "text": "マリンでしょ!"
        },
        {
          "speechId": 624,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3877058,
          "sourceEndMs": 3880239,
          "text": "やったー!"
        },
        {
          "speechId": 625,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3880239,
          "sourceEndMs": 3883902,
          "text": "ちょっとさ、ゲーム…わかった!"
        },
        {
          "speechId": 626,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3883902,
          "sourceEndMs": 3897990,
          "text": "ここで…いや、一旦1枚出そう一旦1枚出して、後から…え、じゃあポムさんは3期でもないの?"
        },
        {
          "speechId": 627,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3897990,
          "sourceEndMs": 3898590,
          "text": "4期?"
        },
        {
          "speechId": 628,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3900562,
          "sourceEndMs": 3907166,
          "text": "ゴキホロックスなに?"
        },
        {
          "speechId": 629,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3907166,
          "sourceEndMs": 3917232,
          "text": "リグロスハコウシ海外なに?"
        },
        {
          "speechId": 630,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3917232,
          "sourceEndMs": 3917893,
          "text": "ゲマズ!"
        },
        {
          "speechId": 631,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3917893,
          "sourceEndMs": 3929980,
          "text": "ゲマズ忘れたゲマズゲマズゲマズ忘れたわかったコロネあーコロネだゲマズ忘れた違う違う忘れたマリア"
        },
        {
          "speechId": 632,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3930130,
          "sourceEndMs": 3943540,
          "text": "でもゲマズ大好きやけど1,2,3,4って言ってたらさ忘れちゃうことってあるじゃんそういうことねじゃあポムさんはコロネの命を懸けてアンワンドンさんはマリの命を懸けるわけにはいかないからペコラの命を懸けて戦おう"
        },
        {
          "speechId": 633,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3963496,
          "sourceEndMs": 3985488,
          "text": "やるのかあーツッキさん星になるんかスイちゃんの命がかかってんのにたーてぼーくはほーしーどーく耐えていくナイス耐えマリンは誰の命かけてんの?"
        },
        {
          "speechId": 634,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3985488,
          "sourceEndMs": 3985889,
          "text": "は?"
        },
        {
          "speechId": 635,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3985889,
          "sourceEndMs": 3987910,
          "text": "マリンはマリンの命かけて戦ってるでしょ今"
        },
        {
          "speechId": 636,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3992102,
          "sourceEndMs": 4016766,
          "text": "ほーんまあこんなもんだよねーねーまあまあまあ一旦ねここは一旦迷いなく出していくよ君はでもさマリンがさ好きだったね"
        },
        {
          "speechId": 637,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4021783,
          "sourceEndMs": 4048866,
          "text": "なんか質問してみるか君が出してからするわトゥー出してきたからこれさやばいよポムさんがトゥー出してんのにさツッキさん"
        },
        {
          "speechId": 638,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4054668,
          "sourceEndMs": 4067554,
          "text": "さすがに本当か?"
        },
        {
          "speechId": 639,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4067554,
          "sourceEndMs": 4068855,
          "text": "なんだいその!"
        },
        {
          "speechId": 640,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4068855,
          "sourceEndMs": 4070015,
          "text": "ポムスさん!"
        },
        {
          "speechId": 641,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4070015,
          "sourceEndMs": 4071836,
          "text": "なんですかその態度は!"
        },
        {
          "speechId": 642,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4071836,
          "sourceEndMs": 4072316,
          "text": "やれ!"
        },
        {
          "speechId": 643,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4072316,
          "sourceEndMs": 4072757,
          "text": "やれ!"
        },
        {
          "speechId": 644,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4072757,
          "sourceEndMs": 4073097,
          "text": "やれ!"
        },
        {
          "speechId": 645,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4073097,
          "sourceEndMs": 4074978,
          "text": "じゃないんだよ!"
        },
        {
          "speechId": 646,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4074978,
          "sourceEndMs": 4075418,
          "text": "やれ!"
        },
        {
          "speechId": 647,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4075418,
          "sourceEndMs": 4075678,
          "text": "やれ!"
        },
        {
          "speechId": 648,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4075678,
          "sourceEndMs": 4076598,
          "text": "じゃないんだよ!"
        },
        {
          "speechId": 649,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4076598,
          "sourceEndMs": 4077579,
          "text": "おい!"
        },
        {
          "speechId": 650,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4077579,
          "sourceEndMs": 4079180,
          "text": "んだてめえその態度は!"
        },
        {
          "speechId": 651,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4079180,
          "sourceEndMs": 4079560,
          "text": "は?"
        },
        {
          "speechId": 652,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4079560,
          "sourceEndMs": 4079940,
          "text": "お前さ!"
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
