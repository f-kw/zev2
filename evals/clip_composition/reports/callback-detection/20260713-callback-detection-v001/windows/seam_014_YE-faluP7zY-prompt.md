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
    "windowId": "seam_014_YE-faluP7zY",
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
      "speechId": 210,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1560514,
      "sourceEndMs": 1582301,
      "text": "ほんと、煩わせてしまってすまん、ほんとにね、いいよそんなの気にすんなってちょっと待って、一回食事してから行くわうん、ゆっくりして行ってる最中に息切れしそうだからちょっと一回ご飯食べてビュッフェしてビュッフェビュッフェってほどのゴージャスさないけどちょっと無駄なくこの隙に海藻も焼いてとティータイムかな?"
    },
    {
      "speechId": 211,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1582301,
      "sourceEndMs": 1587523,
      "text": "ティータイムしてあ、スティックをえ、あ、今食われてるな、サメにマジ?"
    },
    {
      "speechId": 212,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1587523,
      "sourceEndMs": 1589264,
      "text": "ちょっと待って、やめて、やめて大丈夫大丈夫"
    },
    {
      "speechId": 213,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1590160,
      "sourceEndMs": 1619152,
      "text": "大丈夫マリンなら大丈夫もう壊された大丈夫じゃない食われてるって金の方がねすぐ行くからね朝日になってきたなこれが終わったら一緒に命しっかりにごめんね本当に死んでしまって不甲斐ないわ行くよ今から行く行くぞありがとう上から向かうか上から夕日朝日を浴びながら"
    },
    {
      "speechId": 214,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1620520,
      "sourceEndMs": 1628344,
      "text": "ちょっと楽しんでもらってねちょっとこのロケーション楽しみながらねえこれホタリ死んだらどうなるの?"
    },
    {
      "speechId": 215,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1628344,
      "sourceEndMs": 1639350,
      "text": "待ってなんだあれ鹿みたいなのいたあなんか小さいのいるよな一旦ねでもね鹿には目もくれずまずコーネを探すこの褒章マリンかっこよくない?"
    },
    {
      "speechId": 216,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1639350,
      "sourceEndMs": 1643051,
      "text": "お玉重いのいい船長だねなやっぱ重う?"
    },
    {
      "speechId": 217,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1643051,
      "sourceEndMs": 1645953,
      "text": "うんちょっとねちょっとかあれどこだ?"
    },
    {
      "speechId": 218,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1645953,
      "sourceEndMs": 1648174,
      "text": "こっちだよねあのね"
    },
    {
      "speechId": 219,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1648792,
      "sourceEndMs": 1649984,
      "text": "すぐ歩いたら海沿い"
    },
    {
      "speechId": 220,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1650098,
      "sourceEndMs": 1674705,
      "text": "海になるからね海ってか海に入れるぐらいのね端っこだからね行けー砂浜だからでもこの辺だよねすまんよーしかもコーネの枠もないからマジでどこにいるかわかんない確かにあもうホントだねなーあれこれ渡ったかなーこの先コーネマリリン画面見てよマリリン画面マリリンあっそうねいやっ!"
    },
    {
      "speechId": 221,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1674705,
      "sourceEndMs": 1674985,
      "text": "あー大丈夫か!"
    },
    {
      "speechId": 222,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1674985,
      "sourceEndMs": 1675365,
      "text": "いや!"
    },
    {
      "speechId": 223,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1675365,
      "sourceEndMs": 1676285,
      "text": "ちょっと待って!"
    },
    {
      "speechId": 224,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1676285,
      "sourceEndMs": 1678906,
      "text": "イノシシというものありきりやばい!"
    },
    {
      "speechId": 225,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1678906,
      "sourceEndMs": 1679406,
      "text": "やばいなそれ"
    },
    {
      "speechId": 226,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1681322,
      "sourceEndMs": 1709632,
      "text": "そっち高いFPSみたいになってるどうどうどうこの辺あそこらへんいるかなあそこの砂浜のところこれって後ろの後ろあの渡った先この向こうにもうちょい右見てみて右右こっちあそこなんかねそこにそこにいそうな雰囲気だよねなんかねちょっと向かってみるよ"
    },
    {
      "speechId": 227,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 1713542,
      "sourceEndMs": 1713902,
      "text": "あれか?"
    },
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
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
