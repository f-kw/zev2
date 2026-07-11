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
      "durationSec": 11824.121,
      "rawSegmentCount": 53180,
      "promptSegmentCount": 1749,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 1,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 60482,
          "sourceEndMs": 62324,
          "text": "このマリンを本物の海賊に"
        },
        {
          "speechId": 2,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 150610,
          "sourceEndMs": 153112,
          "text": "ってなんだ?"
        },
        {
          "speechId": 3,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 153112,
          "sourceEndMs": 163720,
          "text": "今日は二人で作業するんですけれどもねそうなんですけどもねちょっと待ってコーネそこいたら邪魔じゃない?"
        },
        {
          "speechId": 4,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 163720,
          "sourceEndMs": 167062,
          "text": "コーネもっと下げていい?"
        },
        {
          "speechId": 5,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 167062,
          "sourceEndMs": 178451,
          "text": "確かに邪魔だなコーネバカ野郎コーネのいい位置を探すかちょっとどうしようかな天の声的な感じで天の声?"
        },
        {
          "speechId": 6,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 178451,
          "sourceEndMs": 178571,
          "text": "上?"
        },
        {
          "speechId": 7,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 180554,
          "sourceEndMs": 183835,
          "text": "これ弾だろうがよ!"
        },
        {
          "speechId": 8,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 183835,
          "sourceEndMs": 184495,
          "text": "おい!"
        },
        {
          "speechId": 9,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 184495,
          "sourceEndMs": 185216,
          "text": "ヒルなんですよ!"
        },
        {
          "speechId": 10,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 185216,
          "sourceEndMs": 188257,
          "text": "やめろよ!"
        },
        {
          "speechId": 11,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 188257,
          "sourceEndMs": 190257,
          "text": "ヒルなんですどうしよう?"
        },
        {
          "speechId": 12,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 190257,
          "sourceEndMs": 191938,
          "text": "どこに?"
        },
        {
          "speechId": 13,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 191938,
          "sourceEndMs": 193198,
          "text": "まず、あれか?"
        },
        {
          "speechId": 14,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 193198,
          "sourceEndMs": 193778,
          "text": "音声?"
        },
        {
          "speechId": 15,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 193778,
          "sourceEndMs": 195199,
          "text": "おい!"
        },
        {
          "speechId": 16,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 195199,
          "sourceEndMs": 198040,
          "text": "帽子みたいな感じであ、かわいいかも!"
        },
        {
          "speechId": 17,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 198040,
          "sourceEndMs": 209884,
          "text": "かわいくないだろなんかでもサザエさんのエンディングみたいオープニングのそれねサザエさんみたいな感じで弾がさ、こう、みかんから出てくるやつ"
        },
        {
          "speechId": 18,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 210802,
          "sourceEndMs": 236189,
          "text": "ねってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってって"
        },
        {
          "speechId": 19,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 240202,
          "sourceEndMs": 267270,
          "text": "コロナが上がっちゃったちょっと諦めようかなちょっとちょっと難易度高めこれにさなんか文句言われたらちょっと考えような確かに文句ないと思うけどね当然ねこっち向くわはいということでねこっち向くわとか言っちゃったちょっとコーネがね今日ねずこスタイルなんでどうもどうもねずこはそんなこと言わないうんうんうんうん"
        },
        {
          "speechId": 20,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 278759,
          "sourceEndMs": 298984,
          "text": "ねずこうんわかるよお兄ちゃんにはわかるそうかねずこわかったわかったねずこみんなどうかなねずこと炭治郎の音量どういい感じいい感じありがとういい感じよかったねずこまあねそのそれはあれじゃん鬼の鬼の鬼柱なんだっけ鬼の"
        },
        {
          "speechId": 21,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 300578,
          "sourceEndMs": 328762,
          "text": "なんだっけ鬼のさなに鬼もっしらってなんだよ強い鬼なんてなんかあれだ上限の月だ上限のサメだよこれはねえマリンマリンやばい腹も減ってるよこれちょっとお前どうしよう作業するかちょっとあ確かに作業しようちょっと喋ってる場合じゃない作業口を動かすか体を動かすかっていうねえこれ待ってちょっと面白くないこの絵面ひよこが立ち並んでる姿"
        },
        {
          "speechId": 22,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 330060,
          "sourceEndMs": 335402,
          "text": "おもろいおもろいいきなりすんごい冷めてる?"
        },
        {
          "speechId": 23,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 335402,
          "sourceEndMs": 359330,
          "text": "待ってとりあえずさこれさ島から出るかこれそうだね島からもう出つつ出ほうがいいよなあとちょっと紹介するよじゃあ船長がさ紹介していくねそうねちょっと変わってるもんねこれね皆さんお気づきでしょうか実はねあのリフォームをねいたしましたありがとうありがとうテンションありがとうちょっと今日今夜なんでねちょっとよく見えないからちょっと後にしましょうかじゃあ出発進行しましょう"
        },
        {
          "speechId": 24,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 360354,
          "sourceEndMs": 366756,
          "text": "あ、水捨てちゃったわあ、船長も水飲みたいあ、水あれこれ前回も使ってたっけ?"
        },
        {
          "speechId": 25,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 366756,
          "sourceEndMs": 389704,
          "text": "いいやつ使ってた、これは使ってたよこれ使ってたか一生懸命働いてる働いてるねずこ頑張ってるな働いてる働いてる仕事するんだぞという一生懸命やってるちょっとねずこが入れた水をどんどん飲んでとなんかやねんかねちょっと気に入っちゃったよ気に入っちゃったよねずこをこうしてとどうしようかなこれとりあえずちょっと潜ってみるわなんか"
        },
        {
          "speechId": 26,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 390874,
          "sourceEndMs": 391715,
          "text": "潜るの?"
        },
        {
          "speechId": 27,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 391715,
          "sourceEndMs": 396116,
          "text": "もう出発してるよこれスマソン?"
        },
        {
          "speechId": 28,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 396116,
          "sourceEndMs": 397197,
          "text": "スマソン?"
        },
        {
          "speechId": 29,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 397197,
          "sourceEndMs": 398798,
          "text": "綺麗だね!"
        },
        {
          "speechId": 30,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 398798,
          "sourceEndMs": 399158,
          "text": "ね!"
        },
        {
          "speechId": 31,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 399158,
          "sourceEndMs": 401559,
          "text": "夕焼けがピンク色だよ!"
        },
        {
          "speechId": 32,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 401559,
          "sourceEndMs": 404040,
          "text": "これ朝日じゃねーの?"
        },
        {
          "speechId": 33,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 404040,
          "sourceEndMs": 406341,
          "text": "朝日がピンク色だね!"
        },
        {
          "speechId": 34,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 406341,
          "sourceEndMs": 409602,
          "text": "なんか二人の心みたいじゃない?"
        },
        {
          "speechId": 35,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 409602,
          "sourceEndMs": 410102,
          "text": "どういうこと?"
        },
        {
          "speechId": 36,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 410102,
          "sourceEndMs": 414484,
          "text": "わからない誰の心みたい?"
        },
        {
          "speechId": 37,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 414484,
          "sourceEndMs": 415805,
          "text": "あったかいってこと?"
        },
        {
          "speechId": 38,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 415805,
          "sourceEndMs": 417406,
          "text": "なんかさ、こういう色じゃない?"
        },
        {
          "speechId": 39,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 417406,
          "sourceEndMs": 417946,
          "text": "私たちってさ"
        },
        {
          "speechId": 40,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 420358,
          "sourceEndMs": 438186,
          "text": "そうかもしれない悩んだそうなのそうだったかもしれねえナルト風のそうだったかもしれねえ朝になったんで皆さんに紹介していきたいと思いますこうねうろうろしてないであれをあげてくれよなどれ?"
        },
        {
          "speechId": 41,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 438186,
          "sourceEndMs": 449852,
          "text": "アンカー落としてるんだよね当然これ落としてる落としてる落としてるいきますよ飛び込んでったはいいきますよ"
        },
        {
          "speechId": 42,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 450034,
          "sourceEndMs": 461818,
          "text": "オラァイヨォォォォォォォォォォォォォォォォォォォォォォォォォォォォォォォォォ"
        },
        {
          "speechId": 43,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 482374,
          "sourceEndMs": 507883,
          "text": "まず紹介やってよ紹介誰がやるのこうなったらこちらの階段はテンテンテンテンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテーンテー"
        },
        {
          "speechId": 44,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 511410,
          "sourceEndMs": 539932,
          "text": "床を強化素材に変えてみましたこうなったらば簡単にはサメに食われないだろうと思って付けたんですけれどもめちゃめちゃ資材を食う割にはガンガン壊れてしまい意外とそんなに良くなかったなっていう感じだよね遠い目をしてるそして2階を作ったんですけど一旦これ入り口のグッドティンなんていうか"
        },
        {
          "speechId": 45,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 540280,
          "sourceEndMs": 567026,
          "text": "こう書いてあるんだこれTingGoodTingCometochooseまああれだよな俺らの場所みたいな俺らの場所や俺らの場所かこれじゃあ俺らの場所俺らのフロアや俺らのフロアということが書いてある階段もつけまして2階というのを設置してねここから先の必需品って誰だろうこのアンテナをねちょっと"
        },
        {
          "speechId": 46,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 567658,
          "sourceEndMs": 570000,
          "text": "つけてきましたでもちょっと使い方ちょっと忘れちゃったからね"
        },
        {
          "speechId": 47,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 570560,
          "sourceEndMs": 582966,
          "text": "これからねコメントの指示中を見ながら把握していく心づむりでございますといってもやっぱこのアンテナで冒険するのはお腹すいて死ぬお腹すいてる?"
        },
        {
          "speechId": 48,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 582966,
          "sourceEndMs": 591351,
          "text": "すいてるちょっと食べるわ芋あるよ芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋芋"
        },
        {
          "speechId": 49,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 598246,
          "sourceEndMs": 600000,
          "text": "これねマリリンが作ってくれたんですけど"
        },
        {
          "speechId": 50,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 600202,
          "sourceEndMs": 629792,
          "text": "この2階あそうそう2階をねちょっと地味に作り始めたんだけど教科書外で作り始めちゃったんだけどもう素材すごい食って全然作らないからちょっとプレミしたなと思ってそれでね今日ちょっと作業するかってなったんだよねそうそうだからちょっとこっからは普通素材でガガガーっと骨組みだけ作っていきたいなと思いながらこのアンテナ使うのは次回4人揃った時でいいかなと思って今回は複面を完成させるというところにそうねということで今日はお邪魔します"
        },
        {
          "speechId": 51,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 631198,
          "sourceEndMs": 641920,
          "text": "よろしくおねがいしまーすおねがいしまーす鉄もね、ちょっとまあね、ゆるい感じでいこうやん今日ゆるめにね、いきましょうまったりとまあ、2時間くらいかなえ、ちょっとなんか、なんか悪くね?"
        },
        {
          "speechId": 52,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 641920,
          "sourceEndMs": 647641,
          "text": "みたいに思わないでくださいね今日はゆるくいこからこれ大丈夫なの?"
        },
        {
          "speechId": 53,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 647641,
          "sourceEndMs": 648402,
          "text": "なんか、あれ?"
        },
        {
          "speechId": 54,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 648402,
          "sourceEndMs": 649842,
          "text": "なんか口数少なくね?"
        },
        {
          "speechId": 55,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 649842,
          "sourceEndMs": 659944,
          "text": "とか思っても今日はまったり作業デーだからなって思ってくださいあ、気を先につぶしておくあ、そうそうそうそうぷちぷちにニキビのようにニキビのように?"
        },
        {
          "speechId": 56,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 660498,
          "sourceEndMs": 673141,
          "text": "例えはちょっとよく分かんないけどまあとりあえず木材がねたっぷり必要なんで船長も拾いながら行きたいと思いますこれここに入れとくねじゃあいつものごとくあいつああこいついつもの木材入れで作ったのにさあなに?"
        },
        {
          "speechId": 57,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 673141,
          "sourceEndMs": 676321,
          "text": "いっぱい入ってるわいっぱい入ってる?"
        },
        {
          "speechId": 58,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 676321,
          "sourceEndMs": 690000,
          "text": "それまあまあまあまあまあまあねあれよなでもな入れるとこなくなっちゃうこれねちょっとねなんかまあ見やすいからねここねどうしても入れちゃうよねそうねそうね分かるよ気持ち分かるよでかい島にこのままだと"
        },
        {
          "speechId": 59,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 690040,
          "sourceEndMs": 691501,
          "text": "ぶつかるぞ?"
        },
        {
          "speechId": 60,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 691501,
          "sourceEndMs": 693822,
          "text": "え、じゃあぶつかってみる?"
        },
        {
          "speechId": 61,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 693822,
          "sourceEndMs": 695422,
          "text": "ちまにぶつかってみる?"
        },
        {
          "speechId": 62,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 695422,
          "sourceEndMs": 698183,
          "text": "ぶつかってしまったらば止まってしまうよね、ねえ?"
        },
        {
          "speechId": 63,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 698183,
          "sourceEndMs": 700804,
          "text": "でもなんか木材なかったかな?"
        },
        {
          "speechId": 64,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 700804,
          "sourceEndMs": 706967,
          "text": "島にあ、でも確かに木を凝るという発想はあるよねちょっと乗ってもいいかも乗ってもいいよね待って!"
        },
        {
          "speechId": 65,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 706967,
          "sourceEndMs": 707387,
          "text": "サメが!"
        },
        {
          "speechId": 66,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 707387,
          "sourceEndMs": 708367,
          "text": "あー!"
        },
        {
          "speechId": 67,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 708367,
          "sourceEndMs": 709128,
          "text": "あー!"
        },
        {
          "speechId": 68,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 709128,
          "sourceEndMs": 709448,
          "text": "いる?"
        },
        {
          "speechId": 69,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 709448,
          "sourceEndMs": 709768,
          "text": "食べてる?"
        },
        {
          "speechId": 70,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 709768,
          "sourceEndMs": 710288,
          "text": "食べてる?"
        },
        {
          "speechId": 71,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 710288,
          "sourceEndMs": 712989,
          "text": "うん、余裕で食べられたわマジ?"
        },
        {
          "speechId": 72,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 712989,
          "sourceEndMs": 719632,
          "text": "でもちょっとどうなんだろうこうやって氷河素材使って作ってもさ結局さ、食われるんだよなしっかりした土台"
        },
        {
          "speechId": 73,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 720866,
          "sourceEndMs": 748894,
          "text": "もしかしてなんか土台アーマーっていうので作るべきかもしかして土台アーマーとかあるんだえ、待ってこれ金属だわ金属重てえあ、でもやっぱ金属大事よこれ島ついたらうん下潜るかサメの餌作ってあ、待ってあれ作るわアンカー作りますお願いします一旦あれだね釣りもしなきゃだねあ、そう釣りもしたいねでも食料ねあれ食料庫にまだあったよありましたありましたとアンカー"
        },
        {
          "speechId": 74,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 752798,
          "sourceEndMs": 779564,
          "text": "アンカーちょっと食べていくか食べて、アンカーアンカーどこやねんアンカーどこやねんアンカーあったですありましたですか作れましたですナイスです降ろしちゃうよこれいいよここです何食べようかな、マナマナカツオ食べよう今ちょっとゴーディ誘ってくる誘ってやってくるじゃねえよ木探してくるわあ、オッケーあれ持ってる?"
        },
        {
          "speechId": 75,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 779564,
          "sourceEndMs": 779884,
          "text": "あのー"
        },
        {
          "speechId": 76,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 780346,
          "sourceEndMs": 809552,
          "text": "斧持ってるんだなこれが多いでしょすごいすごい独り立ちの日だよもう独り立ちの日かそうだよ良かったね独り立ちコロさんがちゃんと作ってるってもう成長を感じてほしいねコネいや結構ねあれだからねコネはね頑張ってるからねここで頑張ってるんだよなユウってねめちゃめちゃ集めるのも早いしうちの有能だからねしっかり船長がフォローしとくからコネのことサンキューな"
        },
        {
          "speechId": 77,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 810330,
          "sourceEndMs": 817353,
          "text": "えっとちょっと待ってココナッツしか取れねぇよ食料確かにちょっとしけてきたなあでも足りない?"
        },
        {
          "speechId": 78,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 817353,
          "sourceEndMs": 818634,
          "text": "しけしけになってきた?"
        },
        {
          "speechId": 79,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 818634,
          "sourceEndMs": 822236,
          "text": "ちょっと若干了解あ!"
        },
        {
          "speechId": 80,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 822236,
          "sourceEndMs": 823876,
          "text": "鳥殺した!"
        },
        {
          "speechId": 81,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 823876,
          "sourceEndMs": 824557,
          "text": "鳥殺したの?"
        },
        {
          "speechId": 82,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 824557,
          "sourceEndMs": 825157,
          "text": "食べれる?"
        },
        {
          "speechId": 83,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 825157,
          "sourceEndMs": 839584,
          "text": "食べれる食べれるちょっと待って鳥肉が絶対取れる食べてみて食べてみてOKOKOKOKちゃんと火通すんよOKあ、こんなとこでサメ肉3つあんじゃんラッキーラッキーラッキーじゃなくてラッキーとかじゃないねあ、サメ倒してたねそういえばね"
        },
        {
          "speechId": 84,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 840194,
          "sourceEndMs": 840494,
          "text": "完全忘れてたよね?"
        },
        {
          "speechId": 85,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 840494,
          "sourceEndMs": 859444,
          "text": "ちょっと待って、これ焼いてとこれちょっと拾ってともうちょっと一個食べてとなるほどねで、閉まってちょっとサメ肉閉まってで、このチキンを焼いてとやばっ!"
        },
        {
          "speechId": 86,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 859444,
          "sourceEndMs": 859605,
          "text": "くっそー!"
        },
        {
          "speechId": 87,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 859605,
          "sourceEndMs": 860065,
          "text": "どうした?"
        },
        {
          "speechId": 88,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 860065,
          "sourceEndMs": 860165,
          "text": "どうした?"
        },
        {
          "speechId": 89,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 860165,
          "sourceEndMs": 860485,
          "text": "何が来た?"
        },
        {
          "speechId": 90,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 860485,
          "sourceEndMs": 861386,
          "text": "鳥が!"
        },
        {
          "speechId": 91,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 861386,
          "sourceEndMs": 861626,
          "text": "鳥が来てる!"
        },
        {
          "speechId": 92,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 861626,
          "sourceEndMs": 863347,
          "text": "大丈夫か?"
        },
        {
          "speechId": 93,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 863347,
          "sourceEndMs": 864327,
          "text": "ダメージ?"
        },
        {
          "speechId": 94,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 864327,
          "sourceEndMs": 864687,
          "text": "平気?"
        },
        {
          "speechId": 95,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 864687,
          "sourceEndMs": 864927,
          "text": "ダメージ?"
        },
        {
          "speechId": 96,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 864927,
          "sourceEndMs": 867669,
          "text": "大丈夫、ダメージ大丈夫まだ平気ほんと?"
        },
        {
          "speechId": 97,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 867669,
          "sourceEndMs": 868349,
          "text": "心配かけたな"
        },
        {
          "speechId": 98,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 870042,
          "sourceEndMs": 874784,
          "text": "言うほど心配してないよ心配してーよー!"
        },
        {
          "speechId": 99,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 874784,
          "sourceEndMs": 875844,
          "text": "はいはい、あれ?"
        },
        {
          "speechId": 100,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 875844,
          "sourceEndMs": 877525,
          "text": "あれ?"
        },
        {
          "speechId": 101,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 877525,
          "sourceEndMs": 878365,
          "text": "心配して?"
        },
        {
          "speechId": 102,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 878365,
          "sourceEndMs": 884347,
          "text": "心配ねしてるしてるちょっと待って、一旦荷物預けて雑すぎ気づいた?"
        },
        {
          "speechId": 103,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 884347,
          "sourceEndMs": 899732,
          "text": "雑すぎんやんいやでもマリリンは反応が雑でもこういうゲームのね作業ちゃんとするから偉いと思うわ謎のフォローが入りましたそうなんよ船長ってちょっとね反応たまに雑になるけどでもちゃんとするからねそう言うてね"
        },
        {
          "speechId": 104,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 900098,
          "sourceEndMs": 904802,
          "text": "営業をしっかりしてるところがコーポイントだよね、マジでうん、わかるわかる?"
        },
        {
          "speechId": 105,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 904802,
          "sourceEndMs": 925239,
          "text": "わかりみが深いえ、ちょ、せんちゃんあれするわあのさぁ海藻とか探すわあのね、結構ねあ、あ、ありがてありがて柔道のネマネマとかがね、今後必要になってくることはサメ、気をつけてね間違いない、オッケーでもさぁ、冷静に考えてさぁうんこうやって、目標がさぁ、どんどん変わってくからさぁ今、するべきことって痛っ、ヤバい!"
        },
        {
          "speechId": 106,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 925239,
          "sourceEndMs": 926740,
          "text": "ちょっと待っている?"
        },
        {
          "speechId": 107,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 926740,
          "sourceEndMs": 928241,
          "text": "いやああああああああああああああ"
        },
        {
          "speechId": 108,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 932566,
          "sourceEndMs": 934587,
          "text": "気をつけてこれイノシシいるの?"
        },
        {
          "speechId": 109,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 934587,
          "sourceEndMs": 953740,
          "text": "イノシシもいるわこれわかった助太刀に行こうちょっと矢でさ撃ち殺すかイノシシパーティーしよう今日はここにイノシシいるわしし鍋しし丼しししちゅうみたいなしししちゅうしたいしししちゅうそっかこいつはもう食べれるんだよな多分なそうだよ弓矢あれ弓矢ってどかなかったっけ持ってる?"
        },
        {
          "speechId": 110,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 953740,
          "sourceEndMs": 959944,
          "text": "弓矢どっかにあったはずコーネ持ってないんだなコーネ持ってないあったあったちょっとさ弓矢でさ"
        },
        {
          "speechId": 111,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 960122,
          "sourceEndMs": 989832,
          "text": "殺すわ食べようよ食べたいこれで撃てるのかな行くわそっち待ってあれマリゾネスどこマリゾネスまだイカダイカダにいる鳥もいるしねなんかねイノシシ2匹ぐらいいたから気をつけてなOKもうみんな撃ち殺すから任してセイチョ結構エイムにはね自信あるからそうでしょ自信はねあったところってなんだよどういう意味だよちょっと待って自信だけ"
        },
        {
          "speechId": 112,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 990278,
          "sourceEndMs": 993519,
          "text": "もうダメなんだよこれコロゾネス待った方がいいやつ?"
        },
        {
          "speechId": 113,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 993519,
          "sourceEndMs": 1001441,
          "text": "コロゾネス待たなくていいよずっとベリーだって食べちゃうどこだ?"
        },
        {
          "speechId": 114,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1001441,
          "sourceEndMs": 1006182,
          "text": "どこだちょっと待って一緒にゴーデスとか行かなこれじゃあイカダでちょっと待っとくか?"
        },
        {
          "speechId": 115,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1006182,
          "sourceEndMs": 1009243,
          "text": "オッケーちょっと待ってなイカダどこだ?"
        },
        {
          "speechId": 116,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1009243,
          "sourceEndMs": 1011184,
          "text": "じゃあヤ、ヤちょっと弓?"
        },
        {
          "speechId": 117,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1011184,
          "sourceEndMs": 1011864,
          "text": "ヤ、ヤ弓?"
        },
        {
          "speechId": 118,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1011864,
          "sourceEndMs": 1014365,
          "text": "死ぬかもしれんこれ嘘でしょ?"
        },
        {
          "speechId": 119,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1014365,
          "sourceEndMs": 1019166,
          "text": "ちょっとヤと作っとこうコーネも一緒に一緒にさ弓やする?"
        },
        {
          "speechId": 120,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1021002,
          "sourceEndMs": 1022723,
          "text": "殺した方が早く殺せるか!"
        },
        {
          "speechId": 121,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1022723,
          "sourceEndMs": 1034412,
          "text": "そうそうそう、ちょっとロープちょっと作ってブドウのネバネバはちょっと海藻で作るかなんかそう、1個だ1個もないっけなこれえ、見失っちゃった?"
        },
        {
          "speechId": 122,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1034412,
          "sourceEndMs": 1039036,
          "text": "待てねーちょっと待てーどっかにないか?"
        },
        {
          "speechId": 123,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1039036,
          "sourceEndMs": 1046161,
          "text": "ネバネバあ、ここね鉱石あるなさてさてさてちょっとまとめてやの数が少ないって!"
        },
        {
          "speechId": 124,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1046161,
          "sourceEndMs": 1049624,
          "text": "アドバイスパソーカーなんとない時にね"
        },
        {
          "speechId": 125,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1050106,
          "sourceEndMs": 1058648,
          "text": "違う、違う違うね、ごめんねやめてね、そんなつもりじゃないからねや、や、やーだけにやめてもう何も言えねえ!"
        },
        {
          "speechId": 126,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1058648,
          "sourceEndMs": 1072470,
          "text": "嘘すぎるもう何も言えねえよわかった、せいちゃんが矢作ったときあ、やばい、いる、いるなあねえ、待って、イノシシ3匹いるあれ、作った矢どこ、あ、21本3匹いる?"
        },
        {
          "speechId": 127,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1072470,
          "sourceEndMs": 1079852,
          "text": "3匹いる、3匹いる何個いるかな、ちょっと1人30本ずつ持つか、じゃあここやばいかもあ、でも板足りない"
        },
        {
          "speechId": 128,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1081354,
          "sourceEndMs": 1081915,
          "text": "居た?"
        },
        {
          "speechId": 129,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1081915,
          "sourceEndMs": 1082435,
          "text": "居た?"
        },
        {
          "speechId": 130,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1082435,
          "sourceEndMs": 1084155,
          "text": "居た?"
        },
        {
          "speechId": 131,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1084155,
          "sourceEndMs": 1085376,
          "text": "居た?"
        },
        {
          "speechId": 132,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1085376,
          "sourceEndMs": 1085716,
          "text": "居た?"
        },
        {
          "speechId": 133,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1085716,
          "sourceEndMs": 1086196,
          "text": "居た?"
        },
        {
          "speechId": 134,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1086196,
          "sourceEndMs": 1086696,
          "text": "居た?"
        },
        {
          "speechId": 135,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1086696,
          "sourceEndMs": 1087116,
          "text": "居た?"
        },
        {
          "speechId": 136,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1087116,
          "sourceEndMs": 1087296,
          "text": "居た?"
        },
        {
          "speechId": 137,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1110182,
          "sourceEndMs": 1139684,
          "text": "来た時用に矢作ってありがたいねーこれで一緒にターン行こうよちょっと20本ずつちょっとコーネ1本少ない19本だけどまあ細かいことは全然いい全然いいあ全然いい解消できるしねベトベト足りるかなベトベトベトベト足りるかな問題があったわやっと見つけたオッケーあ行けるなよし弓作ったあじゃあ今ここで渡しちゃうねありがてーよこれ弓と"
        },
        {
          "speechId": 138,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1140194,
          "sourceEndMs": 1141995,
          "text": "はいこれ、嫌ね?"
        },
        {
          "speechId": 139,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1141995,
          "sourceEndMs": 1142956,
          "text": "拾ってよ?"
        },
        {
          "speechId": 140,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1142956,
          "sourceEndMs": 1144276,
          "text": "水に流される前にね?"
        },
        {
          "speechId": 141,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1144276,
          "sourceEndMs": 1147819,
          "text": "はいはいはいはいちょっとご飯も食べるから拾った!"
        },
        {
          "speechId": 142,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1147819,
          "sourceEndMs": 1148819,
          "text": "オッケー?"
        },
        {
          "speechId": 143,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1148819,
          "sourceEndMs": 1154923,
          "text": "うーんと、サメの頭いらねご飯も食べてよ?"
        },
        {
          "speechId": 144,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1154923,
          "sourceEndMs": 1156044,
          "text": "はい!"
        },
        {
          "speechId": 145,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1156044,
          "sourceEndMs": 1162007,
          "text": "よし、今日はしし鍋しし丼しし汁しししちゅうね?"
        },
        {
          "speechId": 146,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1162007,
          "sourceEndMs": 1164989,
          "text": "そう、しししちゅうが一番好きだわあ、これ夜になるけどこれどう?"
        },
        {
          "speechId": 147,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1164989,
          "sourceEndMs": 1165249,
          "text": "いいか?"
        },
        {
          "speechId": 148,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1165249,
          "sourceEndMs": 1169712,
          "text": "別に先にねほねば、夜の方がさ、海の中"
        },
        {
          "speechId": 149,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1170418,
          "sourceEndMs": 1174119,
          "text": "あれだよな、探索しやすいんだよなあ、する?"
        },
        {
          "speechId": 150,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1174119,
          "sourceEndMs": 1182180,
          "text": "最初海の中やっちゃってそうやで、暗いとイノシシも見えなくて危ないしあ、これマリリーさんこれ使ってみるよ、禰豆子あ、禰豆子?"
        },
        {
          "speechId": 151,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1182180,
          "sourceEndMs": 1183641,
          "text": "いや、大丈夫だよ平気?"
        },
        {
          "speechId": 152,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1183641,
          "sourceEndMs": 1199144,
          "text": "平気平気OK待って、弓矢じゃなくて矢も持って持ち物は大丈夫だなよし生の芋、芋焼いとこうかな食料あるよある?"
        },
        {
          "speechId": 153,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1199144,
          "sourceEndMs": 1199564,
          "text": "あるよ、あの"
        },
        {
          "speechId": 154,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1200098,
          "sourceEndMs": 1223383,
          "text": "箱に入ってる全部の箱を1個ずつ開けたら見つかるありがとう次はちゃんとね分かりやすくしとくわ2階建てにしたらきてるきてるきてるお前許さねえサメだサメだ多分サメだコーネいる多分というかサメやこれは間違いなくね間違いなくラフトやこれはラフト?"
        },
        {
          "speechId": 155,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1223383,
          "sourceEndMs": 1229904,
          "text": "これはラフトというゲームやいたいやサメサメサメほらいるよなやっぱりないるすいませんマリンよりコーネのことを食べてください"
        },
        {
          "speechId": 156,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1230214,
          "sourceEndMs": 1234815,
          "text": "なんでやねんコーニーさん狙われたらヤバいで今死にかけの…え、痛っ!"
        },
        {
          "speechId": 157,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1234815,
          "sourceEndMs": 1235315,
          "text": "待って!"
        },
        {
          "speechId": 158,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1235315,
          "sourceEndMs": 1235596,
          "text": "待って!"
        },
        {
          "speechId": 159,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1235596,
          "sourceEndMs": 1236016,
          "text": "痛っ!"
        },
        {
          "speechId": 160,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1236016,
          "sourceEndMs": 1236436,
          "text": "痛っ!"
        },
        {
          "speechId": 161,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1236436,
          "sourceEndMs": 1237096,
          "text": "痛っ!"
        },
        {
          "speechId": 162,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1237096,
          "sourceEndMs": 1237476,
          "text": "痛っ!"
        },
        {
          "speechId": 163,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1237476,
          "sourceEndMs": 1258062,
          "text": "コーニーありがとう今まですごい大好きだった本当によいごんサメはさ弓矢で…でももったいないなちょっとでも確かにね弓矢弱えないっすなあ弓矢でも弓でもサメ倒せるよって言われてるなえ待ってもしかしてさもしかしてこの丈さいや無理かコンコンできるかと思った"
        },
        {
          "speechId": 164,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1260022,
          "sourceEndMs": 1274430,
          "text": "そんな…竹取りの翁というものありきりやんそんな…竹取りの翁というものありきり…そんな丁寧に…あ、違うわ!"
        },
        {
          "speechId": 165,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1274430,
          "sourceEndMs": 1275270,
          "text": "かぐや姫や!"
        },
        {
          "speechId": 166,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1275270,
          "sourceEndMs": 1277732,
          "text": "かぐや姫生まれちゃうよそうだねえ?"
        },
        {
          "speechId": 167,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1277732,
          "sourceEndMs": 1280213,
          "text": "かぐや姫生まれちゃうよなに?"
        },
        {
          "speechId": 168,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1280213,
          "sourceEndMs": 1280473,
          "text": "なに?"
        },
        {
          "speechId": 169,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1280473,
          "sourceEndMs": 1281894,
          "text": "絡みづらい?"
        },
        {
          "speechId": 170,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1281894,
          "sourceEndMs": 1283795,
          "text": "ちょっと絡みづらい…嘘でしょ?"
        },
        {
          "speechId": 171,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1283795,
          "sourceEndMs": 1284495,
          "text": "いつも?"
        },
        {
          "speechId": 172,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1284495,
          "sourceEndMs": 1285236,
          "text": "今日だけ?"
        },
        {
          "speechId": 173,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1285236,
          "sourceEndMs": 1287337,
          "text": "今日絡みづらい?"
        },
        {
          "speechId": 174,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1287337,
          "sourceEndMs": 1289358,
          "text": "いつもは絡みやすい…待って、この魚…"
        },
        {
          "speechId": 175,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1289708,
          "sourceEndMs": 1290000,
          "text": "えいちゃ"
        },
        {
          "speechId": 176,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1290150,
          "sourceEndMs": 1294092,
          "text": "どうしよう気になるやん今日何があったんやんなりんどこ?"
        },
        {
          "speechId": 177,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1294092,
          "sourceEndMs": 1311760,
          "text": "ちょっと今脳死で喋ってるあっ今ね今あの竹取りの桶というものありきりのとこあっよきかなよきかなよきかなちょっとちゃんと時代に染まってるねうんそれはよきかないいじゃんこの辺サメいなさそうな予感する今チャンスなのでは?"
        },
        {
          "speechId": 178,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1311760,
          "sourceEndMs": 1312480,
          "text": "マジ?"
        },
        {
          "speechId": 179,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1312480,
          "sourceEndMs": 1319784,
          "text": "あっでもこっち来そうだなうそえなんかフグもいるって言われてるようんうん普通にいるねこれでもここ海藻"
        },
        {
          "speechId": 180,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1320162,
          "sourceEndMs": 1335495,
          "text": "オンパレードだからちょっと拾うわやばいやばい階層のここの階層も取り尽くした今から来ても遅いからナイス行かねーしそっち行かねーし反対側行ってっしオッケー?"
        },
        {
          "speechId": 181,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1335495,
          "sourceEndMs": 1348625,
          "text": "これも階層だすごいなんか楽しいね楽しいねこっち側何もないかな何もないけどこっち側何もない?"
        },
        {
          "speechId": 182,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1348625,
          "sourceEndMs": 1349286,
          "text": "何にもない"
        },
        {
          "speechId": 183,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1350426,
          "sourceEndMs": 1351046,
          "text": "え?"
        },
        {
          "speechId": 184,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1351046,
          "sourceEndMs": 1380000,
          "text": "金属とかもないけど粘土とかあそっかでかいなこの島でかいよなでかいくせにさ意外となんもない金属なんもないよ金属欲しいよなゆうて金属あったあった海藻あったナイス降りますあんまり行きすぎると戻るのが大変か分かる分かるでもなさそうだなこの辺砂は取ってったほうがいいか砂もそうだね取っとこう"
        },
        {
          "speechId": 185,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1380850,
          "sourceEndMs": 1387813,
          "text": "OKOK砂というもの見つけられり見つけられり?"
        },
        {
          "speechId": 186,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1387813,
          "sourceEndMs": 1390555,
          "text": "見つけられり死ぬ死ぬ?"
        },
        {
          "speechId": 187,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1390555,
          "sourceEndMs": 1392416,
          "text": "海藻ありけり海藻ありけり?"
        },
        {
          "speechId": 188,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1392416,
          "sourceEndMs": 1409884,
          "text": "海藻いっぱいあるいっぱいあるちょっと待って一回上がってよいしょあぁ荷物預けてくればよかったなぁ準備を怠る怠るなかれあーわしもいるわしもやばいこっちはね準備を怠ることなかれだったからね"
        },
        {
          "speechId": 189,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1410846,
          "sourceEndMs": 1427669,
          "text": "あーそれはよきかなよきかなとしか言えんあんまり詳しくないお代官様あそっち行ったどっち行った?"
        },
        {
          "speechId": 190,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1427669,
          "sourceEndMs": 1438592,
          "text": "あらよあらよあらよあらららよ戦術そっちじゃないかなあ改装めっちゃある14枚も拾ったわえ、じゃあ教えてよ何を?"
        },
        {
          "speechId": 191,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1438592,
          "sourceEndMs": 1439592,
          "text": "は?"
        },
        {
          "speechId": 192,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1439592,
          "sourceEndMs": 1439732,
          "text": "え、待って"
        },
        {
          "speechId": 193,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1440770,
          "sourceEndMs": 1469864,
          "text": "もう全部船長が取ったからねもう今更意味ないよそっちじゃない方のさ教えてよお代官様じゃない方のさそれで言うと船長が言った方の反対の方角に向かってもらうと良き島を違う違うよあれ待ってお代官様のまだその話もう終わったからその話終わったなんでごめんね"
        },
        {
          "speechId": 194,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1470194,
          "sourceEndMs": 1479457,
          "text": "終わっちゃったかいつまでそんな話してんだよやる気あるんかお前やばい待て待て仕留められるか?"
        },
        {
          "speechId": 195,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1479457,
          "sourceEndMs": 1488380,
          "text": "何かと戦い始めたいいよいいよ痛そう痛そうこっちが痛いですイノシシやってるもしかして?"
        },
        {
          "speechId": 196,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1488380,
          "sourceEndMs": 1489941,
          "text": "イノシシやってるやってんの?"
        },
        {
          "speechId": 197,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1489941,
          "sourceEndMs": 1498203,
          "text": "でも待て海の中に入っていいじゃんいいじゃん海の中で撃てばねこいつ来れねえよあサメ?"
        },
        {
          "speechId": 198,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1498203,
          "sourceEndMs": 1498864,
          "text": "あイノシシ"
        },
        {
          "speechId": 199,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1500898,
          "sourceEndMs": 1502219,
          "text": "そこから撃てばってことね?"
        },
        {
          "speechId": 200,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1502219,
          "sourceEndMs": 1503479,
          "text": "そうそうそうそう!"
        },
        {
          "speechId": 201,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1503479,
          "sourceEndMs": 1509402,
          "text": "まるで会話が噛み合ってないえ、必ずさ、守護をつけようこれからの会話守護?"
        },
        {
          "speechId": 202,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1509402,
          "sourceEndMs": 1516225,
          "text": "守護をつけようえ、イノシシここにいるえ、待ってえ、え、毒になっちゃって死ぬかもしれないマリー!"
        },
        {
          "speechId": 203,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1516225,
          "sourceEndMs": 1522709,
          "text": "え、どうぞ、どこどこどこどこどこちょっと待って、今から帰る帰る帰るマリー!"
        },
        {
          "speechId": 204,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1522709,
          "sourceEndMs": 1529752,
          "text": "俺ちょっとね、ちょっとあまりにも噛み合ってないからね今ギスギスしてるって言われて"
        },
        {
          "speechId": 205,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1530000,
          "sourceEndMs": 1534522,
          "text": "キスキスしてるって言われてる死に死にしてるけど死に死にしてる?"
        },
        {
          "speechId": 206,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1534522,
          "sourceEndMs": 1543445,
          "text": "今行くからこれさ降参して再開するって押さない方がいいんだよね押したら荷物がなくなるもう死んでんのもしかして?"
        },
        {
          "speechId": 207,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1543445,
          "sourceEndMs": 1547227,
          "text": "死んでしまった島の中?"
        },
        {
          "speechId": 208,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1547227,
          "sourceEndMs": 1554530,
          "text": "島の中でね海沿いでね砂浜があって土下座いっぱい入ってあ、竹のありけりね"
        },
        {
          "speechId": 209,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1555302,
          "sourceEndMs": 1560000,
          "text": "そうね、マリンと逆方向に行ってたから逆に行ってたのね、OKOKO"
        },
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
        },
        {
          "speechId": 231,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1715564,
          "sourceEndMs": 1715884,
          "text": "いた?"
        },
        {
          "speechId": 232,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1715884,
          "sourceEndMs": 1717125,
          "text": "いた?"
        },
        {
          "speechId": 233,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1717125,
          "sourceEndMs": 1739066,
          "text": "あ、よかったよーあ、よかったよーよしよしよしつまいよ、遠いかなこれイカダから大丈夫、任せろ任せたぞ運び切ってみせるやばい、水分もカラカラになってきちゃった待っててくれ、大丈夫起きれば全部回復するからいや、助かり助かり待ってるコーネなになになに"
        },
        {
          "speechId": 234,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1740386,
          "sourceEndMs": 1754895,
          "text": "やばい怖いしたやばい怖いしたイノシシいるねやばいぞこれマリリンに聞きたいんだけどさこれさまだこの島まだこの島いる?"
        },
        {
          "speechId": 235,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1754895,
          "sourceEndMs": 1758637,
          "text": "あーここにいてもいいかって話?"
        },
        {
          "speechId": 236,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1758637,
          "sourceEndMs": 1761759,
          "text": "そう捨てる?"
        },
        {
          "speechId": 237,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1761759,
          "sourceEndMs": 1769884,
          "text": "取材次第かな起きたら見てみるわどれくらい集めたかOK海藻はめっちゃ拾った"
        },
        {
          "speechId": 238,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1770426,
          "sourceEndMs": 1799772,
          "text": "なんだけどねでもまだね全然粘土もさっき見かけたしまだまだ何でもありそうではある申し訳ねーけどさほら今武器をさ手に入れたからねこれであればそうね弓ねせんきゅーベイブせんきゅーよしちょっと食べ物あーありがとう持ち歩いた方がいいかもね食べ物そうね待ってでもねちょっと残ってるこれ一個食べてこのねここのこのなんていうのあのさこのコンロじゃなくてなんだこれ洋コンロに近い"
        },
        {
          "speechId": 239,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1800000,
          "sourceEndMs": 1804243,
          "text": "このボックスの中に食べ物入ってるありがてー!"
        },
        {
          "speechId": 240,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1804243,
          "sourceEndMs": 1807086,
          "text": "サンキュー!"
        },
        {
          "speechId": 241,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1807086,
          "sourceEndMs": 1807786,
          "text": "よーこいろ!"
        },
        {
          "speechId": 242,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1807786,
          "sourceEndMs": 1809147,
          "text": "ありがとう!"
        },
        {
          "speechId": 243,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1809147,
          "sourceEndMs": 1817494,
          "text": "ちょっと、じゃあクジラ、クジラじゃないやサメもらうわクジラ?"
        },
        {
          "speechId": 244,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1817494,
          "sourceEndMs": 1819996,
          "text": "あ、オッケオッケオッケサメ!"
        },
        {
          "speechId": 245,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1819996,
          "sourceEndMs": 1821817,
          "text": "サメもらって葉っぱがね、あ、60枚集めたねえ、めっちゃ集めてる!"
        },
        {
          "speechId": 246,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1821817,
          "sourceEndMs": 1823419,
          "text": "葉っぱ60枚!"
        },
        {
          "speechId": 247,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1823419,
          "sourceEndMs": 1823439,
          "text": "?"
        },
        {
          "speechId": 248,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1823419,
          "sourceEndMs": 1823439,
          "text": "?"
        },
        {
          "speechId": 249,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1823439,
          "sourceEndMs": 1824459,
          "text": "60枚あるよ!"
        },
        {
          "speechId": 250,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1824459,
          "sourceEndMs": 1825120,
          "text": "葉っぱ大じゃん!"
        },
        {
          "speechId": 251,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1825120,
          "sourceEndMs": 1826201,
          "text": "やったね!"
        },
        {
          "speechId": 252,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1826201,
          "sourceEndMs": 1826481,
          "text": "やったね!"
        },
        {
          "speechId": 253,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1826481,
          "sourceEndMs": 1827061,
          "text": "やった!"
        },
        {
          "speechId": 254,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1827061,
          "sourceEndMs": 1827662,
          "text": "やった!"
        },
        {
          "speechId": 255,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1829721,
          "sourceEndMs": 1830000,
          "text": "どこにいるの"
        },
        {
          "speechId": 256,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1830618,
          "sourceEndMs": 1834199,
          "text": "入れるところがないなあ葉っぱ?"
        },
        {
          "speechId": 257,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1834199,
          "sourceEndMs": 1841020,
          "text": "うんあ、ここにあるわここに入れて優秀やなえ、これさ、いらなくない?"
        },
        {
          "speechId": 258,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1841020,
          "sourceEndMs": 1843381,
          "text": "種みたいなやつヤシの種いる?"
        },
        {
          "speechId": 259,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1843381,
          "sourceEndMs": 1846181,
          "text": "ヤシの種はまだいらんの?"
        },
        {
          "speechId": 260,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1846181,
          "sourceEndMs": 1858764,
          "text": "うん、そうだね栽培してヤシの木生やしてそしたら木材集めなくても来ればいけるようになるからもう一個ストレージ作ろうか、そしたらそうだね、作ろっかほうがいいよなちょっと待ってね、作るわあ、作る?"
        },
        {
          "speechId": 261,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1858764,
          "sourceEndMs": 1859504,
          "text": "役に立つ"
        },
        {
          "speechId": 262,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1861934,
          "sourceEndMs": 1864835,
          "text": "よく似たつなぁ今ではよく似たつぞぉ?"
        },
        {
          "speechId": 263,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1864835,
          "sourceEndMs": 1866456,
          "text": "立ってるよぉ?"
        },
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
        },
        {
          "speechId": 284,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2020369,
          "sourceEndMs": 2023511,
          "text": "まじで食べ肉持ってるからね大丈夫行け?"
        },
        {
          "speechId": 285,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2023511,
          "sourceEndMs": 2026994,
          "text": "せんちゃんも持ってとよしこれで準備万端かな?"
        },
        {
          "speechId": 286,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2026994,
          "sourceEndMs": 2038802,
          "text": "行こうぞ行きますかよし行くぞーうちらいいね成長したねもう弓持って移動してんだよいやさすがよな強くなっちゃったこっち見ておっともたる"
        },
        {
          "speechId": 287,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2040950,
          "sourceEndMs": 2042391,
          "text": "なんか変装してる。"
        },
        {
          "speechId": 288,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2042391,
          "sourceEndMs": 2044813,
          "text": "なりこの変装ってこういうこと?"
        },
        {
          "speechId": 289,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2044813,
          "sourceEndMs": 2046774,
          "text": "嘘やな!"
        },
        {
          "speechId": 290,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2046774,
          "sourceEndMs": 2048896,
          "text": "行くぞ!"
        },
        {
          "speechId": 291,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2048896,
          "sourceEndMs": 2049416,
          "text": "イノシシ!"
        },
        {
          "speechId": 292,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2049416,
          "sourceEndMs": 2050617,
          "text": "やろうよ!"
        },
        {
          "speechId": 293,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2050617,
          "sourceEndMs": 2052759,
          "text": "え、これだってでも害なさそうだぜ。"
        },
        {
          "speechId": 294,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2052759,
          "sourceEndMs": 2055081,
          "text": "とか言ってたらやられるよな。"
        },
        {
          "speechId": 295,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2055081,
          "sourceEndMs": 2059864,
          "text": "害ないからこそ逆に、これ長押しか?"
        },
        {
          "speechId": 296,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2059864,
          "sourceEndMs": 2061506,
          "text": "待って、めっちゃ速い。"
        },
        {
          "speechId": 297,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2061506,
          "sourceEndMs": 2062366,
          "text": "クソ難しい。"
        },
        {
          "speechId": 298,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2062366,
          "sourceEndMs": 2062666,
          "text": "こいつ速いな!"
        },
        {
          "speechId": 299,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2062666,
          "sourceEndMs": 2065709,
          "text": "こっちの方がいいのでは?"
        },
        {
          "speechId": 300,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2065709,
          "sourceEndMs": 2067810,
          "text": "ちょっとガバガバのエイムが。"
        },
        {
          "speechId": 301,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2070322,
          "sourceEndMs": 2071923,
          "text": "これ当たってるでもこれ当たってるとか?"
        },
        {
          "speechId": 302,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2071923,
          "sourceEndMs": 2076186,
          "text": "ほんとあれ回収できるよなんかうそ!"
        },
        {
          "speechId": 303,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2076186,
          "sourceEndMs": 2076987,
          "text": "これ当たってる?"
        },
        {
          "speechId": 304,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2076987,
          "sourceEndMs": 2080750,
          "text": "これなんか刺さってるよこっちで行く?"
        },
        {
          "speechId": 305,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2080750,
          "sourceEndMs": 2083372,
          "text": "鉛筆で行くわちょっと鉛筆?"
        },
        {
          "speechId": 306,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2083372,
          "sourceEndMs": 2091418,
          "text": "こっちの弓矢の方であ、普通にね確かにこいつだったらば普通にこれ!"
        },
        {
          "speechId": 307,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2091418,
          "sourceEndMs": 2097362,
          "text": "なんかやらされてる当たらないこれさ、これさ、小ヤギじゃないのこれ小ヤギ?"
        },
        {
          "speechId": 308,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2097362,
          "sourceEndMs": 2099744,
          "text": "ヤギいいねヤギ食べたいこれさ、倒したらさ"
        },
        {
          "speechId": 309,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2100342,
          "sourceEndMs": 2129864,
          "text": "やめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめてやめて"
        },
        {
          "speechId": 310,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2138355,
          "sourceEndMs": 2140677,
          "text": "今晩はジンギスカンだな"
        },
        {
          "speechId": 311,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2164145,
          "sourceEndMs": 2165246,
          "text": "今だ!"
        },
        {
          "speechId": 312,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2165246,
          "sourceEndMs": 2189444,
          "text": "どれくらいで死んだんだろうねこれねわかんない、でも4発くらいは当ててるはずだからこっちもね、当ててる、結構全然当たらないどうしよう、ずっとこうしてるのかでも、こんだけさ、痛いからさとどめさせなきゃかわいそうだねな確かにね、2時間ずっとこれだった"
        },
        {
          "speechId": 313,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2196966,
          "sourceEndMs": 2199027,
          "text": "え、馬狩りの才能あるって!"
        },
        {
          "speechId": 314,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2199027,
          "sourceEndMs": 2207410,
          "text": "やっぱ犬だから…リオ…コヨリとかこういうの好きそうだなどこ行った?"
        },
        {
          "speechId": 315,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2207410,
          "sourceEndMs": 2217413,
          "text": "二人でやっちゃおうかななんかサメをさ、殺すのが好きじゃんわかるコヨリはわかるんだコヨーテだしなコヨーテ!"
        },
        {
          "speechId": 316,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2217413,
          "sourceEndMs": 2218814,
          "text": "確かにコヨーテって…ボケ!"
        },
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
        },
        {
          "speechId": 343,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2364040,
          "sourceEndMs": 2369864,
          "text": "うんいやなつくとは到底思えないけどねやっぱワタメはほらね話が通じるけどさうん"
        },
        {
          "speechId": 344,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2371410,
          "sourceEndMs": 2399544,
          "text": "今捕獲できないんだなるほどねなんかあれねもうちょっと進んだらってことかなるほどねなるほどねどうしようこれちょっと海藻でも取りますかじゃあこの辺なんか粘土があるのを先ほど確認したのでそうねそうねじゃあ取りますかねちょっと暗いうちにあれ粘土かとも思いますから石かこれ粘土かどっちだ砂だ石石砂"
        },
        {
          "speechId": 345,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2401186,
          "sourceEndMs": 2410728,
          "text": "そんなほらよでもさ、あんな小せえのがさ倒すの苦労したからさ猪なんてさ、化け物レベルなんじゃないの?"
        },
        {
          "speechId": 346,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2410728,
          "sourceEndMs": 2414189,
          "text": "俺いや、猪きつそうだねどうやるの?"
        },
        {
          "speechId": 347,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2414189,
          "sourceEndMs": 2429652,
          "text": "絶対なでもさ、さっきと違って逃げていくんじゃなくて向かってくるわけだからさ確かになワンチャン当たりやすいかもね、エイム的にはワタメがBGMがフグ来てる、フグ来てるよ気をつけ、そっち殺されたからな、さっき"
        },
        {
          "speechId": 348,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2430194,
          "sourceEndMs": 2434695,
          "text": "オッケオッケオッケマジ気をつけてそいつのやばいからまだ来てるかこれ?"
        },
        {
          "speechId": 349,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2434695,
          "sourceEndMs": 2439917,
          "text": "タゲ外れたか?"
        },
        {
          "speechId": 350,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2439917,
          "sourceEndMs": 2449059,
          "text": "さっきそいつのなんか毒で死んだわあーこいつかーこれーこれは痛いねーいけ?"
        },
        {
          "speechId": 351,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2449059,
          "sourceEndMs": 2459662,
          "text": "回想ちょっと取っとったー鉱石欲しいなー鉱石ねオッケーに置かないなんといってもやっぱり今後はね鉱石の時代が来ますからー終わった"
        },
        {
          "speechId": 352,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2463416,
          "sourceEndMs": 2465738,
          "text": "鉱石、鉱石…あるに越したことはないよね?"
        },
        {
          "speechId": 353,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2465738,
          "sourceEndMs": 2469981,
          "text": "そうね、とりあえず取れるもん全部取るわオッケー?"
        },
        {
          "speechId": 354,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2469981,
          "sourceEndMs": 2471683,
          "text": "あれ、石はいらない?"
        },
        {
          "speechId": 355,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2471683,
          "sourceEndMs": 2477007,
          "text": "石は…まぁ…今めちゃめちゃあるからそんなにいらないかもしんないけど…ない!"
        },
        {
          "speechId": 356,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2477007,
          "sourceEndMs": 2478969,
          "text": "りょりょりょ…優先順位は低めかな?"
        },
        {
          "speechId": 357,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2478969,
          "sourceEndMs": 2479269,
          "text": "オッケーぴょん?"
        },
        {
          "speechId": 358,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2479269,
          "sourceEndMs": 2479630,
          "text": "ないなぁ…ぴょん?"
        },
        {
          "speechId": 359,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2479630,
          "sourceEndMs": 2485134,
          "text": "ないなぁ…ぴょん?"
        },
        {
          "speechId": 360,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2485134,
          "sourceEndMs": 2488337,
          "text": "ぴょん?"
        },
        {
          "speechId": 361,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2488337,
          "sourceEndMs": 2489398,
          "text": "酸素ボンベ欲しくなってきたな"
        },
        {
          "speechId": 362,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2490482,
          "sourceEndMs": 2492143,
          "text": "あげるよ?"
        },
        {
          "speechId": 363,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2492143,
          "sourceEndMs": 2519066,
          "text": "いや、大丈夫新しいやつがいかん作るわ、いずれ出世したらさすがやなお、お風呂はいらないってかあ、でも声ってか口つき立ってるもんね、これブチュチュってなんか、でもね、船長、コーナーだったらいいよ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死ぬ死"
        },
        {
          "speechId": 364,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2521474,
          "sourceEndMs": 2523255,
          "text": "なんで死にかけてるの?"
        },
        {
          "speechId": 365,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2523255,
          "sourceEndMs": 2525615,
          "text": "なんで死にかけてんの?"
        },
        {
          "speechId": 366,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2525615,
          "sourceEndMs": 2530097,
          "text": "いや、水の中でさ、ゴンにさ、息できると思ってたらしくてさ。"
        },
        {
          "speechId": 367,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2530097,
          "sourceEndMs": 2531317,
          "text": "残念やね。"
        },
        {
          "speechId": 368,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2531317,
          "sourceEndMs": 2534198,
          "text": "3,3本目を手にしたことで調子に乗ってますね。"
        },
        {
          "speechId": 369,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2534198,
          "sourceEndMs": 2536639,
          "text": "そう、調子乗ってた今。"
        },
        {
          "speechId": 370,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2536639,
          "sourceEndMs": 2539200,
          "text": "でもね、金属の鉱石がね。"
        },
        {
          "speechId": 371,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2539200,
          "sourceEndMs": 2540381,
          "text": "あ、見つけた?"
        },
        {
          "speechId": 372,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2540381,
          "sourceEndMs": 2541381,
          "text": "8個。"
        },
        {
          "speechId": 373,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2541381,
          "sourceEndMs": 2542721,
          "text": "え、すごいじゃん。"
        },
        {
          "speechId": 374,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2542721,
          "sourceEndMs": 2543802,
          "text": "すごーい。"
        },
        {
          "speechId": 375,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2543802,
          "sourceEndMs": 2544122,
          "text": "役に立ってる。"
        },
        {
          "speechId": 376,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2544122,
          "sourceEndMs": 2548704,
          "text": "待って、全然ないんだけど。"
        },
        {
          "speechId": 377,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2548704,
          "sourceEndMs": 2549944,
          "text": "壁にくっついてるのがそれか。"
        },
        {
          "speechId": 378,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2551246,
          "sourceEndMs": 2578983,
          "text": "ちょっと青っぽく光ったやつだよねわかってはいるんだよないよなでもな普通になんか全然サメも来ないし何これサメいないねいなくなったね安定してきたなEGM良すぎるな今ない船長の方消えたマジ?"
        },
        {
          "speechId": 379,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2580020,
          "sourceEndMs": 2594066,
          "text": "虫がいるわしも殺したいね朝になんないかな早く水飲もう汲んできてよかった水痛っ!"
        },
        {
          "speechId": 380,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2594066,
          "sourceEndMs": 2596987,
          "text": "マリンマリンどうした?"
        },
        {
          "speechId": 381,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2596987,
          "sourceEndMs": 2597527,
          "text": "どこにいるの?"
        },
        {
          "speechId": 382,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2597527,
          "sourceEndMs": 2598908,
          "text": "どこになっちゃいました?"
        },
        {
          "speechId": 383,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2598908,
          "sourceEndMs": 2600108,
          "text": "死んだ?"
        },
        {
          "speechId": 384,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2600108,
          "sourceEndMs": 2604190,
          "text": "まだギリギリでも死んだギリギリ生きてる生きてるどこにいるの?"
        },
        {
          "speechId": 385,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2604190,
          "sourceEndMs": 2609792,
          "text": "生き残った食べてね食べるわいやそれ怖いよな"
        },
        {
          "speechId": 386,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2610000,
          "sourceEndMs": 2639126,
          "text": "それなーこのHPは満身創痍味が溢れてる気をつけてちょっとこれは不安だなーこのHPだとちょっとあれだななんか木でも伐採してようんあれ斧そうめっちゃ減るんだよねめっちゃ減ったわちょっと地上担当になろう一旦ね一旦一旦いやでもそれ大事よ危機回避"
        },
        {
          "speechId": 387,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2643144,
          "sourceEndMs": 2648288,
          "text": "踊るの好きなの?"
        },
        {
          "speechId": 388,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2648288,
          "sourceEndMs": 2659636,
          "text": "あ、イカラの下にサメいたわあ、そこにいたんだあの鳥マジで慣れてきた、サメ見てもあ、もう何とも思わなくなってきた?"
        },
        {
          "speechId": 389,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2659636,
          "sourceEndMs": 2669504,
          "text": "あ、サメかっているよ、いる、ここ、ここ、みたいなラフト末期ですねマジかちょっと水"
        },
        {
          "speechId": 390,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2670678,
          "sourceEndMs": 2690032,
          "text": "水を入れて入れてココナッツ助かるな自然の恵みに感謝自然ってさ尊いよな壮大なテーマの話が尊すぎるよそうだね今イカだ?"
        },
        {
          "speechId": 391,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2690032,
          "sourceEndMs": 2697757,
          "text": "今イカだでね水と組んで新しいのやって鉱石を入れておくわこっちにいいね"
        },
        {
          "speechId": 392,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2701871,
          "sourceEndMs": 2729824,
          "text": "今度という今度こそ殺そうイノシシ今日こそ今日という今日こそしなべししどんししじるしししちゅうをやりましょうあ、帰ってきたじゃん帰ってきた一回ちょっとHPの減りも凄まじかったのでえーと粘土ちょっとこう合体してとあとはサメの餌作ろう"
        },
        {
          "speechId": 393,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2731943,
          "sourceEndMs": 2759704,
          "text": "何を今からするかというと目的が次々変わってるんだよねわかる一つに絞らないとね何からやろうか今日の目標は船の2階を監視させたいみたいなそうなんだよさせたいんだけどさ大きい島を見つけてはしゃいじゃったところあるよね"
        },
        {
          "speechId": 394,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2760566,
          "sourceEndMs": 2761847,
          "text": "じゃあ行きますか!"
        },
        {
          "speechId": 395,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2761847,
          "sourceEndMs": 2764729,
          "text": "イノシシ狩りしますか!"
        },
        {
          "speechId": 396,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2764729,
          "sourceEndMs": 2772056,
          "text": "行きますかね狩ろう!"
        },
        {
          "speechId": 397,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2772056,
          "sourceEndMs": 2773337,
          "text": "狩るぞー!"
        },
        {
          "speechId": 398,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2773337,
          "sourceEndMs": 2787609,
          "text": "さっきちょっとワタメに気を取られたから普通にシンプルに今回はちゃんとイノシシ一点張りで了解海の中から狙い撃ちよう了解あ、見て!"
        },
        {
          "speechId": 399,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2787609,
          "sourceEndMs": 2789030,
          "text": "綺麗だねうん"
        },
        {
          "speechId": 400,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2790074,
          "sourceEndMs": 2798477,
          "text": "なんか君の心みたいにあったかいあなたの心はどこ行った?"
        },
        {
          "speechId": 401,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2798477,
          "sourceEndMs": 2802758,
          "text": "あっこっちよもうお茶目だなどこ行ったんだい?"
        },
        {
          "speechId": 402,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2802758,
          "sourceEndMs": 2803679,
          "text": "待て待て!"
        },
        {
          "speechId": 403,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2803679,
          "sourceEndMs": 2805559,
          "text": "待て!"
        },
        {
          "speechId": 404,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2805559,
          "sourceEndMs": 2815803,
          "text": "気持ち悪いからついてこないで血を見ずにでも使ってなさい急に冷たくなっちゃって来ないね気持ち悪いわ照れているのかな?"
        },
        {
          "speechId": 405,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2815803,
          "sourceEndMs": 2819724,
          "text": "待てっておい待てちょ待てって"
        },
        {
          "speechId": 406,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2821638,
          "sourceEndMs": 2823639,
          "text": "キモい!"
        },
        {
          "speechId": 407,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2823639,
          "sourceEndMs": 2824019,
          "text": "キモい!"
        },
        {
          "speechId": 408,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2824019,
          "sourceEndMs": 2825059,
          "text": "キモい!"
        },
        {
          "speechId": 409,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2825059,
          "sourceEndMs": 2825559,
          "text": "キモい!"
        },
        {
          "speechId": 410,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2825559,
          "sourceEndMs": 2828840,
          "text": "キモい!"
        },
        {
          "speechId": 411,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2828840,
          "sourceEndMs": 2831401,
          "text": "キモい!"
        },
        {
          "speechId": 412,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2831401,
          "sourceEndMs": 2832181,
          "text": "キモい!"
        },
        {
          "speechId": 413,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2832181,
          "sourceEndMs": 2832741,
          "text": "キモい!"
        },
        {
          "speechId": 414,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2832741,
          "sourceEndMs": 2833261,
          "text": "キモい!"
        },
        {
          "speechId": 415,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2833261,
          "sourceEndMs": 2834442,
          "text": "キモい!"
        },
        {
          "speechId": 416,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2834442,
          "sourceEndMs": 2838323,
          "text": "キモい!"
        },
        {
          "speechId": 417,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2838323,
          "sourceEndMs": 2839283,
          "text": "キモい!"
        },
        {
          "speechId": 418,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2839283,
          "sourceEndMs": 2840364,
          "text": "キモい!"
        },
        {
          "speechId": 419,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2840364,
          "sourceEndMs": 2840524,
          "text": "キモい!"
        },
        {
          "speechId": 420,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2840524,
          "sourceEndMs": 2840764,
          "text": "キモい!"
        },
        {
          "speechId": 421,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2840764,
          "sourceEndMs": 2841604,
          "text": "キモい!"
        },
        {
          "speechId": 422,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2841604,
          "sourceEndMs": 2843765,
          "text": "キモい!"
        },
        {
          "speechId": 423,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2843765,
          "sourceEndMs": 2846385,
          "text": "キモい!"
        },
        {
          "speechId": 424,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2846385,
          "sourceEndMs": 2846926,
          "text": "キモい!"
        },
        {
          "speechId": 425,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2846926,
          "sourceEndMs": 2848146,
          "text": "キモい!"
        },
        {
          "speechId": 426,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2851182,
          "sourceEndMs": 2853043,
          "text": "お尻ぷりぷりしちゃおう!"
        },
        {
          "speechId": 427,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2853043,
          "sourceEndMs": 2853843,
          "text": "悔しいか?"
        },
        {
          "speechId": 428,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2853843,
          "sourceEndMs": 2878230,
          "text": "ぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷり�"
        },
        {
          "speechId": 429,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2890914,
          "sourceEndMs": 2893495,
          "text": "アリー当てた?"
        },
        {
          "speechId": 430,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2893495,
          "sourceEndMs": 2902720,
          "text": "戻ろうか分かったあきらめをあきらめの逃げあきらめも大事だよこれまぁやったしねシシは肉とれた?"
        },
        {
          "speechId": 431,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2902720,
          "sourceEndMs": 2907082,
          "text": "肉肉とれたよナイス皮もとれたじゃん皮皮もとれた?"
        },
        {
          "speechId": 432,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2907082,
          "sourceEndMs": 2908743,
          "text": "皮?"
        },
        {
          "speechId": 433,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2908743,
          "sourceEndMs": 2910000,
          "text": "皮とれたよ皮研究し"
        },
        {
          "speechId": 434,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2910166,
          "sourceEndMs": 2916151,
          "text": "あ、そうねそうね、何か作れるかもしれない新しいのねぇやっぱ鳥気になる、殺すえ、殺す?"
        },
        {
          "speechId": 435,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2916151,
          "sourceEndMs": 2929702,
          "text": "え、死んじゃおうよマリーン任せろあ、待って行っちゃったかも行っちゃったか、いや来たか、いや行っちゃったか、いや来たか入れちゃったかちょっと待ってこれ構えたさ矢をそっと下ろしたい時はどうすればいいと思う?"
        },
        {
          "speechId": 436,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2929702,
          "sourceEndMs": 2932605,
          "text": "スクロールはどう?"
        },
        {
          "speechId": 437,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2932605,
          "sourceEndMs": 2934566,
          "text": "あ、一回でもさ地面に寄ったら?"
        },
        {
          "speechId": 438,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2934566,
          "sourceEndMs": 2938310,
          "text": "回収できるし痛っ"
        },
        {
          "speechId": 439,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2941666,
          "sourceEndMs": 2942086,
          "text": "いいでしょ?"
        },
        {
          "speechId": 440,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2942086,
          "sourceEndMs": 2942486,
          "text": "すごいでしょ?"
        },
        {
          "speechId": 441,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2942486,
          "sourceEndMs": 2945307,
          "text": "ナイス?"
        },
        {
          "speechId": 442,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2945307,
          "sourceEndMs": 2945887,
          "text": "ナイス?"
        },
        {
          "speechId": 443,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2945887,
          "sourceEndMs": 2957851,
          "text": "見てトッポこの中がスカスカなのはトッポって言わないからね中吸ったんよ多分先にトッポの中身だけ吸う?"
        },
        {
          "speechId": 444,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2957851,
          "sourceEndMs": 2964493,
          "text": "でもさ、もしかしたらレンジでチーしたらさトッポで中身が全部なくなってさ空洞を食べれるんじゃない?"
        },
        {
          "speechId": 445,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2964493,
          "sourceEndMs": 2967093,
          "text": "もしかしてマジ?"
        },
        {
          "speechId": 446,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2967093,
          "sourceEndMs": 2969014,
          "text": "やってみるかじゃあやってみよう"
        },
        {
          "speechId": 447,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2970690,
          "sourceEndMs": 2999444,
          "text": "ちょっと我々を代表してリスナーの皆さんぜひ挑戦してみてくださいよろしくお願いしますえっと待って弓矢がねちょっと誤報になっちゃってあ、皮研究しようかじゃあしてしてしてしてー研究しまーすどうやって研究するんだっけなあ、これだなまた食われたーあれ、どこだっけなあ、こうだなちょっと待ってくださいねー"
        },
        {
          "speechId": 448,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3000738,
          "sourceEndMs": 3004881,
          "text": "めっちゃさ、食われるダメに?"
        },
        {
          "speechId": 449,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3004881,
          "sourceEndMs": 3009904,
          "text": "あのね、船が食われてます大丈夫?"
        },
        {
          "speechId": 450,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3009904,
          "sourceEndMs": 3020432,
          "text": "大丈夫じゃないもう木がないから今探しに行くところ木が木じゃないね、そしたらねコーネがつまんないこと言うたびにさなんでそういうこと言うの?"
        },
        {
          "speechId": 451,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3020432,
          "sourceEndMs": 3025455,
          "text": "罰を与えたいよねねぇ、増えたよ?"
        },
        {
          "speechId": 452,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3025455,
          "sourceEndMs": 3026556,
          "text": "マリゾネス?"
        },
        {
          "speechId": 453,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3026556,
          "sourceEndMs": 3027416,
          "text": "なになになに?"
        },
        {
          "speechId": 454,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3027416,
          "sourceEndMs": 3029698,
          "text": "作れるのがね、蜂の巣蜂の巣?"
        },
        {
          "speechId": 455,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3030498,
          "sourceEndMs": 3033119,
          "text": "ハンモックバックパックえ?"
        },
        {
          "speechId": 456,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3033119,
          "sourceEndMs": 3034400,
          "text": "バックパック?"
        },
        {
          "speechId": 457,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3034400,
          "sourceEndMs": 3043724,
          "text": "それバックパックも作れるバックパックそれ需要しかないってあれバックパックあれどういうこと?"
        },
        {
          "speechId": 458,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3043724,
          "sourceEndMs": 3043964,
          "text": "ん?"
        },
        {
          "speechId": 459,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3043964,
          "sourceEndMs": 3059832,
          "text": "わからんこれあうんうんうん革のヘルメットとかボディアーマーとかも作れるえそれは熱いあと軟膏軟膏とかペイントブラシだってえめっちゃいいじゃんでも革2枚しかないからいっぱい取らなきゃねこれねやっぱりさ"
        },
        {
          "speechId": 460,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3060374,
          "sourceEndMs": 3063596,
          "text": "殺すしかないって殺す?"
        },
        {
          "speechId": 461,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3063596,
          "sourceEndMs": 3069038,
          "text": "あいつらをあの鳥もさ多分川を落とすんじゃない?"
        },
        {
          "speechId": 462,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3069038,
          "sourceEndMs": 3072540,
          "text": "鳥か鳥捕まえられるネットとかなかったっけ?"
        },
        {
          "speechId": 463,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3072540,
          "sourceEndMs": 3080503,
          "text": "あれか次はネットランチャーねごめん船長さ配信前にさどう考えてもトイレに行ったけどさどうしても我慢できずもう一回行っていい?"
        },
        {
          "speechId": 464,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3080503,
          "sourceEndMs": 3085986,
          "text": "いいよちょっと行ってくるね待っててねうんいちみさんの喋ってていい?"
        },
        {
          "speechId": 465,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3085986,
          "sourceEndMs": 3086726,
          "text": "ちょっとよろしく"
        },
        {
          "speechId": 466,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3097202,
          "sourceEndMs": 3119058,
          "text": "いってらっしゃいみちみさんこんにちは緊張しちゃうね2人だと2人じゃないけどいっぱいいっぱいいるけど2人きりだと緊張しちゃうねこれ待ってた方がいいのかなぁ食材がないなでも"
        },
        {
          "speechId": 467,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3120354,
          "sourceEndMs": 3149486,
          "text": "なんか落ちてるんだよここら辺に今日もかわいいねって言われちゃったマリゾネスかわいいって言われちゃったよ一味のみなさんにみんなではないけど一部に一味の一部にこれ全然面白くない全然面白くないんだけどあー待ってこれじゃあ食材が足りなくなっちゃうそうだなこれ釣りもしたいな一味の一部"
        },
        {
          "speechId": 468,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3150170,
          "sourceEndMs": 3173801,
          "text": "一味の一部一味しちみー一味の一部おけりよいしょはいあーこうねのソロ配信助かったな何もしないけどねこれさマリゾネスさこれさ止まってるときにさ魚で釣れないんだっけいや止まってても魚は釣れるあ釣れる?"
        },
        {
          "speechId": 469,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3173801,
          "sourceEndMs": 3179964,
          "text": "釣れるよ食材がさ多分どんどんなくなっちゃいそうでさこれさあー確かにそれあるな確かに?"
        },
        {
          "speechId": 470,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3180190,
          "sourceEndMs": 3181130,
          "text": "しし肉焼いてる?"
        },
        {
          "speechId": 471,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3181130,
          "sourceEndMs": 3197098,
          "text": "しし肉あ、ごめんなさい焼いてなかったわもうしっかりしてくれよごめんなさいあなたお前がちゃんとしないと子供に示しがつかないだろ見て!"
        },
        {
          "speechId": 472,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3197098,
          "sourceEndMs": 3198258,
          "text": "マリン見てこれ!"
        },
        {
          "speechId": 473,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3198258,
          "sourceEndMs": 3198959,
          "text": "すごいよ!"
        },
        {
          "speechId": 474,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3198959,
          "sourceEndMs": 3201080,
          "text": "バーベキューだ!"
        },
        {
          "speechId": 475,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3201080,
          "sourceEndMs": 3205402,
          "text": "奇跡じゃんガチの!"
        },
        {
          "speechId": 476,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3205402,
          "sourceEndMs": 3209684,
          "text": "これ回復量絶対えげつないからお腹がホキで空いてる時だけで食べてるの歩かないでちょっとそこ"
        },
        {
          "speechId": 477,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3211310,
          "sourceEndMs": 3238642,
          "text": "ごめんぬやりやがったやめて汚いね俺だって疲れてんだよ疲れてるなら寝なさいよじゃあなんでバーベキューの網の上歩くのよやめて汚いお前には分からないお前には分からないだろうな俺くらいやってないと分からないだろうな何をだよ働きを働いてるのね俺ほどの働きをしてないとお前には分からないだろうな一生分からないわごめんなさいね"
        },
        {
          "speechId": 478,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3240846,
          "sourceEndMs": 3241707,
          "text": "なんだっけ?"
        },
        {
          "speechId": 479,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3241707,
          "sourceEndMs": 3243147,
          "text": "何をしようとしたんだっけ?"
        },
        {
          "speechId": 480,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3243147,
          "sourceEndMs": 3252153,
          "text": "ごはん食べたいなぁ焼けないかなぁ裏返したくなるよねこれね確かにこんなことしてる場合じゃなかったわごはん確かになくなりそうだこれでしょ?"
        },
        {
          "speechId": 481,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3252153,
          "sourceEndMs": 3269924,
          "text": "とりあえず冷静にいやーちょっとあれかイノシシやるかそうだねやっぱイノシシねえマーリン何よ見てえーイノスケじゃんねずことイノスケちゃたせな"
        },
        {
          "speechId": 482,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3270262,
          "sourceEndMs": 3273863,
          "text": "行くぞ!"
        },
        {
          "speechId": 483,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3273863,
          "sourceEndMs": 3278425,
          "text": "炭治郎!"
        },
        {
          "speechId": 484,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3278425,
          "sourceEndMs": 3279045,
          "text": "マリン、いいの?"
        },
        {
          "speechId": 485,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3279045,
          "sourceEndMs": 3279325,
          "text": "これ?"
        },
        {
          "speechId": 486,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3279325,
          "sourceEndMs": 3279926,
          "text": "マリンかぶる?"
        },
        {
          "speechId": 487,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3279926,
          "sourceEndMs": 3282927,
          "text": "これ?"
        },
        {
          "speechId": 488,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3282927,
          "sourceEndMs": 3283867,
          "text": "せいちゃん、じゃあねずこよ。"
        },
        {
          "speechId": 489,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3283867,
          "sourceEndMs": 3287408,
          "text": "え、それさ、待ってねずことさ、それって共存してる?"
        },
        {
          "speechId": 490,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3287408,
          "sourceEndMs": 3290589,
          "text": "共存できない!"
        },
        {
          "speechId": 491,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3290589,
          "sourceEndMs": 3292350,
          "text": "お前はこっちを使うんだ!"
        },
        {
          "speechId": 492,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3306889,
          "sourceEndMs": 3307710,
          "text": "あははは!"
        },
        {
          "speechId": 493,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3338034,
          "sourceEndMs": 3338916,
          "text": "どっちがいい?"
        },
        {
          "speechId": 494,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3338916,
          "sourceEndMs": 3339658,
          "text": "伊之助がいい?"
        },
        {
          "speechId": 495,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3339658,
          "sourceEndMs": 3342545,
          "text": "これちょっと待って今泣いてるからちょっと待って"
        },
        {
          "speechId": 496,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3366903,
          "sourceEndMs": 3387921,
          "text": "これさ頭が猪になるだけでさ何も得はないんだな見て焼けてるよこっちね焼けてるぞ食べな食べな分けようほら乾杯だ乾杯"
        },
        {
          "speechId": 497,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3390154,
          "sourceEndMs": 3417711,
          "text": "ほら乾杯しよう肉で乾杯だこれ絶対回復量すごいからさもったいないよ今食べたらもったいないじゃん別のにするもっとギリギリになってから食べようもっといいよなんだよ何でつぼってんのこれちょっと頭かぶってみてほしいよそしたらそんな面白いこれ違う違ういや"
        },
        {
          "speechId": 498,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3425014,
          "sourceEndMs": 3438683,
          "text": "あ、すごいすごい!"
        },
        {
          "speechId": 499,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3438683,
          "sourceEndMs": 3440304,
          "text": "ほんとだ!"
        },
        {
          "speechId": 500,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3440304,
          "sourceEndMs": 3441965,
          "text": "それでずっと積もってるのね!"
        },
        {
          "speechId": 501,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3441965,
          "sourceEndMs": 3443126,
          "text": "あ、くれるのありがとね"
        },
        {
          "speechId": 502,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3452146,
          "sourceEndMs": 3467816,
          "text": "掘ってくれる説森で育った森で育った勘を出していくわそうだねちょっと行こうかちょっと待って斧だけ作っていい?"
        },
        {
          "speechId": 503,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3467816,
          "sourceEndMs": 3479844,
          "text": "斧いいよあーマジで死ぬかと思ったほら笑われすぎてえやばいマリリンちょっと待ってマジでさ食材なくなったけどあ食材なんて"
        },
        {
          "speechId": 504,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3480134,
          "sourceEndMs": 3485956,
          "text": "全ての食材を船長が今握ってるからねねーすごいな、シェフ?"
        },
        {
          "speechId": 505,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3485956,
          "sourceEndMs": 3488676,
          "text": "シェフだの?"
        },
        {
          "speechId": 506,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3488676,
          "sourceEndMs": 3492397,
          "text": "シェフじゃないんだけどすごいんだけどお腹減ってんの?"
        },
        {
          "speechId": 507,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3492397,
          "sourceEndMs": 3495718,
          "text": "今今、じゃあ肉食べていいか?"
        },
        {
          "speechId": 508,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3495718,
          "sourceEndMs": 3509062,
          "text": "勝手にえ、肉食べ…じゃあ魚さ、魚返すから魚食べてよ魚なんでそんな肉そんな温存しようとしてねここだという時に一緒に食べようよはい、これはい、拾って、これ"
        },
        {
          "speechId": 509,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3510000,
          "sourceEndMs": 3511621,
          "text": "ありがとういいよこんなくれるの?"
        },
        {
          "speechId": 510,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3511621,
          "sourceEndMs": 3519167,
          "text": "うんいいよちょっと逆にそんなに握ってんじゃねーよって話あ待って斧あれだ板がなくてさー斧作れない板ない?"
        },
        {
          "speechId": 511,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3519167,
          "sourceEndMs": 3519708,
          "text": "板?"
        },
        {
          "speechId": 512,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3519708,
          "sourceEndMs": 3522750,
          "text": "うんほらー!"
        },
        {
          "speechId": 513,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3530322,
          "sourceEndMs": 3538601,
          "text": "こうね板ね13枚入ってるポニーあーあーオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケオッケ"
        },
        {
          "speechId": 514,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3540827,
          "sourceEndMs": 3552518,
          "text": "よしじゃあ行こうかあれやってるよなに?"
        },
        {
          "speechId": 515,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3552518,
          "sourceEndMs": 3559384,
          "text": "ちょっとつもしちょっとつもし!"
        },
        {
          "speechId": 516,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3559384,
          "sourceEndMs": 3561126,
          "text": "そんな面白い"
        },
        {
          "speechId": 517,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3571274,
          "sourceEndMs": 3572334,
          "text": "違うことだね!"
        },
        {
          "speechId": 518,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3601814,
          "sourceEndMs": 3630000,
          "text": "えぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇ"
        },
        {
          "speechId": 519,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3630326,
          "sourceEndMs": 3630947,
          "text": "どこ行った?"
        },
        {
          "speechId": 520,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3630947,
          "sourceEndMs": 3634469,
          "text": "ここにいるねあれ?"
        },
        {
          "speechId": 521,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3634469,
          "sourceEndMs": 3659924,
          "text": "見つけた見つけたそこにいてそろりそろり肉食べよう肉食べようじゃん夜景の見えるレストランを私しましたお前その顔でイノシシの肉を持ってくるって"
        },
        {
          "speechId": 522,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3662551,
          "sourceEndMs": 3689086,
          "text": "じゃあ行きますよかんぱいかんぱい食べてる食べてるせーのあんまかゆくしねえじゃねえかなんでこんな温存したんだよ何も回復量変わらねえじゃねえかよ"
        },
        {
          "speechId": 523,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3696786,
          "sourceEndMs": 3719724,
          "text": "マジでマジ死ぬ笑いすぎてもうマジいっぱいの獅子やんこんなめっちゃ泣いてるし鼻水もいっぱい出てるし待って鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来て"
        },
        {
          "speechId": 524,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3720322,
          "sourceEndMs": 3749904,
          "text": "すぐはぐれるじゃんやだここだよやだなんでどこちょっと待って今なんで岩落としてくるんだねえ岩拾いに行ったとこにさはいはいはい待ってコーネどこコーネどこすぐはぐれるじゃねえかどこだコーネからだんだんイノスケに変わってくるやめろ痛い痛い痛い長いねこれねここであれ岩さ岩のさ岩の出所をさ探しにさそうねそうね岩の出所にあそこの上"
        },
        {
          "speechId": 525,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3750806,
          "sourceEndMs": 3752486,
          "text": "上でもあれ登れるか?"
        },
        {
          "speechId": 526,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3752486,
          "sourceEndMs": 3763229,
          "text": "え、でも見て足場みたいなのがあるよあ、これワンチャン登れとほら見て見てさすが伊之助くんすごい身のこなしすごすぎるあ、痛っ!"
        },
        {
          "speechId": 527,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3763229,
          "sourceEndMs": 3767029,
          "text": "あーこれ無理かなえ、痛れる?"
        },
        {
          "speechId": 528,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3767029,
          "sourceEndMs": 3779852,
          "text": "いや無理じゃない登らないってこれでもここにさ足場があるってことはさ足場じゃなくてさこれネイチャーアートだよこれ自然が作り出したものでさいやいやそんな登る足場"
        },
        {
          "speechId": 529,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3780418,
          "sourceEndMs": 3782640,
          "text": "マジ?"
        },
        {
          "speechId": 530,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3782640,
          "sourceEndMs": 3784401,
          "text": "マジで言ってるの?"
        },
        {
          "speechId": 531,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3784401,
          "sourceEndMs": 3788484,
          "text": "あの鳥がこっちに戻ってくるとき、それがお前の死ぬときだここ!"
        },
        {
          "speechId": 532,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3788484,
          "sourceEndMs": 3790965,
          "text": "くそー!"
        },
        {
          "speechId": 533,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3790965,
          "sourceEndMs": 3791245,
          "text": "あーくそ!"
        },
        {
          "speechId": 534,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3791245,
          "sourceEndMs": 3792887,
          "text": "マリリンどこ行ったの?"
        },
        {
          "speechId": 535,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3792887,
          "sourceEndMs": 3795608,
          "text": "あの岩の上岩の上のぽにょ?"
        },
        {
          "speechId": 536,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3795608,
          "sourceEndMs": 3797790,
          "text": "待って、水やばい岩の上のぽにょ?"
        },
        {
          "speechId": 537,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3797790,
          "sourceEndMs": 3798350,
          "text": "やだ!"
        },
        {
          "speechId": 538,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3798350,
          "sourceEndMs": 3798470,
          "text": "痛い!"
        },
        {
          "speechId": 539,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3798470,
          "sourceEndMs": 3798590,
          "text": "痛い!"
        },
        {
          "speechId": 540,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3798590,
          "sourceEndMs": 3799911,
          "text": "痛い!"
        },
        {
          "speechId": 541,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3799911,
          "sourceEndMs": 3800212,
          "text": "マジ?"
        },
        {
          "speechId": 542,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3800212,
          "sourceEndMs": 3800612,
          "text": "どうした?"
        },
        {
          "speechId": 543,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3800612,
          "sourceEndMs": 3800872,
          "text": "どうした?"
        },
        {
          "speechId": 544,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3800872,
          "sourceEndMs": 3801633,
          "text": "どうした?"
        },
        {
          "speechId": 545,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3801633,
          "sourceEndMs": 3803274,
          "text": "くらったー死んだ?"
        },
        {
          "speechId": 546,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3803274,
          "sourceEndMs": 3808177,
          "text": "いや、まだまだ生きてるえ、待って、反対側から登れるってマジ?"
        },
        {
          "speechId": 547,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3808177,
          "sourceEndMs": 3809258,
          "text": "うん、コメントに書いてある"
        },
        {
          "speechId": 548,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3810310,
          "sourceEndMs": 3820095,
          "text": "そんなさ反対側から登れるよってそんなさすごいじゃんまた来てるまた来てるまた来てるっておいでおいでマリンマリン生きてる?"
        },
        {
          "speechId": 549,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3820095,
          "sourceEndMs": 3822016,
          "text": "まだ生きてるコーネどこ?"
        },
        {
          "speechId": 550,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3822016,
          "sourceEndMs": 3824737,
          "text": "コーネもう上登ってるよあ裏から?"
        },
        {
          "speechId": 551,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3824737,
          "sourceEndMs": 3839904,
          "text": "うん今裏に一瞬影がね見えた気がしたのあ本当だ登れたよOK行くわなにこれ黒い粉だったわコーネ今ね今鳥のこと見てたらね鳥ね普通にねあの床に落ちてる道端の地面のね岩拾って"
        },
        {
          "speechId": 552,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3840794,
          "sourceEndMs": 3851679,
          "text": "あそういうことじゃ上に行ってるわけじゃないんだそういう感じっぽい上に来たけど上にも何もないなこれ何もない?"
        },
        {
          "speechId": 553,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3851679,
          "sourceEndMs": 3865406,
          "text": "パイナップルが咲いてるあお腹減ってるから食べる黄色い粉とかは取らなくていいよな粉はいらないかもねあそこに止まるのかもしれないね"
        },
        {
          "speechId": 554,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3872594,
          "sourceEndMs": 3873174,
          "text": "止まるんじゃない?"
        },
        {
          "speechId": 555,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3873174,
          "sourceEndMs": 3879156,
          "text": "あそこにえ、分からんなこれどうすればいいんじゃんこれちょっと満身創痍だよどうする?"
        },
        {
          "speechId": 556,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3879156,
          "sourceEndMs": 3900000,
          "text": "やばいねでもねあ、今下にいてランチタブなんだうぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅ"
        },
        {
          "speechId": 557,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3900514,
          "sourceEndMs": 3903595,
          "text": "やめようちょっと待ってどこ行った?"
        },
        {
          "speechId": 558,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3903595,
          "sourceEndMs": 3904615,
          "text": "こうね後ろ?"
        },
        {
          "speechId": 559,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3904615,
          "sourceEndMs": 3906196,
          "text": "どこ?"
        },
        {
          "speechId": 560,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3906196,
          "sourceEndMs": 3915439,
          "text": "後ろを振り返ってごらんイノシシ君行きましょう行くぞ!"
        },
        {
          "speechId": 561,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3915439,
          "sourceEndMs": 3918880,
          "text": "声が声が太すぎる行くぞ!"
        },
        {
          "speechId": 562,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3918880,
          "sourceEndMs": 3920401,
          "text": "行くぞ!"
        },
        {
          "speechId": 563,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3920401,
          "sourceEndMs": 3923242,
          "text": "でもイノシシもいなくないか?"
        },
        {
          "speechId": 564,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3923242,
          "sourceEndMs": 3927483,
          "text": "もしかしてもうやっちゃったかもねやっちゃった?"
        },
        {
          "speechId": 565,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3927483,
          "sourceEndMs": 3929884,
          "text": "川他にねえ待ってもうさ移動するこれ?"
        },
        {
          "speechId": 566,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3930774,
          "sourceEndMs": 3936278,
          "text": "ワンチャンありだね、この島結構居だしね、ずっとね、魚釣ってた方がこれ、こう、良いのでは?"
        },
        {
          "speechId": 567,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3936278,
          "sourceEndMs": 3947364,
          "text": "効率確かに、ぐるっと、こっからぐるっとさ、一瞬回ってくか何かさ、特別なものがないか見ながらえっ、目の前に居る?"
        },
        {
          "speechId": 568,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3947364,
          "sourceEndMs": 3948205,
          "text": "えっ?"
        },
        {
          "speechId": 569,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3948205,
          "sourceEndMs": 3948425,
          "text": "居んの?"
        },
        {
          "speechId": 570,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3948425,
          "sourceEndMs": 3951647,
          "text": "こ、こんなのことじゃない?"
        },
        {
          "speechId": 571,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3951647,
          "sourceEndMs": 3952167,
          "text": "分かりづれー!"
        },
        {
          "speechId": 572,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3952167,
          "sourceEndMs": 3952407,
          "text": "分かりづれーこと言うな!"
        },
        {
          "speechId": 573,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3952407,
          "sourceEndMs": 3959892,
          "text": "あ、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま"
        },
        {
          "speechId": 574,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3961702,
          "sourceEndMs": 3980088,
          "text": "こんな顔でこびられてもって話かこの顔ですよとりあえず移動して魚釣りながら素材集めながらダンサーだね行きますか気づいたら結構欠けてるよふざけんなふざけんなふざけんなマジ?"
        },
        {
          "speechId": 575,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3980088,
          "sourceEndMs": 3981448,
          "text": "サメに?"
        },
        {
          "speechId": 576,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3981448,
          "sourceEndMs": 3988230,
          "text": "結構食われてるねこれマジでそういうことするのかするだろうよそりゃ"
        },
        {
          "speechId": 577,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3989600,
          "sourceEndMs": 3989963,
          "text": "とりあえず"
        },
        {
          "speechId": 578,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 3991226,
          "sourceEndMs": 4017368,
          "text": "話題がすり減ってますとよしじゃあ出発しますかマリリン今更なんだけどさコーネのさ顔さもうちょい下げてもいいかもよマリリンの顔がさ可愛いフェイスが見えなくなっちゃうあでもね船長はねこうやって下を向いた時にコーネのねあの頭の匂い嗅いでるのからえ、いい匂い?"
        },
        {
          "speechId": 579,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4017368,
          "sourceEndMs": 4018950,
          "text": "うん、臭い泣いちゃったー"
        },
        {
          "speechId": 580,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4023866,
          "sourceEndMs": 4029707,
          "text": "泣くまで時間かかるからねごめんねじわじわ泣くやん早よ泣けやんこれも出発した?"
        },
        {
          "speechId": 581,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4029707,
          "sourceEndMs": 4040050,
          "text": "酷い酷いよあ、もうアンカー外したごめんねはいよーあ、待ってせーの出航!"
        },
        {
          "speechId": 582,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4040050,
          "sourceEndMs": 4044951,
          "text": "一人で行ってる板欲しいなー板?"
        },
        {
          "speechId": 583,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4044951,
          "sourceEndMs": 4049492,
          "text": "板欲しいなー板かーえ、でも板さーここに"
        },
        {
          "speechId": 584,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4050822,
          "sourceEndMs": 4055446,
          "text": "たぶんさ13枚しかないわ13枚あるの?"
        },
        {
          "speechId": 585,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4055446,
          "sourceEndMs": 4074140,
          "text": "あるあるいただきいただきインカいただきストリートあれも作る、回収ネットも作りたいな作ろう2階を完成させるという当初の目的を急に思い出してきたえっとじゃあ何あ、とりあえず行きゃー!"
        },
        {
          "speechId": 586,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4074140,
          "sourceEndMs": 4079944,
          "text": "よしよしよしちょっとさ、さっきさお魚釣りするわOK"
        },
        {
          "speechId": 587,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4080646,
          "sourceEndMs": 4094315,
          "text": "じゃあ船長は次第を集めたいけど今何も流れてないからこれ引っかかってないよね大丈夫だよね動いてる動いてるめっちゃ釣れるじゃんこれ楽しいいいねロープどっかにあったのロープ?"
        },
        {
          "speechId": 588,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4094315,
          "sourceEndMs": 4095935,
          "text": "ロープ?"
        },
        {
          "speechId": 589,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4095935,
          "sourceEndMs": 4109864,
          "text": "まじイノスキにやられるかとお腹がまじめちゃめちゃになったわ今のイノスキでそんな笑うとは思わなかったよ腹よじれたガチでよじれた死ぬかと思ったまあ嬉しいよねまあ"
        },
        {
          "speechId": 590,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4110474,
          "sourceEndMs": 4122562,
          "text": "嬉しいよねクールな嬉しい嬉しいクールな犬がめちゃめちゃ嬉しいよなかなか進まないなせんちゃんも釣りしてダブルスタイルで行くかあれ?"
        },
        {
          "speechId": 591,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4122562,
          "sourceEndMs": 4125663,
          "text": "ほがほの向きがあれ?"
        },
        {
          "speechId": 592,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4125663,
          "sourceEndMs": 4139192,
          "text": "いやそうだね向きがあれかもちょっと待って開くかOKOK開きましての向かいも広いねあいいよいいよいいよ生きてる生きてる?"
        },
        {
          "speechId": 593,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4139192,
          "sourceEndMs": 4139852,
          "text": "うんうまく"
        },
        {
          "speechId": 594,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4140240,
          "sourceEndMs": 4154686,
          "text": "離れたから綺麗に離れたらもうたたむか閉じてりょりょりょのりょいや死ぬかと思ったな見て釣ったこれはもういいよなに釣った?"
        },
        {
          "speechId": 595,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4154686,
          "sourceEndMs": 4165790,
          "text": "見て釣ったよちっちぇなねえ頑張ったんだけどなんかその顔のデカさに対してのスケール感がさああそんなんじゃなかったごめんね焼きまーす"
        },
        {
          "speechId": 596,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4166934,
          "sourceEndMs": 4169542,
          "text": "とみちゃんも釣り竿作るかネジスクラップ"
        },
        {
          "speechId": 597,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4172355,
          "sourceEndMs": 4175696,
          "text": "釣竿壊れたんですけど絵も壊れたの?"
        },
        {
          "speechId": 598,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4175696,
          "sourceEndMs": 4190561,
          "text": "自分で作りまーす偉いね自分で作って偉い偉いあでも板いるんか素材集めまーす金属で作る?"
        },
        {
          "speechId": 599,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4190561,
          "sourceEndMs": 4192702,
          "text": "金属だと作れるもったいなくない?"
        },
        {
          "speechId": 600,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4192702,
          "sourceEndMs": 4199724,
          "text": "いやそんなことないでしょむしろ板使わないし金属の釣竿で長く使えるしありやね"
        },
        {
          "speechId": 601,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4200866,
          "sourceEndMs": 4202386,
          "text": "スクールアップでじゃあ、よろしくお願いしまーす!"
        },
        {
          "speechId": 602,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4202386,
          "sourceEndMs": 4202646,
          "text": "オッケーでーす!"
        },
        {
          "speechId": 603,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4202646,
          "sourceEndMs": 4229712,
          "text": "あ、待って、お腹すいてベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベ"
        },
        {
          "speechId": 604,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4230258,
          "sourceEndMs": 4233359,
          "text": "ここにいっぱい…他人事?"
        },
        {
          "speechId": 605,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4233359,
          "sourceEndMs": 4233799,
          "text": "OK!"
        },
        {
          "speechId": 606,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4233799,
          "sourceEndMs": 4236259,
          "text": "釣竿できました!"
        },
        {
          "speechId": 607,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4236259,
          "sourceEndMs": 4236799,
          "text": "助かる!"
        },
        {
          "speechId": 608,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4236799,
          "sourceEndMs": 4237699,
          "text": "助かる!"
        },
        {
          "speechId": 609,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4237699,
          "sourceEndMs": 4238900,
          "text": "渡しまーす!"
        },
        {
          "speechId": 610,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4238900,
          "sourceEndMs": 4240980,
          "text": "ありがとうございます!"
        },
        {
          "speechId": 611,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4240980,
          "sourceEndMs": 4242040,
          "text": "Thankyouverymuch!"
        },
        {
          "speechId": 612,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4242040,
          "sourceEndMs": 4242280,
          "text": "すごい!"
        },
        {
          "speechId": 613,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4242280,
          "sourceEndMs": 4243321,
          "text": "資材もいっぱい来てる!"
        },
        {
          "speechId": 614,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4243321,
          "sourceEndMs": 4245021,
          "text": "どんどん拾うわよ!"
        },
        {
          "speechId": 615,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4245021,
          "sourceEndMs": 4246521,
          "text": "取る取る取る!"
        },
        {
          "speechId": 616,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4246521,
          "sourceEndMs": 4246901,
          "text": "いいよ!"
        },
        {
          "speechId": 617,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4246901,
          "sourceEndMs": 4248482,
          "text": "ここに取るから!"
        },
        {
          "speechId": 618,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4248482,
          "sourceEndMs": 4249482,
          "text": "ここ取れるのか?"
        },
        {
          "speechId": 619,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4249482,
          "sourceEndMs": 4254543,
          "text": "空腹の雨より視界がぼやけてる今お魚焼いてるからね!"
        },
        {
          "speechId": 620,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4254543,
          "sourceEndMs": 4254763,
          "text": "頼む!"
        },
        {
          "speechId": 621,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4254763,
          "sourceEndMs": 4255583,
          "text": "焼けててくれ!"
        },
        {
          "speechId": 622,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4255583,
          "sourceEndMs": 4256263,
          "text": "お願い!"
        },
        {
          "speechId": 623,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4256263,
          "sourceEndMs": 4256563,
          "text": "いいよ!"
        },
        {
          "speechId": 624,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4256563,
          "sourceEndMs": 4256963,
          "text": "いいよ!"
        },
        {
          "speechId": 625,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4256963,
          "sourceEndMs": 4257604,
          "text": "焼けてる!"
        },
        {
          "speechId": 626,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4257604,
          "sourceEndMs": 4257844,
          "text": "助かる!"
        },
        {
          "speechId": 627,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4257844,
          "sourceEndMs": 4259964,
          "text": "ナイス!"
        },
        {
          "speechId": 628,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4263026,
          "sourceEndMs": 4264307,
          "text": "お味はいかがでしょうか?"
        },
        {
          "speechId": 629,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4264307,
          "sourceEndMs": 4289544,
          "text": "お味はですね、これ食べてアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアム"
        },
        {
          "speechId": 630,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4290094,
          "sourceEndMs": 4308985,
          "text": "なめんなよサメだからって撮影が高いえっとネット壊されちゃったなこれは痛えネットでもどうしようかなとりあえず気にしちゃいけない気にしちゃ負けだわあそういうこと?"
        },
        {
          "speechId": 631,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4308985,
          "sourceEndMs": 4319892,
          "text": "うんとりあえずちょっとお魚釣って食材多めに確保しといてOKあナマズ釣ったナマズあナマズいいよナマズいい食料"
        },
        {
          "speechId": 632,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4320114,
          "sourceEndMs": 4348870,
          "text": "いいよー盛りだくさんだからナマズはプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリ"
        },
        {
          "speechId": 633,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4350866,
          "sourceEndMs": 4354127,
          "text": "ここなんでできない?"
        },
        {
          "speechId": 634,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4354127,
          "sourceEndMs": 4359148,
          "text": "ここなんでできない?"
        },
        {
          "speechId": 635,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4359148,
          "sourceEndMs": 4362929,
          "text": "ティラピアかーここなんでできない?"
        },
        {
          "speechId": 636,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4362929,
          "sourceEndMs": 4367131,
          "text": "ここなんでできない?"
        },
        {
          "speechId": 637,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4367131,
          "sourceEndMs": 4367271,
          "text": "キメチ?"
        },
        {
          "speechId": 638,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4367271,
          "sourceEndMs": 4368391,
          "text": "ここなんでできない?"
        },
        {
          "speechId": 639,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4368391,
          "sourceEndMs": 4368991,
          "text": "あ、柱が足りない?"
        },
        {
          "speechId": 640,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4368991,
          "sourceEndMs": 4369611,
          "text": "こんなにあるのに?"
        },
        {
          "speechId": 641,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4369611,
          "sourceEndMs": 4370812,
          "text": "柱足りない?"
        },
        {
          "speechId": 642,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4370812,
          "sourceEndMs": 4379194,
          "text": "うん、足りなかったしっかりした木の柱ダメじゃん何柱が足りない?"
        },
        {
          "speechId": 643,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4379194,
          "sourceEndMs": 4379694,
          "text": "何柱が?"
        },
        {
          "speechId": 644,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4382826,
          "sourceEndMs": 4385147,
          "text": "イノスケってさ柱ですか?"
        },
        {
          "speechId": 645,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4385147,
          "sourceEndMs": 4387227,
          "text": "イノスケは柱じゃないんじゃない?"
        },
        {
          "speechId": 646,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4387227,
          "sourceEndMs": 4394109,
          "text": "柱じゃないかここに1個いてこれでいけるかな?"
        },
        {
          "speechId": 647,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4394109,
          "sourceEndMs": 4401190,
          "text": "もう1個くらいいるか?"
        },
        {
          "speechId": 648,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4401190,
          "sourceEndMs": 4409592,
          "text": "水も作っといてこれ焼かなきゃなそういえば意外と板"
        },
        {
          "speechId": 649,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4411581,
          "sourceEndMs": 4412382,
          "text": "あ、ない?"
        },
        {
          "speechId": 650,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4412382,
          "sourceEndMs": 4426994,
          "text": "すぐ無くなってしまうよね分かる板拾いに海に落ちるわなんかワイルドないよ集め方今来ないっしょ多分今?"
        },
        {
          "speechId": 651,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4426994,
          "sourceEndMs": 4429195,
          "text": "樽が全然流れて来ないんだが?"
        },
        {
          "speechId": 652,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4429195,
          "sourceEndMs": 4434580,
          "text": "もうちょっと真っ直ぐ行けばねこれから樽が来ますよのムードがほんと?"
        },
        {
          "speechId": 653,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4434580,
          "sourceEndMs": 4436441,
          "text": "これで行けるかしら?"
        },
        {
          "speechId": 654,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4436441,
          "sourceEndMs": 4437202,
          "text": "結構集めたわ"
        },
        {
          "speechId": 655,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4438975,
          "sourceEndMs": 4439943,
          "text": "今度は木の板が足りなくなる"
        },
        {
          "speechId": 656,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4443842,
          "sourceEndMs": 4453370,
          "text": "ココネがイノカキで集めている全然サメ来ないよこれイノシシだ、イノカキでイノカキ?"
        },
        {
          "speechId": 657,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4453370,
          "sourceEndMs": 4455292,
          "text": "イノカキで集めてるほら!"
        },
        {
          "speechId": 658,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4455292,
          "sourceEndMs": 4456072,
          "text": "12枚!"
        },
        {
          "speechId": 659,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4456072,
          "sourceEndMs": 4469844,
          "text": "あ、入れとくわあそこにあっちに入れとくわこっち入れとくよOKあ、なんかヒヨコ拾ってるわヒヨコそう、結構拾うよね"
        },
        {
          "speechId": 660,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4470922,
          "sourceEndMs": 4484987,
          "text": "スクラップもいるってことよねこれさやべこれA型の人見たらイライラするやつかなこれえ、なに?"
        },
        {
          "speechId": 661,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4484987,
          "sourceEndMs": 4485567,
          "text": "大丈夫?"
        },
        {
          "speechId": 662,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4485567,
          "sourceEndMs": 4491629,
          "text": "大丈夫全然大したことじゃないよかったでも気になるなに?"
        },
        {
          "speechId": 663,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4491629,
          "sourceEndMs": 4499672,
          "text": "そこにパッケージ落としちゃったからあ、なるほどね拾ったわフフフナイスナイスフフフナイスフフフ"
        },
        {
          "speechId": 664,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4500000,
          "sourceEndMs": 4501901,
          "text": "ここすごいたるい!"
        },
        {
          "speechId": 665,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4501901,
          "sourceEndMs": 4503002,
          "text": "あ、来た!"
        },
        {
          "speechId": 666,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4503002,
          "sourceEndMs": 4505604,
          "text": "ライオン!"
        },
        {
          "speechId": 667,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4505604,
          "sourceEndMs": 4516312,
          "text": "あれも拾おうか自分で拾いに行ってる助かるわこれ回収ネットで拾えるからねダイオン今日という虚構図つけるあれ?"
        },
        {
          "speechId": 668,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4516312,
          "sourceEndMs": 4516973,
          "text": "何が?"
        },
        {
          "speechId": 669,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4516973,
          "sourceEndMs": 4519194,
          "text": "もしかして下にコンロあるから?"
        },
        {
          "speechId": 670,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4519194,
          "sourceEndMs": 4521716,
          "text": "なんでダメなのこれ?"
        },
        {
          "speechId": 671,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4521716,
          "sourceEndMs": 4526640,
          "text": "説明よろしく頼むで作れない?"
        },
        {
          "speechId": 672,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4526640,
          "sourceEndMs": 4529642,
          "text": "そりゃ参ったな君たち説明して"
        },
        {
          "speechId": 673,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4530130,
          "sourceEndMs": 4531331,
          "text": "あ、そうだ!"
        },
        {
          "speechId": 674,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4531331,
          "sourceEndMs": 4531951,
          "text": "そうだそうだ!"
        },
        {
          "speechId": 675,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4531951,
          "sourceEndMs": 4535332,
          "text": "土台じゃないんだった、そういえばそうなの?"
        },
        {
          "speechId": 676,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4535332,
          "sourceEndMs": 4548779,
          "text": "これだ、木製フロアだライオンあ、こうだこうだ思い出しましたあ、もう板なくなっちゃったまじ、板全然ないあ、板ね、ここにね、今ね、20枚入ってるナイスー!"
        },
        {
          "speechId": 677,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4548779,
          "sourceEndMs": 4551780,
          "text": "ナイスー!"
        },
        {
          "speechId": 678,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4551780,
          "sourceEndMs": 4559584,
          "text": "集めるの達人じゃん、こうね私なすばらしい全然サメがここないんだけどいいねいいよね、これね"
        },
        {
          "speechId": 679,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4561908,
          "sourceEndMs": 4589210,
          "text": "もはや船いらねえんじゃねえかぐらいのいかだいらねえんじゃねえかちょっと言い過ぎたきていりますいかだいりますすみませんでした情けないな情けないですねこれは申し訳ない生酢やっとこうかないいね食料もしっかりね生酢食べるか食べて何の音だこれハマった音か板集めてとか"
        },
        {
          "speechId": 680,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4590034,
          "sourceEndMs": 4590114,
          "text": "ぽろり?"
        },
        {
          "speechId": 681,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4590114,
          "sourceEndMs": 4590154,
          "text": "ん?"
        },
        {
          "speechId": 682,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4590154,
          "sourceEndMs": 4590314,
          "text": "どこだ?"
        },
        {
          "speechId": 683,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4590314,
          "sourceEndMs": 4591955,
          "text": "あっ大丈夫?"
        },
        {
          "speechId": 684,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4591955,
          "sourceEndMs": 4592115,
          "text": "させっか!"
        },
        {
          "speechId": 685,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4592115,
          "sourceEndMs": 4596457,
          "text": "これでちょっと荷物整理したいなぁこれでよし、一旦OKだよいしょん?"
        },
        {
          "speechId": 686,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4596457,
          "sourceEndMs": 4596578,
          "text": "ん?"
        },
        {
          "speechId": 687,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4596578,
          "sourceEndMs": 4596618,
          "text": "ん?"
        },
        {
          "speechId": 688,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4596618,
          "sourceEndMs": 4619170,
          "text": "ランララランランランランラララララランランランラララララランランラララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララ"
        },
        {
          "speechId": 689,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4620226,
          "sourceEndMs": 4624969,
          "text": "コーネがご機嫌だとマリリンも嬉しくなっちゃうんだよほんと?"
        },
        {
          "speechId": 690,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4624969,
          "sourceEndMs": 4626690,
          "text": "どれぐらい嬉しい?"
        },
        {
          "speechId": 691,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4626690,
          "sourceEndMs": 4631633,
          "text": "普通ぐらい普通だったよそれは果たして嬉しいのかな?"
        },
        {
          "speechId": 692,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4631633,
          "sourceEndMs": 4642419,
          "text": "人並みの嬉しさがあるあ、あれ撮ろうかなあ、でも資材がいっぱいかちょっと一回しまうかねえ生ガツオがさ焼けるの早いよあ、ほんと?"
        },
        {
          "speechId": 693,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4642419,
          "sourceEndMs": 4648763,
          "text": "うん速さの差とかあるんかな?"
        },
        {
          "speechId": 694,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4648763,
          "sourceEndMs": 4649504,
          "text": "ちょっとねうまいうまーい"
        },
        {
          "speechId": 695,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4651874,
          "sourceEndMs": 4653995,
          "text": "おまーい?"
        },
        {
          "speechId": 696,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4653995,
          "sourceEndMs": 4654115,
          "text": "おまーい?"
        },
        {
          "speechId": 697,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4654115,
          "sourceEndMs": 4658518,
          "text": "葉っぱありすぎだろ葉っぱいらんまであるレベルまで来てる?"
        },
        {
          "speechId": 698,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4658518,
          "sourceEndMs": 4679452,
          "text": "うん、葉っぱいらんまであるそんなに集まったかーこんなんいらんだろレベルね、あるよこれ鉱石やるかなんで必要な時になかったんかお前たちみたいな感じになってる確かに序盤でめっちゃ足りなかったよねそうだよ、ないやねんマジでぶどうのベッドベッド"
        },
        {
          "speechId": 699,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4681742,
          "sourceEndMs": 4708723,
          "text": "今ねちょっとだけ整理したけどそんなの知らずに全然関係ないの入れちゃったよ今全然今そんな整理してる場合ではないその素材を集めなさいいいんだよすみませんこれ一回回収するかこれを一回外して生酢焼こう生酢掘ってさ"
        },
        {
          "speechId": 700,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4710220,
          "sourceEndMs": 4711940,
          "text": "上にあるものだよね?"
        },
        {
          "speechId": 701,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4711940,
          "sourceEndMs": 4716601,
          "text": "2階にあるあー確かになーえ、どうなんだろう?"
        },
        {
          "speechId": 702,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4716601,
          "sourceEndMs": 4718382,
          "text": "わかんなくなってきた2階にあるものなのかな?"
        },
        {
          "speechId": 703,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4718382,
          "sourceEndMs": 4719762,
          "text": "え、どうだろう?"
        },
        {
          "speechId": 704,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4719762,
          "sourceEndMs": 4720722,
          "text": "聞いてみる?"
        },
        {
          "speechId": 705,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4720722,
          "sourceEndMs": 4723203,
          "text": "君たちー?"
        },
        {
          "speechId": 706,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4723203,
          "sourceEndMs": 4725003,
          "text": "家具、君たちー?"
        },
        {
          "speechId": 707,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4725003,
          "sourceEndMs": 4738066,
          "text": "止まりさせてください家具作らないあ、でも家具あ、壁をささっきさ、壁をさあのほら、葉っぱにしたらオシャレだよねって話したよねあ、いてたねん?"
        },
        {
          "speechId": 708,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4738066,
          "sourceEndMs": 4739146,
          "text": "サメかと思ったら気のせいだったわ"
        },
        {
          "speechId": 709,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4740034,
          "sourceEndMs": 4750240,
          "text": "コーネだよコーネがザバッと上がってくる音でしたそうだよこうしてなんか一緒にオープニングの画面の家いいなーって言ってなんかさあ、そうそうそうそうそうなぜそう?"
        },
        {
          "speechId": 710,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4750240,
          "sourceEndMs": 4764669,
          "text": "ちょっといいなと思いましてあーどこに柱ここ行けっすかあ、魚いっぱいあるやんこれナマズ焼きたいなー何がダメなのかな?"
        },
        {
          "speechId": 711,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4764669,
          "sourceEndMs": 4767290,
          "text": "勝手に焼けーっつってねじゃあ行きまーす焼いてください何がダメなの?"
        },
        {
          "speechId": 712,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4767290,
          "sourceEndMs": 4769672,
          "text": "行きまーす柱の数足りないもしかして"
        },
        {
          "speechId": 713,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4771050,
          "sourceEndMs": 4771970,
          "text": "いけるだろ?"
        },
        {
          "speechId": 714,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4771970,
          "sourceEndMs": 4773051,
          "text": "ビビってんのか?"
        },
        {
          "speechId": 715,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4773051,
          "sourceEndMs": 4779554,
          "text": "足りないのあったら言ってね分かったこれいけると思うんだけどな全然木材がない?"
        },
        {
          "speechId": 716,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4779554,
          "sourceEndMs": 4798021,
          "text": "本当はないじゃん今ねストレージに22枚なら入ってるよいいじゃんさすがこうね葉っぱばっか眺めてくんじゃねーよいらねーつってんだろうがよ"
        },
        {
          "speechId": 717,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4802562,
          "sourceEndMs": 4807504,
          "text": "どうだと思うとカツオでしかない嫌だって言ってただろ!"
        },
        {
          "speechId": 718,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4807504,
          "sourceEndMs": 4826970,
          "text": "アッパばっかり舐めやがってカツオが怒ってるよカツオがカツオを釣るよ、そしたら磯野家だ海で全部揃うじゃんね、サザエさんねそういうテーマなんじゃないの?"
        },
        {
          "speechId": 719,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4826970,
          "sourceEndMs": 4827190,
          "text": "確かに"
        },
        {
          "speechId": 720,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4830974,
          "sourceEndMs": 4831414,
          "text": "なに?"
        },
        {
          "speechId": 721,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4831414,
          "sourceEndMs": 4838499,
          "text": "マジで待って、弾が、弾がそろわないよ、弾があ、マリン!"
        },
        {
          "speechId": 722,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4838499,
          "sourceEndMs": 4839800,
          "text": "待って、見ていたわ、弾!"
        },
        {
          "speechId": 723,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4839800,
          "sourceEndMs": 4842281,
          "text": "待って、どれのこれ?"
        },
        {
          "speechId": 724,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4842281,
          "sourceEndMs": 4845523,
          "text": "これ!"
        },
        {
          "speechId": 725,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4845523,
          "sourceEndMs": 4856150,
          "text": "もう、すごいなぁなんかこの弾、鼻筋の整えがすごいな弾、鼻筋やってんね、これ鼻筋やってる?"
        },
        {
          "speechId": 726,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4856150,
          "sourceEndMs": 4859872,
          "text": "これ一旦外そう一旦外して柱を建てて待って、何したんだっけ?"
        },
        {
          "speechId": 727,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4860606,
          "sourceEndMs": 4889844,
          "text": "違うわ板足りなくなったコーネ板足りない分かった任しなコーネ何もないよ板が任しな板が今16枚入れたナイスあれ取ろっかななかなかさいいよ取るよコーネがせんちょーの方が早いから大丈夫サメ来てるし謎の今の江戸"
        },
        {
          "speechId": 728,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4891646,
          "sourceEndMs": 4907911,
          "text": "いやでもこれいいなネットのおかげで結構集まってきてるよここに置けるかな?"
        },
        {
          "speechId": 729,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4907911,
          "sourceEndMs": 4908751,
          "text": "ほらよなんでダメなの?"
        },
        {
          "speechId": 730,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4908751,
          "sourceEndMs": 4910211,
          "text": "あ、板が足りない板足りない!"
        },
        {
          "speechId": 731,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4910211,
          "sourceEndMs": 4910491,
          "text": "こうね!"
        },
        {
          "speechId": 732,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4910491,
          "sourceEndMs": 4914633,
          "text": "今23枚入ってるよこっちにナイス!"
        },
        {
          "speechId": 733,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4914633,
          "sourceEndMs": 4917333,
          "text": "ベラボーメイ!"
        },
        {
          "speechId": 734,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4917333,
          "sourceEndMs": 4919634,
          "text": "ベラボーベラボーあ、これまた"
        },
        {
          "speechId": 735,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4925857,
          "sourceEndMs": 4949872,
          "text": "やっぱフック使った方がいいわそうだね気づいたわ今遅いよ気づくよ遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅�"
        },
        {
          "speechId": 736,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4956599,
          "sourceEndMs": 4961304,
          "text": "嫌ではないこれさ、1階つけたこれ外せんのかな?"
        },
        {
          "speechId": 737,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4961304,
          "sourceEndMs": 4962185,
          "text": "もう外せないのかな?"
        },
        {
          "speechId": 738,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4962185,
          "sourceEndMs": 4963286,
          "text": "いやでも、いいんじゃない?"
        },
        {
          "speechId": 739,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4963286,
          "sourceEndMs": 4972915,
          "text": "これぐらいで3階建てとかにしようよ、そしたらあ、1階は狭めでね、天井引くマジで多分これさ、物がいっぱい置いてあるからさ狭く見えるだけじゃない?"
        },
        {
          "speechId": 740,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4972915,
          "sourceEndMs": 4976199,
          "text": "なんか勝手に島に到着しちゃったマジ?"
        },
        {
          "speechId": 741,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4976199,
          "sourceEndMs": 4978741,
          "text": "ここに行けというお告げだじゃあアンカー作ります?"
        },
        {
          "speechId": 742,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 4980118,
          "sourceEndMs": 5008544,
          "text": "あ、確かにじゃあここでまたねまた集めよっかいのししもいるかもしれないしね反応してる反応してるいのししも喜んでるロープ石嬉しいぞ声がもう嬉しい嬉しいぞ本当さごめんなんだけどマリリンここの箱見てここここ?"
        },
        {
          "speechId": 743,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5008544,
          "sourceEndMs": 5009944,
          "text": "仲間外れがいるよこっちこっち"
        },
        {
          "speechId": 744,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5010074,
          "sourceEndMs": 5013056,
          "text": "手前の箱仲間外れの葉っぱはどれかな?"
        },
        {
          "speechId": 745,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5013056,
          "sourceEndMs": 5021861,
          "text": "これこれねこれねこれねこれだー!"
        },
        {
          "speechId": 746,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5021861,
          "sourceEndMs": 5023902,
          "text": "買いぞー!"
        },
        {
          "speechId": 747,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5023902,
          "sourceEndMs": 5025143,
          "text": "見つけた!"
        },
        {
          "speechId": 748,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5025143,
          "sourceEndMs": 5026684,
          "text": "見つけたぞー!"
        },
        {
          "speechId": 749,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5026684,
          "sourceEndMs": 5027064,
          "text": "見ーっけー!"
        },
        {
          "speechId": 750,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5027064,
          "sourceEndMs": 5030987,
          "text": "仲間外れ見っけー!"
        },
        {
          "speechId": 751,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5030987,
          "sourceEndMs": 5035930,
          "text": "終わったごめん面白すぎてちょっと見せたかったわご飯ある?"
        },
        {
          "speechId": 752,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5035930,
          "sourceEndMs": 5038751,
          "text": "ご飯あるよ生酢焼けてるよ食べない?"
        },
        {
          "speechId": 753,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5038751,
          "sourceEndMs": 5039712,
          "text": "ここ生酢あるから"
        },
        {
          "speechId": 754,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5040042,
          "sourceEndMs": 5047946,
          "text": "いただきますわ食べて食べてマジくだらねーわ気づいた?"
        },
        {
          "speechId": 755,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5047946,
          "sourceEndMs": 5069478,
          "text": "気づいた作業しまーすまず食べようはい、あんこ落としたよナイスナイスナイスパクパクナマズ一息で全部食べたわオッケオッケまだ魚いっぱいあるから焼きますあまりの空腹に美味しかったねどんどん食べとどっかに集めようかな焼くわ"
        },
        {
          "speechId": 756,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5070266,
          "sourceEndMs": 5074108,
          "text": "なんか、ある程度分けたんだよね?"
        },
        {
          "speechId": 757,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5074108,
          "sourceEndMs": 5087336,
          "text": "あ、ここブドウのベトベトのエリアだな終わったやだな、触りたくないねベトベトだからねうんこれでもうちょっと余裕できたら改めて整理整頓したいねそうね!"
        },
        {
          "speechId": 758,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5087336,
          "sourceEndMs": 5099083,
          "text": "今別にいっかいったねお水にさ、ペットボトル汲みなありがとうお水にペットボトル汲みな?"
        },
        {
          "speechId": 759,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5099083,
          "sourceEndMs": 5099244,
          "text": "ん?"
        },
        {
          "speechId": 760,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5099244,
          "sourceEndMs": 5099344,
          "text": "ん?"
        },
        {
          "speechId": 761,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5099344,
          "sourceEndMs": 5099744,
          "text": "な、なに?"
        },
        {
          "speechId": 762,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5099744,
          "sourceEndMs": 5099944,
          "text": "ん?"
        },
        {
          "speechId": 763,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5101438,
          "sourceEndMs": 5103939,
          "text": "おかしくないか?"
        },
        {
          "speechId": 764,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5103939,
          "sourceEndMs": 5109002,
          "text": "お水にペットボトルそういうことねペットボトルにお水組みなか?"
        },
        {
          "speechId": 765,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5109002,
          "sourceEndMs": 5128111,
          "text": "そうだね順番が違うだけでこうもさ意味が違ってくるなすごいよな日本語の神秘を感じてるすごいよ木でも凝ろうかなじゃあいいね木こりしながら探すわ木こりしながらイノシシになる?"
        },
        {
          "speechId": 766,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5128111,
          "sourceEndMs": 5128291,
          "text": "あれ?"
        },
        {
          "speechId": 767,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5130066,
          "sourceEndMs": 5133747,
          "text": "イノシシンリーでいいのかなこれイノシシンリーやん?"
        },
        {
          "speechId": 768,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5133747,
          "sourceEndMs": 5135367,
          "text": "イノシシンリーなに言ってる?"
        },
        {
          "speechId": 769,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5135367,
          "sourceEndMs": 5158994,
          "text": "ごめんねなんでもないわ無視してノープランに話し始めるな申し訳ちょっと木凝っちゃお魚焼いてあーこれあれかそっか魚焼くのにも板がいるんだなあそうでも板今ね凝ってるからね持ってくわ今からありがとう板はめとくからちょ待ってよこれもいける"
        },
        {
          "speechId": 770,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5162499,
          "sourceEndMs": 5189318,
          "text": "よー取れるぴょんぴょんぴょんぴょんマンゴー邪魔だから食べようじゃマンゴーマンゴーじゃんじゃんそんな笑わないそんな笑うとこじゃねーから今の面白いいやそういうの好きなんだよねそういうくだらないやつがさそんなおもろくないことでいっぱい笑われると気まず"
        },
        {
          "speechId": 771,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5190322,
          "sourceEndMs": 5195044,
          "text": "そんな面白くないと思ったえ、綺麗え、綺麗?"
        },
        {
          "speechId": 772,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5195044,
          "sourceEndMs": 5195084,
          "text": "何?"
        },
        {
          "speechId": 773,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5195084,
          "sourceEndMs": 5195464,
          "text": "夕焼け?"
        },
        {
          "speechId": 774,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5195464,
          "sourceEndMs": 5195944,
          "text": "朝日?"
        },
        {
          "speechId": 775,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5195944,
          "sourceEndMs": 5212850,
          "text": "うんほんとだほら、すごいね私さ、この景色一生忘れないと思うなんで?"
        },
        {
          "speechId": 776,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5212850,
          "sourceEndMs": 5213570,
          "text": "そんな思い出ある?"
        },
        {
          "speechId": 777,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5213570,
          "sourceEndMs": 5219192,
          "text": "バカされてるあ、そういう演技かそういう演技ごめんね、ごめんね気づけなくてごめんそういう演技"
        },
        {
          "speechId": 778,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5225398,
          "sourceEndMs": 5231500,
          "text": "ごめんねごめんね縁目だからちゃんと読んできた縁目今日の縁目縁目?"
        },
        {
          "speechId": 779,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5231500,
          "sourceEndMs": 5234981,
          "text": "縁目なんてあった?"
        },
        {
          "speechId": 780,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5234981,
          "sourceEndMs": 5236381,
          "text": "あ、待ってそれも演技か?"
        },
        {
          "speechId": 781,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5236381,
          "sourceEndMs": 5244903,
          "text": "マリンやったなぁねぇもう伝わってよマジついでなぁ今日絡みづらい?"
        },
        {
          "speechId": 782,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5244903,
          "sourceEndMs": 5249964,
          "text": "ちょっとやばいかもでもちょっとねあの絡みづらいのは伊之助の時は本当にねあのマジ"
        },
        {
          "speechId": 783,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5250620,
          "sourceEndMs": 5259163,
          "text": "いのすけ限定やんそれその時はね本当に死ぬと思ったね命も覚悟した船長本当に?"
        },
        {
          "speechId": 784,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5259163,
          "sourceEndMs": 5279310,
          "text": "まあでも死ななくてよかったねこっちが死にそうですなんなんなんどうした急にサメが来たから地道に泳いでるよしよしよし逃げれた逃げれたサメの餌作ってちょっとあれやりたいけどなもったいないんだよなそんなやつのためにクソがよどういう感情それ"
        },
        {
          "speechId": 785,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5280554,
          "sourceEndMs": 5283936,
          "text": "で、これ作ったやつ…あ、これもしかして斧で?"
        },
        {
          "speechId": 786,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5283936,
          "sourceEndMs": 5284357,
          "text": "どれ?"
        },
        {
          "speechId": 787,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5284357,
          "sourceEndMs": 5284977,
          "text": "斧?"
        },
        {
          "speechId": 788,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5284977,
          "sourceEndMs": 5287619,
          "text": "あ、斧で壊せるじゃん!"
        },
        {
          "speechId": 789,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5287619,
          "sourceEndMs": 5288399,
          "text": "何を?"
        },
        {
          "speechId": 790,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5288399,
          "sourceEndMs": 5289900,
          "text": "あ、あ、作ったやつ?"
        },
        {
          "speechId": 791,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5289900,
          "sourceEndMs": 5299307,
          "text": "うん、これは気づきでしたはい、すごーいおめでとうあ、へぇーえ、天井高くする?"
        },
        {
          "speechId": 792,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5299307,
          "sourceEndMs": 5302869,
          "text": "そうなったら…あ、でも、なんか大変じゃない?"
        },
        {
          "speechId": 793,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5302869,
          "sourceEndMs": 5305131,
          "text": "そう、なんか壊して作るの大変じゃない?"
        },
        {
          "speechId": 794,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5305131,
          "sourceEndMs": 5309614,
          "text": "材料がちょっと減ってる感じする、元よりね、なんかここだけ粗いけど何?"
        },
        {
          "speechId": 795,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5310822,
          "sourceEndMs": 5320109,
          "text": "だから、材料が足りないからあ、あ、あ、そうだ、同じこと、何回も強制で、強制!"
        },
        {
          "speechId": 796,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5320109,
          "sourceEndMs": 5337362,
          "text": "次言わせたらマジで、ガタガタ言わせるからなやばいやばいやばいよこれ、どうしようご機嫌そこにいちゃったわで、ここにもあれつけたいなOKここ無理なのかな?"
        },
        {
          "speechId": 797,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5337362,
          "sourceEndMs": 5338002,
          "text": "ちょっと、素材が足りないのかな?"
        },
        {
          "speechId": 798,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5338002,
          "sourceEndMs": 5339944,
          "text": "あれ、ここ無理なのかな?"
        },
        {
          "speechId": 799,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5341314,
          "sourceEndMs": 5341775,
          "text": "あれかな?"
        },
        {
          "speechId": 800,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5341775,
          "sourceEndMs": 5343575,
          "text": "柱がないからか?"
        },
        {
          "speechId": 801,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5343575,
          "sourceEndMs": 5350698,
          "text": "ちょっと階層集めてきまーすあ、ナイスーこれでどうだ?"
        },
        {
          "speechId": 802,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5350698,
          "sourceEndMs": 5350938,
          "text": "サラサラ?"
        },
        {
          "speechId": 803,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5350938,
          "sourceEndMs": 5369824,
          "text": "サラサラサラサラ行ける行ける行けるあ、できたできたいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよ"
        },
        {
          "speechId": 804,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5370342,
          "sourceEndMs": 5372123,
          "text": "角刈り用?"
        },
        {
          "speechId": 805,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5372123,
          "sourceEndMs": 5384947,
          "text": "角刈り用角刈り用ねうんこれつけるかでもやっぱ開放感も欲しいからさまあ確かに壁いらなくね?"
        },
        {
          "speechId": 806,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5384947,
          "sourceEndMs": 5388388,
          "text": "そういうわけじゃない?"
        },
        {
          "speechId": 807,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5388388,
          "sourceEndMs": 5399952,
          "text": "1階は開放するかいいな2階は2階は壁ありOKOK"
        },
        {
          "speechId": 808,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5402383,
          "sourceEndMs": 5404665,
          "text": "周りに何もないかもここない?"
        },
        {
          "speechId": 809,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5404665,
          "sourceEndMs": 5415130,
          "text": "OK早々に移動した方がいいかもしれない壁にストレージできる?"
        },
        {
          "speechId": 810,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5415130,
          "sourceEndMs": 5416951,
          "text": "クローゼットみたいな感じ?"
        },
        {
          "speechId": 811,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5416951,
          "sourceEndMs": 5428318,
          "text": "ちょっと待ってやってみていいよ階段の裏側とかデッドスペースを活かしてさ収納をここにさ"
        },
        {
          "speechId": 812,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5429346,
          "sourceEndMs": 5430000,
          "text": "え、ちょっと待って"
        },
        {
          "speechId": 813,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5431915,
          "sourceEndMs": 5459098,
          "text": "ちょっと待って忙しくなって気上がりましたわすごいじゃんなんかしたいなちょっとじゃあもうここ離して移動しました移動してまた板とか集めて欲しいかなじゃあアンカー外します壁の収納所気になりますちょっともう一回魚釣ろうこれちょっとぶち壊して待って待ってまず2階の"
        },
        {
          "speechId": 814,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5460342,
          "sourceEndMs": 5489452,
          "text": "ここの完成させようここをこのエリアを2階で何をしたいかって言ったらやっぱり作物とかヤシの木を2階で育てたいよねそれなそれなじゃあとりあえず魚釣りながらあれだ材料集めるわんでもやっぱさ1回さジャンプでさ移動できないのちょっとだるいよね引っかかってあジャンプあー別にいいようーんあー"
        },
        {
          "speechId": 815,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5490987,
          "sourceEndMs": 5499272,
          "text": "わかるわかるジャンプに移動できた方がいいわな何してる?"
        },
        {
          "speechId": 816,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5499272,
          "sourceEndMs": 5499512,
          "text": "大丈夫?"
        },
        {
          "speechId": 817,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5499512,
          "sourceEndMs": 5501533,
          "text": "大丈夫サメ?"
        },
        {
          "speechId": 818,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5501533,
          "sourceEndMs": 5514140,
          "text": "サメサメねジャンプで木なくなった木なくなった木なくなった待ってよ何枚持ってると思う?"
        },
        {
          "speechId": 819,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5514140,
          "sourceEndMs": 5519964,
          "text": "ちょっと待って期待を込めて50枚マジで言ってる?"
        },
        {
          "speechId": 820,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5520750,
          "sourceEndMs": 5522671,
          "text": "50枚ある?"
        },
        {
          "speechId": 821,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5522671,
          "sourceEndMs": 5523691,
          "text": "6枚6枚?"
        },
        {
          "speechId": 822,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5523691,
          "sourceEndMs": 5529994,
          "text": "まあまあまあまあでも待ってここになかった?"
        },
        {
          "speechId": 823,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5529994,
          "sourceEndMs": 5530275,
          "text": "どこ?"
        },
        {
          "speechId": 824,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5530275,
          "sourceEndMs": 5537818,
          "text": "ここなかったなかったかもうないよごめんね本当にまたコツコツ今から集めるから進んでなくない?"
        },
        {
          "speechId": 825,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5537818,
          "sourceEndMs": 5546502,
          "text": "待ってやばいきっと大区画の作物になっちゃって進んでないのであれ?"
        },
        {
          "speechId": 826,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5546502,
          "sourceEndMs": 5549244,
          "text": "ん?"
        },
        {
          "speechId": 827,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5549244,
          "sourceEndMs": 5549924,
          "text": "船がね進んでない"
        },
        {
          "speechId": 828,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5552102,
          "sourceEndMs": 5578382,
          "text": "あれかな、ちょっと一回砲つけてさそうね、砲つけないとね、これねOK、つけるわよーほーよーほーだわ、これさーけばーあれ、砲どこやったっけ、船長あ、持ってたわ、手に待って、ここにこれパドルがあるから必要なのほらほら、行く行くほらほら、見ていや、砲立てたほうが早いからほら見てよ、移動してない?"
        },
        {
          "speechId": 829,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5578382,
          "sourceEndMs": 5578702,
          "text": "してる"
        },
        {
          "speechId": 830,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5581366,
          "sourceEndMs": 5584688,
          "text": "捨てるけど、頬を立てたほうがほら!"
        },
        {
          "speechId": 831,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5584688,
          "sourceEndMs": 5586909,
          "text": "ほらほらほらほら!"
        },
        {
          "speechId": 832,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5586909,
          "sourceEndMs": 5591793,
          "text": "そんな、そんなちまちまやってさぁひどしてるよ!"
        },
        {
          "speechId": 833,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5591793,
          "sourceEndMs": 5593073,
          "text": "まどろっこしいんだよ!"
        },
        {
          "speechId": 834,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5593073,
          "sourceEndMs": 5605881,
          "text": "なんでなんちゅうこと今、頬開いてやったからよ感謝しろよなぁよし、進み始めた?"
        },
        {
          "speechId": 835,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5605881,
          "sourceEndMs": 5607402,
          "text": "ん?"
        },
        {
          "speechId": 836,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5607402,
          "sourceEndMs": 5608963,
          "text": "進んでるこれ?"
        },
        {
          "speechId": 837,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5608963,
          "sourceEndMs": 5609183,
          "text": "あれ?"
        },
        {
          "speechId": 838,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5609183,
          "sourceEndMs": 5609944,
          "text": "すでに進んでるよ"
        },
        {
          "speechId": 839,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5610114,
          "sourceEndMs": 5639964,
          "text": "逆でしたと向きが逆でしたおいおい何やってんだおんじゃんお前がやれよ泣くぞ泣くぞぐずってるぐずってる早く泣けよ泣くまでが長いでまだぐすぐすしてるあれ?"
        },
        {
          "speechId": 840,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5641350,
          "sourceEndMs": 5648235,
          "text": "もう遅いよもういつまでグズってんだよあれ進まないんだけどおかしくない?"
        },
        {
          "speechId": 841,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5648235,
          "sourceEndMs": 5669490,
          "text": "なんかやっぱパドルの出番ってわけよこれがおかしいなぁ向きは合ってると思うんだけどねちょっと待ってなぁパドルでこくから今行けパドルでやった方がいいと思うんだよね待っちょ待っちょ"
        },
        {
          "speechId": 842,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5671582,
          "sourceEndMs": 5672062,
          "text": "進んでる?"
        },
        {
          "speechId": 843,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5672062,
          "sourceEndMs": 5676266,
          "text": "これであ、進んだ進んだ進んだ!"
        },
        {
          "speechId": 844,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5676266,
          "sourceEndMs": 5686333,
          "text": "ほらよ、感謝しな壊れたわぬるっと壊れたね、今壊れたわパドルいいじゃん、これあ、でも移動してる?"
        },
        {
          "speechId": 845,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5686333,
          "sourceEndMs": 5688435,
          "text": "これもういいかな?"
        },
        {
          "speechId": 846,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5688435,
          "sourceEndMs": 5689396,
          "text": "逆、方が逆向きなのかな?"
        },
        {
          "speechId": 847,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5689396,
          "sourceEndMs": 5690517,
          "text": "あー!"
        },
        {
          "speechId": 848,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5690517,
          "sourceEndMs": 5699584,
          "text": "方外したらまた戻っちゃった待って、パドル作るわ、ちょっともう方いいかなと思ってさごめんね、ソーリーいいよ"
        },
        {
          "speechId": 849,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5700502,
          "sourceEndMs": 5727982,
          "text": "もっかいつけまーすはーいあーどっこいしょとそっかこんな止まっちゃうんだねすぐねこうよいやーほんとありがてありがてありがとねてっきりもういいのかと思ってさちょっと木終わる木の対策にねここでねヤシの木の栽培をね始めていきたいと思いまーすありがとございまーすえっとじゃあヤシの種種種種種種ある?"
        },
        {
          "speechId": 850,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5727982,
          "sourceEndMs": 5729864,
          "text": "ありますよー種どっかで"
        },
        {
          "speechId": 851,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5732991,
          "sourceEndMs": 5735231,
          "text": "マリリン、さっきジャガイモ焼いてた?"
        },
        {
          "speechId": 852,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5735231,
          "sourceEndMs": 5739913,
          "text": "あ、焼いたー焼けたからさ、これいる?"
        },
        {
          "speechId": 853,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5739913,
          "sourceEndMs": 5744414,
          "text": "あ、コーネ食べたければ食べてもいいよあ、いいよ、コーネにお魚あるからねあんた?"
        },
        {
          "speechId": 854,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5744414,
          "sourceEndMs": 5756917,
          "text": "じゃあ貰うわほらあ、そっかはい見せびらかしてたわ、今うんごめんね気づきちゃう進んでる?"
        },
        {
          "speechId": 855,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5756917,
          "sourceEndMs": 5758878,
          "text": "これあ、進んでないな、これ進んない?"
        },
        {
          "speechId": 856,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5767379,
          "sourceEndMs": 5772220,
          "text": "逆だったん?"
        },
        {
          "speechId": 857,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5772220,
          "sourceEndMs": 5775261,
          "text": "逆でしたでもこれってさ船長が悪いと思う?"
        },
        {
          "speechId": 858,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5775261,
          "sourceEndMs": 5783643,
          "text": "ううんこのほうが悪いと思うねえ難しいあ、ここにあったげるちゃんいくよ?"
        },
        {
          "speechId": 859,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5783643,
          "sourceEndMs": 5787383,
          "text": "あら?"
        },
        {
          "speechId": 860,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5787383,
          "sourceEndMs": 5788664,
          "text": "見上げてるもう任せろよ"
        },
        {
          "speechId": 861,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5790578,
          "sourceEndMs": 5796179,
          "text": "コーネにはさぁ…こうかな?"
        },
        {
          "speechId": 862,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5796179,
          "sourceEndMs": 5796999,
          "text": "何笑ってんだよ!"
        },
        {
          "speechId": 863,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5796999,
          "sourceEndMs": 5797319,
          "text": "コーネ!"
        },
        {
          "speechId": 864,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5797319,
          "sourceEndMs": 5797899,
          "text": "コーネ!"
        },
        {
          "speechId": 865,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5797899,
          "sourceEndMs": 5798500,
          "text": "ほんとに!"
        },
        {
          "speechId": 866,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5798500,
          "sourceEndMs": 5798980,
          "text": "ほんとに!"
        },
        {
          "speechId": 867,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5798980,
          "sourceEndMs": 5800020,
          "text": "足しか引っ張れずに魚釣ります!"
        },
        {
          "speechId": 868,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5800020,
          "sourceEndMs": 5813083,
          "text": "マジで…あーごめんなさい頼むよ、犬神様…いや、頼まれよう頼まれよう…何笑ってんだよ!"
        },
        {
          "speechId": 869,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5813083,
          "sourceEndMs": 5820000,
          "text": "ごめんなさい…ごめんなさい…ごめんなさい…お魚…お魚釣って…お魚…よいしょ…お魚…お魚…お水入れて"
        },
        {
          "speechId": 870,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5821110,
          "sourceEndMs": 5824633,
          "text": "水遠いのだる水遠いのだるいな2個作る?"
        },
        {
          "speechId": 871,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5824633,
          "sourceEndMs": 5831798,
          "text": "2個いらないか水はでも割ってもいいかもね作るコスト的にそんな重くなければ2回にも作れば?"
        },
        {
          "speechId": 872,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5831798,
          "sourceEndMs": 5849852,
          "text": "そうだね2回にも作ろうかなワンチャンありだよね便利だよね4人でやるわけだしガラスならね砂焼けば作れるしありだなありありその意見素敵ですえっとどっかに魚が釣れなくなったあったかな砂とりあえずじゃあぶち込んで"
        },
        {
          "speechId": 873,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5852255,
          "sourceEndMs": 5871583,
          "text": "雨降ってきた雨か、今日はまた居た、亡くなったなんか全然流れてこないねあれだ、フォー開いてるからだちょっと閉じるわあ、そっかそっか、ごめんごめん、そうだそうだ何回同じこと言うねんって言うねん反省した?"
        },
        {
          "speechId": 874,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5871583,
          "sourceEndMs": 5872143,
          "text": "こうね?"
        },
        {
          "speechId": 875,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5872143,
          "sourceEndMs": 5877946,
          "text": "反省した、今反省したよしよし分かればよろしいさすがやな"
        },
        {
          "speechId": 876,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5880002,
          "sourceEndMs": 5888349,
          "text": "反省できるだがしかし学習もしないごめんなさい!"
        },
        {
          "speechId": 877,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5888349,
          "sourceEndMs": 5889129,
          "text": "サメもいる!"
        },
        {
          "speechId": 878,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5889129,
          "sourceEndMs": 5899738,
          "text": "気をつけてね落ちないように板がなくてさ砂が焼けないよ魚食べる?"
        },
        {
          "speechId": 879,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5899738,
          "sourceEndMs": 5900879,
          "text": "残されてる!"
        },
        {
          "speechId": 880,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5908790,
          "sourceEndMs": 5910000,
          "text": "流されちゃったってこと"
        },
        {
          "speechId": 881,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5910746,
          "sourceEndMs": 5939452,
          "text": "でもね、ナマズは流されなかった神やんナマズさえあればね3色いけるからなナマズでナマズ焼くねこれマリリーにあげるわえっとナマズえっとこうで美味しく焼けますようにマリリーのためによいしょ愛を込めてるそうだよ意識高いないたいたいたいたいたいたいたないかな"
        },
        {
          "speechId": 882,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5940650,
          "sourceEndMs": 5950937,
          "text": "いたねーちょっと泳いでるすぐ野生に帰るいた流れてこないな全然あ、頬畳むか畳んだ?"
        },
        {
          "speechId": 883,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5950937,
          "sourceEndMs": 5969090,
          "text": "畳んだOKOKOKあ、流れてきた流れてきたよしよしよしよしだいぶ流れてきたわね気づいたらめっちゃめっちゃすり減ってるわこれほらよ食われてる味方がゴリゴリ食われてるやばいな"
        },
        {
          "speechId": 884,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5970194,
          "sourceEndMs": 5971655,
          "text": "あいつらマジでえ、これ?"
        },
        {
          "speechId": 885,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5971655,
          "sourceEndMs": 5975696,
          "text": "あ、でもそっか止まってないとん?"
        },
        {
          "speechId": 886,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5975696,
          "sourceEndMs": 5995142,
          "text": "やめてください止まってないとさサメの餌は使えないんだもんねそうだねどうしよっかな食われないくできるんかななんか食われなくはできないんじゃない?"
        },
        {
          "speechId": 887,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5995142,
          "sourceEndMs": 5999884,
          "text": "なんかメタリック加工みたいなのできないのかなあ、でもそれはあったけどちょっとコストが重たいから"
        },
        {
          "speechId": 888,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6000086,
          "sourceEndMs": 6012348,
          "text": "今はきついかなぁ今はとりあえずしょうがないとしてマジで板足りないなこれ大丈夫?"
        },
        {
          "speechId": 889,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6012348,
          "sourceEndMs": 6013769,
          "text": "オッケー?"
        },
        {
          "speechId": 890,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6013769,
          "sourceEndMs": 6022951,
          "text": "生酢焼けたら食べていいからねありがとういいんだよ狙ってんね見てるコーネが狙ってるところ取れないということは?"
        },
        {
          "speechId": 891,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6022951,
          "sourceEndMs": 6029732,
          "text": "いくよねめっちゃ落ちてるコーネの広手"
        },
        {
          "speechId": 892,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6030000,
          "sourceEndMs": 6038904,
          "text": "ナイスーあ、そっかごめんそうだ落としちゃうんだ整理しまーすあ、でもポテトとかビートとかだったから大丈夫?"
        },
        {
          "speechId": 893,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6038904,
          "sourceEndMs": 6044587,
          "text": "あ、よかったよかったポテト大事?"
        },
        {
          "speechId": 894,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6044587,
          "sourceEndMs": 6047348,
          "text": "サメの頭さ捨てていいと思う?"
        },
        {
          "speechId": 895,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6047348,
          "sourceEndMs": 6048569,
          "text": "あーいらないんじゃない?"
        },
        {
          "speechId": 896,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6048569,
          "sourceEndMs": 6057513,
          "text": "もうさ他にでもさーみんながさサメの頭でなっちゃうかなと思ってキミたち?"
        },
        {
          "speechId": 897,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6057513,
          "sourceEndMs": 6058574,
          "text": "キミたち?"
        },
        {
          "speechId": 898,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6058574,
          "sourceEndMs": 6059134,
          "text": "これいる?"
        },
        {
          "speechId": 899,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6066640,
          "sourceEndMs": 6071644,
          "text": "コメントしてよ!"
        },
        {
          "speechId": 900,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6071644,
          "sourceEndMs": 6079390,
          "text": "ラグを読んで早めにコメントするのが宝鐘海賊団の鉄則でしょ?"
        },
        {
          "speechId": 901,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6079390,
          "sourceEndMs": 6081392,
          "text": "壁に飾れるって!"
        },
        {
          "speechId": 902,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6081392,
          "sourceEndMs": 6082753,
          "text": "壁に飾れるんだよ!"
        },
        {
          "speechId": 903,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6082753,
          "sourceEndMs": 6086977,
          "text": "飾る飾るそしたらよ!"
        },
        {
          "speechId": 904,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6086977,
          "sourceEndMs": 6087837,
          "text": "壁に飾れるの?"
        },
        {
          "speechId": 905,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6090682,
          "sourceEndMs": 6119386,
          "text": "壁がついたらば飾るかそうねあいつバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバカバ"
        },
        {
          "speechId": 906,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6123928,
          "sourceEndMs": 6140738,
          "text": "なんだ、まず焼けるの遅いなよしえっと、で何をしてたんだっけあ、そうだ、まずすり減った床を増やそう板12枚入れたナイスーナイスーからの?"
        },
        {
          "speechId": 907,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6140738,
          "sourceEndMs": 6141359,
          "text": "からの?"
        },
        {
          "speechId": 908,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6141359,
          "sourceEndMs": 6149984,
          "text": "あ、流れてきてますねーいいねーおっけおっけいい感じよパッケージ拾ってたあ、いいねー"
        },
        {
          "speechId": 909,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6150150,
          "sourceEndMs": 6152731,
          "text": "開けちゃお中は何かな?"
        },
        {
          "speechId": 910,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6152731,
          "sourceEndMs": 6179484,
          "text": "パカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパカパ"
        },
        {
          "speechId": 911,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6180274,
          "sourceEndMs": 6203868,
          "text": "で、えーと、んーとじゃあここにヤシの木の大物、大規格の作物を何個、3個くらいあってもいいと思う人はーいカイコーネさんとはい、一味の皆さんはどう思われますか?"
        },
        {
          "speechId": 912,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6203868,
          "sourceEndMs": 6204789,
          "text": "君たちー?"
        },
        {
          "speechId": 913,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6204789,
          "sourceEndMs": 6205149,
          "text": "君たちー?"
        },
        {
          "speechId": 914,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6205149,
          "sourceEndMs": 6209932,
          "text": "はーい、だってあ、じゃあ3つくらい作り"
        },
        {
          "speechId": 915,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6210474,
          "sourceEndMs": 6213315,
          "text": "君たち意見を採用して差し上げましょう"
        },
        {
          "speechId": 916,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6241023,
          "sourceEndMs": 6249827,
          "text": "取ると言ってもありけりよ6個も使うのか釘ちょっと重てえな6個か釘?"
        },
        {
          "speechId": 917,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6249827,
          "sourceEndMs": 6252549,
          "text": "釘いっぱいなかったっけ?"
        },
        {
          "speechId": 918,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6252549,
          "sourceEndMs": 6268278,
          "text": "そっかここに待って釘いっぱいあるわ思い返してみると釘いっぱいあるどうしたどうしたハマったハマったごめんなさいハマってました今感じてた今ハマり散らかしてあついたねこれアンカーいらなくないこれほんと?"
        },
        {
          "speechId": 919,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6268278,
          "sourceEndMs": 6268698,
          "text": "もしにや"
        },
        {
          "speechId": 920,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6269270,
          "sourceEndMs": 6269657,
          "text": "とか言って"
        },
        {
          "speechId": 921,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6270000,
          "sourceEndMs": 6271020,
          "text": "どうする?"
        },
        {
          "speechId": 922,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6271020,
          "sourceEndMs": 6276563,
          "text": "あれ鉱石あんだってちょっと集めてくるわちょっとあれ船長?"
        },
        {
          "speechId": 923,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6276563,
          "sourceEndMs": 6276623,
          "text": "ん?"
        },
        {
          "speechId": 924,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6276623,
          "sourceEndMs": 6277023,
          "text": "待ってどうした?"
        },
        {
          "speechId": 925,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6277023,
          "sourceEndMs": 6287447,
          "text": "気のせいかサメに食われてるような気がしたんだすごいなサメに食われて自覚ないってやばいないやイカダの方だからさ自覚じゃあないじゃん?"
        },
        {
          "speechId": 926,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6287447,
          "sourceEndMs": 6299272,
          "text": "なるほどね次パートは失礼よかったよかった板もちょっと回収してここガラスも引っ張るじゃあこれで清浄機をちょっと一個作って"
        },
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
        },
        {
          "speechId": 932,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6361383,
          "sourceEndMs": 6362065,
          "text": "見てて?"
        },
        {
          "speechId": 933,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6362065,
          "sourceEndMs": 6362286,
          "text": "分かった"
        },
        {
          "speechId": 934,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6390286,
          "sourceEndMs": 6390766,
          "text": "いた!"
        },
        {
          "speechId": 935,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6390766,
          "sourceEndMs": 6391527,
          "text": "18枚!"
        },
        {
          "speechId": 936,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6391527,
          "sourceEndMs": 6392948,
          "text": "あ、ナイス!"
        },
        {
          "speechId": 937,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6392948,
          "sourceEndMs": 6394909,
          "text": "鉱石は?"
        },
        {
          "speechId": 938,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6394909,
          "sourceEndMs": 6395669,
          "text": "鉱石?"
        },
        {
          "speechId": 939,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6395669,
          "sourceEndMs": 6399091,
          "text": "鉱石!"
        },
        {
          "speechId": 940,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6399091,
          "sourceEndMs": 6404515,
          "text": "君の笑顔が鉱石だよやがましすぎる、ちょっと待ってサメ、サメ来て!"
        },
        {
          "speechId": 941,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6404515,
          "sourceEndMs": 6406996,
          "text": "そんなこと言ってる場合じゃねえんだよ!"
        },
        {
          "speechId": 942,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6406996,
          "sourceEndMs": 6409217,
          "text": "サメが来てんだよ、サメ貝は!"
        },
        {
          "speechId": 943,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6409217,
          "sourceEndMs": 6410418,
          "text": "鉱石がないです!"
        },
        {
          "speechId": 944,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6410418,
          "sourceEndMs": 6415321,
          "text": "まあまあ、まあいいでしょうで、何をしたいんだっけ?"
        },
        {
          "speechId": 945,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6415321,
          "sourceEndMs": 6419384,
          "text": "船長あ、そうだ、えーと、であ、いたいたいたいや、こんなに離れちゃうもんなんだな"
        },
        {
          "speechId": 946,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6421242,
          "sourceEndMs": 6421542,
          "text": "ね!"
        },
        {
          "speechId": 947,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6421542,
          "sourceEndMs": 6422683,
          "text": "意外と移動してたね!"
        },
        {
          "speechId": 948,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6422683,
          "sourceEndMs": 6423464,
          "text": "ね!"
        },
        {
          "speechId": 949,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6423464,
          "sourceEndMs": 6436173,
          "text": "こんなに離れちゃうのかOKOK良いね良いね、挟まってたのいっぱいじゃあこれを板12枚入れたよーありがとう!"
        },
        {
          "speechId": 950,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6436173,
          "sourceEndMs": 6437494,
          "text": "ナイス!"
        },
        {
          "speechId": 951,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6437494,
          "sourceEndMs": 6438115,
          "text": "ナイス!"
        },
        {
          "speechId": 952,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6438115,
          "sourceEndMs": 6448103,
          "text": "水物見て水物見て釣り竿古い方使っちゃおうえ、まだお腹空いてないの?"
        },
        {
          "speechId": 953,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6448103,
          "sourceEndMs": 6449243,
          "text": "マリリンまだ行けるかな?"
        },
        {
          "speechId": 954,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6449243,
          "sourceEndMs": 6449964,
          "text": "マジ?"
        },
        {
          "speechId": 955,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6451610,
          "sourceEndMs": 6479458,
          "text": "そろそろ減ってくるかなってところまず食べちゃおうからねいいよお腹減ってんな食べなそれはマリンにくださいよっていうのかと思ったそれは船長のですよそっかマリン船長っていうか解像度低いのやめてよ学習学習つらいコーネに分かってもらえてなかったのつらい"
        },
        {
          "speechId": 956,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6480406,
          "sourceEndMs": 6484328,
          "text": "え、分かってるよ分かってくれてる?"
        },
        {
          "speechId": 957,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6484328,
          "sourceEndMs": 6510760,
          "text": "マリンは船長って言うよねでも知らなかったじゃん今完全にさ知らなかったわけじゃないとっさに出ちゃうよやっぱりマリンって呼んでるからさあー特別なね呼び方だからねそうだよそうだよじゃあしょうがない最近最近さなんか呼び捨てで呼ぶ時もあるからさそうですねマリンのこと最近そうなってきたよねなんかさ匂わしちゃってわかりみわかりみ"
        },
        {
          "speechId": 958,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6531258,
          "sourceEndMs": 6538283,
          "text": "正常期って確かに2階に置いたら水汲んで入れるのが大変かどう考えても確かにそうだなでも1階と2階と3階に作れば?"
        },
        {
          "speechId": 959,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6538283,
          "sourceEndMs": 6539604,
          "text": "3階作る予定でいる"
        },
        {
          "speechId": 960,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6540500,
          "sourceEndMs": 6551645,
          "text": "いやでもさ、あれなんだよね普通に水を汲むのがさ、汲んでさ、入れるじゃん清浄機にさ、水をさうんうんそう、大変じゃね?"
        },
        {
          "speechId": 961,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6551645,
          "sourceEndMs": 6558467,
          "text": "ちょっと普通にさ水を下で汲んで上にさ、入れに行くっていうあーそういうこと?"
        },
        {
          "speechId": 962,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6558467,
          "sourceEndMs": 6569832,
          "text": "確かに、こうやって見ると間違いなくそうだな下でペットボトルで持って行くあ、なるほどね、じゃあこれを確かにペットボトルでいいか、こうしてあ、こうやってね"
        },
        {
          "speechId": 963,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6570682,
          "sourceEndMs": 6576625,
          "text": "確かにこれでいいなあもうできてんじゃん早もうできてるえマジ?"
        },
        {
          "speechId": 964,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6576625,
          "sourceEndMs": 6592494,
          "text": "やしの木ありがたいねありがてえここにじゃあ種も入れて冷静にじゃあ青少期はやっぱ下に置くとしてあ種次郎種次郎種次郎?"
        },
        {
          "speechId": 965,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6600000,
          "sourceEndMs": 6600340,
          "text": "何?"
        },
        {
          "speechId": 966,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6600340,
          "sourceEndMs": 6605802,
          "text": "じわじわ笑うのやめてごめん何ウケ?"
        },
        {
          "speechId": 967,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6605802,
          "sourceEndMs": 6613465,
          "text": "ちょっと待ってジローって何だろうと思ってねぇハマグリいらんくない?"
        },
        {
          "speechId": 968,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6613465,
          "sourceEndMs": 6614245,
          "text": "ハマグリ?"
        },
        {
          "speechId": 969,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6614245,
          "sourceEndMs": 6617346,
          "text": "あぁでもどうだろういらんかなぁ?"
        },
        {
          "speechId": 970,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6617346,
          "sourceEndMs": 6627110,
          "text": "捨てるってことはないよストレージ増やすからちょっと待ってなあ終わったとりあえずここ入れちゃうわそしたらハマグリいけ?"
        },
        {
          "speechId": 971,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6627110,
          "sourceEndMs": 6627490,
          "text": "いけよ"
        },
        {
          "speechId": 972,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6628962,
          "sourceEndMs": 6629636,
          "text": "そしてストレージ"
        },
        {
          "speechId": 973,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6630162,
          "sourceEndMs": 6644967,
          "text": "これをね増やせばいいだけのことストレージだらけになっちゃうなでも壁にかけれるというね説がね今あるからねあーなるほどねテーブルきたなテーブルテーブル何置くん?"
        },
        {
          "speechId": 974,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6644967,
          "sourceEndMs": 6659272,
          "text": "テーブルいいね何置こうねテーブルこっちやちょっと待ってじゃあストレージまず一回ストレージ一個作ってでかいの方がいいよね"
        },
        {
          "speechId": 975,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6660086,
          "sourceEndMs": 6680100,
          "text": "でもちょっと蝶使い使うのが嫌だけどそうなんかもったいないよなまあいいかちょっと作っちゃう壁に掛けれるかチェックするわOKあ、ほんとだ3つはいける計算かしらこれすごいいけるのかな?"
        },
        {
          "speechId": 976,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6680100,
          "sourceEndMs": 6680400,
          "text": "いいんじゃない?"
        },
        {
          "speechId": 977,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6680400,
          "sourceEndMs": 6688706,
          "text": "開けれる開けれる開けれる痛いじゃんいいじゃんここに大容量スクラップばっかり"
        },
        {
          "speechId": 978,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6693504,
          "sourceEndMs": 6719884,
          "text": "ストレージストレージは使うからいいよねストレージいくつあっても足りんなぁいいよね作っちゃってうん作っていい作っていいびっしり3つここにね見て見てこうね壁にかけてみたすげぇ見てないじゃん先生お前すげぇすげぇ1ミリも見ないでさぁこれ何入れるこれ決めとこうよこれ待ってサメやったサメやったサメやった"
        },
        {
          "speechId": 979,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6721494,
          "sourceEndMs": 6722755,
          "text": "なんで?"
        },
        {
          "speechId": 980,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6722755,
          "sourceEndMs": 6723455,
          "text": "どうして?"
        },
        {
          "speechId": 981,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6723455,
          "sourceEndMs": 6724796,
          "text": "どこで?"
        },
        {
          "speechId": 982,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6724796,
          "sourceEndMs": 6749852,
          "text": "今普通に殺してたらやったすごいじゃんやりました壁作ったらさ頭飾れるもんねそう飾ろう飾ろう適当にさ適当じゃないすげーだって周りに言ってたじゃん君たちラグを考慮してコメントしなさいよって言ったじゃんそれは王将海賊"
        },
        {
          "speechId": 983,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6750130,
          "sourceEndMs": 6751591,
          "text": "ご飯の話でコーネは別でしょ?"
        },
        {
          "speechId": 984,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6751591,
          "sourceEndMs": 6753492,
          "text": "あ、違うの?"
        },
        {
          "speechId": 985,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6753492,
          "sourceEndMs": 6760055,
          "text": "ご飯食べようご飯食べてあ、ご飯ね、ここあ、違うよ、それ、それを小せいやつだから生酢いらない?"
        },
        {
          "speechId": 986,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6760055,
          "sourceEndMs": 6771480,
          "text": "生酢え、でもこれ食べてさ、ここにさ入れるからあの、サメの肉をえ、でもさ、これ焼かなきゃいけないんだよあ?"
        },
        {
          "speechId": 987,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6771480,
          "sourceEndMs": 6772540,
          "text": "どれ?"
        },
        {
          "speechId": 988,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6772540,
          "sourceEndMs": 6775622,
          "text": "そんな小物あるサメの肉に決まってっしょ?"
        },
        {
          "speechId": 989,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6775622,
          "sourceEndMs": 6776903,
          "text": "あらよ!"
        },
        {
          "speechId": 990,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6776903,
          "sourceEndMs": 6778363,
          "text": "あらよ!"
        },
        {
          "speechId": 991,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6778363,
          "sourceEndMs": 6779244,
          "text": "ホルダーすごいな"
        },
        {
          "speechId": 992,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6780086,
          "sourceEndMs": 6781567,
          "text": "にっこり笑ってるよ?"
        },
        {
          "speechId": 993,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6781567,
          "sourceEndMs": 6781887,
          "text": "何?"
        },
        {
          "speechId": 994,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6781887,
          "sourceEndMs": 6782087,
          "text": "何?"
        },
        {
          "speechId": 995,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6782087,
          "sourceEndMs": 6782948,
          "text": "何が?"
        },
        {
          "speechId": 996,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6782948,
          "sourceEndMs": 6792473,
          "text": "うふふってサメが肉が笑ってる独特な感性で物を言わないでもらっていい?"
        },
        {
          "speechId": 997,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6792473,
          "sourceEndMs": 6800778,
          "text": "はーいはーいはーいあ、待って何かあ、なんかあ、ヒロちゃんヒロちゃんナイスナイスナイスヒロちゃんナイス?"
        },
        {
          "speechId": 998,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6800778,
          "sourceEndMs": 6810000,
          "text": "じゃあちょっとここにでかいストレージ置いたことによってここから整理整頓を今からここから始めましょうOK言われたら今度やっとく"
        },
        {
          "speechId": 999,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6810022,
          "sourceEndMs": 6814025,
          "text": "え、じゃあねーどうしたらいいと思う?"
        },
        {
          "speechId": 1000,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6814025,
          "sourceEndMs": 6838782,
          "text": "え、待ってあれなんかあるよ、こうね、あそこほらほらほんとや飛び込んで、待ってわかった、向かうわそっちにこらよえっとこらねこらよえ、もうちょっとこっちかこらよでもさっきサメ殺したからワンチャン安定しかいね、まだあれかもね、来ないかもねワンチャン安定してる、安牌"
        },
        {
          "speechId": 1001,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6840222,
          "sourceEndMs": 6841343,
          "text": "チャンスタイムまであれ?"
        },
        {
          "speechId": 1002,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6841343,
          "sourceEndMs": 6870000,
          "text": "ちょっと見るわうーんとねあ、カゴ拾ったえぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇ"
        },
        {
          "speechId": 1003,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6870114,
          "sourceEndMs": 6881063,
          "text": "じわじわ送るよなオッケー何を拾ったかと言いますとあ、レシピとネジとあ、いいじゃんネジあ、でもしょうもないなそれぐらいか?"
        },
        {
          "speechId": 1004,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6881063,
          "sourceEndMs": 6883925,
          "text": "あ、それぐらいかまあまあまあ板20枚入ってたの?"
        },
        {
          "speechId": 1005,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6883925,
          "sourceEndMs": 6890751,
          "text": "あ、いいじゃんおいしいね助かるねおいしいおいしいあ、じゃあさどうしようか板さここに全部しまう?"
        },
        {
          "speechId": 1006,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6890751,
          "sourceEndMs": 6896756,
          "text": "あ、そうだなんか上からさなんか使う資材順みたいなあ、じゃあ一番上板にする?"
        },
        {
          "speechId": 1007,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6896756,
          "sourceEndMs": 6898637,
          "text": "そうやねん使う資材順にちょっと入れていくかオッケー"
        },
        {
          "speechId": 1008,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6900970,
          "sourceEndMs": 6919398,
          "text": "楽しくなってきたぞなってきたね整理整頓始まったなねーどうやって分けるのがいいかなちょっと君たちおすすめの分け方をねコメントで教えてください木材&ロープ次がプラ&スクラップだって木材&ロープはいで?"
        },
        {
          "speechId": 1009,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6919398,
          "sourceEndMs": 6921339,
          "text": "プラ&スクラップ?"
        },
        {
          "speechId": 1010,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6921339,
          "sourceEndMs": 6928882,
          "text": "そうでその下が鉱石鉱石系もろもろ終わったこれ分からすぎな"
        },
        {
          "speechId": 1011,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6930382,
          "sourceEndMs": 6946514,
          "text": "また箱増やすわじゃあもっとわかりやすくするためにありがとね寄れるのりょうじゃあやっぱこの階段際のデッドスペースをやっぱり活かすのがやはりこれ大人の女のやることだから大人の女だなそうでしょ?"
        },
        {
          "speechId": 1012,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6946514,
          "sourceEndMs": 6959784,
          "text": "さすがやわここはあえて斜めにするかそれとも素直にこうドドンといくか悩むないいじゃんおしゃれやなどっちがいいかな"
        },
        {
          "speechId": 1013,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6962083,
          "sourceEndMs": 6965825,
          "text": "楽しいこうかな?"
        },
        {
          "speechId": 1014,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6965825,
          "sourceEndMs": 6969707,
          "text": "こうな気がする何?"
        },
        {
          "speechId": 1015,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6969707,
          "sourceEndMs": 6971648,
          "text": "斜めのがいい?"
        },
        {
          "speechId": 1016,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6971648,
          "sourceEndMs": 6972829,
          "text": "どっちがいい?"
        },
        {
          "speechId": 1017,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6972829,
          "sourceEndMs": 6975330,
          "text": "お好みで君たちに聞いてるの?"
        },
        {
          "speechId": 1018,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6975330,
          "sourceEndMs": 6989518,
          "text": "君たちに聞いてるこうねには聞かないちょっと拗ねちゃった新しいあれを作ろう焼けたの?"
        },
        {
          "speechId": 1019,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6991386,
          "sourceEndMs": 6993226,
          "text": "一番下がなんだっけ?"
        },
        {
          "speechId": 1020,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6993226,
          "sourceEndMs": 7005529,
          "text": "一番下が鉱石系ほしいっけネオガニタンなにサメ復活してんじゃんあいつ生き返ってるわサメえ、粘土はどうする?"
        },
        {
          "speechId": 1021,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7005529,
          "sourceEndMs": 7015031,
          "text": "んー、粘土粘土か、じゃあ新しい作るわ粘土砂系のストレージを今から作りますマジ?"
        },
        {
          "speechId": 1022,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7015031,
          "sourceEndMs": 7019772,
          "text": "そのためにはね板が必要なんだ板ね、板ね今一番上に入れとるんでな"
        },
        {
          "speechId": 1023,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7020182,
          "sourceEndMs": 7036194,
          "text": "あ、そうだったさあもうどこにあるか聞くこともなく20枚しかないあ、でも全然助かるちょっとこれでじゃああ、この箱拾おうかあ、待って待って待って行かないで大丈夫?"
        },
        {
          "speechId": 1024,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7036194,
          "sourceEndMs": 7036354,
          "text": "大丈夫か?"
        },
        {
          "speechId": 1025,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7036354,
          "sourceEndMs": 7041157,
          "text": "な、荷物落としたサメ来てる荷物落とした荷物落とした大丈夫?"
        },
        {
          "speechId": 1026,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7041157,
          "sourceEndMs": 7043459,
          "text": "え、待って拾えた?"
        },
        {
          "speechId": 1027,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7043459,
          "sourceEndMs": 7049243,
          "text": "わかんないどっか行った何を落としたんだ私"
        },
        {
          "speechId": 1028,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7052286,
          "sourceEndMs": 7052626,
          "text": "くそー!"
        },
        {
          "speechId": 1029,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7052626,
          "sourceEndMs": 7053107,
          "text": "くそだー!"
        },
        {
          "speechId": 1030,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7053107,
          "sourceEndMs": 7055248,
          "text": "か、かつおー!"
        },
        {
          "speechId": 1031,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7055248,
          "sourceEndMs": 7058290,
          "text": "くそよー!"
        },
        {
          "speechId": 1032,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7058290,
          "sourceEndMs": 7058730,
          "text": "ちょっとあれだねあー!"
        },
        {
          "speechId": 1033,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7058730,
          "sourceEndMs": 7060331,
          "text": "食べられんのよ!"
        },
        {
          "speechId": 1034,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7060331,
          "sourceEndMs": 7061572,
          "text": "は?"
        },
        {
          "speechId": 1035,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7061572,
          "sourceEndMs": 7061872,
          "text": "は?"
        },
        {
          "speechId": 1036,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7061872,
          "sourceEndMs": 7061972,
          "text": "は?"
        },
        {
          "speechId": 1037,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7061972,
          "sourceEndMs": 7062092,
          "text": "は?"
        },
        {
          "speechId": 1038,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7062092,
          "sourceEndMs": 7065555,
          "text": "食べられちゃったえ、ど、どこ?"
        },
        {
          "speechId": 1039,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7065555,
          "sourceEndMs": 7066655,
          "text": "あ、か、ん?"
        },
        {
          "speechId": 1040,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7066655,
          "sourceEndMs": 7066996,
          "text": "床?"
        },
        {
          "speechId": 1041,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7066996,
          "sourceEndMs": 7078903,
          "text": "あ、でもね、今ね、追い払った、素手であ、回収ネット減ったってことかうん、なんか、か、噛みちぎられた、か、噛みちぎられたかと思いきやー思いきやーいや、噛みちぎられてるね"
        },
        {
          "speechId": 1042,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7081634,
          "sourceEndMs": 7108474,
          "text": "え、なんかついたけど島にそう、島ついちゃったからちょっとあれ回す方つけてあれするわ終わったえっと石はでもそんなあれかこっちに石石は何に何に該当するんだろうそれで言うとえ、鉱石じゃないのやっぱりあ、確かに鉱石か確かになえっと"
        },
        {
          "speechId": 1043,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7110258,
          "sourceEndMs": 7139944,
          "text": "楽しい分けるの鳥の声する鳥来てるねでもさ天井があるからさやられなくて済むねいや、愉快だな愉快だね愉快だよスクラッツ、ロープ、蝶津貝待って、持ち物パンパンだったドンベリーアンカー降ろさなくていいわちょっと今一周してきちゃう一周しようと思ったけど島広広い一周できるほどじゃないいや、広すぎだわ"
        },
        {
          "speechId": 1044,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7140062,
          "sourceEndMs": 7160328,
          "text": "ちょっとびっくりしちゃったサーバー置いていつの間にかこんなに拾ってるじゃん板も32枚あるでなOK32枚めっちゃ絨毯だって絨毯?"
        },
        {
          "speechId": 1045,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7160328,
          "sourceEndMs": 7169130,
          "text": "絨毯すごいじゃん絨毯文明が来てるな文明がやばいなこれをこうして"
        },
        {
          "speechId": 1046,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7169698,
          "sourceEndMs": 7170000,
          "text": "ありがとうございました"
        },
        {
          "speechId": 1047,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7171942,
          "sourceEndMs": 7177404,
          "text": "イノシシやりに行こうかやるんですかこれかどう?"
        },
        {
          "speechId": 1048,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7177404,
          "sourceEndMs": 7180545,
          "text": "どうする?"
        },
        {
          "speechId": 1049,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7180545,
          "sourceEndMs": 7199652,
          "text": "まあでもイノシシやるなら昼になってからかな一旦ここセーブしておくわじゃあちょっと下ワカメとか取ってこようかなOKOK行ってきまーすスクラップどっかで見たよなあ綺麗スクラップあそうだコーネがもうやってくれたのかでもそんなにスクラップなかった気がする"
        },
        {
          "speechId": 1050,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7200418,
          "sourceEndMs": 7222096,
          "text": "あ、少ないねスクラップスクラップ少ないよな海の中にあるか見てみるわこうなってくるとストレージがね作れないからねあ、やべ、水筒忘れた水筒だってあ、かわいい満足げななんだっけ?"
        },
        {
          "speechId": 1051,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7222096,
          "sourceEndMs": 7227080,
          "text": "何を入れたいから作ってるんだっけ今これ何を入れたいって言ってたっけ?"
        },
        {
          "speechId": 1052,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7227080,
          "sourceEndMs": 7228541,
          "text": "マリリー?"
        },
        {
          "speechId": 1053,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7228541,
          "sourceEndMs": 7229502,
          "text": "鉱石じゃないかったっけ?"
        },
        {
          "speechId": 1054,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7231334,
          "sourceEndMs": 7235317,
          "text": "鉱石?"
        },
        {
          "speechId": 1055,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7235317,
          "sourceEndMs": 7235397,
          "text": "違った?"
        },
        {
          "speechId": 1056,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7235397,
          "sourceEndMs": 7259298,
          "text": "君たちに聞いた方が早いかもしれないね待って、どんどん流されてるあ、砂とか粘土だった、砂とか粘土あ、砂とか粘土あ、そっか、鳥がいるんだほらよほらよほらよ砂とか粘土しまっとくかうん、こうしてで、ここに砂とか粘土ねオッケー"
        },
        {
          "speechId": 1057,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7265323,
          "sourceEndMs": 7288098,
          "text": "ブドウのベトベトとかそういうさりげないやつはさどうしようかなブドウのベトベトは逆に小さいそのさ、タンスに入れといてさあーそういう、あーなるほどねあぶねー確かにの方がいいかなーそんなんでもいらんもんねそうだね確かにツール系"
        },
        {
          "speechId": 1058,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7292063,
          "sourceEndMs": 7296965,
          "text": "あ、なんかあれか、釣竿とかやべ、めっちゃ流されてるやばい!"
        },
        {
          "speechId": 1059,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7296965,
          "sourceEndMs": 7297826,
          "text": "行くぞ!"
        },
        {
          "speechId": 1060,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7297826,
          "sourceEndMs": 7298886,
          "text": "戻るぞ!"
        },
        {
          "speechId": 1061,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7298886,
          "sourceEndMs": 7301788,
          "text": "待って、そっちに戻るからねマイ、大丈夫?"
        },
        {
          "speechId": 1062,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7301788,
          "sourceEndMs": 7303049,
          "text": "いける?"
        },
        {
          "speechId": 1063,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7303049,
          "sourceEndMs": 7306070,
          "text": "ほうね、あれするわ、回すほんと?"
        },
        {
          "speechId": 1064,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7306070,
          "sourceEndMs": 7308292,
          "text": "ほーんと?"
        },
        {
          "speechId": 1065,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7308292,
          "sourceEndMs": 7312934,
          "text": "ほーんとだよこっちに、これでいいかな?"
        },
        {
          "speechId": 1066,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7312934,
          "sourceEndMs": 7319298,
          "text": "これたぶんじわじわ行くはずいやマジ、申し訳ねえないや、これは"
        },
        {
          "speechId": 1067,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7320202,
          "sourceEndMs": 7349370,
          "text": "マリンにお土産に持って帰ろうお土産なんだろ楽しみ楽しみにしといて板、1、2、3、4、あ、でも5枚くらい取れてるのか、結構いいなよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよしよし"
        },
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
        },
        {
          "speechId": 1100,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7620022,
          "sourceEndMs": 7627605,
          "text": "壁歩いてる?"
        },
        {
          "speechId": 1101,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7627605,
          "sourceEndMs": 7640969,
          "text": "すごいでしょ来たよ結婚しなきゃなじゃあ結婚する?"
        },
        {
          "speechId": 1102,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7640969,
          "sourceEndMs": 7649732,
          "text": "楽しそうだな今向かってるからなこっちも向かってるほらなんか持ってるスイカ"
        },
        {
          "speechId": 1103,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7653690,
          "sourceEndMs": 7653810,
          "text": "よし!"
        },
        {
          "speechId": 1104,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7653810,
          "sourceEndMs": 7654010,
          "text": "よし!"
        },
        {
          "speechId": 1105,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7654010,
          "sourceEndMs": 7654170,
          "text": "よし!"
        },
        {
          "speechId": 1106,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7654170,
          "sourceEndMs": 7654230,
          "text": "よし!"
        },
        {
          "speechId": 1107,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7654230,
          "sourceEndMs": 7654390,
          "text": "よし!"
        },
        {
          "speechId": 1108,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7654390,
          "sourceEndMs": 7654550,
          "text": "よし!"
        },
        {
          "speechId": 1109,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7654550,
          "sourceEndMs": 7654611,
          "text": "よし!"
        },
        {
          "speechId": 1110,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7654611,
          "sourceEndMs": 7654751,
          "text": "よし!"
        },
        {
          "speechId": 1111,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7654751,
          "sourceEndMs": 7654931,
          "text": "よし!"
        },
        {
          "speechId": 1112,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7654931,
          "sourceEndMs": 7654991,
          "text": "よし!"
        },
        {
          "speechId": 1113,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7654991,
          "sourceEndMs": 7655111,
          "text": "よし!"
        },
        {
          "speechId": 1114,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7655111,
          "sourceEndMs": 7655211,
          "text": "よし!"
        },
        {
          "speechId": 1115,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7655211,
          "sourceEndMs": 7655271,
          "text": "よし!"
        },
        {
          "speechId": 1116,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7655271,
          "sourceEndMs": 7655331,
          "text": "よし!"
        },
        {
          "speechId": 1117,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7655331,
          "sourceEndMs": 7655471,
          "text": "よし!"
        },
        {
          "speechId": 1118,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7655471,
          "sourceEndMs": 7655731,
          "text": "よし!"
        },
        {
          "speechId": 1119,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7655731,
          "sourceEndMs": 7655931,
          "text": "よし!"
        },
        {
          "speechId": 1120,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7655931,
          "sourceEndMs": 7656011,
          "text": "よし!"
        },
        {
          "speechId": 1121,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7656011,
          "sourceEndMs": 7656151,
          "text": "よし!"
        },
        {
          "speechId": 1122,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7656151,
          "sourceEndMs": 7656231,
          "text": "よし!"
        },
        {
          "speechId": 1123,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7656231,
          "sourceEndMs": 7656291,
          "text": "よし!"
        },
        {
          "speechId": 1124,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7656291,
          "sourceEndMs": 7656391,
          "text": "よし!"
        },
        {
          "speechId": 1125,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7656391,
          "sourceEndMs": 7656451,
          "text": "よし!"
        },
        {
          "speechId": 1126,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7656451,
          "sourceEndMs": 7656512,
          "text": "よし!"
        },
        {
          "speechId": 1127,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7656512,
          "sourceEndMs": 7656572,
          "text": "よし!"
        },
        {
          "speechId": 1128,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7656572,
          "sourceEndMs": 7656632,
          "text": "よし!"
        },
        {
          "speechId": 1129,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7656632,
          "sourceEndMs": 7656912,
          "text": "よし!"
        },
        {
          "speechId": 1130,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7656912,
          "sourceEndMs": 7656972,
          "text": "よし!"
        },
        {
          "speechId": 1131,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7656972,
          "sourceEndMs": 7657032,
          "text": "よし!"
        },
        {
          "speechId": 1132,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7657032,
          "sourceEndMs": 7657092,
          "text": "よし!"
        },
        {
          "speechId": 1133,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7657092,
          "sourceEndMs": 7657292,
          "text": "よし!"
        },
        {
          "speechId": 1134,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7657292,
          "sourceEndMs": 7657372,
          "text": "よし!"
        },
        {
          "speechId": 1135,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7657372,
          "sourceEndMs": 7657432,
          "text": "よし!"
        },
        {
          "speechId": 1136,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7657432,
          "sourceEndMs": 7657492,
          "text": "よし!"
        },
        {
          "speechId": 1137,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7657492,
          "sourceEndMs": 7657552,
          "text": "よし!"
        },
        {
          "speechId": 1138,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7657552,
          "sourceEndMs": 7657712,
          "text": "よし!"
        },
        {
          "speechId": 1139,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7657712,
          "sourceEndMs": 7657772,
          "text": "よし!"
        },
        {
          "speechId": 1140,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7657772,
          "sourceEndMs": 7657892,
          "text": "よし!"
        },
        {
          "speechId": 1141,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7657892,
          "sourceEndMs": 7657972,
          "text": "よし!"
        },
        {
          "speechId": 1142,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7657972,
          "sourceEndMs": 7658032,
          "text": "よし!"
        },
        {
          "speechId": 1143,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7658032,
          "sourceEndMs": 7658092,
          "text": "よし!"
        },
        {
          "speechId": 1144,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7658092,
          "sourceEndMs": 7658152,
          "text": "よし!"
        },
        {
          "speechId": 1145,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7658152,
          "sourceEndMs": 7658212,
          "text": "よし!"
        },
        {
          "speechId": 1146,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7658212,
          "sourceEndMs": 7658292,
          "text": "よし!"
        },
        {
          "speechId": 1147,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7658292,
          "sourceEndMs": 7658352,
          "text": "よし!"
        },
        {
          "speechId": 1148,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7658352,
          "sourceEndMs": 7658413,
          "text": "よし!"
        },
        {
          "speechId": 1149,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7658413,
          "sourceEndMs": 7658473,
          "text": "よし!"
        },
        {
          "speechId": 1150,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7658473,
          "sourceEndMs": 7658613,
          "text": "よし!"
        },
        {
          "speechId": 1151,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7658613,
          "sourceEndMs": 7658713,
          "text": "よし!"
        },
        {
          "speechId": 1152,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7658713,
          "sourceEndMs": 7658773,
          "text": "よし!"
        },
        {
          "speechId": 1153,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7658773,
          "sourceEndMs": 7658833,
          "text": "よし!"
        },
        {
          "speechId": 1154,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7658833,
          "sourceEndMs": 7660254,
          "text": "よし!"
        },
        {
          "speechId": 1155,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7660254,
          "sourceEndMs": 7660454,
          "text": "よし!"
        },
        {
          "speechId": 1156,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7660454,
          "sourceEndMs": 7660694,
          "text": "よし!"
        },
        {
          "speechId": 1157,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7660694,
          "sourceEndMs": 7660814,
          "text": "よし!"
        },
        {
          "speechId": 1158,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7660814,
          "sourceEndMs": 7661074,
          "text": "よし!"
        },
        {
          "speechId": 1159,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7661074,
          "sourceEndMs": 7661294,
          "text": "よし!"
        },
        {
          "speechId": 1160,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7661294,
          "sourceEndMs": 7661474,
          "text": "よし!"
        },
        {
          "speechId": 1161,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7661474,
          "sourceEndMs": 7661814,
          "text": "よし!"
        },
        {
          "speechId": 1162,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7661814,
          "sourceEndMs": 7661934,
          "text": "よし!"
        },
        {
          "speechId": 1163,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7661934,
          "sourceEndMs": 7661994,
          "text": "よし!"
        },
        {
          "speechId": 1164,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7661994,
          "sourceEndMs": 7662114,
          "text": "よし!"
        },
        {
          "speechId": 1165,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7662114,
          "sourceEndMs": 7662335,
          "text": "よし!"
        },
        {
          "speechId": 1166,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7662335,
          "sourceEndMs": 7662535,
          "text": "よし!"
        },
        {
          "speechId": 1167,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7662535,
          "sourceEndMs": 7663975,
          "text": "よし!"
        },
        {
          "speechId": 1168,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7663975,
          "sourceEndMs": 7664176,
          "text": "よし!"
        },
        {
          "speechId": 1169,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7664176,
          "sourceEndMs": 7664476,
          "text": "よし!"
        },
        {
          "speechId": 1170,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7664476,
          "sourceEndMs": 7664536,
          "text": "よし!"
        },
        {
          "speechId": 1171,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7664536,
          "sourceEndMs": 7664836,
          "text": "よし!"
        },
        {
          "speechId": 1172,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7664836,
          "sourceEndMs": 7664916,
          "text": "よし!"
        },
        {
          "speechId": 1173,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7664916,
          "sourceEndMs": 7665156,
          "text": "よし!"
        },
        {
          "speechId": 1174,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7665156,
          "sourceEndMs": 7665496,
          "text": "よし!"
        },
        {
          "speechId": 1175,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7665496,
          "sourceEndMs": 7665596,
          "text": "よし!"
        },
        {
          "speechId": 1176,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7665596,
          "sourceEndMs": 7666617,
          "text": "よし!"
        },
        {
          "speechId": 1177,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7666617,
          "sourceEndMs": 7666677,
          "text": "よし!"
        },
        {
          "speechId": 1178,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7666677,
          "sourceEndMs": 7667777,
          "text": "よし!"
        },
        {
          "speechId": 1179,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7667777,
          "sourceEndMs": 7667838,
          "text": "よし!"
        },
        {
          "speechId": 1180,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7667838,
          "sourceEndMs": 7667898,
          "text": "よし!"
        },
        {
          "speechId": 1181,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7667898,
          "sourceEndMs": 7667958,
          "text": "よし!"
        },
        {
          "speechId": 1182,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7667958,
          "sourceEndMs": 7668038,
          "text": "よし!"
        },
        {
          "speechId": 1183,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7668038,
          "sourceEndMs": 7668438,
          "text": "よし!"
        },
        {
          "speechId": 1184,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7668438,
          "sourceEndMs": 7668818,
          "text": "よし!"
        },
        {
          "speechId": 1185,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7668818,
          "sourceEndMs": 7669058,
          "text": "よし!"
        },
        {
          "speechId": 1186,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7669058,
          "sourceEndMs": 7669899,
          "text": "よし!"
        },
        {
          "speechId": 1187,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7669899,
          "sourceEndMs": 7672500,
          "text": "よし!"
        },
        {
          "speechId": 1188,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7672500,
          "sourceEndMs": 7673861,
          "text": "よし!"
        },
        {
          "speechId": 1189,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7673861,
          "sourceEndMs": 7673921,
          "text": "よし!"
        },
        {
          "speechId": 1190,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7673921,
          "sourceEndMs": 7673981,
          "text": "よし!"
        },
        {
          "speechId": 1191,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7673981,
          "sourceEndMs": 7674121,
          "text": "よし!"
        },
        {
          "speechId": 1192,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7674121,
          "sourceEndMs": 7674301,
          "text": "よし!"
        },
        {
          "speechId": 1193,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7674301,
          "sourceEndMs": 7674361,
          "text": "よし!"
        },
        {
          "speechId": 1194,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7674361,
          "sourceEndMs": 7674421,
          "text": "よし!"
        },
        {
          "speechId": 1195,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7674421,
          "sourceEndMs": 7676382,
          "text": "よし!"
        },
        {
          "speechId": 1196,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7676382,
          "sourceEndMs": 7676462,
          "text": "よし!"
        },
        {
          "speechId": 1197,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7676462,
          "sourceEndMs": 7676662,
          "text": "よし!"
        },
        {
          "speechId": 1198,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7676662,
          "sourceEndMs": 7676742,
          "text": "よし!"
        },
        {
          "speechId": 1199,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7676742,
          "sourceEndMs": 7676802,
          "text": "よし!"
        },
        {
          "speechId": 1200,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7676802,
          "sourceEndMs": 7676862,
          "text": "よし!"
        },
        {
          "speechId": 1201,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7676862,
          "sourceEndMs": 7677082,
          "text": "よし!"
        },
        {
          "speechId": 1202,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7677082,
          "sourceEndMs": 7677543,
          "text": "よし!"
        },
        {
          "speechId": 1203,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7677543,
          "sourceEndMs": 7678743,
          "text": "よし!"
        },
        {
          "speechId": 1204,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7678743,
          "sourceEndMs": 7679003,
          "text": "よし!"
        },
        {
          "speechId": 1205,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7679003,
          "sourceEndMs": 7679063,
          "text": "よし!"
        },
        {
          "speechId": 1206,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7679063,
          "sourceEndMs": 7679124,
          "text": "よし!"
        },
        {
          "speechId": 1207,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7679124,
          "sourceEndMs": 7679184,
          "text": "よし!"
        },
        {
          "speechId": 1208,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7679184,
          "sourceEndMs": 7679264,
          "text": "よし!"
        },
        {
          "speechId": 1209,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7679264,
          "sourceEndMs": 7679324,
          "text": "よし!"
        },
        {
          "speechId": 1210,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7679324,
          "sourceEndMs": 7679524,
          "text": "よし!"
        },
        {
          "speechId": 1211,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7679524,
          "sourceEndMs": 7679704,
          "text": "よし!"
        },
        {
          "speechId": 1212,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7679704,
          "sourceEndMs": 7679804,
          "text": "よし!"
        },
        {
          "speechId": 1213,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7679804,
          "sourceEndMs": 7679964,
          "text": "よし!"
        },
        {
          "speechId": 1214,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7679964,
          "sourceEndMs": 7680000,
          "text": "よし"
        },
        {
          "speechId": 1215,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7681101,
          "sourceEndMs": 7686024,
          "text": "いいよ下は探索しないけど大丈夫?"
        },
        {
          "speechId": 1216,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7686024,
          "sourceEndMs": 7687365,
          "text": "一旦いいんじゃない?"
        },
        {
          "speechId": 1217,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7687365,
          "sourceEndMs": 7696430,
          "text": "一旦了解とりあえずねなんでこっち見てくんの?"
        },
        {
          "speechId": 1218,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7696430,
          "sourceEndMs": 7700873,
          "text": "なんか別に見ただけじゃんそんな見られたら何?"
        },
        {
          "speechId": 1219,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7700873,
          "sourceEndMs": 7708118,
          "text": "ってなるじゃんごめんね生の肉焼いてますストレージねこうして"
        },
        {
          "speechId": 1220,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7709515,
          "sourceEndMs": 7709983,
          "text": "ろっこつ"
        },
        {
          "speechId": 1221,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7710506,
          "sourceEndMs": 7739692,
          "text": "作って6個あれば大体まかないそうだよねあとはもう細かいストレージでそうね小さい人たちにここに2つ付けたりとかっていうのも可能なんだろうかちょっとやってみるかここの種系もしまうところそうね、種なぶどうのベトベトを入れてここが鉱石か"
        },
        {
          "speechId": 1222,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7740970,
          "sourceEndMs": 7769844,
          "text": "犬獅子の頭入ってるよねごめんごめんごめんごめんごめんなさい回収しに行きます装備入れる棚とかもあったら便利だよね確かに言われてみると言われてねーけどさ言われてみると確かにそうなに笑ってんの面白いなと思ってごめんねスクラップスクラップないかな"
        },
        {
          "speechId": 1223,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7770146,
          "sourceEndMs": 7775129,
          "text": "もうなくなっちったかななくなっちったかもスクラップ?"
        },
        {
          "speechId": 1224,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7775129,
          "sourceEndMs": 7783874,
          "text": "そうあ、ガラス拾ったよ見てあ、これ持てないかこれんー持ててない持てない?"
        },
        {
          "speechId": 1225,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7783874,
          "sourceEndMs": 7784215,
          "text": "これは?"
        },
        {
          "speechId": 1226,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7784215,
          "sourceEndMs": 7798903,
          "text": "あ、あったあったスクラップあったわなにこれ待ってあ、待たなくていいわ待てないよ別にひどーい"
        },
        {
          "speechId": 1227,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7800514,
          "sourceEndMs": 7829952,
          "text": "別に待ってないよーひどくなーいとりあえず作ってここ置いてこれね、あ、板めっちゃ引っかかってるわ、すごいわよし、もう降りよ今考えてる、うーん、そうだなー今考えて、考えて、考えて、うぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅ"
        },
        {
          "speechId": 1228,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7831238,
          "sourceEndMs": 7833238,
          "text": "花とかいる?"
        },
        {
          "speechId": 1229,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7833238,
          "sourceEndMs": 7855683,
          "text": "一応でもストレージが増えてるからワンチャンしまえなくもないからあれだな壁作って今あるちっちゃいストレージをいくつか壊してここに引っ掛けてねえねえ今コメントで見たんだけどさいらないものボックスねえ!"
        },
        {
          "speechId": 1230,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7855683,
          "sourceEndMs": 7856703,
          "text": "死ね!"
        },
        {
          "speechId": 1231,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7856703,
          "sourceEndMs": 7859744,
          "text": "いらないものいらないものボックス作って"
        },
        {
          "speechId": 1232,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7860254,
          "sourceEndMs": 7872042,
          "text": "なんかとりあえずいまいらないものボックスみたいなあーオッケーオッケーオッケーオッケー端っこにさ、なんかゴミ箱作ろうぜ、じゃあいいよーゴミ箱という名のストレージを端っこ…あ、じゃあここにしよ、階段横にしない?"
        },
        {
          "speechId": 1233,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7872042,
          "sourceEndMs": 7874984,
          "text": "あ、ブブブ…階段横にしよ、階段横いいね、いいねわかりやすくない?"
        },
        {
          "speechId": 1234,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7874984,
          "sourceEndMs": 7889634,
          "text": "覚えやすい溶けよ、お前マジでね、また乾杯しようあ、そんな…ごめんね、そんな時間ないよなに、乾杯ってね、この…さんこれ"
        },
        {
          "speechId": 1235,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7891182,
          "sourceEndMs": 7892883,
          "text": "いらないものボックス作る前にOK?"
        },
        {
          "speechId": 1236,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7892883,
          "sourceEndMs": 7893523,
          "text": "いいよ?"
        },
        {
          "speechId": 1237,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7893523,
          "sourceEndMs": 7894063,
          "text": "いい?"
        },
        {
          "speechId": 1238,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7894063,
          "sourceEndMs": 7914530,
          "text": "今食ったよなよ1個あげる食べちまったよもうないの?"
        },
        {
          "speechId": 1239,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7914530,
          "sourceEndMs": 7919412,
          "text": "もうない乾杯"
        },
        {
          "speechId": 1240,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7920182,
          "sourceEndMs": 7948778,
          "text": "一人で食べまーすだってさ、い、い、い、いちいのししからさ、に、に、に、ににくしかとれないんだもんだっていちいのししからににく、なるほどそう、ににくしかとれないからーあれとろいけーいまね、サーモン焼いてっからうんサーモンいいねーでかいしなー3回くらい食べれるしえっと、じゃあここにー食べはね食われてるーえっと、で、どうしたいんだっけ"
        },
        {
          "speechId": 1241,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7953528,
          "sourceEndMs": 7979063,
          "text": "じゃあ船長の物もちょっと整理しないとか一回じゃあ鉱石君たちがなんて言ってたか忘れちゃったなあここがスクラップかここにじゃあスクラップちょっと入れてOK海の産物とかねあーいいねでも粘土と砂って海で取れるからさ海藻もここでいいか確かにあれは?"
        },
        {
          "speechId": 1242,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7979063,
          "sourceEndMs": 7979404,
          "text": "ん?"
        },
        {
          "speechId": 1243,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7979404,
          "sourceEndMs": 7979684,
          "text": "川は"
        },
        {
          "speechId": 1244,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7980118,
          "sourceEndMs": 7983079,
          "text": "皮皮?"
        },
        {
          "speechId": 1245,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7983079,
          "sourceEndMs": 8009832,
          "text": "あの、イノシシ倒したらもらえるやつさんああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああ"
        },
        {
          "speechId": 1246,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8012414,
          "sourceEndMs": 8039724,
          "text": "ぬるっと流れてったからちょっとサクッと拾えちゃうってあーごめんそうなのねすぐそこだいいと思うよでもいいと思うそうねバックパック作ろうバックパックあればさもっと拾えて楽になるからじゃあ作るかと思ってよバックパックね今探してるバックパックがいいバックパックなんてなくねさっきでもさ"
        },
        {
          "speechId": 1247,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8045716,
          "sourceEndMs": 8060321,
          "text": "アルパカとかいるの?"
        },
        {
          "speechId": 1248,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8060321,
          "sourceEndMs": 8060781,
          "text": "アルパカ!"
        },
        {
          "speechId": 1249,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8070022,
          "sourceEndMs": 8075186,
          "text": "すごいね詳しいねみんな詳しいよねどうしてそんな詳しい?"
        },
        {
          "speechId": 1250,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8075186,
          "sourceEndMs": 8099026,
          "text": "あれ片付けてネバネバあっサーモン焼けた焼けたからこれこいつとこいつを焼くんだよあれ外したこれでこうだねな美味しく焼けますようにこれ外した箱って"
        },
        {
          "speechId": 1251,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8100258,
          "sourceEndMs": 8103439,
          "text": "回収できてるか?"
        },
        {
          "speechId": 1252,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8103439,
          "sourceEndMs": 8105039,
          "text": "できてない感じ?"
        },
        {
          "speechId": 1253,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8105039,
          "sourceEndMs": 8105219,
          "text": "あれ?"
        },
        {
          "speechId": 1254,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8105219,
          "sourceEndMs": 8107339,
          "text": "さっき一個外した気がするんだけどあれ?"
        },
        {
          "speechId": 1255,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8107339,
          "sourceEndMs": 8111900,
          "text": "葉っぱはどこだっけ?"
        },
        {
          "speechId": 1256,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8111900,
          "sourceEndMs": 8122202,
          "text": "葉っぱここかほらよアイコーンにさっきさ、勉強したけどな材料が足りん?"
        },
        {
          "speechId": 1257,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8122202,
          "sourceEndMs": 8125263,
          "text": "でもあ、あれじゃない?"
        },
        {
          "speechId": 1258,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8125263,
          "sourceEndMs": 8125803,
          "text": "こっちまでな?"
        },
        {
          "speechId": 1259,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8125803,
          "sourceEndMs": 8126023,
          "text": "うんあ、ほんとだ!"
        },
        {
          "speechId": 1260,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8126023,
          "sourceEndMs": 8127423,
          "text": "羊の毛がいるんだ!"
        },
        {
          "speechId": 1261,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8127423,
          "sourceEndMs": 8128084,
          "text": "おー!"
        },
        {
          "speechId": 1262,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8128084,
          "sourceEndMs": 8129744,
          "text": "羊の毛!"
        },
        {
          "speechId": 1263,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8129744,
          "sourceEndMs": 8129964,
          "text": "あ!"
        },
        {
          "speechId": 1264,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8131090,
          "sourceEndMs": 8134372,
          "text": "そのさ、刈り切り鋏みたいなのあったよね、そういえばあったね!"
        },
        {
          "speechId": 1265,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8134372,
          "sourceEndMs": 8135752,
          "text": "あれで刈るんか!"
        },
        {
          "speechId": 1266,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8135752,
          "sourceEndMs": 8159804,
          "text": "あーなるほどなるほどね納得ですあ、そういうことね刈り切り鋏か刈り切り鋏は蝶酢貝と金属のインゴットとスクラップかダメ?"
        },
        {
          "speechId": 1267,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8159804,
          "sourceEndMs": 8159844,
          "text": "うん"
        },
        {
          "speechId": 1268,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8161461,
          "sourceEndMs": 8189252,
          "text": "でも傷だらけやコイツそろそろ死ぬぞ回収ネットがじわじわ破壊されていってるやばいよ地道にやられてんねクソ魚も釣りたいな確かに一旦じゃじゃがいも焼いとくねありがとうレッツじゃがいもレッツじゃがいも?"
        },
        {
          "speechId": 1269,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8189252,
          "sourceEndMs": 8189532,
          "text": "ごはん"
        },
        {
          "speechId": 1270,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8190222,
          "sourceEndMs": 8219984,
          "text": "ご飯浮き場も作ろうかご飯浮き場はこの辺のこの辺のコンロそばでいい気もするよねそうね鳥居間鳥居間作るっしょ毎回何してたか忘れるんだよなこれを外して作業してんねん"
        },
        {
          "speechId": 1271,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8220478,
          "sourceEndMs": 8238666,
          "text": "してんねえゴミ箱が…これ一回開けてやることがもう無限わかる金属製松明いいなランタンだこれ2個並べること可能か?"
        },
        {
          "speechId": 1272,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8238666,
          "sourceEndMs": 8239366,
          "text": "君たち?"
        },
        {
          "speechId": 1273,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8239366,
          "sourceEndMs": 8244628,
          "text": "小さいストレージって2個横に…2個並ぶ?"
        },
        {
          "speechId": 1274,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8244628,
          "sourceEndMs": 8248250,
          "text": "早く…早く教えて"
        },
        {
          "speechId": 1275,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8254193,
          "sourceEndMs": 8279852,
          "text": "早くギリ並ぶだってここいいじゃんもっと可愛く言ってだって可愛いじゃん可愛いんだってみんななんだよその言い方可愛くないみたいだ"
        },
        {
          "speechId": 1276,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8280340,
          "sourceEndMs": 8288562,
          "text": "まるで最上級にかわいい言い方で聞いてみてよめんどくせーなーは?"
        },
        {
          "speechId": 1277,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8288562,
          "sourceEndMs": 8293363,
          "text": "ボコすぞコーネはマリの味方じゃんは?"
        },
        {
          "speechId": 1278,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8293363,
          "sourceEndMs": 8293543,
          "text": "え?"
        },
        {
          "speechId": 1279,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8293543,
          "sourceEndMs": 8294063,
          "text": "あれ?"
        },
        {
          "speechId": 1280,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8294063,
          "sourceEndMs": 8296603,
          "text": "コーネ?"
        },
        {
          "speechId": 1281,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8296603,
          "sourceEndMs": 8297264,
          "text": "いつ?"
        },
        {
          "speechId": 1282,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8297264,
          "sourceEndMs": 8300424,
          "text": "いつから味方になったと思ってんの?"
        },
        {
          "speechId": 1283,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8300424,
          "sourceEndMs": 8301124,
          "text": "え?"
        },
        {
          "speechId": 1284,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8301124,
          "sourceEndMs": 8309026,
          "text": "コーネやだやだやだかわいく言えるじゃねーかうっとうしいマジで"
        },
        {
          "speechId": 1285,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8309739,
          "sourceEndMs": 8310000,
          "text": "はあ"
        },
        {
          "speechId": 1286,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8312099,
          "sourceEndMs": 8339014,
          "text": "起こすぞ切れんの早いんだよ即切れるやん今お魚釣ってるからねありがとうこれだとニコンきついかしらねきついかしらね何がおかしいんですかいきなりお母さんみたいになったからきついかしらねうるせえ"
        },
        {
          "speechId": 1287,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8341206,
          "sourceEndMs": 8343627,
          "text": "うるせぇ?"
        },
        {
          "speechId": 1288,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8343627,
          "sourceEndMs": 8347167,
          "text": "うるせぇうるせぇ?"
        },
        {
          "speechId": 1289,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8347167,
          "sourceEndMs": 8349968,
          "text": "うるせぇからの?"
        },
        {
          "speechId": 1290,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8349968,
          "sourceEndMs": 8363551,
          "text": "うるせぇからのじゃないよサメが来たなぁもう嫌だなぁだいぶ片付いてきたよマジでほんと?"
        },
        {
          "speechId": 1291,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8363551,
          "sourceEndMs": 8369832,
          "text": "うんすっきりしてきためっちゃさすがやんめちゃめちゃいい感じさすがマリーンやさすがマリーンや"
        },
        {
          "speechId": 1292,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8370340,
          "sourceEndMs": 8389575,
          "text": "さすがマリン待って木のとこに葉っぱ入ってるけど葉っぱいいんだっけここに入れといて木のとこにあうん木葉っぱロープは一緒の区分にしてでもさ木さいっぱい入れるからさ葉っぱで溢れちゃうよそんなにあんの?"
        },
        {
          "speechId": 1293,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8389575,
          "sourceEndMs": 8392918,
          "text": "まだないけどさないならいいじゃねえかよ"
        },
        {
          "speechId": 1294,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8394146,
          "sourceEndMs": 8396915,
          "text": "未来、未来の話をしてるでしょ?"
        },
        {
          "speechId": 1295,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8396915,
          "sourceEndMs": 8399703,
          "text": "そんな溢れるほど気取れないと思います"
        },
        {
          "speechId": 1296,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8400086,
          "sourceEndMs": 8414074,
          "text": "そうですかほいさっさほいさっさわかりましたよ遠い未来に起遊しやがってよは?"
        },
        {
          "speechId": 1297,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8414074,
          "sourceEndMs": 8423260,
          "text": "いつの話してんだよまず溢れるくらい集めてみろやは?"
        },
        {
          "speechId": 1298,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8423260,
          "sourceEndMs": 8429984,
          "text": "死なないよナバリンタン死んでもらったら困るよどっちなんだよ本当は仲いいんだけど"
        },
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
        },
        {
          "speechId": 1332,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8700386,
          "sourceEndMs": 8700506,
          "text": "あ、ほんと?"
        },
        {
          "speechId": 1333,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8700506,
          "sourceEndMs": 8702366,
          "text": "え、ないっすそれはちょっと待って、一回荷物しまわないとおらよおらよ何が足りない?"
        },
        {
          "speechId": 1334,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8702366,
          "sourceEndMs": 8729872,
          "text": "石、石、石おらよ石持ってあ、月が見える方向に行った方がいいかなあ、月の方向…あ、待って待ってあ、待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って"
        },
        {
          "speechId": 1335,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8730218,
          "sourceEndMs": 8732779,
          "text": "場所決めて言うわあっすいませんほんとにえーとアンカーアンカーあれ?"
        },
        {
          "speechId": 1336,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8732779,
          "sourceEndMs": 8733919,
          "text": "アン…あれ?"
        },
        {
          "speechId": 1337,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8733919,
          "sourceEndMs": 8759306,
          "text": "あ拾えなかったのかちょちょちょちょっと待てよ待てよいいねごめんねおらよおらよおらよおらよいやドキドキするなこれ"
        },
        {
          "speechId": 1338,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8760034,
          "sourceEndMs": 8783482,
          "text": "待ってよ、アンカーできたあ、違うわこれディスクトップのゴミだったわで、これで落としてとなんか島が見えるけど島ないよね近くにねないね、今アンカー落としてアンカー落としましてはいあ、島見えるわ、島見えるあ、見える?"
        },
        {
          "speechId": 1339,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8783482,
          "sourceEndMs": 8790000,
          "text": "見える島、ちっちゃい島で、今ね夕日が、どっち方向ってなんて言えばいいの"
        },
        {
          "speechId": 1340,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8790060,
          "sourceEndMs": 8798884,
          "text": "これ、コンパスもないからさ島が見えるでしょあ、こっち?"
        },
        {
          "speechId": 1341,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8798884,
          "sourceEndMs": 8800185,
          "text": "島で合流する?"
        },
        {
          "speechId": 1342,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8800185,
          "sourceEndMs": 8805267,
          "text": "島にさ、漂着して待ってよそうね、島これ、同じ島なんかな?"
        },
        {
          "speechId": 1343,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8805267,
          "sourceEndMs": 8818834,
          "text": "これ確かにえ、じゃ、あのさ船長のさ配信でちょっと見てよ、島のオッケーオッケー様子あ、木が生えている島かこれじゃなさそう"
        },
        {
          "speechId": 1344,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8820374,
          "sourceEndMs": 8850000,
          "text": "ダメじゃないねじゃないかあっちからアソキその島も探すわそしたらコーネと合流できない後ろにいるのかなこれうわサメなんかに死んでさぁもういっそ合流するって手もある確かにそれなぁうんそんなにサメの肉がもったいねえと思ったがまぁ別にしないよねそんなこと言ってる場合ではないぬるっと頑張って集め直せばいい"
        },
        {
          "speechId": 1345,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8850220,
          "sourceEndMs": 8875610,
          "text": "そうね、死のうかワンチャンありやでじゃあ進んでいいよ一旦コーネが帰ってきたからするわ一旦ね、一応ねさよなら、サメの肉サメならさ、この広い海にいくらでもごまんと嫌がるからな終わった、じゃあまた倒すわ何回でも殺せるさ"
        },
        {
          "speechId": 1346,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8877478,
          "sourceEndMs": 8909872,
          "text": "じゃあさせっかくだからさ深海の方に行ってみるわ何かあるかもしれないからあー確かに何かあるかもねずっと下に潜ってる超怖いこれ怖いよ息がまだねまだ深海に潜れる怖っなんかね実績ロック解除した何メートル以上潜るとみたいなのあるんだねあるのかもしれないこれいい"
        },
        {
          "speechId": 1347,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8912655,
          "sourceEndMs": 8929445,
          "text": "なかなか死なんなえ、なんかめっちゃ頑張ってる酸素、意外と切れないんだなこれね、再開すればいいんかそうだね、死んだ、あ、死んだ?"
        },
        {
          "speechId": 1348,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8929445,
          "sourceEndMs": 8930766,
          "text": "死んだどうだった?"
        },
        {
          "speechId": 1349,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8930766,
          "sourceEndMs": 8938130,
          "text": "深海なんもなかったなんもないんかい起きたかなこうね、いるか?"
        },
        {
          "speechId": 1350,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8950618,
          "sourceEndMs": 8969884,
          "text": "寂しいよゴーヌこれちょっとアンカーで外しちゃうねごめんねでぼっちにさしちゃってはい急にスンって資材使ってほらもう葉っぱのストレージになってるじゃん上のやつはそうね木ここに入れたここにあここにねそう一旦ここにした終わったじゃあちょっとこうねフック作りたいから"
        },
        {
          "speechId": 1351,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8971195,
          "sourceEndMs": 8999272,
          "text": "使ってもらってどんどん使ってくださいレディーザーを作らせてもらってこれだなこれだな確かに葉っぱって序盤めっちゃ足りなく感じたけどもうもはやもういないよなゴミかのように大量にでも今ね壁に使ってるから結構これで消化するかもしれないじゃあもっと拾おうわGoogleChromeがクラッシュしたマジ?"
        },
        {
          "speechId": 1352,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8999272,
          "sourceEndMs": 8999552,
          "text": "OK今"
        },
        {
          "speechId": 1353,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9000054,
          "sourceEndMs": 9029018,
          "text": "再起動したで、えっと今何してたかというとあ、そうだこれ中身に移動してたんだほらよよしよしよしよしよしあー、イカダがある安心感もう大丈夫だよこうね怖くないよもう何も怖くないマジ葉っぱの量半端ないやばいよなこれなーこんなにあるでいらねーえーどこを何したんだっけ"
        },
        {
          "speechId": 1354,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9030754,
          "sourceEndMs": 9035896,
          "text": "なんだっけ?"
        },
        {
          "speechId": 1355,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9035896,
          "sourceEndMs": 9059764,
          "text": "ここがこれとここがたねえここはなこれたねえピー拾ってこれよこれよーよいしょえーあと何がいるかなー葉っぱをロープにして半分"
        },
        {
          "speechId": 1356,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9069510,
          "sourceEndMs": 9070932,
          "text": "え、わかんない!"
        },
        {
          "speechId": 1357,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9070932,
          "sourceEndMs": 9089612,
          "text": "でももう行くなよこうではいはいもう行きませんそっか葉っぱに変えちゃ…そっかロープに変えちゃえばいいのかでもあれだよね言うて葉っぱも使いはするから多少はとっておいたほうがいいねえーロープロープロープロープロープロープあ、ここで作ればいい"
        },
        {
          "speechId": 1358,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9094796,
          "sourceEndMs": 9117453,
          "text": "てんやそんにゃんそいにゃんそいにゃんてんやそんにゃんそいにゃんてんやそんにゃんそいにゃんそいにゃん歌ってる、ごきげんですごきげん中身、あ、これOKクラゲ食べられるのかな?"
        },
        {
          "speechId": 1359,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9117453,
          "sourceEndMs": 9118033,
          "text": "クラゲってあのなんかないっけ?"
        },
        {
          "speechId": 1360,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9118033,
          "sourceEndMs": 9118834,
          "text": "食べ物のクラゲ"
        },
        {
          "speechId": 1361,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9120194,
          "sourceEndMs": 9121875,
          "text": "クラゲは食べれるよね?"
        },
        {
          "speechId": 1362,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9121875,
          "sourceEndMs": 9124816,
          "text": "なんか、なんかあった気がするクラゲのなんか、おすい…おすい…すのものみたいなえ?"
        },
        {
          "speechId": 1363,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9124816,
          "sourceEndMs": 9124896,
          "text": "え?"
        },
        {
          "speechId": 1364,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9124896,
          "sourceEndMs": 9125156,
          "text": "あ?"
        },
        {
          "speechId": 1365,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9125156,
          "sourceEndMs": 9125816,
          "text": "なになになに?"
        },
        {
          "speechId": 1366,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9125816,
          "sourceEndMs": 9126997,
          "text": "イルカだー!"
        },
        {
          "speechId": 1367,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9126997,
          "sourceEndMs": 9130618,
          "text": "またイルカだー!"
        },
        {
          "speechId": 1368,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9130618,
          "sourceEndMs": 9130798,
          "text": "わー!"
        },
        {
          "speechId": 1369,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9130798,
          "sourceEndMs": 9133740,
          "text": "わー!"
        },
        {
          "speechId": 1370,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9133740,
          "sourceEndMs": 9141803,
          "text": "かわいい群れをなしているーほんとにすごいねーかわいいねー、イルカはーイルカの鳴き声できる?"
        },
        {
          "speechId": 1371,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9141803,
          "sourceEndMs": 9143043,
          "text": "え、イルカの鳴き声?"
        },
        {
          "speechId": 1372,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9143043,
          "sourceEndMs": 9147325,
          "text": "あ、でも、あのー、聞いたことあるよえ、やめる?"
        },
        {
          "speechId": 1373,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9147325,
          "sourceEndMs": 9148326,
          "text": "えいー!"
        },
        {
          "speechId": 1374,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9148326,
          "sourceEndMs": 9148606,
          "text": "みたいな"
        },
        {
          "speechId": 1375,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9150958,
          "sourceEndMs": 9151678,
          "text": "エゲツナイ!"
        },
        {
          "speechId": 1376,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9151678,
          "sourceEndMs": 9153239,
          "text": "エゲツナイな!"
        },
        {
          "speechId": 1377,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9153239,
          "sourceEndMs": 9155980,
          "text": "エゲツナイ?"
        },
        {
          "speechId": 1378,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9155980,
          "sourceEndMs": 9156421,
          "text": "クラゲ!"
        },
        {
          "speechId": 1379,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9156421,
          "sourceEndMs": 9159182,
          "text": "あ、クラゲじゃないかクラゲ?"
        },
        {
          "speechId": 1380,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9159182,
          "sourceEndMs": 9160082,
          "text": "クラゲ?"
        },
        {
          "speechId": 1381,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9160082,
          "sourceEndMs": 9161443,
          "text": "イルカ?"
        },
        {
          "speechId": 1382,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9161443,
          "sourceEndMs": 9161943,
          "text": "エゲツナイ?"
        },
        {
          "speechId": 1383,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9161943,
          "sourceEndMs": 9167006,
          "text": "イルカエゲツナイな聞こえなんだなえ、どんな感じ?"
        },
        {
          "speechId": 1384,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9167006,
          "sourceEndMs": 9178691,
          "text": "やってイルカでしょ?"
        },
        {
          "speechId": 1385,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9178691,
          "sourceEndMs": 9179052,
          "text": "えぇ!"
        },
        {
          "speechId": 1386,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9179052,
          "sourceEndMs": 9179512,
          "text": "そんなんかなぁ!"
        },
        {
          "speechId": 1387,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9179512,
          "sourceEndMs": 9179872,
          "text": "せいちゃん違うと思う"
        },
        {
          "speechId": 1388,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9180854,
          "sourceEndMs": 9209924,
          "text": "あら違ったわ違ったわじゃなくてさ違ったわよえ似てる嘘でしょえ嘘今のはこんなやつ役ないよ邪魔だよこっちはこれ持ってんだぞ邪魔だったんだもんしょうがないじゃん邪魔な魚よ視界に入ってきたぬるっと視界に入ってきた"
        },
        {
          "speechId": 1389,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9210100,
          "sourceEndMs": 9232688,
          "text": "いいよ全然焼けないじゃんめっちゃ綺麗になってきたよ、言っとくけどマジ?"
        },
        {
          "speechId": 1390,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9232688,
          "sourceEndMs": 9238550,
          "text": "どんどんストレージが減っているのなんか可愛い絨毯きたよ作れる?"
        },
        {
          "speechId": 1391,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9238550,
          "sourceEndMs": 9238850,
          "text": "待って"
        },
        {
          "speechId": 1392,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9242295,
          "sourceEndMs": 9249280,
          "text": "ここにさ、あれないんだわえっと…今の、ど…え?"
        },
        {
          "speechId": 1393,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9249280,
          "sourceEndMs": 9249420,
          "text": "こいか…あー!"
        },
        {
          "speechId": 1394,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9249420,
          "sourceEndMs": 9252482,
          "text": "え、しかもめっちゃコスト変わるえ、ちょっと作ってみようかなえ、作ろう作ろう!"
        },
        {
          "speechId": 1395,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9252482,
          "sourceEndMs": 9266352,
          "text": "え、作るわーありがてぇこいでこーでこいでこーでできたえ、ちっちゃいちっちゃいふざけてんのか?"
        },
        {
          "speechId": 1396,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9266352,
          "sourceEndMs": 9267933,
          "text": "ちっちゃいの?"
        },
        {
          "speechId": 1397,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9267933,
          "sourceEndMs": 9268674,
          "text": "どれ?"
        },
        {
          "speechId": 1398,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9268674,
          "sourceEndMs": 9268954,
          "text": "ちょっと待って"
        },
        {
          "speechId": 1399,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9271147,
          "sourceEndMs": 9276870,
          "text": "いいもの来たあちょっと待って行かないで絶対取るこれ拾ってねえ嘘?"
        },
        {
          "speechId": 1400,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9276870,
          "sourceEndMs": 9296802,
          "text": "まあいいや要らないから拾って絨毯あーどこに置こうかなーちょっと悩む悩むいいなー楽しそうどこに置こう絨毯うーんでもここさもうさわかった家族団らんみたいにするわここ今から頑張ってマジ?"
        },
        {
          "speechId": 1401,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9296802,
          "sourceEndMs": 9299824,
          "text": "うん頼むわちょっと魚釣っとるわ待っててくれ"
        },
        {
          "speechId": 1402,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9301194,
          "sourceEndMs": 9317299,
          "text": "カーペットは一旦美品置き場に入れといてとはーいで、だんだんいいな楽しみでしょ楽しみー待っててよ寒っあれ?"
        },
        {
          "speechId": 1403,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9317299,
          "sourceEndMs": 9320119,
          "text": "サメの頭ってなんか壁につけれるって誰か言ってなかったっけ?"
        },
        {
          "speechId": 1404,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9320119,
          "sourceEndMs": 9321760,
          "text": "あ、ね、言ってたねあれ?"
        },
        {
          "speechId": 1405,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9321760,
          "sourceEndMs": 9322600,
          "text": "作れないんですけど?"
        },
        {
          "speechId": 1406,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9322600,
          "sourceEndMs": 9327081,
          "text": "なんかあるのかな?"
        },
        {
          "speechId": 1407,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9327081,
          "sourceEndMs": 9328502,
          "text": "なんか釘みたいなやつ"
        },
        {
          "speechId": 1408,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9331650,
          "sourceEndMs": 9338155,
          "text": "あ、ボードが必要なんだって、なるほどトロフィーボードってやつ?"
        },
        {
          "speechId": 1409,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9338155,
          "sourceEndMs": 9340337,
          "text": "トロフィーボードはまだ作れないよね?"
        },
        {
          "speechId": 1410,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9340337,
          "sourceEndMs": 9356069,
          "text": "よく作れるちょっと置いてみるわ"
        },
        {
          "speechId": 1411,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9360342,
          "sourceEndMs": 9387882,
          "text": "ここに置きたいのにえ、なんでこの嵐のせいでだいぶ材料も集まっとるんでなナイスサメも来てるんでなナイスできるか?"
        },
        {
          "speechId": 1412,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9387882,
          "sourceEndMs": 9389624,
          "text": "床、そうね床も作りたいな床床広げたくない?"
        },
        {
          "speechId": 1413,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9390002,
          "sourceEndMs": 9392124,
          "text": "ちょっと後にしてそれはあれ?"
        },
        {
          "speechId": 1414,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9392124,
          "sourceEndMs": 9393585,
          "text": "置けないなダメか?"
        },
        {
          "speechId": 1415,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9393585,
          "sourceEndMs": 9395687,
          "text": "置けない?"
        },
        {
          "speechId": 1416,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9395687,
          "sourceEndMs": 9397748,
          "text": "なんでじゃろか?"
        },
        {
          "speechId": 1417,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9397748,
          "sourceEndMs": 9400591,
          "text": "ちっちゃいのかな?"
        },
        {
          "speechId": 1418,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9400591,
          "sourceEndMs": 9418786,
          "text": "まあいいやちょっとそれは一旦置いといておうえーっとほねこれとこれを片付けろか先こうやってやりたいことがさ2点3点と変わっていってしまうからちゃんとね一つずつ着実に"
        },
        {
          "speechId": 1419,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9419355,
          "sourceEndMs": 9419821,
          "text": "片付けていく"
        },
        {
          "speechId": 1420,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9421622,
          "sourceEndMs": 9423243,
          "text": "とりあえず食材集めながら材料も拾うね?"
        },
        {
          "speechId": 1421,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9423243,
          "sourceEndMs": 9423583,
          "text": "オッケー?"
        },
        {
          "speechId": 1422,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9423583,
          "sourceEndMs": 9423824,
          "text": "オッケー?"
        },
        {
          "speechId": 1423,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9423824,
          "sourceEndMs": 9424504,
          "text": "ナイス?"
        },
        {
          "speechId": 1424,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9424504,
          "sourceEndMs": 9437694,
          "text": "えーこういったりして…オッケー?"
        },
        {
          "speechId": 1425,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9437694,
          "sourceEndMs": 9447221,
          "text": "んーバランス見てもう一個置きたいなこれ…あこれから生カチオばっかりなら生カチオって何やねん?"
        },
        {
          "speechId": 1426,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9447221,
          "sourceEndMs": 9449122,
          "text": "生のカチオか…なんか当たり前の…当たり前ことを言っているような…"
        },
        {
          "speechId": 1427,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9451814,
          "sourceEndMs": 9479504,
          "text": "まあ、できたらばなんとなく完成させたいよね、この辺はねそうな、そうなでもなんか収納大きすぎてさお片付け上手みたいになってきちゃった倉庫みたいになってるなそうなのよ"
        },
        {
          "speechId": 1428,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9480646,
          "sourceEndMs": 9509704,
          "text": "片付け長寿ここ落ちるからうざいから床付ける床増やすわ広げたいな木材いっぱい集めるわボトボト落下して気分悪いから広げますとそうなナイスありがとうございます"
        },
        {
          "speechId": 1429,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9511343,
          "sourceEndMs": 9517106,
          "text": "この広さあれば…あ、そうだ!"
        },
        {
          "speechId": 1430,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9517106,
          "sourceEndMs": 9518907,
          "text": "ここに絨毯をさ階段登るところに…大丈夫?"
        },
        {
          "speechId": 1431,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9518907,
          "sourceEndMs": 9528293,
          "text": "サメかと思ったらイルカかと思ってイルカかと思ったらサメだったわ危なしーいや、こっちかな?"
        },
        {
          "speechId": 1432,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9528293,
          "sourceEndMs": 9528413,
          "text": "こっちかな?"
        },
        {
          "speechId": 1433,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9528413,
          "sourceEndMs": 9528953,
          "text": "ナイスショー!"
        },
        {
          "speechId": 1434,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9528953,
          "sourceEndMs": 9532315,
          "text": "お!"
        },
        {
          "speechId": 1435,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9532315,
          "sourceEndMs": 9536037,
          "text": "こんなとこに置かないか?"
        },
        {
          "speechId": 1436,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9536037,
          "sourceEndMs": 9536418,
          "text": "おらよー"
        },
        {
          "speechId": 1437,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9544166,
          "sourceEndMs": 9549190,
          "text": "あ、ねえ、こうねえはい!"
        },
        {
          "speechId": 1438,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9549190,
          "sourceEndMs": 9553113,
          "text": "ねえ、上がって、ここにはいなんか思うことない?"
        },
        {
          "speechId": 1439,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9553113,
          "sourceEndMs": 9555055,
          "text": "思うこと?"
        },
        {
          "speechId": 1440,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9555055,
          "sourceEndMs": 9563321,
          "text": "このエリアに関して思うこと?"
        },
        {
          "speechId": 1441,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9563321,
          "sourceEndMs": 9563482,
          "text": "そう"
        },
        {
          "speechId": 1442,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9571678,
          "sourceEndMs": 9572999,
          "text": "じゅうたん!"
        },
        {
          "speechId": 1443,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9572999,
          "sourceEndMs": 9574159,
          "text": "じゅうたんを置いてみたんだけど!"
        },
        {
          "speechId": 1444,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9574159,
          "sourceEndMs": 9575479,
          "text": "ど、どうかな?"
        },
        {
          "speechId": 1445,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9575479,
          "sourceEndMs": 9577739,
          "text": "え、めっちゃいいなこれ!"
        },
        {
          "speechId": 1446,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9577739,
          "sourceEndMs": 9579600,
          "text": "めっちゃいい!"
        },
        {
          "speechId": 1447,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9579600,
          "sourceEndMs": 9580620,
          "text": "え、ホント?"
        },
        {
          "speechId": 1448,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9580620,
          "sourceEndMs": 9583301,
          "text": "え、フェンスの塊なんだが!"
        },
        {
          "speechId": 1449,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9583301,
          "sourceEndMs": 9584001,
          "text": "マジで?"
        },
        {
          "speechId": 1450,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9584001,
          "sourceEndMs": 9585121,
          "text": "そうかな?"
        },
        {
          "speechId": 1451,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9585121,
          "sourceEndMs": 9599564,
          "text": "え、このさ、降りたところ、階段が終わる瞬間のとこにラグ…間に合わなかったね間に合わなかった毎回さ、このさ"
        },
        {
          "speechId": 1452,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9600182,
          "sourceEndMs": 9619695,
          "text": "あの、槍に切り替えるのにめっちゃ時間かかるんだよねわかる槍さえ持ってないやん、ちょ待ってな槍くらいは持っててほしいよわかるわかるわかりみが深い待ってよえっとちょ待ってよ、何すればいいの?"
        },
        {
          "speechId": 1453,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9619695,
          "sourceEndMs": 9627280,
          "text": "えっと水飲んでファイアポー!"
        },
        {
          "speechId": 1454,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9627280,
          "sourceEndMs": 9628061,
          "text": "なに?"
        },
        {
          "speechId": 1455,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9628061,
          "sourceEndMs": 9628942,
          "text": "ファイアポー!"
        },
        {
          "speechId": 1456,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9628942,
          "sourceEndMs": 9629402,
          "text": "この曲ね"
        },
        {
          "speechId": 1457,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9631062,
          "sourceEndMs": 9654935,
          "text": "横路ファイアボーイ一旦閉まって配置を決めようよしこれで槍を作るか、槍食料ボックスも必要かあ、食料ボックスね回収ネットもちょっと欲しいんけどな回収ネット増やしたいね増やしたいよなあ、ヤシの種いっぱいあった武器"
        },
        {
          "speechId": 1458,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9661998,
          "sourceEndMs": 9665779,
          "text": "上をロープと厚板何?"
        },
        {
          "speechId": 1459,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9665779,
          "sourceEndMs": 9676921,
          "text": "ごめんなよそういうことすんな間違えた間違えたロープと厚板2人で寝たら朝になるんかな?"
        },
        {
          "speechId": 1460,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9676921,
          "sourceEndMs": 9683323,
          "text": "あ、確かにねその説あったなそういえばねもう一個作る?"
        },
        {
          "speechId": 1461,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9683323,
          "sourceEndMs": 9689844,
          "text": "ベッドそうだね作ってもいいよねそろそろねめっちゃだってなんかベッドの上位互換"
        },
        {
          "speechId": 1462,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9690066,
          "sourceEndMs": 9695807,
          "text": "ないかななんかいいやつベッドの上位互換は旅館?"
        },
        {
          "speechId": 1463,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9695807,
          "sourceEndMs": 9697147,
          "text": "旅館?"
        },
        {
          "speechId": 1464,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9697147,
          "sourceEndMs": 9703529,
          "text": "結構上がってるよねスケールがベッドの上位互換はないんじゃん?"
        },
        {
          "speechId": 1465,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9703529,
          "sourceEndMs": 9706129,
          "text": "まだできないだけであるかな?"
        },
        {
          "speechId": 1466,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9706129,
          "sourceEndMs": 9712390,
          "text": "旗も立てたいねハンモックとかもいいねこれさマリリンこれ絵描けるようになるんじゃないの?"
        },
        {
          "speechId": 1467,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9712390,
          "sourceEndMs": 9717291,
          "text": "これペイントもささっきさ出たしさどうなんだ確かにえ?"
        },
        {
          "speechId": 1468,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9717291,
          "sourceEndMs": 9719232,
          "text": "旗にさ絵描けちゃうんじゃねーのこれ?"
        },
        {
          "speechId": 1469,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9721394,
          "sourceEndMs": 9747763,
          "text": "書いて欲しいわ棚とかもあるのか棚いいね今床に時間を置きしてるひよこたちをそうね椅子も作りたいしかもめっちゃコスト軽いいいやんクソ助かるさすがやんかめっちゃいいあ明かりいいちょっと作りたいものがまみれてきたよ今どうするよ"
        },
        {
          "speechId": 1470,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9750066,
          "sourceEndMs": 9777863,
          "text": "作るしかないよな作るしかないカーテンもいいねカーテンかカーテンもいいやいいよねあれだなまずドアをこういうドア作ってそこにカーテンをつけてサメさん待っていいないいねいいじゃん夢膨らむねでもやっぱある程度のさ壁をガーって囲ってある程度の吹き抜け感はやっぱ欲しいよね吹き抜け?"
        },
        {
          "speechId": 1471,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9777863,
          "sourceEndMs": 9778763,
          "text": "えでもいいんじゃない?"
        },
        {
          "speechId": 1472,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9778763,
          "sourceEndMs": 9779864,
          "text": "吹き抜けいらないんじゃないの"
        },
        {
          "speechId": 1473,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9780290,
          "sourceEndMs": 9782592,
          "text": "いらん?"
        },
        {
          "speechId": 1474,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9782592,
          "sourceEndMs": 9785194,
          "text": "あーそうか、壁を全面に作るかってこと?"
        },
        {
          "speechId": 1475,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9785194,
          "sourceEndMs": 9792039,
          "text": "そうそうそうそううーん、そうなーえ、君たちー?"
        },
        {
          "speechId": 1476,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9792039,
          "sourceEndMs": 9793360,
          "text": "君たちー?"
        },
        {
          "speechId": 1477,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9793360,
          "sourceEndMs": 9795441,
          "text": "どう思いますかー?"
        },
        {
          "speechId": 1478,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9795441,
          "sourceEndMs": 9796682,
          "text": "いや、どう思います?"
        },
        {
          "speechId": 1479,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9796682,
          "sourceEndMs": 9797142,
          "text": "君たちー?"
        },
        {
          "speechId": 1480,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9797142,
          "sourceEndMs": 9799304,
          "text": "どうすべきですかー?"
        },
        {
          "speechId": 1481,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9799304,
          "sourceEndMs": 9799684,
          "text": "え、どうすればいいのー?"
        },
        {
          "speechId": 1482,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9799684,
          "sourceEndMs": 9808391,
          "text": "回収して暗いよー暗いねー外したら一気に暗なるな"
        },
        {
          "speechId": 1483,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9812578,
          "sourceEndMs": 9828332,
          "text": "2階の入り口にランタン置こうマジで暗いな暗いんよどっちに置こうかな?"
        },
        {
          "speechId": 1484,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9828332,
          "sourceEndMs": 9828632,
          "text": "こっちかな?"
        },
        {
          "speechId": 1485,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9828632,
          "sourceEndMs": 9839222,
          "text": "当たる星大丈夫だよめっちゃ板拾ったんだがいいね"
        },
        {
          "speechId": 1486,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9842646,
          "sourceEndMs": 9860491,
          "text": "置き場も欲しいよなぁこれがこれ、あっちがこうなって美品置き場がなんかもう便利、便利置き場になってきた何でもここに入れとけみたいな感じになり始めてる危険な兆候ですいいのでは?"
        },
        {
          "speechId": 1487,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9860491,
          "sourceEndMs": 9862352,
          "text": "でもいいですか?"
        },
        {
          "speechId": 1488,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9862352,
          "sourceEndMs": 9869454,
          "text": "後でまた整理できるしな確かにねえ、電球、電球?"
        },
        {
          "speechId": 1489,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9872154,
          "sourceEndMs": 9899474,
          "text": "虫捕り網、虫捕り網だって虫捕り網ね、思った虫捕ることあるのかなっていういらねーよなーいらねーよなーはわろだあーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーー"
        },
        {
          "speechId": 1490,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9900130,
          "sourceEndMs": 9929824,
          "text": "チョベリバー出ちゃったな出るわこれチョベリバーがストレージ1個は待ってるまであるな絶妙になーなんか一旦壊してしまっとくという手もあるかなるほどねだんだん独り言が激しくなってきたいいじゃんいいじゃんここに反応するで独り言に優しいあれ独り言に返事しちゃいけないんだっけなんかあったよね寝言だ寝言寝言感言うよね"
        },
        {
          "speechId": 1491,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9930322,
          "sourceEndMs": 9932704,
          "text": "聞くと怖くなっちゃわない?"
        },
        {
          "speechId": 1492,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9932704,
          "sourceEndMs": 9936626,
          "text": "なんかね、なんか誘われるのかなって感じだね誘え?"
        },
        {
          "speechId": 1493,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9936626,
          "sourceEndMs": 9950556,
          "text": "あちら側にやめていや、もはやもうあちら側なのかもしれない怖い怖い怖いここ何も入ってないじゃん何入れにしようかなこれ何入れにしたいの?"
        },
        {
          "speechId": 1494,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9950556,
          "sourceEndMs": 9958502,
          "text": "なんだろうマジで分からん何入れたらいいんだろう船長迷ってます"
        },
        {
          "speechId": 1495,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9960098,
          "sourceEndMs": 9966181,
          "text": "ここね何入れたらいいと思う?"
        },
        {
          "speechId": 1496,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9966181,
          "sourceEndMs": 9967061,
          "text": "どこ?"
        },
        {
          "speechId": 1497,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9967061,
          "sourceEndMs": 9968122,
          "text": "この真ん中真ん中?"
        },
        {
          "speechId": 1498,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9968122,
          "sourceEndMs": 9973724,
          "text": "でも上がベトベトでしょ?"
        },
        {
          "speechId": 1499,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9973724,
          "sourceEndMs": 9980728,
          "text": "一番下が一番下なんか統一感なくてもやるなご飯入れちゃう?"
        },
        {
          "speechId": 1500,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9980728,
          "sourceEndMs": 9988912,
          "text": "いっそのことここにご飯を一番上にしたい気持ちもあるけどなでも真ん中で一貫何も入ってないしな"
        },
        {
          "speechId": 1501,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9990194,
          "sourceEndMs": 9993135,
          "text": "あ、じゃあ移動しちゃおうもうこんだけならさっさとできる?"
        },
        {
          "speechId": 1502,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9993135,
          "sourceEndMs": 10013422,
          "text": "できるできるじゃあ上に入れちゃうよOK結構入れちゃうよいいよじゃがいも今焼いてるあ、焼いてないわ焼いてよし、もうちょっと釣ろうかやべ、水飲まなきゃ仮面仮面つついてみていい?"
        },
        {
          "speechId": 1503,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10013422,
          "sourceEndMs": 10016603,
          "text": "ちょっといいよいいよ気になる?"
        },
        {
          "speechId": 1504,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10016603,
          "sourceEndMs": 10019724,
          "text": "仮面どうなるのか"
        },
        {
          "speechId": 1505,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10020094,
          "sourceEndMs": 10020314,
          "text": "どうだったっけ?"
        },
        {
          "speechId": 1506,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10020314,
          "sourceEndMs": 10050000,
          "text": "やばい、待って海のヌシが来てる、やばいおらよーOKあ、ここ綺麗ナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナイスナ"
        },
        {
          "speechId": 1507,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10050034,
          "sourceEndMs": 10054676,
          "text": "いいね食べ物入れハマグリって食べ物判定か?"
        },
        {
          "speechId": 1508,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10054676,
          "sourceEndMs": 10055376,
          "text": "何判定?"
        },
        {
          "speechId": 1509,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10055376,
          "sourceEndMs": 10064040,
          "text": "ハマグリって何なんだろうねいやでも美味しいよなハマグリってせいちゃんハマグリ食べたことない?"
        },
        {
          "speechId": 1510,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10064040,
          "sourceEndMs": 10078886,
          "text": "ないかもしんないもしかしたらハマグリホタテじゃないのアサリとかシジミなのかなそんなわけではないなにどういうこと?"
        },
        {
          "speechId": 1511,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10078886,
          "sourceEndMs": 10079446,
          "text": "全然わかんない"
        },
        {
          "speechId": 1512,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10080546,
          "sourceEndMs": 10082947,
          "text": "ハマグリの種類よ、ハマグリの種類種類?"
        },
        {
          "speechId": 1513,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10082947,
          "sourceEndMs": 10083748,
          "text": "貝じゃないの?"
        },
        {
          "speechId": 1514,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10083748,
          "sourceEndMs": 10083968,
          "text": "え?"
        },
        {
          "speechId": 1515,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10083968,
          "sourceEndMs": 10084168,
          "text": "え?"
        },
        {
          "speechId": 1516,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10084168,
          "sourceEndMs": 10086029,
          "text": "え?"
        },
        {
          "speechId": 1517,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10086029,
          "sourceEndMs": 10086129,
          "text": "え?"
        },
        {
          "speechId": 1518,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10086129,
          "sourceEndMs": 10088611,
          "text": "そのさ、シジミとかさ、アサリとかあるやんか?"
        },
        {
          "speechId": 1519,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10088611,
          "sourceEndMs": 10091333,
          "text": "あるあるあるあれと同じ漢字なのかな?"
        },
        {
          "speechId": 1520,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10091333,
          "sourceEndMs": 10098317,
          "text": "あ、分類的にね貝、貝、貝、貝じゃない、貝どうでもいいかねえ?"
        },
        {
          "speechId": 1521,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10098317,
          "sourceEndMs": 10109584,
          "text": "何急にどうしてどうでもいいかと思って作業しまーす働くねえ働きますよえっと、でも配置をちょっとね、いじりたいやっぱ真ん中に"
        },
        {
          "speechId": 1522,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10111819,
          "sourceEndMs": 10134315,
          "text": "ちょっとテーブルを置いて一瞬グリル外しちゃうねはーいそんそんそんそんそんあ、でも小規模グリル置いとくわ端っこにはーい家の外に小規模グリルとかあるんだあのサイズつくってたやつ?"
        },
        {
          "speechId": 1523,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10134315,
          "sourceEndMs": 10137998,
          "text": "はいはいはいはいはいあぶな一旦外に置いとくからこれをOK"
        },
        {
          "speechId": 1524,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10140822,
          "sourceEndMs": 10148466,
          "text": "了解ウォッチ了解ウォッチとか夏もうそれ誰も言わないよもうは?"
        },
        {
          "speechId": 1525,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10148466,
          "sourceEndMs": 10169298,
          "text": "了解ウォッチ、了解ウォッチ、了解ウォッチ、了解ウォッチもう一人で全員分の了解ウォッチを一人で一年分言っちゃうよ今のじゃちょっとな一年分は行かないかな了解ウォッチ×100あーそれ略しちゃうねへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへへ"
        },
        {
          "speechId": 1526,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10170450,
          "sourceEndMs": 10171490,
          "text": "レシピとかいるんかな?"
        },
        {
          "speechId": 1527,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10171490,
          "sourceEndMs": 10178974,
          "text": "一応取っとくかレシピさぁ、いらんくね?"
        },
        {
          "speechId": 1528,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10178974,
          "sourceEndMs": 10181195,
          "text": "あぁ、いらん説?"
        },
        {
          "speechId": 1529,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10181195,
          "sourceEndMs": 10194041,
          "text": "でもさぁ、いずれさぁレシピあればよかったのにってなる未来も見える確かにね取っとくよ、一応一応取っとこうか毎日に備えてえ?"
        },
        {
          "speechId": 1530,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10194041,
          "sourceEndMs": 10195882,
          "text": "レシピ壁に貼れるって?"
        },
        {
          "speechId": 1531,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10195882,
          "sourceEndMs": 10196502,
          "text": "はぁ?"
        },
        {
          "speechId": 1532,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10196502,
          "sourceEndMs": 10199304,
          "text": "壁に貼るの?"
        },
        {
          "speechId": 1533,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10199304,
          "sourceEndMs": 10200000,
          "text": "ポスターやん"
        },
        {
          "speechId": 1534,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10200370,
          "sourceEndMs": 10202971,
          "text": "あ、ポスター使いってこと?"
        },
        {
          "speechId": 1535,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10202971,
          "sourceEndMs": 10218098,
          "text": "やばい下手くそえ、すごーい飾りなんだ飾りってこと?"
        },
        {
          "speechId": 1536,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10218098,
          "sourceEndMs": 10223461,
          "text": "飾りにもなるってことじゃない?"
        },
        {
          "speechId": 1537,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10223461,
          "sourceEndMs": 10230000,
          "text": "すごあ、調理台ができればそのレシピ通りの料理ができるってこと"
        },
        {
          "speechId": 1538,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10231174,
          "sourceEndMs": 10256457,
          "text": "調理台とかあるんだいいねわかんないあれかもしれないよ本トップじゃないかもしれない出た本トップあるんだって結構な割合の方々が発してるから多分あるんだと思うそれは本トップだね本トップだわ人数が多ければ多いほど本トップとされてるからね"
        },
        {
          "speechId": 1539,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10260642,
          "sourceEndMs": 10268428,
          "text": "うそっぷだったらさうそっぷうそっぷあ、うそっぷってそういうこと?"
        },
        {
          "speechId": 1540,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10268428,
          "sourceEndMs": 10273031,
          "text": "いや、うそっぷが生まれた頃にはわざっぷはないんじゃない?"
        },
        {
          "speechId": 1541,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10273031,
          "sourceEndMs": 10290000,
          "text": "うそっぷ、そういうことではないだろあ、そういうことではなかったないだろなほねええーと、これでこれさ、食材のとこさ、焼いてから入れて"
        },
        {
          "speechId": 1542,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10291094,
          "sourceEndMs": 10291995,
          "text": "どっちがいい?"
        },
        {
          "speechId": 1543,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10291995,
          "sourceEndMs": 10320000,
          "text": "どっちでもいいよ焼けるならここで焼いここにさ、グリル簡素なやつ置いてあるからあ、分かった焼けるなら焼いちゃってちょっと焼けないけど邪魔で入れときたいなら一旦入れてもらってもそうな、あんま考えなくていいかいいよとりあえず焼こうかなあ、落ちてしもたけど上がる上がる上がるファイアーフラッシュこれを生のビール"
        },
        {
          "speechId": 1544,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10320020,
          "sourceEndMs": 10343898,
          "text": "釘とかいらないけどなーでもなー釘は備品じゃないね釘は備品じゃない組み分けを変えようスリザーリン弓も入れたいなこれもこういうこういうあ、それ君たちEに売ってんの?"
        },
        {
          "speechId": 1545,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10343898,
          "sourceEndMs": 10349282,
          "text": "それコーネにも売ってるあのーあ、コーネに売ってるなんだろうこれ水筒とかこれ作ったものみたいなやつ?"
        },
        {
          "speechId": 1546,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10355002,
          "sourceEndMs": 10365672,
          "text": "あの釘とか、釘とかさあるじゃん、釘とか蝶津貝とかは工具系として新たな木装作らせてもらうあ、工具系いいねわかる?"
        },
        {
          "speechId": 1547,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10365672,
          "sourceEndMs": 10367053,
          "text": "いい意味わかる?"
        },
        {
          "speechId": 1548,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10367053,
          "sourceEndMs": 10368974,
          "text": "伝わってきたわわかるわかるオッケー?"
        },
        {
          "speechId": 1549,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10368974,
          "sourceEndMs": 10374699,
          "text": "じゃあこれ工具系入れにしようオッケーオッケーいいじゃんいいじゃんあ、そう!"
        },
        {
          "speechId": 1550,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10374699,
          "sourceEndMs": 10374840,
          "text": "消耗品!"
        },
        {
          "speechId": 1551,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10374840,
          "sourceEndMs": 10376541,
          "text": "君たちそれだよ!"
        },
        {
          "speechId": 1552,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10376541,
          "sourceEndMs": 10379904,
          "text": "消耗品ですこうね、消耗品、ふーん"
        },
        {
          "speechId": 1553,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10380074,
          "sourceEndMs": 10409824,
          "text": "消耗品で終わったこれで消耗品入れねでここに釘とか入れますはーいここでは中身を見て判断してくださいはい中身見ればねこっちのもんよ見れば分かるもんねだよこれね結構釣竿って早く壊れちゃうんだね結構早いよねこうなってくるとここのストレージめちゃめちゃ余ってるからまぁなんかノリで適当にしまいたい時用に終わったよし完璧だな"
        },
        {
          "speechId": 1554,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10411142,
          "sourceEndMs": 10422286,
          "text": "え、なんか超スッキリするわマジでスッキリしてる、言っとくけどめっちゃ綺麗になってるからね、今いいやん、できる女やんわかる?"
        },
        {
          "speechId": 1555,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10422286,
          "sourceEndMs": 10436991,
          "text": "2階も作ってくれたし整理整頓もできてラジオ外しちゃったから静かになるけど寂しがらないよねえ、待ってよ、二人のこのトーク力でカバーよえ、マジ?"
        },
        {
          "speechId": 1556,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10436991,
          "sourceEndMs": 10439932,
          "text": "今船長さマジ船長抱えてるわ、ラジオ"
        },
        {
          "speechId": 1557,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10440054,
          "sourceEndMs": 10442255,
          "text": "完全にこれ嘘?"
        },
        {
          "speechId": 1558,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10442255,
          "sourceEndMs": 10462969,
          "text": "ヒップホップになっちゃったよリリーコングやクリアする時のリリーコングやそれBGMが流れてるからねこれね今消えてる船長のところだとBGMがあえて"
        },
        {
          "speechId": 1559,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10470482,
          "sourceEndMs": 10475085,
          "text": "これドア式にしてこうね、どうかなこういうさチラ見せスタイル後ろ見てーあ、いいじゃん!"
        },
        {
          "speechId": 1560,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10475085,
          "sourceEndMs": 10476927,
          "text": "上めっちゃいいじゃん!"
        },
        {
          "speechId": 1561,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10476927,
          "sourceEndMs": 10480870,
          "text": "こんにちはあ、壊れちゃった!"
        },
        {
          "speechId": 1562,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10480870,
          "sourceEndMs": 10480910,
          "text": "斧!"
        },
        {
          "speechId": 1563,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10480910,
          "sourceEndMs": 10499844,
          "text": "待って待って、斧壊れたああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああ"
        },
        {
          "speechId": 1564,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10500130,
          "sourceEndMs": 10529171,
          "text": "こっちこっち作っとくわありがとうじゃげんなよマジでクソがよやられたねまんまと木の門やられたわここ出入りできた方が便利だないやいいななんかいいなどうしよううちら一生やってるのかなもしかしてでもさ"
        },
        {
          "speechId": 1565,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10539459,
          "sourceEndMs": 10557783,
          "text": "回収ネットあれつけれないじゃん釘いただいちゃって回収ネット作ってなんでここにカーテンつけちゃったんだろうちょっとカーテン作ったの?"
        },
        {
          "speechId": 1566,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10557783,
          "sourceEndMs": 10559944,
          "text": "何も考えずに変なとこにカーテンつけちゃったまぁいっか見たい見たいどこ?"
        },
        {
          "speechId": 1567,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10561041,
          "sourceEndMs": 10563042,
          "text": "え、これ閉まるの?"
        },
        {
          "speechId": 1568,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10563042,
          "sourceEndMs": 10564203,
          "text": "プレイ閉まるのかな?"
        },
        {
          "speechId": 1569,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10564203,
          "sourceEndMs": 10564823,
          "text": "え、やってみ?"
        },
        {
          "speechId": 1570,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10564823,
          "sourceEndMs": 10568045,
          "text": "やってみ?"
        },
        {
          "speechId": 1571,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10568045,
          "sourceEndMs": 10589758,
          "text": "え、全然いじれないんだけどえ、マリ、マリミツちゃんそこにいてそこにいていくよでも、でもね、もしかしたらいないでしょ?"
        },
        {
          "speechId": 1572,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10590322,
          "sourceEndMs": 10591943,
          "text": "こういうことなんじゃない?"
        },
        {
          "speechId": 1573,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10591943,
          "sourceEndMs": 10592823,
          "text": "あ、そういうこと?"
        },
        {
          "speechId": 1574,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10592823,
          "sourceEndMs": 10595264,
          "text": "この笑いっていないないバーの笑いなんじゃない?"
        },
        {
          "speechId": 1575,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10595264,
          "sourceEndMs": 10617471,
          "text": "わかるマリンごめんちょっともう5秒ちょうだいいくよいないなーいあ、隠れたわはい、終了見えてないよくそー難しいないないねバーって釘がなくなったもしかしていっぱい使ってたごめんこれ全部取ってたえ?"
        },
        {
          "speechId": 1576,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10617471,
          "sourceEndMs": 10618431,
          "text": "なんで?"
        },
        {
          "speechId": 1577,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10618431,
          "sourceEndMs": 10619692,
          "text": "釘取ってたごめん会社ネットで"
        },
        {
          "speechId": 1578,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10620122,
          "sourceEndMs": 10632427,
          "text": "ああそういうことねでも見てほしいここ見てほら見てほらあ、ほんとだすっきりさっきりできてるできてるいいねえ待ってここどうするここどこ?"
        },
        {
          "speechId": 1579,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10632427,
          "sourceEndMs": 10634168,
          "text": "ここ回収ネットにする?"
        },
        {
          "speechId": 1580,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10634168,
          "sourceEndMs": 10638150,
          "text": "ああしたいしたいでも可能できるかなできそう?"
        },
        {
          "speechId": 1581,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10638150,
          "sourceEndMs": 10647054,
          "text": "やってみるかうんOK一回もう一回釘釘をもらって"
        },
        {
          "speechId": 1582,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10657996,
          "sourceEndMs": 10664879,
          "text": "いいねええーとあ、やべ、またお腹減ってる、ちょっともう、集中して作りたいのにさあお腹?"
        },
        {
          "speechId": 1583,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10664879,
          "sourceEndMs": 10666579,
          "text": "あ、なに、ゲームの方?"
        },
        {
          "speechId": 1584,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10666579,
          "sourceEndMs": 10679664,
          "text": "あ、そうそうそうなんかでかい魚があれば、あ、ないわどんどん作りたいのになかなか落ち着けないあ、作れる、作れる、ネット作れたあ、ナイスナイスナイスよいいよ"
        },
        {
          "speechId": 1585,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10680862,
          "sourceEndMs": 10691847,
          "text": "いやいいな、なんか死ぬほど作業、もう裏の作業みたいなのを垂れ流してる状態ですけどいやでもいいんじゃないの?"
        },
        {
          "speechId": 1586,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10691847,
          "sourceEndMs": 10693788,
          "text": "みんなどうですか?"
        },
        {
          "speechId": 1587,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10693788,
          "sourceEndMs": 10695208,
          "text": "君たち?"
        },
        {
          "speechId": 1588,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10695208,
          "sourceEndMs": 10696028,
          "text": "君たち?"
        },
        {
          "speechId": 1589,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10696028,
          "sourceEndMs": 10696829,
          "text": "大丈夫?"
        },
        {
          "speechId": 1590,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10696829,
          "sourceEndMs": 10709374,
          "text": "こういう感じであ、これ魚取っていいよこれ後ろの魚あ、魚ありがとうどこにドアをつけるか考えてんのあ、OKOK"
        },
        {
          "speechId": 1591,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10710962,
          "sourceEndMs": 10717867,
          "text": "焼いてあえてここは取っていいよじゃない生魚食べちゃったじゃんバカじゃねーの?"
        },
        {
          "speechId": 1592,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10717867,
          "sourceEndMs": 10720129,
          "text": "マジでそんなに?"
        },
        {
          "speechId": 1593,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10720129,
          "sourceEndMs": 10738182,
          "text": "取っていいよじゃないんだなこれ中に入れとけばいいんだなこれなほらよあえてのこのさこういううんここをさ一個もらおうか"
        },
        {
          "speechId": 1594,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10740498,
          "sourceEndMs": 10745259,
          "text": "どう?"
        },
        {
          "speechId": 1595,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10745259,
          "sourceEndMs": 10757762,
          "text": "このデザイニズムいや、マリーンさん才能あるよなえ、ほんと?"
        },
        {
          "speechId": 1596,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10757762,
          "sourceEndMs": 10759042,
          "text": "うんデザイナーの才能あると思うこれいい?"
        },
        {
          "speechId": 1597,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10759042,
          "sourceEndMs": 10760042,
          "text": "え、めっちゃいいじゃん!"
        },
        {
          "speechId": 1598,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10760042,
          "sourceEndMs": 10760622,
          "text": "え、ほんとに似てる?"
        },
        {
          "speechId": 1599,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10760622,
          "sourceEndMs": 10760802,
          "text": "はぁ?"
        },
        {
          "speechId": 1600,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10760802,
          "sourceEndMs": 10769944,
          "text": "これカウボーイの村にあるとはやんこれねえ、これさめっちゃいいやんこれこれカウボーイかな?"
        },
        {
          "speechId": 1601,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10772002,
          "sourceEndMs": 10784567,
          "text": "まさしく気持ちいいカウボーイだってマリリンはカウガールかなおや?"
        },
        {
          "speechId": 1602,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10784567,
          "sourceEndMs": 10795851,
          "text": "おやじゃないよ間違えたかなコメントここ入り口だからね壊れてる"
        },
        {
          "speechId": 1603,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10800520,
          "sourceEndMs": 10815067,
          "text": "せいちゃんあれだ作んなきゃ新しい武器おしおしおしおしうわ壊れた壊れちゃいましたか大丈夫直すわあっ間違えた矢作っちゃった矢作ったん?"
        },
        {
          "speechId": 1604,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10815067,
          "sourceEndMs": 10818309,
          "text": "ちゃうねんちゃうねんこれは矢ねんあれ?"
        },
        {
          "speechId": 1605,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10818309,
          "sourceEndMs": 10819109,
          "text": "ヨリヨリ?"
        },
        {
          "speechId": 1606,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10819109,
          "sourceEndMs": 10829114,
          "text": "あっ待ってあーなんかあれこれどうやって直すんだっけあっこれだあっなんか作っちゃったなにこれーねぇなにこれごめん"
        },
        {
          "speechId": 1607,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10830726,
          "sourceEndMs": 10842453,
          "text": "待ってわかった壊しとくからちょっと待ってよ申し訳ないあれだけは取るこれは行きましたねこれは魚も釣りてえなあれ?"
        },
        {
          "speechId": 1608,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10842453,
          "sourceEndMs": 10860000,
          "text": "マジかよいしょさて壊すねうん突如の三角形のごめんねこれはじゃあオンなんでなんか授業で使うでかい三角形みたいなやつハンマーでね一番下のやつを選ぶんよあ、ありがとう次やるわあ、また取り"
        },
        {
          "speechId": 1609,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10860182,
          "sourceEndMs": 10889872,
          "text": "ひろたけどひよこみたいなやつあね棚作って飾るという手もあるかなと今考え中あいいねでも腹の足しにもなんねワイルドなあでもガチ目にそう今お腹減ってんだよねいっぱい焼いていっぱいではないけど入れてあるから取ってねありがとうねもらうねうんもらってもらってどんどんさどんどんどんどん作ってさ文明発達させていきたいっていうのにさもうお腹が減ったりさ邪魔が"
        },
        {
          "speechId": 1610,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10890274,
          "sourceEndMs": 10918263,
          "text": "ガール全然ダメなんだよなあよしこれ欲しい真ん中にまず明るさの確保が先かなそうねなんか電飾系のものがあったんだよいいね焚火台へえランタンスクラップでできるのか暖炉ほうほうほう暖炉いいねいいよね暖かいかもうん待ってでも粘土8個も使うわマジ?"
        },
        {
          "speechId": 1611,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10918263,
          "sourceEndMs": 10919524,
          "text": "ちょっとやめてほしい"
        },
        {
          "speechId": 1612,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10920994,
          "sourceEndMs": 10921815,
          "text": "本当?"
        },
        {
          "speechId": 1613,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10921815,
          "sourceEndMs": 10927917,
          "text": "粘土使う?"
        },
        {
          "speechId": 1614,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10927917,
          "sourceEndMs": 10929598,
          "text": "使う派?"
        },
        {
          "speechId": 1615,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10929598,
          "sourceEndMs": 10930158,
          "text": "粘土?"
        },
        {
          "speechId": 1616,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10930158,
          "sourceEndMs": 10937641,
          "text": "コーネが使うと言ってくれれば船長は暖炉を作るよ全然使おうよだって出汁を薄めしてたら人生つまらないでしょ?"
        },
        {
          "speechId": 1617,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10937641,
          "sourceEndMs": 10943043,
          "text": "分かったこうでしょ?"
        },
        {
          "speechId": 1618,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10943043,
          "sourceEndMs": 10949286,
          "text": "塗料ミルってのがあるんだこれがあれば花で色を変えるのに使えると"
        },
        {
          "speechId": 1619,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10950482,
          "sourceEndMs": 10956564,
          "text": "花もあるここで粉とか使うんだあ、どういうこと?"
        },
        {
          "speechId": 1620,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10956564,
          "sourceEndMs": 10960485,
          "text": "粉の使い道が花置きたい!"
        },
        {
          "speechId": 1621,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10960485,
          "sourceEndMs": 10961666,
          "text": "花置きたいなぁ!"
        },
        {
          "speechId": 1622,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10961666,
          "sourceEndMs": 10966007,
          "text": "秩序だよね、もはや花置こう?"
        },
        {
          "speechId": 1623,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10966007,
          "sourceEndMs": 10979952,
          "text": "置きたーいこれは粉粉今度島降りたら拾おういっぱい拾おう黄色い粉ならあった黄色い粉か黄色でもいいんじゃない?"
        },
        {
          "speechId": 1624,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10982423,
          "sourceEndMs": 10992250,
          "text": "あ、でも床に置く式かあ、じゃあこれテーブル作ってテーブルに置こうあ、いいねー!"
        },
        {
          "speechId": 1625,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10992250,
          "sourceEndMs": 10996093,
          "text": "え、いいよね、いいよねえ、なんかランチョンマットとかさ作りたくない?"
        },
        {
          "speechId": 1626,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10996093,
          "sourceEndMs": 10997114,
          "text": "あ、いいねー!"
        },
        {
          "speechId": 1627,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10997114,
          "sourceEndMs": 10997394,
          "text": "いいねー!"
        },
        {
          "speechId": 1628,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 10997394,
          "sourceEndMs": 11004240,
          "text": "あ、粘土使う、あ、でも粘土使ってもいいかな粘土使ってもいいと思ういいよいいよ、使おう使おうだってオシャレに行きたいじゃん女子よ、女子よ!"
        },
        {
          "speechId": 1629,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11004240,
          "sourceEndMs": 11009944,
          "text": "確かに、女子やしなうちらそうだ、女子なのよかわいいテーブル、自分行っちゃっていい?"
        },
        {
          "speechId": 1630,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11010020,
          "sourceEndMs": 11011061,
          "text": "いいすか?"
        },
        {
          "speechId": 1631,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11011061,
          "sourceEndMs": 11012201,
          "text": "いきましょう!"
        },
        {
          "speechId": 1632,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11012201,
          "sourceEndMs": 11014042,
          "text": "え、待ってローテーブルだこれ!"
        },
        {
          "speechId": 1633,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11014042,
          "sourceEndMs": 11015763,
          "text": "しまった!"
        },
        {
          "speechId": 1634,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11015763,
          "sourceEndMs": 11017404,
          "text": "ローテーブルだ!"
        },
        {
          "speechId": 1635,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11017404,
          "sourceEndMs": 11018064,
          "text": "え、待ってあれ?"
        },
        {
          "speechId": 1636,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11018064,
          "sourceEndMs": 11021046,
          "text": "なんか…巨人の星とか出てくるやつ?"
        },
        {
          "speechId": 1637,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11021046,
          "sourceEndMs": 11028429,
          "text": "ねえ、巨人の…ローテーブルってオシャレな表現してんのになんで巨人の星が出てくるの?"
        },
        {
          "speechId": 1638,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11028429,
          "sourceEndMs": 11031211,
          "text": "ねえ、ローテーブルだよこれ!"
        },
        {
          "speechId": 1639,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11031211,
          "sourceEndMs": 11033012,
          "text": "え、チャブ台?"
        },
        {
          "speechId": 1640,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11033012,
          "sourceEndMs": 11034532,
          "text": "そう、いわゆるチャブ台!"
        },
        {
          "speechId": 1641,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11034532,
          "sourceEndMs": 11035433,
          "text": "待ってね、リヴァイカン!"
        },
        {
          "speechId": 1642,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11035433,
          "sourceEndMs": 11036653,
          "text": "あ、チャブを返してもらっていいすか?"
        },
        {
          "speechId": 1643,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11036653,
          "sourceEndMs": 11037694,
          "text": "すいませんけど…"
        },
        {
          "speechId": 1644,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11037946,
          "sourceEndMs": 11038935,
          "text": "え、なに?"
        },
        {
          "speechId": 1645,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11038935,
          "sourceEndMs": 11039963,
          "text": "粘土返してほしいんだけど"
        },
        {
          "speechId": 1646,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11040280,
          "sourceEndMs": 11062309,
          "text": "腹立つうぜえおい粘土もったいないだろボケが高さもあるのかこれも低いこれも低いかな君たちこれさローテーブルこれ作ってローテーブルだったら耐えられないんだけど大丈夫?"
        },
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
        },
        {
          "speechId": 1652,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11098463,
          "sourceEndMs": 11099044,
          "text": "無理なの?"
        },
        {
          "speechId": 1653,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11099044,
          "sourceEndMs": 11099304,
          "text": "それは"
        },
        {
          "speechId": 1654,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11101022,
          "sourceEndMs": 11101563,
          "text": "無理?"
        },
        {
          "speechId": 1655,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11101563,
          "sourceEndMs": 11103884,
          "text": "それは無理じゃない?"
        },
        {
          "speechId": 1656,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11103884,
          "sourceEndMs": 11117710,
          "text": "無理か諦めるしかないかそしたら家の中心地点にテーブル置いてここに花飾るわ、船長いいねあ、サメ来た?"
        },
        {
          "speechId": 1657,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11117710,
          "sourceEndMs": 11119571,
          "text": "もう食われた食われた?"
        },
        {
          "speechId": 1658,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11119571,
          "sourceEndMs": 11124774,
          "text": "まあいいかと思ってそれはそれでって感じでねしょうがないよな"
        },
        {
          "speechId": 1659,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11126234,
          "sourceEndMs": 11129984,
          "text": "こういうカラフルなテーブルもあるのかまぁでもこれがいいよねえっじゃ暖炉作っ"
        },
        {
          "speechId": 1660,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11130000,
          "sourceEndMs": 11131341,
          "text": "作っていい?"
        },
        {
          "speechId": 1661,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11131341,
          "sourceEndMs": 11157571,
          "text": "いいよ作ろうごめんねこうね魚釣りしかしてなくて全然いいよ魚助かる釣り助かるねめちゃめちゃだいろの位置はね楽しそうだねマリリンみんなをさあっと驚かせようと思ってそうね温かみのある匠のリフォームをさあ明るいいい感じ?"
        },
        {
          "speechId": 1662,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11157571,
          "sourceEndMs": 11159512,
          "text": "いい感じいい感じだんろ置いたら一気に"
        },
        {
          "speechId": 1663,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11161334,
          "sourceEndMs": 11184442,
          "text": "こうやってくると机の位置ずれが気になってきたなひまわりの位置もずれてる気がしてきた1個気になるとめっちゃ気になっちゃうやつなそれなそうなんよよし暖炉とのバランスを見ながらいいなこれが友達かそうだよこの辺かなうん"
        },
        {
          "speechId": 1664,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11193138,
          "sourceEndMs": 11193818,
          "text": "ちょっと晴れてきた。"
        },
        {
          "speechId": 1665,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11193818,
          "sourceEndMs": 11195859,
          "text": "そろそろさ、島にも行きたいね。"
        },
        {
          "speechId": 1666,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11195859,
          "sourceEndMs": 11197099,
          "text": "あ、たしかにね。"
        },
        {
          "speechId": 1667,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11197099,
          "sourceEndMs": 11205401,
          "text": "ね。"
        },
        {
          "speechId": 1668,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11205401,
          "sourceEndMs": 11210322,
          "text": "違うな。"
        },
        {
          "speechId": 1669,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11210322,
          "sourceEndMs": 11211962,
          "text": "完璧?"
        },
        {
          "speechId": 1670,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11211962,
          "sourceEndMs": 11216283,
          "text": "もうちょい。"
        },
        {
          "speechId": 1671,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11216283,
          "sourceEndMs": 11218544,
          "text": "いいね。"
        },
        {
          "speechId": 1672,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11218544,
          "sourceEndMs": 11219144,
          "text": "ここ!"
        },
        {
          "speechId": 1673,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11219144,
          "sourceEndMs": 11219484,
          "text": "いいじゃん!"
        },
        {
          "speechId": 1674,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11219484,
          "sourceEndMs": 11219664,
          "text": "椅子の交換。"
        },
        {
          "speechId": 1675,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11219664,
          "sourceEndMs": 11219964,
          "text": "椅子?"
        },
        {
          "speechId": 1676,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11220314,
          "sourceEndMs": 11224838,
          "text": "椅子ってさぁ、あってもなくてもさぁでもローテーブルなんでしょ?"
        },
        {
          "speechId": 1677,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11224838,
          "sourceEndMs": 11226559,
          "text": "あ、いいじゃん!"
        },
        {
          "speechId": 1678,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11226559,
          "sourceEndMs": 11228121,
          "text": "あ、いい?"
        },
        {
          "speechId": 1679,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11228121,
          "sourceEndMs": 11229081,
          "text": "めっちゃいいじゃん!"
        },
        {
          "speechId": 1680,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11229081,
          "sourceEndMs": 11229682,
          "text": "あ、めっちゃいい?"
        },
        {
          "speechId": 1681,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11229682,
          "sourceEndMs": 11235026,
          "text": "え、ロ、あ、これローテーブルじゃないやつ?"
        },
        {
          "speechId": 1682,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11235026,
          "sourceEndMs": 11241071,
          "text": "これは、これはローテーブルじゃないやつローテーブルも見てみたかったけどね見てみる?"
        },
        {
          "speechId": 1683,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11241071,
          "sourceEndMs": 11245835,
          "text": "おくねじゃあ見てみていい?"
        },
        {
          "speechId": 1684,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11245835,
          "sourceEndMs": 11248698,
          "text": "これ、でも可愛いよなぁ、これ可愛いよ"
        },
        {
          "speechId": 1685,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11251114,
          "sourceEndMs": 11271141,
          "text": "デザインはかわいいよワッフルみたいじゃん、ワッフルね、かわいいんだけどな確かにかわいいな、どっかに飾ったらかわいい、普通にかわいいよそれかわいいねうんでもやっぱ食卓囲むときこの高さだなクロスはいいんだけどないいんじゃない?"
        },
        {
          "speechId": 1686,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11271141,
          "sourceEndMs": 11280000,
          "text": "でも地面に座ってこう、星座しながら食べるのもツーでしょわびさびわびさびですかわびさびだと思うけど"
        },
        {
          "speechId": 1687,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11281763,
          "sourceEndMs": 11283424,
          "text": "いいと思うよほんと?"
        },
        {
          "speechId": 1688,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11283424,
          "sourceEndMs": 11309582,
          "text": "じゃあ、カーペット敷いてその上にいいじゃんあそこまで考えて置いたひまわりをあっけなく撤去してしまったなんか、あれよ、あのそういう話あったよ、あのミッキーのさ、ミックスアドベンチャーっていうやつでさはいミッキーたちがさ、日本に遊びに来る話があってさうんミニーちゃんがびっくりする"
        },
        {
          "speechId": 1689,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11310778,
          "sourceEndMs": 11310898,
          "text": "何が?"
        },
        {
          "speechId": 1690,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11310898,
          "sourceEndMs": 11333634,
          "text": "え、なんか正座が難しいわーって言ってねデイジーがね、ひっくり返るんだけどねあ、正座だねはいはいはいそう、だからね、あのね、いいよ、ここはさ、正座して食べようやわかった、じゃあカーペット敷いてさ、正座しやすくしとくわいいねーこうね、私たちさ、いつまでさ、やる?"
        },
        {
          "speechId": 1691,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11333634,
          "sourceEndMs": 11338418,
          "text": "これ、もう3時間経ってるんだけどえ、ま、え、え、いいよ、マリリーに任せるで"
        },
        {
          "speechId": 1692,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11343464,
          "sourceEndMs": 11366601,
          "text": "楽しいよねでもねあっという間だねな楽しい時間はコーネが作ってくれたご飯全部食べきったいいよまだあるよほら盛り盛り食べたい盛り盛り焼きますなんかさなんかさ大きいさ焼くやつなくしたじゃん今ああうんなくしたなくしたそしたらさなんかさ大きい魚釣れなくなったんだけどさえ?"
        },
        {
          "speechId": 1693,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11366601,
          "sourceEndMs": 11369584,
          "text": "でもちょうどよくない?"
        },
        {
          "speechId": 1694,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11369584,
          "sourceEndMs": 11369924,
          "text": "大きい魚"
        },
        {
          "speechId": 1695,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11371174,
          "sourceEndMs": 11373455,
          "text": "焦れるよまた焦れる?"
        },
        {
          "speechId": 1696,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11373455,
          "sourceEndMs": 11399704,
          "text": "なんかでもさ今さ焼けないじゃんどうせどうせねなんかさ神様がさ今は大きいバーベキューグリルがないから小さい魚だけ与えてあげようみたいなさ空気読んでねそう空気読んでる気がするわこれ神様気が利くやなありがとうございますありがとうございます本当にいい感じになってきたぞ明かり良きいい感じいやマリリンのおかげよ本当ね君たち"
        },
        {
          "speechId": 1697,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11400666,
          "sourceEndMs": 11402486,
          "text": "君たち?"
        },
        {
          "speechId": 1698,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11402486,
          "sourceEndMs": 11402907,
          "text": "君たち?"
        },
        {
          "speechId": 1699,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11402907,
          "sourceEndMs": 11403687,
          "text": "お前たち?"
        },
        {
          "speechId": 1700,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11403687,
          "sourceEndMs": 11404767,
          "text": "お前たち?"
        },
        {
          "speechId": 1701,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11404767,
          "sourceEndMs": 11408048,
          "text": "お前たちじゃないよ君たちね君たち?"
        },
        {
          "speechId": 1702,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11408048,
          "sourceEndMs": 11408568,
          "text": "貴様ら?"
        },
        {
          "speechId": 1703,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11408568,
          "sourceEndMs": 11418930,
          "text": "やばいいや本当いいねマリリンはいい女や何急に何急にどうしたの?"
        },
        {
          "speechId": 1704,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11418930,
          "sourceEndMs": 11427031,
          "text": "本当にいい女だと思うからさ思い出したかのようにさ一味代表一味なの?"
        },
        {
          "speechId": 1705,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11427031,
          "sourceEndMs": 11429872,
          "text": "コンデ先輩は一味代表の言葉一味だと思うけどね"
        },
        {
          "speechId": 1706,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11431250,
          "sourceEndMs": 11432250,
          "text": "そんなに好きなの?"
        },
        {
          "speechId": 1707,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11432250,
          "sourceEndMs": 11434852,
          "text": "私のことそんなに好きなんだ?"
        },
        {
          "speechId": 1708,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11434852,
          "sourceEndMs": 11455582,
          "text": "結構喋ってる方だと思うけどでも確かにやめどころがないねそろそろさ切り上げるムードは出していくかそうかじゃあちょっと感想でも言っとく?"
        },
        {
          "speechId": 1709,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11455582,
          "sourceEndMs": 11459924,
          "text": "確かに感想今日はねちょっと中途半端に"
        },
        {
          "speechId": 1710,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11461581,
          "sourceEndMs": 11478929,
          "text": "見せかけて言うてこれね、かなりね出来てきてるってあ、なんだこれあ、そっかベッドが邪魔なんかこう、ね、そうこう感想言ってる間にもね着々とこう着工しておりほらこんなにもね出来上がってきているわけです終わっちゃうの?"
        },
        {
          "speechId": 1711,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11478929,
          "sourceEndMs": 11488574,
          "text": "って言ってる終わっちゃうでもちょっとねお腹減ったしね普通にそうだねご飯食べたしねもうちょっと拾っておきたいな木"
        },
        {
          "speechId": 1712,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11491834,
          "sourceEndMs": 11518518,
          "text": "まあでもいい感じになってきてるのではないでしょうかいい綺麗になってるこれはね次回ねあの会見フレンズでコヨリと坂本が見たらば非常にびっくりする光景にびっくりびっくらぽんよこんなのなってるでしょうねロープなくなっちゃったのこれ作りますロープ葉っぱから何のために葉っぱがねそうそうそう何のための葉っぱなんですかそうでしょ"
        },
        {
          "speechId": 1713,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11520066,
          "sourceEndMs": 11524428,
          "text": "あ、ここベッドルームにしよっかな、ワンちゃんいい!"
        },
        {
          "speechId": 1714,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11524428,
          "sourceEndMs": 11525368,
          "text": "いい?"
        },
        {
          "speechId": 1715,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11525368,
          "sourceEndMs": 11526849,
          "text": "めっちゃいい!"
        },
        {
          "speechId": 1716,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11526849,
          "sourceEndMs": 11528309,
          "text": "ここ4つ置けるか?"
        },
        {
          "speechId": 1717,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11528309,
          "sourceEndMs": 11529650,
          "text": "この幅でしょ?"
        },
        {
          "speechId": 1718,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11529650,
          "sourceEndMs": 11532931,
          "text": "最高!"
        },
        {
          "speechId": 1719,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11532931,
          "sourceEndMs": 11549658,
          "text": "最高すぎいいでしょ、いいでしょ最高ここベッドルームねいや、いいなー終わりが見えないな、ちょっと閉めだけしてあとは水面下でこっそり進めとくわ、船長は"
        },
        {
          "speechId": 1720,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11551287,
          "sourceEndMs": 11552047,
          "text": "でも誘って?"
        },
        {
          "speechId": 1721,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11552047,
          "sourceEndMs": 11553908,
          "text": "本当?"
        },
        {
          "speechId": 1722,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11553908,
          "sourceEndMs": 11555869,
          "text": "付き合ってくれるの?"
        },
        {
          "speechId": 1723,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11555869,
          "sourceEndMs": 11565995,
          "text": "付き合いたいマリーンそれ告白だよもうでもマリーンはいろんな女いるからな気づいた?"
        },
        {
          "speechId": 1724,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11565995,
          "sourceEndMs": 11571979,
          "text": "だいぶ前から気づいてるけどねバレたか誰でもいいんでしょ?"
        },
        {
          "speechId": 1725,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11571979,
          "sourceEndMs": 11578423,
          "text": "そんなことないよ誰でもよくはない選んでんだちゃっかりちゃっかり選んでるよ"
        },
        {
          "speechId": 1726,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11580626,
          "sourceEndMs": 11593310,
          "text": "だから選んでんだね誰でもよくはないあ、そうでもコーネとならやっていける気がする、マリンはほんと?"
        },
        {
          "speechId": 1727,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11593310,
          "sourceEndMs": 11594530,
          "text": "じゃあ愛しのマリン?"
        },
        {
          "speechId": 1728,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11594530,
          "sourceEndMs": 11596111,
          "text": "なんか見つけたよ何?"
        },
        {
          "speechId": 1729,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11596111,
          "sourceEndMs": 11596691,
          "text": "どれ?"
        },
        {
          "speechId": 1730,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11596691,
          "sourceEndMs": 11596951,
          "text": "どこ?"
        },
        {
          "speechId": 1731,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11596951,
          "sourceEndMs": 11597911,
          "text": "見て、ちょっと遠いかな?"
        },
        {
          "speechId": 1732,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11597911,
          "sourceEndMs": 11600072,
          "text": "あれあっち見える?"
        },
        {
          "speechId": 1733,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11600072,
          "sourceEndMs": 11602873,
          "text": "あ、ほんとだね!"
        },
        {
          "speechId": 1734,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11602873,
          "sourceEndMs": 11603193,
          "text": "で?"
        },
        {
          "speechId": 1735,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11603193,
          "sourceEndMs": 11603793,
          "text": "行くの?"
        },
        {
          "speechId": 1736,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11603793,
          "sourceEndMs": 11604933,
          "text": "ちょっとコーネやめな!"
        },
        {
          "speechId": 1737,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11604933,
          "sourceEndMs": 11606794,
          "text": "行かない行かない行かない行かない!"
        },
        {
          "speechId": 1738,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11606794,
          "sourceEndMs": 11607854,
          "text": "ちょっと今葉っぱ…"
        },
        {
          "speechId": 1739,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11612844,
          "sourceEndMs": 11657128,
          "text": "ということでねこんな感じでねかなり駆け回ってねかなり清涼感のあふれるお家がもう出来上がり始めていますのでねこれはちょっと船長たち裏でねさらに完成度高めておくのでちょっともう作業になりすぎて我々がね非常にまったりしてきちゃったのでちょっと一旦区切りをつけたいと思います割に皆様はお邪魔しましたーありがとうございましたーありがとうございましたーじゃあ、それでは、出航しようかなお、お、お、お、お、おお、お、お、お、お、お来るぞ、来るぞ、来るぞ、来るぞ、来るぞそれでは、行きますよー!"
        },
        {
          "speechId": 1740,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11657128,
          "sourceEndMs": 11657508,
          "text": "出航ー!"
        },
        {
          "speechId": 1741,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11657508,
          "sourceEndMs": 11662511,
          "text": "やったー!"
        },
        {
          "speechId": 1742,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11662511,
          "sourceEndMs": 11665172,
          "text": "ヨーソロなんですけどえ?"
        },
        {
          "speechId": 1743,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11665172,
          "sourceEndMs": 11669134,
          "text": "ヨーソロなんですけどあ、ヨーソロねあ、配信見てない?"
        },
        {
          "speechId": 1744,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11669134,
          "sourceEndMs": 11669394,
          "text": "もしかして"
        },
        {
          "speechId": 1745,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11670162,
          "sourceEndMs": 11673186,
          "text": "それでは行きますよー!"
        },
        {
          "speechId": 1746,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11673186,
          "sourceEndMs": 11678012,
          "text": "出航!"
        },
        {
          "speechId": 1747,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11678012,
          "sourceEndMs": 11679954,
          "text": "よっしゃろー!"
        },
        {
          "speechId": 1748,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11679954,
          "sourceEndMs": 11684860,
          "text": "発音違うんだよな"
        },
        {
          "speechId": 1749,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 11740116,
          "sourceEndMs": 11740238,
          "text": "またね。"
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
