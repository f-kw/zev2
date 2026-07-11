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
    "windowId": "window_52_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 8580578,
    "sourceEndMs": 8783482
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
      "promptSegmentCount": 19,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 1320,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8580578,
          "sourceEndMs": 8597842,
          "text": "よし頑張れいけいけいけいけいけどっちに流れてるんだろうなこれあっちかあれかな一回アンカーを下ろしてさ動かないようにした方がよかったりするかなこれあでも飛んでいけるから大丈夫じゃないかな飛んでいける?"
        },
        {
          "speechId": 1321,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8597842,
          "sourceEndMs": 8609864,
          "text": "迷子の子お姉さんあなたの家はどこですか"
        },
        {
          "speechId": 1322,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8610158,
          "sourceEndMs": 8615402,
          "text": "確かに葉っぱ多すぎて木の場所なくなってるわこれでしょ?"
        },
        {
          "speechId": 1323,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8615402,
          "sourceEndMs": 8624748,
          "text": "ほら未来を見据えたコメントしたのだよ確かに葉っぱの数尋常じゃねええ?"
        },
        {
          "speechId": 1324,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8624748,
          "sourceEndMs": 8639498,
          "text": "やばすぎこんな不安になるんだね一人ぼっちだったらやばすぎそうなんですだいまてよマリリンのところ見て資材流れてるよね流れてるこんなサメなんかに"
        },
        {
          "speechId": 1325,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8641822,
          "sourceEndMs": 8645305,
          "text": "風向きを見よう大丈夫?"
        },
        {
          "speechId": 1326,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8645305,
          "sourceEndMs": 8651710,
          "text": "今立ち止まるべきかマリンは悩んでいます大丈夫大丈夫?"
        },
        {
          "speechId": 1327,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8651710,
          "sourceEndMs": 8663859,
          "text": "あっちや波があっちの方向に行ってるからあっちか大丈夫水もあるしね水筒も持ってるから本当?"
        },
        {
          "speechId": 1328,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8663859,
          "sourceEndMs": 8669944,
          "text": "大丈夫だけどなこれで辿り着いたらさ感動の最下位よな嬉しいよな"
        },
        {
          "speechId": 1329,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8670100,
          "sourceEndMs": 8685933,
          "text": "船長は帰ってきてくれたらめっちゃ嬉しいよなこれマリリンの配信を見ながらなんでこれ資材なくなったん?"
        },
        {
          "speechId": 1330,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8685933,
          "sourceEndMs": 8697662,
          "text": "こうねそっか夜だから見にくいってのもあるのかもねアンカー作るかでもさこれさでもさ結構預けといてよかったわ"
        },
        {
          "speechId": 1331,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8699515,
          "sourceEndMs": 8699718,
          "text": "荷物"
        },
        {
          "speechId": 1332,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8700386,
          "sourceEndMs": 8700506,
          "text": "あ、ほんと?"
        },
        {
          "speechId": 1333,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8700506,
          "sourceEndMs": 8702366,
          "text": "え、ないっすそれはちょっと待って、一回荷物しまわないとおらよおらよ何が足りない?"
        },
        {
          "speechId": 1334,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8702366,
          "sourceEndMs": 8729872,
          "text": "石、石、石おらよ石持ってあ、月が見える方向に行った方がいいかなあ、月の方向…あ、待って待ってあ、待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って待って"
        },
        {
          "speechId": 1335,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8730218,
          "sourceEndMs": 8732779,
          "text": "場所決めて言うわあっすいませんほんとにえーとアンカーアンカーあれ?"
        },
        {
          "speechId": 1336,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8732779,
          "sourceEndMs": 8733919,
          "text": "アン…あれ?"
        },
        {
          "speechId": 1337,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8733919,
          "sourceEndMs": 8759306,
          "text": "あ拾えなかったのかちょちょちょちょっと待てよ待てよいいねごめんねおらよおらよおらよおらよいやドキドキするなこれ"
        },
        {
          "speechId": 1338,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8760034,
          "sourceEndMs": 8783482,
          "text": "待ってよ、アンカーできたあ、違うわこれディスクトップのゴミだったわで、これで落としてとなんか島が見えるけど島ないよね近くにねないね、今アンカー落としてアンカー落としましてはいあ、島見えるわ、島見えるあ、見える?"
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
