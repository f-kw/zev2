# Digest一件後修正 E2E — 技術第一完成報告

2026-09-17。**実CLIで一件を通常表示へ変更し、通常製造入口で完成動画まで反映した。Reset後は同じ入口で元の161秒自動演出MP4を全バイト復元した。両版のA+B、最終QC、保存物の再読、原資料保全は合格。相談役による最終監査前の技術第一完成として報告する。**

branch: `codex/digest-one-edit-e2e`。基点は `9d9e48b75a8c683d4103e0ed9edfb3744f89c708`。今回の本番source変更は0件で、既存CLI・修正保存・描画・品質検査の接続を実証した。監査用checkpointの差分は、この報告書と先行する受入判断報告書の2文書である。

## 目的

保存済み自動案から、指定した字幕一件だけを後修正し、保存・再読・通常の製造ジョブ・完成動画まで反映できることを確認する。Resetは保存した修正を削除し、AIへ判断をやり直させず、元の自動演出動画を完全に復元することを要求する。

今回の対象は既存161秒Digestの32字幕。字幕本文や動画構成を編集する工事ではない。対象選定は動作確認のためであり、演出の良し悪しを選んだ人間評価ではない。

## 対象と期待する往復

| 項目 | 内容 |
|---|---|
| 対象字幕 | 「この覗き方やめろ!」 |
| 位置 | 9.4秒以上・11.333333333333334秒未満、282〜339フレーム |
| 元の表示 | 保存済み自動案の全文Color Accent |
| 一件修正 | 実CLIでNormalを保存。対象一件だけ通常表示へ戻す |
| Reset | その保存済みNormal修正を実CLIへ渡して削除。上書き0件に戻す |
| 復元条件 | 元の32字幕の実行計画と完全一致し、完成MP4の全バイトも一致 |

対象の内部識別子は `digest-human-caption-repair-20260907-v001-instruction-instruction-000007`。元自動案のColor対象の先頭一件を開発検体として選んだ。

元の完成MP4は75,278,536バイト、SHA-256 `bfaf7083d229c8649bac9eba1734074a4ef24e5881c50bf514d5d2527161419c`。

保存済み固定自動案は41,467バイト、SHA-256 `9c6ec97276ca96ce83e660bf05bc9ddeb06b30fdb3dd70226140d4e63a7fa99a`。両CLI、両全編処理、終了時の再読で同じ値を確認した。AI再判断・自動案再生成は0回。

## 実行経路

通常計画・判断入力・固定自動案を既存保存ファイルから読み込む。実CLIの変更前表示、Normal保存、別プロセスでの再読表示を行い、保存ファイルを通常の製造ジョブ入口へ渡す。通常入口はジョブ・信頼台帳・書体・実装・媒体を実ファイルから検査し、行配置と自動演出解決、全編描画、A+B、最終QC、作業内の出力確定を行う。

Resetにも同じ通常入口を使う。共通描画処理を直接呼ぶ小型fixtureとは区別する。通常入口の能力差し替え・本番実装の置換は0件である。

## 通常入口へ渡す開発用の信頼入力

判断依頼をcheckpoint `4d95d371ddd4e2f6c896e85ae5c7fb3a5af85329` へ固定し、同じ相談役のGPT_DECISIONで限定案を許可された。非正本の複製は今回のNormalとResetの2ジョブだけに使い、別ジョブへ再利用しない。

複製では、描画依存8件のうちPhase 2技術受理checkpoint `537567d57744e1115a3938e651ad8f86c1c12161` と同じ実装4件のSHAだけを更新した。元と複製の全差分がその4項目だけであることを照合済み。スキーマ、版名、依存パスと順序、書体、規則、プレビュー来歴、他の全項目は保持した。

これは通常入口が読む信頼入力であり、単なる観測ログとは扱わない。正式台帳は全バイト不変。正式な描画版の昇格や、Panel/Pulseの人間採用を意味しない。別sidecarに対象2ジョブ・4件の旧新SHA・来歴・用途制限を明記した。

複製SHA-256: `1f6e67b7189f52cdd47d0abdebbba9e7ad48abdacb7cb1991d8ee5b23229e8c3`。

## 全編実走結果

