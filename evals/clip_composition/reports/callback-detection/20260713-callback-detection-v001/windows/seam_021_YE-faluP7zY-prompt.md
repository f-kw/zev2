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
    "windowId": "seam_021_YE-faluP7zY",
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
      "speechId": 361,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2488337,
      "sourceEndMs": 2489398,
      "text": "酸素ボンベ欲しくなってきたな"
    },
    {
      "speechId": 362,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2490482,
      "sourceEndMs": 2492143,
      "text": "あげるよ?"
    },
    {
      "speechId": 363,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2492143,
      "sourceEndMs": 2519066,
      "text": "いや、大丈夫新しいやつがいかん作るわ、いずれ出世したらさすがやなお、お風呂はいらないってかあ、でも声ってか口つき立ってるもんね、これブチュチュってなんか、でもね、船長、コーナーだったらいいよ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死"
    },
    {
      "speechId": 364,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2521474,
      "sourceEndMs": 2523255,
      "text": "なんで死にかけてるの?"
    },
    {
      "speechId": 365,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2523255,
      "sourceEndMs": 2525615,
      "text": "なんで死にかけてんの?"
    },
    {
      "speechId": 366,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2525615,
      "sourceEndMs": 2530097,
      "text": "いや、水の中でさ、ゴンにさ、息できると思ってたらしくてさ。"
    },
    {
      "speechId": 367,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2530097,
      "sourceEndMs": 2531317,
      "text": "残念やね。"
    },
    {
      "speechId": 368,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2531317,
      "sourceEndMs": 2534198,
      "text": "3,3本目を手にしたことで調子に乗ってますね。"
    },
    {
      "speechId": 369,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2534198,
      "sourceEndMs": 2536639,
      "text": "そう、調子乗ってた今。"
    },
    {
      "speechId": 370,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2536639,
      "sourceEndMs": 2539200,
      "text": "でもね、金属の鉱石がね。"
    },
    {
      "speechId": 371,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2539200,
      "sourceEndMs": 2540381,
      "text": "あ、見つけた?"
    },
    {
      "speechId": 372,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2540381,
      "sourceEndMs": 2541381,
      "text": "8個。"
    },
    {
      "speechId": 373,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2541381,
      "sourceEndMs": 2542721,
      "text": "え、すごいじゃん。"
    },
    {
      "speechId": 374,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2542721,
      "sourceEndMs": 2543802,
      "text": "すごーい。"
    },
    {
      "speechId": 375,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2543802,
      "sourceEndMs": 2544122,
      "text": "役に立ってる。"
    },
    {
      "speechId": 376,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2544122,
      "sourceEndMs": 2548704,
      "text": "待って、全然ないんだけど。"
    },
    {
      "speechId": 377,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2548704,
      "sourceEndMs": 2549944,
      "text": "壁にくっついてるのがそれか。"
    },
    {
      "speechId": 378,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2551246,
      "sourceEndMs": 2578983,
      "text": "ちょっと青っぽく光ったやつだよねわかってはいるんだよないよなでもな普通になんか全然サメも来ないし何これサメいないねいなくなったね安定してきたなEGM良すぎるな今ない船長の方消えたマジ?"
    },
    {
      "speechId": 379,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2580020,
      "sourceEndMs": 2594066,
      "text": "虫がいるわしも殺したいね朝になんないかな早く水飲もう汲んできてよかった水痛っ!"
    },
    {
      "speechId": 380,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2594066,
      "sourceEndMs": 2596987,
      "text": "マリンマリンどうした?"
    },
    {
      "speechId": 381,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2596987,
      "sourceEndMs": 2597527,
      "text": "どこにいるの?"
    },
    {
      "speechId": 382,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2597527,
      "sourceEndMs": 2598908,
      "text": "どこになっちゃいました?"
    },
    {
      "speechId": 383,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2598908,
      "sourceEndMs": 2600108,
      "text": "死んだ?"
    },
    {
      "speechId": 384,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2600108,
      "sourceEndMs": 2604190,
      "text": "まだギリギリでも死んだギリギリ生きてる生きてるどこにいるの?"
    },
    {
      "speechId": 385,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2604190,
      "sourceEndMs": 2609792,
      "text": "生き残った食べてね食べるわいやそれ怖いよな"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
