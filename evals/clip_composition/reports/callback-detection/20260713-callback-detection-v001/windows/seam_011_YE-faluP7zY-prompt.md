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
    "windowId": "seam_011_YE-faluP7zY",
    "windowKind": "seam_bridge",
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
      "speechId": 137,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1110182,
      "sourceEndMs": 1139684,
      "text": "来た時用に矢作ってありがたいねーこれで一緒にターン行こうよちょっと20本ずつちょっとコーネ1本少ない19本だけどまあ細かいことは全然いい全然いいあ全然いい解消できるしねベトベト足りるかなベトベトベトベト足りるかな問題があったわやっと見つけたオッケーあ行けるなよし弓作ったあじゃあ今ここで渡しちゃうねありがてーよこれ弓と"
    },
    {
      "speechId": 138,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1140194,
      "sourceEndMs": 1141995,
      "text": "はいこれ、嫌ね?"
    },
    {
      "speechId": 139,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1141995,
      "sourceEndMs": 1142956,
      "text": "拾ってよ?"
    },
    {
      "speechId": 140,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1142956,
      "sourceEndMs": 1144276,
      "text": "水に流される前にね?"
    },
    {
      "speechId": 141,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1144276,
      "sourceEndMs": 1147819,
      "text": "はいはいはいはいちょっとご飯も食べるから拾った!"
    },
    {
      "speechId": 142,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1147819,
      "sourceEndMs": 1148819,
      "text": "オッケー?"
    },
    {
      "speechId": 143,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1148819,
      "sourceEndMs": 1154923,
      "text": "うーんと、サメの頭いらねご飯も食べてよ?"
    },
    {
      "speechId": 144,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1154923,
      "sourceEndMs": 1156044,
      "text": "はい!"
    },
    {
      "speechId": 145,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1156044,
      "sourceEndMs": 1162007,
      "text": "よし、今日はしし鍋しし丼しし汁しししちゅうね?"
    },
    {
      "speechId": 146,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1162007,
      "sourceEndMs": 1164989,
      "text": "そう、しししちゅうが一番好きだわあ、これ夜になるけどこれどう?"
    },
    {
      "speechId": 147,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1164989,
      "sourceEndMs": 1165249,
      "text": "いいか?"
    },
    {
      "speechId": 148,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1165249,
      "sourceEndMs": 1169712,
      "text": "別に先にねほねば、夜の方がさ、海の中"
    },
    {
      "speechId": 149,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1170418,
      "sourceEndMs": 1174119,
      "text": "あれだよな、探索しやすいんだよなあ、する?"
    },
    {
      "speechId": 150,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1174119,
      "sourceEndMs": 1182180,
      "text": "最初海の中やっちゃってそうやで、暗いとイノシシも見えなくて危ないしあ、これマリリーさんこれ使ってみるよ、禰豆子あ、禰豆子?"
    },
    {
      "speechId": 151,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1182180,
      "sourceEndMs": 1183641,
      "text": "いや、大丈夫だよ平気?"
    },
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
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
