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
    "windowId": "window_07_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 1392416,
    "sourceEndMs": 1713902
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
          "speechId": 188,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1392416,
          "sourceEndMs": 1409884,
          "text": "海藻いっぱいあるいっぱいあるちょっと待って一回上がってよいしょあぁ荷物預けてくればよかったなぁ準備を怠る怠るなかれあーわしもいるわしもやばいこっちはね準備を怠ることなかれだったからね"
        },
        {
          "speechId": 189,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1410846,
          "sourceEndMs": 1427669,
          "text": "あーそれはよきかなよきかなとしか言えんあんまり詳しくないお代官様あそっち行ったどっち行った?"
        },
        {
          "speechId": 190,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1427669,
          "sourceEndMs": 1438592,
          "text": "あらよあらよあらよあらららよ戦術そっちじゃないかなあ改装めっちゃある14枚も拾ったわえ、じゃあ教えてよ何を?"
        },
        {
          "speechId": 191,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1438592,
          "sourceEndMs": 1439592,
          "text": "は?"
        },
        {
          "speechId": 192,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1439592,
          "sourceEndMs": 1439732,
          "text": "え、待って"
        },
        {
          "speechId": 193,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1440770,
          "sourceEndMs": 1469864,
          "text": "もう全部船長が取ったからねもう今更意味ないよそっちじゃない方のさ教えてよお代官様じゃない方のさそれで言うと船長が言った方の反対の方角に向かってもらうと良き島を違う違うよあれ待ってお代官様のまだその話もう終わったからその話終わったなんでごめんね"
        },
        {
          "speechId": 194,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1470194,
          "sourceEndMs": 1479457,
          "text": "終わっちゃったかいつまでそんな話してんだよやる気あるんかお前やばい待て待て仕留められるか?"
        },
        {
          "speechId": 195,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1479457,
          "sourceEndMs": 1488380,
          "text": "何かと戦い始めたいいよいいよ痛そう痛そうこっちが痛いですイノシシやってるもしかして?"
        },
        {
          "speechId": 196,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1488380,
          "sourceEndMs": 1489941,
          "text": "イノシシやってるやってんの?"
        },
        {
          "speechId": 197,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1489941,
          "sourceEndMs": 1498203,
          "text": "でも待て海の中に入っていいじゃんいいじゃん海の中で撃てばねこいつ来れねえよあサメ?"
        },
        {
          "speechId": 198,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1498203,
          "sourceEndMs": 1498864,
          "text": "あイノシシ"
        },
        {
          "speechId": 199,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1500898,
          "sourceEndMs": 1502219,
          "text": "そこから撃てばってことね?"
        },
        {
          "speechId": 200,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1502219,
          "sourceEndMs": 1503479,
          "text": "そうそうそうそう!"
        },
        {
          "speechId": 201,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1503479,
          "sourceEndMs": 1509402,
          "text": "まるで会話が噛み合ってないえ、必ずさ、守護をつけようこれからの会話守護?"
        },
        {
          "speechId": 202,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1509402,
          "sourceEndMs": 1516225,
          "text": "守護をつけようえ、イノシシここにいるえ、待ってえ、え、毒になっちゃって死ぬかもしれないマリー!"
        },
        {
          "speechId": 203,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1516225,
          "sourceEndMs": 1522709,
          "text": "え、どうぞ、どこどこどこどこどこちょっと待って、今から帰る帰る帰るマリー!"
        },
        {
          "speechId": 204,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1522709,
          "sourceEndMs": 1529752,
          "text": "俺ちょっとね、ちょっとあまりにも噛み合ってないからね今ギスギスしてるって言われて"
        },
        {
          "speechId": 205,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1530000,
          "sourceEndMs": 1534522,
          "text": "キスキスしてるって言われてる死に死にしてるけど死に死にしてる?"
        },
        {
          "speechId": 206,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1534522,
          "sourceEndMs": 1543445,
          "text": "今行くからこれさ降参して再開するって押さない方がいいんだよね押したら荷物がなくなるもう死んでんのもしかして?"
        },
        {
          "speechId": 207,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1543445,
          "sourceEndMs": 1547227,
          "text": "死んでしまった島の中?"
        },
        {
          "speechId": 208,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1547227,
          "sourceEndMs": 1554530,
          "text": "島の中でね海沿いでね砂浜があって土下座いっぱい入ってあ、竹のありけりね"
        },
        {
          "speechId": 209,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 1555302,
          "sourceEndMs": 1560000,
          "text": "そうね、マリンと逆方向に行ってたから逆に行ってたのね、OKOKO"
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
