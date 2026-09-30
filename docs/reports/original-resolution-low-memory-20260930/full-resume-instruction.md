# ZEV Build Loop：低メモリ経路による全編再開

受信：2026-09-30。監査対象 6f5bf604d127bf6eb7554d2f730751509ec19ad8。
出典：https://chatgpt.com/g/g-p-6a8aab6b92308191b44f77a03945fed4-zevxiang-tan-yi/c/6abbcacc-8c98-83ee-9276-248a1d29b047

```text
decision: continue
対象：同一Digest原寸全編・低メモリ経路での本体再開

kawafmm承認済みの全編実走の継続。
低メモリ合成の短区間実証を相談役として受理する。
今回、追加の人間確認は不要。
保存済み背景・AAC・307状態PNGから、
本体→replay→既存全編native QC→共有保存→別process再読まで進める。

全307状態を一つのFFmpegへ入力する旧body/replay経路は使用禁止。
本体・replayには検証済みの低メモリ経路を使用する。
84区間、最大210frame、producer常時1件、最終encoder1件を維持する。
区間数や最大frame数を実走中に性能目的で変更しない。
全編計画の最大は字幕8件、PNG状態21件。
```

従前の同一実走の安全停止条件、監視v002、保存済み素材と既存native QCを維持する。
