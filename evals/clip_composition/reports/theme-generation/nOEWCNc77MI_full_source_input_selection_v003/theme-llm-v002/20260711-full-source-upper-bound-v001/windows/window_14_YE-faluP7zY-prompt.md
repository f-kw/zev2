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
    "windowId": "window_14_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 2243688,
    "sourceEndMs": 2410728
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
      "promptSegmentCount": 28,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 318,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2243688,
          "sourceEndMs": 2249872,
          "text": "ワタメーあらーこいつすばしっこすぎるんだけどねえ助けて"
        },
        {
          "speechId": 319,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2250434,
          "sourceEndMs": 2279144,
          "text": "終わりになっちゃうよBGM変わったんですけど終わりのムード漂ってるやばいやばい終わるな終わるな待て待て待てもうちょっとディスるもうちょっとディスるわため羊の応援してんじゃないよ怖いね羊と共鳴するなうちらの応援しろうちらの応援わため待ってくれわためこれ怖くないよわため上手くない?"
        },
        {
          "speechId": 320,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2279144,
          "sourceEndMs": 2279864,
          "text": "弓壊れた"
        },
        {
          "speechId": 321,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2281058,
          "sourceEndMs": 2282338,
          "text": "もう壊れたの?"
        },
        {
          "speechId": 322,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2282338,
          "sourceEndMs": 2287059,
          "text": "待てよ待てよ待てよあ、あるある1本持ってきたんだこれあ、いける?"
        },
        {
          "speechId": 323,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2287059,
          "sourceEndMs": 2295181,
          "text": "いけるわでもかなりさダメージは入ってるはずだからもういいよよしやったー!"
        },
        {
          "speechId": 324,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2295181,
          "sourceEndMs": 2296781,
          "text": "え、なんも落とさないよこいつマジでえ?"
        },
        {
          "speechId": 325,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2296781,
          "sourceEndMs": 2298042,
          "text": "え?"
        },
        {
          "speechId": 326,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2298042,
          "sourceEndMs": 2299082,
          "text": "え?"
        },
        {
          "speechId": 327,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2299082,
          "sourceEndMs": 2301162,
          "text": "なんも落とさないよこいつはい?"
        },
        {
          "speechId": 328,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2301162,
          "sourceEndMs": 2301342,
          "text": "はい?"
        },
        {
          "speechId": 329,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2301342,
          "sourceEndMs": 2303223,
          "text": "え?"
        },
        {
          "speechId": 330,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2303223,
          "sourceEndMs": 2303643,
          "text": "え?"
        },
        {
          "speechId": 331,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2303643,
          "sourceEndMs": 2304763,
          "text": "マジ?"
        },
        {
          "speechId": 332,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2304763,
          "sourceEndMs": 2306503,
          "text": "でも最初え?"
        },
        {
          "speechId": 333,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2306503,
          "sourceEndMs": 2309464,
          "text": "私たちの私たちのこのこの"
        },
        {
          "speechId": 334,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2312978,
          "sourceEndMs": 2313398,
          "text": "こいつ!"
        },
        {
          "speechId": 335,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2313398,
          "sourceEndMs": 2315899,
          "text": "この時間なんだったの?"
        },
        {
          "speechId": 336,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2315899,
          "sourceEndMs": 2316219,
          "text": "え?"
        },
        {
          "speechId": 337,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2316219,
          "sourceEndMs": 2316840,
          "text": "ウザでしょ?"
        },
        {
          "speechId": 338,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2316840,
          "sourceEndMs": 2320201,
          "text": "ちょっと待ってコメント見てるよなんか意味あるよねえ?"
        },
        {
          "speechId": 339,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2320201,
          "sourceEndMs": 2326964,
          "text": "ワタメお前ふざけんなよなんか落とせよお前空気読め時間変わって時間え?"
        },
        {
          "speechId": 340,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2326964,
          "sourceEndMs": 2331566,
          "text": "マジかマジワタメさ謝罪してもらっていいっすか?"
        },
        {
          "speechId": 341,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2331566,
          "sourceEndMs": 2334328,
          "text": "夜になっちまったよ終わりどうしようこうね"
        },
        {
          "speechId": 342,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2362619,
          "sourceEndMs": 2364040,
          "text": "イノシシ?"
        },
        {
          "speechId": 343,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2364040,
          "sourceEndMs": 2369864,
          "text": "うんいやなつくとは到底思えないけどねやっぱワタメはほらね話が通じるけどさうん"
        },
        {
          "speechId": 344,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2371410,
          "sourceEndMs": 2399544,
          "text": "今捕獲できないんだなるほどねなんかあれねもうちょっと進んだらってことかなるほどねなるほどねどうしようこれちょっと海藻でも取りますかじゃあこの辺なんか粘土があるのを先ほど確認したのでそうねそうねじゃあ取りますかねちょっと暗いうちにあれ粘土かとも思いますから石かこれ粘土かどっちだ砂だ石石砂"
        },
        {
          "speechId": 345,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 2401186,
          "sourceEndMs": 2410728,
          "text": "そんなほらよでもさ、あんな小せえのがさ倒すの苦労したからさ猪なんてさ、化け物レベルなんじゃないの?"
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