Normal版は通常の製造入口から4,831フレーム・32字幕を通し、A+Bと最終QCに合格した。所要時間は製造入口の呼出しから正常返却まで1,646.597486秒。直接観測した子プロセス487件は全件終了0・signalなし。内部の子孫プロセスを含む全OSプロセス数ではない。

| 全編の状態 | MP4バイト数 | SHA-256 | 結果 |
|---|---:|---|---|
| 元の自動演出 | 75,278,536 | `bfaf7083d229c8649bac9eba1734074a4ef24e5881c50bf514d5d2527161419c` | 不変の比較元 |
| 一件をNormalへ修正 | 75,270,765 | `4fc0149ccdde93cd94256f5a88a5e1c249f58e9aa1b4c92c9163d78fa1bd6cdb` | 通常入口・A+B・最終QC・現物照合が合格 |
| Reset | 75,278,536 | `bfaf7083d229c8649bac9eba1734074a4ef24e5881c50bf514d5d2527161419c` | 通常入口・A+B・最終QC・元MP4全バイト復元が合格 |

Normal完成後の独立した観測では、元の自動計画から対象一件の色指定だけを除いた計画と全文一致した。他31字幕の選択全体は一致し、対応する33枚の描画状態PNGも実バイトが一致した。全34枚のうち異なったPNGは対象の1枚だけ。Pulseの状態構成と時刻も保持された。

完成動画を実際に復号して4,831フレームを確認し、元とNormalのAAC全6,937パケットの内容、順序、整数の表示時刻・復号時刻・長さ等が完全一致した。311フレームの対象字幕の矩形内では、異なる画素が103,968、RGB各成分の絶対差の合計が7,671,029だった。判定は整数差が0より大きいことで、許容率や新しい係数を用いていない。

NormalのA再合成MP4と完成MP4は実全バイト一致。保存後の別プロセスでも同じ2本を直接比較した。Aの入力60参照・生成8件、Bの入力100参照・生成2,450件を含む2,566の固有パスを読み直し、34観測・32字幕の保存証拠を確認した。Bの保存RGBの再判定は本体と同じ分類処理を使うため、別算術実装による検算とは数えない。

通常の出力確定では検査済みディレクトリが移動する。保存証拠は検査時のパスを保持し、証拠の書換えや新しい現在参照への差替えは行っていない。別の読取記録に旧所在と確定先の対応を残し、移動した動画1本・PNG34枚の実SHAと、移動されない検査用ファイルを照合した。これは今回の保存物を読む技術検査であり、新しい製品用の移設履歴処理を追加したものではない。

実CLI Resetは、上記のNormal保存ファイルを入力して新しい修正文書へ保存した。別プロセスで再読後の修正は0件、実行計画は元の自動演出計画と全体一致。実際の変更前表示は「Normal／Normal fixed／overrideあり」、変更後は「Color Accent／auto／overrideなし」となった。前表示はNormal保存後の表示と、後表示は元の自動表示と、それぞれ実stdoutの全バイトが一致した。

Resetの集計記録にある変更前の欄は元自動案の参照表示なので、Reset直前状態の証拠には使用していない。実コマンドの引数と実stdoutから前後を検証した別記録を正とする。

Reset版も通常入口から4,831フレーム・32字幕を通し、A+Bと最終QCに合格した。所要時間は1,668.330503秒。直接観測した子プロセス491件は全件終了0・signalなし。独立した読み直しでも完成MP4は元自動版と全75,278,536バイト一致し、全34枚の描画状態PNGも実バイト一致した。元自動版の実行計画、本文・改行・時刻・素材対応、Pulse構成と時刻を保持した。

Resetの保存検査証拠も別プロセスで再読した。Aの完成／再合成MP4は実全バイト一致、Bは32字幕・34観測が合格。A入力60参照・生成8件、B入力100参照・生成2,450件を含む2,567固有パスを確認した。検査時の証拠は変更せず、移動した35ファイルだけ別の所在対応で実物へ結んだ。全バイト復元によって格納された映像・音声の復元も確認できたため、Reset後に追加の媒体復号は行っていない。

## 原資料と変更範囲の検証

