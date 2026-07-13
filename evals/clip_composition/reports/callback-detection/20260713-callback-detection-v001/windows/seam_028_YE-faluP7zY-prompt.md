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
    "windowId": "seam_028_YE-faluP7zY",
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
      "speechId": 525,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3750806,
      "sourceEndMs": 3752486,
      "text": "上でもあれ登れるか?"
    },
    {
      "speechId": 526,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3752486,
      "sourceEndMs": 3763229,
      "text": "え、でも見て足場みたいなのがあるよあ、これワンチャン登れとほら見て見てさすが伊之助くんすごい身のこなしすごすぎるあ、痛っ!"
    },
    {
      "speechId": 527,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3763229,
      "sourceEndMs": 3767029,
      "text": "あーこれ無理かなえ、痛れる?"
    },
    {
      "speechId": 528,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3767029,
      "sourceEndMs": 3779852,
      "text": "いや無理じゃない登らないってこれでもここにさ足場があるってことはさ足場じゃなくてさこれネイチャーアートだよこれ自然が作り出したものでさいやいやそんな登る足場"
    },
    {
      "speechId": 529,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3780418,
      "sourceEndMs": 3782640,
      "text": "マジ?"
    },
    {
      "speechId": 530,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3782640,
      "sourceEndMs": 3784401,
      "text": "マジで言ってるの?"
    },
    {
      "speechId": 531,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3784401,
      "sourceEndMs": 3788484,
      "text": "あの鳥がこっちに戻ってくるとき、それがお前の死ぬときだここ!"
    },
    {
      "speechId": 532,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3788484,
      "sourceEndMs": 3790965,
      "text": "くそー!"
    },
    {
      "speechId": 533,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3790965,
      "sourceEndMs": 3791245,
      "text": "あーくそ!"
    },
    {
      "speechId": 534,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3791245,
      "sourceEndMs": 3792887,
      "text": "マリリンどこ行ったの?"
    },
    {
      "speechId": 535,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3792887,
      "sourceEndMs": 3795608,
      "text": "あの岩の上岩の上のぽにょ?"
    },
    {
      "speechId": 536,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3795608,
      "sourceEndMs": 3797790,
      "text": "待って、水やばい岩の上のぽにょ?"
    },
    {
      "speechId": 537,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3797790,
      "sourceEndMs": 3798350,
      "text": "やだ!"
    },
    {
      "speechId": 538,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3798350,
      "sourceEndMs": 3798470,
      "text": "痛い!"
    },
    {
      "speechId": 539,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3798470,
      "sourceEndMs": 3798590,
      "text": "痛い!"
    },
    {
      "speechId": 540,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3798590,
      "sourceEndMs": 3799911,
      "text": "痛い!"
    },
    {
      "speechId": 541,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3799911,
      "sourceEndMs": 3800212,
      "text": "マジ?"
    },
    {
      "speechId": 542,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3800212,
      "sourceEndMs": 3800612,
      "text": "どうした?"
    },
    {
      "speechId": 543,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3800612,
      "sourceEndMs": 3800872,
      "text": "どうした?"
    },
    {
      "speechId": 544,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3800872,
      "sourceEndMs": 3801633,
      "text": "どうした?"
    },
    {
      "speechId": 545,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3801633,
      "sourceEndMs": 3803274,
      "text": "くらったー死んだ?"
    },
    {
      "speechId": 546,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3803274,
      "sourceEndMs": 3808177,
      "text": "いや、まだまだ生きてるえ、待って、反対側から登れるってマジ?"
    },
    {
      "speechId": 547,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3808177,
      "sourceEndMs": 3809258,
      "text": "うん、コメントに書いてある"
    },
    {
      "speechId": 548,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3810310,
      "sourceEndMs": 3820095,
      "text": "そんなさ反対側から登れるよってそんなさすごいじゃんまた来てるまた来てるまた来てるっておいでおいでマリンマリン生きてる?"
    },
    {
      "speechId": 549,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3820095,
      "sourceEndMs": 3822016,
      "text": "まだ生きてるコーネどこ?"
    },
    {
      "speechId": 550,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3822016,
      "sourceEndMs": 3824737,
      "text": "コーネもう上登ってるよあ裏から?"
    },
    {
      "speechId": 551,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3824737,
      "sourceEndMs": 3839904,
      "text": "うん今裏に一瞬影がね見えた気がしたのあ本当だ登れたよOK行くわなにこれ黒い粉だったわコーネ今ね今鳥のこと見てたらね鳥ね普通にねあの床に落ちてる道端の地面のね岩拾って"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
