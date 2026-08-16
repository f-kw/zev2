# ZEVO字幕品質v002 v014 F局所正式attempt-0007 契約判断停止報告 v001

- 日付: 2026-08-14
- 判定: 停止
- F局所検査: 0/3
- 同attempt修正: 0件
- 外部API通信: 0回
- API費用: US$0
- U局所・正式46件・回帰・描画・tag: 未実施

## 1. 結論

正式起動形をbyte単位で復元したattempt-0007でも、最初のruntime依存を評価する段階で3検査すべてが停止した。v014の観測により、停止位置・対象・code識別子は次へ一意化した。

| 観測欄 | 実測値 |
|---|---|
| 外側 | `fatal / input-reread / CUE_PROOF_EXECUTION_FAILED` |
| 内側段階 | `dependency-evaluate` |
| 操作 | `evaluate-dependency` |
| 対象 | `presentation_output_caption_cue_source_package_v001.mjs` |
| OS code | `null` |
| 例外code識別子 | `ERR_UNSUPPORTED_RESOLVE_REQUEST` |

したがって、attempt-0004/0005の本来の問いは「loader直指定というattempt-0006固有の設営差」では説明されない。固定Nodeから登録済み固定TSX CLIを起動した正式形でも、同じ最初の依存評価が失敗することが正式TAPで確認された。

修正には、v013/v014が固定したrelative literal指定子または依存loader構造の変更が必要になる。これは今回許可された軽微な実装修正の範囲外であり、契約判断として停止した。

## 2. 正式起動形の照合

attempt-0004、attempt-0005、今回のattempt-0007から、起動blockをsource byteで抽出して比較した。

- 3件の起動block SHA-256: `9ab26022e6da1c088cedb8cfea41a95afa953b9f01d3db39bc99b42aa78373c3`
- byte一致: 3/3
- 実行体: 固定Node v20.19.6の絶対path
- 引数1: 登録済み固定TSX CLIの絶対path
- 引数2: `--test`
- 引数3: F局所test path
- 引数順: 一致
- `NODE_OPTIONS`: 不存在

command preflightの記録SHA-256は`18bc76c0a295846aab4ee56ceb6ef54747f2d3f1ef078688807c86bc249c3423`。attempt-0006のNode loader直指定は正式起動blockと一致せず、今回の原因根拠には使用していない。

## 3. 起動前checklist

| 項目 | 結果 |
|---|---:|
| 読取対象file | 99/99 |
| runtime実体 | 7/7 |
| proof実装束縛 | 51/51 |
| 準備directory | 5/5 |
| output/stagingの未使用 | 2/2 |
| 固定Node/固定TSX SHA | 一致 |
| FFmpeg/FFprobeの実体path・SHA | 一致 |
| Chromiumネイティブ起動 | 終了0 |
| test構文検査 | 合格 |
| 競合する同一正式process | 0件 |

環境preflight SHA-256は`10b25637b621e44a9286a4db4b9834e4a6575da641aa14ac91c0c80a43878659`、起動checklist SHA-256は`640d29b2b61379e19a8094f035411d620d7e367f5808f34ffe97ea4466d52436`。

## 4. 正式attemptの実測

| 検査 | 結果 | 最初に観測した停止 |
|---|---:|---|
| ZCQ042 | 不合格 | source依存の評価 |
| ZCQ043 | 不合格 | source依存の評価 |
| ZCQ044 | 不合格 | source依存の評価 |
| 合計 | 0/3 | 同一の構造化観測 |

- TAP: 8,795 byte、SHA-256 `ccbab5d2a398df67c354647de23dcf40c9c2c1469cbf0ee5652a55a6ec340182`
- stderr: 0 byte、SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- 終了code: `1`、記録SHA-256 `4355a46b19d348dc2f57c046f8ef63d4538ebb936000f3c9ee954a27460dd865`
- 正式output/staging: 0件
- fixture値: attempt番号と未使用pathへの版進行以外は不変

## 5. 原因と三分法

### 5.1 事実

1. 正しい固定TSX CLI入口でも`ERR_UNSUPPORTED_RESOLVE_REQUEST`がsource依存の評価時に実発火した。
2. 登録済みNode実体が持つ同codeは、relative module指定子を非階層baseから解決できない場合の識別子である。
3. 固定TSXが生成した現行productionのcache実体はCommonJS wrapperであり、relative dynamic importとTSXのnamespace wrapperを保持している。
4. 同じ依存fileは物理`.mjs` importerからの単独importでは成功済みである。
5. 失敗は3 case固有の意味package、描画、出力root取得より前に起きている。

### 5.2 帰属

| 分類 | 判定 | 根拠 |
|---|---|---|
| production実装 | 技術的な停止箇所 | F productionのruntime依存loaderが、固定TSX実行文脈でrelative importを評価できない。 |
| fixture・検査設営 | 否定 | 正式command byte一致、runtime・filesystem preflight合格、3検査共通の依存初期化で停止した。 |
| 契約 | 修正判断の帰属 | v013/v014はrelative literal、固定19件、loader順と構造を固定している。指定子形式またはloader構造を変える修正は契約固定事項へ触れる。 |

三分法の結論は「技術原因はproductionの依存load方式、修正権限は契約判断」である。実行環境の単なる起動設営不備としては扱わない。

### 5.3 未確認

- 非階層baseを作った固定TSX内部の具体的なURL文字列は、生messageを保存しない規律により未保存である。
- relative importを絶対file URLへ変える、物理`.mjs`へloaderを分離する、静的importへ戻す、のいずれを採るかは未決定である。
- 上記いずれもimport機構を変えるため、今回の承認範囲では試作・比較実行していない。

## 6. 停止後の未実施工程

- production/testの修正: 0件
- 新attempt: 0件
- U局所: 未実施
- 正式46件: 未実施
- 直接影響回帰: 未実施
- green 287/287: 未実施
- baseline 86/203 exact: 未実施
- 既存5 tree・A-v002記録対象tree照合: 未実施
- API通信、countTokens、generateContent、費用支出: 0件
- 正式描画、stable tag: 0件

## 7. 次に必要な判断

F productionの依存load方式を、固定TSX CLIで解決可能な形へ改訂する契約工事が必要である。少なくとも次のいずれかが契約差分になるため、本attempt内では選択しない。

1. 検証済みworkspace pathから絶対file URLを作り、relative literal指定子を置換する。
2. 依存loadを物理`.mjs`入口へ分離する。
3. runtime依存を静的importへ戻し、初期化順と観測位置を再固定する。

## 8. 証拠

- 正式command照合: `presentation-zevo-caption-quality-v002-v014-formal-command-preflight-20260814-v001.json`
- 環境preflight: `presentation-zevo-caption-quality-v002-v014-f-u-environment-preflight-20260814-v007.json`
- 起動checklist: `presentation-zevo-caption-quality-v002-v014-f-formal-launch-checklist-20260814-v001.json`
- TAP全文: `test-runs/20260814-zevo-caption-quality-v002-v014-f-formal-attempt-0007/tap.log`
- stderr: `test-runs/20260814-zevo-caption-quality-v002-v014-f-formal-attempt-0007/stderr.log`
- 終了code: `test-runs/20260814-zevo-caption-quality-v002-v014-f-formal-attempt-0007/exit-code.txt`

