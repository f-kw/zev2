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
    "windowId": "window_14_qdczJpv8RCc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "qdczJpv8RCc",
    "sourceStartMs": 1603366,
    "sourceEndMs": 1887930
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
      "promptSegmentCount": 27,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 409,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1603366,
          "sourceEndMs": 1619350,
          "text": "ノスノスさんあなたのやり方がね完全にみんなにバレバレですよ読めて読めてきたあなたのやり方ね耐えるね君耐えるね耐えるじゃん"
        },
        {
          "speechId": 410,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1621138,
          "sourceEndMs": 1644128,
          "text": "しぶといじゃんマノスノスさんはここまで初手嘘を出し嘘をつき続けてきたがゆえにこればっかりは本当ってことだよねまあ本当だと思うけどねマリンは"
        },
        {
          "speechId": 411,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1651002,
          "sourceEndMs": 1675796,
          "text": "いやシマシカさんこれ紛れ込んでノスノスの注目に紛れ込んでさぁやってるよね今これ今なら今ならいけると思っとるよねこれマリンは本当ねちな"
        },
        {
          "speechId": 412,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1685398,
          "sourceEndMs": 1707274,
          "text": "なんですかその目はマリンは本当それは嘘くさいな嘘くさ嘘くさいと思うけどね"
        },
        {
          "speechId": 413,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1711215,
          "sourceEndMs": 1716478,
          "text": "いやマリンは信じてた!"
        },
        {
          "speechId": 414,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1716478,
          "sourceEndMs": 1738874,
          "text": "ノスノスさんのこと嘘つかないと思ったもんシマシカさんやっちゃったねやっちゃったね耐えたじゃん耐えるねなるほど耐えていくじゃんケーキ漬けに誰か死んだ方がいいと思うけどねマリンは"
        },
        {
          "speechId": 415,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1742930,
          "sourceEndMs": 1747574,
          "text": "どれどれ?"
        },
        {
          "speechId": 416,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1747574,
          "sourceEndMs": 1769414,
          "text": "なるほど悪くない感じだけどまあ一旦ねシマイシカさんは今打たれかけて震えてたからここで嘘はつかないと感じるねマリンはだがそう思ってあえてあえての"
        },
        {
          "speechId": 417,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1770646,
          "sourceEndMs": 1774188,
          "text": "やってるかもねこれ3?"
        },
        {
          "speechId": 418,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1774188,
          "sourceEndMs": 1783532,
          "text": "んなわけないなけない嘘つくな3枚も何?"
        },
        {
          "speechId": 419,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1783532,
          "sourceEndMs": 1784333,
          "text": "何?"
        },
        {
          "speechId": 420,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1784333,
          "sourceEndMs": 1799640,
          "text": "3枚もあるわけがないんだ3枚も持ってるわけないのに耐えろマリン大丈夫耐えろ耐えろ耐えろ大丈夫そうそうそうそうこのゲームの主はマリンなんだよ一発で死ねるか"
        },
        {
          "speechId": 421,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1803438,
          "sourceEndMs": 1806240,
          "text": "観るか観る?"
        },
        {
          "speechId": 422,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1806240,
          "sourceEndMs": 1806981,
          "text": "観る?"
        },
        {
          "speechId": 423,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1806981,
          "sourceEndMs": 1808442,
          "text": "観るまでパーン!"
        },
        {
          "speechId": 424,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1808442,
          "sourceEndMs": 1814967,
          "text": "何テーブルだっけ?"
        },
        {
          "speechId": 425,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1814967,
          "sourceEndMs": 1818850,
          "text": "一旦一周はさ普通にホントでやろうホントでね?"
        },
        {
          "speechId": 426,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1818850,
          "sourceEndMs": 1829258,
          "text": "あ、ま、ま、ま、まいっかまいっか間違えたけどこれガチこれはガチ"
        },
        {
          "speechId": 427,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1846248,
          "sourceEndMs": 1851512,
          "text": "3ってことはないんじゃ!"
        },
        {
          "speechId": 428,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1851512,
          "sourceEndMs": 1858878,
          "text": "でも、ノスノス嘘つきだからなねぇみんな、ノスノスさんって初手嘘つく癖あったよね?"
        },
        {
          "speechId": 429,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1861378,
          "sourceEndMs": 1876004,
          "text": "これ嘘だと思うよマリン3枚もさだよねシマシカさん覚悟決めや!"
        },
        {
          "speechId": 430,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1876004,
          "sourceEndMs": 1877785,
          "text": "覚悟決め!"
        },
        {
          "speechId": 431,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1877785,
          "sourceEndMs": 1880747,
          "text": "ね?"
        },
        {
          "speechId": 432,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1880747,
          "sourceEndMs": 1881907,
          "text": "頭数減らしてこうや!"
        },
        {
          "speechId": 433,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1881907,
          "sourceEndMs": 1884008,
          "text": "耐えるね!"
        },
        {
          "speechId": 434,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1884008,
          "sourceEndMs": 1885289,
          "text": "耐えるじゃん!"
        },
        {
          "speechId": 435,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1885289,
          "sourceEndMs": 1887930,
          "text": "なんでこいつらこんな耐えるん?"
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
