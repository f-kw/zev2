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
    "windowId": "window_08_o8rZAhARXAc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "o8rZAhARXAc",
    "sourceStartMs": 4096310,
    "sourceEndMs": 4486111
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
      "promptSegmentCount": 21,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 375,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4096310,
          "sourceEndMs": 4105949,
          "text": "ちょっとな、なや、なや、悩んでてえっとーえっとーえっとーえっとーうーんとー"
        },
        {
          "speechId": 376,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4110482,
          "sourceEndMs": 4139500,
          "text": "分かんない分かんない分かんないなちょっと全然分かんないな重さ変化ブレーキ変化"
        },
        {
          "speechId": 381,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4200714,
          "sourceEndMs": 4207479,
          "text": "1でどれくらいかマジ分からんマリン的に見た目じゃちょっとよく分かんないこれだ!"
        },
        {
          "speechId": 382,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4207479,
          "sourceEndMs": 4212203,
          "text": "えいっおーなんかいいねーなんか知らんけど良さげー!"
        },
        {
          "speechId": 383,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4212203,
          "sourceEndMs": 4215045,
          "text": "強そう!"
        },
        {
          "speechId": 384,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4215045,
          "sourceEndMs": 4226753,
          "text": "強そうですこれうんこれ強そうなんか強そうです!"
        },
        {
          "speechId": 385,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4226753,
          "sourceEndMs": 4227534,
          "text": "うん!"
        },
        {
          "speechId": 386,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4232807,
          "sourceEndMs": 4259478,
          "text": "さらに下行ってる重いやつを見せるOKじゃあ重いバージョンがこれですいくよ重い方はこうだドスンと落ちていく感じがありますねはいどうでしょうかさっきとはまた違う"
        },
        {
          "speechId": 387,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4260438,
          "sourceEndMs": 4289960,
          "text": "同じにしか見えないけどまた違うこのドスンと落ちていくんですこれということで重いわーこれよりも重いは言うとりますということでさあ皆さんこんなに違うこの2球種果たしてどっちがいいかさあ決めてまいりましょうそれでは皆さん投票で"
        },
        {
          "speechId": 388,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4290554,
          "sourceEndMs": 4319580,
          "text": "いきますよ10987654321では締め切りますはい皆さんたくさんの投票どうもありがとうございましたということでこの変化球はこれでいきますこちらの"
        },
        {
          "speechId": 389,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4321194,
          "sourceEndMs": 4348170,
          "text": "重さを削った方でいこうと思いますはいちょっとマジでわかんないけどうーんまあこれでいいということでうーん意見もよう割れたはいじゃあこれでOKで作りたいと思います"
        },
        {
          "speechId": 390,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4350706,
          "sourceEndMs": 4379860,
          "text": "えー新旧宿発ボールをはいそしてスロットに登録はいします1時間1時間経っちゃったやばいこれで1時間経っちゃったこれ迷いすぎてすいませんどうも迷いましためっちゃはい迷いましためっちゃありがとうございましたでは行きたいと思いますこれをふぶちゃんに応募させます迷いに迷った末にもう誰に応募させるかどんな弾を作るかで非常に"
        },
        {
          "speechId": 391,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4381338,
          "sourceEndMs": 4408126,
          "text": "ましたがこれで行きたいと思います甲子園はお待たせしましたこれから甲子園です大変お待たせしました初めての出来事だったいやでもありがたいことやでこんな良さげなアイテムが出たってきたっていうのはじゃあオリジナル球種習得ボールってこれをフブちゃんに覚えさせてそしてフブちゃんに今からこれを一生懸命練習指示来てくれないとまずいでこれ"
        },
        {
          "speechId": 392,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4411310,
          "sourceEndMs": 4439900,
          "text": "練習指示来ないと厳しいねかなりうんあでも今コントロールアップしてんのがうん行きましょうふぶちゃんについに行っちゃいましょうはいスーパーノヴァ行きましょううおースーパーノヴァ覚えたスーパーノヴァ"
        },
        {
          "speechId": 393,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4445458,
          "sourceEndMs": 4466549,
          "text": "わーお、脅威の切れ味でキレキレのスーパーノヴァをフブちゃん投げていく楽しいですねえ、これ、待って、これさ、あのさこれさ、きまし、あのさこれさ、1で、1でこの社員やって、もっかいスケジュール見直して1を狙う?"
        },
        {
          "speechId": 394,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4466549,
          "sourceEndMs": 4467570,
          "text": "星500乗った?"
        },
        {
          "speechId": 395,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4467570,
          "sourceEndMs": 4467950,
          "text": "ま?"
        },
        {
          "speechId": 396,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4471494,
          "sourceEndMs": 4472255,
          "text": "これMVPやっぞ!"
        },
        {
          "speechId": 397,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4472255,
          "sourceEndMs": 4474217,
          "text": "MVPやっぞ!"
        },
        {
          "speechId": 398,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4474217,
          "sourceEndMs": 4483247,
          "text": "1やってつけへんオッケオッケオッケオッケ行きましょう!"
        },
        {
          "speechId": 399,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 4483247,
          "sourceEndMs": 4486111,
          "text": "お、ミゾット社員フジキ!"
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
