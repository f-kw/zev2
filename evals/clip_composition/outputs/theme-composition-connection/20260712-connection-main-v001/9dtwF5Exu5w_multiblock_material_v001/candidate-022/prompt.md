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
  "evaluationInputId": "o8rZAhARXAc-theme-candidate-022",
  "sourceVideoId": "o8rZAhARXAc",
  "selectedTheme": {
    "id": "input-selection-v004-candidate-022",
    "title": "しおりんのカット打ち獲得",
    "summary": "育成中のしおりんに狙い通り『カット打ち』の特殊能力が付き、宝鐘マリンが歓喜する場面。",
    "candidateSpeechIds": [
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
      451
    ],
    "whyItCanBeClipped": "育成中のしおりんに狙い通り『カット打ち』の特殊能力が付き、宝鐘マリンが歓喜する場面。",
    "compositionNote": "提示された候補発話範囲の中から、テーマが単独で成立する最小区間を選ぶ。"
  },
  "transcript": {
    "language": "ja-JP",
    "durationSec": 11898.441,
    "speechUnitGroups": [
      [
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
        456,
        457,
        458,
        459,
        460,
        461,
        462,
        463,
        464,
        465,
        466,
        467,
        468,
        469,
        470,
        471,
        472,
        473,
        474,
        475,
        476,
        477,
        478,
        479,
        480,
        481,
        482,
        483,
        484,
        485,
        486,
        487,
        488,
        489,
        490,
        491,
        492,
        493,
        494,
        495,
        496,
        497,
        498,
        499,
        500,
        501,
        502,
        503,
        504,
        505,
        506,
        507,
        508,
        509,
        510,
        511,
        512,
        513,
        514,
        515,
        516,
        517,
        518,
        519,
        520,
        521,
        522,
        523,
        524,
        525,
        526
      ]
    ],
    "segments": [
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
        "isThemeCandidate": true
      },
      {
        "speechId": 436,
        "sourceStartMs": 4711703,
        "sourceEndMs": 4713523,
        "text": "左のミートでこっちか!",
        "isThemeCandidate": true
      },
      {
        "speechId": 437,
        "sourceStartMs": 4713523,
        "sourceEndMs": 4715744,
        "text": "これかん!",
        "isThemeCandidate": true
      },
      {
        "speechId": 438,
        "sourceStartMs": 4715744,
        "sourceEndMs": 4719666,
        "text": "こっちかん!",
        "isThemeCandidate": true
      },
      {
        "speechId": 439,
        "sourceStartMs": 4719666,
        "sourceEndMs": 4723728,
        "text": "左のミートこれな!",
        "isThemeCandidate": true
      },
      {
        "speechId": 440,
        "sourceStartMs": 4723728,
        "sourceEndMs": 4725088,
        "text": "しおりんがつくかもしんないもんね!",
        "isThemeCandidate": true
      },
      {
        "speechId": 441,
        "sourceStartMs": 4725088,
        "sourceEndMs": 4726249,
        "text": "わかった!",
        "isThemeCandidate": true
      },
      {
        "speechId": 442,
        "sourceStartMs": 4726249,
        "sourceEndMs": 4727229,
        "text": "じゃこれで行くわ!",
        "isThemeCandidate": true
      },
      {
        "speechId": 443,
        "sourceStartMs": 4727229,
        "sourceEndMs": 4730931,
        "text": "こっち!",
        "isThemeCandidate": true
      },
      {
        "speechId": 444,
        "sourceStartMs": 4730931,
        "sourceEndMs": 4731671,
        "text": "お前かん!",
        "isThemeCandidate": true
      },
      {
        "speechId": 445,
        "sourceStartMs": 4731671,
        "sourceEndMs": 4732992,
        "text": "古川!",
        "isThemeCandidate": true
      },
      {
        "speechId": 446,
        "sourceStartMs": 4732992,
        "sourceEndMs": 4733332,
        "text": "すまー!",
        "isThemeCandidate": true
      },
      {
        "speechId": 447,
        "sourceStartMs": 4733332,
        "sourceEndMs": 4734412,
        "text": "あ!",
        "isThemeCandidate": true
      },
      {
        "speechId": 448,
        "sourceStartMs": 4734412,
        "sourceEndMs": 4735393,
        "text": "しおりん!",
        "isThemeCandidate": true
      },
      {
        "speechId": 449,
        "sourceStartMs": 4735393,
        "sourceEndMs": 4735933,
        "text": "ついた!",
        "isThemeCandidate": true
      },
      {
        "speechId": 450,
        "sourceStartMs": 4735933,
        "sourceEndMs": 4736373,
        "text": "カット打ち!",
        "isThemeCandidate": true
      },
      {
        "speechId": 451,
        "sourceStartMs": 4736373,
        "sourceEndMs": 4738494,
        "text": "ええやん!",
        "isThemeCandidate": true
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
      },
      {
        "speechId": 457,
        "sourceStartMs": 4786338,
        "sourceEndMs": 4798762,
        "text": "これやだしょぼいからダンベルにするかあ、あったダンベルななんかつけなんもつかんなかー",
        "isThemeCandidate": false
      },
      {
        "speechId": 458,
        "sourceStartMs": 4801534,
        "sourceEndMs": 4803915,
        "text": "なんつかんだかーい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 459,
        "sourceStartMs": 4803915,
        "sourceEndMs": 4828442,
        "text": "お、カエラいるカエラアイリスもいるしえ、どうしようえ、どうしようこれキャッチャーチャレンジしたいからこれとっておきたいよなこれはキャッチャーチャレンジがしたいよねナイアンアンダーインターバルスをじゃあ",
        "isThemeCandidate": false
      },
      {
        "speechId": 460,
        "sourceStartMs": 4830406,
        "sourceEndMs": 4846482,
        "text": "こっちか盗塁あるしこっちの方がいいかな左のインターバル層かなうんじゃ左左インターバル行きますね",
        "isThemeCandidate": false
      },
      {
        "speechId": 461,
        "sourceStartMs": 4891090,
        "sourceEndMs": 4895571,
        "text": "なに?",
        "isThemeCandidate": false
      },
      {
        "speechId": 462,
        "sourceStartMs": 4895571,
        "sourceEndMs": 4899312,
        "text": "何しよう?",
        "isThemeCandidate": false
      },
      {
        "speechId": 463,
        "sourceStartMs": 4899312,
        "sourceEndMs": 4910255,
        "text": "えーえーえーえーどうする?",
        "isThemeCandidate": false
      },
      {
        "speechId": 464,
        "sourceStartMs": 4910255,
        "sourceEndMs": 4911456,
        "text": "何がいいかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 465,
        "sourceStartMs": 4911456,
        "sourceEndMs": 4911936,
        "text": "ミート?",
        "isThemeCandidate": false
      },
      {
        "speechId": 466,
        "sourceStartMs": 4911936,
        "sourceEndMs": 4918818,
        "text": "粘り打ち固め打ちさよなら男ラインドライブカット打ちさよなら男",
        "isThemeCandidate": false
      },
      {
        "speechId": 467,
        "sourceStartMs": 4921566,
        "sourceEndMs": 4923748,
        "text": "ミートかティー?",
        "isThemeCandidate": false
      },
      {
        "speechId": 468,
        "sourceStartMs": 4923748,
        "sourceEndMs": 4947210,
        "text": "ラインドライブ、インコースヒッター、ローボルヒッターうんバレてる、バレてるねティーのがいいティーにするかあ、左のミート推しもいるか左のミートはこれかニャーニャーニャーティーでいっか",
        "isThemeCandidate": false
      },
      {
        "speechId": 469,
        "sourceStartMs": 4950642,
        "sourceEndMs": 4951783,
        "text": "え、もう次で最後?",
        "isThemeCandidate": false
      },
      {
        "speechId": 470,
        "sourceStartMs": 4951783,
        "sourceEndMs": 4953404,
        "text": "やばくない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 471,
        "sourceStartMs": 4953404,
        "sourceEndMs": 4979920,
        "text": "あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ゛あ�",
        "isThemeCandidate": false
      },
      {
        "speechId": 472,
        "sourceStartMs": 4983207,
        "sourceEndMs": 4988429,
        "text": "どうする?",
        "isThemeCandidate": false
      },
      {
        "speechId": 473,
        "sourceStartMs": 4988429,
        "sourceEndMs": 4990070,
        "text": "インターバル走?",
        "isThemeCandidate": false
      },
      {
        "speechId": 474,
        "sourceStartMs": 4990070,
        "sourceEndMs": 4998554,
        "text": "これ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 475,
        "sourceStartMs": 4998554,
        "sourceEndMs": 5000855,
        "text": "インターバル?",
        "isThemeCandidate": false
      },
      {
        "speechId": 476,
        "sourceStartMs": 5000855,
        "sourceEndMs": 5009920,
        "text": "総合で対エースかインターバルこれな対エースかインターバルか",
        "isThemeCandidate": false
      },
      {
        "speechId": 477,
        "sourceStartMs": 5015026,
        "sourceEndMs": 5030300,
        "text": "インターバルでもいいかうん、タイエースのがいいかあー別にでもナイアアンダーが良い?",
        "isThemeCandidate": false
      },
      {
        "speechId": 478,
        "sourceStartMs": 5030300,
        "sourceEndMs": 5032322,
        "text": "じゃあインターバル搭載するか",
        "isThemeCandidate": false
      },
      {
        "speechId": 479,
        "sourceStartMs": 5049464,
        "sourceEndMs": 5058931,
        "text": "やばい、ホロメン…3年生ばっかりじゃんホロメン…もうやばい3年生…分かった!",
        "isThemeCandidate": false
      },
      {
        "speechId": 480,
        "sourceStartMs": 5058931,
        "sourceEndMs": 5060332,
        "text": "甲子園勝とうってんだな!",
        "isThemeCandidate": false
      },
      {
        "speechId": 481,
        "sourceStartMs": 5060332,
        "sourceEndMs": 5060712,
        "text": "分かった!",
        "isThemeCandidate": false
      },
      {
        "speechId": 482,
        "sourceStartMs": 5060712,
        "sourceEndMs": 5061293,
        "text": "3年生!",
        "isThemeCandidate": false
      },
      {
        "speechId": 483,
        "sourceStartMs": 5061293,
        "sourceEndMs": 5061993,
        "text": "みんな!",
        "isThemeCandidate": false
      },
      {
        "speechId": 484,
        "sourceStartMs": 5061993,
        "sourceEndMs": 5064295,
        "text": "この甲子園絶対勝とうってんだな!",
        "isThemeCandidate": false
      },
      {
        "speechId": 485,
        "sourceStartMs": 5064295,
        "sourceEndMs": 5065576,
        "text": "やる気があるんだな!",
        "isThemeCandidate": false
      },
      {
        "speechId": 486,
        "sourceStartMs": 5065576,
        "sourceEndMs": 5068118,
        "text": "この甲子園で勝とうってんだ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 487,
        "sourceStartMs": 5068118,
        "sourceEndMs": 5068158,
        "text": "うん",
        "isThemeCandidate": false
      },
      {
        "speechId": 488,
        "sourceStartMs": 5072158,
        "sourceEndMs": 5074440,
        "text": "お前絶対勝ちます僕ってことやね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 489,
        "sourceStartMs": 5074440,
        "sourceEndMs": 5074680,
        "text": "わかった!",
        "isThemeCandidate": false
      },
      {
        "speechId": 490,
        "sourceStartMs": 5074680,
        "sourceEndMs": 5076341,
        "text": "いいでしょう!",
        "isThemeCandidate": false
      },
      {
        "speechId": 491,
        "sourceStartMs": 5076341,
        "sourceEndMs": 5077381,
        "text": "じゃあこの時点で勝とうもう!",
        "isThemeCandidate": false
      },
      {
        "speechId": 492,
        "sourceStartMs": 5077381,
        "sourceEndMs": 5079483,
        "text": "こうなったらしゃーない!",
        "isThemeCandidate": false
      },
      {
        "speechId": 493,
        "sourceStartMs": 5079483,
        "sourceEndMs": 5085406,
        "text": "この時点で勝つことでお前らのこと許してやる!",
        "isThemeCandidate": false
      },
      {
        "speechId": 494,
        "sourceStartMs": 5085406,
        "sourceEndMs": 5093371,
        "text": "勝つなら許すうん、抽選会あるえ、もう30日だから青マス意味ないのかちょっともう他に何かあったっけ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 495,
        "sourceStartMs": 5093371,
        "sourceEndMs": 5097654,
        "text": "いーと7月8月",
        "isThemeCandidate": false
      },
      {
        "speechId": 496,
        "sourceStartMs": 5100502,
        "sourceEndMs": 5111149,
        "text": "特にないか8月21日も甲子園があったら関係ないのかはいはいうんうーん占い師踏みたいから2位残しとく?",
        "isThemeCandidate": false
      },
      {
        "speechId": 497,
        "sourceStartMs": 5111149,
        "sourceEndMs": 5116372,
        "text": "うん抽選会の次の日止まってえ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 498,
        "sourceStartMs": 5116372,
        "sourceEndMs": 5118853,
        "text": "なんかあんの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 499,
        "sourceStartMs": 5118853,
        "sourceEndMs": 5125697,
        "text": "抽選会の次の日ってなんかあんの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 500,
        "sourceStartMs": 5125697,
        "sourceEndMs": 5129059,
        "text": "うんアウマスでテンション上げたい説?",
        "isThemeCandidate": false
      },
      {
        "speechId": 501,
        "sourceStartMs": 5129059,
        "sourceEndMs": 5129900,
        "text": "でも2位取っときたいよ",
        "isThemeCandidate": false
      },
      {
        "speechId": 502,
        "sourceStartMs": 5133036,
        "sourceEndMs": 5134336,
        "text": "ふぶさん来なかった?",
        "isThemeCandidate": false
      },
      {
        "speechId": 503,
        "sourceStartMs": 5134336,
        "sourceEndMs": 5148224,
        "text": "もう来なかったあ、止まる必要ないんだあ、オッケオッケ占い止まればいいあ、オッケオッケオッケ通過でいいあ、オッケオッケオッケえ、じゃあ普通にこれ3でさ普通に抽選会入ればいいの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 504,
        "sourceStartMs": 5148224,
        "sourceEndMs": 5152426,
        "text": "普通に3で入ればいいの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 505,
        "sourceStartMs": 5152426,
        "sourceEndMs": 5156388,
        "text": "これですか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 506,
        "sourceStartMs": 5156388,
        "sourceEndMs": 5159130,
        "text": "5使った方がいいの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 507,
        "sourceStartMs": 5159130,
        "sourceEndMs": 5159490,
        "text": "5でいい",
        "isThemeCandidate": false
      },
      {
        "speechId": 508,
        "sourceStartMs": 5160426,
        "sourceEndMs": 5165207,
        "text": "おう5のがいいのか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 509,
        "sourceStartMs": 5165207,
        "sourceEndMs": 5170249,
        "text": "うん、5してよ、わかった5してるミートバッティングでいいの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 510,
        "sourceStartMs": 5170249,
        "sourceEndMs": 5172549,
        "text": "あ、メントレでいいの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 511,
        "sourceStartMs": 5172549,
        "sourceEndMs": 5180532,
        "text": "じゃあ、メン…あっメン…メンタル…メントレね、わかったいこう、あう!",
        "isThemeCandidate": false
      },
      {
        "speechId": 512,
        "sourceStartMs": 5180532,
        "sourceEndMs": 5181472,
        "text": "おうおうおうおう!",
        "isThemeCandidate": false
      },
      {
        "speechId": 513,
        "sourceStartMs": 5181472,
        "sourceEndMs": 5182552,
        "text": "メムラ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 514,
        "sourceStartMs": 5182552,
        "sourceEndMs": 5184053,
        "text": "メムラお前、シャシャリ出てきてる!",
        "isThemeCandidate": false
      },
      {
        "speechId": 515,
        "sourceStartMs": 5184053,
        "sourceEndMs": 5188754,
        "text": "じゃ、ふぶちゃんを",
        "isThemeCandidate": false
      },
      {
        "speechId": 516,
        "sourceStartMs": 5190462,
        "sourceEndMs": 5219582,
        "text": "磨くにしてこのオリジナルを今から必死こいて磨いていく必死こいて磨いていく古川は持っといてラオーラは5、6、7、8スラーブ磨いとけばいいのかそのミムラ消えるよあ、このミムラ消えるミムラかそうか",
        "isThemeCandidate": false
      },
      {
        "speechId": 517,
        "sourceStartMs": 5220662,
        "sourceEndMs": 5230689,
        "text": "消えみむらか抽選会したら消えるかふふふふははははいうんふぶちゃん間違ってるまじかん?",
        "isThemeCandidate": false
      },
      {
        "speechId": 518,
        "sourceStartMs": 5230689,
        "sourceEndMs": 5230889,
        "text": "え?",
        "isThemeCandidate": false
      },
      {
        "speechId": 519,
        "sourceStartMs": 5230889,
        "sourceEndMs": 5231910,
        "text": "間違ってる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 520,
        "sourceStartMs": 5231910,
        "sourceEndMs": 5249122,
        "text": "ちょっと待ってマリンが邪魔で見えないのかもこうですここにいるか",
        "isThemeCandidate": false
      },
      {
        "speechId": 521,
        "sourceStartMs": 5252294,
        "sourceEndMs": 5275972,
        "text": "はいえーと、ラオーラまでお乗せしていいよ、フィー7まで上げとくか雰囲気でうんうんうんえ、カエラはフォーク磨いてスババは総力Cあるからえ、肩とか上げとく?",
        "isThemeCandidate": false
      },
      {
        "speechId": 522,
        "sourceStartMs": 5275972,
        "sourceEndMs": 5278394,
        "text": "3年生だけどさ保守やってくから",
        "isThemeCandidate": false
      },
      {
        "speechId": 523,
        "sourceStartMs": 5282444,
        "sourceEndMs": 5288789,
        "text": "装備もあるし装備じゃない総力もCまでいったし肩でも上げとく?",
        "isThemeCandidate": false
      },
      {
        "speechId": 524,
        "sourceStartMs": 5288789,
        "sourceEndMs": 5293213,
        "text": "体力やばいほんまにそれないらない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 525,
        "sourceStartMs": 5293213,
        "sourceEndMs": 5298977,
        "text": "そうかじゃあミートでいいか今更いらないかパワー?",
        "isThemeCandidate": false
      },
      {
        "speechId": 526,
        "sourceStartMs": 5298977,
        "sourceEndMs": 5304782,
        "text": "OKパワーにしよう総力さらに上乗せ?",
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
