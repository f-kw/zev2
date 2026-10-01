# ID9 v005限定続行 — 容量の現物確認と追加素材copyを要しない残検証

発行日：2026-10-01（JST） / 発行者：ZEV Build Loop相談役
`decision: continue`

**kawafmm承認済みID9と、本人の「終わったら次に進んで」「独断で決めれる程度なら自動で承認して」に基づく相談役の限定指示。** 同じv005の容量不足への対応であり、新エピック・一般上限変更・旧成果物削除の承認ではない。担当は同じCodex2単独。Codex1再起動・人間転記・新しい視聴は不要。

監査対象：`60b959d91d0885ac2bf9cf4aaae66eff93454bab`。
親指示：[v005](ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md)、受理済み修正：[時計参照追補](ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_CLOCK_BINDING_FIX.md)。

## 1. 今回受理するものと、停止を続けるもの

相談役は時計二pathの実装、15検査結果、容量停止現物、localの4工程完了と別process再読記録、通常試験の実行順を照合した。**時計参照の限定修正とattempt-005のlocal経路を技術受理する。** 時計結果はbyte参照、他JSONの版検査・null・admissionと再構築検査は維持。旧attempt-004の時計SHAと一致した記録も保持する。Mac上で相談役自身が再実行・再hashした判定ではない。

通常uploadの計画工程は素材の独立copyでENOSPCとなった。停止時のData volume空きは約1.9GiB、素材は4,803,412,827 bytes。これは容量不足の実測であり、新たな製品欠陥や素材破損を確定したものではない。部分copy・failed stateを修復上書きしない。

**現在と同じ空き条件で、大容量copy／PUT／uploadの再試行はしない。** この指示で進めるのは読取り中心の容量調査、容量を要しない既承認の残検証、不要な再実行を避ける限定試験設営まで。保存先と必要容量の実測前に、大容量経路の再開を認定しない。v005全体・目的2件の全経路・実AI品質・動画・人間採用は未完了／未認定のまま。

## 2. 容量と保存先を実値で確定する

1. 元素材、現在のworkspace/runtime、attempt-005のbackend／worker／reader予定先が載るvolumeの実path・device・利用可能bytesを同じ時点で読む。既存mountの一覧・空き・filesystem等のmetadataと、設定済みのZEV保存先を確認する。未関係のユーザーファイル本文やホーム全体の探索は不要。
2. 同じdevice／共有容量領域に載る別directoryを、独立した空き容量として足し合わせない。`/tmp`や別folderへの変更だけで解消したとしない。別volumeも実在・実空き・利用許可を確認する。外付けSSDの購入／接続や`/Volumes/...`の具体名を推測しない。
3. `runtime/artifacts`の容量metadataを必要な階層まで読む。今回の`request-intent-*`領域はattempt／local／worker／backend／reader単位にし、素材の複製、生成JSON、失敗partial等を分ける。旧proofの参照関係も使い、論理bytesと割当bytesを区別する。削除による回収量や共有blockの状況が確定できなければ未確定と書く。全動画を再hash・再描画する調査にしない。
4. 残りのupload-jsonとlocal-mp4／inspection未提供について、通常callerの実際のcopy・PUT・GET・一時file・再送の順から、volume別の追加保持量と工程中ピークを計算する。旧attemptを全保持する前提とする。素材1本分だけ、あるいは短区間からの推測を必要容量としない。確定bytes・未確定の増加・安全余裕の提案を分ける。新しい数値上限や監視装置は設置しない。
5. **容量確保の第一候補は、旧成果を動かさず、新しい試験runtimeだけを、実在し既にZEV用途の利用が許可されている十分な空きのある保存先に置くこと。** その候補の絶対path、許可根拠、worker/backend/readerの分離、必要な既存設定または試験側の最小差分を一案にする。場所が未確認なら未確認とし、この段階で新しい保存先へ動画を書き込まない。候補がない場合も「空きを用意してください」だけで人間へ丸投げせず、不足bytesと次に必要な具体的一点を相談役へ返す。

今回は、旧成果・失敗partial・旧stateの削除、移動、圧縮、置換、hardlink/symlink化、snapshot/cache削除、diskのmount/format、外部／cloud転送、購入を許可しない。候補一覧を作ることと実施許可は別である。

## 3. 完了済みを繰り返さず、低容量で進める

現行`queue-integration-test.mts`のrun枝はlocal-json→upload-json→local-mp4を毎回順に処理する。attempt-005のlocal成功をもう一度製造する必要はない。

