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
    "windowId": "window_027_YE-faluP7zY",
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
      "speechId": 496,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3366903,
      "sourceEndMs": 3387921,
      "text": "これさ頭が猪になるだけでさ何も得はないんだな見て焼けてるよこっちね焼けてるぞ食べな食べな分けようほら乾杯だ乾杯"
    },
    {
      "speechId": 497,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3390154,
      "sourceEndMs": 3417711,
      "text": "ほら乾杯しよう肉で乾杯だこれ絶対回復量すごいからさもったいないよ今食べたらもったいないじゃん別のにするもっとギリギリになってから食べようもっといいよなんだよ何でつぼってんのこれちょっと頭かぶってみてほしいよそしたらそんな面白いこれ違う違ういや"
    },
    {
      "speechId": 498,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3425014,
      "sourceEndMs": 3438683,
      "text": "あ、すごいすごい!"
    },
    {
      "speechId": 499,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3438683,
      "sourceEndMs": 3440304,
      "text": "ほんとだ!"
    },
    {
      "speechId": 500,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3440304,
      "sourceEndMs": 3441965,
      "text": "それでずっと積もってるのね!"
    },
    {
      "speechId": 501,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3441965,
      "sourceEndMs": 3443126,
      "text": "あ、くれるのありがとね"
    },
    {
      "speechId": 502,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3452146,
      "sourceEndMs": 3467816,
      "text": "掘ってくれる説森で育った森で育った勘を出していくわそうだねちょっと行こうかちょっと待って斧だけ作っていい?"
    },
    {
      "speechId": 503,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3467816,
      "sourceEndMs": 3479844,
      "text": "斧いいよあーマジで死ぬかと思ったほら笑われすぎてえやばいマリリンちょっと待ってマジでさ食材なくなったけどあ食材なんて"
    },
    {
      "speechId": 504,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3480134,
      "sourceEndMs": 3485956,
      "text": "全ての食材を船長が今握ってるからねねーすごいな、シェフ?"
    },
    {
      "speechId": 505,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3485956,
      "sourceEndMs": 3488676,
      "text": "シェフだの?"
    },
    {
      "speechId": 506,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3488676,
      "sourceEndMs": 3492397,
      "text": "シェフじゃないんだけどすごいんだけどお腹減ってんの?"
    },
    {
      "speechId": 507,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3492397,
      "sourceEndMs": 3495718,
      "text": "今今、じゃあ肉食べていいか?"
    },
    {
      "speechId": 508,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3495718,
      "sourceEndMs": 3509062,
      "text": "勝手にえ、肉食べ…じゃあ魚さ、魚返すから魚食べてよ魚なんでそんな肉そんな温存しようとしてねここだという時に一緒に食べようよはい、これはい、拾って、これ"
    },
    {
      "speechId": 509,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3510000,
      "sourceEndMs": 3511621,
      "text": "ありがとういいよこんなくれるの?"
    },
    {
      "speechId": 510,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3511621,
      "sourceEndMs": 3519167,
      "text": "うんいいよちょっと逆にそんなに握ってんじゃねーよって話あ待って斧あれだ板がなくてさー斧作れない板ない?"
    },
    {
      "speechId": 511,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3519167,
      "sourceEndMs": 3519708,
      "text": "板?"
    },
    {
      "speechId": 512,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3519708,
      "sourceEndMs": 3522750,
      "text": "うんほらー!"
    },
    {
      "speechId": 513,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3530322,
      "sourceEndMs": 3538601,
      "text": "こうね板ね13枚入ってるポニーあーあーオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケ"
    },
    {
      "speechId": 514,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3540827,
      "sourceEndMs": 3552518,
      "text": "よしじゃあ行こうかあれやってるよなに?"
    },
    {
      "speechId": 515,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3552518,
      "sourceEndMs": 3559384,
      "text": "ちょっとつもしちょっとつもし!"
    },
    {
      "speechId": 516,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3559384,
      "sourceEndMs": 3561126,
      "text": "そんな面白い"
    },
    {
      "speechId": 517,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 3571274,
      "sourceEndMs": 3572334,
      "text": "違うことだね!"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
