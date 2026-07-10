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
    "windowId": "window_07_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 6558467,
    "sourceEndMs": 9779864
  },
  "sources": [
    {
      "sourceVideoId": "YE-faluP7zY",
      "sourceUrl": "https://www.youtube.com/watch?v=YE-faluP7zY",
      "sourceTitle": "【Raft】ころね、キミさえいればこの海の果てまでだって──【ホロライブ/宝鐘マリン】",
      "transcriptKind": "local_stt",
      "language": "ja-JP",
      "rawSegmentCount": 8039,
      "promptSegmentCount": 24,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 131,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6558467,
          "sourceEndMs": 6569832,
          "text": "確かに、こうやって見ると間違いなくそうだな下でペットボトルで持って行くあ、なるほどね、じゃあこれを確かにペットボトルでいいか、こうしてあ、こうやってね"
        },
        {
          "speechId": 132,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6721494,
          "sourceEndMs": 6722755,
          "text": "なんで?"
        },
        {
          "speechId": 133,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6722755,
          "sourceEndMs": 6723455,
          "text": "どうして?"
        },
        {
          "speechId": 134,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6723455,
          "sourceEndMs": 6724796,
          "text": "どこで?"
        },
        {
          "speechId": 135,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6724796,
          "sourceEndMs": 6749852,
          "text": "今普通に殺してたらやったすごいじゃんやりました壁作ったらさ頭飾れるもんねそう飾ろう飾ろう適当にさ適当じゃないすげーだって周りに言ってたじゃん君たちラグを考慮してコメントしなさいよって言ったじゃんそれは王将海賊"
        },
        {
          "speechId": 136,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6870114,
          "sourceEndMs": 6881063,
          "text": "じわじわ送るよなオッケー何を拾ったかと言いますとあ、レシピとネジとあ、いいじゃんネジあ、でもしょうもないなそれぐらいか?"
        },
        {
          "speechId": 137,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6881063,
          "sourceEndMs": 6883925,
          "text": "あ、それぐらいかまあまあまあ板20枚入ってたの?"
        },
        {
          "speechId": 138,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6883925,
          "sourceEndMs": 6890751,
          "text": "あ、いいじゃんおいしいね助かるねおいしいおいしいあ、じゃあさどうしようか板さここに全部しまう?"
        },
        {
          "speechId": 139,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6890751,
          "sourceEndMs": 6896756,
          "text": "あ、そうだなんか上からさなんか使う資材順みたいなあ、じゃあ一番上板にする?"
        },
        {
          "speechId": 140,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6896756,
          "sourceEndMs": 6898637,
          "text": "そうやねん使う資材順にちょっと入れていくかオッケー"
        },
        {
          "speechId": 141,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8370340,
          "sourceEndMs": 8389575,
          "text": "さすがマリン待って木のとこに葉っぱ入ってるけど葉っぱいいんだっけここに入れといて木のとこにあうん木葉っぱロープは一緒の区分にしてでもさ木さいっぱい入れるからさ葉っぱで溢れちゃうよそんなにあんの?"
        },
        {
          "speechId": 142,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8389575,
          "sourceEndMs": 8392918,
          "text": "まだないけどさないならいいじゃねえかよ"
        },
        {
          "speechId": 143,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8394146,
          "sourceEndMs": 8396915,
          "text": "未来、未来の話をしてるでしょ?"
        },
        {
          "speechId": 144,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8396915,
          "sourceEndMs": 8399703,
          "text": "そんな溢れるほど気取れないと思います"
        },
        {
          "speechId": 145,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9690066,
          "sourceEndMs": 9695807,
          "text": "ないかななんかいいやつベッドの上位互換は旅館?"
        },
        {
          "speechId": 146,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9695807,
          "sourceEndMs": 9697147,
          "text": "旅館?"
        },
        {
          "speechId": 147,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9697147,
          "sourceEndMs": 9703529,
          "text": "結構上がってるよねスケールがベッドの上位互換はないんじゃん?"
        },
        {
          "speechId": 148,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9703529,
          "sourceEndMs": 9706129,
          "text": "まだできないだけであるかな?"
        },
        {
          "speechId": 149,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9706129,
          "sourceEndMs": 9712390,
          "text": "旗も立てたいねハンモックとかもいいねこれさマリリンこれ絵描けるようになるんじゃないの?"
        },
        {
          "speechId": 150,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9712390,
          "sourceEndMs": 9717291,
          "text": "これペイントもささっきさ出たしさどうなんだ確かにえ?"
        },
        {
          "speechId": 151,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9717291,
          "sourceEndMs": 9719232,
          "text": "旗にさ絵描けちゃうんじゃねーのこれ?"
        },
        {
          "speechId": 152,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9750066,
          "sourceEndMs": 9777863,
          "text": "作るしかないよな作るしかないカーテンもいいねカーテンかカーテンもいいやいいよねあれだなまずドアをこういうドア作ってそこにカーテンをつけてサメさん待っていいないいねいいじゃん夢膨らむねでもやっぱある程度のさ壁をガーって囲ってある程度の吹き抜け感はやっぱ欲しいよね吹き抜け?"
        },
        {
          "speechId": 153,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9777863,
          "sourceEndMs": 9778763,
          "text": "えでもいいんじゃない?"
        },
        {
          "speechId": 154,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9778763,
          "sourceEndMs": 9779864,
          "text": "吹き抜けいらないんじゃないの"
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