- 試験側に、既存scenarioの明示選択と、実走前に予定copy／保存先／追加bytesを確認する作用なしpreflightを最小追加してよい。既存のscenario本文、通常API／runner／factory／PUT／GET／consumer、固定応答の意味、検査基準は変更しない。
- 対象は既存 `docs/reports/request-intent-connection-20261001/queue-integration-test.mts` と、必要なら同directoryの小さい `queue-capacity-preflight.mts`。無関係な製品pathや汎用storage基盤は変更しない。この「容量を確認せず完了済みscenarioから再実行する試験設営」の訂正一件を、適用時に**設営累積7回目**として相談役が個別承認する。製品累積5は不変。複数の別欠陥をまとめず、一般枠・強制停止条件・履歴をリセットしない。
- preflight／scenario選択は、実体をcopyしない小さい試験で確認する。現在の1.9GiBのvolumeに大容量経路が必要量不足であることを、copyに失敗させる実走なしで検出する。preflightの通過をupload合格と称さない。
- v005で既承認だが未実施の通常入力拒否／Clip対象回帰のうち、動画・大きな素材copyが不要な項目を実施する。例は通常APIの系統欠損・未知値、空目的、未承認next/claim、重複承認、Clip既存7工程・確認条件の不変等。実装が実際に検査する条件に合わせ、架空の期待値を作らない。通常API・store・既存関数を使い、成功状態を直接注入しない。
- 既存完了計画を使える読取り専用の検査は再判断・再製造せず使う。否定fixtureに必要な小JSON・隔離stateだけを新領域に保存し、旧state／旧成果を変更しない。必要な参照検査が新しい素材copyを要するなら、その項目だけ容量待ちに残す。小試験やログ用の空きすら不足する場合は作用を止め、その事実を残す。
- 選択実行で飛ばした項目は`not-run`とし、旧成功の参照SHAと今回結果を分ける。異なる依頼の結果を同一E2E成功へ合算しない。目的2件の全3判断・upload・MP4／未提供枝はそれぞれ実証を要する。

## 4. 今回の終点・次の判断

既存主reportへ次を一度に保存する：
- 時計修正とlocal成立の相談役受理、ENOSPCと容量待ちの範囲。
- volume／今回領域の実容量表、残工程の追加保持／ピーク算定、実在する保存先を使う推奨一案と未確認事項。
- preflight／scenario選択の変更があればその差分と設営累積7、低容量の残検証結果、容量待ちの未実施一覧。

軽量記録は同directoryの`queue-capacity-plan-v001.json`等でよい。新たな大容量保存を伴う実走はこの指示だけでは再開しない。相談役がこの表から場所・容量・必要差分を具体的に判定し、次の実施可能な指示を返す。削除・新しい外部保存許可・購入等が本当に必要な場合だけ、相談役が本人へ必要な一点をまとめる。

## 5. 維持する権限と報告

製品・検査基準・素材・既存登録state・通常通信は変更しない。成功済みlocal、時計15検査、前の内部5参照／拒否9件を失敗へ戻さない。元動画の短尺化・架空／sparse動画への置換・同じfolderの使い回しでupload独立性を偽装しない。copy失敗を成功扱いにせず、原本の削除やbyte改変で容量を作らない。

外部推論・費用・新素材・取得／STT／inspection実行・動画製造・新UI・本番・正式採用・公開は対象外。ID9-PD-01/02、字幕演出未接続、動画許可未承認、人間品質pendingを維持する。追加の製品修正は今回許可しない。別問題はGPT_DECISIONで相談役へ返す。

通常main、担当fileのみ明示stage、直列commit/push、Codex2専用Edgeタブで同じZEV Build Loopへ直接報告する。報告は `Codex2 GPT_DECISION＋NEXT_REQUEST｜9. 容量実測・再開案と低容量検証`。受領記録だけの再commit・終了連絡・再起動、Codex1起動、ユーザーへの転記／採点要求は不要。

指示発行時点で、Macの最新空き・追加保存先・容量確保の実施・Codex2の本指示受領／再稼働は未確認。今回の指示は大容量経路の再開済みやv005全体の完成を意味しない。


## 6. 2026-10-01：媒体なし回帰受理後のupload-json単独再開

`decision: continue`。**kawafmm承認済みID9と「終わったら次に進んで」、軽微技術判断の相談役委任に基づく。本人への追加確認は不要。**

監査対象は `f54cd09af22621ddf0b5a5fdf3bf5776b87e8350`。新媒体なしattempt-002は52結果・親exit0・隔離backend終了0・別process通常store reader exit0。実API/store、Clip7／Digest4工程、承認入力14否定、確認生成元3、独立確認ゲート3、完成時state完全対照と旧証拠保全が一系列で成立し、旧38件・停止後診断との合算は0。相談役はこの**媒体なし回帰一件を限定技術受理**する。Mac上で相談役自身が再実行した監査ではない。

### 6.1 次の一件：upload-json転送だけを単独再開

