# Liar's Bar candidate 59 B6ローカル準備監査 v001

- 日付: 2026-07-28
- 対象: `qdczJpv8RCc` candidate 59
- 作業: 読み取り監査のみ
- 外部通信: 0回
- 人間作業: 0件

## 1. 結論

B6のjob入力経路には、candidate 59を妨げる自己参照、
candidate 13固有値の混入、既存出力との衝突は確認されなかった。

B6実走前に不足しているローカル成果物は、
candidate 59用のB4静的template 1件である。
必要な入力は既に全て存在し、B5完了後に人間判断・外部通信なしで作成できる。

## 2. 事実

### 2.1 実装の固定

- B6共通処理:
  - path: `evals/clip_composition/run_presentation_caption_gate_b6_v001.mjs`
  - SHA-256: `ef91b20545e5e48936a28ab86fbd0f2b19a1f208ac08bd4eb713c53022e07cb7`
- B6 job入口:
  - path: `evals/clip_composition/run_presentation_caption_gate_b6_job_v001.mjs`
  - SHA-256: `c9f494fe2b2c3670268cc6699f41f32d6ebbe52ca1ff3f1825bd77b6d6c453bf`
- 両実体を含む承認済み一般化実装はcommit
  `654ff933cbee559992360632213ab278657c3840`へ取り込んだ。
- 機能・回帰検査は合計258/258合格した。
  candidate 13 B6回帰9件は、二重起動を止めた単独processで9/9合格を再確認した。

### 2.2 B3の固定入力

- package root:
  `evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/qdczJpv8RCc-candidate-59-v001`
- package manifest SHA-256:
  `c26aa7065a73cd6be391cc6eb7de3477480f84407e173b5882a99d08a8ae3cd0`
- package validation report SHA-256:
  `0cef4e5ee6dea5218ad38b9d868f07a73b2252c7d6519496212b64217dcf1700`
- 静的投影:
  - 残存文字: 281
  - 発話まとまり: 2
  - 行末候補: 164
  - timeline区間: 1
  - 残存文字同士の正の時刻重なり: 0
  - 隣接行末候補の正の時刻重なり: 0

### 2.3 予定するB6 identityと出力先

- attempt ID:
  `qdczJpv8RCc-candidate-59-caption-b6-v001`
- run directory ID:
  `qdczJpv8RCc-candidate-59-v001`
- B6 job:
  `evals/clip_composition/outputs/presentation/caption-gate-b6-jobs/qdczJpv8RCc-candidate-59-v001.json`
- B6出力:
  `evals/clip_composition/outputs/presentation/caption-gate-b6/qdczJpv8RCc-candidate-59-v001`
- B1意味回答:
  `evals/clip_composition/outputs/presentation/caption-semantic-raw-outputs/qdczJpv8RCc-candidate-59-caption-b6-v001.json`
- B1 job:
  `evals/clip_composition/outputs/presentation/caption-semantic-output-check-jobs/qdczJpv8RCc-candidate-59-caption-b6-v001.json`
- B4 job:
  `evals/clip_composition/outputs/presentation/caption-display-pair-generation-jobs/qdczJpv8RCc-candidate-59-caption-b6-v001.json`
- B4表示計画:
  `evals/clip_composition/outputs/presentation/caption-display-pairs/qdczJpv8RCc-candidate-59-caption-b6-v001/display-plan.json`
- 上記の正式path、lock、work pathは全て未使用である。

### 2.4 B4静的template

次の正式templateは未作成である。

`evals/clip_composition/outputs/presentation/caption-display-pair-static-preflight-jobs/qdczJpv8RCc-candidate-59-caption-display-pair-b4-v001.json`

templateは次を束縛する。

- candidate 59のB3 package
- candidate 59の残存発話3成果物
- candidate 59の基礎映像4成果物
- 現行横型プリセット台帳
- Node・文字配置実行環境
- 上記2.2の静的投影

B6入口は、B5が参照したB3 packageと、
B4 templateが参照するB3 packageの一致を通信前に検査する。

## 3. 正しい順序

1. candidate 59のB5 `countTokens`を完了する。
2. B5出力が監視対象へ追加された後の状態で、B4静的templateを作る。
3. B4静的preflightを実行して合格を固定する。
4. B5 manifest・固定request・B3 package・B4 templateを束縛したB6 jobを作る。
5. B6通信前preflightを行う。
6. 別途承認されたB6一回実走だけを行う。

B4 templateをB5より先に作ると、B5が固定した上流監視SHAを変える。
したがって、現在はtemplateを作らず、B5完了後へ置く。

## 4. B5完了後でなければ固定できない値

- B5初回manifestのpath・SHA
- 固定生成requestのpath・SHA・byte数
- 入力token実測値
- 最大有効回答構造token実測値
- B5 manifestが記録する実行日・model・単価

## 5. B6通信後でなければ確定しない値

- HTTP生応答のSHA
- 応答が申告するmodel表記
- usage
- 実費計算
- B1受入結果
- B4表示計画のSHA

## 6. 既知の限界

- candidate 13は固定入口で実走しており、
  新しいjob入力式B6のproduction初回はcandidate 59になる。
- B6結果のstdoutにjob bindingは含まれるが、
  B6 manifest自体にはjob binding欄がない。
  初回実走ではstdoutも版付き証拠として保存する。
- B6が停止した場合は同じoutput pathを再利用せず、
  再実行が人間承認された場合だけ新attemptを作る。
- 行幅36と`normal-landscape-readable-pop-v001`を固定した横型経路であり、
  行幅・プリセット・画面形式の自由化は未実証である。

## 7. 未確認

- B5の実測tokenとmanifest
- B4静的templateの正式byteとpreflight結果
- B6 jobの正式byte
- Gemini生成結果、B1受入、B4表示計画

現時点で人間へ追加依頼する作業はない。
