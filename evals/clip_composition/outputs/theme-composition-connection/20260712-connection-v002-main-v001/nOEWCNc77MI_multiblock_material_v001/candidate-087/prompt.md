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
  "evaluationInputId": "YE-faluP7zY-theme-candidate-087",
  "sourceVideoId": "YE-faluP7zY",
  "selectedTheme": {
    "id": "input-selection-v004-candidate-087",
    "title": "船にベッドルームを作る宝鐘マリンと戌神ころね",
    "summary": "船内にベッドルームを作る提案をし、4つのベッドが置ける広さに大満足する一連のやり取りが綺麗にまとまっているため。",
    "candidateSpeechIds": [
      1713,
      1714,
      1715,
      1716,
      1717,
      1718,
      1719
    ],
    "whyItCanBeClipped": "船内にベッドルームを作る提案をし、4つのベッドが置ける広さに大満足する一連のやり取りが綺麗にまとまっているため。",
    "compositionNote": "候補発話はテーマ中心の照準。前後の周辺文脈を読み、中心を含む適切な区間を自分の境界判断で切る。根拠範囲の端をそのまま境界へ写さない。",
    "candidateSpeechIdsRole": "theme_center_aim"
  },
  "transcript": {
    "language": "ja-JP",
    "durationSec": 11824.121,
    "speechUnitGroups": [
      [
        1663,
        1664,
        1665,
        1666,
        1667,
        1668,
        1669,
        1670,
        1671,
        1672,
        1673,
        1674,
        1675,
        1676,
        1677,
        1678,
        1679,
        1680,
        1681,
        1682,
        1683,
        1684,
        1685,
        1686,
        1687,
        1688,
        1689,
        1690,
        1691,
        1692,
        1693,
        1694,
        1695,
        1696,
        1697,
        1698,
        1699,
        1700,
        1701,
        1702,
        1703,
        1704,
        1705,
        1706,
        1707,
        1708,
        1709,
        1710,
        1711,
        1712,
        1713,
        1714,
        1715,
        1716,
        1717,
        1718,
        1719,
        1720,
        1721,
        1722,
        1723,
        1724,
        1725,
        1726,
        1727,
        1728,
        1729,
        1730,
        1731,
        1732,
        1733,
        1734,
        1735,
        1736,
        1737,
        1738,
        1739,
        1740,
        1741,
        1742,
        1743,
        1744,
        1745,
        1746,
        1747,
        1748,
        1749
      ]
    ],
    "segments": [
      {
        "speechId": 1663,
        "sourceStartMs": 11161334,
        "sourceEndMs": 11184442,
        "text": "こうやってくると机の位置ずれが気になってきたなひまわりの位置もずれてる気がしてきた1個気になるとめっちゃ気になっちゃうやつなそれなそうなんよよし暖炉とのバランスを見ながらいいなこれが友達かそうだよこの辺かなうん",
        "isThemeCandidate": false
      },
      {
        "speechId": 1664,
        "sourceStartMs": 11193138,
        "sourceEndMs": 11193818,
        "text": "ちょっと晴れてきた。",
        "isThemeCandidate": false
      },
      {
        "speechId": 1665,
        "sourceStartMs": 11193818,
        "sourceEndMs": 11195859,
        "text": "そろそろさ、島にも行きたいね。",
        "isThemeCandidate": false
      },
      {
        "speechId": 1666,
        "sourceStartMs": 11195859,
        "sourceEndMs": 11197099,
        "text": "あ、たしかにね。",
        "isThemeCandidate": false
      },
      {
        "speechId": 1667,
        "sourceStartMs": 11197099,
        "sourceEndMs": 11205401,
        "text": "ね。",
        "isThemeCandidate": false
      },
      {
        "speechId": 1668,
        "sourceStartMs": 11205401,
        "sourceEndMs": 11210322,
        "text": "違うな。",
        "isThemeCandidate": false
      },
      {
        "speechId": 1669,
        "sourceStartMs": 11210322,
        "sourceEndMs": 11211962,
        "text": "完璧?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1670,
        "sourceStartMs": 11211962,
        "sourceEndMs": 11216283,
        "text": "もうちょい。",
        "isThemeCandidate": false
      },
      {
        "speechId": 1671,
        "sourceStartMs": 11216283,
        "sourceEndMs": 11218544,
        "text": "いいね。",
        "isThemeCandidate": false
      },
      {
        "speechId": 1672,
        "sourceStartMs": 11218544,
        "sourceEndMs": 11219144,
        "text": "ここ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1673,
        "sourceStartMs": 11219144,
        "sourceEndMs": 11219484,
        "text": "いいじゃん!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1674,
        "sourceStartMs": 11219484,
        "sourceEndMs": 11219664,
        "text": "椅子の交換。",
        "isThemeCandidate": false
      },
      {
        "speechId": 1675,
        "sourceStartMs": 11219664,
        "sourceEndMs": 11219964,
        "text": "椅子?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1676,
        "sourceStartMs": 11220314,
        "sourceEndMs": 11224838,
        "text": "椅子ってさぁ、あってもなくてもさぁでもローテーブルなんでしょ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1677,
        "sourceStartMs": 11224838,
        "sourceEndMs": 11226559,
        "text": "あ、いいじゃん!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1678,
        "sourceStartMs": 11226559,
        "sourceEndMs": 11228121,
        "text": "あ、いい?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1679,
        "sourceStartMs": 11228121,
        "sourceEndMs": 11229081,
        "text": "めっちゃいいじゃん!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1680,
        "sourceStartMs": 11229081,
        "sourceEndMs": 11229682,
        "text": "あ、めっちゃいい?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1681,
        "sourceStartMs": 11229682,
        "sourceEndMs": 11235026,
        "text": "え、ロ、あ、これローテーブルじゃないやつ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1682,
        "sourceStartMs": 11235026,
        "sourceEndMs": 11241071,
        "text": "これは、これはローテーブルじゃないやつローテーブルも見てみたかったけどね見てみる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1683,
        "sourceStartMs": 11241071,
        "sourceEndMs": 11245835,
        "text": "おくねじゃあ見てみていい?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1684,
        "sourceStartMs": 11245835,
        "sourceEndMs": 11248698,
        "text": "これ、でも可愛いよなぁ、これ可愛いよ",
        "isThemeCandidate": false
      },
      {
        "speechId": 1685,
        "sourceStartMs": 11251114,
        "sourceEndMs": 11271141,
        "text": "デザインはかわいいよワッフルみたいじゃん、ワッフルね、かわいいんだけどな確かにかわいいな、どっかに飾ったらかわいい、普通にかわいいよそれかわいいねうんでもやっぱ食卓囲むときこの高さだなクロスはいいんだけどないいんじゃない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1686,
        "sourceStartMs": 11271141,
        "sourceEndMs": 11280000,
        "text": "でも地面に座ってこう、星座しながら食べるのもツーでしょわびさびわびさびですかわびさびだと思うけど",
        "isThemeCandidate": false
      },
      {
        "speechId": 1687,
        "sourceStartMs": 11281763,
        "sourceEndMs": 11283424,
        "text": "いいと思うよほんと?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1688,
        "sourceStartMs": 11283424,
        "sourceEndMs": 11309582,
        "text": "じゃあ、カーペット敷いてその上にいいじゃんあそこまで考えて置いたひまわりをあっけなく撤去してしまったなんか、あれよ、あのそういう話あったよ、あのミッキーのさ、ミックスアドベンチャーっていうやつでさはいミッキーたちがさ、日本に遊びに来る話があってさうんミニーちゃんがびっくりする",
        "isThemeCandidate": false
      },
      {
        "speechId": 1689,
        "sourceStartMs": 11310778,
        "sourceEndMs": 11310898,
        "text": "何が?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1690,
        "sourceStartMs": 11310898,
        "sourceEndMs": 11333634,
        "text": "え、なんか正座が難しいわーって言ってねデイジーがね、ひっくり返るんだけどねあ、正座だねはいはいはいそう、だからね、あのね、いいよ、ここはさ、正座して食べようやわかった、じゃあカーペット敷いてさ、正座しやすくしとくわいいねーこうね、私たちさ、いつまでさ、やる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1691,
        "sourceStartMs": 11333634,
        "sourceEndMs": 11338418,
        "text": "これ、もう3時間経ってるんだけどえ、ま、え、え、いいよ、マリリーに任せるで",
        "isThemeCandidate": false
      },
      {
        "speechId": 1692,
        "sourceStartMs": 11343464,
        "sourceEndMs": 11366601,
        "text": "楽しいよねでもねあっという間だねな楽しい時間はコーネが作ってくれたご飯全部食べきったいいよまだあるよほら盛り盛り食べたい盛り盛り焼きますなんかさなんかさ大きいさ焼くやつなくしたじゃん今ああうんなくしたなくしたそしたらさなんかさ大きい魚釣れなくなったんだけどさえ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1693,
        "sourceStartMs": 11366601,
        "sourceEndMs": 11369584,
        "text": "でもちょうどよくない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1694,
        "sourceStartMs": 11369584,
        "sourceEndMs": 11369924,
        "text": "大きい魚",
        "isThemeCandidate": false
      },
      {
        "speechId": 1695,
        "sourceStartMs": 11371174,
        "sourceEndMs": 11373455,
        "text": "焦れるよまた焦れる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1696,
        "sourceStartMs": 11373455,
        "sourceEndMs": 11399704,
        "text": "なんかでもさ今さ焼けないじゃんどうせどうせねなんかさ神様がさ今は大きいバーベキューグリルがないから小さい魚だけ与えてあげようみたいなさ空気読んでねそう空気読んでる気がするわこれ神様気が利くやなありがとうございますありがとうございます本当にいい感じになってきたぞ明かり良きいい感じいやマリリンのおかげよ本当ね君たち",
        "isThemeCandidate": false
      },
      {
        "speechId": 1697,
        "sourceStartMs": 11400666,
        "sourceEndMs": 11402486,
        "text": "君たち?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1698,
        "sourceStartMs": 11402486,
        "sourceEndMs": 11402907,
        "text": "君たち?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1699,
        "sourceStartMs": 11402907,
        "sourceEndMs": 11403687,
        "text": "お前たち?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1700,
        "sourceStartMs": 11403687,
        "sourceEndMs": 11404767,
        "text": "お前たち?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1701,
        "sourceStartMs": 11404767,
        "sourceEndMs": 11408048,
        "text": "お前たちじゃないよ君たちね君たち?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1702,
        "sourceStartMs": 11408048,
        "sourceEndMs": 11408568,
        "text": "貴様ら?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1703,
        "sourceStartMs": 11408568,
        "sourceEndMs": 11418930,
        "text": "やばいいや本当いいねマリリンはいい女や何急に何急にどうしたの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1704,
        "sourceStartMs": 11418930,
        "sourceEndMs": 11427031,
        "text": "本当にいい女だと思うからさ思い出したかのようにさ一味代表一味なの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1705,
        "sourceStartMs": 11427031,
        "sourceEndMs": 11429872,
        "text": "コンデ先輩は一味代表の言葉一味だと思うけどね",
        "isThemeCandidate": false
      },
      {
        "speechId": 1706,
        "sourceStartMs": 11431250,
        "sourceEndMs": 11432250,
        "text": "そんなに好きなの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1707,
        "sourceStartMs": 11432250,
        "sourceEndMs": 11434852,
        "text": "私のことそんなに好きなんだ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1708,
        "sourceStartMs": 11434852,
        "sourceEndMs": 11455582,
        "text": "結構喋ってる方だと思うけどでも確かにやめどころがないねそろそろさ切り上げるムードは出していくかそうかじゃあちょっと感想でも言っとく?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1709,
        "sourceStartMs": 11455582,
        "sourceEndMs": 11459924,
        "text": "確かに感想今日はねちょっと中途半端に",
        "isThemeCandidate": false
      },
      {
        "speechId": 1710,
        "sourceStartMs": 11461581,
        "sourceEndMs": 11478929,
        "text": "見せかけて言うてこれね、かなりね出来てきてるってあ、なんだこれあ、そっかベッドが邪魔なんかこう、ね、そうこう感想言ってる間にもね着々とこう着工しておりほらこんなにもね出来上がってきているわけです終わっちゃうの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1711,
        "sourceStartMs": 11478929,
        "sourceEndMs": 11488574,
        "text": "って言ってる終わっちゃうでもちょっとねお腹減ったしね普通にそうだねご飯食べたしねもうちょっと拾っておきたいな木",
        "isThemeCandidate": false
      },
      {
        "speechId": 1712,
        "sourceStartMs": 11491834,
        "sourceEndMs": 11518518,
        "text": "まあでもいい感じになってきてるのではないでしょうかいい綺麗になってるこれはね次回ねあの会見フレンズでコヨリと坂本が見たらば非常にびっくりする光景にびっくりびっくらぽんよこんなのなってるでしょうねロープなくなっちゃったのこれ作りますロープ葉っぱから何のために葉っぱがねそうそうそう何のための葉っぱなんですかそうでしょ",
        "isThemeCandidate": false
      },
      {
        "speechId": 1713,
        "sourceStartMs": 11520066,
        "sourceEndMs": 11524428,
        "text": "あ、ここベッドルームにしよっかな、ワンちゃんいい!",
        "isThemeCandidate": true
      },
      {
        "speechId": 1714,
        "sourceStartMs": 11524428,
        "sourceEndMs": 11525368,
        "text": "いい?",
        "isThemeCandidate": true
      },
      {
        "speechId": 1715,
        "sourceStartMs": 11525368,
        "sourceEndMs": 11526849,
        "text": "めっちゃいい!",
        "isThemeCandidate": true
      },
      {
        "speechId": 1716,
        "sourceStartMs": 11526849,
        "sourceEndMs": 11528309,
        "text": "ここ4つ置けるか?",
        "isThemeCandidate": true
      },
      {
        "speechId": 1717,
        "sourceStartMs": 11528309,
        "sourceEndMs": 11529650,
        "text": "この幅でしょ?",
        "isThemeCandidate": true
      },
      {
        "speechId": 1718,
        "sourceStartMs": 11529650,
        "sourceEndMs": 11532931,
        "text": "最高!",
        "isThemeCandidate": true
      },
      {
        "speechId": 1719,
        "sourceStartMs": 11532931,
        "sourceEndMs": 11549658,
        "text": "最高すぎいいでしょ、いいでしょ最高ここベッドルームねいや、いいなー終わりが見えないな、ちょっと閉めだけしてあとは水面下でこっそり進めとくわ、船長は",
        "isThemeCandidate": true
      },
      {
        "speechId": 1720,
        "sourceStartMs": 11551287,
        "sourceEndMs": 11552047,
        "text": "でも誘って?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1721,
        "sourceStartMs": 11552047,
        "sourceEndMs": 11553908,
        "text": "本当?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1722,
        "sourceStartMs": 11553908,
        "sourceEndMs": 11555869,
        "text": "付き合ってくれるの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1723,
        "sourceStartMs": 11555869,
        "sourceEndMs": 11565995,
        "text": "付き合いたいマリーンそれ告白だよもうでもマリーンはいろんな女いるからな気づいた?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1724,
        "sourceStartMs": 11565995,
        "sourceEndMs": 11571979,
        "text": "だいぶ前から気づいてるけどねバレたか誰でもいいんでしょ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1725,
        "sourceStartMs": 11571979,
        "sourceEndMs": 11578423,
        "text": "そんなことないよ誰でもよくはない選んでんだちゃっかりちゃっかり選んでるよ",
        "isThemeCandidate": false
      },
      {
        "speechId": 1726,
        "sourceStartMs": 11580626,
        "sourceEndMs": 11593310,
        "text": "だから選んでんだね誰でもよくはないあ、そうでもコーネとならやっていける気がする、マリンはほんと?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1727,
        "sourceStartMs": 11593310,
        "sourceEndMs": 11594530,
        "text": "じゃあ愛しのマリン?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1728,
        "sourceStartMs": 11594530,
        "sourceEndMs": 11596111,
        "text": "なんか見つけたよ何?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1729,
        "sourceStartMs": 11596111,
        "sourceEndMs": 11596691,
        "text": "どれ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1730,
        "sourceStartMs": 11596691,
        "sourceEndMs": 11596951,
        "text": "どこ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1731,
        "sourceStartMs": 11596951,
        "sourceEndMs": 11597911,
        "text": "見て、ちょっと遠いかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1732,
        "sourceStartMs": 11597911,
        "sourceEndMs": 11600072,
        "text": "あれあっち見える?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1733,
        "sourceStartMs": 11600072,
        "sourceEndMs": 11602873,
        "text": "あ、ほんとだね!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1734,
        "sourceStartMs": 11602873,
        "sourceEndMs": 11603193,
        "text": "で?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1735,
        "sourceStartMs": 11603193,
        "sourceEndMs": 11603793,
        "text": "行くの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1736,
        "sourceStartMs": 11603793,
        "sourceEndMs": 11604933,
        "text": "ちょっとコーネやめな!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1737,
        "sourceStartMs": 11604933,
        "sourceEndMs": 11606794,
        "text": "行かない行かない行かない行かない!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1738,
        "sourceStartMs": 11606794,
        "sourceEndMs": 11607854,
        "text": "ちょっと今葉っぱ…",
        "isThemeCandidate": false
      },
      {
        "speechId": 1739,
        "sourceStartMs": 11612844,
        "sourceEndMs": 11657128,
        "text": "ということでねこんな感じでねかなり駆け回ってねかなり清涼感のあふれるお家がもう出来上がり始めていますのでねこれはちょっと船長たち裏でねさらに完成度高めておくのでちょっともう作業になりすぎて我々がね非常にまったりしてきちゃったのでちょっと一旦区切りをつけたいと思います割に皆様はお邪魔しましたーありがとうございましたーありがとうございましたーじゃあ、それでは、出航しようかなお、お、お、お、お、おお、お、お、お、お、お来るぞ、来るぞ、来るぞ、来るぞ、来るぞそれでは、行きますよー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1740,
        "sourceStartMs": 11657128,
        "sourceEndMs": 11657508,
        "text": "出航ー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1741,
        "sourceStartMs": 11657508,
        "sourceEndMs": 11662511,
        "text": "やったー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1742,
        "sourceStartMs": 11662511,
        "sourceEndMs": 11665172,
        "text": "ヨーソロなんですけどえ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1743,
        "sourceStartMs": 11665172,
        "sourceEndMs": 11669134,
        "text": "ヨーソロなんですけどあ、ヨーソロねあ、配信見てない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1744,
        "sourceStartMs": 11669134,
        "sourceEndMs": 11669394,
        "text": "もしかして",
        "isThemeCandidate": false
      },
      {
        "speechId": 1745,
        "sourceStartMs": 11670162,
        "sourceEndMs": 11673186,
        "text": "それでは行きますよー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1746,
        "sourceStartMs": 11673186,
        "sourceEndMs": 11678012,
        "text": "出航!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1747,
        "sourceStartMs": 11678012,
        "sourceEndMs": 11679954,
        "text": "よっしゃろー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1748,
        "sourceStartMs": 11679954,
        "sourceEndMs": 11684860,
        "text": "発音違うんだよな",
        "isThemeCandidate": false
      },
      {
        "speechId": 1749,
        "sourceStartMs": 11740116,
        "sourceEndMs": 11740238,
        "text": "またね。",
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
