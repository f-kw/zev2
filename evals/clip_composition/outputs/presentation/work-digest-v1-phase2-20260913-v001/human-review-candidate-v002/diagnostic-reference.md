# 診断資料 — 問題を見つけた後に使う

完成動画で気になった時刻が見つかった場合に、その原因を調べるための参照資料です。全件を見るためのチェックリストではありません。

- [保存済み診断データ](diagnostic-reference.json)：fallback timing 54字幕、Prospect間接続6箇所、内部接続5箇所を既存証拠のまま保持しています。
- [時刻と本文を読む](../human-review-candidate-v001/human-sync-watchlist.md)：保存済み一覧。気になった時刻と照合するために使います。
- [正式字幕](../caption-bridge-v001.json) / [保存済み字幕時刻](../caption-timing-resolution-v002.json) / [保持区間](../machine-adoption.json) / [完成動画の接続境界](../base-media/timeline.json)

代表接続は、正式タイムライン順で最初のProspect間接続・内部接続をそれぞれ1件使用しています。字幕282は既存の最終MP4反映確認で使った中央frameです。新しい意味判断や危険度のランキングは行っていません。

旧レビューHTMLと旧ガイドはhuman-review-candidate-v001に履歴として保持しています。現在の通常視聴には[新しいレビューHTML](review.html)を使います。
