# A-v002 基礎映像公開後 pure再現診断・限定修正 v001

- 日付: 2026-08-09
- 対象: 正式attempt-0006（job SHA-256 `e5aacdbd51c9ec30aee8a9ef847386a8e641dd723a2aca099229ae0fe4c7104b`）
- 診断方法: 保存済み成果物と既存pure入口だけを使用
- 正式runner再実行: 0回
- API通信: 0回
- 費用: US$0

## 1. 結論

第一段の読み取り再現だけで原因を確定したため、事前承認されたcheckpoint追加（第二段）は実施しない。

原因は契約矛盾ではなく、proof runner内の実装欠陥2件である。

1. proof専用の時間対応表を作る際、`baseMedia.path`へ正式成果物のworkspace相対全pathを入れていた。既存時間対応表契約の正本値はexact `base-media.mp4`である。
2. page/line plannerが返した内側の検査済み拒否codeを、proof外側の8 codeへ帰属し直さず直接渡していた。許可外codeをproof違反へ製造しようとした二次例外が、本来の終了1を`UNCLASSIFIED`の終了2へ潰した。

## 2. 段階別の観測

| 順序 | 段階 | 実測 |
|---:|---|---|
| 1 | 横型style解決 | `resolved`、違反0件。正式preset、幅36、最大2行、identity cropを解決した |
| 2 | page/line plan | `rejected / OUTPUT_V002_SPAN_UNMAPPED`。物理候補edge 28,807件、timeline写像済み0件 |
| 3 | render plan | 2で停止したため未到達 |
| 4 | 共通描画計画 | 2で停止したため未到達 |
| 5 | 媒体inspection | 同じ保存済み媒体を独立pure入口で確認し合格。H.264、1920×1080、30fps、755 frame、25,167ms、AAC |

最初に写像できなかった文字は`マ`、元時刻は`[4080650,4080770)`、区間は`segment-0001`である。

## 3. 具体値の照合

保存済み時間対応表:

```text
baseMedia.path = evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-runs/a-v002-layer1-v3-option-b-proof-20260809-v002/layer1-v3-nE_bNeBNp4E_multiblock_material_v001-2-voice-013/base-media.mp4
```

既存正本:

```text
baseMedia.path = base-media.mp4
```

同じ保存値を既存mapperへ渡した結果:

```text
failed / BASE_MEDIA_TIMELINE_INVALID / $.baseMedia.path
```

診断メモリ内でこの1値だけを正本値へ置いた結果:

```text
passed
source frame [122420,122423)
output frame [0,3)
display 3 frame
```

時間、segment、frame規則、媒体SHAは変更していない。

## 4. fatal化した二次経路

page/line planner自身は内側正本どおり`OUTPUT_V002_SPAN_UNMAPPED`を返した。proof runnerの公開違反集合はplanner/render/proof所有の8 codeだけで、piecewise所有の8 codeは含まない。

proof runnerが内側codeを直接`proofRejectedError`へ渡したため、外側違反製造時に次の例外が発生した。

```text
TypeError: unknown A-v002 proof violation code: OUTPUT_V002_SPAN_UNMAPPED
```

最上位catchがこの二次例外を`unknown / UNCLASSIFIED` fatalへ写した。したがって、保存済みfatalの`child-process`は外部tool失敗を意味しない。

## 5. 三分法

| 帰属 | 判定 | 根拠 |
|---|---|---|
| 実装が契約に届いていない | 2件 | 時間対応表pathの誤製造、内側拒否codeの外側所有漏れ |
| job・fixture・実行設営 | 0件 | 保存済み入力値、style、媒体inspection、runtime実体に不一致なし |
| 契約解釈が必要 | 0件 | basenameとproof外側ownerはいずれも承認済み正本へexactに固定済み |

## 6. 限定修正

1. proof専用時間対応表の`baseMedia.path`だけを`base-media.mp4`へ戻す。request・manifest・receiptの正式成果物全path bindingは変更しない。
2. page/line plannerの内側拒否はproof外側の既存owner `OUTPUT_V002_LAYOUT_UNRESOLVED`へ帰属する。planner自身の`OUTPUT_V002_SPAN_UNMAPPED`を含む8 code、検査OPLV2011、status、終了codeは変更しない。

新path、新schema、新違反code、計算複製、検査期待の緩和は0件である。

## 7. 修正後の限定検査

- 対象: `run_presentation_a_v002_layer1_v3_proof_job_v001.test.mjs`
- 結果: 10/10
- 正式92件の件数: 不変
- 証明追加先: 既存APJ010
  - proof時間対応表がbasenameを製造する
  - page/line plannerの内側codeをproof違反へ直接渡さない
  - proof外側の既存`OUTPUT_V002_LAYOUT_UNRESOLVED`が所有する

修正後SHA-256:

| file | SHA-256 |
|---|---|
| `run_presentation_a_v002_layer1_v3_proof_job_v001.ts` | `bc64db2639e88669b6a23d6f7b343be76adb96009762c95bfbd2872aa826a2de` |
| `run_presentation_a_v002_layer1_v3_proof_job_v001.test.mjs` | `3308d1edfdf60adcde66422f14cd8410fd5a0ea3c738050983d19183efad2d9d` |

## 8. 次attempt

新版jobは、入力値を変えず、job ID・対応する新出力root・proof runner SHAだけを更新した。

- job: `a-v002-layer1-v3-option-b-proof-20260809-v005.json`
- SHA-256: `69871a473c9b48baf112f4809212056f68ce63da09aef2fb053b110ae6472d9c`
- validator: 合格
- 正式serializer byte: 一致
- 新出力root: `a-v002-layer1-v3-option-b-proof-20260809-v003`（開始前未使用）

新attemptで初めて到達するrender plan以降の成否は未確認であり、合格を先取りしない。不合格1件なら同attemptで直さず停止する。
