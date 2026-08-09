# A工程 旧v3安全区間への切替・実現性調査停止報告 v001

日付: 2026-08-09

対象: A工程（タイムライン合成＋無音・間の調整）

通信: 0回

費用: US$0

実装・正式検査・描画: 0件

## 1. 結論

人間合格済みの旧層1 v3三候補をA工程の初回実証へ切り替える裁定を適用したが、**実装前の現物照合で三つとも現行の文字atom途中を切ることが分かったため停止した**。

三候補は完成映像の見聞きとしては3/3合格済みである。一方、現行ZEVGは採用区間が文字atomの一部だけを含む状態を`SOURCE_ATOM_PARTIAL_INTERSECTION`として拒否する。この拒否を緩める、切断時刻を動かす、既に切断済みの動画を入力にする、のいずれも今回の承認範囲には含まれない。

したがってC工程の安定点化は完了したが、A工程のproduction実装、横型・縦型動画、O1への接続には進んでいない。

## 2. 今回適用した裁定

- C工程の人間合格をcommit `4e5be43c`へ固定し、`stable/zevo-title-c-human-passed-20260809`を発行した。
- A工程の初回実証素材をcandidate 59から、人間合格済みの旧層1 v3三候補へ切り替えた。
- candidate 59のVAD 6件を、将来の`A-v002候補: 文字atom・字幕をまたぐ切断契約`の一次資料として保持した。
- A完了後にO1へ接続する順序は維持するが、Aが完了していないためO1は起動していない。

## 3. 事実

### 共通証拠

| 対象 | path | SHA-256 |
|---|---|---|
| 旧v3切断入力 | `evals/clip_composition/outputs/internal-edit/20260717-layer1-v003-long-gap-pair-review-v001/package-input.json` | `cfb43e60d8bf73d3377f39ff45d2d69156b6b5432d6944799b402ede764d5b0c` |
| 人間結果 | `evals/clip_composition/outputs/internal-edit/20260717-layer1-v003-long-gap-pair-review-v001/human-result.json` | `cb08a7607b6d99f3f7fd5ef27582a90b096ac07356d9fd7fc59fef740b44a3bc` |
| 旧v3 manifest | `evals/clip_composition/outputs/internal-edit/20260717-layer1-v003-long-gap-pair-review-v001/manifest.json` | `4215a4467ce7b2fd88f5b6483813ddfef4359a4be71c47b9a494403b35ae72e3` |
| 現行atom参照 | `evals/clip_composition/fixtures/nE_bNeBNp4E_multiblock_material_v001/transcript.json` | `3e6dc8fa8dd22ea02f296a4fa3bb2d311639af1fba1a56f999abbc6834bcfea3` |
| source media | `evals/clip_composition/research/downloads/nE_bNeBNp4E/sources/qdczJpv8RCc/qdczJpv8RCc.mp4` | `8359f59d8c205fb815c9165f5a464ec4bb9f109f9d91384b80e571410dc2fa25` |

人間結果は三候補とも「差はない」、繋ぎ目問題0件で、所感は「劣化していないため短縮した方が良い」。この人間認定は変更していない。

### 三候補の現行atom照合

| 候補 | 人間合格済み切断 | 現行atom | 結果 |
|---|---:|---:|---|
| `...:2:voice-013` | `[4084435, 4086915)` 2,480ms | `ぁ` `[4083972, 4087055)` | 切断全体が1文字の内部 |
| `...:5:voice-067` | `[4455270, 4457090)` 1,820ms | `が` `[4453870, 4457212)` | 切断全体が1文字の内部 |
| `...:5:voice-190` | `[4611230, 4613470)` 2,240ms | `ク` `[4610824, 4616745)` | 切断全体が1文字の内部 |

現行の全量閉包検査は`evals/clip_composition/presentation_meaning_information_package_v001.mjs`のsource atom照合で実在する。三候補をそのまま通すと、採用区間がatomの一部だけを含むため拒否対象になる。

candidate 59で観測済みの440〜800msのVAD 6件も全て文字atom途中だった。既存の版付き表と正式source atomを結んだ機械可読記録を、`presentation-a-vad-observation-and-v3-feasibility-evidence-20260809-v001.json`へ保存した。生VAD出力は当時保存されておらず、今回も再実測していない。

## 4. 推測

なし。旧v3三候補と現行atomの交差関係は保存実体の数値比較で確定した。

## 5. 未確認

- 文字atom・字幕をまたぐ切断をforward-onlyで表せるA-v002契約のexact schema、再構築規則、検査件数。
- 現行atom境界に一致し、同じく人間合格済みの別候補が存在するか。
- A-v002を導入した場合の横型・縦型字幕時刻と文字閉包への具体的影響。

## 6. 黙って採らなかった代替

| 代替 | 採らない理由 |
|---|---|
| 切断端を現行atom端へ丸める | 人間が合格した切断時刻を変更するため、新しい人間判断になる |
| 文字atom途中を今回だけ受理する | ZEVGの全量閉包契約を素材固有に緩めるため、契約改訂なしには行えない |
| 旧v3の切断済みafter動画をA入力にする | A工程が採用元区間列から動画を再構成できることの実証にならない |
| candidate 59へ戻る | 保存済み6件も同じ文字atom途中であり、原因を解消しない |

## 7. 次に必要な判断

次のどちらか一つが必要である。

1. `A-v002候補: 文字atom・字幕をまたぐ切断契約`を正式な契約設計へ昇格する。
2. 現行atom境界に一致する別の切断候補を選び、その候補を人間確認する。

A工程の「VADは候補提示器で、最終採否は意味判断」「出力は採用された元区間列」「素繋ぎを初版とする」という既承認方針は変更していない。

## 8. O1

O1（ZEVO基礎映像の複数区間・物語順対応）はA完了報告の後に自動接続する予約を維持する。今回はAが実装前停止したため、O1の調査・設計・実装は0件である。
