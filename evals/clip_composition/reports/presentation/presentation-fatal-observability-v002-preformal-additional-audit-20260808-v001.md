# fatal観測性v002 正式attempt前・追加監査 v001

- 日付: 2026-08-08
- 状態: **PASS 6/6（正式test開始許可）**
- 開始commit: `84c723362de8a0ee0d74fd0303eabab0992c879f`
- 承認元停止報告SHA-256: `d6940e6e054179f5e367c6e51123b2215dac0726a05639535a77248dede68e15`
- 外部通信: 0回
- 費用: US$0

## 1. 今回の限定修正

旧B1のfatal対象file選択から、呼出側がfield名・path・SHAを一件の検証済み集合へ自分で入れる経路を除いた。

- production: `evals/clip_composition/run_presentation_caption_semantic_output_check_v002.mjs`
- SHA-256: `660d01933b114aab6568489dd7477d89351030ceba124ff4a60edb791532409c`
- 証明: `evals/clip_composition/presentation_fatal_observability_v002.integration.test.mjs`
- SHA-256: `a518ce8ac4c018739bb9580a49fdc575bd52da79ff97b27dbdba6297fac1b7e2`

旧B1は、strict JSON復号と既存job validatorの合格後だけ、job自身、実装file、依存file、package manifest、package validation report、意味回答の6 field群を検証済み集合へ投影する。読取失敗時は実際に読もうとしたbindingのpath・SHAをこの集合へ照合し、exact一件の集合側field名だけを共通selectorへ渡す。不一致・複数・未検証・固定許可表外はnullとなる。

呼出側が保持する読取状態からfield名を削除した。固定許可field表、共通selector、decoder、validator、schema、status、既存違反code、終了code、正式成果物は変更していない。

## 2. 追加監査6項目

| ID | 監査 | 判定 | 現物根拠 |
| --- | --- | --- | --- |
| A01 | 定義・import・export実在 | PASS | 共通selectorと5境界のimport、旧B1のstrict decoder・job validator・検証済み集合builder・全callsiteが実在。変更2 fileの固定Node構文検査も合格 |
| A02 | rejectedとfatalのcatch分離 | PASS | 既存の検査済み拒否は従来status・違反code・終了1を維持。未分類I/O・資源・子process失敗だけがfatal・終了2へ進む。旧B1のpackage shape拒否もfatal化していない |
| A03 | child processの固定stageと生出力非漏洩 | PASS | 13 stageの接続を維持。stdout・stderr・message・stack・字幕本文・secretを正式fatalへ保存する経路は0件 |
| A04 | 全境界・全targetFile経路の検証済みrecord接続 | PASS | F04 timeline、F06旧B1、F08意味終端、F11意味package、outputを全wrapper・全callsiteで再照合。caller値から検証済み集合を自作する経路は0件 |
| A05 | 保存先不正と実公開失敗のowner分離 | PASS | 公開前の固定sentinel不正はtarget-invalid、write・rename・no-replace・公開後照合はpublication-failed。ownerの混同0件 |
| A06 | 正常・rejected実経路と証明割当て | PASS | F03は13 stageと実害対応、F02は14 inner codeのproduction実枝を所有する事前固定分担。F02 41 ID、F03 40件の構成を維持し、証明損失0件 |

総合: **6/6 PASS**。正式81件の新attemptを開始できる。

## 3. 横断targetFile確認

| 境界 | 検証済み集合の根拠 | 通常早期fatal | 公開前再読 | 自己認定経路 |
| --- | --- | --- | --- | ---: |
| timeline | strict decoder・job validator合格後のjob | 同じ集合からexact一件 | 同じ集合からexact一件 | 0 |
| 旧B1 | strict decoder・job validator合格後のjob | 同じ集合からexact一件 | 該当なし | 0 |
| 意味終端 | job／上流recordの検証と実読取証拠 | 同じ集合からexact一件 | 同じ集合からexact一件 | 0 |
| 意味package | job集合、timeline検証後のjob＋timeline集合 | 段階に応じた集合からexact一件 | 同じ正本集合からexact一件 | 0 |
| output | job validator、またはjob検証＋実file再読＋SHA一致 | 検証済み固定field／集合からexact一件 | 実file再読済み集合からexact一件 | 0 |

output request経路の一件集合は、呼出側fieldを受けるwrapperではない。所有関数内でjob validatorが合格した後、固定field`job.requestBinding`だけから作るため、caller自己認定には該当しない。描画core経路は実file再読とSHA一致後にだけ集合へ登録する。

## 4. 81件内の旧B1証明

- `FOVB004`: context前・未検証jobでは対象fileがnull。
- `FOVB005`: 検証済みjobの実装file読取失敗をproduction入口で起こし、実際のbindingと対象fileのpath・SHAが完全一致。
- `FOVB006`: 正常、検査済み拒否、棄権、正式byte、終了0／1が不変。
- `FOVC002`: 共通selectorのexact一件受理。
- `FOVC022`: 5境界の固定許可field表。
- `FOVC025`: 複数一致はnull。
- `FOVC026`: 未検証recordはnull。

validな旧B1 jobでは許可bindingのpathが固定されるため、複数一致をproduction runner fixtureで作るには検査専用注入口が必要になる。複数一致nullは共通selectorのFOVC025、旧B1集合がvalidator合格jobだけから作られることはA04の全callsite静的照合が所有する。検査用注入口は追加しない。

## 5. 正式attempt開始条件

- 固定Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`
- Node SHA-256: `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c`
- 固定TSX loader: `node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs`
- loader SHA-256: `f06fb3da72f722ec9a2c3e8502f750ae1b6300b93fb76e8a52548dba69b6730f`
- `NODE_OPTIONS`: 不存在
- test concurrency: 1
- attempt root: `evals/clip_composition/reports/presentation/test-runs/20260807-fatal-observability-v002/attempt-0001/`
- attempt root: 開始前未使用
- 同一監視領域への並行書込み: 0件
- `npm exec`／`npx`: 使用しない

正式81件はF02・F03を一commandで頭から一度だけ実行し、TAP全文とstderrを分離保存する。不合格1件で停止し、同attempt内で直さない。
