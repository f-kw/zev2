# ID9 v005限定続行 — 現行版の資格・版・不完全転送拒否

発行日：2026-10-02（JST）
decision: continue

kawafmm承認済みID9、「終わったら次に進んで」、軽微技術判断の相談役委任に基づく限定続行。本人への追加確認は不要。同じCodex2セッションで進める。

基準checkpoint：f32d4523e076aad82918abab6c60d351d2d84ee6
親：docs/work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md

## 1. 受理する範囲

attempt-007のlocal-mp4一系列は親process exit0、通常4工程succeeded。実video/mp4直接登録、元素材とのsize/SHA一致、sourceOrigin=video-bytes、inspection未提供null／理由、架空inspection／consumption／clock等の不存在、保存後別processの実consumer再構築と保存成果物deepEqualが成立した。

attempt-006と007の保存要求／回答から、異なる2purposeが各discovery／selection／retentionへ全文で届き、6組のrequestFileSha256と対応response SHAが確認された。upload/local-jsonの再実行はない。

相談役は次を限定技術受理する。
- MP4直接登録
- inspection未提供の通常complete
- 異なる目的2件の3判断到達
- attempt-007保存後再読

v005全体はまだ完了としない。親§8.4／§8.6で、現行版の一部拒否が旧版履歴または静的対応だけに留まるため。

## 2. 今回の目的

**媒体copy／素材PUTなしで、現行codeが不正な資格・版・参照・転送状態を拒否することを直接実証する。**

対象は以下の5群だけ。
1. 期限切れclaim
2. claim owner不一致／Output-FileRef owner不一致
3. 保存承認版／素材入力不一致・旧state
4. 旧内部版／未知版
5. 意図的な不完全転送でcompleteしないこと

新しい正のE2Eは作らない。旧成功を再製造しない。

## 3. 設営13

今回の小さい否定試験入口を**設営累積13回目**として相談役が個別承認する。製品5／設営12を保持し、一般上限・強制停止条件・履歴をリセットしない。

許可対象：
- docs/reports/request-intent-connection-20261001/ 配下の新しい否定試験1本
- 必要な小JSON fixture／小state／証拠JSON
- attempt-007／006の既存state・小JSONをread-onlyで参照
- current shared/backend/runnerの実関数import

禁止：
- 製品code変更
- 元MP4のcopy／PUT／hash
- 新しいsource/STT/inspection処理
- 既存attemptのstate／artifact変更
- 大容量file作成
- 外部推論／費用／動画／SSD／削除
- 通常stateへ成功値を注入して正のE2E成功を作ること

正式実行前にsyntax transpileと、fixture path／対象request ID／対象functionの存在確認を行う。失敗を文字列検索だけで合格にせず、実関数のthrow、HTTP status、state byte不変、成果物不増加を観測する。

## 4. A：期限切れclaimとclaim owner不一致 — 通常API/store

新しい小さい隔離runtimeを使い、通常control router／通常store／現行認証を起動する。自動runnerは無効。

### owner不一致
- 小さいclipまたはdigest draftを通常APIで作成・approve。
- 先頭のprepare_video命令だけをowner-Aでclaimする。素材PUTやcompleteはしない。
- 同じrunning命令へowner-Bでcompleteを送る。
- owner検査はfileRef検査より前なので、成果物を用意せず409でowner不一致になることを確認。
- FileRef／Output／成功命令が増えず、業務stateのclaim以外の対象部分が変わらないことを確認。

### 期限切れ
- 別の先頭命令を通常claimし、parse可能な過去expiresAtを設定する。
- 次の通常API読取またはcompleteでloadStateWithClaimRecoveryを実際に通し、runningのまま完了されず、claim fieldがclearされ、claimExpiredAtと回復logを持ちqueuedまたはwaitingへ戻ることを確認。
- 旧ownerでcompleteしても成功しない。FileRef／Output／成功命令は増えない。
- recoveryによる正規state変更と、不正completeによる作用0を分けて記録する。

## 5. B：承認版／素材／旧state不一致 — current実関数・メモリclone

attempt-007の保存stateをread-onlyで読み、対象RequestDraft／AgentRequestだけをメモリcloneする。storeへ保存しない。

currentの assertApprovedAgentRequestInput を実際に使い、少なくとも次を個別に拒否する。
- 承認後のdraft purpose変更
- draft source URIまたはrequest target.sourceUriの不一致
- settings／constraintsの保存承認版不一致
- productionType欠損または旧state相当の不正値
- 保存stepsが現行Digest4工程と一致しない

currentのprepare側資格検査へ届く公開関数を使える場合は同じcloneで拒否を確認する。ただし拒否前に媒体readが必要になる経路へ進めない。assertApprovedAgentRequestInputで十分に同一条件を実証できる項目を、重複して媒体readへ持ち込まない。

## 6. C：Output/FileRef owner不一致 — current registered dependency helper

