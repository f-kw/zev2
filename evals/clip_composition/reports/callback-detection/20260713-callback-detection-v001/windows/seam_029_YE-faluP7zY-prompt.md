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
    "windowId": "seam_029_YE-faluP7zY",
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
      "speechId": 552,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3840794,
      "sourceEndMs": 3851679,
      "text": "あそういうことじゃ上に行ってるわけじゃないんだそういう感じっぽい上に来たけど上にも何もないなこれ何もない?"
    },
    {
      "speechId": 553,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3851679,
      "sourceEndMs": 3865406,
      "text": "パイナップルが咲いてるあお腹減ってるから食べる黄色い粉とかは取らなくていいよな粉はいらないかもねあそこに止まるのかもしれないね"
    },
    {
      "speechId": 554,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3872594,
      "sourceEndMs": 3873174,
      "text": "止まるんじゃない?"
    },
    {
      "speechId": 555,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3873174,
      "sourceEndMs": 3879156,
      "text": "あそこにえ、分からんなこれどうすればいいんじゃんこれちょっと満身創痍だよどうする?"
    },
    {
      "speechId": 556,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3879156,
      "sourceEndMs": 3900000,
      "text": "やばいねでもねあ、今下にいてランチタブなんだうぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅ"
    },
    {
      "speechId": 557,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3900514,
      "sourceEndMs": 3903595,
      "text": "やめようちょっと待ってどこ行った?"
    },
    {
      "speechId": 558,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3903595,
      "sourceEndMs": 3904615,
      "text": "こうね後ろ?"
    },
    {
      "speechId": 559,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3904615,
      "sourceEndMs": 3906196,
      "text": "どこ?"
    },
    {
      "speechId": 560,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3906196,
      "sourceEndMs": 3915439,
      "text": "後ろを振り返ってごらんイノシシ君行きましょう行くぞ!"
    },
    {
      "speechId": 561,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3915439,
      "sourceEndMs": 3918880,
      "text": "声が声が太すぎる行くぞ!"
    },
    {
      "speechId": 562,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3918880,
      "sourceEndMs": 3920401,
      "text": "行くぞ!"
    },
    {
      "speechId": 563,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3920401,
      "sourceEndMs": 3923242,
      "text": "でもイノシシもいなくないか?"
    },
    {
      "speechId": 564,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3923242,
      "sourceEndMs": 3927483,
      "text": "もしかしてもうやっちゃったかもねやっちゃった?"
    },
    {
      "speechId": 565,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3927483,
      "sourceEndMs": 3929884,
      "text": "川他にねえ待ってもうさ移動するこれ?"
    },
    {
      "speechId": 566,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3930774,
      "sourceEndMs": 3936278,
      "text": "ワンチャンありだね、この島結構居だしね、ずっとね、魚釣ってた方がこれ、こう、良いのでは?"
    },
    {
      "speechId": 567,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3936278,
      "sourceEndMs": 3947364,
      "text": "効率確かに、ぐるっと、こっからぐるっとさ、一瞬回ってくか何かさ、特別なものがないか見ながらえっ、目の前に居る?"
    },
    {
      "speechId": 568,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3947364,
      "sourceEndMs": 3948205,
      "text": "えっ?"
    },
    {
      "speechId": 569,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3948205,
      "sourceEndMs": 3948425,
      "text": "居んの?"
    },
    {
      "speechId": 570,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3948425,
      "sourceEndMs": 3951647,
      "text": "こ、こんなのことじゃない?"
    },
    {
      "speechId": 571,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3951647,
      "sourceEndMs": 3952167,
      "text": "分かりづれー!"
    },
    {
      "speechId": 572,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3952167,
      "sourceEndMs": 3952407,
      "text": "分かりづれーこと言うな!"
    },
    {
      "speechId": 573,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3952407,
      "sourceEndMs": 3959892,
      "text": "あ、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