残る大容量系を一度に走らせない。次は既存 `queue-integration-test.mts` の **upload-json scenarioだけ**を、新しい隔離attemptで実行する。local-jsonは既に受理済みなので再製造せず、local-mp4／inspection未提供も今回は実行しない。

既存コードの実装を照合すると、upload-jsonで大きい素材bytesが新規に同時保持され得る場所は、通常経路の
1. workerの `runner-artifacts`
2. backendの保存先
3. receiver/readerの `runner-artifacts`
の最大3実体。backend PUTとreader downloadは一時fileを最終fileへrenameするため、同じ転送先でtempとfinalを別のsource-size実体として永続二重保持する設計ではない。元素材は既存保持元であり新規増加量に含めない。

保持元素材は `4,803,412,827 bytes`。既知の大容量追加保持ピークは
`3 × 4,803,412,827 = 14,410,238,481 bytes`（約13.42 GiB）。
本人承認の整理直後に観測した同volume空きは `40,604,250,112 bytes`（約37.82 GiB）だった。ただし現在値ではない。

### 6.2 実行直前preflightと設営9

既存testは引数なしでlocal→upload→MP4を連続実行するため、**upload-jsonだけを明示選択する最小の試験入口**と、作用なし容量preflightを追加してよい。対象は既存 `docs/reports/request-intent-connection-20261001/queue-integration-test.mts` と、必要なら同directoryの小さいpreflight helperだけ。製品code・通常runner・通常API・PUT/GET・consumer・固定応答・検査条件は変更しない。

この試験設営の一件を**設営累積9回目**として相談役が個別承認する。現在の製品5／設営8を保持し、9は適用時に計上する。一般上限・強制停止条件・過去履歴の増枠／リセットではない。

preflightは次を実測する。
- 元素材size
- worker／backend／reader予定rootのdeviceとavailable bytes
- 3rootが同一volumeか別volumeか
- 新attemptの対象pathが既存しないこと

同一volumeなら、今回だけの試験開始条件を `availableBytes >= 4 × sourceBytes` とする。これは既知の3 source-sizeコピーに**source 1本分の一時的な試験余裕**を加えた今回限定のpreflightであり、製品の容量上限・一般監視値ではない。今回のsourceでは `19,213,651,308 bytes`（約17.89 GiB）。別volumeなら、各volumeで実際に置くsource-size実体数に対応する必要量を個別に満たすこと。予定外のsource-size copyがコード／実path確認で増えるなら、その分を計算へ追加し、無断で実走しない。

preflightが条件を満たさなければ**大容量fileを1byteも新規copy／PUTせず停止**し、実測値と不足量だけ相談役へ返す。SSD pathを推測して代替しない。

### 6.3 upload-jsonの実証範囲

preflight通過時だけ、新しい隔離attemptでupload-json一件を実行する。

- 旧保存source/STTを通常APIの実claim／PUT／completeで登録する。ただし動画取得・STT処理自体は行わない。
- 実index/factoryで探索・採否・保持→計画complete。
- workerからbackendへの実upload、backend保存、別root readerへの実downloadを行う。
- readerは既存guardでworker、元素材、保存STT、inspectionの直接readを禁止し、**転送先だけ**から登録計画・dataBindingsを再構築してvalidate_digest_planの実消費／completeまで進める。
- FileRef owner、要求SHA、内部参照、実bytes、時計、薄い検証成果物、通常completeを確認する。
- 実行前・主要転送後・完了後のavailable bytesとsource-size実体の実path／sizeを記録し、事前のピーク見積りとの差を残す。
- 旧attempt・削除済み33参照・過去失敗stateは復元／上書きしない。

今回の完了条件は**upload-jsonの転送経路とreceiver-only再読の成立**まで。MP4直接登録、inspection未提供の通常complete、目的2件の全3判断はnot-runのまま残す。upload成功をv005全体完成、実AI品質、動画実行許可、人間品質採用へ広げない。

### 6.4 禁止・保存・報告

今回の新attemptで生成した大容量copyは、追加の削除承認なしに自動削除しない。追加削除、旧成果移動、SSD探索／format／移行、外部/cloud転送、新素材、外部推論、費用、動画製造、新UI、本番、公開は対象外。ID9-PD-01/02、字幕演出未接続、動画許可未承認、人間品質pendingを維持する。

結果は既存主reportと新しいupload単独証拠へ保存する。例：
`docs/reports/request-intent-connection-20261001/queue-upload-transfer-evidence-attempt-006.json`。
preflight、実転送、別process reader、容量前後、旧証拠保全、not-runを分ける。担当fileだけ明示stage・通常mainへcommit/push・Git clean確認後、Codex2専用Edgeから同じZEV Build Loopへ直接報告する。

報告名：
`Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9. upload-json転送・receiver-only再読`

本節保存時点では、Codex2の受領・設営9適用・preflight・upload実走は未確認。
