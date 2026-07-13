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
    "windowId": "window_057_YE-faluP7zY",
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
      "speechId": 1299,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8431521,
      "sourceEndMs": 8440504,
      "text": "気を潰しにかかっている不安になるな必殺気を潰し!"
    },
    {
      "speechId": 1300,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8440504,
      "sourceEndMs": 8457389,
      "text": "元気いっぱいのここは備品にしようここは備品ねいいよ右の3つ目は備品ね備品っていうのは何かと言うと釘とかあー駄目にもう怖いよねごめんなさい"
    },
    {
      "speechId": 1301,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8460790,
      "sourceEndMs": 8462731,
      "text": "どこや?"
    },
    {
      "speechId": 1302,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8462731,
      "sourceEndMs": 8482599,
      "text": "で、なんだったっけあ、そう、ここを備品で、備品って言ったら…備品って言ったら、あれだよ、あのさなんだろ、槍とかさ、釘とかさはいはいはいはい、釘とかねなんかちょっとしたものをちょっと、えいって入れとくやつね、ここはい、OKですほんと?"
    },
    {
      "speechId": 1303,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8482599,
      "sourceEndMs": 8489342,
      "text": "中身見て決めるわ、入れるもの確かにそれ、それでいいもんじゃ、ここは…"
    },
    {
      "speechId": 1304,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8490002,
      "sourceEndMs": 8499668,
      "text": "ここ種置き場ね今の声なに?"
    },
    {
      "speechId": 1305,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8499668,
      "sourceEndMs": 8500388,
      "text": "はい!"
    },
    {
      "speechId": 1306,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8500388,
      "sourceEndMs": 8501609,
      "text": "やっつけたり!"
    },
    {
      "speechId": 1307,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8501609,
      "sourceEndMs": 8503190,
      "text": "それやったの?"
    },
    {
      "speechId": 1308,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8503190,
      "sourceEndMs": 8516178,
      "text": "それやりましたマリンがやられて嫌な気持ちしてたからやってくれたんだそうだよ、やったんだよ今、水中でねありがとう、コンネいいんだよ、待って船見失ったわ嘘でしょ?"
    },
    {
      "speechId": 1309,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8520662,
      "sourceEndMs": 8522783,
      "text": "マリン?"
    },
    {
      "speechId": 1310,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8522783,
      "sourceEndMs": 8522823,
      "text": "ん?"
    },
    {
      "speechId": 1311,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8522823,
      "sourceEndMs": 8529665,
      "text": "船なくなったけど嘘、マリン?"
    },
    {
      "speechId": 1312,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8529665,
      "sourceEndMs": 8533386,
      "text": "こうね、こうねー!"
    },
    {
      "speechId": 1313,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8533386,
      "sourceEndMs": 8533906,
      "text": "マリン!"
    },
    {
      "speechId": 1314,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8533906,
      "sourceEndMs": 8534426,
      "text": "ジャンプして、ジャンプ!"
    },
    {
      "speechId": 1315,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8534426,
      "sourceEndMs": 8541208,
      "text": "待って、どこだ?"
    },
    {
      "speechId": 1316,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8541208,
      "sourceEndMs": 8546149,
      "text": "もうサメなんて追っかけますから!"
    },
    {
      "speechId": 1317,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8546149,
      "sourceEndMs": 8547290,
      "text": "どこ?"
    },
    {
      "speechId": 1318,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8547290,
      "sourceEndMs": 8548450,
      "text": "ジャンプして、ジャンプ!"
    },
    {
      "speechId": 1319,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8550290,
      "sourceEndMs": 8577698,
      "text": "待ってここでサメが死んだからーどっちに向かったんだろうなこれあっなんだカメいるカメえカメいいじゃんうわカメだわでもサメ殺したからね今ねちょっとあれよ平和よあそっか平和あ分かった資材が流れてくる方向に行けば船にたどり着くのではあなるほどそういう発想あるよしよしよしよしさあねここは確かに畳んでるから"
    },
    {
      "speechId": 1320,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8580578,
      "sourceEndMs": 8597842,
      "text": "よし頑張れいけいけいけいけいけどっちに流れてるんだろうなこれあっちかあれかな一回アンカーを下ろしてさ動かないようにした方がよかったりするかなこれあでも飛んでいけるから大丈夫じゃないかな飛んでいける?"
    },
    {
      "speechId": 1321,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8597842,
      "sourceEndMs": 8609864,
      "text": "迷子の子お姉さんあなたの家はどこですか"
    },
    {
      "speechId": 1322,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8610158,
      "sourceEndMs": 8615402,
      "text": "確かに葉っぱ多すぎて木の場所なくなってるわこれでしょ?"
    },
    {
      "speechId": 1323,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8615402,
      "sourceEndMs": 8624748,
      "text": "ほら未来を見据えたコメントしたのだよ確かに葉っぱの数尋常じゃねええ?"
    },
    {
      "speechId": 1324,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8624748,
      "sourceEndMs": 8639498,
      "text": "やばすぎこんな不安になるんだね一人ぼっちだったらやばすぎそうなんですだいまてよマリリンのところ見て資材流れてるよね流れてるこんなサメなんかに"
    },
    {
      "speechId": 1325,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8641822,
      "sourceEndMs": 8645305,
      "text": "風向きを見よう大丈夫?"
    },
    {
      "speechId": 1326,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8645305,
      "sourceEndMs": 8651710,
      "text": "今立ち止まるべきかマリンは悩んでいます大丈夫大丈夫?"
    },
    {
      "speechId": 1327,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8651710,
      "sourceEndMs": 8663859,
      "text": "あっちや波があっちの方向に行ってるからあっちか大丈夫水もあるしね水筒も持ってるから本当?"
    },
    {
      "speechId": 1328,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8663859,
      "sourceEndMs": 8669944,
      "text": "大丈夫だけどなこれで辿り着いたらさ感動の最下位よな嬉しいよな"
    },
    {
      "speechId": 1329,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8670100,
      "sourceEndMs": 8685933,
      "text": "船長は帰ってきてくれたらめっちゃ嬉しいよなこれマリリンの配信を見ながらなんでこれ資材なくなったん?"
    },
    {
      "speechId": 1330,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8685933,
      "sourceEndMs": 8697662,
      "text": "こうねそっか夜だから見にくいってのもあるのかもねアンカー作るかでもさこれさでもさ結構預けといてよかったわ"
    },
    {
      "speechId": 1331,
      "sourceVideoId": "YE-faluP7zY",
      "sourceStartMs": 8699515,
      "sourceEndMs": 8699718,
      "text": "荷物"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
