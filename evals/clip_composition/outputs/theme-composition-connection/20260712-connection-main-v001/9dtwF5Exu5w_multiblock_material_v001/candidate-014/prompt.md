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
  "evaluationInputId": "o8rZAhARXAc-theme-candidate-014",
  "sourceVideoId": "o8rZAhARXAc",
  "selectedTheme": {
    "id": "input-selection-v004-candidate-014",
    "title": "アドバイス起因の荒れを懸念し、こよりへの相談をやめるマリン",
    "summary": "こよりのアドバイスで育成がうまくいかなかった場合に彼女が叩かれるリスクを考慮し、優しさから相談をやめて星街すいせい（きまち）と決めることを選ぶ場面です。",
    "candidateSpeechIds": [
      354,
      355,
      356,
      357,
      358,
      359
    ],
    "whyItCanBeClipped": "こよりのアドバイスで育成がうまくいかなかった場合に彼女が叩かれるリスクを考慮し、優しさから相談をやめて星街すいせい（きまち）と決めることを選ぶ場面です。",
    "compositionNote": "提示された候補発話範囲の中から、テーマが単独で成立する最小区間を選ぶ。"
  },
  "transcript": {
    "language": "ja-JP",
    "durationSec": 11898.441,
    "speechUnitGroups": [
      [
        323,
        324,
        325,
        326,
        327,
        328,
        329,
        330,
        331,
        332,
        333,
        334,
        335,
        336,
        337,
        338,
        339,
        340,
        341,
        342,
        343,
        344,
        345,
        346,
        347,
        348,
        349,
        350,
        351,
        352,
        353,
        354,
        355,
        356,
        357,
        358,
        359,
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
        391
      ]
    ],
    "segments": [
      {
        "speechId": 323,
        "sourceStartMs": 3240258,
        "sourceEndMs": 3261814,
        "text": "これで名前はちょっと待ってフブちゃんの必殺技の名前フブちゃんの技の名前えっとちょっと待ってねホロウィッチのフブちゃんのホロウィッチ",
        "isThemeCandidate": false
      },
      {
        "speechId": 324,
        "sourceStartMs": 3285237,
        "sourceEndMs": 3285817,
        "text": "フブちゃんの技なんかやってなかった?",
        "isThemeCandidate": false
      },
      {
        "speechId": 325,
        "sourceStartMs": 3285817,
        "sourceEndMs": 3295742,
        "text": "ちょっと待ってね忘れるビーム忘れるビームはフブちゃんの技じゃなくて石丸くんの技やんけトリックスター?",
        "isThemeCandidate": false
      },
      {
        "speechId": 326,
        "sourceStartMs": 3308622,
        "sourceEndMs": 3328810,
        "text": "マリンの回の時のチャンフブチャンフブの技トリッキービクセン",
        "isThemeCandidate": false
      },
      {
        "speechId": 327,
        "sourceStartMs": 3345969,
        "sourceEndMs": 3352672,
        "text": "もうちょっと星っぽい名前がいいよトリックスターはあれだ心躍らすトリックスターって自分のスーパーノヴァいいね!",
        "isThemeCandidate": false
      },
      {
        "speechId": 328,
        "sourceStartMs": 3352672,
        "sourceEndMs": 3355694,
        "text": "スーパーノヴァいい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 329,
        "sourceStartMs": 3355694,
        "sourceEndMs": 3356514,
        "text": "スーパーノヴァにしよう",
        "isThemeCandidate": false
      },
      {
        "speechId": 330,
        "sourceStartMs": 3362262,
        "sourceEndMs": 3389062,
        "text": "星で加工をうか星で貼ってスーパー感じのがいいかな感じのがいいかなだから長いか",
        "isThemeCandidate": false
      },
      {
        "speechId": 331,
        "sourceStartMs": 3392459,
        "sourceEndMs": 3418214,
        "text": "あ、落ちるまた落ちた",
        "isThemeCandidate": false
      },
      {
        "speechId": 332,
        "sourceStartMs": 3422110,
        "sourceEndMs": 3438265,
        "text": "FPSが落ちるなぁ漢字で行くか!",
        "isThemeCandidate": false
      },
      {
        "speechId": 333,
        "sourceStartMs": 3438265,
        "sourceEndMs": 3439666,
        "text": "漢字じゃない!",
        "isThemeCandidate": false
      },
      {
        "speechId": 334,
        "sourceStartMs": 3439666,
        "sourceEndMs": 3440206,
        "text": "英語で行くか!",
        "isThemeCandidate": false
      },
      {
        "speechId": 335,
        "sourceStartMs": 3440206,
        "sourceEndMs": 3440407,
        "text": "英語で!",
        "isThemeCandidate": false
      },
      {
        "speechId": 336,
        "sourceStartMs": 3440407,
        "sourceEndMs": 3448674,
        "text": "1,2,3,4,5,6,7,8,9待って、9文字1,2,3これ、これいらない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 337,
        "sourceStartMs": 3456229,
        "sourceEndMs": 3472798,
        "text": "英語英語英語入るかこうちゃんとググってちゃんとググって見てるから大丈夫間に腰入れる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 338,
        "sourceStartMs": 3480150,
        "sourceEndMs": 3509840,
        "text": "ギリギリで草ギリギリすぎるだろこれぴったりだよこれぴったりどうかっこいいしどうですかぴったりふぶちゃんみこちが読めない読めるやろふぶちゃんの曲",
        "isThemeCandidate": false
      },
      {
        "speechId": 339,
        "sourceStartMs": 3511986,
        "sourceEndMs": 3520409,
        "text": "OKじゃあスーパーノヴァでもう一回投げてみよう",
        "isThemeCandidate": false
      },
      {
        "speechId": 340,
        "sourceStartMs": 3542099,
        "sourceEndMs": 3549262,
        "text": "いいかわいいいいのでは?",
        "isThemeCandidate": false
      },
      {
        "speechId": 341,
        "sourceStartMs": 3549262,
        "sourceEndMs": 3551303,
        "text": "これでいいのかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 342,
        "sourceStartMs": 3551303,
        "sourceEndMs": 3554885,
        "text": "キョウジいいと思う?",
        "isThemeCandidate": false
      },
      {
        "speechId": 343,
        "sourceStartMs": 3554885,
        "sourceEndMs": 3561748,
        "text": "意見大募集重さいらんえ、じゃあ重さなくして何あげんの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 344,
        "sourceStartMs": 3561748,
        "sourceEndMs": 3566910,
        "text": "重さいるって言ってる人もいるんだけどマジわからんのだけど何を取ればいいんだこれ",
        "isThemeCandidate": false
      },
      {
        "speechId": 345,
        "sourceStartMs": 3570914,
        "sourceEndMs": 3599054,
        "text": "重さ削って重さ削って変化上げてほしい重さ削って変化上げピッタリになんないんだよな98になっちゃう98になっちゃうんだよな急速上げれば100になる",
        "isThemeCandidate": false
      },
      {
        "speechId": 346,
        "sourceStartMs": 3603458,
        "sourceEndMs": 3627422,
        "text": "下げる上げるどっちか上げるか下げるブレーキってなんだブレーキ上げこう",
        "isThemeCandidate": false
      },
      {
        "speechId": 347,
        "sourceStartMs": 3633294,
        "sourceEndMs": 3637975,
        "text": "お重さが一番いる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 348,
        "sourceStartMs": 3637975,
        "sourceEndMs": 3645837,
        "text": "重さが一番いるの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 349,
        "sourceStartMs": 3645837,
        "sourceEndMs": 3659620,
        "text": "えー待って待ってえーフォークだと重さが大切って感じでカーブだとそもそも調度が出にくい球種なので重さがあんまりいらないって感じですだって多分フォークの変化球種しかやったことないからみんな重さ重さって言ってんのかなじゃあ",
        "isThemeCandidate": false
      },
      {
        "speechId": 350,
        "sourceStartMs": 3663138,
        "sourceEndMs": 3685038,
        "text": "こうなるんだって間違えた、これストレートこうなるらしいカーブでも重さはいるってもう分からんなマジ分からんなもうこれ",
        "isThemeCandidate": false
      },
      {
        "speechId": 351,
        "sourceStartMs": 3690566,
        "sourceEndMs": 3719880,
        "text": "諸説ありすぎて喧嘩になってるから助けてマジでマジわからんこよりー助けてよーわかんないよーこよりこよりー助けてーこよりー迷う迷うなこれー教科書持ちのこよりー教科書",
        "isThemeCandidate": false
      },
      {
        "speechId": 352,
        "sourceStartMs": 3720278,
        "sourceEndMs": 3723159,
        "text": "こっちのコヨリー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 353,
        "sourceStartMs": 3723159,
        "sourceEndMs": 3723879,
        "text": "助けてくれー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 354,
        "sourceStartMs": 3723879,
        "sourceEndMs": 3737903,
        "text": "んーさっき配信終わった?",
        "isThemeCandidate": true
      },
      {
        "speechId": 355,
        "sourceStartMs": 3737903,
        "sourceEndMs": 3742444,
        "text": "ヤワンちゃん来てくれるかもしれんうんあもう当初強いから適当でいいよコヨリは教えてくれない!",
        "isThemeCandidate": true
      },
      {
        "speechId": 356,
        "sourceStartMs": 3742444,
        "sourceEndMs": 3743864,
        "text": "コヨリは教えてくれないんだ!",
        "isThemeCandidate": true
      },
      {
        "speechId": 357,
        "sourceStartMs": 3743864,
        "sourceEndMs": 3749206,
        "text": "でも確かにコヨリの言う通りコヨリがこう言ったからこうしたでマリンがそうしてさそれでなんか",
        "isThemeCandidate": true
      },
      {
        "speechId": 358,
        "sourceStartMs": 3750062,
        "sourceEndMs": 3779014,
        "text": "なんかそれで何かうまくいかないことがあった時にコメントがこよりがわざと弱いの教えたとか言ってそれでわやわや言われたらうざいからやめとこう確かに聞かんとこうんやめとこうんこよりがわざとなんか弱いの教えたとか言われたら鬱陶しいからやめよううんどうしようじゃあきまちと決めるわそうしよううんそれがいいきまちと一緒に決めるうん",
        "isThemeCandidate": true
      },
      {
        "speechId": 359,
        "sourceStartMs": 3781954,
        "sourceEndMs": 3794866,
        "text": "それがいいよし、じゃあ重さいる説、いらない説重さいる説、いらない説キャッチドーンキャッチ",
        "isThemeCandidate": true
      },
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
        "isThemeCandidate": false
      },
      {
        "speechId": 376,
        "sourceStartMs": 4110482,
        "sourceEndMs": 4139500,
        "text": "分かんない分かんない分かんないなちょっと全然分かんないな重さ変化ブレーキ変化",
        "isThemeCandidate": false
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
        "isThemeCandidate": false
      },
      {
        "speechId": 382,
        "sourceStartMs": 4207479,
        "sourceEndMs": 4212203,
        "text": "えいっおーなんかいいねーなんか知らんけど良さげー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 383,
        "sourceStartMs": 4212203,
        "sourceEndMs": 4215045,
        "text": "強そう!",
        "isThemeCandidate": false
      },
      {
        "speechId": 384,
        "sourceStartMs": 4215045,
        "sourceEndMs": 4226753,
        "text": "強そうですこれうんこれ強そうなんか強そうです!",
        "isThemeCandidate": false
      },
      {
        "speechId": 385,
        "sourceStartMs": 4226753,
        "sourceEndMs": 4227534,
        "text": "うん!",
        "isThemeCandidate": false
      },
      {
        "speechId": 386,
        "sourceStartMs": 4232807,
        "sourceEndMs": 4259478,
        "text": "さらに下行ってる重いやつを見せるOKじゃあ重いバージョンがこれですいくよ重い方はこうだドスンと落ちていく感じがありますねはいどうでしょうかさっきとはまた違う",
        "isThemeCandidate": false
      },
      {
        "speechId": 387,
        "sourceStartMs": 4260438,
        "sourceEndMs": 4289960,
        "text": "同じにしか見えないけどまた違うこのドスンと落ちていくんですこれということで重いわーこれよりも重いは言うとりますということでさあ皆さんこんなに違うこの2球種果たしてどっちがいいかさあ決めてまいりましょうそれでは皆さん投票で",
        "isThemeCandidate": false
      },
      {
        "speechId": 388,
        "sourceStartMs": 4290554,
        "sourceEndMs": 4319580,
        "text": "いきますよ10987654321では締め切りますはい皆さんたくさんの投票どうもありがとうございましたということでこの変化球はこれでいきますこちらの",
        "isThemeCandidate": false
      },
      {
        "speechId": 389,
        "sourceStartMs": 4321194,
        "sourceEndMs": 4348170,
        "text": "重さを削った方でいこうと思いますはいちょっとマジでわかんないけどうーんまあこれでいいということでうーん意見もよう割れたはいじゃあこれでOKで作りたいと思います",
        "isThemeCandidate": false
      },
      {
        "speechId": 390,
        "sourceStartMs": 4350706,
        "sourceEndMs": 4379860,
        "text": "えー新旧宿発ボールをはいそしてスロットに登録はいします1時間1時間経っちゃったやばいこれで1時間経っちゃったこれ迷いすぎてすいませんどうも迷いましためっちゃはい迷いましためっちゃありがとうございましたでは行きたいと思いますこれをふぶちゃんに応募させます迷いに迷った末にもう誰に応募させるかどんな弾を作るかで非常に",
        "isThemeCandidate": false
      },
      {
        "speechId": 391,
        "sourceStartMs": 4381338,
        "sourceEndMs": 4408126,
        "text": "ましたがこれで行きたいと思います甲子園はお待たせしましたこれから甲子園です大変お待たせしました初めての出来事だったいやでもありがたいことやでこんな良さげなアイテムが出たってきたっていうのはじゃあオリジナル球種習得ボールってこれをフブちゃんに覚えさせてそしてフブちゃんに今からこれを一生懸命練習指示来てくれないとまずいでこれ",
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
