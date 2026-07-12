# clip_composition_prompt_v013

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
- `candidateSpeechIds` は探索範囲の枠ではなく、テーマの中心を指す照準として読む。すべてを使う義務はない。
- `isThemeCandidate` はテーマ中心の手掛かりであり、最終区間の境界や採用範囲を示す印ではない。
- 候補印のない周辺発話も必ず読み、フリ、状況説明、反応、余韻、話題転換を自分で判断して境界を決める。
- 1文字ずつ分かれた発話は、連続する文字をつないで文として読む。
- `笑` だけの発話は、発話本文ではなく反応や余韻を表す非発話シグナルとして読む。
- 選べる範囲は、入力された文字起こしの発話時刻に基づく。

## 判断方針

- `candidateSpeechIds` が指すテーマ中心を含み、切り抜きとして単独で意味が通る適切な素材区間を、自分の境界判断で選ぶ。
- 根拠発話の先頭・終端を、そのまま選択区間の先頭・終端へ写さない。周辺文脈から必要なフリと反応の収束を探す。
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
    "compositionNote": "候補発話はテーマ中心の照準。周辺文脈から単独で伝わる適切な境界を判断する。",
    "candidateSpeechIds": [11]
  },
  "transcript": {
    "segments": [
      { "speechId": 10, "sourceStartMs": 10000, "sourceEndMs": 11200, "text": "えっと質問来てるね", "isThemeCandidate": false },
      { "speechId": 11, "sourceStartMs": 11200, "sourceEndMs": 14800, "text": "毎月続けるなら数字より生活できるかが先だと思う", "isThemeCandidate": true },
      { "speechId": 12, "sourceStartMs": 14800, "sourceEndMs": 16600, "text": "そこが無理なら無理しない方がいい", "isThemeCandidate": false },
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
    "compositionNote": "候補発話は離れた2場面の中心照準。周辺文脈から各場面の境界を判断する。",
    "candidateSpeechIds": [21, 50]
  },
  "transcript": {
    "segments": [
      { "speechId": 20, "sourceStartMs": 40000, "sourceEndMs": 42700, "text": "まず最低限これがないと続かない", "isThemeCandidate": false },
      { "speechId": 21, "sourceStartMs": 42700, "sourceEndMs": 45100, "text": "理想論じゃなくて生活の話ね", "isThemeCandidate": true },
      { "speechId": 22, "sourceStartMs": 70000, "sourceEndMs": 73000, "text": "全然別の雑談をしている", "isThemeCandidate": false },
      { "speechId": 50, "sourceStartMs": 125000, "sourceEndMs": 128400, "text": "さっきの話に戻ると見栄より続けられる形が大事", "isThemeCandidate": true },
      { "speechId": 51, "sourceStartMs": 128400, "sourceEndMs": 131200, "text": "そこを間違えると長く持たない", "isThemeCandidate": false }
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
  "evaluationInputId": "YE-faluP7zY-theme-candidate-037",
  "sourceVideoId": "YE-faluP7zY",
  "selectedTheme": {
    "id": "input-selection-v004-candidate-037",
    "title": "肉を焼き忘れたころねにキレるマリンと、夫婦漫才からのバーベキュー完成",
    "summary": "しし肉を焼き忘れていたころねに対してマリンが「子供に示しがつかないだろ」と夫婦風に怒る掛け合いから、豪華なバーベキューが完成して2人で歓喜する一連の流れが面白い映像になるため。",
    "candidateSpeechIds": [
      470,
      471,
      472,
      473,
      474,
      475,
      476
    ],
    "whyItCanBeClipped": "しし肉を焼き忘れていたころねに対してマリンが「子供に示しがつかないだろ」と夫婦風に怒る掛け合いから、豪華なバーベキューが完成して2人で歓喜する一連の流れが面白い映像になるため。",
    "compositionNote": "候補発話はテーマ中心の照準。前後の周辺文脈を読み、中心を含む適切な区間を自分の境界判断で切る。根拠範囲の端をそのまま境界へ写さない。",
    "candidateSpeechIdsRole": "theme_center_aim"
  },
  "transcript": {
    "language": "ja-JP",
    "durationSec": 11824.121,
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
        508
      ]
    ],
    "segments": [
      {
        "speechId": 392,
        "sourceStartMs": 2701871,
        "sourceEndMs": 2729824,
        "text": "今度という今度こそ殺そうイノシシ今日こそ今日という今日こそしなべししどんししじるしししちゅうをやりましょうあ、帰ってきたじゃん帰ってきた一回ちょっとHPの減りも凄まじかったのでえーと粘土ちょっとこう合体してとあとはサメの餌作ろう",
        "isThemeCandidate": false
      },
      {
        "speechId": 393,
        "sourceStartMs": 2731943,
        "sourceEndMs": 2759704,
        "text": "何を今からするかというと目的が次々変わってるんだよねわかる一つに絞らないとね何からやろうか今日の目標は船の2階を監視させたいみたいなそうなんだよさせたいんだけどさ大きい島を見つけてはしゃいじゃったところあるよね",
        "isThemeCandidate": false
      },
      {
        "speechId": 394,
        "sourceStartMs": 2760566,
        "sourceEndMs": 2761847,
        "text": "じゃあ行きますか!",
        "isThemeCandidate": false
      },
      {
        "speechId": 395,
        "sourceStartMs": 2761847,
        "sourceEndMs": 2764729,
        "text": "イノシシ狩りしますか!",
        "isThemeCandidate": false
      },
      {
        "speechId": 396,
        "sourceStartMs": 2764729,
        "sourceEndMs": 2772056,
        "text": "行きますかね狩ろう!",
        "isThemeCandidate": false
      },
      {
        "speechId": 397,
        "sourceStartMs": 2772056,
        "sourceEndMs": 2773337,
        "text": "狩るぞー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 398,
        "sourceStartMs": 2773337,
        "sourceEndMs": 2787609,
        "text": "さっきちょっとワタメに気を取られたから普通にシンプルに今回はちゃんとイノシシ一点張りで了解海の中から狙い撃ちよう了解あ、見て!",
        "isThemeCandidate": false
      },
      {
        "speechId": 399,
        "sourceStartMs": 2787609,
        "sourceEndMs": 2789030,
        "text": "綺麗だねうん",
        "isThemeCandidate": false
      },
      {
        "speechId": 400,
        "sourceStartMs": 2790074,
        "sourceEndMs": 2798477,
        "text": "なんか君の心みたいにあったかいあなたの心はどこ行った?",
        "isThemeCandidate": false
      },
      {
        "speechId": 401,
        "sourceStartMs": 2798477,
        "sourceEndMs": 2802758,
        "text": "あっこっちよもうお茶目だなどこ行ったんだい?",
        "isThemeCandidate": false
      },
      {
        "speechId": 402,
        "sourceStartMs": 2802758,
        "sourceEndMs": 2803679,
        "text": "待て待て!",
        "isThemeCandidate": false
      },
      {
        "speechId": 403,
        "sourceStartMs": 2803679,
        "sourceEndMs": 2805559,
        "text": "待て!",
        "isThemeCandidate": false
      },
      {
        "speechId": 404,
        "sourceStartMs": 2805559,
        "sourceEndMs": 2815803,
        "text": "気持ち悪いからついてこないで血を見ずにでも使ってなさい急に冷たくなっちゃって来ないね気持ち悪いわ照れているのかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 405,
        "sourceStartMs": 2815803,
        "sourceEndMs": 2819724,
        "text": "待てっておい待てちょ待てって",
        "isThemeCandidate": false
      },
      {
        "speechId": 406,
        "sourceStartMs": 2821638,
        "sourceEndMs": 2823639,
        "text": "キモい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 407,
        "sourceStartMs": 2823639,
        "sourceEndMs": 2824019,
        "text": "キモい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 408,
        "sourceStartMs": 2824019,
        "sourceEndMs": 2825059,
        "text": "キモい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 409,
        "sourceStartMs": 2825059,
        "sourceEndMs": 2825559,
        "text": "キモい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 410,
        "sourceStartMs": 2825559,
        "sourceEndMs": 2828840,
        "text": "キモい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 411,
        "sourceStartMs": 2828840,
        "sourceEndMs": 2831401,
        "text": "キモい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 412,
        "sourceStartMs": 2831401,
        "sourceEndMs": 2832181,
        "text": "キモい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 413,
        "sourceStartMs": 2832181,
        "sourceEndMs": 2832741,
        "text": "キモい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 414,
        "sourceStartMs": 2832741,
        "sourceEndMs": 2833261,
        "text": "キモい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 415,
        "sourceStartMs": 2833261,
        "sourceEndMs": 2834442,
        "text": "キモい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 416,
        "sourceStartMs": 2834442,
        "sourceEndMs": 2838323,
        "text": "キモい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 417,
        "sourceStartMs": 2838323,
        "sourceEndMs": 2839283,
        "text": "キモい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 418,
        "sourceStartMs": 2839283,
        "sourceEndMs": 2840364,
        "text": "キモい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 419,
        "sourceStartMs": 2840364,
        "sourceEndMs": 2840524,
        "text": "キモい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 420,
        "sourceStartMs": 2840524,
        "sourceEndMs": 2840764,
        "text": "キモい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 421,
        "sourceStartMs": 2840764,
        "sourceEndMs": 2841604,
        "text": "キモい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 422,
        "sourceStartMs": 2841604,
        "sourceEndMs": 2843765,
        "text": "キモい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 423,
        "sourceStartMs": 2843765,
        "sourceEndMs": 2846385,
        "text": "キモい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 424,
        "sourceStartMs": 2846385,
        "sourceEndMs": 2846926,
        "text": "キモい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 425,
        "sourceStartMs": 2846926,
        "sourceEndMs": 2848146,
        "text": "キモい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 426,
        "sourceStartMs": 2851182,
        "sourceEndMs": 2853043,
        "text": "お尻ぷりぷりしちゃおう!",
        "isThemeCandidate": false
      },
      {
        "speechId": 427,
        "sourceStartMs": 2853043,
        "sourceEndMs": 2853843,
        "text": "悔しいか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 428,
        "sourceStartMs": 2853843,
        "sourceEndMs": 2878230,
        "text": "ぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷりぷり�",
        "isThemeCandidate": false
      },
      {
        "speechId": 429,
        "sourceStartMs": 2890914,
        "sourceEndMs": 2893495,
        "text": "アリー当てた?",
        "isThemeCandidate": false
      },
      {
        "speechId": 430,
        "sourceStartMs": 2893495,
        "sourceEndMs": 2902720,
        "text": "戻ろうか分かったあきらめをあきらめの逃げあきらめも大事だよこれまぁやったしねシシは肉とれた?",
        "isThemeCandidate": false
      },
      {
        "speechId": 431,
        "sourceStartMs": 2902720,
        "sourceEndMs": 2907082,
        "text": "肉肉とれたよナイス皮もとれたじゃん皮皮もとれた?",
        "isThemeCandidate": false
      },
      {
        "speechId": 432,
        "sourceStartMs": 2907082,
        "sourceEndMs": 2908743,
        "text": "皮?",
        "isThemeCandidate": false
      },
      {
        "speechId": 433,
        "sourceStartMs": 2908743,
        "sourceEndMs": 2910000,
        "text": "皮とれたよ皮研究し",
        "isThemeCandidate": false
      },
      {
        "speechId": 434,
        "sourceStartMs": 2910166,
        "sourceEndMs": 2916151,
        "text": "あ、そうねそうね、何か作れるかもしれない新しいのねぇやっぱ鳥気になる、殺すえ、殺す?",
        "isThemeCandidate": false
      },
      {
        "speechId": 435,
        "sourceStartMs": 2916151,
        "sourceEndMs": 2929702,
        "text": "え、死んじゃおうよマリーン任せろあ、待って行っちゃったかも行っちゃったか、いや来たか、いや行っちゃったか、いや来たか入れちゃったかちょっと待ってこれ構えたさ矢をそっと下ろしたい時はどうすればいいと思う?",
        "isThemeCandidate": false
      },
      {
        "speechId": 436,
        "sourceStartMs": 2929702,
        "sourceEndMs": 2932605,
        "text": "スクロールはどう?",
        "isThemeCandidate": false
      },
      {
        "speechId": 437,
        "sourceStartMs": 2932605,
        "sourceEndMs": 2934566,
        "text": "あ、一回でもさ地面に寄ったら?",
        "isThemeCandidate": false
      },
      {
        "speechId": 438,
        "sourceStartMs": 2934566,
        "sourceEndMs": 2938310,
        "text": "回収できるし痛っ",
        "isThemeCandidate": false
      },
      {
        "speechId": 439,
        "sourceStartMs": 2941666,
        "sourceEndMs": 2942086,
        "text": "いいでしょ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 440,
        "sourceStartMs": 2942086,
        "sourceEndMs": 2942486,
        "text": "すごいでしょ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 441,
        "sourceStartMs": 2942486,
        "sourceEndMs": 2945307,
        "text": "ナイス?",
        "isThemeCandidate": false
      },
      {
        "speechId": 442,
        "sourceStartMs": 2945307,
        "sourceEndMs": 2945887,
        "text": "ナイス?",
        "isThemeCandidate": false
      },
      {
        "speechId": 443,
        "sourceStartMs": 2945887,
        "sourceEndMs": 2957851,
        "text": "見てトッポこの中がスカスカなのはトッポって言わないからね中吸ったんよ多分先にトッポの中身だけ吸う?",
        "isThemeCandidate": false
      },
      {
        "speechId": 444,
        "sourceStartMs": 2957851,
        "sourceEndMs": 2964493,
        "text": "でもさ、もしかしたらレンジでチーしたらさトッポで中身が全部なくなってさ空洞を食べれるんじゃない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 445,
        "sourceStartMs": 2964493,
        "sourceEndMs": 2967093,
        "text": "もしかしてマジ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 446,
        "sourceStartMs": 2967093,
        "sourceEndMs": 2969014,
        "text": "やってみるかじゃあやってみよう",
        "isThemeCandidate": false
      },
      {
        "speechId": 447,
        "sourceStartMs": 2970690,
        "sourceEndMs": 2999444,
        "text": "ちょっと我々を代表してリスナーの皆さんぜひ挑戦してみてくださいよろしくお願いしますえっと待って弓矢がねちょっと誤報になっちゃってあ、皮研究しようかじゃあしてしてしてしてー研究しまーすどうやって研究するんだっけなあ、これだなまた食われたーあれ、どこだっけなあ、こうだなちょっと待ってくださいねー",
        "isThemeCandidate": false
      },
      {
        "speechId": 448,
        "sourceStartMs": 3000738,
        "sourceEndMs": 3004881,
        "text": "めっちゃさ、食われるダメに?",
        "isThemeCandidate": false
      },
      {
        "speechId": 449,
        "sourceStartMs": 3004881,
        "sourceEndMs": 3009904,
        "text": "あのね、船が食われてます大丈夫?",
        "isThemeCandidate": false
      },
      {
        "speechId": 450,
        "sourceStartMs": 3009904,
        "sourceEndMs": 3020432,
        "text": "大丈夫じゃないもう木がないから今探しに行くところ木が木じゃないね、そしたらねコーネがつまんないこと言うたびにさなんでそういうこと言うの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 451,
        "sourceStartMs": 3020432,
        "sourceEndMs": 3025455,
        "text": "罰を与えたいよねねぇ、増えたよ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 452,
        "sourceStartMs": 3025455,
        "sourceEndMs": 3026556,
        "text": "マリゾネス?",
        "isThemeCandidate": false
      },
      {
        "speechId": 453,
        "sourceStartMs": 3026556,
        "sourceEndMs": 3027416,
        "text": "なになになに?",
        "isThemeCandidate": false
      },
      {
        "speechId": 454,
        "sourceStartMs": 3027416,
        "sourceEndMs": 3029698,
        "text": "作れるのがね、蜂の巣蜂の巣?",
        "isThemeCandidate": false
      },
      {
        "speechId": 455,
        "sourceStartMs": 3030498,
        "sourceEndMs": 3033119,
        "text": "ハンモックバックパックえ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 456,
        "sourceStartMs": 3033119,
        "sourceEndMs": 3034400,
        "text": "バックパック?",
        "isThemeCandidate": false
      },
      {
        "speechId": 457,
        "sourceStartMs": 3034400,
        "sourceEndMs": 3043724,
        "text": "それバックパックも作れるバックパックそれ需要しかないってあれバックパックあれどういうこと?",
        "isThemeCandidate": false
      },
      {
        "speechId": 458,
        "sourceStartMs": 3043724,
        "sourceEndMs": 3043964,
        "text": "ん?",
        "isThemeCandidate": false
      },
      {
        "speechId": 459,
        "sourceStartMs": 3043964,
        "sourceEndMs": 3059832,
        "text": "わからんこれあうんうんうん革のヘルメットとかボディアーマーとかも作れるえそれは熱いあと軟膏軟膏とかペイントブラシだってえめっちゃいいじゃんでも革2枚しかないからいっぱい取らなきゃねこれねやっぱりさ",
        "isThemeCandidate": false
      },
      {
        "speechId": 460,
        "sourceStartMs": 3060374,
        "sourceEndMs": 3063596,
        "text": "殺すしかないって殺す?",
        "isThemeCandidate": false
      },
      {
        "speechId": 461,
        "sourceStartMs": 3063596,
        "sourceEndMs": 3069038,
        "text": "あいつらをあの鳥もさ多分川を落とすんじゃない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 462,
        "sourceStartMs": 3069038,
        "sourceEndMs": 3072540,
        "text": "鳥か鳥捕まえられるネットとかなかったっけ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 463,
        "sourceStartMs": 3072540,
        "sourceEndMs": 3080503,
        "text": "あれか次はネットランチャーねごめん船長さ配信前にさどう考えてもトイレに行ったけどさどうしても我慢できずもう一回行っていい?",
        "isThemeCandidate": false
      },
      {
        "speechId": 464,
        "sourceStartMs": 3080503,
        "sourceEndMs": 3085986,
        "text": "いいよちょっと行ってくるね待っててねうんいちみさんの喋ってていい?",
        "isThemeCandidate": false
      },
      {
        "speechId": 465,
        "sourceStartMs": 3085986,
        "sourceEndMs": 3086726,
        "text": "ちょっとよろしく",
        "isThemeCandidate": false
      },
      {
        "speechId": 466,
        "sourceStartMs": 3097202,
        "sourceEndMs": 3119058,
        "text": "いってらっしゃいみちみさんこんにちは緊張しちゃうね2人だと2人じゃないけどいっぱいいっぱいいるけど2人きりだと緊張しちゃうねこれ待ってた方がいいのかなぁ食材がないなでも",
        "isThemeCandidate": false
      },
      {
        "speechId": 467,
        "sourceStartMs": 3120354,
        "sourceEndMs": 3149486,
        "text": "なんか落ちてるんだよここら辺に今日もかわいいねって言われちゃったマリゾネスかわいいって言われちゃったよ一味のみなさんにみんなではないけど一部に一味の一部にこれ全然面白くない全然面白くないんだけどあー待ってこれじゃあ食材が足りなくなっちゃうそうだなこれ釣りもしたいな一味の一部",
        "isThemeCandidate": false
      },
      {
        "speechId": 468,
        "sourceStartMs": 3150170,
        "sourceEndMs": 3173801,
        "text": "一味の一部一味しちみー一味の一部おけりよいしょはいあーこうねのソロ配信助かったな何もしないけどねこれさマリゾネスさこれさ止まってるときにさ魚で釣れないんだっけいや止まってても魚は釣れるあ釣れる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 469,
        "sourceStartMs": 3173801,
        "sourceEndMs": 3179964,
        "text": "釣れるよ食材がさ多分どんどんなくなっちゃいそうでさこれさあー確かにそれあるな確かに?",
        "isThemeCandidate": false
      },
      {
        "speechId": 470,
        "sourceStartMs": 3180190,
        "sourceEndMs": 3181130,
        "text": "しし肉焼いてる?",
        "isThemeCandidate": true
      },
      {
        "speechId": 471,
        "sourceStartMs": 3181130,
        "sourceEndMs": 3197098,
        "text": "しし肉あ、ごめんなさい焼いてなかったわもうしっかりしてくれよごめんなさいあなたお前がちゃんとしないと子供に示しがつかないだろ見て!",
        "isThemeCandidate": true
      },
      {
        "speechId": 472,
        "sourceStartMs": 3197098,
        "sourceEndMs": 3198258,
        "text": "マリン見てこれ!",
        "isThemeCandidate": true
      },
      {
        "speechId": 473,
        "sourceStartMs": 3198258,
        "sourceEndMs": 3198959,
        "text": "すごいよ!",
        "isThemeCandidate": true
      },
      {
        "speechId": 474,
        "sourceStartMs": 3198959,
        "sourceEndMs": 3201080,
        "text": "バーベキューだ!",
        "isThemeCandidate": true
      },
      {
        "speechId": 475,
        "sourceStartMs": 3201080,
        "sourceEndMs": 3205402,
        "text": "奇跡じゃんガチの!",
        "isThemeCandidate": true
      },
      {
        "speechId": 476,
        "sourceStartMs": 3205402,
        "sourceEndMs": 3209684,
        "text": "これ回復量絶対えげつないからお腹がホキで空いてる時だけで食べてるの歩かないでちょっとそこ",
        "isThemeCandidate": true
      },
      {
        "speechId": 477,
        "sourceStartMs": 3211310,
        "sourceEndMs": 3238642,
        "text": "ごめんぬやりやがったやめて汚いね俺だって疲れてんだよ疲れてるなら寝なさいよじゃあなんでバーベキューの網の上歩くのよやめて汚いお前には分からないお前には分からないだろうな俺くらいやってないと分からないだろうな何をだよ働きを働いてるのね俺ほどの働きをしてないとお前には分からないだろうな一生分からないわごめんなさいね",
        "isThemeCandidate": false
      },
      {
        "speechId": 478,
        "sourceStartMs": 3240846,
        "sourceEndMs": 3241707,
        "text": "なんだっけ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 479,
        "sourceStartMs": 3241707,
        "sourceEndMs": 3243147,
        "text": "何をしようとしたんだっけ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 480,
        "sourceStartMs": 3243147,
        "sourceEndMs": 3252153,
        "text": "ごはん食べたいなぁ焼けないかなぁ裏返したくなるよねこれね確かにこんなことしてる場合じゃなかったわごはん確かになくなりそうだこれでしょ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 481,
        "sourceStartMs": 3252153,
        "sourceEndMs": 3269924,
        "text": "とりあえず冷静にいやーちょっとあれかイノシシやるかそうだねやっぱイノシシねえマーリン何よ見てえーイノスケじゃんねずことイノスケちゃたせな",
        "isThemeCandidate": false
      },
      {
        "speechId": 482,
        "sourceStartMs": 3270262,
        "sourceEndMs": 3273863,
        "text": "行くぞ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 483,
        "sourceStartMs": 3273863,
        "sourceEndMs": 3278425,
        "text": "炭治郎!",
        "isThemeCandidate": false
      },
      {
        "speechId": 484,
        "sourceStartMs": 3278425,
        "sourceEndMs": 3279045,
        "text": "マリン、いいの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 485,
        "sourceStartMs": 3279045,
        "sourceEndMs": 3279325,
        "text": "これ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 486,
        "sourceStartMs": 3279325,
        "sourceEndMs": 3279926,
        "text": "マリンかぶる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 487,
        "sourceStartMs": 3279926,
        "sourceEndMs": 3282927,
        "text": "これ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 488,
        "sourceStartMs": 3282927,
        "sourceEndMs": 3283867,
        "text": "せいちゃん、じゃあねずこよ。",
        "isThemeCandidate": false
      },
      {
        "speechId": 489,
        "sourceStartMs": 3283867,
        "sourceEndMs": 3287408,
        "text": "え、それさ、待ってねずことさ、それって共存してる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 490,
        "sourceStartMs": 3287408,
        "sourceEndMs": 3290589,
        "text": "共存できない!",
        "isThemeCandidate": false
      },
      {
        "speechId": 491,
        "sourceStartMs": 3290589,
        "sourceEndMs": 3292350,
        "text": "お前はこっちを使うんだ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 492,
        "sourceStartMs": 3306889,
        "sourceEndMs": 3307710,
        "text": "あははは!",
        "isThemeCandidate": false
      },
      {
        "speechId": 493,
        "sourceStartMs": 3338034,
        "sourceEndMs": 3338916,
        "text": "どっちがいい?",
        "isThemeCandidate": false
      },
      {
        "speechId": 494,
        "sourceStartMs": 3338916,
        "sourceEndMs": 3339658,
        "text": "伊之助がいい?",
        "isThemeCandidate": false
      },
      {
        "speechId": 495,
        "sourceStartMs": 3339658,
        "sourceEndMs": 3342545,
        "text": "これちょっと待って今泣いてるからちょっと待って",
        "isThemeCandidate": false
      },
      {
        "speechId": 496,
        "sourceStartMs": 3366903,
        "sourceEndMs": 3387921,
        "text": "これさ頭が猪になるだけでさ何も得はないんだな見て焼けてるよこっちね焼けてるぞ食べな食べな分けようほら乾杯だ乾杯",
        "isThemeCandidate": false
      },
      {
        "speechId": 497,
        "sourceStartMs": 3390154,
        "sourceEndMs": 3417711,
        "text": "ほら乾杯しよう肉で乾杯だこれ絶対回復量すごいからさもったいないよ今食べたらもったいないじゃん別のにするもっとギリギリになってから食べようもっといいよなんだよ何でつぼってんのこれちょっと頭かぶってみてほしいよそしたらそんな面白いこれ違う違ういや",
        "isThemeCandidate": false
      },
      {
        "speechId": 498,
        "sourceStartMs": 3425014,
        "sourceEndMs": 3438683,
        "text": "あ、すごいすごい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 499,
        "sourceStartMs": 3438683,
        "sourceEndMs": 3440304,
        "text": "ほんとだ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 500,
        "sourceStartMs": 3440304,
        "sourceEndMs": 3441965,
        "text": "それでずっと積もってるのね!",
        "isThemeCandidate": false
      },
      {
        "speechId": 501,
        "sourceStartMs": 3441965,
        "sourceEndMs": 3443126,
        "text": "あ、くれるのありがとね",
        "isThemeCandidate": false
      },
      {
        "speechId": 502,
        "sourceStartMs": 3452146,
        "sourceEndMs": 3467816,
        "text": "掘ってくれる説森で育った森で育った勘を出していくわそうだねちょっと行こうかちょっと待って斧だけ作っていい?",
        "isThemeCandidate": false
      },
      {
        "speechId": 503,
        "sourceStartMs": 3467816,
        "sourceEndMs": 3479844,
        "text": "斧いいよあーマジで死ぬかと思ったほら笑われすぎてえやばいマリリンちょっと待ってマジでさ食材なくなったけどあ食材なんて",
        "isThemeCandidate": false
      },
      {
        "speechId": 504,
        "sourceStartMs": 3480134,
        "sourceEndMs": 3485956,
        "text": "全ての食材を船長が今握ってるからねねーすごいな、シェフ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 505,
        "sourceStartMs": 3485956,
        "sourceEndMs": 3488676,
        "text": "シェフだの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 506,
        "sourceStartMs": 3488676,
        "sourceEndMs": 3492397,
        "text": "シェフじゃないんだけどすごいんだけどお腹減ってんの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 507,
        "sourceStartMs": 3492397,
        "sourceEndMs": 3495718,
        "text": "今今、じゃあ肉食べていいか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 508,
        "sourceStartMs": 3495718,
        "sourceEndMs": 3509062,
        "text": "勝手にえ、肉食べ…じゃあ魚さ、魚返すから魚食べてよ魚なんでそんな肉そんな温存しようとしてねここだという時に一緒に食べようよはい、これはい、拾って、これ",
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
  },
  "connectionContract": {
    "version": "connection-v002",
    "candidateSpeechIdsRole": "theme_center_aim",
    "surroundingContextRole": "boundary_search_space"
  }
}
```
