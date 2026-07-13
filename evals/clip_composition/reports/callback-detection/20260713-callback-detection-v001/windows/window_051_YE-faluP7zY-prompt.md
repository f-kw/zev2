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
    "windowId": "window_051_YE-faluP7zY",
    "windowKind": "primary",
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
      "speechId": 1068,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7353641,
      "sourceEndMs": 7353882,
      "text": "あれ?"
    },
    {
      "speechId": 1069,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7353882,
      "sourceEndMs": 7379952,
      "text": "やべ、種足りなくなってきたなぁ粘土あった、粘土すなぁんんぬぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅ"
    },
    {
      "speechId": 1070,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7380920,
      "sourceEndMs": 7382561,
      "text": "やるじゃないかー!"
    },
    {
      "speechId": 1071,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7382561,
      "sourceEndMs": 7383302,
      "text": "誰?"
    },
    {
      "speechId": 1072,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7383302,
      "sourceEndMs": 7387904,
      "text": "やるじゃないかよーどっちから来たんだっけ?"
    },
    {
      "speechId": 1073,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7387904,
      "sourceEndMs": 7388985,
      "text": "やばい、これ大丈夫かな?"
    },
    {
      "speechId": 1074,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7388985,
      "sourceEndMs": 7393787,
      "text": "よしよしよしよし今、嫌な予感がしてるコーネのところに行けるかな?"
    },
    {
      "speechId": 1075,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7393787,
      "sourceEndMs": 7395808,
      "text": "これはい、大丈夫?"
    },
    {
      "speechId": 1076,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7395808,
      "sourceEndMs": 7399910,
      "text": "突っかかりそうな予感がしてるこれをもうちょっと行きか?"
    },
    {
      "speechId": 1077,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7399910,
      "sourceEndMs": 7403712,
      "text": "ちょっとイノシシやるわOK?"
    },
    {
      "speechId": 1078,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7403712,
      "sourceEndMs": 7406894,
      "text": "ここの地に生息するイノシシをこうしてだね"
    },
    {
      "speechId": 1079,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7408322,
      "sourceEndMs": 7409497,
      "text": "あ、逆か?"
    },
    {
      "speechId": 1080,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7409497,
      "sourceEndMs": 7410000,
      "text": "あれ、いいよ"
    },
    {
      "speechId": 1081,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7413735,
      "sourceEndMs": 7431561,
      "text": "ワンチャンもコーネに泳いであ、いいよいいよ行くよ行くよ島沿いにはいるからオッケー、終わったまって、いぼいの獅子の頭を持って帰るぞあ、誰かいる誰かいる?"
    },
    {
      "speechId": 1082,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7431561,
      "sourceEndMs": 7439624,
      "text": "これもペットだな、なんかいるわ、ウサギじゃない、カンガルーかなんかいるわいいね、あれかな、ランチャーでつかめるかな、あ、ここダメだ"
    },
    {
      "speechId": 1083,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7441675,
      "sourceEndMs": 7452421,
      "text": "いいかも、ランチャーレンあ、なんか人工的なものがあるよあ、カゴだって、カゴカゴなんかいいアイテムありそう?"
    },
    {
      "speechId": 1084,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7452421,
      "sourceEndMs": 7468951,
      "text": "ねえ、ちょっと見てみるわ回して、回して回れ、回れ、回れ、こっち回れ、回れ、回れ、こっちいけるかな?"
    },
    {
      "speechId": 1085,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7468951,
      "sourceEndMs": 7469532,
      "text": "地道に進んでいくんだよな"
    },
    {
      "speechId": 1086,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7475012,
      "sourceEndMs": 7499784,
      "text": "ガラスだってあ、ブドウのベトベトも拾ったナイスガラスとブドウのベトベトなぜカゴの中になぜブドウのベトベトなぜカゴの中に入ってるんだカゴの中に入ってたなぜマリリンを探そうかな、じゃあ今ね、島沿いではあるだろう"
    },
    {
      "speechId": 1087,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7500122,
      "sourceEndMs": 7528474,
      "text": "間違いなくオッケー島沿いだとは思う島沿いね、わかっただけどちょっとねなんだろ、あゆ、入江的なところではなく岩陰の裏みたいなとこにいるからはいはいはい若干のややこしさありわかった、大丈夫よオッケーおまかしなお腹減ったなーシンプルにどっち?"
    },
    {
      "speechId": 1088,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7528474,
      "sourceEndMs": 7528994,
      "text": "人生の方"
    },
    {
      "speechId": 1089,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7531659,
      "sourceEndMs": 7558982,
      "text": "なんか食べるもんないの今は食べれないね、集中してっからそっかでも集中してってもさお腹すくのよな集中しててもお腹すくからお腹ってすごいよなそうだね全然何言ってるかよくわかんないコーネの言ってることわかんないよ"
    },
    {
      "speechId": 1090,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7560118,
      "sourceEndMs": 7571820,
      "text": "集中してるのにお腹が減るよなって話だよ切れすぎだろごはんごはんそういう話なの?"
    },
    {
      "speechId": 1091,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7571820,
      "sourceEndMs": 7575441,
      "text": "ごはんどこに待って島沿い?"
    },
    {
      "speechId": 1092,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7575441,
      "sourceEndMs": 7589944,
      "text": "島沿いなのは確かちょっと待ってよ待ってよ今ねより解像度高めてくからね終わったこっちに待ってマリリンの配信見ればいい?"
    },
    {
      "speechId": 1093,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7591259,
      "sourceEndMs": 7595281,
      "text": "見たところでねこれじゃ到底わかんないだろうなマジ?"
    },
    {
      "speechId": 1094,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7595281,
      "sourceEndMs": 7597162,
      "text": "見てわかったらすごい?"
    },
    {
      "speechId": 1095,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7597162,
      "sourceEndMs": 7603205,
      "text": "すごいそしたらねコーネと結婚してあげるねマジ?"
    },
    {
      "speechId": 1096,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7603205,
      "sourceEndMs": 7606467,
      "text": "いらない得点なの?"
    },
    {
      "speechId": 1097,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7606467,
      "sourceEndMs": 7614271,
      "text": "裏腹絵をしたいでしょ見つけた見つけた見つけたようっそだ見て見てこっち見える?"
    },
    {
      "speechId": 1098,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7614271,
      "sourceEndMs": 7617533,
      "text": "壁歩いてる今壁?"
    },
    {
      "speechId": 1099,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 7617533,
      "sourceEndMs": 7617933,
      "text": "待って"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
