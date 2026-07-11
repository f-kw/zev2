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
    "windowId": "window_42_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 7140062,
    "sourceEndMs": 7319298
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
      "promptSegmentCount": 23,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 1044,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7140062,
          "sourceEndMs": 7160328,
          "text": "ちょっとびっくりしちゃったサーバー置いていつの間にかこんなに拾ってるじゃん板も32枚あるでなOK32枚めっちゃ絨毯だって絨毯?"
        },
        {
          "speechId": 1045,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7160328,
          "sourceEndMs": 7169130,
          "text": "絨毯すごいじゃん絨毯文明が来てるな文明がやばいなこれをこうして"
        },
        {
          "speechId": 1046,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7169698,
          "sourceEndMs": 7170000,
          "text": "ありがとうございました"
        },
        {
          "speechId": 1047,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7171942,
          "sourceEndMs": 7177404,
          "text": "イノシシやりに行こうかやるんですかこれかどう?"
        },
        {
          "speechId": 1048,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7177404,
          "sourceEndMs": 7180545,
          "text": "どうする?"
        },
        {
          "speechId": 1049,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7180545,
          "sourceEndMs": 7199652,
          "text": "まあでもイノシシやるなら昼になってからかな一旦ここセーブしておくわじゃあちょっと下ワカメとか取ってこようかなOKOK行ってきまーすスクラップどっかで見たよなあ綺麗スクラップあそうだコーネがもうやってくれたのかでもそんなにスクラップなかった気がする"
        },
        {
          "speechId": 1050,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7200418,
          "sourceEndMs": 7222096,
          "text": "あ、少ないねスクラップスクラップ少ないよな海の中にあるか見てみるわこうなってくるとストレージがね作れないからねあ、やべ、水筒忘れた水筒だってあ、かわいい満足げななんだっけ?"
        },
        {
          "speechId": 1051,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7222096,
          "sourceEndMs": 7227080,
          "text": "何を入れたいから作ってるんだっけ今これ何を入れたいって言ってたっけ?"
        },
        {
          "speechId": 1052,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7227080,
          "sourceEndMs": 7228541,
          "text": "マリリー?"
        },
        {
          "speechId": 1053,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7228541,
          "sourceEndMs": 7229502,
          "text": "鉱石じゃないかったっけ?"
        },
        {
          "speechId": 1054,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7231334,
          "sourceEndMs": 7235317,
          "text": "鉱石?"
        },
        {
          "speechId": 1055,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7235317,
          "sourceEndMs": 7235397,
          "text": "違った?"
        },
        {
          "speechId": 1056,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7235397,
          "sourceEndMs": 7259298,
          "text": "君たちに聞いた方が早いかもしれないね待って、どんどん流されてるあ、砂とか粘土だった、砂とか粘土あ、砂とか粘土あ、そっか、鳥がいるんだほらよほらよほらよ砂とか粘土しまっとくかうん、こうしてで、ここに砂とか粘土ねオッケー"
        },
        {
          "speechId": 1057,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7265323,
          "sourceEndMs": 7288098,
          "text": "ブドウのベトベトとかそういうさりげないやつはさどうしようかなブドウのベトベトは逆に小さいそのさ、タンスに入れといてさあーそういう、あーなるほどねあぶねー確かにの方がいいかなーそんなんでもいらんもんねそうだね確かにツール系"
        },
        {
          "speechId": 1058,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7292063,
          "sourceEndMs": 7296965,
          "text": "あ、なんかあれか、釣竿とかやべ、めっちゃ流されてるやばい!"
        },
        {
          "speechId": 1059,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7296965,
          "sourceEndMs": 7297826,
          "text": "行くぞ!"
        },
        {
          "speechId": 1060,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7297826,
          "sourceEndMs": 7298886,
          "text": "戻るぞ!"
        },
        {
          "speechId": 1061,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7298886,
          "sourceEndMs": 7301788,
          "text": "待って、そっちに戻るからねマイ、大丈夫?"
        },
        {
          "speechId": 1062,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7301788,
          "sourceEndMs": 7303049,
          "text": "いける?"
        },
        {
          "speechId": 1063,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7303049,
          "sourceEndMs": 7306070,
          "text": "ほうね、あれするわ、回すほんと?"
        },
        {
          "speechId": 1064,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7306070,
          "sourceEndMs": 7308292,
          "text": "ほーんと?"
        },
        {
          "speechId": 1065,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7308292,
          "sourceEndMs": 7312934,
          "text": "ほーんとだよこっちに、これでいいかな?"
        },
        {
          "speechId": 1066,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 7312934,
          "sourceEndMs": 7319298,
          "text": "これたぶんじわじわ行くはずいやマジ、申し訳ねえないや、これは"
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
