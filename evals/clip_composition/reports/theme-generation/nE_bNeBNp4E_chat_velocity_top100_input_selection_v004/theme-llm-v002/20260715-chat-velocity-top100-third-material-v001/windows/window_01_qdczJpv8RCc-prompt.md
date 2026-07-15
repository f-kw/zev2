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
    "windowId": "window_01_qdczJpv8RCc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "qdczJpv8RCc",
    "sourceStartMs": 69676,
    "sourceEndMs": 392491
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
      "promptSegmentCount": 21,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 1,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 69676,
          "sourceEndMs": 77709,
          "text": "ご視聴ありがとうございました"
        },
        {
          "speechId": 2,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 148770,
          "sourceEndMs": 149980,
          "text": "ありますでしょうか"
        },
        {
          "speechId": 3,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 150802,
          "sourceEndMs": 171795,
          "text": "ちょっと変じゃないですかちょっと引っ越したから何もかもが意味不明になってますアホーイホロライブ沢木製本省海賊堂船長の本省まりぃですちょっととりあえずね今始めようとして見てるんですけどちょっと何もわからんわきまいち説明してくださいもう何もわからんきまいちー名前表示がバグったろでもわからんなんで?"
        },
        {
          "speechId": 4,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 171795,
          "sourceEndMs": 179980,
          "text": "きまいち何もわからんのでね今日はよろしくお願いしますちょっと音変かもしんないなんかいろいろねつないで"
        },
        {
          "speechId": 5,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 180122,
          "sourceEndMs": 209840,
          "text": "ようやくねお家から配信できるようになりましてえー引っ越しをしましてもうはちゃめちゃが推しをしています日本語は文字分けするあそういうことですはい今日はラジコンってこといや違いますよ今日一旦まずわからんから一旦教えてもらって慣れてきたら逆にこっちが君たちをラジコンにするいうことを聞かせるはいなんかキャラクターがね色々あったんですけどえーこのなんかねえ"
        },
        {
          "speechId": 6,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 210638,
          "sourceEndMs": 239780,
          "text": "なんだろちょっと女100人抱いてそうな斎藤これは100人抱いたけどやや枯れてきたみたいな犬この子は街で一番モテる女なんだろこれ豚なんか大事なところを大々的に"
        },
        {
          "speechId": 7,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 241123,
          "sourceEndMs": 244725,
          "text": "あ、こんなんいた?"
        },
        {
          "speechId": 8,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 244725,
          "sourceEndMs": 246586,
          "text": "増えた?"
        },
        {
          "speechId": 9,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 246586,
          "sourceEndMs": 265537,
          "text": "なんすかこれケンタロスここにハンコ注射の跡があるまあこの子がね一番マリンに似てるかなと感じたんでこの子にしようかなと思います本当にちょっと音変大丈夫すか?"
        },
        {
          "speechId": 10,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 265537,
          "sourceEndMs": 266978,
          "text": "どうすか?"
        },
        {
          "speechId": 11,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 266978,
          "sourceEndMs": 269500,
          "text": "これじゃないかな設定はさなんか分かんなくなっちゃって"
        },
        {
          "speechId": 12,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 270098,
          "sourceEndMs": 283122,
          "text": "ちょっと間違えてるかも変えてみますねこっちの可能性もあるなんか音変わったなこっちかもしんないはいさっきのが良かった?"
        },
        {
          "speechId": 13,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 283122,
          "sourceEndMs": 284302,
          "text": "音割れてる?"
        },
        {
          "speechId": 14,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 284302,
          "sourceEndMs": 287183,
          "text": "割れてる?"
        },
        {
          "speechId": 15,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 287183,
          "sourceEndMs": 299026,
          "text": "ちょくちょく直していきたいなと思いますじゃあこれやるのに下にこの画面の下にロビーIDっていうのが表示されていてこれで"
        },
        {
          "speechId": 16,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 300650,
          "sourceEndMs": 329600,
          "text": "みたいなんでクリックとコピーコピーしてじゃあマリンがこれさタイピング速度が試されてしまうと思うわけこんな長い数字の羅列さねボキ検定2級じゃないとこんなスピードで打てないと思うからマリンがここに貼ってあげるからこれをコピペして入れてくださいそしてえっとボイスチャットはえ"
        },
        {
          "speechId": 17,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 330810,
          "sourceEndMs": 336112,
          "text": "切ってくださいね切ってくださいもうちょっとよろしいですか?"
        },
        {
          "speechId": 18,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 336112,
          "sourceEndMs": 355498,
          "text": "はいじゃあこれを貼るからコピーして部屋にこれ部屋ってさもうできてんのかな聞きたいことがいっぱいある聞きたいことがいっぱいあるなここに部屋を貼りますでいいのかなこうじゃない?"
        },
        {
          "speechId": 19,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 355498,
          "sourceEndMs": 359780,
          "text": "きなりこれをコピペして入るんですいけるかな"
        },
        {
          "speechId": 20,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 360060,
          "sourceEndMs": 387118,
          "text": "できるかなちょっとやり方全然みんな即入ってきたなんだなんだみんなそのキャラで行くのか豚で行くのか一人だけ一人だけ枯れてきたみんな空気読んで合わしとるやん気まずい気まずいマリンもこれマリンだけ空気読めてないみたいになっとるかなすいませんなんかいや待てよ君たちが"
        },
        {
          "speechId": 21,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 390130,
          "sourceEndMs": 392491,
          "text": "マリってこと?"
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
