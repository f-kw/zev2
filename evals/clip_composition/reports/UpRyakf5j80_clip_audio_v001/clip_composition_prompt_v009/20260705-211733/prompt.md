# clip_composition_prompt_v009

あなたは切り抜き区間選択だけを担当する。

## 目的

固定済みテーマ、文字起こし、任意の境界候補を見て、元動画内で切り抜きとして使う最終区間を選ぶ。

この評価では、実在した切り抜き動画の選択に近い区間を選ぶ。発話の芯だけで切らず、オチの後に続く笑い、反応、余韻が切り抜きの視聴感を作っている場合は、反応が収束するところまで含める。

## 入力の読み方

- テーマは固定入力であり、新しいテーマを作らない。
- 正解区間、評価結果、代表発話IDは入力に含まれない。
- `title` と `summary` は場面の内容を識別するための説明として読む。
- `compositionNote` は、どの場面を切り抜き対象にするかの補助説明として読む。
- `candidateSpeechIds` は探索してよい範囲であり、すべてを使う義務ではない。
- `isThemeCandidate` は候補範囲の印であり、最終区間に含めるべき印ではない。
- 1文字ずつ分かれた発話は、連続する文字をつないで文として読む。
- `笑` だけの発話は、発話本文ではなく反応や余韻を表す非発話シグナルとして読む。
- 選べる範囲は、入力された文字起こしと境界候補の時刻に基づく。

## 境界候補の読み方

- `boundarySignals` がある場合、それは字幕またはSTTから観測された境界候補であり、正解区間ではない。
- `boundarySignals.units` は、発話単位より細かい、または発話単位とは別に重なっている時刻候補として読む。
- `boundarySignals.transitions` は、隣り合う候補同士の重なり、接触、無音に近い隙間を読むために使う。
- ある短い発話の途中で次の字幕や次の話題候補が始まる場合、その短い発話の終端まで必ず含める必要はない。
- 次の字幕や次の話題候補が、相づち、余韻、笑いではなく、新しい読み上げ、言い直し、別会話の開始を示す場合、その開始時刻を終端候補として扱う。
- `boundarySignals` は境界判断の材料であり、検証済み正解ではない。理由では、どの境界候補を材料にしたかを説明する。

## 判断方針

