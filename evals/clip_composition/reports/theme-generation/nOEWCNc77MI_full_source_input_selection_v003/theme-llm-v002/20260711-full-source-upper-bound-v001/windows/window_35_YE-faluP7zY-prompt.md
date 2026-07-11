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
    "windowId": "window_35_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 5831798,
    "sourceEndMs": 6048569
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
          "speechId": 872,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5831798,
          "sourceEndMs": 5849852,
          "text": "そうだね2回にも作ろうかなワンチャンありだよね便利だよね4人でやるわけだしガラスならね砂焼けば作れるしありだなありありその意見素敵ですえっとどっかに魚が釣れなくなったあったかな砂とりあえずじゃあぶち込んで"
        },
        {
          "speechId": 873,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5852255,
          "sourceEndMs": 5871583,
          "text": "雨降ってきた雨か、今日はまた居た、亡くなったなんか全然流れてこないねあれだ、フォー開いてるからだちょっと閉じるわあ、そっかそっか、ごめんごめん、そうだそうだ何回同じこと言うねんって言うねん反省した?"
        },
        {
          "speechId": 874,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5871583,
          "sourceEndMs": 5872143,
          "text": "こうね?"
        },
        {
          "speechId": 875,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5872143,
          "sourceEndMs": 5877946,
          "text": "反省した、今反省したよしよし分かればよろしいさすがやな"
        },
        {
          "speechId": 876,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5880002,
          "sourceEndMs": 5888349,
          "text": "反省できるだがしかし学習もしないごめんなさい!"
        },
        {
          "speechId": 877,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5888349,
          "sourceEndMs": 5889129,
          "text": "サメもいる!"
        },
        {
          "speechId": 878,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5889129,
          "sourceEndMs": 5899738,
          "text": "気をつけてね落ちないように板がなくてさ砂が焼けないよ魚食べる?"
        },
        {
          "speechId": 879,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5899738,
          "sourceEndMs": 5900879,
          "text": "残されてる!"
        },
        {
          "speechId": 880,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5908790,
          "sourceEndMs": 5910000,
          "text": "流されちゃったってこと"
        },
        {
          "speechId": 881,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5910746,
          "sourceEndMs": 5939452,
          "text": "でもね、ナマズは流されなかった神やんナマズさえあればね3色いけるからなナマズでナマズ焼くねこれマリリーにあげるわえっとナマズえっとこうで美味しく焼けますようにマリリーのためによいしょ愛を込めてるそうだよ意識高いないたいたいたいたいたいたいたないかな"
        },
        {
          "speechId": 882,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5940650,
          "sourceEndMs": 5950937,
          "text": "いたねーちょっと泳いでるすぐ野生に帰るいた流れてこないな全然あ、頬畳むか畳んだ?"
        },
        {
          "speechId": 883,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5950937,
          "sourceEndMs": 5969090,
          "text": "畳んだOKOKOKあ、流れてきた流れてきたよしよしよしよしだいぶ流れてきたわね気づいたらめっちゃめっちゃすり減ってるわこれほらよ食われてる味方がゴリゴリ食われてるやばいな"
        },
        {
          "speechId": 884,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5970194,
          "sourceEndMs": 5971655,
          "text": "あいつらマジでえ、これ?"
        },
        {
          "speechId": 885,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5971655,
          "sourceEndMs": 5975696,
          "text": "あ、でもそっか止まってないとん?"
        },
        {
          "speechId": 886,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5975696,
          "sourceEndMs": 5995142,
          "text": "やめてください止まってないとさサメの餌は使えないんだもんねそうだねどうしよっかな食われないくできるんかななんか食われなくはできないんじゃない?"
        },
        {
          "speechId": 887,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 5995142,
          "sourceEndMs": 5999884,
          "text": "なんかメタリック加工みたいなのできないのかなあ、でもそれはあったけどちょっとコストが重たいから"
        },
        {
          "speechId": 888,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6000086,
          "sourceEndMs": 6012348,
          "text": "今はきついかなぁ今はとりあえずしょうがないとしてマジで板足りないなこれ大丈夫?"
        },
        {
          "speechId": 889,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6012348,
          "sourceEndMs": 6013769,
          "text": "オッケー?"
        },
        {
          "speechId": 890,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6013769,
          "sourceEndMs": 6022951,
          "text": "生酢焼けたら食べていいからねありがとういいんだよ狙ってんね見てるコーネが狙ってるところ取れないということは?"
        },
        {
          "speechId": 891,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6022951,
          "sourceEndMs": 6029732,
          "text": "いくよねめっちゃ落ちてるコーネの広手"
        },
        {
          "speechId": 892,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6030000,
          "sourceEndMs": 6038904,
          "text": "ナイスーあ、そっかごめんそうだ落としちゃうんだ整理しまーすあ、でもポテトとかビートとかだったから大丈夫?"
        },
        {
          "speechId": 893,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6038904,
          "sourceEndMs": 6044587,
          "text": "あ、よかったよかったポテト大事?"
        },
        {
          "speechId": 894,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6044587,
          "sourceEndMs": 6047348,
          "text": "サメの頭さ捨てていいと思う?"
        },
        {
          "speechId": 895,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 6047348,
          "sourceEndMs": 6048569,
          "text": "あーいらないんじゃない?"
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
