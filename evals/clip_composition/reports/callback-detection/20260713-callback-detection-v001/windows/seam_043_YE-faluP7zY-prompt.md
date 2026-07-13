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
    "windowId": "seam_043_YE-faluP7zY",
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
      "speechId": 869,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5813083,
      "sourceEndMs": 5820000,
      "text": "ごめんなさい…ごめんなさい…ごめんなさい…お魚…お魚釣って…お魚…よいしょ…お魚…お魚…お水入れて"
    },
    {
      "speechId": 870,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5821110,
      "sourceEndMs": 5824633,
      "text": "水遠いのだる水遠いのだるいな2個作る?"
    },
    {
      "speechId": 871,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5824633,
      "sourceEndMs": 5831798,
      "text": "2個いらないか水はでも割ってもいいかもね作るコスト的にそんな重くなければ2回にも作れば?"
    },
    {
      "speechId": 872,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5831798,
      "sourceEndMs": 5849852,
      "text": "そうだね2回にも作ろうかなワンチャンありだよね便利だよね4人でやるわけだしガラスならね砂焼けば作れるしありだなありありその意見素敵ですえっとどっかに魚が釣れなくなったあったかな砂とりあえずじゃあぶち込んで"
    },
    {
      "speechId": 873,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5852255,
      "sourceEndMs": 5871583,
      "text": "雨降ってきた雨か、今日はまた居た、亡くなったなんか全然流れてこないねあれだ、フォー開いてるからだちょっと閉じるわあ、そっかそっか、ごめんごめん、そうだそうだ何回同じこと言うねんって言うねん反省した?"
    },
    {
      "speechId": 874,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5871583,
      "sourceEndMs": 5872143,
      "text": "こうね?"
    },
    {
      "speechId": 875,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5872143,
      "sourceEndMs": 5877946,
      "text": "反省した、今反省したよしよし分かればよろしいさすがやな"
    },
    {
      "speechId": 876,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5880002,
      "sourceEndMs": 5888349,
      "text": "反省できるだがしかし学習もしないごめんなさい!"
    },
    {
      "speechId": 877,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5888349,
      "sourceEndMs": 5889129,
      "text": "サメもいる!"
    },
    {
      "speechId": 878,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5889129,
      "sourceEndMs": 5899738,
      "text": "気をつけてね落ちないように板がなくてさ砂が焼けないよ魚食べる?"
    },
    {
      "speechId": 879,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5899738,
      "sourceEndMs": 5900879,
      "text": "残されてる!"
    },
    {
      "speechId": 880,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5908790,
      "sourceEndMs": 5910000,
      "text": "流されちゃったってこと"
    },
    {
      "speechId": 881,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5910746,
      "sourceEndMs": 5939452,
      "text": "でもね、ナマズは流されなかった神やんナマズさえあればね3色いけるからなナマズでナマズ焼くねこれマリリーにあげるわえっとナマズえっとこうで美味しく焼けますようにマリリーのためによいしょ愛を込めてるそうだよ意識高いないたいたいたいたいたいたいたないかな"
    },
    {
      "speechId": 882,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5940650,
      "sourceEndMs": 5950937,
      "text": "いたねーちょっと泳いでるすぐ野生に帰るいた流れてこないな全然あ、頬畳むか畳んだ?"
    },
    {
      "speechId": 883,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5950937,
      "sourceEndMs": 5969090,
      "text": "畳んだOKOKOKあ、流れてきた流れてきたよしよしよしよしだいぶ流れてきたわね気づいたらめっちゃめっちゃすり減ってるわこれほらよ食われてる味方がゴリゴリ食われてるやばいな"
    },
    {
      "speechId": 884,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5970194,
      "sourceEndMs": 5971655,
      "text": "あいつらマジでえ、これ?"
    },
    {
      "speechId": 885,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5971655,
      "sourceEndMs": 5975696,
      "text": "あ、でもそっか止まってないとん?"
    },
    {
      "speechId": 886,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5975696,
      "sourceEndMs": 5995142,
      "text": "やめてください止まってないとさサメの餌は使えないんだもんねそうだねどうしよっかな食われないくできるんかななんか食われなくはできないんじゃない?"
    },
    {
      "speechId": 887,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 5995142,
      "sourceEndMs": 5999884,
      "text": "なんかメタリック加工みたいなのできないのかなあ、でもそれはあったけどちょっとコストが重たいから"
    },
    {
      "speechId": 888,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6000086,
      "sourceEndMs": 6012348,
      "text": "今はきついかなぁ今はとりあえずしょうがないとしてマジで板足りないなこれ大丈夫?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
