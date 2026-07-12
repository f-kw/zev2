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
    "windowId": "window_19_o8rZAhARXAc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "o8rZAhARXAc",
    "sourceStartMs": 7801179,
    "sourceEndMs": 8218519
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
      "promptSegmentCount": 29,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 835,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7801179,
          "sourceEndMs": 7829520,
          "text": "ちょっと今いけたかわかんなかった感じの流し打ち6流し打ち6か転がせ5のがいいのかしらどう思う君たち広角打法うわこいつチャンスFだった忘れたこいつチャンスFだったそうだったしまった"
        },
        {
          "speechId": 836,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7831275,
          "sourceEndMs": 7857973,
          "text": "流し6流し派ここは流し一流エラー持ちだから流しOKわかったエラー持ちだからね了解これさミートって対応でいいのかしらミートお任せの方がいいかしらお任せ?"
        },
        {
          "speechId": 837,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7857973,
          "sourceEndMs": 7858614,
          "text": "OKお任せな"
        },
        {
          "speechId": 846,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7920330,
          "sourceEndMs": 7948219,
          "text": "普通にうんうんボール多いなフォアボールなのかあ、打ったあ、いいじゃんいいじゃんよう転がっとる"
        },
        {
          "speechId": 847,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7954456,
          "sourceEndMs": 7956477,
          "text": "こういう感じに。"
        },
        {
          "speechId": 848,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7956477,
          "sourceEndMs": 7958739,
          "text": "えー。"
        },
        {
          "speechId": 849,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7958739,
          "sourceEndMs": 7964262,
          "text": "盗塁もありえるな。"
        },
        {
          "speechId": 850,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7964262,
          "sourceEndMs": 7965803,
          "text": "CCだもんね。"
        },
        {
          "speechId": 851,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7965803,
          "sourceEndMs": 7972726,
          "text": "さっきCCで行けたから盗塁もありだよな。"
        },
        {
          "speechId": 852,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7972726,
          "sourceEndMs": 7972866,
          "text": "うん。"
        },
        {
          "speechId": 853,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7972866,
          "sourceEndMs": 7974507,
          "text": "天野くん!"
        },
        {
          "speechId": 854,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7974507,
          "sourceEndMs": 7976588,
          "text": "盗塁する?"
        },
        {
          "speechId": 855,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7976588,
          "sourceEndMs": 7976909,
          "text": "これ。"
        },
        {
          "speechId": 856,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7976909,
          "sourceEndMs": 7979550,
          "text": "うん。"
        },
        {
          "speechId": 857,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7981290,
          "sourceEndMs": 7990495,
          "text": "行けっかなぁトルーイやれっかなぁ危ない?"
        },
        {
          "speechId": 858,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7990495,
          "sourceEndMs": 7996639,
          "text": "確かにこれでアウトになったらバカみたいが天野くんは死ないあれ?"
        },
        {
          "speechId": 859,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 7996639,
          "sourceEndMs": 8000761,
          "text": "マリン見るの間違えた?"
        },
        {
          "speechId": 860,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8000761,
          "sourceEndMs": 8007786,
          "text": "本田くんファイトは切るか意味ないか意味ないけど切るかファイトは"
        },
        {
          "speechId": 861,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8016753,
          "sourceEndMs": 8021035,
          "text": "絶対アウトにならん、余裕?"
        },
        {
          "speechId": 862,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8021035,
          "sourceEndMs": 8025338,
          "text": "絶対アウトに…ならん?"
        },
        {
          "speechId": 863,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8025338,
          "sourceEndMs": 8027279,
          "text": "ま?"
        },
        {
          "speechId": 864,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8027279,
          "sourceEndMs": 8028960,
          "text": "いける?"
        },
        {
          "speechId": 865,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8028960,
          "sourceEndMs": 8029040,
          "text": "ん?"
        },
        {
          "speechId": 866,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8029040,
          "sourceEndMs": 8039306,
          "text": "待って、切るな切っていい、切るな、あーあじゃあ延長4とっとく、OKOKとっとくわじゃあ、トルイして…するか、うん"
        },
        {
          "speechId": 885,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8160222,
          "sourceEndMs": 8175715,
          "text": "左もセンター返しキャージこれバーミアンなのかなキャージバーミアンなのかなこれバーミアンねえミートは?"
        },
        {
          "speechId": 886,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8175715,
          "sourceEndMs": 8177637,
          "text": "ミートは?"
        },
        {
          "speechId": 887,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8177637,
          "sourceEndMs": 8178378,
          "text": "多用のがいいかな"
        },
        {
          "speechId": 888,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8192339,
          "sourceEndMs": 8193300,
          "text": "アベレージヒッターですよお任せでいいんですか?"
        },
        {
          "speechId": 889,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 8193300,
          "sourceEndMs": 8218519,
          "text": "はいはいはいはいあ、お、おーはいはいそうですかそうですかそうですか今プルヒになった?"
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
