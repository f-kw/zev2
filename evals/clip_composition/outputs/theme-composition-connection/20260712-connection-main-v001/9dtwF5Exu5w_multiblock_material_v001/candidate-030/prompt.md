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
  "evaluationInputId": "o8rZAhARXAc-theme-candidate-030",
  "sourceVideoId": "o8rZAhARXAc",
  "selectedTheme": {
    "id": "input-selection-v004-candidate-030",
    "title": "「やればできるじゃない！」作戦成功に大喜びするマリン監督",
    "summary": "悩んだ末の作戦が成功し、大興奮で選手を褒めちぎるリアクションの見どころがあるため。",
    "candidateSpeechIds": [
      653,
      654,
      655,
      656,
      657,
      658,
      659,
      660,
      661,
      662,
      663
    ],
    "whyItCanBeClipped": "悩んだ末の作戦が成功し、大興奮で選手を褒めちぎるリアクションの見どころがあるため。",
    "compositionNote": "提示された候補発話範囲の中から、テーマが単独で成立する最小区間を選ぶ。"
  },
  "transcript": {
    "language": "ja-JP",
    "durationSec": 11898.441,
    "speechUnitGroups": [
      [
        619,
        620,
        621,
        622,
        623,
        624,
        625,
        626,
        627,
        628,
        629,
        630,
        631,
        632,
        633,
        634,
        635,
        636,
        637,
        638,
        639,
        640,
        641,
        642,
        643,
        644,
        645,
        646,
        647,
        648,
        649,
        650,
        651,
        652,
        653,
        654,
        655,
        656,
        657,
        658,
        659,
        660,
        661,
        662,
        663,
        664,
        665,
        666,
        667,
        668,
        669,
        670,
        671,
        672,
        673,
        674,
        675,
        676,
        677,
        678,
        679,
        680,
        681,
        682,
        683,
        684,
        685,
        686,
        687,
        688,
        689,
        690,
        691,
        692,
        693,
        694,
        695,
        696,
        697,
        698,
        699,
        700,
        701,
        702,
        703,
        704,
        705,
        706,
        707,
        708,
        709,
        710,
        711,
        712,
        713,
        714,
        715,
        716,
        717,
        718,
        719,
        720,
        721,
        722,
        723,
        724,
        725,
        726,
        727,
        728,
        729,
        730,
        731,
        732,
        733,
        734,
        735,
        736,
        737,
        738,
        739,
        740,
        741,
        742,
        743,
        744,
        745
      ]
    ],
    "segments": [
      {
        "speechId": 619,
        "sourceStartMs": 6061641,
        "sourceEndMs": 6062462,
        "text": "甲子園?",
        "isThemeCandidate": false
      },
      {
        "speechId": 620,
        "sourceStartMs": 6062462,
        "sourceEndMs": 6086918,
        "text": "当たり前ですね僕たちにとって甲子園はほんの通過点でしかありませんの顔だ並び替えでもするかコロネからコロネ注目してないから大山君だよね今注目してるの大山君を前に持ってきて美藤君の打ち気をチェックして",
        "isThemeCandidate": false
      },
      {
        "speechId": 621,
        "sourceStartMs": 6091903,
        "sourceEndMs": 6101930,
        "text": "こんな感じ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 622,
        "sourceStartMs": 6101930,
        "sourceEndMs": 6107614,
        "text": "どうすか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 623,
        "sourceStartMs": 6107614,
        "sourceEndMs": 6112877,
        "text": "ちょっと見といて!",
        "isThemeCandidate": false
      },
      {
        "speechId": 624,
        "sourceStartMs": 6112877,
        "sourceEndMs": 6113938,
        "text": "おしっこしてくるから!",
        "isThemeCandidate": false
      },
      {
        "speechId": 625,
        "sourceStartMs": 6198762,
        "sourceEndMs": 6209980,
        "text": "漏らしてないちゃんとかかとで押さえた手も洗ったじゃあこれでいいこれでいい",
        "isThemeCandidate": false
      },
      {
        "speechId": 626,
        "sourceStartMs": 6213448,
        "sourceEndMs": 6239840,
        "text": "うんはい今の3年生が抜けた後のが心配すぎるうんそうなんですうちの学校3年生が抜けた後がやばいんですよねこの夏の大会の間になんとか育てるしかないですねはいオッケーいけましたうんかかとも洗ったあのさ",
        "isThemeCandidate": false
      },
      {
        "speechId": 627,
        "sourceStartMs": 6240322,
        "sourceEndMs": 6269840,
        "text": "あのさあのさあのさあのさかかとでさじかにさまた押さえてるわけないよねパンツとさパンツとさあのーあのあれ履いてるあれをさスカートをさね2枚こしてまいいよもうお前らに言っても意味ないお前らに何言っても意味ないもう分かってくれないならもういいいくぜ染み出てねえよ漏らしてねえつって",
        "isThemeCandidate": false
      },
      {
        "speechId": 628,
        "sourceStartMs": 6271239,
        "sourceEndMs": 6281687,
        "text": "シミ出てねーんだよ行くぜ頼むで!",
        "isThemeCandidate": false
      },
      {
        "speechId": 629,
        "sourceStartMs": 6281687,
        "sourceEndMs": 6284348,
        "text": "ザサミ商業!",
        "isThemeCandidate": false
      },
      {
        "speechId": 630,
        "sourceStartMs": 6284348,
        "sourceEndMs": 6288972,
        "text": "沖縄かよ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 631,
        "sourceStartMs": 6288972,
        "sourceEndMs": 6293835,
        "text": "どいつもこいつも似た顔しやがって負けてらんねん総合力戦力B!",
        "isThemeCandidate": false
      },
      {
        "speechId": 632,
        "sourceStartMs": 6293835,
        "sourceEndMs": 6296257,
        "text": "おい今日初めて出てくる長谷川!",
        "isThemeCandidate": false
      },
      {
        "speechId": 633,
        "sourceStartMs": 6296257,
        "sourceEndMs": 6299360,
        "text": "お前初めてのくせにちょ、やばいやばい1点取られた",
        "isThemeCandidate": false
      },
      {
        "speechId": 634,
        "sourceStartMs": 6305196,
        "sourceEndMs": 6329174,
        "text": "右の杉山マウンドに上がりました今日は配球にも注目したいと思います1回の裏パイレーツ攻撃に入ります先頭バッターは大山あれ黄色い声援だお祭り男と勘違いしてたちょっと見るか相手でも強っ強っバランスよ強っ",
        "isThemeCandidate": false
      },
      {
        "speechId": 635,
        "sourceStartMs": 6336132,
        "sourceEndMs": 6359100,
        "text": "あ、強あ、ツッツヨツヨスーヨ肩Dツッツヨツヨスーヨバランスよく強いな向こうにもスワいるんだけどやべえよ全員星300ぐらいある全員星300あるこれマン?",
        "isThemeCandidate": false
      },
      {
        "speechId": 636,
        "sourceStartMs": 6359100,
        "sourceEndMs": 6359980,
        "text": "あ、こいつだけエラー",
        "isThemeCandidate": false
      },
      {
        "speechId": 637,
        "sourceStartMs": 6360082,
        "sourceEndMs": 6389414,
        "text": "とか持ってる長谷川長谷川はこの学校はざまみ小学校じゃないざまみ高校は強すぎるやつの中に一人こういう長谷川みたいなこれ1年生だ1年でお前それから強えな1年生入れてこれ教育中今育成中です育成中投手負け運負け運来たうわー",
        "isThemeCandidate": false
      },
      {
        "speechId": 638,
        "sourceStartMs": 6390562,
        "sourceEndMs": 6417590,
        "text": "ムービングファースト、シュート、進化、チェンジアップなるほどクイックはD、盗塁はなんかできそうだなクイックDで肩がDだから盗塁はなんかワンチャンあるな、雰囲気ま、一旦転がしていくとりあえず一旦転がしていく",
        "isThemeCandidate": false
      },
      {
        "speechId": 639,
        "sourceStartMs": 6421379,
        "sourceEndMs": 6422419,
        "text": "あ、いいね!",
        "isThemeCandidate": false
      },
      {
        "speechId": 640,
        "sourceStartMs": 6422419,
        "sourceEndMs": 6423080,
        "text": "あ、取られちゃったー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 641,
        "sourceStartMs": 6423080,
        "sourceEndMs": 6448959,
        "text": "まあまあ、おわー、ダメかー負けようねナイスえ、エラー攻撃一旦アウト2つかよーま、転がすかー",
        "isThemeCandidate": false
      },
      {
        "speechId": 642,
        "sourceStartMs": 6452403,
        "sourceEndMs": 6468373,
        "text": "アウト2つでどうしろってんだよーすでに2エラーなんでだよーおーロッキーロッキーロッキーロッキーだけど2アウトなんだよなーどうしよう入らんよなーそりゃそうあーノーアウトランナー",
        "isThemeCandidate": false
      },
      {
        "speechId": 643,
        "sourceStartMs": 6480278,
        "sourceEndMs": 6480718,
        "text": "何類?",
        "isThemeCandidate": false
      },
      {
        "speechId": 644,
        "sourceStartMs": 6480718,
        "sourceEndMs": 6483039,
        "text": "えぇー?",
        "isThemeCandidate": false
      },
      {
        "speechId": 645,
        "sourceStartMs": 6483039,
        "sourceEndMs": 6484639,
        "text": "まー?",
        "isThemeCandidate": false
      },
      {
        "speechId": 646,
        "sourceStartMs": 6484639,
        "sourceEndMs": 6485520,
        "text": "チャンスだけど?",
        "isThemeCandidate": false
      },
      {
        "speechId": 647,
        "sourceStartMs": 6485520,
        "sourceEndMs": 6488640,
        "text": "あ、どうしよう?",
        "isThemeCandidate": false
      },
      {
        "speechId": 648,
        "sourceStartMs": 6488640,
        "sourceEndMs": 6489301,
        "text": "転がす?",
        "isThemeCandidate": false
      },
      {
        "speechId": 649,
        "sourceStartMs": 6489301,
        "sourceEndMs": 6493982,
        "text": "それとも送りバント?",
        "isThemeCandidate": false
      },
      {
        "speechId": 650,
        "sourceStartMs": 6493982,
        "sourceEndMs": 6500204,
        "text": "え、あーでも転、うーん転がすか普通にうーん、転がすと出バント?",
        "isThemeCandidate": false
      },
      {
        "speechId": 651,
        "sourceStartMs": 6500204,
        "sourceEndMs": 6508846,
        "text": "うーん、まあ一旦転がすかさっきみたいに普通にアウトってなるかもしれんけどバントからスクイーズでちゃんと1点取るべき?",
        "isThemeCandidate": false
      },
      {
        "speechId": 652,
        "sourceStartMs": 6511002,
        "sourceEndMs": 6525131,
        "text": "ちゃんと1点取るか迷うなぁ…うーん…ま、これ…剥がすかぁ…一旦…お願い!",
        "isThemeCandidate": false
      },
      {
        "speechId": 653,
        "sourceStartMs": 6525131,
        "sourceEndMs": 6525871,
        "text": "頑張ってよ!",
        "isThemeCandidate": true
      },
      {
        "speechId": 654,
        "sourceStartMs": 6525871,
        "sourceEndMs": 6526271,
        "text": "転がったら!",
        "isThemeCandidate": true
      },
      {
        "speechId": 655,
        "sourceStartMs": 6526271,
        "sourceEndMs": 6527292,
        "text": "よーしよしよしよしよしよしよし!",
        "isThemeCandidate": true
      },
      {
        "speechId": 656,
        "sourceStartMs": 6527292,
        "sourceEndMs": 6528033,
        "text": "泡の工夫!",
        "isThemeCandidate": true
      },
      {
        "speechId": 657,
        "sourceStartMs": 6528033,
        "sourceEndMs": 6529974,
        "text": "やればできるじゃない!",
        "isThemeCandidate": true
      },
      {
        "speechId": 658,
        "sourceStartMs": 6529974,
        "sourceEndMs": 6530934,
        "text": "なんだって!",
        "isThemeCandidate": true
      },
      {
        "speechId": 659,
        "sourceStartMs": 6530934,
        "sourceEndMs": 6531275,
        "text": "スワ!",
        "isThemeCandidate": true
      },
      {
        "speechId": 660,
        "sourceStartMs": 6531275,
        "sourceEndMs": 6532956,
        "text": "お前やれんのか!",
        "isThemeCandidate": true
      },
      {
        "speechId": 661,
        "sourceStartMs": 6532956,
        "sourceEndMs": 6534216,
        "text": "スワ!",
        "isThemeCandidate": true
      },
      {
        "speechId": 662,
        "sourceStartMs": 6534216,
        "sourceEndMs": 6535777,
        "text": "やれんのか状態で!",
        "isThemeCandidate": true
      },
      {
        "speechId": 663,
        "sourceStartMs": 6535777,
        "sourceEndMs": 6539920,
        "text": "スワスワスワ!",
        "isThemeCandidate": true
      },
      {
        "speechId": 664,
        "sourceStartMs": 6540034,
        "sourceEndMs": 6569860,
        "text": "いいかーでも総力はBでも数字が3だとなんか嫌な感じがするよなやばっすわやれんのかお前転がせ5かこれやれんのか状態でまずいやる気かってすわやんのかってどうするってこれトルいくべちょっと怖いちょっと怖い3とか言われるとちょっと嫌な気が",
        "isThemeCandidate": false
      },
      {
        "speechId": 665,
        "sourceStartMs": 6570790,
        "sourceEndMs": 6572211,
        "text": "犠牲フライもある?",
        "isThemeCandidate": false
      },
      {
        "speechId": 666,
        "sourceStartMs": 6572211,
        "sourceEndMs": 6572671,
        "text": "確かに!",
        "isThemeCandidate": false
      },
      {
        "speechId": 667,
        "sourceStartMs": 6572671,
        "sourceEndMs": 6573891,
        "text": "犠牲フライでもいい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 668,
        "sourceStartMs": 6573891,
        "sourceEndMs": 6577653,
        "text": "トウコンも切るのか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 669,
        "sourceStartMs": 6577653,
        "sourceEndMs": 6579774,
        "text": "これトウコンも切るのか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 670,
        "sourceStartMs": 6579774,
        "sourceEndMs": 6582235,
        "text": "これこれトウコン?",
        "isThemeCandidate": false
      },
      {
        "speechId": 671,
        "sourceStartMs": 6582235,
        "sourceEndMs": 6582775,
        "text": "いかんか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 672,
        "sourceStartMs": 6582775,
        "sourceEndMs": 6584636,
        "text": "これやっとくべきか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 673,
        "sourceStartMs": 6584636,
        "sourceEndMs": 6589198,
        "text": "これ最悪ギ…今の風見て飛ばないぞ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 674,
        "sourceStartMs": 6589198,
        "sourceEndMs": 6590698,
        "text": "風強いから犠牲ダメ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 675,
        "sourceStartMs": 6590698,
        "sourceEndMs": 6596661,
        "text": "そっかそうかもわかった風向きね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 676,
        "sourceStartMs": 6596661,
        "sourceEndMs": 6598882,
        "text": "わかったトウコンはまだわかった",
        "isThemeCandidate": false
      },
      {
        "speechId": 677,
        "sourceStartMs": 6601538,
        "sourceEndMs": 6603359,
        "text": "ほな、転がす?",
        "isThemeCandidate": false
      },
      {
        "speechId": 678,
        "sourceStartMs": 6603359,
        "sourceEndMs": 6606102,
        "text": "じゃあ転がすこれ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 679,
        "sourceStartMs": 6606102,
        "sourceEndMs": 6611666,
        "text": "じゃあ転がすこれ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 680,
        "sourceStartMs": 6611666,
        "sourceEndMs": 6615068,
        "text": "んー転ごうでいいかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 681,
        "sourceStartMs": 6615068,
        "sourceEndMs": 6622814,
        "text": "ほなほな転ごうか月通が怖い?",
        "isThemeCandidate": false
      },
      {
        "speechId": 682,
        "sourceStartMs": 6622814,
        "sourceEndMs": 6623315,
        "text": "そうか!",
        "isThemeCandidate": false
      },
      {
        "speechId": 683,
        "sourceStartMs": 6623315,
        "sourceEndMs": 6624656,
        "text": "月通が怖いか!",
        "isThemeCandidate": false
      },
      {
        "speechId": 684,
        "sourceStartMs": 6624656,
        "sourceEndMs": 6626717,
        "text": "ほなセンター返しか!",
        "isThemeCandidate": false
      },
      {
        "speechId": 685,
        "sourceStartMs": 6626717,
        "sourceEndMs": 6629600,
        "text": "ほなセンター返しか!",
        "isThemeCandidate": false
      },
      {
        "speechId": 686,
        "sourceStartMs": 6629600,
        "sourceEndMs": 6629780,
        "text": "じゃあ",
        "isThemeCandidate": false
      },
      {
        "speechId": 687,
        "sourceStartMs": 6634591,
        "sourceEndMs": 6637592,
        "text": "いけ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 688,
        "sourceStartMs": 6637592,
        "sourceEndMs": 6638872,
        "text": "センター返しだ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 689,
        "sourceStartMs": 6638872,
        "sourceEndMs": 6657739,
        "text": "飛んでるこれ犠牲フライみたいな感じになら…な…な…まあまあまあまあ1点入ったいいじゃんチャンスだ",
        "isThemeCandidate": false
      },
      {
        "speechId": 690,
        "sourceStartMs": 6660842,
        "sourceEndMs": 6662063,
        "text": "え?",
        "isThemeCandidate": false
      },
      {
        "speechId": 691,
        "sourceStartMs": 6662063,
        "sourceEndMs": 6665005,
        "text": "盗塁なんかできそうじゃね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 692,
        "sourceStartMs": 6665005,
        "sourceEndMs": 6666546,
        "text": "コロネ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 693,
        "sourceStartMs": 6666546,
        "sourceEndMs": 6669368,
        "text": "盗塁D、負草力Bえ、いけるよね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 694,
        "sourceStartMs": 6669368,
        "sourceEndMs": 6669989,
        "text": "いけるっしょ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 695,
        "sourceStartMs": 6669989,
        "sourceEndMs": 6670829,
        "text": "盗塁していいよね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 696,
        "sourceStartMs": 6670829,
        "sourceEndMs": 6673791,
        "text": "気持ちいいしていいっすかこれ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 697,
        "sourceStartMs": 6673791,
        "sourceEndMs": 6674572,
        "text": "え、スクイーズ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 698,
        "sourceStartMs": 6674572,
        "sourceEndMs": 6676974,
        "text": "え、と、スクイーズ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 699,
        "sourceStartMs": 6676974,
        "sourceEndMs": 6678715,
        "text": "と、スクイーズ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 700,
        "sourceStartMs": 6678715,
        "sourceEndMs": 6679375,
        "text": "盗塁スクイーズ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 701,
        "sourceStartMs": 6679375,
        "sourceEndMs": 6679755,
        "text": "盗塁?",
        "isThemeCandidate": false
      },
      {
        "speechId": 702,
        "sourceStartMs": 6679755,
        "sourceEndMs": 6680196,
        "text": "スクイーズ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 703,
        "sourceStartMs": 6680196,
        "sourceEndMs": 6680536,
        "text": "盗塁?",
        "isThemeCandidate": false
      },
      {
        "speechId": 704,
        "sourceStartMs": 6680536,
        "sourceEndMs": 6680996,
        "text": "スクイーズ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 705,
        "sourceStartMs": 6680996,
        "sourceEndMs": 6681337,
        "text": "盗塁?",
        "isThemeCandidate": false
      },
      {
        "speechId": 706,
        "sourceStartMs": 6681337,
        "sourceEndMs": 6682217,
        "text": "スクイーズ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 707,
        "sourceStartMs": 6682217,
        "sourceEndMs": 6682597,
        "text": "盗塁?",
        "isThemeCandidate": false
      },
      {
        "speechId": 708,
        "sourceStartMs": 6682597,
        "sourceEndMs": 6683218,
        "text": "スクイーズ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 709,
        "sourceStartMs": 6683218,
        "sourceEndMs": 6684279,
        "text": "盗塁してスクイーズ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 710,
        "sourceStartMs": 6684279,
        "sourceEndMs": 6685640,
        "text": "数字変わっちゃうけど良き?",
        "isThemeCandidate": false
      },
      {
        "speechId": 711,
        "sourceStartMs": 6685640,
        "sourceEndMs": 6687881,
        "text": "数字変わっちゃうけど良き?",
        "isThemeCandidate": false
      },
      {
        "speechId": 712,
        "sourceStartMs": 6687881,
        "sourceEndMs": 6688902,
        "text": "盗塁したら数字変わっちゃうけど",
        "isThemeCandidate": false
      },
      {
        "speechId": 713,
        "sourceStartMs": 6691546,
        "sourceEndMs": 6696669,
        "text": "まずいか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 714,
        "sourceStartMs": 6696669,
        "sourceEndMs": 6703232,
        "text": "まずいかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 715,
        "sourceStartMs": 6703232,
        "sourceEndMs": 6705653,
        "text": "いけるよね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 716,
        "sourceStartMs": 6705653,
        "sourceEndMs": 6710035,
        "text": "肩もクイックもD肩もクイックもDさっき見た?",
        "isThemeCandidate": false
      },
      {
        "speechId": 717,
        "sourceStartMs": 6710035,
        "sourceEndMs": 6715998,
        "text": "選手は危ないかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 718,
        "sourceStartMs": 6715998,
        "sourceEndMs": 6719260,
        "text": "いける?",
        "isThemeCandidate": false
      },
      {
        "speechId": 719,
        "sourceStartMs": 6719260,
        "sourceEndMs": 6719900,
        "text": "牽制されてるから少し",
        "isThemeCandidate": false
      },
      {
        "speechId": 720,
        "sourceStartMs": 6720540,
        "sourceEndMs": 6721260,
        "text": "いける?",
        "isThemeCandidate": false
      },
      {
        "speechId": 721,
        "sourceStartMs": 6721260,
        "sourceEndMs": 6721901,
        "text": "いけるか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 722,
        "sourceStartMs": 6721901,
        "sourceEndMs": 6722181,
        "text": "いける?",
        "isThemeCandidate": false
      },
      {
        "speechId": 723,
        "sourceStartMs": 6722181,
        "sourceEndMs": 6722621,
        "text": "いけます?",
        "isThemeCandidate": false
      },
      {
        "speechId": 724,
        "sourceStartMs": 6722621,
        "sourceEndMs": 6723001,
        "text": "いけます?",
        "isThemeCandidate": false
      },
      {
        "speechId": 725,
        "sourceStartMs": 6723001,
        "sourceEndMs": 6728003,
        "text": "いけます?",
        "isThemeCandidate": false
      },
      {
        "speechId": 726,
        "sourceStartMs": 6728003,
        "sourceEndMs": 6728823,
        "text": "いけるか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 727,
        "sourceStartMs": 6728823,
        "sourceEndMs": 6734205,
        "text": "え、ちょっとなんか、全然見えない見えねーよ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 728,
        "sourceStartMs": 6734205,
        "sourceEndMs": 6748310,
        "text": "あ、1になっちゃったあいつスクイーズ1になっちゃったこれこれスクイーズ1になっちゃったあ、1になっちゃったけどこれやっちゃったかこれ、転がすか一旦",
        "isThemeCandidate": false
      },
      {
        "speechId": 729,
        "sourceStartMs": 6750866,
        "sourceEndMs": 6763495,
        "text": "うんクセモノ切った方がいいかなーこりゃー切るか3かー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 730,
        "sourceStartMs": 6763495,
        "sourceEndMs": 6776824,
        "text": "3だってよー3微妙かなーんー3は危険?",
        "isThemeCandidate": false
      },
      {
        "speechId": 731,
        "sourceStartMs": 6776824,
        "sourceEndMs": 6779286,
        "text": "ん、うん",
        "isThemeCandidate": false
      },
      {
        "speechId": 732,
        "sourceStartMs": 6780658,
        "sourceEndMs": 6788384,
        "text": "微妙かーバンド職人ついてるからいけんじゃね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 733,
        "sourceStartMs": 6788384,
        "sourceEndMs": 6791586,
        "text": "まあほんと?",
        "isThemeCandidate": false
      },
      {
        "speechId": 734,
        "sourceStartMs": 6791586,
        "sourceEndMs": 6793828,
        "text": "いってみるかじゃあね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 735,
        "sourceStartMs": 6793828,
        "sourceEndMs": 6797971,
        "text": "バンド職人があるんだから!",
        "isThemeCandidate": false
      },
      {
        "speechId": 736,
        "sourceStartMs": 6797971,
        "sourceEndMs": 6798652,
        "text": "いけるいける!",
        "isThemeCandidate": false
      },
      {
        "speechId": 737,
        "sourceStartMs": 6798652,
        "sourceEndMs": 6799832,
        "text": "バンド職人だから!",
        "isThemeCandidate": false
      },
      {
        "speechId": 738,
        "sourceStartMs": 6799832,
        "sourceEndMs": 6800573,
        "text": "よしまだチャンスだ",
        "isThemeCandidate": false
      },
      {
        "speechId": 739,
        "sourceStartMs": 6813459,
        "sourceEndMs": 6818381,
        "text": "さあ、どうする?",
        "isThemeCandidate": false
      },
      {
        "speechId": 740,
        "sourceStartMs": 6818381,
        "sourceEndMs": 6827485,
        "text": "センター返し4だから、センター返しなのかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 741,
        "sourceStartMs": 6827485,
        "sourceEndMs": 6829686,
        "text": "ねぇ、センター返していいかしらね、これ普通に。",
        "isThemeCandidate": false
      },
      {
        "speechId": 742,
        "sourceStartMs": 6829686,
        "sourceEndMs": 6834008,
        "text": "撃てるかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 743,
        "sourceStartMs": 6834008,
        "sourceEndMs": 6839710,
        "text": "おっ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 744,
        "sourceStartMs": 6851910,
        "sourceEndMs": 6869600,
        "text": "やめるこんな状態で俺に任せてくるなやめてくれ俺にどうしろってんだ一旦スタミナ一旦スタミナですかこれ先生",
        "isThemeCandidate": false
      },
      {
        "speechId": 745,
        "sourceStartMs": 6874583,
        "sourceEndMs": 6899840,
        "text": "マジやめてくれミートBパワーE内角も外角も5あるぞ外角5でいいかなここ普通に1点は上げる気でいこううーん低めで月中狙い",
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
