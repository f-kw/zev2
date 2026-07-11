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
    "windowId": "window_04_YE-faluP7zY",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "YE-faluP7zY",
    "sourceStartMs": 700804,
    "sourceEndMs": 860065
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
          "speechId": 64,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 700804,
          "sourceEndMs": 706967,
          "text": "島にあ、でも確かに木を凝るという発想はあるよねちょっと乗ってもいいかも乗ってもいいよね待って!"
        },
        {
          "speechId": 65,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 706967,
          "sourceEndMs": 707387,
          "text": "サメが!"
        },
        {
          "speechId": 66,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 707387,
          "sourceEndMs": 708367,
          "text": "あー!"
        },
        {
          "speechId": 67,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 708367,
          "sourceEndMs": 709128,
          "text": "あー!"
        },
        {
          "speechId": 68,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 709128,
          "sourceEndMs": 709448,
          "text": "いる?"
        },
        {
          "speechId": 69,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 709448,
          "sourceEndMs": 709768,
          "text": "食べてる?"
        },
        {
          "speechId": 70,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 709768,
          "sourceEndMs": 710288,
          "text": "食べてる?"
        },
        {
          "speechId": 71,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 710288,
          "sourceEndMs": 712989,
          "text": "うん、余裕で食べられたわマジ?"
        },
        {
          "speechId": 72,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 712989,
          "sourceEndMs": 719632,
          "text": "でもちょっとどうなんだろうこうやって氷河素材使って作ってもさ結局さ、食われるんだよなしっかりした土台"
        },
        {
          "speechId": 73,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 720866,
          "sourceEndMs": 748894,
          "text": "もしかしてなんか土台アーマーっていうので作るべきかもしかして土台アーマーとかあるんだえ、待ってこれ金属だわ金属重てえあ、でもやっぱ金属大事よこれ島ついたらうん下潜るかサメの餌作ってあ、待ってあれ作るわアンカー作りますお願いします一旦あれだね釣りもしなきゃだねあ、そう釣りもしたいねでも食料ねあれ食料庫にまだあったよありましたありましたとアンカー"
        },
        {
          "speechId": 74,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 752798,
          "sourceEndMs": 779564,
          "text": "アンカーちょっと食べていくか食べて、アンカーアンカーどこやねんアンカーどこやねんアンカーあったですありましたですか作れましたですナイスです降ろしちゃうよこれいいよここです何食べようかな、マナマナカツオ食べよう今ちょっとゴーディ誘ってくる誘ってやってくるじゃねえよ木探してくるわあ、オッケーあれ持ってる?"
        },
        {
          "speechId": 75,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 779564,
          "sourceEndMs": 779884,
          "text": "あのー"
        },
        {
          "speechId": 76,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 780346,
          "sourceEndMs": 809552,
          "text": "斧持ってるんだなこれが多いでしょすごいすごい独り立ちの日だよもう独り立ちの日かそうだよ良かったね独り立ちコロさんがちゃんと作ってるってもう成長を感じてほしいねコネいや結構ねあれだからねコネはね頑張ってるからねここで頑張ってるんだよなユウってねめちゃめちゃ集めるのも早いしうちの有能だからねしっかり船長がフォローしとくからコネのことサンキューな"
        },
        {
          "speechId": 77,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 810330,
          "sourceEndMs": 817353,
          "text": "えっとちょっと待ってココナッツしか取れねぇよ食料確かにちょっとしけてきたなあでも足りない?"
        },
        {
          "speechId": 78,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 817353,
          "sourceEndMs": 818634,
          "text": "しけしけになってきた?"
        },
        {
          "speechId": 79,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 818634,
          "sourceEndMs": 822236,
          "text": "ちょっと若干了解あ!"
        },
        {
          "speechId": 80,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 822236,
          "sourceEndMs": 823876,
          "text": "鳥殺した!"
        },
        {
          "speechId": 81,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 823876,
          "sourceEndMs": 824557,
          "text": "鳥殺したの?"
        },
        {
          "speechId": 82,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 824557,
          "sourceEndMs": 825157,
          "text": "食べれる?"
        },
        {
          "speechId": 83,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 825157,
          "sourceEndMs": 839584,
          "text": "食べれる食べれるちょっと待って鳥肉が絶対取れる食べてみて食べてみてOKOKOKOKちゃんと火通すんよOKあ、こんなとこでサメ肉3つあんじゃんラッキーラッキーラッキーじゃなくてラッキーとかじゃないねあ、サメ倒してたねそういえばね"
        },
        {
          "speechId": 84,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 840194,
          "sourceEndMs": 840494,
          "text": "完全忘れてたよね?"
        },
        {
          "speechId": 85,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 840494,
          "sourceEndMs": 859444,
          "text": "ちょっと待って、これ焼いてとこれちょっと拾ってともうちょっと一個食べてとなるほどねで、閉まってちょっとサメ肉閉まってで、このチキンを焼いてとやばっ!"
        },
        {
          "speechId": 86,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 859444,
          "sourceEndMs": 859605,
          "text": "くっそー!"
        },
        {
          "speechId": 87,
          "sourceVideoId": "YE-faluP7zY",
          "sourceStartMs": 859605,
          "sourceEndMs": 860065,
          "text": "どうした?"
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
