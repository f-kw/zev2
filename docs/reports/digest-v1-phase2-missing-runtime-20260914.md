# ダイジェストv1 Phase 2 — 許可された検査訂正完了と音響実行環境の欠落

**相談役応答確認済み・kawafmm承認待ち。** `9f5b32738035eb443d6ee38a7d48a5514b9223e8` をZEV進行管理３へ提出し、同一byteによる欠落469ファイルだけの限定復旧を推奨する完了済み応答を受領した。提示された「kawafmm承認」は本人が承認するための文案であり、承認済みとは扱わない。復旧・再解析・製造再開は未実施。応答を `missing-runtime-advisor-response-v001.json` に保存した。Edgeの同じ会話で送信と生成完了を確認し、再送・再生成・ページ更新は0回。

2026-09-14 JST。**承認された6回目の設営訂正を指定の1行だけに実施し、該当検査4件はすべて合格した。** 正式字幕時刻の保存再開は、既存観測の来歴確認で参照するローカル音響実行環境の欠落により停止した。325字幕の回答・本文・保持区間は変更していない。完成MP4は未生成。

branchは `codex/digest-v1`、直前checkpointは `93735dcfc28a579bbfe94949bcabfda25b7735d1`。

## 完了した承認範囲

`digest_v1_phase2_caption_revision.test.mts` の1行を、別々に生成したbyte列の参照同一性を求める比較から、byte内容を比較する検査へ訂正した。差分は承認された1行だけである。該当4検査を再実行し、4合格・0不合格・skipなし。旧失敗TAPは保存したまま、新しい合格TAPを別ファイルへ保存した。6回目の例外はこの訂正へ消費済みで、上限を恒久変更していない。

## 新しい停止の現物

既存製造adapterの `timing` コマンドを1回実行した。正式字幕時刻を書き出す前に、保持採用の来歴を再構築する既存の端点検証が、補助音響観測を行ったPython依存ファイルのbyte照合で停止した。

最初の欠落：

```text
/private/tmp/zev024-stt-arm64/lib/python3.12/site-packages/faster_whisper/__init__.py
expected SHA-256: 4902b4653e8074eaef23eceec9cff34945b02d20136ac24afc90fa9b1c117436
```

失敗はファイル不存在。現在の端点検証では保存済み観測を再利用するときにも、その観測時の実行環境のファイルを同じpathから再読込する。該当処理は `digest_v1_phase2_endpoints.mts` の実行環境実装への照合であり、今回新しく変更した処理ではない。

保存された参照581件を読み取りで照合した結果、112件は存在して元のSHAと一致し、469件は存在しなかった。存在するのにSHAが変わったものは0件。欠落の原因は特定していない。ファイルを削除した人物・処理やOSの動作を推定しない。

正式字幕時刻、base media、Core、renderer、technical QC、MP4の生成前で止まっている。新しい音響観測・追加意味判断・回答変更はしていない。前回の時刻診断は325件すべて製造可能な正の長さ・保持区間内・重複なしで、271件は音響両端確定、43件は片側、11件は両側が既存STT端点への明示的fallback。今回、その診断を正式保存へ進めるための来歴検証を完了できなかった。

## 復旧案を具体化するための読取調査

ローカルの既存pipキャッシュだけをZIPとして読み、欠落469ファイルの各内容を観測時の固定SHAと比較した。**469件すべてに、byteが完全一致するローカルの復旧候補があった。** 合致するキャッシュarchiveは12件。候補は重複を含み、各欠落ファイルとarchive内のmemberおよびSHAを `local-runtime-restoration-candidates-v001.json` に保存した。

ここまでに復旧・抽出・package install・ダウンロード・ネットワーク通信は行っていない。既存のキャッシュを調査しただけである。

推奨する限定的復旧は、次の一工程である。

1. 保存したキャッシュarchiveと対象memberのSHAを再照合する。
2. 欠落している469ファイルだけを、元のpathへ元と完全に同じbyteで復元する。存在するファイルは上書きしない。
3. 既存581参照を元の検証で全件再照合する。正式観測・意味回答・保持・字幕・時刻値・検証コードを変更しない。
4. 全件合格後に、既に承認済みの正式字幕時刻保存→Phase 1共通Core→renderer→technical QC→MP4を再開する。

新規取得・install・再解析も、保存済み環境照合の省略も不要な復旧案である。ただし**環境復旧は今回許可された比較検査1行とは別の設営訂正に当たるため、未実行。** 最新のkawafmm指示は「この修正後にさらに設営起因の訂正が必要になった場合は、7回目を自走せず停止して報告すること」と明示している。相談役へ、この復旧工程を第7回目の限定例外として人間判断へ取り次ぐよう依頼する。

## 保存と不変範囲

実装差分は承認された検査1行のみ。製造adapter、元の端点検証、既存Skill、Phase 1共通処理、原本文、正式ID、325字幕、7候補・12保持区間、style、旧棄権回答は変更していない。追加意味判断・音響観測・外部API・費用・新素材・復旧操作は0。`humanQuality = not-evaluated`、`completionApproval = not-claimed`。

## 証拠SHA-256

| 証拠 | SHA-256 |
| --- | --- |
| `sixth-setup-correction-authorization-v001.json` | `ed686172b4f721f76bd4a048c9ccfff65a029ebdfeb71e11d326452b68388aef` |
| `caption-revision-tests-v003.tap` | `ab4a3382c68e0fef80e9edcf8195262e4a9ea87afd598e4dd6c27fa30c5efce9` |
| `caption-timing-storage-v002.log` | `fb5da3f3212d17983bbd3203c862109c3bb477a0a9f1b6297cae0ea66ec40404` |
| `missing-acoustic-runtime-stop-v001.json` | `dc11f1d08397f4d907ceb77025cf52a83a01c916b9fa3be46f930cd6fb12f4e0` |
| `local-runtime-restoration-candidates-v001.json` | `35b7eef82b9966f8830986321076cd49136807156fa08b3e2fc52377503c5818` |
