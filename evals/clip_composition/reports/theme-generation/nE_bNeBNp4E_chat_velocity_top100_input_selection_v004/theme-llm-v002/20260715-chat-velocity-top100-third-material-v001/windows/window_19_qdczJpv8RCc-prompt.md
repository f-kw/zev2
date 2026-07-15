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
    "windowId": "window_19_qdczJpv8RCc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "qdczJpv8RCc",
    "sourceStartMs": 3253312,
    "sourceEndMs": 3566277
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
      "promptSegmentCount": 25,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 567,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3253312,
          "sourceEndMs": 3269262,
          "text": "3話で退場するどころか1話で退場してったぞキングいや最初からマリンに向かってライアって言ってくるわけないじゃんリスナーメタ読みよ"
        },
        {
          "speechId": 568,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3270226,
          "sourceEndMs": 3299980,
          "text": "言ってこないからいきなりは初手は言ってこないんだから1話の冒頭で1話の冒頭で死んでしまった雄大に思いを馳せないかせっかく入ってきてこいつ一体なんだったんだ1秒で死んだぞあのねイルフィンさん君は信じてるさっきも真面目にプレイしてたのが見れた"
        },
        {
          "speechId": 569,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3302524,
          "sourceEndMs": 3304064,
          "text": "一旦ここで真面目に出すか"
        },
        {
          "speechId": 570,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3330060,
          "sourceEndMs": 3332601,
          "text": "んじゃちょっと持ってんじゃないの?"
        },
        {
          "speechId": 571,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3332601,
          "sourceEndMs": 3336241,
          "text": "ツーは持ってんじゃないの?"
        },
        {
          "speechId": 572,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3336241,
          "sourceEndMs": 3338722,
          "text": "イルフィンさんえ?"
        },
        {
          "speechId": 573,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3338722,
          "sourceEndMs": 3339682,
          "text": "信じるの?"
        },
        {
          "speechId": 574,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3339682,
          "sourceEndMs": 3349885,
          "text": "逆にイルフィンさん怪しいなぁどうしたの?"
        },
        {
          "speechId": 575,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3349885,
          "sourceEndMs": 3355306,
          "text": "小さく首振っちゃって自信がないんでしょう自信がないんでしょう"
        },
        {
          "speechId": 576,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3368319,
          "sourceEndMs": 3373202,
          "text": "ユーダイそっち行くよ1は冒頭で死んだユーダイと"
        },
        {
          "speechId": 577,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3390086,
          "sourceEndMs": 3397991,
          "text": "今まで死んだマリンねぇ、ないこれ?"
        },
        {
          "speechId": 578,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3397991,
          "sourceEndMs": 3415941,
          "text": "見れるあ、見れる見づらなーんでー"
        },
        {
          "speechId": 579,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3420414,
          "sourceEndMs": 3449960,
          "text": "ねえ早く決着つけてもっともっと疑えよライアーしろライアーライアーしろしろしろしろなあ何信頼関係気づいてんだよお前ら取引先じゃねえんだからライアーしてけそうそれでいいんだよあれエルフィンさん怒ってんのもしかしてマリンは"
        },
        {
          "speechId": 580,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3450142,
          "sourceEndMs": 3476566,
          "text": "悪くないよ大丈夫耐えるほら耐えしてさこんなのさ簡単には死なないよ大丈夫なんだから安心してさ言ってこう声上げてこうライアーしてこう"
        },
        {
          "speechId": 581,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3480898,
          "sourceEndMs": 3481979,
          "text": "暑!"
        },
        {
          "speechId": 582,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3481979,
          "sourceEndMs": 3501013,
          "text": "クーラーつけようこんな寒いけどねー防音の部屋にねーこうやって引きこもってるとねー暑いんだよ嘘っぽいけどねーあー嘘っぽ嘘っぽでもイルフィンさんもうマリンのことは信じてくれないんでしょ?"
        },
        {
          "speechId": 583,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3501013,
          "sourceEndMs": 3507758,
          "text": "さっき嫌な思いしたから死にかけたからもうマリンのこと信じてくれないんだこれ嘘じゃんこれ嘘"
        },
        {
          "speechId": 584,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3510418,
          "sourceEndMs": 3518022,
          "text": "これ嘘じゃんこれ嘘じゃんなんで疑わないわけ?"
        },
        {
          "speechId": 585,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3518022,
          "sourceEndMs": 3523365,
          "text": "嘘じゃんこんなんだよね?"
        },
        {
          "speechId": 586,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3523365,
          "sourceEndMs": 3526427,
          "text": "え?"
        },
        {
          "speechId": 587,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3526427,
          "sourceEndMs": 3528208,
          "text": "なんだよ!"
        },
        {
          "speechId": 588,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3528208,
          "sourceEndMs": 3532990,
          "text": "マリンが悪いってか?"
        },
        {
          "speechId": 589,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3532990,
          "sourceEndMs": 3536432,
          "text": "マリンは悪くないよね?"
        },
        {
          "speechId": 590,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3536432,
          "sourceEndMs": 3539274,
          "text": "いいじゃん生きてんだから生きてんならいいじゃん"
        },
        {
          "speechId": 591,
          "sourceVideoId": "qdczJpv8RCc",
          "sourceStartMs": 3555930,
          "sourceEndMs": 3566277,
          "text": "この勝負に勝った方がこの勝負に勝った方何かかけないか君たちさなんかかけてよ"
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
