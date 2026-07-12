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
  "evaluationInputId": "YE-faluP7zY-theme-candidate-017",
  "sourceVideoId": "YE-faluP7zY",
  "selectedTheme": {
    "id": "input-selection-v004-candidate-017",
    "title": "イノシシ3匹に焦る2人",
    "summary": "ゲーム内でイノシシが3匹もいる危機的状況に遭遇し、慌てて矢の準備や作戦を立てるコミカルな掛け合いが切り抜きに適している。",
    "candidateSpeechIds": [
      120,
      121,
      122,
      123,
      124,
      125,
      126,
      127
    ],
    "whyItCanBeClipped": "ゲーム内でイノシシが3匹もいる危機的状況に遭遇し、慌てて矢の準備や作戦を立てるコミカルな掛け合いが切り抜きに適している。",
    "compositionNote": "候補発話はテーマ中心の照準。前後の周辺文脈を読み、中心を含む適切な区間を自分の境界判断で切る。根拠範囲の端をそのまま境界へ写さない。",
    "candidateSpeechIdsRole": "theme_center_aim"
  },
  "transcript": {
    "language": "ja-JP",
    "durationSec": 11824.121,
    "speechUnitGroups": [
      [
        73,
        74,
        75,
        76,
        77,
        78,
        79,
        80,
        81,
        82,
        83,
        84,
        85,
        86,
        87,
        88,
        89,
        90,
        91,
        92,
        93,
        94,
        95,
        96,
        97,
        98,
        99,
        100,
        101,
        102,
        103,
        104,
        105,
        106,
        107,
        108,
        109,
        110,
        111,
        112,
        113,
        114,
        115,
        116,
        117,
        118,
        119,
        120,
        121,
        122,
        123,
        124,
        125,
        126,
        127,
        128,
        129,
        130,
        131,
        132,
        133,
        134,
        135,
        136,
        137,
        138,
        139,
        140,
        141,
        142,
        143,
        144,
        145,
        146,
        147,
        148,
        149,
        150,
        151,
        152,
        153,
        154,
        155,
        156,
        157,
        158,
        159,
        160,
        161,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        171,
        172,
        173,
        174,
        175,
        176,
        177,
        178,
        179,
        180,
        181,
        182,
        183,
        184,
        185,
        186,
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
        226
      ]
    ],
    "segments": [
      {
        "speechId": 73,
        "sourceStartMs": 720866,
        "sourceEndMs": 748894,
        "text": "もしかしてなんか土台アーマーっていうので作るべきかもしかして土台アーマーとかあるんだえ、待ってこれ金属だわ金属重てえあ、でもやっぱ金属大事よこれ島ついたらうん下潜るかサメの餌作ってあ、待ってあれ作るわアンカー作りますお願いします一旦あれだね釣りもしなきゃだねあ、そう釣りもしたいねでも食料ねあれ食料庫にまだあったよありましたありましたとアンカー",
        "isThemeCandidate": false
      },
      {
        "speechId": 74,
        "sourceStartMs": 752798,
        "sourceEndMs": 779564,
        "text": "アンカーちょっと食べていくか食べて、アンカーアンカーどこやねんアンカーどこやねんアンカーあったですありましたですか作れましたですナイスです降ろしちゃうよこれいいよここです何食べようかな、マナマナカツオ食べよう今ちょっとゴーディ誘ってくる誘ってやってくるじゃねえよ木探してくるわあ、オッケーあれ持ってる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 75,
        "sourceStartMs": 779564,
        "sourceEndMs": 779884,
        "text": "あのー",
        "isThemeCandidate": false
      },
      {
        "speechId": 76,
        "sourceStartMs": 780346,
        "sourceEndMs": 809552,
        "text": "斧持ってるんだなこれが多いでしょすごいすごい独り立ちの日だよもう独り立ちの日かそうだよ良かったね独り立ちコロさんがちゃんと作ってるってもう成長を感じてほしいねコネいや結構ねあれだからねコネはね頑張ってるからねここで頑張ってるんだよなユウってねめちゃめちゃ集めるのも早いしうちの有能だからねしっかり船長がフォローしとくからコネのことサンキューな",
        "isThemeCandidate": false
      },
      {
        "speechId": 77,
        "sourceStartMs": 810330,
        "sourceEndMs": 817353,
        "text": "えっとちょっと待ってココナッツしか取れねぇよ食料確かにちょっとしけてきたなあでも足りない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 78,
        "sourceStartMs": 817353,
        "sourceEndMs": 818634,
        "text": "しけしけになってきた?",
        "isThemeCandidate": false
      },
      {
        "speechId": 79,
        "sourceStartMs": 818634,
        "sourceEndMs": 822236,
        "text": "ちょっと若干了解あ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 80,
        "sourceStartMs": 822236,
        "sourceEndMs": 823876,
        "text": "鳥殺した!",
        "isThemeCandidate": false
      },
      {
        "speechId": 81,
        "sourceStartMs": 823876,
        "sourceEndMs": 824557,
        "text": "鳥殺したの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 82,
        "sourceStartMs": 824557,
        "sourceEndMs": 825157,
        "text": "食べれる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 83,
        "sourceStartMs": 825157,
        "sourceEndMs": 839584,
        "text": "食べれる食べれるちょっと待って鳥肉が絶対取れる食べてみて食べてみてOKOKOKOKちゃんと火通すんよOKあ、こんなとこでサメ肉3つあんじゃんラッキーラッキーラッキーじゃなくてラッキーとかじゃないねあ、サメ倒してたねそういえばね",
        "isThemeCandidate": false
      },
      {
        "speechId": 84,
        "sourceStartMs": 840194,
        "sourceEndMs": 840494,
        "text": "完全忘れてたよね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 85,
        "sourceStartMs": 840494,
        "sourceEndMs": 859444,
        "text": "ちょっと待って、これ焼いてとこれちょっと拾ってともうちょっと一個食べてとなるほどねで、閉まってちょっとサメ肉閉まってで、このチキンを焼いてとやばっ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 86,
        "sourceStartMs": 859444,
        "sourceEndMs": 859605,
        "text": "くっそー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 87,
        "sourceStartMs": 859605,
        "sourceEndMs": 860065,
        "text": "どうした?",
        "isThemeCandidate": false
      },
      {
        "speechId": 88,
        "sourceStartMs": 860065,
        "sourceEndMs": 860165,
        "text": "どうした?",
        "isThemeCandidate": false
      },
      {
        "speechId": 89,
        "sourceStartMs": 860165,
        "sourceEndMs": 860485,
        "text": "何が来た?",
        "isThemeCandidate": false
      },
      {
        "speechId": 90,
        "sourceStartMs": 860485,
        "sourceEndMs": 861386,
        "text": "鳥が!",
        "isThemeCandidate": false
      },
      {
        "speechId": 91,
        "sourceStartMs": 861386,
        "sourceEndMs": 861626,
        "text": "鳥が来てる!",
        "isThemeCandidate": false
      },
      {
        "speechId": 92,
        "sourceStartMs": 861626,
        "sourceEndMs": 863347,
        "text": "大丈夫か?",
        "isThemeCandidate": false
      },
      {
        "speechId": 93,
        "sourceStartMs": 863347,
        "sourceEndMs": 864327,
        "text": "ダメージ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 94,
        "sourceStartMs": 864327,
        "sourceEndMs": 864687,
        "text": "平気?",
        "isThemeCandidate": false
      },
      {
        "speechId": 95,
        "sourceStartMs": 864687,
        "sourceEndMs": 864927,
        "text": "ダメージ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 96,
        "sourceStartMs": 864927,
        "sourceEndMs": 867669,
        "text": "大丈夫、ダメージ大丈夫まだ平気ほんと?",
        "isThemeCandidate": false
      },
      {
        "speechId": 97,
        "sourceStartMs": 867669,
        "sourceEndMs": 868349,
        "text": "心配かけたな",
        "isThemeCandidate": false
      },
      {
        "speechId": 98,
        "sourceStartMs": 870042,
        "sourceEndMs": 874784,
        "text": "言うほど心配してないよ心配してーよー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 99,
        "sourceStartMs": 874784,
        "sourceEndMs": 875844,
        "text": "はいはい、あれ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 100,
        "sourceStartMs": 875844,
        "sourceEndMs": 877525,
        "text": "あれ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 101,
        "sourceStartMs": 877525,
        "sourceEndMs": 878365,
        "text": "心配して?",
        "isThemeCandidate": false
      },
      {
        "speechId": 102,
        "sourceStartMs": 878365,
        "sourceEndMs": 884347,
        "text": "心配ねしてるしてるちょっと待って、一旦荷物預けて雑すぎ気づいた?",
        "isThemeCandidate": false
      },
      {
        "speechId": 103,
        "sourceStartMs": 884347,
        "sourceEndMs": 899732,
        "text": "雑すぎんやんいやでもマリリンは反応が雑でもこういうゲームのね作業ちゃんとするから偉いと思うわ謎のフォローが入りましたそうなんよ船長ってちょっとね反応たまに雑になるけどでもちゃんとするからねそう言うてね",
        "isThemeCandidate": false
      },
      {
        "speechId": 104,
        "sourceStartMs": 900098,
        "sourceEndMs": 904802,
        "text": "営業をしっかりしてるところがコーポイントだよね、マジでうん、わかるわかる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 105,
        "sourceStartMs": 904802,
        "sourceEndMs": 925239,
        "text": "わかりみが深いえ、ちょ、せんちゃんあれするわあのさぁ海藻とか探すわあのね、結構ねあ、あ、ありがてありがて柔道のネマネマとかがね、今後必要になってくることはサメ、気をつけてね間違いない、オッケーでもさぁ、冷静に考えてさぁうんこうやって、目標がさぁ、どんどん変わってくからさぁ今、するべきことって痛っ、ヤバい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 106,
        "sourceStartMs": 925239,
        "sourceEndMs": 926740,
        "text": "ちょっと待っている?",
        "isThemeCandidate": false
      },
      {
        "speechId": 107,
        "sourceStartMs": 926740,
        "sourceEndMs": 928241,
        "text": "いやああああああああああああああ",
        "isThemeCandidate": false
      },
      {
        "speechId": 108,
        "sourceStartMs": 932566,
        "sourceEndMs": 934587,
        "text": "気をつけてこれイノシシいるの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 109,
        "sourceStartMs": 934587,
        "sourceEndMs": 953740,
        "text": "イノシシもいるわこれわかった助太刀に行こうちょっと矢でさ撃ち殺すかイノシシパーティーしよう今日はここにイノシシいるわしし鍋しし丼しししちゅうみたいなしししちゅうしたいしししちゅうそっかこいつはもう食べれるんだよな多分なそうだよ弓矢あれ弓矢ってどかなかったっけ持ってる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 110,
        "sourceStartMs": 953740,
        "sourceEndMs": 959944,
        "text": "弓矢どっかにあったはずコーネ持ってないんだなコーネ持ってないあったあったちょっとさ弓矢でさ",
        "isThemeCandidate": false
      },
      {
        "speechId": 111,
        "sourceStartMs": 960122,
        "sourceEndMs": 989832,
        "text": "殺すわ食べようよ食べたいこれで撃てるのかな行くわそっち待ってあれマリゾネスどこマリゾネスまだイカダイカダにいる鳥もいるしねなんかねイノシシ2匹ぐらいいたから気をつけてなOKもうみんな撃ち殺すから任してセイチョ結構エイムにはね自信あるからそうでしょ自信はねあったところってなんだよどういう意味だよちょっと待って自信だけ",
        "isThemeCandidate": false
      },
      {
        "speechId": 112,
        "sourceStartMs": 990278,
        "sourceEndMs": 993519,
        "text": "もうダメなんだよこれコロゾネス待った方がいいやつ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 113,
        "sourceStartMs": 993519,
        "sourceEndMs": 1001441,
        "text": "コロゾネス待たなくていいよずっとベリーだって食べちゃうどこだ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 114,
        "sourceStartMs": 1001441,
        "sourceEndMs": 1006182,
        "text": "どこだちょっと待って一緒にゴーデスとか行かなこれじゃあイカダでちょっと待っとくか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 115,
        "sourceStartMs": 1006182,
        "sourceEndMs": 1009243,
        "text": "オッケーちょっと待ってなイカダどこだ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 116,
        "sourceStartMs": 1009243,
        "sourceEndMs": 1011184,
        "text": "じゃあヤ、ヤちょっと弓?",
        "isThemeCandidate": false
      },
      {
        "speechId": 117,
        "sourceStartMs": 1011184,
        "sourceEndMs": 1011864,
        "text": "ヤ、ヤ弓?",
        "isThemeCandidate": false
      },
      {
        "speechId": 118,
        "sourceStartMs": 1011864,
        "sourceEndMs": 1014365,
        "text": "死ぬかもしれんこれ嘘でしょ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 119,
        "sourceStartMs": 1014365,
        "sourceEndMs": 1019166,
        "text": "ちょっとヤと作っとこうコーネも一緒に一緒にさ弓やする?",
        "isThemeCandidate": false
      },
      {
        "speechId": 120,
        "sourceStartMs": 1021002,
        "sourceEndMs": 1022723,
        "text": "殺した方が早く殺せるか!",
        "isThemeCandidate": true
      },
      {
        "speechId": 121,
        "sourceStartMs": 1022723,
        "sourceEndMs": 1034412,
        "text": "そうそうそう、ちょっとロープちょっと作ってブドウのネバネバはちょっと海藻で作るかなんかそう、1個だ1個もないっけなこれえ、見失っちゃった?",
        "isThemeCandidate": true
      },
      {
        "speechId": 122,
        "sourceStartMs": 1034412,
        "sourceEndMs": 1039036,
        "text": "待てねーちょっと待てーどっかにないか?",
        "isThemeCandidate": true
      },
      {
        "speechId": 123,
        "sourceStartMs": 1039036,
        "sourceEndMs": 1046161,
        "text": "ネバネバあ、ここね鉱石あるなさてさてさてちょっとまとめてやの数が少ないって!",
        "isThemeCandidate": true
      },
      {
        "speechId": 124,
        "sourceStartMs": 1046161,
        "sourceEndMs": 1049624,
        "text": "アドバイスパソーカーなんとない時にね",
        "isThemeCandidate": true
      },
      {
        "speechId": 125,
        "sourceStartMs": 1050106,
        "sourceEndMs": 1058648,
        "text": "違う、違う違うね、ごめんねやめてね、そんなつもりじゃないからねや、や、やーだけにやめてもう何も言えねえ!",
        "isThemeCandidate": true
      },
      {
        "speechId": 126,
        "sourceStartMs": 1058648,
        "sourceEndMs": 1072470,
        "text": "嘘すぎるもう何も言えねえよわかった、せいちゃんが矢作ったときあ、やばい、いる、いるなあねえ、待って、イノシシ3匹いるあれ、作った矢どこ、あ、21本3匹いる?",
        "isThemeCandidate": true
      },
      {
        "speechId": 127,
        "sourceStartMs": 1072470,
        "sourceEndMs": 1079852,
        "text": "3匹いる、3匹いる何個いるかな、ちょっと1人30本ずつ持つか、じゃあここやばいかもあ、でも板足りない",
        "isThemeCandidate": true
      },
      {
        "speechId": 128,
        "sourceStartMs": 1081354,
        "sourceEndMs": 1081915,
        "text": "居た?",
        "isThemeCandidate": false
      },
      {
        "speechId": 129,
        "sourceStartMs": 1081915,
        "sourceEndMs": 1082435,
        "text": "居た?",
        "isThemeCandidate": false
      },
      {
        "speechId": 130,
        "sourceStartMs": 1082435,
        "sourceEndMs": 1084155,
        "text": "居た?",
        "isThemeCandidate": false
      },
      {
        "speechId": 131,
        "sourceStartMs": 1084155,
        "sourceEndMs": 1085376,
        "text": "居た?",
        "isThemeCandidate": false
      },
      {
        "speechId": 132,
        "sourceStartMs": 1085376,
        "sourceEndMs": 1085716,
        "text": "居た?",
        "isThemeCandidate": false
      },
      {
        "speechId": 133,
        "sourceStartMs": 1085716,
        "sourceEndMs": 1086196,
        "text": "居た?",
        "isThemeCandidate": false
      },
      {
        "speechId": 134,
        "sourceStartMs": 1086196,
        "sourceEndMs": 1086696,
        "text": "居た?",
        "isThemeCandidate": false
      },
      {
        "speechId": 135,
        "sourceStartMs": 1086696,
        "sourceEndMs": 1087116,
        "text": "居た?",
        "isThemeCandidate": false
      },
      {
        "speechId": 136,
        "sourceStartMs": 1087116,
        "sourceEndMs": 1087296,
        "text": "居た?",
        "isThemeCandidate": false
      },
      {
        "speechId": 137,
        "sourceStartMs": 1110182,
        "sourceEndMs": 1139684,
        "text": "来た時用に矢作ってありがたいねーこれで一緒にターン行こうよちょっと20本ずつちょっとコーネ1本少ない19本だけどまあ細かいことは全然いい全然いいあ全然いい解消できるしねベトベト足りるかなベトベトベトベト足りるかな問題があったわやっと見つけたオッケーあ行けるなよし弓作ったあじゃあ今ここで渡しちゃうねありがてーよこれ弓と",
        "isThemeCandidate": false
      },
      {
        "speechId": 138,
        "sourceStartMs": 1140194,
        "sourceEndMs": 1141995,
        "text": "はいこれ、嫌ね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 139,
        "sourceStartMs": 1141995,
        "sourceEndMs": 1142956,
        "text": "拾ってよ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 140,
        "sourceStartMs": 1142956,
        "sourceEndMs": 1144276,
        "text": "水に流される前にね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 141,
        "sourceStartMs": 1144276,
        "sourceEndMs": 1147819,
        "text": "はいはいはいはいちょっとご飯も食べるから拾った!",
        "isThemeCandidate": false
      },
      {
        "speechId": 142,
        "sourceStartMs": 1147819,
        "sourceEndMs": 1148819,
        "text": "オッケー?",
        "isThemeCandidate": false
      },
      {
        "speechId": 143,
        "sourceStartMs": 1148819,
        "sourceEndMs": 1154923,
        "text": "うーんと、サメの頭いらねご飯も食べてよ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 144,
        "sourceStartMs": 1154923,
        "sourceEndMs": 1156044,
        "text": "はい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 145,
        "sourceStartMs": 1156044,
        "sourceEndMs": 1162007,
        "text": "よし、今日はしし鍋しし丼しし汁しししちゅうね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 146,
        "sourceStartMs": 1162007,
        "sourceEndMs": 1164989,
        "text": "そう、しししちゅうが一番好きだわあ、これ夜になるけどこれどう?",
        "isThemeCandidate": false
      },
      {
        "speechId": 147,
        "sourceStartMs": 1164989,
        "sourceEndMs": 1165249,
        "text": "いいか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 148,
        "sourceStartMs": 1165249,
        "sourceEndMs": 1169712,
        "text": "別に先にねほねば、夜の方がさ、海の中",
        "isThemeCandidate": false
      },
      {
        "speechId": 149,
        "sourceStartMs": 1170418,
        "sourceEndMs": 1174119,
        "text": "あれだよな、探索しやすいんだよなあ、する?",
        "isThemeCandidate": false
      },
      {
        "speechId": 150,
        "sourceStartMs": 1174119,
        "sourceEndMs": 1182180,
        "text": "最初海の中やっちゃってそうやで、暗いとイノシシも見えなくて危ないしあ、これマリリーさんこれ使ってみるよ、禰豆子あ、禰豆子?",
        "isThemeCandidate": false
      },
      {
        "speechId": 151,
        "sourceStartMs": 1182180,
        "sourceEndMs": 1183641,
        "text": "いや、大丈夫だよ平気?",
        "isThemeCandidate": false
      },
      {
        "speechId": 152,
        "sourceStartMs": 1183641,
        "sourceEndMs": 1199144,
        "text": "平気平気OK待って、弓矢じゃなくて矢も持って持ち物は大丈夫だなよし生の芋、芋焼いとこうかな食料あるよある?",
        "isThemeCandidate": false
      },
      {
        "speechId": 153,
        "sourceStartMs": 1199144,
        "sourceEndMs": 1199564,
        "text": "あるよ、あの",
        "isThemeCandidate": false
      },
      {
        "speechId": 154,
        "sourceStartMs": 1200098,
        "sourceEndMs": 1223383,
        "text": "箱に入ってる全部の箱を1個ずつ開けたら見つかるありがとう次はちゃんとね分かりやすくしとくわ2階建てにしたらきてるきてるきてるお前許さねえサメだサメだ多分サメだコーネいる多分というかサメやこれは間違いなくね間違いなくラフトやこれはラフト?",
        "isThemeCandidate": false
      },
      {
        "speechId": 155,
        "sourceStartMs": 1223383,
        "sourceEndMs": 1229904,
        "text": "これはラフトというゲームやいたいやサメサメサメほらいるよなやっぱりないるすいませんマリンよりコーネのことを食べてください",
        "isThemeCandidate": false
      },
      {
        "speechId": 156,
        "sourceStartMs": 1230214,
        "sourceEndMs": 1234815,
        "text": "なんでやねんコーニーさん狙われたらヤバいで今死にかけの…え、痛っ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 157,
        "sourceStartMs": 1234815,
        "sourceEndMs": 1235315,
        "text": "待って!",
        "isThemeCandidate": false
      },
      {
        "speechId": 158,
        "sourceStartMs": 1235315,
        "sourceEndMs": 1235596,
        "text": "待って!",
        "isThemeCandidate": false
      },
      {
        "speechId": 159,
        "sourceStartMs": 1235596,
        "sourceEndMs": 1236016,
        "text": "痛っ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 160,
        "sourceStartMs": 1236016,
        "sourceEndMs": 1236436,
        "text": "痛っ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 161,
        "sourceStartMs": 1236436,
        "sourceEndMs": 1237096,
        "text": "痛っ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 162,
        "sourceStartMs": 1237096,
        "sourceEndMs": 1237476,
        "text": "痛っ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 163,
        "sourceStartMs": 1237476,
        "sourceEndMs": 1258062,
        "text": "コーニーありがとう今まですごい大好きだった本当によいごんサメはさ弓矢で…でももったいないなちょっとでも確かにね弓矢弱えないっすなあ弓矢でも弓でもサメ倒せるよって言われてるなえ待ってもしかしてさもしかしてこの丈さいや無理かコンコンできるかと思った",
        "isThemeCandidate": false
      },
      {
        "speechId": 164,
        "sourceStartMs": 1260022,
        "sourceEndMs": 1274430,
        "text": "そんな…竹取りの翁というものありきりやんそんな…竹取りの翁というものありきり…そんな丁寧に…あ、違うわ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 165,
        "sourceStartMs": 1274430,
        "sourceEndMs": 1275270,
        "text": "かぐや姫や!",
        "isThemeCandidate": false
      },
      {
        "speechId": 166,
        "sourceStartMs": 1275270,
        "sourceEndMs": 1277732,
        "text": "かぐや姫生まれちゃうよそうだねえ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 167,
        "sourceStartMs": 1277732,
        "sourceEndMs": 1280213,
        "text": "かぐや姫生まれちゃうよなに?",
        "isThemeCandidate": false
      },
      {
        "speechId": 168,
        "sourceStartMs": 1280213,
        "sourceEndMs": 1280473,
        "text": "なに?",
        "isThemeCandidate": false
      },
      {
        "speechId": 169,
        "sourceStartMs": 1280473,
        "sourceEndMs": 1281894,
        "text": "絡みづらい?",
        "isThemeCandidate": false
      },
      {
        "speechId": 170,
        "sourceStartMs": 1281894,
        "sourceEndMs": 1283795,
        "text": "ちょっと絡みづらい…嘘でしょ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 171,
        "sourceStartMs": 1283795,
        "sourceEndMs": 1284495,
        "text": "いつも?",
        "isThemeCandidate": false
      },
      {
        "speechId": 172,
        "sourceStartMs": 1284495,
        "sourceEndMs": 1285236,
        "text": "今日だけ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 173,
        "sourceStartMs": 1285236,
        "sourceEndMs": 1287337,
        "text": "今日絡みづらい?",
        "isThemeCandidate": false
      },
      {
        "speechId": 174,
        "sourceStartMs": 1287337,
        "sourceEndMs": 1289358,
        "text": "いつもは絡みやすい…待って、この魚…",
        "isThemeCandidate": false
      },
      {
        "speechId": 175,
        "sourceStartMs": 1289708,
        "sourceEndMs": 1290000,
        "text": "えいちゃ",
        "isThemeCandidate": false
      },
      {
        "speechId": 176,
        "sourceStartMs": 1290150,
        "sourceEndMs": 1294092,
        "text": "どうしよう気になるやん今日何があったんやんなりんどこ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 177,
        "sourceStartMs": 1294092,
        "sourceEndMs": 1311760,
        "text": "ちょっと今脳死で喋ってるあっ今ね今あの竹取りの桶というものありきりのとこあっよきかなよきかなよきかなちょっとちゃんと時代に染まってるねうんそれはよきかないいじゃんこの辺サメいなさそうな予感する今チャンスなのでは?",
        "isThemeCandidate": false
      },
      {
        "speechId": 178,
        "sourceStartMs": 1311760,
        "sourceEndMs": 1312480,
        "text": "マジ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 179,
        "sourceStartMs": 1312480,
        "sourceEndMs": 1319784,
        "text": "あっでもこっち来そうだなうそえなんかフグもいるって言われてるようんうん普通にいるねこれでもここ海藻",
        "isThemeCandidate": false
      },
      {
        "speechId": 180,
        "sourceStartMs": 1320162,
        "sourceEndMs": 1335495,
        "text": "オンパレードだからちょっと拾うわやばいやばい階層のここの階層も取り尽くした今から来ても遅いからナイス行かねーしそっち行かねーし反対側行ってっしオッケー?",
        "isThemeCandidate": false
      },
      {
        "speechId": 181,
        "sourceStartMs": 1335495,
        "sourceEndMs": 1348625,
        "text": "これも階層だすごいなんか楽しいね楽しいねこっち側何もないかな何もないけどこっち側何もない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 182,
        "sourceStartMs": 1348625,
        "sourceEndMs": 1349286,
        "text": "何にもない",
        "isThemeCandidate": false
      },
      {
        "speechId": 183,
        "sourceStartMs": 1350426,
        "sourceEndMs": 1351046,
        "text": "え?",
        "isThemeCandidate": false
      },
      {
        "speechId": 184,
        "sourceStartMs": 1351046,
        "sourceEndMs": 1380000,
        "text": "金属とかもないけど粘土とかあそっかでかいなこの島でかいよなでかいくせにさ意外となんもない金属なんもないよ金属欲しいよなゆうて金属あったあった海藻あったナイス降りますあんまり行きすぎると戻るのが大変か分かる分かるでもなさそうだなこの辺砂は取ってったほうがいいか砂もそうだね取っとこう",
        "isThemeCandidate": false
      },
      {
        "speechId": 185,
        "sourceStartMs": 1380850,
        "sourceEndMs": 1387813,
        "text": "OKOK砂というもの見つけられり見つけられり?",
        "isThemeCandidate": false
      },
      {
        "speechId": 186,
        "sourceStartMs": 1387813,
        "sourceEndMs": 1390555,
        "text": "見つけられり死ぬ死ぬ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 187,
        "sourceStartMs": 1390555,
        "sourceEndMs": 1392416,
        "text": "海藻ありけり海藻ありけり?",
        "isThemeCandidate": false
      },
      {
        "speechId": 188,
        "sourceStartMs": 1392416,
        "sourceEndMs": 1409884,
        "text": "海藻いっぱいあるいっぱいあるちょっと待って一回上がってよいしょあぁ荷物預けてくればよかったなぁ準備を怠る怠るなかれあーわしもいるわしもやばいこっちはね準備を怠ることなかれだったからね",
        "isThemeCandidate": false
      },
      {
        "speechId": 189,
        "sourceStartMs": 1410846,
        "sourceEndMs": 1427669,
        "text": "あーそれはよきかなよきかなとしか言えんあんまり詳しくないお代官様あそっち行ったどっち行った?",
        "isThemeCandidate": false
      },
      {
        "speechId": 190,
        "sourceStartMs": 1427669,
        "sourceEndMs": 1438592,
        "text": "あらよあらよあらよあらららよ戦術そっちじゃないかなあ改装めっちゃある14枚も拾ったわえ、じゃあ教えてよ何を?",
        "isThemeCandidate": false
      },
      {
        "speechId": 191,
        "sourceStartMs": 1438592,
        "sourceEndMs": 1439592,
        "text": "は?",
        "isThemeCandidate": false
      },
      {
        "speechId": 192,
        "sourceStartMs": 1439592,
        "sourceEndMs": 1439732,
        "text": "え、待って",
        "isThemeCandidate": false
      },
      {
        "speechId": 193,
        "sourceStartMs": 1440770,
        "sourceEndMs": 1469864,
        "text": "もう全部船長が取ったからねもう今更意味ないよそっちじゃない方のさ教えてよお代官様じゃない方のさそれで言うと船長が言った方の反対の方角に向かってもらうと良き島を違う違うよあれ待ってお代官様のまだその話もう終わったからその話終わったなんでごめんね",
        "isThemeCandidate": false
      },
      {
        "speechId": 194,
        "sourceStartMs": 1470194,
        "sourceEndMs": 1479457,
        "text": "終わっちゃったかいつまでそんな話してんだよやる気あるんかお前やばい待て待て仕留められるか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 195,
        "sourceStartMs": 1479457,
        "sourceEndMs": 1488380,
        "text": "何かと戦い始めたいいよいいよ痛そう痛そうこっちが痛いですイノシシやってるもしかして?",
        "isThemeCandidate": false
      },
      {
        "speechId": 196,
        "sourceStartMs": 1488380,
        "sourceEndMs": 1489941,
        "text": "イノシシやってるやってんの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 197,
        "sourceStartMs": 1489941,
        "sourceEndMs": 1498203,
        "text": "でも待て海の中に入っていいじゃんいいじゃん海の中で撃てばねこいつ来れねえよあサメ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 198,
        "sourceStartMs": 1498203,
        "sourceEndMs": 1498864,
        "text": "あイノシシ",
        "isThemeCandidate": false
      },
      {
        "speechId": 199,
        "sourceStartMs": 1500898,
        "sourceEndMs": 1502219,
        "text": "そこから撃てばってことね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 200,
        "sourceStartMs": 1502219,
        "sourceEndMs": 1503479,
        "text": "そうそうそうそう!",
        "isThemeCandidate": false
      },
      {
        "speechId": 201,
        "sourceStartMs": 1503479,
        "sourceEndMs": 1509402,
        "text": "まるで会話が噛み合ってないえ、必ずさ、守護をつけようこれからの会話守護?",
        "isThemeCandidate": false
      },
      {
        "speechId": 202,
        "sourceStartMs": 1509402,
        "sourceEndMs": 1516225,
        "text": "守護をつけようえ、イノシシここにいるえ、待ってえ、え、毒になっちゃって死ぬかもしれないマリー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 203,
        "sourceStartMs": 1516225,
        "sourceEndMs": 1522709,
        "text": "え、どうぞ、どこどこどこどこどこちょっと待って、今から帰る帰る帰るマリー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 204,
        "sourceStartMs": 1522709,
        "sourceEndMs": 1529752,
        "text": "俺ちょっとね、ちょっとあまりにも噛み合ってないからね今ギスギスしてるって言われて",
        "isThemeCandidate": false
      },
      {
        "speechId": 205,
        "sourceStartMs": 1530000,
        "sourceEndMs": 1534522,
        "text": "キスキスしてるって言われてる死に死にしてるけど死に死にしてる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 206,
        "sourceStartMs": 1534522,
        "sourceEndMs": 1543445,
        "text": "今行くからこれさ降参して再開するって押さない方がいいんだよね押したら荷物がなくなるもう死んでんのもしかして?",
        "isThemeCandidate": false
      },
      {
        "speechId": 207,
        "sourceStartMs": 1543445,
        "sourceEndMs": 1547227,
        "text": "死んでしまった島の中?",
        "isThemeCandidate": false
      },
      {
        "speechId": 208,
        "sourceStartMs": 1547227,
        "sourceEndMs": 1554530,
        "text": "島の中でね海沿いでね砂浜があって土下座いっぱい入ってあ、竹のありけりね",
        "isThemeCandidate": false
      },
      {
        "speechId": 209,
        "sourceStartMs": 1555302,
        "sourceEndMs": 1560000,
        "text": "そうね、マリンと逆方向に行ってたから逆に行ってたのね、OKOKO",
        "isThemeCandidate": false
      },
      {
        "speechId": 210,
        "sourceStartMs": 1560514,
        "sourceEndMs": 1582301,
        "text": "ほんと、煩わせてしまってすまん、ほんとにね、いいよそんなの気にすんなってちょっと待って、一回食事してから行くわうん、ゆっくりして行ってる最中に息切れしそうだからちょっと一回ご飯食べてビュッフェしてビュッフェビュッフェってほどのゴージャスさないけどちょっと無駄なくこの隙に海藻も焼いてとティータイムかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 211,
        "sourceStartMs": 1582301,
        "sourceEndMs": 1587523,
        "text": "ティータイムしてあ、スティックをえ、あ、今食われてるな、サメにマジ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 212,
        "sourceStartMs": 1587523,
        "sourceEndMs": 1589264,
        "text": "ちょっと待って、やめて、やめて大丈夫大丈夫",
        "isThemeCandidate": false
      },
      {
        "speechId": 213,
        "sourceStartMs": 1590160,
        "sourceEndMs": 1619152,
        "text": "大丈夫マリンなら大丈夫もう壊された大丈夫じゃない食われてるって金の方がねすぐ行くからね朝日になってきたなこれが終わったら一緒に命しっかりにごめんね本当に死んでしまって不甲斐ないわ行くよ今から行く行くぞありがとう上から向かうか上から夕日朝日を浴びながら",
        "isThemeCandidate": false
      },
      {
        "speechId": 214,
        "sourceStartMs": 1620520,
        "sourceEndMs": 1628344,
        "text": "ちょっと楽しんでもらってねちょっとこのロケーション楽しみながらねえこれホタリ死んだらどうなるの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 215,
        "sourceStartMs": 1628344,
        "sourceEndMs": 1639350,
        "text": "待ってなんだあれ鹿みたいなのいたあなんか小さいのいるよな一旦ねでもね鹿には目もくれずまずコーネを探すこの褒章マリンかっこよくない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 216,
        "sourceStartMs": 1639350,
        "sourceEndMs": 1643051,
        "text": "お玉重いのいい船長だねなやっぱ重う?",
        "isThemeCandidate": false
      },
      {
        "speechId": 217,
        "sourceStartMs": 1643051,
        "sourceEndMs": 1645953,
        "text": "うんちょっとねちょっとかあれどこだ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 218,
        "sourceStartMs": 1645953,
        "sourceEndMs": 1648174,
        "text": "こっちだよねあのね",
        "isThemeCandidate": false
      },
      {
        "speechId": 219,
        "sourceStartMs": 1648792,
        "sourceEndMs": 1649984,
        "text": "すぐ歩いたら海沿い",
        "isThemeCandidate": false
      },
      {
        "speechId": 220,
        "sourceStartMs": 1650098,
        "sourceEndMs": 1674705,
        "text": "海になるからね海ってか海に入れるぐらいのね端っこだからね行けー砂浜だからでもこの辺だよねすまんよーしかもコーネの枠もないからマジでどこにいるかわかんない確かにあもうホントだねなーあれこれ渡ったかなーこの先コーネマリリン画面見てよマリリン画面マリリンあっそうねいやっ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 221,
        "sourceStartMs": 1674705,
        "sourceEndMs": 1674985,
        "text": "あー大丈夫か!",
        "isThemeCandidate": false
      },
      {
        "speechId": 222,
        "sourceStartMs": 1674985,
        "sourceEndMs": 1675365,
        "text": "いや!",
        "isThemeCandidate": false
      },
      {
        "speechId": 223,
        "sourceStartMs": 1675365,
        "sourceEndMs": 1676285,
        "text": "ちょっと待って!",
        "isThemeCandidate": false
      },
      {
        "speechId": 224,
        "sourceStartMs": 1676285,
        "sourceEndMs": 1678906,
        "text": "イノシシというものありきりやばい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 225,
        "sourceStartMs": 1678906,
        "sourceEndMs": 1679406,
        "text": "やばいなそれ",
        "isThemeCandidate": false
      },
      {
        "speechId": 226,
        "sourceStartMs": 1681322,
        "sourceEndMs": 1709632,
        "text": "そっち高いFPSみたいになってるどうどうどうこの辺あそこらへんいるかなあそこの砂浜のところこれって後ろの後ろあの渡った先この向こうにもうちょい右見てみて右右こっちあそこなんかねそこにそこにいそうな雰囲気だよねなんかねちょっと向かってみるよ",
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
