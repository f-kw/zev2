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
  "evaluationInputId": "o8rZAhARXAc-theme-candidate-044",
  "sourceVideoId": "o8rZAhARXAc",
  "selectedTheme": {
    "id": "input-selection-v004-candidate-044",
    "title": "ピンチで同点に追いつかれ、ピッチャー交代と代打の決断を迫られるマリン",
    "summary": "同点に追いつかれた緊迫した状況の中、限界を迎えたフブキの投手交代と代打にビブーを起用する作戦を慌てながら組み立てる一連の思考が描かれているため。",
    "candidateSpeechIds": [
      1003,
      1004,
      1005,
      1006,
      1007,
      1008,
      1009,
      1010,
      1011,
      1012
    ],
    "whyItCanBeClipped": "同点に追いつかれた緊迫した状況の中、限界を迎えたフブキの投手交代と代打にビブーを起用する作戦を慌てながら組み立てる一連の思考が描かれているため。",
    "compositionNote": "提示された候補発話範囲の中から、テーマが単独で成立する最小区間を選ぶ。"
  },
  "transcript": {
    "language": "ja-JP",
    "durationSec": 11898.441,
    "speechUnitGroups": [
      [
        860,
        861,
        862,
        863,
        864,
        865,
        866,
        867,
        868,
        869,
        870,
        871,
        872,
        873,
        874,
        875,
        876,
        877,
        878,
        879,
        880,
        881,
        882,
        883,
        884,
        885,
        886,
        887,
        888,
        889,
        890,
        891,
        892,
        893,
        894,
        895,
        896,
        897,
        898,
        899,
        900,
        901,
        902,
        903,
        904,
        905,
        906,
        907,
        908,
        909,
        910,
        911,
        912,
        913,
        914,
        915,
        916,
        917,
        918,
        919,
        920,
        921,
        922,
        923,
        924,
        925,
        926,
        927,
        928,
        929,
        930,
        931,
        932,
        933,
        934,
        935,
        936,
        937,
        938,
        939,
        940,
        941,
        942,
        943,
        944,
        945,
        946,
        947,
        948,
        949,
        950,
        951,
        952,
        953,
        954,
        955,
        956,
        957,
        958,
        959,
        960,
        961,
        962,
        963,
        964,
        965,
        966,
        967,
        968,
        969,
        970,
        971,
        972,
        973,
        974,
        975,
        976,
        977,
        978,
        979,
        980,
        981,
        982,
        983,
        984,
        985,
        986,
        987,
        988,
        989,
        990,
        991,
        992,
        993,
        994,
        995,
        996,
        997,
        998,
        999,
        1000,
        1001,
        1002,
        1003,
        1004,
        1005,
        1006,
        1007,
        1008,
        1009,
        1010,
        1011,
        1012,
        1013,
        1014,
        1015,
        1016,
        1017,
        1018,
        1019,
        1020,
        1021,
        1022,
        1023,
        1024,
        1025,
        1026,
        1027,
        1028,
        1029,
        1030,
        1031,
        1032,
        1033,
        1034,
        1035,
        1036,
        1037,
        1038,
        1039,
        1040,
        1041,
        1042,
        1043,
        1044,
        1045,
        1046,
        1047,
        1048,
        1049,
        1050,
        1051,
        1052,
        1053,
        1054,
        1055,
        1056,
        1057,
        1058,
        1059,
        1060,
        1061,
        1062,
        1063,
        1064,
        1065,
        1066,
        1067,
        1068,
        1069,
        1070,
        1071,
        1072
      ]
    ],
    "segments": [
      {
        "speechId": 860,
        "sourceStartMs": 8000761,
        "sourceEndMs": 8007786,
        "text": "本田くんファイトは切るか意味ないか意味ないけど切るかファイトは",
        "isThemeCandidate": false
      },
      {
        "speechId": 861,
        "sourceStartMs": 8016753,
        "sourceEndMs": 8021035,
        "text": "絶対アウトにならん、余裕?",
        "isThemeCandidate": false
      },
      {
        "speechId": 862,
        "sourceStartMs": 8021035,
        "sourceEndMs": 8025338,
        "text": "絶対アウトに…ならん?",
        "isThemeCandidate": false
      },
      {
        "speechId": 863,
        "sourceStartMs": 8025338,
        "sourceEndMs": 8027279,
        "text": "ま?",
        "isThemeCandidate": false
      },
      {
        "speechId": 864,
        "sourceStartMs": 8027279,
        "sourceEndMs": 8028960,
        "text": "いける?",
        "isThemeCandidate": false
      },
      {
        "speechId": 865,
        "sourceStartMs": 8028960,
        "sourceEndMs": 8029040,
        "text": "ん?",
        "isThemeCandidate": false
      },
      {
        "speechId": 866,
        "sourceStartMs": 8029040,
        "sourceEndMs": 8039306,
        "text": "待って、切るな切っていい、切るな、あーあじゃあ延長4とっとく、OKOKとっとくわじゃあ、トルイして…するか、うん",
        "isThemeCandidate": false
      },
      {
        "speechId": 867,
        "sourceStartMs": 8040282,
        "sourceEndMs": 8050669,
        "text": "行こうちょ、見えねえあ、うるせえうるせえうるせえうおー転がせですか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 868,
        "sourceStartMs": 8050669,
        "sourceEndMs": 8065038,
        "text": "これってやっぱり転がせなんですかね5だしここ転がせですかね結局やっぱりんーですか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 869,
        "sourceStartMs": 8065038,
        "sourceEndMs": 8065518,
        "text": "伝令?",
        "isThemeCandidate": false
      },
      {
        "speechId": 870,
        "sourceStartMs": 8071694,
        "sourceEndMs": 8073755,
        "text": "何デンレイだこれ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 871,
        "sourceStartMs": 8073755,
        "sourceEndMs": 8077096,
        "text": "打撃力か?",
        "isThemeCandidate": false
      },
      {
        "speechId": 872,
        "sourceStartMs": 8077096,
        "sourceEndMs": 8078537,
        "text": "パワー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 873,
        "sourceStartMs": 8078537,
        "sourceEndMs": 8094004,
        "text": "パワーか調子…しかないけどパワー?",
        "isThemeCandidate": false
      },
      {
        "speechId": 874,
        "sourceStartMs": 8094004,
        "sourceEndMs": 8098966,
        "text": "5あるならデンレイいらんまぁ民意としてパワーDだしな",
        "isThemeCandidate": false
      },
      {
        "speechId": 875,
        "sourceStartMs": 8100418,
        "sourceEndMs": 8106302,
        "text": "調子もいいしなぁまあいいか!",
        "isThemeCandidate": false
      },
      {
        "speechId": 876,
        "sourceStartMs": 8106302,
        "sourceEndMs": 8108224,
        "text": "転がせるやろ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 877,
        "sourceStartMs": 8108224,
        "sourceEndMs": 8130000,
        "text": "天野いけるいけるやれるやれる打てる打てるいけるいけるやれるやれる取れる取れるいけるいけるやれるやれるあ、諏訪諏訪ダメだ諏訪ダメ諏訪は使っちゃダメ諏訪は使っちゃダメ諏訪は使っちゃダメパウルかうぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉぉ",
        "isThemeCandidate": false
      },
      {
        "speechId": 878,
        "sourceStartMs": 8139730,
        "sourceEndMs": 8149955,
        "text": "これセンター返しがさすがにすごいお前僕やるお前いつも僕やれますって言ってんなお前いつもやれますだなお前なんでいつもお前やれる感じ出してくんの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 879,
        "sourceStartMs": 8149955,
        "sourceEndMs": 8156038,
        "text": "おべひトーコン注入?",
        "isThemeCandidate": false
      },
      {
        "speechId": 880,
        "sourceStartMs": 8156038,
        "sourceEndMs": 8157359,
        "text": "OK!",
        "isThemeCandidate": false
      },
      {
        "speechId": 881,
        "sourceStartMs": 8157359,
        "sourceEndMs": 8158119,
        "text": "トーコン注入!",
        "isThemeCandidate": false
      },
      {
        "speechId": 882,
        "sourceStartMs": 8158119,
        "sourceEndMs": 8159380,
        "text": "なに!",
        "isThemeCandidate": false
      },
      {
        "speechId": 883,
        "sourceStartMs": 8159380,
        "sourceEndMs": 8159400,
        "text": "?",
        "isThemeCandidate": false
      },
      {
        "speechId": 884,
        "sourceStartMs": 8159380,
        "sourceEndMs": 8159400,
        "text": "?",
        "isThemeCandidate": false
      },
      {
        "speechId": 885,
        "sourceStartMs": 8160222,
        "sourceEndMs": 8175715,
        "text": "左もセンター返しキャージこれバーミアンなのかなキャージバーミアンなのかなこれバーミアンねえミートは?",
        "isThemeCandidate": false
      },
      {
        "speechId": 886,
        "sourceStartMs": 8175715,
        "sourceEndMs": 8177637,
        "text": "ミートは?",
        "isThemeCandidate": false
      },
      {
        "speechId": 887,
        "sourceStartMs": 8177637,
        "sourceEndMs": 8178378,
        "text": "多用のがいいかな",
        "isThemeCandidate": false
      },
      {
        "speechId": 888,
        "sourceStartMs": 8192339,
        "sourceEndMs": 8193300,
        "text": "アベレージヒッターですよお任せでいいんですか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 889,
        "sourceStartMs": 8193300,
        "sourceEndMs": 8218519,
        "text": "はいはいはいはいあ、お、おーはいはいそうですかそうですかそうですか今プルヒになった?",
        "isThemeCandidate": false
      },
      {
        "speechId": 890,
        "sourceStartMs": 8218519,
        "sourceEndMs": 8219780,
        "text": "プルヒッターもついてました",
        "isThemeCandidate": false
      },
      {
        "speechId": 891,
        "sourceStartMs": 8226920,
        "sourceEndMs": 8231004,
        "text": "ほなどっちですか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 892,
        "sourceStartMs": 8231004,
        "sourceEndMs": 8237910,
        "text": "ミート対応でも強振してくれるセンター返し行きます!",
        "isThemeCandidate": false
      },
      {
        "speechId": 893,
        "sourceStartMs": 8237910,
        "sourceEndMs": 8240673,
        "text": "自分センター返し行かしてもらいます!",
        "isThemeCandidate": false
      },
      {
        "speechId": 894,
        "sourceStartMs": 8240673,
        "sourceEndMs": 8243275,
        "text": "期待してません決して!",
        "isThemeCandidate": false
      },
      {
        "speechId": 895,
        "sourceStartMs": 8243275,
        "sourceEndMs": 8244817,
        "text": "引っ張るのがいいんすか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 896,
        "sourceStartMs": 8244817,
        "sourceEndMs": 8245998,
        "text": "でもナナがセンター返しか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 897,
        "sourceStartMs": 8250754,
        "sourceEndMs": 8254357,
        "text": "7だし引っ張り?",
        "isThemeCandidate": false
      },
      {
        "speechId": 898,
        "sourceStartMs": 8254357,
        "sourceEndMs": 8261603,
        "text": "6引っ張りですか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 899,
        "sourceStartMs": 8261603,
        "sourceEndMs": 8263465,
        "text": "センター?",
        "isThemeCandidate": false
      },
      {
        "speechId": 900,
        "sourceStartMs": 8263465,
        "sourceEndMs": 8274975,
        "text": "プロだから引っ張り?",
        "isThemeCandidate": false
      },
      {
        "speechId": 901,
        "sourceStartMs": 8274975,
        "sourceEndMs": 8275275,
        "text": "風?",
        "isThemeCandidate": false
      },
      {
        "speechId": 902,
        "sourceStartMs": 8275275,
        "sourceEndMs": 8276596,
        "text": "風?",
        "isThemeCandidate": false
      },
      {
        "speechId": 903,
        "sourceStartMs": 8276596,
        "sourceEndMs": 8276656,
        "text": "風?",
        "isThemeCandidate": false
      },
      {
        "speechId": 904,
        "sourceStartMs": 8276656,
        "sourceEndMs": 8278277,
        "text": "風ね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 905,
        "sourceStartMs": 8278277,
        "sourceEndMs": 8279058,
        "text": "引っ張り方向が風が来てる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 906,
        "sourceStartMs": 8280670,
        "sourceEndMs": 8281050,
        "text": "引っ張りの風が来てる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 907,
        "sourceStartMs": 8281050,
        "sourceEndMs": 8281210,
        "text": "分かった!",
        "isThemeCandidate": false
      },
      {
        "speechId": 908,
        "sourceStartMs": 8281210,
        "sourceEndMs": 8284891,
        "text": "引っ張りの風が来てるから!",
        "isThemeCandidate": false
      },
      {
        "speechId": 909,
        "sourceStartMs": 8284891,
        "sourceEndMs": 8285372,
        "text": "引っ張りまーす!",
        "isThemeCandidate": false
      },
      {
        "speechId": 910,
        "sourceStartMs": 8285372,
        "sourceEndMs": 8286532,
        "text": "いけるかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 911,
        "sourceStartMs": 8286532,
        "sourceEndMs": 8286972,
        "text": "えいっ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 912,
        "sourceStartMs": 8286972,
        "sourceEndMs": 8298036,
        "text": "あっ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 913,
        "sourceStartMs": 8298036,
        "sourceEndMs": 8298256,
        "text": "あっ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 914,
        "sourceStartMs": 8298256,
        "sourceEndMs": 8304178,
        "text": "あっ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 915,
        "sourceStartMs": 8304178,
        "sourceEndMs": 8304238,
        "text": "あっ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 916,
        "sourceStartMs": 8304238,
        "sourceEndMs": 8304298,
        "text": "ツバ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 917,
        "sourceStartMs": 8304298,
        "sourceEndMs": 8304358,
        "text": "ツバ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 918,
        "sourceStartMs": 8304358,
        "sourceEndMs": 8304438,
        "text": "あっ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 919,
        "sourceStartMs": 8304438,
        "sourceEndMs": 8304538,
        "text": "入っ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 920,
        "sourceStartMs": 8304538,
        "sourceEndMs": 8304818,
        "text": "入っちゃう!",
        "isThemeCandidate": false
      },
      {
        "speechId": 921,
        "sourceStartMs": 8304818,
        "sourceEndMs": 8305218,
        "text": "入らないかーい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 922,
        "sourceStartMs": 8305218,
        "sourceEndMs": 8305378,
        "text": "入らないかーい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 923,
        "sourceStartMs": 8305378,
        "sourceEndMs": 8305478,
        "text": "まいっか!",
        "isThemeCandidate": false
      },
      {
        "speechId": 924,
        "sourceStartMs": 8305478,
        "sourceEndMs": 8305599,
        "text": "ナーイスー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 925,
        "sourceStartMs": 8305599,
        "sourceEndMs": 8309980,
        "text": "ツバはいつもマリンをドキドキさせてくれるツバお前はいつもマリン",
        "isThemeCandidate": false
      },
      {
        "speechId": 926,
        "sourceStartMs": 8310178,
        "sourceEndMs": 8322483,
        "text": "ドキドキさせてくれるなぁまぁ転がせかなぁ4うん転がせーですかねキャンチどう思う?",
        "isThemeCandidate": false
      },
      {
        "speechId": 927,
        "sourceStartMs": 8322483,
        "sourceEndMs": 8328165,
        "text": "普通に転がせでいいかなこれうん転よん?",
        "isThemeCandidate": false
      },
      {
        "speechId": 928,
        "sourceStartMs": 8328165,
        "sourceEndMs": 8333147,
        "text": "んーオッケオッケオッケこれねめっちゃ撃ってるほんとだ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 929,
        "sourceStartMs": 8333147,
        "sourceEndMs": 8336089,
        "text": "めっちゃ撃ってる撃ってくれるさ",
        "isThemeCandidate": false
      },
      {
        "speechId": 930,
        "sourceStartMs": 8349633,
        "sourceEndMs": 8366479,
        "text": "投げた2球目ストレイク打てるかな投球は3球目投げた見送ってゴール風向き難しいね第4球を投げたえー何それ難しいの投げてきた6対4パイレーツ再び逆転これはさすがに今チェンジアップ上手なチェンジアップだった今デッドボール釣った7番",
        "isThemeCandidate": false
      },
      {
        "speechId": 931,
        "sourceStartMs": 8372067,
        "sourceEndMs": 8399920,
        "text": "デッドゴールマジかてか結構スタミナ削れてるんだけどさすがにクセモノか一旦クセモノだよねクセモノからの次回守備伝令いつもの感じで次回守備伝令投手伝令",
        "isThemeCandidate": false
      },
      {
        "speechId": 932,
        "sourceStartMs": 8407783,
        "sourceEndMs": 8429980,
        "text": "下でもう入れた入れ終わってるもうあと2回だから9回は守備伝令投手能力伝令でここはクセモノでなんとかするかうーん今守備伝令の方が",
        "isThemeCandidate": false
      },
      {
        "speechId": 933,
        "sourceStartMs": 8430338,
        "sourceEndMs": 8459198,
        "text": "今守備伝令…にすると諏訪を下げなきゃいけなくなっちゃうんだよ…うん…下位打線だし、なんとかしよう、ここはうん下位打線でも強ぇなまぁ外角かなぁ…外角かなぁ、一旦…",
        "isThemeCandidate": false
      },
      {
        "speechId": 934,
        "sourceStartMs": 8460502,
        "sourceEndMs": 8475847,
        "text": "気合で抑えるかーうーん歌トレゲッツー?",
        "isThemeCandidate": false
      },
      {
        "speechId": 935,
        "sourceStartMs": 8475847,
        "sourceEndMs": 8482509,
        "text": "あー歌トレゲッツーまあ怖いなー下位打線ってほど弱くない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 936,
        "sourceStartMs": 8482509,
        "sourceEndMs": 8485169,
        "text": "下位打線なのにうちの上位打線くらい強いんだけどなにこれ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 937,
        "sourceStartMs": 8485169,
        "sourceEndMs": 8486630,
        "text": "うーん",
        "isThemeCandidate": false
      },
      {
        "speechId": 938,
        "sourceStartMs": 8490947,
        "sourceEndMs": 8496151,
        "text": "頑張って一旦外角で投げてみますかおお!",
        "isThemeCandidate": false
      },
      {
        "speechId": 939,
        "sourceStartMs": 8496151,
        "sourceEndMs": 8497012,
        "text": "おお!",
        "isThemeCandidate": false
      },
      {
        "speechId": 940,
        "sourceStartMs": 8497012,
        "sourceEndMs": 8500275,
        "text": "スーパーノヴァが撃たれた!",
        "isThemeCandidate": false
      },
      {
        "speechId": 941,
        "sourceStartMs": 8500275,
        "sourceEndMs": 8501016,
        "text": "スーパーノヴァが!",
        "isThemeCandidate": false
      },
      {
        "speechId": 942,
        "sourceStartMs": 8501016,
        "sourceEndMs": 8505720,
        "text": "スーパーノヴァが撃たれてる!",
        "isThemeCandidate": false
      },
      {
        "speechId": 943,
        "sourceStartMs": 8505720,
        "sourceEndMs": 8508963,
        "text": "なあセーフな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 944,
        "sourceStartMs": 8508963,
        "sourceEndMs": 8510244,
        "text": "今のセーフなの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 945,
        "sourceStartMs": 8510244,
        "sourceEndMs": 8511185,
        "text": "嘘だよね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 946,
        "sourceStartMs": 8511185,
        "sourceEndMs": 8515890,
        "text": "数字変わったしやばいね",
        "isThemeCandidate": false
      },
      {
        "speechId": 947,
        "sourceStartMs": 8523287,
        "sourceEndMs": 8544513,
        "text": "ひっ…低め…低めかなぁ…んー…ダメか、盗塁…低めですかねぇ…うわぁー!",
        "isThemeCandidate": false
      },
      {
        "speechId": 948,
        "sourceStartMs": 8544513,
        "sourceEndMs": 8547674,
        "text": "うぉー…やーばい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 949,
        "sourceStartMs": 8547674,
        "sourceEndMs": 8548974,
        "text": "まぁ外角行くしかないか…",
        "isThemeCandidate": false
      },
      {
        "speechId": 950,
        "sourceStartMs": 8553979,
        "sourceEndMs": 8574138,
        "text": "しーしーしーうわーやばいなこのままじゃ上位打線になっちゃうぞこれまずいかなーんー1点はしょうがないんー守備変えたほうがいいかなー",
        "isThemeCandidate": false
      },
      {
        "speechId": 951,
        "sourceStartMs": 8584162,
        "sourceEndMs": 8602660,
        "text": "中間守備とか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 952,
        "sourceStartMs": 8602660,
        "sourceEndMs": 8607965,
        "text": "120球だから後退しないとやばい後退しないとまずいかな",
        "isThemeCandidate": false
      },
      {
        "speechId": 953,
        "sourceStartMs": 8618311,
        "sourceEndMs": 8619372,
        "text": "んーまだ投げれるかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 954,
        "sourceStartMs": 8619372,
        "sourceEndMs": 8633357,
        "text": "交代したいとまずいのかなー?",
        "isThemeCandidate": false
      },
      {
        "speechId": 955,
        "sourceStartMs": 8633357,
        "sourceEndMs": 8638459,
        "text": "しゅ、守備伝令今?",
        "isThemeCandidate": false
      },
      {
        "speechId": 956,
        "sourceStartMs": 8638459,
        "sourceEndMs": 8639800,
        "text": "今守備伝令かー",
        "isThemeCandidate": false
      },
      {
        "speechId": 957,
        "sourceStartMs": 8642074,
        "sourceEndMs": 8669780,
        "text": "1個しかないんだよ守備伝令1年生あったっけなないな1個しかないんだよな守備伝令がスワを下げなきゃいけないし9階にも守備伝令が入れれなくなっちゃうしスワもいなくなっちゃうしここまでこの進んじゃっ",
        "isThemeCandidate": false
      },
      {
        "speechId": 958,
        "sourceStartMs": 8670162,
        "sourceEndMs": 8696329,
        "text": "今更入れるのもなぁそれなら最初から入れるべきだったよなぁあーどうしようなぁ次多分カエラに変えなきゃいけないからそれこそ守備伝令とか入れたいけどねコロネ守備伝令?",
        "isThemeCandidate": false
      },
      {
        "speechId": 959,
        "sourceStartMs": 8696329,
        "sourceEndMs": 8696549,
        "text": "マジか",
        "isThemeCandidate": false
      },
      {
        "speechId": 960,
        "sourceStartMs": 8705470,
        "sourceEndMs": 8705890,
        "text": "やんちゃ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 961,
        "sourceStartMs": 8705890,
        "sourceEndMs": 8706551,
        "text": "守備伝令ってやんちゃ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 962,
        "sourceStartMs": 8706551,
        "sourceEndMs": 8718659,
        "text": "熱血…な、何が守備伝令なの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 963,
        "sourceStartMs": 8718659,
        "sourceEndMs": 8719120,
        "text": "やんちゃ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 964,
        "sourceStartMs": 8719120,
        "sourceEndMs": 8726185,
        "text": "やんちゃと熱血?",
        "isThemeCandidate": false
      },
      {
        "speechId": 965,
        "sourceStartMs": 8726185,
        "sourceEndMs": 8727906,
        "text": "変えるならコロネを…",
        "isThemeCandidate": false
      },
      {
        "speechId": 966,
        "sourceStartMs": 8731450,
        "sourceEndMs": 8755158,
        "text": "ガイアのアオくんとか一応ガイアだったらアオくんもできるっちゃできるアオくんもガイアはまあできるコロネ下げてアオくんにするという説はあるけど走力が下がっちゃうし打撃力自体もちょっと下がるか",
        "isThemeCandidate": false
      },
      {
        "speechId": 967,
        "sourceStartMs": 8762954,
        "sourceEndMs": 8775725,
        "text": "うーん…コロネは撃ったばっかだから替え時?",
        "isThemeCandidate": false
      },
      {
        "speechId": 968,
        "sourceStartMs": 8775725,
        "sourceEndMs": 8786293,
        "text": "なるほどもう撃たないかならアリなのかコロネの打順が回ってこないならアリか",
        "isThemeCandidate": false
      },
      {
        "speechId": 969,
        "sourceStartMs": 8792282,
        "sourceEndMs": 8819246,
        "text": "OKじゃあアオくんに変えてで今守備伝令1個コロネから守備伝令入れてで次回は3年生のスワで守備伝令を入れるかなこれかなうんですか",
        "isThemeCandidate": false
      },
      {
        "speechId": 970,
        "sourceStartMs": 8820310,
        "sourceEndMs": 8845167,
        "text": "分かった変えよっかじゃあ右…どこ守らせ…左の方がいいかなアオくん場所どこがいいかなアオくんの守る場所右でいいんかな左?",
        "isThemeCandidate": false
      },
      {
        "speechId": 971,
        "sourceStartMs": 8845167,
        "sourceEndMs": 8849730,
        "text": "OK左なOK",
        "isThemeCandidate": false
      },
      {
        "speechId": 972,
        "sourceStartMs": 8860973,
        "sourceEndMs": 8878319,
        "text": "オッケーオッケーオッケーで、えーっとーこれでえーオッケーしてで、守備伝令が守備伝令を今入れてなんとかなれー",
        "isThemeCandidate": false
      },
      {
        "speechId": 973,
        "sourceStartMs": 8881967,
        "sourceEndMs": 8885609,
        "text": "守備全霊で!",
        "isThemeCandidate": false
      },
      {
        "speechId": 974,
        "sourceStartMs": 8885609,
        "sourceEndMs": 8886249,
        "text": "頼む!",
        "isThemeCandidate": false
      },
      {
        "speechId": 975,
        "sourceStartMs": 8886249,
        "sourceEndMs": 8887189,
        "text": "安堵はなってくれ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 976,
        "sourceStartMs": 8887189,
        "sourceEndMs": 8907979,
        "text": "でまぁ、外角にするか一旦うーんですね頑張ろう!",
        "isThemeCandidate": false
      },
      {
        "speechId": 977,
        "sourceStartMs": 8907979,
        "sourceEndMs": 8908479,
        "text": "頑張れ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 978,
        "sourceStartMs": 8908479,
        "sourceEndMs": 8908639,
        "text": "頑張れ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 979,
        "sourceStartMs": 8908639,
        "sourceEndMs": 8908759,
        "text": "おお!",
        "isThemeCandidate": false
      },
      {
        "speechId": 980,
        "sourceStartMs": 8908759,
        "sourceEndMs": 8908819,
        "text": "出た!",
        "isThemeCandidate": false
      },
      {
        "speechId": 981,
        "sourceStartMs": 8908819,
        "sourceEndMs": 8909280,
        "text": "スーパーノヴァ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 982,
        "sourceStartMs": 8909280,
        "sourceEndMs": 8909380,
        "text": "うわぁ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 983,
        "sourceStartMs": 8909380,
        "sourceEndMs": 8909500,
        "text": "すごい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 984,
        "sourceStartMs": 8909500,
        "sourceEndMs": 8909920,
        "text": "いい飛び方した!",
        "isThemeCandidate": false
      },
      {
        "speechId": 985,
        "sourceStartMs": 8911570,
        "sourceEndMs": 8934034,
        "text": "それは吉いいわそれは吉いい大打かよそれは吉いいわローボールヒッターインコースヒッターローボールヒッター低めとインコースだから内角が得意って話これ",
        "isThemeCandidate": false
      },
      {
        "speechId": 986,
        "sourceStartMs": 8946230,
        "sourceEndMs": 8951474,
        "text": "ゲッツーでゲッツー歌トレでゲッツー?",
        "isThemeCandidate": false
      },
      {
        "speechId": 987,
        "sourceStartMs": 8951474,
        "sourceEndMs": 8967826,
        "text": "歌トレゲッツーかゲッツーするかじゃあゲッツーシフトにして歌せてトレで行くか一旦それで行ってみよう",
        "isThemeCandidate": false
      },
      {
        "speechId": 988,
        "sourceStartMs": 8979233,
        "sourceEndMs": 8999860,
        "text": "これから2球目見送ってストライクこれで追い込みました第3球を投げた打ちましたどうだあーどうだアウトワンアウトかー月中ならず月中ならずあー打たせて取れる",
        "isThemeCandidate": false
      },
      {
        "speechId": 989,
        "sourceStartMs": 9002727,
        "sourceEndMs": 9024014,
        "text": "でも…守備伝令入れたし…浮かせて取れあるかワンチャン全身守備の歌トレ全身守備にして歌トレ",
        "isThemeCandidate": false
      },
      {
        "speechId": 990,
        "sourceStartMs": 9034515,
        "sourceEndMs": 9057006,
        "text": "なるほどなるほどはいはい全身やめて全身まずいかいっないか全身はない全身はないかまあ定位置かなじゃあ",
        "isThemeCandidate": false
      },
      {
        "speechId": 991,
        "sourceStartMs": 9060586,
        "sourceEndMs": 9083185,
        "text": "定位置でまぁ打たせて取れなのかなぁ6だしおぉー内閣も5だけど内閣も5だけどまぁ打たせて取れでいいのかなぁ6だしなぁんん",
        "isThemeCandidate": false
      },
      {
        "speechId": 992,
        "sourceStartMs": 9096594,
        "sourceEndMs": 9097594,
        "text": "内閣の方がいいのかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 993,
        "sourceStartMs": 9097594,
        "sourceEndMs": 9099755,
        "text": "歌取りやめたい?",
        "isThemeCandidate": false
      },
      {
        "speechId": 994,
        "sourceStartMs": 9099755,
        "sourceEndMs": 9100275,
        "text": "じゃあ内閣で行きますか!",
        "isThemeCandidate": false
      },
      {
        "speechId": 995,
        "sourceStartMs": 9100275,
        "sourceEndMs": 9100755,
        "text": "とりあえず…頑張れ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 996,
        "sourceStartMs": 9100755,
        "sourceEndMs": 9101075,
        "text": "ストライク!",
        "isThemeCandidate": false
      },
      {
        "speechId": 997,
        "sourceStartMs": 9101075,
        "sourceEndMs": 9112478,
        "text": "ストライク!",
        "isThemeCandidate": false
      },
      {
        "speechId": 998,
        "sourceStartMs": 9112478,
        "sourceEndMs": 9117159,
        "text": "ストライクだ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 999,
        "sourceStartMs": 9117159,
        "sourceEndMs": 9117659,
        "text": "行け!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1000,
        "sourceStartMs": 9117659,
        "sourceEndMs": 9118140,
        "text": "あ、打たれたけど…でも大丈夫か?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1001,
        "sourceStartMs": 9118140,
        "sourceEndMs": 9118480,
        "text": "これアウトか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1002,
        "sourceStartMs": 9118480,
        "sourceEndMs": 9119920,
        "text": "あーでもそっかー、1点取られて…",
        "isThemeCandidate": false
      },
      {
        "speechId": 1003,
        "sourceStartMs": 9126634,
        "sourceEndMs": 9146351,
        "text": "ミートビーパファイ低めしかないかなぁこれ低めしかないよねー低めしかないよねー同点同点なっちゃったねー低めしかないかここは他の数字的に",
        "isThemeCandidate": true
      },
      {
        "speechId": 1004,
        "sourceStartMs": 9150322,
        "sourceEndMs": 9152184,
        "text": "お、スーパーノヴァが撃たれた!",
        "isThemeCandidate": true
      },
      {
        "speechId": 1005,
        "sourceStartMs": 9152184,
        "sourceEndMs": 9152524,
        "text": "スーパーノヴァが撃たれたぞ!",
        "isThemeCandidate": true
      },
      {
        "speechId": 1006,
        "sourceStartMs": 9152524,
        "sourceEndMs": 9152604,
        "text": "ナイス!",
        "isThemeCandidate": true
      },
      {
        "speechId": 1007,
        "sourceStartMs": 9152604,
        "sourceEndMs": 9153025,
        "text": "青カインを救った!",
        "isThemeCandidate": true
      },
      {
        "speechId": 1008,
        "sourceStartMs": 9153025,
        "sourceEndMs": 9153125,
        "text": "ナイス!",
        "isThemeCandidate": true
      },
      {
        "speechId": 1009,
        "sourceStartMs": 9153125,
        "sourceEndMs": 9177566,
        "text": "さーて…ワンアウト連れ…うわー…引っ張り5かここまで2打席全力三振!",
        "isThemeCandidate": true
      },
      {
        "speechId": 1010,
        "sourceStartMs": 9186444,
        "sourceEndMs": 9187624,
        "text": "えぇー代打?",
        "isThemeCandidate": true
      },
      {
        "speechId": 1011,
        "sourceStartMs": 9187624,
        "sourceEndMs": 9206169,
        "text": "変えてーあ、ピッチャー変わってる、ほんとだ変わってるわクイックし、負けん代打出してーで、フブちゃんももう変えよう限界や、フブチやんはで、カエラに投げてもらううん",
        "isThemeCandidate": true
      },
      {
        "speechId": 1012,
        "sourceStartMs": 9213658,
        "sourceEndMs": 9239820,
        "text": "誰に打ってもらうかビブーかビブーかないっちゃん打ちそうなのは性能的にはビブーがいいかねうんうんうん負ける確かに変わっても負けない",
        "isThemeCandidate": true
      },
      {
        "speechId": 1013,
        "sourceStartMs": 9240530,
        "sourceEndMs": 9250933,
        "text": "変わっても勝ち運だからやばいコメントがんあ、ビブなんかスキルないの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1014,
        "sourceStartMs": 9250933,
        "sourceEndMs": 9252613,
        "text": "えっとねお祭りとかよさぶり誰かいるかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1015,
        "sourceStartMs": 9252613,
        "sourceEndMs": 9257315,
        "text": "ラッキーボーイしたたかクールかクールラッキーボーイ",
        "isThemeCandidate": false
      },
      {
        "speechId": 1016,
        "sourceStartMs": 9275040,
        "sourceEndMs": 9294026,
        "text": "来るーないかもーうーん打ち切りガチャないよ打ち切りガチャないよ1年生だよないあーじゃあまあビブー出すかな普通に",
        "isThemeCandidate": false
      },
      {
        "speechId": 1017,
        "sourceStartMs": 9303062,
        "sourceEndMs": 9329860,
        "text": "ビブーしかないかなお調子者もそうねいないから対エスマルチョコ先生がしたたかだけどビブーかな",
        "isThemeCandidate": false
      },
      {
        "speechId": 1018,
        "sourceStartMs": 9330210,
        "sourceEndMs": 9359346,
        "text": "出してチョコ先生も1年生ですねキャッチャーそうだねチョコ先生はキャッチャーだねOKじゃあビブ出すかせやなうんせやなビッチュー",
        "isThemeCandidate": false
      },
      {
        "speechId": 1019,
        "sourceStartMs": 9374114,
        "sourceEndMs": 9385298,
        "text": "うーん数字が転がせ3でいいのかな転3なのか伝令確かに伝令入れるかあと2回",
        "isThemeCandidate": false
      },
      {
        "speechId": 1020,
        "sourceStartMs": 9392942,
        "sourceEndMs": 9419880,
        "text": "調子はいいからパワーばっかりやなパワーばっかり打撃力でいいかなここは大山ですかねチャンスで",
        "isThemeCandidate": false
      },
      {
        "speechId": 1021,
        "sourceStartMs": 9420360,
        "sourceEndMs": 9449101,
        "text": "確かにチャンスでもないしないいか転がして3で行くかチャンスでもないもんアウトも1個あるし今じゃないのかもしれん転がすか3だけどセンター返すのがいいかな",
        "isThemeCandidate": false
      },
      {
        "speechId": 1022,
        "sourceStartMs": 9454130,
        "sourceEndMs": 9473910,
        "text": "盗塁2でもいけんのかなぁいや無理やねん無理センター返しか転がせセンター返しか転がせ転がした方がいいかなぁセンター返し4だから4うんうん",
        "isThemeCandidate": false
      },
      {
        "speechId": 1023,
        "sourceStartMs": 9482230,
        "sourceEndMs": 9493714,
        "text": "転がせ3にするか転がします!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1024,
        "sourceStartMs": 9493714,
        "sourceEndMs": 9496975,
        "text": "おお!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1025,
        "sourceStartMs": 9496975,
        "sourceEndMs": 9499476,
        "text": "めっちゃ綺麗で転がるやん!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1026,
        "sourceStartMs": 9499476,
        "sourceEndMs": 9501977,
        "text": "馬!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1027,
        "sourceStartMs": 9501977,
        "sourceEndMs": 9505598,
        "text": "突然の代打で馬!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1028,
        "sourceStartMs": 9505598,
        "sourceEndMs": 9509900,
        "text": "急に、急にチャンスになってきたやば、どうしよう急にチャンスになってきた",
        "isThemeCandidate": false
      },
      {
        "speechId": 1029,
        "sourceStartMs": 9511438,
        "sourceEndMs": 9516319,
        "text": "流し打ちが5突然のチャンス?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1030,
        "sourceStartMs": 9516319,
        "sourceEndMs": 9538626,
        "text": "どうしようなこのチャンスをどうするべきかんー…ファーストエラーお祈り流し?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1031,
        "sourceStartMs": 9538626,
        "sourceEndMs": 9539326,
        "text": "伝令?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1032,
        "sourceStartMs": 9539326,
        "sourceEndMs": 9539826,
        "text": "今か?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1033,
        "sourceStartMs": 9542950,
        "sourceEndMs": 9549296,
        "text": "5あるし次なんじゃね?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1034,
        "sourceStartMs": 9549296,
        "sourceEndMs": 9550117,
        "text": "今なの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1035,
        "sourceStartMs": 9550117,
        "sourceEndMs": 9567873,
        "text": "伝令すごく盛り上げてチャンスをあげる?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1036,
        "sourceStartMs": 9567873,
        "sourceEndMs": 9568354,
        "text": "なんだろう?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1037,
        "sourceStartMs": 9571618,
        "sourceEndMs": 9572318,
        "text": "な、なに?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1038,
        "sourceStartMs": 9572318,
        "sourceEndMs": 9573619,
        "text": "パワーしかないか。",
        "isThemeCandidate": false
      },
      {
        "speechId": 1039,
        "sourceStartMs": 9573619,
        "sourceEndMs": 9575561,
        "text": "パワーしかないかも。",
        "isThemeCandidate": false
      },
      {
        "speechId": 1040,
        "sourceStartMs": 9575561,
        "sourceEndMs": 9577242,
        "text": "パワーデンレイしかないかも。",
        "isThemeCandidate": false
      },
      {
        "speechId": 1041,
        "sourceStartMs": 9577242,
        "sourceEndMs": 9582985,
        "text": "これ。",
        "isThemeCandidate": false
      },
      {
        "speechId": 1042,
        "sourceStartMs": 9582985,
        "sourceEndMs": 9585667,
        "text": "パワーデンレイしかないかも。",
        "isThemeCandidate": false
      },
      {
        "speechId": 1043,
        "sourceStartMs": 9585667,
        "sourceEndMs": 9592671,
        "text": "パワーでいいかな。",
        "isThemeCandidate": false
      },
      {
        "speechId": 1044,
        "sourceStartMs": 9592671,
        "sourceEndMs": 9596013,
        "text": "調子。",
        "isThemeCandidate": false
      },
      {
        "speechId": 1045,
        "sourceStartMs": 9596013,
        "sourceEndMs": 9596714,
        "text": "パワーでいいか。",
        "isThemeCandidate": false
      },
      {
        "speechId": 1046,
        "sourceStartMs": 9600418,
        "sourceEndMs": 9629820,
        "text": "古川確かにもう使わないか次守備伝令入れるから古川もう使わないのかじゃあ古川くん入れるか古川入れてミートにするかうん終わったあーどうしようなあんまり5ばっかりうーんえー",
        "isThemeCandidate": false
      },
      {
        "speechId": 1047,
        "sourceStartMs": 9632870,
        "sourceEndMs": 9637073,
        "text": "コロゴか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1048,
        "sourceStartMs": 9637073,
        "sourceEndMs": 9653943,
        "text": "アベレージヒッターついたコロゴかなぁんーあーな、流し野がアウトになっても親類しやすい?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1049,
        "sourceStartMs": 9653943,
        "sourceEndMs": 9657785,
        "text": "なるほど風もあるから?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1050,
        "sourceStartMs": 9657785,
        "sourceEndMs": 9658266,
        "text": "あーなるほど",
        "isThemeCandidate": false
      },
      {
        "speechId": 1051,
        "sourceStartMs": 9660654,
        "sourceEndMs": 9677799,
        "text": "確かにありかありかも流しかもしれんな風もあるなら風逆?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1052,
        "sourceStartMs": 9677799,
        "sourceEndMs": 9685602,
        "text": "逆か逆か逆かじゃあ転がせかな転がせ",
        "isThemeCandidate": false
      },
      {
        "speechId": 1053,
        "sourceStartMs": 9692930,
        "sourceEndMs": 9719880,
        "text": "ビブ確かにダイソーするかてかビブもう回してもいいな別に結局チョコ先生と古川とカエラさえ残ってればいいんだから回したっていいな別にこれもう回してもいいよね誰か総類得意な人",
        "isThemeCandidate": false
      },
      {
        "speechId": 1054,
        "sourceStartMs": 9722544,
        "sourceEndMs": 9734471,
        "text": "別に誰も得意じゃないな総力関係あるかな延長があるからなんだっての?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1055,
        "sourceStartMs": 9734471,
        "sourceEndMs": 9737072,
        "text": "延長があるから何?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1056,
        "sourceStartMs": 9737072,
        "sourceEndMs": 9738453,
        "text": "延長があるから何?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1057,
        "sourceStartMs": 9738453,
        "sourceEndMs": 9739754,
        "text": "だから何?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1058,
        "sourceStartMs": 9739754,
        "sourceEndMs": 9741335,
        "text": "なんで?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1059,
        "sourceStartMs": 9741335,
        "sourceEndMs": 9745998,
        "text": "どこを変えるかもしれなくてやめとけって言ってんの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1060,
        "sourceStartMs": 9745998,
        "sourceEndMs": 9749159,
        "text": "説明してもらっていい?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1061,
        "sourceStartMs": 9750246,
        "sourceEndMs": 9753287,
        "text": "これから保守に変えるから残すよ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1062,
        "sourceStartMs": 9753287,
        "sourceEndMs": 9765610,
        "text": "で、古川も使うかもしれないから残すカエラも使うかもしれないから残すそれ以外回すの何がまずいの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1063,
        "sourceStartMs": 9765610,
        "sourceEndMs": 9768871,
        "text": "ウルトがもったいない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1064,
        "sourceStartMs": 9768871,
        "sourceEndMs": 9777374,
        "text": "守備をいじるかもしれない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1065,
        "sourceStartMs": 9777374,
        "sourceEndMs": 9778174,
        "text": "使えるカード?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1066,
        "sourceStartMs": 9780194,
        "sourceEndMs": 9783255,
        "text": "ビブならさっき使ったんじゃねぇの?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1067,
        "sourceStartMs": 9783255,
        "sourceEndMs": 9787217,
        "text": "ビブの時にいないからビブ出したんじゃないのか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1068,
        "sourceStartMs": 9787217,
        "sourceEndMs": 9809326,
        "text": "変えていいだろ、もうこれ変えるかえーと、したらーえーっと、ウンナたーんが走力若干良いからーえーと、ウンナたんで着地してえー、チョコ先生と古川と",
        "isThemeCandidate": false
      },
      {
        "speechId": 1069,
        "sourceStartMs": 9810290,
        "sourceEndMs": 9813711,
        "text": "これらを残そうかな?",
        "isThemeCandidate": false
      },
      {
        "speechId": 1070,
        "sourceStartMs": 9813711,
        "sourceEndMs": 9816533,
        "text": "そうするか!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1071,
        "sourceStartMs": 9816533,
        "sourceEndMs": 9836901,
        "text": "OKそしたらーえーっと、一味から出しておこうそうだね、そうするか!",
        "isThemeCandidate": false
      },
      {
        "speechId": 1072,
        "sourceStartMs": 9836901,
        "sourceEndMs": 9838942,
        "text": "えー、しおりん",
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
