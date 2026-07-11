# theme_generation_prompt_v002

あなたは元配信から切り抜きテーマ候補を作る。

## 目的

元配信の文字起こしだけを見て、切り抜きとして成立しそうなテーマ候補を出す。最終的な切り抜き区間を確定する担当ではない。区間選択は後段のcompositionが行う。

## 入力の読み方

- 入力は元配信単体から得られる情報だけである。
- 切り抜き動画、expected、照合結果、人間確認メモ、既存切り抜きタイトルは入力に含まれない。
- `sourceTitle` は配信全体の文脈を読む補助情報として使う。
- `segments` は元配信内の発話で、`speechId`、時刻、本文を持つ。
- 入力が長尺配信の一部窓である場合は、その窓の範囲内で判断し、配信全体を見たように書かない。
- 笑い、沈黙、音量変化などの非発話シグナルが入力にある場合は補助情報として扱う。本文より強い根拠として扱わない。

## 禁止

- 切り抜き動画や正解区間を知っている前提で書かない。
- 元配信本文にない場面や反応を作らない。
- 秒数だけを根拠に候補を作らない。
- 「雑談」「面白い場面」のように広すぎて何を切るか決まらないテーマを出さない。
- 既存切り抜きのタイトル風に盛った表現を、本文根拠なしで作らない。

## 判断方針

- 候補は、元配信内の発話から見どころが説明できる具体的なテーマにする。
- 単独で視聴者に伝わるフリ、展開、反応、結論がある場面を優先する。
- 同じ話題が離れた場所で補足される場合は、同じテーマ候補の根拠として複数の発話範囲を持ってよい。
- 根拠範囲は、候補テーマを説明するために必要な発話だけにする。配信全体や長い雑談を大きく囲わない。
- 別話題をまたぐ場合は、1つの広い範囲にまとめず、該当する狭い範囲だけを返す。

## v002の出力方針

v002では、判断方針はv001から変えない。変えるのは出力形式だけである。

- 候補ごとの長文説明は返さない。
- 根拠は `evidenceRanges` の配列で返す。
- 同じ話題が複数シーンに分かれる場合は、1つの広い開始・終了で囲わず、狭い根拠範囲を複数入れる。
- `reason` は採用理由を1文だけで書く。
- 弱い候補を無理に埋めない。

## 出力

JSONだけを返す。説明文やMarkdownを付けない。

`requestedThemeCount` が指定されている場合は、その件数を上限にする。良い候補が足りない場合は、無理に埋めない。

```json
{
  "themes": [
    {
      "themeId": "theme_001",
      "title": "短いテーマ名",
      "reason": "切り抜きとして成立すると判断した理由を1文で書く。",
      "evidenceRanges": [
        {
          "sourceVideoId": "元動画ID",
          "sourceStartMs": 123000,
          "sourceEndMs": 153000,
          "supportingSpeechIds": ["12-47", 52, "55-60"]
        }
      ]
    }
  ]
}
```

## supportingSpeechIds

- 連続する発話IDは `"12-47"` のような範囲文字列で返す。
- 不連続な発話IDは、個別の数値として同じ配列に入れる。
- 連続範囲と個別IDを混ぜてよい。
- 根拠に使っていない発話IDを含めない。

## 時刻

- `sourceStartMs` は、その根拠範囲の最初の発話時刻にする。
- `sourceEndMs` は、その根拠範囲の最後の発話時刻にする。
- 同じテーマの根拠が複数箇所にある場合は、`evidenceRanges` を複数に分ける。間にある無関係な別話題を含めない。
- 正解境界を当てる評価ではないが、後段の機械判定でexpected区間との重なりを見るため、候補根拠の範囲を本文に基づいて正しく出す。

## 入力JSON

