# 字幕局所補修 共通経路・同等性実証レポート v001

対象指示: ZEV進行管理２ 指示-016（kawafmm承認済み）
比較元: `a8e78bef7343e5c4024f6851a7f2a30dd772c2fc` / main
目的: 人間のframe観測または明示的な字幕除外を、検証・採用・正式字幕入力再構築・既存描画・局所確認へつなぐ往復を共通化する。

字幕同期を自動推定する工事ではない。既存の人間観測を再生した同等性実証であり、新しい人間判断・既存完成動画の品質再評価を行っていない。

## 1. 今回の到達点

共通schema、共通validator、明示的な採用処理、一つのUI、および既存共通製造/Core/renderer/QCへの接続を実装した。ダイジェストと遠方接続の違いは、過去の観測記録を今回の共通操作へ読み替えるfixture読込部分に閉じている。共通validator・採用・再生成には案件名による分岐を置いていない。

開始だけ変更、終了だけ変更、開始と終了の両方を変更、字幕を除外する操作を扱う。字幕除外は理由と確認済み本文を持つ独立した操作であり、長さ0の字幕へ変換しない。

両系統のfixtureから、既存最終字幕入力と同じ本文・本文ID・開始終了frame・cue末尾本文ID・改行末尾本文IDを再構築できた。新しい観測用途、採用記録、artifact ID、参照SHAは新しい来歴として保存するため、正式artifact全体のbyteが同一だとは呼ばない。

両系統とも既存rendererの描画後QCへ合格し、完成動画SHAまで既存完成版と一致した。旧完成動画・人間評価・正式記録・既存実装・別作業の変更を含む5,411ファイルを最終照合し、変更・欠落0件を確認した。

## 2. 人間の操作と権限の分離

1. ホストが、読み込む完成動画・基礎映像・正式字幕入力と、変更を許可する字幕・操作・確認範囲を指定する。
2. 人間が完成動画を再生・停止し、表示されたframeを開始または終了に指定する。絶対msの入力欄はない。開始・終了の片方を維持することもできる。
3. 除外時は対象本文を明示し、除外理由と本文確認を保存する。動画と音声は保持する旨を画面へ表示する。
4. 保存は観測の保存だけを行う。確認ボタンで共通validatorを通し、実際に反映する変更を本文とframeで表示する。
5. 「この変更を承認して再生成」の操作が、検証済み観測に一致する採用を作る。その採用から正式字幕入力を再構築する。
6. 既存の共通製造からCore、既存renderer、既存QCへ渡す。完了後は同じ対象箇所の補修前後を短時間再生する。

観測、検証、採用、正式再構築は別々の処理である。検証済み・採用済みの資格はサーバー内の発行済み証票に結び、観測JSONだけを渡して正式値へ昇格させることはできない。採用は観測内容のSHA、元入力、利用目的まで一致する明示的な承認に限定する。

保存した観測は追記ファイルに残し、同一サーバーの再読込で内容を照合する。ページ再読込を含む保存・再読込を確認済み。完成後に指定を保存し直した場合は、前回動画を新しい指定の結果と取り違えないよう完了表示・補修後プレビュー・前回承認を解除する。保存だけで再描画せず、再度の確認と承認を必要とする。サーバーを再起動した後に古い観測を新しい人間観測として取り込む仕組みは設けていない。

## 3. 観測を何へ束縛するか

各観測に、対象字幕instruction ID、本文と本文ID、完成動画SHA、基礎映像SHA、audio packet SHA、元正式字幕入力SHAを持たせる。frame観測にはさらに、実際に表示されたvideo frame、選択した境界frame、完成側audio sample、元素材側audio sample、元素材側video frameを持たせる。

ブラウザは動画のframe表示完了通知を受けてから指定できる。サーバーで発行した観測を保存し、後から値や対象を差し替えたものを拒否する。完成動画末尾は、最終表示frameを観測したうえで「最終コマの直後」を終了境界として指定できる。

frameとaudio sampleの対応は既存Coreの30fpsと既存音声sample rate、および既存採用timelineから求める。開始終了を既存Coreの入力へ渡すときも、同じframeに戻ることを検証する。聴覚的な同期を推定する係数や重みは使っていない。

## 4. 共通validatorと対象外不変検査

次を拒否する。

- 完成動画、基礎映像、音声packet、元正式入力、対象字幕ID、本文IDの不一致。
- 発行されていないframe観測、観測後に変更されたaudio sample・元素材frame、別セッションの観測。
- 負数・非整数・範囲外frame、開始が終了以上の区間、他字幕との重なり。
- 許可していない境界の変更、許可していない字幕除外、同一字幕への重複操作。
- 境界変更と除外の混在した形、除外本文の未確認、理由の欠落。
- fixtureを人間観測へ用途変更する入力、固定した過去証拠の差し替え。
- 観測だけからの実行、検証を経ていない採用、不一致の承認、承認後の保存内容差し替え。
- 対象外字幕の本文・表示frame・改行位置の変更、採用した映像区間・音声・renderer/style/QCの変更。
- 再構築後の入力や保存先の差し替え、既存出力先の上書き、symlinkによる入出力参照のすり替え。

