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
  "evaluationInputId": "YE-faluP7zY-theme-candidate-046",
  "sourceVideoId": "YE-faluP7zY",
  "selectedTheme": {
    "id": "input-selection-v004-candidate-046",
    "title": "ころねの頭の匂いを嗅いだマリンの一言にじわじわ泣いちゃうころね",
    "summary": "マリンがころねの頭の匂いを「臭い」と言い放ち、それに対してころねがじわじわと泣き真似をする仲の良いプロレスが展開されているため。",
    "candidateSpeechIds": [
      578,
      579,
      580
    ],
    "whyItCanBeClipped": "マリンがころねの頭の匂いを「臭い」と言い放ち、それに対してころねがじわじわと泣き真似をする仲の良いプロレスが展開されているため。",
    "compositionNote": "候補発話はテーマ中心の照準。前後の周辺文脈を読み、中心を含む適切な区間を自分の境界判断で切る。根拠範囲の端をそのまま境界へ写さない。",
    "candidateSpeechIdsRole": "theme_center_aim"
  },
  "transcript": {
    "language": "ja-JP",
    "durationSec": 11824.121,
    "speechUnitGroups": [
      [
        518,
        519,
        520,
        521,
        522,
        523,
        524,
        525,
        526,
        527,
        528,
        529,
        530,
        531,
        532,
        533,
        534,
        535,
        536,
        537,
        538,
        539,
        540,
        541,
        542,
        543,
        544,
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
        634
      ]
    ],
    "segments": [
      {
        "speechId": 518,
        "sourceStartMs": 3601814,
        "sourceEndMs": 3630000,
        "text": "えぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇ",
        "isThemeCandidate": false
      },
      {
        "speechId": 519,
        "sourceStartMs": 3630326,
        "sourceEndMs": 3630947,
        "text": "どこ行った?",
        "isThemeCandidate": false
      },
      {
        "speechId": 520,
        "sourceStartMs": 3630947,
        "sourceEndMs": 3634469,
        "text": "ここにいるねあれ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 521,
        "sourceStartMs": 3634469,
        "sourceEndMs": 3659924,
        "text": "見つけた見つけたそこにいてそろりそろり肉食べよう肉食べようじゃん夜景の見えるレストランを私しましたお前その顔でイノシシの肉を持ってくるって",
        "isThemeCandidate": false
      },
      {
        "speechId": 522,
        "sourceStartMs": 3662551,
        "sourceEndMs": 3689086,
        "text": "じゃあ行きますよかんぱいかんぱい食べてる食べてるせーのあんまかゆくしねえじゃねえかなんでこんな温存したんだよ何も回復量変わらねえじゃねえかよ",
        "isThemeCandidate": false
      },
      {
        "speechId": 523,
        "sourceStartMs": 3696786,
        "sourceEndMs": 3719724,
        "text": "マジでマジ死ぬ笑いすぎてもうマジいっぱいの獅子やんこんなめっちゃ泣いてるし鼻水もいっぱい出てるし待って鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来てる鳥来て",
        "isThemeCandidate": false
      },
      {
        "speechId": 524,
        "sourceStartMs": 3720322,
        "sourceEndMs": 3749904,
        "text": "すぐはぐれるじゃんやだここだよやだなんでどこちょっと待って今なんで岩落としてくるんだねえ岩拾いに行ったとこにさはいはいはい待ってコーネどこコーネどこすぐはぐれるじゃねえかどこだコーネからだんだんイノスケに変わってくるやめろ痛い痛い痛い長いねこれねここであれ岩さ岩のさ岩の出所をさ探しにさそうねそうね岩の出所にあそこの上",
        "isThemeCandidate": false
      },
      {
        "speechId": 525,
        "sourceStartMs": 3750806,
        "sourceEndMs": 3752486,
        "text": "上でもあれ登れるか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 526,
        "sourceStartMs": 3752486,
        "sourceEndMs": 3763229,
        "text": "え、でも見て足場みたいなのがあるよあ、これワンチャン登れとほら見て見てさすが伊之助くんすごい身のこなしすごすぎるあ、痛っ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 527,
        "sourceStartMs": 3763229,
        "sourceEndMs": 3767029,
        "text": "あーこれ無理かなえ、痛れる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 528,
        "sourceStartMs": 3767029,
        "sourceEndMs": 3779852,
        "text": "いや無理じゃない登らないってこれでもここにさ足場があるってことはさ足場じゃなくてさこれネイチャーアートだよこれ自然が作り出したものでさいやいやそんな登る足場",
        "isThemeCandidate": false
      },
      {
        "speechId": 529,
        "sourceStartMs": 3780418,
        "sourceEndMs": 3782640,
        "text": "マジ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 530,
        "sourceStartMs": 3782640,
        "sourceEndMs": 3784401,
        "text": "マジで言ってるの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 531,
        "sourceStartMs": 3784401,
        "sourceEndMs": 3788484,
        "text": "あの鳥がこっちに戻ってくるとき、それがお前の死ぬときだここ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 532,
        "sourceStartMs": 3788484,
        "sourceEndMs": 3790965,
        "text": "くそー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 533,
        "sourceStartMs": 3790965,
        "sourceEndMs": 3791245,
        "text": "あーくそ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 534,
        "sourceStartMs": 3791245,
        "sourceEndMs": 3792887,
        "text": "マリリンどこ行ったの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 535,
        "sourceStartMs": 3792887,
        "sourceEndMs": 3795608,
        "text": "あの岩の上岩の上のぽにょ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 536,
        "sourceStartMs": 3795608,
        "sourceEndMs": 3797790,
        "text": "待って、水やばい岩の上のぽにょ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 537,
        "sourceStartMs": 3797790,
        "sourceEndMs": 3798350,
        "text": "やだ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 538,
        "sourceStartMs": 3798350,
        "sourceEndMs": 3798470,
        "text": "痛い!",
        "isThemeCandidate": false
      },
      {
        "speechId": 539,
        "sourceStartMs": 3798470,
        "sourceEndMs": 3798590,
        "text": "痛い!",
        "isThemeCandidate": false
      },
      {
        "speechId": 540,
        "sourceStartMs": 3798590,
        "sourceEndMs": 3799911,
        "text": "痛い!",
        "isThemeCandidate": false
      },
      {
        "speechId": 541,
        "sourceStartMs": 3799911,
        "sourceEndMs": 3800212,
        "text": "マジ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 542,
        "sourceStartMs": 3800212,
        "sourceEndMs": 3800612,
        "text": "どうした?",
        "isThemeCandidate": false
      },
      {
        "speechId": 543,
        "sourceStartMs": 3800612,
        "sourceEndMs": 3800872,
        "text": "どうした?",
        "isThemeCandidate": false
      },
      {
        "speechId": 544,
        "sourceStartMs": 3800872,
        "sourceEndMs": 3801633,
        "text": "どうした?",
        "isThemeCandidate": false
      },
      {
        "speechId": 545,
        "sourceStartMs": 3801633,
        "sourceEndMs": 3803274,
        "text": "くらったー死んだ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 546,
        "sourceStartMs": 3803274,
        "sourceEndMs": 3808177,
        "text": "いや、まだまだ生きてるえ、待って、反対側から登れるってマジ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 547,
        "sourceStartMs": 3808177,
        "sourceEndMs": 3809258,
        "text": "うん、コメントに書いてある",
        "isThemeCandidate": false
      },
      {
        "speechId": 548,
        "sourceStartMs": 3810310,
        "sourceEndMs": 3820095,
        "text": "そんなさ反対側から登れるよってそんなさすごいじゃんまた来てるまた来てるまた来てるっておいでおいでマリンマリン生きてる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 549,
        "sourceStartMs": 3820095,
        "sourceEndMs": 3822016,
        "text": "まだ生きてるコーネどこ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 550,
        "sourceStartMs": 3822016,
        "sourceEndMs": 3824737,
        "text": "コーネもう上登ってるよあ裏から?",
        "isThemeCandidate": false
      },
      {
        "speechId": 551,
        "sourceStartMs": 3824737,
        "sourceEndMs": 3839904,
        "text": "うん今裏に一瞬影がね見えた気がしたのあ本当だ登れたよOK行くわなにこれ黒い粉だったわコーネ今ね今鳥のこと見てたらね鳥ね普通にねあの床に落ちてる道端の地面のね岩拾って",
        "isThemeCandidate": false
      },
      {
        "speechId": 552,
        "sourceStartMs": 3840794,
        "sourceEndMs": 3851679,
        "text": "あそういうことじゃ上に行ってるわけじゃないんだそういう感じっぽい上に来たけど上にも何もないなこれ何もない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 553,
        "sourceStartMs": 3851679,
        "sourceEndMs": 3865406,
        "text": "パイナップルが咲いてるあお腹減ってるから食べる黄色い粉とかは取らなくていいよな粉はいらないかもねあそこに止まるのかもしれないね",
        "isThemeCandidate": false
      },
      {
        "speechId": 554,
        "sourceStartMs": 3872594,
        "sourceEndMs": 3873174,
        "text": "止まるんじゃない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 555,
        "sourceStartMs": 3873174,
        "sourceEndMs": 3879156,
        "text": "あそこにえ、分からんなこれどうすればいいんじゃんこれちょっと満身創痍だよどうする?",
        "isThemeCandidate": false
      },
      {
        "speechId": 556,
        "sourceStartMs": 3879156,
        "sourceEndMs": 3900000,
        "text": "やばいねでもねあ、今下にいてランチタブなんだうぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅぅ",
        "isThemeCandidate": false
      },
      {
        "speechId": 557,
        "sourceStartMs": 3900514,
        "sourceEndMs": 3903595,
        "text": "やめようちょっと待ってどこ行った?",
        "isThemeCandidate": false
      },
      {
        "speechId": 558,
        "sourceStartMs": 3903595,
        "sourceEndMs": 3904615,
        "text": "こうね後ろ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 559,
        "sourceStartMs": 3904615,
        "sourceEndMs": 3906196,
        "text": "どこ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 560,
        "sourceStartMs": 3906196,
        "sourceEndMs": 3915439,
        "text": "後ろを振り返ってごらんイノシシ君行きましょう行くぞ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 561,
        "sourceStartMs": 3915439,
        "sourceEndMs": 3918880,
        "text": "声が声が太すぎる行くぞ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 562,
        "sourceStartMs": 3918880,
        "sourceEndMs": 3920401,
        "text": "行くぞ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 563,
        "sourceStartMs": 3920401,
        "sourceEndMs": 3923242,
        "text": "でもイノシシもいなくないか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 564,
        "sourceStartMs": 3923242,
        "sourceEndMs": 3927483,
        "text": "もしかしてもうやっちゃったかもねやっちゃった?",
        "isThemeCandidate": false
      },
      {
        "speechId": 565,
        "sourceStartMs": 3927483,
        "sourceEndMs": 3929884,
        "text": "川他にねえ待ってもうさ移動するこれ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 566,
        "sourceStartMs": 3930774,
        "sourceEndMs": 3936278,
        "text": "ワンチャンありだね、この島結構居だしね、ずっとね、魚釣ってた方がこれ、こう、良いのでは?",
        "isThemeCandidate": false
      },
      {
        "speechId": 567,
        "sourceStartMs": 3936278,
        "sourceEndMs": 3947364,
        "text": "効率確かに、ぐるっと、こっからぐるっとさ、一瞬回ってくか何かさ、特別なものがないか見ながらえっ、目の前に居る?",
        "isThemeCandidate": false
      },
      {
        "speechId": 568,
        "sourceStartMs": 3947364,
        "sourceEndMs": 3948205,
        "text": "えっ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 569,
        "sourceStartMs": 3948205,
        "sourceEndMs": 3948425,
        "text": "居んの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 570,
        "sourceStartMs": 3948425,
        "sourceEndMs": 3951647,
        "text": "こ、こんなのことじゃない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 571,
        "sourceStartMs": 3951647,
        "sourceEndMs": 3952167,
        "text": "分かりづれー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 572,
        "sourceStartMs": 3952167,
        "sourceEndMs": 3952407,
        "text": "分かりづれーこと言うな!",
        "isThemeCandidate": false
      },
      {
        "speechId": 573,
        "sourceStartMs": 3952407,
        "sourceEndMs": 3959892,
        "text": "あ、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま、ま",
        "isThemeCandidate": false
      },
      {
        "speechId": 574,
        "sourceStartMs": 3961702,
        "sourceEndMs": 3980088,
        "text": "こんな顔でこびられてもって話かこの顔ですよとりあえず移動して魚釣りながら素材集めながらダンサーだね行きますか気づいたら結構欠けてるよふざけんなふざけんなふざけんなマジ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 575,
        "sourceStartMs": 3980088,
        "sourceEndMs": 3981448,
        "text": "サメに?",
        "isThemeCandidate": false
      },
      {
        "speechId": 576,
        "sourceStartMs": 3981448,
        "sourceEndMs": 3988230,
        "text": "結構食われてるねこれマジでそういうことするのかするだろうよそりゃ",
        "isThemeCandidate": false
      },
      {
        "speechId": 577,
        "sourceStartMs": 3989600,
        "sourceEndMs": 3989963,
        "text": "とりあえず",
        "isThemeCandidate": false
      },
      {
        "speechId": 578,
        "sourceStartMs": 3991226,
        "sourceEndMs": 4017368,
        "text": "話題がすり減ってますとよしじゃあ出発しますかマリリン今更なんだけどさコーネのさ顔さもうちょい下げてもいいかもよマリリンの顔がさ可愛いフェイスが見えなくなっちゃうあでもね船長はねこうやって下を向いた時にコーネのねあの頭の匂い嗅いでるのからえ、いい匂い?",
        "isThemeCandidate": true
      },
      {
        "speechId": 579,
        "sourceStartMs": 4017368,
        "sourceEndMs": 4018950,
        "text": "うん、臭い泣いちゃったー",
        "isThemeCandidate": true
      },
      {
        "speechId": 580,
        "sourceStartMs": 4023866,
        "sourceEndMs": 4029707,
        "text": "泣くまで時間かかるからねごめんねじわじわ泣くやん早よ泣けやんこれも出発した?",
        "isThemeCandidate": true
      },
      {
        "speechId": 581,
        "sourceStartMs": 4029707,
        "sourceEndMs": 4040050,
        "text": "酷い酷いよあ、もうアンカー外したごめんねはいよーあ、待ってせーの出航!",
        "isThemeCandidate": false
      },
      {
        "speechId": 582,
        "sourceStartMs": 4040050,
        "sourceEndMs": 4044951,
        "text": "一人で行ってる板欲しいなー板?",
        "isThemeCandidate": false
      },
      {
        "speechId": 583,
        "sourceStartMs": 4044951,
        "sourceEndMs": 4049492,
        "text": "板欲しいなー板かーえ、でも板さーここに",
        "isThemeCandidate": false
      },
      {
        "speechId": 584,
        "sourceStartMs": 4050822,
        "sourceEndMs": 4055446,
        "text": "たぶんさ13枚しかないわ13枚あるの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 585,
        "sourceStartMs": 4055446,
        "sourceEndMs": 4074140,
        "text": "あるあるいただきいただきインカいただきストリートあれも作る、回収ネットも作りたいな作ろう2階を完成させるという当初の目的を急に思い出してきたえっとじゃあ何あ、とりあえず行きゃー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 586,
        "sourceStartMs": 4074140,
        "sourceEndMs": 4079944,
        "text": "よしよしよしちょっとさ、さっきさお魚釣りするわOK",
        "isThemeCandidate": false
      },
      {
        "speechId": 587,
        "sourceStartMs": 4080646,
        "sourceEndMs": 4094315,
        "text": "じゃあ船長は次第を集めたいけど今何も流れてないからこれ引っかかってないよね大丈夫だよね動いてる動いてるめっちゃ釣れるじゃんこれ楽しいいいねロープどっかにあったのロープ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 588,
        "sourceStartMs": 4094315,
        "sourceEndMs": 4095935,
        "text": "ロープ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 589,
        "sourceStartMs": 4095935,
        "sourceEndMs": 4109864,
        "text": "まじイノスキにやられるかとお腹がまじめちゃめちゃになったわ今のイノスキでそんな笑うとは思わなかったよ腹よじれたガチでよじれた死ぬかと思ったまあ嬉しいよねまあ",
        "isThemeCandidate": false
      },
      {
        "speechId": 590,
        "sourceStartMs": 4110474,
        "sourceEndMs": 4122562,
        "text": "嬉しいよねクールな嬉しい嬉しいクールな犬がめちゃめちゃ嬉しいよなかなか進まないなせんちゃんも釣りしてダブルスタイルで行くかあれ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 591,
        "sourceStartMs": 4122562,
        "sourceEndMs": 4125663,
        "text": "ほがほの向きがあれ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 592,
        "sourceStartMs": 4125663,
        "sourceEndMs": 4139192,
        "text": "いやそうだね向きがあれかもちょっと待って開くかOKOK開きましての向かいも広いねあいいよいいよいいよ生きてる生きてる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 593,
        "sourceStartMs": 4139192,
        "sourceEndMs": 4139852,
        "text": "うんうまく",
        "isThemeCandidate": false
      },
      {
        "speechId": 594,
        "sourceStartMs": 4140240,
        "sourceEndMs": 4154686,
        "text": "離れたから綺麗に離れたらもうたたむか閉じてりょりょりょのりょいや死ぬかと思ったな見て釣ったこれはもういいよなに釣った?",
        "isThemeCandidate": false
      },
      {
        "speechId": 595,
        "sourceStartMs": 4154686,
        "sourceEndMs": 4165790,
        "text": "見て釣ったよちっちぇなねえ頑張ったんだけどなんかその顔のデカさに対してのスケール感がさああそんなんじゃなかったごめんね焼きまーす",
        "isThemeCandidate": false
      },
      {
        "speechId": 596,
        "sourceStartMs": 4166934,
        "sourceEndMs": 4169542,
        "text": "とみちゃんも釣り竿作るかネジスクラップ",
        "isThemeCandidate": false
      },
      {
        "speechId": 597,
        "sourceStartMs": 4172355,
        "sourceEndMs": 4175696,
        "text": "釣竿壊れたんですけど絵も壊れたの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 598,
        "sourceStartMs": 4175696,
        "sourceEndMs": 4190561,
        "text": "自分で作りまーす偉いね自分で作って偉い偉いあでも板いるんか素材集めまーす金属で作る?",
        "isThemeCandidate": false
      },
      {
        "speechId": 599,
        "sourceStartMs": 4190561,
        "sourceEndMs": 4192702,
        "text": "金属だと作れるもったいなくない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 600,
        "sourceStartMs": 4192702,
        "sourceEndMs": 4199724,
        "text": "いやそんなことないでしょむしろ板使わないし金属の釣竿で長く使えるしありやね",
        "isThemeCandidate": false
      },
      {
        "speechId": 601,
        "sourceStartMs": 4200866,
        "sourceEndMs": 4202386,
        "text": "スクールアップでじゃあ、よろしくお願いしまーす!",
        "isThemeCandidate": false
      },
      {
        "speechId": 602,
        "sourceStartMs": 4202386,
        "sourceEndMs": 4202646,
        "text": "オッケーでーす!",
        "isThemeCandidate": false
      },
      {
        "speechId": 603,
        "sourceStartMs": 4202646,
        "sourceEndMs": 4229712,
        "text": "あ、待って、お腹すいてベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベベ",
        "isThemeCandidate": false
      },
      {
        "speechId": 604,
        "sourceStartMs": 4230258,
        "sourceEndMs": 4233359,
        "text": "ここにいっぱい…他人事?",
        "isThemeCandidate": false
      },
      {
        "speechId": 605,
        "sourceStartMs": 4233359,
        "sourceEndMs": 4233799,
        "text": "OK!",
        "isThemeCandidate": false
      },
      {
        "speechId": 606,
        "sourceStartMs": 4233799,
        "sourceEndMs": 4236259,
        "text": "釣竿できました!",
        "isThemeCandidate": false
      },
      {
        "speechId": 607,
        "sourceStartMs": 4236259,
        "sourceEndMs": 4236799,
        "text": "助かる!",
        "isThemeCandidate": false
      },
      {
        "speechId": 608,
        "sourceStartMs": 4236799,
        "sourceEndMs": 4237699,
        "text": "助かる!",
        "isThemeCandidate": false
      },
      {
        "speechId": 609,
        "sourceStartMs": 4237699,
        "sourceEndMs": 4238900,
        "text": "渡しまーす!",
        "isThemeCandidate": false
      },
      {
        "speechId": 610,
        "sourceStartMs": 4238900,
        "sourceEndMs": 4240980,
        "text": "ありがとうございます!",
        "isThemeCandidate": false
      },
      {
        "speechId": 611,
        "sourceStartMs": 4240980,
        "sourceEndMs": 4242040,
        "text": "Thankyouverymuch!",
        "isThemeCandidate": false
      },
      {
        "speechId": 612,
        "sourceStartMs": 4242040,
        "sourceEndMs": 4242280,
        "text": "すごい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 613,
        "sourceStartMs": 4242280,
        "sourceEndMs": 4243321,
        "text": "資材もいっぱい来てる!",
        "isThemeCandidate": false
      },
      {
        "speechId": 614,
        "sourceStartMs": 4243321,
        "sourceEndMs": 4245021,
        "text": "どんどん拾うわよ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 615,
        "sourceStartMs": 4245021,
        "sourceEndMs": 4246521,
        "text": "取る取る取る!",
        "isThemeCandidate": false
      },
      {
        "speechId": 616,
        "sourceStartMs": 4246521,
        "sourceEndMs": 4246901,
        "text": "いいよ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 617,
        "sourceStartMs": 4246901,
        "sourceEndMs": 4248482,
        "text": "ここに取るから!",
        "isThemeCandidate": false
      },
      {
        "speechId": 618,
        "sourceStartMs": 4248482,
        "sourceEndMs": 4249482,
        "text": "ここ取れるのか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 619,
        "sourceStartMs": 4249482,
        "sourceEndMs": 4254543,
        "text": "空腹の雨より視界がぼやけてる今お魚焼いてるからね!",
        "isThemeCandidate": false
      },
      {
        "speechId": 620,
        "sourceStartMs": 4254543,
        "sourceEndMs": 4254763,
        "text": "頼む!",
        "isThemeCandidate": false
      },
      {
        "speechId": 621,
        "sourceStartMs": 4254763,
        "sourceEndMs": 4255583,
        "text": "焼けててくれ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 622,
        "sourceStartMs": 4255583,
        "sourceEndMs": 4256263,
        "text": "お願い!",
        "isThemeCandidate": false
      },
      {
        "speechId": 623,
        "sourceStartMs": 4256263,
        "sourceEndMs": 4256563,
        "text": "いいよ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 624,
        "sourceStartMs": 4256563,
        "sourceEndMs": 4256963,
        "text": "いいよ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 625,
        "sourceStartMs": 4256963,
        "sourceEndMs": 4257604,
        "text": "焼けてる!",
        "isThemeCandidate": false
      },
      {
        "speechId": 626,
        "sourceStartMs": 4257604,
        "sourceEndMs": 4257844,
        "text": "助かる!",
        "isThemeCandidate": false
      },
      {
        "speechId": 627,
        "sourceStartMs": 4257844,
        "sourceEndMs": 4259964,
        "text": "ナイス!",
        "isThemeCandidate": false
      },
      {
        "speechId": 628,
        "sourceStartMs": 4263026,
        "sourceEndMs": 4264307,
        "text": "お味はいかがでしょうか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 629,
        "sourceStartMs": 4264307,
        "sourceEndMs": 4289544,
        "text": "お味はですね、これ食べてアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアムアム",
        "isThemeCandidate": false
      },
      {
        "speechId": 630,
        "sourceStartMs": 4290094,
        "sourceEndMs": 4308985,
        "text": "なめんなよサメだからって撮影が高いえっとネット壊されちゃったなこれは痛えネットでもどうしようかなとりあえず気にしちゃいけない気にしちゃ負けだわあそういうこと?",
        "isThemeCandidate": false
      },
      {
        "speechId": 631,
        "sourceStartMs": 4308985,
        "sourceEndMs": 4319892,
        "text": "うんとりあえずちょっとお魚釣って食材多めに確保しといてOKあナマズ釣ったナマズあナマズいいよナマズいい食料",
        "isThemeCandidate": false
      },
      {
        "speechId": 632,
        "sourceStartMs": 4320114,
        "sourceEndMs": 4348870,
        "text": "いいよー盛りだくさんだからナマズはプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリプリ",
        "isThemeCandidate": false
      },
      {
        "speechId": 633,
        "sourceStartMs": 4350866,
        "sourceEndMs": 4354127,
        "text": "ここなんでできない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 634,
        "sourceStartMs": 4354127,
        "sourceEndMs": 4359148,
        "text": "ここなんでできない?",
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
