# ID9 v005最終否定追補 — 素材JSON/動画bytes混同・Clip/Digest誤消費

発行日：2026-10-02（JST）
decision: continue

kawafmm承認済みID9と、軽微技術判断の相談役委任に基づく個別承認。本人への追加確認は不要。同じCodex2セッションで続行する。

基準checkpoint：738f63752b20970b766a064797e601718dbd876c
親：docs/work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md

## 1. 今回受理するもの

現行否定資格attempt-002は19結果すべてpassed。
実親process exit0、隔離backend2件exit0、完成時通常store別process reader exit0。

現行版で直接成立したもの：
- wrong claim owner complete拒否
- expired claim recovery＋旧owner complete拒否
- 承認purpose/source/settings/productionType/steps不一致・旧state拒否
- Output/FileRef owner／参照不一致拒否
- plan／executionの旧・未知artifact版拒否
- 旧preparation binding版拒否
- missing dataBinding／不完全転送validator拒否
- negative-only normal complete HTTP400＋state/FileRef/Output/result不増加
- 完成時別process state完全対照
- 元媒体read/hash/copy/PUT 0
- 旧証拠／006／007／製品8path保全

相談役はこの19結果一件を限定技術受理する。

親v005 §8.4で残る直接証拠は次の2点だけ。
1. source登録JSONとvideo bytesの混同拒否
2. Clip／Digest成果物の相互誤消費拒否

## 2. 設営15

この2点専用の媒体なし小試験を**設営累積15回目**として相談役が個別承認する。
製品5／設営14を保持し、一般上限・強制停止条件・履歴をリセットしない。

許可対象：
- docs/reports/request-intent-connection-20261001/配下の小test 1本
- 小JSON／tiny bytes／memory state fixture
- current validator／workflow builder／shared helperの実import
- 新しい小証拠JSON

禁止：
- 製品code変更
- 元MP4 read/hash/copy/PUT
- attempt-006/007のartifact変更
- normal runner起動
- source/STT/inspection処理
- ffprobe等の外部媒体解析
- 外部推論／費用
- 動画製造
- SSD／削除
- 旧成功の再実行

正式試験前にsyntax transpileと、対象export／fixture ID／isolated runtime pathのpreflightを行う。

## 3. A：source登録JSONとvideo bytesの混同拒否

current backend/src/artifacts/validation.ts の validateArtifactFileRefForKind を実際に使う。
isolated small runtimeだけを使い、元MP4は読まない。

現行validatorはvideo判定を先頭12byteの ftyp で行うため、ffprobeは不要。

### A1 JSONをvideo/mp4として誤登録
tiny source JSONを保存する。
最低限：
- kind: source_video
- mode
- sourceUri
- purpose

そのURIを expectedKind=source_video、mimeType=video/mp4 として current validateArtifactFileRefForKind へ渡す。

期待：
- MP4 header検査で拒否
- 「動画成果物はMP4ファイルを指定してください」相当
- JSONをvideo bytesとして受理しない

### A2 video-like bytesをJSONとして誤登録
元MP4は使わず、tiny bytesとしてMP4 header相当の ftyp を持つ12byte以上のfixtureを作る。
そのURIを expectedKind=source_video、mimeType=application/json として current validateArtifactFileRefForKind へ渡す。

期待：
- JSON parse/kind検査で拒否
- video-like bytesをsource登録JSONとして受理しない

このtiny bytesを「実動画の品質」や「有効な完成MP4」の証拠にしない。
ここで確認するのはJSON/video bytesの型混同拒否だけ。

両ケースの前後で業務state変更0、FileRef/Output増加0。

## 4. B：Clip成果物をDigestが誤消費する入力

current runner/src/workflow-step-builders.ts の実workflow経路を使う。

attempt-007等の大容量stateは変更せず、必要最小限のmemory cloneを作る。
Digestの validate_digest_plan または prepare_digest_plan の依存に、Clip成果物kindを持つFileRefを接続する。

推奨最小ケース：
- productionType=digest
- dependency type=prepare_digest_plan なのに、そのdependency.result/FileRefを theme_json または composition_json のClip kindへ差し替える
- current createStepArtifactBuilders(...).validate_digest_plan へ到達させる
  または同builderが使う current requireWorkflowRequestOutputFileRef / registeredDigestDependencyV001 を実使用する

期待：
- digest_plan_jsonを要求するcurrent依存検査で
  DIGEST_DEPENDENCY_REFERENCE_INVALID 等として拒否
- consumer／artifact read／writeへ進まない
- state／artifact変更0

単なる assertJsonArtifactForKind 単体だけで済ませず、**Digestの実workflow依存解決経路**を1回通す。

## 5. C：Digest成果物をClipが誤消費する入力

current createStepArtifactBuilders のClip工程を実際に使う。

推奨最小ケース：
- productionType=clip
- propose_clip_themes が run_stt の transcript_json を読む場面を使う
- memory state上のrun_stt dependency FileRefをDigest系kind／URIとして置く
- runtime.requireRequestOutputFileRef はcurrent requireWorkflowRequestOutputFileRefを使う
- runtime.readArtifactByUrl はdiskへ行かず、そのURIに対応する小さいDigestPlanArtifactV001 objectをmemoryから返す

Clip側は依存参照を取得した後、current readValidatedRequestArtifact 内の assertJsonArtifactForKind('transcript_json', ...) を通る。

期待：
- Digest plan objectをtranscriptとして拒否
- buildThemeOptionsArtifact／writeStepManifest／writeJsonArtifactへ到達しない
- state／artifact変更0

単なるkind validator単体ではなく、**Clipの実workflow builder**を1回通す。

## 6. 観測項目

結果を最低限次で分ける。
- current artifact validator実測：A1/A2
- current Digest workflow dependency拒否：B
- current Clip workflow builder拒否：C
- state/artifact作用0
- 媒体作用0
- product files unchanged
- old evidence unchanged

小fixture以外のfile open/readStreamをguardし、元MP4へのread/hash/copy/PUTが0であることを記録する。

## 7. 完了条件

A1/A2/B/Cがすべて直接成立したら、親v005 §8.4の残る2項目を閉じる。

その後、既存の正実走・52回帰・15時計・19現行否定と合わせて親v005 §8.1〜§8.6を一件ずつ再対照する。

全条件に現行版の直接根拠が揃った場合だけ、
**「v005隔離実装試験 技術完了候補」**
として相談役の最終監査へ提出する。

ただし次は別：
- ID9-PD-01
- ID9-PD-02
- 旧業務state移行／本番有効化
- 実AI内容品質
- 字幕演出接続
- 動画実行許可
- 人間品質採用

## 8. 保存・報告

新証拠例：
docs/reports/request-intent-connection-20261001/queue-source-kind-and-cross-production-rejection-evidence-v001.json

主reportとCURRENT_GOAL／HANDOVERを更新。
担当fileだけ明示stage、通常mainへcommit/push、Git clean／untracked0。

報告：
Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9. 素材型混同・Clip/Digest誤消費拒否

新しい実質問題がなければ、
検証→保存→commit/push→Git clean→相談役への直接報告まで続行する。

この報告はNEXT_REQUEST付きなので、送信後は相談役の返信生成完了と本文読了まで受領し、同じ承認済みwork-order内のcontinue/reviseなら同じCodex2セッションで続行する。
