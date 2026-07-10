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
    "windowId": "window_04_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 1650098,
    "sourceEndMs": 2945887
  },
  "sources": [
    {
      "sourceVideoId": "YE-faluP7zY",
      "sourceUrl": "https://www.youtube.com/watch?v=YE-faluP7zY",
      "sourceTitle": "【Raft】ころね、キミさえいればこの海の果てまでだって──【ホロライブ/宝鐘マリン】",
      "transcriptKind": "local_stt",
      "language": "ja-JP",
      "rawSegmentCount": 8039,
      "promptSegmentCount": 22,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 65,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1650098,
          "sourceEndMs": 1674705,
          "text": "海になるからね海ってか海に入れるぐらいのね端っこだからね行けー砂浜だからでもこの辺だよねすまんよーしかもコーネの枠もないからマジでどこにいるかわかんない確かにあもうホントだねなーあれこれ渡ったかなーこの先コーネマリリン画面見てよマリリン画面マリリンあっそうねいやっ!"
        },
        {
          "speechId": 66,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1674705,
          "sourceEndMs": 1674985,
          "text": "あー大丈夫か!"
        },
        {
          "speechId": 67,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1674985,
          "sourceEndMs": 1675365,
          "text": "いや!"
        },
        {
          "speechId": 68,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1675365,
          "sourceEndMs": 1676285,
          "text": "ちょっと待って!"
        },
        {
          "speechId": 69,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1676285,
          "sourceEndMs": 1678906,
          "text": "イノシシというものありきりやばい!"
        },
        {
          "speechId": 70,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1678906,
          "sourceEndMs": 1679406,
          "text": "やばいなそれ"
        },
        {
          "speechId": 71,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1770426,
          "sourceEndMs": 1799772,
          "text": "なんだけどねでもまだね全然粘土もさっき見かけたしまだまだ何でもありそうではある申し訳ねーけどさほら今武器をさ手に入れたからねこれであればそうね弓ねせんきゅーベイブせんきゅーよしちょっと食べ物あーありがとう持ち歩いた方がいいかもね食べ物そうね待ってでもねちょっと残ってるこれ一個食べてこのねここのこのなんていうのあのさこのコンロじゃなくてなんだこれ洋コンロに近い"
        },
        {
          "speechId": 72,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1980170,
          "sourceEndMs": 1997078,
          "text": "入れてる場所が適当すぎてさまあマジで見つけらんないんだよねわかるあとでちょっと整理するわしたいねあっボトル作った作ったあっありがたきしあわせはい置くねかたじけねよしここに水入れ散らかそうありがとう取り合いになっちゃうよこれあいいよいいよ持ってこうねこっぷり持ってるから2杯2杯入れる?"
        },
        {
          "speechId": 73,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1997078,
          "sourceEndMs": 1997578,
          "text": "2杯2杯?"
        },
        {
          "speechId": 74,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1997578,
          "sourceEndMs": 2009944,
          "text": "あっペットボトルおしゃれやんこれえデザインいいよね地味にいないよこれあ入れちゃったなくなったねちょっとなくなった新しく入れてとまあでもいったん2あれば足りるし"
        },
        {
          "speechId": 75,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2010702,
          "sourceEndMs": 2020369,
          "text": "そうねありがてぇなほんとご飯もちょっと持ってったほうがいいかもねあ、ご飯ね今ねクジラ肉…あ、違う食べ肉持ってるからそこなんで間違えるの?"
        },
        {
          "speechId": 76,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2020369,
          "sourceEndMs": 2023511,
          "text": "まじで食べ肉持ってるからね大丈夫行け?"
        },
        {
          "speechId": 77,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2023511,
          "sourceEndMs": 2026994,
          "text": "せんちゃんも持ってとよしこれで準備万端かな?"
        },
        {
          "speechId": 78,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2026994,
          "sourceEndMs": 2038802,
          "text": "行こうぞ行きますかよし行くぞーうちらいいね成長したねもう弓持って移動してんだよいやさすがよな強くなっちゃったこっち見ておっともたる"
        },
        {
          "speechId": 79,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2401186,
          "sourceEndMs": 2410728,
          "text": "そんなほらよでもさ、あんな小せえのがさ倒すの苦労したからさ猪なんてさ、化け物レベルなんじゃないの?"
        },
        {
          "speechId": 80,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2410728,
          "sourceEndMs": 2414189,
          "text": "俺いや、猪きつそうだねどうやるの?"
        },
        {
          "speechId": 81,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2414189,
          "sourceEndMs": 2429652,
          "text": "絶対なでもさ、さっきと違って逃げていくんじゃなくて向かってくるわけだからさ確かになワンチャン当たりやすいかもね、エイム的にはワタメがBGMがフグ来てる、フグ来てるよ気をつけ、そっち殺されたからな、さっき"
        },
        {
          "speechId": 82,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2731943,
          "sourceEndMs": 2759704,
          "text": "何を今からするかというと目的が次々変わってるんだよねわかる一つに絞らないとね何からやろうか今日の目標は船の2階を監視させたいみたいなそうなんだよさせたいんだけどさ大きい島を見つけてはしゃいじゃったところあるよね"
        },
        {
          "speechId": 83,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2941666,
          "sourceEndMs": 2942086,
          "text": "いいでしょ?"
        },
        {
          "speechId": 84,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2942086,
          "sourceEndMs": 2942486,
          "text": "すごいでしょ?"
        },
        {
          "speechId": 85,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2942486,
          "sourceEndMs": 2945307,
          "text": "ナイス?"
        },
        {
          "speechId": 86,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2945307,
          "sourceEndMs": 2945887,
          "text": "ナイス?"
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
