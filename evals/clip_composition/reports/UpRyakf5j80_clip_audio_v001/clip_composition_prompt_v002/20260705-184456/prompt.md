# clip_composition_prompt_v002

あなたは切り抜き区間選択だけを担当する。

## 目的

固定済みテーマと文字起こしを見て、元動画内で切り抜きとして使う最終区間を選ぶ。

この評価では、テーマ候補の範囲から「意味が通る中心の発話区間」を選ぶ。入力された候補範囲全体をそのまま返すことが目的ではない。

## 前提

- テーマは固定入力であり、新しいテーマを作らない。
- 正解区間、評価結果、代表発話IDは入力に含まれない。
- `candidateSpeechIds` は探索してよい範囲であり、すべてを使う義務ではない。
- `isThemeCandidate` は候補範囲の印であり、最終区間に含めるべき印ではない。
- BGM、SE、切り抜き師の追加編集は文字起こしに出ないことがある。
- STTには誤認識、欠落、細切れの単語、1文字だけの断片が混ざることがある。
- 選べる範囲は、入力された文字起こしの発話時刻に基づく。

## 判断方針

- テーマの意味が単独で伝わる最小の連続区間を選ぶ。
- 候補範囲の先頭にある、テーマへ入る前の短い断片、言い淀み、前文の残りは含めない。
- 候補範囲の末尾にある、笑い声だけ、余韻だけ、同じ反応の長い引き伸ばしは、意味を追加しない限り含めない。
- ただし、開始直後の文脈や結論に必要な語は削らない。
- テーマの中心になる発話が複数に分かれている場合は、それらが単独で意味を持つように連続区間でつなぐ。
- 導入だけ、オチだけ、または文脈が切れた区間を避ける。
- 開始位置は、テーマに直接入る最初の発話の開始時刻にする。
- 終了位置は、テーマの意味が完成する最後の発話の終了時刻にする。
- 開始位置と終了位置はミリ秒で返す。

## 出力

JSONだけを返す。説明文、Markdown、コードフェンスは付けない。

```json
{
  "selectedCuts": [
    {
      "sourceStartMs": 123000,
      "sourceEndMs": 153000,
      "reason": "この区間を選んだ理由",
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
