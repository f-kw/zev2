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
    "windowId": "window_12_qdczJpv8RCc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "qdczJpv8RCc",
    "sourceStartMs": 1259540,
    "sourceEndMs": 1379980
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
      "promptSegmentCount": 31,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 352,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259540,
          "sourceEndMs": 1259560,
          "text": "?"
        },
        {
          "speechId": 353,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259560,
          "sourceEndMs": 1259600,
          "text": "え!"
        },
        {
          "speechId": 354,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259600,
          "sourceEndMs": 1259620,
          "text": "?"
        },
        {
          "speechId": 355,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259620,
          "sourceEndMs": 1259660,
          "text": "え!"
        },
        {
          "speechId": 356,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259660,
          "sourceEndMs": 1259680,
          "text": "?"
        },
        {
          "speechId": 357,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259680,
          "sourceEndMs": 1259720,
          "text": "え!"
        },
        {
          "speechId": 358,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259720,
          "sourceEndMs": 1259740,
          "text": "?"
        },
        {
          "speechId": 359,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259740,
          "sourceEndMs": 1259780,
          "text": "え!"
        },
        {
          "speechId": 360,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259780,
          "sourceEndMs": 1259800,
          "text": "?"
        },
        {
          "speechId": 361,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259800,
          "sourceEndMs": 1259840,
          "text": "え!"
        },
        {
          "speechId": 362,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259840,
          "sourceEndMs": 1259880,
          "text": "?"
        },
        {
          "speechId": 363,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259880,
          "sourceEndMs": 1259940,
          "text": "え!"
        },
        {
          "speechId": 364,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259940,
          "sourceEndMs": 1259960,
          "text": "?"
        },
        {
          "speechId": 365,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259940,
          "sourceEndMs": 1259960,
          "text": "?"
        },
        {
          "speechId": 366,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1280034,
          "sourceEndMs": 1289680,
          "text": "最初のが嘘え待ってあのさ質問なんだが最初って嘘つけるの最初って嘘つけるのねえ"
        },
        {
          "speechId": 367,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1291622,
          "sourceEndMs": 1292903,
          "text": "嘘つけるの?"
        },
        {
          "speechId": 368,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1292903,
          "sourceEndMs": 1296825,
          "text": "これしようつける?"
        },
        {
          "speechId": 369,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1296825,
          "sourceEndMs": 1298626,
          "text": "はぁ?"
        },
        {
          "speechId": 370,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1298626,
          "sourceEndMs": 1305831,
          "text": "待ってこれとさこれでさえ、待って勝手にクイーンって言ってS出したけどクイーンって言ってん?"
        },
        {
          "speechId": 371,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1305831,
          "sourceEndMs": 1311975,
          "text": "これど勝手に嘘つくつもりなかったけど嘘ついてるん?"
        },
        {
          "speechId": 372,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1311975,
          "sourceEndMs": 1312475,
          "text": "ん?"
        },
        {
          "speechId": 373,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1312475,
          "sourceEndMs": 1312976,
          "text": "ん?"
        },
        {
          "speechId": 374,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1312976,
          "sourceEndMs": 1313176,
          "text": "ん?"
        },
        {
          "speechId": 375,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1313176,
          "sourceEndMs": 1319380,
          "text": "ん?"
        },
        {
          "speechId": 376,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1319380,
          "sourceEndMs": 1319980,
          "text": "嘘はいつでもつ"
        },
        {
          "speechId": 377,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1321523,
          "sourceEndMs": 1322103,
          "text": "は?"
        },
        {
          "speechId": 378,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1322103,
          "sourceEndMs": 1333590,
          "text": "ちょっと待て、でもジョーカーだからこれジョーカーだから今はクイーンだぞあ、左上のを出すそういうこと?"
        },
        {
          "speechId": 379,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1333590,
          "sourceEndMs": 1347338,
          "text": "あさ、ごめんだけどさマリ自分が最初に出したカードを準拠になるんだと思ってたわバーカジョーカーで無双してんだよこっちは何がライアーじゃ諦めろ"
        },
        {
          "speechId": 380,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1354810,
          "sourceEndMs": 1357451,
          "text": "なんでお前耐えすぎだろ!"
        },
        {
          "speechId": 381,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1357451,
          "sourceEndMs": 1361853,
          "text": "なんでそんな毎回耐える?"
        },
        {
          "speechId": 382,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1361853,
          "sourceEndMs": 1379980,
          "text": "言っとくけどね君マリンは今ルールを理解した今理解しちゃったよ強くなるよさらにここまでも強かったけど今ルールを理解して最強へと振動を目覚めた"
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
