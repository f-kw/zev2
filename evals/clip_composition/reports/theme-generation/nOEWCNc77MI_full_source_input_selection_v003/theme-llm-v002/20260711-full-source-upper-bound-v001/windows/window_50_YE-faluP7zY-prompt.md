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
    "windowId": "window_50_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 8161461,
    "sourceEndMs": 8392918
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
      "promptSegmentCount": 26,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 1268,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8161461,
          "sourceEndMs": 8189252,
          "text": "でも傷だらけやコイツそろそろ死ぬぞ回収ネットがじわじわ破壊されていってるやばいよ地道にやられてんねクソ魚も釣りたいな確かに一旦じゃじゃがいも焼いとくねありがとうレッツじゃがいもレッツじゃがいも?"
        },
        {
          "speechId": 1269,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8189252,
          "sourceEndMs": 8189532,
          "text": "ごはん"
        },
        {
          "speechId": 1270,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8190222,
          "sourceEndMs": 8219984,
          "text": "ご飯浮き場も作ろうかご飯浮き場はこの辺のこの辺のコンロそばでいい気もするよねそうね鳥居間鳥居間作るっしょ毎回何してたか忘れるんだよなこれを外して作業してんねん"
        },
        {
          "speechId": 1271,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8220478,
          "sourceEndMs": 8238666,
          "text": "してんねえゴミ箱が…これ一回開けてやることがもう無限わかる金属製松明いいなランタンだこれ2個並べること可能か?"
        },
        {
          "speechId": 1272,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8238666,
          "sourceEndMs": 8239366,
          "text": "君たち?"
        },
        {
          "speechId": 1273,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8239366,
          "sourceEndMs": 8244628,
          "text": "小さいストレージって2個横に…2個並ぶ?"
        },
        {
          "speechId": 1274,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8244628,
          "sourceEndMs": 8248250,
          "text": "早く…早く教えて"
        },
        {
          "speechId": 1275,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8254193,
          "sourceEndMs": 8279852,
          "text": "早くギリ並ぶだってここいいじゃんもっと可愛く言ってだって可愛いじゃん可愛いんだってみんななんだよその言い方可愛くないみたいだ"
        },
        {
          "speechId": 1276,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8280340,
          "sourceEndMs": 8288562,
          "text": "まるで最上級にかわいい言い方で聞いてみてよめんどくせーなーは?"
        },
        {
          "speechId": 1277,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8288562,
          "sourceEndMs": 8293363,
          "text": "ボコすぞコーネはマリの味方じゃんは?"
        },
        {
          "speechId": 1278,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8293363,
          "sourceEndMs": 8293543,
          "text": "え?"
        },
        {
          "speechId": 1279,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8293543,
          "sourceEndMs": 8294063,
          "text": "あれ?"
        },
        {
          "speechId": 1280,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8294063,
          "sourceEndMs": 8296603,
          "text": "コーネ?"
        },
        {
          "speechId": 1281,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8296603,
          "sourceEndMs": 8297264,
          "text": "いつ?"
        },
        {
          "speechId": 1282,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8297264,
          "sourceEndMs": 8300424,
          "text": "いつから味方になったと思ってんの?"
        },
        {
          "speechId": 1283,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8300424,
          "sourceEndMs": 8301124,
          "text": "え?"
        },
        {
          "speechId": 1284,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8301124,
          "sourceEndMs": 8309026,
          "text": "コーネやだやだやだかわいく言えるじゃねーかうっとうしいマジで"
        },
        {
          "speechId": 1285,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8309739,
          "sourceEndMs": 8310000,
          "text": "はあ"
        },
        {
          "speechId": 1286,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8312099,
          "sourceEndMs": 8339014,
          "text": "起こすぞ切れんの早いんだよ即切れるやん今お魚釣ってるからねありがとうこれだとニコンきついかしらねきついかしらね何がおかしいんですかいきなりお母さんみたいになったからきついかしらねうるせえ"
        },
        {
          "speechId": 1287,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8341206,
          "sourceEndMs": 8343627,
          "text": "うるせぇ?"
        },
        {
          "speechId": 1288,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8343627,
          "sourceEndMs": 8347167,
          "text": "うるせぇうるせぇ?"
        },
        {
          "speechId": 1289,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8347167,
          "sourceEndMs": 8349968,
          "text": "うるせぇからの?"
        },
        {
          "speechId": 1290,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8349968,
          "sourceEndMs": 8363551,
          "text": "うるせぇからのじゃないよサメが来たなぁもう嫌だなぁだいぶ片付いてきたよマジでほんと?"
        },
        {
          "speechId": 1291,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8363551,
          "sourceEndMs": 8369832,
          "text": "うんすっきりしてきためっちゃさすがやんめちゃめちゃいい感じさすがマリーンやさすがマリーンや"
        },
        {
          "speechId": 1292,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8370340,
          "sourceEndMs": 8389575,
          "text": "さすがマリン待って木のとこに葉っぱ入ってるけど葉っぱいいんだっけここに入れといて木のとこにあうん木葉っぱロープは一緒の区分にしてでもさ木さいっぱい入れるからさ葉っぱで溢れちゃうよそんなにあんの?"
        },
        {
          "speechId": 1293,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8389575,
          "sourceEndMs": 8392918,
          "text": "まだないけどさないならいいじゃねえかよ"
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
