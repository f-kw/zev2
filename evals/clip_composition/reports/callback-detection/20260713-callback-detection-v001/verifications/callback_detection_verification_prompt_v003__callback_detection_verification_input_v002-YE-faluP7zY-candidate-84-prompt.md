# callback detection verification prompt v003

あなたは、全文探索で見つかった別場面候補が、後の候補の**中心となる反応**の本当の原因場面かを確認します。

## v002からの修正

全文探索の通常窓と境界補完窓が同じ場面を見つけた場合、入力では同じ場面として1件にまとめます。`sameSceneFindingIds` はまとめる前の探索結果IDで、`findingId` はその場面を代表して選択するIDです。まとめた場面の発話証拠と因果説明は削除せず、重複だけを取り除いてあります。

## 中心反応の規則

`reactionEvidence` に複数の小話題が混ざる場合でも、末尾の脇話や偶然の一言だけを説明する場面は主原因にしません。`title` と `reason` が示す中心イベント・中心反応を成立させた別場面だけを `actual_separate_cause` とします。

## 判定

- `actual_separate_cause`: `title` と `reason` が示す中心反応を成立させた出来事そのものが別場面にあり、先に見ると中心反応の理由が具体的に分かる。
- `supporting_context_only`: 関連情報ではあるが、中心反応を起こした原因そのものではない。根拠末尾の脇話だけを説明する場面もここに含む。
- `same_scene_recap`: 反応場面の内容を説明・言い換えしただけで、別の原因場面ではない。
- `unrelated`: 同じ話題や人物が出るだけで因果関係がない。
- `insufficient`: STTだけでは判断できない。

各対象について、`findings` にある発見だけを判定してください。新しい発話IDや時刻を作ってはいけません。`actual_separate_cause` が複数ある場合は、中心反応を理解するため最も直接必要な1件の`findingId`を `primaryFindingId` にし、残りを `alternativeFindingIds` に入れてください。該当がなければ `primaryFindingId` は `null` にします。

## 出力

説明やMarkdownを付けず、次のJSONだけを返してください。

```json
{
  "callbackDecisions": [
    {
      "targetId": "入力にあるtargetId",
      "decision": "actual_separate_cause",
      "primaryFindingId": "入力にあるfindingIdまたはnull",
      "alternativeFindingIds": [],
      "reason": "判定理由を1文"
    }
  ]
}
```

## 入力JSON

