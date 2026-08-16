# ZEVO字幕品質v002 provider safety block 停止報告v001

## 1. 結論

provider向けschemaの薄化はTier 1で成立し、正式B6 requestもHTTP envelopeまで受理された。しかしGemini 3.7 Flashは`promptFeedback.blockReason=PROHIBITED_CONTENT`、candidate 0件を返した。ローカルstrict受入はこれを受理せず、`rejected-provider-response`で停止した。

再試行、request修正、暗黙正規化、fallback、selection、page/line plan、render plan、描画、QCは0件である。本裁定の停止条件に従い、同attemptで修正しない。

## 2. provider schema薄化の成立

- Tier 1を最初の1回だけ送信し、HTTP 200を確認した。Tier 2/3は未送信。
- Tier 1は二状態、caption/cue/lineの構造、required、caption ID 3件、boundary ID 253件のenumを維持する。
- 除去したのは、ローカル検査と重複する配列個数制約、深い階層の閉object指定、property orderだけである。
- 追補v017のSHA-256は`19b130ba9918c3b015bb96278f4eac5787b880ca3fbcec52aeadb0b7a1e54ceb`。
- B5/B6配線回帰は11/11、ローカルselection拒否枝の回帰は10/10で合格した。

## 3. 正式B6実行

| 項目 | 結果 |
|---|---|
| model | `gemini-3.7-flash` |
| request | 新規v017 Tier 1 byte、旧B5 requestは不変保持 |
| 入力token | 10,282 |
| 最大出力token | 65,536 |
| 送信前最悪費用投影 | US$0.2534715 |
| 承認上限 | US$1.00 |
| generateContent | 1回 |
| retry | 0回 |
| HTTP envelope | 合格 |
| model version | `gemini-3.7-flash` |
| provider判断 | `PROHIBITED_CONTENT` |
| candidate | 0件 |
| raw先行保存 | 合格 |
| secret保存 | 0件 |
| ローカル受入 | 不合格、`CUE_PROVIDER_USAGE_INVALID` |

rawにcandidate本文はなく、prompt blockだけが記録された。従って字幕境界選択の品質、既知6境界の再選択、物理配置、時間写像は未評価である。

## 4. 費用

正式B6のusageは入力10,282 token、thinking 498 token、合計10,780 tokenである。v016のStandard導入価格により、入力US$0.0077115、thinking US$0.0018675、合計US$0.0095790と算出した。B5 countTokensは無償である。

本段階のTier 1 probeはUS$0.00005325。過去のschema診断probe US$0.00042225も含む一連の診断・正式実走累計はUS$0.01005450で、US$1.00上限内である。

正式manifestはcandidate/usageの完全envelope不成立により費用欄を確定しないため、raw usageとv016価格からの換算を別の版付き観測recordに保存した。

## 5. 三分法

| 分類 | 判定 |
|---|---|
| production | schema薄化、raw先行保存、一回制、ローカル拒否は契約どおり動作。欠陥確定なし |
| provider/input相互作用 | providerが入力全体を`PROHIBITED_CONTENT`としてblockした事実を確定 |
| 契約 | provider safety blockの正式ownerが現状ではusage不受理へ写る。再送、入力変更、別model、block専用ownerの追加はいずれも別裁定が必要 |

providerがどの文字列・境界片を理由にblockしたかはrawにないため、個別原因は推測しない。

## 6. 証拠

| 証拠 | 結果 |
|---|---|
| Tier probe summary | Tier 1 HTTP 200、1回 |
| B5/B6回帰TAP | 11/11、SHA-256 `521588c168ac4ce013934644e4e512ca7ba9e01ea92045f2b4046027cf63a9a4` |
| selection回帰TAP | 10/10、SHA-256 `b84ea873fdeba2c939ddd88f903885ed6ed819ebb185d8e5bb1ae1d19afe63a7` |
| 正式preflight | decoder/validator、17契約、19実装、費用、未使用root合格、SHA-256 `ce3d2d7cbee7b02261495dd7c23e34b4310b9422bb2924b2e1b08fd06ba09404` |
| 正式request | SHA-256 `3953d03a8f34cb715295dc9e1cdc87ace1272cda1e07f95c174449cc36338fc7` |
| raw response | SHA-256 `1c4124c60cae3c5adb7faf527ed66b22b022298946f55386b3f3386aefead559` |
| B6 manifest | SHA-256 `ff366d3bf0afad0c7a94f5da9dc143f81d7a9202d26c85a9674ad8f4ef5334e1` |

## 7. 未実施と次の裁定論点

未実施はselection、既知6境界検査、P/R/F、横型3本描画、QC、確認ページである。

次の裁定では、(a) provider safety blockを独立した正式拒否ownerとして観測するだけにする、(b) providerへ送る意味入力を変えず別model/別providerで一回実測する、(c) block原因を絞る合成診断を別工事にする、のどれを採るかを決める必要がある。正式B6の追加送信は未承認である。
