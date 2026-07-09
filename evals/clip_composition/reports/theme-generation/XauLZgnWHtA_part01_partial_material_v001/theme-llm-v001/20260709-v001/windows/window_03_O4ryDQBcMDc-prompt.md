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
    "windowId": "window_03_O4ryDQBcMDc",
    "reason": "未分割入力でEdgeレンダラが高負荷化して戻らなかったため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 340000,
    "overlapMs": 180000,
    "sourceVideoId": "O4ryDQBcMDc",
    "sourceStartMs": 17430,
    "sourceEndMs": 4420189
  },
  "sources": [
    {
      "sourceVideoId": "O4ryDQBcMDc",
      "sourceUrl": "https://www.youtube.com/live/O4ryDQBcMDc?feature=share",
      "transcriptKind": "youtube_auto_caption",
      "language": "ja",
      "rawSegmentCount": 6658,
      "promptSegmentCount": 328,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 1,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 17430,
          "sourceEndMs": 54900,
          "text": "[音楽]"
        },
        {
          "speechId": 2,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 62100,
          "sourceEndMs": 67760,
          "text": "テンパル頭のラビリンスパニックキューブ3d"
        },
        {
          "speechId": 3,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 97880,
          "sourceEndMs": 102380,
          "text": "私だけは進行を進めなきゃいけないですからね"
        },
        {
          "speechId": 4,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 102560,
          "sourceEndMs": 113510,
          "text": "逆に言えば私がどうにかして進めるんいくらででもふざけていいと思ってもらって大丈夫[拍手]"
        },
        {
          "speechId": 5,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 115040,
          "sourceEndMs": 131179,
          "text": "はいというわけで本日は挑戦していただく3人はオリバーエヴァンスさんレインパターソンさんレオスヴィンセントさんの3人ですよろしくお願いします"
        },
        {
          "speechId": 6,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 132140,
          "sourceEndMs": 142700,
          "text": "どうですか皆さんなんかきテンション上がってたエンジンの付け方がおかしいよ"
        },
        {
          "speechId": 7,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 143000,
          "sourceEndMs": 150300,
          "text": "ねやんないですかすげえ"
        },
        {
          "speechId": 8,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 152220,
          "sourceEndMs": 167239,
          "text": "欲しがってたから私だって本当はもうちょっとで済ましたねIQの高いサイエンティストでありたかったでもね期待に応えたくなっちゃうんだよもっとたく君の期待に答えなっちゃうんだよ"
        },
        {
          "speechId": 9,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 173660,
          "sourceEndMs": 177680,
          "text": "あの一番悪い顔のカメラ"
        },
        {
          "speechId": 10,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 178480,
          "sourceEndMs": 215060,
          "text": "[笑い]意気込みを聞いたつもりなんですけどいやでもこういう謎解きは正直言って得意を意外とねなんか思わぬところで頭がカチンと回るから例えばなんか街も動かしてなんか文字違うんだけども行けそうな気がするそうIQあるからね僕はですねやはり西君の解説をやっておりますのでねまあ2種類のクイズをした時の正答率はねめちゃくちゃ低いので任せてくださいそれ自信ないってことですよね自信あります"
        },
        {
          "speechId": 11,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 218700,
          "sourceEndMs": 235099,
          "text": "めっちゃ頭いいらしいんで今日はなんか楽しくやっていこうと思いますひらめきが大事だから全然いけると思うよこれ3人とも答えれないと多分無理なんで終わり終わり終わり終わり帰ろう"
        },
        {
          "speechId": 12,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 239659,
          "sourceEndMs": 242780,
          "text": "お願いします"
        },
        {
          "speechId": 13,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 243200,
          "sourceEndMs": 262579,
          "text": "ありがとうございます改めまして皆さんよろしくしお願いますこの企画はさえすれば正解できて当然のゲームにし挑戦てもらうから大丈夫ですかちょっとテレビに初めて出たみたいだね"
        },
        {
          "speechId": 14,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 264979,
          "sourceEndMs": 277699,
          "text": "今回の流れについて説明ですはい本日はバラバラシアタートラブル瞬間キャッチ読み切れラテ王子以上のコーナーをご用意してます"
        },
        {
          "speechId": 15,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 278060,
          "sourceEndMs": 288320,
          "text": "クリアすればするほどメダルが多く手に入りを最終ゲーム繋いでしりとり例の難易度が下がっていくシステムでーす"
        },
        {
          "speechId": 16,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 290419,
          "sourceEndMs": 311479,
          "text": "ですね直前にご説明させていただきますのでご安心くださいありがとうございますそしてなんとですね最終ゲームをクリアすると番組から商品としてお好きな任天堂SWITCHのソフトをそれぞれ差し上げますので頑張ってください"
        },
        {
          "speechId": 17,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 314660,
          "sourceEndMs": 320780,
          "text": "ありがとうございます任天堂ってなんか土地とか売ってなかった"
        },
        {
          "speechId": 18,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 320960,
          "sourceEndMs": 327180,
          "text": "ねゲーム性ソフトでお願いしてます1"
        },
        {
          "speechId": 19,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 327539,
          "sourceEndMs": 332539,
          "text": "坪とかじゃなかったっけこれですねあの私のポケットマネーから出しますんで"
        },
        {
          "speechId": 20,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 332960,
          "sourceEndMs": 337400,
          "text": "もゲームでお願いします"
        },
        {
          "speechId": 21,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 339020,
          "sourceEndMs": 351919,
          "text": "そうだこの配信の応援視聴者の皆さんぜひですねハッシュタグパニック部を使ってTwitterとかで応援よろしくお願い致しますお願いいたします"
        },
        {
          "speechId": 22,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 355639,
          "sourceEndMs": 370820,
          "text": "はいなおこの番組はバラエティチャンネル企画BOXTVの制作協力でお送りしておりますありがとうございますありがとうございます[音楽]それでははい行っちゃいますか"
        },
        {
          "speechId": 23,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 371120,
          "sourceEndMs": 381320,
          "text": "いつでも準備万端よ本当に間に合いましょうかはいそれでは最初のコーナーシアターです"
        },
        {
          "speechId": 24,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 386160,
          "sourceEndMs": 411680,
          "text": "ルールを説明してまいります何枚かのスライドへバラバラに分割されたものを一部を見て元が何だったかを答えていただきますなるほど回答は1人1文字ずつ順番に口頭で行っていただきますこれコツなんですけど不正解だったとしてもペナルティはないので思いついたらどんどん言っていてください"
        },
        {
          "speechId": 25,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 417020,
          "sourceEndMs": 421759,
          "text": "正解となり次の人となっていきます"
        },
        {
          "speechId": 26,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 425240,
          "sourceEndMs": 437280,
          "text": "人とダイヤルあたり6問ありましてまあ1人2本ずつですね正解することができれおーばなるほどね3"
        },
        {
          "speechId": 27,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 437819,
          "sourceEndMs": 457580,
          "text": "問正解です制限時間内に3問全員がクリアすることができればメダル獲得となります頑張ります1人がちゃんと正解すればOKなわけだからこれはかなり簡単じゃないんですかだって何も答えるわけじゃでしょないそこでメダル獲得できないとあとやばいと思った"
        },
        {
          "speechId": 28,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 457940,
          "sourceEndMs": 480259,
          "text": "ビギナーの最初のちょっとね入りやすい問題にしてくれてるってわけねなるほどなるほど頼むよ君たち一生終わんないからねあそうだよねちなみに今回3Dなんで自由に順番に入れ替えがしやすいと思うんですよねだからそこを相談しても大丈夫ですよ一番最初に誰が行くか地震"
        },
        {
          "speechId": 29,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 481400,
          "sourceEndMs": 496220,
          "text": "とりあえずこれで行ってみてようよトライアル2回あるんで1回やってみて順番変えるとかでも全然OKですはいはいでは参りましょうか準備よろしくお願いしますか"
        },
        {
          "speechId": 30,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 496500,
          "sourceEndMs": 512240,
          "text": "では参りましょうファーストトライアルスタートです[音楽]オリバーさんおにぎり違いますチーズ違います"
        },
        {
          "speechId": 31,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 512419,
          "sourceEndMs": 517520,
          "text": "ピザ世界レイリーさん"
        },
        {
          "speechId": 32,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 522049,
          "sourceEndMs": 527420,
          "text": "[音楽]素晴らしいと思います"
        },
        {
          "speechId": 33,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 531620,
          "sourceEndMs": 534730,
          "text": "[音楽]"
        },
        {
          "speechId": 34,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 578480,
          "sourceEndMs": 582680,
          "text": "早くなるまでは分からなかったね"
        },
        {
          "speechId": 35,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 584899,
          "sourceEndMs": 591740,
          "text": "と思ったんですけどでもほぼ正解ですよ正解です"
        },
        {
          "speechId": 36,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 594260,
          "sourceEndMs": 617779,
          "text": "高かったですねおいおい俺行けない行けるまだ分解できるファーストトライアル早速1つ目のメダルを獲得できませんでした所詮躓くのまずいよこれ大丈夫ですか順番変えなくていいですか"
        },
        {
          "speechId": 37,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 618620,
          "sourceEndMs": 650360,
          "text": "問題の傾向を僕となってくるとやっぱり一番最初は解きやすくなってるからこれはちょっとねまだエンジンがかかってないレン君がまず一番最初にじゃあどうする気もする遅れても後から出せそうな感じだったからこれによって回答してこの週はねさすがメダルに取りに行きましょうポイントOKこれで行きます信頼のリバーさんに全部託して頑張りますお願いします"
        },
        {
          "speechId": 38,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 651740,
          "sourceEndMs": 656180,
          "text": "ではこれでいきましょうか"
        },
        {
          "speechId": 39,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 657980,
          "sourceEndMs": 670919,
          "text": "運命のセカンドトライアル開始いたしますスタート[音楽][拍手][音楽]"
        },
        {
          "speechId": 40,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 684980,
          "sourceEndMs": 691279,
          "text": "飛行機[音楽]えーとね"
        },
        {
          "speechId": 41,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 694640,
          "sourceEndMs": 711920,
          "text": "早くなってくるちょっと待ってこれどれだけ時間するんだけどえー見えきてきたかそろそろ見えてたかアニメーションにしかめそう分かる分かるええ"
        },
        {
          "speechId": 42,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 714420,
          "sourceEndMs": 724579,
          "text": "わからんちょっと待って何だこれいけるかで子供なんだろう"
        },
        {
          "speechId": 43,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 728040,
          "sourceEndMs": 731899,
          "text": "おめでとうございます"
        },
        {
          "speechId": 44,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 744420,
          "sourceEndMs": 748760,
          "text": "素晴らしいパスでクリアすることができましたおめでとうございます"
        },
        {
          "speechId": 45,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 751339,
          "sourceEndMs": 758420,
          "text": "最後あの短時間で冷静に解き切ることができたオリバーさん素晴らしいありがとうございます"
        },
        {
          "speechId": 46,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 762680,
          "sourceEndMs": 796339,
          "text": "マッチョでいいのかなっていうプロポーズの何て言うかわかんないけどこれを言うって言われたらもう終わりだったそこまで厳しく良かったレオスさんもねもう結構投げず投げることなく本当に自分のできる最大限で送ることができ素晴らしかったですやっぱりねもう最終的に投げたら全部オリバー君の責任できるんで絶対にね責任逃れをするためには投げないといけないっすよねちゃんとなる石があったからそのおかげでこのクリアがあるわけあそこで多分あと1秒2秒長かったら答えれてなかったですね"
        },
        {
          "speechId": 47,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 798440,
          "sourceEndMs": 806779,
          "text": "はいというわけでなんとセカンドトライアルをクリアしたことでメダルを1個手に入れましたおめでとうございます"
        },
        {
          "speechId": 48,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 810260,
          "sourceEndMs": 819380,
          "text": "最低限最低限ちょっとこうファーストトライファーストステージでメダル手に入れなかったらどうしようかなと思ってました"
        },
        {
          "speechId": 49,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 821180,
          "sourceEndMs": 849120,
          "text": "次のセカンドステージなんですけど結構前回の時すっごいボロボロになって変えられていかれた方々が挑戦していたので今回どうなるかなっていうのはちょっと不安では気なるに方はぜひ前回のアーカイブとか見いただけれてば嬉しいんですけどでは皆さんに挑戦していきましょうかはいセカンドステージトリプル瞬間ジャッジ有罪"
        },
        {
          "speechId": 50,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 851639,
          "sourceEndMs": 889639,
          "text": "ルールを説明していきます5秒間だけ表示される問題を見て答えていただきます問題は全て3択ですはい問題が伏せられてから手元の札で解凍していただきます今手元にですね札があるのでそれで回答してた形になります3人全員が一斉に回答し不正解ならライフが1つ減少するっていうシステムですワントライ中5問正解すればメダル1枚獲得なんですけども2回ミスをすると失敗となります残機が3回にしません"
        },
        {
          "speechId": 51,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 892579,
          "sourceEndMs": 896060,
          "text": "用意しなきゃいけないんで"
        },
        {
          "speechId": 52,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 897120,
          "sourceEndMs": 907320,
          "text": "あのですね本当に3人全員がはいちゃんと回答できないと正解になりませんなるほどなるほど"
        },
        {
          "speechId": 53,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 907800,
          "sourceEndMs": 910760,
          "text": "今ありますか"
        },
        {
          "speechId": 54,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 920480,
          "sourceEndMs": 935420,
          "text": "となっておりますはいこれ自分の問題が一つ一つ成功か不正解かそれだけ判断してもらって出してもらえれば問題ないと思いますはいなるほどわかりましたはい例題からいきますか"
        },
        {
          "speechId": 55,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 936019,
          "sourceEndMs": 946760,
          "text": "した方がいいかもしれないうんまあなるほど確かにあるかもしれないでは例題見ていきましょう正しいのは正しいのは"
        },
        {
          "speechId": 56,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 949620,
          "sourceEndMs": 979130,
          "text": "はい終了ですでは回答していただきます皆さん回答をオープンBレオさんだけが来たのであげたのでBという回答になりましょうどう考えてもではBが正解なんでしょうか見ていきましょう正解はこちらですいや違うなおめでとうございます[笑い]"
        },
        {
          "speechId": 57,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 981800,
          "sourceEndMs": 992300,
          "text": "これCが結構あれですね多分aとbは正しいのは自分のやつだけ見ればいいけど多分ABはちゃんと全部見なきゃいけないから"
        },
        {
          "speechId": 58,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 992600,
          "sourceEndMs": 1000160,
          "text": "どちらでもないって一番多分ここでこの問題方得意な人が言ったがいいと思う"
        },
        {
          "speechId": 59,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1004399,
          "sourceEndMs": 1020440,
          "text": "傾向がわからんけどね得意な人いますかなんか色んな知識がいっぱいあるとこういう正しいのは系が出るんだったら俺あのー正しい正義と悪の見分けつきますっていう人がここ行った方がいいということは"
        },
        {
          "speechId": 60,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1024319,
          "sourceEndMs": 1026319,
          "text": "素晴らしい"
        },
        {
          "speechId": 61,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1040059,
          "sourceEndMs": 1056799,
          "text": "はいはいでは皆さんこれでよろしいですかよしでは行きましょうかそれではファーストトライアル進んでいきましょうかはい第1問鶏肉は鶏肉"
        },
        {
          "speechId": 62,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1060020,
          "sourceEndMs": 1081340,
          "text": "終了というわけで皆さんに回答を上げていただきます回答は回答オープン[音楽]Aオリバーさんだけ上げておりますAですこちらか映画正解なんでしょう見ていきましょう正解はこちらです"
        },
        {
          "speechId": 63,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1081940,
          "sourceEndMs": 1085720,
          "text": "正解ですおめでとうございます"
        },
        {
          "speechId": 64,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1091900,
          "sourceEndMs": 1113260,
          "text": "これは正解してもらわないと困るとそれはねかといって本当に誰か一人あげるのを間違えるだけで不正解になっておしまいそこだけ注意していただければでは次参りましょうか第2問牛肉は"
        },
        {
          "speechId": 65,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1113480,
          "sourceEndMs": 1116579,
          "text": "[音楽]"
        },
        {
          "speechId": 66,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1118280,
          "sourceEndMs": 1124720,
          "text": "終了では回答を上げていただきます回答オープン"
        },
        {
          "speechId": 67,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1126039,
          "sourceEndMs": 1129820,
          "text": "を上げております"
        },
        {
          "speechId": 68,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1136300,
          "sourceEndMs": 1139410,
          "text": "[拍手]"
        },
        {
          "speechId": 69,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1140020,
          "sourceEndMs": 1149500,
          "text": "正解見ていきましょうか正解はこちらですしおめでとうございます"
        },
        {
          "speechId": 70,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1153640,
          "sourceEndMs": 1159760,
          "text": "正解が出る時に一応こういうお願いします"
        },
        {
          "speechId": 71,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1160760,
          "sourceEndMs": 1169419,
          "text": "というわけでラムが羊かな僕がブタでどっちも違うよということになります"
        },
        {
          "speechId": 72,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1173799,
          "sourceEndMs": 1179440,
          "text": "いやちょっとねこれは我々のことなめすぎなんじゃないんですか"
        },
        {
          "speechId": 73,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1182480,
          "sourceEndMs": 1190240,
          "text": "識別かスタッフから今メッセージが来ててなめまきてすっててます"
        },
        {
          "speechId": 74,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1191150,
          "sourceEndMs": 1194329,
          "text": "[音楽]"
        },
        {
          "speechId": 75,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1199780,
          "sourceEndMs": 1205840,
          "text": "ねこの後からやばいと思ってください皆さん"
        },
        {
          "speechId": 76,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1207140,
          "sourceEndMs": 1211820,
          "text": "違うのこれから来るここから来ますよ"
        },
        {
          "speechId": 77,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1213140,
          "sourceEndMs": 1223720,
          "text": "焦りすぎ2人ともうんじゃあ行きましょうか余裕だよそうこれねあの本当に終わるとそこで問題が終わりなんで尺余るんですよね"
        },
        {
          "speechId": 78,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1223760,
          "sourceEndMs": 1228160,
          "text": "では行きましょうか第3問"
        },
        {
          "speechId": 79,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1228679,
          "sourceEndMs": 1230980,
          "text": "鶏肉は"
        },
        {
          "speechId": 80,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1235760,
          "sourceEndMs": 1244210,
          "text": "終了では回答をお願いします回答オープン[音楽]"
        },
        {
          "speechId": 81,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1248600,
          "sourceEndMs": 1263919,
          "text": "わからないと思ったみんな私はこの程度の問題わかってしまうんだよ教えてちょうだいそれでは正解を見ていきましょう正解はこちらですB正解で止めてございます"
        },
        {
          "speechId": 82,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1264080,
          "sourceEndMs": 1274240,
          "text": "それはそうこれ以外に鶏肉はない映画カラスニックBが鶏肉でした分かる分かる分かる"
        },
        {
          "speechId": 83,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1274400,
          "sourceEndMs": 1325840,
          "text": "鈍行かなレベルを上げていく俺はオリバーさんが完全苦手って聞いてたんでちょっと不安でさすがにこれは良かった良かったありがとうございますこれが分かるなら漢字そこまで大丈夫そうかなまあここまでえーっとチキンビーフスキンビーフポックそれではあと2問でクリアとなりますじゃあか行きましょう第4問電話は[音楽]ああああはい[音楽]終了では回答していただきます回答オープンaとbが上がりましたaとbが上がりましたもう下げちゃダメです下げちゃいけません"
        },
        {
          "speechId": 84,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1327100,
          "sourceEndMs": 1357280,
          "text": "はいそのまま上げておいてくださいあの視聴者の皆さんAとBが上がった時点でこれ不正解かもって思ってるかもしれないですけどこれもしかしたらAとB両方とも正解の可能性もあります全部開けてたらなんかabも違うっていう曲がってるからおかしくなりますけどそうそうAの電話があってBの電話もあったら正解になりますだからどっちまだ正解かどうか分かりませんでは見ていきましょうか正解はこちらです"
        },
        {
          "speechId": 85,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1362720,
          "sourceEndMs": 1376120,
          "text": "なんかその暗証番号とかをだいたいこれの順番じゃんそうですね1234無理だし8520とかダメみたいなねごめんなさい"
        },
        {
          "speechId": 86,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1376630,
          "sourceEndMs": 1382780,
          "text": "[拍手]まだ取り返せる"
        },
        {
          "speechId": 87,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1385960,
          "sourceEndMs": 1391780,
          "text": "なるほどね言うほどか"
        },
        {
          "speechId": 88,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1391960,
          "sourceEndMs": 1396820,
          "text": "やりがいが出てきたぞ言うことか"
        },
        {
          "speechId": 89,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1397400,
          "sourceEndMs": 1408640,
          "text": "行きますねまだ1個残ってるので次失敗したらおしまいです"
        },
        {
          "speechId": 90,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1410440,
          "sourceEndMs": 1420100,
          "text": "Bが電卓でした[拍手]では第まいり5問ましょうか"
        },
        {
          "speechId": 91,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1420440,
          "sourceEndMs": 1426159,
          "text": "第5問日本の電話番号は"
        },
        {
          "speechId": 92,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1429740,
          "sourceEndMs": 1434440,
          "text": "回答いただきしてます回答オープン"
        },
        {
          "speechId": 93,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1434659,
          "sourceEndMs": 1451059,
          "text": "CではC見ていきましょうかこれ正解でしょうか見てまいりますごめん俺今いきの見て見てます正解を見ていきます正解はこちらです"
        },
        {
          "speechId": 94,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1453159,
          "sourceEndMs": 1456940,
          "text": "AとBでした"
        },
        {
          "speechId": 95,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1461200,
          "sourceEndMs": 1476919,
          "text": "なんかその市外局番を抜いた後のあれて忘れた後ろがほらあの8じゃん44だからそうで僕携帯で考えちゃう自分の電話番号数えたら早いじゃないですか"
        },
        {
          "speechId": 96,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1484179,
          "sourceEndMs": 1491980,
          "text": "と勝手に思っちゃったあたし携帯も含めるんだそりゃそうだ携帯はなきゃ含め"
        },
        {
          "speechId": 97,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1498320,
          "sourceEndMs": 1506620,
          "text": "これ結局ちょっと説明を聞きたいんけどですみんな10桁でも10桁でもないと思ったわけですよね"
        },
        {
          "speechId": 98,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1508659,
          "sourceEndMs": 1526900,
          "text": "レオスさんは7桁ぐらいだと思ったでリン酸は11か12で足し算してたんですけど無理でした計算間違いです終わりですppm解散終わり11桁の後に市外局番を思い出したんですよ"
        },
        {
          "speechId": 99,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1527840,
          "sourceEndMs": 1537580,
          "text": "大丈夫ですか[笑い]"
        },
        {
          "speechId": 100,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1538240,
          "sourceEndMs": 1541329,
          "text": "[音楽]"
        },
        {
          "speechId": 101,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1544120,
          "sourceEndMs": 1554200,
          "text": "スタッフの方がですねコメントを大画面にコメントを映してくれてます今皆さんのコメントがこの3人に見えております"
        },
        {
          "speechId": 102,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1555220,
          "sourceEndMs": 1559840,
          "text": "えっと一応もう1トライアルあります"
        },
        {
          "speechId": 103,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1563779,
          "sourceEndMs": 1584799,
          "text": "初めての問題に初めての取材方式に我々は戸惑っていただけだよとだからこそここで一旦ワンステップを置いて次ホームチャンという気持ちでやってるからOKはいというわけでとりあえずこのファーストトライアルは失敗です[拍手][音楽]"
        },
        {
          "speechId": 104,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1587200,
          "sourceEndMs": 1590200,
          "text": "よ"
        },
        {
          "speechId": 105,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1594159,
          "sourceEndMs": 1600820,
          "text": "ね早速まあもう1トライありますあります"
        },
        {
          "speechId": 106,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1604900,
          "sourceEndMs": 1643600,
          "text": "赤色青色緑色だよだからCがどちらでもないだからやっぱAとBやっぱりなんか重要かもしれんこれは逆にここは固定気付いたさっきのは間違ったこれはちょっとなかなか難しいかなというところかなこれということはどちらでも構わんが取れないとわかった鶏は電話番号はちなみに電話番号"
        },
        {
          "speechId": 107,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1645159,
          "sourceEndMs": 1663580,
          "text": "電卓のところで間違えちゃってるから私はうんうんそう考えるとレイン君が言った方が固いよね任せてね戦略のレオスヴィンセント出たからね今度はこの風神でこれメダルコインいただきに行きますよろしくよろしく"
        },
        {
          "speechId": 108,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1663820,
          "sourceEndMs": 1670600,
          "text": "アメーネコ多分あそこが一番難いよね"
        },
        {
          "speechId": 109,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1677860,
          "sourceEndMs": 1682659,
          "text": "これじゃあ絶対にクリアできないと思われてるパターンか"
        },
        {
          "speechId": 110,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1684220,
          "sourceEndMs": 1690160,
          "text": "いけるですと思ってたんよね[笑い]"
        },
        {
          "speechId": 111,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1690760,
          "sourceEndMs": 1696520,
          "text": "一番最初の問題2問答もいけるとも思ってるてでしょ多分想定としは"
        },
        {
          "speechId": 112,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1698059,
          "sourceEndMs": 1700600,
          "text": "まあ"
        },
        {
          "speechId": 113,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1700820,
          "sourceEndMs": 1723700,
          "text": "悩んでるつまりねこれを規定路線なのではないかと私はグエル君に言いたいここで決めに行く我々はそう頑張ります難しさの調整をどうするかっていうの悩んでるわけでしょでもそんなのはいらないようん10秒にしてもらってもいいですか"
        },
        {
          "speechId": 114,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1736299,
          "sourceEndMs": 1766779,
          "text": "そのままでいきたいって言うからあんまりやりたくないみたいな引き下げ問題のレベルを引き下げるのかなと思ったけど思考する時間が延びるのであれば我々は普通に答えられますってこと確かに10桁11桁もうんあとねさっきの何秒でしたっけそれは4秒あったら出た絵画我々書いてたからねもう全問正解"
        },
        {
          "speechId": 115,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1770799,
          "sourceEndMs": 1775059,
          "text": "じゃあ行きますか"
        },
        {
          "speechId": 116,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1782380,
          "sourceEndMs": 1789340,
          "text": "ありがとうございますありがとうございますしっかり考えてください"
        },
        {
          "speechId": 117,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1794620,
          "sourceEndMs": 1799399,
          "text": "こんな感じですっていうのですね"
        },
        {
          "speechId": 118,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1800120,
          "sourceEndMs": 1802299,
          "text": "猫は"
        },
        {
          "speechId": 119,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1802580,
          "sourceEndMs": 1809740,
          "text": "はいはいはいはいはいはいCの責任も重くなったんだけどこれ"
        },
        {
          "speechId": 120,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1810980,
          "sourceEndMs": 1816940,
          "text": "終了では回答を上げていただきます回答オープン"
        },
        {
          "speechId": 121,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1817659,
          "sourceEndMs": 1828700,
          "text": "BCこれ迷ったでもいいか正解を確認していきます正解はこちらです"
        },
        {
          "speechId": 122,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1855820,
          "sourceEndMs": 1860380,
          "text": "この問題はこうやって引っかかるためにやってるでしょ"
        },
        {
          "speechId": 123,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1862240,
          "sourceEndMs": 1865779,
          "text": "これはひっかけです"
        },
        {
          "speechId": 124,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1866500,
          "sourceEndMs": 1892779,
          "text": "行けますねいけますねいける[笑い]そうそうそうそうそうかさっきの問題が余ってるからさっきすぐ終わってあ問題余ってるから問題移してこれるそうすれば"
        },
        {
          "speechId": 125,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1893360,
          "sourceEndMs": 1899140,
          "text": "そうすればライフ3つでいける"
        },
        {
          "speechId": 126,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1901720,
          "sourceEndMs": 1910059,
          "text": "ボロボロに舐められておりますめちゃくちゃ超超してくれてるよこれめちゃくちゃ"
        },
        {
          "speechId": 127,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1910100,
          "sourceEndMs": 1916640,
          "text": "崩壊したDMバカなのがバレたありがとういける"
        },
        {
          "speechId": 128,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1919100,
          "sourceEndMs": 1922419,
          "text": "1個余ってるんですよさっき"
        },
        {
          "speechId": 129,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1922899,
          "sourceEndMs": 1982960,
          "text": "アウトになったからあれあれはあれだと思うし基本的に1問目は絶対成功てもらうっての問題だよねメタ読みをするのでそういう問題が出てくるから1問目はおそらくクリアできるのではないかというサービス問題サービス問題1問えーっとさっきさっきの6番目に出す予定だった問題をじゃあ6番目の問題ってのも難しくないさっきさっき6番目に出す予定だった問題難しくないですか1回間違えてる前提だから逆にボーナス問題である可能性も高いなるほどそうそうクリアしてもらうための1つ目はクリアしてもらうために作ってるはずだからねえっとさっきの1セット目の6万円の問題をじゃあ一応持っでてこれるので持ってこれるのじゃあもう本当にライフ3にしてもつれてもつれたらそれを使いましょうわかりましたあーわかりました"
        },
        {
          "speechId": 130,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1984760,
          "sourceEndMs": 1998740,
          "text": "ありがとうございますというわけで画面左上にはライフ2つしかマークないですけど皆さんには見えないライフがもう1あり個ますはい誰も想定してませんでしたこれを作った人は"
        },
        {
          "speechId": 131,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 1999580,
          "sourceEndMs": 2002640,
          "text": "もんだな"
        },
        {
          "speechId": 132,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2002880,
          "sourceEndMs": 2039179,
          "text": "ありがとうでもまあはい5秒で行きましょうかライフ増やしたからちょっと考える時間は下手くそ残機は増えたからそういう意味ではわかった2個ライフやったら増やしてもらうそうそうそうそう今回ですね多分今の第1を例題見たらわかったと思うんですけどさっきみたいにAかBかabでもないかじゃなくてAかBかCかになってる全部を見なきゃいけない人がいないんないじゃですか"
        },
        {
          "speechId": 133,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2039960,
          "sourceEndMs": 2045240,
          "text": "だから自分の問題だけアドバイス"
        },
        {
          "speechId": 134,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2047580,
          "sourceEndMs": 2065760,
          "text": "自分の問題自分のアルファベットの問題があってるか合ってないかそれだけを考えてください完全に理解したはい理解しますこのゲームには必勝法がある今それを完全に私はし理解たぞ教えてもらったからね"
        },
        {
          "speechId": 135,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2076740,
          "sourceEndMs": 2080220,
          "text": "メダル取ってくださいよ"
        },
        {
          "speechId": 136,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2080399,
          "sourceEndMs": 2089580,
          "text": "ではセカンドトライアル第1問です一番サイズが大きいのは"
        },
        {
          "speechId": 137,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2091919,
          "sourceEndMs": 2108300,
          "text": "これはね終了でいただきは回答してます回答オープンレオさんのCですあんなでかい声が見たことあるなかなか大きいよね"
        },
        {
          "speechId": 138,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2108900,
          "sourceEndMs": 2116400,
          "text": "Cかが正解なの正解を見ていきましょう正解はこちらです"
        },
        {
          "speechId": 139,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2118000,
          "sourceEndMs": 2121199,
          "text": "[拍手]"
        },
        {
          "speechId": 140,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2121380,
          "sourceEndMs": 2124500,
          "text": "すごいすごい"
        },
        {
          "speechId": 141,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2124980,
          "sourceEndMs": 2128160,
          "text": "おめでとうございます"
        },
        {
          "speechId": 142,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2134099,
          "sourceEndMs": 2138400,
          "text": "ありがとうございますけど"
        },
        {
          "speechId": 143,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2146460,
          "sourceEndMs": 2152880,
          "text": "[拍手]徐々に難易度が上がっていくわけですねご注意ください"
        },
        {
          "speechId": 144,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2153760,
          "sourceEndMs": 2162000,
          "text": "でははい行きますか第2問今回の開始時間は"
        },
        {
          "speechId": 145,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2166960,
          "sourceEndMs": 2172800,
          "text": "終了では回答していただきます回答オープン"
        },
        {
          "speechId": 146,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2173079,
          "sourceEndMs": 2175740,
          "text": "オリバーさん"
        },
        {
          "speechId": 147,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2176380,
          "sourceEndMs": 2187320,
          "text": "ではこちら映画正解なのか答え合わせをして参ります正解はこちらですありがとうございます"
        },
        {
          "speechId": 148,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2188120,
          "sourceEndMs": 2200820,
          "text": "[拍手][音楽]よかった余裕なくなってないかちょっとねマジでドキドキするよ"
        },
        {
          "speechId": 149,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2201660,
          "sourceEndMs": 2206640,
          "text": "当たり前にPMなのに頭の中でも"
        },
        {
          "speechId": 150,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2213940,
          "sourceEndMs": 2235200,
          "text": "ここちょっと出ちゃってるね商品が欲しいとかそういうのじゃなくても今我々はあのちゃんと企画を成立させないといけないのではないかというそういう意識が芽生え始めてしまってるから別の方の緊張が今高まってきてるわけだ一旦ステロ君たちそういうのはうんそうだね"
        },
        {
          "speechId": 151,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2239760,
          "sourceEndMs": 2250079,
          "text": "次の問題行くんですけどもちょっと1個だけ注意させてください札を上げる時に私持たないですみたいなやつはやめましょう"
        },
        {
          "speechId": 152,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2251160,
          "sourceEndMs": 2272099,
          "text": "はい持った状態でオープンであげる人だけ上げると上げない人はそのままとここで振って後ろに下げると持たないのかっていう風なちょっとアピールになっちゃうんでねはいOKで第は次行きます3問正しいタイトルは"
        },
        {
          "speechId": 153,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2274760,
          "sourceEndMs": 2283909,
          "text": "[音楽]終了では回答します回答オープン[音楽]"
        },
        {
          "speechId": 154,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2285760,
          "sourceEndMs": 2288060,
          "text": "あれ"
        },
        {
          "speechId": 155,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2289320,
          "sourceEndMs": 2318300,
          "text": "あげられるとめっちゃ不安になるちょっと待っていやまあどっちかが間違ってるのは事実だと思うこれはプレイしてないからあごめんなさい終わったわごめんごめんごめんいやどっちも正解だったら正解なんであの文字が多いからどっちも正解なわけねえだろまだわかんないよこれで僕間違えたでは正解見ていきましょうか"
        },
        {
          "speechId": 156,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2318400,
          "sourceEndMs": 2321420,
          "text": "正解はこちらです"
        },
        {
          "speechId": 157,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2330600,
          "sourceEndMs": 2333690,
          "text": "[拍手]"
        },
        {
          "speechId": 158,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2338640,
          "sourceEndMs": 2341640,
          "text": "ね"
        },
        {
          "speechId": 159,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2342960,
          "sourceEndMs": 2352020,
          "text": "これに関してはやっぱりその何だろうねやったことないっていうのもあるからね"
        },
        {
          "speechId": 160,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2358200,
          "sourceEndMs": 2369180,
          "text": "じゃあいるけど思った時にあのアルファベットの文字列でリラックスあれで気づけたからあれだったけどなかなかこれ不安になる問題だな"
        },
        {
          "speechId": 161,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2369780,
          "sourceEndMs": 2399240,
          "text": "これはレオさんが素晴らしかったという言い方もできますねなんと今回みなさんライフ3つありますから痛くねえハートが消えていないまだあとまだあと1回まで見せれます遠征が発動した問題1個増えてるんだぜ画面上にある1/6って書いてますけど今回7/7ですからね"
        },
        {
          "speechId": 162,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2399900,
          "sourceEndMs": 2418140,
          "text": "そうですあと2回見せたらアウト2ってことでよかったでは行きましょうかはい第4問正しいカプセルトイ販売機は"
        },
        {
          "speechId": 163,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2423040,
          "sourceEndMs": 2431700,
          "text": "終了いただきでは回答してます回答オープン[音楽]B"
        },
        {
          "speechId": 164,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2431740,
          "sourceEndMs": 2439079,
          "text": "では正しいか見ていきましょう正解はこちらです"
        },
        {
          "speechId": 165,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2465820,
          "sourceEndMs": 2469039,
          "text": "[拍手]"
        },
        {
          "speechId": 166,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2474420,
          "sourceEndMs": 2477780,
          "text": "第5問"
        },
        {
          "speechId": 167,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2477880,
          "sourceEndMs": 2480780,
          "text": "漢字2で文字書けるのは"
        },
        {
          "speechId": 168,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2482980,
          "sourceEndMs": 2485280,
          "text": "わからん"
        },
        {
          "speechId": 169,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2485320,
          "sourceEndMs": 2505500,
          "text": "終了では回答をしていただきます回答オープン[音楽]BCこれはではこれあってるか見ていきましょうCが正解だったらこれでさらに一つ進めますでは見ていきましょう正解はこちらです"
        },
        {
          "speechId": 170,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2509280,
          "sourceEndMs": 2514440,
          "text": "ごめんうどんの感じで知られる"
        },
        {
          "speechId": 171,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2516579,
          "sourceEndMs": 2520920,
          "text": "初めて見たそばで良かったって思ったよ"
        },
        {
          "speechId": 172,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2521579,
          "sourceEndMs": 2529159,
          "text": "ね楽しかったよね[音楽]"
        },
        {
          "speechId": 173,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2530560,
          "sourceEndMs": 2536099,
          "text": "漢字が一番ね苦手なオリバーさんとこにうどんが行ったのも運命だったかもしれないですね"
        },
        {
          "speechId": 174,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2538079,
          "sourceEndMs": 2566700,
          "text": "そういう慰めやめよう本気で今勝ちに来てるの我々は実践してくださいちゃんとはいもう間違えちゃダメよ君たち二人とも間違えてるからねもうすでにもう間違いないでここでメダルをしっかりと取りに行くすいませんGoogleさん本当に情けない連中で本当に申し訳ありはいませんでは次ですねえーっと6問目に行きます"
        },
        {
          "speechId": 175,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2570400,
          "sourceEndMs": 2574020,
          "text": "一番サイズが大きいのは"
        },
        {
          "speechId": 176,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2578740,
          "sourceEndMs": 2594960,
          "text": "終了では回答していただきます回答オープン[音楽][笑い]次かのコーナー行きます"
        },
        {
          "speechId": 177,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2595200,
          "sourceEndMs": 2602880,
          "text": "いやもしかしたら全同じ正解がないってことはないの"
        },
        {
          "speechId": 178,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2605339,
          "sourceEndMs": 2616980,
          "text": "だからそうそう500円玉が大きいよっいうてのが正解かもしれないから札をあげないとこちらです10円玉でした"
        },
        {
          "speechId": 179,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2617460,
          "sourceEndMs": 2620460,
          "text": "ね"
        },
        {
          "speechId": 180,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2620760,
          "sourceEndMs": 2628140,
          "text": "小銭をそもそもいくつか重ねると10円の玉方がでかいの知ってたから"
        },
        {
          "speechId": 181,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2633060,
          "sourceEndMs": 2636480,
          "text": "仕上げてください"
        },
        {
          "speechId": 182,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2637560,
          "sourceEndMs": 2641520,
          "text": "これは間違いようがなかったね"
        },
        {
          "speechId": 183,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2644339,
          "sourceEndMs": 2659819,
          "text": "でもこれは真面目はクイズだから振りとかには惑わされないよこれに関しはて素晴らしいと思いますライフ3つ付けてしまったのでステージクリアならずでした"
        },
        {
          "speechId": 184,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2667380,
          "sourceEndMs": 2674220,
          "text": "いやー結局第1トライアルの6問目使わなかったですね"
        },
        {
          "speechId": 185,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2681400,
          "sourceEndMs": 2683940,
          "text": "追い込まれてるよ"
        },
        {
          "speechId": 186,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2684400,
          "sourceEndMs": 2686940,
          "text": "怖い怖い怖い"
        },
        {
          "speechId": 187,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2688160,
          "sourceEndMs": 2694560,
          "text": "[音楽]大丈夫ですよ行きますか"
        },
        {
          "speechId": 188,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2700920,
          "sourceEndMs": 2715740,
          "text": "行きますかちょっとここで行ったねこれコイン5文字ずつ減ってくそう5文字ずつ減っていきますこれ1つ追加したら10文字減らしましょう減らさないです"
        },
        {
          "speechId": 189,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2716339,
          "sourceEndMs": 2728460,
          "text": "かみんなこれは真面目な番組なんだぜ本気で問題を解いた結果これなんだこれ2つともメダル取れば10文字減らせるんでね"
        },
        {
          "speechId": 190,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2731400,
          "sourceEndMs": 2738180,
          "text": "行きましょうか頑張ろうサードステージ読み切りラテン文字"
        },
        {
          "speechId": 191,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2739020,
          "sourceEndMs": 2770280,
          "text": "それではこの読み切りラテン文字を説明していきますある文字がコーヒーカップの中で輪切りにてなっ回転している様子を見て何の文字か当てていただきます文字はカップ1つにつき1文字1問につき1人ずつリレー形式で順番に挑戦していただきますほう1セットにつき制限時間90正解秒以内に6問すればクリアとますなりはいはいはいはいはいこれなんだ"
        },
        {
          "speechId": 192,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2773440,
          "sourceEndMs": 2776819,
          "text": "2周します"
        },
        {
          "speechId": 193,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2779579,
          "sourceEndMs": 2786180,
          "text": "これに誰か分かる人いるちなみええんじゃないこれ"
        },
        {
          "speechId": 194,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2787200,
          "sourceEndMs": 2806940,
          "text": "でも田んぼのただとも思ったわ僕は途中で途切れるんだよねこれもですけど何回不正解しても別に慣れてないので資格っぽく見たなら資格っぽい感じを言い続けて大丈夫はいはいはいアドバイスをしてます"
        },
        {
          "speechId": 195,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2809339,
          "sourceEndMs": 2816720,
          "text": "苦手だから多分手間取ると思う逆にさ時間をあげるっていう"
        },
        {
          "speechId": 196,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2820200,
          "sourceEndMs": 2844500,
          "text": "うんで私も挽回してでここでカット回してくればオリバー君がいくらでも時間を使えるようにありがとういい戦略ではですねゲームを始めようと思うんですけど人だけちょっとお願いしたいことがあって声で言ったものを正解か嘘不正解か判定するのではっきり"
        },
        {
          "speechId": 197,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2844560,
          "sourceEndMs": 2850619,
          "text": "うんうんぐらいだと丸にならないかもしれないのでご注意ください"
        },
        {
          "speechId": 198,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2855180,
          "sourceEndMs": 2860579,
          "text": "ファーストトライアルスタート"
        },
        {
          "speechId": 199,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2862420,
          "sourceEndMs": 2868590,
          "text": "です[音楽][拍手]"
        },
        {
          "speechId": 200,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2868839,
          "sourceEndMs": 2871839,
          "text": "よ"
        },
        {
          "speechId": 201,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2871960,
          "sourceEndMs": 2873960,
          "text": "源"
        },
        {
          "speechId": 202,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2874119,
          "sourceEndMs": 2876599,
          "text": "何だこれ"
        },
        {
          "speechId": 203,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2878619,
          "sourceEndMs": 2880619,
          "text": "雷"
        },
        {
          "speechId": 204,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2884560,
          "sourceEndMs": 2895380,
          "text": "なし[音楽]分かった分かった2人ともわからない"
        },
        {
          "speechId": 205,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2898319,
          "sourceEndMs": 2904559,
          "text": "いや違うか雪[音楽]"
        },
        {
          "speechId": 206,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2906540,
          "sourceEndMs": 2910260,
          "text": "何これ分かったこれ"
        },
        {
          "speechId": 207,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2913599,
          "sourceEndMs": 2922319,
          "text": "闇正解悪いぞえーと"
        },
        {
          "speechId": 208,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2922780,
          "sourceEndMs": 2928079,
          "text": "才能のえーっと元気の件"
        },
        {
          "speechId": 209,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2928240,
          "sourceEndMs": 2934200,
          "text": "だないけるか"
        },
        {
          "speechId": 210,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2934300,
          "sourceEndMs": 2936300,
          "text": "林"
        },
        {
          "speechId": 211,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2937780,
          "sourceEndMs": 2941220,
          "text": "の感じって何がある"
        },
        {
          "speechId": 212,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2951119,
          "sourceEndMs": 2954839,
          "text": "いた世界"
        },
        {
          "speechId": 213,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2958450,
          "sourceEndMs": 2964319,
          "text": "[拍手]終了時間切れです"
        },
        {
          "speechId": 214,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2970140,
          "sourceEndMs": 2973920,
          "text": "[音楽]難しかったね"
        },
        {
          "speechId": 215,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2987230,
          "sourceEndMs": 2990300,
          "text": "[拍手]"
        },
        {
          "speechId": 216,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 2991920,
          "sourceEndMs": 2996839,
          "text": "まだみんなで遊ぼうよ"
        },
        {
          "speechId": 217,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3002780,
          "sourceEndMs": 3005900,
          "text": "どうしました"
        },
        {
          "speechId": 218,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3009839,
          "sourceEndMs": 3014660,
          "text": "のたどうしちゃっのじゃあとりあえず"
        },
        {
          "speechId": 219,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3014780,
          "sourceEndMs": 3020760,
          "text": "教えて失敗でした残念"
        },
        {
          "speechId": 220,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3021780,
          "sourceEndMs": 3025599,
          "text": "失敗だよね[音楽]"
        },
        {
          "speechId": 221,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3027750,
          "sourceEndMs": 3032070,
          "text": "[音楽]"
        },
        {
          "speechId": 222,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3035790,
          "sourceEndMs": 3043840,
          "text": "[音楽][拍手][笑い]"
        },
        {
          "speechId": 223,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3046700,
          "sourceEndMs": 3049819,
          "text": "180秒"
        },
        {
          "speechId": 224,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3052640,
          "sourceEndMs": 3059180,
          "text": "180やりすぎじゃない今"
        },
        {
          "speechId": 225,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3061339,
          "sourceEndMs": 3069319,
          "text": "90120120120120でもどうだ90秒で3本落ちた"
        },
        {
          "speechId": 226,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3069859,
          "sourceEndMs": 3082160,
          "text": "100じゃあ150にしますか150150円[音楽]上がってきたよ"
        },
        {
          "speechId": 227,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3082859,
          "sourceEndMs": 3093680,
          "text": "できないですこの問題見ていただくと思うんこのですけど問題を作るために1問あたり相当な労力がかかってる事"
        },
        {
          "speechId": 228,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3093839,
          "sourceEndMs": 3096859,
          "text": "想像ができるんじゃないかなと思います"
        },
        {
          "speechId": 229,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3097760,
          "sourceEndMs": 3108319,
          "text": "ここに申し訳ないという気持ちを持ってはいけないわけだよこの問題を作った人たちに素晴らしい"
        },
        {
          "speechId": 230,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3108800,
          "sourceEndMs": 3112520,
          "text": "ありがとうございます"
        },
        {
          "speechId": 231,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3117319,
          "sourceEndMs": 3121819,
          "text": "160いきましょう160点"
        },
        {
          "speechId": 232,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3123020,
          "sourceEndMs": 3129980,
          "text": "いきましょうかよし180で次の問題いきましょう"
        },
        {
          "speechId": 233,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3130800,
          "sourceEndMs": 3150380,
          "text": "ではセカンドトライアル160秒で行きますか160秒で行けるちょっと待ってちょっと待ってちょっと待ってちょっと待ってますゲームの設定を変えなきゃいけないんで書いてもらった迷惑かけてるって"
        },
        {
          "speechId": 234,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3150420,
          "sourceEndMs": 3153260,
          "text": "準備しますはい"
        },
        {
          "speechId": 235,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3153380,
          "sourceEndMs": 3159199,
          "text": "160でいけるかな[音楽]"
        },
        {
          "speechId": 236,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3160460,
          "sourceEndMs": 3171079,
          "text": "と思います652つと602つと30秒一つで160だったからねこれはもう相当"
        },
        {
          "speechId": 237,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3175940,
          "sourceEndMs": 3180020,
          "text": "66だよ"
        },
        {
          "speechId": 238,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3183920,
          "sourceEndMs": 3187280,
          "text": "かけこれたらいいんだ"
        },
        {
          "speechId": 239,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3187339,
          "sourceEndMs": 3191359,
          "text": "1人2回やらなきゃいけないから"
        },
        {
          "speechId": 240,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3194700,
          "sourceEndMs": 3197790,
          "text": "[音楽]"
        },
        {
          "speechId": 241,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3198900,
          "sourceEndMs": 3206960,
          "text": "準備ができましたでは皆さん行けますか"
        },
        {
          "speechId": 242,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3212280,
          "sourceEndMs": 3233240,
          "text": "いやでもさっきのはあの回答のタイミングはもう分かったのは正直一番入ってるやっぱりこれはやっぱりレインくんの方がこの問題の読み切れる確率は高い信じるましょう頑張りますはいでは参りかセカンドトライアルスタートです"
        },
        {
          "speechId": 243,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3234810,
          "sourceEndMs": 3239560,
          "text": "[音楽][拍手]"
        },
        {
          "speechId": 244,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3244210,
          "sourceEndMs": 3253220,
          "text": "[音楽]かっこいい感じだよなぁ行ってくの大事ですね"
        },
        {
          "speechId": 245,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3275400,
          "sourceEndMs": 3285980,
          "text": "待って知らない感じ探検2級の問題だろこれやばい関係1級だよ多分5級ぐらいだと思う"
        },
        {
          "speechId": 246,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3291740,
          "sourceEndMs": 3295819,
          "text": "見えるタイミングがどっかでくるはず"
        },
        {
          "speechId": 247,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3296220,
          "sourceEndMs": 3305900,
          "text": "ないまだ来ないけど来ない来ない来ない来ないでから始まります"
        },
        {
          "speechId": 248,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3309340,
          "sourceEndMs": 3312459,
          "text": "[音楽]"
        },
        {
          "speechId": 249,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3314839,
          "sourceEndMs": 3319380,
          "text": "ベから始まります正解"
        },
        {
          "speechId": 250,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3321360,
          "sourceEndMs": 3326040,
          "text": "[音楽]"
        },
        {
          "speechId": 251,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3329160,
          "sourceEndMs": 3334700,
          "text": "これはこれはもう言わないです"
        },
        {
          "speechId": 252,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3336260,
          "sourceEndMs": 3342140,
          "text": "違います[音楽]よ"
        },
        {
          "speechId": 253,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3348420,
          "sourceEndMs": 3350420,
          "text": "缶"
        },
        {
          "speechId": 254,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3369420,
          "sourceEndMs": 3378900,
          "text": "えーっときっと見える瞬間があると思いますがみんな"
        },
        {
          "speechId": 255,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3379320,
          "sourceEndMs": 3382369,
          "text": "[音楽]"
        },
        {
          "speechId": 256,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3395160,
          "sourceEndMs": 3398160,
          "text": "正解"
        },
        {
          "speechId": 257,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3399480,
          "sourceEndMs": 3401480,
          "text": "よ"
        },
        {
          "speechId": 258,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3405480,
          "sourceEndMs": 3410900,
          "text": "これ問題だっていっぱいあります"
        },
        {
          "speechId": 259,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3419780,
          "sourceEndMs": 3428960,
          "text": "一応もう1セットは持ってきてるんですけど"
        },
        {
          "speechId": 260,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3432559,
          "sourceEndMs": 3436280,
          "text": "持ってきてるもう1セット"
        },
        {
          "speechId": 261,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3436559,
          "sourceEndMs": 3450680,
          "text": "むしろあのセカンドファーストトライアルとかがなんか簡単に答えられてしまった時用に難易度上げる用のもう1問持ってきていてだからじゃあちょっとあの"
        },
        {
          "speechId": 262,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3451380,
          "sourceEndMs": 3453920,
          "text": "想像なんですけど"
        },
        {
          "speechId": 263,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3454500,
          "sourceEndMs": 3470960,
          "text": "セカンドステージの余ってる位置も余ってる一門あれ答えれたらメダル1個みんなで協力していきますいきます"
        },
        {
          "speechId": 264,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3474119,
          "sourceEndMs": 3495440,
          "text": "余ってるあの1問ファーストラインの6問目それをみんなで添えたら目立ってことです[音楽]もうそれで行けなかったらもう何もないですよそれだけですか"
        },
        {
          "speechId": 265,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3510380,
          "sourceEndMs": 3518660,
          "text": "1/6などに出るはずだった6分の6いきますよやったよしよしみんなでみんなで答えよう"
        },
        {
          "speechId": 266,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3524339,
          "sourceEndMs": 3541040,
          "text": "瞬間ジャッジのABCのやつ第1セットの6話目です第1セットっどんなてます問題だったか覚えてここにいる人が一番考えなきゃいけないOKの問題そうはいはいはい"
        },
        {
          "speechId": 267,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3542099,
          "sourceEndMs": 3545000,
          "text": "順番大丈夫ですかそれ順番"
        },
        {
          "speechId": 268,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3545819,
          "sourceEndMs": 3551880,
          "text": "最初だからレン君ここだった私もここ行った行こう"
        },
        {
          "speechId": 269,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3554040,
          "sourceEndMs": 3559160,
          "text": "任せろすっごいこれ相談できない"
        },
        {
          "speechId": 270,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3559760,
          "sourceEndMs": 3569119,
          "text": "6問目だから難しいですでもこれに関しはて1問だけ答えれたらメダルだからすごいサービスです"
        },
        {
          "speechId": 271,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3569480,
          "sourceEndMs": 3573559,
          "text": "正解しただけじゃ入れないからね"
        },
        {
          "speechId": 272,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3575599,
          "sourceEndMs": 3578599,
          "text": "ありがとう"
        },
        {
          "speechId": 273,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3579079,
          "sourceEndMs": 3582260,
          "text": "ございます"
        },
        {
          "speechId": 274,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3585020,
          "sourceEndMs": 3603440,
          "text": "さすがに後でチャンネル登録の誘導おし願いますありがとうございますお願いしますじゃあ行きますかはい行きますはい1回だけの勝負最後の問題ですはいはい"
        },
        {
          "speechId": 275,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3603480,
          "sourceEndMs": 3607280,
          "text": "ポテトチップスを作っている会社は"
        },
        {
          "speechId": 276,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3612839,
          "sourceEndMs": 3633260,
          "text": "終了では上げていただきます回答オープン[音楽]BとCではビートC両方とも正解だった場合にクリアとなります正解を見ていきましょう"
        },
        {
          "speechId": 277,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3635760,
          "sourceEndMs": 3642319,
          "text": "Cが世界残念でした失敗です"
        },
        {
          "speechId": 278,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3645119,
          "sourceEndMs": 3648119,
          "text": "メダル"
        },
        {
          "speechId": 279,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3658850,
          "sourceEndMs": 3663539,
          "text": "[拍手]"
        },
        {
          "speechId": 280,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3665640,
          "sourceEndMs": 3670389,
          "text": "合計1個です[音楽]"
        },
        {
          "speechId": 281,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3678380,
          "sourceEndMs": 3682280,
          "text": "下から何番目ぐらいですか"
        },
        {
          "speechId": 282,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3682400,
          "sourceEndMs": 3688260,
          "text": "再開かどうかなぐらい3"
        },
        {
          "speechId": 283,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3703020,
          "sourceEndMs": 3713420,
          "text": "組しかいないんでもしかしたらその4組目になる可能性はまだあります75でクリアした人いないんじゃないですかいないと思います"
        },
        {
          "speechId": 284,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3713599,
          "sourceEndMs": 3747980,
          "text": "いやそもそもさなんかさ捉えすぎ何ていうかあのピッチャーがさあ野球に例えたらねなんか6回まで10失点したけどもそれでも勝ちの目が消えたって帰ってるのはもう完全にナンセンス8回9回で逆転する可能性あるんだから最終的にはスコアボードがこっちでチームが勝ったら勝ちなんだからこんなもんでね私たちの力を測れるわけないだろみんな見せようよ僕たちはiQパワーを進めてくださいルール説明していきます"
        },
        {
          "speechId": 285,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3749700,
          "sourceEndMs": 3808520,
          "text": "伸ばしてしりとりでボールの説明がこちらですクイズのルール回答者でしりとりを行いゴールを目指していただきますただし前の人が言った言葉よりも長い言葉をつなげることができません同じ長さの場合はOKです回答は1人1ずつ問順番に口頭で行いますパスはできないが続かないと思ったら順番を戻してもOKですクリア条件制限時間内にゴールぴったりに止まるようにできたらOKですゴールまでの文字数は獲得したキューブメダルが多いほど少なくなります今回は75文字ですはいだいたい55文字とかカードの時がクリアできる数字ですかねはいちょっとなんか目安言うのやめてもらっていいですかしりとりのハウスルームも説明していきますラッパなきゃとかの場合はパンだって答えいけないです"
        },
        {
          "speechId": 286,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3810000,
          "sourceEndMs": 3858980,
          "text": "伸ばし棒は前の文字の母音として扱いますスーパーだったら赤から付けてください小文字は大文字と同じ扱いをしますパーティーだったらいいから始めてください複数の言葉をつなげた言葉NGです大きい鳥だったり東京の人だったりただです全体ねで一つの名刺や作品名になっているものはOKですだるまさんが転んだ化け物の子などの作品名であればOKですまた注意していただきたいのがMCやスタッフの知らない言葉はNGとなります専門的な単語だったりマイナーな作品名用語など本当にある言葉かスタッフが調査する場合時間になるのでそのままタイムロスとして扱います[音楽]"
        },
        {
          "speechId": 287,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3859319,
          "sourceEndMs": 3880440,
          "text": "OKえーっとですねまた何か考えてるみんなまた何か食えるくんが考えてるよ75文字ですもんね最初の音をこっちが決めていいとかそんなレベルじゃないんで5"
        },
        {
          "speechId": 288,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3881880,
          "sourceEndMs": 3899180,
          "text": "文字で繋ぎきらないとクリアできないと思っくださいて5文字を毎回5文字4文字でも危ないと思った方がですね5回紡ぐと無理って難しい"
        },
        {
          "speechId": 289,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3901099,
          "sourceEndMs": 3906980,
          "text": "だからそこ今ちょっと5文字しりとり3人でくださいやってみて"
        },
        {
          "speechId": 290,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3911940,
          "sourceEndMs": 3915200,
          "text": "22リトアニアとか"
        },
        {
          "speechId": 291,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3915960,
          "sourceEndMs": 3920839,
          "text": "貧乏ダンスは続けほしいてです"
        },
        {
          "speechId": 292,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3928830,
          "sourceEndMs": 3932040,
          "text": "[音楽]"
        },
        {
          "speechId": 293,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3950299,
          "sourceEndMs": 3956420,
          "text": "34秒ぐらいに1個ずつ5文字が出ていけば多分いけるのかな"
        },
        {
          "speechId": 294,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3957020,
          "sourceEndMs": 3965359,
          "text": "運動会すごいそうされてたらダメなんだよ"
        },
        {
          "speechId": 295,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3965700,
          "sourceEndMs": 3968119,
          "text": "だから"
        },
        {
          "speechId": 296,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3972839,
          "sourceEndMs": 3976400,
          "text": "あの有名なゲーム"
        },
        {
          "speechId": 297,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3976440,
          "sourceEndMs": 3992160,
          "text": "1個出てるんだけどあれだからちょっとあれなんだけどそれはね出せないなって思ったからなかなかねラノベだっ長かっのタイトルとかたらたりするけどと思うんですなんか長いとね"
        },
        {
          "speechId": 298,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 3994819,
          "sourceEndMs": 4000760,
          "text": "あるんだけどな結構ね国の名前とかいっぱいけどあるよそう国の名前あるんだ"
        },
        {
          "speechId": 299,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4003980,
          "sourceEndMs": 4007420,
          "text": "別のやつでちゃんとあるよ"
        },
        {
          "speechId": 300,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4009220,
          "sourceEndMs": 4032799,
          "text": "行くしかないですね本番が始まったのこれも出す私躊躇なく頭がね回り始めるそんなそう言ってはいけないワードもガンガン出していくからそれこれをクリアするためにはいいですよ[笑い]染めてよそこは怖くなっちゃったしじゃあまあ私のチャンネルなんでね"
        },
        {
          "speechId": 301,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4033920,
          "sourceEndMs": 4037240,
          "text": "察してくれると思って聞いときます"
        },
        {
          "speechId": 302,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4043579,
          "sourceEndMs": 4075200,
          "text": "長い文字を知ってるやつすごく長い文字を知ってる人この中で自分の人生の中で一番長い文字って何みんなスーパーカリフラチャリスティックSPRちょっと判定が入るんでNGですねじゃあ23時の2から始まって2時3時の字で終わります一番長いやつに何文字来るかっていうところねOK"
        },
        {
          "speechId": 303,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4076760,
          "sourceEndMs": 4083740,
          "text": "いきますよはい皆さん並んでください実はもうすぐ私終電の時間"
        },
        {
          "speechId": 304,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4084339,
          "sourceEndMs": 4106359,
          "text": "大丈夫大丈夫ですでは伸ばしてしりとりでファイナルステージ最初の文字が2最後の文字が字OK90秒以内で75文字伸ばしてしりとりでスタート"
        },
        {
          "speechId": 305,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4108440,
          "sourceEndMs": 4118669,
          "text": "ですニュートロンジャマーキャンセラー正解になりました[音楽]"
        },
        {
          "speechId": 306,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4119920,
          "sourceEndMs": 4125980,
          "text": "アベニュープロジェクト正解しましょうと"
        },
        {
          "speechId": 307,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4126080,
          "sourceEndMs": 4134080,
          "text": "[音楽]東京ドームホテル長いですかね"
        },
        {
          "speechId": 308,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4135109,
          "sourceEndMs": 4138159,
          "text": "[音楽]"
        },
        {
          "speechId": 309,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4139699,
          "sourceEndMs": 4156580,
          "text": "ルービックキューブいけるルービックキューブでここだ注文しない[音楽]ブロック"
        },
        {
          "speechId": 310,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4160219,
          "sourceEndMs": 4165779,
          "text": "崩しOKえーっと[音楽]"
        },
        {
          "speechId": 311,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4169819,
          "sourceEndMs": 4172779,
          "text": "勝負"
        },
        {
          "speechId": 312,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4175120,
          "sourceEndMs": 4179120,
          "text": "あのー神経"
        },
        {
          "speechId": 313,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4184310,
          "sourceEndMs": 4187529,
          "text": "[音楽]"
        },
        {
          "speechId": 314,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4192240,
          "sourceEndMs": 4200390,
          "text": "[音楽]"
        },
        {
          "speechId": 315,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4207219,
          "sourceEndMs": 4217600,
          "text": "これは最後さチャレンジ失敗です9点取ったまであるよ"
        },
        {
          "speechId": 316,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4221440,
          "sourceEndMs": 4238000,
          "text": "ここは天国かなすごいはい全てが白い残念ながら美しいクリアはいすることができませんでしたいや見てくださいよ残り11文字だって強いですか"
        },
        {
          "speechId": 317,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4239080,
          "sourceEndMs": 4248980,
          "text": "みんなが力を合わせればもうすぐでクリアするところまで行けたって2個手に入れてたらこれリーチで終わりですもんね"
        },
        {
          "speechId": 318,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4249699,
          "sourceEndMs": 4253659,
          "text": "誰が間違えたかちょっと今から"
        },
        {
          "speechId": 319,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4253820,
          "sourceEndMs": 4257080,
          "text": "やめようやめようやめよう"
        },
        {
          "speechId": 320,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4259600,
          "sourceEndMs": 4264840,
          "text": "[笑い]"
        },
        {
          "speechId": 321,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4266960,
          "sourceEndMs": 4278560,
          "text": "はいというわけでクリアすることはできませんでした改めまして今回挑戦者3名の皆さんいかがでしたでしょうか楽しかったですね"
        },
        {
          "speechId": 322,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4280179,
          "sourceEndMs": 4333080,
          "text": "それぞれが得意分野があってそれが結構運で特にこのパネル開けるやつがあるんでこう運命力がちょっと足んなかったのかな負けるそしてですね最後に告知の方ができるかなちょっと画像の方出していただくんですけどもまず家族パロディボイスが5月4日から6月4日まで出ていますこれ写真を撮らせていただきましたのよろしくでお願いします出してる人はいはいオリバーさんとレインさんですありがとうございますそしてもう一つテーマパークボイス5月20日から6月4日まで販売しております1人従業員になりますねとてもはい出してる人探しております買う"
        },
        {
          "speechId": 323,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4336620,
          "sourceEndMs": 4340900,
          "text": "側でやりましょう我々そうですね"
        },
        {
          "speechId": 324,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4342520,
          "sourceEndMs": 4351820,
          "text": "今これで一通りパニックキューブ終了しましたこの企画は私のチャンネルで不定期に実施させていただいております"
        },
        {
          "speechId": 325,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4351940,
          "sourceEndMs": 4360050,
          "text": "ぜひチャンネル登録をよろしくお願いしますよろしくお願いしますよろしくおいたし願います[音楽]"
        },
        {
          "speechId": 326,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4365480,
          "sourceEndMs": 4368560,
          "text": "めちゃくちゃ優しくしましたからね"
        },
        {
          "speechId": 327,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4370410,
          "sourceEndMs": 4373550,
          "text": "[音楽]"
        },
        {
          "speechId": 328,
          "sourceVideoId": "O4ryDQBcMDc",
          "sourceStartMs": 4374360,
          "sourceEndMs": 4420189,
          "text": "壊れないでくれるはいというわけで以上天ぷら頭のラビリンスパニックキューブ3Dでしたありがとうございましたありがとうございましたそれではまた[音楽]"
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
