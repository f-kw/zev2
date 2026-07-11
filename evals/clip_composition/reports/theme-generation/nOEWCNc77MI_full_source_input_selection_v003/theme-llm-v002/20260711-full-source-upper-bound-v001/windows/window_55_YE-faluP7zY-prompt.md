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
    "windowId": "window_55_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 9180854,
    "sourceEndMs": 9393585
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
          "speechId": 1388,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9180854,
          "sourceEndMs": 9209924,
          "text": "あら違ったわ違ったわじゃなくてさ違ったわよえ似てる嘘でしょえ嘘今のはこんなやつ役ないよ邪魔だよこっちはこれ持ってんだぞ邪魔だったんだもんしょうがないじゃん邪魔な魚よ視界に入ってきたぬるっと視界に入ってきた"
        },
        {
          "speechId": 1389,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9210100,
          "sourceEndMs": 9232688,
          "text": "いいよ全然焼けないじゃんめっちゃ綺麗になってきたよ、言っとくけどマジ?"
        },
        {
          "speechId": 1390,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9232688,
          "sourceEndMs": 9238550,
          "text": "どんどんストレージが減っているのなんか可愛い絨毯きたよ作れる?"
        },
        {
          "speechId": 1391,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9238550,
          "sourceEndMs": 9238850,
          "text": "待って"
        },
        {
          "speechId": 1392,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9242295,
          "sourceEndMs": 9249280,
          "text": "ここにさ、あれないんだわえっと…今の、ど…え?"
        },
        {
          "speechId": 1393,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9249280,
          "sourceEndMs": 9249420,
          "text": "こいか…あー!"
        },
        {
          "speechId": 1394,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9249420,
          "sourceEndMs": 9252482,
          "text": "え、しかもめっちゃコスト変わるえ、ちょっと作ってみようかなえ、作ろう作ろう!"
        },
        {
          "speechId": 1395,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9252482,
          "sourceEndMs": 9266352,
          "text": "え、作るわーありがてぇこいでこーでこいでこーでできたえ、ちっちゃいちっちゃいふざけてんのか?"
        },
        {
          "speechId": 1396,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9266352,
          "sourceEndMs": 9267933,
          "text": "ちっちゃいの?"
        },
        {
          "speechId": 1397,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9267933,
          "sourceEndMs": 9268674,
          "text": "どれ?"
        },
        {
          "speechId": 1398,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9268674,
          "sourceEndMs": 9268954,
          "text": "ちょっと待って"
        },
        {
          "speechId": 1399,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9271147,
          "sourceEndMs": 9276870,
          "text": "いいもの来たあちょっと待って行かないで絶対取るこれ拾ってねえ嘘?"
        },
        {
          "speechId": 1400,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9276870,
          "sourceEndMs": 9296802,
          "text": "まあいいや要らないから拾って絨毯あーどこに置こうかなーちょっと悩む悩むいいなー楽しそうどこに置こう絨毯うーんでもここさもうさわかった家族団らんみたいにするわここ今から頑張ってマジ?"
        },
        {
          "speechId": 1401,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9296802,
          "sourceEndMs": 9299824,
          "text": "うん頼むわちょっと魚釣っとるわ待っててくれ"
        },
        {
          "speechId": 1402,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9301194,
          "sourceEndMs": 9317299,
          "text": "カーペットは一旦美品置き場に入れといてとはーいで、だんだんいいな楽しみでしょ楽しみー待っててよ寒っあれ?"
        },
        {
          "speechId": 1403,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9317299,
          "sourceEndMs": 9320119,
          "text": "サメの頭ってなんか壁につけれるって誰か言ってなかったっけ?"
        },
        {
          "speechId": 1404,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9320119,
          "sourceEndMs": 9321760,
          "text": "あ、ね、言ってたねあれ?"
        },
        {
          "speechId": 1405,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9321760,
          "sourceEndMs": 9322600,
          "text": "作れないんですけど?"
        },
        {
          "speechId": 1406,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9322600,
          "sourceEndMs": 9327081,
          "text": "なんかあるのかな?"
        },
        {
          "speechId": 1407,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9327081,
          "sourceEndMs": 9328502,
          "text": "なんか釘みたいなやつ"
        },
        {
          "speechId": 1408,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9331650,
          "sourceEndMs": 9338155,
          "text": "あ、ボードが必要なんだって、なるほどトロフィーボードってやつ?"
        },
        {
          "speechId": 1409,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9338155,
          "sourceEndMs": 9340337,
          "text": "トロフィーボードはまだ作れないよね?"
        },
        {
          "speechId": 1410,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9340337,
          "sourceEndMs": 9356069,
          "text": "よく作れるちょっと置いてみるわ"
        },
        {
          "speechId": 1411,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9360342,
          "sourceEndMs": 9387882,
          "text": "ここに置きたいのにえ、なんでこの嵐のせいでだいぶ材料も集まっとるんでなナイスサメも来てるんでなナイスできるか?"
        },
        {
          "speechId": 1412,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9387882,
          "sourceEndMs": 9389624,
          "text": "床、そうね床も作りたいな床床広げたくない?"
        },
        {
          "speechId": 1413,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9390002,
          "sourceEndMs": 9392124,
          "text": "ちょっと後にしてそれはあれ?"
        },
        {
          "speechId": 1414,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9392124,
          "sourceEndMs": 9393585,
          "text": "置けないなダメか?"
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
