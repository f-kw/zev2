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
    "windowId": "window_10_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 1628344,
    "sourceEndMs": 1804243
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
      "promptSegmentCount": 25,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 215,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1628344,
          "sourceEndMs": 1639350,
          "text": "待ってなんだあれ鹿みたいなのいたあなんか小さいのいるよな一旦ねでもね鹿には目もくれずまずコーネを探すこの褒章マリンかっこよくない?"
        },
        {
          "speechId": 216,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1639350,
          "sourceEndMs": 1643051,
          "text": "お玉重いのいい船長だねなやっぱ重う?"
        },
        {
          "speechId": 217,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1643051,
          "sourceEndMs": 1645953,
          "text": "うんちょっとねちょっとかあれどこだ?"
        },
        {
          "speechId": 218,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1645953,
          "sourceEndMs": 1648174,
          "text": "こっちだよねあのね"
        },
        {
          "speechId": 219,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1648792,
          "sourceEndMs": 1649984,
          "text": "すぐ歩いたら海沿い"
        },
        {
          "speechId": 220,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1650098,
          "sourceEndMs": 1674705,
          "text": "海になるからね海ってか海に入れるぐらいのね端っこだからね行けー砂浜だからでもこの辺だよねすまんよーしかもコーネの枠もないからマジでどこにいるかわかんない確かにあもうホントだねなーあれこれ渡ったかなーこの先コーネマリリン画面見てよマリリン画面マリリンあっそうねいやっ!"
        },
        {
          "speechId": 221,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1674705,
          "sourceEndMs": 1674985,
          "text": "あー大丈夫か!"
        },
        {
          "speechId": 222,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1674985,
          "sourceEndMs": 1675365,
          "text": "いや!"
        },
        {
          "speechId": 223,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1675365,
          "sourceEndMs": 1676285,
          "text": "ちょっと待って!"
        },
        {
          "speechId": 224,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1676285,
          "sourceEndMs": 1678906,
          "text": "イノシシというものありきりやばい!"
        },
        {
          "speechId": 225,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1678906,
          "sourceEndMs": 1679406,
          "text": "やばいなそれ"
        },
        {
          "speechId": 226,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1681322,
          "sourceEndMs": 1709632,
          "text": "そっち高いFPSみたいになってるどうどうどうこの辺あそこらへんいるかなあそこの砂浜のところこれって後ろの後ろあの渡った先この向こうにもうちょい右見てみて右右こっちあそこなんかねそこにそこにいそうな雰囲気だよねなんかねちょっと向かってみるよ"
        },
        {
          "speechId": 227,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1713542,
          "sourceEndMs": 1713902,
          "text": "あれか?"
        },
        {
          "speechId": 228,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1713902,
          "sourceEndMs": 1714583,
          "text": "あれか?"
        },
        {
          "speechId": 229,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1714583,
          "sourceEndMs": 1715304,
          "text": "あれか?"
        },
        {
          "speechId": 230,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1715304,
          "sourceEndMs": 1715564,
          "text": "いる?"
        },
        {
          "speechId": 231,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1715564,
          "sourceEndMs": 1715884,
          "text": "いた?"
        },
        {
          "speechId": 232,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1715884,
          "sourceEndMs": 1717125,
          "text": "いた?"
        },
        {
          "speechId": 233,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1717125,
          "sourceEndMs": 1739066,
          "text": "あ、よかったよーあ、よかったよーよしよしよしつまいよ、遠いかなこれイカダから大丈夫、任せろ任せたぞ運び切ってみせるやばい、水分もカラカラになってきちゃった待っててくれ、大丈夫起きれば全部回復するからいや、助かり助かり待ってるコーネなになになに"
        },
        {
          "speechId": 234,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1740386,
          "sourceEndMs": 1754895,
          "text": "やばい怖いしたやばい怖いしたイノシシいるねやばいぞこれマリリンに聞きたいんだけどさこれさまだこの島まだこの島いる?"
        },
        {
          "speechId": 235,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1754895,
          "sourceEndMs": 1758637,
          "text": "あーここにいてもいいかって話?"
        },
        {
          "speechId": 236,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1758637,
          "sourceEndMs": 1761759,
          "text": "そう捨てる?"
        },
        {
          "speechId": 237,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1761759,
          "sourceEndMs": 1769884,
          "text": "取材次第かな起きたら見てみるわどれくらい集めたかOK海藻はめっちゃ拾った"
        },
        {
          "speechId": 238,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1770426,
          "sourceEndMs": 1799772,
          "text": "なんだけどねでもまだね全然粘土もさっき見かけたしまだまだ何でもありそうではある申し訳ねーけどさほら今武器をさ手に入れたからねこれであればそうね弓ねせんきゅーベイブせんきゅーよしちょっと食べ物あーありがとう持ち歩いた方がいいかもね食べ物そうね待ってでもねちょっと残ってるこれ一個食べてこのねここのこのなんていうのあのさこのコンロじゃなくてなんだこれ洋コンロに近い"
        },
        {
          "speechId": 239,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1800000,
          "sourceEndMs": 1804243,
          "text": "このボックスの中に食べ物入ってるありがてー!"
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
