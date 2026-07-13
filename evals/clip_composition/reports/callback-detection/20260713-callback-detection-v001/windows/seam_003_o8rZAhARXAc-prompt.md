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
    "windowId": "seam_003_o8rZAhARXAc",
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
      "speechId": 100,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 660322,
      "sourceEndMs": 682415,
      "text": "コントロールとスタミナを伸ばしていこうって思ってたのが今からまた変化球をずっと伸ばさなきゃいけなくてコントロールとスタミナが伸びていかないってことだよねトリマセーブしよううん4段階までは伸ばせる?"
    },
    {
      "speechId": 101,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 682415,
      "sourceEndMs": 689980,
      "text": "うんでも彼らはね彼らはフォークが強いからね"
    },
    {
      "speechId": 102,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 691430,
      "sourceEndMs": 716450,
      "text": "ふぶちゃんはふぶちゃんは変化球が微妙だって噂だったのうんふぶちゃんは変化球が微妙だって噂になってたうんそう彼らはフォークがいいからフォークでいいじゃんっていう感じだよねふぶキング一択かね"
    },
    {
      "speechId": 103,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 720598,
      "sourceEndMs": 749700,
      "text": "だから星が増えて世界大会も有利にかといってそんな強い弾ねえ強い子につけた方がいいに決まってるかさすがに強い人につけた方がいいに決まってるかラオーラはねラオーラそうラオーラ微妙なんだよねラオーラは変化球が微妙だと話題なんだけど"
    },
    {
      "speechId": 104,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 750698,
      "sourceEndMs": 779920,
      "text": "それにしてもラオーラはもうコントロールもスタミナもないからちょっと変化球覚えさせたとてコントロールもスタミナも磨かないと一瞬投げてすぐ終わりになっちゃうかもって感じラオーラはコントロールも上げなきゃいけないしスタミナもないからあのーいざ実戦で使おうって時にスタミナが全然なくてせっかく強いオリジナル球種を覚えさせたにも関わらずなんか全然投げる"
    },
    {
      "speechId": 105,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 780334,
      "sourceEndMs": 809900,
      "text": "速攻沈んでいくみたいな感じになんのかなぁいやどうなんだろわからんわマジでどっちなんだフブちゃん以外の方が絶対にいい2年目のフブちゃんはもう間に合わんやばいどっちちょマジわからんのだがちょマジでわからんえマジでわからんえ待ってアンケートかこれさすがにオリジオリジオリジナル変化球誰がやるもうフブちゃんとフブちゃん以外にしろ"
    },
    {
      "speechId": 106,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 810822,
      "sourceEndMs": 829013,
      "text": "この世の中はフブちゃんとフブちゃん以外うんで、じゃあその待ち時間にこの結果の待ち時間に弾作るか弾作りに行くかえ、自分で作んの?"
    },
    {
      "speechId": 107,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 829013,
      "sourceEndMs": 832255,
      "text": "え、作ったことないんだけどわかんないよどうやって作ればいいの?"
    },
    {
      "speechId": 108,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 832255,
      "sourceEndMs": 834817,
      "text": "一旦セーブして終了ってこと?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
