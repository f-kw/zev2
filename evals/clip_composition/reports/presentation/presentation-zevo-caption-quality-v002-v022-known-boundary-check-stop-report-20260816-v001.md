# ZEVO字幕品質v002 v022 既知6境界独立照合 停止報告 v001

作成日: 2026-08-16  
対象: v022正式selection後、P/R/F描画前の既知6境界非再選択の独立照合

## 1. 結論

v022の正式source package、B5、B6、selectionは合格した。正式selection report自身のstrict受入13項目も全て合格している。

その後、既知6境界を独立に照合する補助処理が、`サクサク`という本文が同じ字幕内に2回現れるのに、文字列検索だけで一意な発生位置を決めようとして停止した。正式fixtureは文字列ではなく、字幕IDと字幕内atom位置の組で6境界を固定している。補助処理がこの正式位置を正本として読まなかったことが原因である。

不合格一件で同attemptを直さない規律に従い、P/R/F、横型3本描画、QC、確認ページへ進まず停止した。production、契約、正式selection、API回答は変更していない。

## 2. 到達済み工程

| 工程 | 結果 | 証拠 |
|---|---:|---|
| 関連検査 | source 6/6、B5/B6 11/11、selection 10/10、planner 10/10 | 保存済み各版付きTAP |
| 正式source package | 合格 | file SHA-256 `6b77964113028eacf3ac64f56b82f8aac901004aad4a2df82387aee6cd142fe0` |
| B5 token計測 | 2/2一致 | 10,458 token、最大費用投影 US$0.2536035 |
| B6正式送信 | 1回、再試行0、HTTP 200、complete | prompt 10,458 / candidate 1,645 / thinking 3,269 / total 15,372 token |
| B6費用 | 上限内 | Standard list price換算 US$0.026271 |
| strict selection受入 | 全13項目合格 | selection report SHA-256 `9dfe801078c9c3cc0540cc09c82f40cf810840201b92a7afed3a2ef8f18486e3` |
| selection成果物 | 正式公開済み | selection SHA-256 `d6a3b27ef8d334e2c043310786149852d958b4567f9dbd6c5e4cc762d4cbb625` |
| 既知6境界の独立照合 | 補助処理の設営不合格で未成立 | `known issue occurrence mismatch: sakusaku-repetition-internal` |
| P/R/F・描画・QC | 0件 | 独立照合前で停止 |

strict selection受入で合格したのは、schema、caption集合、境界所属、順序、atom全量閉包、論理幅、決定的再構築、物理配置、時間写像を含む13項目である。v021で落ちた第3字幕の長いcueは、v022回答では2行へ分けられ、物理配置も合格した。

## 3. 失敗した具体値

補助処理は`サクサク`を既知問題の一意な本文patternとして扱った。しかし第3字幕の本文には`サクサク`が2回ある。よって文字列だけでは、正式fixtureが指す`サク/サク`の位置を一意に決められない。

正式な6境界は、完全実装設計§1.2の7 plan出現から重複formatを畳んだ次の6件である。

| 字幕 | 字幕内atom位置 | 旧不自然分割 |
|---|---:|---|
| `input-caption-000001` | 20 | `マリ/ン` |
| `input-caption-000001` | 32 | `マリ/ン` |
| `input-caption-000002` | 42 | `ス/イちゃん` |
| `input-caption-000003` | 15 | `言ってほし/いみたいな` |
| `input-caption-000003` | 32 | `じ/ゃ報告` |
| `input-caption-000003` | 62 | `サク/サク` |

読み取り診断として正式selectionをこの6個の境界IDと直接照合したところ、cue終端・行末への一致は0件だった。ただし、これは停止後の診断観測であり、失敗した独立照合attemptの正式合格値6/6へは数えない。

## 4. 三分法

- production: 欠陥0件。正式selectionはstrict受入13項目を通過している。
- fixture・検査設営: 欠陥1件。版付きfixtureのexact位置を読まず、本文patternの一意性を仮定した補助処理を作った。
- 契約: 解釈不要。既知6境界の正本位置は既存完全実装設計と人間観測fixtureに固定済みである。

## 5. 事前検出可能性

事前検出できた。完全実装設計§1.2には`サク/サク = input-caption-000003 / atom-occurrence-000062`が明記され、既存review fixtureにも同じ値が保存されている。補助処理を本文検索から作らず、fixtureの6個のexact位置を入力としていれば停止しなかった。

## 6. 再開に必要な限定修正案

独立照合の入力を、本文検索で作る方式から、版付き人間観測fixtureの6個の`字幕ID + atom位置`をそのまま読む方式へ置換する。各位置をsource boundary IDへ一対一解決し、正式selectionのcue終端・行末の双方に含まれないことを6/6で確認する。

この修正は検査補助だけに閉じ、production、契約、selection、API回答、字幕本文、253境界へ触れない。合格後にのみP/R/F、横型3本描画、QC、確認ページへ進む。

## 7. 外部作用

- 今回の正式B5: countTokens 2回。
- 今回の正式B6: generateContent 1回、再試行0。
- 実費換算: US$0.026271。
- 承認上限: US$1.00以内。
- secret保存: 0件。
- 停止後の追加API通信: 0回。
- 描画: 0件。
- commit / stable tag: 0件。

## 8. 残作業

既知6境界の独立照合を正式に6/6へ閉じること、その後のP/R/F、横型3本、QC、確認ページが未実施である。正式selection自体は公開済みで、同じAPI回答を再送・修復する必要はない。
