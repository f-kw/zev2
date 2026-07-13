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
    "windowId": "window_056_YE-faluP7zY",
    "windowKind": "primary",
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
      "speechId": 1265,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8134372,
      "sourceEndMs": 8135752,
      "text": "あれで刈るんか!"
    },
    {
      "speechId": 1266,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8135752,
      "sourceEndMs": 8159804,
      "text": "あーなるほどなるほどね納得ですあ、そういうことね刈り切り鋏か刈り切り鋏は蝶酢貝と金属のインゴットとスクラップかダメ?"
    },
    {
      "speechId": 1267,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8159804,
      "sourceEndMs": 8159844,
      "text": "うん"
    },
    {
      "speechId": 1268,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8161461,
      "sourceEndMs": 8189252,
      "text": "でも傷だらけやコイツそろそろ死ぬぞ回収ネットがじわじわ破壊されていってるやばいよ地道にやられてんねクソ魚も釣りたいな確かに一旦じゃじゃがいも焼いとくねありがとうレッツじゃがいもレッツじゃがいも?"
    },
    {
      "speechId": 1269,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8189252,
      "sourceEndMs": 8189532,
      "text": "ごはん"
    },
    {
      "speechId": 1270,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8190222,
      "sourceEndMs": 8219984,
      "text": "ご飯浮き場も作ろうかご飯浮き場はこの辺のこの辺のコンロそばでいい気もするよねそうね鳥居間鳥居間作るっしょ毎回何してたか忘れるんだよなこれを外して作業してんねん"
    },
    {
      "speechId": 1271,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8220478,
      "sourceEndMs": 8238666,
      "text": "してんねえゴミ箱が…これ一回開けてやることがもう無限わかる金属製松明いいなランタンだこれ2個並べること可能か?"
    },
    {
      "speechId": 1272,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8238666,
      "sourceEndMs": 8239366,
      "text": "君たち?"
    },
    {
      "speechId": 1273,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8239366,
      "sourceEndMs": 8244628,
      "text": "小さいストレージって2個横に…2個並ぶ?"
    },
    {
      "speechId": 1274,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8244628,
      "sourceEndMs": 8248250,
      "text": "早く…早く教えて"
    },
    {
      "speechId": 1275,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8254193,
      "sourceEndMs": 8279852,
      "text": "早くギリ並ぶだってここいいじゃんもっと可愛く言ってだって可愛いじゃん可愛いんだってみんななんだよその言い方可愛くないみたいだ"
    },
    {
      "speechId": 1276,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8280340,
      "sourceEndMs": 8288562,
      "text": "まるで最上級にかわいい言い方で聞いてみてよめんどくせーなーは?"
    },
    {
      "speechId": 1277,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8288562,
      "sourceEndMs": 8293363,
      "text": "ボコすぞコーネはマリの味方じゃんは?"
    },
    {
      "speechId": 1278,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8293363,
      "sourceEndMs": 8293543,
      "text": "え?"
    },
    {
      "speechId": 1279,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8293543,
      "sourceEndMs": 8294063,
      "text": "あれ?"
    },
    {
      "speechId": 1280,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8294063,
      "sourceEndMs": 8296603,
      "text": "コーネ?"
    },
    {
      "speechId": 1281,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8296603,
      "sourceEndMs": 8297264,
      "text": "いつ?"
    },
    {
      "speechId": 1282,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8297264,
      "sourceEndMs": 8300424,
      "text": "いつから味方になったと思ってんの?"
    },
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
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
