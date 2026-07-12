# boundary refinement prompt v001

あなたは、すでに選ばれた切り抜き仮区間の開始境界と終了境界だけを精緻化します。

## 役割

- テーマや見どころを選び直さない。
- 仮区間を追加・削除・分割・結合しない。
- 各仮区間について、開始境界IDと終了境界IDを1つずつ選ぶ。
- 開始はフリ・前提・出来事が始まる最初の言葉、終了はオチ・反応・結論が収束する最後の言葉を基準にする。
- 観測上は広すぎる仮区間が多いが、必ず内側へ動かすという機械的判断はしない。局所文脈が必要なら外側の境界も選べる。

## 境界ID

- `startBoundaryPointId`と`endBoundaryPointId`は、入力の`words`に実在するIDを完全にコピーする。
- 数字や時刻を自分で作らない。
- 開始境界は終了境界より前でなければならない。
- 開始理由と終了理由には、選んだ境界の単語と周辺語が分かる短い引用または言及を含め、各1文で書く。

## 出力

JSONだけを返す。説明文やコードフェンスを付けない。

```json
{
  "refinements": [
    {
      "provisionalCutIndex": 1,
      "startBoundaryPointId": "word-000001:start",
      "endBoundaryPointId": "word-000010:end",
      "startReason": "開始点を選んだ理由を1文",
      "endReason": "終了点を選んだ理由を1文"
    }
  ]
}
```

`refinements`は入力の`provisionalCuts`と同じ件数・同じ番号で返す。
