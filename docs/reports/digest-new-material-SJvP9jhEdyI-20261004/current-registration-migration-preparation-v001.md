# 現行形式への正式登録移行と製造準備

記録 2026-10-05T10:19:16.322888+00:00。本人の正式移行承認に基づく同じMac実装者の作業。現在は製造前。

途中JSONの保存・再読は今回SSDだけで成立。guest /Volumes/ZEV-Digest-20261003-01、APFS device16777243、UUID7212F3BB-32FB-4F02-A71C-E570421FF2E0。host /Volumes/KIOXIA、ExFAT device16777238、UUID0E5DC84B-1E22-3C9B-9E3B-220EBA8607C1。50GB開始/12GBreserve/16GiB親子RSS/pressure1/1秒観測/next-unit+reserve/ownPGID停止を維持し、実開始前に再測定する。

旧互換実装の現物・差分・7成功/型exit0はSSD KEEP。09:45:19 UTCに自分の未commit3fileのみ除外してcleanにした。その後、通常typed builderからvalidate_digest_plan一件だけを作り、通常runnerが実claim・現行検証・完了登録。旧4要求/output/fileRefの完全一致を再確認。新要求agent_4fc1f99fe5054517970951d4f4e42481は09:59:39.784 UTC succeeded。元素材/STT/計画・旧回答の再判断は0。

現行準備は10:03:41.490 UTC全byte再読成功、42JSON/9,049,975B/31group/5450atom。manifest SHA62fd35db3257fb6f53ed9168ebb5e364c8c8050cebaa794d392dd4436b3d8336。新baseline manifest SHAee2f038ba7a47e4547b9d656e6205d9ca7bf813d7f6642f45c3170d471dfabfa、表示調整manifest SHA6a9c72a31c0efffc36472f874ce7301a27a95cf915d32fc0d33b64d7e0c880eb。必須移行proofで原実byte、31一対一、answer/判断理由、本文・ID・順序・元時計、旧新execution所有者を検査。候補IDは13種類/31keepで重複が合法なため、限定欠陥修正1件目として不要な候補一意要求だけを除去。timeline ID31種類・意味全一致・候補付替え拒否は維持。651旧cueを原回答移行baselineに保持し、既受理2表示調整だけを再導出して650cue/1041行にする。

製品は既存6path＋専用migration helper1、専用test1。前の保存先5pathに加え、digest-formal-handoff-v001.tsの必須root/prefixを渡す1行が必要。旧形式を一般製造入力に戻さず、current-only仕様とする。移行proofは許可/人間品質を発行しない。約39KB以下の既存4control内蔵例外は本人別承認のまま保持し、実装固定後にSHAを束縛する。

準備12、Python27、移行18の小検査は成功。初期検査設営のReact検索先不足は既存NODE_PATHで補正（媒体/旧原本作用0）、移行fixtureの綴り/Buffer比較補正記録も保存。統合型検査/正式入力/環境gate/技術QCと実映像確認はそれぞれ実施結果で追記する。実glyph/通常速再生/音声聴取/人間の品質採用はこの段階で未評価。新課金0。

[新正式登録の実結果](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/preparation-storage-20261005-v001/current-formal-registration-v001/result.json)・[現行準備の実結果](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/current-inputs-v001/preparation-result.json)・[新字幕登録と移行検査](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/current-inputs-v001/caption-registration/result.json)・[表示調整候補](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/current-inputs-v001/caption-display-adjustment-v001/result.json)。

10:24:19 UTCに最新差分のrunner/Remotion型検査exit0、job保存先・旧形式・承認偽装拒否23件pass。独立read review最終10:22:58 UTC、3指摘（原answer exact参照、新JSON prefix、結果再読の本人承認実bytes）を修正後追加blocking0。実移行helper18件passと保存先12/Python27の根拠はSSDにKEEP。正式入力と容量gateは実装固定後に実施し、製造を先行しない。

2026-10-05T12:47:25.229718+00:00 追記：今回の正式全尺一本と既存技術QC・代表8場面の静止画確認・SSD保存が完了。通常速/音声実聴取/人間品質採用は未評価。[完成報告](current-display-full-manufacture-completion-v001.md)に実receipt・時間・cleanup・Chrome用URLを記録した。上記の製造前記述は当時の履歴として保持。
