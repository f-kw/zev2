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
    "windowId": "window_03_o8rZAhARXAc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "o8rZAhARXAc",
    "sourceStartMs": 1113054,
    "sourceEndMs": 1829780
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
      "promptSegmentCount": 26,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 145,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1113054,
          "sourceEndMs": 1134218,
          "text": "フブちゃんっぽいテイスト入れて名前だけフブちゃんっぽくすればええやろそんな中身は粉落としだけど名前だけ白髪っぽくすればええやん"
        },
        {
          "speechId": 146,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1140130,
          "sourceEndMs": 1159536,
          "text": "ふわふわしっぽのごぼう星やごぼう星しっごぼう星ふわふわしっぽごぼう星シューティングスターエフェクトから考えようえ、え、え、え、これ?"
        },
        {
          "speechId": 147,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1159536,
          "sourceEndMs": 1162517,
          "text": "マリンボール?"
        },
        {
          "speechId": 148,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1162517,
          "sourceEndMs": 1169700,
          "text": "クレッセントムーンちょま、わからんマジ、マジわからんなにこれ、なにこれ、なにこれほんまわからんのだがよくだよマジで"
        },
        {
          "speechId": 149,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1172410,
          "sourceEndMs": 1184979,
          "text": "どれやホロウィッチの技目ええやんエフェクト必須なんだマリンボールってなる試し投げできる見れる?"
        },
        {
          "speechId": 150,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1184979,
          "sourceEndMs": 1189182,
          "text": "試し投げで分かったこう?"
        },
        {
          "speechId": 151,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1208286,
          "sourceEndMs": 1229880,
          "text": "こうかおー水が水がブシャーこれマリン船長っぽいなかなりどうやって帰るのこれ戻りたいやめるやめるそんな今から退部しますみたいなそんな憂鬱な"
        },
        {
          "speechId": 152,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1230886,
          "sourceEndMs": 1233048,
          "text": "雰囲気なの?"
        },
        {
          "speechId": 153,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1233048,
          "sourceEndMs": 1253121,
          "text": "終了でいいんだよね終了でいいんだよねクレッセントムーンとかなんかオシャじゃない?"
        },
        {
          "speechId": 154,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1253121,
          "sourceEndMs": 1254562,
          "text": "なんか知らんけど見るか"
        },
        {
          "speechId": 155,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1264678,
          "sourceEndMs": 1265459,
          "text": "よくない?"
        },
        {
          "speechId": 156,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1265459,
          "sourceEndMs": 1266200,
          "text": "これ?"
        },
        {
          "speechId": 157,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1266200,
          "sourceEndMs": 1270824,
          "text": "フブちゃんかもこれ白神さんっぽいえ、何それ?"
        },
        {
          "speechId": 158,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1270824,
          "sourceEndMs": 1284898,
          "text": "間違えたストレートだこれあ、これいいかも白神さんっぽいありかこれ第一候補第一候補で"
        },
        {
          "speechId": 159,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1292846,
          "sourceEndMs": 1314127,
          "text": "3つしかないんだ全力ストレートタイプも見てみるかこうして粉落としどれだったの?"
        },
        {
          "speechId": 160,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1314127,
          "sourceEndMs": 1315869,
          "text": "ん?"
        },
        {
          "speechId": 161,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1315869,
          "sourceEndMs": 1316129,
          "text": "これか?"
        },
        {
          "speechId": 162,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1316129,
          "sourceEndMs": 1317150,
          "text": "ショップでエフェクト変える?"
        },
        {
          "speechId": 168,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1391869,
          "sourceEndMs": 1394030,
          "text": "この4つ?"
        },
        {
          "speechId": 169,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1394030,
          "sourceEndMs": 1398233,
          "text": "この4つ?"
        },
        {
          "speechId": 170,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1398233,
          "sourceEndMs": 1398713,
          "text": "これは違う?"
        },
        {
          "speechId": 171,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1398713,
          "sourceEndMs": 1403435,
          "text": "変えればいいのか?"
        },
        {
          "speechId": 172,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1403435,
          "sourceEndMs": 1404036,
          "text": "変えればいいのか?"
        },
        {
          "speechId": 173,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1404036,
          "sourceEndMs": 1408718,
          "text": "こうこうやって?"
        },
        {
          "speechId": 174,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1418130,
          "sourceEndMs": 1439002,
          "text": "こうかこうかこうかこうかこうかこうかちょっと見てみるか新しくクレセントムーンフェスティバルタイプ見てみるわフェスティバルタイプでこう"
        },
        {
          "speechId": 207,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1800278,
          "sourceEndMs": 1829780,
          "text": "あと一人二人は投げるというのは投げるって感じ確かに栄冠中はフブちゃんしか投げてないけどって感じむずいどうしよう悩むなどうしようなうーんカエラはフォークあるからフォークでいいと思うんだよなただフブちゃんの変化球が微妙なのは"
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
