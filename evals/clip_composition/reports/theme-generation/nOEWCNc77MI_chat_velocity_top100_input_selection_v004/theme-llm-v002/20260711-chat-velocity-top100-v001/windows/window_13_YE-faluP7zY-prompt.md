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
    "windowId": "window_13_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 2853843,
    "sourceEndMs": 3026556
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
      "promptSegmentCount": 25,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 428,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2853843,
          "sourceEndMs": 2878230,
          "text": "ぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷり�"
        },
        {
          "speechId": 429,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2890914,
          "sourceEndMs": 2893495,
          "text": "アリー当てた?"
        },
        {
          "speechId": 430,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2893495,
          "sourceEndMs": 2902720,
          "text": "戻ろうか分かったあきらめをあきらめの逃げあきらめも大事だよこれまぁやったしねシシは肉とれた?"
        },
        {
          "speechId": 431,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2902720,
          "sourceEndMs": 2907082,
          "text": "肉肉とれたよナイス皮もとれたじゃん皮皮もとれた?"
        },
        {
          "speechId": 432,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2907082,
          "sourceEndMs": 2908743,
          "text": "皮?"
        },
        {
          "speechId": 433,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2908743,
          "sourceEndMs": 2910000,
          "text": "皮とれたよ皮研究し"
        },
        {
          "speechId": 434,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2910166,
          "sourceEndMs": 2916151,
          "text": "あ、そうねそうね、何か作れるかもしれない新しいのねぇやっぱ鳥気になる、殺すえ、殺す?"
        },
        {
          "speechId": 435,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2916151,
          "sourceEndMs": 2929702,
          "text": "え、死んじゃおうよマリーン任せろあ、待って行っちゃったかも行っちゃったか、いや来たか、いや行っちゃったか、いや来たか入れちゃったかちょっと待ってこれ構えたさ矢をそっと下ろしたい時はどうすればいいと思う?"
        },
        {
          "speechId": 436,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2929702,
          "sourceEndMs": 2932605,
          "text": "スクロールはどう?"
        },
        {
          "speechId": 437,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2932605,
          "sourceEndMs": 2934566,
          "text": "あ、一回でもさ地面に寄ったら?"
        },
        {
          "speechId": 438,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2934566,
          "sourceEndMs": 2938310,
          "text": "回収できるし痛っ"
        },
        {
          "speechId": 439,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2941666,
          "sourceEndMs": 2942086,
          "text": "いいでしょ?"
        },
        {
          "speechId": 440,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2942086,
          "sourceEndMs": 2942486,
          "text": "すごいでしょ?"
        },
        {
          "speechId": 441,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2942486,
          "sourceEndMs": 2945307,
          "text": "ナイス?"
        },
        {
          "speechId": 442,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2945307,
          "sourceEndMs": 2945887,
          "text": "ナイス?"
        },
        {
          "speechId": 443,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2945887,
          "sourceEndMs": 2957851,
          "text": "見てトッポこの中がスカスカなのはトッポって言わないからね中吸ったんよ多分先にトッポの中身だけ吸う?"
        },
        {
          "speechId": 444,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2957851,
          "sourceEndMs": 2964493,
          "text": "でもさ、もしかしたらレンジでチーしたらさトッポで中身が全部なくなってさ空洞を食べれるんじゃない?"
        },
        {
          "speechId": 445,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2964493,
          "sourceEndMs": 2967093,
          "text": "もしかしてマジ?"
        },
        {
          "speechId": 446,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2967093,
          "sourceEndMs": 2969014,
          "text": "やってみるかじゃあやってみよう"
        },
        {
          "speechId": 447,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2970690,
          "sourceEndMs": 2999444,
          "text": "ちょっと我々を代表してリスナーの皆さんぜひ挑戦してみてくださいよろしくお願いしますえっと待って弓矢がねちょっと誤報になっちゃってあ、皮研究しようかじゃあしてしてしてしてー研究しまーすどうやって研究するんだっけなあ、これだなまた食われたーあれ、どこだっけなあ、こうだなちょっと待ってくださいねー"
        },
        {
          "speechId": 448,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3000738,
          "sourceEndMs": 3004881,
          "text": "めっちゃさ、食われるダメに?"
        },
        {
          "speechId": 449,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3004881,
          "sourceEndMs": 3009904,
          "text": "あのね、船が食われてます大丈夫?"
        },
        {
          "speechId": 450,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3009904,
          "sourceEndMs": 3020432,
          "text": "大丈夫じゃないもう木がないから今探しに行くところ木が木じゃないね、そしたらねコーネがつまんないこと言うたびにさなんでそういうこと言うの?"
        },
        {
          "speechId": 451,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3020432,
          "sourceEndMs": 3025455,
          "text": "罰を与えたいよねねぇ、増えたよ?"
        },
        {
          "speechId": 452,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3025455,
          "sourceEndMs": 3026556,
          "text": "マリゾネス?"
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
