# theme_generation_prompt_v001

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
- 迷う候補は `riskNotes` に弱点を書く。

## 出力

JSONだけを返す。説明文やMarkdownを付けない。

`requestedThemeCount` が指定されている場合は、その件数を上限にする。良い候補が足りない場合は、無理に埋めない。

```json
{
  "themes": [
    {
      "themeId": "theme_001",
      "title": "短いテーマ名",
      "summary": "何が見どころなのか",
      "whyItCanBeClipped": "切り抜きとして成立すると判断した理由",
      "sourceVideoId": "元動画ID",
      "sourceStartMs": 123000,
      "sourceEndMs": 153000,
      "supportingSpeechIds": ["12-47", 52, "55-60"],
      "representativeQuote": "根拠になる短い本文",
      "riskNotes": [
        "前後文脈が必要"
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

- `sourceStartMs` は根拠発話範囲の最初の時刻にする。
- `sourceEndMs` は根拠発話範囲の最後の時刻にする。
- 正解境界を当てる評価ではないが、後段の機械判定でexpected区間との重なりを見るため、候補根拠の範囲を本文に基づいて正しく出す。

## 入力JSON

```json
{
  "task": "source_only_theme_generation",
  "generationSystem": "theme-llm-v001",
  "promptVersion": "theme_generation_prompt_v001",
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
    "windowId": "window_05_vWv9H-hfHXo",
    "reason": "未分割入力でEdgeレンダラが高負荷化して戻らなかったため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 340000,
    "overlapMs": 180000,
    "sourceVideoId": "vWv9H-hfHXo",
    "sourceStartMs": 13421090,
    "sourceEndMs": 19944810
  },
  "sources": [
    {
      "sourceVideoId": "vWv9H-hfHXo",
      "sourceUrl": "https://www.youtube.com/live/vWv9H-hfHXo?feature=share",
      "transcriptKind": "youtube_auto_caption",
      "language": "ja",
      "rawSegmentCount": 17356,
      "promptSegmentCount": 709,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 1424,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13421090,
          "sourceEndMs": 13431650,
          "text": "[音楽][笑い]"
        },
        {
          "speechId": 1425,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13433939,
          "sourceEndMs": 13436479,
          "text": "名前は"
        },
        {
          "speechId": 1426,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13441319,
          "sourceEndMs": 13446060,
          "text": "毛色決めるを見て正しい"
        },
        {
          "speechId": 1427,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13448340,
          "sourceEndMs": 13469720,
          "text": "名前どうすんのみんなだったらいいねこれじゃあこの辺の名前何[音楽]かおかしい周りにあるもので身の回りにあるものなんですけど"
        },
        {
          "speechId": 1428,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13469830,
          "sourceEndMs": 13474420,
          "text": "[笑い]"
        },
        {
          "speechId": 1429,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13474690,
          "sourceEndMs": 13486760,
          "text": "[音楽]今はクリスタルガイザーの水かクリスタルガイザークリスタルガイザー"
        },
        {
          "speechId": 1430,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13494800,
          "sourceEndMs": 13498880,
          "text": "強そう強そう"
        },
        {
          "speechId": 1431,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13500500,
          "sourceEndMs": 13505000,
          "text": "なのにガムじゃない"
        },
        {
          "speechId": 1432,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13511160,
          "sourceEndMs": 13521800,
          "text": "ここにあるんですかあるよ遺跡が遺跡かどうかは知らねでもディープダークあるよ"
        },
        {
          "speechId": 1433,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13527260,
          "sourceEndMs": 13535720,
          "text": "普通のディープダークとディープダークの中にある遺跡のチェーン"
        },
        {
          "speechId": 1434,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13536380,
          "sourceEndMs": 13546340,
          "text": "エンドシティのさ船があるやつ船が見てやっ[音楽]たよ"
        },
        {
          "speechId": 1435,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13546560,
          "sourceEndMs": 13550840,
          "text": "ゲームの例えゲームでしないでほしい"
        },
        {
          "speechId": 1436,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13554500,
          "sourceEndMs": 13561819,
          "text": "お前らがやったやつだよゼルダでゼルダで例えてゼルダで"
        },
        {
          "speechId": 1437,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13562640,
          "sourceEndMs": 13570049,
          "text": "ゼルダで例えると何だろう[音楽]"
        },
        {
          "speechId": 1438,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13572660,
          "sourceEndMs": 13575200,
          "text": "ゼルダで例えると"
        },
        {
          "speechId": 1439,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13575800,
          "sourceEndMs": 13578859,
          "text": "だから"
        },
        {
          "speechId": 1440,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13581060,
          "sourceEndMs": 13585819,
          "text": "もうゴロンシティにあるでしょ"
        },
        {
          "speechId": 1441,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13588160,
          "sourceEndMs": 13592060,
          "text": "みたいないるかどうか"
        },
        {
          "speechId": 1442,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13593540,
          "sourceEndMs": 13595840,
          "text": "宮崎県"
        },
        {
          "speechId": 1443,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13599840,
          "sourceEndMs": 13611920,
          "text": "青ユンボーそんな比率でかいフォローシティ結構頑張ってたよね大変だったけどね"
        },
        {
          "speechId": 1444,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13623960,
          "sourceEndMs": 13630859,
          "text": "鍾乳じゃ洞んあれこれもしかして何"
        },
        {
          "speechId": 1445,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13631580,
          "sourceEndMs": 13634420,
          "text": "[音楽]来た"
        },
        {
          "speechId": 1446,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13634460,
          "sourceEndMs": 13636700,
          "text": "よ"
        },
        {
          "speechId": 1447,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13637380,
          "sourceEndMs": 13640540,
          "text": "[音楽]"
        },
        {
          "speechId": 1448,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13646819,
          "sourceEndMs": 13650439,
          "text": "脱出しようかと思っちゃった今あかり"
        },
        {
          "speechId": 1449,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13650720,
          "sourceEndMs": 13652779,
          "text": "ちゃん"
        },
        {
          "speechId": 1450,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13653540,
          "sourceEndMs": 13660760,
          "text": "今気づいたやってない人には全然使わない話って今わかったら"
        },
        {
          "speechId": 1451,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13666560,
          "sourceEndMs": 13669640,
          "text": "大丈夫ですか"
        },
        {
          "speechId": 1452,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13676000,
          "sourceEndMs": 13679420,
          "text": "こんな時でも"
        },
        {
          "speechId": 1453,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13681140,
          "sourceEndMs": 13700120,
          "text": "夢用と違ってキャラクターを忘れてない[笑い]あいつ普通にもう肉食うつってるもんキャラじゃない勝手に植え付けられたキャラを守る必要ないんだお金入ったら食うだろそれ"
        },
        {
          "speechId": 1454,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13700520,
          "sourceEndMs": 13708560,
          "text": "貧乏キャラは肉食わねっていうのを誰だっけ私それ"
        },
        {
          "speechId": 1455,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13708739,
          "sourceEndMs": 13714850,
          "text": "守れよなかった[笑い]"
        },
        {
          "speechId": 1456,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13726780,
          "sourceEndMs": 13744399,
          "text": "[音楽]このアメジストのとこが集合地点にしよういいねそこが集合地点地点終着点そして出発点だ"
        },
        {
          "speechId": 1457,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13748760,
          "sourceEndMs": 13757840,
          "text": "おじさんがこの掘り続けてたやつ行くかほりほりほりほり掘り進む"
        },
        {
          "speechId": 1458,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13764020,
          "sourceEndMs": 13768040,
          "text": "キャラクターいなかったっけ掘り進む"
        },
        {
          "speechId": 1459,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13768640,
          "sourceEndMs": 13777439,
          "text": "いや何だっけなんか昔のゲーム広場だよミスター"
        },
        {
          "speechId": 1460,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13781100,
          "sourceEndMs": 13783580,
          "text": "そうそう"
        },
        {
          "speechId": 1461,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13787840,
          "sourceEndMs": 13795340,
          "text": "で行ったんだったわあれバカじゃやってたミスタードリだ"
        },
        {
          "speechId": 1462,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13798439,
          "sourceEndMs": 13808899,
          "text": "レバーガチャでも採掘キャラやってたよ[音楽]いいね普通じゃない"
        },
        {
          "speechId": 1463,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13808939,
          "sourceEndMs": 13813460,
          "text": "掘ること俺義務感で掘ってる"
        },
        {
          "speechId": 1464,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13820640,
          "sourceEndMs": 13843220,
          "text": "別に疲れてない人も田舎で癒されるんだけど俺いや俺の気づかないうちにもしかしたら疲れてたかもしれないやっぱねそういうの気づかない時あるからね自分にでは大丈夫大丈夫っつってんのね気づいたら疲れてた体がボロボロに体ぶろ"
        },
        {
          "speechId": 1465,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13844340,
          "sourceEndMs": 13849700,
          "text": "こういう時に優しい言葉かけられるとポロポロ泣いちゃうんだ"
        },
        {
          "speechId": 1466,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13859580,
          "sourceEndMs": 13866319,
          "text": "いいねいるよ虫いるね"
        },
        {
          "speechId": 1467,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13870260,
          "sourceEndMs": 13873760,
          "text": "その状態になったら"
        },
        {
          "speechId": 1468,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13879439,
          "sourceEndMs": 13887219,
          "text": "そうなんだよ帰るセミ[音楽]"
        },
        {
          "speechId": 1469,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13891439,
          "sourceEndMs": 13902380,
          "text": "すごいバッグでなんかめっちゃ音なってるなって思った虫の鳴き声でしたASMRとかできないよね"
        },
        {
          "speechId": 1470,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13903070,
          "sourceEndMs": 13910609,
          "text": "[音楽]"
        },
        {
          "speechId": 1471,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13913690,
          "sourceEndMs": 13926060,
          "text": "[音楽]そういうバックミュージックをかかってるようなボイス作ればおもろそう確かにこいつ"
        },
        {
          "speechId": 1472,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13927160,
          "sourceEndMs": 13930340,
          "text": "になりそう"
        },
        {
          "speechId": 1473,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13931359,
          "sourceEndMs": 13934600,
          "text": "かもしれない"
        },
        {
          "speechId": 1474,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13936020,
          "sourceEndMs": 13941260,
          "text": "だいたいなんかしばらく固定化されちゃうよねBGMって"
        },
        {
          "speechId": 1475,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13941540,
          "sourceEndMs": 13949060,
          "text": "いつも違うのを流したいするもしかして[音楽]配信によるかも"
        },
        {
          "speechId": 1476,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13953359,
          "sourceEndMs": 13957880,
          "text": "ちゃんと配信によって変えてるのエラー"
        },
        {
          "speechId": 1477,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13962600,
          "sourceEndMs": 13966040,
          "text": "ディープダークはあったよ"
        },
        {
          "speechId": 1478,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13975500,
          "sourceEndMs": 13980020,
          "text": "わかんないみたいな"
        },
        {
          "speechId": 1479,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13981800,
          "sourceEndMs": 13987399,
          "text": "じゃあちょっとディープダークまで連れてくるからそこから先は余って"
        },
        {
          "speechId": 1480,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 13989960,
          "sourceEndMs": 14003840,
          "text": "問答モンドの報告って今戻るわボンドどっち行ったんだ問答入り口と逆方向入り口と逆方向"
        },
        {
          "speechId": 1481,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14008979,
          "sourceEndMs": 14012120,
          "text": "ここ何なんだろう"
        },
        {
          "speechId": 1482,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14025779,
          "sourceEndMs": 14029460,
          "text": "約束見て"
        },
        {
          "speechId": 1483,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14032140,
          "sourceEndMs": 14048040,
          "text": "ラジコン優秀だななんだあれ赤赤赤目がいるこの先進んだこれ"
        },
        {
          "speechId": 1484,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14050140,
          "sourceEndMs": 14053040,
          "text": "でした"
        },
        {
          "speechId": 1485,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14057600,
          "sourceEndMs": 14064729,
          "text": "よDiscordでさあ[音楽]"
        },
        {
          "speechId": 1486,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14065080,
          "sourceEndMs": 14067920,
          "text": "いいよ"
        },
        {
          "speechId": 1487,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14069580,
          "sourceEndMs": 14075239,
          "text": "ディープドークさんですかじゃああれだえっと信じるわリスナー"
        },
        {
          "speechId": 1488,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14076840,
          "sourceEndMs": 14079840,
          "text": "ぐらい"
        },
        {
          "speechId": 1489,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14083160,
          "sourceEndMs": 14091739,
          "text": "この辺掘ってったらもしかしたらあるかもしれないよようこそようこそ"
        },
        {
          "speechId": 1490,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14092920,
          "sourceEndMs": 14098819,
          "text": "マイクラのBGMってさ常になっといてくれたらいいのになね"
        },
        {
          "speechId": 1491,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14101680,
          "sourceEndMs": 14106680,
          "text": "結構気に入ってんだけどねいいなたくさんのね"
        },
        {
          "speechId": 1492,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14114399,
          "sourceEndMs": 14120180,
          "text": "育毛剤スカルプなはは"
        },
        {
          "speechId": 1493,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14124779,
          "sourceEndMs": 14127620,
          "text": "行き止まりや"
        },
        {
          "speechId": 1494,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14128560,
          "sourceEndMs": 14136020,
          "text": "おいたこっち行ってみよう私はマグマの方に行くよ"
        },
        {
          "speechId": 1495,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14140199,
          "sourceEndMs": 14146520,
          "text": "見つけられるかな遺跡あったらいいなぁ"
        },
        {
          "speechId": 1496,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14149399,
          "sourceEndMs": 14154680,
          "text": "何があるのかしら遺跡には"
        },
        {
          "speechId": 1497,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14155020,
          "sourceEndMs": 14159600,
          "text": "いいよほら"
        },
        {
          "speechId": 1498,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14160660,
          "sourceEndMs": 14169500,
          "text": "え何これこれがツムツムだこれがディープやつよダークってなんだ"
        },
        {
          "speechId": 1499,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14170230,
          "sourceEndMs": 14175250,
          "text": "[音楽]そうだよ[音楽]"
        },
        {
          "speechId": 1500,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14175560,
          "sourceEndMs": 14182520,
          "text": "[笑い]ブロックだから取れますわな"
        },
        {
          "speechId": 1501,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14187239,
          "sourceEndMs": 14190080,
          "text": "取れてほしくなかった"
        },
        {
          "speechId": 1502,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14191640,
          "sourceEndMs": 14194819,
          "text": "ドイツ語みたい"
        },
        {
          "speechId": 1503,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14196899,
          "sourceEndMs": 14203220,
          "text": "えーなんかマリメッコみたいなキャラじゃね何ですか"
        },
        {
          "speechId": 1504,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14210120,
          "sourceEndMs": 14218580,
          "text": "花柄みたいなブランド[音楽]フィンランドのメーカーだって"
        },
        {
          "speechId": 1505,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14219819,
          "sourceEndMs": 14222819,
          "text": "こ"
        },
        {
          "speechId": 1506,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14227020,
          "sourceEndMs": 14230020,
          "text": "だー"
        },
        {
          "speechId": 1507,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14250300,
          "sourceEndMs": 14253380,
          "text": "おじ様の後ろ"
        },
        {
          "speechId": 1508,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14254620,
          "sourceEndMs": 14258300,
          "text": "このこっち外れっぽいわ"
        },
        {
          "speechId": 1509,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14259120,
          "sourceEndMs": 14263859,
          "text": "どうやってこっちディープダークじゃねえもんじゃ"
        },
        {
          "speechId": 1510,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14265420,
          "sourceEndMs": 14270180,
          "text": "[音楽]ない黒"
        },
        {
          "speechId": 1511,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14270399,
          "sourceEndMs": 14275080,
          "text": "大きいめっちゃでかいよね"
        },
        {
          "speechId": 1512,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14275380,
          "sourceEndMs": 14278040,
          "text": "適当ってもね"
        },
        {
          "speechId": 1513,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14288300,
          "sourceEndMs": 14292080,
          "text": "もししれかしたらあるかもない"
        },
        {
          "speechId": 1514,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14294699,
          "sourceEndMs": 14298479,
          "text": "ライダー様って"
        },
        {
          "speechId": 1515,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14307000,
          "sourceEndMs": 14311819,
          "text": "影がいるパンティー"
        },
        {
          "speechId": 1516,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14320979,
          "sourceEndMs": 14324060,
          "text": "語かな"
        },
        {
          "speechId": 1517,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14326020,
          "sourceEndMs": 14337020,
          "text": "バウンティーのオープニングが好きなんだあれめっちゃオープニングちゃうで泣い泣くよなぁ"
        },
        {
          "speechId": 1518,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14338319,
          "sourceEndMs": 14342479,
          "text": "王様ランキングカラオケで歌えない"
        },
        {
          "speechId": 1519,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14343860,
          "sourceEndMs": 14348549,
          "text": "[音楽]"
        },
        {
          "speechId": 1520,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14353859,
          "sourceEndMs": 14360960,
          "text": "ここかどこ点滅してる"
        },
        {
          "speechId": 1521,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14361239,
          "sourceEndMs": 14369239,
          "text": "えなんか声がやばいかもしれんぞ行きたい"
        },
        {
          "speechId": 1522,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14370210,
          "sourceEndMs": 14385059,
          "text": "[音楽]一旦戻った方がいいかもしれない[音楽]"
        },
        {
          "speechId": 1523,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14386760,
          "sourceEndMs": 14394380,
          "text": "ちょっとなんか座標とか言った方がいいのか右左真っすぐ"
        },
        {
          "speechId": 1524,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14397260,
          "sourceEndMs": 14404100,
          "text": "ちょっと俺見てくるわ[音楽][笑い]"
        },
        {
          "speechId": 1525,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14404979,
          "sourceEndMs": 14412020,
          "text": "痛い痛い笛の音が聞こえたか私が先に行く"
        },
        {
          "speechId": 1526,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14412960,
          "sourceEndMs": 14418500,
          "text": "聞こえたバカの船バカの声が"
        },
        {
          "speechId": 1527,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14418739,
          "sourceEndMs": 14424319,
          "text": "ある高貴な増えるぞ"
        },
        {
          "speechId": 1528,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14432160,
          "sourceEndMs": 14437699,
          "text": "って何が分かる"
        },
        {
          "speechId": 1529,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14437920,
          "sourceEndMs": 14440819,
          "text": "いやー"
        },
        {
          "speechId": 1530,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14441160,
          "sourceEndMs": 14443880,
          "text": "叫び声が聞こえます"
        },
        {
          "speechId": 1531,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14444460,
          "sourceEndMs": 14447180,
          "text": "本当だ"
        },
        {
          "speechId": 1532,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14447399,
          "sourceEndMs": 14455520,
          "text": "多分どっかでここら辺で寝たくね一旦ね"
        },
        {
          "speechId": 1533,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14456100,
          "sourceEndMs": 14463680,
          "text": "キャンプね[音楽]絶対戻ってこれないから確かにそれ"
        },
        {
          "speechId": 1534,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14468540,
          "sourceEndMs": 14471660,
          "text": "ですから"
        },
        {
          "speechId": 1535,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14477640,
          "sourceEndMs": 14480120,
          "text": "OK"
        },
        {
          "speechId": 1536,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14489580,
          "sourceEndMs": 14498060,
          "text": "ここベースとする前線基地全然土トス"
        },
        {
          "speechId": 1537,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14502660,
          "sourceEndMs": 14505500,
          "text": "とりあえず寝ました"
        },
        {
          "speechId": 1538,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14538960,
          "sourceEndMs": 14545460,
          "text": "出てきたどうやって音を出したから"
        },
        {
          "speechId": 1539,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14547260,
          "sourceEndMs": 14551640,
          "text": "出くるての反応するんだ"
        },
        {
          "speechId": 1540,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14552190,
          "sourceEndMs": 14560690,
          "text": "[笑い]めっちゃおるやん[笑い]"
        },
        {
          "speechId": 1541,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14561779,
          "sourceEndMs": 14564779,
          "text": "もっともっと"
        },
        {
          "speechId": 1542,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14566880,
          "sourceEndMs": 14570000,
          "text": "増えた"
        },
        {
          "speechId": 1543,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14572880,
          "sourceEndMs": 14577080,
          "text": "マジギレちょっとしてんじゃんどこだ"
        },
        {
          "speechId": 1544,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14580479,
          "sourceEndMs": 14585469,
          "text": "それは怒りますよ[音楽]"
        },
        {
          "speechId": 1545,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14588300,
          "sourceEndMs": 14592500,
          "text": "見えからもしない敵逃げる"
        },
        {
          "speechId": 1546,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14594279,
          "sourceEndMs": 14596399,
          "text": "わからん"
        },
        {
          "speechId": 1547,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14598439,
          "sourceEndMs": 14604209,
          "text": "全然貫通してくるよ[音楽]"
        },
        {
          "speechId": 1548,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14604979,
          "sourceEndMs": 14611580,
          "text": "音に反応するの音が"
        },
        {
          "speechId": 1549,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14612040,
          "sourceEndMs": 14614160,
          "text": "ろってる"
        },
        {
          "speechId": 1550,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14617580,
          "sourceEndMs": 14622020,
          "text": "これ標的にされてんのか私"
        },
        {
          "speechId": 1551,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14626000,
          "sourceEndMs": 14632400,
          "text": "[笑い]"
        },
        {
          "speechId": 1552,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14635260,
          "sourceEndMs": 14645960,
          "text": "[笑い][音楽][笑い]めっちゃ狙われてるやん"
        },
        {
          "speechId": 1553,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14648160,
          "sourceEndMs": 14650460,
          "text": "ねー"
        },
        {
          "speechId": 1554,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14666699,
          "sourceEndMs": 14671160,
          "text": "死ぬかめっちゃ離れるか"
        },
        {
          "speechId": 1555,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14673020,
          "sourceEndMs": 14677340,
          "text": "ベッド近いしね"
        },
        {
          "speechId": 1556,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14683319,
          "sourceEndMs": 14691260,
          "text": "そんなたには弾け[音楽]衝撃波に消し飛ばされた消し飛ばされちゃった"
        },
        {
          "speechId": 1557,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14696060,
          "sourceEndMs": 14699840,
          "text": "のは私だけだろ"
        },
        {
          "speechId": 1558,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14710560,
          "sourceEndMs": 14719460,
          "text": "見つけた方がいいかなと思ってこれ開けだ見つけようじゃあ穴ていいんね"
        },
        {
          "speechId": 1559,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14734340,
          "sourceEndMs": 14737520,
          "text": "心が"
        },
        {
          "speechId": 1560,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14737819,
          "sourceEndMs": 14743730,
          "text": "見ねたい[音楽]"
        },
        {
          "speechId": 1561,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14745000,
          "sourceEndMs": 14748680,
          "text": "やってくれましたねよくも"
        },
        {
          "speechId": 1562,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14750120,
          "sourceEndMs": 14753540,
          "text": "今のは痛かった"
        },
        {
          "speechId": 1563,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14753600,
          "sourceEndMs": 14764800,
          "text": "気がするなんか[音楽]これ何レベルの"
        },
        {
          "speechId": 1564,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14767199,
          "sourceEndMs": 14773740,
          "text": "竹取から今のうちにあいつ見つけて[音楽]"
        },
        {
          "speechId": 1565,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14783420,
          "sourceEndMs": 14786600,
          "text": "見つけた"
        },
        {
          "speechId": 1566,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14787660,
          "sourceEndMs": 14790859,
          "text": "頑張ってさ"
        },
        {
          "speechId": 1567,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14792750,
          "sourceEndMs": 14795899,
          "text": "[音楽]"
        },
        {
          "speechId": 1568,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14799500,
          "sourceEndMs": 14806460,
          "text": "あまりにも見えにくい上か下か"
        },
        {
          "speechId": 1569,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14812020,
          "sourceEndMs": 14815020,
          "text": "も"
        },
        {
          "speechId": 1570,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14818979,
          "sourceEndMs": 14822060,
          "text": "狙わてれ人気ね"
        },
        {
          "speechId": 1571,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14827260,
          "sourceEndMs": 14831359,
          "text": "狙われる一番うるさい"
        },
        {
          "speechId": 1572,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14834320,
          "sourceEndMs": 14838130,
          "text": "[笑い]"
        },
        {
          "speechId": 1573,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14838239,
          "sourceEndMs": 14842100,
          "text": "成長買っくれててる"
        },
        {
          "speechId": 1574,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14847739,
          "sourceEndMs": 14854160,
          "text": "私はここよろしに来なさい"
        },
        {
          "speechId": 1575,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14854399,
          "sourceEndMs": 14858239,
          "text": "強キャラのお顔じゃん"
        },
        {
          "speechId": 1576,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14860260,
          "sourceEndMs": 14867300,
          "text": "めっちゃ強そういやいやまだ見つけきれてないよね"
        },
        {
          "speechId": 1577,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14876780,
          "sourceEndMs": 14879839,
          "text": "[音楽]"
        },
        {
          "speechId": 1578,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14887460,
          "sourceEndMs": 14891939,
          "text": "ことはないかとえーと"
        },
        {
          "speechId": 1579,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14892540,
          "sourceEndMs": 14897960,
          "text": "俺のアイテムはどこだどこなんだろう"
        },
        {
          "speechId": 1580,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14902760,
          "sourceEndMs": 14909300,
          "text": "下から来てるそれが分かればあとは"
        },
        {
          "speechId": 1581,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14913660,
          "sourceEndMs": 14919859,
          "text": "を見していて痛いよ"
        },
        {
          "speechId": 1582,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14922540,
          "sourceEndMs": 14924540,
          "text": "めちゃめちゃ"
        },
        {
          "speechId": 1583,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14925439,
          "sourceEndMs": 14928680,
          "text": "こちらは"
        },
        {
          "speechId": 1584,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14935470,
          "sourceEndMs": 14940560,
          "text": "[音楽]なるほど"
        },
        {
          "speechId": 1585,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14944160,
          "sourceEndMs": 14947880,
          "text": "まじまじまじまじ"
        },
        {
          "speechId": 1586,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14950100,
          "sourceEndMs": 14955260,
          "text": "これ本当だ"
        },
        {
          "speechId": 1587,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14968100,
          "sourceEndMs": 14971520,
          "text": "これやばいよ"
        },
        {
          "speechId": 1588,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14982479,
          "sourceEndMs": 14985140,
          "text": "こいつです"
        },
        {
          "speechId": 1589,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14990520,
          "sourceEndMs": 14992760,
          "text": "倒したの"
        },
        {
          "speechId": 1590,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 14993340,
          "sourceEndMs": 14997989,
          "text": "こんにちは[音楽]"
        },
        {
          "speechId": 1591,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15000479,
          "sourceEndMs": 15004819,
          "text": "ボタン入ってるボタン入ってるよ"
        },
        {
          "speechId": 1592,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15007100,
          "sourceEndMs": 15015979,
          "text": "行け行け行け行け行け行け行け行け行け行け行け行け行け行け行け行け行け"
        },
        {
          "speechId": 1593,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15016220,
          "sourceEndMs": 15022519,
          "text": "ありがとうございます[音楽]"
        },
        {
          "speechId": 1594,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15035700,
          "sourceEndMs": 15040360,
          "text": "[笑い]"
        },
        {
          "speechId": 1595,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15043720,
          "sourceEndMs": 15046820,
          "text": "[音楽]"
        },
        {
          "speechId": 1596,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15061090,
          "sourceEndMs": 15064180,
          "text": "[音楽]"
        },
        {
          "speechId": 1597,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15073100,
          "sourceEndMs": 15076939,
          "text": "ねここパターン"
        },
        {
          "speechId": 1598,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15082880,
          "sourceEndMs": 15085939,
          "text": "行くぞ"
        },
        {
          "speechId": 1599,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15088920,
          "sourceEndMs": 15091760,
          "text": "ここ無敵"
        },
        {
          "speechId": 1600,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15091979,
          "sourceEndMs": 15096560,
          "text": "向けだ見つけた無敵じゃない"
        },
        {
          "speechId": 1601,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15099180,
          "sourceEndMs": 15102140,
          "text": "痛てー"
        },
        {
          "speechId": 1602,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15102800,
          "sourceEndMs": 15108530,
          "text": "味方に殴られる[笑い]"
        },
        {
          "speechId": 1603,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15108840,
          "sourceEndMs": 15114469,
          "text": "いっぱい[音楽]"
        },
        {
          "speechId": 1604,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15116699,
          "sourceEndMs": 15133459,
          "text": "倒して何があるのとりあえずあいつの発生源は今さっき潰したからあれから発生するんだもっと発生してほしいこれ大事じゃないですか[音楽]"
        },
        {
          "speechId": 1605,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15144899,
          "sourceEndMs": 15147899,
          "text": "とりあえず"
        },
        {
          "speechId": 1606,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15148080,
          "sourceEndMs": 15157460,
          "text": "装備ちゃんと交換しようかネザライト持ってんなんだよなこれ"
        },
        {
          "speechId": 1607,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15165720,
          "sourceEndMs": 15170840,
          "text": "こんなもんかすげーこれ軽くセンサー"
        },
        {
          "speechId": 1608,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15173640,
          "sourceEndMs": 15176420,
          "text": "倒し何たらがあるの"
        },
        {
          "speechId": 1609,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15178390,
          "sourceEndMs": 15181600,
          "text": "[音楽]"
        },
        {
          "speechId": 1610,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15182180,
          "sourceEndMs": 15195500,
          "text": "でもスカルクカタリストと軽くセンサーがあるよそんぐらいかな変なBGMだから単純に邪魔なのよあいつ"
        },
        {
          "speechId": 1611,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15196020,
          "sourceEndMs": 15198020,
          "text": "邪魔"
        },
        {
          "speechId": 1612,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15202020,
          "sourceEndMs": 15210500,
          "text": "すごい繋がってるえーこれ古代遺跡には宝はないの"
        },
        {
          "speechId": 1613,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15213260,
          "sourceEndMs": 15217699,
          "text": "音がすごい阪急"
        },
        {
          "speechId": 1614,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15219900,
          "sourceEndMs": 15226370,
          "text": "[音楽]どこに置けばいいんだろう[音楽]"
        },
        {
          "speechId": 1615,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15227760,
          "sourceEndMs": 15234420,
          "text": "この知っ深層感とかいらんべてるよ[音楽]"
        },
        {
          "speechId": 1616,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15247739,
          "sourceEndMs": 15251180,
          "text": "こんなに綺麗じゃなかったの"
        },
        {
          "speechId": 1617,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15252899,
          "sourceEndMs": 15255199,
          "text": "倉持の"
        },
        {
          "speechId": 1618,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15256979,
          "sourceEndMs": 15266420,
          "text": "弓あクララの黒餅の本当だ弓持ってる強い弓だ"
        },
        {
          "speechId": 1619,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15268100,
          "sourceEndMs": 15271520,
          "text": "入れてみました"
        },
        {
          "speechId": 1620,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15273700,
          "sourceEndMs": 15281120,
          "text": "[音楽]あとこれもあとなんだろう"
        },
        {
          "speechId": 1621,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15282170,
          "sourceEndMs": 15285319,
          "text": "[音楽]"
        },
        {
          "speechId": 1622,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15292979,
          "sourceEndMs": 15296300,
          "text": "めっちゃロケットが入ってる"
        },
        {
          "speechId": 1623,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15298319,
          "sourceEndMs": 15303500,
          "text": "知床かボックス持ってる人います"
        },
        {
          "speechId": 1624,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15311460,
          "sourceEndMs": 15314239,
          "text": "爆発しちゃうんですね"
        },
        {
          "speechId": 1625,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15316380,
          "sourceEndMs": 15326600,
          "text": "爆発はしないようなだからもしかしたらマグマに落ちたのかもしれんし3つ入れた3つ入れたシュルカーボックス"
        },
        {
          "speechId": 1626,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15330359,
          "sourceEndMs": 15333140,
          "text": "入ったての"
        },
        {
          "speechId": 1627,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15333600,
          "sourceEndMs": 15341580,
          "text": "バカみたいに入ってたねなかったらかけるなんとかみたいな書いてたやつです"
        },
        {
          "speechId": 1628,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15346830,
          "sourceEndMs": 15352389,
          "text": "[音楽]"
        },
        {
          "speechId": 1629,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15368880,
          "sourceEndMs": 15378500,
          "text": "これは誰のあかりのこれこの日ってやつ切って防具"
        },
        {
          "speechId": 1630,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15381540,
          "sourceEndMs": 15389359,
          "text": "あれなんかパンツ持ってんだけど誰だ私とか私に開けってこと"
        },
        {
          "speechId": 1631,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15389640,
          "sourceEndMs": 15399080,
          "text": "やだ[音楽]いややだやだやだ"
        },
        {
          "speechId": 1632,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15405620,
          "sourceEndMs": 15408620,
          "text": "行くよ"
        },
        {
          "speechId": 1633,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15409650,
          "sourceEndMs": 15417719,
          "text": "[音楽]"
        },
        {
          "speechId": 1634,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15420439,
          "sourceEndMs": 15423800,
          "text": "いいんじゃないか"
        },
        {
          "speechId": 1635,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15424650,
          "sourceEndMs": 15427700,
          "text": "[音楽]"
        },
        {
          "speechId": 1636,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15431640,
          "sourceEndMs": 15437779,
          "text": "この辺普通のモンスター出ないってことは近いないんじゃかな"
        },
        {
          "speechId": 1637,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15440720,
          "sourceEndMs": 15448100,
          "text": "それくるよがさっきの化け物呼んでんだ呼ぶだけ"
        },
        {
          "speechId": 1638,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15450779,
          "sourceEndMs": 15467060,
          "text": "あれラスボスじゃなくてからのお邪魔なんだえありがとうだよもっと上がいるって事ただ邪魔するためだけの存在なんだかわいそうなんか"
        },
        {
          "speechId": 1639,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15467760,
          "sourceEndMs": 15470239,
          "text": "刺激されてんだ"
        },
        {
          "speechId": 1640,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15473220,
          "sourceEndMs": 15478460,
          "text": "時給高いかもよ"
        },
        {
          "speechId": 1641,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15482040,
          "sourceEndMs": 15484699,
          "text": "1500円"
        },
        {
          "speechId": 1642,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15485779,
          "sourceEndMs": 15501199,
          "text": "なかなかだな[音楽]十分いいよそれでもあんなぼかされるって考えたらいいのかなちょっとない割に合わ割に合わない"
        },
        {
          "speechId": 1643,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15503580,
          "sourceEndMs": 15506840,
          "text": "2000円ぐらいもらってそう"
        },
        {
          "speechId": 1644,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15509699,
          "sourceEndMs": 15514580,
          "text": "上が繋がってあれ上から来たんだっけ"
        },
        {
          "speechId": 1645,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15520680,
          "sourceEndMs": 15528800,
          "text": "いやーいいですね進化を続けるマインクラフトまるで我々みたいじゃん"
        },
        {
          "speechId": 1646,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15532640,
          "sourceEndMs": 15539000,
          "text": "そしてそんなマイクラ君は来月また進化するんだ"
        },
        {
          "speechId": 1647,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15539460,
          "sourceEndMs": 15541640,
          "text": "楽しみです"
        },
        {
          "speechId": 1648,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15543600,
          "sourceEndMs": 15551640,
          "text": "これどこに行けばいいんだここおじさんはどこ行った"
        },
        {
          "speechId": 1649,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15553620,
          "sourceEndMs": 15556279,
          "text": "ですね"
        },
        {
          "speechId": 1650,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15557479,
          "sourceEndMs": 15571370,
          "text": "OKそのことを思い出したあの俺8分間視界持っよがクッキーに見える薬てる[音楽]"
        },
        {
          "speechId": 1651,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15581840,
          "sourceEndMs": 15586040,
          "text": "これなる目が良くお薬"
        },
        {
          "speechId": 1652,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15586220,
          "sourceEndMs": 15589640,
          "text": "普通てに伸び"
        },
        {
          "speechId": 1653,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15590460,
          "sourceEndMs": 15593120,
          "text": "飲んでみな"
        },
        {
          "speechId": 1654,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15595080,
          "sourceEndMs": 15598520,
          "text": "おしポーション8分"
        },
        {
          "speechId": 1655,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15598620,
          "sourceEndMs": 15601279,
          "text": "オープン"
        },
        {
          "speechId": 1656,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15602160,
          "sourceEndMs": 15604580,
          "text": "これ"
        },
        {
          "speechId": 1657,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15607680,
          "sourceEndMs": 15612010,
          "text": "もっともっと[音楽]"
        },
        {
          "speechId": 1658,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15616319,
          "sourceEndMs": 15623840,
          "text": "急に暗くなったらそれはそれで怖いよ確かにこれ持っときな"
        },
        {
          "speechId": 1659,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15624120,
          "sourceEndMs": 15630560,
          "text": "もう上を知っちゃったら怖いから戻れなくなっちゃう"
        },
        {
          "speechId": 1660,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15631200,
          "sourceEndMs": 15635300,
          "text": "[音楽]よ"
        },
        {
          "speechId": 1661,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15635340,
          "sourceEndMs": 15639080,
          "text": "もう1分経っちゃったか"
        },
        {
          "speechId": 1662,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15642720,
          "sourceEndMs": 15646220,
          "text": "っきりすごい見えすぎちゃって困る"
        },
        {
          "speechId": 1663,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15648420,
          "sourceEndMs": 15651020,
          "text": "から"
        },
        {
          "speechId": 1664,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15651899,
          "sourceEndMs": 15654800,
          "text": "昔のCMカーボン"
        },
        {
          "speechId": 1665,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15654880,
          "sourceEndMs": 15663380,
          "text": "[音楽]見えすぎちゃってなんだっけ"
        },
        {
          "speechId": 1666,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15667399,
          "sourceEndMs": 15672540,
          "text": "みんなキリキリ言ってないね"
        },
        {
          "speechId": 1667,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15679979,
          "sourceEndMs": 15691959,
          "text": "あれなんかここじゃないこの下みんなだっておな邪魔スポットじゃないまだいいんだやつ[音楽]"
        },
        {
          "speechId": 1668,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15695200,
          "sourceEndMs": 15698239,
          "text": "[音楽]"
        },
        {
          "speechId": 1669,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15700560,
          "sourceEndMs": 15703340,
          "text": "ダメじゃん"
        },
        {
          "speechId": 1670,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15703380,
          "sourceEndMs": 15707779,
          "text": "ダメかダメだったか"
        },
        {
          "speechId": 1671,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15712560,
          "sourceEndMs": 15717380,
          "text": "もう俺たちは震えて生きるしかないんだ"
        },
        {
          "speechId": 1672,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15720000,
          "sourceEndMs": 15722000,
          "text": "プルプル"
        },
        {
          "speechId": 1673,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15722640,
          "sourceEndMs": 15731960,
          "text": "あのスカルクカタリストは何なん知らないカタリストはよくわかってない俺は"
        },
        {
          "speechId": 1674,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15732960,
          "sourceEndMs": 15736580,
          "text": "経験値吸ったらこのスカルが増えるんだっけ"
        },
        {
          "speechId": 1675,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15738660,
          "sourceEndMs": 15743420,
          "text": "海を家庭ぶっ壊れたわ"
        },
        {
          "speechId": 1676,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15745620,
          "sourceEndMs": 15748880,
          "text": "シルクタッチ入ります"
        },
        {
          "speechId": 1677,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15756280,
          "sourceEndMs": 15759870,
          "text": "[音楽]"
        },
        {
          "speechId": 1678,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15760140,
          "sourceEndMs": 15765620,
          "text": "ここら辺でなんかさゾンビとはあるよ"
        },
        {
          "speechId": 1679,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15773880,
          "sourceEndMs": 15794960,
          "text": "タッチがよろしいこれもなんだこの気持ちはこれただ鉄か飲食されてる鉄だカリカリ言う誰かが壁を引っ掻いてる音[音楽]でもそっち空洞あるとこのリオン"
        },
        {
          "speechId": 1680,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15799439,
          "sourceEndMs": 15802439,
          "text": "軽くカタリスト"
        },
        {
          "speechId": 1681,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15812160,
          "sourceEndMs": 15815160,
          "text": "うなぎ屋"
        },
        {
          "speechId": 1682,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15816520,
          "sourceEndMs": 15819629,
          "text": "[音楽]"
        },
        {
          "speechId": 1683,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15822359,
          "sourceEndMs": 15825140,
          "text": "行きたい"
        },
        {
          "speechId": 1684,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15828000,
          "sourceEndMs": 15832340,
          "text": "なんか変な音聞こえたけど気のせいか"
        },
        {
          "speechId": 1685,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15832680,
          "sourceEndMs": 15835640,
          "text": "気のせい"
        },
        {
          "speechId": 1686,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15837660,
          "sourceEndMs": 15841279,
          "text": "いやでもねこれはね多分あるよ"
        },
        {
          "speechId": 1687,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15842640,
          "sourceEndMs": 15845540,
          "text": "二人がリスト"
        },
        {
          "speechId": 1688,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15846479,
          "sourceEndMs": 15848899,
          "text": "元なのか"
        },
        {
          "speechId": 1689,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15851399,
          "sourceEndMs": 15858439,
          "text": "だってもう敵のゾンビとかねスケルトンとかいないんだもんあこっちがいい"
        },
        {
          "speechId": 1690,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15859319,
          "sourceEndMs": 15864319,
          "text": "わあのところねゾンビとかが出てこないにあったりする"
        },
        {
          "speechId": 1691,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15864350,
          "sourceEndMs": 15867429,
          "text": "[音楽]"
        },
        {
          "speechId": 1692,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15867899,
          "sourceEndMs": 15871220,
          "text": "もっとなくなっちゃうよね"
        },
        {
          "speechId": 1693,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15887600,
          "sourceEndMs": 15891560,
          "text": "ちょっと上探すか"
        },
        {
          "speechId": 1694,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15897560,
          "sourceEndMs": 15908660,
          "text": "ー[音楽]いやったーありがとうありがとう"
        },
        {
          "speechId": 1695,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15909319,
          "sourceEndMs": 15914000,
          "text": "目が見えなくなった時に使う"
        },
        {
          "speechId": 1696,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15921300,
          "sourceEndMs": 15924300,
          "text": "よ"
        },
        {
          "speechId": 1697,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15930720,
          "sourceEndMs": 15936560,
          "text": "すごい天井に来てる今"
        },
        {
          "speechId": 1698,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15944960,
          "sourceEndMs": 15948500,
          "text": "ここじゃないですか"
        },
        {
          "speechId": 1699,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15959510,
          "sourceEndMs": 15967430,
          "text": "[音楽]"
        },
        {
          "speechId": 1700,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15974840,
          "sourceEndMs": 15978260,
          "text": "こっちは違うの"
        },
        {
          "speechId": 1701,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15978300,
          "sourceEndMs": 15980479,
          "text": "か"
        },
        {
          "speechId": 1702,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15985080,
          "sourceEndMs": 15989720,
          "text": "どこでなったのかも覚えてないや"
        },
        {
          "speechId": 1703,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 15991439,
          "sourceEndMs": 15996140,
          "text": "巻き戻そう踊り子使おう"
        },
        {
          "speechId": 1704,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16004520,
          "sourceEndMs": 16007180,
          "text": "穴を音掘るがする"
        },
        {
          "speechId": 1705,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16013279,
          "sourceEndMs": 16015279,
          "text": "じゃん"
        },
        {
          "speechId": 1706,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16015620,
          "sourceEndMs": 16018460,
          "text": "人間さんや"
        },
        {
          "speechId": 1707,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16025220,
          "sourceEndMs": 16029180,
          "text": "さあどこかなこんにちは"
        },
        {
          "speechId": 1708,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16035359,
          "sourceEndMs": 16038620,
          "text": "ディープダークじゃなくなってる"
        },
        {
          "speechId": 1709,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16044420,
          "sourceEndMs": 16055060,
          "text": "行き止まりにしとこうすごいピカピカしてる30から40あたりの高さとしては"
        },
        {
          "speechId": 1710,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16059840,
          "sourceEndMs": 16067300,
          "text": "これはどこだ逆よくになんか見つからずに"
        },
        {
          "speechId": 1711,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16068420,
          "sourceEndMs": 16074209,
          "text": "ないもんだな[音楽]"
        },
        {
          "speechId": 1712,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16078100,
          "sourceEndMs": 16081340,
          "text": "いるって事"
        },
        {
          "speechId": 1713,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16082780,
          "sourceEndMs": 16090750,
          "text": "[笑い]切れちゃった[音楽]"
        },
        {
          "speechId": 1714,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16091159,
          "sourceEndMs": 16098799,
          "text": "怖いよ新しいのあるか[音楽]"
        },
        {
          "speechId": 1715,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16103939,
          "sourceEndMs": 16107260,
          "text": "暗闇に怯える女の子"
        },
        {
          "speechId": 1716,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16110600,
          "sourceEndMs": 16116920,
          "text": "暗闇に怯える女暗闇に怯える女こっちもないね"
        },
        {
          "speechId": 1717,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16121159,
          "sourceEndMs": 16132760,
          "text": "男[音楽]スポナーだ全然関係ないゾンビ"
        },
        {
          "speechId": 1718,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16135319,
          "sourceEndMs": 16138760,
          "text": "超ディープダークです"
        },
        {
          "speechId": 1719,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16140540,
          "sourceEndMs": 16148950,
          "text": "水星特攻レコード[音楽]"
        },
        {
          "speechId": 1720,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16149779,
          "sourceEndMs": 16152140,
          "text": "隣国を"
        },
        {
          "speechId": 1721,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16154159,
          "sourceEndMs": 16164319,
          "text": "なん何かの音もしなくなっちゃいましたね[音楽]みたいな音が聞こえるけどこれ違うか"
        },
        {
          "speechId": 1722,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16166300,
          "sourceEndMs": 16169300,
          "text": "こんにちはこんにちは"
        },
        {
          "speechId": 1723,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16180760,
          "sourceEndMs": 16184899,
          "text": "もっとアメジスト見つけました"
        },
        {
          "speechId": 1724,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16185920,
          "sourceEndMs": 16189100,
          "text": "[音楽]"
        },
        {
          "speechId": 1725,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16191739,
          "sourceEndMs": 16195640,
          "text": "なんか空洞見つけた"
        },
        {
          "speechId": 1726,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16197040,
          "sourceEndMs": 16200319,
          "text": "[音楽]"
        },
        {
          "speechId": 1727,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16201260,
          "sourceEndMs": 16203560,
          "text": "ディープダーク"
        },
        {
          "speechId": 1728,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16206730,
          "sourceEndMs": 16209959,
          "text": "[音楽]"
        },
        {
          "speechId": 1729,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16218840,
          "sourceEndMs": 16221739,
          "text": "青い光と"
        },
        {
          "speechId": 1730,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16226460,
          "sourceEndMs": 16230739,
          "text": "一人よの時に見つけたら怖い"
        },
        {
          "speechId": 1731,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16230840,
          "sourceEndMs": 16233919,
          "text": "[音楽]"
        },
        {
          "speechId": 1732,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16257180,
          "sourceEndMs": 16262720,
          "text": "迷っないちゃったかももう帰り道がわからんだ"
        },
        {
          "speechId": 1733,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16263979,
          "sourceEndMs": 16269739,
          "text": "そうかも友達のところに行きたいなぁ"
        },
        {
          "speechId": 1734,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16272210,
          "sourceEndMs": 16276640,
          "text": "[音楽]どうしよう"
        },
        {
          "speechId": 1735,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16278720,
          "sourceEndMs": 16281439,
          "text": "あ聞こえる"
        },
        {
          "speechId": 1736,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16282640,
          "sourceEndMs": 16287050,
          "text": "[笑い]"
        },
        {
          "speechId": 1737,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16288020,
          "sourceEndMs": 16292659,
          "text": "こっちだめだめだった"
        },
        {
          "speechId": 1738,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16292779,
          "sourceEndMs": 16296260,
          "text": "バカの声やら"
        },
        {
          "speechId": 1739,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16301940,
          "sourceEndMs": 16305129,
          "text": "[音楽]"
        },
        {
          "speechId": 1740,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16307220,
          "sourceEndMs": 16310000,
          "text": "ここだ"
        },
        {
          "speechId": 1741,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16313460,
          "sourceEndMs": 16317000,
          "text": "こんにちは私"
        },
        {
          "speechId": 1742,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16317920,
          "sourceEndMs": 16324220,
          "text": "[音楽]が"
        },
        {
          "speechId": 1743,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16326840,
          "sourceEndMs": 16331420,
          "text": "私の名前見えない下に"
        },
        {
          "speechId": 1744,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16338450,
          "sourceEndMs": 16341979,
          "text": "[音楽]"
        },
        {
          "speechId": 1745,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16342080,
          "sourceEndMs": 16344920,
          "text": "広い"
        },
        {
          "speechId": 1746,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16344930,
          "sourceEndMs": 16347979,
          "text": "[音楽]"
        },
        {
          "speechId": 1747,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16349779,
          "sourceEndMs": 16356979,
          "text": "神殿はねとにかく広いよ違うのかな"
        },
        {
          "speechId": 1748,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16360680,
          "sourceEndMs": 16364659,
          "text": "こことこ来た"
        },
        {
          "speechId": 1749,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16378979,
          "sourceEndMs": 16382060,
          "text": "こっちないかな"
        },
        {
          "speechId": 1750,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16384740,
          "sourceEndMs": 16388900,
          "text": "ここら辺掘ってみるわうん"
        },
        {
          "speechId": 1751,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16389840,
          "sourceEndMs": 16396160,
          "text": "あればいいのだがねいいのだがね"
        },
        {
          "speechId": 1752,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16404619,
          "sourceEndMs": 16408160,
          "text": "後ろ戻ってきて"
        },
        {
          "speechId": 1753,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16410539,
          "sourceEndMs": 16413080,
          "text": "今日"
        },
        {
          "speechId": 1754,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16415219,
          "sourceEndMs": 16420160,
          "text": "ディープドッグいつも上からやってきてくれる"
        },
        {
          "speechId": 1755,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16420260,
          "sourceEndMs": 16422619,
          "text": "ヒーローだから"
        },
        {
          "speechId": 1756,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16422680,
          "sourceEndMs": 16426939,
          "text": "上からやってくるものだから"
        },
        {
          "speechId": 1757,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16430459,
          "sourceEndMs": 16437379,
          "text": "めっちゃあるじゃんだけどね何よもないんだ"
        },
        {
          "speechId": 1758,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16438020,
          "sourceEndMs": 16442420,
          "text": "ここ辺ら掘り進める"
        },
        {
          "speechId": 1759,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16442719,
          "sourceEndMs": 16446020,
          "text": "この下"
        },
        {
          "speechId": 1760,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16447340,
          "sourceEndMs": 16451340,
          "text": "りるよ"
        },
        {
          "speechId": 1761,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16455141,
          "sourceEndMs": 16460539,
          "text": "今言ったところを逆に戻ってみる"
        },
        {
          "speechId": 1762,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16470799,
          "sourceEndMs": 16485740,
          "text": "こんなになんかちょっと同じ場所なのに座標変わるもののダイヤモンドに興味がない変わっちまったなんか音聞こえるこれは何の音なんだろう"
        },
        {
          "speechId": 1763,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16499039,
          "sourceEndMs": 16501879,
          "text": "マイクラのBGM"
        },
        {
          "speechId": 1764,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16509719,
          "sourceEndMs": 16519219,
          "text": "なんかノイズみたいな聞こえるけどね[音楽]ASMRされる"
        },
        {
          "speechId": 1765,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16520240,
          "sourceEndMs": 16523420,
          "text": "ノイズで"
        },
        {
          "speechId": 1766,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16534080,
          "sourceEndMs": 16539299,
          "text": "ディープダークと他のプレインズになったりBGM"
        },
        {
          "speechId": 1767,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16540330,
          "sourceEndMs": 16543909,
          "text": "[音楽]"
        },
        {
          "speechId": 1768,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16550879,
          "sourceEndMs": 16558580,
          "text": "アメジストあった見つけちゃった"
        },
        {
          "speechId": 1769,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16561260,
          "sourceEndMs": 16564100,
          "text": "めっちゃ見てんじゃんダイヤモンド"
        },
        {
          "speechId": 1770,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16564509,
          "sourceEndMs": 16567629,
          "text": "[音楽]"
        },
        {
          "speechId": 1771,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16567939,
          "sourceEndMs": 16575320,
          "text": "こんなところにあれこっち空洞の方がの時かだぞ"
        },
        {
          "speechId": 1772,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16581959,
          "sourceEndMs": 16585760,
          "text": "今聞こえたな空洞の音かな"
        },
        {
          "speechId": 1773,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16587779,
          "sourceEndMs": 16590799,
          "text": "もっと下とか"
        },
        {
          "speechId": 1774,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16591020,
          "sourceEndMs": 16594340,
          "text": "上の可能性もある"
        },
        {
          "speechId": 1775,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16594619,
          "sourceEndMs": 16599799,
          "text": "無限大可能性は"
        },
        {
          "speechId": 1776,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16600020,
          "sourceEndMs": 16604299,
          "text": "獣こういう感じか"
        },
        {
          "speechId": 1777,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16611560,
          "sourceEndMs": 16616400,
          "text": "[音楽]"
        },
        {
          "speechId": 1778,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16627879,
          "sourceEndMs": 16634420,
          "text": "地上に戻ろう地上戻って上から直下掘りしていこう"
        },
        {
          "speechId": 1779,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16641180,
          "sourceEndMs": 16646061,
          "text": "寒くなってきたな上着こいとってよ"
        },
        {
          "speechId": 1780,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16655459,
          "sourceEndMs": 16657641,
          "text": "怖い音"
        },
        {
          "speechId": 1781,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16666141,
          "sourceEndMs": 16668980,
          "text": "か"
        },
        {
          "speechId": 1782,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16672680,
          "sourceEndMs": 16680260,
          "text": "ーゾンビいるってことは違うんだこの下やっぱり違うかもしれない"
        },
        {
          "speechId": 1783,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16687320,
          "sourceEndMs": 16690279,
          "text": "おって思っちゃう"
        },
        {
          "speechId": 1784,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16713500,
          "sourceEndMs": 16719400,
          "text": "大事何の音[音楽]"
        },
        {
          "speechId": 1785,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16723561,
          "sourceEndMs": 16725920,
          "text": "来た"
        },
        {
          "speechId": 1786,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16728900,
          "sourceEndMs": 16742779,
          "text": "もしかして迷子になったこれなくわかんなっちゃうねわかんなくなるもうそれぞれ上まで掘って帰っていくしかなくなるみ"
        },
        {
          "speechId": 1787,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16763219,
          "sourceEndMs": 16766840,
          "text": "このあたりは出られるか"
        },
        {
          "speechId": 1788,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16777340,
          "sourceEndMs": 16780940,
          "text": "戦争をします"
        },
        {
          "speechId": 1789,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16785680,
          "sourceEndMs": 16793330,
          "text": "[音楽]"
        },
        {
          "speechId": 1790,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16799718,
          "sourceEndMs": 16809200,
          "text": "カーはなさそうやねって言われてるんですけどどういう意味か分かりますか出てくるやつ"
        },
        {
          "speechId": 1791,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16813130,
          "sourceEndMs": 16839240,
          "text": "[笑い][音楽]どうしたお待たせ待った何でそれなのいつもやってるからいつやってんの[音楽]じゃねえだろそれよ"
        },
        {
          "speechId": 1792,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16839900,
          "sourceEndMs": 16842680,
          "text": "それもそうか"
        },
        {
          "speechId": 1793,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16847700,
          "sourceEndMs": 16853600,
          "text": "許さないよそんな勝手に独占するのは"
        },
        {
          "speechId": 1794,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16859458,
          "sourceEndMs": 16869860,
          "text": "みんなのとこ行きたいななどところに行きたいなぁでももう疲れちゃって"
        },
        {
          "speechId": 1795,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16870980,
          "sourceEndMs": 16873580,
          "text": "狼煙て上げろっ"
        },
        {
          "speechId": 1796,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16875130,
          "sourceEndMs": 16883180,
          "text": "[笑い]だめはブレイもやってない"
        },
        {
          "speechId": 1797,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16884718,
          "sourceEndMs": 16897218,
          "text": "最近何のゲームやってんの人間[音楽]です銃で倒す系のゲームをやってますね"
        },
        {
          "speechId": 1798,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16898310,
          "sourceEndMs": 16908138,
          "text": "[音楽]我々がジジイだと思ってタイトルを出さなかったのいらねえと思ったの"
        },
        {
          "speechId": 1799,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16908958,
          "sourceEndMs": 16914620,
          "text": "か聞いたことないと思うんですけどAPEXぐらい知ってる"
        },
        {
          "speechId": 1800,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16915820,
          "sourceEndMs": 16921458,
          "text": "ぞーっ知っててるしてるよ"
        },
        {
          "speechId": 1801,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16924700,
          "sourceEndMs": 16934540,
          "text": "大まかに一括りにっていう意味で言ったんですよなるほど[音楽]"
        },
        {
          "speechId": 1802,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16935138,
          "sourceEndMs": 16944360,
          "text": "みんなどこ俺地上地上から今直下掘りしてるすぐ"
        },
        {
          "speechId": 1803,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16944660,
          "sourceEndMs": 16953000,
          "text": "掘ってるんだ野生のセンサーばっかりやって何にもならねえんだこちら一旦"
        },
        {
          "speechId": 1804,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16954860,
          "sourceEndMs": 16960700,
          "text": "植えててみるちょっとじゃあ練習するか"
        },
        {
          "speechId": 1805,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16964218,
          "sourceEndMs": 16968920,
          "text": "溶岩に当たらない人でないと"
        },
        {
          "speechId": 1806,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16968958,
          "sourceEndMs": 16971320,
          "text": "厳しいですよ"
        },
        {
          "speechId": 1807,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16972740,
          "sourceEndMs": 16982580,
          "text": "できるよ本当に溶岩で知らない知らない[音楽]"
        },
        {
          "speechId": 1808,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 16997580,
          "sourceEndMs": 17002400,
          "text": "練習してるほとんど本番だけど"
        },
        {
          "speechId": 1809,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17009760,
          "sourceEndMs": 17016320,
          "text": "入れるかな後ろからの絵面やばなんで"
        },
        {
          "speechId": 1810,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17016500,
          "sourceEndMs": 17024700,
          "text": "パンツが頑張って見てるちょっと見てるでしょこれ"
        },
        {
          "speechId": 1811,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17025060,
          "sourceEndMs": 17027780,
          "text": "空間です"
        },
        {
          "speechId": 1812,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17031950,
          "sourceEndMs": 17045180,
          "text": "[音楽]飲み物ってゾンビ居すぎじゃないあんなに人間いねえだろ"
        },
        {
          "speechId": 1813,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17047760,
          "sourceEndMs": 17054900,
          "text": "あれ誰なんか名前見えるぞの誰か"
        },
        {
          "speechId": 1814,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17057458,
          "sourceEndMs": 17061798,
          "text": "ちょいちょいあかりちゃん"
        },
        {
          "speechId": 1815,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17071138,
          "sourceEndMs": 17081420,
          "text": "迷子だった人になった迷子が迷子人たちかつて迷子だったもの"
        },
        {
          "speechId": 1816,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17086638,
          "sourceEndMs": 17093240,
          "text": "さっきまで名前見えてたあれなんか音しない"
        },
        {
          "speechId": 1817,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17097240,
          "sourceEndMs": 17099718,
          "text": "あれだよ"
        },
        {
          "speechId": 1818,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17113620,
          "sourceEndMs": 17118560,
          "text": "ちょっと座標へんどっちらですか"
        },
        {
          "speechId": 1819,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17119510,
          "sourceEndMs": 17127200,
          "text": "[音楽]12946ここでも"
        },
        {
          "speechId": 1820,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17128760,
          "sourceEndMs": 17136138,
          "text": "ないっぽい飛んだ人の音聞こえましたえ俺じゃない女の人"
        },
        {
          "speechId": 1821,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17146740,
          "sourceEndMs": 17150540,
          "text": "ここテープダークじゃない"
        },
        {
          "speechId": 1822,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17161500,
          "sourceEndMs": 17168240,
          "text": "俺が近くにいるわ頑張った今高さどんぐらい"
        },
        {
          "speechId": 1823,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17168900,
          "sourceEndMs": 17181040,
          "text": "41です[笑い]"
        },
        {
          "speechId": 1824,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17185580,
          "sourceEndMs": 17190260,
          "text": "なんかたベッドを置いところ行きました"
        },
        {
          "speechId": 1825,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17205718,
          "sourceEndMs": 17209638,
          "text": "これなんか来たことあるね"
        },
        {
          "speechId": 1826,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17212860,
          "sourceEndMs": 17215940,
          "text": "これ天井裏でしょう"
        },
        {
          "speechId": 1827,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17220840,
          "sourceEndMs": 17223440,
          "text": "ベッド"
        },
        {
          "speechId": 1828,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17226958,
          "sourceEndMs": 17229560,
          "text": "これ聞こえる"
        },
        {
          "speechId": 1829,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17231400,
          "sourceEndMs": 17233940,
          "text": "どう"
        },
        {
          "speechId": 1830,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17236020,
          "sourceEndMs": 17239520,
          "text": "あ辺でもベッドの所らにいますか"
        },
        {
          "speechId": 1831,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17244360,
          "sourceEndMs": 17252280,
          "text": "出口っぽい方に向かって歩いてます帰れる"
        },
        {
          "speechId": 1832,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17262680,
          "sourceEndMs": 17267780,
          "text": "1個もこっちに届いてないのなんか面白いな"
        },
        {
          "speechId": 1833,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17267820,
          "sourceEndMs": 17271260,
          "text": "聞こえてないんだ"
        },
        {
          "speechId": 1834,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17274710,
          "sourceEndMs": 17277800,
          "text": "[音楽]"
        },
        {
          "speechId": 1835,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17284320,
          "sourceEndMs": 17286620,
          "text": "よ"
        },
        {
          "speechId": 1836,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17287920,
          "sourceEndMs": 17290100,
          "text": "合流できた"
        },
        {
          "speechId": 1837,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17292000,
          "sourceEndMs": 17298320,
          "text": "あ帰れるかもです寝ますか"
        },
        {
          "speechId": 1838,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17298798,
          "sourceEndMs": 17303780,
          "text": "どんどんどんどん上に掘っていくと帰れるよ"
        },
        {
          "speechId": 1839,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17305050,
          "sourceEndMs": 17308140,
          "text": "[音楽]"
        },
        {
          "speechId": 1840,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17313360,
          "sourceEndMs": 17316360,
          "text": "上昇"
        },
        {
          "speechId": 1841,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17323610,
          "sourceEndMs": 17326729,
          "text": "[音楽]"
        },
        {
          "speechId": 1842,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17329670,
          "sourceEndMs": 17332730,
          "text": "[音楽]"
        },
        {
          "speechId": 1843,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17333878,
          "sourceEndMs": 17336420,
          "text": "左か"
        },
        {
          "speechId": 1844,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17338700,
          "sourceEndMs": 17350520,
          "text": "[笑い]めっちゃかかってた待ってアプリ"
        },
        {
          "speechId": 1845,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17365740,
          "sourceEndMs": 17373560,
          "text": "深夜のテンションなうん深夜も深夜ですよ"
        },
        {
          "speechId": 1846,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17380920,
          "sourceEndMs": 17384180,
          "text": "なんか明るくなってきた"
        },
        {
          "speechId": 1847,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17385180,
          "sourceEndMs": 17387360,
          "text": "嘘です"
        },
        {
          "speechId": 1848,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17392680,
          "sourceEndMs": 17398810,
          "text": "よ[音楽]"
        },
        {
          "speechId": 1849,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17401340,
          "sourceEndMs": 17409298,
          "text": "消えちゃった痛い私地上"
        },
        {
          "speechId": 1850,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17410620,
          "sourceEndMs": 17413218,
          "text": "何だこれ"
        },
        {
          "speechId": 1851,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17418718,
          "sourceEndMs": 17421680,
          "text": "みんなどこだ"
        },
        {
          "speechId": 1852,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17423340,
          "sourceEndMs": 17431980,
          "text": "頑張ってね上がっております[音楽]強い"
        },
        {
          "speechId": 1853,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17432760,
          "sourceEndMs": 17434940,
          "text": "頼もしい"
        },
        {
          "speechId": 1854,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17437560,
          "sourceEndMs": 17440650,
          "text": "[音楽]"
        },
        {
          "speechId": 1855,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17442280,
          "sourceEndMs": 17445910,
          "text": "[笑い]"
        },
        {
          "speechId": 1856,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17449980,
          "sourceEndMs": 17453298,
          "text": "これないしか吹け"
        },
        {
          "speechId": 1857,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17455860,
          "sourceEndMs": 17458520,
          "text": "水だ"
        },
        {
          "speechId": 1858,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17464920,
          "sourceEndMs": 17468900,
          "text": "今って上に掘ってるんでした"
        },
        {
          "speechId": 1859,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17471900,
          "sourceEndMs": 17475080,
          "text": "ホテルみたい"
        },
        {
          "speechId": 1860,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17478718,
          "sourceEndMs": 17481860,
          "text": "酸素補給酸素補給"
        },
        {
          "speechId": 1861,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17487000,
          "sourceEndMs": 17494520,
          "text": "今みんながどこにいるのか俺にはわかるあそうそう"
        },
        {
          "speechId": 1862,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17501840,
          "sourceEndMs": 17504889,
          "text": "[音楽]"
        },
        {
          "speechId": 1863,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17506560,
          "sourceEndMs": 17510360,
          "text": "水聞こえるがめっちゃ怖い"
        },
        {
          "speechId": 1864,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17512440,
          "sourceEndMs": 17516480,
          "text": "しかもねマグマじゃないだけマシだ"
        },
        {
          "speechId": 1865,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17520190,
          "sourceEndMs": 17523340,
          "text": "[音楽]"
        },
        {
          "speechId": 1866,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17528080,
          "sourceEndMs": 17531139,
          "text": "[音楽]"
        },
        {
          "speechId": 1867,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17534220,
          "sourceEndMs": 17537419,
          "text": "[音楽]"
        },
        {
          "speechId": 1868,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17548260,
          "sourceEndMs": 17550920,
          "text": "育つんかなこれ"
        },
        {
          "speechId": 1869,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17551520,
          "sourceEndMs": 17555240,
          "text": "思ったんと違うわ"
        },
        {
          "speechId": 1870,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17558340,
          "sourceEndMs": 17562080,
          "text": "あれいるよ"
        },
        {
          "speechId": 1871,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17562120,
          "sourceEndMs": 17564480,
          "text": "よかった"
        },
        {
          "speechId": 1872,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17566798,
          "sourceEndMs": 17573360,
          "text": "俺をら導く明かりとなってくれてるって事"
        },
        {
          "speechId": 1873,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17576218,
          "sourceEndMs": 17581100,
          "text": "してるからさ赤ちゃんマンみたい"
        },
        {
          "speechId": 1874,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17585280,
          "sourceEndMs": 17588540,
          "text": "名前もそうっぽい"
        },
        {
          "speechId": 1875,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17591298,
          "sourceEndMs": 17594600,
          "text": "やったー"
        },
        {
          "speechId": 1876,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17602920,
          "sourceEndMs": 17610869,
          "text": "飛んきでたお前ら見つから[音楽]"
        },
        {
          "speechId": 1877,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17611798,
          "sourceEndMs": 17615900,
          "text": "なかった俺のワンちゃん"
        },
        {
          "speechId": 1878,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17616440,
          "sourceEndMs": 17620400,
          "text": "開放してプロレス"
        },
        {
          "speechId": 1879,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17627810,
          "sourceEndMs": 17630849,
          "text": "[音楽]"
        },
        {
          "speechId": 1880,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17634718,
          "sourceEndMs": 17637860,
          "text": "上がってあれきちゃいました"
        },
        {
          "speechId": 1881,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17637980,
          "sourceEndMs": 17642958,
          "text": "山の中腹ぐらいにいるようちら"
        },
        {
          "speechId": 1882,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17643920,
          "sourceEndMs": 17647458,
          "text": "頂上で落ち合う"
        },
        {
          "speechId": 1883,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17648240,
          "sourceEndMs": 17651298,
          "text": "飛べるから"
        },
        {
          "speechId": 1884,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17654610,
          "sourceEndMs": 17657830,
          "text": "[音楽]"
        },
        {
          "speechId": 1885,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17661900,
          "sourceEndMs": 17667080,
          "text": "こういう時が増えじゃない確かに"
        },
        {
          "speechId": 1886,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17667958,
          "sourceEndMs": 17672380,
          "text": "お願いします[音楽]"
        },
        {
          "speechId": 1887,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17676360,
          "sourceEndMs": 17681718,
          "text": "[音楽]か"
        },
        {
          "speechId": 1888,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17683360,
          "sourceEndMs": 17692349,
          "text": "[音楽]思ったより広いなここ[音楽]"
        },
        {
          "speechId": 1889,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17694360,
          "sourceEndMs": 17696718,
          "text": "蜂の巣あるよ"
        },
        {
          "speechId": 1890,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17698410,
          "sourceEndMs": 17701639,
          "text": "[音楽]"
        },
        {
          "speechId": 1891,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17716090,
          "sourceEndMs": 17719159,
          "text": "[音楽]"
        },
        {
          "speechId": 1892,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17726940,
          "sourceEndMs": 17730378,
          "text": "野蛮な連中が住んでるところ"
        },
        {
          "speechId": 1893,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17731130,
          "sourceEndMs": 17734310,
          "text": "[音楽]"
        },
        {
          "speechId": 1894,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17738120,
          "sourceEndMs": 17741420,
          "text": "正義執行"
        },
        {
          "speechId": 1895,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17745298,
          "sourceEndMs": 17747840,
          "text": "行こう"
        },
        {
          "speechId": 1896,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17749520,
          "sourceEndMs": 17752940,
          "text": "正義の力で"
        },
        {
          "speechId": 1897,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17754680,
          "sourceEndMs": 17766378,
          "text": "赤ちゃんマンが赤ちゃん本舗お店地球ないみたいなね飛ぶんじゃ"
        },
        {
          "speechId": 1898,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17768340,
          "sourceEndMs": 17776280,
          "text": "あれガチャガチャじゃないぞじゃないあれはいるぞガチャポンじゃない"
        },
        {
          "speechId": 1899,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17777160,
          "sourceEndMs": 17782040,
          "text": "ロープで取られてる開放しろ"
        },
        {
          "speechId": 1900,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17787480,
          "sourceEndMs": 17796540,
          "text": "[音楽]こいつ"
        },
        {
          "speechId": 1901,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17796910,
          "sourceEndMs": 17806280,
          "text": "[音楽]連れて帰ろうこれじゃ敵ないのこれ敵"
        },
        {
          "speechId": 1902,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17809740,
          "sourceEndMs": 17817020,
          "text": "なんかあれじゃない館のてるやつが召喚してくるやつに似"
        },
        {
          "speechId": 1903,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17817060,
          "sourceEndMs": 17821638,
          "text": "こいつ名前はあれってのやつよ"
        },
        {
          "speechId": 1904,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17834000,
          "sourceEndMs": 17837120,
          "text": "見つけようぜ"
        },
        {
          "speechId": 1905,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17838120,
          "sourceEndMs": 17840600,
          "text": "火つけようとする"
        },
        {
          "speechId": 1906,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17845920,
          "sourceEndMs": 17849580,
          "text": "人参と"
        },
        {
          "speechId": 1907,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17851320,
          "sourceEndMs": 17854218,
          "text": "あ火ついてる"
        },
        {
          "speechId": 1908,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17855460,
          "sourceEndMs": 17861298,
          "text": "[音楽]どうやって帰れって"
        },
        {
          "speechId": 1909,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17863560,
          "sourceEndMs": 17865740,
          "text": "怒られました"
        },
        {
          "speechId": 1910,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17875680,
          "sourceEndMs": 17882900,
          "text": "燃えてるこれがこれが正義の炎なんて美しいんだ"
        },
        {
          "speechId": 1911,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17885160,
          "sourceEndMs": 17896280,
          "text": "これが正義のあかりだけど世界は平和になったねこれで一つ悪ねは滅んだ"
        },
        {
          "speechId": 1912,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17897770,
          "sourceEndMs": 17907249,
          "text": "[音楽]まだいる何[音楽]"
        },
        {
          "speechId": 1913,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17907480,
          "sourceEndMs": 17909480,
          "text": "冊"
        },
        {
          "speechId": 1914,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17911500,
          "sourceEndMs": 17915180,
          "text": "点滴必殺"
        },
        {
          "speechId": 1915,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17918760,
          "sourceEndMs": 17923979,
          "text": "いいじゃん[音楽]"
        },
        {
          "speechId": 1916,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17924420,
          "sourceEndMs": 17928620,
          "text": "何これなの妖精"
        },
        {
          "speechId": 1917,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17933480,
          "sourceEndMs": 17937560,
          "text": "ライブよ回復してくれねえんだ"
        },
        {
          "speechId": 1918,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17941400,
          "sourceEndMs": 17945180,
          "text": "すりつぶしたら入るんじゃない"
        },
        {
          "speechId": 1919,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17948120,
          "sourceEndMs": 17951240,
          "text": "まだいる"
        },
        {
          "speechId": 1920,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17956500,
          "sourceEndMs": 17959740,
          "text": "救済実行正義"
        },
        {
          "speechId": 1921,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17960340,
          "sourceEndMs": 17965760,
          "text": "執行[音楽]してんの"
        },
        {
          "speechId": 1922,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17970378,
          "sourceEndMs": 17980160,
          "text": "本当こいつだそうだったらなんかアイテム投げたら仲良くなってくれるよ"
        },
        {
          "speechId": 1923,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17981670,
          "sourceEndMs": 17985280,
          "text": "[音楽]"
        },
        {
          "speechId": 1924,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 17997138,
          "sourceEndMs": 18003290,
          "text": "有効か型[音楽]"
        },
        {
          "speechId": 1925,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18011820,
          "sourceEndMs": 18014820,
          "text": "わいい"
        },
        {
          "speechId": 1926,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18021480,
          "sourceEndMs": 18049089,
          "text": "ただいまあげる右クリックを右クリックで持って右クリックであげますよそうなんだうーんなんか木の棒持ってってる泥棒こいつでも捕まえれないのもうこれでついてくるみたいよ[音楽]"
        },
        {
          "speechId": 1927,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18049740,
          "sourceEndMs": 18052400,
          "text": "祭りのやつか"
        },
        {
          "speechId": 1928,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18052830,
          "sourceEndMs": 18058520,
          "text": "[音楽]OK"
        },
        {
          "speechId": 1929,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18063840,
          "sourceEndMs": 18074180,
          "text": "収穫だな帰り道忘れた守って15ゴール"
        },
        {
          "speechId": 1930,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18074878,
          "sourceEndMs": 18077240,
          "text": "OK"
        },
        {
          "speechId": 1931,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18079798,
          "sourceEndMs": 18083120,
          "text": "だこの野郎"
        },
        {
          "speechId": 1932,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18105260,
          "sourceEndMs": 18108980,
          "text": "この世界は"
        },
        {
          "speechId": 1933,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18109138,
          "sourceEndMs": 18117740,
          "text": "弱肉強食野蛮だよ[音楽]出てきてください"
        },
        {
          "speechId": 1934,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18117760,
          "sourceEndMs": 18127340,
          "text": "[音楽]文化人だからね[音楽]耳に刺さってるよ"
        },
        {
          "speechId": 1935,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18130940,
          "sourceEndMs": 18135138,
          "text": "前衛的倒せ"
        },
        {
          "speechId": 1936,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18139740,
          "sourceEndMs": 18147620,
          "text": "ファッションリーダー[音楽]モンスターいてー"
        },
        {
          "speechId": 1937,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18149040,
          "sourceEndMs": 18151760,
          "text": "ついてるよ"
        },
        {
          "speechId": 1938,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18152480,
          "sourceEndMs": 18155840,
          "text": "エルフだからね"
        },
        {
          "speechId": 1939,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18156660,
          "sourceEndMs": 18159860,
          "text": "これは耳"
        },
        {
          "speechId": 1940,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18161340,
          "sourceEndMs": 18163580,
          "text": "伸びちゃった"
        },
        {
          "speechId": 1941,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18163710,
          "sourceEndMs": 18167840,
          "text": "[音楽]ちょっと成長する"
        },
        {
          "speechId": 1942,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18170700,
          "sourceEndMs": 18176689,
          "text": "まあまあか[音楽]"
        },
        {
          "speechId": 1943,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18183600,
          "sourceEndMs": 18206180,
          "text": "すごいちゃんとついてきてるの可愛いなぁ可愛いこれ何なの何の何俺もよくわかってないなんかアイテム渡すとそれを集めてきてくれるみたいな[音楽]すごいじゃん"
        },
        {
          "speechId": 1944,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18206280,
          "sourceEndMs": 18208700,
          "text": "自動"
        },
        {
          "speechId": 1945,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18211490,
          "sourceEndMs": 18223700,
          "text": "[音楽]進化しまくったらこいつを使ったトラップとかができるのかなできるかもしれない[音楽]アメジストです"
        },
        {
          "speechId": 1946,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18237060,
          "sourceEndMs": 18239660,
          "text": "ニワトリも増やそう"
        },
        {
          "speechId": 1947,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18240420,
          "sourceEndMs": 18243740,
          "text": "何が面白い"
        },
        {
          "speechId": 1948,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18252060,
          "sourceEndMs": 18261860,
          "text": "可愛いピヨピヨ言ってるこれ持ってるもの返してもらうことできないのかな右ないクリックで書いてもいいんじゃ"
        },
        {
          "speechId": 1949,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18261900,
          "sourceEndMs": 18267080,
          "text": "[音楽]ぶん殴れいばいってこと"
        },
        {
          "speechId": 1950,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18278840,
          "sourceEndMs": 18284480,
          "text": "レコード音楽聞かせながらアメジストあげると増えるの"
        },
        {
          "speechId": 1951,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18287700,
          "sourceEndMs": 18299830,
          "text": "雰囲気重視ですよここにさっき取ってきたレコードがございます[音楽]"
        },
        {
          "speechId": 1952,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18299958,
          "sourceEndMs": 18305780,
          "text": "聞いてみよう最盛が期ないよ"
        },
        {
          "speechId": 1953,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18307740,
          "sourceEndMs": 18310340,
          "text": "うちあるよ"
        },
        {
          "speechId": 1954,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18312718,
          "sourceEndMs": 18316100,
          "text": "音楽再生できんだけど"
        },
        {
          "speechId": 1955,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18317160,
          "sourceEndMs": 18324798,
          "text": "寄ってこ[音楽]いけるかもね"
        },
        {
          "speechId": 1956,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18324830,
          "sourceEndMs": 18330520,
          "text": "[音楽]"
        },
        {
          "speechId": 1957,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18332710,
          "sourceEndMs": 18338840,
          "text": "[音楽]何かかした"
        },
        {
          "speechId": 1958,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18339980,
          "sourceEndMs": 18348120,
          "text": "音楽をかけると踊り出すので途中でダメージスト上げると分裂する分裂"
        },
        {
          "speechId": 1959,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18348240,
          "sourceEndMs": 18350840,
          "text": "肝細胞分裂"
        },
        {
          "speechId": 1960,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18353638,
          "sourceEndMs": 18357900,
          "text": "ご機嫌になると増える"
        },
        {
          "speechId": 1961,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18359760,
          "sourceEndMs": 18363958,
          "text": "」って言われてるやめろ"
        },
        {
          "speechId": 1962,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18364870,
          "sourceEndMs": 18374060,
          "text": "[笑い]殺させようとするな[笑い]"
        },
        {
          "speechId": 1963,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18387240,
          "sourceEndMs": 18393798,
          "text": "こんな長い道のりをみんなみんな思ってたね"
        },
        {
          "speechId": 1964,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18395760,
          "sourceEndMs": 18398780,
          "text": "で一人もじゃないから"
        },
        {
          "speechId": 1965,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18400420,
          "sourceEndMs": 18408620,
          "text": "[音楽]川が仲間がいるよお前に今残ってるものはなんじゃ"
        },
        {
          "speechId": 1966,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18409560,
          "sourceEndMs": 18412218,
          "text": "仲間がいるよ"
        },
        {
          "speechId": 1967,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18414320,
          "sourceEndMs": 18418820,
          "text": "ね全然違う"
        },
        {
          "speechId": 1968,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18423840,
          "sourceEndMs": 18427520,
          "text": "2つぐらい前だよ"
        },
        {
          "speechId": 1969,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18446280,
          "sourceEndMs": 18452020,
          "text": "やめなよ[笑い]"
        },
        {
          "speechId": 1970,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18472040,
          "sourceEndMs": 18481040,
          "text": "[音楽]帰って言える"
        },
        {
          "speechId": 1971,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18483718,
          "sourceEndMs": 18491060,
          "text": "はじめましておかえりなさいおかえりこれから仲良くしていただけると嬉しいです"
        },
        {
          "speechId": 1972,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18494220,
          "sourceEndMs": 18499919,
          "text": "[音楽]"
        },
        {
          "speechId": 1973,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18502920,
          "sourceEndMs": 18505940,
          "text": "音楽ってすごい"
        },
        {
          "speechId": 1974,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18509760,
          "sourceEndMs": 18514700,
          "text": "よここ通るんだお前ら持ってない"
        },
        {
          "speechId": 1975,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18515660,
          "sourceEndMs": 18519560,
          "text": "ついてきたね"
        },
        {
          "speechId": 1976,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18539600,
          "sourceEndMs": 18543500,
          "text": "それもまたよし"
        },
        {
          "speechId": 1977,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18543740,
          "sourceEndMs": 18550539,
          "text": "乗っちゃおう[笑い]"
        },
        {
          "speechId": 1978,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18561138,
          "sourceEndMs": 18571490,
          "text": "のところに[笑い]"
        },
        {
          "speechId": 1979,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18572760,
          "sourceEndMs": 18577430,
          "text": "1人消えた[音楽]"
        },
        {
          "speechId": 1980,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18580218,
          "sourceEndMs": 18585798,
          "text": "のに走ってる心では"
        },
        {
          "speechId": 1981,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18587218,
          "sourceEndMs": 18597650,
          "text": "窓の外に周りを走らせてる[笑い][音楽]"
        },
        {
          "speechId": 1982,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18598080,
          "sourceEndMs": 18600200,
          "text": "抜いた"
        },
        {
          "speechId": 1983,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18600600,
          "sourceEndMs": 18605000,
          "text": "よ[音楽]"
        },
        {
          "speechId": 1984,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18610410,
          "sourceEndMs": 18613490,
          "text": "[音楽]"
        },
        {
          "speechId": 1985,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18615680,
          "sourceEndMs": 18619689,
          "text": "[笑い]"
        },
        {
          "speechId": 1986,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18620458,
          "sourceEndMs": 18622760,
          "text": "待ちなさい"
        },
        {
          "speechId": 1987,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18623360,
          "sourceEndMs": 18630138,
          "text": "私はここよ[音楽]待ちなさい"
        },
        {
          "speechId": 1988,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18630240,
          "sourceEndMs": 18634280,
          "text": "あの頃先にゴールに着くよ"
        },
        {
          "speechId": 1989,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18635160,
          "sourceEndMs": 18643019,
          "text": "待ちなさいそのまま許さないわ[笑い][音楽]"
        },
        {
          "speechId": 1990,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18647160,
          "sourceEndMs": 18650160,
          "text": "時計"
        },
        {
          "speechId": 1991,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18659480,
          "sourceEndMs": 18664930,
          "text": "来た[笑い]"
        },
        {
          "speechId": 1992,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18664940,
          "sourceEndMs": 18668220,
          "text": "[音楽]"
        },
        {
          "speechId": 1993,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18671820,
          "sourceEndMs": 18674820,
          "text": "よ"
        },
        {
          "speechId": 1994,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18681130,
          "sourceEndMs": 18684189,
          "text": "[音楽]"
        },
        {
          "speechId": 1995,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18688440,
          "sourceEndMs": 18690798,
          "text": "早い"
        },
        {
          "speechId": 1996,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18691080,
          "sourceEndMs": 18695540,
          "text": "めちゃめちゃねー長いんだびっくりした"
        },
        {
          "speechId": 1997,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18695940,
          "sourceEndMs": 18698420,
          "text": "着いた"
        },
        {
          "speechId": 1998,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18702740,
          "sourceEndMs": 18706100,
          "text": "なんかすごいな"
        },
        {
          "speechId": 1999,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18713540,
          "sourceEndMs": 18729680,
          "text": "[笑い]お待たせお待たせ待った[音楽]ね早すぎた"
        },
        {
          "speechId": 2000,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18729840,
          "sourceEndMs": 18732080,
          "text": "か"
        },
        {
          "speechId": 2001,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18733500,
          "sourceEndMs": 18742100,
          "text": "いるいる一人だけ嘘本当だ他の奴らは"
        },
        {
          "speechId": 2002,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18743840,
          "sourceEndMs": 18749780,
          "text": "次ヘッドを地図じゃ"
        },
        {
          "speechId": 2003,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18749940,
          "sourceEndMs": 18752240,
          "text": "ん"
        },
        {
          "speechId": 2004,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18753000,
          "sourceEndMs": 18755180,
          "text": "か"
        },
        {
          "speechId": 2005,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18755718,
          "sourceEndMs": 18759378,
          "text": "音楽聞かせよう"
        },
        {
          "speechId": 2006,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18760138,
          "sourceEndMs": 18762860,
          "text": "聞かせ"
        },
        {
          "speechId": 2007,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18764878,
          "sourceEndMs": 18772080,
          "text": "音楽どこでオレンジ連れて行けないクリエイト"
        },
        {
          "speechId": 2008,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18774420,
          "sourceEndMs": 18777798,
          "text": "何で五右衛門作ったんだ"
        },
        {
          "speechId": 2009,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18778680,
          "sourceEndMs": 18781830,
          "text": "[音楽]"
        },
        {
          "speechId": 2010,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18782520,
          "sourceEndMs": 18787400,
          "text": "すごい鉄が焼けてるわいて"
        },
        {
          "speechId": 2011,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18789958,
          "sourceEndMs": 18799638,
          "text": "無線みたいちょっとあげよう再生できるもん呟いてか"
        },
        {
          "speechId": 2012,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18800610,
          "sourceEndMs": 18826479,
          "text": "[音楽]キラキラの太陽濡れた素肌チンチンみたいよ日焼けの後白くなってるのあなただけに見せてあげる[音楽]"
        },
        {
          "speechId": 2013,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18828770,
          "sourceEndMs": 18834080,
          "text": "[笑い]ほらアメジスト上げてよ早く"
        },
        {
          "speechId": 2014,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18834480,
          "sourceEndMs": 18841638,
          "text": "音楽がないとどうやってあげればいいんだろうレコードイン"
        },
        {
          "speechId": 2015,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18842180,
          "sourceEndMs": 18849620,
          "text": "今だそう増えたよ"
        },
        {
          "speechId": 2016,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18850420,
          "sourceEndMs": 18853520,
          "text": "[音楽]"
        },
        {
          "speechId": 2017,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18862378,
          "sourceEndMs": 18864560,
          "text": "痩せやすい"
        },
        {
          "speechId": 2018,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18897160,
          "sourceEndMs": 18900250,
          "text": "[音楽]"
        },
        {
          "speechId": 2019,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18910440,
          "sourceEndMs": 18913280,
          "text": "青いけど"
        },
        {
          "speechId": 2020,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18919138,
          "sourceEndMs": 18923820,
          "text": "だからこの曲よくないいい"
        },
        {
          "speechId": 2021,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18924480,
          "sourceEndMs": 18926480,
          "text": "じゃん"
        },
        {
          "speechId": 2022,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18927298,
          "sourceEndMs": 18930080,
          "text": "当たりだな"
        },
        {
          "speechId": 2023,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18936138,
          "sourceEndMs": 18943400,
          "text": "パクられた君は友達トイストーリーの主題歌やん"
        },
        {
          "speechId": 2024,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18943620,
          "sourceEndMs": 18955138,
          "text": "意味は[音楽]友達俺がついてるぜいつもそばにいるこれ"
        },
        {
          "speechId": 2025,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18962420,
          "sourceEndMs": 18965840,
          "text": "マザーのような"
        },
        {
          "speechId": 2026,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18967378,
          "sourceEndMs": 18970280,
          "text": "曲げない"
        },
        {
          "speechId": 2027,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18970620,
          "sourceEndMs": 18975620,
          "text": "時間が必要か5分ぐらいでなんかかかるんだよ"
        },
        {
          "speechId": 2028,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18985638,
          "sourceEndMs": 18990378,
          "text": "BGMにしたらいいか"
        },
        {
          "speechId": 2029,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18993500,
          "sourceEndMs": 18996740,
          "text": "裏打ちみたいな"
        },
        {
          "speechId": 2030,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 18997500,
          "sourceEndMs": 19001000,
          "text": "また入れればいいのだよ"
        },
        {
          "speechId": 2031,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19002440,
          "sourceEndMs": 19005860,
          "text": "聞いてみようぜ"
        },
        {
          "speechId": 2032,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19018460,
          "sourceEndMs": 19021610,
          "text": "[音楽]"
        },
        {
          "speechId": 2033,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19026060,
          "sourceEndMs": 19034480,
          "text": "めっちゃ楽しそうなのやめてこんな音楽で気に入ったって怖いよ"
        },
        {
          "speechId": 2034,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19036620,
          "sourceEndMs": 19040030,
          "text": "[笑い]"
        },
        {
          "speechId": 2035,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19040820,
          "sourceEndMs": 19055840,
          "text": "暗くてこの音楽流れててこれいたらお化けみたいだな[音楽]可愛いのに明るいところで明るい曲怖い怖い怖いこれもなんか微妙じゃね同じ"
        },
        {
          "speechId": 2036,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19056100,
          "sourceEndMs": 19059210,
          "text": "[音楽]"
        },
        {
          "speechId": 2037,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19063320,
          "sourceEndMs": 19066458,
          "text": "あ黄色ですよ"
        },
        {
          "speechId": 2038,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19067940,
          "sourceEndMs": 19072040,
          "text": "一緒かやっぱこれだ"
        },
        {
          "speechId": 2039,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19072080,
          "sourceEndMs": 19077020,
          "text": "[音楽]可愛いディズニーぽいし"
        },
        {
          "speechId": 2040,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19081400,
          "sourceEndMs": 19100060,
          "text": "早くもっと増やしたいのになぁ[音楽]5分後いないの他に牧場作ってるとここいつの牧場ないのかなね誰かやってるんじゃないの"
        },
        {
          "speechId": 2041,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19100718,
          "sourceEndMs": 19113378,
          "text": "ちょっともらおう家まで来てか作ってる来いよ来る感じだ[音楽]この子は"
        },
        {
          "speechId": 2042,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19116480,
          "sourceEndMs": 19120340,
          "text": "ロープしないとかないとこの子どうなる"
        },
        {
          "speechId": 2043,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19121400,
          "sourceEndMs": 19124900,
          "text": "名前とかもつけるの"
        },
        {
          "speechId": 2044,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19127958,
          "sourceEndMs": 19134378,
          "text": "こっち来たそうにしてるあれ1人"
        },
        {
          "speechId": 2045,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19143360,
          "sourceEndMs": 19151780,
          "text": "替え歌のタワーにいるらしいよこいつうーんあれなんかめっちゃ燃えてないあれ元から燃えてるもんか"
        },
        {
          "speechId": 2046,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19152180,
          "sourceEndMs": 19158320,
          "text": "なんか正面本当から燃えてるやつだな"
        },
        {
          "speechId": 2047,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19158798,
          "sourceEndMs": 19162160,
          "text": "家まで来て"
        },
        {
          "speechId": 2048,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19165560,
          "sourceEndMs": 19168040,
          "text": "びっくりしちゃう"
        },
        {
          "speechId": 2049,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19171080,
          "sourceEndMs": 19175490,
          "text": "行こうぜ[音楽]"
        },
        {
          "speechId": 2050,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19176378,
          "sourceEndMs": 19179680,
          "text": "帰ってきた"
        },
        {
          "speechId": 2051,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19182060,
          "sourceEndMs": 19189458,
          "text": "ぜ[音楽]塞がれてしまうんだ"
        },
        {
          "speechId": 2052,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19191180,
          "sourceEndMs": 19193600,
          "text": "行こう"
        },
        {
          "speechId": 2053,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19195680,
          "sourceEndMs": 19209200,
          "text": "とインパクトもすごいんだっけいる鎧つけてやるんだよ今度馬鎧誰かにあげたい"
        },
        {
          "speechId": 2054,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19210740,
          "sourceEndMs": 19214120,
          "text": "溶かしちゃったおかかっ"
        },
        {
          "speechId": 2055,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19215060,
          "sourceEndMs": 19217060,
          "text": "ちゃった"
        },
        {
          "speechId": 2056,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19217400,
          "sourceEndMs": 19220958,
          "text": "うわ懐かしいこれ何だっけこれ"
        },
        {
          "speechId": 2057,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19222620,
          "sourceEndMs": 19239880,
          "text": "このなんか人形人形でこいつこいつ流行ってた忘れた何なんか白いもふもふみたいなやつ[音楽]"
        },
        {
          "speechId": 2058,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19240740,
          "sourceEndMs": 19243520,
          "text": "いや違う"
        },
        {
          "speechId": 2059,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19250540,
          "sourceEndMs": 19254138,
          "text": "あーそんな感じ"
        },
        {
          "speechId": 2060,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19255040,
          "sourceEndMs": 19258100,
          "text": "ミニ太郎"
        },
        {
          "speechId": 2061,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19260900,
          "sourceEndMs": 19264040,
          "text": "思い出ポロポロ"
        },
        {
          "speechId": 2062,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19265400,
          "sourceEndMs": 19275209,
          "text": "いいねマイクラってそう思い出が残ってんだここに[音楽]"
        },
        {
          "speechId": 2063,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19280958,
          "sourceEndMs": 19299378,
          "text": "な帰ってきたよいろいろ変わってもこの道は同じだ私が同じ京都みたい5番の目って後ろ後ろ"
        },
        {
          "speechId": 2064,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19300200,
          "sourceEndMs": 19303700,
          "text": "逃げ上手の若君で"
        },
        {
          "speechId": 2065,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19303860,
          "sourceEndMs": 19306760,
          "text": "かわいい"
        },
        {
          "speechId": 2066,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19307458,
          "sourceEndMs": 19310360,
          "text": "増やそうぜ"
        },
        {
          "speechId": 2067,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19312020,
          "sourceEndMs": 19314440,
          "text": "行くじゃん"
        },
        {
          "speechId": 2068,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19315300,
          "sourceEndMs": 19320080,
          "text": "[音楽]外出たよ"
        },
        {
          "speechId": 2069,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19320900,
          "sourceEndMs": 19332080,
          "text": "[音楽]踊ってる踊ってる楽しそう外が外やっぱに出たいんだ"
        },
        {
          "speechId": 2070,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19332770,
          "sourceEndMs": 19337660,
          "text": "[音楽]"
        },
        {
          "speechId": 2071,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19341180,
          "sourceEndMs": 19352869,
          "text": "めっちゃいるじゃんほんとだすげー中それ里親募集だから[音楽]"
        },
        {
          "speechId": 2072,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19354160,
          "sourceEndMs": 19357550,
          "text": "[笑い]"
        },
        {
          "speechId": 2073,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19366350,
          "sourceEndMs": 19374430,
          "text": "[音楽][笑い]"
        },
        {
          "speechId": 2074,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19381560,
          "sourceEndMs": 19385120,
          "text": "アメジストってブロックでいいの"
        },
        {
          "speechId": 2075,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19401600,
          "sourceEndMs": 19407500,
          "text": "じゃないと無理かあだすげー多頭飼い"
        },
        {
          "speechId": 2076,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19408380,
          "sourceEndMs": 19412420,
          "text": "[音楽]散歩大変そう"
        },
        {
          "speechId": 2077,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19421120,
          "sourceEndMs": 19424120,
          "text": "だよ"
        },
        {
          "speechId": 2078,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19424770,
          "sourceEndMs": 19431680,
          "text": "[音楽]ベル先輩の家に持ってきて"
        },
        {
          "speechId": 2079,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19439040,
          "sourceEndMs": 19449378,
          "text": "ベイクドポテトあげた嬉しそう朝マックの帰りの子供みたい"
        },
        {
          "speechId": 2080,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19453218,
          "sourceEndMs": 19460120,
          "text": "あれハッシュドポテトでしょかぼちゃなぁと嬉しい"
        },
        {
          "speechId": 2081,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19461180,
          "sourceEndMs": 19465760,
          "text": "どうやったらアイテム出せるんだっけ可愛い"
        },
        {
          "speechId": 2082,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19470500,
          "sourceEndMs": 19475060,
          "text": "そういうなんかやばい人みたいになってるよ"
        },
        {
          "speechId": 2083,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19486010,
          "sourceEndMs": 19489669,
          "text": "[音楽]"
        },
        {
          "speechId": 2084,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19497680,
          "sourceEndMs": 19507160,
          "text": "ぐらい持ってニワトリが入ってる入ってるうわよし一旦これで"
        },
        {
          "speechId": 2085,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19510920,
          "sourceEndMs": 19520060,
          "text": "もうちょっと広くしたらこれくらい狭いから狭いから"
        },
        {
          "speechId": 2086,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19522080,
          "sourceEndMs": 19524320,
          "text": "泣いてるよ"
        },
        {
          "speechId": 2087,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19529458,
          "sourceEndMs": 19531878,
          "text": "はい"
        },
        {
          "speechId": 2088,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19532400,
          "sourceEndMs": 19536560,
          "text": "こいつなきゃが出てきてくんちょっと"
        },
        {
          "speechId": 2089,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19536600,
          "sourceEndMs": 19549700,
          "text": "おじさんも中にさ入ってくれた加工で俺もね超えたらついてきてくれないのよ歩き回ったらさ遠心ない力でちゃんとなんじゃ"
        },
        {
          "speechId": 2090,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19550218,
          "sourceEndMs": 19553218,
          "text": "もの"
        },
        {
          "speechId": 2091,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19555860,
          "sourceEndMs": 19561160,
          "text": "俺が持ってるものを渡さなきゃねちょっと来くれてないのよ"
        },
        {
          "speechId": 2092,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19566080,
          "sourceEndMs": 19569440,
          "text": "ポテト渡さんで"
        },
        {
          "speechId": 2093,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19579440,
          "sourceEndMs": 19582400,
          "text": "飛び回っちゃってる"
        },
        {
          "speechId": 2094,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19586040,
          "sourceEndMs": 19591549,
          "text": "構えてやろう[音楽]"
        },
        {
          "speechId": 2095,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19608718,
          "sourceEndMs": 19611718,
          "text": "1"
        },
        {
          "speechId": 2096,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19611840,
          "sourceEndMs": 19616840,
          "text": "匹普通に出ちゃってる取られた"
        },
        {
          "speechId": 2097,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19621200,
          "sourceEndMs": 19625860,
          "text": "逃げるな[音楽]"
        },
        {
          "speechId": 2098,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19628600,
          "sourceEndMs": 19632320,
          "text": "OKこれ全部"
        },
        {
          "speechId": 2099,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19636820,
          "sourceEndMs": 19640820,
          "text": "OKこれ"
        },
        {
          "speechId": 2100,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19641040,
          "sourceEndMs": 19650680,
          "text": "[音楽]蜂みたいに飛んでいくの大変だね[音楽]羽ちょっと切った方がいいかも"
        },
        {
          "speechId": 2101,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19651798,
          "sourceEndMs": 19656630,
          "text": "風邪切りだね[音楽]"
        },
        {
          "speechId": 2102,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19660680,
          "sourceEndMs": 19663759,
          "text": "[音楽]"
        },
        {
          "speechId": 2103,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19665420,
          "sourceEndMs": 19669160,
          "text": "あれ増えた増えてるな"
        },
        {
          "speechId": 2104,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19682400,
          "sourceEndMs": 19684400,
          "text": "可愛い"
        },
        {
          "speechId": 2105,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19685820,
          "sourceEndMs": 19689378,
          "text": "めちゃめちゃ増えてる気がする"
        },
        {
          "speechId": 2106,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19690900,
          "sourceEndMs": 19693218,
          "text": "[音楽]可愛い"
        },
        {
          "speechId": 2107,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19696860,
          "sourceEndMs": 19700180,
          "text": "欲しくなったらここに取りに行こうよ"
        },
        {
          "speechId": 2108,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19705420,
          "sourceEndMs": 19708530,
          "text": "[音楽]"
        },
        {
          "speechId": 2109,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19715100,
          "sourceEndMs": 19723160,
          "text": "難しくないし1匹いればいいもんな確かにね楽だな"
        },
        {
          "speechId": 2110,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19727160,
          "sourceEndMs": 19731378,
          "text": "じゃあ終わりますか"
        },
        {
          "speechId": 2111,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19732940,
          "sourceEndMs": 19739760,
          "text": "ちょっと次探しとくよあれ"
        },
        {
          "speechId": 2112,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19739940,
          "sourceEndMs": 19743560,
          "text": "遺跡じゃねえんだ遺跡じゃわねえんだ"
        },
        {
          "speechId": 2113,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19748458,
          "sourceEndMs": 19754718,
          "text": "探して見つけたらまた呼ぶわいえーいえーい"
        },
        {
          "speechId": 2114,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19756560,
          "sourceEndMs": 19761378,
          "text": "じゃあ今日はお疲れ様でした"
        },
        {
          "speechId": 2115,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19764680,
          "sourceEndMs": 19772540,
          "text": "楽しかったね[音楽]集合しとく"
        },
        {
          "speechId": 2116,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19775400,
          "sourceEndMs": 19779360,
          "text": "ここで"
        },
        {
          "speechId": 2117,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19779780,
          "sourceEndMs": 19783040,
          "text": "笑われてるよ"
        },
        {
          "speechId": 2118,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19783810,
          "sourceEndMs": 19790230,
          "text": "[笑い]"
        },
        {
          "speechId": 2119,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19791298,
          "sourceEndMs": 19795820,
          "text": "いいじゃん楽しかった"
        },
        {
          "speechId": 2120,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19797660,
          "sourceEndMs": 19804080,
          "text": "バイバイバイ[音楽]"
        },
        {
          "speechId": 2121,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19805218,
          "sourceEndMs": 19807940,
          "text": "確かに"
        },
        {
          "speechId": 2122,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19815920,
          "sourceEndMs": 19820780,
          "text": "ここまで見てくださってありがとうございました"
        },
        {
          "speechId": 2123,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19822200,
          "sourceEndMs": 19826820,
          "text": "普通の仕事はもう"
        },
        {
          "speechId": 2124,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19826878,
          "sourceEndMs": 19836920,
          "text": "早い段階で終わったけどまさか後々の方がまさかこんなに時間かかるとは見つかるねと思ったんだけど"
        },
        {
          "speechId": 2125,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19837378,
          "sourceEndMs": 19851560,
          "text": "まあまた突発の冒険であったりはやると思いますのでまた見てくださいそれじゃあ頂いたチップを読み上げてし終了ていきます迦陵頻が"
        },
        {
          "speechId": 2126,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19851718,
          "sourceEndMs": 19859780,
          "text": "折り紙ふむと糸通し浪人ふむと"
        },
        {
          "speechId": 2127,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19860718,
          "sourceEndMs": 19880240,
          "text": "ケイム誠これだけグロウそして見てくださった皆さん本当にありがとうございましたまた次回よろしくお願いしますここまでお送りしたのはにじさんに所属ベルモンドバンデラスででしたは5番でしたバイバイ"
        },
        {
          "speechId": 2128,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19902690,
          "sourceEndMs": 19905750,
          "text": "[音楽]"
        },
        {
          "speechId": 2129,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19920140,
          "sourceEndMs": 19923200,
          "text": "[音楽]"
        },
        {
          "speechId": 2130,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19926110,
          "sourceEndMs": 19930409,
          "text": "[音楽]"
        },
        {
          "speechId": 2131,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19933320,
          "sourceEndMs": 19937609,
          "text": "[音楽]"
        },
        {
          "speechId": 2132,
          "sourceVideoId": "vWv9H-hfHXo",
          "sourceStartMs": 19940510,
          "sourceEndMs": 19944810,
          "text": "[音楽]"
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
          "summary": "string",
          "whyItCanBeClipped": "string",
          "sourceVideoId": "string",
          "sourceStartMs": "number",
          "sourceEndMs": "number",
          "supportingSpeechIds": [
            "number_or_range_string"
          ],
          "representativeQuote": "string",
          "riskNotes": [
            "string"
          ]
        }
      ]
    }
  }
}
```
