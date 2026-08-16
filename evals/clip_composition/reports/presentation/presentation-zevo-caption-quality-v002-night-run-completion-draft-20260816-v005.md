# ZEVO字幕品質v002 完了報告草稿 v005

日付: 2026-08-16

## 現在地

機械実装と正式受入の基礎工事は完了している。

- F局所 3/3、U局所 2/2。
- 正式48/48、proof 523/523。
- reverse consumer graphで既存直接影響0件。正式48件が今回の全consumerを所有する。
- baseline 86/203 exact、ID別差分0件。
- 既存5 tree一致。
- A-v002記録対象2,887件は欠落0・byte差0。
- 記録commit外の未追跡54件は別台帳へ保存し、旧green再確定工事へ接続済み。

API実証は、Gemini 3.7のschema不受理、安全性遮断、Gemini 3.6の棄権を別層として観測した。現在は3.6棄権理由を診断するD1の送信直前で停止している。

## Gemini実証の到達点

1. provider向けschemaはTier 1へ薄化し、HTTP 400を解消した。
2. ローカルstrict受入は不変で、provider誘導schemaの薄化によるsilent受理はない。
3. Gemini 3.7正式B6は二回とも安全性遮断。字幕単独と最小schemaの全量対照では遮断せず、字幕本文単体へ原因を帰属できない。
4. Gemini 3.6は同じ正式入力とTier 1を受理し、安全性遮断なしでcandidateを返したが、内容は明示的棄権だった。
5. 字幕境界selection、page/line plan、render plan、横型3本、QC、確認ページは未成立。

API検証累計費用はUS$0.08396625。raw先行保存、正式再試行0、secret保存0を維持した。

## D1送信前状態

- 入力: 保存済み3字幕・253境界の正式request。
- provider schema: 採用済みTier 1。
- 最大出力: 65,536で不変。
- 変更: thinking levelをmediumからhighへ一件だけ。
- 正式利用: 診断回答のselection・描画への流用禁止。
- 通信: 0回。明示承認待ち。

D1がcompleteかつ診断用ローカルstrict受入・既知6境界非再選択まで全合格した場合だけ、thinking highを正式化するv020へ進む。D1が棄権なら、理由field付きschemaと非structured説明のD2/D3へ進み、prompt/task変更は人間へ戻す。

## provider再評価副線

GPT-5.6 Lunaの公式一次資料を確認し、通信0でtransport設計素材を保存した。

- model ID: `gpt-5.6-luna`
- endpoint: Responses API
- structured output: strict JSON schema対応
- 現在の標準単価: 入力US$0.20、出力US$1.20 / 1M token
- rate limit: tier別のRPM/TPM/batch queueを確認
- data: API入力は既定で学習不使用。既定のabuse monitoringとResponses保存条件があるため、将来設計では`store:false`と実際のZDR設定確認が必要

実際のOpenAI API接続、prompt移植、品質比較は未実施であり、契約成立を主張しない。

## 完了までの残作業

1. D1 diagnostic sendの明示承認。
2. D1結果に従うD2/D3またはv020分岐。
3. 正式回答が成立した場合のselection受入、P/R/F、横型3本、QC、確認ページ。
4. kawafmm目視。
5. 目視合格後の安定点化は別承認。

## 凍結・在庫

- 旧green・旧レンダラー信頼台帳の現行再確定。
- 描画疎結合化。
- renderer表現力。
- 字幕境界選択provider再評価。
- F/U fixture製造のS〜U全gate統合。
- 契約件数pin proofの置換連鎖。
- 新設runner観測性の標準装備。

## 外部作用

- 本草稿同期のAPI通信: 0回
- OpenAI API通信: 0回
- D1通信: 0回
- 追加費用: US$0
- commit: 0件
- stable tag: 0件
