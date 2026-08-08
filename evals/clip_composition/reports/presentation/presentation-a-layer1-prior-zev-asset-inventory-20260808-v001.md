# A工程準備: 前ZEV・凍結済み層1 v3資産棚卸し v001

作成日: 2026-08-08  
種別: 設計材料（正本契約・実装指示ではない）  
人間作業: 0件・0分  
通信・費用: 0回・US$0

## 1. 調査基準

- 現行zev2の調査基準HEADは`a47793d65be4a68ccc75cb555fbcc03fcc582ee8`。
- 前ZEVは`/Users/kawafmm/workspace/zev`に実在し、読取時HEADは`746e8120aa83b0909b74bd7a97e1073fa9f73351`。
- 前ZEVはnpm/Electronを含む別リポジトリ、現行zev2はpnpm workspaceであり、実行時依存・直接importの対象にしない。
- A工程は「承認済み区間内の無音・間延びを調整する時間圧縮」である。層1凍結はまだ有効で、2026-08-02裁定に基づくkawafmmの明示承認なしに解除しない。

### ZEV設計理論メモv1との接続

- **(3)** 遠距離接続は変化量の基準点を供給する。A工程はその前段として、基準点・本体・着地を壊さず待ち時間だけを圧縮できる必要がある。
- **(5)** 変化量の符号は、谷の演目化と着地の閉包で決まる。音がないことだけを削除十分条件にしてはいけない。
- **(7)** 出力原型は因果を閉じるミニドキュメンタリーである。A工程は尺短縮の最大化ではなく、因果列を保った時間圧縮として評価する。

## 2. 事実: 前ZEVの資産

| 現物path | SHA-256 | 実際の役割 | 現行への扱い |
|---|---|---|---|
| `/Users/kawafmm/workspace/zev/backend/src/utils/shorts-pipeline.ts` | `112b75611e1c1a03d8f70ec8ed4c5532f79bafc6a758d33eb4041476fe14b1d8` | 発話間の空白から除去範囲と圧縮後時刻対応を作る | 処理の意味とテスト観点だけが移植候補。直接参照しない |
| `/Users/kawafmm/workspace/zev/backend/test/shorts-pipeline.test.ts` | `910c345b74b52075894b9c87014181d4acb5d018df8885f0aa65b485ee14228b` | 長い空白の除去と時刻対応の最低限検査 | 現行契約に合わせた検査材料 |
| `/Users/kawafmm/workspace/zev/backend/src/services/short-edit-engine/source-adapter.ts` | `bd5857d84c6dc3672ded64ab08b5c61918dad3f32fcd4198a064bdaac916bed7` | 無音候補を旧編集計画へ変換する | 旧型専用なので移植しない |
| `/Users/kawafmm/workspace/zev/backend/src/services/short-edit-engine/rule-based-draft-generator.ts` | `c5ffd1a303e51b60896e22a55dd8bf70706ad8dd37a76541394ab64816577826` | 旧編集計画の切断候補を作る | 後方互換を作らず、一式移植しない |
| `/Users/kawafmm/workspace/zev/client/src/electron/services/shorts-service.ts` | `2848ef22f0389822704200f7b8fb5667cf0c3c189548db265fd25030ba5e7707` | ffmpegのtrim/concatを旧Electronから実行する | 現行に別の連結経路があるため移植しない |
| `/Users/kawafmm/workspace/zev/client/src/electron/shared/speech-correction.ts` | `09c727f0f860af77ca74cbb94508601beb024b5333c99b75cb52bd0c13cae6d5` | 字幕上のフィラー候補を見つける | 音声・映像の削除器ではない。語彙は参考資料だけ |

前ZEVには「400ms超の空白を候補」「両側120msを残す」という値がある。これは過去実装の値であり、現行zev2の承認値ではない。A工程へ流用しない。

## 3. 事実: 現行zev2の層1資産

### 3.1 計算・検査

| path | SHA-256 | 状態 |
|---|---|---|
| `evals/clip_composition/layer1_internal_trim.mjs` | `eae552002480f93455bddf12f5913c21b292efb0feedd584d84422775e5ca38d` | 単語時刻から候補と残す範囲を作るv001 |
| `evals/clip_composition/layer1_internal_trim.test.mjs` | `e13d5b3dafba682a91aeff9e0f57af601280b85c9627ae0d387632a5cb94966d` | v001検査 |
| `evals/clip_composition/layer1_internal_trim_v002.mjs` | `df597a62fb85279fd4b250f12202d4f420fc2ae4bae44d718208ca26c0979d05` | WebRTC VADの発話不在と、話者・発話まとまり保護を統合 |
| `evals/clip_composition/layer1_internal_trim_v002.test.mjs` | `12cfd303df85446075263b20a64cebbedff220f6fe7de002ba51d46c71ccf738` | v002検査 |
| `evals/clip_composition/analyze_layer1_acoustic_upper_bound.py` | `faacd7a5447c06aea501d4522e226d65d2b240f754870137d4f6dc49da0706df` | 混合音量と声VADの上界診断 |
| `evals/clip_composition/test_layer1_acoustic_upper_bound.py` | `ab5d577f16e2665db584195cbb18025661629dcaee967258f9ae5cc7251f37bc` | 音響診断検査 |
| `evals/clip_composition/detect_layer1_voice_absence.py` | `c52f93b53cb2d2be8ae8fc8c77453d94d7279db7c0a43160d59180a6c43e3598` | 16kHz mono・20ms frameのWebRTC VAD読取 |
| `evals/clip_composition/requirements-layer1-v002.txt` | `a60c58ea949f886e1ab71c4836018a513ba173657895cd949737f802329ab265` | `webrtcvad==2.0.10`の依存記録 |
| `evals/clip_composition/build_layer1_v003_pair_review.mjs` | `9b32881889cc31414a66da24efbe0db3e7c9d38957a6ea7200e9cfe94f9a615a` | v3の詰め前/後実動画を作る人間確認入口 |

