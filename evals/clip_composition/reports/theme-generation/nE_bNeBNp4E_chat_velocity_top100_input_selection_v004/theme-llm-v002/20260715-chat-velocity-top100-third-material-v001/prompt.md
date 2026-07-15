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
      "sourceVideoId": "qdczJpv8RCc",
      "sourceUrl": "https://www.youtube.com/watch?v=qdczJpv8RCc",
      "sourceTitle": "【Liar's Bar】キミたちと初見であそぶ！視聴者参加型【ホロライブ/宝鐘マリン】",
      "transcriptKind": "local_stt",
      "language": "ja-JP",
      "durationSec": 7760.401,
      "rawSegmentCount": 23963,
      "promptSegmentCount": 773,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 1,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 69676,
          "sourceEndMs": 77709,
          "text": "ご視聴ありがとうございました"
        },
        {
          "speechId": 2,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 148770,
          "sourceEndMs": 149980,
          "text": "ありますでしょうか"
        },
        {
          "speechId": 3,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 150802,
          "sourceEndMs": 171795,
          "text": "ちょっと変じゃないですかちょっと引っ越したから何もかもが意味不明になってますアホーイホロライブ沢木製本省海賊堂船長の本省まりぃですちょっととりあえずね今始めようとして見てるんですけどちょっと何もわからんわきまいち説明してくださいもう何もわからんきまいちー名前表示がバグったろでもわからんなんで?"
        },
        {
          "speechId": 4,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 171795,
          "sourceEndMs": 179980,
          "text": "きまいち何もわからんのでね今日はよろしくお願いしますちょっと音変かもしんないなんかいろいろねつないで"
        },
        {
          "speechId": 5,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 180122,
          "sourceEndMs": 209840,
          "text": "ようやくねお家から配信できるようになりましてえー引っ越しをしましてもうはちゃめちゃが推しをしています日本語は文字分けするあそういうことですはい今日はラジコンってこといや違いますよ今日一旦まずわからんから一旦教えてもらって慣れてきたら逆にこっちが君たちをラジコンにするいうことを聞かせるはいなんかキャラクターがね色々あったんですけどえーこのなんかねえ"
        },
        {
          "speechId": 6,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 210638,
          "sourceEndMs": 239780,
          "text": "なんだろちょっと女100人抱いてそうな斎藤これは100人抱いたけどやや枯れてきたみたいな犬この子は街で一番モテる女なんだろこれ豚なんか大事なところを大々的に"
        },
        {
          "speechId": 7,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 241123,
          "sourceEndMs": 244725,
          "text": "あ、こんなんいた?"
        },
        {
          "speechId": 8,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 244725,
          "sourceEndMs": 246586,
          "text": "増えた?"
        },
        {
          "speechId": 9,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 246586,
          "sourceEndMs": 265537,
          "text": "なんすかこれケンタロスここにハンコ注射の跡があるまあこの子がね一番マリンに似てるかなと感じたんでこの子にしようかなと思います本当にちょっと音変大丈夫すか?"
        },
        {
          "speechId": 10,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 265537,
          "sourceEndMs": 266978,
          "text": "どうすか?"
        },
        {
          "speechId": 11,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 266978,
          "sourceEndMs": 269500,
          "text": "これじゃないかな設定はさなんか分かんなくなっちゃって"
        },
        {
          "speechId": 12,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 270098,
          "sourceEndMs": 283122,
          "text": "ちょっと間違えてるかも変えてみますねこっちの可能性もあるなんか音変わったなこっちかもしんないはいさっきのが良かった?"
        },
        {
          "speechId": 13,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 283122,
          "sourceEndMs": 284302,
          "text": "音割れてる?"
        },
        {
          "speechId": 14,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 284302,
          "sourceEndMs": 287183,
          "text": "割れてる?"
        },
        {
          "speechId": 15,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 287183,
          "sourceEndMs": 299026,
          "text": "ちょくちょく直していきたいなと思いますじゃあこれやるのに下にこの画面の下にロビーIDっていうのが表示されていてこれで"
        },
        {
          "speechId": 16,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 300650,
          "sourceEndMs": 329600,
          "text": "みたいなんでクリックとコピーコピーしてじゃあマリンがこれさタイピング速度が試されてしまうと思うわけこんな長い数字の羅列さねボキ検定2級じゃないとこんなスピードで打てないと思うからマリンがここに貼ってあげるからこれをコピペして入れてくださいそしてえっとボイスチャットはえ"
        },
        {
          "speechId": 17,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 330810,
          "sourceEndMs": 336112,
          "text": "切ってくださいね切ってくださいもうちょっとよろしいですか?"
        },
        {
          "speechId": 18,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 336112,
          "sourceEndMs": 355498,
          "text": "はいじゃあこれを貼るからコピーして部屋にこれ部屋ってさもうできてんのかな聞きたいことがいっぱいある聞きたいことがいっぱいあるなここに部屋を貼りますでいいのかなこうじゃない?"
        },
        {
          "speechId": 19,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 355498,
          "sourceEndMs": 359780,
          "text": "きなりこれをコピペして入るんですいけるかな"
        },
        {
          "speechId": 20,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 360060,
          "sourceEndMs": 387118,
          "text": "できるかなちょっとやり方全然みんな即入ってきたなんだなんだみんなそのキャラで行くのか豚で行くのか一人だけ一人だけ枯れてきたみんな空気読んで合わしとるやん気まずい気まずいマリンもこれマリンだけ空気読めてないみたいになっとるかなすいませんなんかいや待てよ君たちが"
        },
        {
          "speechId": 21,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 390130,
          "sourceEndMs": 392491,
          "text": "マリってこと?"
        },
        {
          "speechId": 22,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 392491,
          "sourceEndMs": 404398,
          "text": "なんなんなんの帰ってきた帰ってきたじゃあマリンも変えますよじゃあ変えるわデビルにすると難易度アップまだ早いだろ難易度上げる前に初めてやねんこれこれかな?"
        },
        {
          "speechId": 23,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 404398,
          "sourceEndMs": 407179,
          "text": "インバイト?"
        },
        {
          "speechId": 24,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 407179,
          "sourceEndMs": 417445,
          "text": "やってみますか一旦あ待ってフレンドを選ぶ画面出てきちゃった違うフレンドを呼ぶ画面かあスタートだわこれたぶんすいません"
        },
        {
          "speechId": 25,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 420586,
          "sourceEndMs": 434974,
          "text": "追加しようとしてしまいましたおーこんな感じ左のやつ左のやつうんうんしとるうんうんしとるようなずいてるよめちゃくちゃ挙動不審待ってなにこれちょ待ってわかんない何もきまじ?"
        },
        {
          "speechId": 26,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 434974,
          "sourceEndMs": 442258,
          "text": "きまじ一旦一旦指示してくれやまわからんのだわまずこれさあなに?"
        },
        {
          "speechId": 27,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 442258,
          "sourceEndMs": 444199,
          "text": "ダウト?"
        },
        {
          "speechId": 28,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 444199,
          "sourceEndMs": 448622,
          "text": "幻影旅団がさあのウボウが戦ってる時やってたやつ?"
        },
        {
          "speechId": 29,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 451154,
          "sourceEndMs": 452314,
          "text": "ちょっと待って、マリン邪魔?"
        },
        {
          "speechId": 30,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 452314,
          "sourceEndMs": 453335,
          "text": "邪魔かもや!"
        },
        {
          "speechId": 31,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 453335,
          "sourceEndMs": 454735,
          "text": "これ邪魔かも!"
        },
        {
          "speechId": 32,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 454735,
          "sourceEndMs": 458136,
          "text": "ちょっと待って、聞いたかったちょっと待って、マリン邪魔かもちょっとどこは?"
        },
        {
          "speechId": 33,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 458136,
          "sourceEndMs": 459316,
          "text": "ごめんごめんどこは?"
        },
        {
          "speechId": 34,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 459316,
          "sourceEndMs": 464278,
          "text": "こ、この辺にこれ引いとくわなにこれ?"
        },
        {
          "speechId": 35,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 464278,
          "sourceEndMs": 465638,
          "text": "ちょっと待って、これで選べる!"
        },
        {
          "speechId": 36,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 465638,
          "sourceEndMs": 475301,
          "text": "あ、待って待って、話聞いたかった話聞いてなかったあ、要するにダウト?"
        },
        {
          "speechId": 37,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 475301,
          "sourceEndMs": 476361,
          "text": "ここ、誰から?"
        },
        {
          "speechId": 38,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 476361,
          "sourceEndMs": 477242,
          "text": "誰から?"
        },
        {
          "speechId": 39,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 477242,
          "sourceEndMs": 478162,
          "text": "始まった?"
        },
        {
          "speechId": 40,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 478162,
          "sourceEndMs": 478782,
          "text": "もう始まってる?"
        },
        {
          "speechId": 41,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 480630,
          "sourceEndMs": 509440,
          "text": "ちょっちょっちょっちょっちょっちょっちょっちょっちょっちょっちょっちょっちょっちょっちょっちょっちょっちょっちょっちょっちょっちょっちょっちょっちょっちょっちょっちょっちょっちょっちょっ"
        },
        {
          "speechId": 42,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 511514,
          "sourceEndMs": 533319,
          "text": "みんなうなずいてるわ、マリンもうなずこうじゃこれ、これやってたら見てるリスナーは酔うごめん、うなずくのや、やめるわマリンだってうなずきたいよ、ほんとは見てるリスナーが酔うと思ったからやめたのあーすごい、ありがとうありがとううなずいてくれて、心落ち着いてあ、でも待って、ボイチャ切ってる?"
        },
        {
          "speechId": 43,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 533319,
          "sourceEndMs": 537620,
          "text": "マリンこれあ、こうしたら聞こえ、こうしたら聞こえるってこと?"
        },
        {
          "speechId": 44,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 537620,
          "sourceEndMs": 539080,
          "text": "で、こう、あーあーあーあー"
        },
        {
          "speechId": 45,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 543458,
          "sourceEndMs": 567606,
          "text": "非常にこれつまりクイーンを出すってことだよね決めたしそういうことだよねわかったこれマリンのことは信じてほしい本当だからこうどうやって出すんだこうでこれこれガチでちょっと待って喋れなくなった喋るVかVだこれガチでマリンのことこれさ待って違うと思ったらさ何押すの違うと思ったら何押すの"
        },
        {
          "speechId": 46,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 573351,
          "sourceEndMs": 578333,
          "text": "ダウト忘れてる?"
        },
        {
          "speechId": 47,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 578333,
          "sourceEndMs": 598742,
          "text": "やばいもうないんだけどマリンのことだけは信じてほしいマリン嘘はつかない本当にこれは信じてほしいありがとうありがとうありがとうじゃあこれでいきます待ってね今選び方こうして"
        },
        {
          "speechId": 48,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 603564,
          "sourceEndMs": 604144,
          "text": "こっちの人が!"
        },
        {
          "speechId": 49,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 634763,
          "sourceEndMs": 635864,
          "text": "何震えてんの早く撃てよ!"
        },
        {
          "speechId": 50,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 635864,
          "sourceEndMs": 653676,
          "text": "あ、カードが勝てる嘘死んじゃったの?"
        },
        {
          "speechId": 51,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 653676,
          "sourceEndMs": 658799,
          "text": "これ死んじゃったの?"
        },
        {
          "speechId": 52,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 658799,
          "sourceEndMs": 659940,
          "text": "一発で死んじゃったの?"
        },
        {
          "speechId": 53,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 660226,
          "sourceEndMs": 671556,
          "text": "あ、これマリンの番、マリンの番ねじゃあ、じゃあこれにする、あ、ボイチャンにするの忘れたこれ出すわ、これ、これねあ、間違え、なんで?"
        },
        {
          "speechId": 54,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 671556,
          "sourceEndMs": 688570,
          "text": "まち、まちが、間違えてないいいよ、これ、これが出したかった間違えてないよ、間違えてないいや、さ、最初のうちはさ最初のうちはさ、絶対さみんな出すもんね"
        },
        {
          "speechId": 55,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 695365,
          "sourceEndMs": 697006,
          "text": "嘘ってこと?"
        },
        {
          "speechId": 56,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 697006,
          "sourceEndMs": 719920,
          "text": "え、嘘かも違う、できない罰だ罰目が合っちゃったほーらほらなんか自白してんじゃんもう首振ってさ首振ってたもんよ耐えた"
        },
        {
          "speechId": 57,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 720002,
          "sourceEndMs": 721723,
          "text": "耐えてんだよお前!"
        },
        {
          "speechId": 58,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 721723,
          "sourceEndMs": 723263,
          "text": "耐えるな!"
        },
        {
          "speechId": 59,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 723263,
          "sourceEndMs": 726005,
          "text": "耐えてんじゃねーよ!"
        },
        {
          "speechId": 60,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 726005,
          "sourceEndMs": 737049,
          "text": "おとなしくしんどけ!"
        },
        {
          "speechId": 61,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 737049,
          "sourceEndMs": 743432,
          "text": "早く出せよ!"
        },
        {
          "speechId": 62,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 743432,
          "sourceEndMs": 745273,
          "text": "最初は普通に出すくない?"
        },
        {
          "speechId": 63,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 745273,
          "sourceEndMs": 745513,
          "text": "これは"
        },
        {
          "speechId": 64,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 750246,
          "sourceEndMs": 750767,
          "text": "なんでよ!"
        },
        {
          "speechId": 65,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 750767,
          "sourceEndMs": 764840,
          "text": "なんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんでなんで"
        },
        {
          "speechId": 66,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 766226,
          "sourceEndMs": 769048,
          "text": "よし運ゲーの勝者!"
        },
        {
          "speechId": 67,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 769048,
          "sourceEndMs": 771129,
          "text": "なめてんじゃないよ!"
        },
        {
          "speechId": 68,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 771129,
          "sourceEndMs": 772290,
          "text": "馬鹿が!"
        },
        {
          "speechId": 69,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 772290,
          "sourceEndMs": 775252,
          "text": "馬鹿!"
        },
        {
          "speechId": 70,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 775252,
          "sourceEndMs": 777814,
          "text": "マリンの故郷に勝てると思ってんの?"
        },
        {
          "speechId": 71,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 777814,
          "sourceEndMs": 778234,
          "text": "馬鹿野郎!"
        },
        {
          "speechId": 72,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 782954,
          "sourceEndMs": 809800,
          "text": "言っとくけどねマリンの手札めっつよだけど大丈夫そう全員倒すよこれでまぁ一旦これでいいかどうやって出すんだっけこうだあの口ごちゃにしない方がいいよこれガチですごいよマリンの手札なんだよ"
        },
        {
          "speechId": 73,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 810126,
          "sourceEndMs": 810666,
          "text": "何喋ったよ!"
        },
        {
          "speechId": 74,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 810666,
          "sourceEndMs": 811026,
          "text": "おい!"
        },
        {
          "speechId": 75,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 811026,
          "sourceEndMs": 815709,
          "text": "口を開くんじゃないよ!"
        },
        {
          "speechId": 76,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 815709,
          "sourceEndMs": 816969,
          "text": "何だよ!"
        },
        {
          "speechId": 77,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 816969,
          "sourceEndMs": 817369,
          "text": "何だよ!"
        },
        {
          "speechId": 78,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 817369,
          "sourceEndMs": 817770,
          "text": "何だよ!"
        },
        {
          "speechId": 79,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 817770,
          "sourceEndMs": 818670,
          "text": "調香すんな!"
        },
        {
          "speechId": 80,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 818670,
          "sourceEndMs": 821571,
          "text": "悩むことなんてないだろ!"
        },
        {
          "speechId": 81,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 821571,
          "sourceEndMs": 821731,
          "text": "何?"
        },
        {
          "speechId": 82,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 821731,
          "sourceEndMs": 822352,
          "text": "3枚出した?"
        },
        {
          "speechId": 83,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 822352,
          "sourceEndMs": 822772,
          "text": "え?"
        },
        {
          "speechId": 84,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 822772,
          "sourceEndMs": 823752,
          "text": "3…え?"
        },
        {
          "speechId": 85,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 823752,
          "sourceEndMs": 827854,
          "text": "3枚出した?"
        },
        {
          "speechId": 86,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 827854,
          "sourceEndMs": 829135,
          "text": "何3枚出すって?"
        },
        {
          "speechId": 87,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 829135,
          "sourceEndMs": 831276,
          "text": "何それ?"
        },
        {
          "speechId": 88,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 831276,
          "sourceEndMs": 836738,
          "text": "何あいつ向こう向いてんの?"
        },
        {
          "speechId": 89,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 836738,
          "sourceEndMs": 837819,
          "text": "3枚出すことがあんの?"
        },
        {
          "speechId": 90,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 837819,
          "sourceEndMs": 838119,
          "text": "は?"
        },
        {
          "speechId": 91,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 838119,
          "sourceEndMs": 839520,
          "text": "複数枚出せる?"
        },
        {
          "speechId": 92,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 839520,
          "sourceEndMs": 839920,
          "text": "は?"
        },
        {
          "speechId": 93,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 842026,
          "sourceEndMs": 848840,
          "text": "じゃあさ、例えば待って、例えば、例えばだよこれをさあっ、間違えた!"
        },
        {
          "speechId": 94,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 848840,
          "sourceEndMs": 853790,
          "text": "もぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉ"
        },
        {
          "speechId": 95,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 855986,
          "sourceEndMs": 860030,
          "text": "もう…複数枚出せる?"
        },
        {
          "speechId": 96,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 860030,
          "sourceEndMs": 860531,
          "text": "は?"
        },
        {
          "speechId": 97,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 860531,
          "sourceEndMs": 861932,
          "text": "待って!"
        },
        {
          "speechId": 98,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 861932,
          "sourceEndMs": 862152,
          "text": "え?"
        },
        {
          "speechId": 99,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 862152,
          "sourceEndMs": 862993,
          "text": "で、絶対?"
        },
        {
          "speechId": 100,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 862993,
          "sourceEndMs": 865596,
          "text": "だ、だったらさ、え?"
        },
        {
          "speechId": 101,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 865596,
          "sourceEndMs": 865996,
          "text": "嘘だよ!"
        },
        {
          "speechId": 102,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 865996,
          "sourceEndMs": 867578,
          "text": "だ、だって、そういうことだよね?"
        },
        {
          "speechId": 103,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 867578,
          "sourceEndMs": 868899,
          "text": "つまりさ、だって、え?"
        },
        {
          "speechId": 104,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 868899,
          "sourceEndMs": 869119,
          "text": "あれ?"
        },
        {
          "speechId": 105,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 869119,
          "sourceEndMs": 869520,
          "text": "あれ?"
        },
        {
          "speechId": 106,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 869520,
          "sourceEndMs": 869640,
          "text": "あれ?"
        },
        {
          "speechId": 107,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 869640,
          "sourceEndMs": 869900,
          "text": "あれ?"
        },
        {
          "speechId": 108,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 870646,
          "sourceEndMs": 872207,
          "text": "なぜ?"
        },
        {
          "speechId": 109,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 872207,
          "sourceEndMs": 872847,
          "text": "なぜ?"
        },
        {
          "speechId": 110,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 872847,
          "sourceEndMs": 873007,
          "text": "なぜ?"
        },
        {
          "speechId": 111,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 873007,
          "sourceEndMs": 873227,
          "text": "なぜ?"
        },
        {
          "speechId": 112,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 873227,
          "sourceEndMs": 873888,
          "text": "なぜ?"
        },
        {
          "speechId": 113,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 873888,
          "sourceEndMs": 874608,
          "text": "なぜ?"
        },
        {
          "speechId": 114,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 874608,
          "sourceEndMs": 874908,
          "text": "なぜ?"
        },
        {
          "speechId": 115,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 874908,
          "sourceEndMs": 875168,
          "text": "なぜ?"
        },
        {
          "speechId": 116,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 875168,
          "sourceEndMs": 875268,
          "text": "なぜ?"
        },
        {
          "speechId": 117,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 875268,
          "sourceEndMs": 875608,
          "text": "なぜ?"
        },
        {
          "speechId": 118,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 875608,
          "sourceEndMs": 876069,
          "text": "なぜ?"
        },
        {
          "speechId": 119,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 876069,
          "sourceEndMs": 876389,
          "text": "なぜ?"
        },
        {
          "speechId": 120,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 876389,
          "sourceEndMs": 876789,
          "text": "なぜ?"
        },
        {
          "speechId": 121,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 876789,
          "sourceEndMs": 877069,
          "text": "なぜ?"
        },
        {
          "speechId": 122,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 877069,
          "sourceEndMs": 877849,
          "text": "なぜ?"
        },
        {
          "speechId": 123,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 877849,
          "sourceEndMs": 878230,
          "text": "なぜ?"
        },
        {
          "speechId": 124,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 878230,
          "sourceEndMs": 878370,
          "text": "なぜ?"
        },
        {
          "speechId": 125,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 878370,
          "sourceEndMs": 878570,
          "text": "なぜ?"
        },
        {
          "speechId": 126,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 878570,
          "sourceEndMs": 878750,
          "text": "なぜ?"
        },
        {
          "speechId": 127,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 878750,
          "sourceEndMs": 878910,
          "text": "なぜ?"
        },
        {
          "speechId": 128,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 878910,
          "sourceEndMs": 880211,
          "text": "なぜ?"
        },
        {
          "speechId": 129,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 880211,
          "sourceEndMs": 880331,
          "text": "なぜ?"
        },
        {
          "speechId": 130,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 901643,
          "sourceEndMs": 928566,
          "text": "マリンも3枚出したいでもこれで3枚出したらさすがに普通に3枚出したと分かつた待って分かつてない分かつてないあ出しちゃったまあまあまあいいやまあいいやまあいったんいいやいったんいいか"
        },
        {
          "speechId": 131,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 933106,
          "sourceEndMs": 934006,
          "text": "なに?"
        },
        {
          "speechId": 132,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 934006,
          "sourceEndMs": 934666,
          "text": "嘘?"
        },
        {
          "speechId": 133,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 934666,
          "sourceEndMs": 935027,
          "text": "嘘ついてる?"
        },
        {
          "speechId": 134,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 935027,
          "sourceEndMs": 935327,
          "text": "これ?"
        },
        {
          "speechId": 135,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 935327,
          "sourceEndMs": 940248,
          "text": "あ、こ、あ、なになに争ってる?"
        },
        {
          "speechId": 136,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 940248,
          "sourceEndMs": 941168,
          "text": "こいつ!"
        },
        {
          "speechId": 137,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 941168,
          "sourceEndMs": 945170,
          "text": "こいつめっちゃ嘘つき!"
        },
        {
          "speechId": 138,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 945170,
          "sourceEndMs": 950431,
          "text": "こいつ、DLTさんのお前が一番おーほほ!"
        },
        {
          "speechId": 139,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 950431,
          "sourceEndMs": 959294,
          "text": "よくやったえ、一騎打ちじゃん!"
        },
        {
          "speechId": 140,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 960054,
          "sourceEndMs": 963175,
          "text": "君とマリンの?"
        },
        {
          "speechId": 141,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 963175,
          "sourceEndMs": 966256,
          "text": "君とマリンの一騎打ちなの?"
        },
        {
          "speechId": 142,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 966256,
          "sourceEndMs": 984661,
          "text": "おっとっとまあまあまあまあ一旦落ち着いてあの初めてなんです今日これ今日初めてなんです初めてだから勝ちたいお願い早く出せよ"
        },
        {
          "speechId": 143,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 992626,
          "sourceEndMs": 995087,
          "text": "あ、さあ、めっちゃあるエース。"
        },
        {
          "speechId": 144,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 995087,
          "sourceEndMs": 998769,
          "text": "めっちゃある。"
        },
        {
          "speechId": 145,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 998769,
          "sourceEndMs": 1003031,
          "text": "って言って、本当に出す。"
        },
        {
          "speechId": 146,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1003031,
          "sourceEndMs": 1008754,
          "text": "これは引っかかると思う。"
        },
        {
          "speechId": 147,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1008754,
          "sourceEndMs": 1009535,
          "text": "これガチだ!"
        },
        {
          "speechId": 148,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1009535,
          "sourceEndMs": 1011035,
          "text": "これ!"
        },
        {
          "speechId": 149,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1011035,
          "sourceEndMs": 1013397,
          "text": "これは本当!"
        },
        {
          "speechId": 150,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1013397,
          "sourceEndMs": 1014877,
          "text": "ばーっかー!"
        },
        {
          "speechId": 151,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1014877,
          "sourceEndMs": 1016418,
          "text": "あーあーあー!"
        },
        {
          "speechId": 152,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1016418,
          "sourceEndMs": 1018879,
          "text": "まんまと可愛いマリンちゃんの!"
        },
        {
          "speechId": 153,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1018879,
          "sourceEndMs": 1019520,
          "text": "いーけ!"
        },
        {
          "speechId": 154,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1019520,
          "sourceEndMs": 1019920,
          "text": "いーけ!"
        },
        {
          "speechId": 155,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1020054,
          "sourceEndMs": 1021014,
          "text": "いーけ!"
        },
        {
          "speechId": 156,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1021014,
          "sourceEndMs": 1021914,
          "text": "いーけ!"
        },
        {
          "speechId": 157,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1021914,
          "sourceEndMs": 1023175,
          "text": "いけいけいけ!"
        },
        {
          "speechId": 158,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1023175,
          "sourceEndMs": 1024635,
          "text": "暴れても無駄ですよ!"
        },
        {
          "speechId": 159,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1024635,
          "sourceEndMs": 1030556,
          "text": "おーい悪運の強いやつだなぁ釣れたよ今の!"
        },
        {
          "speechId": 160,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1030556,
          "sourceEndMs": 1041138,
          "text": "ま、違った釣れたよ今のまで入れちゃったボイちゃんにま、最初は何でもいいじゃん最初は何出してもよくね?"
        },
        {
          "speechId": 161,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1041138,
          "sourceEndMs": 1044339,
          "text": "えぇ!"
        },
        {
          "speechId": 162,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1044339,
          "sourceEndMs": 1049540,
          "text": "?"
        },
        {
          "speechId": 163,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1044339,
          "sourceEndMs": 1049540,
          "text": "?"
        },
        {
          "speechId": 164,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1049540,
          "sourceEndMs": 1049700,
          "text": "これ"
        },
        {
          "speechId": 165,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1050130,
          "sourceEndMs": 1053452,
          "text": "これさ、今度は信じていいよ。"
        },
        {
          "speechId": 166,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1053452,
          "sourceEndMs": 1054853,
          "text": "さっきは確かに嘘ついた。"
        },
        {
          "speechId": 167,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1054853,
          "sourceEndMs": 1055773,
          "text": "今度は本当に信じていい。"
        },
        {
          "speechId": 168,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1055773,
          "sourceEndMs": 1067279,
          "text": "これで、ちゃんと…あ、あ、あ、あ、あ、ま、まいっか。"
        },
        {
          "speechId": 169,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1067279,
          "sourceEndMs": 1078506,
          "text": "え、これってさ、4枚しか…ね、あのさ、エースってさ、4枚しかないってことだよね。"
        },
        {
          "speechId": 170,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1078506,
          "sourceEndMs": 1079006,
          "text": "そうだよね。"
        },
        {
          "speechId": 171,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1083870,
          "sourceEndMs": 1109960,
          "text": "早く出せよ早く出す出す出す出すバカ2枚もあるかってんだよボケ夏が待ってどうすんだっけライアーでしかないんだお前それライアーでしかないわけえ何全部で6枚え全部で6枚おどおどおどなんでそんなにいっぱい持ってんのそんなにいっぱい持ってるのおかしいと思うんだけどいや大丈夫食らわないマリンはね今まで一回もこれ食らったことないんだよな"
        },
        {
          "speechId": 172,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1110260,
          "sourceEndMs": 1126263,
          "text": "マリンはこれ食らったことないんだよノーダメやねん一旦6枚か運ゲーの覇者やねんコチトラ分かったか?"
        },
        {
          "speechId": 173,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1126263,
          "sourceEndMs": 1130104,
          "text": "待ってマリンのカードめっ強なんだけどいい?"
        },
        {
          "speechId": 174,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1130104,
          "sourceEndMs": 1137006,
          "text": "マジ強いよこれ言っとくけどどうしよう2枚"
        },
        {
          "speechId": 175,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1140230,
          "sourceEndMs": 1165954,
          "text": "言い出してまた間違えて出しちゃったもう出しちゃうとこあるよねちょっと待ってあれマリンさあ"
        },
        {
          "speechId": 176,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1172018,
          "sourceEndMs": 1175263,
          "text": "待って、どういうこと?"
        },
        {
          "speechId": 177,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1175263,
          "sourceEndMs": 1175604,
          "text": "え?"
        },
        {
          "speechId": 178,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1175604,
          "sourceEndMs": 1176005,
          "text": "え、待って!"
        },
        {
          "speechId": 179,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1176005,
          "sourceEndMs": 1176746,
          "text": "待って待って待って!"
        },
        {
          "speechId": 180,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1176746,
          "sourceEndMs": 1178769,
          "text": "ちょっと待って!"
        },
        {
          "speechId": 181,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1178769,
          "sourceEndMs": 1181995,
          "text": "そう、うるおるそろそろそろそそそそそいそいそいそい!"
        },
        {
          "speechId": 182,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1181995,
          "sourceEndMs": 1183377,
          "text": "そいそいそい!"
        },
        {
          "speechId": 183,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1183377,
          "sourceEndMs": 1183898,
          "text": "おーおーおー!"
        },
        {
          "speechId": 184,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1183898,
          "sourceEndMs": 1184920,
          "text": "覚悟決まったか?"
        },
        {
          "speechId": 185,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1186202,
          "sourceEndMs": 1190486,
          "text": "ほらもう、あと2分の1ってことだよね、弾がえぇぇぇぇぇ!"
        },
        {
          "speechId": 186,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1190486,
          "sourceEndMs": 1192648,
          "text": "?"
        },
        {
          "speechId": 187,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1192648,
          "sourceEndMs": 1193209,
          "text": "耐えすぎ!"
        },
        {
          "speechId": 188,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1193209,
          "sourceEndMs": 1197313,
          "text": "?"
        },
        {
          "speechId": 189,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1193209,
          "sourceEndMs": 1197313,
          "text": "?"
        },
        {
          "speechId": 190,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1197313,
          "sourceEndMs": 1197894,
          "text": "君耐えるね"
        },
        {
          "speechId": 191,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1200374,
          "sourceEndMs": 1205915,
          "text": "君こそが真の運ゲーの覇者?"
        },
        {
          "speechId": 192,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1205915,
          "sourceEndMs": 1208176,
          "text": "え、耐えすぎでしょ?"
        },
        {
          "speechId": 193,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1208176,
          "sourceEndMs": 1209616,
          "text": "4分の1?"
        },
        {
          "speechId": 194,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1209616,
          "sourceEndMs": 1228340,
          "text": "なんで4分の1で耐えってこれはね、これはあるわうん、出すよこれ本当にあるから出すねで待って、どうやってやるんだっけこうして"
        },
        {
          "speechId": 195,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1230002,
          "sourceEndMs": 1240508,
          "text": "でもさ、2枚出ししたらさ、これさ、嘘って言ってくると思うので、こうよこれ嘘だと思うじゃんこれ本当だから!"
        },
        {
          "speechId": 196,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1240508,
          "sourceEndMs": 1241109,
          "text": "これ本当だからね!"
        },
        {
          "speechId": 197,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1241109,
          "sourceEndMs": 1241489,
          "text": "この熱い振りで!"
        },
        {
          "speechId": 198,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1241489,
          "sourceEndMs": 1241529,
          "text": "ね!"
        },
        {
          "speechId": 199,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1241529,
          "sourceEndMs": 1241549,
          "text": "?"
        },
        {
          "speechId": 200,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1241549,
          "sourceEndMs": 1243610,
          "text": "いやいやいや!"
        },
        {
          "speechId": 201,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1243610,
          "sourceEndMs": 1243650,
          "text": "は!"
        },
        {
          "speechId": 202,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1243650,
          "sourceEndMs": 1243890,
          "text": "?"
        },
        {
          "speechId": 203,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1243890,
          "sourceEndMs": 1244070,
          "text": "は!"
        },
        {
          "speechId": 204,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244070,
          "sourceEndMs": 1244130,
          "text": "?"
        },
        {
          "speechId": 205,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244130,
          "sourceEndMs": 1244171,
          "text": "え!"
        },
        {
          "speechId": 206,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244171,
          "sourceEndMs": 1244191,
          "text": "?"
        },
        {
          "speechId": 207,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244191,
          "sourceEndMs": 1244231,
          "text": "え!"
        },
        {
          "speechId": 208,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244231,
          "sourceEndMs": 1244251,
          "text": "?"
        },
        {
          "speechId": 209,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244251,
          "sourceEndMs": 1244311,
          "text": "え!"
        },
        {
          "speechId": 210,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244311,
          "sourceEndMs": 1244331,
          "text": "?"
        },
        {
          "speechId": 211,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244331,
          "sourceEndMs": 1244371,
          "text": "え!"
        },
        {
          "speechId": 212,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244371,
          "sourceEndMs": 1244391,
          "text": "?"
        },
        {
          "speechId": 213,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244391,
          "sourceEndMs": 1244431,
          "text": "え!"
        },
        {
          "speechId": 214,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244431,
          "sourceEndMs": 1244531,
          "text": "?"
        },
        {
          "speechId": 215,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244531,
          "sourceEndMs": 1244611,
          "text": "え!"
        },
        {
          "speechId": 216,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244611,
          "sourceEndMs": 1244631,
          "text": "?"
        },
        {
          "speechId": 217,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244631,
          "sourceEndMs": 1244671,
          "text": "え!"
        },
        {
          "speechId": 218,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244671,
          "sourceEndMs": 1244691,
          "text": "?"
        },
        {
          "speechId": 219,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244691,
          "sourceEndMs": 1244731,
          "text": "え!"
        },
        {
          "speechId": 220,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244731,
          "sourceEndMs": 1244751,
          "text": "?"
        },
        {
          "speechId": 221,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1244751,
          "sourceEndMs": 1246492,
          "text": "え!"
        },
        {
          "speechId": 222,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1246492,
          "sourceEndMs": 1246772,
          "text": "?"
        },
        {
          "speechId": 223,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1246772,
          "sourceEndMs": 1246812,
          "text": "え!"
        },
        {
          "speechId": 224,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1246812,
          "sourceEndMs": 1246872,
          "text": "?"
        },
        {
          "speechId": 225,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1246872,
          "sourceEndMs": 1246972,
          "text": "え!"
        },
        {
          "speechId": 226,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1246972,
          "sourceEndMs": 1246992,
          "text": "?"
        },
        {
          "speechId": 227,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1246992,
          "sourceEndMs": 1247032,
          "text": "え!"
        },
        {
          "speechId": 228,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1247032,
          "sourceEndMs": 1247052,
          "text": "?"
        },
        {
          "speechId": 229,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1247052,
          "sourceEndMs": 1247092,
          "text": "え!"
        },
        {
          "speechId": 230,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1247092,
          "sourceEndMs": 1247192,
          "text": "?"
        },
        {
          "speechId": 231,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1247192,
          "sourceEndMs": 1247232,
          "text": "え!"
        },
        {
          "speechId": 232,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1247232,
          "sourceEndMs": 1247693,
          "text": "?"
        },
        {
          "speechId": 233,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1247693,
          "sourceEndMs": 1247753,
          "text": "え!"
        },
        {
          "speechId": 234,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1247753,
          "sourceEndMs": 1247773,
          "text": "?"
        },
        {
          "speechId": 235,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1247773,
          "sourceEndMs": 1247813,
          "text": "え!"
        },
        {
          "speechId": 236,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1247813,
          "sourceEndMs": 1247833,
          "text": "?"
        },
        {
          "speechId": 237,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1247833,
          "sourceEndMs": 1247873,
          "text": "え!"
        },
        {
          "speechId": 238,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1247873,
          "sourceEndMs": 1247933,
          "text": "?"
        },
        {
          "speechId": 239,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1247933,
          "sourceEndMs": 1247973,
          "text": "え!"
        },
        {
          "speechId": 240,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1247973,
          "sourceEndMs": 1248013,
          "text": "?"
        },
        {
          "speechId": 241,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1248013,
          "sourceEndMs": 1248073,
          "text": "え!"
        },
        {
          "speechId": 242,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1248073,
          "sourceEndMs": 1248093,
          "text": "?"
        },
        {
          "speechId": 243,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1248093,
          "sourceEndMs": 1248133,
          "text": "え!"
        },
        {
          "speechId": 244,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1248133,
          "sourceEndMs": 1248153,
          "text": "?"
        },
        {
          "speechId": 245,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1248153,
          "sourceEndMs": 1248193,
          "text": "え!"
        },
        {
          "speechId": 246,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1248193,
          "sourceEndMs": 1248213,
          "text": "?"
        },
        {
          "speechId": 247,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1248213,
          "sourceEndMs": 1248253,
          "text": "え!"
        },
        {
          "speechId": 248,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1248253,
          "sourceEndMs": 1248273,
          "text": "?"
        },
        {
          "speechId": 249,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1248273,
          "sourceEndMs": 1248453,
          "text": "え!"
        },
        {
          "speechId": 250,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1248453,
          "sourceEndMs": 1248593,
          "text": "?"
        },
        {
          "speechId": 251,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1248593,
          "sourceEndMs": 1250054,
          "text": "え!"
        },
        {
          "speechId": 252,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1250054,
          "sourceEndMs": 1252516,
          "text": "?"
        },
        {
          "speechId": 253,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1252516,
          "sourceEndMs": 1252596,
          "text": "え!"
        },
        {
          "speechId": 254,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1252596,
          "sourceEndMs": 1252616,
          "text": "?"
        },
        {
          "speechId": 255,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1252616,
          "sourceEndMs": 1252656,
          "text": "え!"
        },
        {
          "speechId": 256,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1252656,
          "sourceEndMs": 1252676,
          "text": "?"
        },
        {
          "speechId": 257,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1252676,
          "sourceEndMs": 1252716,
          "text": "え!"
        },
        {
          "speechId": 258,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1252716,
          "sourceEndMs": 1252736,
          "text": "?"
        },
        {
          "speechId": 259,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1252736,
          "sourceEndMs": 1252776,
          "text": "え!"
        },
        {
          "speechId": 260,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1252776,
          "sourceEndMs": 1253756,
          "text": "?"
        },
        {
          "speechId": 261,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1253756,
          "sourceEndMs": 1253796,
          "text": "え!"
        },
        {
          "speechId": 262,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1253796,
          "sourceEndMs": 1253816,
          "text": "?"
        },
        {
          "speechId": 263,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1253816,
          "sourceEndMs": 1253856,
          "text": "え!"
        },
        {
          "speechId": 264,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1253856,
          "sourceEndMs": 1253876,
          "text": "?"
        },
        {
          "speechId": 265,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1253876,
          "sourceEndMs": 1253916,
          "text": "え!"
        },
        {
          "speechId": 266,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1253916,
          "sourceEndMs": 1253936,
          "text": "?"
        },
        {
          "speechId": 267,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1253936,
          "sourceEndMs": 1254056,
          "text": "え!"
        },
        {
          "speechId": 268,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254056,
          "sourceEndMs": 1254076,
          "text": "?"
        },
        {
          "speechId": 269,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254076,
          "sourceEndMs": 1254116,
          "text": "え!"
        },
        {
          "speechId": 270,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254116,
          "sourceEndMs": 1254136,
          "text": "?"
        },
        {
          "speechId": 271,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254136,
          "sourceEndMs": 1254177,
          "text": "え!"
        },
        {
          "speechId": 272,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254177,
          "sourceEndMs": 1254197,
          "text": "?"
        },
        {
          "speechId": 273,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254197,
          "sourceEndMs": 1254337,
          "text": "え!"
        },
        {
          "speechId": 274,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254337,
          "sourceEndMs": 1254357,
          "text": "?"
        },
        {
          "speechId": 275,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254357,
          "sourceEndMs": 1254437,
          "text": "え!"
        },
        {
          "speechId": 276,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254437,
          "sourceEndMs": 1254457,
          "text": "?"
        },
        {
          "speechId": 277,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254457,
          "sourceEndMs": 1254617,
          "text": "え!"
        },
        {
          "speechId": 278,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254617,
          "sourceEndMs": 1254677,
          "text": "?"
        },
        {
          "speechId": 279,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254677,
          "sourceEndMs": 1254797,
          "text": "え!"
        },
        {
          "speechId": 280,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254797,
          "sourceEndMs": 1254817,
          "text": "?"
        },
        {
          "speechId": 281,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254817,
          "sourceEndMs": 1254857,
          "text": "え!"
        },
        {
          "speechId": 282,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254857,
          "sourceEndMs": 1254897,
          "text": "?"
        },
        {
          "speechId": 283,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1254897,
          "sourceEndMs": 1255037,
          "text": "え!"
        },
        {
          "speechId": 284,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1255037,
          "sourceEndMs": 1255057,
          "text": "?"
        },
        {
          "speechId": 285,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1255057,
          "sourceEndMs": 1255117,
          "text": "え!"
        },
        {
          "speechId": 286,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1255117,
          "sourceEndMs": 1255197,
          "text": "?"
        },
        {
          "speechId": 287,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1255197,
          "sourceEndMs": 1255337,
          "text": "え!"
        },
        {
          "speechId": 288,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1255337,
          "sourceEndMs": 1255437,
          "text": "?"
        },
        {
          "speechId": 289,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1255437,
          "sourceEndMs": 1255577,
          "text": "え!"
        },
        {
          "speechId": 290,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1255577,
          "sourceEndMs": 1255657,
          "text": "?"
        },
        {
          "speechId": 291,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1255657,
          "sourceEndMs": 1255777,
          "text": "え!"
        },
        {
          "speechId": 292,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1255777,
          "sourceEndMs": 1255858,
          "text": "?"
        },
        {
          "speechId": 293,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1255858,
          "sourceEndMs": 1255978,
          "text": "え!"
        },
        {
          "speechId": 294,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1255978,
          "sourceEndMs": 1256058,
          "text": "?"
        },
        {
          "speechId": 295,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1256058,
          "sourceEndMs": 1256158,
          "text": "え!"
        },
        {
          "speechId": 296,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1256158,
          "sourceEndMs": 1256178,
          "text": "?"
        },
        {
          "speechId": 297,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1256178,
          "sourceEndMs": 1256338,
          "text": "え!"
        },
        {
          "speechId": 298,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1256338,
          "sourceEndMs": 1256358,
          "text": "?"
        },
        {
          "speechId": 299,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1256358,
          "sourceEndMs": 1256398,
          "text": "え!"
        },
        {
          "speechId": 300,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1256398,
          "sourceEndMs": 1256478,
          "text": "?"
        },
        {
          "speechId": 301,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1256478,
          "sourceEndMs": 1256598,
          "text": "え!"
        },
        {
          "speechId": 302,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1256598,
          "sourceEndMs": 1256618,
          "text": "?"
        },
        {
          "speechId": 303,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1256618,
          "sourceEndMs": 1256918,
          "text": "え!"
        },
        {
          "speechId": 304,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1256918,
          "sourceEndMs": 1256938,
          "text": "?"
        },
        {
          "speechId": 305,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1256938,
          "sourceEndMs": 1256978,
          "text": "え!"
        },
        {
          "speechId": 306,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1256978,
          "sourceEndMs": 1257058,
          "text": "?"
        },
        {
          "speechId": 307,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1257058,
          "sourceEndMs": 1257218,
          "text": "え!"
        },
        {
          "speechId": 308,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1257218,
          "sourceEndMs": 1257238,
          "text": "?"
        },
        {
          "speechId": 309,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1257238,
          "sourceEndMs": 1257418,
          "text": "え!"
        },
        {
          "speechId": 310,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1257418,
          "sourceEndMs": 1257438,
          "text": "?"
        },
        {
          "speechId": 311,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1257438,
          "sourceEndMs": 1257879,
          "text": "え!"
        },
        {
          "speechId": 312,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1257879,
          "sourceEndMs": 1257899,
          "text": "?"
        },
        {
          "speechId": 313,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1257899,
          "sourceEndMs": 1257939,
          "text": "え!"
        },
        {
          "speechId": 314,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1257939,
          "sourceEndMs": 1257959,
          "text": "?"
        },
        {
          "speechId": 315,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1257959,
          "sourceEndMs": 1258059,
          "text": "え!"
        },
        {
          "speechId": 316,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258059,
          "sourceEndMs": 1258079,
          "text": "?"
        },
        {
          "speechId": 317,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258079,
          "sourceEndMs": 1258119,
          "text": "え!"
        },
        {
          "speechId": 318,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258119,
          "sourceEndMs": 1258139,
          "text": "?"
        },
        {
          "speechId": 319,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258139,
          "sourceEndMs": 1258219,
          "text": "え!"
        },
        {
          "speechId": 320,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258219,
          "sourceEndMs": 1258239,
          "text": "?"
        },
        {
          "speechId": 321,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258239,
          "sourceEndMs": 1258339,
          "text": "え!"
        },
        {
          "speechId": 322,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258339,
          "sourceEndMs": 1258359,
          "text": "?"
        },
        {
          "speechId": 323,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258359,
          "sourceEndMs": 1258399,
          "text": "え!"
        },
        {
          "speechId": 324,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258399,
          "sourceEndMs": 1258459,
          "text": "?"
        },
        {
          "speechId": 325,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258459,
          "sourceEndMs": 1258499,
          "text": "え!"
        },
        {
          "speechId": 326,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258499,
          "sourceEndMs": 1258519,
          "text": "?"
        },
        {
          "speechId": 327,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258519,
          "sourceEndMs": 1258579,
          "text": "え!"
        },
        {
          "speechId": 328,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258579,
          "sourceEndMs": 1258599,
          "text": "?"
        },
        {
          "speechId": 329,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258599,
          "sourceEndMs": 1258639,
          "text": "え!"
        },
        {
          "speechId": 330,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258639,
          "sourceEndMs": 1258659,
          "text": "?"
        },
        {
          "speechId": 331,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258659,
          "sourceEndMs": 1258699,
          "text": "え!"
        },
        {
          "speechId": 332,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258699,
          "sourceEndMs": 1258739,
          "text": "?"
        },
        {
          "speechId": 333,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258739,
          "sourceEndMs": 1258799,
          "text": "え!"
        },
        {
          "speechId": 334,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258799,
          "sourceEndMs": 1258859,
          "text": "?"
        },
        {
          "speechId": 335,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258859,
          "sourceEndMs": 1258939,
          "text": "え!"
        },
        {
          "speechId": 336,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258939,
          "sourceEndMs": 1258959,
          "text": "?"
        },
        {
          "speechId": 337,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258959,
          "sourceEndMs": 1258999,
          "text": "え!"
        },
        {
          "speechId": 338,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1258999,
          "sourceEndMs": 1259019,
          "text": "?"
        },
        {
          "speechId": 339,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259019,
          "sourceEndMs": 1259059,
          "text": "え!"
        },
        {
          "speechId": 340,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259059,
          "sourceEndMs": 1259079,
          "text": "?"
        },
        {
          "speechId": 341,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259079,
          "sourceEndMs": 1259119,
          "text": "え!"
        },
        {
          "speechId": 342,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259119,
          "sourceEndMs": 1259139,
          "text": "?"
        },
        {
          "speechId": 343,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259139,
          "sourceEndMs": 1259180,
          "text": "え!"
        },
        {
          "speechId": 344,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259180,
          "sourceEndMs": 1259200,
          "text": "?"
        },
        {
          "speechId": 345,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259200,
          "sourceEndMs": 1259320,
          "text": "え!"
        },
        {
          "speechId": 346,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259320,
          "sourceEndMs": 1259340,
          "text": "?"
        },
        {
          "speechId": 347,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259340,
          "sourceEndMs": 1259380,
          "text": "え!"
        },
        {
          "speechId": 348,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259380,
          "sourceEndMs": 1259400,
          "text": "?"
        },
        {
          "speechId": 349,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259400,
          "sourceEndMs": 1259460,
          "text": "え!"
        },
        {
          "speechId": 350,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259460,
          "sourceEndMs": 1259500,
          "text": "?"
        },
        {
          "speechId": 351,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259500,
          "sourceEndMs": 1259540,
          "text": "え!"
        },
        {
          "speechId": 352,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259540,
          "sourceEndMs": 1259560,
          "text": "?"
        },
        {
          "speechId": 353,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259560,
          "sourceEndMs": 1259600,
          "text": "え!"
        },
        {
          "speechId": 354,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259600,
          "sourceEndMs": 1259620,
          "text": "?"
        },
        {
          "speechId": 355,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259620,
          "sourceEndMs": 1259660,
          "text": "え!"
        },
        {
          "speechId": 356,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259660,
          "sourceEndMs": 1259680,
          "text": "?"
        },
        {
          "speechId": 357,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259680,
          "sourceEndMs": 1259720,
          "text": "え!"
        },
        {
          "speechId": 358,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259720,
          "sourceEndMs": 1259740,
          "text": "?"
        },
        {
          "speechId": 359,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259740,
          "sourceEndMs": 1259780,
          "text": "え!"
        },
        {
          "speechId": 360,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259780,
          "sourceEndMs": 1259800,
          "text": "?"
        },
        {
          "speechId": 361,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259800,
          "sourceEndMs": 1259840,
          "text": "え!"
        },
        {
          "speechId": 362,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259840,
          "sourceEndMs": 1259880,
          "text": "?"
        },
        {
          "speechId": 363,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259880,
          "sourceEndMs": 1259940,
          "text": "え!"
        },
        {
          "speechId": 364,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259940,
          "sourceEndMs": 1259960,
          "text": "?"
        },
        {
          "speechId": 365,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1259940,
          "sourceEndMs": 1259960,
          "text": "?"
        },
        {
          "speechId": 366,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1280034,
          "sourceEndMs": 1289680,
          "text": "最初のが嘘え待ってあのさ質問なんだが最初って嘘つけるの最初って嘘つけるのねえ"
        },
        {
          "speechId": 367,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1291622,
          "sourceEndMs": 1292903,
          "text": "嘘つけるの?"
        },
        {
          "speechId": 368,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1292903,
          "sourceEndMs": 1296825,
          "text": "これしようつける?"
        },
        {
          "speechId": 369,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1296825,
          "sourceEndMs": 1298626,
          "text": "はぁ?"
        },
        {
          "speechId": 370,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1298626,
          "sourceEndMs": 1305831,
          "text": "待ってこれとさこれでさえ、待って勝手にクイーンって言ってS出したけどクイーンって言ってん?"
        },
        {
          "speechId": 371,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1305831,
          "sourceEndMs": 1311975,
          "text": "これど勝手に嘘つくつもりなかったけど嘘ついてるん?"
        },
        {
          "speechId": 372,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1311975,
          "sourceEndMs": 1312475,
          "text": "ん?"
        },
        {
          "speechId": 373,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1312475,
          "sourceEndMs": 1312976,
          "text": "ん?"
        },
        {
          "speechId": 374,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1312976,
          "sourceEndMs": 1313176,
          "text": "ん?"
        },
        {
          "speechId": 375,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1313176,
          "sourceEndMs": 1319380,
          "text": "ん?"
        },
        {
          "speechId": 376,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1319380,
          "sourceEndMs": 1319980,
          "text": "嘘はいつでもつ"
        },
        {
          "speechId": 377,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1321523,
          "sourceEndMs": 1322103,
          "text": "は?"
        },
        {
          "speechId": 378,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1322103,
          "sourceEndMs": 1333590,
          "text": "ちょっと待て、でもジョーカーだからこれジョーカーだから今はクイーンだぞあ、左上のを出すそういうこと?"
        },
        {
          "speechId": 379,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1333590,
          "sourceEndMs": 1347338,
          "text": "あさ、ごめんだけどさマリ自分が最初に出したカードを準拠になるんだと思ってたわバーカジョーカーで無双してんだよこっちは何がライアーじゃ諦めろ"
        },
        {
          "speechId": 380,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1354810,
          "sourceEndMs": 1357451,
          "text": "なんでお前耐えすぎだろ!"
        },
        {
          "speechId": 381,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1357451,
          "sourceEndMs": 1361853,
          "text": "なんでそんな毎回耐える?"
        },
        {
          "speechId": 382,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1361853,
          "sourceEndMs": 1379980,
          "text": "言っとくけどね君マリンは今ルールを理解した今理解しちゃったよ強くなるよさらにここまでも強かったけど今ルールを理解して最強へと振動を目覚めた"
        },
        {
          "speechId": 383,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1382810,
          "sourceEndMs": 1409860,
          "text": "そんなわけそんなわけない3枚もあるわけないじゃん絶対ないあるのかなほら怪しいもん怪しいもんブルブル震えちゃってさ嘘だと思いますあやばでもさ君もこれ今まで何発も耐えてきたもんね"
        },
        {
          "speechId": 384,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1410371,
          "sourceEndMs": 1411219,
          "text": "マリンも耐えるよ"
        },
        {
          "speechId": 385,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1440998,
          "sourceEndMs": 1447120,
          "text": "おかしい!"
        },
        {
          "speechId": 386,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1447120,
          "sourceEndMs": 1457183,
          "text": "顔…あの首振りいやらしいわね引っかかったわみんな入ってきてくれてありがとうようやく理解できたジョーカーわかって…わかるよ!"
        },
        {
          "speechId": 387,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1457183,
          "sourceEndMs": 1459303,
          "text": "ジョーカーは何にでもなるってことでしょ?"
        },
        {
          "speechId": 388,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1459303,
          "sourceEndMs": 1460744,
          "text": "違うの?"
        },
        {
          "speechId": 389,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1460744,
          "sourceEndMs": 1462864,
          "text": "ジョーカーは何にでも化けるってことよね?"
        },
        {
          "speechId": 390,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1462864,
          "sourceEndMs": 1468286,
          "text": "スタートしましょう一旦ね一旦ジョーカーは何にでもなるってことだよね?"
        },
        {
          "speechId": 391,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1468286,
          "sourceEndMs": 1469146,
          "text": "きまじそういうことでしょ?"
        },
        {
          "speechId": 392,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1472626,
          "sourceEndMs": 1474047,
          "text": "分かってる?"
        },
        {
          "speechId": 393,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1474047,
          "sourceEndMs": 1494477,
          "text": "もう今理解した最初の試合は分かってなかった確かに完全に理解しましたほだ6枚6枚ジョーカー2枚エース出してってことだよね?"
        },
        {
          "speechId": 394,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1494477,
          "sourceEndMs": 1496338,
          "text": "ちゃうのか?"
        },
        {
          "speechId": 395,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1496338,
          "sourceEndMs": 1499240,
          "text": "エーステーブルエース出せってことだよね?"
        },
        {
          "speechId": 396,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1499240,
          "sourceEndMs": 1499980,
          "text": "ようやく理解した"
        },
        {
          "speechId": 397,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1501767,
          "sourceEndMs": 1529960,
          "text": "キャージマリンはこのゲーム2回目で理解した目覚めた振動となった気分いいなみんなうなずいて話を聞いてくれるみんな話聞いてくれる早く出せよ何悩んでんだ怪しいんじゃないのそれちょっとそんなに迷っちゃってさ怪しいんじゃないのえー島"
        },
        {
          "speechId": 398,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1530002,
          "sourceEndMs": 1551555,
          "text": "確かさこれ嘘だと思う言った方がいいと思うよ悩みすぎやもんこんなんやった方がいいと思うマリンがほらマリンがそこだったら絶対言ってるよほらだからおー目そらしどうした怖いか?"
        },
        {
          "speechId": 399,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1551555,
          "sourceEndMs": 1553416,
          "text": "怖いか?"
        },
        {
          "speechId": 400,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1553416,
          "sourceEndMs": 1555637,
          "text": "死が怖いか?"
        },
        {
          "speechId": 401,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1555637,
          "sourceEndMs": 1558719,
          "text": "さよなら何耐えてんだてめえ"
        },
        {
          "speechId": 402,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1562366,
          "sourceEndMs": 1570751,
          "text": "わかるんだよ顔で顔で顔でよわかるんだから思い知った?"
        },
        {
          "speechId": 403,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1570751,
          "sourceEndMs": 1573473,
          "text": "のすのす思い知った?"
        },
        {
          "speechId": 404,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1573473,
          "sourceEndMs": 1589142,
          "text": "マリンの前では通用しないからいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいや"
        },
        {
          "speechId": 405,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1594463,
          "sourceEndMs": 1599465,
          "text": "これはねー嘘っぽほら!"
        },
        {
          "speechId": 406,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1599465,
          "sourceEndMs": 1600305,
          "text": "ほら!"
        },
        {
          "speechId": 407,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1600305,
          "sourceEndMs": 1602225,
          "text": "いや通じ合っほーほー!"
        },
        {
          "speechId": 408,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1602225,
          "sourceEndMs": 1603366,
          "text": "わー!"
        },
        {
          "speechId": 409,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1603366,
          "sourceEndMs": 1619350,
          "text": "ノスノスさんあなたのやり方がね完全にみんなにバレバレですよ読めて読めてきたあなたのやり方ね耐えるね君耐えるね耐えるじゃん"
        },
        {
          "speechId": 410,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1621138,
          "sourceEndMs": 1644128,
          "text": "しぶといじゃんマノスノスさんはここまで初手嘘を出し嘘をつき続けてきたがゆえにこればっかりは本当ってことだよねまあ本当だと思うけどねマリンは"
        },
        {
          "speechId": 411,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1651002,
          "sourceEndMs": 1675796,
          "text": "いやシマシカさんこれ紛れ込んでノスノスの注目に紛れ込んでさぁやってるよね今これ今なら今ならいけると思っとるよねこれマリンは本当ねちな"
        },
        {
          "speechId": 412,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1685398,
          "sourceEndMs": 1707274,
          "text": "なんですかその目はマリンは本当それは嘘くさいな嘘くさ嘘くさいと思うけどね"
        },
        {
          "speechId": 413,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1711215,
          "sourceEndMs": 1716478,
          "text": "いやマリンは信じてた!"
        },
        {
          "speechId": 414,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1716478,
          "sourceEndMs": 1738874,
          "text": "ノスノスさんのこと嘘つかないと思ったもんシマシカさんやっちゃったねやっちゃったね耐えたじゃん耐えるねなるほど耐えていくじゃんケーキ漬けに誰か死んだ方がいいと思うけどねマリンは"
        },
        {
          "speechId": 415,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1742930,
          "sourceEndMs": 1747574,
          "text": "どれどれ?"
        },
        {
          "speechId": 416,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1747574,
          "sourceEndMs": 1769414,
          "text": "なるほど悪くない感じだけどまあ一旦ねシマイシカさんは今打たれかけて震えてたからここで嘘はつかないと感じるねマリンはだがそう思ってあえてあえての"
        },
        {
          "speechId": 417,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1770646,
          "sourceEndMs": 1774188,
          "text": "やってるかもねこれ3?"
        },
        {
          "speechId": 418,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1774188,
          "sourceEndMs": 1783532,
          "text": "んなわけないなけない嘘つくな3枚も何?"
        },
        {
          "speechId": 419,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1783532,
          "sourceEndMs": 1784333,
          "text": "何?"
        },
        {
          "speechId": 420,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1784333,
          "sourceEndMs": 1799640,
          "text": "3枚もあるわけがないんだ3枚も持ってるわけないのに耐えろマリン大丈夫耐えろ耐えろ耐えろ大丈夫そうそうそうそうこのゲームの主はマリンなんだよ一発で死ねるか"
        },
        {
          "speechId": 421,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1803438,
          "sourceEndMs": 1806240,
          "text": "観るか観る?"
        },
        {
          "speechId": 422,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1806240,
          "sourceEndMs": 1806981,
          "text": "観る?"
        },
        {
          "speechId": 423,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1806981,
          "sourceEndMs": 1808442,
          "text": "観るまでパーン!"
        },
        {
          "speechId": 424,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1808442,
          "sourceEndMs": 1814967,
          "text": "何テーブルだっけ?"
        },
        {
          "speechId": 425,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1814967,
          "sourceEndMs": 1818850,
          "text": "一旦一周はさ普通にホントでやろうホントでね?"
        },
        {
          "speechId": 426,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1818850,
          "sourceEndMs": 1829258,
          "text": "あ、ま、ま、ま、まいっかまいっか間違えたけどこれガチこれはガチ"
        },
        {
          "speechId": 427,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1846248,
          "sourceEndMs": 1851512,
          "text": "3ってことはないんじゃ!"
        },
        {
          "speechId": 428,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1851512,
          "sourceEndMs": 1858878,
          "text": "でも、ノスノス嘘つきだからなねぇみんな、ノスノスさんって初手嘘つく癖あったよね?"
        },
        {
          "speechId": 429,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1861378,
          "sourceEndMs": 1876004,
          "text": "これ嘘だと思うよマリン3枚もさだよねシマシカさん覚悟決めや!"
        },
        {
          "speechId": 430,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1876004,
          "sourceEndMs": 1877785,
          "text": "覚悟決め!"
        },
        {
          "speechId": 431,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1877785,
          "sourceEndMs": 1880747,
          "text": "ね?"
        },
        {
          "speechId": 432,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1880747,
          "sourceEndMs": 1881907,
          "text": "頭数減らしてこうや!"
        },
        {
          "speechId": 433,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1881907,
          "sourceEndMs": 1884008,
          "text": "耐えるね!"
        },
        {
          "speechId": 434,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1884008,
          "sourceEndMs": 1885289,
          "text": "耐えるじゃん!"
        },
        {
          "speechId": 435,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1885289,
          "sourceEndMs": 1887930,
          "text": "なんでこいつらこんな耐えるん?"
        },
        {
          "speechId": 436,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1887930,
          "sourceEndMs": 1888590,
          "text": "耐えすぎやろ?"
        },
        {
          "speechId": 437,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1892050,
          "sourceEndMs": 1919800,
          "text": "クイーンねさあ見ますかおーいいじゃんよ言っとくけど嘘は通用しないよこっちはね結構自分の手札で悟ってんだから嘘は通用しないと思っていただきたいまあ1枚くらいは"
        },
        {
          "speechId": 444,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 1984368,
          "sourceEndMs": 2009940,
          "text": "嘘だと思います顔でわかる顔でわかるんだからほーらマリンが正しいんだから覚悟決めやさあそろそろ血を流してくれマリンに見せてよ耐えん耐えすぎてなんでこいつら全員こんな耐え散らかしてんのみんな耐えすぎ"
        },
        {
          "speechId": 445,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2010042,
          "sourceEndMs": 2032395,
          "text": "次マジで血を流してどれ悪くめっちゃいくねもはやまあ一旦ね言っとくけどマジでマリンの元に集ってるよこれ"
        },
        {
          "speechId": 446,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2040002,
          "sourceEndMs": 2068199,
          "text": "一旦真面目に出すかシマシカが嘘っぽいなーってやってるからこれは一旦ホント感を出すどうしたこっち見てこれホントだよマリンが君に嘘ついたことあったっけないそうないこれガチないよね"
        },
        {
          "speechId": 447,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2070140,
          "sourceEndMs": 2098406,
          "text": "なんだお前その態度はなんだその態度嘘くさいな嘘くさいと思うスカイドレアさんノスノスもシマシカが怪しいってマリンもシマシカだと思う"
        },
        {
          "speechId": 448,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2103466,
          "sourceEndMs": 2105227,
          "text": "それ嘘やん!"
        },
        {
          "speechId": 449,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2105227,
          "sourceEndMs": 2106367,
          "text": "なわけ!"
        },
        {
          "speechId": 450,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2106367,
          "sourceEndMs": 2108588,
          "text": "トゥーって!"
        },
        {
          "speechId": 451,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2108588,
          "sourceEndMs": 2120992,
          "text": "いやシマシカが嘘ついててスカイドリアさんは本当これで行くわシマシカが嘘ついてるノスノスさんもそう思う?"
        },
        {
          "speechId": 452,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2120992,
          "sourceEndMs": 2128234,
          "text": "こいつら信者だからさマリンにさライアーって言えないと思うんだよなよし"
        },
        {
          "speechId": 453,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2130950,
          "sourceEndMs": 2150741,
          "text": "ここで嘘つかないのマリンだけなんだよなこの現場で嘘つかないのマリンだけノスノスさんはマリンだけ信じて後の奴らは敵だと思って?"
        },
        {
          "speechId": 454,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2150741,
          "sourceEndMs": 2152142,
          "text": "ノスノス?"
        },
        {
          "speechId": 455,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2152142,
          "sourceEndMs": 2156264,
          "text": "ノスノス?"
        },
        {
          "speechId": 456,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2156264,
          "sourceEndMs": 2159406,
          "text": "嘘でしょ?"
        },
        {
          "speechId": 457,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2159406,
          "sourceEndMs": 2159546,
          "text": "お前さ"
        },
        {
          "speechId": 458,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2163780,
          "sourceEndMs": 2166702,
          "text": "ワン、キング"
        },
        {
          "speechId": 459,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2193742,
          "sourceEndMs": 2219860,
          "text": "マリンは1枚目は嘘つかないことにしてる通った3枚とか出したらさライアってノスノス言ってくるぞこれ絶対3枚とか出したら絶対さライアって言ってくる3枚出そう"
        },
        {
          "speechId": 460,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2221419,
          "sourceEndMs": 2247350,
          "text": "ちゃんと切ってるからボイチャは3枚出したらね疑うと思うよ嘘っぽいと思うやん嘘っぽいと思うやんこれガチですしまちかなんだその態度は目そらしてんじゃないよこれガチ"
        },
        {
          "speechId": 461,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2252382,
          "sourceEndMs": 2263210,
          "text": "通るんかい…通るんかい…確かに!"
        },
        {
          "speechId": 462,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2263210,
          "sourceEndMs": 2268474,
          "text": "なにっ!"
        },
        {
          "speechId": 463,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2268474,
          "sourceEndMs": 2272177,
          "text": "ノスノスお前!"
        },
        {
          "speechId": 464,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2272177,
          "sourceEndMs": 2274619,
          "text": "空気読め!"
        },
        {
          "speechId": 465,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2274619,
          "sourceEndMs": 2275820,
          "text": "しましか耐えろ!"
        },
        {
          "speechId": 466,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2275820,
          "sourceEndMs": 2277961,
          "text": "耐えていく!"
        },
        {
          "speechId": 467,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2277961,
          "sourceEndMs": 2278942,
          "text": "耐えていった!"
        },
        {
          "speechId": 468,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2280170,
          "sourceEndMs": 2309518,
          "text": "いいよここには歴戦の重さしかいないみたい誰も死にゃ死ねー見よめっちゃいいやん言っとくけどマイリンの手札めっちゃ用だからねこれうわうわうわそういうことしちゃうんだこれ嘘やと思うスカイドレアさん?"
        },
        {
          "speechId": 469,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2310022,
          "sourceEndMs": 2326446,
          "text": "嘘だと思うよこれマリンライアーライアーだってマリンのほらノースノスも言っとるしマリンの手札を見るにこれは嘘やね100%嘘やってみ?"
        },
        {
          "speechId": 470,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2326446,
          "sourceEndMs": 2333848,
          "text": "やれるよこれさせるよライバルを減らしていこうほらね?"
        },
        {
          "speechId": 471,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2333848,
          "sourceEndMs": 2336609,
          "text": "ほらだからね?"
        },
        {
          "speechId": 472,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2336609,
          "sourceEndMs": 2339530,
          "text": "わかるんだから覚悟決めや"
        },
        {
          "speechId": 473,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2340530,
          "sourceEndMs": 2342711,
          "text": "シマシカさん?"
        },
        {
          "speechId": 474,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2342711,
          "sourceEndMs": 2345052,
          "text": "さよなら?"
        },
        {
          "speechId": 475,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2345052,
          "sourceEndMs": 2346832,
          "text": "耐えすぎ!"
        },
        {
          "speechId": 476,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2346832,
          "sourceEndMs": 2348893,
          "text": "なぁこれ全員耐えすぎだろ!"
        },
        {
          "speechId": 477,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2348893,
          "sourceEndMs": 2350453,
          "text": "おい!"
        },
        {
          "speechId": 478,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2350453,
          "sourceEndMs": 2352334,
          "text": "なんでこうフルパなんだよずっと!"
        },
        {
          "speechId": 479,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2352334,
          "sourceEndMs": 2358736,
          "text": "おかしいだろ!"
        },
        {
          "speechId": 480,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2358736,
          "sourceEndMs": 2369880,
          "text": "さぁ、ちらりキング、んーわんわんわんわんわんわんわんわんわんみょんみょんみょんみょんみょんみょんす!"
        },
        {
          "speechId": 481,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2369880,
          "sourceEndMs": 2370000,
          "text": "つり!"
        },
        {
          "speechId": 482,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2370362,
          "sourceEndMs": 2395745,
          "text": "ってあんたそれはそれはどうかと思いますけどそれはどうかと思いますけどねスリってことはほらノアスのスターそんなにうなずくってことはあなた3枚持ってるんですね3枚持ってるってスカイトレイラさん何枚持ってるこれもうしまう嘘だと思うねあれ信じるんだふーん"
        },
        {
          "speechId": 487,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2461834,
          "sourceEndMs": 2489860,
          "text": "耐えるぅ耐えるぅ耐えるね君たち耐えるじゃんめちゃくちゃにえーキングねどれなーんまあまあまあまあまあまあかな微妙といえば微妙ヤマリン思うんだよね"
        },
        {
          "speechId": 488,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2491122,
          "sourceEndMs": 2518454,
          "text": "これ初手からやってるんほーらもう首がぐるんぐるん泳いちゃってるじゃないですか慌てちゃったのあー君は嘘が下手くそみたいえいっライアー残念だけどバレバレなんだよねー君ねもうちょっと上手にやってくれないといくらなんでもバレバレやでこれ"
        },
        {
          "speechId": 489,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2521238,
          "sourceEndMs": 2523460,
          "text": "耐えるねなんで?"
        },
        {
          "speechId": 490,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2523460,
          "sourceEndMs": 2525541,
          "text": "なんで?"
        },
        {
          "speechId": 491,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2525541,
          "sourceEndMs": 2527703,
          "text": "え?"
        },
        {
          "speechId": 492,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2527703,
          "sourceEndMs": 2533187,
          "text": "ねえ誰も死なないんだけど決着つかない?"
        },
        {
          "speechId": 493,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2533187,
          "sourceEndMs": 2540653,
          "text": "なあ俺たち朝までやるんかこれこのメンバーで朝までやろうぜってこと?"
        },
        {
          "speechId": 494,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2540653,
          "sourceEndMs": 2548399,
          "text": "乗ってんなやる気だね見よああいいめっちゃえ?"
        },
        {
          "speechId": 495,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2548399,
          "sourceEndMs": 2548779,
          "text": "強!"
        },
        {
          "speechId": 496,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2548779,
          "sourceEndMs": 2549420,
          "text": "4枚もある"
        },
        {
          "speechId": 497,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2551046,
          "sourceEndMs": 2575504,
          "text": "いやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいやいや"
        },
        {
          "speechId": 505,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2644574,
          "sourceEndMs": 2654540,
          "text": "うわっ、ライアーって言われたかったのにくそっいやいやいやいや"
        },
        {
          "speechId": 506,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2656098,
          "sourceEndMs": 2659960,
          "text": "いやいやいやtoってことはないんじゃない?"
        },
        {
          "speechId": 507,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2659960,
          "sourceEndMs": 2663162,
          "text": "のすのすさんこれどう思われます?"
        },
        {
          "speechId": 508,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2663162,
          "sourceEndMs": 2669146,
          "text": "toクイーンはちょっとないよねそれはないんじゃないの?"
        },
        {
          "speechId": 509,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2671622,
          "sourceEndMs": 2674284,
          "text": "必死さが足りないんじゃない?"
        },
        {
          "speechId": 510,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2674284,
          "sourceEndMs": 2674764,
          "text": "後ろ!"
        },
        {
          "speechId": 511,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2674764,
          "sourceEndMs": 2684430,
          "text": "いけ!"
        },
        {
          "speechId": 512,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2684430,
          "sourceEndMs": 2686932,
          "text": "死んたくない…死んたくない!"
        },
        {
          "speechId": 513,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2686932,
          "sourceEndMs": 2687992,
          "text": "マリンに生きてて欲しいよね!"
        },
        {
          "speechId": 514,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2687992,
          "sourceEndMs": 2688253,
          "text": "みんな!"
        },
        {
          "speechId": 515,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2688253,
          "sourceEndMs": 2689493,
          "text": "マリンに生きてて欲しいよね!"
        },
        {
          "speechId": 516,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2689493,
          "sourceEndMs": 2690854,
          "text": "マリンが死んじゃったらやだよね!"
        },
        {
          "speechId": 517,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2690854,
          "sourceEndMs": 2691475,
          "text": "つまらんよね!"
        },
        {
          "speechId": 518,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2691475,
          "sourceEndMs": 2692255,
          "text": "寂しいよね!"
        },
        {
          "speechId": 519,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2692255,
          "sourceEndMs": 2694256,
          "text": "耐えるんだわ!"
        },
        {
          "speechId": 520,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2694256,
          "sourceEndMs": 2694777,
          "text": "死なないよ!"
        },
        {
          "speechId": 521,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2694777,
          "sourceEndMs": 2695577,
          "text": "キマジを置いて!"
        },
        {
          "speechId": 522,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2695577,
          "sourceEndMs": 2697759,
          "text": "マリンは死んだりしない!"
        },
        {
          "speechId": 523,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2697759,
          "sourceEndMs": 2699019,
          "text": "キマジを一人にはしない!"
        },
        {
          "speechId": 524,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2699019,
          "sourceEndMs": 2699740,
          "text": "一人ではないか!"
        },
        {
          "speechId": 525,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2712903,
          "sourceEndMs": 2714463,
          "text": "2つのクイーンズ"
        },
        {
          "speechId": 526,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2730234,
          "sourceEndMs": 2758278,
          "text": "マリンは1順目は嘘つかないからわかったいやここで2枚出したら2、1、1、いやまだ微妙以下ここで、いやダイヤしてくるかも"
        },
        {
          "speechId": 527,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2761226,
          "sourceEndMs": 2776230,
          "text": "何だい?"
        },
        {
          "speechId": 528,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2776230,
          "sourceEndMs": 2777951,
          "text": "何よ?"
        },
        {
          "speechId": 529,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2777951,
          "sourceEndMs": 2786033,
          "text": "疑うの?"
        },
        {
          "speechId": 530,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2786033,
          "sourceEndMs": 2786454,
          "text": "おい、何?"
        },
        {
          "speechId": 531,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2786454,
          "sourceEndMs": 2788094,
          "text": "シマシカと相談してんのか?"
        },
        {
          "speechId": 532,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2793122,
          "sourceEndMs": 2816838,
          "text": "その態度はやれやれみたいな2枚もあるわけないよねそれともお前が嘘ついてたんかのすのす"
        },
        {
          "speechId": 533,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2820506,
          "sourceEndMs": 2848699,
          "text": "いやこいつ嘘つくからなーほんとかもしれんあのさしましかさんもさライアした方がいいと思うのすのすにちゃんとさ刺してくれないとはいこれ嘘はいちゃんと刺してくれないと困るよこれやってくれないとほーらだから当たり前のように嘘なんだからこれお別れだねのすのすさん"
        },
        {
          "speechId": 534,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2855953,
          "sourceEndMs": 2878726,
          "text": "震えとるわ震えとるわしましかさ怖い死ぬのが怖い怖いね死ぬのが一騎打ちですもんねキングかいや一騎打ちだからここは"
        },
        {
          "speechId": 535,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2883522,
          "sourceEndMs": 2884363,
          "text": "1キング2キング2キング"
        },
        {
          "speechId": 536,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2911350,
          "sourceEndMs": 2939580,
          "text": "ほーほーほーんトゥーキングなるほどなるほどなるほどねマリンも2枚出しちゃおっかなぶーかお前は嘘つきでもマリンは嘘をつかない残念でしたかっこきめーよ"
        },
        {
          "speechId": 537,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2942286,
          "sourceEndMs": 2944173,
          "text": "え?"
        },
        {
          "speechId": 538,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2944173,
          "sourceEndMs": 2946360,
          "text": "運ゲーの勝者?"
        },
        {
          "speechId": 539,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2946360,
          "sourceEndMs": 2947022,
          "text": "タエタだと?"
        },
        {
          "speechId": 540,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 2975023,
          "sourceEndMs": 2999090,
          "text": "シマシカさんとは友情が芽生えてる今お互いにさライアーって言うのはやめようだってシマシカさん嘘つかないからそしてマリンも嘘つかないお前さ"
        },
        {
          "speechId": 541,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3001086,
          "sourceEndMs": 3001887,
          "text": "なに?"
        },
        {
          "speechId": 542,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3001887,
          "sourceEndMs": 3002867,
          "text": "友達じゃない!"
        },
        {
          "speechId": 543,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3002867,
          "sourceEndMs": 3006270,
          "text": "ねえ君はもう友達じゃない!"
        },
        {
          "speechId": 544,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3006270,
          "sourceEndMs": 3007691,
          "text": "ブタコの!"
        },
        {
          "speechId": 545,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3007691,
          "sourceEndMs": 3008451,
          "text": "クソブタ!"
        },
        {
          "speechId": 546,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3008451,
          "sourceEndMs": 3011193,
          "text": "許され!"
        },
        {
          "speechId": 547,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3011193,
          "sourceEndMs": 3013255,
          "text": "ヘイヘイヘイ!"
        },
        {
          "speechId": 548,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3013255,
          "sourceEndMs": 3014776,
          "text": "どうした?"
        },
        {
          "speechId": 549,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3014776,
          "sourceEndMs": 3025623,
          "text": "マーリンはまだ生きとるけどなほね?"
        },
        {
          "speechId": 550,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3025623,
          "sourceEndMs": 3029086,
          "text": "あのさ、言っとくけどこっちの手札最強でごめん"
        },
        {
          "speechId": 551,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3030458,
          "sourceEndMs": 3032260,
          "text": "最強でごめん状態分かる?"
        },
        {
          "speechId": 552,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3032260,
          "sourceEndMs": 3058462,
          "text": "だからつまり一旦出してだね逆にあいつ全然持ってないってことじゃない?"
        },
        {
          "speechId": 553,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3063763,
          "sourceEndMs": 3089578,
          "text": "いやえありえるかありえるかいやここで2枚出したら嘘だと思うはずここで2枚出したら嘘だと思うと思うあのねこっちは無限にあるんだよエースがね無限に持って"
        },
        {
          "speechId": 554,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3093571,
          "sourceEndMs": 3119740,
          "text": "バーカ無限に持ってんだよこっちは無限やねんこっちは血で行ってよし何がダーリンだバカ勝ち勝った勝ちました嬉しい"
        },
        {
          "speechId": 555,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3121274,
          "sourceEndMs": 3149940,
          "text": "スカイドリームさんかスカイドリームさんのすのすさんみんなありがとうこれさあれ入れてみたいデビルしてみようデビルわかんないけど何もわかんないけどデビルしてみようデビルでやってみよう一回試しにわかったルールは"
        },
        {
          "speechId": 556,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3150134,
          "sourceEndMs": 3175202,
          "text": "把握したすっかり水飲みますみんな準備完了ですか行きますよデビルのがハラハラするデビルにライアーしちゃうとみんなアウトなるほどデビルにライアーしちゃうとみんなアウト"
        },
        {
          "speechId": 566,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3249350,
          "sourceEndMs": 3253312,
          "text": "何だったんだ!"
        },
        {
          "speechId": 567,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3253312,
          "sourceEndMs": 3269262,
          "text": "3話で退場するどころか1話で退場してったぞキングいや最初からマリンに向かってライアって言ってくるわけないじゃんリスナーメタ読みよ"
        },
        {
          "speechId": 568,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3270226,
          "sourceEndMs": 3299980,
          "text": "言ってこないからいきなりは初手は言ってこないんだから1話の冒頭で1話の冒頭で死んでしまった雄大に思いを馳せないかせっかく入ってきてこいつ一体なんだったんだ1秒で死んだぞあのねイルフィンさん君は信じてるさっきも真面目にプレイしてたのが見れた"
        },
        {
          "speechId": 569,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3302524,
          "sourceEndMs": 3304064,
          "text": "一旦ここで真面目に出すか"
        },
        {
          "speechId": 570,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3330060,
          "sourceEndMs": 3332601,
          "text": "んじゃちょっと持ってんじゃないの?"
        },
        {
          "speechId": 571,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3332601,
          "sourceEndMs": 3336241,
          "text": "ツーは持ってんじゃないの?"
        },
        {
          "speechId": 572,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3336241,
          "sourceEndMs": 3338722,
          "text": "イルフィンさんえ?"
        },
        {
          "speechId": 573,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3338722,
          "sourceEndMs": 3339682,
          "text": "信じるの?"
        },
        {
          "speechId": 574,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3339682,
          "sourceEndMs": 3349885,
          "text": "逆にイルフィンさん怪しいなぁどうしたの?"
        },
        {
          "speechId": 575,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3349885,
          "sourceEndMs": 3355306,
          "text": "小さく首振っちゃって自信がないんでしょう自信がないんでしょう"
        },
        {
          "speechId": 576,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3368319,
          "sourceEndMs": 3373202,
          "text": "ユーダイそっち行くよ1は冒頭で死んだユーダイと"
        },
        {
          "speechId": 577,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3390086,
          "sourceEndMs": 3397991,
          "text": "今まで死んだマリンねぇ、ないこれ?"
        },
        {
          "speechId": 578,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3397991,
          "sourceEndMs": 3415941,
          "text": "見れるあ、見れる見づらなーんでー"
        },
        {
          "speechId": 579,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3420414,
          "sourceEndMs": 3449960,
          "text": "ねえ早く決着つけてもっともっと疑えよライアーしろライアーライアーしろしろしろしろなあ何信頼関係気づいてんだよお前ら取引先じゃねえんだからライアーしてけそうそれでいいんだよあれエルフィンさん怒ってんのもしかしてマリンは"
        },
        {
          "speechId": 580,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3450142,
          "sourceEndMs": 3476566,
          "text": "悪くないよ大丈夫耐えるほら耐えしてさこんなのさ簡単には死なないよ大丈夫なんだから安心してさ言ってこう声上げてこうライアーしてこう"
        },
        {
          "speechId": 581,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3480898,
          "sourceEndMs": 3481979,
          "text": "暑!"
        },
        {
          "speechId": 582,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3481979,
          "sourceEndMs": 3501013,
          "text": "クーラーつけようこんな寒いけどねー防音の部屋にねーこうやって引きこもってるとねー暑いんだよ嘘っぽいけどねーあー嘘っぽ嘘っぽでもイルフィンさんもうマリンのことは信じてくれないんでしょ?"
        },
        {
          "speechId": 583,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3501013,
          "sourceEndMs": 3507758,
          "text": "さっき嫌な思いしたから死にかけたからもうマリンのこと信じてくれないんだこれ嘘じゃんこれ嘘"
        },
        {
          "speechId": 584,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3510418,
          "sourceEndMs": 3518022,
          "text": "これ嘘じゃんこれ嘘じゃんなんで疑わないわけ?"
        },
        {
          "speechId": 585,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3518022,
          "sourceEndMs": 3523365,
          "text": "嘘じゃんこんなんだよね?"
        },
        {
          "speechId": 586,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3523365,
          "sourceEndMs": 3526427,
          "text": "え?"
        },
        {
          "speechId": 587,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3526427,
          "sourceEndMs": 3528208,
          "text": "なんだよ!"
        },
        {
          "speechId": 588,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3528208,
          "sourceEndMs": 3532990,
          "text": "マリンが悪いってか?"
        },
        {
          "speechId": 589,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3532990,
          "sourceEndMs": 3536432,
          "text": "マリンは悪くないよね?"
        },
        {
          "speechId": 590,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3536432,
          "sourceEndMs": 3539274,
          "text": "いいじゃん生きてんだから生きてんならいいじゃん"
        },
        {
          "speechId": 591,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3555930,
          "sourceEndMs": 3566277,
          "text": "この勝負に勝った方がこの勝負に勝った方何かかけないか君たちさなんかかけてよ"
        },
        {
          "speechId": 592,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3570074,
          "sourceEndMs": 3599082,
          "text": "名前が見づらいんだよな最初のマリンの視点にマリンの視点に戻したい名前が読めねぇなんか賭けてよこの勝負すでに命賭けてるいやいやいやいや推しの命を賭ける推しの命を"
        },
        {
          "speechId": 593,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3603808,
          "sourceEndMs": 3607130,
          "text": "押しの命を懸けて戦え!"
        },
        {
          "speechId": 594,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3607130,
          "sourceEndMs": 3609432,
          "text": "押しの命を懸けて!"
        },
        {
          "speechId": 595,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3609432,
          "sourceEndMs": 3629786,
          "text": "イルフィンさん押しの命が危ないね押しの命…耐えたか船長の…船長とは限らんじゃん!"
        },
        {
          "speechId": 596,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3634286,
          "sourceEndMs": 3658398,
          "text": "言っとくけど、箱押しだったら全員死ぬからいいね推しの命かけてるねイルフィン恐れてるねそんなに推しの命が大切か?"
        },
        {
          "speechId": 597,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3662854,
          "sourceEndMs": 3685059,
          "text": "誰も死なんだろう名前から予想するか名前から誰だと思う?"
        },
        {
          "speechId": 598,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3685059,
          "sourceEndMs": 3688340,
          "text": "気持ちいい外しちゃったねイオフィ"
        },
        {
          "speechId": 599,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3690738,
          "sourceEndMs": 3693400,
          "text": "来るかな?"
        },
        {
          "speechId": 600,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3693400,
          "sourceEndMs": 3697102,
          "text": "キツネだからフブちゃん…あっ!"
        },
        {
          "speechId": 601,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3697102,
          "sourceEndMs": 3699083,
          "text": "エルフィンさん、フブちゃん、スコンブ?"
        },
        {
          "speechId": 602,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3699083,
          "sourceEndMs": 3700904,
          "text": "あぁ、違った!"
        },
        {
          "speechId": 603,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3705598,
          "sourceEndMs": 3706499,
          "text": "いやこれキツネ?"
        },
        {
          "speechId": 604,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3706499,
          "sourceEndMs": 3710145,
          "text": "違うフェニック?"
        },
        {
          "speechId": 605,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3710145,
          "sourceEndMs": 3711187,
          "text": "わかんなかった結局?"
        },
        {
          "speechId": 606,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3711187,
          "sourceEndMs": 3719840,
          "text": "気になるな気になる感じで気になる感じで終わってたじゃあ"
        },
        {
          "speechId": 607,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3724883,
          "sourceEndMs": 3749940,
          "text": "デビルで最後にもう一回やりましょう最後にもう一デビルやりましょうこれで最後にしたいと思いますきまよしこぞって参加してください準備できたかな今度は推し聞いておこう難しくないだってそのあたりで"
        },
        {
          "speechId": 608,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3750042,
          "sourceEndMs": 3750562,
          "text": "誰だれ?"
        },
        {
          "speechId": 609,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3750562,
          "sourceEndMs": 3751243,
          "text": "誰だれ?"
        },
        {
          "speechId": 610,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3751243,
          "sourceEndMs": 3752083,
          "text": "誰だれ?"
        },
        {
          "speechId": 611,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3752083,
          "sourceEndMs": 3754725,
          "text": "って聞かなきゃいけないよ大変じゃない?"
        },
        {
          "speechId": 612,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3754725,
          "sourceEndMs": 3772374,
          "text": "ちょっとうわこれあれだわ着けると寒い器用木で聞くなるほど確かにあり"
        },
        {
          "speechId": 615,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3840042,
          "sourceEndMs": 3858913,
          "text": "スイちゃんの命をかけて戦うのねスイちゃんの命ねうんうんじゃねーよかけんなスイちゃんの命ツッキさん今スイちゃんの命をかけて戦ってますじゃああとは1期生?"
        },
        {
          "speechId": 616,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3858913,
          "sourceEndMs": 3860294,
          "text": "推し1期生?"
        },
        {
          "speechId": 617,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3860294,
          "sourceEndMs": 3867959,
          "text": "残りの2人違う違う2期生違う?"
        },
        {
          "speechId": 618,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3867959,
          "sourceEndMs": 3869740,
          "text": "2期生?"
        },
        {
          "speechId": 619,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3869740,
          "sourceEndMs": 3869860,
          "text": "違う"
        },
        {
          "speechId": 620,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3870834,
          "sourceEndMs": 3873576,
          "text": "3期生!"
        },
        {
          "speechId": 621,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3873576,
          "sourceEndMs": 3874116,
          "text": "わかった!"
        },
        {
          "speechId": 622,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3874116,
          "sourceEndMs": 3875096,
          "text": "青あんどんさん!"
        },
        {
          "speechId": 623,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3875096,
          "sourceEndMs": 3877058,
          "text": "マリンでしょ!"
        },
        {
          "speechId": 624,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3877058,
          "sourceEndMs": 3880239,
          "text": "やったー!"
        },
        {
          "speechId": 625,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3880239,
          "sourceEndMs": 3883902,
          "text": "ちょっとさ、ゲーム…わかった!"
        },
        {
          "speechId": 626,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3883902,
          "sourceEndMs": 3897990,
          "text": "ここで…いや、一旦1枚出そう一旦1枚出して、後から…え、じゃあポムさんは3期でもないの?"
        },
        {
          "speechId": 627,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3897990,
          "sourceEndMs": 3898590,
          "text": "4期?"
        },
        {
          "speechId": 628,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3900562,
          "sourceEndMs": 3907166,
          "text": "ゴキホロックスなに?"
        },
        {
          "speechId": 629,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3907166,
          "sourceEndMs": 3917232,
          "text": "リグロスハコウシ海外なに?"
        },
        {
          "speechId": 630,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3917232,
          "sourceEndMs": 3917893,
          "text": "ゲマズ!"
        },
        {
          "speechId": 631,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3917893,
          "sourceEndMs": 3929980,
          "text": "ゲマズ忘れたゲマズゲマズゲマズ忘れたわかったコロネあーコロネだゲマズ忘れた違う違う忘れたマリア"
        },
        {
          "speechId": 632,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3930130,
          "sourceEndMs": 3943540,
          "text": "でもゲマズ大好きやけど1,2,3,4って言ってたらさ忘れちゃうことってあるじゃんそういうことねじゃあポムさんはコロネの命を懸けてアンワンドンさんはマリの命を懸けるわけにはいかないからペコラの命を懸けて戦おう"
        },
        {
          "speechId": 633,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3963496,
          "sourceEndMs": 3985488,
          "text": "やるのかあーツッキさん星になるんかスイちゃんの命がかかってんのにたーてぼーくはほーしーどーく耐えていくナイス耐えマリンは誰の命かけてんの?"
        },
        {
          "speechId": 634,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3985488,
          "sourceEndMs": 3985889,
          "text": "は?"
        },
        {
          "speechId": 635,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3985889,
          "sourceEndMs": 3987910,
          "text": "マリンはマリンの命かけて戦ってるでしょ今"
        },
        {
          "speechId": 636,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3992102,
          "sourceEndMs": 4016766,
          "text": "ほーんまあこんなもんだよねーねーまあまあまあ一旦ねここは一旦迷いなく出していくよ君はでもさマリンがさ好きだったね"
        },
        {
          "speechId": 637,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4021783,
          "sourceEndMs": 4048866,
          "text": "なんか質問してみるか君が出してからするわトゥー出してきたからこれさやばいよポムさんがトゥー出してんのにさツッキさん"
        },
        {
          "speechId": 638,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4054668,
          "sourceEndMs": 4067554,
          "text": "さすがに本当か?"
        },
        {
          "speechId": 639,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4067554,
          "sourceEndMs": 4068855,
          "text": "なんだいその!"
        },
        {
          "speechId": 640,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4068855,
          "sourceEndMs": 4070015,
          "text": "ポムスさん!"
        },
        {
          "speechId": 641,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4070015,
          "sourceEndMs": 4071836,
          "text": "なんですかその態度は!"
        },
        {
          "speechId": 642,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4071836,
          "sourceEndMs": 4072316,
          "text": "やれ!"
        },
        {
          "speechId": 643,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4072316,
          "sourceEndMs": 4072757,
          "text": "やれ!"
        },
        {
          "speechId": 644,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4072757,
          "sourceEndMs": 4073097,
          "text": "やれ!"
        },
        {
          "speechId": 645,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4073097,
          "sourceEndMs": 4074978,
          "text": "じゃないんだよ!"
        },
        {
          "speechId": 646,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4074978,
          "sourceEndMs": 4075418,
          "text": "やれ!"
        },
        {
          "speechId": 647,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4075418,
          "sourceEndMs": 4075678,
          "text": "やれ!"
        },
        {
          "speechId": 648,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4075678,
          "sourceEndMs": 4076598,
          "text": "じゃないんだよ!"
        },
        {
          "speechId": 649,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4076598,
          "sourceEndMs": 4077579,
          "text": "おい!"
        },
        {
          "speechId": 650,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4077579,
          "sourceEndMs": 4079180,
          "text": "んだてめえその態度は!"
        },
        {
          "speechId": 651,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4079180,
          "sourceEndMs": 4079560,
          "text": "は?"
        },
        {
          "speechId": 652,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4079560,
          "sourceEndMs": 4079940,
          "text": "お前さ!"
        },
        {
          "speechId": 653,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4080650,
          "sourceEndMs": 4081711,
          "text": "マジ殺してやる!"
        },
        {
          "speechId": 654,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4081711,
          "sourceEndMs": 4082331,
          "text": "見ろ!"
        },
        {
          "speechId": 655,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4082331,
          "sourceEndMs": 4083852,
          "text": "バカが!"
        },
        {
          "speechId": 656,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4083852,
          "sourceEndMs": 4087315,
          "text": "なぁ!"
        },
        {
          "speechId": 657,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4087315,
          "sourceEndMs": 4088696,
          "text": "マリン疑ってんじゃねぇ!"
        },
        {
          "speechId": 658,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4088696,
          "sourceEndMs": 4091498,
          "text": "マリンが好きなんじゃなかったんか!"
        },
        {
          "speechId": 659,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4091498,
          "sourceEndMs": 4092959,
          "text": "てで!"
        },
        {
          "speechId": 660,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4092959,
          "sourceEndMs": 4095621,
          "text": "何生き残ってんだよぉ!"
        },
        {
          "speechId": 661,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4095621,
          "sourceEndMs": 4100384,
          "text": "生き残んなお前はぁ!"
        },
        {
          "speechId": 662,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4100384,
          "sourceEndMs": 4108290,
          "text": "デスカード、デビルカード来ないんだけど来るのかないつか来ない"
        },
        {
          "speechId": 663,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4110042,
          "sourceEndMs": 4123746,
          "text": "ジョーカーか誰の番これ?"
        },
        {
          "speechId": 664,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4123746,
          "sourceEndMs": 4137150,
          "text": "ポムさんはさぁコロネのこっち見たコロネのさぁ好きなところはさぁどこなの?"
        },
        {
          "speechId": 665,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4137150,
          "sourceEndMs": 4137890,
          "text": "動きで表現して"
        },
        {
          "speechId": 666,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4141270,
          "sourceEndMs": 4170000,
          "text": "あーはいはいはいはい可愛いところでもさ他の女とゲーム遊んでるのはこれ浮気なんじゃないコロネスキーとしてさおいツッキさんダメだよそうやってさりげなくさおしゃべりしてるからいけると思っちゃったんだねはい通りませんそんなものはLiar"
        },
        {
          "speechId": 667,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4175846,
          "sourceEndMs": 4194062,
          "text": "アワンドンさん代わりにマリンの身代わりになってお願い代わりに死んでお願いお願いやだやだやだお願いお願いお願い大丈夫大丈夫大丈夫そう大丈夫なんだなこれが大丈夫なわけよ話は終わってないんだけどポムさんこれはさ浮気?"
        },
        {
          "speechId": 668,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4194062,
          "sourceEndMs": 4198226,
          "text": "これコロネが知ったら悲しむよ他の女と遊んでるんだって"
        },
        {
          "speechId": 669,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4208386,
          "sourceEndMs": 4209167,
          "text": "やりたい!"
        },
        {
          "speechId": 670,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4209167,
          "sourceEndMs": 4210087,
          "text": "やりたい!"
        },
        {
          "speechId": 671,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4210087,
          "sourceEndMs": 4215091,
          "text": "これやりたい!"
        },
        {
          "speechId": 672,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4215091,
          "sourceEndMs": 4229062,
          "text": "待って待って、こうしてあ、1枚でしか出さないんだうわ、出したいこれいったんこれで進んできてから進んできてから"
        },
        {
          "speechId": 673,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4230098,
          "sourceEndMs": 4237061,
          "text": "さすがにそれはないだろうというタイミングでえ?"
        },
        {
          "speechId": 674,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4237061,
          "sourceEndMs": 4239342,
          "text": "2枚?"
        },
        {
          "speechId": 675,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4239342,
          "sourceEndMs": 4251308,
          "text": "これでもう4枚出てるって計算になるよねみんなまあ一旦進めよ一旦進めよこの勝負マリンまで回して"
        },
        {
          "speechId": 676,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4264310,
          "sourceEndMs": 4270295,
          "text": "ツッキさんはさ2エース?"
        },
        {
          "speechId": 677,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4270295,
          "sourceEndMs": 4289230,
          "text": "今バニー2いっぱいエースが出てるって計算じゃんなのにエース出してるマリンのことどう思うこれ?"
        },
        {
          "speechId": 678,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4289230,
          "sourceEndMs": 4289710,
          "text": "怪しい?"
        },
        {
          "speechId": 679,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4292166,
          "sourceEndMs": 4298269,
          "text": "いや、一回さ、ライアーしてみて?"
        },
        {
          "speechId": 680,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4298269,
          "sourceEndMs": 4311096,
          "text": "いいからみんな!"
        },
        {
          "speechId": 681,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4311096,
          "sourceEndMs": 4311916,
          "text": "みんな頑張れ!"
        },
        {
          "speechId": 682,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4311916,
          "sourceEndMs": 4314197,
          "text": "生き残れ!"
        },
        {
          "speechId": 683,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4314197,
          "sourceEndMs": 4317179,
          "text": "おいおいおいおい!"
        },
        {
          "speechId": 684,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4317179,
          "sourceEndMs": 4318579,
          "text": "何本当に耐えて!"
        },
        {
          "speechId": 685,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4318579,
          "sourceEndMs": 4320000,
          "text": "全員死ぬとこでしょ!"
        },
        {
          "speechId": 686,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4326514,
          "sourceEndMs": 4346539,
          "text": "なんで全員耐えるんだよおかしいなあ2周目で出すか"
        },
        {
          "speechId": 687,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4357322,
          "sourceEndMs": 4366450,
          "text": "2キング?"
        },
        {
          "speechId": 688,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4366450,
          "sourceEndMs": 4375678,
          "text": "1キング1枚くらいは当然持っていますと3キングベッ!"
        },
        {
          "speechId": 689,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4375678,
          "sourceEndMs": 4375698,
          "text": "?"
        },
        {
          "speechId": 690,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4375678,
          "sourceEndMs": 4375698,
          "text": "?"
        },
        {
          "speechId": 691,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4383554,
          "sourceEndMs": 4409900,
          "text": "まあまあまあまあ、みんな一旦、一旦マリンまで回して一旦マリンまで回してこれはちょっと、くぅーくぅー"
        },
        {
          "speechId": 692,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4411602,
          "sourceEndMs": 4421190,
          "text": "空気読み空気読みみんな怖い?"
        },
        {
          "speechId": 693,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4421190,
          "sourceEndMs": 4423852,
          "text": "みんな一緒なら怖くないよ一味!"
        },
        {
          "speechId": 694,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4423852,
          "sourceEndMs": 4432378,
          "text": "そんな!"
        },
        {
          "speechId": 695,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4432378,
          "sourceEndMs": 4436922,
          "text": "よりによって一味が死んじゃった空気読みしてくれてたのに"
        },
        {
          "speechId": 696,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4445826,
          "sourceEndMs": 4464676,
          "text": "あそっかペコラの命ペコラさようならペコラペコラの命が尊きペコラの命がツッキさんはさスイちゃんのさどこが好きなの?"
        },
        {
          "speechId": 697,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4464676,
          "sourceEndMs": 4467517,
          "text": "歌?"
        },
        {
          "speechId": 698,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4467517,
          "sourceEndMs": 4469038,
          "text": "なんかうなずきが小さくない?"
        },
        {
          "speechId": 699,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4472619,
          "sourceEndMs": 4498470,
          "text": "愛が足りないんじゃないのドサクサに紛れてダストポムさんは浮気だよねスイちゃんはさ気にしないと思うけどさコロネは気にすると思うよなんでマリンの配信に入ってきちゃったのコロネスキーの置き手を知らないの他の女を見ちゃいけないんだよ"
        },
        {
          "speechId": 700,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4501366,
          "sourceEndMs": 4504548,
          "text": "あ、見ないようにしてんの?"
        },
        {
          "speechId": 701,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4504548,
          "sourceEndMs": 4505789,
          "text": "目をそらしてる!"
        },
        {
          "speechId": 702,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4505789,
          "sourceEndMs": 4510212,
          "text": "マリンを見ないようにしてる!"
        },
        {
          "speechId": 703,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4510212,
          "sourceEndMs": 4524421,
          "text": "見ないようにしてんだツッキさんさぁあのさぁ、思うんだけどさぁ星読みは自我を持っちゃいけないんだよ死んでね"
        },
        {
          "speechId": 704,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4541042,
          "sourceEndMs": 4559980,
          "text": "なるほどねー攻めの姿勢あんさ怪しいと思ってんのもしかしてでもさー言っとくけどさーこっちはさーコロネスキーの浮気に目を詰める"
        },
        {
          "speechId": 705,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4564807,
          "sourceEndMs": 4586514,
          "text": "コロネにコロネに言っちゃおうマリンのとこに遊びに来てたって言っちゃおう君ブロックされるんじゃないお願い死んでくないお願い耐えて耐えてLINEしちゃおうLINEしちゃおう言っちゃおう喜んでるなさては"
        },
        {
          "speechId": 706,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4590178,
          "sourceEndMs": 4619286,
          "text": "僕のことをコロさんに言ってほしいみたいなてめぇはしゃぎやがってじゃ報告しないお前を喜ばしたりしない一旦さサクサクやろうやサクサクこんな序盤でさ嘘つかんから普通に"
        },
        {
          "speechId": 707,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4623810,
          "sourceEndMs": 4649660,
          "text": "早く出して嘘だ嘘だ嘘だどんどこどーん嘘だやだ死んだくない死んだくない嫌だ嫌だ嫌だマリンが勝つのマリンが勝つのマリンしか勝たんなマリンしか勝たんな嫌だ嫌だ嫌だ死んだくない死にましーんマリンは死にましーんポムさんさああなたね"
        },
        {
          "speechId": 708,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4650218,
          "sourceEndMs": 4678522,
          "text": "今コロネの命かけてあんた戦ってんだから初手から寄ってくるかもなコロさんの命のためにねえこれさ初手なら通るっしょと思ってさやってるでしょ今これ最初なら通るっしょって思ってるでしょ"
        },
        {
          "speechId": 709,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4680854,
          "sourceEndMs": 4702166,
          "text": "通りませんよそんなのはていっほーらわかるんだからわかっちゃうんだからあーあーもう会えないねコロネにお別れいいなお別れなーに生き残ってんだよ生き残んな"
        },
        {
          "speechId": 710,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4710170,
          "sourceEndMs": 4725042,
          "text": "けどね君一人の命じゃないんだからねなるほどなコロネの命を握っているわかるかい?"
        },
        {
          "speechId": 711,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4725042,
          "sourceEndMs": 4734670,
          "text": "君が死ねば2枚ふーんコロさんの命がかかってんのに何目そらしてんの?"
        },
        {
          "speechId": 712,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4734670,
          "sourceEndMs": 4738393,
          "text": "ああ他の女を見ちゃいけないから?"
        },
        {
          "speechId": 713,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4741922,
          "sourceEndMs": 4766221,
          "text": "まあコロさんの命がかかってんのに初手から2枚も嘘をつくとは思わないかなさすがに君がさいきなり2枚も嘘をつくとは思わないそれも本当だと思うここからが本番ってことよ君のコロネの命"
        },
        {
          "speechId": 714,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4770382,
          "sourceEndMs": 4794577,
          "text": "うさんくさいうなずきだねバカだねそのうなずきライアー何嘘てめえコロネと生き残る気か殺さんと生きるな殺さんと生き残りやがったこいつ真のコロネ"
        },
        {
          "speechId": 715,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4800002,
          "sourceEndMs": 4827754,
          "text": "このデスキーですこれこのデスキーめいやーというわけでね結構叫んだんでこのくらいにしとこうかなちょっと叫んだからこのくらいにしとこうかな今日はありがとうあちょっと入ってきちゃったけど吉川さんもてるさんもちょっと今日はこれでこのくらいにしちゃいますが"
        },
        {
          "speechId": 716,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4833059,
          "sourceEndMs": 4859580,
          "text": "キチミさんもパンスト太郎もまた遊びましょう今度ねホロメント4人でやる予定があるのでぜひそちらもよろしくお願いしますお楽しみにちょっと待って画面を移動したいんだけどさ今グだってて移動できないちょっと待ってねこうして"
        },
        {
          "speechId": 717,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4860894,
          "sourceEndMs": 4884714,
          "text": "やばい、ぐちゃぐちゃ、ぐちゃぐちゃになってる画面が、画面が、画面が、画面が、画面が、画面がぐちゃぐちゃちょっと待っててねーちょっと待っててねーこれじゃなくてーこうでーえーっとこれをこうして"
        },
        {
          "speechId": 718,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4894921,
          "sourceEndMs": 4919940,
          "text": "そしてよいしょさあということでねありがとうございましたちょっと抜けてと抜けてといやー叫んじゃった結構はしゃいじゃいました楽しかったですねお疲れ様でした"
        },
        {
          "speechId": 719,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4921122,
          "sourceEndMs": 4946633,
          "text": "ようやくね引っ越しも落ち着いてきてちょっと待ってねマリンの位置が悪いこんな感じで喉がはい引っ越しもねようやく落ち着きました君たちお待たせしました本当にこれでようやく落ち着いてきたのでもうちょっとで二歩時も完全に終わりそうあとちょいで"
        },
        {
          "speechId": 720,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4950398,
          "sourceEndMs": 4977474,
          "text": "なんでねこれでいろいろできるようになると思うんでこれとチャットチャットチャットチャットチャットどこいっちゃったーこうしてこうあできましたスパチャスパチャ"
        },
        {
          "speechId": 721,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4981334,
          "sourceEndMs": 4983375,
          "text": "はいキャプボくんどうなりました?"
        },
        {
          "speechId": 722,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 4983375,
          "sourceEndMs": 5009114,
          "text": "キャプボがねちょっと映らず結局映らないままでまあだから買い替えますええホロメンは家に呼べそうまだ呼べないかなBGMないはいまだ呼べないかなもうちょっと綺麗にしないとこのレベルじゃちょっと人呼びたくないな"
        },
        {
          "speechId": 723,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5012366,
          "sourceEndMs": 5021691,
          "text": "もうちょい綺麗になったら呼びたいオープニング変わった?"
        },
        {
          "speechId": 724,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5021691,
          "sourceEndMs": 5038319,
          "text": "そう、なんかクロス制度を流すように天狗ノーズさんに作っていただきましたランボールいっぱいなのねそう、不要品が結構出て"
        },
        {
          "speechId": 729,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5101318,
          "sourceEndMs": 5129980,
          "text": "リリカにソファーあげるんだけどソファー以外にもあのマリンがゴロゴロ寝るように使ってたなんかでっかい丸いクッションみたいな寝れるクッションみたいなでっかいのがあんだけどそれも置き場がなくなっちゃって置ける部屋がなくなってそしたらちょうどねあのカナデが欲しいって言ってたからカナデにあげることにしたヨギボじゃない名前忘れちゃった"
        },
        {
          "speechId": 730,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5130034,
          "sourceEndMs": 5159366,
          "text": "あんのよなんかでっかくて眠れるやつよぎぼうではないんだけどよぎぼう的なやつ直筆もう終わりましたか直筆終わりました君たちいっぱいいっぱいいっぱい書いたんでいっぱい届くといいなとマリンも楽しみにしとりますリグロスが開始してる確かにねでもリグロスちゃんもね"
        },
        {
          "speechId": 731,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5160418,
          "sourceEndMs": 5188959,
          "text": "もう1年経ったとはいえ新人ちゃんだからねデビューしてきて引っ越しとかもしたりしてきっとねまだ落ち着いてないだろうからあげられるものはあげたいなと思いますよえっとね決まってるんだけどなんかもしちょっと先だまだちょっと先なの"
        },
        {
          "speechId": 732,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5190162,
          "sourceEndMs": 5219920,
          "text": "3くらい先だからもしなんか流れちゃったりなんかなったらなんかあれやらないんですかみたいになっちゃったら悪いから一旦言わんとくわうんでもねあのあーそのメンバーねみたいなメンバーですうんそのメンバーねって感じのおなじみだけど久々って感じの"
        },
        {
          "speechId": 733,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5220446,
          "sourceEndMs": 5226148,
          "text": "メンバーでやりますお楽しみにライブ前にやって大丈夫?"
        },
        {
          "speechId": 734,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5226148,
          "sourceEndMs": 5246654,
          "text": "あ、でもちゃんとライブのことは気遣って今日も結構叫んだから本当はまだやりたかったけどちょっと早めに終わりにしてみたのどやらないようにさあスパチャ読みをしていきますかえっと"
        },
        {
          "speechId": 735,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5250330,
          "sourceEndMs": 5279980,
          "text": "待ってねまさかのドンキホーテンドンキホーテン夏3人しかいないじゃんドンキホーテンはえーっと待ってねスパチャ画面に行きたいと思いますいやでも快適になったわ引っ越ししてなんか音とかも入らないしすごいやりやすい前はねもう外の音めっちゃ"
        },
        {
          "speechId": 736,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5289468,
          "sourceEndMs": 5290569,
          "text": "海鮮はどう?"
        },
        {
          "speechId": 737,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5290569,
          "sourceEndMs": 5308882,
          "text": "あー海鮮ね色々トラブって大変だったんですが無事解決しました業者さんにも来てもらって無事に治りました甘辛っぺお願いします甘辛っぺ5人だからねピンパータイムなくなったんでしょう?"
        },
        {
          "speechId": 738,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5310034,
          "sourceEndMs": 5329039,
          "text": "だからなんかあれよSMRとかもできるかなと部屋今ごちゃごちゃしてますからだいぶ片付いたこれ終わった後もこの後も片付けまた続きやろうって感じ結局団長からSMRのマイク買い取ったの?"
        },
        {
          "speechId": 739,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5329039,
          "sourceEndMs": 5339442,
          "text": "いや買い取ってない仮パクしてるお金払った方がいいかもしんないワイルズやろうぜモンハン?"
        },
        {
          "speechId": 740,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5340000,
          "sourceEndMs": 5349026,
          "text": "気になるねやってみたい"
        },
        {
          "speechId": 741,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5371907,
          "sourceEndMs": 5379650,
          "text": "ベノム同時賞も面白かったベノム面白かったねちょっと近日中に11月のあの3日?"
        },
        {
          "speechId": 742,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5379650,
          "sourceEndMs": 5399980,
          "text": "あれ2日だっけ映画が始まる前に見たいね同時賞やりたいな11月1日あ1日か1日かえじゃあめっちゃ"
        },
        {
          "speechId": 743,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5402754,
          "sourceEndMs": 5404695,
          "text": "あさってじゃん?"
        },
        {
          "speechId": 744,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5404695,
          "sourceEndMs": 5408138,
          "text": "あさってじゃん?"
        },
        {
          "speechId": 745,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5408138,
          "sourceEndMs": 5411220,
          "text": "ウェルズ配信見たい?"
        },
        {
          "speechId": 746,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5411220,
          "sourceEndMs": 5428613,
          "text": "やるかモンハンやってみるか一味にゃん君たちと共に明日は新人さんと配信そうなんですよ君たちちょっと早くその話もねしたい早くその話もしたいな"
        },
        {
          "speechId": 747,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5434707,
          "sourceEndMs": 5459820,
          "text": "船長武器何にするえー何がいいんだろうわかんないなワルズキャラクリめっちゃよくなってるそうなんだ気になりますね武器2本持ってるえーそうなんだ弓が使いやすいそうなの遠距離いいななんか"
        },
        {
          "speechId": 750,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5521274,
          "sourceEndMs": 5549900,
          "text": "ゲーム本体は動いてんだけどキャポポが固まっちゃって画面が映らなくなるみたいなことが多々あってまあもう壊れ始めてたんだと思うかなりうん接触不力そうなのなんかね緩くて差し口がいろんなUSBで試してみたんだけどどれ挿しても緩いから多分本体が緩んでてちょっと触ると抜けちゃうみたいな"
        },
        {
          "speechId": 751,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5550642,
          "sourceEndMs": 5557326,
          "text": "こういう感じで寿命かもしれない船長と一緒で寿命?"
        },
        {
          "speechId": 752,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5557326,
          "sourceEndMs": 5564330,
          "text": "いや船長は寿命じゃねーよ賞味期限とか言われることあるけど寿命と言われることはある?"
        },
        {
          "speechId": 753,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5564330,
          "sourceEndMs": 5579920,
          "text": "ごめんちょっと三色三十六さん途中だったすいません脱線しちゃってここ最近食欲がないというお話でしたがその後退場はいかがでしょうかありがとうございます船長の美しい上向き一杯が減ったら悲しいですから"
        },
        {
          "speechId": 756,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5640458,
          "sourceEndMs": 5666212,
          "text": "もう明日見た方がいいか明日のあれかな明日はメンゲーしようかなベノムラストダンス見ようかな明日はえっとあの言ってた新人さんとのコラボ配信配信?"
        },
        {
          "speechId": 757,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5666212,
          "sourceEndMs": 5668593,
          "text": "コラボ動画?"
        },
        {
          "speechId": 758,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5668593,
          "sourceEndMs": 5669454,
          "text": "公式で出るやつ?"
        },
        {
          "speechId": 759,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5671794,
          "sourceEndMs": 5685340,
          "text": "誰と被らない時間だったらできるどれ見ればいいの?"
        },
        {
          "speechId": 760,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5685340,
          "sourceEndMs": 5688102,
          "text": "3、3に出てくるの?"
        },
        {
          "speechId": 761,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5688102,
          "sourceEndMs": 5696506,
          "text": "三部作の最後、やべえよ無理じゃん無理じゃんそれ無理やんもう"
        },
        {
          "speechId": 762,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5708050,
          "sourceEndMs": 5729900,
          "text": "いきなりスリー見るのって邪道かな邪道なんだろうか詳しい人いないかなマリン全然知らない"
        },
        {
          "speechId": 763,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5730280,
          "sourceEndMs": 5748912,
          "text": "いきなり3見ても理解できるんだろうかまぁ一旦ちょっと悩み中3からでも構わない?"
        },
        {
          "speechId": 764,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5748912,
          "sourceEndMs": 5754835,
          "text": "ちょっとちょっと悩み中悩み中です一旦悩み中ということで一つよろしくお願いします"
        },
        {
          "speechId": 769,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5824162,
          "sourceEndMs": 5828325,
          "text": "ライブ二次…あ、そうか!"
        },
        {
          "speechId": 770,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5828325,
          "sourceEndMs": 5849800,
          "text": "そうなんだなるほど把握しましたえーっと投落の祈願とソロライブの成功祈願に"
        },
        {
          "speechId": 771,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5850000,
          "sourceEndMs": 5858022,
          "text": "神宮さんへ参拝に行ってきましたところで今日はハロウィンですね今日ってハロウィンなの?"
        },
        {
          "speechId": 772,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5858022,
          "sourceEndMs": 5878446,
          "text": "明日ハロウィンじゃん明日ハロウィンなんですけどほぼスルーしてたけどハロウィンじゃん何も考えてなかったハロウィン?"
        },
        {
          "speechId": 773,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5878446,
          "sourceEndMs": 5878726,
          "text": "しまった"
        },
        {
          "speechId": 777,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5941162,
          "sourceEndMs": 5969820,
          "text": "あ、さあ船長さあ何かやってる最中でもさあ違うことが気になったらそれやり始めちゃうんだよねこれやばいよねなんか最近さあ引っ越しがあってさあ片付けてるんだけど最中にそうだあれやらないとって思ったらやり始めるからあっちこっちで30%だけ進んだものが大量にあってでぐるぐる回りながら一つずつ片付けていくのうんでもね結局全部片付けてる"
        },
        {
          "speechId": 778,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5970002,
          "sourceEndMs": 5992736,
          "text": "片付けよう1個ずつ片付けていくあ、そうだあれもこれもってやってるうちに1個ずつ片付いていって一応全部片付けはするの綺麗にはなるんだけどやりかけでいろんなことやり始めちゃう困ったもんですえ、なんか無意識にまた服脱いでたけど寒い気をこうしてと"
        },
        {
          "speechId": 785,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 6120290,
          "sourceEndMs": 6143698,
          "text": "老日当選もありがとう先日誕生日を迎えたのでぜひロリマリンちゃんにお祝いしてもらいたいです名前はゆうくんでお願いしますネットリテラシーが突然の詩いきますゆうくんお誕生日おめでとうゆうくんはマリンタンのこと好きなの?"
        },
        {
          "speechId": 786,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 6143698,
          "sourceEndMs": 6149100,
          "text": "久々にマリンタンだよ"
        },
        {
          "speechId": 787,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 6153714,
          "sourceEndMs": 6179780,
          "text": "ハッピーバースデートゥーユーだよーえー村くんもありがとうございますこういうゲームなので船長苦手かなと思いましたが自分で撃ってないから平気でしたねあーもう船長が人を撃つのが苦手なんだと思ってる人がいるかもしれませんがなんか船長が嫌なのは"
        },
        {
          "speechId": 788,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 6181301,
          "sourceEndMs": 6209302,
          "text": "善良な人間を殺すことねうんあのさっきは嘘つきなリスナーを称してただけだからうん何も悪いことしてない善良な市民を殺すのが無理なのかわいそうじゃんえっと"
        },
        {
          "speechId": 789,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 6210714,
          "sourceEndMs": 6239074,
          "text": "26日に誕生日でしたお、お誕生日おめでとうございました良い一年になりますようにお、そしてソロライブ現状1日だけの1日目だけの片パイ状態ということで26日にも大募集1人を頼みましたが当たる気が全くしません当たるよー当たるよ絶対当たると思う当たってほしい"
        },
        {
          "speechId": 790,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 6241826,
          "sourceEndMs": 6269980,
          "text": "当たりますように君が来ますようにありがとうえっとくるみーさんありがとうございますえっと今日36の誕生日に迎えましたおめでとうございます去年はバイオハザードのアンジーのモノマネでバースデーソングを歌っていただきました今年は何か新作のモノマネでお祝いの言葉をいただけない"
        },
        {
          "speechId": 791,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 6270002,
          "sourceEndMs": 6275625,
          "text": "なんだろ、なんのモノマネする?"
        },
        {
          "speechId": 792,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 6275625,
          "sourceEndMs": 6276946,
          "text": "じゃあみさとさんね"
        },
        {
          "speechId": 793,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 6300002,
          "sourceEndMs": 6317632,
          "text": "ありがとうございます公開紙のものなのですが前回の乗船で新たに機関長一味に新たに機関長一味に引き入れることができた機関長一味に引き入れたってこと?"
        },
        {
          "speechId": 794,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 6317632,
          "sourceEndMs": 6326557,
          "text": "これで地球上にある船と呼ばれるものは全て運航可能ですすごーかっこよー"
        },
        {
          "speechId": 795,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 6330890,
          "sourceEndMs": 6359920,
          "text": "嬉しいはいえっと栄えある宝鐘海賊団機関乗組員に加えてもらえないでしょうかいやむしろ君君以外の一味は何もできないから君だけが頼りですもはやありがとうございます現地チケット1時は全落ちましたので2時にかけますもし嬉しければ当たるように祈っていただけますでしょうか当たりますように"
        },
        {
          "speechId": 803,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 6540022,
          "sourceEndMs": 6567790,
          "text": "勝者が一味から出るかも前に船長の可愛さと曜日の関係性を調査しましたが今回は船長の可愛さと時間の関連性を調査しました調査の結果0から6時可愛い6時から12時可愛い12時から18時えマジか可愛い18時から23時え待って可愛い24時ほわー待って可愛いの申し子なんと24時間可愛いという結果に"
        },
        {
          "speechId": 804,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 6572355,
          "sourceEndMs": 6599202,
          "text": "意味不明ですたぶんね働きすぎでおかしくなってるねこれありがとうございますいつもえー道具係のガルードありがとうございますライブチケット当たれー当たるー絶対当たるー早く君たちに会いたいなライブまで頑張っていこうな君たち"
        },
        {
          "speechId": 836,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7382519,
          "sourceEndMs": 7406422,
          "text": "君のお料理食べてみたいなそしてお誕生日おめでとうございました良い一年になりますようにこもれびなつトマトさんありがとうございます美魔女モデルの圧の表情がすごく好きなのでドアップで圧かけてくださいませんかいいですよこんくらいかなちょっと待ってこれ消そう"
        },
        {
          "speechId": 837,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7410514,
          "sourceEndMs": 7410634,
          "text": "しか!"
        },
        {
          "speechId": 838,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7410634,
          "sourceEndMs": 7422063,
          "text": "こんなもんくらえ!"
        },
        {
          "speechId": 839,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7422063,
          "sourceEndMs": 7428528,
          "text": "マリンの圧をくらえ!"
        },
        {
          "speechId": 840,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7428528,
          "sourceEndMs": 7435834,
          "text": "くらってる?"
        },
        {
          "speechId": 841,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7435834,
          "sourceEndMs": 7436334,
          "text": "おい!"
        },
        {
          "speechId": 842,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7441326,
          "sourceEndMs": 7444588,
          "text": "食べてやろうか!"
        },
        {
          "speechId": 843,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7444588,
          "sourceEndMs": 7446729,
          "text": "ハオッ!"
        },
        {
          "speechId": 844,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7446729,
          "sourceEndMs": 7452712,
          "text": "どう?"
        },
        {
          "speechId": 845,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7452712,
          "sourceEndMs": 7459975,
          "text": "えーっとコウジナオさんありがとうございます!"
        },
        {
          "speechId": 846,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7459975,
          "sourceEndMs": 7462136,
          "text": "300万人記念物今日届きました!"
        },
        {
          "speechId": 847,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7462136,
          "sourceEndMs": 7462416,
          "text": "おー!"
        },
        {
          "speechId": 848,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7462416,
          "sourceEndMs": 7462837,
          "text": "届いた!"
        },
        {
          "speechId": 849,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7462837,
          "sourceEndMs": 7463677,
          "text": "やったー!"
        },
        {
          "speechId": 850,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7463677,
          "sourceEndMs": 7465618,
          "text": "くまりぬいぐるみかわいすぎ!"
        },
        {
          "speechId": 851,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7465618,
          "sourceEndMs": 7468079,
          "text": "かわいいでしょー!"
        },
        {
          "speechId": 852,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7468079,
          "sourceEndMs": 7469920,
          "text": "赤ちゃんなのよ!"
        },
        {
          "speechId": 853,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7470340,
          "sourceEndMs": 7478846,
          "text": "あれ、フィナイルさんは結局誰をしかわかんないで終わってって"
        },
        {
          "speechId": 857,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7564394,
          "sourceEndMs": 7588374,
          "text": "そんな何かしちゃったかなごめんね自覚ないや自分ではそんな誘ってるつもりないんだけどなよいしょとそんなとこですかね"
        },
        {
          "speechId": 858,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7590080,
          "sourceEndMs": 7619762,
          "text": "よしってなわけでありがとうございましたまた明日もなんかやろうと思うのでお会いしましょうそれではこの後マリンお掃除頑張るので気持ち応援よろしく明日そっかハロウィンなんだないたずらいたずらいたずらいたずらASMR"
        },
        {
          "speechId": 859,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7621014,
          "sourceEndMs": 7636601,
          "text": "いたずらASMRいたずらって何すればいいと思う?"
        },
        {
          "speechId": 860,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7636601,
          "sourceEndMs": 7638201,
          "text": "俺らに聞くの?"
        },
        {
          "speechId": 861,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7638201,
          "sourceEndMs": 7648866,
          "text": "ちょっと自信ないわかんない"
        },
        {
          "speechId": 862,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7650758,
          "sourceEndMs": 7655273,
          "text": "それでは行きますよ出航"
        },
        {
          "speechId": 863,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 7680118,
          "sourceEndMs": 7690081,
          "text": "そういうめんどくさいのも含めて愛してくれるってねえねえ言ったよね言ってないふーんそういうこと言うんだちなみにこの船では美少女無罪が適用されますけど任せて"
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
