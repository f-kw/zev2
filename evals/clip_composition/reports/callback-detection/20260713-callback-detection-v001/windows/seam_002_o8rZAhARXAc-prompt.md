# callback detection search prompt v001

あなたは、ライブ配信の後の反応を理解するために必要な「以前の別場面」を、元配信の文字起こし窓から探します。

## 仕事

- `targets` の各反応候補について、`sourceSegments` 内に原因場面があれば抽出する。
- 原因場面とは、後の反応を成立させた宣言、約束、選択、以前の失敗、フラグ、人物間のやり取りなど、出来事そのものが起きた場面である。
- 原因場面を先に見ることで、「なぜ後でその反応をしたか」が具体的に分かる必要がある。
- 1つの窓に複数の原因場面があれば、すべて返す。該当がなければ空配列を返す。

## 採用しないもの

- `reactionEvidence` 内や、それと重なる場面
- 反応の後に行われた振り返り
- 起きたことを反応場面内で言い直しただけの説明
- 同じ単語、ゲーム要素、人物が出るだけで因果関係がない場面
- 配信全体に共通する一般背景
- `title` や `reason` から推測しただけで、`sourceSegments` に根拠がない出来事

`title` と `reason` は探索仮説であり、事実とは限りません。必ずこの窓の発話本文だけで裏付けてください。別の原因場面が存在しない候補もあるので、無理に作らないでください。

## 発話ID

- `causeSpeechIds` はこの窓の `sourceSegments[].speechId` だけを使う。
- 連続IDは `"12-17"`、不連続IDは数値として同じ配列へ入れられる。
- 時刻は返さない。

## 出力

説明やMarkdownを付けず、次のJSONだけを返してください。

```json
{
  "callbackFindings": [
    {
      "targetId": "入力にあるtargetId",
      "causeSpeechIds": [12, "14-17"],
      "sceneDescription": "この別場面で実際に起きたことを1文",
      "causalLink": "後の反応との因果関係を1文",
      "missingContextSupplied": "先に見ると何が理解できるようになるかを1文"
    }
  ]
}
```

## 入力JSON

