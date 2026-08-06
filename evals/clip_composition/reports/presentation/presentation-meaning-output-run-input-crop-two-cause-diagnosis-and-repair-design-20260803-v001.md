# 実行入力記録・crop適用 二原因診断／限定修正設計 v001

- 日付: 2026-08-03
- 対象attempt: `formal-228-attempt-v001`
- 対象TAP SHA-256: `84cc3009a0e9e42e2aec3b711e9f522c073d1d4bab287cb471bd8791f8e0bfc5`
- 親設計SHA-256: `05ed3b6df0d5b05204df9ddb2dc0f78295d66f77ed125fa9c921037cb91cabc1`
- 診断時の通信: 0回
- 診断時の費用: US$0

## 1. 冒頭結論: production影響あり

群Bの変換エラーは検査専用ではない。固定Node v20.19.6と固定TSX loaderで正式production入口`run_presentation_output_job_v001.ts`を引数なし起動したところ、job検査へ入る前に、正式検査と同じ`Top-level await is currently not supported with the "cjs" output format`でexit 1となった。

したがって群Bはproductionの読み込み構造の欠陥である。ただし計算、schema、正式成果物の欠陥ではなく、TypeScript経路から既存ES moduleを読む際の静的import graphに限定される。

## 2. 群Aの診断

### 事実

test 110は正式publication runnerの起動前に、実v006 crop成果物3件をfixtureへ複製する処理で失敗した。fixtureは全3件のcanonical SHAへ、意味JSON用の整数限定入口を一律使用していた。

crop decisionには`0.601796875`、`0.918203125`等のviewport値、selection manifestには有限小数のpreview時刻があり、整数限定入口が拒否するのは正しい。

production runnerは同じ参照成果物へ、既に`canonicalSha256PresentationOutputFiniteJsonV001`を使用している。この入口は有限小数を保持し、NaN、Infinity、`-0`、unsafe integer、疎配列等を拒否する。

### 帰属

fixtureの正規化入口選択誤り。productionと契約は無傷である。

### 限定修正

`presentation_meaning_output_run_input_record_v001.test.mjs`のfixture binding作成だけを、productionと同じ有限数値対応入口へ差し替える。record/job本文の整数限定入口は変更しない。

## 3. 群Bの診断

### 事実

正式production入口から基礎映像処理へ、次の二経路で到達していた。

1. output runner → style resolver / crop application → base-media builder
2. output runner → crop application → run-input record → base-media builder

基礎映像処理は直接起動部に最上位awaitを持つ。ES moduleとして直接読む場合は成立するが、TypeScript production入口から固定TSXがCommonJS形式へ変換する経路ではmodule load前に拒否される。

固定実体を使った読み取りprobeでは、crop applicationから上記二つの静的edgeを外し、必要時にnative dynamic importすると、既存validator 4件を同じ実体から取得できた。計算の再実装は不要である。

### 帰属

productionのimport graph欠陥。検査期待・契約・基礎映像validator本体の欠陥ではない。

## 4. 修正案比較

| 案 | 内容 | file範囲 | 計算複製 | 契約影響 | 判定 |
|---|---|---:|---:|---|---|
| A | crop build時だけ既存validatorをnative dynamic importし、builder呼出しをawaitする | 承認済み12 file中3 file | 0 | schema・byte・違反code不変。内部call方式のみ | 採用 |
| B | base-media builderの直接起動部から最上位awaitを除く | 13 file目を追加 | 0 | CLI回帰と範囲改訂が必要 | 今回不採用 |
| C | validatorをcrop側へ複製する | 12 file内 | あり | 正本計算複製 | 禁止 |
| D | 検査だけESM起動へ変更する | 検査のみ | 0 | production不成立を隠す | 禁止 |

案Aは、親設計・実装明確化が固定したexport名、schema、検証順、違反所有、正式byteを変えない。`buildPresentationOutputCropApplicationV001`の内部依存取得と呼出しをPromise化するが、正式runnerと承認済み検査だけがその入口を使い、全呼出し元を同じ12 file内でawaitへ揃える。これは新しい契約解釈ではなく、確認済み既存validatorを同じ正本から読むための読み込み構造修正である。

## 5. 変更する既存3 file

1. `presentation_output_crop_application_v001.mjs`
   - base-media validator 3件とrun-input validator 1件の静的importを除く。
   - 4 validatorを同じ既存moduleから遅延取得する一つの共有loaderを置く。
   - crop application builderをasync化し、取得したvalidatorを既存の判定位置へ渡す。
2. `run_presentation_output_crop_application_job_v001.mjs`
   - 同じbuilder呼出しをawaitする。失敗code・stage・公開処理は変えない。
3. `presentation_output_style_resolver_v001.test.mjs`
   - builder正常系をawaitし、4拒否系を`assert.rejects`で観測する。期待codeは変えない。

群Aの修正は、既に承認済みの`presentation_meaning_output_run_input_record_v001.test.mjs`だけで行う。合計のimplementation path集合は親設計の12 fileから増えない。

## 6. 修正後の検査順

1. 固定Node・固定TSXでproduction runnerを引数なし起動し、module load成功後の既定fatal exit 2へ到達することを確認する。
2. 正式228件を新attemptとして頭から一回実行し、TAP全文と全IDを版付き保存する。
3. 228/228の場合だけ既存合格gate 287/287を実行する。
4. 同じ場合だけ既知baseline 64/181不変と既存3本tree SHA不変を確認する。
5. 全成立時だけ実行入力記録を正式固定し、固定済み5項目だけの実行前下書きを提示する。

一件でも不合格なら同attemptで直さず停止する。API通信、費用、生成、描画は下書き提示まで0のままとする。
