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
    "windowId": "window_012_YE-faluP7zY",
    "windowKind": "primary",
    "sourceVideoId": "YE-faluP7zY"
  },
  "targets": [
    {
      "targetId": "YE-faluP7zY-candidate-58",
      "title": "置き去りにされそうになって焦る戌神ころね",
      "reason": "マリン船長が移動する中で、置き去りにされそうになったころねが「犬かきで行く」と可愛く宣言した直後、どんどん距離が離れていって絶叫する見どころのある展開になっているため。",
      "reactionEvidence": {
        "sourceVideoId": "YE-faluP7zY",
        "speechIds": [
          927,
          928,
          929,
          930,
          931
        ],
        "segments": [
          {
            "speechId": 927,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 6300522,
            "sourceEndMs": 6328283,
            "text": "で、大区画のあ、蝶津貝もいるのかちょっと下に潜って探すねありがとうどうしよう、どんどんこの隙に移動しててさコーネが置き去りにされていてしまったらば置き去りにされたらコーネはでも犬かけにそっちまで行くねなかわいいかわいい!"
          },
          {
            "speechId": 928,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 6328283,
            "sourceEndMs": 6328883,
            "text": "届きましたよ!"
          },
          {
            "speechId": 929,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 6332538,
            "sourceEndMs": 6335759,
            "text": "そういうとこがね、好きなんだねえ、やだぁ?"
          },
          {
            "speechId": 930,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 6335759,
            "sourceEndMs": 6336419,
            "text": "んん?"
          },
          {
            "speechId": 931,
            "sourceVideoId": "YE-faluP7zY",
            "sourceStartMs": 6336419,
            "sourceEndMs": 6361383,
            "text": "待て待て、めっちゃwwwこ、こね、どんどん離れていってるwwwまねぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇでも、ほんと?"
          }
        ]
      }
    },
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
      "speechId": 152,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1183641,
      "sourceEndMs": 1199144,
      "text": "平気平気OK待って、弓矢じゃなくて矢も持って持ち物は大丈夫だなよし生の芋、芋焼いとこうかな食料あるよある?"
    },
    {
      "speechId": 153,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1199144,
      "sourceEndMs": 1199564,
      "text": "あるよ、あの"
    },
    {
      "speechId": 154,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1200098,
      "sourceEndMs": 1223383,
      "text": "箱に入ってる全部の箱を1個ずつ開けたら見つかるありがとう次はちゃんとね分かりやすくしとくわ2階建てにしたらきてるきてるきてるお前許さねえサメだサメだ多分サメだコーネいる多分というかサメやこれは間違いなくね間違いなくラフトやこれはラフト?"
    },
    {
      "speechId": 155,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1223383,
      "sourceEndMs": 1229904,
      "text": "これはラフトというゲームやいたいやサメサメサメほらいるよなやっぱりないるすいませんマリンよりコーネのことを食べてください"
    },
    {
      "speechId": 156,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1230214,
      "sourceEndMs": 1234815,
      "text": "なんでやねんコーニーさん狙われたらヤバいで今死にかけの…え、痛っ!"
    },
    {
      "speechId": 157,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1234815,
      "sourceEndMs": 1235315,
      "text": "待って!"
    },
    {
      "speechId": 158,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1235315,
      "sourceEndMs": 1235596,
      "text": "待って!"
    },
    {
      "speechId": 159,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1235596,
      "sourceEndMs": 1236016,
      "text": "痛っ!"
    },
    {
      "speechId": 160,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1236016,
      "sourceEndMs": 1236436,
      "text": "痛っ!"
    },
    {
      "speechId": 161,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1236436,
      "sourceEndMs": 1237096,
      "text": "痛っ!"
    },
    {
      "speechId": 162,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1237096,
      "sourceEndMs": 1237476,
      "text": "痛っ!"
    },
    {
      "speechId": 163,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1237476,
      "sourceEndMs": 1258062,
      "text": "コーニーありがとう今まですごい大好きだった本当によいごんサメはさ弓矢で…でももったいないなちょっとでも確かにね弓矢弱えないっすなあ弓矢でも弓でもサメ倒せるよって言われてるなえ待ってもしかしてさもしかしてこの丈さいや無理かコンコンできるかと思った"
    },
    {
      "speechId": 164,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1260022,
      "sourceEndMs": 1274430,
      "text": "そんな…竹取りの翁というものありきりやんそんな…竹取りの翁というものありきり…そんな丁寧に…あ、違うわ!"
    },
    {
      "speechId": 165,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1274430,
      "sourceEndMs": 1275270,
      "text": "かぐや姫や!"
    },
    {
      "speechId": 166,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1275270,
      "sourceEndMs": 1277732,
      "text": "かぐや姫生まれちゃうよそうだねえ?"
    },
    {
      "speechId": 167,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1277732,
      "sourceEndMs": 1280213,
      "text": "かぐや姫生まれちゃうよなに?"
    },
    {
      "speechId": 168,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1280213,
      "sourceEndMs": 1280473,
      "text": "なに?"
    },
    {
      "speechId": 169,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1280473,
      "sourceEndMs": 1281894,
      "text": "絡みづらい?"
    },
    {
      "speechId": 170,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1281894,
      "sourceEndMs": 1283795,
      "text": "ちょっと絡みづらい…嘘でしょ?"
    },
    {
      "speechId": 171,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1283795,
      "sourceEndMs": 1284495,
      "text": "いつも?"
    },
    {
      "speechId": 172,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1284495,
      "sourceEndMs": 1285236,
      "text": "今日だけ?"
    },
    {
      "speechId": 173,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1285236,
      "sourceEndMs": 1287337,
      "text": "今日絡みづらい?"
    },
    {
      "speechId": 174,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1287337,
      "sourceEndMs": 1289358,
      "text": "いつもは絡みやすい…待って、この魚…"
    },
    {
      "speechId": 175,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1289708,
      "sourceEndMs": 1290000,
      "text": "えいちゃ"
    },
    {
      "speechId": 176,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1290150,
      "sourceEndMs": 1294092,
      "text": "どうしよう気になるやん今日何があったんやんなりんどこ?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
