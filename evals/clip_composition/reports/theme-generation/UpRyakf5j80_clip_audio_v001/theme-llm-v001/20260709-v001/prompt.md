# theme_generation_prompt_v001

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
- 迷う候補は `riskNotes` に弱点を書く。

## 出力

JSONだけを返す。説明文やMarkdownを付けない。

`requestedThemeCount` が指定されている場合は、その件数を上限にする。良い候補が足りない場合は、無理に埋めない。

```json
{
  "themes": [
    {
      "themeId": "theme_001",
      "title": "短いテーマ名",
      "summary": "何が見どころなのか",
      "whyItCanBeClipped": "切り抜きとして成立すると判断した理由",
      "sourceVideoId": "元動画ID",
      "sourceStartMs": 123000,
      "sourceEndMs": 153000,
      "supportingSpeechIds": ["12-47", 52, "55-60"],
      "representativeQuote": "根拠になる短い本文",
      "riskNotes": [
        "前後文脈が必要"
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

- `sourceStartMs` は根拠発話範囲の最初の時刻にする。
- `sourceEndMs` は根拠発話範囲の最後の時刻にする。
- 正解境界を当てる評価ではないが、後段の機械判定でexpected区間との重なりを見るため、候補根拠の範囲を本文に基づいて正しく出す。

## 入力JSON

```json
{
  "task": "source_only_theme_generation",
  "generationSystem": "theme-llm-v001",
  "promptVersion": "theme_generation_prompt_v001",
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
    "reason": "初回はプロンプトを1本に収め、窓統合器の癖を入れない。",
    "overlapMs": 0,
    "preMergeCandidateCount": null,
    "postMergeCandidateCount": null
  },
  "sources": [
    {
      "sourceVideoId": "kNX-wQTvsws",
      "sourceUrl": "https://www.youtube.com/watch?v=kNX-wQTvsws",
      "transcriptKind": "youtube_auto_caption",
      "language": "ja-JP",
      "rawSegmentCount": 4404,
      "promptSegmentCount": 1104,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 1,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5210,
          "sourceEndMs": 22160,
          "text": "[拍手]広い飲むのは中毒患者広い空なのに奇妙な予感だ"
        },
        {
          "speechId": 2,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 22380,
          "sourceEndMs": 47840,
          "text": "店長を決めてなかったんだそれが欠席な良い感覚無線今こんな3人休業でいっぱい会場だ奪い合いなんか異常だ助けて操作みんな自分に入れるからというだけで気にしたい誰にしたって気にしない最高の後悔がある"
        },
        {
          "speechId": 3,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 72680,
          "sourceEndMs": 88520,
          "text": "お願い中お願い中に早く教授"
        },
        {
          "speechId": 4,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 90799,
          "sourceEndMs": 93860,
          "text": "お願い"
        },
        {
          "speechId": 5,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 97439,
          "sourceEndMs": 126199,
          "text": "君が今日選んでくれないようなもできない感じてるそろそろ世界一大事なもの探しに行かないみたいな夢の旅して帰り君がいないと日になんてない考えてくれないと心配に感じちゃうだこんなとこで迷ってるといけないよ絶対に"
        },
        {
          "speechId": 6,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 138620,
          "sourceEndMs": 332660,
          "text": "はいえー聞こえておりますでしょうかアホーイこのフロライブフロライブ3期生放送海賊団船長のマリー先頭ですはいということで今日はねチラズアートさんの土新作地獄戦闘やっていきたいと思いますフロライブです何を隠そうねこの本性マリン3期生はですねまあね極楽湯さんとコラボもさせていただいた風呂の申し子ママリンが風呂に入るのは1週間にまあでも4は入ってるかさすがにいや5いや4いや44上ブレすれば5みたいな感じで入ってるのでねみたいな感じでねまちょっと風呂にもシナジーがありますということで船長は結構水場は怖い派で結構ねちっちゃい頃から目が開けられなくて違うわ目が閉じれなくてねあのなんか昔ねよくねなんかその水場にはお化けがいるっていうのを見てて音ちっちゃいこれちなみにだけどどうですか音量またコメントしてくれたらいつでも直すのでいつでも言ってくださいうんでなんかあのー昔ねちょっと流行ったのあのー頭洗ってねを閉じて下向いてる時にだるまさんが転んだって頭の中で唱えるとちょっと遊びに来ちゃうみたいなねえちょっともう脳の脳内の遊びのアイスを読み取って水音が聞こえるどうなんだろうもう初めて見るかこれでさなんか爆音何いつまで浴衣着てんだよ今日銭湯だから戦闘ぜんとした格好で来ましたはいってことでじゃあ今日はねちょっとこの戦闘伝とした格好でやっていきたいと思いますそれでは行きます集合始めからポチリうんはいローリングですローリングなうここがいつもなんかこの船長ホラゲーやる時さ重たくてさこのまま落ちちゃうんじゃないかってドキドキするんですけどはい今日はねちょっとマリンのこの浴衣姿夏が終わってもね銭湯のバンダイの番んんんんんんなななながしばいてるしばいてる何なんだろう何だガッキーが結婚した時の天の川だどういう状況かなあもう疲れたもう疲れた初手初手疲れあんな会社を止めてまたこのパターンかまたこれか会社辞めたいシナジーがいやいややめようよ何言っとくけど転職アドバイザーだからめっちゃやめて私は田舎に行くんだ居残りの子ねー田舎の方が逆に仕事が少なくて苦戦すると思うけどねどうすんだろうねハローワークもねない田舎には枯渇してるけど大丈夫な転職先は都会のがあるけどねけどそんなお金もないしなあなるほどあー"
        },
        {
          "speechId": 7,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 332759,
          "sourceEndMs": 363380,
          "text": "知らない間にチラシがいっぱいだよもうなんかチラシも見れないほどの状況か結構病んでるなぁんこのチラシ私にぴったりじゃないなんだ転職案内いやーちょっとなんチラシとかに入ってくるハローワークでさえブラック企業が載ってるってのにねえ家の家のポストに入ってる仕事はちょっと銭湯で働いてくれたら家賃ただあー"
        },
        {
          "speechId": 8,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 364800,
          "sourceEndMs": 372479,
          "text": "住み込み社宅いやちょっとサンくさいかここに電話して今"
        },
        {
          "speechId": 9,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 373919,
          "sourceEndMs": 412699,
          "text": "すぐやめれるんか大丈夫かあれは雇用保険失業手当回収しないともったいないぞねえすぐに転職しちゃったら失業手当回収し損ねるそしてすぐにここを引っ越そうあもうでも意地でもねあ秋村まいなはいマイナですよろしくお願いします1日目203号室のはず先に荷物持っていこうおーおーなんかレトロなレトロな感じだけどこれなんかさ画面の設定でねちょっとねレトロ感をね切ることもできるんですけどキムチ的にはさ切ってほしい切らないで欲しいどうですか"
        },
        {
          "speechId": 10,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 414780,
          "sourceEndMs": 422180,
          "text": "切るとこんな感じとくっきりするんだなこれなんだろモーションブルーみたいなやつ"
        },
        {
          "speechId": 11,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 422280,
          "sourceEndMs": 537500,
          "text": "ブラブラーかなモーションブラーレトロ感出してこうレトロで見にくいからやばい意見が割れてるどっちにしようレトロ船長がレトロだから切っていいでそうだね確かにマリンが右下でレトロ感をさ全全レトロ感マリンが1人で放つわねゲームは綺麗な感じでやってもらってゲームはプレステ5みたいなテンションにやってもらってマリンはマリンがレトロ感1人で放つえなんかこの家見たことある気がするなあのなんかさーなんだっけお引越しみたいななんかちょっと待って誰かいるわ誰かいまーすちょっとよえ待って君だしちょっとこんなところでさあえー男の人ってそうなのこんなとこで丸出しにしてやっちゃうわけちょっとねお尻丸見えになっちゃうじゃないえドアとかないん男の子ってそれいいのかなあなんか不審ですねなんだなんかやってるなんか手をチラチロして何してるんです不思議な踊りあ違うタバコだこれ気まずすいませんなんかこんなみつになっちゃってすいませんねえ何何何何その手のあ話しかけたりはあなんかすみません力よりすぎだよね話しかけたりはできないわあこれ何するんだっけあれ引っ越してきたんだっけ私はこれダンボール持ってあそうだこれがあれね社宅が社宅え待てちょっと待ってんなんか誰かあれなんか誰かいないいやね初手お化けがあれ待ってこれうん気のせいエリア側でもわけえちょっとでもちょっとあえこれお化けちょっと待って角度によってはお化けに見える芸術"
        },
        {
          "speechId": 12,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 539420,
          "sourceEndMs": 544820,
          "text": "見えた違うなんか今お化け"
        },
        {
          "speechId": 13,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 546360,
          "sourceEndMs": 570140,
          "text": "あれかななんか画角トリックアート嘘でしょ画角によってねこれやったことある感じのいやなんかさあったよね引っ越し事件みたいな事故物件みたいなコロネとやったあここから203号室今日からここでん何何何何何何何何何何何何"
        },
        {
          "speechId": 14,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 570240,
          "sourceEndMs": 576260,
          "text": "怖い怖い匂うよ大家さん首キュってなってる"
        },
        {
          "speechId": 15,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 577080,
          "sourceEndMs": 583640,
          "text": "風呂に入った方がいいあ臭うて匂って物理的にマリンが似合うの"
        },
        {
          "speechId": 16,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 583740,
          "sourceEndMs": 587360,
          "text": "荷物の移動が終わったら"
        },
        {
          "speechId": 17,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 588240,
          "sourceEndMs": 594380,
          "text": "終わったらあれあれ"
        },
        {
          "speechId": 18,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 594540,
          "sourceEndMs": 605339,
          "text": "銭湯に会いに来てくれちょなんで今進まなかったの伝えたいことがあるえ大家さんどうぞこれがあなたの部屋の鍵ですよ"
        },
        {
          "speechId": 19,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 609779,
          "sourceEndMs": 614180,
          "text": "私だ裸足で見てる"
        },
        {
          "speechId": 20,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 615120,
          "sourceEndMs": 623660,
          "text": "アパートに入れます臭いんだマリーンただ"
        },
        {
          "speechId": 21,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 624120,
          "sourceEndMs": 634580,
          "text": "がちょっと人気入ってますねなかなかにあーなんだこの傘あーちょっと"
        },
        {
          "speechId": 22,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 637019,
          "sourceEndMs": 651060,
          "text": "なんだこの2つその備え付けですか布団やだ枕元にティッシュ置くなんいやなんか静かなんだけど異様な静かさ何々"
        },
        {
          "speechId": 23,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 651360,
          "sourceEndMs": 654920,
          "text": "送ってことかこうやってね"
        },
        {
          "speechId": 24,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 656459,
          "sourceEndMs": 663200,
          "text": "はいオッケーえなんだこれどうすんだんん"
        },
        {
          "speechId": 25,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 666120,
          "sourceEndMs": 674600,
          "text": "風呂に入らなきゃいけない荷物置いてなんかあるかななんもないかアパートから1回出ます"
        },
        {
          "speechId": 26,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 674940,
          "sourceEndMs": 678980,
          "text": "収納がないなぁ押入れとかも"
        },
        {
          "speechId": 27,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 679380,
          "sourceEndMs": 687019,
          "text": "まあでも家賃ただだもんねー家賃ただには変えられないかー"
        },
        {
          "speechId": 28,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 688260,
          "sourceEndMs": 691279,
          "text": "ちょっとこっちも行ってみるか"
        },
        {
          "speechId": 29,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 692519,
          "sourceEndMs": 701899,
          "text": "ちらちら何も落ちてないかななんもないかさっきのタバコ吸ってた人はまだあまだ知ってる"
        },
        {
          "speechId": 30,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 702360,
          "sourceEndMs": 707420,
          "text": "挨拶できるかなちょっと今日からよろしくお願いします"
        },
        {
          "speechId": 31,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 707519,
          "sourceEndMs": 719660,
          "text": "なんか始まるよなちょっと不審ですよ相当不審者ですえ待ってどこなんだ生徒に行かなきゃいけないのかなえ歩いて行く感じ"
        },
        {
          "speechId": 32,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 720899,
          "sourceEndMs": 724100,
          "text": "徒歩圏内かな"
        },
        {
          "speechId": 33,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 724260,
          "sourceEndMs": 732260,
          "text": "徒歩は東方は東方だなあいやでも徒歩圏内の"
        },
        {
          "speechId": 34,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 732480,
          "sourceEndMs": 734600,
          "text": "犬が"
        },
        {
          "speechId": 35,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 734959,
          "sourceEndMs": 739740,
          "text": "これあ何これ"
        },
        {
          "speechId": 36,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 741420,
          "sourceEndMs": 746899,
          "text": "なんか今犬の声しなかったあそこにいる"
        },
        {
          "speechId": 37,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 747839,
          "sourceEndMs": 756380,
          "text": "葉っぱでしたすいません葉っぱりした失礼しましたあ公園ですねー"
        },
        {
          "speechId": 38,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 758040,
          "sourceEndMs": 771139,
          "text": "なんかあるかななんか落ちてるかななんか集めるんじゃないまたさあお祓いグッズみたいな集めてさアクロ隊さんグッズを探そうみたいなあらなんかいにしえのポストですねー"
        },
        {
          "speechId": 39,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 771420,
          "sourceEndMs": 773959,
          "text": "駄菓子屋って書いてある"
        },
        {
          "speechId": 40,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 775320,
          "sourceEndMs": 779000,
          "text": "駄菓子屋興味見ませんねー"
        },
        {
          "speechId": 41,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 779040,
          "sourceEndMs": 783800,
          "text": "薬局とはでも安いもんな何これえっ"
        },
        {
          "speechId": 42,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 784620,
          "sourceEndMs": 787880,
          "text": "ちょっと待ってよく見えない"
        },
        {
          "speechId": 43,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 788100,
          "sourceEndMs": 790339,
          "text": "でしょ"
        },
        {
          "speechId": 44,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 790620,
          "sourceEndMs": 801560,
          "text": "重要指名手配犯300万まるまるひさトールこれあれちょっと待ってさっきの"
        },
        {
          "speechId": 45,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 801660,
          "sourceEndMs": 810560,
          "text": "さっきのアパートにいた男もあるしさかもしかしてマルヒさん徹可能性あるなあああここじゃないの"
        },
        {
          "speechId": 46,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 810720,
          "sourceEndMs": 818600,
          "text": "男湯男湯にロマンを感じるマリンなのだった私は女だもんね何これ"
        },
        {
          "speechId": 47,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 824639,
          "sourceEndMs": 832279,
          "text": "ジュークボックスジュークボックス曲流れんのBGMはつけれるの"
        },
        {
          "speechId": 48,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 841940,
          "sourceEndMs": 845420,
          "text": "いちいちで1で"
        },
        {
          "speechId": 49,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 854160,
          "sourceEndMs": 859289,
          "text": "ちょっと"
        },
        {
          "speechId": 50,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 860339,
          "sourceEndMs": 862760,
          "text": "暗いだろう"
        },
        {
          "speechId": 51,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 864680,
          "sourceEndMs": 889100,
          "text": "からのいやいやいやここで4が会えてのこれダメだ全部怖いわまあいいかでもBGM無いからかけときますねラジオみたいなラジカセなんか可愛い女の子ですねちょっと切ない初恋の味これなんですキャラメル"
        },
        {
          "speechId": 52,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 889320,
          "sourceEndMs": 893600,
          "text": "可愛いねマリンみたいなこれちらず"
        },
        {
          "speechId": 53,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 893639,
          "sourceEndMs": 898519,
          "text": "あちらずアートのマスコットキャラクターチンチラちゃんですか"
        },
        {
          "speechId": 54,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 899940,
          "sourceEndMs": 907699,
          "text": "あなんか時代感あふれる扇風機時代設定はどこなんだろうねこれねアイスクリームもありますよ"
        },
        {
          "speechId": 55,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 907800,
          "sourceEndMs": 914579,
          "text": "乳牛乳牛口がコーヒー牛乳この"
        },
        {
          "speechId": 56,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 914699,
          "sourceEndMs": 924199,
          "text": "女乳牛かよって思ったら牛乳このひいこちゃん乳牛かよと思ったわそういうことかドリンクね"
        },
        {
          "speechId": 57,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 924959,
          "sourceEndMs": 927199,
          "text": "気のせいか"
        },
        {
          "speechId": 58,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 928079,
          "sourceEndMs": 936360,
          "text": "言うえこれおしゃれじゃない一周回っておしゃれだぞ逆になおー"
        },
        {
          "speechId": 59,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 936839,
          "sourceEndMs": 955040,
          "text": "タバコタバコの自販機今だったら絶対無理ですねなにこれ子供ラムネ対象対象フーズ魔法少女リリタンのススメめっちゃマリンに似てるわリリタン"
        },
        {
          "speechId": 60,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 955459,
          "sourceEndMs": 999019,
          "text": "あなたしか愛せないえでもなんかさ全体的になんかオシャレに感じるんよなぁ時代が逆おー好きだーいボットンまであるか和式だよ時代がなんか一周してるんだなって思わんかこういうのが逆にさレトロだけど逆に新しいみたいなへーあ富士山も書いてあってねで向こうが男用になってんのこれらんま1/2で100万回見た光景が繰り広がってるわ向こうからね八宝菜のじじいが飛び込んでくるんだわなんかあっちは排水溝で俺この奥はサウナがサウナなんだこれあ石炭的なね"
        },
        {
          "speechId": 61,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 999660,
          "sourceEndMs": 1111340,
          "text": "あんまサウナ行ったことないからね詳しくないんですけどはーんとりあえずあれですねこれ体重計算ちょっと操作むずいあ違うこれ開いてないのかってドア開いてなかったわ体重計ねん何だこのレトロなパーティションはああ向こうにあ電話もほらーダイヤル式の何だあれお金入れるマシンちんちんがあるちんちんなこれおー知らざーとガチャガチャあるかぶせる缶バッチあらーちょっとで出ましょうかねちょっと男用にちょっとじゃ失礼させて頂いてあっあっなんその顔その顔はなんだあ来たねようこそようこそチラシはちゃんと見たよねアパート代はもらわないけどここの銭湯で働いてもらうよなんか湯婆婆みたいなゆうやかもしれねえああと部屋にお風呂はないんだよねあーなるほど部屋にお風呂がないからこの銭湯でえでもねランナー1/2も基本的にねあのよく銭湯行ってたからねあの風呂を壊すんだよねダンマがねはいはいでも心配しなくてもいいよここで働くなら仕事が終わったら風呂に入ってよあーなるほどそういう仕組み何か不満はあるかいちょあと強めのあ特にないですもう有無を言わさないじゃんこちらもねもうねここで働くこと決めてしまって仕事も辞めてしまった以上もう文句を言うことはできないからなあよかったそう言ってくれると思ったよならすぐに仕事を始めようかあーいきなりここを見てごらんはいこのボードに書かれていることを全てするんだわかりましたわからないことがあったら自分でどうにかしてくれ"
        },
        {
          "speechId": 62,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1111740,
          "sourceEndMs": 1128200,
          "text": "昭和のスタイルなのかなそういうもの銭湯の仕事はそんなに難しくないよああ頑張ってねあでもなんか優しい優しい打ち返っちょキスしてんのかお客様が来るかいってキスするならどさくさで"
        },
        {
          "speechId": 63,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1129620,
          "sourceEndMs": 1148039,
          "text": "おーボディソープにこれがコンディショナーこれはあっカミソリタオル入浴剤カミソリこれどこにどうちょ待ってちょ待ってやるだカミソリ"
        },
        {
          "speechId": 64,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1148100,
          "sourceEndMs": 1160460,
          "text": "タオルあこれかタオル入浴剤入浴剤あ入浴剤これかあ"
        },
        {
          "speechId": 65,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1160940,
          "sourceEndMs": 1170200,
          "text": "れなんで捨てるねんなんで捨てる仕組みなんこれちょっと待って入浴剤"
        },
        {
          "speechId": 66,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1171580,
          "sourceEndMs": 1194440,
          "text": "ちょっと待って入浴剤違う入浴料まだ入力量入力料って何ちゃんと全部全部一式か一式か一式かこれ何一番右何これ一式かこれどうやって渡すだどうやって渡すだあまずお金受け取るだお金入ん入れてと"
        },
        {
          "speechId": 67,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1194539,
          "sourceEndMs": 1197320,
          "text": "あいタオル"
        },
        {
          "speechId": 68,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1200980,
          "sourceEndMs": 1205120,
          "text": "今何私ボディソープか"
        },
        {
          "speechId": 69,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1229880,
          "sourceEndMs": 1232720,
          "text": "タオル入浴料"
        },
        {
          "speechId": 70,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1234020,
          "sourceEndMs": 1236260,
          "text": "理"
        },
        {
          "speechId": 71,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1236720,
          "sourceEndMs": 1241840,
          "text": "なんでお金ここにしか両サイドに置いとけ"
        },
        {
          "speechId": 72,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1243500,
          "sourceEndMs": 1246400,
          "text": "小さな"
        },
        {
          "speechId": 73,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1246860,
          "sourceEndMs": 1264640,
          "text": "あれあれあれあれあれあれあれあれあれ入力あれ入浴料行方不明が村で29歳のこれ以上逆はこなさそうだから休むのか2人2人休みます"
        },
        {
          "speechId": 74,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1265100,
          "sourceEndMs": 1268360,
          "text": "入浴料100円"
        },
        {
          "speechId": 75,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1274520,
          "sourceEndMs": 1276700,
          "text": "ん"
        },
        {
          "speechId": 76,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1282919,
          "sourceEndMs": 1285400,
          "text": "どうした"
        },
        {
          "speechId": 77,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1286460,
          "sourceEndMs": 1293500,
          "text": "入りますよーおじさん入りますよおじさん見えちゃうそんなおじさん"
        },
        {
          "speechId": 78,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1294679,
          "sourceEndMs": 1305860,
          "text": "あ巻いてんじゃんタオルおじさんどうしたふうたなんだサウナッツで何かを見たんだ調べてくれないか"
        },
        {
          "speechId": 79,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1309620,
          "sourceEndMs": 1312520,
          "text": "またそんなな"
        },
        {
          "speechId": 80,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1312679,
          "sourceEndMs": 1327280,
          "text": "その角度で見えたこの竿なしそう全然見てないけどここえーちょっと女の子一人で行かせるんですかちょっとついてきてくださいよ何も言いませんよ"
        },
        {
          "speechId": 81,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1327320,
          "sourceEndMs": 1340780,
          "text": "あー何も何もいませんでしたよおじさん何かいたか絶対に何かを見たんだこの場所はゾッとするもう出るよ"
        },
        {
          "speechId": 82,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1341600,
          "sourceEndMs": 1345039,
          "text": "応募者もちょっとバシャバシャと上がっていった"
        },
        {
          "speechId": 83,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1345919,
          "sourceEndMs": 1353559,
          "text": "なんかこのグラフねこのぐらい水の底からかよ捨て出るか"
        },
        {
          "speechId": 84,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1353900,
          "sourceEndMs": 1375880,
          "text": "あおじさん服着の早いちょっと大丈夫ちょ待って今何時ちょっと待ってそのどうやってここ入るどうやってここに入るんだこれどうやってここに入るだちょっと待ってどうやって入れたこれちょっともう戻れないのか掃除をするああ終わり終わり今日の勤務掃除掃除用具はどこだ"
        },
        {
          "speechId": 85,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1377919,
          "sourceEndMs": 1384039,
          "text": "あなたのような女の子お供え物にぴったり"
        },
        {
          "speechId": 86,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1384640,
          "sourceEndMs": 1390400,
          "text": "私もマイナーを備える気もしかして"
        },
        {
          "speechId": 87,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1390500,
          "sourceEndMs": 1395140,
          "text": "前の備えよってのそ"
        },
        {
          "speechId": 88,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1395840,
          "sourceEndMs": 1403840,
          "text": "掃除しようかなとりあえず落ち着いて曲流すわよ4番の曲"
        },
        {
          "speechId": 89,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1404740,
          "sourceEndMs": 1416320,
          "text": "あれかあそこかな忘れ物などはないでしょうかま2人しかあこれトイレかま2人しか客来てないけどな"
        },
        {
          "speechId": 90,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1416419,
          "sourceEndMs": 1418960,
          "text": "掃除用具はどこだ"
        },
        {
          "speechId": 91,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1420380,
          "sourceEndMs": 1425260,
          "text": "えっなんか来たねえー"
        },
        {
          "speechId": 92,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1425720,
          "sourceEndMs": 1430360,
          "text": "来てないのにこんな汚れるちょっと待ってこれ掃除用語は"
        },
        {
          "speechId": 93,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1431360,
          "sourceEndMs": 1437080,
          "text": "掃除額どこかもうお湯で洗えこのバシャーって"
        },
        {
          "speechId": 94,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1437120,
          "sourceEndMs": 1439539,
          "text": "モップ的な"
        },
        {
          "speechId": 95,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1442159,
          "sourceEndMs": 1445059,
          "text": "モップ的な何かはないか"
        },
        {
          "speechId": 96,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1449500,
          "sourceEndMs": 1471460,
          "text": "ちょっとこれどうやって中にもあなんかなんかあるあーブラシはいブラシゲットしましたじゃあちょっとイカしていただきますマッサージチェアかなフルメーカーあー古めかしいですねそういうスタイルなんだあこっちも汚れたら"
        },
        {
          "speechId": 97,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1471860,
          "sourceEndMs": 1476440,
          "text": "何ですかなんでこんなくるこれ何どういうこと長押し"
        },
        {
          "speechId": 98,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1476679,
          "sourceEndMs": 1479679,
          "text": "あー"
        },
        {
          "speechId": 99,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1479980,
          "sourceEndMs": 1486880,
          "text": "なんかちょっと謎のゲーム要素がお掃除しちゃうぞ"
        },
        {
          "speechId": 100,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1487780,
          "sourceEndMs": 1492700,
          "text": "どうこの圧倒的磨き技"
        },
        {
          "speechId": 101,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1494480,
          "sourceEndMs": 1505179,
          "text": "こんだけちょっと一応なんか不穏なサウナ室もチラーミーしてま大丈夫そうかちょっと女湯洗いに行きますよ"
        },
        {
          "speechId": 102,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1506179,
          "sourceEndMs": 1520820,
          "text": "モップ掃除ね船長ね昔腰が入ってないってねお局に怒られたんで今となってはね腰を入れてしっかり掃除ができるようになりましたはい"
        },
        {
          "speechId": 103,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1522200,
          "sourceEndMs": 1528340,
          "text": "スマホの感度高いかなちょっと若干高いかもしれないちょっと感度下げますね"
        },
        {
          "speechId": 104,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1529179,
          "sourceEndMs": 1541779,
          "text": "1-11から1にするわ明るさちょっとあげるか1明るさ1あいいじゃんいいじゃんいい感じじゃん"
        },
        {
          "speechId": 105,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1545480,
          "sourceEndMs": 1551799,
          "text": "アイカちゃんといい感じだった感度3000円"
        },
        {
          "speechId": 106,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1551840,
          "sourceEndMs": 1571000,
          "text": "マウスの感度を3000倍にすると仕事が私シャワーを見るえーちょっと待って普通さ自分も風呂入ってから掃除するんあでもどの汗かくからさいやでも結局汚すなるあーちょっと悩みどころだなあどっちが先だろうね"
        },
        {
          "speechId": 107,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1571820,
          "sourceEndMs": 1575140,
          "text": "よこれ女か"
        },
        {
          "speechId": 108,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1577400,
          "sourceEndMs": 1589720,
          "text": "悩むななんか普通に考えたらどうやってどこで特等席とかあんのかなどこであどこでもいいだろうなんでここ指定なのシャワーを浴びるはい浴びます"
        },
        {
          "speechId": 109,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1591679,
          "sourceEndMs": 1598659,
          "text": "うーん個人的にはねシャワーして洗ってからん"
        },
        {
          "speechId": 110,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1602480,
          "sourceEndMs": 1606279,
          "text": "あー生き返るわー"
        },
        {
          "speechId": 111,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1606620,
          "sourceEndMs": 1609580,
          "text": "フルは心のん"
        },
        {
          "speechId": 112,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1610340,
          "sourceEndMs": 1614860,
          "text": "気のせいか物音がしたような"
        },
        {
          "speechId": 113,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1616820,
          "sourceEndMs": 1619000,
          "text": "流すわ"
        },
        {
          "speechId": 114,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1619100,
          "sourceEndMs": 1628419,
          "text": "うんあれんちょうど言えばやばいやばいやばいやばいちょ不穏ですすいません若干"
        },
        {
          "speechId": 115,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1629179,
          "sourceEndMs": 1634179,
          "text": "見ないよマリオは見ない前には見ないよ"
        },
        {
          "speechId": 116,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1647419,
          "sourceEndMs": 1656559,
          "text": "えっ猿八宝菜のじじいか防災のじじいあ"
        },
        {
          "speechId": 117,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1658760,
          "sourceEndMs": 1661419,
          "text": "竿のルームになんかいる"
        },
        {
          "speechId": 118,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1663799,
          "sourceEndMs": 1666039,
          "text": "猿か"
        },
        {
          "speechId": 119,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1666980,
          "sourceEndMs": 1673000,
          "text": "私倒れてるのマイナ倒れてんのかこれ"
        },
        {
          "speechId": 120,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1676760,
          "sourceEndMs": 1678760,
          "text": "え"
        },
        {
          "speechId": 121,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1680360,
          "sourceEndMs": 1682960,
          "text": "猿の目線"
        },
        {
          "speechId": 122,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1683059,
          "sourceEndMs": 1718000,
          "text": "2日目あああちょっと見ないでマイなの前なのブラジャー見ないでよ靴下もパンパンツとブラジャーがおそろじゃないわ同じピンクでも色味が違いすぎるマイナの前の全部ピンクかよ全部ピンクかよ靴下もパンツもブラもなんだこれうわまだこれこれ何うんこれなんかあれもトップスも全部ピンクやカーテンつけないと女が住んでるってバレたら"
        },
        {
          "speechId": 123,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1718159,
          "sourceEndMs": 1733539,
          "text": "あでもなんか生活感出てきたかあじゃがりことねえハムチーズみたいなサンドイッチこれなんだ精神安定剤的な行くかはい出勤します出勤"
        },
        {
          "speechId": 124,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1734900,
          "sourceEndMs": 1750039,
          "text": "そういえば下にいたあのーねえなんだっけ名前忘れたな風丸みたいな悪そうなあのあの犯罪者はもういなくなったんか"
        },
        {
          "speechId": 125,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1750380,
          "sourceEndMs": 1758919,
          "text": "ま取りまねトリマー1に出勤2に出勤なんせ出勤をとりあえず出勤します"
        },
        {
          "speechId": 126,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1759919,
          "sourceEndMs": 1772600,
          "text": "徒歩3分くらいの距離に職場があるのっていいやら悪いやらだよね船長もね昔のね職場ほんとに徒歩圏内だったんだけどあなんかおばあちゃんあ"
        },
        {
          "speechId": 127,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1773179,
          "sourceEndMs": 1776620,
          "text": "何誰か無くなったの"
        },
        {
          "speechId": 128,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1779740,
          "sourceEndMs": 1785559,
          "text": "なにこれお供えしてるって"
        },
        {
          "speechId": 129,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1787520,
          "sourceEndMs": 1801640,
          "text": "ちょっとそんなやめてくださいよこんな営業妨害ですよこんな戦闘店の入り口でお供えするのやめてくださいまたこの曲まだ攻撃流れてる"
        },
        {
          "speechId": 130,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1804260,
          "sourceEndMs": 1856600,
          "text": "渋いって曲がさあ5位どっちからでも来いまずはおっさんが来るんじゃないほらほら来ましたタオル入力量はいはいはいありがとうございますタオルだけ大丈夫ですかちゃんと洗ってくださいよはいどうぞおいおい圭一なんで15分後に飲み物を持ってこいあわかったよあのね私はあなたのお嫁さんじゃないんですけど15分後ちょっと待って時計時計なんだかんだ言われても結局ね結局そんなこと言われて昔っ腹が立ったとしてもマリンはねあの従順に飲み物を持って行っちゃう何が好みなのかな何が圭一さんの好みなんだってかしら聞きそびれちゃったわ私は主婦失格ね"
        },
        {
          "speechId": 131,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1858020,
          "sourceEndMs": 1875140,
          "text": "デン電工電工落としてしまったイヤリングを探しに来ましたあこれむちんでまさかおいでんこーまん無知"
        },
        {
          "speechId": 132,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1877039,
          "sourceEndMs": 1894159,
          "text": "くださーいなんか小さな生命体が入ってこいよ苗をなんか小さな生命体少女てんてんてんさっきお供え物されてたぜってこれ死んだ少女に完全に"
        },
        {
          "speechId": 133,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1895820,
          "sourceEndMs": 1903640,
          "text": "入ってこいよちょっと私圭一さんに飲み物届けないといなくなってるいなくなってる"
        },
        {
          "speechId": 134,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1904159,
          "sourceEndMs": 1913899,
          "text": "飲み物行かないとねあこれ以上逆はこなさそうだから休むのか"
        },
        {
          "speechId": 135,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1914600,
          "sourceEndMs": 1917919,
          "text": "飲み物持って行きますかじゃあちょっと"
        },
        {
          "speechId": 136,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1920659,
          "sourceEndMs": 1930279,
          "text": "15分ほど経ったようだああの人に飲み物持っていこうな待ってなんかん刀なんか落ちてる刀みたいなの"
        },
        {
          "speechId": 137,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1932320,
          "sourceEndMs": 1937419,
          "text": "あれなんか落ちてたような気がしたけどあれ"
        },
        {
          "speechId": 138,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1937820,
          "sourceEndMs": 1940720,
          "text": "気のせいざむらいだったわ"
        },
        {
          "speechId": 139,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1940760,
          "sourceEndMs": 1951880,
          "text": "飲み物の飲み物あうわいろいろあるな何が好きかしらねえあれ茜これ男湯の方のやつかどっちでもいいだろう"
        },
        {
          "speechId": 140,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1953360,
          "sourceEndMs": 1955720,
          "text": "こっちにもある"
        },
        {
          "speechId": 141,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1955820,
          "sourceEndMs": 1957940,
          "text": "あ"
        },
        {
          "speechId": 142,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1958700,
          "sourceEndMs": 1961779,
          "text": "ーブラウン君"
        },
        {
          "speechId": 143,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1962659,
          "sourceEndMs": 1965140,
          "text": "愛飲み物"
        },
        {
          "speechId": 144,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1965419,
          "sourceEndMs": 1970539,
          "text": "あどうやってさあこれだわ"
        },
        {
          "speechId": 145,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1970940,
          "sourceEndMs": 1983919,
          "text": "えー何が好みなんだろうこれは何コーヒー牛乳1問ミルクかなこれなんだこれこれなんだ"
        },
        {
          "speechId": 146,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1984559,
          "sourceEndMs": 1990039,
          "text": "ビールケーキ様あの人はビールが好きだから"
        },
        {
          "speechId": 147,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 1990080,
          "sourceEndMs": 2009659,
          "text": "ビール持ってきましたよ風呂で飲むビールは格別だって言ってましたもんねあなたねはいゲージさんいい娘だな嫁の目線だったけど娘の視点だったおいもうおいて私は多いって名前じゃありませんマイナです"
        },
        {
          "speechId": 148,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2010360,
          "sourceEndMs": 2040140,
          "text": "なぜここで働いているんだなぜそうですねまあすぐにでも仕事を辞めたかったからかなあ圭一さんがね結婚してくだされば働かずに済むのかなってところはえーと特に理由あるだろ色々コミットまぁでもここで話すようなことでもないいい提案をしてあげようか何まさか球根俺の下で働くのはどうだ"
        },
        {
          "speechId": 149,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2040500,
          "sourceEndMs": 2055679,
          "text": "もしかして大企業の社長さんだったりしてお前のような娘なら今の何千倍も待ってまさかマリンを毎度いやらしい店に"
        },
        {
          "speechId": 150,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2055780,
          "sourceEndMs": 2065040,
          "text": "いやらしい働きを何千倍も稼げるこれあ完全にやられてるここにいるのは時間の無駄だろ"
        },
        {
          "speechId": 151,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2065200,
          "sourceEndMs": 2074520,
          "text": "興味ないです残念だ本当にいいのか後悔すると俺の誘いを断るなんて"
        },
        {
          "speechId": 152,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2075099,
          "sourceEndMs": 2099240,
          "text": "でも明らかになく何千倍も稼げるのじゃあまりにも胡散臭いですお前みたいな奴にこんないい話他ではないからないやいやそれパワハラですよそうやってね他ではお前みたいなやつは他では働けないみたいなあちょっとそんなお尻をメタリックケイズさんメタリックだってなんかなんかメタリック"
        },
        {
          "speechId": 153,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2101560,
          "sourceEndMs": 2108180,
          "text": "怒らしちゃったかしらなんかこうここの言うメタリックじゃねえなんか知らんけど"
        },
        {
          "speechId": 154,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2108640,
          "sourceEndMs": 2111119,
          "text": "メタリコなんだけど"
        },
        {
          "speechId": 155,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2111520,
          "sourceEndMs": 2113760,
          "text": "あ"
        },
        {
          "speechId": 156,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2114460,
          "sourceEndMs": 2117960,
          "text": "待って待ってよ"
        },
        {
          "speechId": 157,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2118839,
          "sourceEndMs": 2127680,
          "text": "顔が黒い悪人だぞこいつ完全についてくわはは91キー消えた"
        },
        {
          "speechId": 158,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2127720,
          "sourceEndMs": 2130560,
          "text": "あまだ備えてある"
        },
        {
          "speechId": 159,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2130720,
          "sourceEndMs": 2134520,
          "text": "仕事に戻らないといけないかもしれない"
        },
        {
          "speechId": 160,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2140800,
          "sourceEndMs": 2143800,
          "text": "大変"
        },
        {
          "speechId": 161,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2144820,
          "sourceEndMs": 2152579,
          "text": "電気が消えた大変電気が消えた電気をつける方法家具なんで2回行った"
        },
        {
          "speechId": 162,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2152680,
          "sourceEndMs": 2157800,
          "text": "電気が消えただけでそのバグを鳴らさないでびっくりしちゃったじゃん"
        },
        {
          "speechId": 163,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2159099,
          "sourceEndMs": 2164579,
          "text": "電気の電気をつける方法"
        },
        {
          "speechId": 164,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2166060,
          "sourceEndMs": 2184020,
          "text": "死ぬほど電気空いてね銃口ボックス違ういやめっちゃえっめっちゃ電気ついてねちょっとどういうことやこのままじゃアイスクリームが溶け散らかす何か違う"
        },
        {
          "speechId": 165,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2184900,
          "sourceEndMs": 2199740,
          "text": "電流を使っているのかちょっとあんま詳しくないからさあ電気の仕組みにえどうやって電気つけるのえー嫌だ嫌だこんな真っ暗な風呂の中には入りとないでもこの中かもしれない"
        },
        {
          "speechId": 166,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2201040,
          "sourceEndMs": 2214859,
          "text": "えーでもさすがにブルーコア的なのここ風呂の中にはないよね普通ねこれは時計かえー"
        },
        {
          "speechId": 167,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2218140,
          "sourceEndMs": 2227040,
          "text": "ここよ電気こより電気ちょっとここよ電気から電気奪うぞん"
        },
        {
          "speechId": 168,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2228040,
          "sourceEndMs": 2244680,
          "text": "え何これ電線ちょっと待ってここここ車で走れねえぞはぁおかしいだろこれいや自転車でも無理だろうはなんだこれは"
        },
        {
          "speechId": 169,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2244960,
          "sourceEndMs": 2249720,
          "text": "なんかあるここ用電気"
        },
        {
          "speechId": 170,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2250119,
          "sourceEndMs": 2254339,
          "text": "いやいや何これ何これ何これ絶対おかしいあ"
        },
        {
          "speechId": 171,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2254440,
          "sourceEndMs": 2258780,
          "text": "ブレーカー鍵がいるのかな"
        },
        {
          "speechId": 172,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2261099,
          "sourceEndMs": 2276060,
          "text": "これを分かりやすくするためのやつなのかなちょっとあかんだろこれなんか引っかかってる絶対道路の家電量販店に入る入ります電気下さいこれ電気盗まれてっぞ"
        },
        {
          "speechId": 173,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2276640,
          "sourceEndMs": 2283380,
          "text": "レジにて最大50%オフ第5業務用の冷蔵庫みたいな"
        },
        {
          "speechId": 174,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2284200,
          "sourceEndMs": 2294359,
          "text": "レストランで働くあー業務用の素焼きわすごいこれレストランで働いてる時あったわなんでこんなレストランとっかなこのこの店フライパンもある"
        },
        {
          "speechId": 175,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2296140,
          "sourceEndMs": 2300599,
          "text": "じゃあちょっと勝手にまだあっ"
        },
        {
          "speechId": 176,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2301440,
          "sourceEndMs": 2314880,
          "text": "分かった電光イヤリングを落としてしまってってさ入り込んできてさ電気も盗む働きをしてたんじゃないのあなたあんた何やってんのよ"
        },
        {
          "speechId": 177,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2315820,
          "sourceEndMs": 2331320,
          "text": "いやこっちのセリフやお前あんた貧乏でしょまあこの家電達私の赤ちゃんのようなものだわどうぞ見てって脈絡がないなぁ"
        },
        {
          "speechId": 178,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2331900,
          "sourceEndMs": 2351780,
          "text": "貧乏なのになんで見てっていいのでも一つ絶対ブツブツ効果なし聞こえてる聞こえてますブツブツ交換できるなんて思ってません気に入ったのあったのあー値切り離しね"
        },
        {
          "speechId": 179,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2352060,
          "sourceEndMs": 2368099,
          "text": "あ銭湯から電気を引いてますよねはっ黙れ失礼な子ね私がどこの電気を使おうか勝手でしょだから嫌なのよ貧乏人は何でもいちゃもんつけて"
        },
        {
          "speechId": 180,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2369099,
          "sourceEndMs": 2378960,
          "text": "あんた友達いないでしょ全部ブーメランしてからクレイジーピーポーレイジーピーポー"
        },
        {
          "speechId": 181,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2380200,
          "sourceEndMs": 2387540,
          "text": "クレイジーピーポーって言われちゃったねちょっと待って落ちた黒のおもちゃ"
        },
        {
          "speechId": 182,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2388060,
          "sourceEndMs": 2391980,
          "text": "クレイジーピーポーとか興味言わないだろ"
        },
        {
          "speechId": 183,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2392260,
          "sourceEndMs": 2394920,
          "text": "あテレビの"
        },
        {
          "speechId": 184,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2395200,
          "sourceEndMs": 2409140,
          "text": "あっ火災報知器えならせるのこれちょっと鳴らしてみていいいやこれ興味本位で火災報知器を押すのはもはや犯罪なんだけども試しに押してみますあ"
        },
        {
          "speechId": 185,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2411420,
          "sourceEndMs": 2414839,
          "text": "何してんの"
        },
        {
          "speechId": 186,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2415720,
          "sourceEndMs": 2422220,
          "text": "ものすごい電子が悪いね私は何もちっとボケ"
        },
        {
          "speechId": 187,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2423400,
          "sourceEndMs": 2433859,
          "text": "ンコさんが電気盗むから何してんの同じサイバーだったよ今のうちに"
        },
        {
          "speechId": 188,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2435280,
          "sourceEndMs": 2438420,
          "text": "電子がワチャワチャやってるうちに"
        },
        {
          "speechId": 189,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2438579,
          "sourceEndMs": 2455760,
          "text": "止めるぞよくも盗みやがって人の超電気をよーアルコールじゃあこの鍵じゃないかあれ取っただけどこ行ったあれあれ鍵と手じゃないのかあ電子があそこにいる間に"
        },
        {
          "speechId": 190,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2456940,
          "sourceEndMs": 2477119,
          "text": "電子があそこにいる間に取るのやってれやってろ貰ってくぞ確か電気ボックスはお店の裏にあるはずドロワーズちょっとほとんど犯罪だけどまあでも犯罪してるからねぇお互いに行き過ぎた犯罪"
        },
        {
          "speechId": 191,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2477220,
          "sourceEndMs": 2489839,
          "text": "喧嘩両成敗行き過ぎ両成敗ですねはいちょっと当然のように冷えたかーちょっとでこがイラついてる様でも見に行くか"
        },
        {
          "speechId": 192,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2491020,
          "sourceEndMs": 2495180,
          "text": "まだやったらそことくか"
        },
        {
          "speechId": 193,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2495220,
          "sourceEndMs": 2519119,
          "text": "まだやってまーすまあこちらはね掃除させていただきますよマリンは掃除用語どっちだっけなーこっちだっけこっちだんあの今日はまた趣の違う掃除道具ですねあ壁北でどういうこと"
        },
        {
          "speechId": 194,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2520480,
          "sourceEndMs": 2525359,
          "text": "そうはならんやろ穴やぞもう"
        },
        {
          "speechId": 195,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2525400,
          "sourceEndMs": 2528359,
          "text": "設計ウインカーだったけど"
        },
        {
          "speechId": 196,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2529660,
          "sourceEndMs": 2537900,
          "text": "ブチャラティが八雲ゆかりでしかない隙間みたいな穴が一応ね不穏なサウナシスもチラーミンして"
        },
        {
          "speechId": 197,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2539320,
          "sourceEndMs": 2554080,
          "text": "不穏なサウナ掃除をして不穏な竿無しそちらにするというこのねルーティーンがねいやねでもねやっぱね仕事を長く続けてるとねこうやってルーティン化していくものですからねちょっと届くかなここ"
        },
        {
          "speechId": 198,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2555820,
          "sourceEndMs": 2570599,
          "text": "穴やってもこれはこのくらいの時代の時はねえ待ってんあ人に見える汚れか人に見える汚れだえっ"
        },
        {
          "speechId": 199,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2573820,
          "sourceEndMs": 2581220,
          "text": "仕事が私は浴びるえこれに見られてるまま消えてないよこのままでいいの"
        },
        {
          "speechId": 200,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2581319,
          "sourceEndMs": 2583500,
          "text": "えー"
        },
        {
          "speechId": 201,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2584619,
          "sourceEndMs": 2587880,
          "text": "マジかマイナー"
        },
        {
          "speechId": 202,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2590079,
          "sourceEndMs": 2594900,
          "text": "あ勝ってこれ赤いよ"
        },
        {
          "speechId": 203,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2595839,
          "sourceEndMs": 2601500,
          "text": "出ないしあー出た知らん"
        },
        {
          "speechId": 204,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2601900,
          "sourceEndMs": 2604260,
          "text": "何"
        },
        {
          "speechId": 205,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2605380,
          "sourceEndMs": 2607740,
          "text": "か"
        },
        {
          "speechId": 206,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2608619,
          "sourceEndMs": 2612540,
          "text": "化け物ASMRお化けAMM"
        },
        {
          "speechId": 207,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2614020,
          "sourceEndMs": 2628800,
          "text": "まだあるまだあるって何あ今日は湯に浸かるか今日はね猿もいないしゆっくり湯に浸かりますあれもずっとあるじゃん"
        },
        {
          "speechId": 208,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2630700,
          "sourceEndMs": 2633599,
          "text": "いや怖いなぁ"
        },
        {
          "speechId": 209,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2637599,
          "sourceEndMs": 2645000,
          "text": "変な曲流れてる変な曲流れてるよえっ"
        },
        {
          "speechId": 210,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2646660,
          "sourceEndMs": 2648839,
          "text": "ええ"
        },
        {
          "speechId": 211,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2663520,
          "sourceEndMs": 2666240,
          "text": "もういいかな"
        },
        {
          "speechId": 212,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2667720,
          "sourceEndMs": 2670560,
          "text": "出れない"
        },
        {
          "speechId": 213,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2670780,
          "sourceEndMs": 2673200,
          "text": "投げれなくなる"
        },
        {
          "speechId": 214,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2683040,
          "sourceEndMs": 2686220,
          "text": "今なんか"
        },
        {
          "speechId": 215,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2687280,
          "sourceEndMs": 2690359,
          "text": "ここなんか光っん"
        },
        {
          "speechId": 216,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2702760,
          "sourceEndMs": 2705060,
          "text": "誰がいる"
        },
        {
          "speechId": 217,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2708220,
          "sourceEndMs": 2714240,
          "text": "え男湯これちょっと壁のシミ見ていいまだあるわ"
        },
        {
          "speechId": 218,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2717640,
          "sourceEndMs": 2720300,
          "text": "入ってんじゃねえぞ"
        },
        {
          "speechId": 219,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2721000,
          "sourceEndMs": 2724260,
          "text": "保有旅コンテンツだぞここの店は"
        },
        {
          "speechId": 220,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2729460,
          "sourceEndMs": 2732780,
          "text": "お化けが言う浴びてるわ"
        },
        {
          "speechId": 221,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2733000,
          "sourceEndMs": 2749940,
          "text": "止めるかちょっと突然止めるわえっ並々ならぬえっ団体で浴びてるってちょ全部止めるわふざけんな"
        },
        {
          "speechId": 222,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2750520,
          "sourceEndMs": 2753000,
          "text": "無難な"
        },
        {
          "speechId": 223,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2768900,
          "sourceEndMs": 2782220,
          "text": "なんで立ち入り禁止私死んだマイナ死んだ何何ちょっとおい何祈ってんだ私死んだんか"
        },
        {
          "speechId": 224,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2789099,
          "sourceEndMs": 2802020,
          "text": "あ生きてるなんなんどういうこと何があったのよあーなんだこのいやらしいパンツでもよく見たら布パンドットの布パン"
        },
        {
          "speechId": 225,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2802780,
          "sourceEndMs": 2805740,
          "text": "パンツ展覧会"
        },
        {
          "speechId": 226,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2806500,
          "sourceEndMs": 2810060,
          "text": "待って何ですかこれ"
        },
        {
          "speechId": 227,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2810220,
          "sourceEndMs": 2812460,
          "text": "か"
        },
        {
          "speechId": 228,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2813460,
          "sourceEndMs": 2816060,
          "text": "引っこナック"
        },
        {
          "speechId": 229,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2821980,
          "sourceEndMs": 2828240,
          "text": "何何が抜けたの今え髪の毛かなんか"
        },
        {
          "speechId": 230,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2832599,
          "sourceEndMs": 2835380,
          "text": "8月11日です"
        },
        {
          "speechId": 231,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2835420,
          "sourceEndMs": 2840540,
          "text": "8月11日はマリンの"
        },
        {
          "speechId": 232,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2840940,
          "sourceEndMs": 2843780,
          "text": "周年記念あお弁当"
        },
        {
          "speechId": 233,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2844060,
          "sourceEndMs": 2849000,
          "text": "ま取りましょうか一旦な"
        },
        {
          "speechId": 234,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2850060,
          "sourceEndMs": 2853800,
          "text": "うん髪の話"
        },
        {
          "speechId": 235,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2854500,
          "sourceEndMs": 2869940,
          "text": "髪の毛船長もよく抜けるよ風呂入ってない時めっちゃいっぱい髪の毛抜けるんだけどさそういう時思うのなんか本当は風呂で抜け落ちるべき毛が寝てる間に抜けてるだけなのかなあれってさ"
        },
        {
          "speechId": 236,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2872380,
          "sourceEndMs": 2876000,
          "text": "めっちゃ抜けるんだよねなんか"
        },
        {
          "speechId": 237,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2876099,
          "sourceEndMs": 2884760,
          "text": "明るくねこんなもんだっけタバコ屋さんか猫を探してます駄菓子屋の猫"
        },
        {
          "speechId": 238,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2884920,
          "sourceEndMs": 2891060,
          "text": "この猫何か幸福なことを起こしてくれそうだなぁ"
        },
        {
          "speechId": 239,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2891520,
          "sourceEndMs": 2897960,
          "text": "この猫は多分幸福の鍵を握ってるぞなんか落ちてる"
        },
        {
          "speechId": 240,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2899079,
          "sourceEndMs": 2903780,
          "text": "えあーサリー"
        },
        {
          "speechId": 241,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2905680,
          "sourceEndMs": 2912240,
          "text": "早くすぎだろブンブンじゃねえかここサルスサル死んじゃったんか"
        },
        {
          "speechId": 242,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2912760,
          "sourceEndMs": 2914880,
          "text": "猿"
        },
        {
          "speechId": 243,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2917339,
          "sourceEndMs": 2930839,
          "text": "やめろこの曲お客様が来るえ今日はじゃあ男湯はいや営業しておりませんので女用しか来ないということであっいややっぱなんか落ちてかこれ落ちてんじゃなくてさ光の加減か"
        },
        {
          "speechId": 244,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2931780,
          "sourceEndMs": 2944940,
          "text": "おばあちゃん2人組千代シャンプーをちょうだいはいちゃんとねお金もらおうでえータオルタオルシャンプーはいはいタオルタオル"
        },
        {
          "speechId": 245,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2945700,
          "sourceEndMs": 2958440,
          "text": "これボディソープかあれどれがシャンプやこれシャンプーはいシャンプーとアタオルタオルばあちゃんどうぞー"
        },
        {
          "speechId": 246,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2960700,
          "sourceEndMs": 2968520,
          "text": "仲良しおばあちゃん2人組ですねー着替えてるあの子が新しい国会"
        },
        {
          "speechId": 247,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2968980,
          "sourceEndMs": 2988680,
          "text": "はい新人です強さよろしくおねあの子はなんかおかしいおばあちゃんから見れば若者はねエイリアンみたいな存在だとあの子はなんかおかしい2回もおばあちゃん2回も言うんだいやおかしくまだ行ってるまだ行ってるうわぁ"
        },
        {
          "speechId": 248,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 2996060,
          "sourceEndMs": 3022819,
          "text": "ちょっとそこのあなた顔が暗いですね何かを抱えていますねしかしもう大丈夫ですあなたは愛されていますシラティキスここでこうした私と会えたことが証拠です白テキスのや魂が宿ったこれをあげましょうこれを持っておくと活力がみなぎりますよ"
        },
        {
          "speechId": 249,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3026579,
          "sourceEndMs": 3029180,
          "text": "チラビーって何"
        },
        {
          "speechId": 250,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3029599,
          "sourceEndMs": 3050660,
          "text": "やねん白テキスは常に私たちと共にいます神と呼ぶものもおりますが正しくはチラテケスというものです神のことがちら的すってくそも立ち入り禁止やねん入ってくなそうなんですねあでは一応もらっておきます"
        },
        {
          "speechId": 251,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3052220,
          "sourceEndMs": 3065660,
          "text": "では特別に10万円にしてあげますよ10万円この純金プリで10万円ならなんか安いものなのかもしかしてそんなお金ありません"
        },
        {
          "speechId": 252,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3070380,
          "sourceEndMs": 3074119,
          "text": "ジラテケスはあなたを見放すでしょう"
        },
        {
          "speechId": 253,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3074760,
          "sourceEndMs": 3077900,
          "text": "ちらっぴんちらっぴん"
        },
        {
          "speechId": 254,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3081480,
          "sourceEndMs": 3084859,
          "text": "異常者が来たわちょっと恐ろしいなあ"
        },
        {
          "speechId": 255,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3085260,
          "sourceEndMs": 3095780,
          "text": "つれよこの仕事あの子はなんかマジカルしとんじゃはいはいでは出ますもしもし不明"
        },
        {
          "speechId": 256,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3104339,
          "sourceEndMs": 3110739,
          "text": "鼻水噛んだティッシュでメモるわ812812"
        },
        {
          "speechId": 257,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3111359,
          "sourceEndMs": 3116420,
          "text": "あ何何何何何何何"
        },
        {
          "speechId": 258,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3120480,
          "sourceEndMs": 3123380,
          "text": "20分後"
        },
        {
          "speechId": 259,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3125760,
          "sourceEndMs": 3132469,
          "text": "なんか今ババアが悪口言ってた"
        },
        {
          "speechId": 260,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3132720,
          "sourceEndMs": 3146839,
          "text": "わしはみわざわざ鳴らして地位をさっきのばあちゃんの片割れあなたのような女の子お供え物にぴったりもね"
        },
        {
          "speechId": 261,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3149579,
          "sourceEndMs": 3186500,
          "text": "ーお供え物としての人気高いなマリーナ今日やることはどれどれリストに近所の駄菓子屋にジュースを買いに行くと書いてある1ミリも見てねじゃん無視したぞママイナーと千代に完全にお供え物ロックオンされてるけど完全に無視なんで駄菓子屋駄菓子屋くらいしか店がないんでしょここにはこの辺り見せないからなちょっとこれかわいそうだな何かはいかかりすぎだからなあなんかなんかいるよ"
        },
        {
          "speechId": 262,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3191040,
          "sourceEndMs": 3193460,
          "text": "焼き芋"
        },
        {
          "speechId": 263,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3197220,
          "sourceEndMs": 3200240,
          "text": "石焼きはそんな"
        },
        {
          "speechId": 264,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3200940,
          "sourceEndMs": 3206900,
          "text": "思って美味しい石焼き芋はいかがでしょうか"
        },
        {
          "speechId": 265,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3207240,
          "sourceEndMs": 3210020,
          "text": "癒し来た癒し"
        },
        {
          "speechId": 266,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3210720,
          "sourceEndMs": 3245480,
          "text": "芋じろうお会いできて嬉しい芋じろう性格よオスは買います交わしていただきますさつまいもが欲しいですありがとうございますでもでもさつまいもを食べるにはさつまいもの問題にうるせー歌うな歌うな第1問ジャーじゃんどこで土の中土の中土の中"
        },
        {
          "speechId": 267,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3246960,
          "sourceEndMs": 3250520,
          "text": "うるせえ美味しい"
        },
        {
          "speechId": 268,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3256559,
          "sourceEndMs": 3271520,
          "text": "第2問ジャージャン収穫の時期はえーでもなんか秋に焼き芋するから秋なんと違いますの正解では第3問ジャージャンさつまいもには花が咲く知らねー"
        },
        {
          "speechId": 269,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3272760,
          "sourceEndMs": 3277520,
          "text": "サツマイモでも見たことないから高ない"
        },
        {
          "speechId": 270,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3280640,
          "sourceEndMs": 3308839,
          "text": "んだけどさつまいもに失礼だと思いませんか思いますよねさつまいもがかわいそうですよねやり直してくださいすいませんごめんなさいお会いできて嬉しいなってるぞ切り替えどうなったのそうもう1回チャレンジしますはいはいさつまいもクイズうるさい歌が本当にうるさい"
        },
        {
          "speechId": 271,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3309240,
          "sourceEndMs": 3313640,
          "text": "土の中甘くて美味しい"
        },
        {
          "speechId": 272,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3321359,
          "sourceEndMs": 3323780,
          "text": "すぎたか"
        },
        {
          "speechId": 273,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3325020,
          "sourceEndMs": 3331280,
          "text": "慎重にある慎重に連打しすぎない収穫の時期"
        },
        {
          "speechId": 274,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3338220,
          "sourceEndMs": 3341220,
          "text": "もう"
        },
        {
          "speechId": 275,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3341760,
          "sourceEndMs": 3349220,
          "text": "外せないわよタンポポなんじゃないのこれたんぽぽなんじゃない美味しい"
        },
        {
          "speechId": 276,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3350280,
          "sourceEndMs": 3354020,
          "text": "本当に朝顔に似ている"
        },
        {
          "speechId": 277,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3354800,
          "sourceEndMs": 3359839,
          "text": "さつまいも博士じゃねえの美味しい"
        },
        {
          "speechId": 278,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3361819,
          "sourceEndMs": 3364819,
          "text": "お主"
        },
        {
          "speechId": 279,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3367280,
          "sourceEndMs": 3372559,
          "text": "最後の問題ですさつまいもの1番"
        },
        {
          "speechId": 280,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3382559,
          "sourceEndMs": 3387079,
          "text": "いやきも"
        },
        {
          "speechId": 281,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3389280,
          "sourceEndMs": 3391700,
          "text": "ち"
        },
        {
          "speechId": 282,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3394160,
          "sourceEndMs": 3399480,
          "text": "おきでしょいやーい"
        },
        {
          "speechId": 283,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3402740,
          "sourceEndMs": 3411260,
          "text": "ちの中えじゃあ何が正解なの石垣じゃないの"
        },
        {
          "speechId": 284,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3414059,
          "sourceEndMs": 3419059,
          "text": "油で揚げる油で芋"
        },
        {
          "speechId": 285,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3425880,
          "sourceEndMs": 3431969,
          "text": "ゆっくりゆっくりゆっくり"
        },
        {
          "speechId": 286,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3433260,
          "sourceEndMs": 3440180,
          "text": "意外とねこれねなんかねラグがあるんよクリックに冬選択した"
        },
        {
          "speechId": 287,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3449220,
          "sourceEndMs": 3461540,
          "text": "焼き芋ねぇこれ焼き芋貰わなきゃいけないかなぁ"
        },
        {
          "speechId": 288,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3476540,
          "sourceEndMs": 3481980,
          "text": "マウスかマウスのかんマウスも"
        },
        {
          "speechId": 289,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3482880,
          "sourceEndMs": 3490880,
          "text": "反応してるこれいやーちょっと"
        },
        {
          "speechId": 290,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3504359,
          "sourceEndMs": 3508200,
          "text": "うるさすぎるちょっと一"
        },
        {
          "speechId": 291,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3508920,
          "sourceEndMs": 3513859,
          "text": "周下げるわちょっと石焼き芋の歌が本当にうるさい"
        },
        {
          "speechId": 292,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3515460,
          "sourceEndMs": 3525740,
          "text": "下げてもうるせえじゃあさあでもうるさいいやなんかねこのねクリックもなんかね"
        },
        {
          "speechId": 293,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3526200,
          "sourceEndMs": 3533180,
          "text": "待って落ち着いてねはい落ち着いてはいはいはいさつまいも第1問はいどこで育つ"
        },
        {
          "speechId": 294,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3535619,
          "sourceEndMs": 3548000,
          "text": "クリックしてるのに出てこない問題が出てきた土の中でしょ土の中だよね今土の中です"
        },
        {
          "speechId": 295,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3548040,
          "sourceEndMs": 3552619,
          "text": "正解収穫の時期"
        },
        {
          "speechId": 296,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3553859,
          "sourceEndMs": 3574819,
          "text": "縮めてもうるせえ秋秋なんでそういうことキーボードで選んでキーボードで選んでるんだけどスペースキーを使いスペースで決定スペーススペースでこうスペースで市場を改めて"
        },
        {
          "speechId": 297,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3575460,
          "sourceEndMs": 3583619,
          "text": "淡くて美味しい一つ欲しいですあスペースじゃ選べないのか一番"
        },
        {
          "speechId": 298,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3583740,
          "sourceEndMs": 3587780,
          "text": "上に行った何で決定したマウスで決定してる"
        },
        {
          "speechId": 299,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3587940,
          "sourceEndMs": 3597079,
          "text": "誰もいけるかアレンダーでもいけるエンターでもいけるエンターで公園だであちょっと待ってメモリ不足で"
        },
        {
          "speechId": 300,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3599400,
          "sourceEndMs": 3606920,
          "text": "土の中エンターエンダーだこれエンターだ"
        },
        {
          "speechId": 301,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3611760,
          "sourceEndMs": 3625520,
          "text": "花が咲くはい朝顔に似ているそして最後の問題がこれ分かんのむす"
        },
        {
          "speechId": 302,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3626160,
          "sourceEndMs": 3628819,
          "text": "びが"
        },
        {
          "speechId": 303,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3629160,
          "sourceEndMs": 3638720,
          "text": "ちょっと待ってメモリ不足で固まったいや何が正解電子レンジうそでしょ"
        },
        {
          "speechId": 304,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3638760,
          "sourceEndMs": 3663079,
          "text": "石焼が正解か油で揚げる一周期正解だったのかな石焼きであってたのにずれちゃったのかなでもエンターでずれなくなったからこれでエンターに行く終わりエンターではい土の中これからやるやるメンバーに教えてあげたいクリックじゃなくてエンターでやった方がいいって"
        },
        {
          "speechId": 305,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3663140,
          "sourceEndMs": 3670760,
          "text": "もしここでさあ他のメンバーが沼ってたらアドバイスしてあげて"
        },
        {
          "speechId": 306,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3670980,
          "sourceEndMs": 3677540,
          "text": "花咲くはい答えは沈黙朝顔"
        },
        {
          "speechId": 307,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3677760,
          "sourceEndMs": 3710240,
          "text": "最後これなんだろちょっと待って石焼がやっぱ正解なのかな船長のエイムがずれただけかもしれない石焼なかなかやるなおぬしはさつまこのさつまいも食べるにふさわしい人材だほらよ楽しみなでも早食いはどうだ急に態度でかい味は恐れが一番大事あー大変だったよー大変だなんかもしてる光の加減かえーこの雪も一体何に生かせばいいんだろうちょっと音下げたからちょっと上げるわ"
        },
        {
          "speechId": 308,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3712140,
          "sourceEndMs": 3715220,
          "text": "こんくらいだったっけ音量"
        },
        {
          "speechId": 309,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3715740,
          "sourceEndMs": 3728660,
          "text": "駄菓子屋に入ります最初めっちゃお会いできて嬉しいですみたいなめっちゃいい人然としてたのになんで急にこのスカスカだってえー"
        },
        {
          "speechId": 310,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3728880,
          "sourceEndMs": 3740900,
          "text": "スカスカやー駄菓子屋さんお菓子がぎゅうぎゅうに敷き詰められてるとこがいいのにさあしかもじゃあラインナップ全部取らない知らんけ全部一緒や重曹を探すか"
        },
        {
          "speechId": 311,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3741420,
          "sourceEndMs": 3749280,
          "text": "えー同食品売ってるえ動画仕上げる大食い何これ何これ"
        },
        {
          "speechId": 312,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3749940,
          "sourceEndMs": 3763520,
          "text": "何かあるわねこれかなじゃこれ漫画か重曹ちょっと声かけてみるかどういう顔それ"
        },
        {
          "speechId": 313,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3763559,
          "sourceEndMs": 3780859,
          "text": "うめきそこのお嬢さん美しい目をしているねよく見てもいいかいあーそんな照れますね美しいねしてるかなはいごめんそんなの見てたらどうしようもないななな"
        },
        {
          "speechId": 314,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3781140,
          "sourceEndMs": 3783140,
          "text": "え"
        },
        {
          "speechId": 315,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3787380,
          "sourceEndMs": 3789500,
          "text": "何"
        },
        {
          "speechId": 316,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3790260,
          "sourceEndMs": 3792680,
          "text": "怖いんですけど"
        },
        {
          "speechId": 317,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3793260,
          "sourceEndMs": 3795680,
          "text": "意味がわからない"
        },
        {
          "speechId": 318,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3798540,
          "sourceEndMs": 3800720,
          "text": "重曹"
        },
        {
          "speechId": 319,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3801480,
          "sourceEndMs": 3805400,
          "text": "重曹売ってるこれ"
        },
        {
          "speechId": 320,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3805500,
          "sourceEndMs": 3807799,
          "text": "あれ"
        },
        {
          "speechId": 321,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3809280,
          "sourceEndMs": 3813079,
          "text": "すいません重曹が欲しいんですけど"
        },
        {
          "speechId": 322,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3813960,
          "sourceEndMs": 3823940,
          "text": "行方不明の猫のポスター黙っちゃうあの子を見つけたら特別なプレゼントをあげるよ"
        },
        {
          "speechId": 323,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3824520,
          "sourceEndMs": 3827960,
          "text": "ひまちゃん探すこともちゃん"
        },
        {
          "speechId": 324,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3828780,
          "sourceEndMs": 3837980,
          "text": "いつちょっと待ってジュースあのん重曹はえどこ重曹ガチで"
        },
        {
          "speechId": 325,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3839400,
          "sourceEndMs": 3846859,
          "text": "これまだたまちゃんを見つけないと重曹もらえない仕組みになってるまさかそういう感じ"
        },
        {
          "speechId": 326,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3848880,
          "sourceEndMs": 3859559,
          "text": "たまちゃん探すかちょっと母ちゃん美味しいお芋がありますよーたまちゃんタイガー"
        },
        {
          "speechId": 327,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3862140,
          "sourceEndMs": 3867599,
          "text": "鍵バルみたいななんかあるのあ"
        },
        {
          "speechId": 328,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3868020,
          "sourceEndMs": 3870260,
          "text": "ある"
        },
        {
          "speechId": 329,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3871700,
          "sourceEndMs": 3877460,
          "text": "何もできないなぁ一体今は何もできない感じ"
        },
        {
          "speechId": 330,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3877740,
          "sourceEndMs": 3880280,
          "text": "あー"
        },
        {
          "speechId": 331,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3880859,
          "sourceEndMs": 3884660,
          "text": "でんこう見せじないか"
        },
        {
          "speechId": 332,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3885839,
          "sourceEndMs": 3898220,
          "text": "店が成り立たなくなったか潰したわデンコ潰しましたターマンちゃんここ入れるかな入れないかたまちゃん"
        },
        {
          "speechId": 333,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3900960,
          "sourceEndMs": 3905119,
          "text": "おばあちゃんが探してるよ玉ちゃん"
        },
        {
          "speechId": 334,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3911220,
          "sourceEndMs": 3914660,
          "text": "これ車の下とかにさ"
        },
        {
          "speechId": 335,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3915000,
          "sourceEndMs": 3918319,
          "text": "イガジですけどね猫ちゃん"
        },
        {
          "speechId": 336,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3921059,
          "sourceEndMs": 3923900,
          "text": "ああ"
        },
        {
          "speechId": 337,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3923940,
          "sourceEndMs": 3932960,
          "text": "用としてますあでこの声さんねこの子じゃねどこだこんなか"
        },
        {
          "speechId": 338,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3933599,
          "sourceEndMs": 3935780,
          "text": "あー"
        },
        {
          "speechId": 339,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3938940,
          "sourceEndMs": 3956059,
          "text": "持ったあなんかいなくなってるなんかゲームのさMODでさあるよねなんか自分の持ってる銃が猫になるみたいなもっとよかったためちゃん元気に生きていた"
        },
        {
          "speechId": 340,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3956099,
          "sourceEndMs": 3967400,
          "text": "猫ミサイル発射ちょっと猿があれどこだっけあ通り過ぎたここだはいたまちゃん連れてきましたよー"
        },
        {
          "speechId": 341,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3969680,
          "sourceEndMs": 3982520,
          "text": "はいこれたまちゃんじゃないですかおばあちゃんこの猫であってますか頑張っちゃうおかえりなさい"
        },
        {
          "speechId": 342,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3983040,
          "sourceEndMs": 3994579,
          "text": "若者よありがとうねではご褒美にこの町この村ほんとにおばあちゃんおじいちゃんおばあちゃん特別に作ったこれを何だ"
        },
        {
          "speechId": 343,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 3995760,
          "sourceEndMs": 4000220,
          "text": "一松人形的な大臣にしてね"
        },
        {
          "speechId": 344,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4000980,
          "sourceEndMs": 4004960,
          "text": "これはなんかあ鍵持ってるなんか"
        },
        {
          "speechId": 345,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4006799,
          "sourceEndMs": 4010420,
          "text": "木箱のおかげ日本人魚"
        },
        {
          "speechId": 346,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4011119,
          "sourceEndMs": 4014079,
          "text": "木箱を開けていいんかな"
        },
        {
          "speechId": 347,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4014900,
          "sourceEndMs": 4019660,
          "text": "あれ木箱の鍵なんかえー"
        },
        {
          "speechId": 348,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4020599,
          "sourceEndMs": 4026680,
          "text": "重曹の保管の仕方動画ちゃん"
        },
        {
          "speechId": 349,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4027079,
          "sourceEndMs": 4037960,
          "text": "外ここはねもう節子に守ってもらうわ懐かしいね昔船長はこの節子供えるか猿に節子"
        },
        {
          "speechId": 350,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4039920,
          "sourceEndMs": 4043720,
          "text": "シナジーあるかこれなさそう"
        },
        {
          "speechId": 351,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4044900,
          "sourceEndMs": 4048460,
          "text": "芋を備える違うか"
        },
        {
          "speechId": 352,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4049220,
          "sourceEndMs": 4052480,
          "text": "不幸を捨てる"
        },
        {
          "speechId": 353,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4054619,
          "sourceEndMs": 4071140,
          "text": "いったーせつこい行ったちょっとあかんあかんがすいません捨てれるとちょっと待っていいこと思わなかったやんああやばいまずいってこれ祟られるどうしよう回収できなくなったまあいいか"
        },
        {
          "speechId": 354,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4071240,
          "sourceEndMs": 4073720,
          "text": "働きます"
        },
        {
          "speechId": 355,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4074119,
          "sourceEndMs": 4081039,
          "text": "あれ掃除用具が操縦具は男用にあるからどうやって取り出すんだ"
        },
        {
          "speechId": 356,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4081680,
          "sourceEndMs": 4084940,
          "text": "今日は素手で掃除するのかな"
        },
        {
          "speechId": 357,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4087319,
          "sourceEndMs": 4089859,
          "text": "掃除用具ないよ"
        },
        {
          "speechId": 358,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4091819,
          "sourceEndMs": 4094359,
          "text": "シミまだある"
        },
        {
          "speechId": 359,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4100100,
          "sourceEndMs": 4105160,
          "text": "流れるようにして私だってしょうがないじゃん"
        },
        {
          "speechId": 360,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4105319,
          "sourceEndMs": 4108640,
          "text": "捨てれると思ってなかったんだもん"
        },
        {
          "speechId": 361,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4108920,
          "sourceEndMs": 4111699,
          "text": "どうすんだこれ"
        },
        {
          "speechId": 362,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4111859,
          "sourceEndMs": 4123580,
          "text": "どうやって掃除するんだろうん何何何何かなんかえなんか燃えてんだけどえっどういうことどういうことどういうこと"
        },
        {
          "speechId": 363,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4123679,
          "sourceEndMs": 4125679,
          "text": "えっ"
        },
        {
          "speechId": 364,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4126560,
          "sourceEndMs": 4128679,
          "text": "燃えてるよ"
        },
        {
          "speechId": 365,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4129080,
          "sourceEndMs": 4132080,
          "text": "どどど"
        },
        {
          "speechId": 366,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4132859,
          "sourceEndMs": 4140500,
          "text": "え何もない何もなさすぎて道具がない道具がトイレとかに"
        },
        {
          "speechId": 367,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4140960,
          "sourceEndMs": 4144339,
          "text": "え道具がないよどうしたらいいの"
        },
        {
          "speechId": 368,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4149299,
          "sourceEndMs": 4152440,
          "text": "ないよね何もね"
        },
        {
          "speechId": 369,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4152719,
          "sourceEndMs": 4155799,
          "text": "あ重曹か"
        },
        {
          "speechId": 370,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4158779,
          "sourceEndMs": 4164679,
          "text": "これ何このさあえーこれ"
        },
        {
          "speechId": 371,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4165259,
          "sourceEndMs": 4180219,
          "text": "霊的なものじゃねえのかよこれ重曹で取れるタイプの汚れだったこれ汚れだったんだこれも重曹でちょっと怖いんだけどあでも終わり掃除"
        },
        {
          "speechId": 372,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4185239,
          "sourceEndMs": 4193239,
          "text": "あれなんか今黄色くなったあっ"
        },
        {
          "speechId": 373,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4194900,
          "sourceEndMs": 4202660,
          "text": "仕事が終わってシャワーを浴びる浴びまーすちょっと焼き芋持ったままシャワータイム突入です"
        },
        {
          "speechId": 374,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4214480,
          "sourceEndMs": 4218440,
          "text": "サウナに入るああ"
        },
        {
          "speechId": 375,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4218540,
          "sourceEndMs": 4232000,
          "text": "ちょっとそこでじっとしてくださいよシミの人シミの人ってサウナ船長全然入ったことないのよこれどういうこと座るはい"
        },
        {
          "speechId": 376,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4232040,
          "sourceEndMs": 4244000,
          "text": "船長サウナ全然入ってことないのなにこれどうすんのなんでなんかゴーって言ってるこれ環境音手桶って何"
        },
        {
          "speechId": 377,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4244159,
          "sourceEndMs": 4246580,
          "text": "ゴーって言ってるよ"
        },
        {
          "speechId": 378,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4248140,
          "sourceEndMs": 4252400,
          "text": "これサウナの環境音"
        },
        {
          "speechId": 379,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4265940,
          "sourceEndMs": 4270580,
          "text": "シミの女びっくりした"
        },
        {
          "speechId": 380,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4270860,
          "sourceEndMs": 4276940,
          "text": "シミの女が今の何この視点猿視点"
        },
        {
          "speechId": 381,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4279260,
          "sourceEndMs": 4281980,
          "text": "猿から見た様子"
        },
        {
          "speechId": 382,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4282620,
          "sourceEndMs": 4284620,
          "text": "うん"
        },
        {
          "speechId": 383,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4287120,
          "sourceEndMs": 4293440,
          "text": "俺千代じゃないの千代なんじゃないの公園公園に向かってった"
        },
        {
          "speechId": 384,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4294140,
          "sourceEndMs": 4302860,
          "text": "マリオマリナマリーママ何だっけマイナを前直し用にお供え物にしようとしている"
        },
        {
          "speechId": 385,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4305739,
          "sourceEndMs": 4309040,
          "text": "4日目"
        },
        {
          "speechId": 386,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4311659,
          "sourceEndMs": 4318520,
          "text": "人形捨てたのがバレた人形くれたのは梅村だから"
        },
        {
          "speechId": 387,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4318980,
          "sourceEndMs": 4323560,
          "text": "行けますかキーン"
        },
        {
          "speechId": 388,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4326840,
          "sourceEndMs": 4328840,
          "text": "うん"
        },
        {
          "speechId": 389,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4329540,
          "sourceEndMs": 4333400,
          "text": "うめきうめきだったか"
        },
        {
          "speechId": 390,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4333800,
          "sourceEndMs": 4342460,
          "text": "今日は雨かあいにくのお天気ですねトイレチラーミーして"
        },
        {
          "speechId": 391,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4343820,
          "sourceEndMs": 4346780,
          "text": "ちょっとカクカクするよいしょ"
        },
        {
          "speechId": 392,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4348739,
          "sourceEndMs": 4359980,
          "text": "雨好きじゃないんだよね船長傘ねえのらすぐそこだからもうこの程度のね小雨ならねあるもうすぐだし多少の雨はね"
        },
        {
          "speechId": 393,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4361040,
          "sourceEndMs": 4363640,
          "text": "あいる"
        },
        {
          "speechId": 394,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4364400,
          "sourceEndMs": 4371140,
          "text": "あれこれチオだよねちげえ待つのだ誰"
        },
        {
          "speechId": 395,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4371719,
          "sourceEndMs": 4384340,
          "text": "泣いてる松野これがあの子とぬ写真シクシ写真の女の子は誰ですかこの子は近所の声やこの子"
        },
        {
          "speechId": 396,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4384980,
          "sourceEndMs": 4387280,
          "text": "何"
        },
        {
          "speechId": 397,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4387440,
          "sourceEndMs": 4390280,
          "text": "この子何を"
        },
        {
          "speechId": 398,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4390380,
          "sourceEndMs": 4393280,
          "text": "するどい目つき"
        },
        {
          "speechId": 399,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4393860,
          "sourceEndMs": 4397840,
          "text": "松野なんだよよくわかんないそれじゃあ"
        },
        {
          "speechId": 400,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4398420,
          "sourceEndMs": 4407920,
          "text": "まあいいかあお猿無くなってるお猿いなくなってるわね"
        },
        {
          "speechId": 401,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4415159,
          "sourceEndMs": 4420640,
          "text": "ただ人形もなくなってるなぁオープンしてる"
        },
        {
          "speechId": 402,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4422300,
          "sourceEndMs": 4428679,
          "text": "待っとりま働きますか一旦ね節子なくなってたなぁ"
        },
        {
          "speechId": 403,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4429500,
          "sourceEndMs": 4453760,
          "text": "どうせタオルいる読みで取っとくわタオルいる読みはいはいはいはいはいボディソープとシャンプーお願いしますミチおいめちゃめちゃ若い女です珍しいこの世界にも若い女っていたんだなボディソープとシャンプーみんなコンディショナーしないの髪の毛ギシギシになってしまうよはいこれもあって"
        },
        {
          "speechId": 404,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4454640,
          "sourceEndMs": 4477040,
          "text": "髪のお手入れしてるあ子連れじゃーんちょっと何年生の男の子なのねえいいな入っても女湯にまだ入っていいやつリンスインシャンプリリースインシャンプーなんて全然潤わないよ"
        },
        {
          "speechId": 405,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4477739,
          "sourceEndMs": 4491320,
          "text": "君味神のことちゃんと思ってるケアしてますかんああ男の子の裸で逃げ出したちょっとちょっとちょっと"
        },
        {
          "speechId": 406,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4491360,
          "sourceEndMs": 4498400,
          "text": "道さーんお母さんちょっと子供が裸で逃げ出しちゃいましたけど"
        },
        {
          "speechId": 407,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4500719,
          "sourceEndMs": 4507340,
          "text": "顔よ呼ぼうすいませんお母さんが抱いて"
        },
        {
          "speechId": 408,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4508159,
          "sourceEndMs": 4510699,
          "text": "ます無視"
        },
        {
          "speechId": 409,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4511219,
          "sourceEndMs": 4520420,
          "text": "男湯が良かったんだよねわかるよ女湯は嫌だったんだね手が痛い勝つたろう"
        },
        {
          "speechId": 410,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4531400,
          "sourceEndMs": 4534760,
          "text": "大丈夫だって"
        },
        {
          "speechId": 411,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4536540,
          "sourceEndMs": 4540520,
          "text": "すいませんお宅のかっちゃん血出てます"
        },
        {
          "speechId": 412,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4541280,
          "sourceEndMs": 4554140,
          "text": "お母さんどこ行ったのサウナだらどうせ分かってんだからほっシミがなくなってるこないだ権限したからかん"
        },
        {
          "speechId": 413,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4556219,
          "sourceEndMs": 4561520,
          "text": "あれお母さんあっ"
        },
        {
          "speechId": 414,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4562659,
          "sourceEndMs": 4567980,
          "text": "なんで黒に救急箱はマリアカッチャー"
        },
        {
          "speechId": 415,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4569360,
          "sourceEndMs": 4582880,
          "text": "泣かないで男の子でしょ泣くんじゃないあ救急箱でほら手が痛いお母さんあ休憩はご飯持ってきたからお母さんがお母さんじゃないわ勝手に母の気分になった"
        },
        {
          "speechId": 416,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4585080,
          "sourceEndMs": 4601060,
          "text": "まだ痛いまだ痛いのもう大丈夫あーお母さん女の人が扇風機に僕だっておい勝ち太郎どうなってんだあいつ"
        },
        {
          "speechId": 417,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4601100,
          "sourceEndMs": 4623679,
          "text": "うん当たり屋がそういう商売してるのがこの2人で組んであんたうちの子に何してくれてんのよ私の可愛い息子に怪我させるなんて見たとこないわ二度と来るなカス太郎も来んなよ森のと次来たら腕を扇風機に突っ込むぞガキが"
        },
        {
          "speechId": 418,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4626179,
          "sourceEndMs": 4633520,
          "text": "有料な100個の間に有料な客癒し癒しもドムあ終わりか"
        },
        {
          "speechId": 419,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4637280,
          "sourceEndMs": 4643540,
          "text": "トイレはいどうしよう誰か入ってますがふうたん"
        },
        {
          "speechId": 420,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4643699,
          "sourceEndMs": 4653380,
          "text": "いいところにふうた誰だっけ来てくれて助かったトイレットペーパーがなくなったんだ持ってきてくれないか"
        },
        {
          "speechId": 421,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4655460,
          "sourceEndMs": 4659860,
          "text": "男性の方ですよねなぜ女性側に"
        },
        {
          "speechId": 422,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4661219,
          "sourceEndMs": 4665440,
          "text": "間違えたんだ急いでだから"
        },
        {
          "speechId": 423,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4665780,
          "sourceEndMs": 4678219,
          "text": "トイレットペーパー持ってきてくれないかそのくらいはやぶさかではないか持ってきてやるかそれとペーパー"
        },
        {
          "speechId": 424,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4678380,
          "sourceEndMs": 4682540,
          "text": "どこにあるんだ冷静にどこにあるんだ"
        },
        {
          "speechId": 425,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4687140,
          "sourceEndMs": 4693640,
          "text": "どこにあるんだ教育のペーパーここか"
        },
        {
          "speechId": 426,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4700880,
          "sourceEndMs": 4707080,
          "text": "入ってんのかえっ男のトイレ入ってる"
        },
        {
          "speechId": 427,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4711920,
          "sourceEndMs": 4716980,
          "text": "えどこにあんのこれえっ見落としたか"
        },
        {
          "speechId": 428,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4722300,
          "sourceEndMs": 4725020,
          "text": "トイレットペーパーなんて"
        },
        {
          "speechId": 429,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4725060,
          "sourceEndMs": 4727659,
          "text": "なくない"
        },
        {
          "speechId": 430,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4728960,
          "sourceEndMs": 4730960,
          "text": "え"
        },
        {
          "speechId": 431,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4731659,
          "sourceEndMs": 4734920,
          "text": "ないない"
        },
        {
          "speechId": 432,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4735020,
          "sourceEndMs": 4739179,
          "text": "あちょっと普段ないです"
        },
        {
          "speechId": 433,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4741320,
          "sourceEndMs": 4745239,
          "text": "ちょっとないかなり無いより"
        },
        {
          "speechId": 434,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4745940,
          "sourceEndMs": 4749080,
          "text": "無いよりですねこれは"
        },
        {
          "speechId": 435,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4750020,
          "sourceEndMs": 4752620,
          "text": "でもっかい"
        },
        {
          "speechId": 436,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4756219,
          "sourceEndMs": 4759580,
          "text": "やなくね"
        },
        {
          "speechId": 437,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4759679,
          "sourceEndMs": 4767920,
          "text": "これいつかでっけえトイレットペーパーかと思いましたらは"
        },
        {
          "speechId": 438,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4768920,
          "sourceEndMs": 4776320,
          "text": "ああーだったったマリロール"
        },
        {
          "speechId": 439,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4776960,
          "sourceEndMs": 4779920,
          "text": "アイマリーロールです"
        },
        {
          "speechId": 440,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4782840,
          "sourceEndMs": 4793120,
          "text": "君は命の恩人だあもう完走している風呂で洗えばこれこれあー"
        },
        {
          "speechId": 441,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4799239,
          "sourceEndMs": 4803020,
          "text": "ちょっとおじさん"
        },
        {
          "speechId": 442,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4803600,
          "sourceEndMs": 4806440,
          "text": "あんたねぇ"
        },
        {
          "speechId": 443,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4806719,
          "sourceEndMs": 4813520,
          "text": "どうかと思いますけど通報しますよあんた掃除をするはい"
        },
        {
          "speechId": 444,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4819380,
          "sourceEndMs": 4824020,
          "text": "これは排水今日は排水効果"
        },
        {
          "speechId": 445,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4826460,
          "sourceEndMs": 4830380,
          "text": "排水溝に向ければいいのかな違うのか"
        },
        {
          "speechId": 446,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4831679,
          "sourceEndMs": 4844960,
          "text": "どういうことなんか出てるんだって排水後全部やれよやるならしマリーロールで拭かれちゃった"
        },
        {
          "speechId": 447,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4846679,
          "sourceEndMs": 4849340,
          "text": "何もないか"
        },
        {
          "speechId": 448,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4849380,
          "sourceEndMs": 4851560,
          "text": "ん"
        },
        {
          "speechId": 449,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4854780,
          "sourceEndMs": 4857800,
          "text": "よOKか"
        },
        {
          "speechId": 450,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4858520,
          "sourceEndMs": 4867159,
          "text": "まあいいですよマリロールで船長も出そうかなトイレットペーパーとコラボして"
        },
        {
          "speechId": 451,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4870560,
          "sourceEndMs": 4873100,
          "text": "あったあった"
        },
        {
          "speechId": 452,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4873980,
          "sourceEndMs": 4883960,
          "text": "掃除した方がいいところのアピールすごいな燃えてんだよなぁ火が出てる"
        },
        {
          "speechId": 453,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4884719,
          "sourceEndMs": 4909640,
          "text": "えいえいえいえいえいえいえいあー仕事完了ですさあシャワー浴びますかまぁね音量もね来ないで権限してねうんもう壁のシミもなくなってたんでまあ大丈夫でしょうということではいシャワー浴びていきたいと思いますよしお湯と水をバランスよくひねりましてシャワシャワシャワー"
        },
        {
          "speechId": 454,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4910100,
          "sourceEndMs": 4912699,
          "text": "いる"
        },
        {
          "speechId": 455,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4915520,
          "sourceEndMs": 4931239,
          "text": "なんか声やばいやばいよおばけ衛生前始まってるって何何何ここさっきお化け行った感じしましたけど覗く赤これほのぐらい水の底からみたいなことになる"
        },
        {
          "speechId": 456,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4947060,
          "sourceEndMs": 4955659,
          "text": "待ってどうすんのえ逃げる感じ逃げる感じ逃げる感じになってる逃げる感じになってる逃げまーす逃げます"
        },
        {
          "speechId": 457,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4960860,
          "sourceEndMs": 4967300,
          "text": "謝れよハゲにようえちょっと待ってどういうことどこに逃げればいいの逃げろ"
        },
        {
          "speechId": 458,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4972400,
          "sourceEndMs": 4980739,
          "text": "ここも毛が多くてなんだなんだどうすればいいだ"
        },
        {
          "speechId": 459,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 4982760,
          "sourceEndMs": 4990159,
          "text": "どうすればいいだおいちょっと掃除掃除用が掃除用が武器武器"
        },
        {
          "speechId": 460,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5010020,
          "sourceEndMs": 5013739,
          "text": "私死んだの"
        },
        {
          "speechId": 461,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5018760,
          "sourceEndMs": 5025500,
          "text": "行方不明になっちゃったえっこれどうなるの"
        },
        {
          "speechId": 462,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5027760,
          "sourceEndMs": 5033780,
          "text": "話続いてる続いてるよお姉ちゃんが連絡してくれない"
        },
        {
          "speechId": 463,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5033940,
          "sourceEndMs": 5058620,
          "text": "会社を辞めて田舎に行くって言ってあ妹かマイなの前なの妹田舎に引っ越して少し経ってから連絡が取れない翌連絡し合っていたのに忙しいのかもでもちょっと心配だから少し先の田舎に行ってみようお姉ちゃんの家に泊まって話でもしよう"
        },
        {
          "speechId": 464,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5059199,
          "sourceEndMs": 5061199,
          "text": "え"
        },
        {
          "speechId": 465,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5061900,
          "sourceEndMs": 5073380,
          "text": "っエレナになった今の負けイベであってますうわなんだ首の角度真帆寝れない"
        },
        {
          "speechId": 466,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5074020,
          "sourceEndMs": 5100860,
          "text": "ここで合ってるのなんかここ不気味じゃないねぇ帰った方がいいんじゃないでもこんなところにお姉さんがいるなら確かに心配だよねお姉さんきっと大丈夫だよエレナもし何かあったら電話してねわかったありがとうまほ気をつけてねじゃ行くね赤い車だ"
        },
        {
          "speechId": 467,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5102280,
          "sourceEndMs": 5105360,
          "text": "首が座ってなかったな"
        },
        {
          "speechId": 468,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5110860,
          "sourceEndMs": 5114600,
          "text": "じゃお姉ちゃんの部屋を見に行かなきゃ"
        },
        {
          "speechId": 469,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5115900,
          "sourceEndMs": 5119340,
          "text": "エレナ行きます"
        },
        {
          "speechId": 470,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5121300,
          "sourceEndMs": 5129120,
          "text": "お姉ちゃんの車何だこれ私のかもカバン置いてくだ持っとけ"
        },
        {
          "speechId": 471,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5129940,
          "sourceEndMs": 5134159,
          "text": "お姉ちゃんブラとパンツ干したままなのかな"
        },
        {
          "speechId": 472,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5135760,
          "sourceEndMs": 5139140,
          "text": "ドア開いてんのかなお姉ちゃん"
        },
        {
          "speechId": 473,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5141300,
          "sourceEndMs": 5194760,
          "text": "大家さんかああマイナさんの妹じゃないかようこそようこそお姉さんが銭湯で働いてたのは知ってる出ますよお姉さん想像以上に働いてくれてねでもお姉さんは今ふっ隠蔽してるお友達と旅行中お友達化け物じゃねえかよ旅行って言わねえんだよ1週間以内に帰ってくるこのや銭湯にさあおとないしてんだろこれ若い娘のマリンをさあお姉さん待つここに泊まらせてあげるよあでも部屋にお風呂備えるエレナも備えられるってだから俺んとこの銭湯使ったらいいよそうだなお姉さんを待っている間"
        },
        {
          "speechId": 474,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5195400,
          "sourceEndMs": 5206040,
          "text": "銭湯で働かないムラぐるみの生贄そういうことなんだそれがいいよ銭湯で働くのは家賃にしてあげるよ"
        },
        {
          "speechId": 475,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5206139,
          "sourceEndMs": 5236040,
          "text": "赤エレナ乗るな戻れ罠だこれはそうさせてもらいますよかったなら今日から始めましょうか銭湯の仕事はそんなに難しくないから心配しなくてもいいよ荷物を置いたら戦闘で働いてねいやーこのじじい倒すぞエレナ勇気を持って入れませんどうやって入るんですかこれ"
        },
        {
          "speechId": 476,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5236380,
          "sourceEndMs": 5245219,
          "text": "ここだよねちょ入れないんだけど爺入れないじじい入れないんですけど"
        },
        {
          "speechId": 477,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5245260,
          "sourceEndMs": 5248219,
          "text": "あれ部屋違う"
        },
        {
          "speechId": 478,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5248380,
          "sourceEndMs": 5252540,
          "text": "隣の部屋だったわ隣の部屋でした"
        },
        {
          "speechId": 479,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5254860,
          "sourceEndMs": 5259080,
          "text": "あそこの部屋か布団が"
        },
        {
          "speechId": 480,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5259300,
          "sourceEndMs": 5275880,
          "text": "布団の色が違う青色だエレナは青が好きなのかなだいたいね姉妹ってね片方がピンク好きだと片方は青が好きになるようにバランス取るように生きてる生き物なのうちも船長がピンクが好きでお姉ちゃんが水色が好きだった"
        },
        {
          "speechId": 481,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5277420,
          "sourceEndMs": 5279960,
          "text": "しゃー"
        },
        {
          "speechId": 482,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5280060,
          "sourceEndMs": 5286380,
          "text": "行っちゃったりますかやっぱ節子を捨てたのはプレミだったのかもしれない"
        },
        {
          "speechId": 483,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5288040,
          "sourceEndMs": 5297239,
          "text": "働くわこの悪しき風習からエレナは姉を救うわ"
        },
        {
          "speechId": 484,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5299080,
          "sourceEndMs": 5310139,
          "text": "働くんこれなんだ洗ってないタオルあ洗濯するのかなお客様あ急に急に"
        },
        {
          "speechId": 485,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5311020,
          "sourceEndMs": 5318360,
          "text": "洗ってないタオル捨てる捨てるなぁこの洗ってないタオルどうすんの"
        },
        {
          "speechId": 486,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5319060,
          "sourceEndMs": 5329219,
          "text": "間違えて洗ってないタオル渡しちゃったらどうしようお客さんにあーこれ犯罪者タオルね"
        },
        {
          "speechId": 487,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5329380,
          "sourceEndMs": 5333659,
          "text": "洗ってないタオル渡したろ私わ"
        },
        {
          "speechId": 488,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5333940,
          "sourceEndMs": 5336600,
          "text": "はいどうぞ"
        },
        {
          "speechId": 489,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5337000,
          "sourceEndMs": 5339179,
          "text": "ん"
        },
        {
          "speechId": 490,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5340179,
          "sourceEndMs": 5342540,
          "text": "怪しいわね"
        },
        {
          "speechId": 491,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5343060,
          "sourceEndMs": 5351480,
          "text": "あいつ風丸火山風間ルーンマルヒサみたいな名前のやつじゃないの"
        },
        {
          "speechId": 492,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5353860,
          "sourceEndMs": 5357360,
          "text": "静かだな誰も来ないし"
        },
        {
          "speechId": 493,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5357940,
          "sourceEndMs": 5370380,
          "text": "タオル入浴料やば皆タオルだけなんだねちゃんと体洗ってんの石鹸ですさ初めてじゃないちょっとこのおばちゃん"
        },
        {
          "speechId": 494,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5370420,
          "sourceEndMs": 5388800,
          "text": "ほっ何だ若いプリプリの若い女あれ前のあたしこんなプリプリの若い女だったんマイナーお姉ちゃんおっぱいがプルプルやふふふお姉ちゃん帰ってきたの"
        },
        {
          "speechId": 495,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5390699,
          "sourceEndMs": 5393360,
          "text": "お姉ちゃん"
        },
        {
          "speechId": 496,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5393460,
          "sourceEndMs": 5421500,
          "text": "お姉ちゃんお姉ちゃん待ってよーお姉ちゃんの裸体お姉ちゃんそのポーズは一体俺じゃ何そのそのポーズお姉ちゃんちょっとあれ危ない危ないタオルがギリギリな感じになってるってお姉ちゃんさんサナミあれ違う人は何これ"
        },
        {
          "speechId": 497,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5421659,
          "sourceEndMs": 5440280,
          "text": "冷たいんですけど水風呂じゃないよねお姉ちゃん何私あなたのお姉ちゃんじゃないわあなたのお姉ちゃんなんか知るわけないわそんなことよりお風呂が冷たいの信じられないこんなのにお金払えないわ"
        },
        {
          "speechId": 498,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5440380,
          "sourceEndMs": 5450239,
          "text": "無邪気ありません確認してきますはい早く直してサウナ室で待ってるわ八味にしておくからよ待ってろなんか"
        },
        {
          "speechId": 499,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5451179,
          "sourceEndMs": 5455040,
          "text": "あー待つの"
        },
        {
          "speechId": 500,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5455080,
          "sourceEndMs": 5492239,
          "text": "時間がないよあんたさんはこんなところにいたらダメ待つの何なの教えてよ待つの待つの待って待つのは待つの待たないって意味サウナ室の温度はあげなきゃいけないわけですけどこれタバコだどうやってあげるのってさぁ温度投げ方なんか話じゃない水の温度だ水の温度の上げ方なんて知らないよこんなところにいたらダメって言われてもなぁ"
        },
        {
          "speechId": 501,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5492340,
          "sourceEndMs": 5512280,
          "text": "お風呂の温度の上げ方なんて知らない働いたことないもんお風呂屋さんでどうやるのねわかんないボイラッシュあこれここじゃないあれ違うの"
        },
        {
          "speechId": 502,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5513219,
          "sourceEndMs": 5520440,
          "text": "お風呂の温度ってどうやってあげるのここじゃないのここじゃないのか"
        },
        {
          "speechId": 503,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5530920,
          "sourceEndMs": 5546000,
          "text": "これトイレだもんねこれこっからさこっち違うえーなんかなんだこれん"
        },
        {
          "speechId": 504,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5546520,
          "sourceEndMs": 5553860,
          "text": "何このマークえっどういうこと何のマーク出てんのこれ"
        },
        {
          "speechId": 505,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5564760,
          "sourceEndMs": 5567360,
          "text": "ボイラー室"
        },
        {
          "speechId": 506,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5569739,
          "sourceEndMs": 5574620,
          "text": "怒ってんのねーちょっと待って今なんとかするから"
        },
        {
          "speechId": 507,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5575920,
          "sourceEndMs": 5584100,
          "text": "どっかでなんか笑ってる微笑んでるよどっかやろうかわかんでも教えてよ"
        },
        {
          "speechId": 508,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5585760,
          "sourceEndMs": 5595860,
          "text": "タオル燃やす中あタオルを燃やして温度を上げるなるほどねそんなきゃやるかハウロを増やしてあげる"
        },
        {
          "speechId": 509,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5596860,
          "sourceEndMs": 5599699,
          "text": "VS"
        },
        {
          "speechId": 510,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5606400,
          "sourceEndMs": 5609060,
          "text": "男湯の方"
        },
        {
          "speechId": 511,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5611380,
          "sourceEndMs": 5619199,
          "text": "キョロロえそうしようが関係ないよねーこれはトイレだよね"
        },
        {
          "speechId": 512,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5619239,
          "sourceEndMs": 5622920,
          "text": "なんかメタリックなトイレだなぁ"
        },
        {
          "speechId": 513,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5623199,
          "sourceEndMs": 5636179,
          "text": "この全体のさボイラストなんかそうあここそうじゃないあここだボイラスト特有にあるんだ"
        },
        {
          "speechId": 514,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5636460,
          "sourceEndMs": 5639900,
          "text": "男湯側だったんかなるほどね"
        },
        {
          "speechId": 515,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5640540,
          "sourceEndMs": 5654840,
          "text": "キョロキョロ何これ洗濯機あっ蓋はロックされてる水を抜くと開くみたいだでも排水ホースがないなるほどそういう感じね"
        },
        {
          "speechId": 516,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5655239,
          "sourceEndMs": 5682260,
          "text": "あれで洗ってないタオルを選択すると木巻き巻きナンバーうーん足りないもっと怪我必要なのえーなんか古風ですね木なんだ鍵がかかってる立ち入り禁止立ち入りじゃこれ怪しいなあこの木はダメなこれ使えるんじゃないの"
        },
        {
          "speechId": 517,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5682900,
          "sourceEndMs": 5688020,
          "text": "この木使えよえなんなんこれでいいじゃん"
        },
        {
          "speechId": 518,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5695980,
          "sourceEndMs": 5700380,
          "text": "えタオルを燃やすえ"
        },
        {
          "speechId": 519,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5701139,
          "sourceEndMs": 5703980,
          "text": "タオルを燃やす"
        },
        {
          "speechId": 520,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5706179,
          "sourceEndMs": 5718380,
          "text": "洗うんだと思うけどなぁだって洗濯機があるんだよこれは洗うものだと思うけどね船長はほら違うよ洗うものでしたやはり"
        },
        {
          "speechId": 521,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5720100,
          "sourceEndMs": 5722100,
          "text": "表"
        },
        {
          "speechId": 522,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5725560,
          "sourceEndMs": 5731880,
          "text": "えーちょっとじゃあ環境破壊へ行きますか一発"
        },
        {
          "speechId": 523,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5732820,
          "sourceEndMs": 5736739,
          "text": "あ予備の薪とかさ置いてあるんじゃないの"
        },
        {
          "speechId": 524,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5738699,
          "sourceEndMs": 5741540,
          "text": "ゴミ捨て場とかにん"
        },
        {
          "speechId": 525,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5742060,
          "sourceEndMs": 5745420,
          "text": "絶景カラスでっけえ"
        },
        {
          "speechId": 526,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5746440,
          "sourceEndMs": 5751199,
          "text": "デカくねえか何このカラス何を求めてるの"
        },
        {
          "speechId": 527,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5752500,
          "sourceEndMs": 5757560,
          "text": "ゴミ捨てはなんかないかななんかないか薪とか捨ててないかな"
        },
        {
          "speechId": 528,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5758020,
          "sourceEndMs": 5761219,
          "text": "負けを探してますすいません"
        },
        {
          "speechId": 529,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5762820,
          "sourceEndMs": 5765300,
          "text": "負けないですか"
        },
        {
          "speechId": 530,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5765940,
          "sourceEndMs": 5778560,
          "text": "若い女入れるかあなんか文句言ってる女いたから燃やすかあいつあの女燃やすかやっぱでも公園か"
        },
        {
          "speechId": 531,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5779860,
          "sourceEndMs": 5785639,
          "text": "でも街なんて落ちてないよねー木こりから始めないといけないぜ"
        },
        {
          "speechId": 532,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5788560,
          "sourceEndMs": 5791340,
          "text": "どこよ"
        },
        {
          "speechId": 533,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5792400,
          "sourceEndMs": 5800280,
          "text": "どこですのよこんな離れる店開けてこんな離れていくことある"
        },
        {
          "speechId": 534,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5802480,
          "sourceEndMs": 5806880,
          "text": "薪を探してます巻お姉ちゃんの車"
        },
        {
          "speechId": 535,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5807580,
          "sourceEndMs": 5810060,
          "text": "トイレに巻き"
        },
        {
          "speechId": 536,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5813040,
          "sourceEndMs": 5819960,
          "text": "どうすんのよ燃やせるものがないなぁガチ目に"
        },
        {
          "speechId": 537,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5826659,
          "sourceEndMs": 5830219,
          "text": "燃やせるものなくないですか"
        },
        {
          "speechId": 538,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5831100,
          "sourceEndMs": 5842639,
          "text": "ガチで猿も野菜かわいそうでしょいやでもワンチャン供養になるのか"
        },
        {
          "speechId": 539,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5845139,
          "sourceEndMs": 5848639,
          "text": "ゴミ捨て場の辛さある何だろうなぁ"
        },
        {
          "speechId": 540,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5849340,
          "sourceEndMs": 5856320,
          "text": "こいつの意味深だなぁ何か開かないしね取れないよね"
        },
        {
          "speechId": 541,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5863380,
          "sourceEndMs": 5865500,
          "text": "電話"
        },
        {
          "speechId": 542,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5868780,
          "sourceEndMs": 5870900,
          "text": "えー"
        },
        {
          "speechId": 543,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5873820,
          "sourceEndMs": 5879000,
          "text": "焼き芋さえあれば焼き芋さえあれば勝つのに"
        },
        {
          "speechId": 544,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5879639,
          "sourceEndMs": 5884699,
          "text": "なんか鍵がギターが"
        },
        {
          "speechId": 545,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5889300,
          "sourceEndMs": 5893280,
          "text": "なんかあんのかちょっと待ってわかんねぇ"
        },
        {
          "speechId": 546,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5895659,
          "sourceEndMs": 5897960,
          "text": "むずい"
        },
        {
          "speechId": 547,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5899980,
          "sourceEndMs": 5903360,
          "text": "トイレ何もなかったよね"
        },
        {
          "speechId": 548,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5903400,
          "sourceEndMs": 5905520,
          "text": "巻"
        },
        {
          "speechId": 549,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5906460,
          "sourceEndMs": 5909719,
          "text": "トイレットペーパーを燃やす"
        },
        {
          "speechId": 550,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5911880,
          "sourceEndMs": 5915719,
          "text": "何を燃やすだ"
        },
        {
          "speechId": 551,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5917020,
          "sourceEndMs": 5924840,
          "text": "ボイライスもっかい見てみるか何か何か見落としがあるのかも"
        },
        {
          "speechId": 552,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5928719,
          "sourceEndMs": 5933239,
          "text": "排水ホースでしょ配送方式でもないし"
        },
        {
          "speechId": 553,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5934300,
          "sourceEndMs": 5939600,
          "text": "ここも開かないよね別に開かなくて"
        },
        {
          "speechId": 554,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5940659,
          "sourceEndMs": 5943320,
          "text": "髪の毛を燃やす"
        },
        {
          "speechId": 555,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5943780,
          "sourceEndMs": 5949440,
          "text": "この木入れろよいけるだろう"
        },
        {
          "speechId": 556,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5952080,
          "sourceEndMs": 5958800,
          "text": "何を入れれば3つもあるもんね"
        },
        {
          "speechId": 557,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5961900,
          "sourceEndMs": 5964800,
          "text": "なんだ"
        },
        {
          "speechId": 558,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5966040,
          "sourceEndMs": 5968580,
          "text": "なんだ"
        },
        {
          "speechId": 559,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5968980,
          "sourceEndMs": 5971699,
          "text": "出るか1回"
        },
        {
          "speechId": 560,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5977260,
          "sourceEndMs": 5982500,
          "text": "せめてどっか開けばなーどっか開けることができれば"
        },
        {
          "speechId": 561,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5985060,
          "sourceEndMs": 5987900,
          "text": "サウナのこの"
        },
        {
          "speechId": 562,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 5989500,
          "sourceEndMs": 6000739,
          "text": "机とか壊せないとあるもの破壊してさっきの子供ガツ太郎燃やすだカス太郎もやして"
        },
        {
          "speechId": 563,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6001260,
          "sourceEndMs": 6008120,
          "text": "えーなんだろうタオル燃やそうやタオル"
        },
        {
          "speechId": 564,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6008219,
          "sourceEndMs": 6017480,
          "text": "タオルの洗濯薪を持ってきて入れる薪がないんで"
        },
        {
          "speechId": 565,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6019139,
          "sourceEndMs": 6028940,
          "text": "電子燃やすか今まで2個チンチラ燃やすぞ今まで憎かった相手全員燃やそう"
        },
        {
          "speechId": 566,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6032100,
          "sourceEndMs": 6043880,
          "text": "ここなんだろうねこのねなんかねなんかできそうなオーラを放っているこの5円カラスでもなんもなかったしなあ"
        },
        {
          "speechId": 567,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6048060,
          "sourceEndMs": 6051380,
          "text": "この5円でカラス"
        },
        {
          "speechId": 568,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6053520,
          "sourceEndMs": 6057380,
          "text": "カラスごめん玉"
        },
        {
          "speechId": 569,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6060500,
          "sourceEndMs": 6063920,
          "text": "もう1回見るぞ"
        },
        {
          "speechId": 570,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6065040,
          "sourceEndMs": 6069620,
          "text": "懐かしのここもうやってないのか"
        },
        {
          "speechId": 571,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6069780,
          "sourceEndMs": 6073040,
          "text": "まだ開く開くけど"
        },
        {
          "speechId": 572,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6077159,
          "sourceEndMs": 6081199,
          "text": "電話電話するえ"
        },
        {
          "speechId": 573,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6081360,
          "sourceEndMs": 6087080,
          "text": "電話するんか5円じゃ無理か5円じゃ無理か"
        },
        {
          "speechId": 574,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6088440,
          "sourceEndMs": 6091820,
          "text": "これタウンページみたいなやつ"
        },
        {
          "speechId": 575,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6093239,
          "sourceEndMs": 6102139,
          "text": "えー待って他に行けるところちょっと探すわ今からこうゴミ袋取れないよね"
        },
        {
          "speechId": 576,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6102719,
          "sourceEndMs": 6110239,
          "text": "なんかなんかあるかあでも何も何もできない"
        },
        {
          "speechId": 577,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6113280,
          "sourceEndMs": 6119179,
          "text": "燃やすものがなさすぎてこ-こここ何もないよねなんもない"
        },
        {
          "speechId": 578,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6120420,
          "sourceEndMs": 6126020,
          "text": "えっさすが姉妹リアクションが一緒だ"
        },
        {
          "speechId": 579,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6128040,
          "sourceEndMs": 6133580,
          "text": "公園も特に何もないかしら"
        },
        {
          "speechId": 580,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6136199,
          "sourceEndMs": 6138619,
          "text": "駄菓子屋は"
        },
        {
          "speechId": 581,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6139380,
          "sourceEndMs": 6155600,
          "text": "猫拾ってきたんだからなんか歌詞燃やそうやもう焼き菓子作るぞあ待ってここへきゃん見落としてましたこんなとこ今まで気づかんかった1回も来てないんじゃないここ"
        },
        {
          "speechId": 582,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6158699,
          "sourceEndMs": 6166400,
          "text": "なったわなんかこんな道場所がここに怖いんじゃないのお賽銭はします"
        },
        {
          "speechId": 583,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6169980,
          "sourceEndMs": 6178580,
          "text": "おみくじを引きます大吉来い大吉来い何吉ですかこれ"
        },
        {
          "speechId": 584,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6179699,
          "sourceEndMs": 6197780,
          "text": "新聞の切れ端A燃やすかこれさすがに新聞の切れ端じゃちょっと威力足りないか何これここにある薪好きなだけ持って行ってください火事神主神降臨です"
        },
        {
          "speechId": 585,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6199080,
          "sourceEndMs": 6203840,
          "text": "求めてたちょっとついでに探索するわ"
        },
        {
          "speechId": 586,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6205560,
          "sourceEndMs": 6210440,
          "text": "来そうで開かないわね裏側回ってみますか"
        },
        {
          "speechId": 587,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6214260,
          "sourceEndMs": 6221119,
          "text": "何もないかな一応ね一応探索しますよマリオは"
        },
        {
          "speechId": 588,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6223739,
          "sourceEndMs": 6226280,
          "text": "何もないか"
        },
        {
          "speechId": 589,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6228600,
          "sourceEndMs": 6235639,
          "text": "ここは何もないかこれは金だ"
        },
        {
          "speechId": 590,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6238860,
          "sourceEndMs": 6240980,
          "text": "ちは"
        },
        {
          "speechId": 591,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6242100,
          "sourceEndMs": 6244880,
          "text": "立ち入り禁止になってる"
        },
        {
          "speechId": 592,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6245760,
          "sourceEndMs": 6253159,
          "text": "ジメジメしてるなぁなんか他にはあるんじゃないのねゴミ捨て場の鍵とかさ"
        },
        {
          "speechId": 593,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6257219,
          "sourceEndMs": 6262040,
          "text": "なんもないかうんうん"
        },
        {
          "speechId": 594,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6262739,
          "sourceEndMs": 6270800,
          "text": "むむむむむ一旦負け燃やすかこれ"
        },
        {
          "speechId": 595,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6272100,
          "sourceEndMs": 6278360,
          "text": "あどっちだっけ家どっちだこれ家じゃない銭湯どっちだこれ"
        },
        {
          "speechId": 596,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6286980,
          "sourceEndMs": 6290840,
          "text": "あれどっちだけせんとちょっとこっちか"
        },
        {
          "speechId": 597,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6292440,
          "sourceEndMs": 6305900,
          "text": "ボイラストこちら洋服めっちゃ迷ったこれようやく行けるぞこれでトイレや間違えましたこっちですねガチャリ"
        },
        {
          "speechId": 598,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6308699,
          "sourceEndMs": 6325639,
          "text": "ブレスに入るあーやばいあの女がサウナで茹で上がっちゃうってさあいきますよはいずんずんずんはい巻き戻したいこれで大丈夫なはず彼女に伝えに行かなきゃ"
        },
        {
          "speechId": 599,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6326100,
          "sourceEndMs": 6332179,
          "text": "めっちゃ迷ったマジであんなとこに道があるとは"
        },
        {
          "speechId": 600,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6332580,
          "sourceEndMs": 6338060,
          "text": "あの茹で上がってるなまあいいか"
        },
        {
          "speechId": 601,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6339199,
          "sourceEndMs": 6363560,
          "text": "あの女が茹で上がってたらあの女をお供え物にぴったりな女にするわせー私しました服着てるどうしたえっお姉ちゃん探してたよマイナお姉ちゃん待ってお姉ちゃん"
        },
        {
          "speechId": 602,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6366840,
          "sourceEndMs": 6372360,
          "text": "お姉ちゃんお姉ちゃん"
        },
        {
          "speechId": 603,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6375840,
          "sourceEndMs": 6378800,
          "text": "お姉ちゃんどこ"
        },
        {
          "speechId": 604,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6380219,
          "sourceEndMs": 6385460,
          "text": "どこ行ったお姉ちゃん"
        },
        {
          "speechId": 605,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6385800,
          "sourceEndMs": 6389600,
          "text": "お姉ちゃんいなくなったんですけど"
        },
        {
          "speechId": 606,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6394139,
          "sourceEndMs": 6396920,
          "text": "部屋に戻ってんじゃない"
        },
        {
          "speechId": 607,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6398639,
          "sourceEndMs": 6403400,
          "text": "犯人は現場に戻るお姉ちゃんは部屋に帰る」「"
        },
        {
          "speechId": 608,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6404400,
          "sourceEndMs": 6413179,
          "text": "お姉ちゃんお姉ちゃん自分家あれお姉ちゃん"
        },
        {
          "speechId": 609,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6413820,
          "sourceEndMs": 6420500,
          "text": "自分自分の部屋いるかなこれ1回行ってみろ1回部屋"
        },
        {
          "speechId": 610,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6432060,
          "sourceEndMs": 6435679,
          "text": "いない違うか"
        },
        {
          "speechId": 611,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6447600,
          "sourceEndMs": 6455119,
          "text": "荷物ああなたあるある"
        },
        {
          "speechId": 612,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6457199,
          "sourceEndMs": 6460199,
          "text": "お姉ちゃん"
        },
        {
          "speechId": 613,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6461280,
          "sourceEndMs": 6464300,
          "text": "あんな覗けない"
        },
        {
          "speechId": 614,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6465060,
          "sourceEndMs": 6472760,
          "text": "お姉ちゃんこの穴じゃないのちょっと待ってどこに神社か"
        },
        {
          "speechId": 615,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6476340,
          "sourceEndMs": 6478760,
          "text": "神社かな"
        },
        {
          "speechId": 616,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6481400,
          "sourceEndMs": 6494360,
          "text": "ちょっと行ってみるわジンジャー神社どこだっけどっから入った駄菓子屋の横かこれなかなかシビアなエリアじゃない"
        },
        {
          "speechId": 617,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6497100,
          "sourceEndMs": 6502699,
          "text": "なんか光ってるなんもないか"
        },
        {
          "speechId": 618,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6503100,
          "sourceEndMs": 6505820,
          "text": "お姉ちゃん"
        },
        {
          "speechId": 619,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6508020,
          "sourceEndMs": 6515179,
          "text": "えーいないんですけどお姉ちゃんいなくなっちゃったよ"
        },
        {
          "speechId": 620,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6517440,
          "sourceEndMs": 6527360,
          "text": "立ち入り禁止のその先かちょっとお姉ちゃん見つけないとさーそれかあの女あの"
        },
        {
          "speechId": 621,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6527699,
          "sourceEndMs": 6532580,
          "text": "あの女男よ行ったかお姉ちゃん"
        },
        {
          "speechId": 622,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6532739,
          "sourceEndMs": 6535340,
          "text": "男湯行った"
        },
        {
          "speechId": 623,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6535860,
          "sourceEndMs": 6542600,
          "text": "開かないゴミ捨て場も何もなこのスライ静かに"
        },
        {
          "speechId": 624,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6543420,
          "sourceEndMs": 6550820,
          "text": "男床お姉ちゃんお姉ちゃん誠意の喜びをたか"
        },
        {
          "speechId": 625,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6551219,
          "sourceEndMs": 6557000,
          "text": "なんだ光ってるなんもないか"
        },
        {
          "speechId": 626,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6562619,
          "sourceEndMs": 6567860,
          "text": "教えてサウナ室いないボイラストがお姉ちゃん"
        },
        {
          "speechId": 627,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6568920,
          "sourceEndMs": 6575960,
          "text": "お姉ちゃんもしかしてまだ働いてんのか気持ち的には"
        },
        {
          "speechId": 628,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6585000,
          "sourceEndMs": 6593360,
          "text": "冷静にさお姉ちゃんじゃなくてあの普通に女湯にいた女が普通にいる可能性"
        },
        {
          "speechId": 629,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6596000,
          "sourceEndMs": 6599960,
          "text": "お姉ちゃんはいたちょっと置いといて"
        },
        {
          "speechId": 630,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6600179,
          "sourceEndMs": 6606679,
          "text": "ちょっと女湯にいたあの女をトイレかお姉ちゃんトイレちゃう"
        },
        {
          "speechId": 631,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6607980,
          "sourceEndMs": 6610639,
          "text": "これ新聞"
        },
        {
          "speechId": 632,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6614820,
          "sourceEndMs": 6619699,
          "text": "あのなどこ行ったん遅すぎて帰ったか"
        },
        {
          "speechId": 633,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6622320,
          "sourceEndMs": 6627500,
          "text": "あのな茹で上がったから帰ったか"
        },
        {
          "speechId": 634,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6633960,
          "sourceEndMs": 6646100,
          "text": "下駄箱はね鍵ないお湯の中お姉ちゃんお湯の中に沈んでんのかお姉ちゃん"
        },
        {
          "speechId": 635,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6646440,
          "sourceEndMs": 6649699,
          "text": "お姉ちゃん沈んでんのか"
        },
        {
          "speechId": 636,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6650040,
          "sourceEndMs": 6652820,
          "text": "大丈夫だって"
        },
        {
          "speechId": 637,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6655260,
          "sourceEndMs": 6657619,
          "text": "いない"
        },
        {
          "speechId": 638,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6658199,
          "sourceEndMs": 6661639,
          "text": "でもこれでもなぁ"
        },
        {
          "speechId": 639,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6662219,
          "sourceEndMs": 6667340,
          "text": "電話かけれんのこれかけるなよかけれない"
        },
        {
          "speechId": 640,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6669500,
          "sourceEndMs": 6673159,
          "text": "わかけれないわ"
        },
        {
          "speechId": 641,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6674159,
          "sourceEndMs": 6678619,
          "text": "今なんかあったえあった"
        },
        {
          "speechId": 642,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6678900,
          "sourceEndMs": 6681679,
          "text": "え排水溝じゃなくて"
        },
        {
          "speechId": 643,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6681780,
          "sourceEndMs": 6687860,
          "text": "排水溝じゃねこれでしょ排水溝でしょえ違う"
        },
        {
          "speechId": 644,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6688260,
          "sourceEndMs": 6690380,
          "text": "あ"
        },
        {
          "speechId": 645,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6695400,
          "sourceEndMs": 6700580,
          "text": "お姉ちゃんちの鍵やんお姉ちゃんの鍵あった"
        },
        {
          "speechId": 646,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6701580,
          "sourceEndMs": 6706100,
          "text": "行くぞお姉ちゃんち乗り込め"
        },
        {
          "speechId": 647,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6706280,
          "sourceEndMs": 6713000,
          "text": "今最高の奇跡に乗り込め"
        },
        {
          "speechId": 648,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6714600,
          "sourceEndMs": 6722420,
          "text": "お姉ちゃんいるかなどうしよう音量溶かしてたらどうしようアパートに入ります"
        },
        {
          "speechId": 649,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6723239,
          "sourceEndMs": 6725719,
          "text": "お姉ちゃん"
        },
        {
          "speechId": 650,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6728219,
          "sourceEndMs": 6736040,
          "text": "変わってない弁当もそのままだえっ焼き芋"
        },
        {
          "speechId": 651,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6736560,
          "sourceEndMs": 6743480,
          "text": "お姉ちゃんひや冷やしてたんだよお姉ちゃん開けっぱにしたろう"
        },
        {
          "speechId": 652,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6745980,
          "sourceEndMs": 6747980,
          "text": "あっ"
        },
        {
          "speechId": 653,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6750179,
          "sourceEndMs": 6753920,
          "text": "ちょっと節子の怨念こもっちゃってる"
        },
        {
          "speechId": 654,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6762119,
          "sourceEndMs": 6764540,
          "text": "何これ"
        },
        {
          "speechId": 655,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6768239,
          "sourceEndMs": 6770480,
          "text": "調べる"
        },
        {
          "speechId": 656,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6785580,
          "sourceEndMs": 6816199,
          "text": "銭湯で20代の女性が行方不明銭湯で銭湯に一人で出かけた無職の犬犬くぼようこさんの洋子さんかっこ29歳の姿が見えないと近所に住む女性が警察署に届け出た10日朝から警察が捜索したが見つかっていない裏に何か書いてある灰の中にあるはず灰の中"
        },
        {
          "speechId": 657,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6818880,
          "sourceEndMs": 6856280,
          "text": "なんでこんなに嫌われてるんだろう私みんなに迷惑かけたのかなきっと村に馴染めない私がいけないの邪魔者の私なんていない方がいいそう思っていたけど彼は私を受け入れてくれたなんて心の広い人こんな私なんかを気にかけてくれて愛してくれてさすが村一番のお坊さんいやお坊さんなんて関係ないのかも彼がすごいだけ彼が悪く言われるのは嫌だからこの関係は絶対に秘密にしておかないと私は彼といられたら幸せ他には何もいらない"
        },
        {
          "speechId": 658,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6856380,
          "sourceEndMs": 6859400,
          "text": "お坊さん"
        },
        {
          "speechId": 659,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6861960,
          "sourceEndMs": 6864380,
          "text": "拾えないのか"
        },
        {
          "speechId": 660,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6865199,
          "sourceEndMs": 6870560,
          "text": "バンバン言うとりますけどこれ拾えない"
        },
        {
          "speechId": 661,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6870840,
          "sourceEndMs": 6873260,
          "text": "何だ"
        },
        {
          "speechId": 662,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6874139,
          "sourceEndMs": 6883280,
          "text": "ちょなんか私の私の部屋桜子の日記ちょ私の部屋の方からもバンバン言ってます"
        },
        {
          "speechId": 663,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6887340,
          "sourceEndMs": 6898040,
          "text": "びっくりした節子節子びっくりするって私の部屋何かいるってこれ完全にちょっと帰ろう"
        },
        {
          "speechId": 664,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6899940,
          "sourceEndMs": 6903380,
          "text": "私の部屋からバンバン言ってる"
        },
        {
          "speechId": 665,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6905520,
          "sourceEndMs": 6908000,
          "text": "あれ"
        },
        {
          "speechId": 666,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6911159,
          "sourceEndMs": 6917000,
          "text": "気のせいか私の部屋冷蔵庫もないわけ"
        },
        {
          "speechId": 667,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6919920,
          "sourceEndMs": 6925580,
          "text": "まあまあまあまあまあまあとりあえずね節子してるわ一旦"
        },
        {
          "speechId": 668,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6925860,
          "sourceEndMs": 6928880,
          "text": "プレミかと思いきや"
        },
        {
          "speechId": 669,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6929520,
          "sourceEndMs": 6943580,
          "text": "節子はもうねこれはね見た感じで言うと化け物になっていや神社にお供えするわ節子は神社に入れてくるわせつこう"
        },
        {
          "speechId": 670,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6943920,
          "sourceEndMs": 6947719,
          "text": "節子ちょっと怒ってるこれ完全に"
        },
        {
          "speechId": 671,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6948000,
          "sourceEndMs": 6955820,
          "text": "これ節子神社でしょお祓いしお祓いしろ節子ちゃうのか"
        },
        {
          "speechId": 672,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6957719,
          "sourceEndMs": 6962719,
          "text": "節子のあるべき姿に"
        },
        {
          "speechId": 673,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6964739,
          "sourceEndMs": 6968000,
          "text": "説があるべき姿に返したい"
        },
        {
          "speechId": 674,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6970440,
          "sourceEndMs": 6972560,
          "text": "燃やす"
        },
        {
          "speechId": 675,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6973500,
          "sourceEndMs": 6982100,
          "text": "燃やす風使うゴミ捨て場だと帰ってこのようにねあ芋焼き芋さ"
        },
        {
          "speechId": 676,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6983040,
          "sourceEndMs": 6997100,
          "text": "新聞を読むあこれねはいの中にあるはず消えないこれ消えないんだけどやばいちょっとまずい消えなくなった"
        },
        {
          "speechId": 677,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 6997500,
          "sourceEndMs": 7002239,
          "text": "これこれあかんちょっとやばい"
        },
        {
          "speechId": 678,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7004219,
          "sourceEndMs": 7007239,
          "text": "あーびっくりした"
        },
        {
          "speechId": 679,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7007280,
          "sourceEndMs": 7010960,
          "text": "焦った焼き芋食べるかあ"
        },
        {
          "speechId": 680,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7011860,
          "sourceEndMs": 7015040,
          "text": "なんかしてる"
        },
        {
          "speechId": 681,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7015139,
          "sourceEndMs": 7018219,
          "text": "下駄箱の鍵来た"
        },
        {
          "speechId": 682,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7019219,
          "sourceEndMs": 7021520,
          "text": "ここね"
        },
        {
          "speechId": 683,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7021980,
          "sourceEndMs": 7029560,
          "text": "あゴミ捨てばけおーピターコラスイッチミニ"
        },
        {
          "speechId": 684,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7029840,
          "sourceEndMs": 7044560,
          "text": "来ました来ました排水ホース来たなんかあるかな他にここ節子捨てれるんだけど節子燃やした方がいい気がする捨ててもう帰ってくる節子はね"
        },
        {
          "speechId": 685,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7046219,
          "sourceEndMs": 7050199,
          "text": "うんこれでタオル洗えますね"
        },
        {
          "speechId": 686,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7050360,
          "sourceEndMs": 7064840,
          "text": "仕事に書かれてることがさ普通にこなせないのやばくないこなしたいけどこなすことができなくなってるなんで自分で問題解決しなきゃいけないのよ排水補佐ありますあります"
        },
        {
          "speechId": 687,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7066380,
          "sourceEndMs": 7071739,
          "text": "節子やめて節子御礼を撒き散らかすのはやめてください"
        },
        {
          "speechId": 688,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7072260,
          "sourceEndMs": 7074380,
          "text": "はい"
        },
        {
          "speechId": 689,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7075080,
          "sourceEndMs": 7088060,
          "text": "これねあれさあ動いた動いたでここに洗ってないタオルを入れました"
        },
        {
          "speechId": 690,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7088820,
          "sourceEndMs": 7092500,
          "text": "節子も洗おうなんか汚れてから"
        },
        {
          "speechId": 691,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7092960,
          "sourceEndMs": 7100360,
          "text": "置いてある選択完了なんかあるボイラッシュのやつかな"
        },
        {
          "speechId": 692,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7102920,
          "sourceEndMs": 7106219,
          "text": "これはあ"
        },
        {
          "speechId": 693,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7107780,
          "sourceEndMs": 7114040,
          "text": "かまど中を探すはい探してみるかノリで"
        },
        {
          "speechId": 694,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7114739,
          "sourceEndMs": 7121659,
          "text": "何も見つからないちょっとシラミ潰しでいきましょう"
        },
        {
          "speechId": 695,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7124400,
          "sourceEndMs": 7129280,
          "text": "てことは最後のこれにあるんじゃないかな"
        },
        {
          "speechId": 696,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7130340,
          "sourceEndMs": 7133179,
          "text": "まあそうでしょうね"
        },
        {
          "speechId": 697,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7133699,
          "sourceEndMs": 7139520,
          "text": "要領のいい女マリン何かを見つけた何"
        },
        {
          "speechId": 698,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7141560,
          "sourceEndMs": 7144639,
          "text": "あ何見つけたの"
        },
        {
          "speechId": 699,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7144739,
          "sourceEndMs": 7149920,
          "text": "新聞の切れ端いや燃えるよな新聞の切れ端なわけないか"
        },
        {
          "speechId": 700,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7150920,
          "sourceEndMs": 7153400,
          "text": "完成あ"
        },
        {
          "speechId": 701,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7155300,
          "sourceEndMs": 7158380,
          "text": "新聞節子燃やしますか"
        },
        {
          "speechId": 702,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7159139,
          "sourceEndMs": 7162040,
          "text": "あ燃やせないわ"
        },
        {
          "speechId": 703,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7162739,
          "sourceEndMs": 7166540,
          "text": "新聞完成した新聞読めるのかな"
        },
        {
          "speechId": 704,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7169820,
          "sourceEndMs": 7171820,
          "text": "え"
        },
        {
          "speechId": 705,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7171980,
          "sourceEndMs": 7182679,
          "text": "完成してないさっきとかさっきとか顔じゃないんですけど新聞変わってませんけどさっきと服かな"
        },
        {
          "speechId": 706,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7186860,
          "sourceEndMs": 7191800,
          "text": "一応さ見なかったとこも見てみる"
        },
        {
          "speechId": 707,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7193040,
          "sourceEndMs": 7196000,
          "text": "もう一回探してみるか"
        },
        {
          "speechId": 708,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7197599,
          "sourceEndMs": 7202239,
          "text": "えっ鍵あぼえっ"
        },
        {
          "speechId": 709,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7205460,
          "sourceEndMs": 7213880,
          "text": "これこれが見つかったんか今これこれでしたこれでございました"
        },
        {
          "speechId": 710,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7218000,
          "sourceEndMs": 7231280,
          "text": "入るちょっと待って待って待って待っていや入らない入らない入らない入らない入らないちょっと待ってよまだ早いよねちょ節子をまずさ捨てた方がいいんじゃないこれちょっと節子呪われてる呪われた存在"
        },
        {
          "speechId": 711,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7235639,
          "sourceEndMs": 7238239,
          "text": "なんかないの"
        },
        {
          "speechId": 712,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7239119,
          "sourceEndMs": 7248020,
          "text": "あこれあれだあれだフロのさ銭湯のさ左側にあった扉じゃないそういう繋がりだ"
        },
        {
          "speechId": 713,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7249500,
          "sourceEndMs": 7255460,
          "text": "いやワンチャン節子これ守ってくれる可能性の方血だるまになってるぞこれ"
        },
        {
          "speechId": 714,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7256340,
          "sourceEndMs": 7265840,
          "text": "節子犠牲になりますみたいな身代わりになりますみたいな圧倒的な愛嬌を放ってる"
        },
        {
          "speechId": 715,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7266780,
          "sourceEndMs": 7270099,
          "text": "そこマリオを救ってくれるんか"
        },
        {
          "speechId": 716,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7270739,
          "sourceEndMs": 7274900,
          "text": "一緒に行こうや節子バリアで"
        },
        {
          "speechId": 717,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7275540,
          "sourceEndMs": 7285940,
          "text": "守ってくれそうな顔したら見かけで判断すんなってこんな血みどろになっても帰ってきてくれた節子のことをさ疑うんかって連れて行くで"
        },
        {
          "speechId": 718,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7287380,
          "sourceEndMs": 7294520,
          "text": "やばいやばい山落としてるマリオ"
        },
        {
          "speechId": 719,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7296000,
          "sourceEndMs": 7304840,
          "text": "ちょっと当て進むんだこれCかZかXあ行けた"
        },
        {
          "speechId": 720,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7306440,
          "sourceEndMs": 7310179,
          "text": "曲がやばいよ曲が節子"
        },
        {
          "speechId": 721,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7318280,
          "sourceEndMs": 7324699,
          "text": "なんでこんな鎖が繋いであるのかな何ですか"
        },
        {
          "speechId": 722,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7327739,
          "sourceEndMs": 7333400,
          "text": "なんです何何誰かいる誰かいる誰かいる誰"
        },
        {
          "speechId": 723,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7333560,
          "sourceEndMs": 7335619,
          "text": "か"
        },
        {
          "speechId": 724,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7346040,
          "sourceEndMs": 7348340,
          "text": "薬"
        },
        {
          "speechId": 725,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7349659,
          "sourceEndMs": 7353739,
          "text": "なんかなんも思ってない"
        },
        {
          "speechId": 726,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7355280,
          "sourceEndMs": 7357280,
          "text": "誰"
        },
        {
          "speechId": 727,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7358460,
          "sourceEndMs": 7362599,
          "text": "誰ちょっと"
        },
        {
          "speechId": 728,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7363739,
          "sourceEndMs": 7369520,
          "text": "ちょちょっと待って化け物かもこれ化け物かもしれんわちょっと"
        },
        {
          "speechId": 729,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7371780,
          "sourceEndMs": 7396880,
          "text": "大家の道あー怖い死にたくないあんなこと手伝わなければ顔が良かったんだから生かしておけばよかったのにお姉ちゃんのことかなあいつらが変なこと言うから俺が呪われているってそんなのお前らのせいだろ銭湯で女性をいつも変わったらんカバんなんて書いてあるいつも"
        },
        {
          "speechId": 730,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7397699,
          "sourceEndMs": 7401320,
          "text": "匿ったらなんだなんて書いてある"
        },
        {
          "speechId": 731,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7402020,
          "sourceEndMs": 7422619,
          "text": "うんあ雇ったらがちょっと潰れてて全然読めなかったいや当たったしか雇ったらこれ雇ったら助かるってそんなことを言っていたけれどもえーそんな田舎でこんな田舎で結構厳しいよ走りたくない何かいい手を考えるか"
        },
        {
          "speechId": 732,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7422780,
          "sourceEndMs": 7426280,
          "text": "大家も感いろいろと"
        },
        {
          "speechId": 733,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7429440,
          "sourceEndMs": 7433119,
          "text": "神主のあの女"
        },
        {
          "speechId": 734,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7433760,
          "sourceEndMs": 7436060,
          "text": "桜子"
        },
        {
          "speechId": 735,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7436219,
          "sourceEndMs": 7457719,
          "text": "惚れさせられてるあの女を惚れさせるあの女を身ごもおらせる身ごもをさせる子供を産む前に殺す男の子が生まれた過去産む前に殺したはず息子を殺す保留さんさん"
        },
        {
          "speechId": 736,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7458599,
          "sourceEndMs": 7463159,
          "text": "何これ三女何これ"
        },
        {
          "speechId": 737,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7465940,
          "sourceEndMs": 7489159,
          "text": "あれを産め産芽を銭湯に閉じ込めるあいつを騙して産めが選んだ女を生贄にする3人必要1人目2人目あたしだー3人で私だこれやだーこれ何ボルド合体あの化け物"
        },
        {
          "speechId": 738,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7494599,
          "sourceEndMs": 7497440,
          "text": "解き放つなように"
        },
        {
          "speechId": 739,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7498380,
          "sourceEndMs": 7514179,
          "text": "呪われた故人が選びし人間を生贄にすべしそうすれば解き放たれるであろうただし3人の女の血でないとならぬ3人の女の血"
        },
        {
          "speechId": 740,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7522679,
          "sourceEndMs": 7529719,
          "text": "あたしこれ私かえあの化け物解き放つの"
        },
        {
          "speechId": 741,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7530900,
          "sourceEndMs": 7533900,
          "text": "えいる"
        },
        {
          "speechId": 742,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7559460,
          "sourceEndMs": 7561699,
          "text": "あれ"
        },
        {
          "speechId": 743,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7563239,
          "sourceEndMs": 7565960,
          "text": "追っかけてくると思ったけど"
        },
        {
          "speechId": 744,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7574540,
          "sourceEndMs": 7577540,
          "text": "いない"
        },
        {
          "speechId": 745,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7578679,
          "sourceEndMs": 7582159,
          "text": "ここは"
        },
        {
          "speechId": 746,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7599320,
          "sourceEndMs": 7604360,
          "text": "どういうことえっ"
        },
        {
          "speechId": 747,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7615460,
          "sourceEndMs": 7622840,
          "text": "ちょっとすいません帰ります帰りますお疲れて俺は"
        },
        {
          "speechId": 748,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7623179,
          "sourceEndMs": 7633699,
          "text": "だけど来たけど来たけど大丈夫なんかカエル変えろ行くぞ説か"
        },
        {
          "speechId": 749,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7633800,
          "sourceEndMs": 7643300,
          "text": "帰るそして何何何解き放っちゃったかなちょっと何解き放っちゃった"
        },
        {
          "speechId": 750,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7644179,
          "sourceEndMs": 7649300,
          "text": "なんか走れなくなった走れなく"
        },
        {
          "speechId": 751,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7651320,
          "sourceEndMs": 7653320,
          "text": "なった"
        },
        {
          "speechId": 752,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7654139,
          "sourceEndMs": 7657280,
          "text": "なんか走るのかかった"
        },
        {
          "speechId": 753,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7659659,
          "sourceEndMs": 7662380,
          "text": "誰かいませんか"
        },
        {
          "speechId": 754,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7664760,
          "sourceEndMs": 7667360,
          "text": "帰ろうかなちょっと"
        },
        {
          "speechId": 755,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7668840,
          "sourceEndMs": 7674020,
          "text": "えーこれどういう状況ねあしゃがんでるのかも私"
        },
        {
          "speechId": 756,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7674599,
          "sourceEndMs": 7682239,
          "text": "しゃがんでたわしゃがんでましたあタオルそうだタオル忘れた"
        },
        {
          "speechId": 757,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7682880,
          "sourceEndMs": 7696099,
          "text": "タオルをね置くんでござんした仕事が私はおいしゃー見てるバイカガチでバカバカもふざけんな節子行くぞ"
        },
        {
          "speechId": 758,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7696139,
          "sourceEndMs": 7702159,
          "text": "やっとる場合かアベルトせつこ一緒に"
        },
        {
          "speechId": 759,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7705980,
          "sourceEndMs": 7730820,
          "text": "もうあの化け物をほらたち放たれてるあかんあたしじゃないあたしじゃないあたしじゃない5分どこ行けええか教えてください神社か違うこれあかんこれサウナこれサウナが"
        },
        {
          "speechId": 760,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7732679,
          "sourceEndMs": 7737480,
          "text": "当たるえ何これ何これ何これ"
        },
        {
          "speechId": 761,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7738139,
          "sourceEndMs": 7745719,
          "text": "通れないケーキちゃんかこれ燃やすボーナスボイラスボスこれボールライスです"
        },
        {
          "speechId": 762,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7746840,
          "sourceEndMs": 7768340,
          "text": "んちょっと待ってこれあれこれちょっとあれボイライスどこ行ったあれブレスをこれお願いがちょっちょん間違えた間違えた間違えたちょっと出れない出れない出ない出ない出ないうちがこれ男に音があれあれあれあれあれあれすいませんボイラストはボイスはチョコレス何これちょっとえ何これ何これ何これ何これ何これ"
        },
        {
          "speechId": 763,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7769340,
          "sourceEndMs": 7771699,
          "text": "全部取ります"
        },
        {
          "speechId": 764,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7771860,
          "sourceEndMs": 7774860,
          "text": "か"
        },
        {
          "speechId": 765,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7791920,
          "sourceEndMs": 7802119,
          "text": "何これどこに置くどういうことどういうことどういうことえどういうことじゃ説明説明し説明して説明"
        },
        {
          "speechId": 766,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7804199,
          "sourceEndMs": 7811000,
          "text": "ありがとう風呂のセット整っ整え異なる整えろ"
        },
        {
          "speechId": 767,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7811699,
          "sourceEndMs": 7816580,
          "text": "全部がこれでちょっと"
        },
        {
          "speechId": 768,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7823480,
          "sourceEndMs": 7832420,
          "text": "場所が場所があるかこれ厳しめに厳しく場所が決まってるのかな"
        },
        {
          "speechId": 769,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7832760,
          "sourceEndMs": 7835719,
          "text": "ちゃんと可愛い"
        },
        {
          "speechId": 770,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7836599,
          "sourceEndMs": 7844469,
          "text": "ここでももういっぱいだよ床じゃねさすがに"
        },
        {
          "speechId": 771,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7844940,
          "sourceEndMs": 7856280,
          "text": "ここも置けんのちょっと待ってあれかどっかに男湯にマジで死ぬんだ私えっ私"
        },
        {
          "speechId": 772,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7857540,
          "sourceEndMs": 7861040,
          "text": "死ぬんだ男と揃える"
        },
        {
          "speechId": 773,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7864739,
          "sourceEndMs": 7873460,
          "text": "私死ぬんだこれ何わかんないちょっと待って水色のボディーソープ"
        },
        {
          "speechId": 774,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7874179,
          "sourceEndMs": 7884320,
          "text": "でしょなんか開けるボレーションプーンが絶対覚えられないえっと"
        },
        {
          "speechId": 775,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7886420,
          "sourceEndMs": 7897280,
          "text": "1234万でいい4番目に一度洗面器1番左にいるあーちょっと待って順番に10秒"
        },
        {
          "speechId": 776,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7897860,
          "sourceEndMs": 7903099,
          "text": "4番目に出演機一番左です"
        },
        {
          "speechId": 777,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7906980,
          "sourceEndMs": 7924560,
          "text": "4番目やったやった1234番目信号目に置けないんだけどあれ無料なんじゃなかったっけ5番目だった椅子ささみに"
        },
        {
          "speechId": 778,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7933520,
          "sourceEndMs": 7937420,
          "text": "一番左"
        },
        {
          "speechId": 779,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7939280,
          "sourceEndMs": 7956560,
          "text": "ちょっと待ってなんだこれお湯の中にも何か入れれるの入浴剤でなんかもう無理だもう何もう無理もう負ける"
        },
        {
          "speechId": 780,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7956659,
          "sourceEndMs": 7969820,
          "text": "無理だもうやだもうほっといてよ待って3番目にこれなんだボディソープ椅子間に椅子3番目にボディソープ間にいつ"
        },
        {
          "speechId": 781,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7969920,
          "sourceEndMs": 7973599,
          "text": "裏側になんかね"
        },
        {
          "speechId": 782,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7977060,
          "sourceEndMs": 7980380,
          "text": "全体無理だー"
        },
        {
          "speechId": 783,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7987139,
          "sourceEndMs": 7990139,
          "text": "待って123"
        },
        {
          "speechId": 784,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7990920,
          "sourceEndMs": 7994300,
          "text": "あれどうした"
        },
        {
          "speechId": 785,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 7996320,
          "sourceEndMs": 8000480,
          "text": "椅子が真ん中にあって"
        },
        {
          "speechId": 786,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8000659,
          "sourceEndMs": 8005520,
          "text": "あげるお風呂に入れる"
        },
        {
          "speechId": 787,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8008699,
          "sourceEndMs": 8021719,
          "text": "これはこれはこれどこだった裏側だこれこれ裏側だこれ裏側のここここいや違ったっけ"
        },
        {
          "speechId": 788,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8022000,
          "sourceEndMs": 8025179,
          "text": "隣かこっち"
        },
        {
          "speechId": 789,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8029139,
          "sourceEndMs": 8036360,
          "text": "え完成じゃないこれはこれは何だったこれこれじゃなくてこれか"
        },
        {
          "speechId": 790,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8036840,
          "sourceEndMs": 8041880,
          "text": "これ勝負どこ行ったうわぁ"
        },
        {
          "speechId": 791,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8047500,
          "sourceEndMs": 8052079,
          "text": "荷物が多いってボディオアシス無礼用車"
        },
        {
          "speechId": 792,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8052860,
          "sourceEndMs": 8063719,
          "text": "何が違うのお母さんのあーもうやだ何でこんな気持ちあー"
        },
        {
          "speechId": 793,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8064960,
          "sourceEndMs": 8070320,
          "text": "ちゃん分かんないやったー"
        },
        {
          "speechId": 794,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8091000,
          "sourceEndMs": 8096060,
          "text": "逃げる開けてあげて"
        },
        {
          "speechId": 795,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8126900,
          "sourceEndMs": 8132060,
          "text": "どっからごめん逃げるとこからどこから"
        },
        {
          "speechId": 796,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8133739,
          "sourceEndMs": 8143110,
          "text": "見るとこからだちょっと大丈夫わかんない"
        },
        {
          "speechId": 797,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8299559,
          "sourceEndMs": 8305620,
          "text": "左左左左左左左ハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッ"
        },
        {
          "speechId": 798,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8313300,
          "sourceEndMs": 8315300,
          "text": "ハッ"
        },
        {
          "speechId": 799,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8316179,
          "sourceEndMs": 8319179,
          "text": "ハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッハッ"
        },
        {
          "speechId": 800,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8321399,
          "sourceEndMs": 8324399,
          "text": "ハッリア"
        },
        {
          "speechId": 801,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8355920,
          "sourceEndMs": 8366929,
          "text": "お姉ちゃんの部屋どっちどっちに入れた方がいい私の部屋でいいのこの20520520520520"
        },
        {
          "speechId": 802,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8367899,
          "sourceEndMs": 8373599,
          "text": "うん205って"
        },
        {
          "speechId": 803,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8435010,
          "sourceEndMs": 8441310,
          "text": "[笑い]"
        },
        {
          "speechId": 804,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8469660,
          "sourceEndMs": 8473700,
          "text": "私どこで連れてかれてんのこれ"
        },
        {
          "speechId": 805,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8474460,
          "sourceEndMs": 8476880,
          "text": "運ばれてます"
        },
        {
          "speechId": 806,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8477100,
          "sourceEndMs": 8480359,
          "text": "なんか運ばれてるんですけど"
        },
        {
          "speechId": 807,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8480760,
          "sourceEndMs": 8486420,
          "text": "うんお供えされちゃうの神社"
        },
        {
          "speechId": 808,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8489160,
          "sourceEndMs": 8498359,
          "text": "お風呂だどこ連れてくのボイラ室のボイラッシュの向こう側の地下"
        },
        {
          "speechId": 809,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8512800,
          "sourceEndMs": 8525080,
          "text": "えてんの嫌じゃないですお願いやめて"
        },
        {
          "speechId": 810,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8526359,
          "sourceEndMs": 8530340,
          "text": "節子私のこと"
        },
        {
          "speechId": 811,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8530979,
          "sourceEndMs": 8533580,
          "text": "助けに来てくれたのか"
        },
        {
          "speechId": 812,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8536260,
          "sourceEndMs": 8538979,
          "text": "何何"
        },
        {
          "speechId": 813,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8539880,
          "sourceEndMs": 8543120,
          "text": "お姉ちゃんかな"
        },
        {
          "speechId": 814,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8544240,
          "sourceEndMs": 8547560,
          "text": "なんか出てきたなんか出てきたよ"
        },
        {
          "speechId": 815,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8551620,
          "sourceEndMs": 8554460,
          "text": "体にも戦ってあるよ"
        },
        {
          "speechId": 816,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8555160,
          "sourceEndMs": 8563500,
          "text": "うん召喚したのが書いてあったやつか産めさんかあー"
        },
        {
          "speechId": 817,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8577120,
          "sourceEndMs": 8580300,
          "text": "めちゃくちゃです"
        },
        {
          "speechId": 818,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8584560,
          "sourceEndMs": 8587700,
          "text": "物理演算バグりながら"
        },
        {
          "speechId": 819,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8588040,
          "sourceEndMs": 8590580,
          "text": "歩みを進めてる"
        },
        {
          "speechId": 820,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8590979,
          "sourceEndMs": 8594660,
          "text": "あーめちゃくちゃな物理演算で歩いてる"
        },
        {
          "speechId": 821,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8605800,
          "sourceEndMs": 8611020,
          "text": "えっえっエンディング"
        },
        {
          "speechId": 822,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8614080,
          "sourceEndMs": 8619600,
          "text": "重すぎてちょ過酷なんだけど嘘でしょちょっと"
        },
        {
          "speechId": 823,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8620380,
          "sourceEndMs": 8623580,
          "text": "終わったんだけど"
        },
        {
          "speechId": 824,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8627040,
          "sourceEndMs": 8638580,
          "text": "ストレス溜まったわちょっとマリン怖かったいやもう多すぎるえー何これ今のエンディングどういうこと"
        },
        {
          "speechId": 825,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8638740,
          "sourceEndMs": 8646380,
          "text": "うん何がいけなかったのねぇエンディングが深くなんですけど"
        },
        {
          "speechId": 826,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8649859,
          "sourceEndMs": 8654840,
          "text": "最後のあの終われるのがもう"
        },
        {
          "speechId": 827,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8655000,
          "sourceEndMs": 8683700,
          "text": "バッドエンドなのかなまる別のエンディングもあったのかしらいやでもせんちゃんもう終われるの疲れたのもういい節子して節子捨てた方が良かったのかな何だったんだろう一体何だったんだろう結局あーちょっと水飲むか階段の上りより大変なうるさいなんか引っかかったんだもん"
        },
        {
          "speechId": 828,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8684280,
          "sourceEndMs": 8693160,
          "text": "風呂のパズルの成功は確かにウロのパズル失敗したもんな船長ど成功してたら違ったのがエンディング"
        },
        {
          "speechId": 829,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8696479,
          "sourceEndMs": 8700979,
          "text": "あれをねクリアできてたら良かったのかなぁ"
        },
        {
          "speechId": 830,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8701260,
          "sourceEndMs": 8712080,
          "text": "違うメンバーの配信で違うエンディングが見れることを祈るばかりですねあお姉ちゃんの部屋に行くっていうのもあったか"
        },
        {
          "speechId": 831,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8712899,
          "sourceEndMs": 8715740,
          "text": "いや水のも"
        },
        {
          "speechId": 832,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8717580,
          "sourceEndMs": 8719580,
          "text": "うん"
        },
        {
          "speechId": 833,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8720760,
          "sourceEndMs": 8724439,
          "text": "エンディングがこんな重いことある"
        },
        {
          "speechId": 834,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8725080,
          "sourceEndMs": 8727500,
          "text": "固まったし"
        },
        {
          "speechId": 835,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8731859,
          "sourceEndMs": 8735660,
          "text": "おうち3Dだったのが良くなかったかな"
        },
        {
          "speechId": 836,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8736300,
          "sourceEndMs": 8740640,
          "text": "動かなくなっちゃったあれ"
        },
        {
          "speechId": 837,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8740740,
          "sourceEndMs": 8747060,
          "text": "船長のパソコンどうなってんのよそんな古くないんだけどな感想で撃ちますね"
        },
        {
          "speechId": 838,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8748120,
          "sourceEndMs": 8751500,
          "text": "バッドエンディングだって"
        },
        {
          "speechId": 839,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8753580,
          "sourceEndMs": 8756960,
          "text": "バッドエンドだったんだ"
        },
        {
          "speechId": 840,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8757780,
          "sourceEndMs": 8764399,
          "text": "チェーン切ったのは良かったのか悪かったのかね確かにどうだったんだろう"
        },
        {
          "speechId": 841,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8766140,
          "sourceEndMs": 8780240,
          "text": "もうダメでももう船長できないやべ船長過酷になってるわえっ船長ってずっとカクカクだったさっきからずっとマリンって実はずっと格好だったの今見たらカクカクなんだけど"
        },
        {
          "speechId": 842,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8782500,
          "sourceEndMs": 8791740,
          "text": "もう1週いやしないしないしないあ今かくなったちょっととりあえずエンディングでかくなったもう"
        },
        {
          "speechId": 843,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8792160,
          "sourceEndMs": 8794580,
          "text": "無理もうできない"
        },
        {
          "speechId": 844,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8799479,
          "sourceEndMs": 8830580,
          "text": "いやー怖かったな普通に普通に怖かったわ船長余裕でガチビビリしたわいや怖いよあんな風に追っかけ回されたらびっくりしちゃうってあんな風に追われたら追われる系ダメなんだよね本当にお金エンディング気になるねぇいやでもお金がみんな難しいんじゃないフルのパズルとか難しすぎるだろう"
        },
        {
          "speechId": 845,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8830740,
          "sourceEndMs": 8843660,
          "text": "ねえ何が分岐なんだろう節子は何だったのかとかまあ色々気になるねちょっとあのメンバーの配信で血がウェディングが見られるといいね"
        },
        {
          "speechId": 846,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8843819,
          "sourceEndMs": 8849540,
          "text": "船長はもうもういいもうやだもう無理です"
        },
        {
          "speechId": 847,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8849880,
          "sourceEndMs": 8854520,
          "text": "さすぱち読みして終わるかはい"
        },
        {
          "speechId": 848,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8854740,
          "sourceEndMs": 8857640,
          "text": "ということでね"
        },
        {
          "speechId": 849,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8858819,
          "sourceEndMs": 8862600,
          "text": "いや怖かった最後"
        },
        {
          "speechId": 850,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8862660,
          "sourceEndMs": 8883720,
          "text": "怖かった明日はねできない明日はねなんとねはいポーションなりVRグリーティング君たちあの当選した君たちとねおしゃべりして参ります船長ねそのVRグリーティングは何回かねあのリハーサルみたいなやつ行ったんですけどあのねなんかねあの"
        },
        {
          "speechId": 851,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8884020,
          "sourceEndMs": 8935100,
          "text": "船長がカメラ越しVRカメラ越しにどんな風に見えるかみたいなのをね船長もカメラつけてさ船長そこに置いてもらってみたいよ見てみたのよでしたらねなんかめっちゃねーなんかスケベだったマジで立ってるマリンがねあんなドスケベなんだなと思いましたなんかねあのね腰が細くてエッチでした自分だけど自分だけどなんかスケベだったなあうんはいまぁ明日と来週のねありますとでねあの前話したVRライブなんだけどなんかそのバーチャルキャストさんだとあんまりねライブってこと自体そんななんかやってないらしいんだけどなんか特別にやってもらうことになって"
        },
        {
          "speechId": 852,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 8935200,
          "sourceEndMs": 9050540,
          "text": "うんだからちょっとねまあ船長そのVRカメラでじっくり眺めるというのはね誰でも果たすことができるかなと思います船長あの今回は全編録画のミニライブにしましてそう4曲歌ってMCのあるなんかミニライブをまあのーそのうちやる予定なんですけどまああのいつやるか決まってないんだけどそのうちやってそれはなんかめっちゃね録画だから再放送で何回か放映されるから君たち良かったらねVRゴーグルをね準備してぜひいろんな時間にやってるしVRのねインターネットで見るやつだから現地に行くとかもないからそうもう録画してあのしました録画いたしましたあと巨人に見てもらうだけ間近でね間近で歌って踊って喋るマリンを見たいVRカメラでねじっくり眺めたいっていう方はぜひともねあの今回のねおしゃべりはできないものの眺めることは歌って踊る間にか眺められますということなんで是非ともねそのあのVRグリーディング羨ましいなーっていう方はそれでちょっとでもね楽しんでもらえれば下からのアングルはいいんですかなんかねあのねうんバーチャルキャストって君たちのアバターもいるのキムチのアバターも見えるのでこっちにだから君たちがあのー船長のパンツ覗こうとして寝そべってたらその君たちのモデルも寝そべるからこいつこいつローアングル決めてやがれ」って我々ですバレバレになります"
        },
        {
          "speechId": 853,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9052740,
          "sourceEndMs": 9161899,
          "text": "ということですねでも今回ねあのーねまのスパッツをね外してもらったんでちょっとYouTubeじゃないからせっかくね外部でやるからスパッツ外してもらったんでねま見えたらいいなみたいな感じでお楽しみお楽しみな感じの描いといてね覗き込むのはね禁止ですので覗き込まないように見えたらラッキーくらいに思っておくように覗き込まないように覗き込んでるとね決めちゃんが覗き込んでるアラレもない情けない倒れ込んだ姿がねみんなの目に映ってしまってねカッコ悪いから覗き込まないようにはいじゃあちょっとスパチャにするか今週もねかなりちょっと詰まってて厳しおそらく厳しい状況ですねVRグリーティングもだけどねなんか収録が結構終わってちょっとバタバタしますがまあ隙間を見つけてやれたらやるて感じでまあでもねあの直筆メッセージとねお誕生日記念の直筆メッセージとLINEスタンプは終わったのではいこれでまぁちょっと余裕ができたらうん収録めちゃくちゃ動くないや多いマジで多いえなんかスタジオの人にもね言われたまりさんねちょっと出過ぎですよみたいないやでも船長さーでもなーむずいなむずいなって思うのがなんか船長も結構呼びたい派だから自分のなんかそういう自分の催しにみんなを呼びたい派だからねみんなが催す時に何かを催す時に呼んでくれたらなるだけ行きたいんだよね"
        },
        {
          "speechId": 854,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9163380,
          "sourceEndMs": 9179780,
          "text": "うんえーっとうんまあなんかその時しかできないことをやっぱやっておきたいじゃない今しかできないようなこととかをやっておきたいじゃないうん"
        },
        {
          "speechId": 855,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9181740,
          "sourceEndMs": 9204680,
          "text": "体調は大丈夫ですかLINEスタンプ書いてた時はもう本当に体重っていうかあの注意が逆転がすごかったねめちゃめちゃになってたわ喉は大丈夫喉はちょいちょいやるけどなんか長いこと使うとやるね長いこと使うとやっちゃって次の日カスカスになるみたいな短時間"
        },
        {
          "speechId": 856,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9205680,
          "sourceEndMs": 9248000,
          "text": "まあまあでも船長がその時やりたいことを優先してやるのでねうんそん時やりたいことを優先してやりますいろいろ考えた結果そうするんで今日ちょい枯れてるあちょっと枯れてるのかなちょっと枯れてるかなあまあまあしとしたら別ごろ出ますそうだ11月には出せるはずこれ審査落ちたら本当にもう鬱になるね戦争したらあんなに苦しんなのにうん審査落ちたら苦しいなぁえーっとうん"
        },
        {
          "speechId": 857,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9248939,
          "sourceEndMs": 9252920,
          "text": "読むかスパちゃんちょっと待ってね"
        },
        {
          "speechId": 858,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9256020,
          "sourceEndMs": 9271399,
          "text": "うんうんうん審査したら柿のあどうなんだろう初めてだからなあどんな感じなんだろうなんかその一部だけ書き直しなのか何なのか"
        },
        {
          "speechId": 859,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9272399,
          "sourceEndMs": 9277430,
          "text": "何だろうなぁ"
        },
        {
          "speechId": 860,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9278580,
          "sourceEndMs": 9305540,
          "text": "色々書いたけどねいやでもね実際ね書いたスタンプをあのシオンタンとかフレアとかを相手にあとカナダとか相手にして画像として貼り付けてちょっとさ使ってみたのそれはなんかめっちゃ使いづらくてさガチで使いづらくて普通にこれはあれだわいやもっと普通なんか文字のないスタンプがもっと必要だったかもしれない"
        },
        {
          "speechId": 861,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9306000,
          "sourceEndMs": 9316880,
          "text": "笑ってるやつとかなんかね変に文字が入ってるせいで微妙に使いづらいんだよな全体的にうん"
        },
        {
          "speechId": 862,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9318660,
          "sourceEndMs": 9321260,
          "text": "って感じでした"
        },
        {
          "speechId": 863,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9321300,
          "sourceEndMs": 9337819,
          "text": "いやでもやってみて使ってみて思ったけど色々とねあこうすればよかったなあ色々出てきたから次作るとしたらこの反省を生かしてもっとあこれが欲しいっていうスタンプを作りたいなって思った"
        },
        {
          "speechId": 864,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9339660,
          "sourceEndMs": 9373340,
          "text": "うんはいえーいやでもいやでもどうだろうスタンプとは当分書きたくないけどね余裕でうんめっちゃ船長が絵で仕事ができなかった理由が詰まってたね今回えきついわ普通に絵描くってそういえばなんか今ティッシュがさ船長がメモしたティッシュが置いてあったんだけど812って何だったんだろうね結局船長がメモしたティッシュ812ってなんだ"
        },
        {
          "speechId": 865,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9374160,
          "sourceEndMs": 9383600,
          "text": "次はプロに頼もうぜいや頼みたかったよ前兆もプロにプロに頼もうと思ってたよ熱い要望があったから"
        },
        {
          "speechId": 866,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9383640,
          "sourceEndMs": 9394700,
          "text": "船長に書いてほしいという熱い要望があったからなまあぐらい書いてみるかと思ったけど次やるとしたらプロに頼んでもいいか"
        },
        {
          "speechId": 867,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9395640,
          "sourceEndMs": 9398060,
          "text": "余裕によるか"
        },
        {
          "speechId": 868,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9399479,
          "sourceEndMs": 9413359,
          "text": "明日は配信はね多分無理ですね朝から夜までVRグリーティングなんでうん明日はない明後日はあるかも"
        },
        {
          "speechId": 869,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9414600,
          "sourceEndMs": 9451220,
          "text": "うんえー鉄腕勝ちさんどうもありがとうございますスタンプのPSD-などあると嬉しいですスタンプのPSDって配布していいのかなうんちょっとこれ売り物だからわかんないからちょっと運営さんに確認しますねうんあでも配布するほどじゃないガチでなんか今まで開封したやつみたいになんか凝った塗りしてるわけでもなくてめっちゃ普通にアニメ塗りだから配布するようなものでもないな普通にうん"
        },
        {
          "speechId": 870,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9451319,
          "sourceEndMs": 9464209,
          "text": "喉大丈夫なんかガラガラするわ服でもなんか元々ガラガラしてたなんかずっと今日なんか喉に何か詰まってたずっと何かが詰まってます"
        },
        {
          "speechId": 871,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9464819,
          "sourceEndMs": 9479600,
          "text": "エポックルさんどうもありがとうございますスタンプ制作ありがとうございましたVRグリーティング当然おめでとうございます結構1分半あるからね何話すか考えといてくださいねうん"
        },
        {
          "speechId": 872,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9479760,
          "sourceEndMs": 9490520,
          "text": "喉に毛が詰まってるこれねえゴーゴーしたらゴホしたら出てくるかもな毛がうん"
        },
        {
          "speechId": 873,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9492000,
          "sourceEndMs": 9500059,
          "text": "えーっとえーアルカスさんありがとうございます"
        },
        {
          "speechId": 874,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9500520,
          "sourceEndMs": 9506780,
          "text": "直筆スタンプ新しい宝物になりますありがとうございます宝物とまで言ってもらえますか"
        },
        {
          "speechId": 875,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9509160,
          "sourceEndMs": 9569129,
          "text": "液タブ液タブってやはり肩こりと付き合っていくしかないのでしょうか船長辛そうでしたが何かアドバイスがあればいただきたいですいや船長もねダメなんよ液タブねえ多分全然ダメだねバキバキだよただうん船長も全然ダメなんでわかんないアドバイスできない船長もめちゃめちゃ肩痛かった首は治ったのかな首はねちょっと声帯とか言ったんですけどまあまだ痛いなってまだ痛いけどまあ多少マシになったかギリえーっとうんえー第三形態フリーザボットさんありがとうございますいつもご苦労様ですねなんかスタンプスタンプじゃないスタンプフリーザ様フリーザ様なりきりbotが"
        },
        {
          "speechId": 876,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9569280,
          "sourceEndMs": 9575180,
          "text": "デスビーム撃ってるフリーザ様デスビーム打たないでもろて"
        },
        {
          "speechId": 877,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9575640,
          "sourceEndMs": 9616040,
          "text": "液タブの角度変えたら肩こりが軽くなったって言ってたあー北部の学童の問題なのかなわかんねえレビューさんどうもありがとうございますえーLINEスタンプねえそっかフォロメンのLINEスタンプ見るときにね船長のスタンプ来ないかなってえ船長もあのね今回スタンプ書いててめっちゃねあのねペコラのスタンプの案がめっちゃ浮かんだの船長脳内でペコラだったらこれとこれとこれどうみたいなで構造はこうでみたいな衣装はこれで表情はこんな感じでみたいななんかめっちゃ想像が膨らんだ"
        },
        {
          "speechId": 878,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9616800,
          "sourceEndMs": 9630300,
          "text": "ペコル作りやすそうだなスタンプテコラのスタンプ作りやすそうだなって思いました書けばええやいや君たんだって科学の大変なんだもんねえ"
        },
        {
          "speechId": 879,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9630840,
          "sourceEndMs": 9634040,
          "text": "スタンプ書くの大変なんだもん"
        },
        {
          "speechId": 880,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9634920,
          "sourceEndMs": 9738319,
          "text": "てこらん伝説いやペコラに聞いたんでもLINEスタンプさあそうそう浮かんでいや船長ペコラのLINEスタンプめっちゃ浮かんでるんだけどさーランチタイムズは作んないのって言うたらさなんかいらないっしょみたいな感じちゃってたますかあそっかみたいな感じでねもしかしてあれか美味しいなペコラ自身がそもそもLINEあんましないからあのいる感を感じないかもしれないうんえーとえウリヒさんどうもありがとうございますぽぽパレードをきましたありがとうございますね購入どうもありがとうねいっぱい動かしてくださいうんいやでもLINEスタンプそうだねワンチャンねでもこれで3期生3人出てるわけだからもしかしてこれから欲しくなるかもしんないよねワンチャンねうん一旦今はさあなんかそんなにさなんかグッズもさーまこれは出さなくていいかと思ってたものが意外とみんな出してることによってあなんか出してみようかなみたいな船長もLINEスタンプはまあいいかと思ってたんだけどなんかあのみんながさ出し始めてさ結構なんかもうやかましとかでもさラミーもねダミーもノエルもなんかスタンプ使ってきてフレアもスタンプ使ってくるしねアクターもスタンプ使ってくるしなんか周りがこう出してるとねいや船長もいらんと思ってたLINEスタンプマリンのLINEしたらいらんと思ってた意外となんかみんなが使ってると欲しくなってくるなぁ"
        },
        {
          "speechId": 881,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9738600,
          "sourceEndMs": 9766520,
          "text": "うんLINEスタンプ最初上に止められてたの急に恩恵になったもんね一番船長が止められたって言ったのは3期生のLINEスタンプを出したいって言った時に止められたらな多分なんかそれはねえ多分全体で順番に出す予定があったんじゃない今はもう出てるじゃん公式からでも公式から出る前に言ってたからそれかもしんない早かったからかもうん"
        },
        {
          "speechId": 882,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9767100,
          "sourceEndMs": 9852080,
          "text": "えーとえーモリリンさんどうもありがとうございます24個ねでもLINEスタンプってさ結構さデフォルメ聞いてるからさ結構君味からしても簡単に書けるんじゃないのって思うと思うんだけど船長も思ってたLINEスタンプはデフォルメ聞いてるから結構簡単に描けるだろうなって思うてたわでもなんでなんだろうねなんでこう手が抜ききれないんだろうもうちょっと手が抜ければいやミスったなーデフォルメ感をミスった3頭身くらいの絵を描くつもりが気づいたら普通になんかうまく言えないけど4頭身くらいの絵を描いてたみたいなうまくいないみたいな感じのミスだったなああとなんか線とかもさどうせ縮むのにさ謎に丁寧に引いちゃったりしてたもん何をこだわってんのが自分でも不思議なんだけどついやっちゃうんだよねそのせいだねいやー今度やるならあれだねペンもなんかちゃんとした絵を描く時のペン入れ用のペンじゃなくてねクリスタにあるさーあのー何なんかマーカーみたいなさアンチエイリアスがあんまり聞いてないようなペンで線引いて"
        },
        {
          "speechId": 883,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9852479,
          "sourceEndMs": 9867030,
          "text": "チュルッとしたやつ今度はもっとラフなやつ次自分が出すならもっと楽なやつ書こうもっとラフもっとラフうんって思った"
        },
        {
          "speechId": 884,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9867240,
          "sourceEndMs": 9874100,
          "text": "やつラバーストとも結構違うのいや全然違うねラバストのが全然楽だったわ"
        },
        {
          "speechId": 885,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9874140,
          "sourceEndMs": 9916760,
          "text": "ラバスは結局グラデとかもかけれないからブラシとかグラデとか捨てるわけじゃんでもなくLINEスタンプは意外と髪の毛のいやでもここちょっと毛先グラデー入れるかつってなんか紫のグラデとか入れたら前髪とかもちょっと肌色入れるからちょっと肌色入れるじゃん下の中早いとちょっと入れるかつってハイライト入れるじゃんあーじゃあそしたらちょっと影入れるかって影入れるじゃんえなんか髪の毛嗅ぎ合うのもちょっと変だからって肌の鍵入れるじゃんなんか角の出かけあるならちょっと服も鍵入れるじゃんみたいな感じでなんかどんどんどんどん仕事量が増えてくんだなうん意外と手抜けなかったなぁそれに比べてラバスとはどうせグラデもかけれないし変に色数も色数もなんか12個までって決まってるし"
        },
        {
          "speechId": 886,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9916880,
          "sourceEndMs": 9942200,
          "text": "なんか線も変に引くとアウトラインが出ちゃうからある程度まこのこんなもんだよねみたいな抜きどころがわかったんだけどLINEスタンプはね手の抜きどころがわからなくて難しかったわーね縛りがあった方が楽の法則だなパスパル2の法則だわ逆に縛りがあった方がむしろむしろいいみたいな"
        },
        {
          "speechId": 887,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9942660,
          "sourceEndMs": 9944660,
          "text": "うん"
        },
        {
          "speechId": 888,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9945060,
          "sourceEndMs": 9949939,
          "text": "感じがしましたはい男色霊夢さんどうもありがとうございます"
        },
        {
          "speechId": 889,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9949979,
          "sourceEndMs": 9981439,
          "text": "メンバーシップ1年どうもありがとうございますいつもありがとうこれからもよろしくお願いいたします一味に質問なのですが1ミリ望むこと控えてほしいことなどありましたらご教授くださいああそうですねありがとうございます望むことねでもなんかねこうやってなんかなんだなんだろう望むことってむずいなのね自由に押してほしいですけどね自由にしてほしいですけどね基本的にね"
        },
        {
          "speechId": 890,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9982260,
          "sourceEndMs": 9987380,
          "text": "自由にあそうだねその周りに迷惑をかけないようにとか"
        },
        {
          "speechId": 891,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 9987500,
          "sourceEndMs": 10014620,
          "text": "そんなにそんなにもしかしたらねあのー新しく入ってきたような人がコメント欄見てキッズ吉祥みたいな思うかもしれんけど船長は別にもうなんか慣れてるしねえ逆に馴染んでもろてみたいな気分でやってんだけどねまあどう思われてるかわかんないけどうんそうやってほしいことってむずいなあ"
        },
        {
          "speechId": 892,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10014780,
          "sourceEndMs": 10045040,
          "text": "みんなに迷惑がかかるようなことあーそうだなぁうーん何だろうねまあ言おうと思えば色々言えるけどなんかあんま言おうとちょっとお気持ち爆弾みたいになっちゃってねえなんかショックを受けるかもしれないから言いづらいんだよなそういうのなんか聞かれてもさ言いづらいなうん"
        },
        {
          "speechId": 893,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10045859,
          "sourceEndMs": 10049420,
          "text": "えーヒロヒのどうもありがとうございます"
        },
        {
          "speechId": 894,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10052580,
          "sourceEndMs": 10133780,
          "text": "船長の直筆嬉しいやっぱ嬉しいんだね何かあるんですねあえて言うならあえて言うなら分かって言うならかもうめっちゃ思うのはま1個1個だけじゃ言うとそうだねなんか船長今まではなんか押し続けてもらえるのが幸せなことだと思っていたんだけどなんかなんだろうねあでもこれちょくちょく言ってるけど無線長のことをもうムカついてるのにずっといられる方が嫌だなって思ったなんかあのムカついてるけど船長のこともうムカついちゃってるんだけどでも押し続けようみたいな人いるじゃんいやもういいよ無理じゃなくてって思うそれは思うかな前も言ったことあるけどうんそうですねそのことあるあるんよそれがそれがあるよなんかそんなねあでもどうなんだろうねそんなもうさあ嫌ならさもう離れればいいのになって思うんだけどでもしかして船長がさこれからもずっと一緒にいてほしいみたいな言い続けてきたからさなんかちょっとムカついたけどちょっとでもマリンとの約束があるからなみたいな次にまだ押すかみたいな感じねギリもしてんのかなみたいな感じだねうん"
        },
        {
          "speechId": 895,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10134060,
          "sourceEndMs": 10137080,
          "text": "みたいなね感じかな"
        },
        {
          "speechId": 896,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10137420,
          "sourceEndMs": 10176920,
          "text": "えーっとうんいやなんだろうむずいよねでもむずいなでもさ意外とさアンチってさ嫌いだから見ないのかつったらさ意外とそうではなくてさ嫌いだからこそ逆に熱心に見るみたいなとこもあるもんねうんむずよねなんか昔のハム太郎の孔子くんのアンチがハム太郎のファンよりハム太郎に詳しかったやつを思い出すわうんねぇマリンのアンチなんだけども誰よりマリン見ててめっちゃ詳しいみたいな全部見てるみたいな感じのこともありますしょうがないよねもうこれはどうしようもないか"
        },
        {
          "speechId": 897,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10177399,
          "sourceEndMs": 10208000,
          "text": "さんありがとうございます24号は大変だったけどねでもこんだけね直筆が嬉しいって喜んでもらえるというねやりきった甲斐があるとねやりきたからあるなマジでこんな喜んでもらえるならねえマジやってる最中はねほんま夜だけ良かった16に減らそうかなって無限に思ったけどうんいやギリ間に合ってよかったうーんありがとうございますめっちゃなんか喉ガラガラするな"
        },
        {
          "speechId": 898,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10219800,
          "sourceEndMs": 10316399,
          "text": "トミーナーさんどうもありがとうございます10月21日で21歳になりますあー輪っか若いね早めですが祝ってくださると嬉しいですよ誕生日おめでとうございますまたちょっと早いけどもおめでとうございますあだ名を決めて欲しいんだうんでも富なん割と富なん割と個性的な名前だからな富永は変えずに特殊性癖富谷にしようちょっと自分の2つな的な感じでねうんスタンプもねありがとうございますちょっと楽しみに待っててくださいこれからね審査があるので待っててくださいなうんいいエフフトに移動もありがとうございますうんうんうんいやそうだよねそう船長がねそうだよね喉を収録で喉をね壊すのが悲しいそうだよねその通りいや本当にその通りなんだけどねでもなんかさやっぱりなんかもらった案件とかさなんかメンバーの何か記念とかさその時にしかできないことじゃないその時にしかできないことなんかやっとかないとなんかもったいなくて自分的にねその時しかできないことをやりたいんよな船長もねなんでやらされてるわけじゃないのやりたいのそれをやりたくてVRグリーティングだってやったら確かに喉も消耗するからやらない方がいいんだろうけどやりたいの船長がねぇ"
        },
        {
          "speechId": 899,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10317300,
          "sourceEndMs": 10358479,
          "text": "ライブもねえみんなのね出なければいいのかもしんないけど出たいの出たいのよやりたいことだからねやりたいな船長はそれをまでも確かにね中編のゲームやりたいね確かに最近ね一発で終わるやつしかやってないからたまには長いのやりたいねがっつり時間が取れそうだったらばうーんなんか毎月毎月なんか全部型がついたなーみたいなこと思いながらカタついてなかったわみたいなことの連続な気がするけどうんねぇ"
        },
        {
          "speechId": 900,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10360859,
          "sourceEndMs": 10370120,
          "text": "まあでもどうなんだろうね顎いてなんか顎が開いたうん"
        },
        {
          "speechId": 901,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10371600,
          "sourceEndMs": 10400000,
          "text": "ありがとうございましたでもねそのなんだねありがとうございます気持ちはね嬉しい言い方もね優しく言ってくれてどうもありがとうございますうん周辺のゲームなら世界の作り方っていうゲームがおすすめですマリンの作ったゲームやうんスプラ最近やってないなぁでもなんか3期でやろうよみたいな話は上がり始めているけど"
        },
        {
          "speechId": 902,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10400279,
          "sourceEndMs": 10415840,
          "text": "うんなんか配信でさあ配信でやるのに練習しとくねっつってあのフェスフェス前とフェス中にちょくちょくちょくちょくと練習したけど"
        },
        {
          "speechId": 903,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10416120,
          "sourceEndMs": 10423160,
          "text": "まみんなでやるときになったらねちょっと見せようかなと思います"
        },
        {
          "speechId": 904,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10424279,
          "sourceEndMs": 10428920,
          "text": "まあある程度練習したしもういいから練習しなくて"
        },
        {
          "speechId": 905,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10432319,
          "sourceEndMs": 10450410,
          "text": "ジャイロ大丈夫な船長そんな酔わないかな多分うん下手になってそううんえーっと"
        },
        {
          "speechId": 906,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10450620,
          "sourceEndMs": 10467680,
          "text": "えーっとえーとえ蓬莱さんどうもありがとうございますでもまたスタンプお宝だって言ってくれてるありがとうございますスタンプありがとういっぱい褒めてくれて"
        },
        {
          "speechId": 907,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10468080,
          "sourceEndMs": 10471760,
          "text": "みんなが褒めてくれる頑張った甲斐があったな"
        },
        {
          "speechId": 908,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10472220,
          "sourceEndMs": 10482739,
          "text": "戦中視点見てみたい見せようかなねほんとうまくないからな本当うまくないから"
        },
        {
          "speechId": 909,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10482840,
          "sourceEndMs": 10488560,
          "text": "まあ次やるとしたら3期の時かなうん"
        },
        {
          "speechId": 910,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10492140,
          "sourceEndMs": 10497439,
          "text": "えーっとパンパンえーどうもありがとうございます"
        },
        {
          "speechId": 911,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10498580,
          "sourceEndMs": 10516819,
          "text": "日本に留学するんだおー日本語学校卒業したら進学するかどうかはまだ心当たりがなくて未来のこと悩んでるそっかーでも難しいな海外の"
        },
        {
          "speechId": 912,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10516859,
          "sourceEndMs": 10526359,
          "text": "海外の方が日本で暮らすアドバイスって船長が全くわかんないわかんないからなんて言っていいかわかんないけど"
        },
        {
          "speechId": 913,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10526399,
          "sourceEndMs": 10541840,
          "text": "どんなんだろうどうするのがいいんだろうねでも進学することができるなら進学した方がいいのかなって個人的にはちょっと思うけどね"
        },
        {
          "speechId": 914,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10542359,
          "sourceEndMs": 10546760,
          "text": "自分が進学しなかったからかもしれないけど"
        },
        {
          "speechId": 915,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10546859,
          "sourceEndMs": 10572920,
          "text": "いやわかんないもしかしたら船長働いたのが正解だったのかもしれないけど働いたことで得たものが逆に正解だったのかもしれないけどでもなんか自分的にはすぐ進学しなかったから進学することやな憧れはちょっとあるよねできるので進学してもいい気がするけどねー"
        },
        {
          "speechId": 916,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10573100,
          "sourceEndMs": 10615880,
          "text": "ねえいけるならうん思ったけどねえ頑張ってください日本での暮らしうんいいと先月聞きそびれたこと2年の時を経てついに購入したらしいキーマカレーメシの感想評価気になりますよキーマカレー飯さあキーマカレーシ船長ねこれは非常食に食べようって思ってまだ食べてないのずっと置いたまま食べるタイミングむずかねえかカレーメシキーマカレーメシ今日食べるかこの後この後食べるか"
        },
        {
          "speechId": 917,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10616520,
          "sourceEndMs": 10638800,
          "text": "最近LINEスタンプとか書いてたりとかさなんかいろんな収録があったりとかでうあれこれあった結果生活リズムがめちゃくちゃになって船長のオートファジーが崩壊しましたもうだめだオートファジー終わったどっかのタイミングでまた再開できたらいいけどね最近完全に終わっちゃいました"
        },
        {
          "speechId": 918,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10640939,
          "sourceEndMs": 10644800,
          "text": "9月半ばあたりから崩れたね完全に"
        },
        {
          "speechId": 919,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10645140,
          "sourceEndMs": 10653920,
          "text": "うん太ったいいやギリまだ1キロ増えたくらいうん耐えてるまだギリ"
        },
        {
          "speechId": 920,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10653960,
          "sourceEndMs": 10685359,
          "text": "キロ1kg戻ったけど結局どのぐらい続いたのあいつからやってんだっけ思い出せないいつから始めたんだっけなキーマカレー飯の感想ねわかったつぶやくはえ微妙だった時なんて言えばいいのかな普通のカレーメシ次じゃあ微妙だった時はキーマカレー飯食べた次は普通のカレンでした食べたいみたいな感じでいよう"
        },
        {
          "speechId": 921,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10687319,
          "sourceEndMs": 10690460,
          "text": "えーっとうん"
        },
        {
          "speechId": 922,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10691520,
          "sourceEndMs": 10749680,
          "text": "えーけいすけさんどうもありがとうございますマリモコン1100万再生おめでとうございますどうもありがとうございますまり箱もねまたね歌うとかで歌ってるところをお見せしたいうんいっぱい聞いてくれてどうもありがとうございますサザさんどうもありがとうございます9月は直筆メッセージはLINEの絵で本当お疲れ様でしたどうもありがとうございますええそうですね9月なんだかんだ盛りだくさんだったな収録もいっぱいあったしね直筆メッセージもいっぱい書いたしねLINEスタンプも書いてもう右手終わるって感じの腕終わり月間でしたね何気にさあスマブラした時の豆がもうすごくてあれがねあの後潰れて川がむけて1週間くらいめくれたままだったね"
        },
        {
          "speechId": 923,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10749720,
          "sourceEndMs": 10754300,
          "text": "地味に地味にねうん"
        },
        {
          "speechId": 924,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10755660,
          "sourceEndMs": 10761200,
          "text": "全体的に腕が腕がやばい時期でした"
        },
        {
          "speechId": 925,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10762380,
          "sourceEndMs": 10766540,
          "text": "えー違法関節どうもありがとうございます"
        },
        {
          "speechId": 926,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10767660,
          "sourceEndMs": 10777460,
          "text": "LINEスタンプ送る相手があんまりないんだ船長とLINE交換するか決めちゃんLINEの送り先がないため"
        },
        {
          "speechId": 927,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10778760,
          "sourceEndMs": 10791680,
          "text": "うん再生力が落ちてるえ1週間治んないのって再生力落ちてるかなそんなもんじゃないこんなもんじゃないのうん"
        },
        {
          "speechId": 928,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10793460,
          "sourceEndMs": 10816460,
          "text": "えーrn系の地さんどうもありがとうございます自分も色々締め切りに終わりながら応援してましたちなみに自分はまだ終わってません何を頑張ってるんだろう頑張れ頑張れ明日VRですよろしくお願いします頑張れ頑張れ締め切り終わったかなうん"
        },
        {
          "speechId": 929,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10816560,
          "sourceEndMs": 10847160,
          "text": "はぁもう10月早えやさんどうもありがとうございますうんうんはい愛情たっぷり愛情たっぷりの人たちはどうもありがとう店長もだって大好きさんどうもありがとうございますあ"
        },
        {
          "speechId": 930,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10849439,
          "sourceEndMs": 10866979,
          "text": "来週あ来週VRああ当たったんですね相手が海外一部だったら緊張しますかえスルスルーちゃんと聞き取れるかなあとか分かるように返事できるかなとか心配だな海外の方と会話するのは"
        },
        {
          "speechId": 931,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10867200,
          "sourceEndMs": 10879340,
          "text": "船長をねちょっとリスニング能力もね英語力もないからねぇちょっと海外珍味は喋りづらいかもしれないけどパッションでよろしくお願いします"
        },
        {
          "speechId": 932,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10881180,
          "sourceEndMs": 10908500,
          "text": "そう海外にそう海外にもね参加できるのをね今回はね毎回選挙と喋れる系のイベントはやっぱ日本とかだからちょっと参加できないってみんな言ってるから海外の人でも遠方の人でも参加できるみたいなのも目標に今回ね考えたのでうんちくりさんどうもありがとうございます"
        },
        {
          "speechId": 933,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10911140,
          "sourceEndMs": 10931180,
          "text": "なんだわしが全身くまなく隅々までマッサージしますわ船長には気分良くなってもらえると思いますよアロマも置いときますねリラクゼーション効果ありますんでなんだ普通のスパチャなんだけど何かいやらしいよろしく感じるのはマリンだけうん"
        },
        {
          "speechId": 934,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10934240,
          "sourceEndMs": 10961180,
          "text": "どうもありがとうございます最近マリンニウムが即していたので抱きしめてもよかったですが床ですよいっぱい抱きしめてください船長のこと近くに近くに行くかなはい歴史見やすいようにあれが狂ってる遠近感が狂ってるけどあー肩が"
        },
        {
          "speechId": 935,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10964279,
          "sourceEndMs": 10993580,
          "text": "激太りじいさんマリバコ1000万再生どうもありがとうございますおじさんも45Lと毎朝うっすら体調悪いんで助かってますあー隊長ねー回復やっぱしなくなるんだねーいやーでもどうなんだろうね回復力もだけどねシンプルにおじさんっていう生き物は忙しいからさそれもありそうだよねなんかゆっくりと睡眠できてないとかゆっくり休めてないのもデカそう"
        },
        {
          "speechId": 936,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 10993740,
          "sourceEndMs": 11021600,
          "text": "ジローラも96点ありがとうございますVRbriding今回は外れてしまいましたがえー船長をし続ける限りチャンスはいくらでもある挑戦した時はよろしくなのに船長もねなんかもし次開催するときはなんかなるべく大勢が当たって嬉しいみたいになるようになんか前回挑戦した人以外で当たるようにできますかとかね聞いてますよ一応次やるとしたら"
        },
        {
          "speechId": 937,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11023740,
          "sourceEndMs": 11038640,
          "text": "うんなるべくみんなとね違う人と違う人が当たるようにねできるのかないや聞いてるわかんないけどいやできるかわかんないけどねでもできたらいいなと"
        },
        {
          "speechId": 938,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11038920,
          "sourceEndMs": 11042840,
          "text": "え鍵ゴロゴロさんどうもありがとうございます"
        },
        {
          "speechId": 939,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11043660,
          "sourceEndMs": 11065220,
          "text": "軽く船長に書いてほしいと言いましたがこれほど船長の時間をすることになるとは思ってもいなかったので申し訳ない気持ちでしたいやーヨガよLINEスタンプなんてちょちょいの注意だって思われてるんだろうなって思ったでも君たち船長本当に筆遅いからごめんマジで思ってたんと違くて"
        },
        {
          "speechId": 940,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11065260,
          "sourceEndMs": 11102359,
          "text": "結構凝り性でさあ手が意外と意外に手が抜ききれないのよねうんいやーでも多分ねLINEスタンプとかアクリルキーホルダーとかラバストみたいな絵は船長は簡単に描けるってみんな思うだろうなとは思ってた実際ラストは多少楽だよ線画もね太めに描くようになってるからそんなになんかね綺麗な線を引こうみたいな感じじゃないし"
        },
        {
          "speechId": 941,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11102460,
          "sourceEndMs": 11108180,
          "text": "色塗りもベタ塗りだからラバスとは実際多少楽だけど"
        },
        {
          "speechId": 942,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11109120,
          "sourceEndMs": 11113469,
          "text": "うん"
        },
        {
          "speechId": 943,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11113560,
          "sourceEndMs": 11155100,
          "text": "えー意外とね意外と時間かかったなあいや船長が凝ったのかな凝ったのが敗因ですね凝りすぎだうんあとはちょっと舐めてた船長も後で書こうと思って直筆メッセージを優先したいんよLINEスタンプは一旦後回しにして直すメッセージ先やろうと思ってたら気づいたらもう締め切りが迫っててやばいじゃんってなって慌ててやってたみたいな感じですね"
        },
        {
          "speechId": 944,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11159220,
          "sourceEndMs": 11161640,
          "text": "えーっと"
        },
        {
          "speechId": 945,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11161800,
          "sourceEndMs": 11167579,
          "text": "見通し甘かったねマジで"
        },
        {
          "speechId": 946,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11170140,
          "sourceEndMs": 11172800,
          "text": "えーっと"
        },
        {
          "speechId": 947,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11179380,
          "sourceEndMs": 11200040,
          "text": "えーエドモンドスケベさんどうもありがとうございます今日はマリン水がいただけると聞いたので代金置いておきますマリーンスイ何マリンが漏らすってことマリースってそういうことじゃないマリンが入った風呂の水かマリンから出る水じゃないか失礼しました"
        },
        {
          "speechId": 948,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11200500,
          "sourceEndMs": 11204060,
          "text": "1回たけさんどうもありがとうございます"
        },
        {
          "speechId": 949,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11204100,
          "sourceEndMs": 11234540,
          "text": "LINEスタンプリリース楽しみにしてますありがとうございますいっぱい使ってもらえるといいなー知恵と吐く思いで頑張って書いたからなんか久しぶりに徹夜でさあ書いたわ朝まであーもう今日中だーと思って朝まで書いたわ夜なべで気づいたら朝でしたみたいなあれもう6時だみたいな感じでしたねあの感じは久しぶりだったうん"
        },
        {
          "speechId": 950,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11235540,
          "sourceEndMs": 11264779,
          "text": "流れよまずに無理やり使うな何が使いやすいかなー早く見てほしいなあ全部見せたーい全部見てほしいもう早くあんまり公開ね公開前にねちゃんと公開しちゃダメだからなんかぼかしぼかしとかなんかモザイクとかかけてチラチラ見したいけどね早く見たい早く見てほしい"
        },
        {
          "speechId": 951,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11267460,
          "sourceEndMs": 11294960,
          "text": "ミスどれぐらいあったのえっとね7個くらいやった大量どんだけミスっとんねん珠理奈さんどうもありがとうございます職業訓練校は卒業しましたえー何の何の何の資格取ったの"
        },
        {
          "speechId": 952,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11295180,
          "sourceEndMs": 11307319,
          "text": "動物園のジムとして働きましたってえーすごーい動物園楽しそうですねみんなが楽しみに来る楽しい場所で働くのも素敵ですね"
        },
        {
          "speechId": 953,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11307600,
          "sourceEndMs": 11309600,
          "text": "うん"
        },
        {
          "speechId": 954,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11311439,
          "sourceEndMs": 11316200,
          "text": "えールッピーさんどうもありがとうございますええ"
        },
        {
          "speechId": 955,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11319300,
          "sourceEndMs": 11337740,
          "text": "船長し始めてから最高がインフレッシュ気がしますわー嬉しいお言葉どうもありがとうございます素敵だなぁね楽しんで押してくれてありがとうございます嬉しいです元気もらえるわ活動しててよかった"
        },
        {
          "speechId": 956,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11337960,
          "sourceEndMs": 11339960,
          "text": "うん"
        },
        {
          "speechId": 957,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11340120,
          "sourceEndMs": 11345540,
          "text": "えートゥルーバランスのありがとうございますうんうん"
        },
        {
          "speechId": 958,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11346000,
          "sourceEndMs": 11381180,
          "text": "船長お風呂で目詰めるのが怖いらしいので代わりに頭洗いましょうか笑ってほしいお風呂怖いから一緒に入るかも一緒に入るかも君たちとねえ怖いから一緒に入ろううん香りどうもありがとうございますとある記事で船長は現在現役で活躍されているvtuberで世界2位なんだと取り上げられているのを見ましたその人と結婚してるなんてどうか私も誇らしいやら恥ずかしいやろで緊張していますどうしたマジで大丈夫か"
        },
        {
          "speechId": 959,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11381340,
          "sourceEndMs": 11422729,
          "text": "さあそんな世界に行くとか言うけどさそんなもんさーやめようよそんなのなんかあんまりなんかそういうさあ変動するじゃんそういうのって変動するものであんま喜べないんだよね船長うんどうせまた変わるしみたいな感じあんま喜べないんだよね先日のうんえーっとえなかったイチローさんどうもありがとうございます"
        },
        {
          "speechId": 960,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11423520,
          "sourceEndMs": 11438359,
          "text": "LINEスタンプ作成本当お疲れ様やで温泉でも入って疲れを癒やしてくださいはいコーヒー牛乳も買ってえんやで地獄先頭じゃねえか地獄でーすいや怖かったな地獄でした普通に"
        },
        {
          "speechId": 961,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11439479,
          "sourceEndMs": 11443220,
          "text": "マジで勘弁してくださいってなったわ"
        },
        {
          "speechId": 962,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11444880,
          "sourceEndMs": 11453529,
          "text": "えろくさんどうもありがとうございますメンバー2年ありがとうございます2年"
        },
        {
          "speechId": 963,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11454720,
          "sourceEndMs": 11465000,
          "text": "はいはいはいということだうんTwitterの名前がずっと揃わなくて揃わなくてということ"
        },
        {
          "speechId": 964,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11465520,
          "sourceEndMs": 11502800,
          "text": "6LOKの1文字も入ってないからよくフォローしてくれる一味が戸惑うこれを受けに揃えて揃えててどういう意味だ予感わかんないけどTwitterの名前を決めてほしいな何揃わないってということわかんないんだけど意味がロックだとえどういうことえわかんないLOKどういうことハンドルネームえじゃあえTwitterえどういうこと名前とIDが合わないってことIDのこと"
        },
        {
          "speechId": 965,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11504399,
          "sourceEndMs": 11523080,
          "text": "IDだったらあえIDでもまずIDどうにもよくないTwitterの表示名だけさあ変えればいいんだからどういうことでもロックさんは6さんのままでいいけどねでも一味なことを1ミが戸惑うって言うんだったら"
        },
        {
          "speechId": 966,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11523660,
          "sourceEndMs": 11529319,
          "text": "法事を海賊団でつければいいんじゃない帽子を海賊団lokで"
        },
        {
          "speechId": 967,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11530500,
          "sourceEndMs": 11566220,
          "text": "いいんじゃねうんえーっとLINEスタンプの発売はね今ですねチェック運営チェック中でこれから審査があって予定では11月頭ま来月か今出るのかなという感じかクロス&マリありがとうございますうんアセンションのフィギュアも届きましたどうもありがとうございます毎日押し続けますありがとう嬉しい嬉しいです"
        },
        {
          "speechId": 968,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11566500,
          "sourceEndMs": 11573600,
          "text": "移動してくれてありがとうデバルパネルどうもありがとうございます"
        },
        {
          "speechId": 969,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11573760,
          "sourceEndMs": 11578819,
          "text": "うーんかなりの白はでしたね"
        },
        {
          "speechId": 970,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11578979,
          "sourceEndMs": 11616200,
          "text": "えー体はねまあでも整体とかをね行かせていただいたりしておりますはいありがとうございます愛してます結婚してくださいありがとうございますこんな感じでどうかなっていうどうかなって西洋に年内にできそうセオディションね今ね色々ねちょっとやりとりして準備を進めてるんですがまあ色々とね色々とやらなきゃいけないことが様々ありちょっと大掛かりになってるのでヌルっとはまだ開催できなくてちょっと準備が多いんですね色々わけがあって"
        },
        {
          "speechId": 971,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11622479,
          "sourceEndMs": 11632279,
          "text": "あでも手が空いたからあれを進めようと思ってるけどねえっとあれちょっと待って"
        },
        {
          "speechId": 972,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11636580,
          "sourceEndMs": 11639180,
          "text": "手を開いたから"
        },
        {
          "speechId": 973,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11639939,
          "sourceEndMs": 11668580,
          "text": "オフコーデバトルとか進めたいけどねうんそうあれは船長が素体を作んなきゃいけないかな裸の服を着せるようなねぇちょっと絵を描く手が開いたからまだ素体作ってやるかって感じうんオホーツクさんどうもありがとうございます"
        },
        {
          "speechId": 974,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11669460,
          "sourceEndMs": 11678840,
          "text": "船長自身が書いてるから史上最高のスタンプがあやっぱそんなにいいのかなやっぱ船長が書いてるってそこまでもあどがあるのかなあ"
        },
        {
          "speechId": 975,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11679779,
          "sourceEndMs": 11738720,
          "text": "参加予定は誰や変わるかもしんないからまだ言わないとはもう決めてるけど変わっちゃったらあれち変わったのって言われるから言わないのくんうんいやでもそんなにねそんなに言ってもらえるならね自分で書いてよかったかそうか大変だったけどね本当にここまでする意味あるのかって思ったけどねぇ船長がこんなにねえこんなに必死に書いたってどうせ君たちのせちゃうこのぐらい1秒で書けるだろって思いながら船長が描けばって言ったんでしょって思ってたけどそこまで喜んでくれてるのを見たら本当に船長が書いたのがいいって思ってくれてたんだなって嬉しくなったわ嬉しいありがとういや嬉しいなぁ嬉しい報われたわ報われた本当にありがとう嬉しいな"
        },
        {
          "speechId": 976,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11738880,
          "sourceEndMs": 11760380,
          "text": "笑顔になっちゃったぞねさんありがとうございますうんえーっとフロライブフロライナーまたあってもいいよねまあでも3期生でやったから次やってもうちらじゃないかもしんねえけど"
        },
        {
          "speechId": 977,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11765180,
          "sourceEndMs": 11781340,
          "text": "ちょっとシャーでも飲むか"
        },
        {
          "speechId": 978,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11782260,
          "sourceEndMs": 11784439,
          "text": "えーっと"
        },
        {
          "speechId": 979,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11786100,
          "sourceEndMs": 11801600,
          "text": "うん暁さんはつり屋台初込み外せばありがとうございますね初めてどうでした最近入ってくれた方なのかなね楽しめたありがとうございます"
        },
        {
          "speechId": 980,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11802600,
          "sourceEndMs": 11844439,
          "text": "選ばれす船長押しの黒蛇さん初見ですありがとうございますねぇ来てくれてありがとうございます一目惚れしたんだありがとうえーチャンネル登録も先月からですがこれからもしていきますありがとうございますねー電源とかもねちょっと先月あんまできなかった今月は色々やりたいうんげんこつむすびさん初スパチャどうもありがとうムラッシュさんの動画でございます船長に励ましていただいたおかげで染色成功しましたなんとすごくねおめでとうございます"
        },
        {
          "speechId": 981,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11844600,
          "sourceEndMs": 11868260,
          "text": "新しい職場は楽しんでくださいねうんリラックマ遊園地見せた山田見てないのよいやでも意外とあれ結構何話もあるみたいでこんないっぱいあると見るの大変かなと思って君たちと思った"
        },
        {
          "speechId": 982,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11874000,
          "sourceEndMs": 11878340,
          "text": "え旗口さんどうもありがとうございます"
        },
        {
          "speechId": 983,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11884200,
          "sourceEndMs": 11887100,
          "text": "ユニゾン練習してるんだ"
        },
        {
          "speechId": 984,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11887500,
          "sourceEndMs": 11904500,
          "text": "ここ1ヶ月仕事終わって船長の曲聴きながら1時間ウォーキングしてたら5キロも痩せましたすっごい5キロいやすげー1ヶ月で5キロエグいないやお疲れ様です頑張っててすごい"
        },
        {
          "speechId": 985,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11904600,
          "sourceEndMs": 11908340,
          "text": "ヘタレなシーンのじいさんどうもありがとうございます"
        },
        {
          "speechId": 986,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11908500,
          "sourceEndMs": 11926939,
          "text": "うんうんうんバイクの免許をいいねバイクでもバイクはやっぱ結構見てる限りさすごい事故を多いからねえぶつかったら大体負けるもんなバイク実が出てるもんね気をつけてね事故ラインに"
        },
        {
          "speechId": 987,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11930120,
          "sourceEndMs": 11953399,
          "text": "バーニングスエルさんお誕生日おめでとうございます自殺スパちゃんどうもありがとう30歳おめでとうございます先にこっちで待ってるぜ30歳の世界いや30歳まだまだ邪魔だ私先だけどまだまだ先だけさいやー早く先輩方に追いつきたいですまりも"
        },
        {
          "speechId": 988,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11954340,
          "sourceEndMs": 11963660,
          "text": "先行のアザラシさんメンバー登録&翼どうもありがとうございますいつもお世話になってますこちらこそお世話になってますうん"
        },
        {
          "speechId": 989,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11964779,
          "sourceEndMs": 11969120,
          "text": "小川誠さんはどうもありがとうございます"
        },
        {
          "speechId": 990,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 11970720,
          "sourceEndMs": 12025939,
          "text": "えーもうもみじ12603えースパチャありがとうございますバイト中バイト中にバイト中なのにありがとうそしてお誕生日おめでとうございます人生はありがとう19歳なの若いねバイトも頑張ってでその19歳のバイト代の中だったらねぇ大変な大金だと思うんですけどねありがとうございますねこれからいっぱいね人生を犯してくださいマオンナさんもどうもありがとうございます来週のみんな喜んでくれてるなぁありがとうございますいっぱいね使ってくださいまだ先だけど出るのそれいきアリスさんの動画ありがとうございます最近自分の仕事が忙しくなって大変ですが船長の谷元気もらいながら頑張ってますありがとうございます"
        },
        {
          "speechId": 991,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12029840,
          "sourceEndMs": 12041739,
          "text": "ちょっとでもね元気与えられてたらいいよな"
        },
        {
          "speechId": 992,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12050359,
          "sourceEndMs": 12077240,
          "text": "アザラシさん人生初スパチャはどうもありがとうございますうんありがとうあーちゃん中1中1だってお誕生日おめでとうございます中1ってことはお誕生日迎えたら13歳ねえまだまだまだまだ未来は無限大だね"
        },
        {
          "speechId": 993,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12077880,
          "sourceEndMs": 12092479,
          "text": "出航敗者さんなんと上限ありがとうございます無言だしクールだなこりゃねえありがとうございます白エコテさんありがとうございます無言ですけれども"
        },
        {
          "speechId": 994,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12092580,
          "sourceEndMs": 12126920,
          "text": "ええとうんえパキパキレンタルさん人生初スパチャどうもありがとうございます地獄の夜勤目次や焼き芋クイズ苦しかったなマジでねぇトラウマになったわ大学の卒業試験頑張ってください応援してますそっか大学は卒業するのに試験があるんだね大学行ったことないからなあそんな感じなんだやお勉強頑張っててすごい応援してますうん"
        },
        {
          "speechId": 995,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12128819,
          "sourceEndMs": 12138500,
          "text": "いいとえーゆずきちさんどうもありがとうございますうん"
        },
        {
          "speechId": 996,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12139020,
          "sourceEndMs": 12143000,
          "text": "サウナあまりいかないって言ってましたが"
        },
        {
          "speechId": 997,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12143340,
          "sourceEndMs": 12168080,
          "text": "温泉銭湯とかってよく行くんですか温泉行かないね行かぬうんそもそも家の風呂ですら入るのダリーニーいちいちさ風呂入りに出かけるかつって行かないよねいちいちで風呂入るために出かけないよねめんどくせーわ普通に"
        },
        {
          "speechId": 998,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12168920,
          "sourceEndMs": 12172700,
          "text": "この面と行ってきてどうぞ"
        },
        {
          "speechId": 999,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12175439,
          "sourceEndMs": 12182060,
          "text": "めんどくせーまあでもなんかね温泉旅行とかはいいかもしれないね"
        },
        {
          "speechId": 1000,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12182340,
          "sourceEndMs": 12194960,
          "text": "うーんえなんかね船長ね風呂入るために大浴場行くぞーみたいなあの移動とかもだるいから部屋についてる風呂入りたいけどね普通に"
        },
        {
          "speechId": 1001,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12198600,
          "sourceEndMs": 12203840,
          "text": "えーフランスフランシスライトさんどうもありがとうございます"
        },
        {
          "speechId": 1002,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12204960,
          "sourceEndMs": 12210200,
          "text": "いやー慌てたな配置パズルのやつね"
        },
        {
          "speechId": 1003,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12212160,
          "sourceEndMs": 12264380,
          "text": "個性的で尖ったスタンプもあり面白そうなんで諦め楽しみにいやめっちゃ尖ってるよスタンプまじで超尖ってるでもね使ってみて気づいたのは文字がないスタンプが一番使いやすいマリンゴルフいらないはい声優でしたね収録物の今後公開されると思うので今年の秋とても期待していますありがとうございますまあなんだろ収録した系そうだねだいたいうん秋頃に秋の間にポロポロ収録した系は出てきてま専用オジションとかはちょっと準備がねめっちゃあるからちょっとまだ先かなーって感じですね年内きついかなくらいの勢いホロネーオーディションは多分先にできるけど雑草魂さんどうもありがとうございます"
        },
        {
          "speechId": 1004,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12265020,
          "sourceEndMs": 12297979,
          "text": "船長大好きですありがとうございますいやされました船長は癒されましたうんえーと明日何話せばいいんや船長はどんな話聞きたいえー何でもでもさそのチケットを取ったってことは船長と話したかったんでしょ船長目の前にしてね何も話すことない人は船長目の前にして思うことをさ言ってくれればいいよ"
        },
        {
          "speechId": 1005,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12298080,
          "sourceEndMs": 12300859,
          "text": "船長目の前にしてさ"
        },
        {
          "speechId": 1006,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12301020,
          "sourceEndMs": 12368499,
          "text": "年末には手こまりがあるかないやさ思ったんだけどぺこら年末多分めっちゃ忙しいんだよね雰囲気絶対めっちゃ忙しいんだよなぁこの手こまりしてる場合じゃない可能性浮上してるけど行けるのかな多分めっちゃ忙しいんよな聞いてみるか後で聞いてみよう最後まで絶対年末死ぬの忙しいよねって今んちやった方がいいかなみたいなうんねええーっと黒黒星ルーダさんどうもありがとうございますうんうんスタンプ送る相手はそんなにいませんが心のこもったものだと思いますので使い散らかしたいと思いますありがとうございます嬉しいちょっと送る相手がいないからあれだよなんか公式アカウント相手に送り散らかすお母さんに怒るお母さんに"
        },
        {
          "speechId": 1007,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12371100,
          "sourceEndMs": 12386420,
          "text": "優位星人さんどうもありがとうございますうん就職試験受かりましたあとおめでとうございますあとは車の免許が頑張ってください応援してます着実に結果を出している"
        },
        {
          "speechId": 1008,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12387239,
          "sourceEndMs": 12399319,
          "text": "ナイスですルーさん初コメ外す時はどうもありがとうございます"
        },
        {
          "speechId": 1009,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12399779,
          "sourceEndMs": 12405140,
          "text": "いっぱい叫んでいたので喉には気をつけてくださいいやマジ叫んだな"
        },
        {
          "speechId": 1010,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12406319,
          "sourceEndMs": 12416239,
          "text": "最後怖すぎた終われんの本気で勘弁してほしいえー大神さんどうもありがとうございます"
        },
        {
          "speechId": 1011,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12417300,
          "sourceEndMs": 12434300,
          "text": "メンバー入って2年ありがとうございます飽きっぽい性格の自分を2年間ずっと無事にさせたいい女ありがとうございますいや結構2年経過しましたの方もねかなり多くなってきてるからね3年目4年目バッチもこれから作っていきたいですね"
        },
        {
          "speechId": 1012,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12436739,
          "sourceEndMs": 12452420,
          "text": "船長呼ばれるの苦手って言ってるもんなそうなんか追っかけられる上に捕まったら即死系がもう本当に苦手なの本当に怖いなんか撃退的な意見本当に無理ロアさん人生外しましたどうもありがとう"
        },
        {
          "speechId": 1013,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12452880,
          "sourceEndMs": 12458120,
          "text": "スケスケ京介さんのありがとうございますええ"
        },
        {
          "speechId": 1014,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12459540,
          "sourceEndMs": 12497600,
          "text": "すでに見せていただいたLINEスタンプでもの時点でも船長の手書きでよかった感じられていますおー良かったです仕上がりお楽しみに24個さあ一体どんなものが入っているのか結構ね面白いのもね入れたんでいや反応が早く見たいなー早く見たいな反応がうきうきワクワクはい楽しみです最後見てほしいもうこんな頑張って書いたのに出るの1ヶ月後かよ早く見てほしいんだが早く見せびらかしたいんですけどはいうんそしてそしてと"
        },
        {
          "speechId": 1015,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12497700,
          "sourceEndMs": 12500300,
          "text": "そしてそして"
        },
        {
          "speechId": 1016,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12505819,
          "sourceEndMs": 12513920,
          "text": "ね今ログをねログをあさり散らかしておりますから"
        },
        {
          "speechId": 1017,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12525560,
          "sourceEndMs": 12531920,
          "text": "なんか順番が順番がめちゃめちゃだこれ"
        },
        {
          "speechId": 1018,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12532140,
          "sourceEndMs": 12549560,
          "text": "ラスカル洗い熊さん初見ですありがとうございます介護士です老後任してくださいちょっとあのーねマリーはあれだからピンピンコロリでそんなにね長く生きるつもりないから"
        },
        {
          "speechId": 1019,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12551040,
          "sourceEndMs": 12569239,
          "text": "美しい若くて美しいまま死ぬと決めてるからマリンは魔女はおばあちゃんにはならないのよと何78歳までは確定なんでそのことが分かるのかななんでそういうことか分かんのよ"
        },
        {
          "speechId": 1020,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12569279,
          "sourceEndMs": 12581120,
          "text": "うんアクセラさんどうもありがとうございますLINEスタンプ楽しみ友達にも配布しますねありがとう嬉しい嬉しい嬉しい友達にも押し付けてください"
        },
        {
          "speechId": 1021,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12583520,
          "sourceEndMs": 12599479,
          "text": "どうもありがとうございますうんマリー選手自身が帰ってくださったことに感謝ありがとうえ喜んでくれてありがとうえ書いたからやったーガチでうん"
        },
        {
          "speechId": 1022,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12599640,
          "sourceEndMs": 12669319,
          "text": "姫路の反応を見てようやく書いた甲斐があったと思えたわこんなに大変な思いしたけどこれ害虫で良かっただろうみたいな感じめっちゃ思ってたんだけどねぇこんなに喜んでもらえるなら書いてよかったわだらだらだらぶちさん先月から一味になりました外すパどうもありがとううん思ってたのがいいだって店長が書いてもねプロの方に帰るのもらった方がねクオリティ高いし普通にねえ船長も書かなくていいしねえどう考えても害虫でいいだろうと思ったけどこんなに喜んでもらえるものなら書いて帰ったなぁ嬉しくなった嬉しい嬉しいっすうん少々にゃんこ様どうもありがとうございます僕の人生にエネルギー注入されたエネルギー注入エネルギー注入中の注入うん届いたかなマリンのエネルギーうん"
        },
        {
          "speechId": 1023,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12669960,
          "sourceEndMs": 12672439,
          "text": "えーっと"
        },
        {
          "speechId": 1024,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12673560,
          "sourceEndMs": 12683960,
          "text": "フェニックスひかるさん人生初スパドンありがとうございます200万突破やまび箱1000万再生ねありがとうございます"
        },
        {
          "speechId": 1025,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12684840,
          "sourceEndMs": 12710779,
          "text": "船長を教えできて本当に幸せですいや嬉しいなぁ八尾してて幸せだなんて言ってもらえて本当に嬉しいありがとうございます嬉しいです心が洗われるがこういうコメント見てると早紀さんメッセージが嫌いスタンプをお疲れ様でしたどうもありがとうございます頑張らせていただきましたうん"
        },
        {
          "speechId": 1026,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12713640,
          "sourceEndMs": 12717080,
          "text": "うんえっと"
        },
        {
          "speechId": 1027,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12721220,
          "sourceEndMs": 12732110,
          "text": "どうもありがとう怖いゲームだったねごめんね怖い思いして"
        },
        {
          "speechId": 1028,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12732300,
          "sourceEndMs": 12748700,
          "text": "えー4さんもありがとうございますお風呂怖くなってないもうねちょっと怖いなあ気配感じることあるもんねなんか多分気のせいなんだけどね余裕で"
        },
        {
          "speechId": 1029,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12750359,
          "sourceEndMs": 12759560,
          "text": "いいと小森たよまるさんどうもありがとうございますうん"
        },
        {
          "speechId": 1030,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12760859,
          "sourceEndMs": 12769580,
          "text": "大丈夫完成おめでとう由来スタンプのお祝いめっちゃいっぱいありがとうございますアサギさん初スパどうもありがとう"
        },
        {
          "speechId": 1031,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12770880,
          "sourceEndMs": 12773060,
          "text": "えー"
        },
        {
          "speechId": 1032,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12776760,
          "sourceEndMs": 12790640,
          "text": "だて遠藤ミルクさん新入地面のJDですJDって言葉女子大生やば女子大生がいるんだけどエッチすぎるはいありがとうございます"
        },
        {
          "speechId": 1033,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12791100,
          "sourceEndMs": 12823819,
          "text": "うんいちいちくさんもどうもありがとうあれこれ4だかあれ読んだかあ余裕になってきたえーマットさんもどうもありがとうございますうん船長の可愛い叫び声堪能しました叫び声なんて可愛くないでしょありがとうデビューさんくどいかもだけどせんじゃないグッズ絵のグッズ本当に嬉しい頑張ってくれてありがとうございます"
        },
        {
          "speechId": 1034,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12824700,
          "sourceEndMs": 12834080,
          "text": "また船長の書いたグッズ出してもらえるとまあ船長の書いたグッズ嬉しいのマジか"
        },
        {
          "speechId": 1035,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12835260,
          "sourceEndMs": 12845450,
          "text": "嬉しいんだ船長の書いた何が欲しいじゃあ1個聞くわ以上の階段何が欲しい"
        },
        {
          "speechId": 1036,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12848040,
          "sourceEndMs": 12850100,
          "text": "うん"
        },
        {
          "speechId": 1037,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12851640,
          "sourceEndMs": 12853640,
          "text": "うん"
        },
        {
          "speechId": 1038,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12854340,
          "sourceEndMs": 12857479,
          "text": "あくす"
        },
        {
          "speechId": 1039,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12858120,
          "sourceEndMs": 12864380,
          "text": "みたいなミニ式時ありだな印刷のやつでしょ"
        },
        {
          "speechId": 1040,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12864420,
          "sourceEndMs": 12867319,
          "text": "書いて印刷のやつね"
        },
        {
          "speechId": 1041,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12869399,
          "sourceEndMs": 12886460,
          "text": "ミニ式仕上げたなぁ実際あるだな身にしきしをあのーいくつか限定で直筆直筆メッセージとかつけてね"
        },
        {
          "speechId": 1042,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12889200,
          "sourceEndMs": 12891200,
          "text": "うん"
        },
        {
          "speechId": 1043,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12891540,
          "sourceEndMs": 12908419,
          "text": "身にしきしガチャいっぱいが書かなきゃいけないいっぱい書かなきゃいけないミニ意識したしかになかったなその発想はなかったわ飾りやすいしね身にしきし"
        },
        {
          "speechId": 1044,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12909300,
          "sourceEndMs": 12920359,
          "text": "えでもねセンチのね次次の次期必須の時は1人1個までにちゃんと言ったよ1人1個までにしてください」って言った"
        },
        {
          "speechId": 1045,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12920520,
          "sourceEndMs": 12929239,
          "text": "えらいでしょ君たちにね怒られたからちゃんと1人1個に変えたからうん"
        },
        {
          "speechId": 1046,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12929399,
          "sourceEndMs": 12970399,
          "text": "えーっとえっとリオンさんどうもありがとうございます直筆サインも買えずVRも落選した生きている価値のない哀れな自分に一言くださいLINEスタンプ買いますありがとうございますいやそんなことないな生きてる勝ちななんてことない直筆サインもこれからもチャンスがあるしVRもこれからもチャンスがあるじゃん無限大だわねえまだまだチャンスはあるこれからもあるうん"
        },
        {
          "speechId": 1047,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12972120,
          "sourceEndMs": 12978620,
          "text": "えーっとトナカイさん私パジャマありがとう"
        },
        {
          "speechId": 1048,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 12980100,
          "sourceEndMs": 12998420,
          "text": "痩せるらさんあげて全部本日マリンPC届きましたなんとマリンPCゲットありがとうございますどうかなどうかなねぇどうですか使ってみての感想もお待ちしています1がミルクさん初スーパじゃどうもありがとううん"
        },
        {
          "speechId": 1049,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13001100,
          "sourceEndMs": 13011200,
          "text": "禁煙2年目だってすごーい船長がいたからこそ達成できました何かご褒美いただけないでしょうかそうだなあ"
        },
        {
          "speechId": 1050,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13011420,
          "sourceEndMs": 13013779,
          "text": "そうだな"
        },
        {
          "speechId": 1051,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13014060,
          "sourceEndMs": 13029080,
          "text": "タバコを吸わない代わりにツンマリンのどこが吸ってもどこ行ったらなんか汚い込めらになるなりそうだからやっぱり答えなくていいよ"
        },
        {
          "speechId": 1052,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13031819,
          "sourceEndMs": 13036760,
          "text": "キモいからさ答えなくていいようん"
        },
        {
          "speechId": 1053,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13037939,
          "sourceEndMs": 13042640,
          "text": "えーっと慎太郎さんありがとうございます"
        },
        {
          "speechId": 1054,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13042859,
          "sourceEndMs": 13047140,
          "text": "うん無言ですがありがとうございます"
        },
        {
          "speechId": 1055,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13047239,
          "sourceEndMs": 13049540,
          "text": "講座数ね"
        },
        {
          "speechId": 1056,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13050120,
          "sourceEndMs": 13054760,
          "text": "そこか口座か"
        },
        {
          "speechId": 1057,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13055220,
          "sourceEndMs": 13057939,
          "text": "愛されてないななんか"
        },
        {
          "speechId": 1058,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13058220,
          "sourceEndMs": 13062380,
          "text": "殺すんかよ愛されてない"
        },
        {
          "speechId": 1059,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13062660,
          "sourceEndMs": 13080239,
          "text": "愛されてないえーっとうん翔太fromこう"
        },
        {
          "speechId": 1060,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13080479,
          "sourceEndMs": 13108819,
          "text": "バーツさんお初ですお初ですありがとうございますうん喉がアンニャンニャしてるアニャンにしますうんR1ゼロさんどうもありがとうございます船長の阪神もっと見たいですそれはそうだよねその通りだよねそうだと思いますその通りだと思います"
        },
        {
          "speechId": 1061,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13109700,
          "sourceEndMs": 13127840,
          "text": "増やしたいと思ってますマリモもあれも増やさそうやしたいと思ってますすいませんね"
        },
        {
          "speechId": 1062,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13128420,
          "sourceEndMs": 13144160,
          "text": "えーっと船長の飼い犬さんゲームクリアおめでとうございます先週誕生日だったので祝ってくださいでお誕生日おめでとうございました良い1年になりますよーに"
        },
        {
          "speechId": 1063,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13146720,
          "sourceEndMs": 13201640,
          "text": "ごんマリスさんどうもありがとうございます明日対戦よろしく明日いらっしゃるんですね話すのがあまり得意ではなく電気デッキぐらいしかないのですが何かという人がいるのでしょうか電気デッキってさあなんかおしゃべりフェスみたいなさ現地に集まる系ならまだしもさん君とマリン全然違う空にいるのに転記できていやー今日すごい雨ですねいやこっち晴れてますねみたいな感じのなっちゃうようんいやでも船長目の前にしたらね多分可愛いしか言えなくなるでしょうね船長小さい小さいあすごい細い腰だなみたいな感じになると思う思いますのでまあどうせ可愛いしか言えなくなるでしょうね君たちはこのマリンの美貌を前にうんちんちくりするあそういうこと言っちゃうんだ"
        },
        {
          "speechId": 1064,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13202100,
          "sourceEndMs": 13225140,
          "text": "ちんちくりんですねって言われたらしゃがんでしゃがんでよりちんちくりになってるわしゃがめるかななんかいつもとちょっと違うんだよね動きに動きにあの規制があってうん思ったより動けないかもえータス君さありがとうございますカムサハムニダ"
        },
        {
          "speechId": 1065,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13233479,
          "sourceEndMs": 13253379,
          "text": "私が絵を描くスピードをよくできる練習方法を探しましたが広告で誤解される方スパチャに吹きませんどういうことだろうちょっと難しいこれ翻訳だからGoogle翻訳だからちょっと難しい文章になってる"
        },
        {
          "speechId": 1066,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13253779,
          "sourceEndMs": 13260500,
          "text": "ちょっとわかんないすいませんありがとうございますガチャと"
        },
        {
          "speechId": 1067,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13260600,
          "sourceEndMs": 13272620,
          "text": "うんアンセムさんどうもありがとうございます今月の面白ボディラインですお楽しみボディなカード7さんどうもありがとうございます"
        },
        {
          "speechId": 1068,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13273739,
          "sourceEndMs": 13289300,
          "text": "うちのお風呂サウナ機能あるから一緒に入るえー富豪もしかして君富豪なのか家の風呂にサウナ機能あるってことあるの符号うんええ"
        },
        {
          "speechId": 1069,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13290540,
          "sourceEndMs": 13295420,
          "text": "うんダークライブとかでもまた見たい"
        },
        {
          "speechId": 1070,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13296960,
          "sourceEndMs": 13334180,
          "text": "そういうのもありかでも多分ねバーチャルキャストのがバークライブより近くでは見れるよまでワークライブのが多分ライブはしやすいんだけどねうんでもあんまりねただでさえねあのー自分のまあまあまあまあまあでもちょっとまあスケジュールに余裕が出たらそういうのもやりたいですねうんあーまた明日から出張も出張多いなあ多いね大変だお疲れ様です"
        },
        {
          "speechId": 1071,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13336560,
          "sourceEndMs": 13342880,
          "text": "頑張れそうな撮影はささやき声の応援ボイスが欲しい大丈夫か"
        },
        {
          "speechId": 1072,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13343000,
          "sourceEndMs": 13348739,
          "text": "ちょっとちょっと声ガラガラなんだけど若干はい"
        },
        {
          "speechId": 1073,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13350060,
          "sourceEndMs": 13352479,
          "text": "何だろう"
        },
        {
          "speechId": 1074,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13354500,
          "sourceEndMs": 13358840,
          "text": "VRグリーティングなんて"
        },
        {
          "speechId": 1075,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13360560,
          "sourceEndMs": 13363220,
          "text": "何回でも"
        },
        {
          "speechId": 1076,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13369739,
          "sourceEndMs": 13375380,
          "text": "君の出張に"
        },
        {
          "speechId": 1077,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13375560,
          "sourceEndMs": 13382180,
          "text": "船長をするって言ったらどうでしょうか"
        },
        {
          "speechId": 1078,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13382580,
          "sourceEndMs": 13385120,
          "text": "粘土ロイドなど"
        },
        {
          "speechId": 1079,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13386840,
          "sourceEndMs": 13389739,
          "text": "しっちゃ頑張って"
        },
        {
          "speechId": 1080,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13391180,
          "sourceEndMs": 13400779,
          "text": "はい迫真ささやきボイスでしたうん"
        },
        {
          "speechId": 1081,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13401120,
          "sourceEndMs": 13413080,
          "text": "和宮さんどうもありがとうございます私パン船長が初めてありがとうございますねこのライブ楽しんでもらってありがとうございます"
        },
        {
          "speechId": 1082,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13416319,
          "sourceEndMs": 13423700,
          "text": "アイルさん最近見始めてくれてどうもありがとうございますこれからもよろりんちょ"
        },
        {
          "speechId": 1083,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13424640,
          "sourceEndMs": 13428979,
          "text": "黒に朝の人生初戦どうもありがとうございます"
        },
        {
          "speechId": 1084,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13429560,
          "sourceEndMs": 13435880,
          "text": "うんエドさんはありがとうございますうん"
        },
        {
          "speechId": 1085,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13435920,
          "sourceEndMs": 13457120,
          "text": "1年間の海外暮らしから日本に帰ってきましたええなれない環境のストレスもありましたが船長の存在に癒されてる無事乗り切ることができましたなんとお疲れ様でございました1年間の海外暮らしすごいなぁ"
        },
        {
          "speechId": 1086,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13458120,
          "sourceEndMs": 13465620,
          "text": "日本でゆっくり過ごしましょうこう小麦さんお誕生日おめでとうございます"
        },
        {
          "speechId": 1087,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13465739,
          "sourceEndMs": 13496960,
          "text": "夜1年にしてくださいヘラプラスの本体さんもありがとうございますマリバコ1000万再生突破ありがとうございます他のvtuberの方が歌ったり踊ったりしてるのみたいな期待されてるんだなと誇らしい気持ちになりましたいや嬉しいですよねー君たちがいっぱい聞いてくれたりねあんまり普段見ない女の子とかね若い女の子の層とかね他のvtuberの方とかがね聞いてくれて踊ったりしてくれてんのは嬉しいですね"
        },
        {
          "speechId": 1088,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13497359,
          "sourceEndMs": 13513500,
          "text": "うんえーまるまるちhmx133外しぱちはどうもありがとうございます賢い距離最高ですか"
        },
        {
          "speechId": 1089,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13515720,
          "sourceEndMs": 13526660,
          "text": "近すぎるかさすがに近いかちょっと化け物だよもう地下すぎてね"
        },
        {
          "speechId": 1090,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13527359,
          "sourceEndMs": 13535159,
          "text": "遠近感狂ってる消せばいいんだよこれを"
        },
        {
          "speechId": 1091,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13535279,
          "sourceEndMs": 13547640,
          "text": "消しちゃえばしちゃえばよかったラッキーセブンさん人生外すバージョンありがとうございますうん"
        },
        {
          "speechId": 1092,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13548260,
          "sourceEndMs": 13559899,
          "text": "どうもありがとうございますダメだもう船長めちゃくちゃ可愛い船長大好き船長というの本当楽しい急に限界がしてる何ありがとうございます"
        },
        {
          "speechId": 1093,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13559960,
          "sourceEndMs": 13584500,
          "text": "さまどうもありがとうございますLINEを交換する機会が割と多いので不況に使うには是非ともぜひとも死ぬほど時間かかったんでいっぱいいっぱい使ってくださいうんえーパーセック11サーモンのおめでとうございます魂コメント作ったら今から楽しみです前兆も楽しみです"
        },
        {
          "speechId": 1094,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13589819,
          "sourceEndMs": 13613600,
          "text": "錬金中でボロボロの体も船長の配信で癒されました錬金と大変ですねーなるべくゆっくり休んでくださいありがとうございます現金か錬金術師錬金きついよね船長費用はだから13錬金とかが限界だな"
        },
        {
          "speechId": 1095,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13614960,
          "sourceEndMs": 13616960,
          "text": "うん"
        },
        {
          "speechId": 1096,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13619220,
          "sourceEndMs": 13621700,
          "text": "えーと"
        },
        {
          "speechId": 1097,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13622939,
          "sourceEndMs": 13659620,
          "text": "白松さんお誕生日おめでとうございます言ってててちぺちおさんもありがとうございます今日職場で後輩と船長の話しました曲だけ知ってたみたいなので船長の良さと汁のデカさを熱く語ってきましたどうだろうハマってくれたかな不況どうもありがとうございますまたなわけで今日はちょっとこの辺にさせてもらおうかな明日はVRグリーディングでお会いする君たち対戦よろしくお願いいたしまーす"
        },
        {
          "speechId": 1098,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13659920,
          "sourceEndMs": 13676580,
          "text": "ありがとうございましたきましてありがとうほら一緒にやってくれてあ怖かったけどギリ耐えたわはいそれでは行きましょう集合ありがとう"
        },
        {
          "speechId": 1099,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13678880,
          "sourceEndMs": 13689000,
          "text": "を隠す箱秘宝に香る油揚げないで"
        },
        {
          "speechId": 1100,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13695060,
          "sourceEndMs": 13716600,
          "text": "これ[拍手]当てたら君たちになんて言ってあげるべきかな探してたのは惑星であーそんなに噛み付いちゃダメだぞかなお宝エールも魅力的なもの見つけちゃったいいじゃないその"
        },
        {
          "speechId": 1101,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13716899,
          "sourceEndMs": 13724760,
          "text": "赤極上背徳の基本を私"
        },
        {
          "speechId": 1102,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13730399,
          "sourceEndMs": 13744140,
          "text": "雨が降れ漂う香りを高くわからないで開けてみてー"
        },
        {
          "speechId": 1103,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13745819,
          "sourceEndMs": 13754600,
          "text": "セクシー世界地図は捕まえたくない"
        },
        {
          "speechId": 1104,
          "sourceVideoId": "kNX-wQTvsws",
          "sourceStartMs": 13756399,
          "sourceEndMs": 13763000,
          "text": "私の甘さが欲しいです"
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
          "summary": "string",
          "whyItCanBeClipped": "string",
          "sourceVideoId": "string",
          "sourceStartMs": "number",
          "sourceEndMs": "number",
          "supportingSpeechIds": [
            "number_or_range_string"
          ],
          "representativeQuote": "string",
          "riskNotes": [
            "string"
          ]
        }
      ]
    }
  }
}
```