```json
{
  "task": "source_only_theme_generation",
  "generationSystem": "theme-llm-v002",
  "promptVersion": "theme_generation_prompt_v002",
  "requestedThemeCount": 8,
  "inputPolicy": {
    "sourceOnly": true,
    "noClipInfo": true,
    "noExpected": true,
    "noAlignment": true,
    "noHumanReverseTheme": true
  },
  "windowing": {
    "applied": true,
    "mode": "speech-time",
    "windowId": "window_23_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 6404515,
    "sourceEndMs": 6776903
  },
  "sources": [
    {
      "sourceVideoId": "YE-faluP7zY",
      "sourceUrl": "https://www.youtube.com/watch?v=YE-faluP7zY",
      "sourceTitle": "【Raft】ころね、キミさえいればこの海の果てまでだって──【ホロライブ/宝鐘マリン】",
      "transcriptKind": "local_stt",
      "language": "ja-JP",
      "durationSec": 11824.121,
      "rawSegmentCount": 53180,
      "promptSegmentCount": 24,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 941,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6404515,
          "sourceEndMs": 6406996,
          "text": "そんなこと言ってる場合じゃねえんだよ!"
        },
        {
          "speechId": 942,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6406996,
          "sourceEndMs": 6409217,
          "text": "サメが来てんだよ、サメ貝は!"
        },
        {
          "speechId": 943,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6409217,
          "sourceEndMs": 6410418,
          "text": "鉱石がないです!"
        },
        {
          "speechId": 944,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6410418,
          "sourceEndMs": 6415321,
          "text": "まあまあ、まあいいでしょうで、何をしたいんだっけ?"
        },
        {
          "speechId": 945,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6415321,
          "sourceEndMs": 6419384,
          "text": "船長あ、そうだ、えーと、であ、いたいたいたいや、こんなに離れちゃうもんなんだな"
        },
        {
          "speechId": 956,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6480406,
          "sourceEndMs": 6484328,
          "text": "え、分かってるよ分かってくれてる?"
        },
        {
          "speechId": 957,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6484328,
          "sourceEndMs": 6510760,
          "text": "マリンは船長って言うよねでも知らなかったじゃん今完全にさ知らなかったわけじゃないとっさに出ちゃうよやっぱりマリンって呼んでるからさあー特別なね呼び方だからねそうだよそうだよじゃあしょうがない最近最近さなんか呼び捨てで呼ぶ時もあるからさそうですねマリンのこと最近そうなってきたよねなんかさ匂わしちゃってわかりみわかりみ"
        },
        {
          "speechId": 958,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6531258,
          "sourceEndMs": 6538283,
          "text": "正常期って確かに2階に置いたら水汲んで入れるのが大変かどう考えても確かにそうだなでも1階と2階と3階に作れば?"
        },
        {
          "speechId": 959,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6538283,
          "sourceEndMs": 6539604,
          "text": "3階作る予定でいる"
        },
        {
          "speechId": 975,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6660086,
          "sourceEndMs": 6680100,
          "text": "でもちょっと蝶使い使うのが嫌だけどそうなんかもったいないよなまあいいかちょっと作っちゃう壁に掛けれるかチェックするわOKあ、ほんとだ3つはいける計算かしらこれすごいいけるのかな?"
        },
        {
          "speechId": 976,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6680100,
          "sourceEndMs": 6680400,
          "text": "いいんじゃない?"
        },
        {
          "speechId": 977,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6680400,
          "sourceEndMs": 6688706,
          "text": "開けれる開けれる開けれる痛いじゃんいいじゃんここに大容量スクラップばっかり"
        },
        {
          "speechId": 978,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6693504,
          "sourceEndMs": 6719884,
          "text": "ストレージストレージは使うからいいよねストレージいくつあっても足りんなぁいいよね作っちゃってうん作っていい作っていいびっしり3つここにね見て見てこうね壁にかけてみたすげぇ見てないじゃん先生お前すげぇすげぇ1ミリも見ないでさぁこれ何入れるこれ決めとこうよこれ待ってサメやったサメやったサメやった"
        },
        {
          "speechId": 979,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6721494,
          "sourceEndMs": 6722755,
          "text": "なんで?"
        },
        {
          "speechId": 980,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6722755,
          "sourceEndMs": 6723455,
          "text": "どうして?"
        },
        {
          "speechId": 981,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6723455,
          "sourceEndMs": 6724796,
          "text": "どこで?"
        },
        {
          "speechId": 982,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6724796,
          "sourceEndMs": 6749852,
          "text": "今普通に殺してたらやったすごいじゃんやりました壁作ったらさ頭飾れるもんねそう飾ろう飾ろう適当にさ適当じゃないすげーだって周りに言ってたじゃん君たちラグを考慮してコメントしなさいよって言ったじゃんそれは王将海賊"
        },
        {
          "speechId": 983,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6750130,
          "sourceEndMs": 6751591,
          "text": "ご飯の話でコーネは別でしょ?"
        },
        {
          "speechId": 984,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6751591,
          "sourceEndMs": 6753492,
          "text": "あ、違うの?"
        },
        {
          "speechId": 985,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6753492,
          "sourceEndMs": 6760055,
          "text": "ご飯食べようご飯食べてあ、ご飯ね、ここあ、違うよ、それ、それを小せいやつだから生酢いらない?"
        },
        {
          "speechId": 986,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6760055,
          "sourceEndMs": 6771480,
          "text": "生酢え、でもこれ食べてさ、ここにさ入れるからあの、サメの肉をえ、でもさ、これ焼かなきゃいけないんだよあ?"
        },
        {
          "speechId": 987,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6771480,
          "sourceEndMs": 6772540,
          "text": "どれ?"
        },
        {
          "speechId": 988,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6772540,
          "sourceEndMs": 6775622,
          "text": "そんな小物あるサメの肉に決まってっしょ?"
        },
        {
          "speechId": 989,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6775622,
          "sourceEndMs": 6776903,
          "text": "あらよ!"
        }
      ]
    }
  ],
  "outputContract": {
    "format": "json_only",
    "schema": {
      "themes": [
        {
          "themeId": "string",
          "title": "string",
          "reason": "string_one_sentence",
          "evidenceRanges": [
            {
              "sourceVideoId": "string",
              "sourceStartMs": "number",
              "sourceEndMs": "number",
              "supportingSpeechIds": [
                "number_or_range_string"
              ]
            }
          ]
        }
      ]
    }
  }
}
```
