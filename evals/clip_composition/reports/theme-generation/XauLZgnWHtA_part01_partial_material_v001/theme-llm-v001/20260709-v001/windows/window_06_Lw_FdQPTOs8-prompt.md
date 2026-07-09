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
    "applied": true,
    "mode": "speech-time",
    "windowId": "window_06_Lw_FdQPTOs8",
    "reason": "未分割入力でEdgeレンダラが高負荷化して戻らなかったため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 340000,
    "overlapMs": 180000,
    "sourceVideoId": "Lw_FdQPTOs8",
    "sourceStartMs": 65460,
    "sourceEndMs": 4930460
  },
  "sources": [
    {
      "sourceVideoId": "Lw_FdQPTOs8",
      "sourceUrl": "https://www.youtube.com/live/Lw_FdQPTOs8?feature=share",
      "transcriptKind": "youtube_auto_caption",
      "language": "ja",
      "rawSegmentCount": 5974,
      "promptSegmentCount": 410,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 1,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 65460,
          "sourceEndMs": 69020,
          "text": "皆さんごきげんよう"
        },
        {
          "speechId": 2,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 70220,
          "sourceEndMs": 73760,
          "text": "ごきげんよう"
        },
        {
          "speechId": 3,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 74119,
          "sourceEndMs": 84920,
          "text": "リオンです[笑い]皆様ごきげんようごきげんよう"
        },
        {
          "speechId": 4,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 86159,
          "sourceEndMs": 89060,
          "text": "何食べてるんですか"
        },
        {
          "speechId": 5,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 89880,
          "sourceEndMs": 116280,
          "text": "チョコレート食べた食べた[笑い]はいお邪魔しておりますはいということで本日はジョイコンも2人で分けてマリオメーカーをクリアしていこうというねはい紙企画神神さっき言われてた別にジョイコンわけなくてもクリアできなさそうやめました超"
        },
        {
          "speechId": 6,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 117840,
          "sourceEndMs": 120320,
          "text": "遠回したに言われ"
        },
        {
          "speechId": 7,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 121040,
          "sourceEndMs": 141180,
          "text": "私がコントローラー盗んじゃってたあーなるほどね和風コラボになっておりますでまぁ一旦どっちやりたい多分ダッシュジャンプどっちですか[音楽]"
        },
        {
          "speechId": 8,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 141860,
          "sourceEndMs": 145760,
          "text": "買った方が移動"
        },
        {
          "speechId": 9,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 147080,
          "sourceEndMs": 166280,
          "text": "よかったよかったマイジャンプでプレーンが私が移動ID入れてください開けてですねあのリスナーさんが作ってくださいましたありがとうみんなめっちゃいいコースだったよ"
        },
        {
          "speechId": 10,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 166700,
          "sourceEndMs": 190560,
          "text": "なんか寝ちゃうんだよな今日寝てるなーい笑ってくれないかもそう一通りねちょっとやらせてもらったんですけどみんなめっちゃいいコースでで今回できなかったものに関してはあの我々のプレイスキルがカスだったというあの1人でやってみてクリアできなかったものに関してはあの"
        },
        {
          "speechId": 11,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 191040,
          "sourceEndMs": 197300,
          "text": "そう今回やっても多分もうテント張ることになるやろう"
        },
        {
          "speechId": 12,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 201900,
          "sourceEndMs": 207420,
          "text": "ジャンプちなみにこのステージはハカチ先輩私"
        },
        {
          "speechId": 13,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 209099,
          "sourceEndMs": 214099,
          "text": "が出たのにさっきやったの"
        },
        {
          "speechId": 14,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 215720,
          "sourceEndMs": 220040,
          "text": "このままで押してたのに"
        },
        {
          "speechId": 15,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 237920,
          "sourceEndMs": 253930,
          "text": "行きますか私が移動です私がジャンプですジャンプでも走るボタンを押さなきゃいけないですからね行きますよはい行きますよ[音楽][笑い]"
        },
        {
          "speechId": 16,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 256120,
          "sourceEndMs": 259290,
          "text": "[音楽]"
        },
        {
          "speechId": 17,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 260269,
          "sourceEndMs": 263338,
          "text": "[拍手]"
        },
        {
          "speechId": 18,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 266440,
          "sourceEndMs": 276980,
          "text": "[音楽][笑い][音楽]"
        },
        {
          "speechId": 19,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 277520,
          "sourceEndMs": 283520,
          "text": "はいはいうまいうまい"
        },
        {
          "speechId": 20,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 284000,
          "sourceEndMs": 296379,
          "text": "でください不用意なさい[音楽][笑い][音楽]"
        },
        {
          "speechId": 21,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 303080,
          "sourceEndMs": 314380,
          "text": "タイミングはいでも今は上手い上手いはいはいはい[音楽]"
        },
        {
          "speechId": 22,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 314759,
          "sourceEndMs": 317000,
          "text": "よいしょ"
        },
        {
          "speechId": 23,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 317360,
          "sourceEndMs": 320459,
          "text": "[拍手]"
        },
        {
          "speechId": 24,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 324979,
          "sourceEndMs": 331340,
          "text": "上手い上手い上手い上手い上手いこの手に超簡単だからな"
        },
        {
          "speechId": 25,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 332580,
          "sourceEndMs": 336560,
          "text": "私じゃない何もしないでください"
        },
        {
          "speechId": 26,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 336960,
          "sourceEndMs": 344039,
          "text": "走らなくてもいいです絶対走らなきゃいけないここでさっき"
        },
        {
          "speechId": 27,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 345539,
          "sourceEndMs": 347600,
          "text": "見て"
        },
        {
          "speechId": 28,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 347740,
          "sourceEndMs": 352460,
          "text": "[音楽]鉄棒"
        },
        {
          "speechId": 29,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 354000,
          "sourceEndMs": 367440,
          "text": "とりあえずダッシュ押すと行きそうですねこっからます[音楽][笑い]"
        },
        {
          "speechId": 30,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 367850,
          "sourceEndMs": 374950,
          "text": "[音楽][笑い]"
        },
        {
          "speechId": 31,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 376930,
          "sourceEndMs": 380129,
          "text": "[音楽]"
        },
        {
          "speechId": 32,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 382199,
          "sourceEndMs": 384620,
          "text": "滑ったって"
        },
        {
          "speechId": 33,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 386180,
          "sourceEndMs": 389720,
          "text": "うまいうまいうまいうまい"
        },
        {
          "speechId": 34,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 390600,
          "sourceEndMs": 394160,
          "text": "交換しないうんうん"
        },
        {
          "speechId": 35,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 397039,
          "sourceEndMs": 401000,
          "text": "ほぼほぼ終わったら走ります"
        },
        {
          "speechId": 36,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 405780,
          "sourceEndMs": 414420,
          "text": "[笑い]"
        },
        {
          "speechId": 37,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 417550,
          "sourceEndMs": 421600,
          "text": "[笑い]"
        },
        {
          "speechId": 38,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 425760,
          "sourceEndMs": 428860,
          "text": "[音楽]"
        },
        {
          "speechId": 39,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 430560,
          "sourceEndMs": 433560,
          "text": "いや"
        },
        {
          "speechId": 40,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 434490,
          "sourceEndMs": 454460,
          "text": "[笑い][音楽][拍手][音楽]めっちゃいいコースやなめっちゃいいめっちゃいい子じゃない博士先輩でちょうどギリギリクリアできるめっちゃいいコース"
        },
        {
          "speechId": 41,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 456000,
          "sourceEndMs": 464660,
          "text": "めっちゃいいクロちゃんなありがとうございますいいね春風さんいいね"
        },
        {
          "speechId": 42,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 466080,
          "sourceEndMs": 494900,
          "text": "意外とイケてる意外とねって言われてる練習として優秀すぎるそれまで本当に本当にちょっとあげるかいやわかんないですよね私さっきのステージもしかしたら博士先輩が異動だったらもうちょっとかかってたんないじゃかなっていう立証されてるんですけどそんなことはないって信じてますじゃあ次どっちにしようかなこれにするか"
        },
        {
          "speechId": 43,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 498539,
          "sourceEndMs": 526640,
          "text": "これのこれのさっきおにぎり食べたんですよねうんたらこのおにぎり食べたたらこって辛い方すか明太子じゃないやつ明太子が辛い私たらこのおにぎり買ってきてってマネージャーさんに言ったけどさ私昨日の晩御飯たらこパスタやわからこの生活たらこ生活"
        },
        {
          "speechId": 44,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 526920,
          "sourceEndMs": 539779,
          "text": "ジャンプ移動すっかOK本当にいけるわ本当に本当に行きますかじゃあ移動とジャンプ交代ではいしはい表情お願います"
        },
        {
          "speechId": 45,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 541760,
          "sourceEndMs": 550220,
          "text": "お化け屋敷のエレベーターカイカイカイは何だ元がのあったかな"
        },
        {
          "speechId": 46,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 551650,
          "sourceEndMs": 556420,
          "text": "[笑い]"
        },
        {
          "speechId": 47,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 557360,
          "sourceEndMs": 560779,
          "text": "水の中で"
        },
        {
          "speechId": 48,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 565940,
          "sourceEndMs": 574110,
          "text": "まだ大丈夫まだ大丈夫まだ大丈夫真ん中[音楽]"
        },
        {
          "speechId": 49,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 574320,
          "sourceEndMs": 577580,
          "text": "怖い怖い怖い怖い怖い怖い怖い怖い"
        },
        {
          "speechId": 50,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 583930,
          "sourceEndMs": 589240,
          "text": "[音楽][拍手]"
        },
        {
          "speechId": 51,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 590000,
          "sourceEndMs": 598820,
          "text": "トゲでどんどん減らさせていくのすごいな絶対に殺すという苦しめて殺す"
        },
        {
          "speechId": 52,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 598980,
          "sourceEndMs": 601459,
          "text": "遊びじゃないんですよ"
        },
        {
          "speechId": 53,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 601590,
          "sourceEndMs": 610820,
          "text": "[拍手]遊びじゃない人生か人生か俺がめっちゃ良かった"
        },
        {
          "speechId": 54,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 612959,
          "sourceEndMs": 623180,
          "text": "隣でね泣いててさでも正直すげーいい映画だと思ったんだけどさ泣く場所どこなんだろうって思いながらフレンドことめっちゃの泣いたに"
        },
        {
          "speechId": 55,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 625740,
          "sourceEndMs": 630019,
          "text": "ギリギリを攻めたんですけどマリオをバカにするから"
        },
        {
          "speechId": 56,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 632160,
          "sourceEndMs": 638480,
          "text": "移動できるようにギリギリの集めたんですラストたってシーン普通に泣い"
        },
        {
          "speechId": 57,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 638880,
          "sourceEndMs": 664820,
          "text": "めっちゃ良かったマジでみんな見てほしいはい自分の配信で一生マリオ宣伝してる私映画いや本当に見た方がいいってこういうのでいいんだよ広報腕組って感じだったでもなんかフレンとかさ私とはにじさんじ見てる人はやっぱマリオカートともか触れてきてるから見てるだけでもあこれだってなるしねいやそう割とめっちゃ良かったたなマリカのシーン本当に良かっ"
        },
        {
          "speechId": 58,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 667880,
          "sourceEndMs": 677420,
          "text": "あーなるほど潰されたんだ[音楽]動か私ないぞは"
        },
        {
          "speechId": 59,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 685140,
          "sourceEndMs": 693340,
          "text": "行かない[音楽]"
        },
        {
          "speechId": 60,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 694160,
          "sourceEndMs": 703320,
          "text": "動かないってわかって止まってきた直前でそんなことあるんだその"
        },
        {
          "speechId": 61,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 703680,
          "sourceEndMs": 713360,
          "text": "態度はダメですよそのなんか私右手だけで余裕だわみたいな持ち方良くないですか"
        },
        {
          "speechId": 62,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 713540,
          "sourceEndMs": 725820,
          "text": "やってください学校に力込めるか[音楽]"
        },
        {
          "speechId": 63,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 726320,
          "sourceEndMs": 742549,
          "text": "ここでしょ押したらすぐ移動してください[音楽]こっちに糸来たいよねもうあそうですね[音楽]"
        },
        {
          "speechId": 64,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 743060,
          "sourceEndMs": 746660,
          "text": "無傷なんだよなこれ"
        },
        {
          "speechId": 65,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 747720,
          "sourceEndMs": 751950,
          "text": "[音楽][笑い][音楽]"
        },
        {
          "speechId": 66,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 753550,
          "sourceEndMs": 758470,
          "text": "[笑い]"
        },
        {
          "speechId": 67,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 761959,
          "sourceEndMs": 764959,
          "text": "やめて"
        },
        {
          "speechId": 68,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 765890,
          "sourceEndMs": 769769,
          "text": "[音楽]"
        },
        {
          "speechId": 69,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 774380,
          "sourceEndMs": 780260,
          "text": "よしよしよしよしうまい起きてたこれはいいか"
        },
        {
          "speechId": 70,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 780300,
          "sourceEndMs": 783440,
          "text": "すごい奇跡起きてた"
        },
        {
          "speechId": 71,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 791040,
          "sourceEndMs": 800119,
          "text": "うまいうまいうまいうまいなんだあいつら骨投げてくんだよもういいだろ許しくれてよ[音楽]"
        },
        {
          "speechId": 72,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 801710,
          "sourceEndMs": 806540,
          "text": "[笑い]"
        },
        {
          "speechId": 73,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 809420,
          "sourceEndMs": 816560,
          "text": "来るな来るな来るな来るなあーこれどうすんだこれ"
        },
        {
          "speechId": 74,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 817200,
          "sourceEndMs": 822320,
          "text": "でもいいのかなでもこっからだから確かに"
        },
        {
          "speechId": 75,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 826840,
          "sourceEndMs": 833299,
          "text": "[笑い][拍手]"
        },
        {
          "speechId": 76,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 835220,
          "sourceEndMs": 859579,
          "text": "連携もねやったばっかだからここからここからここからワインここからファインか何だっけあの薬局お世話になってます案件待ってます案件待ってます最近なんか違うとクラブじゃなかったあそうなんだ[音楽]いや私動いてないけど"
        },
        {
          "speechId": 77,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 859940,
          "sourceEndMs": 863360,
          "text": "動いて欲しかった"
        },
        {
          "speechId": 78,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 863960,
          "sourceEndMs": 868929,
          "text": "[笑い][音楽]"
        },
        {
          "speechId": 79,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 870060,
          "sourceEndMs": 874100,
          "text": "危ない危ない危ない危ない"
        },
        {
          "speechId": 80,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 874740,
          "sourceEndMs": 878100,
          "text": "行けるさ"
        },
        {
          "speechId": 81,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 880199,
          "sourceEndMs": 887440,
          "text": "テレサはいっちゃん来いテレサのモノマネしていいですか[音楽]"
        },
        {
          "speechId": 82,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 890770,
          "sourceEndMs": 893830,
          "text": "[音楽]"
        },
        {
          "speechId": 83,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 897780,
          "sourceEndMs": 906090,
          "text": "[笑い]"
        },
        {
          "speechId": 84,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 908339,
          "sourceEndMs": 911339,
          "text": "うろうろ"
        },
        {
          "speechId": 85,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 912610,
          "sourceEndMs": 920000,
          "text": "[笑い]殺し言ってくるっててた"
        },
        {
          "speechId": 86,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 923870,
          "sourceEndMs": 936590,
          "text": "[拍手]咳出る[笑い][拍手]"
        },
        {
          "speechId": 87,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 938959,
          "sourceEndMs": 946579,
          "text": "ですよはいじゃあ飲みながらだけど"
        },
        {
          "speechId": 88,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 949220,
          "sourceEndMs": 964680,
          "text": "大丈夫か笑いすぎた落ち着いて落ち着く落ち着いて剥がす先輩ならできるそうやそう[笑い]"
        },
        {
          "speechId": 89,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 965120,
          "sourceEndMs": 969079,
          "text": "ナイスまだいける"
        },
        {
          "speechId": 90,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 971230,
          "sourceEndMs": 975360,
          "text": "[笑い]"
        },
        {
          "speechId": 91,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 978019,
          "sourceEndMs": 986839,
          "text": "まだ死ぬのを待つだけ受け入れてたよもうもうここで終わりなんだって"
        },
        {
          "speechId": 92,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 988560,
          "sourceEndMs": 1003279,
          "text": "終わった人生諦めてた[拍手][音楽]はいはいはいナイスはいナイスここまでスムーズうんだいぶねこっからこっここからから"
        },
        {
          "speechId": 93,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1005540,
          "sourceEndMs": 1014320,
          "text": "面白いジャンプする時が入っていますじゃあはいじゃあ違う違う違う違う"
        },
        {
          "speechId": 94,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1014480,
          "sourceEndMs": 1017440,
          "text": "移動は入らないですよね"
        },
        {
          "speechId": 95,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1039140,
          "sourceEndMs": 1042280,
          "text": "うまいうまいうまい"
        },
        {
          "speechId": 96,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1044299,
          "sourceEndMs": 1057100,
          "text": "ラスト上から降ってくるからそれだけ照れちゃうね上から降ってくるいやこっち嫌いなんだよな"
        },
        {
          "speechId": 97,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1058390,
          "sourceEndMs": 1066340,
          "text": "[音楽]さっきそのあれだったからじゃないかな"
        },
        {
          "speechId": 98,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1067160,
          "sourceEndMs": 1070360,
          "text": "場所悪かったね"
        },
        {
          "speechId": 99,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1088420,
          "sourceEndMs": 1094200,
          "text": "[音楽][笑い]"
        },
        {
          "speechId": 100,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1097150,
          "sourceEndMs": 1105690,
          "text": "[音楽]"
        },
        {
          "speechId": 101,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1112700,
          "sourceEndMs": 1124840,
          "text": "守れなかったでもねめっちゃいけそうなのあるあるあると思う"
        },
        {
          "speechId": 102,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1125320,
          "sourceEndMs": 1129340,
          "text": "かもしれない"
        },
        {
          "speechId": 103,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1130880,
          "sourceEndMs": 1137970,
          "text": "[笑い]"
        },
        {
          "speechId": 104,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1143919,
          "sourceEndMs": 1149080,
          "text": "マリオもこの顔よずっとこの顔です"
        },
        {
          "speechId": 105,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1151100,
          "sourceEndMs": 1158440,
          "text": "昔からこれなんだからだいぶ何も変わらないんだからはいはい"
        },
        {
          "speechId": 106,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1158900,
          "sourceEndMs": 1168099,
          "text": "いやこれはしゃーないいやでもそれもさ重い[音楽]"
        },
        {
          "speechId": 107,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1169600,
          "sourceEndMs": 1175249,
          "text": "なんで[音楽]"
        },
        {
          "speechId": 108,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1181780,
          "sourceEndMs": 1193290,
          "text": "次本気出したこれね今まで本気じゃなかったんですか何を渡しと遊びだったの[笑い]"
        },
        {
          "speechId": 109,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1196600,
          "sourceEndMs": 1206720,
          "text": "うんうん次に逮捕するジャンプジャンプここもドゥンジャンケジャンOK"
        },
        {
          "speechId": 110,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1210020,
          "sourceEndMs": 1212980,
          "text": "これならいけそう"
        },
        {
          "speechId": 111,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1213679,
          "sourceEndMs": 1218260,
          "text": "よテニスみたいに真ん中に戻る"
        },
        {
          "speechId": 112,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1223039,
          "sourceEndMs": 1235940,
          "text": "めっちゃめちゃうまいうまいうまいうまいうまいうまいここでこっち向いててテレサ君がこっち見てこないからそしてこうしこうてしてカメック来る来る"
        },
        {
          "speechId": 113,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1238100,
          "sourceEndMs": 1241100,
          "text": "うわ"
        },
        {
          "speechId": 114,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1242120,
          "sourceEndMs": 1244539,
          "text": "ーうわ"
        },
        {
          "speechId": 115,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1245780,
          "sourceEndMs": 1252660,
          "text": "ーいやそれはいける[音楽]"
        },
        {
          "speechId": 116,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1259500,
          "sourceEndMs": 1264500,
          "text": "[拍手]ナイス"
        },
        {
          "speechId": 117,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1264919,
          "sourceEndMs": 1278870,
          "text": "めっちゃいいステージちょうどいいの偉いって書いてたんだなえらいよしこれもいいね押しとくかいいね[音楽][笑い]"
        },
        {
          "speechId": 118,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1280940,
          "sourceEndMs": 1284200,
          "text": "結構順調なのかも"
        },
        {
          "speechId": 119,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1289539,
          "sourceEndMs": 1302620,
          "text": "自分の功績だと思う絶対今の顔はちょっと待ってめっちゃいいちょうどいいでもまあまあ次じゃあこれにしましょう"
        },
        {
          "speechId": 120,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1309799,
          "sourceEndMs": 1328659,
          "text": "徐々に難易度上げてく感じでねうん難しいステージもやりたいですよね[笑い]次私が移動行きますかOKじゃあ私ジャンプか答えて"
        },
        {
          "speechId": 121,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1329360,
          "sourceEndMs": 1345990,
          "text": "ジャンプどのボタンだっけジャンプBがay私がYもジャンプいけますAかBハカフレチャレンジいけるでなんか墓にフレー入ったみたいな[笑い]"
        },
        {
          "speechId": 122,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1348380,
          "sourceEndMs": 1350380,
          "text": "勢い"
        },
        {
          "speechId": 123,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1357280,
          "sourceEndMs": 1382900,
          "text": "動いてくる敵に対していや動かないで今私トスかナイスじゃああっち行けちょっと一回待ちますねはい[音楽]うまいうまいうまいうまいいきますよ[音楽]"
        },
        {
          "speechId": 124,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1391480,
          "sourceEndMs": 1421480,
          "text": "うまいうまいうまいいきますよよしようまいうまいうまいうまいうまいうますぎてびっくりしてる[音楽]ここここからワイをしてください[音楽]はいはい"
        },
        {
          "speechId": 125,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1421720,
          "sourceEndMs": 1425520,
          "text": "[笑い]"
        },
        {
          "speechId": 126,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1426330,
          "sourceEndMs": 1467059,
          "text": "[音楽][笑い]行きます[笑い][音楽]はいはいはいはいはいまだ取り返しつくから取り返ししかないから行きますはい行きますはい上手い上手い行きますようまいよ行きますはいうまいいきます多分"
        },
        {
          "speechId": 127,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1471799,
          "sourceEndMs": 1475000,
          "text": "息あーなるほどね"
        },
        {
          "speechId": 128,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1475340,
          "sourceEndMs": 1499600,
          "text": "[笑い]私のタイミングだった[拍手][音楽]私がジャンプしないことに始まらないわそうなんですよ[音楽]私があって言ったらOkGoogle"
        },
        {
          "speechId": 129,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1503840,
          "sourceEndMs": 1506950,
          "text": "[音楽]"
        },
        {
          "speechId": 130,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1508850,
          "sourceEndMs": 1518850,
          "text": "[笑い][拍手][笑い]"
        },
        {
          "speechId": 131,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1521500,
          "sourceEndMs": 1531919,
          "text": "落ちとるんよはい行きます[音楽]"
        },
        {
          "speechId": 132,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1533970,
          "sourceEndMs": 1542900,
          "text": "[音楽][笑い]"
        },
        {
          "speechId": 133,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1546440,
          "sourceEndMs": 1554839,
          "text": "[音楽][笑い][拍手]"
        },
        {
          "speechId": 134,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1560130,
          "sourceEndMs": 1577360,
          "text": "[音楽]上手い上手い上手い[音楽]いけるうまい毎日私だ行きます"
        },
        {
          "speechId": 135,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1578540,
          "sourceEndMs": 1581829,
          "text": "[拍手]"
        },
        {
          "speechId": 136,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1585090,
          "sourceEndMs": 1589300,
          "text": "[笑い]"
        },
        {
          "speechId": 137,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1596260,
          "sourceEndMs": 1601840,
          "text": "いただきましたここ走るか"
        },
        {
          "speechId": 138,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1605200,
          "sourceEndMs": 1613530,
          "text": "下のが楽そうどうなんやろう[音楽]"
        },
        {
          "speechId": 139,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1614799,
          "sourceEndMs": 1627720,
          "text": "まだまだ始まったばかり[笑い]"
        },
        {
          "speechId": 140,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1628779,
          "sourceEndMs": 1631960,
          "text": "おます願いし"
        },
        {
          "speechId": 141,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1633220,
          "sourceEndMs": 1646659,
          "text": "こっからこれかさ入れ替わりむずいもこれの方いいがかこれさこの入れ替わりね確かにむずいあ"
        },
        {
          "speechId": 142,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1647059,
          "sourceEndMs": 1663340,
          "text": "行けるか行ける行けますでもなんかいるなうわぁむずいこれ移動しか使わないから楽かもしれないもしか確かしたらに私がね今年が楽だ"
        },
        {
          "speechId": 143,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1671980,
          "sourceEndMs": 1678260,
          "text": "こっちダメなんだジャンプできますナイス"
        },
        {
          "speechId": 144,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1678620,
          "sourceEndMs": 1692740,
          "text": "あダメだ上ルートかないやでも上もまあジャンプしないといけないからねどうなの下今のいけそうでした行けると思うよ行けるかな固定します"
        },
        {
          "speechId": 145,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1698910,
          "sourceEndMs": 1702069,
          "text": "[音楽]"
        },
        {
          "speechId": 146,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1712040,
          "sourceEndMs": 1716570,
          "text": "[笑い]"
        },
        {
          "speechId": 147,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1718419,
          "sourceEndMs": 1722559,
          "text": "見てよお茶飲んで"
        },
        {
          "speechId": 148,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1733240,
          "sourceEndMs": 1736419,
          "text": "そんなに"
        },
        {
          "speechId": 149,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1740659,
          "sourceEndMs": 1752860,
          "text": "これ多分こういっても無理よナイスナイスナイス"
        },
        {
          "speechId": 150,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1753520,
          "sourceEndMs": 1756580,
          "text": "よね"
        },
        {
          "speechId": 151,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1767260,
          "sourceEndMs": 1777399,
          "text": "一歩進んで2歩下がるよしよしこうしてこうしてこうして笑うじゃないですか"
        },
        {
          "speechId": 152,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1785179,
          "sourceEndMs": 1790840,
          "text": "行けると思うねんけどな待ってまだ見えた"
        },
        {
          "speechId": 153,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1792919,
          "sourceEndMs": 1796039,
          "text": "危ないか"
        },
        {
          "speechId": 154,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1796460,
          "sourceEndMs": 1801820,
          "text": "むずい上行くか上行ってみますか"
        },
        {
          "speechId": 155,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1802299,
          "sourceEndMs": 1817360,
          "text": "どうなんだろう行けるのかなうーん[音楽]今確実に行ける行けるやれのかあ無理かもっててる私も上田よ気がするんだな"
        },
        {
          "speechId": 156,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1818360,
          "sourceEndMs": 1829120,
          "text": "下がフェイクの説なんか下の方が簡単だから下行こうやって言って下に行くの見殺されてる気がするじゃあねこれはこのままちょっと待って"
        },
        {
          "speechId": 157,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1829340,
          "sourceEndMs": 1850899,
          "text": "はいあータイミングタイミングこれは炎が悪いうんうんそれは本当にそうだってこんなとこに炎がある意味がわからないじゃんマリオがかわいそうもうこれ完全にマリオに全然覆してるよね今のクッパに行っときたいマリオがかわいそうだよってね"
        },
        {
          "speechId": 158,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1854419,
          "sourceEndMs": 1865869,
          "text": "作者ですどっちでも行けます上の方がむずいですマジマジか下めっちゃまずそうだったけどな[音楽]"
        },
        {
          "speechId": 159,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1866960,
          "sourceEndMs": 1871779,
          "text": "いいだじゃんからここでここ"
        },
        {
          "speechId": 160,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1873320,
          "sourceEndMs": 1876640,
          "text": "かと思ったよ"
        },
        {
          "speechId": 161,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1885430,
          "sourceEndMs": 1888559,
          "text": "[音楽]"
        },
        {
          "speechId": 162,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1922270,
          "sourceEndMs": 1934760,
          "text": "[笑い][音楽][笑い][拍手][音楽]"
        },
        {
          "speechId": 163,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1939399,
          "sourceEndMs": 1949720,
          "text": "無敵時間に端まで行けばよかった確かに無敵時間マジで利用できますよね無敵時間ってね"
        },
        {
          "speechId": 164,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1951260,
          "sourceEndMs": 1954279,
          "text": "マリなオって何なんだろう"
        },
        {
          "speechId": 165,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1955039,
          "sourceEndMs": 1962559,
          "text": "はい入ってここでアイテムを取って[音楽]罠だっよたりしない"
        },
        {
          "speechId": 166,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1965840,
          "sourceEndMs": 1968840,
          "text": "ナイス"
        },
        {
          "speechId": 167,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1972420,
          "sourceEndMs": 1977710,
          "text": "[笑い]"
        },
        {
          "speechId": 168,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1977779,
          "sourceEndMs": 1984100,
          "text": "でもこれこれはこれでさ確かにむずいねむずいですね"
        },
        {
          "speechId": 169,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1984510,
          "sourceEndMs": 1999519,
          "text": "[音楽]下の方が簡単でなんでそんなこと言うの上の方が簡単かもしれないじゃん作った人が言う嫌がらせやろなぁ作ってくれてありがとうねありがとうね"
        },
        {
          "speechId": 170,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 1999559,
          "sourceEndMs": 2004140,
          "text": "いいステージじゃんやるじゃん"
        },
        {
          "speechId": 171,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2007179,
          "sourceEndMs": 2021820,
          "text": "今ジャンプジャンプよし次ボーってきて右行ってこう来てナイスナイス"
        },
        {
          "speechId": 172,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2024840,
          "sourceEndMs": 2032399,
          "text": "こっからめっちゃ重そうなんだよなあの長い棒のとこどうやって行くんだろう"
        },
        {
          "speechId": 173,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2036480,
          "sourceEndMs": 2047460,
          "text": "でかいかもしれないもしかしたら最後よのやつちょっと長いんだなここん笑ってるだろう"
        },
        {
          "speechId": 174,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2055859,
          "sourceEndMs": 2065800,
          "text": "3つ重なったなるほどそういう意味の笑顔かここにスターあるよの笑いかあれなるほど"
        },
        {
          "speechId": 175,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2066220,
          "sourceEndMs": 2072960,
          "text": "あんな綺麗に取れないことあるんだあんなにに反発してんの時差嫌わてれたの"
        },
        {
          "speechId": 176,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2074919,
          "sourceEndMs": 2077220,
          "text": "ぼーっとたして"
        },
        {
          "speechId": 177,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2079480,
          "sourceEndMs": 2082740,
          "text": "今日なんかちょっとボートしてます"
        },
        {
          "speechId": 178,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2083859,
          "sourceEndMs": 2086280,
          "text": "眠くはないんだけど"
        },
        {
          "speechId": 179,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2086760,
          "sourceEndMs": 2089869,
          "text": "[音楽]"
        },
        {
          "speechId": 180,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2097800,
          "sourceEndMs": 2101760,
          "text": "全部それでは通らないです"
        },
        {
          "speechId": 181,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2104040,
          "sourceEndMs": 2107820,
          "text": "できないんで気をつけてくださいね"
        },
        {
          "speechId": 182,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2107870,
          "sourceEndMs": 2115770,
          "text": "[笑い]"
        },
        {
          "speechId": 183,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2119560,
          "sourceEndMs": 2123180,
          "text": "気にをつけて絶対餌"
        },
        {
          "speechId": 184,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2125920,
          "sourceEndMs": 2140109,
          "text": "すると思うんだけど行ける[音楽]"
        },
        {
          "speechId": 185,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2140940,
          "sourceEndMs": 2148020,
          "text": "左上なんかありますよ取れるんかなそれやらせますこれ"
        },
        {
          "speechId": 186,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2152160,
          "sourceEndMs": 2156160,
          "text": "ナイスチャレンジ"
        },
        {
          "speechId": 187,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2158560,
          "sourceEndMs": 2160859,
          "text": "いける"
        },
        {
          "speechId": 188,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2161720,
          "sourceEndMs": 2171339,
          "text": "[音楽]でもなんかきっと取ったらスペシャルなことが起こるんだろういやさすがに何かないとおかしいはい"
        },
        {
          "speechId": 189,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2178200,
          "sourceEndMs": 2182880,
          "text": "やめて下ろして戻して"
        },
        {
          "speechId": 190,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2187420,
          "sourceEndMs": 2190420,
          "text": "よ"
        },
        {
          "speechId": 191,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2198020,
          "sourceEndMs": 2201840,
          "text": "[笑い]"
        },
        {
          "speechId": 192,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2205839,
          "sourceEndMs": 2212460,
          "text": "まだここからだからこれキノコ取るのだるいんでやめましょう"
        },
        {
          "speechId": 193,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2213760,
          "sourceEndMs": 2227880,
          "text": "欲しいなって顔してるよいいの多分取るのに2時間ぐらいかかるからねうん[音楽]ね行きます"
        },
        {
          "speechId": 194,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2228480,
          "sourceEndMs": 2235740,
          "text": "よしよしよしよしよしよしいけるいけるいけるいける"
        },
        {
          "speechId": 195,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2251460,
          "sourceEndMs": 2268619,
          "text": "[笑い][拍手]これまずいねむずいタイミングがねタイミングがね消して先輩がどうとかではなくねうんそうよ"
        },
        {
          "speechId": 196,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2269180,
          "sourceEndMs": 2277280,
          "text": "[音楽]はいはいはいはい[音楽]"
        },
        {
          "speechId": 197,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2277359,
          "sourceEndMs": 2285660,
          "text": "いやどうなんやろうどうなんだろうちょっと待ってもっかえるかもう一回やりましょう"
        },
        {
          "speechId": 198,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2286900,
          "sourceEndMs": 2291600,
          "text": "登れる気がするな確かに[音楽]"
        },
        {
          "speechId": 199,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2292480,
          "sourceEndMs": 2295260,
          "text": "行きますはい"
        },
        {
          "speechId": 200,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2296160,
          "sourceEndMs": 2317099,
          "text": "私が悪かったか私がいや私が[音楽]それはそれで[笑い][拍手][音楽]私が悪かった"
        },
        {
          "speechId": 201,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2317619,
          "sourceEndMs": 2324000,
          "text": "公開しますかやってみるかやってますか私移動しますはい"
        },
        {
          "speechId": 202,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2325720,
          "sourceEndMs": 2333480,
          "text": "これ大砲来た時気をつけてくださいね必要とされます動かないです"
        },
        {
          "speechId": 203,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2333750,
          "sourceEndMs": 2337039,
          "text": "[音楽]"
        },
        {
          "speechId": 204,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2337060,
          "sourceEndMs": 2348780,
          "text": "行くよ難しいですよ私が先に歩き始めたタイミングでそうだね"
        },
        {
          "speechId": 205,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2350079,
          "sourceEndMs": 2354839,
          "text": "むずいこれ絶妙にムズイ"
        },
        {
          "speechId": 206,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2356560,
          "sourceEndMs": 2366469,
          "text": "おおいいねいきますはい惜しい[音楽]"
        },
        {
          "speechId": 207,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2368760,
          "sourceEndMs": 2382740,
          "text": "いけるいけるいけるなんか見えてはいるそうよ光しか見えてないうん[音楽]いきよます"
        },
        {
          "speechId": 208,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2384440,
          "sourceEndMs": 2387519,
          "text": "[音楽]"
        },
        {
          "speechId": 209,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2388720,
          "sourceEndMs": 2393839,
          "text": "難しいちゃんと難しいぞ"
        },
        {
          "speechId": 210,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2394240,
          "sourceEndMs": 2398099,
          "text": "はいはいはいはい"
        },
        {
          "speechId": 211,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2398500,
          "sourceEndMs": 2405900,
          "text": "ジョイコンを開けるだけでこんな難しいのねこれ移動するからなおさらいきます"
        },
        {
          "speechId": 212,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2410339,
          "sourceEndMs": 2418800,
          "text": "こっちのがまだ光ある気がする[笑い]まだいける気がするまだありそううん"
        },
        {
          "speechId": 213,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2418900,
          "sourceEndMs": 2421079,
          "text": "うん"
        },
        {
          "speechId": 214,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2421140,
          "sourceEndMs": 2430260,
          "text": "はいうまい[音楽]これでもうラスボスやろ伸びきってから行きますはい"
        },
        {
          "speechId": 215,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2433859,
          "sourceEndMs": 2443160,
          "text": "なんか一人でやってもできないかもしれない[音楽]自分から言ったの"
        },
        {
          "speechId": 216,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2446800,
          "sourceEndMs": 2454540,
          "text": "先輩が一人でできないステージは多分2人じゃできないですからね行きますか"
        },
        {
          "speechId": 217,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2465100,
          "sourceEndMs": 2479160,
          "text": "[笑い]ほらマリオも喜んでる本当だまだ入れます本当だ言っている"
        },
        {
          "speechId": 218,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2479280,
          "sourceEndMs": 2495599,
          "text": "行きますよしよしよしよしよしよしよしよしよし大丈夫大丈夫中からちょっと待って私からも私も泣く"
        },
        {
          "speechId": 219,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2497020,
          "sourceEndMs": 2501660,
          "text": "[音楽]違う違う違う"
        },
        {
          "speechId": 220,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2505130,
          "sourceEndMs": 2515280,
          "text": "[音楽]ファインプレーナイスナイス介護ファインプレーだった行きますはい行きますはいはい"
        },
        {
          "speechId": 221,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2515619,
          "sourceEndMs": 2522960,
          "text": "行きましょう[音楽]それはやりすぎだね"
        },
        {
          "speechId": 222,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2530910,
          "sourceEndMs": 2537930,
          "text": "[笑い]"
        },
        {
          "speechId": 223,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2539619,
          "sourceEndMs": 2545040,
          "text": "はいたまに頑張るんだよなそうマリオちょっとちゃうたまに頑張っから"
        },
        {
          "speechId": 224,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2550500,
          "sourceEndMs": 2554700,
          "text": "いきます光しか見えない"
        },
        {
          "speechId": 225,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2556720,
          "sourceEndMs": 2560520,
          "text": "はいいや俺ちょっとさトゲ増えてたよね"
        },
        {
          "speechId": 226,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2564400,
          "sourceEndMs": 2574680,
          "text": "びっくりしたなんか前までマリオの鼻先ぐらいまでしかなかったなんか自まつげだったのがマスカラついたみたいな"
        },
        {
          "speechId": 227,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2577380,
          "sourceEndMs": 2582679,
          "text": "行きますよ[拍手]"
        },
        {
          "speechId": 228,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2596630,
          "sourceEndMs": 2599709,
          "text": "[音楽]"
        },
        {
          "speechId": 229,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2602460,
          "sourceEndMs": 2613020,
          "text": "[音楽]ナイスナイスナイス多分落ちてくるからブロックが多分上に来ると思うんですよね"
        },
        {
          "speechId": 230,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2620130,
          "sourceEndMs": 2624530,
          "text": "[音楽]"
        },
        {
          "speechId": 231,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2629320,
          "sourceEndMs": 2633500,
          "text": "[笑い]"
        },
        {
          "speechId": 232,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2640090,
          "sourceEndMs": 2643219,
          "text": "[音楽]"
        },
        {
          "speechId": 233,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2648480,
          "sourceEndMs": 2651780,
          "text": "つけてたから"
        },
        {
          "speechId": 234,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2658080,
          "sourceEndMs": 2673200,
          "text": "[音楽]行きますよはいはいはいはいここでもさ慣れたらさできるようになってるからはいねそうですよね"
        },
        {
          "speechId": 235,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2677579,
          "sourceEndMs": 2700680,
          "text": "そうです慣れたらできるからこっちだってさそうだよ慣れてきてるから[音楽]かわいすぎます死ぬには可愛すぎる行きますあーごめんなさいごめんなさい死ぬには可愛い"
        },
        {
          "speechId": 236,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2701760,
          "sourceEndMs": 2715440,
          "text": "私もあのマインドで生きてるキノピオの僕たち可愛いのでが良かった良かったすごい良かったねあのマインドで人は生きたら幸せときっと"
        },
        {
          "speechId": 237,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2716220,
          "sourceEndMs": 2723240,
          "text": "はいそれOK行きますはい[音楽]いいぞ言ってます"
        },
        {
          "speechId": 238,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2723880,
          "sourceEndMs": 2730010,
          "text": "大砲ですって炎上消さないよね[音楽]"
        },
        {
          "speechId": 239,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2732100,
          "sourceEndMs": 2736190,
          "text": "[笑い]"
        },
        {
          "speechId": 240,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2736680,
          "sourceEndMs": 2754680,
          "text": "BB押したんですけどもちょっと遅かった時あるからBをしても俺は飛ばねえぞって反骨精神[音楽]って何"
        },
        {
          "speechId": 241,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2756819,
          "sourceEndMs": 2762420,
          "text": "先輩知ってるちゃんとしてください"
        },
        {
          "speechId": 242,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2766380,
          "sourceEndMs": 2770040,
          "text": "しっかりしてもらわないと"
        },
        {
          "speechId": 243,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2773640,
          "sourceEndMs": 2779760,
          "text": "行きますはいはいナイスナイス行きます"
        },
        {
          "speechId": 244,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2780790,
          "sourceEndMs": 2783829,
          "text": "[音楽]"
        },
        {
          "speechId": 245,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2786400,
          "sourceEndMs": 2795359,
          "text": "缶コーヒーて何パンとコーヒーパンにはコーヒーが合うよねって結局そうなのいきますはい"
        },
        {
          "speechId": 246,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2795480,
          "sourceEndMs": 2820740,
          "text": "ポスターです本当に今本当に今きっとカメラがカチンという音を拾ったはずですカメラじゃないマイクその場合はこの場合のあれのあれであれしとくかなあれのあれでマイクの前でさカチカチするわ行きます"
        },
        {
          "speechId": 247,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2822240,
          "sourceEndMs": 2831839,
          "text": "ねみんなもわかったでしょタイミングがずれたのが音でさ音でわかったでしょ"
        },
        {
          "speechId": 248,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2841540,
          "sourceEndMs": 2843900,
          "text": "行きます"
        },
        {
          "speechId": 249,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2847690,
          "sourceEndMs": 2850709,
          "text": "[音楽]"
        },
        {
          "speechId": 250,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2860830,
          "sourceEndMs": 2865810,
          "text": "[音楽]"
        },
        {
          "speechId": 251,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2872400,
          "sourceEndMs": 2880599,
          "text": "なんかちゃんと移動がむずい方とジャンプがむずいほうで分けられてる気がするねうん"
        },
        {
          "speechId": 252,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2882540,
          "sourceEndMs": 2895720,
          "text": "こっちずとは移動の方がむい思うよ[音楽]行きますはいはいはいはい上手い行きますはいおいおいうまいいきますうまい"
        },
        {
          "speechId": 253,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2900220,
          "sourceEndMs": 2909839,
          "text": "成長してるぞこっからがあのジャンプが難しいいける行きますはいうまい"
        },
        {
          "speechId": 254,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2916420,
          "sourceEndMs": 2929520,
          "text": "はいあーフラワーがこれこうしてやばいな[音楽]"
        },
        {
          "speechId": 255,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2929819,
          "sourceEndMs": 2934680,
          "text": "ナイス行けますもう1回あーあーあー"
        },
        {
          "speechId": 256,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2937839,
          "sourceEndMs": 2955560,
          "text": "惜しいちょっともう一回あとあの大量にチョコレート買ってきてもらったから確かに頭をね1回この私の顔普通に戻して喜び私の顔と思ってた気がするけど"
        },
        {
          "speechId": 257,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2957460,
          "sourceEndMs": 2962040,
          "text": "あワンちゃんネコちゃんふれちゃん"
        },
        {
          "speechId": 258,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2963119,
          "sourceEndMs": 2967380,
          "text": "ワンちゃん猫ちゃんふるちゃん増えちゃん"
        },
        {
          "speechId": 259,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2968200,
          "sourceEndMs": 2979140,
          "text": "今日ワンチャンネコちゃんふれちゃんふーちゃんですですこれかなんですこれはクランキーチョコ"
        },
        {
          "speechId": 260,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2980800,
          "sourceEndMs": 2985680,
          "text": "美味しそうGクリスピーチョコレート"
        },
        {
          "speechId": 261,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2985780,
          "sourceEndMs": 2988380,
          "text": "チョコラットって書いてある"
        },
        {
          "speechId": 262,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2988960,
          "sourceEndMs": 2998760,
          "text": "チョコラップチョコラット[音楽]チョコラットです[音楽]こうかも"
        },
        {
          "speechId": 263,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 2999780,
          "sourceEndMs": 3004859,
          "text": "Gラットクリスピーチョコ"
        },
        {
          "speechId": 264,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3008119,
          "sourceEndMs": 3034140,
          "text": "グルグルグルグルドッカーンそれワンワンななんだよ[音楽]最近さぁまた久しぶりにさあ証拠お姉さんの絵描き歌見ちゃってさやばいやつスプーンめっちゃおもろいですよねめっちゃ好きあるめっちゃて元気たなんか"
        },
        {
          "speechId": 265,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3036060,
          "sourceEndMs": 3046040,
          "text": "何だろうああいうのってタイトルで割となんか[音楽]すごいの来るんだろうなってさせてるのに行きます"
        },
        {
          "speechId": 266,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3049220,
          "sourceEndMs": 3060260,
          "text": "お兄さんが常に半笑いなのめっちゃ面白い確実にやばいの書いてるって察してるお兄さんがめっちゃ思う"
        },
        {
          "speechId": 267,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3060300,
          "sourceEndMs": 3064940,
          "text": "でもお姉さんめちゃくちゃハイスペックなんだよなね"
        },
        {
          "speechId": 268,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3065660,
          "sourceEndMs": 3071480,
          "text": "行きますはいはい行きます"
        },
        {
          "speechId": 269,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3073790,
          "sourceEndMs": 3076929,
          "text": "[拍手]"
        },
        {
          "speechId": 270,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3078610,
          "sourceEndMs": 3093859,
          "text": "[音楽]シャドーボクシングしてるあいついきますはいはいはいはいはいはいはいいやここまで飛ぶの聞いてないんだよな"
        },
        {
          "speechId": 271,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3095460,
          "sourceEndMs": 3100700,
          "text": "ナイス取りたい取りたいとりあえずジャブジャブ"
        },
        {
          "speechId": 272,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3104160,
          "sourceEndMs": 3117140,
          "text": "ナイス[音楽]行きますはいはい[音楽]いける"
        },
        {
          "speechId": 273,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3118280,
          "sourceEndMs": 3121520,
          "text": "やばいここ"
        },
        {
          "speechId": 274,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3122660,
          "sourceEndMs": 3134660,
          "text": "さっきみたい行きますはいはいはい行きますはい怖いはいはいはい"
        },
        {
          "speechId": 275,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3134839,
          "sourceEndMs": 3139770,
          "text": "行きますはい[音楽]"
        },
        {
          "speechId": 276,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3145650,
          "sourceEndMs": 3148719,
          "text": "[音楽]"
        },
        {
          "speechId": 277,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3152480,
          "sourceEndMs": 3155599,
          "text": "えでも"
        },
        {
          "speechId": 278,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3156359,
          "sourceEndMs": 3195500,
          "text": "これ怖い[音楽]助けて走っていやいやジャンプお願いします[音楽][笑い]痛い"
        },
        {
          "speechId": 279,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3198300,
          "sourceEndMs": 3202199,
          "text": "イヤー[音楽]"
        },
        {
          "speechId": 280,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3202800,
          "sourceEndMs": 3207980,
          "text": "めっちゃ達成があるビクビクするやばいやばい"
        },
        {
          "speechId": 281,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3225059,
          "sourceEndMs": 3235400,
          "text": "めっちゃしんどかったもんねあれうんいやーいいコースだったナイスです"
        },
        {
          "speechId": 282,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3235520,
          "sourceEndMs": 3247339,
          "text": "どうしますかなんかやりますラストなんかあのーほぼオートコースってのがありましたよえ何それ面白そう"
        },
        {
          "speechId": 283,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3248460,
          "sourceEndMs": 3255319,
          "text": "それかめちゃくちゃいいステージステージだっただったなぁ"
        },
        {
          "speechId": 284,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3264119,
          "sourceEndMs": 3277760,
          "text": "先輩がずっとお茶に手を伸ばしてるのがチラチラ見えてワンジャンプはいって言うために手がちゃっ伸びたとながら思いまた絵を押してた"
        },
        {
          "speechId": 285,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3278420,
          "sourceEndMs": 3303079,
          "text": "ことすごい多くて最近人にめっちゃ指摘されるのは同じ話めっちゃされるみたいないう話じゃなくてでなんか1回もうなんか本当にマジ自分初見のつもりだったんだけどその4回目って言われたことあるヤバけどすぎみたいな私言わないんです2回思っ目聞いてるなっててること"
        },
        {
          "speechId": 286,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3304680,
          "sourceEndMs": 3327980,
          "text": "聞いたなって思いながらそう言われるためにね言ったよって言うんだけどね別に2回目でも楽しく聞けるなって思いながら絶対初めて喋りましたみたいなテンションで喋ってくるから言えないって言われて聞いてとか言って聞いてあのさあ何々なんねっだよて聞いたなって思いながらあそうなんですね"
        },
        {
          "speechId": 287,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3330180,
          "sourceEndMs": 3345619,
          "text": "やばすぎいやでも全然普通に楽しく聞けるからいいんよですやめて本当に3回目来たら言いますじゃん2回目はニコニコ聞いておきたい"
        },
        {
          "speechId": 288,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3349220,
          "sourceEndMs": 3356480,
          "text": "どっちにしようさっきどうだったからし答えますか私がジャンプにします"
        },
        {
          "speechId": 289,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3357980,
          "sourceEndMs": 3361230,
          "text": "[音楽]"
        },
        {
          "speechId": 290,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3368130,
          "sourceEndMs": 3379180,
          "text": "[音楽][笑い]"
        },
        {
          "speechId": 291,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3380490,
          "sourceEndMs": 3386059,
          "text": "[拍手]完全によジェットコースだったね"
        },
        {
          "speechId": 292,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3396400,
          "sourceEndMs": 3401480,
          "text": "[音楽]やめてよ"
        },
        {
          "speechId": 293,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3406339,
          "sourceEndMs": 3411980,
          "text": "死んじゃった命って大事だよ"
        },
        {
          "speechId": 294,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3412210,
          "sourceEndMs": 3421760,
          "text": "[音楽]見てもらって左だったもっともっともっともっともっと"
        },
        {
          "speechId": 295,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3423619,
          "sourceEndMs": 3428119,
          "text": "左右行きます"
        },
        {
          "speechId": 296,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3430930,
          "sourceEndMs": 3442760,
          "text": "[音楽]めっちゃ気持ちいいジェットコースター乗って帰りますみたいな[笑い][音楽]"
        },
        {
          "speechId": 297,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3442800,
          "sourceEndMs": 3446000,
          "text": "いいのコースやった"
        },
        {
          "speechId": 298,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3446819,
          "sourceEndMs": 3451819,
          "text": "1分かかった人いるんやこれ確かに"
        },
        {
          "speechId": 299,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3452599,
          "sourceEndMs": 3456680,
          "text": "私ことが賢いって"
        },
        {
          "speechId": 300,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3457380,
          "sourceEndMs": 3464420,
          "text": "[拍手]これてるって言われるんよね"
        },
        {
          "speechId": 301,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3468460,
          "sourceEndMs": 3471610,
          "text": "[笑い]"
        },
        {
          "speechId": 302,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3479000,
          "sourceEndMs": 3503839,
          "text": "見えないんだからやめてください下の方見えないんだから私がこの下げてる左上でもしかしたら教えていただいてるかもしれないと思われちゃう[笑い]セルフケツ叩きをしていた可能性があるすごいな人の前でやるんだ相当相当執念あるよ"
        },
        {
          "speechId": 303,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3505099,
          "sourceEndMs": 3522740,
          "text": "なんか難しいステージをなんか疲れ果てるまでやりますやるいやあるいやでもなんか一応ピックアップしてたのこれでいやこれだけやったんやけどちょっと待ってね"
        },
        {
          "speechId": 304,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3526140,
          "sourceEndMs": 3546980,
          "text": "確かやってるはずでえーとどれいやでもなんか難しかったような気もするな難しかったんですねよ博士先輩が一人でクリアできないステージは除外したからそうなんだよなぁできるかどうかもちゃんと見てなかったんだけど全部ステージ"
        },
        {
          "speechId": 305,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3548059,
          "sourceEndMs": 3551299,
          "text": "ちょっと待ってよ"
        },
        {
          "speechId": 306,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3557040,
          "sourceEndMs": 3565280,
          "text": "やってますかこれ多分ねあのーこれだったと思うあはいはいはい"
        },
        {
          "speechId": 307,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3565440,
          "sourceEndMs": 3570380,
          "text": "えっとこれで"
        },
        {
          "speechId": 308,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3571079,
          "sourceEndMs": 3582680,
          "text": "いろいろねめっちゃ色々みんながステージ作ってくれててありがたいありがたいやです博士ができるかは怪しかったちょっと違うの"
        },
        {
          "speechId": 309,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3584900,
          "sourceEndMs": 3589760,
          "text": "9だね9の"
        },
        {
          "speechId": 310,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3592619,
          "sourceEndMs": 3596960,
          "text": "はいはいはいはい"
        },
        {
          "speechId": 311,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3597180,
          "sourceEndMs": 3599839,
          "text": "ナイス"
        },
        {
          "speechId": 312,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3600059,
          "sourceEndMs": 3607579,
          "text": "ファンですスパチャ受け取ってくださいとのことでねいいのもらえますか"
        },
        {
          "speechId": 313,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3613579,
          "sourceEndMs": 3617000,
          "text": "よろしくお願いします"
        },
        {
          "speechId": 314,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3617460,
          "sourceEndMs": 3620960,
          "text": "コインを400枚以上取ってから"
        },
        {
          "speechId": 315,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3622079,
          "sourceEndMs": 3625579,
          "text": "余裕だわ[音楽]"
        },
        {
          "speechId": 316,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3625920,
          "sourceEndMs": 3628339,
          "text": "ありがとう"
        },
        {
          "speechId": 317,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3631560,
          "sourceEndMs": 3637699,
          "text": "[笑い][音楽]"
        },
        {
          "speechId": 318,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3640500,
          "sourceEndMs": 3648450,
          "text": "ナイス108円だったでここじゃん[音楽]"
        },
        {
          "speechId": 319,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3651680,
          "sourceEndMs": 3655640,
          "text": "もらうだけもらって落ちてった"
        },
        {
          "speechId": 320,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3658380,
          "sourceEndMs": 3661380,
          "text": "ありがとう"
        },
        {
          "speechId": 321,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3663360,
          "sourceEndMs": 3670669,
          "text": "[音楽]"
        },
        {
          "speechId": 322,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3673140,
          "sourceEndMs": 3678980,
          "text": "これ投げるだけ投げて去っていくの面白いね"
        },
        {
          "speechId": 323,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3680119,
          "sourceEndMs": 3686940,
          "text": "ありますよね仕方ないよねありがとう"
        },
        {
          "speechId": 324,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3689099,
          "sourceEndMs": 3708730,
          "text": "ちょっと惜しいわここであいつやれるんやれるだやれるやっぱちょっとありがとうありがとうここで100枚以上集めるのが目標です[音楽]"
        },
        {
          "speechId": 325,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3710220,
          "sourceEndMs": 3713220,
          "text": "か"
        },
        {
          "speechId": 326,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3714130,
          "sourceEndMs": 3724720,
          "text": "[音楽][笑い][拍手]"
        },
        {
          "speechId": 327,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3725359,
          "sourceEndMs": 3730920,
          "text": "スパチャが事故"
        },
        {
          "speechId": 328,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3732010,
          "sourceEndMs": 3739160,
          "text": "[音楽]率高いぞ結構いや確かにあのそこのね飛ぶとこよが難しいんですね"
        },
        {
          "speechId": 329,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3739230,
          "sourceEndMs": 3759510,
          "text": "[音楽]この1アップって意味あるの100を超えたからかなはいはいナイス行きますはいナイス飛んじゃううん行きます[音楽]"
        },
        {
          "speechId": 330,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3762200,
          "sourceEndMs": 3781989,
          "text": "今たら私のタイミングを言って多分でもずっといい動かした方がのかなあそこむずいですねめっちゃ大量にいたなどう動けばいいんだどう動けばよかったんだろう[音楽]"
        },
        {
          "speechId": 331,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3785310,
          "sourceEndMs": 3788329,
          "text": "[音楽]"
        },
        {
          "speechId": 332,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3790380,
          "sourceEndMs": 3801079,
          "text": "[音楽]ねそうだよね1回ジャンプしていい"
        },
        {
          "speechId": 333,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3801240,
          "sourceEndMs": 3813740,
          "text": "はいちょっとここ[音楽]トゥルルルルルここの曲めっちゃいいな"
        },
        {
          "speechId": 334,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3814820,
          "sourceEndMs": 3836000,
          "text": "[音楽][笑い]今のはマリオが頑張って張り切って私じゃなくてマリオが張り切ってここでダッシュを緩めるいや全然いいですよ私が下手だっただけ"
        },
        {
          "speechId": 335,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3836700,
          "sourceEndMs": 3844680,
          "text": "マリオと私が下手だったマリアの方が悪いなでもこれ115"
        },
        {
          "speechId": 336,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3845760,
          "sourceEndMs": 3848540,
          "text": "せーの"
        },
        {
          "speechId": 337,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3849500,
          "sourceEndMs": 3854530,
          "text": "[音楽]"
        },
        {
          "speechId": 338,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3855720,
          "sourceEndMs": 3859719,
          "text": "ナイス[音楽]"
        },
        {
          "speechId": 339,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3863180,
          "sourceEndMs": 3872780,
          "text": "を倒せばなんとかなるんかなでもさここのさ1つのすべてがみんな"
        },
        {
          "speechId": 340,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3873070,
          "sourceEndMs": 3898940,
          "text": "[音楽]ステージにつきなんか100枚くらい渡して気くれてるようながするからこれをなんか4回しか考えた結構きついの[音楽]考察データキャラやからね行きます"
        },
        {
          "speechId": 341,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3899570,
          "sourceEndMs": 3905400,
          "text": "[音楽]あの"
        },
        {
          "speechId": 342,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3906059,
          "sourceEndMs": 3908900,
          "text": "階段ねが壊れないですよ"
        },
        {
          "speechId": 343,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3910090,
          "sourceEndMs": 3922579,
          "text": "[音楽]はいはいありがとうございますスパチャありがとうございますありがとうござい[音楽]ます"
        },
        {
          "speechId": 344,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3926180,
          "sourceEndMs": 3930539,
          "text": "行きます[音楽]"
        },
        {
          "speechId": 345,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3935420,
          "sourceEndMs": 3945079,
          "text": "せーのはいもう進んじゃおうか[音楽]いいよいいよいいよ"
        },
        {
          "speechId": 346,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3946020,
          "sourceEndMs": 3959389,
          "text": "無視して先住んだらいけないのかないや行ってみるか行きますか[音楽]"
        },
        {
          "speechId": 347,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3960380,
          "sourceEndMs": 3985799,
          "text": "あれ普通かなのあれと一緒なのかなだってもうでどうなるんでしたっけ下踏んも大丈夫みたいな入れる入ってみる入れない乗り切れる骨にすごい本当だね可愛いせーのままやろう"
        },
        {
          "speechId": 348,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3989080,
          "sourceEndMs": 3992969,
          "text": "[音楽]"
        },
        {
          "speechId": 349,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 3993720,
          "sourceEndMs": 4000220,
          "text": "乗っ方いいずたがのかなうわここむ乗っ方たがいいのかな危ない"
        },
        {
          "speechId": 350,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4001339,
          "sourceEndMs": 4022780,
          "text": "でも半分はいかないでもここでさ稼ぐのありかもねせーの一だけ匹だしねうんなんかあでももういなくなっちゃったやつだせーの行っますちゃいかせーの"
        },
        {
          "speechId": 351,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4022880,
          "sourceEndMs": 4031780,
          "text": "これいやーはいいやそれ私が今戻っちゃったいやー238"
        },
        {
          "speechId": 352,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4032260,
          "sourceEndMs": 4035440,
          "text": "からか"
        },
        {
          "speechId": 353,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4037520,
          "sourceEndMs": 4040420,
          "text": "えぐいかもな"
        },
        {
          "speechId": 354,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4042619,
          "sourceEndMs": 4101739,
          "text": "これはいやでもなんか一人だったら行けてたのかな[笑い]悲しい悲しい独り言だ1人だったら悲しいつぶやきせ[音楽]ーのままあっさり[笑い]やってみる一人でやってますかちょっと一人でやります全部やってますフレンが1人で全部やってます一人ならいけるのかなこれで一人でも行けなかったら諦めよ確かにそれはそうそれはもうめっちゃまずい私可能性あるじゃんの私たちのもうスキル的に難しかったというプリンが無理なら無理だからねマリオ35をやっていた私であれば最優かもしれないやったことあります"
        },
        {
          "speechId": 355,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4102400,
          "sourceEndMs": 4109960,
          "text": "かマリオ下手くそ芸人やでまあ確かに確かに"
        },
        {
          "speechId": 356,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4117219,
          "sourceEndMs": 4148660,
          "text": "やだやだなんか下手にポンポン踏まない方がいいのかなでもなんかあの行けた時はなんすごいかなんかもうねみたいな感じだったよねここで果たしてこのコインを全部集める必要もあるのかどうかも分からないしなでも一番楽じゃない確かにでもなんか最後に死ぬほどコイン出てこられたらなんか泣く泣くよねありそうでもあるかも[音楽]嫌がらせだその場合はいやいけそう"
        },
        {
          "speechId": 357,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4149729,
          "sourceEndMs": 4175600,
          "text": "[音楽]ここもさワンちゃん結構ね稼げそうだねこれ殺さないんだああの履いてないと殺せないのかあれをはいはいはいはいはいはいはいはいはいはいはいはいはいはいうん超稼げるここいいじゃんすごいすごいすごいすごいすごい[音楽]あー200くらいでもまだいけない"
        },
        {
          "speechId": 358,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4180440,
          "sourceEndMs": 4188619,
          "text": "あこれ1回分あれなのかななんか暗くても平気よ[音楽]"
        },
        {
          "speechId": 359,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4188980,
          "sourceEndMs": 4205640,
          "text": "みんなが見たいかなと思ってさすがフレンよですよね[音楽]ここですよねダッシュ"
        },
        {
          "speechId": 360,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4206960,
          "sourceEndMs": 4211840,
          "text": "ジャンプダッシュジャンプ"
        },
        {
          "speechId": 361,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4211960,
          "sourceEndMs": 4222880,
          "text": "ナイスいやむずいなあーでもまあまあまあまあまあまあまあまあまあまあここいけでも移動さえできればそう"
        },
        {
          "speechId": 362,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4224540,
          "sourceEndMs": 4243280,
          "text": "戻った方がいいのかどうなんだあでももう300行くあいいねどこまでなんだステージがえでもさこれ最後まで言って足りなかったらさゴールできないわけやんてことはこの戻らなきゃいけないとかなんかあるんかなそういうことっすよね"
        },
        {
          "speechId": 363,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4243880,
          "sourceEndMs": 4247540,
          "text": "戻らさたれそうな予感してき"
        },
        {
          "speechId": 364,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4249040,
          "sourceEndMs": 4260500,
          "text": "一瞬になってんじゃないどうなってんのこれえこれ最初のとこに戻ってきたんあ違うわあーいける"
        },
        {
          "speechId": 365,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4261920,
          "sourceEndMs": 4273040,
          "text": "いけるいけるいけるここで稼げるんかでもまあ風に限りがありそうやが[音楽]いけるいけるいけるいけるいける"
        },
        {
          "speechId": 366,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4273159,
          "sourceEndMs": 4288580,
          "text": "ナイス最後当たって欲しかったあそこに私も今赤ろっか待って思ったんですけど心がて透け見えるかこいつわかっててやったなって思われるかなって"
        },
        {
          "speechId": 367,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4289520,
          "sourceEndMs": 4300159,
          "text": "ちょっとなおめでとうございますありがとうございますいいねつけとくかいいねいやむずいかったですね"
        },
        {
          "speechId": 368,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4302179,
          "sourceEndMs": 4321280,
          "text": "側のランニングマンは結構ね二人マリオ上級者じゃないときついかもしれないじゃあ次なんか簡単なステージ博士先輩が一人でやって終わりましょうえなかったよ簡単なステージもあるある一人でやったらいけるできないから除外したんだよ私が"
        },
        {
          "speechId": 369,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4323920,
          "sourceEndMs": 4333460,
          "text": "ダメか見たいけどなぁあの壁じゃん必須とかだったもん壁さんの一人ならできません"
        },
        {
          "speechId": 370,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4335860,
          "sourceEndMs": 4340060,
          "text": "できないかできない"
        },
        {
          "speechId": 371,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4341220,
          "sourceEndMs": 4346060,
          "text": "[笑い]"
        },
        {
          "speechId": 372,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4346300,
          "sourceEndMs": 4349300,
          "text": "よ"
        },
        {
          "speechId": 373,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4351460,
          "sourceEndMs": 4363760,
          "text": "そんなかなそんなの今探して職人ランキング最後やって終わるかうん"
        },
        {
          "speechId": 374,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4364580,
          "sourceEndMs": 4388780,
          "text": "コース職人これじゃないなうんコースを探せドスンピードランあとこういう曲って流していいのかなどうなんだろう普通に聞きたいけどなグルメレースとかグルメレースねキラキラ輝く超爽快コースこれマジすぐ終わるんよだな"
        },
        {
          "speechId": 375,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4389659,
          "sourceEndMs": 4408760,
          "text": "ダメなんかな可愛くかてごめんいいねやっぱ曲系なの普通になんかないかなその遊べるコースうんもう人気ランキング新着コース人気ランキングをジャストラン&ジャンプ"
        },
        {
          "speechId": 376,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4412219,
          "sourceEndMs": 4429460,
          "text": "どれも良さそうこれはタイムアタックやからやばいでタイムアタックなんだじゃあ無理だなギミックナイトギミックこれ面白そうクリア率26%"
        },
        {
          "speechId": 377,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4430100,
          "sourceEndMs": 4434199,
          "text": "そこまで難しくないと思うけど"
        },
        {
          "speechId": 378,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4444199,
          "sourceEndMs": 4455620,
          "text": "ギミックだとくんあタイミングでナイス[音楽]ナイス"
        },
        {
          "speechId": 379,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4455960,
          "sourceEndMs": 4487720,
          "text": "今博士先輩がどっちもやってます[音楽]鍵を取りに行かなきゃいけないからあーなるほどちょっと待ってこれ多分言ったらダメそうじゃないどのタイミングで切り替わるんだ1回ジャンプしてうわージャンプで切り替わるんだあなるほどなるほど1個目はどうだったんだろうえそうだった気がするただってめっちゃタイミング良かっもんなるほどだからこうして[笑い]"
        },
        {
          "speechId": 380,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4488199,
          "sourceEndMs": 4498260,
          "text": "上手うんこれもじゃん信じていくしかねえなナイス"
        },
        {
          "speechId": 381,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4499520,
          "sourceEndMs": 4502480,
          "text": "うまいうまいうまいうまい"
        },
        {
          "speechId": 382,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4507320,
          "sourceEndMs": 4514179,
          "text": "いやでもそんなに難しくないはずうんいけるいける切り替わるだけだから"
        },
        {
          "speechId": 383,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4514219,
          "sourceEndMs": 4527199,
          "text": "ジャンプうまいここから無駄ジャンプしちゃいけないのがちょっときついかも確かに[音楽]1回でも下手にジャンプすると切り替わっちゃうから"
        },
        {
          "speechId": 384,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4527480,
          "sourceEndMs": 4540699,
          "text": "うまいうまいこれもうこうしてびっくりしたいやでしょこうしてこう"
        },
        {
          "speechId": 385,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4544420,
          "sourceEndMs": 4580780,
          "text": "あこれはただのあれか[音楽]右か[音楽]あ上になんかブロックある[音楽]なんだこれどういうことだこれさ地味に私上にて上がっこれたの褒めてくれんえらいなんてすごいんだ上に上がれるなんて"
        },
        {
          "speechId": 386,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4583760,
          "sourceEndMs": 4598140,
          "text": "変わるわけさっきのでもう変わりませでしんた変わったあなるほどマリオのいるところにあった何もないわからまま取れちゃった[拍手]"
        },
        {
          "speechId": 387,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4598760,
          "sourceEndMs": 4602020,
          "text": "ナイスナイスいいです"
        },
        {
          "speechId": 388,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4603400,
          "sourceEndMs": 4622359,
          "text": "うまいうまいうまいめっちゃうまいめっちゃうまい何もわかんないマジでうまいよ[音楽]"
        },
        {
          "speechId": 389,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4623900,
          "sourceEndMs": 4635500,
          "text": "鍵がこっちにはあってあなるほどね賢い賢すぎる賢すぎるねちょっとIQ高いですね今日うん2人とも"
        },
        {
          "speechId": 390,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4636620,
          "sourceEndMs": 4638739,
          "text": "ね"
        },
        {
          "speechId": 391,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4639580,
          "sourceEndMs": 4649580,
          "text": "これあできないか無理かあの下のブロックヒップドロップは行きますこれ"
        },
        {
          "speechId": 392,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4651739,
          "sourceEndMs": 4670060,
          "text": "ヒップドロップできるできないんだ[音楽]ジャンプした湧いてますジャンプしたジャンプしてしたジャンプした無理かちょっと行けないんだえー何だろう蔦にぶらさが出るかも"
        },
        {
          "speechId": 393,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4670360,
          "sourceEndMs": 4690340,
          "text": "あそこに行かなきゃいけないのかそこからどうすんのあここになんかあるかなるほどあーそういうことか向こうとあれにてるなっんだいやむずい例えば"
        },
        {
          "speechId": 394,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4690760,
          "sourceEndMs": 4704489,
          "text": "これでなるほどはいはいはいはいはい理解いいコースじゃねこれ楽しいのいいね[音楽]"
        },
        {
          "speechId": 395,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4705920,
          "sourceEndMs": 4713800,
          "text": "急げ急げスイッチ[音楽]押しに行って"
        },
        {
          "speechId": 396,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4716179,
          "sourceEndMs": 4725320,
          "text": "よしまあでもセーブできてるからいやここにてセーブ置いくるのマジで優しいのいいのいいステージが"
        },
        {
          "speechId": 397,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4725900,
          "sourceEndMs": 4728080,
          "text": "ジャンプ"
        },
        {
          "speechId": 398,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4735100,
          "sourceEndMs": 4743140,
          "text": "でもここからここまで行かないといけない結構忙しいな"
        },
        {
          "speechId": 399,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4745719,
          "sourceEndMs": 4755120,
          "text": "この曲かっこいいうまいうまいうまいいけるこうこうしてしてあー"
        },
        {
          "speechId": 400,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4755300,
          "sourceEndMs": 4758300,
          "text": "行き"
        },
        {
          "speechId": 401,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4761060,
          "sourceEndMs": 4765030,
          "text": "過ぎてよはないんだ[笑い]"
        },
        {
          "speechId": 402,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4768159,
          "sourceEndMs": 4772159,
          "text": "いしょ行ける"
        },
        {
          "speechId": 403,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4779980,
          "sourceEndMs": 4785500,
          "text": "すごいまさかクリアできると思わなかった"
        },
        {
          "speechId": 404,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4785560,
          "sourceEndMs": 4805060,
          "text": "GGって書いてるすごい[音楽]動かないですか全然マリオできるマリオ下手くそゲーにやめますやめてくださいはいうんみんなも言ううまいのやめてくださいマリオめちゃ芸人にしときますそれはちょっとやばいかも"
        },
        {
          "speechId": 405,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4805780,
          "sourceEndMs": 4843280,
          "text": "はいということでねえすごい一人でもできるんだできます皆様が作ってくださった数々のいいステージも本当にありがとうございます意外と2人でもマリオはクリアできるステージによるいろんな人にやってほしいこのマリオやってほしいやってほしい私がやってほしいのは八代さんなんですけど社さんうまそう社さんとなんか苦手な人でやってほしいすごい的確に教えてくれそう俺が入っいってたら押してってそれでもできなかったすごい怒りそうでいい"
        },
        {
          "speechId": 406,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4845179,
          "sourceEndMs": 4847719,
          "text": "確かに"
        },
        {
          "speechId": 407,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4848719,
          "sourceEndMs": 4886780,
          "text": "すごい怒りそうでめちゃくちゃいい楽しそう楽しめちゃくちゃそうでもこれ楽しかったですね楽しかったタイミング合わせたりとかねうんありがとうございました突然の募集にも関わらずくださった方々私かと思って今全然とか言っちゃった私が俺言われたんか一緒に遊んでくれてありがとうございます結構前からやりたいって言ってますもんね去年だからやりたかって言ってたよかったよかったということではい何か宣伝ありますか"
        },
        {
          "speechId": 408,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4887420,
          "sourceEndMs": 4891520,
          "text": "いつも配信してます"
        },
        {
          "speechId": 409,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4894800,
          "sourceEndMs": 4907810,
          "text": "配信できる時に配信してます見に来くださいてはい見に来てください見に来くださいてはいじゃあ明日も嘘です私もいつもは無理です[笑い]"
        },
        {
          "speechId": 410,
          "sourceVideoId": "Lw_FdQPTOs8",
          "sourceStartMs": 4907820,
          "sourceEndMs": 4930460,
          "text": "ということでありがとうございましありがとうたございましたバイバイそんな感じなんだそうだよそっかそっかいつも本当かな本当にいいのかな時は鏡君がお送りいたしましたのはって言ってくれるんだけどお送りいたしましたのはフレイルスタリオと博士ゆうきでしたバイバイ"
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
