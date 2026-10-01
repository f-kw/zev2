# ID9 v005限定続行 — local-mp4直接登録＋inspection未提供

発行日：2026-10-01（JST）
decision: continue

kawafmm承認済みID9、「終わったら次に進んで」、軽微技術判断の相談役委任に基づく限定続行。本人への追加確認は不要。同じCodex2セッションで進め、Codex1再起動・本人への視聴／採点／転記は不要。

基準checkpoint：bc36743d917f5929f9c778e2fffbd5379781bea1
親：docs/work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md

## 1. 受理

相談役はattempt-006のupload transfer証拠と保存後receiver-only再読証拠を照合した。通常4工程succeeded、実upload、別root receiverの転送先だけの消費、実readConsumedDigestPlanV001による保存後再構築、保存execution artifactとのdeepEqual、5禁止path probe、再構築中禁止read0が成立している。

このupload-json転送＋保存後receiver-only再構築を限定技術受理する。旧親processの終了code未返却記録は変更せず、別process reader exit0と区別する。v005全体・実AI内容品質・動画許可・人間品質は未完了／未承認。

## 2. 次の一件

既存queue-integration-test.mtsの local-mp4 scenarioだけを、新しい隔離attemptで実行する。

この1本で次を確認する。
1. source_videoをJSON参照ではなく実video/mp4 bytesとして通常APIへ直接登録する。
2. inspectionを提供しない。
3. 異なる2件目のpurposeが discovery / selection / retention の3判断へ全文で到達する。
4. prepare_digest_planとvalidate_digest_planを通常completeする。
5. inspection未提供を明示null／理由として保存し、架空のinspection、consumption、clockを生成しない。

local-jsonとupload-jsonは再実行しない。

## 3. 実コピー数と容量preflight

現行実装を確認すると、video/mp4直接登録ではsource registration自体がsourceVideo bindingとなり、JSON参照時の source-media.mp4 追加copyは作らない。大きな新規実体はbackendのPUT先video/mp4 1本。

元素材sizeは4,803,412,827 bytes。実行直前に同volumeのavailableBytesと新attempt path不存在を読む。

今回限定の開始条件：
availableBytes >= 2 × sourceBytes
= 9,606,825,654 bytes（約8.95GiB）

これは実1copyにsource 1本分の試験余裕を加えた今回限定preflightで、製品の恒久容量上限ではない。

条件不足ならvideo bytesを1byteも新規PUTせず停止し、実測値だけ相談役へ返す。SSDを推測して使わない。

## 4. 設営12

現在のqueue-integration-test.mtsは設営9でupload-jsonだけを明示許可している。次の最小変更を設営累積12回目として相談役が個別承認する。製品5／設営11を保持し、一般上限・履歴はリセットしない。

許可する試験変更：
- 明示scenario選択に local-mp4 を追加する。
- local-mp4だけの無作用容量preflightを追加する。
- 新attempt名／証拠名／実行metadataを追従する。
- upload-jsonの既存入口・preflight・証拠は変更しない。

製品code、通常API、runner、factory、consumer、登録／completeロジック、固定判断応答、期待値を変更しない。

正式実走前に新入口のsyntax transpileと、preflightだけの作用なし実行を行ってよい。設営変更そのものの不備を大容量実走で初めて発見しない。

## 5. 実証条件

新attemptは attempt-007 を使う。

推奨証拠：
docs/reports/request-intent-connection-20261001/queue-local-mp4-no-inspection-evidence-attempt-007.json

通常経路で以下を確認する。

### source/STT登録
- 明示Digest draftを通常APIで作成・approve。
- prepare_videoを実claim。
- 元素材bytesをvideo/mp4として通常PUT。
- FileRef byteSize/SHAが元素材の実size/SHAと一致。
- source_video registration JSONへ偽装しない。
- inspectionは登録しない。
- run_sttは旧保存transcriptの登録だけ。STT処理は行わない。

### 計画
- prepare_digest_planを実runner/index/factoryから処理。
- sourceOrigin.modeがvideo-bytes。
- sourceRegistrationとsourceVideoのSHAが一致。
- sourceInspectionはnull。
- 2件目purpose全文がdiscovery/selection/retentionの全3要求へ届く。
- 固定回答は通信しない接続fixtureであり、内容品質採用へ広げない。

### 消費
- validate_digest_planを通常消費／complete。
- sourceInspectionBinding=null。
- consumptionBinding=null。
- clockResolutionBinding=null。
- sourceInspectionMissingReasonが明示される。
- 架空inspection、仮clock、架空consumptionを生成しない。
- admissionは従来の未接続／未承認／pending境界を維持する。
- FileRef owner、Output、request.result、実bytes参照が相互対応する。

## 6. 2目的の確認

attempt-006 upload-jsonのpurposeと、今回attempt-007 local-mp4のpurposeが異なることを、保存済み両証拠から確認する。

両方について discovery / selection / retention の3段階のrequestFileSha256とpurpose全文が保存されていることを確認し、軽量なcross-attempt proofへ参照する。upload-jsonを再実行して2目的を作り直さない。

## 7. 終点

今回が成立すれば、親v005に残っていた以下を閉じてよい。
- MP4直接登録分岐
- inspection未提供の通常complete
- 異なる目的2件の3判断到達

この時点でv005の隔離実装試験の技術完了条件を一件ずつ再確認し、未完了がなければ「v005隔離実装試験 技術完了候補」として相談役最終監査へ提出する。

ただし以下は完了にしない。
- ID9-PD-01/02
- 本番有効化／旧業務state移行
- 実AI内容品質
- 字幕演出接続
- 動画実行許可
- 人間品質採用

## 8. 禁止・保存・報告

外部推論・費用・新素材取得・STT処理・inspection実行・映像音声製造・SSD操作・追加削除・本番・公開は0。

新attemptで作るvideo/mp4 copyは今回の検証成果として保持し、別の削除承認なしに自動削除しない。

主reportと新証拠、必要なcross-attempt proof、CURRENT_GOAL/HANDOVERを更新。担当fileのみ明示stage、通常mainへcommit/push、Git clean/untracked0を確認する。

報告：
Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9. local-mp4直接登録・inspection未提供

受領だけで止まらず、preflight通過後は新しい実質問題がなければ検証→保存→commit/push→直接報告まで進む。
