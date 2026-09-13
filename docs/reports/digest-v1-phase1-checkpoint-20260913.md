# ダイジェストv1 Phase 1 監査checkpoint

現行の相談・監査先：**ZEV進行管理３**。2026-09-13の「ZEV ダイジェストv1 実装開始指示」（kawafmm承認済み）による作業。Phase 1の実動画製造とtechnical QCが合格し、監査checkpointとして提出する。完成承認は自己宣言しない。

## Phase 0：baselineと復旧

実装前のbranchはmain。remoteをfetchした後、HEAD・local main・origin/main・merge-baseはいずれも `0a4c28419ec952453f3eadc7cdc1d4c642abf012`。local-only commit、remote-only commit、staged変更は0件。unstaged tracked変更は5ファイルだった。

復旧branchは `recovery/pre-digest-v1-reset-20260913`、保存commitは `ed83e848eab5e81c1541515a459f5fa4de99641d`。remoteへのpushとremote refの一致、保存前14ファイルとGit blobのSHA-256一致を確認済み。mainへmergeしていない。

保存した旧作業は、候補動画理解の実装・検査4ファイル、字幕比較検査1ファイル、未追跡のQCスクリプト3ファイル、較正・検査・弓区間の提示準備・相談役応答のMarkdown6ファイル。復旧手順と各hashを記した報告1ファイルを加え、commitは15ファイルを含む。詳細は[復旧branchの保存報告](https://github.com/f-kw/zev2/blob/ed83e848eab5e81c1541515a459f5fa4de99641d/docs/reports/pre-digest-v1-recovery-20260913.md)。

旧未追跡31,892ファイルから上記source・文書9ファイルを保存し、残る31,883ファイル・60,889,750,458 bytesの素材・STT・生成物・検査出力・cacheは元の場所に保持した。削除・移動していない。大容量データをremoteへ保存したとは扱わない。

2026-09-13 15:43:30 JSTにmainへ戻った状態で、次を確認した。

| 条件 | 実測 |
| --- | --- |
| HEAD = main = origin/main | `0a4c28419ec952453f3eadc7cdc1d4c642abf012` |
| staged変更 | 0 |
| unstaged tracked変更 | 0 |
| 意図しないuntracked source変更 | 0 |
| 旧作業のremote復旧 | 14ファイルのbyte一致 |
| 保持した既存データ | 31,883ファイルのpath・size一致 |

このbaselineから `codex/digest-v1` を作成した。

動画製造時のHEADはこのbaselineのまま。追加実装と使用する既存rendererは実行設定のSHA-256参照で固定し、製造開始前に実byteと照合した。検査合格後にcheckpointを作成するため、製造記録に未コミット変更ありと記録されることと、実行対象の固定は矛盾しない。

## 追加した実装と共通経路

| ファイル | 処理 |
| --- | --- |
| `evals/clip_composition/digest_v1.mts` | Cの全採用IDを取り出す処理、採用ID以降の保持区間の整列・重複統合、保存済み字幕の投影 |
| `evals/clip_composition/run_digest_v1.mts` | 保存済み入力を読み、C全採用からCore・renderer・technical QCまでつなぐ実行入口 |
| `evals/clip_composition/digest_v1.test.mts` | 必要最小限の追加検査6件 |
| `docs/DIGEST_V1.md` | 実行方法と担当範囲 |
| `evals/clip_composition/jobs/digest-v1/20260913-v002/` | 今回の実行設定と受領指示の記録 |

checkpointの収録は38ファイル（実装2、追加検査1、説明・報告2、初回と訂正後の実行設定4、検査出力・訂正証拠7、共通製造処理による最終結果22）。最終結果の保存先は `evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v002/`。既存trackedファイルの変更は0件。初回の実行設定は失敗証拠として保存し、現行の実行例には訂正後の設定を使う。

候補の正本は既存のcandidate一覧を維持し、IDの改名や移行は行っていない。Cは一覧の全IDを採用する。採用IDから先で保存済み内部保持を再検証し、最終的な元動画区間へ展開する。区間そのものの開始・終了時刻で並べ、同一・包含・連鎖する重複を決定的に統合する。元の全candidate ID・保持根拠を残し、離れた区間の隙間は埋めない。半開区間の接点もそのまま保持する。

A/Bの採否判断は未接続。採用された既存IDを受ける後段に、その採否判断を混ぜない設計とした。

## 再利用した既存資産

- 既存の候補・保持の読取／検証入口：探索結果、正式ID、本文、音響の切断根拠を保存記録へ照合する。旧工事の実行を再開しない。
- 保存済み成功素材 `ymUsGrT6EaA` の3候補と、その内部保持7区間。
- caption-display-boundariesの保存済み判断と、人間補修で確定済みの2境界・音声にない1字幕の除外。新しい表示判断を作らず、同じ本文・時刻・改行を再利用する。
- `adopted_media_manufacturing_v001.mts` の基礎映像製造、字幕Core製造、renderer呼出。
- 既存の正式な字幕投影、fixed style、rendererの受入検査とtechnical QC。

元のSkill、Core、renderer、QC、旧実行証拠は変更していない。新しいProspect正本、新しい意味判断Skill、採点器、観測基盤、UIは追加していない。

## test結果

| 検査 | 結果 |
| --- | --- |
| 追加integration・固定処理検査 | 6/6 合格 |
| 既存の内部保持・候補採否E2E・字幕表示区切りの回帰 | 32/32 合格 |
| 実保持区間と既存Coreの時間投影 | 7区間、4,831フレームで既存版と一致 |
| 共通Coreによる字幕製造 | 32字幕の本文・表示時刻・改行・元字幕単位IDが既存完成版と一致 |
| 字幕の全量対応 | 415表示単位 + 明示的に除外済み9単位 = 保持対象424単位 |

重複統合は、小さな固定入力で同一・包含・連鎖する重複と隙間・接点の保持を検査した。今回の実素材の7区間には重複がなく、実素材で重複の解消を観測したとは扱わない。

実行commandは[実行説明](../DIGEST_V1.md)に記載した。追加検査は保存済み実行設定を指定し、既存回帰は内部保持・候補採否のE2E・字幕表示区切りの3ファイルだけを実行した。

実行出力は[追加検査](digest-v1-phase1-evidence-20260913/integration.tap)と[既存回帰](digest-v1-phase1-evidence-20260913/regression.tap)に保存した。追加検査は端末の2回の出力取得を順に連結した記録。確認済みの検査は、記録保存のために再実行していない。

型検査は最初のcommandでTypeScript import拡張子の指定を欠いていたため、その起動条件を訂正した。訂正後、追加3ファイルの診断は0件。参照先の既存コードに21件の診断があり、全体の型検査合格とは扱わない。既存の汎用型構文、unknownの参照、旧型抑制等の診断であり、この工事では変更していない。[型検査出力](digest-v1-phase1-evidence-20260913/typecheck.log)を保存した。

## 実動画・technical QC

初回実行は基礎映像の製造・検査まで合格し、描画入口で古いひな型に残った実装参照2件の不一致により拒否された。実装本体12件はすべて開始時の正本とbyte一致しており、今回の実行設定にその参照を固定して製造開始前に照合するよう訂正した。旧job・旧出力・失敗logは保持した。[訂正記録](digest-v1-phase1-evidence-20260913/renderer-setup-correction.json)参照。

訂正後の[追加検査6/6](digest-v1-phase1-evidence-20260913/integration-v002.tap)も合格。[型検査出力](digest-v1-phase1-evidence-20260913/typecheck-v002.log)は訂正前と完全一致し、追加3ファイルの診断0件・既存21件を維持した。新しい実行設定と未使用出力先で、C全採用の入口から実動画製造まで一回実行し、終了code 0で完了した。

| 結果 | 実測 |
| --- | --- |
| 全採用した既存候補 | 3/3 |
| 最終保持区間 | 7 |
| 字幕 | 32件、415単位（別に明示除外9単位） |
| 映像 | 1920×1080、30fps、4,831フレーム |
| 長さ | 161.033秒 |
| 音声 | AAC、基礎映像とpacket内容一致 |
| technical QC | 指示反映・配置と可視性・メディア検査のすべて合格、違反0件 |
| 新しい意味判断・有料API・素材取得 | すべて0件 |

結果：[実行結果](../../evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v002/verification.json)、[rendererとtechnical QC](../../evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v002/renderer-result.json)。

生成動画：`evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v002/render/presentation-rendered-v002.mp4`（75,458,918 bytes）。SHA-256は `044bc61a6cd0034cc01d277f31e57c6a831e508ac179966cae29b3f3bb763a8c`。MP4と既存rendererが作った描画画像・一時検査画像はローカルに保持し、remoteには実装・入力設定・結果記録と動画の参照／hashを保存する。

## 既存完成動画との差と未解決事項

比較対象は保存済み成功ダイジェスト（SHA-256 `044bc61a6cd0034cc01d277f31e57c6a831e508ac179966cae29b3f3bb763a8c`）。既存版は3候補・7区間・4,831フレーム・32字幕。新旧双方のファイルを読み直し、完成MP4と基礎映像のbyteがそれぞれ完全一致することを確認した。保持区間とフレーム、字幕の本文・時刻・改行・正式単位ID、32件の描画画像・style、音声packet、映像仕様も一致した。[比較記録](../../evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v002/existing-output-comparison.json)参照。

映像内容の差はない。今回加えたのは、保存済み候補の全採用を入口として保持区間を整列・統合し、既存の字幕判断と製造処理へ渡す再利用可能な実行経路と、その実行根拠である。

保存済み字幕が新しいカットの途中にかかる、必要な字幕判断が存在しない、時刻が保持範囲外になる場合は、既存判断だけで補わず拒否する。今回、新しい意味判断は行っていない。人間の新しい採否評価と完成承認も未実施。

## 監査とPhase 2

提出先は **ZEV進行管理３**。Phase 1のtechnical checkpointとして、上記の共通経路と制約の適合性をAUDIT_ONLYで監査依頼する。branchは `codex/digest-v1`。checkpoint SHAとdiff URLはcommit／push後の監査メッセージに記載する。

相談役の段階案では、Phase 2は別の既存使用許可済み素材でC全採用を通し、A/Bの接続はその後に行う。Phase 2は未着手。対象素材、利用可能な候補・保持・字幕判断、新たな推論が必要な場合の範囲を、今回の現物に基づく次の指示で具体化する必要がある。

今回の読取adapterは、既存の候補採否工事で検証済みの入力を受ける。この既存入口は保持結果全体の重複区間・字幕単位の重複を拒否するため、重複統合の固定処理は直接の小入力で検査している。別素材で候補間に重複する保持結果を接続する場合は、候補ごとの検証を維持したまま共通処理へ渡す読取adapterの接続範囲を確認する必要がある。

字幕の読取adapterも保存済み完成字幕のmanifestから判断を取り出す。今回の成功例を再製造する経路は検査したが、完成字幕がまだ存在しない素材を同じ入口だけで製造できるとは主張しない。既存caption-display-boundariesの出力を直接渡す接続は、Phase 2の入力状況に合わせて判断する。

Phase 1の通過だけを、未指示のPhase 2の着工・scope拡大として扱わない。新しい意味判断が必要になる場合は、現行の相談先へGPT_DECISIONを上げる。
