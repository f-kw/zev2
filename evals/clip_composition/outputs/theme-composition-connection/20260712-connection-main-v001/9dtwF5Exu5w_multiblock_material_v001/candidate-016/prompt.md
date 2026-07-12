# clip_composition_prompt_v012

あなたは切り抜き区間選択だけを担当する。

## 目的

固定済みテーマと文字起こしを見て、元動画内で切り抜きとして使う最終区間を選ぶ。

この評価では、実在した切り抜き動画の選択に近い区間を選ぶ。発話の芯だけで切らず、オチの後に続く笑い、反応、余韻が切り抜きの視聴感を作っている場合は、反応が収束するところまで含める。

## 入力の読み方

- テーマは固定入力であり、新しいテーマを作らない。
- 正解区間、評価結果、代表発話IDは入力に含まれない。
- `title` と `summary` は場面の内容を識別するための説明として読む。
- `compositionNote` は、どの場面を切り抜き対象にするかの補助説明として読む。
- `compositionNote` に未解決区間や除外区間の扱いが書かれている場合は、その指示に従う。
- `candidateSpeechIds` は探索してよい範囲であり、すべてを使う義務ではない。
- `isThemeCandidate` は候補範囲の印であり、最終区間に含めるべき印ではない。
- 1文字ずつ分かれた発話は、連続する文字をつないで文として読む。
- `笑` だけの発話は、発話本文ではなく反応や余韻を表す非発話シグナルとして読む。
- 選べる範囲は、入力された文字起こしの発話時刻に基づく。

## 判断方針

- 切り抜きとして単独で意味が通る、最小の素材区間を選ぶ。
- テーマの中心場面が元動画内の離れた位置に複数ある場合は、1本の連続区間へ無理につながず、離れた場面ごとに別々の `selectedCuts` として返す。
- 1つの `selectedCuts` は、元動画内で連続した素材対応を表す。同じ場面内の間、言い淀み、短い詰め、同じ反応の余韻は、それだけを理由に別区間へ分けない。
- 区間を採用するか除外するかは、長さではなく、前後の区間と意味が連続しているかで判断する。
- 開始位置は、切り抜き対象のフリ、状況説明、反応が始まる最初の発話にする。
- 候補範囲の先頭にある、前文の残り、無関係な相づち、言い淀みだけの断片は含めない。
- ただし、後のオチや反応を理解するために必要なフリや評価語は含める。
- 終了位置は、中心発話が終わった瞬間ではなく、その直後の笑い、反応、余韻が収束する最後の時刻にする。
- 終端側に笑い声や反応が続く場合は、切り抜きのオチとして必要な範囲を含める。
- 笑い声や余韻が長く続く場合は、同じ反応が明確に引き伸ばされている範囲までを含め、別の話題へ移った部分は含めない。
- 導入だけ、オチだけ、または文脈が切れた区間を避ける。
- 開始位置と終了位置はミリ秒で返す。

## reasonの書き方

各 `selectedCuts` の `reason` には、最低限次を入れる。

- 開始根拠を1文で書く。
- 終了根拠を1文で書く。
- 除外した区間や、選ばなかった近接候補がある場合は、その判断を1文で書く。

`reason` は1つの文字列として返す。追加フィールドは作らない。

## usedSpeechIdsの書き方

`usedSpeechIds` には、選んだ区間の根拠にした発話IDを入れる。

- 連続する発話IDは `"12-47"` のような範囲文字列で返す。
- 不連続な発話IDは、個別の数値として同じ配列に入れる。
- 連続範囲と個別IDを混ぜてよい。例: `"usedSpeechIds": ["12-47", 52, "55-60"]`
- 同時発話や割り込み発話など、使わない発話IDが途中にある場合は、1本の範囲にまとめず、不連続な集合として表す。

## 架空例1: 単一区間

入力の要点:

