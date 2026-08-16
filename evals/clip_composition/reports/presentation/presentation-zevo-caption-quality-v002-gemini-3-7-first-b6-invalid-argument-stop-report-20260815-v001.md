# ZEVO字幕品質v002 Gemini 3.7 Flash 初回B6 INVALID_ARGUMENT停止報告v001

## 1. 結果

source/B5/B6契約集合の分離修正と正式B5は合格した。続く正式B6 `generateContent`は一回送信され、raw responseを先行保存した後、provider envelope不受理として停止した。

- B5 `countTokens`: 2回、合格
- B6 `generateContent`: 1回、再試行0
- B6 HTTP結果: 400 `INVALID_ARGUMENT`
- provider理由: `Request contains an invalid argument.`
- raw response: 解析前に正式保存済み
- selection受入、page/line plan、render plan、横型描画、QC、確認ページ: 未実施
- 同attemptでの修正・再実行: 0件

## 2. 限定修正の検証

B5/B6 runner内の承認契約集合を次へ分離した。

- source package provenance: 14件
- B5 formal job: source 14件にGemini 3.7 Flash・価格追補v016を加えた15件
- B6 formal job: B5 15件にAPI key不存在所有追補v005を加えた16件

正式回帰は11/11、既存proof観測116/116で合格した。次の実枝を同一attemptで確認した。

1. 保存済み正式source packageが14件のままB5 source再読を通過する。
2. B5 jobからv016を除くと通信入口前に拒否される。
3. B6 jobからv005を除くと通信入口前に拒否される。
4. B6 jobからv016を除くと通信入口前に拒否される。

TAP:

`evals/clip_composition/reports/presentation/test-runs/20260815-zevo-caption-quality-v002-gemini-3-7-contract-set-fix-attempt-0001/test.tap`

TAP SHA-256:

`9a610d84a7a5a1a387cae60e47f835d088a0d72b92cc3d595ba7737eb523d71c`

## 3. B5実測

正式B5 job:

`evals/clip_composition/jobs/presentation/output-caption-cue-b5-jobs/a-v002-caption-quality-first-api-b5-20260815-v002.json`

正式B5 manifest:

`evals/clip_composition/outputs/presentation/output-caption-cue-b5-attempts/a-v002-caption-quality-first-api-b5-20260815-v002/attempt-0001/b5-manifest.json`

実測値:

- probe入力token: 10,282
- final入力token: 10,282
- model入力上限: 1,048,576
- model出力上限: 65,536
- 導出した最大出力token: 65,536
- Standard list priceによる送信前最悪投影: US$0.2534715
- 承認上限: US$1.00
- 判定: 上限内
- B5全13 check: passed

B5実行記録:

`evals/clip_composition/reports/presentation/test-runs/20260815-zevo-caption-quality-gemini-3-7-b5-formal-attempt-0003`

## 4. B6実測

正式B6 job:

`evals/clip_composition/jobs/presentation/output-caption-cue-b6-jobs/a-v002-caption-quality-first-api-b6-20260815-v001.json`

正式B6 output:

`evals/clip_composition/outputs/presentation/output-caption-cue-b6-attempts/a-v002-caption-quality-first-api-b6-20260815-v001/attempt-0001`

保存成果物:

- `generate-content-response.raw.json`
- `b6-manifest.json`

provider responseの構造:

- top-level key: `error`のみ
- HTTP相当code: 400
- status: `INVALID_ARGUMENT`
- message: 一般理由のみで、拒否fieldの指定なし
- modelVersion: なし
- usageMetadata: なし
- candidate: なし

B6 manifestの主要検査:

- request byte: passed
- endpoint: passed
- raw先行保存: passed
- secret不保存: passed
- HTTP envelope: failed
- candidate count: failed
- model: failed
- usage: failed
- candidate本文・tier・費用確定: blocked

raw response SHA-256:

`b01105ed229707571186fdc753a734401dcd3dca044538c55285824604725bd3`

B6 manifest SHA-256:

`78afcfb2b50d15857c8d64c6ad94e0d5cd9229cae33cb5dbb23b578a67de3fe6`

B6実行記録:

`evals/clip_composition/reports/presentation/test-runs/20260815-zevo-caption-quality-gemini-3-7-b6-formal-attempt-0001`

## 5. 費用

- B5の送信前最悪投影: US$0.2534715
- B5 `countTokens`: Google公式の無償APIであり課金0
- B6 `generateContent`: HTTP 400であり、Google公式の「400または500で失敗したrequestのtokenは課金しない」という規則により課金0
- 本attemptの実課金: **US$0**
- 支出上限超過: なし

根拠はGoogle公式Billingの`Is GetTokens billed?`および`Am I charged for failed requests?`である。400応答はquotaには数えられ得るが、課金対象ではない。

## 6. 三分法

- source package／B5契約集合修正: 合格。今回のB6停止原因ではない。
- job・fixture・正式request byte: 内部のdecoder・値検査・参照SHA・送信前費用検査には合格した。
- provider実受理: 400 `INVALID_ARGUMENT`で拒否。
- production request／provider機能整合／契約解釈: rawが拒否fieldを示さないため、保存証拠だけでは一意に帰属できない。

従って本停止は「provider実受理に対する診断可能性不足」とする。公式事前照合で成立とした`responseJsonSchema`、`thinkingLevel=medium`等の組合せのどれが実endpointで不受理だったかは、追加通信なしでは確定しない。推測で一項へ帰属せず、request調整や再送は別裁定へ戻す。

## 7. 現在地

- `.env`からのcredential読込: 成立、値非保存
- source/B5/B6契約集合分離: 実装・回帰合格
- B5: 合格
- B6: 一回送信、provider envelope不受理で停止
- B6再試行: 0回
- 横型3本: 未生成
- commit・stable tag: 未実施
