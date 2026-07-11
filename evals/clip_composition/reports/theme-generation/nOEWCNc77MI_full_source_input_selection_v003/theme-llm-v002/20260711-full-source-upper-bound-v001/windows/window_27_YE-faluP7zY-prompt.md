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
    "windowId": "window_27_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 4500000,
    "sourceEndMs": 4626690
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
      "promptSegmentCount": 27,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 664,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4500000,
          "sourceEndMs": 4501901,
          "text": "ここすごいたるい!"
        },
        {
          "speechId": 665,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4501901,
          "sourceEndMs": 4503002,
          "text": "あ、来た!"
        },
        {
          "speechId": 666,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4503002,
          "sourceEndMs": 4505604,
          "text": "ライオン!"
        },
        {
          "speechId": 667,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4505604,
          "sourceEndMs": 4516312,
          "text": "あれも拾おうか自分で拾いに行ってる助かるわこれ回収ネットで拾えるからねダイオン今日という虚構図つけるあれ?"
        },
        {
          "speechId": 668,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4516312,
          "sourceEndMs": 4516973,
          "text": "何が?"
        },
        {
          "speechId": 669,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4516973,
          "sourceEndMs": 4519194,
          "text": "もしかして下にコンロあるから?"
        },
        {
          "speechId": 670,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4519194,
          "sourceEndMs": 4521716,
          "text": "なんでダメなのこれ?"
        },
        {
          "speechId": 671,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4521716,
          "sourceEndMs": 4526640,
          "text": "説明よろしく頼むで作れない?"
        },
        {
          "speechId": 672,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4526640,
          "sourceEndMs": 4529642,
          "text": "そりゃ参ったな君たち説明して"
        },
        {
          "speechId": 673,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4530130,
          "sourceEndMs": 4531331,
          "text": "あ、そうだ!"
        },
        {
          "speechId": 674,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4531331,
          "sourceEndMs": 4531951,
          "text": "そうだそうだ!"
        },
        {
          "speechId": 675,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4531951,
          "sourceEndMs": 4535332,
          "text": "土台じゃないんだった、そういえばそうなの?"
        },
        {
          "speechId": 676,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4535332,
          "sourceEndMs": 4548779,
          "text": "これだ、木製フロアだライオンあ、こうだこうだ思い出しましたあ、もう板なくなっちゃったまじ、板全然ないあ、板ね、ここにね、今ね、20枚入ってるナイスー!"
        },
        {
          "speechId": 677,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4548779,
          "sourceEndMs": 4551780,
          "text": "ナイスー!"
        },
        {
          "speechId": 678,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4551780,
          "sourceEndMs": 4559584,
          "text": "集めるの達人じゃん、こうね私なすばらしい全然サメがここないんだけどいいねいいよね、これね"
        },
        {
          "speechId": 679,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4561908,
          "sourceEndMs": 4589210,
          "text": "もはや船いらねえんじゃねえかぐらいのいかだいらねえんじゃねえかちょっと言い過ぎたきていりますいかだいりますすみませんでした情けないな情けないですねこれは申し訳ない生酢やっとこうかないいね食料もしっかりね生酢食べるか食べて何の音だこれハマった音か板集めてとか"
        },
        {
          "speechId": 680,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4590034,
          "sourceEndMs": 4590114,
          "text": "ぽろり?"
        },
        {
          "speechId": 681,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4590114,
          "sourceEndMs": 4590154,
          "text": "ん?"
        },
        {
          "speechId": 682,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4590154,
          "sourceEndMs": 4590314,
          "text": "どこだ?"
        },
        {
          "speechId": 683,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4590314,
          "sourceEndMs": 4591955,
          "text": "あっ大丈夫?"
        },
        {
          "speechId": 684,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4591955,
          "sourceEndMs": 4592115,
          "text": "させっか!"
        },
        {
          "speechId": 685,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4592115,
          "sourceEndMs": 4596457,
          "text": "これでちょっと荷物整理したいなぁこれでよし、一旦OKだよいしょん?"
        },
        {
          "speechId": 686,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4596457,
          "sourceEndMs": 4596578,
          "text": "ん?"
        },
        {
          "speechId": 687,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4596578,
          "sourceEndMs": 4596618,
          "text": "ん?"
        },
        {
          "speechId": 688,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4596618,
          "sourceEndMs": 4619170,
          "text": "ランララランランランランラララララランランランラララララランランラララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララ"
        },
        {
          "speechId": 689,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4620226,
          "sourceEndMs": 4624969,
          "text": "コーネがご機嫌だとマリリンも嬉しくなっちゃうんだよほんと?"
        },
        {
          "speechId": 690,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4624969,
          "sourceEndMs": 4626690,
          "text": "どれぐらい嬉しい?"
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
