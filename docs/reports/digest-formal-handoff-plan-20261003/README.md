# 9の後続 — 正式後段接続と限定製造の実行案

保存済み15:23計画と243字幕を、同一Normal技術候補一件として既存Coreへ渡す一案を作成した。現成果は**非実行の接続・作用・許可案**。実装も媒体製造も開始していない。製造へ進むには、限定配線の個別scope、一件の実製造許可、出力先と容量条件の確定が必要である。

受領main b4a497dc942a7b68990b7ef768a429600a944f08。正本は `docs/work-orders/ZEV_DIGEST_FORMAL_HANDOFF_PLAN_20261003_v001.md`、SHA `43c357a62feb0fa8cc1aebf3325685825ab18e96bda14832251174c3015ff569`。専用Edgeの前件acceptと確定指示を全文読了し、同じCodex2で続行。以前の作業案は再実行していない。製品6／設営29と旧失敗・一般上限を維持する。

## 保存束と参照の接続

固定入力は263dca50で受理された候補manifest `04ad8b3f019d6afed4038f376e101d15e155cc7822a2527b46fcfbd5b5041e41`、元意味入力 `6e16d247d36f841783d59badc4c4a3f35c8cf4739b6acae29baccc32a7d061a3`、correspondence `950f1edf9ea2a6f4ae8b1b2991d78b1c706bbaf2bf8877d04dcf66df15ed98f5`、trace `479107679f236221b198c59a0fef95495dbb5ecb1a75df922a700f6fb8b482b6`。各bindingは同JSONのinputBindingsにも保存した。

7採用・9保持区間、3,613元断片、243cue／390行、27,691frame／40,705,770sampleは今回の保存結果であり製品目標値ではない。対象素材は -2UUTkv9qvk 一件。元正常4命令は同じ下書きでsucceeded。元stateのSHAは `c62e3b38d00c8222f0918b52704e579f87a14346217fada6c9cd754fc6fccf3c`。今回stateは読取だけで更新していない。

通常storeの論理参照 `artifacts/<draft>/<producer>/<file>` は、既存resolverで正常attemptの `<producer>--<file>` へ解決する。同draft・正規source/STT依存鎖・producer・登録owner/kind・承認snapshot・出力・内部参照・安全path・実bytes SHAを既存公開readerとresolverで検査する。CoreのROOT基準readerに論理pathをそのまま渡さない。派生製造jobには検証済み実pathを明示し、元論理bindingと物理bindingの対応を来歴へ残す。通常依頼の成功state・owner・承認を付け替えない。

主な対応は次のとおり。すべての実path/SHAとproducerは `handoff-plan.json` の normalReferenceMap、元9要求/回答/result/traceの実SHAは displayAnswerReferences に保存した。

| 保存根拠 | 正式後段での意味 |
|---|---|
| 承認snapshot・purpose全文・元計画 | 正常依頼の来歴。動画許可の代用にはしない |
| source JSON／登録済み媒体 | 元素材のURI、producer、実媒体pathとSHA |
| 共通発話／書き起こし | 発話所属・元断片ID・本文・元ms |
| 比較採否／保持回答・検査結果 | 7採用の理由と9保持区間の根拠 |
| 通常consumer／機械採用／edit plan | 正常completeと順序、製造範囲への引渡し |
| 時計結果／保存inspection | 9区間の元・出力frame/sample、60fps素材の時計 |
| 元意味入力／今回9実回答・検査trace | 本文と境界を変えず243cueを正式投影へ渡す |

新しい一計画adapterを `runner/src/digest-formal-handoff-v001.ts` に置く案とする。入力の正規再構築、candidate Core入力準備、明示許可後の実行という三つの関数だけを提案する。既存公開reader、表示採用tokenの検査、純粋projection、Core assembler、背景builder、正式renderer callerを呼び、新判断機能や通常queue/APIを作り直さない。

元意味caption一件とglobal boundary列を、正式sourcePackage用の新しい全体caption集約viewへ渡し、9件の実traceのcue列を順接続する。元9要求のcaptionId/requestId/回答SHAは来歴に保持する。元意味ID・atom・発話・断片・boundary・segment IDを再生成しない。正式cue/instructionの新IDと元IDの対応は投影に保存する。全体viewは新しい判断要求ではない。

