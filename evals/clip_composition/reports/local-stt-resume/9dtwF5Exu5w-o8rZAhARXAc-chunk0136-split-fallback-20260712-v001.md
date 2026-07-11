# v004汎化素材 元配信STT HTTP 500チャンク短分割記録

## 対象

- 元配信: `o8rZAhARXAc`
- 全域STT ID: `9dtwF5Exu5w_o8rZAhARXAc_local30_v001`
- 対象チャンク: index 136、元配信 `4080s-4110s`
- 元音声: `stt/9dtwF5Exu5w_o8rZAhARXAc_local30_v001/source/chunks/chunk-0136.flac`

## 発生したこと

30秒音声のSTTがHTTP 500 `TypeError: not a sequence` を返した。これは接続断ではなくサーバーが明示した処理エラーなので、同じ30秒の無条件再送は行わなかった。

同じ音声を `0-15s` と `15-30s` に二分すると両方成功した。結合テキストには長い「あー」の連続が含まれ、分割後の発話数が多い理由を説明できる。

## 統合

- 短分割STT ID: `9dtwF5Exu5w_o8rZAhARXAc_chunk0136_local15_v001`
- 分割応答: 2件
- 統合後発話: 472件
- 統合後の最終発話時刻: 25,949ms
- 統合先: `stt/9dtwF5Exu5w_o8rZAhARXAc_local30_v001/source/chunks/chunk-0136.raw.json`

後半15秒の発話時刻へ15,000msを加え、発話IDと発話グループを決定的に振り直した。統合後の全発話が元の30秒範囲内にあることを機械確認した。元の2応答パスは `composedFromSplitResponses` に保存した。

全域STTを再開し、index 136の統合応答が既存30秒チャンクとして再利用され、index 137以降へ進むことを確認した。粗字幕への代替、音声範囲の欠落、時刻範囲の変更は行っていない。
