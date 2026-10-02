# 9の後続 — 表示回答の計画時計対応

Codex2、2026-10-03 JST。**保存済み218表示単位を、所属9区間の計画frameへ対応付け、診断JSONの保存・一回の再読まで完了した。** 未対応0、本文/行末/3,613断片の所属と順序は不変。前件fda455c4の表示回答はaccept済みのまま維持し、今回は再判断していない。正式描画入力や完成動画時計の受理ではない。

専用Edgeの確定返信全文を受領し、他者成果を保持してmain 482245d38e98dfd155bd5826fbeeaefde6c909b9へ同期。[今回正本](../../work-orders/ZEV_DIGEST_CAPTION_PLAN_TIMING_20261003_v001.md)の実SHA ee1323cf866f02e52ece869bdd0dfa1831aff4d192e35e64cca4046736ad08f9 を、準備/表示回答の元scopeとは別に保存した。製品6を維持、小補助作成・適用を個別承認の設営25として計上。一般上限と過去履歴は変更していない。

## 対応の意味と実入力

既存のJSON-only準備readerを一度呼び、保存意味入力と9要求を復元した。対応回答と結果の実SHAを確認し、既存表示validatorから検査token/traceを得た。内容判断、旧run-displayのrun/readback、通常runner/HTTP、準備製造は呼んでいない。

各要求の境界列を、意味入力にある所属区間の断片列と本文・順序で照合した。IDの接尾辞からの算術推測や、同じ候補名だけでの結合はしていない。各表示単位の本文と行末は保存回答から復元し、覆う元断片の先頭開始ms〜末尾終了msを使った。候補6の三非連続区間を独立に保ち、dropや区間外の空白を囲い直していない。

元stateと消費記録から正規参照を辿り、共有resolverが示す実ファイルを、準備manifestの保存先と照合した。clock-resolution.jsonと保存inspectionを小JSONとして読むだけで、媒体は開かずSHAも再計算していない。

保存inspectionの元動画は60/1、722,162 decoded frame、動画offset 0ms。既存の終端特例を含む境界関数をそのまま使い、9区間の元frame境界が保存mappingと一致することを先に確認した。その区間の出力開始frameからの平行移動だけで表示開始・終了exclusive・表示frame数を求めた。独自の丸め、速度、sample計算、時間延長、separatorを加えていない。

## 結果

| 区間 | 候補 | 計画frame範囲（終端exclusive） | 表示単位/行 | 表示長の最小〜最大frame | 区間内の表示間空白件数 |
|---|---|---|---:|---:|---:|
| 1 | candidate-0001 | 0〜1599 | 14/19 | 19〜271 | 1 |
| 2 | candidate-0002 | 1599〜5020 | 36/52 | 32〜238 | 1 |
| 3 | candidate-0003 | 5020〜5742 | 5/8 | 46〜247 | 1 |
| 4 | candidate-0004 | 5742〜13631 | 67/84 | 8〜526 | 3 |
| 5 | candidate-0005 | 13631〜19839 | 41/62 | 37〜380 | 4 |
| 6 | candidate-0006 | 19839〜21507 | 15/21 | 19〜187 | 1 |
| 7 | candidate-0006 | 21507〜23119 | 11/13 | 18〜282 | 1 |
| 8 | candidate-0006 | 23119〜25775 | 13/13 | 34〜405 | 2 |
| 9 | candidate-0007 | 25775〜27691 | 16/17 | 17〜513 | 1 |

9区間/218表示単位/289行/3,613断片が対応し、未対応・区間外・zero-frame・順序不整合は0。区間内の隣接表示には15件、合計1220frameの空白、重なり0を観測した。表示長は全体8〜526frame。本文が短くても長い元間隔を持つ場合があり、これらは観測だけで、見心地の合否や修正理由にはしていない。隣の表示開始まで勝手に延長していない。

最初の表示開始は0、最後の終了exclusiveは27,691frame。元計画27,691frame/40,705,770sampleは不変で、音声sampleは元参照のまま。元区間をその順につなぐ計画時計であり、今後の接続演出後の完成動画時計ではない。

## 保存・検査

新保存先：runtime/artifacts/digest-caption-plan-timing-20261003-v001/attempt-001/。
時計対応JSON SHA：72eab2201c0bb3e918aabf314ec3c0613f61ef4641a20402db5e7316282a2761。
manifest SHA：36f41a965c891aa5cf35c00c81b2aaf171284a1941d9d9d20a9c64532db44179。

対応JSONには各表示単位の要求/回答/結果/所属group参照、元atom/断片/発話列、行本文と境界ID、元ms・元frame、計画開始/終了exclusive/表示frame数を保存した。正式timeline/sourcePackage/renderer artifactのschemaは流用していない。媒体の実bytes検証済みという扱いにはしていない。

対象strict型検査と実行はexit0。実export、入力の束縛SHA、親の実在、新先不存在を実行前に確認し、新規/排他保存した。保存直後の再読一回で計算object・bytes・SHA一致を確認。読んだ入力/回答/実装95件は終了前のsize/SHA照合で不変。旧56file全体や過去試験を再走査していない。

時計対応JSON 1173467bytes、manifestとlog込み1199438bytes/3file。内容再判断・媒体コピー・API費用0。対応処理32.75ms、保存再読4.58ms、主process442.98ms。設計/実装や相談役待機はこの実行時間へ含めていない。

## 正式後段へ残す不足

完成背景のmedia/timeline/生成manifest/検証receipt、最終style/renderer/font ledger、ROOT基準の正式後段読取、演出・動画許可・人間品質は別の残件。完成背景を含む仮timeline、仮SHAや許可を正式assemblyへ渡していない。今回の数値で完成媒体receiptや採用承認を代替しない。

presentation=not-connected、executionPermission=not-approved、humanQuality=pending、outlineChoice=null、ID9-PD-01/02未承認を維持。144px/縁選択・表示時間の見心地・映像音声同期の合格は未確認。製品code・既存Skill/validator/準備コード変更なし。媒体read/hash/copy/PUT、通常HTTP/backend/runner、新API/provider/費用、STT/inspection/ffprobe、描画/背景/演出/動画、SSD、削除、本番/公開、旧suite/人間レビュー再実行は0。

[evidence.json](evidence.json)へ実参照・SHA・観測・保存確認を記録し、担当のみ通常commit/push後、専用Edgeから最終監査と次の具体的一件を直接依頼する。
