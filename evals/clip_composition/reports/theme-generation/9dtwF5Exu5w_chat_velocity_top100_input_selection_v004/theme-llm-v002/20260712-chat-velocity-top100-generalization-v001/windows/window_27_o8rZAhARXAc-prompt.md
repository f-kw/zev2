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
    "windowId": "window_27_o8rZAhARXAc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "o8rZAhARXAc",
    "sourceStartMs": 11223006,
    "sourceEndMs": 11789446
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
          "speechId": 1270,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11223006,
          "sourceEndMs": 11235132,
          "text": "何も書いてなくて分かんにゃいうん、じゃあ総合ね、分かった、はいあ、もう今?"
        },
        {
          "speechId": 1271,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11235132,
          "sourceEndMs": 11236172,
          "text": "今買い物?"
        },
        {
          "speechId": 1272,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11236172,
          "sourceEndMs": 11236312,
          "text": "もう今?"
        },
        {
          "speechId": 1273,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11236312,
          "sourceEndMs": 11236873,
          "text": "もう今なの?"
        },
        {
          "speechId": 1274,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11236873,
          "sourceEndMs": 11242335,
          "text": "もう分かった、今ね何買おう君たち何があったらいいかな?"
        },
        {
          "speechId": 1275,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11242335,
          "sourceEndMs": 11246037,
          "text": "何があったらいいと思う?"
        },
        {
          "speechId": 1276,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11246037,
          "sourceEndMs": 11248178,
          "text": "これ何買おう"
        },
        {
          "speechId": 1277,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11261110,
          "sourceEndMs": 11277872,
          "text": "お褒めないお褒め自分探し"
        },
        {
          "speechId": 1291,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11400970,
          "sourceEndMs": 11428900,
          "text": "打ち気にするチャレンジとか緩和極意は1個ある1個だけど500円あるあとあと500円ある何がいいかな"
        },
        {
          "speechId": 1292,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11430022,
          "sourceEndMs": 11432764,
          "text": "変更とか?"
        },
        {
          "speechId": 1293,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11432764,
          "sourceEndMs": 11435126,
          "text": "強化極意も1個あると便利?"
        },
        {
          "speechId": 1294,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11435126,
          "sourceEndMs": 11439649,
          "text": "強化極意にする?"
        },
        {
          "speechId": 1295,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11439649,
          "sourceEndMs": 11441990,
          "text": "1個スケヘンがいいかな?"
        },
        {
          "speechId": 1296,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11441990,
          "sourceEndMs": 11448095,
          "text": "あれがいいと思うスケヘン?"
        },
        {
          "speechId": 1297,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11448095,
          "sourceEndMs": 11449215,
          "text": "スケヘン?"
        },
        {
          "speechId": 1298,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11449215,
          "sourceEndMs": 11458001,
          "text": "うんじゃあスケヘンにするか多項調査とか引けるかもしんないもんね自分探しもう1個?"
        },
        {
          "speechId": 1299,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11458001,
          "sourceEndMs": 11458582,
          "text": "どっちにしよう"
        },
        {
          "speechId": 1306,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11526771,
          "sourceEndMs": 11549880,
          "text": "そうスワがいなくなっちゃうから出ると限らんけどやらないといないままだからでもいやでも占い師もいるからそんなに占い師もいるからそんなに買いまくる必要ないのか占い師もいるのにそんなに買いまくる必要ないのかな"
        },
        {
          "speechId": 1307,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11552570,
          "sourceEndMs": 11568079,
          "text": "スケヘンのがいいかぁ一旦…うーん…はどっちだろう?"
        },
        {
          "speechId": 1308,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11568079,
          "sourceEndMs": 11569500,
          "text": "キャッチどっちがいると思う?"
        },
        {
          "speechId": 1309,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11569500,
          "sourceEndMs": 11571741,
          "text": "スケヘンもガチャだ、そうだね、スケヘンもガチャだふんふんふんふんふん"
        },
        {
          "speechId": 1318,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11701322,
          "sourceEndMs": 11722274,
          "text": "次BでしたBBかーということではいいったんね打ち気ガチャしとく?"
        },
        {
          "speechId": 1319,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11722274,
          "sourceEndMs": 11722674,
          "text": "今?"
        },
        {
          "speechId": 1320,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11722674,
          "sourceEndMs": 11729378,
          "text": "いやいや次回にしとくわ次回にうんはい次回正確ガチャと"
        },
        {
          "speechId": 1321,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11730322,
          "sourceEndMs": 11759740,
          "text": "甲子園大会2回戦でやっていこうと思います次回の予定を発表したいと思います9月24日今日は24日なので明日の明日のホロコー配信はみこちになっています明日はみこちそしてマリンの次回はですね9月28日から"
        },
        {
          "speechId": 1322,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 11763275,
          "sourceEndMs": 11789446,
          "text": "次回9月28日になっていますはいよろしくお願いいたしますですねはいてなわけではい4日後次回もいっぱいアドバイスよろしくお願いしますセーブして終了してキメジの心を安定させてそれではどうも"
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
