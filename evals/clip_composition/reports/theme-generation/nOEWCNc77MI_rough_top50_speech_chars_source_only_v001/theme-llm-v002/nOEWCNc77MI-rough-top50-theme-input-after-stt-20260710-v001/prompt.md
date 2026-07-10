# theme_generation_prompt_v002

あなたは元配信から切り抜きテーマ候補を作る。

## 目的

元配信の文字起こしだけを見て、切り抜きとして成立しそうなテーマ候補を出す。最終的な切り抜き区間を確定する担当ではない。区間選択は後段のcompositionが行う。

## 入力の読み方

- 入力は元配信単体から得られる情報だけである。
- 切り抜き動画、expected、照合結果、人間確認メモ、既存切り抜きタイトルは入力に含まれない。
- `sourceTitle` は配信全体の文脈を読む補助情報として使う。
- `segments` は元配信内の発話で、`speechId`、時刻、本文を持つ。
- 入力が長尺配信の一部窓である場合は、その窓の範囲内で判断し、配信全体を見たように書かない。
- 笑い、沈黙、音量変化などの非発話シグナルが入力にある場合は補助情報として扱う。本文より強い根拠として扱わない。

## 禁止

- 切り抜き動画や正解区間を知っている前提で書かない。
- 元配信本文にない場面や反応を作らない。
- 秒数だけを根拠に候補を作らない。
- 「雑談」「面白い場面」のように広すぎて何を切るか決まらないテーマを出さない。
- 既存切り抜きのタイトル風に盛った表現を、本文根拠なしで作らない。

## 判断方針

- 候補は、元配信内の発話から見どころが説明できる具体的なテーマにする。
- 単独で視聴者に伝わるフリ、展開、反応、結論がある場面を優先する。
- 同じ話題が離れた場所で補足される場合は、同じテーマ候補の根拠として複数の発話範囲を持ってよい。
- 根拠範囲は、候補テーマを説明するために必要な発話だけにする。配信全体や長い雑談を大きく囲わない。
- 別話題をまたぐ場合は、1つの広い範囲にまとめず、該当する狭い範囲だけを返す。

## v002の出力方針

v002では、判断方針はv001から変えない。変えるのは出力形式だけである。

- 候補ごとの長文説明は返さない。
- 根拠は `evidenceRanges` の配列で返す。
- 同じ話題が複数シーンに分かれる場合は、1つの広い開始・終了で囲わず、狭い根拠範囲を複数入れる。
- `reason` は採用理由を1文だけで書く。
- 弱い候補を無理に埋めない。

## 出力

JSONだけを返す。説明文やMarkdownを付けない。

`requestedThemeCount` が指定されている場合は、その件数を上限にする。良い候補が足りない場合は、無理に埋めない。

```json
{
  "themes": [
    {
      "themeId": "theme_001",
      "title": "短いテーマ名",
      "reason": "切り抜きとして成立すると判断した理由を1文で書く。",
      "evidenceRanges": [
        {
          "sourceVideoId": "元動画ID",
          "sourceStartMs": 123000,
          "sourceEndMs": 153000,
          "supportingSpeechIds": ["12-47", 52, "55-60"]
        }
      ]
    }
  ]
}
```

## supportingSpeechIds

- 連続する発話IDは `"12-47"` のような範囲文字列で返す。
- 不連続な発話IDは、個別の数値として同じ配列に入れる。
- 連続範囲と個別IDを混ぜてよい。
- 根拠に使っていない発話IDを含めない。

## 時刻

- `sourceStartMs` は、その根拠範囲の最初の発話時刻にする。
- `sourceEndMs` は、その根拠範囲の最後の発話時刻にする。
- 同じテーマの根拠が複数箇所にある場合は、`evidenceRanges` を複数に分ける。間にある無関係な別話題を含めない。
- 正解境界を当てる評価ではないが、後段の機械判定でexpected区間との重なりを見るため、候補根拠の範囲を本文に基づいて正しく出す。

## 入力JSON

