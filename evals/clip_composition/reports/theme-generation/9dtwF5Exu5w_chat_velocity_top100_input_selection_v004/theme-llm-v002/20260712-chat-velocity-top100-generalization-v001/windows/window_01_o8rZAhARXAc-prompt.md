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
    "windowId": "window_01_o8rZAhARXAc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "o8rZAhARXAc",
    "sourceStartMs": 123435,
    "sourceEndMs": 864566
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
      "promptSegmentCount": 25,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 4,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 123435,
          "sourceEndMs": 149046,
          "text": "アホーイホロライブ3期生宝鐘海賊団船長の宝鐘まりんですはいというわけでねついに今日はなんとえーと夏合宿と甲子園ってことでもうこっからは運が爆裂に良くないと詰んでしまうというのもなんか結構ね見てんだけどみんなのホロコー結構みんなねいい青とくついてるんですよここで誰もいいのがつかないと"
        },
        {
          "speechId": 5,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 150098,
          "sourceEndMs": 176798,
          "text": "なんかそういえばカレンダー的に君たちもなんか結構言ってくれてたんですけど甲子園が決定してるとなんかあるんだっけ甲子園インタビュー7月30日までアオマスでランダムで発生するらしくてそれを撮りたいんだけどなんかもしかしてアオマスないかも"
        },
        {
          "speechId": 78,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 545346,
          "sourceEndMs": 546407,
          "text": "どうするどうするどうする?"
        },
        {
          "speechId": 79,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 546407,
          "sourceEndMs": 546607,
          "text": "え?"
        },
        {
          "speechId": 80,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 546607,
          "sourceEndMs": 547707,
          "text": "どうするどうするどうする?"
        },
        {
          "speechId": 81,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 547707,
          "sourceEndMs": 548348,
          "text": "誰に使う?"
        },
        {
          "speechId": 82,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 548348,
          "sourceEndMs": 548448,
          "text": "え?"
        },
        {
          "speechId": 83,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 548448,
          "sourceEndMs": 549028,
          "text": "どうするどうする?"
        },
        {
          "speechId": 84,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 549028,
          "sourceEndMs": 549468,
          "text": "え?"
        },
        {
          "speechId": 85,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 549468,
          "sourceEndMs": 550189,
          "text": "どうする?"
        },
        {
          "speechId": 86,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 550189,
          "sourceEndMs": 550469,
          "text": "え?"
        },
        {
          "speechId": 87,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 550469,
          "sourceEndMs": 553891,
          "text": "待って新旧種開発モードで作成したオリジナル喧嘩機を中毒しますえ?"
        },
        {
          "speechId": 88,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 553891,
          "sourceEndMs": 554151,
          "text": "え?"
        },
        {
          "speechId": 89,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 554151,
          "sourceEndMs": 555992,
          "text": "待って新旧種開発モードって何?"
        },
        {
          "speechId": 90,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 555992,
          "sourceEndMs": 557293,
          "text": "何も作ってないけど大丈夫なん?"
        },
        {
          "speechId": 91,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 557293,
          "sourceEndMs": 558714,
          "text": "これ何も作ってないんだけど"
        },
        {
          "speechId": 92,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 570318,
          "sourceEndMs": 592135,
          "text": "ごめんいっぱい聞きたいことがあるんだがフブちゃんってさエッジスライダーをさこっちにぶんぶん伸ばしてたんだけどさこれでつまりエッジスライダーぶんぶん伸ばしたけどこのことは一旦なかったことにして改めてオリジナル変化球を伸ばし直した方がいいってこと?"
        },
        {
          "speechId": 93,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 592135,
          "sourceEndMs": 593736,
          "text": "作りに行こうか?"
        },
        {
          "speechId": 94,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 593736,
          "sourceEndMs": 595918,
          "text": "え?"
        },
        {
          "speechId": 95,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 595918,
          "sourceEndMs": 596178,
          "text": "まん?"
        },
        {
          "speechId": 96,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 603720,
          "sourceEndMs": 610025,
          "text": "まずセーブしよう一旦セーブして作ろう他のピッチャー見る?"
        },
        {
          "speechId": 97,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 610025,
          "sourceEndMs": 629960,
          "text": "キムヤチ他のピッチャー見てこれラオーラねラオーラは変化球が微妙だと噂になってるキムヤチの間ででイオフィーはカーブ伸ばしとけって雑にカーブを伸ばしてるカエラはフォークを最初から持ってるからフォークを伸ばしてる"
        },
        {
          "speechId": 98,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 635815,
          "sourceEndMs": 638735,
          "text": "ふぶちゃん一択?"
        },
        {
          "speechId": 99,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 638735,
          "sourceEndMs": 659680,
          "text": "そうかふぶちゃん最強にしようかそうかえ、じゃあオリジナル変化球を習得したらまたその変化球を伸ばさなきゃいけないってことだよねまた伸ばし直さなきゃいけないってことだよねってことはつまりふぶちゃんを今マリンの計画ではコツコツコツとようやく変化球が伸ばし終わったから今からコツコツと"
        },
        {
          "speechId": 111,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 840358,
          "sourceEndMs": 864566,
          "text": "初めてだわどうしたらいいのわかんないわ一旦セーブな絶対セーブして終了してタイトルに戻ればあるどれかしら英館9の中かしらあっこれじゃない新旧種開発これか"
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
