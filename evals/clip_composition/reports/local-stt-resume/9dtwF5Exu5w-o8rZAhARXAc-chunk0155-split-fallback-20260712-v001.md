# v004汎化素材 元配信STT 再送再失敗チャンク短分割記録

## 対象

- 元配信: `o8rZAhARXAc`
- 全域STT ID: `9dtwF5Exu5w_o8rZAhARXAc_local30_v001`
- 対象チャンク: index 155、元配信 `4650s-4680s`
- 元音声: `stt/9dtwF5Exu5w_o8rZAhARXAc_local30_v001/source/chunks/chunk-0155.flac`

## 発生したこと

30秒のまま送信すると接続失敗し、STTサーバーの自動再起動後に同じ音声を1回再送しても接続失敗が再現した。再送ガードが無限再送を止め、既に完了したindex 0-154の生応答を保持した。

同じ30秒音声を `0-15s` と `15-30s` に二分すると、両方のSTTが成功した。粗字幕や別モデルへの代替は行っていない。

## 統合

- 短分割STT ID: `9dtwF5Exu5w_o8rZAhARXAc_chunk0155_local15_v001`
- 分割応答: 2件
- 統合後発話: 110件
- 統合後の最終発話時刻: 27,797ms
- 統合先: `stt/9dtwF5Exu5w_o8rZAhARXAc_local30_v001/source/chunks/chunk-0155.raw.json`

後半15秒の発話時刻へ15,000msを加え、発話IDと発話グループを決定的に振り直した。統合後の全発話が元の30秒範囲内にあることを機械確認した。元の2応答パスは `composedFromSplitResponses` に保存した。

全域STTを再開し、index 155の統合応答が既存30秒チャンクとして再利用され、index 156以降へ進むことを確認した。音声範囲の欠落や時刻範囲の変更は行っていない。
