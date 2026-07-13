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
    "windowId": "window_028_YE-faluP7zY",
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
      "speechId": 518,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3601814,
      "sourceEndMs": 3630000,
      "text": "えぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇ"
    },
    {
      "speechId": 519,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3630326,
      "sourceEndMs": 3630947,
      "text": "どこ行った?"
    },
    {
      "speechId": 520,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3630947,
      "sourceEndMs": 3634469,
      "text": "ここにいるねあれ?"
    },
    {
      "speechId": 521,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3634469,
      "sourceEndMs": 3659924,
      "text": "見つけた見つけたそこにいてそろりそろり肉食べよう肉食べようじゃん夜景の見えるレストランを私しましたお前その顔でイノシシの肉を持ってくるって"
    },
    {
      "speechId": 522,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3662551,
      "sourceEndMs": 3689086,
      "text": "じゃあ行きますよかんぱいかんぱい食べてる食べてるせーのあんまかゆくしねえじゃねえかなんでこんな温存したんだよ何も回復量変わらねえじゃねえかよ"
    },
    {
      "speechId": 523,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3696786,
      "sourceEndMs": 3719724,
      "text": "マジでマジ死ぬ笑いすぎてもうマジいっぱいの獅子やんこんなめっちゃ泣いてるし鼻水もいっぱい出てるし待って鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来て"
    },
    {
      "speechId": 524,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3720322,
      "sourceEndMs": 3749904,
      "text": "すぐはぐれるじゃんやだここだよやだなんでどこちょっと待って今なんで岩落としてくるんだねえ岩拾いに行ったとこにさはいはいはい待ってコーネどこコーネどこすぐはぐれるじゃねえかどこだコーネからだんだんイノスケに変わってくるやめろ痛い痛い痛い長いねこれねここであれ岩さ岩のさ岩の出所をさ探しにさそうねそうね岩の出所にあそこの上"
    },
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
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