```json
{
  "selectedTheme": {
    "title": "活動を続けるための現実的な条件",
    "compositionNote": "質問への現実的な回答が単独で伝わる範囲を選ぶ。"
  },
  "transcript": {
    "segments": [
      { "speechId": 10, "sourceStartMs": 10000, "sourceEndMs": 11200, "text": "えっと質問来てるね", "isThemeCandidate": true },
      { "speechId": 11, "sourceStartMs": 11200, "sourceEndMs": 14800, "text": "毎月続けるなら数字より生活できるかが先だと思う", "isThemeCandidate": true },
      { "speechId": 12, "sourceStartMs": 14800, "sourceEndMs": 16600, "text": "そこが無理なら無理しない方がいい", "isThemeCandidate": true },
      { "speechId": 13, "sourceStartMs": 19000, "sourceEndMs": 20500, "text": "次の話いこう", "isThemeCandidate": false }
    ]
  }
}
```

望ましい出力:

```json
{
  "selectedCuts": [
    {
      "sourceStartMs": 10000,
      "sourceEndMs": 16600,
      "reason": "開始根拠: 質問を受けて回答に入る発話から始まるためです。終了根拠: 現実的な条件への結論が収束する発話まで含めるためです。除外判断: 次の話題へ移る発話は別話題なので含めません。",
      "usedSpeechIds": ["10-12"]
    }
  ]
}
```

## 架空例2: 複数区間

入力の要点:

```json
{
  "selectedTheme": {
    "title": "同じテーマを離れた場面で補足する流れ",
    "compositionNote": "離れた2場面を、無関係な中間部分を除外して扱う。"
  },
  "transcript": {
    "segments": [
      { "speechId": 20, "sourceStartMs": 40000, "sourceEndMs": 42700, "text": "まず最低限これがないと続かない", "isThemeCandidate": true },
      { "speechId": 21, "sourceStartMs": 42700, "sourceEndMs": 45100, "text": "理想論じゃなくて生活の話ね", "isThemeCandidate": true },
      { "speechId": 22, "sourceStartMs": 70000, "sourceEndMs": 73000, "text": "全然別の雑談をしている", "isThemeCandidate": false },
      { "speechId": 50, "sourceStartMs": 125000, "sourceEndMs": 128400, "text": "さっきの話に戻ると見栄より続けられる形が大事", "isThemeCandidate": true },
      { "speechId": 51, "sourceStartMs": 128400, "sourceEndMs": 131200, "text": "そこを間違えると長く持たない", "isThemeCandidate": true }
    ]
  }
}
```

望ましい出力:

```json
{
  "selectedCuts": [
    {
      "sourceStartMs": 40000,
      "sourceEndMs": 45100,
      "reason": "開始根拠: テーマの前提を置く発話から始まるためです。終了根拠: 生活の話として意味が閉じる発話まで含めるためです。除外判断: 中間の別雑談はテーマの素材ではないので連続区間としてつなぎません。",
      "usedSpeechIds": ["20-21"]
    },
    {
      "sourceStartMs": 125000,
      "sourceEndMs": 131200,
      "reason": "開始根拠: 先ほどのテーマに戻る発話から始まるためです。終了根拠: 続けられる形が大事という補足の結論まで含めるためです。除外判断: 前の素材区間とは元動画内で離れているため別のselectedCutsとして返します。",
      "usedSpeechIds": ["50-51"]
    }
  ]
}
```

## 出力

JSONだけを返す。説明文、Markdown、コードフェンスは付けない。

```json
{
  "selectedCuts": [
    {
      "sourceStartMs": 123000,
      "sourceEndMs": 153000,
      "reason": "開始根拠: この区間を始める理由。終了根拠: この区間を終える理由。除外判断: 除外した近接候補がある場合の理由。",
      "usedSpeechIds": ["1-3"]
    }
  ]
}
```

## 入力JSON

