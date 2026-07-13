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
    "windowId": "window_017_YE-faluP7zY",
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
      "speechId": 264,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1866456,
      "sourceEndMs": 1870097,
      "text": "ストレージスクラップとロープOK?"
    },
    {
      "speechId": 265,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1870097,
      "sourceEndMs": 1876578,
      "text": "よし、日朝だし、殺戮してぇなぁあ、いいよ、行ってきていいよあ、一緒にいた方がいかないこれ?"
    },
    {
      "speechId": 266,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1876578,
      "sourceEndMs": 1881480,
      "text": "一緒に殺戮しようよ待つとストレージできるまで待つけどOK?"
    },
    {
      "speechId": 267,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1881480,
      "sourceEndMs": 1886201,
      "text": "殺戮したーいえっと、スクラップ、スクラップね?"
    },
    {
      "speechId": 268,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1886201,
      "sourceEndMs": 1886901,
      "text": "させ、させるか!"
    },
    {
      "speechId": 269,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1886901,
      "sourceEndMs": 1888122,
      "text": "させるか!"
    },
    {
      "speechId": 270,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1888122,
      "sourceEndMs": 1889522,
      "text": "おいで"
    },
    {
      "speechId": 271,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1891194,
      "sourceEndMs": 1896796,
      "text": "ロープ…あ、蝶津貝がないから小さいのでいいかオッケー?"
    },
    {
      "speechId": 272,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1896796,
      "sourceEndMs": 1904279,
      "text": "どうしようかな、ここら辺でいいか蝶津貝は金属のインゴットで作れるから小さいのでも作ったら一応オッケーちょっとしのいでね、ここでいいよ?"
    },
    {
      "speechId": 273,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1904279,
      "sourceEndMs": 1919384,
      "text": "こうやってこうやって、こうやって、こうやって木はこっちかこうやってワイワイランランラン"
    },
    {
      "speechId": 274,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1922483,
      "sourceEndMs": 1929850,
      "text": "ぬりぬりじゃんねえびっくりしたわ自分でも予想だにしないびっくりしたわそんなことある?"
    },
    {
      "speechId": 275,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1929850,
      "sourceEndMs": 1948666,
      "text": "蝶津貝あるじゃんあるよ蝶津貝あすまん箱にありますねこっちもあったないいよそれでそれはそれでいい水汲んでいこうあ水ねなんかねペットボトルみたいのがそういえばあったなあ作れるんだなこれで"
    },
    {
      "speechId": 276,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1950126,
      "sourceEndMs": 1957327,
      "text": "ブドウのベトベトいっぱい作ったからこれ作れるなやだーやだ?"
    },
    {
      "speechId": 277,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1957327,
      "sourceEndMs": 1958208,
      "text": "やなの?"
    },
    {
      "speechId": 278,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1958208,
      "sourceEndMs": 1965009,
      "text": "え、やだーいいねー女の心理みたいなそうそうそうそう難しいよな女ってえ、じゃあボトル作ろうから持ってく?"
    },
    {
      "speechId": 279,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1965009,
      "sourceEndMs": 1979632,
      "text": "あ、そうだね作ったほうがいいかなこれなもう一本作るかちょっと待ってもう一本作るからえ、プラスチックどっかでこれゴミ箱待てよえっと横のいや"
    },
    {
      "speechId": 280,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1980170,
      "sourceEndMs": 1997078,
      "text": "入れてる場所が適当すぎてさまあマジで見つけらんないんだよねわかるあとでちょっと整理するわしたいねあっボトル作った作ったあっありがたきしあわせはい置くねかたじけねよしここに水入れ散らかそうありがとう取り合いになっちゃうよこれあいいよいいよ持ってこうねこっぷり持ってるから2杯2杯入れる?"
    },
    {
      "speechId": 281,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1997078,
      "sourceEndMs": 1997578,
      "text": "2杯2杯?"
    },
    {
      "speechId": 282,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1997578,
      "sourceEndMs": 2009944,
      "text": "あっペットボトルおしゃれやんこれえデザインいいよね地味にいないよこれあ入れちゃったなくなったねちょっとなくなった新しく入れてとまあでもいったん2あれば足りるし"
    },
    {
      "speechId": 283,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2010702,
      "sourceEndMs": 2020369,
      "text": "そうねありがてぇなほんとご飯もちょっと持ってったほうがいいかもねあ、ご飯ね今ねクジラ肉…あ、違う食べ肉持ってるからそこなんで間違えるの?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
