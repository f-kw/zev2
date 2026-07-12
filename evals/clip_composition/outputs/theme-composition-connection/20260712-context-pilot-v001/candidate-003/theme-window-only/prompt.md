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
  "evaluationInputId": "YE-faluP7zY-theme-candidate-003",
  "sourceVideoId": "YE-faluP7zY",
  "selectedTheme": {
    "id": "input-selection-v004-candidate-003",
    "title": "言い間違え連発から我に返って作業を始めようとする二人",
    "summary": "「鬼の鬼柱」「上限のサメ」といった謎の言い間違えで笑い合った後、ゲーム内の空腹や作業の遅れに気づいて慌てて口と体を動かそうとする展開が面白いため。",
    "candidateSpeechIds": [
      21
    ],
    "whyItCanBeClipped": "「鬼の鬼柱」「上限のサメ」といった謎の言い間違えで笑い合った後、ゲーム内の空腹や作業の遅れに気づいて慌てて口と体を動かそうとする展開が面白いため。",
    "compositionNote": "提示された候補発話範囲の中から、テーマが単独で成立する最小区間を選ぶ。"
  },
  "transcript": {
    "language": "ja-JP",
    "durationSec": 11824.121,
    "speechUnitGroups": [
      [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        16,
        17,
        18,
        19,
        20,
        21
      ]
    ],
    "segments": [
      {
        "speechId": 1,
        "sourceStartMs": 60482,
        "sourceEndMs": 62324,
        "text": "このマリンを本物の海賊に",
        "isThemeCandidate": false
      },
      {
        "speechId": 2,
        "sourceStartMs": 150610,
        "sourceEndMs": 153112,
        "text": "ってなんだ?",
        "isThemeCandidate": false
      },
      {
        "speechId": 3,
        "sourceStartMs": 153112,
        "sourceEndMs": 163720,
        "text": "今日は二人で作業するんですけれどもねそうなんですけどもねちょっと待ってコーネそこいたら邪魔じゃない?",
        "isThemeCandidate": false
      },
      {
        "speechId": 4,
        "sourceStartMs": 163720,
        "sourceEndMs": 167062,
        "text": "コーネもっと下げていい?",
        "isThemeCandidate": false
      },
      {
        "speechId": 5,
        "sourceStartMs": 167062,
        "sourceEndMs": 178451,
        "text": "確かに邪魔だなコーネバカ野郎コーネのいい位置を探すかちょっとどうしようかな天の声的な感じで天の声?",
        "isThemeCandidate": false
      },
      {
        "speechId": 6,
        "sourceStartMs": 178451,
        "sourceEndMs": 178571,
        "text": "上?",
        "isThemeCandidate": false
      },
      {
        "speechId": 7,
        "sourceStartMs": 180554,
        "sourceEndMs": 183835,
        "text": "これ弾だろうがよ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 8,
        "sourceStartMs": 183835,
        "sourceEndMs": 184495,
        "text": "おい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 9,
        "sourceStartMs": 184495,
        "sourceEndMs": 185216,
        "text": "ヒルなんですよ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 10,
        "sourceStartMs": 185216,
        "sourceEndMs": 188257,
        "text": "やめろよ!",
        "isThemeCandidate": false
      },
      {
        "speechId": 11,
        "sourceStartMs": 188257,
        "sourceEndMs": 190257,
        "text": "ヒルなんですどうしよう?",
        "isThemeCandidate": false
      },
      {
        "speechId": 12,
        "sourceStartMs": 190257,
        "sourceEndMs": 191938,
        "text": "どこに?",
        "isThemeCandidate": false
      },
      {
        "speechId": 13,
        "sourceStartMs": 191938,
        "sourceEndMs": 193198,
        "text": "まず、あれか?",
        "isThemeCandidate": false
      },
      {
        "speechId": 14,
        "sourceStartMs": 193198,
        "sourceEndMs": 193778,
        "text": "音声?",
        "isThemeCandidate": false
      },
      {
        "speechId": 15,
        "sourceStartMs": 193778,
        "sourceEndMs": 195199,
        "text": "おい!",
        "isThemeCandidate": false
      },
      {
        "speechId": 16,
        "sourceStartMs": 195199,
        "sourceEndMs": 198040,
        "text": "帽子みたいな感じであ、かわいいかも!",
        "isThemeCandidate": false
      },
      {
        "speechId": 17,
        "sourceStartMs": 198040,
        "sourceEndMs": 209884,
        "text": "かわいくないだろなんかでもサザエさんのエンディングみたいオープニングのそれねサザエさんみたいな感じで弾がさ、こう、みかんから出てくるやつ",
        "isThemeCandidate": false
      },
      {
        "speechId": 18,
        "sourceStartMs": 210802,
        "sourceEndMs": 236189,
        "text": "ねってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってってって",
        "isThemeCandidate": false
      },
      {
        "speechId": 19,
        "sourceStartMs": 240202,
        "sourceEndMs": 267270,
        "text": "コロナが上がっちゃったちょっと諦めようかなちょっとちょっと難易度高めこれにさなんか文句言われたらちょっと考えような確かに文句ないと思うけどね当然ねこっち向くわはいということでねこっち向くわとか言っちゃったちょっとコーネがね今日ねずこスタイルなんでどうもどうもねずこはそんなこと言わないうんうんうんうん",
        "isThemeCandidate": false
      },
      {
        "speechId": 20,
        "sourceStartMs": 278759,
        "sourceEndMs": 298984,
        "text": "ねずこうんわかるよお兄ちゃんにはわかるそうかねずこわかったわかったねずこみんなどうかなねずこと炭治郎の音量どういい感じいい感じありがとういい感じよかったねずこまあねそのそれはあれじゃん鬼の鬼の鬼柱なんだっけ鬼の",
        "isThemeCandidate": false
      },
      {
        "speechId": 21,
        "sourceStartMs": 300578,
        "sourceEndMs": 328762,
        "text": "なんだっけ鬼のさなに鬼もっしらってなんだよ強い鬼なんてなんかあれだ上限の月だ上限のサメだよこれはねえマリンマリンやばい腹も減ってるよこれちょっとお前どうしよう作業するかちょっとあ確かに作業しようちょっと喋ってる場合じゃない作業口を動かすか体を動かすかっていうねえこれ待ってちょっと面白くないこの絵面ひよこが立ち並んでる姿",
        "isThemeCandidate": true
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