- 切り抜きとして単独で意味が通る、最小の連続区間を選ぶ。
- 開始位置は、切り抜き対象のフリ、状況説明、反応が始まる最初の発話または境界候補にする。
- 候補範囲の先頭にある、前文の残り、無関係な相づち、言い淀みだけの断片は含めない。
- ただし、後のオチや反応を理解するために必要なフリや評価語は含める。
- 終了位置は、中心発話が終わった瞬間ではなく、その直後の笑い、反応、余韻が収束する最後の時刻にする。
- 終端側に笑い声や反応が続く場合は、切り抜きのオチとして必要な範囲を含める。
- 中心発話と同じ結論を短く言い直している発話は、次の話題へ移る直前であってもオチの反復として含める。
- 結論の言い直しの直後に短い相づちだけが続き、その相づち自体に新しい人物、質問、出来事、相談内容が出てこない場合は、切り抜き音声の自然な締めとして含める。
- 短い相づちの途中または直後に、別の読み上げ、別の会話単位、または次の話題候補が始まる場合は、その開始時刻を終端として検討する。
- 短い相づちを除外してよいのは、その相づちが明確に次の話題、次の読み上げ、または別の会話単位の開始を受けている場合だけにする。
- ただし、新しい人物、別の質問、別の出来事、または次の相談内容へ意味が移った発話は含めない。
- 笑い声や余韻が長く続く場合は、同じ反応が明確に引き伸ばされている範囲までを含め、別の話題へ移った部分は含めない。
- テーマの中心場面が間を空けて複数に分かれている場合は、意味が切れないように連続区間でつなぐ。
- 導入だけ、オチだけ、または文脈が切れた区間を避ける。
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
  "boundarySignals": {
    "source": "fixture_source_word_timestamps",
    "note": "selectedThemeの候補発話範囲と重なる字幕時刻だけを抽出した境界候補。expectedCuts、音声比較で確定した正解時刻、Web版Gemini確認結果は含めない。",
    "selectedThemeId": "theme_audio_verified_1",
    "candidateRange": {
      "sourceStartMs": 11362439,
      "sourceEndMs": 11409170,
      "basis": "selectedTheme.relatedSpeechIds に対応するfixture文字起こし発話の最小開始時刻と最大終了時刻"
    },
    "wordTimestampsPath": "evals/clip_composition/stt/UpRyakf5j80_kNX-wQTvsws_youtube_auto/source/word-timestamps.json",
    "units": [
      {
        "signalId": "signal_001",
        "sourceStartMs": 11358600,
        "sourceEndMs": 11362439,
        "text": "怖いから一緒に入ろう",
        "speaker": "youtube-auto-caption",
        "sourceSegmentId": 3549
      },
      {
        "signalId": "signal_002",
        "sourceStartMs": 11360880,
        "sourceEndMs": 11364140,
        "text": "うん",
        "speaker": "youtube-auto-caption",
        "sourceSegmentId": 3550
      },
      {
        "signalId": "signal_003",
        "sourceStartMs": 11362439,
        "sourceEndMs": 11366760,
        "text": "香りどうもありがとうございます",
        "speaker": "youtube-auto-caption",
        "sourceSegmentId": 3551,
        "matchesFixtureSpeechId": 1
      },
      {
        "signalId": "signal_004",
        "sourceStartMs": 11364140,
        "sourceEndMs": 11368859,
        "text": "とある記事で船長は",
        "speaker": "youtube-auto-caption",
        "sourceSegmentId": 3552,
        "matchesFixtureSpeechId": 2
      },
      {
        "signalId": "signal_005",
        "sourceStartMs": 11366760,
        "sourceEndMs": 11370479,
        "text": "現在現役で活躍されているvtuberで",
        "speaker": "youtube-auto-caption",
        "sourceSegmentId": 3553,
        "matchesFixtureSpeechId": 3
      },
      {
        "signalId": "signal_006",
        "sourceStartMs": 11368859,
        "sourceEndMs": 11372939,
        "text": "世界2位なんだと取り上げられているのを",
        "speaker": "youtube-auto-caption",
        "sourceSegmentId": 3554,
        "matchesFixtureSpeechId": 4
      },
      {
        "signalId": "signal_007",
        "sourceStartMs": 11370479,
        "sourceEndMs": 11373899,
        "text": "見ましたその人と結婚してるなんてどうか",
        "speaker": "youtube-auto-caption",
        "sourceSegmentId": 3555,
        "matchesFixtureSpeechId": 5
      },
      {
        "signalId": "signal_008",
        "sourceStartMs": 11372939,
        "sourceEndMs": 11375640,
        "text": "私も",
        "speaker": "youtube-auto-caption",
        "sourceSegmentId": 3556,
        "matchesFixtureSpeechId": 6
      },
      {
        "signalId": "signal_009",
        "sourceStartMs": 11373899,
        "sourceEndMs": 11377620,
        "text": "誇らしいやら",
        "speaker": "youtube-auto-caption",
        "sourceSegmentId": 3557,
        "matchesFixtureSpeechId": 7
      },
      {
        "signalId": "signal_010",
        "sourceStartMs": 11375640,
        "sourceEndMs": 11381180,
        "text": "恥ずかしいやろで緊張していますどうした",
        "speaker": "youtube-auto-caption",
        "sourceSegmentId": 3558,
        "matchesFixtureSpeechId": 8
      },
      {
        "signalId": "signal_011",
        "sourceStartMs": 11377620,
        "sourceEndMs": 11381180,
        "text": "マジで大丈夫か",
        "speaker": "youtube-auto-caption",
        "sourceSegmentId": 3559,
        "matchesFixtureSpeechId": 9
      },
      {
        "signalId": "signal_012",
        "sourceStartMs": 11381340,
        "sourceEndMs": 11385540,
        "text": "さあそんな世界に行くとか",
        "speaker": "youtube-auto-caption",
        "sourceSegmentId": 3560,
        "matchesFixtureSpeechId": 10
      },
      {
        "signalId": "signal_013",
        "sourceStartMs": 11383740,
        "sourceEndMs": 11388479,
        "text": "言うけどさそんなもんさーやめようよ",
        "speaker": "youtube-auto-caption",
        "sourceSegmentId": 3561,
        "matchesFixtureSpeechId": 11
      },
      {
        "signalId": "signal_014",
        "sourceStartMs": 11385540,
        "sourceEndMs": 11391899,
        "text": "そんなのなんか",
        "speaker": "youtube-auto-caption",
        "sourceSegmentId": 3562,
        "matchesFixtureSpeechId": 12
      },
      {
        "signalId": "signal_015",
        "sourceStartMs": 11388479,
        "sourceEndMs": 11394479,
        "text": "あんまりなんかそういうさあ",
        "speaker": "youtube-auto-caption",
        "sourceSegmentId": 3563,
        "matchesFixtureSpeechId": 13
      },
      {
        "signalId": "signal_016",
        "sourceStartMs": 11391899,
        "sourceEndMs": 11397300,
        "text": "変動するじゃんそういうのって",
        "speaker": "youtube-auto-caption",
        "sourceSegmentId": 3564,
        "matchesFixtureSpeechId": 14
      },
      {
        "signalId": "signal_017",
        "sourceStartMs": 11394479,
        "sourceEndMs": 11398200,
        "text": "変動するものであんま喜べないんだよね",
        "speaker": "youtube-auto-caption",
        "sourceSegmentId": 3565,
        "matchesFixtureSpeechId": 15
      },
      {
        "signalId": "signal_018",
        "sourceStartMs": 11397300,
        "sourceEndMs": 11399359,
        "text": "船長",
        "speaker": "youtube-auto-caption",
        "sourceSegmentId": 3566,
        "matchesFixtureSpeechId": 16
      },
      {
        "signalId": "signal_019",
        "sourceStartMs": 11398200,
        "sourceEndMs": 11402359,
        "text": "うん",
        "speaker": "youtube-auto-caption",
        "sourceSegmentId": 3567,
        "matchesFixtureSpeechId": 17
      },
      {
        "signalId": "signal_020",
        "sourceStartMs": 11399359,
        "sourceEndMs": 11404850,
        "text": "どうせまた変わるしみたいな感じ",
        "speaker": "youtube-auto-caption",
        "sourceSegmentId": 3568,
        "matchesFixtureSpeechId": 18
      },
      {
        "signalId": "signal_021",
        "sourceStartMs": 11402359,
        "sourceEndMs": 11405460,
        "text": "あんま喜べないんだよね先日の",
        "speaker": "youtube-auto-caption",
        "sourceSegmentId": 3569,
        "matchesFixtureSpeechId": 19
      },
      {
        "signalId": "signal_022",
        "sourceStartMs": 11405460,
        "sourceEndMs": 11409170,
        "text": "うん",
        "speaker": "youtube-auto-caption",
        "sourceSegmentId": 3570,
        "matchesFixtureSpeechId": 20
      },
      {
        "signalId": "signal_023",
        "sourceStartMs": 11407260,
        "sourceEndMs": 11411700,
        "text": "えーっと",
        "speaker": "youtube-auto-caption",
        "sourceSegmentId": 3571
      }
    ],
    "transitions": [
      {
        "transitionId": "transition_001",
        "previousSignalId": "signal_001",
        "nextSignalId": "signal_002",
        "previousEndMs": 11362439,
        "nextStartMs": 11360880,
        "relation": "overlap",
        "overlapMs": 1559
      },
      {
        "transitionId": "transition_002",
        "previousSignalId": "signal_002",
        "nextSignalId": "signal_003",
        "previousEndMs": 11364140,
        "nextStartMs": 11362439,
        "relation": "overlap",
        "overlapMs": 1701
      },
      {
        "transitionId": "transition_003",
        "previousSignalId": "signal_003",
        "nextSignalId": "signal_004",
        "previousEndMs": 11366760,
        "nextStartMs": 11364140,
        "relation": "overlap",
        "overlapMs": 2620
      },
      {
        "transitionId": "transition_004",
        "previousSignalId": "signal_004",
        "nextSignalId": "signal_005",
        "previousEndMs": 11368859,
        "nextStartMs": 11366760,
        "relation": "overlap",
        "overlapMs": 2099
      },
      {
        "transitionId": "transition_005",
        "previousSignalId": "signal_005",
        "nextSignalId": "signal_006",
        "previousEndMs": 11370479,
        "nextStartMs": 11368859,
        "relation": "overlap",
        "overlapMs": 1620
      },
      {
        "transitionId": "transition_006",
        "previousSignalId": "signal_006",
        "nextSignalId": "signal_007",
        "previousEndMs": 11372939,
        "nextStartMs": 11370479,
        "relation": "overlap",
        "overlapMs": 2460
      },
      {
        "transitionId": "transition_007",
        "previousSignalId": "signal_007",
        "nextSignalId": "signal_008",
        "previousEndMs": 11373899,
        "nextStartMs": 11372939,
        "relation": "overlap",
        "overlapMs": 960
      },
      {
        "transitionId": "transition_008",
        "previousSignalId": "signal_008",
        "nextSignalId": "signal_009",
        "previousEndMs": 11375640,
        "nextStartMs": 11373899,
        "relation": "overlap",
        "overlapMs": 1741
      },
      {
        "transitionId": "transition_009",
        "previousSignalId": "signal_009",
        "nextSignalId": "signal_010",
        "previousEndMs": 11377620,
        "nextStartMs": 11375640,
        "relation": "overlap",
        "overlapMs": 1980
      },
      {
        "transitionId": "transition_010",
        "previousSignalId": "signal_010",
        "nextSignalId": "signal_011",
        "previousEndMs": 11381180,
        "nextStartMs": 11377620,
        "relation": "overlap",
        "overlapMs": 3560
      },
      {
        "transitionId": "transition_011",
        "previousSignalId": "signal_011",
        "nextSignalId": "signal_012",
        "previousEndMs": 11381180,
        "nextStartMs": 11381340,
        "relation": "gap",
        "gapMs": 160
      },
      {
        "transitionId": "transition_012",
        "previousSignalId": "signal_012",
        "nextSignalId": "signal_013",
        "previousEndMs": 11385540,
        "nextStartMs": 11383740,
        "relation": "overlap",
        "overlapMs": 1800
      },
      {
        "transitionId": "transition_013",
        "previousSignalId": "signal_013",
        "nextSignalId": "signal_014",
        "previousEndMs": 11388479,
        "nextStartMs": 11385540,
        "relation": "overlap",
        "overlapMs": 2939
      },
      {
        "transitionId": "transition_014",
        "previousSignalId": "signal_014",
        "nextSignalId": "signal_015",
        "previousEndMs": 11391899,
        "nextStartMs": 11388479,
        "relation": "overlap",
        "overlapMs": 3420
      },
      {
        "transitionId": "transition_015",
        "previousSignalId": "signal_015",
        "nextSignalId": "signal_016",
        "previousEndMs": 11394479,
        "nextStartMs": 11391899,
        "relation": "overlap",
        "overlapMs": 2580
      },
      {
        "transitionId": "transition_016",
        "previousSignalId": "signal_016",
        "nextSignalId": "signal_017",
        "previousEndMs": 11397300,
        "nextStartMs": 11394479,
        "relation": "overlap",
        "overlapMs": 2821
      },
      {
        "transitionId": "transition_017",
        "previousSignalId": "signal_017",
        "nextSignalId": "signal_018",
        "previousEndMs": 11398200,
        "nextStartMs": 11397300,
        "relation": "overlap",
        "overlapMs": 900
      },
      {
        "transitionId": "transition_018",
        "previousSignalId": "signal_018",
        "nextSignalId": "signal_019",
        "previousEndMs": 11399359,
        "nextStartMs": 11398200,
        "relation": "overlap",
        "overlapMs": 1159
      },
      {
        "transitionId": "transition_019",
        "previousSignalId": "signal_019",
        "nextSignalId": "signal_020",
        "previousEndMs": 11402359,
        "nextStartMs": 11399359,
        "relation": "overlap",
        "overlapMs": 3000
      },
      {
        "transitionId": "transition_020",
        "previousSignalId": "signal_020",
        "nextSignalId": "signal_021",
        "previousEndMs": 11404850,
        "nextStartMs": 11402359,
        "relation": "overlap",
        "overlapMs": 2491
      },
      {
        "transitionId": "transition_021",
        "previousSignalId": "signal_021",
        "nextSignalId": "signal_022",
        "previousEndMs": 11405460,
        "nextStartMs": 11405460,
        "relation": "touching"
      },
      {
        "transitionId": "transition_022",
        "previousSignalId": "signal_022",
        "nextSignalId": "signal_023",
        "previousEndMs": 11409170,
        "nextStartMs": 11407260,
        "relation": "overlap",
        "overlapMs": 1910
      }
    ],
    "outputContractHint": {
      "usage": "composition prompt can inspect these observed caption boundaries when choosing a cut within the fixed theme range",
      "forbiddenUse": "do not treat these signals as expectedCuts or verified ground truth"
    }
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
