# B素材 元配信全域STT 完了記録

作成日: 2026-07-10

対象切り抜き: `nOEWCNc77MI`

対象元配信: `YE-faluP7zY`

STT識別子: `nOEWCNc77MI_YE-faluP7zY_local30_v001`

## 結論

- 元配信11,824,121msを30秒単位で処理し、395/395チャンクを完了した。
- `processedChunkCount=395`、`fullChunkCount=395`、`partial=false` を確認した。
- 最終結果は53,180発話・53,180単語時刻。発話IDは1から53,180まで連続し、単語が参照する発話IDの欠落は0件、時刻の逆転は0件だった。
- STTサーバーは処理中に複数回停止したが、人間が追加した自動再起動対策と保存済みraw応答の再利用によって、取得済みデータを失わず完走した。

## 音声チャンク境界の正規化

最初の集約では53,196発話・53,196単語だったが、チャンク211から212へ移る箇所で、前チャンクの末尾発話が実音声終端を4ms越え、次チャンクとの時刻逆転を1件起こしていた。

生のSTT応答は証拠として保持したまま、評価入力だけを各抽出音声の厳密な開始・終了時刻へ収めた。

- チャンク外に完全にはみ出した発話・単語: 各16件を除外
- 音声境界をまたいだ発話・単語: 各32件を境界で補正
- 補正対象: 32チャンク
- 正規化後: 53,180発話・53,180単語

除外・補正件数と各対象チャンクはmanifestの `boundaryResolution` に保存した。raw応答の内容は書き換えていない。

## 成果物

- 生のチャンク別応答: `evals/clip_composition/stt/nOEWCNc77MI_YE-faluP7zY_local30_v001/source/chunks/*.raw.json`
- `evals/clip_composition/stt/nOEWCNc77MI_YE-faluP7zY_local30_v001/source/local-stt-response.raw.json`
- `evals/clip_composition/stt/nOEWCNc77MI_YE-faluP7zY_local30_v001/source/manifest.json`
- `evals/clip_composition/stt/nOEWCNc77MI_YE-faluP7zY_local30_v001/source/transcript.json`
- `evals/clip_composition/stt/nOEWCNc77MI_YE-faluP7zY_local30_v001/source/word-timestamps.json`

## 検証結果

- 全チャンク完了: pass
- 部分結果フラグ解除: pass
- 発話ID連続性: pass
- 単語から発話への参照整合: pass
- 発話・単語時刻の単調性: pass
- 元配信実時間との終端一致: pass
- raw応答の保存: pass

このSTT結果はDP照合の入力に使える。fixtureの凍結可否は、素材ブロックの人間確認と固定テーマが揃った後に別途判断する。