作業前に137ファイルの実サイズ・SHAを記録し、追加の意味対応検証では69文書・66参照を束縛した。候補3件の元判断と発話対応、保持7区間と組立順、全32字幕の本文・改行・表示フレームと415発話片の対応を、既存JSONをたどって独立に照合した。

Normal後とReset後に同じ原資料を再読し、開始前に記録した実サイズ・SHAと一致することを確認した。137件と69文書は重複があるため合算しない。動画・音声・描画画像の物理検査は別の記録で扱い、保存された古いハッシュを新しい実測として数えない。

Normal版は、対象字幕の代表311フレームの実画素が変わったこと、他31字幕の選択と対応する描画画像が変わらないことを検査した。圧縮MP4のバイト差や画素差が対象時間だけに閉じるとは主張しない。

終了時には、準備時の87参照宣言と追加4参照宣言をまとめた51固有ファイルも再読した。正式台帳、限定複製、用途sidecar、2ジョブを含む全サイズ・SHAが一致し、複製との差分は許可された4 SHAだけだった。元と実行ツリーの正式台帳は実バイト一致し、複製の版名・用途制限も保持した。この照合は保存済みJSON束縛の一致を扱い、canonical JSON hashの独立再計算を主張しない。

既存8作業ツリーのHEAD・branch・作業状態・未stage差分・stage差分を同じ40コマンドで再取得し、開始前と実stdoutの全バイト一致を確認した。元からある変更をcleanとは扱わず、remote/shared refs、ignore対象、未追跡ファイルの内容まで保全したという主張には広げない。

## 小型fixture

短い154フレーム・2字幕の検体で、実CLI保存・別プロセス再読・本体共通描画・A+B・最終QCを9状態すべて通した。変更しない字幕を1件残し、対象は「もうリカちゃんやめてー!」とした。

| 順序 | 描画した状態 |
|---|---|
| 1 | 固定自動案の部分Color「リカちゃん」 |
| 2 | Normal |
| 3 | 全文Color |
| 4 | Scale |
| 5 | Panel（仮称） |
| 6 | Pulse（仮称） |
| 7 | 部分Color「やめてー」 |
| 8 | Normalへ再設定 |
| 9 | Resetで元の部分Colorへ復帰 |

実CLIは保存8回・別再読9回の17プロセス。直接観測した子プロセス391件は全件終了0・signalなし。初期状態には保存操作がないため、9状態を9編集とは数えない。Pulseは既存の音声ピークを使い、時刻原点を変えず直前113・最大118・復帰124フレームを観測した。

9件の完成MP4は各A再合成と実全バイト一致。Bの合計20観測と最終QCがすべて合格した。別プロセスで保存物のSHA・A+Bの結合証拠・20観測を再確認したが、RGBの判定は本体と同じ分類処理を用いた。独立した算術実装の検算ではない。

ResetのMP4と初期自動状態は全4,095,345バイト一致し、SHA-256は `f18000493dd6acf4411ffd7f615567e33f22afda8064fa5aa12137b039d3a75f`。両字幕PNGの復元、他字幕PNGの8段階での不変、2回のNormal間のMP4・対象PNGの一致を含む13回の実バイト比較（実ファイル対12種類）も一致した。静的な対象PNG6種類の全15組は互いに異なった。

この小型検体の固定自動案は決定的な試験入力で、新しいAI判断ではない。本編通常ジョブのファイル入口より後にある共通描画処理から検証した範囲であり、通常入口の受入・161秒全編の成功を代替しない。実DigestのScale使用数は0のままで、Scale切替の実証はこの小型検体による。検体の入力等46束縛は、検体終了時と別読取検証終了時の不変確認に合格した。

## 検査設営の訂正記録

- 小型fixture初回は、許可された作業ツリー内の出力先に配置していなかったため、出力予約時に停止した。実描画前の失敗記録を保持し、出力先だけ訂正した新版で実行した。
- 通常ジョブ準備初回は、厳密な読込が要求する整形JSONではなく縮約JSONを渡したため、ジョブファイル保存前に拒否された。公式の直列化処理でバイトを作る新版へ訂正した。信頼入力の内容を変更して救済していない。
- 原資料対応検査初回は、基礎媒体検証記録の出力3参照と、それに検証記録自身を加えたジョブの4参照を全量比較していた。失敗記録を保持し、共通3参照と検証記録自身の参照を別々に照合する新版へ訂正した。
- 既存作業ツリーの状態保存の準備では、過去記録の構造を誤認した読込失敗を保存した。実際の記録構造へ合わせ、作業前の8ツリー・40観測を取得した。

