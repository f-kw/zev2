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
    "windowId": "window_22_o8rZAhARXAc",
    "reason": "元配信全体入力が長いため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 13084,
    "overlapMs": 0,
    "sourceVideoId": "o8rZAhARXAc",
    "sourceStartMs": 9539326,
    "sourceEndMs": 10395149
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
      "promptSegmentCount": 25,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 1032,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9539326,
          "sourceEndMs": 9539826,
          "text": "今か?"
        },
        {
          "speechId": 1079,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9900438,
          "sourceEndMs": 9926026,
          "text": "タイミングいいからやってるだけなんだがえっとじゃあうんなたんで着地してこれでokはいでーまあ転がすかじゃあ転がすか緊張するけど第2球投げました2球目ストレイク"
        },
        {
          "speechId": 1080,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9930638,
          "sourceEndMs": 9931938,
          "text": "5なし!"
        },
        {
          "speechId": 1081,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9931938,
          "sourceEndMs": 9932378,
          "text": "いける!"
        },
        {
          "speechId": 1082,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9932378,
          "sourceEndMs": 9934199,
          "text": "いける!"
        },
        {
          "speechId": 1083,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9934199,
          "sourceEndMs": 9935939,
          "text": "いける!"
        },
        {
          "speechId": 1084,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9935939,
          "sourceEndMs": 9936440,
          "text": "あー取られたー!"
        },
        {
          "speechId": 1085,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9936440,
          "sourceEndMs": 9937780,
          "text": "すごい反応よ!"
        },
        {
          "speechId": 1086,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 9937780,
          "sourceEndMs": 9958466,
          "text": "普通今のって股の間をコロコロと転がっていくやつやんえ、今の上手すぎるなー、よう取ったなー今の取られたならもう、もうどうしようもないでこれーんー、伝令使うにしてもな、2アウトかなー"
        },
        {
          "speechId": 1124,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10200086,
          "sourceEndMs": 10222216,
          "text": "どうするか臭いところはコントロールが必要これ心配やなちょっとコントロールあんま良くないDなんだよな一旦臭いところうわめっちゃ走ってるめっちゃ走ってる取れるか?"
        },
        {
          "speechId": 1125,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10222216,
          "sourceEndMs": 10222456,
          "text": "取れるか?"
        },
        {
          "speechId": 1126,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10222456,
          "sourceEndMs": 10222697,
          "text": "取れるか?"
        },
        {
          "speechId": 1127,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10222697,
          "sourceEndMs": 10222797,
          "text": "取れるか?"
        },
        {
          "speechId": 1128,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10222797,
          "sourceEndMs": 10229400,
          "text": "ランナー1塁に戻りますはいカミこれでワンアウトランナーは1塁変わりませんひよどしカミ"
        },
        {
          "speechId": 1129,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10230000,
          "sourceEndMs": 10257434,
          "text": "数字悪い数字悪い数字悪いおまかせしかないかこれ数字悪すぎるないくらなんでも数字悪すぎるおまかせしかないよねこの数字じゃどうしようもないよなこれはもうおまよんしかないよねもうこれはしょうがないねお願いします"
        },
        {
          "speechId": 1136,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10322284,
          "sourceEndMs": 10324285,
          "text": "今のストライクなんだ!"
        },
        {
          "speechId": 1137,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10324285,
          "sourceEndMs": 10331751,
          "text": "かなりボールに見えたおぉおぉおぉおぉおぉおぉおぉあ、当たりたけどこれ大丈夫大丈夫!"
        },
        {
          "speechId": 1138,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10331751,
          "sourceEndMs": 10337776,
          "text": "あ、あ、待って大丈夫!"
        },
        {
          "speechId": 1139,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10337776,
          "sourceEndMs": 10349886,
          "text": "えぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇぇ"
        },
        {
          "speechId": 1140,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10350502,
          "sourceEndMs": 10379920,
          "text": "最悪なんだけど最悪なんだけど数字も悪いしどうすんのこれ助けてやばいですけどこれまずいまあ今のいけただろ絶対今のいけただろ守備伝令はなんだったんだうんまあ低めかな数字は良くないけどいきますか"
        },
        {
          "speechId": 1141,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10385201,
          "sourceEndMs": 10393267,
          "text": "しょうがないからねえ、やばくない?"
        },
        {
          "speechId": 1142,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10393267,
          "sourceEndMs": 10393547,
          "text": "取れる?"
        },
        {
          "speechId": 1143,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10393547,
          "sourceEndMs": 10394228,
          "text": "いける?"
        },
        {
          "speechId": 1144,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10394228,
          "sourceEndMs": 10394648,
          "text": "ナイス!"
        },
        {
          "speechId": 1145,
          "sourceVideoId": "o8rZAhARXAc",
          "sourceStartMs": 10394648,
          "sourceEndMs": 10395149,
          "text": "よう取ってくれた!"
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
