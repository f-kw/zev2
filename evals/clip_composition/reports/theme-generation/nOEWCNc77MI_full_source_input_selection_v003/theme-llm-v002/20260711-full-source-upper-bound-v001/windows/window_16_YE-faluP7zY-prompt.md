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
    "windowId": "window_16_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 2541381,
    "sourceEndMs": 2773337
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
          "speechId": 373,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2541381,
          "sourceEndMs": 2542721,
          "text": "え、すごいじゃん。"
        },
        {
          "speechId": 374,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2542721,
          "sourceEndMs": 2543802,
          "text": "すごーい。"
        },
        {
          "speechId": 375,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2543802,
          "sourceEndMs": 2544122,
          "text": "役に立ってる。"
        },
        {
          "speechId": 376,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2544122,
          "sourceEndMs": 2548704,
          "text": "待って、全然ないんだけど。"
        },
        {
          "speechId": 377,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2548704,
          "sourceEndMs": 2549944,
          "text": "壁にくっついてるのがそれか。"
        },
        {
          "speechId": 378,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2551246,
          "sourceEndMs": 2578983,
          "text": "ちょっと青っぽく光ったやつだよねわかってはいるんだよないよなでもな普通になんか全然サメも来ないし何これサメいないねいなくなったね安定してきたなEGM良すぎるな今ない船長の方消えたマジ?"
        },
        {
          "speechId": 379,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2580020,
          "sourceEndMs": 2594066,
          "text": "虫がいるわしも殺したいね朝になんないかな早く水飲もう汲んできてよかった水痛っ!"
        },
        {
          "speechId": 380,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2594066,
          "sourceEndMs": 2596987,
          "text": "マリンマリンどうした?"
        },
        {
          "speechId": 381,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2596987,
          "sourceEndMs": 2597527,
          "text": "どこにいるの?"
        },
        {
          "speechId": 382,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2597527,
          "sourceEndMs": 2598908,
          "text": "どこになっちゃいました?"
        },
        {
          "speechId": 383,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2598908,
          "sourceEndMs": 2600108,
          "text": "死んだ?"
        },
        {
          "speechId": 384,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2600108,
          "sourceEndMs": 2604190,
          "text": "まだギリギリでも死んだギリギリ生きてる生きてるどこにいるの?"
        },
        {
          "speechId": 385,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2604190,
          "sourceEndMs": 2609792,
          "text": "生き残った食べてね食べるわいやそれ怖いよな"
        },
        {
          "speechId": 386,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2610000,
          "sourceEndMs": 2639126,
          "text": "それなーこのHPは満身創痍味が溢れてる気をつけてちょっとこれは不安だなーこのHPだとちょっとあれだななんか木でも伐採してようんあれ斧そうめっちゃ減るんだよねめっちゃ減ったわちょっと地上担当になろう一旦ね一旦一旦いやでもそれ大事よ危機回避"
        },
        {
          "speechId": 387,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2643144,
          "sourceEndMs": 2648288,
          "text": "踊るの好きなの?"
        },
        {
          "speechId": 388,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2648288,
          "sourceEndMs": 2659636,
          "text": "あ、イカラの下にサメいたわあ、そこにいたんだあの鳥マジで慣れてきた、サメ見てもあ、もう何とも思わなくなってきた?"
        },
        {
          "speechId": 389,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2659636,
          "sourceEndMs": 2669504,
          "text": "あ、サメかっているよ、いる、ここ、ここ、みたいなラフト末期ですねマジかちょっと水"
        },
        {
          "speechId": 390,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2670678,
          "sourceEndMs": 2690032,
          "text": "水を入れて入れてココナッツ助かるな自然の恵みに感謝自然ってさ尊いよな壮大なテーマの話が尊すぎるよそうだね今イカだ?"
        },
        {
          "speechId": 391,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2690032,
          "sourceEndMs": 2697757,
          "text": "今イカだでね水と組んで新しいのやって鉱石を入れておくわこっちにいいね"
        },
        {
          "speechId": 392,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2701871,
          "sourceEndMs": 2729824,
          "text": "今度という今度こそ殺そうイノシシ今日こそ今日という今日こそしなべししどんししじるしししちゅうをやりましょうあ、帰ってきたじゃん帰ってきた一回ちょっとHPの減りも凄まじかったのでえーと粘土ちょっとこう合体してとあとはサメの餌作ろう"
        },
        {
          "speechId": 393,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2731943,
          "sourceEndMs": 2759704,
          "text": "何を今からするかというと目的が次々変わってるんだよねわかる一つに絞らないとね何からやろうか今日の目標は船の2階を監視させたいみたいなそうなんだよさせたいんだけどさ大きい島を見つけてはしゃいじゃったところあるよね"
        },
        {
          "speechId": 394,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2760566,
          "sourceEndMs": 2761847,
          "text": "じゃあ行きますか!"
        },
        {
          "speechId": 395,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2761847,
          "sourceEndMs": 2764729,
          "text": "イノシシ狩りしますか!"
        },
        {
          "speechId": 396,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2764729,
          "sourceEndMs": 2772056,
          "text": "行きますかね狩ろう!"
        },
        {
          "speechId": 397,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2772056,
          "sourceEndMs": 2773337,
          "text": "狩るぞー!"
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
