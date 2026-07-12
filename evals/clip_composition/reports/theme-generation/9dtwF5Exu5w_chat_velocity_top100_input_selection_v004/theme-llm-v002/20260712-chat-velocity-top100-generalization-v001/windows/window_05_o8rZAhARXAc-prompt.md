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
    "windowId": "window_05_o8rZAhARXAc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "o8rZAhARXAc",
    "sourceStartMs": 2700146,
    "sourceEndMs": 3037740
  },
  "sources": [
    {
      "sourceVideoId": "o8rZAhARXAc",
      "sourceUrl": "https://www.youtube.com/watch?v=o8rZAhARXAc",
      "sourceTitle": "【 #ホロライブ甲子園2025】2年目夏！！夏合宿と甲子園初戦で狙え育成上振れ！！【ホロライブ/宝鐘マリン】",
      "transcriptKind": "local_stt",
      "language": "ja-JP",
      "durationSec": 11898.441,
      "rawSegmentCount": 34507,
      "promptSegmentCount": 29,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 261,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2700146,
          "sourceEndMs": 2729660,
          "text": "何を覚えさせよう何がいいかなこの場合うん弱体化するとしないがいる分からんマジで分からんちょっとマリンもオリジナル変化系初めてだから本当に分かんない分かんないやカーブ系はいはいはいはいあー"
        },
        {
          "speechId": 262,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2730002,
          "sourceEndMs": 2759054,
          "text": "カーブ系したいけど少数…でもカーブ系したいってみんな言ってるよ結構ふんふんカーブカーブ系ねキムヤジのじゃあやってみるかキムヤジのオススメでうんうんうん船長が決めた方がいいガチ分からんガチ分からん分かんないよちょっとじゃあ作るかたまなパワーカーブね分かった作ってみようパワーカーブ"
        },
        {
          "speechId": 274,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2821270,
          "sourceEndMs": 2829393,
          "text": "変化、増し、切れと変化あ、なんか1、1、1こ、1超えた重さ最大?"
        },
        {
          "speechId": 275,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2829393,
          "sourceEndMs": 2830033,
          "text": "え?"
        },
        {
          "speechId": 276,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2830033,
          "sourceEndMs": 2832134,
          "text": "やばい、ちょ、きまし?"
        },
        {
          "speechId": 277,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2832134,
          "sourceEndMs": 2832954,
          "text": "き、きまし!"
        },
        {
          "speechId": 278,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2832954,
          "sourceEndMs": 2841037,
          "text": "きましの言うこと聞いたら136になっちゃった!"
        },
        {
          "speechId": 279,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2841037,
          "sourceEndMs": 2842838,
          "text": "あ、あと、な、なに削る?"
        },
        {
          "speechId": 280,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2842838,
          "sourceEndMs": 2843298,
          "text": "なに削る?"
        },
        {
          "speechId": 281,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2843298,
          "sourceEndMs": 2844358,
          "text": "なに削る?"
        },
        {
          "speechId": 282,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2844358,
          "sourceEndMs": 2844918,
          "text": "急速を下げる!"
        },
        {
          "speechId": 283,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2844918,
          "sourceEndMs": 2846479,
          "text": "オッケー、オッケー急速を下げる!"
        },
        {
          "speechId": 284,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2846479,
          "sourceEndMs": 2849420,
          "text": "オッケーこうか?"
        },
        {
          "speechId": 285,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2849420,
          "sourceEndMs": 2849920,
          "text": "おや?"
        },
        {
          "speechId": 286,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2850562,
          "sourceEndMs": 2875926,
          "text": "なぜか上がるむずい待ってえっと待ってここここかここここここだ遅くしても遅くしてもダメなんだここだなるほど下げると増えるんだってことは"
        },
        {
          "speechId": 296,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2949238,
          "sourceEndMs": 2961087,
          "text": "こうかすごいシューティングしたって感じで下にグンって落ちた見た?"
        },
        {
          "speechId": 297,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2961087,
          "sourceEndMs": 2963429,
          "text": "見て?"
        },
        {
          "speechId": 298,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2963429,
          "sourceEndMs": 2966331,
          "text": "グン!"
        },
        {
          "speechId": 299,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2966331,
          "sourceEndMs": 2969514,
          "text": "かっこいい落ちてる"
        },
        {
          "speechId": 300,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2971338,
          "sourceEndMs": 2981764,
          "text": "シュンって間違えたストレート投げちゃったど、どうかな?"
        },
        {
          "speechId": 301,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2981764,
          "sourceEndMs": 2991490,
          "text": "ど、どうかなこれでカーブに重さ要りません?"
        },
        {
          "speechId": 302,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2991490,
          "sourceEndMs": 2994211,
          "text": "切れないと微妙?"
        },
        {
          "speechId": 303,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2994211,
          "sourceEndMs": 2998134,
          "text": "重さをじゃあ減らして切れを"
        },
        {
          "speechId": 304,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3000350,
          "sourceEndMs": 3003213,
          "text": "増すどう?"
        },
        {
          "speechId": 305,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3003213,
          "sourceEndMs": 3020894,
          "text": "これでやってみようこうしておーどう?"
        },
        {
          "speechId": 306,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3034278,
          "sourceEndMs": 3034938,
          "text": "いい感じ?"
        },
        {
          "speechId": 307,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3034938,
          "sourceEndMs": 3035399,
          "text": "キレてる?"
        },
        {
          "speechId": 308,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3035399,
          "sourceEndMs": 3037140,
          "text": "キレてる?"
        },
        {
          "speechId": 309,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 3037140,
          "sourceEndMs": 3037740,
          "text": "キレある?"
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
