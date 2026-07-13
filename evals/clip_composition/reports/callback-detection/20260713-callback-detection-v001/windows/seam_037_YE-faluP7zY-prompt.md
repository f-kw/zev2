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
    "windowId": "seam_037_YE-faluP7zY",
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
      "speechId": 734,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4917333,
      "sourceEndMs": 4919634,
      "text": "ベラボーベラボーあ、これまた"
    },
    {
      "speechId": 735,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4925857,
      "sourceEndMs": 4949872,
      "text": "やっぱフック使った方がいいわそうだね気づいたわ今遅いよ気づくよ遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅�"
    },
    {
      "speechId": 736,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4956599,
      "sourceEndMs": 4961304,
      "text": "嫌ではないこれさ、1階つけたこれ外せんのかな?"
    },
    {
      "speechId": 737,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4961304,
      "sourceEndMs": 4962185,
      "text": "もう外せないのかな?"
    },
    {
      "speechId": 738,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4962185,
      "sourceEndMs": 4963286,
      "text": "いやでも、いいんじゃない?"
    },
    {
      "speechId": 739,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4963286,
      "sourceEndMs": 4972915,
      "text": "これぐらいで3階建てとかにしようよ、そしたらあ、1階は狭めでね、天井引くマジで多分これさ、物がいっぱい置いてあるからさ狭く見えるだけじゃない?"
    },
    {
      "speechId": 740,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4972915,
      "sourceEndMs": 4976199,
      "text": "なんか勝手に島に到着しちゃったマジ?"
    },
    {
      "speechId": 741,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4976199,
      "sourceEndMs": 4978741,
      "text": "ここに行けというお告げだじゃあアンカー作ります?"
    },
    {
      "speechId": 742,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 4980118,
      "sourceEndMs": 5008544,
      "text": "あ、確かにじゃあここでまたねまた集めよっかいのししもいるかもしれないしね反応してる反応してるいのししも喜んでるロープ石嬉しいぞ声がもう嬉しい嬉しいぞ本当さごめんなんだけどマリリンここの箱見てここここ?"
    },
    {
      "speechId": 743,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5008544,
      "sourceEndMs": 5009944,
      "text": "仲間外れがいるよこっちこっち"
    },
    {
      "speechId": 744,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5010074,
      "sourceEndMs": 5013056,
      "text": "手前の箱仲間外れの葉っぱはどれかな?"
    },
    {
      "speechId": 745,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5013056,
      "sourceEndMs": 5021861,
      "text": "これこれねこれねこれねこれだー!"
    },
    {
      "speechId": 746,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5021861,
      "sourceEndMs": 5023902,
      "text": "買いぞー!"
    },
    {
      "speechId": 747,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5023902,
      "sourceEndMs": 5025143,
      "text": "見つけた!"
    },
    {
      "speechId": 748,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5025143,
      "sourceEndMs": 5026684,
      "text": "見つけたぞー!"
    },
    {
      "speechId": 749,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5026684,
      "sourceEndMs": 5027064,
      "text": "見ーっけー!"
    },
    {
      "speechId": 750,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5027064,
      "sourceEndMs": 5030987,
      "text": "仲間外れ見っけー!"
    },
    {
      "speechId": 751,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5030987,
      "sourceEndMs": 5035930,
      "text": "終わったごめん面白すぎてちょっと見せたかったわご飯ある?"
    },
    {
      "speechId": 752,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5035930,
      "sourceEndMs": 5038751,
      "text": "ご飯あるよ生酢焼けてるよ食べない?"
    },
    {
      "speechId": 753,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5038751,
      "sourceEndMs": 5039712,
      "text": "ここ生酢あるから"
    },
    {
      "speechId": 754,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5040042,
      "sourceEndMs": 5047946,
      "text": "いただきますわ食べて食べてマジくだらねーわ気づいた?"
    },
    {
      "speechId": 755,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5047946,
      "sourceEndMs": 5069478,
      "text": "気づいた作業しまーすまず食べようはい、あんこ落としたよナイスナイスナイスパクパクナマズ一息で全部食べたわオッケオッケまだ魚いっぱいあるから焼きますあまりの空腹に美味しかったねどんどん食べとどっかに集めようかな焼くわ"
    },
    {
      "speechId": 756,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5070266,
      "sourceEndMs": 5074108,
      "text": "なんか、ある程度分けたんだよね?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