既存の入力生成関数はplanIdからIDを作り直すため呼ばない。元意味を `zev-meaning-information-package-v002` へ偽装することもしない。今回は既存Digestが使用するpure source-package validatorとCore assemblerへ接続する。新出力rootでCoreが必要とする意味・採用・editの小JSONだけは同内容で保存し、実serializer bytesから新bindingを作る。元のSHAを新pathへ貼り付けず、元bindingとの内容対応を明示する。この対象接続の実検査は次のscopeの仕事である。

## 候補styleの一案

26/2と144px・A8/4はこの一計画専用の技術候補へ束縛する。元registry/trust/defaultは編集しない。元fontの宣言、実font SHA検査、既存layout数値・文字幅規則は維持する。

専用rootに候補preset registry、preset validation index、trusted registry bindings、renderer trustの小JSONを作る案とする。正式profileにmaxLogicalWidth=26／maxLines=2を明示し、144px／縁8／glow4の表示状態を保持する。元表示状態の36は能力上限であり、26と同じ値とは扱わない。正式注文書のstyleProfileRegistry、rendererTrust、fontLedger及びsourcePackageのstyleBindings/resolvedStyle/入力制約を同じ実候補束へ閉じる。trustのpreset参照は候補registryの実path/file/canonical SHAと一致させる。

既存assemblerの幅・行数等値検査、表示状態一意性、font/material/code/runtime/実bytes検査、正式receipt、描画/QCと原子的保存は維持する。候補SHAやfontの検査を省略しない。

制約を明確にする。一般の横型style resolverは固定trust canonical SHAと固定trust pathを検査するため、この候補trustへ差し替えるだけでは拒否される。推奨は**一般rootを変更せず、既存Digest Coreの明示candidate contextに限定する**方式である。adapterは元の固定baseline実binding、許可された差分、この計画manifest、実製造recordを照合してcandidate contextを作る。一般resolverを通ったとは報告しない。この限定境界を許すかは相談役の次scope判断へ返す。一般登録やセキュリティ検査緩和へ広げない。

A8/4は技術入力であり縁の人間採用ではない。144px/26条件のNode推定合格は実glyph・見心地合格を意味しない。元の144px方向・条件付き分割・色の回答、未回答・B不合格は保持する。

## 背景四参照と低メモリ接続

将来保存先の案は `runtime/artifacts/digest-formal-handoff-20261003-v001/attempt-001/`。今回は作成していない。元製造値を根拠に、実source path、新job ID、新出力rootを持つ派生jobを新実bytesへ束縛する。旧job/state/purposeは編集しない。

背景は既存 `buildAdoptedBaseMediaV001` が9保持区間を既存時計で解決し、video builder、audio grid/PCM、mux、実出力検査、timeline/hash graph検査を経て作る。完成背景MP4、timeline、generation-manifest、validation-receiptの四参照は**未生成・実行後束縛**。仮SHA、架空base、passed receipt、実行可能jobは本成果に含めない。

この呼出しは媒体read/hash、source snapshot copy/chmod/hash、source再inspection、H264作業動画、全source音声grid、保持区間PCM、AAC mux、背景のdecoded QC、成功時の今回work削除を伴う。旧『inspection/削除0』の許可で実行できるとはしない。STT/取得を再実行する必要はない。

最初の候補は元計画どおりの順接続・identity crop・元音声保持・同一Normal technical style一件。separator、アップ、色、強調、motionを新たに選ばない。演出機能は未接続のまま別に残す。旧9:47背景や旧307PNGは今回の背景/字幕と同一ではないため再利用しない。

既存低メモリ合成の有限分割、既存renderer由来graph、未使用PNG input剪定、入力番号だけの置換、順次producerと一つの連続encoder、backpressureを再利用する。ただし旧17,613frame上限・旧背景path・旧307状態readerが固定されている。今回27,691frameと正式overlayRecordsを明示入力に取るCore entryへ既存処理を抽出する最小差分が必要である。210frame単位は既存の技術値を使う案で、新しい一般上限にはしない。

