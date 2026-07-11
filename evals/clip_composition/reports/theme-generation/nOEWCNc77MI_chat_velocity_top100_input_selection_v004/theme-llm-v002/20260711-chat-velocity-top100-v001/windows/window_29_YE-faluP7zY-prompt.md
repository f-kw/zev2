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
    "windowId": "window_29_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 8499668,
    "sourceEndMs": 8805267
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
          "speechId": 1305,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8499668,
          "sourceEndMs": 8500388,
          "text": "はい!"
        },
        {
          "speechId": 1306,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8500388,
          "sourceEndMs": 8501609,
          "text": "やっつけたり!"
        },
        {
          "speechId": 1307,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8501609,
          "sourceEndMs": 8503190,
          "text": "それやったの?"
        },
        {
          "speechId": 1308,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8503190,
          "sourceEndMs": 8516178,
          "text": "それやりましたマリンがやられて嫌な気持ちしてたからやってくれたんだそうだよ、やったんだよ今、水中でねありがとう、コンネいいんだよ、待って船見失ったわ嘘でしょ?"
        },
        {
          "speechId": 1309,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8520662,
          "sourceEndMs": 8522783,
          "text": "マリン?"
        },
        {
          "speechId": 1310,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8522783,
          "sourceEndMs": 8522823,
          "text": "ん?"
        },
        {
          "speechId": 1311,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8522823,
          "sourceEndMs": 8529665,
          "text": "船なくなったけど嘘、マリン?"
        },
        {
          "speechId": 1312,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8529665,
          "sourceEndMs": 8533386,
          "text": "こうね、こうねー!"
        },
        {
          "speechId": 1313,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8533386,
          "sourceEndMs": 8533906,
          "text": "マリン!"
        },
        {
          "speechId": 1314,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8533906,
          "sourceEndMs": 8534426,
          "text": "ジャンプして、ジャンプ!"
        },
        {
          "speechId": 1315,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8534426,
          "sourceEndMs": 8541208,
          "text": "待って、どこだ?"
        },
        {
          "speechId": 1316,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8541208,
          "sourceEndMs": 8546149,
          "text": "もうサメなんて追っかけますから!"
        },
        {
          "speechId": 1317,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8546149,
          "sourceEndMs": 8547290,
          "text": "どこ?"
        },
        {
          "speechId": 1318,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8547290,
          "sourceEndMs": 8548450,
          "text": "ジャンプして、ジャンプ!"
        },
        {
          "speechId": 1319,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8550290,
          "sourceEndMs": 8577698,
          "text": "待ってここでサメが死んだからーどっちに向かったんだろうなこれあっなんだカメいるカメえカメいいじゃんうわカメだわでもサメ殺したからね今ねちょっとあれよ平和よあそっか平和あ分かった資材が流れてくる方向に行けば船にたどり着くのではあなるほどそういう発想あるよしよしよしよしさあねここは確かに畳んでるから"
        },
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
          "speechId": 1338,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8760034,
          "sourceEndMs": 8783482,
          "text": "待ってよ、アンカーできたあ、違うわこれディスクトップのゴミだったわで、これで落としてとなんか島が見えるけど島ないよね近くにねないね、今アンカー落としてアンカー落としましてはいあ、島見えるわ、島見えるあ、見える?"
        },
        {
          "speechId": 1339,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8783482,
          "sourceEndMs": 8790000,
          "text": "見える島、ちっちゃい島で、今ね夕日が、どっち方向ってなんて言えばいいの"
        },
        {
          "speechId": 1340,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8790060,
          "sourceEndMs": 8798884,
          "text": "これ、コンパスもないからさ島が見えるでしょあ、こっち?"
        },
        {
          "speechId": 1341,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8798884,
          "sourceEndMs": 8800185,
          "text": "島で合流する?"
        },
        {
          "speechId": 1342,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8800185,
          "sourceEndMs": 8805267,
          "text": "島にさ、漂着して待ってよそうね、島これ、同じ島なんかな?"
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
