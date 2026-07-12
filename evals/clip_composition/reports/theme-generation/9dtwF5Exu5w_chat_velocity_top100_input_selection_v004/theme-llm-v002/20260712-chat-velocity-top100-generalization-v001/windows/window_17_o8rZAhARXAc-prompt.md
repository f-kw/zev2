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
    "windowId": "window_17_o8rZAhARXAc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "o8rZAhARXAc",
    "sourceStartMs": 7006574,
    "sourceEndMs": 7378797
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
      "promptSegmentCount": 15,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 762,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7006574,
          "sourceEndMs": 7006694,
          "text": "あ、これは!"
        },
        {
          "speechId": 763,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7006694,
          "sourceEndMs": 7006874,
          "text": "いやいやいや!"
        },
        {
          "speechId": 764,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7006874,
          "sourceEndMs": 7007135,
          "text": "ナイスナイスナイス!"
        },
        {
          "speechId": 765,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7007135,
          "sourceEndMs": 7018038,
          "text": "オーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオーケーオ"
        },
        {
          "speechId": 770,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7082530,
          "sourceEndMs": 7082950,
          "text": "やだわーどうしよう数字が微妙でまだ同点?"
        },
        {
          "speechId": 771,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7082950,
          "sourceEndMs": 7109422,
          "text": "んーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーー"
        },
        {
          "speechId": 772,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7112831,
          "sourceEndMs": 7137334,
          "text": "お前を信じてるマリンはいやーまずいかこれお前は何やってるー天野てめーお前が腰へ勝ちたいって言うからお前にいっぱい青徳取っといてなんだてめー天野天野てめーマジで許せねー天野許せない"
        },
        {
          "speechId": 780,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7262158,
          "sourceEndMs": 7286557,
          "text": "アイリス守備職人やお前は4対2パイレーツ2点をリードされていますやばいか2点返せるか2点1アウト1二塁パイレーツここはなんとか追いつきたい1アウトランナー1塁2塁という場面でバッターは2年生犬神一旦強心臓よなここはさあ持ち前の強心臓"
        },
        {
          "speechId": 781,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7291087,
          "sourceEndMs": 7317210,
          "text": "ま、転がせていいよねこれは転がせていいよなここはな5だしうーんオーケーな、ファウルうーん"
        },
        {
          "speechId": 782,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7322792,
          "sourceEndMs": 7346270,
          "text": "おーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーー"
        },
        {
          "speechId": 783,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7353796,
          "sourceEndMs": 7355797,
          "text": "うんうんうんスクイーズは怖い?"
        },
        {
          "speechId": 784,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7355797,
          "sourceEndMs": 7355857,
          "text": "ない?"
        },
        {
          "speechId": 785,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7355857,
          "sourceEndMs": 7367628,
          "text": "ないかはいはいはい満塁だから?"
        },
        {
          "speechId": 786,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7367628,
          "sourceEndMs": 7378157,
          "text": "1点ずつ行きたいのはある2点負けてスクイーズちょっと?"
        },
        {
          "speechId": 787,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7378157,
          "sourceEndMs": 7378797,
          "text": "んーなるほど"
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