```json
{
  "target": {
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
          "text": "粘土返せになるよいや粘土粘土は大ヒロ低いか"
        },
        {
          "speechId": 1648,
          "text": "でかいやつこれなら絶対これは大丈夫でしょ?"
        },
        {
          "speechId": 1649,
          "text": "これもローテーブルだったらもうさあねえ小せえ!"
        },
        {
          "speechId": 1650,
          "text": "もううぜえマジで待ってこれじゃない?"
        },
        {
          "speechId": 1651,
          "text": "上に物を置くテーブルうわこっちだわ完全こっちねえいっぱいテーブル作っちゃったそれさなんかウェディングケーキみたいに重ねられないの?"
        }
      ]
    }
  },
  "findings": [
    {
      "findingId": "window_047_YE-faluP7zY-finding-01",
      "sameSceneFindingIds": [
        "window_047_YE-faluP7zY-finding-01",
        "seam_047_YE-faluP7zY-finding-01"
      ],
      "overlapGroupId": "YE-faluP7zY-candidate-84-group-01",
      "causeSegments": [
        {
          "speechId": 973,
          "text": "これをね増やせばいいだけのことストレージだらけになっちゃうなでも壁にかけれるというね説がね今あるからねあーなるほどねテーブルきたなテーブルテーブル何置くん?"
        },
        {
          "speechId": 974,
          "text": "テーブルいいね何置こうねテーブルこっちやちょっと待ってじゃあストレージまず一回ストレージ一個作ってでかいの方がいいよね"
        },
        {
          "speechId": 985,
          "text": "ご飯食べようご飯食べてあ、ご飯ね、ここあ、違うよ、それ、それを小せいやつだから生酢いらない?"
        }
      ],
      "causalClaims": [
        "この時点でテーブル作成への関心が生まれており、後の場面で実際にテーブルをクラフトしようとして失敗を繰り返す流れに繋がっている。",
        "この時点で既に間違えて小さいテーブルを作ってしまっており、これが後の反応で再び「小せえ！」とキレながら量産してしまう原因となっている。"
      ]
    },
    {
      "findingId": "window_060_YE-faluP7zY-finding-01",
      "sameSceneFindingIds": [
        "window_060_YE-faluP7zY-finding-01",
        "seam_059_YE-faluP7zY-finding-01"
      ],
      "overlapGroupId": "YE-faluP7zY-candidate-84-group-04",
      "causeSegments": [
        {
          "speechId": 1392,
          "text": "ここにさ、あれないんだわえっと…今の、ど…え?"
        },
        {
          "speechId": 1393,
          "text": "こいか…あー!"
        },
        {
          "speechId": 1394,
          "text": "え、しかもめっちゃコスト変わるえ、ちょっと作ってみようかなえ、作ろう作ろう!"
        },
        {
          "speechId": 1395,
          "text": "え、作るわーありがてぇこいでこーでこいでこーでできたえ、ちっちゃいちっちゃいふざけてんのか?"
        }
      ],
      "causalClaims": [
        "この最初の失敗（1回目のローテーブル作成）があるため、後の場面で「またローテーブルだったらどうしよう」と警戒しながらクラフトし、結果的に大量の不要なテーブルを作ってしまう展開に繋がっています。",
        "この最初の一品が後に量産してしまうことになる「ローテーブル」であり、ここでの失敗が後のテーブル作り直しの発端となっている。"
      ]
    },
    {
      "findingId": "window_063_YE-faluP7zY-finding-01",
      "sameSceneFindingIds": [
        "window_063_YE-faluP7zY-finding-01"
      ],
      "overlapGroupId": "YE-faluP7zY-candidate-84-group-05",
      "causeSegments": [
        {
          "speechId": 1521,
          "text": "何急にどうしてどうでもいいかと思って作業しまーす働くねえ働きますよえっと、でも配置をちょっとね、いじりたいやっぱ真ん中に"
        },
        {
          "speechId": 1522,
          "text": "ちょっとテーブルを置いて一瞬グリル外しちゃうねはーいそんそんそんそんそんあ、でも小規模グリル置いとくわ端っこにはーい家の外に小規模グリルとかあるんだあのサイズつくってたやつ?"
        }
      ],
      "causalClaims": [
        "ここでテーブルを置こうとしたことが発端となり、後の場面で誤ってローテーブルを量産してしまう失敗に繋がっています。"
      ]
    },
    {
      "findingId": "seam_066_YE-faluP7zY-finding-01",
      "sameSceneFindingIds": [
        "seam_066_YE-faluP7zY-finding-01",
        "window_067_YE-faluP7zY-finding-01"
      ],
      "overlapGroupId": "YE-faluP7zY-candidate-84-group-06",
      "causeSegments": [
        {
          "speechId": 1624,
          "text": "あ、でも床に置く式かあ、じゃあこれテーブル作ってテーブルに置こうあ、いいねー!"
        },
        {
          "speechId": 1632,
          "text": "え、待ってローテーブルだこれ!"
        },
        {
          "speechId": 1633,
          "text": "しまった!"
        },
        {
          "speechId": 1634,
          "text": "ローテーブルだ!"
        },
        {
          "speechId": 1645,
          "text": "粘土返してほしいんだけど"
        },
        {
          "speechId": 1646,
          "text": "腹立つうぜえおい粘土もったいないだろボケが高さもあるのかこれも低いこれも低いかな君たちこれさローテーブルこれ作ってローテーブルだったら耐えられないんだけど大丈夫?"
        }
      ],
      "causalClaims": [
        "この直後に、別の高いテーブルを作ろうとして再びローテーブルを作成してしまい、最終的に正解のテーブルを見つけるが大量に余ってしまうというオチに繋がっている。",
        "この直後に別の高いテーブルを作ろうと再挑戦するものの、再び低いテーブルや別のサイズ違いを作ってしまい、「粘土返せ」「これもローテーブルだったら」とさらに怒りを募らせる反応へと繋がります。"
      ]
    },
    {
      "findingId": "seam_048_YE-faluP7zY-finding-01",
      "sameSceneFindingIds": [
        "seam_048_YE-faluP7zY-finding-01"
      ],
      "overlapGroupId": "YE-faluP7zY-candidate-84-group-02",
      "causeSegments": [
        {
          "speechId": 1020,
          "text": "一番下が鉱石系ほしいっけネオガニタンなにサメ復活してんじゃんあいつ生き返ってるわサメえ、粘土はどうする?"
        },
        {
          "speechId": 1021,
          "text": "んー、粘土粘土か、じゃあ新しい作るわ粘土砂系のストレージを今から作りますマジ?"
        }
      ],
      "causalClaims": [
        "後の反応場面で「粘土返せになる」「粘土は大ヒロ低いか」と言いながら粘土を消費してテーブルを誤量産してしまうため、ここで粘土を扱うための準備（ストレージ作成）をしていたことが起点となっている。"
      ]
    },
    {
      "findingId": "seam_054_YE-faluP7zY-finding-01",
      "sameSceneFindingIds": [
        "seam_054_YE-faluP7zY-finding-01"
      ],
      "overlapGroupId": "YE-faluP7zY-candidate-84-group-03",
      "causeSegments": [
        {
          "speechId": 1229,
          "text": "一応でもストレージが増えてるからワンチャンしまえなくもないからあれだな壁作って今あるちっちゃいストレージをいくつか壊してここに引っ掛けてねえねえ今コメントで見たんだけどさいらないものボックスねえ!"
        },
        {
          "speechId": 1230,
          "text": "死ね!"
        },
        {
          "speechId": 1231,
          "text": "いらないものいらないものボックス作って"
        },
        {
          "speechId": 1232,
          "text": "なんかとりあえずいまいらないものボックスみたいなあーオッケーオッケーオッケーオッケー端っこにさ、なんかゴミ箱作ろうぜ、じゃあいいよーゴミ箱という名のストレージを端っこ…あ、じゃあここにしよ、階段横にしない?"
        },
        {
          "speechId": 1233,
          "text": "あ、ブブブ…階段横にしよ、階段横いいね、いいねわかりやすくない?"
        }
      ],
      "causalClaims": [
        "この場面でいらないものを入れるゴミ箱用ストレージを設置したため、後の反応で間違えて大量にクラフトしてしまった不要なテーブルの処理（収納・処分）に困るというオチに繋がっています。"
      ]
    }
  ]
}
```