通常renderer file callerには低メモリcompositorを伝える口がなく、描画関数は合成関数を直接呼ぶ。したがってcompose直前の小さいhookとfile callerの受渡しが必要である。executeDraw全体を試験用処理へ置換しない。PNG・determinism・glyph・preflight・出力検査・native QC・receipt・原子的保存は既存を使う。凍結renderer二pathの限定変更を別scopeで明示許可する必要があり、今回文書の許可では変更しない。

## 容量と作用の実値

観測時刻 2026-10-02T20:03:59.334588+00:00。元媒体と正常計画の保存媒体はいずれもregular file、symlinkなし、4,803,412,827bytes。実pathとrealpathはJSONへ保存した。出力ancestorはworkspace/runtime/artifacts、device=16777234、利用可能 **13,411,098,624bytes**。metadataだけを読み、媒体をopen/hashしていない。SSDや外部volumeは探索していない。

| 新保存物 | 生成者・寿命 | 新容量の根拠 |
|---|---|---:|
| source snapshot | 既存背景builder。背景QC完了まで | 4,803,412,827bytes |
| 全source音声grid | 既存audio builder。背景QC完了まで | 530,791,424sample×2ch×4bytes＝4,246,331,392bytes |
| 保持区間PCM | 同builder。mux/音声QC完了まで | 40,705,770sample×2ch×4bytes＝325,646,160bytes |
| video-onlyと完成背景MP4 | 既存H264/AAC製造。前者は成功後work整理、後者は保持 | 可変圧縮のため未製造・未確認 |
| 字幕PNG/repeat/line-mask/calibration/QC frame | 既存描画と検査。published overlays保持、今回scratchは既存整理条件 | 未生成。243cueが243fileだけになるとは限らない |
| 初回Normal候補MP4 | 有限合成→既存保存。候補を保持 | 未製造・未確認 |
| 再現/omission検査一時物 | 既存QCが必要とする代表frame等 | 未生成。独立二本目全編を当然には作らない |

背景完成時はsnapshot/grid/PCM/video-only/base MP4が同時に存在する。既知三媒体だけで9,375,390,379bytes。再inspection未実施であり、音声値は保存inspectionの値に基づく計算である。候補段は完成背景・PNG・repeat/mask/QC scratch・candidate MP4が同時に存在する。圧縮bytesを含むピーク全量は未確定で、元動画sizeへ独自倍率を掛けて捏造しない。raw YUVの86,130,086,400bytesはpipe通過量で、提案方式ではdiskへ保存しない。raw背景NUTを新設する案は採らない。

既存監視の値は開始50,000,000,000bytes、reserve12,000,000,000bytes、親子RSS17,179,869,184bytes、OS pressure=1、1秒観測。次unitとreserveが収まらない、reserve以下、RSS以上、pressure異常/不明を拒否する。v002は所有process groupを実確認してSIGTERM、既存5秒、SIGKILLと残存確認を行う。

これらは旧運転の限定条件であり、今回へ勝手に適用・緩和しない。推奨は同安全条件を一件の製造scopeへ明示して再承認すること。現在空きは50GB開始案を満たさず、既知三媒体を増やしながら12GBreserveを保持することもできない。**現在deviceで製造開始できるという結論は出さない**。旧2×sourceの試験開始条件を全編製造の条件にしない。出力先/十分な空きが確定するまで媒体作用を止め、SSD接続先推測、追加削除、旧コピー復元はしない。

停止/再開点は、元束と許可の検査後・背景実四参照/QC後・正式style/PNG preflight後・候補MP4/QC保存後。参照不一致、許可不一致、監視通信断、工程非zero、容量/メモリ違反で新owned groupを停止し、partial/log/checkpointを保持する。新計画を旧same-run-resume permitへ偽装しない。成功時はこの処理が作ったworkだけ既存条件で整理し、旧正式成果削除は許可候補に含めない。

## 次scopeの限定差分と許可案

提案する技術pathは四つ、設営pathは一つ。これは提案数であり新上限の設定ではない。

