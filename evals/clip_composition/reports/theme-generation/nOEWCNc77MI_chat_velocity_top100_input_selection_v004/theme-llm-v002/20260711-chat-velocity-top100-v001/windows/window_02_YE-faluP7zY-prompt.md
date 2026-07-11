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
    "windowId": "window_02_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 330060,
    "sourceEndMs": 507883
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
      "promptSegmentCount": 22,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 22,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 330060,
          "sourceEndMs": 335402,
          "text": "おもろいおもろいいきなりすんごい冷めてる?"
        },
        {
          "speechId": 23,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 335402,
          "sourceEndMs": 359330,
          "text": "待ってとりあえずさこれさ島から出るかこれそうだね島からもう出つつ出ほうがいいよなあとちょっと紹介するよじゃあ船長がさ紹介していくねそうねちょっと変わってるもんねこれね皆さんお気づきでしょうか実はねあのリフォームをねいたしましたありがとうありがとうテンションありがとうちょっと今日今夜なんでねちょっとよく見えないからちょっと後にしましょうかじゃあ出発進行しましょう"
        },
        {
          "speechId": 24,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 360354,
          "sourceEndMs": 366756,
          "text": "あ、水捨てちゃったわあ、船長も水飲みたいあ、水あれこれ前回も使ってたっけ?"
        },
        {
          "speechId": 25,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 366756,
          "sourceEndMs": 389704,
          "text": "いいやつ使ってた、これは使ってたよこれ使ってたか一生懸命働いてる働いてるねずこ頑張ってるな働いてる働いてる仕事するんだぞという一生懸命やってるちょっとねずこが入れた水をどんどん飲んでとなんかやねんかねちょっと気に入っちゃったよ気に入っちゃったよねずこをこうしてとどうしようかなこれとりあえずちょっと潜ってみるわなんか"
        },
        {
          "speechId": 26,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 390874,
          "sourceEndMs": 391715,
          "text": "潜るの?"
        },
        {
          "speechId": 27,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 391715,
          "sourceEndMs": 396116,
          "text": "もう出発してるよこれスマソン?"
        },
        {
          "speechId": 28,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 396116,
          "sourceEndMs": 397197,
          "text": "スマソン?"
        },
        {
          "speechId": 29,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 397197,
          "sourceEndMs": 398798,
          "text": "綺麗だね!"
        },
        {
          "speechId": 30,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 398798,
          "sourceEndMs": 399158,
          "text": "ね!"
        },
        {
          "speechId": 31,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 399158,
          "sourceEndMs": 401559,
          "text": "夕焼けがピンク色だよ!"
        },
        {
          "speechId": 32,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 401559,
          "sourceEndMs": 404040,
          "text": "これ朝日じゃねーの?"
        },
        {
          "speechId": 33,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 404040,
          "sourceEndMs": 406341,
          "text": "朝日がピンク色だね!"
        },
        {
          "speechId": 34,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 406341,
          "sourceEndMs": 409602,
          "text": "なんか二人の心みたいじゃない?"
        },
        {
          "speechId": 35,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 409602,
          "sourceEndMs": 410102,
          "text": "どういうこと?"
        },
        {
          "speechId": 36,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 410102,
          "sourceEndMs": 414484,
          "text": "わからない誰の心みたい?"
        },
        {
          "speechId": 37,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 414484,
          "sourceEndMs": 415805,
          "text": "あったかいってこと?"
        },
        {
          "speechId": 38,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 415805,
          "sourceEndMs": 417406,
          "text": "なんかさ、こういう色じゃない?"
        },
        {
          "speechId": 39,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 417406,
          "sourceEndMs": 417946,
          "text": "私たちってさ"
        },
        {
          "speechId": 40,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 420358,
          "sourceEndMs": 438186,
          "text": "そうかもしれない悩んだそうなのそうだったかもしれねえナルト風のそうだったかもしれねえ朝になったんで皆さんに紹介していきたいと思いますこうねうろうろしてないであれをあげてくれよなどれ?"
        },
        {
          "speechId": 41,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 438186,
          "sourceEndMs": 449852,
          "text": "アンカー落としてるんだよね当然これ落としてる落としてる落としてるいきますよ飛び込んでったはいいきますよ"
        },
        {
          "speechId": 42,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 450034,
          "sourceEndMs": 461818,
          "text": "オラァイヨォォォォォォォォォォォォォォォォォォォォォォォォォォォォォォォォォ"
        },
        {
          "speechId": 43,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 482374,
          "sourceEndMs": 507883,
          "text": "まず紹介やってよ紹介誰がやるのこうなったらこちらの階段はテンテンテンテンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテー"
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