attempt-007の保存stateをメモリcloneし、succeeded dependencyのFileRef.ownerIdだけを別IDへ変える。

currentの registeredDigestDependencyV001 を実際に呼び、
DIGEST_DEPENDENCY_REFERENCE_INVALID で拒否されることを確認する。

同様に必要最小限で、
- Output.fileRefIdとFileRef.id不一致
- dependency.result.fileRefIdとFileRef.id不一致
のどちらか1件を追加してよい。

メモリfixtureのみ。store・artifactは変更しない。

## 7. D：旧内部版／未知版 — current artifact validator

大容量bytesを使わない小JSON fixtureだけで確認する。

### artifact schema
current assertDigestArtifactV001 へ、
- digest-plan-artifact-v001 以外の旧／未知schemaVersion
- digest-execution-input-artifact-v001 以外の旧／未知schemaVersion
を渡し、拒否を確認する。

### preparation binding version
current validateArtifactFileRefForKind または同等の実validator経路を使い、小さいisolated artifact rootへ必要最小限のJSON／tiny bytesだけを置く。
- plan自体は現行digest-plan-artifact-v001として構造を通す
- preparationBinding先だけ normal-request-digest-preparation-binding-v002 ではない旧版にする
- validatorが「準備の版・完了対応」不正として拒否することを確認

このfixtureは実動画・実transcriptをコピーしない。必要なbyte bindingはtiny dummy bytesで閉じ、正の製造資格を主張しない。

### 旧state
productionTypeを持たない／現行stepsでない保存state cloneがcurrent assertApprovedAgentRequestInputで拒否されることを、旧内部版拒否と別結果として記録する。

## 8. E：意図的な不完全転送 — complete前拒否

**この項目はnormal completeの作用0まで確認する。**

attempt-007の現行plan JSONをread-onlyで入力元にしてよいが、実dataBindingsの大容量bytesはコピーしない。

新しい小隔離runtimeへ、
- plan artifact JSONだけ、またはplan＋一部のsmall bindingだけ
を置き、少なくとも1つのdataBindingを意図的に欠損させる。

current validateArtifactFileRefForKind が欠損／不一致を拒否することをまず直接確認する。

次に、必要な小state fixtureを隔離runtimeへ置き、対象prepare_digest_plan命令を「negative complete試験用のrunning状態」にしたうえで、通常complete routeへその不完全plan FileRefを渡す。
- これは**否定経路専用fixture**であり、通常成功stateを作るための注入ではない。
- complete前後のstate file bytes／SHAを比較する。
- HTTP 400で拒否されること。
- requestがsucceededにならない。
- FileRef／Output／resultが新規登録されない。
- 不完全転送をcomplete扱いにしない。

current control routeではvalidateCompletionFileRefがcompleteAgentRequestより前に実行されるが、静的読解だけで済ませず上記の隔離APIで直接確認する。

大容量source bindingが最初に欠損して拒否される形でよい。欠損を埋めるために元MP4をcopyしない。

## 9. 保全と分類

結果を必ず次の分類で分ける。
- normal API/store実測
- current実関数＋memory clone
- current artifact validator＋tiny fixture
- negative-only isolated complete fixture
- 静的確認のみ
- not-run

旧52／15／111、upload006、mp4007、全動画QC、人間レビューを再実行しない。

attempt-006/007の大容量copyはread／hash／変更不要。今回の否定試験で元MP4へのopen/readStreamが起きていないことを、試験側guardまたは対象path観測で記録する。

## 10. 完了条件

以下が現行版で直接成立すること。
- expired claimは回復され、そのままcompleteされない
- wrong claim ownerはcompleteできない
- approved draft／source／settings／productionType／steps不一致を拒否
- Output/FileRef owner不一致を拒否
- 旧／未知artifact版を拒否
- 旧preparation binding版を拒否
- 旧stateを拒否
- missing dataBinding／不完全転送を拒否
- 不完全転送のnormal completeがstate／FileRef／Outputを増やさない
- 既存証拠・製品code不変
- 媒体copy／素材PUT 0

この結果と既存の正実走を合わせて親v005§8を一件ずつ再対照する。全条件に現行版の根拠が揃えば、
**「v005隔離実装試験 技術完了候補」**
として相談役最終監査へ提出する。

揃わない項目は具体的にnot-run／failedとして残し、旧版合格や静的対応で埋めない。

## 11. 保存・報告

主report：
docs/reports/request-intent-connection-20261001/README.md

新証拠例：
docs/reports/request-intent-connection-20261001/queue-current-negative-qualification-evidence-v001.json

必要なら小さいnegative fixture scriptを同directoryに置く。汎用試験基盤へ広げない。

CURRENT_GOAL／HANDOVERを同期し、担当fileだけ明示stage、通常mainへcommit/push、Git clean／untracked0を確認する。

報告：
Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9. 現行版資格・版・不完全転送拒否

新しい製品修正・費用・素材・権限・本番判断が不要なら、検証→保存→commit/push→直接報告まで進める。
