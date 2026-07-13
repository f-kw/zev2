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
    "windowId": "seam_007_o8rZAhARXAc",
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
      "speechId": 208,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1830198,
      "sourceEndMs": 1857638,
      "text": "確かにそうまあアンケート取ったしなアンケート取ったしなみたいな感じアンケート取ったからふーちゃんにすべきなのではって感じはあるよね"
    },
    {
      "speechId": 209,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1861155,
      "sourceEndMs": 1865434,
      "text": "あーですねー"
    },
    {
      "speechId": 210,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1878306,
      "sourceEndMs": 1889442,
      "text": "トーシュ2枚で安定させるっていうので言うと2枚目であるカエラがフォーク持ってるからでフーブちゃんが強い変化球ないからフーブちゃんに強い変化球を持たせるのがいいっていう話なんだよね"
    },
    {
      "speechId": 211,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1890554,
      "sourceEndMs": 1891874,
      "text": "ま、ふぶちゃんでいっかー!"
    },
    {
      "speechId": 212,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1891874,
      "sourceEndMs": 1892834,
      "text": "もう!"
    },
    {
      "speechId": 213,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1892834,
      "sourceEndMs": 1893655,
      "text": "ふぶちゃんでいこう!"
    },
    {
      "speechId": 214,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1893655,
      "sourceEndMs": 1896115,
      "text": "じゃあちょっとこの、みんな角度とかさ変化とかさ一緒に考えてくんね?"
    },
    {
      "speechId": 215,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1896115,
      "sourceEndMs": 1898696,
      "text": "マリには難しいわ一緒に考えてくんね?"
    },
    {
      "speechId": 216,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1898696,
      "sourceEndMs": 1919900,
      "text": "ちょ、これアンケート終了しとこうんえっと折り辺ですがふぶけで作る場合はすでに変化量がいっぱいなのでこの後に通常の1.3倍の経験値があー必要なので変化球、変化量がそっとんどん育ちます"
    },
    {
      "speechId": 217,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1920354,
      "sourceEndMs": 1948130,
      "text": "なので変化量が少なくても十分なものを覚えさせたいんですが下変化のチェンジアップが弱いためその等級割合を減らしつつゴミマンでも強いナックル系になると思いますだってなるほど確かに変化量がパンパンだから経験値が高くなりすぎてきついんだそうかもうパンパンか"
    },
    {
      "speechId": 218,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1950278,
      "sourceEndMs": 1979700,
      "text": "確かに経験値が1.3倍必要なんだって数万の経験値かこりゃ育たなそうやなこりゃ育たなそうスタミナがきついかふぶちゃんの変化量一生懸命上げたことがあだとなってしまった変化量全力出しすぎたことが"
    },
    {
      "speechId": 219,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1980758,
      "sourceEndMs": 2008278,
      "text": "あ、だとオリヘンはスタミナ消費一緒なんだへーオリヘンだったらスタミナ消費量変わらんらしいよ全部同じなんだってやばいもうたぶんミリシラミリシラしかいないミリシラしかいない"
    },
    {
      "speechId": 220,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2010874,
      "sourceEndMs": 2039740,
      "text": "リリカがチャットくれてるえっとリリカコロナなのにどうもありがとうごめんなコロナ中にありがとうえっとリリカが去年ボタン先輩にお伝えしたのオリジナル九州やっぱりフォークが一番強いとのことおーなるほどえ待ってちょっと相談してみようえっとちょっとコロナで今つらいと思うからチャットで送ってみるかえっと今うぶちゃん"
    },
    {
      "speechId": 221,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2040578,
      "sourceEndMs": 2069680,
      "text": "みーちゃんの変化量がもう10くらいいってんだよなそこにさらに追加で変化球を覚えさせてもみたいなオーラがありつつ第2投手の彼らはフォーク持ってて"
    },
    {
      "speechId": 222,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2086777,
      "sourceEndMs": 2099880,
      "text": "他2人はえーっとスタミナとかコントロールとかからFみたいな感じなんだけどどうしよう相談してみようライバルなのに教えてくれるいやライバルライバルって言いますけどね俺たちは仲間"
    },
    {
      "speechId": 223,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2101938,
      "sourceEndMs": 2129586,
      "text": "忘れてるかもしれませんけどねマリン監督はリリカの限界上卒業生なんです監督監督お久しぶりですすいませんマリンが不勉強なせいであのーこの私去年は使えなくてすいませんでしたあのーリリーフのボタンさんあかっこよかったですねいやーマリンすいませんこの私覚えられなくてうーんいやーここに来て勉強になります"
    },
    {
      "speechId": 224,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2131266,
      "sourceEndMs": 2155086,
      "text": "知ってんよマリン黙れ黙りやがれうんはいドラフトの時なんて言ってたっけえなんだったっけえいやリリカ監督のもとでいっぱい勉強できてこうしてうんコロコロに出ることができて嬉しいですかなって言ったかも"
    },
    {
      "speechId": 225,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2164080,
      "sourceEndMs": 2189900,
      "text": "確かにマリンではなくシシロにつけたのってマリンが転生でエースだったから確かにリリカだったらフブちゃんにつけないってことだよねつまりリリカはマリンが最初にいてすごく性能良かったけど後発のボタンさんの方に覚えさせたんだもんねリリーフを強くね"
    },
    {
      "speechId": 226,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2190118,
      "sourceEndMs": 2218366,
      "text": "ただリリーフで出す予定のカエラがすでにフォークがあるからって思うと誰か違うそれ以外の3人目を育てるってことになるねイヴォフィとかねラオーラはすでに変化量が今なんかもう3球種くらいあってあー"
    },
    {
      "speechId": 227,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2220226,
      "sourceEndMs": 2249754,
      "text": "結果的にはフブちゃんは必要経験値加味するとかなりもったいないからよひみたいなまだこれからっていう人によひ弱すぎるそうねスタミナもないし迷うな"
    },
    {
      "speechId": 228,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2273466,
      "sourceEndMs": 2275151,
      "text": "結構もうカーブ育てて…うわ!"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
