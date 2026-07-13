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
    "windowId": "seam_008_o8rZAhARXAc",
    "windowKind": "seam_bridge",
    "sourceVideoId": "o8rZAhARXAc"
  },
  "targets": [
    {
      "targetId": "o8rZAhARXAc-candidate-25",
      "title": "チャットの指示で対戦相手を選んだ結果、Bランクの高校を引いて焦るシーン",
      "reason": "リスナー（キャージー）に選択を委ねた結果、手強いBランクの「ざまみ商業高校」を引き当ててしまい動揺するリアクションが面白いため。",
      "reactionEvidence": {
        "sourceVideoId": "o8rZAhARXAc",
        "speechIds": [
          565,
          566,
          567,
          568,
          569,
          570,
          571,
          572
        ],
        "segments": [
          {
            "speechId": 565,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5701367,
            "sourceEndMs": 5702247,
            "text": "どこにする?"
          },
          {
            "speechId": 566,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5702247,
            "sourceEndMs": 5714533,
            "text": "キャージーどれがいい?"
          },
          {
            "speechId": 567,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5714533,
            "sourceEndMs": 5719475,
            "text": "どれがいい?"
          },
          {
            "speechId": 568,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5719475,
            "sourceEndMs": 5721796,
            "text": "魔物でギリかキャージーに決めてもらうわはいはいはいえっと一番右オッケーじゃあ一番右で行きますけ!"
          },
          {
            "speechId": 569,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5721796,
            "sourceEndMs": 5728519,
            "text": "1?"
          },
          {
            "speechId": 570,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5728519,
            "sourceEndMs": 5729340,
            "text": "1Bかー"
          },
          {
            "speechId": 571,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5733894,
            "sourceEndMs": 5751200,
            "text": "ざま…ざまみ…ざまみ商業高校ざまみ…大丈夫かなぁ…Bって…Bやばいか?"
          },
          {
            "speechId": 572,
            "sourceVideoId": "o8rZAhARXAc",
            "sourceStartMs": 5751200,
            "sourceEndMs": 5755602,
            "text": "まぁ占い師踏んで…占い師踏んで…"
          }
        ]
      }
    }
  ],
  "sourceSegments": [
    {
      "speechId": 231,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2311058,
      "sourceEndMs": 2339860,
      "text": "もう一回選手見直すかガチムズすぎんこの問題オリジナル変化球来て嬉しいはずなのに逆にわけわからんくなっちゃった俺を迷わせるなあんまりなんだこれ逆に迷いすぎてリリカどうもありがとうゆっくり休んで監督ありがとうございますこの号忘れません粉落とし覚えられなかったマリンが悪いっすすいませんし"
    },
    {
      "speechId": 232,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2341046,
      "sourceEndMs": 2342207,
      "text": "今まで生言ってすみませんした!"
    },
    {
      "speechId": 233,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2342207,
      "sourceEndMs": 2353472,
      "text": "じゃあ一旦…うん…甲子園始まらない…いや合宿も甲子園も始まんねえ!"
    },
    {
      "speechId": 234,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2353472,
      "sourceEndMs": 2355253,
      "text": "だってこんなことになると思わなかった!"
    },
    {
      "speechId": 235,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2355253,
      "sourceEndMs": 2364377,
      "text": "うーん…一旦ご覧ください!"
    },
    {
      "speechId": 236,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2364377,
      "sourceEndMs": 2364978,
      "text": "待つ待つ!"
    },
    {
      "speechId": 237,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2364978,
      "sourceEndMs": 2366398,
      "text": "長文きてる長文!"
    },
    {
      "speechId": 238,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2366398,
      "sourceEndMs": 2368119,
      "text": "はいはいはい!"
    },
    {
      "speechId": 239,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2368119,
      "sourceEndMs": 2369800,
      "text": "新級者にはランク変わり最大100までの"
    },
    {
      "speechId": 240,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2370422,
      "sourceEndMs": 2374885,
      "text": "なるほど、いやめっちゃむずい下が2だからフブちゃん"
    },
    {
      "speechId": 241,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2403400,
      "sourceEndMs": 2429860,
      "text": "相変10だから5くらいは上がるらしい確かにエッジスライダー以外はカスカスのカスみたいな1と2しかないから下ありかまあそしてそして"
    },
    {
      "speechId": 242,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2430354,
      "sourceEndMs": 2459602,
      "text": "あげたいんだったそうスタミナそうだよねスタミナもあげたいうーんでラオーラがこれねなんかまんべんなく中途半端にあげてみましたって感じちょっとまんべんなくいってみました"
    },
    {
      "speechId": 243,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2467827,
      "sourceEndMs": 2489680,
      "text": "って感じねイオフィーがこんな感じでコントロールもスタミナもFなのがマジ終わりって感じなんだけどカーブ全振りしてみましたって感じラオラはもうパンパンだからないオッケオッケオッケイオフィーも無理っぽい"
    },
    {
      "speechId": 244,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2491334,
      "sourceEndMs": 2516786,
      "text": "ちょっとスタミナとコントロール多分上げれないよねもうねその今から今から変化球を全振りしようと思ったらコントロールスタミナどっちもFはまずいか伸びもいいから伸びがいいからストレート投げそうそしてカエラがこれ"
    },
    {
      "speechId": 245,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2522114,
      "sourceEndMs": 2535465,
      "text": "って感じ。"
    },
    {
      "speechId": 246,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2535465,
      "sourceEndMs": 2535805,
      "text": "はい。"
    },
    {
      "speechId": 247,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2535805,
      "sourceEndMs": 2537747,
      "text": "うーんだよね。"
    },
    {
      "speechId": 248,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2537747,
      "sourceEndMs": 2540789,
      "text": "うーんだよね、これ。"
    },
    {
      "speechId": 249,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2540789,
      "sourceEndMs": 2544452,
      "text": "カエラはやっぱフォークのまま?"
    },
    {
      "speechId": 250,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2544452,
      "sourceEndMs": 2545053,
      "text": "うーん。"
    },
    {
      "speechId": 251,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2545053,
      "sourceEndMs": 2546254,
      "text": "はいはいはいはい。"
    },
    {
      "speechId": 252,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2565175,
      "sourceEndMs": 2575438,
      "text": "うんという結論を受けて皆さんいかがでしょうか?"
    },
    {
      "speechId": 253,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2575438,
      "sourceEndMs": 2579840,
      "text": "はいはいはいうーんこれふーぶちゃんしかないという意見が"
    },
    {
      "speechId": 254,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2581422,
      "sourceEndMs": 2584625,
      "text": "次の新入生待つはないんじゃない?"
    },
    {
      "speechId": 255,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2584625,
      "sourceEndMs": 2605742,
      "text": "あ、それにした場合って春夏しかないで育成できる期間ふぶちゃんかほな古川で古川はもう去るねんこの夏でこの夏でさよならやねんうん"
    },
    {
      "speechId": 256,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2623306,
      "sourceEndMs": 2639900,
      "text": "でもイオフィンは伸びがあるからリリカもこれを見た結果伸びがあるならちょっと微妙になってきたって言ってるからいやもうフブちゃんしかないかもしれないもうフブちゃんでいくかアンケもフブちゃんだったしごめん迷って"
    },
    {
      "speechId": 257,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2640022,
      "sourceEndMs": 2668770,
      "text": "こんなにリリカも伸びがBもあるならちょっと微妙になってきたって言ってたからコメントもそう言ってたしフブちゃんかもフブちゃんムキムキにするもうしょうがない迷った"
    },
    {
      "speechId": 258,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2671078,
      "sourceEndMs": 2684228,
      "text": "のぶちゃん中途半端になりそう確かにね確かにねそう弱体化するんまー弱体化?"
    },
    {
      "speechId": 259,
      "sourceVideoId": "o8rZAhARXAc",
      "sourceStartMs": 2684228,
      "sourceEndMs": 2690052,
      "text": "世界大会で勝手に変化量上がるかもマジ?"
    }
  ],
  "outputContract": {
    "format": "json_only",
    "rootKey": "callbackFindings",
    "timeValuesForbidden": true
  }
}
```
