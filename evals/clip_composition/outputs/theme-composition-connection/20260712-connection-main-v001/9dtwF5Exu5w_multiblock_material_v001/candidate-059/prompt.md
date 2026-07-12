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
  "evaluationInputId": "o8rZAhARXAc-theme-candidate-059",
  "sourceVideoId": "o8rZAhARXAc",
  "selectedTheme": {
    "id": "input-selection-v004-candidate-059",
    "title": "次戦の相手判明と次回配信への持ち越し",
    "summary": "次の対戦相手がBランクであることに反応しつつ、打ち気ガチャや試合を次回に持ち越して配信の告知と締めに入る一連の流れが綺麗にまとまっているため。",
    "candidateSpeechIds": [
      1318,
      1319,
      1320,
      1321,
      1322
    ],
    "whyItCanBeClipped": "次の対戦相手がBランクであることに反応しつつ、打ち気ガチャや試合を次回に持ち越して配信の告知と締めに入る一連の流れが綺麗にまとまっているため。",
    "compositionNote": "提示された候補発話範囲の中から、テーマが単独で成立する最小区間を選ぶ。"
  },
  "transcript": {
    "language": "ja-JP",
    "durationSec": 11898.441,
    "speechUnitGroups": [
      [
        1253,
        1254,
        1255,
        1256,
        1257,
        1258,
        1259,
        1260,
        1261,
        1262,
        1263,
        1264,
        1265,
        1266,
        1267,
        1268,
        1269,
        1270,
        1271,
        1272,
        1273,
        1274,
        1275,
        1276,
        1277,
        1278,
        1279,
        1280,
        1281,
        1282,
        1283,
        1284,
        1285,
        1286,
        1287,
        1288,
        1289,
        1290,
        1291,
        1292,
        1293,
        1294,
        1295,
        1296,
        1297,
        1298,
        1299,
        1300,
        1301,
        1302,
        1303,
        1304,
        1305,
        1306,
        1307,
        1308,
        1309,
        1310,
        1311,
        1312,
        1313,
        1314,
        1315,
        1316,
        1317,
        1318,
        1319,
        1320,
        1321,
        1322,
        1323
      ]
    ],
    "segments": [
      {
        "speechId": 1253,
        "sourceStartMs": 10927714,
        "sourceEndMs": 10928062,
        "text": "マジで?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1254,
        "sourceStartMs": 10957266,
        "sourceEndMs": 10958769,
        "text": "やめろいいわまずいはい",
        "isThemeCandidate": false
      },
      {
        "speechId": 1255,
        "sourceStartMs": 10980390,
        "sourceEndMs": 10981311,
        "text": "犠牲フライしてやばい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1256,
        "sourceStartMs": 10981311,
        "sourceEndMs": 10985234,
        "text": "2ストライクや!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1257,
        "sourceStartMs": 10985234,
        "sourceEndMs": 10986114,
        "text": "になったらスクイズ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1258,
        "sourceStartMs": 10986114,
        "sourceEndMs": 10987796,
        "text": "か?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1259,
        "sourceStartMs": 10987796,
        "sourceEndMs": 11005829,
        "text": "うん分かった分かったストライク",
        "isThemeCandidate": false
      },
      {
        "speechId": 1260,
        "sourceStartMs": 11010002,
        "sourceEndMs": 11034742,
        "text": "ああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああ",
        "isThemeCandidate": false
      },
      {
        "speechId": 1261,
        "sourceStartMs": 11083154,
        "sourceEndMs": 11083575,
        "text": "涙出た",
        "isThemeCandidate": false
      },
      {
        "speechId": 1262,
        "sourceStartMs": 11100566,
        "sourceEndMs": 11106251,
        "text": "辛かった本当にもう嫌だやった!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1263,
        "sourceStartMs": 11106251,
        "sourceEndMs": 11106471,
        "text": "勝ちましたね!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1264,
        "sourceStartMs": 11106471,
        "sourceEndMs": 11121986,
        "text": "はいふぶちゃん何も上がってないのかー",
        "isThemeCandidate": false
      },
      {
        "speechId": 1265,
        "sourceStartMs": 11140562,
        "sourceEndMs": 11142104,
        "text": "この試合すごい活躍だったね!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1266,
        "sourceStartMs": 11142104,
        "sourceEndMs": 11142625,
        "text": "これからも頑張ってね!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1267,
        "sourceStartMs": 11142625,
        "sourceEndMs": 11158005,
        "text": "いいね、いいね、いいね分かったら特訓ある今日はここまでです",
        "isThemeCandidate": false
      },
      {
        "speechId": 1268,
        "sourceStartMs": 11180811,
        "sourceEndMs": 11189520,
        "text": "もうつらいんだよこれでいいかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1269,
        "sourceStartMs": 11199718,
        "sourceEndMs": 11218614,
        "text": "動いた上がった上がった総合で総合3で上がった総合3でみんなの今効率上がってんのこれイヤン",
        "isThemeCandidate": false
      },
      {
        "speechId": 1270,
        "sourceStartMs": 11223006,
        "sourceEndMs": 11235132,
        "text": "何も書いてなくて分かんにゃいうん、じゃあ総合ね、分かった、はいあ、もう今?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1271,
        "sourceStartMs": 11235132,
        "sourceEndMs": 11236172,
        "text": "今買い物?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1272,
        "sourceStartMs": 11236172,
        "sourceEndMs": 11236312,
        "text": "もう今?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1273,
        "sourceStartMs": 11236312,
        "sourceEndMs": 11236873,
        "text": "もう今なの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1274,
        "sourceStartMs": 11236873,
        "sourceEndMs": 11242335,
        "text": "もう分かった、今ね何買おう君たち何があったらいいかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1275,
        "sourceStartMs": 11242335,
        "sourceEndMs": 11246037,
        "text": "何があったらいいと思う?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1276,
        "sourceStartMs": 11246037,
        "sourceEndMs": 11248178,
        "text": "これ何買おう",
        "isThemeCandidate": false
      },
      {
        "speechId": 1277,
        "sourceStartMs": 11261110,
        "sourceEndMs": 11277872,
        "text": "お褒めないお褒め自分探し",
        "isThemeCandidate": false
      },
      {
        "speechId": 1278,
        "sourceStartMs": 11281846,
        "sourceEndMs": 11283567,
        "text": "お褒めね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1279,
        "sourceStartMs": 11283567,
        "sourceEndMs": 11285847,
        "text": "うーんお褒め何個買う?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1280,
        "sourceStartMs": 11285847,
        "sourceEndMs": 11285987,
        "text": "1個?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1281,
        "sourceStartMs": 11285987,
        "sourceEndMs": 11298871,
        "text": "うーんうーん2個?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1282,
        "sourceStartMs": 11298871,
        "sourceEndMs": 11299751,
        "text": "うーんうーん自分探し?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1283,
        "sourceStartMs": 11299751,
        "sourceEndMs": 11307954,
        "text": "うーん自分探しの本うん",
        "isThemeCandidate": false
      },
      {
        "speechId": 1284,
        "sourceStartMs": 11315570,
        "sourceEndMs": 11316431,
        "text": "あと何買う?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1285,
        "sourceStartMs": 11316431,
        "sourceEndMs": 11320753,
        "text": "あと何見る?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1286,
        "sourceStartMs": 11320753,
        "sourceEndMs": 11321654,
        "text": "機材見る?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1287,
        "sourceStartMs": 11321654,
        "sourceEndMs": 11339806,
        "text": "機材はこんな感じこんな感じ何買う?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1288,
        "sourceStartMs": 11357404,
        "sourceEndMs": 11364591,
        "text": "うんうんうんうん自分探し確かに年齢が偏りが半端じゃないんだよなもう一個あってもいいよねストープウォッチうんうん",
        "isThemeCandidate": false
      },
      {
        "speechId": 1289,
        "sourceStartMs": 11376935,
        "sourceEndMs": 11385057,
        "text": "じゃあもう900円しかないからもう一個自分探し買うどこ行った?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1290,
        "sourceStartMs": 11385057,
        "sourceEndMs": 11399720,
        "text": "あった偏りがすごいからあと今いるフブちゃん達が2年生なんだけどここが3年になった時にウチキがいないからフブちゃん達の代の3年生のみんなを",
        "isThemeCandidate": false
      },
      {
        "speechId": 1291,
        "sourceStartMs": 11400970,
        "sourceEndMs": 11428900,
        "text": "打ち気にするチャレンジとか緩和極意は1個ある1個だけど500円あるあとあと500円ある何がいいかな",
        "isThemeCandidate": false
      },
      {
        "speechId": 1292,
        "sourceStartMs": 11430022,
        "sourceEndMs": 11432764,
        "text": "変更とか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1293,
        "sourceStartMs": 11432764,
        "sourceEndMs": 11435126,
        "text": "強化極意も1個あると便利?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1294,
        "sourceStartMs": 11435126,
        "sourceEndMs": 11439649,
        "text": "強化極意にする?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1295,
        "sourceStartMs": 11439649,
        "sourceEndMs": 11441990,
        "text": "1個スケヘンがいいかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1296,
        "sourceStartMs": 11441990,
        "sourceEndMs": 11448095,
        "text": "あれがいいと思うスケヘン?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1297,
        "sourceStartMs": 11448095,
        "sourceEndMs": 11449215,
        "text": "スケヘン?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1298,
        "sourceStartMs": 11449215,
        "sourceEndMs": 11458001,
        "text": "うんじゃあスケヘンにするか多項調査とか引けるかもしんないもんね自分探しもう1個?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1299,
        "sourceStartMs": 11458001,
        "sourceEndMs": 11458582,
        "text": "どっちにしよう",
        "isThemeCandidate": false
      },
      {
        "speechId": 1300,
        "sourceStartMs": 11460214,
        "sourceEndMs": 11473477,
        "text": "しよううん好けへんかうんうん自分探し?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1301,
        "sourceStartMs": 11473477,
        "sourceEndMs": 11479838,
        "text": "好けへん?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1302,
        "sourceStartMs": 11479838,
        "sourceEndMs": 11480898,
        "text": "自分探し?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1303,
        "sourceStartMs": 11480898,
        "sourceEndMs": 11482478,
        "text": "好けへん?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1304,
        "sourceStartMs": 11482478,
        "sourceEndMs": 11489940,
        "text": "好けへんにするか個人に勝ちたいかでも性格の偏り",
        "isThemeCandidate": false
      },
      {
        "speechId": 1305,
        "sourceStartMs": 11490898,
        "sourceEndMs": 11519254,
        "text": "伝令がさ2年生に守備伝がもう一個来てくれれば諏訪を下げなきゃみたいなのがなくなるのにねって思うとさ自分探しのがいいかなそもそもさこのさ諏訪を下げなきゃいけないっていうのがさまずさ守備伝がないせいじゃん結局秋も守備伝がないってことになるじゃんこれってつまり秋になったら守備伝もう誰もいないってことになるでって思うと自分探しか",
        "isThemeCandidate": false
      },
      {
        "speechId": 1306,
        "sourceStartMs": 11526771,
        "sourceEndMs": 11549880,
        "text": "そうスワがいなくなっちゃうから出ると限らんけどやらないといないままだからでもいやでも占い師もいるからそんなに占い師もいるからそんなに買いまくる必要ないのか占い師もいるのにそんなに買いまくる必要ないのかな",
        "isThemeCandidate": false
      },
      {
        "speechId": 1307,
        "sourceStartMs": 11552570,
        "sourceEndMs": 11568079,
        "text": "スケヘンのがいいかぁ一旦…うーん…はどっちだろう?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1308,
        "sourceStartMs": 11568079,
        "sourceEndMs": 11569500,
        "text": "キャッチどっちがいると思う?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1309,
        "sourceStartMs": 11569500,
        "sourceEndMs": 11571741,
        "text": "スケヘンもガチャだ、そうだね、スケヘンもガチャだふんふんふんふんふん",
        "isThemeCandidate": false
      },
      {
        "speechId": 1310,
        "sourceStartMs": 11590611,
        "sourceEndMs": 11600416,
        "text": "ふんふんふんふんえーどっちでもガチャ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1311,
        "sourceStartMs": 11600416,
        "sourceEndMs": 11600516,
        "text": "好み?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1312,
        "sourceStartMs": 11600516,
        "sourceEndMs": 11600676,
        "text": "好み?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1313,
        "sourceStartMs": 11600676,
        "sourceEndMs": 11609220,
        "text": "まぁそうだよねー好みだよねーご支援中は透けへん髪頼み?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1314,
        "sourceStartMs": 11609220,
        "sourceEndMs": 11609880,
        "text": "そうだねー確かにまぁでも今後の",
        "isThemeCandidate": false
      },
      {
        "speechId": 1315,
        "sourceStartMs": 11612063,
        "sourceEndMs": 11639700,
        "text": "自分探しかな今後も考えて秋とかまで見越して一旦甲子園勝ち抜くならスケ編かもだけどスケ編して何も出なかったらバカみたいだから自分探しの方がいいのかもしれないうん打ち気も増やしてるし増やせないかもしれないけどこれにします明日が明日じゃない今度がジャローじゃあ",
        "isThemeCandidate": false
      },
      {
        "speechId": 1316,
        "sourceStartMs": 11640566,
        "sourceEndMs": 11669820,
        "text": "はい、本書館の花にあ、甲子園大会初調理おめでとうございますありがとうございますあ、贈り物ベンチブレスベンチブレスって持てなかったっけ置いとくか、忘れないうちにお、満腹弁当あれか、スタミナ回復系かなみんなスタミナ終わりになってるからありかもしれないみんなのスタミナ終わってるからありかも",
        "isThemeCandidate": false
      },
      {
        "speechId": 1317,
        "sourceStartMs": 11674674,
        "sourceEndMs": 11699540,
        "text": "体力回復ありだなお、いいねじゃあ体力も回復しとこうでBかー",
        "isThemeCandidate": false
      },
      {
        "speechId": 1318,
        "sourceStartMs": 11701322,
        "sourceEndMs": 11722274,
        "text": "次BでしたBBかーということではいいったんね打ち気ガチャしとく?",
        "isThemeCandidate": true
      },
      {
        "speechId": 1319,
        "sourceStartMs": 11722274,
        "sourceEndMs": 11722674,
        "text": "今?",
        "isThemeCandidate": true
      },
      {
        "speechId": 1320,
        "sourceStartMs": 11722674,
        "sourceEndMs": 11729378,
        "text": "いやいや次回にしとくわ次回にうんはい次回正確ガチャと",
        "isThemeCandidate": true
      },
      {
        "speechId": 1321,
        "sourceStartMs": 11730322,
        "sourceEndMs": 11759740,
        "text": "甲子園大会2回戦でやっていこうと思います次回の予定を発表したいと思います9月24日今日は24日なので明日の明日のホロコー配信はみこちになっています明日はみこちそしてマリンの次回はですね9月28日から",
        "isThemeCandidate": true
      },
      {
        "speechId": 1322,
        "sourceStartMs": 11763275,
        "sourceEndMs": 11789446,
        "text": "次回9月28日になっていますはいよろしくお願いいたしますですねはいてなわけではい4日後次回もいっぱいアドバイスよろしくお願いしますセーブして終了してキメジの心を安定させてそれではどうも",
        "isThemeCandidate": true
      },
      {
        "speechId": 1323,
        "sourceStartMs": 11823654,
        "sourceEndMs": 11839582,
        "text": "この船では美少女無罪が適用されますけど任せて魔法で若返り秘密の素顔は君にだけ特別ですよあたしやったよ",
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