### 3.2 保存済み証拠

| 成果物 | SHA-256 | 観測事実 |
|---|---|---|
| `outputs/internal-edit/20260717-layer1-acoustic-upper-bound-v001/result.json` | `15bdb09d6a32a183847cee1ce05b9a3ba4a3270b26d9400db00421dfbf227ecd` | C分類30件中18件に両VAD mode一致の発話不在。保護3件にも3/3で発話不在 |
| `outputs/internal-edit/20260717-layer1-trim-v001/result.json` | `7803a36df1e5f31df50b36f0994c2a9a0c95d74f69bf9d5f48209fa64228ef4f` | 単語時刻だけの初期診断 |
| `outputs/internal-edit/20260717-layer1-trim-v002/result.json` | `f44e427d3720edf4cbaa662b63948224edbb4c6b20faf8ed60aaf3b5d87a5407` | 音響証拠と保護規則を統合した結果 |
| `outputs/internal-edit/20260717-layer1-v003-long-gap-preflight-v001/result.json` | `5c865fc0a4d97ae16a63b7c7a63d4461b980722bb8c50b21a42a8992892bc1a8` | 7 fixture・58区間。保護後候補は1.5秒7件、2秒3件、3秒0件 |
| `outputs/internal-edit/20260717-layer1-v003-long-gap-pair-review-v001/manifest.json` | `4215a4467ce7b2fd88f5b6483813ddfef4359a4be71c47b9a494403b35ae72e3` | 3候補の実動画比較一式 |
| `outputs/internal-edit/20260717-layer1-v003-long-gap-pair-review-v001/human-result.json` | `cb08a7607b6d99f3f7fd5ef27582a90b096ac07356d9fd7fc59fef740b44a3bc` | 3件とも「差はない」、繋ぎ目問題0、人間所見は「劣化していないため短縮した方が良い」 |
| `reports/internal-edit/layer1-final-freeze-20260717-v001.md` | `7a60aaed476c739659a82854faa87f47ecd8a5227a54bae67900e837348aa750` | 標準昇格・本体接続なしという凍結正本 |

5つの層1出力directoryは計16ファイル・約15MBで現存する。v3の6本の比較動画も保持されている。

## 4. 事実: 現行の受け皿

- 現行の意味timelineは複数segmentを順序付きで保持できる。
- 現行ZEVO基礎映像v001は、同一source内の複数segmentを元時刻の昇順・非重複で連結できる。
- したがってA工程で新たに必要なのは、動画連結器の再発明ではなく、「候補のうち何を切り、何を演出として残すか」を決めた版付きtimeline入力である。
- 現在の層1はその正式timelineへ未接続であり、自動標準でもない。

## 5. 推測・設計材料

- 最短のA工程は、既存VADを**削除器ではなく候補提示器**として再利用し、最終採否を意味判断へ渡す構造である。
- VADが保護3件すべてを「声なし」と観測したため、VAD単独の自動削除は理論メモ(5)の谷・着地を壊す可能性がある。
- A工程の出力を「削除時間」ではなく「採用された元区間列」とすれば、現行timelineの順序・来歴・frame/sample写像へ自然に接続できる。
- v3で3件すべて劣化なしだった事実は候補生成の有用性を示すが、58区間中3件・1素材集中なので一般標準を証明しない。

## 6. 未確認

- 「間の多い素材型」が実運用対象として成立したかは未確認で、凍結解除条件は未成立扱いのまま。
- 詰めてよい間と演出として活きる間を、機械入力だけで分けられるかは未確認。
- 採用規則、数値閾値、余白量、異素材での再現率は未確定。前ZEVの400ms/120ms、VADの20ms frame、層1診断の400msを品質閾値へ転用しない。
- A工程の正式出力schema、違反語彙、ZEVOへの受け渡しは未設計。

## 7. 次の設計へ渡せるもの

1. 旧ZEVの「空白→残す区間→時刻対応」という処理の意味。
2. 現行層1の候補検出、保護理由、VAD証拠、人間比較媒体。
3. 現行timeline/基礎映像の複数区間連結機能。
4. 凍結解除にはkawafmmの明示承認が必要という停止条件。

本書は棚卸しだけであり、凍結解除、実装、媒体生成、人間確認を開始しない。