```json
{
  "task": "fixed_theme_clip_interval_selection",
  "evaluationInputId": "o8rZAhARXAc-theme-candidate-016",
  "sourceVideoId": "o8rZAhARXAc",
  "selectedTheme": {
    "id": "input-selection-v004-candidate-016",
    "title": "新球種の性能に迷いすぎて1時間経過するマリン船長",
    "summary": "オリジナル変化球の重さなどの調整に悩み、リスナーへの投票を交えながら1時間も迷っていたことを明かして謝罪する場面。",
    "candidateSpeechIds": [
      375,
      376,
      381,
      382,
      383,
      384,
      385,
      386,
      387,
      388,
      389,
      390
    ],
    "whyItCanBeClipped": "オリジナル変化球の重さなどの調整に悩み、リスナーへの投票を交えながら1時間も迷っていたことを明かして謝罪する場面。",
    "compositionNote": "提示された候補発話範囲の中から、テーマが単独で成立する最小区間を選ぶ。"
  },
  "transcript": {
    "language": "ja-JP",
    "durationSec": 11898.441,
    "speechUnitGroups": [
      [
        360,
        361,
        362,
        363,
        364,
        365,
        366,
        367,
        368,
        369,
        370,
        371,
        372,
        373,
        374,
        375,
        376,
        377,
        378,
        379,
        380,
        381,
        382,
        383,
        384,
        385,
        386,
        387,
        388,
        389,
        390,
        391,
        392,
        393,
        394,
        395,
        396,
        397,
        398,
        399,
        400,
        401,
        402,
        403,
        404,
        405,
        406,
        407,
        408,
        409,
        410,
        411,
        412,
        413,
        414,
        415,
        416,
        417,
        418,
        419,
        420,
        421,
        422,
        423,
        424,
        425,
        426,
        427,
        428,
        429,
        430,
        431,
        432,
        433,
        434,
        435,
        436,
        437,
        438,
        439,
        440,
        441,
        442,
        443,
        444,
        445,
        446,
        447,
        448,
        449,
        450,
        451,
        452,
        453,
        454,
        455,
        456
      ]
    ],
    "segments": [
      {
        "speechId": 360,
        "sourceStartMs": 3813170,
        "sourceEndMs": 3816493,
        "text": "さっきのがベストだった?",
        "isThemeCandidate": false
      },
      {
        "speechId": 361,
        "sourceStartMs": 3816493,
        "sourceEndMs": 3822197,
        "text": "いらない派もいれば、いる派もいて、ちょっと欲しいと思っちゃう?",
        "isThemeCandidate": false
      },
      {
        "speechId": 362,
        "sourceStartMs": 3822197,
        "sourceEndMs": 3837229,
        "text": "さっきのまんでいいのかもね最初にやろうとしてた100ピッタだったし100ピッタだったしね",
        "isThemeCandidate": false
      },
      {
        "speechId": 363,
        "sourceStartMs": 3845475,
        "sourceEndMs": 3869720,
        "text": "これがさっき最初のもともとやろうとしてたやつなこれなこれなこれこれな違いがわからないそれなガチでガチ違いわからんそれなんだよなはいはい",
        "isThemeCandidate": false
      },
      {
        "speechId": 364,
        "sourceStartMs": 3871698,
        "sourceEndMs": 3882024,
        "text": "ふぶちゃんは球も速いし球種も多く変化してもらうのでオリジナル球種をほとんど投げないのでもったいないあ、もうそこから?",
        "isThemeCandidate": false
      },
      {
        "speechId": 365,
        "sourceStartMs": 3882024,
        "sourceEndMs": 3882985,
        "text": "そこまで戻る?",
        "isThemeCandidate": false
      },
      {
        "speechId": 366,
        "sourceStartMs": 3882985,
        "sourceEndMs": 3885306,
        "text": "ふぶちゃんにするのがもったいないから始まる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 367,
        "sourceStartMs": 3885306,
        "sourceEndMs": 3897854,
        "text": "またなるほどカーブとフォークは目的が違うのでフォークは空振りカーブはどちらかと言えばボンダーを取りに行くボンダー?",
        "isThemeCandidate": false
      },
      {
        "speechId": 368,
        "sourceStartMs": 3902410,
        "sourceEndMs": 3929820,
        "text": "えっと、急所なのでフォークと比べれば重さは必要なくカーブはストライクを取るよりははいはいはいあ、ボテボテのゴロあー、あーなるほどナイアゴロなるほどなるほどはははしたらうんうんうんうんってことはやっぱり重さは",
        "isThemeCandidate": false
      },
      {
        "speechId": 369,
        "sourceStartMs": 3933714,
        "sourceEndMs": 3959700,
        "text": "フープだから重さはそんなにいらないよなのねうんOKOKはいはいはいはいふんふんフープさんはキレの金属持ってるんでキレはあった方がいい重さはマスト打たれるとき飛びにくいが軌道が下振れになるのでフォークと相性いいけどフォークは相性普通なんで好みで振っていい変化は",
        "isThemeCandidate": false
      },
      {
        "speechId": 370,
        "sourceStartMs": 3960174,
        "sourceEndMs": 3989420,
        "text": "空振りさせやすいそっかじゃあもう空振りさせたるぞこれって感じでうんうんうん逆お、うんなるほどうーんなるほどね変化量増えすぎてフォアボール増えるのも怖いあーなるほどうんうんうんうんうんうんうんうんうん",
        "isThemeCandidate": false
      },
      {
        "speechId": 371,
        "sourceStartMs": 3991622,
        "sourceEndMs": 4007146,
        "text": "パワーカーブで行くならそのままが一番ベストですこれで行きましょう変化量少なくて重さを最大にしたいならナックルを折り辺にした方がいいです重さよりも",
        "isThemeCandidate": false
      },
      {
        "speechId": 372,
        "sourceStartMs": 4047799,
        "sourceEndMs": 4049960,
        "text": "めっちゃ飛ばないで欲しいなら重さに",
        "isThemeCandidate": false
      },
      {
        "speechId": 373,
        "sourceStartMs": 4052862,
        "sourceEndMs": 4071314,
        "text": "カーブはそもそも飛びづらいからそんなに重さに振らなくていいってみんな言ってんだだから重さは減らしてよくて変化を上げて重さを下げて",
        "isThemeCandidate": false
      },
      {
        "speechId": 374,
        "sourceStartMs": 4081634,
        "sourceEndMs": 4094980,
        "text": "と、飛ぶ、飛ぶ、飛ば、なくて、あーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあーあー",
        "isThemeCandidate": false
      },
      {
        "speechId": 375,
        "sourceStartMs": 4096310,
        "sourceEndMs": 4105949,
        "text": "ちょっとな、なや、なや、悩んでてえっとーえっとーえっとーえっとーうーんとー",
        "isThemeCandidate": true
      },
      {
        "speechId": 376,
        "sourceStartMs": 4110482,
        "sourceEndMs": 4139500,
        "text": "分かんない分かんない分かんないなちょっと全然分かんないな重さ変化ブレーキ変化",
        "isThemeCandidate": true
      },
      {
        "speechId": 377,
        "sourceStartMs": 4142230,
        "sourceEndMs": 4160724,
        "text": "これがさっきやろうとしたやつがこれかさっきやろうとしたのがこれかじゃこれ、これがじゃこれが重く重さ削ったバージョンねどっちがいいと思う?",
        "isThemeCandidate": false
      },
      {
        "speechId": 378,
        "sourceStartMs": 4160724,
        "sourceEndMs": 4168490,
        "text": "重さ重さ重いやつと変化",
        "isThemeCandidate": false
      },
      {
        "speechId": 379,
        "sourceStartMs": 4170238,
        "sourceEndMs": 4185730,
        "text": "1増えるやつはい変化1増えるやつがこれブレーキは逆?",
        "isThemeCandidate": false
      },
      {
        "speechId": 380,
        "sourceStartMs": 4185730,
        "sourceEndMs": 4194998,
        "text": "そうかブレーキは逆かブレーキは逆効果投げてみて分かった投げるわ",
        "isThemeCandidate": false
      },
      {
        "speechId": 381,
        "sourceStartMs": 4200714,
        "sourceEndMs": 4207479,
        "text": "1でどれくらいかマジ分からんマリン的に見た目じゃちょっとよく分かんないこれだ!",
        "isThemeCandidate": true
      },
      {
        "speechId": 382,
        "sourceStartMs": 4207479,
        "sourceEndMs": 4212203,
        "text": "えいっおーなんかいいねーなんか知らんけど良さげー!",
        "isThemeCandidate": true
      },
      {
        "speechId": 383,
        "sourceStartMs": 4212203,
        "sourceEndMs": 4215045,
        "text": "強そう!",
        "isThemeCandidate": true
      },
      {
        "speechId": 384,
        "sourceStartMs": 4215045,
        "sourceEndMs": 4226753,
        "text": "強そうですこれうんこれ強そうなんか強そうです!",
        "isThemeCandidate": true
      },
      {
        "speechId": 385,
        "sourceStartMs": 4226753,
        "sourceEndMs": 4227534,
        "text": "うん!",
        "isThemeCandidate": true
      },
      {
        "speechId": 386,
        "sourceStartMs": 4232807,
        "sourceEndMs": 4259478,
        "text": "さらに下行ってる重いやつを見せるOKじゃあ重いバージョンがこれですいくよ重い方はこうだドスンと落ちていく感じがありますねはいどうでしょうかさっきとはまた違う",
        "isThemeCandidate": true
      },
      {
        "speechId": 387,
        "sourceStartMs": 4260438,
        "sourceEndMs": 4289960,
        "text": "同じにしか見えないけどまた違うこのドスンと落ちていくんですこれということで重いわーこれよりも重いは言うとりますということでさあ皆さんこんなに違うこの2球種果たしてどっちがいいかさあ決めてまいりましょうそれでは皆さん投票で",
        "isThemeCandidate": true
      },
      {
        "speechId": 388,
        "sourceStartMs": 4290554,
        "sourceEndMs": 4319580,
        "text": "いきますよ10987654321では締め切りますはい皆さんたくさんの投票どうもありがとうございましたということでこの変化球はこれでいきますこちらの",
        "isThemeCandidate": true
      },
      {
        "speechId": 389,
        "sourceStartMs": 4321194,
        "sourceEndMs": 4348170,
        "text": "重さを削った方でいこうと思いますはいちょっとマジでわかんないけどうーんまあこれでいいということでうーん意見もよう割れたはいじゃあこれでOKで作りたいと思います",
        "isThemeCandidate": true
      },
      {
        "speechId": 390,
        "sourceStartMs": 4350706,
        "sourceEndMs": 4379860,
        "text": "えー新旧宿発ボールをはいそしてスロットに登録はいします1時間1時間経っちゃったやばいこれで1時間経っちゃったこれ迷いすぎてすいませんどうも迷いましためっちゃはい迷いましためっちゃありがとうございましたでは行きたいと思いますこれをふぶちゃんに応募させます迷いに迷った末にもう誰に応募させるかどんな弾を作るかで非常に",
        "isThemeCandidate": true
      },
      {
        "speechId": 391,
        "sourceStartMs": 4381338,
        "sourceEndMs": 4408126,
        "text": "ましたがこれで行きたいと思います甲子園はお待たせしましたこれから甲子園です大変お待たせしました初めての出来事だったいやでもありがたいことやでこんな良さげなアイテムが出たってきたっていうのはじゃあオリジナル球種習得ボールってこれをフブちゃんに覚えさせてそしてフブちゃんに今からこれを一生懸命練習指示来てくれないとまずいでこれ",
        "isThemeCandidate": false
      },
      {
        "speechId": 392,
        "sourceStartMs": 4411310,
        "sourceEndMs": 4439900,
        "text": "練習指示来ないと厳しいねかなりうんあでも今コントロールアップしてんのがうん行きましょうふぶちゃんについに行っちゃいましょうはいスーパーノヴァ行きましょううおースーパーノヴァ覚えたスーパーノヴァ",
        "isThemeCandidate": false
      },
      {
        "speechId": 393,
        "sourceStartMs": 4445458,
        "sourceEndMs": 4466549,
        "text": "わーお、脅威の切れ味でキレキレのスーパーノヴァをフブちゃん投げていく楽しいですねえ、これ、待って、これさ、あのさこれさ、きまし、あのさこれさ、1で、1でこの社員やって、もっかいスケジュール見直して1を狙う?",
        "isThemeCandidate": false
      },
      {
        "speechId": 394,
        "sourceStartMs": 4466549,
        "sourceEndMs": 4467570,
        "text": "星500乗った?",
        "isThemeCandidate": false
      },
      {
        "speechId": 395,
        "sourceStartMs": 4467570,
        "sourceEndMs": 4467950,
        "text": "ま?",
        "isThemeCandidate": false
      },
      {
        "speechId": 396,
        "sourceStartMs": 4471494,
        "sourceEndMs": 4472255,
        "text": "これMVPやっぞ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 397,
        "sourceStartMs": 4472255,
        "sourceEndMs": 4474217,
        "text": "MVPやっぞ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 398,
        "sourceStartMs": 4474217,
        "sourceEndMs": 4483247,
        "text": "1やってつけへんオッケオッケオッケオッケ行きましょう!",
        "isThemeCandidate": false
      },
      {
        "speechId": 399,
        "sourceStartMs": 4483247,
        "sourceEndMs": 4486111,
        "text": "お、ミゾット社員フジキ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 400,
        "sourceStartMs": 4486111,
        "sourceEndMs": 4487272,
        "text": "お、機材交換!",
        "isThemeCandidate": false
      },
      {
        "speechId": 401,
        "sourceStartMs": 4487272,
        "sourceEndMs": 4488574,
        "text": "ティ待って?",
        "isThemeCandidate": false
      },
      {
        "speechId": 402,
        "sourceStartMs": 4488574,
        "sourceEndMs": 4488894,
        "text": "ティ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 403,
        "sourceStartMs": 4505322,
        "sourceEndMs": 4509563,
        "text": "タブってるがなタブってますがな!",
        "isThemeCandidate": false
      },
      {
        "speechId": 404,
        "sourceStartMs": 4509563,
        "sourceEndMs": 4510564,
        "text": "ティーは壊れるからアリ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 405,
        "sourceStartMs": 4510564,
        "sourceEndMs": 4520507,
        "text": "そっかアリかほなええかスケジュール見直しでもう一回行きますか予備ってことだよね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 406,
        "sourceStartMs": 4520507,
        "sourceEndMs": 4528950,
        "text": "おっけおっけおっけあ、いいじゃんどっちにしよう?",
        "isThemeCandidate": false
      },
      {
        "speechId": 407,
        "sourceStartMs": 4528950,
        "sourceEndMs": 4529390,
        "text": "励ますか",
        "isThemeCandidate": false
      },
      {
        "speechId": 408,
        "sourceStartMs": 4530694,
        "sourceEndMs": 4559780,
        "text": "紅白線か走り込みか何で行こうこれいっぱい来た紅白線OKミムラ頼むぜマジでもうミムラは2回連続で美中を変えようとしてきたから次美中って言ったらお前のその色違いの眉毛むしりとるぞ何がかゆんや",
        "isThemeCandidate": false
      },
      {
        "speechId": 409,
        "sourceStartMs": 4560918,
        "sourceEndMs": 4565341,
        "text": "しばき倒されたくなかったらいい加減にしろお前ラオラ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 410,
        "sourceStartMs": 4565341,
        "sourceEndMs": 4565902,
        "text": "ごく普通?",
        "isThemeCandidate": false
      },
      {
        "speechId": 411,
        "sourceStartMs": 4565902,
        "sourceEndMs": 4566782,
        "text": "え?",
        "isThemeCandidate": false
      },
      {
        "speechId": 412,
        "sourceStartMs": 4566782,
        "sourceEndMs": 4570005,
        "text": "どうしよう?",
        "isThemeCandidate": false
      },
      {
        "speechId": 413,
        "sourceStartMs": 4570005,
        "sourceEndMs": 4572187,
        "text": "え、君たちラオラって変えるべき?",
        "isThemeCandidate": false
      },
      {
        "speechId": 414,
        "sourceStartMs": 4572187,
        "sourceEndMs": 4574869,
        "text": "変えないべき?",
        "isThemeCandidate": false
      },
      {
        "speechId": 415,
        "sourceStartMs": 4574869,
        "sourceEndMs": 4578431,
        "text": "気持ちいいどう思う?",
        "isThemeCandidate": false
      },
      {
        "speechId": 416,
        "sourceStartMs": 4578431,
        "sourceEndMs": 4582574,
        "text": "ねぇ気持ちいいあかん?",
        "isThemeCandidate": false
      },
      {
        "speechId": 417,
        "sourceStartMs": 4582574,
        "sourceEndMs": 4582915,
        "text": "ダメ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 418,
        "sourceStartMs": 4582915,
        "sourceEndMs": 4584276,
        "text": "もったいない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 419,
        "sourceStartMs": 4584276,
        "sourceEndMs": 4585877,
        "text": "ごく普通は残す?",
        "isThemeCandidate": false
      },
      {
        "speechId": 420,
        "sourceStartMs": 4585877,
        "sourceEndMs": 4589420,
        "text": "わ、わかったそうするか変えないでいいか",
        "isThemeCandidate": false
      },
      {
        "speechId": 421,
        "sourceStartMs": 4590066,
        "sourceEndMs": 4592167,
        "text": "気になっても仕方ないあるか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 422,
        "sourceStartMs": 4592167,
        "sourceEndMs": 4597071,
        "text": "それは確かにあ、だ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 423,
        "sourceStartMs": 4597071,
        "sourceEndMs": 4602755,
        "text": "いけいけないバイバイねえ、これ何がいらない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 424,
        "sourceStartMs": 4602755,
        "sourceEndMs": 4603855,
        "text": "気持ち!",
        "isThemeCandidate": false
      },
      {
        "speechId": 425,
        "sourceStartMs": 4603855,
        "sourceEndMs": 4606677,
        "text": "これ何がいらなーい?",
        "isThemeCandidate": false
      },
      {
        "speechId": 426,
        "sourceStartMs": 4606677,
        "sourceEndMs": 4619066,
        "text": "占い師も使えねえな、いつみむらしばき倒すぞ、ほんまにえんとう、わかったえんとう、遠藤くんでいくわ遠藤くんで遠藤くんでいくうん",
        "isThemeCandidate": false
      },
      {
        "speechId": 427,
        "sourceStartMs": 4622026,
        "sourceEndMs": 4649940,
        "text": "おー1、待って26、27、28、29あ、もう無理だ青マスなかったインタビューはもうないんだエントー君で行ってさあ合宿だ監督、今日から合宿です頑張りましょうかーこーお、やめろスワとフル",
        "isThemeCandidate": false
      },
      {
        "speechId": 428,
        "sourceStartMs": 4651086,
        "sourceEndMs": 4662938,
        "text": "シャシャるなぁお前シャシャってくんななんでシャシャってきちゃったのどうしよう何がいいかなシオレンマリンが邪魔で見えない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 429,
        "sourceStartMs": 4662938,
        "sourceEndMs": 4664620,
        "text": "マジそれじゃん失礼しました",
        "isThemeCandidate": false
      },
      {
        "speechId": 430,
        "sourceStartMs": 4665958,
        "sourceEndMs": 4677797,
        "text": "邪魔でしたどこにいたらいいかわかんねぇここにいよここにいとこ何がいいかなぁ",
        "isThemeCandidate": false
      },
      {
        "speechId": 431,
        "sourceStartMs": 4680822,
        "sourceEndMs": 4687906,
        "text": "スワにキャッチャーついたってな意味ないから走り込み消そう?",
        "isThemeCandidate": false
      },
      {
        "speechId": 432,
        "sourceStartMs": 4687906,
        "sourceEndMs": 4709200,
        "text": "確かにこれいらないかこのどうせついたってしょうがないだろみたいな時にまだこれからこいつらと甲子園行くから甲子園まだ行くからミート?",
        "isThemeCandidate": false
      },
      {
        "speechId": 433,
        "sourceStartMs": 4709200,
        "sourceEndMs": 4709900,
        "text": "ミートもいらないじゃん",
        "isThemeCandidate": false
      },
      {
        "speechId": 434,
        "sourceStartMs": 4710002,
        "sourceEndMs": 4710742,
        "text": "ミートにするか!",
        "isThemeCandidate": false
      },
      {
        "speechId": 435,
        "sourceStartMs": 4710742,
        "sourceEndMs": 4711703,
        "text": "ミートに!",
        "isThemeCandidate": false
      },
      {
        "speechId": 436,
        "sourceStartMs": 4711703,
        "sourceEndMs": 4713523,
        "text": "左のミートでこっちか!",
        "isThemeCandidate": false
      },
      {
        "speechId": 437,
        "sourceStartMs": 4713523,
        "sourceEndMs": 4715744,
        "text": "これかん!",
        "isThemeCandidate": false
      },
      {
        "speechId": 438,
        "sourceStartMs": 4715744,
        "sourceEndMs": 4719666,
        "text": "こっちかん!",
        "isThemeCandidate": false
      },
      {
        "speechId": 439,
        "sourceStartMs": 4719666,
        "sourceEndMs": 4723728,
        "text": "左のミートこれな!",
        "isThemeCandidate": false
      },
      {
        "speechId": 440,
        "sourceStartMs": 4723728,
        "sourceEndMs": 4725088,
        "text": "しおりんがつくかもしんないもんね!",
        "isThemeCandidate": false
      },
      {
        "speechId": 441,
        "sourceStartMs": 4725088,
        "sourceEndMs": 4726249,
        "text": "わかった!",
        "isThemeCandidate": false
      },
      {
        "speechId": 442,
        "sourceStartMs": 4726249,
        "sourceEndMs": 4727229,
        "text": "じゃこれで行くわ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 443,
        "sourceStartMs": 4727229,
        "sourceEndMs": 4730931,
        "text": "こっち!",
        "isThemeCandidate": false
      },
      {
        "speechId": 444,
        "sourceStartMs": 4730931,
        "sourceEndMs": 4731671,
        "text": "お前かん!",
        "isThemeCandidate": false
      },
      {
        "speechId": 445,
        "sourceStartMs": 4731671,
        "sourceEndMs": 4732992,
        "text": "古川!",
        "isThemeCandidate": false
      },
      {
        "speechId": 446,
        "sourceStartMs": 4732992,
        "sourceEndMs": 4733332,
        "text": "すまー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 447,
        "sourceStartMs": 4733332,
        "sourceEndMs": 4734412,
        "text": "あ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 448,
        "sourceStartMs": 4734412,
        "sourceEndMs": 4735393,
        "text": "しおりん!",
        "isThemeCandidate": false
      },
      {
        "speechId": 449,
        "sourceStartMs": 4735393,
        "sourceEndMs": 4735933,
        "text": "ついた!",
        "isThemeCandidate": false
      },
      {
        "speechId": 450,
        "sourceStartMs": 4735933,
        "sourceEndMs": 4736373,
        "text": "カット打ち!",
        "isThemeCandidate": false
      },
      {
        "speechId": 451,
        "sourceStartMs": 4736373,
        "sourceEndMs": 4738494,
        "text": "ええやん!",
        "isThemeCandidate": false
      },
      {
        "speechId": 452,
        "sourceStartMs": 4741026,
        "sourceEndMs": 4764298,
        "text": "またつくやんいいやんスワはねまだねマリンのチームのね一軍ですからちょっと待ってもうホンダスワやる気出すなやばい3年生が強化されて意味ないどうしようしかもラオーラどうしようなうわどうしよう",
        "isThemeCandidate": false
      },
      {
        "speechId": 453,
        "sourceStartMs": 4770854,
        "sourceEndMs": 4779937,
        "text": "今のうちどうしよう3年生ばっか来る助けてこれどうしようこれダンベル?",
        "isThemeCandidate": false
      },
      {
        "speechId": 454,
        "sourceStartMs": 4779937,
        "sourceEndMs": 4780177,
        "text": "これ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 455,
        "sourceStartMs": 4780177,
        "sourceEndMs": 4785018,
        "text": "走り込むの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 456,
        "sourceStartMs": 4785018,
        "sourceEndMs": 4786338,
        "text": "これ?",
        "isThemeCandidate": false
      }
    ]
  },
  "outputContract": {
    "format": "json_only",
    "schema": {
      "selectedCuts": [
        {
          "sourceStartMs": "number",
          "sourceEndMs": "number",
          "reason": "string",
          "usedSpeechIds": [
            "number_or_range_string"
          ]
        }
      ]
    }
  }
}
```
