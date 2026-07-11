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
    "windowId": "window_26_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 4354127,
    "sourceEndMs": 4499672
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
      "promptSegmentCount": 30,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 634,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4354127,
          "sourceEndMs": 4359148,
          "text": "ここなんでできない?"
        },
        {
          "speechId": 635,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4359148,
          "sourceEndMs": 4362929,
          "text": "ティラピアかーここなんでできない?"
        },
        {
          "speechId": 636,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4362929,
          "sourceEndMs": 4367131,
          "text": "ここなんでできない?"
        },
        {
          "speechId": 637,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4367131,
          "sourceEndMs": 4367271,
          "text": "キメチ?"
        },
        {
          "speechId": 638,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4367271,
          "sourceEndMs": 4368391,
          "text": "ここなんでできない?"
        },
        {
          "speechId": 639,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4368391,
          "sourceEndMs": 4368991,
          "text": "あ、柱が足りない?"
        },
        {
          "speechId": 640,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4368991,
          "sourceEndMs": 4369611,
          "text": "こんなにあるのに?"
        },
        {
          "speechId": 641,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4369611,
          "sourceEndMs": 4370812,
          "text": "柱足りない?"
        },
        {
          "speechId": 642,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4370812,
          "sourceEndMs": 4379194,
          "text": "うん、足りなかったしっかりした木の柱ダメじゃん何柱が足りない?"
        },
        {
          "speechId": 643,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4379194,
          "sourceEndMs": 4379694,
          "text": "何柱が?"
        },
        {
          "speechId": 644,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4382826,
          "sourceEndMs": 4385147,
          "text": "イノスケってさ柱ですか?"
        },
        {
          "speechId": 645,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4385147,
          "sourceEndMs": 4387227,
          "text": "イノスケは柱じゃないんじゃない?"
        },
        {
          "speechId": 646,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4387227,
          "sourceEndMs": 4394109,
          "text": "柱じゃないかここに1個いてこれでいけるかな?"
        },
        {
          "speechId": 647,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4394109,
          "sourceEndMs": 4401190,
          "text": "もう1個くらいいるか?"
        },
        {
          "speechId": 648,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4401190,
          "sourceEndMs": 4409592,
          "text": "水も作っといてこれ焼かなきゃなそういえば意外と板"
        },
        {
          "speechId": 649,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4411581,
          "sourceEndMs": 4412382,
          "text": "あ、ない?"
        },
        {
          "speechId": 650,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4412382,
          "sourceEndMs": 4426994,
          "text": "すぐ無くなってしまうよね分かる板拾いに海に落ちるわなんかワイルドないよ集め方今来ないっしょ多分今?"
        },
        {
          "speechId": 651,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4426994,
          "sourceEndMs": 4429195,
          "text": "樽が全然流れて来ないんだが?"
        },
        {
          "speechId": 652,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4429195,
          "sourceEndMs": 4434580,
          "text": "もうちょっと真っ直ぐ行けばねこれから樽が来ますよのムードがほんと?"
        },
        {
          "speechId": 653,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4434580,
          "sourceEndMs": 4436441,
          "text": "これで行けるかしら?"
        },
        {
          "speechId": 654,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4436441,
          "sourceEndMs": 4437202,
          "text": "結構集めたわ"
        },
        {
          "speechId": 655,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4438975,
          "sourceEndMs": 4439943,
          "text": "今度は木の板が足りなくなる"
        },
        {
          "speechId": 656,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4443842,
          "sourceEndMs": 4453370,
          "text": "ココネがイノカキで集めている全然サメ来ないよこれイノシシだ、イノカキでイノカキ?"
        },
        {
          "speechId": 657,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4453370,
          "sourceEndMs": 4455292,
          "text": "イノカキで集めてるほら!"
        },
        {
          "speechId": 658,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4455292,
          "sourceEndMs": 4456072,
          "text": "12枚!"
        },
        {
          "speechId": 659,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4456072,
          "sourceEndMs": 4469844,
          "text": "あ、入れとくわあそこにあっちに入れとくわこっち入れとくよOKあ、なんかヒヨコ拾ってるわヒヨコそう、結構拾うよね"
        },
        {
          "speechId": 660,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4470922,
          "sourceEndMs": 4484987,
          "text": "スクラップもいるってことよねこれさやべこれA型の人見たらイライラするやつかなこれえ、なに?"
        },
        {
          "speechId": 661,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4484987,
          "sourceEndMs": 4485567,
          "text": "大丈夫?"
        },
        {
          "speechId": 662,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4485567,
          "sourceEndMs": 4491629,
          "text": "大丈夫全然大したことじゃないよかったでも気になるなに?"
        },
        {
          "speechId": 663,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4491629,
          "sourceEndMs": 4499672,
          "text": "そこにパッケージ落としちゃったからあ、なるほどね拾ったわフフフナイスナイスフフフナイスフフフ"
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
