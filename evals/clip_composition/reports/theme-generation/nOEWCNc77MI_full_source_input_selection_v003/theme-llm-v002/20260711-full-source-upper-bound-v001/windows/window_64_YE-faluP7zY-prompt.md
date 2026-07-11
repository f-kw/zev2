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
    "windowId": "window_64_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 10860182,
    "sourceEndMs": 11017404
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
      "promptSegmentCount": 26,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 1609,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10860182,
          "sourceEndMs": 10889872,
          "text": "ひろたけどひよこみたいなやつあね棚作って飾るという手もあるかなと今考え中あいいねでも腹の足しにもなんねワイルドなあでもガチ目にそう今お腹減ってんだよねいっぱい焼いていっぱいではないけど入れてあるから取ってねありがとうねもらうねうんもらってもらってどんどんさどんどんどんどん作ってさ文明発達させていきたいっていうのにさもうお腹が減ったりさ邪魔が"
        },
        {
          "speechId": 1610,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10890274,
          "sourceEndMs": 10918263,
          "text": "ガール全然ダメなんだよなあよしこれ欲しい真ん中にまず明るさの確保が先かなそうねなんか電飾系のものがあったんだよいいね焚火台へえランタンスクラップでできるのか暖炉ほうほうほう暖炉いいねいいよね暖かいかもうん待ってでも粘土8個も使うわマジ?"
        },
        {
          "speechId": 1611,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10918263,
          "sourceEndMs": 10919524,
          "text": "ちょっとやめてほしい"
        },
        {
          "speechId": 1612,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10920994,
          "sourceEndMs": 10921815,
          "text": "本当?"
        },
        {
          "speechId": 1613,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10921815,
          "sourceEndMs": 10927917,
          "text": "粘土使う?"
        },
        {
          "speechId": 1614,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10927917,
          "sourceEndMs": 10929598,
          "text": "使う派?"
        },
        {
          "speechId": 1615,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10929598,
          "sourceEndMs": 10930158,
          "text": "粘土?"
        },
        {
          "speechId": 1616,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10930158,
          "sourceEndMs": 10937641,
          "text": "コーネが使うと言ってくれれば船長は暖炉を作るよ全然使おうよだって出汁を薄めしてたら人生つまらないでしょ?"
        },
        {
          "speechId": 1617,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10937641,
          "sourceEndMs": 10943043,
          "text": "分かったこうでしょ?"
        },
        {
          "speechId": 1618,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10943043,
          "sourceEndMs": 10949286,
          "text": "塗料ミルってのがあるんだこれがあれば花で色を変えるのに使えると"
        },
        {
          "speechId": 1619,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10950482,
          "sourceEndMs": 10956564,
          "text": "花もあるここで粉とか使うんだあ、どういうこと?"
        },
        {
          "speechId": 1620,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10956564,
          "sourceEndMs": 10960485,
          "text": "粉の使い道が花置きたい!"
        },
        {
          "speechId": 1621,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10960485,
          "sourceEndMs": 10961666,
          "text": "花置きたいなぁ!"
        },
        {
          "speechId": 1622,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10961666,
          "sourceEndMs": 10966007,
          "text": "秩序だよね、もはや花置こう?"
        },
        {
          "speechId": 1623,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10966007,
          "sourceEndMs": 10979952,
          "text": "置きたーいこれは粉粉今度島降りたら拾おういっぱい拾おう黄色い粉ならあった黄色い粉か黄色でもいいんじゃない?"
        },
        {
          "speechId": 1624,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10982423,
          "sourceEndMs": 10992250,
          "text": "あ、でも床に置く式かあ、じゃあこれテーブル作ってテーブルに置こうあ、いいねー!"
        },
        {
          "speechId": 1625,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10992250,
          "sourceEndMs": 10996093,
          "text": "え、いいよね、いいよねえ、なんかランチョンマットとかさ作りたくない?"
        },
        {
          "speechId": 1626,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10996093,
          "sourceEndMs": 10997114,
          "text": "あ、いいねー!"
        },
        {
          "speechId": 1627,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10997114,
          "sourceEndMs": 10997394,
          "text": "いいねー!"
        },
        {
          "speechId": 1628,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10997394,
          "sourceEndMs": 11004240,
          "text": "あ、粘土使う、あ、でも粘土使ってもいいかな粘土使ってもいいと思ういいよいいよ、使おう使おうだってオシャレに行きたいじゃん女子よ、女子よ!"
        },
        {
          "speechId": 1629,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11004240,
          "sourceEndMs": 11009944,
          "text": "確かに、女子やしなうちらそうだ、女子なのよかわいいテーブル、自分行っちゃっていい?"
        },
        {
          "speechId": 1630,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11010020,
          "sourceEndMs": 11011061,
          "text": "いいすか?"
        },
        {
          "speechId": 1631,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11011061,
          "sourceEndMs": 11012201,
          "text": "いきましょう!"
        },
        {
          "speechId": 1632,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11012201,
          "sourceEndMs": 11014042,
          "text": "え、待ってローテーブルだこれ!"
        },
        {
          "speechId": 1633,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11014042,
          "sourceEndMs": 11015763,
          "text": "しまった!"
        },
        {
          "speechId": 1634,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11015763,
          "sourceEndMs": 11017404,
          "text": "ローテーブルだ!"
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
