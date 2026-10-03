# 同じ一本の最終検査を、保存済みの動画と字幕から回復する案

2026-10-03 UTC。非実行の技術提案。新しい製造許可、合格receipt、実行可能permitではない。

推奨は、保存済み372枚と15分23.033秒の合成MP4を再利用し、未完了の完成字幕比較と最終確定だけを行う一計画限定の復帰入口である。再描画・全尺再合成が不可避という根拠は見つかっていない。現行の正式入口は保存済みNormal描画の回復を持たないため、そのままこの案を実行できるとはしない。

## 実物で確認したこと

V2は13:57:58〜15:01:37 UTCの1時間3分39.837秒で失敗終了したが、字幕372PNG、repeat372PNG、668行mask、全尺MP4を保存した。字幕と画像検査41分59.334秒、合成13分47.923秒。失敗箇所は全372件を検査するencoded-omission-v2の最初の比較映像生成で、合成そのものの失敗ではない。

合成MP4は598,323,447B、SHA256 `9eea47be93c94cbe7c8b307642d0eb943fc2985445e607af65ff9133ab12ac56`。現在の404原本参照、全372repeatのhash、旧7実装のGit原本、現7実装の実hash、元manifest/製造承認/保存device等値を再読照合した。全尺視聴・音声聴取・完成QCの合格はまだない。

後続V3は15:50:14.212〜15:51:51.304 UTC、97.092秒で配置検査の起動エラーにより終了。19拒否検査と実資格は開始前にpassed、CLEAN問題は解消した。今回のPNG/合成/最終QCは0。144byteのIPC名がこのMacの104byte socket領域で切り詰められ、以前の残存socketと同じ名前になることを実path/sourceから確認した。

同じSSD専用tempを保った小probeでは、cwdを今回root、TMPDIRを相対名tempにすると29byte socketの作成・実device確認・own socket整理が成功した。既存layout-input372件を既存tsx/layout CLIで実検査し、約0.263秒/exit0/配置passed。新画像・動画0。これは正式完成QCの合格ではない。

## 現行の再開入口では受け入れられない境界

既存 `readPresentationBeforeNativeCheckpointV001` は、orchestrationとcombined QCの「body-and-exact-replay-verified」checkpoint、合格済みexact replay、同じdrawing viewを必須とする。今回はNormal/encoded-omission-v2であり、そのcheckpointも合格replayもない。このreaderへ形を偽装して通すことはできない。

`finishPresentationDrawAndQcV001` はprivateで、旧V2はfull finish stateを保存していない。失敗contextには全372 element/props/PNG hash/alphaBoundsがあるが、alphaMax、行矩形、行alpha、media/audioの測定値を省いている。保存画像・mask・layoutと既存inspectorで取り直せる情報であり、欠落をpassed値で埋めない。

正本DECISIONは「合成直前の接続とcaller伝達に限定し、executeDraw全体の差替えやrenderer/QCの作り直しは採らない」としている。下記はQC内容の変更ではないが、保存済みNormal描画状態を正式に再開できる入口を追加するため、その限定的な契約境界について相談役判断を要する。ファイル数を本人の上限とは扱わず、同じ製造許可を本人へ再要求する提案ではない。

## 推奨する具体差分（実装未適用）

| 実装path | 一計画限定の変更 |
| --- | --- |
| runner/src/digest-formal-handoff-v001.ts | 固定V2失敗/全実hash/旧新code/元grant・manifest/旧owner終了を検証する回復descriptorをopaque context内だけに追加。used V3を保持し、同じ承認済みattempt-001内の固定fresh v004へ資格化。変更4pathを個別に束縛し残3path不変を検査。新grant/任意root/callback/trustは受け付けない。 |
| evals/clip_composition/adopted_media_manufacturing_v001.mts | 同じopaque qualificationの固定childだけをv004へ更新。既存assemble→render→正式receipt・結果評価は維持し、旧動画の製造SHAと今回の検査SHAを別に記録する。 |
| evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts | 現行のsource/font/runtime/code/媒体admissionとline-layoutをfresh current-codeで実施。common plan/propsが旧372 recordsに完全一致する場合だけ、一計画限定回復wrapperへ渡す。任意capabilities/別style/auto/effectsは不許可。 |
| evals/clip_composition/render_presentation_v002.mjs | opaque資格が必須の限定wrapperを追加し、保存PNG/repeat/668mask/layoutから既存inspector・determinism・layout preflightを再実施。新owned stagingに同じbytesの372PNG/MP4だけをコピーしhash再読。既存private finish→全372 encoded-omission-v2→既存final QC→既存atomic publisherへ接続する。finish自体を一般公開しない。 |

比較QCの入力は保存V2の検証済み原本MP4/PNGとし、旧実pathを保持する。fresh stagingはbit-exactコピーだけに使う。既存QCはabsolute staging pathsを保存後に書き換えないため、新stagingをQC入力にするとatomic rename後にそのpathが消える。373件の旧QC入力path/hash→新確定相対path/hashの対応を回復receiptへ保存し、finish前後・commit直前の原本とコピーの全hash・topologyを照合する。旧証拠のpathを編集して成功に見せない。この成果のbyte対応も限定復帰契約の判断対象である。

旧V2のstaging/lock/work、失敗入力・ログ・元PNG/mask/repeat/元動画はKEEP。新stagingは約598MBの動画と字幕コピーに加え、比較検査のscratchが必要。実必要容量を次unit+reserveへ渡し、guest/host/internalを別計測する。50GB開始/12GB reserve/16GiB RSS/pressure1/1秒観測/今回PGIDだけ停止・残存確認は維持。新root作成や保存操作は、この案の適用判断とコード束縛の後で行う。

serialise制御trueは既存PNG decoder/filterの並列抑制のみで、旧動画を新設定で作ったと偽らない。全372件・371枚残す比較入力・全27,691frame/40,705,770sample/元9区間と時計、QC method/閾値、font、216px/左右108px/A8glow4/Normalを維持する。native/短区間/別計画/自動fallback/検査省略は作らない。

実装後に、資格偽装・clone・別root/plan・旧file改変・欠落mask・props/時計不一致・current code不一致・旧owner生存・未使用rootでない場合を拒否確認し、必要typecheck/既存QC testsを行う。最初の比較sampleで全域欠陥や環境失敗が出たら重い後続を止める。372件すべての成功と原子的確定が確認されるまでは完成と書かない。比較だけの成功所要時間は未計測で、55分47秒程度の字幕/合成再処理を省ける可能性とは分けて報告する。

## 次の担当

状態：相談役待ち。次担当：親のmona/相談役。この特定の保存済みNormal状態の復帰入口を、元承認済み一本の限定回復として実装してよいか判断する。再描画を当然の前提として再開しない。品質本採用/縁選択/公開/旧削除/新API・素材・費用の判断は含めない。GitHub push保留も維持する。

Socket修正だけで全入口を再実行する場合は、callerのqualified layout child限定でcwd=fixed generatedRoot/TMPDIR=tempを実装し、adapter exact diff資格も更新する必要がある。小probeの成功を、その未適用修正や全工程の成功保証にはしない。QC-only案が成立すれば、不要な再描画のためにこの入口を起動しない。
