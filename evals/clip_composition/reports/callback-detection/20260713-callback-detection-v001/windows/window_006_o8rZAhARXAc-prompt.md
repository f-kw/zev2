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
    "windowId": "window_006_o8rZAhARXAc",
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
      "speechId": 163,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1323478,
      "sourceEndMs": 1349940,
      "text": "粉っぽいのがあったんだから買ったってことだよねリリカも買っていいってことだよね一回戻るかえこれ戻るでいいんだよねあ待って今のショップだ"
    },
    {
      "speechId": 164,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1356020,
      "sourceEndMs": 1357501,
      "text": "パワープロショップ?"
    },
    {
      "speechId": 165,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1357501,
      "sourceEndMs": 1361845,
      "text": "これか?"
    },
    {
      "speechId": 166,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1361845,
      "sourceEndMs": 1364908,
      "text": "あ、エフェクトは能力ないから別にいい?"
    },
    {
      "speechId": 167,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1364908,
      "sourceEndMs": 1366610,
      "text": "オッケオッケオッケオッケこれか、これね?"
    },
    {
      "speechId": 168,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1391869,
      "sourceEndMs": 1394030,
      "text": "この4つ?"
    },
    {
      "speechId": 169,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1394030,
      "sourceEndMs": 1398233,
      "text": "この4つ?"
    },
    {
      "speechId": 170,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1398233,
      "sourceEndMs": 1398713,
      "text": "これは違う?"
    },
    {
      "speechId": 171,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1398713,
      "sourceEndMs": 1403435,
      "text": "変えればいいのか?"
    },
    {
      "speechId": 172,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1403435,
      "sourceEndMs": 1404036,
      "text": "変えればいいのか?"
    },
    {
      "speechId": 173,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1404036,
      "sourceEndMs": 1408718,
      "text": "こうこうやって?"
    },
    {
      "speechId": 174,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1418130,
      "sourceEndMs": 1439002,
      "text": "こうかこうかこうかこうかこうかこうかちょっと見てみるか新しくクレセントムーンフェスティバルタイプ見てみるわフェスティバルタイプでこう"
    },
    {
      "speechId": 175,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1441622,
      "sourceEndMs": 1446143,
      "text": "おー!"
    },
    {
      "speechId": 176,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1446143,
      "sourceEndMs": 1454306,
      "text": "当てたこうかおー!"
    },
    {
      "speechId": 177,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1454306,
      "sourceEndMs": 1466350,
      "text": "これ綺麗ですねゲーミングレインボーパワフェス…パワフェスボールタイプ"
    },
    {
      "speechId": 178,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1471726,
      "sourceEndMs": 1478468,
      "text": "これ更新行く前にさぁやっぱオリジナル閉鎖キーって取っ…しお得しといた方がいいのかな?"
    },
    {
      "speechId": 179,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1478468,
      "sourceEndMs": 1495294,
      "text": "え、いいえ、めちゃ、めちゃオシャレこれも綺麗だなぁこれも綺麗なんだけど白神さんだったら今んところレインボーライダーだって"
    },
    {
      "speechId": 180,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1509284,
      "sourceEndMs": 1509524,
      "text": "おー!"
    },
    {
      "speechId": 181,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1509524,
      "sourceEndMs": 1510445,
      "text": "かっ!"
    },
    {
      "speechId": 182,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1510445,
      "sourceEndMs": 1510925,
      "text": "いいじゃん!"
    },
    {
      "speechId": 183,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1510925,
      "sourceEndMs": 1515368,
      "text": "うわー!"
    },
    {
      "speechId": 184,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1515368,
      "sourceEndMs": 1518610,
      "text": "これもかわいい!"
    },
    {
      "speechId": 185,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1518610,
      "sourceEndMs": 1521272,
      "text": "ええやん!"
    },
    {
      "speechId": 186,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1521272,
      "sourceEndMs": 1524794,
      "text": "いいなあこれもいいうん"
    },
    {
      "speechId": 187,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1535674,
      "sourceEndMs": 1558742,
      "text": "変身来てる来てなー誰も知らないんだきっとそんなん誰も知らないんだだって作ってる人見たことないもんリリカ以外こうしてすげー音符が出とるおーあずきちとかにいいね"
    },
    {
      "speechId": 188,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1563114,
      "sourceEndMs": 1578939,
      "text": "おしゃれやねーフブちゃんだと折り辺MAXにできないからもったいない?"
    },
    {
      "speechId": 189,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1578939,
      "sourceEndMs": 1582680,
      "text": "なるほどねーフブちゃんだったらこれでもフブちゃんでいいのかしら?"
    },
    {
      "speechId": 190,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1582680,
      "sourceEndMs": 1589142,
      "text": "ちなみに今あのーアンケートだともうフブちゃんがめっちゃ強いんだけど"
    },
    {
      "speechId": 191,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1592690,
      "sourceEndMs": 1604114,
      "text": "アンケートだとフブちゃんが多いんだけど雰囲気でフブちゃん見つけたいって感じがあるのかアンケート信じて?"
    },
    {
      "speechId": 192,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1604114,
      "sourceEndMs": 1607395,
      "text": "うんフブちゃん素手強いから?"
    },
    {
      "speechId": 193,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1607395,
      "sourceEndMs": 1618599,
      "text": "うんうんうんうん確かにはいはいはいはいマックスは厳しいからもったいないっていうのと"
    },
    {
      "speechId": 194,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1620022,
      "sourceEndMs": 1626064,
      "text": "クラックスじゃなくてもふぶちゃんだと吸収数は大丈夫?"
    },
    {
      "speechId": 195,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1626064,
      "sourceEndMs": 1626344,
      "text": "吸収数?"
    },
    {
      "speechId": 196,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1626344,
      "sourceEndMs": 1630505,
      "text": "吸収数?"
    },
    {
      "speechId": 197,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 1630505,
      "sourceEndMs": 1642828,
      "text": "うーん本番吹雪が降りた時どうすんだよ?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