共通validatorは、どの字幕を問題とみなすか、候補を採用するか、遠方接続pairを選ぶかという案件固有の意味判断を行わない。許可対象は呼出側から渡し、その範囲内だけ検証する。

## 5. 既存人間観測の再構築

fixtureの入口は `evals/clip_composition/fixtures/caption-local-repair-v001.json`。そのファイル自体のSHAを読込処理で固定し、参照する既存観測・旧正式入力・既存最終入力もbyte照合する。

| 系統 | 共通経路で再現した操作 | 最終字幕数 | 対象外字幕 |
| --- | --- | ---: | --- |
| ダイジェスト | 「え?いるんでしょ?」を除外。「なんかグロいやつに捕まってる」の開始を1723frameへ変更し終了1794を維持。「どこ?」の開始2673を維持し終了を2708frameへ変更 | 32 | 30件不変 |
| 遠方接続 | 「マジ今んところ今年一怖すぎて笑った」の開始1255を維持し終了1338。「ビデオ見る気?」を1505〜1565。「もう勘弁してよ夜中になんか映るようなやつ」を1576〜1671 | 4 | 1件不変 |

ダイジェストの除外理由は既存人間評価の「え?いるんでしょ?は発話がない」を使用した。今回Codexが発話の有無を判定した記録ではない。

fixture再構築は `fixture-replay`、同じ記録を使った画面操作検証は `ui-verification` として保存する。いずれも新しい人間判断ではない。通常の人間用入口にはfixtureをseedできず、用途はブラウザから変更できない。

既存旧処理と記録は完成状態の再現資料として保持した。旧形式の読替えを共通実行経路へ後方互換として追加していない。今回の操作入口は共通UI/共通関数である。

## 6. 検証と再生成

共通テストは47件合格、失敗0件。schema、3種の境界変更、独立した除外、両fixtureの最終字幕入力一致、対象外不変、上記拒否条件、HTTPでの保存・再読込・検証・明示承認・同一承認の重複実行防止を検証した。HTTP単体検査の描画呼出しは検査用代替を使い、実際の描画とQCは別途両系統で各1回だけ行った。

共有packageの型検査とUI JavaScript構文検査も合格した。追加で試した既存Coreを含む全参照先の一括TypeScript検査は、既存4ファイルの100診断により不合格だった。今回追加した4つの実行・検査対象入口についての診断は0件。この補助検査を全体合格とは報告しない。既存Coreの型問題を今回の工事へ混ぜて変更していない。全診断は `existing-core-typecheck-diagnostic-v001.log` に保存する。

実行コマンド（workspace rootで実行）:

```sh
node --import ./runner/node_modules/tsx/dist/loader.mjs --test evals/clip_composition/caption_local_repair_common_v001.test.mts
pnpm --filter @zev2/shared type-check
node --check evals/clip_composition/caption_local_repair_ui_v001.mjs
node --import ./runner/node_modules/tsx/dist/loader.mjs evals/clip_composition/replay_caption_local_repair_v001.mts
node --import ./runner/node_modules/tsx/dist/loader.mjs evals/clip_composition/caption_local_repair_ui_v001.mts --fixtures --output evals/clip_composition/outputs/presentation/work-caption-local-repair-common-20260908-v001/ui-equivalence-v001
```

fixture再構築のコマンドは描画しない。実際の描画は共通UIで検証内容を確認し、両系統それぞれ1回の承認操作で実行した。既存QC自身が行う字幕省略比較用の内部参照描画は、既存QCの必要工程として完遂する。完成動画一致のためだけの再試行・追加描画は行わない。

通常の人間用画面は、同じUI起動処理へ `--source <承認済みの入力参照JSON> --output <未使用の出力root>` を渡す。入力参照JSONは共通schemaに従い、既存正式入力の参照とSHA、完成動画と基礎映像、音声packet、許可する字幕・操作・確認範囲を指定する。案件別の画面生成は不要である。今回の実証では、この人間用入口で新たな人間観測を収集していない。

UIでは本文、現在frame、開始/終了の指定・維持、除外理由と本文確認、保存・再読込、変更確認と承認、再生成状況、補修前後の短時間再生を確認した。遠方接続の補修前後は確認開始921frameから再生し、どちらも最終表示1670frame相当の55.666666秒で停止した。これは操作と再生範囲の確認であり、映像内容の品質評価ではない。

開発中に検出した入力組立の余分な項目、非同期シーク中のスライダー表示、保存と対象切替の競合を修正した。検査設営のHTTP権限不足とPython一時照合コマンドの不適合も、正式成果物を変更する前に検出して訂正した。詳細を `verification-notes-v001.json` に記録する。

## 7. 実装ファイルと責務

