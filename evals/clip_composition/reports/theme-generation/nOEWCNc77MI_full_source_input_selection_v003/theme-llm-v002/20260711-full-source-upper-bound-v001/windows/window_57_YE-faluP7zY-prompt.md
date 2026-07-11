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
    "windowId": "window_57_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 9574159,
    "sourceEndMs": 9747763
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
          "speechId": 1444,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9574159,
          "sourceEndMs": 9575479,
          "text": "ど、どうかな?"
        },
        {
          "speechId": 1445,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9575479,
          "sourceEndMs": 9577739,
          "text": "え、めっちゃいいなこれ!"
        },
        {
          "speechId": 1446,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9577739,
          "sourceEndMs": 9579600,
          "text": "めっちゃいい!"
        },
        {
          "speechId": 1447,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9579600,
          "sourceEndMs": 9580620,
          "text": "え、ホント?"
        },
        {
          "speechId": 1448,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9580620,
          "sourceEndMs": 9583301,
          "text": "え、フェンスの塊なんだが!"
        },
        {
          "speechId": 1449,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9583301,
          "sourceEndMs": 9584001,
          "text": "マジで?"
        },
        {
          "speechId": 1450,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9584001,
          "sourceEndMs": 9585121,
          "text": "そうかな?"
        },
        {
          "speechId": 1451,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9585121,
          "sourceEndMs": 9599564,
          "text": "え、このさ、降りたところ、階段が終わる瞬間のとこにラグ…間に合わなかったね間に合わなかった毎回さ、このさ"
        },
        {
          "speechId": 1452,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9600182,
          "sourceEndMs": 9619695,
          "text": "あの、槍に切り替えるのにめっちゃ時間かかるんだよねわかる槍さえ持ってないやん、ちょ待ってな槍くらいは持っててほしいよわかるわかるわかりみが深い待ってよえっとちょ待ってよ、何すればいいの?"
        },
        {
          "speechId": 1453,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9619695,
          "sourceEndMs": 9627280,
          "text": "えっと水飲んでファイアポー!"
        },
        {
          "speechId": 1454,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9627280,
          "sourceEndMs": 9628061,
          "text": "なに?"
        },
        {
          "speechId": 1455,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9628061,
          "sourceEndMs": 9628942,
          "text": "ファイアポー!"
        },
        {
          "speechId": 1456,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9628942,
          "sourceEndMs": 9629402,
          "text": "この曲ね"
        },
        {
          "speechId": 1457,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9631062,
          "sourceEndMs": 9654935,
          "text": "横路ファイアボーイ一旦閉まって配置を決めようよしこれで槍を作るか、槍食料ボックスも必要かあ、食料ボックスね回収ネットもちょっと欲しいんけどな回収ネット増やしたいね増やしたいよなあ、ヤシの種いっぱいあった武器"
        },
        {
          "speechId": 1458,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9661998,
          "sourceEndMs": 9665779,
          "text": "上をロープと厚板何?"
        },
        {
          "speechId": 1459,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9665779,
          "sourceEndMs": 9676921,
          "text": "ごめんなよそういうことすんな間違えた間違えたロープと厚板2人で寝たら朝になるんかな?"
        },
        {
          "speechId": 1460,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9676921,
          "sourceEndMs": 9683323,
          "text": "あ、確かにねその説あったなそういえばねもう一個作る?"
        },
        {
          "speechId": 1461,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9683323,
          "sourceEndMs": 9689844,
          "text": "ベッドそうだね作ってもいいよねそろそろねめっちゃだってなんかベッドの上位互換"
        },
        {
          "speechId": 1462,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9690066,
          "sourceEndMs": 9695807,
          "text": "ないかななんかいいやつベッドの上位互換は旅館?"
        },
        {
          "speechId": 1463,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9695807,
          "sourceEndMs": 9697147,
          "text": "旅館?"
        },
        {
          "speechId": 1464,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9697147,
          "sourceEndMs": 9703529,
          "text": "結構上がってるよねスケールがベッドの上位互換はないんじゃん?"
        },
        {
          "speechId": 1465,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9703529,
          "sourceEndMs": 9706129,
          "text": "まだできないだけであるかな?"
        },
        {
          "speechId": 1466,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9706129,
          "sourceEndMs": 9712390,
          "text": "旗も立てたいねハンモックとかもいいねこれさマリリンこれ絵描けるようになるんじゃないの?"
        },
        {
          "speechId": 1467,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9712390,
          "sourceEndMs": 9717291,
          "text": "これペイントもささっきさ出たしさどうなんだ確かにえ?"
        },
        {
          "speechId": 1468,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9717291,
          "sourceEndMs": 9719232,
          "text": "旗にさ絵描けちゃうんじゃねーのこれ?"
        },
        {
          "speechId": 1469,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9721394,
          "sourceEndMs": 9747763,
          "text": "書いて欲しいわ棚とかもあるのか棚いいね今床に時間を置きしてるひよこたちをそうね椅子も作りたいしかもめっちゃコスト軽いいいやんクソ助かるさすがやんかめっちゃいいあ明かりいいちょっと作りたいものがまみれてきたよ今どうするよ"
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
