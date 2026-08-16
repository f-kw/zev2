# ZEVO字幕品質v002 v006適用 S局所ゲート attempt-0002 停止報告 v001

- 日付: 2026-08-11
- 結果: stopped
- 外部通信: 0回
- 費用: US$0
- production・契約・fixture値・正式成果物・stable tagの変更: 0件

## 1. attempt前に成立した確認

- 承認済み文書からV6適用後proof 489件を再導出し、一意性489/489を確認した。
- test宣言側のS所有50件と、文書byteからowner対応で導出したS所有50件の差分は0件だった。
- 重点ownerは ZCQ001=22 / ZCQ007=17 / ZCQ018=30 / ZCQ027=34 / ZCQ042=36 で承認値と一致した。
- B5/B6検査もSと同じowner解決入口を参照する形にし、version prefixを先頭規則で落とす経路を除いた。
- 契約7文書、固定Node/TSX、FFmpeg/FFprobe、ChromiumのSHA、NODE_OPTIONS不存在、Chromium起動可能、競合process 0件を確認した。

## 2. 実測結果

- S局所: 1/6 passed
- Node test runner: 終了1
- ZCQ006: 合格
- ZCQ001〜ZCQ005: 同じReferenceErrorで不合格
- TAP: `/private/tmp/zevo-caption-quality-v002-s-gate-attempt-0002/s-gate.tap`
- TAP SHA-256: `b992284200692bf2ef1902a8b9a3e75bdb8b09fdb03b33867eafcde1377fffa3`
- TAP: 105行 / 5,903 byte

## 3. 確定原因

帰属は、承認されたowner導出共用化を実装する際に検査moduleへ入れた直接起動guardのscope誤りである。

- B5/B6検査がS検査の共用owner解決入口だけをimportしても、Sの6検査を重複登録しないよう、Sのtest登録領域を直接起動時だけ有効にした。
- そのblock内へ、合成jobが使う承認契約binding製造関数まで入れてしまった。
- 合成job製造関数自身はblock外にあるため、直接実行時にも当該binding製造関数を名前解決できず、`exactApprovedContracts is not defined`となった。
- ZCQ001〜ZCQ005は同じ合成fixture経路を通るため5件へ波及した。ZCQ006はそのfixtureを使わないため5 proofを含め合格した。

前attemptの2原因は解消している。今回のTAPではproof 489件の閉包hookを通過し、version付き14件の抽出漏れと旧ID 1件の差は再発していない。

## 4. 三分法

| 対象 | 帰属 | 根拠 |
|---|---|---|
| 5不合格 | 検査設営・検査実装欠陥 | test module内のblock scopeでReferenceErrorが発生 |
| production | 不合格観測なし | productionの値・契約判定へ到達する前にfixture製造が停止。到達したZCQ006は合格 |
| 契約 | 矛盾なし | 489件、重点owner件数、S宣言差分0が成立 |
| fixture値 | 不合格なし | fixture値の検査前に製造関数の名前解決で停止 |

## 5. 停止処理

- 不合格後の同attempt修正: 0件
- 再実行: 0回
- A/L/P/R/F/U: 未着手
- 正式46件・各回帰・tree照合: 未実施
- API通信・countTokens・generateContent・正式描画: 0件
- attempt-0001/0002のTAPと停止報告は上書きせず保持した。

## 6. 限定修正候補（未実装）

共用owner解決入口とtest登録guardは維持し、承認契約binding製造関数だけをtest登録guardの外へ戻す。test登録だけを直接起動条件の対象とし、fixture helperの可視性を変えない。変更はS test 1 path内で閉じ、production・契約・fixture値・proof総数・owner件数・B5/B6 testを変更しない。

修正と新attemptは人間の別裁定を待つ。
