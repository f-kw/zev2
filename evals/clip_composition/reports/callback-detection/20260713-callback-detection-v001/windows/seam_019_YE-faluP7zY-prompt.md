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
    "windowId": "seam_019_YE-faluP7zY",
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
      "speechId": 317,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2220674,
      "sourceEndMs": 2243688,
      "text": "やっぱどうもなんかのこういうお手ってえ、どうなんだろうね待ってワタメがヒャーって言ってるワタメ気づいてしまったから自分のピンチに船長冷静にスイカ食べようスイカ食べんな落ちてんのもスイカがいいねスイカそこ登れるんだそれえ、死んの?"
    },
    {
      "speechId": 318,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2243688,
      "sourceEndMs": 2249872,
      "text": "ワタメーあらーこいつすばしっこすぎるんだけどねえ助けて"
    },
    {
      "speechId": 319,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2250434,
      "sourceEndMs": 2279144,
      "text": "終わりになっちゃうよBGM変わったんですけど終わりのムード漂ってるやばいやばい終わるな終わるな待て待て待てもうちょっとディスるもうちょっとディスるわため羊の応援してんじゃないよ怖いね羊と共鳴するなうちらの応援しろうちらの応援わため待ってくれわためこれ怖くないよわため上手くない?"
    },
    {
      "speechId": 320,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2279144,
      "sourceEndMs": 2279864,
      "text": "弓壊れた"
    },
    {
      "speechId": 321,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2281058,
      "sourceEndMs": 2282338,
      "text": "もう壊れたの?"
    },
    {
      "speechId": 322,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2282338,
      "sourceEndMs": 2287059,
      "text": "待てよ待てよ待てよあ、あるある1本持ってきたんだこれあ、いける?"
    },
    {
      "speechId": 323,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2287059,
      "sourceEndMs": 2295181,
      "text": "いけるわでもかなりさダメージは入ってるはずだからもういいよよしやったー!"
    },
    {
      "speechId": 324,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2295181,
      "sourceEndMs": 2296781,
      "text": "え、なんも落とさないよこいつマジでえ?"
    },
    {
      "speechId": 325,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2296781,
      "sourceEndMs": 2298042,
      "text": "え?"
    },
    {
      "speechId": 326,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2298042,
      "sourceEndMs": 2299082,
      "text": "え?"
    },
    {
      "speechId": 327,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2299082,
      "sourceEndMs": 2301162,
      "text": "なんも落とさないよこいつはい?"
    },
    {
      "speechId": 328,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2301162,
      "sourceEndMs": 2301342,
      "text": "はい?"
    },
    {
      "speechId": 329,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2301342,
      "sourceEndMs": 2303223,
      "text": "え?"
    },
    {
      "speechId": 330,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2303223,
      "sourceEndMs": 2303643,
      "text": "え?"
    },
    {
      "speechId": 331,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2303643,
      "sourceEndMs": 2304763,
      "text": "マジ?"
    },
    {
      "speechId": 332,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2304763,
      "sourceEndMs": 2306503,
      "text": "でも最初え?"
    },
    {
      "speechId": 333,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2306503,
      "sourceEndMs": 2309464,
      "text": "私たちの私たちのこのこの"
    },
    {
      "speechId": 334,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2312978,
      "sourceEndMs": 2313398,
      "text": "こいつ!"
    },
    {
      "speechId": 335,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2313398,
      "sourceEndMs": 2315899,
      "text": "この時間なんだったの?"
    },
    {
      "speechId": 336,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2315899,
      "sourceEndMs": 2316219,
      "text": "え?"
    },
    {
      "speechId": 337,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2316219,
      "sourceEndMs": 2316840,
      "text": "ウザでしょ?"
    },
    {
      "speechId": 338,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2316840,
      "sourceEndMs": 2320201,
      "text": "ちょっと待ってコメント見てるよなんか意味あるよねえ?"
    },
    {
      "speechId": 339,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2320201,
      "sourceEndMs": 2326964,
      "text": "ワタメお前ふざけんなよなんか落とせよお前空気読め時間変わって時間え?"
    },
    {
      "speechId": 340,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2326964,
      "sourceEndMs": 2331566,
      "text": "マジかマジワタメさ謝罪してもらっていいっすか?"
    },
    {
      "speechId": 341,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2331566,
      "sourceEndMs": 2334328,
      "text": "夜になっちまったよ終わりどうしようこうね"
    },
    {
      "speechId": 342,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 2362619,
      "sourceEndMs": 2364040,
      "text": "イノシシ?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
