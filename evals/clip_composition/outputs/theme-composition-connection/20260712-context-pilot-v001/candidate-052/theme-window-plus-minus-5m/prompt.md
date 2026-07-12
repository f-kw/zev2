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
  "evaluationInputId": "YE-faluP7zY-theme-candidate-052",
  "sourceVideoId": "YE-faluP7zY",
  "selectedTheme": {
    "id": "input-selection-v004-candidate-052",
    "title": "くだらないことで笑われて気まずくなるマリン",
    "summary": "「ぴょんぴょんマンゴー」という何気ないフレーズで大笑いされ、おもろくないことで笑われるのが気まずいと吐露するやり取りに妙味がある。",
    "candidateSpeechIds": [
      770
    ],
    "whyItCanBeClipped": "「ぴょんぴょんマンゴー」という何気ないフレーズで大笑いされ、おもろくないことで笑われるのが気まずいと吐露するやり取りに妙味がある。",
    "compositionNote": "提示された候補発話範囲の中から、テーマが単独で成立する最小区間を選ぶ。"
  },
  "transcript": {
    "language": "ja-JP",
    "durationSec": 11824.121,
    "speechUnitGroups": [
      [
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
        745,
        746,
        747,
        748,
        749,
        750,
        751,
        752,
        753,
        754,
        755,
        756,
        757,
        758,
        759,
        760,
        761,
        762,
        763,
        764,
        765,
        766,
        767,
        768,
        769,
        770,
        771,
        772,
        773,
        774,
        775,
        776,
        777,
        778,
        779,
        780,
        781,
        782,
        783,
        784,
        785,
        786,
        787,
        788,
        789,
        790,
        791,
        792,
        793,
        794,
        795,
        796,
        797,
        798,
        799,
        800,
        801,
        802,
        803,
        804,
        805,
        806,
        807,
        808,
        809,
        810,
        811,
        812,
        813,
        814
      ]
    ],
    "segments": [
      {
        "speechId": 674,
        "sourceStartMs": 4531331,
        "sourceEndMs": 4531951,
        "text": "そうだそうだ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 675,
        "sourceStartMs": 4531951,
        "sourceEndMs": 4535332,
        "text": "土台じゃないんだった、そういえばそうなの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 676,
        "sourceStartMs": 4535332,
        "sourceEndMs": 4548779,
        "text": "これだ、木製フロアだライオンあ、こうだこうだ思い出しましたあ、もう板なくなっちゃったまじ、板全然ないあ、板ね、ここにね、今ね、20枚入ってるナイスー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 677,
        "sourceStartMs": 4548779,
        "sourceEndMs": 4551780,
        "text": "ナイスー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 678,
        "sourceStartMs": 4551780,
        "sourceEndMs": 4559584,
        "text": "集めるの達人じゃん、こうね私なすばらしい全然サメがここないんだけどいいねいいよね、これね",
        "isThemeCandidate": false
      },
      {
        "speechId": 679,
        "sourceStartMs": 4561908,
        "sourceEndMs": 4589210,
        "text": "もはや船いらねえんじゃねえかぐらいのいかだいらねえんじゃねえかちょっと言い過ぎたきていりますいかだいりますすみませんでした情けないな情けないですねこれは申し訳ない生酢やっとこうかないいね食料もしっかりね生酢食べるか食べて何の音だこれハマった音か板集めてとか",
        "isThemeCandidate": false
      },
      {
        "speechId": 680,
        "sourceStartMs": 4590034,
        "sourceEndMs": 4590114,
        "text": "ぽろり?",
        "isThemeCandidate": false
      },
      {
        "speechId": 681,
        "sourceStartMs": 4590114,
        "sourceEndMs": 4590154,
        "text": "ん?",
        "isThemeCandidate": false
      },
      {
        "speechId": 682,
        "sourceStartMs": 4590154,
        "sourceEndMs": 4590314,
        "text": "どこだ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 683,
        "sourceStartMs": 4590314,
        "sourceEndMs": 4591955,
        "text": "あっ大丈夫?",
        "isThemeCandidate": false
      },
      {
        "speechId": 684,
        "sourceStartMs": 4591955,
        "sourceEndMs": 4592115,
        "text": "させっか!",
        "isThemeCandidate": false
      },
      {
        "speechId": 685,
        "sourceStartMs": 4592115,
        "sourceEndMs": 4596457,
        "text": "これでちょっと荷物整理したいなぁこれでよし、一旦OKだよいしょん?",
        "isThemeCandidate": false
      },
      {
        "speechId": 686,
        "sourceStartMs": 4596457,
        "sourceEndMs": 4596578,
        "text": "ん?",
        "isThemeCandidate": false
      },
      {
        "speechId": 687,
        "sourceStartMs": 4596578,
        "sourceEndMs": 4596618,
        "text": "ん?",
        "isThemeCandidate": false
      },
      {
        "speechId": 688,
        "sourceStartMs": 4596618,
        "sourceEndMs": 4619170,
        "text": "ランララランランランランラララララランランランラララララランランラララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララララ",
        "isThemeCandidate": false
      },
      {
        "speechId": 689,
        "sourceStartMs": 4620226,
        "sourceEndMs": 4624969,
        "text": "コーネがご機嫌だとマリリンも嬉しくなっちゃうんだよほんと?",
        "isThemeCandidate": false
      },
      {
        "speechId": 690,
        "sourceStartMs": 4624969,
        "sourceEndMs": 4626690,
        "text": "どれぐらい嬉しい?",
        "isThemeCandidate": false
      },
      {
        "speechId": 691,
        "sourceStartMs": 4626690,
        "sourceEndMs": 4631633,
        "text": "普通ぐらい普通だったよそれは果たして嬉しいのかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 692,
        "sourceStartMs": 4631633,
        "sourceEndMs": 4642419,
        "text": "人並みの嬉しさがあるあ、あれ撮ろうかなあ、でも資材がいっぱいかちょっと一回しまうかねえ生ガツオがさ焼けるの早いよあ、ほんと?",
        "isThemeCandidate": false
      },
      {
        "speechId": 693,
        "sourceStartMs": 4642419,
        "sourceEndMs": 4648763,
        "text": "うん速さの差とかあるんかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 694,
        "sourceStartMs": 4648763,
        "sourceEndMs": 4649504,
        "text": "ちょっとねうまいうまーい",
        "isThemeCandidate": false
      },
      {
        "speechId": 695,
        "sourceStartMs": 4651874,
        "sourceEndMs": 4653995,
        "text": "おまーい?",
        "isThemeCandidate": false
      },
      {
        "speechId": 696,
        "sourceStartMs": 4653995,
        "sourceEndMs": 4654115,
        "text": "おまーい?",
        "isThemeCandidate": false
      },
      {
        "speechId": 697,
        "sourceStartMs": 4654115,
        "sourceEndMs": 4658518,
        "text": "葉っぱありすぎだろ葉っぱいらんまであるレベルまで来てる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 698,
        "sourceStartMs": 4658518,
        "sourceEndMs": 4679452,
        "text": "うん、葉っぱいらんまであるそんなに集まったかーこんなんいらんだろレベルね、あるよこれ鉱石やるかなんで必要な時になかったんかお前たちみたいな感じになってる確かに序盤でめっちゃ足りなかったよねそうだよ、ないやねんマジでぶどうのベッドベッド",
        "isThemeCandidate": false
      },
      {
        "speechId": 699,
        "sourceStartMs": 4681742,
        "sourceEndMs": 4708723,
        "text": "今ねちょっとだけ整理したけどそんなの知らずに全然関係ないの入れちゃったよ今全然今そんな整理してる場合ではないその素材を集めなさいいいんだよすみませんこれ一回回収するかこれを一回外して生酢焼こう生酢掘ってさ",
        "isThemeCandidate": false
      },
      {
        "speechId": 700,
        "sourceStartMs": 4710220,
        "sourceEndMs": 4711940,
        "text": "上にあるものだよね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 701,
        "sourceStartMs": 4711940,
        "sourceEndMs": 4716601,
        "text": "2階にあるあー確かになーえ、どうなんだろう?",
        "isThemeCandidate": false
      },
      {
        "speechId": 702,
        "sourceStartMs": 4716601,
        "sourceEndMs": 4718382,
        "text": "わかんなくなってきた2階にあるものなのかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 703,
        "sourceStartMs": 4718382,
        "sourceEndMs": 4719762,
        "text": "え、どうだろう?",
        "isThemeCandidate": false
      },
      {
        "speechId": 704,
        "sourceStartMs": 4719762,
        "sourceEndMs": 4720722,
        "text": "聞いてみる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 705,
        "sourceStartMs": 4720722,
        "sourceEndMs": 4723203,
        "text": "君たちー?",
        "isThemeCandidate": false
      },
      {
        "speechId": 706,
        "sourceStartMs": 4723203,
        "sourceEndMs": 4725003,
        "text": "家具、君たちー?",
        "isThemeCandidate": false
      },
      {
        "speechId": 707,
        "sourceStartMs": 4725003,
        "sourceEndMs": 4738066,
        "text": "止まりさせてください家具作らないあ、でも家具あ、壁をささっきさ、壁をさあのほら、葉っぱにしたらオシャレだよねって話したよねあ、いてたねん?",
        "isThemeCandidate": false
      },
      {
        "speechId": 708,
        "sourceStartMs": 4738066,
        "sourceEndMs": 4739146,
        "text": "サメかと思ったら気のせいだったわ",
        "isThemeCandidate": false
      },
      {
        "speechId": 709,
        "sourceStartMs": 4740034,
        "sourceEndMs": 4750240,
        "text": "コーネだよコーネがザバッと上がってくる音でしたそうだよこうしてなんか一緒にオープニングの画面の家いいなーって言ってなんかさあ、そうそうそうそうそうなぜそう?",
        "isThemeCandidate": false
      },
      {
        "speechId": 710,
        "sourceStartMs": 4750240,
        "sourceEndMs": 4764669,
        "text": "ちょっといいなと思いましてあーどこに柱ここ行けっすかあ、魚いっぱいあるやんこれナマズ焼きたいなー何がダメなのかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 711,
        "sourceStartMs": 4764669,
        "sourceEndMs": 4767290,
        "text": "勝手に焼けーっつってねじゃあ行きまーす焼いてください何がダメなの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 712,
        "sourceStartMs": 4767290,
        "sourceEndMs": 4769672,
        "text": "行きまーす柱の数足りないもしかして",
        "isThemeCandidate": false
      },
      {
        "speechId": 713,
        "sourceStartMs": 4771050,
        "sourceEndMs": 4771970,
        "text": "いけるだろ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 714,
        "sourceStartMs": 4771970,
        "sourceEndMs": 4773051,
        "text": "ビビってんのか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 715,
        "sourceStartMs": 4773051,
        "sourceEndMs": 4779554,
        "text": "足りないのあったら言ってね分かったこれいけると思うんだけどな全然木材がない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 716,
        "sourceStartMs": 4779554,
        "sourceEndMs": 4798021,
        "text": "本当はないじゃん今ねストレージに22枚なら入ってるよいいじゃんさすがこうね葉っぱばっか眺めてくんじゃねーよいらねーつってんだろうがよ",
        "isThemeCandidate": false
      },
      {
        "speechId": 717,
        "sourceStartMs": 4802562,
        "sourceEndMs": 4807504,
        "text": "どうだと思うとカツオでしかない嫌だって言ってただろ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 718,
        "sourceStartMs": 4807504,
        "sourceEndMs": 4826970,
        "text": "アッパばっかり舐めやがってカツオが怒ってるよカツオがカツオを釣るよ、そしたら磯野家だ海で全部揃うじゃんね、サザエさんねそういうテーマなんじゃないの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 719,
        "sourceStartMs": 4826970,
        "sourceEndMs": 4827190,
        "text": "確かに",
        "isThemeCandidate": false
      },
      {
        "speechId": 720,
        "sourceStartMs": 4830974,
        "sourceEndMs": 4831414,
        "text": "なに?",
        "isThemeCandidate": false
      },
      {
        "speechId": 721,
        "sourceStartMs": 4831414,
        "sourceEndMs": 4838499,
        "text": "マジで待って、弾が、弾がそろわないよ、弾があ、マリン!",
        "isThemeCandidate": false
      },
      {
        "speechId": 722,
        "sourceStartMs": 4838499,
        "sourceEndMs": 4839800,
        "text": "待って、見ていたわ、弾!",
        "isThemeCandidate": false
      },
      {
        "speechId": 723,
        "sourceStartMs": 4839800,
        "sourceEndMs": 4842281,
        "text": "待って、どれのこれ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 724,
        "sourceStartMs": 4842281,
        "sourceEndMs": 4845523,
        "text": "これ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 725,
        "sourceStartMs": 4845523,
        "sourceEndMs": 4856150,
        "text": "もう、すごいなぁなんかこの弾、鼻筋の整えがすごいな弾、鼻筋やってんね、これ鼻筋やってる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 726,
        "sourceStartMs": 4856150,
        "sourceEndMs": 4859872,
        "text": "これ一旦外そう一旦外して柱を建てて待って、何したんだっけ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 727,
        "sourceStartMs": 4860606,
        "sourceEndMs": 4889844,
        "text": "違うわ板足りなくなったコーネ板足りない分かった任しなコーネ何もないよ板が任しな板が今16枚入れたナイスあれ取ろっかななかなかさいいよ取るよコーネがせんちょーの方が早いから大丈夫サメ来てるし謎の今の江戸",
        "isThemeCandidate": false
      },
      {
        "speechId": 728,
        "sourceStartMs": 4891646,
        "sourceEndMs": 4907911,
        "text": "いやでもこれいいなネットのおかげで結構集まってきてるよここに置けるかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 729,
        "sourceStartMs": 4907911,
        "sourceEndMs": 4908751,
        "text": "ほらよなんでダメなの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 730,
        "sourceStartMs": 4908751,
        "sourceEndMs": 4910211,
        "text": "あ、板が足りない板足りない!",
        "isThemeCandidate": false
      },
      {
        "speechId": 731,
        "sourceStartMs": 4910211,
        "sourceEndMs": 4910491,
        "text": "こうね!",
        "isThemeCandidate": false
      },
      {
        "speechId": 732,
        "sourceStartMs": 4910491,
        "sourceEndMs": 4914633,
        "text": "今23枚入ってるよこっちにナイス!",
        "isThemeCandidate": false
      },
      {
        "speechId": 733,
        "sourceStartMs": 4914633,
        "sourceEndMs": 4917333,
        "text": "ベラボーメイ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 734,
        "sourceStartMs": 4917333,
        "sourceEndMs": 4919634,
        "text": "ベラボーベラボーあ、これまた",
        "isThemeCandidate": false
      },
      {
        "speechId": 735,
        "sourceStartMs": 4925857,
        "sourceEndMs": 4949872,
        "text": "やっぱフック使った方がいいわそうだね気づいたわ今遅いよ気づくよ遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅遅�",
        "isThemeCandidate": false
      },
      {
        "speechId": 736,
        "sourceStartMs": 4956599,
        "sourceEndMs": 4961304,
        "text": "嫌ではないこれさ、1階つけたこれ外せんのかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 737,
        "sourceStartMs": 4961304,
        "sourceEndMs": 4962185,
        "text": "もう外せないのかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 738,
        "sourceStartMs": 4962185,
        "sourceEndMs": 4963286,
        "text": "いやでも、いいんじゃない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 739,
        "sourceStartMs": 4963286,
        "sourceEndMs": 4972915,
        "text": "これぐらいで3階建てとかにしようよ、そしたらあ、1階は狭めでね、天井引くマジで多分これさ、物がいっぱい置いてあるからさ狭く見えるだけじゃない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 740,
        "sourceStartMs": 4972915,
        "sourceEndMs": 4976199,
        "text": "なんか勝手に島に到着しちゃったマジ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 741,
        "sourceStartMs": 4976199,
        "sourceEndMs": 4978741,
        "text": "ここに行けというお告げだじゃあアンカー作ります?",
        "isThemeCandidate": false
      },
      {
        "speechId": 742,
        "sourceStartMs": 4980118,
        "sourceEndMs": 5008544,
        "text": "あ、確かにじゃあここでまたねまた集めよっかいのししもいるかもしれないしね反応してる反応してるいのししも喜んでるロープ石嬉しいぞ声がもう嬉しい嬉しいぞ本当さごめんなんだけどマリリンここの箱見てここここ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 743,
        "sourceStartMs": 5008544,
        "sourceEndMs": 5009944,
        "text": "仲間外れがいるよこっちこっち",
        "isThemeCandidate": false
      },
      {
        "speechId": 744,
        "sourceStartMs": 5010074,
        "sourceEndMs": 5013056,
        "text": "手前の箱仲間外れの葉っぱはどれかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 745,
        "sourceStartMs": 5013056,
        "sourceEndMs": 5021861,
        "text": "これこれねこれねこれねこれだー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 746,
        "sourceStartMs": 5021861,
        "sourceEndMs": 5023902,
        "text": "買いぞー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 747,
        "sourceStartMs": 5023902,
        "sourceEndMs": 5025143,
        "text": "見つけた!",
        "isThemeCandidate": false
      },
      {
        "speechId": 748,
        "sourceStartMs": 5025143,
        "sourceEndMs": 5026684,
        "text": "見つけたぞー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 749,
        "sourceStartMs": 5026684,
        "sourceEndMs": 5027064,
        "text": "見ーっけー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 750,
        "sourceStartMs": 5027064,
        "sourceEndMs": 5030987,
        "text": "仲間外れ見っけー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 751,
        "sourceStartMs": 5030987,
        "sourceEndMs": 5035930,
        "text": "終わったごめん面白すぎてちょっと見せたかったわご飯ある?",
        "isThemeCandidate": false
      },
      {
        "speechId": 752,
        "sourceStartMs": 5035930,
        "sourceEndMs": 5038751,
        "text": "ご飯あるよ生酢焼けてるよ食べない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 753,
        "sourceStartMs": 5038751,
        "sourceEndMs": 5039712,
        "text": "ここ生酢あるから",
        "isThemeCandidate": false
      },
      {
        "speechId": 754,
        "sourceStartMs": 5040042,
        "sourceEndMs": 5047946,
        "text": "いただきますわ食べて食べてマジくだらねーわ気づいた?",
        "isThemeCandidate": false
      },
      {
        "speechId": 755,
        "sourceStartMs": 5047946,
        "sourceEndMs": 5069478,
        "text": "気づいた作業しまーすまず食べようはい、あんこ落としたよナイスナイスナイスパクパクナマズ一息で全部食べたわオッケオッケまだ魚いっぱいあるから焼きますあまりの空腹に美味しかったねどんどん食べとどっかに集めようかな焼くわ",
        "isThemeCandidate": false
      },
      {
        "speechId": 756,
        "sourceStartMs": 5070266,
        "sourceEndMs": 5074108,
        "text": "なんか、ある程度分けたんだよね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 757,
        "sourceStartMs": 5074108,
        "sourceEndMs": 5087336,
        "text": "あ、ここブドウのベトベトのエリアだな終わったやだな、触りたくないねベトベトだからねうんこれでもうちょっと余裕できたら改めて整理整頓したいねそうね!",
        "isThemeCandidate": false
      },
      {
        "speechId": 758,
        "sourceStartMs": 5087336,
        "sourceEndMs": 5099083,
        "text": "今別にいっかいったねお水にさ、ペットボトル汲みなありがとうお水にペットボトル汲みな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 759,
        "sourceStartMs": 5099083,
        "sourceEndMs": 5099244,
        "text": "ん?",
        "isThemeCandidate": false
      },
      {
        "speechId": 760,
        "sourceStartMs": 5099244,
        "sourceEndMs": 5099344,
        "text": "ん?",
        "isThemeCandidate": false
      },
      {
        "speechId": 761,
        "sourceStartMs": 5099344,
        "sourceEndMs": 5099744,
        "text": "な、なに?",
        "isThemeCandidate": false
      },
      {
        "speechId": 762,
        "sourceStartMs": 5099744,
        "sourceEndMs": 5099944,
        "text": "ん?",
        "isThemeCandidate": false
      },
      {
        "speechId": 763,
        "sourceStartMs": 5101438,
        "sourceEndMs": 5103939,
        "text": "おかしくないか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 764,
        "sourceStartMs": 5103939,
        "sourceEndMs": 5109002,
        "text": "お水にペットボトルそういうことねペットボトルにお水組みなか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 765,
        "sourceStartMs": 5109002,
        "sourceEndMs": 5128111,
        "text": "そうだね順番が違うだけでこうもさ意味が違ってくるなすごいよな日本語の神秘を感じてるすごいよ木でも凝ろうかなじゃあいいね木こりしながら探すわ木こりしながらイノシシになる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 766,
        "sourceStartMs": 5128111,
        "sourceEndMs": 5128291,
        "text": "あれ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 767,
        "sourceStartMs": 5130066,
        "sourceEndMs": 5133747,
        "text": "イノシシンリーでいいのかなこれイノシシンリーやん?",
        "isThemeCandidate": false
      },
      {
        "speechId": 768,
        "sourceStartMs": 5133747,
        "sourceEndMs": 5135367,
        "text": "イノシシンリーなに言ってる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 769,
        "sourceStartMs": 5135367,
        "sourceEndMs": 5158994,
        "text": "ごめんねなんでもないわ無視してノープランに話し始めるな申し訳ちょっと木凝っちゃお魚焼いてあーこれあれかそっか魚焼くのにも板がいるんだなあそうでも板今ね凝ってるからね持ってくわ今からありがとう板はめとくからちょ待ってよこれもいける",
        "isThemeCandidate": false
      },
      {
        "speechId": 770,
        "sourceStartMs": 5162499,
        "sourceEndMs": 5189318,
        "text": "よー取れるぴょんぴょんぴょんぴょんマンゴー邪魔だから食べようじゃマンゴーマンゴーじゃんじゃんそんな笑わないそんな笑うとこじゃねーから今の面白いいやそういうの好きなんだよねそういうくだらないやつがさそんなおもろくないことでいっぱい笑われると気まず",
        "isThemeCandidate": true
      },
      {
        "speechId": 771,
        "sourceStartMs": 5190322,
        "sourceEndMs": 5195044,
        "text": "そんな面白くないと思ったえ、綺麗え、綺麗?",
        "isThemeCandidate": false
      },
      {
        "speechId": 772,
        "sourceStartMs": 5195044,
        "sourceEndMs": 5195084,
        "text": "何?",
        "isThemeCandidate": false
      },
      {
        "speechId": 773,
        "sourceStartMs": 5195084,
        "sourceEndMs": 5195464,
        "text": "夕焼け?",
        "isThemeCandidate": false
      },
      {
        "speechId": 774,
        "sourceStartMs": 5195464,
        "sourceEndMs": 5195944,
        "text": "朝日?",
        "isThemeCandidate": false
      },
      {
        "speechId": 775,
        "sourceStartMs": 5195944,
        "sourceEndMs": 5212850,
        "text": "うんほんとだほら、すごいね私さ、この景色一生忘れないと思うなんで?",
        "isThemeCandidate": false
      },
      {
        "speechId": 776,
        "sourceStartMs": 5212850,
        "sourceEndMs": 5213570,
        "text": "そんな思い出ある?",
        "isThemeCandidate": false
      },
      {
        "speechId": 777,
        "sourceStartMs": 5213570,
        "sourceEndMs": 5219192,
        "text": "バカされてるあ、そういう演技かそういう演技ごめんね、ごめんね気づけなくてごめんそういう演技",
        "isThemeCandidate": false
      },
      {
        "speechId": 778,
        "sourceStartMs": 5225398,
        "sourceEndMs": 5231500,
        "text": "ごめんねごめんね縁目だからちゃんと読んできた縁目今日の縁目縁目?",
        "isThemeCandidate": false
      },
      {
        "speechId": 779,
        "sourceStartMs": 5231500,
        "sourceEndMs": 5234981,
        "text": "縁目なんてあった?",
        "isThemeCandidate": false
      },
      {
        "speechId": 780,
        "sourceStartMs": 5234981,
        "sourceEndMs": 5236381,
        "text": "あ、待ってそれも演技か?",
        "isThemeCandidate": false
      },
      {
        "speechId": 781,
        "sourceStartMs": 5236381,
        "sourceEndMs": 5244903,
        "text": "マリンやったなぁねぇもう伝わってよマジついでなぁ今日絡みづらい?",
        "isThemeCandidate": false
      },
      {
        "speechId": 782,
        "sourceStartMs": 5244903,
        "sourceEndMs": 5249964,
        "text": "ちょっとやばいかもでもちょっとねあの絡みづらいのは伊之助の時は本当にねあのマジ",
        "isThemeCandidate": false
      },
      {
        "speechId": 783,
        "sourceStartMs": 5250620,
        "sourceEndMs": 5259163,
        "text": "いのすけ限定やんそれその時はね本当に死ぬと思ったね命も覚悟した船長本当に?",
        "isThemeCandidate": false
      },
      {
        "speechId": 784,
        "sourceStartMs": 5259163,
        "sourceEndMs": 5279310,
        "text": "まあでも死ななくてよかったねこっちが死にそうですなんなんなんどうした急にサメが来たから地道に泳いでるよしよしよし逃げれた逃げれたサメの餌作ってちょっとあれやりたいけどなもったいないんだよなそんなやつのためにクソがよどういう感情それ",
        "isThemeCandidate": false
      },
      {
        "speechId": 785,
        "sourceStartMs": 5280554,
        "sourceEndMs": 5283936,
        "text": "で、これ作ったやつ…あ、これもしかして斧で?",
        "isThemeCandidate": false
      },
      {
        "speechId": 786,
        "sourceStartMs": 5283936,
        "sourceEndMs": 5284357,
        "text": "どれ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 787,
        "sourceStartMs": 5284357,
        "sourceEndMs": 5284977,
        "text": "斧?",
        "isThemeCandidate": false
      },
      {
        "speechId": 788,
        "sourceStartMs": 5284977,
        "sourceEndMs": 5287619,
        "text": "あ、斧で壊せるじゃん!",
        "isThemeCandidate": false
      },
      {
        "speechId": 789,
        "sourceStartMs": 5287619,
        "sourceEndMs": 5288399,
        "text": "何を?",
        "isThemeCandidate": false
      },
      {
        "speechId": 790,
        "sourceStartMs": 5288399,
        "sourceEndMs": 5289900,
        "text": "あ、あ、作ったやつ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 791,
        "sourceStartMs": 5289900,
        "sourceEndMs": 5299307,
        "text": "うん、これは気づきでしたはい、すごーいおめでとうあ、へぇーえ、天井高くする?",
        "isThemeCandidate": false
      },
      {
        "speechId": 792,
        "sourceStartMs": 5299307,
        "sourceEndMs": 5302869,
        "text": "そうなったら…あ、でも、なんか大変じゃない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 793,
        "sourceStartMs": 5302869,
        "sourceEndMs": 5305131,
        "text": "そう、なんか壊して作るの大変じゃない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 794,
        "sourceStartMs": 5305131,
        "sourceEndMs": 5309614,
        "text": "材料がちょっと減ってる感じする、元よりね、なんかここだけ粗いけど何?",
        "isThemeCandidate": false
      },
      {
        "speechId": 795,
        "sourceStartMs": 5310822,
        "sourceEndMs": 5320109,
        "text": "だから、材料が足りないからあ、あ、あ、そうだ、同じこと、何回も強制で、強制!",
        "isThemeCandidate": false
      },
      {
        "speechId": 796,
        "sourceStartMs": 5320109,
        "sourceEndMs": 5337362,
        "text": "次言わせたらマジで、ガタガタ言わせるからなやばいやばいやばいよこれ、どうしようご機嫌そこにいちゃったわで、ここにもあれつけたいなOKここ無理なのかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 797,
        "sourceStartMs": 5337362,
        "sourceEndMs": 5338002,
        "text": "ちょっと、素材が足りないのかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 798,
        "sourceStartMs": 5338002,
        "sourceEndMs": 5339944,
        "text": "あれ、ここ無理なのかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 799,
        "sourceStartMs": 5341314,
        "sourceEndMs": 5341775,
        "text": "あれかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 800,
        "sourceStartMs": 5341775,
        "sourceEndMs": 5343575,
        "text": "柱がないからか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 801,
        "sourceStartMs": 5343575,
        "sourceEndMs": 5350698,
        "text": "ちょっと階層集めてきまーすあ、ナイスーこれでどうだ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 802,
        "sourceStartMs": 5350698,
        "sourceEndMs": 5350938,
        "text": "サラサラ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 803,
        "sourceStartMs": 5350938,
        "sourceEndMs": 5369824,
        "text": "サラサラサラサラ行ける行ける行けるあ、できたできたいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよいいよ",
        "isThemeCandidate": false
      },
      {
        "speechId": 804,
        "sourceStartMs": 5370342,
        "sourceEndMs": 5372123,
        "text": "角刈り用?",
        "isThemeCandidate": false
      },
      {
        "speechId": 805,
        "sourceStartMs": 5372123,
        "sourceEndMs": 5384947,
        "text": "角刈り用角刈り用ねうんこれつけるかでもやっぱ開放感も欲しいからさまあ確かに壁いらなくね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 806,
        "sourceStartMs": 5384947,
        "sourceEndMs": 5388388,
        "text": "そういうわけじゃない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 807,
        "sourceStartMs": 5388388,
        "sourceEndMs": 5399952,
        "text": "1階は開放するかいいな2階は2階は壁ありOKOK",
        "isThemeCandidate": false
      },
      {
        "speechId": 808,
        "sourceStartMs": 5402383,
        "sourceEndMs": 5404665,
        "text": "周りに何もないかもここない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 809,
        "sourceStartMs": 5404665,
        "sourceEndMs": 5415130,
        "text": "OK早々に移動した方がいいかもしれない壁にストレージできる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 810,
        "sourceStartMs": 5415130,
        "sourceEndMs": 5416951,
        "text": "クローゼットみたいな感じ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 811,
        "sourceStartMs": 5416951,
        "sourceEndMs": 5428318,
        "text": "ちょっと待ってやってみていいよ階段の裏側とかデッドスペースを活かしてさ収納をここにさ",
        "isThemeCandidate": false
      },
      {
        "speechId": 812,
        "sourceStartMs": 5429346,
        "sourceEndMs": 5430000,
        "text": "え、ちょっと待って",
        "isThemeCandidate": false
      },
      {
        "speechId": 813,
        "sourceStartMs": 5431915,
        "sourceEndMs": 5459098,
        "text": "ちょっと待って忙しくなって気上がりましたわすごいじゃんなんかしたいなちょっとじゃあもうここ離して移動しました移動してまた板とか集めて欲しいかなじゃあアンカー外します壁の収納所気になりますちょっともう一回魚釣ろうこれちょっとぶち壊して待って待ってまず2階の",
        "isThemeCandidate": false
      },
      {
        "speechId": 814,
        "sourceStartMs": 5460342,
        "sourceEndMs": 5489452,
        "text": "ここの完成させようここをこのエリアを2階で何をしたいかって言ったらやっぱり作物とかヤシの木を2階で育てたいよねそれなそれなじゃあとりあえず魚釣りながらあれだ材料集めるわんでもやっぱさ1回さジャンプでさ移動できないのちょっとだるいよね引っかかってあジャンプあー別にいいようーんあー",
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
