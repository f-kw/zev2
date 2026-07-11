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
    "windowId": "window_12_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 1891194,
    "sourceEndMs": 2055081
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
      "promptSegmentCount": 24,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 271,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1891194,
          "sourceEndMs": 1896796,
          "text": "ロープ…あ、蝶津貝がないから小さいのでいいかオッケー?"
        },
        {
          "speechId": 272,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1896796,
          "sourceEndMs": 1904279,
          "text": "どうしようかな、ここら辺でいいか蝶津貝は金属のインゴットで作れるから小さいのでも作ったら一応オッケーちょっとしのいでね、ここでいいよ?"
        },
        {
          "speechId": 273,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1904279,
          "sourceEndMs": 1919384,
          "text": "こうやってこうやって、こうやって、こうやって木はこっちかこうやってワイワイランランラン"
        },
        {
          "speechId": 274,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1922483,
          "sourceEndMs": 1929850,
          "text": "ぬりぬりじゃんねえびっくりしたわ自分でも予想だにしないびっくりしたわそんなことある?"
        },
        {
          "speechId": 275,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1929850,
          "sourceEndMs": 1948666,
          "text": "蝶津貝あるじゃんあるよ蝶津貝あすまん箱にありますねこっちもあったないいよそれでそれはそれでいい水汲んでいこうあ水ねなんかねペットボトルみたいのがそういえばあったなあ作れるんだなこれで"
        },
        {
          "speechId": 276,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1950126,
          "sourceEndMs": 1957327,
          "text": "ブドウのベトベトいっぱい作ったからこれ作れるなやだーやだ?"
        },
        {
          "speechId": 277,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1957327,
          "sourceEndMs": 1958208,
          "text": "やなの?"
        },
        {
          "speechId": 278,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1958208,
          "sourceEndMs": 1965009,
          "text": "え、やだーいいねー女の心理みたいなそうそうそうそう難しいよな女ってえ、じゃあボトル作ろうから持ってく?"
        },
        {
          "speechId": 279,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1965009,
          "sourceEndMs": 1979632,
          "text": "あ、そうだね作ったほうがいいかなこれなもう一本作るかちょっと待ってもう一本作るからえ、プラスチックどっかでこれゴミ箱待てよえっと横のいや"
        },
        {
          "speechId": 280,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1980170,
          "sourceEndMs": 1997078,
          "text": "入れてる場所が適当すぎてさまあマジで見つけらんないんだよねわかるあとでちょっと整理するわしたいねあっボトル作った作ったあっありがたきしあわせはい置くねかたじけねよしここに水入れ散らかそうありがとう取り合いになっちゃうよこれあいいよいいよ持ってこうねこっぷり持ってるから2杯2杯入れる?"
        },
        {
          "speechId": 281,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1997078,
          "sourceEndMs": 1997578,
          "text": "2杯2杯?"
        },
        {
          "speechId": 282,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1997578,
          "sourceEndMs": 2009944,
          "text": "あっペットボトルおしゃれやんこれえデザインいいよね地味にいないよこれあ入れちゃったなくなったねちょっとなくなった新しく入れてとまあでもいったん2あれば足りるし"
        },
        {
          "speechId": 283,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2010702,
          "sourceEndMs": 2020369,
          "text": "そうねありがてぇなほんとご飯もちょっと持ってったほうがいいかもねあ、ご飯ね今ねクジラ肉…あ、違う食べ肉持ってるからそこなんで間違えるの?"
        },
        {
          "speechId": 284,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2020369,
          "sourceEndMs": 2023511,
          "text": "まじで食べ肉持ってるからね大丈夫行け?"
        },
        {
          "speechId": 285,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2023511,
          "sourceEndMs": 2026994,
          "text": "せんちゃんも持ってとよしこれで準備万端かな?"
        },
        {
          "speechId": 286,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2026994,
          "sourceEndMs": 2038802,
          "text": "行こうぞ行きますかよし行くぞーうちらいいね成長したねもう弓持って移動してんだよいやさすがよな強くなっちゃったこっち見ておっともたる"
        },
        {
          "speechId": 287,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2040950,
          "sourceEndMs": 2042391,
          "text": "なんか変装してる。"
        },
        {
          "speechId": 288,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2042391,
          "sourceEndMs": 2044813,
          "text": "なりこの変装ってこういうこと?"
        },
        {
          "speechId": 289,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2044813,
          "sourceEndMs": 2046774,
          "text": "嘘やな!"
        },
        {
          "speechId": 290,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2046774,
          "sourceEndMs": 2048896,
          "text": "行くぞ!"
        },
        {
          "speechId": 291,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2048896,
          "sourceEndMs": 2049416,
          "text": "イノシシ!"
        },
        {
          "speechId": 292,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2049416,
          "sourceEndMs": 2050617,
          "text": "やろうよ!"
        },
        {
          "speechId": 293,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2050617,
          "sourceEndMs": 2052759,
          "text": "え、これだってでも害なさそうだぜ。"
        },
        {
          "speechId": 294,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2052759,
          "sourceEndMs": 2055081,
          "text": "とか言ってたらやられるよな。"
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
