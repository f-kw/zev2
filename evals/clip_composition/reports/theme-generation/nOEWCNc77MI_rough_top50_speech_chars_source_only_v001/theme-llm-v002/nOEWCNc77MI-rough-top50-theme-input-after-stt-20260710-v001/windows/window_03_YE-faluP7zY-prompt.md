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
    "windowId": "window_03_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 1009243,
    "sourceEndMs": 1619152
  },
  "sources": [
    {
      "sourceVideoId": "YE-faluP7zY",
      "sourceUrl": "https://www.youtube.com/watch?v=YE-faluP7zY",
      "sourceTitle": "【Raft】ころね、キミさえいればこの海の果てまでだって──【ホロライブ/宝鐘マリン】",
      "transcriptKind": "local_stt",
      "language": "ja-JP",
      "rawSegmentCount": 8039,
      "promptSegmentCount": 24,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 41,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1009243,
          "sourceEndMs": 1011184,
          "text": "じゃあヤ、ヤちょっと弓?"
        },
        {
          "speechId": 42,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1011184,
          "sourceEndMs": 1011864,
          "text": "ヤ、ヤ弓?"
        },
        {
          "speechId": 43,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1011864,
          "sourceEndMs": 1014365,
          "text": "死ぬかもしれんこれ嘘でしょ?"
        },
        {
          "speechId": 44,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1014365,
          "sourceEndMs": 1019166,
          "text": "ちょっとヤと作っとこうコーネも一緒に一緒にさ弓やする?"
        },
        {
          "speechId": 45,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1200098,
          "sourceEndMs": 1223383,
          "text": "箱に入ってる全部の箱を1個ずつ開けたら見つかるありがとう次はちゃんとね分かりやすくしとくわ2階建てにしたらきてるきてるきてるお前許さねえサメだサメだ多分サメだコーネいる多分というかサメやこれは間違いなくね間違いなくラフトやこれはラフト?"
        },
        {
          "speechId": 46,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1223383,
          "sourceEndMs": 1229904,
          "text": "これはラフトというゲームやいたいやサメサメサメほらいるよなやっぱりないるすいませんマリンよりコーネのことを食べてください"
        },
        {
          "speechId": 47,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1230214,
          "sourceEndMs": 1234815,
          "text": "なんでやねんコーニーさん狙われたらヤバいで今死にかけの…え、痛っ!"
        },
        {
          "speechId": 48,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1234815,
          "sourceEndMs": 1235315,
          "text": "待って!"
        },
        {
          "speechId": 49,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1235315,
          "sourceEndMs": 1235596,
          "text": "待って!"
        },
        {
          "speechId": 50,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1235596,
          "sourceEndMs": 1236016,
          "text": "痛っ!"
        },
        {
          "speechId": 51,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1236016,
          "sourceEndMs": 1236436,
          "text": "痛っ!"
        },
        {
          "speechId": 52,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1236436,
          "sourceEndMs": 1237096,
          "text": "痛っ!"
        },
        {
          "speechId": 53,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1237096,
          "sourceEndMs": 1237476,
          "text": "痛っ!"
        },
        {
          "speechId": 54,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1237476,
          "sourceEndMs": 1258062,
          "text": "コーニーありがとう今まですごい大好きだった本当によいごんサメはさ弓矢で…でももったいないなちょっとでも確かにね弓矢弱えないっすなあ弓矢でも弓でもサメ倒せるよって言われてるなえ待ってもしかしてさもしかしてこの丈さいや無理かコンコンできるかと思った"
        },
        {
          "speechId": 55,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1290150,
          "sourceEndMs": 1294092,
          "text": "どうしよう気になるやん今日何があったんやんなりんどこ?"
        },
        {
          "speechId": 56,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1294092,
          "sourceEndMs": 1311760,
          "text": "ちょっと今脳死で喋ってるあっ今ね今あの竹取りの桶というものありきりのとこあっよきかなよきかなよきかなちょっとちゃんと時代に染まってるねうんそれはよきかないいじゃんこの辺サメいなさそうな予感する今チャンスなのでは?"
        },
        {
          "speechId": 57,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1311760,
          "sourceEndMs": 1312480,
          "text": "マジ?"
        },
        {
          "speechId": 58,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1312480,
          "sourceEndMs": 1319784,
          "text": "あっでもこっち来そうだなうそえなんかフグもいるって言われてるようんうん普通にいるねこれでもここ海藻"
        },
        {
          "speechId": 59,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1530000,
          "sourceEndMs": 1534522,
          "text": "キスキスしてるって言われてる死に死にしてるけど死に死にしてる?"
        },
        {
          "speechId": 60,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1534522,
          "sourceEndMs": 1543445,
          "text": "今行くからこれさ降参して再開するって押さない方がいいんだよね押したら荷物がなくなるもう死んでんのもしかして?"
        },
        {
          "speechId": 61,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1543445,
          "sourceEndMs": 1547227,
          "text": "死んでしまった島の中?"
        },
        {
          "speechId": 62,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1547227,
          "sourceEndMs": 1554530,
          "text": "島の中でね海沿いでね砂浜があって土下座いっぱい入ってあ、竹のありけりね"
        },
        {
          "speechId": 63,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1555302,
          "sourceEndMs": 1560024,
          "text": "そうね、マリンと逆方向に行ってたから逆に行ってたのね、OKOKOK"
        },
        {
          "speechId": 64,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1590160,
          "sourceEndMs": 1619152,
          "text": "大丈夫マリンなら大丈夫もう壊された大丈夫じゃない食われてるって金の方がねすぐ行くからね朝日になってきたなこれが終わったら一緒に命しっかりにごめんね本当に死んでしまって不甲斐ないわ行くよ今から行く行くぞありがとう上から向かうか上から夕日朝日を浴びながら"
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
