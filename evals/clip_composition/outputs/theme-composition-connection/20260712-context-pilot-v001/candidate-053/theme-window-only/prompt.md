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
  "evaluationInputId": "YE-faluP7zY-theme-candidate-053",
  "sourceVideoId": "YE-faluP7zY",
  "selectedTheme": {
    "id": "input-selection-v004-candidate-053",
    "title": "エモい演技を台無しにされるマリン",
    "summary": "マリンが景色に感動してエモい演技をするも、ころねに伝わらず空回りして「絡みづらい」と言われてしまう掛け合いが面白い。",
    "candidateSpeechIds": [
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
      784
    ],
    "whyItCanBeClipped": "マリンが景色に感動してエモい演技をするも、ころねに伝わらず空回りして「絡みづらい」と言われてしまう掛け合いが面白い。",
    "compositionNote": "提示された候補発話範囲の中から、テーマが単独で成立する最小区間を選ぶ。"
  },
  "transcript": {
    "language": "ja-JP",
    "durationSec": 11824.121,
    "speechUnitGroups": [
      [
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
        830,
        831,
        832,
        833,
        834,
        835,
        836,
        837,
        838,
        839,
        840,
        841,
        842
      ]
    ],
    "segments": [
      {
        "speechId": 771,
        "sourceStartMs": 5190322,
        "sourceEndMs": 5195044,
        "text": "そんな面白くないと思ったえ、綺麗え、綺麗?",
        "isThemeCandidate": true
      },
      {
        "speechId": 772,
        "sourceStartMs": 5195044,
        "sourceEndMs": 5195084,
        "text": "何?",
        "isThemeCandidate": true
      },
      {
        "speechId": 773,
        "sourceStartMs": 5195084,
        "sourceEndMs": 5195464,
        "text": "夕焼け?",
        "isThemeCandidate": true
      },
      {
        "speechId": 774,
        "sourceStartMs": 5195464,
        "sourceEndMs": 5195944,
        "text": "朝日?",
        "isThemeCandidate": true
      },
      {
        "speechId": 775,
        "sourceStartMs": 5195944,
        "sourceEndMs": 5212850,
        "text": "うんほんとだほら、すごいね私さ、この景色一生忘れないと思うなんで?",
        "isThemeCandidate": true
      },
      {
        "speechId": 776,
        "sourceStartMs": 5212850,
        "sourceEndMs": 5213570,
        "text": "そんな思い出ある?",
        "isThemeCandidate": true
      },
      {
        "speechId": 777,
        "sourceStartMs": 5213570,
        "sourceEndMs": 5219192,
        "text": "バカされてるあ、そういう演技かそういう演技ごめんね、ごめんね気づけなくてごめんそういう演技",
        "isThemeCandidate": true
      },
      {
        "speechId": 778,
        "sourceStartMs": 5225398,
        "sourceEndMs": 5231500,
        "text": "ごめんねごめんね縁目だからちゃんと読んできた縁目今日の縁目縁目?",
        "isThemeCandidate": true
      },
      {
        "speechId": 779,
        "sourceStartMs": 5231500,
        "sourceEndMs": 5234981,
        "text": "縁目なんてあった?",
        "isThemeCandidate": true
      },
      {
        "speechId": 780,
        "sourceStartMs": 5234981,
        "sourceEndMs": 5236381,
        "text": "あ、待ってそれも演技か?",
        "isThemeCandidate": true
      },
      {
        "speechId": 781,
        "sourceStartMs": 5236381,
        "sourceEndMs": 5244903,
        "text": "マリンやったなぁねぇもう伝わってよマジついでなぁ今日絡みづらい?",
        "isThemeCandidate": true
      },
      {
        "speechId": 782,
        "sourceStartMs": 5244903,
        "sourceEndMs": 5249964,
        "text": "ちょっとやばいかもでもちょっとねあの絡みづらいのは伊之助の時は本当にねあのマジ",
        "isThemeCandidate": true
      },
      {
        "speechId": 783,
        "sourceStartMs": 5250620,
        "sourceEndMs": 5259163,
        "text": "いのすけ限定やんそれその時はね本当に死ぬと思ったね命も覚悟した船長本当に?",
        "isThemeCandidate": true
      },
      {
        "speechId": 784,
        "sourceStartMs": 5259163,
        "sourceEndMs": 5279310,
        "text": "まあでも死ななくてよかったねこっちが死にそうですなんなんなんどうした急にサメが来たから地道に泳いでるよしよしよし逃げれた逃げれたサメの餌作ってちょっとあれやりたいけどなもったいないんだよなそんなやつのためにクソがよどういう感情それ",
        "isThemeCandidate": true
      },
      {
        "speechId": 830,
        "sourceStartMs": 5581366,
        "sourceEndMs": 5584688,
        "text": "捨てるけど、頬を立てたほうがほら!",
        "isThemeCandidate": false
      },
      {
        "speechId": 831,
        "sourceStartMs": 5584688,
        "sourceEndMs": 5586909,
        "text": "ほらほらほらほら!",
        "isThemeCandidate": false
      },
      {
        "speechId": 832,
        "sourceStartMs": 5586909,
        "sourceEndMs": 5591793,
        "text": "そんな、そんなちまちまやってさぁひどしてるよ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 833,
        "sourceStartMs": 5591793,
        "sourceEndMs": 5593073,
        "text": "まどろっこしいんだよ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 834,
        "sourceStartMs": 5593073,
        "sourceEndMs": 5605881,
        "text": "なんでなんちゅうこと今、頬開いてやったからよ感謝しろよなぁよし、進み始めた?",
        "isThemeCandidate": false
      },
      {
        "speechId": 835,
        "sourceStartMs": 5605881,
        "sourceEndMs": 5607402,
        "text": "ん?",
        "isThemeCandidate": false
      },
      {
        "speechId": 836,
        "sourceStartMs": 5607402,
        "sourceEndMs": 5608963,
        "text": "進んでるこれ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 837,
        "sourceStartMs": 5608963,
        "sourceEndMs": 5609183,
        "text": "あれ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 838,
        "sourceStartMs": 5609183,
        "sourceEndMs": 5609944,
        "text": "すでに進んでるよ",
        "isThemeCandidate": false
      },
      {
        "speechId": 839,
        "sourceStartMs": 5610114,
        "sourceEndMs": 5639964,
        "text": "逆でしたと向きが逆でしたおいおい何やってんだおんじゃんお前がやれよ泣くぞ泣くぞぐずってるぐずってる早く泣けよ泣くまでが長いでまだぐすぐすしてるあれ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 840,
        "sourceStartMs": 5641350,
        "sourceEndMs": 5648235,
        "text": "もう遅いよもういつまでグズってんだよあれ進まないんだけどおかしくない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 841,
        "sourceStartMs": 5648235,
        "sourceEndMs": 5669490,
        "text": "なんかやっぱパドルの出番ってわけよこれがおかしいなぁ向きは合ってると思うんだけどねちょっと待ってなぁパドルでこくから今行けパドルでやった方がいいと思うんだよね待っちょ待っちょ",
        "isThemeCandidate": false
      },
      {
        "speechId": 842,
        "sourceStartMs": 5671582,
        "sourceEndMs": 5672062,
        "text": "進んでる?",
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
