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
    "windowId": "window_02_OJoi31bq8lk",
    "reason": "未分割入力でEdgeレンダラが高負荷化して戻らなかったため、発話境界を保った時間窓へ分割する。",
    "maxPromptBytes": 340000,
    "overlapMs": 180000,
    "sourceVideoId": "OJoi31bq8lk",
    "sourceStartMs": 13458979,
    "sourceEndMs": 13959389
  },
  "sources": [
    {
      "sourceVideoId": "OJoi31bq8lk",
      "sourceUrl": "https://www.youtube.com/live/OJoi31bq8lk?feature=share",
      "transcriptKind": "youtube_auto_caption",
      "language": "ja",
      "rawSegmentCount": 19702,
      "promptSegmentCount": 46,
      "segmentCompaction": {
        "method": "source-only transcript segments concatenated until sentence-ending punctuation",
        "scoringRole": "none",
        "note": "読みやすさのための表現変換であり、expected、切り抜き、照合結果、人間確認メモは使わない。"
      },
      "segments": [
        {
          "speechId": 1205,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13458979,
          "sourceEndMs": 13467899,
          "text": "はいはいはいはいはいはいはいはいはいおい初めて見るこいつ一番"
        },
        {
          "speechId": 1206,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13469760,
          "sourceEndMs": 13472540,
          "text": "怖い子供もなく"
        },
        {
          "speechId": 1207,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13473840,
          "sourceEndMs": 13479140,
          "text": "OKガーダーラインいなくなったでか"
        },
        {
          "speechId": 1208,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13479200,
          "sourceEndMs": 13482319,
          "text": "まあまあまあ"
        },
        {
          "speechId": 1209,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13485560,
          "sourceEndMs": 13491080,
          "text": "ここで終わると思ったあかんだよ終わんないの終わろうよ"
        },
        {
          "speechId": 1210,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13501500,
          "sourceEndMs": 13504620,
          "text": "[音楽]"
        },
        {
          "speechId": 1211,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13512920,
          "sourceEndMs": 13516760,
          "text": "まだ動くのかお前"
        },
        {
          "speechId": 1212,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13517279,
          "sourceEndMs": 13519520,
          "text": "仮面ライダー"
        },
        {
          "speechId": 1213,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13520340,
          "sourceEndMs": 13522520,
          "text": "仮面ライダー"
        },
        {
          "speechId": 1214,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13525439,
          "sourceEndMs": 13530560,
          "text": "込んだやつですか"
        },
        {
          "speechId": 1215,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13544359,
          "sourceEndMs": 13547479,
          "text": "初心者"
        },
        {
          "speechId": 1216,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13550460,
          "sourceEndMs": 13554979,
          "text": "しちゃった大丈夫返す"
        },
        {
          "speechId": 1217,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13556040,
          "sourceEndMs": 13558040,
          "text": "から"
        },
        {
          "speechId": 1218,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13562100,
          "sourceEndMs": 13565660,
          "text": "この優しさが運の月よこれ"
        },
        {
          "speechId": 1219,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13569000,
          "sourceEndMs": 13580840,
          "text": "さてと一旦怒るかえでも借りてなくない一旦足りてないけどこれでやっぱ揺さぶっていくね"
        },
        {
          "speechId": 1220,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13581000,
          "sourceEndMs": 13589700,
          "text": "行け仮面ライダー正義なんてないもんなお前には誰でも倒せ1500円"
        },
        {
          "speechId": 1221,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13590600,
          "sourceEndMs": 13595720,
          "text": "3エンドだよ今度こそ終われよさんです"
        },
        {
          "speechId": 1222,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13596100,
          "sourceEndMs": 13600930,
          "text": "[笑い]"
        },
        {
          "speechId": 1223,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13604000,
          "sourceEndMs": 13610479,
          "text": "増やしいくてとまあ一旦この辺にしといてあげようかな"
        },
        {
          "speechId": 1224,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13619600,
          "sourceEndMs": 13627279,
          "text": "まずいかこれほとんどトークなんか弱いよの来た"
        },
        {
          "speechId": 1225,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13629620,
          "sourceEndMs": 13632800,
          "text": "それから"
        },
        {
          "speechId": 1226,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13634460,
          "sourceEndMs": 13637460,
          "text": "の"
        },
        {
          "speechId": 1227,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13638120,
          "sourceEndMs": 13641319,
          "text": "こんなんでしたっけ"
        },
        {
          "speechId": 1228,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13641739,
          "sourceEndMs": 13658460,
          "text": "ーちょっと待って待って待って待って待って待っておいおいカタカナゴ最強で起きた相手の効果をよく読みますとえーっと"
        },
        {
          "speechId": 1229,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13661000,
          "sourceEndMs": 13668180,
          "text": "お受けした数が自分のテストコード多い多い場合[音楽]"
        },
        {
          "speechId": 1230,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13669939,
          "sourceEndMs": 13687220,
          "text": "どうすればうんうんまあとりあえずこいつやるかドイツやっても変わんないけどなちょっと待ってちょっとよ待って"
        },
        {
          "speechId": 1231,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13693739,
          "sourceEndMs": 13698729,
          "text": "1200ねんってなんや[音楽]"
        },
        {
          "speechId": 1232,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13699739,
          "sourceEndMs": 13703479,
          "text": "なんか知らんぞこのゲーム"
        },
        {
          "speechId": 1233,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13704200,
          "sourceEndMs": 13710899,
          "text": "ドヤ顔でティアラメンツなんか持ってきやがって謝れよその"
        },
        {
          "speechId": 1234,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13711140,
          "sourceEndMs": 13713800,
          "text": "友達謝れよ"
        },
        {
          "speechId": 1235,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13714700,
          "sourceEndMs": 13719239,
          "text": "全然俺じゃないからこれ"
        },
        {
          "speechId": 1236,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13721460,
          "sourceEndMs": 13727180,
          "text": "序盤ねまだこれ終わりまし"
        },
        {
          "speechId": 1237,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13729080,
          "sourceEndMs": 13748220,
          "text": "序章なんでここまたからやろういやこれ見てる人ここからマジで研修つい多分生やる機会あったら多分研修って名前変わってるよ1年生とかになってる1年生で多分3回目ぐらいで優等生にてるなっよその"
        },
        {
          "speechId": 1238,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13748700,
          "sourceEndMs": 13755800,
          "text": "頃はもうマジでちょっとごめんやけどほんまにちょっと取れ高とかなく壊しに行こうかな"
        },
        {
          "speechId": 1239,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13758979,
          "sourceEndMs": 13770140,
          "text": "次も呼ぶありがとうございます次命かけるつもりでくるわ闇のデュエルしよう今日まだ光のジュエルやから"
        },
        {
          "speechId": 1240,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13770180,
          "sourceEndMs": 13777750,
          "text": "ありがとうありがとう[音楽]よろしくお願いします[音楽]"
        },
        {
          "speechId": 1241,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13777760,
          "sourceEndMs": 13784779,
          "text": "はいということでみんな星コードヒーロー"
        },
        {
          "speechId": 1242,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13787160,
          "sourceEndMs": 13789340,
          "text": "ってよ"
        },
        {
          "speechId": 1243,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13790820,
          "sourceEndMs": 13793879,
          "text": "[音楽]"
        },
        {
          "speechId": 1244,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13795560,
          "sourceEndMs": 13835600,
          "text": "はいそんな感じでね今日は終わろうかなと思うんですけどいやね嬉しいどうむらビューティーかリューティーさすごいんで本当にこの間1回始めましてで喋った時に賢いが遊戯王やろうよって言ったら本当に始めてくれてここまでやってくれるのめっちゃ優しくないマジで嬉しい星川が遊戯王の不況に生協に成功しましたこれはうんあの遊戯王復興不況成功者としてもティアラメンツボコったものとしてもこれ褒め称えて欲しいねうんめちゃくちゃ課金してくれたし"
        },
        {
          "speechId": 1245,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13836359,
          "sourceEndMs": 13858520,
          "text": "やだ再起動が[音楽]いい人よ本当って感じでねじゃあ今日は終わろうかなと思いますけど34ヶ月ぶりにデーリストボコボコ配信超楽しかった分けましたえっさらに赤スパまでくれんの"
        },
        {
          "speechId": 1246,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13858560,
          "sourceEndMs": 13863840,
          "text": "またやろうな理由ありがとうありがとう"
        },
        {
          "speechId": 1247,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13866319,
          "sourceEndMs": 13915819,
          "text": "はいいやちょっとさすがにさあやってて思ったけど集中力が持たないわこんな34時間もやってるとごめんねみんなあの星川があまりに回すの下手でイライラしたおじさんがいたら申し訳ないですが集中力は12時間が限界ですでも終わりよければ全てよし最初にフミをボコれて最後ビューティーボコるて大変満足しました次やっぱ残機デッキの理解度を深めるとともに新しいデッキ勉強したいねうん楽しかったマジでやっぱ人とやる遊戯王がいっちゃん楽しいんだからで最後の最後神引きしのためちゃくちゃ熱くないトークン出てくるやつ"
        },
        {
          "speechId": 1248,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13915859,
          "sourceEndMs": 13919300,
          "text": "はいそんな感じで"
        },
        {
          "speechId": 1249,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13919939,
          "sourceEndMs": 13930640,
          "text": "誘われてフットワーク軽く遊戯を始めて手洗いメンツでも盛り上げてマジで面白い人えそうだよそう今日だよとかって話すの2回目"
        },
        {
          "speechId": 1250,
          "sourceVideoId": "OJoi31bq8lk",
          "sourceStartMs": 13930979,
          "sourceEndMs": 13959389,
          "text": "こんな感じでね終わると思いますあのー配信中にも言ったんだけど織姫星明後日重大発表ありますのでどうかよろしくお願いします星川での枠ね発表しますのでじゃあそんな感じで終わりますよかったらチャンネル登録TwitterのフォローYouTubeの通知登録よろしくおし様願いますお疲れでしたバイバイ[音楽]"
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