これらを本番の成功や正式実行回数へ繰り入れない。

## 制約と残課題

技術的な一件後修正と復元の検証に限る。GUI、自然言語による自由編集、新演出、stacking、任意の動画・任意の版での復元保証は追加しない。Panel/Pulseの見心地と正式採用は人間未判定のまま。Color/Scaleの既存人間採用と混同しない。

有料API、新素材取得、素材の外部送信、新依存の導入は0。AI再判断・自動案再生成は0。Digest正本、契約、Goal、work-order、main、tag、stable、releaseを変更しない。

## 実行した検証コマンド

起動は既存の固定Node 20.19.6と作業ツリー内の既存TSXを使用した。新しい依存の取得はない。次のパスを起点とし、各結果は未使用の別ディレクトリへ保存した。

```sh
TASK=/private/tmp/zev-one-edit-e2e-cqdrbc6a
TREE="$TASK/worktree"
NODE=/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node
"$NODE" "$TASK/run-real-cli-v001.mjs" normal
"$NODE" "$TREE/runner/node_modules/tsx/dist/cli.mjs" "$TASK/execute-full-job-v001.mts" normal evals/clip_composition/outputs/presentation/digest-one-edit-e2e-20260917/normal-v002/digest-one-edit-e2e-20260917-normal-v002.json "$TASK/full-job-normal-v001"
python3 "$TASK/verify-one-edit-physical-v001.py" --phase normal --run-media --output-directory "$TASK/physical-normal-v001"
"$NODE" "$TASK/verify-one-edit-published-proof-v001.mjs" normal "$TASK/one-edit-normal-published-proof-v001.json"
python3 "$TASK/verify-one-edit-source-closure-v002.py" --report "$TASK/one-edit-source-closure-after-normal-v001.json"
"$NODE" "$TASK/run-real-cli-v001.mjs" reset
"$NODE" "$TREE/runner/node_modules/tsx/dist/cli.mjs" "$TASK/execute-full-job-v001.mts" reset evals/clip_composition/outputs/presentation/digest-one-edit-e2e-20260917/reset-v002/digest-one-edit-e2e-20260917-reset-v002.json "$TASK/full-job-reset-v001"
```

Reset全編完了後には次を実行し、すべて終了0・合格した。

```sh
python3 "$TASK/verify-one-edit-physical-v001.py" --phase reset --output-directory "$TASK/physical-reset-v001"
"$NODE" "$TASK/verify-one-edit-published-proof-v001.mjs" reset "$TASK/one-edit-reset-published-proof-v001.json"
python3 "$TASK/verify-one-edit-source-closure-v002.py" --report "$TASK/one-edit-source-closure-after-reset-v001.json"
python3 "$TASK/verify-execution-inputs-after-v001.py" --output-name execution-inputs-after-v001
python3 "$TASK/verify-old-tree-preservation-v001.py" --output-name preservation-after-v001
```

## 証拠とcheckpoint

以下の38ファイルを実際に読み、サイズとSHAを確定した。失敗履歴や検証スクリプトも含むため「38試験合格」という集計ではない。元動画・出力動画・大きな生測定物はローカル保持し、外部送信しない。監査用checkpointには報告文書を固定する。

ローカル証拠起点: `/private/tmp/zev-one-edit-e2e-cqdrbc6a`。以下のpathはこの起点からの相対表記で、目録JSONには絶対pathを保存した。目録: `completion-evidence-index-v001.json`。

