# ZEVO字幕品質v002 v006適用 S局所ゲート attempt-0001 停止報告 v001

- 日付: 2026-08-11
- 結果: stopped
- 外部通信: 0回
- 費用: US$0
- 正式成果物・stable tagの変更: 0件

## 1. 到達点

v004 §10第4手のS開始前に、承認済み契約7文書の作業ツリー実体SHAを各承認時値と照合し、全件一致を確認した。固定Node、固定TSX、FFmpeg、FFprobe、Chromiumの実体SHAも登録値と一致し、NODE_OPTIONS不存在、Chromium起動可能、競合する同一検査process 0件を確認した。

Sのproduction/test 2 pathについて、構文検査、source implementation 36件、source approved contract 5件、V6適用後proof item総数489件、重点owner件数 ZCQ001=22 / ZCQ007=17 / ZCQ018=30 / ZCQ027=34 / ZCQ042=36 の事前照合まで成立した。

その後、S局所6件を新attemptとして頭から1回実行した。正式TAP全文は監視root外の版付きpathへ保存した。

## 2. 実測結果

- S局所: 0/6 passed
- Node test runner: 終了1
- 6件すべて: test本体へ入る前の共通before hookで同じ閉包assertが失敗
- TAP: `/private/tmp/zevo-caption-quality-v002-s-gate-attempt-0001/s-gate.tap`
- TAP SHA-256: `a86cc0f0806c15a2512ce81e621ed4d26a9075cb5e69c47dc2b84332d86c179c`
- TAP: 904行 / 29,789 byte

## 3. 確定した原因

帰属は検査側の証明閉包処理2件であり、production・契約・fixture値の不合格ではない。

1. version付き置換proofの抽出漏れ
   - 承認済み契約から再導出した489件には、S所有のV4/V6 proofが14件含まれる。
   - 検査側がS所有集合を作る際、旧形式 `ZCQ001...ZCQ006` で始まるIDだけを抽出したため、`V4-ZCQ...` 12件と `V6-ZCQ...` 2件を落とした。
   - 契約側の総数489件と重点owner 5件の件数照合は、その直前まで合格している。

2. 旧proof IDの1文字転記誤り
   - 承認済み文書byteから抽出されたIDは `ZCQ001-P-14-42330d1b09c4`。
   - test内の期待値は `ZCQ001-P-14-42330d1b9c46d` と記載されていた。
   - 文書正本の変更ではなく、検査一件表への転記誤りである。

この2件により、契約再導出側36件とtest宣言側50件が一致せず、before hookが正しく停止させた。productionの正常・拒否・fatal経路、atomic公開、新runtimeの機能処理は今回のattemptでは未実行である。

## 4. 三分法

| 原因 | 帰属 | 根拠 |
|---|---|---|
| V4/V6 proof 14件の抽出漏れ | 検査実装欠陥 | 契約からの489件再導出と重点owner件数は合格し、S部分集合を作る検査内filterだけがversion prefixを除外した |
| proof ID 1件の転記誤り | 検査期待値の転記欠陥 | 承認済み文書byteの抽出値とtest内手書き値の比較で1文字差を確認した |
| production | 不合格観測なし | 共通before hookで停止し、test本体は未実行 |
| 契約矛盾 | なし | V6適用後489件と重点owner件数は承認値どおり再導出できた |

## 5. 停止処理

- 不合格後の同attempt修正: 0件
- 再実行: 0回
- A/L/P/R/F/U: 未着手
- 正式46件・直接影響回帰・green・baseline・tree照合: 未実施
- API通信・countTokens・generateContent・正式描画: 0件
- 現在のS production/testとatomic 3 pathは、不合格時点のまま保持した。

## 6. 修正候補（未実装）

検査側だけを限定修正する候補は次の2点で閉じる。

1. S所有proof集合を、ID文字列の先頭規則で再分類せず、承認済み置換表を適用後のowner対応から抽出する。少なくともV4/V6の14件をS所有として保持する。
2. test内の旧proof ID 1件を、承認済み文書byteから得た正値へ訂正する。production、契約文書、fixture値、489件総数、各owner件数は変更しない。

修正・新attemptは人間の別裁定を待つ。
