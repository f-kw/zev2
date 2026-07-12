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
  "evaluationInputId": "o8rZAhARXAc-theme-candidate-009",
  "sourceVideoId": "o8rZAhARXAc",
  "selectedTheme": {
    "id": "input-selection-v004-candidate-009",
    "title": "療養中のリリカからの助言と妄想を繰り広げる宝鐘マリン",
    "summary": "コロナで療養中の一条コーリリカがチャットでアドバイスをくれたことへの感謝と、卒業生としての設定に合わせた寸劇のようなやり取りが面白いため。",
    "candidateSpeechIds": [
      220,
      223,
      224
    ],
    "whyItCanBeClipped": "コロナで療養中の一条コーリリカがチャットでアドバイスをくれたことへの感謝と、卒業生としての設定に合わせた寸劇のようなやり取りが面白いため。",
    "compositionNote": "提示された候補発話範囲の中から、テーマが単独で成立する最小区間を選ぶ。"
  },
  "transcript": {
    "language": "ja-JP",
    "durationSec": 11898.441,
    "speechUnitGroups": [
      [
        187,
        188,
        189,
        190,
        191,
        192,
        193,
        194,
        195,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        203,
        204,
        205,
        206,
        207,
        208,
        209,
        210,
        211,
        212,
        213,
        214,
        215,
        216,
        217,
        218,
        219,
        220,
        221,
        222,
        223,
        224,
        225,
        226,
        227,
        228,
        229,
        230,
        231,
        232,
        233,
        234,
        235,
        236,
        237,
        238,
        239,
        240,
        241,
        242,
        243,
        244,
        245,
        246,
        247,
        248,
        249,
        250,
        251,
        252,
        253,
        254,
        255,
        256,
        257,
        258,
        259,
        260,
        261,
        262,
        263,
        264,
        265,
        266,
        267,
        268,
        269,
        270,
        271,
        272,
        273,
        274,
        275,
        276,
        277,
        278,
        279,
        280,
        281,
        282,
        283,
        284,
        285,
        286,
        287,
        288,
        289,
        290,
        291,
        292,
        293,
        294,
        295,
        296,
        297,
        298,
        299,
        300,
        301,
        302,
        303
      ]
    ],
    "segments": [
      {
        "speechId": 187,
        "sourceStartMs": 1535674,
        "sourceEndMs": 1558742,
        "text": "変身来てる来てなー誰も知らないんだきっとそんなん誰も知らないんだだって作ってる人見たことないもんリリカ以外こうしてすげー音符が出とるおーあずきちとかにいいね",
        "isThemeCandidate": false
      },
      {
        "speechId": 188,
        "sourceStartMs": 1563114,
        "sourceEndMs": 1578939,
        "text": "おしゃれやねーフブちゃんだと折り辺MAXにできないからもったいない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 189,
        "sourceStartMs": 1578939,
        "sourceEndMs": 1582680,
        "text": "なるほどねーフブちゃんだったらこれでもフブちゃんでいいのかしら?",
        "isThemeCandidate": false
      },
      {
        "speechId": 190,
        "sourceStartMs": 1582680,
        "sourceEndMs": 1589142,
        "text": "ちなみに今あのーアンケートだともうフブちゃんがめっちゃ強いんだけど",
        "isThemeCandidate": false
      },
      {
        "speechId": 191,
        "sourceStartMs": 1592690,
        "sourceEndMs": 1604114,
        "text": "アンケートだとフブちゃんが多いんだけど雰囲気でフブちゃん見つけたいって感じがあるのかアンケート信じて?",
        "isThemeCandidate": false
      },
      {
        "speechId": 192,
        "sourceStartMs": 1604114,
        "sourceEndMs": 1607395,
        "text": "うんフブちゃん素手強いから?",
        "isThemeCandidate": false
      },
      {
        "speechId": 193,
        "sourceStartMs": 1607395,
        "sourceEndMs": 1618599,
        "text": "うんうんうんうん確かにはいはいはいはいマックスは厳しいからもったいないっていうのと",
        "isThemeCandidate": false
      },
      {
        "speechId": 194,
        "sourceStartMs": 1620022,
        "sourceEndMs": 1626064,
        "text": "クラックスじゃなくてもふぶちゃんだと吸収数は大丈夫?",
        "isThemeCandidate": false
      },
      {
        "speechId": 195,
        "sourceStartMs": 1626064,
        "sourceEndMs": 1626344,
        "text": "吸収数?",
        "isThemeCandidate": false
      },
      {
        "speechId": 196,
        "sourceStartMs": 1626344,
        "sourceEndMs": 1630505,
        "text": "吸収数?",
        "isThemeCandidate": false
      },
      {
        "speechId": 197,
        "sourceStartMs": 1630505,
        "sourceEndMs": 1642828,
        "text": "うーん本番吹雪が降りた時どうすんだよ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 198,
        "sourceStartMs": 1642828,
        "sourceEndMs": 1648590,
        "text": "そしたら彼らがフォーク投げるんじゃないのか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 199,
        "sourceStartMs": 1648590,
        "sourceEndMs": 1648950,
        "text": "はーちょ",
        "isThemeCandidate": false
      },
      {
        "speechId": 200,
        "sourceStartMs": 1651250,
        "sourceEndMs": 1670237,
        "text": "他の人だってマックスにはなれないうーんま、ふぶちゃんがあ、4級種になっちゃうよって話か確かに4種類になっちゃうふぶちゃんま、一旦作ってみるかとりあえずクレッセントムーンでうんえーっと",
        "isThemeCandidate": false
      },
      {
        "speechId": 201,
        "sourceStartMs": 1680062,
        "sourceEndMs": 1705838,
        "text": "じゃあうーんはいはいはいはいはいはいはいはいはい確かにそれあるよな",
        "isThemeCandidate": false
      },
      {
        "speechId": 202,
        "sourceStartMs": 1710118,
        "sourceEndMs": 1739478,
        "text": "可能性もあるねそれで言うと今マリンとこだとイオフィーだったらまだカーブしか覚えてないからイオフィーならカーブしか覚えてないまだなんだけどなーただ性能的にはふーちゃんが強い",
        "isThemeCandidate": false
      },
      {
        "speechId": 203,
        "sourceStartMs": 1741038,
        "sourceEndMs": 1751006,
        "text": "他の子だと変化上げるので残り1年変化量上げるのに多分残り1年半?",
        "isThemeCandidate": false
      },
      {
        "speechId": 204,
        "sourceStartMs": 1751006,
        "sourceEndMs": 1751666,
        "text": "1年?",
        "isThemeCandidate": false
      },
      {
        "speechId": 205,
        "sourceStartMs": 1751666,
        "sourceEndMs": 1769880,
        "text": "残り1年か1年使うじゃないですかっていう中であのあんまり多分育てらんなくてスタミナもFとかEの状態で投げることになっちゃうっていうのもあるか試合に出さなきゃいけなくて試合に出さないと",
        "isThemeCandidate": false
      },
      {
        "speechId": 206,
        "sourceStartMs": 1770034,
        "sourceEndMs": 1799258,
        "text": "うんうんはいはいはいはいうんそもそもフブキしか投げないでしょについてはそんなことなくて去年スタミナSまで上げてキャッチャーBだったうちのプレアちゃんも結局投げ切れなかったから投げ切ることはできないフブちゃんどんだけスタミナ上げてもだから絶対",
        "isThemeCandidate": false
      },
      {
        "speechId": 207,
        "sourceStartMs": 1800278,
        "sourceEndMs": 1829780,
        "text": "あと一人二人は投げるというのは投げるって感じ確かに栄冠中はフブちゃんしか投げてないけどって感じむずいどうしよう悩むなどうしようなうーんカエラはフォークあるからフォークでいいと思うんだよなただフブちゃんの変化球が微妙なのは",
        "isThemeCandidate": false
      },
      {
        "speechId": 208,
        "sourceStartMs": 1830198,
        "sourceEndMs": 1857638,
        "text": "確かにそうまあアンケート取ったしなアンケート取ったしなみたいな感じアンケート取ったからふーちゃんにすべきなのではって感じはあるよね",
        "isThemeCandidate": false
      },
      {
        "speechId": 209,
        "sourceStartMs": 1861155,
        "sourceEndMs": 1865434,
        "text": "あーですねー",
        "isThemeCandidate": false
      },
      {
        "speechId": 210,
        "sourceStartMs": 1878306,
        "sourceEndMs": 1889442,
        "text": "トーシュ2枚で安定させるっていうので言うと2枚目であるカエラがフォーク持ってるからでフーブちゃんが強い変化球ないからフーブちゃんに強い変化球を持たせるのがいいっていう話なんだよね",
        "isThemeCandidate": false
      },
      {
        "speechId": 211,
        "sourceStartMs": 1890554,
        "sourceEndMs": 1891874,
        "text": "ま、ふぶちゃんでいっかー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 212,
        "sourceStartMs": 1891874,
        "sourceEndMs": 1892834,
        "text": "もう!",
        "isThemeCandidate": false
      },
      {
        "speechId": 213,
        "sourceStartMs": 1892834,
        "sourceEndMs": 1893655,
        "text": "ふぶちゃんでいこう!",
        "isThemeCandidate": false
      },
      {
        "speechId": 214,
        "sourceStartMs": 1893655,
        "sourceEndMs": 1896115,
        "text": "じゃあちょっとこの、みんな角度とかさ変化とかさ一緒に考えてくんね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 215,
        "sourceStartMs": 1896115,
        "sourceEndMs": 1898696,
        "text": "マリには難しいわ一緒に考えてくんね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 216,
        "sourceStartMs": 1898696,
        "sourceEndMs": 1919900,
        "text": "ちょ、これアンケート終了しとこうんえっと折り辺ですがふぶけで作る場合はすでに変化量がいっぱいなのでこの後に通常の1.3倍の経験値があー必要なので変化球、変化量がそっとんどん育ちます",
        "isThemeCandidate": false
      },
      {
        "speechId": 217,
        "sourceStartMs": 1920354,
        "sourceEndMs": 1948130,
        "text": "なので変化量が少なくても十分なものを覚えさせたいんですが下変化のチェンジアップが弱いためその等級割合を減らしつつゴミマンでも強いナックル系になると思いますだってなるほど確かに変化量がパンパンだから経験値が高くなりすぎてきついんだそうかもうパンパンか",
        "isThemeCandidate": false
      },
      {
        "speechId": 218,
        "sourceStartMs": 1950278,
        "sourceEndMs": 1979700,
        "text": "確かに経験値が1.3倍必要なんだって数万の経験値かこりゃ育たなそうやなこりゃ育たなそうスタミナがきついかふぶちゃんの変化量一生懸命上げたことがあだとなってしまった変化量全力出しすぎたことが",
        "isThemeCandidate": false
      },
      {
        "speechId": 219,
        "sourceStartMs": 1980758,
        "sourceEndMs": 2008278,
        "text": "あ、だとオリヘンはスタミナ消費一緒なんだへーオリヘンだったらスタミナ消費量変わらんらしいよ全部同じなんだってやばいもうたぶんミリシラミリシラしかいないミリシラしかいない",
        "isThemeCandidate": false
      },
      {
        "speechId": 220,
        "sourceStartMs": 2010874,
        "sourceEndMs": 2039740,
        "text": "リリカがチャットくれてるえっとリリカコロナなのにどうもありがとうごめんなコロナ中にありがとうえっとリリカが去年ボタン先輩にお伝えしたのオリジナル九州やっぱりフォークが一番強いとのことおーなるほどえ待ってちょっと相談してみようえっとちょっとコロナで今つらいと思うからチャットで送ってみるかえっと今うぶちゃん",
        "isThemeCandidate": true
      },
      {
        "speechId": 221,
        "sourceStartMs": 2040578,
        "sourceEndMs": 2069680,
        "text": "みーちゃんの変化量がもう10くらいいってんだよなそこにさらに追加で変化球を覚えさせてもみたいなオーラがありつつ第2投手の彼らはフォーク持ってて",
        "isThemeCandidate": false
      },
      {
        "speechId": 222,
        "sourceStartMs": 2086777,
        "sourceEndMs": 2099880,
        "text": "他2人はえーっとスタミナとかコントロールとかからFみたいな感じなんだけどどうしよう相談してみようライバルなのに教えてくれるいやライバルライバルって言いますけどね俺たちは仲間",
        "isThemeCandidate": false
      },
      {
        "speechId": 223,
        "sourceStartMs": 2101938,
        "sourceEndMs": 2129586,
        "text": "忘れてるかもしれませんけどねマリン監督はリリカの限界上卒業生なんです監督監督お久しぶりですすいませんマリンが不勉強なせいであのーこの私去年は使えなくてすいませんでしたあのーリリーフのボタンさんあかっこよかったですねいやーマリンすいませんこの私覚えられなくてうーんいやーここに来て勉強になります",
        "isThemeCandidate": true
      },
      {
        "speechId": 224,
        "sourceStartMs": 2131266,
        "sourceEndMs": 2155086,
        "text": "知ってんよマリン黙れ黙りやがれうんはいドラフトの時なんて言ってたっけえなんだったっけえいやリリカ監督のもとでいっぱい勉強できてこうしてうんコロコロに出ることができて嬉しいですかなって言ったかも",
        "isThemeCandidate": true
      },
      {
        "speechId": 225,
        "sourceStartMs": 2164080,
        "sourceEndMs": 2189900,
        "text": "確かにマリンではなくシシロにつけたのってマリンが転生でエースだったから確かにリリカだったらフブちゃんにつけないってことだよねつまりリリカはマリンが最初にいてすごく性能良かったけど後発のボタンさんの方に覚えさせたんだもんねリリーフを強くね",
        "isThemeCandidate": false
      },
      {
        "speechId": 226,
        "sourceStartMs": 2190118,
        "sourceEndMs": 2218366,
        "text": "ただリリーフで出す予定のカエラがすでにフォークがあるからって思うと誰か違うそれ以外の3人目を育てるってことになるねイヴォフィとかねラオーラはすでに変化量が今なんかもう3球種くらいあってあー",
        "isThemeCandidate": false
      },
      {
        "speechId": 227,
        "sourceStartMs": 2220226,
        "sourceEndMs": 2249754,
        "text": "結果的にはフブちゃんは必要経験値加味するとかなりもったいないからよひみたいなまだこれからっていう人によひ弱すぎるそうねスタミナもないし迷うな",
        "isThemeCandidate": false
      },
      {
        "speechId": 228,
        "sourceStartMs": 2273466,
        "sourceEndMs": 2275151,
        "text": "結構もうカーブ育てて…うわ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 229,
        "sourceStartMs": 2275151,
        "sourceEndMs": 2276014,
        "text": "どうしよう!",
        "isThemeCandidate": false
      },
      {
        "speechId": 230,
        "sourceStartMs": 2283876,
        "sourceEndMs": 2307870,
        "text": "まあリリカ的にはエースにしたいとか思ったら好きなキャラに覚えさせたのもいいしそうだよね本戦はスタミナ消費激しいから強い闘士はいればいるだけいいということですねなるほどうわめっちゃむずいこれどうしようちょっと待って一回さもう一回選手見るか",
        "isThemeCandidate": false
      },
      {
        "speechId": 231,
        "sourceStartMs": 2311058,
        "sourceEndMs": 2339860,
        "text": "もう一回選手見直すかガチムズすぎんこの問題オリジナル変化球来て嬉しいはずなのに逆にわけわからんくなっちゃった俺を迷わせるなあんまりなんだこれ逆に迷いすぎてリリカどうもありがとうゆっくり休んで監督ありがとうございますこの号忘れません粉落とし覚えられなかったマリンが悪いっすすいませんし",
        "isThemeCandidate": false
      },
      {
        "speechId": 232,
        "sourceStartMs": 2341046,
        "sourceEndMs": 2342207,
        "text": "今まで生言ってすみませんした!",
        "isThemeCandidate": false
      },
      {
        "speechId": 233,
        "sourceStartMs": 2342207,
        "sourceEndMs": 2353472,
        "text": "じゃあ一旦…うん…甲子園始まらない…いや合宿も甲子園も始まんねえ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 234,
        "sourceStartMs": 2353472,
        "sourceEndMs": 2355253,
        "text": "だってこんなことになると思わなかった!",
        "isThemeCandidate": false
      },
      {
        "speechId": 235,
        "sourceStartMs": 2355253,
        "sourceEndMs": 2364377,
        "text": "うーん…一旦ご覧ください!",
        "isThemeCandidate": false
      },
      {
        "speechId": 236,
        "sourceStartMs": 2364377,
        "sourceEndMs": 2364978,
        "text": "待つ待つ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 237,
        "sourceStartMs": 2364978,
        "sourceEndMs": 2366398,
        "text": "長文きてる長文!",
        "isThemeCandidate": false
      },
      {
        "speechId": 238,
        "sourceStartMs": 2366398,
        "sourceEndMs": 2368119,
        "text": "はいはいはい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 239,
        "sourceStartMs": 2368119,
        "sourceEndMs": 2369800,
        "text": "新級者にはランク変わり最大100までの",
        "isThemeCandidate": false
      },
      {
        "speechId": 240,
        "sourceStartMs": 2370422,
        "sourceEndMs": 2374885,
        "text": "なるほど、いやめっちゃむずい下が2だからフブちゃん",
        "isThemeCandidate": false
      },
      {
        "speechId": 241,
        "sourceStartMs": 2403400,
        "sourceEndMs": 2429860,
        "text": "相変10だから5くらいは上がるらしい確かにエッジスライダー以外はカスカスのカスみたいな1と2しかないから下ありかまあそしてそして",
        "isThemeCandidate": false
      },
      {
        "speechId": 242,
        "sourceStartMs": 2430354,
        "sourceEndMs": 2459602,
        "text": "あげたいんだったそうスタミナそうだよねスタミナもあげたいうーんでラオーラがこれねなんかまんべんなく中途半端にあげてみましたって感じちょっとまんべんなくいってみました",
        "isThemeCandidate": false
      },
      {
        "speechId": 243,
        "sourceStartMs": 2467827,
        "sourceEndMs": 2489680,
        "text": "って感じねイオフィーがこんな感じでコントロールもスタミナもFなのがマジ終わりって感じなんだけどカーブ全振りしてみましたって感じラオラはもうパンパンだからないオッケオッケオッケイオフィーも無理っぽい",
        "isThemeCandidate": false
      },
      {
        "speechId": 244,
        "sourceStartMs": 2491334,
        "sourceEndMs": 2516786,
        "text": "ちょっとスタミナとコントロール多分上げれないよねもうねその今から今から変化球を全振りしようと思ったらコントロールスタミナどっちもFはまずいか伸びもいいから伸びがいいからストレート投げそうそしてカエラがこれ",
        "isThemeCandidate": false
      },
      {
        "speechId": 245,
        "sourceStartMs": 2522114,
        "sourceEndMs": 2535465,
        "text": "って感じ。",
        "isThemeCandidate": false
      },
      {
        "speechId": 246,
        "sourceStartMs": 2535465,
        "sourceEndMs": 2535805,
        "text": "はい。",
        "isThemeCandidate": false
      },
      {
        "speechId": 247,
        "sourceStartMs": 2535805,
        "sourceEndMs": 2537747,
        "text": "うーんだよね。",
        "isThemeCandidate": false
      },
      {
        "speechId": 248,
        "sourceStartMs": 2537747,
        "sourceEndMs": 2540789,
        "text": "うーんだよね、これ。",
        "isThemeCandidate": false
      },
      {
        "speechId": 249,
        "sourceStartMs": 2540789,
        "sourceEndMs": 2544452,
        "text": "カエラはやっぱフォークのまま?",
        "isThemeCandidate": false
      },
      {
        "speechId": 250,
        "sourceStartMs": 2544452,
        "sourceEndMs": 2545053,
        "text": "うーん。",
        "isThemeCandidate": false
      },
      {
        "speechId": 251,
        "sourceStartMs": 2545053,
        "sourceEndMs": 2546254,
        "text": "はいはいはいはい。",
        "isThemeCandidate": false
      },
      {
        "speechId": 252,
        "sourceStartMs": 2565175,
        "sourceEndMs": 2575438,
        "text": "うんという結論を受けて皆さんいかがでしょうか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 253,
        "sourceStartMs": 2575438,
        "sourceEndMs": 2579840,
        "text": "はいはいはいうーんこれふーぶちゃんしかないという意見が",
        "isThemeCandidate": false
      },
      {
        "speechId": 254,
        "sourceStartMs": 2581422,
        "sourceEndMs": 2584625,
        "text": "次の新入生待つはないんじゃない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 255,
        "sourceStartMs": 2584625,
        "sourceEndMs": 2605742,
        "text": "あ、それにした場合って春夏しかないで育成できる期間ふぶちゃんかほな古川で古川はもう去るねんこの夏でこの夏でさよならやねんうん",
        "isThemeCandidate": false
      },
      {
        "speechId": 256,
        "sourceStartMs": 2623306,
        "sourceEndMs": 2639900,
        "text": "でもイオフィンは伸びがあるからリリカもこれを見た結果伸びがあるならちょっと微妙になってきたって言ってるからいやもうフブちゃんしかないかもしれないもうフブちゃんでいくかアンケもフブちゃんだったしごめん迷って",
        "isThemeCandidate": false
      },
      {
        "speechId": 257,
        "sourceStartMs": 2640022,
        "sourceEndMs": 2668770,
        "text": "こんなにリリカも伸びがBもあるならちょっと微妙になってきたって言ってたからコメントもそう言ってたしフブちゃんかもフブちゃんムキムキにするもうしょうがない迷った",
        "isThemeCandidate": false
      },
      {
        "speechId": 258,
        "sourceStartMs": 2671078,
        "sourceEndMs": 2684228,
        "text": "のぶちゃん中途半端になりそう確かにね確かにねそう弱体化するんまー弱体化?",
        "isThemeCandidate": false
      },
      {
        "speechId": 259,
        "sourceStartMs": 2684228,
        "sourceEndMs": 2690052,
        "text": "世界大会で勝手に変化量上がるかもマジ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 260,
        "sourceStartMs": 2690052,
        "sourceEndMs": 2699920,
        "text": "までもちょっともう他も他がなもう消去法まであるうん消去法かももはやふぶちゃんね",
        "isThemeCandidate": false
      },
      {
        "speechId": 261,
        "sourceStartMs": 2700146,
        "sourceEndMs": 2729660,
        "text": "何を覚えさせよう何がいいかなこの場合うん弱体化するとしないがいる分からんマジで分からんちょっとマリンもオリジナル変化系初めてだから本当に分かんない分かんないやカーブ系はいはいはいはいあー",
        "isThemeCandidate": false
      },
      {
        "speechId": 262,
        "sourceStartMs": 2730002,
        "sourceEndMs": 2759054,
        "text": "カーブ系したいけど少数…でもカーブ系したいってみんな言ってるよ結構ふんふんカーブカーブ系ねキムヤジのじゃあやってみるかキムヤジのオススメでうんうんうん船長が決めた方がいいガチ分からんガチ分からん分かんないよちょっとじゃあ作るかたまなパワーカーブね分かった作ってみようパワーカーブ",
        "isThemeCandidate": false
      },
      {
        "speechId": 263,
        "sourceStartMs": 2770128,
        "sourceEndMs": 2774351,
        "text": "カーブ系のパワーカーブ",
        "isThemeCandidate": false
      },
      {
        "speechId": 264,
        "sourceStartMs": 2792540,
        "sourceEndMs": 2811914,
        "text": "この角度とか変化とかがマジわけわからんのよな名前が付けれる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 265,
        "sourceStartMs": 2811914,
        "sourceEndMs": 2812254,
        "text": "うんはいはいはいで?",
        "isThemeCandidate": false
      },
      {
        "speechId": 266,
        "sourceStartMs": 2812254,
        "sourceEndMs": 2812294,
        "text": "で?",
        "isThemeCandidate": false
      },
      {
        "speechId": 267,
        "sourceStartMs": 2812294,
        "sourceEndMs": 2813695,
        "text": "変化最大?",
        "isThemeCandidate": false
      },
      {
        "speechId": 268,
        "sourceStartMs": 2813695,
        "sourceEndMs": 2815216,
        "text": "変化こう?",
        "isThemeCandidate": false
      },
      {
        "speechId": 269,
        "sourceStartMs": 2815216,
        "sourceEndMs": 2816918,
        "text": "こう?",
        "isThemeCandidate": false
      },
      {
        "speechId": 270,
        "sourceStartMs": 2816918,
        "sourceEndMs": 2818239,
        "text": "キレと変化マシマシ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 271,
        "sourceStartMs": 2818239,
        "sourceEndMs": 2818779,
        "text": "キレと変化?",
        "isThemeCandidate": false
      },
      {
        "speechId": 272,
        "sourceStartMs": 2818779,
        "sourceEndMs": 2819460,
        "text": "こう?",
        "isThemeCandidate": false
      },
      {
        "speechId": 273,
        "sourceStartMs": 2819460,
        "sourceEndMs": 2819920,
        "text": "こう?",
        "isThemeCandidate": false
      },
      {
        "speechId": 274,
        "sourceStartMs": 2821270,
        "sourceEndMs": 2829393,
        "text": "変化、増し、切れと変化あ、なんか1、1、1こ、1超えた重さ最大?",
        "isThemeCandidate": false
      },
      {
        "speechId": 275,
        "sourceStartMs": 2829393,
        "sourceEndMs": 2830033,
        "text": "え?",
        "isThemeCandidate": false
      },
      {
        "speechId": 276,
        "sourceStartMs": 2830033,
        "sourceEndMs": 2832134,
        "text": "やばい、ちょ、きまし?",
        "isThemeCandidate": false
      },
      {
        "speechId": 277,
        "sourceStartMs": 2832134,
        "sourceEndMs": 2832954,
        "text": "き、きまし!",
        "isThemeCandidate": false
      },
      {
        "speechId": 278,
        "sourceStartMs": 2832954,
        "sourceEndMs": 2841037,
        "text": "きましの言うこと聞いたら136になっちゃった!",
        "isThemeCandidate": false
      },
      {
        "speechId": 279,
        "sourceStartMs": 2841037,
        "sourceEndMs": 2842838,
        "text": "あ、あと、な、なに削る?",
        "isThemeCandidate": false
      },
      {
        "speechId": 280,
        "sourceStartMs": 2842838,
        "sourceEndMs": 2843298,
        "text": "なに削る?",
        "isThemeCandidate": false
      },
      {
        "speechId": 281,
        "sourceStartMs": 2843298,
        "sourceEndMs": 2844358,
        "text": "なに削る?",
        "isThemeCandidate": false
      },
      {
        "speechId": 282,
        "sourceStartMs": 2844358,
        "sourceEndMs": 2844918,
        "text": "急速を下げる!",
        "isThemeCandidate": false
      },
      {
        "speechId": 283,
        "sourceStartMs": 2844918,
        "sourceEndMs": 2846479,
        "text": "オッケー、オッケー急速を下げる!",
        "isThemeCandidate": false
      },
      {
        "speechId": 284,
        "sourceStartMs": 2846479,
        "sourceEndMs": 2849420,
        "text": "オッケーこうか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 285,
        "sourceStartMs": 2849420,
        "sourceEndMs": 2849920,
        "text": "おや?",
        "isThemeCandidate": false
      },
      {
        "speechId": 286,
        "sourceStartMs": 2850562,
        "sourceEndMs": 2875926,
        "text": "なぜか上がるむずい待ってえっと待ってここここかここここここだ遅くしても遅くしてもダメなんだここだなるほど下げると増えるんだってことは",
        "isThemeCandidate": false
      },
      {
        "speechId": 287,
        "sourceStartMs": 2884258,
        "sourceEndMs": 2908910,
        "text": "切れをなくそうOKこれでギリギリ収まりました切れを落とせば変化量を落とせブレーキは変えてないから切れ下げればギリギリ入る変化上げすぎ切れば1個戻して変化を1個下げるこうか",
        "isThemeCandidate": false
      },
      {
        "speechId": 288,
        "sourceStartMs": 2913330,
        "sourceEndMs": 2922935,
        "text": "どう?",
        "isThemeCandidate": false
      },
      {
        "speechId": 289,
        "sourceStartMs": 2922935,
        "sourceEndMs": 2922975,
        "text": "あ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 290,
        "sourceStartMs": 2922975,
        "sourceEndMs": 2929678,
        "text": "OBスキルた!",
        "isThemeCandidate": false
      },
      {
        "speechId": 291,
        "sourceStartMs": 2929678,
        "sourceEndMs": 2931019,
        "text": "治ったか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 292,
        "sourceStartMs": 2931019,
        "sourceEndMs": 2931299,
        "text": "治ったか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 293,
        "sourceStartMs": 2931299,
        "sourceEndMs": 2931499,
        "text": "戻った?",
        "isThemeCandidate": false
      },
      {
        "speechId": 294,
        "sourceStartMs": 2931499,
        "sourceEndMs": 2936902,
        "text": "お前なんか調子悪いねなんかね知らんけどちょっと一回投げてみる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 295,
        "sourceStartMs": 2936902,
        "sourceEndMs": 2937102,
        "text": "一回",
        "isThemeCandidate": false
      },
      {
        "speechId": 296,
        "sourceStartMs": 2949238,
        "sourceEndMs": 2961087,
        "text": "こうかすごいシューティングしたって感じで下にグンって落ちた見た?",
        "isThemeCandidate": false
      },
      {
        "speechId": 297,
        "sourceStartMs": 2961087,
        "sourceEndMs": 2963429,
        "text": "見て?",
        "isThemeCandidate": false
      },
      {
        "speechId": 298,
        "sourceStartMs": 2963429,
        "sourceEndMs": 2966331,
        "text": "グン!",
        "isThemeCandidate": false
      },
      {
        "speechId": 299,
        "sourceStartMs": 2966331,
        "sourceEndMs": 2969514,
        "text": "かっこいい落ちてる",
        "isThemeCandidate": false
      },
      {
        "speechId": 300,
        "sourceStartMs": 2971338,
        "sourceEndMs": 2981764,
        "text": "シュンって間違えたストレート投げちゃったど、どうかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 301,
        "sourceStartMs": 2981764,
        "sourceEndMs": 2991490,
        "text": "ど、どうかなこれでカーブに重さ要りません?",
        "isThemeCandidate": false
      },
      {
        "speechId": 302,
        "sourceStartMs": 2991490,
        "sourceEndMs": 2994211,
        "text": "切れないと微妙?",
        "isThemeCandidate": false
      },
      {
        "speechId": 303,
        "sourceStartMs": 2994211,
        "sourceEndMs": 2998134,
        "text": "重さをじゃあ減らして切れを",
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
