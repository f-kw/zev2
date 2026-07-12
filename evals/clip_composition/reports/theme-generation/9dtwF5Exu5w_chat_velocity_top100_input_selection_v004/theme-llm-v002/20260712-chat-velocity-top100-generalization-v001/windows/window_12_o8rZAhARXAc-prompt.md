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
    "windowId": "window_12_o8rZAhARXAc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "o8rZAhARXAc",
    "sourceStartMs": 5834110,
    "sourceEndMs": 6359980
  },
  "sources": [
    {
      "sourceVideoId": "o8rZAhARXAc",
      "sourceUrl": "https://www.youtube.com/watch?v=o8rZAhARXAc",
      "sourceTitle": "【 #ホロライブ甲子園2025】2年目夏！！夏合宿と甲子園初戦で狙え育成上振れ！！【ホロライブ/宝鐘マリン】",
      "transcriptKind": "local_stt",
      "language": "ja-JP",
      "durationSec": 11898.441,
      "rawSegmentCount": 34507,
      "promptSegmentCount": 26,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 587,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 5834110,
          "sourceEndMs": 5848959,
          "text": "もちろん悪くないお祭りはとこ悪くないいちいちで踏めるぞこれいちいちで踏んでいくか全部お調子者いなかったかも"
        },
        {
          "speechId": 588,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 5850898,
          "sourceEndMs": 5873785,
          "text": "これどっちでもいいよね、別に悪くはないよね、決して別にどっちでもいいよね、これ気持ちいいOKOKOK個別TOKOKOK今日張り切ってる3人!"
        },
        {
          "speechId": 589,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 5873785,
          "sourceEndMs": 5874705,
          "text": "リト!"
        },
        {
          "speechId": 590,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 5874705,
          "sourceEndMs": 5875806,
          "text": "アマノ!"
        },
        {
          "speechId": 591,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 5875806,
          "sourceEndMs": 5876366,
          "text": "フブキュン!"
        },
        {
          "speechId": 608,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6002550,
          "sourceEndMs": 6005292,
          "text": "テンション上がった?"
        },
        {
          "speechId": 609,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6005292,
          "sourceEndMs": 6005713,
          "text": "監督!"
        },
        {
          "speechId": 610,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6005713,
          "sourceEndMs": 6007635,
          "text": "夏の甲子園大会がいよいよ始まります!"
        },
        {
          "speechId": 611,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6007635,
          "sourceEndMs": 6009817,
          "text": "強豪揃いでどこも手強いですが必ず勝ちましょう!"
        },
        {
          "speechId": 612,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6009817,
          "sourceEndMs": 6010978,
          "text": "いやー所詮ハイタイは嫌だ!"
        },
        {
          "speechId": 613,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6010978,
          "sourceEndMs": 6011018,
          "text": "お?"
        },
        {
          "speechId": 614,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6011018,
          "sourceEndMs": 6011298,
          "text": "え、誰にしよう?"
        },
        {
          "speechId": 615,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6011298,
          "sourceEndMs": 6023529,
          "text": "いや、これ誰かな?"
        },
        {
          "speechId": 616,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6023529,
          "sourceEndMs": 6026091,
          "text": "コロネかな?"
        },
        {
          "speechId": 617,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6026091,
          "sourceEndMs": 6028754,
          "text": "でもお調子者お祭りできるよ、いつでも"
        },
        {
          "speechId": 618,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6037366,
          "sourceEndMs": 6059980,
          "text": "座はアベヒ大山は乗ってますお調子者です超ノリノリだし大山OK大山ねトイレうんトイレ行きたいトイレ行きたーいあみんないいじゃんいいじゃんえめっちゃやばい向こうの学校超真顔です"
        },
        {
          "speechId": 627,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6240322,
          "sourceEndMs": 6269840,
          "text": "あのさあのさあのさあのさかかとでさじかにさまた押さえてるわけないよねパンツとさパンツとさあのーあのあれ履いてるあれをさスカートをさね2枚こしてまいいよもうお前らに言っても意味ないお前らに何言っても意味ないもう分かってくれないならもういいいくぜ染み出てねえよ漏らしてねえつって"
        },
        {
          "speechId": 628,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6271239,
          "sourceEndMs": 6281687,
          "text": "シミ出てねーんだよ行くぜ頼むで!"
        },
        {
          "speechId": 629,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6281687,
          "sourceEndMs": 6284348,
          "text": "ザサミ商業!"
        },
        {
          "speechId": 630,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6284348,
          "sourceEndMs": 6288972,
          "text": "沖縄かよ!"
        },
        {
          "speechId": 631,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6288972,
          "sourceEndMs": 6293835,
          "text": "どいつもこいつも似た顔しやがって負けてらんねん総合力戦力B!"
        },
        {
          "speechId": 632,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6293835,
          "sourceEndMs": 6296257,
          "text": "おい今日初めて出てくる長谷川!"
        },
        {
          "speechId": 633,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6296257,
          "sourceEndMs": 6299360,
          "text": "お前初めてのくせにちょ、やばいやばい1点取られた"
        },
        {
          "speechId": 634,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6305196,
          "sourceEndMs": 6329174,
          "text": "右の杉山マウンドに上がりました今日は配球にも注目したいと思います1回の裏パイレーツ攻撃に入ります先頭バッターは大山あれ黄色い声援だお祭り男と勘違いしてたちょっと見るか相手でも強っ強っバランスよ強っ"
        },
        {
          "speechId": 635,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6336132,
          "sourceEndMs": 6359100,
          "text": "あ、強あ、ツッツヨツヨスーヨ肩Dツッツヨツヨスーヨバランスよく強いな向こうにもスワいるんだけどやべえよ全員星300ぐらいある全員星300あるこれマン?"
        },
        {
          "speechId": 636,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 6359100,
          "sourceEndMs": 6359980,
          "text": "あ、こいつだけエラー"
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
