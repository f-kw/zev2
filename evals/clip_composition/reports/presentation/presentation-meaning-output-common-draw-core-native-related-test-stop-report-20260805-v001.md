# 共通描画core ネイティブ関連検査停止報告 v001

- 日付: 2026-08-05
- 対象: `qdczJpv8RCc` candidate 59、意味／表現分離の初回横型描画
- 実行: 関連検査の新attempt 1回
- 結果: 32/33合格、1不合格
- API通信: 0回
- 追加費用: US$0

## 結論

ネイティブ環境では、横型・縦型の実描画を含む正常経路が合格した。したがって、前回の正式横型描画を止めたChromiumの権限問題はネイティブ環境への移行で解消できることを確認した。

ただし、検査全体は最後の実装範囲監視1件で不合格になった。規律どおり、同じattemptで期待値を直さず、横型正式描画も再開せず停止した。

## 1. 実行条件

- 固定Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`
- 固定TSX loader: `/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs`
- `NODE_OPTIONS`: 環境変数自体を不存在にした
- 実行環境: Chromiumの内部Mach port作成が許可されたネイティブ環境
- 同一監視領域に並行する描画・検査・Chromium process: 0件
- 自動再試行: 0回

保存物:

- TAP: `evals/clip_composition/reports/presentation/test-runs/20260805-common-draw-core-native-v001/presentation-output-render-plan.tap`
- TAP SHA-256: `0399f15a8bccdb8afbaf4a8225535c242a2e3cdfee73e22d5630e038079064ab`
- stderr: `evals/clip_composition/reports/presentation/test-runs/20260805-common-draw-core-native-v001/presentation-output-render-plan.stderr`
- stderr SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- stderr size: 0 byte
- 実行時間: 58.119秒

## 2. 合格した描画関連検査

- 横型を意味情報パッケージから描画・QC・manifestまで通す正常経路: 合格
- 縦型を認定crop前提で描画・QCまで通す正常経路: 合格
- 横型と縦型で意味情報パッケージbyteを変えない検査: 合格
- 契約／QC不合格、tool／I/O fatal、公開前後の失敗帰属: 全て合格
- 既存3本のstable tree不変: 3/3合格

この結果により、ネイティブ環境でRemotion／Chromiumを起動すれば共通描画処理の実経路が成立することは確認済みである。

## 3. 不合格1件

不合格ID:

- `OPF016: 実装baselineからの差分は承認済み12 pathだけである`

検査が期待したのは、実行入力記録・crop適用工事で承認された12 fileだけである。現在の実体には、その後に別途承認・実装された大容量媒体のstreaming読取修正2 fileが加わっている。

追加として観測された2 file:

1. `evals/clip_composition/run_presentation_output_base_media_job_v001.mjs`
2. `evals/clip_composition/presentation_output_base_media_v001.test.mjs`

両fileは、大容量媒体読取修正・工程再入場v002設計v001の承認済み7 file表に明記されている。変更内容は、基礎映像runnerの独自一括読取を廃し、timeline側のstreaming hash正本を共用する処理とその検査である。

## 4. 帰属

| 区分 | 判定 | 根拠 |
| --- | --- | --- |
| 共通描画production | 正常 | 横型・縦型の実描画正常経路がネイティブ環境で合格 |
| 実行環境 | 前回原因は解消 | Chromium起動・描画・QCが実際に完走 |
| 検査 | 不合格原因 | 過去の12 file工事だけを現在も唯一の許可差分として扱い、その後の承認済み2 fileを来歴別に認識していない |
| 契約 | 矛盾は未観測 | 2 fileは後続の承認済み設計に含まれ、描画・出力契約の意味を変えていない |

これは「現在の実体へ期待を合わせる」だけの修正ではない。元の12 fileと、後続の大容量媒体読取修正で承認された2 fileを、承認根拠別の固定集合として検査へ明示する必要がある。

## 5. 実施していないこと

- 不合格検査の修正: 0件
- 同attemptでの再実行: 0回
- 横型v002 job／工程入場／正式描画: 未実施
- crop適用: 未実施
- 縦型工程入場／描画／QC: 未実施
- production code変更: 0件
- 既存成果物の変更・削除・上書き: 0件
- API通信: 0回

## 6. 次の承認依頼

検査file 1件だけを限定修正し、実装差分監視を次の二層へ分けることの承認を求める。

1. 元の実行入力記録・crop適用工事の承認済み12 pathを維持する。
2. 後続の大容量媒体streaming読取修正で承認された上記2 pathだけを、承認済み追加層として固定する。
3. 14 path以外の追加・欠落は引き続き全拒否する。
4. 検査名と期待件数を12から14へ更新し、2 pathの承認根拠を検査内で明示する。
5. 修正後は同じ33件を新attemptとして頭から1回実行し、33/33の場合だけ横型v002工程入場・描画・内包QCへ再開する。
6. 横型合格時だけ、既承認どおりcrop適用、縦型工程入場、縦型描画・内包QC、完成報告へ進む。

別案として描画関連IDだけを部分実行してOPF016を迂回する方法は採らない。監視検査の不合格を残したまま正式描画へ進むことになるためである。

## 7. 事実・推測・未確認

### 事実

- ネイティブ環境の横型・縦型実描画正常経路は合格した。
- 正式33件は32/33であり、全件合格ではない。
- 不合格のactualとexpectedの差は、承認済み大容量媒体読取修正の2 fileだけである。

### 推測

- なし。

### 未確認

- 14 pathを承認来歴別に固定した新attemptが33/33合格するか。
- 横型v002、crop適用、縦型の正式工程が合格するか。
- 新経路2本の人間目視品質。
