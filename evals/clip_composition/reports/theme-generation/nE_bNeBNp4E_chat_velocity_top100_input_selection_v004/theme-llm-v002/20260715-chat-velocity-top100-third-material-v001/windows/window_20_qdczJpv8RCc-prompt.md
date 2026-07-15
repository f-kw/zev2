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
    "windowId": "window_20_qdczJpv8RCc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "qdczJpv8RCc",
    "sourceStartMs": 3570074,
    "sourceEndMs": 3875096
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
      "promptSegmentCount": 29,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 592,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3570074,
          "sourceEndMs": 3599082,
          "text": "名前が見づらいんだよな最初のマリンの視点にマリンの視点に戻したい名前が読めねぇなんか賭けてよこの勝負すでに命賭けてるいやいやいやいや推しの命を賭ける推しの命を"
        },
        {
          "speechId": 593,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3603808,
          "sourceEndMs": 3607130,
          "text": "押しの命を懸けて戦え!"
        },
        {
          "speechId": 594,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3607130,
          "sourceEndMs": 3609432,
          "text": "押しの命を懸けて!"
        },
        {
          "speechId": 595,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3609432,
          "sourceEndMs": 3629786,
          "text": "イルフィンさん押しの命が危ないね押しの命…耐えたか船長の…船長とは限らんじゃん!"
        },
        {
          "speechId": 596,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3634286,
          "sourceEndMs": 3658398,
          "text": "言っとくけど、箱押しだったら全員死ぬからいいね推しの命かけてるねイルフィン恐れてるねそんなに推しの命が大切か?"
        },
        {
          "speechId": 597,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3662854,
          "sourceEndMs": 3685059,
          "text": "誰も死なんだろう名前から予想するか名前から誰だと思う?"
        },
        {
          "speechId": 598,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3685059,
          "sourceEndMs": 3688340,
          "text": "気持ちいい外しちゃったねイオフィ"
        },
        {
          "speechId": 599,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3690738,
          "sourceEndMs": 3693400,
          "text": "来るかな?"
        },
        {
          "speechId": 600,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3693400,
          "sourceEndMs": 3697102,
          "text": "キツネだからフブちゃん…あっ!"
        },
        {
          "speechId": 601,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3697102,
          "sourceEndMs": 3699083,
          "text": "エルフィンさん、フブちゃん、スコンブ?"
        },
        {
          "speechId": 602,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3699083,
          "sourceEndMs": 3700904,
          "text": "あぁ、違った!"
        },
        {
          "speechId": 603,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3705598,
          "sourceEndMs": 3706499,
          "text": "いやこれキツネ?"
        },
        {
          "speechId": 604,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3706499,
          "sourceEndMs": 3710145,
          "text": "違うフェニック?"
        },
        {
          "speechId": 605,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3710145,
          "sourceEndMs": 3711187,
          "text": "わかんなかった結局?"
        },
        {
          "speechId": 606,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3711187,
          "sourceEndMs": 3719840,
          "text": "気になるな気になる感じで気になる感じで終わってたじゃあ"
        },
        {
          "speechId": 607,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3724883,
          "sourceEndMs": 3749940,
          "text": "デビルで最後にもう一回やりましょう最後にもう一デビルやりましょうこれで最後にしたいと思いますきまよしこぞって参加してください準備できたかな今度は推し聞いておこう難しくないだってそのあたりで"
        },
        {
          "speechId": 608,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3750042,
          "sourceEndMs": 3750562,
          "text": "誰だれ?"
        },
        {
          "speechId": 609,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3750562,
          "sourceEndMs": 3751243,
          "text": "誰だれ?"
        },
        {
          "speechId": 610,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3751243,
          "sourceEndMs": 3752083,
          "text": "誰だれ?"
        },
        {
          "speechId": 611,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3752083,
          "sourceEndMs": 3754725,
          "text": "って聞かなきゃいけないよ大変じゃない?"
        },
        {
          "speechId": 612,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3754725,
          "sourceEndMs": 3772374,
          "text": "ちょっとうわこれあれだわ着けると寒い器用木で聞くなるほど確かにあり"
        },
        {
          "speechId": 615,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3840042,
          "sourceEndMs": 3858913,
          "text": "スイちゃんの命をかけて戦うのねスイちゃんの命ねうんうんじゃねーよかけんなスイちゃんの命ツッキさん今スイちゃんの命をかけて戦ってますじゃああとは1期生?"
        },
        {
          "speechId": 616,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3858913,
          "sourceEndMs": 3860294,
          "text": "推し1期生?"
        },
        {
          "speechId": 617,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3860294,
          "sourceEndMs": 3867959,
          "text": "残りの2人違う違う2期生違う?"
        },
        {
          "speechId": 618,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3867959,
          "sourceEndMs": 3869740,
          "text": "2期生?"
        },
        {
          "speechId": 619,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3869740,
          "sourceEndMs": 3869860,
          "text": "違う"
        },
        {
          "speechId": 620,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3870834,
          "sourceEndMs": 3873576,
          "text": "3期生!"
        },
        {
          "speechId": 621,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3873576,
          "sourceEndMs": 3874116,
          "text": "わかった!"
        },
        {
          "speechId": 622,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3874116,
          "sourceEndMs": 3875096,
          "text": "青あんどんさん!"
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
