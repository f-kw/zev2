# clip_composition_prompt_v010

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
      "usedSpeechIds": [10, 11, 12]
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
      "usedSpeechIds": [20, 21]
    },
    {
      "sourceStartMs": 125000,
      "sourceEndMs": 131200,
      "reason": "開始根拠: 先ほどのテーマに戻る発話から始まるためです。終了根拠: 続けられる形が大事という補足の結論まで含めるためです。除外判断: 前の素材区間とは元動画内で離れているため別のselectedCutsとして返します。",
      "usedSpeechIds": [50, 51]
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
      "usedSpeechIds": [1, 2, 3]
    }
  ]
}
```

## 入力JSON

```json
{
  "task": "fixed_theme_clip_interval_selection",
  "fixtureId": "UpRyakf5j80_clip_audio_v001",
  "draftId": "UpRyakf5j80_clip_audio_v001",
  "sourceUri": "https://www.youtube.com/watch?v=kNX-wQTvsws",
  "selectedTheme": {
    "id": "theme_audio_verified_1",
    "title": "登録者数世界2位扱いへの照れと順位変動への冷静な反応",
    "summary": "現役Vtuber登録者数世界2位と取り上げられたことに照れつつ、順位は変動するものだから素直に喜べないと話す場面。",
    "candidateSpeechIds": [
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
      20
    ],
    "whyItCanBeClipped": "登録者数世界2位として取り上げられた話題への照れと、順位変動への冷静な受け止めが短い発話内で伝わるため。",
    "compositionNote": "世界2位という話題提示から、変動するものなので素直に喜べないという結論までを一続きで使う。"
  },
  "transcript": {
    "language": "ja-JP",
    "durationSec": 42.678,
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
        20
      ]
    ],
    "segments": [
      {
        "speechId": 1,
        "sourceStartMs": 11362439,
        "sourceEndMs": 11366760,
        "text": "香りどうもありがとうございます",
        "speaker": "youtube-auto-caption",
        "isThemeCandidate": true
      },
      {
        "speechId": 2,
        "sourceStartMs": 11364140,
        "sourceEndMs": 11368859,
        "text": "とある記事で船長は",
        "speaker": "youtube-auto-caption",
        "isThemeCandidate": true
      },
      {
        "speechId": 3,
        "sourceStartMs": 11366760,
        "sourceEndMs": 11370479,
        "text": "現在現役で活躍されているvtuberで",
        "speaker": "youtube-auto-caption",
        "isThemeCandidate": true
      },
      {
        "speechId": 4,
        "sourceStartMs": 11368859,
        "sourceEndMs": 11372939,
        "text": "世界2位なんだと取り上げられているのを",
        "speaker": "youtube-auto-caption",
        "isThemeCandidate": true
      },
      {
        "speechId": 5,
        "sourceStartMs": 11370479,
        "sourceEndMs": 11373899,
        "text": "見ましたその人と結婚してるなんてどうか",
        "speaker": "youtube-auto-caption",
        "isThemeCandidate": true
      },
      {
        "speechId": 6,
        "sourceStartMs": 11372939,
        "sourceEndMs": 11375640,
        "text": "私も",
        "speaker": "youtube-auto-caption",
        "isThemeCandidate": true
      },
      {
        "speechId": 7,
        "sourceStartMs": 11373899,
        "sourceEndMs": 11377620,
        "text": "誇らしいやら",
        "speaker": "youtube-auto-caption",
        "isThemeCandidate": true
      },
      {
        "speechId": 8,
        "sourceStartMs": 11375640,
        "sourceEndMs": 11381180,
        "text": "恥ずかしいやろで緊張していますどうした",
        "speaker": "youtube-auto-caption",
        "isThemeCandidate": true
      },
      {
        "speechId": 9,
        "sourceStartMs": 11377620,
        "sourceEndMs": 11381180,
        "text": "マジで大丈夫か",
        "speaker": "youtube-auto-caption",
        "isThemeCandidate": true
      },
      {
        "speechId": 10,
        "sourceStartMs": 11381340,
        "sourceEndMs": 11385540,
        "text": "さあそんな世界に行くとか",
        "speaker": "youtube-auto-caption",
        "isThemeCandidate": true
      },
      {
        "speechId": 11,
        "sourceStartMs": 11383740,
        "sourceEndMs": 11388479,
        "text": "言うけどさそんなもんさーやめようよ",
        "speaker": "youtube-auto-caption",
        "isThemeCandidate": true
      },
      {
        "speechId": 12,
        "sourceStartMs": 11385540,
        "sourceEndMs": 11391899,
        "text": "そんなのなんか",
        "speaker": "youtube-auto-caption",
        "isThemeCandidate": true
      },
      {
        "speechId": 13,
        "sourceStartMs": 11388479,
        "sourceEndMs": 11394479,
        "text": "あんまりなんかそういうさあ",
        "speaker": "youtube-auto-caption",
        "isThemeCandidate": true
      },
      {
        "speechId": 14,
        "sourceStartMs": 11391899,
        "sourceEndMs": 11397300,
        "text": "変動するじゃんそういうのって",
        "speaker": "youtube-auto-caption",
        "isThemeCandidate": true
      },
      {
        "speechId": 15,
        "sourceStartMs": 11394479,
        "sourceEndMs": 11398200,
        "text": "変動するものであんま喜べないんだよね",
        "speaker": "youtube-auto-caption",
        "isThemeCandidate": true
      },
      {
        "speechId": 16,
        "sourceStartMs": 11397300,
        "sourceEndMs": 11399359,
        "text": "船長",
        "speaker": "youtube-auto-caption",
        "isThemeCandidate": true
      },
      {
        "speechId": 17,
        "sourceStartMs": 11398200,
        "sourceEndMs": 11402359,
        "text": "うん",
        "speaker": "youtube-auto-caption",
        "isThemeCandidate": true
      },
      {
        "speechId": 18,
        "sourceStartMs": 11399359,
        "sourceEndMs": 11404850,
        "text": "どうせまた変わるしみたいな感じ",
        "speaker": "youtube-auto-caption",
        "isThemeCandidate": true
      },
      {
        "speechId": 19,
        "sourceStartMs": 11402359,
        "sourceEndMs": 11405460,
        "text": "あんま喜べないんだよね先日の",
        "speaker": "youtube-auto-caption",
        "isThemeCandidate": true
      },
      {
        "speechId": 20,
        "sourceStartMs": 11405460,
        "sourceEndMs": 11409170,
        "text": "うん",
        "speaker": "youtube-auto-caption",
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
            "number"
          ]
        }
      ]
    }
  }
}
```
