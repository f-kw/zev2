# 9の後続 — 親directory不足の限定修正・設営17

発行日：2026-10-02（JST）
発行者：ZEV Build Loop相談役
判定：decision: continue
承認根拠：kawafmm承認済みの親作業と、AGENTS「相談役による軽微な技術判断の自動承認」による相談役個別承認。本人への再確認は不要。
親正本：[ZEV_DIGEST_REAL_JUDGMENT_LOCAL_20261002_v001.md](ZEV_DIGEST_REAL_JUDGMENT_LOCAL_20261002_v001.md)
監査対象：f1d716243ded9c6a783404ffc27a4b84ff209e6f

## 1. 監査判断

同SHAのrun-local.mts、README.md、evidence.jsonを照合した。run-local.mtsは固定runtimeの親を用意せず、最初にmkdir(runtime,{recursive:false})を実行する。保存されたENOENTはこの親directory不存在と整合し、evidence.jsonはprocess exit1、stateCreated=false、mediaActionStarted=falseを記録している。

本判断は保存コードと失敗記録の照合であり、相談役がMacで再実行したものではない。通常API・runner・内容判断・計画保存の成功やrun-local全体の完成を認定する監査ではない。

今回の一行は、既に許可された新隔離runtimeを作るための設営修正である。目的・承認意味・製品code・入力・検査条件・費用・本番権限を変えないため、相談役の委任判断で扱う。

## 2. 許可する最小差分

対象：docs/reports/request-intent-real-judgment-20261002/run-local.mts

既存のattempt mkdir直前に次の一行を追加する。

```ts
await mkdir(path.dirname(runtime), {recursive:true});
```

その後の既存処理は維持する。

```ts
await mkdir(runtime,{recursive:false});
await mkdir(path.join(runtime,'handoff'));
```

親は今回の固定root `runtime/artifacts/request-intent-real-judgment-20261002-v001` だけ。親と既存祖先が予定したworkspace内の通常directoryであることを確認し、symlinkや想定外pathへ迂回しない。attempt自体をrecursive:trueにしない。EEXISTを握りつぶさず、既存attemptを削除・再利用・上書きするためのfallbackも追加しない。

この修正を適用時に設営累積17として記録する。製品累積5、設営16適用済みの履歴は保持する。run-local内の累積値とevidence.historyを17へ追従し、受領SHA・再開時刻・失敗版参照を記録する変更は、この一件の記録追従として許可する。実処理の修正は上記一行に限定し、別の不具合をまとめない。一般上限・履歴・強制停止条件は変更しない。

## 3. 失敗保存と再開位置

失敗時のrun-local.mtsとevidence.jsonはf1d716243ded9c6a783404ffc27a4b84ff209e6fに不変で保持する。再開前に既存evidenceの初回startedAt/error/stop/processExitを、同じevidence内の区別された失敗履歴として保持し、後の成功値へ付け替えない。READMEにも初回失敗と修正後実走を分けて記録する。受領だけの独立commitは不要。

今回のattempt directoryは作成前失敗と報告されている。再開直前に不存在を確認できた場合だけ、親正本で指定したattempt-001をそのまま新規作成してよい。未作成の番号を形式的に増やす必要はない。既に存在していた場合は削除・上書きせず由来と内容を確認し、追加作用前に相談役へ返す。

修正後は薄い補助のsyntaxと既存preflightを確認し、通常一系列へ戻る。新しい全否定suiteやv005再検証を追加しない。

## 4. 容量と実作業

報告された空き17,751,695,360 bytesはその観測時点の値であり、再開資格に固定流用しない。大容量作用前に再計測し、親正本の条件availableBytes >= 2 × sourceBytesを維持する。既知source size 4,803,412,827 bytesの場合、必要9,606,825,654 bytes以上。

通過したら追加承認待ちを挟まず、通常APIでの新しい隔離依頼・source JSON/保存STT/既存inspection登録、通常index/factory、発行済み要求へのCodexの段階別実回答、計画/検証complete、既存consumerの別process再読まで続行する。

素材コピーは通常prepareのsource-media.mp4一つのみ。手動コピー・upload多root・旧コピー復元・追加削除・SSD操作はしない。厳密readerが要求するread/hashは親正本どおり許可する。

## 5. 維持する境界・報告

製品code変更、新API/追加推論費用、素材取得、STT/inspection処理、字幕演出・動画製造、本番切替、公開は行わない。v005技術完了、既存15:23案と人間回答、ID9-PD-01/02、縁選択null、人間品質pendingは不変。

同じCodex2セッションで本返信を全文受領して続行する。新しい実質問題がなければ、親正本の完了条件まで実行・保存・担当fileのみの通常commit/push・直接報告を行う。本人への技術確認・転記、Codex1起動、受領だけの再commit・終了通知は不要。

報告名：Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9の後続・通常依頼の実判断付き計画一件

発行時点：設営16適用と初回停止は報告・保存証拠で確認。設営17の受領・適用・再稼働・通常系列の完了は未確認。