| ファイル | 処理の役割 |
| --- | --- |
| `packages/shared/src/caption-local-repair-v001.ts` | 元入力、対象字幕、frame観測、境界変更・除外、保存観測、明示承認の共通型 |
| `packages/shared/src/index.ts` | 共通型を共有packageから公開 |
| `evals/clip_composition/caption_local_repair_common_v001.mts` | 入力照合、観測発行、検証、採用、正式入力再構築、対象外不変、既存描画への接続 |
| `evals/clip_composition/caption_local_repair_ui_v001.mts` | 一つの画面生成、保存・再読込・検証・承認・描画・局所確認のHTTP入口 |
| `evals/clip_composition/caption_local_repair_ui_v001.mjs` | frame表示を確認して指定する操作と対象本文を示す補修前後の確認 |
| `evals/clip_composition/replay_caption_local_repair_v001.mts` | 固定済み人間観測のfixture再生と既存最終字幕入力との照合 |
| `evals/clip_composition/fixtures/caption-local-repair-v001.json` | 2系統の過去資料をSHAで固定 |
| `evals/clip_composition/caption_local_repair_common_v001.test.mts` | 共通操作の正例・拒否・HTTP接続・同等性の検査 |

実際の組立は既存 `adopted_media_manufacturing_v001.mts` を呼ぶ。今回その実装、Core、renderer、style、QCは変更していない。新しい意味判断Skill、registry、sensor一般化を設けていない。

## 8. 適用範囲と保持事項

既存Coreの30fps、一案件内の採用済み字幕track、対象字幕が一つの採用済み映像区間に属する条件を使用する。字幕をすべて除外して空trackにする操作は既存Coreの対象外として拒否する。これらを別方式へ拡張する工事は行っていない。

新素材、Whisper/Gemini実験、candidate探索、遠方接続pair判断、自由Planner、Goal、architecture、旧ダイジェストplanのSHA問題へ変更なし。追加有償API通信0回、API費用US$0。tag、stable昇格、release、正式旧成果物の削除・上書きを行っていない。

着工前に既存完成状態と別作業の変更をSHA・サイズで記録し、完了時にも5,411ファイルを実物から再照合して不変を確認した。監査checkpointでは今回の変更だけを固定する。commit自体を正式採用や新しい人間品質承認とは扱わない。

## 9. 証拠の所在と最終照合

今回の出力rootは `evals/clip_composition/outputs/presentation/work-caption-local-repair-common-20260908-v001/`。

- `digest-v001/` と `distant-v001/`: fixtureから再構築した正式字幕入力、対象外不変、既存最終入力との同等性証拠。
- `ui-equivalence-v001/`: 同じ共通UIで保存した操作記録と、それぞれ一回だけ承認した実描画結果。
- `common-tests-v001.tap`: 最終47件の検査結果。
- `preservation-verification-v001.json`: 着工前ファイルのSHA・サイズと完了時の再照合。
- `verification-notes-v001.json`: 型検査、構文検査、開発中の訂正と実行範囲。
- `implementation-inventory-v001.json`: 実装8ファイルのSHA・サイズ。実装本文は監査checkpointのGitHub差分から参照する。
- `MANIFEST.json`: 本工事の固定ファイル一覧、SHA、実装・証拠の対応。

実装8ファイルの全文をまとめたJSONのDrive送信は、自動承認レビューが「ソースコード外部共有の具体的承認がない」として送信前に拒否したため中止した。代替の送信や再試行はしていない。実装本文は明示承認済みのGitHub commit/pushで監査へ提供し、Drive同期は詳細レポート・検証結果・MANIFESTに限定する。経緯は `drive-sync-scope-v001.json` に記録する。

| 最終照合 | ダイジェスト | 遠方接続 |
| --- | --- | --- |
| 正式字幕入力 | 32字幕、一致 | 4字幕、一致 |
| 描画後QC | 合格、違反0 | 合格、違反0 |
| 完成動画frame数 | 4,831、不変 | 1,671、不変 |
| 音声packet | SHA一致 | SHA一致 |
| 完成動画byte数 | 75,458,918 | 35,674,817 |
| 完成動画SHA | `044bc61a6cd0034cc01d277f31e57c6a831e508ac179966cae29b3f3bb763a8c` | `87ad00ae273471487cc6b90ef936dac0fa0f82072d5a74da8d03b328b03faabb` |
| 既存完成版との動画SHA一致 | 一致 | 一致 |

最終照合の実行は `verify-equivalence-v001.mts`、実測結果は `final-equivalence-verification-v001.json`。この照合は描画せず、既存fixtureの再読込、新しい正式入力、実描画のQCと動画byte、旧5,411ファイルを再確認する。確認済み動画をもう一度生成する工程はない。

今回の一時描画作業ファイルは、遠方接続200件・ダイジェスト1,324件について元path・サイズ・SHAを記録し、処理終了情報は本文も一つの証拠JSONへ保存したうえで整理した。正式入力、完全なQC測定結果、生成済み動画、公開済み字幕画像は保持している。旧工事のファイルと退避folderには触れていない。

監査同期先は既存の「ZEV進行管理２」用Drive folder。commit SHAとDrive上の各資料URLは、自己参照を避けた外部Drive同期MANIFESTで固定する。本レポート・検証結果・repositoryのMANIFESTは、Drive再取得byteとcommit内byteの一致を確認してから監査へ提出する。
