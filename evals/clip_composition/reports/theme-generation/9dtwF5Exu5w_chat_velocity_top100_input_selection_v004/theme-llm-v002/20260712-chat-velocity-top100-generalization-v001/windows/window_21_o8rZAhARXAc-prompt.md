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
    "windowId": "window_21_o8rZAhARXAc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "o8rZAhARXAc",
    "sourceStartMs": 8305599,
    "sourceEndMs": 9539326
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
          "speechId": 925,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8305599,
          "sourceEndMs": 8309980,
          "text": "ツバはいつもマリンをドキドキさせてくれるツバお前はいつもマリン"
        },
        {
          "speechId": 926,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8310178,
          "sourceEndMs": 8322483,
          "text": "ドキドキさせてくれるなぁまぁ転がせかなぁ4うん転がせーですかねキャンチどう思う?"
        },
        {
          "speechId": 927,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8322483,
          "sourceEndMs": 8328165,
          "text": "普通に転がせでいいかなこれうん転よん?"
        },
        {
          "speechId": 928,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8328165,
          "sourceEndMs": 8333147,
          "text": "んーオッケオッケオッケこれねめっちゃ撃ってるほんとだ!"
        },
        {
          "speechId": 929,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8333147,
          "sourceEndMs": 8336089,
          "text": "めっちゃ撃ってる撃ってくれるさ"
        },
        {
          "speechId": 947,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8523287,
          "sourceEndMs": 8544513,
          "text": "ひっ…低め…低めかなぁ…んー…ダメか、盗塁…低めですかねぇ…うわぁー!"
        },
        {
          "speechId": 948,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8544513,
          "sourceEndMs": 8547674,
          "text": "うぉー…やーばい!"
        },
        {
          "speechId": 949,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8547674,
          "sourceEndMs": 8548974,
          "text": "まぁ外角行くしかないか…"
        },
        {
          "speechId": 950,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8553979,
          "sourceEndMs": 8574138,
          "text": "しーしーしーうわーやばいなこのままじゃ上位打線になっちゃうぞこれまずいかなーんー1点はしょうがないんー守備変えたほうがいいかなー"
        },
        {
          "speechId": 1003,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9126634,
          "sourceEndMs": 9146351,
          "text": "ミートビーパファイ低めしかないかなぁこれ低めしかないよねー低めしかないよねー同点同点なっちゃったねー低めしかないかここは他の数字的に"
        },
        {
          "speechId": 1004,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9150322,
          "sourceEndMs": 9152184,
          "text": "お、スーパーノヴァが撃たれた!"
        },
        {
          "speechId": 1005,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9152184,
          "sourceEndMs": 9152524,
          "text": "スーパーノヴァが撃たれたぞ!"
        },
        {
          "speechId": 1006,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9152524,
          "sourceEndMs": 9152604,
          "text": "ナイス!"
        },
        {
          "speechId": 1007,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9152604,
          "sourceEndMs": 9153025,
          "text": "青カインを救った!"
        },
        {
          "speechId": 1008,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9153025,
          "sourceEndMs": 9153125,
          "text": "ナイス!"
        },
        {
          "speechId": 1009,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9153125,
          "sourceEndMs": 9177566,
          "text": "さーて…ワンアウト連れ…うわー…引っ張り5かここまで2打席全力三振!"
        },
        {
          "speechId": 1010,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9186444,
          "sourceEndMs": 9187624,
          "text": "えぇー代打?"
        },
        {
          "speechId": 1011,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9187624,
          "sourceEndMs": 9206169,
          "text": "変えてーあ、ピッチャー変わってる、ほんとだ変わってるわクイックし、負けん代打出してーで、フブちゃんももう変えよう限界や、フブチやんはで、カエラに投げてもらううん"
        },
        {
          "speechId": 1012,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9213658,
          "sourceEndMs": 9239820,
          "text": "誰に打ってもらうかビブーかビブーかないっちゃん打ちそうなのは性能的にはビブーがいいかねうんうんうん負ける確かに変わっても負けない"
        },
        {
          "speechId": 1023,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9482230,
          "sourceEndMs": 9493714,
          "text": "転がせ3にするか転がします!"
        },
        {
          "speechId": 1024,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9493714,
          "sourceEndMs": 9496975,
          "text": "おお!"
        },
        {
          "speechId": 1025,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9496975,
          "sourceEndMs": 9499476,
          "text": "めっちゃ綺麗で転がるやん!"
        },
        {
          "speechId": 1026,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9499476,
          "sourceEndMs": 9501977,
          "text": "馬!"
        },
        {
          "speechId": 1027,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9501977,
          "sourceEndMs": 9505598,
          "text": "突然の代打で馬!"
        },
        {
          "speechId": 1028,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9505598,
          "sourceEndMs": 9509900,
          "text": "急に、急にチャンスになってきたやば、どうしよう急にチャンスになってきた"
        },
        {
          "speechId": 1029,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9511438,
          "sourceEndMs": 9516319,
          "text": "流し打ちが5突然のチャンス?"
        },
        {
          "speechId": 1030,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9516319,
          "sourceEndMs": 9538626,
          "text": "どうしようなこのチャンスをどうするべきかんー…ファーストエラーお祈り流し?"
        },
        {
          "speechId": 1031,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9538626,
          "sourceEndMs": 9539326,
          "text": "伝令?"
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
