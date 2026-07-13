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
    "windowId": "seam_056_YE-faluP7zY",
    "windowKind": "seam_bridge",
    "sourceVideoId": "YE-faluP7zY"
  },
  "targets": [
    {
      "targetId": "YE-faluP7zY-candidate-84",
      "title": "間違えてテーブルを量産してしまう宝鐘マリン",
      "reason": "別の高いテーブルを作ろうとするも再びローテーブルを作ってしまい、最終的に正解のテーブルを見つけるが大量に余ったテーブルの処理に困るオチがついているため。",
      "reactionEvidence": {
        "sourceVideoId": "YE-faluP7zY",
        "speechIds": [
          1647,
          1648,
          1649,
          1650,
          1651
        ],
        "segments": [
          {
            "speechId": 1647,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 11062309,
            "sourceEndMs": 11068992,
            "text": "粘土返せになるよいや粘土粘土は大ヒロ低いか"
          },
          {
            "speechId": 1648,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 11070330,
            "sourceEndMs": 11074092,
            "text": "でかいやつこれなら絶対これは大丈夫でしょ?"
          },
          {
            "speechId": 1649,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 11074092,
            "sourceEndMs": 11078154,
            "text": "これもローテーブルだったらもうさあねえ小せえ!"
          },
          {
            "speechId": 1650,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 11078154,
            "sourceEndMs": 11082476,
            "text": "もううぜえマジで待ってこれじゃない?"
          },
          {
            "speechId": 1651,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 11082476,
            "sourceEndMs": 11098463,
            "text": "上に物を置くテーブルうわこっちだわ完全こっちねえいっぱいテーブル作っちゃったそれさなんかウェディングケーキみたいに重ねられないの?"
          }
        ]
      }
    }
  ],
  "sourceSegments": [
    {
      "speechId": 1283,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8300424,
      "sourceEndMs": 8301124,
      "text": "え?"
    },
    {
      "speechId": 1284,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8301124,
      "sourceEndMs": 8309026,
      "text": "コーネやだやだやだかわいく言えるじゃねーかうっとうしいマジで"
    },
    {
      "speechId": 1285,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8309739,
      "sourceEndMs": 8310000,
      "text": "はあ"
    },
    {
      "speechId": 1286,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8312099,
      "sourceEndMs": 8339014,
      "text": "起こすぞ切れんの早いんだよ即切れるやん今お魚釣ってるからねありがとうこれだとニコンきついかしらねきついかしらね何がおかしいんですかいきなりお母さんみたいになったからきついかしらねうるせえ"
    },
    {
      "speechId": 1287,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8341206,
      "sourceEndMs": 8343627,
      "text": "うるせぇ?"
    },
    {
      "speechId": 1288,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8343627,
      "sourceEndMs": 8347167,
      "text": "うるせぇうるせぇ?"
    },
    {
      "speechId": 1289,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8347167,
      "sourceEndMs": 8349968,
      "text": "うるせぇからの?"
    },
    {
      "speechId": 1290,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8349968,
      "sourceEndMs": 8363551,
      "text": "うるせぇからのじゃないよサメが来たなぁもう嫌だなぁだいぶ片付いてきたよマジでほんと?"
    },
    {
      "speechId": 1291,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8363551,
      "sourceEndMs": 8369832,
      "text": "うんすっきりしてきためっちゃさすがやんめちゃめちゃいい感じさすがマリーンやさすがマリーンや"
    },
    {
      "speechId": 1292,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8370340,
      "sourceEndMs": 8389575,
      "text": "さすがマリン待って木のとこに葉っぱ入ってるけど葉っぱいいんだっけここに入れといて木のとこにあうん木葉っぱロープは一緒の区分にしてでもさ木さいっぱい入れるからさ葉っぱで溢れちゃうよそんなにあんの?"
    },
    {
      "speechId": 1293,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8389575,
      "sourceEndMs": 8392918,
      "text": "まだないけどさないならいいじゃねえかよ"
    },
    {
      "speechId": 1294,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8394146,
      "sourceEndMs": 8396915,
      "text": "未来、未来の話をしてるでしょ?"
    },
    {
      "speechId": 1295,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8396915,
      "sourceEndMs": 8399703,
      "text": "そんな溢れるほど気取れないと思います"
    },
    {
      "speechId": 1296,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8400086,
      "sourceEndMs": 8414074,
      "text": "そうですかほいさっさほいさっさわかりましたよ遠い未来に起遊しやがってよは?"
    },
    {
      "speechId": 1297,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8414074,
      "sourceEndMs": 8423260,
      "text": "いつの話してんだよまず溢れるくらい集めてみろやは?"
    },
    {
      "speechId": 1298,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8423260,
      "sourceEndMs": 8429984,
      "text": "死なないよナバリンタン死んでもらったら困るよどっちなんだよ本当は仲いいんだけど"
    },
    {
      "speechId": 1299,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8431521,
      "sourceEndMs": 8440504,
      "text": "気を潰しにかかっている不安になるな必殺気を潰し!"
    },
    {
      "speechId": 1300,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8440504,
      "sourceEndMs": 8457389,
      "text": "元気いっぱいのここは備品にしようここは備品ねいいよ右の3つ目は備品ね備品っていうのは何かと言うと釘とかあー駄目にもう怖いよねごめんなさい"
    },
    {
      "speechId": 1301,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8460790,
      "sourceEndMs": 8462731,
      "text": "どこや?"
    },
    {
      "speechId": 1302,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8462731,
      "sourceEndMs": 8482599,
      "text": "で、なんだったっけあ、そう、ここを備品で、備品って言ったら…備品って言ったら、あれだよ、あのさなんだろ、槍とかさ、釘とかさはいはいはいはい、釘とかねなんかちょっとしたものをちょっと、えいって入れとくやつね、ここはい、OKですほんと?"
    },
    {
      "speechId": 1303,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8482599,
      "sourceEndMs": 8489342,
      "text": "中身見て決めるわ、入れるもの確かにそれ、それでいいもんじゃ、ここは…"
    },
    {
      "speechId": 1304,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8490002,
      "sourceEndMs": 8499668,
      "text": "ここ種置き場ね今の声なに?"
    },
    {
      "speechId": 1305,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8499668,
      "sourceEndMs": 8500388,
      "text": "はい!"
    },
    {
      "speechId": 1306,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8500388,
      "sourceEndMs": 8501609,
      "text": "やっつけたり!"
    },
    {
      "speechId": 1307,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8501609,
      "sourceEndMs": 8503190,
      "text": "それやったの?"
    },
    {
      "speechId": 1308,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8503190,
      "sourceEndMs": 8516178,
      "text": "それやりましたマリンがやられて嫌な気持ちしてたからやってくれたんだそうだよ、やったんだよ今、水中でねありがとう、コンネいいんだよ、待って船見失ったわ嘘でしょ?"
    },
    {
      "speechId": 1309,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8520662,
      "sourceEndMs": 8522783,
      "text": "マリン?"
    },
    {
      "speechId": 1310,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8522783,
      "sourceEndMs": 8522823,
      "text": "ん?"
    },
    {
      "speechId": 1311,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8522823,
      "sourceEndMs": 8529665,
      "text": "船なくなったけど嘘、マリン?"
    },
    {
      "speechId": 1312,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8529665,
      "sourceEndMs": 8533386,
      "text": "こうね、こうねー!"
    },
    {
      "speechId": 1313,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8533386,
      "sourceEndMs": 8533906,
      "text": "マリン!"
    },
    {
      "speechId": 1314,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8533906,
      "sourceEndMs": 8534426,
      "text": "ジャンプして、ジャンプ!"
    },
    {
      "speechId": 1315,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8534426,
      "sourceEndMs": 8541208,
      "text": "待って、どこだ?"
    },
    {
      "speechId": 1316,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8541208,
      "sourceEndMs": 8546149,
      "text": "もうサメなんて追っかけますから!"
    },
    {
      "speechId": 1317,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8546149,
      "sourceEndMs": 8547290,
      "text": "どこ?"
    },
    {
      "speechId": 1318,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8547290,
      "sourceEndMs": 8548450,
      "text": "ジャンプして、ジャンプ!"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
