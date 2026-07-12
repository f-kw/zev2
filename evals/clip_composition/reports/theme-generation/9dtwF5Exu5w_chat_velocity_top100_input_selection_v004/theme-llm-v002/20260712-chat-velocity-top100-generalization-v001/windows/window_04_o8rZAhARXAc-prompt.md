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
    "windowId": "window_04_o8rZAhARXAc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "o8rZAhARXAc",
    "sourceStartMs": 1830198,
    "sourceEndMs": 2699920
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
      "promptSegmentCount": 20,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 208,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1830198,
          "sourceEndMs": 1857638,
          "text": "確かにそうまあアンケート取ったしなアンケート取ったしなみたいな感じアンケート取ったからふーちゃんにすべきなのではって感じはあるよね"
        },
        {
          "speechId": 209,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1861155,
          "sourceEndMs": 1865434,
          "text": "あーですねー"
        },
        {
          "speechId": 210,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1878306,
          "sourceEndMs": 1889442,
          "text": "トーシュ2枚で安定させるっていうので言うと2枚目であるカエラがフォーク持ってるからでフーブちゃんが強い変化球ないからフーブちゃんに強い変化球を持たせるのがいいっていう話なんだよね"
        },
        {
          "speechId": 211,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1890554,
          "sourceEndMs": 1891874,
          "text": "ま、ふぶちゃんでいっかー!"
        },
        {
          "speechId": 212,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1891874,
          "sourceEndMs": 1892834,
          "text": "もう!"
        },
        {
          "speechId": 213,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1892834,
          "sourceEndMs": 1893655,
          "text": "ふぶちゃんでいこう!"
        },
        {
          "speechId": 214,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1893655,
          "sourceEndMs": 1896115,
          "text": "じゃあちょっとこの、みんな角度とかさ変化とかさ一緒に考えてくんね?"
        },
        {
          "speechId": 215,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1896115,
          "sourceEndMs": 1898696,
          "text": "マリには難しいわ一緒に考えてくんね?"
        },
        {
          "speechId": 216,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1898696,
          "sourceEndMs": 1919900,
          "text": "ちょ、これアンケート終了しとこうんえっと折り辺ですがふぶけで作る場合はすでに変化量がいっぱいなのでこの後に通常の1.3倍の経験値があー必要なので変化球、変化量がそっとんどん育ちます"
        },
        {
          "speechId": 219,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 1980758,
          "sourceEndMs": 2008278,
          "text": "あ、だとオリヘンはスタミナ消費一緒なんだへーオリヘンだったらスタミナ消費量変わらんらしいよ全部同じなんだってやばいもうたぶんミリシラミリシラしかいないミリシラしかいない"
        },
        {
          "speechId": 220,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2010874,
          "sourceEndMs": 2039740,
          "text": "リリカがチャットくれてるえっとリリカコロナなのにどうもありがとうごめんなコロナ中にありがとうえっとリリカが去年ボタン先輩にお伝えしたのオリジナル九州やっぱりフォークが一番強いとのことおーなるほどえ待ってちょっと相談してみようえっとちょっとコロナで今つらいと思うからチャットで送ってみるかえっと今うぶちゃん"
        },
        {
          "speechId": 223,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2101938,
          "sourceEndMs": 2129586,
          "text": "忘れてるかもしれませんけどねマリン監督はリリカの限界上卒業生なんです監督監督お久しぶりですすいませんマリンが不勉強なせいであのーこの私去年は使えなくてすいませんでしたあのーリリーフのボタンさんあかっこよかったですねいやーマリンすいませんこの私覚えられなくてうーんいやーここに来て勉強になります"
        },
        {
          "speechId": 224,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2131266,
          "sourceEndMs": 2155086,
          "text": "知ってんよマリン黙れ黙りやがれうんはいドラフトの時なんて言ってたっけえなんだったっけえいやリリカ監督のもとでいっぱい勉強できてこうしてうんコロコロに出ることができて嬉しいですかなって言ったかも"
        },
        {
          "speechId": 254,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2581422,
          "sourceEndMs": 2584625,
          "text": "次の新入生待つはないんじゃない?"
        },
        {
          "speechId": 255,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2584625,
          "sourceEndMs": 2605742,
          "text": "あ、それにした場合って春夏しかないで育成できる期間ふぶちゃんかほな古川で古川はもう去るねんこの夏でこの夏でさよならやねんうん"
        },
        {
          "speechId": 256,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2623306,
          "sourceEndMs": 2639900,
          "text": "でもイオフィンは伸びがあるからリリカもこれを見た結果伸びがあるならちょっと微妙になってきたって言ってるからいやもうフブちゃんしかないかもしれないもうフブちゃんでいくかアンケもフブちゃんだったしごめん迷って"
        },
        {
          "speechId": 257,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2640022,
          "sourceEndMs": 2668770,
          "text": "こんなにリリカも伸びがBもあるならちょっと微妙になってきたって言ってたからコメントもそう言ってたしフブちゃんかもフブちゃんムキムキにするもうしょうがない迷った"
        },
        {
          "speechId": 258,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2671078,
          "sourceEndMs": 2684228,
          "text": "のぶちゃん中途半端になりそう確かにね確かにねそう弱体化するんまー弱体化?"
        },
        {
          "speechId": 259,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2684228,
          "sourceEndMs": 2690052,
          "text": "世界大会で勝手に変化量上がるかもマジ?"
        },
        {
          "speechId": 260,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 2690052,
          "sourceEndMs": 2699920,
          "text": "までもちょっともう他も他がなもう消去法まであるうん消去法かももはやふぶちゃんね"
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
