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
    "windowId": "window_16_qdczJpv8RCc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "qdczJpv8RCc",
    "sourceStartMs": 2280170,
    "sourceEndMs": 2549420
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
      "promptSegmentCount": 25,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 468,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2280170,
          "sourceEndMs": 2309518,
          "text": "いいよここには歴戦の重さしかいないみたい誰も死にゃ死ねー見よめっちゃいいやん言っとくけどマイリンの手札めっちゃ用だからねこれうわうわうわそういうことしちゃうんだこれ嘘やと思うスカイドレアさん?"
        },
        {
          "speechId": 469,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2310022,
          "sourceEndMs": 2326446,
          "text": "嘘だと思うよこれマリンライアーライアーだってマリンのほらノースノスも言っとるしマリンの手札を見るにこれは嘘やね100%嘘やってみ?"
        },
        {
          "speechId": 470,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2326446,
          "sourceEndMs": 2333848,
          "text": "やれるよこれさせるよライバルを減らしていこうほらね?"
        },
        {
          "speechId": 471,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2333848,
          "sourceEndMs": 2336609,
          "text": "ほらだからね?"
        },
        {
          "speechId": 472,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2336609,
          "sourceEndMs": 2339530,
          "text": "わかるんだから覚悟決めや"
        },
        {
          "speechId": 473,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2340530,
          "sourceEndMs": 2342711,
          "text": "シマシカさん?"
        },
        {
          "speechId": 474,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2342711,
          "sourceEndMs": 2345052,
          "text": "さよなら?"
        },
        {
          "speechId": 475,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2345052,
          "sourceEndMs": 2346832,
          "text": "耐えすぎ!"
        },
        {
          "speechId": 476,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2346832,
          "sourceEndMs": 2348893,
          "text": "なぁこれ全員耐えすぎだろ!"
        },
        {
          "speechId": 477,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2348893,
          "sourceEndMs": 2350453,
          "text": "おい!"
        },
        {
          "speechId": 478,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2350453,
          "sourceEndMs": 2352334,
          "text": "なんでこうフルパなんだよずっと!"
        },
        {
          "speechId": 479,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2352334,
          "sourceEndMs": 2358736,
          "text": "おかしいだろ!"
        },
        {
          "speechId": 480,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2358736,
          "sourceEndMs": 2369880,
          "text": "さぁ、ちらりキング、んーわんわんわんわんわんわんわんわんわんみょんみょんみょんみょんみょんみょんす!"
        },
        {
          "speechId": 481,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2369880,
          "sourceEndMs": 2370000,
          "text": "つり!"
        },
        {
          "speechId": 482,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2370362,
          "sourceEndMs": 2395745,
          "text": "ってあんたそれはそれはどうかと思いますけどそれはどうかと思いますけどねスリってことはほらノアスのスターそんなにうなずくってことはあなた3枚持ってるんですね3枚持ってるってスカイトレイラさん何枚持ってるこれもうしまう嘘だと思うねあれ信じるんだふーん"
        },
        {
          "speechId": 487,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2461834,
          "sourceEndMs": 2489860,
          "text": "耐えるぅ耐えるぅ耐えるね君たち耐えるじゃんめちゃくちゃにえーキングねどれなーんまあまあまあまあまあまあかな微妙といえば微妙ヤマリン思うんだよね"
        },
        {
          "speechId": 488,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2491122,
          "sourceEndMs": 2518454,
          "text": "これ初手からやってるんほーらもう首がぐるんぐるん泳いちゃってるじゃないですか慌てちゃったのあー君は嘘が下手くそみたいえいっライアー残念だけどバレバレなんだよねー君ねもうちょっと上手にやってくれないといくらなんでもバレバレやでこれ"
        },
        {
          "speechId": 489,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2521238,
          "sourceEndMs": 2523460,
          "text": "耐えるねなんで?"
        },
        {
          "speechId": 490,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2523460,
          "sourceEndMs": 2525541,
          "text": "なんで?"
        },
        {
          "speechId": 491,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2525541,
          "sourceEndMs": 2527703,
          "text": "え?"
        },
        {
          "speechId": 492,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2527703,
          "sourceEndMs": 2533187,
          "text": "ねえ誰も死なないんだけど決着つかない?"
        },
        {
          "speechId": 493,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2533187,
          "sourceEndMs": 2540653,
          "text": "なあ俺たち朝までやるんかこれこのメンバーで朝までやろうぜってこと?"
        },
        {
          "speechId": 494,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2540653,
          "sourceEndMs": 2548399,
          "text": "乗ってんなやる気だね見よああいいめっちゃえ?"
        },
        {
          "speechId": 495,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2548399,
          "sourceEndMs": 2548779,
          "text": "強!"
        },
        {
          "speechId": 496,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2548779,
          "sourceEndMs": 2549420,
          "text": "4枚もある"
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