```json
{
  "task": "source_only_callback_detection_search",
  "generationSystem": "callback-detection-v001@gemini-web-flash",
  "promptVersion": "callback_detection_search_prompt_v001",
  "inputPolicy": {
    "sourceOnly": true,
    "noClipInfo": true,
    "noExpected": true,
    "noAlignment": true,
    "noHumanLabels": true,
    "causeMustBeEarlierSeparateScene": true
  },
  "window": {
    "windowId": "seam_002_o8rZAhARXAc",
    "windowKind": "seam_bridge",
    "sourceVideoId": "o8rZAhARXAc"
  },
  "targets": [
    {
      "targetId": "o8rZAhARXAc-candidate-25",
      "title": "チャットの指示で対戦相手を選んだ結果、Bランクの高校を引いて焦るシーン",
      "reason": "リスナー（キャージー）に選択を委ねた結果、手強いBランクの「ざまみ商業高校」を引き当ててしまい動揺するリアクションが面白いため。",
      "reactionEvidence": {
        "sourceVideoId": "o8rZAhARXAc",
        "speechIds": [
          565,
          566,
          567,
          568,
          569,
          570,
          571,
          572
        ],
        "segments": [
          {
            "speechId": 565,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5701367,
            "sourceEndMs": 5702247,
            "text": "どこにする?"
          },
          {
            "speechId": 566,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5702247,
            "sourceEndMs": 5714533,
            "text": "キャージーどれがいい?"
          },
          {
            "speechId": 567,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5714533,
            "sourceEndMs": 5719475,
            "text": "どれがいい?"
          },
          {
            "speechId": 568,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5719475,
            "sourceEndMs": 5721796,
            "text": "魔物でギリかキャージーに決めてもらうわはいはいはいえっと一番右オッケーじゃあ一番右で行きますけ!"
          },
          {
            "speechId": 569,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5721796,
            "sourceEndMs": 5728519,
            "text": "1?"
          },
          {
            "speechId": 570,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5728519,
            "sourceEndMs": 5729340,
            "text": "1Bかー"
          },
          {
            "speechId": 571,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5733894,
            "sourceEndMs": 5751200,
            "text": "ざま…ざまみ…ざまみ商業高校ざまみ…大丈夫かなぁ…Bって…Bやばいか?"
          },
          {
            "speechId": 572,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5751200,
            "sourceEndMs": 5755602,
            "text": "まぁ占い師踏んで…占い師踏んで…"
          }
        ]
      }
    }
  ],
  "sourceSegments": [
    {
      "speechId": 48,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 482774,
      "sourceEndMs": 485255,
      "text": "こうこうこれな?"
    },
    {
      "speechId": 49,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 485255,
      "sourceEndMs": 503300,
      "text": "甲府高校やっとくわポチリうん強豪だからね7月21日な書いとくわはいチョプテン何くれたの?"
    },
    {
      "speechId": 50,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 503300,
      "sourceEndMs": 504061,
      "text": "何くれたの?"
    },
    {
      "speechId": 51,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 504061,
      "sourceEndMs": 508162,
      "text": "オリジナル球種習得ボールだって何それ?"
    },
    {
      "speechId": 52,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 510342,
      "sourceEndMs": 510562,
      "text": "お!"
    },
    {
      "speechId": 53,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 510562,
      "sourceEndMs": 514343,
      "text": "夏休み入ります!"
    },
    {
      "speechId": 54,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 514343,
      "sourceEndMs": 515483,
      "text": "使った方がいいのか?"
    },
    {
      "speechId": 55,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 515483,
      "sourceEndMs": 516924,
      "text": "取っといた方がいいのか?"
    },
    {
      "speechId": 56,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 516924,
      "sourceEndMs": 517784,
      "text": "え、ちょっと待って!"
    },
    {
      "speechId": 57,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 517784,
      "sourceEndMs": 519084,
      "text": "湧いてるコメントが!"
    },
    {
      "speechId": 58,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 519084,
      "sourceEndMs": 520185,
      "text": "やったー!"
    },
    {
      "speechId": 59,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 520185,
      "sourceEndMs": 523206,
      "text": "わかんないけどやったー!"
    },
    {
      "speechId": 60,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 523206,
      "sourceEndMs": 524626,
      "text": "キムチが湧いてるから一緒に湧こう!"
    },
    {
      "speechId": 61,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 524626,
      "sourceEndMs": 525986,
      "text": "いやー!"
    },
    {
      "speechId": 62,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 525986,
      "sourceEndMs": 527347,
      "text": "やったー!"
    },
    {
      "speechId": 63,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 527347,
      "sourceEndMs": 528767,
      "text": "キムチが湧いてるー!"
    },
    {
      "speechId": 64,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 528767,
      "sourceEndMs": 529647,
      "text": "マリンも湧くー!"
    },
    {
      "speechId": 65,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 529647,
      "sourceEndMs": 529827,
      "text": "いやー!"
    },
    {
      "speechId": 66,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 529827,
      "sourceEndMs": 532088,
      "text": "やったー!"
    },
    {
      "speechId": 67,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 532088,
      "sourceEndMs": 532848,
      "text": "うわー!"
    },
    {
      "speechId": 68,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 532848,
      "sourceEndMs": 533128,
      "text": "強すぎ!"
    },
    {
      "speechId": 69,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 533128,
      "sourceEndMs": 533648,
      "text": "なになになに?"
    },
    {
      "speechId": 70,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 533648,
      "sourceEndMs": 534629,
      "text": "これなになになに?"
    },
    {
      "speechId": 71,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 534629,
      "sourceEndMs": 535349,
      "text": "これなに?"
    },
    {
      "speechId": 72,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 535349,
      "sourceEndMs": 536329,
      "text": "これ粉落としま!"
    },
    {
      "speechId": 73,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 536329,
      "sourceEndMs": 537149,
      "text": "?"
    },
    {
      "speechId": 74,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 537149,
      "sourceEndMs": 538230,
      "text": "これ粉落としなの!"
    },
    {
      "speechId": 75,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 538230,
      "sourceEndMs": 539230,
      "text": "?"
    },
    {
      "speechId": 76,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 538230,
      "sourceEndMs": 539230,
      "text": "?"
    },
    {
      "speechId": 77,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 539230,
      "sourceEndMs": 539570,
      "text": "まー!"
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
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
