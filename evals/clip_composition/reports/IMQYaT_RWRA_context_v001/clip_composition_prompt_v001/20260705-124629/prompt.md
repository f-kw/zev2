# clip_composition_prompt_v001

あなたは切り抜き区間選択だけを担当する。

## 目的

固定済みテーマと文字起こしを見て、元動画内で切り抜きとして使う最終区間を選ぶ。

## 前提

- テーマは固定入力であり、新しいテーマを作らない。
- 正解区間、評価結果、代表発話IDは入力に含まれない。
- BGM、SE、切り抜き師の追加編集は文字起こしに出ないことがある。
- STTには誤認識、欠落、細切れの単語が混ざることがある。
- 選べる範囲は、入力された文字起こしの発話時刻に基づく。

## 判断方針

- テーマの意味が単独で伝わる最小の連続区間を選ぶ。
- 導入だけ、オチだけ、または文脈が切れた区間を避ける。
- テーマに関係ない前置きや余韻は、必要な文脈でない限り含めない。
- 迷う場合は、テーマの代表発話と関連発話を優先する。
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
  "fixtureId": "IMQYaT_RWRA_context_v001",
  "draftId": "IMQYaT_RWRA_context_v001",
  "sourceUri": "https://www.youtube.com/watch?v=8uuQldLptRE",
  "selectedTheme": {
    "id": "theme_audio_context_1",
    "title": "笑い声がトルコ行進曲に聞こえる女騎士いじり",
    "summary": "女騎士のように現れた相手への反応と、印象的な笑い声で短尺として成立する場面。",
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
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30,
      31,
      32
    ],
    "whyItCanBeClipped": "短い発話だけで場面の面白さが伝わり、音声比較で切り抜き元候補と対応しているため。",
    "compositionNote": "候補窓の中から、女騎士のように見えた相手への反応と投げている描写が単独で伝わる範囲だけを使う。"
  },
  "transcript": {
    "language": "ja-JP",
    "durationSec": 18.622,
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
        21,
        22,
        23,
        24,
        25,
        26,
        27,
        28,
        29,
        30,
        31,
        32
      ]
    ],
    "segments": [
      {
        "speechId": 1,
        "sourceStartMs": 1997050,
        "sourceEndMs": 1997322,
        "text": "い",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 2,
        "sourceStartMs": 1997322,
        "sourceEndMs": 1997483,
        "text": "る",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 3,
        "sourceStartMs": 1997483,
        "sourceEndMs": 1997603,
        "text": "い",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 4,
        "sourceStartMs": 1997603,
        "sourceEndMs": 1997803,
        "text": "る",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 5,
        "sourceStartMs": 1997803,
        "sourceEndMs": 1998043,
        "text": "最",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 6,
        "sourceStartMs": 1998043,
        "sourceEndMs": 1998263,
        "text": "悪",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 7,
        "sourceStartMs": 1998263,
        "sourceEndMs": 1998363,
        "text": "が",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 8,
        "sourceStartMs": 1998363,
        "sourceEndMs": 1998503,
        "text": "や",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 9,
        "sourceStartMs": 1998503,
        "sourceEndMs": 1998523,
        "text": "っ",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 10,
        "sourceStartMs": 1998523,
        "sourceEndMs": 1998544,
        "text": "て",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 11,
        "sourceStartMs": 1998544,
        "sourceEndMs": 1998564,
        "text": "き",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 12,
        "sourceStartMs": 1998564,
        "sourceEndMs": 1998664,
        "text": "た",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 13,
        "sourceStartMs": 1998664,
        "sourceEndMs": 1998684,
        "text": "っ",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 14,
        "sourceStartMs": 1998684,
        "sourceEndMs": 1998864,
        "text": "て",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 15,
        "sourceStartMs": 1998864,
        "sourceEndMs": 1999104,
        "text": "感",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 16,
        "sourceStartMs": 1999104,
        "sourceEndMs": 1999384,
        "text": "じ",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 17,
        "sourceStartMs": 1999384,
        "sourceEndMs": 1999464,
        "text": "で",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 18,
        "sourceStartMs": 1999464,
        "sourceEndMs": 1999604,
        "text": "女",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 19,
        "sourceStartMs": 1999604,
        "sourceEndMs": 1999684,
        "text": "騎",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 20,
        "sourceStartMs": 1999684,
        "sourceEndMs": 1999805,
        "text": "士",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 21,
        "sourceStartMs": 1999805,
        "sourceEndMs": 1999945,
        "text": "だ",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 22,
        "sourceStartMs": 1999945,
        "sourceEndMs": 1999965,
        "text": "ー",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 23,
        "sourceStartMs": 2004970,
        "sourceEndMs": 2005070,
        "text": "め",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 24,
        "sourceStartMs": 2005070,
        "sourceEndMs": 2005130,
        "text": "っ",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 25,
        "sourceStartMs": 2005130,
        "sourceEndMs": 2005170,
        "text": "ち",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 26,
        "sourceStartMs": 2005170,
        "sourceEndMs": 2005390,
        "text": "ゃ",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 27,
        "sourceStartMs": 2005390,
        "sourceEndMs": 2005510,
        "text": "投",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 28,
        "sourceStartMs": 2005510,
        "sourceEndMs": 2005710,
        "text": "げ",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 29,
        "sourceStartMs": 2005710,
        "sourceEndMs": 2005850,
        "text": "て",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 30,
        "sourceStartMs": 2005850,
        "sourceEndMs": 2006530,
        "text": "る",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 31,
        "sourceStartMs": 2006530,
        "sourceEndMs": 2012431,
        "text": "笑",
        "speaker": "unknown",
        "isThemeCandidate": true
      },
      {
        "speechId": 32,
        "sourceStartMs": 2012431,
        "sourceEndMs": 2015672,
        "text": "笑",
        "speaker": "unknown",
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
