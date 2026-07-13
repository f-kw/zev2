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
    "windowId": "window_001_o8rZAhARXAc",
    "windowKind": "primary",
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
      "speechId": 1,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 9155,
      "sourceEndMs": 11386,
      "text": "ご視聴ありがとうございました。"
    },
    {
      "speechId": 2,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 32934,
      "sourceEndMs": 59800,
      "text": "ムクロでピース死んじゃったらご主将アヌヨでピースでも存外楽しい地獄でピースピースピースもうくよくよしないでほら高い高い怪し下げる切り替えてゴンダンスダンスチュッチュムクロダンシンダンシンチュッチュッチュキスでチュッチュッチュでもベッドはチュッチュッチュダンスダンスチュッチュクランダンシンダンシンチュッチュ"
    },
    {
      "speechId": 3,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 61611,
      "sourceEndMs": 67537,
      "text": "チャンネル登録よろしくお願いします"
    },
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
      "speechId": 6,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 181523,
      "sourceEndMs": 193130,
      "text": "キャッチャーBとか欲しいね欲しいねなんか昨日こより見てたんだけどなんかこよりがかなりねあのあれだったえっと合宿で結構なんか梅田?"
    },
    {
      "speechId": 7,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 193130,
      "sourceEndMs": 193270,
      "text": "先輩?"
    },
    {
      "speechId": 8,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 193270,
      "sourceEndMs": 209880,
      "text": "先輩が爆裂強化されて受けたそっちかーいみたいなでも結構まんべんなく強化されていいっすねはいマリンも頑張りたいと思いますうんそういえばどうでもいいんですけどマリンはえっとちょっと調子が爆裂悪かった"
    },
    {
      "speechId": 9,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 210520,
      "sourceEndMs": 221568,
      "text": "お姉ちゃんもパパも元気でございましたやっていきたいと思います!"
    },
    {
      "speechId": 10,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 240566,
      "sourceEndMs": 243607,
      "text": "コヨリもね、甲子園決まったんよ!"
    },
    {
      "speechId": 11,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 243607,
      "sourceEndMs": 252311,
      "text": "んーさすがのね、采配ですおはようございます、監督、はいえーっと、7月30までアオマス、なくね?"
    },
    {
      "speechId": 12,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 252311,
      "sourceEndMs": 253431,
      "text": "なんかないね?"
    },
    {
      "speechId": 13,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 253431,
      "sourceEndMs": 255472,
      "text": "これねアオマスないっす!"
    },
    {
      "speechId": 14,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 255472,
      "sourceEndMs": 256453,
      "text": "これ!"
    },
    {
      "speechId": 15,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 256453,
      "sourceEndMs": 263696,
      "text": "うーんと、10、20、21、22、23、24、25、26、27、28ないやん!"
    },
    {
      "speechId": 16,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 263696,
      "sourceEndMs": 269198,
      "text": "アオマス、フメズ、はいえ、これってさ、シロアスって不満…"
    },
    {
      "speechId": 17,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 270814,
      "sourceEndMs": 273256,
      "text": "にしたほうがいいの?"
    },
    {
      "speechId": 18,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 273256,
      "sourceEndMs": 280801,
      "text": "んーとりま1進む1進んだほうがいいのか?"
    },
    {
      "speechId": 19,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 280801,
      "sourceEndMs": 283863,
      "text": "んー1で紅白使ってますあ、オッケオッケオッケオッケあ、占い師が出るかも?"
    },
    {
      "speechId": 20,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 283863,
      "sourceEndMs": 299514,
      "text": "あ、オッケオッケオッケオッケじゃあ、一旦1で紅白戦で一旦1ではいトレーニングをしたあ、おまかせせいちょうあー、この方いいねはいファッション監督優勝したことで我が校への注目度が高まっています"
    },
    {
      "speechId": 21,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 300034,
      "sourceEndMs": 303916,
      "text": "しばらくいろいろな出会いがありそうですね占い師かい!"
    },
    {
      "speechId": 22,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 303916,
      "sourceEndMs": 306096,
      "text": "今日も元気に練習中お!"
    },
    {
      "speechId": 23,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 306096,
      "sourceEndMs": 308938,
      "text": "プレアちゃーん!"
    },
    {
      "speechId": 24,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 308938,
      "sourceEndMs": 311859,
      "text": "いやテンションだからさ休ませる?"
    },
    {
      "speechId": 25,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 311859,
      "sourceEndMs": 319002,
      "text": "いやプレアちゃんのテンションぶち上げたいよねこれ休ませるがいいかなやっぱここはですか?"
    },
    {
      "speechId": 26,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 319002,
      "sourceEndMs": 321883,
      "text": "どうどうどうどう?"
    },
    {
      "speechId": 27,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 321883,
      "sourceEndMs": 322043,
      "text": "どう?"
    },
    {
      "speechId": 28,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 322043,
      "sourceEndMs": 323123,
      "text": "休ませる?"
    },
    {
      "speechId": 29,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 323123,
      "sourceEndMs": 323864,
      "text": "休もう?"
    },
    {
      "speechId": 30,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 323864,
      "sourceEndMs": 328946,
      "text": "だよね休んだ方がいいよね点上げていきたいよねうん休ませよう"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
