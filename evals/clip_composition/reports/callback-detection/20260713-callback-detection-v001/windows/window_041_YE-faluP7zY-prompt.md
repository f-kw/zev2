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
    "windowId": "window_041_YE-faluP7zY",
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
      "speechId": 812,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5429346,
      "sourceEndMs": 5430000,
      "text": "え、ちょっと待って"
    },
    {
      "speechId": 813,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5431915,
      "sourceEndMs": 5459098,
      "text": "ちょっと待って忙しくなって気上がりましたわすごいじゃんなんかしたいなちょっとじゃあもうここ離して移動しました移動してまた板とか集めて欲しいかなじゃあアンカー外します壁の収納所気になりますちょっともう一回魚釣ろうこれちょっとぶち壊して待って待ってまず2階の"
    },
    {
      "speechId": 814,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5460342,
      "sourceEndMs": 5489452,
      "text": "ここの完成させようここをこのエリアを2階で何をしたいかって言ったらやっぱり作物とかヤシの木を2階で育てたいよねそれなそれなじゃあとりあえず魚釣りながらあれだ材料集めるわんでもやっぱさ1回さジャンプでさ移動できないのちょっとだるいよね引っかかってあジャンプあー別にいいようーんあー"
    },
    {
      "speechId": 815,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5490987,
      "sourceEndMs": 5499272,
      "text": "わかるわかるジャンプに移動できた方がいいわな何してる?"
    },
    {
      "speechId": 816,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5499272,
      "sourceEndMs": 5499512,
      "text": "大丈夫?"
    },
    {
      "speechId": 817,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5499512,
      "sourceEndMs": 5501533,
      "text": "大丈夫サメ?"
    },
    {
      "speechId": 818,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5501533,
      "sourceEndMs": 5514140,
      "text": "サメサメねジャンプで木なくなった木なくなった木なくなった待ってよ何枚持ってると思う?"
    },
    {
      "speechId": 819,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5514140,
      "sourceEndMs": 5519964,
      "text": "ちょっと待って期待を込めて50枚マジで言ってる?"
    },
    {
      "speechId": 820,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5520750,
      "sourceEndMs": 5522671,
      "text": "50枚ある?"
    },
    {
      "speechId": 821,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5522671,
      "sourceEndMs": 5523691,
      "text": "6枚6枚?"
    },
    {
      "speechId": 822,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5523691,
      "sourceEndMs": 5529994,
      "text": "まあまあまあまあでも待ってここになかった?"
    },
    {
      "speechId": 823,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5529994,
      "sourceEndMs": 5530275,
      "text": "どこ?"
    },
    {
      "speechId": 824,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5530275,
      "sourceEndMs": 5537818,
      "text": "ここなかったなかったかもうないよごめんね本当にまたコツコツ今から集めるから進んでなくない?"
    },
    {
      "speechId": 825,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5537818,
      "sourceEndMs": 5546502,
      "text": "待ってやばいきっと大区画の作物になっちゃって進んでないのであれ?"
    },
    {
      "speechId": 826,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5546502,
      "sourceEndMs": 5549244,
      "text": "ん?"
    },
    {
      "speechId": 827,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5549244,
      "sourceEndMs": 5549924,
      "text": "船がね進んでない"
    },
    {
      "speechId": 828,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5552102,
      "sourceEndMs": 5578382,
      "text": "あれかな、ちょっと一回砲つけてさそうね、砲つけないとね、これねOK、つけるわよーほーよーほーだわ、これさーけばーあれ、砲どこやったっけ、船長あ、持ってたわ、手に待って、ここにこれパドルがあるから必要なのほらほら、行く行くほらほら、見ていや、砲立てたほうが早いからほら見てよ、移動してない?"
    },
    {
      "speechId": 829,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5578382,
      "sourceEndMs": 5578702,
      "text": "してる"
    },
    {
      "speechId": 830,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5581366,
      "sourceEndMs": 5584688,
      "text": "捨てるけど、頬を立てたほうがほら!"
    },
    {
      "speechId": 831,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5584688,
      "sourceEndMs": 5586909,
      "text": "ほらほらほらほら!"
    },
    {
      "speechId": 832,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5586909,
      "sourceEndMs": 5591793,
      "text": "そんな、そんなちまちまやってさぁひどしてるよ!"
    },
    {
      "speechId": 833,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5591793,
      "sourceEndMs": 5593073,
      "text": "まどろっこしいんだよ!"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
