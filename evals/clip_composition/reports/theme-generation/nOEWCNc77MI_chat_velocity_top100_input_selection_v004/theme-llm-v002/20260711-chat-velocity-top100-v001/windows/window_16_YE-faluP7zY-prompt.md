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
    "sourceStartMs": 3467816,
    "sourceEndMs": 3903595
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
          "speechId": 503,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3467816,
          "sourceEndMs": 3479844,
          "text": "斧いいよあーマジで死ぬかと思ったほら笑われすぎてえやばいマリリンちょっと待ってマジでさ食材なくなったけどあ食材なんて"
        },
        {
          "speechId": 504,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3480134,
          "sourceEndMs": 3485956,
          "text": "全ての食材を船長が今握ってるからねねーすごいな、シェフ?"
        },
        {
          "speechId": 505,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3485956,
          "sourceEndMs": 3488676,
          "text": "シェフだの?"
        },
        {
          "speechId": 506,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3488676,
          "sourceEndMs": 3492397,
          "text": "シェフじゃないんだけどすごいんだけどお腹減ってんの?"
        },
        {
          "speechId": 507,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3492397,
          "sourceEndMs": 3495718,
          "text": "今今、じゃあ肉食べていいか?"
        },
        {
          "speechId": 508,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3495718,
          "sourceEndMs": 3509062,
          "text": "勝手にえ、肉食べ…じゃあ魚さ、魚返すから魚食べてよ魚なんでそんな肉そんな温存しようとしてねここだという時に一緒に食べようよはい、これはい、拾って、これ"
        },
        {
          "speechId": 509,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3510000,
          "sourceEndMs": 3511621,
          "text": "ありがとういいよこんなくれるの?"
        },
        {
          "speechId": 510,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3511621,
          "sourceEndMs": 3519167,
          "text": "うんいいよちょっと逆にそんなに握ってんじゃねーよって話あ待って斧あれだ板がなくてさー斧作れない板ない?"
        },
        {
          "speechId": 511,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3519167,
          "sourceEndMs": 3519708,
          "text": "板?"
        },
        {
          "speechId": 512,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3519708,
          "sourceEndMs": 3522750,
          "text": "うんほらー!"
        },
        {
          "speechId": 513,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3530322,
          "sourceEndMs": 3538601,
          "text": "こうね板ね13枚入ってるポニーあーあーオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケ"
        },
        {
          "speechId": 514,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3540827,
          "sourceEndMs": 3552518,
          "text": "よしじゃあ行こうかあれやってるよなに?"
        },
        {
          "speechId": 515,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3552518,
          "sourceEndMs": 3559384,
          "text": "ちょっとつもしちょっとつもし!"
        },
        {
          "speechId": 516,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3559384,
          "sourceEndMs": 3561126,
          "text": "そんな面白い"
        },
        {
          "speechId": 517,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3571274,
          "sourceEndMs": 3572334,
          "text": "違うことだね!"
        },
        {
          "speechId": 518,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3601814,
          "sourceEndMs": 3630000,
          "text": "えぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇ"
        },
        {
          "speechId": 519,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3630326,
          "sourceEndMs": 3630947,
          "text": "どこ行った?"
        },
        {
          "speechId": 520,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3630947,
          "sourceEndMs": 3634469,
          "text": "ここにいるねあれ?"
        },
        {
          "speechId": 521,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3634469,
          "sourceEndMs": 3659924,
          "text": "見つけた見つけたそこにいてそろりそろり肉食べよう肉食べようじゃん夜景の見えるレストランを私しましたお前その顔でイノシシの肉を持ってくるって"
        },
        {
          "speechId": 522,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3662551,
          "sourceEndMs": 3689086,
          "text": "じゃあ行きますよかんぱいかんぱい食べてる食べてるせーのあんまかゆくしねえじゃねえかなんでこんな温存したんだよ何も回復量変わらねえじゃねえかよ"
        },
        {
          "speechId": 523,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3696786,
          "sourceEndMs": 3719724,
          "text": "マジでマジ死ぬ笑いすぎてもうマジいっぱいの獅子やんこんなめっちゃ泣いてるし鼻水もいっぱい出てるし待って鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来て"
        },
        {
          "speechId": 557,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3900514,
          "sourceEndMs": 3903595,
          "text": "やめようちょっと待ってどこ行った?"
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
