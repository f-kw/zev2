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
    "windowId": "window_013_YE-faluP7zY",
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
      "speechId": 177,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1294092,
      "sourceEndMs": 1311760,
      "text": "ちょっと今脳死で喋ってるあっ今ね今あの竹取りの桶というものありきりのとこあっよきかなよきかなよきかなちょっとちゃんと時代に染まってるねうんそれはよきかないいじゃんこの辺サメいなさそうな予感する今チャンスなのでは?"
    },
    {
      "speechId": 178,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1311760,
      "sourceEndMs": 1312480,
      "text": "マジ?"
    },
    {
      "speechId": 179,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1312480,
      "sourceEndMs": 1319784,
      "text": "あっでもこっち来そうだなうそえなんかフグもいるって言われてるようんうん普通にいるねこれでもここ海藻"
    },
    {
      "speechId": 180,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1320162,
      "sourceEndMs": 1335495,
      "text": "オンパレードだからちょっと拾うわやばいやばい階層のここの階層も取り尽くした今から来ても遅いからナイス行かねーしそっち行かねーし反対側行ってっしオッケー?"
    },
    {
      "speechId": 181,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1335495,
      "sourceEndMs": 1348625,
      "text": "これも階層だすごいなんか楽しいね楽しいねこっち側何もないかな何もないけどこっち側何もない?"
    },
    {
      "speechId": 182,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1348625,
      "sourceEndMs": 1349286,
      "text": "何にもない"
    },
    {
      "speechId": 183,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1350426,
      "sourceEndMs": 1351046,
      "text": "え?"
    },
    {
      "speechId": 184,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1351046,
      "sourceEndMs": 1380000,
      "text": "金属とかもないけど粘土とかあそっかでかいなこの島でかいよなでかいくせにさ意外となんもない金属なんもないよ金属欲しいよなゆうて金属あったあった海藻あったナイス降りますあんまり行きすぎると戻るのが大変か分かる分かるでもなさそうだなこの辺砂は取ってったほうがいいか砂もそうだね取っとこう"
    },
    {
      "speechId": 185,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1380850,
      "sourceEndMs": 1387813,
      "text": "OKOK砂というもの見つけられり見つけられり?"
    },
    {
      "speechId": 186,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1387813,
      "sourceEndMs": 1390555,
      "text": "見つけられり死ぬ死ぬ?"
    },
    {
      "speechId": 187,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1390555,
      "sourceEndMs": 1392416,
      "text": "海藻ありけり海藻ありけり?"
    },
    {
      "speechId": 188,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1392416,
      "sourceEndMs": 1409884,
      "text": "海藻いっぱいあるいっぱいあるちょっと待って一回上がってよいしょあぁ荷物預けてくればよかったなぁ準備を怠る怠るなかれあーわしもいるわしもやばいこっちはね準備を怠ることなかれだったからね"
    },
    {
      "speechId": 189,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1410846,
      "sourceEndMs": 1427669,
      "text": "あーそれはよきかなよきかなとしか言えんあんまり詳しくないお代官様あそっち行ったどっち行った?"
    },
    {
      "speechId": 190,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1427669,
      "sourceEndMs": 1438592,
      "text": "あらよあらよあらよあらららよ戦術そっちじゃないかなあ改装めっちゃある14枚も拾ったわえ、じゃあ教えてよ何を?"
    },
    {
      "speechId": 191,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1438592,
      "sourceEndMs": 1439592,
      "text": "は?"
    },
    {
      "speechId": 192,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1439592,
      "sourceEndMs": 1439732,
      "text": "え、待って"
    },
    {
      "speechId": 193,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1440770,
      "sourceEndMs": 1469864,
      "text": "もう全部船長が取ったからねもう今更意味ないよそっちじゃない方のさ教えてよお代官様じゃない方のさそれで言うと船長が言った方の反対の方角に向かってもらうと良き島を違う違うよあれ待ってお代官様のまだその話もう終わったからその話終わったなんでごめんね"
    },
    {
      "speechId": 194,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1470194,
      "sourceEndMs": 1479457,
      "text": "終わっちゃったかいつまでそんな話してんだよやる気あるんかお前やばい待て待て仕留められるか?"
    },
    {
      "speechId": 195,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1479457,
      "sourceEndMs": 1488380,
      "text": "何かと戦い始めたいいよいいよ痛そう痛そうこっちが痛いですイノシシやってるもしかして?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
