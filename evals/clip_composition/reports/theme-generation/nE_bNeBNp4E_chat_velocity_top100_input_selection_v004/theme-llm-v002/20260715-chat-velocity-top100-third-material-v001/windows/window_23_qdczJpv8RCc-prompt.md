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
    "windowId": "window_23_qdczJpv8RCc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "qdczJpv8RCc",
    "sourceStartMs": 4311916,
    "sourceEndMs": 4649660
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
      "promptSegmentCount": 26,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 682,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4311916,
          "sourceEndMs": 4314197,
          "text": "生き残れ!"
        },
        {
          "speechId": 683,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4314197,
          "sourceEndMs": 4317179,
          "text": "おいおいおいおい!"
        },
        {
          "speechId": 684,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4317179,
          "sourceEndMs": 4318579,
          "text": "何本当に耐えて!"
        },
        {
          "speechId": 685,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4318579,
          "sourceEndMs": 4320000,
          "text": "全員死ぬとこでしょ!"
        },
        {
          "speechId": 686,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4326514,
          "sourceEndMs": 4346539,
          "text": "なんで全員耐えるんだよおかしいなあ2周目で出すか"
        },
        {
          "speechId": 687,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4357322,
          "sourceEndMs": 4366450,
          "text": "2キング?"
        },
        {
          "speechId": 688,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4366450,
          "sourceEndMs": 4375678,
          "text": "1キング1枚くらいは当然持っていますと3キングベッ!"
        },
        {
          "speechId": 689,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4375678,
          "sourceEndMs": 4375698,
          "text": "?"
        },
        {
          "speechId": 690,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4375678,
          "sourceEndMs": 4375698,
          "text": "?"
        },
        {
          "speechId": 691,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4383554,
          "sourceEndMs": 4409900,
          "text": "まあまあまあまあ、みんな一旦、一旦マリンまで回して一旦マリンまで回してこれはちょっと、くぅーくぅー"
        },
        {
          "speechId": 692,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4411602,
          "sourceEndMs": 4421190,
          "text": "空気読み空気読みみんな怖い?"
        },
        {
          "speechId": 693,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4421190,
          "sourceEndMs": 4423852,
          "text": "みんな一緒なら怖くないよ一味!"
        },
        {
          "speechId": 694,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4423852,
          "sourceEndMs": 4432378,
          "text": "そんな!"
        },
        {
          "speechId": 695,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4432378,
          "sourceEndMs": 4436922,
          "text": "よりによって一味が死んじゃった空気読みしてくれてたのに"
        },
        {
          "speechId": 696,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4445826,
          "sourceEndMs": 4464676,
          "text": "あそっかペコラの命ペコラさようならペコラペコラの命が尊きペコラの命がツッキさんはさスイちゃんのさどこが好きなの?"
        },
        {
          "speechId": 697,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4464676,
          "sourceEndMs": 4467517,
          "text": "歌?"
        },
        {
          "speechId": 698,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4467517,
          "sourceEndMs": 4469038,
          "text": "なんかうなずきが小さくない?"
        },
        {
          "speechId": 699,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4472619,
          "sourceEndMs": 4498470,
          "text": "愛が足りないんじゃないのドサクサに紛れてダストポムさんは浮気だよねスイちゃんはさ気にしないと思うけどさコロネは気にすると思うよなんでマリンの配信に入ってきちゃったのコロネスキーの置き手を知らないの他の女を見ちゃいけないんだよ"
        },
        {
          "speechId": 700,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4501366,
          "sourceEndMs": 4504548,
          "text": "あ、見ないようにしてんの?"
        },
        {
          "speechId": 701,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4504548,
          "sourceEndMs": 4505789,
          "text": "目をそらしてる!"
        },
        {
          "speechId": 702,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4505789,
          "sourceEndMs": 4510212,
          "text": "マリンを見ないようにしてる!"
        },
        {
          "speechId": 703,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4510212,
          "sourceEndMs": 4524421,
          "text": "見ないようにしてんだツッキさんさぁあのさぁ、思うんだけどさぁ星読みは自我を持っちゃいけないんだよ死んでね"
        },
        {
          "speechId": 704,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4541042,
          "sourceEndMs": 4559980,
          "text": "なるほどねー攻めの姿勢あんさ怪しいと思ってんのもしかしてでもさー言っとくけどさーこっちはさーコロネスキーの浮気に目を詰める"
        },
        {
          "speechId": 705,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4564807,
          "sourceEndMs": 4586514,
          "text": "コロネにコロネに言っちゃおうマリンのとこに遊びに来てたって言っちゃおう君ブロックされるんじゃないお願い死んでくないお願い耐えて耐えてLINEしちゃおうLINEしちゃおう言っちゃおう喜んでるなさては"
        },
        {
          "speechId": 706,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4590178,
          "sourceEndMs": 4619286,
          "text": "僕のことをコロさんに言ってほしいみたいなてめぇはしゃぎやがってじゃ報告しないお前を喜ばしたりしない一旦さサクサクやろうやサクサクこんな序盤でさ嘘つかんから普通に"
        },
        {
          "speechId": 707,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4623810,
          "sourceEndMs": 4649660,
          "text": "早く出して嘘だ嘘だ嘘だどんどこどーん嘘だやだ死んだくない死んだくない嫌だ嫌だ嫌だマリンが勝つのマリンが勝つのマリンしか勝たんなマリンしか勝たんな嫌だ嫌だ嫌だ死んだくない死にましーんマリンは死にましーんポムさんさああなたね"
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
