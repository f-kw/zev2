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
          "text": "で、大区画のあ、蝶津貝もいるのかちょっと下に潜って探すねありがとうどうしよう、どんどんこの隙に移動しててさコーネが置き去りにされていてしまったらば置き去りにされたらコーネはでも犬かけにそっちまで行くねなかわいいかわいい!"
        },
        {
          "speechId": 928,
          "text": "届きましたよ!"
        },
        {
          "speechId": 929,
          "text": "そういうとこがね、好きなんだねえ、やだぁ?"
        },
        {
          "speechId": 930,
          "text": "んん?"
        },
        {
          "speechId": 931,
          "text": "待て待て、めっちゃwwwこ、こね、どんどん離れていってるwwwまねぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇでも、ほんと?"
        }
      ]
    }
  },
  "findings": [
    {
      "findingId": "seam_033_YE-faluP7zY-finding-01",
      "sameSceneFindingIds": [
        "seam_033_YE-faluP7zY-finding-01",
        "window_034_YE-faluP7zY-finding-01"
      ],
      "overlapGroupId": "YE-faluP7zY-candidate-58-group-03",
      "causeSegments": [
        {
          "speechId": 656,
          "text": "ココネがイノカキで集めている全然サメ来ないよこれイノシシだ、イノカキでイノカキ?"
        },
        {
          "speechId": 657,
          "text": "イノカキで集めてるほら!"
        }
      ],
      "causalClaims": [
        "以前の場面で海を泳ぐ行動を「イノカキ」と言い間違えていたため、後の場面で置き去りにされそうになった際に「今度は（犬らしく）犬かきで行くね」と対比させて宣言する流れに繋がっています。",
        "以前に犬かきで泳げることをアピールしていたため、後の場面で置き去りにされそうになった際にも「犬かきでそっちまで行く」という可愛い宣言に繋がっています。"
      ]
    },
    {
      "findingId": "window_041_YE-faluP7zY-finding-01",
      "sameSceneFindingIds": [
        "window_041_YE-faluP7zY-finding-01",
        "seam_041_YE-faluP7zY-finding-01"
      ],
      "overlapGroupId": "YE-faluP7zY-candidate-58-group-04",
      "causeSegments": [
        {
          "speechId": 827,
          "text": "船がね進んでない"
        },
        {
          "speechId": 828,
          "text": "あれかな、ちょっと一回砲つけてさそうね、砲つけないとね、これねOK、つけるわよーほーよーほーだわ、これさーけばーあれ、砲どこやったっけ、船長あ、持ってたわ、手に待って、ここにこれパドルがあるから必要なのほらほら、行く行くほらほら、見ていや、砲立てたほうが早いからほら見てよ、移動してない?"
        },
        {
          "speechId": 829,
          "text": "してる"
        },
        {
          "speechId": 830,
          "text": "捨てるけど、頬を立てたほうがほら!"
        },
        {
          "speechId": 831,
          "text": "ほらほらほらほら!"
        },
        {
          "speechId": 832,
          "text": "そんな、そんなちまちまやってさぁひどしてるよ!"
        },
        {
          "speechId": 833,
          "text": "まどろっこしいんだよ!"
        },
        {
          "speechId": 834,
          "text": "なんでなんちゅうこと今、頬開いてやったからよ感謝しろよなぁよし、進み始めた?"
        },
        {
          "speechId": 835,
          "text": "ん?"
        },
        {
          "speechId": 836,
          "text": "進んでるこれ?"
        },
        {
          "speechId": 837,
          "text": "あれ?"
        },
        {
          "speechId": 838,
          "text": "すでに進んでるよ"
        },
        {
          "speechId": 839,
          "text": "逆でしたと向きが逆でしたおいおい何やってんだおんじゃんお前がやれよ泣くぞ泣くぞぐずってるぐずってる早く泣けよ泣くまでが長いでまだぐすぐすしてるあれ?"
        },
        {
          "speechId": 840,
          "text": "もう遅いよもういつまでグズってんだよあれ進まないんだけどおかしくない?"
        },
        {
          "speechId": 841,
          "text": "なんかやっぱパドルの出番ってわけよこれがおかしいなぁ向きは合ってると思うんだけどねちょっと待ってなぁパドルでこくから今行けパドルでやった方がいいと思うんだよね待っちょ待っちょ"
        },
        {
          "speechId": 842,
          "text": "進んでる?"
        }
      ],
      "causalClaims": [
        "この場面でマリンが帆を立てて船を本格的に急進させたため、後の場面で海に潜っていたころねが追いつけずに置き去りにされそうになって絶叫する展開に繋がった。",
        "この場面で苦労して動かし始めた船が後の反応場面で本格的に前進し出したため、取り残されそうになった戌神ころねの焦りと絶叫に繋がっている。"
      ]
    },
    {
      "findingId": "window_045_YE-faluP7zY-finding-01",
      "sameSceneFindingIds": [
        "window_045_YE-faluP7zY-finding-01"
      ],
      "overlapGroupId": "YE-faluP7zY-candidate-58-group-05",
      "causeSegments": [
        {
          "speechId": 918,
          "text": "そっかここに待って釘いっぱいあるわ思い返してみると釘いっぱいあるどうしたどうしたハマったハマったごめんなさいハマってました今感じてた今ハマり散らかしてあついたねこれアンカーいらなくないこれほんと?"
        }
      ],
      "causalClaims": [
        "移動するイカダの側で戌神ころねが身動きを取れずに遅れをとっていたため、直後の場面でどんどん距離を離されて置き去りにされかける事態に陥った。"
      ]
    },
    {
      "findingId": "seam_016_YE-faluP7zY-finding-01",
      "sameSceneFindingIds": [
        "seam_016_YE-faluP7zY-finding-01"
      ],
      "overlapGroupId": "YE-faluP7zY-candidate-58-group-01",
      "causeSegments": [
        {
          "speechId": 271,
          "text": "ロープ…あ、蝶津貝がないから小さいのでいいかオッケー?"
        },
        {
          "speechId": 272,
          "text": "どうしようかな、ここら辺でいいか蝶津貝は金属のインゴットで作れるから小さいのでも作ったら一応オッケーちょっとしのいでね、ここでいいよ?"
        }
      ],
      "causalClaims": [
        "後の反応で戌神ころねが「蝶津貝もいるのかちょっと下に潜って探すね」と提案した理由は、この場面でマリンが蝶津貝が足りなくて困っていたからです。"
      ]
    },
    {
      "findingId": "seam_021_YE-faluP7zY-finding-01",
      "sameSceneFindingIds": [
        "seam_021_YE-faluP7zY-finding-01"
      ],
      "overlapGroupId": "YE-faluP7zY-candidate-58-group-02",
      "causeSegments": [
        {
          "speechId": 363,
          "text": "いや、大丈夫新しいやつがいかん作るわ、いずれ出世したらさすがやなお、お風呂はいらないってかあ、でも声ってか口つき立ってるもんね、これブチュチュってなんか、でもね、船長、コーナーだったらいいよ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死"
        },
        {
          "speechId": 365,
          "text": "なんで死にかけてんの?"
        },
        {
          "speechId": 366,
          "text": "いや、水の中でさ、ゴンにさ、息できると思ってたらしくてさ。"
        }
      ],
      "causalClaims": [
        "以前に水中で死にかけた失敗があるため、後の場面で置き去りにされそうになった際に「（水中で）犬かきでそっちまで行く」と健気に宣言し、直後に溺れそうになって絶叫する反応がより面白く成立している。"
      ]
    },
    {
      "findingId": "seam_045_YE-faluP7zY-finding-01",
      "sameSceneFindingIds": [
        "seam_045_YE-faluP7zY-finding-01"
      ],
      "overlapGroupId": "YE-faluP7zY-candidate-58-group-06",
      "causeSegments": [
        {
          "speechId": 922,
          "text": "あれ鉱石あんだってちょっと集めてくるわちょっとあれ船長?"
        }
      ],
      "causalClaims": [
        "宝鐘マリンが単独で移動を開始したため、イカダに取り残されて距離が離れていく戌神ころねの焦る反応に繋がった。"
      ]
    }
  ]
}
```