```json
{
  "task": "source_only_theme_generation",
  "generationSystem": "theme-llm-v002",
  "promptVersion": "theme_generation_prompt_v002",
  "requestedThemeCount": 8,
  "inputPolicy": {
    "sourceOnly": true,
    "noClipInfo": true,
    "noExpected": true,
    "noAlignment": true,
    "noHumanReverseTheme": true
  },
  "windowing": {
    "applied": false,
    "reason": "元配信全体入力が長いため、実走前に発話境界を保った時間窓を作る。",
    "overlapMs": 0,
    "preMergeCandidateCount": null,
    "postMergeCandidateCount": null
  },
  "sources": [
    {
      "sourceVideoId": "YE-faluP7zY",
      "sourceUrl": "https://www.youtube.com/watch?v=YE-faluP7zY",
      "sourceTitle": "【Raft】ころね、キミさえいればこの海の果てまでだって──【ホロライブ/宝鐘マリン】",
      "transcriptKind": "local_stt",
      "language": "ja-JP",
      "rawSegmentCount": 8039,
      "promptSegmentCount": 168,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 1,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 210802,
          "sourceEndMs": 236189,
          "text": "ねってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってって"
        },
        {
          "speechId": 2,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 330060,
          "sourceEndMs": 335402,
          "text": "おもろいおもろいいきなりすんごい冷めてる?"
        },
        {
          "speechId": 3,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 335402,
          "sourceEndMs": 359330,
          "text": "待ってとりあえずさこれさ島から出るかこれそうだね島からもう出つつ出ほうがいいよなあとちょっと紹介するよじゃあ船長がさ紹介していくねそうねちょっと変わってるもんねこれね皆さんお気づきでしょうか実はねあのリフォームをねいたしましたありがとうありがとうテンションありがとうちょっと今日今夜なんでねちょっとよく見えないからちょっと後にしましょうかじゃあ出発進行しましょう"
        },
        {
          "speechId": 4,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 390874,
          "sourceEndMs": 391715,
          "text": "潜るの?"
        },
        {
          "speechId": 5,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 391715,
          "sourceEndMs": 396116,
          "text": "もう出発してるよこれスマソン?"
        },
        {
          "speechId": 6,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 396116,
          "sourceEndMs": 397197,
          "text": "スマソン?"
        },
        {
          "speechId": 7,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 397197,
          "sourceEndMs": 398798,
          "text": "綺麗だね!"
        },
        {
          "speechId": 8,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 398798,
          "sourceEndMs": 399158,
          "text": "ね!"
        },
        {
          "speechId": 9,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 399158,
          "sourceEndMs": 401559,
          "text": "夕焼けがピンク色だよ!"
        },
        {
          "speechId": 10,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 401559,
          "sourceEndMs": 404040,
          "text": "これ朝日じゃねーの?"
        },
        {
          "speechId": 11,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 404040,
          "sourceEndMs": 406341,
          "text": "朝日がピンク色だね!"
        },
        {
          "speechId": 12,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 406341,
          "sourceEndMs": 409602,
          "text": "なんか二人の心みたいじゃない?"
        },
        {
          "speechId": 13,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 409602,
          "sourceEndMs": 410102,
          "text": "どういうこと?"
        },
        {
          "speechId": 14,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 410102,
          "sourceEndMs": 414484,
          "text": "わからない誰の心みたい?"
        },
        {
          "speechId": 15,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 414484,
          "sourceEndMs": 415805,
          "text": "あったかいってこと?"
        },
        {
          "speechId": 16,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 415805,
          "sourceEndMs": 417406,
          "text": "なんかさ、こういう色じゃない?"
        },
        {
          "speechId": 17,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 417406,
          "sourceEndMs": 417946,
          "text": "私たちってさ"
        },
        {
          "speechId": 18,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 420358,
          "sourceEndMs": 438186,
          "text": "そうかもしれない悩んだそうなのそうだったかもしれねえナルト風のそうだったかもしれねえ朝になったんで皆さんに紹介していきたいと思いますこうねうろうろしてないであれをあげてくれよなどれ?"
        },
        {
          "speechId": 19,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 438186,
          "sourceEndMs": 449852,
          "text": "アンカー落としてるんだよね当然これ落としてる落としてる落としてるいきますよ飛び込んでったはいいきますよ"
        },
        {
          "speechId": 20,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 511410,
          "sourceEndMs": 539932,
          "text": "床を強化素材に変えてみましたこうなったらば簡単にはサメに食われないだろうと思って付けたんですけれどもめちゃめちゃ資材を食う割にはガンガン壊れてしまい意外とそんなに良くなかったなっていう感じだよね遠い目をしてるそして2階を作ったんですけど一旦これ入り口のグッドティンなんていうか"
        },
        {
          "speechId": 21,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 540280,
          "sourceEndMs": 567026,
          "text": "こう書いてあるんだこれTingGoodTingCometochooseまああれだよな俺らの場所みたいな俺らの場所や俺らの場所かこれじゃあ俺らの場所俺らのフロアや俺らのフロアということが書いてある階段もつけまして2階というのを設置してねここから先の必需品って誰だろうこのアンテナをねちょっと"
        },
        {
          "speechId": 22,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 567658,
          "sourceEndMs": 570004,
          "text": "つけてきましたでもちょっと使い方ちょっと忘れちゃったからね"
        },
        {
          "speechId": 23,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 570560,
          "sourceEndMs": 582966,
          "text": "これからねコメントの指示中を見ながら把握していく心づむりでございますといってもやっぱこのアンテナで冒険するのはお腹すいて死ぬお腹すいてる?"
        },
        {
          "speechId": 24,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 582966,
          "sourceEndMs": 591351,
          "text": "すいてるちょっと食べるわ芋あるよ芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋"
        },
        {
          "speechId": 25,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 598246,
          "sourceEndMs": 600004,
          "text": "これねマリリンが作ってくれたんですけど"
        },
        {
          "speechId": 26,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 600202,
          "sourceEndMs": 629792,
          "text": "この2階あそうそう2階をねちょっと地味に作り始めたんだけど教科書外で作り始めちゃったんだけどもう素材すごい食って全然作らないからちょっとプレミしたなと思ってそれでね今日ちょっと作業するかってなったんだよねそうそうだからちょっとこっからは普通素材でガガガーっと骨組みだけ作っていきたいなと思いながらこのアンテナ使うのは次回4人揃った時でいいかなと思って今回は複面を完成させるというところにそうねということで今日はお邪魔します"
        },
        {
          "speechId": 27,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 660498,
          "sourceEndMs": 673141,
          "text": "例えはちょっとよく分かんないけどまあとりあえず木材がねたっぷり必要なんで船長も拾いながら行きたいと思いますこれここに入れとくねじゃあいつものごとくあいつああこいついつもの木材入れで作ったのにさあなに?"
        },
        {
          "speechId": 28,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 673141,
          "sourceEndMs": 676321,
          "text": "いっぱい入ってるわいっぱい入ってる?"
        },
        {
          "speechId": 29,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 676321,
          "sourceEndMs": 690004,
          "text": "それまあまあまあまあまあまあねあれよなでもな入れるとこなくなっちゃうこれねちょっとねなんかまあ見やすいからねここねどうしても入れちゃうよねそうねそうね分かるよ気持ち分かるよでかい島にこのままだと"
        },
        {
          "speechId": 30,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 870042,
          "sourceEndMs": 874784,
          "text": "言うほど心配してないよ心配してーよー!"
        },
        {
          "speechId": 31,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 874784,
          "sourceEndMs": 875844,
          "text": "はいはい、あれ?"
        },
        {
          "speechId": 32,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 875844,
          "sourceEndMs": 877525,
          "text": "あれ?"
        },
        {
          "speechId": 33,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 877525,
          "sourceEndMs": 878365,
          "text": "心配して?"
        },
        {
          "speechId": 34,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 878365,
          "sourceEndMs": 884347,
          "text": "心配ねしてるしてるちょっと待って、一旦荷物預けて雑すぎ気づいた?"
        },
        {
          "speechId": 35,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 884347,
          "sourceEndMs": 899732,
          "text": "雑すぎんやんいやでもマリリンは反応が雑でもこういうゲームのね作業ちゃんとするから偉いと思うわ謎のフォローが入りましたそうなんよ船長ってちょっとね反応たまに雑になるけどでもちゃんとするからねそう言うてね"
        },
        {
          "speechId": 36,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 960122,
          "sourceEndMs": 989832,
          "text": "殺すわ食べようよ食べたいこれで撃てるのかな行くわそっち待ってあれマリゾネスどこマリゾネスまだイカダイカダにいる鳥もいるしねなんかねイノシシ2匹ぐらいいたから気をつけてなOKもうみんな撃ち殺すから任してセイチョ結構エイムにはね自信あるからそうでしょ自信はねあったところってなんだよどういう意味だよちょっと待って自信だけ"
        },
        {
          "speechId": 37,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 990278,
          "sourceEndMs": 993519,
          "text": "もうダメなんだよこれコロゾネス待った方がいいやつ?"
        },
        {
          "speechId": 38,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 993519,
          "sourceEndMs": 1001441,
          "text": "コロゾネス待たなくていいよずっとベリーだって食べちゃうどこだ?"
        },
        {
          "speechId": 39,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1001441,
          "sourceEndMs": 1006182,
          "text": "どこだちょっと待って一緒にゴーデスとか行かなこれじゃあイカダでちょっと待っとくか?"
        },
        {
          "speechId": 40,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1006182,
          "sourceEndMs": 1009243,
          "text": "オッケーちょっと待ってなイカダどこだ?"
        },
        {
          "speechId": 41,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1009243,
          "sourceEndMs": 1011184,
          "text": "じゃあヤ、ヤちょっと弓?"
        },
        {
          "speechId": 42,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1011184,
          "sourceEndMs": 1011864,
          "text": "ヤ、ヤ弓?"
        },
        {
          "speechId": 43,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1011864,
          "sourceEndMs": 1014365,
          "text": "死ぬかもしれんこれ嘘でしょ?"
        },
        {
          "speechId": 44,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1014365,
          "sourceEndMs": 1019166,
          "text": "ちょっとヤと作っとこうコーネも一緒に一緒にさ弓やする?"
        },
        {
          "speechId": 45,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1200098,
          "sourceEndMs": 1223383,
          "text": "箱に入ってる全部の箱を1個ずつ開けたら見つかるありがとう次はちゃんとね分かりやすくしとくわ2階建てにしたらきてるきてるきてるお前許さねえサメだサメだ多分サメだコーネいる多分というかサメやこれは間違いなくね間違いなくラフトやこれはラフト?"
        },
        {
          "speechId": 46,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1223383,
          "sourceEndMs": 1229904,
          "text": "これはラフトというゲームやいたいやサメサメサメほらいるよなやっぱりないるすいませんマリンよりコーネのことを食べてください"
        },
        {
          "speechId": 47,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1230214,
          "sourceEndMs": 1234815,
          "text": "なんでやねんコーニーさん狙われたらヤバいで今死にかけの…え、痛っ!"
        },
        {
          "speechId": 48,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1234815,
          "sourceEndMs": 1235315,
          "text": "待って!"
        },
        {
          "speechId": 49,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1235315,
          "sourceEndMs": 1235596,
          "text": "待って!"
        },
        {
          "speechId": 50,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1235596,
          "sourceEndMs": 1236016,
          "text": "痛っ!"
        },
        {
          "speechId": 51,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1236016,
          "sourceEndMs": 1236436,
          "text": "痛っ!"
        },
        {
          "speechId": 52,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1236436,
          "sourceEndMs": 1237096,
          "text": "痛っ!"
        },
        {
          "speechId": 53,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1237096,
          "sourceEndMs": 1237476,
          "text": "痛っ!"
        },
        {
          "speechId": 54,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1237476,
          "sourceEndMs": 1258062,
          "text": "コーニーありがとう今まですごい大好きだった本当によいごんサメはさ弓矢で…でももったいないなちょっとでも確かにね弓矢弱えないっすなあ弓矢でも弓でもサメ倒せるよって言われてるなえ待ってもしかしてさもしかしてこの丈さいや無理かコンコンできるかと思った"
        },
        {
          "speechId": 55,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1290150,
          "sourceEndMs": 1294092,
          "text": "どうしよう気になるやん今日何があったんやんなりんどこ?"
        },
        {
          "speechId": 56,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1294092,
          "sourceEndMs": 1311760,
          "text": "ちょっと今脳死で喋ってるあっ今ね今あの竹取りの桶というものありきりのとこあっよきかなよきかなよきかなちょっとちゃんと時代に染まってるねうんそれはよきかないいじゃんこの辺サメいなさそうな予感する今チャンスなのでは?"
        },
        {
          "speechId": 57,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1311760,
          "sourceEndMs": 1312480,
          "text": "マジ?"
        },
        {
          "speechId": 58,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1312480,
          "sourceEndMs": 1319784,
          "text": "あっでもこっち来そうだなうそえなんかフグもいるって言われてるようんうん普通にいるねこれでもここ海藻"
        },
        {
          "speechId": 59,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1530000,
          "sourceEndMs": 1534522,
          "text": "キスキスしてるって言われてる死に死にしてるけど死に死にしてる?"
        },
        {
          "speechId": 60,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1534522,
          "sourceEndMs": 1543445,
          "text": "今行くからこれさ降参して再開するって押さない方がいいんだよね押したら荷物がなくなるもう死んでんのもしかして?"
        },
        {
          "speechId": 61,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1543445,
          "sourceEndMs": 1547227,
          "text": "死んでしまった島の中?"
        },
        {
          "speechId": 62,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1547227,
          "sourceEndMs": 1554530,
          "text": "島の中でね海沿いでね砂浜があって土下座いっぱい入ってあ、竹のありけりね"
        },
        {
          "speechId": 63,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1555302,
          "sourceEndMs": 1560024,
          "text": "そうね、マリンと逆方向に行ってたから逆に行ってたのね、OKOKOK"
        },
        {
          "speechId": 64,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1590160,
          "sourceEndMs": 1619152,
          "text": "大丈夫マリンなら大丈夫もう壊された大丈夫じゃない食われてるって金の方がねすぐ行くからね朝日になってきたなこれが終わったら一緒に命しっかりにごめんね本当に死んでしまって不甲斐ないわ行くよ今から行く行くぞありがとう上から向かうか上から夕日朝日を浴びながら"
        },
        {
          "speechId": 65,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1650098,
          "sourceEndMs": 1674705,
          "text": "海になるからね海ってか海に入れるぐらいのね端っこだからね行けー砂浜だからでもこの辺だよねすまんよーしかもコーネの枠もないからマジでどこにいるかわかんない確かにあもうホントだねなーあれこれ渡ったかなーこの先コーネマリリン画面見てよマリリン画面マリリンあっそうねいやっ!"
        },
        {
          "speechId": 66,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1674705,
          "sourceEndMs": 1674985,
          "text": "あー大丈夫か!"
        },
        {
          "speechId": 67,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1674985,
          "sourceEndMs": 1675365,
          "text": "いや!"
        },
        {
          "speechId": 68,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1675365,
          "sourceEndMs": 1676285,
          "text": "ちょっと待って!"
        },
        {
          "speechId": 69,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1676285,
          "sourceEndMs": 1678906,
          "text": "イノシシというものありきりやばい!"
        },
        {
          "speechId": 70,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1678906,
          "sourceEndMs": 1679406,
          "text": "やばいなそれ"
        },
        {
          "speechId": 71,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1770426,
          "sourceEndMs": 1799772,
          "text": "なんだけどねでもまだね全然粘土もさっき見かけたしまだまだ何でもありそうではある申し訳ねーけどさほら今武器をさ手に入れたからねこれであればそうね弓ねせんきゅーベイブせんきゅーよしちょっと食べ物あーありがとう持ち歩いた方がいいかもね食べ物そうね待ってでもねちょっと残ってるこれ一個食べてこのねここのこのなんていうのあのさこのコンロじゃなくてなんだこれ洋コンロに近い"
        },
        {
          "speechId": 72,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1980170,
          "sourceEndMs": 1997078,
          "text": "入れてる場所が適当すぎてさまあマジで見つけらんないんだよねわかるあとでちょっと整理するわしたいねあっボトル作った作ったあっありがたきしあわせはい置くねかたじけねよしここに水入れ散らかそうありがとう取り合いになっちゃうよこれあいいよいいよ持ってこうねこっぷり持ってるから2杯2杯入れる?"
        },
        {
          "speechId": 73,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1997078,
          "sourceEndMs": 1997578,
          "text": "2杯2杯?"
        },
        {
          "speechId": 74,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1997578,
          "sourceEndMs": 2009944,
          "text": "あっペットボトルおしゃれやんこれえデザインいいよね地味にいないよこれあ入れちゃったなくなったねちょっとなくなった新しく入れてとまあでもいったん2あれば足りるし"
        },
        {
          "speechId": 75,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2010702,
          "sourceEndMs": 2020369,
          "text": "そうねありがてぇなほんとご飯もちょっと持ってったほうがいいかもねあ、ご飯ね今ねクジラ肉…あ、違う食べ肉持ってるからそこなんで間違えるの?"
        },
        {
          "speechId": 76,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2020369,
          "sourceEndMs": 2023511,
          "text": "まじで食べ肉持ってるからね大丈夫行け?"
        },
        {
          "speechId": 77,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2023511,
          "sourceEndMs": 2026994,
          "text": "せんちゃんも持ってとよしこれで準備万端かな?"
        },
        {
          "speechId": 78,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2026994,
          "sourceEndMs": 2038802,
          "text": "行こうぞ行きますかよし行くぞーうちらいいね成長したねもう弓持って移動してんだよいやさすがよな強くなっちゃったこっち見ておっともたる"
        },
        {
          "speechId": 79,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2401186,
          "sourceEndMs": 2410728,
          "text": "そんなほらよでもさ、あんな小せえのがさ倒すの苦労したからさ猪なんてさ、化け物レベルなんじゃないの?"
        },
        {
          "speechId": 80,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2410728,
          "sourceEndMs": 2414189,
          "text": "俺いや、猪きつそうだねどうやるの?"
        },
        {
          "speechId": 81,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2414189,
          "sourceEndMs": 2429652,
          "text": "絶対なでもさ、さっきと違って逃げていくんじゃなくて向かってくるわけだからさ確かになワンチャン当たりやすいかもね、エイム的にはワタメがBGMがフグ来てる、フグ来てるよ気をつけ、そっち殺されたからな、さっき"
        },
        {
          "speechId": 82,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2731943,
          "sourceEndMs": 2759704,
          "text": "何を今からするかというと目的が次々変わってるんだよねわかる一つに絞らないとね何からやろうか今日の目標は船の2階を監視させたいみたいなそうなんだよさせたいんだけどさ大きい島を見つけてはしゃいじゃったところあるよね"
        },
        {
          "speechId": 83,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2941666,
          "sourceEndMs": 2942086,
          "text": "いいでしょ?"
        },
        {
          "speechId": 84,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2942086,
          "sourceEndMs": 2942486,
          "text": "すごいでしょ?"
        },
        {
          "speechId": 85,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2942486,
          "sourceEndMs": 2945307,
          "text": "ナイス?"
        },
        {
          "speechId": 86,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2945307,
          "sourceEndMs": 2945887,
          "text": "ナイス?"
        },
        {
          "speechId": 87,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2945887,
          "sourceEndMs": 2957851,
          "text": "見てトッポこの中がスカスカなのはトッポって言わないからね中吸ったんよ多分先にトッポの中身だけ吸う?"
        },
        {
          "speechId": 88,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2957851,
          "sourceEndMs": 2964493,
          "text": "でもさ、もしかしたらレンジでチーしたらさトッポで中身が全部なくなってさ空洞を食べれるんじゃない?"
        },
        {
          "speechId": 89,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2964493,
          "sourceEndMs": 2967093,
          "text": "もしかしてマジ?"
        },
        {
          "speechId": 90,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2967093,
          "sourceEndMs": 2969014,
          "text": "やってみるかじゃあやってみよう"
        },
        {
          "speechId": 91,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2970690,
          "sourceEndMs": 2999444,
          "text": "ちょっと我々を代表してリスナーの皆さんぜひ挑戦してみてくださいよろしくお願いしますえっと待って弓矢がねちょっと誤報になっちゃってあ、皮研究しようかじゃあしてしてしてしてー研究しまーすどうやって研究するんだっけなあ、これだなまた食われたーあれ、どこだっけなあ、こうだなちょっと待ってくださいねー"
        },
        {
          "speechId": 92,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3030498,
          "sourceEndMs": 3033119,
          "text": "ハンモックバックパックえ?"
        },
        {
          "speechId": 93,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3033119,
          "sourceEndMs": 3034400,
          "text": "バックパック?"
        },
        {
          "speechId": 94,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3034400,
          "sourceEndMs": 3043724,
          "text": "それバックパックも作れるバックパックそれ需要しかないってあれバックパックあれどういうこと?"
        },
        {
          "speechId": 95,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3043724,
          "sourceEndMs": 3043964,
          "text": "ん?"
        },
        {
          "speechId": 96,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3043964,
          "sourceEndMs": 3059832,
          "text": "わからんこれあうんうんうん革のヘルメットとかボディアーマーとかも作れるえそれは熱いあと軟膏軟膏とかペイントブラシだってえめっちゃいいじゃんでも革2枚しかないからいっぱい取らなきゃねこれねやっぱりさ"
        },
        {
          "speechId": 97,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3750806,
          "sourceEndMs": 3752486,
          "text": "上でもあれ登れるか?"
        },
        {
          "speechId": 98,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3752486,
          "sourceEndMs": 3763229,
          "text": "え、でも見て足場みたいなのがあるよあ、これワンチャン登れとほら見て見てさすが伊之助くんすごい身のこなしすごすぎるあ、痛っ!"
        },
        {
          "speechId": 99,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3763229,
          "sourceEndMs": 3767029,
          "text": "あーこれ無理かなえ、痛れる?"
        },
        {
          "speechId": 100,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3767029,
          "sourceEndMs": 3779852,
          "text": "いや無理じゃない登らないってこれでもここにさ足場があるってことはさ足場じゃなくてさこれネイチャーアートだよこれ自然が作り出したものでさいやいやそんな登る足場"
        },
        {
          "speechId": 101,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3840794,
          "sourceEndMs": 3851679,
          "text": "あそういうことじゃ上に行ってるわけじゃないんだそういう感じっぽい上に来たけど上にも何もないなこれ何もない?"
        },
        {
          "speechId": 102,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3851679,
          "sourceEndMs": 3865406,
          "text": "パイナップルが咲いてるあお腹減ってるから食べる黄色い粉とかは取らなくていいよな粉はいらないかもねあそこに止まるのかもしれないね"
        },
        {
          "speechId": 103,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4080646,
          "sourceEndMs": 4094315,
          "text": "じゃあ船長は次第を集めたいけど今何も流れてないからこれ引っかかってないよね大丈夫だよね動いてる動いてるめっちゃ釣れるじゃんこれ楽しいいいねロープどっかにあったのロープ?"
        },
        {
          "speechId": 104,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4094315,
          "sourceEndMs": 4095935,
          "text": "ロープ?"
        },
        {
          "speechId": 105,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4095935,
          "sourceEndMs": 4109864,
          "text": "まじイノスキにやられるかとお腹がまじめちゃめちゃになったわ今のイノスキでそんな笑うとは思わなかったよ腹よじれたガチでよじれた死ぬかと思ったまあ嬉しいよねまあ"
        },
        {
          "speechId": 106,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4320114,
          "sourceEndMs": 4348870,
          "text": "いいよー盛りだくさんだからナマズはプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリ"
        },
        {
          "speechId": 107,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4956599,
          "sourceEndMs": 4961304,
          "text": "嫌ではないこれさ、1階つけたこれ外せんのかな?"
        },
        {
          "speechId": 108,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4961304,
          "sourceEndMs": 4962185,
          "text": "もう外せないのかな?"
        },
        {
          "speechId": 109,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4962185,
          "sourceEndMs": 4963286,
          "text": "いやでも、いいんじゃない?"
        },
        {
          "speechId": 110,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4963286,
          "sourceEndMs": 4972915,
          "text": "これぐらいで3階建てとかにしようよ、そしたらあ、1階は狭めでね、天井引くマジで多分これさ、物がいっぱい置いてあるからさ狭く見えるだけじゃない?"
        },
        {
          "speechId": 111,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4972915,
          "sourceEndMs": 4976199,
          "text": "なんか勝手に島に到着しちゃったマジ?"
        },
        {
          "speechId": 112,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4976199,
          "sourceEndMs": 4978741,
          "text": "ここに行けというお告げだじゃあアンカー作ります?"
        },
        {
          "speechId": 113,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5250620,
          "sourceEndMs": 5259163,
          "text": "いのすけ限定やんそれその時はね本当に死ぬと思ったね命も覚悟した船長本当に?"
        },
        {
          "speechId": 114,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5259163,
          "sourceEndMs": 5279310,
          "text": "まあでも死ななくてよかったねこっちが死にそうですなんなんなんどうした急にサメが来たから地道に泳いでるよしよしよし逃げれた逃げれたサメの餌作ってちょっとあれやりたいけどなもったいないんだよなそんなやつのためにクソがよどういう感情それ"
        },
        {
          "speechId": 115,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5402383,
          "sourceEndMs": 5404665,
          "text": "周りに何もないかもここない?"
        },
        {
          "speechId": 116,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5404665,
          "sourceEndMs": 5415130,
          "text": "OK早々に移動した方がいいかもしれない壁にストレージできる?"
        },
        {
          "speechId": 117,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5415130,
          "sourceEndMs": 5416951,
          "text": "クローゼットみたいな感じ?"
        },
        {
          "speechId": 118,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5416951,
          "sourceEndMs": 5428318,
          "text": "ちょっと待ってやってみていいよ階段の裏側とかデッドスペースを活かしてさ収納をここにさ"
        },
        {
          "speechId": 119,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5429346,
          "sourceEndMs": 5430003,
          "text": "え、ちょっと待って"
        },
        {
          "speechId": 120,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5460342,
          "sourceEndMs": 5489452,
          "text": "ここの完成させようここをこのエリアを2階で何をしたいかって言ったらやっぱり作物とかヤシの木を2階で育てたいよねそれなそれなじゃあとりあえず魚釣りながらあれだ材料集めるわんでもやっぱさ1回さジャンプでさ移動できないのちょっとだるいよね引っかかってあジャンプあー別にいいようーんあー"
        },
        {
          "speechId": 121,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5821110,
          "sourceEndMs": 5824633,
          "text": "水遠いのだる水遠いのだるいな2個作る?"
        },
        {
          "speechId": 122,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5824633,
          "sourceEndMs": 5831798,
          "text": "2個いらないか水はでも割ってもいいかもね作るコスト的にそんな重くなければ2回にも作れば?"
        },
        {
          "speechId": 123,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5831798,
          "sourceEndMs": 5849852,
          "text": "そうだね2回にも作ろうかなワンチャンありだよね便利だよね4人でやるわけだしガラスならね砂焼けば作れるしありだなありありその意見素敵ですえっとどっかに魚が釣れなくなったあったかな砂とりあえずじゃあぶち込んで"
        },
        {
          "speechId": 124,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6210474,
          "sourceEndMs": 6213315,
          "text": "君たち意見を採用して差し上げましょう"
        },
        {
          "speechId": 125,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6480406,
          "sourceEndMs": 6484328,
          "text": "え、分かってるよ分かってくれてる?"
        },
        {
          "speechId": 126,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6484328,
          "sourceEndMs": 6510760,
          "text": "マリンは船長って言うよねでも知らなかったじゃん今完全にさ知らなかったわけじゃないとっさに出ちゃうよやっぱりマリンって呼んでるからさあー特別なね呼び方だからねそうだよそうだよじゃあしょうがない最近最近さなんか呼び捨てで呼ぶ時もあるからさそうですねマリンのこと最近そうなってきたよねなんかさ匂わしちゃってわかりみわかりみ"
        },
        {
          "speechId": 127,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6531258,
          "sourceEndMs": 6538283,
          "text": "正常期って確かに2階に置いたら水汲んで入れるのが大変かどう考えても確かにそうだなでも1階と2階と3階に作れば?"
        },
        {
          "speechId": 128,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6538283,
          "sourceEndMs": 6539604,
          "text": "3階作る予定でいる"
        },
        {
          "speechId": 129,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6540500,
          "sourceEndMs": 6551645,
          "text": "いやでもさ、あれなんだよね普通に水を汲むのがさ、汲んでさ、入れるじゃん清浄機にさ、水をさうんうんそう、大変じゃね?"
        },
        {
          "speechId": 130,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6551645,
          "sourceEndMs": 6558467,
          "text": "ちょっと普通にさ水を下で汲んで上にさ、入れに行くっていうあーそういうこと?"
        },
        {
          "speechId": 131,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6558467,
          "sourceEndMs": 6569832,
          "text": "確かに、こうやって見ると間違いなくそうだな下でペットボトルで持って行くあ、なるほどね、じゃあこれを確かにペットボトルでいいか、こうしてあ、こうやってね"
        },
        {
          "speechId": 132,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6721494,
          "sourceEndMs": 6722755,
          "text": "なんで?"
        },
        {
          "speechId": 133,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6722755,
          "sourceEndMs": 6723455,
          "text": "どうして?"
        },
        {
          "speechId": 134,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6723455,
          "sourceEndMs": 6724796,
          "text": "どこで?"
        },
        {
          "speechId": 135,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6724796,
          "sourceEndMs": 6749852,
          "text": "今普通に殺してたらやったすごいじゃんやりました壁作ったらさ頭飾れるもんねそう飾ろう飾ろう適当にさ適当じゃないすげーだって周りに言ってたじゃん君たちラグを考慮してコメントしなさいよって言ったじゃんそれは王将海賊"
        },
        {
          "speechId": 136,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6870114,
          "sourceEndMs": 6881063,
          "text": "じわじわ送るよなオッケー何を拾ったかと言いますとあ、レシピとネジとあ、いいじゃんネジあ、でもしょうもないなそれぐらいか?"
        },
        {
          "speechId": 137,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6881063,
          "sourceEndMs": 6883925,
          "text": "あ、それぐらいかまあまあまあ板20枚入ってたの?"
        },
        {
          "speechId": 138,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6883925,
          "sourceEndMs": 6890751,
          "text": "あ、いいじゃんおいしいね助かるねおいしいおいしいあ、じゃあさどうしようか板さここに全部しまう?"
        },
        {
          "speechId": 139,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6890751,
          "sourceEndMs": 6896756,
          "text": "あ、そうだなんか上からさなんか使う資材順みたいなあ、じゃあ一番上板にする?"
        },
        {
          "speechId": 140,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6896756,
          "sourceEndMs": 6898637,
          "text": "そうやねん使う資材順にちょっと入れていくかオッケー"
        },
        {
          "speechId": 141,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8370340,
          "sourceEndMs": 8389575,
          "text": "さすがマリン待って木のとこに葉っぱ入ってるけど葉っぱいいんだっけここに入れといて木のとこにあうん木葉っぱロープは一緒の区分にしてでもさ木さいっぱい入れるからさ葉っぱで溢れちゃうよそんなにあんの?"
        },
        {
          "speechId": 142,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8389575,
          "sourceEndMs": 8392918,
          "text": "まだないけどさないならいいじゃねえかよ"
        },
        {
          "speechId": 143,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8394146,
          "sourceEndMs": 8396915,
          "text": "未来、未来の話をしてるでしょ?"
        },
        {
          "speechId": 144,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8396915,
          "sourceEndMs": 8399703,
          "text": "そんな溢れるほど気取れないと思います"
        },
        {
          "speechId": 145,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9690066,
          "sourceEndMs": 9695807,
          "text": "ないかななんかいいやつベッドの上位互換は旅館?"
        },
        {
          "speechId": 146,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9695807,
          "sourceEndMs": 9697147,
          "text": "旅館?"
        },
        {
          "speechId": 147,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9697147,
          "sourceEndMs": 9703529,
          "text": "結構上がってるよねスケールがベッドの上位互換はないんじゃん?"
        },
        {
          "speechId": 148,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9703529,
          "sourceEndMs": 9706129,
          "text": "まだできないだけであるかな?"
        },
        {
          "speechId": 149,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9706129,
          "sourceEndMs": 9712390,
          "text": "旗も立てたいねハンモックとかもいいねこれさマリリンこれ絵描けるようになるんじゃないの?"
        },
        {
          "speechId": 150,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9712390,
          "sourceEndMs": 9717291,
          "text": "これペイントもささっきさ出たしさどうなんだ確かにえ?"
        },
        {
          "speechId": 151,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9717291,
          "sourceEndMs": 9719232,
          "text": "旗にさ絵描けちゃうんじゃねーのこれ?"
        },
        {
          "speechId": 152,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9750066,
          "sourceEndMs": 9777863,
          "text": "作るしかないよな作るしかないカーテンもいいねカーテンかカーテンもいいやいいよねあれだなまずドアをこういうドア作ってそこにカーテンをつけてサメさん待っていいないいねいいじゃん夢膨らむねでもやっぱある程度のさ壁をガーって囲ってある程度の吹き抜け感はやっぱ欲しいよね吹き抜け?"
        },
        {
          "speechId": 153,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9777863,
          "sourceEndMs": 9778763,
          "text": "えでもいいんじゃない?"
        },
        {
          "speechId": 154,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9778763,
          "sourceEndMs": 9779864,
          "text": "吹き抜けいらないんじゃないの"
        },
        {
          "speechId": 155,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9900130,
          "sourceEndMs": 9929824,
          "text": "チョベリバー出ちゃったな出るわこれチョベリバーがストレージ1個は待ってるまであるな絶妙になーなんか一旦壊してしまっとくという手もあるかなるほどねだんだん独り言が激しくなってきたいいじゃんいいじゃんここに反応するで独り言に優しいあれ独り言に返事しちゃいけないんだっけなんかあったよね寝言だ寝言寝言感言うよね"
        },
        {
          "speechId": 156,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10860182,
          "sourceEndMs": 10889872,
          "text": "ひろたけどひよこみたいなやつあね棚作って飾るという手もあるかなと今考え中あいいねでも腹の足しにもなんねワイルドなあでもガチ目にそう今お腹減ってんだよねいっぱい焼いていっぱいではないけど入れてあるから取ってねありがとうねもらうねうんもらってもらってどんどんさどんどんどんどん作ってさ文明発達させていきたいっていうのにさもうお腹が減ったりさ邪魔が"
        },
        {
          "speechId": 157,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10982423,
          "sourceEndMs": 10992250,
          "text": "あ、でも床に置く式かあ、じゃあこれテーブル作ってテーブルに置こうあ、いいねー!"
        },
        {
          "speechId": 158,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10992250,
          "sourceEndMs": 10996093,
          "text": "え、いいよね、いいよねえ、なんかランチョンマットとかさ作りたくない?"
        },
        {
          "speechId": 159,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10996093,
          "sourceEndMs": 10997114,
          "text": "あ、いいねー!"
        },
        {
          "speechId": 160,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10997114,
          "sourceEndMs": 10997394,
          "text": "いいねー!"
        },
        {
          "speechId": 161,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10997394,
          "sourceEndMs": 11004240,
          "text": "あ、粘土使う、あ、でも粘土使ってもいいかな粘土使ってもいいと思ういいよいいよ、使おう使おうだってオシャレに行きたいじゃん女子よ、女子よ!"
        },
        {
          "speechId": 162,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11004240,
          "sourceEndMs": 11009944,
          "text": "確かに、女子やしなうちらそうだ、女子なのよかわいいテーブル、自分行っちゃっていい?"
        },
        {
          "speechId": 163,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11251114,
          "sourceEndMs": 11271141,
          "text": "デザインはかわいいよワッフルみたいじゃん、ワッフルね、かわいいんだけどな確かにかわいいな、どっかに飾ったらかわいい、普通にかわいいよそれかわいいねうんでもやっぱ食卓囲むときこの高さだなクロスはいいんだけどないいんじゃない?"
        },
        {
          "speechId": 164,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11271141,
          "sourceEndMs": 11280004,
          "text": "でも地面に座ってこう、星座しながら食べるのもツーでしょわびさびわびさびですかわびさびだと思うけど"
        },
        {
          "speechId": 165,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11281763,
          "sourceEndMs": 11283424,
          "text": "いいと思うよほんと?"
        },
        {
          "speechId": 166,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11283424,
          "sourceEndMs": 11309582,
          "text": "じゃあ、カーペット敷いてその上にいいじゃんあそこまで考えて置いたひまわりをあっけなく撤去してしまったなんか、あれよ、あのそういう話あったよ、あのミッキーのさ、ミックスアドベンチャーっていうやつでさはいミッキーたちがさ、日本に遊びに来る話があってさうんミニーちゃんがびっくりする"
        },
        {
          "speechId": 167,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11371174,
          "sourceEndMs": 11373455,
          "text": "焦れるよまた焦れる?"
        },
        {
          "speechId": 168,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11373455,
          "sourceEndMs": 11399704,
          "text": "なんかでもさ今さ焼けないじゃんどうせどうせねなんかさ神様がさ今は大きいバーベキューグリルがないから小さい魚だけ与えてあげようみたいなさ空気読んでねそう空気読んでる気がするわこれ神様気が利くやなありがとうございますありがとうございます本当にいい感じになってきたぞ明かり良きいい感じいやマリリンのおかげよ本当ね君たち"
        }
      ]
    }
  ],
  "outputContract": {
    "format": "json_only",
    "schema": {
      "themes": [
        {
          "themeId": "string",
          "title": "string",
          "reason": "string_one_sentence",
          "evidenceRanges": [
            {
              "sourceVideoId": "string",
              "sourceStartMs": "number",
              "sourceEndMs": "number",
              "supportingSpeechIds": [
                "number_or_range_string"
              ]
            }
          ]
        }
      ]
    }
  }
}
```
