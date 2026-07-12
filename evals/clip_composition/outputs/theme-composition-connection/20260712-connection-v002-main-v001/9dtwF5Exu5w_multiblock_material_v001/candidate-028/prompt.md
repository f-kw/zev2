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
  "evaluationInputId": "o8rZAhARXAc-theme-candidate-028",
  "sourceVideoId": "o8rZAhARXAc",
  "selectedTheme": {
    "id": "input-selection-v004-candidate-028",
    "title": "初戦の相手「ザサミ商業」の強さに絶望するマリン監督",
    "summary": "試合開始直後に先制点を取られ、相手チームの総合戦力Bや全員星300という驚異のステータスに焦るシーンです。",
    "candidateSpeechIds": [
      629,
      630,
      631,
      632,
      633,
      634,
      635,
      636
    ],
    "whyItCanBeClipped": "試合開始直後に先制点を取られ、相手チームの総合戦力Bや全員星300という驚異のステータスに焦るシーンです。",
    "compositionNote": "候補発話はテーマ中心の照準。前後の周辺文脈を読み、中心を含む適切な区間を自分の境界判断で切る。根拠範囲の端をそのまま境界へ写さない。",
    "candidateSpeechIdsRole": "theme_center_aim"
  },
  "transcript": {
    "language": "ja-JP",
    "durationSec": 11898.441,
    "speechUnitGroups": [
      [
        545,
        546,
        547,
        548,
        549,
        550,
        551,
        552,
        553,
        554,
        555,
        556,
        557,
        558,
        559,
        560,
        561,
        562,
        563,
        564,
        565,
        566,
        567,
        568,
        569,
        570,
        571,
        572,
        573,
        574,
        575,
        576,
        577,
        578,
        579,
        580,
        581,
        582,
        583,
        584,
        585,
        586,
        587,
        588,
        589,
        590,
        591,
        592,
        593,
        594,
        595,
        596,
        597,
        598,
        599,
        600,
        601,
        602,
        603,
        604,
        605,
        606,
        607,
        608,
        609,
        610,
        611,
        612,
        613,
        614,
        615,
        616,
        617,
        618,
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
        689
      ]
    ],
    "segments": [
      {
        "speechId": 545,
        "sourceStartMs": 5520002,
        "sourceEndMs": 5547270,
        "text": "目指したいのかこれ一旦守備E目指してうーんそうだねそれからミート塗装力に振っていくか一旦E目指してそれからミート塗装力にするかでプレアちゃんがミートででアマノくんはこれミートBまで上げた方がいいかしら",
        "isThemeCandidate": false
      },
      {
        "speechId": 546,
        "sourceStartMs": 5561304,
        "sourceEndMs": 5577514,
        "text": "うんうんうんうんうんミートデイかコロネがちょっと弾をねもう3回くらいポロってるの見ちゃってもしかして補給上げた方がいいのか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 547,
        "sourceStartMs": 5577514,
        "sourceEndMs": 5577874,
        "text": "になってきた",
        "isThemeCandidate": false
      },
      {
        "speechId": 548,
        "sourceStartMs": 5587898,
        "sourceEndMs": 5609094,
        "text": "あれはもう運だと思って運だと思っとくかほなまあそしたら一旦ミートでいいかBまで来たしうん",
        "isThemeCandidate": false
      },
      {
        "speechId": 549,
        "sourceStartMs": 5611014,
        "sourceEndMs": 5612535,
        "text": "呼吸はSでも落とす?",
        "isThemeCandidate": false
      },
      {
        "speechId": 550,
        "sourceStartMs": 5612535,
        "sourceEndMs": 5613196,
        "text": "演出?",
        "isThemeCandidate": false
      },
      {
        "speechId": 551,
        "sourceStartMs": 5613196,
        "sourceEndMs": 5620322,
        "text": "うんまあうんと思って一旦MeetBとかでもめがけるかじゃあ…にしとくか!",
        "isThemeCandidate": false
      },
      {
        "speechId": 552,
        "sourceStartMs": 5620322,
        "sourceEndMs": 5622784,
        "text": "とりあえずね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 553,
        "sourceStartMs": 5622784,
        "sourceEndMs": 5624605,
        "text": "ですかね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 554,
        "sourceStartMs": 5624605,
        "sourceEndMs": 5637456,
        "text": "はいって感じで体力…体力はカスなんだけどまあいいかお食事会来いこれでいきますかとりあえずね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 555,
        "sourceStartMs": 5637456,
        "sourceEndMs": 5639278,
        "text": "はいいきまーす",
        "isThemeCandidate": false
      },
      {
        "speechId": 556,
        "sourceStartMs": 5647638,
        "sourceEndMs": 5657966,
        "text": "さてうわー組み合わせ抽選会やだ怖いわーやだー監督組み合わせ抽選会に参加しませんか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 557,
        "sourceStartMs": 5657966,
        "sourceEndMs": 5668494,
        "text": "どの学校も強豪校ばかりですが甲子園優勝を目指して対戦相手を確認しましょう行ってきます了解しましたでは会場に向かいましょう",
        "isThemeCandidate": false
      },
      {
        "speechId": 558,
        "sourceStartMs": 5671994,
        "sourceEndMs": 5672915,
        "text": "やばい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 559,
        "sourceStartMs": 5672915,
        "sourceEndMs": 5682022,
        "text": "Aとかいるんだけどマリンが邪魔ですよねすいませんどきまーすやばくない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 560,
        "sourceStartMs": 5682022,
        "sourceEndMs": 5688206,
        "text": "AってコヨリAに当たって勝てた?",
        "isThemeCandidate": false
      },
      {
        "speechId": 561,
        "sourceStartMs": 5688206,
        "sourceEndMs": 5688987,
        "text": "え?",
        "isThemeCandidate": false
      },
      {
        "speechId": 562,
        "sourceStartMs": 5688987,
        "sourceEndMs": 5690088,
        "text": "すごくない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 563,
        "sourceStartMs": 5690088,
        "sourceEndMs": 5691308,
        "text": "Aに勝ったん?",
        "isThemeCandidate": false
      },
      {
        "speechId": 564,
        "sourceStartMs": 5691308,
        "sourceEndMs": 5698514,
        "text": "もう進みますかAに勝つってもうコヨリSってことじゃん",
        "isThemeCandidate": false
      },
      {
        "speechId": 565,
        "sourceStartMs": 5701367,
        "sourceEndMs": 5702247,
        "text": "どこにする?",
        "isThemeCandidate": false
      },
      {
        "speechId": 566,
        "sourceStartMs": 5702247,
        "sourceEndMs": 5714533,
        "text": "キャージーどれがいい?",
        "isThemeCandidate": false
      },
      {
        "speechId": 567,
        "sourceStartMs": 5714533,
        "sourceEndMs": 5719475,
        "text": "どれがいい?",
        "isThemeCandidate": false
      },
      {
        "speechId": 568,
        "sourceStartMs": 5719475,
        "sourceEndMs": 5721796,
        "text": "魔物でギリかキャージーに決めてもらうわはいはいはいえっと一番右オッケーじゃあ一番右で行きますけ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 569,
        "sourceStartMs": 5721796,
        "sourceEndMs": 5728519,
        "text": "1?",
        "isThemeCandidate": false
      },
      {
        "speechId": 570,
        "sourceStartMs": 5728519,
        "sourceEndMs": 5729340,
        "text": "1Bかー",
        "isThemeCandidate": false
      },
      {
        "speechId": 571,
        "sourceStartMs": 5733894,
        "sourceEndMs": 5751200,
        "text": "ざま…ざまみ…ざまみ商業高校ざまみ…大丈夫かなぁ…Bって…Bやばいか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 572,
        "sourceStartMs": 5751200,
        "sourceEndMs": 5755602,
        "text": "まぁ占い師踏んで…占い師踏んで…",
        "isThemeCandidate": false
      },
      {
        "speechId": 573,
        "sourceStartMs": 5762086,
        "sourceEndMs": 5765608,
        "text": "占い師踏んで、緑踏めたら踏みたくて、青は踏むか。",
        "isThemeCandidate": false
      },
      {
        "speechId": 574,
        "sourceStartMs": 5765608,
        "sourceEndMs": 5768909,
        "text": "うん。",
        "isThemeCandidate": false
      },
      {
        "speechId": 575,
        "sourceStartMs": 5768909,
        "sourceEndMs": 5772971,
        "text": "ですね。",
        "isThemeCandidate": false
      },
      {
        "speechId": 576,
        "sourceStartMs": 5772971,
        "sourceEndMs": 5776253,
        "text": "うん、2、1、3、OK。",
        "isThemeCandidate": false
      },
      {
        "speechId": 577,
        "sourceStartMs": 5776253,
        "sourceEndMs": 5778574,
        "text": "回復も踏みたい、うーん。",
        "isThemeCandidate": false
      },
      {
        "speechId": 578,
        "sourceStartMs": 5778574,
        "sourceEndMs": 5779515,
        "text": "そうね。",
        "isThemeCandidate": false
      },
      {
        "speechId": 579,
        "sourceStartMs": 5779515,
        "sourceEndMs": 5782676,
        "text": "あ、でも性格ガチャはしたいよな。",
        "isThemeCandidate": false
      },
      {
        "speechId": 580,
        "sourceStartMs": 5782676,
        "sourceEndMs": 5783517,
        "text": "本州監督!",
        "isThemeCandidate": false
      },
      {
        "speechId": 581,
        "sourceStartMs": 5783517,
        "sourceEndMs": 5789300,
        "text": "アホイ高校の甲子園卒、ちょ、ちょ、ちょ、ちょ。",
        "isThemeCandidate": false
      },
      {
        "speechId": 582,
        "sourceStartMs": 5789300,
        "sourceEndMs": 5789880,
        "text": "卒業生から",
        "isThemeCandidate": false
      },
      {
        "speechId": 583,
        "sourceStartMs": 5790298,
        "sourceEndMs": 5819900,
        "text": "使った方がいいかな弾道バットミムラてめえお前いい加減にしろそろそろすでに打ち気の人間とごく普通の人間をどうにかしようとするのやめないとお前その色の違う眉毛を引き抜くし開運を平穏に変えるぞお前わかったかクールクールは変えていいよねクール",
        "isThemeCandidate": false
      },
      {
        "speechId": 584,
        "sourceStartMs": 5820002,
        "sourceEndMs": 5832289,
        "text": "ダウンは変えていいよね弾道は使うなら3年目は勝ったね、クールって変えていいよね気持ちいこう、いけうちけかい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 585,
        "sourceStartMs": 5832289,
        "sourceEndMs": 5833510,
        "text": "うちけ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 586,
        "sourceStartMs": 5833510,
        "sourceEndMs": 5834110,
        "text": "うちけ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 587,
        "sourceStartMs": 5834110,
        "sourceEndMs": 5848959,
        "text": "もちろん悪くないお祭りはとこ悪くないいちいちで踏めるぞこれいちいちで踏んでいくか全部お調子者いなかったかも",
        "isThemeCandidate": false
      },
      {
        "speechId": 588,
        "sourceStartMs": 5850898,
        "sourceEndMs": 5873785,
        "text": "これどっちでもいいよね、別に悪くはないよね、決して別にどっちでもいいよね、これ気持ちいいOKOKOK個別TOKOKOK今日張り切ってる3人!",
        "isThemeCandidate": false
      },
      {
        "speechId": 589,
        "sourceStartMs": 5873785,
        "sourceEndMs": 5874705,
        "text": "リト!",
        "isThemeCandidate": false
      },
      {
        "speechId": 590,
        "sourceStartMs": 5874705,
        "sourceEndMs": 5875806,
        "text": "アマノ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 591,
        "sourceStartMs": 5875806,
        "sourceEndMs": 5876366,
        "text": "フブキュン!",
        "isThemeCandidate": false
      },
      {
        "speechId": 592,
        "sourceStartMs": 5881898,
        "sourceEndMs": 5884920,
        "text": "これフ…フブキングですか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 593,
        "sourceStartMs": 5884920,
        "sourceEndMs": 5890545,
        "text": "これそれとも美兎の天を挙げるべき?",
        "isThemeCandidate": false
      },
      {
        "speechId": 594,
        "sourceStartMs": 5890545,
        "sourceEndMs": 5890745,
        "text": "フブさん?",
        "isThemeCandidate": false
      },
      {
        "speechId": 595,
        "sourceStartMs": 5890745,
        "sourceEndMs": 5909800,
        "text": "OKフブちゃんなそっか練習効率も上がるのかでも1しか進まないからあんま意味ないのかプレアチャンスにアドバイスを行ったプレアチャンスは一気に感じたようだ急にあえー",
        "isThemeCandidate": false
      },
      {
        "speechId": 596,
        "sourceStartMs": 5913538,
        "sourceEndMs": 5918200,
        "text": "Tバッティング、ミスぶりど、ど、ど、どっちでも?",
        "isThemeCandidate": false
      },
      {
        "speechId": 597,
        "sourceStartMs": 5918200,
        "sourceEndMs": 5934666,
        "text": "これT、TでOK回復踏むかOKさあみんな元気出してーお疲れサマンサ",
        "isThemeCandidate": false
      },
      {
        "speechId": 598,
        "sourceStartMs": 5940598,
        "sourceEndMs": 5946322,
        "text": "こまめに踏めるように1はとっておくべき?",
        "isThemeCandidate": false
      },
      {
        "speechId": 599,
        "sourceStartMs": 5946322,
        "sourceEndMs": 5949044,
        "text": "これ参照か?",
        "isThemeCandidate": false
      },
      {
        "speechId": 600,
        "sourceStartMs": 5949044,
        "sourceEndMs": 5953087,
        "text": "オッケー参照かな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 601,
        "sourceStartMs": 5953087,
        "sourceEndMs": 5956269,
        "text": "あ、5のミートのがいらない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 602,
        "sourceStartMs": 5956269,
        "sourceEndMs": 5958410,
        "text": "4のがいらない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 603,
        "sourceStartMs": 5958410,
        "sourceEndMs": 5959851,
        "text": "3のがいらない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 604,
        "sourceStartMs": 5959851,
        "sourceEndMs": 5963074,
        "text": "5のがいらない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 605,
        "sourceStartMs": 5963074,
        "sourceEndMs": 5963294,
        "text": "5ね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 606,
        "sourceStartMs": 5963294,
        "sourceEndMs": 5968677,
        "text": "オッケーオッケーうん、オッケー5な",
        "isThemeCandidate": false
      },
      {
        "speechId": 607,
        "sourceStartMs": 5974694,
        "sourceEndMs": 5998530,
        "text": "監督おはようございます甲子園大会の出場のため出発しましたさあ早く早く甲子園へ移動甲子園へ到着したやばい緊張しておしっこ漏れそうあーおしっこ漏れちゃうあーおしっこ漏れちゃうからかかとで大股を押さえてと大会期間中は甲子園で練習することになる甲子園を目の当たりにして選手たちにやる気がみぎっている",
        "isThemeCandidate": false
      },
      {
        "speechId": 608,
        "sourceStartMs": 6002550,
        "sourceEndMs": 6005292,
        "text": "テンション上がった?",
        "isThemeCandidate": false
      },
      {
        "speechId": 609,
        "sourceStartMs": 6005292,
        "sourceEndMs": 6005713,
        "text": "監督!",
        "isThemeCandidate": false
      },
      {
        "speechId": 610,
        "sourceStartMs": 6005713,
        "sourceEndMs": 6007635,
        "text": "夏の甲子園大会がいよいよ始まります!",
        "isThemeCandidate": false
      },
      {
        "speechId": 611,
        "sourceStartMs": 6007635,
        "sourceEndMs": 6009817,
        "text": "強豪揃いでどこも手強いですが必ず勝ちましょう!",
        "isThemeCandidate": false
      },
      {
        "speechId": 612,
        "sourceStartMs": 6009817,
        "sourceEndMs": 6010978,
        "text": "いやー所詮ハイタイは嫌だ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 613,
        "sourceStartMs": 6010978,
        "sourceEndMs": 6011018,
        "text": "お?",
        "isThemeCandidate": false
      },
      {
        "speechId": 614,
        "sourceStartMs": 6011018,
        "sourceEndMs": 6011298,
        "text": "え、誰にしよう?",
        "isThemeCandidate": false
      },
      {
        "speechId": 615,
        "sourceStartMs": 6011298,
        "sourceEndMs": 6023529,
        "text": "いや、これ誰かな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 616,
        "sourceStartMs": 6023529,
        "sourceEndMs": 6026091,
        "text": "コロネかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 617,
        "sourceStartMs": 6026091,
        "sourceEndMs": 6028754,
        "text": "でもお調子者お祭りできるよ、いつでも",
        "isThemeCandidate": false
      },
      {
        "speechId": 618,
        "sourceStartMs": 6037366,
        "sourceEndMs": 6059980,
        "text": "座はアベヒ大山は乗ってますお調子者です超ノリノリだし大山OK大山ねトイレうんトイレ行きたいトイレ行きたーいあみんないいじゃんいいじゃんえめっちゃやばい向こうの学校超真顔です",
        "isThemeCandidate": false
      },
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
        "isThemeCandidate": true
      },
      {
        "speechId": 630,
        "sourceStartMs": 6284348,
        "sourceEndMs": 6288972,
        "text": "沖縄かよ!",
        "isThemeCandidate": true
      },
      {
        "speechId": 631,
        "sourceStartMs": 6288972,
        "sourceEndMs": 6293835,
        "text": "どいつもこいつも似た顔しやがって負けてらんねん総合力戦力B!",
        "isThemeCandidate": true
      },
      {
        "speechId": 632,
        "sourceStartMs": 6293835,
        "sourceEndMs": 6296257,
        "text": "おい今日初めて出てくる長谷川!",
        "isThemeCandidate": true
      },
      {
        "speechId": 633,
        "sourceStartMs": 6296257,
        "sourceEndMs": 6299360,
        "text": "お前初めてのくせにちょ、やばいやばい1点取られた",
        "isThemeCandidate": true
      },
      {
        "speechId": 634,
        "sourceStartMs": 6305196,
        "sourceEndMs": 6329174,
        "text": "右の杉山マウンドに上がりました今日は配球にも注目したいと思います1回の裏パイレーツ攻撃に入ります先頭バッターは大山あれ黄色い声援だお祭り男と勘違いしてたちょっと見るか相手でも強っ強っバランスよ強っ",
        "isThemeCandidate": true
      },
      {
        "speechId": 635,
        "sourceStartMs": 6336132,
        "sourceEndMs": 6359100,
        "text": "あ、強あ、ツッツヨツヨスーヨ肩Dツッツヨツヨスーヨバランスよく強いな向こうにもスワいるんだけどやべえよ全員星300ぐらいある全員星300あるこれマン?",
        "isThemeCandidate": true
      },
      {
        "speechId": 636,
        "sourceStartMs": 6359100,
        "sourceEndMs": 6359980,
        "text": "あ、こいつだけエラー",
        "isThemeCandidate": true
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
        "isThemeCandidate": false
      },
      {
        "speechId": 654,
        "sourceStartMs": 6525871,
        "sourceEndMs": 6526271,
        "text": "転がったら!",
        "isThemeCandidate": false
      },
      {
        "speechId": 655,
        "sourceStartMs": 6526271,
        "sourceEndMs": 6527292,
        "text": "よーしよしよしよしよしよしよし!",
        "isThemeCandidate": false
      },
      {
        "speechId": 656,
        "sourceStartMs": 6527292,
        "sourceEndMs": 6528033,
        "text": "泡の工夫!",
        "isThemeCandidate": false
      },
      {
        "speechId": 657,
        "sourceStartMs": 6528033,
        "sourceEndMs": 6529974,
        "text": "やればできるじゃない!",
        "isThemeCandidate": false
      },
      {
        "speechId": 658,
        "sourceStartMs": 6529974,
        "sourceEndMs": 6530934,
        "text": "なんだって!",
        "isThemeCandidate": false
      },
      {
        "speechId": 659,
        "sourceStartMs": 6530934,
        "sourceEndMs": 6531275,
        "text": "スワ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 660,
        "sourceStartMs": 6531275,
        "sourceEndMs": 6532956,
        "text": "お前やれんのか!",
        "isThemeCandidate": false
      },
      {
        "speechId": 661,
        "sourceStartMs": 6532956,
        "sourceEndMs": 6534216,
        "text": "スワ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 662,
        "sourceStartMs": 6534216,
        "sourceEndMs": 6535777,
        "text": "やれんのか状態で!",
        "isThemeCandidate": false
      },
      {
        "speechId": 663,
        "sourceStartMs": 6535777,
        "sourceEndMs": 6539920,
        "text": "スワスワスワ!",
        "isThemeCandidate": false
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
