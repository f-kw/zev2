# A-v002 基礎映像公開後 正式attempt-0007 停止報告 v001

- 日付: 2026-08-09
- 結果: 安全停止
- API通信: 0回
- 費用: US$0
- 同attempt内の修正・再実行: 0回

## 1. 結論

二段診断の第一段で確定した2実装欠陥を限定修正し、関連検査10/10を通した後、新版jobで正式attemptを1回実行した。修正値は実成果物へ反映されたが、1件目候補の基礎映像公開後、renderer work取得前に新たな`UNCLASSIFIED fatal`で停止した。

最新裁定どおり、同attemptでは原因を推測して直さず、6本描画・QC・確認ページ・A完了・O1へ進んでいない。

## 2. 前回原因の解消確認

| 前回原因 | 新attemptの現物 | 判定 |
|---|---|---|
| timeline内の全path誤製造 | `baseMedia.path = base-media.mp4` | 解消を現物確認 |
| 内側planner拒否codeのproof外側所有漏れ | runner sourceは既存`OUTPUT_V002_LAYOUT_UNRESOLVED`へ固定、関連APJ010合格 | 実装修正・検査合格 |

新timeline SHA-256は`c72550e162531a04c791248638b7d52d3a33ce1ea931bc8a5347e4f0b01f09bf`である。基礎映像内容SHAは前attemptと同じ`6fe8c8ac4b41379073b5f194c1a3e5977a64ed39434c8842fe7db03b40247f7e`で、区間・frame・媒体内容を変えていない。

## 3. 新attemptの事実

| 項目 | 実測 |
|---|---|
| job | `a-v002-layer1-v3-option-b-proof-20260809-v005.json` |
| job SHA-256 | `69871a473c9b48baf112f4809212056f68ce63da09aef2fb053b110ae6472d9c` |
| 実行 | 1回、2026-08-09T14:54:48.122Z〜15:12:34.342Z |
| 終了 | `2 / fatal` |
| proof観測 | `variant-execution / child-process / step null / target null` |
| 共通観測 | `unknown / UNCLASSIFIED / target null` |
| stderr | 0 byte |
| 新root | 約13MB、1件目候補の基礎映像まで |
| renderer work | 0件 |
| 完成動画 / QC / 確認ページ | 0 / 0 / 0 |

stdoutは前attemptと同じ680 byte・同じSHAだった。ただし、今回timeline値は前attemptと異なり正本へ直っている。外側観測が粗いため、stdout一致だけで「前回と同じ原因」とは推測しない。

## 4. 帰属

| 三分法 | 判定 |
|---|---|
| 実装修正が必要 | 未確認 |
| job・実行設営 | 未確認 |
| 契約解釈が必要 | 未確認 |

保存済み情報から確定できるのは、開始再読完了、1件目基礎映像公開完了、renderer work未取得までである。page/line plan・render plan・共通描画計画・媒体inspectionのどこで止まったかを正式観測は区別できない。

## 5. 規律の適用

- 使用済みv001/v002/v003 root、全job、全fatal証拠を保持した。
- 正式成果物、既存stable tag、契約、違反codeを変更していない。
- 第二段checkpoint追加、新job発行、追加attemptは行っていない。
- 人間目視前tag禁止とO1予約を維持した。
- 複合区間に一律ラベルを付けず段ごとの閉語彙checkpointを初期装備する将来規則をDECISIONSへ記録した。

## 6. 現在地

完了:

- 保存済み成果物による第一段pure診断
- timeline path誤製造と拒否所有漏れの原因確定
- 契約不変の2点限定修正
- 関連10/10
- 新版jobのvalidator・正式byte・live SHA束縛
- 正式attempt-0007 1回と証拠保存

未実施:

- 新fatalの内側段階・原因確定
- 追加修正・追加attempt
- 横型3本・縦型字幕診断3本
- QC・確認ページ・完成報告
- A完了・O1接続・stable tag

次は、新fatalを対象とした読み取り診断または段階別checkpoint装備の別裁定待ちで停止する。
