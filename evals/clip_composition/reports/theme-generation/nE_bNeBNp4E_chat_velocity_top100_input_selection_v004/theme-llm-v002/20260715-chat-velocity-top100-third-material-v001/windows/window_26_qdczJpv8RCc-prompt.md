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
    "windowId": "window_26_qdczJpv8RCc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "qdczJpv8RCc",
    "sourceStartMs": 5521274,
    "sourceEndMs": 6143698
  },
  "sources": [
    {
      "sourceVideoId": "qdczJpv8RCc",
      "sourceUrl": "https://www.youtube.com/watch?v=qdczJpv8RCc",
      "sourceTitle": "【Liar's Bar】キミたちと初見であそぶ！視聴者参加型【ホロライブ/宝鐘マリン】",
      "transcriptKind": "local_stt",
      "language": "ja-JP",
      "durationSec": 7760.401,
      "rawSegmentCount": 23963,
      "promptSegmentCount": 21,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 750,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5521274,
          "sourceEndMs": 5549900,
          "text": "ゲーム本体は動いてんだけどキャポポが固まっちゃって画面が映らなくなるみたいなことが多々あってまあもう壊れ始めてたんだと思うかなりうん接触不力そうなのなんかね緩くて差し口がいろんなUSBで試してみたんだけどどれ挿しても緩いから多分本体が緩んでてちょっと触ると抜けちゃうみたいな"
        },
        {
          "speechId": 751,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5550642,
          "sourceEndMs": 5557326,
          "text": "こういう感じで寿命かもしれない船長と一緒で寿命?"
        },
        {
          "speechId": 752,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5557326,
          "sourceEndMs": 5564330,
          "text": "いや船長は寿命じゃねーよ賞味期限とか言われることあるけど寿命と言われることはある?"
        },
        {
          "speechId": 753,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5564330,
          "sourceEndMs": 5579920,
          "text": "ごめんちょっと三色三十六さん途中だったすいません脱線しちゃってここ最近食欲がないというお話でしたがその後退場はいかがでしょうかありがとうございます船長の美しい上向き一杯が減ったら悲しいですから"
        },
        {
          "speechId": 756,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5640458,
          "sourceEndMs": 5666212,
          "text": "もう明日見た方がいいか明日のあれかな明日はメンゲーしようかなベノムラストダンス見ようかな明日はえっとあの言ってた新人さんとのコラボ配信配信?"
        },
        {
          "speechId": 757,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5666212,
          "sourceEndMs": 5668593,
          "text": "コラボ動画?"
        },
        {
          "speechId": 758,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5668593,
          "sourceEndMs": 5669454,
          "text": "公式で出るやつ?"
        },
        {
          "speechId": 759,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5671794,
          "sourceEndMs": 5685340,
          "text": "誰と被らない時間だったらできるどれ見ればいいの?"
        },
        {
          "speechId": 760,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5685340,
          "sourceEndMs": 5688102,
          "text": "3、3に出てくるの?"
        },
        {
          "speechId": 761,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5688102,
          "sourceEndMs": 5696506,
          "text": "三部作の最後、やべえよ無理じゃん無理じゃんそれ無理やんもう"
        },
        {
          "speechId": 762,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5708050,
          "sourceEndMs": 5729900,
          "text": "いきなりスリー見るのって邪道かな邪道なんだろうか詳しい人いないかなマリン全然知らない"
        },
        {
          "speechId": 763,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5730280,
          "sourceEndMs": 5748912,
          "text": "いきなり3見ても理解できるんだろうかまぁ一旦ちょっと悩み中3からでも構わない?"
        },
        {
          "speechId": 764,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5748912,
          "sourceEndMs": 5754835,
          "text": "ちょっとちょっと悩み中悩み中です一旦悩み中ということで一つよろしくお願いします"
        },
        {
          "speechId": 769,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5824162,
          "sourceEndMs": 5828325,
          "text": "ライブ二次…あ、そうか!"
        },
        {
          "speechId": 770,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5828325,
          "sourceEndMs": 5849800,
          "text": "そうなんだなるほど把握しましたえーっと投落の祈願とソロライブの成功祈願に"
        },
        {
          "speechId": 771,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5850000,
          "sourceEndMs": 5858022,
          "text": "神宮さんへ参拝に行ってきましたところで今日はハロウィンですね今日ってハロウィンなの?"
        },
        {
          "speechId": 772,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5858022,
          "sourceEndMs": 5878446,
          "text": "明日ハロウィンじゃん明日ハロウィンなんですけどほぼスルーしてたけどハロウィンじゃん何も考えてなかったハロウィン?"
        },
        {
          "speechId": 773,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5878446,
          "sourceEndMs": 5878726,
          "text": "しまった"
        },
        {
          "speechId": 777,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5941162,
          "sourceEndMs": 5969820,
          "text": "あ、さあ船長さあ何かやってる最中でもさあ違うことが気になったらそれやり始めちゃうんだよねこれやばいよねなんか最近さあ引っ越しがあってさあ片付けてるんだけど最中にそうだあれやらないとって思ったらやり始めるからあっちこっちで30%だけ進んだものが大量にあってでぐるぐる回りながら一つずつ片付けていくのうんでもね結局全部片付けてる"
        },
        {
          "speechId": 778,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 5970002,
          "sourceEndMs": 5992736,
          "text": "片付けよう1個ずつ片付けていくあ、そうだあれもこれもってやってるうちに1個ずつ片付いていって一応全部片付けはするの綺麗にはなるんだけどやりかけでいろんなことやり始めちゃう困ったもんですえ、なんか無意識にまた服脱いでたけど寒い気をこうしてと"
        },
        {
          "speechId": 785,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 6120290,
          "sourceEndMs": 6143698,
          "text": "老日当選もありがとう先日誕生日を迎えたのでぜひロリマリンちゃんにお祝いしてもらいたいです名前はゆうくんでお願いしますネットリテラシーが突然の詩いきますゆうくんお誕生日おめでとうゆうくんはマリンタンのこと好きなの?"
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
