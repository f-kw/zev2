# 大容量媒体読取修正・工程再入場v002 実行停止報告 v001

- 日付: 2026-08-04
- 状態: **実装・回帰は合格。工程入場CLIの起動前loader不足で停止**
- 実行入力記録SHA-256: `5ac80deeb0daac08ea32cad7fa9b016cf04ab95ea551fa6981e6c8151ee28680`
- 承認設計SHA-256: `be9b60f732bedd3192e357f9f95653f838ba392f4de12773b87aa532cee29e26`

## 1. 結論

承認済み7 fileの実装と全回帰は合格した。

その後、新しいtimeline jobを工程入場v002へ通す正式commandを1回起動したが、工程入場処理が始まる前にNodeが既存TypeScript依存を読み込めず終了1になった。失敗を観測したため、同じ実行点でloaderを足して再実行せず停止した。

新receipt、timeline成果物、B5/B6成果物、動画は生成していない。API通信は0回、費用はUS$0である。

## 2. 実装した内容（事実）

### 2.1 大容量媒体読取

- 基礎映像runnerにあった安定streaming SHA処理をtimeline coreへ移し、唯一の計算正本にした。
- 基礎映像runner、timelineの媒体初回照合、timelineの公開直前再照合が同じ処理を使う。
- 媒体SHA不一致、source identity内容不正、I/O・資源・読取中実体変化の帰属を承認設計どおり分離した。
- timelineの既存9違反codeは変更していない。

### 2.2 工程再入場v002

- v001 receiptを不変保持するforward-onlyのv002 job/receiptを追加した。
- attempt 1、attempt 2以降の直前v002 receipt束縛、版付きattempt root、no-replace公開、固定10工程の同一record閉包を実装した。
- v001からの変換・fallback・上書きは作っていない。

変更した実装・検査fileは承認上限どおり7件である。

## 3. 検査結果（事実）

| 検査 | 結果 | 証拠 |
|---|---:|---|
| 関連正式検査 | **73/73** | `test-runs/20260804-meaning-output-large-media-read-stage-readmission-v001/related-formal-attempt-v001.tap`、SHA-256 `a7fdfe358680fe388bc2a2a29d7415bdbfa4b712bed401acf0dd2f4ef283cd6f` |
| 既存正常系gate | **287/287** | `test-runs/20260804-meaning-output-large-media-read-stage-readmission-v001/existing-green-gates-attempt-v001.tap`、SHA-256 `7ca69a2c91eb5e0da77e21d8ea015db77d84fd99f3de48263b363de3953b17e2` |
| 既知baseline | **64/181不変** | `test-runs/20260804-meaning-output-large-media-read-stage-readmission-v001/known-baseline-attempt-v001.tap`、SHA-256 `131dc619d1985a38018a870d25075abf0117d03ea31339cf0635417be85914a2` |
| 既存3本tree | **3/3一致** | `test-runs/20260804-meaning-output-large-media-read-stage-readmission-v001/stable-three-trees-attempt-v001.tap`、SHA-256 `5a716831ef137d7654ce1ebf81bff03955dbd0edb737bbc33b08bc30e07723c1` |

関連正式検査では、複数chunk読取、媒体SHA不一致、source identity内容不正、媒体欠落、symlink、hard link、公開直前再読、9 code不変、v002 attemptとno-replace経路を含めて合格した。

## 4. 新規正式入力（事実）

| 成果物 | path | SHA-256 | 状態 |
|---|---|---|---|
| timeline job v002 | `evals/clip_composition/outputs/presentation/meaning-timeline-decision-jobs/qdczJpv8RCc-candidate-59-meaning-output-first-run-timeline-v002.json` | `beed7353d3afdc555da6cc6c9fff79e49f2bdc8be2f5b0f83e8bcbfbd0c52da9` | schema合格 |
| 工程入場job v002 | `evals/clip_composition/outputs/presentation/meaning-output-stage-admission-jobs/qdczJpv8RCc-candidate-59-meaning-output-first-run-v001/v002/01-timeline-decision-attempt-0001.json` | `aa4ce646e9ccdee84ae390503598a6566546f403fd08580711a19a631fbd5bf0` | schema合格 |

素材、区間、既存来歴、実行入力記録は旧jobから変更していない。timeline実装SHAだけを合格済みの現物へ更新した。

## 5. 停止の観測（事実）

工程入場runnerを固定Nodeだけで起動したところ、次で停止した。

```text
TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".ts"
.../evals/clip_composition/render_presentation_vertical_review_v001.ts
```

| 記録 | 値 |
|---|---|
| process終了code | `1` |
| stdout | 0 byte、SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| stderr | 648 byte、SHA-256 `14256813f598afbe6a343ba2b94e1fbd6537b134860982ba3cc399235ca56143` |
| v002 receipt | 未生成 |
| timeline成果物 | 未生成 |
| API通信 | 0回 |

runner本体のdispatch、job検査、receipt生成には到達していないため、productionがjobを拒否した結果ではない。失敗reportも生成されていない。

## 6. 帰属

### 事実

- 工程入場runnerの依存graphには既存TypeScript fileが含まれる。
- 固定TSX loader付きの構文後import確認と関連正式検査は合格している。
- 正式工程入場commandだけが固定TSX loaderを付けずに起動された。

### 推測

- 固定TSX loaderを同じcommandへ付ければ、工程入場処理そのものへ到達できる見込みである。

### 未確認

- 固定TSX loader付き工程入場の合否。
- streaming修正後の正式3.29 GB媒体読取とtimeline成果物生成。
- B5/B6、意味package、基礎映像、横型・縦型動画、QC。

## 7. 推奨する再開案

コード、job、入力、attempt番号、出力先を変更せず、承認済み固定TSX loaderを付けた工程入場commandを新たに1回実行する。

- Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`
- TSX loader: `/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs`
- loader SHA-256: `f06fb3da72f722ec9a2c3e8502f750ae1b6300b93fb76e8a52548dba69b6730f`
- v002 attemptはreceipt未発行のため引き続きattempt 1とする。
- receipt rootが未使用であることを再確認してから実行する。

合格時は元の承認どおり、timelineを1回実行し、その合格後だけB5最大2回、B6一回、US$0.50上限、横型・縦型描画・QCへ進む。不合格なら保存して停止する。

## 8. 承認依頼文

> 工程入場v002の起動前loader不足による停止を確認した。コード・job・入力・attempt番号・出力先を変えず、固定TSX loaderを付けた同じ工程入場jobの新たな1回実行を承認する。receipt rootが未使用であることを事前確認し、合格時は既承認の連続範囲どおりtimeline一回→B5最大2回→B6一回→意味package→基礎映像→crop適用→横型・縦型描画→QC→完成報告まで進める。不合格、通信失敗、回答不受理、物理検査不合格、QC不合格は保存して停止する。
