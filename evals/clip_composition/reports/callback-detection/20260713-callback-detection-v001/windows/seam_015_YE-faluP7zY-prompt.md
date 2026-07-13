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
    "windowId": "seam_015_YE-faluP7zY",
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
      "speechId": 228,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1713902,
      "sourceEndMs": 1714583,
      "text": "あれか?"
    },
    {
      "speechId": 229,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1714583,
      "sourceEndMs": 1715304,
      "text": "あれか?"
    },
    {
      "speechId": 230,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1715304,
      "sourceEndMs": 1715564,
      "text": "いる?"
    },
    {
      "speechId": 231,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1715564,
      "sourceEndMs": 1715884,
      "text": "いた?"
    },
    {
      "speechId": 232,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1715884,
      "sourceEndMs": 1717125,
      "text": "いた?"
    },
    {
      "speechId": 233,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1717125,
      "sourceEndMs": 1739066,
      "text": "あ、よかったよーあ、よかったよーよしよしよしつまいよ、遠いかなこれイカダから大丈夫、任せろ任せたぞ運び切ってみせるやばい、水分もカラカラになってきちゃった待っててくれ、大丈夫起きれば全部回復するからいや、助かり助かり待ってるコーネなになになに"
    },
    {
      "speechId": 234,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1740386,
      "sourceEndMs": 1754895,
      "text": "やばい怖いしたやばい怖いしたイノシシいるねやばいぞこれマリリンに聞きたいんだけどさこれさまだこの島まだこの島いる?"
    },
    {
      "speechId": 235,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1754895,
      "sourceEndMs": 1758637,
      "text": "あーここにいてもいいかって話?"
    },
    {
      "speechId": 236,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1758637,
      "sourceEndMs": 1761759,
      "text": "そう捨てる?"
    },
    {
      "speechId": 237,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1761759,
      "sourceEndMs": 1769884,
      "text": "取材次第かな起きたら見てみるわどれくらい集めたかOK海藻はめっちゃ拾った"
    },
    {
      "speechId": 238,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1770426,
      "sourceEndMs": 1799772,
      "text": "なんだけどねでもまだね全然粘土もさっき見かけたしまだまだ何でもありそうではある申し訳ねーけどさほら今武器をさ手に入れたからねこれであればそうね弓ねせんきゅーベイブせんきゅーよしちょっと食べ物あーありがとう持ち歩いた方がいいかもね食べ物そうね待ってでもねちょっと残ってるこれ一個食べてこのねここのこのなんていうのあのさこのコンロじゃなくてなんだこれ洋コンロに近い"
    },
    {
      "speechId": 239,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1800000,
      "sourceEndMs": 1804243,
      "text": "このボックスの中に食べ物入ってるありがてー!"
    },
    {
      "speechId": 240,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1804243,
      "sourceEndMs": 1807086,
      "text": "サンキュー!"
    },
    {
      "speechId": 241,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1807086,
      "sourceEndMs": 1807786,
      "text": "よーこいろ!"
    },
    {
      "speechId": 242,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1807786,
      "sourceEndMs": 1809147,
      "text": "ありがとう!"
    },
    {
      "speechId": 243,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1809147,
      "sourceEndMs": 1817494,
      "text": "ちょっと、じゃあクジラ、クジラじゃないやサメもらうわクジラ?"
    },
    {
      "speechId": 244,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1817494,
      "sourceEndMs": 1819996,
      "text": "あ、オッケオッケオッケサメ!"
    },
    {
      "speechId": 245,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1819996,
      "sourceEndMs": 1821817,
      "text": "サメもらって葉っぱがね、あ、60枚集めたねえ、めっちゃ集めてる!"
    },
    {
      "speechId": 246,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1821817,
      "sourceEndMs": 1823419,
      "text": "葉っぱ60枚!"
    },
    {
      "speechId": 247,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1823419,
      "sourceEndMs": 1823439,
      "text": "?"
    },
    {
      "speechId": 248,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1823419,
      "sourceEndMs": 1823439,
      "text": "?"
    },
    {
      "speechId": 249,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1823439,
      "sourceEndMs": 1824459,
      "text": "60枚あるよ!"
    },
    {
      "speechId": 250,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1824459,
      "sourceEndMs": 1825120,
      "text": "葉っぱ大じゃん!"
    },
    {
      "speechId": 251,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1825120,
      "sourceEndMs": 1826201,
      "text": "やったね!"
    },
    {
      "speechId": 252,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1826201,
      "sourceEndMs": 1826481,
      "text": "やったね!"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
