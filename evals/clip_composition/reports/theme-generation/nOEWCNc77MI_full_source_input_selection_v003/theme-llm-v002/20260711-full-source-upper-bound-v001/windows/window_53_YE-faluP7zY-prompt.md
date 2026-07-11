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
    "windowId": "window_53_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 8783482,
    "sourceEndMs": 9070932
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
      "promptSegmentCount": 18,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
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
        },
        {
          "speechId": 1343,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8805267,
          "sourceEndMs": 8818834,
          "text": "これ確かにえ、じゃ、あのさ船長のさ配信でちょっと見てよ、島のオッケーオッケー様子あ、木が生えている島かこれじゃなさそう"
        },
        {
          "speechId": 1344,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8820374,
          "sourceEndMs": 8850000,
          "text": "ダメじゃないねじゃないかあっちからアソキその島も探すわそしたらコーネと合流できない後ろにいるのかなこれうわサメなんかに死んでさぁもういっそ合流するって手もある確かにそれなぁうんそんなにサメの肉がもったいねえと思ったがまぁ別にしないよねそんなこと言ってる場合ではないぬるっと頑張って集め直せばいい"
        },
        {
          "speechId": 1345,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8850220,
          "sourceEndMs": 8875610,
          "text": "そうね、死のうかワンチャンありやでじゃあ進んでいいよ一旦コーネが帰ってきたからするわ一旦ね、一応ねさよなら、サメの肉サメならさ、この広い海にいくらでもごまんと嫌がるからな終わった、じゃあまた倒すわ何回でも殺せるさ"
        },
        {
          "speechId": 1346,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8877478,
          "sourceEndMs": 8909872,
          "text": "じゃあさせっかくだからさ深海の方に行ってみるわ何かあるかもしれないからあー確かに何かあるかもねずっと下に潜ってる超怖いこれ怖いよ息がまだねまだ深海に潜れる怖っなんかね実績ロック解除した何メートル以上潜るとみたいなのあるんだねあるのかもしれないこれいい"
        },
        {
          "speechId": 1347,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8912655,
          "sourceEndMs": 8929445,
          "text": "なかなか死なんなえ、なんかめっちゃ頑張ってる酸素、意外と切れないんだなこれね、再開すればいいんかそうだね、死んだ、あ、死んだ?"
        },
        {
          "speechId": 1348,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8929445,
          "sourceEndMs": 8930766,
          "text": "死んだどうだった?"
        },
        {
          "speechId": 1349,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8930766,
          "sourceEndMs": 8938130,
          "text": "深海なんもなかったなんもないんかい起きたかなこうね、いるか?"
        },
        {
          "speechId": 1350,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8950618,
          "sourceEndMs": 8969884,
          "text": "寂しいよゴーヌこれちょっとアンカーで外しちゃうねごめんねでぼっちにさしちゃってはい急にスンって資材使ってほらもう葉っぱのストレージになってるじゃん上のやつはそうね木ここに入れたここにあここにねそう一旦ここにした終わったじゃあちょっとこうねフック作りたいから"
        },
        {
          "speechId": 1351,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8971195,
          "sourceEndMs": 8999272,
          "text": "使ってもらってどんどん使ってくださいレディーザーを作らせてもらってこれだなこれだな確かに葉っぱって序盤めっちゃ足りなく感じたけどもうもはやもういないよなゴミかのように大量にでも今ね壁に使ってるから結構これで消化するかもしれないじゃあもっと拾おうわGoogleChromeがクラッシュしたマジ?"
        },
        {
          "speechId": 1352,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 8999272,
          "sourceEndMs": 8999552,
          "text": "OK今"
        },
        {
          "speechId": 1353,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9000054,
          "sourceEndMs": 9029018,
          "text": "再起動したで、えっと今何してたかというとあ、そうだこれ中身に移動してたんだほらよよしよしよしよしよしあー、イカダがある安心感もう大丈夫だよこうね怖くないよもう何も怖くないマジ葉っぱの量半端ないやばいよなこれなーこんなにあるでいらねーえーどこを何したんだっけ"
        },
        {
          "speechId": 1354,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9030754,
          "sourceEndMs": 9035896,
          "text": "なんだっけ?"
        },
        {
          "speechId": 1355,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9035896,
          "sourceEndMs": 9059764,
          "text": "ここがこれとここがたねえここはなこれたねえピー拾ってこれよこれよーよいしょえーあと何がいるかなー葉っぱをロープにして半分"
        },
        {
          "speechId": 1356,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 9069510,
          "sourceEndMs": 9070932,
          "text": "え、わかんない!"
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
