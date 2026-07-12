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
  "evaluationInputId": "o8rZAhARXAc-theme-candidate-054",
  "sourceVideoId": "o8rZAhARXAc",
  "selectedTheme": {
    "id": "input-selection-v004-candidate-054",
    "title": "盗塁させるか迷いまくるマリン船長",
    "summary": "走力や盗塁の能力値が低いため、盗塁を指示すべきか葛藤しながらリスナーに問いかけ続ける場面。",
    "candidateSpeechIds": [
      1216,
      1217,
      1218,
      1219,
      1220,
      1221,
      1222,
      1223,
      1224,
      1225,
      1226,
      1227,
      1228,
      1229,
      1230,
      1231,
      1232,
      1233,
      1234,
      1235,
      1236
    ],
    "whyItCanBeClipped": "走力や盗塁の能力値が低いため、盗塁を指示すべきか葛藤しながらリスナーに問いかけ続ける場面。",
    "compositionNote": "提示された候補発話範囲の中から、テーマが単独で成立する最小区間を選ぶ。"
  },
  "transcript": {
    "language": "ja-JP",
    "durationSec": 11898.441,
    "speechUnitGroups": [
      [
        1155,
        1156,
        1157,
        1158,
        1159,
        1160,
        1161,
        1162,
        1163,
        1164,
        1165,
        1166,
        1167,
        1168,
        1169,
        1170,
        1171,
        1172,
        1173,
        1174,
        1175,
        1176,
        1177,
        1178,
        1179,
        1180,
        1181,
        1182,
        1183,
        1184,
        1185,
        1186,
        1187,
        1188,
        1189,
        1190,
        1191,
        1192,
        1193,
        1194,
        1195,
        1196,
        1197,
        1198,
        1199,
        1200,
        1201,
        1202,
        1203,
        1204,
        1205,
        1206,
        1207,
        1208,
        1209,
        1210,
        1211,
        1212,
        1213,
        1214,
        1215,
        1216,
        1217,
        1218,
        1219,
        1220,
        1221,
        1222,
        1223,
        1224,
        1225,
        1226,
        1227,
        1228,
        1229,
        1230,
        1231,
        1232,
        1233,
        1234,
        1235,
        1236,
        1237,
        1238,
        1239,
        1240,
        1241,
        1242,
        1243,
        1244,
        1245,
        1246,
        1247,
        1248,
        1249,
        1250,
        1251,
        1252,
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
        1267
      ]
    ],
    "segments": [
      {
        "speechId": 1155,
        "sourceStartMs": 10437219,
        "sourceEndMs": 10439900,
        "text": "もうコロさんもいないそうだよコロねも",
        "isThemeCandidate": false
      },
      {
        "speechId": 1156,
        "sourceStartMs": 10441547,
        "sourceEndMs": 10444708,
        "text": "どうすんのよ1点取れば勝てる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1157,
        "sourceStartMs": 10444708,
        "sourceEndMs": 10469860,
        "text": "あああああ転がししかないよねこれうーんちょこせんところ転がししかないかそうだよねなんでこんな",
        "isThemeCandidate": false
      },
      {
        "speechId": 1158,
        "sourceStartMs": 10470502,
        "sourceEndMs": 10471463,
        "text": "ヒリヒリしてもうこんなヒリヒリした試合はもうやだー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1159,
        "sourceStartMs": 10471463,
        "sourceEndMs": 10471723,
        "text": "もうやだー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1160,
        "sourceStartMs": 10471723,
        "sourceEndMs": 10472044,
        "text": "こんなヒリヒリした試合は嫌!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1161,
        "sourceStartMs": 10472044,
        "sourceEndMs": 10472124,
        "text": "やだー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1162,
        "sourceStartMs": 10472124,
        "sourceEndMs": 10472284,
        "text": "やだやだやだ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1163,
        "sourceStartMs": 10472284,
        "sourceEndMs": 10472384,
        "text": "やだよー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1164,
        "sourceStartMs": 10472384,
        "sourceEndMs": 10472564,
        "text": "あーナイス!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1165,
        "sourceStartMs": 10472564,
        "sourceEndMs": 10472744,
        "text": "ナイス天野くん!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1166,
        "sourceStartMs": 10472744,
        "sourceEndMs": 10472864,
        "text": "あーナイス!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1167,
        "sourceStartMs": 10472864,
        "sourceEndMs": 10473024,
        "text": "ナイス天野くん!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1168,
        "sourceStartMs": 10473024,
        "sourceEndMs": 10473144,
        "text": "あーナイス!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1169,
        "sourceStartMs": 10473144,
        "sourceEndMs": 10473345,
        "text": "ナイス天野くん!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1170,
        "sourceStartMs": 10473345,
        "sourceEndMs": 10473505,
        "text": "あーナイス!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1171,
        "sourceStartMs": 10473505,
        "sourceEndMs": 10473705,
        "text": "ナイス天野くん!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1172,
        "sourceStartMs": 10473705,
        "sourceEndMs": 10476947,
        "text": "あーナイス!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1173,
        "sourceStartMs": 10476947,
        "sourceEndMs": 10489578,
        "text": "ナイス天野くん!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1174,
        "sourceStartMs": 10489578,
        "sourceEndMs": 10490518,
        "text": "あーナイス!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1175,
        "sourceStartMs": 10490518,
        "sourceEndMs": 10490759,
        "text": "ナイス天野くん!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1176,
        "sourceStartMs": 10490759,
        "sourceEndMs": 10490919,
        "text": "あーナイス!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1177,
        "sourceStartMs": 10490919,
        "sourceEndMs": 10491099,
        "text": "ナイス天野くん!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1178,
        "sourceStartMs": 10491099,
        "sourceEndMs": 10491219,
        "text": "あーナイス!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1179,
        "sourceStartMs": 10491219,
        "sourceEndMs": 10492820,
        "text": "ナイス天野くん!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1180,
        "sourceStartMs": 10492820,
        "sourceEndMs": 10495322,
        "text": "あーナイス!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1181,
        "sourceStartMs": 10495322,
        "sourceEndMs": 10495763,
        "text": "ナイス天野くん!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1182,
        "sourceStartMs": 10495763,
        "sourceEndMs": 10495923,
        "text": "あーナイス!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1183,
        "sourceStartMs": 10495923,
        "sourceEndMs": 10496203,
        "text": "ナイス天野くん!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1184,
        "sourceStartMs": 10496203,
        "sourceEndMs": 10496423,
        "text": "あーナイス!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1185,
        "sourceStartMs": 10496423,
        "sourceEndMs": 10498605,
        "text": "ナイス天野くん!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1186,
        "sourceStartMs": 10498605,
        "sourceEndMs": 10498865,
        "text": "あーナイス!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1187,
        "sourceStartMs": 10498865,
        "sourceEndMs": 10499225,
        "text": "ナイス天野くん!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1188,
        "sourceStartMs": 10499225,
        "sourceEndMs": 10499366,
        "text": "あーナ",
        "isThemeCandidate": false
      },
      {
        "speechId": 1189,
        "sourceStartMs": 10503922,
        "sourceEndMs": 10529860,
        "text": "肩DのクイックCそして内は投類C総力Cさすがに投類かさすがに投類なのかここはやるべきだよね投類しないとクイックCはちょっといいけど危ない",
        "isThemeCandidate": false
      },
      {
        "speechId": 1190,
        "sourceStartMs": 10532138,
        "sourceEndMs": 10547007,
        "text": "CCだとキツイかうーん微妙かーリスクリスクは怖いよねー同類版とスクイーズできたら熱い?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1191,
        "sourceStartMs": 10547007,
        "sourceEndMs": 10558394,
        "text": "失敗したらヤバいよなーうん失敗したらヤバい",
        "isThemeCandidate": false
      },
      {
        "speechId": 1192,
        "sourceStartMs": 10564926,
        "sourceEndMs": 10567828,
        "text": "リターンの方がでかい?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1193,
        "sourceStartMs": 10567828,
        "sourceEndMs": 10568568,
        "text": "リスク!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1194,
        "sourceStartMs": 10568568,
        "sourceEndMs": 10569348,
        "text": "リターン!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1195,
        "sourceStartMs": 10569348,
        "sourceEndMs": 10570089,
        "text": "リスク!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1196,
        "sourceStartMs": 10570089,
        "sourceEndMs": 10572750,
        "text": "リターン!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1197,
        "sourceStartMs": 10572750,
        "sourceEndMs": 10587579,
        "text": "アヴァの普通に撃ってくれるなら普通に転がしたらで、これでゲッツーだったらどうしようトールイできたらほぼ勝ち?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1198,
        "sourceStartMs": 10587579,
        "sourceEndMs": 10589220,
        "text": "待って、こいつってさ早い?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1199,
        "sourceStartMs": 10589220,
        "sourceEndMs": 10589560,
        "text": "142キロ",
        "isThemeCandidate": false
      },
      {
        "speechId": 1200,
        "sourceStartMs": 10590002,
        "sourceEndMs": 10605131,
        "text": "142キルかーキチいか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1201,
        "sourceStartMs": 10605131,
        "sourceEndMs": 10605491,
        "text": "キチいか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1202,
        "sourceStartMs": 10605491,
        "sourceEndMs": 10606131,
        "text": "リスクを犯さないと勝てない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1203,
        "sourceStartMs": 10606131,
        "sourceEndMs": 10618318,
        "text": "送りバント?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1204,
        "sourceStartMs": 10628796,
        "sourceEndMs": 10629597,
        "text": "ああああああ",
        "isThemeCandidate": false
      },
      {
        "speechId": 1205,
        "sourceStartMs": 10680294,
        "sourceEndMs": 10687940,
        "text": "しかもセーフだー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1206,
        "sourceStartMs": 10721215,
        "sourceEndMs": 10725236,
        "text": "スクイーズ2なんですけどスクイーズ2なんですけど君たちこれ何?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1207,
        "sourceStartMs": 10725236,
        "sourceEndMs": 10733158,
        "text": "スクイーズ2ですけどデンデー?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1208,
        "sourceStartMs": 10733158,
        "sourceEndMs": 10736439,
        "text": "デンデー?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1209,
        "sourceStartMs": 10736439,
        "sourceEndMs": 10738500,
        "text": "デンデー何入れる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1210,
        "sourceStartMs": 10738500,
        "sourceEndMs": 10739420,
        "text": "チョコ先生はですね",
        "isThemeCandidate": false
      },
      {
        "speechId": 1211,
        "sourceStartMs": 10740342,
        "sourceEndMs": 10742803,
        "text": "ミートのやつないミートのやつない",
        "isThemeCandidate": false
      },
      {
        "speechId": 1212,
        "sourceStartMs": 10770830,
        "sourceEndMs": 10772451,
        "text": "大激流かな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1213,
        "sourceStartMs": 10772451,
        "sourceEndMs": 10773532,
        "text": "オッケー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1214,
        "sourceStartMs": 10773532,
        "sourceEndMs": 10775733,
        "text": "行け大山!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1215,
        "sourceStartMs": 10775733,
        "sourceEndMs": 10776694,
        "text": "あー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1216,
        "sourceStartMs": 10776694,
        "sourceEndMs": 10777895,
        "text": "トール行こう?",
        "isThemeCandidate": true
      },
      {
        "speechId": 1217,
        "sourceStartMs": 10777895,
        "sourceEndMs": 10778155,
        "text": "え?",
        "isThemeCandidate": true
      },
      {
        "speechId": 1218,
        "sourceStartMs": 10778155,
        "sourceEndMs": 10778996,
        "text": "した方がいい?",
        "isThemeCandidate": true
      },
      {
        "speechId": 1219,
        "sourceStartMs": 10778996,
        "sourceEndMs": 10780036,
        "text": "しなくていいか?",
        "isThemeCandidate": true
      },
      {
        "speechId": 1220,
        "sourceStartMs": 10780036,
        "sourceEndMs": 10781037,
        "text": "しなくていいか?",
        "isThemeCandidate": true
      },
      {
        "speechId": 1221,
        "sourceStartMs": 10781037,
        "sourceEndMs": 10782718,
        "text": "トールは私にはしなくていいか?",
        "isThemeCandidate": true
      },
      {
        "speechId": 1222,
        "sourceStartMs": 10782718,
        "sourceEndMs": 10783499,
        "text": "な、なにしたらいい?",
        "isThemeCandidate": true
      },
      {
        "speechId": 1223,
        "sourceStartMs": 10783499,
        "sourceEndMs": 10784119,
        "text": "なにしたらどうする?",
        "isThemeCandidate": true
      },
      {
        "speechId": 1224,
        "sourceStartMs": 10784119,
        "sourceEndMs": 10784319,
        "text": "なに?",
        "isThemeCandidate": true
      },
      {
        "speechId": 1225,
        "sourceStartMs": 10784319,
        "sourceEndMs": 10785440,
        "text": "なに?",
        "isThemeCandidate": true
      },
      {
        "speechId": 1226,
        "sourceStartMs": 10785440,
        "sourceEndMs": 10785800,
        "text": "なにする?",
        "isThemeCandidate": true
      },
      {
        "speechId": 1227,
        "sourceStartMs": 10785800,
        "sourceEndMs": 10786161,
        "text": "どうする?",
        "isThemeCandidate": true
      },
      {
        "speechId": 1228,
        "sourceStartMs": 10786161,
        "sourceEndMs": 10786521,
        "text": "なにする?",
        "isThemeCandidate": true
      },
      {
        "speechId": 1229,
        "sourceStartMs": 10786521,
        "sourceEndMs": 10790744,
        "text": "どうする?",
        "isThemeCandidate": true
      },
      {
        "speechId": 1230,
        "sourceStartMs": 10790744,
        "sourceEndMs": 10792705,
        "text": "うん、トールする?",
        "isThemeCandidate": true
      },
      {
        "speechId": 1231,
        "sourceStartMs": 10792705,
        "sourceEndMs": 10793866,
        "text": "トールしとく?",
        "isThemeCandidate": true
      },
      {
        "speechId": 1232,
        "sourceStartMs": 10793866,
        "sourceEndMs": 10795707,
        "text": "オッケー!",
        "isThemeCandidate": true
      },
      {
        "speechId": 1233,
        "sourceStartMs": 10795707,
        "sourceEndMs": 10798589,
        "text": "あー!",
        "isThemeCandidate": true
      },
      {
        "speechId": 1234,
        "sourceStartMs": 10798589,
        "sourceEndMs": 10799430,
        "text": "ミートB、トールE",
        "isThemeCandidate": true
      },
      {
        "speechId": 1235,
        "sourceStartMs": 10800122,
        "sourceEndMs": 10815651,
        "text": "ミートじゃない走力BBトールEEなんだけどこれ大丈夫ぞBなんだけどBDDEトールEなんだけどやれないか?",
        "isThemeCandidate": true
      },
      {
        "speechId": 1236,
        "sourceStartMs": 10815651,
        "sourceEndMs": 10817172,
        "text": "やめとくか?",
        "isThemeCandidate": true
      },
      {
        "speechId": 1237,
        "sourceStartMs": 10817172,
        "sourceEndMs": 10818173,
        "text": "犠牲フライか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1238,
        "sourceStartMs": 10818173,
        "sourceEndMs": 10827438,
        "text": "これパワーBミートD犠牲フライかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1239,
        "sourceStartMs": 10827438,
        "sourceEndMs": 10827559,
        "text": "これ",
        "isThemeCandidate": false
      },
      {
        "speechId": 1240,
        "sourceStartMs": 10837818,
        "sourceEndMs": 10840760,
        "text": "犠牲?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1241,
        "sourceStartMs": 10840760,
        "sourceEndMs": 10845703,
        "text": "犠牲?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1242,
        "sourceStartMs": 10845703,
        "sourceEndMs": 10847144,
        "text": "え?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1243,
        "sourceStartMs": 10847144,
        "sourceEndMs": 10848424,
        "text": "怖い?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1244,
        "sourceStartMs": 10848424,
        "sourceEndMs": 10854928,
        "text": "スクイズ2も怖いだろうがスクイズ2だって怖いだろ怖くねーの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1245,
        "sourceStartMs": 10854928,
        "sourceEndMs": 10855268,
        "text": "え?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1246,
        "sourceStartMs": 10855268,
        "sourceEndMs": 10856869,
        "text": "怖くねーのこれ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1247,
        "sourceStartMs": 10856869,
        "sourceEndMs": 10857950,
        "text": "2怖くねーの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1248,
        "sourceStartMs": 10874134,
        "sourceEndMs": 10881004,
        "text": "クイズでバント職人だからいける?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1249,
        "sourceStartMs": 10881004,
        "sourceEndMs": 10882366,
        "text": "バント職人に賭けろ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1250,
        "sourceStartMs": 10891770,
        "sourceEndMs": 10899476,
        "text": "分かったバント職人に!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1251,
        "sourceStartMs": 10899476,
        "sourceEndMs": 10901057,
        "text": "2はダメ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1252,
        "sourceStartMs": 10901057,
        "sourceEndMs": 10917950,
        "text": "分かんない…分かんないっぴ…分かんないっぴ!",
        "isThemeCandidate": false
      },
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
