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
    "windowId": "seam_046_YE-faluP7zY",
    "windowKind": "seam_bridge",
    "sourceVideoId": "YE-faluP7zY"
  },
  "targets": [
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
    },
    {
      "speechId": 932,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6361383,
      "sourceEndMs": 6362065,
      "text": "見てて?"
    },
    {
      "speechId": 933,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6362065,
      "sourceEndMs": 6362286,
      "text": "分かった"
    },
    {
      "speechId": 934,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6390286,
      "sourceEndMs": 6390766,
      "text": "いた!"
    },
    {
      "speechId": 935,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6390766,
      "sourceEndMs": 6391527,
      "text": "18枚!"
    },
    {
      "speechId": 936,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6391527,
      "sourceEndMs": 6392948,
      "text": "あ、ナイス!"
    },
    {
      "speechId": 937,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6392948,
      "sourceEndMs": 6394909,
      "text": "鉱石は?"
    },
    {
      "speechId": 938,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6394909,
      "sourceEndMs": 6395669,
      "text": "鉱石?"
    },
    {
      "speechId": 939,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6395669,
      "sourceEndMs": 6399091,
      "text": "鉱石!"
    },
    {
      "speechId": 940,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6399091,
      "sourceEndMs": 6404515,
      "text": "君の笑顔が鉱石だよやがましすぎる、ちょっと待ってサメ、サメ来て!"
    },
    {
      "speechId": 941,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6404515,
      "sourceEndMs": 6406996,
      "text": "そんなこと言ってる場合じゃねえんだよ!"
    },
    {
      "speechId": 942,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6406996,
      "sourceEndMs": 6409217,
      "text": "サメが来てんだよ、サメ貝は!"
    },
    {
      "speechId": 943,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6409217,
      "sourceEndMs": 6410418,
      "text": "鉱石がないです!"
    },
    {
      "speechId": 944,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6410418,
      "sourceEndMs": 6415321,
      "text": "まあまあ、まあいいでしょうで、何をしたいんだっけ?"
    },
    {
      "speechId": 945,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6415321,
      "sourceEndMs": 6419384,
      "text": "船長あ、そうだ、えーと、であ、いたいたいたいや、こんなに離れちゃうもんなんだな"
    },
    {
      "speechId": 946,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6421242,
      "sourceEndMs": 6421542,
      "text": "ね!"
    },
    {
      "speechId": 947,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6421542,
      "sourceEndMs": 6422683,
      "text": "意外と移動してたね!"
    },
    {
      "speechId": 948,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6422683,
      "sourceEndMs": 6423464,
      "text": "ね!"
    },
    {
      "speechId": 949,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6423464,
      "sourceEndMs": 6436173,
      "text": "こんなに離れちゃうのかOKOK良いね良いね、挟まってたのいっぱいじゃあこれを板12枚入れたよーありがとう!"
    },
    {
      "speechId": 950,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6436173,
      "sourceEndMs": 6437494,
      "text": "ナイス!"
    },
    {
      "speechId": 951,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6437494,
      "sourceEndMs": 6438115,
      "text": "ナイス!"
    },
    {
      "speechId": 952,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6438115,
      "sourceEndMs": 6448103,
      "text": "水物見て水物見て釣り竿古い方使っちゃおうえ、まだお腹空いてないの?"
    },
    {
      "speechId": 953,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6448103,
      "sourceEndMs": 6449243,
      "text": "マリリンまだ行けるかな?"
    },
    {
      "speechId": 954,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6449243,
      "sourceEndMs": 6449964,
      "text": "マジ?"
    },
    {
      "speechId": 955,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6451610,
      "sourceEndMs": 6479458,
      "text": "そろそろ減ってくるかなってところまず食べちゃおうからねいいよお腹減ってんな食べなそれはマリンにくださいよっていうのかと思ったそれは船長のですよそっかマリン船長っていうか解像度低いのやめてよ学習学習つらいコーネに分かってもらえてなかったのつらい"
    },
    {
      "speechId": 956,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6480406,
      "sourceEndMs": 6484328,
      "text": "え、分かってるよ分かってくれてる?"
    },
    {
      "speechId": 957,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6484328,
      "sourceEndMs": 6510760,
      "text": "マリンは船長って言うよねでも知らなかったじゃん今完全にさ知らなかったわけじゃないとっさに出ちゃうよやっぱりマリンって呼んでるからさあー特別なね呼び方だからねそうだよそうだよじゃあしょうがない最近最近さなんか呼び捨てで呼ぶ時もあるからさそうですねマリンのこと最近そうなってきたよねなんかさ匂わしちゃってわかりみわかりみ"
    },
    {
      "speechId": 958,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6531258,
      "sourceEndMs": 6538283,
      "text": "正常期って確かに2階に置いたら水汲んで入れるのが大変かどう考えても確かにそうだなでも1階と2階と3階に作れば?"
    },
    {
      "speechId": 959,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 6538283,
      "sourceEndMs": 6539604,
      "text": "3階作る予定でいる"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
