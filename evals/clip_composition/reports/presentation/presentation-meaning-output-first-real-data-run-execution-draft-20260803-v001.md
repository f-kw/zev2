# 意味／表現分離 初回実デー相談役レビュー済み。kawafmm裁定: 実行前下書きv001を確認した。固定5項目は事前承認値と完全一致し、追加の人間判断は増えていない。よって既承認の条件付き実行承認を発効する:
意味/表現分離の初回実データ横型+縦型runを承認する。実行入力記録(SHA 5ac80deeb0daac08ea32cad7fa9b016cf04ab95ea551fa6981e6c8151ee28680)を正本とする。B5 countTokensは最大2回、B6 generateContentは1回、再試行0回とし、承認済み支出上限US$0.50内だけ送信する。B5実測が上限内なら追加の人間待ちなしで、B6→意味情報パッケージ→基礎映像→crop適用→横型・縦型の構築・描画・QCまで連続して完成報告で停止する。人間作業は完成動画2本の目視だけとする。
上限超過見込み・通信失敗・回答不受理・物理検査不合格・QC不合格は、記録を保存してその場で停止。
目標接続判定: 意味/表現境界の実データ実証。タ実行前下書き v001

- 日付: 2026-08-03
- 対象: `qdczJpv8RCc` candidate 59
- 状態: 実行入力記録の正式固定まで完了。API通信・生成・描画は未実施。

## 今回固定した5項目

| # | 項目 | 固定内容 |
|---:|---|---|
| 1 | 素材と区間 | 元配信`youtube:qdczJpv8RCc`、candidate 59、開始`5941162ms`、終了`5992736ms`。人間承認済み組立決定（file SHA-256 `72a1d9c95839a62a3f4dae395ffa9e67877910d75040c65796ca994ad3dd51a4`）を使用する。 |
| 2 | 横型 | `normal-landscape-readable-pop-v001`、1行の論理幅36、cropなし（identity）。 |
| 3 | 縦型 | `speaker_only`、`vertical-short-speaker-only-readable-pop-v001`、1行の論理幅14、人間認定済み`crop-decision-v006`を使用する。crop判断のfile SHA-256は`4fba3f371412310fc5122ccfb58634e390a5725aec185172bcf041dd0152a4ed`。 |
| 4 | 支出上限 | US$0.50（`500000000 nanoUSD`）。通信前の実測見積りが上限を超える場合は送信しない。 |
| 5 | タイトル | 空文字。今回の動画へタイトル文字列を追加しない。 |

上記以外の人間判断は追加していない。最大2行、文字幅の計算、素繋ぎ、音声保持、素材なし等は、承認済みの台帳・出力契約から機械的に導出する。

## 実行前に成立した検査

| 検査 | 結果 | 証拠 |
|---|---:|---|
| 最終正式検査 | 228/228合格 | `formal-228-attempt-v004.tap`、SHA-256 `9a3d439b5648186fc446e104a8c98e9b32aacb395ad54fe33ae218a7c3013a9a` |
| 既存の合格ゲート | 287/287合格 | `existing-green-gates-after-formal-v004.tap`、SHA-256 `ab75b5ea46f59167eeb4200e043709c44599b42b2eeb3249fbc2e6ebc4b66e9b` |
| 既知baseline | 64/181のまま（既知117不合格を含む構成に変化なし） | `known-baseline-after-formal-v004.tap`、SHA-256 `051406d656f24c8ac19d2433e85d6e82fe7b7897c46a6e74854e30f69876c2bf` |
| 既存3本の保護 | 3/3合格 | `stable-three-trees-after-formal-v004.tap`、SHA-256 `fd4493c81ae0727829aa14ccfd1ff954e66be2c1da8da7e4adc941911ac9b952` |

正式228件は`NODE_OPTIONS`を空文字で渡さず、環境変数自体が存在しない状態で、固定済みNode・TSX実体を使って一度だけ実行した。TAPは全228 IDを保存し、stderrは0 byteだった。

## 正式固定した記録

- 実行入力記録: `evals/clip_composition/outputs/presentation/meaning-output-run-input-records/qdczJpv8RCc-candidate-59-meaning-output-first-run-v001/run-input-record.json`
- file SHA-256: `5ac80deeb0daac08ea32cad7fa9b016cf04ab95ea551fa6981e6c8151ee28680`
- canonical SHA-256: `22e869ae688e84081e7797189d5283efb855a6d3f075506c5b585ffec6dbaedd`
- 公開job: `evals/clip_composition/jobs/presentation/meaning-output-run-input/qdczJpv8RCc-candidate-59-meaning-output-first-run-v001.json`
- job file SHA-256: `ae1fc56de33d5e83eb0473401a9fa4a26c7318a8276fae3f2b3c38b33ec49b0b`
- 公開結果: exit 0、stdoutと正式記録は2,212 byteでbyte同一、stderr 0 byte、出力root内は正式記録1件だけ。

## この下書き確認後の実行範囲

既承認の条件付き実行範囲は次のとおりである。

1. 入力tokenを最大2回計測する。
2. US$0.50以内と確認できた場合だけ、Gemini生成を1回実行する。自動再試行はしない。
3. 意味情報パッケージと基礎映像を生成する。
4. 人間認定済みcropを新基礎映像へ適用する。
5. 横型・縦型を構築して描画し、両方のQCを行う。
6. 完成報告で停止する。人間作業は完成動画2本の目視だけとする。

入力見積りの上限超過、通信失敗、回答不受理、物理検査不合格、QC不合格のいずれかでは、記録を保存してその場で停止する。

## 事実・推測・未確認

### 事実

- 固定5項目は承認済み設計、正式台帳、組立決定、crop認定記録の実体と一致した。
- 5項目以外の人間判断は増えていない。
- 本下書きまでのAPI通信は0回、費用はUS$0。

### 推測

- なし。

### 未確認

- 実測入力token、実際のAPI費用、Gemini回答の受理可否は未確認。
- 新経路による横型・縦型の生成、描画、QC、人間目視は未実施。

## 停止点

実行入力の正式固定と本下書きの提示で停止する。確認対象は上記5項目だけである。
