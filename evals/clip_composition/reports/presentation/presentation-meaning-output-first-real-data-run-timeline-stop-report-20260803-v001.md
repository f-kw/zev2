# 意味／表現分離 初回実データrun タイムライン生成停止報告 v001

日付: 2026-08-03

## 結論

初回実データrunは、API通信前の最初の生成工程で停止した。実行入力記録の入場検査は合格したが、タイムライン生成器が3.29 GBの正式元媒体を一括読取しようとしてNode.jsの2 GiB制限へ到達し、`SOURCE_IDENTITY_INVALID`として不受理になった。

入力値、既存媒体、source identityの内容不良ではない。大容量媒体の読取方式と、内側の大容量エラーをsource identity不正へまとめるproduction実装の欠陥である。同じattemptで修正・再実行せず、B3以降へ進んでいない。

## 事実

| 項目 | 結果 |
|---|---|
| 正本の実行入力記録 | `evals/clip_composition/outputs/presentation/meaning-output-run-input-records/qdczJpv8RCc-candidate-59-meaning-output-first-run-v001/run-input-record.json` |
| 実行入力記録SHA-256 | `5ac80deeb0daac08ea32cad7fa9b016cf04ab95ea551fa6981e6c8151ee28680` |
| timeline入場検査 | 合格 |
| 入場receipt | `evals/clip_composition/outputs/presentation/meaning-output-run-input-records/qdczJpv8RCc-candidate-59-meaning-output-first-run-v001/admissions/01-timeline-decision/stage-admission-receipt.json` |
| receipt SHA-256 | `7ccb3ea0e0a99d436163a9a3a26306f9676c6a3d5d132793a6cab895a718dc55` |
| timeline生成 | 不受理、終了code 1 |
| 観測違反 | `SOURCE_IDENTITY_INVALID` at `/timelineDecision/sourceMedia` |
| 生stdout保存先 | `evals/clip_composition/reports/presentation/test-runs/20260803-meaning-output-first-real-data-run-v001/timeline-decision-attempt-v001.stdout.json` |
| timeline成果物 | 未生成 |
| B3以降 | 未実行 |
| countTokens | 0回 |
| generateContent | 0回 |
| API費用 | US$0 |

## 内側原因の読み取り診断

1. source identityのschema検査は合格した。
2. source identity、素材対応記録、STT manifest、transcript、word timestampsは、記録済みSHA-256と現物が一致した。
3. 正式元媒体は3,288,164,785 byteで、streaming SHA-256は記録値`8359f59d8c205fb815c9165f5a464ec4bb9f109f9d91384b80e571410dc2fa25`と一致した。
4. タイムライン生成器の安定読取は媒体全体を`FileHandle.readFile()`で単一byte列へ読み込む。
5. 同じ正式媒体をこの読取方式へ渡すと、Node.jsは`ERR_FS_FILE_TOO_LARGE`（2 GiB超過）を返す。
6. 生成器はその内側エラーを一括捕捉し、外側では`SOURCE_IDENTITY_INVALID`へ帰属させるため、実際の大容量読取失敗が表面の違反名から分からない。

## 帰属

- production欠陥: 大容量の媒体同一性確認がchunk読取になっていない。
- production欠陥: 大容量読取失敗がsource identity不正として報告され、停止理由の観測性が失われる。
- 入力・正式成果物の欠陥ではない: 媒体のstreaming hashと全ての小さい来歴ファイルは記録値に一致している。
- 契約矛盾は未確認: 今回の観測だけでは契約改訂が必要か、既存の大容量chunk読取処理を共用する実装修正だけで閉じるかは未判定である。

## 通信前準備として完了したこと

実行日当日のGoogle公式ページ6件（pricing、tokens guide、countTokens API、billing、thinking、latest model）を版付きB5 snapshot directoryへ保存した。モデル`gemini-3.6-flash`、入力上限1,048,576、出力上限65,536、Standard単価入力US$1.50/100万token・出力US$7.50/100万tokenは事前承認値と一致した。ただしtimeline停止のため、B5 job作成とAPI計測には進んでいない。

## 未実行

- B3意味境界source package
- B5 countTokensと費用上限判定
- B6 generateContent
- B1受入
- 意味情報package
- 新基礎映像
- crop適用
- 横型・縦型の構築、描画、QC
- 完成動画2本の人間目視

## 次に必要な判断

今回の停止点を修正対象として扱う場合は、正式媒体の同一性検査を既存のchunk読取正本へ寄せ、内側の読取失敗を正しいstage・違反へ透過する最小修正の診断／設計承認が必要である。修正前の再実行、期待値変更、媒体の縮小、SHA照合の省略は行わない。
