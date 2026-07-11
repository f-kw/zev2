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
    "windowId": "window_34_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 10982423,
    "sourceEndMs": 11098463
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
      "promptSegmentCount": 28,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
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
        },
        {
          "speechId": 1635,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11017404,
          "sourceEndMs": 11018064,
          "text": "え、待ってあれ?"
        },
        {
          "speechId": 1636,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11018064,
          "sourceEndMs": 11021046,
          "text": "なんか…巨人の星とか出てくるやつ?"
        },
        {
          "speechId": 1637,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11021046,
          "sourceEndMs": 11028429,
          "text": "ねえ、巨人の…ローテーブルってオシャレな表現してんのになんで巨人の星が出てくるの?"
        },
        {
          "speechId": 1638,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11028429,
          "sourceEndMs": 11031211,
          "text": "ねえ、ローテーブルだよこれ!"
        },
        {
          "speechId": 1639,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11031211,
          "sourceEndMs": 11033012,
          "text": "え、チャブ台?"
        },
        {
          "speechId": 1640,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11033012,
          "sourceEndMs": 11034532,
          "text": "そう、いわゆるチャブ台!"
        },
        {
          "speechId": 1641,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11034532,
          "sourceEndMs": 11035433,
          "text": "待ってね、リヴァイカン!"
        },
        {
          "speechId": 1642,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11035433,
          "sourceEndMs": 11036653,
          "text": "あ、チャブを返してもらっていいすか?"
        },
        {
          "speechId": 1643,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11036653,
          "sourceEndMs": 11037694,
          "text": "すいませんけど…"
        },
        {
          "speechId": 1644,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11037946,
          "sourceEndMs": 11038935,
          "text": "え、なに?"
        },
        {
          "speechId": 1645,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11038935,
          "sourceEndMs": 11039963,
          "text": "粘土返してほしいんだけど"
        },
        {
          "speechId": 1646,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11040280,
          "sourceEndMs": 11062309,
          "text": "腹立つうぜえおい粘土もったいないだろボケが高さもあるのかこれも低いこれも低いかな君たちこれさローテーブルこれ作ってローテーブルだったら耐えられないんだけど大丈夫?"
        },
        {
          "speechId": 1647,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11062309,
          "sourceEndMs": 11068992,
          "text": "粘土返せになるよいや粘土粘土は大ヒロ低いか"
        },
        {
          "speechId": 1648,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11070330,
          "sourceEndMs": 11074092,
          "text": "でかいやつこれなら絶対これは大丈夫でしょ?"
        },
        {
          "speechId": 1649,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11074092,
          "sourceEndMs": 11078154,
          "text": "これもローテーブルだったらもうさあねえ小せえ!"
        },
        {
          "speechId": 1650,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11078154,
          "sourceEndMs": 11082476,
          "text": "もううぜえマジで待ってこれじゃない?"
        },
        {
          "speechId": 1651,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11082476,
          "sourceEndMs": 11098463,
          "text": "上に物を置くテーブルうわこっちだわ完全こっちねえいっぱいテーブル作っちゃったそれさなんかウェディングケーキみたいに重ねられないの?"
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