| ID | 証拠 | path | bytes | SHA-256 |
|---|---|---|---:|---|
| E01 | 今回の工程指示 | `consultant-direction-v001.md` | 2951 | `adb3d596b62965afdaf56b7f94fc0ee6b8f268ace6e5ee958c83e87a522055d1` |
| E02 | 相談役の限定許可 | `admission-consultant-response-v001.md` | 3392 | `a8c301fdf19edb1fa632eee2d547769eeffa7e276d1b3f0e07d888f1acc9838f` |
| E03 | 通常入力の準備検査 | `normal-job-inputs-preflight-v002.json` | 40904 | `f6c3886980a525ce342dd96956291af0093e8a62352bf23484420c6a6e3ad69b` |
| E04 | Normal実CLI保存と再読 | `real-cli-normal-v001/summary.json` | 6139 | `afcfc081b647023c4d542bf5259384d3b85ad33dff8caab6da9a83bc074a411a` |
| E05 | Reset実CLI保存と再読 | `real-cli-reset-v001/summary.json` | 6249 | `b7669eecfef01eaf648765bac7c805fb8217c3bc86098738696cd68f7c005fe8` |
| E06 | Reset実表示の前後照合 | `real-cli-reset-actual-before-after-v001.json` | 3054 | `e490049f4fa823f33ecd55f6af51d74a7e261735007809ab9ab859f1a03fc2c8` |
| E07 | Normal通常ジョブ集計 | `full-job-normal-v001/summary.json` | 14198 | `8d828cf530f3cbd18f84d7fc257feef8cff847cca0b54f1296c8baded785caa5` |
| E08 | Normal通常ジョブ全結果 | `full-job-normal-v001/job-outcome.json` | 33333398 | `d0f4b2a942423967a4049c02b217102140daae865bf4e3b6a9e54cb9732eeebe` |
| E09 | Normal直接子プロセス | `full-job-normal-v001/processes.json` | 3123610 | `0b5cd4a9a585b0e0d90d686e31a49f184a4aa6e18abba6ccadb63478dc602698` |
| E10 | Normal物理検証 | `physical-normal-v001/summary.json` | 49794 | `6d8204fcfe7876552228457884adfbb76b71dbac13505d24233b5a53e87c6fb4` |
| E11 | Normal公開後の保存証拠再読 | `one-edit-normal-published-proof-v001.json` | 5958647 | `72b403ac2f4da17e0db91f6746a8118e216ec8914e567241996d39f2350f2076` |
| E12 | Reset通常ジョブ集計 | `full-job-reset-v001/summary.json` | 14152 | `f8e4dbd3e22dfa016da6f01511d00522650e9341ea1b62c76a2f4837c8756e44` |
| E13 | Reset通常ジョブ全結果 | `full-job-reset-v001/job-outcome.json` | 33311589 | `56bd781f60a6f389f792f458849a586c4e20716a3783d02816a2e00ccb7ab41e` |
| E14 | Reset直接子プロセス | `full-job-reset-v001/processes.json` | 3130615 | `3a5ff1ed2e1b3cc604d44f15dce0572d5727246104e4630dda4dc277f0a535de` |
| E15 | Reset物理検証 | `physical-reset-v001/summary.json` | 41714 | `459cd7e9153754a081e737f5a02bcc196ca9726d29e107990aaff94ff402e956` |
| E16 | Reset公開後の保存証拠再読 | `one-edit-reset-published-proof-v001.json` | 5945290 | `e449c8ca7e4dce8d82ff3f600989022431d0395c650523cc31a808d4bea4316f` |
| E17 | Normal後の原資料対応検証 | `one-edit-source-closure-after-normal-v001.json` | 69257 | `14c44d9c91ab6a48e275572266c0560a459891d11f350c3a3820beb201756d00` |
| E18 | Reset後の原資料対応検証 | `one-edit-source-closure-after-reset-v001.json` | 69257 | `07431cb49f732c899e06b3683bc8a5263c83aa53857801d29d219b0f33392fca` |
| E19 | 137ファイルの作業前保全 | `one-edit-preservation-before-v001.json` | 75775 | `9431e05b28f4d8b69ca403c44b06718225cb1a463478bd60e0b898220a2035e3` |
| E20 | 69文書の作業前対応記録 | `one-edit-source-supplement-before-v001.json` | 112848 | `6de735de3c4957f66483ba59c61b0202c0b816e3ca17573bd66281c3d0d63467` |
| E21 | 小型9状態の実走 | `role-fixture-v002/summary.json` | 6974824 | `2075f2b026200c27487a45a84764ab33d7b23898a4aa2a633443d4542d8b12a5` |
| E22 | 小型9状態の保存物再読 | `role-fixture-independent-verification-v001.json` | 18611 | `2f32c33ea017982a9cff0942a525cbeeae84d17dbb283149ef67cbfa96fafe8f` |
| E23 | 旧8ツリーの開始前観測 | `preservation-before-v002/summary.json` | 12223 | `8ceedf5eb79283b0843b6905fc5417e46679d9fd8f16576eb8bd7e954cfb203e` |
| E24 | 旧8ツリーの終了時比較 | `preservation-after-v001/summary.json` | 41081 | `d9edaad0fef43af9c4bc4981c89b5071a2e8ea11cdf8d33ebfe88da093cc1d7d` |
| E25 | 小型出力先の初回停止 | `role-fixture-v001/failure.json` | 1038 | `bd94b9648cb07c99236ff439bbd2767109913c8e6bec483b84b03639149b9265` |
| E26 | 通常入力JSONの初回停止 | `normal-job-inputs-preflight-v001.failure.json` | 1015 | `013ad1919a09d6c4278eb01d2caa66b5a8ae6a3025119562e3d91f2b0fa728af` |
| E27 | 原資料対応検査の初回停止 | `one-edit-source-closure-verification-v001.json` | 2594 | `833ec2f26e7240125ea81d58ab9111b7ce739c5d746c816a21caff428c509073` |
| E28 | 旧ツリー記録の準備失敗 | `preservation-before-v001/failure.json` | 260 | `14d0c19197612eb82d3de6bf0f278a37337a9a1202a9a152e1b34c907e8df42f` |
| E29 | 実CLI実行ハーネス | `run-real-cli-v001.mjs` | 5740 | `59233e27dc0e7ec5d5bc254cfd92db2ff8c54cc6d6847b6270133ab015365304` |
| E30 | 通常ジョブ実行ハーネス | `execute-full-job-v001.mts` | 6738 | `9cfdf0393e9e6cfeb9d4b3cc3740cf09146a528141a559c2991ea5f3c3203a9b` |
| E31 | 現物比較の検証器 | `verify-one-edit-physical-v001.py` | 18561 | `7b0848e28e0c5a17d73c069ab541ad3192e8f5ee5b0d40831c7ec933d304b856` |
| E32 | 保存証拠の検証器 | `verify-one-edit-published-proof-v001.mjs` | 18699 | `d773a6ad744c74a5362f5c67d8e605724a82e68a75b853b3b7d43a38ffb15e1e` |
| E33 | 原資料対応の検証器 | `verify-one-edit-source-closure-v002.py` | 25480 | `5b8e32d73a257bfa9328fdd44d482c9052bffb9f8eb3cf4e4f35ee76e2ec6ae4` |
| E34 | 小型fixture実行ハーネス | `role-fixture-harness-v002.mjs` | 19438 | `fcd94f2cd8ba447d381c90fa4210057f72d71bb40662cecf37acdb658a68deac` |
| E35 | 小型fixture保存証拠の検証器 | `role-fixture-independent-verification-v001.mjs` | 6662 | `cacaf35202a2771418cb49dda85eefcb4860b1650011b0a48317db50262a1774` |
| E36 | 旧ツリー比較の検証器 | `verify-old-tree-preservation-v001.py` | 11552 | `ad4298fc49604a8a3d3259ecdabf50c36d8856f30d61c9309eaeb74b961eceee` |
| E37 | 実行入力の終了後保全 | `execution-inputs-after-v001/summary.json` | 101263 | `87bcd004c42150dbdebf58a48a0c9315ea664fd3747390fa36a6f642589b15a0` |
| E38 | 実行入力の保全検証器 | `verify-execution-inputs-after-v001.py` | 21291 | `35a31d07ccfc84bd93a7e52f95a6405f029d6a59da4d728a8d3e386d77134e77` |

完成報告を同じ相談役へ送り、最終監査と次工程の指示を受ける。ここでの合格は一件後修正能力の技術検証であり、正式trust再発行や演出の人間採用を兼ねない。