| path | 必要な変更 | 変更しないもの |
|---|---|---|
| runner/src/digest-formal-handoff-v001.ts | 一計画adapterと実許可/参照/style delta束縛 | 正常API/queue/承認/判断機能 |
| tools/digest-quality/original-resolution-low-memory-composite.mjs | 明示fullFrameCountと正式overlayRecordsを取るCore抽出 | graph・合成算法・旧成果 |
| evals/clip_composition/render_presentation_v002.mjs | compose段だけのscope-bound hook | 描画/QC/receipt/publicationの意味 |
| evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts | 通常file callerから同hookへ伝達 | 実読取/font/runtime/admission/検査 |
| tools/digest-quality/original-resolution-full-supervisor-v002.py | 新計画start permitの正規入口 | 監視/stop/group終了条件、旧same-run来歴 |

旧base builder、時計、Skill、validator、style resolver、fixed trust判定、元registry/trust/defaultは不変。凍結renderer二pathへ作用する場合は新scopeで個別に指定する。変更後codeの実SHAは新job/candidate trust閉包へ束縛し、旧manifest/回答/codeSHAを付け替えない。新adapterの初実装と既存欠陥修正を区別し、一般履歴をリセットしない。設営30等を本書で自己承認しない。

次scopeで必要な確認は、元ID/本文/9区間/時計/承認owner/参照closure、candidate26/2等値と許可外delta拒否、有限合成のframe連続被覆/範囲拒否/graph不変、監視permitの別plan/root/command/SHA拒否とgroup停止、関連type-checkと保存再読。旧v005・各全suite・全字幕判断・15分レビューをやり直さない。製造許可後だけ実背景四参照、glyph、映像/音声、既存QCと正式保存再読を行う。

相談役が判断する技術事項は、この四path＋設営一pathの接続、一般rootを変えない限定candidate入口、凍結code二pathの小さい配線。本人専決事項は一件の媒体/動画製造・source再inspection/copy・音声/PNG/glyph/QC・今回新work整理・candidate trustの作用範囲・出力先/容量条件である。技術方式を本人へ選ばせる質問にしない。

相談役から本人へ必要な場合の一問案：

> 保存済み一素材の15:23計画と243字幕を、144px・A8/4・26/2の技術候補としてNormal動画一件へ接続し、実制作に必要な素材一時コピー・再解析・音声/字幕画像生成・技術検査・今回一時物の整理を、出力先と安全容量条件が確定してから行う許可を出しますか（正式採用・公開・旧成果削除は含みません）。

Codexから本人への確認・転記依頼はしていない。動画製造recordは未提供でrecordId=null。元計画承認や試験用『動画確認不要』policyを製造許可へ転用しない。ID9-PD-01一般本適用、ID9-PD-02動画許可、outlineChoice=null、人間品質pendingを保持する。

## 今回の確認と未完了

標準serializerでJSONを保存し、構文/保存内容と必要な小参照のSHAを確認した。媒体SHAは宣言を保持しただけで再hashしていない。実媒体への操作はlstat/stat/realpath/statvfsのみ。製品変更、設営変更、helper/試験再実行、媒体read/hash/copy/PUT、font binary、inspection/ffprobe、描画、API/費用、SSD探索、削除は0。

一件candidate style境界、固定旧入力からの合成抽出と正式callerへの接続、出力先/容量条件、実製造recordは未成立。四背景参照や正式jobは未生成。映像音声・実glyph・見心地・人間品質は未確認。演出は未接続。今回の文書完成を製造完成・正式採用・公開とは報告しない。

受領→読取checkpoint→具体案保存まで同じターンで記録した。担当四fileだけ通常commit/pushし、Git状態・自分のprocess終了を確認して専用Edgeから GPT_DECISION＋NEXT_REQUEST を直接送る。送信確認だけで終了せず、返信生成完了・全文読了まで受領する。具体的な次scopeがない限り実装/製造へ自動着工しない。

保存前確認：JSON標準再読一致、必要小参照74件の存在と読取時実SHA照合、git diff --check exit0。対象の自分の実行process0、他Git mutation観測なし。fetch後main/remoteはb4a497dc一致、stageは空。担当四fileのみをcommitする。
