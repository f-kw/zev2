# candidate 13 B4 後続133件 新attempt実行設計 v001

- 日付: 2026-07-26
- 状態: 設計提示。実行は人間承認待ち
- 人間作業: 承認1件。媒体視聴・時刻入力・確認操作0件
- コード、fixture、期待値、正式成果物の変更: なし

## 1. 目的

前attemptの133件は、TAPを書き出すfileを検査自身の不変監視root内へ置いたため、
有効なproduction回帰判定にならなかった。

新attemptは、検査内容を変えず、**観測記録の書き出し先だけを監視root外へ置く**。
126/133という旧結果を修正・削除・合格扱いせず、失敗した実行方法の証拠として残す。

## 2. 変更しないもの

- `evals/clip_composition/test_presentation_caption_semantic_source_package_v001.mjs`
- package／意味回答のproduction実装
- B4時間対応修正の2ファイル
- fixture、期待値、違反code、終了code
- B3正式7ファイル
- B4正式88件の合格TAP
- 最新安定点`stable/b3-complete-20260725`

新attemptのためのコード変更、検査緩和、既存TAP削除は行わない。

## 3. 書き出し先

### 3.1 監視root

既存133件が不変性を監視するroot:

`evals/clip_composition/outputs/presentation`

### 3.2 新attemptの記録root

`evals/clip_composition/reports/presentation/test-runs/20260726-caption-b4-semantic-source-rerun-v001`

保存対象:

- `semantic-source-package-133.tap`
- `execution-environment.json`
- 合格時だけ後続のTAPとpreflight実行記録

実行前に、記録rootの実体パスが監視rootの実体パスと等しくなく、その子孫でもないことを
文字列prefixではなく解決後pathで確認する。不成立なら検査を起動せず停止する。

## 4. 実行環境

既存の正式B4検査と同じ実体を使う。

- Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`
- Node SHA-256、version、OS、実行日時を実行記録へ保存
- TSX／esbuildは133件内のproduction processが使う既存束縛を変更しない
- Unix socketを使えるネイティブ実行環境

環境を変えるのはTAP保存先だけであり、Node、production入口、検査入力は変えない。

## 5. 133件の一回実行

Node標準test runnerのTAP出力を§3.2へ直接書く。
shellのpipeや監視root内の一時fileを使わない。

合格条件:

| 項目 | 固定値 |
|---|---:|
| test | 133 |
| pass | 133 |
| fail | 0 |
| skipped | 0 |
| todo | 0 |
| cancelled | 0 |
| process終了 | 0 |

TAPの保存完了後にSHA-256を計算し、実行記録へ固定する。

不合格が1件でもあれば、同attemptでコード、fixture、期待値、保存先を変えず停止する。
旧7件との一致・不一致を観測として記録するが、結果を見て部分再実行しない。

## 6. 合格後の後続

133/133の場合だけ、承認済み順序の後続へ進む。

1. 既存回帰95件を、固定5file・合計95件のまま一回実行する。
2. 各TAPは§3.2と同じ監視root外へ保存する。
3. 95/95の場合だけcandidate 13読み取り専用preflight v002を実行する。
4. 全合格時だけB4完了報告、安定点3条件確認、tag＋JOURNAL、B5承認依頼起草へ進む。

いずれか一件でも不合格なら、その時点で修正・再試行せず停止する。

## 7. 検査方法の恒久教訓

不変監視を含む検査では、test reporter、stdout、stderr、進捗logを監視root内へ
書かない。検査入力・正式成果物のrootと、検査証拠の保存rootを分離する。

「検査後に静止したfileだから問題ない」とは扱わない。問題は実行中の追記であり、
実行開始前のpath確認を必須にする。

## 8. 承認依頼

> 本設計v001を正本として、コード・fixture・期待値を変更せず、TAPを不変監視root外の`reports/presentation/test-runs/20260726-caption-b4-semantic-source-rerun-v001`へ保存する新attemptで既存133件を頭から1回実行してよい。133/133の場合だけ既存回帰95件、candidate 13読み取り専用preflight v002、B4完了報告へ進む。不合格が一件でもあれば同attemptで直さず停止する。
