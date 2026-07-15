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
    "windowId": "window_07_qdczJpv8RCc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "qdczJpv8RCc",
    "sourceStartMs": 1083870,
    "sourceEndMs": 1241549
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
      "promptSegmentCount": 29,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 171,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1083870,
          "sourceEndMs": 1109960,
          "text": "早く出せよ早く出す出す出す出すバカ2枚もあるかってんだよボケ夏が待ってどうすんだっけライアーでしかないんだお前それライアーでしかないわけえ何全部で6枚え全部で6枚おどおどおどなんでそんなにいっぱい持ってんのそんなにいっぱい持ってるのおかしいと思うんだけどいや大丈夫食らわないマリンはね今まで一回もこれ食らったことないんだよな"
        },
        {
          "speechId": 172,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1110260,
          "sourceEndMs": 1126263,
          "text": "マリンはこれ食らったことないんだよノーダメやねん一旦6枚か運ゲーの覇者やねんコチトラ分かったか?"
        },
        {
          "speechId": 173,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1126263,
          "sourceEndMs": 1130104,
          "text": "待ってマリンのカードめっ強なんだけどいい?"
        },
        {
          "speechId": 174,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1130104,
          "sourceEndMs": 1137006,
          "text": "マジ強いよこれ言っとくけどどうしよう2枚"
        },
        {
          "speechId": 175,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1140230,
          "sourceEndMs": 1165954,
          "text": "言い出してまた間違えて出しちゃったもう出しちゃうとこあるよねちょっと待ってあれマリンさあ"
        },
        {
          "speechId": 176,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1172018,
          "sourceEndMs": 1175263,
          "text": "待って、どういうこと?"
        },
        {
          "speechId": 177,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1175263,
          "sourceEndMs": 1175604,
          "text": "え?"
        },
        {
          "speechId": 178,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1175604,
          "sourceEndMs": 1176005,
          "text": "え、待って!"
        },
        {
          "speechId": 179,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1176005,
          "sourceEndMs": 1176746,
          "text": "待って待って待って!"
        },
        {
          "speechId": 180,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1176746,
          "sourceEndMs": 1178769,
          "text": "ちょっと待って!"
        },
        {
          "speechId": 181,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1178769,
          "sourceEndMs": 1181995,
          "text": "そう、うるおるそろそろそろそそそそそいそいそいそい!"
        },
        {
          "speechId": 182,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1181995,
          "sourceEndMs": 1183377,
          "text": "そいそいそい!"
        },
        {
          "speechId": 183,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1183377,
          "sourceEndMs": 1183898,
          "text": "おーおーおー!"
        },
        {
          "speechId": 184,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1183898,
          "sourceEndMs": 1184920,
          "text": "覚悟決まったか?"
        },
        {
          "speechId": 185,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1186202,
          "sourceEndMs": 1190486,
          "text": "ほらもう、あと2分の1ってことだよね、弾がえぇぇぇぇぇ!"
        },
        {
          "speechId": 186,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1190486,
          "sourceEndMs": 1192648,
          "text": "?"
        },
        {
          "speechId": 187,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1192648,
          "sourceEndMs": 1193209,
          "text": "耐えすぎ!"
        },
        {
          "speechId": 188,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1193209,
          "sourceEndMs": 1197313,
          "text": "?"
        },
        {
          "speechId": 189,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1193209,
          "sourceEndMs": 1197313,
          "text": "?"
        },
        {
          "speechId": 190,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1197313,
          "sourceEndMs": 1197894,
          "text": "君耐えるね"
        },
        {
          "speechId": 191,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1200374,
          "sourceEndMs": 1205915,
          "text": "君こそが真の運ゲーの覇者?"
        },
        {
          "speechId": 192,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1205915,
          "sourceEndMs": 1208176,
          "text": "え、耐えすぎでしょ?"
        },
        {
          "speechId": 193,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1208176,
          "sourceEndMs": 1209616,
          "text": "4分の1?"
        },
        {
          "speechId": 194,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1209616,
          "sourceEndMs": 1228340,
          "text": "なんで4分の1で耐えってこれはね、これはあるわうん、出すよこれ本当にあるから出すねで待って、どうやってやるんだっけこうして"
        },
        {
          "speechId": 195,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1230002,
          "sourceEndMs": 1240508,
          "text": "でもさ、2枚出ししたらさ、これさ、嘘って言ってくると思うので、こうよこれ嘘だと思うじゃんこれ本当だから!"
        },
        {
          "speechId": 196,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1240508,
          "sourceEndMs": 1241109,
          "text": "これ本当だからね!"
        },
        {
          "speechId": 197,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1241109,
          "sourceEndMs": 1241489,
          "text": "この熱い振りで!"
        },
        {
          "speechId": 198,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1241489,
          "sourceEndMs": 1241529,
          "text": "ね!"
        },
        {
          "speechId": 199,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1241529,
          "sourceEndMs": 1241549,
          "text": "?"
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
